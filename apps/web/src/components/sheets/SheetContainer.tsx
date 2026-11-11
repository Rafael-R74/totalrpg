import { useState, useEffect } from 'react';
import {
  VitalBar,
  OrdemSheetData,
  T20SheetData,
  SystemId,
  CharacterAbility,
} from '@totalrpg/shared';
import {
  FullCharacterResponse,
  fetchCharacterById,
  updateCharacter,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    async function loadSheet() {
      setIsLoading(true);
      try {
        const data = await fetchCharacterById(characterId);
        setCharacter(data);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadSheet();
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

  const isLockedByMaster = !isFreeVault && !isDM && Boolean(campaign?.lockAllSheets);
  const canEditVitals = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditVitals));
  const canEditAttributes = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditAttributes));
  const canEditAbilities = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditAbilities));
  const canEditInventory = isFreeVault || isDM || (!isLockedByMaster && Boolean(campaign?.allowEditInventory));

  // Salva o estado completo da ficha no banco SQLite
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
      if (field === 'max') {
        const validMax = Math.max(1, newValue);
        return { ...bar, max: validMax, current: Math.min(bar.current, validMax) };
      } else {
        const clampedCurrent = Math.max(0, Math.min(bar.max, newValue));
        return { ...bar, current: clampedCurrent };
      }
    });

    const nextChar = { ...character, vitals: updatedVitals };
    setCharacter(nextChar);

    if (!isEditMode) {
      handleSaveSheet(nextChar);
    }
  }

  // Desconta PE (Ordem) ou PM (Tormenta 20) automaticamente ao usar poder/ritual/magia
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

  // Calcula a capacidade máxima de carga conforme a Força do sistema
  const rawSheet = (character.sheetData || {}) as Record<string, any>;
  const strengthVal =
    character.system === 'ordem-paranormal'
      ? Number(rawSheet.attributes?.for ?? 1)
      : Number(rawSheet.attributes?.forca ?? 1);

  const maxLoadSlots =
    character.system === 'ordem-paranormal'
      ? Math.max(2, strengthVal * 5)
      : 10 + Math.max(0, strengthVal * 2);

  const characterAbilities: CharacterAbility[] = Array.isArray(rawSheet.abilities)
    ? rawSheet.abilities
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho de Controle da Ficha */}
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            ← Voltar
          </button>

          <div>
            {isEditMode && canEditAttributes ? (
              <input
                type="text"
                value={character.name}
                onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-lg font-bold text-white"
              />
            ) : (
              <h2 className="text-2xl font-extrabold text-white">{character.name}</h2>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono uppercase bg-amber-950/60 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded">
                {character.system}
              </span>
              <span className="text-xs text-zinc-400">
                {campaign ? `Mesa: ${campaign.name}` : 'Ficha Livre no Cofre'}
              </span>
              {isLockedByMaster && (
                <span className="text-xs bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-semibold">
                  🔒 Travada pelo Mestre
                </span>
              )}
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

      {/* Barras Vitais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {character.vitals.map((bar) => {
          const percent = Math.max(0, Math.min(100, (bar.current / bar.max) * 100));
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
                  </div>
                ) : (
                  <span className="font-mono text-sm font-bold text-white">
                    {bar.current} / {bar.max}
                  </span>
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

      {/* Módulo Específico do Sistema (Ordem ou Tormenta 20) */}
      {character.system === 'ordem-paranormal' && (
        <OrdemSheet
          data={character.sheetData as OrdemSheetData}
          isEditMode={isEditMode}
          canEditAttributes={canEditAttributes}
          canEditAbilities={canEditAbilities}
          onChange={(updatedData) =>
            setCharacter({
              ...character,
              sheetData: { ...updatedData, abilities: characterAbilities } as any,
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
          isEditMode={isEditMode}
          canEditAttributes={canEditAttributes}
          canEditAbilities={canEditAbilities}
          onChange={(updatedData) =>
            setCharacter({
              ...character,
              sheetData: { ...updatedData, abilities: characterAbilities } as any,
            })
          }
          onRoll={(label, count, sides, mod) =>
            onRollDice(character.name, character.system, label, count, sides, mod)
          }
        />
      )}

      {/* Abas Inferiores: Ataques, Poderes/Rituais e Inventário */}
      <SheetExtras
        system={character.system}
        isEditMode={isEditMode}
        canEditInventory={canEditInventory}
        canEditAbilities={canEditAbilities}
        attacks={character.attacks || []}
        abilities={characterAbilities}
        inventory={character.inventory || []}
        maxLoadSlots={maxLoadSlots}
        onUpdateAttacks={(newAttacks) => setCharacter({ ...character, attacks: newAttacks })}
        onUpdateAbilities={(newAbilities) =>
          setCharacter({
            ...character,
            sheetData: { ...rawSheet, abilities: newAbilities },
          })
        }
        onUpdateInventory={(newInv) => setCharacter({ ...character, inventory: newInv })}
        onSpendResource={handleSpendResource}
        onRoll={(label, count, sides, mod) =>
          onRollDice(character.name, character.system, label, count, sides, mod)
        }
      />
    </div>
  );
}