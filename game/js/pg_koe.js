import { hoofdspeler } from './players.js';
import { Vehicle, makeTwoWheeler } from './vehicle.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { buildPersonMesh, seatPerson, animatePersonWalk } from './models3d_people.js';
import { buildCowMesh3D } from './wildlife.js';
import { DURK_LOOK, DOUWE_LOOK } from './storycast.js';
import { getScene } from './scene3d.js';
import { boxOf, pushOutOfBuildings, roadNear, roadKind, withTiles } from './tileplace.js';
import { urbanWeight } from './provinceworld.js';
import { findOpenSpot, placeNamed } from './ommelandplace.js';
import { buildProp, disposeProp, animateProp, personMesh, sitDown } from './ommelandprops3d.js';
import { speak, duoSpeaker } from './ommelandtalk.js';
import { finish, say, setTarget, isPostgameOpen } from './pghost.js';
import { playCinematic, isCinematicActive } from './cinematics.js';
import { startCall } from './phonefeed.js';
import { getChallengeRecord } from './achievements.js';
import { KOE_LINES, KOE_WHO, KOE_CALL } from './ommelandlines.js';

// De Koe van Ome Jan (post-game, postgame.js challenge def): Durk and Douwe
// have taken Ome Jan's prize cow Geertje to a barn a few fields away, to show
// her at the keuring in Ljouwert "foar Jelle". One loop of about three
// minutes: drive to the barn, untie her with E (on foot or from the car), and
// drive her home while the twins chase you in Jelle's trekker-limo. Geertje
// keeps up with whatever you drive; walk off and she just waits for you.
// Ramming the trekker stalls it (three rams and it gives up), and after
// DITCH_AT seconds of chasing it ends up in a ditch anyway. Only a trekker
// that stays on her heels for a long while gets her back. Medal by time from
// leaving the farm to Geertje back in the yard.

const COW_MAX = 9.5, COW_ACC = 9, COW_LOST = 140;
const TRACTOR = { name: 'trekkerlimo', len: 5.6, wid: 2.0, maxSpeed: 9.2, accel: 3.6, brake: 10, turnRate: 1.9, color: '#1b1c1f' };
const GRAB_R = 6, GRAB_UP = 9, GRAB_DOWN = 14, RAM_STALL = 6, RAMS_TO_BREAK = 3, PANIC = 1.2;
const HOME_R = 16, LIMIT = 420, HEAD_START = 6, DITCH_AT = 55, UNTIE_FOOT = 3.2, UNTIE_CAR = 9;

let sites = null;
let yard = null;
let current = null;

// --- where ---------------------------------------------------------------------------

// The barns and sheds of the tiles between r0 and r1 from (x, y), in a fixed
// order: { b, d, x, y (centre), m: { long, short } }.
const BARN_TAGS = new Set(['barn', 'farm_auxiliary', 'cowshed', 'stable', 'garage', 'garages', 'shed', 'carport', 'industrial', 'warehouse']);
function barnsAround(map, x, y, r0, r1, pred) {
  const out = [];
  for (const b of map.buildingsNear(x, y, r1)) {
    if (!BARN_TAGS.has(b.type)) continue;
    const q = boxOf(b);
    const d = Math.hypot(q.x - x, q.y - y);
    if (d < r0 || d > r1) continue;
    const m = { long: Math.max(q.w, q.l), short: Math.min(q.w, q.l) };
    if (pred && !pred(q, d, m)) continue;
    out.push({ b, d, x: q.x, y: q.y, m });
  }
  return out.sort((a, b) => a.x - b.x || a.y - b.y);
}

// Open ground beside a building (its long side), within reach of (tx, ty).
function besideBuilding(map, b, towards, opts) {
  const a0 = Math.atan2(towards.y - b.y, towards.x - b.x);
  return findOpenSpot(map, b.x, b.y, { rMin: b.m.short / 2 + 6, rMax: b.m.long / 2 + 22, a0, spread: 1.2, step: 3, opts });
}

