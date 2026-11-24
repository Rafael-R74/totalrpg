import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getDieAsset } from './diceGeometry';
import { mulberry32, StageModel } from './diceModel';

export type ScenePhase = 'rolling' | 'select' | 'slam' | 'done';

export interface DiceSceneProps {
  model: StageModel;
  seed: number;
  phase: ScenePhase;
  /** Incrementa a cada modificador que bate no dado */
  impacts: number;
  colors: { body: string; ink: string; edge: string; gold: string; danger: string; accent: string };
  /** Duração de cada dado e intervalo entre lançamentos (s) */
  timing: { duration: number; stagger: number; select: number };
  compact?: boolean;
  onReady?: () => void;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

interface DieProps {
  index: number;
  count: number;
  sides: number;
  value: number;
  kept: boolean;
  discarded: boolean;
  isPool: boolean;
  seed: number;
  phase: ScenePhase;
  impacts: number;
  colors: DiceSceneProps['colors'];
  timing: DiceSceneProps['timing'];
  layout: { slot: THREE.Vector3; aside: THREE.Vector3; baseScale: number; asideScale: number };
  highlight: 'gold' | 'danger' | 'none';
}

function Die({
  index,
  sides,
  value,
  kept,
  discarded,
  isPool,
  seed,
  phase,
  impacts,
  colors,
  timing,
  layout,
  highlight,
}: DieProps) {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const edgeRef = useRef<THREE.LineBasicMaterial>(null);
  const { asset, texture } = useMemo(() => getDieAsset(sides, colors.body, colors.ink), [sides, colors.body, colors.ink]);

  // Trajetória determinística: mesma rolagem → mesma animação em qualquer tela.
  const plan = useMemo(() => {
    const rnd = mulberry32(seed + index * 7919 + value * 104729);
    const fromLeft = rnd() < 0.5;
    const start = new THREE.Vector3((fromLeft ? -1 : 1) * (6 + rnd() * 3), -4.5 - rnd() * 2, 3 + rnd() * 2);
    const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const turns = (2.2 + rnd() * 2.2) * Math.PI * 2;
    const twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (rnd() - 0.5) * 0.4);
    const rest = asset.restQuat.get(value) ?? new THREE.Quaternion();
    const target = twist.multiply(rest.clone());
    const hops = 2 + Math.floor(rnd() * 2);
    return { start, axis, turns, target, hops, delay: index * timing.stagger };
  }, [seed, index, value, asset, timing.stagger]);

  // Reinicia a animação só quando o valor deste dado muda (ex.: Afortunado rerrola um dado)
  const born = useRef<number | null>(null);
  useEffect(() => {
    born.current = null;
  }, [value, seed]);

  const phaseStart = useRef<{ phase: ScenePhase; at: number } | null>(null);
  const lastImpact = useRef({ count: 0, at: -10 });
  const spin = useMemo(() => new THREE.Quaternion(), []);
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const goldColor = useMemo(() => new THREE.Color(colors.gold), [colors.gold]);
  const dangerColor = useMemo(() => new THREE.Color(colors.danger), [colors.danger]);
  const edgeBase = useMemo(() => new THREE.Color(colors.edge), [colors.edge]);
  const black = useMemo(() => new THREE.Color('#000000'), []);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    // Relógio próprio: o do R3F volta a zero quando o frameloop muda para "demand".
    const now = performance.now() / 1000;
    if (born.current === null) born.current = now;
    if (!phaseStart.current || phaseStart.current.phase !== phase) phaseStart.current = { phase, at: now };
    if (impacts !== lastImpact.current.count) lastImpact.current = { count: impacts, at: now };

    // 1) lançamento + quiques + giro que decai até o quaternion exato do resultado
    const t = clamp01((now - born.current - plan.delay) / timing.duration);
    const e = easeOutCubic(t);
    const pos = new THREE.Vector3().lerpVectors(plan.start, layout.slot, e);
    const hop = Math.abs(Math.sin(t * Math.PI * plan.hops)) * Math.pow(1 - t, 2) * 1.6;
    pos.y += hop;
    pos.z += Math.pow(1 - t, 2) * 1.2;
    const angle = plan.turns * Math.pow(1 - t, 2.4);
    spin.setFromAxisAngle(plan.axis, angle);
    tmpQ.copy(plan.target).multiply(spin); // q(t) = q_final · giro(θ(t)), θ(1) = 0
    g.quaternion.copy(tmpQ);

    // 2) seleção da pilha: o mantido vem ao centro, os outros vão para o lado
    let s = 0;
    if (isPool && (phase === 'select' || phase === 'slam' || phase === 'done')) {
      s = phase === 'select' ? easeInOut(clamp01((now - phaseStart.current.at) / timing.select)) : 1;
    }
    const finalPos = kept ? new THREE.Vector3(0, 0.35, 1.4) : layout.aside;
    pos.lerp(finalPos, s);
    let scale = THREE.MathUtils.lerp(layout.baseScale, kept ? 1.5 : layout.asideScale, s);

