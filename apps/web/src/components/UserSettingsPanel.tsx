import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react';
import { SystemId } from '@totalrpg/shared';
import {
  ART_DIRECTION_CATALOG,
  ArtDirectionId,
  DiceMode,
  PALETTE_CATALOG,
  PaletteId,
  useTheme,
} from '../theme/themeEngine';
import { SystemSigilBadge } from './BrandMark';
import { Icon } from './ui/Icon';

interface UserSettingsPanelProps {
  currentUser: { id: string; username: string; email: string };
  /** Dentro do diálogo rápido: sem título de página */
  embedded?: boolean;
}

const SYSTEM_LIST: Array<{ id: SystemId; label: string }> = [
  { id: 'ordem-paranormal', label: 'Ordem Paranormal' },
  { id: 'tormenta20', label: 'Tormenta 20' },
  { id: 'duna', label: 'Duna' },
];

const DIRECTION_SAMPLE_FONT: Record<ArtDirectionId, CSSProperties> = {
  dossier: { fontFamily: 'Gloock, serif' },
  grimoire: { fontFamily: 'Cinzel, serif', fontWeight: 600 },
  monolith: { fontFamily: 'Archivo, sans-serif', fontStretch: '125%', fontWeight: 300 },
  editorial: { fontFamily: 'Newsreader, serif', fontWeight: 500 },
};

