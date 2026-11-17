import { useState, useEffect, useRef } from 'react';
import { DiceRollResult } from '@totalrpg/shared';

interface DiceRollModalProps {
  roll: DiceRollResult | null;
  batchRolls?: DiceRollResult[];
  onClose: () => void;
  onRerollOne?: (roll: DiceRollResult, dieIndex: number) => void;
  onRollDamage?: (roll: DiceRollResult, isCrit: boolean) => void;
  onRollForcaOpressora?: (roll: DiceRollResult, maneuver: 'empurrar' | 'derrubar') => void;
  onTriggerSegurarGatilhoShot?: (
    baseRoll: DiceRollResult,
    shotNumber: number,
    extraPeCost: number,
    aeAtkBonus: number,
    aeDmgBonus: number,
    nextStepAfterShot: number
  ) => boolean;
  onTriggerSegurarGatilhoDamageBatch?: (selectedAttackRolls: DiceRollResult[]) => void;
}

function clampBatchAeConfig(
  rawAtk: number,
  rawDmg: number,
  maxBonus: number
): { atk: number; dmg: number } {
  let atk = Math.max(0, Math.floor(rawAtk / 5) * 5);
  let dmg = Math.max(0, Math.floor(rawDmg / 5) * 5);
  if (atk + dmg > maxBonus) {
    const excess = atk + dmg - maxBonus;
    const takeDmg = Math.min(dmg, excess);
    dmg -= takeDmg;
    const rem = excess - takeDmg;
    if (rem > 0) atk = Math.max(0, atk - rem);
  }
  if (atk + dmg === 0 && maxBonus >= 5) {
    atk = 5;
  }
  return { atk, dmg };
}

