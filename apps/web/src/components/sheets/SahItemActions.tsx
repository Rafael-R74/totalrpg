import { useState } from 'react';
import {
  ActiveCondition,
  AttackDamageRollPayload,
  CharacterAbility,
  ComputedBonuses,
  CursePricePrompt,
  ORDEM_SKILLS_METADATA,
  OrdemSheetData,
  RPGItem,
  SceneEffect,
  boostCritRangeBySteps,
  computeOrdemWeaponBonusesFromItem,
  doubleCritThreatRange,
  getOrdemPeLimit,
  parseCritRange,
} from '@totalrpg/shared';
import { Icon } from '../ui/Icon';

/**
 * Ações interativas de equipamentos, explosivos, medicamentos e itens paranormais
 * do suplemento Sobrevivendo ao Horror v1.3 (Cap. 1, p. 37-45) na mochila.
 */
export interface SahItemActionsProps {
  item: RPGItem;
  inventory: RPGItem[];
  ordemSheetData: OrdemSheetData;
  bonuses: ComputedBonuses;
  abilities: CharacterAbility[];
  onUpdateItem: (updated: RPGItem) => void;
  onConsumeUnit: (itemId: string) => void;
  onSpendResource: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onGrantTempHp?: (amount: number, reason?: string) => void;
  onAdjustVital?: (barId: 'pv' | 'pe' | 'san', delta: number, reason: string) => void;
  onAddSceneEffect?: (effect: SceneEffect) => void;
  onUpdateSceneEffects?: (effects: SceneEffect[]) => void;
  onRemoveCondition?: (condId: string) => void;
  onFeedback: (msg: string) => void;
  onRoll: (
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isDamage?: boolean,
    extraRollOpts?: {
      extraDice?: Array<{ count: number; sides: number; label: string }>;
      cursePricePrompt?: CursePricePrompt;
    },
    attackDamagePayload?: AttackDamageRollPayload
  ) => void;
}

const BTN =
  'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1';
const ORANGE = `${BTN} bg-orange-950/80 hover:bg-orange-700 text-orange-200 border-orange-600`;
const EMERALD = `${BTN} bg-emerald-950/80 hover:bg-emerald-700 text-emerald-200 border-emerald-600`;
const AMBER = `${BTN} bg-amber-950/80 hover:bg-amber-700 text-amber-200 border-amber-600`;
const PURPLE = `${BTN} bg-purple-950/80 hover:bg-purple-700 text-purple-200 border-purple-500`;
const ZINC = `${BTN} bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700`;

type SahItemKey =
  | 'dinamite'
  | 'explosivo_plastico'
  | 'galao_vermelho'
  | 'granada_sonifero'
  | 'granada_pem'
  | 'alimento_energetico'
  | 'cao_adestrado'
  | 'faca_tatica'
  | 'shuriken'
  | 'estrepes'
  | 'faixa_pregos'
  | 'escuta'
  | 'chaves'
  | 'manual_operacional'
  | 'paraquedas'
  | 'med_antibiotico'
  | 'med_antidoto'
  | 'med_antiemetico'
  | 'med_antihistaminico'
  | 'med_anti_inflamatorio'
  | 'med_antitermico'
  | 'med_broncodilatador'
  | 'med_coagulante'
  | 'ligacao_infernal'
  | 'medidor_vertebral'
  | 'valete_salvacao';

