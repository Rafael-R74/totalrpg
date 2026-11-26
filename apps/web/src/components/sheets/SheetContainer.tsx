import { useState, useEffect, useRef } from 'react';
import {
  OrdemSheetData,
  OrdemOriginMeta,
  OrdemSkill,
  OrdemElement,
  T20SheetData,
  SystemId,
  CharacterAbility,
  ActiveCondition,
  SceneEffect,
  CompendiumEntryData,
  SystemSkillDefinition,
  SheetPermissions,
  RPGItem,
  PreparedAttack,
  calculateActiveBonuses,
  getOrdemDiceRollCount,
  formatOrdemDiceLabel,
  buildOrdemOriginModifiers,
  getOrdemOcultismoAttr,
  ORDEM_RENAMED_POWERS,
  applyGeneralPowerSkillGrants,
  isOrdemGeneralPower,
  getPossessionInfo,
  getContentSourcesForSystem,
  hasInventarioOrganizado,
  getCatalystType,
  getCatalystElement,
  addOneDieToFormula,
  CATALYST_INFO,
  buildOrdemOriginAbility,
  buildParanormalInventionItem,
  matchesContentSourceFilter,
  resolveEntrySourceId,
  ORDEM_CLASSES,
  ORDEM_ORIGINS,
  ORDEM_NEX_PROGRESSION,
  ORDEM_TRAILS,
  getOrdemTrailDisplayName,
  describeSahRitualCast,
  getMissingNexGeneralChoices,
  ORDEM_COMPENDIUM_ENTRIES,
  ORDEM_INSANITY_EFFECTS,
  ORDEM_INTERLUDE_DISHES,
  calculateOrdemBaseVitals,
  getOrdemPeLimit,
  getOrdemRitualPeLimit,
  getOrdemCircleBaseCost,
  findOrdemRitualDef,
  getOrdemMaxLoad,
  checkOrdemPowerRequirements,
  getOrdemClassMilestoneSummary,
  OrdemRitualCastForm,
  AttackDamageRollPayload,
  ForcaOpressoraRollPayload,
  CursePricePrompt,
  CharacterPersonalProfile,
  getOrdemItemEffectiveSlots,
  RitualEffectRollPayload,
  DiceRollResult,
  isOrdemRitualAlreadyOwned,
  createKnownRitualsKeySet,
  SessionActivityCategory,
  SessionActivityLogEntry,
  CharacterLivePatch,
  resolveTempVitalMax,
  applyZeroHpRule,
  currentPvOf,
  dyingTurnsOf,
  deathAtOf,
  hasDyingCondition,
  hasApegoAngustiado,
  DYING_TURNS_TO_DIE,
  getDyingTurnsToDie,
} from '@totalrpg/shared';
import {
  FullCharacterResponse,
  TradeTargetCharacter,
  fetchCharacterById,
  updateCharacter,
  fetchCompendium,
  fetchCampaignTradeTargets,
  transferItemBetweenCharacters,
} from '../../services/api';
import { OrdemSheet } from './OrdemSheet';
import { TormentaSheet } from './TormentaSheet';
import { SheetExtras } from './SheetExtras';
import { FLASHBACK_GRANT, type FlashbackChoice } from './SahEspecialistaPowers';
import { PossessionControl, NexGeneralChoicePicker, type NexProgChoices } from './SahTrilhasPowers';
import { ImageUploadField } from '../ImageUploadField';
import { TempVitalBar } from '../TempVitalBar';
import { useTheme } from '../../theme/themeEngine';

import { Icon, stripEmoji } from '../ui/Icon';
import { DyingTracker } from '../ui/DyingTracker';
import { DeathModal } from '../ui/DeathModal';
import { ElementBadge, elementChoiceClasses } from '../ui/ElementBadge';
import { ContentSourceFilterBar, SourceTagBadge } from '../ui/ContentSourceFilterBar';

type OrdemTrailDef = (typeof ORDEM_TRAILS)[number];

/**
 * Antecipar Vitalidade (SaH, Morte): com cargas acumuladas, a ação de interlúdio dormir
 * não recupera PV e consome 1 carga (2 com Afinidade). Retorna null se não houver cargas.
 */
function getAnteciparVitalidadeSleep(
  abilities: CharacterAbility[]
): { abilityId: string; charges: number; next: number } | null {
  const ab = abilities.find(
    (a) => a.id.startsWith('sah-para-mort-antecipar-vitalidade') || /antecipar vitalidade/i.test(a.name)
  );
  const charges = Number(ab?.trackedCount || 0);
  if (!ab || charges <= 0) return null;
  const perSleep = ab.hasAffinityUpgrade || /\(afinidade\)/i.test(ab.name) ? 2 : 1;
  return { abilityId: ab.id, charges, next: Math.max(0, charges - perSleep) };
}

/**
 * Monta a habilidade de um poder de trilha. Se o personagem já tinha esse poder,
 * preserva o estado salvo nele (ex.: elemento do Monstruoso, toggles) em vez de recriá-lo do zero.
 */
function buildTrailAbility(
  trail: OrdemTrailDef,
  tp: OrdemTrailDef['powers'][number],
  previous?: CharacterAbility,
  trailLabel: string = trail.name
): CharacterAbility {
  const defaultActive = tp.cost === 0 || (tp.modifiers || []).length > 0;
  return {
    ...(previous || {}),
    id: `trail-${trail.id}-${tp.nex}`,
    name: `Trilha ${trailLabel} (${tp.nex}%): ${tp.name}`,
    category: 'classe',
    cost: tp.cost,
    description: tp.description,
    isActive: defaultActive || Boolean(previous?.isActive),
    modifiers: tp.modifiers || [],
  };
}

interface SheetContainerProps {
  characterId: string;
  currentUserId: string;
  onBack: () => void;
  onRollDice: (
    characterName: string,
    system: SystemId,
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isSecret?: boolean,
    isInitiativeRoll?: boolean,
    characterId?: string,
    fixedRolls?: number[],
    hasAfortunado?: boolean,
    attackDamagePayload?: AttackDamageRollPayload,
    forcaOpressoraPayload?: ForcaOpressoraRollPayload,
    batchMeta?: any,
    extraRollOpts?: {
      explodingDieSide?: number;
      extraDice?: Array<{ count: number; sides: number; label: string }>;
      cursePricePrompt?: CursePricePrompt;
      mapaCelestePayload?: DiceRollResult['mapaCelestePayload'];
    },
    hasAfortunadoAffinity?: boolean,
    ritualEffectPayload?: RitualEffectRollPayload
  ) => void;
  onRegisterSpendResource?: (fn: (amount: number) => boolean) => void;
  onCharacterSaved?: (characterId: string, campaignId?: string | null) => void;
  onBroadcastCharacterPatch?: (
    patch: Omit<CharacterLivePatch, 'campaignId' | 'patchTimestamp'> & { campaignId?: string }
  ) => void;
  onNotifyItemGiven?: (targetCharacterId: string, item: RPGItem, attack?: PreparedAttack) => void;
  onLogActivity?: (
    entry: Omit<SessionActivityLogEntry, 'id' | 'timestamp' | 'createdAt' | 'campaignId'> & {
      campaignId?: string;
    }
  ) => void;
  externalPermissions?: SheetPermissions | null;
  externalReloadSignal?: { characterId: string; timestamp: number } | null;
  initiativeRequestSignal?: number;
  /** Personagens chamados no último pedido (null = todos) */
  initiativeRequestTargets?: string[] | null;
  externalCombatState?: {
    combatants: any[];
    currentTurnIndex: number;
    roundNumber: number;
  } | null;
}

