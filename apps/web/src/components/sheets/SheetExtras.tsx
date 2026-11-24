import { useState, useEffect, useMemo } from 'react';
import {
  SystemId,
  PreparedAttack,
  CharacterAbility,
  RPGItem,
  SceneEffect,
  CompendiumEntryData,
  ComputedBonuses,
  OrdemSheetData,
  ORDEM_ORIGINS,
  ORDEM_PATENTS,
  checkOrdemPowerRequirements,
  parseOrdemRitualForms,
  OrdemRitualCastForm,
  findOrdemRitualDef,
  isOrdemRitualAlreadyOwned,
  createKnownRitualsKeySet,
  getOrdemRitualDT,
  getOrdemRitualPeLimit,
  getOrdemCircleBaseCost,
  getOrdemPeLimit,
  getOrdemAtaqueEspecialMaxTier,
  boostCritMultiplier,
  boostCritRangeBySteps,
  AttackDamageRollPayload,
  ForcaOpressoraRollPayload,
  SegurarGatilhoPayload,
  CursePricePrompt,
  parseCritRange,
  classifyOrdemWeapon,
  isOrdemCompendiumItemParanormal,
  isOrdemItemParanormal,
  isOrdemItemWeaponEntry,
  inferOrdemItemKind,
  getOrdemItemEffectiveSlots,
  getOrdemItemEffectiveCategory,
  computeOrdemWeaponBonusesFromItem,
  doubleCritThreatRange,
  findOrdemModificationDef,
  findOrdemCurseDef,
  ORDEM_ACCESSORY_ELIGIBLE_SKILLS,
  OrdemElement,
  CharacterPersonalProfile,
  checkOrdemWeaponProficiency,
  checkOrdemProtectionProficiency,
  SessionActivityCategory,
  SessionActivityLogEntry,
} from '@totalrpg/shared';
import { ImageUploadField } from '../ImageUploadField';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { InventoryItemActionBar } from './InventoryItemActionBar';
import { CharacterPersonalTab } from './CharacterPersonalTab';
import { applyCampaignSceneEffect, fetchCampaignTradeTargets } from '../../services/api';

import { Icon, stripEmoji } from '../ui/Icon';
interface SheetExtrasProps {
  system: SystemId;
  ordemSheetData?: OrdemSheetData;
  isInCampaign?: boolean;
  campaignId?: string;
  characterId?: string;
  characterName?: string;
  bonuses: ComputedBonuses;
  compendiumEntries: CompendiumEntryData[];
  isEditMode: boolean;
  canEditInventory: boolean;
  canEditAbilities: boolean;
  canCreateCustom: boolean;
  canTrade?: boolean;
  attacks: PreparedAttack[];
  abilities: CharacterAbility[];
  inventory: RPGItem[];
  maxLoadSlots: number;
  personalProfile?: CharacterPersonalProfile;
  canEditPersonal?: boolean;
  onUpdatePersonalProfile?: (next: CharacterPersonalProfile) => void;
  onUpdateAttacks: (attacks: PreparedAttack[]) => void;
  onUpdateAbilities: (abilities: CharacterAbility[]) => void;
  onUpdateInventory: (inventory: RPGItem[]) => void;
  onAddItemAndAttack: (newItem: RPGItem, newAttack?: PreparedAttack) => void;
  onInitiateTradeItem?: (item: RPGItem) => void;
  onCheckResource?: (amount: number, powerLabel?: string) => boolean;
  onSpendResource: (amount: number, extraSceneEffect?: SceneEffect) => boolean;
  onHealPv?: (amount: number, reason?: string) => void;
  onTakePvDamage?: (amount: number, reason?: string) => void;
  onGrantTempPe?: (amount: number, reason?: string) => void;
  onLoseSanity?: (amount: number, reason: string) => void;
  onAddSceneEffect?: (effect: SceneEffect) => void;
  onRoll: (
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isDamage?: boolean,
    attackDamagePayload?: AttackDamageRollPayload,
    forcaOpressoraPayload?: ForcaOpressoraRollPayload,
    extraRollOpts?: {
      explodingDieSide?: number;
      extraDice?: Array<{ count: number; sides: number; label: string }>;
      cursePricePrompt?: CursePricePrompt;
    }
  ) => void;
  onCastOrdemRitual?: (
    ritual: CharacterAbility,
    form: OrdemRitualCastForm,
    castOptions?: {
      usePoderDoFlagelo?: boolean;
      camuflar?: boolean;
      ampliar?: boolean;
      acelerar?: boolean;
    }
  ) => void;
  onUpdateSceneEffects?: (effects: SceneEffect[]) => void;
  onTriggerOriginSpecial?: (originId: string) => void;
  vislumbresSuccessPending?: boolean;
  onRollVislumbresPe?: () => void;
  hasActiveInitiativeOrder?: boolean;
  turnResetSignal?: number;
  onLogActivity?: (entry: {
    category: SessionActivityCategory;
    summary: string;
    details?: string;
    costText?: string;
    tone?: SessionActivityLogEntry['tone'];
  }) => void;
}

function parseDiceFormula(formula: string): { count: number; sides: number; modifier: number } {
  const clean = formula.toLowerCase().replace(/\s+/g, '');
  const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    return { count: 1, sides: 6, modifier: 0 };
  }
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

function isHealingConsumableItem(name: string, description?: string): boolean {
  const lowerName = (name || '').toLowerCase();
  if (
    lowerName.includes('cicatrizante') ||
    lowerName.includes('spray médico') ||
    lowerName.includes('spray medico')
  ) {
    return true;
  }
  const lowerDesc = (description || '').toLowerCase();
  const hasHealPattern =
    /(?:curar|cura|recupera)\s+\d+d\d+/i.test(lowerDesc) && /\bpv\b/i.test(lowerDesc);
  const looksLikeWeapon = /alcance|impacto|corte|perfura|bal[ií]stic|cr[ií]tic/i.test(lowerDesc);
  return hasHealPattern && !looksLikeWeapon;
}

function getConsumableHealFormula(
  item: RPGItem,
  compendiumEntries: CompendiumEntryData[]
): string | null {
  const compMatch = compendiumEntries.find(
    (ce) =>
      ce.category === 'item' &&
      (ce.name.toLowerCase() === item.name.toLowerCase() ||
        item.name.toLowerCase().includes(ce.name.toLowerCase()))
  );
  const combinedDesc = item.description || compMatch?.description || '';
  if (!isHealingConsumableItem(item.name, combinedDesc)) {
    return null;
  }
  const descMatch = combinedDesc.match(
    /(?:curar|cura|recupera)\s+(\d+d\d+(?:\s*[+-]\s*\d+)?)/i
  );
  if (descMatch) {
    return descMatch[1].replace(/\s+/g, '');
  }
  if (compMatch?.metadata?.damageFormula) {
    return compMatch.metadata.damageFormula;
  }
  return '2d8+2';
}

function rollRitualWeaponDamageExtras(
  isMelee: boolean,
  sceneEffects: SceneEffect[]
): { totalBonus: number; labels: string[] } {
  let totalBonus = 0;
  const labels: string[] = [];

  for (const ef of sceneEffects) {
    const lowerName = (ef.name || '').toLowerCase();
    const lowerDesc = `${ef.name || ''} ${ef.description || ''}`.toLowerCase();

    if (lowerName.includes('amaldiçoar arma') || lowerName.includes('amaldicoar arma')) {
      const dice = lowerDesc.includes('verdadeiro')
        ? 4
        : lowerDesc.includes('discente')
        ? 2
        : 1;
      let sum = 0;
      for (let i = 0; i < dice; i++) {
        sum += Math.floor(Math.random() * 6) + 1;
      }
      totalBonus += sum;
      labels.push(`Amaldiçoar Arma +${dice}d6: +${sum}`);
    } else if (
      isMelee &&
      lowerName.includes('chamas do caos') &&
      (lowerDesc.includes('chamejar') || lowerDesc.includes('+1d6'))
    ) {
      const roll = Math.floor(Math.random() * 6) + 1;
      totalBonus += roll;
      labels.push(`Chamas do Caos +1d6: +${roll}`);
    } else if (
      isMelee &&
      lowerName.includes('descarnar') &&
      (lowerDesc.includes('verdadeiro') || lowerDesc.includes('4d8'))
    ) {
      let sum = 0;
      for (let i = 0; i < 4; i++) {
        sum += Math.floor(Math.random() * 8) + 1;
      }
      totalBonus += sum;
      labels.push(`Descarnar (Verd.) +4d8: +${sum}`);
    }
  }

  return { totalBonus, labels };
}

