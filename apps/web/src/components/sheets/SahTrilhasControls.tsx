import { useEffect, useState } from 'react';
import {
  ORDEM_COMPENDIUM_ENTRIES,
  ORDEM_ORIGINS,
  ORDEM_TRAILS,
  SceneEffect,
  checkOrdemPowerRequirements,
  matchesContentSourceFilter,
  resolveEntrySourceId,
} from '@totalrpg/shared';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import {
  SAH_BTN_ACTIVE,
  SAH_BTN_AMBER,
  SAH_BTN_NEUTRAL,
  SAH_USED,
  SahPowerProps,
  rollSkill,
  usedInScene,
} from './sahPowerKit';

/**
 * Controles de poderes de trilha do Sobrevivendo ao Horror na aba Poderes
 * (Agente Secreto, Caçador, Bibliotecário, Perseverante, Muambeiro, Exorcista, Parapsicólogo).
 * Possuído e Monstruoso ficam em SahTrilhasPowers.tsx.
 */
const MULTI_GRANT = 'sah-multifacetado';

export const TRAIL_CONTROL_IDS = [
  'trail-agente_secreto-10',
  'trail-agente_secreto-40',
  'trail-agente_secreto-65',
  'trail-agente_secreto-99',
  'trail-cacador-40',
  'trail-cacador-99',
  'trail-bibliotecario-65',
  'trail-bibliotecario-99',
  'trail-perseverante-10',
  'trail-perseverante-40',
  'trail-perseverante-65',
  'trail-perseverante-99',
  'trail-muambeiro-10',
  'trail-muambeiro-65',
  'trail-muambeiro-99',
  'trail-exorcista-40',
  'trail-exorcista-99',
  'trail-parapsicologo-10',
  'trail-parapsicologo-40',
  'trail-parapsicologo-65',
  'trail-parapsicologo-99',
  'trail-possuido-65',
];

type Props = SahPowerProps;

const update = (p: Props, patch: Record<string, unknown>) =>
  p.onUpdateAbilities(p.abilities.map((a) => (a.id === p.ab.id ? { ...a, ...patch } : a)));

const SKILL_LABEL: Record<string, string> = { diplomacia: 'Diplomacia', enganacao: 'Enganação' };
const FEAR_MENTAL = ['abalado', 'apavorado', 'alquebrado', 'confuso', 'esmorecido', 'frustrado', 'pasmo', 'perturbado', 'fascinado', 'enlouquecendo', 'paralisado'];
const isFearOrMental = (name: string) => FEAR_MENTAL.some((n) => name.toLowerCase().includes(n));

function markScene(p: Props, effect: SceneEffect) {
  if (p.isInCampaign) p.onAddSceneEffect?.(effect);
}