function findSites(map) {
  const tb = placeNamed('Ten Boer');
  if (!tb) return null;
  // Ome Jan: a farm with a barn 0.5-1.7 km out of Ten Boer, his yard gate on the road side
  let farm = null, best = Infinity;
  for (const b of barnsAround(map, tb.x, tb.y, 500, 1700, (q) => urbanWeight(q.x, q.y) < 0.12)) {
    const road = roadNear(map, b.x, b.y, 70, (r) => roadKind(r) > 0);
    if (!road || roadKind(road.road) > 6) continue;
    const q = besideBuilding(map, b, road, { r: 3.2, road: 1 });
    if (!q) continue;
    const score = Math.abs(b.d - 950);
    if (score < best) { best = score; farm = { x: q.x, y: q.y, b, a: Math.atan2(road.y - q.y, road.x - q.x) }; }
  }
  if (!farm) return null;
  // the twins' barn: a few fields on, about a minute's drive (0.35-0.9 km), not on the road
  let hide = null;
  best = Infinity;
  for (const b of barnsAround(map, farm.x, farm.y, 350, 900, (q) => urbanWeight(q.x, q.y) < 0.08)) {
    const road = roadNear(map, b.x, b.y, 45, (r) => roadKind(r) > 0);
    if (road && road.d < 12) continue;
    const q = besideBuilding(map, b, farm, { r: 5, road: 8 });
    if (!q) continue;
    const score = Math.abs(b.d - 600) - (road ? 60 : 0);
    if (score < best) { best = score; hide = { x: q.x, y: q.y, b, a: Math.atan2(farm.y - q.y, farm.x - q.x) }; }
  }
  if (!hide) return null;
  return { farm, hide, dist: Math.hypot(hide.x - farm.x, hide.y - farm.y) };
}

// The sites are picked from the tiles round Ten Boer (the farm lies up to 1.7 km
// out, the barn up to 0.9 km beyond it): found once those are in, in the
// background from the start (prepareKoeSites). null until then.
function ensureSites(map) {
  return sites || null;
}

export async function prepareKoeSites(map) {
  if (sites !== null) return sites || null;
  const tb = placeNamed('Ten Boer');
  if (!tb) return null;
  await withTiles(map, [[tb.x, tb.y]], () => { if (sites === null) sites = findSites(map) || false; }, { radius: 2700, token: 'koe', slice: 6 });
  return sites || null;
}

export function getKoeSites(map) {
  return ensureSites(map);
}

// debug (window.__ommeland.koeCow): put Geertje somewhere
export function koeCowTo(x, y) {
  const c = current && current.data.cow;
  if (!c) return false;
  c.x = x; c.y = y;
  return true;
}

// --- the yard: Ome Jan at his gate (and Geertje, once she's home) ----------------------

function buildYard(w, S) {
  const f = S.farm;
  const prop = buildProp('erf', {});
  prop.group.position.set(f.x, 0, f.y);
  prop.group.rotation.y = -f.a;
  getScene().add(prop.group);
  const jan = personMesh('omejan');
  const jx = f.x + Math.cos(f.a + 1.6) * 2.2, jy = f.y + Math.sin(f.a + 1.6) * 2.2;
  jan.position.set(jx, 0, jy);
  jan.rotation.y = -f.a;
  getScene().add(jan);
  yard = { prop, jan, jx, jy, greetAt: -99, cow: null };
}

function dropYard() {
  if (!yard) return;
  disposeProp(yard.prop);
  yard.jan.removeFromParent();
  yard.jan.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } });
  if (yard.cow) yard.cow.removeFromParent();
  yard = null;
}

function idleYard(w, dt) {
  const S = sites;
  if (!S || !isPostgameOpen()) { dropYard(); return; }
  const p = hoofdspeler(w);
  const d = Math.hypot(S.farm.x - p.x, S.farm.y - p.y);
  if (!yard && d < 220) buildYard(w, S);
  else if (yard && d > 320) { dropYard(); return; }
  if (!yard) return;
  animatePersonWalk(yard.jan, 0, dt);
  const rec = getChallengeRecord('koe');
  const home = !!(rec && rec.medal) && !w.challenge;
  if (home && !yard.cow) {
    yard.cow = buildCowMesh3D(0.61);
    yard.cow.position.set(S.farm.x + Math.cos(S.farm.a + Math.PI) * 6, 0, S.farm.y + Math.sin(S.farm.a + Math.PI) * 6);
    yard.cow.rotation.y = -S.farm.a;
    getScene().add(yard.cow);
  }
  if (!w.challenge && !p.inVehicle && d < 10 && w.time - yard.greetAt > 50 && !isCinematicActive()) {
    yard.greetAt = w.time;
    const list = home ? KOE_LINES.thanks : KOE_LINES.greet;
    speak(w, KOE_WHO.J, list[Math.floor(Math.random() * list.length)], { x: yard.jx, y: yard.jy });
  }
}

