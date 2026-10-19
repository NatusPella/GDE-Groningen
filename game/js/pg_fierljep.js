import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { poleVault, findVaultSpot } from './fierljep.js';
import { JELLE_LOOK } from './storycast.js';
import { playCinematic, isCinematicActive, skipCinematic } from './cinematics.js';
import { pushAudioEvent } from './pedgeom.js';
import { pointInPolygon as inPoly, isInWater, clamp } from './util.js';
import { finish, jelle } from './pghost.js';
import { rand } from './rng.js';

// Fierljep-duel: Jelle sets a mark over a canal (fierljep.js poleVault), the
// player gets three jumps with a timing minigame (run-up, the grab, the
// climb); the timing decides the distance or a splash. Best landed jump
// against Jelle's best: landed = brons, beat Jelle = zilver, beat Jelle with
// a near-perfect jump = goud.

const CANDIDATES = [
  { at: [-282.61, 1162.57], name: 'het Hoornsediep' },
  { at: [-165.62, 1573.39], name: 'het Hoornsediep' },
  { at: [-387.75, 862.29], name: 'de Emmasingel' },
  { at: [-390.53, 691.21], name: 'de Zuiderhaven' },
  { at: [-452.42, -32.57], name: 'de Noorderhaven' },
  { at: [-711.25, -541.76], name: 'het Reitdiep' },
];
const ATTEMPTS = 3;
const BONUS_MAX = 8;
const GOLD_BONUS = 6.6;
const NEEDLE_HZ = [0.55, 0.85];
const CLIMB_S = 2.2;
const CLIMB_TAPS = 13;

const fmtM = (m) => `${m.toFixed(2).replace('.', ',')} m`;

function solid(map, x, y) {
  return map.buildingsNear(x, y, 1).some((b) => x >= b.bounds[0] && x <= b.bounds[2] && y >= b.bounds[1] && y <= b.bounds[3] && inPoly(x, y, b.pts));
}

// the same every time for a map, and a few hundred ms to find
function findSpot(map) {
  if (map._fierljepSpot === undefined) map._fierljepSpot = searchSpot(map);
  return map._fierljepSpot;
}

function searchSpot(map) {
  for (const c of CANDIDATES) {
    const v = findVaultSpot(map, c.at[0], c.at[1], 110, { minWidth: 7, maxWidth: 20 });
    if (!v) continue;
    const dx = v.to.x - v.from.x, dy = v.to.y - v.from.y, l = Math.hypot(dx, dy) || 1;
    const dir = { x: dx / l, y: dy / l };
    const runup = { x: v.from.x - dir.x * 10, y: v.from.y - dir.y * 10 };
    if (solid(map, runup.x, runup.y) || isInWater(map, runup.x, runup.y)) continue;
    return { ...v, dir, runup, name: c.name };
  }
  return null;
}

// The landing spot for a jump that goes `extra` metres past the far bank.
function landingFor(map, spot, extra) {
  for (let e = extra; e >= 0; e -= 0.5) {
    const x = spot.to.x + spot.dir.x * e, y = spot.to.y + spot.dir.y * e;
    if (!isInWater(map, x, y) && !solid(map, x, y)) return { x, y };
  }
  return spot.to;
}

function standing(look, x, y, yaw) {
  const m = buildPersonMesh(look.shirt, look.skin, look);
  m.position.set(x, 0, y);
  m.rotation.y = -yaw;
  getScene().add(m);
  return m;
}

