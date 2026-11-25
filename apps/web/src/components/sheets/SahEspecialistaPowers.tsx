import { useMemo, useState } from 'react';
import {
  CharacterAbility,
  CompendiumEntryData,
  ORDEM_COMPENDIUM_ENTRIES,
  ORDEM_ORIGINS,
  ORDEM_SKILLS_METADATA,
  OrdemOriginMeta,
  SceneEffect,
  checkOrdemPowerRequirements,
  matchesContentSourceFilter,
  resolveEntrySourceId,
} from '@totalrpg/shared';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { SourceTagBadge } from '../ui/ContentSourceFilterBar';
import { applyCampaignSceneEffect, fetchCampaignTradeTargets } from '../../services/api';
import {
  SAH_BTN_ACTIVE,
  SAH_BTN_AMBER,
  SAH_BTN_NEUTRAL,
  SAH_USED,
  SahPowerProps,
  attrValue,
  matchSahPower,
  rollSkill,
  usedInScene,
} from './sahPowerKit';

export type { FlashbackChoice } from './sahPowerKit';

/**
 * Poderes de Especialista do suplemento Sobrevivendo ao Horror (p. 21-22).
 * Acolher o Terror, Contatos Oportunos e Esconderijo Desesperado são só descritivos.
 */
const PREFIX = 'sah-pwr-esp-';
const CONTROLLED = [
  { slug: 'disfarce-sutil', name: 'disfarce sutil' },
  { slug: 'especialista-diletante', name: 'especialista diletante' },
  { slug: 'flashback', name: 'flashback' },
  { slug: 'leitura-fria', name: 'leitura fria' },
  { slug: 'maos-firmes', name: 'mãos firmes' },
  { slug: 'plano-de-fuga', name: 'plano de fuga' },
  { slug: 'remoer-memorias', name: 'remoer memórias' },
  { slug: 'resistir-a-pressao', name: 'resistir à pressão' },
];

export const DILETANTE_GRANT = `${PREFIX}especialista-diletante`;
export const FLASHBACK_GRANT = `${PREFIX}flashback`;

/** Usado por `hasDedicatedControlElsewhere` para não mostrar o botão genérico "Usar". */
export function isSahEspecialistaControlled(ab: CharacterAbility): boolean {
  return matchSahPower(ab, PREFIX, CONTROLLED) !== null;
}

type Props = SahPowerProps;

export function SahEspecialistaPowerControls(props: Props) {
  switch (matchSahPower(props.ab, PREFIX, CONTROLLED)) {
    case 'disfarce-sutil':
      return <DisfarceSutil {...props} />;
    case 'maos-firmes':
      return <MaosFirmes {...props} />;
    case 'plano-de-fuga':
      return <PlanoDeFuga {...props} />;
    case 'remoer-memorias':
      return <RemoerMemorias {...props} />;
    case 'leitura-fria':
      return <LeituraFria {...props} />;
    case 'resistir-a-pressao':
      return <ResistirAPressao {...props} />;
    case 'especialista-diletante':
      return <EspecialistaDiletante {...props} />;
    case 'flashback':
      return <Flashback {...props} />;
    default:
      return null;
  }
}

function DisfarceSutil(p: Props) {
  const hasKit = p.inventory.some((it) => {
    const n = (it.name || '').toLowerCase();
    return n.includes('kit') && n.includes('disfarce');
  });
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Disfarce em si mesmo como ação completa, sem precisar de kit"
      onClick={() => {
        if (!p.onSpendResource(1)) return;
        rollSkill(p, 'enganacao', `Disfarce Sutil (Enganação${hasKit ? ', com kit +5' : ', sem kit'})`, {
          extraMod: hasKit ? 5 : 0,
        });
      }}
    >
      <Icon name="drama" /> Disfarçar-se: Enganação{hasKit ? ' +5 (kit)' : ''} (-1 PE)
    </button>
  );
}

function MaosFirmes(p: Props) {
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Esconder-se ou ação discreta manipulando um objeto"
      onClick={() => {
        if (!p.onSpendResource(2)) return;
        rollSkill(p, 'furtividade', 'Mãos Firmes (Furtividade +1d20)', { extraDice: 1 });
      }}
    >
      <Icon name="d20" /> Furtividade +1d20 (-2 PE)
    </button>
  );
}

