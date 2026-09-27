import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, seatPerson, SEATED_DROP, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { spawnHeroCarNear, spawnVehicleOnRoad, manageTrafficPopulation, manageBikePopulation, updateTrafficAI, resolveVehicleBuildingCollision } from './vehicle.js';
import { spawnPedestriansNear, updatePedestrians } from './pedestrians.js';
import { updateTrafficLights } from './trafficlights.js';
import { refreshDayNight } from './daynight.js';
import { playCinematic, roofAt } from './cinematics.js';
import { pointInPolygon } from './util.js';
import { playStoryVoice, stopStoryVoice, setStoryScene } from './audio.js';
import { setThemeDuck } from './theme.js';

// Recorded montage dialogue shares the story manifest ("<speaker>|<text>").
const VOICE_DIR = new URL('../audio/voicelines/story/', import.meta.url).href;
let voices = {};
fetch(VOICE_DIR + 'manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { voices = m || {}; }).catch(() => {});

// Opening montage for a fresh game: staged shots at real Grunn highlights with
// temporary actors, cars and particles, ending in the swoop down to the spawn.

const SEEN_KEY = 'gte-intro-seen';
const PED_TARGET = 40;
const FORUM_ROOF = 45; // roof deck of the Forum model in landmarks3d.js

export function introSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
}

function markIntroSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ }
}

const P = (x, y, z) => ({ x, y, z });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const lerpP = (a, b, t) => P(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));

function shake(t, amp, seed = 0) {
  return P(
    (Math.sin(t * 1.3 + seed) + Math.sin(t * 2.9 + seed * 2) * 0.5) * amp,
    (Math.sin(t * 1.7 + seed * 3) + Math.sin(t * 3.3 + seed) * 0.5) * amp,
    (Math.sin(t * 1.1 + seed * 5) + Math.sin(t * 2.3 + seed * 4) * 0.4) * amp * 0.6,
  );
}

function pose(pos, look, fov, t = 0, amp = 0) {
  const s = shake(t, amp, 1), l = shake(t, amp * 1.6, 7);
  return {
    position: P(pos.x + s.x, pos.y + s.y, pos.z + s.z),
    lookAt: P(look.x + l.x, look.y + l.y, look.z + l.z),
    fov, cut: true,
  };
}

function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      s = Math.max(0, Math.min(len - 1e-3, s));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = pts[i - 1], b = pts[i];
      const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    },
  };
}

// --- styling -----------------------------------------------------------------

const CSS = `
#intro-montage { position: fixed; inset: 0; z-index: 16; pointer-events: none; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; opacity: 0; transition: opacity 0.3s; }
#intro-montage.on { opacity: 1; }
#intro-montage > div { position: absolute; inset: 0; }
#intro-montage .im-grade { background: linear-gradient(160deg, rgba(0, 150, 170, 0.22) 0%, rgba(0, 0, 0, 0) 45%, rgba(255, 128, 40, 0.2) 100%); mix-blend-mode: soft-light; }
#intro-montage .im-vig { background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 55%, rgba(4, 10, 8, 0.55) 100%); }
#intro-montage .im-grain { background-image: var(--grain); opacity: 0.07; animation: grain 0.5s steps(4) infinite; }
#intro-montage .im-flare { opacity: 0; transition: opacity 0.8s; mix-blend-mode: screen;
  background: radial-gradient(circle at var(--fx, 80%) var(--fy, 20%), rgba(255, 214, 150, 0.75) 0, rgba(255, 170, 80, 0.28) 7%, rgba(255, 140, 60, 0) 26%),
    radial-gradient(circle at calc(100% - var(--fx, 80%)) calc(100% - var(--fy, 20%)), rgba(120, 220, 200, 0.18) 0, rgba(120, 220, 200, 0) 7%),
    radial-gradient(circle at calc(50% + (50% - var(--fx, 80%)) * 0.4) calc(50% + (50% - var(--fy, 20%)) * 0.4), rgba(255, 190, 120, 0.14) 0, rgba(255, 190, 120, 0) 4%),
    linear-gradient(90deg, rgba(255, 180, 90, 0) 0%, rgba(255, 180, 90, 0.08) 50%, rgba(255, 180, 90, 0) 100%); }
#intro-montage .im-flare.on { opacity: var(--fa, 1); }
#intro-montage .im-black { background: #050807; opacity: 0; transition: opacity 0.35s; }
#intro-montage .im-black.on { opacity: 1; transition: opacity 0.12s; }
#intro-montage .im-flash { background: #fff6e6; opacity: 0; }
#intro-montage .im-flash.go { animation: im-flash 0.28s ease-out; }
@keyframes im-flash { 0% { opacity: 0.85; } 100% { opacity: 0; } }
#intro-montage .im-card { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; opacity: 0; }
#intro-montage .im-card.on { animation: im-card-in 2.4s cubic-bezier(0.15, 0.7, 0.2, 1) forwards; }
@keyframes im-card-in { 0% { opacity: 0; transform: scale(1.18); letter-spacing: 0.02em; } 18% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; transform: scale(1); letter-spacing: 0.12em; } }
#intro-montage .im-kicker { font-size: clamp(16px, 2vw, 26px); letter-spacing: 6px; color: #3fc97a; text-transform: uppercase; margin-bottom: 6px; }
#intro-montage .im-title { font-size: clamp(56px, 11vw, 160px); line-height: 0.9; text-transform: uppercase; text-shadow: 0 0 40px rgba(63, 201, 122, 0.25); }
#intro-montage .im-title .amp { color: #3fc97a; }
#intro-montage .im-card .gte-logo { font-size: clamp(110px, 20vw, 250px); }
#intro-montage .im-lower { top: auto; bottom: calc(11vh + 6vh); left: 6vw; right: auto; opacity: 0; transform: translateX(-30px); transition: opacity 0.5s, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1); text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8); }
#intro-montage .im-lower.on { opacity: 1; transform: none; }
#intro-montage .im-lower .im-title { font-size: clamp(48px, 8vw, 110px); }
#intro-montage .im-lower .im-title::after { content: ''; display: block; width: 130px; height: 4px; margin-top: 10px; background: linear-gradient(90deg, #1e9e56, #3fc97a); box-shadow: 0 0 14px rgba(63, 201, 122, 0.45); }
#intro-montage .im-cap { top: calc(11vh + 3.5vh); left: 6vw; right: auto; bottom: auto; max-width: min(70vw, 760px); opacity: 0; transform: translateY(-10px); transition: opacity 0.6s, transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1); text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85); }
#intro-montage .im-cap.on { opacity: 1; transform: none; }
#intro-montage .im-cap small { display: block; font-size: clamp(14px, 1.4vw, 19px); letter-spacing: 4px; color: #3fc97a; }
#intro-montage .im-cap span { display: block; margin-top: 2px; font-size: clamp(26px, 3.2vw, 44px); line-height: 1; letter-spacing: 1px; }
#intro-montage .im-lower .im-role { font-family: 'Arial Narrow', Arial, sans-serif; font-size: clamp(16px, 1.6vw, 22px); letter-spacing: 0.4px; margin-top: 6px; color: rgba(240, 237, 228, 0.9); }
#intro-montage .im-sub { top: auto; bottom: 5.5vh; left: 50%; right: auto; transform: translate(-50%, 50%); width: min(86vw, 860px); text-align: center; font-family: 'Arial Narrow', Arial, sans-serif; font-size: clamp(17px, 1.7vw, 23px); letter-spacing: 0.3px; opacity: 0; transition: opacity 0.25s; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); }
#intro-montage .im-sub.on { opacity: 1; }
#intro-montage .im-sub b { color: #3fc97a; margin-right: 6px; }
body.intro-montage #game3d { filter: contrast(1.08) saturate(1.18) brightness(1.02); }
`;