// --- the run ---------------------------------------------------------------------------

const lineOf = ([k, text]) => ({ speaker: KOE_WHO[k], text });

function sayKey(run, [k, text], prio = true) {
  return say(run, KOE_WHO[k], text, prio);
}

function sayDuo(run, list, prio = false) {
  const t = list[Math.floor(Math.random() * list.length)];
  return say(run, duoSpeaker(run.world).name, t, prio);
}

function playScene(run, id, lines, center, onEnd) {
  let at = 0.6;
  const L = lines.map((l) => {
    const o = lineOf(l);
    const dur = Math.max(2.2, Math.min(5.5, 1 + o.text.length * 0.055));
    const out = { ...o, at, dur };
    at += dur + 0.25;
    return out;
  });
  const a0 = center.a + 0.9;
  return playCinematic({
    id, priority: 2, duration: at + 0.4, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker: id === 'koe-intro' ? 'Na het verhaal' : 'Geertje is thuis', title: KOE.name, cardFor: 2.4, lines: L,
    shot: (u) => {
      const a = a0 + u * 0.6;
      return { position: { x: center.x + Math.cos(a) * 8, y: center.y + Math.sin(a) * 8, z: 2.8 }, lookAt: { x: center.x, y: center.y, z: 1.4 }, fov: 50 };
    },
    onEnd,
  });
}

function twinFigure(look, x, y, a, seat = 0) {
  const m = buildPersonMesh(look.shirt, look.skin, look);
  m.position.set(x, 0, y);
  m.rotation.y = -a;
  if (seat) sitDown(m, seat);
  getScene().add(m);
  return m;
}

function freeFigure(m) {
  if (!m) return;
  m.removeFromParent();
  m.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } });
}

// Durk behind the wheel of the trekker-limo, Douwe on its roof
function crewTractor(d) {
  const mesh = getVehicleMesh(d.tractor.id);
  if (!mesh || mesh.userData.omCrew) return;
  const body = mesh.userData.body || mesh;
  // scene3d seats a generic driver once the trekker is near; Durk takes his place
  const df = mesh.userData.driverFigure;
  if (!df) return;
  const durk = buildPersonMesh(DURK_LOOK.shirt, DURK_LOOK.skin, DURK_LOOK);
  seatPerson(durk, true);
  durk.position.copy(df.position);
  durk.rotation.copy(df.rotation);
  durk.visible = df.visible;
  df.removeFromParent();
  df.traverse((o) => { if (o.isSkinnedMesh) { o.geometry.dispose(); if (o.skeleton) o.skeleton.dispose(); } });
  mesh.userData.driverFigure = durk;
  body.add(durk);
  const douwe = buildPersonMesh(DOUWE_LOOK.shirt, DOUWE_LOOK.skin, DOUWE_LOOK);
  douwe.position.set(-1.3, 1.62, 0);
  body.add(douwe);
  mesh.userData.omCrew = { durk, douwe };
}

function stageText(run) {
  const d = run.data;
  if (d.stage === 'drive') return 'Rij naar de schuur van Durk en Douwe';
  if (d.stage === 'untie') return 'Maak Geertje los (E)';
  if (d.stage === 'escort') return d.cowWait ? 'Geertje wacht op je: rij terug naar haar' : 'Rij Geertje naar het erf van Ome Jan. Ze rent mee';
  return '';
}

