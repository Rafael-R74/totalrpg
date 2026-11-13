import { useState, useEffect, useRef } from 'react';
import {
  SystemId,
  SheetPermissions,
  DiceRollResult,
  CompendiumEntryData,
  ActiveCondition,
  CharacterAbility,
  RPGItem,
  PreparedAttack,
  CampaignThreat,
  CampaignMerchant,
  StickyPostIt,
  calculateActiveBonuses,
} from '@totalrpg/shared';
import {
  DMScreenCampaignData,
  DMScreenCharacter,
  fetchDMScreenData,
  updateCampaignPermissions,
  updateCampaignDMData,
  updateCharacter,
  fetchCompendium,
} from '../services/api';
import { BestiaryManager } from './dm/BestiaryManager';
import { LootAndMerchantsManager, CampaignStoredItem } from './dm/LootAndMerchantsManager';
import { NotesAndPostItsManager, FloatingPostItsLayer } from './dm/NotesAndPostItsManager';

export interface CombatantEntry {
  id: string;
  characterId?: string;
  name: string;
  initiative: number;
  isNPC: boolean;
  hpCurrent?: number;
  hpMax?: number;
  attackName?: string;
  attackDice?: number;
  attackBonus?: number;
  damageFormula?: string;
}

interface DMScreenProps {
  campaignId: string;
  rollHistory: DiceRollResult[];
  onClearRolls: () => void;
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
    characterId?: string
  ) => void;
  onBroadcastPermissions: (permissions: SheetPermissions) => void;
  onBroadcastCharacterSync: (characterId: string) => void;
  onRequestPlayersInitiative: () => void;
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

export function DMScreen({
  campaignId,
  rollHistory,
  onClearRolls,
  onInspectCharacter,
  onRollDice,
  onBroadcastPermissions,
  onBroadcastCharacterSync,
  onRequestPlayersInitiative,
  onSharePostIt,
  onNotifyItemGiven,
  lastUpdatedCharSignal,
  lastInitiativeSubmission,
  dismissedPostItSignal,
}: DMScreenProps) {
  const [campaign, setCampaign] = useState<DMScreenCampaignData | null>(null);
  const [compendiumEntries, setCompendiumEntries] = useState<CompendiumEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Trava que impede sobrescrever o banco SQLite antes do carregamento inicial terminar
  const isHydratedRef = useRef(false);

  const [activeDMTab, setActiveDMTab] = useState<'table' | 'bestiary' | 'loot' | 'notes'>('table');
  const [conditionPickerCharId, setConditionPickerCharId] = useState<string | null>(null);
  const [initFeedback, setInitFeedback] = useState('');

  // Estados sincronizados com o Banco de Dados SQLite (Etapa 4D)
  const [combatants, setCombatants] = useState<CombatantEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [threats, setThreats] = useState<CampaignThreat[]>([]);
  const [campaignItems, setCampaignItems] = useState<CampaignStoredItem[]>([]);
  const [merchants, setMerchants] = useState<CampaignMerchant[]>([]);
  const [dmNotes, setDmNotes] = useState<string>('');
  const [postIts, setPostIts] = useState<StickyPostIt[]>([]);

  const [isSecretRoll, setIsSecretRoll] = useState(false);
  const [dmRollLabel, setDmRollLabel] = useState('Teste de Ameaça / NPC');
  const [dmDiceCount, setDmDiceCount] = useState(1);
  const [dmDiceSides, setDmDiceSides] = useState(20);
  const [dmDiceMod, setDmDiceMod] = useState(0);

  async function loadScreenData(silent = false) {
    if (!silent) setIsLoading(true);
    try {
      const data = await fetchDMScreenData(campaignId);
      setCampaign(data);

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
        setThreats(dbThreats);
        setCampaignItems(dbItems);
        setMerchants(dbMerchants);
        setDmNotes(dbNotes);
        setPostIts(dbPostIts);

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
    isHydratedRef.current = false;
    loadScreenData();
  }, [campaignId]);

  useEffect(() => {
    if (lastUpdatedCharSignal) loadScreenData(true);
  }, [lastUpdatedCharSignal]);

  // Salva automaticamente no SQLite sempre que qualquer bloco do Mestre for modificado após a hidratação
  useEffect(() => {
    if (!isHydratedRef.current) return;
    const timer = setTimeout(() => {
      updateCampaignDMData(campaignId, {
        dmNotes,
        combatState: { combatants, currentTurnIndex, roundNumber },
        threats,
        campaignItems,
        merchants,
        postIts,
      }).catch((err) => console.error('Erro no auto-save do Escudo:', err));
    }, 350);

    return () => clearTimeout(timer);
  }, [dmNotes, combatants, currentTurnIndex, roundNumber, threats, campaignItems, merchants, postIts, campaignId]);

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
        initiative: lastInitiativeSubmission.initiative,
        isNPC: true,
        hpCurrent: matchedThreat.hpMax,
        hpMax: matchedThreat.hpMax,
        attackName: primaryAtk?.name || 'Ataque',
        attackDice: primaryAtk?.diceCount || 1,
        attackBonus: primaryAtk?.attackBonus || 0,
        damageFormula: primaryAtk?.damageFormula || '1d6',
      };

      setCombatants((prev) =>
        [...prev, newThreatCombatant].sort((a, b) => b.initiative - a.initiative)
      );
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

  function handleSendThreatToCombatManual(threat: CampaignThreat, manualInitiative: number) {
    const primaryAtk = threat.attacks[0];
    const newEntry: CombatantEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: threat.name,
      initiative: Number(manualInitiative),
      isNPC: true,
      hpCurrent: threat.hpMax,
      hpMax: threat.hpMax,
      attackName: primaryAtk?.name || 'Ataque',
      attackDice: primaryAtk?.diceCount || 1,
      attackBonus: primaryAtk?.attackBonus || 0,
      damageFormula: primaryAtk?.damageFormula || '1d6',
    };

    setCombatants((prev) => [...prev, newEntry].sort((a, b) => b.initiative - a.initiative));
    setActiveDMTab('table');
  }

  // Entrega um item ao jogador no SQLite, sincroniza a ficha e dispara o Modal de Recompensa na tela dele!
