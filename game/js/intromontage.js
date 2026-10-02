import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, seatPerson, SEATED_DROP, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { Vehicle, MODELS, spawnHeroCarNear, spawnVehicleOnRoad, manageTrafficPopulation, manageBikePopulation, updateTrafficAI, resolveVehicleBuildingCollision } from './vehicle.js';
import { spawnPedestriansNear, updatePedestrians } from './pedestrians.js';
import { updateTrafficLights } from './trafficlights.js';
import { refreshDayNight } from './daynight.js';
import { playCinematic } from './cinematics.js';
import { roofAt, clearKeys, pathShot } from './camerapath.js';
import { lineVoiceFor, NARRATOR } from './linevoice.js';
import { dualHtml } from './subtitles.js';
import { speakerHtml } from './speakers.js';
import { JELLE_LOOK, pompebledTexture } from './fierljep.js';
import { playStoryVoice, stopStoryVoice, setStoryScene } from './audio.js';
import { buildRadioStudio } from './radiostudio.js';
import { setThemeDuck, cueTheme } from './theme.js';

// Recorded montage dialogue: the story manifest ("<speaker>|<text>"), then the
// lines manifest (linevoice.js) for the newer lines.
const VOICE_DIR = new URL('../audio/voicelines/story/', import.meta.url).href;
let voices = {};
fetch(VOICE_DIR + 'manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { voices = m || {}; }).catch(() => {});

// Opening montage for a fresh game (~90 s, cut to the theme's beat): Grunn at
// dawn, the Gouden Eierbal and what it means for the city, Tammo and Anita
// and their dream, a Frisian silhouette, last night's cash machine and a
// black trekker-limo, then this morning's phone call that opens H1. Staged
// shots at real Grunn places with temporary actors, cars and props, ending in
// the swoop down to the spawn. Narration it told is skipped in H1's intro.

const SEEN_KEY = 'gte-intro-seen';
const PED_TARGET = 40;

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
  // a new line starts its recording; clearing the subtitle lets it finish.
  // The theme dips under the voices and swells between them.
  if (line && line.voice) playStoryVoice(line.voice, { radio: !!line.radio });
  setThemeDuck(!!line);
  ui.sub.classList.toggle('on', !!line);
  if (line) ui.sub.innerHTML = speakerHtml(line.who) + dualHtml(line.text);
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
    case 'hips':
      arm(ud.armL, ud.elbowL, -0.35, 1.9, 0.55);
      arm(ud.armR, ud.elbowR, -0.35, 1.9, -0.55);
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

// Debug/test: when each shot (and each camera within it) starts.
export function introClock() {
  return run ? run.lastT + run.offset : null;
}

export function introTimeline() {
  return run && run.shots.map((s, i) => ({ i, start: run.starts[i], dur: s.dur, cams: s.camAt || [0], lines: s.timed.map((l) => [l.who, +l.at.toFixed(2), +l.dur.toFixed(2)]) }));
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

// Per shot: clear skies, or a little morning mist.
function setWeather(w, mist = 0) {
  w.weather = { active: false, timer: 1e9, kind: undefined, peak: 0, intensity: 0, wet: 0, overcast: mist * 0.5, mist, windAngle: 0.9, elapsed: 0, duration: Infinity };
}

function setClock(w, h) {
  w.clock = ((h % 24) + 24) % 24;
  refreshDayNight(w);
}

// hero: the red Fjord Escapade; model: that vehicle model; otherwise the Fjord too
function tempCar(r, x, y, a, { police = false, model = null } = {}) {
  const w = r.w, map = w.map;
  let v;
  if (model) v = new Vehicle(x, y, a, model);
  else if (police) {
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
  v.z = map.spawnZ ? map.spawnZ(x, y) : 0;
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

function sfx(w, kind, x, y, extra = {}) {
  (w.audioEvents || (w.audioEvents = [])).push({ kind, x, y, ...extra });
}

function landmark(w, name, fx, fy) {
  const lm = (w.map.meta.landmarks || []).find((l) => l.name === name);
  return lm ? { x: lm.x, y: lm.y } : { x: fx, y: fy };
}

// --- set pieces ------------------------------------------------------------------

// The Gouden Eierbal: a crumbed, slightly squashed ball of gold on a velvet
// cushion in a lit case, in a small dark gallery room of its own, staged
// high above the museum (only the room's inside is ever in view).
const GOLD_MAT = new THREE.MeshStandardMaterial({ color: 0xe0ac2a, metalness: 0.9, roughness: 0.28, emissive: 0x5a3a06, emissiveIntensity: 0.55 });
function eierbalGeometry() {
  const g = new THREE.IcosahedronGeometry(0.16, 6);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 61) * Math.sin(v.y * 53 + 1.3) * Math.sin(v.z * 67 + 2.1);
    v.multiplyScalar(1 + n * 0.045);
    v.y *= 0.9;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function roomTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildVitrineRoom() {
  const g = new THREE.Group();
  const own = [];
  const mesh = (geo, mat) => { own.push(geo, mat); const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
  const wall = roomTexture(256, 256, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h * 0.62, 10, w / 2, h * 0.62, w * 0.75);
    r.addColorStop(0, '#3a2c22'); r.addColorStop(0.5, '#1c1612'); r.addColorStop(1, '#0a0807');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  mesh(new THREE.BoxGeometry(9, 5, 9), new THREE.MeshBasicMaterial({ map: wall, side: THREE.BackSide })).position.y = 2.5;
  own.push(wall);
  const floor = roomTexture(256, 256, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 6, w / 2, h / 2, w / 2);
    r.addColorStop(0, '#5a4636'); r.addColorStop(0.35, '#2a2019'); r.addColorStop(1, '#0c0a08');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  const fl = mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: floor }));
  fl.rotation.x = -Math.PI / 2; fl.position.y = 0.01;
  own.push(floor);
  // plinth, cushion, the ball, the glass case and its brass rim
  mesh(new THREE.BoxGeometry(0.62, 1.05, 0.62), new THREE.MeshBasicMaterial({ color: 0xe9e4d8 })).position.y = 0.525;
  const cushion = mesh(new THREE.SphereGeometry(0.2, 20, 10), new THREE.MeshStandardMaterial({ color: 0x8d1424, roughness: 0.9, emissive: 0x3a040b, emissiveIntensity: 0.6 }));
  cushion.scale.set(1, 0.3, 1); cushion.position.y = 1.1;
  const ball = new THREE.Mesh(eierbalGeometry(), GOLD_MAT);
  own.push(ball.geometry);
  ball.position.y = 1.29;
  g.add(ball);
  const glass = mesh(new THREE.BoxGeometry(0.56, 0.62, 0.56), new THREE.MeshStandardMaterial({ color: 0xdfeeff, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }));
  glass.position.y = 1.36;
  mesh(new THREE.BoxGeometry(0.6, 0.04, 0.6), new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: 0.8, roughness: 0.35, emissive: 0x2a1c05 })).position.y = 1.69;
  const beam = mesh(new THREE.CylinderGeometry(0.22, 0.7, 3.3, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a6, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.y = 3.3;
  // the museum label beside the case
  const label = roomTexture(512, 256, (c, w, h) => {
    c.fillStyle = '#efe9da'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2a2017';
    c.font = 'bold 54px Arial, sans-serif'; c.fillText('De Gouden Eierbal', 30, 84);
    c.font = '34px Arial, sans-serif'; c.fillText('Grunn, 1953 · 18 karaat goud', 30, 150);
    c.font = 'italic 28px Arial, sans-serif'; c.fillText('Niet aanraken. Ook niet likken.', 30, 212);
  });
  const lab = mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: label }));
  own.push(label);
  lab.scale.setScalar(0.8);
  lab.position.set(0.315, 0.82, 0); lab.rotation.set(0, Math.PI / 2, 0);
  for (const o of g.children) { o.castShadow = false; o.receiveShadow = false; }
  g.userData = { ball, own };
  return g;
}