function setupHideout(run) {
  const w = run.world, d = run.data, H = sites.hide;
  const prop = buildProp('hideout', {});
  prop.group.position.set(H.x, 0, H.y);
  prop.group.rotation.y = -H.a;
  getScene().add(prop.group);
  d.hideProp = prop;
  const loc = (lx, lz) => [H.x + lx * Math.cos(H.a) - lz * Math.sin(H.a), H.y + lx * Math.sin(H.a) + lz * Math.cos(H.a)];
  // Geertje tied to the barn, the twins on their bales
  const [cx, cy] = loc(-1, -4.2);
  d.cow = { x: cx, y: cy, a: H.a, v: 0, stride: 0, mesh: buildCowMesh3D(0.61) };
  d.cow.mesh.position.set(cx, 0, cy);
  d.cow.mesh.rotation.y = -H.a;
  getScene().add(d.cow.mesh);
  const [ax, ay] = loc(2, -2.5), [bx, by] = loc(2, -1.2);
  d.durk = twinFigure(DURK_LOOK, ax - Math.cos(H.a) * 0.6, ay - Math.sin(H.a) * 0.6, H.a + Math.PI, 0);
  d.douwe = twinFigure(DOUWE_LOOK, bx - Math.cos(H.a) * 0.6, by - Math.sin(H.a) * 0.6, H.a + Math.PI, 0);
  // Jelle's trekker-limo parked beside the barn
  const [tx, ty] = loc(3, 18);
  const t = new Vehicle(tx, ty, H.a + Math.PI / 2, { ...TRACTOR });
  t.driver = 'twins';
  t.scripted = true;
  t.missionCar = true;
  t.label = 'Trekker-limo';
  w.vehicles.push(t);
  d.tractor = t;
}

function untie(run) {
  const d = run.data;
  d.stage = 'escort';
  d.chaseAt = run.t + HEAD_START;
  run.world.missionPrompt = null;
  sayKey(run, KOE_LINES.untie[0]);
  d.queue = [[1.6, KOE_LINES.alarm[0]], [3.4, KOE_LINES.alarm[1]]];
  // the twins run for the trekker
  freeFigure(d.durk); freeFigure(d.douwe);
  d.durk = d.douwe = null;
  setTarget({ x: sites.farm.x, y: sites.farm.y });
}

function cowStep(run, dt) {
  const w = run.world, d = run.data, c = d.cow;
  const p = hoofdspeler(w), pv = p.inVehicle;
  const lx = pv ? pv.x : p.x, ly = pv ? pv.y : p.y;
  const head = pv ? pv.angle : p.angle || 0;
  const dist = Math.hypot(lx - c.x, ly - c.y);
  d.cowWait = dist > COW_LOST;
  let want = 0, tx = c.x, ty = c.y;
  if (!d.cowWait) {
    const back = pv ? pv.halfLen + 4 : 3;
    tx = lx - Math.cos(head) * back; ty = ly - Math.sin(head) * back;
    const dd = Math.hypot(tx - c.x, ty - c.y);
    // a champion: she keeps up with whatever you drive
    const cap = Math.max(COW_MAX * (d.grab > 5 ? PANIC : 1), pv ? Math.abs(pv.speed || 0) + 3 : 0);
    want = Math.min(cap, Math.max(0, (dd - 1.5) * 1.3));
  }
  c.v += Math.max(-COW_ACC * 2 * dt, Math.min(COW_ACC * dt, want - c.v));
  if (c.v > 0.05) {
    const goal = Math.atan2(ty - c.y, tx - c.x);
    let da = goal - c.a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    c.a += Math.max(-3 * dt, Math.min(3 * dt, da));
    c.x += Math.cos(c.a) * c.v * dt;
    c.y += Math.sin(c.a) * c.v * dt;
    pushOutOfBuildings(w.map, c, 1.2);
  }
  c.stride += c.v * dt * 1.6;
  const m = c.mesh;
  m.position.set(c.x, Math.abs(Math.sin(c.stride)) * Math.min(0.12, c.v * 0.015), c.y);
  m.rotation.y = -c.a;
  const legs = m.userData.legs;
  if (legs) legs.forEach((b, i) => { b.rotation.z = Math.sin(c.stride + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.8 : 0)) * Math.min(0.7, c.v * 0.09); });
  return dist;
}

// Kinematic: the twins' own speed and heading (the traffic systems leave a
// scripted vehicle alone, collisions still shove it about).
function drive(t, d, dt, want, steer) {
  d.tv += Math.max(-TRACTOR.brake * dt, Math.min(TRACTOR.accel * dt, want - d.tv));
  if (d.tv > 0.2) t.angle += Math.max(-1, Math.min(1, steer)) * TRACTOR.turnRate * Math.min(1, d.tv / 4) * dt;
  t.speed = d.tv;
  t.x += Math.cos(t.angle) * d.tv * dt;
  t.y += Math.sin(t.angle) * d.tv * dt;
}

