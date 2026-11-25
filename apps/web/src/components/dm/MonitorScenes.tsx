import { useState } from 'react';
import type { MonitorDirectorState, MonitorScenePreset } from '@totalrpg/shared';
import { PALETTE_CATALOG } from '../../theme/themeEngine';
import { ImageUploadField } from '../ImageUploadField';
import { Icon } from '../ui/Icon';

interface MonitorScenesProps {
  director: MonitorDirectorState;
  onChangeDirector: (updated: MonitorDirectorState) => void;
  /** Imagens já usadas na mesa: escolher uma delas não abre o seletor de arquivos */
  recentImages: string[];
}

type Draft = Omit<MonitorScenePreset, 'id'> & { id: string | null };

const EMPTY_DRAFT: Draft = { id: null, title: '', subtitle: '', backgroundUrl: '', palette: null };

function newId() {
  return `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Aplica a ambientação na TV (ou volta à tela padrão com `null`). */
function applyScene(director: MonitorDirectorState, scene: MonitorScenePreset | null): MonitorDirectorState {
  return {
    ...director,
    activeSceneId: scene?.id ?? null,
    sceneTitle: scene?.title ?? '',
    sceneSubtitle: scene?.subtitle ?? '',
    backgroundUrl: scene?.backgroundUrl ?? '',
    scenePalette: scene?.palette ?? null,
  };
}

function PaletteSwatch({ id }: { id: string | null }) {
  const meta = PALETTE_CATALOG.find((p) => p.id === id);
  if (!meta) {
    return <span className="inline-block w-3.5 h-3.5 rounded-full border border-zinc-600 bg-zinc-800" aria-hidden />;
  }
  return (
    <span
      className="inline-block w-3.5 h-3.5 rounded-full border border-black/40"
      style={{ background: `linear-gradient(135deg, ${meta.swatches.bg} 50%, ${meta.swatches.accent} 50%)` }}
      aria-hidden
    />
  );
}

export function MonitorScenes({ director, onChangeDirector, recentImages }: MonitorScenesProps) {
  const scenes = director.scenePresets || [];
  const activeId = director.activeSceneId ?? null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Cena configurada antes das ambientações salvas existirem (ou vinda de uma versão antiga)
  const hasUnsavedLegacy = !activeId && Boolean(director.sceneTitle || director.sceneSubtitle || director.backgroundUrl);

  function saveDraft() {
    if (!draft) return;
    const scene: MonitorScenePreset = {
      id: draft.id ?? newId(),
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      backgroundUrl: draft.backgroundUrl,
      palette: draft.palette,
    };
    const exists = scenes.some((s) => s.id === scene.id);
    const nextScenes = exists ? scenes.map((s) => (s.id === scene.id ? scene : s)) : [...scenes, scene];
    let next: MonitorDirectorState = { ...director, scenePresets: nextScenes };
    // Editou a ambientação que está na TV (ou criou uma nova): já aplica.
    if (!exists || activeId === scene.id) next = applyScene(next, scene);
    onChangeDirector(next);
    setDraft(null);
  }

  function deleteScene(id: string) {
    let next: MonitorDirectorState = { ...director, scenePresets: scenes.filter((s) => s.id !== id) };
    if (activeId === id) next = applyScene(next, null);
    onChangeDirector(next);
    setConfirmDeleteId(null);
    if (draft?.id === id) setDraft(null);
  }

  const canSave = Boolean(draft && (draft.title.trim() || draft.backgroundUrl));

  return (
    <section className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Icon name="clapperboard" /> Ambientações
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Fundo, título e paleta da TV. Prepare antes da sessão e troque com um clique.
          </p>
        </div>
        {!draft && (
          <button type="button" className="trpg-btn-secondary trpg-btn-sm" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
            <Icon name="plus" /> Nova ambientação
          </button>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
        {/* Tela padrão */}
        <button
          type="button"
          onClick={() => onChangeDirector(applyScene(director, null))}
          aria-pressed={!activeId && !hasUnsavedLegacy}
          className={`text-left rounded-lg border overflow-hidden transition ${
            !activeId && !hasUnsavedLegacy
              ? 'border-zinc-300 ring-1 ring-zinc-300'
              : 'border-zinc-800 hover:border-zinc-600'
          }`}
        >
          <div className="h-16 bg-zinc-900 flex items-center justify-center text-zinc-500">
            <Icon name="tv" />
          </div>
          <div className="px-2.5 py-2">
            <p className="text-sm font-semibold text-zinc-100 truncate">Tela padrão</p>
            <p className="text-xs text-zinc-500 truncate">Sem imagem, paleta da mesa</p>
          </div>
        </button>

        {hasUnsavedLegacy && (
          <div className="rounded-lg border border-zinc-300 ring-1 ring-zinc-300 overflow-hidden">
            <div
              className="h-16 bg-zinc-900 bg-cover bg-center"
              style={director.backgroundUrl ? { backgroundImage: `url(${director.backgroundUrl})` } : undefined}
            />
            <div className="px-2.5 py-2 flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-zinc-100 truncate">{director.sceneTitle || 'Cena atual'}</p>
              <button
                type="button"
                className="trpg-btn-quiet trpg-btn-sm self-start"
                onClick={() =>
                  setDraft({
                    id: null,
                    title: director.sceneTitle || '',
                    subtitle: director.sceneSubtitle || '',
                    backgroundUrl: director.backgroundUrl || '',
                    palette: director.scenePalette ?? null,
                  })
                }
              >
                <Icon name="save" /> Salvar esta cena
              </button>
            </div>
          </div>
        )}

        {scenes.map((scene) => {
          const isActive = activeId === scene.id;
          const paletteName = PALETTE_CATALOG.find((p) => p.id === scene.palette)?.name;
          return (
            <div
              key={scene.id}
              className={`rounded-lg border overflow-hidden flex flex-col transition ${
                isActive ? 'border-zinc-300 ring-1 ring-zinc-300' : 'border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <button
                type="button"
                onClick={() => onChangeDirector(applyScene(director, scene))}
                aria-pressed={isActive}
                className="text-left flex-1"
                title={isActive ? 'Na TV agora' : 'Mostrar na TV'}
              >
                <div
                  className="h-16 bg-zinc-900 bg-cover bg-center relative"
                  style={scene.backgroundUrl ? { backgroundImage: `url(${scene.backgroundUrl})` } : undefined}
                >
                  {isActive && (
                    <span className="absolute top-1.5 left-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-900">
                      Na TV
                    </span>
                  )}
                </div>
                <div className="px-2.5 pt-2">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{scene.title || 'Sem título'}</p>
                  <p className="text-xs text-zinc-500 truncate">{scene.subtitle || ' '}</p>
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                    <PaletteSwatch id={scene.palette} /> {paletteName || 'Paleta da mesa'}
                  </p>
                </div>
              </button>
              <div className="px-1.5 pb-1.5 pt-1 flex justify-end gap-1">
                {confirmDeleteId === scene.id ? (
                  <>
                    <button type="button" className="trpg-btn-danger trpg-btn-sm" onClick={() => deleteScene(scene.id)}>
                      Excluir
                    </button>
                    <button type="button" className="trpg-btn-quiet trpg-btn-sm" onClick={() => setConfirmDeleteId(null)}>
                      Manter
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="trpg-icon-btn !w-8 !h-8"
                      aria-label={`Editar ${scene.title || 'ambientação'}`}
                      onClick={() => setDraft({ ...scene })}
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      type="button"
                      className="trpg-icon-btn !w-8 !h-8 hover:!text-red-300"
                      aria-label={`Excluir ${scene.title || 'ambientação'}`}
                      onClick={() => setConfirmDeleteId(scene.id)}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {draft && (
        <div className="border border-zinc-700 rounded-lg p-3 flex flex-col gap-3 bg-zinc-900/60">
          <p className="text-sm font-semibold text-zinc-100">
            {draft.id ? 'Editar ambientação' : 'Nova ambientação'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              Título do local
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex.: Mansão Endiabrada"
                className="trpg-input"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              Subtítulo ou clima
              <input
                type="text"
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                placeholder="Ex.: Meia-noite, chuva forte"
                className="trpg-input"
              />
            </label>
          </div>
          <ImageUploadField
            label="Imagem de fundo"
            value={draft.backgroundUrl}
            onChange={(url) => setDraft({ ...draft, backgroundUrl: url })}
            recentImages={recentImages}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs text-zinc-300 mb-1">Paleta de cores na TV</legend>
            <div className="flex flex-wrap gap-1.5">
              {[{ id: null as string | null, name: 'Paleta da mesa' }, ...PALETTE_CATALOG].map((p) => {
                const selected = draft.palette === p.id;
                return (
                  <button
                    key={p.id ?? 'default'}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDraft({ ...draft, palette: p.id })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition ${
                      selected
                        ? 'border-zinc-300 bg-zinc-800 text-zinc-100'
                        : 'border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600'
                    }`}
                  >
                    <PaletteSwatch id={p.id} /> {p.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="trpg-btn-quiet trpg-btn-sm" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="button" className="trpg-btn-primary trpg-btn-sm" disabled={!canSave} onClick={saveDraft}>
              <Icon name="save" /> {draft.id ? 'Salvar alterações' : 'Salvar e mostrar na TV'}
            </button>
          </div>
          {!canSave && <p className="text-xs text-zinc-500 -mt-1">Dê um título ou escolha uma imagem para salvar.</p>}
        </div>
      )}
    </section>
  );
}