export function SahTrilhasControls(p: Props) {
  switch (p.ab.id) {
    // ---------------- Agente Secreto
    case 'trail-agente_secreto-10':
      return <Carteirada {...p} />;
    case 'trail-agente_secreto-40':
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {(['diplomacia', 'enganacao'] as const).map((sk) => (
            <button
              key={sk}
              type="button"
              className={SAH_BTN_AMBER}
              title="Após falhar: repete a rolagem (uma vez por teste) e fica com o novo resultado"
              onClick={() => p.onSpendResource(2) && rollSkill(p, sk, `O Sorriso: repetir ${SKILL_LABEL[sk]}`)}
            >
              <Icon name="refresh" /> Repetir {SKILL_LABEL[sk]} (-2 PE)
            </button>
          ))}
          {usedInScene(p, 'pwr-scene-sorriso-acalmar') ? (
            <span className={SAH_USED}>✓ Acalmou-se na cena</span>
          ) : (
            <button
              type="button"
              className={SAH_BTN_NEUTRAL}
              onClick={() => {
                markScene(p, { id: 'pwr-scene-sorriso-acalmar', name: 'O Sorriso (acalmar, usado na cena)', source: '1x/Cena', description: 'Diplomacia para acalmar a si mesmo' });
                rollSkill(p, 'diplomacia', 'O Sorriso: acalmar a si mesmo (Diplomacia)');
              }}
            >
              <Icon name="d20" /> Acalmar a si mesmo{p.isInCampaign ? ' (1x/Cena)' : ''}
            </button>
          )}
        </div>
      );
    case 'trail-agente_secreto-65': {
      const uses = (p.sheet.sceneEffects || []).filter((e) => e.id.startsWith('pwr-scene-metodo-investigativo-')).length;
      const cost = 2 + 2 * uses;
      return (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Quando o mestre rola na tabela de eventos de investigação. Cada uso extra na cena custa +2 PE"
          onClick={() => {
            if (!p.onSpendResource(cost, p.isInCampaign ? { id: `pwr-scene-metodo-investigativo-${uses + 1}`, name: `Método Investigativo (${uses + 1}º uso)`, source: 'Cena', description: 'Evento de investigação transformado em "sem evento"' } : undefined)) return;
            p.onFeedback(`Método Investigativo (-${cost} PE): o evento vira "sem evento". Avise o mestre.`);
          }}
        >
          <Icon name="search" /> Evento vira "sem evento" (-{cost} PE)
        </button>
      );
    }
    case 'trail-agente_secreto-99':
      return <Multifacetado {...p} />;

    // ---------------- Caçador
    case 'trail-cacador-40':
      return <TrackedTarget {...p} label="Ser estudado" placeholder="Ex.: Zumbi de Sangue" counter />;
    case 'trail-cacador-99':
      return <Presa {...p} />;

    // ---------------- Bibliotecário
    case 'trail-bibliotecario-65':
      return usedInScene(p, 'pwr-scene-rato-biblioteca') ? (
        <span className={SAH_USED}>✓ Usado na cena</span>
      ) : (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Em ambiente com muitos livros: benefícios de ler ou revisar caso (minutos, ou 1 rodada em investigação)"
          onClick={() => {
            markScene(p, { id: 'pwr-scene-rato-biblioteca', name: 'Rato de Biblioteca (Usado na Cena)', source: '1x/Cena', description: 'Benefício de ler ou revisar caso' });
            p.onFeedback('Rato de Biblioteca: receba os benefícios de ler ou revisar caso. Use o dado de Ler da ficha normalmente.');
          }}
        >
          <Icon name="book" /> Pesquisar entre os livros{p.isInCampaign ? ' (1x/Cena)' : ''}
        </button>
      );
    case 'trail-bibliotecario-99':
      return <ForcaDoSaber {...p} />;

    // ---------------- Perseverante
    case 'trail-perseverante-10':
      return (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Rola de novo 1 dos dados de um teste recém-feito (uma vez por teste) e fica com o melhor"
          onClick={() => p.onSpendResource(2) && p.onRoll('Soluções Improvisadas: novo dado (fique com o melhor)', 1, 20, 0)}
        >
          <Icon name="d20" /> Rerrolar 1 dado (-2 PE)
        </button>
      );
    case 'trail-perseverante-40':
      return (
        <button type="button" className={SAH_BTN_AMBER} onClick={() => rollSkill(p, 'atletismo', 'Fuga Obstinada: fugir (Atletismo +1d20)', { extraDice: 1 })}>
          <Icon name="footprints" /> Fugir: Atletismo +1d20
        </button>
      );
    case 'trail-perseverante-65':
      return <RemoveConditions {...p} title="Determinação Inquestionável" cost={5} oncePerScene sceneId="pwr-scene-determinacao" self />;
    case 'trail-perseverante-99': {
      const atZero = (p.vitalsNow?.pv ?? 1) <= 0;
      return atZero ? (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Quando um dano reduziria seus PV a 0 (não vale contra dano massivo)"
          onClick={() => {
            if (!p.onSpendResource(5)) return;
            p.onAdjustVital?.('pv', 1, 'Só Mais um Passo: ficou com 1 PV em vez de 0');
            for (const c of p.conditions || []) {
              if (/morrendo|inconsciente/i.test(c.name)) p.onRemoveCondition?.(c.id);
            }
            p.onFeedback('Só Mais um Passo (-5 PE): você fica com 1 PV.');
          }}
        >
          <Icon name="heart-pulse" /> Ficar com 1 PV (-5 PE)
        </button>
      ) : (
        <span className="text-xs text-zinc-500">Botão aparece quando seus PV chegam a 0</span>
      );
    }

    // ---------------- Muambeiro
    case 'trail-muambeiro-10':
    case 'trail-muambeiro-65':
      return <ProfissaoChoice {...p} />;
    case 'trail-muambeiro-99':
      return (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Ação completa. Item até categoria III (exceto paranormal), funciona até o fim da cena"
          onClick={() => {
            if (!p.onSpendResource(5, p.isInCampaign ? { id: `pwr-scene-achado-${Date.now()}`, name: 'Achado Conveniente', source: 'Até o fim da cena', description: 'Item produzido (até categoria III) que para de funcionar no fim da cena' } : undefined)) return;
            p.onFeedback('Achado Conveniente (-5 PE): combine o item com o mestre; ele funciona até o fim da cena.');
          }}
        >
          <Icon name="backpack" /> Produzir item (-5 PE)
        </button>
      );

    // ---------------- Exorcista
    case 'trail-exorcista-40':
      return (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Após falhar num teste de resistência: repete usando Religião e fica com o novo resultado"
          onClick={() => p.onSpendResource(2) && rollSkill(p, 'religiao', 'Poder da Fé: resistência com Religião')}
        >
          <Icon name="shield" /> Repetir resistência c/ Religião (-2 PE)
        </button>
      );
    case 'trail-exorcista-99': {
      const atZero = (p.vitalsNow?.san ?? 1) <= 0;
      return atZero ? (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => {
            p.onTakePvDamage?.(10, 'Chagas da Resistência');
            p.onAdjustVital?.('san', 1, 'Chagas da Resistência: gastou 10 PV para ficar com SAN 1');
            p.onFeedback('Chagas da Resistência: -10 PV, você fica com SAN 1.');
          }}
        >
          <Icon name="heart-pulse" /> Gastar 10 PV e ficar com SAN 1
        </button>
      ) : (
        <span className="text-xs text-zinc-500">Botão aparece quando sua Sanidade chega a 0</span>
      );
    }

    // ---------------- Parapsicólogo
    case 'trail-parapsicologo-10':
      return <Terapia {...p} />;
    case 'trail-parapsicologo-40':
      return <PalavrasChave {...p} />;
    case 'trail-parapsicologo-65':
      return (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Ação de interlúdio (sua e da pessoa). Até o próximo interlúdio, ela recebe um poder geral, da própria classe ou o 1º poder de uma trilha"
          onClick={() => p.onSpendResource(5) && p.onFeedback('Reprogramação Mental (-5 PE): a pessoa escolhe o poder; vale até o próximo interlúdio.')}
        >
          <Icon name="brain" /> Reprogramar uma mente (-5 PE)
        </button>
      );
    case 'trail-possuido-65':
      return <EleMeEnsina {...p} />;
    case 'trail-parapsicologo-99':
      return <RemoveConditions {...p} title="A Sanidade Está Lá Fora" cost={5} self allowOther />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

