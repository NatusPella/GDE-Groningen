import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { closestPointOnSegment, pointInPolygon } from './util.js';

// Street names at both ends of every named road way (OSM splits streets at
// junctions, so way ends are almost always corners). Like real Dutch street
// plates they hang on the corner facade; where no facade runs along the
// street, the name is painted on the road surface instead. Only names near
// the player are built; textures are cached per name while in use.

const SIGN_RADIUS = 70;
const REFRESH_INTERVAL = 0.5;
const DEDUPE_DIST = 25;
const INSET_ALONG = 4;
const FACADE_SEARCH = 9;
const FACADE_MIN_PARALLEL = 0.85;
const FACADE_MIN_LEN = 2.5;
const PLATE_H = 0.5;
const PLATE_Y = 2.9;
const ROAD_TEXT_H = 1.8;
const ROAD_INSET = 7;
const TEXT_PX = 96;
const PLATE_COLOR = '#1f3f8f';
// m voor de gevel: de achterplaat (0,025 dik, middelpunt op 0,02) en de tekst erop; de tekst ligt 7,5 mm voor de plaat
// (was 1,5 mm: dat is onder de dieptebuffer-resolutie van 70 m, #382) en krijgt daarbij een polygonOffset
const PLATE_Z = { back: 0.02, text: 0.04 };

const PLANE_GEO = new THREE.PlaneGeometry(1, 1);
const PLATE_BACK_GEO = new THREE.BoxGeometry(1, 1, 0.025);
const PLATE_BACK_MAT = new THREE.MeshStandardMaterial({ color: PLATE_COLOR, roughness: 0.5 });

let signs = null;
let group = null;
let refreshTimer = 0;
const active = new Map();
const textures = new Map();

function roadEnds(road) {
  const n = road.pts.length;
  return [[road.pts[0], road.pts[1]], [road.pts[n - 1], road.pts[n - 2]]];
}

// Nearest building edge that runs along the street near (x, y); returns the
// mount point on the wall and the wall's outward normal (towards the street).
function findFacade(map, x, y, ux, uy, cx, cy) {
  let best = null;
  for (const b of map.buildingsNear(x, y, FACADE_SEARCH)) {
    const pts = b.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const ex = bx - ax, ey = by - ay;
      const len = Math.hypot(ex, ey);
      if (len < FACADE_MIN_LEN) continue;
      if (Math.abs((ex * ux + ey * uy) / len) < FACADE_MIN_PARALLEL) continue;
      const cp = closestPointOnSegment(x, y, ax, ay, bx, by);
      const d = Math.sqrt(cp.dist2);
      if (d > FACADE_SEARCH || (best && d >= best.d)) continue;
      // keep the plate away from the wall's corners
      const t = ((cp.x - ax) * ex + (cp.y - ay) * ey) / (len * len);
      const margin = Math.min(0.45, 0.9 / len);
      const tc = Math.min(1 - margin, Math.max(margin, t));
      const mx = ax + ex * tc, my = ay + ey * tc;
      let nx = -ey / len, ny = ex / len;
      if (pointInPolygon(mx + nx * 0.3, my + ny * 0.3, pts)) { nx = -nx; ny = -ny; }
      // the facade must face the street centreline, not a back yard
      if ((cx - mx) * nx + (cy - my) * ny <= 0) continue;
      best = { d, x: mx, y: my, nx, ny };
    }
  }
  return best;
}

function buildSignIndex(map) {
  const list = [];
  const byName = new Map();
  for (const road of map.roads) {
    if (!road.name || road.pts.length < 2 || road.bridge || road.z) continue;
    if (road.cat === 'foot' || road.cat === 'cycle') continue;
    for (const [a, b] of roadEnds(road)) {
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < ROAD_INSET * 1.5) continue;
      const ux = dx / len, uy = dy / len;
      const half = (road.width || 6) / 2;
      const kx = a[0] + ux * INSET_ALONG - uy * (half + 1.5);
      const ky = a[1] + uy * INSET_ALONG + ux * (half + 1.5);
      const same = byName.get(road.name) || [];
      if (same.some((s) => Math.hypot(s.x - kx, s.y - ky) < DEDUPE_DIST)) continue;
      const facade = findFacade(map, kx, ky, ux, uy, a[0] + ux * INSET_ALONG, a[1] + uy * INSET_ALONG);
      let sign;
      if (facade && facade.d < half + 6) {
        sign = { name: road.name, kind: 'facade', x: facade.x, y: facade.y, nx: facade.nx, ny: facade.ny };
      } else {
        // painted across the lane, readable when driving into the street
        sign = { name: road.name, kind: 'road', x: a[0] + ux * ROAD_INSET, y: a[1] + uy * ROAD_INSET, ux, uy, half };
      }
      same.push(sign);
      byName.set(road.name, same);
      list.push(sign);
    }
  }
  return list;
}

