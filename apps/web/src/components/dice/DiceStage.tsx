import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { DiceRollResult } from '@totalrpg/shared';
import { useTheme } from '../../theme/themeEngine';
import { buildStageModel, canUse3D, hashSeed, prefersReducedMotion, StageModel } from './diceModel';
import type { ScenePhase } from './DiceScene';
import { DieFace2D } from './DieFace2D';

const loadScene = () => import('./DiceScene');
const DiceScene = lazy(loadScene);

/** Baixa o código 3D em segundo plano para a primeira rolagem não esperar. */
export function preloadDiceScene() {
  const run = () => void loadScene().catch(() => undefined);
  const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run);
  else window.setTimeout(run, 1500);
}

interface DiceStageProps {
  roll: DiceRollResult;
  /** Chamado uma vez quando o total final é revelado */
  onSettled?: () => void;
  size?: 'modal' | 'tv' | 'hero' | 'tile';
  /** Força o modo 2D (ex.: telas com muitos lançamentos simultâneos) */
  force2D?: boolean;
  className?: string;
}

const TIMING = { duration: 1.15, stagger: 0.07, select: 0.5 };
const SLAM_GAP = 0.34;
const SLAM_FLIGHT = 0.3;

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    body: v('--trpg-accent-deep', '#45191b'),
    ink: v('--trpg-ink', '#f1ece2'),
    edge: v('--trpg-accent-muted', '#94302c'),
    gold: '#e6bd55',
    danger: '#e5483f',
    accent: v('--trpg-accent', '#d9423f'),
  };
}

function useCountUp(value: number, active: boolean) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (!active) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 260);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, active]);
  return shown;
}