let ui = null;

function ensureUi() {
  if (ui) return ui;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'intro-montage';
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = '<div class="im-grade"></div><div class="im-vig"></div><div class="im-flare"></div><div class="im-grain"></div>' +
    '<div class="im-flash"></div><div class="im-black"></div><div class="im-card"></div><div class="im-cap"></div><div class="im-lower"></div><div class="im-sub"></div>';
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  ui = { root, flare: q('.im-flare'), flash: q('.im-flash'), black: q('.im-black'), card: q('.im-card'), cap: q('.im-cap'), lower: q('.im-lower'), sub: q('.im-sub'), subKey: '', tagKey: '' };
  return ui;
}

function flash() {
  ui.flash.classList.remove('go');
  void ui.flash.offsetWidth;
  ui.flash.classList.add('go');
}

function setSub(line) {
  const key = line ? line.who + line.text : '';
  if (key === ui.subKey) return;
  ui.subKey = key;
  // a new line starts its recording; clearing the subtitle lets it finish
  if (line) {
    const v = voices[line.who + '|' + line.text];
    if (v) playStoryVoice(VOICE_DIR + v.src);
  }
  ui.sub.classList.toggle('on', !!line);
  if (line) ui.sub.innerHTML = (line.who ? `<b>${line.who}:</b>` : '') + line.text;
}

function clockText(h) {
  const m = Math.round((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Name tag in the lower third while a character is introduced.
function setTag(tag) {
  const key = tag ? tag.name : '';
  if (key === ui.tagKey) return;
  ui.tagKey = key;
  if (!tag) { ui.lower.classList.remove('on'); return; }
  ui.lower.innerHTML = `<div class="im-title">${tag.name}</div><div class="im-role">${tag.role}</div>`;
  ui.lower.classList.remove('on');
  void ui.lower.offsetWidth;
  ui.lower.classList.add('on');
}

function showCard(html, dur) {
  ui.card.classList.remove('on');
  ui.card.style.animationDuration = dur + 's';
  ui.card.innerHTML = html;
  void ui.card.offsetWidth;
  ui.card.classList.add('on');
}

// --- props -------------------------------------------------------------------

const SHADOW_GEO = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
const BAG_GEO = new THREE.BoxGeometry(0.34, 0.26, 0.2);
const BAG_MAT = new THREE.MeshStandardMaterial({ color: 0x1f3b2a, roughness: 0.85 });
const NOTE_GEO = new THREE.PlaneGeometry(0.2, 0.104);
// Parody banknotes ("Bank van Grunn"): 20, 50 and 100 in their own colours,
// printed with a tower, guilloche lines and corner values.
const NOTE_KINDS = [
  { v: '20', base: '#5d84c4', dark: '#27406e', light: '#bcd2f0' },
  { v: '50', base: '#e08a3c', dark: '#8a4516', light: '#f7d2a6' },
  { v: '100', base: '#4f9a5a', dark: '#1f5530', light: '#c3e6c4' },
];
function noteTexture({ v, base, dark, light }) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 132;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 256, 132);
  bg.addColorStop(0, light); bg.addColorStop(0.45, base); bg.addColorStop(1, light);
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 132);
  g.strokeStyle = dark;
  g.globalAlpha = 0.28;
  g.lineWidth = 1;
  for (let k = 0; k < 14; k++) {
    g.beginPath();
    for (let x = 0; x <= 256; x += 4) g.lineTo(x, 18 + k * 7 + Math.sin(x / 14 + k) * 5);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.lineWidth = 4;
  g.strokeRect(5, 5, 246, 122);
  g.fillStyle = 'rgba(255, 255, 255, 0.55)';
  g.beginPath(); g.ellipse(62, 66, 30, 40, 0, 0, Math.PI * 2); g.fill();
  // a tower on the right: d'Olle Grieze, more or less
  g.fillStyle = dark;
  g.fillRect(186, 58, 26, 58); g.fillRect(190, 36, 18, 24); g.fillRect(193, 22, 12, 16);
  g.beginPath(); g.moveTo(192, 22); g.lineTo(199, 6); g.lineTo(206, 22); g.fill();
  g.font = 'bold 34px Arial Black, Arial, sans-serif';
  g.textBaseline = 'top';
  g.fillText(v, 14, 12);
  g.textAlign = 'right';
  g.textBaseline = 'bottom';
  g.font = 'bold 44px Arial Black, Arial, sans-serif';
  g.fillText(v, 176, 124);
  g.textAlign = 'left';
  g.font = 'bold 13px Arial, sans-serif';
  g.fillText('BANK VAN GRUNN', 16, 124);
  g.font = 'bold 20px Arial Black, Arial, sans-serif';
  g.fillText('EIERBAL', 92, 44);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
let noteMats = null;
function noteMaterials() {
  if (!noteMats) {
    noteMats = NOTE_KINDS.map((k) => {
      const map = noteTexture(k);
      // a touch of self-light so the notes still read in the night shots
      return new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.28, roughness: 0.75, side: THREE.DoubleSide });
    });
  }
  return noteMats;
}
const BIRD_GEO = new THREE.BoxGeometry(0.22, 0.1, 0.1);
const WING_GEO = new THREE.PlaneGeometry(0.11, 0.2).rotateX(-Math.PI / 2).translate(0, 0, 0.1);
const BIRD_MAT = new THREE.MeshStandardMaterial({ color: 0x7c8088, roughness: 0.9, side: THREE.DoubleSide });
const MAX_NOTES = 140;
const BIRDS = 28;