function Section({ title, description, children, aside }: { title: string; description?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[16rem_1fr] lg:gap-10 py-7 first:pt-0 border-b border-zinc-800 last:border-b-0">
      <div>
        <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
        {description && <p className="text-sm text-zinc-400 mt-1 max-w-[38ch]">{description}</p>}
        {aside && <div className="mt-3">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-zinc-950 border border-zinc-800 p-1 gap-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            title={o.hint}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              active ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function UserSettingsPanel({ currentUser, embedded = false }: UserSettingsPanelProps) {
  const { preferences, effectivePalette, activeSystem, updatePreferences, updateSystemOverride, resetPreferences } =
    useTheme();
  const [notice, setNotice] = useState('');
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function saved(msg: string) {
    setNotice(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(''), 2400);
  }

  const overridesActive = preferences.autoSystemTheme && activeSystem;

  return (
    <div className="flex flex-col">
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6 mb-2 border-b border-zinc-800">
          <div>
            <h2 className="text-3xl">Configurações</h2>
            <p className="text-sm text-zinc-400 mt-1">Aparência, conforto visual e conta. Tudo é salvo automaticamente.</p>
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" className="min-h-0">
        {notice && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-emerald-950/60 border border-emerald-800/70 px-3 py-1.5 text-sm text-emerald-200">
            <Icon name="check" size={15} /> {notice}
          </div>
        )}
      </div>

      <Section
        title="Paleta"
        description="Cores de fundo, texto e ações. Vida, sanidade, esforço e elementos mantêm as mesmas cores em todas as paletas."
        aside={
          overridesActive ? (
            <p className="text-xs text-zinc-400 flex gap-1.5">
              <Icon name="info" size={14} className="mt-0.5 shrink-0" />
              Agora está valendo o tema do sistema aberto. Esta escolha vale fora de fichas e campanhas.
            </p>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {PALETTE_CATALOG.map((pal) => {
            const selected = preferences.palette === pal.id;
            const effective = effectivePalette === pal.id;
            return (
              <button
                key={pal.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  updatePreferences({ palette: pal.id as PaletteId });
                  saved(`Paleta "${pal.name}" aplicada.`);
                }}
                className={`group text-left rounded-xl border p-3 flex gap-3 items-center transition-colors ${
                  selected ? 'border-amber-500 bg-amber-950/30' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600'
                }`}
              >
                <span
                  className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-white/10"
                  style={{ background: pal.swatches.bg }}
                  aria-hidden="true"
                >
                  <span className="absolute inset-x-2 top-2 h-5 rounded" style={{ background: pal.swatches.surface }} />
                  <span className="absolute left-2 bottom-2 w-5 h-2 rounded-sm" style={{ background: pal.swatches.accent }} />
                  <span className="absolute left-3 top-3.5 w-6 h-0.5 rounded" style={{ background: pal.swatches.ink }} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 truncate">{pal.name}</span>
                    {effective && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Em uso agora" />}
                  </span>
                  <span className="block text-xs text-zinc-400 mt-0.5">{pal.recommendedSystemLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Tipografia e forma" description="O estilo dos títulos e o arredondamento dos painéis.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ART_DIRECTION_CATALOG.map((dir) => {
            const selected = preferences.artDirection === dir.id;
            return (
              <button
                key={dir.id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  updatePreferences({ artDirection: dir.id });
                  saved(`Estilo "${dir.name}" aplicado.`);
                }}
                className={`text-left rounded-xl border p-4 transition-colors ${
                  selected ? 'border-amber-500 bg-amber-950/30' : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600'
                }`}
              >
                <span className="block text-2xl text-zinc-100 leading-none" style={DIRECTION_SAMPLE_FONT[dir.id]}>
                  {dir.name}
                </span>
                <span className="block text-sm text-zinc-400 mt-2">{dir.description}</span>
                <span className="block text-xs text-zinc-500 mt-2">{dir.fontsLabel}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Tema por sistema"
        description="Ao abrir uma ficha ou campanha, a interface veste o tema daquele sistema. Ao voltar ao início, sua escolha acima volta."
      >
        <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 cursor-pointer">
          <span>
            <span className="block font-medium text-zinc-100">Trocar o tema automaticamente</span>
            <span className="block text-sm text-zinc-400">Recomendado para mestres que rodam mais de um sistema.</span>
          </span>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={preferences.autoSystemTheme}
            onChange={(e) => {
              updatePreferences({ autoSystemTheme: e.target.checked });
              saved(e.target.checked ? 'Tema automático ligado.' : 'Tema fixo em todos os sistemas.');
            }}
          />
          <span
            aria-hidden="true"
            className="relative w-11 h-6 shrink-0 rounded-full bg-zinc-700 transition-colors peer-checked:bg-amber-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-amber-500 after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-zinc-100 after:transition-transform peer-checked:after:translate-x-5"
          />
        </label>

        {preferences.autoSystemTheme && (
          <div className="mt-3 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {SYSTEM_LIST.map((sys) => {
              const preset = preferences.systemOverrides[sys.id];
              return (
                <div key={sys.id} className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr] items-center px-4 py-3">
                  <SystemSigilBadge system={sys.id} />
                  <label className="text-xs text-zinc-400">
                    <span className="sr-only">Paleta para {sys.label}</span>
                    <select
                      value={preset.palette}
                      onChange={(e) => {
                        updateSystemOverride(sys.id, { palette: e.target.value as PaletteId });
                        saved(`Paleta de ${sys.label} atualizada.`);
                      }}
                      className="trpg-input text-sm"
                    >
                      {PALETTE_CATALOG.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    <span className="sr-only">Estilo para {sys.label}</span>
                    <select
                      value={preset.artDirection}
                      onChange={(e) => {
                        updateSystemOverride(sys.id, { artDirection: e.target.value as ArtDirectionId });
                        saved(`Estilo de ${sys.label} atualizado.`);
                      }}
                      className="trpg-input text-sm"
                    >
                      {ART_DIRECTION_CATALOG.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Conforto" description="Para sessões longas, telas pequenas ou projeção na TV.">
        <dl className="grid gap-5">
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
            <dt className="text-sm font-medium text-zinc-200">Densidade</dt>
            <dd>
              <Segmented
                label="Densidade"
                value={preferences.density}
                onChange={(v) => {
                  updatePreferences({ density: v });
                  saved(v === 'compact' ? 'Modo compacto ligado.' : 'Modo confortável ligado.');
                }}
                options={[
                  { value: 'comfortable', label: 'Confortável' },
                  { value: 'compact', label: 'Compacta' },
                ]}
              />
            </dd>
          </div>
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
            <dt className="text-sm font-medium text-zinc-200">Luz de fundo</dt>
            <dd>
              <Segmented
                label="Luz de fundo"
                value={preferences.atmosphere}
                onChange={(v) => {
                  updatePreferences({ atmosphere: v });
                  saved('Fundo atualizado.');
                }}
                options={[
                  { value: 'subtle', label: 'Lamparina' },
                  { value: 'clean', label: 'Liso' },
                ]}
              />
            </dd>
          </div>
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
            <dt className="text-sm font-medium text-zinc-200">Movimento</dt>
            <dd>
              <Segmented
                label="Movimento"
                value={preferences.motion}
                onChange={(v) => {
                  updatePreferences({ motion: v });
                  saved(v === 'reduced' ? 'Movimento reduzido ligado.' : 'Animações completas ligadas.');
                }}
                options={[
                  { value: 'standard', label: 'Completo' },
                  { value: 'reduced', label: 'Reduzido' },
                ]}
              />
            </dd>
          </div>
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-center">
            <dt className="text-sm font-medium text-zinc-200">
              Dados 3D
              <span className="block text-xs font-normal text-zinc-500">Automático desliga em aparelhos mais fracos.</span>
            </dt>
            <dd>
              <Segmented<DiceMode>
                label="Dados 3D"
                value={preferences.dice}
                onChange={(v) => {
                  updatePreferences({ dice: v });
                  saved(v === '2d' ? 'Rolagens em 2D.' : v === '3d' ? 'Dados 3D sempre ligados.' : 'Dados 3D automáticos.');
                }}
                options={[
                  { value: 'auto', label: 'Automático' },
                  { value: '3d', label: 'Sempre 3D' },
                  { value: '2d', label: 'Só 2D' },
                ]}
              />
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="Conta">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 grid place-items-center text-sm font-semibold text-zinc-100">
              {currentUser.username.slice(0, 2).toUpperCase()}
            </span>
            <div className="leading-tight">
              <div className="font-semibold text-zinc-100">{currentUser.username}</div>
              <div className="text-sm text-zinc-400">{currentUser.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetPreferences();
              saved('Aparência restaurada para o padrão.');
            }}
            className="trpg-btn-quiet trpg-btn-sm"
          >
            <Icon name="undo" size={15} /> Restaurar aparência padrão
          </button>
        </div>
      </Section>
    </div>
  );
}