function resolveSahItemKey(name: string): SahItemKey | null {
  const ln = name.toLowerCase();
  if (ln.includes('dinamite')) return 'dinamite';
  if (ln.includes('explosivo plástico') || ln.includes('explosivo plastico')) return 'explosivo_plastico';
  if (ln.includes('galão vermelho') || ln.includes('galao vermelho')) return 'galao_vermelho';
  if (ln.includes('gás sonífero') || ln.includes('gas sonifero')) return 'granada_sonifero';
  if (ln.includes('granada de pem')) return 'granada_pem';
  if (ln.includes('alimento energético') || ln.includes('alimento energetico')) return 'alimento_energetico';
  if (ln.includes('cão adestrado') || ln.includes('cao adestrado')) return 'cao_adestrado';
  if (ln.includes('faca tática') || ln.includes('faca tatica')) return 'faca_tatica';
  if (ln.includes('shuriken')) return 'shuriken';
  if (ln.includes('estrepes')) return 'estrepes';
  if (ln.includes('faixa de pregos')) return 'faixa_pregos';
  if (ln.includes('equipamento de escuta')) return 'escuta';
  if (ln === 'chaves' || ln.startsWith('chaves ')) return 'chaves';
  if (ln.includes('manual operacional')) return 'manual_operacional';
  if (ln.includes('paraquedas')) return 'paraquedas';
  if (ln.includes('antibiótico') || ln.includes('antibiotico')) return 'med_antibiotico';
  if (ln.includes('antídoto') || ln.includes('antidoto')) return 'med_antidoto';
  if (ln.includes('antiemético') || ln.includes('antiemetico')) return 'med_antiemetico';
  if (ln.includes('antihistamínico') || ln.includes('antihistaminico')) return 'med_antihistaminico';
  if (ln.includes('anti-inflamatório') || ln.includes('anti-inflamatorio')) return 'med_anti_inflamatorio';
  if (ln.includes('antitérmico') || ln.includes('antitermico')) return 'med_antitermico';
  if (ln.includes('broncodilatador')) return 'med_broncodilatador';
  if (ln.includes('coagulante')) return 'med_coagulante';
  if (ln.includes('ligação direta infernal') || ln.includes('ligacao direta infernal')) return 'ligacao_infernal';
  if (ln.includes('medidor de condição vertebral') || ln.includes('medidor de condicao vertebral')) return 'medidor_vertebral';
  if (ln.includes('valete da salvação') || ln.includes('valete da salvacao')) return 'valete_salvacao';
  return null;
}

export function isSahGeneralActionItem(item: RPGItem): boolean {
  return resolveSahItemKey(item.name) !== null;
}

const rollDie = (sides: number) => Math.floor(Math.random() * sides) + 1;

