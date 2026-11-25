import { useState } from 'react';
import { CharacterAbility, SceneEffect } from '@totalrpg/shared';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { applyCampaignSceneEffect, fetchCampaignTradeTargets } from '../../services/api';
import {
  SAH_BTN_ACTIVE,
  SAH_BTN_AMBER,
  SAH_USED,
  SahPowerProps,
  attrValue,
  hasSceneEffect,
  matchSahPower,
  rollSkill,
  skillRollParts,
  usedInScene,
} from './sahPowerKit';

/**
 * Poderes de Combatente do suplemento Sobrevivendo ao Horror (p. 14-15).
 * Com efeito automático em outro lugar (sem botão aqui):
 * - Apego Angustiado: regra de 0 PV (dyingRules.ts) e selo na ficha;
 * - Engolir o Choro: ruleEngine.ts;
 * - Mochileiro: carga/vestimentas (ordemEquipmentData.ts) e selo na ficha;
 * - Valentão: FOR em Intimidação na lista de perícias (OrdemSheet.tsx) + botão de Assustar aqui.
 * Caminho para Forca é só descritivo.
 */
const PREFIX = 'sah-pwr-comb-';
const CONTROLLED = [
  { slug: 'ciente-das-cicatrizes', name: 'ciente das cicatrizes' },
  { slug: 'correria-desesperada', name: 'correria desesperada' },
  { slug: 'instinto-de-fuga', name: 'instinto de fuga' },
  { slug: 'paranoia-defensiva', name: 'paranoia defensiva' },
  { slug: 'sacrificar-os-joelhos', name: 'sacrificar os joelhos' },
  { slug: 'sem-tempo-irmao', name: 'sem tempo, irm' },
  { slug: 'valentao', name: 'valent' },
];

/** Usado por `hasDedicatedControlElsewhere` para não mostrar o botão genérico "Usar". */
export function isSahCombatenteControlled(ab: CharacterAbility): boolean {
  return matchSahPower(ab, PREFIX, CONTROLLED) !== null;
}

type Props = SahPowerProps;

export function SahCombatentePowerControls(props: Props) {
  switch (matchSahPower(props.ab, PREFIX, CONTROLLED)) {
    case 'ciente-das-cicatrizes':
      return <CienteDasCicatrizes {...props} />;
    case 'correria-desesperada':
      return <CorreriaDesesperada {...props} />;
    case 'instinto-de-fuga':
      return <InstintoDeFuga {...props} />;
    case 'paranoia-defensiva':
      return <ParanoiaDefensiva {...props} />;
    case 'sacrificar-os-joelhos':
      return <SacrificarOsJoelhos {...props} />;
    case 'sem-tempo-irmao':
      return <SemTempoIrmao {...props} />;
    case 'valentao':
      return <Valentao {...props} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

function CienteDasCicatrizes(p: Props) {
  const trained = (id: string) => (p.sheet.skills.find((s) => s.id === id)?.trainingDegree || 0) >= 5;
  const luta = trained('luta');
  const pontaria = trained('pontaria');
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(luta || !pontaria) && (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => rollSkill(p, 'luta', 'Ciente das Cicatrizes (Pista c/ Luta)')}
        >
          <Icon name="search" /> Pista c/ Luta
        </button>
      )}
      {(pontaria || !luta) && (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => rollSkill(p, 'pontaria', 'Ciente das Cicatrizes (Pista c/ Pontaria)')}
        >
          <Icon name="search" /> Pista c/ Pontaria
        </button>
      )}
    </div>
  );
}

function CorreriaDesesperada(p: Props) {
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      onClick={() => rollSkill(p, 'atletismo', 'Correria Desesperada — Fugir (+1d20)', { extraDice: 1 })}
    >
      <Icon name="d20" /> Fugir: Atletismo (+1d20)
    </button>
  );
}

const INSTINTO_ID = 'pwr-scene-instinto-fuga';

