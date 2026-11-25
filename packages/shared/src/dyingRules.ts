/**
 * Ordem Paranormal v1.3, p. 311 (com a errata):
 * - Reduzido a 0 PV → adquire as condições inconsciente e morrendo.
 * - Inconsciente acaba com qualquer efeito que cure pelo menos 1 PV.
 * - Morrendo só acaba com Medicina (DT 20) ou efeitos específicos (o mestre retira).
 * - Se iniciar três turnos morrendo na mesma cena (não necessariamente seguidos), morre.
 *
 * Estado guardado na ficha (sheetData):
 * - dyingTurns: turnos iniciados morrendo nesta cena (0–3). Zera ao encerrar a cena.
 * - deathAt: momento da morte (timestamp) ou null.
 */
import type { ActiveCondition } from './index';

export const DYING_TURNS_TO_DIE = 3;

function normalizeName(name: string | undefined | null): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function isDyingCondition(cond: Pick<ActiveCondition, 'name'> | null | undefined): boolean {
  return normalizeName(cond?.name) === 'morrendo';
}

export function isUnconsciousCondition(cond: Pick<ActiveCondition, 'name'> | null | undefined): boolean {
  return normalizeName(cond?.name) === 'inconsciente';
}

export function hasDyingCondition(conditions: ActiveCondition[] | undefined | null): boolean {
  return Array.isArray(conditions) && conditions.some(isDyingCondition);
}

/**
 * Apego Angustiado (Sobrevivendo ao Horror v1.3, p. 14):
 * Não fica inconsciente por estar morrendo; ao terminar/iniciar turno nessa condição e consciente, perde 2 SAN.
 */
export function hasApegoAngustiado(
  abilities?: Array<{ id?: string; name?: string; isActive?: boolean }> | null
): boolean {
  if (!Array.isArray(abilities)) return false;
  return abilities.some((ab) => {
    if (ab.isActive === false) return false;
    const idNorm = (ab.id || '').toLowerCase();
    const nameNorm = normalizeName(ab.name);
    return idNorm.includes('apego-angustiado') || nameNorm.includes('apego angustiado');
  });
}

export const DYING_CONDITION_DESCRIPTION =
  'Com 0 pontos de vida. Se iniciar três turnos morrendo na mesma cena (não necessariamente seguidos), o personagem morre. A condição só termina com um teste de Medicina (DT 20, +5 por vez que já foi estabilizado na cena) ou por efeitos específicos.';

export const UNCONSCIOUS_CONDITION_DESCRIPTION =
  'O personagem fica indefeso e não pode fazer ações. Termina com qualquer efeito que cure pelo menos 1 ponto de vida.';

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Morrendo em si não dá penalidade: o indefeso vem de inconsciente. */
export function createDyingCondition(): ActiveCondition {
  return {
    id: randomId('morrendo'),
    name: 'Morrendo',
    description: DYING_CONDITION_DESCRIPTION,
    modifiers: [],
  };
}

export function createUnconsciousCondition(): ActiveCondition {
  return {
    id: randomId('inconsciente'),
    name: 'Inconsciente',
    description: UNCONSCIOUS_CONDITION_DESCRIPTION,
    modifiers: [{ id: 'c-incons', targetType: 'defense', targetKey: 'defense', value: -10 }],
  };
}

export type ZeroHpTransition = 'fell' | 'recovered' | null;

/**
 * Aplica a regra dos 0 PV a uma mudança de PV (só em Ordem Paranormal).
 * - Caiu de >0 para 0: adiciona morrendo e inconsciente (as que ainda não estiverem lá).
 * - Saiu de 0 para 1+: remove inconsciente; morrendo continua (só o mestre/Medicina tira).
 * Fora dessas passagens nada muda: se o mestre retirar uma condição com o personagem
 * ainda em 0 PV (ex.: um poder diz o contrário), ela não volta sozinha.
 */
export function applyZeroHpRule(
  system: string,
  prevPv: number,
  nextPv: number,
  conditions: ActiveCondition[] | undefined | null,
  options?: { skipUnconscious?: boolean }
): { conditions: ActiveCondition[]; transition: ZeroHpTransition } {
  const current = Array.isArray(conditions) ? conditions : [];
  if (system !== 'ordem-paranormal' || prevPv === nextPv) return { conditions: current, transition: null };

  if (prevPv > 0 && nextPv <= 0) {
    const next = [...current];
    if (!next.some(isDyingCondition)) next.push(createDyingCondition());
    if (!options?.skipUnconscious && !next.some(isUnconsciousCondition)) {
      next.push(createUnconsciousCondition());
    }
    return { conditions: next, transition: 'fell' };
  }

  if (prevPv <= 0 && nextPv >= 1) {
    if (!current.some(isUnconsciousCondition)) return { conditions: current, transition: 'recovered' };
    return { conditions: current.filter((c) => !isUnconsciousCondition(c)), transition: 'recovered' };
  }

  return { conditions: current, transition: null };
}

/** PV atual da barra 'pv' (0 se não houver). */
export function currentPvOf(vitals: Array<{ id: string; current: number }> | undefined | null): number {
  const bar = Array.isArray(vitals) ? vitals.find((v) => v.id === 'pv') : undefined;
  return bar ? Number(bar.current) || 0 : 0;
}

export function dyingTurnsOf(sheetData: unknown): number {
  const n = Number((sheetData as { dyingTurns?: unknown } | null)?.dyingTurns ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.min(DYING_TURNS_TO_DIE, Math.floor(n))) : 0;
}

export function deathAtOf(sheetData: unknown): number | null {
  const v = (sheetData as { deathAt?: unknown } | null)?.deathAt;
  return typeof v === 'number' && v > 0 ? v : null;
}
