// 3D railway: track bed (ballast, sleepers, rails) streamed per chunk, level
// crossings with half barriers and flashing lights, and the trains from
// railway.js.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getTrains, getLevelCrossings, nearLevelCrossing, railZ, isOffMap, TRAIN_HALF_WIDTH, FLAT_DECK_Z } from './railway.js';
import { WATER_Y } from './util.js';
import { waterPolyAt } from './waterlevels.js';
import { addStaticCollider } from './breakables.js';
import { railViewDistance, railChunkWanted, RAIL_VIEW } from './viewdist.js';

const CHUNK = 250;
let VIEW = RAIL_VIEW.min; // the view distance for rails and trains (railViewDistance)
const MAX_CHUNK_BUILDS = 3; // per frame, nearest first
const STEP = 2;
const SLEEPER_STEP = 0.75;
const GAUGE_HALF = 0.7175;
const BED_Y = 0.02;
const SLEEPER_TOP = 0.16;
const RAIL_TOP = 0.26;

let scene = null;
let map = null;
const chunks = new Map();
const crossingViews = [];
const trainViews = new Map();

// Ballast sits between grass (layer 1) and sidewalks (layer 2) of roadsurface.js.
const BALLAST_MAT = new THREE.MeshStandardMaterial({
  color: 0x6f675d, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -6,
});
const SLEEPER_MAT = new THREE.MeshStandardMaterial({ color: 0x8b877f, roughness: 0.95 });
const RAIL_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide });
const PANEL_MAT = new THREE.MeshStandardMaterial({
  color: 0x6d6a64, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -36,
});
const SLEEPER_GEO = new THREE.BoxGeometry(0.26, 0.1, 2.5);
const DECK_MAT = new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: 0.9, side: THREE.DoubleSide });
const EMBANK_MAT = new THREE.MeshStandardMaterial({
  color: 0x66714b, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1.5, polygonOffsetUnits: -6,
});
const PIER_GEO = new THREE.BoxGeometry(0.9, 1, 3.4).translate(0, 0.5, 0);
const DECK_Z = 2.6;
const DECK_DEPTH = 0.9;
// Low decks over a canal stay as thin as the road bridges so boats fit under.
const WATER_DECK_DEPTH = 0.5;
const DECK_HALF = 2.5;
const RAIL_TOP_COLOR = new THREE.Color(0xc9ccd0);
const RAIL_SIDE_COLOR = new THREE.Color(0x5e4a3c);

// ---------------------------------------------------------------- track bed
function classify(x, y, tx, ty, z) {
  if (z > 2) return null;
  let covered = false;
  for (const road of map.roadsNear(x, y, 12)) {
    const P = road.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
      const L2 = dx * dx + dy * dy;
      if (L2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (d > road.width / 2 + 1.2) continue;
      if (Math.abs((dx * ty - dy * tx) / Math.sqrt(L2)) < 0.42) continue;
      covered = true;
      if (road.cat === 'foot' || road.cat === 'cycle') continue;
      return nearLevelCrossing(x, y) ? 'level' : 'hidden';
    }
  }
  return covered ? 'level' : null;
}

function chunkOf(x, y) {
  const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK);
  const key = cx + ',' + cy;
  let c = chunks.get(key);
  if (!c) {
    c = { key, x: (cx + 0.5) * CHUNK, y: (cy + 0.5) * CHUNK, bed: [], rails: [], embank: [], deck: [], sleepers: [], group: null };
    chunks.set(key, c);
  }
  return c;
}

function overWater(x, y) {
  return !!waterPolyAt(map, x, y);
}

function samplePolyline(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 1e-3) continue;
    const n = Math.max(1, Math.ceil(L / STEP));
    const tx = (bx - ax) / L, ty = (by - ay) / L;
    for (let k = 0; k < n; k++) out.push({ x: ax + (bx - ax) * k / n, y: ay + (by - ay) * k / n, tx, ty });
  }
  const [lx, ly] = pts[pts.length - 1];
  if (out.length) out.push({ x: lx, y: ly, tx: out[out.length - 1].tx, ty: out[out.length - 1].ty });
  // smooth the tangents so ribbons don't pinch at polyline vertices
  for (let i = 1; i < out.length - 1; i++) {
    const a = out[i - 1], b = out[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    out[i].sx = dx / l; out[i].sy = dy / l;
  }
  for (const s of out) {
    if (s.sx === undefined) { s.sx = s.tx; s.sy = s.ty; }
    s.z = railZ(s.x, s.y);
    s.water = overWater(s.x, s.y);
  }
  return out;
}