function InstintoDeFuga(p: Props) {
  const effs = p.sheet.sceneEffects || [];
  if (hasSceneEffect(p, INSTINTO_ID)) {
    return (
      <button
        type="button"
        className={SAH_BTN_ACTIVE}
        onClick={() => {
          p.onUpdateSceneEffects?.(effs.filter((e) => e.id !== INSTINTO_ID));
          p.onFeedback('Instinto de Fuga encerrado (+2 em perícias removido).');
        }}
      >
        ✓ Em perseguição (+2 Perícias) • Encerrar
      </button>
    );
  }
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      onClick={() => {
        p.onAddSceneEffect?.({
          id: INSTINTO_ID,
          name: 'Instinto de Fuga',
          source: 'Cena de Perseguição',
          description: '+2 em todos os testes de perícia durante a cena',
          modifiers: [{ id: 'mod-instinto-fuga-all', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
        });
        p.onFeedback('Instinto de Fuga ativado: +2 em todos os testes de perícia na cena!');
      }}
    >
      <Icon name="footprints" /> Cena de perseguição (+2 Perícias)
    </button>
  );
}

function SacrificarOsJoelhos(p: Props) {
  const SCENE_ID = 'pwr-scene-sacrificar-joelhos';
  if (usedInScene(p, SCENE_ID)) return <span className={SAH_USED}>✓ Usado na perseguição</span>;
  return (
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
                  name: 'Sacrificar os Joelhos (Usado na Cena)',
                  source: '1x/Cena',
                  description: 'Sucesso automático em Esforço Extra na perseguição',
                }
              : undefined
          )
        ) {
          return;
        }
        p.onFeedback('Sacrificar os Joelhos (-2 PE): sucesso automático no teste de Esforço Extra!');
      }}
    >
      <Icon name="zap" /> Esforço Extra automático (-2 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
    </button>
  );
}

function SemTempoIrmao(p: Props) {
  const SCENE_ID = 'pwr-scene-sem-tempo-irmao';
  if (usedInScene(p, SCENE_ID)) return <span className={SAH_USED}>✓ Usado na investigação</span>;
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      onClick={() => {
        if (p.isInCampaign) {
          p.onAddSceneEffect?.({
            id: SCENE_ID,
            name: 'Sem Tempo, Irmão (Usado na Cena)',
            source: '1x/Cena',
            description:
              'Passou automaticamente em Facilitar Investigação (+1 rolagem na tabela de eventos de investigação)',
          });
        }
        p.onFeedback(
          'Sem Tempo, Irmão (0 PE): auxílio automático em Facilitar Investigação! Role +1 evento na tabela de investigação.'
        );
      }}
    >
      <Icon name="search" /> Facilitar Investigação automático (0 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
    </button>
  );
}

function Valentao(p: Props) {
  const SCENE_ID = 'pwr-scene-valentao-assustar';
  if (usedInScene(p, SCENE_ID)) return <span className={SAH_USED}>✓ Assustar livre usado na cena</span>;
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      onClick={() => {
        if (
          !p.onSpendResource(
            1,
            p.isInCampaign
              ? {
                  id: SCENE_ID,
                  name: 'Valentão — Assustar (Usado na Cena)',
                  source: '1x/Cena',
                  description: 'Teste de Intimidação para assustar feito como ação livre',
                }
              : undefined
          )
        ) {
          return;
        }
        // Valentão: Intimidação pode usar Força no lugar de Presença (o maior dos dois)
        const useFor = attrValue(p, 'for') >= attrValue(p, 'pre');
        const { dice, mod } = skillRollParts(p, 'intimidacao', { attr: useFor ? 'for' : 'pre' });
        p.onRoll(`Valentão — Assustar [Ação Livre • -1 PE${useFor ? ' • FOR' : ''}]`, dice, 20, mod);
      }}
    >
      <Icon name="d20" /> Assustar — ação livre (-1 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
    </button>
  );
}

// ---------------------------------------------------------------------------
// Paranoia Defensiva: +5 Defesa (próx. ataque) ou +5 em 1 perícia, para você e aliados

const PARANOIA_DEF = 'pwr-scene-paranoia-defensiva-def';
const PARANOIA_SKILL = 'pwr-scene-paranoia-defensiva-skill';
const PARANOIA_USED = 'pwr-scene-paranoia-defensiva-used';

