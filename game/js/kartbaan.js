import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, seatPerson, seatedY, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { pushAudioEvent } from './pedgeom.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { showCard } from './hudcards.js';
import { spawnFxPuff, spawnFxSpark } from './fx3d.js';
import { ambientOut } from './audio.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { createBoard, key, bubble, clearBubbles, pick, stopPressed, easeCamera, fmtTime, angDiff, clamp } from './minigamekit.js';
import { KART_LINES, KART_RIVALS } from './minigamelines.js';
import {
  createKart, stepKart, updateProgress, collideKarts, aiInput, rankKarts, positionMedal, bestLap, pointAt, locate, KART, LAPS, RUNOFF,
} from './kartrace.js';
import { createRecorder, recordGhost, finishGhost, ghostAt, loadGhost, saveGhost } from './ghostreplay.js';
import { KEYS } from './storagekeys.js';
import { addClearZone, corridorPoints } from './clearzone.js';
import { KARTBAAN_ORIGIN, KARTBAAN_ROT, KARTBAAN_FRAME, KARTBAAN_WIDTH, KARTBAAN_TRACK } from './kartbaanspoor.js';
import { racingLine } from './kartline.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedRaceTik, wedHostEind, wedGastVerlaat, wedGastReset, tikSpiegel, eindstand, beloning } from './coopwedstrijd.js';
import { figuurLook } from './coopplayers.js';

// Karten in Ulrum: the real outdoor kart track of Ulrum (OSM way "Kartbaan
// Ulrum", kartbaandata.js), laid out exactly as mapped, 330 m with the start
// on its longest straight. The indoor hall in the city is not used. The track
// is a clear zone (clearzone.js): no walkers, traffic or props. Three laps against three
// drivers, no ghosts. W/S gas and brake (the mouse buttons too), A/D steer,
// Space is the handbrake: hold it into a bend to drift, and a long enough
// drift ends in a boost. The grass slows you, the tyre wall bounces you back.
// Finish first for gold, second silver, third bronze; records for the race time and
// the best lap. Money-neutral. Rules, the kart and the drivers: kartrace.js.
// `window.__kartbaan` debug.
const ACCENT = '#f2b82a';
const ORIGIN = KARTBAAN_ORIGIN;
const ROT = KARTBAAN_ROT;
const FR = KARTBAAN_FRAME;
const WIDTH = KARTBAAN_WIDTH;
const TRACK = KARTBAAN_TRACK; // kartbaanspoor.js: the same track an online race simulates on (#443)
const CENTER = FR.toW(0, 0);
// nobody walks or drives across the track, and no props stand on it (clearzone.js, issue #176)
addClearZone('kartbaan', corridorPoints(TRACK, FR.toW), WIDTH / 2 + RUNOFF + 3);
// the start straight: which side is outside the loop, and where the booth and the stand go
const SP = pointAt(TRACK, 0);
const loopHas = (x, y) => { let r = false; for (let i = 0, j = TRACK.N - 1; i < TRACK.N; j = i++) { if ((TRACK.v[i] > y) !== (TRACK.v[j] > y) && x < ((TRACK.u[j] - TRACK.u[i]) * (y - TRACK.v[i])) / (TRACK.v[j] - TRACK.v[i]) + TRACK.u[i]) r = !r; } return r; };
const OUT_LEFT = !loopHas(SP.x - Math.sin(SP.ang) * 6, SP.y + Math.cos(SP.ang) * 6);
const DEC_ROT = -SP.ang + (OUT_LEFT ? Math.PI : 0);
// a point in the decor frame (x along the straight, z away from the track as -z) in track coordinates
const decAt = (px, pz) => ({ u: SP.x + px * Math.cos(DEC_ROT) + pz * Math.sin(DEC_ROT), v: SP.y - px * Math.sin(DEC_ROT) + pz * Math.cos(DEC_ROT) });
const STAND_Z = -(TRACK.hw + RUNOFF + 3.3);
const STAND = ((q) => FR.toW(q.u, q.v))(decAt(-8, STAND_Z));
const USE_RADIUS = 3;
const DETAIL_M = 700;
const LIGHTS_AT = [1.2, 2.2, 3.2], GO_AT = 4.2;
const FINISH_WAIT = 7, OUTRO = 4.5, RACE_CAP = 260;
const LAP_SNEL = 33;

let game = null;
let built = null;
let board = null;
let lodT = 0;
let runs = 0;
let engine = null;

// --- meshes ---------------------------------------------------------------------------------------

let mats = null;

function materials() {
  if (mats) return mats;
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  const checker = canvasTex(64, 16, (g, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#111'; g.fillRect(i * 4, j * 4, 4, 4); } });
  checker.magFilter = THREE.NearestFilter;
  mats = {
    asphalt: std(0x3b3d42, { roughness: 0.95 }), line: new THREE.MeshBasicMaterial({ color: 0xf2f0e6 }), kerb: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }),
    checker: new THREE.MeshBasicMaterial({ map: checker }), tyre: new THREE.MeshStandardMaterial({ roughness: 0.95 }), post: std(0x4a4e52, { metalness: 0.5 }),
    gantry: std(0x2a2c30), stand: std(0xb8bcc0), seat: std(0xe0452e), seat2: std(0x2f6fd0), booth: std(0xe9e0c8), roof: std(0xc8261e), glass: std(0x9ec8e0, { transparent: true, opacity: 0.6 }),
    rubber: std(0x151515, { roughness: 0.95 }), metal: std(0x9aa2a8, { metalness: 0.7, roughness: 0.35 }), seatK: std(0x1d1d1f), crate: std(0x7a5a3a),
    lampOff: new THREE.MeshBasicMaterial({ color: 0x3a1010 }), lampRed: new THREE.MeshBasicMaterial({ color: 0xff2a1a }), lampGreen: new THREE.MeshBasicMaterial({ color: 0x28ff5a }),
  };
  return mats;
}