function signed(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function DiceStage({ roll, onSettled, size = 'modal', force2D = false, className = '' }: DiceStageProps) {
  const { preferences } = useTheme();
  const model: StageModel = useMemo(() => buildStageModel(roll), [roll]);
  const reduced = useMemo(() => preferences.motion === 'reduced' || prefersReducedMotion(), [preferences.motion]);
  const [sceneFailed, setSceneFailed] = useState(false);
  const use3D = useMemo(
    () =>
      !force2D && !sceneFailed && !model.has3DUnsupported && model.dice.length <= 16 && canUse3D(preferences.dice, reduced),
    [force2D, sceneFailed, model, preferences.dice, reduced]
  );
  const colors = useMemo(() => readColors(), [preferences.palette, preferences.artDirection, roll.id]);
  const seed = useMemo(() => hashSeed(roll.id), [roll.id]);

  const [phase, setPhase] = useState<ScenePhase>(reduced ? 'done' : 'rolling');
  const [sceneReady, setSceneReady] = useState(false);
  const ready = !use3D || sceneReady;

  // Se o WebGL não subir a tempo (sem GPU, contexto bloqueado), cai para a bandeja 2D.
  useEffect(() => {
    if (!use3D || sceneReady) return;
    const t = window.setTimeout(() => setSceneFailed(true), 2500);
    return () => window.clearTimeout(t);
  }, [use3D, sceneReady]);
  const [impacts, setImpacts] = useState(0);
  const [display, setDisplay] = useState<number>(reduced ? model.total : model.natural);
  const [flying, setFlying] = useState<number | null>(null);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const valuesKey = `${roll.id}|${model.dice.map((d) => d.value).join(',')}|${roll.total}`;

  useEffect(() => {
    settledRef.current = false;
    const finish = () => {
      setPhase('done');
      setDisplay(model.total);
      if (!settledRef.current) {
        settledRef.current = true;
        onSettledRef.current?.();
      }
    };
    if (reduced) {
      finish();
      return;
    }
    setPhase('rolling');
    if (!ready) return;
    setImpacts(0);
    setFlying(null);
    setDisplay(model.natural);

    const timers: number[] = [];
    const at = (sec: number, fn: () => void) => timers.push(window.setTimeout(fn, sec * 1000));
    const n = model.dice.length;
    const rollTime = use3D ? TIMING.duration + (n - 1) * TIMING.stagger : 0.55;
    const hasSelect = model.mode === 'pool' && n > 1;
    const selectEnd = rollTime + (hasSelect ? TIMING.select + 0.05 : 0.05);

    if (hasSelect) at(rollTime, () => setPhase('select'));
    at(selectEnd, () => setPhase('slam'));
    model.modifiers.forEach((mod, k) => {
      const launch = selectEnd + 0.1 + k * SLAM_GAP;
      at(launch, () => setFlying(k));
      at(launch + SLAM_FLIGHT, () => {
        setImpacts((c) => c + 1);
        setDisplay((d) => d + mod.value);
      });
    });
    const end = selectEnd + 0.1 + model.modifiers.length * SLAM_GAP + (model.modifiers.length ? 0.45 : 0.1);
    at(end, () => {
      setFlying(null);
      finish();
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey, use3D, reduced, ready]);

  const shown = useCountUp(display, !reduced && phase !== 'rolling');
  const revealed = phase !== 'rolling';
  const done = phase === 'done';

  const heightClass =
    size === 'tv'
      ? 'h-[46vh] min-h-[280px]'
      : size === 'hero'
        ? 'h-[300px] sm:h-[340px]'
        : size === 'tile'
          ? 'h-[9em] min-h-[110px]'
          : 'h-[210px] sm:h-[250px]';
  const totalClass =
    size === 'tv'
      ? 'text-[7rem]'
      : size === 'hero'
        ? 'text-7xl'
        : size === 'tile'
          ? 'text-[2.8em]'
          : 'text-6xl sm:text-7xl';

  const tone = model.critical ? 'text-yellow-300' : model.fumble ? 'text-red-400' : 'text-zinc-100';
  const keptValue = model.keptIndex !== null ? model.dice[model.keptIndex].value : null;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`relative ${heightClass} overflow-hidden rounded-xl`}
        style={{
          background:
            'radial-gradient(ellipse 60% 70% at 50% 45%, color-mix(in oklab, var(--trpg-elevated) 70%, transparent), transparent 75%)',
        }}
      >
        {use3D ? (
          <Suspense fallback={<StaticDice model={model} phase="rolling" small={size === 'tile'} />}>
            <DiceScene
              model={model}
              seed={seed}
              phase={phase}
              impacts={impacts}
              colors={colors}
              timing={TIMING}
              compact={size === 'modal' || size === 'tile'}
              onReady={() => setSceneReady(true)}
            />
          </Suspense>
        ) : (
          <StaticDice model={model} phase={phase} animate={!reduced} small={size === 'tile'} />
        )}

        {/* Modificadores voando contra o dado mantido */}
        {model.modifiers.map((mod, k) =>
          flying !== null && k <= flying && k >= flying - 1 ? (
            <span
              key={`${roll.id}-${k}`}
              className="trpg-slam-chip pointer-events-none absolute left-1/2 top-[44%] z-10 trpg-num font-bold"
              style={{ animationDuration: `${SLAM_FLIGHT}s` }}
              aria-hidden="true"
            >
              {signed(mod.value)}
            </span>
          ) : null
        )}
        {impacts > 0 && (
          <span key={`ring-${impacts}`} className="trpg-impact-ring pointer-events-none absolute left-1/2 top-[44%] z-0" aria-hidden="true" />
        )}
      </div>

      {/* Total */}
      <div className="flex flex-col items-center -mt-3 relative z-10">
        <div
          key={done ? 'final' : 'counting'}
          className={`trpg-display leading-none ${totalClass} ${revealed ? tone : 'text-zinc-600'} transition-colors duration-300 trpg-num ${
            done && !reduced ? 'trpg-total-land' : ''
          }`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {revealed ? shown : '·'}
        </div>
        <div className="mt-2 min-h-[1.5rem] text-sm text-zinc-400 flex flex-wrap justify-center gap-x-2">
          {revealed && (
            <>
              {model.mode === 'pool' && keptValue !== null ? (
                <span>
                  {model.dice.filter((d) => d.kind === 'base').length > 1
                    ? roll.formula.includes('(menor)')
                      ? `Menor dado: ${keptValue}`
                      : `Maior dado: ${keptValue}`
                    : `Dado: ${keptValue}`}
                </span>
              ) : (
                <span>Dados: {model.natural}</span>
              )}
              {model.modifiers.map((m, i) => (
                <span key={i} className={impacts > i || done ? 'text-zinc-200' : ''}>
                  {signed(m.value)}
                </span>
              ))}
              {model.critical && done && (
                <strong className="text-yellow-300 font-semibold">{model.isAttack ? 'Crítico' : '20 natural'}</strong>
              )}
              {model.fumble && done && <strong className="text-red-300 font-semibold">1 natural</strong>}
            </>
          )}
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {done
          ? `${roll.label}: total ${roll.total}. Dados ${roll.rolls.join(', ')}${roll.modifier ? `, modificador ${signed(roll.modifier)}` : ''}.`
          : ''}
      </div>
    </div>
  );
}

/** Bandeja 2D: mesma informação, sem WebGL. */
function StaticDice({
  model,
  phase,
  animate = false,
  small = false,
}: {
  model: StageModel;
  phase: ScenePhase;
  animate?: boolean;
  /** Cards pequenos (iniciativa no 2º monitor): dados menores, numa linha só quando possível */
  small?: boolean;
}) {
  const isPool = model.mode === 'pool' && model.dice.length > 1;
  const selected = phase !== 'rolling';
  const many = model.dice.length > 8;
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${small ? 'px-1' : 'px-4'}`}>
      <div className={`flex flex-wrap items-center justify-center ${many || small ? 'gap-1.5 max-w-[34rem]' : 'gap-3'}`}>
        {model.dice.map((d, i) => {
          const kept = isPool ? d.kept : true;
          const dim = isPool && selected && !kept;
          return (
            <span
              key={d.key}
              className={`${animate ? 'trpg-die-in' : ''} transition-all duration-300`}
              style={{
                animationDelay: animate ? `${i * 50}ms` : undefined,
                opacity: dim ? 0.38 : 1,
                transform: isPool && selected && kept ? 'scale(1.18)' : undefined,
              }}
            >
              <DieFace2D
                sides={d.sides}
                value={d.value}
                size={small ? (isPool && kept && selected ? 44 : 36) : many ? 40 : isPool && kept && selected ? 76 : 60}
                tone={isPool && kept && selected ? (model.fumble ? 'danger' : 'gold') : 'base'}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