export function makeActor(app) {
  const m = buildPersonMesh(app.shirt, app.skin, app);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  sh.position.y = 0.03;
  sh.renderOrder = 1;
  m.add(sh);
  m.userData.blob = sh;
  return m;
}

function resetArms(ud) {
  for (const k of ['armL', 'armR']) { ud[k].rotation.x = 0; ud[k].rotation.y = 0; }
  if (ud.head) ud.head.rotation.y = 0;
}

function applyPose(m, name, t) {
  const ud = m.userData;
  const arm = (a, e, z, ez, x = 0) => { a.rotation.set(x, 0, z); if (e) e.rotation.z = ez; };
  switch (name) {
    case 'bag':
      arm(ud.armR, ud.elbowR, 0.08, 0.15, 0.12);
      break;
    case 'throw': {
      const k = 0.5 + Math.sin(t * 5) * 0.5;
      arm(ud.armL, ud.elbowL, 2.2 + k * 0.5, 0.4, -0.3);
      break;
    }
    case 'kissT':
      ud.chest.rotation.z = -0.1;
      ud.head.rotation.z = -0.22;
      arm(ud.armL, ud.elbowL, 0.75, 1.25, -0.5);
      arm(ud.armR, ud.elbowR, 0.75, 1.25, 0.5);
      break;
    case 'kissA':
      ud.chest.rotation.z = -0.04;
      ud.head.rotation.z = 0.12;
      arm(ud.armL, ud.elbowL, 2.05, 1.3, -0.45);
      arm(ud.armR, ud.elbowR, 2.05, 1.3, 0.45);
      break;
    case 'lean':
      m.rotation.z = 0.13;
      ud.head.rotation.z = 0.08;
      ud.head.rotation.y = 0.25 + Math.sin(t * 0.6) * 0.08;
      arm(ud.armL, ud.elbowL, 0.3, 1.55, 0.5);
      arm(ud.armR, ud.elbowR, 0.35, 1.5, -0.5);
      break;
    case 'lookL':
      ud.head.rotation.y = 0.35;
      break;
    case 'lookR':
      ud.head.rotation.y = -0.35;
      break;
  }
}

function makeNotes(group) {
  const meshes = noteMaterials().map((mat) => {
    const m = new THREE.InstancedMesh(NOTE_GEO, mat, MAX_NOTES);
    m.frustumCulled = false;
    m.count = 0;
    group.add(m);
    return m;
  });
  return { meshes, list: [], dummy: new THREE.Object3D() };
}

function emitNotes(n, count, x, y, z, spread = 1.5, up = 2.5) {
  for (let i = 0; i < count && n.list.length < MAX_NOTES; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * spread;
    n.list.push({
      x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: up * (0.5 + Math.random()),
      rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
      sx: (Math.random() - 0.5) * 9, sy: (Math.random() - 0.5) * 9, ph: Math.random() * 6,
      kind: Math.random() < 0.5 ? 1 : Math.random() < 0.6 ? 0 : 2,
    });
  }
}

function updateNotes(n, dt, t) {
  const d = n.dummy;
  const counts = n.meshes.map(() => 0);
  for (const p of n.list) {
    p.vz = Math.max(-0.7, p.vz - 5 * dt);
    const drag = Math.exp(-1.6 * dt);
    p.vx *= drag; p.vy *= drag;
    const sway = Math.sin(t * 3 + p.ph) * 0.6;
    if (p.z > 0.02) {
      p.x += (p.vx + sway) * dt;
      p.y += (p.vy + Math.cos(t * 2.3 + p.ph) * 0.4) * dt;
      p.z = Math.max(0.02, p.z + p.vz * dt);
      p.rx += p.sx * dt; p.ry += p.sy * dt;
    }
    d.position.set(p.x, p.z, p.y);
    d.rotation.set(p.z > 0.02 ? p.rx : -Math.PI / 2, p.ry, p.z > 0.02 ? p.rz : 0);
    d.updateMatrix();
    n.meshes[p.kind].setMatrixAt(counts[p.kind]++, d.matrix);
  }
  n.meshes.forEach((m, k) => { m.count = counts[k]; m.instanceMatrix.needsUpdate = true; });
}

export function makeBirds(group, cx, cy, r) {
  const body = new THREE.InstancedMesh(BIRD_GEO, BIRD_MAT, BIRDS);
  const wings = new THREE.InstancedMesh(WING_GEO, BIRD_MAT, BIRDS * 2);
  body.frustumCulled = wings.frustumCulled = false;
  group.add(body, wings);
  const list = [];
  for (let i = 0; i < BIRDS; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
    list.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, z: 0.1, h: Math.random() * 6, vx: 0, vy: 0, vz: 0, fly: false, ph: Math.random() * 6, delay: Math.random() * 0.5 });
  }
  return { body, wings, list, dummy: new THREE.Object3D() };
}

export function scatterBirds(b, fromX, fromY) {
  for (const p of b.list) {
    const a = Math.atan2(p.y - fromY, p.x - fromX) + (Math.random() - 0.5) * 1.2;
    const s = 3 + Math.random() * 3;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.vz = 3 + Math.random() * 3;
    p.h = a; p.fly = true;
  }
}

export function updateBirds(b, dt, t) {
  const d = b.dummy;
  d.rotation.order = 'YXZ';
  b.list.forEach((p, i) => {
    let flap;
    if (p.fly) {
      if ((p.delay -= dt) > 0) flap = 0.3;
      else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vz = Math.max(0.6, p.vz - 1.2 * dt);
        flap = Math.sin(t * 26 + p.ph) * 1.05;
      }
    } else {
      flap = 0.3;
      p.h += Math.sin(t * 0.7 + p.ph) * dt * 0.8;
    }
    const peck = p.fly ? 0 : Math.max(0, Math.sin(t * 2.2 + p.ph * 3)) * 0.5;
    d.position.set(p.x, p.z + 0.07, p.y);
    d.rotation.set(0, -p.h, -peck);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    b.body.setMatrixAt(i, d.matrix);
    for (const side of [1, -1]) {
      d.rotation.set(flap * side, -p.h, 0);
      d.scale.set(1, 1, side);
      d.updateMatrix();
      b.wings.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), d.matrix);
    }
  });
  b.body.instanceMatrix.needsUpdate = true;
  b.wings.instanceMatrix.needsUpdate = true;
}