function textTexture(name, kind) {
  const key = kind + '|' + name;
  let entry = textures.get(key);
  if (entry) { entry.users++; return entry; }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `bold ${TEXT_PX}px 'Arial Narrow', Arial, sans-serif`;
  ctx.font = font;
  const textW = Math.ceil(ctx.measureText(name).width);
  canvas.width = textW + TEXT_PX;
  canvas.height = Math.round(TEXT_PX * 1.45);
  if (kind === 'facade') {
    ctx.fillStyle = PLATE_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  }
  ctx.font = font;
  ctx.fillStyle = kind === 'road' ? 'rgba(242,240,230,0.92)' : '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, canvas.width / 2, canvas.height / 2 + TEXT_PX * 0.04);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const material = kind === 'road'
    ? new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false, roughness: 0.8,
      polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -34,
    })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
  entry = { material, aspect: canvas.width / canvas.height, users: 1, key };
  textures.set(key, entry);
  return entry;
}

function releaseTexture(sign) {
  const key = sign.kind + '|' + sign.name;
  const entry = textures.get(key);
  if (!entry || --entry.users > 0) return;
  entry.material.map.dispose();
  entry.material.dispose();
  textures.delete(key);
}

function buildSignMesh(sign) {
  const g = new THREE.Group();
  const face = textTexture(sign.name, sign.kind);
  if (sign.kind === 'facade') {
    const w = PLATE_H * face.aspect;
    const back = new THREE.Mesh(PLATE_BACK_GEO, PLATE_BACK_MAT);
    back.scale.set(w + 0.04, PLATE_H + 0.04, 1);
    back.position.z = PLATE_Z.back;
    g.add(back);
    const text = new THREE.Mesh(PLANE_GEO, face.material);
    text.scale.set(w, PLATE_H, 1);
    text.position.z = PLATE_Z.text;
    g.add(text);
    g.position.set(sign.x, PLATE_Y, sign.y);
    g.rotation.y = Math.atan2(sign.nx, sign.ny);
  } else {
    const w = Math.min(ROAD_TEXT_H * face.aspect, sign.half * 2 - 0.6);
    const h = w / face.aspect;
    const text = new THREE.Mesh(PLANE_GEO, face.material);
    text.scale.set(w, h, 1);
    text.rotation.x = -Math.PI / 2;
    text.renderOrder = 1;
    g.add(text);
    g.position.set(sign.x, 0.05, sign.y);
    // text baseline across the road, letters upright for traffic entering
    g.rotation.y = Math.atan2(-sign.ux, -sign.uy);
    text.receiveShadow = true;
  }
  return g;
}

export function updateStreetSigns(dt, world, scene) {
  if (!scene) return;
  if (!signs) {
    signs = buildSignIndex(world.map);
    group = new THREE.Group();
    scene.add(group);
  }
  refreshTimer -= dt;
  if (refreshTimer > 0) return;
  refreshTimer = REFRESH_INTERVAL;

  const px = world.player.x, py = world.player.y;
  const wanted = new Set();
  for (const s of signs) {
    if (Math.abs(s.x - px) > SIGN_RADIUS || Math.abs(s.y - py) > SIGN_RADIUS) continue;
    if (Math.hypot(s.x - px, s.y - py) > SIGN_RADIUS) continue;
    wanted.add(s);
    if (!active.has(s)) {
      const mesh = buildSignMesh(s);
      group.add(mesh);
      active.set(s, mesh);
    }
  }
  for (const [s, mesh] of active) {
    if (wanted.has(s)) continue;
    group.remove(mesh);
    releaseTexture(s);
    active.delete(s);
  }
}
