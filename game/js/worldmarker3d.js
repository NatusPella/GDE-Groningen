// The in-world objective marker: one look for every kind of target.
// A thin light column of fixed height, a ring on the ground and, floating
// above it, one icon whose SHAPE says what it is (the colour says it too, but
// never alone): start = diamond, goal = arrow down, optional = cube, door or
// shop = hexagon, garage = roller door, vehicle = pyramid, checkpoint = upright
// ring. Icon and distance label grow with the distance (capped), so far away it stays
// readable and close up it never fills the screen. Depth-tested, so walls
// hide it. Colours follow the map and minimap icons (a11y.js markerColors:
// yellow start, light blue objective, orange job, purple own goal).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markerColors } from './a11y.js';
import { FLAGS } from './devflags.js';
import { iconScale, iconLift, columnWidth, columnHeight, columnOpacity, discOpacity, glyphPulse, showLabel, labelText, columnNormalBlend, DAY_COLUMN_DARKEN, dayColumnOpacity } from './markerlook.js';

const MARKER_SOLID = FLAGS.marker === 'vorm';

const MARKER_KINDS = {
  start: { color: 'mission' },
  goal: { color: 'missionActive' },
  optional: { color: 'care' },
  door: { color: 'ok' },
  garage: { color: 'job' }, // de spuitdienst van een opdracht (#434): hetzelfde oranje als de garage op de kaart
  vehicle: { color: 'job' },
  checkpoint: { color: 'missionActive' },
  user: { color: 'user' },
  job: { color: 'job' },
};

const COLUMN_H = 28;
const ICON_Y = 5.5;
let markerCam = null;
export function setMarkerCamera(cam) { markerCam = cam; }
// night and rain (0..1): the column glows a little stronger when the light is poor
let markerEnv = { night: 0, rain: 0 };
export function setMarkerEnv(night, rain) { markerEnv = { night: night || 0, rain: rain || 0 }; }

let columnTex = null;
function columnTexture() {
  if (columnTex) return columnTex;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 64);
  columnTex = new THREE.CanvasTexture(c);
  return columnTex;
}

const iconGeo = {
  start: () => new THREE.OctahedronGeometry(0.9, 0).scale(0.8, 1.15, 0.8),
  goal: () => new THREE.ConeGeometry(0.85, 1.7, 4).rotateX(Math.PI),
  optional: () => new THREE.BoxGeometry(1.1, 1.1, 1.1),
  door: () => new THREE.CylinderGeometry(0.95, 0.95, 0.5, 6).rotateX(Math.PI / 2),
  garage: () => new THREE.BoxGeometry(1.7, 1.2, 0.42), // een roldeur: breed en plat (#434)
  vehicle: () => new THREE.ConeGeometry(0.95, 1.6, 3),
  checkpoint: () => new THREE.TorusGeometry(1, 0.2, 8, 24),
  user: () => new THREE.SphereGeometry(0.7, 12, 10),
  job: () => new THREE.ConeGeometry(0.85, 1.7, 4).rotateX(Math.PI),
};

// The soft style: one flat glyph per kind (its silhouette says what it is),
// a dark thin rim for contrast and a gentle glow; the colour comes from the sprite tint.
const glyphTex = {};
function glyphTexture(kind) {
  if (glyphTex[kind]) return glyphTex[kind];
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const glow = g.createRadialGradient(64, 64, 14, 64, 64, 62);
  glow.addColorStop(0, 'rgba(255,255,255,0.55)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, S, S);
  const path = () => {
    g.beginPath();
    if (kind === 'start') { g.moveTo(64, 16); g.lineTo(92, 64); g.lineTo(64, 112); g.lineTo(36, 64); g.closePath(); }
    else if (kind === 'goal' || kind === 'job') { g.moveTo(34, 30); g.lineTo(94, 30); g.lineTo(64, 100); g.closePath(); }
    else if (kind === 'optional') g.roundRect(36, 36, 56, 56, 12);
    else if (kind === 'door') { for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; g[i ? 'lineTo' : 'moveTo'](64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34); } g.closePath(); }
    else if (kind === 'garage') { // een roldeur met lamellen: de gaten vult evenodd donker (#434)
      g.roundRect(36, 32, 56, 64, 8);
      for (let i = 0; i < 3; i++) g.roundRect(43, 44 + i * 16, 42, 6, 3);
    }
    else if (kind === 'vehicle') { g.moveTo(64, 24); g.lineTo(96, 92); g.lineTo(32, 92); g.closePath(); }
    else if (kind === 'checkpoint') { g.arc(64, 64, 34, 0, Math.PI * 2); g.moveTo(94, 64); g.arc(64, 64, 20, 0, Math.PI * 2, true); }
    else g.arc(64, 64, 26, 0, Math.PI * 2);
  };
  g.lineJoin = 'round';
  path();
  g.lineWidth = 8; g.strokeStyle = 'rgba(12,20,14,0.85)'; g.stroke();
  g.fillStyle = '#ffffff'; g.fill('evenodd');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  glyphTex[kind] = tex;
  return tex;
}

function glyphIcon(kind) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTexture(kind), transparent: true, fog: false, depthWrite: false, toneMapped: false }));
  sprite.scale.set(3.6, 3.6, 1);
  const g = new THREE.Group();
  g.add(sprite);
  g.userData.solid = sprite;
  g.userData.soft = true;
  return g;
}