// --- montage runtime ----------------------------------------------------------

let run = null;

export function isIntroPlaying() {
  return !!run;
}

export function stage(m, x, y, a, { h = 0, speed = 0, pose: name = null, dt = 0, t = 0 } = {}) {
  const ud = m.userData;
  m.visible = true;
  if (ud.seated) {
    ud.seated = false;
    ud.walkBlend = 0;
  }
  m.position.set(x, h, y);
  m.rotation.set(0, -a, 0);
  resetArms(ud);
  animatePersonWalk(m, speed, dt);
  if (name) applyPose(m, name, t);
  ud.blob.visible = true;
}

export function seat(m, v, driver) {
  const hl = v.model.len / 2, hw = v.model.wid / 2;
  const sx = -hl * 0.06, sz = (driver ? -1 : 1) * hw * 0.34;
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  m.visible = true;
  resetArms(m.userData);
  seatPerson(m, driver);
  m.position.set(v.x + c * sx - s * sz, -SEATED_DROP, v.y + s * sx + c * sz);
  m.rotation.set(0, -v.angle, 0);
  m.userData.blob.visible = false;
}

function moveSet(r, x, y) {
  const w = r.w, map = w.map;
  const [sx, sy] = map.escapeBuilding(x, y);
  const p = w.player;
  p.x = sx; p.y = sy; p.vx = 0; p.vy = 0;
  const c = w.companion;
  if (c && !c.inVehicle) { c.x = sx + 0.8; c.y = sy; c.vx = 0; c.vy = 0; }
  try {
    manageTrafficPopulation(w);
    manageBikePopulation(w);
    w.pedestrians = w.pedestrians.filter((q) => q.state === 'dead' || Math.hypot(q.x - sx, q.y - sy) < 150);
    if (w.pedestrians.length < PED_TARGET) w.pedestrians.push(...spawnPedestriansNear(map, sx, sy, PED_TARGET - w.pedestrians.length, Math.random));
  } catch (e) { console.warn(e); }
}

function setClock(w, h) {
  w.clock = ((h % 24) + 24) % 24;
  refreshDayNight(w);
}

function tempCar(r, x, y, a, police = false) {
  const w = r.w, map = w.map;
  let v;
  if (police) {
    const rp = map.nearestRoadPoint(x, y, 200, true);
    if (!rp) return null;
    v = spawnVehicleOnRoad(map, rp.road, true, Math.random, false, false, rp);
  } else {
    v = spawnHeroCarNear(map, x, y);
    if (!v) return null;
    v.isHeroCar = false;
  }
  v.x = x; v.y = y; v.angle = a; v.speed = 0;
  v.road = null; v.plan = [];
  v.driver = 'cine';
  v.cineTemp = true;
  v.missionCar = true;
  w.vehicles.push(v);
  r.cars.push(v);
  return v;
}

function clearRoadNear(r, path, dist) {
  const w = r.w;
  w.vehicles = w.vehicles.filter((v) => {
    if (v.cineTemp || v.isHeroCar || v.driver === 'player' || v.isBoat) return true;
    for (let s = 0; s < path.len; s += 4) {
      const q = path.at(s);
      if (Math.hypot(v.x - q.x, v.y - q.y) < dist) return false;
    }
    return true;
  });
}

function removeTempCars(r) {
  if (!r.cars.length) return;
  const set = new Set(r.cars);
  r.w.vehicles = r.w.vehicles.filter((v) => !set.has(v));
  r.cars = [];
}

function ambient(r, dt, slow) {
  if (r.ambientBroken || dt <= 0) return;
  const w = r.w;
  try {
    updateTrafficLights(dt, w);
    if (slow > 0.8) {
      for (const v of w.vehicles) {
        if (v.driver === 'player' || v.isPolice || v.isBoat || v.cineTemp || v.isHeroCar || v.wrecked) continue;
        updateTrafficAI(v, dt, w.map, w, Math.random);
        resolveVehicleBuildingCollision(v, w.map, dt);
      }
    }
    updatePedestrians(dt, w);
    if (slow < 1) for (const q of w.pedestrians) if (q.speed) q.speed *= Math.max(0.3, slow);
  } catch (e) {
    console.warn('intro ambient', e);
    r.ambientBroken = true;
  }
}

function panicPeds(r, x, y, radius) {
  const w = r.w;
  for (const q of w.pedestrians) {
    if (q.isCop || q.state === 'dead' || Math.hypot(q.x - x, q.y - y) > radius) continue;
    q.state = 'flee';
    q.stateUntil = w.time + 5;
    q.fleeFrom = { x, y };
    q.fleeJitter = (Math.random() - 0.5) * 0.9;
    q.fleeSpeed = 4 + Math.random() * 1.5;
  }
}

function sfx(w, kind, x, y, extra = {}) {
  (w.audioEvents || (w.audioEvents = [])).push({ kind, x, y, ...extra });
}

function footprint(map, x, y) {
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInPolygon(x, y, b.pts)) return b;
  }
  return null;
}

function landmark(w, name, fx, fy) {
  const lm = (w.map.meta.landmarks || []).find((l) => l.name === name);
  return lm ? { x: lm.x, y: lm.y } : { x: fx, y: fy };
}

// --- shots ---------------------------------------------------------------------