// A cash machine on a sack truck, rolled away by Tammo.
export function buildAtm() {
  const g = new THREE.Group(), own = [];
  const box = (w, h, d, color, x, y, z, emissive = 0) => {
    const geo = new THREE.BoxGeometry(w, h, d), mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive, emissiveIntensity: emissive ? 1 : 0 });
    own.push(geo, mat);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true;
    g.add(m);
    return m;
  };
  box(0.62, 1.35, 0.55, 0x7c8590, 0, 0.8, 0);
  box(0.02, 0.26, 0.34, 0x0f2a1c, 0.29, 1.12, 0, 0x2dbb6a);
  box(0.04, 0.12, 0.3, 0x1b1d20, 0.29, 0.86, 0);
  box(0.04, 0.05, 0.2, 0x111111, 0.3, 0.66, 0);
  box(0.03, 0.12, 0.5, 0x1d5fae, 0.3, 1.38, 0, 0x0b2a55);
  // the sack truck: frame, toe plate and two wheels
  box(0.05, 1.5, 0.05, 0x333333, -0.32, 0.78, 0.26);
  box(0.05, 1.5, 0.05, 0x333333, -0.32, 0.78, -0.26);
  box(0.45, 0.04, 0.6, 0x333333, 0, 0.1, 0);
  for (const z of [0.32, -0.32]) {
    const geo = new THREE.CylinderGeometry(0.13, 0.13, 0.07, 14), mat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    own.push(geo, mat);
    const wh = new THREE.Mesh(geo, mat);
    wh.rotation.x = Math.PI / 2; wh.position.set(-0.28, 0.13, z);
    g.add(wh);
  }
  g.userData.own = own;
  return g;
}