function tractorStep(run, dt) {
  const w = run.world, d = run.data, t = d.tractor, c = d.cow;
  if (!w.vehicles.includes(t)) w.vehicles.push(t);
  crewTractor(d);
  if (d.broken || run.t < d.chaseAt) { drive(t, d, dt, 0, 0); return Infinity; }
  if (t.disabled || t.wrecked) { breakDown(run); return Infinity; }
  if (run.t > d.chaseAt + DITCH_AT) { breakDown(run, 'De trekker-limo rijdt de sloot in. Durk en Douwe staan tot hun knieën in het water.'); return Infinity; }
  // a ram from the player's vehicle stalls the trekker
  const pv = hoofdspeler(w).inVehicle;
  if (pv && pv !== t && run.t > d.ramCool) {
    const gap = Math.hypot(pv.x - t.x, pv.y - t.y);
    if (gap < (pv.halfLen + t.halfLen) * 0.9 && Math.abs(pv.speed || 0) > 5.5) {
      d.rams++;
      d.ramCool = run.t + 2;
      d.stallUntil = run.t + RAM_STALL;
      d.tv = 0;
      if (d.rams >= RAMS_TO_BREAK) { breakDown(run); return Infinity; }
      sayKey(run, KOE_LINES.ram[(d.rams - 1) % KOE_LINES.ram.length]);
    }
  }
  const dist = Math.hypot(c.x - t.x, c.y - t.y);
  if (run.t < d.stallUntil) { drive(t, d, dt, 0, 0); return dist; }
  const lead = 0.6;
  const gx = c.x + Math.cos(c.a) * c.v * lead, gy = c.y + Math.sin(c.a) * c.v * lead;
  let da = Math.atan2(gy - t.y, gx - t.x) - t.angle;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const want = dist < 5 ? 1.5 : Math.abs(da) > 1.3 ? 3.5 : TRACTOR.maxSpeed;
  drive(t, d, dt, want, da * 2.2);
  return dist;
}

function breakDown(run, why) {
  const d = run.data;
  if (d.broken) return;
  d.broken = true;
  d.tv = 0;
  sayKey(run, KOE_LINES.broken[0]);
  run.world.addMessage(why || 'De trekker-limo is kapot. Rij Geertje rustig naar huis.', 3.5);
}

function deliver(run) {
  const d = run.data;
  d.stage = 'outro';
  const S = sites, el = d.elapsed;
  const par = S.dist / 13 + S.dist / 8.2 + 25;
  const medal = el <= par ? 3 : el <= par * 1.35 ? 2 : 1;
  const res = {
    success: true, medal, value: Math.round(el * 10) / 10, lower: true, title: 'GEERTJE IS THUIS',
    reason: medal === 3 ? 'Ome Jan heeft er geen woorden voor. Wel kaas.' : 'Geertje staat weer op stal',
    stats: [['Tijd', fmt(el)], ['Trekker gerammd', `${d.rams}x`]],
  };
  d.cow.v = 0;
  run.world.addMessage('Geertje is thuis! Ome Jan staat al bij het hek.', 3.5);
  const done = () => finish(run, res);
  if (!playScene(run, 'koe-outro', KOE_LINES.outro, { x: S.farm.x, y: S.farm.y, a: S.farm.a }, done)) done();
}

function fmt(s) {
  const t = Math.max(0, s), m = Math.floor(t / 60);
  return `${m}:${String(Math.floor(t - m * 60)).padStart(2, '0')}`;
}

