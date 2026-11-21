// De luchtlijn: in een vliegtuig, helikopter of als duif loopt de route als een RECHTE lijn door de lucht
// van de neus naar het doel (airguide.js heeft de rekenregels). Eén voorgealloceerde buffergeometrie
// (een liggend en een staand lint met chevrons, per frame alleen de hoekpunten bijgewerkt), plus een
// doelmarker: een kolom en een ring op vlieghoogte, en een pijl omhoog of omlaag als je moet stijgen of dalen.
// Geen grondstrook zolang je vliegt (routeribbon3d.js bouwt hem dan niet).
//
// Kleuren zijn de tokens van het designsysteem: zomergeel voor de route (markerColors().mission),
// inkt voor de rand. Onder "Beweging beperken" staan de chevrons stil.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markerColors } from '../a11y.js';
import { reducedMotion } from '../motion.js';
import { airLine, airLineFault, airGuide, AIR_LINE_AHEAD_M, AIR_ALT_BAND } from '../airguide.js';
import { noteRibbonRepair } from '../pathribbonwatch.js';
import { airProfileFor, profileAt, profileLateral, airNeed, setAirNeed, getAirNeed, TURBINE_TIP_FACTOR, PYLON_TOP } from '../airprofile.js';
import { farPropsIn } from '../farprops.js';

const HALF_W = 3.2;
const NOSE_M = 14;
const CHEVRON_M = 24;
const SECTIONS = Math.ceil(AIR_LINE_AHEAD_M / 20) + 1; // om de ~20 m een doorsnede: de lijn volgt het hoogteprofiel (airprofile.js)
const INK = '#1d1b17';
const WATCH_S = 0.5;

let root = null;
let lineMesh = null;
let marker = null;
let arrow = null;
let errorsSeen = 0;
let watchT = 0;
let hiddenLast = false;
let sceneRef = null;
const stat = { shown: false, len: 0, goal: null };

let clock = 0;
// De hoge dingen van het platteland die niet als gebouw in de tegels staan: windturbines (tip = gondel x factor) en
// hoogspanningsmasten (farprops.js). Per route en blok van 1 km om je heen één keer opgezocht, niet per bemonstering.
const far = { key: '', list: [] };
function farExtra(me, target) {
  const key = `${Math.round(me.x / 1000)}:${Math.round(me.y / 1000)}:${Math.round(target.x)}:${Math.round(target.y)}`;
  if (far.key !== key) {
    far.key = key;
    const x0 = Math.min(me.x, target.x) - 80, x1 = Math.max(me.x, target.x) + 80, y0 = Math.min(me.y, target.y) - 80, y1 = Math.max(me.y, target.y) + 80;
    const f = farPropsIn(x0, y0, x1, y1);
    far.list = [...f.turbines.map((t) => ({ x: t[0], y: t[1], top: (t[2] || 85) * TURBINE_TIP_FACTOR, name: 'windturbine' })), ...f.pylons.map((p) => ({ x: p[0], y: p[1], top: PYLON_TOP, name: 'hoogspanningsmast' }))];
  }
  if (!far.list.length) return null;
  return (x, y, r) => {
    let best = null;
    for (const o of far.list) if ((!best || o.top > best.top) && Math.abs(o.x - x) <= r + 6 && Math.abs(o.y - y) <= r + 6) best = o;
    return best;
  };
}

function chevronTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(29,27,23,0.35)';
  g.fillRect(0, 0, 64, 64);
  // eerst de inktrand, dan de gele vulling (zeefdruk: harde rand, geen gloed)
  const path = () => { g.beginPath(); g.moveTo(32, 8); g.lineTo(60, 36); g.lineTo(60, 52); g.lineTo(32, 24); g.lineTo(4, 52); g.lineTo(4, 36); g.closePath(); };
  path(); g.lineWidth = 6; g.strokeStyle = INK; g.lineJoin = 'miter'; g.stroke();
  path(); g.fillStyle = '#fff'; g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function build() {
  const n = SECTIONS * 2 * 2; // twee linten, twee hoekpunten per doorsnede
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const uv = new Float32Array(n * 2);
  const col = new Float32Array(n * 4).fill(1);
  const idx = [];
  for (let r = 0; r < 2; r++) {
    for (let s = 0; s < SECTIONS - 1; s++) {
      const q = (r * SECTIONS + s) * 2;
      idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
    }
    for (let s = 0; s < SECTIONS; s++) for (let k = 0; k < 2; k++) uv[((r * SECTIONS + s) * 2 + k) * 2] = k;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    map: chevronTexture(), vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, fog: false,
  }));
  m.frustumCulled = false;
  m.renderOrder = 3;
  return m;
}