// Runs of consecutive samples that pass `keep`, each handed to the chunk of
// its midpoint. grow: a run also takes the sample on either side, so an
// embankment and the deck it runs into overlap instead of leaving a gap.
function runs(samples, keep, into, grow = false) {
  let cur = [];
  const flush = () => {
    if (cur.length >= 2) {
      const mid = cur[cur.length >> 1];
      chunkOf(mid.x, mid.y)[into].push(cur);
    }
    cur = [];
  };
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (keep(s)) {
      if (grow && !cur.length && i > 0) cur.push(samples[i - 1]);
      cur.push(s);
      if (cur.length > 60) { flush(); cur.push(s); }
    } else {
      if (grow && cur.length) cur.push(s);
      flush();
    }
  }
  flush();
}

function buildTrackData() {
  const all = (map.rails || []).map((r) => r.pts).concat(map.countryRails || []);
  for (const pts of all) {
    if (pts.length < 2) continue;
    const samples = samplePolyline(pts);
    for (const s of samples) s.cls = classify(s.x, s.y, s.sx, s.sy, s.z);
    runs(samples, (s) => !s.cls, 'bed');
    runs(samples, (s) => s.cls !== 'hidden', 'rails');
    runs(samples, (s) => !s.water && s.z > 0.05 && s.z < DECK_Z, 'embank', true);
    runs(samples, (s) => s.water || s.z >= DECK_Z - 0.05, 'deck', true);
    let acc = 0;
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i], b = samples[i + 1];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      while (acc < L) {
        const t = acc / L;
        if (!a.cls && !b.cls) {
          const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
          chunkOf(x, y).sleepers.push(x, y, Math.atan2(a.ty, a.tx), a.z + (b.z - a.z) * t);
        }
        acc += SLEEPER_STEP;
      }
      acc -= L;
    }
  }
}

const BED_PROFILE = [[-2.1, 0], [-1.4, 0.1], [1.4, 0.1], [2.1, 0]];

