import type { CharacterAbility, CompendiumEntryData, RPGItem } from './index';
import { ORDEM_COMPENDIUM_ENTRIES } from './ordemCompendiumData';
import { ORDEM_TRAILS } from './wizardData';

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

// ---------------------------------------------------------------------------
// Poderes gerais (SaH p. 33-36)

/** Poder geral: disponível para todas as classes (marcado no compêndio ou pelo prefixo do id). */
export function isOrdemGeneralPower(entry: Pick<CompendiumEntryData, 'id' | 'category' | 'metadata'>): boolean {
  if (entry.category !== 'power') return false;
  return Boolean(entry.metadata?.isGeneralPower) || entry.id.startsWith('sah-pwr-gen-');
}

/** Perícia que o poder geral treina ("recebe treinamento em X ou, se já for treinado, +2"). */
export function getGeneralPowerTrainedSkill(ab: Pick<CharacterAbility, 'id' | 'name'> & { chosenSkill?: string }): string | null {
  return getGrantedTraining(ab)?.skill || null;
}

/**
 * Treino concedido por um poder: perícia e bônus quando ela já é treinada
 * (+2 padrão; Mascate 0; Laboratório de Campo +5; Carteirada usa a perícia escolhida).
 */
export function getGrantedTraining(
  ab: Pick<CharacterAbility, 'id' | 'name'> & { chosenSkill?: string }
): { skill: string; bonus: number } | null {
  const id = (ab.id || '').toLowerCase();
  // Carteirada (Agente Secreto 10%): Diplomacia ou Enganação, à escolha
  if (/^(?:trail|versatility)-agente_secreto-10$/.test(id)) {
    return ab.chosenSkill === 'diplomacia' || ab.chosenSkill === 'enganacao' ? { skill: ab.chosenSkill, bonus: 2 } : null;
  }
  const name = (ab.name || '').trim().toLowerCase();
  const entry = ORDEM_COMPENDIUM_ENTRIES.find(
    (e) => e.metadata?.grantsSkillTraining && (id.startsWith(e.id) || name === e.name.toLowerCase())
  );
  if (entry?.metadata?.grantsSkillTraining) return { skill: entry.metadata.grantsSkillTraining, bonus: 2 };
  // Poderes de trilha (ex.: Rastrear o Paranormal, Revelação do Mal): ids trail-<trilha>-<nex>
  const m = id.match(/^(?:trail|versatility)-([a-z0-9_]+)-(\d+)$/);
  if (m) {
    const tp = ORDEM_TRAILS.find((t) => t.id === m[1])?.powers.find((p) => String(p.nex) === m[2]);
    if (tp?.grantsSkillTraining) return { skill: tp.grantsSkillTraining, bonus: tp.trainingBonus ?? 2 };
  }
  return null;
}

/**
 * Aplica o "treina ou +2" dos poderes gerais quando habilidades entram ou saem da ficha.
 * - Entrou: se a perícia não é treinada, vira treinada (trainingGranted = true); senão ganha +2 no próprio poder.
 * - Saiu: desfaz o treinamento que ele deu.
 */
export function applyGeneralPowerSkillGrants<S extends { id: string; trainingDegree: number }>(
  prevAbilities: CharacterAbility[],
  nextAbilities: CharacterAbility[],
  skills: S[]
): { abilities: CharacterAbility[]; skills: S[]; changed: boolean } {
  let nextSkills = skills;
  let changed = false;
  const prevIds = new Set(prevAbilities.map((a) => a.id));
  const nextIds = new Set(nextAbilities.map((a) => a.id));

  // Removidos: desfaz o treino concedido
  for (const ab of prevAbilities) {
    if (nextIds.has(ab.id) || !ab.trainingGranted) continue;
    const skillId = getGeneralPowerTrainedSkill(ab);
    if (!skillId) continue;
    nextSkills = nextSkills.map((s) => (s.id === skillId && s.trainingDegree === 5 ? { ...s, trainingDegree: 0 } : s));
    changed = true;
  }

  // Novos (ou que acabaram de ter a perícia escolhida): treina ou +bônus
  void prevIds;
  const abilities = nextAbilities.map((ab) => {
    if (ab.trainingGranted !== undefined) return ab;
    const grant = getGrantedTraining(ab);
    if (!grant) return ab;
    const skillId = grant.skill;
    changed = true;
    const sk = nextSkills.find((s) => s.id === skillId);
    if (!sk || sk.trainingDegree < 5) {
      nextSkills = nextSkills.map((s) => (s.id === skillId ? { ...s, trainingDegree: 5 } : s));
      return { ...ab, trainingGranted: true };
    }
    if (grant.bonus <= 0) return { ...ab, trainingGranted: false };
    return {
      ...ab,
      trainingGranted: false,
      isActive: true,
      modifiers: [
        ...(ab.modifiers || []).filter((m) => m.id !== `gen-train-bonus-${skillId}`),
        { id: `gen-train-bonus-${skillId}`, targetType: 'skill_bonus' as const, targetKey: skillId, value: grant.bonus },
      ],
    };
  });
  return { abilities, skills: nextSkills, changed };
}