function buildMarker() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshBasicMaterial({ color: 0xf9c80e, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const ink = new THREE.MeshBasicMaterial({ color: 0x1d1b17, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, fog: false });
  // kolom: dun, open, van de grond tot boven de ring
  const col = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1, 10, 1, true), yellow);
  // ring op vlieghoogte met een inktrand eromheen (eerste de rand, iets groter)
  const ringEdge = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 6, 40), ink);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: 0xf9c80e, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
  ring.renderOrder = ringEdge.renderOrder = col.renderOrder = 3;
  g.add(col, ringEdge, ring);
  g.userData = { col, ring, ringEdge };
  g.traverse((o) => { o.frustumCulled = false; });
  return g;
}

function buildArrow() {
  const m = new THREE.Mesh(new THREE.ConeGeometry(2.4, 6, 4), new THREE.MeshBasicMaterial({ color: 0xf9c80e, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
  m.renderOrder = 3;
  m.frustumCulled = false;
  return m;
}

function ensure(scene) {
  if (root && sceneRef === scene) return;
  sceneRef = scene;
  root = new THREE.Group();
  root.visible = false;
  lineMesh = build();
  marker = buildMarker();
  arrow = buildArrow();
  root.add(lineMesh, marker, arrow);
  scene.add(root);
}

export function hideAirLine3D() {
  hiddenLast = true;
  if (root) root.visible = false;
}

function writeLine(L, dirx, diry, zAt) {
  const pos = lineMesh.geometry.attributes.position;
  const uv = lineMesh.geometry.attributes.uv;
  const col = lineMesh.geometry.attributes.color;
  const a = pos.array;
  // zijkant van het liggende lint (haaks op de lijn) en de staande (omhoog)
  const nx = -diry * HALF_W, ny = dirx * HALF_W;
  for (let r = 0; r < 2; r++) {
    for (let s = 0; s < SECTIONS; s++) {
      const d = NOSE_M + (s / (SECTIONS - 1)) * (L.len - NOSE_M);
      const t = Math.max(0, Math.min(1, d / L.len));
      const fadeS = s === 0 ? 0 : s === SECTIONS - 1 && L.clipped ? 0 : 1;
      const cx = L.x0 + (L.x1 - L.x0) * t, cy = L.y0 + (L.y1 - L.y0) * t;
      // de hoogte volgt het profiel boven de gebouwen; zonder profiel de oude rechte helling
      const cz = zAt ? zAt(d) : L.z0 + (L.z1 - L.z0) * t;
      for (let k = 0; k < 2; k++) {
        const side = k === 0 ? 1 : -1;
        const j = (r * SECTIONS + s) * 2 + k;
        if (r === 0) { a[j * 3] = cx + nx * side; a[j * 3 + 1] = cz; a[j * 3 + 2] = cy + ny * side; }
        else { a[j * 3] = cx; a[j * 3 + 1] = cz + HALF_W * side; a[j * 3 + 2] = cy; }
        uv.array[j * 2 + 1] = d / CHEVRON_M;
        col.array[j * 4 + 3] = fadeS;
      }
    }
  }
  pos.needsUpdate = uv.needsUpdate = col.needsUpdate = true;
}

function lineState() {
  const g = lineMesh && lineMesh.geometry;
  const p = g && g.attributes.position;
  return {
    wanted: stat.wanted,
    meshExists: !!lineMesh,
    inScene: !!(lineMesh && lineMesh.parent && root.parent),
    visible: !!(root && root.visible && lineMesh && lineMesh.visible),
    vertexCount: p ? p.count : 0,
    finite: !p || (Number.isFinite(p.array[0]) && Number.isFinite(p.array[p.array.length - 2])),
  };
}

// Elk frame vanuit routeribbon3d.js. flying: de speler zit in een luchtvaartuig; route: de actieve route.
// me: { x, y, z, angle }. Geeft true als de luchtlijn getekend wordt.
// map: de wereldkaart voor het hoogteprofiel boven de gebouwen (airprofile.js); me.plane: een vliegtuig (hoger en vlakker).
export function updateAirLine3D(scene, dt, flying, route, me, map = null) {
  const hiddenNow = hiddenLast;
  hiddenLast = false;
  ensure(scene);
  const wanted = !!(flying && route && route.mode === 'fly' && route.target && me && route.remaining > 10 && !hiddenNow);
  stat.wanted = wanted;
  if (!wanted) { root.visible = false; stat.shown = false; setAirNeed(null); return false; }
  const alt = route.alt || 80;
  const L = airLine(me, route.target, alt, AIR_LINE_AHEAD_M);
  if (!L) { root.visible = false; stat.shown = false; setAirNeed(null); return false; }
  try {
    const dx = L.x1 - L.x0, dy = L.y1 - L.y0, l = Math.hypot(dx, dy) || 1;
    // het hoogteprofiel: één keer per route (opnieuw bij een andere route, afdrijven of een tegelwissel), nooit per frame
    clock += dt;
    let prof = null, zAt = null, goalZ = alt;
    if (map) {
      prof = airProfileFor(map, me, route.target, { plane: !!me.plane, base: alt, extra: farExtra(me, route.target) }, clock);
      const s = profileLateral(prof, me.x, me.y).s;
      zAt = (d) => profileAt(prof, s + d);
      goalZ = prof.atEnd ? profileAt(prof, prof.total) : alt;
      L.z1 = zAt(L.len);
      setAirNeed(airNeed(prof, s, AIR_LINE_AHEAD_M));
    } else setAirNeed(null);
    writeLine(L, dx / l, dy / l, zAt);
    const color = new THREE.Color(markerColors().mission);
    lineMesh.material.color.copy(color);
    // doelmarker: kolom van de grond tot boven de ring, ring op vlieghoogte; groter naarmate je er verder van af bent
    const T = route.target;
    const gz = Number.isFinite(T.z) ? T.z : 0;
    const k = Math.max(1, Math.min(4, L.total / 350));
    const top = goalZ + 30;
    const { col, ring, ringEdge } = marker.userData;
    marker.position.set(T.x, gz, T.y);
    col.scale.set(k, top - gz, k);
    col.position.y = (top - gz) / 2;
    ring.scale.setScalar(14 * k); ringEdge.scale.setScalar(14.5 * k);
    ring.position.y = ringEdge.position.y = goalZ - gz;
    // de ring staat haaks op de aanvliegrichting, zodat je er doorheen kijkt
    ring.rotation.y = ringEdge.rotation.y = Math.atan2(-dy, dx) + Math.PI / 2;
    // hoogte-aanwijzing: een pijl een stuk voor de neus, omhoog bij stijgen, omlaag bij dalen, weg als de hoogte goed is
    const g = airGuide(me, T, { alt, need: getAirNeed() });
    const showArrow = Math.abs(g.dz) > AIR_ALT_BAND;
    arrow.visible = showArrow;
    if (showArrow) {
      arrow.position.set(L.x0 + (dx / l) * 40, me.z + (g.dz > 0 ? 7 : -7), L.y0 + (dy / l) * 40);
      arrow.rotation.x = g.dz > 0 ? 0 : Math.PI;
    }
    if (!reducedMotion()) lineMesh.material.map.offset.y -= dt * 0.8;
    root.visible = true;
    if (!lineMesh.parent) root.add(lineMesh);
    if (!root.parent) scene.add(root);
    stat.shown = true; stat.len = L.len; stat.goal = { x: T.x, y: T.y };
  } catch (e) {
    root.visible = false;
    if (errorsSeen++ < 3) console.warn('[route] fout in de luchtlijn', e);
    return false;
  }
  // waakhond: bestaat de luchtlijn nog zoals hij hoort? Anders herstel en tel (zie pathribbonwatch.js)
  watchT += dt;
  if (watchT >= WATCH_S) {
    watchT = 0;
    const fault = airLineFault(lineState());
    if (fault) {
      noteRibbonRepair(`lucht-${fault}`);
      if (!lineMesh.parent) root.add(lineMesh);
      if (!root.parent) scene.add(root);
      lineMesh.visible = true;
      root.visible = true;
    }
  }
  return true;
}

export function getAirLineState() {
  return { ...stat, ...lineState() };
}
