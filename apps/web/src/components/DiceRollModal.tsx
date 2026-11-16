import { useState, useEffect } from 'react';
import { DiceRollResult } from '@totalrpg/shared';

interface DiceRollModalProps {
  roll: DiceRollResult | null;
  onClose: () => void;
  onRerollOne?: (roll: DiceRollResult, dieIndex: number) => void;
  onRollDamage?: (roll: DiceRollResult, isCrit: boolean) => void;
  onRollForcaOpressora?: (roll: DiceRollResult, maneuver: 'empurrar' | 'derrubar') => void;
}

export function DiceRollModal({
  roll,
  onClose,
  onRerollOne,
  onRollDamage,
  onRollForcaOpressora,
}: DiceRollModalProps) {
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

  const isZeroDicePenalty = roll.formula.includes('2d20 (menor)');
  const highestRoll = Math.max(...roll.rolls);
  const keptNaturalRoll = isZeroDicePenalty
    ? Math.min(...roll.rolls)
    : highestRoll;

  const dmgPayload = roll.attackDamagePayload;
  const isCriticalHit = Boolean(
    dmgPayload && keptNaturalRoll >= dmgPayload.critThreatMin
  );
  const dmgModStr =
    dmgPayload && dmgPayload.damageModifier !== 0
      ? dmgPayload.damageModifier > 0
        ? `+${dmgPayload.damageModifier}`
        : `${dmgPayload.damageModifier}`
      : '';

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
            {isCriticalHit && dmgPayload && (
              <div className="w-full py-1.5 px-3 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-black uppercase tracking-wider animate-pulse">
                💥 Acerto Crítico! (Dado natural {keptNaturalRoll} ≥ {dmgPayload.critThreatMin})
              </div>
            )}

            {/* Total Final em Destaque */}
            <div
              className={`w-28 h-28 rounded-2xl bg-zinc-950 border-2 flex flex-col items-center justify-center shadow-lg ${
                isCriticalHit
                  ? 'border-red-500 shadow-red-900/40'
                  : 'border-amber-500 shadow-amber-900/30'
              }`}
            >
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
                  const canRerollThisDie =
                    val === 1 &&
                    Boolean(roll.hasAfortunado) &&
                    !roll.rerolledAfortunado &&
                    !!onRerollOne;
                  return (
                    <button
                      type="button"
                      key={idx}
                      disabled={!canRerollThisDie}
                      onClick={() => {
                        if (canRerollThisDie && onRerollOne) {
                          onRerollOne(roll, idx);
                        }
                      }}
                      title={canRerollThisDie ? 'Clique para rerrolar este dado 1 (Poder Afortunado)' : undefined}
                      className={`w-9 h-9 rounded-lg font-mono font-bold text-sm flex items-center justify-center border transition ${
                        val === 20
                          ? 'bg-amber-600/30 border-amber-400 text-amber-300'
                          : val === 1
                          ? canRerollThisDie
                            ? 'bg-red-950/80 border-red-500 text-red-300 hover:bg-emerald-900/60 hover:border-emerald-400 hover:text-emerald-200 cursor-pointer ring-2 ring-red-500/40'
                            : 'bg-red-950/60 border-red-700 text-red-400'
                          : isKeptInOrdem
                          ? 'bg-zinc-800 border-amber-500/60 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>

              {Boolean(roll.hasAfortunado) &&
                !roll.rerolledAfortunado &&
                roll.rolls.includes(1) &&
                onRerollOne && (
                <button
                  type="button"
                  onClick={() => onRerollOne(roll, roll.rolls.indexOf(1))}
                  className="mt-2 w-full py-2 px-3 bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-500/60 text-emerald-200 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  🍀 Rerrolar dado "1" (Poder Afortunado — 1x por rolagem)
                </button>
              )}

              {roll.rerolledAfortunado && (
                <span className="mt-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  🍀 Dado 1 rerrolado com Afortunado!
                </span>
              )}
            </div>

            {/* Botão Direto de Rolagem de Dano / Dano Crítico após Rolagem de Acerto */}
            {dmgPayload && onRollDamage && (
              <button
                type="button"
                onClick={() => onRollDamage(roll, isCriticalHit)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider border transition cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                  isCriticalHit
                    ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white shadow-red-900/50 animate-pulse'
                    : 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white shadow-amber-900/40'
                }`}
              >
                {isCriticalHit
                  ? `💥 Rolar Dano Crítico (${dmgPayload.critDiceCount}d${dmgPayload.dieSides}${dmgModStr}) [x${dmgPayload.critMultiplier}]`
                  : `🩸 Rolar Dano (${dmgPayload.normalDiceCount}d${dmgPayload.dieSides}${dmgModStr})`}
              </button>
            )}

            {/* Força Opressora (Guerreiro 65%): Empurrar ou Derrubar após rolar Dano */}
            {roll.forcaOpressoraPayload && onRollForcaOpressora && (() => {
              const pushBonus = Math.floor(Math.max(0, roll.total) / 10) * 5;
              const fo = roll.forcaOpressoraPayload!;
              const totalEmpurrarBonus = fo.lutaBonus + pushBonus;
              const diceText =
                fo.lutaDiceCount <= 0 ? '2d20(menor)' : `${fo.lutaDiceCount}d20`;
              return (
                <div className="w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                    ⚔️ Força Opressora (Guerreiro 65% • -1 PE)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onRollForcaOpressora(roll, 'empurrar')}
                      className="py-2.5 px-2 bg-amber-600/20 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-600/60 rounded-lg text-xs font-extrabold transition cursor-pointer"
                      title={`Teste de Luta com +${pushBonus} (${roll.total} de dano) para Empurrar`}
                    >
                      🫸 Empurrar ({diceText}
                      {totalEmpurrarBonus >= 0 ? `+${totalEmpurrarBonus}` : totalEmpurrarBonus})
                    </button>
                    <button
                      type="button"
                      onClick={() => onRollForcaOpressora(roll, 'derrubar')}
                      className="py-2.5 px-2 bg-red-950/60 hover:bg-red-700 text-red-200 hover:text-white border border-red-700/60 rounded-lg text-xs font-extrabold transition cursor-pointer"
                      title="Teste de Luta para Derrubar"
                    >
                      🦵 Derrubar ({diceText}
                      {fo.lutaBonus >= 0 ? `+${fo.lutaBonus}` : fo.lutaBonus})
                    </button>
                  </div>
                </div>
              );
            })()}
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