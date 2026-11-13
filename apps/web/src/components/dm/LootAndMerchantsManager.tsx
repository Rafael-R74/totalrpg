import { useState } from 'react';
import {
  SystemId,
  RPGItem,
  PreparedAttack,
  CompendiumEntryData,
  CampaignMerchant,
  MerchantStockItem,
  MonitorProjection,
} from '@totalrpg/shared';
import { DMScreenCharacter } from '../../services/api';
import { ImageUploadField } from '../ImageUploadField';

export interface CampaignStoredItem {
  id: string;
  item: RPGItem;
  attack?: PreparedAttack;
}

interface LootAndMerchantsManagerProps {
  system: SystemId;
  characters: DMScreenCharacter[];
  compendiumEntries: CompendiumEntryData[];
  campaignItems: CampaignStoredItem[];
  merchants: CampaignMerchant[];
  activeProjectionId?: string | null;
  activeMerchantOnMonitorId?: string | null;
  onUpdateCampaignItems: (next: CampaignStoredItem[]) => void;
  onUpdateMerchants: (next: CampaignMerchant[]) => void;
  onToggleProjection: (projection: MonitorProjection) => void;
  onToggleMerchantOnMonitor: (merchantId: string) => void;
  onDeliverItemToCharacter: (
    character: DMScreenCharacter,
    item: RPGItem,
    attack?: PreparedAttack,
    fromMerchant?: boolean
  ) => Promise<void>;
}