export function disposeOwned(o) {
  o.removeFromParent();
  for (const x of (o.userData && o.userData.own) || []) x.dispose();
}

// Jelle against the evening sky: his build, every colour near black.
const INK = 0x07080a;
function makeSilhouette() {
  const m = makeActor({ ...JELLE_LOOK, shirt: INK, skin: INK, hair: INK, pants: INK, shoes: INK });
  m.userData.blob.visible = false;
  return m;
}

export function buildFlag() {
  const g = new THREE.Group(), own = [];
  const poleGeo = new THREE.CylinderGeometry(0.025, 0.03, 2.6, 6), poleMat = new THREE.MeshBasicMaterial({ color: 0x06080a });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.3;
  g.add(pole);
  const geo = new THREE.PlaneGeometry(1.1, 0.72, 12, 1);
  geo.translate(0.55, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ map: pompebledTexture(), side: THREE.DoubleSide, color: 0x9a8f86 });
  const cloth = new THREE.Mesh(geo, mat);
  cloth.position.y = 2.2;
  g.add(cloth);
  own.push(poleGeo, poleMat, geo, mat);
  g.userData = { cloth, own, base: Float32Array.from(geo.attributes.position.array) };
  return g;
}

export function waveFlag(f, t) {
  const { cloth, base } = f.userData;
  const p = cloth.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3];
    p.setZ(i, Math.sin(x * 5 - t * 7) * 0.12 * x + Math.sin(x * 9 - t * 11) * 0.03 * x);
  }
  p.needsUpdate = true;
}

// --- geometry helpers ---------------------------------------------------------------

// The nearest drivable street point to (x, y) with the street's heading.
function street(map, x, y) {
  const rp = map.nearestRoadPoint(x, y, 200, true, true);
  if (!rp) return { x, y, a: 0 };
  let best = null;
  const p = rp.road.pts;
  for (let i = 0; i < p.length - 1; i++) {
    const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
    const L2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((rp.x - ax) * dx + (rp.y - ay) * dy) / L2));
    const d = Math.hypot(ax + dx * u - rp.x, ay + dy * u - rp.y);
    if (!best || d < best.d) best = { d, a: Math.atan2(dy, dx) };
  }
  return { x: rp.x, y: rp.y, a: best ? best.a : 0, road: rp.road };
}

// A camera position is never inside a building: lifted over its roof.
function clearCam(map, q) {
  const top = roofAt(map, q.x, q.y);
  return top && q.z < top + 1.2 ? P(q.x, q.y, top + 1.2) : q;
}

// --- shots ---------------------------------------------------------------------

// The theme restarts with the montage: 111 bpm, first beat at 0.33 s, so
// shots end on a beat.
const BEAT = 60 / 111;
const BEAT0 = 0.331;

