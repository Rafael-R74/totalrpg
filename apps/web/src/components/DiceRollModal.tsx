import { useState, useEffect, useRef } from 'react';
import { DiceRollResult } from '@totalrpg/shared';
import { Dialog } from './ui/Dialog';
import { Icon, stripEmoji } from './ui/Icon';
import { DiceStage } from './dice/DiceStage';
import { DieFace2D } from './dice/DieFace2D';

interface DiceRollModalProps {
  roll: DiceRollResult | null;
  batchRolls?: DiceRollResult[];
  onClose: () => void;
  onRerollOne?: (roll: DiceRollResult, dieIndex: number) => void;
  onMapaCelesteReroll?: (roll: DiceRollResult) => boolean;
  onMapaCelesteChoose?: (roll: DiceRollResult, chosenIndex: 1 | 2) => void;
  onRollDamage?: (roll: DiceRollResult, isCrit: boolean) => void;
  onRollRitualEffect?: (roll: DiceRollResult) => void;
  onRollForcaOpressora?: (roll: DiceRollResult, maneuver: 'empurrar' | 'derrubar') => void;
  onApplyCurseSanLoss?: (roll: DiceRollResult) => void;
  onRollSanguinariaTempHp?: (roll: DiceRollResult) => void;
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

function clampBatchAeConfig(rawAtk: number, rawDmg: number, maxBonus: number): { atk: number; dmg: number } {
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

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

/** Linha de aviso/efeito pós-rolagem (mesmo formato para todos os casos) */
function Notice({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'paranormal' | 'danger' | 'success' | 'warning' | 'info';
  icon: string;
  title?: string;
  children?: React.ReactNode;
}) {
  const toneClass = {
    paranormal: 'border-purple-800/70 bg-purple-950/40 text-purple-100',
    danger: 'border-red-800/70 bg-red-950/40 text-red-100',
    success: 'border-emerald-800/70 bg-emerald-950/40 text-emerald-100',
    warning: 'border-orange-800/70 bg-orange-950/35 text-orange-100',
    info: 'border-zinc-700 bg-zinc-950/50 text-zinc-200',
  }[tone];
  const iconClass = {
    paranormal: 'text-purple-300',
    danger: 'text-red-300',
    success: 'text-emerald-300',
    warning: 'text-orange-300',
    info: 'text-zinc-400',
  }[tone];
  return (
    <div className={`rounded-lg border px-3.5 py-3 text-sm flex gap-3 ${toneClass}`}>
      <Icon name={icon} size={18} className={`mt-0.5 ${iconClass}`} />
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        {title && <p className="font-semibold leading-snug">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function DiceRollModal({
  roll,
  batchRolls,
  onClose,
  onRerollOne,
  onMapaCelesteReroll,
  onMapaCelesteChoose,
  onRollDamage,
  onRollRitualEffect,
  onRollForcaOpressora,
  onApplyCurseSanLoss,
  onRollSanguinariaTempHp,
  onTriggerSegurarGatilhoShot,
  onTriggerSegurarGatilhoDamageBatch,
}: DiceRollModalProps) {
  const [settledKey, setSettledKey] = useState('');
  const [curseSanAppliedForRollId, setCurseSanAppliedForRollId] = useState<string>('');
  const [sanguinariaRolledForRollId, setSanguinariaRolledForRollId] = useState<string>('');
  const [mapaCelesteError, setMapaCelesteError] = useState<string>('');

  useEffect(() => {
    setMapaCelesteError('');
  }, [roll?.id]);

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
    const sg = latestAttack.attackDamagePayload?.segurarGatilhoPayload || roll.attackDamagePayload?.segurarGatilhoPayload;

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
          localStorage.setItem('totalrpg_last_ae_config', JSON.stringify({ atk: valid.atk, dmg: valid.dmg }));
        }
      } catch {
        // ignora erro de localStorage
      }
    }

    const gridCols = (n: number) =>
      n === 1 ? 'grid-cols-1 max-w-sm mx-auto w-full' : n === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';

    return (
      <Dialog
        open
        onClose={onClose}
        size="xl"
        title={sg?.weaponName || roll.attackDamagePayload?.weaponName || stripEmoji(roll.label)}
        description={
          isDamagePhase
            ? `${roll.characterName}: dano dos ${damageRolls.length} disparos que acertaram.`
            : `${roll.characterName} segura o gatilho. Marque os disparos que acertaram e role o dano de todos de uma vez.`
        }
        headerAside={
          <span className="trpg-badge trpg-num shrink-0 mt-1">
            <Icon name="crosshair" size={13} /> {attackRolls.length} {attackRolls.length === 1 ? 'disparo' : 'disparos'}
          </span>
        }
        footer={
          !isDamagePhase ? (
            <>
              <button type="button" onClick={onClose} className="trpg-btn-quiet">
                Fechar
              </button>
              {onTriggerSegurarGatilhoDamageBatch && (
                <button
                  type="button"
                  disabled={selectedAttackRolls.length === 0}
                  onClick={() => onTriggerSegurarGatilhoDamageBatch(selectedAttackRolls)}
                  className="trpg-btn-primary"
                >
                  <Icon name="burst" size={17} /> Rolar dano de {selectedAttackRolls.length}{' '}
                  {selectedAttackRolls.length === 1 ? 'acerto' : 'acertos'}
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={onClose} className="trpg-btn-secondary">
              Fechar
            </button>
          )
        }
      >
        {!isDamagePhase ? (
          <div className="flex flex-col gap-5">
            <div className={`grid gap-3 ${gridCols(attackRolls.length)}`}>
              {attackRolls.map((atkRoll, idx) => {
                const isSpinning = Boolean(spinningIds[atkRoll.id]);
                const isZeroPenalty = atkRoll.formula.includes('2d20 (menor)');
                const highest = Math.max(...atkRoll.rolls);
                const keptNatural = isZeroPenalty ? Math.min(...atkRoll.rolls) : highest;
                const p = atkRoll.attackDamagePayload;
                const isCrit = Boolean(p && keptNatural >= p.critThreatMin);
                const isSelected = selectedHitIds[atkRoll.id] !== false;
                const shotNum = atkRoll.batchShotNumber || idx + 1;
                let keptShown = false;

                return (
                  <div
                    key={atkRoll.id}
                    className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                      isSelected
                        ? isCrit
                          ? 'border-yellow-600/80 bg-yellow-950/25'
                          : 'border-zinc-600 bg-zinc-950/50'
                        : 'border-zinc-800 bg-zinc-950/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-zinc-100">{shotNum}º disparo</span>
                        <p className="text-xs text-zinc-500 trpg-num">{atkRoll.formula}</p>
                      </div>
                      {!isSpinning && isCrit && (
                        <span className="trpg-badge bg-yellow-900/70! text-yellow-200!">
                          <Icon name="burst" size={12} /> Crítico
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center w-20 shrink-0">
                        <span
                          className={`block trpg-display text-5xl leading-none ${
                            isSpinning ? 'text-zinc-600' : isCrit ? 'text-yellow-300' : 'text-zinc-100'
                          }`}
                        >
                          {isSpinning ? '·' : atkRoll.total}
                        </span>
                        <span className="text-xs text-zinc-500">acerto</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {atkRoll.rolls.map((val, dIdx) => {
                          const atkSides = atkRoll.sides || 20;
                          const canReroll =
                            val === 1 &&
                            Boolean(atkRoll.hasAfortunado) &&
                            (atkSides !== 20 || Boolean(atkRoll.hasAfortunadoAffinity)) &&
                            !atkRoll.rerolledAfortunado &&
                            Boolean(onRerollOne);
                          const isKept = atkRoll.system === 'ordem-paranormal' && !keptShown && val === keptNatural;
                          if (isKept) keptShown = true;
                          return (
                            <button
                              key={dIdx}
                              type="button"
                              disabled={!canReroll}
                              onClick={() => canReroll && onRerollOne?.(atkRoll, dIdx)}
                              title={canReroll ? 'Rerrolar este 1 (Afortunado)' : undefined}
                              aria-label={canReroll ? 'Rerrolar o 1 (Afortunado)' : `Dado ${val}`}
                              className={`${isSpinning ? 'trpg-die-in' : ''} rounded-md ${canReroll ? 'ring-2 ring-emerald-500/60' : ''}`}
                              style={{ animationDelay: `${dIdx * 40}ms` }}
                            >
                              <DieFace2D
                                sides={atkSides}
                                value={isSpinning ? '' : val}
                                size={34}
                                tone={isSpinning ? 'muted' : isKept ? (val === 1 ? 'danger' : 'gold') : 'base'}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedHitIds((prev) => ({ ...prev, [atkRoll.id]: !isSelected }))}
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-950/50 text-emerald-200'
                          : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Icon name={isSelected ? 'check-circle' : 'x-circle'} size={16} />
                      {isSelected ? 'Acertou' : 'Errou'}
                    </button>
                  </div>
                );
              })}
            </div>

            {sg && onTriggerSegurarGatilhoShot && (
              <div className="rounded-xl border border-orange-800/70 bg-orange-950/20 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-orange-100 flex items-center gap-2">
                    <Icon name="flame" size={16} className="text-orange-300" /> Disparo extra ({attackRolls.length + 1}º)
                    <span className="trpg-badge bg-orange-950! text-orange-200! trpg-num">{sgPeCost} PE</span>
                  </span>
                  {sg.hasAtaqueEspecial && (
                    <label className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAeOnNextShot}
                        onChange={(e) => {
                          setUseAeOnNextShot(e.target.checked);
                          setSgErrorMsg('');
                        }}
                        className="accent-orange-500 w-4 h-4"
                      />
                      Combinar com Ataque Especial
                    </label>
                  )}
                </div>

                {sg.hasAtaqueEspecial && useAeOnNextShot && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(
                      [
                        { key: 'atk', label: 'Acerto', value: clampedAe.atk },
                        { key: 'dmg', label: 'Dano', value: clampedAe.dmg },
                      ] as const
                    ).map((row) => (
                      <div
                        key={row.key}
                        className="rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <span className="text-sm text-zinc-300">{row.label}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={row.value <= 0}
                            onClick={() =>
                              row.key === 'atk'
                                ? updateBatchAe(Math.max(0, clampedAe.atk - 5), clampedAe.dmg)
                                : updateBatchAe(clampedAe.atk, Math.max(0, clampedAe.dmg - 5))
                            }
                            className="trpg-icon-btn w-8! h-8!"
                            aria-label={`Diminuir ${row.label}`}
                          >
                            <Icon name="minus" size={15} />
                          </button>
                          <span className="trpg-num font-semibold text-zinc-100 min-w-[3rem] text-center">
                            {signed(row.value * sg.aeMult)}
                          </span>
                          <button
                            type="button"
                            disabled={aeTotalInvested + 5 > maxBonus}
                            onClick={() =>
                              row.key === 'atk'
                                ? updateBatchAe(clampedAe.atk + 5, clampedAe.dmg)
                                : updateBatchAe(clampedAe.atk, clampedAe.dmg + 5)
                            }
                            className="trpg-icon-btn w-8! h-8!"
                            aria-label={`Aumentar ${row.label}`}
                          >
                            <Icon name="plus" size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sgErrorMsg && (
                  <p role="alert" className="text-sm text-red-300 flex items-center gap-2">
                    <Icon name="warning" size={15} /> {stripEmoji(sgErrorMsg)}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-zinc-400 trpg-num">
                    {sg.baseAttackDice <= 0 ? '2d20 (menor)' : `${sg.baseAttackDice}d20`}
                    {signed(sg.baseAttackBonus + (useAeOnNextShot ? clampedAe.atk * sg.aeMult : 0))} — custa {totalShotPe} PE,
                    limite {sg.peTurnLimit} PE por turno
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (useAeOnNextShot && aeTotalInvested <= 0) {
                        setSgErrorMsg('Escolha ao menos +5 em acerto ou dano, ou desmarque o Ataque Especial.');
                        return;
                      }
                      if (totalShotPe > sg.peTurnLimit) {
                        setSgErrorMsg(`O disparo custa ${totalShotPe} PE e seu limite é ${sg.peTurnLimit} PE por turno.`);
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
                      setSgErrorMsg(ok ? '' : 'PE insuficiente para este disparo.');
                    }}
                    className="trpg-btn-secondary border-orange-700! text-orange-100!"
                  >
                    <Icon name="flame" size={16} /> Atirar de novo (−{totalShotPe} PE)
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className={`grid gap-3 ${gridCols(damageRolls.length)}`}>
              {damageRolls.map((dmgRoll, idx) => {
                const isSpinning = Boolean(spinningIds[dmgRoll.id]);
                const isCrit = Boolean(dmgRoll.batchIsCrit);
                const shotNum = dmgRoll.batchShotNumber || idx + 1;
                return (
                  <div
                    key={dmgRoll.id}
                    className={`rounded-xl border p-4 flex items-center gap-4 ${
                      isCrit ? 'border-yellow-600/80 bg-yellow-950/25' : 'border-zinc-700 bg-zinc-950/50'
                    }`}
                  >
                    <div className="text-center w-20 shrink-0">
                      <span className={`block trpg-display text-5xl leading-none ${isSpinning ? 'text-zinc-600' : 'text-zinc-100'}`}>
                        {isSpinning ? '·' : dmgRoll.total}
                      </span>
                      <span className="text-xs text-zinc-500">dano</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        {shotNum}º disparo
                        {isCrit && <span className="trpg-badge bg-yellow-900/70! text-yellow-200!">Crítico</span>}
                      </p>
                      <p className="text-xs text-zinc-500 trpg-num mb-2">{dmgRoll.formula}</p>
                      <div className="flex flex-wrap gap-1">
                        {dmgRoll.rolls.map((val, dIdx) => {
                          const dmgSides = dmgRoll.sides || 6;
                          const canReroll =
                            val === 1 &&
                            Boolean(dmgRoll.hasAfortunado) &&
                            (dmgSides !== 20 || Boolean(dmgRoll.hasAfortunadoAffinity)) &&
                            !dmgRoll.rerolledAfortunado &&
                            Boolean(onRerollOne);
                          return (
                            <button
                              key={dIdx}
                              type="button"
                              disabled={!canReroll}
                              onClick={() => canReroll && onRerollOne?.(dmgRoll, dIdx)}
                              title={canReroll ? 'Rerrolar este 1 (Afortunado)' : undefined}
                              className={`${isSpinning ? 'trpg-die-in' : ''} rounded-md ${canReroll ? 'ring-2 ring-emerald-500/60' : ''}`}
                              style={{ animationDelay: `${dIdx * 40}ms` }}
                            >
                              <DieFace2D sides={dmgSides} value={isSpinning ? '' : val} size={30} tone={isSpinning ? 'muted' : 'base'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-red-800/70 bg-red-950/30 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-red-100">Dano total</p>
                <p className="text-xs text-zinc-400 trpg-num">
                  {damageRolls.map((d) => d.total).join(' + ')} = {totalBatchDamage}
                </p>
              </div>
              <span className="trpg-display text-6xl leading-none text-zinc-100 trpg-num">{totalBatchDamage}</span>
            </div>
          </div>
        )}
      </Dialog>
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
  const dmgModStr = dmgPayload && dmgPayload.damageModifier !== 0 ? signed(dmgPayload.damageModifier) : '';

  const formulaSidesMatch = roll.formula.match(/d(\d+)/i);
  const rollSides = roll.sides || (formulaSidesMatch ? Number(formulaSidesMatch[1]) : 20);
  const afortunadoAllowedForRoll = Boolean(roll.hasAfortunado) && (rollSides !== 20 || Boolean(roll.hasAfortunadoAffinity));

  const stageKey = `${roll.id}|${roll.rolls.join(',')}|${roll.total}`;
  const settled = settledKey === stageKey || Boolean(roll.mapaCelestePayload?.secondRoll);

  const mcPayload = roll.mapaCelestePayload;
  const hasMapaCelesteDualView = Boolean(mcPayload?.secondRoll);

  const hasFollowUps =
    (Boolean(mcPayload?.canReroll) && !mcPayload?.secondRoll && Boolean(onMapaCelesteReroll)) ||
    (afortunadoAllowedForRoll && !roll.rerolledAfortunado && roll.rolls.includes(1) && Boolean(onRerollOne)) ||
    Boolean(roll.rerolledAfortunado) ||
    Boolean(roll.explodedRolls?.length) ||
    Boolean(roll.extraDiceResults?.length) ||
    Boolean(roll.cursePricePrompt) ||
    Boolean(dmgPayload?.ritualisticaStoredName) ||
    Boolean(roll.ritualEffectPayload) ||
    Boolean(dmgPayload && onRollDamage) ||
    Boolean(roll.forcaOpressoraPayload && onRollForcaOpressora);

  const handleDialogClose = () => {
    if (mcPayload?.secondRoll && !mcPayload.chosenIndex && onMapaCelesteChoose) {
      const opt1Total = mcPayload.firstRoll?.total ?? roll.total;
      const opt2Total = mcPayload.secondRoll.total;
      onMapaCelesteChoose(roll, opt2Total > opt1Total ? 2 : 1);
    }
    onClose();
  };

  return (
    <Dialog
      open
      onClose={handleDialogClose}
      size={hasMapaCelesteDualView ? 'lg' : 'sm'}
      title={stripEmoji(roll.label)}
      description={
        <>
          {roll.characterName} rolou <span className="trpg-num text-zinc-300">{roll.formula}</span>
          {roll.isSecret && <span className="ml-2 trpg-badge">Em segredo</span>}
        </>
      }
      panelClassName={isCriticalHit && settled ? 'border-yellow-700/70!' : ''}
      bodyClassName="pt-2!"
    >
      {hasMapaCelesteDualView && mcPayload?.secondRoll ? (
        (() => {
          const opt1 = mcPayload.firstRoll || {
            rolls: roll.rolls,
            formula: roll.formula,
            modifier: roll.modifier,
            total: roll.total,
          };
          const opt2 = mcPayload.secondRoll!;
          const options = [
            { idx: 1 as const, title: '1ª Rolagem', subtitle: 'Teste original', data: opt1 },
            { idx: 2 as const, title: '2ª Rolagem', subtitle: 'Mapa Celeste (−2 PE)', data: opt2 },
          ];
          const maxTotal = Math.max(opt1.total, opt2.total);

          return (
            <div className="flex flex-col gap-3.5 pt-1">
              <p className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-700/50 rounded-lg px-3 py-2 flex items-center gap-2">
                <Icon name="sparkles" size={15} className="text-amber-400 shrink-0" />
                <span>
                  {mcPayload.chosenIndex
                    ? `Mapa Celeste confirmado: você escolheu a ${mcPayload.chosenIndex}ª rolagem (${
                        mcPayload.chosenIndex === 2 ? opt2.total : opt1.total
                      }).`
                    : 'Mapa Celeste (Mateiro): compare as duas rolagens simultâneas abaixo e escolha qual resultado deseja manter.'}
                </span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt) => {
                  const isChosen = mcPayload.chosenIndex === opt.idx;
                  const isUnchosen = Boolean(mcPayload.chosenIndex && mcPayload.chosenIndex !== opt.idx);
                  const isBest = opt.data.total === maxTotal;
                  const isZeroPen = opt.data.formula.includes('2d20 (menor)');
                  const keptNat = isZeroPen
                    ? Math.min(...opt.data.rolls)
                    : Math.max(...opt.data.rolls);
                  let keptMarked = false;

                  return (
                    <div
                      key={opt.idx}
                      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                        isChosen
                          ? 'border-emerald-500 bg-emerald-950/25 shadow-lg shadow-emerald-950/40'
                          : isUnchosen
                          ? 'border-zinc-800 bg-zinc-950/30 opacity-55'
                          : isBest
                          ? 'border-amber-500/80 bg-amber-950/15'
                          : 'border-zinc-700 bg-zinc-950/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-zinc-100 block">{opt.title}</span>
                          <span className="text-[11px] text-zinc-400">
                            {opt.subtitle} • <span className="trpg-num">{opt.data.formula}</span>
                          </span>
                        </div>
                        {isChosen ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-zinc-950">
                            ✓ Escolhido
                          </span>
                        ) : (
                          isBest && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/50 text-amber-300">
                              Maior
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex items-center gap-4 py-1">
                        <div className="text-center w-20 shrink-0">
                          <span className="block trpg-display text-5xl leading-none text-zinc-100 trpg-num">
                            {opt.data.total}
                          </span>
                          <span className="text-[11px] text-zinc-500">total</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {opt.data.rolls.map((val, dIdx) => {
                            const isKept =
                              roll.system === 'ordem-paranormal' && !keptMarked && val === keptNat;
                            if (isKept) keptMarked = true;
                            return (
                              <DieFace2D
                                key={dIdx}
                                sides={rollSides}
                                value={val}
                                size={36}
                                tone={isKept ? (val === 1 ? 'danger' : 'gold') : 'base'}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {!mcPayload.chosenIndex && onMapaCelesteChoose && (
                        <button
                          type="button"
                          onClick={() => onMapaCelesteChoose(roll, opt.idx)}
                          className={isBest ? 'trpg-btn-primary w-full' : 'trpg-btn-secondary w-full'}
                        >
                          <Icon name="check" size={16} />
                          Escolher este resultado ({opt.data.total})
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        <DiceStage key={roll.id} roll={roll} onSettled={() => setSettledKey(stageKey)} />
      )}

      {hasFollowUps && (
        <div
          className={`mt-5 flex flex-col gap-3 transition-opacity duration-300 ${
            settled ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!settled}
        >
          {/* Mapa Celeste (Mateiro — Sobrevivência) */}
          {mcPayload?.canReroll && !mcPayload.secondRoll && onMapaCelesteReroll && (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const ok = onMapaCelesteReroll(roll);
                  if (!ok) {
                    setMapaCelesteError(
                      'PE insuficiente (ou limite de PE/turno atingido) para usar Mapa Celeste (−2 PE).'
                    );
                  } else {
                    setMapaCelesteError('');
                  }
                }}
                className="trpg-btn-secondary w-full border-amber-700! text-amber-100!"
              >
                <Icon name="sparkles" size={17} className="text-amber-300" />
                Mapa Celeste: rolar novamente (−2 PE)
              </button>
              {mapaCelesteError && (
                <p role="alert" className="text-xs text-red-300 flex items-center gap-1.5">
                  <Icon name="warning" size={14} /> {mapaCelesteError}
                </p>
              )}
            </div>
          )}

          {/* Afortunado */}
          {afortunadoAllowedForRoll && !roll.rerolledAfortunado && roll.rolls.includes(1) && onRerollOne && (
            <button
              type="button"
              onClick={() => onRerollOne(roll, roll.rolls.indexOf(1))}
              className="trpg-btn-secondary w-full border-emerald-800! text-emerald-100!"
            >
              <Icon name="clover" size={17} className="text-emerald-300" />
              Rerrolar o 1 com Afortunado
              <span className="text-xs font-normal text-zinc-400">
                {roll.hasAfortunadoAffinity ? '1x por rolagem' : 'dados que não são d20'}
              </span>
            </button>
          )}
          {roll.rerolledAfortunado && (
            <p className="text-sm text-emerald-300 flex items-center gap-2">
              <Icon name="clover" size={15} /> Um 1 foi rerrolado com Afortunado.
            </p>
          )}

          {/* Motosserra */}
          {roll.explodedRolls && roll.explodedRolls.length > 0 && (
            <Notice
              tone="warning"
              icon="hammer"
              title={`Motosserra explodiu ${roll.explodedRolls.length}x: ${signed(roll.explodedRolls.reduce((a, b) => a + b, 0))}`}
            >
              <div className="flex flex-wrap gap-1">
                {roll.explodedRolls.map((val, idx) => (
                  <DieFace2D key={idx} sides={roll.sides || 6} value={val} size={28} />
                ))}
              </div>
            </Notice>
          )}

          {/* Dados extras de maldições e munições */}
          {roll.extraDiceResults && roll.extraDiceResults.length > 0 && (
            <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {roll.extraDiceResults.map((ex, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 px-3.5 py-2 text-sm">
                  <span className="text-purple-200 flex items-center gap-2 min-w-0">
                    <Icon name="sigil" size={15} className="text-purple-300 shrink-0" />
                    <span className="truncate">{stripEmoji(ex.label)}</span>
                    <span className="text-zinc-500 trpg-num">{ex.formula}</span>
                  </span>
                  <span className="trpg-num text-zinc-100 shrink-0">
                    [{ex.rolls.join(', ')}] {signed(ex.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* O preço da maldição */}
          {roll.cursePricePrompt && (
            <Notice
              tone="paranormal"
              icon="conhecimento"
              title={`O preço da maldição (${roll.cursePricePrompt.element}, ${roll.cursePricePrompt.curseCount} ${
                roll.cursePricePrompt.curseCount > 1 ? 'maldições' : 'maldição'
              })`}
            >
              <p className="text-zinc-300">
                Teste de {roll.cursePricePrompt.attributeLabel}. Se falhou, você perde{' '}
                <strong className="text-red-200">{roll.cursePricePrompt.sanLossOnFail} de sanidade</strong>.
              </p>
              {onApplyCurseSanLoss && (
                <button
                  type="button"
                  disabled={curseSanAppliedForRollId === roll.id}
                  onClick={() => {
                    onApplyCurseSanLoss(roll);
                    setCurseSanAppliedForRollId(roll.id);
                  }}
                  className="trpg-btn-danger trpg-btn-sm self-start"
                >
                  <Icon name={curseSanAppliedForRollId === roll.id ? 'check' : 'brain'} size={15} />
                  {curseSanAppliedForRollId === roll.id
                    ? `${roll.cursePricePrompt.sanLossOnFail} SAN perdidos`
                    : `Falhei: perder ${roll.cursePricePrompt.sanLossOnFail} SAN`}
                </button>
              )}
            </Notice>
          )}

          {/* Arma ritualística */}
          {dmgPayload?.ritualisticaStoredName && (
            <Notice tone="paranormal" icon="sigil" title="Arma ritualística carregada">
              <p className="text-zinc-300">
                Se acertar, você pode descarregar <em>{dmgPayload.ritualisticaStoredName}</em> no alvo como ação livre.
              </p>
            </Notice>
          )}

          {/* Custo do paranormal + efeito de ritual */}
          {roll.ritualEffectPayload &&
            (() => {
              const rp = roll.ritualEffectPayload!;
              const dt = rp.custoParanormalDt;
              const passed = roll.total >= dt;
              const failedBy5 = !passed && dt - roll.total >= 5;
              return (
                <Notice
                  tone={passed ? 'success' : failedBy5 ? 'danger' : 'warning'}
                  icon={passed ? 'check-circle' : failedBy5 ? 'skull' : 'warning'}
                  title={
                    passed
                      ? `Passou no custo do paranormal (DT ${dt}). Nenhuma sanidade perdida.`
                      : failedBy5
                      ? `Falhou por 5 ou mais (DT ${dt}): perde ${rp.peSpent} SAN e 1 de SAN máxima.`
                      : `Falhou no custo do paranormal (DT ${dt}): perde ${rp.peSpent} SAN.`
                  }
                >
                  {rp.appliedSceneSummary && <p className="text-zinc-300">{stripEmoji(rp.appliedSceneSummary)}</p>}
                </Notice>
              );
            })()}

          {roll.ritualEffectPayload?.effectFormula &&
            onRollRitualEffect &&
            (() => {
              const rp = roll.ritualEffectPayload!;
              const et = rp.effectType || 'damage';
              const meta =
                et === 'healing'
                  ? { icon: 'heart-pulse', text: `Rolar cura (${rp.effectFormula})`, cls: 'border-emerald-700! text-emerald-100!' }
                  : et === 'temp_hp'
                  ? { icon: 'shield', text: `Rolar PV temporários (${rp.effectFormula})`, cls: 'border-cyan-700! text-cyan-100!' }
                  : et === 'utility'
                  ? {
                      icon: 'sigil',
                      text: `${stripEmoji(rp.effectLabel || 'Rolar efeito')} (${rp.effectFormula})`,
                      cls: 'border-purple-700! text-purple-100!',
                    }
                  : {
                      icon: 'burst',
                      text: `${stripEmoji(rp.effectLabel || 'Rolar dano do ritual')} (${rp.effectFormula})${
                        rp.maximizeEffect ? ', maximizado' : ''
                      }`,
                      cls: '',
                    };
              return (
                <button
                  type="button"
                  onClick={() => onRollRitualEffect(roll)}
                  className={`${et === 'damage' ? 'trpg-btn-primary' : `trpg-btn-secondary ${meta.cls}`} trpg-btn-lg w-full`}
                >
                  <Icon name={meta.icon} size={18} /> {meta.text}
                </button>
              );
            })()}

          {/* Dano / dano crítico */}
          {dmgPayload && onRollDamage && (
            <button
              type="button"
              onClick={() => onRollDamage(roll, isCriticalHit)}
              className={`trpg-btn-primary trpg-btn-lg w-full ${
                isCriticalHit ? 'bg-yellow-600! border-yellow-400! text-zinc-950!' : ''
              }`}
            >
              <Icon name={isCriticalHit ? 'burst' : 'sangue'} size={18} />
              {isCriticalHit
                ? `Rolar dano crítico (${dmgPayload.critDiceCount}d${dmgPayload.dieSides}${dmgModStr}, x${dmgPayload.critMultiplier})`
                : `Rolar dano (${dmgPayload.normalDiceCount}d${dmgPayload.dieSides}${dmgModStr})`}
            </button>
          )}

          {/* Sanguinária */}
          {isCriticalHit && dmgPayload?.sanguinariaCritTempHp && onRollSanguinariaTempHp && (
            <button
              type="button"
              disabled={sanguinariaRolledForRollId === roll.id}
              onClick={() => {
                onRollSanguinariaTempHp(roll);
                setSanguinariaRolledForRollId(roll.id);
              }}
              className="trpg-btn-danger w-full"
            >
              <Icon name={sanguinariaRolledForRollId === roll.id ? 'check' : 'sangue'} size={16} />
              {sanguinariaRolledForRollId === roll.id
                ? 'PV temporários da Sanguinária rolados'
                : 'Sanguinária: rolar 2d10 PV temporários (alvo fica fraco)'}
            </button>
          )}

          {/* Força Opressora */}
          {roll.forcaOpressoraPayload &&
            onRollForcaOpressora &&
            (() => {
              const pushBonus = Math.floor(Math.max(0, roll.total) / 10) * 5;
              const fo = roll.forcaOpressoraPayload!;
              const totalEmpurrarBonus = fo.lutaBonus + pushBonus;
              const diceText = fo.lutaDiceCount <= 0 ? '2d20 (menor)' : `${fo.lutaDiceCount}d20`;
              return (
                <Notice tone="info" icon="swords" title="Força Opressora (−1 PE)">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onRollForcaOpressora(roll, 'empurrar')}
                      className="trpg-btn-secondary trpg-btn-sm"
                      title={`Teste de Luta com +${pushBonus} pelo dano causado`}
                    >
                      Empurrar{' '}
                      <span className="trpg-num text-zinc-400">
                        {diceText}
                        {signed(totalEmpurrarBonus)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRollForcaOpressora(roll, 'derrubar')}
                      className="trpg-btn-secondary trpg-btn-sm"
                      title="Teste de Luta para derrubar"
                    >
                      Derrubar{' '}
                      <span className="trpg-num text-zinc-400">
                        {diceText}
                        {signed(fo.lutaBonus)}
                      </span>
                    </button>
                  </div>
                </Notice>
              );
            })()}
        </div>
      )}
    </Dialog>
  );
}
