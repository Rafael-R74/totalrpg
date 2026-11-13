import { useState, useEffect } from 'react';
import {
  OrdemSheetData,
  T20SheetData,
  SystemId,
  CharacterAbility,
  ActiveCondition,
  CompendiumEntryData,
  SystemSkillDefinition,
  SheetPermissions,
  RPGItem,
  PreparedAttack,
  calculateActiveBonuses,
  ORDEM_NEX_PROGRESSION,
  ORDEM_TRAILS,
  ORDEM_COMPENDIUM_ENTRIES,
  ORDEM_INSANITY_EFFECTS,
  ORDEM_INTERLUDE_DISHES,
  calculateOrdemBaseVitals,
  getOrdemPeLimit,
  getOrdemMaxLoad,
  checkOrdemPowerRequirements,
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
import { ImageUploadField } from '../ImageUploadField';

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
    characterId?: string
  ) => void;
  onCharacterSaved?: (characterId: string, campaignId?: string | null) => void;
  onNotifyItemGiven?: (targetCharacterId: string, item: RPGItem, attack?: PreparedAttack) => void;
  externalPermissions?: SheetPermissions | null;
  externalReloadSignal?: { characterId: string; timestamp: number } | null;
  initiativeRequestSignal?: number;
}

export function SheetContainer({
  characterId,
  currentUserId,
  onBack,
  onRollDice,
  onCharacterSaved,
  onNotifyItemGiven,
  externalPermissions,
  externalReloadSignal,
  initiativeRequestSignal,
}: SheetContainerProps) {
  const [character, setCharacter] = useState<FullCharacterResponse | null>(null);
  const [compendiumEntries, setCompendiumEntries] = useState<CompendiumEntryData[]>([]);
  const [customSkills, setCustomSkills] = useState<SystemSkillDefinition[]>([]);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const [selectedConditionModal, setSelectedConditionModal] = useState<ActiveCondition | null>(null);
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

  const [isNexEvolutionOpen, setIsNexEvolutionOpen] = useState(false);
  const [evoTrailId, setEvoTrailId] = useState<string>('');
  const [evoChoiceMode, setEvoChoiceMode] = useState<'class_power' | 'transcend'>('class_power');
  const [evoSelectedPowerId, setEvoSelectedPowerId] = useState<string>('');
  const [evoAttrKey, setEvoAttrKey] = useState<'agi' | 'for' | 'int' | 'pre' | 'vig'>('agi');
  const [evoAffinity, setEvoAffinity] = useState<string>('Sangue');
  const [evoUpgradeSkills, setEvoUpgradeSkills] = useState<string[]>([]);
  const [evoNewRitualId, setEvoNewRitualId] = useState<string>('');

  useEffect(() => {
    if (initiativeRequestSignal && character && character.ownerId === currentUserId) {
      setShowInitiativePrompt(true);
    }
  }, [initiativeRequestSignal]);

  useEffect(() => {
    async function loadSheetAndCompendium() {
      setIsLoading(true);
      try {
        const charData = await fetchCharacterById(characterId);

        const raw = (charData.sheetData || {}) as Record<string, any>;
        if (Array.isArray(raw.abilities)) {
          raw.abilities = raw.abilities.map((ab: CharacterAbility) => {
            if (ab.name.includes('Sangue de Ferro')) {
              return {
                ...ab,
                cost: 0,
                modifiers: [
                  { id: 'm2', targetType: 'vital_max', targetKey: 'pv', value: 2, scaleWithLevel: true },
                ],
              };
            }
            return ab;
          });
        }

        setCharacter(charData);

        const compData = (await fetchCompendium(charData.system)) as any;
        setCompendiumEntries(compData.entries || []);
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
    if (externalReloadSignal && externalReloadSignal.characterId === characterId) {
      fetchCharacterById(characterId)
        .then((freshData) => setCharacter(freshData))
        .catch((err) => console.error(err));
    }
  }, [externalReloadSignal, characterId]);

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

  const levelOrNex =
    character.system === 'ordem-paranormal'
      ? Number(rawSheet.nex ?? 5)
      : Number(rawSheet.level ?? 1);

  const bonuses = calculateActiveBonuses(
    character.system,
    levelOrNex,
    characterAbilities,
    character.inventory || [],
    activeConditions
  );

  async function handleSaveSheet(overrideChar?: FullCharacterResponse) {
    const target = overrideChar || character;
    if (!target) return;

    setIsSaving(true);
    setFeedbackMsg('');
    try {
      const updated = await updateCharacter(target.id, {
        name: target.name,
        portraitUrl: target.portraitUrl,
        vitals: target.vitals,
        sheetData: target.sheetData,
        inventory: target.inventory,
        attacks: target.attacks,
      });
      setCharacter((prev) => (prev ? { ...prev, ...updated } : updated));
      if (onCharacterSaved) {
        onCharacterSaved(target.id, target.campaignId);
      }
      setFeedbackMsg('Salvo!');
      setTimeout(() => setFeedbackMsg(''), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
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

  function handleVitalChange(barId: string, field: 'current' | 'max', newValue: number) {
    if (!character || !canEditVitals) return;

    const updatedVitals = character.vitals.map((bar) => {
      if (bar.id !== barId) return bar;
      const bonusMax = bonuses.vitalMax[bar.id] || 0;
      const effectiveMax = Math.max(1, bar.max + bonusMax);

      if (field === 'max') {
        const validMax = Math.max(1, newValue);
        return { ...bar, max: validMax };
      } else {
        const clampedCurrent = Math.max(0, Math.min(effectiveMax, newValue));
        return { ...bar, current: clampedCurrent };
      }
    });

    const nextChar = { ...character, vitals: updatedVitals };
    setCharacter(nextChar);

    if (!isEditMode) {
      handleSaveSheet(nextChar);
    }
  }

  function handleSpendResource(amount: number): boolean {
    if (!character) return false;
    const targetBarId = character.system === 'ordem-paranormal' ? 'pe' : 'pm';
    const resourceBar = character.vitals.find((b) => b.id === targetBarId);

    if (!resourceBar) return true;
    if (resourceBar.current < amount) {
      alert(`Pontos insuficientes de ${resourceBar.label}! (${resourceBar.current}/${amount})`);
      return false;
    }

    handleVitalChange(targetBarId, 'current', resourceBar.current - amount);
    return true;
  }

  function handleApplyConditionFromCompendium(entry: CompendiumEntryData) {
    const newCond: ActiveCondition = {
      id: Math.random().toString(36).substring(2, 9),
      name: entry.name,
      description: entry.description,
      modifiers: entry.modifiers || [],
    };
    const nextConditions = [...activeConditions, newCond];
    const nextChar: FullCharacterResponse = {
      ...character!,
      sheetData: { ...rawSheet, conditions: nextConditions },
    };
    setCharacter(nextChar);
    setShowMasterConditionPicker(false);
    handleSaveSheet(nextChar);
  }

  function handleRemoveCondition(condId: string) {
    const nextConditions = activeConditions.filter((c) => c.id !== condId);
    const nextChar: FullCharacterResponse = {
      ...character!,
      sheetData: { ...rawSheet, conditions: nextConditions },
    };
    setCharacter(nextChar);
    setSelectedConditionModal(null);
    handleSaveSheet(nextChar);
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
      ? getOrdemMaxLoad(strengthVal, intellectVal, rawSheet.trail, levelOrNex, 0)
      : 10 + Math.max(0, strengthVal * 2);

  const currentLoadSlots = (character.inventory || []).reduce(
    (acc, item) => acc + item.slots * (item.quantity || 1),
    0
  );
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
      .map((tp) => ({
        id: `trail-${trail.id}-${tp.nex}`,
        name: `Trilha ${trail.name} (${tp.nex}%): ${tp.name}`,
        category: 'classe',
        cost: tp.cost,
        description: tp.description,
        isActive: tp.cost === 0,
        modifiers: tp.modifiers || [],
      }));

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

  function handleApplyInterludeRecovery() {
    if (!character) return;
    const peLimit = getOrdemPeLimit(levelOrNex, rawSheet.origin, characterAbilities);
    const baseRecovery = Math.max(1, Math.floor(peLimit * interludeComfort));

    const extraPv = interludeDish === 'nutritivo' && interludeSleep ? peLimit : 0;
    const extraPe = interludeDish === 'energetico' && interludeSleep ? peLimit : 0;
    const extraSan = interludeDish === 'favorito' && interludeRelax ? 2 : 0;

    const pvGain = (interludeSleep ? baseRecovery : 0) + extraPv;
    const peGain = (interludeSleep ? baseRecovery : 0) + extraPe;
    const sanGain = (interludeRelax ? baseRecovery : 0) + extraSan;

    const updatedVitals = character.vitals.map((bar) => {
      const bonusMax = bonuses.vitalMax[bar.id] || 0;
      const effectiveMax = Math.max(1, bar.max + bonusMax);
      if (bar.id === 'pv') {
        return { ...bar, current: Math.min(effectiveMax, bar.current + pvGain) };
      }
      if (bar.id === 'pe') {
        return { ...bar, current: Math.min(effectiveMax, bar.current + peGain) };
      }
      if (bar.id === 'san') {
        return { ...bar, current: Math.min(effectiveMax, bar.current + sanGain) };
      }
      return bar;
    });

    const nextChar = { ...character, vitals: updatedVitals };
    setCharacter(nextChar);
    setIsInterludeModalOpen(false);
    handleSaveSheet(nextChar);
  }

  function handleOpenNexEvolutionModal() {
    if (!character || character.system !== 'ordem-paranormal') return;
    setEvoTrailId(rawSheet.trail || '');
    setEvoChoiceMode('class_power');
    setEvoSelectedPowerId('');
    setEvoAttrKey('agi');
    setEvoAffinity(rawSheet.affinity || 'Sangue');
    setEvoUpgradeSkills([]);
    setEvoNewRitualId('');
    setIsNexEvolutionOpen(true);
  }

  function handleConfirmNexEvolution() {
    if (!character || character.system !== 'ordem-paranormal') return;
    const currentNex = Number(rawSheet.nex ?? 5);
    const nextNex = currentNex === 0 ? 5 : currentNex === 95 ? 99 : Math.min(99, currentNex + 5);
    const milestone = ORDEM_NEX_PROGRESSION.find((m) => m.nex === nextNex);

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
      Boolean(milestone?.grantsClassPower) && evoChoiceMode === 'transcend';
    const nextTranscendedCount =
      Number(rawSheet.transcendedCount ?? 0) + (didTranscend ? 1 : 0);

    const chosenTrailId = evoTrailId || rawSheet.trail || undefined;
    let nextAbilities = [...characterAbilities];

    // Sincronizar poderes de Trilha até o novo NEX
    if (chosenTrailId && nextNex >= 10) {
      const trail = ORDEM_TRAILS.find((t) => t.id === chosenTrailId);
      if (trail) {
        nextAbilities = nextAbilities.filter(
          (ab) => !ab.id.startsWith('trail-') && !ab.name.startsWith('Trilha ')
        );
        for (const tp of trail.powers) {
          if (nextNex >= tp.nex) {
            nextAbilities.push({
              id: `trail-${trail.id}-${tp.nex}`,
              name: `Trilha ${trail.name} (${tp.nex}%): ${tp.name}`,
              category: 'classe',
              cost: tp.cost,
              description: tp.description,
              isActive: tp.cost === 0,
              modifiers: tp.modifiers || [],
            });
          }
        }
      }
    }

    // Adicionar Poder de Classe ou Poder Paranormal (Transcender)
    if (milestone?.grantsClassPower && evoSelectedPowerId) {
      const pEntry =
        compendiumEntries.find((e) => e.id === evoSelectedPowerId) ||
        ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === evoSelectedPowerId);
      if (pEntry) {
        nextAbilities.push({
          id: `nex-${nextNex}-${pEntry.id}`,
          name: pEntry.name,
          category: 'poder',
          cost: pEntry.cost,
          description: pEntry.description,
          isActive: pEntry.cost === 0,
          modifiers: pEntry.modifiers || [],
        });
      }
    }

    // Adicionar Novo Ritual aprendido (Ocultista aprende +1 ritual a cada NEX)
    if (evoNewRitualId) {
      const rEntry =
        compendiumEntries.find((e) => e.id === evoNewRitualId) ||
        ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === evoNewRitualId);
      if (rEntry) {
        nextAbilities.push({
          id: `rit-nex-${nextNex}-${rEntry.id}`,
          name: rEntry.name,
          category: 'ritual',
          cost: rEntry.cost,
          description: rEntry.description,
          damageFormula: rEntry.metadata?.damageFormula,
          isActive: false,
          modifiers: rEntry.modifiers || [],
        });
      }
    }

    // Atualizar grau de treinamento de perícias (35% Veterano +10, 70% Expert +15)
    const targetDegree: 10 | 15 = nextNex >= 70 ? 15 : 10;
    const nextSkills = Array.isArray(rawSheet.skills)
      ? rawSheet.skills.map((sk: any) =>
          milestone?.grantsTrainingUpgrade && evoUpgradeSkills.includes(sk.id)
            ? { ...sk, trainingDegree: targetDegree }
            : sk
        )
      : [];

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
      character.inventory || [],
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

    const nextChar: FullCharacterResponse = {
      ...character,
      vitals: updatedVitals,
      sheetData: {
        ...rawSheet,
        nex: nextNex,
        trail: chosenTrailId,
        affinity: milestone?.grantsAffinity ? evoAffinity : rawSheet.affinity,
        transcendedCount: nextTranscendedCount,
        attributes: nextAttributes,
        skills: nextSkills,
        abilities: nextAbilities,
      },
    };

    setCharacter(nextChar);
    setIsNexEvolutionOpen(false);
    handleSaveSheet(nextChar);
  }

  const availableConditions = compendiumEntries.filter((e) => e.category === 'condition');

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
      {/* MODAL DE CONVOCAÇÃO DE INICIATIVA ENVIADO PELO MESTRE */}
      {showInitiativePrompt && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-zinc-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="text-5xl animate-bounce">⚔️</div>
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
                onRollDice(
                  character.name,
                  character.system,
                  'Teste de Iniciativa',
                  initDiceCount,
                  20,
                  initTotalBonus,
                  false,
                  true,
                  character.id
                );
              }}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-extrabold transition cursor-pointer shadow-lg shadow-amber-900/40"
            >
              🎲 Rolar Iniciativa ({initDiceCount}d20
              {initTotalBonus >= 0 ? `+${initTotalBonus}` : initTotalBonus})
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE PASSAR ITEM PARA ALIADO DA MESA (ETAPA 4E - COM SELETOR DE QUANTIDADE) */}
      {itemToTradeModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
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
                    🤝 Passar Item para Aliado
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
                      🛡️ {ally.name} (Jogador: @{ally.owner.username})
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
                {isTransferring ? 'Entregando...' : `🤝 Entregar (${tradeQuantity}x)`}
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
                <span className="text-xl">🩸</span>
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
                      ⚡ {m.targetType} [{m.targetKey}]: {m.value >= 0 ? `+${m.value}` : m.value}
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
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-md cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-zinc-900 border-2 border-amber-500/80 rounded-3xl p-4 max-w-2xl w-full flex flex-col items-center gap-3 shadow-2xl"
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
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col lg:flex-row gap-6 items-center lg:items-stretch shadow-xl">
        {/* Coluna Esquerda: Retrato Grande do Personagem */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          {character.portraitUrl ? (
            <div
              onClick={() => setIsPortraitZoomOpen(true)}
              title="Clique para ampliar o retrato do personagem"
              className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-2xl shadow-black/70 bg-zinc-950 cursor-zoom-in group relative"
            >
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute bottom-2 right-2 bg-black/75 text-amber-400 border border-amber-500/50 px-2 py-0.5 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                🔍 Ampliar
              </span>
            </div>
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-2xl bg-zinc-950 border-2 border-dashed border-amber-500/40 flex flex-col items-center justify-center gap-2 text-amber-400 shadow-inner">
              <span className="text-5xl font-extrabold">
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
                  <button
                    onClick={onBack}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    ← Voltar
                  </button>

                  <span className="text-[10px] font-mono uppercase bg-amber-950/60 text-amber-400 border border-amber-800/60 px-2.5 py-1 rounded-md font-bold">
                    {character.system}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {campaign ? `Mesa: ${campaign.name}` : 'Ficha Livre no Cofre'}
                  </span>
                  {isLockedByMaster && (
                    <span className="text-[10px] font-mono uppercase bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">
                      🔒 Travada pelo Mestre
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
                      className="bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-xl font-extrabold text-white"
                    />
                  ) : (
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {character.name}
                    </h2>
                  )}

                  {activeConditions.map((cond) => (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setSelectedConditionModal(cond)}
                      title="Clique para ver os detalhes desta condição"
                      className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow"
                    >
                      <span>🩸 {cond.name}</span>
                      <span className="text-[10px] text-red-400 ml-0.5">ⓘ</span>
                    </button>
                  ))}

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
                  <span className="text-xs font-bold text-emerald-400 animate-pulse">
                    ✓ {feedbackMsg}
                  </span>
                )}

                <button
                  type="button"
                  disabled={isLockedByMaster}
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isLockedByMaster
                      ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      : isEditMode
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  }`}
                >
                  {isEditMode ? '🎲 Voltar ao Modo Jogo' : '✏️ Entrar no Modo Edição'}
                </button>

                {isEditMode && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveSheet()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {isSaving ? 'Salvando...' : '💾 Salvar Ficha'}
                  </button>
                )}
              </div>
            </div>

            {canMasterControl && showMasterConditionPicker && (
              <div className="bg-zinc-950 border border-red-900/60 p-3.5 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-red-400">
                    👑 Controle do Mestre: Escolha uma condição para aplicar ao personagem
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

          {/* Barras Vitais integradas ao lado do Retrato Grande */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {character.vitals.map((bar) => {
              const bonusMax = bonuses.vitalMax[bar.id] || 0;
              const effectiveMax = Math.max(1, bar.max + bonusMax);
              const percent = Math.max(0, Math.min(100, (bar.current / effectiveMax) * 100));

              return (
                <div
                  key={bar.id}
                  className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between gap-2.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      {bar.label}
                      {character.system === 'ordem-paranormal' && bar.id === 'san' && (
                        bar.current <= 0 ? (
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 animate-pulse"
                            title="Diplomacia ou Religião DT 20 em até 3 rodadas para acalmar!"
                          >
                            🔴 ENLOUQUECENDO
                          </span>
                        ) : bar.current <= Math.floor(effectiveMax / 2) ? (
                          <button
                            type="button"
                            onClick={() => {
                              const effect =
                                ORDEM_INSANITY_EFFECTS[
                                  Math.floor(Math.random() * ORDEM_INSANITY_EFFECTS.length)
                                ];
                              setInsanityEffectText(effect);
                            }}
                            className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 hover:bg-amber-900 cursor-pointer"
                            title="Clique para sortear um Efeito de Insanidade (Tabela 5.1 - 1d20)"
                          >
                            🟡 PERTURBADO (🎲 1d20)
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            🟢 São
                          </span>
                        )
                      )}
                    </span>
                    {isEditMode && canEditVitals ? (
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <input
                          type="number"
                          value={bar.current}
                          onChange={(e) => handleVitalChange(bar.id, 'current', Number(e.target.value))}
                          className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-center text-white"
                        />
                        <span>/</span>
                        <input
                          type="number"
                          value={bar.max}
                          onChange={(e) => handleVitalChange(bar.id, 'max', Number(e.target.value))}
                          className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-center text-white"
                        />
                        {bonusMax !== 0 && (
                          <span className="text-emerald-400">({bonusMax > 0 ? `+${bonusMax}` : bonusMax})</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-sm font-bold text-white">
                          {bar.current} / {effectiveMax}
                        </span>
                        {bonusMax !== 0 && (
                          <span className="text-[10px] font-mono text-emerald-400">
                            ({bonusMax > 0 ? `+${bonusMax}` : bonusMax} poder)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-full h-3.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${percent}%`, backgroundColor: bar.color }}
                    />
                  </div>

                  {canEditVitals && (
                    <div className="flex justify-between gap-1 mt-0.5">
                      {[-5, -1, +1, +5].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => handleVitalChange(bar.id, 'current', bar.current + delta)}
                          className={`flex-1 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                            delta < 0
                              ? 'bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-900/50'
                              : 'bg-emerald-950/50 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-900/50'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL DE EFEITO DE INSANIDADE (TABELA 5.1, 1d20) */}
      {insanityEffectText && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-purple-500 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                  🧠 Estado Perturbado • Tabela 5.1 (1d20)
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
                🎲 Rolar Novamente (1d20)
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
      {isInterludeModalOpen && character.system === 'ordem-paranormal' && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-indigo-500/60 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  🌙 Regras Oficiais de Investigação (p. 92–93)
                </span>
                <h3 className="text-lg font-black text-white">Cena de Interlúdio & Descanso</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInterludeModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                  1. Condição de Conforto do Abrigo
                </label>
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
                      className={`py-2 px-2 rounded-lg text-xs font-bold border ${
                        interludeComfort === c.mult
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interludeSleep}
                    onChange={(e) => setInterludeSleep(e.target.checked)}
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">💤 Ação: Dormir</span>
                    <span className="text-[11px] text-zinc-400">
                      Recupera PV e PE baseados no Limite de PE ({getOrdemPeLimit(levelOrNex, rawSheet.origin, characterAbilities)} PE).
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={interludeRelax}
                    onChange={(e) => setInterludeRelax(e.target.checked)}
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">🧘 Ação: Relaxar</span>
                    <span className="text-[11px] text-zinc-400">
                      Recupera Sanidade baseada no Limite de PE.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                  🍲 Ação Opcional: Alimentar-se (Escolha um Prato)
                </label>
                <select
                  value={interludeDish}
                  onChange={(e) => setInterludeDish(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white"
                >
                  <option value="">-- Não se alimentou neste interlúdio --</option>
                  {ORDEM_INTERLUDE_DISHES.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInterludeModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyInterludeRecovery}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black"
              >
                ✨ Aplicar Recuperação de Interlúdio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EVOLUÇÃO GUIADA DE NEX (LEVEL-UP DE ORDEM PARANORMAL v1.3) */}
      {isNexEvolutionOpen && character.system === 'ordem-paranormal' && (() => {
        const currentNex = Number(rawSheet.nex ?? 5);
        const nextNex = currentNex === 0 ? 5 : currentNex === 95 ? 99 : Math.min(99, currentNex + 5);
        const milestone = ORDEM_NEX_PROGRESSION.find((m) => m.nex === nextNex);
        const classTrails = ORDEM_TRAILS.filter((t) => t.classId === rawSheet.characterClass);
        const maxCircleUnlocked = nextNex >= 85 ? 4 : nextNex >= 55 ? 3 : nextNex >= 25 ? 2 : 1;

        const allPowerEntries =
          compendiumEntries.filter((e) => e.category === 'power').length > 0
            ? compendiumEntries.filter((e) => e.category === 'power')
            : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'power');

        const classPowerOptions = allPowerEntries.filter(
          (e) =>
            !e.metadata?.requirements?.toLowerCase().includes('poder paranormal') &&
            (e.metadata?.requirements
              ?.toLowerCase()
              .includes(String(rawSheet.characterClass || '').toLowerCase()) ||
              !e.metadata?.requirements?.match(/combatente|especialista|ocultista/i))
        );

        const paranormalPowerOptions = allPowerEntries.filter((e) =>
          e.metadata?.requirements?.toLowerCase().includes('poder paranormal')
        );

        const availableRituals = (
          compendiumEntries.filter((e) => e.category === 'spell').length > 0
            ? compendiumEntries.filter((e) => e.category === 'spell')
            : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'spell')
        ).filter((r) => (r.metadata?.circle || 1) <= maxCircleUnlocked);

        return (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border-2 border-amber-500 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    ⬆️ Assistente Guiado de Evolução • Ordem Paranormal v1.3
                  </span>
                  <h3 className="text-xl font-black text-white">
                    Avançar Exposição: NEX {currentNex}% → NEX {nextNex}%
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNexEvolutionOpen(false)}
                  className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40">
                  <span className="text-[10px] font-black uppercase text-amber-300">
                    Marco de NEX {nextNex}%
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {milestone?.summary || 'Aumento automático de PV, PE e Sanidade da Classe.'}
                  </p>
                  <p className="text-xs text-zinc-300 mt-1">
                    Seus PV, PE e SAN máximos serão recalculados automaticamente de acordo com sua classe, Vigor, Presença e Origem.
                  </p>
                </div>

                {/* Escolha de Trilha em NEX 10% */}
                {(milestone?.grantsTrailChoice || (!rawSheet.trail && nextNex >= 10)) &&
                  rawSheet.characterClass !== 'mundano' && (
                    <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <label className="block text-xs font-black uppercase text-amber-400">
                        🛤️ Escolha sua Trilha de {rawSheet.characterClass} (Desbloqueia Poder de 10%)
                      </label>
                      <select
                        value={evoTrailId}
                        onChange={(e) => setEvoTrailId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white"
                      >
                        <option value="">-- Selecione sua Trilha --</option>
                        {classTrails.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} — {t.powers[0]?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                {/* Poder de Classe ou Transcender (NEX 15, 30, 45, 60, 75, 90) */}
                {milestone?.grantsClassPower && (
                  <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <label className="block text-xs font-black uppercase text-amber-400">
                      ✨ Escolha seu Poder de NEX {nextNex}% (Poder de Classe ou Transcender)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEvoChoiceMode('class_power');
                          setEvoSelectedPowerId('');
                        }}
                        className={`py-2 rounded-lg text-xs font-bold border ${
                          evoChoiceMode === 'class_power'
                            ? 'bg-amber-600 text-white border-amber-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        ⚔️ Poder de Classe (+SAN normal)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEvoChoiceMode('transcend');
                          setEvoSelectedPowerId('');
                        }}
                        className={`py-2 rounded-lg text-xs font-bold border ${
                          evoChoiceMode === 'transcend'
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        👁️ Transcender (Poder Paranormal • Sem ganho de SAN)
                      </button>
                    </div>

                    {evoChoiceMode === 'transcend' && (
                      <p className="text-[11px] text-purple-300 bg-purple-950/40 border border-purple-800/50 p-2.5 rounded-lg">
                        ⚠️ Regra Oficial (p. 114): Ao escolher <strong>Transcender</strong>, você recebe um Poder Paranormal, mas <strong>não recebe o aumento de Sanidade</strong> deste avanço de NEX.
                      </p>
                    )}

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {(evoChoiceMode === 'class_power'
                        ? classPowerOptions
                        : paranormalPowerOptions
                      ).map((pw) => {
                        const check = checkOrdemPowerRequirements(
                          pw,
                          { ...(rawSheet as OrdemSheetData), nex: nextNex },
                          characterAbilities
                        );
                        const selected = evoSelectedPowerId === pw.id;
                        return (
                          <button
                            key={pw.id}
                            type="button"
                            onClick={() => setEvoSelectedPowerId(pw.id)}
                            className={`w-full text-left p-3 rounded-lg border transition ${
                              selected
                                ? 'bg-amber-600/20 border-amber-500'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-white">{pw.name}</span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  check.met
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : 'bg-red-950 text-red-300'
                                }`}
                              >
                                {check.met ? '✓ Pré-req OK' : `Falta: ${check.missing.join(', ')}`}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1">{pw.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Aumento de Atributo (NEX 20, 50, 80, 95) */}
                {milestone?.grantsAttributeIncrease && (
                  <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <label className="block text-xs font-black uppercase text-amber-400">
                      📈 Aumento de Atributo (+1 ponto, máx. 5)
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
                            className={`py-2 rounded-lg text-xs font-black uppercase border ${
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

                {/* Grau de Treinamento (NEX 35 Veterano, NEX 70 Expert) */}
                {milestone?.grantsTrainingUpgrade && (
                  <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <label className="block text-xs font-black uppercase text-amber-400">
                      🎓 Grau de Treinamento ({nextNex >= 70 ? 'Expert +15' : 'Veterano +10'}): Selecione as perícias treinadas para aprimorar
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(rawSheet.skills || [])
                        .filter((s: any) => s.trainingDegree > 0)
                        .map((sk: any) => {
                          const picked = evoUpgradeSkills.includes(sk.id);
                          return (
                            <button
                              key={sk.id}
                              type="button"
                              onClick={() =>
                                setEvoUpgradeSkills((prev) =>
                                  prev.includes(sk.id)
                                    ? prev.filter((i) => i !== sk.id)
                                    : [...prev, sk.id]
                                )
                              }
                              className={`px-2.5 py-1 rounded text-xs font-bold border ${
                                picked
                                  ? 'bg-amber-600 text-white border-amber-400'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                              }`}
                            >
                              {sk.name}
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
                      👁️ Afinidade com Elemento Paranormal (NEX 50%)
                    </label>
                    <select
                      value={evoAffinity}
                      onChange={(e) => setEvoAffinity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-purple-500/40 text-sm text-white"
                    >
                      <option value="Sangue">🩸 Sangue</option>
                      <option value="Morte">💀 Morte</option>
                      <option value="Conhecimento">👁️ Conhecimento</option>
                      <option value="Energia">⚡ Energia</option>
                    </select>
                  </div>
                )}

                {/* Ocultista: +1 Ritual aprendido a cada novo NEX */}
                {rawSheet.characterClass === 'ocultista' && (
                  <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-purple-500/40">
                    <label className="block text-xs font-black uppercase text-purple-300">
                      🔮 Escolhido pelo Outro Lado: Escolha +1 Novo Ritual (Até {maxCircleUnlocked}º Círculo)
                    </label>
                    <select
                      value={evoNewRitualId}
                      onChange={(e) => setEvoNewRitualId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-purple-500/40 text-xs text-white"
                    >
                      <option value="">-- Selecione o ritual aprendido neste NEX --</option>
                      {availableRituals.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {r.description.slice(0, 85)}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNexEvolutionOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNexEvolution}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg"
                >
                  ✅ Confirmar Evolução para NEX {nextNex}%
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Módulos dos Sistemas */}
      {character.system === 'ordem-paranormal' && (
        <OrdemSheet
          data={character.sheetData as OrdemSheetData}
          bonuses={bonuses}
          customSkills={customSkills}
          abilities={characterAbilities}
          isOverloaded={isCharacterOverloaded}
          isEditMode={isEditMode}
          canEditAttributes={canEditAttributes}
          canEditAbilities={canEditAbilities}
          onSyncTrailAbilities={handleSyncOrdemTrailAbilities}
          onOpenNexEvolution={handleOpenNexEvolutionModal}
          onOpenInterlude={() => setIsInterludeModalOpen(true)}
          onChange={(updatedData) =>
            setCharacter((prev) => {
              if (!prev) return null;
              const prevRaw = (prev.sheetData || {}) as Record<string, any>;
              return {
                ...prev,
                sheetData: {
                  ...updatedData,
                  abilities: prevRaw.abilities || [],
                  conditions: prevRaw.conditions || [],
                } as any,
              };
            })
          }
          onRoll={(label, count, sides, mod) =>
            onRollDice(character.name, character.system, label, count, sides, mod)
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
            setCharacter((prev) => {
              if (!prev) return null;
              const prevRaw = (prev.sheetData || {}) as Record<string, any>;
              return {
                ...prev,
                sheetData: {
                  ...updatedData,
                  abilities: prevRaw.abilities || [],
                  conditions: prevRaw.conditions || [],
                } as any,
              };
            })
          }
          onRoll={(label, count, sides, mod) =>
            onRollDice(character.name, character.system, label, count, sides, mod)
          }
        />
      )}

      {/* Abas Inferiores integradas com Troca entre Jogadores */}
      <SheetExtras
        system={character.system}
        ordemSheetData={
          character.system === 'ordem-paranormal'
            ? (character.sheetData as OrdemSheetData)
            : undefined
        }
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
        onUpdateAttacks={(newAttacks) =>
          setCharacter((prev) => (prev ? { ...prev, attacks: newAttacks } : null))
        }
        onUpdateAbilities={(newAbilities) =>
          setCharacter((prev) => {
            if (!prev) return null;
            const prevRaw = (prev.sheetData || {}) as Record<string, any>;
            return {
              ...prev,
              sheetData: { ...prevRaw, abilities: newAbilities },
            };
          })
        }
        onUpdateInventory={(newInv) =>
          setCharacter((prev) => (prev ? { ...prev, inventory: newInv } : null))
        }
        onAddItemAndAttack={(newItem, newAttack) =>
          setCharacter((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              inventory: [...(prev.inventory || []), newItem],
              attacks: newAttack ? [...(prev.attacks || []), newAttack] : prev.attacks,
            };
          })
        }
        onInitiateTradeItem={handleOpenTradeModal}
        onSpendResource={handleSpendResource}
        onRoll={(label, count, sides, mod) =>
          onRollDice(character.name, character.system, label, count, sides, mod)
        }
      />
    </div>
  );
}