// Story beats: Grunn at dawn, the Gouden Eierbal and what it means, Tammo
// and Anita and their dream, last night's cash machine, a black trekker-limo
// and a Frisian silhouette, then this morning's phone call into H1.
function buildShots(w) {
  const map = w.map;
  const tower = landmark(w, 'Martinitoren', 214, 13);
  const square = { x: 172, y: 56 };
  const museum = landmark(w, 'Groninger Museum', 70.9, 798.3);

  const toGM = Math.atan2(square.y - tower.y, square.x - tower.x);
  const dawn = {
    minDur: 8.5, clock: 6.2, clockTo: 6.65, mist: 0.35, focus: square, flare: { x: 70, y: 30, a: 0.7 },
    caption: ['GRUNN', 'Het noorden wordt wakker.'],
    lines: [['V', 'Grunn. Tweehonderdduizend mensen, driehonderdduizend fietsen en één toren die alles ziet.']],
    lead: 0.6,
    enter(r, s) { s.birds = makeBirds(r.group, square.x + Math.cos(toGM) * -20, square.y + Math.sin(toGM) * -20, 4); },
    tick(r, s, t, dt) {
      if (!s.gone && t > 2.2) { s.gone = true; scatterBirds(s.birds, tower.x, tower.y); }
      updateBirds(s.birds, dt, t);
    },
    cams: [[0, (u, t) => {
      const k = smooth(u), R = lerp(78, 58, k);
      const pos = P(tower.x + Math.cos(toGM) * R, tower.y + Math.sin(toGM) * R, lerp(2.2, 48, k));
      return pose(clearCam(map, pos), P(tower.x, tower.y, lerp(24, 70, k)), lerp(54, 46, k), t, 0.08);
    }]],
  };

  // Rikus at the Nachtstreek mic: the one telling this story (studio above the museum)
  const onAir = {
    minDur: 5.2, focus: museum, lead: 0.5, radio: true,
    caption: ['RADIO NACHTSTREEK', 'Rikus, nacht-dj en jeugdvriend van Tammo.'],
    lines: [['V', 'Moi, hier is Rikus, op Nachtstreek. Luister. Ik vertel je hoe het zat met die twee.', 'warm, droog, als nacht-dj op de radio']],
    enter(r, s) { s.st = buildRadioStudio(museum.x, museum.y + 40); r.group.add(s.st.group); },
    exit(r, s) { if (s.st) { s.st.dispose(); s.st = null; } },
    tick(r, s, t) { if (s.st) s.st.tick(t, t > 0.5); },
    cams: [[0, (u, t, s) => ({ ...s.st.shot(0)(u), cut: true })]],
  };

  // museum: across the water at the golden tower, then the case itself
  const mAng = Math.atan2(square.y - museum.y, square.x - museum.x);
  const museumShot = {
    minDur: 10, clock: 6.9, focus: museum,
    caption: ['GRONINGER MUSEUM', 'Het mooiste wat Grunn heeft.'],
    lines: [
      ['V', 'In het Groninger Museum staat sinds 1953 het stadsjuweel: de Gouden Eierbal. Achttien karaat. Onbetaalbaar.'],
      ['V', 'Voor Grunn is hij meer dan goud. Zolang hij hier staat, weet iedereen van wie de eierbal is.', 'plechtig, trots, met een droge knipoog'],
    ],
    lead: 0.4,
    tags: [['L0+5.6', 'L1+3', 'De Gouden Eierbal', '1953 · achttien karaat · onbetaalbaar']],
    enter(r, s) {
      s.room = buildVitrineRoom();
      s.roomAt = { x: museum.x, y: museum.y, z: 300 };
      s.room.position.set(s.roomAt.x, s.roomAt.z, s.roomAt.y);
      r.group.add(s.room);
      s.keys = clearKeys(w, [0, 1, 2, 3].map((i) => {
        const a = mAng + 0.5 - i * 0.28, R = 95 - i * 9;
        return { pos: P(museum.x + Math.cos(a) * R, museum.y + Math.sin(a) * R, 9 + i * 3), look: P(museum.x, museum.y, 14 + i), fov: 44 };
      }));
      s.fly = pathShot(s.keys, (x) => x);
    },
    exit(r, s) { if (s.room) { disposeOwned(s.room); s.room = null; } },
    tick(r, s, t) { if (s.room) s.room.userData.ball.rotation.y = t * 0.35; },
    cams: [
      [0, (u, t, s) => ({ ...s.fly(u), cut: true })],
      ['L0+5.6', (u, t, s) => {
        const c = s.roomAt, a = lerp(0.9, 0.35, smooth(u)), R = lerp(2.4, 1.7, smooth(u));
        return pose(P(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R, c.z + lerp(1.75, 1.5, u)), P(c.x, c.y, c.z + 1.25), 34, t, 0.01);
      }],
      ['L1', (u, t, s) => {
        const c = s.roomAt, a = lerp(-0.4, -1.1, u), R = lerp(1.25, 1.0, smooth(u));
        return pose(P(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R, c.z + lerp(1.36, 1.44, u)), P(c.x, c.y, c.z + 1.29), 30, t, 0.006);
      }],
    ],
  };

  const card1 = {
    minDur: 3.2, black: true, lead: 0.2,
    card: '<div class="im-kicker">Twee uit Grunn</div><div class="im-title">Tammo <span class="amp">&amp;</span> Anita</div>',
    lines: [['V', 'Maar niet iedereen in Grunn heeft goud. Sommigen hebben alleen elkaar.', 'warm, vertellend, een tikje ontroerd']],
  };

  // yesterday evening at the Vismarkt: the red Fjord Escapade and the dream
  const vis = { a: Math.atan2(210 - 247, 41 + 32) };
  {
    const rx = -Math.sin(vis.a), ry = Math.cos(vis.a);
    vis.car = { x: 4 + rx * 2.4, y: 228 + ry * 2.4 };
    vis.anita = { x: vis.car.x + rx * 1.25 - Math.cos(vis.a) * 0.4, y: vis.car.y + ry * 1.25 - Math.sin(vis.a) * 0.4 };
    vis.rx = rx; vis.ry = ry;
  }
  const dream = {
    minDur: 9, clock: 19.35, clockTo: 19.55, focus: vis.car, flare: { x: 20, y: 30, a: 0.9 },
    caption: ['GISTERAVOND · VISMARKT', 'Een rode Fjord Escapade. Roestig, maar van hen.'],
    lines: [
      ['A', 'Iedereen in Grunn heeft een droom.'],
      ['A', 'De mijne heeft vier wielen en geen kenteken.'],
      ['T', 'Mijn droom is dat jij blijft. En een eierbal.', 'warm, een beetje verlegen, droog'],
      ['A', 'Eerst de Fjord Frituur. Het geld halen we vanavond.', 'samenzweerderig, zelfverzekerd'],
    ],
    tags: [['L0', 'L1+2', 'Anita', 'wil een eigen frituur op wielen'], ['L2', 'L3', 'Tammo', 'wil vooral dat Anita blijft']],
    enter(r, s) { s.car = tempCar(r, vis.car.x, vis.car.y, vis.a); },
    tick(r, s, t, dt) {
      if (s.car) seat(r.tammo, s.car, true);
      stage(r.anita, vis.anita.x, vis.anita.y, vis.a + Math.PI / 2, { pose: 'lean', dt, t });
    },
    cams: [
      [0, (u, t) => {
        const f = Math.cos(vis.a), g = Math.sin(vis.a), d = lerp(9, 6, smooth(u));
        const base = P(vis.car.x + f * d + vis.rx * 0.4, vis.car.y + g * d + vis.ry * 0.4, lerp(1.9, 1.6, u));
        return pose(base, P(lerp(vis.car.x, vis.anita.x, 0.6) - f * 0.6, lerp(vis.car.y, vis.anita.y, 0.6) - g * 0.6, 1.2), lerp(44, 38, u), t, 0.03);
      }],
      ['L2', (u, t) => {
        // over Anita's shoulder at Tammo behind the wheel
        const f = Math.cos(vis.a), g = Math.sin(vis.a);
        const pos = P(vis.anita.x + vis.rx * 1.3 + f * lerp(1.2, 0.9, u), vis.anita.y + vis.ry * 1.3 + g * lerp(1.2, 0.9, u), 1.55);
        return pose(pos, P(vis.car.x - f * 0.2, vis.car.y - g * 0.2, 1.05), 36, t, 0.02);
      }],
      ['L3', (u, t) => {
        const f = Math.cos(vis.a), g = Math.sin(vis.a);
        const pos = P(vis.anita.x - f * lerp(3.2, 2.4, u) + vis.rx * 0.8, vis.anita.y - g * lerp(3.2, 2.4, u) + vis.ry * 0.8, 1.45);
        return pose(pos, P(vis.anita.x, vis.anita.y, 1.5), 34, t, 0.02);
      }],
    ],
  };

  // last night in the Herestraat: the whole cash machine rolls off
  const here = street(map, 229, 402);
  const hf = { x: Math.cos(here.a), y: Math.sin(here.a) };
  const hn = { x: -hf.y, y: hf.x };
  const lane = (d, off) => ({ x: here.x + hf.x * d + hn.x * off, y: here.y + hf.y * d + hn.y * off });
  const heist = {
    minDur: 7, clock: 21.7, focus: here,
    caption: ['GISTERAVOND · HERESTRAAT', 'Het geld voor de droom.'],
    slow: (t) => (t < 0.8 ? 1 : 0.6),
    lines: [
      ['T', 'Moi. Wij kwamen alleen even pinnen.'],
      ['A', 'Pinnen, ja. Met de hele automaat.'],
      ['A', 'Nait soezen, Tammo. Deurbroezen!', 'opgewonden, gehaast, lachend'],
    ],
    lead: 0.5,
    enter(r, s) {
      clearRoadNear(r, polyline([[here.x - hf.x * 40, here.y - hf.y * 40], [here.x + hf.x * 40, here.y + hf.y * 40]]), 6);
      s.atm = buildAtm();
      r.group.add(s.atm);
      s.notes = makeNotes(r.group);
      s.d = -6;
      s.next = 0.3;
      sfx(r.w, 'alarm', here.x, here.y);
    },
    exit(r, s) { if (s.atm) disposeOwned(s.atm); },
    tick(r, s, t, dt) {
      s.d += 1.5 * dt;
      const q = lane(s.d, 2.6);
      stage(r.tammo, q.x - hf.x * 0.55, q.y - hf.y * 0.55, here.a, { speed: 1.5, dt, t });
      s.atm.position.set(q.x + hf.x * 0.35, 0, q.y + hf.y * 0.35);
      s.atm.rotation.set(0, -here.a, 0.32);
      const a = lane(s.d + 0.4, 3.8);
      const throwing = t > 2.4;
      stage(r.anita, a.x, a.y, here.a, { speed: 1.5, pose: throwing ? 'throw' : null, dt, t });
      if (t > s.next) {
        s.next = t + (throwing ? 0.35 : 0.9);
        emitNotes(s.notes, throwing ? 10 : 3, a.x + hn.x * 0.4, a.y + hn.y * 0.4, 2.2, 1.6, throwing ? 3 : 1.2);
      }
      updateNotes(s.notes, dt, t);
      s.q = q;
    },
    cams: [
      [0, (u, t, s) => {
        const q = s.q, d = lerp(6.5, 5.2, u);
        return pose(P(q.x + hf.x * d + hn.x * 1.5, q.y + hf.y * d + hn.y * 1.5, lerp(0.7, 0.95, u)), P(q.x - hf.x * 0.3, q.y - hf.y * 0.3, 1.3), 46, t, 0.04);
      }],
      ['L2', (u, t, s) => {
        const q = s.q, d = lerp(5.5, 4.2, u);
        return pose(P(q.x - hf.x * d + hn.x * 0.6, q.y - hf.y * d + hn.y * 0.6, 2.1), P(q.x + hf.x * 3, q.y + hf.y * 3, 1.1), 50, t, 0.05);
      }],
    ],
  };

  // a black trekker-limo slides past them, pennants flapping
  const glimpse = {
    minDur: 5.4, clock: 21.75, focus: here,
    lines: [
      ['T', 'Was dat nou een trekker?', 'verbaasd, zacht'],
      ['A', 'In de Herestraat? Je ziet spoken, Tammo.', 'droog, afwimpelend'],
    ],
    lead: 2.6,
    enter(r, s) {
      s.atm = buildAtm();
      r.group.add(s.atm);
      const q = lane(0, -1.8);
      s.limo = tempCar(r, q.x, q.y, here.a + Math.PI, { model: { ...MODELS[0], name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#0d0d0f' } });
      s.d = 13;
      if (s.limo) sfx(r.w, 'engine_start', q.x, q.y);
    },
    exit(r, s) { if (s.atm) disposeOwned(s.atm); },
    tick(r, s, t, dt) {
      const pq = lane(-2, 2.6);
      stage(r.tammo, pq.x - hf.x * 0.55, pq.y - hf.y * 0.55, here.a - 0.9, { pose: 'lookR', dt, t });
      s.atm.position.set(pq.x + hf.x * 0.35, 0, pq.y + hf.y * 0.35);
      s.atm.rotation.set(0, -here.a, 0.32);
      const a = lane(-1.6, 3.8);
      stage(r.anita, a.x, a.y, here.a - 1.2, { pose: t > 3 ? 'lookL' : null, dt, t });
      s.d -= 7 * dt;
      const q = lane(s.d, -1.8);
      if (s.limo) Object.assign(s.limo, { x: q.x, y: q.y, angle: here.a + Math.PI, speed: 7 });
      s.lq = q;
    },
    cams: [
      [0, (u, t, s) => {
        // low at the kerb, the limo rolls through the frame
        const c = lane(-4, 1.3);
        return pose(P(c.x, c.y, 0.55), P(s.lq.x, s.lq.y, 1.1 + u * 0.3), 40, t, 0.02);
      }],
      ['L0', (u, t) => {
        const q = lane(-2, 2.6);
        return pose(P(q.x - hn.x * 4.6 - hf.x * lerp(3, 2.2, u), q.y - hn.y * 4.6 - hf.y * lerp(3, 2.2, u), 1.6), P(q.x + hn.x * 0.4, q.y + hn.y * 0.4, 1.4), 40, t, 0.02);
      }],
    ],
  };

  // meanwhile someone else on the Grote Markt has a dream too: a silhouette
  // against the last light, a Frisian flag beside him
  const jelleShot = {
    minDur: 6.2, clock: 20.1, focus: square, flare: { x: 62, y: 34, a: 0.7 },
    lines: [['jelle', 'Moai. Sa\'n gouden aaibal… dy heart eins yn Fryslân.', 'zacht, zelfvoldaan, dromerig']],
    lead: 1.4,
    enter(r, s) {
      const dx = tower.x - square.x, dy = tower.y - square.y, dl = Math.hypot(dx, dy);
      s.fx = dx / dl; s.fy = dy / dl;
      s.dir = Math.atan2(dy, dx);
      s.spot = { x: square.x + s.fx * 6, y: square.y + s.fy * 6 };
      s.jelle = makeSilhouette();
      r.group.add(s.jelle);
      s.flag = buildFlag();
      const nx = -s.fy, ny = s.fx;
      s.flag.position.set(s.spot.x + nx * 1.2 + s.fx * 0.3, 0, s.spot.y + ny * 1.2 + s.fy * 0.3);
      s.flag.rotation.y = -(s.dir + Math.PI * 0.75);
      r.group.add(s.flag);
    },
    exit(r, s) {
      if (s.jelle) { s.jelle.removeFromParent(); s.jelle.traverse((o) => { if (o.isSkinnedMesh) o.geometry.dispose(); }); }
      if (s.flag) disposeOwned(s.flag);
    },
    tick(r, s, t, dt) {
      stage(s.jelle, s.spot.x, s.spot.y, s.dir, { pose: 'hips', dt, t });
      s.jelle.userData.blob.visible = false;
      waveFlag(s.flag, t);
    },
    cams: [
      [0, (u, t, s) => {
        // low behind him, looking up past his shoulder at the tower
        const nx = -s.fy, ny = s.fx, k = smooth(u), back = lerp(2.9, 2.3, k);
        const pos = P(s.spot.x - s.fx * back - nx * 0.5, s.spot.y - s.fy * back - ny * 0.5, lerp(0.3, 0.45, k));
        return pose(pos, P(s.spot.x + s.fx * 8, s.spot.y + s.fy * 8, lerp(3.6, 4.6, k)), 54, t, 0.015);
      }],
    ],
  };

  const card2 = { minDur: 2.7, black: true, card: '<div class="im-kicker">Een Grunneger misdaadverhaal</div><div class="im-title">Alles voor <span class="amp">één</span> eierbal</div>' };

  // this morning: the machine still sits behind a parked car, a phone rings
  const hook = {
    minDur: 5.4, clock: 8.3, focus: here,
    caption: ['VANOCHTEND · HERESTRAAT', 'De automaat staat er nog.'],
    lines: [['V', 'Dat was gisteren. Vandaag gaat de telefoon.', 'droog, met een knipoog']],
    lead: 0.7,
    enter(r, s) {
      const c = lane(4, 3.2);
      s.car = tempCar(r, c.x, c.y, here.a, { model: { ...MODELS[0], color: '#3b4d63' } });
      s.atm = buildAtm();
      s.atm.position.set(c.x - hf.x * 2.6, 0, c.y - hf.y * 2.6);
      s.atm.rotation.set(0, -here.a + 0.2, 0.12);
      r.group.add(s.atm);
      s.c = c;
    },
    exit(r, s) { if (s.atm) disposeOwned(s.atm); },
    tick(r, s, t) {
      const l = hook.timed[0];
      if (!s.rang && l && t > l.at + l.dur) { s.rang = true; sfx(r.w, 'notify', s.c.x, s.c.y, { strength: 1 }); }
    },
    cams: [[0, (u, t, s) => {
      const c = s.c, k = smooth(u);
      return pose(P(c.x - hf.x * lerp(10, 7, k) - hn.x * 3.2, c.y - hf.y * lerp(10, 7, k) - hn.y * 3.2, lerp(1.2, 1.6, k)), P(c.x - hf.x * 2.4, c.y - hf.y * 2.4, 0.9), 42, t, 0.02);
    }]],
  };

  const card3 = { minDur: 2.7, black: true, card: '<div class="im-kicker">Grand Theft Eierbal</div><div class="gte-logo"><span class="gte">GTE</span><span class="vi">VI</span></div>', restore: true };

  const swoop = {
    minDur: 6.4, home: true,
    lower: '<div class="im-kicker">Welkom in</div><div class="im-title">Grunn</div>',
    enter(r, s) { s.shot = r.flyShot(); },
    // soft for the last moment, so the follow camera below has its collision again
    cams: [[0, (u, t, s) => ({ ...s.shot(u), cut: u < 0.9 })]],
  };

  return [dawn, onAir, museumShot, card1, dream, jelleShot, heist, glimpse, card2, hook, card3, swoop];
}

// Speaker keys: T, A, V (Rikus, the narrator), jelle.
const WHO = { T: 'Tammo', A: 'Anita', V: NARRATOR, jelle: 'Jelle Terpstra' };

function voiceOf(who, text) {
  const v = voices[who + '|' + text];
  if (v) return { src: VOICE_DIR + v.src, dur: v.dur };
  return lineVoiceFor(who, text);
}

const readDur = (text) => Math.max(1.6, text.length / 14);

// Lines play back to back from the shot's `lead` (a recorded line holds
// until its recording ends); the shot then ends on the next beat of the
// theme. "L2+1.5" in cams/tags = 1.5 s after line 2 starts.
function timeShots(shots) {
  let T = 0;
  for (const s of shots) {
    let t = s.lead ?? 0.5;
    s.timed = (s.lines || []).map(([k, text]) => {
      const who = WHO[k] || k;
      const v = voiceOf(who, text);
      const l = { who, text, at: t, dur: v ? v.dur + 0.2 : readDur(text), voice: v && v.src, radio: !!s.radio };
      t = l.at + l.dur + 0.12;
      return l;
    });
    const want = Math.max(s.minDur || 3, t + (s.lines ? 0.3 : 0));
    const k = Math.ceil((T + want - BEAT0) / BEAT);
    s.dur = BEAT0 + k * BEAT - T;
    const at = (spec) => {
      if (typeof spec === 'number') return spec;
      const m = /^L(\d+)(?:([+-][\d.]+))?$/.exec(spec);
      const l = m && s.timed[+m[1]];
      return l ? l.at + (m[2] ? +m[2] : 0) : 0;
    };
    if (s.cams) s.camAt = s.cams.map(([spec]) => Math.max(0, Math.min(s.dur - 0.3, at(spec))));
    if (s.tags) s.tagAt = s.tags.map(([a, b, name, role]) => [at(a), at(b), name, role]);
    T += s.dur;
  }
  return T;
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
  if (shot.clock != null) { setClock(w, shot.clock); setWeather(w, shot.mist || 0); }
  if (shot.enter) shot.enter(r, r.state);
  if (shot.lower) setTimeout(() => { if (run === r && r.idx === i) { ui.lower.innerHTML = shot.lower; ui.lower.classList.add('on'); } }, 500);
}

function restoreHome(r) {
  const w = r.w, s = r.saved;
  w.player.x = s.px; w.player.y = s.py; w.player.angle = s.pa; w.player.vx = 0; w.player.vy = 0;
  const c = w.companion;
  if (c && s.comp) { c.x = s.comp.x; c.y = s.comp.y; c.angle = s.comp.angle; c.vx = 0; c.vy = 0; }
  setClock(w, s.clock);
  if (s.weather) w.weather = s.weather;
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
  if (shot.timed.length) {
    const l = shot.timed.find((q) => st >= q.at && st < q.at + q.dur);
    setSub(l || null);
    // narration heard here is not repeated when H1 opens (missionstory.js)
    if (l && l.who === NARRATOR && st > l.at + l.dur * 0.6 && !w.introTold.includes(l.text)) w.introTold.push(l.text);
  }
  // on the shot's own clock: slow frames must not drift the caption off
  ui.cap.classList.toggle('on', !!shot.caption && st > 0.35 && st < Math.min(4.4, shot.dur - 0.6));
  if (shot.tagAt) {
    const g = shot.tagAt.find(([a, b]) => st >= a && st < b);
    setTag(g ? { name: g[2], role: g[3] } : null);
  }
  if (shot.cams) {
    let k = 0;
    while (k < shot.cams.length - 1 && st >= shot.camAt[k + 1]) k++;
    // a cut inside a shot: a hard cut on the line, only a soft whoosh
    if (k !== r.camIdx) { r.camIdx = k; sfx(w, 'whoosh', w.player.x, w.player.y, { strength: 0.4 }); }
    const a = shot.camAt[k], b = k + 1 < shot.cams.length ? shot.camAt[k + 1] : shot.dur;
    r.pose = shot.cams[k][1](clamp01((st - a) / Math.max(0.1, b - a)), st, r.state);
  }
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
  setStoryScene(false, 'intro');
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
  const total = timeShots(shots);
  const starts = [];
  let acc = 0;
  for (const s of shots) { starts.push(acc); acc += s.dur; }
  w.introTold = [];
  const p = w.player, c = w.companion;
  const r = {
    w, group, tammo, anita, shots, starts, cars: [], idx: -1, state: {}, lastT: 0, offset: Math.max(0, Math.min(total - 1, startAt)),
    camIdx: 0, pose: null, flyShot,
    saved: { px: p.x, py: p.y, pa: p.angle, clock: typeof w.clock === 'number' ? w.clock : 17.5, wanted: w.wanted || 0, weather: w.weather, comp: c ? { x: c.x, y: c.y, angle: c.angle } : null },
  };
  run = r;
  document.body.classList.add('intro-montage');
  setStoryScene(true, 'intro');
  // from the top, so the cuts land on the song's beats
  if (!r.offset) cueTheme(0);
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