function mesh(geo2, mat, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(geo2, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// A strip along the track between two lateral offsets (positive to the left of travel).
// taper(q, n) (optional) scales the strip's width towards the near edge off0 (0..1), so a kerb runs out softly.
function ribbon(off0, off1, y, colorOf = null, from = 0, to = TRACK.N, taper = null) {
  const T = TRACK;
  const n = to - from;
  const pos = new Float32Array((n + 1) * 2 * 3);
  const col = colorOf ? new Float32Array((n + 1) * 2 * 3) : null;
  const idx = [];
  for (let q = 0; q <= n; q++) {
    const i = (from + q) % T.N;
    const a = T.ang[i];
    const nx = -Math.sin(a), ny = Math.cos(a);
    const k = taper ? taper(q, n) : 1;
    // the strip narrows towards its edge nearest the track
    const inner = Math.abs(off0) < Math.abs(off1);
    const a0 = inner ? off0 : off1 + (off0 - off1) * k, a1 = inner ? off0 + (off1 - off0) * k : off1;
    pos.set([T.u[i] + nx * a0, y, T.v[i] + ny * a0, T.u[i] + nx * a1, y, T.v[i] + ny * a1], q * 6);
    if (col) { const c = colorOf(i, k); col.set([c[0], c[1], c[2], c[0], c[1], c[2]], q * 6); }
    if (q < n) { const k = q * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildKartMesh(color, number) {
  const M = materials();
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
  mesh(new THREE.BoxGeometry(1.5, 0.12, 0.62), body, 0, 0.2, 0, g);
  mesh(new THREE.BoxGeometry(0.55, 0.1, 0.46), body, 0.88, 0.2, 0, g);
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.7, 0.2, 0.2), body, 0.1, 0.26, s * 0.44, g);
  mesh(new THREE.BoxGeometry(0.3, 0.3, 0.34), M.metal, -0.5, 0.4, 0, g);
  mesh(new THREE.BoxGeometry(0.34, 0.34, 0.46), M.seatK, -0.2, 0.4, 0, g);
  mesh(new THREE.BoxGeometry(0.08, 0.3, 0.06), M.metal, 0.42, 0.4, 0, g).rotation.z = -0.5;
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 10), M.rubber, 0.52, 0.56, 0, g).rotation.z = 0.5;
  // bumper tube
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.98, 6).rotateX(Math.PI / 2), M.metal, 1.12, 0.22, 0, g);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6).rotateZ(Math.PI / 2), M.metal, 0.1, 0.17, s * 0.62, g);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.98, 6).rotateX(Math.PI / 2), M.metal, -0.86, 0.22, 0, g);
  // number on a plate
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#111'; c.font = 'bold 48px Arial'; c.textAlign = 'center'; c.fillText(String(number), 32, 50); }), side: THREE.DoubleSide }));
  plate.position.set(-0.95, 0.46, 0);
  plate.rotation.y = -Math.PI / 2;
  g.add(plate);
  const wheels = [];
  for (const [x, z, r, w2, front] of [[0.62, 0.5, 0.15, 0.13, true], [0.62, -0.5, 0.15, 0.13, true], [-0.55, 0.54, 0.18, 0.2, false], [-0.55, -0.54, 0.18, 0.2, false]]) {
    const hub = new THREE.Group();
    hub.position.set(x, r, z);
    mesh(new THREE.CylinderGeometry(r, r, w2, 12).rotateX(Math.PI / 2), M.rubber, 0, 0, 0, hub);
    g.add(hub);
    wheels.push({ hub, front, r });
  }
  g.userData.wheels = wheels;
  return g;
}

