import type { DiceRollResult } from '@totalrpg/shared';

/** Faces suportadas pelo tabuleiro 3D */
export const SUPPORTED_SIDES = [4, 6, 8, 10, 12, 20] as const;
export type DieSides = (typeof SUPPORTED_SIDES)[number];

export interface StageDie {
  key: string;
  sides: number;
  value: number;
  /** Dado que entra na soma ou que foi mantido na pilha */
  kept: boolean;
  /** Dado da pilha descartado (Ordem: só o maior conta) */
  discarded: boolean;
  kind: 'base' | 'exploded' | 'extra';
  groupLabel?: string;
}

export interface StageModifier {
  label: string;
  value: number;
}

export interface StageModel {
  mode: 'pool' | 'sum';
  dice: StageDie[];
  /** Valor antes dos modificadores (dado mantido ou soma dos dados) */
  natural: number;
  modifiers: StageModifier[];
  total: number;
  keptIndex: number | null;
  /** Ameaça de crítico / 20 natural no dado mantido */
  critical: boolean;
  /** Há ataque: o rótulo vira Crítico; senão, 20 natural */
  isAttack: boolean;
  /** 1 natural no dado mantido (falha crítica de leitura) */
  fumble: boolean;
  /** Algum dado sem modelo 3D → usa o 2D */
  has3DUnsupported: boolean;
}

export function sidesOf(roll: DiceRollResult): number {
  if (roll.sides) return roll.sides;
  const m = roll.formula.match(/d(\d+)/i);
  return m ? Number(m[1]) : 20;
}

/**
 * Converte o resultado do servidor (fonte da verdade) no modelo da cena.
 * Nada aqui sorteia valores: só organiza o que o servidor mandou.
 */
export function buildStageModel(roll: DiceRollResult): StageModel {
  const sides = sidesOf(roll);
  const isPenalty = roll.formula.includes('2d20 (menor)');
  const isPool = roll.system === 'ordem-paranormal' && sides === 20;

  let keptIndex: number | null = null;
  if (isPool && roll.rolls.length > 0) {
    const target = isPenalty ? Math.min(...roll.rolls) : Math.max(...roll.rolls);
    keptIndex = roll.rolls.indexOf(target);
  }

  const dice: StageDie[] = roll.rolls.map((value, i) => ({
    key: `b${i}`,
    sides,
    value,
    kept: isPool ? i === keptIndex : true,
    discarded: isPool ? i !== keptIndex : false,
    kind: 'base',
  }));

  (roll.explodedRolls || []).forEach((value, i) => {
    dice.push({ key: `x${i}`, sides, value, kept: true, discarded: false, kind: 'exploded' });
  });

  const modifiers: StageModifier[] = [];
  (roll.extraDiceResults || []).forEach((group, g) => {
    const gm = group.formula.match(/d(\d+)/i);
    const gSides = gm ? Number(gm[1]) : 6;
    group.rolls.forEach((value, i) => {
      dice.push({
        key: `e${g}-${i}`,
        sides: gSides,
        value,
        kept: true,
        discarded: false,
        kind: 'extra',
        groupLabel: group.label,
      });
    });
  });

  const baseNatural = isPool
    ? keptIndex !== null
      ? roll.rolls[keptIndex]
      : 0
    : roll.rolls.reduce((a, b) => a + b, 0) + (roll.explodedRolls || []).reduce((a, b) => a + b, 0);

  // Nos testes de pilha, dados extras de dano não existem; nas somas eles entram como dados.
  const extrasSum = (roll.extraDiceResults || []).reduce((a, g) => a + g.subtotal, 0);
  const natural = isPool ? baseNatural : baseNatural + extrasSum;

  if (roll.modifier !== 0) modifiers.push({ label: 'Bônus', value: roll.modifier });

  const keptValue = keptIndex !== null ? roll.rolls[keptIndex] : null;
  const critMin = roll.attackDamagePayload?.critThreatMin ?? 20;
  const critical = Boolean(isPool && keptValue !== null && keptValue >= critMin);
  const fumble = Boolean(isPool && keptValue === 1);

  return {
    mode: isPool ? 'pool' : 'sum',
    dice,
    natural,
    modifiers,
    total: roll.total,
    keptIndex,
    critical,
    isAttack: Boolean(roll.attackDamagePayload),
    fumble,
    has3DUnsupported: dice.some((d) => !SUPPORTED_SIDES.includes(d.sides as DieSides)),
  };
}

/* PRNG determinístico (mulberry32) semeado pelo id da rolagem: a mesma rolagem
   anima igual em todas as telas (ficha, escudo, TV). */
export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Decide se o aparelho aguenta WebGL com folga. */
export function canUse3D(pref: 'auto' | '3d' | '2d', reducedMotion: boolean): boolean {
  if (pref === '2d' || reducedMotion) return false;
  if (typeof window === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
  } catch {
    return false;
  }
  if (pref === '3d') return true;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory ?? 8;
  if (cores <= 2 || mem <= 2) return false;
  if (cores <= 4 && mem <= 4) return false;
  return true;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'reduced'
  );
}
