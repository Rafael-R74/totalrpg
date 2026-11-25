import {
  CharacterAbility,
  CompendiumEntryData,
  ComputedBonuses,
  ORDEM_SKILLS_METADATA,
  OrdemSheetData,
  RPGItem,
  SceneEffect,
} from '@totalrpg/shared';

/**
 * Base comum dos controles de poderes do Sobrevivendo ao Horror na aba Poderes.
 * Cada bloco de poderes do suplemento tem seu arquivo (SahCombatentePowers, SahEspecialistaPowers...)
 * e o SheetExtras só renderiza os componentes, passando estas props.
 */

export interface FlashbackChoice {
  originId: string;
  meta: Partial<import('@totalrpg/shared').OrdemOriginMeta>;
  inventorRitualId?: string;
}

export interface SahPowerProps {
  ab: CharacterAbility;
  sheet: OrdemSheetData;
  abilities: CharacterAbility[];
  inventory: RPGItem[];
  bonuses: ComputedBonuses;
  compendiumEntries: CompendiumEntryData[];
  allowedSources?: string[] | null;
  isInCampaign: boolean;
  isEditMode: boolean;
  campaignId?: string;
  characterId?: string;
  characterName?: string;
  /** `extraDice`: dados que não são d20 somados ao teste (ex.: +1d6 de Minha Dor me Impulsiona) */
  onRoll: (
    label: string,
    count: number,
    sides: number,
    modifier: number,
    extraDice?: Array<{ count: number; sides: number; label: string }>
  ) => void;
  onSpendResource: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onAddSceneEffect?: (effect: SceneEffect) => void;
  onUpdateSceneEffects?: (effects: SceneEffect[]) => void;
  onGrantTempPe?: (amount: number, reason?: string) => void;
  onLoseSanity?: (amount: number, reason: string) => void;
  /** Dano sofrido nos PV (máximo - atual), para poderes que exigem estar ferido */
  pvDamageTaken?: number;
  onUpdateAbilities: (abilities: CharacterAbility[]) => void;
  onApplyFlashback?: (choice: FlashbackChoice | null) => void;
  onFeedback: (msg: string) => void;
}

/** Identifica qual poder controlado é a habilidade (por id ou nome) e devolve o slug. */
export function matchSahPower(
  ab: CharacterAbility,
  prefix: string,
  powers: Array<{ slug: string; name: string }>
): string | null {
  const id = (ab.id || '').toLowerCase();
  const name = (ab.name || '').toLowerCase();
  const hit = powers.find((p) => id.includes(`${prefix}${p.slug}`) || name.startsWith(p.name));
  return hit ? hit.slug : null;
}

export const SAH_BTN =
  'px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5';
export const SAH_BTN_AMBER = `${SAH_BTN} bg-amber-950/70 hover:bg-amber-700 text-amber-200 hover:text-white border-amber-700`;
export const SAH_BTN_NEUTRAL = `${SAH_BTN} bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700`;
export const SAH_BTN_ACTIVE = `${SAH_BTN} bg-amber-600 hover:bg-amber-700 text-white border-amber-300`;
export const SAH_USED =
  'px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-500 rounded-lg text-xs font-bold whitespace-nowrap';

export type OrdemAttrKey = keyof OrdemSheetData['attributes'];

export function attrValue(p: SahPowerProps, key: OrdemAttrKey): number {
  return Number(p.sheet.attributes[key] || 0) + (p.bonuses.attributes[key] || 0);
}

/** Dados e modificador de um teste de perícia (opcionalmente com outro atributo-base). */
export function skillRollParts(
  p: SahPowerProps,
  skillId: string,
  opts?: { attr?: OrdemAttrKey; extraDice?: number; extraMod?: number }
): { dice: number; mod: number } {
  const meta = ORDEM_SKILLS_METADATA.find((m) => m.id === skillId);
  const sk = p.sheet.skills.find((s) => s.id === skillId);
  const attr = opts?.attr || ((meta?.attribute || 'int') as OrdemAttrKey);
  return {
    dice:
      attrValue(p, attr) +
      p.bonuses.skillDiceAll +
      (p.bonuses.skillDice[skillId] || 0) +
      (opts?.extraDice || 0),
    mod:
      (sk?.trainingDegree || 0) +
      (sk?.otherModifier || 0) +
      p.bonuses.skillBonusAll +
      (p.bonuses.skillBonus[skillId] || 0) +
      (opts?.extraMod || 0),
  };
}

export function rollSkill(
  p: SahPowerProps,
  skillId: string,
  label: string,
  opts?: { attr?: OrdemAttrKey; extraDice?: number; extraMod?: number }
) {
  const { dice, mod } = skillRollParts(p, skillId, opts);
  p.onRoll(label, dice, 20, mod);
}

/** Marcador "1x/Cena" só vale dentro de uma mesa (fora dela não há cena para encerrar). */
export function usedInScene(p: SahPowerProps, effectId: string): boolean {
  return Boolean(p.isInCampaign && (p.sheet.sceneEffects || []).some((e) => e.id === effectId));
}

export function hasSceneEffect(p: SahPowerProps, effectId: string): boolean {
  return (p.sheet.sceneEffects || []).some((e) => e.id === effectId);
}