export const FIERLJEP = {
  id: 'fierljep',
  name: 'Fierljep-duel',
  blurb: 'Met de polsstok over de gracht, verder dan Jelle',
  icon: 'jelle',
  jelle: true,
  banter: 'post-fierljep',
  spots(world) {
    const s = findSpot(world.map);
    if (!s) return [];
    return [{ x: s.runup.x, y: s.runup.y, name: `Fierljep-duel aan ${s.name}`, sub: 'Jelle staat klaar met twee polsstokken', vault: s }];
  },
  verb: () => 'Fierljep-duel tegen Jelle',
  start(run) {
    const w = run.world, s = run.spot.data.vault;
    const look = w.player.character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
    const yaw = Math.atan2(s.dir.y, s.dir.x);
    const n = { x: -s.dir.y, y: s.dir.x };
    Object.assign(run.data, {
      s, look, yaw, phase: 'jelle', attempt: 0, best: 0, jbest: 0, jumps: [], width: s.width, needle: 0, q: [], vault: null, wait: 0,
      me: standing(look, s.runup.x, s.runup.y, yaw),
      jl: standing(JELLE_LOOK, s.runup.x + n.x * 2.4 - s.dir.x * 1.5, s.runup.y + n.y * 2.4 - s.dir.y * 1.5, yaw + 0.6),
    });
    w.cinematicHidePlayers = true;
    w.challengeHoldPlayer = true;
    const p = w.player;
    if (p.water) p.leaveWater();
    p.x = s.runup.x - s.dir.x * 3; p.y = s.runup.y - s.dir.y * 3;
    run.data.wait = 0.6;
    return true;
  },
  keys(run, input) {
    const d = run.data;
    const hit = input.wasPressed(' ') || input.wasPressed('e') || input.wasPressed('f');
    for (const k of [' ', 'e', 'f']) input.consume(k);
    if (hit) d.press = true;
  },
  update(run, dt) {
    const w = run.world, d = run.data;
    w.cinematicHidePlayers = true;
    const press = d.press;
    d.press = false;
    if (d.me && d.me.visible) animatePersonWalk(d.me, 0, dt);
    if (d.jl && d.jl.visible) animatePersonWalk(d.jl, 0, dt);
    if (d.wait > 0) { d.wait -= dt; return; }
    switch (d.phase) {
      case 'jelle': jelleJump(run, d.attempt === 0 ? rand(3.4, 5) : Math.min(BONUS_MAX, d.jbest - d.width - 2.2 + rand(0.4, 1.4))); break;
      case 'aim1': case 'aim2': aim(run, dt, press); break;
      case 'climb': climb(run, dt, press); break;
      case 'next': next(run); break;
      default: break;
    }
    updateUi(run);
  },
  hud: () => null,
  stop(run) {
    const w = run.world, d = run.data;
    w.cinematicHidePlayers = false;
    w.challengeHoldPlayer = false;
    if (isCinematicActive('pg-aim')) skipCinematic();
    if (d.vault) d.vault.dispose();
    for (const m of [d.me, d.jl]) if (m) m.removeFromParent();
    const s = d.s;
    if (s) { if (w.player.water) w.player.leaveWater(); w.player.x = s.runup.x; w.player.y = s.runup.y; w.player.angle = d.yaw; }
  },
  debugWin(run) {
    const d = run.data;
    d.jumps.push(d.width + 2.2 + BONUS_MAX);
    d.best = d.width + 2.2 + BONUS_MAX;
    if (!d.jbest) d.jbest = d.width + 6;
    d.attempt = ATTEMPTS;
    end(run);
  },
  debugState: (run) => ({ phase: run.data.phase, attempt: run.data.attempt, best: run.data.best, jbest: run.data.jbest, width: run.data.width }),
};

function aimCamera(run) {
  const d = run.data, s = d.s;
  const n = { x: -s.dir.y, y: s.dir.x };
  // behind the runner's shoulder, looking down the run-up over the canal
  const cx = s.runup.x - s.dir.x * 5 + n.x * 1.8, cy = s.runup.y - s.dir.y * 5 + n.y * 1.8;
  const shot = { position: { x: cx, y: cy, z: 2.5 }, lookAt: { x: s.from.x + s.dir.x * 4, y: s.from.y + s.dir.y * 4, z: 0.6 }, fov: 58 };
  playCinematic({ id: 'pg-aim', priority: 1, duration: 600, pause: false, letterbox: false, skippable: false, hideHud: false, passKeys: true, shot: () => shot });
}

function jelleJump(run, bonus) {
  const d = run.data, s = d.s, w = run.world;
  const fail = d.attempt > 0 && Math.random() < 0.3;
  const dist = s.width + 2.2 + bonus;
  d.phase = 'jvault';
  d.jl.visible = false;
  jelle(run, 'jump', true);
  const npc = { x: s.runup.x - s.dir.x * 2, y: s.runup.y - s.dir.y * 2, angle: d.yaw, appearance: JELLE_LOOK };
  const to = landingFor(w.map, s, bonus * 0.6);
  run.ui.root.hidden = true;
  d.vault = poleVault(npc, s.from, to, { fail, appearance: JELLE_LOOK, camera: true, slowmo: true, keepActor: true, say: false, swimTime: 2.5 });
  const h = d.vault;
  h.done.then((res) => {
    if (run.done) return;
    setTimeout(() => { if (d.vault === h) { h.dispose(); d.vault = null; } }, 600);
    run.ui.root.hidden = false;
    d.jl.visible = true;
    if (res.result === 'landed') {
      d.jbest = Math.max(d.jbest, dist);
      w.addMessage(`Jelle: ${fmtM(dist)}`, 3, { key: 'pg-mark' });
      jelle(run, 'mark', true);
    } else {
      w.addMessage('Jelle: plons!', 3, { key: 'pg-mark' });
      jelle(run, 'splash', true);
      if (!d.jbest) d.jbest = s.width + 4;
    }
    d.phase = 'aim1';
    d.needle = Math.random();
    d.q = [];
    d.wait = 1.2;
    aimCamera(run);
  });
}

// Needle sweeping across the bar; press as it crosses the middle.
function aim(run, dt, press) {
  const d = run.data;
  const k = d.phase === 'aim1' ? 0 : 1;
  d.needleT = (d.needleT || 0) + dt * NEEDLE_HZ[k];
  d.needle = 0.5 + 0.5 * Math.sin(d.needleT * Math.PI * 2);
  if (!press) return;
  const q = clamp(1 - Math.abs(d.needle - 0.5) / 0.5, 0, 1);
  d.q.push(q);
  pushAudioEvent(run.world, { kind: 'step', x: d.s.runup.x, y: d.s.runup.y, strength: 0.4 });
  if (k === 0) { d.phase = 'aim2'; d.needleT = Math.random(); d.wait = 0.25; }
  else { d.phase = 'climb'; d.taps = 0; d.climbT = CLIMB_S; d.wait = 0.2; }
}

