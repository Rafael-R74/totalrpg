import { useState } from 'react';
import {
  CharacterAbility,
  ComputedBonuses,
  ORDEM_SKILLS_METADATA,
  OrdemSheetData,
  RPGItem,
  SceneEffect,
} from '@totalrpg/shared';
import { Icon } from '../ui/Icon';

/**
 * Ações dos itens amaldiçoados do Sobrevivendo ao Horror (p. 58-62) na mochila.
 * Automáticos em outro lugar: Retalho Tenebroso aplicado (ordemEquipmentData), Fuzil Alheio e A Primeira Adaga
 * (ataques na aba Combate; a Adaga também aparece nos Modificadores de Conjuração da aba Rituais).
 */
export interface SahCursedItemActionsProps {
  item: RPGItem;
  ordemSheetData: OrdemSheetData;
  bonuses: ComputedBonuses;
  abilities: CharacterAbility[];
  onUpdateItem: (updated: RPGItem) => void;
  onConsumeUnit: (itemId: string) => void;
  onSpendResource: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onTakePvDamage?: (amount: number, reason?: string) => void;
  onAddSceneEffect?: (effect: SceneEffect) => void;
  onUpdateSceneEffects?: (effects: SceneEffect[]) => void;
  onLoseSanity?: (amount: number, reason: string) => void;
  onAdjustVital?: (barId: 'pv' | 'pe' | 'san', delta: number, reason: string) => void;
  onFeedback: (msg: string) => void;
  onRoll: (label: string, count: number, sides: number, modifier: number) => void;
}

const BTN = 'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1';
const RED = `${BTN} bg-red-950/80 hover:bg-red-700 text-red-200 border-red-600`;
const PURPLE = `${BTN} bg-purple-950/80 hover:bg-purple-700 text-purple-200 border-purple-500`;
const AMBER = `${BTN} bg-amber-950/80 hover:bg-amber-700 text-amber-200 border-amber-600`;
const ZINC = `${BTN} bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700`;
const RESET = 'px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-lg text-[10px] font-bold cursor-pointer';

const roll = (sides: number) => Math.floor(Math.random() * sides) + 1;

function key(name: string): string | null {
  const ln = name.toLowerCase();
  const keys: Array<[string, string]> = [
    ['conector de membros', 'conector'],
    ["dose d'a praga", 'praga'],
    ['dose d’a praga', 'praga'],
    ['mandíbula agonizante', 'mandibula'],
    ['retalho tenebroso', 'retalho'],
    ['ampulheta do tempo sofrido', 'ampulheta'],
    ['injeção de lodo', 'injecao'],
    ['instantâneo mortal', 'instantaneo'],
    ['projétil de lodo', 'projetil'],
    ['rádio chiador', 'radio'],
    ['câmera obscura', 'camera'],
    ['enxame fantasmagórico', 'enxame'],
    ['repositório do fracasso', 'repositorio'],
    ['tábula do saber custoso', 'tabula'],
    ['arreio neural', 'arreio'],
    ['centrifugador existencial', 'centrifugador'],
    ['espelho refletor', 'espelho'],
  ];
  return keys.find(([k]) => ln.includes(k))?.[1] ?? null;
}

export function isSahCursedActionItem(item: RPGItem): boolean {
  return key(item.name) !== null;
}

