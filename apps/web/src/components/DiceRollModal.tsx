import { useState, useEffect } from 'react';
import { DiceRollResult } from '@totalrpg/shared';

interface DiceRollModalProps {
  roll: DiceRollResult | null;
  onClose: () => void;
}

export function DiceRollModal({ roll, onClose }: DiceRollModalProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [fakeNumber, setFakeNumber] = useState(20);

  // Dispara a animação de dados girando toda vez que uma nova rolagem chega
  useEffect(() => {
    if (!roll) return;
    setIsAnimating(true);

    // Sorteia números rápidos a cada 60ms para criar efeito de rolagem
    const interval = setInterval(() => {
      setFakeNumber(Math.floor(Math.random() * 20) + 1);
    }, 60);

    // Encerra a animação após 750ms e revela o resultado oficial do servidor
    const timer = setTimeout(() => {
      clearInterval(interval);
      setIsAnimating(false);
    }, 750);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [roll]);

  if (!roll) return null;

  const highestRoll = Math.max(...roll.rolls);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border-2 border-amber-500/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center gap-4"
      >
        {/* Cabeçalho da Rolagem */}
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
            {roll.characterName}
          </span>
          <h3 className="text-lg font-extrabold text-white mt-0.5">{roll.label}</h3>
          <span className="text-xs font-mono text-zinc-500">Fórmula: {roll.formula}</span>
        </div>

        {/* Área Central: Animação de Rolagem vs Resultado Revelado */}
        {isAnimating ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="text-6xl animate-bounce">🎲</div>
            <div className="text-4xl font-extrabold font-mono text-zinc-400 animate-pulse">
              {fakeNumber}
            </div>
            <span className="text-xs text-amber-500 font-semibold tracking-wider uppercase animate-pulse">
              Rolando dados...
            </span>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center gap-4 w-full">
            {/* Total Final em Destaque */}
            <div className="w-28 h-28 rounded-2xl bg-zinc-950 border-2 border-amber-500 flex flex-col items-center justify-center shadow-lg shadow-amber-900/30">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Total</span>
              <span className="text-5xl font-extrabold font-mono text-white">{roll.total}</span>
            </div>

            {/* Dados Individuais Rolados */}
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
                Dados Rolados ({roll.rolls.length})
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {roll.rolls.map((val, idx) => {
                  const isKeptInOrdem =
                    roll.system === 'ordem-paranormal' && val === highestRoll && roll.rolls.length > 1;
                  return (
                    <span
                      key={idx}
                      className={`w-9 h-9 rounded-lg font-mono font-bold text-sm flex items-center justify-center border ${
                        val === 20
                          ? 'bg-amber-600/30 border-amber-400 text-amber-300'
                          : val === 1
                          ? 'bg-red-950/60 border-red-700 text-red-400'
                          : isKeptInOrdem
                          ? 'bg-zinc-800 border-amber-500/60 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {val}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}