export function LootAndMerchantsManager({
  system,
  characters,
  compendiumEntries,
  campaignItems,
  merchants,
  activeProjectionId,
  activeMerchantOnMonitorId,
  onUpdateCampaignItems,
  onUpdateMerchants,
  onToggleProjection,
  onToggleMerchantOnMonitor,
  onDeliverItemToCharacter,
}: LootAndMerchantsManagerProps) {
  const defaultCurrency = system === 'ordem-paranormal' ? 'Cat.' : 'T$';

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingStoredItemId, setEditingStoredItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemSlots, setItemSlots] = useState(1);
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [weaponDmg, setWeaponDmg] = useState('');
  const [weaponCrit, setWeaponCrit] = useState('20/x2');

  const [isCompendiumVaultModalOpen, setIsCompendiumVaultModalOpen] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');

  const [itemToGiveModal, setItemToGiveModal] = useState<{
    stored: CampaignStoredItem;
    fromMerchant: boolean;
  } | null>(null);
  const [selectedRecipientCharId, setSelectedRecipientCharId] = useState('');
  const [giveQuantity, setGiveQuantity] = useState<number>(1);

  const [isMerchantFormOpen, setIsMerchantFormOpen] = useState(false);
  const [editingMerchantId, setEditingMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState('');
  const [merchantDesc, setMerchantDesc] = useState('');

  const [stockModalMerchantId, setStockModalMerchantId] = useState<string | null>(null);
  const [stockModalTab, setStockModalTab] = useState<'adventure' | 'compendium'>('adventure');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockPriceInput, setStockPriceInput] = useState<number>(50);
  const [stockCurrencyInput, setStockCurrencyInput] = useState<string>(defaultCurrency);

  const [editingStockItem, setEditingStockItem] = useState<{
    merchantId: string;
    stockItem: MerchantStockItem;
  } | null>(null);
  const [editStockName, setEditStockName] = useState('');
  const [editStockPrice, setEditStockPrice] = useState(0);
  const [editStockCurrency, setEditStockCurrency] = useState(defaultCurrency);

  function handleOpenNewItemForm() {
    setEditingStoredItemId(null);
    setItemName('');
    setItemSlots(1);
    setItemImageUrl('');
    setItemDesc('');
    setWeaponDmg('');
    setWeaponCrit('20/x2');
    setIsItemFormOpen(true);
  }

  function handleStartEditStoredItem(stored: CampaignStoredItem) {
    setEditingStoredItemId(stored.id);
    setItemName(stored.item.name);
    setItemSlots(stored.item.slots);
    setItemImageUrl(stored.item.imageUrl || '');
    setItemDesc(stored.item.description || '');
    setWeaponDmg(stored.attack?.damageFormula || '');
    setWeaponCrit(stored.attack?.critRange || '20/x2');
    setIsItemFormOpen(true);
  }

  function handleSaveCampaignItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;

    const id = editingStoredItemId || Math.random().toString(36).substring(2, 9);
    const updatedItem: RPGItem = {
      id,
      name: itemName.trim(),
      slots: Math.max(0, Number(itemSlots)),
      quantity: 1,
      imageUrl: itemImageUrl.trim() || undefined,
      isEquipped: false,
      description: itemDesc.trim(),
      modifiers: [],
    };

    let updatedAtk: PreparedAttack | undefined;
    if (weaponDmg.trim()) {
      updatedAtk = {
        id: Math.random().toString(36).substring(2, 9),
        name: itemName.trim(),
        diceCount: 1,
        attackBonus: 5,
        damageFormula: weaponDmg.trim(),
        critRange: weaponCrit.trim() || '20/x2',
        damageType: 'Arma',
      };
    }

    const payload: CampaignStoredItem = { id, item: updatedItem, attack: updatedAtk };

    if (editingStoredItemId) {
      onUpdateCampaignItems(
        campaignItems.map((ci) => (ci.id === editingStoredItemId ? payload : ci))
      );
    } else {
      onUpdateCampaignItems([...campaignItems, payload]);
    }

    setEditingStoredItemId(null);
    setIsItemFormOpen(false);
  }

  function handleImportFromCompendiumToVault(entry: CompendiumEntryData) {
    const id = Math.random().toString(36).substring(2, 9);
    const newItem: RPGItem = {
      id,
      name: entry.name,
      slots: entry.metadata?.slots ?? 1,
      quantity: 1,
      isEquipped: false,
      description: entry.description,
      modifiers: entry.modifiers || [],
    };

    let newAtk: PreparedAttack | undefined;
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

    onUpdateCampaignItems([...campaignItems, { id, item: newItem, attack: newAtk }]);
    setIsCompendiumVaultModalOpen(false);
  }

  async function handleConfirmGiveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemToGiveModal || !selectedRecipientCharId) return;

    const targetChar = characters.find((c) => c.id === selectedRecipientCharId);
    if (!targetChar) return;

    const safeQty = Math.max(1, Number(giveQuantity) || 1);

    const clonedItem: RPGItem = {
      ...itemToGiveModal.stored.item,
      id: Math.random().toString(36).substring(2, 9),
      quantity: safeQty,
    };
    const clonedAttack = itemToGiveModal.stored.attack
      ? { ...itemToGiveModal.stored.attack, id: Math.random().toString(36).substring(2, 9) }
      : undefined;

    await onDeliverItemToCharacter(
      targetChar,
      clonedItem,
      clonedAttack,
      itemToGiveModal.fromMerchant
    );
    setItemToGiveModal(null);
    setSelectedRecipientCharId('');
    setGiveQuantity(1);
  }

  function handleOpenNewMerchantForm() {
    setEditingMerchantId(null);
    setMerchantName('');
    setMerchantDesc('');
    setIsMerchantFormOpen(true);
  }

  function handleStartEditMerchant(merchant: CampaignMerchant) {
    setEditingMerchantId(merchant.id);
    setMerchantName(merchant.name);
    setMerchantDesc(merchant.description);
    setIsMerchantFormOpen(true);
  }

  function handleSaveMerchant(e: React.FormEvent) {
    e.preventDefault();
    if (!merchantName.trim()) return;

    if (editingMerchantId) {
      onUpdateMerchants(
        merchants.map((m) =>
          m.id === editingMerchantId
            ? { ...m, name: merchantName.trim(), description: merchantDesc.trim() }
            : m
        )
      );
    } else {
      const newMerchant: CampaignMerchant = {
        id: Math.random().toString(36).substring(2, 9),
        name: merchantName.trim(),
        description: merchantDesc.trim(),
        stock: [],
      };
      onUpdateMerchants([...merchants, newMerchant]);
    }

    setEditingMerchantId(null);
    setIsMerchantFormOpen(false);
  }

  function handleAddToMerchantStock(item: RPGItem, attack?: PreparedAttack) {
    if (!stockModalMerchantId) return;

    const cleanCurrency = stockCurrencyInput.trim() || defaultCurrency;

    const updatedMerchants = merchants.map((m) => {
      if (m.id !== stockModalMerchantId) return m;
      return {
        ...m,
        stock: [
          ...m.stock,
          {
            id: Math.random().toString(36).substring(2, 9),
            item: { ...item, id: Math.random().toString(36).substring(2, 9) },
            attack: attack ? { ...attack, id: Math.random().toString(36).substring(2, 9) } : undefined,
            price: Math.max(0, Number(stockPriceInput)),
            currency: cleanCurrency,
            stockQty: 1,
          },
        ],
      };
    });

    onUpdateMerchants(updatedMerchants);
  }

  function handleSaveStockItemEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStockItem) return;

    const cleanCurrency = editStockCurrency.trim() || defaultCurrency;

    const updatedMerchants = merchants.map((m) => {
      if (m.id !== editingStockItem.merchantId) return m;
      return {
        ...m,
        stock: m.stock.map((st) =>
          st.id === editingStockItem.stockItem.id
            ? {
                ...st,
                price: Math.max(0, Number(editStockPrice)),
                currency: cleanCurrency,
                item: { ...st.item, name: editStockName.trim() || st.item.name },
              }
            : st
        ),
      };
    });

    onUpdateMerchants(updatedMerchants);
    setEditingStockItem(null);
  }

  const filteredCompendiumForVault = compendiumEntries.filter(
    (c) =>
      c.category === 'item' &&
      (c.name.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(vaultSearchQuery.toLowerCase()))
  );

  const filteredAdventureForStock = campaignItems.filter((ci) =>
    ci.item.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
  );

  const filteredCompendiumForStock = compendiumEntries.filter(
    (c) =>
      c.category === 'item' &&
      (c.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(stockSearchQuery.toLowerCase()))
  );

  const activeMerchantForModal = merchants.find((m) => m.id === stockModalMerchantId);

  return (
    <div className="flex flex-col gap-6">
      {/* MODAL 1: PUXAR ITEM DO COMPÊNDIO */}
      {isCompendiumVaultModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/70 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-amber-500">
                  📚 Puxar Item ou Arma do Compêndio
                </h3>
                <p className="text-xs text-zinc-400">
                  Pesquise no catálogo oficial do sistema para guardar no Bloco de Itens da sua aventura.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompendiumVaultModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              autoFocus
              value={vaultSearchQuery}
              onChange={(e) => setVaultSearchQuery(e.target.value)}
              placeholder="🔍 Pesquisar arma, equipamento ou proteção..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />

            <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[400px]">
              {filteredCompendiumForVault.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-8">
                  Nenhum item encontrado no Compêndio.
                </p>
              ) : (
                filteredCompendiumForVault.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex justify-between items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{entry.name}</span>
                        {entry.metadata?.damageFormula && (
                          <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded">
                            ⚔️ {entry.metadata.damageFormula}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500">
                          ({entry.metadata?.slots ?? 1} esp.)
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{entry.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleImportFromCompendiumToVault(entry)}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      + Guardar no Bloco
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADICIONAR ITEM AO ESTOQUE DO MERCADOR */}
      {activeMerchantForModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-blue-500/70 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[88vh]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">
                  🪙 Abastecer Loja do Mercador
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Adicionar Estoque em: {activeMerchantForModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStockModalMerchantId(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setStockModalTab('adventure')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  stockModalTab === 'adventure'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🎒 Itens da Aventura ({campaignItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStockModalTab('compendium')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  stockModalTab === 'compendium'
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                📚 Itens do Compêndio
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Pesquisar Item
                </label>
                <input
                  type="text"
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  placeholder="🔍 Digite o nome do item..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-amber-400 font-bold mb-1">
                  Valor / Preço
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockPriceInput}
                  onChange={(e) => setStockPriceInput(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-amber-600/80 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-amber-400"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-amber-400 font-bold mb-1">
                  Moeda (Ex: T$, PO, Almas)
                </label>
                <input
                  type="text"
                  value={stockCurrencyInput}
                  onChange={(e) => setStockCurrencyInput(e.target.value)}
                  placeholder="T$, PO, Cat..."
                  className="w-full bg-zinc-900 border border-amber-600/80 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[360px]">
              {stockModalTab === 'adventure' ? (
                filteredAdventureForStock.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-8">
                    Nenhum item encontrado no Bloco de Itens da Aventura.
                  </p>
                ) : (
                  filteredAdventureForStock.map((stored) => (
                    <div
                      key={stored.id}
                      className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex justify-between items-center gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {stored.item.imageUrl && (
                          <img
                            src={stored.item.imageUrl}
                            alt={stored.item.name}
                            className="w-14 h-14 rounded-xl object-cover border border-zinc-700 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-white">{stored.item.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500 ml-2">
                            ({stored.item.slots} esp.)
                          </span>
                          {stored.item.description && (
                            <p className="text-xs text-zinc-400 mt-0.5 truncate">{stored.item.description}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddToMerchantStock(stored.item, stored.attack)}
                        className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        + Adicionar ({stockPriceInput} {stockCurrencyInput || defaultCurrency})
                      </button>
                    </div>
                  ))
                )
              ) : filteredCompendiumForStock.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-8">
                  Nenhum item encontrado no Compêndio.
                </p>
              ) : (
                filteredCompendiumForStock.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex justify-between items-center gap-3"
                  >
                    <div>
                      <span className="text-sm font-bold text-white">{entry.name}</span>
                      {entry.metadata?.damageFormula && (
                        <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded ml-2">
                          ⚔️ {entry.metadata.damageFormula}
                        </span>
                      )}
                      <p className="text-xs text-zinc-400 mt-0.5">{entry.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newItem: RPGItem = {
                          id: Math.random().toString(36).substring(2, 9),
                          name: entry.name,
                          slots: entry.metadata?.slots ?? 1,
                          quantity: 1,
                          isEquipped: false,
                          description: entry.description,
                          modifiers: entry.modifiers || [],
                        };
                        let newAtk: PreparedAttack | undefined;
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
                        handleAddToMerchantStock(newItem, newAtk);
                      }}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      + Adicionar ({stockPriceInput} {stockCurrencyInput || defaultCurrency})
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR ITEM DO ESTOQUE DO MERCADOR */}
      {editingStockItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStockItemEdit}
            className="bg-zinc-900 border border-blue-500 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-base font-extrabold text-white">
              ✏️ Editar Item do Estoque
            </h3>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nome do Item na Loja</label>
              <input
                type="text"
                required
                value={editStockName}
                onChange={(e) => setEditStockName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Valor / Preço</label>
                <input
                  type="number"
                  min={0}
                  value={editStockPrice}
                  onChange={(e) => setEditStockPrice(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Moeda</label>
                <input
                  type="text"
                  required
                  value={editStockCurrency}
                  onChange={(e) => setEditStockCurrency(e.target.value)}
                  placeholder="Ex: T$, PO, Almas..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStockItem(null)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: ESCOLHER QUAL JOGADOR RECEBE O ITEM E QUANTIDADE */}
      {itemToGiveModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmGiveItem}
            className="bg-zinc-900 border border-amber-500 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3.5">
                {itemToGiveModal.stored.item.imageUrl && (
                  <img
                    src={itemToGiveModal.stored.item.imageUrl}
                    alt={itemToGiveModal.stored.item.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/70 shadow-lg shrink-0 bg-zinc-950"
                  />
                )}
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                    {itemToGiveModal.fromMerchant
                      ? '🪙 Venda / Entrega de Mercador (Silenciosa)'
                      : '🎁 Entregar Recompensa da Aventura (Com Modal de Loot)'}
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">
                    {itemToGiveModal.stored.item.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemToGiveModal(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                1. Selecione qual personagem da mesa receberá:
              </label>
              {characters.length === 0 ? (
                <p className="text-xs text-red-400">Nenhum personagem vinculado à campanha ainda.</p>
              ) : (
                <select
                  required
                  value={selectedRecipientCharId}
                  onChange={(e) => setSelectedRecipientCharId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white"
                >
                  <option value="">-- Escolha um personagem --</option>
                  {characters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} (Jogador: @{ch.owner.username})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-200">
                  2. Quantidade a {itemToGiveModal.fromMerchant ? 'Vender' : 'Entregar'}:
                </label>
                <span className="text-[11px] font-mono text-zinc-500">
                  Peso total: {(itemToGiveModal.stored.item.slots * Math.max(1, giveQuantity)).toFixed(1).replace('.0', '')} esp.
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setGiveQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg font-mono font-bold text-white cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={999}
                  required
                  value={giveQuantity}
                  onChange={(e) => setGiveQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-zinc-900 border border-amber-500/80 rounded-lg py-1 text-center font-mono text-sm font-extrabold text-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setGiveQuantity((q) => q + 1)}
                  className="w-8 h-8 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg font-mono font-bold text-white cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setGiveQuantity((q) => q + 5)}
                  className="px-2 h-8 bg-zinc-900 hover:bg-amber-600 border border-zinc-700 rounded-lg font-mono text-xs font-bold text-amber-400 hover:text-white cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToGiveModal(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedRecipientCharId}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirmar ({Math.max(1, giveQuantity)}x)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BLOCO 1: COFRE DE ITENS & PISTAS DA AVENTURA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-500">
              🎒 Bloco de Itens & Pistas da Aventura ({campaignItems.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Crie itens com imagem opcional, projete-os no 2º Monitor ou entregue aos jogadores!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setVaultSearchQuery('');
                setIsCompendiumVaultModalOpen(true);
              }}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              📚 Puxar do Compêndio
            </button>

            <button
              type="button"
              onClick={() => {
                if (isItemFormOpen) {
                  setIsItemFormOpen(false);
                  setEditingStoredItemId(null);
                } else {
                  handleOpenNewItemForm();
                }
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer"
            >
              {isItemFormOpen ? 'Cancelar' : '+ Criar Item da Aventura'}
            </button>
          </div>
        </div>

        {isItemFormOpen && (
          <form
            onSubmit={handleSaveCampaignItem}
            className="bg-zinc-950 border border-amber-800/60 p-4 rounded-xl flex flex-col gap-3"
          >
            <h4 className="text-xs font-bold uppercase text-amber-400">
              {editingStoredItemId ? `✏️ Editando Item: ${itemName}` : '🛠️ Novo Item da Aventura'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Nome do Item / Arma / Pista
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ex: Relíquia de Sangue, Chave..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <ImageUploadField
                  label="Imagem do Item"
                  value={itemImageUrl}
                  onChange={setItemImageUrl}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Espaços
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={itemSlots}
                  onChange={(e) => setItemSlots(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                  Dano (Se for Arma)
                </label>
                <input
                  type="text"
                  value={weaponDmg}
                  onChange={(e) => setWeaponDmg(e.target.value)}
                  placeholder="Opcional: 2d8+4"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Descrição ou detalhes do item..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {editingStoredItemId ? 'Salvar Alterações' : 'Guardar no Bloco'}
              </button>
            </div>
          </form>
        )}

        {campaignItems.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            Nenhum item preparado no cofre desta aventura ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {campaignItems.map((stored) => {
              const isProjected = activeProjectionId === stored.id;

              return (
                <div
                  key={stored.id}
                  className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        {stored.item.imageUrl ? (
                          <img
                            src={stored.item.imageUrl}
                            alt={stored.item.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-500/60 shadow-lg shrink-0 bg-zinc-900"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-3xl shrink-0">
                            {stored.attack ? '⚔️' : '🎒'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-base text-white truncate">{stored.item.name}</h4>
                          {stored.attack && (
                            <span className="inline-block text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded mt-1">
                              ⚔️ Dano: {stored.attack.damageFormula}
                            </span>
                          )}
                          {stored.item.description && (
                            <p className="text-xs text-zinc-400 mt-1.5 line-clamp-3">{stored.item.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 whitespace-nowrap shrink-0">
                        {stored.item.slots} esp.
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-900">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecipientCharId('');
                          setGiveQuantity(1);
                          setItemToGiveModal({ stored, fromMerchant: false });
                        }}
                        className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        🎁 Entregar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onToggleProjection({
                            type: 'item',
                            id: stored.id,
                            title: stored.item.name,
                            subtitle: stored.attack
                              ? `Arma • Dano ${stored.attack.damageFormula}`
                              : `Item da Aventura • ${stored.item.slots} esp.`,
                            description: stored.item.description,
                            imageUrl: stored.item.imageUrl,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isProjected
                            ? 'bg-amber-500 text-zinc-950 shadow'
                            : 'bg-zinc-900 hover:bg-amber-600 text-amber-400 hover:text-white border border-zinc-700'
                        }`}
                        title="Exibir este item em destaque no 2º Monitor"
                      >
                        {isProjected ? '🖥️ Sair' : '🖥️ TV'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartEditStoredItem(stored)}
                        className="px-2 py-1.5 bg-zinc-800 hover:bg-amber-600 text-zinc-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCampaignItems(campaignItems.filter((ci) => ci.id !== stored.id))
                        }
                        className="px-2 py-1.5 bg-zinc-900 hover:bg-red-950 text-zinc-500 hover:text-red-400 rounded-lg text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BLOCO 2: MERCADORES E LOJAS DA AVENTURA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-400">
              🪙 Bloco de Mercadores & Lojas ({merchants.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Clique em "🖥️ Abrir no 2º Monitor" em qualquer Mercador para exibi-lo no lado direito da TV!
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isMerchantFormOpen) {
                setIsMerchantFormOpen(false);
                setEditingMerchantId(null);
              } else {
                handleOpenNewMerchantForm();
              }
            }}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold transition cursor-pointer"
          >
            {isMerchantFormOpen ? 'Cancelar' : '+ Criar Novo Mercador'}
          </button>
        </div>

        {isMerchantFormOpen && (
          <form
            onSubmit={handleSaveMerchant}
            className="bg-zinc-950 border border-blue-900/60 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                {editingMerchantId ? '✏️ Editando Nome do Mercador' : 'Nome do Mercador / Loja'}
              </label>
              <input
                type="text"
                required
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="Ex: Forja do Anão Thordar, Intendente da Base..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-[10px] uppercase text-zinc-400 font-bold mb-1">
                Descrição / Localização
              </label>
              <input
                type="text"
                value={merchantDesc}
                onChange={(e) => setMerchantDesc(e.target.value)}
                placeholder="Ex: Vende armas táticas e munições..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              {editingMerchantId ? 'Salvar Alterações' : 'Salvar Mercador'}
            </button>
          </form>
        )}

        {merchants.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            Nenhum mercador criado nesta campanha ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {merchants.map((merchant) => {
              const isShowingOnMonitor = activeMerchantOnMonitorId === merchant.id;

              return (
                <div
                  key={merchant.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start border-b border-zinc-800 pb-2.5 gap-2">
                      <div>
                        <h4 className="font-extrabold text-base text-white">🪙 {merchant.name}</h4>
                        {merchant.description && (
                          <p className="text-xs text-zinc-400">{merchant.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleMerchantOnMonitor(merchant.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                            isShowingOnMonitor
                              ? 'bg-blue-500 text-zinc-950 shadow'
                              : 'bg-zinc-900 hover:bg-blue-600 text-blue-400 hover:text-white border border-zinc-700'
                          }`}
                          title="Exibir esta loja no lado direito do 2º Monitor"
                        >
                          {isShowingOnMonitor ? '🖥️ Na TV (Fechar)' : '🖥️ Abrir no 2º Monitor'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditMerchant(merchant)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-blue-600 text-zinc-300 hover:text-white rounded text-xs font-bold cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateMerchants(merchants.filter((m) => m.id !== merchant.id))
                          }
                          className="px-2 py-1 bg-zinc-900 hover:bg-red-950 text-zinc-500 hover:text-red-400 rounded text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {merchant.stock.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-2">
                          Estoque vazio. Clique no botão abaixo para adicionar itens à loja!
                        </p>
                      ) : (
                        merchant.stock.map((st) => {
                          const displayCurrency = st.currency || defaultCurrency;

                          return (
                            <div
                              key={st.id}
                              className="bg-zinc-900 border border-zinc-800 px-3 py-2.5 rounded-xl flex justify-between items-center gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {st.item.imageUrl ? (
                                  <img
                                    src={st.item.imageUrl}
                                    alt={st.item.name}
                                    className="w-12 h-12 rounded-xl object-cover border border-amber-500/50 shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-lg shrink-0">
                                    {st.attack ? '⚔️' : '🎒'}
                                  </div>
                                )}
                                <div className="truncate">
                                  <span className="text-xs font-bold text-white block truncate">{st.item.name}</span>
                                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                                    [{st.price} {displayCurrency}]
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecipientCharId('');
                                    setGiveQuantity(1);
                                    setItemToGiveModal({
                                      stored: {
                                        id: st.id,
                                        item: st.item,
                                        attack: st.attack,
                                      },
                                      fromMerchant: true,
                                    });
                                  }}
                                  className="px-2 py-1 bg-blue-800 hover:bg-blue-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Vender / Entregar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStockItem({ merchantId: merchant.id, stockItem: st });
                                    setEditStockName(st.item.name);
                                    setEditStockPrice(st.price);
                                    setEditStockCurrency(st.currency || defaultCurrency);
                                  }}
                                  className="px-1.5 py-1 bg-zinc-800 hover:bg-amber-600 text-zinc-300 hover:text-white rounded text-[10px] cursor-pointer"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = merchants.map((m) =>
                                      m.id === merchant.id
                                        ? { ...m, stock: m.stock.filter((s) => s.id !== st.id) }
                                        : m
                                    );
                                    onUpdateMerchants(updated);
                                  }}
                                  className="text-xs text-zinc-500 hover:text-red-400 px-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStockSearchQuery('');
                      setStockPriceInput(50);
                      setStockCurrencyInput(defaultCurrency);
                      setStockModalTab('adventure');
                      setStockModalMerchantId(merchant.id);
                    }}
                    className="w-full py-2 bg-blue-950/60 hover:bg-blue-700 text-blue-300 hover:text-white border border-blue-800/80 rounded-xl text-xs font-extrabold transition cursor-pointer"
                  >
                    + Adicionar Item ao Estoque (Modal)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}