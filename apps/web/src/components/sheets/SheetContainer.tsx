import { useState, useEffect } from 'react';
import {
  OrdemSheetData,
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
  ORDEM_CLASSES,
  ORDEM_NEX_PROGRESSION,
  ORDEM_TRAILS,
  ORDEM_COMPENDIUM_ENTRIES,
  ORDEM_INSANITY_EFFECTS,
  ORDEM_INTERLUDE_DISHES,
  calculateOrdemBaseVitals,
  getOrdemPeLimit,
  getOrdemMaxLoad,
  checkOrdemPowerRequirements,
  getOrdemClassMilestoneSummary,
  OrdemRitualCastForm,
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
  const [evoPowerSearch, setEvoPowerSearch] = useState<string>('');
  const [evoPowerElementFilter, setEvoPowerElementFilter] = useState<string>('ALL');
  const [evoAttrKey, setEvoAttrKey] = useState<'agi' | 'for' | 'int' | 'pre' | 'vig'>('agi');
  const [evoAffinity, setEvoAffinity] = useState<string>('Sangue');
  const [evoUpgradeSkills, setEvoUpgradeSkills] = useState<string[]>([]);
  const [evoNewRitualId, setEvoNewRitualId] = useState<string>('');
  const [evoRitualSearch, setEvoRitualSearch] = useState<string>('');
  const [evoRitualElementFilter, setEvoRitualElementFilter] = useState<string>('ALL');
  const [evoRitualCircleFilter, setEvoRitualCircleFilter] = useState<number | 'ALL'>('ALL');
  const [ritualCastSummaryModal, setRitualCastSummaryModal] = useState<{
    ritualName: string;
    formLabel: string;
    peSpent: number;
    dt: number;
    ocultismoRolls: number[];
    ocultismoMod: number;
    ocultismoTotal: number;
    passed: boolean;
    failedByFiveOrMore: boolean;
    sanLost: number;
    permSanLost: number;
    effectAppliedText?: string;
  } | null>(null);

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
    if (
      externalReloadSignal &&
      (externalReloadSignal.characterId === characterId ||
        externalReloadSignal.characterId === 'ALL')
    ) {
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
  const activeSceneEffects: SceneEffect[] = Array.isArray(rawSheet.sceneEffects)
    ? rawSheet.sceneEffects
    : [];
  const tempHp = Number(rawSheet.tempHp || 0);

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
    activeSceneEffects
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

    let nextTempHp = Number(rawSheet.tempHp || 0);
    let tempHpChanged = false;

    const updatedVitals = character.vitals.map((bar) => {
      if (bar.id !== barId) return bar;
      const bonusMax = bonuses.vitalMax[bar.id] || 0;
      const effectiveMax = Math.max(1, bar.max + bonusMax);

      if (field === 'max') {
        const validMax = Math.max(1, newValue);
        return { ...bar, max: validMax };
      } else {
        let targetVal = newValue;
        // Se for dano em PV e houver PV Temporários (ex.: Consumir Manancial), desconta primeiro dos PV Temporários!
        if (barId === 'pv' && newValue < bar.current && nextTempHp > 0) {
          const damage = bar.current - newValue;
          const absorbed = Math.min(nextTempHp, damage);
          nextTempHp -= absorbed;
          const remainingDamage = damage - absorbed;
          targetVal = bar.current - remainingDamage;
          tempHpChanged = true;
        }
        const clampedCurrent = Math.max(0, Math.min(effectiveMax, targetVal));
        return { ...bar, current: clampedCurrent };
      }
    });

    const nextChar: FullCharacterResponse = {
      ...character,
      vitals: updatedVitals,
      sheetData: tempHpChanged ? { ...rawSheet, tempHp: nextTempHp } : character.sheetData,
    };
    setCharacter(nextChar);

    if (!isEditMode) {
      handleSaveSheet(nextChar);
    }
  }

  function handleEndCharacterScene() {
    if (!character) return;
    const nextChar: FullCharacterResponse = {
      ...character,
      sheetData: {
        ...rawSheet,
        tempHp: 0,
        tempPe: 0,
        sceneEffects: [],
      },
    };
    setCharacter(nextChar);
    setFeedbackMsg('🎬 Cena encerrada! Efeitos de cena e PVs temporários limpos.');
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

  function handleCastOrdemRitual(ritual: CharacterAbility, form: OrdemRitualCastForm) {
    if (!character) return;
    const peBar = character.vitals.find((b) => b.id === 'pe');
    if (peBar && peBar.current < form.totalCost) {
      alert(`PE insuficiente para conjurar ${ritual.name} (${form.label})! Necessário: ${form.totalCost} PE (Atual: ${peBar.current} PE).`);
      return;
    }

    // 1. Teste de Ocultismo — O Custo do Paranormal (DT 20 + PE gasto)
    const dt = 20 + form.totalCost;
    const intAttr = Number(rawSheet.attributes?.int ?? 1) + (bonuses.attributes['int'] || 0);
    const ocultismoSkill = (rawSheet.skills || []).find((s: any) => s.id === 'ocultismo');
    const ocultismoDice = intAttr + bonuses.skillDiceAll + (bonuses.skillDice['ocultismo'] || 0);
    const ocultismoMod =
      Number(ocultismoSkill?.trainingDegree ?? 0) +
      Number(ocultismoSkill?.otherModifier ?? 0) +
      bonuses.skillBonusAll +
      (bonuses.skillBonus['ocultismo'] || 0);

    const numD20 = ocultismoDice <= 0 ? Math.abs(ocultismoDice) + 2 : ocultismoDice;
    const ocultismoRolls: number[] = [];
    for (let i = 0; i < numD20; i++) {
      ocultismoRolls.push(Math.floor(Math.random() * 20) + 1);
    }
    const keptRoll =
      ocultismoDice <= 0 ? Math.min(...ocultismoRolls) : Math.max(...ocultismoRolls);
    const ocultismoTotal = keptRoll + ocultismoMod;

    const passed = ocultismoTotal >= dt;
    const failedByFiveOrMore = !passed && dt - ocultismoTotal >= 5;
    const sanLost = passed ? 0 : form.totalCost;
    const permSanLost = failedByFiveOrMore ? 1 : 0;

    // Dispara a rolagem oficial de Ocultismo no log da mesa para transparência (e suporte a Afortunado)
    onRollDice(
      character.name,
      character.system,
      `O Custo do Paranormal (Ocultismo DT ${dt}) — ${ritual.name} [${form.label}]`,
      Math.max(1, ocultismoDice),
      20,
      ocultismoMod
    );

    // 2. Efeitos de Cena e PV Temporários (ex.: Consumir Manancial, Armadura de Sangue, Tela de Ruído, Embaralhar)
    let nextTempHp = Number(rawSheet.tempHp || 0);
    let nextSceneEffects: SceneEffect[] = [...activeSceneEffects];
    const effectNotes: string[] = [];

    if (form.tempHpFormula) {
      const rolled = rollDiceFormulaLocally(form.tempHpFormula);
      nextTempHp += rolled.total;
      nextSceneEffects = nextSceneEffects.filter((e) => e.name !== ritual.name);
      nextSceneEffects.push({
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: ritual.name,
        source: `${form.label} (${form.tempHpFormula})`,
        description: `+${rolled.total} PV Temporários até o fim da cena (Rolagem: [${rolled.rolls.join(', ')}])`,
        tempHpGranted: rolled.total,
      });
      effectNotes.push(`🛡️ +${rolled.total} PV Temporários recebidos (${form.tempHpFormula}: [${rolled.rolls.join(', ')}])!`);
    } else if (form.tempHpFlat) {
      nextTempHp += form.tempHpFlat;
      nextSceneEffects = nextSceneEffects.filter((e) => e.name !== ritual.name);
      nextSceneEffects.push({
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: ritual.name,
        source: form.label,
        description: `+${form.tempHpFlat} PV Temporários na cena`,
        tempHpGranted: form.tempHpFlat,
      });
      effectNotes.push(`🛡️ +${form.tempHpFlat} PV Temporários recebidos!`);
    }

    if (form.sceneDefenseBonus) {
      nextSceneEffects = nextSceneEffects.filter((e) => e.name !== ritual.name);
      nextSceneEffects.push({
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: ritual.name,
        source: form.label,
        description: `+${form.sceneDefenseBonus} na Defesa durante a cena`,
        modifiers: [
          {
            id: `mod-${ritual.id}-def`,
            targetType: 'defense',
            targetKey: 'defesa',
            value: form.sceneDefenseBonus,
          },
        ],
      });
      effectNotes.push(`🛡️ +${form.sceneDefenseBonus} na Defesa ativo até o fim da cena!`);
    } else if (ritual.modifiers && ritual.modifiers.length > 0 && !form.sceneDefenseBonus) {
      nextSceneEffects = nextSceneEffects.filter((e) => e.name !== ritual.name);
      nextSceneEffects.push({
        id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: ritual.name,
        source: form.label,
        description: form.description,
        modifiers: ritual.modifiers,
      });
      effectNotes.push(`✨ Efeito de ${ritual.name} ativo na cena!`);
    }

    // Se o ritual tiver rolagem de dano/cura direta (e não for PV temporário como Consumir Manancial)
    if (form.damageFormula && !form.tempHpFormula) {
      const clean = form.damageFormula.toLowerCase().replace(/\s+/g, '');
      const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
      if (match) {
        onRollDice(
          character.name,
          character.system,
          `Efeito: ${ritual.name} (${form.label})`,
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          match[3] ? parseInt(match[3], 10) : 0
        );
      }
    }

    // 3. Atualiza PE e Sanidade (caso tenha falhado no Custo do Paranormal)
    const updatedVitals = character.vitals.map((bar) => {
      if (bar.id === 'pe') {
        return { ...bar, current: Math.max(0, bar.current - form.totalCost) };
      }
      if (bar.id === 'san' && (sanLost > 0 || permSanLost > 0)) {
        const nextMax = Math.max(1, bar.max - permSanLost);
        const nextCurr = Math.max(0, Math.min(nextMax, bar.current - sanLost));
        return { ...bar, max: nextMax, current: nextCurr };
      }
      return bar;
    });

    const nextChar: FullCharacterResponse = {
      ...character,
      vitals: updatedVitals,
      sheetData: {
        ...rawSheet,
        tempHp: nextTempHp,
        sceneEffects: nextSceneEffects,
      },
    };

    setCharacter(nextChar);
    handleSaveSheet(nextChar);

    setRitualCastSummaryModal({
      ritualName: ritual.name,
      formLabel: form.label,
      peSpent: form.totalCost,
      dt,
      ocultismoRolls,
      ocultismoMod,
      ocultismoTotal,
      passed,
      failedByFiveOrMore,
      sanLost,
      permSanLost,
      effectAppliedText: effectNotes.length > 0 ? effectNotes.join(' • ') : undefined,
    });
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
    setEvoPowerSearch('');
    setEvoPowerElementFilter('ALL');
    setEvoAttrKey('agi');
    setEvoAffinity(rawSheet.affinity || 'Sangue');
    setEvoUpgradeSkills([]);
    setEvoNewRitualId('');
    setEvoRitualSearch('');
    setEvoRitualElementFilter('ALL');
    setEvoRitualCircleFilter('ALL');
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

    // Adicionar Poder de Classe ou Poder Paranormal (Transcender / Afinidade)
    if (milestone?.grantsClassPower && evoSelectedPowerId) {
      const pEntry =
        compendiumEntries.find((e) => e.id === evoSelectedPowerId) ||
        ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === evoSelectedPowerId);
      if (pEntry) {
        const existingIdx = nextAbilities.findIndex(
          (ab) => ab.name.trim().toLowerCase() === pEntry.name.trim().toLowerCase()
        );
        if (existingIdx >= 0 && evoChoiceMode === 'transcend') {
          // Upgrade de Afinidade do Poder Paranormal
          nextAbilities[existingIdx] = {
            ...nextAbilities[existingIdx],
            name: `${pEntry.name} (Afinidade)`,
            category: 'poder_paranormal',
          };
        } else {
          nextAbilities.push({
            id: `nex-${nextNex}-${pEntry.id}`,
            name: pEntry.name,
            category:
              pEntry.category === 'paranormal_power' || evoChoiceMode === 'transcend'
                ? 'poder_paranormal'
                : 'poder',
            cost: pEntry.cost,
            description: pEntry.description,
            isActive: pEntry.cost === 0,
            modifiers: pEntry.modifiers || [],
          });
        }
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
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex flex-wrap items-center gap-1.5">
                      {bar.label}
                      {bar.id === 'pv' && tempHp > 0 && (
                        <span
                          className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/70 shadow"
                          title="Pontos de Vida Temporários da Cena (descontados primeiro ao sofrer dano!)"
                        >
                          🛡️ +{tempHp} PV Temp
                        </span>
                      )}
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

          {/* PAINEL DE EFEITOS ATIVOS NA CENA & CONTROLE DE CENA */}
          {(activeSceneEffects.length > 0 || tempHp > 0 || canMasterControl) && (
            <div className="bg-zinc-950 border border-purple-800/60 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                  ⏳ Efeitos da Cena:
                </span>
                {tempHp > 0 && (
                  <span className="px-2.5 py-1 bg-cyan-950/80 border border-cyan-600/70 text-cyan-200 rounded-lg text-xs font-bold">
                    🛡️ +{tempHp} PV Temporários ativos
                  </span>
                )}
                {activeSceneEffects.map((eff) => (
                  <span
                    key={eff.id}
                    title={eff.description}
                    className="px-2.5 py-1 bg-purple-950/80 border border-purple-600/60 text-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>✨ {eff.name} ({eff.source}): {eff.description}</span>
                  </span>
                ))}
                {activeSceneEffects.length === 0 && tempHp === 0 && (
                  <span className="text-xs text-zinc-500">
                    Nenhum efeito temporário de cena ativo no momento.
                  </span>
                )}
              </div>

              {(activeSceneEffects.length > 0 || tempHp > 0 || canMasterControl) && (
                <button
                  type="button"
                  onClick={handleEndCharacterScene}
                  className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-700 border border-purple-500/60 text-purple-100 rounded-lg text-xs font-extrabold transition cursor-pointer whitespace-nowrap"
                  title="Encerra todos os efeitos que duram 1 cena e zera os PV Temporários"
                >
                  🎬 Encerrar Cena
                </button>
              )}
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
                    🔮 {ritualCastSummaryModal.ritualName} ({ritualCastSummaryModal.formLabel}) • -{ritualCastSummaryModal.peSpent} PE
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40">
                    Teste de Ocultismo: [{ritualCastSummaryModal.ocultismoRolls.join(', ')}] + {ritualCastSummaryModal.ocultismoMod} = {ritualCastSummaryModal.ocultismoTotal} vs DT {ritualCastSummaryModal.dt}
                  </span>
                </div>
                <p className="text-xs font-bold">
                  {ritualCastSummaryModal.passed
                    ? '✅ Sucesso no Custo do Paranormal! Sua mente resistiu ao Outro Lado (0 de Sanidade perdida).'
                    : ritualCastSummaryModal.failedByFiveOrMore
                    ? `💀 Falha por 5 ou mais no Custo do Paranormal! Você perdeu ${ritualCastSummaryModal.sanLost} de Sanidade atual e -1 de Sanidade Máxima Permanente!`
                    : `⚠️ Falha no Custo do Paranormal! Você perdeu ${ritualCastSummaryModal.sanLost} pontos de Sanidade.`}
                </p>
                {ritualCastSummaryModal.effectAppliedText && (
                  <p className="text-xs text-cyan-300 font-bold">
                    {ritualCastSummaryModal.effectAppliedText}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRitualCastSummaryModal(null)}
                className="px-3 py-1 bg-black/40 hover:bg-black/70 rounded-lg text-xs font-bold self-end sm:self-center cursor-pointer"
              >
                ✕
              </button>
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

        const classPowerOptions = allPowerEntries
          .filter(
            (e) =>
              !e.metadata?.requirements?.toLowerCase().includes('poder paranormal') &&
              (e.metadata?.requirements
                ?.toLowerCase()
                .includes(String(rawSheet.characterClass || '').toLowerCase()) ||
                !e.metadata?.requirements?.match(/combatente|especialista|ocultista/i))
          )
          .filter(
            (e) =>
              !evoPowerSearch.trim() ||
              e.name.toLowerCase().includes(evoPowerSearch.toLowerCase()) ||
              e.description.toLowerCase().includes(evoPowerSearch.toLowerCase())
          )
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        const rawParanormalPowers =
          compendiumEntries.filter((e) => e.category === 'paranormal_power').length > 0
            ? compendiumEntries.filter((e) => e.category === 'paranormal_power')
            : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'paranormal_power');

        const paranormalPowerOptions = rawParanormalPowers
          .filter(
            (e) =>
              evoPowerElementFilter === 'ALL' ||
              (e.metadata?.element || '').toLowerCase() === evoPowerElementFilter.toLowerCase()
          )
          .filter(
            (e) =>
              !evoPowerSearch.trim() ||
              e.name.toLowerCase().includes(evoPowerSearch.toLowerCase()) ||
              e.description.toLowerCase().includes(evoPowerSearch.toLowerCase())
          )
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        const allRitualsUpToCircle = (
          compendiumEntries.filter((e) => e.category === 'spell').length > 0
            ? compendiumEntries.filter((e) => e.category === 'spell')
            : ORDEM_COMPENDIUM_ENTRIES.filter((e) => e.category === 'spell')
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
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        const classSpecificSummary = getOrdemClassMilestoneSummary(
          rawSheet.characterClass || 'combatente',
          nextNex,
          activeTrailId
        );

        const effectiveCharAffinity = milestone?.grantsAffinity
          ? evoAffinity
          : rawSheet.affinity;

        return (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border-2 border-amber-500 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="px-6 py-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    ⬆️ Assistente Guiado de Evolução • Ordem Paranormal v1.3
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

                {/* Escolha de Trilha em NEX 10% COM DETALHAMENTO COMPLETO DOS PODERES */}
                {(milestone?.grantsTrailChoice || (!rawSheet.trail && nextNex >= 10)) &&
                  rawSheet.characterClass !== 'mundano' && (
                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-amber-500/40">
                      <label className="block text-xs font-black uppercase text-amber-400">
                        🛤️ Escolha sua Trilha de {clsObj.name} (Desbloqueia o Poder de 10% agora)
                      </label>
                      <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                        {classTrails.map((t) => {
                          const isSelected = evoTrailId === t.id;
                          const p10 = t.powers.find((p) => p.nex === 10);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setEvoTrailId(t.id)}
                              className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${
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
                              <p className="text-xs text-zinc-400 mt-1">{t.description}</p>
                              {p10 && (
                                <div className="mt-2 p-2.5 rounded-lg bg-zinc-950 border border-amber-500/30">
                                  <span className="block text-[11px] font-black text-amber-300">
                                    ⚡ Poder de 10% — {p10.name} {p10.cost > 0 ? `(${p10.cost} PE)` : '(Passivo)'}:
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

                {/* Detalhamento do Poder de Trilha Desbloqueado em NEX 40%, 65% ou 99% */}
                {unlockedTrailPowerAtThisNex && nextNex > 10 && selectedTrailObj && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        🛤️ Novo Poder da Trilha {selectedTrailObj.name} Desbloqueado ({nextNex}%)
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
                        className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
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
                        className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                          evoChoiceMode === 'transcend'
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        👁️ Transcender (Poder Paranormal • Sem ganho de SAN)
                      </button>
                    </div>

                    {evoChoiceMode === 'transcend' && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-purple-300 bg-purple-950/40 border border-purple-800/50 p-2.5 rounded-lg">
                          ⚠️ Regra Oficial (p. 114): Ao escolher <strong>Transcender</strong>, você recebe um Poder Paranormal, mas <strong>não recebe o aumento de Sanidade</strong> deste avanço de NEX.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                            <button
                              key={el}
                              type="button"
                              onClick={() => setEvoPowerElementFilter(el)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                evoPowerElementFilter === el
                                  ? 'bg-purple-600 border-purple-400 text-white'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                              }`}
                            >
                              {el === 'ALL' ? 'Todos Elementos' : el}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <input
                      type="text"
                      value={evoPowerSearch}
                      onChange={(e) => setEvoPowerSearch(e.target.value)}
                      placeholder="🔎 Pesquisar poder por nome ou efeito..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-amber-500"
                    />

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {(evoChoiceMode === 'class_power'
                        ? classPowerOptions
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
                        const selected = evoSelectedPowerId === pw.id;

                        return (
                          <button
                            key={pw.id}
                            type="button"
                            disabled={isBlockedDuplicate}
                            onClick={() => setEvoSelectedPowerId(pw.id)}
                            className={`w-full text-left p-3 rounded-lg border transition ${
                              isBlockedDuplicate
                                ? 'bg-zinc-950 border-zinc-800/50 opacity-50 cursor-not-allowed'
                                : selected
                                ? 'bg-amber-600/20 border-amber-500 cursor-pointer'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{pw.name}</span>
                                {pw.metadata?.element && (
                                  <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">
                                    {pw.metadata.element}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isBlockedDuplicate ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                    ✓ Já possui na ficha
                                  </span>
                                ) : canUpgradeAffinity ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900 text-purple-200 border border-purple-500">
                                    👁️ Desbloquear Afinidade
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
                        🎓 Grau de Treinamento ({nextNex >= 70 ? 'Expert +15' : 'Veterano +10'}): Escolha até {maxSkillUpgrades} perícias ({clsObj.trainingUpgradeBase} da classe + {Math.max(0, effIntForTraining)} INT)
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

                {/* Ocultista: +1 Ritual aprendido a cada novo NEX COM FILTRO E DETALHES COMPLETOS */}
                {rawSheet.characterClass === 'ocultista' && (
                  <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-purple-500/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-black uppercase text-purple-300">
                        🔮 Escolhido pelo Outro Lado: Escolha +1 Novo Ritual (Até {maxCircleUnlocked}º Círculo)
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
                        placeholder="🔎 Pesquisar ritual por nome ou efeito..."
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
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                            evoRitualElementFilter === el
                              ? 'bg-amber-600 border-amber-400 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          {el === 'ALL' ? 'Todos Elementos' : el}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {allRitualsUpToCircle.map((r) => {
                        const alreadyKnown = characterAbilities.some(
                          (ab) => ab.name.trim().toLowerCase() === r.name.trim().toLowerCase()
                        );
                        const isPicked = evoNewRitualId === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={alreadyKnown}
                            onClick={() => setEvoNewRitualId(r.id)}
                            className={`w-full text-left p-3 rounded-xl border transition ${
                              alreadyKnown
                                ? 'bg-zinc-950 border-zinc-800/50 opacity-50 cursor-not-allowed'
                                : isPicked
                                ? 'bg-purple-600/20 border-purple-400 ring-1 ring-purple-400/40 cursor-pointer'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">
                                  {isPicked ? '✓ ' : ''}
                                  {r.name}
                                </span>
                                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded">
                                  {r.metadata?.circle || 1}º Círculo • {r.metadata?.element || 'Paranormal'}
                                </span>
                                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                                  {r.cost} PE
                                </span>
                                {r.metadata?.damageFormula && (
                                  <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded">
                                    🎲 {r.metadata.damageFormula}
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

              <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNexEvolutionOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNexEvolution}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
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
                  tempHp: prevRaw.tempHp || 0,
                  tempPe: prevRaw.tempPe || 0,
                  sceneEffects: prevRaw.sceneEffects || [],
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
                  tempHp: prevRaw.tempHp || 0,
                  tempPe: prevRaw.tempPe || 0,
                  sceneEffects: prevRaw.sceneEffects || [],
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
        onCastOrdemRitual={handleCastOrdemRitual}
        onRoll={(label, count, sides, mod) =>
          onRollDice(character.name, character.system, label, count, sides, mod)
        }
      />
    </div>
  );
}