    // 3) impacto do modificador: soco elástico curto
    const sinceImpact = now - lastImpact.current.at;
    if (kept && sinceImpact >= 0 && sinceImpact < 0.5) {
      const k = Math.exp(-sinceImpact * 9) * Math.sin(sinceImpact * 34);
      scale *= 1 + 0.14 * k;
      pos.x += Math.sin(sinceImpact * 80) * 0.05 * Math.exp(-sinceImpact * 12);
    }
    g.position.copy(pos);
    g.scale.setScalar(scale);

    // 4) cor: mantido brilha em ouro (ou vermelho no 1 natural), descartados apagam
    const mat = matRef.current;
    const edge = edgeRef.current;
    if (mat && edge) {
      const glowTarget = kept && t >= 1 && (isPool ? s > 0 : highlight !== 'none') ? 1 : 0;
      const glowColor = highlight === 'danger' ? dangerColor : goldColor;
      mat.emissive.lerpColors(black, glowColor, glowTarget * (highlight === 'none' ? 0.1 : 0.18));
      const dim = discarded ? s : 0;
      mat.opacity = 1 - dim * 0.35;
      mat.color.setScalar(1 - dim * 0.3);
      edge.color.lerpColors(edgeBase, glowColor, glowTarget * (highlight === 'none' ? 0.5 : 1));
      edge.opacity = 0.9 - dim * 0.45;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={asset.geometry}>
        <meshStandardMaterial
          ref={matRef}
          map={texture}
          roughness={0.36}
          metalness={0.18}
          flatShading
          transparent
        />
      </mesh>
      <lineSegments geometry={asset.edges}>
        <lineBasicMaterial ref={edgeRef} color={colors.edge} transparent opacity={0.9} />
      </lineSegments>
    </group>
  );
}

function Rig({ model, seed, phase, impacts, colors, timing }: DiceSceneProps) {
  const { viewport } = useThree();
  const n = model.dice.length;
  const isPool = model.mode === 'pool' && n > 1;

  const layouts = useMemo(() => {
    const perRow = n <= 6 ? n : Math.ceil(n / 2);
    const rows = Math.ceil(n / perRow);
    const spacing = Math.min(2.5, (viewport.width * 0.92) / Math.max(1, perRow));
    const baseScale = Math.min(1, spacing / 2.5) * (n === 1 ? 1.25 : 1);
    const rowGap = Math.min(2.4, (viewport.height * 0.8) / rows);
    const discardedIdx = model.dice.map((d, i) => (d.discarded ? i : -1)).filter((i) => i >= 0);
    const asideScale = Math.min(0.78, baseScale * 0.85);
    const asideGap = Math.min(1.7, (viewport.width / 2 - 1.8) / Math.max(1, Math.ceil(discardedIdx.length / 2)));
    return model.dice.map((_, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, n - row * perRow);
      const col = i - row * perRow;
      const x = (col - (inRow - 1) / 2) * spacing;
      const y = ((rows - 1) / 2 - row) * rowGap + (rows === 1 ? 0.15 : 0);
      const di = discardedIdx.indexOf(i);
      const side = di % 2 === 0 ? -1 : 1;
      const step = Math.floor(di / 2);
      const aside = new THREE.Vector3(side * (2.3 + step * Math.max(1.1, asideGap)), -0.15, -0.6);
      return { slot: new THREE.Vector3(x, y, 0), aside, baseScale, asideScale };
    });
  }, [n, viewport.width, viewport.height, model.dice]);

  const highlight: 'gold' | 'danger' | 'none' = model.critical ? 'gold' : model.fumble ? 'danger' : isPool ? 'gold' : 'none';

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[-4, 6, 9]} intensity={1.7} />
      <directionalLight position={[6, -4, 5]} intensity={0.55} color={colors.accent} />
      <pointLight position={[0, 1.5, 6]} intensity={phase === 'rolling' || !isPool ? 0 : 3.5} distance={12} color={colors.gold} />
      {model.dice.map((d, i) => (
        <Die
          key={`${d.key}-${d.sides}`}
          index={i}
          count={n}
          sides={d.sides}
          value={d.value}
          kept={d.kept}
          discarded={d.discarded}
          isPool={isPool}
          seed={seed}
          phase={phase}
          impacts={impacts}
          colors={colors}
          timing={timing}
          layout={layouts[i]}
          highlight={d.kept ? highlight : 'none'}
        />
      ))}
    </>
  );
}

export default function DiceScene(props: DiceSceneProps) {
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  const animating = props.phase !== 'done';
  return (
    <Canvas
      dpr={[1, mobile ? 1.5 : 2]}
      camera={{ fov: 32, position: [0, 0, 13], near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={animating ? 'always' : 'demand'}
      style={{ position: 'absolute', inset: 0 }}
      aria-hidden="true"
      onCreated={() => props.onReady?.()}
    >
      <Rig {...props} />
    </Canvas>
  );
}
