import { useState } from 'react';
import {
  CharacterAbility,
  ORDEM_SKILLS_METADATA,
  getOrdemSkillAttrOverride,
  hasDyingCondition,
} from '@totalrpg/shared';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { applyCampaignSceneEffect, fetchCampaignTradeTargets } from '../../services/api';
import {
  SAH_BTN_AMBER,
  SAH_BTN_NEUTRAL,
  SAH_USED,
  SahPowerProps,
  attrValue,
  matchSahPower,
  rollSkill,
  usedInScene,
} from './sahPowerKit';

/**
 * Poderes gerais do Sobrevivendo ao Horror (p. 33-36).
 * Automáticos em outro lugar (sem botão aqui):
 * - "Treina a perícia ou +2": applyGeneralPowerSkillGrants (sahRules.ts), ao entrar/sair da ficha;
 * - Atlético (+3m), Personalidade Esotérica (+3 PE), Vitalidade Reforçada, Vontade Inabalável: modificadores do compêndio;
 * - Observador (+INT em Intuição), Inventário Organizado (+INT carga, 0,5 -> 0,25), Racionalidade Inflexível
 *   (INT nos PE e em Vontade): ordemEquipmentData.ts / OrdemSheet.tsx / SheetContainer.tsx.
 * Os demais são descritivos.
 */
const PREFIX = 'sah-pwr-gen-';
const CONTROLLED = [
  { slug: 'foco-em-pericia', name: 'foco em perícia' },
  { slug: 'atraente', name: 'atraente' },
  { slug: 'estigmado', name: 'estigmado' },
  { slug: 'palavras-de-devocao', name: 'palavras de devoção' },
  { slug: 'resposta-rapida', name: 'resposta rápida' },
  { slug: 'rato-de-computador', name: 'rato de computador' },
  { slug: 'teimosia-obstinada', name: 'teimosia obstinada' },
  { slug: 'tenacidade', name: 'tenacidade' },
];

/** Usado por `hasDedicatedControlElsewhere` para não mostrar o botão genérico "Usar". */
export function isSahGeraisControlled(ab: CharacterAbility): boolean {
  return matchSahPower(ab, PREFIX, CONTROLLED) !== null;
}

type Props = SahPowerProps;

export function SahGeraisPowerControls(props: Props) {
  switch (matchSahPower(props.ab, PREFIX, CONTROLLED)) {
    case 'foco-em-pericia':
      return <FocoEmPericia {...props} />;
    case 'atraente':
      return <Atraente {...props} />;
    case 'estigmado':
      return <Estigmado {...props} />;
    case 'palavras-de-devocao':
      return <PalavrasDeDevocao {...props} />;
    case 'resposta-rapida':
      return <RespostaRapida {...props} />;
    case 'rato-de-computador':
      return <RatoDeComputador {...props} />;
    case 'teimosia-obstinada':
      return <TeimosiaObstinada {...props} />;
    case 'tenacidade':
      return <Tenacidade {...props} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

/** Foco em Perícia: escolhe uma perícia treinada (exceto Luta e Pontaria) e rola +1d20 nela. */
function FocoEmPericia(p: Props) {
  const ab = p.ab;
  const taken = new Set(
    p.abilities.filter((a) => a.id !== ab.id && a.chosenSkill && /foco em per/i.test(a.name)).map((a) => a.chosenSkill)
  );
  const options = p.sheet.skills
    .filter((s) => s.trainingDegree >= 5 && s.id !== 'luta' && s.id !== 'pontaria' && !taken.has(s.id))
    .map((s) => ({ id: s.id, name: ORDEM_SKILLS_METADATA.find((m) => m.id === s.id)?.name || s.id }));

  function choose(skillId: string) {
    const skillName = ORDEM_SKILLS_METADATA.find((m) => m.id === skillId)?.name || skillId;
    p.onUpdateAbilities(
      p.abilities.map((a) =>
        a.id === ab.id
          ? {
              ...a,
              chosenSkill: skillId,
              name: `Foco em Perícia (Geral) — ${skillName}`,
              isActive: true,
              modifiers: [{ id: `m-foco-${skillId}`, targetType: 'skill_dice', targetKey: skillId, value: 1 }],
            }
          : a
      )
    );
    p.onFeedback(`Foco em Perícia: +1d20 em ${skillName}.`);
  }

  if (ab.chosenSkill && !p.isEditMode) {
    return <span className="text-xs text-zinc-400">+1d20 nos testes desta perícia</span>;
  }
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-300">
      Perícia:
      <select
        className="trpg-input py-1! text-xs!"
        style={{ height: '2rem', width: 'auto' }}
        value={ab.chosenSkill || ''}
        onChange={(e) => e.target.value && choose(e.target.value)}
      >
        <option value="">Escolher perícia treinada</option>
        {ab.chosenSkill && !options.some((o) => o.id === ab.chosenSkill) && (
          <option value={ab.chosenSkill}>
            {ORDEM_SKILLS_METADATA.find((m) => m.id === ab.chosenSkill)?.name || ab.chosenSkill}
          </option>
        )}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Atraente(p: Props) {
  const skills: Array<[string, string]> = [
    ['artes', 'Artes'],
    ['diplomacia', 'Diplomacia'],
    ['enganacao', 'Enganação'],
    ['intimidacao', 'Intimidação'],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5" title="Contra pessoas que possam se sentir fisicamente atraídas por você">
      {skills.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => rollSkill(p, id, `Atraente: ${label} +5`, { extraMod: 5 })}
        >
          <Icon name="d20" /> {label} +5
        </button>
      ))}
    </div>
  );
}

