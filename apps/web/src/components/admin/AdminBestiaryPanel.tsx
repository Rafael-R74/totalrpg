import { ReactNode, useMemo, useState } from 'react';
import {
  BestiaryCatalogEntry,
  CompendiumEntryData,
  OrdemBestiaryGroup,
  OrdemBestiaryTemplate,
  PreparedAttack,
  ThreatActionType,
  ThreatSkill,
  ThreatSpecialAbility,
  blankOrdemBestiaryTemplate,
  buildOrdemBestiaryCatalog,
  hiddenOrdemBestiaryEntries,
} from '@totalrpg/shared';
import { createCompendiumEntry, deleteCompendiumEntry, updateCompendiumEntry } from '../../services/api';
import { Dialog } from '../ui/Dialog';
import { ElementBadge, elementChoiceClasses } from '../ui/ElementBadge';
import { Icon } from '../ui/Icon';

interface AdminBestiaryPanelProps {
  entries: CompendiumEntryData[];
  onChanged: () => Promise<void> | void;
}

const ELEMENTS = ['Sangue', 'Morte', 'Conhecimento', 'Energia', 'Medo', 'Realidade'] as const;
const SIZES = ['Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Colossal'];
const ACTION_TYPES: ThreatActionType[] = ['Passiva', 'Livre', 'Movimento', 'Padrão', 'Reação', 'Completa'];

const ORIGIN_LABEL: Record<BestiaryCatalogEntry['origin'], string> = {
  official: 'Oficial',
  edited: 'Oficial editada',
  custom: 'Nova',
};

function groupFor(element: string): OrdemBestiaryGroup {
  const k = element.toLowerCase();
  return (['sangue', 'morte', 'conhecimento', 'energia', 'medo'] as const).find((g) => k.startsWith(g)) || 'realidade';
}

const uid = () => Math.random().toString(36).slice(2, 9);

/* ---------- campos pequenos reutilizados no editor ---------- */
function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="trpg-label">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, min }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="trpg-input trpg-num"
    />
  );
}

function TextInput({ value, onChange, placeholder }: { value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="trpg-input" />
  );
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      {action}
    </div>
  );
}