function buildShots(w) {
  const map = w.map;
  const tower = landmark(w, 'Martinitoren', 214, 13);

  const aerial = {
    dur: 7.2, clock: 18.55, focus: { x: 165, y: 68 }, flare: { x: 18, y: 26, a: 0.9 },
    caption: ['GRUNN', 'Een stad vol fietsers, eierballen en grote dromen.'],
    lines: [[0.9, 3.0, 'Anita', 'Zeg eens eerlijk, Tammo…'], [4.0, 3.0, 'Anita', '…wil je later zeggen dat je het nooit geprobeerd hebt?']],
    cam(u, t) {
      const a = lerp(2.62, 2.12, smooth(u)), rad = lerp(165, 118, u);
      const pos = P(tower.x + Math.cos(a) * rad, tower.y + Math.sin(a) * rad, lerp(74, 50, smooth(u)));
      return pose(pos, P(tower.x, tower.y, lerp(40, 46, u)), 50, t, 0.25);
    },
  };

  const chaos = {
    dur: 6.0, clock: 23.15, focus: { x: 175, y: 55 },
    caption: ['GROTE MARKT', 'Alles.'],
    slow: (t) => (t < 1.1 ? 1 : t < 1.5 ? lerp(1, 0.32, (t - 1.1) / 0.4) : t < 4.8 ? 0.32 : lerp(0.32, 1, (t - 4.8) / 1.2)),
    lines: [[0.4, 1.8, 'Anita', 'Rennen, Tammo!'], [2.5, 3.2, 'Tammo', 'Ik rén. Zo ren ik nou eenmaal.']],
    enter(r, s) {
      const dir = Math.atan2(70 - 32, 160 - 205);
      s.dir = dir;
      s.fx = Math.cos(dir); s.fy = Math.sin(dir);
      s.start = { x: 205, y: 32 };
      s.d = 0;
      s.birds = makeBirds(r.group, 194, 43, 3);
      s.scattered = false;
    },
    tick(r, s, t, dt) {
      s.d += 6.2 * dt;
      const x = s.start.x + s.fx * s.d, y = s.start.y + s.fy * s.d;
      const nx = -s.fy, ny = s.fx;
      stage(r.tammo, x + nx * 0.7, y + ny * 0.7, s.dir, { speed: 6.2, dt, t });
      stage(r.anita, x - nx * 0.7 + s.fx * 0.6, y - ny * 0.7 + s.fy * 0.6, s.dir, { speed: 6.4, dt, t });
      if (!s.scattered && t > 1.0) {
        s.scattered = true;
        scatterBirds(s.birds, x, y);
        panicPeds(r, x, y, 40);
        sfx(r.w, 'shout', x, y, { strength: 0.8 });
      }
      updateBirds(s.birds, dt, t);
      s.pos = { x, y };
    },
    cams: [
      [2.3, (u, t, s) => {
        const c = P(185, 51, 0.8);
        return pose(c, P(s.pos.x, s.pos.y, lerp(1.0, 1.6, u)), 52, t, 0.05);
      }],
      [3.7, (u, t, s) => {
        const nx = -s.fy, ny = s.fx;
        const p = s.pos;
        // tracking from ahead on their own path across the open square: a
        // side-on camera ran into advertising columns along the edge
        return pose(P(p.x + s.fx * 7 - nx * 1.6, p.y + s.fy * 7 - ny * 1.6, 1.9), P(p.x, p.y, 1.2), 40, t, 0.06);
      }],
    ],
  };

  const card1 = { dur: 2.4, black: true, card: '<div class="im-kicker">Twee uit Grunn</div><div class="im-title">Tammo <span class="amp">&amp;</span> Anita</div>' };

  const bridge = { x: -374, y: 319 };
  const kiss = {
    dur: 7.2, clock: 19.1, clockTo: 19.55, focus: bridge, flare: { x: 22, y: 34, a: 1 },
    caption: [null, 'Samen hebben ze alles. Behalve geld.'],
    slow: () => 0.55,
    lines: [[0.6, 2.2, 'Tammo', 'Als dit misgaat…'], [2.8, 2.4, 'Anita', 'Dan gaat het tenminste mis met stijl.'], [5.3, 1.9, 'Tammo', 'Moi. Stijl.']],
    tick(r, s, t, dt) {
      stage(r.tammo, bridge.x - 0.23, bridge.y, 0, { pose: 'kissT', dt, t });
      stage(r.anita, bridge.x + 0.23, bridge.y, Math.PI, { pose: 'kissA', dt, t });
    },
    cams: [
      [4.2, (u, t) => pose(lerpP(P(-371, 332, 1.8), P(-366, 327, 1.6), smooth(u)), P(bridge.x, bridge.y, 1.55), lerp(34, 30, u), t, 0.04)],
      [3.0, (u, t) => pose(lerpP(P(-374, 334, 2.5), P(-374.5, 341, 15), smooth(u)), P(bridge.x, bridge.y - lerp(0, 25, smooth(u)), lerp(1.5, 6, u)), 48, t, 0.05)],
    ],
  };

  const vis = { a: Math.atan2(210 - 247, 41 + 32) };
  {
    const rx = -Math.sin(vis.a), ry = Math.cos(vis.a);
    vis.car = { x: 4 + rx * 2.4, y: 228 + ry * 2.4 };
    vis.anita = { x: vis.car.x + rx * 1.25 - Math.cos(vis.a) * 0.4, y: vis.car.y + ry * 1.25 - Math.sin(vis.a) * 0.4 };
    vis.rx = rx; vis.ry = ry;
  }
  const vismarkt = {
    dur: 6.4, clock: 20.45, focus: vis.car,
    caption: ['VISMARKT', 'Anita wil meer dan een fiets en een bijbaantje.'],
    tags: [[0.3, 2.9, 'Anita', 'het brein van het stel'], [3.4, 2.8, 'Tammo', 'de chauffeur. Meestal.']],
    lines: [[0.5, 2.4, 'Anita', 'Iedereen in Grunn heeft een droom.'], [3.0, 2.8, 'Anita', 'De mijne heeft vier wielen en geen kenteken.']],
    enter(r, s) {
      s.car = tempCar(r, vis.car.x, vis.car.y, vis.a);
    },
    tick(r, s, t, dt) {
      if (s.car) seat(r.tammo, s.car, true);
      stage(r.anita, vis.anita.x, vis.anita.y, vis.a + Math.PI / 2, { pose: 'lean', dt, t });
    },
    cams: [
      [6.0, (u, t) => {
        const f = Math.cos(vis.a), g = Math.sin(vis.a);
        // from the road ahead of the car: the pavement side is full of
        // bins and bike racks that used to fill the frame
        const d = lerp(8.5, 5, smooth(u));
        const base = P(vis.car.x + f * d + vis.rx * 0.4, vis.car.y + g * d + vis.ry * 0.4, lerp(1.9, 1.6, u));
        const look = P(lerp(vis.car.x, vis.anita.x, 0.6) - f * 0.6, lerp(vis.car.y, vis.anita.y, 0.6) - g * 0.6, 1.2);
        return pose(base, look, lerp(44, 38, u), t, 0.03);
      }],
    ],
  };

  const card2 = { dur: 2.4, black: true, card: '<div class="im-kicker">Een Grunneger misdaadverhaal</div><div class="im-title">Alles voor <span class="amp">één</span> eierbal</div>' };

  const atm = { x: 164.4, y: -14 };
  const heist = {
    dur: 7.2, clock: 23.0, focus: atm,
    caption: [null, 'Het plan: één pinautomaat. Wat kan er misgaan?'],
    slow: () => 0.42,
    lines: [[0.7, 2.6, 'Tammo', 'Moi. Wij kwamen alleen even pinnen.'], [3.9, 2.8, 'Anita', 'Pinnen, ja. Met de hele automaat.']],
    enter(r, s) {
      const rp = map.nearestRoadPoint(atm.x, atm.y, 60) || { x: atm.x, y: atm.y + 5 };
      let dx = rp.x - atm.x, dy = rp.y - atm.y;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      let sx = atm.x, sy = atm.y;
      for (let i = 0; i < 40 && footprint(map, sx, sy); i++) { sx += dx * 0.5; sy += dy * 0.5; }
      s.start = { x: sx + dx * 0.4, y: sy + dy * 0.4 };
      s.dir = Math.atan2(dy, dx);
      s.fx = dx; s.fy = dy;
      s.d = 0;
      s.notes = makeNotes(r.group);
      s.bag = new THREE.Mesh(BAG_GEO, BAG_MAT);
      s.bag.position.set(0.02, -0.34, 0);
      r.tammo.userData.elbowR.add(s.bag);
      s.nextBurst = 0.2;
      sfx(r.w, 'door_open', s.start.x, s.start.y);
      sfx(r.w, 'alarm', s.start.x, s.start.y);
    },
    exit(r, s) {
      if (s.bag) s.bag.removeFromParent();
    },
    tick(r, s, t, dt) {
      s.d += 1.45 * dt;
      const nx = -s.fy, ny = s.fx;
      const x = s.start.x + s.fx * s.d, y = s.start.y + s.fy * s.d;
      stage(r.tammo, x + nx * 0.55, y + ny * 0.55, s.dir, { speed: 1.45, pose: 'bag', dt, t });
      const throwing = t > 2.4 && t < 5.2;
      stage(r.anita, x - nx * 0.55, y - ny * 0.55, s.dir, { speed: 1.45, pose: throwing ? 'throw' : null, dt, t });
      if (t > s.nextBurst) {
        s.nextBurst = t + (throwing ? 0.35 : 0.8);
        if (throwing) emitNotes(s.notes, 12, x - nx * 0.8, y - ny * 0.8, 2.3, 1.8, 3.4);
        else emitNotes(s.notes, 4, x + nx * 0.7, y + ny * 0.7, 0.8, 0.8, 1.4);
      }
      if (!s.rain) { s.rain = true; for (let k = 0; k < 6; k++) emitNotes(s.notes, 8, x + s.fx * (k * 0.8) + (Math.random() - 0.5) * 3, y + s.fy * (k * 0.8) + (Math.random() - 0.5) * 3, 2.6 + k * 0.4, 1.2, 0.3); }
      updateNotes(s.notes, dt, t);
      s.pos = { x, y };
    },
    cams: [
      [7.2, (u, t, s) => {
        const p = s.pos, d = lerp(6.5, 5.2, u);
        const nx = -s.fy, ny = s.fx;
        return pose(P(p.x + s.fx * d + nx * 1.2, p.y + s.fy * d + ny * 1.2, lerp(0.7, 0.95, u)), P(p.x, p.y, lerp(1.45, 1.6, u)), 44, t, 0.04);
      }],
    ],
  };

  const chasePts = [[309, 685], [326, 722], [341, 755], [351, 778], [358, 794], [360, 798], [387, 864], [412, 943], [413, 948], [424, 979], [440, 1026], [452, 1064]];
  const road = polyline(chasePts);
  const LANE = 2.1;
  const laneAt = (s, off = 0) => {
    const q = road.at(s);
    const rx = -Math.sin(q.a), ry = Math.cos(q.a);
    return { x: q.x + rx * (LANE + off), y: q.y + ry * (LANE + off), a: q.a };
  };
  const chase = {
    dur: 7.2, clock: 23.2, focus: laneAt(40),
    caption: [null, 'Nu zit heel Grunn achter ze aan.'],
    lines: [[0.5, 2.4, 'Anita', 'Gas d’r op, schat!'], [3.8, 2.6, 'Tammo', 'Dit ís gas d’r op.']],
    enter(r, s) {
      clearRoadNear(r, road, 9);
      const q = laneAt(22);
      s.hero = tempCar(r, q.x, q.y, q.a);
      s.cops = [0, 1, 2].map(() => tempCar(r, q.x, q.y, q.a, true)).filter(Boolean);
      s.saveWanted = r.w.wanted;
      r.w.wanted = Math.max(2, r.w.wanted);
      s.sHero = 22;
      sfx(r.w, 'engine_start', q.x, q.y);
    },
    exit(r, s) {
      r.w.wanted = s.saveWanted;
    },
    tick(r, s, t, dt) {
      const speed = 23;
      s.sHero += speed * dt;
      const place = (v, sv, off) => {
        const q = laneAt(sv, off);
        v.x = q.x; v.y = q.y; v.angle = q.a + Math.sin(t * 1.7 + off) * 0.03; v.speed = speed;
      };
      if (s.hero) {
        place(s.hero, s.sHero, Math.sin(t * 1.3) * 0.5);
        seat(r.tammo, s.hero, true);
        seat(r.anita, s.hero, false);
        r.w.player.x = s.hero.x; r.w.player.y = s.hero.y;
      }
      s.cops.forEach((v, i) => place(v, s.sHero - 11 - i * 10, (i % 2 ? -1.2 : 0.8) + Math.sin(t * 2 + i) * 0.4));
      if (t > 1.2 && !s.honked) { s.honked = true; sfx(r.w, 'horn', s.hero.x, s.hero.y, { strength: 0.8 }); }
    },
    cams: [
      [3.6, (u, t, s) => {
        const h = s.hero || laneAt(s.sHero);
        const q = laneAt(62);
        return pose(P(q.x + 14, q.y - 6, lerp(18, 14, u)), P(h.x, h.y, 0.8), 46, t, 0.12);
      }],
      [3.6, (u, t, s) => {
        const h = s.hero || laneAt(s.sHero);
        const f = Math.cos(h.angle), g = Math.sin(h.angle), nx = -g, ny = f;
        return pose(P(h.x + nx * 6.5 + f * 2, h.y + ny * 6.5 + g * 2, 0.9), P(h.x - f * 4, h.y - g * 4, 0.9), 54, t, 0.1);
      }],
    ],
  };

  const forum = landmark(w, 'Forum Groningen', 356.2, 63.1);
  const roof = {
    dur: 7.2, clock: 23.5,
    focus: forum,
    caption: ['FORUM', 'Wie Grunn wil, moet het zelf pakken.'],
    lines: [[0.6, 2.2, 'Anita', 'Kijk dan. Heel Grunn.'], [3.0, 2.2, 'Tammo', 'Ziet er van hier best rustig uit.'], [5.4, 1.6, 'Anita', 'Nog wel.']],
    enter(r, s) {
      const dx = tower.x - forum.x, dy = tower.y - forum.y, dl = Math.hypot(dx, dy);
      s.fx = dx / dl; s.fy = dy / dl;
      s.dir = Math.atan2(dy, dx);
      const b = footprint(map, forum.x, forum.y);
      let d = 0;
      if (b) while (d < 60 && footprint(map, forum.x + s.fx * (d + 0.5), forum.y + s.fy * (d + 0.5)) === b) d += 0.5;
      // the Forum model (landmarks3d.js) rises to a 45 m roof deck that is
      // pulled in from the footprint; standing at the footprint's level put
      // the pair (and the camera) inside the building
      const isForum = b && b.landmark === 'Forum Groningen';
      d = isForum ? Math.max(0, d * 0.6 - 1.5) : Math.max(0, d - 2.2);
      s.spot = { x: forum.x + s.fx * d, y: forum.y + s.fy * d };
      s.h = isForum ? FORUM_ROOF : b ? (b.h || 3) * 3.1 : roofAt(map, s.spot.x, s.spot.y);
    },
    tick(r, s, t, dt) {
      const nx = -s.fy, ny = s.fx;
      stage(r.tammo, s.spot.x + nx * 0.45, s.spot.y + ny * 0.45, s.dir, { h: s.h, pose: t > 3 ? 'lookL' : null, dt, t });
      stage(r.anita, s.spot.x - nx * 0.45, s.spot.y - ny * 0.45, s.dir, { h: s.h, pose: t > 5 ? 'lookR' : null, dt, t });
    },
    cams: [
      [4.0, (u, t, s) => {
        const back = lerp(3.6, 5.5, smooth(u));
        const nx = -s.fy, ny = s.fx;
        return pose(P(s.spot.x - s.fx * back + nx * 0.8, s.spot.y - s.fy * back + ny * 0.8, s.h + lerp(1.7, 2.4, u)), P(s.spot.x + s.fx * 20, s.spot.y + s.fy * 20, s.h + 0.3), 50, t, 0.04);
      }],
      [3.2, (u, t, s) => {
        const nx = -s.fy, ny = s.fx;
        const k = smooth(u);
        return pose(P(s.spot.x - s.fx * lerp(8, 16, k) + nx * lerp(6, 11, k), s.spot.y - s.fy * lerp(8, 16, k) + ny * lerp(6, 11, k), s.h + lerp(4, 14, k)),
          P(lerp(s.spot.x, tower.x, k * 0.8), lerp(s.spot.y, tower.y, k * 0.8), s.h + lerp(0.5, 20, k)), 52, t, 0.05);
      }],
    ],
  };

  const card3 = { dur: 3.2, black: true, card: '<div class="im-kicker">Grand Theft Eierbal</div><div class="gte-logo"><span class="gte">GTE</span><span class="vi">VI</span></div>', restore: true };

  const swoop = {
    dur: 7.0, home: true,
    lower: '<div class="im-kicker">Welkom in</div><div class="im-title">Grunn</div>',
    enter(r, s) {
      s.shot = r.flyShot();
    },
    cams: [[7.0, (u, t, s) => ({ ...s.shot(u), cut: true })]],
  };

  // who they are (card, Vismarkt with name tags), what they want (the
  // bridge, the dream car), the hook (the heist, the escape, the chase)
  return [aerial, card1, vismarkt, kiss, card2, heist, chaos, chase, roof, card3, swoop];
}