/** Estigmado: dano mental de medo vira perda de PV. */
function Estigmado(p: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const n = Math.max(0, Math.trunc(Number(amount) || 0));
  return (
    <>
      <button type="button" className={SAH_BTN_AMBER} onClick={() => { setAmount(''); setOpen(true); }}>
        <Icon name="heart-pulse" /> Trocar dano mental por PV
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Estigmado"
        description="Dano mental de efeitos de medo pode virar perda de PV. Informe o dano mental que você sofreria."
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="trpg-btn-primary"
              disabled={n <= 0}
              onClick={() => {
                p.onTakePvDamage?.(n, 'Estigmado (dano mental convertido)');
                p.onFeedback(`Estigmado: ${n} de dano mental virou -${n} PV (Sanidade preservada).`);
                setOpen(false);
              }}
            >
              Perder {n || ''} PV em vez de SAN
            </button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="trpg-label">Dano mental de medo</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            className="trpg-input trpg-num"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </label>
      </Dialog>
    </>
  );
}

const ORACAO_USED = 'pwr-scene-palavras-devocao-used';

/** Palavras de Devoção: oração (3 PE, 1x/cena) dá RD mental 5 até o fim da cena para até 2x PRE pessoas. */
function PalavrasDeDevocao(p: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allies, setAllies] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const maxPeople = Math.max(1, attrValue(p, 'pre') * 2);
  const chosen = Object.keys(selected).filter((id) => selected[id]);
  const effect = {
    id: 'pwr-scene-palavras-devocao',
    name: 'Palavras de Devoção (Oração)',
    source: 'Cena',
    description: `RD mental 5 até o fim da cena (oração de ${p.characterName || 'um aliado'})`,
  };

  if (usedInScene(p, ORACAO_USED)) return <span className={SAH_USED}>✓ Oração feita na cena</span>;

  async function openDialog() {
    setOpen(true);
    if (!p.isInCampaign || !p.campaignId) return;
    setLoading(true);
    try {
      const data = await fetchCampaignTradeTargets(p.campaignId);
      const list = (data.characters || [])
        .filter((c: any) => c.id !== p.characterId)
        .map((c: any) => ({ id: c.id, name: c.name }));
      setAllies(list);
      setSelected(Object.fromEntries(list.slice(0, maxPeople - 1).map((a) => [a.id, true])));
    } catch (err: any) {
      p.onFeedback(`Erro ao buscar aliados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!p.onSpendResource(3, effect)) return;
    if (p.isInCampaign) {
      p.onAddSceneEffect?.({ id: ORACAO_USED, name: 'Palavras de Devoção (Usado na Cena)', source: '1x/Cena', description: 'Oração já feita nesta cena' });
      if (p.campaignId && chosen.length > 0) {
        try {
          await applyCampaignSceneEffect(p.campaignId, chosen, effect);
        } catch (err) {
          console.error('Erro ao aplicar Palavras de Devoção:', err);
        }
      }
    }
    setOpen(false);
    p.onFeedback(`Oração (-3 PE): RD mental 5 até o fim da cena para você${chosen.length ? ` e ${chosen.length} aliado(s)` : ''}.`);
  }

  return (
    <>
      <button type="button" className={SAH_BTN_AMBER} onClick={openDialog}>
        <Icon name="sparkles" /> Oração: RD mental 5 (-3 PE{p.isInCampaign ? ' • 1x/Cena' : ''})
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="Palavras de Devoção"
        description={`Ação completa. Até ${maxPeople} pessoas (o dobro da sua Presença), incluindo você, recebem RD mental 5 até o fim da cena.`}
        footer={
          <>
            <button type="button" className="trpg-btn-quiet" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="trpg-btn-primary" disabled={loading} onClick={confirm}>
              Orar (-3 PE)
            </button>
          </>
        }
      >
        {!p.isInCampaign ? (
          <p className="text-sm text-zinc-400">Fora de uma mesa, a RD vale só para você.</p>
        ) : loading ? (
          <p className="text-sm text-zinc-400">Carregando aliados da mesa...</p>
        ) : allies.length === 0 ? (
          <p className="text-sm text-zinc-400">Nenhum outro personagem na mesa.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-500">
              Você e mais {maxPeople - 1}. Selecionados: {chosen.length}/{maxPeople - 1}
            </p>
            {allies.map((a) => {
              const on = Boolean(selected[a.id]);
              const blocked = !on && chosen.length >= maxPeople - 1;
              return (
                <label
                  key={a.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition ${
                    on ? 'border-amber-500/70 bg-amber-950/20' : 'border-zinc-800 bg-zinc-950'
                  } ${blocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-zinc-700'}`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-amber-500"
                    checked={on}
                    disabled={blocked}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                  />
                  <span className="text-sm font-semibold text-zinc-100 truncate">{a.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </Dialog>
    </>
  );
}

function RespostaRapida(p: Props) {
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Ao falhar em Percepção para evitar ficar desprevenido, role de novo usando Reflexos"
      onClick={() => {
        if (!p.onSpendResource(2)) return;
        rollSkill(p, 'reflexos', 'Resposta Rápida: Reflexos no lugar de Percepção (evitar desprevenido)');
      }}
    >
      <Icon name="zap" /> Rerrolar c/ Reflexos (-2 PE)
    </button>
  );
}

function RatoDeComputador(p: Props) {
  const SCENE_ID = 'pwr-scene-rato-computador';
  if (usedInScene(p, SCENE_ID)) return <span className={SAH_USED}>✓ Usado na investigação</span>;
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Com acesso a um computador, procurar pistas sem gastar uma rodada de investigação"
      onClick={() => {
        if (p.isInCampaign) {
          p.onAddSceneEffect?.({ id: SCENE_ID, name: 'Rato de Computador (Usado na Cena)', source: '1x/Cena', description: 'Procurou pistas com Tecnologia sem gastar rodada' });
        }
        rollSkill(p, 'tecnologia', 'Rato de Computador: procurar pistas (sem gastar rodada)');
      }}
    >
      <Icon name="search" /> Pistas c/ Tecnologia, sem gastar rodada{p.isInCampaign ? ' (1x/Cena)' : ''}
    </button>
  );
}