/**
 * Atributo efetivo de uma perícia quando um poder permite trocar:
 * - Ocultismo: Presença no lugar de Intelecto (Olhar Sinistro);
 * - Vontade: Intelecto no lugar de Presença (Racionalidade Inflexível).
 * Só troca quando o atributo alternativo é maior.
 */
export function getOrdemSkillAttrOverride(
  skillId: string,
  abilities: CharacterAbility[] | undefined,
  attrs: { int: number; pre: number }
): { attr: 'int' | 'pre'; source: string } | null {
  if (skillId === 'ocultismo') {
    const r = getOrdemOcultismoAttr(abilities, attrs.int, attrs.pre);
    return r.attr === 'pre' ? { attr: 'pre', source: 'Olhar Sinistro' } : null;
  }
  // Bibliotecário 99% (A Força do Saber): a perícia escolhida passa a usar Intelecto
  if ((abilities || []).some((ab) => ab.id === 'trail-bibliotecario-99' && ab.chosenSkill === skillId)) {
    return { attr: 'int', source: 'A Força do Saber' };
  }
  if (skillId === 'vontade' && attrs.int > attrs.pre && hasActiveAbility(abilities, 'racionalidade-inflexivel', 'racionalidade inflexível')) {
    return { attr: 'int', source: 'Racionalidade Inflexível' };
  }
  return null;
}

export function hasInventarioOrganizado(abilities: CharacterAbility[] | undefined): boolean {
  return hasActiveAbility(abilities, 'inventario-organizado', 'inventário organizado');
}

/** Poderes de classe reclassificados como gerais no SaH (p. 33): nome antigo -> nome novo. */
export const ORDEM_RENAMED_POWERS: Record<string, string> = {
  'Artista Marcial (Combatente/Especialista)': 'Artista Marcial (Geral)',
  'Combater com Duas Armas (Combatente)': 'Combater com Duas Armas (Geral)',
  'Saque Rápido (Combatente)': 'Saque Rápido (Geral)',
  'Tiro Certeiro (Combatente)': 'Tiro Certeiro (Geral)',
};

// ---------------------------------------------------------------------------
// Possuído (Ocultista, SaH p. 27-28): Pontos de Possessão (PP)

export interface PossessionInfo {
  active: boolean;
  max: number;
  current: number;
  /** PP recuperados por ação de interlúdio dormir (1; 2 a partir de As Sombras Dentro de Mim, 40%) */
  perSleep: number;
  /** Limite de PP gastos por turno = Presença */
  spendLimit: number;
}

export function getPossessionInfo(
  sheet: { trail?: string; transcendedCount?: number; possessionPoints?: number; abilities?: CharacterAbility[] } | null | undefined,
  presence: number
): PossessionInfo {
  const abilities = sheet?.abilities || [];
  const has = (nex: number) => abilities.some((a) => a.id === `trail-possuido-${nex}`);
  const active = sheet?.trail === 'possuido' || has(10);
  const max = 3 + 2 * Math.max(0, Number(sheet?.transcendedCount || 0));
  const raw = sheet?.possessionPoints;
  const current = typeof raw === 'number' ? Math.max(0, Math.min(max, raw)) : max;
  return { active, max, current, perSleep: has(40) ? 2 : 1, spendLimit: Math.max(0, presence) };
}

/**
 * Turnos morrendo até a morte: 3 (regra base) ou 4 para Monstruoso de Morte a partir do 40% (Ser Macabro).
 */
export function getDyingTurnsToDie(abilities: CharacterAbility[] | undefined): number {
  const list = abilities || [];
  const morte = list.some((a) => a.id === 'trail-monstruoso-10' && (a.chosenElement || '').toLowerCase() === 'morte');
  return morte && list.some((a) => a.id === 'trail-monstruoso-40') ? 4 : 3;
}
