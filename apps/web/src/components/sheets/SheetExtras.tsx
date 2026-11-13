import { useState } from 'react';
import {
  SystemId,
  PreparedAttack,
  CharacterAbility,
  RPGItem,
  CompendiumEntryData,
  ComputedBonuses,
} from '@totalrpg/shared';

interface SheetExtrasProps {
  system: SystemId;
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
  onUpdateAttacks: (attacks: PreparedAttack[]) => void;
  onUpdateAbilities: (abilities: CharacterAbility[]) => void;
  onUpdateInventory: (inventory: RPGItem[]) => void;
  onAddItemAndAttack: (newItem: RPGItem, newAttack?: PreparedAttack) => void;
  onInitiateTradeItem?: (item: RPGItem) => void;
  onSpendResource: (amount: number) => boolean;
  onRoll: (label: string, count: number, sides: number, modifier: number, isDamage?: boolean) => void;
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

export function SheetExtras({
  system,
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
  onUpdateAttacks,
  onUpdateAbilities,
  onUpdateInventory,
  onAddItemAndAttack,
  onInitiateTradeItem,
  onSpendResource,
  onRoll,
}: SheetExtrasProps) {
  const [activeSubTab, setActiveSubTab] = useState<'combat' | 'powers' | 'spells' | 'inventory'>('combat');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'compendium' | 'custom'>('compendium');
  const [searchQuery, setSearchQuery] = useState('');

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

  const resourceLabel = system === 'ordem-paranormal' ? 'PE' : 'PM';
  const spellLabel = system === 'ordem-paranormal' ? 'Ritual' : 'Magia';
  const spellPluralLabel = system === 'ordem-paranormal' ? 'Rituais' : 'Magias';

  const allowInv = isEditMode && canEditInventory;
  const allowAb = isEditMode && canEditAbilities;

  const effectiveMaxSlots = maxLoadSlots + bonuses.loadLimit;
  const currentLoad = inventory.reduce((acc, item) => acc + item.slots * (item.quantity || 1), 0);
  const isOverloaded = currentLoad > effectiveMaxSlots;

  const powerList = abilities.filter((ab) => ab.category !== 'ritual' && ab.category !== 'magia');
  const spellList = abilities.filter((ab) => ab.category === 'ritual' || ab.category === 'magia');

  function openAddModal() {
    setSearchQuery('');
    setModalMode(activeSubTab === 'combat' ? 'custom' : 'compendium');
    setIsAddModalOpen(true);
  }

  function handleSelectFromCompendium(entry: CompendiumEntryData) {
    const newId = Math.random().toString(36).substring(2, 9);

    if (entry.category === 'power' || entry.category === 'spell' || entry.category === 'origin') {
      const isPassive = entry.cost === 0 && !entry.metadata?.damageFormula;
      const newAb: CharacterAbility = {
        id: newId,
        name: entry.name,
        category: entry.category === 'spell' ? (system === 'ordem-paranormal' ? 'ritual' : 'magia') : 'poder',
        cost: entry.cost,
        description: entry.description,
        damageFormula: entry.metadata?.damageFormula,
        isActive: isPassive ? true : false,
        modifiers: entry.modifiers || [],
      };
      onUpdateAbilities([...abilities, newAb]);
      setIsAddModalOpen(false);
    } else if (entry.category === 'item') {
      const newItem: RPGItem = {
        id: newId,
        name: entry.name,
        slots: entry.metadata?.slots ?? 1,
        quantity: 1,
        isEquipped: true,
        description: entry.description,
        modifiers: entry.modifiers || [],
      };

      let newAtk: PreparedAttack | undefined = undefined;
      if (entry.metadata?.damageFormula) {
        newAtk = {
          id: Math.random().toString(36).substring(2, 9),
          name: entry.name,
          diceCount: 1,
          attackBonus: 5,
          damageFormula: entry.metadata.damageFormula,
          critRange: entry.metadata.critRange || '20/x2',
          damageType: 'Arma',
        };
      }

      onAddItemAndAttack(newItem, newAtk);
      setIsAddModalOpen(false);
    }
  }

  function handleAddAttack(e: React.FormEvent) {
    e.preventDefault();
    if (!atkName.trim()) return;
    onUpdateAttacks([
      ...attacks,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: atkName.trim(),
        diceCount: atkDice,
        attackBonus: atkBonus,
        damageFormula: atkDamage.trim() || '1d6',
        critRange: atkCrit.trim() || '20/x2',
        damageType: 'Impacto',
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
    onUpdateInventory([
      ...inventory,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: itemName.trim(),
        slots: Math.max(0, itemSlots),
        quantity: Math.max(1, itemQty),
        isEquipped: true,
        modifiers: [],
      },
    ]);
    setItemName('');
    setItemSlots(1);
    setItemQty(1);
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
    } else if (ab.cost > 0) {
      onRoll(`Ativou: ${ab.name} (-${ab.cost} ${resourceLabel})`, 1, 20, 0, true);
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

  const modalCompendiumList = compendiumEntries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeSubTab === 'powers') return entry.category === 'power' || entry.category === 'origin';
    if (activeSubTab === 'spells') return entry.category === 'spell';
    if (activeSubTab === 'inventory') return entry.category === 'item';
    return false;
  });

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
                <h3 className="text-lg font-extrabold text-amber-500">
                  {activeSubTab === 'powers' && '📚 Adicionar Poder à Ficha'}
                  {activeSubTab === 'spells' && `🔮 Adicionar ${spellLabel} à Ficha`}
                  {activeSubTab === 'inventory' && '🎒 Adicionar Item ou Arma'}
                  {activeSubTab === 'combat' && '⚔️ Criar Ataque Personalizado'}
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
                  📚 Catálogo do Compêndio
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('custom')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    modalMode === 'custom' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  🛠️ Criar Personalizado (Mestre/Admin)
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
                  placeholder="🔍 Digite o nome ou efeito para filtrar..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />

                <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[420px]">
                  {modalCompendiumList.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      Nenhum registro encontrado no Compêndio para esta categoria.
                    </div>
                  ) : (
                    modalCompendiumList.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-3.5 rounded-xl flex justify-between items-center gap-4 transition"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-white">{entry.name}</span>
                            {entry.cost > 0 && (
                              <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                                {entry.cost} {resourceLabel}
                              </span>
                            )}
                            {entry.metadata?.damageFormula && (
                              <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded">
                                🎲 {entry.metadata.damageFormula}
                              </span>
                            )}
                            {entry.category === 'item' && (
                              <span className="text-[10px] font-mono text-zinc-500">
                                ({entry.metadata?.slots ?? 1} esp.)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">{entry.description}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectFromCompendium(entry)}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shadow"
                        >
                          + Adicionar
                        </button>
                      </div>
                    ))
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
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
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

      {/* BARRA DE SUB-ABAS COM BOTÃO DE ADICIONAR NA EXTREMA DIREITA */}
      <div className="flex flex-wrap justify-between items-center border-b border-zinc-800 gap-4 pb-2">
        <div className="flex flex-wrap gap-6">
          <button
            type="button"
            onClick={() => setActiveSubTab('combat')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'combat'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚔️ Ataques ({attacks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('powers')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'powers'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ✨ Poderes ({powerList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('spells')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'spells'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔮 {spellPluralLabel} ({spellList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeSubTab === 'inventory'
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🎒 Inventário ({currentLoad}/{effectiveMaxSlots})
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
          {attacks.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum ataque preparado. Adicione uma arma na aba &quot;🎒 Inventário&quot; para gerar seu ataque automaticamente!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attacks.map((atk) => {
                const dmgParsed = parseDiceFormula(atk.damageFormula);
                const finalAttackBonus = atk.attackBonus + bonuses.attackBonus;
                const finalDamageMod = dmgParsed.modifier + bonuses.damageBonus;

                return (
                  <div
                    key={atk.id}
                    className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex justify-between items-center gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">{atk.name}</h4>
                      <span className="text-[11px] font-mono text-zinc-500">Crítico: {atk.critRange}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onRoll(`Acerto: ${atk.name}`, atk.diceCount || 1, 20, finalAttackBonus)
                        }
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                      >
                        🎯 {atk.diceCount || 1}d20{finalAttackBonus >= 0 ? `+${finalAttackBonus}` : finalAttackBonus}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onRoll(`Dano: ${atk.name}`, dmgParsed.count, dmgParsed.sides, finalDamageMod, true)
                        }
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                      >
                        🩸 {dmgParsed.count}d{dmgParsed.sides}
                        {finalDamageMod !== 0 ? (finalDamageMod > 0 ? `+${finalDamageMod}` : finalDamageMod) : ''}
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2 (PODERES) E ABA 3 (RITUAIS / MAGIAS) */}
      {(activeSubTab === 'powers' || activeSubTab === 'spells') && (
        <div className="flex flex-col gap-3">
          {(activeSubTab === 'powers' ? powerList : spellList).length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum {activeSubTab === 'powers' ? 'poder' : spellLabel.toLowerCase()} adicionado na ficha.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {(activeSubTab === 'powers' ? powerList : spellList).map((ab) => {
                const isPassive = ab.cost === 0 && !ab.damageFormula;

                return (
                  <div
                    key={ab.id}
                    className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex justify-between items-center gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-white">{ab.name}</h4>
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
                        {ab.modifiers && ab.modifiers.length > 0 && (
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
                      {ab.description && <p className="text-xs text-zinc-400 mt-1">{ab.description}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isPassive && (
                        <button
                          type="button"
                          onClick={() => handleUseAbility(ab)}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-700/50 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                        >
                          ✨ Usar {ab.cost > 0 ? `(-${ab.cost} ${resourceLabel})` : ''}
                        </button>
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
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: INVENTÁRIO (Com Quantidades xN e Troca entre Aliados) */}
      {activeSubTab === 'inventory' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-between items-center bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Capacidade de Carga:</span>
              {canTrade && (
                <span className="text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">
                  🤝 Trocas entre Jogadores Liberadas
                </span>
              )}
            </div>
            <span className={`text-xs font-mono font-bold ${isOverloaded ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentLoad} / {effectiveMaxSlots} Espaços {isOverloaded && '⚠️ SOBRECARGA!'}
            </span>
          </div>

          {inventory.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">Mochila vazia.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-lg flex justify-between items-center gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-extrabold bg-amber-950/70 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded">
                        {item.quantity || 1}x
                      </span>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <span className="text-[11px] font-mono text-zinc-500">
                        ({item.slots * (item.quantity || 1)} esp.)
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.isEquipped)}
                        onChange={() => toggleItemEquipped(item.id)}
                      />
                      Equipado / Em mãos
                    </label>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canTrade && onInitiateTradeItem && (
                      <button
                        type="button"
                        onClick={() => onInitiateTradeItem(item)}
                        className="px-2.5 py-1 bg-blue-900/60 hover:bg-blue-700 text-blue-200 hover:text-white border border-blue-700/60 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                        title="Entregar este item para outro jogador da mesa"
                      >
                        🤝 Passar p/ Aliado
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}