function TeimosiaObstinada(p: Props) {
  const override = getOrdemSkillAttrOverride('vontade', p.abilities, { int: attrValue(p, 'int'), pre: attrValue(p, 'pre') });
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Contra condição mental ou efeito que mude sua atitude (como Enfeitiçar)"
      onClick={() => {
        if (!p.onSpendResource(2)) return;
        rollSkill(p, 'vontade', 'Teimosia Obstinada: Vontade +5', { extraMod: 5, attr: override?.attr });
      }}
    >
      <Icon name="shield" /> Vontade +5 (-2 PE)
    </button>
  );
}

const TENACIDADE_PREFIX = 'pwr-scene-tenacidade-';

/** Tenacidade: morrendo e consciente, teste de Fortitude (DT 20 +10 por teste anterior na cena). */
function Tenacidade(p: Props) {
  const conditions = ((p.sheet as any).conditions || (p.sheet as any).activeConditions || []) as any[];
  const dying = hasDyingCondition(conditions);
  const done = (p.sheet.sceneEffects || []).filter((e) => e.id.startsWith(TENACIDADE_PREFIX)).length;
  const dt = 20 + 10 * done;
  if (!dying) {
    return <span className="text-xs text-zinc-500">Botão aparece quando estiver morrendo e consciente</span>;
  }
  return (
    <button
      type="button"
      className={SAH_BTN_NEUTRAL}
      title="Ação livre. Se passar, peça ao mestre para encerrar a condição Morrendo"
      onClick={() => {
        p.onAddSceneEffect?.({
          id: `${TENACIDADE_PREFIX}${done + 1}`,
          name: `Tenacidade (${done + 1}º teste na cena)`,
          source: 'Cena',
          description: `Teste de Fortitude contra DT ${dt} para encerrar a condição morrendo`,
        });
        rollSkill(p, 'fortitude', `Tenacidade: Fortitude contra DT ${dt} (passou = deixa de estar morrendo)`);
      }}
    >
      <Icon name="heart-pulse" /> Fortitude contra DT {dt}
    </button>
  );
}
