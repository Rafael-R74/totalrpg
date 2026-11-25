import { useState } from 'react';
import { CharacterAbility, SceneEffect, getOrdemOcultismoAttr } from '@totalrpg/shared';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { applyCampaignSceneEffect, fetchCampaignTradeTargets } from '../../services/api';
import {
  SAH_BTN_ACTIVE,
  SAH_BTN_AMBER,
  SAH_BTN_NEUTRAL,
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
 * Poderes de Ocultista do suplemento Sobrevivendo ao Horror (p. 26-27).
 * Com efeito automático em outro lugar:
 * - Olhar Sinistro: Presença em Ocultismo na lista de perícias, no Custo do Paranormal e nas manobras
 *   (getOrdemOcultismoAttr, sahRules.ts) + botão de coagir aqui;
 * - Domínio Esotérico: até 2 catalisadores na barra "Modificadores de Conjuração" (aba Rituais).
 */
const PREFIX = 'sah-pwr-ocu-';
const CONTROLLED = [
  { slug: 'deixe-os-sussurros-guiarem', name: 'deixe os sussurros guiarem' },
  { slug: 'dominio-esoterico', name: 'domínio esotérico' },
  { slug: 'estalos-macabros', name: 'estalos macabros' },
  { slug: 'minha-dor-me-impulsiona', name: 'minha dor me impulsiona' },
  { slug: 'nos-olhos-do-monstro', name: 'nos olhos do monstro' },
  { slug: 'olhar-sinistro', name: 'olhar sinistro' },
  { slug: 'sentido-premonitorio', name: 'sentido premonitório' },
  { slug: 'sincronia-paranormal', name: 'sincronia paranormal' },
  { slug: 'tracado-conjuratorio', name: 'traçado conjuratório' },
];

/** Usado por `hasDedicatedControlElsewhere` para não mostrar o botão genérico "Usar". */
export function isSahOcultistaControlled(ab: CharacterAbility): boolean {
  return matchSahPower(ab, PREFIX, CONTROLLED) !== null;
}

type Props = SahPowerProps;

export function SahOcultistaPowerControls(props: Props) {
  switch (matchSahPower(props.ab, PREFIX, CONTROLLED)) {
    case 'deixe-os-sussurros-guiarem':
      return <SussurrosGuiarem {...props} />;
    case 'dominio-esoterico':
      return (
        <span className="text-xs text-zinc-400">
          Até 2 catalisadores diferentes por ritual (aba Rituais)
        </span>
      );
    case 'estalos-macabros':
      return <EstalosMacabros {...props} />;
    case 'minha-dor-me-impulsiona':
      return <MinhaDor {...props} />;
    case 'nos-olhos-do-monstro':
      return <NosOlhosDoMonstro {...props} />;
    case 'olhar-sinistro':
      return <OlharSinistro {...props} />;
    case 'sentido-premonitorio':
      return <SentidoPremonitorio {...props} />;
    case 'sincronia-paranormal':
      return <SincroniaParanormal {...props} />;
    case 'tracado-conjuratorio':
      return <TracadoConjuratorio {...props} />;
    default:
      return null;
  }
}

/** Ocultismo com o atributo certo (Presença, se tiver Olhar Sinistro e ela for maior). */
function ocultismoAttr(p: Props) {
  return getOrdemOcultismoAttr(p.abilities, attrValue(p, 'int'), attrValue(p, 'pre')).attr;
}

function removeEffects(p: Props, ids: string[]) {
  p.onUpdateSceneEffects?.((p.sheet.sceneEffects || []).filter((e) => !ids.includes(e.id)));
}

// ---------------------------------------------------------------------------

const SUSSURROS_ID = 'pwr-scene-sussurros-guiarem';
const SUSSURROS_USED = 'pwr-scene-sussurros-guiarem-used';

function SussurrosGuiarem(p: Props) {
  if (hasSceneEffect(p, SUSSURROS_ID)) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`${SAH_BTN_NEUTRAL} text-purple-200 border-purple-700`}
          title="Sempre que falhar em um teste de perícia com o poder ativo, perde 1 SAN"
          onClick={() => {
            p.onLoseSanity?.(1, 'Deixe os Sussurros Guiarem (falhou em teste de perícia)');
            p.onFeedback('Deixe os Sussurros Guiarem: falhou no teste, -1 SAN.');
          }}
        >
          <Icon name="brain" /> Falhei num teste (-1 SAN)
        </button>
        <button
          type="button"
          className={SAH_BTN_ACTIVE}
          onClick={() => {
            removeEffects(p, [SUSSURROS_ID]);
            p.onFeedback('Deixe os Sussurros Guiarem encerrado.');
          }}
        >
          ✓ Sussurros ativos (+2) • Encerrar
        </button>
      </div>
    );
  }
  if (usedInScene(p, SUSSURROS_USED)) return <span className={SAH_USED}>✓ Usado na cena</span>;
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="1 rodada. +2 em testes de perícia para investigação até o fim da cena; cada falha custa 1 SAN"
      onClick={() => {
        if (
          !p.onSpendResource(2, {
            id: SUSSURROS_ID,
            name: 'Deixe os Sussurros Guiarem (+2 Investigação)',
            source: 'Cena',
            description: '+2 em testes de perícia para investigação. Cada teste de perícia falho custa 1 SAN.',
            modifiers: [{ id: 'mod-sussurros-guiarem', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
          })
        ) {
          return;
        }
        if (p.isInCampaign) {
          p.onAddSceneEffect?.({
            id: SUSSURROS_USED,
            name: 'Deixe os Sussurros Guiarem (Usado na Cena)',
            source: '1x/Cena',
            description: 'Já utilizado nesta cena',
          });
        }
        p.onFeedback('Deixe os Sussurros Guiarem (-2 PE): +2 em perícias para investigar. Cada falha custa 1 SAN.');
      }}
    >
      <Icon name="conhecimento" /> Ouvir os sussurros (-2 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
    </button>
  );
}

function EstalosMacabros(p: Props) {
  const roll = (vsLiving: boolean) => {
    if (!p.onSpendResource(1)) return;
    rollSkill(p, 'ocultismo', `Estalos Macabros: distrair c/ Ocultismo${vsLiving ? ' (pessoa/animal +5)' : ''}`, {
      attr: ocultismoAttr(p),
      extraMod: vsLiving ? 5 : 0,
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={SAH_BTN_AMBER}
        title="Distrair em cena de furtividade, fintar em combate etc., usando Ocultismo"
        onClick={() => roll(false)}
      >
        <Icon name="d20" /> Distrair c/ Ocultismo (-1 PE)
      </button>
      <button type="button" className={SAH_BTN_AMBER} onClick={() => roll(true)}>
        <Icon name="d20" /> Contra pessoa ou animal +5 (-1 PE)
      </button>
    </div>
  );
}

function MinhaDor(p: Props) {
  const wounded = (p.pvDamageTaken || 0) >= 5;
  const skills: Array<[string, string]> = [
    ['acrobacia', 'Acrobacia'],
    ['atletismo', 'Atletismo'],
    ['furtividade', 'Furtividade'],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {skills.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={SAH_BTN_AMBER}
          disabled={!wounded}
          title={wounded ? undefined : 'Precisa ter sofrido pelo menos 5 de dano nos PV'}
          style={wounded ? undefined : { opacity: 0.45, cursor: 'not-allowed' }}
          onClick={() => {
            if (!wounded || !p.onSpendResource(1)) return;
            const { dice, mod } = skillRollParts(p, id);
            p.onRoll(`Minha Dor me Impulsiona: ${label} (+1d6)`, dice, 20, mod, [
              { count: 1, sides: 6, label: 'Minha Dor me Impulsiona' },
            ]);
          }}
        >
          <Icon name="d20" /> {label} +1d6 (-1 PE)
        </button>
      ))}
      {!wounded && <span className="text-xs text-zinc-500">Liberado com 5+ de dano nos PV</span>}
    </div>
  );
}

const OLHOS_ID = 'pwr-scene-nos-olhos-do-monstro';

function NosOlhosDoMonstro(p: Props) {
  if (hasSceneEffect(p, OLHOS_ID)) {
    return (
      <button
        type="button"
        className={SAH_BTN_ACTIVE}
        onClick={() => {
          removeEffects(p, [OLHOS_ID]);
          p.onFeedback('Nos Olhos do Monstro encerrado.');
        }}
      >
        ✓ Encarando a criatura (+5) • Encerrar
      </button>
    );
  }
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="1 rodada. +5 em testes contra a criatura (exceto ataque) até o fim da cena"
      onClick={() => {
        if (
          !p.onSpendResource(3, {
            id: OLHOS_ID,
            name: 'Nos Olhos do Monstro',
            source: 'Cena',
            description: '+5 em testes contra a criatura encarada (exceto testes de ataque) até o fim da cena',
          })
        ) {
          return;
        }
        p.onFeedback('Nos Olhos do Monstro (-3 PE): some +5 nos testes contra essa criatura (exceto ataques) até o fim da cena.');
      }}
    >
      <Icon name="eye" /> Encarar a criatura (-3 PE)
    </button>
  );
}