function ParanoiaDefensiva(p: Props) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<'defense' | 'skill'>('defense');
  const [loading, setLoading] = useState(false);
  const [allies, setAllies] = useState<Array<{ id: string; name: string; username?: string }>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const effs = p.sheet.sceneEffects || [];
  const used = usedInScene(p, PARANOIA_USED);

  async function openDialog() {
    setChoice('defense');
    setOpen(true);
    if (!p.isInCampaign || !p.campaignId) {
      setAllies([]);
      setSelected({});
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
    if (usedInScene(p, PARANOIA_USED)) {
      setOpen(false);
      return;
    }
    const selfEffect: SceneEffect =
      choice === 'defense'
        ? {
            id: PARANOIA_DEF,
            name: 'Paranoia Defensiva (+5 Defesa)',
            source: 'Próx. Ataque',
            description: '+5 na Defesa contra o próximo ataque sofrido nesta cena',
            modifiers: [{ id: 'mod-paranoia-def', targetType: 'defense', targetKey: 'defense', value: 5 }],
          }
        : {
            id: PARANOIA_SKILL,
            name: 'Paranoia Defensiva (+5 Perícia)',
            source: '1 Teste na Cena',
            description: '+5 em um único teste de perícia feito até o fim da cena',
            modifiers: [{ id: 'mod-paranoia-skill', targetType: 'skill_bonus', targetKey: 'all', value: 5 }],
          };
    if (!p.onSpendResource(3, selfEffect)) return;
    if (p.isInCampaign) {
      p.onAddSceneEffect?.({
        id: PARANOIA_USED,
        name: 'Paranoia Defensiva (Usado na Cena)',
        source: '1x/Cena',
        description: 'Já utilizado nesta cena (1 rodada, -3 PE)',
      });
    }
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (p.isInCampaign && p.campaignId && ids.length > 0) {
      try {
        await applyCampaignSceneEffect(p.campaignId, ids, {
          id: 'pwr-scene-paranoia-defensiva-ally',
          name: 'Paranoia Defensiva (Aliado)',
          source: 'Cena',
          description: `Concedido por ${p.characterName || 'Combatente'}: escolha +5 Defesa no próximo ataque OU +5 em 1 teste de perícia na cena`,
        });
      } catch (err) {
        console.error('Erro ao aplicar Paranoia Defensiva em aliados:', err);
      }
    }
    setOpen(false);
    p.onFeedback(
      `Paranoia Defensiva ativada (-3 PE): você recebeu ${
        choice === 'defense' ? '+5 na Defesa (próximo ataque)' : '+5 no próximo teste de perícia'
      }${ids.length > 0 ? ` e ${ids.length} aliado(s) notificado(s)` : ''}!`
    );
  }

  const consume = (id: string, msg: string) => {
    p.onUpdateSceneEffects?.(effs.filter((e) => e.id !== id));
    p.onFeedback(msg);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasSceneEffect(p, PARANOIA_DEF) && (
        <button
          type="button"
          className={SAH_BTN_ACTIVE}
          onClick={() => consume(PARANOIA_DEF, 'Paranoia Defensiva: +5 Defesa consumido após o ataque.')}
        >
          Consumir +5 Defesa
        </button>
      )}
      {hasSceneEffect(p, PARANOIA_SKILL) && (
        <button
          type="button"
          className={SAH_BTN_ACTIVE}
          onClick={() => consume(PARANOIA_SKILL, 'Paranoia Defensiva: +5 em Perícia consumido.')}
        >
          Consumir +5 Perícia
        </button>
      )}
      {used ? (
        <span className={SAH_USED}>✓ Usado na cena</span>
      ) : (
        <button type="button" className={SAH_BTN_AMBER} onClick={openDialog}>
          <Icon name="shield" /> Paranoia Defensiva (-3 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
        </button>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Paranoia Defensiva"
        description="Gasta 1 rodada e 3 PE (1x/cena). Você e cada aliado escolhem +5 na Defesa contra o próximo ataque ou +5 em 1 teste de perícia."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="trpg-btn-primary" disabled={loading} onClick={confirm}>
              <Icon name="shield" /> Ativar (-3 PE)
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="trpg-label">Sua escolha</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Sua escolha">
              {(
                [
                  ['defense', '+5 na Defesa', 'Contra o próximo ataque sofrido'],
                  ['skill', '+5 em 1 perícia', 'Em um único teste até o fim da cena'],
                ] as const
              ).map(([key, title, hint]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={choice === key}
                  onClick={() => setChoice(key)}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                    choice === key
                      ? 'border-amber-500 bg-amber-950/40 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-zinc-500 mt-0.5">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          {p.isInCampaign && (
            <div className="flex flex-col gap-2">
              <span className="trpg-label">Aliados presentes na cena</span>
              {loading ? (
                <p className="text-sm text-zinc-400">Carregando aliados...</p>
              ) : allies.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum outro aliado encontrado na mesa.</p>
              ) : (
                allies.map((a) => (
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
                ))
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