export function AdminBestiaryPanel({ entries, onChanged }: AdminBestiaryPanelProps) {
  const catalog = useMemo(() => buildOrdemBestiaryCatalog(entries), [entries]);
  const hidden = useMemo(() => hiddenOrdemBestiaryEntries(entries), [entries]);

  const [search, setSearch] = useState('');
  const [elementFilter, setElementFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<'ALL' | BestiaryCatalogEntry['origin']>('ALL');
  const [showHidden, setShowHidden] = useState(false);

  const [editing, setEditing] = useState<{ draft: OrdemBestiaryTemplate; source: BestiaryCatalogEntry | null } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<BestiaryCatalogEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const counts = useMemo(
    () => ({
      official: catalog.filter((c) => c.origin === 'official').length,
      edited: catalog.filter((c) => c.origin === 'edited').length,
      custom: catalog.filter((c) => c.origin === 'custom').length,
    }),
    [catalog]
  );

  const filtered = catalog.filter(({ template: t, origin }) => {
    if (originFilter !== 'ALL' && origin !== originFilter) return false;
    if (elementFilter !== 'ALL' && t.group !== elementFilter.toLowerCase()) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.subGroup.toLowerCase().includes(q) ||
      t.element.toLowerCase().includes(q) ||
      t.creatureType.toLowerCase().includes(q)
    );
  });

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice((m) => (m === msg ? '' : m)), 2600);
  }

  async function run(action: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      await onChanged();
      flash(okMsg);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar. Confira se sua conta é administradora.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!editing) return;
    const { draft, source } = editing;
    if (!draft.name.trim()) {
      setError('Dê um nome à criatura.');
      return;
    }
    const creature: OrdemBestiaryTemplate = {
      ...draft,
      name: draft.name.trim(),
      group: groupFor(draft.element),
      secondaryElements: draft.secondaryElements.filter((e) => e !== draft.element),
    };
    const ok = await run(async () => {
      if (source?.entryId) {
        await updateCompendiumEntry(source.entryId, {
          name: creature.name,
          description: creature.description,
          metadata: {
            creature,
            baseTemplateId: source.origin === 'edited' ? source.template.id : undefined,
          } as CompendiumEntryData['metadata'],
        });
      } else {
        await createCompendiumEntry({
          system: 'ordem-paranormal',
          category: 'creature',
          name: creature.name,
          description: creature.description,
          cost: 0,
          modifiers: [],
          metadata: {
            creature,
            baseTemplateId: source?.origin === 'official' ? source.template.id : undefined,
          } as CompendiumEntryData['metadata'],
        });
      }
    }, source ? `${creature.name} foi atualizada.` : `${creature.name} entrou no bestiário.`);
    if (ok) setEditing(null);
  }

  async function handleRemove(item: BestiaryCatalogEntry) {
    const name = item.template.name;
    const ok = await run(async () => {
      if (item.origin === 'custom' && item.entryId) {
        await deleteCompendiumEntry(item.entryId);
      } else if (item.origin === 'edited' && item.entryId) {
        await updateCompendiumEntry(item.entryId, {
          metadata: { baseTemplateId: item.template.id, hidden: true } as CompendiumEntryData['metadata'],
        });
      } else {
        await createCompendiumEntry({
          system: 'ordem-paranormal',
          category: 'creature',
          name: `${name} (oculta)`,
          description: '',
          cost: 0,
          modifiers: [],
          metadata: { baseTemplateId: item.template.id, hidden: true } as CompendiumEntryData['metadata'],
        });
      }
    }, item.origin === 'custom' ? `${name} foi excluída.` : `${name} saiu do bestiário. Você pode restaurá-la em "Ocultas".`);
    if (ok) setConfirmRemove(null);
  }

  /* ---------- helpers do rascunho ---------- */
  function patch(p: Partial<OrdemBestiaryTemplate>) {
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...p } } : e));
  }
  function patchList<K extends 'skills' | 'attacks' | 'specialAbilities'>(
    key: K,
    fn: (list: OrdemBestiaryTemplate[K]) => OrdemBestiaryTemplate[K]
  ) {
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, [key]: fn(e.draft[key]) } } : e));
  }

  const draft = editing?.draft;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-zinc-100">Bestiário de Ordem Paranormal</h3>
          <p className="text-sm text-zinc-400 mt-1">
            {counts.official} oficiais, {counts.edited} editadas e {counts.custom} novas. É este catálogo que os mestres veem na aba
            Ameaças do escudo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setEditing({ draft: { ...blankOrdemBestiaryTemplate(), id: '' }, source: null });
          }}
          className="trpg-btn-primary"
        >
          <Icon name="plus" size={17} /> Nova criatura
        </button>
      </div>

      <div role="status" aria-live="polite">
        {notice && (
          <p className="inline-flex items-center gap-2 rounded-md bg-emerald-950/60 border border-emerald-800/70 px-3 py-1.5 text-sm text-emerald-200">
            <Icon name="check" size={15} /> {notice}
          </p>
        )}
        {error && !editing && (
          <p role="alert" className="inline-flex items-center gap-2 rounded-md bg-red-950/50 border border-red-800/70 px-3 py-1.5 text-sm text-red-200">
            <Icon name="warning" size={15} /> {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, tipo ou grupo"
          className="trpg-input"
          aria-label="Buscar criatura"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={elementFilter === 'ALL'}
            onClick={() => setElementFilter('ALL')}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${
              elementFilter === 'ALL' ? 'bg-zinc-800 border-zinc-500 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Todos
          </button>
          {ELEMENTS.map((el) => (
            <button
              key={el}
              type="button"
              aria-pressed={elementFilter === el}
              onClick={() => setElementFilter(el)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                el === 'Realidade'
                  ? `border ${elementFilter === el ? 'bg-zinc-800 border-zinc-500 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'}`
                  : elementChoiceClasses(el, elementFilter === el)
              }`}
            >
              {el}
            </button>
          ))}
          <span className="w-px bg-zinc-800 mx-1" aria-hidden="true" />
          {(['ALL', 'official', 'edited', 'custom'] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={originFilter === o}
              onClick={() => setOriginFilter(o)}
              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                originFilter === o ? 'bg-zinc-800 border-zinc-500 text-zinc-100' : 'border-zinc-800 text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {o === 'ALL' ? 'Qualquer origem' : ORIGIN_LABEL[o]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 px-6 py-10 text-center text-sm text-zinc-400">
          Nenhuma criatura com esses filtros.
        </p>
      ) : (
        <ul className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
          {filtered.map((item) => {
            const t = item.template;
            return (
              <li key={t.id} className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 bg-zinc-950/30 hover:bg-zinc-900/60">
                <span className="trpg-num text-sm font-semibold text-red-200 bg-red-950/60 border border-red-900 rounded px-2 py-0.5 w-16 text-center shrink-0">
                  VD {t.vd}
                </span>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="text-lg trpg-display text-zinc-100 leading-tight truncate">{t.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {t.creatureType}, {t.size.toLowerCase()}, {t.subGroup}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ElementBadge element={t.element} />
                  <span
                    className={`trpg-badge ${
                      item.origin === 'custom'
                        ? 'bg-emerald-950/70! text-emerald-200!'
                        : item.origin === 'edited'
                        ? 'bg-sky-950/70! text-sky-200!'
                        : ''
                    }`}
                  >
                    {ORIGIN_LABEL[item.origin]}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setEditing({ draft: structuredClone(t), source: item });
                    }}
                    className="trpg-btn-secondary trpg-btn-sm"
                  >
                    <Icon name="pencil" size={14} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setEditing({
                        draft: { ...structuredClone(t), id: '', name: `${t.name} (cópia)` },
                        source: null,
                      });
                    }}
                    className="trpg-icon-btn"
                    aria-label={`Duplicar ${t.name}`}
                    title="Duplicar"
                  >
                    <Icon name="package" size={16} />
                  </button>
                  {item.origin === 'edited' && item.entryId && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => deleteCompendiumEntry(item.entryId!), `${t.name} voltou à versão oficial.`)}
                      className="trpg-icon-btn"
                      aria-label={`Desfazer edições de ${t.name}`}
                      title="Voltar à versão oficial"
                    >
                      <Icon name="undo" size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(item)}
                    className="trpg-icon-btn hover:text-red-300!"
                    aria-label={item.origin === 'custom' ? `Excluir ${t.name}` : `Ocultar ${t.name}`}
                    title={item.origin === 'custom' ? 'Excluir' : 'Tirar do bestiário'}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hidden.length > 0 && (
        <div className="rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-300"
          >
            Ocultas ({hidden.length})
            <Icon name={showHidden ? 'chevron-up' : 'chevron-down'} size={16} />
          </button>
          {showHidden && (
            <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
              {hidden.map((h) => (
                <li key={h.entryId} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">
                    {h.template.name} <span className="text-zinc-500">VD {h.template.vd}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => deleteCompendiumEntry(h.entryId), `${h.template.name} voltou ao bestiário.`)}
                    className="trpg-btn-quiet trpg-btn-sm"
                  >
                    <Icon name="undo" size={14} /> Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Confirmar remoção */}
      <Dialog
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        size="sm"
        title={confirmRemove?.origin === 'custom' ? 'Excluir criatura?' : 'Tirar do bestiário?'}
        footer={
          <>
            <button type="button" onClick={() => setConfirmRemove(null)} className="trpg-btn-quiet">
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
              className="trpg-btn-danger"
            >
              {confirmRemove?.origin === 'custom' ? 'Excluir' : 'Tirar do bestiário'}
            </button>
          </>
        }
      >
        {confirmRemove && (
          <p className="text-sm text-zinc-300">
            {confirmRemove.origin === 'custom'
              ? `${confirmRemove.template.name} será apagada do compêndio. Ameaças já salvas nas mesas continuam lá.`
              : `${confirmRemove.template.name} some do catálogo dos mestres, mas a versão oficial fica guardada e pode ser restaurada em "Ocultas".`}
          </p>
        )}
      </Dialog>

      {/* Editor */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="xl"
        title={editing?.source ? `Editar ${editing.source.template.name}` : 'Nova criatura'}
        description={
          editing?.source?.origin === 'official'
            ? 'Suas mudanças substituem a versão oficial no catálogo. Dá para voltar à original depois.'
            : 'Os campos seguem a ficha de ameaça do livro.'
        }
        footer={
          <>
            {error && (
              <p role="alert" className="mr-auto text-sm text-red-300 flex items-center gap-1.5">
                <Icon name="warning" size={15} /> {error}
              </p>
            )}
            <button type="button" onClick={() => setEditing(null)} className="trpg-btn-quiet">
              Cancelar
            </button>
            <button type="button" disabled={busy} onClick={handleSave} className="trpg-btn-primary">
              <Icon name="save" size={16} /> {busy ? 'Salvando…' : 'Salvar criatura'}
            </button>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-5">
            <SectionTitle title="Identificação" />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="Nome" className="sm:col-span-3">
                <TextInput value={draft.name} onChange={(v) => patch({ name: v })} />
              </Field>
              <Field label="VD">
                <NumberInput value={draft.vd} min={0} onChange={(n) => patch({ vd: n })} />
              </Field>
              <div className="sm:col-span-4">
                <span className="trpg-label">Elemento</span>
                <div role="radiogroup" aria-label="Elemento" className="flex flex-wrap gap-1.5">
                  {ELEMENTS.map((el) => (
                    <button
                      key={el}
                      type="button"
                      role="radio"
                      aria-checked={draft.element === el}
                      onClick={() => patch({ element: el })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
                        el === 'Realidade'
                          ? `border ${draft.element === el ? 'bg-zinc-700 border-zinc-400 text-zinc-100' : 'border-zinc-700 text-zinc-300'}`
                          : elementChoiceClasses(el, draft.element === el)
                      }`}
                    >
                      {el}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-4">
                <span className="trpg-label">Elementos secundários</span>
                <div className="flex flex-wrap gap-1.5">
                  {ELEMENTS.filter((e) => e !== 'Realidade' && e !== draft.element).map((el) => {
                    const on = draft.secondaryElements.includes(el);
                    return (
                      <button
                        key={el}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          patch({
                            secondaryElements: on
                              ? draft.secondaryElements.filter((x) => x !== el)
                              : [...draft.secondaryElements, el],
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${elementChoiceClasses(el, on)}`}
                      >
                        {on ? '' : '+ '}
                        {el}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="Tipo">
                <TextInput value={draft.creatureType} onChange={(v) => patch({ creatureType: v })} placeholder="Criatura, Pessoa, Animal" />
              </Field>
              <Field label="Tamanho">
                <select value={draft.size} onChange={(e) => patch({ size: e.target.value })} className="trpg-input">
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grupo" className="sm:col-span-2">
                <TextInput value={draft.subGroup} onChange={(v) => patch({ subGroup: v })} placeholder="Criatura Paranormal, Criminosos" />
              </Field>
            </div>

            <SectionTitle title="Combate" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="PV">
                <NumberInput value={draft.hpMax} min={1} onChange={(n) => patch({ hpMax: n })} />
              </Field>
              <Field label="Machucado (PV)">
                <NumberInput value={draft.machucadoHp} min={0} onChange={(n) => patch({ machucadoHp: n })} />
              </Field>
              <Field label="Defesa">
                <NumberInput value={draft.defense} min={0} onChange={(n) => patch({ defense: n })} />
              </Field>
              <Field label="Deslocamento">
                <TextInput value={draft.displacement} onChange={(v) => patch({ displacement: v })} />
              </Field>
              <Field label="Iniciativa (dados)">
                <NumberInput value={draft.initiativeDice} min={0} onChange={(n) => patch({ initiativeDice: n })} />
              </Field>
              <Field label="Iniciativa (bônus)">
                <NumberInput value={draft.initiativeBonus} onChange={(n) => patch({ initiativeBonus: n })} />
              </Field>
              <Field label="Sentidos" className="col-span-2">
                <TextInput value={draft.senses} onChange={(v) => patch({ senses: v })} />
              </Field>
              <Field label="Resistências" className="col-span-2">
                <TextInput value={draft.resistances} onChange={(v) => patch({ resistances: v })} />
              </Field>
              <Field label="Imunidades">
                <TextInput value={draft.immunities} onChange={(v) => patch({ immunities: v })} />
              </Field>
              <Field label="Vulnerabilidades">
                <TextInput value={draft.vulnerabilities} onChange={(v) => patch({ vulnerabilities: v })} />
              </Field>
            </div>

            <SectionTitle title="Atributos" />
            <div className="grid grid-cols-5 gap-2">
              {(['agi', 'for', 'int', 'pre', 'vig'] as const).map((a) => (
                <Field key={a} label={a.toUpperCase()}>
                  <NumberInput
                    value={draft.attributes[a]}
                    onChange={(n) => patch({ attributes: { ...draft.attributes, [a]: n } })}
                  />
                </Field>
              ))}
            </div>

            <SectionTitle
              title={`Perícias (${draft.skills.length})`}
              action={
                <button
                  type="button"
                  onClick={() => patchList('skills', (l) => [...l, { id: uid(), name: '', diceCount: 1, bonus: 0 } as ThreatSkill])}
                  className="trpg-btn-quiet trpg-btn-sm"
                >
                  <Icon name="plus" size={14} /> Perícia
                </button>
              }
            />
            {draft.skills.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 items-end">
                <Field label="Nome">
                  <TextInput value={s.name} onChange={(v) => patchList('skills', (l) => l.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
                </Field>
                <Field label="Dados">
                  <NumberInput value={s.diceCount} min={0} onChange={(n) => patchList('skills', (l) => l.map((x, j) => (j === i ? { ...x, diceCount: n } : x)))} />
                </Field>
                <Field label="Bônus">
                  <NumberInput value={s.bonus} onChange={(n) => patchList('skills', (l) => l.map((x, j) => (j === i ? { ...x, bonus: n } : x)))} />
                </Field>
                <button type="button" onClick={() => patchList('skills', (l) => l.filter((_, j) => j !== i))} className="trpg-icon-btn" aria-label={`Remover ${s.name || 'perícia'}`}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}

            <SectionTitle
              title={`Ataques (${draft.attacks.length})`}
              action={
                <button
                  type="button"
                  onClick={() =>
                    patchList('attacks', (l) => [
                      ...l,
                      { id: uid(), name: '', diceCount: 1, attackBonus: 0, damageFormula: '1d6', critRange: '20/x2', damageType: 'Impacto', isMelee: true, range: 'Corpo a corpo' } as PreparedAttack,
                    ])
                  }
                  className="trpg-btn-quiet trpg-btn-sm"
                >
                  <Icon name="plus" size={14} /> Ataque
                </button>
              }
            />
            {draft.attacks.map((a, i) => {
              const set = (p: Partial<PreparedAttack>) => patchList('attacks', (l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <div key={a.id} className="rounded-lg border border-zinc-800 p-3 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                  <Field label="Nome" className="col-span-2">
                    <TextInput value={a.name} onChange={(v) => set({ name: v })} />
                  </Field>
                  <Field label="Dados">
                    <NumberInput value={a.diceCount} min={0} onChange={(n) => set({ diceCount: n })} />
                  </Field>
                  <Field label="Bônus">
                    <NumberInput value={a.attackBonus} onChange={(n) => set({ attackBonus: n })} />
                  </Field>
                  <Field label="Dano">
                    <TextInput value={a.damageFormula} onChange={(v) => set({ damageFormula: v })} placeholder="2d6+4" />
                  </Field>
                  <Field label="Crítico">
                    <TextInput value={a.critRange} onChange={(v) => set({ critRange: v })} placeholder="19/x2" />
                  </Field>
                  <Field label="Tipo de dano" className="col-span-2">
                    <TextInput value={a.damageType} onChange={(v) => set({ damageType: v })} />
                  </Field>
                  <Field label="Alcance" className="col-span-2">
                    <TextInput value={(a as PreparedAttack & { range?: string }).range} onChange={(v) => set({ range: v } as Partial<PreparedAttack>)} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 pb-2">
                    <input type="checkbox" checked={Boolean(a.isMelee)} onChange={(e) => set({ isMelee: e.target.checked })} className="w-4 h-4 accent-amber-500" />
                    Corpo a corpo
                  </label>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => patchList('attacks', (l) => l.filter((_, j) => j !== i))} className="trpg-icon-btn" aria-label={`Remover ${a.name || 'ataque'}`}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            <SectionTitle
              title={`Habilidades (${draft.specialAbilities.length})`}
              action={
                <button
                  type="button"
                  onClick={() =>
                    patchList('specialAbilities', (l) => [...l, { id: uid(), name: '', actionType: 'Padrão', description: '' } as ThreatSpecialAbility])
                  }
                  className="trpg-btn-quiet trpg-btn-sm"
                >
                  <Icon name="plus" size={14} /> Habilidade
                </button>
              }
            />
            {draft.specialAbilities.map((ab, i) => {
              const set = (p: Partial<ThreatSpecialAbility>) =>
                patchList('specialAbilities', (l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <div key={ab.id} className="rounded-lg border border-zinc-800 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Field label="Nome" className="col-span-2">
                    <TextInput value={ab.name} onChange={(v) => set({ name: v })} />
                  </Field>
                  <Field label="Ação">
                    <select value={ab.actionType} onChange={(e) => set({ actionType: e.target.value as ThreatActionType })} className="trpg-input">
                      {ACTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dano (opcional)">
                    <TextInput value={ab.damageFormula} onChange={(v) => set({ damageFormula: v || undefined })} placeholder="3d6" />
                  </Field>
                  <Field label="Descrição" className="col-span-2 sm:col-span-4">
                    <textarea value={ab.description} onChange={(e) => set({ description: e.target.value })} rows={2} className="trpg-input" />
                  </Field>
                  <div className="col-span-2 sm:col-span-4 flex justify-end -mt-1">
                    <button type="button" onClick={() => patchList('specialAbilities', (l) => l.filter((_, j) => j !== i))} className="trpg-btn-quiet trpg-btn-sm">
                      <Icon name="trash" size={14} /> Remover habilidade
                    </button>
                  </div>
                </div>
              );
            })}

            <SectionTitle title="Enigma de Medo e descrição" />
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={draft.hasEnigmaOfFear}
                onChange={(e) => patch({ hasEnigmaOfFear: e.target.checked })}
                className="w-4 h-4 accent-amber-500"
              />
              Esta criatura tem Enigma de Medo
            </label>
            {draft.hasEnigmaOfFear && (
              <Field label="Enigma de Medo">
                <textarea value={draft.enigmaOfFear || ''} onChange={(e) => patch({ enigmaOfFear: e.target.value })} rows={2} className="trpg-input" />
              </Field>
            )}
            <Field label="Descrição">
              <textarea value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={4} className="trpg-input" />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
}
