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

  const maxLoadSlots =
    character.system === 'ordem-paranormal'
      ? Math.max(2, strengthVal * 5)
      : 10 + Math.max(0, strengthVal * 2);

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
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      {bar.label}
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

      {/* Módulos dos Sistemas */}
      {character.system === 'ordem-paranormal' && (
        <OrdemSheet
          data={character.sheetData as OrdemSheetData}
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