export function SheetContainer({
  characterId,
  currentUserId,
  onBack,
  onRollDice,
  onRegisterSpendResource,
  onCharacterSaved,
  onBroadcastCharacterPatch,
  onNotifyItemGiven,
  onLogActivity,
  externalPermissions,
  externalReloadSignal,
  initiativeRequestSignal,
  initiativeRequestTargets,
  externalCombatState,
}: SheetContainerProps) {
  const { setActiveSystem } = useTheme();
  const [character, setCharacter] = useState<FullCharacterResponse | null>(null);
  const [compendiumEntries, setCompendiumEntries] = useState<CompendiumEntryData[]>([]);
  const [customSkills, setCustomSkills] = useState<SystemSkillDefinition[]>([]);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [hoverToastMsg, setHoverToastMsg] = useState('');
  const [vislumbresResult, setVislumbresResult] = useState<{
    keptRoll: number;
    passed: boolean;
    peGranted?: number;
  } | null>(null);

  // Controle de Turno e Iniciativa em Tempo Real (Regra Geral de Turno: Limite de PE, Segurar o Gatilho e Combate Defensivo)
  const [liveCombatState, setLiveCombatState] = useState<{
    combatants: any[];
    currentTurnIndex: number;
    roundNumber: number;
  } | null>(null);
  const [peSpentThisTurn, setPeSpentThisTurn] = useState<number>(0);
  const [turnResetSignal, setTurnResetSignal] = useState<number>(0);
  const lastTurnKeyRef = useRef<string>('');
  const lastAutoOpenedInterludeIdRef = useRef<string | null>(null);
  const latestCharacterRef = useRef<FullCharacterResponse | null>(null);
  latestCharacterRef.current = character;
  const localMutationVersionRef = useRef<number>(0);
  const saveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSaveCountRef = useRef<number>(0);
  const pendingFollowUpSaveRef = useRef<boolean>(false);
  const isEditModeRef = useRef<boolean>(isEditMode);
  isEditModeRef.current = isEditMode;
  const latestSpendResourceRef = useRef<(amount: number) => boolean>(() => false);
  const latestOnLogActivityRef = useRef(onLogActivity);
  latestOnLogActivityRef.current = onLogActivity;
  const latestBroadcastPatchRef = useRef(onBroadcastCharacterPatch);
  latestBroadcastPatchRef.current = onBroadcastCharacterPatch;
  const recentRemotePatchAtRef = useRef<number>(0);

  function withNormalizedTempMaxes(
    prevChar: FullCharacterResponse,
    nextChar: FullCharacterResponse
  ): FullCharacterResponse {
    const prevRaw = (prevChar.sheetData || {}) as Record<string, any>;
    const nextRaw = (nextChar.sheetData || {}) as Record<string, any>;
    const prevTempHp = Number(prevRaw.tempHp || 0);
    const nextTempHp = Number(nextRaw.tempHp || 0);
    const prevTempPe = Number(prevRaw.tempPe || 0);
    const nextTempPe = Number(nextRaw.tempPe || 0);
    const nextTempHpMax = resolveTempVitalMax(prevTempHp, prevRaw.tempHpMax, nextTempHp);
    const nextTempPeMax = resolveTempVitalMax(prevTempPe, prevRaw.tempPeMax, nextTempPe);

    if (
      nextRaw.tempHpMax === nextTempHpMax &&
      nextRaw.tempPeMax === nextTempPeMax
    ) {
      return nextChar;
    }
    return {
      ...nextChar,
      sheetData: {
        ...nextRaw,
        tempHpMax: nextTempHpMax,
        tempPeMax: nextTempPeMax,
      },
    };
  }

  function emitLivePatchFromCharacter(charState: FullCharacterResponse) {
    if (!charState.campaignId) return;
    const raw = (charState.sheetData || {}) as Record<string, any>;
    latestBroadcastPatchRef.current?.({
      campaignId: charState.campaignId,
      characterId: charState.id,
      vitals: charState.vitals,
      tempHp: Number(raw.tempHp || 0),
      tempHpMax: Number(raw.tempHpMax || 0),
      tempPe: Number(raw.tempPe || 0),
      tempPeMax: Number(raw.tempPeMax || 0),
      conditions: Array.isArray(raw.conditions) ? raw.conditions : [],
      sceneEffects: Array.isArray(raw.sceneEffects) ? raw.sceneEffects : [],
      pendingInterlude: raw.pendingInterlude ?? null,
      inventory: charState.inventory,
      dyingTurns: dyingTurnsOf(raw),
      deathAt: deathAtOf(raw),
    });
  }

  /**
   * Regra dos 0 PV (Ordem, p. 311): caiu a 0 → morrendo + inconsciente;
   * curou para 1+ → sai inconsciente. Só na passagem, então o mestre pode retirar
   * uma condição (efeito que diz o contrário) sem ela voltar sozinha.
   */
  function withZeroHpRule(prevChar: FullCharacterResponse, nextChar: FullCharacterResponse): FullCharacterResponse {
    const prevPv = currentPvOf(prevChar.vitals);
    const nextPv = currentPvOf(nextChar.vitals);
    const nextRaw = (nextChar.sheetData || {}) as Record<string, any>;
    const skipUnconscious = hasApegoAngustiado(nextRaw.abilities);
    const { conditions, transition } = applyZeroHpRule(
      nextChar.system,
      prevPv,
      nextPv,
      nextRaw.conditions,
      { skipUnconscious }
    );
    if (!transition || conditions === nextRaw.conditions) return nextChar;
    if (transition === 'fell') {
      logSheetActivity({
        category: 'condition',
        summary: skipUnconscious
          ? 'Caiu a 0 PV: ficou morrendo (Apego Angustiado — permanece consciente)'
          : 'Caiu a 0 PV: ficou morrendo e inconsciente',
        tone: 'danger',
      });
    } else {
      logSheetActivity({
        category: 'condition',
        summary: 'Recuperou PV e deixou de estar inconsciente',
        tone: 'success',
      });
    }
    return { ...nextChar, sheetData: { ...nextRaw, conditions } as any };
  }

  function logSheetActivity(entry: {
    category: SessionActivityCategory;
    summary: string;
    details?: string;
    costText?: string;
    tone?: SessionActivityLogEntry['tone'];
  }) {
    const base = latestCharacterRef.current;
    if (!base?.campaignId) return;
    latestOnLogActivityRef.current?.({
      ...entry,
      campaignId: base.campaignId,
      characterId: base.id,
      characterName: base.name,
    });
  }

  useEffect(() => {
    if (character?.system) {
      setActiveSystem(character.system);
    }
  }, [character?.system, setActiveSystem]);

  useEffect(() => {
    if (onRegisterSpendResource) {
      onRegisterSpendResource((amt: number) => latestSpendResourceRef.current(amt));
    }
  }, [onRegisterSpendResource]);

  useEffect(() => {
    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, []);

  function scheduleGameModeSave(delayMs = 180) {
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    saveDebounceTimerRef.current = setTimeout(() => {
      saveDebounceTimerRef.current = null;
      if (latestCharacterRef.current) {
        handleSaveSheet(latestCharacterRef.current);
      }
    }, delayMs);
  }

  function applyLocalCharacterUpdate(
    updater: (base: FullCharacterResponse) => FullCharacterResponse,
    shouldAutoSave = !isEditModeRef.current
  ): FullCharacterResponse | null {
    const base = latestCharacterRef.current;
    if (!base) return null;
    const rawNext = updater(base);
    const normalized = withNormalizedTempMaxes(base, rawNext);
    // Em modo de edição (ajuste manual da ficha) a regra dos 0 PV não dispara.
    const nextChar = shouldAutoSave ? withZeroHpRule(base, normalized) : normalized;
    latestCharacterRef.current = nextChar;
    localMutationVersionRef.current += 1;
    setCharacter(nextChar);
    if (shouldAutoSave) {
      emitLivePatchFromCharacter(nextChar);
      scheduleGameModeSave();
    }
    return nextChar;
  }

  function showHoverToast(msg: string) {
    setHoverToastMsg(msg);
    setTimeout(() => {
      setHoverToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3500);
  }

  const [selectedConditionModal, setSelectedConditionModal] = useState<ActiveCondition | null>(null);
  // Aviso de morte já fechado nesta sessão (também guardado por dispositivo no localStorage)
  const [deathSeenAt, setDeathSeenAt] = useState<number | null>(null);
  const [showMasterConditionPicker, setShowMasterConditionPicker] = useState(false);
  const [showInitiativePrompt, setShowInitiativePrompt] = useState(false);
  const [isPortraitZoomOpen, setIsPortraitZoomOpen] = useState(false);

  // Estados do Modal de Passar Item para Aliado (Etapa 4E)
  const [itemToTradeModal, setItemToTradeModal] = useState<RPGItem | null>(null);
  const [tradeAllies, setTradeAllies] = useState<TradeTargetCharacter[]>([]);
  const [selectedAllyId, setSelectedAllyId] = useState('');
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [isTransferring, setIsTransferring] = useState(false);

  // Estados de Ordem Paranormal v1.3: Insanidade, Interlúdio e Evolução Guiada de NEX
  const [insanityEffectText, setInsanityEffectText] = useState<string | null>(null);
  const [isInterludeModalOpen, setIsInterludeModalOpen] = useState(false);
  const [interludeComfort, setInterludeComfort] = useState<0.5 | 1 | 2 | 3>(1);
  const [interludeSleep, setInterludeSleep] = useState(true);
  const [interludeRelax, setInterludeRelax] = useState(true);
  const [interludeDish, setInterludeDish] = useState<string>('');
  const [interludeSecondDish, setInterludeSecondDish] = useState<string>('');
  const [interludeExerciseCount, setInterludeExerciseCount] = useState<0 | 1 | 2>(0);
  const [interludeReadCount, setInterludeReadCount] = useState<0 | 1 | 2>(0);
  const [interludeMaintenance, setInterludeMaintenance] = useState(false);
  const [interludeMaintenanceMode, setInterludeMaintenanceMode] = useState<'repair' | 'ammo' | 'seal'>('repair');
  const [interludeMaintenanceItemId, setInterludeMaintenanceItemId] = useState<string>('');
  const [interludeMaintenanceAmmoKey, setInterludeMaintenanceAmmoKey] = useState<string>('balas_curtas');
  const [interludeMaintenanceSealRitualId, setInterludeMaintenanceSealRitualId] = useState<string>('');
  const [interludeReviewCase, setInterludeReviewCase] = useState(false);
  const [interludeReviewSkillId, setInterludeReviewSkillId] = useState<string>('investigacao');
  const [interludeParanormalDish, setInterludeParanormalDish] = useState(false);
  const [interludeParanormalElement, setInterludeParanormalElement] = useState<
    'Sangue' | 'Morte' | 'Conhecimento' | 'Energia'
  >('Sangue');
  const [interludeParanormalNewPart, setInterludeParanormalNewPart] = useState(true);

  const [isNexEvolutionOpen, setIsNexEvolutionOpen] = useState(false);
  const [evoSourceFilter, setEvoSourceFilter] = useState<string[]>([]);
  const [evoTrailBook, setEvoTrailBook] = useState<string>('ordem-base');
  const [evoTrailId, setEvoTrailId] = useState<string>('');
  const [evoMonstruosoElement, setEvoMonstruosoElement] = useState<string>('');
  const [evoNexProgChoices, setEvoNexProgChoices] = useState<NexProgChoices>({});
  const [evoChoiceMode, setEvoChoiceMode] = useState<'class_power' | 'transcend' | 'versatility'>('class_power');
  const [evoSelectedPowerId, setEvoSelectedPowerId] = useState<string>('');
  const [evoSkillTrainingPowerIds, setEvoSkillTrainingPowerIds] = useState<string[]>([]);
  const [evoPowerSearch, setEvoPowerSearch] = useState<string>('');
  // Dentro de "Poder de classe": poderes da classe ou gerais (SaH p. 33, ocupam a mesma escolha)
  const [evoPowerGroup, setEvoPowerGroup] = useState<'class' | 'general'>('class');
  const [evoPowerElementFilter, setEvoPowerElementFilter] = useState<string>('ALL');
  const [evoAttrKey, setEvoAttrKey] = useState<'agi' | 'for' | 'int' | 'pre' | 'vig'>('agi');
  const [evoAffinity, setEvoAffinity] = useState<string>('Sangue');
  const [evoUpgradeSkills, setEvoUpgradeSkills] = useState<string[]>([]);
  const [evoNewRitualId, setEvoNewRitualId] = useState<string>('');
  const [evoRitualSearch, setEvoRitualSearch] = useState<string>('');
  const [evoRitualElementFilter, setEvoRitualElementFilter] = useState<string>('ALL');
  const [evoRitualCircleFilter, setEvoRitualCircleFilter] = useState<number | 'ALL'>('ALL');
  const [evoShowAmaldicoarPrompt, setEvoShowAmaldicoarPrompt] = useState<boolean>(false);
  const [evoExtraPowerRitualId, setEvoExtraPowerRitualId] = useState<string>('');
  const [evoExpansaoPowerId, setEvoExpansaoPowerId] = useState<string>('');
  const [ritualCastSummaryModal, setRitualCastSummaryModal] = useState<{
    ritualName: string;
    formLabel: string;
    peSpent: number;
    pvSpent?: number;
    dt: number;
    ocultismoRolls: number[];
    ocultismoMod: number;
    ocultismoTotal: number;
    passed: boolean;
    failedByFiveOrMore: boolean;
    sanLost: number;
    permSanLost: number;
    isMedoRitual?: boolean;
    effectAppliedText?: string;
    damageFormulaToRoll?: string;
    healingFormulaToRoll?: string;
  } | null>(null);

  useEffect(() => {
    if (
      initiativeRequestSignal &&
      character &&
      character.ownerId === currentUserId &&
      (!initiativeRequestTargets || initiativeRequestTargets.includes(character.id))
    ) {
      setShowInitiativePrompt(true);
    }
  }, [initiativeRequestSignal]);

  useEffect(() => {
    function handleRitualTempHpRoll(ev: Event) {
      const customEv = ev as CustomEvent<DiceRollResult>;
      const newRoll = customEv.detail;
      const baseChar = latestCharacterRef.current;
      if (!baseChar || !newRoll || newRoll.characterId !== baseChar.id) return;

      const labelMatch = newRoll.label.match(/^🛡️ Vida Temporária:\s*(.+?)\s*\[([^\]]+)\]/);
      const ritualName = labelMatch ? labelMatch[1].trim() : 'Ritual';
      const formLabel = labelMatch ? labelMatch[2].trim() : 'Normal';
      const baseRaw = (baseChar.sheetData || {}) as Record<string, any>;
      const prevEffects: SceneEffect[] = Array.isArray(baseRaw.sceneEffects)
        ? baseRaw.sceneEffects
        : [];
      const rollTag = `ritual-temp-${newRoll.id}`;
      const existingSameRoll = prevEffects.find((e) => e.sourceAbilityId === rollTag);
      const existingSameRitual = prevEffects.find(
        (e) =>
          e.name.trim().toLowerCase() === ritualName.toLowerCase() &&
          typeof e.tempHpGranted === 'number'
      );
      const oldGranted =
        existingSameRoll?.tempHpGranted ?? existingSameRitual?.tempHpGranted ?? 0;

      const nextTempHp = Math.max(0, Number(baseRaw.tempHp || 0) - oldGranted) + Math.max(0, newRoll.total);
      const filteredEffects = prevEffects.filter(
        (e) =>
          e.sourceAbilityId !== rollTag &&
          !(
            e.name.trim().toLowerCase() === ritualName.toLowerCase() &&
            typeof e.tempHpGranted === 'number'
          )
      );
      const newEffect: SceneEffect = {
        id: existingSameRoll?.id || `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: ritualName,
        source: `${formLabel} (${newRoll.formula})`,
        sourceAbilityId: rollTag,
        description: `+${newRoll.total} PV Temporários até o fim da cena (Rolagem: [${newRoll.rolls.join(', ')}])`,
        tempHpGranted: newRoll.total,
      };
      const nextChar = withNormalizedTempMaxes(baseChar, {
        ...baseChar,
        sheetData: {
          ...baseRaw,
          tempHp: nextTempHp,
          sceneEffects: [...filteredEffects, newEffect],
        },
      });
      latestCharacterRef.current = nextChar;
      setCharacter(nextChar);
      emitLivePatchFromCharacter(nextChar);
      handleSaveSheet(nextChar);
      showHoverToast(
        `${ritualName}: +${newRoll.total} PV Temporários aplicados na ficha!`
      );
    }

    window.addEventListener('totalrpg:ritual-temp-hp', handleRitualTempHpRoll);
    return () => {
      window.removeEventListener('totalrpg:ritual-temp-hp', handleRitualTempHpRoll);
    };
  }, []);

  useEffect(() => {
    async function loadSheetAndCompendium() {
      setIsLoading(true);
      try {
        const charData = await fetchCharacterById(characterId);

        const raw = (charData.sheetData || {}) as Record<string, any>;
        if (Array.isArray(raw.abilities)) {
          raw.abilities = raw.abilities.map((ab: CharacterAbility) => {
            if (ab.name.includes('Sangue de Ferro')) {
              const hasAff = Boolean(
                ab.hasAffinityUpgrade || ab.name.toLowerCase().includes('afinidade')
              );
              return {
                ...ab,
                cost: 0,
                modifiers: [
                  { id: 'm2', targetType: 'vital_max', targetKey: 'pv', value: 2, scaleWithLevel: true },
                  ...(hasAff
                    ? [{ id: 'm-sf-fort-af', targetType: 'skill_bonus' as const, targetKey: 'fortitude', value: 5 }]
                    : []),
                ],
              };
            }
            if (ab.name.trim().toLowerCase() === 'ataque especial') {
              return {
                ...ab,
                modifiers: [],
                isActive: false,
              };
            }
            if (
              ab.id === 'trail-tropa_choque-99' ||
              ab.name.toLowerCase().includes('inquebrável') ||
              ab.name.toLowerCase().includes('inquebravel')
            ) {
              return {
                ...ab,
                modifiers: [],
              };
            }
            // Sincroniza poderes de Trilha / Versatilidade já existentes com ORDEM_TRAILS
            if (ab.id.startsWith('trail-') || ab.id.startsWith('versatility-')) {
              const prefix = ab.id.startsWith('trail-') ? 'trail-' : 'versatility-';
              const rest = ab.id.slice(prefix.length);
              const lastDash = rest.lastIndexOf('-');
              if (lastDash > 0) {
                const tId = rest.slice(0, lastDash);
                const tNex = Number(rest.slice(lastDash + 1));
                const trailDef = ORDEM_TRAILS.find((t) => t.id === tId);
                const tpDef = trailDef?.powers.find((p) => p.nex === tNex);
                if (tpDef) {
                  return {
                    ...ab,
                    cost: tpDef.cost,
                    description: tpDef.description,
                    // Mantém o +2 do "treina ou +2" (poder já treinado) concedido ao pegar o poder
                    modifiers: [
                      ...(tpDef.modifiers || []),
                      ...(ab.modifiers || []).filter((m) => m.id.startsWith('gen-train-bonus-')),
                    ],
                  };
                }
              }
            }
            // Poderes reclassificados como gerais (SaH): atualiza o nome antigo
            const renamedTo = ORDEM_RENAMED_POWERS[ab.name.trim()];
            if (renamedTo) ab = { ...ab, name: renamedTo };
            // Sincroniza habilidades iniciais de Especialista (Eclético e Perito) já existentes
            const lowerAbName = ab.name.trim().toLowerCase();
            if (lowerAbName === 'eclético' || lowerAbName === 'ecletico' || lowerAbName === 'perito') {
              return {
                ...ab,
                cost: 0,
                isActive: true,
              };
            }
            // Sincroniza poderes de Combatente e Especialista já existentes com as novas regras automáticas do motor
            const officialClassPower = ORDEM_COMPENDIUM_ENTRIES.find(
              (ce) =>
                (ce.id.startsWith('ord-pwr-comb-') ||
                  ce.id.startsWith('sah-pwr-comb-') ||
                  ce.id.startsWith('ord-pwr-esp-') ||
                  ce.id.startsWith('sah-pwr-esp-') ||
                  ce.id.startsWith('sah-pwr-ocu-')) &&
                ce.name.toLowerCase() === lowerAbName
            );
            if (officialClassPower) {
              return {
                ...ab,
                sourceId: officialClassPower.metadata?.sourceId || ab.sourceId,
                cost: officialClassPower.cost,
                modifiers: officialClassPower.modifiers || [],
              };
            }
            // Sincroniza poderes de Origem de fichas já criadas com as definições oficiais v1.3 e suplementos
            if (ab.id.startsWith('orig-')) {
              const origId = ab.id.replace('orig-', '');
              const origDef = ORDEM_ORIGINS.find((o) => o.id === origId);
              if (origDef) {
                const dynamicMods = buildOrdemOriginModifiers(origDef, raw.originMeta);
                const keepToggle = origId === 'colegial' || origId === 'cosplayer';
                const isPassive =
                  origDef.powerCost === 0 && !origDef.requiresManualActivation;
                return {
                  ...ab,
                  name: `${origDef.powerName} (Poder de ${origDef.name})`,
                  sourceId: origDef.sourceId || ab.sourceId,
                  cost: origDef.powerCost,
                  modifiers: dynamicMods,
                  isActive: keepToggle
                    ? origId === 'colegial' && Boolean(raw.originMeta?.bestFriendDead)
                      ? true
                      : Boolean(ab.isActive)
                    : origDef.powerCost > 0 || origDef.requiresManualActivation
                    ? false
                    : isPassive,
                };
              }
            }
            return ab;
          });
        }

        latestCharacterRef.current = charData;
        localMutationVersionRef.current = 0;
        setCharacter(charData);
        if ((charData.campaign as any)?.combatState) {
          setLiveCombatState((charData.campaign as any).combatState);
        } else {
          setLiveCombatState(null);
        }

        const compData = (await fetchCompendium(charData.system)) as any;
        const syncedEntries = ((compData.entries || []) as CompendiumEntryData[])
          .filter((entry) => {
            const lower = entry.name.trim().toLowerCase();
            return (
              lower !== 'ataque especial (combatente)' &&
              lower !== 'resistir a <elemento> (poder paranormal)'
            );
          })
          .map((entry) => {
            const officialClassEntry = ORDEM_COMPENDIUM_ENTRIES.find(
              (ce) =>
                (ce.id.startsWith('ord-pwr-comb-') ||
                  ce.id.startsWith('sah-pwr-comb-') ||
                  ce.id.startsWith('ord-pwr-esp-') ||
                  ce.id.startsWith('sah-pwr-esp-') ||
                  ce.id.startsWith('sah-pwr-ocu-')) &&
                ce.name.toLowerCase() === entry.name.toLowerCase()
            );
            return officialClassEntry
              ? {
                  ...entry,
                  cost: officialClassEntry.cost,
                  modifiers: officialClassEntry.modifiers,
                  metadata: officialClassEntry.metadata,
                }
              : entry;
          });
        setCompendiumEntries(syncedEntries);
        setCustomSkills(compData.skills || []);
        setViewerIsAdmin(Boolean(compData.isAdmin));
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadSheetAndCompendium();
  }, [characterId]);

  useEffect(() => {
    if (externalCombatState !== undefined) {
      setLiveCombatState(externalCombatState);
    }
  }, [externalCombatState]);

  useEffect(() => {
    if (!externalPermissions) return;
    setCharacter((prev) => {
      if (!prev || !prev.campaign) return prev;
      return {
        ...prev,
        campaign: {
          ...prev.campaign,
          ...externalPermissions,
        },
      };
    });
    if (externalPermissions.lockAllSheets) {
      setIsEditMode(false);
    }
  }, [externalPermissions]);

  useEffect(() => {
    function applyRemotePatch(patch: CharacterLivePatch) {
      if (!patch || patch.characterId !== characterId) return;
      recentRemotePatchAtRef.current = Date.now();
      setCharacter((prev) => {
        if (!prev) return prev;
        const prevRaw = (prev.sheetData || {}) as Record<string, any>;
        const nextRaw: Record<string, any> = { ...prevRaw };
        if (patch.tempHp !== undefined) nextRaw.tempHp = patch.tempHp;
        if (patch.tempHpMax !== undefined) nextRaw.tempHpMax = patch.tempHpMax;
        if (patch.tempPe !== undefined) nextRaw.tempPe = patch.tempPe;
        if (patch.tempPeMax !== undefined) nextRaw.tempPeMax = patch.tempPeMax;
        if (patch.conditions !== undefined) nextRaw.conditions = patch.conditions;
        if (patch.sceneEffects !== undefined) nextRaw.sceneEffects = patch.sceneEffects;
        if (patch.pendingInterlude !== undefined) nextRaw.pendingInterlude = patch.pendingInterlude;
        if (patch.dyingTurns !== undefined) nextRaw.dyingTurns = patch.dyingTurns;
        if (patch.deathAt !== undefined) nextRaw.deathAt = patch.deathAt;

        const updated: FullCharacterResponse = {
          ...prev,
          vitals: patch.vitals ?? prev.vitals,
          inventory: patch.inventory ?? prev.inventory,
          sheetData: nextRaw as any,
        };
        latestCharacterRef.current = updated;
        return updated;
      });
    }

    function onSinglePatch(ev: Event) {
      applyRemotePatch((ev as CustomEvent<CharacterLivePatch>).detail);
    }

    function onBatchPatch(ev: Event) {
      const payload = (
        ev as CustomEvent<{ campaignId: string; patches: CharacterLivePatch[] }>
      ).detail;
      if (!payload || !Array.isArray(payload.patches)) return;
      for (const p of payload.patches) {
        if (p.characterId === characterId) {
          applyRemotePatch(p);
        }
      }
    }

    window.addEventListener('totalrpg:character-patched', onSinglePatch);
    window.addEventListener('totalrpg:characters-batch-patched', onBatchPatch);
    return () => {
      window.removeEventListener('totalrpg:character-patched', onSinglePatch);
      window.removeEventListener('totalrpg:characters-batch-patched', onBatchPatch);
    };
  }, [characterId]);

  useEffect(() => {
    if (
      externalReloadSignal &&
      (externalReloadSignal.characterId === characterId ||
        externalReloadSignal.characterId === 'ALL')
    ) {
      if (Date.now() - recentRemotePatchAtRef.current < 2200) {
        return;
      }
      if (saveDebounceTimerRef.current || inFlightSaveCountRef.current > 0) {
        return;
      }
      const versionBeforeFetch = localMutationVersionRef.current;
      fetchCharacterById(characterId)
        .then((freshData) => {
          if (
            localMutationVersionRef.current !== versionBeforeFetch ||
            saveDebounceTimerRef.current ||
            inFlightSaveCountRef.current > 0
          ) {
            return;
          }
          latestCharacterRef.current = freshData;
          setCharacter(freshData);
          if ((freshData.campaign as any)?.combatState !== undefined) {
            setLiveCombatState((freshData.campaign as any).combatState);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [externalReloadSignal, characterId]);

  useEffect(() => {
    if (!character || character.system !== 'ordem-paranormal') return;
    const pending = (character.sheetData as OrdemSheetData | undefined)?.pendingInterlude;
    if (pending && pending.id) {
      setInterludeComfort(pending.comfort);
      if (lastAutoOpenedInterludeIdRef.current !== pending.id) {
        lastAutoOpenedInterludeIdRef.current = pending.id;
        handleOpenInterludeModal(pending.comfort);
      }
    } else {
      lastAutoOpenedInterludeIdRef.current = null;
      setIsInterludeModalOpen(false);
    }
  }, [(character?.sheetData as OrdemSheetData | undefined)?.pendingInterlude?.id]);

  // Regra Geral de Turno na Iniciativa: Quando chega o turno deste personagem novamente na ordem de iniciativa,
  // reseta automaticamente os PE gastos no turno, o Segurar o Gatilho e desativa o Combate Defensivo ("até o seu próximo turno").
  useEffect(() => {
    if (!character || !character.campaignId) {
      lastTurnKeyRef.current = '';
      setPeSpentThisTurn(0);
      return;
    }
    const cList = liveCombatState?.combatants;
    if (!Array.isArray(cList) || cList.length === 0) {
      lastTurnKeyRef.current = '';
      setPeSpentThisTurn(0);
      return;
    }
    const activeComb = cList[liveCombatState!.currentTurnIndex ?? 0];
    if (!activeComb) return;

    const isMyTurn =
      activeComb.characterId === character.id ||
      (activeComb.name &&
        activeComb.name.trim().toLowerCase() === character.name.trim().toLowerCase());

    if (isMyTurn) {
      const turnKey = `${liveCombatState!.roundNumber ?? 1}-${liveCombatState!.currentTurnIndex ?? 0}-${character.id}`;
      if (lastTurnKeyRef.current !== turnKey) {
        const hadPreviousTurn = lastTurnKeyRef.current !== '';
        lastTurnKeyRef.current = turnKey;
        setPeSpentThisTurn(0);
        setTurnResetSignal((s) => s + 1);

        // Se Combate Defensivo ou Combater com Duas Armas estavam ativos do turno anterior, desativa no início do novo turno!
        const currRaw = (character.sheetData || {}) as Record<string, any>;
        const currAbs: CharacterAbility[] = Array.isArray(currRaw.abilities)
          ? currRaw.abilities
          : [];
        let postureReset = false;
        const nextAbs = currAbs.map((ab) => {
          const isTurnPosture =
            ab.id === 'ord-pwr-comb-defensivo' ||
            ab.id === 'ord-pwr-comb-duas-armas' ||
            ab.name.toLowerCase().includes('combate defensivo') ||
            ab.name.toLowerCase().includes('combater com duas armas');
          if (isTurnPosture && ab.isActive !== false) {
            postureReset = true;
            return { ...ab, isActive: false };
          }
          return ab;
        });

        if (postureReset) {
          const updatedChar: FullCharacterResponse = {
            ...character,
            sheetData: { ...currRaw, abilities: nextAbs },
          };
          setCharacter(updatedChar);
          updateCharacter(updatedChar.id, {
            name: updatedChar.name,
            portraitUrl: updatedChar.portraitUrl,
            vitals: updatedChar.vitals,
            sheetData: updatedChar.sheetData,
            inventory: updatedChar.inventory,
            attacks: updatedChar.attacks,
          }).catch(() => {});
        }

        if (hadPreviousTurn) {
          showHoverToast(
            `Seu turno chegou (Rodada ${liveCombatState!.roundNumber ?? 1})! Limite de PE/turno${
              postureReset ? ' e Combate Defensivo' : ''
            } reiniciados.`
          );
        }
      }
    }
  }, [liveCombatState, character?.id, character?.campaignId]);

  // Listeners globais para efeitos disparados a partir do Modal de Dados (Preço da Maldição e Sanguinária)
  useEffect(() => {
    function handleCurseSanEvent(e: Event) {
      const detail = (e as CustomEvent<{
        characterId?: string;
        amount: number;
        element: string;
        label?: string;
      }>).detail;
      const base = latestCharacterRef.current;
      if (!base || !detail || detail.amount <= 0) return;
      if (detail.characterId && detail.characterId !== base.id) return;
      applyLocalCharacterUpdate(
        (cur) => ({
          ...cur,
          vitals: cur.vitals.map((v) =>
            v.id === 'san' ? { ...v, current: Math.max(0, v.current - detail.amount) } : v
          ),
        }),
        true
      );
      showHoverToast(
        `O Preço da Maldição (${detail.element}): -${detail.amount} SAN descontados.`
      );
      logSheetActivity({
        category: 'vital',
        summary: `O Preço da Maldição (${detail.element}): perdeu ${detail.amount} SAN`,
        costText: `-${detail.amount} SAN`,
        tone: 'purple',
      });
    }

    function handleTempHpEvent(e: Event) {
      const detail = (e as CustomEvent<{
        characterId?: string;
        amount: number;
        label?: string;
      }>).detail;
      const base = latestCharacterRef.current;
      if (!base || !detail || detail.amount <= 0) return;
      if (detail.characterId && detail.characterId !== base.id) return;
      const updated = applyLocalCharacterUpdate((cur) => {
        const prevRaw = (cur.sheetData || {}) as Record<string, any>;
        const nextTempHp = Math.max(Number(prevRaw.tempHp || 0), detail.amount);
        return {
          ...cur,
          sheetData: { ...prevRaw, tempHp: nextTempHp },
        };
      }, true);
      const nextTempHp = Number((updated?.sheetData as any)?.tempHp || detail.amount);
      showHoverToast(
        `${detail.label || 'PV Temporários'}: ${nextTempHp} PV temporários ativos na ficha!`
      );
    }

    window.addEventListener('totalrpg:curse-san-loss', handleCurseSanEvent);
    window.addEventListener('totalrpg:grant-temp-hp', handleTempHpEvent);
    return () => {
      window.removeEventListener('totalrpg:curse-san-loss', handleCurseSanEvent);
      window.removeEventListener('totalrpg:grant-temp-hp', handleTempHpEvent);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
        Carregando pergaminhos da ficha...
      </div>
    );
  }

  if (!character) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-red-400">
        Ficha não encontrada.
      </div>
    );
  }

  const campaign = character.campaign;
  const campaignAllowedSources = (campaign as any)?.allowedSources as
    | string[]
    | null
    | undefined;
  const isDM = campaign ? campaign.dmId === currentUserId : false;
  const isFreeVault = !campaign;
  const canMasterControl = isDM || viewerIsAdmin;

  const isLockedByMaster = !isFreeVault && !isDM && Boolean(campaign?.lockAllSheets);
  const canEditVitals = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditVitals));
  const canEditAttributes = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditAttributes));
  const canEditAbilities = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditAbilities));
  const canEditInventory = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditInventory));
  const canTrade = Boolean(campaign) && (isDM || (!isLockedByMaster && Boolean(campaign?.allowTrade)));

  const rawSheet = (character.sheetData || {}) as Record<string, any>;
  const characterAbilities: CharacterAbility[] = Array.isArray(rawSheet.abilities)
    ? rawSheet.abilities
    : [];
  const activeConditions: ActiveCondition[] = Array.isArray(rawSheet.conditions)
    ? rawSheet.conditions
    : [];
  const activeSceneEffects: SceneEffect[] = Array.isArray(rawSheet.sceneEffects)
    ? rawSheet.sceneEffects
    : [];

  // Morrendo (Ordem, p. 311): marcas aparecem em combate (ou se já houver turnos contados na cena)
  const deathAt = character.system === 'ordem-paranormal' ? deathAtOf(rawSheet) : null;
  const dyingTurns = dyingTurnsOf(rawSheet);
  const isInCombat = Boolean(liveCombatState?.combatants?.some((c: any) => c.characterId === character.id));
  const showDyingTracker =
    character.system === 'ordem-paranormal' &&
    (Boolean(deathAt) || (hasDyingCondition(activeConditions) && (isInCombat || dyingTurns > 0)));
  const deathSeenKey = `totalrpg_death_seen_${character.id}`;
  const showDeathModal =
    Boolean(deathAt) && deathAt !== deathSeenAt && localStorage.getItem(deathSeenKey) !== String(deathAt);
  function closeDeathModal() {
    if (!deathAt) return;
    localStorage.setItem(deathSeenKey, String(deathAt));
    setDeathSeenAt(deathAt);
  }
  const tempHp = Number(rawSheet.tempHp || 0);
  const tempPe = Number(rawSheet.tempPe || 0);

  const levelOrNex =
    character.system === 'ordem-paranormal'
      ? Number(rawSheet.nex ?? 5)
      : Number(rawSheet.level ?? 1);

  const bonuses = calculateActiveBonuses(
    character.system,
    levelOrNex,
    characterAbilities,
    character.inventory || [],
    activeConditions,
    activeSceneEffects,
    character.system === 'ordem-paranormal' ? (rawSheet as Partial<OrdemSheetData>) : undefined
  );
  // Possuído (SaH): Pontos de Possessão
  const possessionInfo = getPossessionInfo(
    character.system === 'ordem-paranormal' ? (rawSheet as any) : null,
    Number(rawSheet.attributes?.pre ?? 0) + (bonuses.attributes['pre'] || 0)
  );

  // Sangue Fervente (Poder Paranormal de Sangue): +1 (+2 com Afinidade) em FOR ou AGI enquanto Machucado
  if (character.system === 'ordem-paranormal') {
    const pvBarEarly = character.vitals.find((v) => v.id === 'pv');
    const pvMaxEarly = pvBarEarly
      ? Math.max(1, pvBarEarly.max + (bonuses.vitalMax['pv'] || 0))
      : 1;
    const isMachucadoEarly = pvBarEarly
      ? pvBarEarly.current <= Math.floor(pvMaxEarly / 2)
      : false;
    if (isMachucadoEarly) {
      const sangueFerventeAb = characterAbilities.find(
        (ab) =>
          ab.isActive !== false &&
          (ab.id === 'ord-para-sang-sangue-fervente' ||
            ab.name.toLowerCase().includes('sangue fervente'))
      );
      if (sangueFerventeAb) {
        const isAff = Boolean(
          sangueFerventeAb.hasAffinityUpgrade ||
            sangueFerventeAb.name.toLowerCase().includes('afinidade')
        );
        const targetAttr = rawSheet.sangueFerventeAttr === 'agi' ? 'agi' : 'for';
        bonuses.attributes[targetAttr] =
          (bonuses.attributes[targetAttr] || 0) + (isAff ? 2 : 1);
      }
    }
  }

  const hasAfortunado = characterAbilities.some(
    (ab) =>
      ab.isActive !== false &&
      (ab.id.toLowerCase().includes('afortunado') ||
        ab.name.toLowerCase().includes('afortunado'))
  );
  const hasAfortunadoAffinity = characterAbilities.some(
    (ab) =>
      ab.isActive !== false &&
      (ab.id.toLowerCase().includes('afortunado') ||
        ab.name.toLowerCase().includes('afortunado')) &&
      (ab.hasAffinityUpgrade || ab.name.toLowerCase().includes('afinidade'))
  );

  const hasActiveInitiativeOrder = Boolean(
    character.campaignId &&
      liveCombatState &&
      Array.isArray(liveCombatState.combatants) &&
      liveCombatState.combatants.length > 0
  );
  const activeCombatantInOrder = hasActiveInitiativeOrder
    ? liveCombatState!.combatants[liveCombatState!.currentTurnIndex ?? 0]
    : null;
  const isMyTurnInCombat = Boolean(
    hasActiveInitiativeOrder &&
      activeCombatantInOrder &&
      (activeCombatantInOrder.characterId === character.id ||
        (activeCombatantInOrder.name &&
          activeCombatantInOrder.name.trim().toLowerCase() ===
            character.name.trim().toLowerCase()))
  );
  const currentRoundNumber = hasActiveInitiativeOrder
    ? liveCombatState!.roundNumber ?? 1
    : 1;

  function triggerCharacterRoll(
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isSecret?: boolean,
    isInitiativeRoll?: boolean,
    fixedRolls?: number[],
    attackDamagePayload?: AttackDamageRollPayload,
    forcaOpressoraPayload?: ForcaOpressoraRollPayload,
    extraRollOpts?: {
      explodingDieSide?: number;
      extraDice?: Array<{ count: number; sides: number; label: string }>;
      cursePricePrompt?: CursePricePrompt;
      mapaCelestePayload?: DiceRollResult['mapaCelestePayload'];
    },
    ritualEffectPayload?: RitualEffectRollPayload
  ) {
    if (!character) return;
    onRollDice(
      character.name,
      character.system,
      label,
      count,
      sides,
      modifier,
      isSecret,
      isInitiativeRoll,
      character.id,
      fixedRolls,
      hasAfortunado,
      attackDamagePayload,
      forcaOpressoraPayload,
      undefined,
      extraRollOpts,
      hasAfortunadoAffinity,
      ritualEffectPayload
    );
  }

  function handleLoseSanity(amount: number, reason: string) {
    if (!latestCharacterRef.current || amount <= 0) return;
    applyLocalCharacterUpdate((base) => ({
      ...base,
      vitals: base.vitals.map((v) =>
        v.id === 'san' ? { ...v, current: Math.max(0, v.current - amount) } : v
      ),
    }));
    showHoverToast(`${reason}: -${amount} SAN descontados.`);
  }

  function handleLosePermanentSanity(amount: number, reason: string) {
    if (!latestCharacterRef.current || amount <= 0) return;
    applyLocalCharacterUpdate((base) => ({
      ...base,
      vitals: base.vitals.map((v) => {
        if (v.id !== 'san') return v;
        const nextMax = Math.max(1, v.max - amount);
        return {
          ...v,
          max: nextMax,
          current: Math.max(0, Math.min(nextMax, v.current - amount)),
        };
      }),
    }));
    logSheetActivity({
      category: 'vital',
      summary: `${reason}: -${amount} de Sanidade Máxima Permanente`,
      costText: `-${amount} SAN Máx`,
      tone: 'danger',
    });
    showHoverToast(`${reason}: -${amount} SAN Máxima Permanente.`);
  }

  function handleUpdateOriginMeta(patch: Partial<OrdemOriginMeta>) {
    applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      const nextMeta: OrdemOriginMeta = {
        ...(baseRaw.originMeta || {}),
        ...patch,
      };
      const normOrig = String(baseRaw.origin || '').trim().toLowerCase();
      const origDef = ORDEM_ORIGINS.find(
        (o) => o.id === normOrig || o.name.toLowerCase() === normOrig
      );
      const prevAbs: CharacterAbility[] = Array.isArray(baseRaw.abilities)
        ? baseRaw.abilities
        : [];
      const fbDef = nextMeta.flashbackOriginId
        ? ORDEM_ORIGINS.find((o) => o.id === nextMeta.flashbackOriginId)
        : undefined;
      const nextAbs = origDef || fbDef
        ? prevAbs.map((ab) => {
            const def =
              origDef && ab.id === `orig-${origDef.id}`
                ? origDef
                : fbDef && ab.id === `orig-${fbDef.id}`
                ? fbDef
                : undefined;
            if (!def) return ab;
            const rebuiltMods = buildOrdemOriginModifiers(def, nextMeta);
            return {
              ...ab,
              modifiers: rebuiltMods,
              isActive:
                def.id === 'colegial' && nextMeta.bestFriendDead
                  ? true
                  : ab.isActive,
            };
          })
        : prevAbs;
      return {
        ...base,
        sheetData: {
          ...baseRaw,
          originMeta: nextMeta,
          abilities: nextAbs,
        },
      };
    });
  }

  /**
   * Flashback (Especialista, SaH): recebe o poder de uma segunda origem.
   * Troca o poder anterior do Flashback (e o invento, se era Inventor Paranormal).
   */
  function handleApplyFlashback(choice: FlashbackChoice | null) {
    applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      const prevMeta: OrdemOriginMeta = baseRaw.originMeta || {};
      const prevAbs: CharacterAbility[] = Array.isArray(baseRaw.abilities) ? baseRaw.abilities : [];
      const prevInv: RPGItem[] = Array.isArray(base.inventory) ? (base.inventory as RPGItem[]) : [];
      const prevFb = prevMeta.flashbackOriginId;
      const nextMeta: OrdemOriginMeta = { ...prevMeta, ...(choice?.meta || {}) };
      if (choice) nextMeta.flashbackOriginId = choice.originId;
      else delete nextMeta.flashbackOriginId;

      let nextAbs = prevAbs.filter((ab) => ab.grantedBy !== FLASHBACK_GRANT);
      let nextInv = prevInv;
      // O invento antigo do Flashback sai junto (o da origem principal fica)
      const mainNorm = String(baseRaw.origin || '').trim().toLowerCase();
      const mainIsInventor = mainNorm === 'inventor_paranormal' || mainNorm === 'inventor paranormal';
      if (prevFb === 'inventor_paranormal' && !mainIsInventor) {
        nextInv = nextInv.filter((it) => !it.isParanormalInvention);
      }

      const def = choice ? ORDEM_ORIGINS.find((o) => o.id === choice.originId) : undefined;
      if (def) {
        nextAbs = [...nextAbs, buildOrdemOriginAbility(def, nextMeta, FLASHBACK_GRANT)];
        if (def.grantsParanormalInvention && !nextInv.some((it) => it.isParanormalInvention)) {
          const invento = buildParanormalInventionItem(choice?.inventorRitualId);
          if (invento) nextInv = [...nextInv, { ...invento, id: `item-invento-flashback-${Date.now()}` }];
        }
      }

      return {
        ...base,
        inventory: nextInv as any,
        sheetData: { ...baseRaw, originMeta: nextMeta, abilities: nextAbs },
      };
    });
    if (choice) {
      const def = ORDEM_ORIGINS.find((o) => o.id === choice.originId);
      logSheetActivity({
        category: 'ability',
        summary: `Flashback: recebeu ${def?.powerName || 'poder'} (Poder de ${def?.name || choice.originId})`,
        tone: 'purple',
      });
    }
  }

  /** Possuído (SaH): gasta PP — cada um recupera 10 PV ou 2 PE. */
  function handleSpendPossession(ppToPv: number, ppToPe: number) {
    const total = ppToPv + ppToPe;
    if (total <= 0) return;
    applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      const nextVitals = base.vitals.map((bar) => {
        const effMax = bar.max + (bonuses.vitalMax[bar.id] || 0);
        if (bar.id === 'pv' && ppToPv > 0) return { ...bar, current: Math.min(effMax, bar.current + ppToPv * 10) };
        if (bar.id === 'pe' && ppToPe > 0) return { ...bar, current: Math.min(effMax, bar.current + ppToPe * 2) };
        return bar;
      });
      return {
        ...base,
        vitals: nextVitals,
        sheetData: { ...baseRaw, possessionPoints: Math.max(0, possessionInfo.current - total) },
      };
    });
    logSheetActivity({
      category: 'ability',
      summary: `Gastou ${total} Ponto${total > 1 ? 's' : ''} de Possessão`,
      details: [ppToPv ? `+${ppToPv * 10} PV` : '', ppToPe ? `+${ppToPe * 2} PE` : ''].filter(Boolean).join(' • '),
      tone: 'purple',
    });
  }

  function handleHealPv(amount: number, label?: string) {
    if (!latestCharacterRef.current || amount <= 0) return;
    const isSangueVivo = (label || '').toLowerCase().includes('sangue vivo');
    let actualHealed = 0;
    let resultingCurrent = 0;
    let effectiveMaxForToast = 1;
    let blockedCapMessage: string | null = null;

    applyLocalCharacterUpdate((base) => {
      const pvBar = base.vitals.find((b) => b.id === 'pv');
      if (!pvBar) return base;
      const effectiveMax = Math.max(1, pvBar.max + (bonuses.vitalMax['pv'] || 0));
      effectiveMaxForToast = effectiveMax;
      const healingCap = isSangueVivo ? Math.floor(effectiveMax / 2) : effectiveMax;

      if (pvBar.current >= healingCap) {
        blockedCapMessage = isSangueVivo
          ? `Sangue Vivo: PVs já estão em ou acima da metade máxima (${healingCap} PV).`
          : `Seus PVs já estão no máximo (${effectiveMax} PV).`;
        return base;
      }

      const nextCurrent = Math.min(healingCap, pvBar.current + amount);
      actualHealed = nextCurrent - pvBar.current;
      resultingCurrent = nextCurrent;
      return {
        ...base,
        vitals: base.vitals.map((b) =>
          b.id === 'pv' ? { ...b, current: nextCurrent } : b
        ),
      };
    });

    if (blockedCapMessage) {
      showHoverToast(blockedCapMessage);
    } else if (actualHealed > 0) {
      showHoverToast(
        `${label || 'Cura'}: +${actualHealed} PV (${resultingCurrent}/${effectiveMaxForToast})!`
      );
    }
  }

  function handleTakePvDamage(amount: number, reason?: string) {
    if (!latestCharacterRef.current || amount <= 0) return;
    applyLocalCharacterUpdate((base) => ({
      ...base,
      vitals: base.vitals.map((v) =>
        v.id === 'pv' ? { ...v, current: Math.max(0, v.current - amount) } : v
      ),
    }));
    if (reason) showHoverToast(`${reason}: -${amount} PV.`);
  }

  function handleGrantTempPe(amount: number, label?: string) {
    if (!latestCharacterRef.current || amount <= 0) return;
    const peLimit = getOrdemPeLimit(levelOrNex, rawSheet.origin, characterAbilities);
    const hasSceneCap =
      label === 'Gladiador Paranormal' || label === 'Potencial Reaproveitado';
    let gained = 0;
    let resultingTempPe = 0;
    let cappedOut = false;

    applyLocalCharacterUpdate((base) => {
      const prevRaw = (base.sheetData || {}) as Record<string, any>;
      const currTempPe = Number(prevRaw.tempPe || 0);
      const nextTempPe = hasSceneCap
        ? Math.min(peLimit, currTempPe + amount)
        : currTempPe + amount;
      gained = Math.max(0, nextTempPe - currTempPe);
      resultingTempPe = nextTempPe;
      if (hasSceneCap && gained === 0) {
        cappedOut = true;
        return base;
      }
      return {
        ...base,
        sheetData: { ...prevRaw, tempPe: nextTempPe },
      };
    });

    if (cappedOut) {
      showHoverToast(
        `${label}: teto de ${peLimit} PE temporários por cena já atingido!`
      );
    } else if (gained > 0) {
      showHoverToast(
        `${label || 'PE Temporário'}: +${gained} PE Temp (Total Temp: ${resultingTempPe} PE)!`
      );
    }
  }

  function handleAddSceneEffect(effect: SceneEffect) {
    applyLocalCharacterUpdate((base) => {
      const prevRaw = (base.sheetData || {}) as Record<string, any>;
      const prevEffects: SceneEffect[] = Array.isArray(prevRaw.sceneEffects)
        ? prevRaw.sceneEffects
        : [];
      const filtered = prevEffects.filter((e) => e.id !== effect.id);
      return {
        ...base,
        sheetData: { ...prevRaw, sceneEffects: [...filtered, effect] },
      };
    });
  }

  async function handleSaveSheet(overrideChar?: FullCharacterResponse) {
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
    }
    if (overrideChar) {
      latestCharacterRef.current = overrideChar;
    }
    const target = latestCharacterRef.current;
    if (!target) return;

    if (inFlightSaveCountRef.current > 0) {
      pendingFollowUpSaveRef.current = true;
      return;
    }

    const saveVersion = localMutationVersionRef.current;
    inFlightSaveCountRef.current += 1;
    setIsSaving(true);
    setFeedbackMsg('');
    try {
      await updateCharacter(target.id, {
        name: target.name,
        portraitUrl: target.portraitUrl,
        vitals: target.vitals,
        sheetData: target.sheetData,
        inventory: target.inventory,
        attacks: target.attacks,
      });
      if (onCharacterSaved) {
        onCharacterSaved(target.id, target.campaignId);
      }
      if (localMutationVersionRef.current === saveVersion) {
        setFeedbackMsg('Salvo!');
        setTimeout(() => setFeedbackMsg(''), 2000);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      inFlightSaveCountRef.current = Math.max(0, inFlightSaveCountRef.current - 1);
      if (inFlightSaveCountRef.current === 0) {
        setIsSaving(false);
      }
      const hasNewerMutations = localMutationVersionRef.current > saveVersion;
      if (pendingFollowUpSaveRef.current || hasNewerMutations) {
        pendingFollowUpSaveRef.current = false;
        if (latestCharacterRef.current) {
          handleSaveSheet(latestCharacterRef.current);
        }
      }
    }
  }

  // Abre o Modal para passar um item da mochila para um aliado da campanha
  async function handleOpenTradeModal(item: RPGItem) {
    if (!character?.campaignId) return;
    setItemToTradeModal(item);
    setSelectedAllyId('');
    setTradeQuantity(1);
    try {
      const data = await fetchCampaignTradeTargets(character.campaignId);
      setTradeAllies(data.characters.filter((c) => c.id !== character.id));
    } catch (err: any) {
      alert(err.message);
      setItemToTradeModal(null);
    }
  }

  // Confirma a transferência atômica do item (e quantidade escolhida) para o aliado
  async function handleConfirmTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!character?.campaignId || !itemToTradeModal || !selectedAllyId) return;

    setIsTransferring(true);
    try {
      const result = await transferItemBetweenCharacters(
        character.campaignId,
        character.id,
        selectedAllyId,
        itemToTradeModal.id,
        tradeQuantity
      );

      setCharacter((prev) =>
        prev
          ? {
              ...prev,
              inventory: result.updatedSender.inventory,
              attacks: result.updatedSender.attacks,
            }
          : null
      );

      // Sincroniza o Escudo do Mestre e a ficha do aliado, além de abrir o Modal de Item Recebido na tela dele!
      if (onCharacterSaved) {
        onCharacterSaved(character.id, character.campaignId);
        onCharacterSaved(selectedAllyId, character.campaignId);
      }
      if (onNotifyItemGiven) {
        onNotifyItemGiven(selectedAllyId, result.transferredItem, result.transferredAttack);
      }

      setFeedbackMsg(result.message);
      setTimeout(() => setFeedbackMsg(''), 3500);
      setItemToTradeModal(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTransferring(false);
    }
  }

  function computeUpdatedVitalChar(
    base: FullCharacterResponse,
    barId: string,
    field: 'current' | 'max',
    resolveTargetValue: (currentVal: number, effectiveMax: number) => number
  ): FullCharacterResponse {
    const baseRaw = (base.sheetData || {}) as Record<string, any>;
    let nextTempHp = Number(baseRaw.tempHp || 0);
    let tempHpChanged = false;
    let nextTempPe = Number(baseRaw.tempPe || 0);
    let tempPeChanged = false;

    const updatedVitals = base.vitals.map((bar) => {
      if (bar.id !== barId) return bar;
      const bonusMax = bonuses.vitalMax[bar.id] || 0;
      const effectiveMax = Math.max(1, bar.max + bonusMax);

      if (field === 'max') {
        const validMax = Math.max(1, resolveTargetValue(bar.max, effectiveMax));
        return { ...bar, max: validMax };
      }

      const requestedVal = resolveTargetValue(bar.current, effectiveMax);
      let targetVal = requestedVal;
      // Se for dano em PV e houver PV Temporários (ex.: Consumir Manancial), desconta primeiro dos PV Temporários!
      if (barId === 'pv' && requestedVal < bar.current && nextTempHp > 0) {
        const damage = bar.current - requestedVal;
        const absorbed = Math.min(nextTempHp, damage);
        nextTempHp -= absorbed;
        const remainingDamage = damage - absorbed;
        targetVal = bar.current - remainingDamage;
        tempHpChanged = true;
      }
      // Se for gasto de PE e houver PE Temporários (ex.: Vislumbres do Passado do Amnésico), desconta primeiro dos PE Temporários!
      if (barId === 'pe' && requestedVal < bar.current && nextTempPe > 0) {
        const spent = bar.current - requestedVal;
        const absorbed = Math.min(nextTempPe, spent);
        nextTempPe -= absorbed;
        const remainingSpent = spent - absorbed;
        targetVal = bar.current - remainingSpent;
        tempPeChanged = true;
      }
      const clampedCurrent = Math.max(0, Math.min(effectiveMax, targetVal));
      return { ...bar, current: clampedCurrent };
    });

    return {
      ...base,
      vitals: updatedVitals,
      sheetData:
        tempHpChanged || tempPeChanged
          ? { ...baseRaw, tempHp: nextTempHp, tempPe: nextTempPe }
          : base.sheetData,
    };
  }

  function handleVitalChange(barId: string, field: 'current' | 'max', newValue: number) {
    if (!latestCharacterRef.current || !canEditVitals) return;
    applyLocalCharacterUpdate((base) =>
      computeUpdatedVitalChar(base, barId, field, () => newValue)
    );
  }

  function handleVitalDelta(barId: string, delta: number) {
    if (!latestCharacterRef.current || !canEditVitals) return;
    applyLocalCharacterUpdate((base) =>
      computeUpdatedVitalChar(base, barId, 'current', (curr) => curr + delta)
    );
  }

  function handleEndCharacterScene() {
    const nextChar = applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      return {
        ...base,
        sheetData: {
          ...baseRaw,
          tempHp: 0,
          tempPe: 0,
          sceneEffects: [],
          // Rituais sustentados terminam junto com a cena
          ...(Array.isArray(baseRaw.abilities)
            ? {
                abilities: baseRaw.abilities.map((ab: CharacterAbility) =>
                  ab.isSustainedActive ? { ...ab, isSustainedActive: false } : ab
                ),
              }
            : {}),
        },
      };
    }, false);
    if (!nextChar) return;
    emitLivePatchFromCharacter(nextChar);
    setFeedbackMsg('Cena encerrada! Efeitos de cena e PVs temporários limpos.');
    setTimeout(() => setFeedbackMsg(''), 3500);
    handleSaveSheet(nextChar);
  }

  function rollDiceFormulaLocally(formula: string): { rolls: number[]; total: number } {
    const clean = formula.toLowerCase().replace(/\s+/g, '');
    const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return { rolls: [1], total: 1 };
    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const mod = match[3] ? parseInt(match[3], 10) : 0;
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { rolls, total: Math.max(1, sum + mod) };
  }

  function appendFlatBonusToFormula(formula: string | undefined, extra: number): string | undefined {
    if (!formula || extra <= 0) return formula;
    const clean = formula.trim();
    const match = clean.match(/^(\d+d\d+)\s*([+-]\s*\d+)$/i);
    if (match) {
      const existingMod = parseInt(match[2].replace(/\s+/g, ''), 10);
      const nextMod = existingMod + extra;
      return `${match[1]}${nextMod >= 0 ? `+${nextMod}` : nextMod}`;
    }
    return `${clean}+${extra}`;
  }

  function getRecurringRitualInfo(
    ritualDefId: string,
    form: OrdemRitualCastForm,
    ritualPotenteBonus: number
  ): {
    recurringFormula?: string;
    recurringLabel?: string;
    usesOcultismoManeuver?: boolean;
  } {
    const withPotente = (f?: string) =>
      f ? appendFlatBonusToFormula(f, ritualPotenteBonus) : undefined;
    switch (ritualDefId) {
      case 'ord-rit-chamas-caos':
        return {
          recurringFormula:
            form.mode === 'normal'
              ? withPotente('3d6')
              : withPotente(form.damageFormula),
          recurringLabel:
            form.mode === 'normal'
              ? 'Chamas do Caos (Modelar — 3d6 Fogo)'
              : `Chamas do Caos (${form.label} — Labareda)`,
        };
      case 'ord-rit-poeira-podridao':
      case 'ord-rit-ferver-sangue':
      case 'ord-rit-vomitar-pestes':
      case 'ord-rit-presenca-medo':
      case 'ord-rit-purgatorio':
      case 'ord-rit-flagelo-sangue':
        return {
          recurringFormula: withPotente(form.damageFormula),
          recurringLabel: `${form.label} (Efeito por Rodada)`,
        };
      case 'ord-rit-tentaculos-lodo':
        return {
          recurringFormula: withPotente(form.damageFormula),
          recurringLabel: 'Tentáculos de Lodo (Esmagar)',
          usesOcultismoManeuver: true,
        };
      case 'ord-rit-sopro-caos':
        return { usesOcultismoManeuver: true };
      case 'ord-rit-paradoxo':
        return form.mode === 'discente'
          ? {
              recurringFormula: withPotente('4d6'),
              recurringLabel: 'Paradoxo Discente (Esfera 4d6 Morte)',
            }
          : {};
      case 'ord-rit-miasma-entropico':
        return form.mode === 'verdadeiro'
          ? {
              recurringFormula: withPotente('6d8'),
              recurringLabel: 'Miasma Entrópico Verdadeiro (Nuvem 3 rod.)',
            }
          : {};
      case 'ord-rit-tecer-ilusao':
        return form.mode === 'verdadeiro'
          ? {
              recurringFormula: withPotente('6d6'),
              recurringLabel: 'Tecer Ilusão Verdadeiro (Perigo Mortal)',
            }
          : {};
      case 'ord-rit-hemofagia':
        return form.mode === 'verdadeiro'
          ? {
              recurringFormula: withPotente('4d6'),
              recurringLabel: 'Hemofagia Verdadeiro (Toque)',
            }
          : {};
      case 'ord-rit-contato-paranormal':
        return {
          recurringFormula: form.damageFormula,
          recurringLabel: 'Contato Paranormal (Dado de Auxílio)',
        };
      // SaH: dano que o próprio conjurador sofre por rodada (ignora resistências)
      case 'sah-rit-fedor-putrido':
        return { recurringFormula: '1d4', recurringLabel: 'Fedor Pútrido (1d4 de Morte em você)' };
      case 'sah-rit-tremeluzir':
        return { recurringFormula: '1d4', recurringLabel: 'Tremeluzir (1d4 de Energia em você; +1d4 se terminar dentro de um objeto)' };
      default:
        return {};
    }
  }

  function handleCastOrdemRitual(
    ritual: CharacterAbility,
    form: OrdemRitualCastForm,
    castOptions?: {
      usePoderDoFlagelo?: boolean;
      camuflar?: boolean;
      ampliar?: boolean;
      acelerar?: boolean;
      catalystItemIds?: string[];
      parareligiosidade?: string;
      sahChoice?: string;
      primeiraAdaga?: boolean;
    }
  ) {
    if (!character) return;
    const usePoderDoFlagelo = Boolean(castOptions?.usePoderDoFlagelo);
    const pvBar = character.vitals.find((b) => b.id === 'pv');
    const peBar = character.vitals.find((b) => b.id === 'pe');
    const pvCostFlagelo = usePoderDoFlagelo ? form.totalCost * 2 : 0;

    if (usePoderDoFlagelo) {
      if (pvBar && pvBar.current < pvCostFlagelo) {
        showHoverToast(
          `PV básicos insuficientes para Poder do Flagelo (${ritual.name})! Necessário: ${pvCostFlagelo} PV (Atual: ${pvBar.current} PV).`
        );
        return;
      }
    } else if (peBar && peBar.current + tempPe < form.totalCost) {
      showHoverToast(
        `PE insuficiente para conjurar ${ritual.name} (${form.label})! Necessário: ${form.totalCost} PE (Atual: ${peBar.current + tempPe} PE).`
      );
      return;
    }

    const preAttrForLimit = Number(rawSheet.attributes?.pre ?? 1) + (bonuses.attributes['pre'] || 0);
    const ritualPeTurnLimit = getOrdemRitualPeLimit(
      levelOrNex,
      rawSheet.origin,
      characterAbilities,
      preAttrForLimit,
      rawSheet.trail
    );
    if (
      hasActiveInitiativeOrder &&
      form.totalCost > 0 &&
      !(peSpentThisTurn === 0 && form.totalCost <= 2) &&
      peSpentThisTurn + form.totalCost > ritualPeTurnLimit
    ) {
      showHoverToast(
        `Limite de PE por turno para rituais atingido (${peSpentThisTurn}/${ritualPeTurnLimit} PE)!`
      );
      return;
    }

    if (hasActiveInitiativeOrder && form.totalCost > 0) {
      setPeSpentThisTurn((prev) => prev + form.totalCost);
    }

    const ritualDef = findOrdemRitualDef(ritual.id) || findOrdemRitualDef(ritual.name);
    const ritualDefId = ritualDef?.id || '';
    const ritualElementLower = (
      form.element ||
      ritual.element ||
      ritualDef?.element ||
      ''
    ).toLowerCase();
    const isMedoRitual = ritualElementLower === 'medo';

    // 1. Calcula DT e bônus de Ocultismo e Ritual Potente antes de montar os efeitos e rolagens
    const dt = 20 + form.totalCost;
    const intAttr = Number(rawSheet.attributes?.int ?? 1) + (bonuses.attributes['int'] || 0);
    const ocultismoSkill = (rawSheet.skills || []).find((s: any) => s.id === 'ocultismo');
    // Olhar Sinistro (Ocultista, SaH): Presença no lugar de Intelecto em Ocultismo
    const ocultismoAttr = getOrdemOcultismoAttr(characterAbilities, intAttr, preAttrForLimit);
    const ocultismoDice =
      ocultismoAttr.value + bonuses.skillDiceAll + (bonuses.skillDice['ocultismo'] || 0);
    const ocultismoMod =
      Number(ocultismoSkill?.trainingDegree ?? 0) +
      Number(ocultismoSkill?.otherModifier ?? 0) +
      bonuses.skillBonusAll +
      (bonuses.skillBonus['ocultismo'] || 0);

    const hasRitualPotente = characterAbilities.some(
      (ab) =>
        ab.isActive !== false &&
        (ab.id === 'ord-pwr-ocu-ritual-potente' ||
          ab.name.toLowerCase().includes('ritual potente'))
    );
    const ritualPotenteBonus = hasRitualPotente ? Math.max(0, intAttr) : 0;

    // 2. Efeitos de Cena, Arma, Sustentados e PV Temporários (Tela de Ruído / Forma Monstruosa / Cinerária / etc.)
    let nextTempHp = Number(rawSheet.tempHp || 0);
    const nextTempPe = Number(rawSheet.tempPe || 0);
    let nextSceneEffects: SceneEffect[] = [...activeSceneEffects];
    const effectNotes: string[] = [];
    const isAmaldicoarArma = ritual.name.toLowerCase().includes('amaldiçoar arma');
    const isSustainedForm = Boolean(
      (form.duration || ritualDef?.duration || '').toLowerCase().includes('sustentad')
    );
    const recurringInfo = getRecurringRitualInfo(ritualDefId, form, ritualPotenteBonus);

    const prevSameRitualEffect = activeSceneEffects.find(
      (e) =>
        (e.ritualId && e.ritualId === ritual.id) ||
        e.name.trim().toLowerCase() === ritual.name.trim().toLowerCase()
    );
    const withoutSameRitual = nextSceneEffects.filter(
      (e) =>
        !(
          (e.ritualId && e.ritualId === ritual.id) ||
          e.name.trim().toLowerCase() === ritual.name.trim().toLowerCase()
        )
    );

    const newEffectBase: Partial<SceneEffect> = {
      isSustainedRitual: isSustainedForm,
      ritualId: ritual.id,
      recurringFormula: recurringInfo.recurringFormula,
      recurringLabel: recurringInfo.recurringLabel,
      usesOcultismoManeuver: recurringInfo.usesOcultismoManeuver,
    };

    if (form.weaponExtraDice || form.weaponCritThreatSteps || isAmaldicoarArma) {
      nextSceneEffects = [...withoutSameRitual];
      const weaponDescParts: string[] = [];
      if (isAmaldicoarArma || form.weaponExtraDice) {
        const extraDiceText =
          form.weaponExtraDice ||
          (form.mode === 'verdadeiro' ? '4d6' : form.mode === 'discente' ? '2d6' : '1d6');
        weaponDescParts.push(`+${extraDiceText} dano`);
        if (ritual.name.toLowerCase().includes('chamas do caos')) {
          weaponDescParts.push('Chamejar');
        }
      }
      if (form.weaponCritThreatSteps) {
        weaponDescParts.push(`+${form.weaponCritThreatSteps} margem de ameaça`);
      }
      if (form.weaponCritMultiplierBoost) {
        weaponDescParts.push(`+${form.weaponCritMultiplierBoost}x multiplicador crítico`);
      }
      nextSceneEffects.push({
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: ritual.name,
        source: form.label,
        description: `${form.label}: ${weaponDescParts.join(' • ')}`,
        modifiers: form.sceneModifiers,
        ...newEffectBase,
      });
      effectNotes.push(`${ritual.name} (${form.label}): ${weaponDescParts.join(', ')} ativo na cena!`);
    } else if (form.tempHpFlat) {
      // Substitui eventual PV Temporário anterior do mesmo ritual (ex: Tela de Ruído Normal -> Discente)
      const oldGranted = prevSameRitualEffect?.tempHpGranted || 0;
      nextTempHp = Math.max(0, nextTempHp - oldGranted) + form.tempHpFlat;
      nextSceneEffects = [
        ...withoutSameRitual,
        {
          id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: ritual.name,
          source: form.label,
          description: `+${form.tempHpFlat} PV Temporários na cena`,
          tempHpGranted: form.tempHpFlat,
          modifiers: form.sceneModifiers,
          ...newEffectBase,
        },
      ];
      effectNotes.push(`+${form.tempHpFlat} PV Temporários recebidos na cena!`);
    } else if (form.sceneDefenseBonus) {
      const defModifiers = [
        {
          id: `mod-${ritual.id}-def`,
          targetType: 'defense' as const,
          targetKey: 'defesa',
          value: form.sceneDefenseBonus,
        },
        ...(form.sceneModifiers || []),
      ];
      nextSceneEffects = [
        ...withoutSameRitual,
        {
          id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: ritual.name,
          source: form.label,
          description: `+${form.sceneDefenseBonus} na Defesa durante a cena`,
          modifiers: defModifiers,
          ...newEffectBase,
        },
      ];
      effectNotes.push(`+${form.sceneDefenseBonus} na Defesa ativo até o fim da cena!`);
    } else if (ritualDefId === 'ord-rit-cineraria') {
      const cinerariaDesc =
        form.mode === 'verdadeiro'
          ? '+5 na DT, rituais custam -2 PE e causam dano maximizado na névoa'
          : form.mode === 'discente'
          ? '+5 na DT e rituais custam -2 PE na névoa'
          : '+5 na DT dos rituais conjurados na névoa';
      nextSceneEffects = [
        ...withoutSameRitual,
        {
          id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: ritual.name,
          source: form.label,
          description: cinerariaDesc,
          ...newEffectBase,
        },
      ];
      effectNotes.push(`Cinerária (${form.label}): ${cinerariaDesc}!`);
    } else if (form.sceneModifiers && form.sceneModifiers.length > 0 && !form.tempHpFormula) {
      nextSceneEffects = [
        ...withoutSameRitual,
        {
          id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: ritual.name,
          source: form.label,
          description: form.description,
          modifiers: form.sceneModifiers,
          ...newEffectBase,
        },
      ];
      effectNotes.push(`Efeito de ${ritual.name} (${form.label}) ativo na cena!`);
    } else if (
      isSustainedForm ||
      recurringInfo.recurringFormula ||
      recurringInfo.usesOcultismoManeuver ||
      (ritual.modifiers && ritual.modifiers.length > 0 && !form.tempHpFormula)
    ) {
      nextSceneEffects = [
        ...withoutSameRitual,
        {
          id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: ritual.name,
          source: form.label,
          description: form.description,
          modifiers: ritual.modifiers && ritual.modifiers.length > 0 ? ritual.modifiers : undefined,
          ...newEffectBase,
        },
      ];
      effectNotes.push(
        isSustainedForm
          ? `${ritual.name} (${form.label}) agora está sustentado na cena!`
          : `Efeito de ${ritual.name} ativo na cena!`
      );
    }

    const nextAbilities = isSustainedForm
      ? characterAbilities.map((ab) =>
          ab.id === ritual.id ? { ...ab, isSustainedActive: true } : ab
        )
      : characterAbilities;

    // 3. Determina o efeito rolável vinculado (Dano, Cura, Vida Temporária ou Utilidade)
    const isCinerariaVerdadeiroActive = activeSceneEffects.some((ef) => {
      const nm = (ef.name || '').toLowerCase();
      if (!nm.includes('cinerária') && !nm.includes('cineraria')) return false;
      return `${ef.source || ''} ${ef.description || ''}`.toLowerCase().includes('verdadeiro');
    });

    let effectType: RitualEffectRollPayload['effectType'] | undefined;
    let effectFormula: string | undefined;
    let effectLabel: string | undefined;

    if (form.healingFormula) {
      effectType = 'healing';
      effectFormula = appendFlatBonusToFormula(form.healingFormula, ritualPotenteBonus);
    } else if (form.tempHpFormula && !form.damageFormula) {
      effectType = 'temp_hp';
      effectFormula = form.tempHpFormula;
    } else if (ritualDefId === 'ord-rit-ouvir-sussurros') {
      effectType = 'utility';
      effectFormula = '1d6';
      effectLabel = 'Sussurros (2–6 funciona, 1 falha)';
    } else if (form.damageFormula && !isAmaldicoarArma) {
      effectType = 'damage';
      const baseDmgF =
        ritualDefId === 'ord-rit-chamas-caos' && form.mode === 'normal'
          ? '3d6'
          : form.damageFormula;
      effectFormula = appendFlatBonusToFormula(baseDmgF, ritualPotenteBonus);
      if (ritualDefId === 'ord-rit-deflagracao-energia') {
        effectLabel = 'Dano (Multiplique o total por 10)';
      } else if (ritualDefId === 'ord-rit-chamas-caos' && form.mode === 'normal') {
        effectLabel = 'Dano de Fogo (Modelar)';
      }
    }

    // Catalisadores Ritualísticos (SaH p. 44): precisam ser do elemento do ritual e são consumidos
    const consumedCatalystIds: string[] = [];
    const skippedCatalysts: string[] = [];
    const castDuration = (form.duration || ritualDef?.duration || '').toLowerCase();
    for (const catalystId of castOptions?.catalystItemIds || []) {
      const item = ((character.inventory || []) as RPGItem[]).find((it) => it.id === catalystId);
      const type = getCatalystType(item);
      if (!item || !type) continue;
      const label = `Catalisador ${CATALYST_INFO[type].label}`;
      const itemEl = getCatalystElement(item).toLowerCase();
      if (itemEl && !ritualElementLower.includes(itemEl)) {
        skippedCatalysts.push(`${label} (${getCatalystElement(item)}) não serve para ritual de ${form.element || ritual.element || ritualDef?.element || 'outro elemento'}`);
        continue;
      }
      if (type === 'potencializador') {
        if (effectType !== 'damage' || !effectFormula) {
          skippedCatalysts.push(`${label}: este ritual não causa dano`);
          continue;
        }
        effectFormula = addOneDieToFormula(effectFormula);
      }
      if (type === 'prolongador' && (isSustainedForm || castDuration.includes('instant'))) {
        skippedCatalysts.push(`${label}: não funciona em ritual instantâneo ou sustentado`);
        continue;
      }
      consumedCatalystIds.push(item.id);
      effectNotes.push(`${label}: ${CATALYST_INFO[type].effect}`);
    }
    // Parareligiosidade (Exorcista 65%): efeito de catalisador sem item (o +2 PE já está no custo)
    const paraType = castOptions?.parareligiosidade as keyof typeof CATALYST_INFO | undefined;
    if (paraType && CATALYST_INFO[paraType]) {
      if (paraType === 'potencializador' && effectType === 'damage' && effectFormula) {
        effectFormula = addOneDieToFormula(effectFormula);
      }
      effectNotes.push(`Parareligiosidade: ${CATALYST_INFO[paraType].effect}`);
    }
    if (skippedCatalysts.length > 0) {
      showHoverToast(`Catalisador não usado (não foi consumido): ${skippedCatalysts.join(' • ')}`);
    }
    // A Primeira Adaga (SaH): os 4 catalisadores e conjuração em 1 rodada, ao custo de metade dos PV totais
    const adagaPvLoss = castOptions?.primeiraAdaga ? Math.floor((pvBar?.max || 0) / 2) : 0;
    if (castOptions?.primeiraAdaga) {
      if (effectType === 'damage' && effectFormula) effectFormula = addOneDieToFormula(effectFormula);
      effectNotes.push(
        `A Primeira Adaga: ${Object.values(CATALYST_INFO)
          .map((c) => c.effect)
          .join(' + ')}; conjuração em 1 rodada; -${adagaPvLoss} PV`
      );
    }
    // Rituais do Sobrevivendo ao Horror: resumo do efeito (e escolha feita no diálogo)
    const sahNote = describeSahRitualCast(ritualDefId, form.mode, castOptions?.sahChoice);
    if (sahNote) effectNotes.unshift(sahNote);

    const ritualEffectPayload: RitualEffectRollPayload = {
      ritualId: ritual.id,
      ritualName: ritual.name,
      formLabel: form.label,
      peSpent: usePoderDoFlagelo ? 0 : form.totalCost,
      pvSpent: (usePoderDoFlagelo ? pvCostFlagelo : 0) + adagaPvLoss || undefined,
      custoParanormalDt: dt,
      effectType,
      effectFormula,
      effectLabel,
      maximizeEffect:
        effectType === 'damage' && isCinerariaVerdadeiroActive ? true : undefined,
      appliedSceneSummary: effectNotes.length > 0 ? effectNotes.join(' • ') : undefined,
    };

    // 4. Invocando o Medo (p. 121) vs O Custo do Paranormal (DT 20 + PE gasto)
    const ocultismoRolls: number[] = [];
    let ocultismoTotal = 0;
    let passed = false;
    let failedByFiveOrMore = false;
    let sanLost = 0;
    let permSanLost = 0;

    if (isMedoRitual) {
      sanLost = form.totalCost;
      permSanLost = form.mode === 'verdadeiro' ? 3 : form.mode === 'discente' ? 2 : 1;
    } else {
      const numD20 = getOrdemDiceRollCount(ocultismoDice);
      for (let i = 0; i < numD20; i++) {
        ocultismoRolls.push(Math.floor(Math.random() * 20) + 1);
      }
      const keptRoll =
        ocultismoDice <= 0 ? Math.min(...ocultismoRolls) : Math.max(...ocultismoRolls);
      ocultismoTotal = keptRoll + ocultismoMod;
      passed = ocultismoTotal >= dt;
      failedByFiveOrMore = !passed && dt - ocultismoTotal >= 5;
      sanLost = passed ? 0 : form.totalCost;
      permSanLost = failedByFiveOrMore ? 1 : 0;

      // Dispara a rolagem oficial de Ocultismo no Modal já carregando o botão do Efeito do Ritual (se houver)!
      triggerCharacterRoll(
        `O Custo do Paranormal (Ocultismo DT ${dt}) — ${ritual.name} [${form.label}]`,
        ocultismoDice,
        20,
        ocultismoMod,
        false,
        false,
        ocultismoRolls,
        undefined,
        undefined,
        undefined,
        ritualEffectPayload
      );
    }

    // 5. Atualiza PV (se Poder do Flagelo) ou PE (descontando PE Temp primeiro) e Sanidade via update seguro
    const nextChar = applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      let bTempHp = Number(baseRaw.tempHp || 0);
      let bTempPe = Number(baseRaw.tempPe || 0);
      const bSceneEffects: SceneEffect[] = Array.isArray(baseRaw.sceneEffects)
        ? baseRaw.sceneEffects
        : [];
      let updatedEffects = [...bSceneEffects];
      if (
        nextSceneEffects.length !== activeSceneEffects.length ||
        nextSceneEffects.some((e, i) => e.id !== activeSceneEffects[i]?.id)
      ) {
        const addedEffects = nextSceneEffects.filter(
          (e) => !activeSceneEffects.some((old) => old.id === e.id)
        );
        const removedNames = new Set(addedEffects.map((e) => e.name));
        updatedEffects = [
          ...bSceneEffects.filter((e) => !removedNames.has(e.name)),
          ...addedEffects,
        ];
      }
      const deltaTempHp = nextTempHp - Number(rawSheet.tempHp || 0);
      bTempHp = Math.max(0, bTempHp + deltaTempHp);

      let remPe = 0;
      if (!usePoderDoFlagelo) {
        const absorbedPe = Math.min(bTempPe, form.totalCost);
        bTempPe = Math.max(0, bTempPe - absorbedPe);
        remPe = form.totalCost - absorbedPe;
      }

      const vitalsAfterCast = base.vitals.map((bar) => {
        if (bar.id === 'pv' && (usePoderDoFlagelo || adagaPvLoss > 0)) {
          return { ...bar, current: Math.max(0, bar.current - pvCostFlagelo - adagaPvLoss) };
        }
        if (bar.id === 'pe' && remPe > 0) {
          return { ...bar, current: Math.max(0, bar.current - remPe) };
        }
        if (bar.id === 'san' && (sanLost > 0 || permSanLost > 0)) {
          const nextMax = Math.max(1, bar.max - permSanLost);
          const nextCurr = Math.max(0, Math.min(nextMax, bar.current - sanLost));
          return { ...bar, max: nextMax, current: nextCurr };
        }
        return bar;
      });

      const baseAbilities: CharacterAbility[] = Array.isArray(baseRaw.abilities)
        ? baseRaw.abilities
        : nextAbilities;
      const updatedBaseAbilities = isSustainedForm
        ? baseAbilities.map((ab) =>
            ab.id === ritual.id ? { ...ab, isSustainedActive: true } : ab
          )
        : baseAbilities;

      const baseInventory = (base.inventory || []) as RPGItem[];
      const inventoryAfterCast =
        consumedCatalystIds.length > 0
          ? baseInventory.flatMap((it) =>
              !consumedCatalystIds.includes(it.id)
                ? [it]
                : (it.quantity ?? 1) > 1
                ? [{ ...it, quantity: (it.quantity ?? 1) - 1 }]
                : []
            )
          : baseInventory;

      return {
        ...base,
        vitals: vitalsAfterCast,
        inventory: inventoryAfterCast as any,
        sheetData: {
          ...baseRaw,
          abilities: updatedBaseAbilities,
          tempHp: bTempHp,
          tempPe: bTempPe,
          sceneEffects: updatedEffects,
        },
      };
    }, true);
    if (!nextChar) return;

    setRitualCastSummaryModal({
      ritualName: ritual.name,
      formLabel: form.label,
      peSpent: usePoderDoFlagelo ? 0 : form.totalCost,
      pvSpent: (usePoderDoFlagelo ? pvCostFlagelo : 0) + adagaPvLoss || undefined,
      dt,
      ocultismoRolls,
      ocultismoMod,
      ocultismoTotal,
      passed,
      failedByFiveOrMore,
      sanLost,
      permSanLost,
      isMedoRitual,
      effectAppliedText: effectNotes.length > 0 ? effectNotes.join(' • ') : undefined,
      damageFormulaToRoll: effectType === 'damage' ? effectFormula : undefined,
      healingFormulaToRoll: effectType === 'healing' ? effectFormula : undefined,
    });

    logSheetActivity({
      category: 'ability',
      summary: `Conjurou ${ritual.name} [${form.label}]${
        consumedCatalystIds.length > 0
          ? ` com ${consumedCatalystIds.length} catalisador${consumedCatalystIds.length > 1 ? 'es' : ''}`
          : ''
      }`,
      costText: usePoderDoFlagelo ? `-${pvCostFlagelo} PV` : `-${form.totalCost} PE`,
      details: isMedoRitual
        ? `Invocando o Medo: -${sanLost} SAN e -${permSanLost} SAN Máx Permanente`
        : passed
        ? `O Custo do Paranormal: Sucesso (${ocultismoTotal} vs DT ${dt})`
        : `O Custo do Paranormal: Falha (${ocultismoTotal} vs DT ${dt}) → -${sanLost} SAN${
            permSanLost > 0 ? ' e -1 SAN Máx Permanente' : ''
          }`,
      tone: 'purple',
    });
  }

  function checkTurnPeLimitAllowed(amount: number, powerLabel?: string): boolean {
    if (!character || character.system !== 'ordem-paranormal' || amount <= 0) return true;
    if (!hasActiveInitiativeOrder) return true;
    const peTurnLimit = getOrdemPeLimit(levelOrNex, rawSheet.origin, characterAbilities);
    // Regra Oficial (p. 23, Limite de PE): um personagem sempre pode usar uma habilidade em seu custo mínimo (ex.: 2 PE em NEX 5%), mesmo que isso exceda seu limite, desde que ainda não tenha gasto PE no turno.
    if (peSpentThisTurn === 0 && amount <= 2) {
      return true;
    }
    if (peSpentThisTurn + amount > peTurnLimit) {
      showHoverToast(
        `Limite de PE por turno atingido${
          powerLabel ? ` para ${powerLabel}` : ''
        } (${peSpentThisTurn}/${peTurnLimit} PE gastos neste turno)! Ele será resetado automaticamente quando seu turno chegar novamente.`
      );
      return false;
    }
    return true;
  }

  function handleCheckResource(amount: number, powerLabel?: string): boolean {
    if (!character) return false;
    const targetBarId = character.system === 'ordem-paranormal' ? 'pe' : 'pm';
    const resourceBar = character.vitals.find((b) => b.id === targetBarId);
    if (!resourceBar) return true;
    const availableTemp = targetBarId === 'pe' ? tempPe : 0;
    if (resourceBar.current + availableTemp < amount) {
      showHoverToast(
        `${resourceBar.label} insuficiente${
          powerLabel ? ` para usar ${powerLabel}` : ''
        }! Necessário: ${amount} (Atual: ${resourceBar.current + availableTemp}).`
      );
      return false;
    }
    if (!checkTurnPeLimitAllowed(amount, powerLabel)) {
      return false;
    }
    return true;
  }

  function handleSpendResource(amount: number, extraSceneEffect?: SceneEffect): boolean {
    const base = latestCharacterRef.current;
    if (!base) return false;
    const targetBarId = base.system === 'ordem-paranormal' ? 'pe' : 'pm';
    const resourceBar = base.vitals.find((b) => b.id === targetBarId);

    if (!resourceBar) return true;
    const baseRaw = (base.sheetData || {}) as Record<string, any>;
    const currentTempPe = targetBarId === 'pe' ? Number(baseRaw.tempPe || 0) : 0;
    if (resourceBar.current + currentTempPe < amount) {
      showHoverToast(
        `${resourceBar.label} insuficiente! Necessário: ${amount} (Atual: ${
          resourceBar.current + currentTempPe
        }).`
      );
      return false;
    }
    if (!checkTurnPeLimitAllowed(amount)) {
      return false;
    }

    if (hasActiveInitiativeOrder && base.system === 'ordem-paranormal' && amount > 0) {
      setPeSpentThisTurn((prev) => prev + amount);
    }

    applyLocalCharacterUpdate((cur) => {
      const curRaw = (cur.sheetData || {}) as Record<string, any>;
      let nextTempPe = Number(curRaw.tempPe || 0);
      let remainingToSpend = amount;
      if (targetBarId === 'pe' && nextTempPe > 0 && remainingToSpend > 0) {
        const absorbed = Math.min(nextTempPe, remainingToSpend);
        nextTempPe -= absorbed;
        remainingToSpend -= absorbed;
      }

      const updatedVitals = cur.vitals.map((bar) => {
        if (bar.id !== targetBarId) return bar;
        return {
          ...bar,
          current: Math.max(0, bar.current - remainingToSpend),
        };
      });

      const curEffects: SceneEffect[] = Array.isArray(curRaw.sceneEffects)
        ? curRaw.sceneEffects
        : [];
      const nextSceneEffects = extraSceneEffect
        ? [
            ...curEffects.filter((e) => e.id !== extraSceneEffect.id),
            extraSceneEffect,
          ]
        : curEffects;

      return {
        ...cur,
        vitals: updatedVitals,
        sheetData: {
          ...curRaw,
          tempPe: nextTempPe,
          sceneEffects: nextSceneEffects,
        },
      };
    }, true);

    return true;
  }

  latestSpendResourceRef.current = handleSpendResource;

  function handleRollVislumbresPe() {
    const base = latestCharacterRef.current;
    if (!base || base.system !== 'ordem-paranormal') return;
    const peRoll = Math.floor(Math.random() * 4) + 1;
    applyLocalCharacterUpdate((cur) => {
      const curRaw = (cur.sheetData || {}) as Record<string, any>;
      const nextTempPe = Number(curRaw.tempPe || 0) + peRoll;
      const curEffects: SceneEffect[] = Array.isArray(curRaw.sceneEffects)
        ? curRaw.sceneEffects
        : [];
      const nextEffects: SceneEffect[] = [
        ...curEffects.filter((e) => e.id !== 'orig-vislumbres'),
        {
          id: 'orig-vislumbres',
          name: 'Vislumbres do Passado (Poder de Amnésico)',
          source: 'Cena',
          description: `+${peRoll} PE Temporários concedidos (Total: +${nextTempPe} PE Temp)`,
        },
      ];
      return {
        ...cur,
        sheetData: {
          ...curRaw,
          tempPe: nextTempPe,
          sceneEffects: nextEffects,
        },
      };
    }, true);
    setVislumbresResult((prev) => (prev ? { ...prev, peGranted: peRoll } : null));

    triggerCharacterRoll(
      'Vislumbres do Passado (+1d4 PE Temporários)',
      1,
      4,
      0,
      false,
      false,
      [peRoll]
    );
  }

  function handleTriggerOriginSpecial(originId: string) {
    if (!character || character.system !== 'ordem-paranormal') return;
    const intAttr = Number(rawSheet.attributes?.int ?? 1) + (bonuses.attributes['int'] || 0);

    if (originId === 'amnesico') {
      // Vislumbres do Passado (Livro p. 16): Rola Teste de Intelecto DT 10. Se passar, libera o botão para girar 1d4 PE temporários!
      const numD20 = getOrdemDiceRollCount(intAttr);
      const rolls: number[] = [];
      for (let i = 0; i < numD20; i++) {
        rolls.push(Math.floor(Math.random() * 20) + 1);
      }
      const kept = intAttr <= 0 ? Math.min(...rolls) : Math.max(...rolls);
      const passed = kept >= 10;

      setVislumbresResult({ keptRoll: kept, passed });

      triggerCharacterRoll(
        'Vislumbres do Passado (Intelecto DT 10)',
        intAttr,
        20,
        0,
        false,
        false,
        rolls
      );
      logSheetActivity({
        category: 'ability',
        summary: `Usou Vislumbres do Passado (Intelecto DT 10 → ${kept}${passed ? ' • Sucesso!' : ' • Falha'})`,
        tone: passed ? 'success' : 'neutral',
      });
      return;
    }

    if (originId === 'ti') {
      if (!handleSpendResource(2)) return;
      logSheetActivity({
        category: 'ability',
        summary: 'Usou Motor de Busca (Poder de T.I.) em Tecnologia',
        costText: '-2 PE',
        tone: 'info',
      });
      const skill = (rawSheet.skills || []).find((s: any) => s.id === 'tecnologia');
      const dice = intAttr + bonuses.skillDiceAll + (bonuses.skillDice['tecnologia'] || 0);
      const mod =
        Number(skill?.trainingDegree ?? 0) +
        Number(skill?.otherModifier ?? 0) +
        bonuses.skillBonusAll +
        (bonuses.skillBonus['tecnologia'] || 0);
      triggerCharacterRoll(
        'Teste de Tecnologia (Motor de Busca -2 PE)',
        dice,
        20,
        mod
      );
      return;
    }

    if (originId === 'trambiqueiro') {
      const inCamp = Boolean(character?.campaignId);
      if (inCamp && activeSceneEffects.some((e) => e.id === 'orig-scene-impostor')) {
        showHoverToast('Impostor só pode ser utilizado 1 vez por cena!');
        return;
      }
      if (
        !handleSpendResource(
          2,
          inCamp
            ? {
                id: 'orig-scene-impostor',
                name: 'Impostor (Poder de Trambiqueiro)',
                source: '1x/Cena',
                description: 'Já utilizado nesta cena',
              }
            : undefined
        )
      ) {
        return;
      }
      const preAttr = Number(rawSheet.attributes?.pre ?? 1) + (bonuses.attributes['pre'] || 0);
      const skill = (rawSheet.skills || []).find((s: any) => s.id === 'enganacao');
      const dice = preAttr + bonuses.skillDiceAll + (bonuses.skillDice['enganacao'] || 0);
      const mod =
        Number(skill?.trainingDegree ?? 0) +
        Number(skill?.otherModifier ?? 0) +
        bonuses.skillBonusAll +
        (bonuses.skillBonus['enganacao'] || 0);

      triggerCharacterRoll(
        `Teste de Enganação (Impostor -2 PE${inCamp ? ' • 1x/Cena' : ''})`,
        dice,
        20,
        mod
      );
      logSheetActivity({
        category: 'ability',
        summary: 'Usou Impostor (Poder de Trambiqueiro) em Enganação',
        costText: '-2 PE',
        tone: 'info',
      });
      return;
    }

    if (originId === 'sentido_tatico') {
      if (
        !handleSpendResource(2, {
          id: 'pwr-scene-sentido-tatico',
          name: 'Sentido Tático (Poder de Combatente)',
          source: 'Cena',
          description: `+${intAttr} na Defesa e em testes de resistência (Fortitude, Reflexos e Vontade) até o fim da cena`,
          modifiers: [
            { id: 'mod-st-def', targetType: 'defense', targetKey: 'defense', value: intAttr },
            { id: 'mod-st-fort', targetType: 'skill_bonus', targetKey: 'fortitude', value: intAttr },
            { id: 'mod-st-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: intAttr },
            { id: 'mod-st-von', targetType: 'skill_bonus', targetKey: 'vontade', value: intAttr },
          ],
        })
      ) {
        return;
      }
      logSheetActivity({
        category: 'ability',
        summary: `Ativou Sentido Tático (+${intAttr} Defesa e Resistências na cena)`,
        costText: '-2 PE',
        tone: 'info',
      });
      setFeedbackMsg(
        `Sentido Tático ativado (-2 PE)! +${intAttr} na Defesa e Resistências nesta cena.`
      );
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    if (originId === 'astronauta') {
      const existing = activeSceneEffects.find((e) => e.id === 'orig-scene-astronauta');
      const prevUses = Number(existing?.source?.replace(/\D/g, '') || 0);
      const cost = 1 + prevUses;
      if (
        !handleSpendResource(cost, {
          id: 'orig-scene-astronauta',
          name: 'Acostumado ao Extremo (Astronauta)',
          source: `${prevUses + 1}x`,
          description: `Reduziu dano de fogo, frio ou mental em 5 (${prevUses + 1}x nesta cena • próx.: ${cost + 1} PE)`,
        })
      ) {
        return;
      }
      logSheetActivity({
        category: 'ability',
        summary: `Usou Acostumado ao Extremo (-5 de dano de fogo/frio/mental • ${prevUses + 1}º uso na cena)`,
        costText: `-${cost} PE`,
        tone: 'info',
      });
      showHoverToast(
        `Acostumado ao Extremo (-${cost} PE): dano de fogo, frio ou mental reduzido em 5!`
      );
      return;
    }

    if (originId === 'profetizado') {
      handleGrantTempPe(2, 'Luta ou Fuga (Profetizado)');
      handleAddSceneEffect({
        id: 'orig-scene-profetizado',
        name: 'Luta ou Fuga (Profetizado)',
        source: 'Cena',
        description: '+2 PE temporários recebidos pelo gatilho de premonição nesta cena',
      });
      logSheetActivity({
        category: 'ability',
        summary: 'Ativou Luta ou Fuga (Profetizado): +2 PE Temporários na cena',
        tone: 'purple',
      });
      return;
    }

    if (originId === 'jovem_mistico') {
      const inCamp = Boolean(character?.campaignId);
      if (
        inCamp &&
        activeSceneEffects.some((e) => e.id === 'orig-scene-culpa-estrelas-used')
      ) {
        showHoverToast('A Culpa é das Estrelas só pode ser utilizada 1 vez por cena!');
        return;
      }
      if (
        !handleSpendResource(
          1,
          inCamp
            ? {
                id: 'orig-scene-culpa-estrelas-used',
                name: 'A Culpa é das Estrelas (Consultado)',
                source: '1x/Cena',
                description: 'Já consultou os astros nesta cena',
              }
            : undefined
        )
      ) {
        return;
      }
      const d6 = Math.floor(Math.random() * 6) + 1;
      const baseLucky = Number(rawSheet.originMeta?.luckyNumber || 6);
      const extraLucky: number[] = Array.isArray(rawSheet.originMeta?.extraLuckyNumbers)
        ? rawSheet.originMeta.extraLuckyNumbers
        : [];
      const allLucky = Array.from(new Set([baseLucky, ...extraLucky]));
      const matched = allLucky.includes(d6);

      triggerCharacterRoll(
        `A Culpa é das Estrelas (Nº da Sorte: ${allLucky.join(', ')})`,
        1,
        6,
        0,
        false,
        false,
        [d6]
      );

      if (matched) {
        handleAddSceneEffect({
          id: 'orig-scene-culpa-estrelas',
          name: 'A Culpa é das Estrelas (Alinhamento Astral!)',
          source: 'Cena',
          description: `+2 em todos os testes de perícia até o fim da cena (Rolou ${d6})`,
          modifiers: [
            {
              id: 'mod-culpa-estrelas-all',
              targetType: 'skill_bonus',
              targetKey: 'all',
              value: 2,
            },
          ],
        });
        handleUpdateOriginMeta({ extraLuckyNumbers: [] });
        showHoverToast(
          `Alinhamento Astral (${d6})! +2 em todos os testes de perícia até o fim da cena!`
        );
      } else {
        const nextCandidate = [1, 2, 3, 4, 5, 6].find((n) => !allLucky.includes(n));
        if (nextCandidate !== undefined) {
          handleUpdateOriginMeta({
            extraLuckyNumbers: [...extraLucky, nextCandidate],
          });
          showHoverToast(
            `Rolou ${d6}. Não saiu seu número, mas ${nextCandidate} foi adicionado aos seus números da sorte até acertar!`
          );
        }
      }
      logSheetActivity({
        category: 'ability',
        summary: `Usou A Culpa é das Estrelas (1d6 = ${d6} vs [${allLucky.join(', ')}])`,
        costText: '-1 PE',
        tone: matched ? 'success' : 'info',
      });
    }
  }

  function handleApplyConditionFromCompendium(entry: CompendiumEntryData) {
    const newCond: ActiveCondition = {
      id: Math.random().toString(36).substring(2, 9),
      name: entry.name,
      description: entry.description,
      modifiers: entry.modifiers || [],
    };
    const nextChar = applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      const baseConds: ActiveCondition[] = Array.isArray(baseRaw.conditions)
        ? baseRaw.conditions
        : [];
      return {
        ...base,
        sheetData: { ...baseRaw, conditions: [...baseConds, newCond] },
      };
    }, false);
    setShowMasterConditionPicker(false);
    if (nextChar) handleSaveSheet(nextChar);
  }

  function handleRemoveCondition(condId: string) {
    const nextChar = applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      const baseConds: ActiveCondition[] = Array.isArray(baseRaw.conditions)
        ? baseRaw.conditions
        : [];
      return {
        ...base,
        sheetData: {
          ...baseRaw,
          conditions: baseConds.filter((c) => c.id !== condId),
        },
      };
    }, false);
    setSelectedConditionModal(null);
    if (nextChar) handleSaveSheet(nextChar);
  }

  const strengthVal =
    character.system === 'ordem-paranormal'
      ? Number(rawSheet.attributes?.for ?? 1) + (bonuses.attributes['for'] || 0)
      : Number(rawSheet.attributes?.forca ?? 1) + (bonuses.attributes['forca'] || 0);

  const intellectVal =
    character.system === 'ordem-paranormal'
      ? Number(rawSheet.attributes?.int ?? 1) + (bonuses.attributes['int'] || 0)
      : 0;

  const maxLoadSlots =
    character.system === 'ordem-paranormal'
      ? getOrdemMaxLoad(
          strengthVal,
          intellectVal,
          rawSheet.trail,
          levelOrNex,
          0,
          characterAbilities
        )
      : 10 + Math.max(0, strengthVal * 2);

  const hasMochilaUtilidadesSheet = characterAbilities.some((ab) =>
    ab.name.toLowerCase().includes('mochila de utilidades')
  );
  const currentLoadSlots = (character.inventory || []).reduce((acc, item) => {
    const qty = item.quantity || 1;
    const rawSlots = getOrdemItemEffectiveSlots(item);
    // Inventário Organizado (Geral, SaH): itens de 0,5 espaço ocupam 0,25
    const effectiveSlots = rawSlots === 0.5 && hasInventarioOrganizado(characterAbilities) ? 0.25 : rawSlots;
    if (hasMochilaUtilidadesSheet && item.isUtilityBackpackItem) {
      const reducedFirst = Math.max(0, effectiveSlots - 1);
      return acc + reducedFirst + effectiveSlots * Math.max(0, qty - 1);
    }
    return acc + effectiveSlots * qty;
  }, 0);
  const isCharacterOverloaded =
    currentLoadSlots > maxLoadSlots + bonuses.loadLimit;

  function handleSyncOrdemTrailAbilities(trailId: string, targetNex: number) {
    if (!character) return;
    const trail = ORDEM_TRAILS.find((t) => t.id === trailId);
    if (!trail) return;

    const filteredExisting = characterAbilities.filter(
      (ab) => !ab.id.startsWith('trail-') && !ab.name.startsWith('Trilha ')
    );
    const trailPowersToAdd: CharacterAbility[] = trail.powers
      .filter((tp) => targetNex >= tp.nex)
      .map((tp) =>
        buildTrailAbility(
          trail,
          tp,
          characterAbilities.find((a) => a.id === `trail-${trail.id}-${tp.nex}`),
          getOrdemTrailDisplayName(trail.id, characterAbilities)
        )
      );

    const nextAbilities = [...filteredExisting, ...trailPowersToAdd];
    setCharacter((prev) => {
      if (!prev) return null;
      const prevRaw = (prev.sheetData || {}) as Record<string, any>;
      return {
        ...prev,
        sheetData: {
          ...prevRaw,
          trail: trailId,
          abilities: nextAbilities,
        },
      };
    });
  }

  const INTERLUDE_AMMO_PRESETS: Record<
    string,
    { name: string; category: number; slots: number; description: string }
  > = {
    balas_curtas: {
      name: 'Pacote de Balas Curtas',
      category: 0,
      slots: 1,
      description: 'Munição para pistolas, revólveres e submetralhadoras (dura 2 cenas). Categoria 0.',
    },
    balas_longas: {
      name: 'Pacote de Balas Longas',
      category: 1,
      slots: 1,
      description: 'Munição para fuzis e metralhadoras (dura 1 cena). Categoria I.',
    },
    cartuchos: {
      name: 'Pacote de Cartuchos',
      category: 1,
      slots: 1,
      description: 'Munição para espingardas (dura 1 cena). Categoria I.',
    },
    flechas: {
      name: 'Pacote de Flechas (Aljava)',
      category: 0,
      slots: 1,
      description: 'Munição para arcos e bestas (recuperável após a cena). Categoria 0.',
    },
    combustivel: {
      name: 'Combustível de Lança-Chamas',
      category: 1,
      slots: 1,
      description: 'Recarga de combustível para lança-chamas (dura 1 cena). Categoria I.',
    },
  };

  function getItemDefaultMaxCharges(item: RPGItem): number | undefined {
    const match =
      compendiumEntries.find(
        (e) => e.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      ) ||
      ORDEM_COMPENDIUM_ENTRIES.find(
        (e) => e.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
    if (typeof match?.metadata?.uses === 'number' && match.metadata.uses > 0) {
      return match.metadata.uses;
    }
    const ln = item.name.toLowerCase();
    if (
      ln.includes('spray de pimenta') ||
      ln.includes('taser') ||
      ln.includes('pistola de dardos') ||
      ln.includes('pistola sinalizadora')
    ) {
      return 2;
    }
    return undefined;
  }

  function handleOpenInterludeModal(forcedComfort?: 0.5 | 1 | 2 | 3) {
    if (!character || character.system !== 'ordem-paranormal') return;
    const inv = character.inventory || [];
    const rituals = characterAbilities.filter((a) => a.category === 'ritual');
    const skillsList: OrdemSkill[] = Array.isArray(rawSheet.skills) ? rawSheet.skills : [];
    const defaultSkill =
      skillsList.find((s) => s.id === 'investigacao') || skillsList[0];

    const targetComfort =
      forcedComfort ??
      (rawSheet.pendingInterlude?.comfort as 0.5 | 1 | 2 | 3 | undefined);
    if (targetComfort) {
      setInterludeComfort(targetComfort);
    }
    setInterludeExerciseCount(0);
    setInterludeReadCount(0);
    setInterludeMaintenance(false);
    setInterludeMaintenanceMode('repair');
    setInterludeMaintenanceItemId(inv[0]?.id || '');
    setInterludeMaintenanceAmmoKey('balas_curtas');
    setInterludeMaintenanceSealRitualId(rituals[0]?.id || '');
    setInterludeReviewCase(false);
    setInterludeReviewSkillId(defaultSkill?.id || 'investigacao');
    setInterludeParanormalDish(false);
    setInterludeParanormalNewPart(true);
    setIsInterludeModalOpen(true);
  }

  function handleApplyInterludeRecovery() {
    if (!character) return;
    const normOrig = String(rawSheet.origin || '').trim().toLowerCase();
    const charOriginObj = ORDEM_ORIGINS.find(
      (o) => o.id === normOrig || o.name.toLowerCase() === normOrig
    );
    const charOriginId = charOriginObj?.id || '';
    const upgradesPrecariousSleep =
      charOriginId === 'explorador' || charOriginId === 'mateiro';
    const effectiveSleepComfort =
      interludeComfort === 0.5 && upgradesPrecariousSleep ? 1 : interludeComfort;

    const peLimit = getOrdemPeLimit(levelOrNex, rawSheet.origin, characterAbilities);
    const sleepBaseRecovery = Math.max(1, Math.floor(peLimit * effectiveSleepComfort));
    const relaxBaseRecovery = Math.max(1, Math.floor(peLimit * interludeComfort));

    const dishes = [interludeDish, interludeSecondDish].filter(Boolean);
    const extraPv =
      dishes.filter((d) => d === 'nutritivo').length * (interludeSleep ? peLimit : 0);
    const extraPe =
      dishes.filter((d) => d === 'energetico').length * (interludeSleep ? peLimit : 0);
    const extraSan = dishes.filter((d) => d === 'favorito').length * (interludeRelax ? 2 : 0);

    // Antecipar Vitalidade: com cargas, o sono não recupera PV (pratos continuam valendo)
    const anteciparSleep = interludeSleep ? getAnteciparVitalidadeSleep(characterAbilities) : null;
    const pvGain = (interludeSleep && !anteciparSleep ? sleepBaseRecovery : 0) + extraPv;
    const peGain = (interludeSleep ? sleepBaseRecovery : 0) + extraPe;
    const sanGain = (interludeRelax ? relaxBaseRecovery : 0) + extraSan;

    const summaryParts: string[] = [];
    if (pvGain > 0 || peGain > 0 || sanGain > 0) {
      summaryParts.push(`+${pvGain} PV / +${peGain} PE / +${sanGain} SAN`);
    }
    if (anteciparSleep) {
      summaryParts.push(
        `Antecipar Vitalidade: sono sem cura de PV, -${anteciparSleep.charges - anteciparSleep.next} carga(s) (restam ${anteciparSleep.next})`
      );
    }
    if (interludeExerciseCount > 0) {
      summaryParts.push(`Exercitar-se +${interludeExerciseCount}d20 físico em estoque`);
    }
    if (interludeReadCount > 0) {
      summaryParts.push(`Ler +${interludeReadCount}d20 mental em estoque`);
    }

    let sealPeCost = 0;
    let sealRitual: CharacterAbility | undefined;
    let sealCircle = 1;

    if (interludeMaintenance && interludeMaintenanceMode === 'seal') {
      sealRitual = characterAbilities.find(
        (a) => a.category === 'ritual' && a.id === interludeMaintenanceSealRitualId
      );
      if (!sealRitual) {
        showHoverToast('Selecione um ritual conhecido para fabricar o Selo Paranormal.');
        return;
      }
      const rDef = findOrdemRitualDef(sealRitual.id) || findOrdemRitualDef(sealRitual.name);
      sealCircle =
        rDef?.circle ||
        (sealRitual.cost >= 10 ? 4 : sealRitual.cost >= 6 ? 3 : sealRitual.cost >= 3 ? 2 : 1);
      sealPeCost = getOrdemCircleBaseCost(sealCircle);

      const peBar = character.vitals.find((b) => b.id === 'pe');
      const peBonusMax = bonuses.vitalMax['pe'] || 0;
      const effPeMax = Math.max(1, (peBar?.max || 1) + peBonusMax);
      const peAfterSleep = Math.min(effPeMax, (peBar?.current || 0) + peGain);
      if (peAfterSleep < sealPeCost) {
        showHoverToast(
          `PE insuficiente para fabricar Selo de ${sealRitual.name} (custa ${sealPeCost} PE).`
        );
        return;
      }
    }

    const nextChar = applyLocalCharacterUpdate((base) => {
      const baseRaw = (base.sheetData || {}) as Record<string, any>;
      const prevBonusDice = baseRaw.interludeBonusDice || { physical: 0, mental: 0 };
      const nextBonusDice = {
        physical: Math.max(0, Number(prevBonusDice.physical || 0) + interludeExerciseCount),
        mental: Math.max(0, Number(prevBonusDice.mental || 0) + interludeReadCount),
      };

      let nextInventory: RPGItem[] = [...(base.inventory || [])];
      if (interludeMaintenance) {
        if (interludeMaintenanceMode === 'repair') {
          const targetItem = nextInventory.find((it) => it.id === interludeMaintenanceItemId);
          if (targetItem) {
            const isParaInvention = Boolean(
              targetItem.isParanormalInvention ||
                targetItem.name.toLowerCase().startsWith('invento paranormal')
            );
            const maxC = getItemDefaultMaxCharges(targetItem);
            if (isParaInvention) {
              nextInventory = nextInventory.map((it) =>
                it.id === targetItem.id ? { ...it, jammed: false, dailyUses: 0 } : it
              );
              summaryParts.push(
                `${targetItem.name} consertado (enguiço removido e DT resetada para 15)`
              );
            } else if (maxC || typeof targetItem.remainingCharges === 'number') {
              const restored = maxC ?? Math.max(2, targetItem.remainingCharges || 0);
              nextInventory = nextInventory.map((it) =>
                it.id === targetItem.id ? { ...it, remainingCharges: restored } : it
              );
              summaryParts.push(`${targetItem.name} recarregado/consertado (${restored} cargas)`);
            } else {
              summaryParts.push(`Manutenção realizada em ${targetItem.name}`);
            }
          }
        } else if (interludeMaintenanceMode === 'ammo') {
          const preset =
            INTERLUDE_AMMO_PRESETS[interludeMaintenanceAmmoKey] ||
            INTERLUDE_AMMO_PRESETS.balas_curtas;
          const existingIdx = nextInventory.findIndex(
            (it) => it.name.trim().toLowerCase() === preset.name.toLowerCase()
          );
          if (existingIdx >= 0) {
            nextInventory = nextInventory.map((it, idx) =>
              idx === existingIdx ? { ...it, quantity: (it.quantity || 1) + 1 } : it
            );
          } else {
            nextInventory.push({
              id: `item-ammo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: preset.name,
              slots: preset.slots,
              quantity: 1,
              category: preset.category,
              baseCategory: preset.category,
              itemKind: 'ammo',
              description: preset.description,
            });
          }
          summaryParts.push(`+1 ${preset.name}`);
        } else if (interludeMaintenanceMode === 'seal' && sealRitual) {
          nextInventory.push({
            id: `item-selo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: `Selo Paranormal (${sealRitual.name})`,
            slots: 1,
            quantity: 1,
            category: sealCircle,
            baseCategory: sealCircle,
            isParanormal: true,
            isCursedSpecial: false,
            itemKind: 'paranormal',
            element: (sealRitual.element as OrdemElement) || undefined,
            storedRitualName: sealRitual.name,
            storedRitualCircle: sealCircle,
            storedRitualCost: sealPeCost,
            storedRitualElement: sealRitual.element,
            description: `Selo Paranormal fabricado em Interlúdio contendo ${sealRitual.name} (${sealCircle}º Círculo, ${sealPeCost} PE). Ativar consome 1 unidade.`,
          });
          summaryParts.push(`Selo (${sealRitual.name}) fabricado (-${sealPeCost} PE)`);
        }
      }

      let permSanPenalty = 0;
      let nextSceneEffectsList: SceneEffect[] = Array.isArray(baseRaw.sceneEffects)
        ? [...baseRaw.sceneEffects]
        : [];
      let nextNexAfterDish = Number(baseRaw.nex ?? 5);

      if (charOriginId === 'chef_outro_lado' && interludeParanormalDish) {
        permSanPenalty = 1;
        const ingIdx = nextInventory.findIndex(
          (it) =>
            it.id.includes('ingrediente-paranormal') ||
            it.name.toLowerCase().includes('ingrediente paranormal')
        );
        if (ingIdx >= 0) {
          const curQty = nextInventory[ingIdx].quantity || 1;
          if (curQty > 1) {
            nextInventory = nextInventory.map((it, idx) =>
              idx === ingIdx ? { ...it, quantity: curQty - 1 } : it
            );
          } else {
            nextInventory = nextInventory.filter((_, idx) => idx !== ingIdx);
          }
        }

        const skillsListLocal: OrdemSkill[] = Array.isArray(baseRaw.skills) ? baseRaw.skills : [];
        const cookSk =
          skillsListLocal.find((s) => s.id === 'profissao') ||
          skillsListLocal.find((s) => s.id === 'ocultismo');
        const intVal =
          Number(baseRaw.attributes?.int || 1) + (bonuses.attributes['int'] || 0);
        const cookDice =
          intVal + bonuses.skillDiceAll + (bonuses.skillDice[cookSk?.id || 'profissao'] || 0);
        const cookMod =
          Number(cookSk?.trainingDegree || 0) +
          Number(cookSk?.otherModifier || 0) +
          bonuses.skillBonusAll +
          (bonuses.skillBonus[cookSk?.id || 'profissao'] || 0);
        const numD20 = getOrdemDiceRollCount(cookDice);
        const cookRolls: number[] = [];
        for (let i = 0; i < numD20; i++) {
          cookRolls.push(Math.floor(Math.random() * 20) + 1);
        }
        const keptCook = cookDice <= 0 ? Math.min(...cookRolls) : Math.max(...cookRolls);
        const cookTotal = keptCook + cookMod;
        const secretDt = 15 + (Math.floor(Math.random() * 20) + 1);
        const dishPassed = cookTotal >= secretDt;

        triggerCharacterRoll(
          `Fome do Outro Lado — Preparo (${interludeParanormalElement})`,
          cookDice,
          20,
          cookMod,
          true,
          false,
          cookRolls
        );

        nextSceneEffectsList = [
          ...nextSceneEffectsList.filter((e) => e.id !== 'orig-fome-outro-lado'),
          dishPassed
            ? {
                id: 'orig-fome-outro-lado',
                name: `Prato do Outro Lado (${interludeParanormalElement})`,
                source: 'Próxima Cena',
                description: `RD ${interludeParanormalElement} 10 até o fim da próxima cena`,
              }
            : {
                id: 'orig-fome-outro-lado',
                name: `Prato Instável do Outro Lado (${interludeParanormalElement})`,
                source: 'Próxima Cena',
                description: `Vulnerabilidade a dano de ${interludeParanormalElement} até o fim da próxima cena`,
              },
        ];

        const gainedOptionalNex =
          Boolean(baseRaw.useSeparateNexAndLevel) && interludeParanormalNewPart;
        if (gainedOptionalNex) {
          nextNexAfterDish = Math.min(99, nextNexAfterDish + 3);
        }

        summaryParts.push(
          `Fome do Outro Lado (${interludeParanormalElement}): -1 SAN Máx Perm.${
            gainedOptionalNex ? ' e +3% NEX (Regra Opcional)' : ''
          }`
        );
      }

      const nextVitals = base.vitals.map((bar) => {
        const bonusMax = bonuses.vitalMax[bar.id] || 0;
        const effectiveMax = Math.max(1, bar.max + bonusMax);
        if (bar.id === 'pv') {
          return { ...bar, current: Math.min(effectiveMax, bar.current + pvGain) };
        }
        if (bar.id === 'pe') {
          const afterGain = Math.min(effectiveMax, bar.current + peGain);
          return { ...bar, current: Math.max(0, afterGain - sealPeCost) };
        }
        if (bar.id === 'san') {
          const newBaseMax = Math.max(1, bar.max - permSanPenalty);
          const newEffMax = Math.max(1, newBaseMax + bonusMax);
          return {
            ...bar,
            max: newBaseMax,
            current: Math.max(0, Math.min(newEffMax, bar.current + sanGain - permSanPenalty)),
          };
        }
        return bar;
      });

      return {
        ...base,
        vitals: nextVitals,
        inventory: nextInventory,
        sheetData: {
          ...baseRaw,
          nex: nextNexAfterDish,
          sceneEffects: nextSceneEffectsList,
          interludeBonusDice: nextBonusDice,
          pendingInterlude: null,
          ...(anteciparSleep && Array.isArray(baseRaw.abilities)
            ? {
                abilities: (baseRaw.abilities as CharacterAbility[]).map((a) =>
                  a.id === anteciparSleep.abilityId ? { ...a, trackedCount: anteciparSleep.next } : a
                ),
              }
            : {}),
          // Possuído (SaH): recupera PP ao dormir
          ...(possessionInfo.active && interludeSleep
            ? { possessionPoints: Math.min(possessionInfo.max, possessionInfo.current + possessionInfo.perSleep) }
            : {}),
        },
      };
    }, false);

    if (interludeReviewCase) {
      const skillsList: OrdemSkill[] = Array.isArray(rawSheet.skills) ? rawSheet.skills : [];
      const sk =
        skillsList.find((s) => s.id === interludeReviewSkillId) || skillsList[0];
      if (sk) {
        const attrKey = sk.attribute;
        const attrVal =
          Number(rawSheet.attributes?.[attrKey] || 0) + (bonuses.attributes[attrKey] || 0);
        const diceCount =
          attrVal + bonuses.skillDiceAll + (bonuses.skillDice[sk.id] || 0);
        const rapidoBonus = dishes.filter((d) => d === 'rapido').length * 5;
        const modTotal =
          (sk.trainingDegree || 0) +
          (sk.otherModifier || 0) +
          bonuses.skillBonusAll +
          (bonuses.skillBonus[sk.id] || 0) +
          rapidoBonus;
        triggerCharacterRoll(
          `Interlúdio — Revisar Caso (${sk.name})${
            rapidoBonus > 0 ? ` [Prato Rápido +${rapidoBonus}]` : ''
          }`,
          diceCount,
          20,
          modTotal
        );
        summaryParts.push(`Revisar Caso (${sk.name})`);
      }
    }

    setIsInterludeModalOpen(false);
    if (nextChar) handleSaveSheet(nextChar);
    logSheetActivity({
      category: 'interlude',
      summary: `Concluiu Cena de Interlúdio (Descanso ${interludeComfort}x)`,
      details: summaryParts.join(' • ') || undefined,
      tone: 'info',
    });
    if (summaryParts.length > 0) {
      showHoverToast(`Interlúdio aplicado: ${summaryParts.join(' • ')}`);
    }
  }

  function handleOpenNexEvolutionModal() {
    if (!character || character.system !== 'ordem-paranormal') return;
    setEvoSourceFilter([]);
    setEvoTrailId(rawSheet.trail || '');
    setEvoMonstruosoElement('');
    setEvoNexProgChoices({});
    // Possuído (SaH, 10%): todo novo poder de ocultista vira Transcender
    setEvoChoiceMode(rawSheet.trail === 'possuido' ? 'transcend' : 'class_power');
    setEvoSelectedPowerId('');
    setEvoSkillTrainingPowerIds([]);
    setEvoPowerSearch('');
    setEvoPowerElementFilter('ALL');
    setEvoAttrKey('agi');
    // Monstruoso (SaH): a afinidade precisa ser o elemento escolhido na trilha
    const monstroEl = characterAbilities.find((a) => a.id === 'trail-monstruoso-10')?.chosenElement;
    setEvoAffinity(monstroEl || rawSheet.affinity || 'Sangue');
    setEvoUpgradeSkills([]);
    setEvoNewRitualId('');
    setEvoRitualSearch('');
    setEvoRitualElementFilter('ALL');
    setEvoRitualCircleFilter('ALL');
    setEvoShowAmaldicoarPrompt(false);
    setEvoExtraPowerRitualId('');
    setEvoExpansaoPowerId('');
    setIsNexEvolutionOpen(true);
  }

  function getNexEvolutionMissingSteps(
    currentNexVal: number,
    nextNexVal: number,
    milestoneObj: (typeof ORDEM_NEX_PROGRESSION)[number] | undefined
  ): string[] {
    if (!character || character.system !== 'ordem-paranormal') return [];
    const missing: string[] = [];
    if (currentNexVal >= 99) {
      missing.push('Agente já atingiu o limite máximo de 99% de NEX');
      return missing;
    }

    const activeTrail = evoTrailId || rawSheet.trail || '';
    if (!rawSheet.trail && nextNexVal >= 10 && rawSheet.characterClass !== 'mundano' && !activeTrail) {
      missing.push('Escolher sua Trilha de classe');
    }
    if (
      activeTrail === 'monstruoso' &&
      nextNexVal >= 10 &&
      !characterAbilities.find((a) => a.id === 'trail-monstruoso-10')?.chosenElement &&
      !evoMonstruosoElement
    ) {
      missing.push('Escolher o elemento do Monstruoso');
    }
    if (activeTrail === 'monstruoso' && nextNexVal >= 25) {
      const stored = characterAbilities.find((a) => a.id === 'trail-monstruoso-10')?.nexProgChoices;
      if (getMissingNexGeneralChoices(nextNexVal, { ...stored, ...evoNexProgChoices }).length > 0) {
        missing.push('Escolher as alterações da Progressão de NEX (25%/35%)');
      }
    }

    if (milestoneObj?.grantsClassPower || milestoneObj?.grantsVersatility) {
      if (!evoSelectedPowerId) {
        missing.push('Escolher 1 Poder (de Classe, Transcender ou Versatilidade)');
      } else if (evoChoiceMode !== 'versatility') {
        const pEntry =
          compendiumEntries.find((e) => e.id === evoSelectedPowerId) ||
          ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === evoSelectedPowerId);
        if (pEntry) {
          const pNameLower = pEntry.name.toLowerCase();
          if (evoChoiceMode === 'class_power' && pNameLower.includes('treinamento em perícia')) {
            const eligiblePowerSkills = (rawSheet.skills || []).filter((sk: any) => {
              const deg = Number(sk.trainingDegree || 0);
              return deg === 0 || (deg === 5 && nextNexVal >= 35) || (deg === 10 && nextNexVal >= 70);
            });
            const reqCount = Math.min(2, eligiblePowerSkills.length);
            if (reqCount > 0 && evoSkillTrainingPowerIds.length < reqCount) {
              missing.push(`Escolher ${reqCount} perícia(s) para Treinamento em Perícia`);
            }
          }
          if (
            evoChoiceMode === 'transcend' &&
            (pEntry.id === 'ord-para-aprender-ritual' || pNameLower.includes('aprender ritual')) &&
            !evoExtraPowerRitualId
          ) {
            missing.push('Escolher o ritual do poder Aprender Ritual');
          }
          if (
            evoChoiceMode === 'transcend' &&
            (pEntry.id === 'ord-para-conh-expansao' ||
              pNameLower.includes('expansão de conhecimento')) &&
            !evoExpansaoPowerId
          ) {
            missing.push('Escolher o poder de outra classe (Expansão de Conhecimento)');
          }
        }
      }
    }

    if (milestoneObj?.grantsAttributeIncrease) {
      const currVal = Number(rawSheet.attributes?.[evoAttrKey] ?? 1);
      if (currVal >= 5) {
        missing.push('Selecionar um atributo abaixo de 5 para o aumento');
      }
    }

    if (milestoneObj?.grantsTrainingUpgrade) {
      const clsObjLocal =
        ORDEM_CLASSES.find((c) => c.id === rawSheet.characterClass) || ORDEM_CLASSES[0];
      const effIntLocal =
        Number(rawSheet.attributes?.int ?? 1) +
        (milestoneObj.grantsAttributeIncrease && evoAttrKey === 'int' ? 1 : 0);
      const maxSkUp = (clsObjLocal.trainingUpgradeBase || 2) + Math.max(0, effIntLocal);
      const eligibleUpSkills = (rawSheet.skills || []).filter((s: any) =>
        nextNexVal >= 70 ? s.trainingDegree === 10 : s.trainingDegree === 5
      );
      const requiredSkCount = Math.min(maxSkUp, eligibleUpSkills.length);
      if (requiredSkCount > 0 && evoUpgradeSkills.length < requiredSkCount) {
        missing.push(
          `Escolher ${requiredSkCount} perícias para Grau de Treinamento (${evoUpgradeSkills.length}/${requiredSkCount})`
        );
      }
    }

    if (milestoneObj?.grantsAffinity && (!evoAffinity || evoAffinity === 'Nenhuma')) {
      missing.push('Escolher sua Afinidade Elemental (NEX 50%)');
    }

    if (rawSheet.characterClass === 'ocultista') {
      const maxCircle = nextNexVal >= 85 ? 4 : nextNexVal >= 55 ? 3 : nextNexVal >= 25 ? 2 : 1;
      const spellPool =
        compendiumEntries.filter((e) => e.category === 'spell').length > 0
          ? compendiumEntries.filter((e) => e.category === 'spell')
          : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'spell');
      const hasUnlearnedRitual = spellPool.some(
        (r) =>
          matchesContentSourceFilter(
            resolveEntrySourceId(r, 'ordem-paranormal'),
            [],
            campaignAllowedSources,
            'ordem-paranormal'
          ) &&
          (r.metadata?.circle || 1) <= maxCircle &&
          !isOrdemRitualAlreadyOwned(r, characterAbilities)
      );
      if (hasUnlearnedRitual && !evoNewRitualId) {
        missing.push('Escolher +1 Novo Ritual aprendido para este NEX');
      }
    }

    return missing;
  }

  function handleConfirmNexEvolution() {
    if (!character || character.system !== 'ordem-paranormal') return;
    const currentNex = Number(rawSheet.nex ?? 5);
    const nextNex = currentNex === 0 ? 5 : currentNex === 95 ? 99 : Math.min(99, currentNex + 5);
    const milestone = ORDEM_NEX_PROGRESSION.find((m) => m.nex === nextNex);

    const missingSteps = getNexEvolutionMissingSteps(currentNex, nextNex, milestone);
    if (missingSteps.length > 0) {
      showHoverToast(`Complete as escolhas obrigatórias antes de evoluir: ${missingSteps.join(' • ')}`);
      return;
    }

    const nextAttributes = {
      agi: Number(rawSheet.attributes?.agi ?? 1),
      for: Number(rawSheet.attributes?.for ?? 1),
      int: Number(rawSheet.attributes?.int ?? 1),
      pre: Number(rawSheet.attributes?.pre ?? 1),
      vig: Number(rawSheet.attributes?.vig ?? 1),
    };

    if (milestone?.grantsAttributeIncrease) {
      nextAttributes[evoAttrKey] = Math.min(5, nextAttributes[evoAttrKey] + 1);
    }

    const didTranscend =
      Boolean(milestone?.grantsClassPower || milestone?.grantsVersatility) &&
      evoChoiceMode === 'transcend';
    const nextTranscendedCount =
      Number(rawSheet.transcendedCount ?? 0) + (didTranscend ? 1 : 0);

    const chosenTrailId = evoTrailId || rawSheet.trail || undefined;
    let nextAbilities = [...characterAbilities];
    const nextProficiencies: string[] = Array.isArray(rawSheet.proficiencies)
      ? [...rawSheet.proficiencies]
      : [];
    const nextAttacks: PreparedAttack[] = [...(character.attacks || [])];
    const nextInventory: RPGItem[] = [...(character.inventory || [])];
    let trainedFromPowerIds: string[] = [];

    // Helper local para aplicar proficiências/ataques automáticos ao ganhar um poder de classe
    function applyPowerAutoGrants(entry: CompendiumEntryData) {
      const lowerPowerName = entry.name.toLowerCase();
      if (
        lowerPowerName.includes('armamento pesado') &&
        !nextProficiencies.some((p) => p.toLowerCase().includes('armas pesadas'))
      ) {
        nextProficiencies.push('Armas pesadas');
      }
      if (
        (lowerPowerName.includes('balística avançada') ||
          lowerPowerName.includes('balistica avancada')) &&
        !nextProficiencies.some((p) => p.toLowerCase().includes('armas táticas de fogo'))
      ) {
        nextProficiencies.push('Armas táticas de fogo');
      }
      if (
        lowerPowerName.includes('ninja urbano') &&
        !nextProficiencies.some((p) => p.toLowerCase().includes('corpo a corpo e de disparo'))
      ) {
        nextProficiencies.push('Armas táticas corpo a corpo e de disparo');
      }
      if (
        (lowerPowerName.includes('proteção pesada') ||
          lowerPowerName.includes('protecao pesada')) &&
        !nextProficiencies.some(
          (p) =>
            p.toLowerCase().includes('proteções pesadas') ||
            p.toLowerCase().includes('protecoes pesadas')
        )
      ) {
        nextProficiencies.push('Proteções pesadas (e Escudos)');
      }
      if (
        lowerPowerName.includes('mira de elite') &&
        !nextProficiencies.some((p) => p.toLowerCase().includes('balas longas'))
      ) {
        nextProficiencies.push('Armas de fogo (balas longas)');
      }
      if (
        lowerPowerName.includes('artista marcial') &&
        !nextAttacks.some((a) => a.isUnarmed || a.name.toLowerCase().includes('desarmado'))
      ) {
        const lutaSk = Array.isArray(rawSheet.skills)
          ? rawSheet.skills.find((s: any) => s.id === 'luta')
          : null;
        const dieSides = nextNex >= 70 ? 10 : nextNex >= 35 ? 8 : 6;
        nextAttacks.push({
          id: `atk-unarmed-${Math.random().toString(36).slice(2, 7)}`,
          name: 'Ataque Desarmado (Artista Marcial)',
          diceCount: Math.max(1, nextAttributes.for, nextAttributes.agi),
          attackBonus:
            Number(lutaSk?.trainingDegree ?? 0) + Number(lutaSk?.otherModifier ?? 0),
          damageFormula: `1d${dieSides}`,
          critRange: '20/x2',
          damageType: 'Impacto',
          isMelee: true,
          isFirearm: false,
          isUnarmed: true,
        });
      }
    }

    // Sincronizar poderes de Trilha até o novo NEX
    if (chosenTrailId && nextNex >= 10) {
      const trail = ORDEM_TRAILS.find((t) => t.id === chosenTrailId);
      if (trail) {
        const previousTrailAbilities = nextAbilities;
        const storedMonstroEl = previousTrailAbilities.find((a) => a.id === 'trail-monstruoso-10')?.chosenElement;
        const trailLabel =
          trail.id === 'monstruoso' && (storedMonstroEl || evoMonstruosoElement)
            ? `${trail.name} de ${storedMonstroEl || evoMonstruosoElement}`
            : trail.name;
        nextAbilities = nextAbilities.filter(
          (ab) => !ab.id.startsWith('trail-') && !ab.name.startsWith('Trilha ')
        );
        for (const tp of trail.powers) {
          if (nextNex >= tp.nex) {
            const id = `trail-${trail.id}-${tp.nex}`;
            const ability = buildTrailAbility(trail, tp, previousTrailAbilities.find((a) => a.id === id), trailLabel);
            // Monstruoso (SaH): elemento escolhido junto com a trilha; depois fica fixo
            if (id === 'trail-monstruoso-10' && !ability.chosenElement && evoMonstruosoElement) {
              ability.chosenElement = evoMonstruosoElement;
            }
            if (id === 'trail-monstruoso-10' && Object.keys(evoNexProgChoices).length > 0) {
              ability.nexProgChoices = { ...evoNexProgChoices, ...(ability.nexProgChoices || {}) };
            }
            nextAbilities.push(ability);
          }
        }
        if (
          trail.id === 'atirador_elite' &&
          !nextProficiencies.some((p) => p.toLowerCase().includes('balas longas'))
        ) {
          nextProficiencies.push('Armas de fogo (balas longas)');
        }
        if (
          trail.id === 'lamina_paranormal' &&
          nextNex >= 10 &&
          !nextAbilities.some((ab) => ab.name.toLowerCase().includes('amaldiçoar arma'))
        ) {
          const baseAmaldicoar =
            compendiumEntries.find((e) => e.id === 'ord-rit-amaldicoar-arma') ||
            ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === 'ord-rit-amaldicoar-arma');
          nextAbilities.push({
            id: 'rit-lamina-maldita-amaldicoar',
            name: 'Amaldiçoar Arma — Sangue (Lâmina Maldita)',
            category: 'ritual',
            cost: 1,
            element: 'Sangue',
            description:
              baseAmaldicoar?.description ||
              'Imbui uma arma com dano elemental (+1d6 / +2d6 Discente / +4d6 Verdadeiro). Pode gastar +1 PE para conjurar como ação de movimento.',
            isActive: false,
            modifiers: [],
          });
        }
        if (
          trail.id === 'graduado' &&
          nextNex >= 40 &&
          !nextInventory.some(
            (it) =>
              it.name.toLowerCase().includes('grimório') ||
              it.name.toLowerCase().includes('grimorio')
          )
        ) {
          nextInventory.push({
            id: 'item-grimorio-ritualistico',
            name: 'Grimório Ritualístico',
            slots: 1,
            quantity: 1,
            category: 0,
            description:
              'Grimório especial de Ocultista Graduado (40%): armazena seus rituais extras (até seu Intelecto).',
          });
        }
        if (rawSheet.characterClass === 'ocultista' && nextNex === 99) {
          const trail99Map: Record<string, string> = {
            conduite: 'ord-rit-canalizar-medo',
            flagelador: 'ord-rit-medo-tangivel',
            graduado: 'ord-rit-conhecendo-medo',
            intuitivo: 'ord-rit-presenca-medo',
            lamina_paranormal: 'ord-rit-lamina-medo',
          };
          const fearRitualId = trail99Map[trail.id];
          if (fearRitualId) {
            const rEntry99 =
              compendiumEntries.find((e) => e.id === fearRitualId) ||
              ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === fearRitualId);
            if (
              rEntry99 &&
              !nextAbilities.some(
                (ab) =>
                  ab.id.includes(fearRitualId) ||
                  ab.name.toLowerCase().includes(rEntry99.name.split(' (')[0].toLowerCase())
              )
            ) {
              nextAbilities.push({
                id: `rit-nex99-${rEntry99.id}`,
                name: rEntry99.name,
                category: 'ritual',
                cost: rEntry99.cost,
                element: 'Medo',
                description: rEntry99.description,
                damageFormula: rEntry99.metadata?.damageFormula,
                isActive: false,
                modifiers: rEntry99.modifiers || [],
              });
            }
          }
        }
      }
    }

    // Adicionar Poder de Classe, Poder Paranormal (Transcender / Afinidade) ou Versatilidade (NEX 50%)
    if (
      (milestone?.grantsClassPower || milestone?.grantsVersatility) &&
      evoSelectedPowerId
    ) {
      if (milestone?.grantsVersatility && evoChoiceMode === 'versatility') {
        const versTrailId = evoSelectedPowerId.replace('versatility:', '');
        const versTrail = ORDEM_TRAILS.find((t) => t.id === versTrailId);
        const p10 = versTrail?.powers.find((p) => p.nex === 10);
        if (versTrail && p10) {
          nextAbilities.push({
            id: `versatility-${versTrail.id}-10`,
            name: `Versatilidade (${versTrail.name} 10%): ${p10.name}`,
            category: 'classe',
            cost: p10.cost,
            description: p10.description,
            isActive: p10.cost === 0,
            modifiers: p10.modifiers || [],
          });
          if (
            versTrail.id === 'atirador_elite' &&
            !nextProficiencies.some((p) => p.toLowerCase().includes('balas longas'))
          ) {
            nextProficiencies.push('Armas de fogo (balas longas)');
          }
        }
      } else {
        const pEntry =
          compendiumEntries.find((e) => e.id === evoSelectedPowerId) ||
          ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === evoSelectedPowerId);
        if (pEntry) {
          const reqValidation = checkOrdemPowerRequirements(
            pEntry,
            { ...(rawSheet as OrdemSheetData), nex: nextNex, attributes: nextAttributes },
            characterAbilities
          );
          if (!reqValidation.met) {
            showHoverToast(
              `Você não cumpre os pré-requisitos para escolher ${pEntry.name} (Falta: ${reqValidation.missing.join(', ')})!`
            );
            return;
          }
          const existingIdx = nextAbilities.findIndex(
            (ab) => ab.name.trim().toLowerCase() === pEntry.name.trim().toLowerCase()
          );
          if (existingIdx >= 0 && evoChoiceMode === 'transcend') {
            // Upgrade de Afinidade do Poder Paranormal
            const existingAb = nextAbilities[existingIdx];
            let upgradedModifiers = existingAb.modifiers || pEntry.modifiers || [];
            if (
              pEntry.id === 'ord-para-mort-potencial-aprimorado' ||
              pEntry.name.toLowerCase().includes('potencial aprimorado')
            ) {
              upgradedModifiers = [
                { id: 'm-pot-aprim-af', targetType: 'vital_max', targetKey: 'pe', value: 2, scaleWithLevel: true },
              ];
            } else if (
              pEntry.id === 'ord-para-sang-sangue-ferro' ||
              pEntry.name.toLowerCase().includes('sangue de ferro')
            ) {
              upgradedModifiers = [
                { id: 'm2', targetType: 'vital_max', targetKey: 'pv', value: 2, scaleWithLevel: true },
                { id: 'm-sf-fort-af', targetType: 'skill_bonus', targetKey: 'fortitude', value: 5 },
              ];
            } else if (pEntry.id === 'sah-para-sang-espreitar-besta' || pEntry.name.toLowerCase().includes('espreitar da besta')) {
              // Espreitar da Besta (SaH): Furtividade +5 -> +10
              upgradedModifiers = [
                { id: 'm-sah-espreitar-fur', targetType: 'skill_bonus', targetKey: 'furtividade', value: 10 },
              ];
            }
            nextAbilities[existingIdx] = {
              ...existingAb,
              name: `${pEntry.name} (Afinidade)`,
              category: 'poder_paranormal',
              hasAffinityUpgrade: true,
              modifiers: upgradedModifiers,
            };
          } else {
            const requiresManualToggle =
              pEntry.id === 'ord-pwr-comb-defensivo' ||
              pEntry.id === 'ord-pwr-comb-duas-armas' ||
              pEntry.name.toLowerCase().includes('combate defensivo') ||
              pEntry.name.toLowerCase().includes('combater com duas armas');

            nextAbilities.push({
              id: `nex-${nextNex}-${pEntry.id}`,
              name: pEntry.name,
              sourceId: resolveEntrySourceId(pEntry, 'ordem-paranormal'),
              category:
                pEntry.category === 'paranormal_power' || evoChoiceMode === 'transcend'
                  ? 'poder_paranormal'
                  : 'poder',
              cost: pEntry.cost,
              element: pEntry.metadata?.element,
              description: pEntry.description,
              isActive: pEntry.cost === 0 && !requiresManualToggle,
              modifiers: pEntry.modifiers || [],
            });

            applyPowerAutoGrants(pEntry);
            if (
              pEntry.name.toLowerCase().includes('treinamento em perícia') &&
              evoSkillTrainingPowerIds.length > 0
            ) {
              trainedFromPowerIds = [...evoSkillTrainingPowerIds];
            }
            // Aprender Ritual (Poder Paranormal): adiciona também o ritual escolhido
            if (
              (pEntry.id === 'ord-para-aprender-ritual' ||
                pEntry.name.toLowerCase().includes('aprender ritual')) &&
              evoExtraPowerRitualId
            ) {
              const [exRitId, exEl] = evoExtraPowerRitualId.split(':');
              const rExtra =
                compendiumEntries.find((e) => e.id === exRitId) ||
                ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === exRitId);
              if (rExtra) {
                nextAbilities.push({
                  id: exEl
                    ? `rit-aprender-${nextNex}-${rExtra.id}-${exEl.toLowerCase()}`
                    : `rit-aprender-${nextNex}-${rExtra.id}`,
                  name: exEl ? `Amaldiçoar Arma — ${exEl} (1º Círculo)` : rExtra.name,
                  category: 'ritual',
                  cost: rExtra.cost,
                  element: exEl || rExtra.metadata?.element,
                  description: rExtra.description,
                  damageFormula: rExtra.metadata?.damageFormula,
                  isActive: false,
                  modifiers: rExtra.modifiers || [],
                });
              }
            }
            // Expansão de Conhecimento: adiciona também o poder de outra classe escolhido
            if (
              (pEntry.id === 'ord-para-conh-expansao' ||
                pEntry.name.toLowerCase().includes('expansão de conhecimento')) &&
              evoExpansaoPowerId
            ) {
              const expEntry =
                compendiumEntries.find((e) => e.id === evoExpansaoPowerId) ||
                ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === evoExpansaoPowerId);
              if (expEntry) {
                nextAbilities.push({
                  id: `expansao-${nextNex}-${expEntry.id}`,
                  name: `${expEntry.name} (Expansão)`,
                  category: 'poder',
                  cost: expEntry.cost,
                  description: expEntry.description,
                  isActive: expEntry.cost === 0,
                  modifiers: expEntry.modifiers || [],
                });
                applyPowerAutoGrants(expEntry);
              }
            }
          }
        }
      }
    }

    // Adicionar Novo Ritual aprendido (Ocultista aprende +1 ritual a cada NEX, com suporte a Elemento em Amaldiçoar Arma)
    if (evoNewRitualId) {
      const [baseRitId, chosenEl] = evoNewRitualId.split(':');
      const rEntry =
        compendiumEntries.find((e) => e.id === baseRitId) ||
        ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === baseRitId);
      if (rEntry) {
        const isAmaldicoar =
          rEntry.id === 'ord-rit-amaldicoar-arma' ||
          rEntry.name.toLowerCase().includes('amaldiçoar arma');
        const finalName = chosenEl
          ? `Amaldiçoar Arma — ${chosenEl} (1º Círculo)`
          : rEntry.name;
        const finalDesc = chosenEl
          ? `[Elemento: ${chosenEl}] ${rEntry.description}`
          : rEntry.description;
        nextAbilities.push({
          id: chosenEl
            ? `rit-nex-${nextNex}-${rEntry.id}-${chosenEl.toLowerCase()}`
            : `rit-nex-${nextNex}-${rEntry.id}`,
          name: finalName,
          sourceId: resolveEntrySourceId(rEntry, 'ordem-paranormal'),
          category: 'ritual',
          cost: rEntry.cost,
          element: chosenEl || rEntry.metadata?.element,
          description: finalDesc,
          damageFormula: isAmaldicoar ? undefined : rEntry.metadata?.damageFormula,
          isActive: false,
          modifiers: rEntry.modifiers || [],
        });
      }
    }

    // Atualizar grau de treinamento de perícias (35% Veterano +10, 70% Expert +15 e poder Treinamento em Perícia)
    const targetDegree: 10 | 15 = nextNex >= 70 ? 15 : 10;
    const nextSkills = Array.isArray(rawSheet.skills)
      ? rawSheet.skills.map((sk: any) => {
          let updatedSk =
            milestone?.grantsTrainingUpgrade && evoUpgradeSkills.includes(sk.id)
              ? { ...sk, trainingDegree: targetDegree }
              : sk;
          if (trainedFromPowerIds.includes(updatedSk.id)) {
            const currDeg = Number(updatedSk.trainingDegree || 0);
            const nextDeg =
              currDeg === 0
                ? 5
                : currDeg === 5 && nextNex >= 35
                ? 10
                : currDeg === 10 && nextNex >= 70
                ? 15
                : currDeg;
            updatedSk = { ...updatedSk, trainingDegree: nextDeg };
          }
          return updatedSk;
        })
      : [];

    // Poderes gerais (SaH) escolhidos na evolução: "treina a perícia ou +2"
    const evoGrants = applyGeneralPowerSkillGrants(characterAbilities, nextAbilities, nextSkills);
    nextAbilities.splice(0, nextAbilities.length, ...evoGrants.abilities);
    nextSkills.splice(0, nextSkills.length, ...evoGrants.skills);

    // Recalcular PV, PE e SAN máximos oficiais para o novo NEX
    const newBaseVitals = calculateOrdemBaseVitals({
      characterClass: rawSheet.characterClass || 'combatente',
      attributes: nextAttributes,
      nex: nextNex,
      originIdOrName: rawSheet.origin,
      transcendedCount: nextTranscendedCount,
    });

    const newBonuses = calculateActiveBonuses(
      'ordem-paranormal',
      nextNex,
      nextAbilities,
      nextInventory,
      activeConditions
    );

    const updatedVitals = character.vitals.map((bar) => {
      const oldEffectiveMax = bar.max + (bonuses.vitalMax[bar.id] || 0);
      if (bar.id === 'pv') {
        const newEffectiveMax = newBaseVitals.pvMax + (newBonuses.vitalMax.pv || 0);
        const delta = Math.max(0, newEffectiveMax - oldEffectiveMax);
        return {
          ...bar,
          max: newBaseVitals.pvMax,
          current: Math.min(newEffectiveMax, bar.current + delta),
        };
      }
      if (bar.id === 'pe') {
        const newEffectiveMax = newBaseVitals.peMax + (newBonuses.vitalMax.pe || 0);
        const delta = Math.max(0, newEffectiveMax - oldEffectiveMax);
        return {
          ...bar,
          max: newBaseVitals.peMax,
          current: Math.min(newEffectiveMax, bar.current + delta),
        };
      }
      if (bar.id === 'san') {
        const newEffectiveMax = newBaseVitals.sanMax + (newBonuses.vitalMax.san || 0);
        const delta = Math.max(0, newEffectiveMax - oldEffectiveMax);
        return {
          ...bar,
          max: newBaseVitals.sanMax,
          current: Math.min(newEffectiveMax, bar.current + delta),
        };
      }
      return bar;
    });

    const nextChar = applyLocalCharacterUpdate(
      (base) => ({
        ...base,
        vitals: updatedVitals,
        attacks: nextAttacks,
        inventory: nextInventory,
        sheetData: {
          ...((base.sheetData || {}) as Record<string, any>),
          nex: nextNex,
          trail: chosenTrailId,
          affinity: milestone?.grantsAffinity ? evoAffinity : rawSheet.affinity,
          transcendedCount: nextTranscendedCount,
          proficiencies: nextProficiencies,
          attributes: nextAttributes,
          skills: nextSkills,
          abilities: nextAbilities,
        },
      }),
      false
    );

    setIsNexEvolutionOpen(false);
    if (nextChar) handleSaveSheet(nextChar);
  }

  const availableConditions = compendiumEntries.filter((e) => e.category === 'condition');

  const pvBarForStatus = character.vitals.find((v) => v.id === 'pv');
  const pvMaxForStatus = pvBarForStatus
    ? Math.max(1, pvBarForStatus.max + (bonuses.vitalMax['pv'] || 0))
    : 1;
  const isCharacterMachucado = pvBarForStatus
    ? pvBarForStatus.current <= Math.floor(pvMaxForStatus / 2)
    : false;

  const initSkill = Array.isArray(rawSheet.skills)
    ? rawSheet.skills.find((s: any) => s.id === 'iniciativa')
    : null;

  let initDiceCount = 1;
  let initTotalBonus = 0;

  if (character.system === 'ordem-paranormal') {
    const baseAgi = Number(rawSheet.attributes?.agi ?? 1) + (bonuses.attributes['agi'] || 0);
    const extraDice = bonuses.skillDiceAll + (bonuses.skillDice['iniciativa'] || 0);
    initDiceCount = Math.max(1, baseAgi + extraDice);
    initTotalBonus =
      Number(initSkill?.trainingDegree ?? 0) +
      Number(initSkill?.otherModifier ?? 0) +
      bonuses.skillBonusAll +
      (bonuses.skillBonus['iniciativa'] || 0);
  } else {
    const halfLv = Math.floor(levelOrNex / 2);
    const baseDes = Number(rawSheet.attributes?.destreza ?? 1) + (bonuses.attributes['destreza'] || 0);
    const trainVal = initSkill?.isTrained ? (levelOrNex >= 15 ? 6 : levelOrNex >= 7 ? 4 : 2) : 0;
    initDiceCount = 1;
    initTotalBonus =
      halfLv +
      baseDes +
      trainVal +
      Number(initSkill?.otherModifier ?? 0) +
      bonuses.skillBonusAll +
      (bonuses.skillBonus['iniciativa'] || 0);
  }

  const maxTradeQty = itemToTradeModal ? Math.max(1, itemToTradeModal.quantity || 1) : 1;

  return (
    <div className="flex flex-col gap-6">
      {showDeathModal && (
        <DeathModal
          name={character.name}
          portraitUrl={character.portraitUrl}
          detail="Iniciou o último turno morrendo nesta cena."
          onClose={closeDeathModal}
        />
      )}
      {/* Faixa fixa de vitais (celular): sempre à vista enquanto o jogador rola a ficha */}
      <div className="md:hidden sticky top-14 z-30 -mx-[var(--trpg-gutter)] px-[var(--trpg-gutter)] py-2 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex gap-3">
        {character.vitals.map((bar) => {
          const max = Math.max(1, bar.max + (bonuses.vitalMax[bar.id] || 0));
          const color =
            bar.id === 'pv' ? 'var(--trpg-pv)' : bar.id === 'san' ? 'var(--trpg-san)' : bar.id === 'pe' ? 'var(--trpg-pe)' : bar.color;
          const extra = bar.id === 'pv' ? tempHp : bar.id === 'pe' ? tempPe : 0;
          return (
            <div key={bar.id} className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1 text-xs">
                <span className="text-zinc-400 truncate">{bar.id.toUpperCase()}</span>
                <span className="trpg-num font-semibold text-zinc-100">
                  {bar.current}
                  <span className="text-zinc-500">/{max}</span>
                  {extra > 0 && <span className="text-cyan-300"> +{extra}</span>}
                </span>
              </div>
              <div className="trpg-meter h-1.5! mt-1">
                <div className="trpg-meter-fill" style={{ width: `${Math.max(0, Math.min(100, (bar.current / max) * 100))}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {hoverToastMsg && (
        <div className="fixed bottom-6 right-6 z-[60] bg-red-950/95 border border-red-500 text-red-100 px-4 py-3 rounded-xl shadow-2xl text-xs font-extrabold flex items-center gap-2 animate-fade-in">
          <span>{hoverToastMsg}</span>
        </div>
      )}

      {/* MODAL DE CONVOCAÇÃO DE INICIATIVA ENVIADO PELO MESTRE */}
      {showInitiativePrompt && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="text-5xl"><Icon name="swords" /></div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                Chamado do Mestre
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1">
                Hora de Rolar Iniciativa!
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Um encontro começou! Clique abaixo para rolar sua perícia de Iniciativa e entrar automaticamente na ordem de turnos da mesa.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowInitiativePrompt(false);
                triggerCharacterRoll(
                  'Teste de Iniciativa',
                  initDiceCount,
                  20,
                  initTotalBonus,
                  false,
                  true
                );
              }}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-extrabold transition cursor-pointer shadow-lg shadow-amber-900/40"
            >
              <Icon name="d20" /> Rolar Iniciativa ({initDiceCount}d20
              {initTotalBonus >= 0 ? `+${initTotalBonus}` : initTotalBonus})
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE PASSAR ITEM PARA ALIADO DA MESA (ETAPA 4E - COM SELETOR DE QUANTIDADE) */}
      {itemToTradeModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleConfirmTransfer}
            className="bg-zinc-900 border-2 border-blue-500 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3.5">
                {itemToTradeModal.imageUrl && (
                  <img
                    src={itemToTradeModal.imageUrl}
                    alt={itemToTradeModal.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/70 shadow-lg shrink-0 bg-zinc-950"
                  />
                )}
                <div>
                  <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">
                    <Icon name="handshake" /> Passar Item para Aliado
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    {itemToTradeModal.name}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    Disponível na sua mochila: <strong>{maxTradeQty}x</strong> ({itemToTradeModal.slots} esp. cada)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemToTradeModal(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                1. Escolha qual companheiro da mesa receberá o item:
              </label>
              {tradeAllies.length === 0 ? (
                <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/60 p-3 rounded-xl">
                  Não há outros personagens vinculados a esta campanha no momento.
                </p>
              ) : (
                <select
                  required
                  value={selectedAllyId}
                  onChange={(e) => setSelectedAllyId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  <option value="">-- Selecione um aliado da mesa --</option>
                  {tradeAllies.map((ally) => (
                    <option key={ally.id} value={ally.id}>
                      {ally.name} (Jogador: @{ally.owner.username})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Se o jogador tiver mais de 1 unidade, permite escolher quantas quer passar */}
            {maxTradeQty > 1 && (
              <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-200">
                    2. Quantidade a entregar:
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Você ficará com: {Math.max(0, maxTradeQty - tradeQuantity)}x
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTradeQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg font-mono font-bold text-white cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxTradeQty}
                    required
                    value={tradeQuantity}
                    onChange={(e) =>
                      setTradeQuantity(Math.max(1, Math.min(maxTradeQty, Number(e.target.value))))
                    }
                    className="w-16 bg-zinc-900 border border-blue-500/80 rounded-lg py-1 text-center font-mono text-sm font-extrabold text-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setTradeQuantity((q) => Math.min(maxTradeQty, q + 1))}
                    className="w-8 h-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg font-mono font-bold text-white cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeQuantity(maxTradeQty)}
                    className="px-2 h-8 bg-zinc-900 hover:bg-blue-600 border border-zinc-700 rounded-lg font-mono text-xs font-bold text-blue-400 hover:text-white cursor-pointer"
                  >
                    Tudo
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToTradeModal(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedAllyId || isTransferring}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white rounded-lg text-xs font-extrabold cursor-pointer shadow"
              >
                {isTransferring ? 'Entregando...' : `Entregar (${tradeQuantity}x)`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL EXPLICATIVO DE CONDIÇÃO */}
      {selectedConditionModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-xl"><Icon name="sangue" /></span>
                <div>
                  <span className="text-[10px] font-mono uppercase text-red-400 font-bold">
                    Condição Ativa no Personagem
                  </span>
                  <h3 className="text-lg font-extrabold text-white">
                    {selectedConditionModal.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConditionModal(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              {selectedConditionModal.description}
            </p>

            {selectedConditionModal.modifiers && selectedConditionModal.modifiers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-400">Penalidades / Efeitos Automáticos:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedConditionModal.modifiers.map((m) => (
                    <span
                      key={m.id}
                      className="text-xs font-mono bg-red-950/60 text-red-300 border border-red-800/60 px-2.5 py-1 rounded"
                    >
                      <Icon name="zap" /> {m.targetType} [{m.targetKey}]: {m.value >= 0 ? `+${m.value}` : m.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {canMasterControl && (
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(selectedConditionModal.id)}
                  className="px-4 py-2 bg-red-900/70 hover:bg-red-800 text-red-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Remover Condição (Mestre)
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedConditionModal(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM DO RETRATO DO PERSONAGEM */}
      {isPortraitZoomOpen && character.portraitUrl && (
        <div
          onClick={() => setIsPortraitZoomOpen(false)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 overflow-y-auto cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-4 max-w-2xl w-full flex flex-col items-center gap-3 shadow-2xl"
          >
            <img
              src={character.portraitUrl}
              alt={character.name}
              className="max-h-[75vh] w-auto object-contain rounded-2xl"
            />
            <div className="flex justify-between items-center w-full px-2">
              <span className="text-base font-extrabold text-white">{character.name}</span>
              <button
                type="button"
                onClick={() => setIsPortraitZoomOpen(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAINEL HERO DA FICHA: RETRATO EM GRANDE DESTAQUE + CABEÇALHO + BARRAS VITAIS */}
      <div className="trpg-card trpg-card-signature p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-stretch">
        {/* Coluna Esquerda: Retrato Grande do Personagem */}
        <div className="flex flex-col items-center gap-3 shrink-0 self-center sm:self-start">
          {character.portraitUrl ? (
            <div
              onClick={() => setIsPortraitZoomOpen(true)}
              title="Clique para ampliar o retrato do personagem"
              className="w-32 h-32 sm:w-40 sm:h-40 lg:w-52 lg:h-52 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 cursor-zoom-in group relative"
            >
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute bottom-2 right-2 bg-black/75 text-amber-400 border border-amber-500/50 px-2 py-0.5 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                <Icon name="search" /> Ampliar
              </span>
            </div>
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-52 lg:h-52 rounded-xl bg-zinc-950 border border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-300">
              <span className="text-5xl trpg-display">
                {character.name.substring(0, 2).toUpperCase()}
              </span>
              <span className="text-[11px] text-zinc-500 font-medium px-4 text-center">
                {isEditMode
                  ? 'Envie uma arte para o seu personagem abaixo'
                  : 'Sem retrato cadastrado'}
              </span>
            </div>
          )}

          {isEditMode && (
            <div className="w-full">
              <ImageUploadField
                compact
                label="Retrato do Personagem"
                value={character.portraitUrl || ''}
                onChange={(newUrl) =>
                  setCharacter((prev) =>
                    prev ? { ...prev, portraitUrl: newUrl } : null
                  )
                }
              />
            </div>
          )}
        </div>

        {/* Coluna Direita: Identificação, Condições, Ações e Barras Vitais */}
        <div className="flex-1 flex flex-col justify-between gap-5 w-full">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm text-zinc-400">
                    {campaign ? campaign.name : 'Livre no cofre'}
                  </span>
                  {isLockedByMaster && (
                    <span className="trpg-badge bg-red-950/70! text-red-200!">
                      <Icon name="lock" size={12} /> Travada pelo mestre
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 mt-1">
                  {isEditMode && canEditAttributes ? (
                    <input
                      type="text"
                      value={character.name}
                      onChange={(e) =>
                        setCharacter((prev) => (prev ? { ...prev, name: e.target.value } : null))
                      }
                      placeholder="Nome do Personagem"
                      className="trpg-input text-xl font-semibold max-w-md"
                    />
                  ) : (
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <h2 className="text-3xl sm:text-4xl leading-tight">
                        {character.name}
                      </h2>
                      {(rawSheet.personalProfile?.age || rawSheet.personalProfile?.pronouns) && (
                        <span className="text-xs font-medium text-zinc-400 bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 rounded-full">
                          {[rawSheet.personalProfile?.age, rawSheet.personalProfile?.pronouns]
                            .filter(Boolean)
                            .join(' • ')}
                        </span>
                      )}
                    </div>
                  )}

                  {activeConditions.map((cond) => (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setSelectedConditionModal(cond)}
                      title="Clique para ver os detalhes desta condição"
                      className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/70 text-red-200 border border-red-800/80 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Icon name="warning" size={13} /> {cond.name}
                    </button>
                  ))}

                  {showDyingTracker && <DyingTracker max={getDyingTurnsToDie(characterAbilities)} turns={dyingTurns} dead={Boolean(deathAt)} />}

                  {possessionInfo.active && (
                    <PossessionControl
                      info={possessionInfo}
                      onSpend={handleSpendPossession}
                      onAdjust={(delta) =>
                        applyLocalCharacterUpdate((base) => {
                          const baseRaw = (base.sheetData || {}) as Record<string, any>;
                          const next = Math.max(0, Math.min(possessionInfo.max, possessionInfo.current + delta));
                          return { ...base, sheetData: { ...baseRaw, possessionPoints: next } };
                        })
                      }
                    />
                  )}

                  {canMasterControl && (
                    <button
                      type="button"
                      onClick={() => setShowMasterConditionPicker(!showMasterConditionPicker)}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded-full text-[11px] font-bold transition cursor-pointer"
                      title="Controle do Mestre: Aplicar condição ao personagem"
                    >
                      + Condição (Mestre)
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {feedbackMsg && (
                  <span role="status" className="text-sm text-emerald-300 flex items-center gap-1.5">
                    <Icon name="check" size={15} /> {stripEmoji(feedbackMsg)}
                  </span>
                )}

                <button
                  type="button"
                  disabled={isLockedByMaster}
                  onClick={() => setIsEditMode(!isEditMode)}
                  aria-pressed={isEditMode}
                  className={isEditMode ? 'trpg-btn-quiet trpg-btn-sm' : 'trpg-btn-secondary trpg-btn-sm'}
                >
                  <Icon name={isEditMode ? 'x' : 'pencil'} size={15} />
                  {isEditMode ? 'Sair da edição' : 'Editar ficha'}
                </button>

                {isEditMode && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveSheet()}
                    className="trpg-btn-primary trpg-btn-sm"
                  >
                    <Icon name="save" size={15} />
                    {isSaving ? 'Salvando…' : 'Salvar'}
                  </button>
                )}
              </div>
            </div>

            {canMasterControl && showMasterConditionPicker && (
              <div className="bg-zinc-950 border border-red-900/60 p-3.5 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-red-400">
                    <Icon name="crown" /> Controle do Mestre: Escolha uma condição para aplicar ao personagem
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMasterConditionPicker(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableConditions.length === 0 ? (
                    <span className="text-xs text-zinc-500">
                      Nenhuma condição cadastrada para este sistema no Painel Admin.
                    </span>
                  ) : (
                    availableConditions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleApplyConditionFromCompendium(c)}
                        className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        + Aplicar {c.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vitais: medidor com marca a cada 5 pontos, números grandes, ajustes rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {character.vitals.map((bar) => {
              const bonusMax = bonuses.vitalMax[bar.id] || 0;
              const effectiveMax = Math.max(1, bar.max + bonusMax);
              const percent = Math.max(0, Math.min(100, (bar.current / effectiveMax) * 100));
              const tempAmount = bar.id === 'pv' ? tempHp : bar.id === 'pe' ? tempPe : 0;
              const tempMax =
                bar.id === 'pv' ? Number(rawSheet.tempHpMax || 0) : bar.id === 'pe' ? Number(rawSheet.tempPeMax || 0) : 0;
              const tick = Math.max(2, Math.min(50, (5 / effectiveMax) * 100));
              const barColor =
                bar.id === 'pv' ? 'var(--trpg-pv)' : bar.id === 'san' ? 'var(--trpg-san)' : bar.id === 'pe' ? 'var(--trpg-pe)' : bar.color;

              return (
                <div key={bar.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-zinc-300 flex flex-wrap items-center gap-1.5">
                      {bar.label}
                      {character.system === 'ordem-paranormal' && bar.id === 'san' && (
                        bar.current <= 0 ? (
                          <span
                            className="trpg-badge bg-red-950! text-red-200!"
                            title="Diplomacia ou Religião DT 20 em até 3 rodadas para acalmar"
                          >
                            Enlouquecendo
                          </span>
                        ) : bar.current <= Math.floor(effectiveMax / 2) ? (
                          canMasterControl ? (
                            <button
                              type="button"
                              onClick={() => {
                                const effect =
                                  ORDEM_INSANITY_EFFECTS[Math.floor(Math.random() * ORDEM_INSANITY_EFFECTS.length)];
                                setInsanityEffectText(effect);
                              }}
                              className="trpg-badge bg-orange-950! text-orange-200! hover:bg-orange-900!"
                              title="Só o mestre: sortear um efeito de insanidade (1d20)"
                            >
                              Perturbado <Icon name="d20" size={12} />
                            </button>
                          ) : (
                            <span className="trpg-badge bg-orange-950! text-orange-200!" title="Sanidade na metade ou menos">
                              Perturbado
                            </span>
                          )
                        ) : (
                          <span className="trpg-badge bg-emerald-950/70! text-emerald-300!">São</span>
                        )
                      )}
                    </span>
                    {isEditMode && canEditVitals ? (
                      <div className="flex items-center gap-1 trpg-num text-sm">
                        <input
                          type="number"
                          aria-label={`${bar.label} atual`}
                          value={bar.current}
                          onChange={(e) => handleVitalChange(bar.id, 'current', Number(e.target.value))}
                          className="w-14 trpg-input min-h-0! py-1! px-1.5! text-center"
                        />
                        <span className="text-zinc-500">/</span>
                        <input
                          type="number"
                          aria-label={`${bar.label} máximo`}
                          value={bar.max}
                          onChange={(e) => handleVitalChange(bar.id, 'max', Number(e.target.value))}
                          className="w-14 trpg-input min-h-0! py-1! px-1.5! text-center"
                        />
                        {bonusMax !== 0 && <span className="text-emerald-300 text-xs">({bonusMax > 0 ? `+${bonusMax}` : bonusMax})</span>}
                      </div>
                    ) : (
                      <div className="text-right leading-none">
                        <span className="trpg-num text-[1.75rem] font-semibold text-zinc-100">{bar.current}</span>
                        <span className="trpg-num text-base text-zinc-500"> / {effectiveMax}</span>
                        {bonusMax !== 0 && (
                          <span className="block text-xs text-emerald-300 mt-1">
                            {bonusMax > 0 ? `+${bonusMax}` : bonusMax} de poderes
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div
                      className="trpg-meter h-3!"
                      role="meter"
                      aria-label={bar.label}
                      aria-valuemin={0}
                      aria-valuemax={effectiveMax}
                      aria-valuenow={bar.current}
                    >
                      <div className="trpg-meter-fill" style={{ width: `${percent}%`, background: barColor }} />
                      <div className="trpg-meter-ticks" style={{ ['--tick' as string]: `${tick}%` }} />
                    </div>
                    {(bar.id === 'pv' || bar.id === 'pe') && (
                      <TempVitalBar current={tempAmount} max={tempMax} barId={bar.id} size="md" />
                    )}
                  </div>

                  {canEditVitals && (
                    <div className="grid grid-cols-4 gap-1" role="group" aria-label={`Ajustar ${bar.label}`}>
                      {[-5, -1, +1, +5].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => handleVitalDelta(bar.id, delta)}
                          aria-label={`${delta > 0 ? 'Somar' : 'Tirar'} ${Math.abs(delta)} de ${bar.label}`}
                          className={`min-h-9 rounded-md trpg-num text-sm font-semibold border transition-colors ${
                            delta < 0
                              ? 'border-zinc-800 text-red-300 hover:bg-red-950/60 hover:border-red-900'
                              : 'border-zinc-800 text-emerald-300 hover:bg-emerald-950/60 hover:border-emerald-900'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PAINEL DE EFEITOS ATIVOS NA CENA & CONTROLE DE CENA */}
          {(activeSceneEffects.length > 0 || tempHp > 0 || canMasterControl) && (
            <div className="bg-zinc-950 border border-purple-800/60 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                  <Icon name="hourglass" /> Efeitos da Cena:
                </span>
                {tempHp > 0 && (
                  <span className="px-2.5 py-1 bg-cyan-950/80 border border-cyan-600/70 text-cyan-200 rounded-lg text-xs font-bold">
                    <Icon name="shield" /> +{tempHp} PV Temporários ativos
                  </span>
                )}
                {activeSceneEffects.map((eff) => (
                  <span
                    key={eff.id}
                    title={eff.description}
                    className="px-2.5 py-1 bg-purple-950/80 border border-purple-600/60 text-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <span><Icon name="sparkles" /> {eff.name} ({eff.source}): {eff.description}</span>
                  </span>
                ))}
                {activeSceneEffects.length === 0 && tempHp === 0 && (
                  <span className="text-xs text-zinc-500">
                    Nenhum efeito temporário de cena ativo no momento.
                  </span>
                )}
              </div>

              {canMasterControl && (
                <button
                  type="button"
                  onClick={handleEndCharacterScene}
                  className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-700 border border-purple-500/60 text-purple-100 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap"
                  title="Exclusivo do Mestre: Encerra todos os efeitos que duram 1 cena e zera os PV Temporários"
                >
                  <Icon name="clapperboard" /> Encerrar Cena (Mestre)
                </button>
              )}
            </div>
          )}

          {/* PAINEL DE VISLUMBRES DO PASSADO (AMNÉSICO): TESTE DE INTELECTO DT 10 -> BOTÃO PARA GIRAR 1d4 PE TEMPORÁRIO */}
          {vislumbresResult && (
            <div
              className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                vislumbresResult.passed
                  ? 'bg-cyan-950/50 border-cyan-500/70 text-cyan-100'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-300'
              }`}
            >
              <div className="text-xs space-y-0.5">
                <p className="font-black uppercase tracking-wider">
                  <Icon name="brain" /> Vislumbres do Passado (Poder de Amnésico) — Resultado: {vislumbresResult.keptRoll} vs DT 10
                </p>
                <p className="font-semibold">
                  {vislumbresResult.passed
                    ? vislumbresResult.peGranted
                      ? `Você recebeu +${vislumbresResult.peGranted} PE Temporários na sua barra de PE!`
                      : 'Sucesso no teste de Intelecto! Clique no botão ao lado para girar o seu 1d4 de PE Temporário.'
                    : 'Falha no teste de Intelecto (DT 10).'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {vislumbresResult.passed && !vislumbresResult.peGranted && (
                  <button
                    type="button"
                    onClick={handleRollVislumbresPe}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-extrabold shadow-lg cursor-pointer animate-pulse"
                  >
                    <Icon name="d20" /> Girar 1d4 PE Temporários
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setVislumbresResult(null)}
                  className="px-2.5 py-1 bg-black/40 hover:bg-black/70 rounded-lg text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* RESUMO DA ÚLTIMA CONJURAÇÃO ("O CUSTO DO PARANORMAL") */}
          {ritualCastSummaryModal && (
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                ritualCastSummaryModal.passed
                  ? 'bg-emerald-950/50 border-emerald-600/70 text-emerald-100'
                  : ritualCastSummaryModal.failedByFiveOrMore
                  ? 'bg-red-950/70 border-red-500 text-red-100'
                  : 'bg-amber-950/60 border-amber-500/70 text-amber-100'
              }`}
            >
              <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider">
                      <Icon name="sigil" /> {ritualCastSummaryModal.ritualName} ({ritualCastSummaryModal.formLabel}) •{' '}
                      {ritualCastSummaryModal.pvSpent
                        ? `-${ritualCastSummaryModal.pvSpent} PV`
                        : `-${ritualCastSummaryModal.peSpent} PE`}
                    </span>
                    {!ritualCastSummaryModal.isMedoRitual && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40">
                        Teste de Ocultismo: [{ritualCastSummaryModal.ocultismoRolls.join(', ')}] + {ritualCastSummaryModal.ocultismoMod} = {ritualCastSummaryModal.ocultismoTotal} vs DT {ritualCastSummaryModal.dt}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold">
                    {ritualCastSummaryModal.isMedoRitual
                      ? `Invocando o Medo: você perdeu ${ritualCastSummaryModal.sanLost} de Sanidade atual e -${ritualCastSummaryModal.permSanLost} de Sanidade Máxima Permanente!`
                      : ritualCastSummaryModal.passed
                      ? 'Sucesso no Custo do Paranormal! Sua mente resistiu ao Outro Lado (0 de Sanidade perdida).'
                      : ritualCastSummaryModal.failedByFiveOrMore
                      ? `Falha por 5 ou mais no Custo do Paranormal! Você perdeu ${ritualCastSummaryModal.sanLost} de Sanidade atual e -1 de Sanidade Máxima Permanente!`
                      : `Falha no Custo do Paranormal! Você perdeu ${ritualCastSummaryModal.sanLost} pontos de Sanidade.`}
                  </p>
                {ritualCastSummaryModal.effectAppliedText && (
                  <p className="text-xs text-cyan-300 font-bold">
                    {ritualCastSummaryModal.effectAppliedText}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {ritualCastSummaryModal.damageFormulaToRoll && (
                    <button
                      type="button"
                      onClick={() => {
                        const clean = ritualCastSummaryModal.damageFormulaToRoll!
                          .toLowerCase()
                          .replace(/\s+/g, '');
                        const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
                        if (match) {
                          triggerCharacterRoll(
                            `Efeito: ${ritualCastSummaryModal.ritualName} (${ritualCastSummaryModal.formLabel})`,
                            parseInt(match[1], 10),
                            parseInt(match[2], 10),
                            match[3] ? parseInt(match[3], 10) : 0
                          );
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-extrabold shadow cursor-pointer"
                    >
                      <Icon name="d20" /> Rolar Dano ({ritualCastSummaryModal.damageFormulaToRoll})
                    </button>
                  )}
                  {ritualCastSummaryModal.healingFormulaToRoll && (
                    <button
                      type="button"
                      onClick={() => {
                        const clean = ritualCastSummaryModal.healingFormulaToRoll!
                          .toLowerCase()
                          .replace(/\s+/g, '');
                        const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
                        if (match) {
                          triggerCharacterRoll(
                            `Cura: ${ritualCastSummaryModal.ritualName} (${ritualCastSummaryModal.formLabel})`,
                            parseInt(match[1], 10),
                            parseInt(match[2], 10),
                            match[3] ? parseInt(match[3], 10) : 0
                          );
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-extrabold shadow cursor-pointer"
                    >
                      <Icon name="heart-pulse" /> Rolar Cura ({ritualCastSummaryModal.healingFormulaToRoll})
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() => setRitualCastSummaryModal(null)}
                  className="px-3 py-1 bg-black/40 hover:bg-black/70 rounded-lg text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EFEITO DE INSANIDADE (TABELA 5.1, 1d20) */}
      {insanityEffectText && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-purple-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                  <Icon name="brain" /> Estado Perturbado • Tabela 5.1 (1d20)
                </span>
                <h3 className="text-lg font-black text-white">Efeito de Insanidade</h3>
              </div>
              <button
                type="button"
                onClick={() => setInsanityEffectText(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-purple-200 bg-zinc-950 border border-purple-800/60 p-4 rounded-xl leading-relaxed">
              {insanityEffectText}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const next =
                    ORDEM_INSANITY_EFFECTS[
                      Math.floor(Math.random() * ORDEM_INSANITY_EFFECTS.length)
                    ];
                  setInsanityEffectText(next);
                }}
                className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg text-xs font-bold"
              >
                <Icon name="d20" /> Rolar Novamente (1d20)
              </button>
              <button
                type="button"
                onClick={() => setInsanityEffectText(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CENA DE INTERLÚDIO (ORDEM PARANORMAL v1.3, p. 92-93) */}
      {isInterludeModalOpen && character.system === 'ordem-paranormal' && (() => {
        const normOrigModal = String(rawSheet.origin || '').trim().toLowerCase();
        const modalOriginObj = ORDEM_ORIGINS.find(
          (o) => o.id === normOrigModal || o.name.toLowerCase() === normOrigModal
        );
        const modalOriginId = modalOriginObj?.id || '';
        const upgradesPrecariousSleepModal =
          modalOriginId === 'explorador' || modalOriginId === 'mateiro';
        const effectiveSleepComfortModal =
          interludeComfort === 0.5 && upgradesPrecariousSleepModal ? 1 : interludeComfort;

        const peLimitInterlude = getOrdemPeLimit(levelOrNex, rawSheet.origin, characterAbilities);
        const sleepBaseRec = Math.max(1, Math.floor(peLimitInterlude * effectiveSleepComfortModal));
        const relaxBaseRec = Math.max(1, Math.floor(peLimitInterlude * interludeComfort));
        const selectedDishes = [interludeDish, interludeSecondDish].filter(Boolean);
        const anteciparPreview = interludeSleep ? getAnteciparVitalidadeSleep(characterAbilities) : null;
        const previewPv =
          (interludeSleep && !anteciparPreview ? sleepBaseRec : 0) +
          selectedDishes.filter((d) => d === 'nutritivo').length * (interludeSleep ? peLimitInterlude : 0);
        const previewPe =
          (interludeSleep ? sleepBaseRec : 0) +
          selectedDishes.filter((d) => d === 'energetico').length * (interludeSleep ? peLimitInterlude : 0);
        const previewSan =
          (interludeRelax ? relaxBaseRec : 0) +
          selectedDishes.filter((d) => d === 'favorito').length * (interludeRelax ? 2 : 0);
        const previewRapido = selectedDishes.filter((d) => d === 'rapido').length * 5;

        const hasChefOrigin =
          modalOriginId === 'chef' ||
          (normOrigModal.includes('chef') && modalOriginId !== 'chef_outro_lado');
        const hasChefOutroLadoOrigin = modalOriginId === 'chef_outro_lado';
        const isNerdEntusiastaOrigin = modalOriginId === 'nerd_entusiasta';
        const hasCriarSeloPower = characterAbilities.some(
          (a) => a.id.includes('criar-selo') || a.name.toLowerCase().includes('criar selo')
        );
        const knownRituals = characterAbilities.filter((a) => a.category === 'ritual');
        const activeSealsCount = (character.inventory || []).filter(
          (it) => it.storedRitualName || it.name.toLowerCase().includes('selo paranormal')
        ).reduce((acc, it) => acc + (it.quantity || 1), 0);
        const presenceCap = Math.max(
          1,
          Number(rawSheet.attributes?.pre || 0) + (bonuses.attributes['pre'] || 0)
        );
        const skillsList: OrdemSkill[] = Array.isArray(rawSheet.skills) ? rawSheet.skills : [];
        const selectedReviewSkill =
          skillsList.find((s) => s.id === interludeReviewSkillId) || skillsList[0];
        const reviewSkillDice = selectedReviewSkill
          ? Number(rawSheet.attributes?.[selectedReviewSkill.attribute] || 0) +
            (bonuses.attributes[selectedReviewSkill.attribute] || 0) +
            bonuses.skillDiceAll +
            (bonuses.skillDice[selectedReviewSkill.id] || 0)
          : 1;
        const reviewSkillMod = selectedReviewSkill
          ? (selectedReviewSkill.trainingDegree || 0) +
            (selectedReviewSkill.otherModifier || 0) +
            bonuses.skillBonusAll +
            (bonuses.skillBonus[selectedReviewSkill.id] || 0) +
            previewRapido
          : previewRapido;

        const totalActionsCount =
          (interludeSleep ? 1 : 0) +
          (interludeRelax ? 1 : 0) +
          (interludeDish || interludeParanormalDish ? 1 : 0) +
          interludeExerciseCount +
          interludeReadCount +
          (interludeMaintenance ? 1 : 0) +
          (interludeReviewCase ? 1 : 0);

        const currentBonusDice = rawSheet.interludeBonusDice || { physical: 0, mental: 0 };

        return (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-indigo-500/60 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  <Icon name="moon" /> Regras Oficiais de Investigação (p. 92–93)
                </span>
                <h3 className="text-lg font-black text-white">Cena de Interlúdio Completa</h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                    totalActionsCount <= 2
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950/70 text-amber-300 border-amber-700'
                  }`}
                  title="Cada agente normalmente escolhe até 2 ações por cena de Interlúdio (p. 92)."
                >
                  {totalActionsCount} / 2 ações padrão
                </span>
                <button
                  type="button"
                  onClick={() => setIsInterludeModalOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* 1. Condição de Conforto */}
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                  1. Condição de Conforto do Abrigo (para Dormir / Relaxar)
                </label>
                {rawSheet.pendingInterlude ? (
                  <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/60 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-200">
                      Definido pelo Mestre:{' '}
                      {interludeComfort === 0.5
                        ? 'Precário (0,5x)'
                        : interludeComfort === 2
                        ? 'Confortável (2x)'
                        : interludeComfort === 3
                        ? 'Luxuoso (3x)'
                        : 'Normal (1x)'}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 uppercase">
                      Travado pelo Mestre
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { mult: 0.5, label: 'Precário (0,5x)' },
                      { mult: 1, label: 'Normal (1x)' },
                      { mult: 2, label: 'Confortável (2x)' },
                      { mult: 3, label: 'Luxuoso (3x)' },
                    ].map((c) => (
                      <button
                        key={c.mult}
                        type="button"
                        onClick={() => setInterludeComfort(c.mult as 0.5 | 1 | 2 | 3)}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                          interludeComfort === c.mult
                            ? 'bg-indigo-600 text-white border-indigo-400'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Dormir & Relaxar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interludeSleep}
                    onChange={(e) => setInterludeSleep(e.target.checked)}
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Ação: Dormir</span>
                    <span className="text-[11px] text-zinc-400">
                      Recupera <strong className="text-emerald-300">+{previewPv} PV</strong> e{' '}
                      <strong className="text-amber-300">+{previewPe} PE</strong> (Limite {peLimitInterlude} PE).
                    </span>
                    {anteciparPreview && (
                      <span className="block text-[10px] font-bold text-amber-400 mt-0.5">
                        Antecipar Vitalidade: o sono não cura PV e consome{' '}
                        {anteciparPreview.charges - anteciparPreview.next} carga(s) (restam {anteciparPreview.next}).
                      </span>
                    )}
                    {interludeComfort === 0.5 && upgradesPrecariousSleepModal && (
                      <span className="block text-[10px] font-bold text-emerald-400 mt-0.5">
                        ✓ {modalOriginObj?.name}: descanso precário elevado para Normal (1x)!
                      </span>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interludeRelax}
                    onChange={(e) => setInterludeRelax(e.target.checked)}
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">Ação: Relaxar</span>
                    <span className="text-[11px] text-zinc-400">
                      Recupera <strong className="text-cyan-300">+{previewSan} SAN</strong>.
                    </span>
                  </div>
                </label>
              </div>

              {/* 3. Alimentar-se */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-300 mb-1.5">
                    Ação: Alimentar-se (1º Prato)
                  </label>
                  <select
                    value={interludeDish}
                    onChange={(e) => setInterludeDish(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                  >
                    <option value="">-- Não realizou Alimentar-se --</option>
                    {ORDEM_INTERLUDE_DISHES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-amber-400 mb-1">
                    2º Prato Especial {hasChefOrigin ? '(Origem Chef ativa!)' : '(Caso haja um Chef no grupo)'}
                  </label>
                  <select
                    value={interludeSecondDish}
                    onChange={(e) => setInterludeSecondDish(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-amber-800/60 text-xs text-white"
                  >
                    <option value="">-- Sem 2º prato (padrão) --</option>
                    {ORDEM_INTERLUDE_DISHES.map((d) => (
                      <option key={d.id} value={d.id}>
                        2º Prato: {d.name} — {d.description} (Acumula se igual!)
                      </option>
                    ))}
                  </select>
                </div>

                {hasChefOutroLadoOrigin && (
                  <div className="pt-2.5 border-t border-purple-800/60 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={interludeParanormalDish}
                        onChange={(e) => setInterludeParanormalDish(e.target.checked)}
                      />
                      <span className="text-xs font-extrabold text-purple-300">
                        <Icon name="sparkles" /> Fome do Outro Lado: Cozinhar Ingrediente Paranormal (-1 SAN Máx Perm.)
                      </span>
                    </label>
                    {interludeParanormalDish && (
                      <div className="pl-5 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-zinc-300 font-semibold">
                            Elemento da Criatura:
                          </span>
                          {(['Sangue', 'Morte', 'Conhecimento', 'Energia'] as const).map((el) => (
                            <button
                              key={el}
                              type="button"
                              onClick={() => setInterludeParanormalElement(el)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${elementChoiceClasses(
                                el,
                                interludeParanormalElement === el
                              )}`}
                            >
                              {el}
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Rola Profissão secreta (DT 15 + 1d20 oculto): concede RD 10 ou vulnerabilidade ao elemento na próxima cena e consome 1 Ingrediente Paranormal (se houver na mochila).
                        </p>
                        {rawSheet.useSeparateNexAndLevel ? (
                          <label className="flex items-center gap-2 text-[11px] text-amber-300 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={interludeParanormalNewPart}
                              onChange={(e) => setInterludeParanormalNewPart(e.target.checked)}
                            />
                            Parte de criatura nunca consumida antes (+3% NEX — Regra Opcional Nível/NEX)
                          </label>
                        ) : (
                          <p className="text-[10px] text-zinc-500">
                            Nota: O ganho de +3% NEX por criatura inédita aplica-se apenas quando a regra opcional de Nível e NEX separados está ativa na ficha.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Exercitar-se & Ler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white"><Icon name="dumbbell" /> Ação: Exercitar-se</span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      Estoque: {Number(currentBonusDice.physical || 0)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Concede +1d20 em testes físicos (FOR/AGI/VIG) para uso futuro.
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([0, 1, 2] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setInterludeExerciseCount(cnt)}
                        className={`py-1.5 rounded text-xs font-bold border cursor-pointer ${
                          interludeExerciseCount === cnt
                            ? 'bg-emerald-700 text-white border-emerald-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {cnt === 0 ? 'Não' : `+${cnt}d20`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white"><Icon name="library" /> Ação: Ler</span>
                    <span className="text-[10px] font-mono text-purple-300">
                      Estoque: {Number(currentBonusDice.mental || 0)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {isNerdEntusiastaOrigin
                      ? 'Concede +2d6 (O Inteligente) em testes mentais (INT/PRE) para uso futuro.'
                      : 'Concede +1d6 em testes mentais (INT/PRE) para uso futuro.'}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([0, 1, 2] as const).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setInterludeReadCount(cnt)}
                        className={`py-1.5 rounded text-xs font-bold border cursor-pointer ${
                          interludeReadCount === cnt
                            ? 'bg-purple-700 text-white border-purple-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        {cnt === 0
                          ? 'Não'
                          : `+${cnt * (isNerdEntusiastaOrigin ? 2 : 1)}d6`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Manutenção */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interludeMaintenance}
                    onChange={(e) => setInterludeMaintenance(e.target.checked)}
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">
                      <Icon name="wrench" /> Ação: Manutenção
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Conserta/recarrega item, fabrica pacote de munição ou cria Selo Paranormal.
                    </span>
                  </div>
                </label>

                {interludeMaintenance && (
                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'repair', label: 'Consertar / Cargas' },
                        { id: 'ammo', label: 'Fabricar Munição' },
                        { id: 'seal', label: 'Criar Selo' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            setInterludeMaintenanceMode(m.id as 'repair' | 'ammo' | 'seal')
                          }
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            interludeMaintenanceMode === m.id
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {interludeMaintenanceMode === 'repair' && (
                      <select
                        value={interludeMaintenanceItemId}
                        onChange={(e) => setInterludeMaintenanceItemId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                      >
                        {(character.inventory || []).length === 0 ? (
                          <option value="">-- Mochila vazia --</option>
                        ) : (
                          (character.inventory || []).map((it) => {
                            const maxC = getItemDefaultMaxCharges(it);
                            return (
                              <option key={it.id} value={it.id}>
                                {it.name}
                                {maxC || typeof it.remainingCharges === 'number'
                                  ? ` (${it.remainingCharges ?? maxC ?? 2}/${maxC ?? Math.max(2, it.remainingCharges || 0)} cargas)`
                                  : ''}
                              </option>
                            );
                          })
                        )}
                      </select>
                    )}

                    {interludeMaintenanceMode === 'ammo' && (
                      <select
                        value={interludeMaintenanceAmmoKey}
                        onChange={(e) => setInterludeMaintenanceAmmoKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                      >
                        {Object.entries(INTERLUDE_AMMO_PRESETS).map(([key, p]) => (
                          <option key={key} value={key}>
                            {p.name} (Cat. {p.category === 0 ? '0' : 'I'})
                          </option>
                        ))}
                      </select>
                    )}

                    {interludeMaintenanceMode === 'seal' && (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span
                            className={
                              hasCriarSeloPower ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'
                            }
                          >
                            {hasCriarSeloPower
                              ? '✓ Poder Criar Selo ativo'
                              : 'Requer poder Criar Selo (ou autorização do Mestre)'}
                          </span>
                          <span className="font-mono text-zinc-400">
                            Selos ativos: {activeSealsCount} / {presenceCap} (PRE)
                          </span>
                        </div>
                        <select
                          value={interludeMaintenanceSealRitualId}
                          onChange={(e) => setInterludeMaintenanceSealRitualId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-purple-700/70 text-xs text-white"
                        >
                          {knownRituals.length === 0 ? (
                            <option value="">-- Nenhum ritual conhecido na ficha --</option>
                          ) : (
                            knownRituals.map((rit) => {
                              const def =
                                findOrdemRitualDef(rit.id) || findOrdemRitualDef(rit.name);
                              const circ =
                                def?.circle ||
                                (rit.cost >= 10 ? 4 : rit.cost >= 6 ? 3 : rit.cost >= 3 ? 2 : 1);
                              const peCost = getOrdemCircleBaseCost(circ);
                              return (
                                <option key={rit.id} value={rit.id}>
                                  {rit.name} ({circ}º Círculo • Custo {peCost} PE)
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Revisar Caso */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interludeReviewCase}
                    onChange={(e) => setInterludeReviewCase(e.target.checked)}
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">
                      <Icon name="search" /> Ação: Revisar Caso
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Rola teste de perícia para obter pistas ou bônus na investigação
                      {previewRapido > 0 ? ` (+${previewRapido} do Prato Rápido aplicado!)` : ''}.
                    </span>
                  </div>
                </label>

                {interludeReviewCase && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80">
                    <select
                      value={interludeReviewSkillId}
                      onChange={(e) => setInterludeReviewSkillId(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                    >
                      {skillsList.map((sk) => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name} ({sk.attribute.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <span className="px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-amber-300">
                      <Icon name="d20" /> {formatOrdemDiceLabel(reviewSkillDice)}
                      {reviewSkillMod >= 0 ? `+${reviewSkillMod}` : reviewSkillMod}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsInterludeModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyInterludeRecovery}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
              >
                <Icon name="sparkles" /> Aplicar Ações de Interlúdio
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MODAL DE EVOLUÇÃO GUIADA DE NEX (LEVEL-UP DE ORDEM PARANORMAL v1.3) */}
      {isNexEvolutionOpen && character.system === 'ordem-paranormal' && (() => {
        const currentNex = Number(rawSheet.nex ?? 5);
        const nextNex = currentNex === 0 ? 5 : currentNex === 95 ? 99 : Math.min(99, currentNex + 5);
        const milestone = ORDEM_NEX_PROGRESSION.find((m) => m.nex === nextNex);
        // Trilhas permitidas pela mesa; na escolha, separadas em abas por livro (Livro Básico / suplementos)
        const classTrails = ORDEM_TRAILS.filter(
          (t) =>
            t.classId === rawSheet.characterClass &&
            matchesContentSourceFilter(t.sourceId, [], campaignAllowedSources, 'ordem-paranormal')
        );
        const evoTrailBooks = getContentSourcesForSystem('ordem-paranormal').filter((src) =>
          classTrails.some((t) => (t.sourceId || 'ordem-base') === src.id)
        );
        const activeEvoTrailBook = evoTrailBooks.some((b) => b.id === evoTrailBook)
          ? evoTrailBook
          : evoTrailBooks[0]?.id || 'ordem-base';
        const trailsInBook = classTrails.filter((t) => (t.sourceId || 'ordem-base') === activeEvoTrailBook);
        const trailBookTabs =
          evoTrailBooks.length > 1 ? (
            <div role="tablist" aria-label="Livro da trilha" className="trpg-tabs -mx-1">
              {evoTrailBooks.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  role="tab"
                  aria-selected={activeEvoTrailBook === book.id}
                  onClick={() => setEvoTrailBook(book.id)}
                  className="trpg-tab"
                >
                  {book.shortName}
                  <span className="trpg-tab-count">
                    {classTrails.filter((t) => (t.sourceId || 'ordem-base') === book.id).length}
                  </span>
                </button>
              ))}
            </div>
          ) : null;
        const activeTrailId = evoTrailId || rawSheet.trail || '';
        const selectedTrailObj = ORDEM_TRAILS.find((t) => t.id === activeTrailId);
        const unlockedTrailPowerAtThisNex = selectedTrailObj?.powers.find((p) => p.nex === nextNex);

        const maxCircleUnlocked = nextNex >= 85 ? 4 : nextNex >= 55 ? 3 : nextNex >= 25 ? 2 : 1;

        const clsObj =
          ORDEM_CLASSES.find((c) => c.id === rawSheet.characterClass) || ORDEM_CLASSES[0];
        const effIntForTraining =
          Number(rawSheet.attributes?.int ?? 1) +
          (milestone?.grantsAttributeIncrease && evoAttrKey === 'int' ? 1 : 0);
        const maxSkillUpgrades =
          (clsObj.trainingUpgradeBase || 2) + Math.max(0, effIntForTraining);

        const allPowerEntries =
          compendiumEntries.filter((e) => e.category === 'power').length > 0
            ? compendiumEntries.filter((e) => e.category === 'power')
            : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'power');

        const effectiveCharAffinity = milestone?.grantsAffinity
          ? evoAffinity
          : rawSheet.affinity;

        const evoSheetForCheck: OrdemSheetData = {
          ...(rawSheet as OrdemSheetData),
          nex: nextNex,
        };

        const getPowerSortPriority = (
          pw: CompendiumEntryData,
          mode: 'class_power' | 'transcend'
        ): number => {
          const check = checkOrdemPowerRequirements(pw, evoSheetForCheck, characterAbilities);
          const alreadyOwnedAb = characterAbilities.find(
            (ab) =>
              ab.name.trim().toLowerCase() === pw.name.trim().toLowerCase() ||
              ab.name.trim().toLowerCase() === `${pw.name.trim().toLowerCase()} (afinidade)`
          );
          const isRepeatableSkillPower = pw.name.toLowerCase().includes('treinamento em perícia');
          const canUpgradeAffinity =
            mode === 'transcend' &&
            Boolean(alreadyOwnedAb) &&
            !alreadyOwnedAb?.name.toLowerCase().includes('afinidade') &&
            nextNex >= 50 &&
            Boolean(effectiveCharAffinity) &&
            effectiveCharAffinity?.toLowerCase() === (pw.metadata?.element || '').toLowerCase();
          const isBlockedDuplicate =
            Boolean(alreadyOwnedAb) && !isRepeatableSkillPower && !canUpgradeAffinity;

          if (isBlockedDuplicate) return 2;
          if (!check.met) return 1;
          return 0;
        };

        const classPowerOptions = allPowerEntries
          .filter((e) =>
            matchesContentSourceFilter(
              resolveEntrySourceId(e, 'ordem-paranormal'),
              evoSourceFilter,
              campaignAllowedSources,
              'ordem-paranormal'
            )
          )
          .filter((e) => {
            const lowerName = e.name.trim().toLowerCase();
            const lowerReq = (e.metadata?.requirements || '').toLowerCase();
            if (
              lowerName.includes('ataque especial') ||
              lowerName.startsWith('resistir a ') ||
              lowerReq.includes('poder paranormal') ||
              lowerReq.includes('transcender')
            ) {
              return false;
            }
            return (
              lowerReq.includes(String(rawSheet.characterClass || '').toLowerCase()) ||
              !lowerReq.match(/combatente|especialista|ocultista/i)
            );
          })
          .filter(
            (e) =>
              !evoPowerSearch.trim() ||
              e.name.toLowerCase().includes(evoPowerSearch.toLowerCase()) ||
              e.description.toLowerCase().includes(evoPowerSearch.toLowerCase())
          )
          .sort((a, b) => {
            const pA = getPowerSortPriority(a, 'class_power');
            const pB = getPowerSortPriority(b, 'class_power');
            if (pA !== pB) return pA - pB;
            return a.name.localeCompare(b.name, 'pt-BR');
          });

        const rawParanormalPowers =
          compendiumEntries.filter((e) => e.category === 'paranormal_power').length > 0
            ? compendiumEntries.filter((e) => e.category === 'paranormal_power')
            : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'paranormal_power');

        const paranormalPowerOptions = rawParanormalPowers
          .filter((e) =>
            matchesContentSourceFilter(
              resolveEntrySourceId(e, 'ordem-paranormal'),
              evoSourceFilter,
              campaignAllowedSources,
              'ordem-paranormal'
            )
          )
          .filter(
            (e) =>
              e.name.trim().toLowerCase() !== 'resistir a <elemento> (poder paranormal)' &&
              (evoPowerElementFilter === 'ALL' ||
                (e.metadata?.element || '').toLowerCase() === evoPowerElementFilter.toLowerCase())
          )
          .filter(
            (e) =>
              !evoPowerSearch.trim() ||
              e.name.toLowerCase().includes(evoPowerSearch.toLowerCase()) ||
              e.description.toLowerCase().includes(evoPowerSearch.toLowerCase())
          )
          .sort((a, b) => {
            const pA = getPowerSortPriority(a, 'transcend');
            const pB = getPowerSortPriority(b, 'transcend');
            if (pA !== pB) return pA - pB;
            return a.name.localeCompare(b.name, 'pt-BR');
          });

        const evoKnownRitualsSet = createKnownRitualsKeySet(characterAbilities);
        const allRitualsUpToCircle = (
          compendiumEntries.filter((e) => e.category === 'spell').length > 0
            ? compendiumEntries.filter((e) => e.category === 'spell')
            : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'spell')
        )
          .filter((r) =>
            matchesContentSourceFilter(
              resolveEntrySourceId(r, 'ordem-paranormal'),
              evoSourceFilter,
              campaignAllowedSources,
              'ordem-paranormal'
            )
          )
          .filter((r) => (r.metadata?.circle || 1) <= maxCircleUnlocked)
          .filter(
            (r) =>
              evoRitualCircleFilter === 'ALL' ||
              (r.metadata?.circle || 1) === evoRitualCircleFilter
          )
          .filter(
            (r) =>
              evoRitualElementFilter === 'ALL' ||
              (r.metadata?.element || '').toLowerCase() === evoRitualElementFilter.toLowerCase()
          )
          .filter(
            (r) =>
              !evoRitualSearch.trim() ||
              r.name.toLowerCase().includes(evoRitualSearch.toLowerCase()) ||
              r.description.toLowerCase().includes(evoRitualSearch.toLowerCase())
          )
          .sort((a, b) => {
            const ownedA = isOrdemRitualAlreadyOwned(a, characterAbilities, evoKnownRitualsSet) ? 1 : 0;
            const ownedB = isOrdemRitualAlreadyOwned(b, characterAbilities, evoKnownRitualsSet) ? 1 : 0;
            if (ownedA !== ownedB) return ownedA - ownedB;
            return a.name.localeCompare(b.name, 'pt-BR');
          });

        const classSpecificSummary = getOrdemClassMilestoneSummary(
          rawSheet.characterClass || 'combatente',
          nextNex,
          activeTrailId
        );

        return (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    Evolução de NEX
                  </span>
                  <h3 className="text-xl font-black text-white">
                    Avançar Exposição ({clsObj.name}): NEX {currentNex}% → NEX {nextNex}%
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNexEvolutionOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <ContentSourceFilterBar
                  system="ordem-paranormal"
                  selectedSources={evoSourceFilter}
                  onChange={setEvoSourceFilter}
                  allowedSources={campaignAllowedSources}
                  compact
                />

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40">
                  <span className="text-[10px] font-black uppercase text-amber-300">
                    Marco de NEX {nextNex}% para {clsObj.name}
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {classSpecificSummary}
                  </p>
                  <p className="text-xs text-zinc-300 mt-1">
                    Seus PV (+{clsObj.pvPerNex} + VIG), PE (+{clsObj.pePerNex} + PRE) e SAN (+{clsObj.sanPerNex}) máximos são recalculados automaticamente.
                  </p>
                </div>

                {/* Escolha de Trilha em NEX 10% (Apenas se ainda não tiver escolhido trilha!) */}
                {!rawSheet.trail &&
                  nextNex >= 10 &&
                  rawSheet.characterClass !== 'mundano' && (
                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-amber-500/40">
                      <label className="block text-xs font-black uppercase text-amber-400">
                        <Icon name="route" /> Escolha sua Trilha de {clsObj.name} (Desbloqueia o Poder de 10% agora)
                      </label>
                      {trailBookTabs}
                      <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                        {trailsInBook.map((t) => {
                          const isSelected = evoTrailId === t.id;
                          const p10 = t.powers.find((p) => p.nex === 10);
                          // Requisito da trilha (ex.: Parapsicólogo exige Profissão treinada)
                          const reqUnmet = Boolean(
                            t.requiredSkill &&
                              !(rawSheet.skills || []).some(
                                (sk: any) => sk.id === t.requiredSkill && Number(sk.trainingDegree || 0) >= 5
                              )
                          );
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={reqUnmet}
                              title={reqUnmet ? `Requer: ${t.requirementText}` : undefined}
                              onClick={() => !reqUnmet && setEvoTrailId(t.id)}
                              className={`w-full text-left p-3.5 rounded-xl border transition ${
                                reqUnmet ? 'opacity-50 cursor-not-allowed ' : 'cursor-pointer '
                              }${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/40'
                                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-sm text-white">
                                  {isSelected ? '✓ ' : ''}Trilha: {t.name}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                                  10%: {p10?.name}
                                </span>
                              </div>
                              {t.requirementText && (
                                <p className={`text-xs mt-1 ${reqUnmet ? 'text-red-300' : 'text-zinc-500'}`}>
                                  Requisito: {t.requirementText}{reqUnmet ? ' (você não cumpre)' : ''}
                                </p>
                              )}
                              <p className="text-xs text-zinc-400 mt-1">{t.description}</p>
                              {p10 && (
                                <div className="mt-2 p-2.5 rounded-lg bg-zinc-950 border border-amber-500/30">
                                  <span className="block text-[11px] font-black text-amber-300">
                                    <Icon name="zap" /> Poder de 10% — {p10.name} {p10.cost > 0 ? `(${p10.cost} PE)` : '(Passivo)'}:
                                  </span>
                                  <p className="text-xs text-zinc-200 mt-0.5">{p10.description}</p>
                                </div>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {t.powers
                                  .filter((p) => p.nex > 10)
                                  .map((p) => (
                                    <span
                                      key={p.nex}
                                      title={p.description}
                                      className="text-[10px] font-mono bg-zinc-950 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded"
                                    >
                                      {p.nex}%: {p.name}
                                    </span>
                                  ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Monstruoso (SaH): elemento escolhido junto com a trilha; fica fixo depois */}
                {activeTrailId === 'monstruoso' &&
                  nextNex >= 10 &&
                  !characterAbilities.find((a) => a.id === 'trail-monstruoso-10')?.chosenElement && (
                    <div className="p-3 rounded-xl border border-red-800/60 bg-red-950/20 space-y-2">
                      <p className="text-xs text-zinc-300">
                        <Icon name="warning" /> Monstruoso: escolha o elemento da sua maldição (define RD, penalidades e a afinidade). Essa escolha é permanente. Em NEX 75% o personagem é banido pela Ordem.
                      </p>
                      <div role="radiogroup" aria-label="Elemento do Monstruoso" className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {['Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                          <button
                            key={el}
                            type="button"
                            role="radio"
                            aria-checked={evoMonstruosoElement === el}
                            onClick={() => setEvoMonstruosoElement(el)}
                            className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${elementChoiceClasses(el, evoMonstruosoElement === el)}`}
                          >
                            <Icon name={el.toLowerCase()} size={15} /> {el}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Monstruoso (SaH): escolhas das alterações gerais da Progressão de NEX (25%/35%) */}
                {activeTrailId === 'monstruoso' &&
                  (() => {
                    const stored = characterAbilities.find((a) => a.id === 'trail-monstruoso-10')?.nexProgChoices;
                    const keys = getMissingNexGeneralChoices(nextNex, stored);
                    if (keys.length === 0) return null;
                    return (
                      <div className="p-3 rounded-xl border border-purple-700/60 bg-purple-950/20 space-y-2">
                        <p className="text-xs text-zinc-300">
                          <Icon name="route" /> Progressão de NEX (Monstruoso): escolha as alterações gerais. Essas escolhas são permanentes.
                        </p>
                        <NexGeneralChoicePicker keys={keys} value={evoNexProgChoices} onChange={setEvoNexProgChoices} />
                      </div>
                    );
                  })()}

                {/* Detalhamento do Poder de Trilha Desbloqueado em NEX 40%, 65% ou 99% */}
                {unlockedTrailPowerAtThisNex && nextNex > 10 && selectedTrailObj && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        <Icon name="route" /> Novo Poder da Trilha {selectedTrailObj.name} Desbloqueado ({nextNex}%)
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded">
                        {unlockedTrailPowerAtThisNex.cost > 0
                          ? `${unlockedTrailPowerAtThisNex.cost} PE`
                          : 'Passivo'}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-white">
                      {unlockedTrailPowerAtThisNex.name}
                    </h4>
                    <p className="text-xs text-zinc-200 leading-relaxed">
                      {unlockedTrailPowerAtThisNex.description}
                    </p>
                  </div>
                )}

                {/* Poder de Classe, Transcender ou Versatilidade (NEX 15, 30, 45, 50, 60, 75, 90) */}
                {(milestone?.grantsClassPower || milestone?.grantsVersatility) && (
                  <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <label className="block text-xs font-black uppercase text-amber-400">
                      {milestone?.grantsVersatility
                        ? `Versatilidade (NEX 50%: Escolha Poder de ${clsObj.name}, Transcender ou Poder de 10% de outra Trilha)`
                        : `Escolha seu Poder de NEX ${nextNex}% (Poder de Classe ou Transcender)`}
                    </label>
                    <div
                      className={`grid gap-2 ${
                        milestone?.grantsVersatility && classTrails.length > 1
                          ? 'grid-cols-1 sm:grid-cols-3'
                          : 'grid-cols-2'
                      }`}
                    >
                      {activeTrailId === 'possuido' ? (
                        <p className="py-2 px-2 rounded-lg text-xs border border-purple-700/60 bg-purple-950/30 text-purple-200 self-center">
                          <Icon name="ghost" /> Possuído: seus novos poderes de ocultista viram Transcender (+2 PP máximos).
                        </p>
                      ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEvoChoiceMode('class_power');
                          setEvoSelectedPowerId('');
                          setEvoSkillTrainingPowerIds([]);
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                          evoChoiceMode === 'class_power'
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        <Icon name="swords" /> Poder de {clsObj.name} (+SAN normal)
                      </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEvoChoiceMode('transcend');
                          setEvoSelectedPowerId('');
                          setEvoSkillTrainingPowerIds([]);
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                          evoChoiceMode === 'transcend'
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        <Icon name="conhecimento" /> Transcender (Poder Paranormal)
                      </button>
                      {milestone?.grantsVersatility && classTrails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEvoChoiceMode('versatility');
                            setEvoSelectedPowerId('');
                            setEvoSkillTrainingPowerIds([]);
                          }}
                          className={`py-2 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                            evoChoiceMode === 'versatility'
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          <Icon name="route" /> 1º Poder de outra Trilha
                        </button>
                      )}
                    </div>

                    {evoChoiceMode === 'transcend' && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-purple-300 bg-purple-950/40 border border-purple-800/50 p-2.5 rounded-lg">
                          <Icon name="warning" /> Regra Oficial (p. 114): Ao escolher <strong>Transcender</strong>, você recebe um Poder Paranormal, mas <strong>não recebe o aumento de Sanidade</strong> deste avanço de NEX.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                            <button
                              key={el}
                              type="button"
                              onClick={() => setEvoPowerElementFilter(el)}
                              aria-pressed={evoPowerElementFilter === el}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                el === 'ALL'
                                  ? evoPowerElementFilter === el
                                    ? 'border bg-zinc-800 border-zinc-500 text-zinc-100'
                                    : 'border bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                  : elementChoiceClasses(el, evoPowerElementFilter === el)
                              }`}
                            >
                              {el === 'ALL' ? 'Todos os elementos' : el}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {evoChoiceMode === 'versatility' ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {trailBookTabs}
                        {trailsInBook
                          .filter((t) => t.id !== activeTrailId)
                          .map((t) => {
                            const p10 = t.powers.find((p) => p.nex === 10);
                            if (!p10) return null;
                            const valKey = `versatility:${t.id}`;
                            const selected = evoSelectedPowerId === valKey;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setEvoSelectedPowerId(valKey)}
                                className={`w-full text-left p-3 rounded-lg border transition cursor-pointer ${
                                  selected
                                    ? 'bg-emerald-600/20 border-emerald-500'
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs text-white">
                                    {selected ? '✓ ' : ''}Trilha {t.name} (10%): {p10.name}
                                  </span>
                                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded">
                                    {p10.cost > 0 ? `${p10.cost} PE` : 'Passivo'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1">{p10.description}</p>
                              </button>
                            );
                          })}
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={evoPowerSearch}
                          onChange={(e) => setEvoPowerSearch(e.target.value)}
                          placeholder="Pesquisar poder por nome ou efeito..."
                          className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-500"
                        />

                        {evoChoiceMode === 'class_power' &&
                          classPowerOptions.some((e) => isOrdemGeneralPower(e)) && (
                            <>
                              <div role="tablist" aria-label="Tipo de poder" className="trpg-tabs -mx-1">
                                {(
                                  [
                                    ['class', `De ${clsObj.name.toLowerCase()}`],
                                    ['general', 'Gerais'],
                                  ] as const
                                ).map(([id, label]) => (
                                  <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={evoPowerGroup === id}
                                    onClick={() => setEvoPowerGroup(id)}
                                    className="trpg-tab"
                                  >
                                    {label}
                                    <span className="trpg-tab-count">
                                      {classPowerOptions.filter((e) => isOrdemGeneralPower(e) === (id === 'general')).length}
                                    </span>
                                  </button>
                                ))}
                              </div>
                              {evoPowerGroup === 'general' && (
                                <p className="text-[11px] text-zinc-400">
                                  Poderes gerais valem para todas as classes e ocupam esta mesma escolha de poder.
                                </p>
                              )}
                            </>
                          )}

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {(evoChoiceMode === 'class_power'
                            ? classPowerOptions.some((e) => isOrdemGeneralPower(e))
                              ? classPowerOptions.filter(
                                  (e) => isOrdemGeneralPower(e) === (evoPowerGroup === 'general')
                                )
                              : classPowerOptions
                            : paranormalPowerOptions
                          ).map((pw) => {
                            const check = checkOrdemPowerRequirements(
                              pw,
                              { ...(rawSheet as OrdemSheetData), nex: nextNex },
                              characterAbilities
                            );
                            const alreadyOwnedAb = characterAbilities.find(
                              (ab) =>
                                ab.name.trim().toLowerCase() === pw.name.trim().toLowerCase() ||
                                ab.name.trim().toLowerCase() ===
                                  `${pw.name.trim().toLowerCase()} (afinidade)`
                            );
                            const isRepeatableSkillPower = pw.name
                              .toLowerCase()
                              .includes('treinamento em perícia');
                            const canUpgradeAffinity =
                              evoChoiceMode === 'transcend' &&
                              Boolean(alreadyOwnedAb) &&
                              !alreadyOwnedAb?.name.toLowerCase().includes('afinidade') &&
                              nextNex >= 50 &&
                              Boolean(effectiveCharAffinity) &&
                              effectiveCharAffinity?.toLowerCase() ===
                                (pw.metadata?.element || '').toLowerCase();

                            const isBlockedDuplicate =
                              Boolean(alreadyOwnedAb) && !isRepeatableSkillPower && !canUpgradeAffinity;
                            const isUnselectable = !check.met || isBlockedDuplicate;
                            const selected = evoSelectedPowerId === pw.id;

                            return (
                              <button
                                key={pw.id}
                                type="button"
                                disabled={isUnselectable}
                                onClick={() => {
                                  if (isUnselectable) return;
                                  setEvoSelectedPowerId(pw.id);
                                  setEvoSkillTrainingPowerIds([]);
                                }}
                                className={`w-full text-left p-3 rounded-lg border transition ${
                                  isUnselectable
                                    ? 'bg-zinc-950 border-zinc-800/50 opacity-50 cursor-not-allowed'
                                    : selected
                                    ? 'bg-amber-600/20 border-amber-500 cursor-pointer'
                                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-xs text-white">{pw.name}</span>
                                    <SourceTagBadge
                                      sourceId={resolveEntrySourceId(pw, 'ordem-paranormal')}
                                      system="ordem-paranormal"
                                    />
                                    {pw.metadata?.element && (
                                      <ElementBadge element={pw.metadata.element} />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {isBlockedDuplicate ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                        ✓ Já possui na ficha
                                      </span>
                                    ) : canUpgradeAffinity ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900 text-purple-200 border border-purple-500">
                                        <Icon name="conhecimento" /> Desbloquear Afinidade
                                      </span>
                                    ) : (
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          check.met
                                            ? 'bg-emerald-950 text-emerald-300'
                                            : 'bg-red-950 text-red-300'
                                        }`}
                                      >
                                        {check.met ? '✓ Pré-req OK' : `Falta: ${check.missing.join(', ')}`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1">{pw.description}</p>
                              </button>
                            );
                          })}
                        </div>

                        {/* Seletor de 2 perícias quando Treinamento em Perícia for escolhido */}
                        {evoChoiceMode === 'class_power' &&
                          (() => {
                            const selectedEntry = classPowerOptions.find(
                              (e) => e.id === evoSelectedPowerId
                            );
                            if (
                              !selectedEntry?.name
                                .toLowerCase()
                                .includes('treinamento em perícia')
                            ) {
                              return null;
                            }
                            const eligibleSkills = (rawSheet.skills || []).filter((sk: any) => {
                              const deg = Number(sk.trainingDegree || 0);
                              return (
                                deg === 0 ||
                                (deg === 5 && nextNex >= 35) ||
                                (deg === 10 && nextNex >= 70)
                              );
                            });

                            return (
                              <div className="mt-2 p-3 rounded-xl bg-zinc-900 border border-amber-500/40 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-amber-300">
                                    <Icon name="graduation" /> Treinamento em Perícia: Escolha até 2 perícias para evoluir
                                  </span>
                                  <span className="font-mono text-amber-200">
                                    {evoSkillTrainingPowerIds.length} / 2
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                  {eligibleSkills.map((sk: any) => {
                                    const picked = evoSkillTrainingPowerIds.includes(sk.id);
                                    const deg = Number(sk.trainingDegree || 0);
                                    const nextDeg = deg === 0 ? 5 : deg === 5 ? 10 : 15;
                                    const full =
                                      !picked && evoSkillTrainingPowerIds.length >= 2;
                                    return (
                                      <button
                                        key={sk.id}
                                        type="button"
                                        disabled={full}
                                        onClick={() =>
                                          setEvoSkillTrainingPowerIds((prev) =>
                                            prev.includes(sk.id)
                                              ? prev.filter((id) => id !== sk.id)
                                              : prev.length < 2
                                              ? [...prev, sk.id]
                                              : prev
                                          )
                                        }
                                        className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                                          picked
                                            ? 'bg-amber-600 text-white border-amber-400'
                                            : full
                                            ? 'bg-zinc-950 text-zinc-600 border-zinc-800 cursor-not-allowed'
                                            : 'bg-zinc-950 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                                        }`}
                                      >
                                        {picked ? '✓ ' : ''}
                                        {sk.name} (+{deg} → +{nextDeg})
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                        {/* Seletor de Ritual quando Aprender Ritual (Transcender) for escolhido */}
                        {evoChoiceMode === 'transcend' &&
                          (() => {
                            const selectedEntry = paranormalPowerOptions.find(
                              (e) => e.id === evoSelectedPowerId
                            );
                            if (
                              !selectedEntry ||
                              (selectedEntry.id !== 'ord-para-aprender-ritual' &&
                                !selectedEntry.name.toLowerCase().includes('aprender ritual'))
                            ) {
                              return null;
                            }
                            const maxAprenderCircle = Math.min(2, maxCircleUnlocked);
                            const eligibleKnownSet = createKnownRitualsKeySet(characterAbilities);
                            const eligibleRituals = (
                              compendiumEntries.filter((e) => e.category === 'spell').length > 0
                                ? compendiumEntries.filter((e) => e.category === 'spell')
                                : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'spell')
                            )
                              .filter((r) =>
                                matchesContentSourceFilter(
                                  resolveEntrySourceId(r, 'ordem-paranormal'),
                                  evoSourceFilter,
                                  campaignAllowedSources,
                                  'ordem-paranormal'
                                )
                              )
                              .filter((r) => (r.metadata?.circle || 1) <= maxAprenderCircle)
                              .sort((a, b) => {
                                const ownedA = isOrdemRitualAlreadyOwned(a, characterAbilities, eligibleKnownSet) ? 1 : 0;
                                const ownedB = isOrdemRitualAlreadyOwned(b, characterAbilities, eligibleKnownSet) ? 1 : 0;
                                if (ownedA !== ownedB) return ownedA - ownedB;
                                return a.name.localeCompare(b.name, 'pt-BR');
                              });

                            return (
                              <div className="mt-2 p-3 rounded-xl bg-zinc-900 border border-purple-500/40 space-y-2">
                                <label className="block text-xs font-bold text-purple-300">
                                  <Icon name="sigil" /> Aprender Ritual: Escolha o Ritual (até {maxAprenderCircle}º Círculo)
                                </label>
                                <select
                                  value={evoExtraPowerRitualId}
                                  onChange={(e) => setEvoExtraPowerRitualId(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-purple-700 text-xs text-white"
                                >
                                  <option value="">-- Selecione um Ritual --</option>
                                  {eligibleRituals.map((r) => {
                                    const alreadyOwned = isOrdemRitualAlreadyOwned(r, characterAbilities, eligibleKnownSet);
                                    return (
                                      <option key={r.id} value={r.id} disabled={alreadyOwned}>
                                        {r.name} ({r.metadata?.circle || 1}ºC • {r.metadata?.element || 'Paranormal'}){alreadyOwned ? ' [✓ Já possui]' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            );
                          })()}

                        {/* Seletor de Poder de Outra Classe quando Expansão de Conhecimento for escolhido */}
                        {evoChoiceMode === 'transcend' &&
                          (() => {
                            const selectedEntry = paranormalPowerOptions.find(
                              (e) => e.id === evoSelectedPowerId
                            );
                            if (
                              !selectedEntry ||
                              (selectedEntry.id !== 'ord-para-conh-expansao' &&
                                !selectedEntry.name
                                  .toLowerCase()
                                  .includes('expansão de conhecimento'))
                            ) {
                              return null;
                            }
                            const otherClassPowers = allPowerEntries
                              .filter((e) =>
                                matchesContentSourceFilter(
                                  resolveEntrySourceId(e, 'ordem-paranormal'),
                                  evoSourceFilter,
                                  campaignAllowedSources,
                                  'ordem-paranormal'
                                )
                              )
                              .filter((e) => {
                                const ln = e.name.toLowerCase();
                                const lr = (e.metadata?.requirements || '').toLowerCase();
                                if (
                                  ln.includes('ataque especial') ||
                                  ln.includes('treinamento em perícia')
                                ) {
                                  return false;
                                }
                                return !lr.includes(
                                  String(rawSheet.characterClass || '').toLowerCase()
                                );
                              })
                              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

                            return (
                              <div className="mt-2 p-3 rounded-xl bg-zinc-900 border border-amber-500/40 space-y-2">
                                <label className="block text-xs font-bold text-amber-300">
                                  <Icon name="conhecimento" /> Expansão de Conhecimento: Escolha 1 Poder de Outra Classe
                                </label>
                                <select
                                  value={evoExpansaoPowerId}
                                  onChange={(e) => setEvoExpansaoPowerId(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-amber-700 text-xs text-white"
                                >
                                  <option value="">-- Selecione um Poder de Outra Classe --</option>
                                  {otherClassPowers.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}
                      </>
                    )}
                  </div>
                )}

                {/* Aumento de Atributo (NEX 20, 50, 80, 95) */}
                {milestone?.grantsAttributeIncrease && (
                  <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <label className="block text-xs font-black uppercase text-amber-400">
                      <Icon name="trending" /> Aumento de Atributo (+1 ponto, máx. 5)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {(['agi', 'for', 'int', 'pre', 'vig'] as const).map((k) => {
                        const curr = Number(rawSheet.attributes?.[k] ?? 1);
                        return (
                          <button
                            key={k}
                            type="button"
                            disabled={curr >= 5}
                            onClick={() => setEvoAttrKey(k)}
                            className={`py-2 rounded-lg text-xs font-black uppercase border cursor-pointer ${
                              evoAttrKey === k
                                ? 'bg-amber-600 text-white border-amber-400'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-800 disabled:opacity-40'
                            }`}
                          >
                            {k} ({curr} → {Math.min(5, curr + 1)})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grau de Treinamento (NEX 35 Veterano, NEX 70 Expert) COM LIMITE OFICIAL (BASE + INT) */}
                {milestone?.grantsTrainingUpgrade && (
                  <div className="space-y-2.5 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-black uppercase text-amber-400">
                        <Icon name="graduation" /> Grau de Treinamento ({nextNex >= 70 ? 'Expert +15' : 'Veterano +10'}): Escolha até {maxSkillUpgrades} perícias ({clsObj.trainingUpgradeBase} da classe + {Math.max(0, effIntForTraining)} INT)
                      </label>
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                          evoUpgradeSkills.length === maxSkillUpgrades
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : 'bg-zinc-900 text-amber-300 border-zinc-700'
                        }`}
                      >
                        Selecionadas: {evoUpgradeSkills.length} / {maxSkillUpgrades}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(rawSheet.skills || [])
                        .filter((s: any) =>
                          nextNex >= 70 ? s.trainingDegree === 10 : s.trainingDegree === 5
                        )
                        .map((sk: any) => {
                          const picked = evoUpgradeSkills.includes(sk.id);
                          const limitReached =
                            !picked && evoUpgradeSkills.length >= maxSkillUpgrades;
                          return (
                            <button
                              key={sk.id}
                              type="button"
                              disabled={limitReached}
                              onClick={() =>
                                setEvoUpgradeSkills((prev) => {
                                  if (prev.includes(sk.id)) {
                                    return prev.filter((i) => i !== sk.id);
                                  }
                                  if (prev.length >= maxSkillUpgrades) return prev;
                                  return [...prev, sk.id];
                                })
                              }
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                                picked
                                  ? 'bg-amber-600 text-white border-amber-400 cursor-pointer'
                                  : limitReached
                                  ? 'bg-zinc-950 text-zinc-600 border-zinc-800/50 cursor-not-allowed'
                                  : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600 cursor-pointer'
                              }`}
                            >
                              {picked ? '✓ ' : ''}
                              {sk.name} (+{sk.trainingDegree} → +{nextNex >= 70 ? 15 : 10})
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Afinidade Elemental em NEX 50% */}
                {milestone?.grantsAffinity && (
                  <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-purple-500/40">
                    <label className="block text-xs font-black uppercase text-purple-300">
                      <Icon name="conhecimento" /> Afinidade com Elemento Paranormal (NEX 50%)
                    </label>
                    <div role="radiogroup" aria-label="Elemento de afinidade" className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {['Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => {
                        const monstroEl = characterAbilities.find((a) => a.id === 'trail-monstruoso-10')?.chosenElement;
                        const locked = Boolean(monstroEl && monstroEl !== el);
                        return (
                        <button
                          key={el}
                          type="button"
                          role="radio"
                          aria-checked={evoAffinity === el}
                          disabled={locked}
                          title={locked ? `Monstruoso: sua afinidade precisa ser ${monstroEl}` : undefined}
                          onClick={() => !locked && setEvoAffinity(el)}
                          className={`px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 ${elementChoiceClasses(el, evoAffinity === el)}`}
                        >
                          <Icon name={el.toLowerCase()} size={15} /> {el}
                        </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ocultista: +1 Ritual aprendido a cada novo NEX COM FILTRO E DETALHES COMPLETOS */}
                {rawSheet.characterClass === 'ocultista' && (
                  <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-purple-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-black uppercase text-purple-300">
                        <Icon name="sigil" /> Escolhido pelo Outro Lado: Escolha +1 Novo Ritual (Até {maxCircleUnlocked}º Círculo)
                      </label>
                      {evoNewRitualId && (
                        <span className="text-xs font-bold text-emerald-400">
                          ✓ Ritual selecionado
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={evoRitualSearch}
                        onChange={(e) => setEvoRitualSearch(e.target.value)}
                        placeholder="Pesquisar ritual por nome ou efeito..."
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      <div className="flex flex-wrap gap-1">
                        {(['ALL', 1, 2, 3, 4] as const)
                          .filter((c) => c === 'ALL' || c <= maxCircleUnlocked)
                          .map((c) => (
                            <button
                              key={String(c)}
                              type="button"
                              onClick={() => setEvoRitualCircleFilter(c)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                                evoRitualCircleFilter === c
                                  ? 'bg-purple-600 border-purple-400 text-white'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                              }`}
                            >
                              {c === 'ALL' ? 'Todos Círc.' : `${c}ºC`}
                            </button>
                          ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo'].map((el) => (
                        <button
                          key={el}
                          type="button"
                          onClick={() => setEvoRitualElementFilter(el)}
                          aria-pressed={evoRitualElementFilter === el}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            el === 'ALL'
                              ? evoRitualElementFilter === el
                                ? 'border bg-zinc-800 border-zinc-500 text-zinc-100'
                                : 'border bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200'
                              : elementChoiceClasses(el, evoRitualElementFilter === el)
                          }`}
                        >
                          {el === 'ALL' ? 'Todos os elementos' : el}
                        </button>
                      ))}
                    </div>

                    {evoShowAmaldicoarPrompt && (
                      <div className="p-3.5 rounded-xl bg-amber-950/40 border-2 border-amber-500 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-amber-400">
                              <Icon name="sigil" /> Escolha Obrigatória do Ritual
                            </span>
                            <h5 className="text-xs font-black text-white">
                              De qual elemento você quer aprender &quot;Amaldiçoar Arma&quot;?
                            </h5>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEvoShowAmaldicoarPrompt(false)}
                            className="text-xs text-zinc-400 hover:text-white px-2 py-0.5"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(
                            [
                              { el: 'Sangue', icon: 'sangue' },
                              { el: 'Morte', icon: 'morte' },
                              { el: 'Conhecimento', icon: 'conhecimento' },
                              { el: 'Energia', icon: 'energia' },
                            ] as const
                          ).map((opt) => {
                            const hasThisEl = characterAbilities.some((ab) =>
                              ab.name.toLowerCase().includes(`amaldiçoar arma — ${opt.el.toLowerCase()}`)
                            );
                            return (
                              <button
                                key={opt.el}
                                type="button"
                                disabled={hasThisEl}
                                onClick={() => {
                                  setEvoNewRitualId(`ord-rit-amaldicoar-arma:${opt.el}`);
                                  setEvoShowAmaldicoarPrompt(false);
                                }}
                                className={`py-2 px-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${elementChoiceClasses(opt.el, false)}`}
                              >
                                <Icon name={opt.icon} size={16} />
                                <span>{opt.el}</span>
                                {hasThisEl && <span>(Já tem)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {allRitualsUpToCircle.map((r) => {
                        const isAmaldicoar =
                          r.id === 'ord-rit-amaldicoar-arma' ||
                          r.name.toLowerCase().includes('amaldiçoar arma');
                        const alreadyKnown = isOrdemRitualAlreadyOwned(r, characterAbilities, evoKnownRitualsSet);
                        const isPicked =
                          evoNewRitualId === r.id || evoNewRitualId.startsWith(`${r.id}:`);
                        const pickedElement = evoNewRitualId.startsWith(`${r.id}:`)
                          ? evoNewRitualId.split(':')[1]
                          : undefined;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={alreadyKnown}
                            onClick={() => {
                              if (isAmaldicoar) {
                                setEvoShowAmaldicoarPrompt(true);
                              } else {
                                setEvoNewRitualId(r.id);
                                setEvoShowAmaldicoarPrompt(false);
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition ${
                              alreadyKnown
                                ? 'bg-zinc-950 border-zinc-800/50 opacity-50 cursor-not-allowed'
                                : isPicked
                                ? 'bg-purple-600/20 border-purple-400 ring-1 ring-purple-400/40 cursor-pointer'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs text-white">
                                  {isPicked ? '✓ ' : ''}
                                  {r.name}
                                  {pickedElement ? ` (${pickedElement})` : ''}
                                </span>
                                <SourceTagBadge
                                  sourceId={resolveEntrySourceId(r, 'ordem-paranormal')}
                                  system="ordem-paranormal"
                                />
                                <span className="text-xs text-zinc-400 trpg-num">{r.metadata?.circle || 1}º círculo</span>
                                <ElementBadge element={r.metadata?.element || 'Paranormal'} />
                                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                                  {r.cost} PE
                                </span>
                                {r.metadata?.damageFormula && (
                                  <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded">
                                    <Icon name="d20" /> {r.metadata.damageFormula}
                                  </span>
                                )}
                              </div>
                              {alreadyKnown && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                  ✓ Já conhecido
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-300 mt-1.5 leading-relaxed">
                              {r.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {(() => {
                const evoMissingRequirements = getNexEvolutionMissingSteps(
                  currentNex,
                  nextNex,
                  milestone
                );
                return (
                  <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 space-y-2.5">
                    {evoMissingRequirements.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/60 text-xs text-amber-200 font-semibold">
                        <Icon name="warning" /> Pendente antes de avançar: {evoMissingRequirements.join(' • ')}
                      </div>
                    )}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsNexEvolutionOpen(false)}
                        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={evoMissingRequirements.length > 0}
                        onClick={handleConfirmNexEvolution}
                        className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-lg transition ${
                          evoMissingRequirements.length > 0
                            ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                        }`}
                      >
                        <Icon name="check-circle" /> Confirmar Evolução para NEX {nextNex}%
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Banner de Cena de Interlúdio Liberada pelo Mestre */}
      {character.system === 'ordem-paranormal' && rawSheet.pendingInterlude && (
        <div className="bg-indigo-950/60 border border-indigo-500/70 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-indigo-950/40">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
              <Icon name="moon" /> Cena de Interlúdio Liberada
            </span>
            <p className="text-sm font-bold text-white">
              O Mestre iniciou um Interlúdio para você! (Descanso:{' '}
              <span className="text-indigo-200">
                {rawSheet.pendingInterlude.comfort === 0.5
                  ? 'Precário (0,5x)'
                  : rawSheet.pendingInterlude.comfort === 2
                  ? 'Confortável (2x)'
                  : rawSheet.pendingInterlude.comfort === 3
                  ? 'Luxuoso (3x)'
                  : 'Normal (1x)'}
              </span>
              )
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenInterludeModal(rawSheet.pendingInterlude.comfort)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow"
          >
            <Icon name="moon" /> Escolher Ações de Interlúdio
          </button>
        </div>
      )}

      {/* Módulos dos Sistemas */}
      {character.system === 'ordem-paranormal' && (
        <OrdemSheet
          data={character.sheetData as OrdemSheetData}
          bonuses={bonuses}
          customSkills={customSkills}
          abilities={characterAbilities}
          allowedSources={campaignAllowedSources}
          isInCampaign={Boolean(character.campaignId)}
          isOverloaded={isCharacterOverloaded}
          isMachucado={isCharacterMachucado}
          isEditMode={isEditMode}
          canEditAttributes={canEditAttributes}
          canEditAbilities={canEditAbilities}
          onSyncTrailAbilities={handleSyncOrdemTrailAbilities}
          onOpenNexEvolution={handleOpenNexEvolutionModal}
          onCheckResource={handleCheckResource}
          onSpendResource={handleSpendResource}
          onHealPv={handleHealPv}
          hasActiveInitiativeOrder={hasActiveInitiativeOrder}
          isMyTurnInCombat={isMyTurnInCombat}
          currentRoundNumber={currentRoundNumber}
          peSpentThisTurn={peSpentThisTurn}
          onChange={(updatedData) =>
            applyLocalCharacterUpdate((prev) => {
              const prevRaw = (prev.sheetData || {}) as Record<string, any>;
              const prevNex = Number(prevRaw.nex ?? 5);
              const nextNexVal = Number(updatedData.nex ?? prevNex);
              const prevVig = Number(prevRaw.attributes?.vig ?? 1);
              const nextVig = Number(updatedData.attributes?.vig ?? prevVig);
              const prevPre = Number(prevRaw.attributes?.pre ?? 1);
              const nextPre = Number(updatedData.attributes?.pre ?? prevPre);

              let nextVitals = prev.vitals;
              if (
                nextNexVal !== prevNex ||
                nextVig !== prevVig ||
                nextPre !== prevPre
              ) {
                const newBaseVitals = calculateOrdemBaseVitals({
                  characterClass: updatedData.characterClass || 'combatente',
                  attributes: updatedData.attributes,
                  nex: nextNexVal,
                  originIdOrName: updatedData.origin,
                  transcendedCount: Number(
                    updatedData.transcendedCount ?? prevRaw.transcendedCount ?? 0
                  ),
                });
                const prevAbilities: CharacterAbility[] = Array.isArray(prevRaw.abilities)
                  ? prevRaw.abilities
                  : [];
                const prevConds: ActiveCondition[] = Array.isArray(prevRaw.conditions)
                  ? prevRaw.conditions
                  : [];
                const prevEffects: SceneEffect[] = Array.isArray(prevRaw.sceneEffects)
                  ? prevRaw.sceneEffects
                  : [];
                const oldBonuses = calculateActiveBonuses(
                  'ordem-paranormal',
                  prevNex,
                  prevAbilities,
                  prev.inventory || [],
                  prevConds,
                  prevEffects
                );
                const newBonuses = calculateActiveBonuses(
                  'ordem-paranormal',
                  nextNexVal,
                  prevAbilities,
                  prev.inventory || [],
                  prevConds,
                  prevEffects
                );

                nextVitals = prev.vitals.map((bar) => {
                  const oldEffMax = bar.max + (oldBonuses.vitalMax[bar.id] || 0);
                  if (bar.id === 'pv') {
                    const newEffMax = newBaseVitals.pvMax + (newBonuses.vitalMax.pv || 0);
                    const delta = Math.max(0, newEffMax - oldEffMax);
                    return {
                      ...bar,
                      max: newBaseVitals.pvMax,
                      current: Math.max(0, Math.min(newEffMax, bar.current + delta)),
                    };
                  }
                  if (bar.id === 'pe') {
                    const newEffMax = newBaseVitals.peMax + (newBonuses.vitalMax.pe || 0);
                    const delta = Math.max(0, newEffMax - oldEffMax);
                    return {
                      ...bar,
                      max: newBaseVitals.peMax,
                      current: Math.max(0, Math.min(newEffMax, bar.current + delta)),
                    };
                  }
                  if (bar.id === 'san') {
                    const newEffMax = newBaseVitals.sanMax + (newBonuses.vitalMax.san || 0);
                    const delta = Math.max(0, newEffMax - oldEffMax);
                    return {
                      ...bar,
                      max: newBaseVitals.sanMax,
                      current: Math.max(0, Math.min(newEffMax, bar.current + delta)),
                    };
                  }
                  return bar;
                });
              }

              return {
                ...prev,
                vitals: nextVitals,
                sheetData: {
                  ...updatedData,
                  abilities: prevRaw.abilities || [],
                  conditions: prevRaw.conditions || [],
                  tempHp: updatedData.tempHp ?? prevRaw.tempHp ?? 0,
                  tempHpMax: updatedData.tempHpMax ?? prevRaw.tempHpMax ?? 0,
                  tempPe: updatedData.tempPe ?? prevRaw.tempPe ?? 0,
                  tempPeMax: updatedData.tempPeMax ?? prevRaw.tempPeMax ?? 0,
                  sceneEffects: updatedData.sceneEffects ?? prevRaw.sceneEffects ?? [],
                  proficiencies: updatedData.proficiencies ?? prevRaw.proficiencies,
                  personalProfile: updatedData.personalProfile ?? prevRaw.personalProfile,
                  originMeta: updatedData.originMeta ?? prevRaw.originMeta,
                  useSeparateNexAndLevel:
                    updatedData.useSeparateNexAndLevel ?? prevRaw.useSeparateNexAndLevel,
                  interludeBonusDice: updatedData.interludeBonusDice ?? prevRaw.interludeBonusDice,
                  pendingInterlude:
                    updatedData.pendingInterlude !== undefined
                      ? updatedData.pendingInterlude
                      : prevRaw.pendingInterlude,
                } as any,
              };
            })
          }
          onLoseSanity={handleLoseSanity}
          onTriggerOriginSpecial={handleTriggerOriginSpecial}
          onRoll={(label, count, sides, mod, cursePricePrompt, extraOpts) =>
            triggerCharacterRoll(
              label,
              count,
              sides,
              mod,
              false,
              false,
              undefined,
              undefined,
              undefined,
              cursePricePrompt || extraOpts
                ? {
                    ...(extraOpts || {}),
                    ...(cursePricePrompt ? { cursePricePrompt } : {}),
                  }
                : undefined
            )
          }
        />
      )}

      {character.system === 'tormenta20' && (
        <TormentaSheet
          data={character.sheetData as T20SheetData}
          bonuses={bonuses}
          customSkills={customSkills}
          isEditMode={isEditMode}
          canEditAttributes={canEditAttributes}
          canEditAbilities={canEditAbilities}
          onChange={(updatedData) =>
            applyLocalCharacterUpdate((prev) => {
              const prevRaw = (prev.sheetData || {}) as Record<string, any>;
              return {
                ...prev,
                sheetData: {
                  ...updatedData,
                  abilities: prevRaw.abilities || [],
                  conditions: prevRaw.conditions || [],
                  tempHp: prevRaw.tempHp || 0,
                  tempHpMax: prevRaw.tempHpMax || 0,
                  tempPe: prevRaw.tempPe || 0,
                  tempPeMax: prevRaw.tempPeMax || 0,
                  sceneEffects: prevRaw.sceneEffects || [],
                  proficiencies: updatedData.proficiencies ?? prevRaw.proficiencies,
                  personalProfile: updatedData.personalProfile ?? prevRaw.personalProfile,
                  interludeBonusDice: updatedData.interludeBonusDice ?? prevRaw.interludeBonusDice,
                  pendingInterlude:
                    updatedData.pendingInterlude !== undefined
                      ? updatedData.pendingInterlude
                      : prevRaw.pendingInterlude,
                } as any,
              };
            })
          }
          onRoll={(label, count, sides, mod) =>
            triggerCharacterRoll(label, count, sides, mod)
          }
        />
      )}

      {/* Abas Inferiores integradas com Troca entre Jogadores */}
      <SheetExtras
        system={character.system}
        ordemConditions={activeConditions}
        onRemoveCondition={handleRemoveCondition}
        onTranscend={(power) => {
          // Transcender: recebe o poder paranormal, conta +1 Transcender e não ganha a SAN deste NEX
          const cls = ORDEM_CLASSES.find((c) => c.id === rawSheet.characterClass);
          applyLocalCharacterUpdate((base) => {
            const baseRaw = (base.sheetData || {}) as Record<string, any>;
            return {
              ...base,
              vitals: base.vitals.map((bar) =>
                bar.id === 'san' && cls
                  ? { ...bar, max: Math.max(1, bar.max - cls.sanPerNex), current: Math.min(bar.current, Math.max(1, bar.max - cls.sanPerNex)) }
                  : bar
              ),
              sheetData: {
                ...baseRaw,
                transcendedCount: Number(baseRaw.transcendedCount || 0) + 1,
                abilities: [...(Array.isArray(baseRaw.abilities) ? baseRaw.abilities : []), power],
              },
            };
          });
          logSheetActivity({ category: 'ability', summary: `Transcendeu: ${power.name}`, tone: 'purple' });
        }}
        vitalsNow={(() => {
          const get = (id: string) => character.vitals.find((b) => b.id === id);
          const max = (id: string) => (get(id)?.max || 0) + (bonuses.vitalMax[id] || 0);
          return {
            pv: get('pv')?.current || 0,
            pvMax: max('pv'),
            san: get('san')?.current || 0,
            sanMax: max('san'),
            pe: (get('pe')?.current || 0) + Number(rawSheet.tempPe || 0),
            peLimit: getOrdemPeLimit(levelOrNex, rawSheet.origin, characterAbilities),
          };
        })()}
        onAdjustVital={(barId, delta, reason) => {
          applyLocalCharacterUpdate((base) => ({
            ...base,
            vitals: base.vitals.map((bar) => {
              if (bar.id !== barId) return bar;
              const effMax = bar.max + (bonuses.vitalMax[bar.id] || 0);
              return { ...bar, current: Math.max(0, Math.min(effMax, bar.current + delta)) };
            }),
          }));
          logSheetActivity({ category: 'ability', summary: reason, tone: 'purple' });
        }}
        pvDamageTaken={(() => {
          const pv = character.vitals.find((b) => b.id === 'pv');
          return pv ? Math.max(0, pv.max - pv.current) : 0;
        })()}
        allowedSources={campaignAllowedSources}
        ordemSheetData={
          character.system === 'ordem-paranormal'
            ? (character.sheetData as OrdemSheetData)
            : undefined
        }
        isInCampaign={Boolean(character.campaignId)}
        campaignId={character.campaignId || undefined}
        characterId={character.id}
        characterName={character.name}
        bonuses={bonuses}
        compendiumEntries={compendiumEntries}
        isEditMode={isEditMode}
        canEditInventory={canEditInventory}
        canEditAbilities={canEditAbilities}
        canCreateCustom={canMasterControl}
        canTrade={canTrade}
        attacks={character.attacks || []}
        abilities={characterAbilities}
        inventory={character.inventory || []}
        maxLoadSlots={maxLoadSlots}
        personalProfile={(rawSheet.personalProfile || {}) as CharacterPersonalProfile}
        canEditPersonal={!isLockedByMaster}
        onUpdatePersonalProfile={(nextProfile) =>
          applyLocalCharacterUpdate(
            (base) => ({
              ...base,
              sheetData: {
                ...((base.sheetData || {}) as Record<string, any>),
                personalProfile: nextProfile,
              },
            }),
            true
          )
        }
        onUpdateAttacks={(newAttacks) =>
          applyLocalCharacterUpdate((base) => ({ ...base, attacks: newAttacks }))
        }
        onUpdateAbilities={(newAbilities) =>
          applyLocalCharacterUpdate((base) => {
            const baseRaw = (base.sheetData || {}) as Record<string, any>;
            // Poderes gerais (SaH): "recebe treinamento na perícia ou, se já for treinado, +2"
            if (base.system === 'ordem-paranormal' && Array.isArray(baseRaw.skills)) {
              const grants = applyGeneralPowerSkillGrants(
                Array.isArray(baseRaw.abilities) ? baseRaw.abilities : [],
                newAbilities,
                baseRaw.skills
              );
              if (grants.changed) {
                return {
                  ...base,
                  sheetData: { ...baseRaw, abilities: grants.abilities, skills: grants.skills },
                };
              }
            }
            return {
              ...base,
              sheetData: { ...baseRaw, abilities: newAbilities },
            };
          })
        }
        onUpdateInventory={(newInv) =>
          applyLocalCharacterUpdate((base) => ({ ...base, inventory: newInv }))
        }
        onAddItemAndAttack={(newItem, newAttack) =>
          applyLocalCharacterUpdate((base) => ({
            ...base,
            inventory: [...(base.inventory || []), newItem],
            attacks: newAttack ? [...(base.attacks || []), newAttack] : base.attacks,
          }))
        }
        onInitiateTradeItem={handleOpenTradeModal}
        onCheckResource={handleCheckResource}
        onSpendResource={handleSpendResource}
        onHealPv={handleHealPv}
        onTakePvDamage={handleTakePvDamage}
        onGrantTempPe={handleGrantTempPe}
        onLoseSanity={handleLoseSanity}
        onAddSceneEffect={handleAddSceneEffect}
        onCastOrdemRitual={handleCastOrdemRitual}
        onLogActivity={logSheetActivity}
        onUpdateSceneEffects={(newEffects) => {
          const base = latestCharacterRef.current;
          if (!base) return;
          const baseRaw = (base.sheetData || {}) as Record<string, any>;
          const nextChar: FullCharacterResponse = {
            ...base,
            sheetData: { ...baseRaw, sceneEffects: newEffects },
          };
          latestCharacterRef.current = nextChar;
          setCharacter(nextChar);
          if (!isEditMode) {
            scheduleGameModeSave();
          }
        }}
        onTriggerOriginSpecial={handleTriggerOriginSpecial}
        onUpdateOriginMeta={handleUpdateOriginMeta}
        onApplyFlashback={handleApplyFlashback}
        onLosePermanentSanity={handleLosePermanentSanity}
        vislumbresSuccessPending={Boolean(
          vislumbresResult?.passed && !vislumbresResult?.peGranted
        )}
        onRollVislumbresPe={handleRollVislumbresPe}
        hasActiveInitiativeOrder={hasActiveInitiativeOrder}
        turnResetSignal={turnResetSignal}
        onRoll={(
          label,
          count,
          sides,
          mod,
          _isDamage,
          attackDamagePayload,
          forcaOpressoraPayload,
          extraRollOpts
        ) => {
          const fixedRolls =
            _isDamage && attackDamagePayload?.maximizeCritDamage
              ? Array(Math.max(1, count)).fill(sides)
              : undefined;
          triggerCharacterRoll(
            label,
            count,
            sides,
            mod,
            false,
            false,
            fixedRolls,
            _isDamage ? undefined : attackDamagePayload,
            forcaOpressoraPayload,
            extraRollOpts
          );
        }}
      />
    </div>
  );
}