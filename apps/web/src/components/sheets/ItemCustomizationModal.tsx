import { useState } from 'react';
import {
  CompendiumEntryData,
  OrdemElement,
  RPGItem,
  ORDEM_ACCESSORY_ELIGIBLE_SKILLS,
  ORDEM_ELEMENTS_FOUR,
  ORDEM_KIT_REQUIRED_SKILLS,
  canApplyCurseToItem,
  canApplyModificationToItem,
  findOrdemCurseDef,
  findOrdemModificationDef,
  getOrdemEligibleCurses,
  getOrdemEligibleModifications,
  getOrdemItemEffectiveCategory,
  getOrdemItemEffectiveSlots,
  inferOrdemItemKind,
} from '@totalrpg/shared';

import { Icon } from '../ui/Icon';
import { ElementBadge, elementChoiceClasses } from '../ui/ElementBadge';
interface ItemCustomizationModalProps {
  item: RPGItem;
  compendiumEntries: CompendiumEntryData[];
  onSave: (updatedItem: RPGItem) => void;
  onClose: () => void;
}

const KIND_LABELS: Record<string, string> = {
  weapon_melee: 'Arma Corpo a Corpo',
  weapon_ranged: 'Arma de Disparo',
  weapon_firearm: 'Arma de Fogo',
  ammo: 'Munição',
  protection_light: 'Proteção Leve',
  protection_heavy: 'Proteção Pesada',
  shield: 'Escudo',
  accessory: 'Acessório',
  explosive: 'Explosivo',
  operational: 'Item Operacional',
  paranormal: 'Item Paranormal',
  cursed_special: 'Item Amaldiçoado Especial',
};