function PlanoDeFuga(p: Props) {
  const SCENE_ID = 'pwr-scene-plano-de-fuga';
  const used = usedInScene(p, SCENE_ID);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={SAH_BTN_NEUTRAL}
        title="Criar Obstáculo em perseguição: teste de Intelecto em vez de Força (DT 15)"
        onClick={() => p.onRoll('Plano de Fuga: Criar Obstáculo (Intelecto, DT 15)', attrValue(p, 'int'), 20, 0)}
      >
        <Icon name="brain" /> Criar Obstáculo: Intelecto (DT 15)
      </button>
      {used ? (
        <span className={SAH_USED}>✓ Sucesso automático usado na cena</span>
      ) : (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => {
            if (
              !p.onSpendResource(
                2,
                p.isInCampaign
                  ? {
                      id: SCENE_ID,
                      name: 'Plano de Fuga (Usado na Cena)',
                      source: '1x/Cena',
                      description: 'Criar Obstáculo bem-sucedido sem teste',
                    }
                  : undefined
              )
            ) {
              return;
            }
            p.onFeedback('Plano de Fuga (-2 PE): obstáculo criado sem teste. A DT de Atletismo cai 5 nesta rodada.');
          }}
        >
          <Icon name="zap" /> Obstáculo automático (-2 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
        </button>
      )}
    </div>
  );
}

function RemoerMemorias(p: Props) {
  const SCENE_ID = 'pwr-scene-remoer-memorias';
  if (usedInScene(p, SCENE_ID)) return <span className={SAH_USED}>✓ Usado na cena</span>;
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Substitui um teste de perícia de Intelecto ou Presença por um teste de Intelecto contra DT 15"
      onClick={() => {
        if (
          !p.onSpendResource(
            2,
            p.isInCampaign
              ? {
                  id: SCENE_ID,
                  name: 'Remoer Memórias (Usado na Cena)',
                  source: '1x/Cena',
                  description: 'Teste de perícia substituído por teste de Intelecto (DT 15)',
                }
              : undefined
          )
        ) {
          return;
        }
        p.onRoll('Remoer Memórias: teste de Intelecto (DT 15)', attrValue(p, 'int'), 20, 0);
      }}
    >
      <Icon name="brain" /> Trocar teste por Intelecto DT 15 (-2 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
    </button>
  );
}

// ---------------------------------------------------------------------------
// Leitura Fria: PE temporários por pergunta não respondida

