import { useState } from 'react';
import {
  SystemId,
  PreparedAttack,
  CharacterAbility,
  RPGItem,
} from '@totalrpg/shared';

interface SheetExtrasProps {
  system: SystemId;
  isEditMode: boolean;
  canEditInventory: boolean;
  canEditAbilities: boolean;
  attacks: PreparedAttack[];
  abilities: CharacterAbility[];
  inventory: RPGItem[];
  maxLoadSlots: number;
  onUpdateAttacks: (attacks: PreparedAttack[]) => void;
  onUpdateAbilities: (abilities: CharacterAbility[]) => void;
  onUpdateInventory: (inventory: RPGItem[]) => void;
  onSpendResource: (amount: number) => boolean;
  onRoll: (label: string, count: number, sides: number, modifier: number, isDamage?: boolean) => void;
}

// Função utilitária que lê fórmulas como "2d10+5" ou "1d8" e separa os números
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
  isEditMode,
  canEditInventory,
  canEditAbilities,
  attacks,
  abilities,
  inventory,
  maxLoadSlots,
  onUpdateAttacks,
  onUpdateAbilities,
  onUpdateInventory,
  onSpendResource,
  onRoll,
}: SheetExtrasProps) {
  const [activeSubTab, setActiveSubTab] = useState<'combat' | 'abilities' | 'inventory'>('combat');

  // Estados temporários para adicionar novo ataque
  const [atkName, setAtkName] = useState('');
  const [atkDice, setAtkDice] = useState(1);
  const [atkBonus, setAtkBonus] = useState(5);
  const [atkDamage, setAtkDamage] = useState('1d8+2');
  const [atkCrit, setAtkCrit] = useState('19/x2');

  // Estados temporários para adicionar poder/magia/ritual
  const [abName, setAbName] = useState('');
  const [abCategory, setAbCategory] = useState<CharacterAbility['category']>('poder');
  const [abCost, setAbCost] = useState(1);
  const [abDamage, setAbDamage] = useState('');
  const [abDesc, setAbDesc] = useState('');

  // Estados temporários para adicionar item na mochila
  const [itemName, setItemName] = useState('');
  const [itemSlots, setItemSlots] = useState(1);
  const [itemQty, setItemQty] = useState(1);

  const resourceLabel = system === 'ordem-paranormal' ? 'PE' : 'PM';
  const allowInv = isEditMode && canEditInventory;
  const allowAb = isEditMode && canEditAbilities;

  // Cálculo automático de espaços ocupados na mochila
  const currentLoad = inventory.reduce((acc, item) => acc + item.slots * item.quantity, 0);
  const isOverloaded = currentLoad > maxLoadSlots;

  function handleAddAttack(e: React.FormEvent) {
    e.preventDefault();
    if (!atkName.trim()) return;
    const newAtk: PreparedAttack = {
      id: Math.random().toString(36).substring(2, 9),
      name: atkName.trim(),
      diceCount: atkDice,
      attackBonus: atkBonus,
      damageFormula: atkDamage.trim() || '1d6',
      critRange: atkCrit.trim() || '20/x2',
      damageType: 'Impacto',
    };
    onUpdateAttacks([...attacks, newAtk]);
    setAtkName('');
  }

  function handleAddAbility(e: React.FormEvent) {
    e.preventDefault();
    if (!abName.trim()) return;
    const newAb: CharacterAbility = {
      id: Math.random().toString(36).substring(2, 9),
      name: abName.trim(),
      category: abCategory,
      cost: Math.max(0, abCost),
      description: abDesc.trim(),
      damageFormula: abDamage.trim() || undefined,
    };
    onUpdateAbilities([...abilities, newAb]);
    setAbName('');
    setAbDesc('');
    setAbDamage('');
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    const newItem: RPGItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: itemName.trim(),
      slots: Math.max(0, itemSlots),
      quantity: Math.max(1, itemQty),
      isEquipped: false,
    };
    onUpdateInventory([...inventory, newItem]);
    setItemName('');
    setItemSlots(1);
    setItemQty(1);
  }

  function handleUseAbility(ab: CharacterAbility) {
    if (ab.cost > 0) {
      const ok = onSpendResource(ab.cost);
      if (!ok) return;
    }
    if (ab.damageFormula) {
      const parsed = parseDiceFormula(ab.damageFormula);
      onRoll(`${ab.name} (Efeito)`, parsed.count, parsed.sides, parsed.modifier, true);
    } else {
      onRoll(`Ativou: ${ab.name} (-${ab.cost} ${resourceLabel})`, 1, 20, 0, true);
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5">
      {/* Navegação das Sub-Abas da Ficha */}
      <div className="flex border-b border-zinc-800 gap-4">
        <button
          type="button"
          onClick={() => setActiveSubTab('combat')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
            activeSubTab === 'combat'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ⚔️ Ataques ({attacks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('abilities')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
            activeSubTab === 'abilities'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ✨ Poderes & {system === 'ordem-paranormal' ? 'Rituais' : 'Magias'} ({abilities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('inventory')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
            activeSubTab === 'inventory'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🎒 Inventário ({currentLoad}/{maxLoadSlots} Espaços)
        </button>
      </div>

      {/* SUB-ABA 1: ATAQUES PREPARADOS */}
      {activeSubTab === 'combat' && (
        <div className="flex flex-col gap-4">
          {allowInv && (
            <form
              onSubmit={handleAddAttack}
              className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl grid grid-cols-2 md:grid-cols-6 gap-2 items-end"
            >
              <div className="col-span-2">
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Arma / Ataque</label>
                <input
                  type="text"
                  required
                  value={atkName}
                  onChange={(e) => setAtkName(e.target.value)}
                  placeholder="Ex: Katana, Espada Bastarda..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Dados (d20)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={atkDice}
                  onChange={(e) => setAtkDice(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Bônus Acerto</label>
                <input
                  type="number"
                  value={atkBonus}
                  onChange={(e) => setAtkBonus(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Fórmula Dano</label>
                <input
                  type="text"
                  value={atkDamage}
                  onChange={(e) => setAtkDamage(e.target.value)}
                  placeholder="1d10+4"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
              >
                + Adicionar
              </button>
            </form>
          )}

          {attacks.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum ataque preparado. {allowInv ? 'Use o formulário acima para cadastrar.' : 'Entre no Modo Edição para adicionar armas.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attacks.map((atk) => {
                const dmgParsed = parseDiceFormula(atk.damageFormula);
                return (
                  <div
                    key={atk.id}
                    className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex justify-between items-center gap-2"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">{atk.name}</h4>
                      <span className="text-[11px] font-mono text-zinc-500">
                        Crítico: {atk.critRange}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onRoll(
                            `Acerto: ${atk.name}`,
                            atk.diceCount || 1,
                            20,
                            atk.attackBonus
                          )
                        }
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                      >
                        🎯 {atk.diceCount || 1}d20+{atk.attackBonus}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onRoll(
                            `Dano: ${atk.name}`,
                            dmgParsed.count,
                            dmgParsed.sides,
                            dmgParsed.modifier,
                            true
                          )
                        }
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-red-700 text-red-400 hover:text-white border border-zinc-700 rounded text-xs font-mono font-bold transition cursor-pointer"
                      >
                        🩸 {atk.damageFormula}
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

      {/* SUB-ABA 2: PODERES, MAGIAS E RITUAIS */}
      {activeSubTab === 'abilities' && (
        <div className="flex flex-col gap-4">
          {allowAb && (
            <form
              onSubmit={handleAddAbility}
              className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase text-zinc-400 mb-1">Nome do Poder / Ritual / Magia</label>
                  <input
                    type="text"
                    required
                    value={abName}
                    onChange={(e) => setAbName(e.target.value)}
                    placeholder="Ex: Ataque Especial, Decadência, Bola de Fogo..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 mb-1">Custo ({resourceLabel})</label>
                  <input
                    type="number"
                    min={0}
                    value={abCost}
                    onChange={(e) => setAbCost(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-zinc-400 mb-1">Rolagem (Opcional)</label>
                  <input
                    type="text"
                    value={abDamage}
                    onChange={(e) => setAbDamage(e.target.value)}
                    placeholder="Ex: 2d8+2"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={abDesc}
                  onChange={(e) => setAbDesc(e.target.value)}
                  placeholder="Descrição curta do efeito..."
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
                >
                  + Adicionar Poder
                </button>
              </div>
            </form>
          )}

          {abilities.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">
              Nenhum poder ou ritual registrado ainda.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {abilities.map((ab) => (
                <div
                  key={ab.id}
                  className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex justify-between items-center gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{ab.name}</h4>
                      {ab.cost > 0 && (
                        <span className="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                          {ab.cost} {resourceLabel}
                        </span>
                      )}
                    </div>
                    {ab.description && (
                      <p className="text-xs text-zinc-400 mt-1">{ab.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseAbility(ab)}
                      className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-700/50 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                    >
                      ✨ Usar {ab.cost > 0 ? `(-${ab.cost} ${resourceLabel})` : ''}
                    </button>
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-ABA 3: INVENTÁRIO E CARGA */}
      {activeSubTab === 'inventory' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800 px-4 py-2.5 rounded-xl">
            <span className="text-xs text-zinc-400">Capacidade da Mochila:</span>
            <span
              className={`text-xs font-mono font-bold ${
                isOverloaded ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {currentLoad} / {maxLoadSlots} Espaços {isOverloaded && '⚠️ SOBRECARGA!'}
            </span>
          </div>

          {allowInv && (
            <form
              onSubmit={handleAddItem}
              className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
            >
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Nome do Item</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ex: Bandoleira, Bálsamo Restaurador, Cicatrizante..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 mb-1">Espaços (Cada)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={itemSlots}
                  onChange={(e) => setItemSlots(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold cursor-pointer"
              >
                + Guardar Item
              </button>
            </form>
          )}

          {inventory.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">Mochila vazia.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Espaços: {item.slots * item.quantity} ({item.quantity}x)
                    </span>
                  </div>

                  {allowInv && (
                    <button
                      type="button"
                      onClick={() => onUpdateInventory(inventory.filter((i) => i.id !== item.id))}
                      className="text-xs text-zinc-600 hover:text-red-400 px-2 cursor-pointer"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}