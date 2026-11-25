import type { CharacterAbility, RPGItem } from './index';

/**
 * Regras do suplemento Sobrevivendo ao Horror que a ficha, o escudo e a conjuração compartilham.
 */

function hasActiveAbility(abilities: CharacterAbility[] | undefined, idPart: string, namePart: string): boolean {
  return (abilities || []).some(
    (ab) =>
      ab.isActive !== false &&
      ((ab.id || '').toLowerCase().includes(idPart) || (ab.name || '').toLowerCase().includes(namePart))
  );
}

/**
 * Olhar Sinistro (Ocultista, SaH p. 26): pode usar Presença no lugar de Intelecto em Ocultismo.
 * Devolve o atributo efetivo (o maior dos dois, quando o poder está presente).
 */
export function getOrdemOcultismoAttr(
  abilities: CharacterAbility[] | undefined,
  intValue: number,
  preValue: number
): { attr: 'int' | 'pre'; value: number; olharSinistro: boolean } {
  const has = hasActiveAbility(abilities, 'olhar-sinistro', 'olhar sinistro');
  if (has && preValue > intValue) return { attr: 'pre', value: preValue, olharSinistro: true };
  return { attr: 'int', value: intValue, olharSinistro: has };
}

/** Domínio Esotérico (Ocultista, SaH p. 26): até 2 catalisadores diferentes no mesmo ritual. */
export function hasDominioEsoterico(abilities: CharacterAbility[] | undefined): boolean {
  return hasActiveAbility(abilities, 'dominio-esoterico', 'domínio esotérico');
}

// ---------------------------------------------------------------------------
// Catalisadores Ritualísticos (SaH p. 44): consumidos ao conjurar, um por ritual.

export type CatalystType = 'ampliador' | 'perturbador' | 'potencializador' | 'prolongador';

export const CATALYST_INFO: Record<CatalystType, { label: string; effect: string }> = {
  ampliador: { label: 'Ampliador', effect: 'alcance +1 passo ou área dobrada' },
  perturbador: { label: 'Perturbador', effect: 'DT para resistir +2' },
  potencializador: { label: 'Potencializador', effect: 'dano +1 dado do mesmo tipo' },
  prolongador: { label: 'Prolongador', effect: 'duração dobrada (não vale para instantâneo ou sustentado)' },
};

export function getCatalystType(item: Pick<RPGItem, 'name'> | null | undefined): CatalystType | null {
  const n = (item?.name || '').toLowerCase();
  if (!n.includes('catalisador')) return null;
  return (Object.keys(CATALYST_INFO) as CatalystType[]).find((t) => n.includes(t)) || null;
}

/** Elemento do catalisador: campo `element` ou o "(Sangue)" do nome. */
export function getCatalystElement(item: Pick<RPGItem, 'name' | 'element'> | null | undefined): string {
  if (item?.element) return item.element;
  return (item?.name || '').match(/\((Sangue|Morte|Conhecimento|Energia|Medo)\)/i)?.[1] || '';
}

/** "3d6+2" -> "4d6+2" (Potencializador). Fórmulas sem dado ficam iguais. */
export function addOneDieToFormula(formula: string): string {
  return formula.replace(/(\d*)d(\d+)/i, (_m, count, sides) => `${(Number(count) || 1) + 1}d${sides}`);
}
