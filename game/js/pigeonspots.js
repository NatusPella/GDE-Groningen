import { hoofdspeler } from './players.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh } from './models3d_people.js';
import { isMissionActive, getActiveRace } from './missionquery.js';
import { isCinematicActive } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { startPigeonMode, isPigeonActive, addPigeonLoft, buildPigeonBird, posePigeonBird } from './pigeonmode.js';
// de maat van een duif op de voerplek t.o.v. het model (0,6 m van snavel tot staart): 0,64 geeft een stadsduif van ca. 0,38 m (#1195)
export const GROUND_PIGEON_SCALE = 0.64;
import { isInWater } from './util.js';
import { playerBusy } from './busy.js';
import { waarschuwVoorStart } from './coopstatus.js';

// Places in the city where Tammo, the duivenfluisteraar, can steer a pigeon:
// a badge + a few pecking pigeons at each; E and he whistles one up (eyes
// closed, the camera jumps into the bird). The pigeons don't listen to Tessa:
// playing as her, E hands over to Tammo when he's around, and he whistles.

// What Tessa says at a pigeon spot (a bubble in her own voice, "~f|" lines)
const ANITA_NO_PIGEON = [
  'Duiven luisteren naar Tammo. Naar mij luistert alleen Tammo.',
  'Tammo! Fluiten! …Hij hoort me niet. De duiven ook niet.',
  'Ik ben geen duivenkoning. Ik ben de baas van de duivenkoning.',
];
const SPOTS = [
  { id: 'vismarkt', landmark: 'Vismarkt', name: 'Vismarkt', host: 'Opa Geert voert hier de duiven', feeder: true },
  { id: 'grotemarkt', landmark: 'Grote Markt', name: 'Grote Markt', host: 'Een zwerm op de keien' },
  { id: 'martini', landmark: 'Martinitoren', name: 'Martinitoren', host: 'Duiven aan de voet van d\'Olle Grieze' },
  { id: 'noorderplantsoen', landmark: 'Noorderplantsoen', name: 'Noorderplantsoen', host: 'Duiven bij de vijver' },
  { id: 'station', x: -46.3, y: 899, name: 'Stationsplein', host: 'Stationsduiven wachten op de trein' },
  { id: 'volkstuin', x: 1036.85, y: 1530.47, name: 'Duiventil volkstuin', host: 'Duivenmelker Bert leent je een duif', loft: true },
];
const USE_RADIUS = 2.4;
const FLOCK_DRAW = 45;
const BADGE_COLOR = '#56709e';
const TINTS = [0x8a93a6, 0x6f7584, 0xa79f94, 0x5d6270, 0x9aa3b8];

let spots = [];

function drawPigeonGlyph(g, r, color = '#f2ede0') {
  g.save();
  g.scale(r / 10, r / 10);
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(-0.5, 1.5, 6.2, 3.6, -0.18, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(4.6, -2.6, 2.6, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(-5.5, 0.5); g.lineTo(-10, -1.8); g.lineTo(-9.4, 3.2); g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(6.9, -2.9); g.lineTo(9.6, -2.1); g.lineTo(6.9, -1.4); g.closePath();
  g.fill();
  g.strokeStyle = color;
  g.lineWidth = 1.1;
  g.beginPath();
  g.moveTo(0, 4.6); g.lineTo(-0.6, 7.6);
  g.moveTo(2.2, 4.4); g.lineTo(2.2, 7.6);
  g.stroke();
  g.restore();
}

// Map marker: slate disc with a cream pigeon (minimap, full map, legend).
export function drawPigeonMapIcon(ctx, s) {
  ctx.beginPath();
  ctx.arc(0, 0, 4.6 * s, 0, Math.PI * 2);
  ctx.fillStyle = BADGE_COLOR;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawPigeonGlyph(ctx, 3.3 * s);
}

export function getPigeonSpotsForRender() {
  return spots;
}

let badgeMat = null;
// #1194: een dunne ring in plaats van een halfdoorzichtige blauwe schijf, die las als een plas op de straat
const padGeo = new THREE.RingGeometry(0.44, 0.55, 28).rotateX(-Math.PI / 2);
const padMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(BADGE_COLOR), side: THREE.DoubleSide });

function badgeMaterial() {
  if (badgeMat) return badgeMat;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.beginPath(); g.arc(0, 0, S / 2 - 6, 0, Math.PI * 2);
  g.fillStyle = BADGE_COLOR; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#f2ede0'; g.stroke();
  drawPigeonGlyph(g, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  badgeMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true });
  return badgeMat;
}

// #1189 (beeld 24-11): at 0.52 m the badge filled a sixth of the screen height when you stood a few metres from the spot and
// shouted louder than the prompt and the objective; 0.4 m still reads from across a square and the minimap marks the spot too
export const BADGE_SIZE_M = 0.4;
function buildMarker(x, y) {
  const group = new THREE.Group();
  group.position.set(x, 0, y);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.03;
  group.add(pad);
  const badge = new THREE.Sprite(badgeMaterial());
  badge.scale.set(BADGE_SIZE_M, BADGE_SIZE_M, 1);
  const phase = Math.random() * Math.PI * 2;
  badge.position.y = 2.3;
  badge.onBeforeRender = () => { badge.position.y = 2.3 + Math.sin(performance.now() / 650 + phase) * 0.06; };
  group.add(badge);
  group.userData.badge = badge;
  return group;
}