const CAT_ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function ItemCustomizationModal({
  item,
  compendiumEntries,
  onSave,
  onClose,
}: ItemCustomizationModalProps) {
  const [draft, setDraft] = useState<RPGItem>(() => ({
    ...item,
    baseCategory: item.baseCategory ?? item.category ?? 0,
    baseSlots: item.baseSlots ?? item.slots ?? 1,
    modifications: [...(item.modifications || [])],
    curses: [...(item.curses || [])],
    accessoryConfig: item.accessoryConfig ? { ...item.accessoryConfig } : undefined,
  }));

  const [activeTab, setActiveTab] = useState<'modifications' | 'curses'>('modifications');
  const [curseElementFilter, setCurseElementFilter] = useState<string>('ALL');
  const [pendingChoiceCurseId, setPendingChoiceCurseId] = useState<string | null>(null);
  const [pendingRitualInput, setPendingRitualInput] = useState<string>('');

  const itemKind = inferOrdemItemKind(draft);
  const eligibleMods = getOrdemEligibleModifications(draft);
  const eligibleCurses = getOrdemEligibleCurses(draft);
  const filteredCurses = eligibleCurses.filter(
    (c) =>
      curseElementFilter === 'ALL' ||
      c.element.toLowerCase() === curseElementFilter.toLowerCase() ||
      c.element === 'Varia'
  );

  const effectiveCat = getOrdemItemEffectiveCategory(draft);
  const effectiveSlots = getOrdemItemEffectiveSlots(draft);
  const ln = draft.name.toLowerCase();

  const isAccessory =
    itemKind === 'accessory' &&
    (ln.includes('utensílio') ||
      ln.includes('utensilio') ||
      ln.includes('vestimenta') ||
      Boolean(draft.accessoryConfig));
  const isSelo = ln.includes('selo paranormal');
  const needsElementTag =
    ln.includes('amarras de') ||
    ln.includes('scanner de manifestação') ||
    ln.includes('scanner de manifestacao') ||
    ln.includes('componentes ritual') ||
    ln.includes('dedo decepado');

  const spellEntries = compendiumEntries
    .filter((e) => e.category === 'spell')
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  function syncDraftWithMeta(next: RPGItem): RPGItem {
    const nextCat = getOrdemItemEffectiveCategory(next);
    const nextSlots = getOrdemItemEffectiveSlots(next);
    const hasCurses = (next.curses || []).length > 0;
    return {
      ...next,
      category: nextCat,
      slots: nextSlots,
      isParanormal: next.isParanormal || hasCurses,
    };
  }

  function handleToggleModification(modId: string) {
    const current = draft.modifications || [];
    if (current.includes(modId)) {
      let nextMods = current.filter((m) => m !== modId);
      // Se remover Função Adicional, remove também Aprimorado (2ª Função)
      if (modId === 'mod-funcao-adicional') {
        nextMods = nextMods.filter((m) => m !== 'mod-aprimorado-extra');
      }
      // Se remover Ferrolho Automático de uma arma não-automática, remove Compensador
      if (modId === 'mod-ferrolho-automatico') {
        const tempItem = { ...draft, modifications: nextMods };
        const compDef = findOrdemModificationDef('mod-compensador');
        if (compDef && nextMods.includes('mod-compensador')) {
          const check = canApplyModificationToItem(
            { ...tempItem, modifications: nextMods.filter((m) => m !== 'mod-compensador') },
            compDef
          );
          if (!check.allowed) {
            nextMods = nextMods.filter((m) => m !== 'mod-compensador');
          }
        }
      }
      setDraft((prev) => syncDraftWithMeta({ ...prev, modifications: nextMods }));
      return;
    }

    const modDef = findOrdemModificationDef(modId);
    if (!modDef) return;
    const check = canApplyModificationToItem(draft, modDef);
    if (!check.allowed) return;

    const nextMods = [...current, modId];
    const nextConfig = { ...(draft.accessoryConfig || {}) };
    if (modId === 'mod-aprimorado') nextConfig.aprimoradoPrimary = true;
    if (modId === 'mod-aprimorado-extra') nextConfig.aprimoradoSecondary = true;
    if (modId === 'mod-instrumental' && !nextConfig.instrumentalSkill) {
      nextConfig.instrumentalSkill = 'medicina';
    }

    setDraft((prev) =>
      syncDraftWithMeta({
        ...prev,
        modifications: nextMods,
        accessoryConfig:
          isAccessory || modId === 'mod-instrumental' ? nextConfig : prev.accessoryConfig,
      })
    );
  }

  function handleAddCurse(
    curseId: string,
    chosenElement?: OrdemElement,
    chosenRitualName?: string
  ) {
    const curseDef = findOrdemCurseDef(curseId);
    if (!curseDef) return;
    const check = canApplyCurseToItem(draft, curseDef, chosenElement);
    if (!check.allowed) return;

    const nextCurses = [
      ...(draft.curses || []),
      { curseId, chosenElement, chosenRitualName },
    ];
    setDraft((prev) =>
      syncDraftWithMeta({
        ...prev,
        curses: nextCurses,
        storedRitualName:
          curseId === 'curse-arma-ritualistica' && chosenRitualName
            ? chosenRitualName
            : prev.storedRitualName,
      })
    );
    setPendingChoiceCurseId(null);
    setPendingRitualInput('');
  }

  function handleRemoveCurse(curseId: string) {
    const nextCurses = (draft.curses || []).filter((c) => c.curseId !== curseId);
    setDraft((prev) => syncDraftWithMeta({ ...prev, curses: nextCurses }));
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-start gap-3 border-b border-zinc-800 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-100">
                <Icon name="settings" /> Customizar Equipamento: {draft.name}
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-zinc-300">
                {KIND_LABELS[itemKind] || itemKind}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-mono">
              <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/60 font-bold">
                Categoria: {CAT_ROMAN[draft.baseCategory ?? 0] || draft.baseCategory} →{' '}
                {CAT_ROMAN[effectiveCat] || effectiveCat}
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-700">
                Espaços: {draft.baseSlots ?? 1} → {effectiveSlots}
              </span>
              {(draft.modifications || []).length > 0 && (
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/70">
                  <Icon name="hammer" /> {(draft.modifications || []).length} Mod.
                </span>
              )}
              {(draft.curses || []).length > 0 && (
                <span className="px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-700/70">
                  <Icon name="conhecimento" /> {(draft.curses || []).length} Maldiç{(draft.curses || []).length > 1 ? 'ões' : 'ão'}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-sm font-bold px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Configurações Específicas (Acessórios / Selo Paranormal / Elemento) */}
        {(isAccessory || isSelo || needsElementTag) && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5">
            {isAccessory && (
              <>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                  <Icon name="briefcase" /> Configuração de Acessório (Cap. 3, p. 63–64)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">
                      Perícia Principal (
                      {(draft.modifications || []).includes('mod-aprimorado') ? '+5 Aprimorado' : '+2'}
                      )
                    </label>
                    <select
                      value={draft.accessoryConfig?.primarySkill || ''}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          accessoryConfig: {
                            ...(prev.accessoryConfig || {}),
                            accessoryType: ln.includes('vestimenta') ? 'vestimenta' : 'utensilio',
                            primarySkill: e.target.value || undefined,
                          },
                        }))
                      }
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">-- Selecione a Perícia --</option>
                      {ORDEM_ACCESSORY_ELIGIBLE_SKILLS.map((sk) => (
                        <option key={sk.id} value={sk.id}>
                          {sk.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(draft.modifications || []).includes('mod-funcao-adicional') && (
                    <div>
                      <label className="block text-[10px] text-amber-300 font-bold mb-1">
                        2ª Perícia — Função Adicional (
                        {(draft.modifications || []).includes('mod-aprimorado-extra')
                          ? '+5 Aprimorado'
                          : '+2'}
                        )
                      </label>
                      <select
                        value={draft.accessoryConfig?.secondarySkill || ''}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            accessoryConfig: {
                              ...(prev.accessoryConfig || {}),
                              secondarySkill: e.target.value || undefined,
                            },
                          }))
                        }
                        className="w-full bg-zinc-900 border border-amber-700/70 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="">-- Selecione a 2ª Perícia --</option>
                        {ORDEM_ACCESSORY_ELIGIBLE_SKILLS.map((sk) => (
                          <option key={sk.id} value={sk.id}>
                            {sk.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(draft.modifications || []).includes('mod-instrumental') && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-cyan-300 font-bold mb-1">
                        Kit de Perícia — Modificação Instrumental (elimina penalidade -5)
                      </label>
                      <select
                        value={draft.accessoryConfig?.instrumentalSkill || 'medicina'}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            accessoryConfig: {
                              ...(prev.accessoryConfig || {}),
                              instrumentalSkill: e.target.value || undefined,
                            },
                          }))
                        }
                        className="w-full bg-zinc-900 border border-cyan-700/70 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        {ORDEM_KIT_REQUIRED_SKILLS.map((k) => (
                          <option key={k.skillId} value={k.skillId}>
                            Kit de {k.skillName}
                          </option>
                        ))}
                        {ORDEM_ACCESSORY_ELIGIBLE_SKILLS.filter(
                          (sk) => !ORDEM_KIT_REQUIRED_SKILLS.some((k) => k.skillId === sk.id)
                        ).map((sk) => (
                          <option key={sk.id} value={sk.id}>
                            Kit de {sk.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

            {isSelo && (
              <>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-300">
                  <Icon name="sigil" /> Ritual Armazenado no Selo Paranormal (Cat. = Círculo)
                </span>
                <select
                  value={draft.storedRitualName || ''}
                  onChange={(e) => {
                    const chosen = spellEntries.find((s) => s.name === e.target.value);
                    if (!chosen) {
                      setDraft((prev) => ({ ...prev, storedRitualName: undefined }));
                      return;
                    }
                    const circle = chosen.metadata?.circle || 1;
                    const peCost = chosen.cost || (circle === 4 ? 10 : circle === 3 ? 6 : circle === 2 ? 3 : 1);
                    setDraft((prev) =>
                      syncDraftWithMeta({
                        ...prev,
                        baseCategory: circle,
                        category: circle,
                        storedRitualName: chosen.name,
                        storedRitualCircle: circle,
                        storedRitualCost: peCost,
                        storedRitualElement: chosen.metadata?.element,
                        storedRitualDescription: chosen.description,
                      })
                    );
                  }}
                  className="w-full bg-zinc-900 border border-purple-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="">-- Selecione o Ritual gravado no Selo --</option>
                  {spellEntries.map((sp) => (
                    <option key={sp.id} value={sp.name}>
                      {sp.name} ({sp.metadata?.circle || 1}ºC • {sp.cost || 1} PE)
                    </option>
                  ))}
                </select>
              </>
            )}

            {needsElementTag && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-purple-300 mb-1">
                  Elemento Associado ao Item
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ORDEM_ELEMENTS_FOUR.map((el) => (
                    <button
                      key={el}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, element: el }))}
                      aria-pressed={draft.element === el}
                      className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${elementChoiceClasses(el, draft.element === el)}`}
                    >
                      {el}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2 Abas Principais: Modificações Normais vs Maldições Paranormais */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('modifications')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'modifications'
                ? 'bg-amber-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon name="hammer" /> Modificações Normais (+I Cat.) [{(draft.modifications || []).length}]
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curses')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'curses'
                ? 'bg-purple-700 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon name="conhecimento" /> Maldições Paranormais (+II 1ª / +I) [{(draft.curses || []).length}]
          </button>
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {activeTab === 'modifications' ? (
            eligibleMods.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                Este tipo de item não possui modificações oficiais no Capítulo 3.
              </p>
            ) : (
              eligibleMods.map((mod) => {
                const isApplied = (draft.modifications || []).includes(mod.id);
                const check = isApplied
                  ? { allowed: true }
                  : canApplyModificationToItem(draft, mod);
                return (
                  <div
                    key={mod.id}
                    className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition ${
                      isApplied
                        ? 'bg-amber-950/35 border-amber-500/80'
                        : check.allowed
                        ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        : 'bg-zinc-950/50 border-zinc-900 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white">{mod.name}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60">
                          {mod.shortEffect}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">+I Cat.</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{mod.description}</p>
                      {!isApplied && !check.allowed && check.reason && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-red-400">
                          <Icon name="lock" /> {check.reason}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!isApplied && !check.allowed}
                      onClick={() => handleToggleModification(mod.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 transition ${
                        isApplied
                          ? 'bg-red-950/80 hover:bg-red-700 text-red-200 border-red-700 cursor-pointer'
                          : check.allowed
                          ? 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500 cursor-pointer'
                          : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                      }`}
                    >
                      {isApplied ? '✕ Remover' : '+ Aplicar'}
                    </button>
                  </div>
                );
              })
            )
          ) : (
            <>
              <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl px-3 py-2 text-[11px] text-purple-200 space-y-1">
                <p>
                  <Icon name="conhecimento" /> <strong>Regra de Maldições (Cap. 6, p. 144–145):</strong> A 1ª maldição aumenta a categoria em <strong>+II</strong>; cada maldição extra aumenta em <strong>+I</strong>. Elementos opressores não podem coexistir no mesmo item.
                </p>
                <p className="text-[10px] text-purple-300/90">
                  <strong>O Preço da Maldição:</strong> Conhecimento (falha INT) • Energia (falha AGI) • Morte (falha PRE) • Sangue (falha FOR/VIG) → <strong>-2 SAN por maldição</strong>.
                </p>
              </div>

              {eligibleCurses.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {['ALL', 'Sangue', 'Morte', 'Conhecimento', 'Energia'].map((el) => (
                    <button
                      key={el}
                      type="button"
                      onClick={() => setCurseElementFilter(el)}
                      aria-pressed={curseElementFilter === el}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        el === 'ALL'
                          ? curseElementFilter === el
                            ? 'border bg-zinc-800 border-zinc-500 text-zinc-100'
                            : 'border bg-transparent border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          : elementChoiceClasses(el, curseElementFilter === el)
                      }`}
                    >
                      {el === 'ALL' ? 'Todos os elementos' : el}
                    </button>
                  ))}
                </div>
              )}

              {filteredCurses.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">
                  Este tipo de item não aceita maldições de Armas, Proteções ou Acessórios.
                </p>
              ) : (
                filteredCurses.map((curse) => {
                  const appliedObj = (draft.curses || []).find((c) => c.curseId === curse.id);
                  const isApplied = Boolean(appliedObj);
                  const check = isApplied
                    ? { allowed: true }
                    : canApplyCurseToItem(draft, curse);
                  const isPending = pendingChoiceCurseId === curse.id;

                  return (
                    <div
                      key={curse.id}
                      className={`p-3 rounded-xl border flex flex-col gap-2 transition ${
                        isApplied
                          ? 'bg-purple-950/35 border-purple-500/80'
                          : check.allowed
                          ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                          : 'bg-zinc-950/50 border-zinc-900 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-white">{curse.name}</span>
                            <ElementBadge element={appliedObj?.chosenElement || curse.element} />
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-amber-300 border border-zinc-700">
                              {curse.shortEffect}
                            </span>
                            {appliedObj?.chosenRitualName && (
                              <span className="text-[10px] font-bold text-cyan-300">
                                <Icon name="sigil" /> {appliedObj.chosenRitualName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{curse.description}</p>
                          {!isApplied && !check.allowed && check.reason && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-red-400">
                              <Icon name="lock" /> {check.reason}
                            </span>
                          )}
                        </div>

                        {isApplied ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveCurse(curse.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-red-950/80 hover:bg-red-700 text-red-200 border-red-700 shrink-0 cursor-pointer"
                          >
                            ✕ Remover
                          </button>
                        ) : curse.requiresChoice ? (
                          <button
                            type="button"
                            disabled={!check.allowed}
                            onClick={() =>
                              setPendingChoiceCurseId(isPending ? null : curse.id)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${
                              check.allowed
                                ? 'bg-purple-700 hover:bg-purple-600 text-white border-purple-500 cursor-pointer'
                                : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                            }`}
                          >
                            {isPending ? 'Cancelar' : 'Escolher...'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!check.allowed}
                            onClick={() => handleAddCurse(curse.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border shrink-0 ${
                              check.allowed
                                ? 'bg-purple-700 hover:bg-purple-600 text-white border-purple-500 cursor-pointer'
                                : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                            }`}
                          >
                            + Amaldiçoar
                          </button>
                        )}
                      </div>

                      {isPending && curse.requiresChoice === 'element' && (
                        <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-purple-300">
                            Escolha o elemento:
                          </span>
                          {ORDEM_ELEMENTS_FOUR.map((el) => {
                            const elCheck = canApplyCurseToItem(draft, curse, el);
                            return (
                              <button
                                key={el}
                                type="button"
                                disabled={!elCheck.allowed}
                                title={elCheck.reason}
                                onClick={() => handleAddCurse(curse.id, el)}
                                className={`px-2.5 py-1 rounded text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${elementChoiceClasses(el, false)}`}
                              >
                                {el}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {isPending && curse.requiresChoice === 'ritual' && (
                        <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center gap-2">
                          <select
                            value={pendingRitualInput}
                            onChange={(e) => setPendingRitualInput(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-purple-700 rounded-lg px-2 py-1 text-xs text-white"
                          >
                            <option value="">-- Escolha um Ritual (ou deixe livre) --</option>
                            {spellEntries
                              .filter(
                                (sp) =>
                                  curse.id !== 'curse-acess-conjuracao' ||
                                  (sp.metadata?.circle || 1) === 1
                              )
                              .map((sp) => (
                                <option key={sp.id} value={sp.name}>
                                  {sp.name}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddCurse(
                                curse.id,
                                undefined,
                                pendingRitualInput || undefined
                              )
                            }
                            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Confirmar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(syncDraftWithMeta(draft));
              onClose();
            }}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow"
          >
            ✓ Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
