import * as THREE from 'three';

export interface DieFace {
  value: number;
  normal: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  center: THREE.Vector3;
}

export interface DieAsset {
  geometry: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
  faces: DieFace[];
  /** valor → quaternion que vira essa face para a câmera, com o número de pé */
  restQuat: Map<number, THREE.Quaternion>;
}

/* Trapezoedro pentagonal (d10). Kites planos quando e = h(1−cos36°)/(1+cos36°). */
function d10Geometry(): THREE.BufferGeometry {
  const h = 1.05;
  const cos36 = Math.cos(Math.PI / 5);
  const e = (h * (1 - cos36)) / (1 + cos36);
  const r = 0.98;
  const top = new THREE.Vector3(0, h, 0);
  const bottom = new THREE.Vector3(0, -h, 0);
  const U: THREE.Vector3[] = [];
  const L: THREE.Vector3[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    U.push(new THREE.Vector3(Math.cos(a) * r, e, Math.sin(a) * r));
    L.push(new THREE.Vector3(Math.cos(b) * r, -e, Math.sin(b) * r));
  }
  const tris: THREE.Vector3[][] = [];
  for (let k = 0; k < 5; k++) {
    const n = (k + 1) % 5;
    tris.push([top, U[k], L[k]], [top, L[k], U[n]]);
    tris.push([bottom, L[k], U[n]], [bottom, U[n], L[n]]);
  }
  const pos: number[] = [];
  for (const t of tris) {
    const [a, b, c] = t;
    const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const centroid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const ordered = nrm.dot(centroid) < 0 ? [a, c, b] : [a, b, c];
    for (const v of ordered) pos.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function baseGeometry(sides: number): THREE.BufferGeometry {
  switch (sides) {
    case 4:
      return new THREE.TetrahedronGeometry(1.15, 0);
    case 6:
      return new THREE.BoxGeometry(1.35, 1.35, 1.35);
    case 8:
      return new THREE.OctahedronGeometry(1.1, 0);
    case 10:
      return d10Geometry();
    case 12:
      return new THREE.DodecahedronGeometry(1.05, 0);
    case 20:
    default:
      return new THREE.IcosahedronGeometry(1.08, 0);
  }
}

interface RawFace {
  normal: THREE.Vector3;
  tris: number[]; // índices de triângulo
  verts: THREE.Vector3[];
}

function groupFaces(geo: THREE.BufferGeometry): RawFace[] {
  const pos = geo.getAttribute('position');
  const triCount = pos.count / 3;
  const faces: RawFace[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    let face = faces.find((f) => f.normal.dot(n) > 0.999);
    if (!face) {
      face = { normal: n.clone(), tris: [], verts: [] };
      faces.push(face);
    }
    face.tris.push(t);
    for (const v of [a, b, c]) {
      if (!face.verts.some((w) => w.distanceToSquared(v) < 1e-8)) face.verts.push(v.clone());
    }
  }
  return faces;
}

/** Valores com faces opostas somando n+1, como num dado de verdade. */
function assignValues(faces: RawFace[], sides: number): number[] {
  const values = new Array<number>(faces.length).fill(0);
  const used = new Set<number>();
  // ordem estável: por altura, depois ângulo
  const order = faces
    .map((f, i) => ({ i, y: f.normal.y, ang: Math.atan2(f.normal.z, f.normal.x) }))
    .sort((p, q) => q.y - p.y || p.ang - q.ang)
    .map((o) => o.i);
  let low = 1;
  for (const i of order) {
    if (used.has(i)) continue;
    const opposite = faces.findIndex((f, j) => j !== i && !used.has(j) && f.normal.dot(faces[i].normal) < -0.999);
    values[i] = low;
    used.add(i);
    if (opposite >= 0 && sides !== 4) {
      values[opposite] = sides + 1 - low;
      used.add(opposite);
    }
    low++;
    while ([...values].includes(low) && low <= sides) low++;
  }
  // d4 (sem faces opostas) ou sobras: completa em ordem
  let next = 1;
  for (const i of order) {
    if (values[i] === 0) {
      while (values.includes(next)) next++;
      values[i] = next;
    }
  }
  return values;
}

function faceUp(face: RawFace, center: THREE.Vector3, sides: number): THREE.Vector3 {
  const n = face.normal;
  let ref: THREE.Vector3;
  if (face.verts.length === 4 && sides === 6) {
    ref = new THREE.Vector3().addVectors(face.verts[0], face.verts[1]).multiplyScalar(0.5);
  } else if (sides === 10) {
    // ponta do kite = vértice mais distante do centro da face
    ref = face.verts.reduce((best, v) => (v.distanceTo(center) > best.distanceTo(center) ? v : best), face.verts[0]);
  } else {
    ref = face.verts[0];
  }
  const up = new THREE.Vector3().subVectors(ref, center);
  up.sub(n.clone().multiplyScalar(up.dot(n))).normalize();
  return up;
}

function drawAtlas(values: number[], sides: number, body: string, ink: string): { texture: THREE.CanvasTexture; cols: number; rows: number } {
  const cols = Math.ceil(Math.sqrt(values.length));
  const rows = Math.ceil(values.length / cols);
  const cell = 128;
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const fontScale = sides === 4 || sides === 8 || sides === 20 ? 0.34 : sides === 10 ? 0.3 : 0.46;
  const fontPx = Math.round(cell * fontScale);
  ctx.font = `600 ${fontPx}px Archivo, "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  values.forEach((v, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cell + cell / 2;
    const cy = row * cell + cell / 2 + (sides === 10 ? cell * 0.07 : sides === 4 || sides === 8 || sides === 20 ? cell * 0.05 : 0);
    // gravação: sombra escura + número claro
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(String(v), cx + 1.5, cy + 2);
    ctx.fillStyle = ink;
    ctx.fillText(String(v), cx, cy);
    if ((v === 6 || v === 9) && sides > 6) {
      const w = ctx.measureText(String(v)).width;
      ctx.fillRect(cx - w / 2, cy + fontPx * 0.42, w, Math.max(3, fontPx * 0.07));
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, cols, rows };
}

const assetCache = new Map<string, { asset: DieAsset; texture: THREE.CanvasTexture }>();

/** Monta (e guarda em cache) geometria + textura numerada de um tipo de dado. */
export function getDieAsset(sides: number, body: string, ink: string): { asset: DieAsset; texture: THREE.CanvasTexture } {
  const cacheKey = `${sides}|${body}|${ink}`;
  const cached = assetCache.get(cacheKey);
  if (cached) return cached;

  const geo = baseGeometry(sides).toNonIndexed();
  geo.computeVertexNormals();
  const raw = groupFaces(geo);
  const values = assignValues(raw, sides);
  const { texture, cols, rows } = drawAtlas(values, sides, body, ink);

  const uv = new Float32Array(geo.getAttribute('position').count * 2);
  const pos = geo.getAttribute('position');
  const faces: DieFace[] = [];
  const tmp = new THREE.Vector3();

  raw.forEach((face, fi) => {
    const center = face.verts.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(face.verts.length);
    const up = faceUp(face, center, sides);
    const right = new THREE.Vector3().crossVectors(up, face.normal).normalize();
    const radius = Math.max(...face.verts.map((v) => v.distanceTo(center)));
    const size = radius * 2.05;
    const col = fi % cols;
    const row = Math.floor(fi / cols);
    for (const t of face.tris) {
      for (let k = 0; k < 3; k++) {
        const vi = t * 3 + k;
        tmp.fromBufferAttribute(pos, vi).sub(center);
        const u = tmp.dot(right) / size + 0.5;
        const v = tmp.dot(up) / size + 0.5;
        uv[vi * 2] = (col + u) / cols;
        uv[vi * 2 + 1] = (rows - row - 1 + v) / rows;
      }
    }
    faces.push({ value: values[fi], normal: face.normal.clone(), up, right, center });
  });
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  // quaternion de repouso: base local (right, up, normal) → mundo (X, Y, Z)
  const restQuat = new Map<number, THREE.Quaternion>();
  for (const f of faces) {
    const m = new THREE.Matrix4().makeBasis(f.right, f.up, f.normal).transpose();
    restQuat.set(f.value, new THREE.Quaternion().setFromRotationMatrix(m));
  }

  const edges = new THREE.EdgesGeometry(geo, 10);
  const asset: DieAsset = { geometry: geo, edges, faces, restQuat };
  const entry = { asset, texture };
  assetCache.set(cacheKey, entry);
  return entry;
}