function Carteirada(p: Props) {
  const chosen = p.ab.chosenSkill;
  const hasDocs = p.inventory.some((it) => /documentos/i.test(it.name));
  if (!chosen) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-zinc-300">Treinar:</span>
        {(['diplomacia', 'enganacao'] as const).map((sk) => (
          <button
            key={sk}
            type="button"
            className={SAH_BTN_AMBER}
            onClick={() => {
              update(p, { chosenSkill: sk, trainingGranted: undefined });
              if (!hasDocs) {
                p.onUpdateInventory?.([
                  ...p.inventory,
                  {
                    id: `item-documentos-${Date.now()}`,
                    name: 'Documentos (Carteirada)',
                    slots: 0,
                    baseSlots: 0,
                    quantity: 1,
                    category: 0,
                    baseCategory: 0,
                    isEquipped: true,
                    sourceId: 'sobrevivendo-ao-horror',
                    description: 'Documentos com privilégios jurídicos especiais (item operacional, não ocupa espaço). Renovados no início de cada missão.',
                  } as any,
                ]);
              }
              p.onFeedback(`Carteirada: treino em ${SKILL_LABEL[sk]} (ou +2, se já treinado) e Documentos na mochila.`);
            }}
          >
            {SKILL_LABEL[sk]}
          </button>
        ))}
      </div>
    );
  }
  return (
    <span className="text-xs text-zinc-400">
      {SKILL_LABEL[chosen] || chosen} • {hasDocs ? 'Documentos na mochila' : 'Documentos: renovados a cada missão'}
    </span>
  );
}