// An old man (stooped build) for the Vismarkt; seeds are tried until the
// random look comes out old and male.
function buildFeeder() {
  // een oude man (look.age 'old': gebogen, grijs haar) op zijn vaste zaad; het oude model zoekt een zaad dat gebogen uitvalt
  const m = buildPersonMesh(0x5b5448, 0xe0b894, { seed: 300, variant: 'male', look: { age: 'old' } });
  if (m.userData.qRig) return m;
  for (let seed = 300; seed < 360; seed++) {
    const o = buildPersonMesh(0x5b5448, 0xe0b894, { seed, variant: 'male' });
    if (o.userData.stoop > 0) return o;
  }
  return m;
}

function freeAround(map, x, y, r, a) {
  const [px, py] = map.escapeBuilding(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.4);
  return isInWater(map, px, py) ? null : [px, py];
}

function placeSpot(map, def, scene) {
  const lm = def.landmark ? (map.meta.landmarks || []).find((l) => l.name === def.landmark) : null;
  const ax = lm ? lm.x : def.x, ay = lm ? lm.y : def.y;
  if (!Number.isFinite(ax)) return null;
  const open = map.findOpenSpawn(ax, ay, 200);
  if (!open) return null;
  const spot = { id: def.id, name: def.name, host: def.host, x: open.x, y: open.y, birds: [], extra: null, used: null, marker: buildMarker(open.x, open.y), flock: new THREE.Group() };
  scene.add(spot.flock);
  scene.add(spot.marker);

  if (def.loft) {
    const d = Math.hypot(ax - spot.x, ay - spot.y) || 1;
    const k = Math.min(4, d) / d;
    const [lx, ly] = map.escapeBuilding(spot.x + (ax - spot.x) * k, spot.y + (ay - spot.y) * k, 1.2);
    addPigeonLoft(lx, ly, Math.atan2(spot.x - lx, spot.y - ly));
  }
  if (def.feeder) {
    const a = Math.random() * Math.PI * 2;
    const p = freeAround(map, spot.x, spot.y, 2.6, a);
    if (p) {
      const man = buildFeeder();
      man.position.set(p[0], 0, p[1]);
      man.rotation.y = -Math.atan2(spot.y - p[1], spot.x - p[0]);
      scene.add(man);
      spot.extra = man;
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.random() * 0.8;
    const p = freeAround(map, spot.x, spot.y, 1.2 + Math.random() * 0.9, a);
    if (!p) continue;
    const mesh = buildPigeonBird('pigeon', TINTS[(i + spot.id.length) % TINTS.length]);
    // #1195 (hertest 24-11): buildPigeonBird zet de maat van de speelbare duif (1,5x het model van 0,6 m: 0,9 m, kniehoogte naast een mens).
    // Een duif op de keien is een gewone stadsduif van ca. 0,38 m, net als de duiven van wildlife.js (PIGEON_K)
    mesh.scale.setScalar(GROUND_PIGEON_SCALE);
    // on the ground height there (pavement, square), not on 0: a pigeon stood half in the cobbles (#1195)
    mesh.position.set(p[0], (map.groundHeightAt && map.groundHeightAt(p[0], p[1], 0)) || 0, p[1]);
    const yaw = Math.random() * Math.PI * 2;
    mesh.rotation.set(0, -yaw, 0);
    // ~30 parts a bird: only the body casts a shadow
    mesh.traverse((o) => { o.castShadow = false; });
    mesh.userData.body.children[0].castShadow = true;
    spot.flock.add(mesh);
    spot.birds.push({ mesh, x: p[0], y: p[1], yaw, seed: Math.random() * 10 });
  }
  return spot;
}

export function initPigeonSpots(w) {
  const scene = getScene();
  spots = SPOTS.map((d) => placeSpot(w.map, d, scene)).filter(Boolean);
}

function blockReason(w) {
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (playerBusy(w, ['mission', 'activeRace']).busy) return 'Niet nu: maak eerst je missie af';
  return null;
}

function nearestSpot(w) {
  const p = hoofdspeler(w);
  if (w.pigeonMode || p.inVehicle || p.swimming || p.water) return null;
  let best = null, bd = USE_RADIUS;
  for (const s of spots) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function pigeonSpotPrompt(w) {
  const s = nearestSpot(w);
  if (!s) return null;
  const why = blockReason(w);
  const hp = hoofdspeler(w);
  if (hp && hp.character === 'anita') {
    if (tammoNearby(w)) return { id: 'duif-' + s.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: 'Laat Tammo fluiten', sub: why || 'De duiven luisteren alleen naar hem', ring: true, dim: !!why };
    return { id: 'duif-' + s.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: 'Duiven', sub: 'Die luisteren alleen naar Tammo', ring: true, dim: true };
  }
  return { id: 'duif-' + s.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: 'Fluit een duif', sub: why || `${s.host}. Je vliegt dan zelf als duif.`, ring: true, dim: !!why };
}

export function pigeonSpotSecondary(w) {
  if (w.pigeonMode || hoofdspeler(w).inVehicle) return [];
  const { x, y } = hoofdspeler(w);
  const out = [];
  for (const s of spots) {
    if (Math.abs(s.x - x) > 18 || Math.abs(s.y - y) > 18) continue;
    out.push({ id: 'duif2-' + s.id, x: s.x, y: s.y, h: 2.2, label: 'Duiven', sub: 'Loop erheen en druk E', kind: 'place' });
  }
  return out;
}

// Runs before the shop/horeca/player E handlers.
export function tryPigeonSpotInteract(w) {
  const input = w.input;
  if (!input || isShopOpen() || isCinematicActive() || w.pigeonMode) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const s = nearestSpot(w);
  if (!s) return false;
  input.consume('e');
  input.consume('f');
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  waarschuwVoorStart(w, 'minigame', 'duif'); // samen spelen: een melding als dit nog niet samen werkt; de start gaat door
  const p = hoofdspeler(w);
  if (p.character === 'anita') {
    if (!tammoNearby(w)) { anitaSays(w); return true; }
    // Tammo takes over where Tessa stood (scene3d.js rebuilds both meshes)
    w.companion.character = 'anita';
    p.character = 'tammo';
    w.addMessage('Tessa: "Tammo, fluiten jij."', 2.2);
  }
  let bird = null, bd = Infinity;
  for (const b of s.birds) {
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d > 0.9 && d < bd) { bd = d; bird = b; }
  }
  let bx, by;
  if (bird) { bx = bird.x; by = bird.y; }
  else {
    const a = Math.atan2(s.y - p.y, s.x - p.x);
    [bx, by] = w.map.escapeBuilding(p.x + Math.cos(a) * 1.6, p.y + Math.sin(a) * 1.6, 0.4);
  }
  if (!startPigeonMode(w, { x: bx, y: by })) return true;
  s.used = bird || true;
  if (bird) bird.mesh.visible = false;
  s.marker.visible = false;
  return true;
}

// Tammo walks with Tessa as the companion; he has to be close to take over.
function tammoNearby(w) {
  const c = w.companion, p = hoofdspeler(w);
  return !!(c && c.character === 'tammo' && c.state !== 'dead' && !c.inVehicle && Math.hypot(c.x - p.x, c.y - p.y) < 30);
}

let anitaIdx = 0;
function anitaSays(w) {
  const p = hoofdspeler(w);
  const list = w.extraSpeakers || (w.extraSpeakers = []);
  if (list.some((e) => e.follow === p && w.time < e.speechUntil)) return;
  const text = ANITA_NO_PIGEON[anitaIdx++ % ANITA_NO_PIGEON.length];
  list.push({ x: p.x, y: p.y, h: 2.2, follow: p, female: true, speechName: 'Anita', speechText: text, speechUntil: w.time + Math.max(3, 1.2 + text.length * 0.06) });
}

// The trailer (trailer.js) films the squares without the spots' map
// markers and their decorative birds; play shows them again.
export function hidePigeonSpots(on) {
  for (const s of spots) { s.marker.visible = !on && !s.used; s.flock.visible = !on; }
}

// #1189: in a vehicle the spot cannot be used (no prompt, nearestSpot), and the blue badge at cab height hung big
// in the middle of the screen when you stopped on the spot (tractor, van). Near the spot it hides while you drive.
const BADGE_HIDE_NEAR_M = 8;
function badgeShown(p, s) {
  return !(p && p.inVehicle && Math.hypot(s.x - p.x, s.y - p.y) < BADGE_HIDE_NEAR_M);
}

export function updatePigeonSpots(dt, w) {
  const p = hoofdspeler(w);
  const t = w.time;
  const flying = isPigeonActive();
  for (const s of spots) {
    if (s.used && !flying) {
      if (s.used.mesh) s.used.mesh.visible = true;
      s.marker.visible = true;
      s.used = null;
    }
    const badge = s.marker.userData.badge;
    if (badge) badge.visible = badgeShown(p, s);
    // a bird is a few pixels beyond this, but some 30 draw calls
    s.flock.visible = Math.hypot(s.x - p.x, s.y - p.y) < FLOCK_DRAW;
    if (!s.flock.visible) continue;
    for (const b of s.birds) {
      if (!b.mesh.visible) continue;
      const peck = Math.max(0, Math.sin(t * 2.1 + b.seed * 3.7)) ** 8;
      const turn = Math.sin(t * 0.37 + b.seed) * 0.9;
      b.mesh.rotation.y = -(b.yaw + turn);
      posePigeonBird(b.mesh, { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: 0, peck });
    }
    if (s.extra) {
      const ud = s.extra.userData;
      if (ud.armR) ud.armR.rotation.x = -0.5 - Math.max(0, Math.sin(t * 1.3)) * 0.5;
    }
  }
}
