import {
  RuleModifier,
  CharacterAbility,
  RPGItem,
  ActiveCondition,
  SceneEffect,
  SystemId,
  OrdemSheetData,
  OrdemAttributes,
} from './index';
import {
  computeOrdemInventoryDerivedEffects,
  OrdemCursePriceByAttr,
} from './ordemEquipmentData';

export interface ComputedBonuses {
  attributes: Record<string, number>;
  skillBonus: Record<string, number>;
  skillBonusAll: number;
  skillDice: Record<string, number>;
  skillDiceAll: number;
  vitalMax: Record<string, number>;
  defense: number;
  attackBonus: number;
  attackDiceBonus: number;
  damageBonus: number;
  meleeDamageBonus: number;
  firearmDamageBonus: number;
  loadLimit: number;
  damageResistances: Array<{ type: string; value: number; source: string }>;
  displacementBonus: number;
  ritualDtBonus: number;
  ignoresLoadPenaltySkills: string[];
  missingSkillKits: Array<{ skillId: string; skillName: string }>;
  cursePriceByAttr: Record<keyof OrdemAttributes, OrdemCursePriceByAttr | null>;
  totalCursesCarried: number;
  maxVestimentas: number;
  vestimentaLimitExceeded: boolean;
  hasFearCurse: boolean;
  effectiveProficiencies: string[];
  nonProficientProtections: Array<{ itemId: string; itemName: string; requiredLabel: string }>;
  hasProtectionProficiencyPenalty: boolean;
}