function climb(run, dt, press) {
  const d = run.data;
  if (press) d.taps++;
  d.climbT -= dt;
  if (d.climbT > 0) return;
  d.q.push(clamp(d.taps / CLIMB_TAPS, 0, 1));
  playerJump(run);
}

function playerJump(run) {
  const d = run.data, s = d.s, w = run.world;
  const [q1, q2, q3] = d.q;
  const quality = 0.35 * q1 + 0.35 * q2 + 0.3 * q3;
  const fail = q1 < 0.3 || q2 < 0.3 || q3 < 0.25;
  const bonus = BONUS_MAX * Math.pow(quality, 1.25);
  const dist = s.width + 2.2 + bonus;
  d.attempt++;
  d.phase = 'pvault';
  d.me.visible = false;
  if (isCinematicActive('pg-aim')) skipCinematic();
  run.ui.root.hidden = true;
  const npc = { x: s.runup.x, y: s.runup.y, angle: d.yaw, appearance: d.look };
  d.vault = poleVault(npc, s.from, landingFor(w.map, s, bonus * 0.6), { fail, appearance: d.look, camera: true, slowmo: quality > 0.8, keepActor: true, say: false, swimTime: 2.5 });
  const h = d.vault;
  h.done.then((res) => {
    if (run.done) return;
    setTimeout(() => { if (d.vault === h) { h.dispose(); d.vault = null; } }, 600);
    run.ui.root.hidden = false;
    d.me.visible = true;
    if (res.result === 'landed') {
      d.jumps.push(dist);
      d.best = Math.max(d.best, dist);
      w.addMessage(`Gesprongen: ${fmtM(dist)}${dist > d.jbest ? ' · verder dan Jelle!' : ''}`, 3, { key: 'pg-mark' });
      jelle(run, dist > d.jbest ? 'good' : 'mark', true);
    } else {
      d.jumps.push(0);
      w.addMessage('Plons! Die telt niet.', 3, { key: 'pg-mark' });
      jelle(run, 'wet', true);
    }
    d.phase = 'next';
    d.wait = 1.4;
  });
}

function next(run) {
  const d = run.data;
  if (d.attempt >= ATTEMPTS) { end(run); return; }
  // Jelle answers once when you have just jumped past his mark
  if (d.attempt === 2 && d.best > d.jbest && !d.answered) { d.answered = true; d.phase = 'jelle'; return; }
  d.phase = 'aim1';
  d.q = [];
  d.needleT = Math.random();
  aimCamera(run);
}

function end(run) {
  const d = run.data;
  const landed = d.best > 0;
  const won = landed && d.best > d.jbest;
  const medal = !landed ? 0 : won ? (d.best - d.width - 2.2 >= GOLD_BONUS ? 3 : 2) : 1;
  finish(run, {
    success: won, medal, value: landed ? d.best : undefined, lower: false,
    reason: won ? 'Verder dan Jelle! Hij meet het nog drie keer na.' : landed ? 'Jelle sprong verder. Hij doet alsof het niks is.' : `Drie keer plons. ${d.s.name[0].toUpperCase()}${d.s.name.slice(1)} kent je nu.`,
    stats: [['Jouw beste', landed ? fmtM(d.best) : 'plons'], ['Jelle', fmtM(d.jbest)], ['Sloot', fmtM(d.width)]],
  });
}

function updateUi(run) {
  const d = run.data;
  run.ui.setRows([['Jelle', d.jbest ? fmtM(d.jbest) : '–'], ['Jouw beste', d.best ? fmtM(d.best) : '–'], ['Sprong', `${Math.min(ATTEMPTS, d.attempt + (d.phase === 'aim1' || d.phase === 'aim2' || d.phase === 'climb' ? 1 : 0))}/${ATTEMPTS}`]]);
  let html = '';
  if (d.phase === 'aim1' || d.phase === 'aim2') {
    const label = d.phase === 'aim1' ? '1. Aanloop' : '2. Pak de polsstok';
    html = `<div>${label}: druk op <kbd>SPATIE</kbd> als de streep in het midden is</div><div class="pg-bar"><i style="left:38%;width:24%"></i><i class="gold" style="left:46%;width:8%"></i><u style="left:${(d.needle * 100).toFixed(1)}%"></u></div>`;
  } else if (d.phase === 'climb') {
    const k = clamp(d.taps / CLIMB_TAPS, 0, 1);
    html = `<div>3. Klimmen: <kbd>SPATIE</kbd> zo snel als je kunt!</div><div class="pg-bar"><i class="gold" style="left:0;width:${(k * 100).toFixed(0)}%"></i></div>`;
  } else if (d.phase === 'next' || d.phase === 'jvault' || d.phase === 'jelle') html = '<div class="pg-help">Jelle kijkt toe. Of doet alsof.</div>';
  run.ui.setSlot(html);
}