function ProfissaoChoice(p: Props) {
  const opts = ['armeiro', 'engenheiro', 'químico'];
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-300">
      Profissão:
      <select
        className="trpg-input text-xs!"
        style={{ height: '2rem', width: 'auto' }}
        value={p.ab.chosenSkill || ''}
        onChange={(e) => update(p, { chosenSkill: e.target.value })}
      >
        <option value="">Escolher</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ForcaDoSaber(p: Props) {
  const skills = p.sheet.skills.map((s) => s.id);
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-300" title="Esta perícia passa a usar Intelecto">
      Perícia com INT:
      <select
        className="trpg-input text-xs!"
        style={{ height: '2rem', width: 'auto' }}
        value={p.ab.chosenSkill || ''}
        onChange={(e) => update(p, { chosenSkill: e.target.value })}
      >
        <option value="">Escolher</option>
        {skills.map((id) => (
          <option key={id} value={id}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TrackedTarget(p: Props & { label: string; placeholder: string; counter?: boolean; hint?: string }) {
  const [draft, setDraft] = useState(p.ab.trackedTarget || '');
  const count = p.ab.trackedCount || 0;
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          className="trpg-input text-xs!"
          style={{ height: '2rem', width: '11rem' }}
          aria-label={p.label}
          placeholder={p.placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== (p.ab.trackedTarget || '') && update(p, { trackedTarget: draft, trackedCount: 0 })}
        />
        {p.counter && (
          <button
            type="button"
            className={SAH_BTN_AMBER}
            disabled={!p.ab.trackedTarget}
            title="Ação de interlúdio com uma pista ligada ao ser"
            onClick={() => {
              update(p, { trackedCount: count + 1 });
              p.onFeedback(`Estudar Fraquezas: +1 pista (agora +${count + 1} contra ${p.ab.trackedTarget}). Peça ao mestre a informação.`);
            }}
          >
            +1 pista
          </button>
        )}
      </div>
      {p.ab.trackedTarget && (
        <span className="text-[11px] text-zinc-400">
          {p.counter ? `+${count} em testes de perícia contra ${p.ab.trackedTarget} até o fim da missão` : `${p.hint} ${p.ab.trackedTarget}`}
        </span>
      )}
    </div>
  );
}

function Multifacetado(p: Props) {
  const [open, setOpen] = useState(false);
  const [trailId, setTrailId] = useState('');
  const own = (p.sheet as any).trail;
  const options = ORDEM_TRAILS.filter(
    (t) =>
      (t.classId === 'combatente' || t.classId === 'especialista') &&
      t.id !== own &&
      matchesContentSourceFilter(t.sourceId, [], p.allowedSources, 'ordem-paranormal')
  );
  const sceneId = 'pwr-scene-multifacetado';
  // Marcador separado: encerrar o disfarce não libera outro uso na mesma cena
  const usedSceneId = 'pwr-scene-multifacetado-usado';
  const tempAbilities = p.abilities.filter((a) => a.grantedBy === MULTI_GRANT);
  const sceneActive = (p.sheet.sceneEffects || []).some((e) => e.id === sceneId);
  // A cena acabou (efeito sumiu): remove as habilidades emprestadas
  useEffect(() => {
    if (!sceneActive && tempAbilities.length > 0) {
      p.onUpdateAbilities(p.abilities.filter((a) => a.grantedBy !== MULTI_GRANT));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneActive, tempAbilities.length]);
  if (sceneActive) {
    return (
      <button
        type="button"
        className={SAH_BTN_NEUTRAL}
        title="Remove as habilidades emprestadas (a SAN gasta só volta no fim da missão)"
        onClick={() => {
          p.onUpdateAbilities(p.abilities.filter((a) => a.grantedBy !== MULTI_GRANT));
          p.onUpdateSceneEffects?.((p.sheet.sceneEffects || []).filter((e) => e.id !== sceneId));
        }}
      >
        ✓ Disfarce ativo • Encerrar
      </button>
    );
  }
  if (usedInScene(p, usedSceneId)) return <span className={SAH_USED}>✓ Disfarce assumido na cena</span>;
  const chosen = options.find((t) => t.id === trailId);
  return (
    <>
      <button type="button" className={SAH_BTN_AMBER} onClick={() => { setTrailId(''); setOpen(true); }}>
        <Icon name="drama" /> Assumir outra trilha (-5 SAN)
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Multifacetado"
        description="Uma vez por cena: gaste 5 SAN (só recuperados no fim da missão) para usar até o fim da cena as habilidades de até NEX 65% de uma trilha de combatente ou especialista. A mesma trilha só uma vez por missão."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>Cancelar</button>
            <button
              type="button"
              className="trpg-btn-primary"
              disabled={!chosen}
              onClick={() => {
                if (!chosen) return;
                const tps = chosen.powers.filter((tp) => tp.nex <= 65);
                const powers = tps.map((tp) => tp.name).join(', ');
                p.onUpdateAbilities([
                  ...p.abilities,
                  ...tps
                    .filter((tp) => !p.abilities.some((a) => a.id === `trail-${chosen.id}-${tp.nex}`))
                    .map((tp) => ({
                      id: `trail-${chosen.id}-${tp.nex}`,
                      name: `Multifacetado: ${tp.name}`,
                      category: 'classe' as const,
                      cost: tp.cost,
                      description: tp.description,
                      isActive: tp.cost === 0 || (tp.modifiers || []).length > 0,
                      grantedBy: MULTI_GRANT,
                      modifiers: tp.modifiers || [],
                    })),
                ]);
                p.onLoseSanity?.(5, `Multifacetado (${chosen.name})`);
                p.onAddSceneEffect?.({ id: sceneId, name: `Multifacetado: ${chosen.name}`, source: 'Até o fim da cena', description: `Habilidades até NEX 65%: ${powers}` });
                if (p.isInCampaign) {
                  p.onAddSceneEffect?.({ id: usedSceneId, name: 'Multifacetado (usado na cena)', source: 'Cena', description: 'Uma vez por cena' });
                }
                p.onFeedback(`Multifacetado (-5 SAN): até o fim da cena você usa ${powers}.`);
                setOpen(false);
              }}
            >
              Assumir (-5 SAN)
            </button>
          </>
        }
      >
        <select className="trpg-input" value={trailId} onChange={(e) => setTrailId(e.target.value)} aria-label="Trilha">
          <option value="">Escolher trilha</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.classId === 'combatente' ? 'Combatente' : 'Especialista'})
            </option>
          ))}
        </select>
        {chosen && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-zinc-300">
            {chosen.powers.filter((tp) => tp.nex <= 65).map((tp) => (
              <li key={tp.nex}>• {tp.name}</li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}

function RemoveConditions(p: Props & { title: string; cost: number; oncePerScene?: boolean; sceneId?: string; self?: boolean; allowOther?: boolean }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const conds = p.conditions || [];
  if (p.oncePerScene && p.sceneId && usedInScene(p, p.sceneId)) return <span className={SAH_USED}>✓ Usado na cena</span>;
  return (
    <>
      <button
        type="button"
        className={SAH_BTN_AMBER}
        onClick={() => {
          setSel(Object.fromEntries(conds.filter((c) => isFearOrMental(c.name)).map((c) => [c.id, true])));
          setOpen(true);
        }}
      >
        <Icon name="sparkles" /> Remover condições (-{p.cost} PE)
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={p.title}
        description="Remove condições de medo ou mentais (e paralisia, quando aplicável). Já deixamos marcadas as que parecem desse tipo."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>Cancelar</button>
            {p.allowOther && (
              <button
                type="button"
                className="trpg-btn-secondary"
                onClick={() => {
                  if (!p.onSpendResource(p.cost)) return;
                  p.onFeedback(`${p.title} (-${p.cost} PE): a pessoa adjacente perde as condições de medo e mentais.`);
                  setOpen(false);
                }}
              >
                Em outra pessoa
              </button>
            )}
            <button
              type="button"
              className="trpg-btn-primary"
              disabled={!Object.values(sel).some(Boolean)}
              onClick={() => {
                const ids = Object.keys(sel).filter((id) => sel[id]);
                if (!p.onSpendResource(p.cost, p.oncePerScene && p.sceneId && p.isInCampaign ? { id: p.sceneId, name: `${p.title} (Usado na Cena)`, source: '1x/Cena', description: 'Condição removida' } : undefined)) return;
                ids.forEach((id) => p.onRemoveCondition?.(id));
                p.onFeedback(`${p.title} (-${p.cost} PE): ${ids.length} condição(ões) removida(s).`);
                setOpen(false);
              }}
            >
              Remover de mim
            </button>
          </>
        }
      >
        {conds.length === 0 ? (
          <p className="text-sm text-zinc-400">Você não tem condições ativas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {conds.map((c) => (
              <label key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={Boolean(sel[c.id])} onChange={(e) => setSel((prev) => ({ ...prev, [c.id]: e.target.checked }))} />
                <span className="text-sm text-zinc-100">{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </Dialog>
    </>
  );
}

function Terapia(p: Props) {
  const norm = String(p.sheet.origin || '').trim().toLowerCase();
  const isPsicologo = ORDEM_ORIGINS.find((o) => o.id === norm || o.name.toLowerCase() === norm)?.id === 'psicologo';
  const cost = isPsicologo ? 1 : 2;
  const bonus = isPsicologo ? 2 : 0;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={SAH_BTN_NEUTRAL} onClick={() => rollSkill(p, 'profissao', 'Terapia: Profissão (psicólogo) como Diplomacia', { extraMod: bonus })}>
        <Icon name="d20" /> Diplomacia c/ Profissão
      </button>
      <button
        type="button"
        className={SAH_BTN_AMBER}
        title="1x por rodada: você ou aliado em alcance curto falhou numa resistência contra dano mental; use este resultado no lugar"
        onClick={() => p.onSpendResource(cost) && rollSkill(p, 'profissao', 'Terapia: substitui resistência contra dano mental', { extraMod: bonus })}
      >
        <Icon name="brain" /> Substituir resistência (-{cost} PE)
      </button>
      {isPsicologo && <span className="text-[11px] text-zinc-500">Psicólogo: -1 PE e +2 em Profissão</span>}
    </div>
  );
}

function PalavrasChave(p: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1);
  const limit = Math.max(1, p.vitalsNow?.peLimit || 1);
  return (
    <>
      <button type="button" className={SAH_BTN_AMBER} title="Após passar num teste para acalmar alguém" onClick={() => { setAmount(1); setOpen(true); }}>
        <Icon name="heart-pulse" /> Restaurar Sanidade (PE → SAN)
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Palavras-chave"
        description={`Depois de acalmar alguém, gaste PE (até seu limite, ${limit}). Cada PE devolve 1 ponto de Sanidade à pessoa tratada.`}
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>Cancelar</button>
            <button
              type="button"
              className="trpg-btn-secondary"
              onClick={() => {
                if (!p.onSpendResource(amount)) return;
                p.onFeedback(`Palavras-chave (-${amount} PE): a pessoa tratada recupera ${amount} SAN.`);
                setOpen(false);
              }}
            >
              Em outra pessoa
            </button>
            <button
              type="button"
              className="trpg-btn-primary"
              onClick={() => {
                if (!p.onSpendResource(amount)) return;
                p.onAdjustVital?.('san', amount, `Palavras-chave: recuperou ${amount} SAN`);
                p.onFeedback(`Palavras-chave (-${amount} PE): +${amount} SAN.`);
                setOpen(false);
              }}
            >
              Em mim
            </button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="trpg-label">PE gastos (= SAN recuperada)</span>
          <input
            type="number"
            min={1}
            max={limit}
            className="trpg-input trpg-num"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Math.min(limit, Math.trunc(Number(e.target.value) || 1))))}
          />
        </label>
      </Dialog>
    </>
  );
}


/** Possuído 65% (Ele Me Ensina): Transcender ou o 1º poder de outra trilha de ocultista. */
function EleMeEnsina(p: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'transcend' | 'trail'>('transcend');
  const [pick, setPick] = useState('');
  const done = p.ab.trackedTarget;
  if (done) return <span className="text-xs text-zinc-400">Escolhido: {done}</span>;

  const pool = p.compendiumEntries.length ? p.compendiumEntries : ORDEM_COMPENDIUM_ENTRIES;
  const owned = new Set(p.abilities.map((a) => a.name.trim().toLowerCase()));
  const paranormal = pool
    .filter(
      (e) =>
        e.category === 'paranormal_power' &&
        !owned.has(e.name.trim().toLowerCase()) &&
        matchesContentSourceFilter(resolveEntrySourceId(e, 'ordem-paranormal'), [], p.allowedSources, 'ordem-paranormal')
    )
    .map((e) => ({ e, check: checkOrdemPowerRequirements(e, p.sheet, p.abilities) }))
    .sort((a, b) => Number(b.check.met) - Number(a.check.met) || a.e.name.localeCompare(b.e.name, 'pt-BR'));
  const trails = ORDEM_TRAILS.filter(
    (t) =>
      t.classId === 'ocultista' &&
      t.id !== 'possuido' &&
      matchesContentSourceFilter(t.sourceId, [], p.allowedSources, 'ordem-paranormal') &&
      !p.abilities.some((a) => a.id === `versatility-${t.id}-10`)
  );

  function confirm() {
    if (mode === 'transcend') {
      const found = paranormal.find((x) => x.e.id === pick);
      if (!found) return;
      const e = found.e;
      // Primeiro marca a escolha (usa a lista atual); depois o Transcender acrescenta o poder sobre o estado mais recente
      update(p, { trackedTarget: `Transcender: ${e.name}` });
      p.onTranscend?.({
        id: `${e.id}-elemeensina`,
        name: e.name,
        category: 'poder_paranormal',
        cost: e.cost,
        element: e.metadata?.element,
        description: e.description,
        isActive: e.cost === 0,
        sourceId: resolveEntrySourceId(e, 'ordem-paranormal'),
        modifiers: e.modifiers || [],
      });
      p.onFeedback(`Ele Me Ensina: transcendeu com ${e.name} (+2 PP máximos, sem ganho de SAN neste NEX).`);
    } else {
      const t = trails.find((x) => x.id === pick);
      const tp = t?.powers.find((x) => x.nex === 10);
      if (!t || !tp) return;
      p.onUpdateAbilities([
        ...p.abilities.map((a) => (a.id === p.ab.id ? { ...a, trackedTarget: `${tp.name}` } : a)),
        {
          id: `versatility-${t.id}-10`,
          name: `Ele Me Ensina: ${tp.name}`,
          category: 'classe',
          cost: tp.cost,
          description: tp.description,
          isActive: tp.cost === 0 || (tp.modifiers || []).length > 0,
          modifiers: tp.modifiers || [],
        },
      ]);
      p.onFeedback(`Ele Me Ensina: recebeu ${tp.name}.`);
    }
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={SAH_BTN_AMBER} onClick={() => { setPick(''); setOpen(true); }}>
        <Icon name="ghost" /> Escolher o que a Entidade ensina
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Ele Me Ensina"
        description="Escolha entre Transcender ou receber o primeiro poder de outra trilha de ocultista (cumprindo os pré-requisitos)."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="button" className="trpg-btn-primary" disabled={!pick} onClick={confirm}>Confirmar</button>
          </>
        }
      >
        <div role="tablist" aria-label="Tipo de escolha" className="trpg-tabs -mx-1 mb-3">
          {([['transcend', 'Transcender'], ['trail', 'Poder de outra trilha']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={mode === id} className="trpg-tab" onClick={() => { setMode(id); setPick(''); }}>
              {label}
            </button>
          ))}
        </div>
        {mode === 'transcend' ? (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            <p className="text-xs text-zinc-500">Transcender: você não ganha a Sanidade deste NEX e recebe +2 Pontos de Possessão máximos.</p>
            {paranormal.map(({ e, check }) => (
              <label key={e.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${pick === e.id ? 'border-purple-500 bg-purple-950/30' : 'border-zinc-800 bg-zinc-950'} ${check.met ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                <input type="radio" name="elemeensina" className="mt-1 accent-purple-500" disabled={!check.met} checked={pick === e.id} onChange={() => setPick(e.id)} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100">{e.name}</span>
                  {!check.met && <span className="block text-xs text-red-300">Falta: {check.missing.join(', ')}</span>}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {trails.map((t) => {
              const tp = t.powers.find((x) => x.nex === 10);
              const reqUnmet = Boolean(t.requiredSkill && !p.sheet.skills.some((sk) => sk.id === t.requiredSkill && sk.trainingDegree >= 5));
              return (
                <label key={t.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${pick === t.id ? 'border-purple-500 bg-purple-950/30' : 'border-zinc-800 bg-zinc-950'} ${reqUnmet ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input type="radio" name="elemeensina" className="mt-1 accent-purple-500" disabled={reqUnmet} checked={pick === t.id} onChange={() => setPick(t.id)} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-zinc-100">{t.name}: {tp?.name}</span>
                    {reqUnmet && <span className="block text-xs text-red-300">Requer: {t.requirementText}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Dialog>
    </>
  );
}

const PRESA_ID = 'pwr-scene-enfrentando-presa';

/** Caçador 99% (Estudar a Presa): define o tipo de ser e liga os bônus quando estiver enfrentando um deles. */
function Presa(p: Props) {
  const facing = (p.sheet.sceneEffects || []).some((e) => e.id === PRESA_ID);
  return (
    <div className="flex flex-col items-end gap-1.5">
      <TrackedTarget {...p} label="Presa (tipo de ser)" placeholder="Ex.: Cultistas" hint="+1d20 em perícias, +1 na margem e no multiplicador de crítico e RD 5 contra" />
      {p.ab.trackedTarget &&
        (facing ? (
          <button
            type="button"
            className={SAH_BTN_ACTIVE}
            onClick={() => p.onUpdateSceneEffects?.((p.sheet.sceneEffects || []).filter((e) => e.id !== PRESA_ID))}
          >
            ✓ Enfrentando {p.ab.trackedTarget} • Encerrar
          </button>
        ) : (
          <button
            type="button"
            className={SAH_BTN_AMBER}
            onClick={() =>
              p.onAddSceneEffect?.({
                id: PRESA_ID,
                name: `Estudar a Presa: ${p.ab.trackedTarget}`,
                source: 'Cena',
                description: `Contra ${p.ab.trackedTarget}: +1d20 em perícias, +1 na margem e no multiplicador de crítico, RD geral 5`,
                modifiers: [{ id: 'mod-presa-pericias', targetType: 'skill_dice', targetKey: 'all', value: 1 }],
              })
            }
          >
            <Icon name="target" /> Enfrentando a presa
          </button>
        ))}
    </div>
  );
}