function LeituraFria(p: Props) {
  const [open, setOpen] = useState(false);
  const [unanswered, setUnanswered] = useState(0);
  return (
    <>
      <button type="button" className={SAH_BTN_AMBER} onClick={() => { setUnanswered(0); setOpen(true); }}>
        <Icon name="eye" /> Fazer leitura fria
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Leitura Fria"
        description="1 vez por interlúdio, 1 vez por NPC. Faça as 3 perguntas ao mestre e informe quantas ele se negou a responder."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="trpg-btn-primary"
              onClick={() => {
                if (unanswered > 0) p.onGrantTempPe?.(unanswered * 2, 'Leitura Fria');
                p.onFeedback(
                  unanswered > 0
                    ? `Leitura Fria: +${unanswered * 2} PE temporários (${unanswered} pergunta${unanswered > 1 ? 's' : ''} sem resposta).`
                    : 'Leitura Fria: todas as perguntas foram respondidas.'
                );
                setOpen(false);
              }}
            >
              {unanswered > 0 ? `Receber +${unanswered * 2} PE temporários` : 'Confirmar'}
            </button>
          </>
        }
      >
        <p className="text-sm text-zinc-300 mb-3">Perguntas não respondidas</p>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Perguntas não respondidas">
          {[0, 1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={unanswered === n}
              onClick={() => setUnanswered(n)}
              className={`py-2.5 rounded-lg border text-sm font-bold trpg-num transition cursor-pointer ${
                unanswered === n
                  ? 'border-amber-500 bg-amber-950/40 text-zinc-100'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-3">Cada pergunta sem resposta vale 2 PE temporários.</p>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Resistir à Pressão: +2 em perícias para o grupo na rodada extra de investigação

const PRESSAO_USED = 'pwr-scene-resistir-pressao-used';
const PRESSAO_BUFF = 'pwr-scene-resistir-pressao';

function pressaoBuff(characterName?: string): SceneEffect {
  return {
    id: PRESSAO_BUFF,
    name: 'Resistir à Pressão (+2 Perícias)',
    source: 'Rodada extra',
    description: `+2 em testes de perícia durante a rodada adicional de investigação${characterName ? ` (coordenado por ${characterName})` : ''}`,
    modifiers: [{ id: 'mod-resistir-pressao', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
  };
}

function ResistirAPressao(p: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allies, setAllies] = useState<Array<{ id: string; name: string; username?: string }>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const effs = p.sheet.sceneEffects || [];
  const buffActive = effs.some((e) => e.id === PRESSAO_BUFF);
  const used = usedInScene(p, PRESSAO_USED);

  async function openDialog() {
    setOpen(true);
    if (!p.isInCampaign || !p.campaignId) {
      setAllies([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCampaignTradeTargets(p.campaignId);
      const list = (data.characters || [])
        .filter((c: any) => c.id !== p.characterId)
        .map((c: any) => ({ id: c.id, name: c.name, username: c.owner?.username }));
      setAllies(list);
      setSelected(Object.fromEntries(list.map((a) => [a.id, true])));
    } catch (err: any) {
      setAllies([]);
      p.onFeedback(`Erro ao buscar aliados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    const buff = pressaoBuff(p.characterName);
    if (!p.onSpendResource(5, buff)) return;
    if (p.isInCampaign) {
      p.onAddSceneEffect?.({
        id: PRESSAO_USED,
        name: 'Resistir à Pressão (Usado na Cena)',
        source: '1x/Cena de investigação',
        description: 'Urgência da investigação aumentada em 1 rodada',
      });
    }
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (p.isInCampaign && p.campaignId && ids.length > 0) {
      try {
        await applyCampaignSceneEffect(p.campaignId, ids, buff);
      } catch (err) {
        console.error('Erro ao aplicar Resistir à Pressão nos aliados:', err);
      }
    }
    setOpen(false);
    p.onFeedback(
      `Resistir à Pressão (-5 PE): +1 rodada de urgência e +2 em perícias para você${
        ids.length > 0 ? ` e ${ids.length} aliado${ids.length > 1 ? 's' : ''}` : ''
      } nesta rodada.`
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {buffActive && (
        <button
          type="button"
          className={SAH_BTN_ACTIVE}
          title="Remove o +2 quando a rodada adicional terminar"
          onClick={() => {
            p.onUpdateSceneEffects?.(effs.filter((e) => e.id !== PRESSAO_BUFF));
            p.onFeedback('Resistir à Pressão: rodada adicional encerrada (+2 removido).');
          }}
        >
          ✓ Rodada extra (+2 Perícias) • Encerrar
        </button>
      )}
      {used ? (
        !buffActive && <span className={SAH_USED}>✓ Usado na cena</span>
      ) : (
        <button type="button" className={SAH_BTN_AMBER} onClick={openDialog}>
          <Icon name="hourglass" /> Coordenar equipe (-5 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
        </button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Resistir à Pressão"
        description="A urgência da investigação aumenta em 1 rodada. Nela, todos os personagens (incluindo você) recebem +2 em testes de perícia."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="trpg-btn-primary" onClick={confirm}>
              Coordenar (-5 PE)
            </button>
          </>
        }
      >
        {!p.isInCampaign ? (
          <p className="text-sm text-zinc-400">Fora de uma mesa, o bônus vale só para você.</p>
        ) : loading ? (
          <p className="text-sm text-zinc-400">Carregando aliados da mesa...</p>
        ) : allies.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhum outro personagem na mesa. O bônus vale só para você.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-500">Você sempre recebe o bônus. Aliados que também recebem:</p>
            {allies.map((a) => (
              <label
                key={a.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  selected[a.id] ? 'border-amber-500/70 bg-amber-950/20' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-amber-500"
                  checked={Boolean(selected[a.id])}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-100 truncate">{a.name}</span>
                  {a.username && <span className="block text-xs text-zinc-500">@{a.username}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Especialista Diletante: aprende 1 poder de Combatente ou Ocultista

const OTHER_CLASS_PREFIXES = ['ord-pwr-comb-', 'sah-pwr-comb-', 'ord-pwr-ocu-', 'sah-pwr-ocu-'];

function isOtherClassPower(e: CompendiumEntryData): boolean {
  if (e.category !== 'power') return false;
  const req = (e.metadata?.requirements || '').toLowerCase();
  if (req.includes('especialista')) return false;
  return OTHER_CLASS_PREFIXES.some((pre) => e.id.startsWith(pre)) || req.includes('combatente') || req.includes('ocultista');
}

function EspecialistaDiletante(p: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const learned = p.abilities.find((a) => a.grantedBy === DILETANTE_GRANT);

  const candidates = useMemo(() => {
    if (!open) return [];
    const pool = p.compendiumEntries.length > 0 ? p.compendiumEntries : ORDEM_COMPENDIUM_ENTRIES;
    const owned = new Set(p.abilities.map((a) => a.name.trim().toLowerCase()));
    const q = query.trim().toLowerCase();
    return pool
      .filter(
        (e) =>
          e.system === 'ordem-paranormal' &&
          isOtherClassPower(e) &&
          !owned.has(e.name.trim().toLowerCase()) &&
          matchesContentSourceFilter(resolveEntrySourceId(e, 'ordem-paranormal'), [], p.allowedSources, 'ordem-paranormal') &&
          (!q || e.name.toLowerCase().includes(q))
      )
      .map((e) => ({ entry: e, check: checkOrdemPowerRequirements(e, p.sheet, p.abilities, { ignoreClass: true }) }))
      .sort((a, b) => Number(b.check.met) - Number(a.check.met) || a.entry.name.localeCompare(b.entry.name, 'pt-BR'));
  }, [open, query, p.compendiumEntries, p.abilities, p.sheet, p.allowedSources]);

  function learn(entry: CompendiumEntryData) {
    const isPassive = entry.cost === 0 && !entry.metadata?.damageFormula;
    const newAb: CharacterAbility = {
      id: `${entry.id}-dil-${Math.random().toString(36).slice(2, 8)}`,
      name: entry.name,
      category: 'poder',
      cost: entry.cost,
      description: entry.description,
      damageFormula: entry.metadata?.damageFormula,
      isActive: isPassive,
      sourceId: resolveEntrySourceId(entry, 'ordem-paranormal'),
      grantedBy: DILETANTE_GRANT,
      modifiers: entry.modifiers || [],
    };
    p.onUpdateAbilities([...p.abilities.filter((a) => a.grantedBy !== DILETANTE_GRANT), newAb]);
    p.onFeedback(`Especialista Diletante: aprendeu ${entry.name}.`);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {learned ? (
        <span className="text-xs text-zinc-300">
          Poder aprendido: <strong className="text-zinc-100">{learned.name}</strong>
        </span>
      ) : (
        <button type="button" className={SAH_BTN_AMBER} onClick={() => { setQuery(''); setOpen(true); }}>
          <Icon name="book" /> Escolher poder de outra classe
        </button>
      )}
      {learned && p.isEditMode && (
        <button type="button" className={SAH_BTN_NEUTRAL} onClick={() => { setQuery(''); setOpen(true); }}>
          Trocar
        </button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Especialista Diletante"
        description="Escolha um poder de Combatente ou Ocultista (exceto trilha ou paranormal) cujos pré-requisitos você cumpra."
      >
        <div className="flex flex-col gap-3">
          <input
            type="search"
            className="trpg-input"
            placeholder="Buscar poder"
            aria-label="Buscar poder"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {candidates.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum poder encontrado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map(({ entry, check }) => (
                <li
                  key={entry.id}
                  className={`p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
                    check.met ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-800/60 bg-zinc-950/50 opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-zinc-100">{entry.name}</span>
                      <SourceTagBadge sourceId={resolveEntrySourceId(entry, 'ordem-paranormal')} system="ordem-paranormal" />
                      {entry.cost > 0 && <span className="trpg-badge trpg-num">{entry.cost} PE</span>}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{entry.description}</p>
                    {!check.met && (
                      <p className="text-xs text-red-300 mt-1">Falta: {check.missing.join(', ')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="trpg-btn-secondary trpg-btn-sm"
                    disabled={!check.met}
                    onClick={() => learn(entry)}
                  >
                    Aprender
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flashback: recebe o poder de uma segunda origem

function Flashback(p: Props) {
  const [open, setOpen] = useState(false);
  const [originId, setOriginId] = useState('');
  const [skillChoice, setSkillChoice] = useState('');
  const [ritualId, setRitualId] = useState('ord-rit-amaldicoar-tecnologia');
  const [luckyNumber, setLuckyNumber] = useState(1);

  const mainNorm = (p.sheet.origin || '').trim().toLowerCase();
  const mainId = ORDEM_ORIGINS.find((o) => o.id === mainNorm || o.name.toLowerCase() === mainNorm)?.id;
  const currentId = p.sheet.originMeta?.flashbackOriginId;
  const current = currentId ? ORDEM_ORIGINS.find((o) => o.id === currentId) : undefined;

  const options = ORDEM_ORIGINS.filter(
    (o) =>
      o.id !== mainId &&
      matchesContentSourceFilter(o.sourceId || 'ordem-base', [], p.allowedSources, 'ordem-paranormal')
  ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const chosen = ORDEM_ORIGINS.find((o) => o.id === originId);

  const rituals = useMemo(
    () =>
      ORDEM_COMPENDIUM_ENTRIES.filter(
        (e) =>
          e.category === 'spell' &&
          (e.metadata?.circle || 1) === 1 &&
          matchesContentSourceFilter(resolveEntrySourceId(e, 'ordem-paranormal'), [], p.allowedSources, 'ordem-paranormal')
      ),
    [p.allowedSources]
  );

  function openDialog() {
    setOriginId(currentId || '');
    setSkillChoice('');
    setOpen(true);
  }

  function confirm() {
    if (!chosen) return;
    const meta: Partial<OrdemOriginMeta> = {};
    if (chosen.id === 'amigo_animais') meta.amigoAnimaisSkillId = skillChoice || 'percepcao';
    if (chosen.id === 'experimento') meta.experimentoSkillId = skillChoice || 'atletismo';
    if (chosen.id === 'jovem_mistico') meta.luckyNumber = luckyNumber;
    p.onApplyFlashback?.({
      originId: chosen.id,
      meta,
      inventorRitualId: chosen.grantsParanormalInvention ? ritualId : undefined,
    });
    p.onFeedback(`Flashback: recebeu ${chosen.powerName} (Poder de ${chosen.name}).`);
    setOpen(false);
  }

  const skillOptions =
    chosen?.requiresOriginSkillBonusChoice === 'physical'
      ? ORDEM_SKILLS_METADATA.filter((s) => ['for', 'agi', 'vig'].includes(s.attribute))
      : ORDEM_SKILLS_METADATA;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {current ? (
        <span className="text-xs text-zinc-300">
          Origem do flashback: <strong className="text-zinc-100">{current.name}</strong> ({current.powerName})
        </span>
      ) : (
        <button type="button" className={SAH_BTN_AMBER} onClick={openDialog}>
          <Icon name="undo" /> Escolher origem
        </button>
      )}
      {current && p.isEditMode && (
        <button type="button" className={SAH_BTN_NEUTRAL} onClick={openDialog}>
          Trocar
        </button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="Flashback"
        description="Escolha uma origem que não seja a sua. Você recebe o poder dela."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="trpg-btn-primary" disabled={!chosen} onClick={confirm}>
              Receber poder
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="trpg-label">Origem</span>
            <select className="trpg-input" value={originId} onChange={(e) => { setOriginId(e.target.value); setSkillChoice(''); }}>
              <option value="">Escolha uma origem</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}: {o.powerName}
                  {o.powerCost > 0 ? ` (${o.powerCost} PE)` : ''}
                </option>
              ))}
            </select>
          </label>

          {chosen && (
            <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-zinc-100">{chosen.powerName}</span>
                <SourceTagBadge sourceId={chosen.sourceId} system="ordem-paranormal" />
              </div>
              <p className="text-xs text-zinc-400">{chosen.powerDescription}</p>
              <p className="text-xs text-zinc-500">
                Só o poder: as perícias treinadas da origem não vêm junto.
              </p>
            </div>
          )}

          {chosen?.requiresOriginSkillBonusChoice && (
            <label className="flex flex-col gap-1.5">
              <span className="trpg-label">
                {chosen.id === 'experimento' ? 'Perícia física com +2 (Mutação)' : 'Perícia com +2 (Companheiro Animal)'}
              </span>
              <select className="trpg-input" value={skillChoice} onChange={(e) => setSkillChoice(e.target.value)}>
                <option value="">{chosen.id === 'experimento' ? 'Atletismo (padrão)' : 'Percepção (padrão)'}</option>
                {skillOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {chosen?.grantsParanormalInvention && (
            <label className="flex flex-col gap-1.5">
              <span className="trpg-label">Ritual de 1º círculo do Invento Paranormal</span>
              <select className="trpg-input" value={ritualId} onChange={(e) => setRitualId(e.target.value)}>
                {rituals.flatMap((rit) =>
                  rit.id === 'ord-rit-amaldicoar-arma'
                    ? (['Sangue', 'Morte', 'Conhecimento', 'Energia'] as const).map((el) => (
                        <option key={`${rit.id}:${el}`} value={`${rit.id}:${el}`}>
                          Amaldiçoar Arma — {el}
                        </option>
                      ))
                    : [
                        <option key={rit.id} value={rit.id}>
                          {rit.name} ({rit.metadata?.element || 'Paranormal'})
                        </option>,
                      ]
                )}
              </select>
            </label>
          )}

          {chosen?.id === 'jovem_mistico' && (
            <div className="flex flex-col gap-1.5">
              <span className="trpg-label">Número da sorte</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={luckyNumber === n}
                    onClick={() => setLuckyNumber(n)}
                    className={`w-10 h-10 rounded-lg border text-sm font-bold trpg-num cursor-pointer ${
                      luckyNumber === n
                        ? 'border-amber-500 bg-amber-950/40 text-zinc-100'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