export function SahItemActions(p: SahItemActionsProps) {
  const k = resolveSahItemKey(p.item.name);
  const [planted, setPlanted] = useState(false);
  if (!k) return null;

  const { item, ordemSheetData, bonuses, abilities } = p;
  const peLimit = getOrdemPeLimit(ordemSheetData.nex, ordemSheetData.origin, abilities);
  const effAgi = (ordemSheetData.attributes.agi || 0) + (bonuses.attributes.agi || 0);
  const effInt = (ordemSheetData.attributes.int || 0) + (bonuses.attributes.int || 0);
  const hasPeritoExplosivos = abilities.some(
    (ab) =>
      ab.name.toLowerCase().includes('perito em explosivos') ||
      ab.id.toLowerCase().includes('perito-em-explosivos')
  );
  const agiDt = 10 + peLimit + effAgi + (hasPeritoExplosivos ? effInt : 0);
  const intDt = 10 + peLimit + effInt + (hasPeritoExplosivos ? effInt : 0);

  const hasAplicador = p.inventory.some(
    (it) =>
      it.isEquipped &&
      (it.name.toLowerCase().includes('aplicador de medicamentos') ||
        it.id.toLowerCase().includes('aplicador-medicamentos'))
  );
  const medActionHint = hasAplicador ? 'Ação de Movimento (Aplicador)' : 'Ação Padrão';

  const sceneEffects = ordemSheetData.sceneEffects || [];
  const activeConditions =
    ((ordemSheetData as { conditions?: ActiveCondition[] }).conditions ||
      ordemSheetData.activeConditions ||
      []) as ActiveCondition[];

  const rollSkill = (skillId: string, label: string, extraBonus = 0) => {
    const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === skillId);
    const sk = ordemSheetData.skills.find((s) => s.id === skillId);
    const attrKey = (sk?.attribute || meta?.attribute || 'int') as keyof OrdemSheetData['attributes'];
    const attrVal = (ordemSheetData.attributes[attrKey] || 0) + (bonuses.attributes[attrKey] || 0);
    const dice = attrVal + bonuses.skillDiceAll + (bonuses.skillDice[skillId] || 0);
    const mod =
      (sk?.trainingDegree || 0) +
      (sk?.otherModifier || 0) +
      bonuses.skillBonusAll +
      (bonuses.skillBonus[skillId] || 0) +
      extraBonus;
    const cp = bonuses.cursePriceByAttr?.[attrKey];
    const cursePricePrompt: CursePricePrompt | undefined =
      cp && cp.curseCount > 0
        ? {
            element: cp.element,
            attributeLabel: cp.attrLabel,
            curseCount: cp.curseCount,
            sanLossOnFail: cp.sanLoss,
          }
        : undefined;
    p.onRoll(label, dice, 20, mod, false, cursePricePrompt ? { cursePricePrompt } : undefined);
  };

  switch (k) {
    // -------------------- EXPLOSIVOS (p. 41) --------------------
    case 'dinamite':
      return (
        <button
          type="button"
          className={ORANGE}
          title="Ação padrão, alcance médio, raio 6m. 4d6 Impacto + 4d6 Fogo e em chamas (Reflexos DT Agi reduz à metade e evita condição)."
          onClick={() => {
            p.onConsumeUnit(item.id);
            p.onRoll(
              `Dinamite [4d6 Impacto + 4d6 Fogo • Raio 6m • Ref DT ${agiDt}]`,
              4,
              6,
              0,
              true,
              { extraDice: [{ count: 4, sides: 6, label: 'Dano de Fogo' }] }
            );
            p.onFeedback(
              `Dinamite arremessada (-1 un.): 4d6 impacto + 4d6 fogo em raio de 6m (Reflexos DT ${agiDt} reduz à metade e evita em chamas).`
            );
          }}
        >
          <Icon name="flame" /> Arremessar (4d6 Imp. + 4d6 Fogo • Ref DT {agiDt})
        </button>
      );

    case 'explosivo_plastico': {
      const trainedCrimeOrProf = ordemSheetData.skills.some(
        (s) => (s.id === 'crime' || s.id === 'profissao') && (s.trainingDegree || 0) >= 5
      );
      return (
        <>
          {!planted && (
            <button
              type="button"
              className={ZINC}
              title="Exige 2 rodadas preparando os pinos e grudando na superfície"
              onClick={() => {
                setPlanted(true);
                p.onFeedback('Explosivo Plástico posicionado (2 rodadas). Detone como ação livre até alcance longo.');
              }}
            >
              Plantar (2 rod.)
            </button>
          )}
          <button
            type="button"
            className={ORANGE}
            title="Detonação remota (ação livre, alcance longo) ou 1+ dano de fogo/eletricidade. Raio 3m."
            onClick={() => {
              setPlanted(false);
              p.onConsumeUnit(item.id);
              p.onRoll(
                `Explosivo Plástico [Impacto • Raio 3m • Ref DT ${intDt}]`,
                16,
                6,
                0,
                true
              );
              p.onFeedback(
                `Explosivo Plástico detonado (-1 un.): 16d6 impacto em 3m (Reflexos DT ${intDt} reduz à metade).${
                  trainedCrimeOrProf ? ' Especialista: dobro de dano e ignora RD contra objetos/estruturas!' : ''
                }`
              );
            }}
          >
            <Icon name="bomb" /> Detonar (16d6 • Ref DT {intDt})
          </button>
        </>
      );
    }

    case 'galao_vermelho':
      return (
        <>
          <button
            type="button"
            className={ORANGE}
            title="Explode ao sofrer dano de fogo ou balístico (esfera 6m, Reflexos DT 25)"
            onClick={() => {
              p.onConsumeUnit(item.id);
              p.onRoll('Galão Vermelho [Fogo • Esfera 6m • Ref DT 25]', 12, 6, 0, true);
              p.onFeedback(
                'Galão Vermelho explodiu (-1 un.): 12d6 fogo e em chamas em 6m (Reflexos DT 25 reduz à metade e evita condição); área fica em chamas (1d6/rod.).'
              );
            }}
          >
            <Icon name="flame" /> Explodir (12d6 Fogo • Ref DT 25)
          </button>
          <button
            type="button"
            className={ZINC}
            onClick={() => p.onRoll('Área em Chamas (Galão Vermelho)', 1, 6, 0, true)}
          >
            <Icon name="flame" /> Chamas 1d6
          </button>
        </>
      );

    case 'granada_sonifero':
      return (
        <>
          <button
            type="button"
            className={EMERALD}
            title="Raio 6m por 2 rodadas. Fora de combate: inconsciente/caído; em combate: exausto 1 rod. -> fatigado (Fortitude DT Agi reduz para fatigado 1d4 rod.)"
            onClick={() => {
              p.onConsumeUnit(item.id);
              p.onFeedback(
                `Granada de Gás Sonífero (-1 un.): nuvem de 6m por 2 rodadas. Fortitude DT ${agiDt} reduz para fatigado por 1d4 rodadas (falha: inconsciente/caído, ou exausto 1 rod. em combate).`
              );
            }}
          >
            <Icon name="cloud" /> Lançar Gás (Fort DT {agiDt})
          </button>
          <button
            type="button"
            className={ZINC}
            onClick={() => p.onRoll('Gás Sonífero (Rodadas Fatigado)', 1, 4, 0, true)}
          >
            1d4 rod.
          </button>
        </>
      );

    case 'granada_pem':
      return (
        <button
          type="button"
          className={AMBER}
          title="Desativa equipamentos elétricos em 18m até o fim da cena; criaturas de Energia sofrem 6d6 impacto e paralisado 1 rod. (1x/cena, Fort DT Agi reduz/evita)"
          onClick={() => {
            p.onConsumeUnit(item.id);
            p.onRoll(`Granada de PEM [Criaturas de Energia • Fort DT ${agiDt}]`, 6, 6, 0, true);
            p.onFeedback(
              `Granada de PEM (-1 un.): elétricos desativados em 18m até o fim da cena! Criaturas de Energia: 6d6 impacto + paralisado 1 rod. (Fortitude DT ${agiDt} reduz à metade e evita condição).`
            );
          }}
        >
          <Icon name="zap" /> Detonar PEM (6d6 Energia • Fort DT {agiDt})
        </button>
      );

    // -------------------- MEDICAMENTOS (p. 43) --------------------
    case 'med_anti_inflamatorio':
      return (
        <button
          type="button"
          className={EMERALD}
          title={`${medActionHint}: concede 1d8+2 PV temporários a você ou ser adjacente`}
          onClick={() => {
            const val = rollDie(8) + 2;
            p.onConsumeUnit(item.id);
            p.onGrantTempHp?.(val, 'Anti-inflamatório');
            p.onFeedback(
              `Anti-inflamatório aplicado (${medActionHint}, -1 un.): +${val} PV temporários (1d8+2)!`
            );
          }}
        >
          <Icon name="heart-pulse" /> Aplicar em mim (+1d8+2 PV Temp)
        </button>
      );

    case 'med_antiemetico':
      return (
        <button
          type="button"
          className={EMERALD}
          title={`${medActionHint}: remove Enjoado e concede +5 em testes para evitá-lo até o fim da cena`}
          onClick={() => {
            p.onConsumeUnit(item.id);
            for (const c of activeConditions) {
              if (c.name.toLowerCase().includes('enjoado')) {
                p.onRemoveCondition?.(c.id);
              }
            }
            p.onAddSceneEffect?.({
              id: `sah-med-antiemetico-${Date.now()}`,
              name: 'Antiemético (+5 vs Enjoado)',
              source: 'Cena',
              description: '+5 em testes para evitar a condição enjoado até o fim da cena.',
            });
            p.onFeedback(
              `Antiemético aplicado (${medActionHint}, -1 un.): condição Enjoado removida e +5 contra enjoado até o fim da cena.`
            );
          }}
        >
          <Icon name="heart-pulse" /> Tomar (Remove Enjoado • +5)
        </button>
      );

    case 'med_antibiotico':
    case 'med_antidoto':
    case 'med_antihistaminico':
    case 'med_antitermico':
    case 'med_broncodilatador':
    case 'med_coagulante': {
      const medMap: Record<string, { label: string; desc: string }> = {
        med_antibiotico: {
          label: 'Tomar (+5 Fort vs Doença)',
          desc: '+5 no próximo teste de Fortitude contra efeitos de doença até o fim do dia.',
        },
        med_antidoto: {
          label: 'Tomar (+5 Fort vs Veneno)',
          desc: '+5 no próximo teste de Fortitude contra veneno até o fim do dia (ou remove veneno específico).',
        },
        med_antihistaminico: {
          label: 'Tomar (+5 vs Alergia)',
          desc: '+5 no próximo teste contra efeitos de alergia até o fim do dia.',
        },
        med_antitermico: {
          label: 'Tomar (Novo teste Mental)',
          desc: 'Permite um novo teste imediato contra uma condição mental ativa (1x por cena).',
        },
        med_broncodilatador: {
          label: 'Usar (+5 vs Asfixia/Fadiga)',
          desc: '+5 em testes para evitar asfixiado ou fatigado até o fim do dia.',
        },
        med_coagulante: {
          label: 'Aplicar (+5 Estabilizar)',
          desc: '+5 para estabilizar de sangrando até o fim do dia (ou +5 em Medicina para remover morrendo).',
        },
      };
      const info = medMap[k];
      return (
        <button
          type="button"
          className={EMERALD}
          title={`${medActionHint}: ${info.desc}`}
          onClick={() => {
            p.onConsumeUnit(item.id);
            p.onAddSceneEffect?.({
              id: `sah-${k}-${Date.now()}`,
              name: item.name.replace(/\s*\(Medicamento\)/i, ''),
              source: k === 'med_antitermico' ? '1x/Cena' : 'Até o fim do dia',
              description: info.desc,
            });
            p.onFeedback(`${item.name} (${medActionHint}, -1 un.): ${info.desc}`);
          }}
        >
          <Icon name="heart-pulse" /> {info.label}
        </button>
      );
    }

    // -------------------- OPERACIONAIS, ARMAS E ACESSÓRIOS --------------------
    case 'alimento_energetico':
      return (
        <button
          type="button"
          className={AMBER}
          title="Ação padrão: consome o alimento e recupera 1d4 PE"
          onClick={() => {
            const pe = rollDie(4);
            p.onConsumeUnit(item.id);
            p.onAdjustVital?.('pe', pe, 'Alimento Energético');
            p.onFeedback(`Alimento Energético consumido (-1 un.): +${pe} PE recuperados (1d4)!`);
          }}
        >
          <Icon name="zap" /> Consumir (+1d4 PE)
        </button>
      );

    case 'cao_adestrado': {
      const trainedAdest = ordemSheetData.skills.some(
        (s) => s.id === 'adestramento' && (s.trainingDegree || 0) >= 5
      );
      if (!trainedAdest) {
        return (
          <span className="text-[11px] text-amber-300/90">
            Requer treinamento em Adestramento
          </span>
        );
      }
      const effectId = `sah-cao-defesa-${item.id}`;
      const active = sceneEffects.some((e) => e.id === effectId);
      return active ? (
        <button
          type="button"
          className={EMERALD}
          onClick={() => {
            p.onUpdateSceneEffects?.(sceneEffects.filter((e) => e.id !== effectId));
            p.onFeedback('Cão Adestrado: postura defensiva encerrada.');
          }}
        >
          ✓ Ladrar e Morder (+2 Def) • Encerrar rod.
        </button>
      ) : (
        <button
          type="button"
          className={AMBER}
          title="Gaste 1 PE: você recebe +2 na Defesa por 1 rodada"
          onClick={() => {
            if (
              !p.onSpendResource(1, {
                id: effectId,
                name: 'Cão Adestrado: Ladrar e Morder (+2 Defesa)',
                source: '1 Rodada',
                description: '+2 na Defesa por 1 rodada',
                modifiers: [{ id: `mod-cao-def-${item.id}`, targetType: 'defense', targetKey: 'defense', value: 2 }],
              })
            ) {
              return;
            }
            p.onFeedback('Cão Adestrado (-1 PE): +2 na Defesa por 1 rodada!');
          }}
        >
          <Icon name="shield" /> Ladrar e Morder (-1 PE • +2 Def)
        </button>
      );
    }

    case 'faca_tatica': {
      const blockEffectId = 'sah-faca-tatica-block-rd';
      const activeBlockRd = sceneEffects.some((e) => e.id === blockEffectId);
      return (
        <>
          <button
            type="button"
            className={AMBER}
            title="Na reação Bloquear: gaste 2 PE e sacrifique a faca tática para somar +20 na RD do bloqueio"
            onClick={() => {
              if (
                !p.onSpendResource(2, {
                  id: blockEffectId,
                  name: 'Faca Tática Sacrificada (+20 RD no Bloqueio)',
                  source: '1 Bloqueio',
                  description: '+20 na RD da reação Bloquear (remova após resolver o bloqueio).',
                  modifiers: [
                    {
                      id: 'mod-faca-tatica-block',
                      targetType: 'defense',
                      targetKey: 'block_rd',
                      value: 20,
                    },
                  ],
                })
              ) {
                return;
              }
              p.onConsumeUnit(item.id);
              p.onFeedback(
                'Faca Tática sacrificada (-2 PE, -1 un.): +20 aplicado na RD de Se Bloquear!'
              );
            }}
          >
            <Icon name="shield" /> Sacrificar no Bloqueio (-2 PE • +20 RD)
          </button>
          {activeBlockRd && (
            <button
              type="button"
              className={EMERALD}
              onClick={() => {
                p.onUpdateSceneEffects?.(sceneEffects.filter((e) => e.id !== blockEffectId));
                p.onFeedback('Bônus de +20 RD da Faca Tática encerrado após o bloqueio.');
              }}
            >
              ✓ +20 RD Bloqueio ativo • Concluir
            </button>
          )}
        </>
      );
    }

    case 'shuriken': {
      const pontariaSk = ordemSheetData.skills.find((s) => s.id === 'pontaria');
      if (!pontariaSk || (pontariaSk.trainingDegree || 0) < 10) return null;
      return (
        <button
          type="button"
          className={AMBER}
          title="Veterano em Pontaria (1x/rodada): ataque adicional de shuriken contra o mesmo alvo"
          onClick={() => {
            if (!p.onSpendResource(1)) return;
            const wMods = computeOrdemWeaponBonusesFromItem(item, undefined);
            const effFor =
              (ordemSheetData.attributes.for || 0) + (bonuses.attributes.for || 0);
            const dice =
              effAgi + bonuses.skillDiceAll + (bonuses.skillDice['pontaria'] || 0) + bonuses.attackDiceBonus;
            const atkBonus =
              (pontariaSk.trainingDegree || 0) +
              (pontariaSk.otherModifier || 0) +
              bonuses.skillBonusAll +
              (bonuses.skillBonus['pontaria'] || 0) +
              bonuses.attackBonus +
              wMods.attackBonus +
              (item.isFavoriteTool ? 1 : 0);
            const hasTiroCerteiro = p.abilities.some(
              (a) =>
                a.isActive !== false &&
                (a.id === 'ord-pwr-comb-tiro-certeiro' ||
                  a.name.toLowerCase().includes('tiro certeiro'))
            );
            const hasNinjaUrbano = p.abilities.some(
              (a) =>
                a.isActive !== false &&
                (a.id === 'ord-pwr-esp-ninja-urbano' ||
                  a.name.toLowerCase().includes('ninja urbano'))
            );
            const dmgMod =
              effFor +
              bonuses.damageBonus +
              wMods.damageBonus +
              (hasTiroCerteiro ? effAgi : 0) +
              (hasNinjaUrbano ? 2 : 0) +
              (item.isFavoriteTool ? 1 : 0);
            let critStr = '20/x2';
            if (wMods.doublesCritThreat) critStr = doubleCritThreatRange(critStr);
            if (wMods.critThreatBonus > 0) critStr = boostCritRangeBySteps(critStr, wMods.critThreatBonus);
            const critParsed = parseCritRange(critStr);
            const cp = bonuses.cursePriceByAttr?.agi;
            const cursePricePrompt: CursePricePrompt | undefined =
              cp && cp.curseCount > 0
                ? {
                    element: cp.element,
                    attributeLabel: cp.attrLabel,
                    curseCount: cp.curseCount,
                    sanLossOnFail: cp.sanLoss,
                  }
                : undefined;
            const baseDice = 1 + wMods.extraDamageDiceCount;
            p.onRoll(
              `Acerto: ${item.name} [Ataque Extra -1 PE]`,
              dice,
              20,
              atkBonus,
              false,
              cursePricePrompt ? { cursePricePrompt } : undefined,
              {
                weaponName: item.name,
                critThreatMin: critParsed.threatMin,
                critMultiplier: critParsed.multiplier,
                normalDiceCount: baseDice,
                critDiceCount: baseDice * critParsed.multiplier,
                dieSides: 4,
                damageModifier: dmgMod,
                extraDiceNormal:
                  wMods.extraDamageDice.length > 0
                    ? wMods.extraDamageDice.map((d) => ({ count: d.count, sides: d.sides, label: d.label }))
                    : undefined,
                extraDiceCrit:
                  wMods.extraDamageDice.length > 0
                    ? wMods.extraDamageDice.map((d) => ({
                        count: d.multipliesOnCrit ? d.count * critParsed.multiplier : d.count,
                        sides: d.sides,
                        label: d.label,
                      }))
                    : undefined,
              }
            );
          }}
        >
          <Icon name="target" /> Ataque Extra (-1 PE)
        </button>
      );
    }

    case 'estrepes':
    case 'faixa_pregos':
      return (
        <>
          <button
            type="button"
            className={ZINC}
            title={`Reflexos DT ${agiDt} evita; falha causa 1d4 perfuração e deixa lento por 1 dia`}
            onClick={() =>
              p.onFeedback(
                `${item.name} posicionado (${k === 'faixa_pregos' ? 'linha de 9m; fura pneus' : 'quadrado de 1,5m'}): quem pisar faz Reflexos DT ${agiDt} ou sofre 1d4 perfuração e fica lento.`
              )
            }
          >
            <Icon name="warning" /> Espalhar (Ref DT {agiDt})
          </button>
          <button
            type="button"
            className={ZINC}
            onClick={() => p.onRoll(`${item.name} [Perfuração]`, 1, 4, 0, true)}
          >
            Dano 1d4
          </button>
        </>
      );

    case 'escuta':
      return (
        <button
          type="button"
          className={ZINC}
          title="Instalar transmissor exige Crime DT 20 (+5 na DT se houver pessoas presentes)"
          onClick={() => rollSkill('crime', 'Equipamento de Escuta — Instalar (Crime DT 20)')}
        >
          <Icon name="radio" /> Instalar (Crime DT 20)
        </button>
      );

    case 'chaves':
      return (
        <button
          type="button"
          className={ZINC}
          title="Distrair jogando o molho de chaves concede +2 em Furtividade na mesma rodada"
          onClick={() => rollSkill('furtividade', 'Chaves (Distração: Furtividade +2)', 2)}
        >
          <Icon name="d20" /> Distrair (+2 Furtividade)
        </button>
      );

    case 'manual_operacional': {
      const chosenSkill = item.accessoryConfig?.primarySkill || '';
      const studied = item.remainingCharges === 1;
      const isAprimorado = (item.modifications || []).includes('mod-aprimorado');
      return (
        <>
          <select
            className="trpg-input text-[11px]!"
            style={{ height: '1.75rem', width: 'auto' }}
            aria-label="Perícia do Manual Operacional"
            value={chosenSkill}
            onChange={(e) =>
              p.onUpdateItem({
                ...item,
                accessoryConfig: { ...(item.accessoryConfig || {}), primarySkill: e.target.value },
                remainingCharges: 0,
              })
            }
          >
            <option value="">Perícia do manual</option>
            {ORDEM_SKILLS_METADATA.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {chosenSkill && !studied && (
            <button
              type="button"
              className={AMBER}
              title="Gaste uma ação de interlúdio lendo este manual para usar a perícia como treinado até o próximo interlúdio"
              onClick={() => {
                p.onUpdateItem({ ...item, isEquipped: true, remainingCharges: 1 });
                const skName = ORDEM_SKILLS_METADATA.find((m) => m.id === chosenSkill)?.name || chosenSkill;
                p.onFeedback(
                  `Manual Operacional estudado: você usa ${skName} como treinado${
                    isAprimorado ? ' (+5 Aprimorado)' : ''
                  } até o próximo interlúdio.`
                );
              }}
            >
              <Icon name="book" /> Ler no Interlúdio
            </button>
          )}
          {chosenSkill && studied && (
            <>
              <button
                type="button"
                className={EMERALD}
                onClick={() => {
                  const sk = ordemSheetData.skills.find((s) => s.id === chosenSkill);
                  const untrainedBoost = (sk?.trainingDegree || 0) >= 5 ? 0 : 5;
                  const skName = ORDEM_SKILLS_METADATA.find((m) => m.id === chosenSkill)?.name || chosenSkill;
                  rollSkill(chosenSkill, `Manual Operacional: ${skName} (como treinado)`, untrainedBoost);
                }}
              >
                <Icon name="d20" /> Rolar como treinado
              </button>
              <button
                type="button"
                className={ZINC}
                title="Encerrar benefício no próximo interlúdio"
                onClick={() => p.onUpdateItem({ ...item, remainingCharges: 0 })}
              >
                ↺ Novo Interlúdio
              </button>
            </>
          )}
        </>
      );
    }

    case 'paraquedas': {
      const autoKnows = ordemSheetData.skills.some(
        (s) =>
          ['acrobacia', 'pilotagem', 'reflexos', 'tatica', 'profissao'].includes(s.id) &&
          (s.trainingDegree || 0) >= 10
      );
      return autoKnows ? (
        <span className="text-[11px] text-emerald-300">✓ Uso automático (Veterano)</span>
      ) : (
        <button
          type="button"
          className={ZINC}
          title="Sem veterano nas perícias exigidas (ou em queda curta): Reflexos DT 20 ou reduz queda só à metade"
          onClick={() => rollSkill('reflexos', 'Paraquedas (Reflexos DT 20)')}
        >
          <Icon name="d20" /> Abrir (Reflexos DT 20)
        </button>
      );
    }

    // -------------------- ITENS PARANORMAIS GERAIS (p. 44-45) --------------------
    case 'ligacao_infernal': {
      const effectId = `sah-ligacao-infernal-${item.id}`;
      const active = sceneEffects.some((e) => e.id === effectId);
      return active ? (
        <button
          type="button"
          className={PURPLE}
          onClick={() => {
            p.onUpdateSceneEffects?.(sceneEffects.filter((e) => e.id !== effectId));
            p.onFeedback('Ligação Direta Infernal removida do veículo (ação completa).');
          }}
        >
          ✓ Veículo animado (+5 Pilotagem) • Remover
        </button>
      ) : (
        <button
          type="button"
          className={PURPLE}
          title="Ação completa: liga veículo automaticamente (RD 20, imune a Sangue, +5 Pilotagem; falhas dobradas)"
          onClick={() => {
            p.onAddSceneEffect?.({
              id: effectId,
              name: 'Ligação Direta Infernal (+5 Pilotagem)',
              source: item.name,
              description: 'Veículo com RD 20 e imune a Sangue; +5 em Pilotagem, mas falhas têm consequências dobradas.',
              modifiers: [{ id: `mod-ligacao-pil-${item.id}`, targetType: 'skill_bonus', targetKey: 'pilotagem', value: 5 }],
            });
            p.onFeedback(
              'Ligação Direta Infernal conectada: veículo ligado com RD 20, imune a Sangue e +5 em Pilotagem!'
            );
          }}
        >
          <Icon name="zap" /> Ligar veículo (+5 Pilotagem)
        </button>
      );
    }

    case 'medidor_vertebral':
      return item.isEquipped ? (
        <span className="text-[11px] text-purple-300">
          Conectado (+2 Fortitude • +5 Medicina p/ aliados)
        </span>
      ) : (
        <button
          type="button"
          className={PURPLE}
          title="Ação completa: conecta à coluna (deixa atordoado por 1 rodada; conta como vestimenta +2 Fortitude)"
          onClick={() => {
            p.onUpdateItem({ ...item, isEquipped: true });
            p.onFeedback(
              'Medidor de Condição Vertebral conectado (+2 Fortitude; +5 em Medicina para quem auxiliar você). Você fica atordoado por 1 rodada!'
            );
          }}
        >
          <Icon name="heart-pulse" /> Conectar à coluna
        </button>
      );

    case 'valete_salvacao':
      return (
        <button
          type="button"
          className={PURPLE}
          title="Ação padrão: aponta a melhor rota de fuga em alcance médio (em perseguição, sucesso automático em cortar caminho) e se desfaz"
          onClick={() => {
            p.onConsumeUnit(item.id);
            p.onFeedback(
              'Valete da Salvação lançado ao ar (-1 un.): aponta a melhor rota de fuga em alcance médio (sucesso automático em Cortar Caminho na perseguição)!'
            );
          }}
        >
          <Icon name="sparkles" /> Atirar ao ar (Rota / Cortar Caminho)
        </button>
      );

    default:
      return null;
  }
}
