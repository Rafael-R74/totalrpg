import { useState } from 'react';
import { ORDEM_COMPENDIUM_ENTRIES, ORDEM_SKILLS_METADATA, matchesContentSourceFilter, resolveEntrySourceId } from '@totalrpg/shared';
import { Icon } from '../ui/Icon';
import { SAH_BTN_ACTIVE, SAH_BTN_AMBER, SAH_BTN_NEUTRAL, SahPowerProps, attrValue, hasSceneEffect } from './sahPowerKit';

/**
 * Monstruoso (Combatente, SaH p. 17-21): habilidades de 65% e 99% por elemento
 * e o aviso da Transformação Monstruosa (NEX 75% e 99%).
 * O motor (RD, atributos, penalidades) fica em ordemEquipmentData.ts.
 */
type Props = SahPowerProps & {
  onHealPv?: (amount: number, reason?: string) => void;
};

const roll = (n: number, sides: number) => Array.from({ length: n }, () => Math.floor(Math.random() * sides) + 1);
const has = (p: Props, nex: number) => p.abilities.some((a) => a.id === `trail-monstruoso-${nex}`);

/** Ritual concedido pela trilha (99%): adiciona à lista de rituais se ainda não tiver. */
function GrantRitual({ p, ritual, options }: { p: Props; ritual?: string; options?: string[] }) {
  const [pick, setPick] = useState('');
  const name = ritual || pick;
  const owns = (r: string) => p.abilities.some((a) => a.category === 'ritual' && a.name.toLowerCase().startsWith(r.toLowerCase()));
  if (ritual && owns(ritual)) return <span className="text-[11px] text-emerald-300">✓ {ritual} nos seus rituais</span>;
  if (options && options.some(owns)) return <span className="text-[11px] text-emerald-300">✓ Ritual de 4º círculo aprendido</span>;
  function add() {
    const pool = p.compendiumEntries.length ? p.compendiumEntries : ORDEM_COMPENDIUM_ENTRIES;
    const entry = pool.find((e) => e.category === 'spell' && e.name.toLowerCase().startsWith(name.toLowerCase()));
    if (!entry) return p.onFeedback(`Ritual ${name} não encontrado no compêndio.`);
    p.onUpdateAbilities([
      ...p.abilities,
      {
        id: `${entry.id}-monstro-${Math.random().toString(36).slice(2, 7)}`,
        name: entry.name,
        category: 'ritual',
        cost: entry.cost,
        element: entry.metadata?.element,
        description: entry.description,
        damageFormula: entry.metadata?.damageFormula,
        isActive: false,
        modifiers: entry.modifiers || [],
      },
    ]);
    p.onFeedback(`${entry.name} adicionado aos seus rituais (Monstruoso 99%).`);
  }
  return (
    <div className="flex items-center gap-1.5">
      {options && (
        <select className="trpg-input text-xs!" style={{ height: '2rem', width: 'auto' }} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Ritual de 4º círculo">
          <option value="">Ritual de 4º círculo</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}
      <button type="button" className={SAH_BTN_AMBER} disabled={!name} onClick={add}>
        <Icon name="sigil" /> Aprender {ritual || 'ritual'}
      </button>
    </div>
  );
}

/** 65% e 99% por elemento (exigem a etapa ritualística feita, ou o 99%). */
export function MonstruosoTierAbilities({ p, element, active }: { p: Props; element: string; active: boolean }) {
  const t65 = has(p, 65) && active;
  const t99 = has(p, 99);
  const m65 = p.abilities.find((a) => a.id === 'trail-monstruoso-65');
  const dying = (p.conditions || []).some((c) => /morrendo/i.test(c.name));
  const items: JSX.Element[] = [];

  if (element === 'Sangue') {
    if (t65) {
      items.push(
        <button key="crit" type="button" className={SAH_BTN_NEUTRAL} title="Contra o dano adicional de um acerto crítico ou ataque furtivo" onClick={() => {
          const ok = Math.random() < 0.5;
          p.onFeedback(ok ? 'Ser Assustador: 50% — você IGNORA o dano adicional do crítico/furtivo.' : 'Ser Assustador: 50% — o dano adicional se aplica normalmente.');
        }}>
          <Icon name="shield" /> Ignorar crítico? (50%)
        </button>,
        <button key="bite" type="button" className={SAH_BTN_AMBER} title="Ao agredir com outra arma, 1x por rodada: ataque extra com a mordida (1d8, x2, perfuração)" onClick={() => {
          if (!p.onSpendResource(1)) return;
          const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === 'luta');
          const sk = p.sheet.skills.find((s) => s.id === 'luta');
          p.onRoll('Mordida (ataque extra)', attrValue(p, (meta?.attribute || 'for') as any) + p.bonuses.attackDiceBonus, 20, (sk?.trainingDegree || 0) + p.bonuses.attackBonus);
        }}>
          <Icon name="swords" /> Mordida extra (-1 PE)
        </button>,
        <button key="bitedmg" type="button" className={SAH_BTN_NEUTRAL} onClick={() => p.onRoll('Mordida: dano (perfuração, x2)', 1, 8, 0)}>
          <Icon name="d20" /> Dano da mordida 1d8
        </button>
      );
    }
    if (t99) {
      items.push(
        <button key="biteheal" type="button" className={SAH_BTN_NEUTRAL} title="Ao causar dano com a mordida (dobra no crítico)" onClick={() => p.onHealPv?.(5, 'Mordida (Monstruoso 99%)')}>
          <Icon name="heart-pulse" /> Mordida acertou: +5 PV
        </button>,
        <GrantRitual key="rit" p={p} ritual="Forma Monstruosa" />
      );
    }
  }

  if (element === 'Morte') {
    if (t65) {
      if (dying) {
        items.push(
          <button key="vig" type="button" className={SAH_BTN_NEUTRAL} title="No início de cada turno morrendo" onClick={() => p.onRoll('Ser Assustador: Vigor contra DT 15 (encerra morrendo)', attrValue(p, 'vig'), 20, 0)}>
            <Icon name="d20" /> Vigor DT 15
          </button>,
          <button key="wake" type="button" className={SAH_BTN_AMBER} onClick={() => {
            for (const c of p.conditions || []) if (/morrendo|inconsciente/i.test(c.name)) p.onRemoveCondition?.(c.id);
            if ((p.vitalsNow?.pv ?? 1) <= 0) p.onAdjustVital?.('pv', 1, 'Ser Assustador: passou no Vigor e acordou com 1 PV');
            p.onFeedback('Ser Assustador: você deixa de estar morrendo e acorda com 1 PV.');
          }}>
            <Icon name="heart-pulse" /> Passei: acordar com 1 PV
          </button>
        );
      }
      items.push(
        <button key="pe" type="button" className={SAH_BTN_NEUTRAL} title="Ao fazer um acerto crítico ou reduzir um inimigo a 0 PV" onClick={() => p.onAdjustVital?.('pe', 2, 'Ser Assustador: +2 PE (crítico ou inimigo a 0 PV)')}>
          <Icon name="zap" /> Crítico/inimigo a 0: +2 PE
        </button>
      );
    }
    if (t99) items.push(<GrantRitual key="rit" p={p} ritual="Fim Inevitável" />);
  }

  if (element === 'Conhecimento') {
    if (t65 && m65) {
      const trained = p.sheet.skills.filter((s) => s.trainingDegree >= 5);
      const dice = m65.trackedCount || 0;
      const ONE_TEST = 'pwr-scene-monstro-conh-dado';
      const updateM65 = (patch: Record<string, unknown>) => p.onUpdateAbilities(p.abilities.map((a) => (a.id === m65.id ? { ...a, ...patch } : a)));
      if (!m65.trackedTarget) {
        items.push(
          <label key="sac" className="flex items-center gap-1.5 text-xs text-zinc-300" title="Deixa de ser treinado nela até o fim do próximo interlúdio">
            Trocar treino por dados:
            <select className="trpg-input text-xs!" style={{ height: '2rem', width: 'auto' }} value="" onChange={(e) => {
              if (!e.target.value) return;
              const n = Math.max(0, attrValue(p, 'int'));
              updateM65({ trackedTarget: e.target.value, trackedCount: n });
              p.onFeedback(`Ser Assustador: sem treino em ${e.target.value} até o próximo interlúdio; ${n} dado(s) de bônus nesta cena.`);
            }}>
              <option value="">Escolher perícia</option>
              {trained.map((s) => (
                <option key={s.id} value={s.id}>
                  {ORDEM_SKILLS_METADATA.find((m) => m.id === s.id)?.name || s.id}
                </option>
              ))}
            </select>
          </label>
        );
      } else {
        const armed = hasSceneEffect(p, ONE_TEST);
        items.push(
          <span key="info" className="text-[11px] text-zinc-400">
            Sem treino em {ORDEM_SKILLS_METADATA.find((m) => m.id === m65.trackedTarget)?.name || m65.trackedTarget} • {dice} dado(s)
          </span>,
          armed ? (
            <button key="consume" type="button" className={SAH_BTN_ACTIVE} onClick={() => p.onUpdateSceneEffects?.((p.sheet.sceneEffects || []).filter((e) => e.id !== ONE_TEST))}>
              ✓ +1d20 no próximo teste • Consumir
            </button>
          ) : (
            <button key="use" type="button" className={SAH_BTN_AMBER} disabled={dice <= 0} onClick={() => {
              updateM65({ trackedCount: dice - 1 });
              p.onAddSceneEffect?.({ id: ONE_TEST, name: 'Ser Assustador (+1d20)', source: '1 teste', description: '+1d20 no próximo teste', modifiers: [{ id: 'mod-monstro-conh-dado', targetType: 'skill_dice', targetKey: 'all', value: 1 }] });
            }}>
              <Icon name="d20" /> Usar dado (+1d20)
            </button>
          ),
          <button key="restore" type="button" className={SAH_BTN_NEUTRAL} title="Ao final do seu próximo interlúdio" onClick={() => updateM65({ trackedTarget: undefined, trackedCount: 0 })}>
            Recuperar treino
          </button>
        );
      }
    }
    if (t99) {
      const pool = p.compendiumEntries.length ? p.compendiumEntries : ORDEM_COMPENDIUM_ENTRIES;
      const options = pool
        .filter(
          (e) =>
            e.category === 'spell' &&
            e.metadata?.circle === 4 &&
            /conhecimento/i.test(e.metadata?.element || '') &&
            matchesContentSourceFilter(resolveEntrySourceId(e, 'ordem-paranormal'), [], p.allowedSources, 'ordem-paranormal')
        )
        .map((e) => e.name.replace(/\s*\(4º Círculo.*\)/i, ''));
      items.push(<GrantRitual key="rit" p={p} options={options} />);
    }
  }

  if (element === 'Energia') {
    if (t65) {
      const sources: Array<[string, number]> = [['Portátil', 1], ['Grande', 2], ['Casa', 4]];
      items.push(
        <span key="lbl" className="text-[11px] text-zinc-400">Extrair energia (ação de movimento):</span>,
        ...sources.map(([label, n]) => (
          <button key={label} type="button" className={SAH_BTN_NEUTRAL} onClick={() => {
            const r = roll(n, 4);
            const total = r.reduce((a, b) => a + b, 0);
            p.onAdjustVital?.('pe', total, `Ser Assustador: extraiu ${total} PE de fonte ${label.toLowerCase()} (${n}d4)`);
            p.onFeedback(`Extraiu energia (${n}d4 = [${r.join(', ')}]): +${total} PE. A fonte fica descarregada.`);
          }}>
            <Icon name="zap" /> {label} ({n}d4)
          </button>
        ))
      );
    }
    if (t99) items.push(<GrantRitual key="rit" p={p} ritual="Deflagração de Energia" />);
  }

  if (!items.length) return null;
  return <div className="flex flex-wrap items-center justify-end gap-1.5">{items}</div>;
}