function enterShot(r, i) {
  const prev = r.shots[r.idx];
  if (prev && prev.exit) prev.exit(r, r.state);
  removeTempCars(r);
  for (const o of [...r.group.children]) {
    if (o === r.tammo || o === r.anita) continue;
    r.group.remove(o);
    if (o.isInstancedMesh) o.dispose();
  }
  r.tammo.visible = false;
  r.anita.visible = false;
  r.idx = i;
  r.state = {};
  r.camIdx = 0;
  const shot = r.shots[i];
  const w = r.w;
  setSub(null);
  setTag(null);
  ui.lower.classList.remove('on');
  ui.cap.classList.remove('on');
  if (shot.caption) {
    const [place, text] = shot.caption;
    const stamp = shot.clock != null ? clockText(shot.clock) : '';
    ui.cap.innerHTML = `<small>${[stamp, place].filter(Boolean).join(' · ')}</small><span>${text}</span>`;
  }
  if (shot.black) {
    ui.black.classList.add('on');
    if (shot.card) showCard(shot.card, shot.dur);
    sfx(w, 'camera_shutter', w.player.x, w.player.y);
  } else {
    ui.black.classList.remove('on');
    ui.card.classList.remove('on');
    if (!prev || !prev.black) flash();
    sfx(w, 'whoosh', w.player.x, w.player.y);
  }
  ui.flare.classList.toggle('on', !!shot.flare);
  if (shot.flare) {
    ui.flare.style.setProperty('--fx', shot.flare.x + '%');
    ui.flare.style.setProperty('--fy', shot.flare.y + '%');
    ui.flare.style.setProperty('--fa', String(shot.flare.a ?? 1));
  }
  if (shot.restore || shot.home) restoreHome(r);
  else if (shot.focus) {
    w.cinematicHidePlayers = true;
    w.cinematicHideNav = true;
    moveSet(r, shot.focus.x, shot.focus.y);
  }
  if (shot.clock != null) setClock(w, shot.clock);
  if (shot.enter) shot.enter(r, r.state);
  if (shot.lower) setTimeout(() => { if (run === r && r.idx === i) { ui.lower.innerHTML = shot.lower; ui.lower.classList.add('on'); } }, 500);
}