async function handleDeliverItemToCharacter(
    targetChar: DMScreenCharacter,
    item: RPGItem,
    attack?: PreparedAttack,
    fromMerchant?: boolean
  ) {
    const nextInventory = [...(targetChar.inventory || []), item];
    const nextAttacks = attack ? [...(targetChar.attacks || []), attack] : targetChar.attacks;

    await updateCharacter(targetChar.id, {
      inventory: nextInventory,
      attacks: nextAttacks,
    });
    onBroadcastCharacterSync(targetChar.id);

    // Só abre o Modal de Loot na tela do jogador se for recompensa direta (não comprada em Mercador)
    if (!fromMerchant) {
      onNotifyItemGiven(targetChar.id, item, attack);
    }
    loadScreenData(true);
  }

  function handleRequestInitiativeClick() {
    onRequestPlayersInitiative();
    setInitFeedback('⚡ Pedido de Iniciativa enviado para a tela dos jogadores!');
    setTimeout(() => setInitFeedback(''), 4000);
  }

  function handleManualInitiativeChange(id: string, newInit: number) {
    setCombatants((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, initiative: newInit } : c));
      return [...updated].sort((a, b) => b.initiative - a.initiative);
    });
  }

  function handleNextTurn() {
    if (combatants.length === 0) return;
    if (currentTurnIndex + 1 >= combatants.length) {
      setCurrentTurnIndex(0);
      setRoundNumber((r) => r + 1);
    } else {
      setCurrentTurnIndex((i) => i + 1);
    }
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

  async function handleQuickVitalChange(char: DMScreenCharacter, barId: string, delta: number) {
    const rawSheet = (char.sheetData || {}) as Record<string, any>;
    const abilities: CharacterAbility[] = Array.isArray(rawSheet.abilities) ? rawSheet.abilities : [];
    const conditions: ActiveCondition[] = Array.isArray(rawSheet.conditions) ? rawSheet.conditions : [];
    const levelOrNex =
      char.system === 'ordem-paranormal' ? Number(rawSheet.nex ?? 5) : Number(rawSheet.level ?? 1);

    const bonuses = calculateActiveBonuses(
      char.system,
      levelOrNex,
      abilities,
      char.inventory || [],
      conditions
    );

    const updatedVitals = char.vitals.map((bar) => {
      if (bar.id !== barId) return bar;
      const effectiveMax = Math.max(1, bar.max + (bonuses.vitalMax[bar.id] || 0));
      const nextCurrent = Math.max(0, Math.min(effectiveMax, bar.current + delta));
      return { ...bar, current: nextCurrent };
    });

    setCampaign((prev) =>
      prev
        ? {
            ...prev,
            characters: prev.characters.map((c) =>
              c.id === char.id ? { ...c, vitals: updatedVitals } : c
            ),
          }
        : null
    );

    try {
      await updateCharacter(char.id, { vitals: updatedVitals });
      onBroadcastCharacterSync(char.id);
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
      '👑 Mestre',
      campaign.system,
      dmRollLabel.trim() || 'Rolagem do Mestre',
      dmDiceCount,
      dmDiceSides,
      dmDiceMod,
      isSecretRoll
    );
  }

  return (
    <div className="flex flex-col gap-6">
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

      {/* 1. CABEÇALHO DO ESCUDO + BARRA DE TRAVAS EM TEMPO REAL */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 shadow-xl">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono uppercase bg-amber-950/80 text-amber-400 border border-amber-700/60 px-2.5 py-0.5 rounded-full font-bold">
                👑 Escudo do Mestre
              </span>
              <span className="text-xs font-mono uppercase bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full">
                {campaign.system}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                💾 Sincronizado no SQLite
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mt-1">{campaign.name}</h2>
          </div>

          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl">
            <div>
              <span className="block text-[10px] uppercase text-zinc-500 font-bold">Código de Convite</span>
              <span className="font-mono text-base font-extrabold text-amber-400">{campaign.inviteCode}</span>
            </div>
            <div className="h-8 w-[1px] bg-zinc-800 mx-1" />
            <div>
              <span className="block text-[10px] uppercase text-zinc-500 font-bold">Jogadores</span>
              <span className="font-mono text-base font-extrabold text-white">
                {campaign.characters.length} ativos
              </span>
            </div>
          </div>
        </div>

        {/* BARRA DE TRAVAS (SHEET LOCKDOWN) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => handleTogglePermission('lockAllSheets')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
              campaign.lockAllSheets
                ? 'bg-red-950/70 border-red-600 text-red-200 shadow-lg shadow-red-950/40'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="text-xs font-extrabold uppercase flex items-center justify-between">
              <span>Trava Mestra</span>
              <span>{campaign.lockAllSheets ? '🔒 ON' : '🔓 OFF'}</span>
            </span>
            <span className="text-[10px] opacity-80">
              {campaign.lockAllSheets ? 'Fichas congeladas!' : 'Regras individuais'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTogglePermission('allowEditVitals')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
              !campaign.lockAllSheets && campaign.allowEditVitals
                ? 'bg-emerald-950/40 border-emerald-700/70 text-emerald-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="text-xs font-bold uppercase flex items-center justify-between">
              <span>Barras Vitais</span>
              <span>{!campaign.lockAllSheets && campaign.allowEditVitals ? '✓ Livre' : '✕ Bloq'}</span>
            </span>
            <span className="text-[10px] opacity-80">Dano/Cura pelo jogador</span>
          </button>

          <button
            type="button"
            onClick={() => handleTogglePermission('allowEditInventory')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
              !campaign.lockAllSheets && campaign.allowEditInventory
                ? 'bg-emerald-950/40 border-emerald-700/70 text-emerald-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="text-xs font-bold uppercase flex items-center justify-between">
              <span>Inventário</span>
              <span>{!campaign.lockAllSheets && campaign.allowEditInventory ? '✓ Livre' : '✕ Bloq'}</span>
            </span>
            <span className="text-[10px] opacity-80">Pegar/Equipar armas</span>
          </button>

          <button
            type="button"
            onClick={() => handleTogglePermission('allowEditAbilities')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
              !campaign.lockAllSheets && campaign.allowEditAbilities
                ? 'bg-emerald-950/40 border-emerald-700/70 text-emerald-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="text-xs font-bold uppercase flex items-center justify-between">
              <span>Habilidades</span>
              <span>{!campaign.lockAllSheets && campaign.allowEditAbilities ? '✓ Livre' : '✕ Bloq'}</span>
            </span>
            <span className="text-[10px] opacity-80">Treino, poderes e rituais</span>
          </button>

          <button
            type="button"
            onClick={() => handleTogglePermission('allowEditAttributes')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
              !campaign.lockAllSheets && campaign.allowEditAttributes
                ? 'bg-amber-950/50 border-amber-600/80 text-amber-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="text-xs font-bold uppercase flex items-center justify-between">
              <span>Atributos/Nv</span>
              <span>{!campaign.lockAllSheets && campaign.allowEditAttributes ? '✓ Livre' : '✕ Bloq'}</span>
            </span>
            <span className="text-[10px] opacity-80">Libere ao subir de nível!</span>
          </button>

          <button
            type="button"
            onClick={() => handleTogglePermission('allowTrade')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
              !campaign.lockAllSheets && campaign.allowTrade
                ? 'bg-blue-950/50 border-blue-600/80 text-blue-200'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="text-xs font-bold uppercase flex items-center justify-between">
              <span>Comércio</span>
              <span>{!campaign.lockAllSheets && campaign.allowTrade ? '✓ Aberto' : '✕ Fechado'}</span>
            </span>
            <span className="text-[10px] opacity-80">Troca entre jogadores/loja</span>
          </button>
        </div>

        {/* NAVEGADOR DOS 4 BLOCOS DO MESTRE */}
        <div className="flex flex-wrap border-t border-zinc-800 pt-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveDMTab('table')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeDMTab === 'table'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            ⚔️ Mesa, Iniciativa & Jogadores
          </button>

          <button
            type="button"
            onClick={() => setActiveDMTab('bestiary')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeDMTab === 'bestiary'
                ? 'bg-red-700 text-white shadow-lg shadow-red-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            👹 Bloco de Ameaças ({threats.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveDMTab('loot')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeDMTab === 'loot'
                ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            🎒 Itens da Aventura ({campaignItems.length}) & Mercadores ({merchants.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveDMTab('notes')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              activeDMTab === 'notes'
                ? 'bg-purple-700 text-white shadow-lg shadow-purple-900/30'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            🎨 Caderno de Desenho & Post-its ({postIts.length})
          </button>
        </div>
      </div>

      {/* 2. CORPO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {activeDMTab === 'table' && (
            <>
              {/* RASTREADOR DE INICIATIVA */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
                <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                      <span>⚔️ Rastreador de Combate & Iniciativa</span>
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
                      onClick={handleRequestInitiativeClick}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow-lg shadow-amber-900/30"
                    >
                      ⚡ Pedir Iniciativa aos Jogadores
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDMTab('bestiary')}
                      className="px-3 py-2 bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      👹 Puxar Ameaça do Bloco
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
                    Nenhum combate ativo. Peça iniciativa aos jogadores acima ou envie criaturas pelo <strong>"👹 Bloco de Ameaças"</strong>!
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
                          ⬅️ Anterior
                        </button>
                        <button
                          type="button"
                          onClick={handleNextTurn}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Próximo Turno ➡️
                        </button>
                      </div>
                    </div>

                    {combatants.map((c, index) => {
                      const isCurrentTurn = index === currentTurnIndex;
                      const dmgParsed = c.damageFormula ? parseFormula(c.damageFormula) : null;

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

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">{c.name}</span>
                                <span
                                  className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                                    c.isNPC
                                      ? 'bg-red-950 text-red-300 border border-red-800'
                                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  }`}
                                >
                                  {c.isNPC ? '👹 Ameaça' : '🛡️ Jogador'}
                                </span>
                                {isCurrentTurn && (
                                  <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-zinc-950 px-2 py-0.5 rounded animate-pulse">
                                    🔥 Turno Atual
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {c.isNPC && c.hpCurrent !== undefined && c.hpMax !== undefined && (
                              <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNPCHp(c.id, -5)}
                                  className="px-1.5 py-0.5 bg-red-950 text-red-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  -5
                                </button>
                                <span className="text-xs font-mono font-bold text-red-400 px-1">
                                  ❤️ {c.hpCurrent}/{c.hpMax}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateNPCHp(c.id, 5)}
                                  className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                                >
                                  +5
                                </button>
                              </div>
                            )}

                            {c.isNPC && dmgParsed && (
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
                                  🎯 +{c.attackBonus}
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
                                  🩸 {c.damageFormula}
                                </button>
                              </>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                🛡️ Grupo de Personagens na Mesa ({campaign.characters.length})
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
                    conditions
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
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-lg"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-zinc-400">
                              Jogador: <strong className="text-amber-400">@{char.owner.username}</strong>
                            </span>
                            <h4 className="text-lg font-extrabold text-white leading-tight">
                              {char.name}
                            </h4>
                            <span className="text-xs text-zinc-400">
                              {char.system === 'ordem-paranormal'
                                ? `${raw.characterClass || 'Combatente'} • NEX ${levelOrNex}%`
                                : `${raw.race || 'Humano'} ${raw.characterClass || 'Guerreiro'} • Nv ${levelOrNex}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg text-center">
                              <span className="block text-[9px] uppercase text-zinc-500 font-bold">
                                Defesa
                              </span>
                              <span className="font-mono text-sm font-extrabold text-amber-400">
                                🛡️ {totalDefense}
                              </span>
                            </div>
                            <div className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg text-center">
                              <span className="block text-[9px] uppercase text-zinc-500 font-bold">
                                Carga
                              </span>
                              <span
                                className={`font-mono text-sm font-extrabold ${
                                  currentLoad > maxLoad ? 'text-red-400' : 'text-zinc-200'
                                }`}
                              >
                                🎒 {currentLoad}/{maxLoad}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {conditions.map((cond) => (
                            <span
                              key={cond.id}
                              className="px-2 py-0.5 bg-red-950/80 border border-red-700 text-red-200 rounded-full text-[11px] font-bold flex items-center gap-1"
                            >
                              🩸 {cond.name}
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

                          return (
                            <div key={bar.id} className="flex flex-col gap-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-zinc-300">{bar.label}</span>
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
                                  className="h-full transition-all duration-300"
                                  style={{ width: `${pct}%`, backgroundColor: bar.color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => onInspectCharacter(char.id)}
                        className="w-full py-2 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        🔍 Inspecionar / Editar Ficha Completa
                      </button>
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
              onUpdateThreats={setThreats}
              onRollDice={onRollDice}
              onSendThreatToCombatManual={handleSendThreatToCombatManual}
            />
          )}

          {activeDMTab === 'loot' && (
            <LootAndMerchantsManager
              system={campaign.system}
              characters={campaign.characters}
              compendiumEntries={compendiumEntries}
              campaignItems={campaignItems}
              merchants={merchants}
              onUpdateCampaignItems={setCampaignItems}
              onUpdateMerchants={setMerchants}
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
        </div>

        {/* COLUNA DIREITA FIXA: DADOS DO MESTRE + LOG */}
        <div className="lg:col-span-4 flex flex-col gap-5 sticky top-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">
                🎲 Dados do Mestre
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
                {isSecretRoll ? '👁️ Modo Secreto (Oculto)' : '📢 Modo Público'}
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
                      '👑 Mestre',
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
                {isSecretRoll ? '👁️ Rolar em Segredo' : '🎲 Rolar na Mesa'}
              </button>
            </form>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col h-[420px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                📜 Rolagens da Sessão ({rollHistory.length})
              </h3>
              {rollHistory.length > 0 && (
                <button
                  type="button"
                  onClick={onClearRolls}
                  className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

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
                            👁️ Secreta
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
          </div>
        </div>
      </div>
    </div>
  );
}