function bedGeometry(list) {
  const pos = [], idx = [];
  // a long run is cut in two at a shared sample (runs): the halves share its
  // vertices too, or the bed has a seam across it
  const at = new Map();
  for (const run of list) {
    const row = run.map((s) => {
      let v = at.get(s);
      if (v === undefined) {
        v = pos.length / 3;
        const nx = -s.sy, ny = s.sx;
        for (const [o, h] of BED_PROFILE) pos.push(s.x + nx * o, BED_Y + h + s.z, s.y + ny * o);
      }
      return v;
    });
    at.set(run[run.length - 1], row[row.length - 1]);
    for (let i = 0; i < run.length - 1; i++) {
      for (let k = 0; k < 3; k++) {
        const a = row[i] + k, b = a + 1, c = row[i + 1] + k, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function railGeometry(list) {
  const pos = [], col = [], idx = [];
  const w = 0.04;
  for (const run of list) {
    for (const side of [-1, 1]) {
      const base = pos.length / 3;
      for (const s of run) {
        const nx = -s.sy, ny = s.sx;
        const cx = s.x + nx * GAUGE_HALF * side, cy = s.y + ny * GAUGE_HALF * side;
        const lo = SLEEPER_TOP + s.z, hi = RAIL_TOP + s.z;
        const pts = [
          [cx - nx * w, lo, cy - ny * w, RAIL_SIDE_COLOR],
          [cx - nx * w, hi, cy - ny * w, RAIL_SIDE_COLOR],
          [cx - nx * w, hi, cy - ny * w, RAIL_TOP_COLOR],
          [cx + nx * w, hi, cy + ny * w, RAIL_TOP_COLOR],
          [cx + nx * w, hi, cy + ny * w, RAIL_SIDE_COLOR],
          [cx + nx * w, lo, cy + ny * w, RAIL_SIDE_COLOR],
        ];
        for (const [x, y, z, c] of pts) { pos.push(x, y, z); col.push(c.r, c.g, c.b); }
      }
      for (let i = 0; i < run.length - 1; i++) {
        for (const k of [0, 2, 4]) {
          const a = base + i * 6 + k, b = a + 1, c = a + 6, d = a + 7;
          idx.push(a, b, c, b, d, c);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Cross-section polylines (lateral offset, height) per sample; consecutive
// samples are stitched into strips. Profiles may be open (walls, slopes).
function embankProfile(s) {
  const top = BED_Y + s.z, foot = 2.1 + s.z * 1.3;
  return [[[-foot, 0.02], [-2.1, top]], [[2.1, top], [foot, 0.02]]];
}
// the cross-section closing an embankment's end (it is hollow under the bed)
function embankCap(s) {
  const top = BED_Y + s.z, foot = 2.1 + s.z * 1.3;
  return [[-foot, 0.02], [-2.1, top], [2.1, top], [foot, 0.02]];
}

// A trough: sides with a ledge out to the ballast bed's edge (or you look
// down past the bed into the deck), the bottom, and the parapets.
const LEDGE = 2.05;
function deckProfile(s) {
  const z = s.z, b = deckBottom(s), h = DECK_HALF, t = z + 0.025;
  return [
    [[-LEDGE, t], [-h, t], [-h, b], [h, b], [h, t], [LEDGE, t]],
    [[-h + 0.1, z + 1.15], [-h + 0.1, t]],
    [[h - 0.1, t], [h - 0.1, z + 1.15]],
  ];
}
function deckCap(s) {
  const t = s.z + 0.025, b = deckBottom(s), h = DECK_HALF;
  return [[-h, t], [-h, b], [h, b], [h, t]];
}
const deckBottom = (s) => s.z - (s.water && s.z < DECK_Z ? WATER_DECK_DEPTH : DECK_DEPTH);

// capOf: the convex cross-section closing both ends of every run
function stripGeometry(list, profileOf, capOf = null) {
  const pos = [], idx = [];
  for (const run of list) {
    if (capOf) {
      for (const [s, dir] of [[run[0], -1], [run[run.length - 1], 1]]) {
        const nx = -s.sy, ny = s.sx, base = pos.length / 3, cap = capOf(s);
        for (const [o, h] of cap) pos.push(s.x + nx * o, h, s.y + ny * o);
        for (let k = 1; k < cap.length - 1; k++) {
          if (dir > 0) idx.push(base, base + k, base + k + 1);
          else idx.push(base, base + k + 1, base + k);
        }
      }
    }
    const profiles = run.map(profileOf);
    for (let part = 0; part < profiles[0].length; part++) {
      const n = profiles[0][part].length;
      const base = pos.length / 3;
      run.forEach((s, k) => {
        const nx = -s.sy, ny = s.sx;
        for (const [o, h] of profiles[k][part]) pos.push(s.x + nx * o, h, s.y + ny * o);
      });
      for (let i = 0; i < run.length - 1; i++) {
        for (let j = 0; j < n - 1; j++) {
          const a = base + i * n + j, b = a + 1, c = a + n, d = c + 1;
          idx.push(a, b, c, b, d, c);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function onCarRoad(x, y) {
  for (const road of map.roadsNear(x, y, 14)) {
    if (road.cat === 'foot') continue;
    const P = road.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
      const L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < road.width / 2 + 2.2) return true;
    }
  }
  return false;
}

// Piers every ~15 m under the deck, never standing in a road.
function deckPiers(list) {
  const out = [];
  for (const run of list) {
    let acc = 7;
    for (let i = 1; i < run.length; i++) {
      const a = run[i - 1], b = run[i];
      acc += Math.hypot(b.x - a.x, b.y - a.y);
      if (acc < 15) continue;
      const bottom = b.z - (b.water && b.z < DECK_Z ? WATER_DECK_DEPTH : DECK_DEPTH);
      const y0 = b.water ? WATER_Y - 0.1 : 0;
      if (bottom - y0 < 0.4 || onCarRoad(b.x, b.y)) continue;
      acc = 0;
      out.push({ x: b.x, y: b.y, angle: Math.atan2(b.sy, b.sx), y0, h: bottom - y0 });
    }
  }
  return out;
}

function buildChunk(c) {
  const group = new THREE.Group();
  if (c.bed.length) {
    const m = new THREE.Mesh(bedGeometry(c.bed), BALLAST_MAT);
    m.receiveShadow = true;
    group.add(m);
  }
  if (c.rails.length) {
    const m = new THREE.Mesh(railGeometry(c.rails), RAIL_MAT);
    m.receiveShadow = true;
    group.add(m);
  }
  if (c.embank.length) {
    const m = new THREE.Mesh(stripGeometry(c.embank, embankProfile, embankCap), EMBANK_MAT);
    m.receiveShadow = true;
    group.add(m);
  }
  if (c.deck.length) {
    const m = new THREE.Mesh(stripGeometry(c.deck, deckProfile, deckCap), DECK_MAT);
    m.receiveShadow = true;
    m.castShadow = true;
    group.add(m);
    const piers = deckPiers(c.deck);
    if (piers.length) {
      const inst = new THREE.InstancedMesh(PIER_GEO, DECK_MAT, piers.length);
      const o = new THREE.Object3D();
      piers.forEach((p, i) => {
        o.position.set(p.x, p.y0, p.y);
        o.rotation.set(0, -p.angle, 0);
        o.scale.set(1, p.h, 1);
        o.updateMatrix();
        inst.setMatrixAt(i, o.matrix);
        // solid for whatever passes underneath: 3.4 m across the track, 0.9 m along it
        addStaticCollider('pier', p.x, p.y, 0.45, 1.25, p.angle + Math.PI / 2, p.y0 < 0, p.y0 + p.h);
      });
      inst.castShadow = true;
      inst.computeBoundingSphere();
      group.add(inst);
    }
  }
  const n = c.sleepers.length / 4;
  if (n) {
    const inst = new THREE.InstancedMesh(SLEEPER_GEO, SLEEPER_MAT, n);
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      o.position.set(c.sleepers[i * 4], SLEEPER_TOP - 0.05 + c.sleepers[i * 4 + 3], c.sleepers[i * 4 + 1]);
      o.rotation.set(0, -c.sleepers[i * 4 + 2], 0);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    }
    inst.receiveShadow = true;
    inst.computeBoundingSphere();
    group.add(inst);
  }
  return group;
}

function syncChunks(px, py) {
  const todo = [];
  for (const c of chunks.values()) {
    const want = railChunkWanted(c.x, c.y, px, py, VIEW);
    if (want && !c.group) todo.push(c);
    if (c.group) c.group.visible = want;
  }
  // a wider reach must not build a whole ring in one frame: nearest first
  if (todo.length > MAX_CHUNK_BUILDS) todo.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
  for (const c of todo.slice(0, MAX_CHUNK_BUILDS)) { c.group = buildChunk(c); scene.add(c.group); }
}

// A cutscene is about to show (x, y): build the track chunks round it now
// (hidden until the camera focus is there), so the first frame has rails.
export function prewarmRailAt(x, y) {
  if (!scene || !trackBuilt) return;
  for (const c of chunks.values()) {
    if (c.group || Math.abs(c.x - x) > CHUNK || Math.abs(c.y - y) > CHUNK) continue;
    c.group = buildChunk(c);
    c.group.visible = false;
    scene.add(c.group);
  }
}

// ---------------------------------------------------------------- crossings
function stripeTexture() {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 8;
  const g = cv.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#d4202a'; g.fillRect(i * 8, 0, 8, 8); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
function crossTexture() {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 12;
  const g = cv.getContext('2d');
  g.fillStyle = '#d4202a'; g.fillRect(0, 0, 64, 12);
  g.fillStyle = '#ffffff'; g.fillRect(3, 3, 58, 6);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const POST_MAT = new THREE.MeshLambertMaterial({ color: 0xe8e8e2 });
const DARK_MAT = new THREE.MeshLambertMaterial({ color: 0x1a1b1d });
let BOOM_MAT = null;
let CROSS_MAT = null;
const LAMP_ON = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
const LAMP_OFF = new THREE.MeshBasicMaterial({ color: 0x3a0d0a });
const POST_GEO = new THREE.CylinderGeometry(0.07, 0.07, 3.3, 8);
const LAMP_GEO = new THREE.CircleGeometry(0.13, 14);
const BACK_GEO = new THREE.BoxGeometry(0.06, 0.4, 0.95);
const CROSS_GEO = new THREE.BoxGeometry(0.03, 0.2, 1.25);
const MOTOR_GEO = new THREE.BoxGeometry(0.45, 0.9, 0.4);

function buildApproach(r, sign) {
  // sign +1: traffic travels along the road's own direction and meets the
  // track at t0; sign -1: travels against it and meets it at t1.
  const ux = r.ux * sign, uy = r.uy * sign;
  const rx = -uy, ry = ux;
  const tEdge = sign > 0 ? r.t0 - 3.4 : r.t1 + 3.4;
  const half = r.width / 2;
  const small = r.cat === 'cycle' || r.cat === 'foot';
  const px = r.x + r.ux * tEdge + rx * (half + 0.55);
  const py = r.y + r.uy * tEdge + ry * (half + 0.55);
  const boomLen = (r.oneway || small ? r.width : half) + 0.3;

  const root = new THREE.Group();
  root.position.set(px, 0, py);
  const facing = new THREE.Group();
  facing.rotation.y = -Math.atan2(-uy, -ux); // local +X faces oncoming traffic
  root.add(facing);
  const post = new THREE.Mesh(POST_GEO, POST_MAT);
  post.position.y = 1.65;
  facing.add(post);
  const back = new THREE.Mesh(BACK_GEO, DARK_MAT);
  back.position.set(0.05, 2.3, 0);
  facing.add(back);
  const lamps = [];
  for (const z of [-0.26, 0.26]) {
    const lamp = new THREE.Mesh(LAMP_GEO, LAMP_OFF);
    lamp.position.set(0.085, 2.3, z);
    lamp.rotation.y = Math.PI / 2;
    facing.add(lamp);
    lamps.push(lamp);
  }
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const board = new THREE.Mesh(CROSS_GEO, CROSS_MAT);
    board.position.set(0.06, 2.95, 0);
    board.rotation.x = a;
    facing.add(board);
  }

  const boomFrame = new THREE.Group();
  boomFrame.rotation.y = -Math.atan2(-ry, -rx); // local +X points across the road
  root.add(boomFrame);
  const motor = new THREE.Mesh(MOTOR_GEO, POST_MAT);
  motor.position.set(0, 0.45, 0.3);
  boomFrame.add(motor);
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.95, 0.3);
  boomFrame.add(pivot);
  const boomGeo = new THREE.BoxGeometry(boomLen, 0.09, 0.07);
  boomGeo.translate(boomLen / 2 + 0.1, 0, 0);
  const uv = boomGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * boomLen / 2.4);
  const boom = new THREE.Mesh(boomGeo, BOOM_MAT);
  pivot.add(boom);
  pivot.rotation.z = 1.45;
  return { root, lamps, pivot };
}

function buildCrossings() {
  BOOM_MAT = new THREE.MeshLambertMaterial({ map: stripeTexture() });
  CROSS_MAT = new THREE.MeshLambertMaterial({ map: crossTexture() });
  for (const c of getLevelCrossings()) {
    const group = new THREE.Group();
    const parts = [];
    for (const r of c.roads) {
      const len = r.t1 - r.t0 + 3.2;
      const g = new THREE.PlaneGeometry(len, r.width).rotateX(-Math.PI / 2);
      const panel = new THREE.Mesh(g, PANEL_MAT);
      panel.position.set(r.cx, 0.045, r.cy);
      panel.rotation.y = -r.angle;
      panel.receiveShadow = true;
      group.add(panel);
      for (const sign of r.oneway ? [1] : [1, -1]) {
        const a = buildApproach(r, sign);
        group.add(a.root);
        parts.push(a);
      }
    }
    scene.add(group);
    crossingViews.push({ c, group, parts });
  }
}

function updateCrossings(px, py, night) {
  LAMP_ON.color.setHex(0xff2a1a).multiplyScalar(1 + 2.5 * night);
  for (const view of crossingViews) {
    const { c } = view;
    const near = Math.abs(c.x - px) < VIEW && Math.abs(c.y - py) < VIEW;
    view.group.visible = near;
    if (!near) continue;
    const phase = c.warn ? Math.floor(c.flash * 1.9) % 2 : -1;
    const ease = c.boom * c.boom * (3 - 2 * c.boom);
    view.parts.forEach((p, i) => { p.pivot.visible = !(c.snapped && c.snapped[i]); });
    for (const p of view.parts) {
      p.lamps[0].material = phase === 0 ? LAMP_ON : LAMP_OFF;
      p.lamps[1].material = phase === 1 ? LAMP_ON : LAMP_OFF;
      p.pivot.rotation.z = 1.45 * (1 - ease);
    }
  }
}

// ---------------------------------------------------------------- trains
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...opts }); matCache.set(key, m); }
  return m;
}
const GLASS_MAT = new THREE.MeshStandardMaterial({ color: 0x1c2631, roughness: 0.2, metalness: 0.4, emissive: 0xffe2a8, emissiveIntensity: 0 });
const HEAD_MAT = new THREE.MeshBasicMaterial({ color: 0xfff6dc });
const TAIL_MAT = new THREE.MeshBasicMaterial({ color: 0xff1a10 });
const LAMP_DARK = new THREE.MeshBasicMaterial({ color: 0x33302c });

function box(group, w, h, d, material, x, y, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  group.add(m);
  return m;
}

// Local +X runs along the track (towards increasing route arc length).
const DARK = () => mat(0x26282c, { roughness: 0.85 });
const ROOF = () => mat(0x9a9da1, { roughness: 0.7 });

function addCab(g, cfg, end, x0, H, W, lamps) {
  // x0: where the body ends; the cab fills x0 .. x0 + end * NOSE. Lower
  // half in the nose colour, windscreen block above it set back by a
  // per-type amount so the front reads raked (GTW) or blunt (VIRM, WINK).
  const NOSE = cfg.front === 'virm' ? 1.9 : 1.6;
  const tip = x0 + end * NOSE;
  const floor = cfg.front === 'virm' ? 0.55 : 0.7;
  const sill = cfg.front === 'virm' ? 2.35 : 1.75;
  const setback = cfg.front === 'gtw' ? 0.65 : cfg.front === 'virm' ? 0.2 : 0.12;
  const lower = box(g, NOSE, sill - floor, W - 0.08, mat(cfg.nose), x0 + end * NOSE / 2, (floor + sill) / 2);
  lower.castShadow = true;
  const glassLen = NOSE - setback;
  const top = H - 0.3;
  box(g, glassLen, top - sill, W - 0.16, GLASS_MAT, x0 + end * glassLen / 2, (sill + top) / 2);
  box(g, glassLen, 0.3, W - 0.2, mat(cfg.front === 'virm' ? cfg.nose : cfg.body), x0 + end * glassLen / 2, top + 0.15);
  if (cfg.front === 'gtw') {
    // sloping bonnet between the sill and the set-back windscreen
    const bonnet = box(g, setback * 1.25, 0.08, W - 0.2, mat(cfg.nose), tip - end * setback / 2, sill + 0.2);
    bonnet.rotation.z = -end * 0.55;
  }
  box(g, 0.06, 0.3, W - 0.12, mat(cfg.accent), tip + end * 0.02, cfg.front === 'virm' ? 1.05 : 1.25);
  if (cfg.front === 'virm') box(g, 0.06, 0.12, W - 0.12, mat(cfg.stripe), tip + end * 0.02, 1.45);
  box(g, 0.45, 0.45, W - 0.5, DARK(), tip - end * 0.15, 0.5);
  lamps[end] = [];
  for (const z of [-0.92, 0.92]) lamps[end].push(box(g, 0.06, 0.16, 0.36, LAMP_DARK, tip + end * 0.04, cfg.front === 'virm' ? 1.75 : 1.55, z));
}

function buildPowerModule(cfg, seg) {
  const g = new THREE.Group();
  const L = seg.len, H = cfg.height - 0.1, W = TRAIN_HALF_WIDTH * 2 - 0.1;
  box(g, L - 0.6, 0.7, 2.2, DARK(), 0, 0.55);
  const shell = box(g, L, H - 0.8, W, mat(cfg.stripe), 0, 0.8 + (H - 0.8) / 2);
  shell.castShadow = true;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) box(g, L * 0.55, 0.08, 0.04, DARK(), 0, 1.6 + k * 0.28, side * (W / 2 + 0.01));
    box(g, 0.7, 0.55, 0.04, GLASS_MAT, L * 0.3, 2.6, side * (W / 2 + 0.01));
  }
  box(g, L - 0.6, 0.35, W - 0.6, ROOF(), 0, H + 0.12);
  box(g, 0.25, 0.5, 0.25, DARK(), -L * 0.2, H + 0.5, 0.4);
  g.userData.lamps = {};
  return g;
}

// Goods train (story): a diesel loco with a cab at both ends, and flats
// with a low deck (railway.js FLAT_DECK_Z) that a car can ride on.
function buildLoco(cfg, seg) {
  const g = new THREE.Group();
  const L = seg.len, H = cfg.height, W = TRAIN_HALF_WIDTH * 2;
  const NOSE = 1.6, x1 = L / 2 - NOSE, x0 = -L / 2 + NOSE, floor = 0.9;
  box(g, L - 0.4, 0.45, W - 0.3, DARK(), 0, floor - 0.12);
  for (const e of [-1, 1]) box(g, 3.2, 0.7, 2.2, DARK(), e * (L / 2 - 3), 0.45);
  const shell = box(g, x1 - x0, H - floor - 0.25, W - 0.2, mat(cfg.body), 0, floor + (H - floor - 0.25) / 2);
  shell.castShadow = true;
  box(g, x1 - x0, 0.3, W - 0.17, mat(cfg.stripe), 0, floor + 0.55);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) box(g, 1.5, 0.9, 0.04, DARK(), x0 + 1.4 + k * (x1 - x0 - 2.8) / 3, H - 1.5, side * ((W - 0.2) / 2 + 0.01));
  }
  box(g, x1 - x0 - 0.6, 0.25, W - 0.6, ROOF(), 0, H - 0.1);
  const lamps = {};
  addCab(g, cfg, 1, x1, H, W, lamps);
  addCab(g, cfg, -1, x0, H, W, lamps);
  g.userData.lamps = lamps;
  return g;
}

function buildFlat(cfg, seg) {
  const g = new THREE.Group();
  const L = seg.len, W = TRAIN_HALF_WIDTH * 2 - 0.1, deck = FLAT_DECK_Z;
  const rust = mat(0x5e4331, { roughness: 0.9 });
  for (const e of [-1, 1]) box(g, 2.6, 0.7, 2.1, DARK(), e * (L / 2 - 2.2), 0.45);
  box(g, L, 0.36, W, rust, 0, deck - 0.18).castShadow = true;
  box(g, L - 0.2, 0.05, W - 0.5, mat(0x3b3f44, { roughness: 0.95 }), 0, deck + 0.02);
  for (const side of [-1, 1]) {
    box(g, L, 0.12, 0.1, mat(cfg.stripe), 0, deck + 0.2, side * (W / 2 - 0.05));
    for (let k = 0; k < 6; k++) box(g, 0.1, 0.45, 0.1, rust, -L / 2 + 0.6 + k * (L - 1.2) / 5, deck + 0.22, side * (W / 2 - 0.05));
  }
  g.userData.lamps = {};
  return g;
}

function buildCar(cfg, seg) {
  if (seg.kind === 'power') return buildPowerModule(cfg, seg);
  if (seg.kind === 'loco') return buildLoco(cfg, seg);
  if (seg.kind === 'flat') return buildFlat(cfg, seg);
  const g = new THREE.Group();
  const L = seg.len, H = cfg.height, W = TRAIN_HALF_WIDTH * 2;
  const NOSE = cfg.front === 'virm' ? 1.9 : 1.6;
  const x1 = L / 2 - (seg.cab === 1 ? NOSE : 0);
  const x0 = -L / 2 + (seg.cab === -1 ? NOSE : 0);
  const bl = x1 - x0, bx = (x0 + x1) / 2;
  const floor = cfg.doubleDeck ? 0.5 : 0.7;
  const body = mat(cfg.body), stripe = mat(cfg.stripe), door = mat(cfg.door);
  const shell = box(g, bl, H - floor - 0.2, W, body, bx, floor + (H - floor - 0.2) / 2);
  shell.castShadow = true;
  box(g, bl - 0.4, 0.25, W - 0.5, ROOF(), bx, H - 0.08);
  if (cfg.doubleDeck) {
    // VIRM-style: single-deck ends over the bogies, low-slung double-deck middle
    const endLen = 4.6;
    for (const e of [-1, 1]) box(g, 2.8, 0.75, 2.3, DARK(), e * (L / 2 - 2.6), 0.5);
    box(g, bl - 2 * endLen, 0.72, W + 0.02, GLASS_MAT, bx, 1.55);
    box(g, bl - 1.2, 0.72, W + 0.02, GLASS_MAT, bx, 3.25);
    box(g, bl, 0.22, W + 0.03, stripe, bx, 0.72);
    box(g, bl, 0.1, W + 0.03, stripe, bx, H - 0.45);
    for (const e of [-1, 1]) {
      const dx = e > 0 ? x1 - endLen + 1.6 : x0 + endLen - 1.6;
      box(g, 1.35, 2.05, W + 0.04, door, dx, 1.9);
      box(g, 1.0, 0.7, W + 0.02, GLASS_MAT, e > 0 ? x1 - 1.1 : x0 + 1.1, 2.45);
    }
  } else {
    // low-floor GTW/WINK car: bogie only under the cab end, the other end
    // rests on the power module
    const cabEnd = seg.cab || 1;
    box(g, 2.6, 0.6, 2.2, DARK(), cabEnd * (L / 2 - 3.2), 0.45);
    box(g, bl, 0.35, W - 0.3, DARK(), bx, floor - 0.05);
    box(g, bl - 1.2, 0.95, W + 0.02, GLASS_MAT, bx, 1.95);
    box(g, bl, 0.42, W + 0.03, stripe, bx, 1.0);
    box(g, bl, 0.07, W + 0.03, stripe, bx, 2.55);
    for (const dx of [-cabEnd * (L / 2 - 3.2), cabEnd * (L / 2 - 6.5)]) box(g, 1.45, 2.15, W + 0.04, door, dx, floor + 1.1);
  }
  const lamps = {};
  if (seg.cab === 1) addCab(g, cfg, 1, x1, H, W, lamps);
  if (seg.cab === -1) addCab(g, cfg, -1, x0, H, W, lamps);
  g.userData.lamps = lamps;
  return g;
}

function buildTrainView(t) {
  const group = new THREE.Group();
  const cars = t.cars.map((car) => {
    const m = buildCar(t.cfg, car.seg);
    group.add(m);
    return m;
  });
  scene.add(group);
  return { group, cars };
}

function updateTrains(px, py, night) {
  GLASS_MAT.emissiveIntensity = 0.55 * night;
  HEAD_MAT.color.setHex(0xfff6dc).multiplyScalar(1 + 2 * night);
  const all = getTrains();
  if (trainViews.size > all.length) {
    // a story train that is gone again
    for (const [t, view] of trainViews) {
      if (all.includes(t)) continue;
      view.group.removeFromParent();
      view.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      trainViews.delete(t);
    }
  }
  for (const t of all) {
    let view = trainViews.get(t);
    const mid = t.cars[t.cars.length >> 1];
    const near = !t.gastWeg && Math.abs(mid.x - px) < VIEW + t.halfLen && Math.abs(mid.y - py) < VIEW + t.halfLen; // gastWeg: een gast tekent alleen de treinen van de host (#428)
    if (!view) {
      if (!near) continue;
      view = buildTrainView(t);
      trainViews.set(t, view);
    }
    view.group.visible = near;
    if (!near) continue;
    t.cars.forEach((car, i) => {
      const m = view.cars[i];
      m.visible = !isOffMap(car.x, car.y);
      m.position.set(car.x, car.z || 0, car.y);
      m.rotation.order = 'YZX';
      m.rotation.set(0, -car.angle, car.pitch || 0);
      const lamps = m.userData.lamps;
      // the leading cab shows white headlights, the trailing one red tail lights
      if (lamps[1]) for (const l of lamps[1]) l.material = t.dir > 0 ? HEAD_MAT : TAIL_MAT;
      if (lamps[-1]) for (const l of lamps[-1]) l.material = t.dir < 0 ? HEAD_MAT : TAIL_MAT;
    });
  }
}

// ---------------------------------------------------------------- hooks
let crossingsBuilt = false;
let trackBuilt = false;

export function initRailway3D(sceneRef, mapRef) {
  scene = sceneRef;
  map = mapRef;
}

// Every chunk's track bed as built meshes, for scripts/mesh_audit.mjs
// (railway.js initRailway must have loaded the lifts).
export function buildTrackMeshes(mapRef) {
  map = mapRef;
  if (!trackBuilt) { buildTrackData(); trackBuilt = true; }
  return [...chunks.values()].map(buildChunk);
}

// focus: where the camera looks (scene3d streamFocus: the player, or the shot's
// point in a cutscene); viewDist: the draw distance setting in metres.
export function updateRailway3D(dt, world, focus, viewDist) {
  if (!scene) return;
  const p = world.player;
  const f = focus || (p.inVehicle || p);
  const px = f.x, py = f.y;
  if (viewDist) VIEW = railViewDistance(viewDist);
  // railway.js (initRailway) must have loaded the lifts before the bed is built
  if (!trackBuilt) { buildTrackData(); trackBuilt = true; }
  if (!crossingsBuilt && getLevelCrossings().length) { buildCrossings(); crossingsBuilt = true; }
  const night = world.dayNight ? world.dayNight.night || 0 : 0;
  syncChunks(px, py);
  updateCrossings(px, py, night);
  updateTrains(px, py, night);
}