function buildTrackScene() {
  const M = materials();
  const T = TRACK;
  const root = new THREE.Group();
  root.position.set(ORIGIN.x, 0.02, ORIGIN.y);
  root.rotation.y = -ROT;
  const asphalt = new THREE.Mesh(ribbon(-T.hw, T.hw, 0.03), M.asphalt);
  asphalt.receiveShadow = true;
  root.add(asphalt);
  for (const s of [-1, 1]) root.add(new THREE.Mesh(ribbon(Math.min(s * (T.hw - 0.4), s * (T.hw - 0.22)), Math.max(s * (T.hw - 0.4), s * (T.hw - 0.22)), 0.045), M.line));
  // kerbs on the bends, red and white
  // a kerb runs out over its first and last metres: it narrows and fades into the asphalt
  const kerbCol = (i, k = 1) => {
    const c = (Math.floor(i / 2) % 2) ? [0.9, 0.1, 0.08] : [0.95, 0.95, 0.9];
    return c.map((v) => 0.26 + (v - 0.26) * (0.4 + 0.6 * k));
  };
  const kerbTaper = (q, n) => { const e = Math.min(q, n - q) / 4; return Math.max(0.12, Math.min(1, e * e * (3 - 2 * Math.min(e, 1)))); };
  for (const s of [-1, 1]) {
    const o0 = s > 0 ? T.hw : -T.hw - 0.8, o1 = s > 0 ? T.hw + 0.8 : -T.hw;
    let run = -1;
    for (let i = 0; i <= T.N; i++) {
      const sharp = i < T.N && T.curv[i] > 0.022;
      if (sharp && run < 0) run = i;
      if ((!sharp || i === T.N) && run >= 0) {
        if (i - run > 3) root.add(new THREE.Mesh(ribbon(o0, o1, 0.04, kerbCol, run, i, kerbTaper), M.kerb));
        run = -1;
      }
    }
  }
  // the tyre wall all the way round
  const lim = T.hw + RUNOFF + 0.35;
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 8), M.tyre, T.N * 4);
  const m4 = new THREE.Matrix4(), cc = new THREE.Color();
  let q = 0;
  for (let i = 0; i < T.N; i++) {
    const a = T.ang[i];
    for (const s of [-1, 1]) {
      for (const layer of [0, 1]) {
        m4.makeTranslation(T.u[i] - Math.sin(a) * lim * s + (layer ? 0.4 : 0) * Math.cos(a), 0.27 + layer * 0.45, T.v[i] + Math.cos(a) * lim * s + (layer ? 0.4 : 0) * Math.sin(a));
        im.setMatrixAt(q, m4);
        im.setColorAt(q, cc.setHex(layer === 0 ? ((i >> 1) % 2 ? 0x1c1c1e : 0xd8d4cc) : ((i >> 1) % 2 ? 0xd8d4cc : 0x1c1c1e)));
        q++;
      }
    }
  }
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = false;
  root.add(im);
  // the start and finish line, the grid and the gantry with the start lights
  const sp = pointAt(T, 0);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1.2, WIDTH - 0.8).rotateX(-Math.PI / 2), M.checker);
  line.position.set(sp.x, 0.05, sp.y);
  line.rotation.y = -sp.ang;
  root.add(line);
  const lamps = [];
  const gantry = new THREE.Group();
  gantry.position.set(sp.x, 0, sp.y);
  gantry.rotation.y = -sp.ang;
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.3, 5.4, 0.3), M.gantry, 0, 2.7, s * (T.hw + 1.4), gantry);
  mesh(new THREE.BoxGeometry(0.5, 0.9, (T.hw + 1.4) * 2 + 0.6), M.gantry, 0, 5.4, 0, gantry);
  const bannerTex = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#16181c'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2b82a'; g.font = 'bold 54px Arial'; g.textAlign = 'center'; g.fillText('KARTBAAN ULRUM', w / 2, 64); });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.5), new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide }));
  banner.rotation.y = Math.PI / 2;
  banner.position.set(0.28, 6.2, 0);
  gantry.add(banner);
  for (let k = 0; k < 4; k++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), M.lampOff);
    lamp.position.set(0.3, 5.4, (k - 1.5) * 1.1);
    gantry.add(lamp);
    lamps.push(lamp);
  }
  root.add(gantry);
  // the grid slots
  for (let i = 0; i < 4; i++) {
    const k = createKart(T, i);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3).rotateX(-Math.PI / 2), M.line);
    slot.material = new THREE.MeshBasicMaterial({ color: 0xf2f0e6, transparent: true, opacity: 0.35 });
    slot.position.set(k.u, 0.045, k.v);
    slot.rotation.y = -k.a;
    root.add(slot);
  }
  // the booth with the kassa, a grandstand and a few flags on the north side
  const dec = new THREE.Group();
  dec.position.set(SP.x, 0, SP.y);
  dec.rotation.y = DEC_ROT;
  root.add(dec);
  const booth = new THREE.Group();
  booth.position.set(-8, 0, STAND_Z - 5);
  mesh(new THREE.BoxGeometry(11, 3, 4.2), M.booth, 0, 1.5, 0, booth);
  mesh(new THREE.BoxGeometry(11.8, 0.3, 5), M.roof, 0, 3.15, 0, booth);
  mesh(new THREE.BoxGeometry(5, 1.2, 0.1), M.glass, 0, 1.7, 2.15, booth);
  const kas = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.9), new THREE.MeshBasicMaterial({ map: canvasTex(256, 56, (g, w, h) => { g.fillStyle = '#f2b82a'; g.fillRect(0, 0, w, h); g.fillStyle = '#16181c'; g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.fillText('KARTEN · KASSA', w / 2, 40); }) }));
  kas.position.set(0, 2.7, 2.16);
  booth.add(kas);
  for (const x of [-4, 4]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), M.metal, x, 3, 2.9, booth);
  for (let i = 0; i < 3; i++) for (const x of [-4, 4]) mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ color: [0xe0452e, 0xf2c230, 0x2f6fd0][i], side: THREE.DoubleSide }), x + 0.6, 5.5 - i * 0.9, 2.9, booth, false);
  dec.add(booth);
  const gs = new THREE.Group();
  gs.position.set(22, 0, -T.hw - RUNOFF - 4);
  for (let r = 0; r < 4; r++) {
    mesh(new THREE.BoxGeometry(16, 0.5, 1.1), M.stand, 0, 0.25 + r * 0.5, -r * 1.1, gs);
    mesh(new THREE.BoxGeometry(15, 0.18, 0.6), r % 2 ? M.seat : M.seat2, 0, 0.6 + r * 0.5, -r * 1.1 + 0.1, gs, false);
  }
  dec.add(gs);
  // the baanwacht with the flag
  const wubbe = buildPersonMesh(0x2a2e36, 0xe2b48c, { variant: 'male', seed: 8830, look: { age: 'adult', hat: null, bag: null, umbrella: null } });
  const wp = pointAt(T, 3, T.hw + 1.8);
  wubbe.position.set(ORIGIN.x + Math.cos(ROT) * wp.x - Math.sin(ROT) * wp.y, 0, ORIGIN.y + Math.sin(ROT) * wp.x + Math.cos(ROT) * wp.y);
  wubbe.rotation.y = -(ROT - Math.PI / 2);
  // the karts
  const names = ['jij', ...KART_RIVALS.map((r) => r.name)];
  const colors = [0xf2c230, ...KART_RIVALS.map((r) => r.kart)];
  const karts = names.map((n, i) => ({ mesh: buildKartMesh(colors[i], i + 1), rider: null }));
  const scene = getScene();
  scene.add(root, wubbe);
  for (const k of karts) { k.mesh.visible = false; scene.add(k.mesh); }
  // the ghost of your best race: your own kart, see-through
  const ghost = { mesh: buildKartMesh(0xf2c230, 0) };
  ghost.mesh.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.32; o.material.depthWrite = false; } });
  ghost.mesh.visible = false;
  scene.add(ghost.mesh);
  return { root, lamps, wubbe, karts, ghost, wubbePos: { x: wubbe.position.x, y: wubbe.position.z } };
}

function updateLod(w) {
  const d = Math.hypot(w.player.x - CENTER.x, w.player.y - CENTER.y);
  if (!built && d < DETAIL_M) built = buildTrackScene();
  if (!built) return;
  built.root.visible = d < DETAIL_M + 100 || !!game;
  built.wubbe.visible = built.root.visible;
}

