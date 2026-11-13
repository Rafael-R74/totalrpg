import { RPGItem, PreparedAttack } from '@totalrpg/shared';

interface LootReceivedModalProps {
  loot: {
    item: RPGItem;
    attack?: PreparedAttack;
  } | null;
  onClose: () => void;
}

export function LootReceivedModal({ loot, onClose }: LootReceivedModalProps) {
  if (!loot) return null;

  const { item, attack } = loot;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border-2 border-emerald-500 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-emerald-950/50 flex flex-col items-center text-center gap-4"
      >
        {/* Ícone com Animação de Celebração */}
        <div className="w-20 h-20 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 flex items-center justify-center text-5xl animate-bounce shadow-inner">
          {attack ? '⚔️' : '🎁'}
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-extrabold">
            ✨ Novo Item Recebido no Inventário!
          </span>
          <h3 className="text-2xl font-extrabold text-white mt-1">
            {item.quantity > 1 ? `${item.quantity}x ` : ''}
            {item.name}
          </h3>
        </div>

        {/* Detalhes Técnicos do Item */}
        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-center items-center gap-3">
            <span className="text-xs font-mono bg-zinc-900 text-zinc-300 border border-zinc-700 px-2.5 py-1 rounded-lg">
              🎒 Espaços: <strong>{item.slots * (item.quantity || 1)}</strong>
              {item.quantity > 1 ? ` (${item.slots} cada)` : ''}
            </span>

            {attack && (
              <>
                <span className="text-xs font-mono bg-red-950/80 text-red-300 border border-red-800 px-2.5 py-1 rounded-lg font-bold">
                  🩸 Dano: {attack.damageFormula}
                </span>
                <span className="text-xs font-mono bg-amber-950/80 text-amber-300 border border-amber-800 px-2.5 py-1 rounded-lg">
                  🎯 Crítico: {attack.critRange}
                </span>
              </>
            )}
          </div>

          {item.description && (
            <p className="text-xs text-zinc-300 leading-relaxed mt-2 border-t border-zinc-800/80 pt-2">
              {item.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-900/40"
        >
          Guardar na Mochila ✓
        </button>
      </div>
    </div>
  );
}