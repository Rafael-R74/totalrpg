import { useState, useEffect } from 'react';
import {
  OrdemSheetData,
  T20SheetData,
  SystemId,
  CharacterAbility,
  ActiveCondition,
  CompendiumEntryData,
  SystemSkillDefinition,
  calculateActiveBonuses,
} from '@totalrpg/shared';
import {
  FullCharacterResponse,
  fetchCharacterById,
  updateCharacter,
  fetchCompendium,
} from '../../services/api';
import { OrdemSheet } from './OrdemSheet';
import { TormentaSheet } from './TormentaSheet';
import { SheetExtras } from './SheetExtras';

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
    modifier: number
  ) => void;
}

export function SheetContainer({
  characterId,
  currentUserId,
  onBack,
  onRollDice,
}: SheetContainerProps) {
  const [character, setCharacter] = useState<FullCharacterResponse | null>(null);
  const [compendiumEntries, setCompendiumEntries] = useState<CompendiumEntryData[]>([]);
  const [customSkills, setCustomSkills] = useState<SystemSkillDefinition[]>([]);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Estados dos Modais de Condição (Explicação ao clicar e Seletor do Mestre)
  const [selectedConditionModal, setSelectedConditionModal] = useState<ActiveCondition | null>(null);
  const [showMasterConditionPicker, setShowMasterConditionPicker] = useState(false);

  useEffect(() => {
    async function loadSheetAndCompendium() {
      setIsLoading(true);
      try {
        const charData = await fetchCharacterById(characterId);

        // Repara automaticamente o Sangue de Ferro se já estava salvo na ficha com o valor antigo (10 fixo)
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

        const compData = await fetchCompendium(charData.system) as any;
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
        vitals: target.vitals,
        sheetData: target.sheetData,
        inventory: target.inventory,
        attacks: target.attacks,
      });
      setCharacter((prev) => (prev ? { ...prev, ...updated } : updated));
      setFeedbackMsg('Salvo!');
      setTimeout(() => setFeedbackMsg(''), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
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

  // Aplica ou remove Condições (Exclusivo do Mestre / Admin)
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

  return (
    <div className="flex flex-col gap-6">
      {/* MODAL EXPLICATIVO DE CONDIÇÃO (Abre ao clicar na tag da condição ao lado do nome) */}
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

      {/* Cabeçalho da Ficha com Condições Expostas ao Lado do Nome */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              ← Voltar
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                {isEditMode && canEditAttributes ? (
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) =>
                      setCharacter((prev) => (prev ? { ...prev, name: e.target.value } : null))
                    }
                    className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-lg font-bold text-white"
                  />
                ) : (
                  <h2 className="text-2xl font-extrabold text-white">{character.name}</h2>
                )}

                {/* Condições Expostas ao Lado do Nome (Clicáveis para abrir o Modal Explicativo!) */}
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

                {/* Botão exclusivo do Mestre/Admin para aplicar condição */}
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

              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono uppercase bg-amber-950/60 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded">
                  {character.system}
                </span>
                <span className="text-xs text-zinc-400">
                  {campaign ? `Mesa: ${campaign.name}` : 'Ficha Livre no Cofre'}
                </span>
              </div>
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

        {/* Gaveta Rápida do Mestre para Aplicar Condições */}
        {canMasterControl && showMasterConditionPicker && (
          <div className="bg-zinc-950 border border-red-900/60 p-3.5 rounded-xl flex flex-col gap-2 mt-1">
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

      {/* Barras Vitais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {character.vitals.map((bar) => {
          const bonusMax = bonuses.vitalMax[bar.id] || 0;
          const effectiveMax = Math.max(1, bar.max + bonusMax);
          const percent = Math.max(0, Math.min(100, (bar.current / effectiveMax) * 100));

          return (
            <div
              key={bar.id}
              className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col gap-2"
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
                      className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-center text-white"
                    />
                    <span>/</span>
                    <input
                      type="number"
                      value={bar.max}
                      onChange={(e) => handleVitalChange(bar.id, 'max', Number(e.target.value))}
                      className="w-12 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-center text-white"
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

              <div className="w-full h-3.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${percent}%`, backgroundColor: bar.color }}
                />
              </div>

              {canEditVitals && (
                <div className="flex justify-between gap-1 mt-1">
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

      {/* Módulos dos Sistemas (Usando atualização funcional segura prev => ...) */}
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

      {/* Abas Inferiores com Busca Contextual e Atualização Funcional */}
      <SheetExtras
        system={character.system}
        bonuses={bonuses}
        compendiumEntries={compendiumEntries}
        isEditMode={isEditMode}
        canEditInventory={canEditInventory}
        canEditAbilities={canEditAbilities}
        canCreateCustom={canMasterControl}
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
        onSpendResource={handleSpendResource}
        onRoll={(label, count, sides, mod) =>
          onRollDice(character.name, character.system, label, count, sides, mod)
        }
      />
    </div>
  );
}