function restoreHome(r) {
  const w = r.w, s = r.saved;
  w.player.x = s.px; w.player.y = s.py; w.player.angle = s.pa; w.player.vx = 0; w.player.vy = 0;
  const c = w.companion;
  if (c && s.comp) { c.x = s.comp.x; c.y = s.comp.y; c.angle = s.comp.angle; c.vx = 0; c.vy = 0; }
  setClock(w, s.clock);
  w.wanted = s.wanted;
  w.cinematicHidePlayers = false;
  w.cinematicHideNav = false;
  if (!r.homeLoaded) {
    r.homeLoaded = true;
    try {
      manageTrafficPopulation(w);
      manageBikePopulation(w);
      w.pedestrians = w.pedestrians.filter((q) => q.state === 'dead' || Math.hypot(q.x - s.px, q.y - s.py) < 150);
      if (w.pedestrians.length < PED_TARGET) w.pedestrians.push(...spawnPedestriansNear(w.map, s.px, s.py, PED_TARGET - w.pedestrians.length, Math.random));
    } catch (e) { console.warn(e); }
  }
}

function frame(r, t) {
  const dtReal = Math.max(0, Math.min(0.1, t - r.lastT));
  r.lastT = t;
  const T = t + r.offset;
  let i = r.idx < 0 ? 0 : r.idx;
  while (i < r.shots.length - 1 && T >= r.starts[i + 1]) i++;
  if (i !== r.idx) enterShot(r, i);
  const shot = r.shots[i];
  const st = T - r.starts[i];
  const slow = shot.slow ? shot.slow(st) : 1;
  const dt = dtReal * slow;
  const w = r.w;
  if (shot.clockTo != null) setClock(w, lerp(shot.clock, shot.clockTo, clamp01(st / shot.dur)));
  if (!shot.black && dtReal > 0) {
    w.time += dt;
    ambient(r, dt, slow);
  }
  if (shot.tick && dtReal > 0) shot.tick(r, r.state, st, dt);
  if (shot.lines) {
    const l = shot.lines.find(([at, d]) => st >= at && st < at + d);
    setSub(l ? { who: l[2], text: l[3] } : null);
  }
  // on the shot's own clock: slow frames must not drift the caption off
  ui.cap.classList.toggle('on', !!shot.caption && st > 0.35 && st < Math.min(4.4, shot.dur - 0.6));
  if (shot.tags) {
    const g = shot.tags.find(([at, d]) => st >= at && st < at + d);
    setTag(g ? { name: g[2], role: g[3] } : null);
  }
  if (shot.cams) {
    let acc = 0;
    for (let k = 0; k < shot.cams.length; k++) {
      const [d, fn] = shot.cams[k];
      if (st < acc + d || k === shot.cams.length - 1) {
        if (k !== r.camIdx) {
          r.camIdx = k;
          if (k > 0) { flash(); sfx(w, 'whoosh', w.player.x, w.player.y); }
        }
        r.pose = fn(clamp01((st - acc) / d), st, r.state);
        break;
      }
      acc += d;
    }
  } else if (shot.cam) r.pose = shot.cam(clamp01(st / shot.dur), st, r.state);
  return r.pose;
}