export function SahCursedItemActions(p: SahCursedItemActionsProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [part, setPart] = useState('braço');
  const [skill, setSkill] = useState('');
  const { item } = p;
  const k = key(item.name);
  if (!k) return null;

  const uses = Number(item.dailyUses || 0);
  const vig = Number(p.ordemSheetData.attributes.vig || 0) + (p.bonuses.attributes.vig || 0);
  const sceneEffects = p.ordemSheetData.sceneEffects || [];
  const effectId = `sah-item-${k}-${item.id}`;
  const effectOn = sceneEffects.some((e) => e.id === effectId);
  const update = (patch: Partial<RPGItem>) => p.onUpdateItem({ ...item, ...patch });

  const skillParts = (skillId: string, extraDice = 0, extraMod = 0) => {
    const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === skillId);
    const sk = p.ordemSheetData.skills.find((s) => s.id === skillId);
    const attr = (meta?.attribute || 'int') as keyof OrdemSheetData['attributes'];
    const attrVal = Number(p.ordemSheetData.attributes[attr] || 0) + (p.bonuses.attributes[attr] || 0);
    return {
      attrVal,
      trained: (sk?.trainingDegree || 0) >= 5,
      dice: attrVal + p.bonuses.skillDiceAll + (p.bonuses.skillDice[skillId] || 0) + extraDice,
      mod: (sk?.trainingDegree || 0) + (sk?.otherModifier || 0) + p.bonuses.skillBonusAll + (p.bonuses.skillBonus[skillId] || 0) + extraMod,
    };
  };
  const rollSkill = (skillId: string, label: string, extraDice = 0, extraMod = 0) => {
    const { dice, mod } = skillParts(skillId, extraDice, extraMod);
    p.onRoll(label, dice, 20, mod);
  };
  const addEffect = (name: string, description: string) =>
    p.onAddSceneEffect?.({ id: effectId, name, source: item.name, description });
  const removeEffect = () => p.onUpdateSceneEffects?.(sceneEffects.filter((e) => e.id !== effectId));
  const loseRolledPv = (reason: string) => {
    const r = roll(6);
    p.onTakePvDamage?.(r, reason);
    p.onFeedback(`${reason}: -${r} PV (1d6).`);
  };

  switch (k) {
    case 'conector':
      return (
        <>
          <select className="trpg-input text-[11px]!" style={{ height: '1.75rem', width: 'auto' }} value={part} onChange={(e) => setPart(e.target.value)} aria-label="Parte reconectada">
            <option value="braço">Braço</option>
            <option value="perna">Perna</option>
            <option value="cabeça">Cabeça</option>
          </select>
          <button
            type="button"
            className={RED}
            title="Ação padrão. O ferimento precisa ter ocorrido há até 3 rodadas. Morrendo ou morto: fica inconsciente com 1 PV."
            onClick={() => {
              const lifeOfItsOwn = roll(4) === 1;
              const side =
                part === 'perna' ? 'o alvo fica lento' : part === 'braço' ? '-1d20 em testes que usem esse braço' : '25% de ficar confuso no início de cenas tensas';
              p.onConsumeUnit(item.id);
              p.onFeedback(
                `Conector de Membros: ${part} reconectada (sem curar PV; morrendo/morto passa a inconsciente com 1 PV). ${
                  lifeOfItsOwn ? `A parte ganhou vida própria (1 no 1d4): ${side}.` : 'Sem vida própria (1d4 ≠ 1).'
                }`
              );
            }}
          >
            <Icon name="link" /> Reconectar
          </button>
        </>
      );

    case 'praga': {
      const opened = item.remainingCharges === 0;
      const dt = 20 + 5 * uses;
      return opened ? (
        <button
          type="button"
          className={RED}
          title="Se falhar: 2d4 de dano mental e mantém os poderes até o fim da próxima cena, sob efeito de Ódio Incontrolável."
          onClick={() => {
            rollSkill('fortitude', `Dose d'A Praga: fim do efeito (Fortitude DT ${dt})`);
            removeEffect();
            update({ remainingCharges: undefined, dailyUses: uses + 1 });
            p.onConsumeUnit(item.id);
            p.onFeedback(`Dose d'A Praga: Fortitude DT ${dt}. Se falhar, 2d4 de dano mental e os poderes continuam na próxima cena com Ódio Incontrolável.`);
          }}
        >
          <Icon name="d20" /> {effectOn ? 'Encerrar efeito' : 'Efeito acabou:'} (Fortitude DT {dt})
        </button>
      ) : (
        <>
          <button
            type="button"
            className={RED}
            title="Ação padrão: você ou um ser adjacente recebe Arma de Sangue, Sangue de Ferro e Sangue Vivo até o fim da cena."
            onClick={() => {
              update({ remainingCharges: 0 });
              addEffect("Dose d'A Praga", 'Sob efeito de Arma de Sangue, Sangue de Ferro e Sangue Vivo até o fim da cena.');
              p.onFeedback("Dose d'A Praga aberta: Arma de Sangue, Sangue de Ferro e Sangue Vivo até o fim da cena.");
            }}
          >
            <Icon name="sangue" /> Abrir frasco
          </button>
          {uses > 0 && (
            <button type="button" className={RESET} title="Doses tomadas desde o último interlúdio" onClick={() => update({ dailyUses: 0 })}>
              ↺ Interlúdio ({uses})
            </button>
          )}
        </>
      );
    }

    case 'mandibula':
      // Grita até o fim da cena (efeito de cena); depois precisa descansar uma cena para ser usada de novo
      return effectOn ? (
        <span className="text-[11px] text-red-300">Gritando até o fim da cena</span>
      ) : uses > 0 ? (
        <>
          <span className="text-[11px] text-zinc-400">Descansando (precisa de uma cena)</span>
          <button type="button" className={RESET} onClick={() => update({ dailyUses: 0 })}>
            ↺ Descansou uma cena
          </button>
        </>
      ) : (
        <button
          type="button"
          className={RED}
          title="Ação padrão, alcance médio. Grita em 30m até o fim da cena; em furtividade, passa automaticamente em distrair. Criaturas de Sangue: Vontade DT 35 para não ir comê-la."
          onClick={() => {
            update({ dailyUses: 1 });
            addEffect('Mandíbula Agonizante gritando', 'Cobre qualquer som em 30m; criaturas de Sangue precisam de Vontade DT 35 para não ir comê-la.');
            p.onFeedback('Mandíbula Agonizante arremessada: grita até o fim da cena (cobre sons em 30m; criaturas de Sangue: Vontade DT 35).');
          }}
        >
          <Icon name="megaphone" /> Arremessar
        </button>
      );

    case 'retalho': {
      const tests = Number(item.remainingCharges || 0);
      const dt = 15 + 5 * tests;
      if (!item.isEquipped) {
        return (
          <button
            type="button"
            className={RED}
            title="Ação padrão. Faro e visão no escuro; vulnerável a Morte e -2d20 em perícias sociais; +1 de dano por dia seguido."
            onClick={() => {
              update({ isEquipped: true, dailyUses: 0, remainingCharges: 0 });
              p.onFeedback('Retalho Tenebroso aplicado no rosto: faro, visão no escuro, vulnerável a Morte e -2d20 em perícias sociais.');
            }}
          >
            <Icon name="sangue" /> Aplicar no rosto
          </button>
        );
      }
      return (
        <>
          <span className="text-[11px] text-red-300">+{uses} dano • vulnerável a Morte</span>
          <button
            type="button"
            className={RED}
            title={`+1 de dano cumulativo; o retalho se alimenta: Fortitude DT ${dt} ou perde 1d6 PV`}
            onClick={() => {
              update({ dailyUses: uses + 1, remainingCharges: tests + 1 });
              rollSkill('fortitude', `Retalho Tenebroso: fim do dia (Fortitude DT ${dt})`);
              setPending('retalho-dia');
              p.onFeedback(`Novo dia com o retalho: +${uses + 1} de dano. Fortitude DT ${dt}; se falhar, perde 1d6 PV.`);
            }}
          >
            <Icon name="moon" /> Fim do dia (Fort DT {dt})
          </button>
          <button
            type="button"
            className={ZINC}
            title="Ação padrão e teste de Fortitude; se falhar, perde 1d6 PV"
            onClick={() => {
              update({ isEquipped: false, dailyUses: 0, remainingCharges: 0 });
              rollSkill('fortitude', `Retalho Tenebroso: remover (Fortitude DT ${dt})`);
              setPending('retalho-remover');
              p.onFeedback(`Retalho removido. Fortitude DT ${dt}; se falhar, perde 1d6 PV.`);
            }}
          >
            Remover (Fort DT {dt})
          </button>
          {pending?.startsWith('retalho') && (
            <button type="button" className={RESET} onClick={() => { setPending(null); loseRolledPv('Retalho Tenebroso'); }}>
              Falhei (-1d6 PV)
            </button>
          )}
        </>
      );
    }

    case 'ampulheta':
      return uses > 0 ? (
        <>
          <span className="text-[11px] text-zinc-400">Tempo emprestado</span>
          <button type="button" className={RESET} title="Gaste uma ação de interlúdio para devolver o tempo" onClick={() => update({ dailyUses: 0 })}>
            ↺ Devolver o tempo (interlúdio)
          </button>
        </>
      ) : (
        <button
          type="button"
          className={PURPLE}
          title="Empunhando: recebe agora os benefícios de uma ação de interlúdio à sua escolha"
          onClick={() => {
            if (!p.onSpendResource(5)) return;
            update({ dailyUses: 1 });
            p.onFeedback('Ampulheta do Tempo Sofrido (-5 PE): receba agora os benefícios de uma ação de interlúdio.');
          }}
        >
          <Icon name="hourglass" /> Ação de interlúdio agora (-5 PE)
        </button>
      );

    case 'injecao':
      return (
        <button
          type="button"
          className={PURPLE}
          title="Ação padrão, em você ou ser adjacente voluntário"
          onClick={() => {
            p.onAddSceneEffect?.({
              id: `sah-injecao-${Date.now()}`,
              name: 'Injeção de Lodo',
              source: item.name,
              description: 'Vulnerável a balístico e Energia; na próxima vez que chegar a 0 PV nesta cena, fica com 1 PV.',
            });
            p.onConsumeUnit(item.id);
            p.onFeedback('Injeção de Lodo aplicada: vulnerável a balístico e Energia, mas a próxima queda a 0 PV nesta cena vira 1 PV.');
          }}
        >
          <Icon name="morte" /> Injetar
        </button>
      );

    case 'instantaneo':
      return (
        <button
          type="button"
          className={PURPLE}
          title="Ao procurar pistas com uma perícia ligada à morte retratada, a imagem aponta uma direção útil"
          onClick={() => {
            if (!p.onSpendResource(1)) return;
            p.onFeedback('Instantâneo Mortal (-1 PE): +1d20 no teste de procurar pistas se a perícia combina com a morte da foto.');
          }}
        >
          <Icon name="eye" /> Encarar a foto (-1 PE • +1d20)
        </button>
      );

    case 'projetil':
      return (
        <button
          type="button"
          className={PURPLE}
          title="Todo o dano da arma vira Morte. Ao fim da cena a arma se degrada até se desfazer."
          onClick={() => {
            p.onAddSceneEffect?.({
              id: `sah-projetil-${Date.now()}`,
              name: 'Projétil de Lodo',
              source: item.name,
              description: 'O dano da arma vira Morte. No fim da cena, a arma se desfaz.',
            });
            p.onConsumeUnit(item.id);
            p.onFeedback('Projétil de Lodo carregado: dano de Morte nesta cena; a arma se desfaz no fim da cena.');
          }}
        >
          <Icon name="morte" /> Carregar na arma
        </button>
      );

    case 'radio': {
      // Pilhas duram 12h: ligar/desligar é estado do item, não efeito de cena
      const on = item.remainingCharges === 1;
      return (
        <button
          type="button"
          className={on ? `${BTN} bg-amber-600 text-white border-amber-300` : ZINC}
          aria-pressed={on}
          title="Chia se houver criatura paranormal em alcance extremo (mais alto quanto mais perto). Criaturas tendem a ser atraídas pelo chiado."
          onClick={() => {
            update({ remainingCharges: on ? 0 : 1 });
            p.onFeedback(on ? 'Rádio Chiador desligado.' : 'Rádio Chiador ligado: peça ao mestre se há chiado.');
          }}
        >
          <Icon name="radio" /> {on ? 'Ligado (desligar)' : 'Ligar rádio'}
        </button>
      );
    }

    case 'camera':
      return (
        <>
          <button
            type="button"
            className={PURPLE}
            title="Câmera de aura com lente de revelação paranormal; DT para resistir +10"
            onClick={() => {
              if (!p.onSpendResource(1)) return;
              p.onFeedback('Câmera Obscura (-1 PE): foto tirada. DT para resistir +10.');
            }}
          >
            <Icon name="eye" /> Fotografar (-1 PE)
          </button>
          <button
            type="button"
            className={ZINC}
            title="Só criaturas com invisibilidade, incorporeidade ou camuflagem que falharem"
            onClick={() => p.onRoll('Câmera Obscura: dano de frio', 6, 6, 0)}
          >
            <Icon name="d20" /> Dano 6d6 frio
          </button>
        </>
      );

    case 'enxame':
      return item.isEquipped ? (
        <>
          <span className="text-[11px] text-purple-300">Invisível</span>
          <button
            type="button"
            className={PURPLE}
            title="No início de cada turno vestindo o manto (ignora resistências)"
            onClick={() => {
              p.onLoseSanity?.(1, 'Enxame Fantasmagórico');
              p.onFeedback('Enxame Fantasmagórico: as traças se alimentam (-1 SAN).');
            }}
          >
            Início do turno (-1 SAN)
          </button>
          <button type="button" className={ZINC} onClick={() => update({ isEquipped: false })}>
            Despir
          </button>
        </>
      ) : (
        <button type="button" className={PURPLE} onClick={() => { update({ isEquipped: true }); p.onFeedback('Enxame Fantasmagórico vestido: você está invisível.'); }}>
          <Icon name="eye" /> Vestir (ficar invisível)
        </button>
      );

    case 'repositorio': {
      const charges = Number(item.remainingCharges || 0);
      const penalty = uses;
      return (
        <>
          <span className="trpg-badge">Cargas {charges}/6</span>
          <button
            type="button"
            className={ZINC}
            disabled={charges >= 6}
            title="Uma criatura paranormal em alcance médio tirou 1 em um d20"
            onClick={() => update({ remainingCharges: Math.min(6, charges + 1) })}
          >
            +1 carga
          </button>
          <button
            type="button"
            className={PURPLE}
            disabled={charges <= 0}
            title="1x por rodada. -1 cumulativo em Vontade até o próximo interlúdio."
            onClick={() => {
              const pe = roll(4);
              const next = penalty + 1;
              update({
                remainingCharges: charges - 1,
                dailyUses: next,
                isEquipped: true,
                modifiers: [{ id: `sah-repositorio-vontade-${item.id}`, targetType: 'skill_bonus', targetKey: 'vontade', value: -next }],
              });
              p.onAdjustVital?.('pe', pe, 'Repositório do Fracasso');
              p.onFeedback(`Repositório do Fracasso: +${pe} PE (1d4). Vontade -${next} até o próximo interlúdio.`);
            }}
          >
            Consumir carga (+1d4 PE)
          </button>
          {penalty > 0 && (
            <button type="button" className={RESET} title={`Vontade -${penalty}`} onClick={() => update({ dailyUses: 0, modifiers: [] })}>
              ↺ Interlúdio (Vontade -{penalty})
            </button>
          )}
        </>
      );
    }

    case 'tabula':
      return (
        <>
          <select className="trpg-input text-[11px]!" style={{ height: '1.75rem', width: 'auto' }} value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Perícia">
            <option value="">Perícia</option>
            {ORDEM_SKILLS_METADATA.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={PURPLE}
            disabled={!skill}
            title="Benefícios de ser treinado nesta perícia por um teste; perde SAN igual ao atributo-chave"
            onClick={() => {
              const s = skillParts(skill);
              const name = ORDEM_SKILLS_METADATA.find((m) => m.id === skill)?.name || skill;
              rollSkill(skill, `Tábula do Saber Custoso: ${name} como treinado`, 0, s.trained ? 0 : 5);
              const loss = Math.max(0, s.attrVal);
              if (loss > 0) p.onLoseSanity?.(loss, 'Tábula do Saber Custoso');
              p.onFeedback(`Tábula do Saber Custoso: ${name} como treinado neste teste. -${loss} SAN.`);
            }}
          >
            <Icon name="book" /> Usar como treinado
          </button>
        </>
      );

    case 'arreio': {
      const cap = Math.max(0, 2 * vig);
      return (
        <>
          <button
            type="button"
            className={AMBER}
            disabled={uses >= cap}
            title={`Ao sofrer 5 ou mais de dano de eletricidade ou Energia. Máximo ${cap} PE por dia (2× Vigor).`}
            onClick={() => {
              update({ dailyUses: uses + 1 });
              p.onAdjustVital?.('pe', 1, 'Arreio Neural');
              p.onFeedback(`Arreio Neural: +1 PE (${uses + 1}/${cap} hoje).`);
            }}
          >
            <Icon name="zap" /> Sofri 5+ de Energia (+1 PE • {uses}/{cap})
          </button>
          {uses > 0 && (
            <button type="button" className={RESET} onClick={() => update({ dailyUses: 0 })}>
              ↺ Dia
            </button>
          )}
        </>
      );
    }

    case 'centrifugador': {
      const dt = 15 + 5 * uses;
      return (
        <>
          <button
            type="button"
            className={AMBER}
            title="Ação padrão: turno adicional na última contagem de iniciativa da rodada. Se falhar no Ocultismo, perde metade dos atributos."
            onClick={() => {
              if (!p.onSpendResource(3)) return;
              update({ dailyUses: uses + 1 });
              rollSkill('ocultismo', `Centrifugador Existencial (Ocultismo DT ${dt})`);
              p.onFeedback(`Centrifugador Existencial (-3 PE): turno adicional no fim da rodada. Ocultismo DT ${dt}; se falhar, perde metade dos atributos.`);
            }}
          >
            <Icon name="zap" /> Turno adicional (-3 PE • DT {dt})
          </button>
          {uses > 0 && (
            <button type="button" className={RESET} onClick={() => update({ dailyUses: 0 })}>
              ↺ Dia ({uses})
            </button>
          )}
        </>
      );
    }

    case 'espelho':
      return (
        <>
          <button
            type="button"
            className={AMBER}
            title="Ação de movimento: observe um ponto fora do seu ângulo de visão em alcance médio"
            onClick={() => rollSkill('percepcao', 'Espelho Refletor: Percepção (+1d20)', 1)}
          >
            <Icon name="eye" /> Observar (+1d20 Percepção)
          </button>
          <button
            type="button"
            className={ZINC}
            title="Ao sofrer dano de Energia: evita o dano e o reflete de volta à origem"
            onClick={() => {
              p.onConsumeUnit(item.id);
              p.onFeedback('Espelho Refletor sacrificado: o dano de Energia foi evitado e refletido de volta à origem.');
            }}
          >
            Sacrificar (refletir Energia)
          </button>
        </>
      );

    default:
      return null;
  }
}
