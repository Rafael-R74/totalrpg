import {
  RuleModifier,
  CharacterAbility,
  RPGItem,
  ActiveCondition,
  SystemId,
} from './index';

export interface ComputedBonuses {
  attributes: Record<string, number>;
  skillBonus: Record<string, number>;
  skillBonusAll: number;
  skillDice: Record<string, number>;
  skillDiceAll: number;
  vitalMax: Record<string, number>;
  defense: number;
  attackBonus: number;
  damageBonus: number;
  loadLimit: number;
}

export function calculateActiveBonuses(
  system: SystemId,
  levelOrNex: number,
  abilities: CharacterAbility[],
  inventory: RPGItem[],
  conditions: ActiveCondition[]
): ComputedBonuses {
  const result: ComputedBonuses = {
    attributes: {},
    skillBonus: {},
    skillBonusAll: 0,
    skillDice: {},
    skillDiceAll: 0,
    vitalMax: {},
    defense: 0,
    attackBonus: 0,
    damageBonus: 0,
    loadLimit: 0,
  };

  // 1. Coleta todos os modificadores ativos (Poderes ativos + Itens equipados + Condições)
  const activeModifiers: RuleModifier[] = [];

  for (const ab of abilities) {
    if (ab.isActive !== false && Array.isArray(ab.modifiers)) {
      activeModifiers.push(...ab.modifiers);
    }
  }

  for (const item of inventory) {
    if (item.isEquipped && Array.isArray(item.modifiers)) {
      activeModifiers.push(...item.modifiers);
    }
  }

  for (const cond of conditions) {
    if (Array.isArray(cond.modifiers)) {
      activeModifiers.push(...cond.modifiers);
    }
  }

  // 2. Define o multiplicador de escalonamento (Nível em T20 ou Grau de NEX em Ordem)
  const multiplier =
    system === 'ordem-paranormal'
      ? Math.max(1, Math.floor(levelOrNex / 5))
      : Math.max(1, levelOrNex);

  // 3. Processa cada modificador somando no alvo correspondente
  for (const mod of activeModifiers) {
    const finalValue = mod.scaleWithLevel ? mod.value * multiplier : mod.value;
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
        result.damageBonus += finalValue;
        break;

      case 'load_limit':
        result.loadLimit += finalValue;
        break;
    }
  }

  return result;
}