function cleanup(r, skipped) {
  const prev = r.shots[r.idx];
  // whatever a shot left behind, the montage itself must always end
  try { if (prev && prev.exit) prev.exit(r, r.state); } catch (e) { console.error('intro exit', e); }
  try { removeTempCars(r); } catch (e) { console.error('intro cars', e); }
  r.group.removeFromParent();
  try { restoreHome(r); } catch (e) { console.error('intro home', e); }
  if (ui) {
    ui.root.classList.remove('on');
    if (skipped) {
      ui.black.classList.add('on');
      setTimeout(() => { if (!run) ui.black.classList.remove('on'); }, 350);
    } else ui.black.classList.remove('on');
    ui.card.classList.remove('on');
    ui.lower.classList.remove('on');
    ui.cap.classList.remove('on');
    ui.flare.classList.remove('on');
    setSub(null);
    setTag(null);
  }
  document.body.classList.remove('intro-montage');
  stopStoryVoice();
  setStoryScene(false);
  setThemeDuck(false);
  markIntroSeen();
  run = null;
}

// flyShot(): the camera path from the sky down to behind the player; built by cinematics.js.
export function playIntroMontage(w, { startAt = 0, flyShot, onDone } = {}) {
  if (run) return false;
  ensureUi();
  const scene = getScene();
  const group = new THREE.Group();
  group.name = 'intro-montage';
  scene.add(group);
  const tammo = makeActor(TAMMO_APPEARANCE);
  const anita = makeActor(ANITA_APPEARANCE);
  tammo.visible = anita.visible = false;
  group.add(tammo, anita);
  const shots = buildShots(w);
  const starts = [];
  let total = 0;
  for (const s of shots) { starts.push(total); total += s.dur; }
  const p = w.player, c = w.companion;
  const r = {
    w, group, tammo, anita, shots, starts, cars: [], idx: -1, state: {}, lastT: 0, offset: Math.max(0, Math.min(total - 1, startAt)),
    camIdx: 0, pose: null, flyShot,
    saved: { px: p.x, py: p.y, pa: p.angle, clock: typeof w.clock === 'number' ? w.clock : 17.5, wanted: w.wanted || 0, comp: c ? { x: c.x, y: c.y, angle: c.angle } : null },
  };
  run = r;
  document.body.classList.add('intro-montage');
  setStoryScene(true);
  setThemeDuck(true);
  ui.root.classList.add('on');
  const ok = playCinematic({
    id: 'intro', priority: 6, duration: total - r.offset, pause: true, letterbox: true, skippable: true, hideHud: true,
    shot: (u, t) => frame(r, t),
    onEnd: (skipped) => {
      cleanup(r, skipped);
      if (onDone) onDone(skipped);
    },
  });
  if (!ok) cleanup(r);
  return ok;
}

