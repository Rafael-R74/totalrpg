import { useState } from 'react';
import {
  ORDEM_COMPENDIUM_ENTRIES,
  ORDEM_NEX_ALTERATIONS,
  ORDEM_NEX_ALTERATIONS_INTRO,
  ORDEM_NEX_GENERAL_ALTERATIONS,
  NEX_PROG_ATTR35_OPTIONS,
  NEX_PROG_PEN25_OPTIONS,
  NEX_PROG_PEN35_OPTIONS,
  getEnergyChaosEffect,
  type NexProgressionElement,
  type PossessionInfo,
} from '@totalrpg/shared';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { SahTrilhasControls, TRAIL_CONTROL_IDS } from './SahTrilhasControls';
import { MonstruosoTierAbilities, MonstruosoTransformationWarning } from './SahMonstruoso';
import type { SahPowerProps } from './sahPowerKit';
import { SAH_BTN_ACTIVE, SAH_BTN_AMBER, SAH_BTN_NEUTRAL, hasSceneEffect } from './sahPowerKit';

/**
 * Trilhas do Sobrevivendo ao Horror (p. 15-28): recursos e controles próprios.
 * - Possuído: Pontos de Possessão (PP), chip na linha de condições da ficha.
 */

function Stepper({ value, onChange, max, label }: { value: number; onChange: (v: number) => void; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className="trpg-icon-btn" aria-label={`Menos ${label}`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
        <Icon name="minus" size={16} />
      </button>
      <span className="trpg-num text-lg font-semibold text-zinc-100 w-6 text-center">{value}</span>
      <button type="button" className="trpg-icon-btn" aria-label={`Mais ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

/** Possuído: chip "Possessão X/Y" que abre a janela para gastar PP em PV (10 cada) ou PE (2 cada). */
export function PossessionControl({
  info,
  onSpend,
  onAdjust,
}: {
  info: PossessionInfo;
  onSpend: (ppToPv: number, ppToPe: number) => void;
  onAdjust: (delta: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [toPv, setToPv] = useState(0);
  const [toPe, setToPe] = useState(0);
  const limit = Math.min(info.current, info.spendLimit);
  const total = toPv + toPe;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setToPv(0);
          setToPe(0);
          setOpen(true);
        }}
        title="Pontos de Possessão (Possuído): clique para gastar"
        className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/70 text-purple-100 border border-purple-700/80 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
      >
        <Icon name="ghost" size={13} /> Possessão{' '}
        <span className="trpg-num">
          {info.current}/{info.max}
        </span>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Pontos de Possessão"
        description={`Cada PP recupera 10 PV ou 2 PE. Limite por turno: ${info.spendLimit} PP (sua Presença). Ao dormir no interlúdio você recupera ${info.perSleep} PP.`}
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="trpg-btn-primary"
              disabled={total === 0}
              onClick={() => {
                onSpend(toPv, toPe);
                setOpen(false);
              }}
            >
              Gastar {total} PP
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1.5" aria-label={`${info.current} de ${info.max} PP`}>
            {Array.from({ length: info.max }).map((_, i) => (
              <span
                key={i}
                className={`h-3 flex-1 rounded-sm border ${
                  i < info.current - total
                    ? 'bg-purple-500 border-purple-400'
                    : i < info.current
                    ? 'bg-purple-900 border-purple-500'
                    : 'bg-zinc-900 border-zinc-700'
                }`}
              />
            ))}
          </div>
          {limit === 0 ? (
            <p className="text-sm text-zinc-400">
              {info.current === 0 ? 'Sem PP. Durma no interlúdio para recuperar.' : 'Sua Presença não permite gastar PP.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 flex flex-col items-center gap-2">
                <span className="text-sm text-zinc-300">Recuperar PV</span>
                <Stepper value={toPv} onChange={setToPv} max={limit - toPe} label="PP em PV" />
                <span className="text-xs text-red-300 trpg-num">+{toPv * 10} PV</span>
              </div>
              <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 flex flex-col items-center gap-2">
                <span className="text-sm text-zinc-300">Recuperar PE</span>
                <Stepper value={toPe} onChange={setToPe} max={limit - toPv} label="PP em PE" />
                <span className="text-xs text-orange-300 trpg-num">+{toPe * 2} PE</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-500">Corrigir manualmente</span>
            <div className="flex gap-1.5">
              <button type="button" className="trpg-btn-quiet trpg-btn-sm" disabled={info.current <= 0} onClick={() => onAdjust(-1)}>
                −1 PP
              </button>
              <button type="button" className="trpg-btn-quiet trpg-btn-sm" disabled={info.current >= info.max} onClick={() => onAdjust(1)}>
                +1 PP
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Controles de poderes de trilha na aba Poderes (ids trail-<trilha>-<nex>)


const TRAIL_CONTROLLED = ['trail-possuido-40', 'trail-possuido-99', 'trail-monstruoso-10'];

export function isSahTrilhasControlled(ab: { id: string }): boolean {
  return TRAIL_CONTROLLED.includes(ab.id) || TRAIL_CONTROL_IDS.includes(ab.id);
}

const SOMBRAS_ID = 'pwr-scene-sombras-dentro-de-mim';

const PRESENTES: Record<string, { name: string; text: string; heal?: number }> = {
  sangue: { name: 'Presente da Obsessão', text: 'recupera 50 PV; até seu próximo turno, perícias de FOR, VIG e Intimidação ficam com +35 de treino', heal: 50 },
  morte: { name: 'Presente do Tempo', text: 'turno adicional na última contagem de iniciativa da rodada (funciona até inconsciente)' },
  conhecimento: { name: 'Presente do Saber', text: 'recebe um poder qualquer até o fim da cena; depois, Vontade DT 15 +5 por uso na missão ou perde 1d6 SAN por uso' },
  energia: { name: 'Presente do Espaço', text: 'teletransporte para um ponto em alcance médio (espaço ocupado: arremessado ao espaço livre mais próximo)' },
};

export function SahTrilhasPowerControls(p: SahPowerProps & { onHealPv?: (amount: number, reason?: string) => void }) {
  if (p.ab.id === 'trail-possuido-40') {
    if (hasSceneEffect(p, SOMBRAS_ID)) {
      return (
        <button
          type="button"
          className={SAH_BTN_ACTIVE}
          onClick={() => {
            p.onUpdateSceneEffects?.((p.sheet.sceneEffects || []).filter((e) => e.id !== SOMBRAS_ID));
            p.onFeedback('As Sombras Dentro de Mim: rodada encerrada.');
          }}
        >
          ✓ Entidade no controle (+1d20) • Encerrar rodada
        </button>
      );
    }
    return (
      <button
        type="button"
        className={SAH_BTN_AMBER}
        title="Por uma rodada: +1d20 em Acrobacia, Atletismo e Furtividade; em cena de furtividade, a visibilidade sobe 1 a menos por ação"
        onClick={() => {
          if (
            !p.onSpendResource(2, {
              id: SOMBRAS_ID,
              name: 'As Sombras Dentro de Mim (1 rodada)',
              source: 'Rodada',
              description: '+1d20 em Acrobacia, Atletismo e Furtividade; visibilidade em cena de furtividade sobe 1 a menos por ação',
              modifiers: ['acrobacia', 'atletismo', 'furtividade'].map((sk) => ({
                id: `mod-sombras-${sk}`,
                targetType: 'skill_dice' as const,
                targetKey: sk,
                value: 1,
              })),
            })
          ) {
            return;
          }
          p.onFeedback('As Sombras Dentro de Mim (-2 PE): +1d20 em Acrobacia, Atletismo e Furtividade nesta rodada.');
        }}
      >
        <Icon name="ghost" /> Deixar a Entidade agir (-2 PE)
      </button>
    );
  }

  if (p.ab.id === 'trail-monstruoso-10') return <MonstruosoControl {...p} />;
  if (TRAIL_CONTROL_IDS.includes(p.ab.id)) return <SahTrilhasControls {...p} />;

  if (p.ab.id === 'trail-possuido-99') {
    const el = String((p.sheet as any).affinity || '').toLowerCase();
    const presente = PRESENTES[el];
    if (!presente) {
      return <span className="text-xs text-zinc-500">Defina sua afinidade elemental (NEX 50%) para receber o presente.</span>;
    }
    return (
      <button
        type="button"
        className={SAH_BTN_AMBER}
        title={presente.text}
        onClick={() => {
          if (!p.onSpendResource(6)) return;
          if (presente.heal) p.onHealPv?.(presente.heal, presente.name);
          p.onFeedback(`${presente.name} (-6 PE): ${presente.text}.`);
        }}
      >
        <Icon name="sparkles" /> {presente.name} (-6 PE)
      </button>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Monstruoso: elemento (10%) e etapa ritualística diária

const MONSTRO_EFFECTS: Record<string, { rd: string; penalty: string; extra: string }> = {
  Sangue: { rd: 'balístico e Sangue', penalty: 'Ciências e Intuição', extra: 'faro; soma VIG no dano de contra-ataque' },
  Morte: { rd: 'perfuração e Morte', penalty: 'Diplomacia e Enganação', extra: 'imune a fadiga; soma FOR nos PV' },
  Conhecimento: { rd: 'balístico e Conhecimento', penalty: 'Atletismo e Acrobacia', extra: 'visão no escuro; soma INT na Defesa' },
  Energia: { rd: 'corte, eletricidade, fogo e Energia', penalty: 'Investigação e Percepção', extra: 'soma AGI na RD do bloqueio' },
};

function MonstruosoControl(p: SahPowerProps & { onHealPv?: (amount: number, reason?: string) => void }) {
  const ab = p.ab;
  const el = ab.chosenElement || '';
  const has = (nex: number) => p.abilities.some((a) => a.id === `trail-monstruoso-${nex}`);
  const permanent = has(99);
  const rd = permanent ? 20 : has(65) ? 15 : has(40) ? 10 : 5;
  const pen = has(40) ? '-2d20' : '-1d20';
  const fx = MONSTRO_EFFECTS[el];
  const update = (patch: Partial<typeof ab>) =>
    p.onUpdateAbilities(p.abilities.map((a) => (a.id === ab.id ? { ...a, ...patch } : a)));

  // Escolha permanente: o seletor só aparece para fichas antigas que ainda não têm elemento
  if (!el) {
    return (
      <label className="flex items-center gap-1.5 text-xs text-zinc-300">
        Elemento:
        <select
          className="trpg-input text-xs!"
          style={{ height: '2rem', width: 'auto' }}
          value={el}
          onChange={(e) => update({ chosenElement: e.target.value, ritualActive: false })}
        >
          <option value="">Escolher elemento</option>
          {Object.keys(MONSTRO_EFFECTS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const active = permanent || Boolean(ab.ritualActive);
  return (
    <div className="flex flex-col items-end gap-1.5 max-w-sm">
      {permanent ? (
        <span className={SAH_BTN_ACTIVE}>Efeitos permanentes ({el})</span>
      ) : (
        <button
          type="button"
          className={active ? SAH_BTN_ACTIVE : SAH_BTN_AMBER}
          title="Uma vez por dia. Sem a etapa, você sofre fome e sede nesse dia"
          onClick={() => {
            update({ ritualActive: !active });
            p.onFeedback(
              active
                ? 'Etapa ritualística encerrada: efeitos do Monstruoso desligados.'
                : `Etapa ritualística de ${el} feita: RD ${rd} e efeitos até o fim do dia.`
            );
          }}
        >
          {active ? `✓ Etapa de ${el} feita hoje • Encerrar dia` : `Fazer etapa ritualística (${el})`}
        </button>
      )}
      {active && has(40) && (el === 'Sangue' || el === 'Energia') && <MonstruosoSpend p={p} element={el} />}
      <MonstruosoTierAbilities p={p} element={el} active={active} />
      <MonstruosoTransformationWarning p={p} />
      <NexAlterationsPanel p={p} element={el} />
      {fx && (
        <span className="text-[11px] text-zinc-400 text-right">
          {active
            ? `Ativo: RD ${rd} a ${fx.rd}; ${pen} em ${fx.penalty}; ${fx.extra}.`
            : 'Sem a etapa de hoje: fome e sede (OPRPG p. 292).'}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progressão de NEX (SaH p. 100): escolhas das alterações gerais de 25% e 35%

export type NexProgChoices = { pen25?: string; attr35?: string; pen35?: string };

const NEX_GENERAL_CHOICE_GROUPS: Array<{ key: keyof NexProgChoices; nex: number; label: string; options: { id: string; label: string }[] }> = [
  { key: 'pen25', nex: 25, label: 'NEX 25%: -5 em qual perícia?', options: NEX_PROG_PEN25_OPTIONS },
  { key: 'attr35', nex: 35, label: 'NEX 35%: qual atributo soma nos PE?', options: NEX_PROG_ATTR35_OPTIONS },
  { key: 'pen35', nex: 35, label: 'NEX 35%: -5 em qual perícia?', options: NEX_PROG_PEN35_OPTIONS },
];

/** Botões de escolha para as alterações gerais. `keys`: quais escolhas mostrar. */
export function NexGeneralChoicePicker({
  keys,
  value,
  onChange,
}: {
  keys: Array<keyof NexProgChoices>;
  value: NexProgChoices;
  onChange: (next: NexProgChoices) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {NEX_GENERAL_CHOICE_GROUPS.filter((g) => keys.includes(g.key)).map((g) => (
        <div key={g.key} className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-200">{g.label}</span>
          <div role="radiogroup" aria-label={g.label} className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {g.options.map((o) => {
              const on = value[g.key] === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange({ ...value, [g.key]: o.id })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border cursor-pointer ${
                    on ? 'bg-purple-600/30 border-purple-400 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function choiceLabel(key: keyof NexProgChoices, id?: string): string {
  const g = NEX_GENERAL_CHOICE_GROUPS.find((x) => x.key === key);
  return g?.options.find((o) => o.id === id)?.label || '';
}

// ---------------------------------------------------------------------------
// Progressão de NEX (SaH p. 98-102): painel de alterações do elemento

function NexAlterationsPanel({ p, element }: { p: SahPowerProps; element: string }) {
  const [open, setOpen] = useState(false);
  const [chaos, setChaos] = useState<{ roll: number; title: string; text: string } | null>(null);
  const nex = Number(p.sheet.nex || 5);
  const list = ORDEM_NEX_ALTERATIONS[element as NexProgressionElement] || [];
  const general = ORDEM_NEX_GENERAL_ALTERATIONS;
  const unlocked = list.filter((a) => nex >= a.nex).length + general.filter((a) => nex >= a.nex).length;
  const total = list.length + general.length;
  const choices: NexProgChoices = p.ab.nexProgChoices || {};
  const missingKeys = (['pen25', 'attr35', 'pen35'] as const).filter(
    (k) => nex >= (k === 'pen25' ? 25 : 35) && !choices[k]
  );
  const [draft, setDraft] = useState<NexProgChoices>({});
  function saveChoices() {
    const merged = { ...choices, ...draft };
    p.onUpdateAbilities(p.abilities.map((a) => (a.id === p.ab.id ? { ...a, nexProgChoices: merged } : a)));
    setDraft({});
    p.onFeedback('Escolhas da Progressão de NEX salvas.');
  }
  const owns = (ritual: string) =>
    p.abilities.some((a) => a.category === 'ritual' && a.name.toLowerCase().startsWith(ritual.toLowerCase()));

  function addRitual(ritual: string) {
    const pool = p.compendiumEntries.length ? p.compendiumEntries : ORDEM_COMPENDIUM_ENTRIES;
    const entry = pool.find((e) => e.category === 'spell' && e.name.toLowerCase().startsWith(ritual.toLowerCase()));
    if (!entry) {
      p.onFeedback(`Ritual ${ritual} não encontrado no compêndio.`);
      return;
    }
    p.onUpdateAbilities([
      ...p.abilities,
      {
        id: `${entry.id}-nexprog-${Math.random().toString(36).slice(2, 7)}`,
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
    p.onFeedback(`${entry.name} adicionado aos seus rituais (Progressão de NEX).`);
  }

  function rollChaos() {
    const roll = Math.floor(Math.random() * 6) + 1;
    const fx = getEnergyChaosEffect(roll, nex);
    const others = (p.sheet.sceneEffects || []).filter((e) => e.id !== 'nexprog-caos-energia');
    p.onUpdateSceneEffects?.([
      ...others,
      {
        id: 'nexprog-caos-energia',
        name: `Caos de Energia: ${fx.title}`,
        source: `1d6 = ${roll}`,
        description: fx.text,
        modifiers: fx.modifiers,
      },
    ]);
    setChaos({ roll, ...fx });
    p.onFeedback(`Caos de Energia (1d6 = ${roll}): ${fx.title}. ${fx.text}`);
  }

  return (
    <>
      <button type="button" className={SAH_BTN_NEUTRAL} onClick={() => { setChaos(null); setOpen(true); }}>
        <Icon name="route" /> Alterações por NEX ({unlocked}/{total}){missingKeys.length > 0 ? ' • escolha pendente' : ''}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title={`Progressão de NEX: ${element}`}
        description={`Alterações cumulativas pelo seu NEX (${nex}%). Os efeitos em perícias já são aplicados na ficha.`}
      >
        <div className="flex flex-col gap-3">
          {ORDEM_NEX_ALTERATIONS_INTRO.text && (
            <details className="text-xs text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">Sobre a regra</summary>
              <p className="mt-1.5">{ORDEM_NEX_ALTERATIONS_INTRO.text}</p>
            </details>
          )}
          {missingKeys.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-600/70 bg-amber-950/20 flex flex-col gap-2.5">
              <span className="text-sm font-semibold text-amber-200">
                <Icon name="warning" /> Escolhas pendentes (permanentes)
              </span>
              <NexGeneralChoicePicker keys={missingKeys} value={draft} onChange={setDraft} />
              <button
                type="button"
                className={`${SAH_BTN_AMBER} self-start`}
                disabled={missingKeys.some((k) => !draft[k])}
                onClick={saveChoices}
              >
                Salvar escolhas
              </button>
            </div>
          )}
          {general.map((alt) => {
            const on = nex >= alt.nex;
            const picked =
              alt.nex === 25
                ? choiceLabel('pen25', choices.pen25) && `-5 em ${choiceLabel('pen25', choices.pen25)}`
                : alt.nex === 35
                ? [choiceLabel('attr35', choices.attr35) && `${choiceLabel('attr35', choices.attr35)} nos PE`, choiceLabel('pen35', choices.pen35) && `-5 em ${choiceLabel('pen35', choices.pen35)}`]
                    .filter(Boolean)
                    .join('; ')
                : `Afinidade: ${element}`;
            return (
              <div
                key={`g${alt.nex}`}
                className={`p-3 rounded-lg border flex flex-col gap-2 ${on ? 'border-purple-700/70 bg-purple-950/20' : 'border-zinc-800 bg-zinc-950 opacity-60'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-100">NEX {alt.nex}% (geral)</span>
                  <span className={`trpg-badge ${on ? '' : 'opacity-70'}`}>{on ? 'Ativa' : 'Bloqueada'}</span>
                </div>
                <p className="text-sm text-zinc-300">{alt.summary}</p>
                {on && picked && <span className="text-xs text-emerald-300">Escolha: {picked}</span>}
                {alt.fullText && (
                  <details className="text-xs text-zinc-400">
                    <summary className="cursor-pointer text-zinc-300">Texto completo</summary>
                    <p className="mt-1.5 whitespace-pre-line">{alt.fullText}</p>
                  </details>
                )}
              </div>
            );
          })}
          {list.map((alt) => {
            const on = nex >= alt.nex;
            return (
              <div
                key={alt.nex}
                className={`p-3 rounded-lg border flex flex-col gap-2 ${on ? 'border-purple-700/70 bg-purple-950/20' : 'border-zinc-800 bg-zinc-950 opacity-60'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-100">NEX {alt.nex}%</span>
                  <span className={`trpg-badge ${on ? '' : 'opacity-70'}`}>{on ? 'Ativa' : 'Bloqueada'}</span>
                </div>
                <p className="text-sm text-zinc-300">{alt.summary}</p>
                {alt.fullText && (
                  <details className="text-xs text-zinc-400">
                    <summary className="cursor-pointer text-zinc-300">Texto completo</summary>
                    <p className="mt-1.5 whitespace-pre-line">{alt.fullText}</p>
                  </details>
                )}
                {on && alt.grantsRitual && (
                  owns(alt.grantsRitual) ? (
                    <span className="text-xs text-emerald-300">
                      ✓ {alt.grantsRitual} está nos seus rituais
                    </span>
                  ) : (
                    <button type="button" className={`${SAH_BTN_AMBER} self-start`} onClick={() => addRitual(alt.grantsRitual!)}>
                      <Icon name="sigil" /> Adicionar {alt.grantsRitual} aos rituais
                    </button>
                  )
                )}
              </div>
            );
          })}
          {element === 'Energia' && nex >= 60 && (
            <div className="p-3 rounded-lg border border-purple-700/70 bg-purple-950/20 flex flex-col gap-2">
              <span className="text-sm font-semibold text-zinc-100">Caos de Energia (início de cada cena)</span>
              {chaos ? (
                <p className="text-sm text-zinc-300">
                  <strong className="trpg-num">1d6 = {chaos.roll}</strong> · {chaos.title}: {chaos.text}
                </p>
              ) : (
                <p className="text-xs text-zinc-400">Role ao começar uma cena; o efeito fica registrado na cena.</p>
              )}
              <button type="button" className={`${SAH_BTN_AMBER} self-start`} onClick={rollChaos}>
                <Icon name="d20" /> Rolar caos da cena (1d6)
              </button>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}

/** Monstruoso 40%: Sangue (ação de movimento, 1d8 PV por PE, até FOR) e Energia (acerto corpo a corpo, +1d6 por PE, até AGI). */
function MonstruosoSpend({ p, element }: { p: SahPowerProps & { onHealPv?: (amount: number, reason?: string) => void }; element: string }) {
  const isSangue = element === 'Sangue';
  const attr = Number(p.sheet.attributes[isSangue ? 'for' : 'agi'] || 0) + (p.bonuses.attributes[isSangue ? 'for' : 'agi'] || 0);
  const max = Math.max(1, attr);
  const [n, setN] = useState(1);
  return (
    <div className="flex items-center gap-1.5">
      <select
        className="trpg-input text-xs!"
        style={{ height: '2rem', width: '4.5rem' }}
        aria-label="PE gastos"
        value={Math.min(n, max)}
        onChange={(e) => setN(Number(e.target.value))}
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((v) => (
          <option key={v} value={v}>
            {v} PE
          </option>
        ))}
      </select>
      <button
        type="button"
        className={SAH_BTN_AMBER}
        title={isSangue ? `Ação de movimento. Até ${max} PE (sua Força)` : `Ao acertar um ataque corpo a corpo. Até ${max} PE (sua Agilidade)`}
        onClick={() => {
          const k = Math.min(n, max);
          if (!p.onSpendResource(k)) return;
          if (isSangue) {
            const rolls = Array.from({ length: k }, () => Math.floor(Math.random() * 8) + 1);
            const total = rolls.reduce((a, b) => a + b, 0);
            p.onHealPv?.(total, 'Ser Macabro (Sangue)');
            p.onFeedback(`Ser Macabro (-${k} PE): ${k}d8 = [${rolls.join(', ')}] → +${total} PV.`);
          } else {
            p.onRoll(`Ser Macabro (Energia): +${k}d6 de dano de Energia`, k, 6, 0);
          }
        }}
      >
        <Icon name={isSangue ? 'heart-pulse' : 'zap'} /> {isSangue ? `Curar ${Math.min(n, max)}d8 PV` : `+${Math.min(n, max)}d6 Energia`}
      </button>
    </div>
  );
}