export function DiceRollModal({
  roll,
  batchRolls,
  onClose,
  onRerollOne,
  onRollDamage,
  onRollForcaOpressora,
  onTriggerSegurarGatilhoShot,
  onTriggerSegurarGatilhoDamageBatch,
}: DiceRollModalProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [fakeNumber, setFakeNumber] = useState(20);

  // Estados do modo Segurar o Gatilho (Sequência de Disparos em Lote)
  const [spinningIds, setSpinningIds] = useState<Record<string, boolean>>({});
  const seenBatchIdsRef = useRef<Set<string>>(new Set());
  const [selectedHitIds, setSelectedHitIds] = useState<Record<string, boolean>>({});
  const [useAeOnNextShot, setUseAeOnNextShot] = useState(false);
  const [aeAtk, setAeAtk] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('totalrpg_last_ae_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.atk === 'number') return Math.max(0, parsed.atk);
      }
    } catch {
      // ignora erro de localStorage
    }
    return 5;
  });
  const [aeDmg, setAeDmg] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('totalrpg_last_ae_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.dmg === 'number') return Math.max(0, parsed.dmg);
      }
    } catch {
      // ignora erro de localStorage
    }
    return 0;
  });
  const [sgErrorMsg, setSgErrorMsg] = useState<string>('');

  const isSegurarGatilhoBatch = Boolean(
    roll &&
      (roll.attackDamagePayload?.segurarGatilhoPayload?.enabled ||
        (batchRolls && batchRolls.length > 0 && batchRolls.some((r) => Boolean(r.batchId))))
  );

  // Animação para rolagens unitárias comuns (não lote)
  useEffect(() => {
    if (!roll || isSegurarGatilhoBatch) return;
    setIsAnimating(true);

    const interval = setInterval(() => {
      setFakeNumber(Math.floor(Math.random() * 20) + 1);
    }, 60);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setIsAnimating(false);
    }, 750);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [roll, isSegurarGatilhoBatch]);

  // Controle de estado e animação por card quando estiver em Modo Sequência de Disparos (Lote)
  const currentBatchKey = roll?.batchId || '';
  useEffect(() => {
    seenBatchIdsRef.current.clear();
    setSpinningIds({});
    setSelectedHitIds({});
    setUseAeOnNextShot(false);
    setSgErrorMsg('');
  }, [currentBatchKey]);

  useEffect(() => {
    if (!roll || !isSegurarGatilhoBatch) return;
    const list = batchRolls && batchRolls.length > 0 ? batchRolls : [roll];

    const newOnes: DiceRollResult[] = [];
    list.forEach((item) => {
      if (!seenBatchIdsRef.current.has(item.id)) {
        seenBatchIdsRef.current.add(item.id);
        newOnes.push(item);
      }
    });

    if (newOnes.length > 0) {
      setSelectedHitIds((prev) => {
        const next = { ...prev };
        newOnes.forEach((item) => {
          if (item.batchRole !== 'segurar_gatilho_damage' && next[item.id] === undefined) {
            next[item.id] = true;
          }
        });
        return next;
      });

      setSpinningIds((prev) => {
        const next = { ...prev };
        newOnes.forEach((item) => {
          next[item.id] = true;
        });
        return next;
      });

      const timer = setTimeout(() => {
        setSpinningIds((prev) => {
          const next = { ...prev };
          newOnes.forEach((item) => {
            delete next[item.id];
          });
          return next;
        });
      }, 650);

      return () => clearTimeout(timer);
    }
  }, [roll, batchRolls, isSegurarGatilhoBatch]);

  if (!roll) return null;

  // =========================================================================
  // MODO SEQUÊNCIA DE DISPAROS (SEGURAR O GATILHO)
  // =========================================================================
  if (isSegurarGatilhoBatch) {
    const allBatch = batchRolls && batchRolls.length > 0 ? batchRolls : [roll];
    const attackRolls = allBatch.filter((r) => r.batchRole !== 'segurar_gatilho_damage');
    const damageRolls = allBatch.filter((r) => r.batchRole === 'segurar_gatilho_damage');
    const latestAttack = attackRolls[attackRolls.length - 1] || roll;
    const sg =
      latestAttack.attackDamagePayload?.segurarGatilhoPayload ||
      roll.attackDamagePayload?.segurarGatilhoPayload;

    const currentStep = sg ? sg.nextExtraShotStep : 1;
    const sgPeCost = currentStep * 2;
    const maxBonus = sg ? sg.maxAeTotalBonus : 5;
    const clampedAe = clampBatchAeConfig(aeAtk, aeDmg, maxBonus);
    const aeTotalInvested = clampedAe.atk + clampedAe.dmg;
    const aeSteps = aeTotalInvested / 5;
    const aePeCost = useAeOnNextShot && aeSteps > 0 ? 1 + aeSteps : 0;
    const totalShotPe = sgPeCost + aePeCost;

    const selectedAttackRolls = attackRolls.filter((r) => selectedHitIds[r.id] !== false);
    const isDamagePhase = damageRolls.length > 0;
    const totalBatchDamage = damageRolls.reduce((acc, d) => acc + d.total, 0);

    function updateBatchAe(nextRawAtk: number, nextRawDmg: number) {
      const valid = clampBatchAeConfig(nextRawAtk, nextRawDmg, maxBonus);
      setAeAtk(valid.atk);
      setAeDmg(valid.dmg);
      setSgErrorMsg('');
      try {
        if (valid.atk + valid.dmg > 0) {
          localStorage.setItem(
            'totalrpg_last_ae_config',
            JSON.stringify({ atk: valid.atk, dmg: valid.dmg })
          );
        }
      } catch {
        // ignora erro de localStorage
      }
    }

    return (
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border-2 border-orange-500/80 rounded-3xl max-w-5xl w-full p-6 shadow-2xl flex flex-col gap-5 my-auto"
        >
          {/* Cabeçalho da Sequência de Disparos */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-orange-400 font-extrabold">
                🔥 Segurar o Gatilho • {roll.characterName}
              </span>
              <h3 className="text-xl font-extrabold text-white mt-0.5">
                {sg?.weaponName || roll.attackDamagePayload?.weaponName || roll.label}
              </h3>
              <p className="text-xs text-zinc-400">
                {isDamagePhase
                  ? `Resultados de dano dos ${damageRolls.length} disparo(s) que acertaram`
                  : 'Dispare quantas vezes desejar, marque os ataques que acertaram e role todos os danos juntos.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-xl text-zinc-300 font-bold">
                🎯 {attackRolls.length} Disparo(s)
              </span>
              {isDamagePhase && (
                <span className="text-xs font-mono bg-red-950/80 border border-red-700 px-3 py-1 rounded-xl text-red-200 font-extrabold">
                  💥 Total: {totalBatchDamage}
                </span>
              )}
            </div>
          </div>

          {/* FASE 1: CARDS DE DISPAROS DE ATAQUE */}
          {!isDamagePhase ? (
            <>
              <div
                className={`grid gap-3 ${
                  attackRolls.length === 1
                    ? 'grid-cols-1 max-w-md mx-auto w-full'
                    : attackRolls.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                }`}
              >
                {attackRolls.map((atkRoll, idx) => {
                  const isSpinning = Boolean(spinningIds[atkRoll.id]);
                  const isZeroPenalty = atkRoll.formula.includes('2d20 (menor)');
                  const highest = Math.max(...atkRoll.rolls);
                  const keptNatural = isZeroPenalty ? Math.min(...atkRoll.rolls) : highest;
                  const p = atkRoll.attackDamagePayload;
                  const isCrit = Boolean(p && keptNatural >= p.critThreatMin);
                  const isSelected = selectedHitIds[atkRoll.id] !== false;
                  const shotNum = atkRoll.batchShotNumber || idx + 1;

                  return (
                    <div
                      key={atkRoll.id}
                      className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 transition-all ${
                        isSpinning
                          ? 'bg-zinc-950 border-amber-400 animate-pulse'
                          : isSelected
                          ? isCrit
                            ? 'bg-red-950/30 border-red-500 shadow-lg shadow-red-950/40'
                            : 'bg-zinc-950 border-amber-500/80 shadow-lg shadow-amber-950/30'
                          : 'bg-zinc-950/60 border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono uppercase font-extrabold text-amber-400">
                            #{shotNum}º Disparo
                          </span>
                          <p className="text-[11px] text-zinc-400 leading-snug mt-0.5 line-clamp-2">
                            {atkRoll.label}
                          </p>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {atkRoll.formula}
                          </span>
                        </div>
                        {!isSpinning && isCrit && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-red-600 text-white shadow shrink-0 animate-pulse">
                            💥 Crítico!
                          </span>
                        )}
                      </div>

                      {isSpinning ? (
                        <div className="py-6 flex flex-col items-center gap-2">
                          <span className="text-4xl animate-bounce">🎲</span>
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            Atirando...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-center gap-4 py-1">
                            <div
                              className={`w-20 h-20 rounded-2xl bg-zinc-900 border-2 flex flex-col items-center justify-center ${
                                isCrit ? 'border-red-500' : 'border-amber-500'
                              }`}
                            >
                              <span className="text-[9px] uppercase text-zinc-500 font-bold">
                                Acerto
                              </span>
                              <span className="text-3xl font-mono font-extrabold text-white">
                                {atkRoll.total}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 justify-center max-w-[140px]">
                              {atkRoll.rolls.map((val, dIdx) => {
                                const canReroll =
                                  val === 1 &&
                                  Boolean(atkRoll.hasAfortunado) &&
                                  !atkRoll.rerolledAfortunado &&
                                  Boolean(onRerollOne);
                                const isKept =
                                  atkRoll.system === 'ordem-paranormal' &&
                                  val === (isZeroPenalty ? keptNatural : highest) &&
                                  atkRoll.rolls.length > 1;
                                return (
                                  <button
                                    key={dIdx}
                                    type="button"
                                    disabled={!canReroll}
                                    onClick={() => canReroll && onRerollOne?.(atkRoll, dIdx)}
                                    title={
                                      canReroll
                                        ? 'Clique para rerrolar dado 1 (Afortunado)'
                                        : undefined
                                    }
                                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${
                                      val === 20
                                        ? 'bg-amber-600/30 border-amber-400 text-amber-200'
                                        : val === 1
                                        ? canReroll
                                          ? 'bg-red-950 border-red-500 text-red-200 cursor-pointer ring-2 ring-red-500/40'
                                          : 'bg-red-950/60 border-red-700 text-red-400'
                                        : isKept
                                        ? 'bg-zinc-800 border-amber-500/60 text-white'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedHitIds((prev) => ({
                                ...prev,
                                [atkRoll.id]: !isSelected,
                              }))
                            }
                            className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600/25 hover:bg-emerald-600/40 border-emerald-500 text-emerald-200'
                                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-400'
                            }`}
                          >
                            {isSelected
                              ? '✅ Acertou (Vai rolar dano)'
                              : '❌ Errou (Ignorar dano)'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Painel de Segurar o Gatilho — Disparo Extra */}
              {sg && onTriggerSegurarGatilhoShot && (
                <div className="bg-zinc-950 border border-orange-700/60 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                        🔥 Segurar o Gatilho — Disparo Extra ({attackRolls.length + 1}º Tiro)
                      </span>
                      <span className="text-[11px] font-mono bg-orange-950/80 border border-orange-700/60 text-orange-200 px-2 py-0.5 rounded font-bold">
                        Gatilho: {sgPeCost} PE
                      </span>
                    </div>

                    {sg.hasAtaqueEspecial && (
                      <label className="flex items-center gap-2 text-xs font-bold text-red-300 cursor-pointer bg-red-950/40 border border-red-800/60 px-3 py-1 rounded-lg">
                        <input
                          type="checkbox"
                          checked={useAeOnNextShot}
                          onChange={(e) => {
                            setUseAeOnNextShot(e.target.checked);
                            setSgErrorMsg('');
                          }}
                          className="accent-red-500 w-3.5 h-3.5"
                        />
                        ⚡ Combinar com Ataque Especial neste disparo
                      </label>
                    )}
                  </div>

                  {sg.hasAtaqueEspecial && useAeOnNextShot && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-300">🎯 +Acerto</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={clampedAe.atk <= 0}
                            onClick={() => updateBatchAe(Math.max(0, clampedAe.atk - 5), clampedAe.dmg)}
                            className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-35 text-zinc-200 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                          >
                            -5
                          </button>
                          <span className="text-xs font-mono font-extrabold text-white min-w-[3rem] text-center">
                            +{clampedAe.atk * sg.aeMult}
                          </span>
                          <button
                            type="button"
                            disabled={aeTotalInvested + 5 > maxBonus}
                            onClick={() => updateBatchAe(clampedAe.atk + 5, clampedAe.dmg)}
                            className="px-2 py-0.5 bg-zinc-950 hover:bg-amber-700 disabled:opacity-35 text-amber-300 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                          >
                            +5
                          </button>
                        </div>
                      </div>

                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-red-300">🩸 +Dano</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={clampedAe.dmg <= 0}
                            onClick={() => updateBatchAe(clampedAe.atk, Math.max(0, clampedAe.dmg - 5))}
                            className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-35 text-zinc-200 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                          >
                            -5
                          </button>
                          <span className="text-xs font-mono font-extrabold text-white min-w-[3rem] text-center">
                            +{clampedAe.dmg * sg.aeMult}
                          </span>
                          <button
                            type="button"
                            disabled={aeTotalInvested + 5 > maxBonus}
                            onClick={() => updateBatchAe(clampedAe.atk, clampedAe.dmg + 5)}
                            className="px-2 py-0.5 bg-zinc-950 hover:bg-red-700 disabled:opacity-35 text-red-300 border border-zinc-700 rounded text-xs font-mono font-bold cursor-pointer"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {sgErrorMsg && (
                    <div className="text-xs font-bold text-red-300 bg-red-950/70 border border-red-700 px-3 py-1.5 rounded-lg">
                      {sgErrorMsg}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-zinc-400">
                      Próximo disparo: {sg.baseAttackDice <= 0 ? '2d20(menor)' : `${sg.baseAttackDice}d20`}
                      {(() => {
                        const bonus =
                          sg.baseAttackBonus + (useAeOnNextShot ? clampedAe.atk * sg.aeMult : 0);
                        return bonus >= 0 ? `+${bonus}` : bonus;
                      })()}{' '}
                      (Custo total: {totalShotPe} PE • Limite: {sg.peTurnLimit} PE/turno)
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (useAeOnNextShot && aeTotalInvested <= 0) {
                          setSgErrorMsg(
                            'Escolha ao menos +5 em Acerto ou Dano para combinar o Ataque Especial, ou desmarque a opção.'
                          );
                          return;
                        }
                        if (totalShotPe > sg.peTurnLimit) {
                          setSgErrorMsg(
                            `⚠️ Custo total (${totalShotPe} PE) excede seu limite de ${sg.peTurnLimit} PE/turno!`
                          );
                          return;
                        }
                        const appliedAtk = useAeOnNextShot ? clampedAe.atk * sg.aeMult : 0;
                        const appliedDmg = useAeOnNextShot ? clampedAe.dmg * sg.aeMult : 0;
                        const ok = onTriggerSegurarGatilhoShot(
                          latestAttack,
                          attackRolls.length + 1,
                          totalShotPe,
                          appliedAtk,
                          appliedDmg,
                          currentStep + 1
                        );
                        if (!ok) {
                          setSgErrorMsg('⚠️ Pontos de Esforço (PE) insuficientes para este disparo!');
                        } else {
                          setSgErrorMsg('');
                        }
                      }}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow-lg shadow-orange-950/50"
                    >
                      🔥 Segurar o Gatilho: Atacar Novamente (-{totalShotPe} PE)
                    </button>
                  </div>
                </div>
              )}

              {/* Botões Finais da Fase 1 */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {onTriggerSegurarGatilhoDamageBatch && (
                  <button
                    type="button"
                    disabled={selectedAttackRolls.length === 0}
                    onClick={() => onTriggerSegurarGatilhoDamageBatch(selectedAttackRolls)}
                    className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg shadow-red-950/50"
                  >
                    💥 Finalizar e Rolar Dano dos Acertos ({selectedAttackRolls.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </>
          ) : (
            /* FASE 2: CARDS DE DANO EM LOTE + DANO TOTAL SOMADO */
            <>
              <div
                className={`grid gap-3 ${
                  damageRolls.length === 1
                    ? 'grid-cols-1 max-w-md mx-auto w-full'
                    : damageRolls.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                }`}
              >
                {damageRolls.map((dmgRoll, idx) => {
                  const isSpinning = Boolean(spinningIds[dmgRoll.id]);
                  const isCrit = Boolean(dmgRoll.batchIsCrit);
                  const shotNum = dmgRoll.batchShotNumber || idx + 1;

                  return (
                    <div
                      key={dmgRoll.id}
                      className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                        isSpinning
                          ? 'bg-zinc-950 border-red-400 animate-pulse'
                          : isCrit
                          ? 'bg-red-950/35 border-red-500 shadow-lg shadow-red-950/40'
                          : 'bg-zinc-950 border-amber-500/70 shadow-lg'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono uppercase font-extrabold text-amber-400">
                            #{shotNum}º Disparo
                          </span>
                          <p className="text-[11px] text-zinc-300 font-semibold mt-0.5">
                            {dmgRoll.formula}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg shrink-0 ${
                            isCrit
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                          }`}
                        >
                          {isCrit ? '💥 Crítico' : '🩸 Normal'}
                        </span>
                      </div>

                      {isSpinning ? (
                        <div className="py-5 flex flex-col items-center gap-2">
                          <span className="text-4xl animate-bounce">🎲</span>
                          <span className="text-xs font-mono text-red-300 font-bold">
                            Calculando dano...
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3 py-1">
                          <div
                            className={`w-20 h-20 rounded-2xl bg-zinc-900 border-2 flex flex-col items-center justify-center shrink-0 ${
                              isCrit ? 'border-red-500' : 'border-amber-500'
                            }`}
                          >
                            <span className="text-[9px] uppercase text-zinc-500 font-bold">
                              Dano
                            </span>
                            <span className="text-3xl font-mono font-extrabold text-white">
                              {dmgRoll.total}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {dmgRoll.rolls.map((val, dIdx) => {
                              const canReroll =
                                val === 1 &&
                                Boolean(dmgRoll.hasAfortunado) &&
                                !dmgRoll.rerolledAfortunado &&
                                Boolean(onRerollOne);
                              return (
                                <button
                                  key={dIdx}
                                  type="button"
                                  disabled={!canReroll}
                                  onClick={() => canReroll && onRerollOne?.(dmgRoll, dIdx)}
                                  title={
                                    canReroll
                                      ? 'Clique para rerrolar dado 1 (Afortunado)'
                                      : undefined
                                  }
                                  className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center border ${
                                    val === 1 && canReroll
                                      ? 'bg-red-950 border-red-500 text-red-200 cursor-pointer ring-2 ring-red-500/40'
                                      : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                                  }`}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Banner Inferior: Dano Total Somado */}
              <div className="bg-red-950/60 border-2 border-red-500 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-red-300 font-bold block">
                    Soma de Todos os Disparos ({damageRolls.length})
                  </span>
                  <span className="text-xs font-mono text-zinc-300">
                    {damageRolls.map((d) => d.total).join(' + ')} = {totalBatchDamage}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-red-200">
                    💥 Dano Total Causado:
                  </span>
                  <span className="text-4xl font-mono font-black text-white">
                    {totalBatchDamage}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODO UNITÁRIO PADRÃO
  // =========================================================================
  const isZeroDicePenalty = roll.formula.includes('2d20 (menor)');
  const highestRoll = Math.max(...roll.rolls);
  const keptNaturalRoll = isZeroDicePenalty ? Math.min(...roll.rolls) : highestRoll;

  const dmgPayload = roll.attackDamagePayload;
  const isCriticalHit = Boolean(dmgPayload && keptNaturalRoll >= dmgPayload.critThreatMin);
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
