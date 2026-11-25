import { useState, useEffect, useRef } from 'react';
import {
  SystemId,
  SheetPermissions,
  DiceRollResult,
  CompendiumEntryData,
  ActiveCondition,
  CharacterAbility,
  RPGItem,
  VitalBar,
  PreparedAttack,
  CampaignThreat,
  CampaignMerchant,
  StickyPostIt,
  MonitorDirectorState,
  calculateActiveBonuses,
  SessionActivityCategory,
  SessionActivityLogEntry,
  CharacterLivePatch,
  resolveTempVitalMax,
  applyZeroHpRule,
  currentPvOf,
  hasDyingCondition,
  isDyingCondition,
  isUnconsciousCondition,
  hasApegoAngustiado,
  dyingTurnsOf,
  deathAtOf,
  DYING_TURNS_TO_DIE,
  getDyingTurnsToDie,
} from '@totalrpg/shared';
import {
  DMScreenCampaignData,
  DMScreenCharacter,
  fetchDMScreenData,
  updateCampaignPermissions,
  updateCampaignDMData,
  updateCharacter,
  fetchCompendium,
  removeCharacterFromCampaign
} from '../services/api';
import { BestiaryManager } from './dm/BestiaryManager';
import { LootAndMerchantsManager, CampaignStoredItem } from './dm/LootAndMerchantsManager';
import { NotesAndPostItsManager, FloatingPostItsLayer } from './dm/NotesAndPostItsManager';
import { MonitorDirectorPanel } from './dm/MonitorPanel';
import { DyingTracker } from './ui/DyingTracker';
import { RequestInitiativeDialog, ManualInitiativeDialog } from './dm/InitiativeDialogs';
import { TempVitalBar } from './TempVitalBar';
import { useTheme } from '../theme/themeEngine';

import { Icon } from './ui/Icon';
export interface CombatantEntry {
  id: string;
  characterId?: string;
  name: string;
  imageUrl?: string;
  initiative: number;
  isNPC: boolean;
  hpCurrent?: number;
  hpMax?: number;
  vd?: number;
  element?: string;
  defense?: number;
  resistances?: string;
  vulnerabilities?: string;
  attacks?: PreparedAttack[];
  attackName?: string;
  attackDice?: number;
  attackBonus?: number;
  damageFormula?: string;
}

interface DMScreenProps {
  campaignId: string;
  rollHistory: DiceRollResult[];
  liveActivityLog?: SessionActivityLogEntry[];
  onClearRolls: () => void;
  onClearActivityLog?: () => void;
  onLogActivity?: (
    entry: Omit<SessionActivityLogEntry, 'id' | 'timestamp' | 'createdAt' | 'campaignId'> & {
      campaignId?: string;
    }
  ) => void;
  onInspectCharacter: (characterId: string) => void;
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
    extraDice?: Array<{ count: number; sides: number; label: string }>
  ) => void;
  onBroadcastPermissions: (permissions: SheetPermissions) => void;
  onBroadcastCharacterSync: (characterId: string) => void;
  onBroadcastCharacterPatch?: (
    patch: Omit<CharacterLivePatch, 'campaignId' | 'patchTimestamp'>
  ) => void;
  onBroadcastBatchCharacterPatch?: (
    patches: Array<Omit<CharacterLivePatch, 'campaignId' | 'patchTimestamp'>>
  ) => void;
  /** Sem lista: todos os jogadores. Com lista: só esses personagens rolam. */
  onRequestPlayersInitiative: (characterIds?: string[]) => void;
  onSharePostIt: (postIt: StickyPostIt, action: 'show' | 'hide') => void;
  onNotifyItemGiven: (targetCharacterId: string, item: RPGItem, attack?: PreparedAttack) => void;
  lastUpdatedCharSignal: { characterId: string; timestamp: number } | null;
  lastInitiativeSubmission: {
    characterId: string;
    characterName: string;
    initiative: number;
    timestamp: number;
  } | null;
  dismissedPostItSignal: { postItId: string; characterId: string; timestamp: number } | null;
  onSyncSecondMonitor: (
    director: MonitorDirectorState,
    combatState: { combatants: CombatantEntry[]; currentTurnIndex: number; roundNumber: number },
    merchants: CampaignMerchant[],
    postIts: StickyPostIt[]
  ) => void;
  onBroadcastSceneEnd?: () => void;
  /** Avisa a TV para limpar o que é só dela (rolagens, destaques, janelas abertas) */
  onResetSecondMonitor?: () => void;
}