function icon(kind) {
  if (!MARKER_SOLID) return glyphIcon(kind);
  const geo = iconGeo[kind]();
  const solid = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false }));
  // a dark back-face shell is the outline: readable on sky, brick and foliage alike
  const shell = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0c140e, side: THREE.BackSide, fog: false, toneMapped: false }));
  shell.scale.setScalar(1.22);
  const g = new THREE.Group();
  g.add(shell, solid);
  g.userData.solid = solid;
  return g;
}

function labelSprite() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false, toneMapped: false }));
  s.userData.canvas = c;
  s.userData.tex = tex;
  s.scale.set(3.2, 1.2, 1);
  return s;
}

function drawLabel(sprite, text) {
  const c = sprite.userData.canvas, g = c.getContext('2d');
  g.clearRect(0, 0, 128, 48);
  g.fillStyle = 'rgba(12,20,14,0.82)';
  g.beginPath();
  g.roundRect(4, 6, 120, 36, 18);
  g.fill();
  g.fillStyle = '#f0ede4';
  g.font = "28px 'Bebas Neue', 'Arial Narrow', sans-serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 25);
  sprite.userData.tex.needsUpdate = true;
}

// kind: a key of MARKER_KINDS; switch later with setWorldMarkerKind
export function buildWorldMarker3D(kind = 'start') {
  const group = new THREE.Group();
  const mat = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false, ...o });
  const ground = new THREE.Mesh(new THREE.RingGeometry(MARKER_SOLID ? 1.7 : 1.9, 2.2, 40).rotateX(-Math.PI / 2), mat({ opacity: MARKER_SOLID ? 0.9 : 0.6, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
  ground.position.y = 0.06;
  ground.renderOrder = 1;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 32).rotateX(-Math.PI / 2), mat({ opacity: MARKER_SOLID ? 0.22 : 0.14, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
  disc.position.y = 0.055;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(MARKER_SOLID ? 0.1 : 0.07, MARKER_SOLID ? 0.22 : 0.16, COLUMN_H, 10, 1, true), mat({ opacity: MARKER_SOLID ? 0.55 : 0.4, map: columnTexture() }));
  column.position.y = COLUMN_H / 2;
  const top = new THREE.Group();
  top.position.y = ICON_Y;
  const icons = {};
  for (const k of Object.keys(iconGeo)) {
    icons[k] = icon(k);
    icons[k].visible = false;
    top.add(icons[k]);
  }
  const label = labelSprite();
  label.position.y = -2.1;
  top.add(label);
  group.add(disc, ground, column, top);
  group.userData.wm = { ground, disc, column, top, icons, label, kind: '', shown: '' };
  setWorldMarkerKind(group, kind);
  return group;
}

export function setWorldMarkerKind(group, kind) {
  const wm = group.userData.wm;
  if (!wm || wm.kind === kind || !MARKER_KINDS[kind]) return;
  wm.kind = kind;
  for (const [k, ic] of Object.entries(wm.icons)) ic.visible = k === kind;
  wm.shown = '';
}

// colour, bob, distance scaling and the distance label; once per frame after positioning
export function updateWorldMarker3D(group, time) {
  const wm = group.userData.wm;
  if (!wm) return;
  const hex = new THREE.Color(markerColors()[MARKER_KINDS[wm.kind].color]);
  for (const m of [wm.ground, wm.disc, wm.column]) m.material.color.copy(hex);
  const ic = wm.icons[wm.kind];
  ic.userData.solid.material.color.copy(hex);
  let d = 30;
  if (markerCam) d = Math.hypot(markerCam.position.x - group.position.x, markerCam.position.z - group.position.z);
  // 1 up close, up to 4.5 far off: the apparent size stays about the same (markerlook.js)
  wm.top.scale.setScalar(iconScale(d));
  wm.top.position.y = ICON_Y + iconLift(d) + Math.sin(time * 2.2) * 0.2;
  wm.column.scale.x = wm.column.scale.z = columnWidth(d);
  const ch = columnHeight(d);
  wm.column.scale.y = ch / COLUMN_H;
  wm.column.position.y = ch / 2;
  if (wm.kind === 'checkpoint' && markerCam) ic.rotation.y = Math.atan2(markerCam.position.x - group.position.x, markerCam.position.z - group.position.z);
  else ic.rotation.y = time * 1.4;
  wm.ground.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
  // soft style: the glyph and the column breathe slowly
  if (ic.userData.soft) {
    const br = Math.sin(time * 1.8);
    ic.scale.setScalar(glyphPulse(br));
    wm.column.material.opacity = columnOpacity(br, d, markerEnv);
    wm.disc.material.opacity = discOpacity(br, markerEnv);
    // by day: a normally blended, darker column that stays visible on the bright sky (#115)
    const day = columnNormalBlend(markerEnv);
    const want = day ? THREE.NormalBlending : THREE.AdditiveBlending;
    if (wm.column.material.blending !== want) { wm.column.material.blending = want; wm.column.material.needsUpdate = true; }
    if (day) {
      wm.column.material.color.multiplyScalar(DAY_COLUMN_DARKEN);
      wm.column.material.opacity = dayColumnOpacity(d) * (0.9 + 0.1 * br);
    }
  }
  wm.label.visible = showLabel(d);
  if (wm.label.visible) {
    const text = labelText(d);
    if (text !== wm.shown) {
      wm.shown = text;
      drawLabel(wm.label, text);
    }
  }
}