export const KOE = {
  id: 'koe',
  name: 'De Koe van Ome Jan',
  blurb: 'Durk en Douwe hebben de prijskoe van Ome Jan gejat',
  icon: 'koe',
  jelle: false,
  banter: 'koe',
  reach: 3,
  spots(world) {
    const S = ensureSites(world.map);
    return S ? [{ x: S.farm.x, y: S.farm.y, name: 'De Koe van Ome Jan', sub: 'Ome Jan bij Ten Boer mist zijn prijskoe' }] : [];
  },
  verb: () => 'De Koe van Ome Jan',
  promptSub: () => 'Ome Jan mist zijn prijskoe Geertje',
  start(run) {
    const w = run.world;
    if (!ensureSites(w.map)) return 'Ome Jan is even niet thuis';
    Object.assign(run.data, { stage: 'intro', tv: 0, elapsed: 0, rams: 0, ramCool: 0, stallUntil: 0, grab: 0, maxGrab: 0, lostT: 0, broken: false, queue: [], called: false, lastDuo: 0 });
    setupHideout(run);
    current = run;
    run.ui.setSlot('<div class="pg-help">1. Rij naar de schuur van Durk en Douwe. 2. Maak Geertje los (E), ook vanuit de auto. 3. Rij haar naar het erf van Ome Jan: ze rent mee. Durk en Douwe zitten achter je aan in de trekker-limo. Rammen zet hem even stil, maar hoeft niet.</div>');
    const go = () => {
      if (run.data.stage !== 'intro') return;
      run.data.stage = 'drive';
      setTarget({ x: sites.hide.x, y: sites.hide.y });
      // Ome Jan's old moped, for when you came by train
      const p = hoofdspeler(w);
      const near = w.vehicles.some((v) => !v.wrecked && !v.isBoat && (v.playerOwned || v.isHeroCar || v.driver === 'player') && Math.hypot(v.x - p.x, v.y - p.y) < 80);
      if (!near) {
        const f = sites.farm;
        const m = makeTwoWheeler('moped', f.x + Math.cos(f.a - 1.6) * 3, f.y + Math.sin(f.a - 1.6) * 3, f.a);
        m.missionCar = true;
        w.vehicles.push(m);
        run.data.moped = m;
        w.addMessage('Ome Jan leent je zijn ouwe brommer', 3);
      }
    };
    run.data.go = go;
    if (!playScene(run, 'koe-intro', KOE_LINES.intro, { x: sites.farm.x, y: sites.farm.y, a: sites.farm.a }, go)) go();
    return true;
  },
  keys(run, input) {
    const d = run.data;
    if (d.stage !== 'untie' || !d.cow) return;
    const p = hoofdspeler(run.world), v = p.inVehicle;
    if (Math.hypot(d.cow.x - (v ? v.x : p.x), d.cow.y - (v ? v.y : p.y)) > (v ? UNTIE_CAR : UNTIE_FOOT)) return;
    if (input.wasPressed('e') || input.wasPressed('f')) {
      input.consume('e');
      input.consume('f');
      untie(run);
    }
  },
  update(run, dt) {
    const w = run.world, d = run.data, p = hoofdspeler(w);
    if (d.stage === 'intro' && !isCinematicActive('koe-intro')) d.go();
    if (d.stage === 'intro' || d.stage === 'outro') return;
    d.elapsed += dt;
    for (let i = d.queue.length - 1; i >= 0; i--) {
      if ((d.queue[i][0] -= dt) <= 0) { sayKey(run, d.queue[i][1]); d.queue.splice(i, 1); }
    }
    if (d.elapsed > LIMIT) { finish(run, { success: false, medal: 0, title: 'GEERTJE IS WEG', reason: 'Te lang onderweg. Durk en Douwe zijn met Geertje naar Friesland.', stats: [] }); return; }
    const H = sites.hide;
    const lx = p.inVehicle ? p.inVehicle.x : p.x, ly = p.inVehicle ? p.inVehicle.y : p.y;
    if (d.stage === 'drive') {
      if (!d.called && (d.elapsed > 25 || (d.elapsed > 10 && p.inVehicle))) { d.called = true; startCall(w, { from: 'Jelle Terpstra', lines: KOE_CALL }); }
      if (Math.hypot(H.x - lx, H.y - ly) < 45) {
        d.stage = 'untie';
        sayKey(run, KOE_LINES.spotted[0]);
        d.queue.push([3, KOE_LINES.spotted[1]]);
        setTarget({ x: d.cow.x, y: d.cow.y });
      }
    } else if (d.stage === 'untie') {
      const near = Math.hypot(d.cow.x - lx, d.cow.y - ly) < (p.inVehicle ? UNTIE_CAR : UNTIE_FOOT);
      w.missionPrompt = near ? { id: 'koe-untie', x: d.cow.x, y: d.cow.y, h: 1.9, key: 'E', label: 'Geertje losmaken', sub: 'Ze rent met je mee naar huis', ring: true } : null;
    } else if (d.stage === 'escort') {
      const dist = cowStep(run, dt);
      const td = tractorStep(run, dt);
      if (d.cowWait && run.t - d.lastDuo > 14) { d.lastDuo = run.t; sayDuo(run, KOE_LINES.duo.wait, true); }
      // warn once the trekker closes in on her, at most every 8 s
      if (td < GRAB_R * 2.2 && run.t >= d.stallUntil && run.t - (d.warnAt || -99) > 8) {
        d.warnAt = run.t;
        w.addMessage('Pas op: de trekker zit vlak achter Geertje! Ram hem.', 2.5);
      }
      if (td < GRAB_R) {
        d.grab = Math.min(100, d.grab + GRAB_UP * dt * (1.4 - td / GRAB_R));
        if (d.grab > 50 && !d.saidClose) { d.saidClose = true; sayKey(run, KOE_LINES.close[0]); }
        if (run.t - d.lastDuo > 10) { d.lastDuo = run.t; sayDuo(run, KOE_LINES.duo.near); }
      } else {
        d.grab = Math.max(0, d.grab - GRAB_DOWN * dt);
        if (d.grab < 20) d.saidClose = false;
      }
      d.maxGrab = Math.max(d.maxGrab, d.grab);
      if (d.grab >= 100) {
        sayKey(run, KOE_LINES.lost[0]);
        finish(run, { success: false, medal: 0, title: 'GEERTJE IS WEG', reason: 'Durk en Douwe hebben Geertje weer. Op weg naar de keuring in Friesland.', stats: [] });
        return;
      }
      if (!d.broken && run.t > d.chaseAt && run.t - run.lastSay > 11) {
        d.chaseLine = ((d.chaseLine ?? -1) + 1) % KOE_LINES.chase.length;
        sayKey(run, KOE_LINES.chase[d.chaseLine], false);
      } else if (run.t - d.lastDuo > 22 && dist < 30) { d.lastDuo = run.t; sayDuo(run, KOE_LINES.duo.go); }
      setTarget({ x: sites.farm.x, y: sites.farm.y });
      if (Math.hypot(d.cow.x - sites.farm.x, d.cow.y - sites.farm.y) < HOME_R) deliver(run);
    }
    const rows = [['Doel', stageText(run)], ['Tijd', fmt(d.elapsed)]];
    if (d.stage === 'escort') {
      const cd = Math.round(Math.hypot(d.cow.x - lx, d.cow.y - ly));
      rows.push(['Geertje', d.cowWait ? `blijft staan · ${cd} m` : `loopt mee · ${cd} m`]);
      rows.push(['Erf', `nog ${Math.round(Math.hypot(d.cow.x - sites.farm.x, d.cow.y - sites.farm.y))} m`]);
      rows.push(['Ram de trekker (mag)', d.broken ? 'staat stil, ze lopen naar huis' : `${d.rams}/${RAMS_TO_BREAK}${run.t < d.stallUntil ? ' · motor stil' : ''}`]);
      if (!d.broken) rows.push(['Durk & Douwe', `grijpen ${Math.round(d.grab)}%`]);
    }
    run.ui.setRows(rows);
  },
  hud: () => null,
  stop(run) {
    const w = run.world, d = run.data;
    if (current === run) current = null;
    w.missionPrompt = null;
    if (d.hideProp) disposeProp(d.hideProp);
    if (d.cow) d.cow.mesh.removeFromParent();
    freeFigure(d.durk); freeFigure(d.douwe);
    if (d.tractor) {
      const i = w.vehicles.indexOf(d.tractor);
      if (i >= 0) w.vehicles.splice(i, 1);
    }
    if (d.moped && hoofdspeler(w).inVehicle !== d.moped) {
      const i = w.vehicles.indexOf(d.moped);
      if (i >= 0) w.vehicles.splice(i, 1);
    } else if (d.moped) d.moped.missionCar = false;
  },
  idle(world, dt) {
    if (sites) idleYard(world, dt);
  },
  debugWin(run) {
    const d = run.data;
    if (d.stage === 'intro') d.go();
    d.elapsed = Math.max(d.elapsed, 60);
    if (d.cow) { d.cow.x = sites.farm.x; d.cow.y = sites.farm.y; }
    finish(run, { success: true, medal: 3, value: d.elapsed, lower: true, title: 'GEERTJE IS THUIS', reason: 'Geertje staat weer op stal', stats: [['Tijd', fmt(d.elapsed)]] });
  },
  debugState(run) {
    const d = run.data;
    return { stage: d.stage, grab: Math.round(d.grab), rams: d.rams, cow: d.cow ? [Math.round(d.cow.x), Math.round(d.cow.y)] : null, tractor: d.tractor ? [Math.round(d.tractor.x), Math.round(d.tractor.y)] : null };
  },
};


