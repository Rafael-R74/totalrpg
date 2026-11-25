import { useEffect, useState } from 'react';
import type { DMScreenCharacter } from '../../services/api';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

function PlayerAvatar({ char }: { char: DMScreenCharacter }) {
  return char.portraitUrl ? (
    <img src={char.portraitUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-zinc-700 shrink-0" />
  ) : (
    <span className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
      {char.name.substring(0, 2).toUpperCase()}
    </span>
  );
}

/** Mestre escolhe quais jogadores devem rolar a iniciativa (todos marcados por padrão). */
export function RequestInitiativeDialog({
  open,
  characters,
  inCombatIds,
  onClose,
  onConfirm,
}: {
  open: boolean;
  characters: DMScreenCharacter[];
  inCombatIds: Set<string>;
  onClose: () => void;
  onConfirm: (characterIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set(characters.map((c) => c.id)));
    // Só reinicia a seleção ao abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allSelected = characters.length > 0 && selected.size === characters.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Pedir iniciativa"
      description="Só os jogadores marcados recebem o pedido na ficha e aparecem na TV."
      footer={
        <>
          <button type="button" className="trpg-btn-quiet" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="trpg-btn-primary"
            disabled={selected.size === 0}
            onClick={() => onConfirm(characters.filter((c) => selected.has(c.id)).map((c) => c.id))}
          >
            <Icon name="zap" />{' '}
            {allSelected
              ? 'Pedir a todos'
              : `Pedir a ${selected.size} jogador${selected.size === 1 ? '' : 'es'}`}
          </button>
        </>
      }
    >
      {characters.length === 0 ? (
        <p className="text-sm text-zinc-400">Nenhum personagem de jogador nesta mesa.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <button
              type="button"
              className="trpg-btn-quiet trpg-btn-sm"
              onClick={() => setSelected(allSelected ? new Set() : new Set(characters.map((c) => c.id)))}
            >
              {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>
          {characters.map((char) => {
            const checked = selected.has(char.id);
            return (
              <label
                key={char.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
                  checked ? 'border-amber-500/70 bg-amber-950/20' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(char.id)}
                  className="w-4 h-4 accent-amber-500 shrink-0"
                />
                <PlayerAvatar char={char} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-100 truncate">{char.name}</span>
                  <span className="block text-xs text-zinc-500 truncate">@{char.owner.username}</span>
                </span>
                {inCombatIds.has(char.id) && (
                  <span className="trpg-badge shrink-0">Em combate</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

/** Mestre digita a iniciativa de cada jogador; quem ficar em branco não entra (ou mantém o valor atual). */
export function ManualInitiativeDialog({
  open,
  characters,
  currentInitiative,
  onClose,
  onConfirm,
}: {
  open: boolean;
  characters: DMScreenCharacter[];
  /** Iniciativa atual de quem já está em combate */
  currentInitiative: Map<string, number>;
  onClose: () => void;
  onConfirm: (entries: Array<{ characterId: string; initiative: number }>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    for (const c of characters) {
      const cur = currentInitiative.get(c.id);
      init[c.id] = cur !== undefined ? String(cur) : '';
    }
    setValues(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filled = characters
    .filter((c) => values[c.id] !== undefined && values[c.id].trim() !== '' && !Number.isNaN(Number(values[c.id])))
    .map((c) => ({ characterId: c.id, initiative: Math.trunc(Number(values[c.id])) }));
  const changed = filled.filter((e) => currentInitiative.get(e.characterId) !== e.initiative);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Iniciativa manual"
      description="Digite a iniciativa de quem entra no combate. Quem ficar em branco fica de fora."
      footer={
        <>
          <button type="button" className="trpg-btn-quiet" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="trpg-btn-primary"
            disabled={changed.length === 0}
            onClick={() => onConfirm(changed)}
          >
            <Icon name="swords" /> Colocar em combate
          </button>
        </>
      }
    >
      {characters.length === 0 ? (
        <p className="text-sm text-zinc-400">Nenhum personagem de jogador nesta mesa.</p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (changed.length > 0) onConfirm(changed);
          }}
        >
          {characters.map((char) => {
            const inCombat = currentInitiative.has(char.id);
            return (
              <div
                key={char.id}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950"
              >
                <PlayerAvatar char={char} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-100 truncate">{char.name}</span>
                  <span className="block text-xs text-zinc-500 truncate">
                    {inCombat ? 'Já em combate: altera a iniciativa' : `@${char.owner.username}`}
                  </span>
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`Iniciativa de ${char.name}`}
                  placeholder="INI"
                  value={values[char.id] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [char.id]: e.target.value }))}
                  className="trpg-input trpg-num text-center flex-none"
                  style={{ width: "5rem" }}
                />
              </div>
            );
          })}
          {/* Enter no campo confirma */}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </form>
      )}
    </Dialog>
  );
}