// --- map icon -----------------------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#16181c';
  ctx.beginPath(); ctx.moveTo(-3, 1.2); ctx.lineTo(-2.4, -0.4); ctx.lineTo(0.8, -0.4); ctx.lineTo(1.8, -1.2); ctx.lineTo(3, -1.2); ctx.lineTo(3, 1.2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(-1.5, 1.7, 0.9, 0, Math.PI * 2); ctx.arc(1.8, 1.7, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// --- prompt and start ---------------------------------------------------------------------------------------

function nearStand(w) {
  const p = w.player;
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - STAND.x, p.y - STAND.y) < USE_RADIUS;
}

function recText() {
  const rec = getChallengeRecord('kart-race');
  return rec && rec.best != null ? `Record: ${fmtTime(rec.best)}${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : null;
}

function prompt(w) {
  if (!nearStand(w)) return null;
  const why = activityBlock(w);
  return { id: 'kartbaan', x: STAND.x, y: STAND.y, h: 2.2, key: 'E', label: 'Karten in Ulrum', sub: why || recText() || 'Drie ronden tegen drie rijders · gratis', ring: true, dim: !!why };
}

function secondary(w) {
  if (game || w.player.inVehicle) return [];
  if (Math.hypot(w.player.x - CENTER.x, w.player.y - CENTER.y) > 260) return [];
  return [{ id: 'kartbaan-2', x: STAND.x, y: STAND.y, h: 2.2, label: 'Kartbaan Ulrum', sub: 'Loop naar de kassa en druk E', kind: 'place' }];
}

function interact(w) {
  if (!nearStand(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  // with guests in the session the race is an invitation to everyone (Meedoen? J/N); pressing E again starts at once (#443)
  const uit = wedNodigUit(w, 'kartbaan');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  start(w);
  return true;
}

// localStorage can be blocked (tests, private windows): then there is simply no ghost
function ghostStore() {
  try { return localStorage; } catch { return { getItem: () => null, setItem: () => {} }; }
}

function start(w, { force = false } = {}) {
  if (game) return false;
  if (!force && activityBlock(w)) return false;
  if (!built) built = buildTrackScene();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  const karts = [createKart(TRACK, 0, { player: true, name: 'jij' }), ...KART_RIVALS.map((r, i) => createKart(TRACK, i + 1, { skill: [0.93, 0.97, 1.01][i], name: r.name }))];
  // the riders, seated
  const me = p.character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  const looks = [me, ...KART_RIVALS.map((r) => ({ shirt: r.shirt, skin: 0xe2b48c, variant: r.variant, seed: 6500 + r.name.length, look: { age: r.age, hat: null, bag: null, umbrella: null } }))];
  built.karts.forEach((k, i) => {
    const l = looks[i];
    k.rider = buildPersonMesh(l.shirt, l.skin, l);
    seatPerson(k.rider, true);
    getScene().add(k.rider);
    k.mesh.visible = true;
  });
  w.cinematicHidePlayers = true;
  ensureBoard();
  board.show();
  runs++;
  const ghostRun = loadGhost(ghostStore(), 'kart-ulrum', KEYS.ghosts);
  game = { ghostRun, rec: createRecorder(), t: 0, phase: 'grid', karts, raceT: 0, flash: null, cam: null, camA: karts[0].a, said: 0, lights: 0, result: null, finishAt: 0, hits: 0, outro: 0, lastLap: -1, boostFx: 0, exit: { ...STAND }, gapSay: 0 };
  syncKarts(w, 0);
  w.companionHold = { x: STAND.x + 2, y: STAND.y + 1, face: ROT };
  showCard(w, { kind: 'tip', kicker: 'Karten in Ulrum', title: 'Drie ronden, drie rijders', body: '[W] gas, [S] rem, [A] [D] sturen. Houd [Spatie] (handrem) in een bocht voor een drift: een lange drift geeft een versnelling.', duration: 10, key: 'kart-help', voice: false });
  say(w, 'start', true);
  return true;
}

// --- racing against other players (#443) -------------------------------------------------------------------------
// The host runs the whole race (coopwedstrijd.js tikRace on the same TRACK, fed with the guests' sticks) and draws it as the solo race;
// a guest draws the host's snapshots (maakSpiegel) with his own kart first. `game` is that race object, so syncKarts, camera and the
// board work unchanged on it. Nothing else of the host's world is touched: the track is a clear zone, the riders are meshes of this module.

function riderLook(k) {
  if (k.mens && (k.char === 'tammo' || k.char === 'anita')) { const a = k.char === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE; return [a.shirt, a.skin, a]; }
  const f = k.mens ? figuurLook(k.char) : null;
  if (f) return [f.shirt, f.skin, f.opts];
  const l = { shirt: k.shirt ?? 0x6a5a48, skin: 0xe2b48c, variant: k.variant || 'male', seed: 6500 + String(k.name).length, look: { age: k.age || 'adult', hat: null, bag: null, umbrella: null } };
  return [l.shirt, l.skin, l];
}

function seatRiders(g) {
  g.karts.forEach((k, i) => {
    const [shirt, skin, opts] = riderLook(k);
    const bk = built.karts[i];
    bk.rider = buildPersonMesh(shirt, skin, opts);
    seatPerson(bk.rider, true);
    getScene().add(bk.rider);
    bk.mesh.visible = true;
  });
}

function beginOnline(w, g, kind) {
  Object.assign(g, { online: kind, cam: null, camA: g.karts[0].a, flash: null, said: 0, gapSay: 0, boostFx: 0, ghostRun: null, rec: null, exit: { ...STAND }, finishAt: g.finishAt ?? 0 });
  seatRiders(g);
  w.cinematicHidePlayers = true;
  ensureBoard();
  board.show();
  game = g;
  syncKarts(w, 0);
  runs++;
}

// the host: the invitation is answered, the race object is ready (coopwedstrijd.js begin)
function startOnline(w, race) {
  if (game || activityBlock(w)) return false;
  if (!built) built = buildTrackScene();
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  race.karts[0].player = true;
  race.uit = { ...STAND }; // where a guest who stops or finishes is put back
  beginOnline(w, race, 'host');
  w.companionHold = { x: STAND.x + 2, y: STAND.y + 1, face: ROT };
  showCard(w, { kind: 'tip', kicker: 'Karten in Ulrum', title: 'Drie ronden tegen elkaar', body: '[W] gas, [S] rem, [A] [D] sturen. Houd [Spatie] (handrem) in een bocht voor een drift: een lange drift geeft een versnelling. Iedereen rijdt dezelfde kart op dezelfde baan.', duration: 10, key: 'kart-help', v: 1 });
  return true;
}

// a guest: the host started the race and this guest said yes
function gastStart(w, st, spiegel) {
  if (game) return false;
  if (!built) built = buildTrackScene();
  beginOnline(w, spiegel, 'gast');
  return true;
}

// the guest's body belongs to the host's world; his race screen runs next to it, fed by the snapshots
function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  updateOnline(w, dt);
  if (game) { updateEngine(w); updateHud(); }
  return true;
}

function updateOnline(w, dt) {
  const g = game;
  const gast = g.online === 'gast';
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (gast && (!w.coopNet || w.coopRole !== 'client')) { wedGastReset(w); end(w, { quit: true }); return; } // the connection is gone
  if (stopPressed(w.input)) {
    if (gast) wedGastVerlaat(w); // the kart drives on under the AI; the others race on
    end(w, { quit: true });
    return;
  }
  if (gast && g.buf.length && g.klok - g.buf[g.buf.length - 1].tl > 1.5) g.flash = { text: 'Even wachten: de verbinding haperde of het spel staat stil', t: 0.5, bad: true }; // no snapshots for a moment
  const ev = gast ? tikSpiegel(g, dt, () => playerInput(w.input)) : wedRaceTik(w, g, dt, () => playerInput(w.input));
  let klaar = false;
  for (const e of ev) {
    if (e.type === 'lights') { pushAudioEvent(w, { kind: 'bell', x: STAND.x, y: STAND.y }); if (!gast && e.n === 1) say(w, 'lights', true); }
    else if (e.type === 'go') { pushAudioEvent(w, { kind: 'bell', x: STAND.x, y: STAND.y }); g.flash = { text: 'GO!', t: 1.4 }; if (!gast) say(w, 'go', true); }
    else if (e.type === 'lap' && e.i === 0) { g.flash = { text: `Ronde ${e.lap}: ${fmtTime(e.time)}`, t: 2.4 }; if (!gast && e.lap === LAPS - 1) say(w, 'last'); }
    else if (e.type === 'wall' && e.i === 0) pushAudioEvent(w, { kind: 'prop_hit', material: 'wood', strength: clamp(e.speed / 8, 0.2, 1), x: ORIGIN.x, y: ORIGIN.y });
    else if (e.type === 'boost' && e.i === 0) g.flash = { text: e.lvl === 2 ? 'SUPERBOOST!' : 'BOOST!', t: 1.2 };
    else if (e.type === 'klaar') klaar = true;
  }
  if (klaar && !gast) { end(w); return; }
  syncKarts(w, dt);
  if (!gast) {
    const me = g.karts[0], q = FR.toW(me.u, me.v), p = w.player;
    p.x = q.x; p.y = q.y; p.angle = ROT + me.a; p.speed = 0; p.moving = false; p.vx = 0; p.vy = 0;
  }
}

// the host ends the race: the results go to the guests (and their prizes to their own wallets), the host's own prize is paid here
function endOnlineHost(w, g, quit) {
  const res = wedHostEind(w, g, { gestopt: quit });
  if (quit) { w.addMessage('Karten gestopt', 2.5); return; }
  const rijen = res ? res.rijen : eindstand(g);
  const jij = res && res.jij ? res.jij : { plek: 1 + rijen.findIndex((x) => x.slot === 0), ...beloning(rijen.find((x) => x.slot === 0)) };
  const me = g.karts[0];
  loopbaanVerdien(w, 'race', jij.geld, { xp: jij.xp, n: 1, uniek: 'kart', deel: false }); // the prize is per place, the guests get theirs from wedHostEind
  recordStat(w, 'kartRaces');
  if (me.finished) unlockAchievement(w, 'kart_klaar');
  if (me.finished && jij.plek === 1) unlockAchievement(w, 'kart_goud');
  if (jij.geld > 0) w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4);
  if (!res) w.addMessage(me.finished ? `Je werd ${jij.plek}e op de kartbaan` : 'Je haalde de finish niet', 4); // no session left: no results card
}

// the guest: the host stopped the race or the results came in
function gastEind(w, uit) {
  if (game && game.online === 'gast') end(w, { quit: !!uit.gestopt });
  if (uit.gestopt && w.addMessage) w.addMessage('De race is gestopt.', 3);
}

registreerWedstrijd('kartbaan', { naam: 'Karten in Ulrum', start: startOnline, solo: (w) => start(w) });
zetWedGastHaken('kartbaan', { start: gastStart, eind: gastEind, tik: gastTik });

// --- the race ----------------------------------------------------------------------------------------------------

function playerInput(input) {
  const gas = input.isDown('w') || input.isDown('arrowup') || input.mouse.down;
  const brake = input.isDown('s') || input.isDown('arrowdown') || input.mouse.rightDown;
  const steer = (input.isDown('d') || input.isDown('arrowright') ? 1 : 0) - (input.isDown('a') || input.isDown('arrowleft') ? 1 : 0);
  return { throttle: gas ? 1 : brake ? -1 : 0, steer, drift: input.isDown(' ') };
}

function updateGame(w, dt) {
  const g = game;
  if (g.online) { updateOnline(w, dt); return; }
  const input = w.input;
  g.t += dt;
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  if (stopPressed(input)) { end(w, { quit: true }); return; }
  const T = TRACK;
  const ks = g.karts;
  const me = ks[0];
  // the start sequence
  if (g.phase === 'grid') {
    const n = LIGHTS_AT.filter((a) => g.t >= a).length;
    if (n !== g.lights) {
      g.lights = n;
      pushAudioEvent(w, { kind: 'bell', x: STAND.x, y: STAND.y });
      if (n === 1) say(w, 'lights', true);
    }
    if (g.t >= GO_AT) {
      g.phase = 'race';
      g.raceT = 0;
      g.lights = 4;
      for (const k of ks) { k.lapStart = 0; }
      pushAudioEvent(w, { kind: 'bell', x: STAND.x, y: STAND.y });
      g.flash = { text: 'GO!', t: 1.4 };
      say(w, 'go', true);
    }
  } else g.raceT += dt;
  const racing = g.phase === 'race' || g.phase === 'finish';
  const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    for (const k of ks) {
      let inp = { throttle: 0, steer: 0, drift: false };
      if (racing) {
        if (k.player && !k.finished) inp = playerInput(input);
        else if (k.finished) inp = aiInput(k, T, { skill: 0.55, others: ks, dt: h });
        else {
          const gap = k.prog - me.prog;
          const band = gap > 45 ? 0.96 : gap < -45 ? 1.04 : 1;
          inp = aiInput(k, T, { band, others: ks, dt: h });
        }
      }
      const ev = stepKart(k, inp, h, T);
      if (k.player) {
        for (const e of ev) {
          if (e.type === 'wall') { pushAudioEvent(w, { kind: 'prop_hit', material: 'wood', strength: clamp(e.speed / 8, 0.2, 1), x: ORIGIN.x, y: ORIGIN.y }); if (e.speed > 4) say(w, 'wall'); }
          if (e.type === 'boost') { g.flash = { text: e.lvl === 2 ? 'SUPERBOOST!' : 'BOOST!', t: 1.2 }; say(w, 'boost'); }
        }
      }
      if (racing) {
        const lap = updateProgress(k, T, g.raceT);
        if (lap && k.player) {
          g.flash = { text: `Ronde ${lap.lap}: ${fmtTime(lap.time)}`, t: 2.4 };
          if (lap.lap === LAPS - 1) say(w, 'last');
        }
        if (lap && k.finished && k.player && g.phase === 'race') { g.phase = 'finish'; g.finishAt = g.raceT; }
      }
    }
    if (g.phase === 'race' && !me.finished) recordGhost(g.rec, g.raceT, me.u, me.v, me.a);
    const hits = collideKarts(ks);
    if (hits) { g.hits += hits; if (hits && g.t - g.gapSay > 3) { g.gapSay = g.t; rivalSay(w, ks); } }
  }
  // the race ends a few seconds after you cross the line (or at the cap)
  if (g.phase === 'finish') {
    if (ks.every((k) => k.finished) || g.raceT - g.finishAt > FINISH_WAIT) {
      g.phase = 'outro';
      g.outro = OUTRO;
      g.result = rankKarts(ks);
    }
  } else if (g.phase === 'race' && g.raceT > RACE_CAP) {
    g.phase = 'outro';
    g.outro = 2;
    g.result = rankKarts(ks);
  } else if (g.phase === 'outro') {
    g.outro -= dt;
    if (g.outro <= 0) { end(w); return; }
  }
  syncKarts(w, dt);
  const p = w.player;
  const q = FR.toW(me.u, me.v);
  p.x = q.x; p.y = q.y; p.angle = ROT + me.a; p.speed = 0; p.moving = false; p.vx = 0; p.vy = 0;
}

function rivalSay(w, ks) {
  const g = game;
  for (let i = 1; i < ks.length; i++) {
    const k = ks[i];
    if (k.hit > 0.2 && Math.random() < 0.7) {
      const r = KART_RIVALS[i - 1];
      const q = FR.toW(k.u, k.v);
      bubble(w, { x: q.x, y: q.y, name: r.name, text: pick(Math.hypot(k.u - ks[0].u, k.v - ks[0].v) < 3 ? r.hit : r.hitBy), female: r.variant === 'female', h: 1.9, tag: 'kartbaan', ttl: 2.4 });
      return;
    }
  }
}

function end(w, { quit = false } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.cinematicHidePlayers = false;
  w.cameraOverride = null;
  w.companionHold = null;
  if (board) board.hide();
  clearBubbles(w, 'kartbaan');
  stopEngine();
  if (built) {
    built.ghost.mesh.visible = false;
    built.karts.forEach((k) => {
      k.mesh.visible = false;
      if (k.rider) {
        getScene().remove(k.rider);
        k.rider.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } });
        k.rider = null;
      }
    });
    for (const l of built.lamps) l.material = materials().lampOff;
  }
  if (g.online === 'gast') return; // a guest's body belongs to the host's world: nothing to put back (#443)
  const p = w.player;
  p.x = g.exit.x; p.y = g.exit.y; p.angle = ROT; p.vx = p.vy = 0;
  if (g.online) { endOnlineHost(w, g, quit); return; }
  if (quit) { w.addMessage('Karten gestopt', 2.5); return; }
  const rank = g.result || rankKarts(g.karts);
  const me = g.karts[0];
  const pos = rank.indexOf(me) + 1;
  const medal = me.finished ? positionMedal(pos) : 0;
  const total = me.finished ? me.finishT : null;
  const lap = bestLap(me);
  let newBest = false;
  if (total != null) {
    const rec = recordChallengeResult(w, 'kart-race', { value: total, medal, lower: true });
    newBest = !!(rec && rec.newBest);
  }
  if (total != null && saveGhost(ghostStore(), 'kart-ulrum', finishGhost(g.rec, total), KEYS.ghosts)) w.addMessage('Je beste race is bewaard: de spookkart rijdt hem de volgende keer mee', 4);
  if (lap != null) recordChallengeResult(w, 'kart-lap', { value: lap, medal: 0, lower: true });
  recordStat(w, 'kartRaces');
  const premie = loopbaanVerdien(w, 'race', me.finished ? ([0, 30, 20, 12, 6][pos] || 0) : 0, { xp: me.finished ? 16 - pos * 2 : 6, n: 1, uniek: 'kart' }); // loopbaan (#381)
  if (me.finished) unlockAchievement(w, 'kart_klaar');
  if (medal >= 3) unlockAchievement(w, 'kart_goud');
  if (lap != null && lap <= LAP_SNEL) unlockAchievement(w, 'kart_snel');
  const stats = [['Positie', me.finished ? `${pos} van 4` : 'niet gefinisht'], ['Racetijd', total != null ? fmtTime(total) : '-'], ['Beste ronde', lap != null ? fmtTime(lap) : '-'], ['Drifts', String(me.drifts)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (newBest) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: medal ? 'pass' : 'fail', title: pos === 1 && me.finished ? 'EERSTE OP DE KARTBAAN' : medal ? 'OP HET PODIUM' : 'NOG EEN RONDJE?', reason: medal ? '' : 'Drift de lange bochten voor een versnelling en rij schoon: de banden zijn zacht, maar de muur hard', reward: premie, stats });
  say(w, pos === 1 ? 'win' : medal ? 'podium' : 'poor', true, true);
}

function say(w, kind, force = false, after = false) {
  const list = KART_LINES[kind];
  if (!list || !built) return;
  const g = game;
  if (g && !force && g.t - g.said < 7) return;
  if (g) g.said = g.t;
  bubble(w, { x: built.wubbePos.x, y: built.wubbePos.y, name: KART_LINES.who, text: pick(list), h: 2.1, tag: 'kartbaan', ttl: after ? 4 : 0 });
}

// --- 3D, camera, sound and HUD per frame -------------------------------------------------------------------------

function syncKarts(w, dt) {
  const g = game;
  if (!g || !built) return;
  const sp = g.phase === 'race' || g.phase === 'finish';
  g.karts.forEach((k, i) => {
    const bk = built.karts[i];
    const q = FR.toW(k.u, k.v);
    const heading = ROT + k.a;
    // the body turns a little further than the wheels travel while you drift
    const slip = Math.atan2(k.l, Math.max(1, Math.abs(k.f)));
    bk.mesh.position.set(q.x, 0.03, q.y);
    bk.mesh.rotation.set(0, -(heading), 0);
    bk.mesh.rotateZ(clamp(-k.yaw * 0.02 * Math.min(1, Math.abs(k.f) / 12), -0.06, 0.06));
    const steerA = clamp(k.yaw * 0.28, -0.45, 0.45);
    for (const wh of bk.mesh.userData.wheels) {
      wh.hub.rotation.y = wh.front ? -steerA : 0;
      wh.hub.children[0].rotation.z += (k.f / wh.r) * dt;
    }
    if (bk.rider) {
      const c = Math.cos(heading), s = Math.sin(heading);
      bk.rider.position.set(q.x - c * 0.22, seatedY(bk.rider, 0.34), q.y - s * 0.22);
      bk.rider.rotation.y = -heading;
    }
    if (sp && dt > 0) {
      // smoke and sparks
      if (k.drift && Math.abs(k.f) > 6 && Math.random() < dt * 24) {
        const bx = q.x - Math.cos(heading) * 0.8, by = q.y - Math.sin(heading) * 0.8;
        spawnFxPuff(bx, 0.15, by, (Math.random() - 0.5) * 1.2, 0.5, (Math.random() - 0.5) * 1.2, 0.9, 0.2, 1.2, 0.85, 0.85, 0.82, 0.45, 1.6, 0.2);
      }
      if (k.boostT > 0 && Math.random() < dt * 40) spawnFxSpark(q.x - Math.cos(heading) * 1, 0.3, q.y - Math.sin(heading) * 1, -Math.cos(heading) * 3, 0.6, -Math.sin(heading) * 3, 0.3);
      if (k.bump > 0.1 && Math.random() < dt * 30) spawnFxSpark(q.x, 0.4, q.y, (Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3, 0.3);
    }
  });
  // the ghost drives your best race alongside you until its recording ends
  const gp = sp && g.ghostRun ? ghostAt(g.ghostRun, g.raceT) : null;
  built.ghost.mesh.visible = !!gp;
  if (gp) {
    const gq = FR.toW(gp.x, gp.y);
    built.ghost.mesh.position.set(gq.x, 0.03, gq.y);
    built.ghost.mesh.rotation.set(0, -(ROT + gp.a), 0);
  }
  // start lights
  built.lamps.forEach((l, i) => { l.material = g.phase === 'grid' ? (i < g.lights ? materials().lampRed : materials().lampOff) : g.t < GO_AT + 1.2 ? materials().lampGreen : materials().lampOff; });
  animatePersonWalk(built.wubbe, 0, dt);
}

function updateEngine(w) {
  const o = ambientOut();
  const g = game;
  const run = !!(g && o && !w.paused);
  if (!run) { if (engine && o) engine.gain.gain.setTargetAtTime(0, o.ctx.currentTime, 0.1); return; }
  if (!engine) {
    const osc = o.ctx.createOscillator();
    osc.type = 'sawtooth';
    const osc2 = o.ctx.createOscillator();
    osc2.type = 'square';
    const lp = o.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const gain = o.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(lp); osc2.connect(lp); lp.connect(gain); gain.connect(o.bus);
    osc.start(); osc2.start();
    engine = { osc, osc2, lp, gain };
  }
  const me = g.karts[0];
  const sp = Math.abs(me.f);
  const racing = g.phase !== 'grid';
  const throttle = racing && (w.input.isDown('w') || w.input.isDown('arrowup') || w.input.mouse.down);
  const f = 70 + sp * 4.2 + (throttle ? 22 : 0) + (me.boostT > 0 ? 30 : 0);
  const t = o.ctx.currentTime;
  engine.osc.frequency.setTargetAtTime(f, t, 0.05);
  engine.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
  engine.lp.frequency.setTargetAtTime(500 + sp * 40 + (throttle ? 400 : 0), t, 0.1);
  engine.gain.gain.setTargetAtTime(0.045 + (throttle ? 0.03 : 0), t, 0.1);
}

function stopEngine() {
  const o = ambientOut();
  if (engine && o) engine.gain.gain.setTargetAtTime(0, o.ctx.currentTime, 0.05);
}

function camera(w) {
  const g = game;
  if (!g) return;
  const me = g.karts[0];
  const q = FR.toW(me.u, me.v);
  let pos, at, fov = 66;
  if (g.phase === 'grid') {
    // a slow swing from in front of the grid down to the back of your kart
    const k = clamp(g.t / GO_AT, 0, 1);
    const a = ROT + me.a;
    const e = k * k * (3 - 2 * k);
    const ang = a + Math.PI * (1 - e) * 0.8;
    const dist = 11 - 4.6 * e;
    pos = { x: q.x - Math.cos(ang) * dist, y: q.y - Math.sin(ang) * dist, z: 6 - 3.6 * e };
    at = { x: q.x + Math.cos(a) * 3 * e, y: q.y + Math.sin(a) * 3 * e, z: 0.6 };
  } else {
    g.camA += angDiff(me.a, g.camA) * Math.min(1, 0.08 + Math.abs(me.f) * 0.004);
    const a = ROT + g.camA;
    const back = 5.6 + Math.abs(me.f) * 0.06;
    pos = { x: q.x - Math.cos(a) * back, y: q.y - Math.sin(a) * back, z: 2.4 + Math.abs(me.f) * 0.02 };
    at = { x: q.x + Math.cos(a) * 5, y: q.y + Math.sin(a) * 5, z: 0.7 };
    fov = 64 + Math.min(14, Math.abs(me.f) * 0.5) + (me.boostT > 0 ? 8 : 0);
  }
  const c = easeCamera(g, pos, at, g.phase === 'grid' ? 0.2 : 0.2);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov, cut: true };
}

function ensureBoard() {
  if (!board) board = createBoard('KARTEN IN ULRUM', ACCENT);
  return board;
}

const ordinal = (n) => `${n}e`;

function updateHud() {
  const g = game;
  if (!g || !board) return;
  const me = g.karts[0];
  const rank = rankKarts(g.karts);
  const pos = rank.indexOf(me) + 1;
  const lap = Math.min(LAPS, Math.max(1, Math.floor(me.prog / TRACK.length) + 1));
  const t = g.phase === 'grid' ? 0 : me.finished ? me.finishT : g.raceT;
  const best = bestLap(me);
  const kmh = Math.round(Math.abs(me.f) * 3.6);
  const row = `<span>Ronde <b>${lap}</b>/${LAPS}</span><span>Plaats <b>${pos}</b>/4</span><span>Tijd <b>${fmtTime(t)}</b></span><span><b>${kmh}</b> km/u</span>${best != null ? `<span>Beste <b>${fmtTime(best)}</b></span>` : ''}`;
  let flash = g.flash ? g.flash.text : g.phase === 'grid' ? (g.lights ? 'Startlichten...' : 'Rijders, op uw plaatsen') : me.finished ? `Gefinisht als ${ordinal(pos)}` : me.drift ? 'Drift...' : '';
  const meter = me.drift ? { v: me.driftT / KART.charge2, mark: KART.charge1 / KART.charge2, color: me.driftT >= KART.charge2 ? '#ff7a2a' : me.driftT >= KART.charge1 ? '#4aa8ff' : '#f2f0e6' } : null;
  const help = `${key('W')} gas · ${key('S')} rem · ${key('A')}${key('D')} sturen · houd ${key('SPATIE')} (handrem) in een bocht voor een drift · ${key('BACKSPACE')} stoppen`;
  const cells = g.online ? rank.map((k, i) => ({ t: `${i + 1}. ${k.name}${k.finished ? ' ✓' : ''}`, cls: k === me ? 'on' : '' })) : null; // the live standings against the others (#443)
  board.set({ row, meter, flash, bad: !!(g.flash && g.flash.bad), help, ...(cells ? { cells } : null) });
}

// Read-only race state for the map layer (missionmap.js): the track in world
// coordinates, four sector gates, the karts and the lap; null outside a race.
let kartLine = null;
let kartIdeal = null;
export function getKartMapState() {
  const g = game;
  if (!g) return null;
  if (!kartLine) kartLine = Array.from({ length: Math.ceil(TRACK.N / 8) }, (_, i) => { const j = i * 8; const q = FR.toW(TRACK.u[j], TRACK.v[j]); return [q.x, q.y]; });
  // the ideal line: every 8th point of the track, moved to the inside of the bends
  if (!kartIdeal) kartIdeal = racingLine(Array.from({ length: Math.ceil(TRACK.N / 8) }, (_, i) => [TRACK.u[i * 8], TRACK.v[i * 8]]), WIDTH).map(([u, v]) => { const q = FR.toW(u, v); return [q.x, q.y]; });
  const me = g.karts[0];
  const at = (s) => { const p = pointAt(TRACK, s); return FR.toW(p.x, p.y); };
  const lapPos = ((me.prog % TRACK.length) + TRACK.length) % TRACK.length;
  const gates = [0, 1, 2, 3].map((i) => (i * TRACK.length) / 4);
  const next = gates.findIndex((gs) => gs > lapPos);
  const rank = rankKarts(g.karts);
  return {
    line: kartLine,
    ideal: kartIdeal,
    checkpoints: gates.map((gs) => at(gs)),
    nextCheckpoint: next < 0 ? 0 : next,
    karts: g.karts.map((k) => { const q = FR.toW(k.u, k.v); return { x: q.x, y: q.y, name: k.name, player: !!k.player, lap: Math.min(LAPS, Math.floor(k.prog / TRACK.length) + 1) }; }),
    lap: Math.max(0, Math.floor(me.prog / TRACK.length)),
    laps: LAPS,
    lapTime: g.phase === 'grid' ? 0 : g.raceT - me.lapStart,
    bestLap: bestLap(me),
    position: rank.indexOf(me) + 1,
  };
}

// --- the activity ---------------------------------------------------------------------------------------------------

export const KARTBAAN = {
  id: 'kartbaan',
  layer: 'kartbaan',
  legend: { kind: 'act-kartbaan', label: 'Kartbaan', note: 'karten in Ulrum: drie ronden tegen drie rijders' },
  init(w) {
    window.__kartbaan = {
      spot: () => ({ ...STAND }),
      track: () => ({ length: TRACK.length, origin: { ...ORIGIN }, rot: ROT, n: TRACK.N }),
      start: (force = true) => start(w, { force }),
      state: () => (game ? { phase: game.phase, raceT: game.raceT, lights: game.lights, karts: game.karts.map((k) => ({ name: k.name, prog: k.prog, lap: k.lap, f: k.f, off: k.off, finished: k.finished, bumps: k.bumps })) } : null),
      // run the race to its end straight away: everyone finishes (tests)
      finish: () => { if (!game) return false; if (game.phase === 'grid') game.t = GO_AT; for (const k of game.karts) { k.prog = TRACK.length * LAPS + 1; k.lapTimes = [30, 30, 30]; k.finished = true; k.finishT = 95 + k.i; } game.phase = 'finish'; game.finishAt = game.raceT - FINISH_WAIT - 1; return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
      kart: (i = 0) => (game ? game.karts[i] : null), // the kart objects, for the bots of the tests (#443)
      online: () => (game ? game.online || null : null),
    };
  },
  spots: () => [{ id: 'kartbaan', name: 'Kartbaan Ulrum', x: STAND.x, y: STAND.y }],
  prompt,
  secondary,
  interact,
  active: () => !!game,
  quit: (w) => end(w, { quit: true }),
  update(dt, w) {
    if (!game) return;
    if (w.pendingRespawn) { end(w, { quit: true }); return; }
    updateGame(w, dt);
  },
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
    if (built && game) { updateEngine(w); }
    else if (engine) updateEngine(w);
    updateHud();
  },
  camera,
  icon: drawIcon,
  mapSub: () => recText() || 'Karten in Ulrum: drie ronden tegen drie rijders',
  ubbo(w) {
    const d = Math.hypot(STAND.x - w.player.x, STAND.y - w.player.y);
    const rec = getChallengeRecord('kart-race');
    return { name: 'Karten in Ulrum', sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : 'drie ronden, gratis', dist: d, x: STAND.x, y: STAND.y, play: 'kartbaan', where: 'de kartbaan in Ulrum', hint: 'loop naar de kassa en druk E' };
  },
  runs: () => runs,
};