export function SheetExtras({
  system,
  ordemSheetData,
  isInCampaign = false,
  campaignId,
  characterId,
  characterName,
  bonuses,
  compendiumEntries,
  isEditMode,
  canEditInventory,
  canEditAbilities,
  canCreateCustom,
  canTrade,
  attacks,
  abilities,
  inventory,
  maxLoadSlots,
  personalProfile,
  canEditPersonal,
  onUpdatePersonalProfile,
  onUpdateAttacks,
  onUpdateAbilities,
  onUpdateInventory,
  onAddItemAndAttack,
  onInitiateTradeItem,
  onCheckResource,
  onSpendResource,
  onHealPv,
  onTakePvDamage,
  onGrantTempPe,
  onLoseSanity,
  onAddSceneEffect,
  onRoll,
  onCastOrdemRitual,
  onUpdateSceneEffects,
  onTriggerOriginSpecial,
  vislumbresSuccessPending,
  onRollVislumbresPe,
  hasActiveInitiativeOrder,
  turnResetSignal,
  onLogActivity,
}: SheetExtrasProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'combat' | 'powers' | 'spells' | 'inventory' | 'personal'
  >('combat');

  const normOrigin = (ordemSheetData?.origin || '').trim().toLowerCase();
  const originObj = ORDEM_ORIGINS.find(
    (o) => o.id === normOrigin || o.name.toLowerCase() === normOrigin
  );
  const originId = originObj?.id || '';
  const hasFerramentasParanormais = abilities.some(
    (ab) =>
      ab.isActive !== false &&
      (ab.id === 'ord-pwr-ocu-ferramentas-paranormais' ||
        ab.name.toLowerCase().includes('ferramentas paranormais'))
  );
  const hasMochilaUtilidades = abilities.some((ab) =>
    ab.name.toLowerCase().includes('mochila de utilidades')
  );

  // Detecção de Habilidades, Poderes e Trilhas de Combatente (Livro v1.3, p. 24-27)
  const isOrdemSystem = system === 'ordem-paranormal' && Boolean(ordemSheetData);
  const ordemNex = ordemSheetData?.nex ?? 5;
  const effFor = isOrdemSystem
    ? (ordemSheetData!.attributes.for || 0) + (bonuses.attributes['for'] || 0)
    : 0;
  const effAgi = isOrdemSystem
    ? (ordemSheetData!.attributes.agi || 0) + (bonuses.attributes['agi'] || 0)
    : 0;
  const effInt = isOrdemSystem
    ? (ordemSheetData!.attributes.int || 0) + (bonuses.attributes['int'] || 0)
    : 0;
  const peTurnLimit = isOrdemSystem
    ? getOrdemPeLimit(ordemNex, ordemSheetData!.origin, abilities)
    : 20;

  const hasAtaqueEspecial =
    isOrdemSystem &&
    (ordemSheetData!.characterClass === 'combatente' ||
      abilities.some((a) => a.name.toLowerCase().includes('ataque especial')));
  const maxAeTotalBonus = isOrdemSystem
    ? getOrdemAtaqueEspecialMaxTier(ordemNex).totalBonus
    : 5;

  const combateDefensivoAb = abilities.find(
    (a) =>
      a.id === 'ord-pwr-comb-defensivo' ||
      a.name.toLowerCase().includes('combate defensivo')
  );
  const duasArmasAb = abilities.find(
    (a) =>
      a.id === 'ord-pwr-comb-duas-armas' ||
      a.name.toLowerCase().includes('combater com duas armas')
  );
  const hasGolpeDemolidor = abilities.some(
    (a) =>
      a.id === 'ord-pwr-comb-golpe-demolidor' ||
      a.name.toLowerCase().includes('golpe demolidor')
  );
  const hasGolpePesado = abilities.some(
    (a) =>
      a.isActive !== false &&
      (a.id === 'ord-pwr-comb-golpe-pesado' ||
        a.name.toLowerCase().includes('golpe pesado'))
  );
  const hasArtistaMarcial = abilities.some(
    (a) =>
      a.id === 'ord-pwr-comb-artista-marcial' ||
      a.name.toLowerCase().includes('artista marcial')
  );
  const hasTiroCerteiro = abilities.some(
    (a) =>
      a.isActive !== false &&
      (a.id === 'ord-pwr-comb-tiro-certeiro' ||
        a.name.toLowerCase().includes('tiro certeiro'))
  );
  const hasSegurarGatilho = abilities.some(
    (a) =>
      a.id === 'ord-pwr-comb-segurar-gatilho' ||
      a.name.toLowerCase().includes('segurar o gatilho') ||
      a.name.toLowerCase().includes('segurar gatilho')
  );

  // Trilhas de Combatente
  const hasAFavorita = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-10' ||
      a.name.toLowerCase().includes('a favorita')
  );
  const hasChosenAniquiladorFavorite =
    attacks.some((a) => Boolean(a.isAniquiladorFavorite)) ||
    inventory.some((it) => Boolean(it.isAniquiladorFavorite));
  const canChangeAniquiladorFavorite =
    !hasChosenAniquiladorFavorite || (isEditMode && canEditInventory);

  const hasTecnicaSecreta = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-40' ||
      a.name.toLowerCase().includes('técnica secreta') ||
      a.name.toLowerCase().includes('tecnica secreta')
  );
  const hasTecnicaSublime = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-65' ||
      a.name.toLowerCase().includes('técnica sublime') ||
      a.name.toLowerCase().includes('tecnica sublime')
  );
  const hasMaquinaMatar = abilities.some(
    (a) =>
      a.id === 'trail-aniquilador-99' ||
      a.name.toLowerCase().includes('máquina de matar') ||
      a.name.toLowerCase().includes('maquina de matar')
  );
  const aniquiladorCatReduction = hasMaquinaMatar
    ? 3
    : hasTecnicaSecreta
    ? 2
    : hasAFavorita
    ? 1
    : 0;

  const hasTecnicaLetal = abilities.some(
    (a) =>
      a.id === 'trail-guerreiro-10' ||
      a.name.toLowerCase().includes('técnica letal') ||
      a.name.toLowerCase().includes('tecnica letal')
  );
  const hasForcaOpressora = abilities.some(
    (a) =>
      a.id === 'trail-guerreiro-65' ||
      a.name.toLowerCase().includes('força opressora') ||
      a.name.toLowerCase().includes('forca opressora')
  );
  const hasPotenciaMaxima = abilities.some(
    (a) =>
      a.id === 'trail-guerreiro-99' ||
      a.name.toLowerCase().includes('potência máxima') ||
      a.name.toLowerCase().includes('potencia maxima')
  );

  // Poderes e Trilhas de Especialista
  const hasNinjaUrbano = abilities.some(
    (a) =>
      a.isActive !== false &&
      (a.id === 'ord-pwr-esp-ninja-urbano' ||
        a.name.toLowerCase().includes('ninja urbano'))
  );
  const hasMiraDeElite = abilities.some(
    (a) =>
      a.id === 'trail-atirador_elite-10' ||
      a.name.toLowerCase().includes('mira de elite')
  );
  const hasDisparoLetal = abilities.some(
    (a) =>
      a.id === 'trail-atirador_elite-40' ||
      a.name.toLowerCase().includes('disparo letal')
  );
  const hasAtirarParaMatar = abilities.some(
    (a) =>
      a.id === 'trail-atirador_elite-99' ||
      a.name.toLowerCase().includes('atirar para matar')
  );
  const hasAtaqueFurtivo = abilities.some(
    (a) =>
      a.id === 'trail-infiltrador-10' ||
      a.name.toLowerCase().includes('ataque furtivo')
  );
  const hasAssassinar = abilities.some(
    (a) =>
      a.id === 'trail-infiltrador-65' ||
      a.name.toLowerCase().includes('assassinar')
  );
  const hasRemendao = abilities.some(
    (a) =>
      a.id === 'trail-tecnico-40' ||
      a.name.toLowerCase().includes('remendão') ||
      a.name.toLowerCase().includes('remendao')
  );

  const hasChosenUtilityBackpackItem = inventory.some((it) =>
    Boolean(it.isUtilityBackpackItem)
  );
  const canChangeUtilityBackpackItem =
    !hasChosenUtilityBackpackItem || (isEditMode && canEditInventory);

  const hasChosenParanormalTool = inventory.some((it) =>
    Boolean(it.isParanormalTool)
  );
  const canChangeParanormalTool =
    !hasChosenParanormalTool || (isEditMode && canEditInventory);

  function hasDedicatedControlElsewhere(ab: CharacterAbility): boolean {
    const lowerId = (ab.id || '').toLowerCase();
    const lowerName = (ab.name || '').toLowerCase();

    // Poderes de Origem com botão dedicado na seção de Perícias (OrdemSheet.tsx)
    if (
      [
        'orig-academico',
        'orig-atleta',
        'orig-executivo',
        'orig-investigador',
        'orig-trabalhador_rural',
        'orig-ti',
        'orig-trambiqueiro',
      ].includes(lowerId) ||
      lowerName.includes('saber é poder') ||
      lowerName.includes('saber e poder') ||
      lowerName.includes('110%') ||
      lowerName.includes('processo otimizado') ||
      lowerName.includes('faro para pistas') ||
      lowerName.includes('desbravador') ||
      lowerName.includes('motor de busca') ||
      lowerName.includes('impostor')
    ) {
      return true;
    }

    // Habilidades, Poderes e Trilhas de Combatente com interface/botão dedicado na aba Ataques ou no Modal de Rolagem
    if (
      lowerName.includes('ataque especial') ||
      lowerId === 'ord-pwr-comb-golpe-demolidor' ||
      lowerName.includes('golpe demolidor') ||
      lowerId === 'ord-pwr-comb-segurar-gatilho' ||
      lowerName.includes('segurar o gatilho') ||
      lowerId === 'ord-pwr-comb-artista-marcial' ||
      lowerName.includes('artista marcial') ||
      lowerId === 'ord-pwr-comb-defensivo' ||
      lowerName.includes('combate defensivo') ||
      lowerId === 'ord-pwr-comb-duas-armas' ||
      lowerName.includes('combater com duas armas') ||
      lowerId === 'trail-aniquilador-40' ||
      lowerName.includes('técnica secreta') ||
      lowerName.includes('tecnica secreta') ||
      lowerId === 'trail-aniquilador-65' ||
      lowerName.includes('técnica sublime') ||
      lowerName.includes('tecnica sublime') ||
      lowerId === 'trail-guerreiro-65' ||
      lowerName.includes('força opressora') ||
      lowerName.includes('forca opressora')
    ) {
      return true;
    }

    // Habilidades, Poderes e Trilhas de Especialista com controle dedicado em Perícias, Combate ou Botões Específicos
    if (
      lowerName.includes('eclético') ||
      lowerName.includes('ecletico') ||
      lowerName === 'perito' ||
      (lowerName.includes('perito') && !lowerName.includes('explosivos')) ||
      lowerName.includes('engenhosidade') ||
      lowerId === 'ord-pwr-esp-conhecimento-aplicado' ||
      lowerName.includes('conhecimento aplicado') ||
      lowerId === 'ord-pwr-esp-maos-rapidas' ||
      lowerName.includes('mãos rápidas') ||
      lowerName.includes('maos rapidas') ||
      lowerId === 'trail-atirador_elite-40' ||
      lowerName.includes('disparo letal') ||
      lowerId === 'trail-infiltrador-10' ||
      lowerName.includes('ataque furtivo') ||
      lowerId === 'trail-infiltrador-65' ||
      lowerName.includes('assassinar') ||
      lowerId === 'trail-medico_campo-10' ||
      lowerName.includes('paramédico') ||
      lowerName.includes('paramedico') ||
      lowerId === 'trail-negociador-40' ||
      lowerId === 'ord-pwr-ocu-camuflar-ocultismo' ||
      lowerId === 'ord-pwr-ocu-especialista-elemento' ||
      lowerId === 'ord-pwr-ocu-ferramentas-paranormais' ||
      lowerId === 'ord-pwr-ocu-fluxo-poder' ||
      lowerId === 'ord-pwr-ocu-mestre-elemento' ||
      lowerId === 'ord-pwr-ocu-ritual-potente' ||
      lowerId === 'ord-pwr-ocu-ritual-predileto' ||
      lowerId === 'ord-pwr-ocu-tatuagem-ritualistica' ||
      lowerId === 'ord-pwr-ocu-intuicao-paranormal' ||
      lowerId === 'ord-pwr-ocu-identificacao-paranormal' ||
      lowerId === 'trail-conduite-10' ||
      lowerId === 'trail-conduite-40' ||
      lowerId === 'trail-flagelador-10' ||
      lowerId === 'trail-flagelador-40' ||
      lowerId === 'trail-graduado-10' ||
      lowerId === 'trail-graduado-40' ||
      lowerId === 'trail-graduado-65' ||
      lowerId === 'trail-intuitivo-10' ||
      lowerId === 'trail-intuitivo-40' ||
      lowerId === 'trail-intuitivo-65' ||
      lowerId === 'trail-lamina_paranormal-10' ||
      lowerId === 'trail-lamina_paranormal-40' ||
      lowerId === 'trail-lamina_paranormal-65' ||
      lowerId === 'ord-para-sang-sangue-ferro' ||
      lowerId === 'ord-para-sang-sangue-fervente' ||
      lowerId === 'ord-para-sang-sangue-vivo' ||
      lowerId === 'ord-para-sang-arma-sangue' ||
      lowerId === 'ord-para-mort-potencial-aprimorado' ||
      lowerId === 'ord-para-mort-encarar' ||
      lowerId === 'ord-para-ener-afortunado' ||
      lowerId === 'ord-para-ener-golpe-sorte' ||
      lowerId === 'ord-para-conh-visao-oculto' ||
      lowerId === 'ord-para-conh-expansao' ||
      lowerId === 'ord-para-aprender-ritual' ||
      lowerId.startsWith('ord-para-resistir-') ||
      lowerId === 'ord-pwr-ocu-envolto-misterio' ||
      lowerId === 'ord-pwr-ocu-criar-selo' ||
      lowerId === 'ord-pwr-ocu-guiado-paranormal' ||
      lowerId === 'ord-pwr-ocu-improvisar-componentes' ||
      lowerId === 'trail-conduite-65' ||
      lowerId === 'trail-flagelador-65' ||
      lowerId === 'ord-para-ener-campo-protetor' ||
      lowerId === 'ord-para-mort-surto-temporal' ||
      lowerId === 'ord-para-mort-potencial-reaproveitado' ||
      lowerId === 'ord-para-sang-anatomia-insana' ||
      lowerName.includes('discurso motivador')
    ) {
      return true;
    }

    return false;
  }

  function clampAeConfig(rawAtk: number, rawDmg: number, maxBonus: number): { atk: number; dmg: number } {
    let atk = Math.max(0, Math.floor(rawAtk / 5) * 5);
    let dmg = Math.max(0, Math.floor(rawDmg / 5) * 5);
    if (atk + dmg > maxBonus) {
      const excess = atk + dmg - maxBonus;
      const dmgDrop = Math.min(dmg, excess);
      dmg -= dmgDrop;
      const remExcess = excess - dmgDrop;
      if (remExcess > 0) {
        atk = Math.max(0, atk - remExcess);
      }
    }
    if (atk + dmg === 0) {
      return { atk: Math.min(5, maxBonus), dmg: 0 };
    }
    return { atk, dmg };
  }

  function loadSavedAeConfig(maxBonus: number): { atk: number; dmg: number } {
    try {
      const raw = localStorage.getItem('totalrpg_last_ae_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.atk === 'number' && typeof parsed?.dmg === 'number') {
          return clampAeConfig(parsed.atk, parsed.dmg, maxBonus);
        }
      }
    } catch {
      // ignora erro de localStorage
    }
    return { atk: 5, dmg: 0 };
  }

  // Estados táticos interativos de combate (Interface Contextual Ataque Especial, Golpe Demolidor, Técnica Secreta, Segurar o Gatilho)
  const [activeAeAttackId, setActiveAeAttackId] = useState<string | null>(null);
  const [aeAtkInvest, setAeAtkInvest] = useState<number>(() => loadSavedAeConfig(maxAeTotalBonus).atk);
  const [aeDmgInvest, setAeDmgInvest] = useState<number>(() => loadSavedAeConfig(maxAeTotalBonus).dmg);

  function updateAeInvestment(nextAtk: number, nextDmg: number) {
    setAeAtkInvest(nextAtk);
    setAeDmgInvest(nextDmg);
    try {
      if (nextAtk + nextDmg > 0) {
        localStorage.setItem(
          'totalrpg_last_ae_config',
          JSON.stringify({ atk: nextAtk, dmg: nextDmg })
        );
      }
    } catch {
      // ignora erro de localStorage
    }
  }
  const [pendingSpecialDamageBonus, setPendingSpecialDamageBonus] = useState<{
    attackId: string;
    dmgBonus: number;
  } | null>(null);
  const [armedGolpeDemolidor, setArmedGolpeDemolidor] = useState<boolean>(false);
  const [armedAtaqueFurtivo, setArmedAtaqueFurtivo] = useState<boolean>(false);
  const [armedAssassinar, setArmedAssassinar] = useState<boolean>(false);
  const [disparoLetalByAttackId, setDisparoLetalByAttackId] = useState<Record<string, boolean>>({});
  const [segurarGatilhoStep, setSegurarGatilhoStep] = useState<number>(1);
  const [aimingByAttackId, setAimingByAttackId] = useState<Record<string, boolean>>({});
  const [rajadaByAttackId, setRajadaByAttackId] = useState<Record<string, boolean>>({});
  const [energeticaByAttackId, setEnergeticaByAttackId] = useState<Record<string, boolean>>({});
  const [antielementoByAttackId, setAntielementoByAttackId] = useState<Record<string, boolean>>({});
  const [empuxoByAttackId, setEmpuxoByAttackId] = useState<Record<string, boolean>>({});
  const [ammoModByAttackId, setAmmoModByAttackId] = useState<
    Record<string, 'none' | 'dumdum' | 'explosiva' | 'jurada'>
  >({});
  const [arcabuzDieByAttackId, setArcabuzDieByAttackId] = useState<Record<string, number>>({});
  const [customizingItemId, setCustomizingItemId] = useState<string | null>(null);
  const [inventoryRealmFilter, setInventoryRealmFilter] = useState<'ALL' | 'normal' | 'paranormal'>('ALL');
  const [inventoryFeedback, setRawInventoryFeedback] = useState<string>('');
  const setInventoryFeedback = (msg: string) => {
    setRawInventoryFeedback(msg);
    if (msg && !msg.startsWith('Erro')) {
      const costMatch = msg.match(/(-\d+\s*(?:PE|PM|un\.))/i);
      const isConsumable =
        msg.includes('-1 un.') ||
        msg.includes('consumid') ||
        msg.includes('Cargas') ||
        msg.includes('Usos');
      onLogActivity?.({
        category: isConsumable ? 'consumable' : 'ability',
        summary: msg,
        costText: costMatch ? costMatch[1] : isConsumable ? '-1 un.' : undefined,
        tone: isConsumable ? 'warning' : 'info',
      });
    }
  };
  const [secAmplo, setSecAmplo] = useState<boolean>(false);
  const [secDestruidor, setSecDestruidor] = useState<boolean>(false);
  const [secLetal, setSecLetal] = useState<0 | 1 | 2>(0);
  const [secPerfurante, setSecPerfurante] = useState<boolean>(false);
  const [combatTabFeedback, setCombatTabFeedback] = useState<string>('');
  const [useLaminaMaldita, setUseLaminaMaldita] = useState(false);
  const [ritualCamuflar, setRitualCamuflar] = useState(false);
  const [ritualAmpliar, setRitualAmpliar] = useState(false);
  const [ritualAcelerar, setRitualAcelerar] = useState(false);
  const [ritualPoderFlagelo, setRitualPoderFlagelo] = useState(false);
  const [ritualLaminaMovimentoMap, setRitualLaminaMovimentoMap] = useState<Record<string, boolean>>({});
  const [improvisarElemento, setImprovisarElemento] = useState<string>('Sangue');
  const [anularRitualPe, setAnularRitualPe] = useState<number>(1);
  const [criarSeloRitualId, setCriarSeloRitualId] = useState<string>('');
  const [criarSeloCircle, setCriarSeloCircle] = useState<number>(1);

  // Estados para seleção de alvos do Discurso Motivador (Negociador)
  const [isDiscursoModalOpen, setIsDiscursoModalOpen] = useState(false);
  const [discursoBonusDice, setDiscursoBonusDice] = useState<1 | 2>(1);
  const [discursoPeCost, setDiscursoPeCost] = useState<number>(4);
  const [discursoAllies, setDiscursoAllies] = useState<Array<{ id: string; name: string; username?: string }>>([]);
  const [selectedDiscursoCharIds, setSelectedDiscursoCharIds] = useState<Record<string, boolean>>({});
  const [isLoadingDiscursoAllies, setIsLoadingDiscursoAllies] = useState(false);

  async function handleOpenDiscursoModal(dice: 1 | 2, pe: number) {
    setDiscursoBonusDice(dice);
    setDiscursoPeCost(pe);
    if (isInCampaign && campaignId) {
      setIsLoadingDiscursoAllies(true);
      setIsDiscursoModalOpen(true);
      try {
        const data = await fetchCampaignTradeTargets(campaignId);
        const list = (data.characters || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          username: c.owner?.username,
        }));
        if (characterId && !list.some((c) => c.id === characterId)) {
          list.unshift({
            id: characterId,
            name: characterName || 'Você',
            username: 'Você',
          });
        }
        setDiscursoAllies(list);
        const initialSel: Record<string, boolean> = {};
        for (const ally of list) {
          initialSel[ally.id] = true;
        }
        setSelectedDiscursoCharIds(initialSel);
      } catch (err: any) {
        setAbilityUseFeedback(`Erro ao buscar aliados: ${err.message}`);
      } finally {
        setIsLoadingDiscursoAllies(false);
      }
    } else {
      applyDiscursoLocally(dice, pe);
    }
  }

  function applyDiscursoLocally(dice: 1 | 2, pe: number) {
    if (
      !onSpendResource(pe, {
        id: 'pwr-scene-discurso-motivador',
        name: `Discurso Motivador (${dice === 2 ? '65%+' : 'Negociador'})`,
        source: 'Cena',
        description: `+${dice}d20 em testes de perícia nesta cena`,
        modifiers: [
          {
            id: 'mod-discurso-motivador',
            targetType: 'skill_dice',
            targetKey: 'all',
            value: dice,
          },
        ],
      })
    ) {
      return;
    }
    onUpdateAbilities(
      abilities.map((a) =>
        a.id === 'trail-negociador-40' || a.name.toLowerCase().includes('discurso motivador')
          ? {
              ...a,
              isActive: true,
              modifiers: [
                {
                  id: 'tr-neg-40',
                  targetType: 'skill_dice',
                  targetKey: 'all',
                  value: dice,
                },
              ],
            }
          : a
      )
    );
    setAbilityUseFeedback(`Discurso Motivador ativado (-${pe} PE): +${dice}d20 em todas as perícias na cena!`);
  }

  async function handleConfirmDiscursoInCampaign() {
    const chosenIds = Object.keys(selectedDiscursoCharIds).filter(
      (id) => selectedDiscursoCharIds[id]
    );
    if (chosenIds.length === 0) {
      alert('Selecione ao menos um personagem para receber o Discurso Motivador.');
      return;
    }
    if (!onSpendResource(discursoPeCost)) {
      return;
    }
    const effect: SceneEffect = {
      id: 'pwr-scene-discurso-motivador',
      name: `Discurso Motivador (${discursoBonusDice === 2 ? '65%+' : 'Negociador'})`,
      source: 'Cena',
      description: `+${discursoBonusDice}d20 em testes de perícia nesta cena (Orador: ${characterName || 'Negociador'})`,
      modifiers: [
        {
          id: 'mod-discurso-motivador',
          targetType: 'skill_dice',
          targetKey: 'all',
          value: discursoBonusDice,
        },
      ],
    };

    if (campaignId) {
      try {
        await applyCampaignSceneEffect(campaignId, chosenIds, effect);
      } catch (err: any) {
        console.error('Erro ao sincronizar Discurso Motivador na campanha:', err);
      }
    }

    if (characterId && chosenIds.includes(characterId)) {
      onUpdateAbilities(
        abilities.map((a) =>
          a.id === 'trail-negociador-40' || a.name.toLowerCase().includes('discurso motivador')
            ? {
                ...a,
                isActive: true,
                modifiers: effect.modifiers,
              }
            : a
        )
      );
    } else {
      onUpdateAbilities(
        abilities.map((a) =>
          a.id === 'trail-negociador-40' || a.name.toLowerCase().includes('discurso motivador')
            ? {
                ...a,
                isActive: true,
              }
            : a
        )
      );
    }

    setIsDiscursoModalOpen(false);
    setAbilityUseFeedback(
      `Discurso Motivador ativado para ${chosenIds.length} personagem(ns) (+${discursoBonusDice}d20 em perícias até o fim da cena)!`
    );
  }

  async function handleEndDiscursoMotivador(abId: string) {
    if (isInCampaign && campaignId) {
      try {
        const allIds = discursoAllies.map((a) => a.id);
        const idsToClear = allIds.length > 0 ? allIds : (characterId ? [characterId] : []);
        if (idsToClear.length > 0) {
          await applyCampaignSceneEffect(
            campaignId,
            idsToClear,
            undefined,
            'pwr-scene-discurso-motivador'
          );
        }
      } catch (err: any) {
        console.error('Erro ao encerrar Discurso Motivador:', err);
      }
    }
    onUpdateAbilities(
      abilities.map((a) => (a.id === abId ? { ...a, isActive: false } : a))
    );
    setAbilityUseFeedback('Discurso Motivador encerrado.');
  }

  // Sincroniza passo de Segurar o Gatilho usado dentro do modal de lote
  useEffect(() => {
    function handleSgStepEvent(e: Event) {
      const custom = e as CustomEvent<{ step?: number }>;
      if (typeof custom.detail?.step === 'number') {
        setSegurarGatilhoStep(custom.detail.step);
      }
    }
    window.addEventListener('totalrpg:sg-step', handleSgStepEvent);
    return () => window.removeEventListener('totalrpg:sg-step', handleSgStepEvent);
  }, []);

  // Quando o turno do personagem chega na ordem de iniciativa da mesa, reseta o passo de Segurar o Gatilho e bônus residuais
  useEffect(() => {
    if (turnResetSignal && turnResetSignal > 0) {
      setSegurarGatilhoStep(1);
      setActiveAeAttackId(null);
      setPendingSpecialDamageBonus(null);
      setArmedAtaqueFurtivo(false);
      setArmedAssassinar(false);
    }
  }, [turnResetSignal]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'compendium' | 'custom'>('compendium');
  const [searchQuery, setSearchQuery] = useState('');
  const [compendiumPowerTypeFilter, setCompendiumPowerTypeFilter] = useState<'ALL' | 'power' | 'paranormal_power'>('ALL');
  const [compendiumElementFilter, setCompendiumElementFilter] = useState<string>('ALL');
  const [compendiumCircleFilter, setCompendiumCircleFilter] = useState<number | 'ALL'>('ALL');
  const [compendiumItemRealmTab, setCompendiumItemRealmTab] = useState<'normal' | 'paranormal'>('normal');
  const [compendiumNormalSubtypeFilter, setCompendiumNormalSubtypeFilter] = useState<string>('ALL');
  const [abilityUseFeedback, setRawAbilityUseFeedback] = useState<string>('');
  const setAbilityUseFeedback = (msg: string) => {
    setRawAbilityUseFeedback(msg);
    if (msg && !msg.startsWith('Erro')) {
      const costMatch = msg.match(/(-\d+\s*(?:PE|PM))/i);
      onLogActivity?.({
        category: 'ability',
        summary: msg,
        costText: costMatch ? costMatch[1].toUpperCase() : undefined,
        tone: 'info',
      });
    }
  };

  const [atkName, setAtkName] = useState('');
  const [atkDice, setAtkDice] = useState(1);
  const [atkBonus, setAtkBonus] = useState(5);
  const [atkDamage, setAtkDamage] = useState('1d8+2');
  const [atkCrit, setAtkCrit] = useState('19/x2');

  const [abName, setAbName] = useState('');
  const [abCost, setAbCost] = useState(0);
  const [abDamage, setAbDamage] = useState('');
  const [abDesc, setAbDesc] = useState('');

  const [itemName, setItemName] = useState('');
  const [itemSlots, setItemSlots] = useState(1);
  const [itemQty, setItemQty] = useState(1);
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemIsParanormalCustom, setItemIsParanormalCustom] = useState(false);
  const [zoomedItemImage, setZoomedItemImage] = useState<{ name: string; url: string } | null>(null);

  const resourceLabel = system === 'ordem-paranormal' ? 'PE' : 'PM';
  const spellLabel = system === 'ordem-paranormal' ? 'Ritual' : 'Magia';
  const spellPluralLabel = system === 'ordem-paranormal' ? 'Rituais' : 'Magias';

  const allowInv = isEditMode && canEditInventory;
  const allowAb = isEditMode && canEditAbilities;

  const effectiveMaxSlots = maxLoadSlots + bonuses.loadLimit;
  const currentLoad = inventory.reduce((acc, item) => {
    const qty = item.quantity || 1;
    const effectiveSlots =
      system === 'ordem-paranormal' ? getOrdemItemEffectiveSlots(item) : item.slots;
    if (hasMochilaUtilidades && item.isUtilityBackpackItem) {
      const reducedFirst = Math.max(0, effectiveSlots - 1);
      return acc + reducedFirst + effectiveSlots * Math.max(0, qty - 1);
    }
    return acc + effectiveSlots * qty;
  }, 0);
  const isOverloaded = currentLoad > effectiveMaxSlots;

  function isGeneralEquipment(it: RPGItem): boolean {
    const lower = it.name.toLowerCase();
    const isProtection =
      lower.includes('proteção') ||
      lower.includes('protecao') ||
      lower.includes('escudo') ||
      lower.includes('colete') ||
      (it.modifiers || []).some((m) => m.targetType === 'defense');
    if (isProtection) return false;
    const isExplosiveOrHealing =
      lower.includes('granada') ||
      lower.includes('cicatrizante') ||
      lower.includes('flashbang');
    if (isExplosiveOrHealing) return true;
    const isWeaponAttack = attacks.some((a) => a.name.toLowerCase() === lower);
    if (isWeaponAttack) return false;
    return true;
  }

  const powerList = abilities.filter((ab) => ab.category !== 'ritual' && ab.category !== 'magia');
  const spellList = abilities.filter((ab) => ab.category === 'ritual' || ab.category === 'magia');

  function openAddModal() {
    setSearchQuery('');
    setCompendiumPowerTypeFilter('ALL');
    setCompendiumElementFilter('ALL');
    setCompendiumCircleFilter('ALL');
    setCompendiumItemRealmTab('normal');
    setCompendiumNormalSubtypeFilter('ALL');
    setItemIsParanormalCustom(false);
    setModalMode(activeSubTab === 'combat' ? 'custom' : 'compendium');
    setIsAddModalOpen(true);
  }

  function handleSelectFromCompendium(entry: CompendiumEntryData, chosenElement?: string) {
    const newId = Math.random().toString(36).substring(2, 9);

    if (
      entry.category === 'power' ||
      entry.category === 'paranormal_power' ||
      entry.category === 'spell' ||
      entry.category === 'origin'
    ) {
      const isAmaldicoar =
        entry.id === 'ord-rit-amaldicoar-arma' ||
        entry.name.toLowerCase().includes('amaldiçoar arma');
      const requiresManualToggle =
        entry.id === 'ord-pwr-comb-defensivo' ||
        entry.id === 'ord-pwr-comb-duas-armas';
      const isPassive =
        entry.cost === 0 && !entry.metadata?.damageFormula && !requiresManualToggle;
      const finalName = chosenElement
        ? `Amaldiçoar Arma — ${chosenElement} (1º Círculo)`
        : entry.name;
      const finalDesc = chosenElement
        ? `[Elemento: ${chosenElement}] ${entry.description}`
        : entry.description;

      const newAb: CharacterAbility = {
        id: `${entry.id}-${newId}`,
        name: finalName,
        category:
          entry.category === 'spell'
            ? system === 'ordem-paranormal'
              ? 'ritual'
              : 'magia'
            : entry.category === 'paranormal_power'
            ? 'poder_paranormal'
            : 'poder',
        cost: entry.cost,
        element: chosenElement || entry.metadata?.element,
        description: finalDesc,
        damageFormula: isAmaldicoar ? undefined : entry.metadata?.damageFormula,
        isActive: isPassive ? true : false,
        modifiers: entry.modifiers || [],
      };
      onUpdateAbilities([...abilities, newAb]);
      setIsAddModalOpen(false);
    } else if (entry.category === 'item') {
      const catLevel = entry.metadata?.categoryLevel ?? entry.cost ?? 0;
      const baseSlots = entry.metadata?.slots ?? 1;
      const isParaItem = isOrdemCompendiumItemParanormal(entry);
      const isCursedSpec = Boolean(entry.metadata?.isCursedSpecial);
      const itemKind =
        entry.metadata?.itemSubtype ||
        inferOrdemItemKind({
          name: entry.name,
          description: entry.description,
          isParanormal: isParaItem,
          isCursedSpecial: isCursedSpec,
        });
      const isUtensilio = entry.name.toLowerCase().includes('utensílio') || entry.name.toLowerCase().includes('utensilio');
      const isVestimenta = entry.name.toLowerCase().includes('vestimenta');
      const newItem: RPGItem = {
        id: newId,
        name: entry.name,
        slots: baseSlots,
        baseSlots,
        quantity: 1,
        category: catLevel,
        baseCategory: catLevel,
        isEquipped: true,
        isParanormal: isParaItem,
        isCursedSpecial: isCursedSpec,
        itemKind,
        element: entry.metadata?.element as OrdemElement | undefined,
        remainingCharges: entry.metadata?.uses,
        accessoryConfig:
          isUtensilio || isVestimenta
            ? { accessoryType: isVestimenta ? 'vestimenta' : 'utensilio' }
            : undefined,
        description: entry.description,
        modifiers: entry.modifiers || [],
      };

      let newAtk: PreparedAttack | undefined = undefined;
      if (
        isOrdemItemWeaponEntry(entry) &&
        entry.metadata?.damageFormula &&
        !isHealingConsumableItem(entry.name, entry.description)
      ) {
        const classif = classifyOrdemWeapon(
          entry.name,
          entry.description,
          undefined,
          entry.metadata?.element
        );
        const pontariaSk =
          system === 'ordem-paranormal' && ordemSheetData
            ? ordemSheetData.skills.find((s) => s.id === 'pontaria')
            : undefined;
        const lutaSk =
          system === 'ordem-paranormal' && ordemSheetData
            ? ordemSheetData.skills.find((s) => s.id === 'luta')
            : undefined;
        const activeSkill = classif.isRanged ? pontariaSk : lutaSk;
        const skillBonus = activeSkill
          ? (activeSkill.trainingDegree || 0) + (activeSkill.otherModifier || 0)
          : 0;
        const attrVal =
          system === 'ordem-paranormal' && ordemSheetData
            ? classif.isRanged
              ? ordemSheetData.attributes.agi
              : classif.isAgile
              ? Math.max(ordemSheetData.attributes.for, ordemSheetData.attributes.agi)
              : ordemSheetData.attributes.for
            : 1;

        newAtk = {
          id: Math.random().toString(36).substring(2, 9),
          name: entry.name,
          diceCount: Math.max(1, attrVal),
          attackBonus: skillBonus,
          damageFormula: entry.metadata.damageFormula,
          critRange: entry.metadata.critRange || '20/x2',
          damageType:
            entry.metadata.element ||
            (classif.isFirearm ? 'Balístico' : classif.isDisparo ? 'Perfuração' : 'Impacto'),
          isMelee: classif.isMelee,
          isFirearm: classif.isFirearm,
          isDisparo: classif.isDisparo,
          linkedItemId: newId,
        };
      }

      onAddItemAndAttack(newItem, newAtk);
      setIsAddModalOpen(false);
    }
  }

  function handleAddAttack(e: React.FormEvent) {
    e.preventDefault();
    if (!atkName.trim()) return;
    const classif = classifyOrdemWeapon(atkName.trim());
    onUpdateAttacks([
      ...attacks,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: atkName.trim(),
        diceCount: atkDice,
        attackBonus: atkBonus,
        damageFormula: atkDamage.trim() || '1d6',
        critRange: atkCrit.trim() || '20/x2',
        damageType: classif.isFirearm ? 'Balístico' : classif.isDisparo ? 'Perfuração' : 'Impacto',
        isMelee: classif.isMelee,
        isFirearm: classif.isFirearm,
        isDisparo: classif.isDisparo,
      },
    ]);
    setAtkName('');
    setIsAddModalOpen(false);
  }

  function handleAddCustomAbility(e: React.FormEvent) {
    e.preventDefault();
    if (!abName.trim()) return;
    const isSpellTab = activeSubTab === 'spells';
    onUpdateAbilities([
      ...abilities,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: abName.trim(),
        category: isSpellTab ? (system === 'ordem-paranormal' ? 'ritual' : 'magia') : 'poder',
        cost: Math.max(0, abCost),
        description: abDesc.trim(),
        damageFormula: abDamage.trim() || undefined,
        isActive: abCost === 0 && !abDamage.trim(),
        modifiers: [],
      },
    ]);
    setAbName('');
    setAbDesc('');
    setAbDamage('');
    setAbCost(0);
    setIsAddModalOpen(false);
  }

  function handleAddCustomItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    const safeSlots = Math.max(0, itemSlots);
    onUpdateInventory([
      ...inventory,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: itemName.trim(),
        slots: safeSlots,
        baseSlots: safeSlots,
        quantity: Math.max(1, itemQty),
        imageUrl: itemImageUrl.trim() || undefined,
        description: itemDesc.trim() || undefined,
        isEquipped: true,
        isParanormal: system === 'ordem-paranormal' ? itemIsParanormalCustom : undefined,
        itemKind:
          system === 'ordem-paranormal' && itemIsParanormalCustom ? 'paranormal' : undefined,
        modifiers: [],
      },
    ]);
    setItemName('');
    setItemSlots(1);
    setItemQty(1);
    setItemImageUrl('');
    setItemDesc('');
    setItemIsParanormalCustom(false);
    setIsAddModalOpen(false);
  }

  function handleUseAbility(ab: CharacterAbility) {
    if (ab.cost > 0) {
      const ok = onSpendResource(ab.cost);
      if (!ok) return;
    }
    if (ab.damageFormula) {
      const parsed = parseDiceFormula(ab.damageFormula);
      onRoll(`${ab.name} (Efeito)`, parsed.count, parsed.sides, parsed.modifier, true);
      onLogActivity?.({
        category: 'ability',
        summary: `Usou ${ab.name} (${ab.damageFormula})`,
        costText: ab.cost > 0 ? `-${ab.cost} ${resourceLabel}` : undefined,
        tone: 'info',
      });
    } else {
      // Poderes sem fórmula de dano (ex.: Ampliar Ritual, Ataque Especial, Perito) apenas descontam PE e ativam bônus se houver
      if (ab.modifiers && ab.modifiers.length > 0 && ab.isActive === false) {
        onUpdateAbilities(
          abilities.map((item) => (item.id === ab.id ? { ...item, isActive: true } : item))
        );
      }
      setAbilityUseFeedback(
        `${ab.name} ativado${ab.cost > 0 ? ` (-${ab.cost} ${resourceLabel} descontado)` : ''}!`
      );
      setTimeout(() => setAbilityUseFeedback(''), 4000);
    }
  }

  function toggleAbilityActive(id: string) {
    onUpdateAbilities(
      abilities.map((ab) => (ab.id === id ? { ...ab, isActive: ab.isActive === false ? true : false } : ab))
    );
  }

  function toggleItemEquipped(id: string) {
    onUpdateInventory(
      inventory.map((it) => (it.id === id ? { ...it, isEquipped: !it.isEquipped } : it))
    );
  }

  const modalCompendiumList = useMemo(() => {
    if (!isAddModalOpen) return [];

    const lowerQuery = searchQuery.trim().toLowerCase();
    const powerTypeFilter = compendiumPowerTypeFilter;
    const elemFilter = compendiumElementFilter.toLowerCase();

    const filtered = compendiumEntries.filter((entry) => {
      const lowerEntryName = entry.name.trim().toLowerCase();
      if (
        lowerEntryName === 'ataque especial (combatente)' ||
        lowerEntryName === 'resistir a <elemento> (poder paranormal)'
      ) {
        return false;
      }

      const matchesSearch =
        !lowerQuery ||
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        (entry.metadata?.element || '').toLowerCase().includes(lowerQuery);

      if (!matchesSearch) return false;
      if (activeSubTab === 'powers') {
        const isPowerCat =
          entry.category === 'power' ||
          entry.category === 'paranormal_power' ||
          entry.category === 'origin';
        if (!isPowerCat) return false;
        if (powerTypeFilter !== 'ALL' && entry.category !== powerTypeFilter) {
          return false;
        }
        if (
          compendiumElementFilter !== 'ALL' &&
          (entry.metadata?.element || '').toLowerCase() !== elemFilter
        ) {
          return false;
        }
        return true;
      }
      if (activeSubTab === 'spells') {
        if (entry.category !== 'spell') return false;
        if (
          compendiumCircleFilter !== 'ALL' &&
          (entry.metadata?.circle || 1) !== compendiumCircleFilter
        ) {
          return false;
        }
        if (
          compendiumElementFilter !== 'ALL' &&
          (entry.metadata?.element || '').toLowerCase() !== elemFilter
        ) {
          return false;
        }
        return true;
      }
      if (activeSubTab === 'inventory') {
        if (entry.category !== 'item') return false;
        if (system === 'ordem-paranormal') {
          const isPara = isOrdemCompendiumItemParanormal(entry);
          if (compendiumItemRealmTab === 'normal' && isPara) return false;
          if (compendiumItemRealmTab === 'paranormal' && !isPara) return false;
          if (compendiumItemRealmTab === 'normal' && compendiumNormalSubtypeFilter !== 'ALL') {
            const kind =
              entry.metadata?.itemSubtype ||
              inferOrdemItemKind({ name: entry.name, description: entry.description });
            if (compendiumNormalSubtypeFilter === 'weapons') {
              if (!kind.startsWith('weapon_') && !isOrdemItemWeaponEntry(entry)) return false;
            } else if (compendiumNormalSubtypeFilter === 'protections') {
              if (kind !== 'protection_light' && kind !== 'protection_heavy' && kind !== 'shield') {
                return false;
              }
            } else if (kind !== compendiumNormalSubtypeFilter) {
              return false;
            }
          }
          if (compendiumItemRealmTab === 'paranormal' && compendiumElementFilter !== 'ALL') {
            const el = (entry.metadata?.element || '').toLowerCase();
            if (compendiumElementFilter === 'geral') {
              if (entry.metadata?.isCursedSpecial) return false;
            } else if (el !== compendiumElementFilter.toLowerCase()) {
              return false;
            }
          }
        }
        return true;
      }
      return false;
    });

    if (activeSubTab === 'powers' && system === 'ordem-paranormal' && ordemSheetData) {
      const ownedNamesSet = new Set(abilities.map((ab) => ab.name.trim().toLowerCase()));
      const priorityMap = new Map<string, number>();

      const getPriority = (entry: CompendiumEntryData): number => {
        const cached = priorityMap.get(entry.id);
        if (cached !== undefined) return cached;
        const owned = ownedNamesSet.has(entry.name.trim().toLowerCase());
        if (owned) {
          priorityMap.set(entry.id, 2);
          return 2;
        }
        const met =
          entry.category === 'power' || entry.category === 'paranormal_power'
            ? checkOrdemPowerRequirements(entry, ordemSheetData, abilities).met
            : true;
        const val = met ? 0 : 1;
        priorityMap.set(entry.id, val);
        return val;
      };

      return filtered.sort((a, b) => {
        const pA = getPriority(a);
        const pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    }

    if (activeSubTab === 'spells' && system === 'ordem-paranormal') {
      const knownSet = createKnownRitualsKeySet(abilities);
      return filtered.sort((a, b) => {
        const ownedA = isOrdemRitualAlreadyOwned(a, abilities, knownSet) ? 1 : 0;
        const ownedB = isOrdemRitualAlreadyOwned(b, abilities, knownSet) ? 1 : 0;
        if (ownedA !== ownedB) return ownedA - ownedB;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [
    isAddModalOpen,
    compendiumEntries,
    searchQuery,
    activeSubTab,
    compendiumPowerTypeFilter,
    compendiumElementFilter,
    compendiumCircleFilter,
    abilities,
    system,
    ordemSheetData,
  ]);

  let addButtonLabel = '';
  let canShowAddButton = false;

  if (activeSubTab === 'combat' && allowInv && canCreateCustom) {
    addButtonLabel = '+ Novo Ataque';
    canShowAddButton = true;
  } else if (activeSubTab === 'powers' && allowAb) {
    addButtonLabel = '+ Adicionar Poder';
    canShowAddButton = true;
  } else if (activeSubTab === 'spells' && allowAb) {
    addButtonLabel = `+ Adicionar ${spellLabel}`;
    canShowAddButton = true;
  } else if (activeSubTab === 'inventory' && allowInv) {
    addButtonLabel = '+ Adicionar Item';
    canShowAddButton = true;
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5">
      {/* MODAL DE ADIÇÃO E PESQUISA NO COMPÊNDIO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {activeSubTab === 'powers' && 'Adicionar Poder à Ficha'}
                  {activeSubTab === 'spells' && `Adicionar ${spellLabel} à Ficha`}
                  {activeSubTab === 'inventory' && 'Adicionar Item ou Arma'}
                  {activeSubTab === 'combat' && 'Criar Ataque Personalizado'}
                </h3>
                <p className="text-xs text-zinc-400">
                  {modalMode === 'compendium'
                    ? 'Pesquise no catálogo oficial do sistema para importar com os cálculos automáticos.'
                    : 'Criação manual exclusiva de Mestre / Admin.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {canCreateCustom && activeSubTab !== 'combat' && (
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalMode('compendium')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    modalMode === 'compendium' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon name="library" /> Catálogo do Compêndio
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('custom')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    modalMode === 'custom' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon name="hammer" /> Criar Personalizado (Mestre/Admin)
                </button>
              </div>
            )}

            {modalMode === 'compendium' && activeSubTab !== 'combat' ? (
              <div className="flex flex-col gap-3 overflow-hidden">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o nome, elemento ou efeito para filtrar..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />

                {activeSubTab === 'powers' && system === 'ordem-paranormal' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'power', label: 'Poderes de Classe' },
                        { id: 'paranormal_power', label: 'Poderes Paranormais' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCompendiumPowerTypeFilter(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            compendiumPowerTypeFilter === tab.id
                              ? 'bg-amber-600 border-amber-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {compendiumPowerTypeFilter === 'paranormal_power' && (
                      <div className="flex flex-wrap gap-1">
                        {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                          <button
                            key={el}
                            type="button"
                            onClick={() => setCompendiumElementFilter(el)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                              compendiumElementFilter === el
                                ? 'bg-purple-700 border-purple-500 text-white'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {el === 'ALL' ? 'Todos Elem.' : el}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === 'spells' && system === 'ordem-paranormal' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {(['ALL', 1, 2, 3, 4] as const).map((circ) => (
                        <button
                          key={String(circ)}
                          type="button"
                          onClick={() => setCompendiumCircleFilter(circ)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            compendiumCircleFilter === circ
                              ? 'bg-purple-700 border-purple-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {circ === 'ALL' ? 'Todos Círculos' : `${circ}º Círculo`}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo'].map((el) => (
                        <button
                          key={el}
                          type="button"
                          onClick={() => setCompendiumElementFilter(el)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                            compendiumElementFilter === el
                              ? 'bg-amber-600 border-amber-500 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {el === 'ALL' ? 'Todos Elem.' : el}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeSubTab === 'inventory' && system === 'ordem-paranormal' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCompendiumItemRealmTab('normal');
                          setCompendiumElementFilter('ALL');
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                          compendiumItemRealmTab === 'normal'
                            ? 'bg-amber-600 text-white shadow'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Icon name="backpack" /> Equipamentos Normais
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCompendiumItemRealmTab('paranormal');
                          setCompendiumNormalSubtypeFilter('ALL');
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                          compendiumItemRealmTab === 'paranormal'
                            ? 'bg-purple-700 text-white shadow'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <Icon name="conhecimento" /> Equipamentos Paranormais & Amaldiçoados
                      </button>
                    </div>

                    {compendiumItemRealmTab === 'normal' ? (
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'ALL', label: 'Todos' },
                          { id: 'weapons', label: 'Armas' },
                          { id: 'ammo', label: 'Munições' },
                          { id: 'protections', label: 'Proteções' },
                          { id: 'accessory', label: 'Acessórios' },
                          { id: 'explosive', label: 'Explosivos' },
                          { id: 'operational', label: 'Operacionais' },
                        ].map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setCompendiumNormalSubtypeFilter(sub.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                              compendiumNormalSubtypeFilter === sub.id
                                ? 'bg-amber-600 border-amber-500 text-white'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'ALL', label: 'Todos Paranormais' },
                          { id: 'geral', label: 'Itens Paranormais (Cap. 3)' },
                          { id: 'Sangue', label: 'Sangue' },
                          { id: 'Morte', label: 'Morte' },
                          { id: 'Conhecimento', label: 'Conhecimento' },
                          { id: 'Energia', label: 'Energia' },
                          { id: 'Medo', label: 'Medo' },
                        ].map((el) => (
                          <button
                            key={el.id}
                            type="button"
                            onClick={() => setCompendiumElementFilter(el.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                              compendiumElementFilter === el.id
                                ? 'bg-purple-700 border-purple-500 text-white'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {el.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[420px]">
                  {modalCompendiumList.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      Nenhum registro encontrado no Compêndio para esta categoria.
                    </div>
                  ) : (
                    modalCompendiumList.map((entry) => {
                      const reqCheck =
                        system === 'ordem-paranormal' &&
                        ordemSheetData &&
                        (entry.category === 'power' || entry.category === 'paranormal_power')
                          ? checkOrdemPowerRequirements(entry, ordemSheetData, abilities)
                          : { met: true, missing: [] };

                      const alreadyOwned =
                        entry.category !== 'item' &&
                        (entry.category === 'spell' && system === 'ordem-paranormal'
                          ? isOrdemRitualAlreadyOwned(entry, abilities)
                          : abilities.some(
                              (ab) => ab.name.trim().toLowerCase() === entry.name.trim().toLowerCase()
                            ));

                      return (
                        <div
                          key={entry.id}
                          className={`bg-zinc-950 border p-3.5 rounded-xl flex justify-between items-center gap-4 transition ${
                            alreadyOwned
                              ? 'border-zinc-800/60 opacity-60'
                              : 'border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white">{entry.name}</span>
                              {entry.category === 'paranormal_power' && (
                                <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                                  <Icon name="conhecimento" /> Paranormal {entry.metadata?.element ? `• ${entry.metadata.element}` : ''}
                                </span>
                              )}
                              {entry.category === 'spell' && entry.metadata?.circle && (
                                <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                                  {entry.metadata.circle}º Círculo • {entry.metadata.element || 'Paranormal'}
                                </span>
                              )}
                              {entry.cost > 0 && entry.category !== 'item' && (
                                <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                                  {entry.cost} {resourceLabel}
                                </span>
                              )}
                              {entry.metadata?.damageFormula && (
                                <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded">
                                  <Icon name="d20" /> {entry.metadata.damageFormula}
                                </span>
                              )}
                              {entry.category === 'item' && (
                                <span className="text-[10px] font-mono text-amber-400">
                                  Cat. {entry.metadata?.categoryLevel ?? entry.cost ?? 0} • {entry.metadata?.slots ?? 1} esp.
                                </span>
                              )}
                              {entry.metadata?.requirements && (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    reqCheck.met
                                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                      : 'bg-amber-950/60 text-amber-300 border-amber-800'
                                  }`}
                                >
                                  {reqCheck.met
                                    ? `✓ Req: ${entry.metadata.requirements}`
                                    : `Faltam: ${reqCheck.missing.join(', ')}`}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400">{entry.description}</p>
                          </div>

                          {entry.id === 'ord-rit-amaldicoar-arma' ||
                          entry.name.toLowerCase().includes('amaldiçoar arma') ? (
                            <div className="flex flex-col gap-1 shrink-0">
                              <span className="text-[10px] font-bold text-amber-400 text-right">
                                Escolha o elemento:
                              </span>
                              <div className="grid grid-cols-2 gap-1">
                                {(['Sangue', 'Morte', 'Conhecimento', 'Energia'] as const).map((el) => {
                                  const hasThisEl = abilities.some((ab) =>
                                    ab.name.toLowerCase().includes(`amaldiçoar arma — ${el.toLowerCase()}`)
                                  );
                                  return (
                                    <button
                                      key={el}
                                      type="button"
                                      disabled={hasThisEl}
                                      onClick={() => handleSelectFromCompendium(entry, el)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                        hasThisEl
                                          ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                                          : 'bg-purple-800 hover:bg-purple-600 border-purple-500 text-white cursor-pointer'
                                      }`}
                                    >
                                      {hasThisEl ? `✓ ${el}` : `+ ${el}`}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={alreadyOwned || (!reqCheck.met && !canCreateCustom)}
                              onClick={() => handleSelectFromCompendium(entry)}
                              className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap shadow ${
                                alreadyOwned || (!reqCheck.met && !canCreateCustom)
                                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                  : 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer'
                              }`}
                            >
                              {alreadyOwned
                                ? '✓ Já possui'
                                : !reqCheck.met && !canCreateCustom
                                ? 'Requisito'
                                : '+ Adicionar'}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2">
                {activeSubTab === 'combat' && (
                  <form onSubmit={handleAddAttack} className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Nome da Arma / Ataque</label>
                        <input
                          type="text"
                          required
                          value={atkName}
                          onChange={(e) => setAtkName(e.target.value)}
                          placeholder="Ex: Katana, Garra..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Dados de Ataque (d20)</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={atkDice}
                          onChange={(e) => setAtkDice(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Bônus de Acerto</label>
                        <input
                          type="number"
                          value={atkBonus}
                          onChange={(e) => setAtkBonus(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Fórmula de Dano</label>
                        <input
                          type="text"
                          value={atkDamage}
                          onChange={(e) => setAtkDamage(e.target.value)}
                          placeholder="1d10+4"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Margem de Crítico</label>
                        <input
                          type="text"
                          value={atkCrit}
                          onChange={(e) => setAtkCrit(e.target.value)}
                          placeholder="19/x2"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer mt-2"
                    >
                      Salvar Ataque na Ficha
                    </button>
                  </form>
                )}

                {(activeSubTab === 'powers' || activeSubTab === 'spells') && (
                  <form onSubmit={handleAddCustomAbility} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Nome</label>
                        <input
                          type="text"
                          required
                          value={abName}
                          onChange={(e) => setAbName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Custo ({resourceLabel})</label>
                        <input
                          type="number"
                          min={0}
                          value={abCost}
                          onChange={(e) => setAbCost(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Fórmula de Dados (Opcional - deixe vazio se for passivo)</label>
                      <input
                        type="text"
                        value={abDamage}
                        onChange={(e) => setAbDamage(e.target.value)}
                        placeholder="Ex: 2d8+2"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Descrição</label>
                      <textarea
                        rows={3}
                        value={abDesc}
                        onChange={(e) => setAbDesc(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Salvar na Ficha
                    </button>
                  </form>
                )}

                {activeSubTab === 'inventory' && (
                  <form onSubmit={handleAddCustomItem} className="flex flex-col gap-3">
                    {system === 'ordem-paranormal' && (
                      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
                        <button
                          type="button"
                          onClick={() => setItemIsParanormalCustom(false)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                            !itemIsParanormalCustom
                              ? 'bg-amber-600 text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Icon name="backpack" /> Equipamento Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemIsParanormalCustom(true)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                            itemIsParanormalCustom
                              ? 'bg-purple-700 text-white'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Icon name="conhecimento" /> Equipamento Paranormal
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-zinc-400 mb-1">Nome do Item</label>
                        <input
                          type="text"
                          required
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Espaços</label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={itemSlots}
                          onChange={(e) => setItemSlots(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Quantidade</label>
                        <input
                          type="number"
                          min={1}
                          value={itemQty}
                          onChange={(e) => setItemQty(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <ImageUploadField
                        label="Imagem do Item (Opcional)"
                        value={itemImageUrl}
                        onChange={setItemImageUrl}
                      />
                      <div>
                        <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                          Descrição (Opcional)
                        </label>
                        <input
                          type="text"
                          value={itemDesc}
                          onChange={(e) => setItemDesc(e.target.value)}
                          placeholder="Detalhes ou efeito do item..."
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Guardar na Mochila
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE ALVOS DO DISCURSO MOTIVADOR (NEGOCIADOR) */}
      {isDiscursoModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-600/70 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Trilha: Negociador • Alcance Curto
                </span>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Icon name="megaphone" /> Discurso Motivador (+{discursoBonusDice}d20)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDiscursoModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Você gasta <strong className="text-amber-400">{discursoPeCost} PE</strong> para inspirar seus companheiros com palavras de encorajamento.
              Escolha quais personagens em alcance curto receberão o bônus de{' '}
              <strong className="text-amber-300">+{discursoBonusDice}d20</strong> em todos os testes de perícia até o fim da cena:
            </p>

            {isLoadingDiscursoAllies ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Carregando aliados da mesa...
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-zinc-400">
                    Alvos Selecionados ({Object.values(selectedDiscursoCharIds).filter(Boolean).length})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, boolean> = {};
                        discursoAllies.forEach((a) => (all[a.id] = true));
                        setSelectedDiscursoCharIds(all);
                      }}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-zinc-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDiscursoCharIds({})}
                      className="text-[10px] text-zinc-400 hover:underline cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                {discursoAllies.map((ally) => {
                  const isChecked = Boolean(selectedDiscursoCharIds[ally.id]);
                  const isSelf = ally.id === characterId;
                  return (
                    <label
                      key={ally.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-amber-950/40 border-amber-500/70 text-white'
                          : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedDiscursoCharIds((prev) => ({
                              ...prev,
                              [ally.id]: e.target.checked,
                            }))
                          }
                          className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate">
                            {ally.name} {isSelf && <span className="text-amber-400 font-bold">(Você)</span>}
                          </span>
                          {ally.username && !isSelf && (
                            <span className="text-[10px] text-zinc-500">
                              Jogador: {ally.username}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300 shrink-0">
                        +{discursoBonusDice}d20
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 mt-auto">
              <button
                type="button"
                onClick={() => setIsDiscursoModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isLoadingDiscursoAllies ||
                  Object.values(selectedDiscursoCharIds).filter(Boolean).length === 0
                }
                onClick={handleConfirmDiscursoInCampaign}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black cursor-pointer shadow-lg shadow-amber-950/50"
              >
                <Icon name="megaphone" /> Confirmar Discurso (-{discursoPeCost} PE)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA DE SUB-ABAS COM BOTÃO DE ADICIONAR NA EXTREMA DIREITA */}
      <div className="flex flex-wrap justify-between items-center border-b border-zinc-800 gap-x-4 gap-y-2">
        <div role="tablist" aria-label="Seções da ficha" className="trpg-tabs border-b-0! flex-1 min-w-0 -mx-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('combat')}
            role="tab"
            aria-selected={activeSubTab === 'combat'}
            className="trpg-tab"
          >
            <Icon name="swords" /> Ataques ({attacks.filter((a) => !isHealingConsumableItem(a.name)).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('powers')}
            role="tab"
            aria-selected={activeSubTab === 'powers'}
            className="trpg-tab"
          >
            <Icon name="sparkles" /> Poderes ({powerList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('spells')}
            role="tab"
            aria-selected={activeSubTab === 'spells'}
            className="trpg-tab"
          >
            <Icon name="sigil" /> {spellPluralLabel} ({spellList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            role="tab"
            aria-selected={activeSubTab === 'inventory'}
            className="trpg-tab"
          >
            <Icon name="backpack" /> Inventário ({currentLoad}/{effectiveMaxSlots})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('personal')}
            role="tab"
            aria-selected={activeSubTab === 'personal'}
            className="trpg-tab"
          >
            <Icon name="user" /> Pessoal & História
          </button>
        </div>

        {canShowAddButton && (
          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow"
          >
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* CONTEÚDO DA ABA 1: ATAQUES */}
      {activeSubTab === 'combat' && (
        <div className="flex flex-col gap-4">
          {combatTabFeedback && (
            <div className="bg-amber-950/70 border border-amber-500/70 text-amber-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>{combatTabFeedback}</span>
              <button
                type="button"
                onClick={() => setCombatTabFeedback('')}
                className="text-amber-300 hover:text-white ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* PAINEL TÁTICO DE COMBATE (Combatente & Especialista Infiltrador) */}
          {isOrdemSystem &&
            (() => {
              const unarmedDieSides = ordemNex >= 70 ? 10 : ordemNex >= 35 ? 8 : 6;
              const hasUnarmedAttack = attacks.some(
                (a) => a.isUnarmed || a.name.toLowerCase().includes('desarmado')
              );
              const furtivoBaseDice =
                ordemNex >= 99 ? 4 : ordemNex >= 65 ? 3 : ordemNex >= 40 ? 2 : 1;
              const effectiveFurtivoDice = armedAssassinar
                ? furtivoBaseDice * 2
                : furtivoBaseDice;
              const laminaMalditaCombatAb = abilities.find(
                (a) => a.isActive !== false && (a.id === 'trail-lamina_paranormal-10' || a.name.toLowerCase().includes('lâmina maldita'))
              );
              const gladiadorParanormalAb = abilities.find(
                (a) => a.isActive !== false && (a.id === 'trail-lamina_paranormal-40' || a.name.toLowerCase().includes('gladiador paranormal'))
              );
              const conjuracaoMarcialAb = abilities.find(
                (a) => a.isActive !== false && (a.id === 'trail-lamina_paranormal-65' || a.name.toLowerCase().includes('conjuração marcial'))
              );
              const armaDeSangueAb = abilities.find(
                (a) => a.isActive !== false && (a.id === 'ord-para-sang-arma-sangue' || a.name.toLowerCase().includes('arma de sangue'))
              );
              const showTacticalBar =
                Boolean(combateDefensivoAb) ||
                Boolean(duasArmasAb) ||
                hasGolpeDemolidor ||
                hasAtaqueFurtivo ||
                hasAssassinar ||
                (hasArtistaMarcial && !hasUnarmedAttack) ||
                Boolean(laminaMalditaCombatAb) ||
                Boolean(gladiadorParanormalAb) ||
                Boolean(conjuracaoMarcialAb) ||
                Boolean(armaDeSangueAb);
              if (!showTacticalBar) return null;

              return (
                <div className="bg-zinc-950 border border-red-900/50 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {combateDefensivoAb && (
                      <button
                        type="button"
                        onClick={() => toggleAbilityActive(combateDefensivoAb.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          combateDefensivoAb.isActive !== false
                            ? 'bg-cyan-600 text-white border-cyan-300 shadow'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border-cyan-800/70'
                        }`}
                        title="Quando ativo: +5 na Defesa e -1d20 nos ataques (dura até o seu próximo turno)"
                      >
                        {combateDefensivoAb.isActive !== false
                          ? 'Combate Defensivo ATIVO (+5 Def, -1d20 Atq)'
                          : 'Ativar Combate Defensivo (+5 Def, -1d20 Atq)'}
                      </button>
                    )}

                    {duasArmasAb && (
                      <button
                        type="button"
                        onClick={() => toggleAbilityActive(duasArmasAb.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          duasArmasAb.isActive !== false
                            ? 'bg-amber-600 text-white border-amber-300 shadow'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-amber-800/70'
                        }`}
                        title="Quando ativo: faz 2 ataques sofrendo -1d20 nos testes de ataque"
                      >
                        {duasArmasAb.isActive !== false
                          ? 'Combater c/ Duas Armas ATIVO (-1d20 Atq)'
                          : 'Ativar Combater c/ Duas Armas (-1d20 Atq)'}
                      </button>
                    )}

                    {hasGolpeDemolidor && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!armedGolpeDemolidor && onCheckResource && !onCheckResource(1, 'Golpe Demolidor')) {
                            return;
                          }
                          setArmedGolpeDemolidor((prev) => !prev);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          armedGolpeDemolidor
                            ? 'bg-orange-600 text-white border-orange-300 shadow animate-pulse'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-orange-300 border-orange-800/70'
                        }`}
                        title="Quebrar / atacar objeto: gasta 1 PE para somar +2 dados de dano extra na próxima rolagem de dano"
                      >
                        {armedGolpeDemolidor
                          ? 'Golpe Demolidor ARMADO (-1 PE → +2 dados no próx. dano)'
                          : 'Armar Golpe Demolidor (-1 PE → +2 dados vs Objeto)'}
                      </button>
                    )}

                    {hasAtaqueFurtivo && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!armedAtaqueFurtivo && onCheckResource && !onCheckResource(1, 'Ataque Furtivo')) {
                            return;
                          }
                          setArmedAtaqueFurtivo((prev) => !prev);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          armedAtaqueFurtivo
                            ? 'bg-purple-600 text-white border-purple-300 shadow animate-pulse'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-purple-300 border-purple-800/70'
                        }`}
                        title="1x/rodada contra alvo desprevenido ou flanqueado: gasta 1 PE para somar +Xd6 no próximo dano"
                      >
                        {armedAtaqueFurtivo
                          ? `Ataque Furtivo ARMADO (-1 PE → +${effectiveFurtivoDice}d6 no próx. Dano)`
                          : `Ataque Furtivo (-1 PE → +${effectiveFurtivoDice}d6 no próx. Dano)`}
                      </button>
                    )}

                    {hasAssassinar && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!armedAssassinar && onCheckResource && !onCheckResource(3, 'Assassinar')) {
                            return;
                          }
                          setArmedAssassinar((prev) => {
                            const next = !prev;
                            if (next && hasAtaqueFurtivo) {
                              setArmedAtaqueFurtivo(true);
                            }
                            return next;
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          armedAssassinar
                            ? 'bg-red-700 text-white border-red-300 shadow animate-pulse'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-red-300 border-red-800/70'
                        }`}
                        title="Analisa o alvo (ação de movimento, 3 PE): dobra os dados do Ataque Furtivo e exige Fortitude (DT Agi)"
                      >
                        {armedAssassinar
                          ? `Assassinar ARMADO (-3 PE → Furtivo ${furtivoBaseDice * 2}d6 + Fortitude DT ${10 + peTurnLimit + effAgi})`
                          : `Assassinar (-3 PE → Dobra Furtivo + Fortitude DT ${10 + peTurnLimit + effAgi})`}
                      </button>
                    )}

                    {hasArtistaMarcial && !hasUnarmedAttack && (
                      <button
                        type="button"
                        onClick={() => {
                          const lutaSk = ordemSheetData?.skills.find((s) => s.id === 'luta');
                          onUpdateAttacks([
                            ...attacks,
                            {
                              id: `atk-unarmed-${Math.random().toString(36).slice(2, 7)}`,
                              name: 'Ataque Desarmado (Artista Marcial)',
                              diceCount: Math.max(1, Math.max(effFor, effAgi)),
                              attackBonus:
                                (lutaSk?.trainingDegree || 0) +
                                (lutaSk?.otherModifier || 0),
                              damageFormula: `1d${unarmedDieSides}`,
                              critRange: '20/x2',
                              damageType: 'Impacto',
                              isMelee: true,
                              isFirearm: false,
                              isUnarmed: true,
                            },
                          ]);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-emerald-950/70 hover:bg-emerald-800 text-emerald-200 border-emerald-700 transition cursor-pointer"
                      >
                        + Adicionar Ataque Desarmado (1d{unarmedDieSides})
                      </button>
                    )}

                    {laminaMalditaCombatAb && (
                      <button
                        type="button"
                        onClick={() => setUseLaminaMaldita((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          useLaminaMaldita
                            ? 'bg-purple-600 text-white border-purple-300 shadow'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-purple-300 border-purple-800/70'
                        }`}
                        title="Usa Ocultismo (INT) nos testes de ataque com armas afetadas por Amaldiçoar Arma"
                      >
                        {useLaminaMaldita
                          ? 'Lâmina Maldita ATIVA (Ocultismo / INT)'
                          : 'Ativar Lâmina Maldita (Ocultismo / INT)'}
                      </button>
                    )}

                    {gladiadorParanormalAb && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onGrantTempPe) {
                            onGrantTempPe(2, 'Gladiador Paranormal');
                          }
                          setCombatTabFeedback(
                            'Gladiador Paranormal: +2 PE temporários adicionados por acerto corpo a corpo!'
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-amber-950/70 hover:bg-amber-800 text-amber-200 border-amber-700 transition cursor-pointer"
                        title="Sempre que acerta um ataque corpo a corpo em um inimigo, ganha +2 PE temporários (máx. Limite de PE na cena)"
                      >
                        <Icon name="zap" /> Gladiador Paranormal (+2 PE Temp)
                      </button>
                    )}

                    {conjuracaoMarcialAb && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!onSpendResource(2)) return;
                          setCombatTabFeedback(
                            'Conjuração Marcial (-2 PE): 1 ataque corpo a corpo como ação livre liberado nesta rodada! Role abaixo.'
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-rose-950/70 hover:bg-rose-800 text-rose-200 border-rose-700 transition cursor-pointer"
                        title="1x/rodada após conjurar ritual de ação padrão: gasta 2 PE para fazer um ataque corpo a corpo como ação livre"
                      >
                        <Icon name="swords" /> Conjuração Marcial (-2 PE • Atq. Livre)
                      </button>
                    )}

                    {armaDeSangueAb && (() => {
                      const hasArmaSangueAff = Boolean(
                        armaDeSangueAb.hasAffinityUpgrade ||
                          armaDeSangueAb.name.toLowerCase().includes('afinidade')
                      );
                      const armaSangueDmg = hasArmaSangueAff ? '1d10' : '1d6';
                      const hasArmaSangueInList = attacks.some((a) =>
                        a.name.toLowerCase().includes('arma de sangue')
                      );
                      const extraAtkCost = hasArmaSangueAff ? 0 : 1;
                      return (
                        <>
                          {!hasArmaSangueInList && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!onSpendResource(2)) return;
                                const lutaSk = ordemSheetData?.skills.find((s) => s.id === 'luta');
                                onUpdateAttacks([
                                  ...attacks,
                                  {
                                    id: `atk-arma-sangue-${Math.random().toString(36).slice(2, 7)}`,
                                    name: 'Arma de Sangue',
                                    diceCount: Math.max(1, effFor),
                                    attackBonus:
                                      (lutaSk?.trainingDegree || 0) +
                                      (lutaSk?.otherModifier || 0),
                                    damageFormula: armaSangueDmg,
                                    critRange: '20/x2',
                                    damageType: 'Sangue',
                                    isMelee: true,
                                    isFirearm: false,
                                  },
                                ]);
                                setCombatTabFeedback(
                                  `Arma de Sangue manifestada (-2 PE): dano ${armaSangueDmg} de Sangue adicionada aos ataques!`
                                );
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-red-950/80 hover:bg-red-800 text-red-200 border-red-700 transition cursor-pointer"
                            >
                              <Icon name="sangue" /> Manifestar Arma de Sangue (-2 PE • {armaSangueDmg})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (extraAtkCost > 0 && !onSpendResource(extraAtkCost)) return;
                              const lutaSk = ordemSheetData?.skills.find((s) => s.id === 'luta');
                              const ocultSk = ordemSheetData?.skills.find((s) => s.id === 'ocultismo');
                              const useOcult = Boolean(laminaMalditaCombatAb && useLaminaMaldita);
                              const skBonus = useOcult
                                ? (ocultSk?.trainingDegree || 0) +
                                  (ocultSk?.otherModifier || 0) +
                                  bonuses.skillBonusAll +
                                  (bonuses.skillBonus['ocultismo'] || 0) +
                                  bonuses.attackBonus
                                : (lutaSk?.trainingDegree || 0) +
                                  (lutaSk?.otherModifier || 0) +
                                  bonuses.skillBonusAll +
                                  (bonuses.skillBonus['luta'] || 0) +
                                  bonuses.attackBonus;
                              const diceC = useOcult
                                ? effInt + bonuses.skillDiceAll + (bonuses.skillDice['ocultismo'] || 0) + bonuses.attackDiceBonus
                                : effFor + bonuses.skillDiceAll + (bonuses.skillDice['luta'] || 0) + bonuses.attackDiceBonus;
                              const sides = hasArmaSangueAff ? 10 : 6;
                              onRoll(
                                `Arma de Sangue (Atq. Extra${extraAtkCost === 0 ? ' Afinidade' : ''})`,
                                diceC,
                                20,
                                skBonus,
                                false,
                                {
                                  weaponName: 'Arma de Sangue',
                                  critThreatMin: 20,
                                  critMultiplier: 2,
                                  normalDiceCount: 1,
                                  critDiceCount: 2,
                                  dieSides: sides,
                                  damageModifier: effFor + bonuses.damageBonus + bonuses.meleeDamageBonus,
                                  damageLabelSuffix: ' [Sangue • Ataque Extra]',
                                }
                              );
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-red-900/70 hover:bg-red-700 text-red-100 border-red-600 transition cursor-pointer"
                            title="1x/turno após agredir com outra arma: realiza ataque adicional com a Arma de Sangue"
                          >
                            <Icon name="sangue" /> Atq. Extra Arma de Sangue ({extraAtkCost === 0 ? '0 PE • Afin.' : '-1 PE'})
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}

          {(() => {
            const combatAttacks = attacks.filter((atk) => !isHealingConsumableItem(atk.name));
            return combatAttacks.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">
                Nenhum ataque preparado. Adicione uma arma na aba &quot;<Icon name="backpack" /> Inventário&quot; para gerar seu ataque automaticamente!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {combatAttacks.map((atk) => {
                // Classificação de arma (corpo a corpo, arremesso, disparo, arma de fogo, ágil, desarmado)
                const lowerAtkName = atk.name.toLowerCase();
                const invMatch =
                  (atk.linkedItemId
                    ? inventory.find((it) => it.id === atk.linkedItemId)
                    : undefined) ||
                  inventory.find(
                    (it) =>
                      it.name.toLowerCase() === lowerAtkName ||
                      lowerAtkName.includes(it.name.toLowerCase()) ||
                      it.name.toLowerCase().includes(lowerAtkName)
                  );
                const compMatch = compendiumEntries.find(
                  (ce) =>
                    ce.category === 'item' &&
                    (ce.name.toLowerCase() === lowerAtkName ||
                      lowerAtkName.includes(ce.name.toLowerCase()) ||
                      ce.name.toLowerCase().includes(lowerAtkName))
                );
                const descLower = (invMatch?.description || compMatch?.description || '').toLowerCase();
                const isUnarmed = Boolean(atk.isUnarmed || lowerAtkName.includes('desarmado'));

                // Regra da Soqueira / Punhos Enraivecidos (p. 66 / p. 148):
                // Aplica modificações e maldições da soqueira equipada aos ataques desarmados!
                const soqueiraEquipped = isUnarmed
                  ? inventory.find(
                      (it) =>
                        it.isEquipped &&
                        (it.name.toLowerCase().includes('soqueira') ||
                          it.name.toLowerCase().includes('punhos enraivecidos'))
                    )
                  : undefined;

                const weaponMods = isOrdemSystem
                  ? computeOrdemWeaponBonusesFromItem(invMatch, soqueiraEquipped)
                  : computeOrdemWeaponBonusesFromItem(undefined, undefined);

                const weaponClass = classifyOrdemWeapon(
                  atk.name,
                  descLower,
                  atk.isFirearm,
                  atk.damageType,
                  isUnarmed
                );

                const isFirearm = weaponClass.isFirearm;
                const isDisparo = weaponClass.isDisparo;
                const isRanged = weaponClass.isRanged;
                const isMelee = weaponClass.isMelee;
                const isThrown = weaponClass.isThrown;
                const isAgile = weaponClass.isAgile || (isUnarmed && hasArtistaMarcial);
                const isArcoComposto = weaponClass.isArcoComposto;
                const isMotosserra = lowerAtkName.includes('motosserra');
                const isArcabuz = lowerAtkName.includes('arcabuz dos moretti');

                const isRajadaActive = Boolean(
                  isOrdemSystem && isFirearm && weaponMods.isAutomatic && rajadaByAttackId[atk.id]
                );
                const isEnergeticaActive = Boolean(
                  isOrdemSystem && weaponMods.hasEnergetica && energeticaByAttackId[atk.id]
                );
                const isAntielementoActive = Boolean(
                  isOrdemSystem && weaponMods.antielementoChosen && antielementoByAttackId[atk.id]
                );
                const isEmpuxoThrown = Boolean(
                  isOrdemSystem && weaponMods.hasEmpuxo && empuxoByAttackId[atk.id]
                );

                // Munições modificadas / Jurada disponíveis na mochila (para armas de fogo)
                const hasDumDumAmmo = isFirearm && inventory.some(
                  (it) => (it.modifications || []).includes('mod-dum-dum')
                );
                const hasExplosivaAmmo = isFirearm && inventory.some(
                  (it) => (it.modifications || []).includes('mod-explosiva')
                );
                const hasMunicaoJurada = isFirearm && inventory.some(
                  (it) => it.name.toLowerCase().includes('munição jurada') || it.name.toLowerCase().includes('municao jurada')
                );
                const activeAmmoMod = isFirearm ? ammoModByAttackId[atk.id] || 'none' : 'none';

                const isAniqFav =
                  hasAFavorita &&
                  Boolean(
                    atk.isAniquiladorFavorite ||
                      invMatch?.isAniquiladorFavorite
                  );

                // Base do dano (atualiza dado do Artista Marcial conforme NEX ou Arcabuz dos Moretti 1d6)
                const rawDmgParsed = parseDiceFormula(atk.damageFormula);
                const artMarcialSides = ordemNex >= 70 ? 10 : ordemNex >= 35 ? 8 : 6;
                const arcabuzSides = isArcabuz ? arcabuzDieByAttackId[atk.id] || 8 : rawDmgParsed.sides;
                const effectiveDamageSides = isArcabuz
                  ? arcabuzSides
                  : isUnarmed && hasArtistaMarcial
                  ? artMarcialSides
                  : rawDmgParsed.sides;

                // Dados de Dano extras: Golpe Pesado, Máquina de Matar, Calibre Grosso, Rajada, Empuxo (arremesso)
                const golpePesadoExtraDice =
                  hasGolpePesado && isMelee && !isUnarmed ? 1 : 0;
                const maquinaMatarExtraDice =
                  isAniqFav && hasMaquinaMatar ? 1 : 0;
                const calibreGrossoExtraDice = weaponMods.extraDamageDiceCount;
                const rajadaExtraDice = isRajadaActive ? 1 : 0;
                const empuxoExtraDice = isEmpuxoThrown ? 1 : 0;
                const baseDamageDiceCount =
                  (isArcabuz ? 2 : rawDmgParsed.count) +
                  golpePesadoExtraDice +
                  maquinaMatarExtraDice +
                  calibreGrossoExtraDice +
                  rajadaExtraDice +
                  empuxoExtraDice;

                // Perícias de Ataque em Ordem Paranormal: Pontaria para fogo/disparo, Luta para corpo a corpo (ou Ocultismo/INT se Lâmina Maldita estiver ativo)
                const pontariaSk = ordemSheetData?.skills.find((s) => s.id === 'pontaria');
                const lutaSk = ordemSheetData?.skills.find((s) => s.id === 'luta');
                const ocultismoSk = ordemSheetData?.skills.find((s) => s.id === 'ocultismo');

                const pontariaSkillBonus =
                  (pontariaSk?.trainingDegree || 0) +
                  (pontariaSk?.otherModifier || 0) +
                  bonuses.skillBonusAll +
                  (bonuses.skillBonus['pontaria'] || 0);

                const lutaSkillBonus =
                  (lutaSk?.trainingDegree || 0) +
                  (lutaSk?.otherModifier || 0) +
                  bonuses.skillBonusAll +
                  (bonuses.skillBonus['luta'] || 0);

                const ocultismoSkillBonus =
                  (ocultismoSk?.trainingDegree || 0) +
                  (ocultismoSk?.otherModifier || 0) +
                  bonuses.skillBonusAll +
                  (bonuses.skillBonus['ocultismo'] || 0);

                const usingLaminaMalditaAttack = Boolean(
                  isOrdemSystem &&
                    useLaminaMaldita &&
                    abilities.some(
                      (a) =>
                        a.isActive !== false &&
                        (a.id === 'trail-lamina_paranormal-10' ||
                          a.name.toLowerCase().includes('lâmina maldita'))
                    )
                );

                const meleeBaseAttr = isAgile ? Math.max(effFor, effAgi) : effFor;
                const attackAttrKey: 'agi' | 'for' = isRanged
                  ? 'agi'
                  : isAgile && effAgi > effFor
                  ? 'agi'
                  : 'for';
                const attackCursePrice = isOrdemSystem
                  ? bonuses.cursePriceByAttr?.[attackAttrKey]
                  : null;
                const attackCursePrompt =
                  attackCursePrice && attackCursePrice.curseCount > 0
                    ? {
                        element: attackCursePrice.element,
                        attributeLabel: attackCursePrice.attrLabel,
                        curseCount: attackCursePrice.curseCount,
                        sanLossOnFail: attackCursePrice.sanLoss,
                      }
                    : undefined;

                // Dados de Ataque (d20):
                // - Armas de fogo e de disparo usam Agilidade (effAgi) + bônus de dados de Pontaria
                // - Armas corpo a corpo usam Força (ou Agilidade se ágil) + bônus de dados de Luta
                // - Lâmina Maldita: usa Intelecto (effInt) + bônus de dados de Ocultismo
                // Motosserra impõe -1d20; Rajada sem Compensador impõe -1d20; Sem Proficiência impõe -2d20 (p. 54)
                const weaponProfCheck = isOrdemSystem
                  ? checkOrdemWeaponProficiency(
                      atk.name,
                      bonuses.effectiveProficiencies,
                      descLower,
                      isUnarmed
                    )
                  : { proficient: true, requiredLabel: '', penaltyDice: 0 };
                const motosserraDicePenalty = isOrdemSystem && isMotosserra ? -1 : 0;
                const rajadaDicePenalty =
                  isRajadaActive && !weaponMods.hasCompensador ? -1 : 0;
                const rawAttackDice = isOrdemSystem
                  ? usingLaminaMalditaAttack
                    ? effInt + bonuses.skillDiceAll + (bonuses.skillDice['ocultismo'] || 0)
                    : isRanged
                    ? effAgi + bonuses.skillDiceAll + (bonuses.skillDice['pontaria'] || 0)
                    : meleeBaseAttr + bonuses.skillDiceAll + (bonuses.skillDice['luta'] || 0)
                  : atk.diceCount || 1;
                const finalAttackDice =
                  rawAttackDice +
                  bonuses.attackDiceBonus +
                  motosserraDicePenalty +
                  rajadaDicePenalty +
                  weaponProfCheck.penaltyDice;

                // Bônus de Ataque (+X):
                // - Armas de fogo e de disparo usam o teste de Pontaria
                // - Armas corpo a corpo usam o teste de Luta
                // - Lâmina Maldita: usa Ocultismo
                const workToolAtkBonus = atk.isWorkTool || invMatch?.isFavoriteTool ? 1 : 0;
                const combatSkillBonus = usingLaminaMalditaAttack
                  ? ocultismoSkillBonus
                  : isRanged
                  ? pontariaSkillBonus
                  : lutaSkillBonus;
                const energeticaAtkBonus = isEnergeticaActive ? 5 : 0;
                const juradaAtkBonus = activeAmmoMod === 'jurada' ? 10 : 0;
                const finalAttackBonus = isOrdemSystem
                  ? combatSkillBonus +
                    bonuses.attackBonus +
                    workToolAtkBonus +
                    weaponMods.attackBonus +
                    energeticaAtkBonus +
                    juradaAtkBonus
                  : atk.attackBonus + bonuses.attackBonus + workToolAtkBonus;

                // Modificador de Dano:
                // Em Ordem Paranormal:
                // - Armas corpo a corpo somam FOR (ou AGI se ágil).
                // - Armas de arremesso somam FOR.
                // - Arco Composto soma FOR.
                // - Armas de fogo e outras armas de disparo (arco simples, besta, balestra) NÃO somam força ao dano!
                const usesLongBullets =
                  isFirearm &&
                  !lowerAtkName.includes('submetralhadora') &&
                  (descLower.includes('balas longas') ||
                    lowerAtkName.includes('fuzil') ||
                    lowerAtkName.includes('sniper') ||
                    lowerAtkName.includes('rifle') ||
                    lowerAtkName.includes('carabina') ||
                    lowerAtkName.includes('metralhadora'));
                const miraDeEliteBonus = hasMiraDeElite && usesLongBullets ? effInt : 0;
                const ninjaUrbanoBonus =
                  hasNinjaUrbano && (isMelee || isDisparo) && !isFirearm && !isUnarmed ? 2 : 0;

                const specificTypeDamageBonus =
                  (isMelee ? bonuses.meleeDamageBonus : 0) +
                  (isFirearm ? bonuses.firearmDamageBonus : 0);
                const tiroCerteiroBonus =
                  hasTiroCerteiro && (isDisparo || isThrown) ? effAgi : 0;
                const workToolDmgBonus = atk.isWorkTool || invMatch?.isFavoriteTool ? 1 : 0;

                const addsAttrToDamage = isOrdemSystem && (isMelee || isThrown || isArcoComposto);
                const attrDamageMod =
                  addsAttrToDamage && rawDmgParsed.modifier === 0
                    ? isAgile && isMelee
                      ? Math.max(effFor, effAgi)
                      : effFor
                    : 0;

                const finalDamageMod =
                  rawDmgParsed.modifier +
                  attrDamageMod +
                  bonuses.damageBonus +
                  specificTypeDamageBonus +
                  tiroCerteiroBonus +
                  miraDeEliteBonus +
                  ninjaUrbanoBonus +
                  workToolDmgBonus +
                  weaponMods.damageBonus;

                const isFuzilPrecisao =
                  lowerAtkName.includes('fuzil de precisão') ||
                  lowerAtkName.includes('fuzil de precisao') ||
                  lowerAtkName.includes('sniper') ||
                  descLower.includes('veterano em pontaria ao mirar');
                const isAimingFuzil = Boolean(isFuzilPrecisao && aimingByAttackId[atk.id]);
                const isDisparoLetalArmed = Boolean(
                  hasDisparoLetal && isRanged && disparoLetalByAttackId[atk.id]
                );
                const isAtirarParaMatarActive = Boolean(
                  isOrdemSystem && hasAtirarParaMatar && isFirearm
                );

                // Margem e Multiplicador Crítico: Técnica Letal (+2), Máquina de Matar (+2), Técnica Secreta, Mirar (+5), Disparo Letal (+2), Golpe de Sorte (+1/+1x Afinidade), Arma Atroz
                const golpeSorteAb = abilities.find(
                  (a) =>
                    a.isActive !== false &&
                    (a.id === 'ord-para-ener-golpe-sorte' ||
                      a.name.toLowerCase().includes('golpe de sorte'))
                );
                const hasGolpeSorteAfinidade = Boolean(
                  golpeSorteAb &&
                    (golpeSorteAb.hasAffinityUpgrade ||
                      golpeSorteAb.name.toLowerCase().includes('afinidade'))
                );
                const sceneEffectsCombat = ordemSheetData?.sceneEffects || [];
                const armaAtrozEf = isMelee
                  ? sceneEffectsCombat.find((ef) =>
                      (ef.name || '').toLowerCase().includes('arma atroz')
                    )
                  : undefined;
                const armaAtrozText = armaAtrozEf
                  ? `${armaAtrozEf.name} ${armaAtrozEf.description || ''}`.toLowerCase()
                  : '';

                // Margem e Multiplicador Crítico:
                // Regra oficial p. 146: efeitos que DUPLICAM a margem (Predadora, Munição Jurada) aplicam-se ANTES de efeitos que a aumentam!
                let critBaseAfterDouble = atk.critRange;
                if (weaponMods.doublesCritThreat || activeAmmoMod === 'jurada') {
                  critBaseAfterDouble = doubleCritThreatRange(critBaseAfterDouble);
                }
                let critThreatSteps = weaponMods.critThreatBonus; // Perigosa (+2) / Mira Laser (+2)
                if (hasTecnicaLetal && isMelee) critThreatSteps += 2;
                if (isAniqFav && hasMaquinaMatar) critThreatSteps += 2;
                if (isAniqFav && hasTecnicaSublime) {
                  if (secLetal === 1) critThreatSteps += 2;
                  if (secLetal === 2) critThreatSteps += 5;
                }
                if (isAimingFuzil) critThreatSteps += 5;
                if (isDisparoLetalArmed) critThreatSteps += 2;
                if (golpeSorteAb) critThreatSteps += 1;
                if (armaAtrozEf) {
                  critThreatSteps += armaAtrozText.includes('verdadeiro') ? 2 : 1;
                }
                let effectiveCritRange = boostCritRangeBySteps(critBaseAfterDouble, critThreatSteps);
                let extraCritMult = 0;
                if (isAniqFav && hasTecnicaSecreta && secDestruidor) extraCritMult += 1;
                if (activeAmmoMod === 'dumdum') extraCritMult += 1;
                if (hasGolpeSorteAfinidade) extraCritMult += 1;
                if (armaAtrozEf && armaAtrozText.includes('verdadeiro')) extraCritMult += 2;
                if (extraCritMult > 0) {
                  effectiveCritRange = boostCritMultiplier(effectiveCritRange, extraCritMult);
                }
                const critParsed = parseCritRange(effectiveCritRange);
                const critBaseDamageDiceCount = baseDamageDiceCount * critParsed.multiplier;

                // Dados Extras de Maldições / Munições (Lancinante multiplica no crítico!)
                const extraDiceNormal: Array<{ count: number; sides: number; label: string }> = [];
                const extraDiceCrit: Array<{ count: number; sides: number; label: string }> = [];
                for (const ed of weaponMods.extraDamageDice) {
                  extraDiceNormal.push({ count: ed.count, sides: ed.sides, label: ed.label });
                  extraDiceCrit.push({
                    count: ed.multipliesOnCrit ? ed.count * critParsed.multiplier : ed.count,
                    sides: ed.sides,
                    label: ed.multipliesOnCrit
                      ? `${ed.label} [Crít x${critParsed.multiplier}]`
                      : ed.label,
                  });
                }
                if (activeAmmoMod === 'explosiva') {
                  extraDiceNormal.push({ count: 2, sides: 6, label: 'Munição Explosiva' });
                  extraDiceCrit.push({ count: 2, sides: 6, label: 'Munição Explosiva' });
                }
                if (activeAmmoMod === 'jurada') {
                  extraDiceNormal.push({ count: 6, sides: 12, label: 'Munição Jurada (Conhecimento)' });
                  extraDiceCrit.push({ count: 6, sides: 12, label: 'Munição Jurada (Conhecimento)' });
                }
                if (isAntielementoActive && weaponMods.antielementoChosen) {
                  const lbl = `Antielemento (${weaponMods.antielementoChosen})`;
                  extraDiceNormal.push({ count: 4, sides: 8, label: lbl });
                  extraDiceCrit.push({ count: 4, sides: 8, label: lbl });
                }
                const extraDiceNormalText =
                  extraDiceNormal.length > 0
                    ? ' + ' + extraDiceNormal.map((e) => `${e.count}d${e.sides}`).join(' + ')
                    : '';
                const extraDiceCritText =
                  extraDiceCrit.length > 0
                    ? ' + ' + extraDiceCrit.map((e) => `${e.count}d${e.sides}`).join(' + ')
                    : '';
                const explodingDieSide = isOrdemSystem && isMotosserra ? 6 : undefined;

                const previewPendingDmg =
                  pendingSpecialDamageBonus && pendingSpecialDamageBonus.attackId === atk.id
                    ? pendingSpecialDamageBonus.dmgBonus
                    : 0;
                const previewGolpeDemolidorDice = armedGolpeDemolidor ? 2 : 0;

                const displayedDmgDice = baseDamageDiceCount + previewGolpeDemolidorDice;
                const displayedCritDmgDice = critBaseDamageDiceCount + previewGolpeDemolidorDice;
                const displayedDmgMod = finalDamageMod + previewPendingDmg;

                // Técnica Secreta PE total para esta arma favorita
                const tecnicaSecretaCost = isAniqFav && hasTecnicaSecreta
                  ? (secAmplo ? 2 : 0) +
                    (secDestruidor ? 2 : 0) +
                    (hasTecnicaSublime ? secLetal * 2 + (secPerfurante ? 2 : 0) : 0)
                  : 0;
                const disparoLetalCost = isDisparoLetalArmed ? 1 : 0;

                const isAeOpen = hasAtaqueEspecial && activeAeAttackId === atk.id;
                const aeTotalInvested = aeAtkInvest + aeDmgInvest;
                const aeSteps = aeTotalInvested / 5;
                const aePeCostCalculated = aeSteps > 0 ? 1 + aeSteps : 0;
                const aeMult = hasPotenciaMaxima && isMelee ? 2 : 1;
                const appliedAeAtk = aeAtkInvest * aeMult;
                const appliedAeDmg = aeDmgInvest * aeMult;
                const weaponActiveCursePeCost =
                  (isEnergeticaActive ? 2 : 0) + (isAntielementoActive ? 2 : 0);
                const furtivoPeCostPreview = (armedAtaqueFurtivo ? 1 : 0) + (armedAssassinar ? 3 : 0);
                const golpeDemolidorCostPreview = armedGolpeDemolidor ? 1 : 0;
                const totalAeConfirmPe =
                  aePeCostCalculated +
                  tecnicaSecretaCost +
                  weaponActiveCursePeCost +
                  disparoLetalCost +
                  furtivoPeCostPreview +
                  golpeDemolidorCostPreview;

                const foPayload: ForcaOpressoraRollPayload | undefined =
                  isOrdemSystem && hasForcaOpressora && isMelee
                    ? {
                        weaponName: atk.name,
                        lutaDiceCount:
                          effFor + bonuses.skillDiceAll + (bonuses.skillDice['luta'] || 0),
                        lutaBonus:
                          (lutaSk?.trainingDegree || 0) +
                          (lutaSk?.otherModifier || 0) +
                          bonuses.skillBonusAll +
                          (bonuses.skillBonus['luta'] || 0),
                      }
                    : undefined;

                function buildTecnicaSecretaLabels(dmgSuffixTarget: string[]) {
                  if (tecnicaSecretaCost <= 0) return '';
                  const effectsNames: string[] = [];
                  if (secAmplo) effectsNames.push('Amplo');
                  if (secDestruidor) effectsNames.push('Destruidor +1x');
                  if (hasTecnicaSublime && secLetal === 1) effectsNames.push('Letal +2');
                  if (hasTecnicaSublime && secLetal === 2) effectsNames.push('Letal 2x +5');
                  if (hasTecnicaSublime && secPerfurante) {
                    effectsNames.push('Perfurante (Ignora 5 RD)');
                    dmgSuffixTarget.push('Perfurante: Ignora 5 RD');
                  }
                  return `Técnica Secreta: ${effectsNames.join(', ')}`;
                }

                function buildSegurarGatilhoPayload(batchId: string): SegurarGatilhoPayload | undefined {
                  if (!isOrdemSystem || !hasSegurarGatilho || !isFirearm) return undefined;
                  return {
                    enabled: true,
                    batchId,
                    shotIndex: 1,
                    nextExtraShotStep: segurarGatilhoStep,
                    weaponName: atk.name,
                    baseAttackDice: finalAttackDice,
                    baseAttackBonus: finalAttackBonus,
                    baseDamageModifier: finalDamageMod,
                    critThreatMin: critParsed.threatMin,
                    critMultiplier: critParsed.multiplier,
                    normalDiceCount: baseDamageDiceCount,
                    critDiceCount: critBaseDamageDiceCount,
                    dieSides: effectiveDamageSides,
                    hasAtaqueEspecial,
                    maxAeTotalBonus,
                    aeMult,
                    peTurnLimit,
                    maximizeCritDamage: isAtirarParaMatarActive,
                    tecnicaSecretaCost,
                    tecnicaSecretaAttackSuffix: buildTecnicaSecretaLabels([]),
                    tecnicaSecretaDamageSuffix:
                      isAniqFav && hasTecnicaSublime && secPerfurante
                        ? 'Perfurante: Ignora 5 RD'
                        : undefined,
                  };
                }

                function handleRollDamage(isCrit: boolean) {
                  let dmgDiceToUse = isCrit ? critBaseDamageDiceCount : baseDamageDiceCount;
                  let dmgModToUse = finalDamageMod;
                  const suffixParts: string[] = isCrit ? [`x${critParsed.multiplier}`] : [];
                  let peToSpend = 0;

                  if (armedGolpeDemolidor) peToSpend += 1;
                  const useFurtivo = armedAtaqueFurtivo || armedAssassinar;
                  if (armedAtaqueFurtivo) peToSpend += 1;
                  if (armedAssassinar) peToSpend += 3;

                  if (peToSpend > 0 && !onSpendResource(peToSpend)) {
                    return;
                  }

                  if (
                    pendingSpecialDamageBonus &&
                    pendingSpecialDamageBonus.attackId === atk.id
                  ) {
                    dmgModToUse += pendingSpecialDamageBonus.dmgBonus;
                    suffixParts.push(
                      `Ataque Especial +${pendingSpecialDamageBonus.dmgBonus} Dano`
                    );
                    setPendingSpecialDamageBonus(null);
                  }

                  if (armedGolpeDemolidor) {
                    dmgDiceToUse += 2;
                    suffixParts.push('Golpe Demolidor +2 dados');
                    setArmedGolpeDemolidor(false);
                  }

                  if (useFurtivo) {
                    const furtivoBase =
                      ordemNex >= 99 ? 4 : ordemNex >= 65 ? 3 : ordemNex >= 40 ? 2 : 1;
                    const furtivoDiceCount = armedAssassinar ? furtivoBase * 2 : furtivoBase;
                    let furtivoSum = 0;
                    for (let i = 0; i < furtivoDiceCount; i++) {
                      furtivoSum += Math.floor(Math.random() * 6) + 1;
                    }
                    dmgModToUse += furtivoSum;
                    const assassinarSuffix = armedAssassinar
                      ? ` • Assassinar (Fortitude DT ${10 + peTurnLimit + effAgi})`
                      : '';
                    suffixParts.push(
                      `Ataque Furtivo +${furtivoDiceCount}d6: +${furtivoSum}${assassinarSuffix}`
                    );
                    setArmedAtaqueFurtivo(false);
                    setArmedAssassinar(false);
                  }

                  const ritualDmgExtras = rollRitualWeaponDamageExtras(
                    isMelee,
                    ordemSheetData?.sceneEffects || []
                  );
                  if (ritualDmgExtras.totalBonus > 0) {
                    dmgModToUse += ritualDmgExtras.totalBonus;
                    suffixParts.push(...ritualDmgExtras.labels);
                  }

                  if (isCrit && isAtirarParaMatarActive) {
                    suffixParts.push('Atirar para Matar (Dano Máx.)');
                  }

                  if (isAniqFav && hasTecnicaSublime && secPerfurante) {
                    suffixParts.push('Perfurante: Ignora 5 RD');
                  }
                  if (isEnergeticaActive) {
                    suffixParts.push('Energética: Dano de Energia / Ignora RD');
                  }
                  if (isAntielementoActive && weaponMods.antielementoChosen) {
                    suffixParts.push(`Antielemento (${weaponMods.antielementoChosen})`);
                  }
                  if (isMotosserra) {
                    suffixParts.push('Motosserra: 6 explode');
                  }
                  if (activeAmmoMod === 'dumdum') {
                    suffixParts.push('Dum-Dum');
                  } else if (activeAmmoMod === 'explosiva') {
                    suffixParts.push('Explosiva');
                  } else if (activeAmmoMod === 'jurada') {
                    suffixParts.push('Munição Jurada');
                  }
                  if (weaponMods.sanguinariaCritTempHp) {
                    suffixParts.push(
                      isCrit
                        ? 'Sanguinária: Fraco + Sangrando + 2d10 PV Temp'
                        : 'Sanguinária: Sangrando (1d6/rod)'
                    );
                  }
                  if (weaponMods.ritualisticaStored) {
                    suffixParts.push(`Ritualística: ${weaponMods.ritualisticaStored}`);
                  }

                  const extraDiceToUse = isCrit ? extraDiceCrit : extraDiceNormal;
                  const labelSuffix =
                    suffixParts.length > 0 ? ` [${suffixParts.join(' • ')}]` : '';
                  onRoll(
                    `${isCrit ? 'Dano Crítico' : 'Dano'}: ${atk.name}${labelSuffix}`,
                    dmgDiceToUse,
                    effectiveDamageSides,
                    dmgModToUse,
                    true,
                    isCrit && isAtirarParaMatarActive
                      ? {
                          weaponName: atk.name,
                          critThreatMin: 1,
                          critMultiplier: critParsed.multiplier,
                          normalDiceCount: baseDamageDiceCount,
                          critDiceCount: critBaseDamageDiceCount,
                          dieSides: effectiveDamageSides,
                          damageModifier: dmgModToUse,
                          maximizeCritDamage: true,
                        }
                      : undefined,
                    foPayload,
                    explodingDieSide || extraDiceToUse.length > 0
                      ? {
                          explodingDieSide,
                          extraDice: extraDiceToUse.length > 0 ? extraDiceToUse : undefined,
                        }
                      : undefined
                  );
                }

                return (
                  <div
                    key={atk.id}
                    className={`bg-zinc-950 border p-3.5 rounded-xl flex flex-col gap-2.5 ${
                      isAniqFav
                        ? 'border-red-600/80'
                        : weaponMods.activeCurses.length > 0
                        ? 'border-purple-700/70'
                        : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white">{atk.name}</h4>
                          {isAniqFav && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">
                              <Icon name="sword" /> A Favorita
                            </span>
                          )}
                          {isMotosserra && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-700">
                              <Icon name="hammer" /> -1d20 Atq • 6 explode
                            </span>
                          )}
                          {isUnarmed && soqueiraEquipped && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300 border border-amber-700/60">
                              {soqueiraEquipped.name}
                            </span>
                          )}
                          {golpePesadoExtraDice > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                              Golpe Pesado (+1 dado)
                            </span>
                          )}
                          {hasTecnicaLetal && isMelee && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300 border border-amber-700/60">
                              <Icon name="swords" /> Técnica Letal (+2 Crít)
                            </span>
                          )}
                          {tiroCerteiroBonus !== 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                              Tiro Certeiro (+{tiroCerteiroBonus})
                            </span>
                          )}
                          {miraDeEliteBonus > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700">
                              <Icon name="target" /> Mira de Elite (+{miraDeEliteBonus} Dano)
                            </span>
                          )}
                          {ninjaUrbanoBonus > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                              <Icon name="mask" /> Ninja Urbano (+2 Dano)
                            </span>
                          )}
                          {isAtirarParaMatarActive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-200 border border-red-600">
                              <Icon name="skull" /> Atirar p/ Matar (Crít. Máx.)
                            </span>
                          )}
                          {hasSegurarGatilho && isFirearm && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-700/70">
                              <Icon name="flame" /> Segurar o Gatilho
                            </span>
                          )}
                          {isAimingFuzil && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600">
                              <Icon name="target" /> Mirando (+5 Crít)
                            </span>
                          )}
                          {isDisparoLetalArmed && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600">
                              <Icon name="target" /> Disparo Letal (+2 Crít)
                            </span>
                          )}
                          {!weaponProfCheck.proficient && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-200 border border-red-700"
                              title={`Exige proficiência: ${weaponProfCheck.requiredLabel} (p. 54: -2d20 nos testes de ataque)`}
                            >
                              <Icon name="warning" /> Sem Proficiência (-2d20 Atq • {weaponProfCheck.requiredLabel})
                            </span>
                          )}
                          {weaponMods.badges.map((b, bIdx) => (
                            <span
                              key={bIdx}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                b.startsWith('👁️')
                                  ? 'bg-purple-950/70 text-purple-200 border-purple-700/70'
                                  : 'bg-zinc-900 text-amber-200 border-zinc-700'
                              }`}
                            >
                              {stripEmoji(b)}
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] font-mono text-zinc-500">
                          Crítico: {effectiveCritRange}
                          {effectiveCritRange !== atk.critRange ? ` (base ${atk.critRange})` : ''}
                          {weaponMods.ritualisticaStored && (
                            <span className="ml-2 text-purple-300">
                              • <Icon name="sigil" /> Ritualística: {weaponMods.ritualisticaStored}
                            </span>
                          )}
                        </span>

                        {hasAFavorita && !isAniqFav && canChangeAniquiladorFavorite && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAttacks(
                                attacks.map((a) => ({
                                  ...a,
                                  isAniquiladorFavorite: a.id === atk.id,
                                }))
                              );
                              onUpdateInventory(
                                inventory.map((it) => ({
                                  ...it,
                                  isAniquiladorFavorite:
                                    it.name.toLowerCase() === atk.name.toLowerCase(),
                                }))
                              );
                            }}
                            className="block mt-1 text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                          >
                            <Icon name="sword" /> Definir como A Favorita (Aniquilador)
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {isFuzilPrecisao && (
                          <button
                            type="button"
                            onClick={() =>
                              setAimingByAttackId((prev) => ({
                                ...prev,
                                [atk.id]: !prev[atk.id],
                              }))
                            }
                            className={`px-2.5 py-1.5 rounded text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                              isAimingFuzil
                                ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border-emerald-800/70'
                            }`}
                            title="Ação de movimento para Mirar com Fuzil de Precisão: concede +5 na margem de ameaça"
                          >
                            <input
                              type="checkbox"
                              checked={isAimingFuzil}
                              readOnly
                              className="pointer-events-none accent-emerald-300 w-3.5 h-3.5"
                            />
                            <Icon name="target" /> Mirar (+5 Crít)
                          </button>
                        )}

                        {hasDisparoLetal && isRanged && (
                          <button
                            type="button"
                            onClick={() =>
                              setDisparoLetalByAttackId((prev) => ({
                                ...prev,
                                [atk.id]: !prev[atk.id],
                              }))
                            }
                            className={`px-2.5 py-1.5 rounded text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                              isDisparoLetalArmed
                                ? 'bg-cyan-600 text-white border-cyan-300 shadow'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-cyan-300 border-cyan-800/70'
                            }`}
                            title="Ao Mirar, gaste 1 PE no ataque para aumentar +2 na margem de ameaça"
                          >
                            <input
                              type="checkbox"
                              checked={isDisparoLetalArmed}
                              readOnly
                              className="pointer-events-none accent-cyan-300 w-3.5 h-3.5"
                            />
                            <Icon name="target" /> Disparo Letal (-1 PE → +2 Crít)
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const suffixParts: string[] = [];
                            const dmgSuffixParts: string[] = [];

                            if (isAimingFuzil) {
                              suffixParts.push('Mirando (+5 Crít)');
                            }
                            if (!weaponProfCheck.proficient) {
                              suffixParts.push('Sem Proficiência -2d20');
                            }
                            if (isDisparoLetalArmed) {
                              suffixParts.push('Disparo Letal (+2 Crít)');
                            }
                            if (isRajadaActive) {
                              suffixParts.push('Rajada (+1 dado)');
                            }
                            if (isEmpuxoThrown) {
                              suffixParts.push('Empuxo Arremesso (+1 dado)');
                            }
                            if (activeAmmoMod === 'dumdum') {
                              suffixParts.push('Dum-Dum (+1x Crít)');
                              dmgSuffixParts.push('Dum-Dum');
                            } else if (activeAmmoMod === 'explosiva') {
                              suffixParts.push('Munição Explosiva (+2d6)');
                              dmgSuffixParts.push('Explosiva');
                            } else if (activeAmmoMod === 'jurada') {
                              suffixParts.push('Munição Jurada (+10 Atq, 2x Crít, +6d12)');
                              dmgSuffixParts.push('Munição Jurada');
                            }

                            let extraDiceFromGolpe = 0;
                            let extraDmgFromFurtivo = 0;
                            let furtivoPe = 0;
                            if (armedAtaqueFurtivo) furtivoPe += 1;
                            if (armedAssassinar) furtivoPe += 3;
                            const golpeDemolidorCost = armedGolpeDemolidor ? 1 : 0;

                            const totalAttackPe =
                              tecnicaSecretaCost +
                              weaponActiveCursePeCost +
                              disparoLetalCost +
                              furtivoPe +
                              golpeDemolidorCost;
                            if (totalAttackPe > 0) {
                              if (isOrdemSystem && totalAttackPe > peTurnLimit) {
                                setCombatTabFeedback(
                                  `Custo do ataque (${totalAttackPe} PE) excede seu limite de ${peTurnLimit} PE/turno!`
                                );
                                return;
                              }
                              if (!onSpendResource(totalAttackPe)) return;
                              if (tecnicaSecretaCost > 0) {
                                const tsLabel = buildTecnicaSecretaLabels(dmgSuffixParts);
                                if (tsLabel) suffixParts.push(tsLabel);
                              }
                            }

                            if (armedGolpeDemolidor) {
                              extraDiceFromGolpe = 2;
                              dmgSuffixParts.push('Golpe Demolidor +2 dados');
                              suffixParts.push('Golpe Demolidor +2 dados');
                              setArmedGolpeDemolidor(false);
                            }

                            if (armedAtaqueFurtivo || armedAssassinar) {
                              const furtivoBase =
                                ordemNex >= 99 ? 4 : ordemNex >= 65 ? 3 : ordemNex >= 40 ? 2 : 1;
                              const furtivoDiceCount = armedAssassinar ? furtivoBase * 2 : furtivoBase;
                              let furtivoSum = 0;
                              for (let i = 0; i < furtivoDiceCount; i++) {
                                furtivoSum += Math.floor(Math.random() * 6) + 1;
                              }
                              extraDmgFromFurtivo = furtivoSum;
                              const assassinarSuffix = armedAssassinar
                                ? ` • Assassinar (Fortitude DT ${10 + peTurnLimit + effAgi})`
                                : '';
                              dmgSuffixParts.push(
                                `Ataque Furtivo +${furtivoDiceCount}d6: +${furtivoSum}${assassinarSuffix}`
                              );
                              suffixParts.push(
                                `Ataque Furtivo +${furtivoDiceCount}d6 (+${furtivoSum})`
                              );
                              setArmedAtaqueFurtivo(false);
                              setArmedAssassinar(false);
                            }

                            if (isEnergeticaActive) {
                              suffixParts.push('Energética (+5 Atq, Energia)');
                              dmgSuffixParts.push('Energética: Energia / Ignora RD');
                            }
                            if (isAntielementoActive && weaponMods.antielementoChosen) {
                              suffixParts.push(`Antielemento ${weaponMods.antielementoChosen}`);
                              dmgSuffixParts.push(`Antielemento (${weaponMods.antielementoChosen})`);
                            }
                            if (isMotosserra) {
                              dmgSuffixParts.push('Motosserra: 6 explode');
                            }
                            if (weaponMods.sanguinariaCritTempHp) {
                              dmgSuffixParts.push('Sanguinária: Sangrando');
                            }

                            setPendingSpecialDamageBonus(null);

                            const batchId = `sg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                            const labelSuffix =
                              suffixParts.length > 0 ? ` [${suffixParts.join(' • ')}]` : '';
                            onRoll(
                              `Acerto: ${atk.name}${labelSuffix}`,
                              finalAttackDice,
                              20,
                              finalAttackBonus,
                              false,
                              {
                                weaponName: atk.name,
                                critThreatMin: critParsed.threatMin,
                                critMultiplier: critParsed.multiplier,
                                normalDiceCount: baseDamageDiceCount + extraDiceFromGolpe,
                                critDiceCount: critBaseDamageDiceCount + extraDiceFromGolpe,
                                dieSides: effectiveDamageSides,
                                damageModifier: finalDamageMod + extraDmgFromFurtivo,
                                maximizeCritDamage: isAtirarParaMatarActive,
                                damageLabelSuffix:
                                  dmgSuffixParts.length > 0
                                    ? ` [${dmgSuffixParts.join(' • ')}]`
                                    : undefined,
                                ...(() => {
                                  const rExtras = rollRitualWeaponDamageExtras(
                                    isMelee,
                                    ordemSheetData?.sceneEffects || []
                                  );
                                  if (rExtras.totalBonus <= 0) return {};
                                  const mergedSuffix = [...dmgSuffixParts, ...rExtras.labels];
                                  return {
                                    damageModifier:
                                      finalDamageMod + extraDmgFromFurtivo + rExtras.totalBonus,
                                    damageLabelSuffix: ` [${mergedSuffix.join(' • ')}]`,
                                  };
                                })(),
                                forcaOpressoraPayload: foPayload,
                                segurarGatilhoPayload: buildSegurarGatilhoPayload(batchId),
                                explodingDieSide,
                                extraDiceNormal:
                                  extraDiceNormal.length > 0 ? extraDiceNormal : undefined,
                                extraDiceCrit:
                                  extraDiceCrit.length > 0 ? extraDiceCrit : undefined,
                                sanguinariaCritTempHp: weaponMods.sanguinariaCritTempHp || undefined,
                                ritualisticaStoredName: weaponMods.ritualisticaStored,
                              },
                              undefined,
                              attackCursePrompt
                                ? { cursePricePrompt: attackCursePrompt }
                                : undefined
                            );
                          }}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                          title="Rolar Teste de Acerto"
                        >
                          <Icon name="target" />{' '}
                          {finalAttackDice <= 0
                            ? '2d20(menor)'
                            : `${finalAttackDice}d20`}
                          {finalAttackBonus >= 0 ? `+${finalAttackBonus}` : finalAttackBonus}
                          {weaponActiveCursePeCost > 0 && ` (-${weaponActiveCursePeCost} PE)`}
                        </button>

                        {hasAtaqueEspecial && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isAeOpen) {
                                setActiveAeAttackId(null);
                              } else {
                                const valid = clampAeConfig(
                                  aeAtkInvest,
                                  aeDmgInvest,
                                  maxAeTotalBonus
                                );
                                setAeAtkInvest(valid.atk);
                                setAeDmgInvest(valid.dmg);
                                setActiveAeAttackId(atk.id);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded text-xs font-bold border transition cursor-pointer ${
                              isAeOpen
                                ? 'bg-red-600 text-white border-red-400 shadow'
                                : 'bg-red-950/60 hover:bg-red-700 text-red-300 hover:text-white border-red-800/70'
                            }`}
                            title="Abrir controles de Ataque Especial para este ataque"
                          >
                            <Icon name="zap" /> Ataque Especial
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRollDamage(false)}
                          className="px-2.5 py-1.5 bg-zinc-900 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                          title="Rolar Dano Normal"
                        >
                          <Icon name="sangue" /> {displayedDmgDice}d{effectiveDamageSides}
                          {displayedDmgMod !== 0
                            ? displayedDmgMod > 0
                              ? `+${displayedDmgMod}`
                              : displayedDmgMod
                            : ''}
                          {extraDiceNormalText}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRollDamage(true)}
                          className="px-2 py-1.5 bg-amber-950/70 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-700/70 rounded text-xs font-mono font-bold transition cursor-pointer"
                          title={`Rolar Dano Crítico (${effectiveCritRange})`}
                        >
                          <Icon name="burst" /> {displayedCritDmgDice}d{effectiveDamageSides}
                          {displayedDmgMod !== 0
                            ? displayedDmgMod > 0
                              ? `+${displayedDmgMod}`
                              : displayedDmgMod
                            : ''}
                          {extraDiceCritText}
                        </button>

                        {allowInv && (
                          <button
                            type="button"
                            onClick={() => onUpdateAttacks(attacks.filter((a) => a.id !== atk.id))}
                            className="text-xs text-zinc-600 hover:text-red-400 px-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra Contextual de Modificações, Munições e Maldições da Arma */}
                    {isOrdemSystem &&
                      (isArcabuz ||
                        (isFirearm && weaponMods.isAutomatic) ||
                        (isFirearm && (hasDumDumAmmo || hasExplosivaAmmo || hasMunicaoJurada)) ||
                        weaponMods.hasEnergetica ||
                        weaponMods.antielementoChosen ||
                        weaponMods.hasEmpuxo ||
                        weaponMods.hasVibrante ||
                        weaponMods.hasSenciente ||
                        weaponMods.hasRepulsora ||
                        weaponMods.hasErosiva ||
                        weaponMods.hasConsumidora) && (
                        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2 text-[11px]">
                          {isArcabuz && (
                            <button
                              type="button"
                              onClick={() => {
                                const d6 = Math.floor(Math.random() * 6) + 1;
                                const dieMap: Record<number, number> = {
                                  1: 4,
                                  2: 6,
                                  3: 8,
                                  4: 10,
                                  5: 12,
                                  6: 20,
                                };
                                const nextSides = dieMap[d6];
                                setArcabuzDieByAttackId((prev) => ({
                                  ...prev,
                                  [atk.id]: nextSides,
                                }));
                                setCombatTabFeedback(
                                  `Arcabuz dos Moretti rolou ${d6} no 1d6 → dano definido como 2d${nextSides} de Energia!`
                                );
                              }}
                              className="px-2 py-0.5 bg-purple-950/80 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded font-bold cursor-pointer"
                            >
                              <Icon name="d20" /> Arcabuz 1d6 (Atual: 2d{arcabuzSides})
                            </button>
                          )}

                          {isFirearm && weaponMods.isAutomatic && (
                            <label className="flex items-center gap-1 text-amber-300 font-bold cursor-pointer bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded">
                              <input
                                type="checkbox"
                                checked={isRajadaActive}
                                onChange={(e) =>
                                  setRajadaByAttackId((prev) => ({
                                    ...prev,
                                    [atk.id]: e.target.checked,
                                  }))
                                }
                              />
                              <Icon name="crosshair" /> Rajada (+1 dado{weaponMods.hasCompensador ? ', Compensador' : ', -1d20'})
                            </label>
                          )}

                          {isFirearm && (hasDumDumAmmo || hasExplosivaAmmo || hasMunicaoJurada) && (
                            <select
                              value={activeAmmoMod}
                              onChange={(e) =>
                                setAmmoModByAttackId((prev) => ({
                                  ...prev,
                                  [atk.id]: e.target.value as 'none' | 'dumdum' | 'explosiva' | 'jurada',
                                }))
                              }
                              className="bg-zinc-900 border border-amber-700/60 rounded px-2 py-0.5 text-[10px] font-bold text-amber-200"
                            >
                              <option value="none">Munição: Padrão</option>
                              {hasDumDumAmmo && <option value="dumdum">Dum-Dum (+1x Crít)</option>}
                              {hasExplosivaAmmo && <option value="explosiva">Explosiva (+2d6 Dano)</option>}
                              {hasMunicaoJurada && (
                                <option value="jurada">Munição Jurada (+10 Atq, 2x Crít, +6d12)</option>
                              )}
                            </select>
                          )}

                          {weaponMods.hasEnergetica && (
                            <label className="flex items-center gap-1 text-purple-200 font-bold cursor-pointer bg-purple-950/60 border border-purple-700/70 px-2 py-0.5 rounded">
                              <input
                                type="checkbox"
                                checked={isEnergeticaActive}
                                onChange={(e) =>
                                  setEnergeticaByAttackId((prev) => ({
                                    ...prev,
                                    [atk.id]: e.target.checked,
                                  }))
                                }
                              />
                              <Icon name="zap" /> Energética (-2 PE: +5 Atq, Energia, Ignora RD)
                            </label>
                          )}

                          {weaponMods.antielementoChosen && (
                            <label className="flex items-center gap-1 text-purple-200 font-bold cursor-pointer bg-purple-950/60 border border-purple-700/70 px-2 py-0.5 rounded">
                              <input
                                type="checkbox"
                                checked={isAntielementoActive}
                                onChange={(e) =>
                                  setAntielementoByAttackId((prev) => ({
                                    ...prev,
                                    [atk.id]: e.target.checked,
                                  }))
                                }
                              />
                              Antielemento {weaponMods.antielementoChosen} (-2 PE: +4d8)
                            </label>
                          )}

                          {weaponMods.hasEmpuxo && (
                            <label className="flex items-center gap-1 text-cyan-200 font-bold cursor-pointer bg-cyan-950/50 border border-cyan-700/70 px-2 py-0.5 rounded">
                              <input
                                type="checkbox"
                                checked={isEmpuxoThrown}
                                onChange={(e) =>
                                  setEmpuxoByAttackId((prev) => ({
                                    ...prev,
                                    [atk.id]: e.target.checked,
                                  }))
                                }
                              />
                              Arremesso Empuxo (+1 dado, retorna)
                            </label>
                          )}

                          {weaponMods.hasVibrante && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!onSpendResource(2)) return;
                                setCombatTabFeedback(
                                  `Vibrante (${atk.name}): -2 PE gastos — você pode realizar 1 ataque adicional nesta ação Agredir!`
                                );
                              }}
                              className="px-2 py-0.5 bg-purple-950/70 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded font-bold cursor-pointer"
                            >
                              <Icon name="zap" /> Vibrante: Ataque Extra (-2 PE)
                            </button>
                          )}

                          {weaponMods.hasSenciente && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!onSpendResource(2)) return;
                                setCombatTabFeedback(
                                  `Senciente (${atk.name}): -2 PE gastos — a arma flutua e ataca sozinha (1 PE/rodada para manter)!`
                                );
                              }}
                              className="px-2 py-0.5 bg-purple-950/70 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded font-bold cursor-pointer"
                            >
                              <Icon name="brain" /> Senciente: Ativar (-2 PE)
                            </button>
                          )}

                          {weaponMods.hasRepulsora && (
                            <button
                              type="button"
                              onClick={() => {
                                const eff: SceneEffect = {
                                  id: `repulsora-${atk.id}-${Date.now()}`,
                                  name: `Repulsora (${atk.name})`,
                                  description: '+5 Defesa no bloqueio (dura até próximo turno).',
                                  modifiers: [
                                    {
                                      id: `rep-def-${atk.id}`,
                                      targetType: 'defense',
                                      targetKey: 'defense',
                                      value: 5,
                                    },
                                  ],
                                };
                                if (!onSpendResource(2, eff)) return;
                                setCombatTabFeedback(
                                  `Repulsora (${atk.name}): -2 PE gastos → +5 na Defesa aplicado na cena!`
                                );
                              }}
                              className="px-2 py-0.5 bg-cyan-950/70 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 rounded font-bold cursor-pointer"
                            >
                              <Icon name="shield" /> Repulsora: +5 Def (-2 PE)
                            </button>
                          )}

                          {weaponMods.hasErosiva && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!onSpendResource(2)) return;
                                onRoll(
                                  `Erosiva (${atk.name}): +2d4 Morte (1d4 rodadas)`,
                                  2,
                                  4,
                                  0,
                                  true
                                );
                              }}
                              className="px-2 py-0.5 bg-zinc-900 hover:bg-purple-900 text-purple-200 border border-purple-700/70 rounded font-bold cursor-pointer"
                            >
                              <Icon name="hourglass" /> Erosiva: +2d4 Morte (-2 PE)
                            </button>
                          )}

                          {weaponMods.hasConsumidora && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!onSpendResource(2)) return;
                                setCombatTabFeedback(
                                  `Consumidora (${atk.name}): -2 PE gastos — alvo atingido fica IMÓVEL por 1 rodada!`
                                );
                              }}
                              className="px-2 py-0.5 bg-zinc-900 hover:bg-purple-900 text-purple-200 border border-purple-700/70 rounded font-bold cursor-pointer"
                            >
                              <Icon name="heart-crack" /> Consumidora: Imóvel (-2 PE)
                            </button>
                          )}
                        </div>
                      )}

                    {/* Interface Contextual Dinâmica de Ataque Especial */}
                    {isAeOpen && (
                      <div className="bg-zinc-900/95 border border-red-700/60 rounded-xl p-3 flex flex-col gap-2.5 shadow-inner">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-red-400">
                              <Icon name="zap" /> Ataque Especial
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              (Máx. +{maxAeTotalBonus} • Distribuído: +{aeTotalInvested})
                            </span>
                            {aeMult > 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                                <Icon name="burst" /> Potência Máxima 2x
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono font-extrabold text-amber-300 bg-zinc-950 border border-amber-700/50 px-2 py-0.5 rounded">
                            <Icon name="zap" /> Custo: {totalAeConfirmPe} PE
                            {tecnicaSecretaCost > 0
                              ? ` (${aePeCostCalculated} AE + ${tecnicaSecretaCost} Téc.)`
                              : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-amber-300"><Icon name="target" /> Acerto</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={aeAtkInvest <= 0}
                                onClick={() =>
                                  updateAeInvestment(Math.max(0, aeAtkInvest - 5), aeDmgInvest)
                                }
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed text-zinc-200 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                -5
                              </button>
                              <span className="text-xs font-mono font-extrabold text-white min-w-[3.5rem] text-center">
                                +{aeAtkInvest}
                                {aeMult > 1 && aeAtkInvest > 0 ? ` (${appliedAeAtk})` : ''}
                              </span>
                              <button
                                type="button"
                                disabled={aeTotalInvested + 5 > maxAeTotalBonus}
                                onClick={() => updateAeInvestment(aeAtkInvest + 5, aeDmgInvest)}
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-amber-700 disabled:opacity-35 disabled:cursor-not-allowed text-amber-300 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </div>

                          <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-red-300"><Icon name="sangue" /> Dano</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={aeDmgInvest <= 0}
                                onClick={() =>
                                  updateAeInvestment(aeAtkInvest, Math.max(0, aeDmgInvest - 5))
                                }
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 disabled:cursor-not-allowed text-zinc-200 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                -5
                              </button>
                              <span className="text-xs font-mono font-extrabold text-white min-w-[3.5rem] text-center">
                                +{aeDmgInvest}
                                {aeMult > 1 && aeDmgInvest > 0 ? ` (${appliedAeDmg})` : ''}
                              </span>
                              <button
                                type="button"
                                disabled={aeTotalInvested + 5 > maxAeTotalBonus}
                                onClick={() => updateAeInvestment(aeAtkInvest, aeDmgInvest + 5)}
                                className="px-2 py-0.5 bg-zinc-900 hover:bg-red-700 disabled:opacity-35 disabled:cursor-not-allowed text-red-300 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-zinc-400">
                            {aeTotalInvested <= 0
                              ? 'Escolha ao menos +5 em Acerto ou Dano.'
                              : `Resultado: ${finalAttackDice <= 0 ? '2d20(menor)' : `${finalAttackDice}d20`}${
                                  finalAttackBonus + appliedAeAtk >= 0
                                    ? `+${finalAttackBonus + appliedAeAtk}`
                                    : finalAttackBonus + appliedAeAtk
                                } no acerto${appliedAeDmg > 0 ? ` e +${appliedAeDmg} no dano` : ''}`}
                          </span>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => setActiveAeAttackId(null)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={aeTotalInvested <= 0}
                              onClick={() => {
                                if (aeTotalInvested <= 0) return;

                                let extraDiceFromGolpe = 0;
                                let extraDmgFromFurtivo = 0;
                                let furtivoPe = 0;
                                if (armedAtaqueFurtivo) furtivoPe += 1;
                                if (armedAssassinar) furtivoPe += 3;
                                const golpeDemolidorCost = armedGolpeDemolidor ? 1 : 0;
                                const totalAeConfirmPeWithExtras =
                                  totalAeConfirmPe + furtivoPe + golpeDemolidorCost;

                                if (isOrdemSystem && totalAeConfirmPeWithExtras > peTurnLimit) {
                                  setCombatTabFeedback(
                                    `Custo total (${totalAeConfirmPeWithExtras} PE) excede seu limite de ${peTurnLimit} PE/turno!`
                                  );
                                  return;
                                }

                                if (!onSpendResource(totalAeConfirmPeWithExtras)) return;
                                updateAeInvestment(aeAtkInvest, aeDmgInvest);

                                const aeBonusDesc = [
                                  appliedAeAtk > 0 ? `+${appliedAeAtk} Atq` : '',
                                  appliedAeDmg > 0 ? `+${appliedAeDmg} Dano` : '',
                                ]
                                  .filter(Boolean)
                                  .join(' / ');
                                const suffixParts: string[] = [
                                  `Ataque Especial${aeMult > 1 ? ' [Potência Máxima 2x]' : ''} (${aeBonusDesc})`,
                                ];
                                if (isAimingFuzil) {
                                  suffixParts.push('Mirando (+5 Crít)');
                                }
                                if (!weaponProfCheck.proficient) {
                                  suffixParts.push('Sem Proficiência -2d20');
                                }
                                if (isDisparoLetalArmed) {
                                  suffixParts.push('Disparo Letal (+2 Crít)');
                                }
                                const dmgSuffixParts: string[] = [];

                                if (appliedAeDmg > 0) {
                                  dmgSuffixParts.push(
                                    `Ataque Especial${aeMult > 1 ? ' 2x' : ''} +${appliedAeDmg} Dano`
                                  );
                                }

                                if (armedGolpeDemolidor) {
                                  extraDiceFromGolpe = 2;
                                  dmgSuffixParts.push('Golpe Demolidor +2 dados');
                                  suffixParts.push('Golpe Demolidor +2 dados');
                                  setArmedGolpeDemolidor(false);
                                }

                                if (armedAtaqueFurtivo || armedAssassinar) {
                                  const furtivoBase =
                                    ordemNex >= 99 ? 4 : ordemNex >= 65 ? 3 : ordemNex >= 40 ? 2 : 1;
                                  const furtivoDiceCount = armedAssassinar ? furtivoBase * 2 : furtivoBase;
                                  let furtivoSum = 0;
                                  for (let i = 0; i < furtivoDiceCount; i++) {
                                    furtivoSum += Math.floor(Math.random() * 6) + 1;
                                  }
                                  extraDmgFromFurtivo = furtivoSum;
                                  const assassinarSuffix = armedAssassinar
                                    ? ` • Assassinar (Fortitude DT ${10 + peTurnLimit + effAgi})`
                                    : '';
                                  dmgSuffixParts.push(
                                    `Ataque Furtivo +${furtivoDiceCount}d6: +${furtivoSum}${assassinarSuffix}`
                                  );
                                  suffixParts.push(
                                    `Ataque Furtivo +${furtivoDiceCount}d6 (+${furtivoSum})`
                                  );
                                  setArmedAtaqueFurtivo(false);
                                  setArmedAssassinar(false);
                                }

                                if (appliedAeDmg > 0 || extraDmgFromFurtivo > 0) {
                                  setPendingSpecialDamageBonus({
                                    attackId: atk.id,
                                    dmgBonus: appliedAeDmg + extraDmgFromFurtivo,
                                  });
                                } else {
                                  setPendingSpecialDamageBonus(null);
                                }

                                const tsLabel = buildTecnicaSecretaLabels(dmgSuffixParts);
                                if (tsLabel) suffixParts.push(tsLabel);
                                if (isRajadaActive) suffixParts.push('Rajada (+1 dado)');
                                if (isEmpuxoThrown) suffixParts.push('Empuxo (+1 dado)');
                                if (isEnergeticaActive) {
                                  suffixParts.push('Energética (+5 Atq)');
                                  dmgSuffixParts.push('Energética: Energia / Ignora RD');
                                }
                                if (isAntielementoActive && weaponMods.antielementoChosen) {
                                  suffixParts.push(`Antielemento ${weaponMods.antielementoChosen}`);
                                  dmgSuffixParts.push(`Antielemento (${weaponMods.antielementoChosen})`);
                                }
                                if (isMotosserra) dmgSuffixParts.push('Motosserra: 6 explode');
                                if (weaponMods.sanguinariaCritTempHp) {
                                  dmgSuffixParts.push('Sanguinária: Sangrando');
                                }

                                const batchId = `sg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                                const labelSuffix = ` [${suffixParts.join(' • ')}]`;
                                setActiveAeAttackId(null);
                                onRoll(
                                  `Acerto: ${atk.name}${labelSuffix}`,
                                  finalAttackDice,
                                  20,
                                  finalAttackBonus + appliedAeAtk,
                                  false,
                                  {
                                    weaponName: atk.name,
                                    critThreatMin: critParsed.threatMin,
                                    critMultiplier: critParsed.multiplier,
                                    normalDiceCount: baseDamageDiceCount + extraDiceFromGolpe,
                                    critDiceCount: critBaseDamageDiceCount + extraDiceFromGolpe,
                                    dieSides: effectiveDamageSides,
                                    damageModifier: finalDamageMod + appliedAeDmg + extraDmgFromFurtivo,
                                    maximizeCritDamage: isAtirarParaMatarActive,
                                    damageLabelSuffix:
                                      dmgSuffixParts.length > 0
                                        ? ` [${dmgSuffixParts.join(' • ')}]`
                                        : undefined,
                                    ...(() => {
                                      const rExtras = rollRitualWeaponDamageExtras(
                                        isMelee,
                                        ordemSheetData?.sceneEffects || []
                                      );
                                      if (rExtras.totalBonus <= 0) return {};
                                      const mergedSuffix = [...dmgSuffixParts, ...rExtras.labels];
                                      return {
                                        damageModifier:
                                          finalDamageMod +
                                          appliedAeDmg +
                                          extraDmgFromFurtivo +
                                          rExtras.totalBonus,
                                        damageLabelSuffix: ` [${mergedSuffix.join(' • ')}]`,
                                      };
                                    })(),
                                    forcaOpressoraPayload: foPayload,
                                    segurarGatilhoPayload: buildSegurarGatilhoPayload(batchId),
                                    explodingDieSide,
                                    extraDiceNormal:
                                      extraDiceNormal.length > 0 ? extraDiceNormal : undefined,
                                    extraDiceCrit:
                                      extraDiceCrit.length > 0 ? extraDiceCrit : undefined,
                                    sanguinariaCritTempHp: weaponMods.sanguinariaCritTempHp || undefined,
                                    ritualisticaStoredName: weaponMods.ritualisticaStored,
                                  },
                                  undefined,
                                  attackCursePrompt
                                    ? { cursePricePrompt: attackCursePrompt }
                                    : undefined
                                );
                              }}
                              className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-lg text-xs font-extrabold cursor-pointer shadow"
                            >
                              <Icon name="zap" /> Confirmar Ataque (-{totalAeConfirmPe} PE)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Barra Aniquilador: Técnica Secreta (40%+) e Técnica Sublime (65%+) */}
                    {isAniqFav && hasTecnicaSecreta && (
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-red-400">
                          <Icon name="sword" /> Técnica Secreta (-2 PE/efeito):
                        </span>
                        <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={secDestruidor}
                            onChange={(e) => setSecDestruidor(e.target.checked)}
                          />
                          Destruidor (+1x Crít)
                        </label>
                        <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={secAmplo}
                            onChange={(e) => setSecAmplo(e.target.checked)}
                          />
                          Amplo (Alvo adj.)
                        </label>
                        {hasTecnicaSublime && (
                          <>
                            <select
                              value={secLetal}
                              onChange={(e) => setSecLetal(Number(e.target.value) as 0 | 1 | 2)}
                              className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-amber-300 font-bold"
                            >
                              <option value={0}>Letal: Não</option>
                              <option value={1}>Letal 1x (+2 Margem, -2 PE)</option>
                              <option value={2}>Letal 2x (+5 Margem, -4 PE)</option>
                            </select>
                            <label className="flex items-center gap-1 text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={secPerfurante}
                                onChange={(e) => setSecPerfurante(e.target.checked)}
                              />
                              Perfurante (Ignora 5 RD)
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2 (PODERES) E ABA 3 (RITUAIS / MAGIAS) */}
      {(activeSubTab === 'powers' || activeSubTab === 'spells') && (
        <div className="flex flex-col gap-3">
          {abilityUseFeedback && (
            <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>{abilityUseFeedback}</span>
              <button
                type="button"
                onClick={() => setAbilityUseFeedback('')}
                className="text-emerald-400 hover:text-white ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {activeSubTab === 'spells' && system === 'ordem-paranormal' && (() => {
            const effPreBar = Number(ordemSheetData?.attributes?.pre ?? 1) + (bonuses?.attributes?.['pre'] || 0);
            const sceneEffectsBar = ordemSheetData?.sceneEffects || [];
            const ritualDtBar = ordemSheetData
              ? getOrdemRitualDT(
                  ordemSheetData.nex,
                  effPreBar,
                  ordemSheetData.trail,
                  abilities,
                  ordemSheetData.origin,
                  undefined,
                  sceneEffectsBar
                )
              : 10;
            const peRitualLimitBar = ordemSheetData
              ? getOrdemRitualPeLimit(ordemSheetData.nex, ordemSheetData.origin, abilities, effPreBar, ordemSheetData.trail)
              : 1;
            const peBaseLimitBar = ordemSheetData
              ? getOrdemPeLimit(ordemSheetData.nex, ordemSheetData.origin, abilities)
              : 1;
            const hasFluxoPoderBar = abilities.some(
              (a) => a.isActive !== false && (a.id === 'ord-pwr-ocu-fluxo-poder' || a.name.toLowerCase().includes('fluxo de poder'))
            );
            const maxSustainedBar = hasFluxoPoderBar ? 2 : 1;
            const activeSustainedRituals = spellList.filter((s) => Boolean(s.isSustainedActive));
            const recurringEffects = sceneEffectsBar.filter((ef) =>
              Boolean(ef.isSustainedRitual || ef.recurringFormula || ef.usesOcultismoManeuver)
            );
            const orphanSustained = activeSustainedRituals.filter(
              (s) =>
                !recurringEffects.some(
                  (ef) =>
                    ef.ritualId === s.id ||
                    ef.name.trim().toLowerCase() === s.name.trim().toLowerCase()
                )
            );
            const hasCamuflarPower = abilities.some((a) => a.isActive !== false && (a.id === 'ord-pwr-ocu-camuflar-ocultismo' || a.name.toLowerCase().includes('camuflar ocultismo')));
            const hasAmpliarPower = abilities.some((a) => a.isActive !== false && (a.id === 'trail-conduite-10' || a.name.toLowerCase().includes('ampliar ritual')));
            const hasAcelerarPower = abilities.some((a) => a.isActive !== false && (a.id === 'trail-conduite-40' || a.name.toLowerCase().includes('acelerar ritual')));
            const hasFlageloPower = abilities.some((a) => a.isActive !== false && (a.id === 'trail-flagelador-10' || a.name.toLowerCase().includes('poder do flagelo')));
            const hasLaminaMalditaPower = abilities.some((a) => a.isActive !== false && (a.id === 'trail-lamina_paranormal-10' || a.name.toLowerCase().includes('lâmina maldita')));

            const rollOcultismoManeuver = (ritualTitle: string) => {
              if (!ordemSheetData) return;
              const ocultSk = ordemSheetData.skills.find((s) => s.id === 'ocultismo');
              const ocultBonus =
                (ocultSk?.trainingDegree || 0) +
                (ocultSk?.otherModifier || 0) +
                bonuses.skillBonusAll +
                (bonuses.skillBonus['ocultismo'] || 0);
              const ocultDice =
                effInt + bonuses.skillDiceAll + (bonuses.skillDice['ocultismo'] || 0);
              onRoll(`Manobra c/ Ocultismo (${ritualTitle})`, ocultDice, 20, ocultBonus);
            };

            const endActiveRitualEffect = (effectId?: string, ritualId?: string, ritualName?: string) => {
              if (onUpdateSceneEffects && effectId) {
                onUpdateSceneEffects(sceneEffectsBar.filter((e) => e.id !== effectId));
              }
              const lowerTarget = (ritualName || '').trim().toLowerCase();
              if (
                abilities.some(
                  (a) =>
                    a.isSustainedActive &&
                    ((ritualId && a.id === ritualId) ||
                      (lowerTarget && a.name.trim().toLowerCase() === lowerTarget))
                )
              ) {
                onUpdateAbilities(
                  abilities.map((a) =>
                    (ritualId && a.id === ritualId) ||
                    (lowerTarget && a.name.trim().toLowerCase() === lowerTarget)
                      ? { ...a, isSustainedActive: false }
                      : a
                  )
                );
              }
            };

            return (
              <div className="space-y-2.5">
              <div className="bg-purple-950/30 border border-purple-800/50 px-3.5 py-2.5 rounded-xl text-[11px] text-purple-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <Icon name="conhecimento" /> <strong>O Custo do Paranormal:</strong> Conjurar desconta PE, aplica efeitos na cena e rola <strong>Ocultismo (DT 20 + PE gasto)</strong> (exceto Medo).
                  </span>
                  {ordemSheetData && (
                    <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-purple-300">
                      <span className="px-2 py-0.5 rounded bg-purple-900/50 border border-purple-700/60">
                        DT Base: {ritualDtBar}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-900/50 border border-purple-700/60">
                        Limite PE/Ritual: {peRitualLimitBar > peBaseLimitBar ? `${peBaseLimitBar}/${peRitualLimitBar}` : peRitualLimitBar} PE
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${activeSustainedRituals.length > maxSustainedBar ? 'bg-red-900/50 border-red-600 text-red-200' : 'bg-zinc-900/70 border-zinc-700 text-zinc-200'}`}>
                        Sustentados: {activeSustainedRituals.length}/{maxSustainedBar}
                      </span>
                      {activeSustainedRituals.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const cost = activeSustainedRituals.length;
                            if (onSpendResource(cost)) {
                              setAbilityUseFeedback(`Sustentação paga (-${cost} PE) para ${activeSustainedRituals.map((s) => s.name).join(', ')}.`);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-sans text-[10px] font-bold cursor-pointer"
                        >
                          Pagar Sustentação (-{activeSustainedRituals.length} PE)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {(hasCamuflarPower || hasAmpliarPower || hasAcelerarPower || hasFlageloPower || hasLaminaMalditaPower) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-purple-900/60">
                    <span className="text-[10px] font-bold uppercase text-purple-400 mr-1">Modificadores de Conjuração:</span>
                    {hasCamuflarPower && (
                      <button
                        type="button"
                        onClick={() => setRitualCamuflar((v) => !v)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          ritualCamuflar
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-purple-500'
                        }`}
                      >
                        <Icon name="drama" /> Camuflar Ocultismo (+2 PE)
                      </button>
                    )}
                    {hasAmpliarPower && (
                      <button
                        type="button"
                        onClick={() => setRitualAmpliar((v) => !v)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          ritualAmpliar
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-purple-500'
                        }`}
                      >
                        Ampliar Ritual (+2 PE)
                      </button>
                    )}
                    {hasAcelerarPower && (
                      <button
                        type="button"
                        onClick={() => setRitualAcelerar((v) => !v)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          ritualAcelerar
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-purple-500'
                        }`}
                      >
                        <Icon name="zap" /> Acelerar Ritual (+4 PE)
                      </button>
                    )}
                    {hasFlageloPower && (
                      <button
                        type="button"
                        onClick={() => setRitualPoderFlagelo((v) => !v)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          ritualPoderFlagelo
                            ? 'bg-red-700 text-white border-red-400'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-red-500'
                        }`}
                      >
                        <Icon name="sangue" /> Poder do Flagelo (2 PV / 1 PE)
                      </button>
                    )}
                    {hasLaminaMalditaPower && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900/70 border border-zinc-700 text-amber-300">
                        <Icon name="sword" /> Lâmina Maldita: Amaldiçoar Arma custa -1 PE (mín. 1) na ficha
                      </span>
                    )}
                  </div>
                )}
              </div>

              {(recurringEffects.length > 0 || orphanSustained.length > 0) && (
                <div className="bg-indigo-950/35 border border-indigo-600/60 px-3.5 py-2.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                      <Icon name="refresh" /> Rituais Sustentados & Efeitos por Rodada Ativos
                    </span>
                    <span className="text-[10px] text-indigo-200/80">
                      Role os dados por turno sem gastar PE de conjuração
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {recurringEffects.map((ef) => (
                      <div
                        key={ef.id}
                        className="bg-zinc-950/80 border border-indigo-800/60 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white">{ef.name}</span>
                            {ef.source && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                                {ef.source}
                              </span>
                            )}
                            {ef.isSustainedRitual && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-700/60">
                                Sustentado (1 PE/turno)
                              </span>
                            )}
                          </div>
                          {ef.description && (
                            <p className="text-[11px] text-zinc-400 mt-0.5">{ef.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {ef.recurringFormula && (
                            <button
                              type="button"
                              onClick={() => {
                                const parsed = parseDiceFormula(ef.recurringFormula!);
                                onRoll(
                                  `${ef.recurringLabel || ef.name} (${ef.source || 'Turno'}) [0 PE]`,
                                  parsed.count,
                                  parsed.sides,
                                  parsed.modifier,
                                  true
                                );
                              }}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 rounded-lg text-[11px] font-extrabold transition cursor-pointer"
                            >
                              <Icon name="d20" /> Rolar Efeito da Rodada ({ef.recurringFormula}) [0 PE]
                            </button>
                          )}
                          {ef.usesOcultismoManeuver && (
                            <button
                              type="button"
                              onClick={() => rollOcultismoManeuver(ef.name)}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white border border-purple-400 rounded-lg text-[11px] font-bold transition cursor-pointer"
                            >
                              Manobra c/ Ocultismo
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => endActiveRitualEffect(ef.id, ef.ritualId, ef.name)}
                            className="px-2 py-1 bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            ✕ Encerrar
                          </button>
                        </div>
                      </div>
                    ))}
                    {orphanSustained.map((sab) => (
                      <div
                        key={sab.id}
                        className="bg-zinc-950/80 border border-indigo-800/60 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{sab.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-700/60">
                            Sustentado (1 PE/turno)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => endActiveRitualEffect(undefined, sab.id, sab.name)}
                          className="px-2 py-1 bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-700 hover:border-red-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          ✕ Encerrar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            );
          })()}

          {(() => {
            const listToRender = activeSubTab === 'powers' ? powerList : spellList;
            if (listToRender.length === 0) {
              return (
                <p className="text-xs text-zinc-500 text-center py-4">
                  Nenhum {activeSubTab === 'powers' ? 'poder' : spellLabel.toLowerCase()} adicionado na ficha.
                </p>
              );
            }

            const effPreRit =
              isOrdemSystem && ordemSheetData
                ? Number(ordemSheetData.attributes?.pre ?? 1) + (bonuses?.attributes?.['pre'] || 0)
                : 0;

            const prog =
              system === 'ordem-paranormal' && ordemSheetData
                ? {
                    maxCircle:
                      ordemSheetData.nex >= 85
                        ? 4
                        : ordemSheetData.nex >= 55
                        ? 3
                        : ordemSheetData.nex >= 25
                        ? 2
                        : 1,
                    peTurnLimit: getOrdemRitualPeLimit(
                      ordemSheetData.nex,
                      ordemSheetData.origin,
                      abilities,
                      effPreRit,
                      ordemSheetData.trail
                    ),
                  }
                : { maxCircle: 4, peTurnLimit: 20 };

            const hasPrediletoPower = abilities.some(
              (a) =>
                a.isActive !== false &&
                (a.id === 'ord-pwr-ocu-ritual-predileto' ||
                  a.name.toLowerCase().includes('ritual predileto'))
            );
            const isGraduadoGrimoireAvailable = Boolean(
              abilities.some(
                (a) =>
                  a.id === 'trail-graduado-40' ||
                  a.name.toLowerCase().includes('grimório ritualístico') ||
                  (ordemSheetData?.trail === 'graduado' && (ordemSheetData?.nex ?? 0) >= 40)
              )
            );
            const hasRitualPotentePower = abilities.some(
              (a) =>
                a.isActive !== false &&
                (a.id === 'ord-pwr-ocu-ritual-potente' ||
                  a.name.toLowerCase().includes('ritual potente'))
            );
            const hasLaminaMalditaSpell = abilities.some(
              (a) =>
                a.isActive !== false &&
                (a.id === 'trail-lamina_paranormal-10' ||
                  a.name.toLowerCase().includes('lâmina maldita'))
            );

            return (
              <div className="flex flex-col gap-2.5">
                {listToRender.map((ab) => {
                  const isPassive = ab.cost === 0 && !ab.damageFormula;
                  const isOrdemRitual =
                    activeSubTab === 'spells' &&
                    system === 'ordem-paranormal' &&
                    (ab.category === 'ritual' || ab.category === 'magia');

                  const ritualDef = isOrdemRitual
                    ? findOrdemRitualDef(ab.id) || findOrdemRitualDef(ab.name)
                    : undefined;
                  const ritualElLabel = ab.element || ritualDef?.element || '';
                  const ritualElLower = ritualElLabel.toLowerCase();
                  const ritualDtValue =
                    isOrdemRitual && ordemSheetData
                      ? getOrdemRitualDT(
                          ordemSheetData.nex,
                          effPreRit,
                          ordemSheetData.trail,
                          abilities,
                          ordemSheetData.origin,
                          ritualElLabel,
                          ordemSheetData.sceneEffects
                        )
                      : null;
                  const isSustainedRitual = Boolean(
                    isOrdemRitual &&
                      (ritualDef?.duration || ab.description || '').toLowerCase().includes('sustentad')
                  );
                  const isAmaldicoarArmaSpell = Boolean(
                    isOrdemRitual && ab.name.toLowerCase().includes('amaldiçoar arma')
                  );
                  const laminaMovActive = Boolean(
                    isAmaldicoarArmaSpell && hasLaminaMalditaSpell && ritualLaminaMovimentoMap[ab.id]
                  );
                  const extraMetamagicPe =
                    (isOrdemRitual && ritualCamuflar ? 2 : 0) +
                    (isOrdemRitual && ritualAmpliar ? 2 : 0) +
                    (isOrdemRitual && ritualAcelerar ? 4 : 0) +
                    (laminaMovActive ? 1 : 0);
                  const computedRitualForms = isOrdemRitual
                    ? parseOrdemRitualForms(ab.name, ab.description, ab.cost || 1, ab.damageFormula, {
                        ritualId: ab.id,
                        element: ritualElLabel,
                        isFavoriteRitual: ab.isFavoriteRitual,
                        abilities,
                        extraPeCost: extraMetamagicPe,
                        sceneEffects: ordemSheetData?.sceneEffects,
                      })
                    : [];

                return (
                  <div
                    key={ab.id}
                    className={`bg-zinc-950 border p-3.5 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center gap-3 ${
                      ab.isSustainedActive ? 'border-indigo-500/70 bg-indigo-950/15' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{ab.name}</h4>
                        {isOrdemRitual && ritualElLabel && (
                          <span className="text-[10px] font-mono font-bold bg-purple-950/70 text-purple-200 border border-purple-700/70 px-2 py-0.5 rounded">
                            {ritualElLabel}
                          </span>
                        )}
                        {ritualDtValue !== null && (
                          <span className="text-[10px] font-mono font-bold bg-indigo-950/70 text-indigo-200 border border-indigo-700/60 px-2 py-0.5 rounded">
                            DT {ritualDtValue}
                          </span>
                        )}
                        {isOrdemRitual && hasRitualPotentePower && effInt > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded">
                            +{effInt} Dano/Cura
                          </span>
                        )}
                        {ab.category === 'poder_paranormal' && (
                          <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                            <Icon name="conhecimento" /> Paranormal
                          </span>
                        )}
                        {ab.cost > 0 ? (
                          <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                            {ab.cost} {resourceLabel}
                          </span>
                        ) : (
                          !ab.damageFormula && (
                            <span className="text-[10px] font-mono uppercase bg-zinc-900 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded">
                              Passivo
                            </span>
                          )
                        )}
                        {isOrdemRitual && hasPrediletoPower && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAbilities(
                                abilities.map((itemAb) => ({
                                  ...itemAb,
                                  isFavoriteRitual:
                                    itemAb.id === ab.id ? !ab.isFavoriteRitual : false,
                                }))
                              )
                            }
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                              ab.isFavoriteRitual
                                ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-amber-500/60'
                            }`}
                          >
                            {ab.isFavoriteRitual ? 'Predileto (-1 PE)' : '☆ Marcar Predileto'}
                          </button>
                        )}
                        {isGraduadoGrimoireAvailable && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAbilities(
                                abilities.map((itemAb) =>
                                  itemAb.id === ab.id
                                    ? { ...itemAb, isGrimoireRitual: !ab.isGrimoireRitual }
                                    : itemAb
                                )
                              )
                            }
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                              ab.isGrimoireRitual
                                ? 'bg-cyan-900/60 text-cyan-200 border-cyan-500'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-cyan-500/60'
                            }`}
                          >
                            {ab.isGrimoireRitual ? 'No Grimório' : 'Pôr no Grimório'}
                          </button>
                        )}
                        {isSustainedRitual && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateAbilities(
                                abilities.map((itemAb) =>
                                  itemAb.id === ab.id
                                    ? { ...itemAb, isSustainedActive: !ab.isSustainedActive }
                                    : itemAb
                                )
                              )
                            }
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                              ab.isSustainedActive
                                ? 'bg-indigo-600 text-white border-indigo-400'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-indigo-500'
                            }`}
                          >
                            {ab.isSustainedActive ? 'Sustentando (1 PE/turno)' : 'Sustentar'}
                          </button>
                        )}
                        {isAmaldicoarArmaSpell && hasLaminaMalditaSpell && (
                          <button
                            type="button"
                            onClick={() =>
                              setRitualLaminaMovimentoMap((prev) => ({
                                ...prev,
                                [ab.id]: !prev[ab.id],
                              }))
                            }
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border cursor-pointer ${
                              laminaMovActive
                                ? 'bg-amber-600 text-white border-amber-400'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-amber-500'
                            }`}
                          >
                            <Icon name="sword" /> +1 PE (Ação Mov.)
                          </button>
                        )}
                        {ab.modifiers &&
                          ab.modifiers.length > 0 &&
                          !hasDedicatedControlElsewhere(ab) && (
                          <label className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 cursor-pointer ml-1">
                            <input
                              type="checkbox"
                              checked={ab.isActive !== false}
                              onChange={() => toggleAbilityActive(ab.id)}
                            />
                            Bônus Ativo na Ficha
                          </label>
                        )}
                      </div>
                      {isOrdemRitual && ritualDef && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-purple-200/80 font-mono mt-1">
                          <span>Execução: {ritualDef.execution}</span>
                          <span>Alcance: {ritualDef.range}</span>
                          <span>{ritualDef.targetLabel || 'Alvo'}: {ritualDef.target}</span>
                          <span>Duração: {ritualDef.duration}</span>
                          {ritualDef.resistance && (
                            <span className="text-amber-300">
                              Resistência: {ritualDef.resistance}
                              {ritualDtValue ? ` (DT ${ritualDtValue})` : ''}
                            </span>
                          )}
                        </div>
                      )}
                      {ab.description && <p className="text-xs text-zinc-400 mt-1">{ab.description}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isOrdemRitual && onCastOrdemRitual ? (
                        <>
                          {computedRitualForms.map((f) => {
                            const circleOk = !f.requiredCircle || prog.maxCircle >= f.requiredCircle;
                            const charAff = (ordemSheetData?.affinity || '').toLowerCase();
                            const reqEl = (f.element || ritualElLower || '').toLowerCase();
                            const affinityOk =
                              !f.requiresAffinity ||
                              Boolean(
                                ordemSheetData &&
                                  ordemSheetData.nex >= 50 &&
                                  charAff &&
                                  charAff !== 'nenhuma' &&
                                  (!reqEl || reqEl === 'medo' || reqEl.includes(charAff))
                              );
                            const peLimitOk = f.totalCost <= prog.peTurnLimit;
                            const canCastForm = circleOk && affinityOk && peLimitOk;

                            // Se o personagem não cumpre os requisitos para Discente ou Verdadeiro (Círculo, Afinidade ou Limite de PE), o botão não deve nem aparecer!
                            if (f.mode !== 'normal' && !canCastForm) {
                              return null;
                            }

                            const costText = ritualPoderFlagelo
                              ? `-${f.totalCost * 2} PV`
                              : `-${f.totalCost} PE`;

                            return (
                              <button
                                key={f.mode}
                                type="button"
                                onClick={() =>
                                  onCastOrdemRitual(ab, f, {
                                    usePoderDoFlagelo: ritualPoderFlagelo,
                                    camuflar: ritualCamuflar,
                                    ampliar: ritualAmpliar,
                                    acelerar: ritualAcelerar,
                                  })
                                }
                                title={f.description}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition whitespace-nowrap cursor-pointer ${
                                  f.mode === 'normal'
                                    ? 'bg-purple-950/60 hover:bg-purple-700 text-purple-200 hover:text-white border-purple-700/60'
                                    : f.mode === 'discente'
                                    ? 'bg-amber-950/60 hover:bg-amber-600 text-amber-300 hover:text-white border-amber-700/60'
                                    : 'bg-red-950/60 hover:bg-red-700 text-red-300 hover:text-white border-red-700/60'
                                }`}
                              >
                                {f.mode === 'normal' && `Normal (${costText})`}
                                {f.mode === 'discente' &&
                                  `Discente (${costText})${
                                    f.requiredCircle > 1 ? ` [${f.requiredCircle}ºC]` : ''
                                  }${f.requiresAffinity ? ' [Afin.]' : ''}`}
                                {f.mode === 'verdadeiro' &&
                                  `Verdadeiro (${costText})${
                                    f.requiredCircle > 1 ? ` [${f.requiredCircle}ºC]` : ''
                                  }${f.requiresAffinity ? ' [Afin.]' : ''}`}
                              </button>
                            );
                          })}
                          {(() => {
                            const charAff = (ordemSheetData?.affinity || '').toLowerCase();
                            const unlockedWithFormula = computedRitualForms.filter((f) => {
                              const rawF = f.damageFormula || f.healingFormula || f.tempHpFormula;
                              if (!rawF) return false;
                              if (f.mode === 'normal') return true;
                              const circleOk = !f.requiredCircle || prog.maxCircle >= f.requiredCircle;
                              const reqEl = (f.element || ritualElLower || '').toLowerCase();
                              const affinityOk =
                                !f.requiresAffinity ||
                                Boolean(
                                  ordemSheetData &&
                                    ordemSheetData.nex >= 50 &&
                                    charAff &&
                                    charAff !== 'nenhuma' &&
                                    (!reqEl || reqEl === 'medo' || reqEl.includes(charAff))
                                );
                              return circleOk && affinityOk && f.totalCost <= prog.peTurnLimit;
                            });
                            const baseEffectForm = unlockedWithFormula[0];
                            if (!baseEffectForm || isAmaldicoarArmaSpell) return null;
                            const rawFormula =
                              baseEffectForm.healingFormula ||
                              baseEffectForm.damageFormula ||
                              baseEffectForm.tempHpFormula!;
                            const parsed = parseDiceFormula(rawFormula);
                            const isDmgOrHeal = Boolean(
                              (baseEffectForm.damageFormula &&
                                ritualDef?.id !== 'ord-rit-ouvir-sussurros') ||
                                baseEffectForm.healingFormula
                            );
                            const finalMod =
                              parsed.modifier +
                              (isDmgOrHeal && hasRitualPotentePower && effInt > 0 ? effInt : 0);
                            const formulaText = `${parsed.count}d${parsed.sides}${
                              finalMod > 0 ? `+${finalMod}` : finalMod < 0 ? finalMod : ''
                            }`;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onRoll(
                                    `${ab.name} — Efeito (${baseEffectForm.label}) [0 PE]`,
                                    parsed.count,
                                    parsed.sides,
                                    finalMod,
                                    true
                                  )
                                }
                                title="Rolar apenas os dados do efeito deste ritual sem gastar PE nem repetir O Custo do Paranormal"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-zinc-700 hover:border-amber-500/70 transition whitespace-nowrap cursor-pointer"
                              >
                                <Icon name="d20" /> Só Efeito ({formulaText})
                              </button>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          {ab.id === 'orig-amnesico' && onTriggerOriginSpecial && (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onTriggerOriginSpecial('amnesico')}
                                className="px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-700 text-cyan-200 hover:text-white border border-cyan-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                <Icon name="brain" /> Testar Vislumbres (Intelecto DT 10)
                              </button>
                              {vislumbresSuccessPending && onRollVislumbresPe && (
                                <button
                                  type="button"
                                  onClick={onRollVislumbresPe}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white border border-amber-400 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap shadow-lg animate-pulse"
                                >
                                  <Icon name="d20" /> Girar 1d4 PE Temporários
                                </button>
                              )}
                            </div>
                          )}
                          {ab.id === 'orig-religioso' && ordemSheetData && (
                            <button
                              type="button"
                              onClick={() => {
                                const effPre =
                                  ordemSheetData.attributes.pre +
                                  (bonuses.attributes['pre'] || 0);
                                onRoll(
                                  `Acalentar (Sanidade Recuperada: 1d6 + ${effPre} PRE)`,
                                  1,
                                  6,
                                  effPre,
                                  true
                                );
                              }}
                              className="px-3 py-1.5 bg-blue-950/70 hover:bg-blue-700 text-blue-200 hover:text-white border border-blue-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                            >
                              Acalentar (1d6 + PRE SAN)
                            </button>
                          )}
                          {(ab.id === 'ord-pwr-comb-sentido-tatico' ||
                            ab.name.toLowerCase().includes('sentido tático') ||
                            ab.name.toLowerCase().includes('sentido tatico')) &&
                            onTriggerOriginSpecial && (
                              <button
                                type="button"
                                onClick={() => onTriggerOriginSpecial('sentido_tatico')}
                                className="px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-700 text-cyan-200 hover:text-white border border-cyan-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                <Icon name="brain" /> Analisar Ambiente (-2 PE → +INT Def/Resist na Cena)
                              </button>
                            )}
                          {(ab.id === 'ord-pwr-esp-nerd' ||
                            ab.name.toLowerCase().includes('nerd')) &&
                            ordemSheetData && (() => {
                              const nerdUsed = Boolean(
                                isInCampaign &&
                                  (ordemSheetData.sceneEffects || []).some(
                                    (e) => e.id === 'pwr-scene-nerd'
                                  )
                              );
                              return nerdUsed ? (
                                <span className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-500 rounded-lg text-xs font-bold whitespace-nowrap">
                                  ✓ Nerd já usado nesta cena
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      !onSpendResource(
                                        2,
                                        isInCampaign
                                          ? {
                                              id: 'pwr-scene-nerd',
                                              name: 'Nerd (Especialista)',
                                              source: '1x/Cena',
                                              description:
                                                'Teste de Atualidades (DT 20) realizado nesta cena',
                                            }
                                          : undefined
                                      )
                                    ) {
                                      return;
                                    }
                                    const atuSk = ordemSheetData.skills.find(
                                      (s) => s.id === 'atualidades'
                                    );
                                    const atuDice =
                                      effInt +
                                      bonuses.skillDiceAll +
                                      (bonuses.skillDice['atualidades'] || 0);
                                    const atuMod =
                                      (atuSk?.trainingDegree || 0) +
                                      (atuSk?.otherModifier || 0) +
                                      bonuses.skillBonusAll +
                                      (bonuses.skillBonus['atualidades'] || 0);
                                    onRoll(
                                      'Nerd — Atualidades (DT 20 • 1x/Cena)',
                                      atuDice,
                                      20,
                                      atuMod
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-blue-950/70 hover:bg-blue-700 text-blue-200 hover:text-white border border-blue-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                >
                                  Testar Atualidades DT 20 (-2 PE{isInCampaign ? ' • 1x/Cena' : ''})
                                </button>
                              );
                            })()}
                          {(ab.id === 'trail-medico_campo-10' ||
                            ab.name.toLowerCase().includes('paramédico') ||
                            ab.name.toLowerCase().includes('paramedico')) &&
                            isOrdemSystem && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {([
                                  { dice: 2, cost: 2, minNex: 10 },
                                  { dice: 3, cost: 3, minNex: 40 },
                                  { dice: 4, cost: 4, minNex: 65 },
                                  { dice: 5, cost: 5, minNex: 99 },
                                ] as const)
                                  .filter((t) => ordemNex >= t.minNex)
                                  .map((t) => (
                                    <button
                                      key={t.dice}
                                      type="button"
                                      onClick={() => {
                                        if (!onSpendResource(t.cost)) return;
                                        onRoll(
                                          `Paramédico — Cura (${t.dice}d10 PV • -${t.cost} PE)`,
                                          t.dice,
                                          10,
                                          0,
                                          true
                                        );
                                      }}
                                      className="px-2.5 py-1.5 bg-emerald-950/70 hover:bg-emerald-700 text-emerald-200 hover:text-white border border-emerald-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                    >
                                      Curar {t.dice}d10 PV (-{t.cost} PE)
                                    </button>
                                  ))}
                              </div>
                            )}
                          {(ab.id === 'trail-negociador-40' ||
                            ab.name.toLowerCase().includes('discurso motivador')) &&
                            isOrdemSystem && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {ab.isActive ? (
                                  <button
                                    type="button"
                                    onClick={() => handleEndDiscursoMotivador(ab.id)}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white border border-amber-300 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap shadow"
                                  >
                                    <Icon name="megaphone" /> Discurso Ativo (+
                                    {ab.modifiers?.[0]?.value || 1}d20 Perícias) • Encerrar
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenDiscursoModal(1, 4)}
                                      className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-700 text-amber-200 hover:text-white border border-amber-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                    >
                                      <Icon name="megaphone" /> Discurso Motivador (+1d20 Perícias • -4 PE)
                                    </button>
                                    {ordemNex >= 65 && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDiscursoModal(2, 8)}
                                        className="px-3 py-1.5 bg-red-950/70 hover:bg-red-700 text-red-200 hover:text-white border border-red-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                      >
                                        <Icon name="megaphone" /> Discurso 65%+ (+2d20 Perícias • -8 PE)
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          {(ab.id === 'ord-pwr-ocu-especialista-elemento' ||
                            ab.id === 'ord-pwr-ocu-mestre-elemento' ||
                            ab.name.toLowerCase().includes('especialista em elemento') ||
                            ab.name.toLowerCase().includes('mestre em elemento')) && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-purple-300 font-bold">Elemento:</span>
                              <select
                                value={ab.chosenElement || ''}
                                onChange={(e) =>
                                  onUpdateAbilities(
                                    abilities.map((a) =>
                                      a.id === ab.id ? { ...a, chosenElement: e.target.value } : a
                                    )
                                  )
                                }
                                className="px-2 py-1 bg-zinc-900 border border-purple-700/70 rounded-lg text-xs text-white font-bold"
                              >
                                <option value="">-- Escolher --</option>
                                <option value="Sangue">Sangue</option>
                                <option value="Morte">Morte</option>
                                <option value="Conhecimento">Conhecimento</option>
                                <option value="Energia">Energia</option>
                              </select>
                            </div>
                          )}
                          {(ab.id === 'ord-pwr-ocu-guiado-paranormal' ||
                            ab.name.toLowerCase().includes('guiado pelo paranormal')) && (() => {
                            const guiadoUsedInScene = Boolean(
                              isInCampaign &&
                                (ordemSheetData?.sceneEffects || []).some(
                                  (e) => e.id === 'pwr-scene-guiado-paranormal'
                                )
                            );
                            return (
                              <button
                                type="button"
                                disabled={guiadoUsedInScene}
                                onClick={() => {
                                  if (
                                    !onSpendResource(
                                      2,
                                      isInCampaign
                                        ? {
                                            id: 'pwr-scene-guiado-paranormal',
                                            name: 'Guiado pelo Paranormal (Usado na Cena)',
                                            source: 'Cena',
                                            description:
                                              '+1d20 em um teste de Investigação ou Percepção nesta cena',
                                          }
                                        : undefined
                                    )
                                  ) {
                                    return;
                                  }
                                  setAbilityUseFeedback(
                                    'Guiado pelo Paranormal (-2 PE): +1d20 no seu próximo teste de Investigação ou Percepção!'
                                  );
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition whitespace-nowrap ${
                                  guiadoUsedInScene
                                    ? 'bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
                                    : 'bg-purple-950/70 hover:bg-purple-700 text-purple-200 hover:text-white border-purple-700 cursor-pointer'
                                }`}
                              >
                                {guiadoUsedInScene
                                  ? '✓ Usado na Cena'
                                  : 'Guiado (-2 PE → +1d20 Inv/Perc)'}
                              </button>
                            );
                          })()}
                          {(ab.id === 'ord-pwr-ocu-improvisar-componentes' ||
                            ab.name.toLowerCase().includes('improvisar componentes')) &&
                            ordemSheetData && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <select
                                  value={improvisarElemento}
                                  onChange={(e) => setImprovisarElemento(e.target.value)}
                                  className="px-2 py-1 bg-zinc-900 border border-amber-700/70 rounded-lg text-xs text-white font-bold"
                                >
                                  <option value="Sangue">Sangue</option>
                                  <option value="Morte">Morte</option>
                                  <option value="Conhecimento">Conhecimento</option>
                                  <option value="Energia">Energia</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const invSk = ordemSheetData.skills.find(
                                      (s) => s.id === 'investigacao'
                                    );
                                    const invBonus =
                                      (invSk?.trainingDegree || 0) +
                                      (invSk?.otherModifier || 0) +
                                      bonuses.skillBonusAll +
                                      (bonuses.skillBonus['investigacao'] || 0);
                                    const invDice =
                                      effInt +
                                      bonuses.skillDiceAll +
                                      (bonuses.skillDice['investigacao'] || 0);
                                    onRoll(
                                      `Improvisar Componentes (${improvisarElemento} • DT 15)`,
                                      invDice,
                                      20,
                                      invBonus
                                    );
                                    onUpdateInventory([
                                      ...inventory,
                                      {
                                        id: `item-${Math.random().toString(36).slice(2, 9)}`,
                                        name: `Componentes Ritualísticos de ${improvisarElemento} (Improvisados)`,
                                        slots: 1,
                                        quantity: 1,
                                        category: 0,
                                        description:
                                          'Improvisados com Investigação (DT 15). Funcionam até o fim da cena.',
                                      },
                                    ]);
                                    setAbilityUseFeedback(
                                      `Teste de Investigação DT 15 rolado e Componentes de ${improvisarElemento} adicionados à mochila!`
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-700 text-amber-200 hover:text-white border border-amber-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                >
                                  <Icon name="d20" /> Investigação (DT 15) + Criar Componentes
                                </button>
                              </div>
                            )}
                          {(ab.id === 'ord-pwr-ocu-identificacao-paranormal' ||
                            ab.name.toLowerCase().includes('identificação paranormal') ||
                            ab.name.toLowerCase().includes('identificacao paranormal')) &&
                            ordemSheetData && (
                              <button
                                type="button"
                                onClick={() => {
                                  const ocultSk = ordemSheetData.skills.find(
                                    (s) => s.id === 'ocultismo'
                                  );
                                  const ocultBonus =
                                    (ocultSk?.trainingDegree || 0) +
                                    (ocultSk?.otherModifier || 0) +
                                    bonuses.skillBonusAll +
                                    (bonuses.skillBonus['ocultismo'] || 0) +
                                    10;
                                  const ocultDice =
                                    effInt +
                                    bonuses.skillDiceAll +
                                    (bonuses.skillDice['ocultismo'] || 0);
                                  onRoll(
                                    'Identificação Paranormal (+10 Ocultismo)',
                                    ocultDice,
                                    20,
                                    ocultBonus
                                  );
                                }}
                                className="px-3 py-1.5 bg-cyan-950/70 hover:bg-cyan-700 text-cyan-200 hover:text-white border border-cyan-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                <Icon name="search" /> Identificar (+10 Ocultismo)
                              </button>
                            )}
                          {(ab.id === 'ord-pwr-ocu-criar-selo' ||
                            ab.name.toLowerCase().includes('criar selo')) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {spellList.length === 0 ? (
                                <span className="text-[11px] text-zinc-500">
                                  Nenhum ritual conhecido na ficha
                                </span>
                              ) : (
                                <>
                                  <select
                                    value={criarSeloRitualId || spellList[0]?.id || ''}
                                    onChange={(e) => setCriarSeloRitualId(e.target.value)}
                                    className="px-2 py-1 bg-zinc-900 border border-indigo-700/70 rounded-lg text-xs text-white max-w-[180px]"
                                  >
                                    {spellList.map((sp) => (
                                      <option key={sp.id} value={sp.id}>
                                        {sp.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const chosen =
                                        spellList.find(
                                          (sp) => sp.id === (criarSeloRitualId || spellList[0]?.id)
                                        ) || spellList[0];
                                      if (!chosen) return;
                                      const def =
                                        findOrdemRitualDef(chosen.id) ||
                                        findOrdemRitualDef(chosen.name);
                                      const circle = def?.circle || 1;
                                      const sealCost = getOrdemCircleBaseCost(circle);
                                      if (!onSpendResource(sealCost)) return;
                                      onUpdateInventory([
                                        ...inventory,
                                        {
                                          id: `item-${Math.random().toString(36).slice(2, 9)}`,
                                          name: `Selo Paranormal: ${chosen.name}`,
                                          slots: 1,
                                          quantity: 1,
                                          category: circle,
                                          description: `Selo (${circle}º Círculo • ${
                                            chosen.element || def?.element || 'Paranormal'
                                          }). ${chosen.description || ''}`,
                                        },
                                      ]);
                                      setAbilityUseFeedback(
                                        `Selo Paranormal de ${chosen.name} fabricado (-${sealCost} PE, Cat. ${circle}) e guardado na mochila!`
                                      );
                                    }}
                                    className="px-3 py-1.5 bg-indigo-950/70 hover:bg-indigo-700 text-indigo-200 hover:text-white border border-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                  >
                                    {(() => {
                                      const chosen =
                                        spellList.find(
                                          (sp) => sp.id === (criarSeloRitualId || spellList[0]?.id)
                                        ) || spellList[0];
                                      const def = chosen
                                        ? findOrdemRitualDef(chosen.id) ||
                                          findOrdemRitualDef(chosen.name)
                                        : undefined;
                                      const c = def?.circle || 1;
                                      return `Fabricar Selo (-${getOrdemCircleBaseCost(c)} PE • Cat. ${c})`;
                                    })()}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                          {(ab.id === 'trail-conduite-65' ||
                            ab.name.toLowerCase().includes('anular ritual')) &&
                            ordemSheetData && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-zinc-400">PE Alvo:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={30}
                                  value={anularRitualPe}
                                  onChange={(e) =>
                                    setAnularRitualPe(Math.max(1, Number(e.target.value) || 1))
                                  }
                                  className="w-14 px-2 py-1 bg-zinc-900 border border-purple-700/70 rounded-lg text-xs font-mono text-white text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!onSpendResource(anularRitualPe)) return;
                                    const ocultSk = ordemSheetData.skills.find(
                                      (s) => s.id === 'ocultismo'
                                    );
                                    const ocultBonus =
                                      (ocultSk?.trainingDegree || 0) +
                                      (ocultSk?.otherModifier || 0) +
                                      bonuses.skillBonusAll +
                                      (bonuses.skillBonus['ocultismo'] || 0);
                                    const ocultDice =
                                      effInt +
                                      bonuses.skillDiceAll +
                                      (bonuses.skillDice['ocultismo'] || 0);
                                    onRoll(
                                      `Anular Ritual (Oposto -${anularRitualPe} PE)`,
                                      ocultDice,
                                      20,
                                      ocultBonus
                                    );
                                  }}
                                  className="px-3 py-1.5 bg-purple-950/70 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                                >
                                  <Icon name="x-circle" /> Anular (-{anularRitualPe} PE + Ocultismo)
                                </button>
                              </div>
                            )}
                          {(ab.id === 'trail-flagelador-65' ||
                            ab.name.toLowerCase().includes('absorver agonia')) && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[11px] text-red-300 font-bold mr-1">
                                Absorver:
                              </span>
                              {[1, 2, 3, 4].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => {
                                    onGrantTempPe?.(val, 'Absorver Agonia');
                                    setAbilityUseFeedback(
                                      `Absorver Agonia: +${val} PE temporário adicionado!`
                                    );
                                  }}
                                  className="px-2 py-1 bg-red-950/70 hover:bg-red-700 text-red-200 hover:text-white border border-red-700 rounded text-xs font-bold cursor-pointer"
                                >
                                  +{val} PE
                                </button>
                              ))}
                            </div>
                          )}
                          {(ab.id === 'ord-para-ener-campo-protetor' ||
                            ab.name.toLowerCase().includes('campo protetor')) && (
                            <button
                              type="button"
                              onClick={() => {
                                const hasAff = Boolean(
                                  ab.hasAffinityUpgrade ||
                                    ab.name.toLowerCase().includes('afinidade')
                                );
                                const mods: SceneEffect['modifiers'] = [
                                  {
                                    id: 'mod-campo-protetor-def',
                                    targetType: 'defense',
                                    targetKey: 'defesa',
                                    value: 5,
                                  },
                                ];
                                if (hasAff) {
                                  mods.push({
                                    id: 'mod-campo-protetor-ref',
                                    targetType: 'skill_bonus',
                                    targetKey: 'reflexos',
                                    value: 5,
                                  });
                                }
                                if (
                                  !onSpendResource(1, {
                                    id: 'pwr-scene-campo-protetor',
                                    name: `Campo Protetor${hasAff ? ' (Afinidade)' : ''}`,
                                    source: 'Cena',
                                    description: hasAff
                                      ? '+5 Defesa e +5 Reflexos (se falhar em Reflexos não sofre dano)'
                                      : '+5 na Defesa ao esquivar',
                                    modifiers: mods,
                                  })
                                ) {
                                  return;
                                }
                                setAbilityUseFeedback(
                                  `Campo Protetor ativado (-1 PE): +5 Defesa${
                                    hasAff ? ' e +5 Reflexos' : ''
                                  } na cena!`
                                );
                              }}
                              className="px-3 py-1.5 bg-purple-950/70 hover:bg-purple-700 text-purple-200 hover:text-white border border-purple-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                            >
                              <Icon name="zap" /> Campo Protetor (-1 PE → +5 Def)
                            </button>
                          )}
                          {(ab.id === 'ord-para-mort-surto-temporal' ||
                            ab.name.toLowerCase().includes('surto temporal')) && (() => {
                            const hasAff = Boolean(
                              ab.hasAffinityUpgrade || ab.name.toLowerCase().includes('afinidade')
                            );
                            const blocked = Boolean(
                              isInCampaign &&
                                !hasAff &&
                                (ordemSheetData?.sceneEffects || []).some(
                                  (e) => e.id === 'pwr-scene-surto-temporal'
                                )
                            );
                            return (
                              <button
                                type="button"
                                disabled={blocked}
                                onClick={() => {
                                  if (
                                    !onSpendResource(
                                      3,
                                      isInCampaign && !hasAff
                                        ? {
                                            id: 'pwr-scene-surto-temporal',
                                            name: 'Surto Temporal (Usado na Cena)',
                                            source: 'Cena',
                                            description:
                                              '+1 ação padrão adicional usada nesta cena (1x/cena sem Afinidade)',
                                          }
                                        : undefined
                                    )
                                  ) {
                                    return;
                                  }
                                  setAbilityUseFeedback(
                                    `Surto Temporal ativado (-3 PE): você ganha +1 ação padrão adicional neste turno${
                                      hasAff ? ' (1x/turno com Afinidade)' : ''
                                    }!`
                                  );
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition whitespace-nowrap ${
                                  blocked
                                    ? 'bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed'
                                    : 'bg-zinc-900 hover:bg-zinc-700 text-zinc-100 border-zinc-600 cursor-pointer'
                                }`}
                              >
                                {blocked
                                  ? '✓ Surto Usado na Cena'
                                  : `Surto Temporal (-3 PE • ${
                                      hasAff ? '1x/turno' : '1x/cena'
                                    })`}
                              </button>
                            );
                          })()}
                          {(ab.id === 'ord-para-mort-potencial-reaproveitado' ||
                            ab.name.toLowerCase().includes('potencial reaproveitado')) && (
                            <button
                              type="button"
                              onClick={() => {
                                const hasAff = Boolean(
                                  ab.hasAffinityUpgrade ||
                                    ab.name.toLowerCase().includes('afinidade')
                                );
                                const gain = hasAff ? 3 : 2;
                                onGrantTempPe?.(gain, 'Potencial Reaproveitado');
                                setAbilityUseFeedback(
                                  `Potencial Reaproveitado: +${gain} PE temporários por passar no teste de resistência!`
                                );
                              }}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-600 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                            >
                              {ab.hasAffinityUpgrade ||
                              ab.name.toLowerCase().includes('afinidade')
                                ? '+3 PE Temp (Resistência)'
                                : '+2 PE Temp (Resistência)'}
                            </button>
                          )}
                          {(ab.id === 'ord-para-sang-anatomia-insana' ||
                            ab.name.toLowerCase().includes('anatomia insana')) &&
                            (ab.hasAffinityUpgrade ||
                            ab.name.toLowerCase().includes('afinidade') ? (
                              <span className="px-2.5 py-1 bg-red-950/70 text-red-200 border border-red-700 rounded-lg text-xs font-bold">
                                <Icon name="shield" /> Imune a Críticos e Furtivos
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onRoll(
                                    'Anatomia Insana (3 ou 4 = Ignora Crítico/Furtivo)',
                                    1,
                                    4,
                                    0,
                                    true
                                  )
                                }
                                className="px-3 py-1.5 bg-red-950/70 hover:bg-red-700 text-red-200 hover:text-white border border-red-700 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                <Icon name="d20" /> Ignorar Crítico (1d4 ≥ 3)
                              </button>
                            ))}
                          {!isPassive &&
                            !hasDedicatedControlElsewhere(ab) &&
                            !(
                              ab.id === 'ord-pwr-comb-sentido-tatico' ||
                              ab.name.toLowerCase().includes('sentido tático') ||
                              ab.name.toLowerCase().includes('sentido tatico') ||
                              ab.id === 'ord-pwr-esp-nerd' ||
                              ab.name.toLowerCase().includes('nerd')
                            ) && (
                            <button
                              type="button"
                              onClick={() => handleUseAbility(ab)}
                              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-700/50 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                            >
                              <Icon name="sparkles" /> Usar {ab.cost > 0 ? `(-${ab.cost} ${resourceLabel})` : ''}
                            </button>
                          )}
                        </>
                      )}
                      {allowAb && (
                        <button
                          type="button"
                          onClick={() => onUpdateAbilities(abilities.filter((a) => a.id !== ab.id))}
                          className="text-xs text-zinc-600 hover:text-red-400 px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      )}

      {/* MODAL DE ZOOM DE IMAGEM DE ITEM */}
      {zoomedItemImage && (
        <div
          onClick={() => setZoomedItemImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 overflow-y-auto cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 max-w-xl w-full flex flex-col items-center gap-3 shadow-2xl"
          >
            <img
              src={zoomedItemImage.url}
              alt={zoomedItemImage.name}
              className="max-h-[70vh] w-auto object-contain rounded-2xl"
            />
            <div className="flex justify-between items-center w-full px-2">
              <span className="text-base font-extrabold text-white">{zoomedItemImage.name}</span>
              <button
                type="button"
                onClick={() => setZoomedItemImage(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CUSTOMIZAÇÃO (MODIFICAÇÕES & MALDIÇÕES) */}
      {customizingItemId && (() => {
        const targetItem = inventory.find((i) => i.id === customizingItemId);
        if (!targetItem) return null;
        return (
          <ItemCustomizationModal
            item={targetItem}
            compendiumEntries={compendiumEntries}
            onClose={() => setCustomizingItemId(null)}
            onSave={(updatedItem) => {
              onUpdateInventory(
                inventory.map((i) => (i.id === updatedItem.id ? updatedItem : i))
              );
              // Garante que ataques correspondentes fiquem vinculados por linkedItemId
              const matchAtk = attacks.find(
                (a) =>
                  a.linkedItemId === updatedItem.id ||
                  a.name.toLowerCase() === targetItem.name.toLowerCase()
              );
              if (matchAtk && !matchAtk.linkedItemId) {
                onUpdateAttacks(
                  attacks.map((a) =>
                    a.id === matchAtk.id ? { ...a, linkedItemId: updatedItem.id } : a
                  )
                );
              }
              setCustomizingItemId(null);
              setInventoryFeedback(
                `"${updatedItem.name}" atualizado (Cat. ${
                  ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'][
                    getOrdemItemEffectiveCategory(updatedItem)
                  ] || getOrdemItemEffectiveCategory(updatedItem)
                } • ${getOrdemItemEffectiveSlots(updatedItem)} esp.).`
              );
            }}
          />
        );
      })()}

      {/* CONTEÚDO DA ABA 4: INVENTÁRIO (Com Imagens em Destaque, Equipados no Topo, Modificações/Maldições e Trocas) */}
      {activeSubTab === 'inventory' && (
        <div className="flex flex-col gap-4">
          {inventoryFeedback && (
            <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
              <span>{inventoryFeedback}</span>
              <button
                type="button"
                onClick={() => setInventoryFeedback('')}
                className="text-emerald-400 hover:text-white ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400">Capacidade de Carga:</span>
              {canTrade && (
                <span className="text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">
                  <Icon name="handshake" /> Trocas entre Jogadores Liberadas
                </span>
              )}
              {system === 'ordem-paranormal' && ordemSheetData && (() => {
                const patentObj =
                  ORDEM_PATENTS.find((p) => p.name === ordemSheetData.patent) ||
                  ORDEM_PATENTS[0];
                const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
                for (const it of inventory) {
                  const rawCat = Math.min(4, getOrdemItemEffectiveCategory(it));
                  const qty = it.quantity || 1;
                  const remendaoRed = hasRemendao && isGeneralEquipment(it) ? 1 : 0;
                  const hasFerramentasParanormaisInv = abilities.some(
                    (ab) =>
                      ab.isActive !== false &&
                      (ab.id === 'ord-pwr-ocu-ferramentas-paranormais' ||
                        ab.name.toLowerCase().includes('ferramentas paranormais'))
                  );
                  const singleUnitRed =
                    (it.isFavoriteTool ? 1 : 0) +
                    (hasMochilaUtilidades && it.isUtilityBackpackItem ? 1 : 0) +
                    (hasFerramentasParanormaisInv && it.isParanormalTool ? 1 : 0) +
                    (it.isAniquiladorFavorite && aniquiladorCatReduction > 0
                      ? aniquiladorCatReduction
                      : 0);

                  const firstUnitCat = Math.max(0, rawCat - remendaoRed - singleUnitRed);
                  if (firstUnitCat >= 1 && firstUnitCat <= 4) {
                    counts[firstUnitCat as 1 | 2 | 3 | 4] += 1;
                  }
                  if (qty > 1) {
                    const otherUnitsCat = Math.max(0, rawCat - remendaoRed);
                    if (otherUnitsCat >= 1 && otherUnitsCat <= 4) {
                      counts[otherUnitsCat as 1 | 2 | 3 | 4] += qty - 1;
                    }
                  }
                }
                return (
                  <div className="flex flex-wrap items-center gap-1.5 ml-2">
                    {([1, 2, 3, 4] as const).map((cat) => {
                      const lim = patentObj.categoryLimits[cat];
                      const used = counts[cat];
                      const over = used > lim;
                      return (
                        <span
                          key={cat}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            over
                              ? 'bg-red-950 text-red-300 border-red-700 font-bold'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          Cat. {cat === 1 ? 'I' : cat === 2 ? 'II' : cat === 3 ? 'III' : 'IV'}: {used}/{lim}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <span className={`text-xs font-mono font-bold ${isOverloaded ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentLoad} / {effectiveMaxSlots} Espaços {isOverloaded && 'SOBRECARGA (-5 Defesa, -3m Desl.)!'}
            </span>
          </div>

          {system === 'ordem-paranormal' && inventory.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInventoryRealmFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    inventoryRealmFilter === 'ALL'
                      ? 'bg-zinc-800 text-white border-zinc-600'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  Todos ({inventory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryRealmFilter('normal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    inventoryRealmFilter === 'normal'
                      ? 'bg-amber-600/20 text-amber-300 border-amber-600'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-amber-300'
                  }`}
                >
                  <Icon name="backpack" /> Normais ({inventory.filter((it) => !isOrdemItemParanormal(it)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryRealmFilter('paranormal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                    inventoryRealmFilter === 'paranormal'
                      ? 'bg-purple-600/25 text-purple-200 border-purple-500'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-purple-300'
                  }`}
                >
                  <Icon name="conhecimento" /> Paranormais & Amaldiçoados ({inventory.filter((it) => isOrdemItemParanormal(it)).length})
                </button>
              </div>
              <span className="text-[11px] text-zinc-500">
                ✓ Itens equipados ficam sempre no topo
              </span>
            </div>
          )}

          {inventory.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">Mochila vazia.</p>
          ) : (() => {
            const visibleInventory = inventory
              .filter((it) => {
                if (system !== 'ordem-paranormal' || inventoryRealmFilter === 'ALL') return true;
                const isPara = isOrdemItemParanormal(it);
                return inventoryRealmFilter === 'paranormal' ? isPara : !isPara;
              })
              .sort((a, b) => Number(Boolean(b.isEquipped)) - Number(Boolean(a.isEquipped)));

            if (visibleInventory.length === 0) {
              return (
                <p className="text-xs text-zinc-500 text-center py-4">
                  Nenhum item nesta categoria de filtro.
                </p>
              );
            }

            const catRoman = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'];

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {visibleInventory.map((item) => {
                  const isPara = system === 'ordem-paranormal' && isOrdemItemParanormal(item);
                  const effCat =
                    system === 'ordem-paranormal'
                      ? getOrdemItemEffectiveCategory(item)
                      : item.category ?? 0;
                  const effSlotsSingle =
                    system === 'ordem-paranormal'
                      ? getOrdemItemEffectiveSlots(item)
                      : item.slots;
                  const qty = item.quantity || 1;
                  const effSlotsTotal =
                    hasMochilaUtilidades && item.isUtilityBackpackItem
                      ? Math.max(0, effSlotsSingle - 1) + effSlotsSingle * Math.max(0, qty - 1)
                      : effSlotsSingle * qty;
                  const hasModsOrCurses =
                    (item.modifications?.length || 0) > 0 || (item.curses?.length || 0) > 0;

                  const accSkillName = (id?: string) =>
                    id
                      ? ORDEM_ACCESSORY_ELIGIBLE_SKILLS.find((s) => s.id === id)?.name || id
                      : '';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl flex flex-col gap-3 border transition ${
                        item.isEquipped
                          ? 'bg-emerald-950/15 border-emerald-500/70 shadow-md shadow-emerald-950/30'
                          : isPara
                          ? 'bg-purple-950/10 border-purple-800/60'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {item.imageUrl ? (
                            <div
                              onClick={() => setZoomedItemImage({ name: item.name, url: item.imageUrl! })}
                              title="Clique para ampliar a imagem do item"
                              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 shadow-lg shrink-0 bg-zinc-900 cursor-zoom-in group relative ${
                                item.isEquipped
                                  ? 'border-emerald-500/80'
                                  : isPara
                                  ? 'border-purple-500/70'
                                  : 'border-amber-500/60'
                              }`}
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border flex items-center justify-center text-2xl shrink-0 ${
                                item.isEquipped
                                  ? 'bg-emerald-950/50 border-emerald-600/60'
                                  : isPara
                                  ? 'bg-purple-950/50 border-purple-700/60'
                                  : 'bg-zinc-900 border-zinc-800'
                              }`}
                            >
                              <Icon name={isPara ? 'conhecimento' : 'backpack'} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-mono font-extrabold bg-amber-950/70 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded">
                                {qty}x
                              </span>
                              <p className="text-sm sm:text-base font-bold text-white truncate">
                                {item.name}
                              </p>
                              <span className="text-[11px] font-mono text-zinc-400">
                                ({effSlotsTotal} esp.)
                              </span>
                              {system === 'ordem-paranormal' && (
                                allowInv && !hasModsOrCurses ? (
                                  <select
                                    value={item.baseCategory ?? item.category ?? 0}
                                    onChange={(e) =>
                                      onUpdateInventory(
                                        inventory.map((i) =>
                                          i.id === item.id
                                            ? {
                                                ...i,
                                                baseCategory: Number(e.target.value),
                                                category: Number(e.target.value),
                                              }
                                            : i
                                        )
                                      )
                                    }
                                    className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-amber-300"
                                    title="Categoria Base do Item (Patente)"
                                  >
                                    <option value={0}>Cat. 0</option>
                                    <option value={1}>Cat. I</option>
                                    <option value={2}>Cat. II</option>
                                    <option value={3}>Cat. III</option>
                                    <option value={4}>Cat. IV</option>
                                  </select>
                                ) : (
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                      isPara
                                        ? 'bg-purple-950/80 text-purple-200 border-purple-700'
                                        : 'bg-zinc-900 text-amber-300 border-zinc-800'
                                    }`}
                                    title="Categoria Efetiva (Base + Modificações + Maldições)"
                                  >
                                    Cat. {catRoman[effCat] || effCat}
                                  </span>
                                )
                              )}
                              {isPara && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                                  <Icon name="conhecimento" /> {item.element ? item.element : 'Paranormal'}
                                </span>
                              )}
                              {system === 'ordem-paranormal' &&
                                item.isEquipped &&
                                (() => {
                                  const protCheck = checkOrdemProtectionProficiency(
                                    item,
                                    bonuses.effectiveProficiencies
                                  );
                                  if (!protCheck.isProtection || protCheck.proficient) return null;
                                  return (
                                    <span
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-200 border border-red-700"
                                      title={`Exige ${protCheck.requiredLabel} (p. 62: -2d20 em testes de Força e Agilidade)`}
                                    >
                                      <Icon name="warning" /> Sem Proficiência (-2d20 FOR/AGI)
                                    </span>
                                  );
                                })()}
                              {item.isFavoriteTool && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                                  <Icon name="wrench" /> Ferramenta Favorita (-1 Cat.)
                                </span>
                              )}
                              {hasMochilaUtilidades && item.isUtilityBackpackItem && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700">
                                  <Icon name="backpack" /> Mochila de Utilidades (-1 Cat., -1 Esp.)
                                </span>
                              )}
                              {hasFerramentasParanormais && item.isParanormalTool && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">
                                  <Icon name="sigil" /> Ferramenta Paranormal (-I Cat.)
                                </span>
                              )}
                              {hasRemendao &&
                                isGeneralEquipment(item) &&
                                (item.category || 0) > 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                                    <Icon name="hammer" /> Remendão (-I Cat.)
                                  </span>
                                )}
                              {item.isAniquiladorFavorite && aniquiladorCatReduction > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">
                                  <Icon name="sword" /> A Favorita (-{aniquiladorCatReduction} Cat.)
                                </span>
                              )}
                            </div>

                            {/* Badges de Modificações, Maldições, Acessórios e Rituais Armazenados */}
                            {system === 'ordem-paranormal' &&
                              ((item.modifications && item.modifications.length > 0) ||
                                (item.curses && item.curses.length > 0) ||
                                item.accessoryConfig?.primarySkill ||
                                item.storedRitualName) && (
                                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                  {(item.modifications || []).map((modId) => {
                                    const def = findOrdemModificationDef(modId);
                                    return (
                                      <span
                                        key={modId}
                                        title={def?.description}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-200 border border-amber-700/60"
                                      >
                                        <Icon name="hammer" /> {def?.name || modId}
                                      </span>
                                    );
                                  })}
                                  {(item.curses || []).map((c) => {
                                    const def = findOrdemCurseDef(c.curseId);
                                    const extra =
                                      c.chosenElement || c.chosenRitualName
                                        ? ` (${c.chosenElement || c.chosenRitualName})`
                                        : '';
                                    return (
                                      <span
                                        key={c.curseId}
                                        title={def?.description}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-200 border border-purple-600/70"
                                      >
                                        <Icon name="conhecimento" /> {def?.name || c.curseId}
                                        {extra}
                                      </span>
                                    );
                                  })}
                                  {item.accessoryConfig?.primarySkill && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-200 border border-cyan-700/60">
                                      <Icon name="briefcase" /> {accSkillName(item.accessoryConfig.primarySkill)}{' '}
                                      {(item.modifications || []).includes('mod-aprimorado')
                                        ? '+5'
                                        : '+2'}
                                    </span>
                                  )}
                                  {item.accessoryConfig?.secondarySkill && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-200 border border-cyan-700/60">
                                      <Icon name="briefcase" /> 2ª: {accSkillName(item.accessoryConfig.secondarySkill)}{' '}
                                      {(item.modifications || []).includes('mod-aprimorado-2')
                                        ? '+5'
                                        : '+2'}
                                    </span>
                                  )}
                                  {item.accessoryConfig?.instrumentalSkill && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-200 border border-emerald-700/60">
                                      <Icon name="wrench" /> Kit: {accSkillName(item.accessoryConfig.instrumentalSkill)}
                                    </span>
                                  )}
                                  {item.storedRitualName && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-950/80 text-fuchsia-200 border border-fuchsia-600/70">
                                      <Icon name="sigil" /> Selo: {item.storedRitualName}
                                      {item.storedRitualCircle ? ` (${item.storedRitualCircle}ºC)` : ''}
                                    </span>
                                  )}
                                </div>
                              )}

                            {item.description && (
                              <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleItemEquipped(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition cursor-pointer whitespace-nowrap ${
                              item.isEquipped
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/60'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {item.isEquipped ? '✓ Equipado' : 'Equipar'}
                          </button>

                          {system === 'ordem-paranormal' && allowInv && (
                            <button
                              type="button"
                              onClick={() => setCustomizingItemId(item.id)}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-purple-900/70 text-amber-300 hover:text-white border border-zinc-700 hover:border-purple-500 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                              title="Aplicar Modificações Normais, Maldições Paranormais ou Configurar Acessório/Selo"
                            >
                              <Icon name="settings" /> Modificar / Amaldiçoar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Ações Mecânicas do Item (Consumíveis, Granadas, Selos, Operacionais, Itens Amaldiçoados e Maldições Ativas) */}
                      {system === 'ordem-paranormal' && ordemSheetData && (
                        <InventoryItemActionBar
                          item={item}
                          ordemSheetData={ordemSheetData}
                          bonuses={bonuses}
                          abilities={abilities}
                          compendiumEntries={compendiumEntries}
                          onUpdateItem={(updated) =>
                            onUpdateInventory(
                              inventory.map((i) => (i.id === updated.id ? updated : i))
                            )
                          }
                          onConsumeUnit={(id) => {
                            const target = inventory.find((i) => i.id === id);
                            if (!target) return;
                            if ((target.quantity || 1) > 1) {
                              onUpdateInventory(
                                inventory.map((i) =>
                                  i.id === id ? { ...i, quantity: (i.quantity || 1) - 1 } : i
                                )
                              );
                            } else {
                              onUpdateInventory(inventory.filter((i) => i.id !== id));
                            }
                          }}
                          onOpenCustomize={(id) => setCustomizingItemId(id)}
                          onSpendResource={onSpendResource}
                          onHealPv={onHealPv}
                          onTakePvDamage={onTakePvDamage}
                          onGrantTempPe={onGrantTempPe}
                          onAddSceneEffect={onAddSceneEffect}
                          onFeedback={(msg) => setInventoryFeedback(msg)}
                          onRoll={onRoll}
                        />
                      )}

                      {/* Rodapé do Card: Controles secundários, Imagem, Trocas e Exclusão */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/70">
                        <div className="flex flex-wrap items-center gap-3">
                          {(originId === 'engenheiro' || hasMochilaUtilidades) &&
                            !attacks.some(
                              (a) => a.name.toLowerCase() === item.name.toLowerCase()
                            ) && (
                              <label className="flex items-center gap-1.5 text-[11px] text-amber-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.isFavoriteTool)}
                                  onChange={() =>
                                    onUpdateInventory(
                                      inventory.map((i) => ({
                                        ...i,
                                        isFavoriteTool:
                                          i.id === item.id ? !i.isFavoriteTool : false,
                                      }))
                                    )
                                  }
                                />
                                <Icon name="wrench" /> Ferramenta Favorita (-1 Cat.)
                              </label>
                            )}

                          {hasMochilaUtilidades &&
                            canChangeUtilityBackpackItem &&
                            !attacks.some(
                              (a) => a.name.toLowerCase() === item.name.toLowerCase()
                            ) && (
                              <label className="flex items-center gap-1.5 text-[11px] text-blue-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.isUtilityBackpackItem)}
                                  onChange={() =>
                                    onUpdateInventory(
                                      inventory.map((i) => ({
                                        ...i,
                                        isUtilityBackpackItem:
                                          i.id === item.id ? !i.isUtilityBackpackItem : false,
                                      }))
                                    )
                                  }
                                />
                                <Icon name="backpack" /> Mochila de Utilidades (-1 Cat., -1 Esp.)
                              </label>
                            )}

                          {hasFerramentasParanormais &&
                            canChangeParanormalTool &&
                            !attacks.some(
                              (a) => a.name.toLowerCase() === item.name.toLowerCase()
                            ) && (
                              <label className="flex items-center gap-1.5 text-[11px] text-purple-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.isParanormalTool)}
                                  onChange={() =>
                                    onUpdateInventory(
                                      inventory.map((i) => ({
                                        ...i,
                                        isParanormalTool:
                                          i.id === item.id ? !i.isParanormalTool : false,
                                      }))
                                    )
                                  }
                                />
                                <Icon name="sigil" /> Ferramenta Paranormal (-I Cat.)
                              </label>
                            )}

                          {hasAFavorita &&
                            canChangeAniquiladorFavorite &&
                            attacks.some(
                              (a) => a.name.toLowerCase() === item.name.toLowerCase()
                            ) && (
                              <label className="flex items-center gap-1.5 text-[11px] text-red-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.isAniquiladorFavorite)}
                                  onChange={() => {
                                    const nextChecked = !item.isAniquiladorFavorite;
                                    onUpdateInventory(
                                      inventory.map((i) => ({
                                        ...i,
                                        isAniquiladorFavorite:
                                          i.id === item.id ? nextChecked : false,
                                      }))
                                    );
                                    onUpdateAttacks(
                                      attacks.map((a) => ({
                                        ...a,
                                        isAniquiladorFavorite:
                                          a.name.toLowerCase() === item.name.toLowerCase()
                                            ? nextChecked
                                            : false,
                                      }))
                                    );
                                  }}
                                />
                                <Icon name="sword" /> A Favorita (-{aniquiladorCatReduction} Cat.)
                              </label>
                            )}

                          {allowInv && (
                            <ImageUploadField
                              compact
                              value={item.imageUrl || ''}
                              onChange={(newUrl) =>
                                onUpdateInventory(
                                  inventory.map((i) =>
                                    i.id === item.id ? { ...i, imageUrl: newUrl || undefined } : i
                                  )
                                )
                              }
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                          {(() => {
                            if (item.name.toLowerCase().includes('cicatrizante')) return null;
                            const healFormulaRaw = getConsumableHealFormula(item, compendiumEntries);
                            if (!healFormulaRaw) return null;
                            const parsed = parseDiceFormula(healFormulaRaw);
                            const agenteSaudeBonus =
                              system === 'ordem-paranormal' && originId === 'agente_saude'
                                ? Math.max(0, effInt)
                                : 0;
                            const finalMod = parsed.modifier + agenteSaudeBonus;
                            const displayFormula = `${parsed.count}d${parsed.sides}${
                              finalMod > 0 ? `+${finalMod}` : finalMod < 0 ? finalMod : ''
                            }`;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  onRoll(
                                    `${item.name} — Cura PV`,
                                    parsed.count,
                                    parsed.sides,
                                    finalMod,
                                    true
                                  );
                                  const nextInventory =
                                    (item.quantity || 1) > 1
                                      ? inventory.map((i) =>
                                          i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
                                        )
                                      : inventory.filter((i) => i.id !== item.id);
                                  onUpdateInventory(nextInventory);
                                }}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400 rounded-lg text-[11px] font-extrabold transition cursor-pointer whitespace-nowrap shadow"
                                title={`Rolar cura (${displayFormula} PV) e consumir 1 unidade do inventário`}
                              >
                                <Icon name="heart-pulse" /> Usar ({displayFormula} PV • -1 un.)
                              </button>
                            );
                          })()}
                          {canTrade && onInitiateTradeItem && (
                            <button
                              type="button"
                              onClick={() => onInitiateTradeItem(item)}
                              className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-700 text-blue-200 hover:text-white border border-blue-700/60 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                              title="Entregar este item para outro jogador da mesa"
                            >
                              <Icon name="handshake" /> Passar p/ Aliado
                            </button>
                          )}

                          {allowInv && (
                            <div className="flex items-center gap-1">
                              {item.quantity > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateInventory(
                                      inventory.map((i) =>
                                        i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
                                      )
                                    )
                                  }
                                  className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                                  title="Consumir / Reduzir 1 unidade"
                                >
                                  -1
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onUpdateInventory(inventory.filter((i) => i.id !== item.id))}
                                className="text-xs text-zinc-600 hover:text-red-400 px-1.5 cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* CONTEÚDO DA ABA 5: PESSOAL & HISTÓRIA */}
      {activeSubTab === 'personal' && (
        <CharacterPersonalTab
          system={system}
          personalProfile={personalProfile || {}}
          canEditPersonal={Boolean(canEditPersonal)}
          proficiencies={
            system === 'ordem-paranormal' ? bonuses.effectiveProficiencies : []
          }
          onUpdateProfile={(nextProfile) => onUpdatePersonalProfile?.(nextProfile)}
        />
      )}
    </div>
  );
}