/** Transformação Monstruosa: NEX 75% (banido, perturbado) e 99% (SAN 1, confuso ao enlouquecer). */
export function MonstruosoTransformationWarning({ p }: { p: Props }) {
  const nex = Number(p.sheet.nex || 5);
  if (nex < 75) {
    return (
      <span className="text-[11px] text-amber-300/80 text-right">
        Atenção: em NEX 75% o personagem fica permanentemente perturbado e é banido pela Ordem.
      </span>
    );
  }
  const san = p.vitalsNow?.san ?? 0;
  return (
    <div className="flex flex-col items-end gap-1.5 p-2 rounded-lg border border-red-800/70 bg-red-950/30 max-w-sm">
      <span className="text-[11px] text-red-200 text-right">
        Transformação Monstruosa: permanentemente perturbado; banido pela Ordem (sem suporte; equipamento de uma patente abaixo).
        {nex >= 99 && ' Sanidade reduzida a 1; ao enlouquecer fica confuso em vez de sofrer insanidade — se enlouquecer, vira criatura do Outro Lado.'}
      </span>
      <div className="flex flex-wrap justify-end gap-1.5">
        <span className="trpg-badge">Perturbado (permanente)</span>
        {nex >= 99 && san > 1 && (
          <button type="button" className={SAH_BTN_AMBER} onClick={() => p.onAdjustVital?.('san', 1 - san, 'Transformação Monstruosa: Sanidade reduzida a 1')}>
            Reduzir SAN a 1
          </button>
        )}
      </div>
    </div>
  );
}