export function calculateActiveBonuses(
  system: SystemId,
  levelOrNex: number,
  abilities: CharacterAbility[],
  inventory: RPGItem[],
  conditions: ActiveCondition[],
  sceneEffects: SceneEffect[] = [],
  ordemSheetData?: Partial<OrdemSheetData>
): ComputedBonuses {
  const derived =
    system === 'ordem-paranormal'
      ? computeOrdemInventoryDerivedEffects(inventory, abilities, ordemSheetData)
      : null;

  const result: ComputedBonuses = {
    attributes: {},
    skillBonus: {},
    skillBonusAll: 0,
    skillDice: {},
    skillDiceAll: 0,
    vitalMax: {},
    defense: 0,
    attackBonus: 0,
    attackDiceBonus: 0,
    damageBonus: 0,
    meleeDamageBonus: 0,
    firearmDamageBonus: 0,
    loadLimit: 0,
    damageResistances: derived?.damageResistances || [],
    displacementBonus: derived?.displacementBonus || 0,
    ritualDtBonus: derived?.ritualDtBonus || 0,
    ignoresLoadPenaltySkills: derived?.ignoresLoadPenaltySkills || [],
    missingSkillKits: derived?.missingSkillKits || [],
    cursePriceByAttr: derived?.cursePriceByAttr || {
      agi: null,
      for: null,
      int: null,
      pre: null,
      vig: null,
    },
    totalCursesCarried: derived?.totalCursesCarried || 0,
    maxVestimentas: derived?.maxVestimentas ?? 2,
    vestimentaLimitExceeded: derived?.vestimentaLimitExceeded || false,
    hasFearCurse: derived?.hasFearCurse || false,
    effectiveProficiencies: derived?.effectiveProficiencies || [],
    nonProficientProtections: derived?.nonProficientProtections || [],
    hasProtectionProficiencyPenalty: derived?.hasProtectionProficiencyPenalty || false,
  };

  // 1. Coleta todos os modificadores ativos (Poderes ativos + Itens equipados + Derivados de Modificações/Maldições + Condições)
  const activeModifiers: RuleModifier[] = [];

  for (const ab of abilities) {
    if (ab.isActive !== false && Array.isArray(ab.modifiers)) {
      activeModifiers.push(...ab.modifiers);
    }
  }

  for (const item of inventory) {
    if (item.isEquipped && Array.isArray(item.modifiers)) {
      for (const mod of item.modifiers) {
        // Maldição Sombria: ignora penalidade de carga (ex.: -5 de Proteção Pesada em Furtividade)
        if (
          mod.targetType === 'skill_bonus' &&
          mod.value < 0 &&
          result.ignoresLoadPenaltySkills.includes(mod.targetKey.toLowerCase().trim())
        ) {
          continue;
        }
        activeModifiers.push(mod);
      }
    }
  }

  if (derived && derived.dynamicModifiers.length > 0) {
    activeModifiers.push(...derived.dynamicModifiers);
  }

  for (const cond of conditions) {
    if (Array.isArray(cond.modifiers)) {
      activeModifiers.push(...cond.modifiers);
    }
  }

  for (const eff of sceneEffects) {
    if (Array.isArray(eff.modifiers)) {
      activeModifiers.push(...eff.modifiers);
    }
  }

  // 2. Define o multiplicador de escalonamento (Nível em T20 ou Grau de NEX em Ordem: 99% = 20 graus)
  const multiplier =
    system === 'ordem-paranormal'
      ? levelOrNex === 99
        ? 20
        : Math.max(1, Math.floor(levelOrNex / 5))
      : Math.max(1, levelOrNex);

  // 3. Processa cada modificador somando no alvo correspondente
  for (const mod of activeModifiers) {
    const finalValue = mod.scaleWithLevel
      ? mod.value * (mod.scaleEvery ? Math.floor(multiplier / mod.scaleEvery) : multiplier)
      : mod.value;
    const key = mod.targetKey.toLowerCase().trim();

    switch (mod.targetType) {
      case 'attribute':
        result.attributes[key] = (result.attributes[key] || 0) + finalValue;
        break;

      case 'skill_bonus':
        if (key === 'all' || key === 'todas') {
          result.skillBonusAll += finalValue;
        } else {
          result.skillBonus[key] = (result.skillBonus[key] || 0) + finalValue;
        }
        break;

      case 'skill_dice':
        if (key === 'all' || key === 'todas') {
          result.skillDiceAll += finalValue;
        } else if (key === 'attack_all') {
          result.attackDiceBonus += finalValue;
        } else {
          result.skillDice[key] = (result.skillDice[key] || 0) + finalValue;
        }
        break;

      case 'vital_max':
        result.vitalMax[key] = (result.vitalMax[key] || 0) + finalValue;
        break;

      case 'defense':
        result.defense += finalValue;
        break;

      case 'attack_bonus':
        result.attackBonus += finalValue;
        break;

      case 'damage_bonus':
        if (key === 'melee' || key === 'corpo_a_corpo') {
          result.meleeDamageBonus += finalValue;
        } else if (key === 'firearm' || key === 'fogo') {
          result.firearmDamageBonus += finalValue;
        } else {
          result.damageBonus += finalValue;
        }
        break;

      case 'load_limit':
        result.loadLimit += finalValue;
        break;

      case 'ritual_dt':
        result.ritualDtBonus += finalValue;
        break;

      case 'displacement':
        result.displacementBonus += finalValue;
        break;
    }
  }

  // Regra específica: Engolir o Choro (Combatente — Sobrevivendo ao Horror v1.3, p. 14)
  // Neutraliza penalidades de condições em testes de Furtividade
  const hasEngolirChoro =
    system === 'ordem-paranormal' &&
    abilities.some(
      (ab) =>
        ab.isActive !== false &&
        (ab.id.toLowerCase().includes('engolir-o-choro') ||
          ab.name.toLowerCase().includes('engolir o choro'))
    );
  if (hasEngolirChoro) {
    for (const cond of conditions) {
      if (!Array.isArray(cond.modifiers)) continue;
      for (const mod of cond.modifiers) {
        const finalValue = mod.scaleWithLevel ? mod.value * multiplier : mod.value;
        if (finalValue >= 0) continue;
        const key = mod.targetKey.toLowerCase().trim();
        if (
          mod.targetType === 'skill_bonus' &&
          (key === 'furtividade' || key === 'all' || key === 'todas')
        ) {
          result.skillBonus['furtividade'] =
            (result.skillBonus['furtividade'] || 0) + Math.abs(finalValue);
        } else if (
          mod.targetType === 'skill_dice' &&
          (key === 'furtividade' || key === 'all' || key === 'todas' || key === 'agi')
        ) {
          result.skillDice['furtividade'] =
            (result.skillDice['furtividade'] || 0) + Math.abs(finalValue);
        } else if (mod.targetType === 'attribute' && key === 'agi') {
          result.skillDice['furtividade'] =
            (result.skillDice['furtividade'] || 0) + Math.abs(finalValue);
        }
      }
    }
  }

  // Regra específica: Tanque de Guerra (Combatente, p. 26)
  // Se possuir Tanque de Guerra ativo E estiver usando uma Proteção Pesada equipada, soma +2 na Defesa
  const hasTanqueGuerra = abilities.some(
    (ab) =>
      ab.isActive !== false &&
      (ab.id.toLowerCase().includes('tanque-guerra') ||
        ab.name.toLowerCase().includes('tanque de guerra'))
  );
  const hasHeavyArmorEquipped = inventory.some(
    (it) =>
      it.isEquipped &&
      (it.name.toLowerCase().includes('proteção pesada') ||
        it.name.toLowerCase().includes('protecao pesada'))
  );
  if (hasTanqueGuerra && hasHeavyArmorEquipped) {
    result.defense += 2;
  }

  return result;
}