function parseFormula(formula: string): { count: number; sides: number; modifier: number } {
  const clean = formula.toLowerCase().replace(/\s+/g, '');
  const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return { count: 1, sides: 6, modifier: 0 };
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

const ACTIVITY_CATEGORY_META: Record<
  SessionActivityCategory,
  { icon: string; label: string; badgeClass: string }
> = {
  ability: {
    icon: 'sparkles',
    label: 'Poder / Ritual',
    badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-700/60',
  },
  inventory: {
    icon: 'backpack',
    label: 'Equipamento',
    badgeClass: 'bg-blue-950/70 text-blue-300 border-blue-700/60',
  },
  consumable: {
    icon: 'flask',
    label: 'Consumível',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-700/60',
  },
  transfer: {
    icon: 'handshake',
    label: 'Troca / Entrega',
    badgeClass: 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60',
  },
  vital: {
    icon: 'heart',
    label: 'Vital',
    badgeClass: 'bg-red-950/70 text-red-300 border-red-700/60',
  },
  condition: {
    icon: 'sangue',
    label: 'Condição / Cena',
    badgeClass: 'bg-rose-950/70 text-rose-300 border-rose-700/60',
  },
  interlude: {
    icon: 'moon',
    label: 'Interlúdio',
    badgeClass: 'bg-indigo-950/70 text-indigo-300 border-indigo-700/60',
  },
  progression: {
    icon: 'trending',
    label: 'Evolução',
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60',
  },
  system: {
    icon: 'shield',
    label: 'Mesa',
    badgeClass: 'bg-zinc-900 text-zinc-300 border-zinc-700',
  },
};

const ACTIVITY_TONE_CLASSES: Record<NonNullable<SessionActivityLogEntry['tone']>, string> = {
  neutral: 'bg-zinc-950 border-zinc-800',
  info: 'bg-blue-950/20 border-blue-800/50',
  success: 'bg-emerald-950/20 border-emerald-800/50',
  warning: 'bg-amber-950/20 border-amber-800/50',
  danger: 'bg-red-950/25 border-red-800/60',
  purple: 'bg-purple-950/25 border-purple-800/60',
};

function mergeActivityLogs(
  primary: SessionActivityLogEntry[],
  secondary: SessionActivityLogEntry[]
): SessionActivityLogEntry[] {
  const byId = new Map<string, SessionActivityLogEntry>();
  for (const item of [...primary, ...secondary]) {
    if (item && item.id && !byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 250);
}

export function DMScreen({
  campaignId,
  rollHistory,
  liveActivityLog = [],
  onClearRolls,
  onClearActivityLog,
  onLogActivity,
  onInspectCharacter,
  onRollDice,
  onBroadcastPermissions,
  onBroadcastCharacterSync,
  onBroadcastCharacterPatch,
  onBroadcastBatchCharacterPatch,
  onRequestPlayersInitiative,
  onSharePostIt,
  onNotifyItemGiven,
  lastUpdatedCharSignal,
  lastInitiativeSubmission,
  dismissedPostItSignal,
  onSyncSecondMonitor,
  onBroadcastSceneEnd,
  onResetSecondMonitor,
}: DMScreenProps) {
  const { setActiveSystem } = useTheme();
  const [campaign, setCampaign] = useState<DMScreenCampaignData | null>(null);
  const [compendiumEntries, setCompendiumEntries] = useState<CompendiumEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Trava que impede sobrescrever o banco SQLite antes do carregamento inicial terminar
  const isHydratedRef = useRef(false);
  const latestCampaignRef = useRef<DMScreenCampaignData | null>(null);
  latestCampaignRef.current = campaign;
  const pendingCharVitalSaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlightCharVitalSavesRef = useRef<Record<string, number>>({});
  const charMutationVersionRef = useRef<Record<string, number>>({});
  const recentRemotePatchAtRef = useRef<Record<string, number>>({});
  const recentBatchPatchAtRef = useRef<number>(0);
  const reloadDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeDMTab, setActiveDMTab] = useState<'table' | 'bestiary' | 'loot' | 'notes' | 'monitor' | 'activity'>('table');
  const [sessionActivityLog, setSessionActivityLog] = useState<SessionActivityLogEntry[]>([]);
  const [rightPanelFeedTab, setRightPanelFeedTab] = useState<'activity' | 'rolls'>('activity');
  const [quickActivityFilter, setQuickActivityFilter] = useState<'all' | 'vital' | 'ability' | 'items'>('all');
  const [fullLogCategoryFilter, setFullLogCategoryFilter] = useState<'all' | SessionActivityCategory>('all');
  const [fullLogCharFilter, setFullLogCharFilter] = useState<string>('ALL');
  const [fullLogSearch, setFullLogSearch] = useState<string>('');
  const [initiativeDialog, setInitiativeDialog] = useState<'request' | 'manual' | null>(null);
  const [conditionPickerCharId, setConditionPickerCharId] = useState<string | null>(null);
  const [initFeedback, setInitFeedback] = useState('');
  const [sceneEndToast, setSceneEndToast] = useState('');
  const [isDMInterludeModalOpen, setIsDMInterludeModalOpen] = useState(false);
  const [dmInterludeMode, setDmInterludeMode] = useState<'all' | 'individual'>('all');
  const [dmInterludeGlobalComfort, setDmInterludeGlobalComfort] = useState<0.5 | 1 | 2 | 3>(1);
  const [dmInterludePerCharComfort, setDmInterludePerCharComfort] = useState<
    Record<string, 0 | 0.5 | 1 | 2 | 3>
  >({});

  // Estados sincronizados com o Banco de Dados SQLite (Etapa 4D)
  const [combatants, setCombatants] = useState<CombatantEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [threats, setThreats] = useState<CampaignThreat[]>([]);
  const [campaignItems, setCampaignItems] = useState<CampaignStoredItem[]>([]);
  const [merchants, setMerchants] = useState<CampaignMerchant[]>([]);
  const [dmNotes, setDmNotes] = useState<string>('');
  const [postIts, setPostIts] = useState<StickyPostIt[]>([]);
  const [monitorDirector, setMonitorDirector] = useState<MonitorDirectorState>({
    showCombatTracker: true,
    enemyHpVisibility: 'narrative',
    activeMerchantId: null,
    activeProjection: null,
    sceneTitle: '',
    sceneSubtitle: '',
    backgroundUrl: '',
    handoutTitle: '',
    handoutImageUrl: '',
    handoutText: '',
  });

  const [isSecretRoll, setIsSecretRoll] = useState(false);
  const [dmRollLabel, setDmRollLabel] = useState('Teste de Ameaça / NPC');
  const [dmDiceCount, setDmDiceCount] = useState(1);
  const [dmDiceSides, setDmDiceSides] = useState(20);
  const [dmDiceMod, setDmDiceMod] = useState(0);

  async function loadScreenData(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchDMScreenData(campaignId);
      setCampaign((prev) => {
        if (!silent || !prev) return data;
        const localById = new Map(prev.characters.map((c) => [c.id, c]));
        return {
          ...data,
          characters: data.characters.map((serverChar) => {
            const hasPendingLocal =
              Boolean(pendingCharVitalSaveTimersRef.current[serverChar.id]) ||
              (inFlightCharVitalSavesRef.current[serverChar.id] || 0) > 0;
            if (!hasPendingLocal) return serverChar;
            const localChar = localById.get(serverChar.id);
            if (!localChar) return serverChar;
            return {
              ...serverChar,
              vitals: localChar.vitals,
              sheetData: localChar.sheetData,
            };
          }),
        };
      });

      // Na primeira abertura da tela, hidrata os estados com os dados vindos do SQLite
      // (com fallback inteligente para migrar dados que estavam no localStorage anteriormente)
      if (!silent || !isHydratedRef.current) {
        const dbCombat =
          data.combatState && Array.isArray(data.combatState.combatants)
            ? data.combatState
            : JSON.parse(localStorage.getItem(`totalrpg_combat_${campaignId}`) || '{}');

        const dbThreats =
          Array.isArray(data.threats) && data.threats.length > 0
            ? data.threats
            : JSON.parse(localStorage.getItem(`totalrpg_threats_${campaignId}`) || '[]');

        const dbItems =
          Array.isArray(data.campaignItems) && data.campaignItems.length > 0
            ? data.campaignItems
            : JSON.parse(localStorage.getItem(`totalrpg_campitems_${campaignId}`) || '[]');

        const dbMerchants =
          Array.isArray(data.merchants) && data.merchants.length > 0
            ? data.merchants
            : JSON.parse(localStorage.getItem(`totalrpg_merchants_${campaignId}`) || '[]');

        const dbNotes =
          data.dmNotes || localStorage.getItem(`totalrpg_notes_${campaignId}`) || '';

        const dbPostIts =
          Array.isArray(data.postIts) && data.postIts.length > 0
            ? data.postIts
            : JSON.parse(localStorage.getItem(`totalrpg_postits_${campaignId}`) || '[]');

        setCombatants(dbCombat.combatants || []);
        setCurrentTurnIndex(dbCombat.currentTurnIndex || 0);
        setRoundNumber(dbCombat.roundNumber || 1);
        if (dbCombat.director) {
          setMonitorDirector((prev) => ({ ...prev, ...dbCombat.director }));
        }
        setThreats(dbThreats);
        setCampaignItems(dbItems);
        setMerchants(dbMerchants);
        setDmNotes(dbNotes);
        setPostIts(dbPostIts);

        const dbActivity: SessionActivityLogEntry[] = Array.isArray(dbCombat.activityLog)
          ? dbCombat.activityLog
          : JSON.parse(localStorage.getItem(`totalrpg_activity_${campaignId}`) || '[]');
        const campaignLive = liveActivityLog.filter((e) => e.campaignId === campaignId);
        const mergedActivity = mergeActivityLogs(campaignLive, dbActivity);
        setSessionActivityLog(mergedActivity);
        localStorage.setItem(`totalrpg_activity_${campaignId}`, JSON.stringify(mergedActivity));

        isHydratedRef.current = true;
      }

      const comp = await fetchCompendium(data.system);
      setCompendiumEntries(comp.entries);
    } catch (err: any) {
      alert(err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }

  useEffect(() => {
    if (campaign?.system) {
      setActiveSystem(campaign.system);
    }
  }, [campaign?.system, setActiveSystem]);

  useEffect(() => {
    isHydratedRef.current = false;
    loadScreenData();
  }, [campaignId]);

  useEffect(() => {
    return () => {
      Object.values(pendingCharVitalSaveTimersRef.current).forEach((t) => clearTimeout(t));
      pendingCharVitalSaveTimersRef.current = {};
      if (reloadDebounceTimerRef.current) {
        clearTimeout(reloadDebounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function applyLivePatch(patch: CharacterLivePatch) {
      if (!patch || patch.campaignId !== campaignId) return;
      recentRemotePatchAtRef.current[patch.characterId] = Date.now();
      setCampaign((prev) => {
        if (!prev) return prev;
        let matched = false;
        const nextChars = prev.characters.map((ch) => {
          if (ch.id !== patch.characterId) return ch;
          matched = true;
          const prevRaw = (ch.sheetData || {}) as Record<string, any>;
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
          return {
            ...ch,
            vitals: patch.vitals ?? ch.vitals,
            inventory: patch.inventory ?? ch.inventory,
            sheetData: nextRaw,
          };
        });
        if (!matched) return prev;
        const updated = { ...prev, characters: nextChars };
        latestCampaignRef.current = updated;
        return updated;
      });
    }

    function onSinglePatch(ev: Event) {
      const patch = (ev as CustomEvent<CharacterLivePatch>).detail;
      applyLivePatch(patch);
    }

    function onBatchPatch(ev: Event) {
      const payload = (
        ev as CustomEvent<{ campaignId: string; patches: CharacterLivePatch[] }>
      ).detail;
      if (!payload || payload.campaignId !== campaignId || !Array.isArray(payload.patches)) return;
      recentBatchPatchAtRef.current = Date.now();
      for (const p of payload.patches) {
        applyLivePatch(p);
      }
    }

    window.addEventListener('totalrpg:character-patched', onSinglePatch);
    window.addEventListener('totalrpg:characters-batch-patched', onBatchPatch);
    return () => {
      window.removeEventListener('totalrpg:character-patched', onSinglePatch);
      window.removeEventListener('totalrpg:characters-batch-patched', onBatchPatch);
    };
  }, [campaignId]);

  useEffect(() => {
    if (!lastUpdatedCharSignal) return;
    const now = Date.now();
    const sigCharId = lastUpdatedCharSignal.characterId;
    if (sigCharId === 'ALL' && now - recentBatchPatchAtRef.current < 2200) {
      return;
    }
    if (
      sigCharId &&
      sigCharId !== 'ALL' &&
      now - (recentRemotePatchAtRef.current[sigCharId] || 0) < 2200
    ) {
      return;
    }
    if (reloadDebounceTimerRef.current) {
      clearTimeout(reloadDebounceTimerRef.current);
    }
    reloadDebounceTimerRef.current = setTimeout(() => {
      reloadDebounceTimerRef.current = null;
      loadScreenData(true);
    }, 180);
  }, [lastUpdatedCharSignal]);

  useEffect(() => {
    if (!isHydratedRef.current || !liveActivityLog || liveActivityLog.length === 0) return;
    const campaignLive = liveActivityLog.filter((e) => e.campaignId === campaignId);
    if (campaignLive.length === 0) return;
    setSessionActivityLog((prev) => {
      const merged = mergeActivityLogs(campaignLive, prev);
      if (
        merged.length === prev.length &&
        merged.every((item, idx) => item.id === prev[idx]?.id)
      ) {
        return prev;
      }
      localStorage.setItem(`totalrpg_activity_${campaignId}`, JSON.stringify(merged));
      return merged;
    });
  }, [liveActivityLog, campaignId]);

  /**
   * Reinicia o 2º monitor: encerra o combate (turnos e ameaças), fecha loja e projeção,
   * tira os post-its da TV e volta à tela padrão. As ambientações salvas continuam guardadas.
   */
  function handleResetSecondMonitor() {
    setCombatants([]);
    setCurrentTurnIndex(0);
    setRoundNumber(1);
    setMonitorDirector((prev) => ({
      ...prev,
      activeMerchantId: null,
      activeProjection: null,
      activeSceneId: null,
      sceneTitle: '',
      sceneSubtitle: '',
      backgroundUrl: '',
      scenePalette: null,
    }));
    setPostIts((prev) =>
      prev.some((p) => p.sharedOnMonitor) ? prev.map((p) => ({ ...p, sharedOnMonitor: false })) : prev
    );
    onResetSecondMonitor?.();
  }

  useEffect(() => {
    if (!isHydratedRef.current) return;

    // Transmite tudo imediatamente para o 2º Monitor no 1º clique!
    onSyncSecondMonitor(
      monitorDirector,
      { combatants, currentTurnIndex, roundNumber },
      merchants,
      postIts
    );

    const timer = setTimeout(() => {
      updateCampaignDMData(campaignId, {
        dmNotes,
        combatState: {
          combatants,
          currentTurnIndex,
          roundNumber,
          director: monitorDirector,
          activityLog: sessionActivityLog.slice(0, 200),
        },
        threats,
        campaignItems,
        merchants,
        postIts,
      }).catch((err) => console.error('Erro no auto-save do Escudo:', err));
    }, 350);

    return () => clearTimeout(timer);
  }, [
    dmNotes,
    combatants,
    currentTurnIndex,
    roundNumber,
    monitorDirector,
    threats,
    campaignItems,
    merchants,
    postIts,
    sessionActivityLog,
    campaignId,
  ]);

  useEffect(() => {
    if (!dismissedPostItSignal) return;
    setPostIts((prev) =>
      prev.map((p) => {
        if (p.id !== dismissedPostItSignal.postItId) return p;
        const currentIds = Array.isArray(p.sharedWithCharacterIds)
          ? p.sharedWithCharacterIds
          : [];
        return {
          ...p,
          sharedWithCharacterIds: currentIds.filter(
            (id) => id !== dismissedPostItSignal.characterId
          ),
        };
      })
    );
  }, [dismissedPostItSignal]);

  // Recebe automaticamente a Iniciativa dos Jogadores ou das Ameaças
  useEffect(() => {
    if (!lastInitiativeSubmission) return;

    const matchedThreat = threats.find((t) => t.id === lastInitiativeSubmission.characterId);

    if (matchedThreat) {
      const primaryAtk = matchedThreat.attacks[0];
      const newThreatCombatant: CombatantEntry = {
        id: Math.random().toString(36).substring(2, 9),
        name: matchedThreat.name,
        imageUrl: matchedThreat.imageUrl,
        initiative: lastInitiativeSubmission.initiative,
        isNPC: true,
        hpCurrent: matchedThreat.hpMax,
        hpMax: matchedThreat.hpMax,
        vd: matchedThreat.vd,
        element: matchedThreat.element,
        defense: matchedThreat.defense,
        resistances: matchedThreat.resistances,
        vulnerabilities: matchedThreat.vulnerabilities,
        attacks: matchedThreat.attacks,
        attackName: primaryAtk?.name || 'Ataque',
        attackDice: primaryAtk?.diceCount ?? 1,
        attackBonus: primaryAtk?.attackBonus || 0,
        damageFormula: primaryAtk?.damageFormula || '1d6',
      };

      setCombatants((prev) =>
        [...prev, newThreatCombatant].sort((a, b) => b.initiative - a.initiative)
      );
      onLogActivity?.({
        characterName: matchedThreat.name,
        actorLabel: 'Mestre',
        category: 'system',
        summary: `Enviou ameaça ao combate: ${matchedThreat.name} (INI ${lastInitiativeSubmission.initiative})`,
        tone: 'warning',
      });
      setActiveDMTab('table');
      return;
    }

    setCombatants((prev) => {
      const exists = prev.some((c) => c.characterId === lastInitiativeSubmission.characterId);
      let updated: CombatantEntry[];

      if (exists) {
        updated = prev.map((c) =>
          c.characterId === lastInitiativeSubmission.characterId
            ? { ...c, initiative: lastInitiativeSubmission.initiative }
            : c
        );
      } else {
        updated = [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            characterId: lastInitiativeSubmission.characterId,
            name: lastInitiativeSubmission.characterName,
            initiative: lastInitiativeSubmission.initiative,
            isNPC: false,
          },
        ];
      }

      return [...updated].sort((a, b) => b.initiative - a.initiative);
    });
  }, [lastInitiativeSubmission]);

  if (isLoading || !campaign) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
        Abrindo Escudo do Mestre e sincronizando banco de dados da campanha...
      </div>
    );
  }

  const compendiumConditions = compendiumEntries.filter((e) => e.category === 'condition');
  const partyTotalNex = campaign.characters.reduce(
    (acc, ch) => acc + Number((ch.sheetData as any)?.nex ?? 0),
    0
  );

  function rollLocalInitiativeForThreat(threat: CampaignThreat): number {
    if (campaign?.system === 'ordem-paranormal') {
      const poolCount =
        threat.initiativeDice <= 0
          ? 2 + Math.abs(threat.initiativeDice)
          : threat.initiativeDice;
      const rolls = Array.from(
        { length: poolCount },
        () => Math.floor(Math.random() * 20) + 1
      );
      const chosen =
        threat.initiativeDice <= 0 ? Math.min(...rolls) : Math.max(...rolls);
      return chosen + (threat.initiativeBonus || 0);
    }
    return Math.floor(Math.random() * 20) + 1 + (threat.initiativeBonus || 0);
  }

  function handleToggleProjection(projection: MonitorDirectorState['activeProjection']) {
    if (!projection) return;
    setMonitorDirector((prev) => ({
      ...prev,
      activeProjection:
        prev.activeProjection?.id === projection.id ? null : projection,
    }));
  }

  function handleSendThreatToCombatManual(threat: CampaignThreat, manualInitiative: number) {
    const primaryAtk = threat.attacks[0];
    const newEntry: CombatantEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: threat.name,
      imageUrl: threat.imageUrl,
      initiative: Number(manualInitiative),
      isNPC: true,
      hpCurrent: threat.hpMax,
      hpMax: threat.hpMax,
      vd: threat.vd,
      element: threat.element,
      defense: threat.defense,
      resistances: threat.resistances,
      vulnerabilities: threat.vulnerabilities,
      attacks: threat.attacks,
      attackName: primaryAtk?.name || 'Ataque',
      attackDice: primaryAtk?.diceCount ?? 1,
      attackBonus: primaryAtk?.attackBonus || 0,
      damageFormula: primaryAtk?.damageFormula || '1d6',
    };

    setCombatants((prev) => [...prev, newEntry].sort((a, b) => b.initiative - a.initiative));
    onLogActivity?.({
      characterName: threat.name,
      actorLabel: 'Mestre',
      category: 'system',
      summary: `Adicionou ameaça ao combate: ${threat.name} (INI ${Number(manualInitiative)})`,
      tone: 'warning',
    });
    setActiveDMTab('table');
  }

  function handleSendThreatBatchToCombat(
    threat: CampaignThreat,
    count: number,
    mode: 'roll' | 'manual',
    manualInit?: number
  ) {
    const safeCount = Math.max(1, Math.min(10, count));
    const baseName = threat.name.replace(/\s*#\d+$/, '').trim();

    setCombatants((prev) => {
      const existingSameBase = prev.filter(
        (c) => c.isNPC && c.name.replace(/\s*#\d+$/, '').trim().toLowerCase() === baseName.toLowerCase()
      ).length;
      const shouldNumber = safeCount > 1 || existingSameBase > 0;
      const primaryAtk = threat.attacks[0];
      const added: CombatantEntry[] = [];

      for (let idx = 0; idx < safeCount; idx++) {
        const instanceLabel = shouldNumber
          ? `${baseName} #${existingSameBase + idx + 1}`
          : baseName;
        const initVal =
          mode === 'manual' && manualInit !== undefined
            ? Number(manualInit)
            : rollLocalInitiativeForThreat(threat);

        added.push({
          id: Math.random().toString(36).substring(2, 9),
          name: instanceLabel,
          imageUrl: threat.imageUrl,
          initiative: initVal,
          isNPC: true,
          hpCurrent: threat.hpMax,
          hpMax: threat.hpMax,
          vd: threat.vd,
          element: threat.element,
          defense: threat.defense,
          resistances: threat.resistances,
          vulnerabilities: threat.vulnerabilities,
          attacks: threat.attacks,
          attackName: primaryAtk?.name || 'Ataque',
          attackDice: primaryAtk?.diceCount ?? 1,
          attackBonus: primaryAtk?.attackBonus || 0,
          damageFormula: primaryAtk?.damageFormula || '1d6',
        });
      }

      return [...prev, ...added].sort((a, b) => b.initiative - a.initiative);
    });

    onLogActivity?.({
      characterName: baseName,
      actorLabel: 'Mestre',
      category: 'system',
      summary: `Enviou ${safeCount}x ${baseName} ao combate${
        threat.vd !== undefined ? ` (VD ${threat.vd})` : ''
      }`,
      tone: 'warning',
    });
    setInitFeedback(
      `${safeCount}x ${baseName} adicionado${safeCount > 1 ? 's' : ''} à ordem de iniciativa!`
    );
    setTimeout(() => setInitFeedback(''), 3500);
    setActiveDMTab('table');
  }

  // Entrega um item ao jogador no SQLite, sincroniza a ficha e dispara o Modal de Recompensa na tela dele!
async function handleDeliverItemToCharacter(
    targetChar: DMScreenCharacter,
    item: RPGItem,
    attack?: PreparedAttack,
    fromMerchant?: boolean
  ) {
    const currentInv = targetChar.inventory || [];
    const existingItemIndex = currentInv.findIndex(
      (i) => i.name.toLowerCase().trim() === item.name.toLowerCase().trim() && i.slots === item.slots
    );

    let nextInventory: RPGItem[];
    if (existingItemIndex >= 0) {
      // Se o jogador já possui este item na mochila, soma a quantidade na mesma pilha!
      nextInventory = currentInv.map((i, idx) =>
        idx === existingItemIndex ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) } : i
      );
    } else {
      nextInventory = [...currentInv, item];
    }

    // Evita duplicar o botão de ataque se o jogador já tinha essa mesma arma
    const currentAttacks = targetChar.attacks || [];
    const alreadyHasAttack =
      attack &&
      currentAttacks.some((a) => a.name.toLowerCase().trim() === attack.name.toLowerCase().trim());

    const nextAttacks =
      attack && !alreadyHasAttack ? [...currentAttacks, attack] : currentAttacks;

    onBroadcastCharacterPatch?.({
      characterId: targetChar.id,
      inventory: nextInventory,
    });
    await updateCharacter(targetChar.id, {
      inventory: nextInventory,
      attacks: nextAttacks,
    });
    onBroadcastCharacterSync(targetChar.id);

    // Só abre o Modal de Loot na tela do jogador se for recompensa direta (não comprada em Mercador)
    if (!fromMerchant) {
      onNotifyItemGiven(targetChar.id, item, attack);
    }
    onLogActivity?.({
      characterId: targetChar.id,
      characterName: targetChar.name,
      actorLabel: fromMerchant ? 'Mercador' : 'Mestre',
      category: 'transfer',
      summary: `${fromMerchant ? 'Adquiriu no Mercador' : 'Recebeu do Mestre'}: ${
        item.quantity || 1
      }x ${item.name}`,
      costText: `+${item.quantity || 1}x`,
      tone: 'success',
    });
    loadScreenData(true);
  }

  function handleRequestInitiative(characterIds: string[]) {
    const all = campaign ? characterIds.length >= campaign.characters.length : true;
    onRequestPlayersInitiative(all ? undefined : characterIds);
    setInitiativeDialog(null);
    setInitFeedback(
      all
        ? 'Pedido de iniciativa enviado para todos os jogadores.'
        : `Pedido de iniciativa enviado para ${characterIds.length} jogador${characterIds.length === 1 ? '' : 'es'}.`
    );
    setTimeout(() => setInitFeedback(''), 4000);
  }

  /** Coloca jogadores em combate com a iniciativa digitada pelo mestre (ou altera a de quem já está). */
  function handleManualPlayersInitiative(entries: Array<{ characterId: string; initiative: number }>) {
    if (!campaign || entries.length === 0) return;
    setCombatants((prev) => {
      let next = [...prev];
      for (const entry of entries) {
        const char = campaign.characters.find((c) => c.id === entry.characterId);
        if (!char) continue;
        if (next.some((c) => !c.isNPC && c.characterId === entry.characterId)) {
          next = next.map((c) =>
            !c.isNPC && c.characterId === entry.characterId ? { ...c, initiative: entry.initiative } : c
          );
        } else {
          next.push({
            id: Math.random().toString(36).substring(2, 9),
            characterId: char.id,
            name: char.name,
            initiative: entry.initiative,
            isNPC: false,
          });
        }
      }
      return next.sort((a, b) => b.initiative - a.initiative);
    });
    for (const entry of entries) {
      const char = campaign.characters.find((c) => c.id === entry.characterId);
      if (!char) continue;
      onLogActivity?.({
        characterId: char.id,
        characterName: char.name,
        actorLabel: 'Mestre',
        category: 'system',
        summary: `Entrou em combate com iniciativa manual (INI ${entry.initiative})`,
        tone: 'info',
      });
    }
    setInitiativeDialog(null);
    setInitFeedback(
      `${entries.length} jogador${entries.length === 1 ? '' : 'es'} em combate com iniciativa manual.`
    );
    setTimeout(() => setInitFeedback(''), 4000);
  }

  function handleManualInitiativeChange(id: string, newInit: number) {
    setCombatants((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, initiative: newInit } : c));
      return [...updated].sort((a, b) => b.initiative - a.initiative);
    });
  }

  /**
   * Morrendo (Ordem, p. 311): altera contador/morte/condições de um personagem,
   * mostra na hora (escudo, ficha, TV) e salva.
   */
  async function updateDyingState(
    charId: string,
    next: {
      dyingTurns?: number;
      deathAt?: number | null;
      conditions?: ActiveCondition[];
      vitals?: VitalBar[];
    }
  ) {
    const current = latestCampaignRef.current?.characters.find((c) => c.id === charId);
    if (!current) return;
    const raw = (current.sheetData || {}) as Record<string, any>;
    const nextSheetData: Record<string, any> = { ...raw };
    if (next.dyingTurns !== undefined) nextSheetData.dyingTurns = next.dyingTurns;
    if (next.deathAt !== undefined) nextSheetData.deathAt = next.deathAt;
    if (next.conditions !== undefined) nextSheetData.conditions = next.conditions;

    const prevCampaign = latestCampaignRef.current;
    if (prevCampaign) {
      const nextCampaign: DMScreenCampaignData = {
        ...prevCampaign,
        characters: prevCampaign.characters.map((c) =>
          c.id === charId
            ? {
                ...c,
                ...(next.vitals ? { vitals: next.vitals } : {}),
                sheetData: nextSheetData as any,
              }
            : c
        ),
      };
      latestCampaignRef.current = nextCampaign;
      setCampaign(nextCampaign);
    }
    onBroadcastCharacterPatch?.({
      characterId: charId,
      ...(next.dyingTurns !== undefined ? { dyingTurns: next.dyingTurns } : {}),
      ...(next.deathAt !== undefined ? { deathAt: next.deathAt } : {}),
      ...(next.conditions !== undefined ? { conditions: next.conditions } : {}),
      ...(next.vitals ? { vitals: next.vitals } : {}),
    });
    try {
      await updateCharacter(charId, {
        ...(next.vitals ? { vitals: next.vitals } : {}),
        sheetData: nextSheetData as any,
      });
      onBroadcastCharacterSync(charId);
    } catch (err: any) {
      alert(err.message);
    }
  }

  /** Um personagem começou o turno: se está morrendo, preenche mais uma marca (na 3ª, morre). */
  function registerTurnStart(combatant: CombatantEntry | undefined) {
    if (!combatant || combatant.isNPC || !combatant.characterId) return;
    const char = latestCampaignRef.current?.characters.find((c) => c.id === combatant.characterId);
    if (!char || char.system !== 'ordem-paranormal') return;
    const raw = (char.sheetData || {}) as Record<string, any>;
    if (!hasDyingCondition(raw.conditions) || deathAtOf(raw)) return;
    const turnsToDie = getDyingTurnsToDie(raw.abilities);
    const turns = Math.min(turnsToDie, dyingTurnsOf(raw) + 1);
    const dies = turns >= turnsToDie;
    const isConsciousApego =
      hasApegoAngustiado(raw.abilities) &&
      !(Array.isArray(raw.conditions) && raw.conditions.some(isUnconsciousCondition));
    const nextVitals = isConsciousApego
      ? char.vitals.map((v) =>
          v.id === 'san' ? { ...v, current: Math.max(0, v.current - 2) } : v
        )
      : undefined;

    updateDyingState(char.id, {
      dyingTurns: turns,
      ...(dies ? { deathAt: Date.now() } : {}),
      ...(nextVitals ? { vitals: nextVitals } : {}),
    });
    onLogActivity?.({
      characterId: char.id,
      characterName: char.name,
      actorLabel: 'Mestre',
      category: 'condition',
      summary: dies
        ? `Morreu: iniciou o terceiro turno morrendo nesta cena${
            isConsciousApego ? ' (-2 SAN por Apego Angustiado)' : ''
          }`
        : `Iniciou o turno morrendo (${turns} de ${turnsToDie})${
            isConsciousApego ? ' • Apego Angustiado (-2 SAN)' : ''
          }`,
      costText: isConsciousApego ? '-2 SAN' : undefined,
      tone: 'danger',
    });
  }

  /** Mestre estabiliza (Medicina DT 20 ou efeito): retira morrendo. O contador da cena fica. */
  function handleStabilizeCharacter(char: DMScreenCharacter) {
    const raw = (char.sheetData || {}) as Record<string, any>;
    const conds: ActiveCondition[] = Array.isArray(raw.conditions) ? raw.conditions : [];
    updateDyingState(char.id, { conditions: conds.filter((c) => !isDyingCondition(c)) });
    onLogActivity?.({
      characterId: char.id,
      characterName: char.name,
      actorLabel: 'Mestre',
      category: 'condition',
      summary: 'Foi estabilizado (deixou de estar morrendo)',
      tone: 'success',
    });
  }

  /** Desfaz uma morte marcada por engano: volta para 2 de 3 e continua morrendo. */
  function handleUndoDeath(char: DMScreenCharacter) {
    updateDyingState(char.id, {
      deathAt: null,
      dyingTurns: getDyingTurnsToDie((char.sheetData as any)?.abilities) - 1,
    });
    onLogActivity?.({
      characterId: char.id,
      characterName: char.name,
      actorLabel: 'Mestre',
      category: 'condition',
      summary: 'Morte desfeita pelo mestre',
      tone: 'warning',
    });
  }

  function handleNextTurn() {
    if (combatants.length === 0) return;
    const nextIndex = currentTurnIndex + 1 >= combatants.length ? 0 : currentTurnIndex + 1;
    if (nextIndex === 0) {
      setCurrentTurnIndex(0);
      setRoundNumber((r) => r + 1);
    } else {
      setCurrentTurnIndex(nextIndex);
    }
    registerTurnStart(combatants[nextIndex]);
  }

  function handlePrevTurn() {
    if (combatants.length === 0) return;
    if (currentTurnIndex - 1 < 0) {
      setCurrentTurnIndex(Math.max(0, combatants.length - 1));
      setRoundNumber((r) => Math.max(1, r - 1));
    } else {
      setCurrentTurnIndex((i) => i - 1);
    }
  }

  function handleUpdateNPCHp(id: string, delta: number) {
    setCombatants((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.hpCurrent === undefined || c.hpMax === undefined) return c;
        return {
          ...c,
          hpCurrent: Math.max(0, Math.min(c.hpMax, c.hpCurrent + delta)),
        };
      })
    );
  }

  async function handleTogglePermission(key: keyof SheetPermissions) {
    if (!campaign) return;
    const newValue = !campaign[key];

    const updatedPermissions: SheetPermissions = {
      lockAllSheets: campaign.lockAllSheets,
      allowEditVitals: campaign.allowEditVitals,
      allowEditInventory: campaign.allowEditInventory,
      allowEditAbilities: campaign.allowEditAbilities,
      allowEditAttributes: campaign.allowEditAttributes,
      allowTrade: campaign.allowTrade,
      [key]: newValue,
    };

    setCampaign({ ...campaign, ...updatedPermissions });

    try {
      await updateCampaignPermissions(campaign.id, { [key]: newValue });
      onBroadcastPermissions(updatedPermissions);
    } catch (err: any) {
      alert(err.message);
      loadScreenData(true);
    }
  }

  function handleQuickVitalChange(char: DMScreenCharacter, barId: string, delta: number) {
    const activeCampaign = latestCampaignRef.current;
    const targetChar =
      activeCampaign?.characters.find((c) => c.id === char.id) || char;
    const rawSheet = (targetChar.sheetData || {}) as Record<string, any>;
    const abilities: CharacterAbility[] = Array.isArray(rawSheet.abilities) ? rawSheet.abilities : [];
    const conditions: ActiveCondition[] = Array.isArray(rawSheet.conditions) ? rawSheet.conditions : [];
    const sceneEffects = Array.isArray(rawSheet.sceneEffects) ? rawSheet.sceneEffects : [];
    const levelOrNex =
      targetChar.system === 'ordem-paranormal' ? Number(rawSheet.nex ?? 5) : Number(rawSheet.level ?? 1);

    const bonuses = calculateActiveBonuses(
      targetChar.system,
      levelOrNex,
      abilities,
      targetChar.inventory || [],
      conditions,
      sceneEffects
    );

    const prevTempHp = Number(rawSheet.tempHp || 0);
    const prevTempPe = Number(rawSheet.tempPe || 0);
    let effectiveDelta = delta;
    let nextTempHp = prevTempHp;
    let nextTempPe = prevTempPe;
    let tempHpChanged = false;
    let tempPeChanged = false;

    if (barId === 'pv' && delta < 0 && nextTempHp > 0) {
      const damage = Math.abs(delta);
      const absorbed = Math.min(nextTempHp, damage);
      nextTempHp -= absorbed;
      effectiveDelta = -(damage - absorbed);
      tempHpChanged = true;
    }

    if (barId === 'pe' && delta < 0 && nextTempPe > 0) {
      const spent = Math.abs(delta);
      const absorbed = Math.min(nextTempPe, spent);
      nextTempPe -= absorbed;
      effectiveDelta = -(spent - absorbed);
      tempPeChanged = true;
    }

    const nextTempHpMax = resolveTempVitalMax(prevTempHp, rawSheet.tempHpMax, nextTempHp);
    const nextTempPeMax = resolveTempVitalMax(prevTempPe, rawSheet.tempPeMax, nextTempPe);

    const updatedVitals = targetChar.vitals.map((bar) => {
      if (bar.id !== barId) return bar;
      const effectiveMax = Math.max(1, bar.max + (bonuses.vitalMax[bar.id] || 0));
      const nextCurrent = Math.max(0, Math.min(effectiveMax, bar.current + effectiveDelta));
      return { ...bar, current: nextCurrent };
    });

    const baseSheetData =
      tempHpChanged || tempPeChanged
        ? {
            ...rawSheet,
            tempHp: nextTempHp,
            tempHpMax: nextTempHpMax,
            tempPe: nextTempPe,
            tempPeMax: nextTempPeMax,
          }
        : rawSheet;

    // Regra dos 0 PV (Ordem, p. 311): caiu a 0 → morrendo + inconsciente; curou → sai inconsciente.
    const skipUnconscious = hasApegoAngustiado(abilities);
    const zeroHp = applyZeroHpRule(
      targetChar.system,
      currentPvOf(targetChar.vitals),
      currentPvOf(updatedVitals),
      conditions,
      { skipUnconscious }
    );
    const nextSheetData =
      zeroHp.transition && zeroHp.conditions !== conditions
        ? { ...baseSheetData, conditions: zeroHp.conditions }
        : baseSheetData;
    if (zeroHp.transition === 'fell') {
      onLogActivity?.({
        characterId: targetChar.id,
        characterName: targetChar.name,
        actorLabel: 'Mestre',
        category: 'condition',
        summary: skipUnconscious
          ? 'Caiu a 0 PV: ficou morrendo (Apego Angustiado — permanece consciente)'
          : 'Caiu a 0 PV: ficou morrendo e inconsciente',
        tone: 'danger',
      });
    }

    if (activeCampaign) {
      const nextCampaign: DMScreenCampaignData = {
        ...activeCampaign,
        characters: activeCampaign.characters.map((c) =>
          c.id === targetChar.id
            ? { ...c, vitals: updatedVitals, sheetData: nextSheetData }
            : c
        ),
      };
      latestCampaignRef.current = nextCampaign;
      setCampaign(nextCampaign);
    }

    // Dispara imediatamente em tempo real (<5ms) para o 2º Monitor e para a Ficha do Jogador!
    onBroadcastCharacterPatch?.({
      characterId: targetChar.id,
      vitals: updatedVitals,
      tempHp: nextTempHp,
      tempHpMax: nextTempHpMax,
      tempPe: nextTempPe,
      tempPeMax: nextTempPeMax,
      ...(nextSheetData !== baseSheetData ? { conditions: zeroHp.conditions } : {}),
    });

    const nextVer = (charMutationVersionRef.current[targetChar.id] || 0) + 1;
    charMutationVersionRef.current[targetChar.id] = nextVer;

    if (pendingCharVitalSaveTimersRef.current[targetChar.id]) {
      clearTimeout(pendingCharVitalSaveTimersRef.current[targetChar.id]);
    }

    pendingCharVitalSaveTimersRef.current[targetChar.id] = setTimeout(async () => {
      delete pendingCharVitalSaveTimersRef.current[targetChar.id];
      const latestChar =
        latestCampaignRef.current?.characters.find((c) => c.id === targetChar.id);
      if (!latestChar) return;
      const saveVer = charMutationVersionRef.current[targetChar.id] || 0;
      inFlightCharVitalSavesRef.current[targetChar.id] =
        (inFlightCharVitalSavesRef.current[targetChar.id] || 0) + 1;
      try {
        await updateCharacter(latestChar.id, {
          vitals: latestChar.vitals,
          sheetData: latestChar.sheetData,
        });
        if ((charMutationVersionRef.current[targetChar.id] || 0) === saveVer) {
          onBroadcastCharacterSync(latestChar.id);
        }
      } catch (err: any) {
        alert(err.message);
      } finally {
        inFlightCharVitalSavesRef.current[targetChar.id] = Math.max(
          0,
          (inFlightCharVitalSavesRef.current[targetChar.id] || 1) - 1
        );
      }
    }, 200);
  }

  async function handleEndSceneForAll() {
    if (!campaign) return;
    const updatedChars = campaign.characters.map((char) => {
      const rawSheet = (char.sheetData || {}) as Record<string, any>;
      return {
        ...char,
        sheetData: {
          ...rawSheet,
          tempHp: 0,
          tempHpMax: 0,
          tempPe: 0,
          tempPeMax: 0,
          sceneEffects: [],
          // Morrendo conta turnos "na mesma cena": cena nova, contador zerado.
          dyingTurns: 0,
        },
      };
    });

    setCampaign({ ...campaign, characters: updatedChars });
    onBroadcastBatchCharacterPatch?.(
      updatedChars.map((c) => ({
        characterId: c.id,
        tempHp: 0,
        tempHpMax: 0,
        tempPe: 0,
        tempPeMax: 0,
        sceneEffects: [],
        dyingTurns: 0,
      }))
    );
    setSceneEndToast('Cena encerrada! Efeitos de cena e quantias temporárias foram encerrados.');
    setTimeout(() => setSceneEndToast(''), 3500);

    try {
      await Promise.all(
        updatedChars.map((c) => updateCharacter(c.id, { sheetData: c.sheetData }))
      );
      onBroadcastCharacterSync('ALL');
      onBroadcastSceneEnd?.();
      onLogActivity?.({
        characterName: 'Mestre',
        category: 'condition',
        summary:
          'Encerrou a cena atual para todos os personagens (efeitos de cena e PV/PE temporários limpos)',
        tone: 'purple',
      });
    } catch (err: any) {
      alert(err.message);
    }
  }

  function handleOpenDMInterludeModal() {
    if (!campaign) return;
    const perCharMap: Record<string, 0 | 0.5 | 1 | 2 | 3> = {};
    for (const c of campaign.characters) {
      const existingComfort = (c.sheetData as any)?.pendingInterlude?.comfort;
      perCharMap[c.id] =
        existingComfort === 0.5 ||
        existingComfort === 1 ||
        existingComfort === 2 ||
        existingComfort === 3
          ? existingComfort
          : 1;
    }
    setDmInterludePerCharComfort(perCharMap);
    setIsDMInterludeModalOpen(true);
  }

  async function handleReleaseInterludeForPlayers() {
    if (!campaign) return;
    const interludeId = `interlude-${Date.now()}`;
    const grantedAt = Date.now();
    const updatedChars = campaign.characters.map((char) => {
      const rawSheet = (char.sheetData || {}) as Record<string, any>;
      const targetComfort =
        dmInterludeMode === 'all'
          ? dmInterludeGlobalComfort
          : (dmInterludePerCharComfort[char.id] ?? 1);
      return {
        ...char,
        sheetData: {
          ...rawSheet,
          pendingInterlude:
            targetComfort === 0
              ? null
              : { id: interludeId, comfort: targetComfort, grantedAt },
        },
      };
    });

    setCampaign({ ...campaign, characters: updatedChars });
    onBroadcastBatchCharacterPatch?.(
      updatedChars.map((c) => ({
        characterId: c.id,
        pendingInterlude: (c.sheetData as any)?.pendingInterlude ?? null,
      }))
    );
    setIsDMInterludeModalOpen(false);
    setSceneEndToast('Cena de Interlúdio liberada para os jogadores!');
    setTimeout(() => setSceneEndToast(''), 3500);

    try {
      await Promise.all(
        updatedChars.map((c) => updateCharacter(c.id, { sheetData: c.sheetData }))
      );
      onBroadcastCharacterSync('ALL');
      onLogActivity?.({
        characterName: 'Mestre',
        category: 'interlude',
        summary:
          dmInterludeMode === 'all'
            ? `Liberou Cena de Interlúdio para todos (Descanso ${dmInterludeGlobalComfort}x)`
            : 'Liberou Cena de Interlúdio individual por personagem',
        tone: 'info',
      });
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCancelAllPendingInterludes() {
    if (!campaign) return;
    const updatedChars = campaign.characters.map((char) => {
      const rawSheet = (char.sheetData || {}) as Record<string, any>;
      return {
        ...char,
        sheetData: {
          ...rawSheet,
          pendingInterlude: null,
        },
      };
    });

    setCampaign({ ...campaign, characters: updatedChars });
    onBroadcastBatchCharacterPatch?.(
      updatedChars.map((c) => ({
        characterId: c.id,
        pendingInterlude: null,
      }))
    );
    setIsDMInterludeModalOpen(false);
    setSceneEndToast('Interlúdios pendentes recolhidos para todos os personagens.');
    setTimeout(() => setSceneEndToast(''), 3500);

    try {
      await Promise.all(
        updatedChars.map((c) => updateCharacter(c.id, { sheetData: c.sheetData }))
      );
      onBroadcastCharacterSync('ALL');
      onLogActivity?.({
        characterName: 'Mestre',
        category: 'interlude',
        summary: 'Recolheu Interlúdios pendentes para todos os personagens',
        tone: 'warning',
      });
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleApplyConditionToChar(char: DMScreenCharacter, condEntry: CompendiumEntryData) {
    const rawSheet = (char.sheetData || {}) as Record<string, any>;
    const currentConditions: ActiveCondition[] = Array.isArray(rawSheet.conditions)
      ? rawSheet.conditions
      : [];

    const newCond: ActiveCondition = {
      id: Math.random().toString(36).substring(2, 9),
      name: condEntry.name,
      description: condEntry.description,
      modifiers: condEntry.modifiers || [],
    };

    const nextSheetData = {
      ...rawSheet,
      conditions: [...currentConditions, newCond],
    };

    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            characters: prev.characters.map((c) =>
              c.id === char.id ? { ...c, sheetData: nextSheetData } : c
            ),
          }
        : null
    );
    setConditionPickerCharId(null);
    onBroadcastCharacterPatch?.({
      characterId: char.id,
      conditions: nextSheetData.conditions,
    });

    try {
      await updateCharacter(char.id, { sheetData: nextSheetData });
      onBroadcastCharacterSync(char.id);
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleRemoveConditionFromChar(char: DMScreenCharacter, condId: string) {
    const rawSheet = (char.sheetData || {}) as Record<string, any>;
    const currentConditions: ActiveCondition[] = Array.isArray(rawSheet.conditions)
      ? rawSheet.conditions
      : [];

    const nextSheetData = {
      ...rawSheet,
      conditions: currentConditions.filter((c) => c.id !== condId),
    };

    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            characters: prev.characters.map((c) =>
              c.id === char.id ? { ...c, sheetData: nextSheetData } : c
            ),
          }
        : null
    );

    onBroadcastCharacterPatch?.({
      characterId: char.id,
      conditions: nextSheetData.conditions,
    });

    try {
      await updateCharacter(char.id, { sheetData: nextSheetData });
      onBroadcastCharacterSync(char.id);
    } catch (err: any) {
      alert(err.message);
    }
  }

  function handleCustomDMRoll(e: React.FormEvent) {
    e.preventDefault();
    if (!campaign) return;
    onRollDice(
      'Mestre',
      campaign.system,
      dmRollLabel.trim() || 'Rolagem do Mestre',
      dmDiceCount,
      dmDiceSides,
      dmDiceMod,
      isSecretRoll
    );
  }

  function handleClearAllActivityLog() {
    setSessionActivityLog([]);
    localStorage.removeItem(`totalrpg_activity_${campaignId}`);
    onClearActivityLog?.();
  }

  function renderActivityCard(entry: SessionActivityLogEntry, compact = false) {
    const meta = ACTIVITY_CATEGORY_META[entry.category] || ACTIVITY_CATEGORY_META.system;
    const toneClass = ACTIVITY_TONE_CLASSES[entry.tone || 'neutral'];
    return (
      <div
        key={entry.id}
        className={`p-3 rounded-xl border flex flex-col gap-1 transition ${toneClass}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}
            >
              <Icon name={meta.icon} size={14} /> {compact ? '' : meta.label}
            </span>
            <span className="font-bold text-amber-400 text-xs truncate">
              {entry.characterName}
            </span>
            {entry.actorLabel && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                {entry.actorLabel}
              </span>
            )}
            <span className="text-[10px] text-zinc-500 font-mono">{entry.timestamp}</span>
          </div>

          {entry.costText && (
            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white shrink-0">
              {entry.costText}
            </span>
          )}
        </div>

        <p className="text-xs font-semibold text-zinc-100 leading-snug">{entry.summary}</p>

        {entry.details && (
          <p className="text-[11px] text-zinc-400 leading-snug">{entry.details}</p>
        )}
      </div>
    );
  }

  const quickFilteredActivityLog = sessionActivityLog.filter((e) => {
    if (quickActivityFilter === 'all') return true;
    if (quickActivityFilter === 'vital') return e.category === 'vital' || e.category === 'condition';
    if (quickActivityFilter === 'ability') return e.category === 'ability' || e.category === 'interlude';
    return (
      e.category === 'inventory' || e.category === 'consumable' || e.category === 'transfer'
    );
  });

  const fullFilteredActivityLog = sessionActivityLog.filter((e) => {
    if (fullLogCategoryFilter !== 'all' && e.category !== fullLogCategoryFilter) return false;
    if (fullLogCharFilter !== 'ALL' && e.characterId !== fullLogCharFilter && e.characterName !== fullLogCharFilter) {
      return false;
    }
    if (fullLogSearch.trim()) {
      const q = fullLogSearch.toLowerCase();
      const hay = `${e.characterName} ${e.summary} ${e.details || ''} ${e.costText || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {sceneEndToast && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-purple-700 text-purple-100 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2">
          <span>{sceneEndToast}</span>
        </div>
      )}

      {/* CAMADA DE POST-ITS FLUTUANTES (Sem re-disparar quando o Mestre fecha ou arrasta o seu!) */}
      <FloatingPostItsLayer
        postIts={postIts}
        characters={campaign.characters}
        isDMView={true}
        onUpdatePostIt={(updated) => {
          const previous = postIts.find((p) => p.id === updated.id);
          setPostIts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

          const sharedIds = Array.isArray(updated.sharedWithCharacterIds)
            ? updated.sharedWithCharacterIds
            : [];
          const textChanged = previous && previous.textContent !== updated.textContent;
          if (updated.isPinned && sharedIds.length > 0 && textChanged) {
            onSharePostIt(updated, 'show');
          }
        }}
        onUpdatePostItSharing={(post, nextCharacterIds) => {
          const updated: StickyPostIt = {
            ...post,
            sharedWithCharacterIds: nextCharacterIds,
          };
          setPostIts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
          onSharePostIt(updated, nextCharacterIds.length > 0 ? 'show' : 'hide');
        }}
      />

      {/* 1. CABEÇALHO DO ESCUDO: campanha, ações de cena, permissões e blocos */}
      <section className="trpg-card trpg-card-signature p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-zinc-400">Escudo do mestre</p>
            <h1 className="text-3xl sm:text-4xl leading-tight">{campaign.name}</h1>
            <p className="mt-1.5 text-sm text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Código <span className="trpg-code text-zinc-100">{campaign.inviteCode}</span>
              </span>
              <span>
                <span className="trpg-num text-zinc-100 font-semibold">{campaign.characters.length}</span>{' '}
                {campaign.characters.length === 1 ? 'jogador' : 'jogadores'}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {campaign.system === 'ordem-paranormal' && (
              <button
                type="button"
                onClick={handleOpenDMInterludeModal}
                title="Libera a cena de interlúdio para os jogadores, para todos ou um por um"
                className="trpg-btn-secondary trpg-btn-sm"
              >
                <Icon name="moon" size={15} /> Interlúdio
              </button>
            )}
            <button
              type="button"
              onClick={handleEndSceneForAll}
              title="Encerra a cena para todos: limpa PV temporários e efeitos que duram uma cena"
              className="trpg-btn-secondary trpg-btn-sm"
            >
              <Icon name="clapperboard" size={15} /> Encerrar cena
            </button>
          </div>
        </div>

        {/* Permissões dos jogadores */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-2 flex flex-col xl:flex-row gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={campaign.lockAllSheets}
            onClick={() => handleTogglePermission('lockAllSheets')}
            className={`shrink-0 rounded-md px-3 py-2 text-left flex items-center gap-3 border transition-colors ${
              campaign.lockAllSheets
                ? 'border-red-700 bg-red-950/60 text-red-100'
                : 'border-transparent text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Icon name={campaign.lockAllSheets ? 'lock' : 'lock-open'} size={18} />
            <span className="leading-tight">
              <span className="block text-sm font-semibold">{campaign.lockAllSheets ? 'Fichas travadas' : 'Travar todas as fichas'}</span>
              <span className="block text-xs opacity-75">
                {campaign.lockAllSheets ? 'Ninguém edita nada' : 'Valem as permissões ao lado'}
              </span>
            </span>
          </button>
          <div className="hidden xl:block w-px bg-zinc-800" aria-hidden="true" />
          <div className="flex-1 grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-1">
            {(
              [
                { key: 'allowEditVitals', label: 'Vida e recursos', hint: 'Dano, cura e gasto' },
                { key: 'allowEditInventory', label: 'Inventário', hint: 'Pegar e equipar' },
                { key: 'allowEditAbilities', label: 'Habilidades', hint: 'Treino, poderes, rituais' },
                { key: 'allowEditAttributes', label: 'Atributos e nível', hint: 'Libere ao subir de NEX' },
                { key: 'allowTrade', label: 'Comércio', hint: 'Trocas e lojas' },
              ] as const
            ).map((perm) => {
              const on = !campaign.lockAllSheets && Boolean(campaign[perm.key]);
              return (
                <button
                  key={perm.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={campaign.lockAllSheets}
                  onClick={() => handleTogglePermission(perm.key)}
                  title={perm.hint}
                  className={`rounded-md px-3 py-2 text-left flex items-center gap-2.5 transition-colors disabled:opacity-45 ${
                    on ? 'text-zinc-100 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`relative w-8 h-[18px] shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-zinc-100 transition-transform ${
                        on ? 'translate-x-3.5' : ''
                      }`}
                    />
                  </span>
                  <span className="leading-tight min-w-0">
                    <span className="block text-sm font-medium truncate">{perm.label}</span>
                    <span className="block text-xs text-zinc-500 truncate">{perm.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Blocos do mestre */}
        <div role="tablist" aria-label="Blocos do escudo" className="trpg-tabs -mx-1 -mb-1">
          {(
            [
              { id: 'table', icon: 'swords', label: 'Mesa', count: undefined },
              { id: 'bestiary', icon: 'ghost', label: 'Ameaças', count: threats.length },
              { id: 'loot', icon: 'backpack', label: 'Itens e lojas', count: campaignItems.length + merchants.length },
              { id: 'notes', icon: 'note', label: 'Anotações', count: postIts.length },
              { id: 'monitor', icon: 'tv', label: 'Tela da TV', count: undefined },
              { id: 'activity', icon: 'activity', label: 'Registro', count: sessionActivityLog.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeDMTab === tab.id}
              onClick={() => setActiveDMTab(tab.id)}
              className="trpg-tab"
            >
              <Icon name={tab.icon} size={16} className={activeDMTab === tab.id ? 'text-amber-500' : ''} />
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 && <span className="trpg-tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>
      </section>

      {/* 2. CORPO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {activeDMTab === 'table' && (
            <>
              <RequestInitiativeDialog
                open={initiativeDialog === 'request'}
                characters={campaign.characters}
                inCombatIds={
                  new Set(combatants.filter((c) => !c.isNPC && c.characterId).map((c) => c.characterId!))
                }
                onClose={() => setInitiativeDialog(null)}
                onConfirm={handleRequestInitiative}
              />
              <ManualInitiativeDialog
                open={initiativeDialog === 'manual'}
                characters={campaign.characters}
                currentInitiative={
                  new Map(
                    combatants
                      .filter((c) => !c.isNPC && c.characterId)
                      .map((c) => [c.characterId!, c.initiative] as [string, number])
                  )
                }
                onClose={() => setInitiativeDialog(null)}
                onConfirm={handleManualPlayersInitiative}
              />

              {/* RASTREADOR DE INICIATIVA */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                      <span><Icon name="swords" /> Rastreador de Combate & Iniciativa</span>
                      {combatants.length > 0 && (
                        <span className="bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded text-xs font-mono">
                          Rodada {roundNumber}
                        </span>
                      )}
                    </h3>
                    {initFeedback && (
                      <p className="text-xs text-emerald-400 font-semibold mt-1 animate-pulse">
                        {initFeedback}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInitiativeDialog('request')}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow-lg shadow-amber-900/30"
                    >
                      <Icon name="zap" /> Pedir Iniciativa aos Jogadores
                    </button>

                    <button
                      type="button"
                      onClick={() => setInitiativeDialog('manual')}
                      className="px-3 py-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Icon name="pencil" /> Iniciativa Manual
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDMTab('bestiary')}
                      className="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Icon name="ghost" /> Puxar Ameaça do Bloco
                    </button>

                    {combatants.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCombatants([]);
                          setCurrentTurnIndex(0);
                          setRoundNumber(1);
                        }}
                        className="px-2.5 py-2 bg-zinc-950 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Encerrar Combate
                      </button>
                    )}
                  </div>
                </div>

                {combatants.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    Nenhum combate em andamento. Peça iniciativa aos jogadores, digite a iniciativa manualmente ou envie criaturas pela aba Ameaças.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-zinc-400">
                        Ordem de Turnos (Edite os números à esquerda para reordenar manualmente)
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={handlePrevTurn}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-bold cursor-pointer"
                        >
                          <Icon name="arrow-left" size={15} /> Anterior
                        </button>
                        <button
                          type="button"
                          onClick={handleNextTurn}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Próximo turno <Icon name="arrow-left" size={15} className="rotate-180" />
                        </button>
                      </div>
                    </div>

                    {combatants.map((c, index) => {
                      const isCurrentTurn = index === currentTurnIndex;
                      const dmgParsed = c.damageFormula ? parseFormula(c.damageFormula) : null;
                      const matchedPlayer = !c.isNPC
                        ? campaign.characters.find((ch) => ch.id === c.characterId)
                        : undefined;
                      const combatantImg = c.imageUrl || matchedPlayer?.portraitUrl;

                      return (
                        <div
                          key={c.id}
                          className={`p-3 rounded-xl border flex flex-wrap justify-between items-center gap-3 transition ${
                            isCurrentTurn
                              ? 'bg-amber-950/30 border-amber-500 shadow-md shadow-amber-950/30'
                              : 'bg-zinc-950 border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              value={c.initiative}
                              onChange={(e) =>
                                handleManualInitiativeChange(c.id, Number(e.target.value))
                              }
                              className="w-14 bg-zinc-900 border border-zinc-700 rounded-lg py-1 text-center font-mono text-sm font-extrabold text-amber-400"
                            />

                            {combatantImg ? (
                              <img
                                src={combatantImg}
                                alt={c.name}
                                className="w-12 h-12 rounded-xl object-cover border border-amber-500/60 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg font-bold text-amber-400 shrink-0">
                                {c.isNPC ? <Icon name="ghost" size={18} /> : c.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-sm text-white">{c.name}</span>
                                <span
                                  className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                    c.isNPC
                                      ? 'bg-red-950 text-red-300 border border-red-800'
                                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  }`}
                                >
                                  {c.isNPC ? 'Ameaça' : 'Jogador'}
                                </span>
                                {c.isNPC && c.vd !== undefined && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700">
                                    VD {c.vd}
                                  </span>
                                )}
                                {c.isNPC && c.defense !== undefined && c.defense > 0 && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-amber-400 border border-zinc-700">
                                    <Icon name="shield" /> DEF {c.defense}
                                  </span>
                                )}
                                {c.isNPC &&
                                  c.hpCurrent !== undefined &&
                                  c.hpMax !== undefined &&
                                  c.hpCurrent > 0 &&
                                  c.hpCurrent <= Math.floor(c.hpMax / 2) && (
                                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-700">
                                      Machucado
                                    </span>
                                  )}
                                {isCurrentTurn && (
                                  <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-zinc-950 px-2 py-0.5 rounded animate-pulse">
                                    <Icon name="flame" /> Turno Atual
                                  </span>
                                )}
                              </div>
                              {c.isNPC && (c.resistances || c.vulnerabilities) && (
                                <div className="flex flex-wrap gap-2 mt-0.5 text-[10px] text-zinc-400">
                                  {c.resistances && (
                                    <span>
                                      <strong className="text-amber-400/90">RD:</strong>{' '}
                                      {c.resistances}
                                    </span>
                                  )}
                                  {c.vulnerabilities && (
                                    <span>
                                      <strong className="text-rose-400">Vuln:</strong>{' '}
                                      {c.vulnerabilities}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {c.isNPC && c.hpCurrent !== undefined && c.hpMax !== undefined && (
                              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNPCHp(c.id, -5)}
                                  className="px-1.5 py-0.5 bg-red-950 text-red-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  -5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNPCHp(c.id, -1)}
                                  className="px-1.5 py-0.5 bg-red-950 text-red-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  -1
                                </button>
                                <span className="text-xs font-mono font-bold text-red-400 px-1">
                                  <Icon name="heart" /> {c.hpCurrent}/{c.hpMax}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNPCHp(c.id, 1)}
                                  className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNPCHp(c.id, 5)}
                                  className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  +5
                                </button>
                              </div>
                            )}

                            {c.isNPC && c.attacks && c.attacks.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {c.attacks.map((atk) => {
                                  const atkDmg = parseFormula(atk.damageFormula);
                                  const extraDice = atk.extraDamage?.map((ed) => ({
                                    count: ed.count,
                                    sides: ed.sides,
                                    label: ed.label,
                                  }));
                                  return (
                                    <div
                                      key={atk.id}
                                      className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-1.5 py-1"
                                    >
                                      <span className="text-[10px] font-bold text-zinc-300 px-1">
                                        {atk.name}
                                        {atk.multiAttack ? ` (${atk.multiAttack})` : ''}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onRollDice(
                                            c.name,
                                            campaign.system,
                                            `${atk.name}${atk.multiAttack ? ` ${atk.multiAttack}` : ''} (${c.name})`,
                                            atk.diceCount,
                                            20,
                                            atk.attackBonus,
                                            isSecretRoll
                                          )
                                        }
                                        className="px-1.5 py-0.5 bg-zinc-950 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-[11px] font-mono font-bold cursor-pointer"
                                      >
                                        <Icon name="target" /> +{atk.attackBonus}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onRollDice(
                                            c.name,
                                            campaign.system,
                                            `Dano: ${atk.name} (${c.name})`,
                                            atkDmg.count,
                                            atkDmg.sides,
                                            atkDmg.modifier,
                                            isSecretRoll,
                                            false,
                                            undefined,
                                            extraDice
                                          )
                                        }
                                        className="px-1.5 py-0.5 bg-zinc-950 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-[11px] font-mono font-bold cursor-pointer"
                                      >
                                        <Icon name="sangue" /> {atk.damageFormula}
                                        {atk.extraDamage?.length
                                          ? `+${atk.extraDamage.map((e) => e.formula).join('+')}`
                                          : ''}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              c.isNPC &&
                              dmgParsed && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onRollDice(
                                        c.name,
                                        campaign.system,
                                        `${c.attackName || 'Ataque'} (${c.name})`,
                                        c.attackDice || 1,
                                        20,
                                        c.attackBonus || 0,
                                        isSecretRoll
                                      )
                                    }
                                    className="px-2 py-1 bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                                  >
                                    <Icon name="target" /> +{c.attackBonus}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onRollDice(
                                        c.name,
                                        campaign.system,
                                        `Dano: ${c.attackName || c.name}`,
                                        dmgParsed.count,
                                        dmgParsed.sides,
                                        dmgParsed.modifier,
                                        isSecretRoll
                                      )
                                    }
                                    className="px-2 py-1 bg-zinc-900 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                                  >
                                    <Icon name="sangue" /> {c.damageFormula}
                                  </button>
                                </>
                              )
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                setCombatants(combatants.filter((item) => item.id !== c.id))
                              }
                              className="text-xs text-zinc-500 hover:text-red-400 px-1.5 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CARTÕES TÁTICOS DOS JOGADORES */}
              <h3 className="text-base font-semibold text-zinc-100">
                <Icon name="shield" /> Grupo de Personagens na Mesa ({campaign.characters.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaign.characters.map((char) => {
                  const raw = (char.sheetData || {}) as Record<string, any>;
                  const abilities: CharacterAbility[] = Array.isArray(raw.abilities)
                    ? raw.abilities
                    : [];
                  const conditions: ActiveCondition[] = Array.isArray(raw.conditions)
                    ? raw.conditions
                    : [];
                  const levelOrNex =
                    char.system === 'ordem-paranormal'
                      ? Number(raw.nex ?? 5)
                      : Number(raw.level ?? 1);

                  const bonuses = calculateActiveBonuses(
                    char.system,
                    levelOrNex,
                    abilities,
                    char.inventory || [],
                    conditions,
                    Array.isArray(raw.sceneEffects) ? raw.sceneEffects : []
                  );

                  const agiOrDes =
                    char.system === 'ordem-paranormal'
                      ? Number(raw.attributes?.agi ?? 1) + (bonuses.attributes['agi'] || 0)
                      : Number(raw.attributes?.destreza ?? 1) +
                        (bonuses.attributes['destreza'] || 0);
                  const totalDefense = 10 + agiOrDes + bonuses.defense;

                  const strengthVal =
                    char.system === 'ordem-paranormal'
                      ? Number(raw.attributes?.for ?? 1) + (bonuses.attributes['for'] || 0)
                      : Number(raw.attributes?.forca ?? 1) + (bonuses.attributes['forca'] || 0);
                  const maxLoad =
                    (char.system === 'ordem-paranormal'
                      ? Math.max(2, strengthVal * 5)
                      : 10 + Math.max(0, strengthVal * 2)) + bonuses.loadLimit;
                  const currentLoad = (char.inventory || []).reduce(
                    (acc, i) => acc + i.slots * i.quantity,
                    0
                  );

                  return (
                    <div
                      key={char.id}
                      className="trpg-card p-4 flex flex-col justify-between gap-4"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {char.portraitUrl ? (
                              <img
                                src={char.portraitUrl}
                                alt={char.name}
                                className="w-16 h-16 rounded-lg object-cover border border-zinc-700 shrink-0 bg-zinc-950"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-2xl trpg-display text-zinc-300 shrink-0">
                                {char.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="text-xl trpg-display text-zinc-100 leading-tight truncate">
                                {char.name}
                              </h4>
                              <span className="text-xs text-zinc-500 block truncate">@{char.owner.username}</span>
                              <span className="text-xs text-zinc-400 block truncate">
                                {char.system === 'ordem-paranormal'
                                  ? `${raw.characterClass || 'Combatente'} • NEX ${levelOrNex}%`
                                  : `${raw.race || 'Humano'} ${raw.characterClass || 'Guerreiro'} • Nv ${levelOrNex}`}
                              </span>
                            </div>
                          </div>

                          <dl className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <dt className="text-zinc-500 flex items-center gap-1">
                                <Icon name="shield" size={14} /> Defesa
                              </dt>
                              <dd className="trpg-num font-semibold text-zinc-100">{totalDefense}</dd>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <dt className="text-zinc-500 flex items-center gap-1">
                                <Icon name="backpack" size={14} /> Carga
                              </dt>
                              <dd className={`trpg-num font-semibold ${currentLoad > maxLoad ? 'text-red-300' : 'text-zinc-100'}`}>
                                {currentLoad}/{maxLoad}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {conditions.map((cond) => (
                            <span
                              key={cond.id}
                              className="px-2 py-0.5 bg-red-950/80 border border-red-700 text-red-200 rounded-full text-[11px] font-bold flex items-center gap-1"
                            >
                              <Icon name="sangue" /> {cond.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveConditionFromChar(char, cond.id)}
                                className="text-red-400 hover:text-white ml-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </span>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              setConditionPickerCharId(
                                conditionPickerCharId === char.id ? null : char.id
                              )
                            }
                            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-[10px] font-bold transition cursor-pointer"
                          >
                            + Condição
                          </button>
                        </div>

                        {char.system === 'ordem-paranormal' &&
                          (hasDyingCondition(conditions) || deathAtOf(raw)) && (
                            <div className="flex flex-wrap items-center gap-2">
                              <DyingTracker
                                max={getDyingTurnsToDie(raw.abilities)}
                                turns={dyingTurnsOf(raw)}
                                dead={Boolean(deathAtOf(raw))}
                                onSetTurns={(n) => {
                                  updateDyingState(char.id, {
                                    dyingTurns: n,
                                    ...(n >= getDyingTurnsToDie(raw.abilities) ? { deathAt: Date.now() } : {}),
                                  });
                                }}
                              />
                              {deathAtOf(raw) ? (
                                <button
                                  type="button"
                                  className="trpg-btn-quiet trpg-btn-sm"
                                  onClick={() => handleUndoDeath(char)}
                                >
                                  <Icon name="undo" size={14} /> Desfazer morte
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="trpg-btn-secondary trpg-btn-sm"
                                  onClick={() => handleStabilizeCharacter(char)}
                                  title="Medicina DT 20 (+5 por vez já estabilizado na cena) ou efeito específico"
                                >
                                  <Icon name="heart-pulse" size={14} /> Estabilizar
                                </button>
                              )}
                            </div>
                          )}

                        {conditionPickerCharId === char.id && (
                          <div className="bg-zinc-950 border border-red-900/60 p-2.5 rounded-xl flex flex-wrap gap-1.5 mt-1">
                            {compendiumConditions.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleApplyConditionToChar(char, c)}
                                className="px-2 py-1 bg-red-950/60 hover:bg-red-800 text-red-200 border border-red-800 rounded text-[11px] font-semibold cursor-pointer"
                              >
                                + {c.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2.5 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80">
                        {char.vitals.map((bar) => {
                          const effectiveMax = Math.max(1, bar.max + (bonuses.vitalMax[bar.id] || 0));
                          const pct = Math.max(0, Math.min(100, (bar.current / effectiveMax) * 100));

                          const tempAmount =
                            bar.id === 'pv'
                              ? Number(raw.tempHp || 0)
                              : bar.id === 'pe'
                              ? Number(raw.tempPe || 0)
                              : 0;
                          const tempMax =
                            bar.id === 'pv'
                              ? Number(raw.tempHpMax || 0)
                              : bar.id === 'pe'
                              ? Number(raw.tempPeMax || 0)
                              : 0;

                          return (
                            <div key={bar.id} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                                  <span>{bar.label}</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickVitalChange(char, bar.id, -5)}
                                    className="px-1.5 py-0.5 bg-red-950 hover:bg-red-800 text-red-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                  >
                                    -5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickVitalChange(char, bar.id, -1)}
                                    className="px-1.5 py-0.5 bg-red-950 hover:bg-red-800 text-red-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                  >
                                    -1
                                  </button>
                                  <span className="font-mono font-extrabold text-white min-w-[54px] text-center">
                                    {bar.current}/{effectiveMax}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickVitalChange(char, bar.id, 1)}
                                    className="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                  >
                                    +1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickVitalChange(char, bar.id, 5)}
                                    className="px-1.5 py-0.5 bg-emerald-950 hover:bg-emerald-800 text-emerald-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                  >
                                    +5
                                  </button>
                                </div>
                              </div>

                              <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                                <div
                                  className="h-full transition-all duration-200 ease-out"
                                  style={{ width: `${pct}%`, backgroundColor: bar.id === 'pv' ? 'var(--trpg-pv)' : bar.id === 'san' ? 'var(--trpg-san)' : bar.id === 'pe' ? 'var(--trpg-pe)' : bar.color }}
                                />
                              </div>

                              {(bar.id === 'pv' || bar.id === 'pe') && (
                                <TempVitalBar
                                  current={tempAmount}
                                  max={tempMax}
                                  barId={bar.id}
                                  size="sm"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectCharacter(char.id)}
                          className="flex-1 py-2 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <Icon name="search" /> Inspecionar / Editar Ficha Completa
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Remover "${char.name}" desta campanha? A ficha voltará intacta para o Cofre de @${char.owner.username}.`
                              )
                            )
                              return;
                            try {
                              await removeCharacterFromCampaign(campaign.id, char.id);
                              onBroadcastCharacterSync(char.id);
                              loadScreenData(true);
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                          className="px-3 py-2 bg-zinc-950 hover:bg-red-950 text-zinc-500 hover:text-red-300 border border-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer"
                          title="Remover personagem desta campanha (Devolve ao Cofre)"
                        >
                          <Icon name="logout" /> Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeDMTab === 'bestiary' && (
            <BestiaryManager
              system={campaign.system}
              threats={threats}
              compendiumEntries={compendiumEntries}
              isSecretRoll={isSecretRoll}
              partyTotalNex={partyTotalNex}
              activeProjectionId={monitorDirector.activeProjection?.id}
              onUpdateThreats={setThreats}
              onToggleProjection={handleToggleProjection}
              onRollDice={onRollDice}
              onSendThreatToCombatManual={handleSendThreatToCombatManual}
              onSendThreatBatchToCombat={handleSendThreatBatchToCombat}
            />
          )}

          {activeDMTab === 'loot' && (
            <LootAndMerchantsManager
              system={campaign.system}
              allowedSources={(campaign as any).allowedSources}
              characters={campaign.characters}
              compendiumEntries={compendiumEntries}
              campaignItems={campaignItems}
              merchants={merchants}
              activeProjectionId={monitorDirector.activeProjection?.id}
              activeMerchantOnMonitorId={monitorDirector.activeMerchantId}
              onUpdateCampaignItems={setCampaignItems}
              onUpdateMerchants={setMerchants}
              onToggleProjection={handleToggleProjection}
              onToggleMerchantOnMonitor={(merchantId) =>
                setMonitorDirector((prev) => ({
                  ...prev,
                  activeMerchantId: prev.activeMerchantId === merchantId ? null : merchantId,
                }))
              }
              onDeliverItemToCharacter={handleDeliverItemToCharacter}
            />
          )}

          {activeDMTab === 'notes' && (
            <NotesAndPostItsManager
              typedNotes={dmNotes}
              onUpdateTypedNotes={setDmNotes}
              postIts={postIts}
              characters={campaign.characters}
              onUpdatePostIts={setPostIts}
              onBroadcastPostIt={onSharePostIt}
            />
          )}

          {activeDMTab === 'monitor' && (
            <MonitorDirectorPanel
              campaignId={campaign.id}
              director={monitorDirector}
              merchants={merchants}
              onChangeDirector={setMonitorDirector}
              onResetMonitor={handleResetSecondMonitor}
            />
          )}

          {activeDMTab === 'activity' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    <Icon name="note" /> Log Geral de Atividades da Mesa
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Histórico completo de habilidades, rituais, trocas, equipamentos, consumíveis e variações vitais em tempo real.
                  </p>
                </div>

                {sessionActivityLog.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllActivityLog}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Icon name="trash" /> Limpar Log da Sessão
                  </button>
                )}
              </div>

              {/* Resumo rápido de contadores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold">Total de Eventos</span>
                  <span className="text-lg font-mono font-extrabold text-white">{sessionActivityLog.length}</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold"><Icon name="heart" /> Vitais / Condições</span>
                  <span className="text-lg font-mono font-extrabold text-red-400">
                    {sessionActivityLog.filter((e) => e.category === 'vital' || e.category === 'condition').length}
                  </span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold"><Icon name="sparkles" /> Poderes / Rituais</span>
                  <span className="text-lg font-mono font-extrabold text-purple-400">
                    {sessionActivityLog.filter((e) => e.category === 'ability' || e.category === 'interlude').length}
                  </span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold"><Icon name="backpack" /> Itens & Trocas</span>
                  <span className="text-lg font-mono font-extrabold text-amber-400">
                    {
                      sessionActivityLog.filter(
                        (e) =>
                          e.category === 'inventory' ||
                          e.category === 'consumable' ||
                          e.category === 'transfer'
                      ).length
                    }
                  </span>
                </div>
              </div>

              {/* Barra de busca, filtro de personagem e categorias */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={fullLogSearch}
                  onChange={(e) => setFullLogSearch(e.target.value)}
                  placeholder="Buscar no log por item, ritual, poder, dano..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={fullLogCharFilter}
                  onChange={(e) => setFullLogCharFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-semibold"
                >
                  <option value="ALL">Todos os Personagens</option>
                  {campaign.characters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                  <option value="Mestre">Mestre</option>
                  <option value="Mesa">Mesa</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFullLogCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    fullLogCategoryFilter === 'all'
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  Tudo ({sessionActivityLog.length})
                </button>
                {(Object.keys(ACTIVITY_CATEGORY_META) as SessionActivityCategory[]).map((cat) => {
                  const meta = ACTIVITY_CATEGORY_META[cat];
                  const count = sessionActivityLog.filter((e) => e.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFullLogCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        fullLogCategoryFilter === cat
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      <Icon name={meta.icon} size={14} /> {meta.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[580px] overflow-y-auto flex flex-col gap-2 pr-1">
                {fullFilteredActivityLog.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-10">
                    Nenhuma atividade registrada com os filtros selecionados.
                  </p>
                ) : (
                  fullFilteredActivityLog.map((entry) => renderActivityCard(entry, false))
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA FIXA: DADOS DO MESTRE + LOG */}
        <div className="lg:col-span-4 flex flex-col gap-5 sticky top-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-zinc-100">
                <Icon name="d20" /> Dados do Mestre
              </h3>

              <button
                type="button"
                onClick={() => setIsSecretRoll(!isSecretRoll)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  isSecretRoll
                    ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                }`}
              >
                {isSecretRoll ? 'Modo Secreto (Oculto)' : 'Modo Público'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '1d20', c: 1, s: 20 },
                { label: '2d20', c: 2, s: 20 },
                { label: '3d20', c: 3, s: 20 },
                { label: '1d100', c: 1, s: 100 },
                { label: '1d6', c: 1, s: 6 },
                { label: '2d6', c: 2, s: 6 },
                { label: '1d8', c: 1, s: 8 },
                { label: '1d10', c: 1, s: 10 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    onRollDice(
                      'Mestre',
                      campaign.system,
                      `Rolagem Rápida (${preset.label})`,
                      preset.c,
                      preset.s,
                      0,
                      isSecretRoll
                    )
                  }
                  className="py-1.5 bg-zinc-950 hover:bg-amber-600 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleCustomDMRoll} className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
              <input
                type="text"
                value={dmRollLabel}
                onChange={(e) => setDmRollLabel(e.target.value)}
                placeholder="Motivo (Ex: Teste de Percepção)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500">Qtd Dados</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={dmDiceCount}
                    onChange={(e) => setDmDiceCount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500">Faces (d)</label>
                  <select
                    value={dmDiceSides}
                    onChange={(e) => setDmDiceSides(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-white"
                  >
                    <option value={4}>d4</option>
                    <option value={6}>d6</option>
                    <option value={8}>d8</option>
                    <option value={10}>d10</option>
                    <option value={12}>d12</option>
                    <option value={20}>d20</option>
                    <option value={100}>d100</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500">Bônus (+/-)</label>
                  <input
                    type="number"
                    value={dmDiceMod}
                    onChange={(e) => setDmDiceMod(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className={`w-full py-2 rounded-lg text-xs font-bold transition cursor-pointer mt-1 ${
                  isSecretRoll
                    ? 'bg-purple-700 hover:bg-purple-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {isSecretRoll ? 'Rolar em Segredo' : 'Rolar na Mesa'}
              </button>
            </form>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col h-[500px]">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRightPanelFeedTab('activity')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                    rightPanelFeedTab === 'activity'
                      ? 'bg-cyan-600 text-white border-cyan-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon name="note" /> Atividades ({sessionActivityLog.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelFeedTab('rolls')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                    rightPanelFeedTab === 'rolls'
                      ? 'bg-amber-600 text-white border-amber-400'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon name="d20" /> Rolagens ({rollHistory.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {rightPanelFeedTab === 'activity' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveDMTab('activity')}
                      className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      Expandir
                    </button>
                    {sessionActivityLog.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllActivityLog}
                        className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </>
                )}
                {rightPanelFeedTab === 'rolls' && rollHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearRolls}
                    className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {rightPanelFeedTab === 'activity' ? (
              <>
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {[
                    { id: 'all' as const, label: 'Tudo' },
                    { id: 'vital' as const, label: 'Vitais' },
                    { id: 'ability' as const, label: 'Poderes/Rituais' },
                    { id: 'items' as const, label: 'Itens & Trocas' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setQuickActivityFilter(f.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition cursor-pointer ${
                        quickActivityFilter === f.id
                          ? 'bg-cyan-950 text-cyan-200 border-cyan-500/70'
                          : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                  {quickFilteredActivityLog.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center my-auto px-4">
                      Nenhuma atividade registrada nesta sessão ainda. Equipar itens, usar poderes/rituais, consumir suprimentos e alterar barras vitais aparecerão aqui em tempo real.
                    </p>
                  ) : (
                    quickFilteredActivityLog.map((entry) => renderActivityCard(entry, true))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {rollHistory.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center my-auto px-4">
                    Nenhuma rolagem feita na sessão ainda.
                  </p>
                ) : (
                  rollHistory.map((roll) => (
                    <div
                      key={roll.id}
                      className={`p-3 rounded-xl border flex justify-between items-center gap-2 ${
                        roll.isSecret
                          ? 'bg-purple-950/20 border-purple-800/60'
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 text-xs">{roll.characterName}</span>
                          {roll.isSecret && (
                            <span className="text-[9px] font-mono uppercase bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded">
                              <Icon name="conhecimento" /> Secreta
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500">{roll.timestamp}</span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 mt-0.5">{roll.label}</p>
                        <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                          {roll.formula} → [{roll.rolls.join(', ')}]
                        </p>
                      </div>

                      <div className="text-2xl font-extrabold font-mono text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700">
                        {roll.total}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DO MESTRE: LIBERAR CENA DE INTERLÚDIO */}
      {isDMInterludeModalOpen && campaign.system === 'ordem-paranormal' && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-indigo-500/60 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  <Icon name="crown" /> Controle do Mestre • Ordem Paranormal
                </span>
                <h3 className="text-lg font-black text-white">Liberar Cena de Interlúdio</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Defina o tipo de descanso do abrigo para todos ou individualmente. A ficha de cada jogador liberará as escolhas automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDMInterludeModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modo: Todos vs Individual */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDmInterludeMode('all')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold border cursor-pointer transition ${
                  dmInterludeMode === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Icon name="users" /> Mesmo Descanso para Todos
              </button>
              <button
                type="button"
                onClick={() => setDmInterludeMode('individual')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold border cursor-pointer transition ${
                  dmInterludeMode === 'individual'
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <Icon name="user" /> Individual por Personagem
              </button>
            </div>

            {dmInterludeMode === 'all' ? (
              <div className="space-y-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <label className="block text-xs font-bold uppercase text-zinc-400">
                  Condição de Conforto do Abrigo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { mult: 0.5 as const, label: 'Precário (0,5x)' },
                    { mult: 1 as const, label: 'Normal (1x)' },
                    { mult: 2 as const, label: 'Confortável (2x)' },
                    { mult: 3 as const, label: 'Luxuoso (3x)' },
                  ].map((c) => (
                    <button
                      key={c.mult}
                      type="button"
                      onClick={() => setDmInterludeGlobalComfort(c.mult)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        dmInterludeGlobalComfort === c.mult
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 max-h-72 overflow-y-auto">
                {campaign.characters.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    Nenhum personagem vinculado a esta campanha.
                  </p>
                ) : (
                  campaign.characters.map((ch) => {
                    const hasPending = Boolean((ch.sheetData as any)?.pendingInterlude);
                    const val = dmInterludePerCharComfort[ch.id] ?? 1;
                    return (
                      <div
                        key={ch.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            {ch.name}
                          </span>
                          {hasPending && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                              <Icon name="moon" /> Pendente
                            </span>
                          )}
                        </div>
                        <select
                          value={val}
                          onChange={(e) =>
                            setDmInterludePerCharComfort((prev) => ({
                              ...prev,
                              [ch.id]: Number(e.target.value) as 0 | 0.5 | 1 | 2 | 3,
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                        >
                          <option value={0}>Não liberar</option>
                          <option value={0.5}>Precário (0,5x)</option>
                          <option value={1}>Normal (1x)</option>
                          <option value={2}>Confortável (2x)</option>
                          <option value={3}>Luxuoso (3x)</option>
                        </select>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleCancelAllPendingInterludes}
                className="px-3 py-2 rounded-lg bg-red-950/70 hover:bg-red-800 text-red-200 border border-red-700/70 text-xs font-bold cursor-pointer"
              >
                <Icon name="x-circle" /> Recolher Interlúdios Pendentes
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsDMInterludeModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleReleaseInterludeForPlayers}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black cursor-pointer"
                >
                  <Icon name="moon" /> Liberar Interlúdio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}