function OlharSinistro(p: Props) {
  const usingPre = ocultismoAttr(p) === 'pre';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        className={SAH_BTN_AMBER}
        title="Coagir (como em Intimidação) usando Ocultismo"
        onClick={() =>
          rollSkill(p, 'ocultismo', `Olhar Sinistro: coagir c/ Ocultismo${usingPre ? ' (PRE)' : ''}`, {
            attr: ocultismoAttr(p),
          })
        }
      >
        <Icon name="d20" /> Coagir c/ Ocultismo
      </button>
      <span className="text-xs text-zinc-500">
        {usingPre ? 'Ocultismo já usa Presença na ficha' : 'Ocultismo usa Presença quando ela for maior que Intelecto'}
      </span>
    </div>
  );
}

const PREMONICAO_ID = 'pwr-scene-sentido-premonitorio';

function SentidoPremonitorio(p: Props) {
  if (hasSceneEffect(p, PREMONICAO_ID)) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={SAH_BTN_AMBER}
          title="Pague no início de cada rodada para manter o sentido"
          onClick={() => {
            if (!p.onSpendResource(1)) return;
            p.onFeedback('Sentido Premonitório mantido nesta rodada (-1 PE).');
          }}
        >
          <Icon name="refresh" /> Manter nesta rodada (-1 PE)
        </button>
        <button
          type="button"
          className={SAH_BTN_ACTIVE}
          onClick={() => {
            removeEffects(p, [PREMONICAO_ID]);
            p.onFeedback('Sentido Premonitório desativado.');
          }}
        >
          ✓ Sentido ativo • Desativar
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Sem efeito em combate. Mantê-lo custa 1 PE no início de cada rodada"
      onClick={() => {
        if (
          !p.onSpendResource(3, {
            id: PREMONICAO_ID,
            name: 'Sentido Premonitório',
            source: 'Ativo (1 PE/rodada)',
            description:
              'Déjà vu de uma rodada à frente: urgência e eventos da investigação, ações dos inimigos em furtividade e perseguição. Sem efeito em combate.',
          })
        ) {
          return;
        }
        p.onFeedback('Sentido Premonitório ativado (-3 PE). Pague 1 PE no início de cada rodada para mantê-lo.');
      }}
    >
      <Icon name="hourglass" /> Ativar sentido (-3 PE)
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sincronia Paranormal: participantes recebem dados de bônus distribuídos a cada rodada

const SINCRONIA_SELF = 'pwr-scene-sincronia-paranormal';
const SINCRONIA_ALLY = 'pwr-scene-sincronia-paranormal-aliado';

function SincroniaParanormal(p: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allies, setAllies] = useState<Array<{ id: string; name: string; username?: string }>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const pre = Math.max(0, attrValue(p, 'pre'));
  const self = (p.sheet.sceneEffects || []).find((e) => e.id === SINCRONIA_SELF);
  const linkedIds: string[] = (self as any)?.linkedCharacterIds || [];

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
    const ids = Object.keys(selected).filter((id) => selected[id]);
    const selfEffect: SceneEffect & { linkedCharacterIds?: string[] } = {
      id: SINCRONIA_SELF,
      name: 'Sincronia Paranormal',
      source: 'Ativa (1 PE/rodada)',
      description: `No início de cada rodada, distribua ${pre}d20 de bônus entre os participantes (testes de INT ou PRE; somem no fim da rodada).`,
      linkedCharacterIds: ids,
    };
    if (!p.onSpendResource(2, selfEffect)) return;
    if (p.isInCampaign && p.campaignId && ids.length > 0) {
      try {
        await applyCampaignSceneEffect(p.campaignId, ids, {
          id: SINCRONIA_ALLY,
          name: 'Sincronia Paranormal (Participante)',
          source: p.characterName || 'Ocultista',
          description: `Em sincronia com ${p.characterName || 'o ocultista'}: pode receber d20 de bônus em testes de perícias de INT ou PRE nesta rodada.`,
        });
      } catch (err) {
        console.error('Erro ao aplicar Sincronia Paranormal nos aliados:', err);
      }
    }
    setOpen(false);
    p.onFeedback(
      `Sincronia Paranormal (-2 PE)${ids.length ? ` com ${ids.length} aliado${ids.length > 1 ? 's' : ''}` : ''}: distribua ${pre}d20 a cada rodada. Manter custa 1 PE por rodada.`
    );
  }

  async function end() {
    removeEffects(p, [SINCRONIA_SELF]);
    if (p.isInCampaign && p.campaignId && linkedIds.length > 0) {
      try {
        await applyCampaignSceneEffect(p.campaignId, linkedIds, undefined, SINCRONIA_ALLY);
      } catch (err) {
        console.error('Erro ao encerrar Sincronia Paranormal nos aliados:', err);
      }
    }
    p.onFeedback('Sincronia Paranormal encerrada.');
  }

  if (self) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-zinc-300">
          Distribua <strong className="text-zinc-100 trpg-num">{pre}d20</strong> nesta rodada (INT/PRE)
        </span>
        <button
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => {
            if (!p.onSpendResource(1)) return;
            p.onFeedback(`Sincronia mantida (-1 PE): distribua ${pre}d20 nesta rodada.`);
          }}
        >
          <Icon name="refresh" /> Manter nesta rodada (-1 PE)
        </button>
        <button type="button" className={SAH_BTN_ACTIVE} onClick={end}>
          ✓ Sincronia ativa • Encerrar
        </button>
      </div>
    );
  }

  return (
    <>
      <button type="button" className={SAH_BTN_AMBER} onClick={openDialog}>
        <Icon name="users" /> Estabelecer sincronia (-2 PE)
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Sincronia Paranormal"
        description={`Ação padrão. No início de cada rodada você distribui ${pre}d20 de bônus (sua Presença) entre os participantes, para testes de perícias de Intelecto ou Presença.`}
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="trpg-btn-primary" disabled={loading} onClick={confirm}>
              Estabelecer (-2 PE)
            </button>
          </>
        }
      >
        {!p.isInCampaign ? (
          <p className="text-sm text-zinc-400">Fora de uma mesa, a sincronia fica só registrada na sua ficha.</p>
        ) : loading ? (
          <p className="text-sm text-zinc-400">Carregando aliados da mesa...</p>
        ) : allies.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhum outro personagem na mesa.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-500">
              Em alcance médio e que já sobreviveram com você a um encontro paranormal:
            </p>
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Traçado Conjuratório: símbolo no chão até o fim da cena; bônus só enquanto estiver dentro

const SIMBOLO_ID = 'pwr-scene-tracado-simbolo';
const DENTRO_ID = 'pwr-scene-tracado-dentro';

const dentroEffect: SceneEffect = {
  id: DENTRO_ID,
  name: 'Traçado Conjuratório (dentro do símbolo)',
  source: 'Símbolo',
  description: '+2 em Ocultismo e testes de resistência; +2 na DT dos seus rituais',
  modifiers: [
    { id: 'mod-tracado-ocultismo', targetType: 'skill_bonus', targetKey: 'ocultismo', value: 2 },
    { id: 'mod-tracado-fortitude', targetType: 'skill_bonus', targetKey: 'fortitude', value: 2 },
    { id: 'mod-tracado-reflexos', targetType: 'skill_bonus', targetKey: 'reflexos', value: 2 },
    { id: 'mod-tracado-vontade', targetType: 'skill_bonus', targetKey: 'vontade', value: 2 },
    { id: 'mod-tracado-dt', targetType: 'ritual_dt', targetKey: 'ritual', value: 2 },
  ],
};

function TracadoConjuratorio(p: Props) {
  const effs = p.sheet.sceneEffects || [];
  const traced = hasSceneEffect(p, SIMBOLO_ID);
  const inside = hasSceneEffect(p, DENTRO_ID);

  if (!traced) {
    return (
      <button
        type="button"
        className={SAH_BTN_AMBER}
        title="Ação completa. O símbolo (1,5m) dura até o fim da cena"
        onClick={() => {
          if (
            !p.onSpendResource(1, {
              id: SIMBOLO_ID,
              name: 'Traçado Conjuratório (símbolo traçado)',
              source: 'Cena',
              description: 'Símbolo paranormal de 1,5m no chão até o fim da cena',
            })
          ) {
            return;
          }
          p.onAddSceneEffect?.(dentroEffect);
          p.onFeedback('Símbolo traçado (-1 PE): dentro dele, +2 em Ocultismo e resistências e +2 na DT dos rituais.');
        }}
      >
        <Icon name="sigil" /> Traçar símbolo (-1 PE)
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {inside ? (
        <button
          type="button"
          className={SAH_BTN_ACTIVE}
          title="Saiu do símbolo: os bônus param até você voltar"
          onClick={() => {
            p.onUpdateSceneEffects?.(effs.filter((e) => e.id !== DENTRO_ID));
            p.onFeedback('Fora do símbolo: bônus do Traçado Conjuratório suspensos.');
          }}
        >
          ✓ Dentro do símbolo (+2) • Sair
        </button>
      ) : (
        <button
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => {
            p.onAddSceneEffect?.(dentroEffect);
            p.onFeedback('De volta ao símbolo: +2 em Ocultismo e resistências e +2 na DT dos rituais.');
          }}
        >
          <Icon name="sigil" /> Voltar ao símbolo
        </button>
      )}
      <button
        type="button"
        className={SAH_BTN_NEUTRAL}
        onClick={() => {
          p.onUpdateSceneEffects?.(effs.filter((e) => e.id !== DENTRO_ID && e.id !== SIMBOLO_ID));
          p.onFeedback('Símbolo do Traçado Conjuratório apagado.');
        }}
      >
        Apagar símbolo
      </button>
    </div>
  );
}
