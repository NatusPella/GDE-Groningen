import { Pedestrian, isSpawnHidden } from './pedestrians.js';
import { isInsideBuilding } from './pedgeom.js';
import { walkPed } from './sidejobkit.js';
import { wijkProfileAt } from './trafficfleet.js';
import { isInWater } from './util.js';
import { showCard, cardsBusy } from './hudcards.js';
import { isCinematicActive } from './cinematics.js';
import { isMissionActive } from './missionquery.js';
import { isActivityActive } from './activities.js';
import { inHomeFlat } from './home.js';
import { MUG, MUG_TEXT, mayMug, riskLevel, hazard, warnsOn, riskWhy, stolenAmount, caught, escaped, nightFactor } from './muggingrules.js';
import { playerBusy } from './busy.js';

// Berovingen (rules in muggingrules.js): in the wijken that are busy or empty
// after dark a wallet can be snatched: you lose a share of your money, no
// violence anywhere, and you get it back by running the thief down. A card
// warns when you walk into such a wijk at night. Text only, nothing saved.
// `window.__muggings` debug.
const S = { phase: null, ped: null, lost: 0, t: 0, since: 1e9, approach: 0, warned: new Set() };
let world = null;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function initMuggings(w) {
  world = w;
  S.phase = null; S.ped = null; S.since = 1e9; S.warned.clear();
  window.__muggings = {
    state: () => ({ phase: S.phase, lost: S.lost, since: S.since, wijk: wijkOf(w), level: levelNow(w), thief: !!S.ped }),
    // forces a mugging right now (tests): returns true when the thief is on the way
    mug: () => { w.__forceMug = true; return start(w, true); },
    abort: () => abort(w, true),
  };
}

function wijkOf(w) {
  const p = w.player;
  return w.map && p ? wijkProfileAt(w.map, p.x, p.y).wijk : '';
}

const hourOf = (w) => ((w.clock % 24) + 24) % 24;
const levelNow = (w) => riskLevel(wijkOf(w), hourOf(w));

function busy(w) {
  return playerBusy(w, ['cinematic', 'mission', 'sideJob', 'activity', 'challenge', 'race', 'padel']).busy
    || (typeof document !== 'undefined' && document.body.classList.contains('hud-call-on'));
}

function abort(w, silent = false) {
  if (S.ped && w.pedestrians.includes(S.ped) && S.ped.state !== 'dead') {
    if (S.phase === 'approach') w.pedestrians.splice(w.pedestrians.indexOf(S.ped), 1);
    else { S.ped.state = 'wander'; S.ped.mugger = false; }
  }
  S.phase = null; S.ped = null;
  w.muggerChase = null;
  if (!silent) S.since = 0;
}

function spawnThief(w) {
  const p = w.player, map = w.map;
  for (let tries = 0; tries < 14; tries++) {
    const a = Math.random() * Math.PI * 2, r = MUG.spawnDist[0] + Math.random() * (MUG.spawnDist[1] - MUG.spawnDist[0]);
    const [x, y] = map.escapeBuilding(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0.4);
    if (isInsideBuilding(map, x, y) || isInWater(map, x, y) || dist({ x, y }, p) < 6) continue;
    if (!w.__forceMug && !isSpawnHidden(w, x, y) && tries < 10) continue;
    const ped = new Pedestrian(x, y, Math.atan2(p.y - y, p.x - x));
    ped.clothing = '#e0b82c';
    ped.look = { top: 'hoodie', hat: 'cap', hatColor: 0x2a2a2c };
    ped.hasBag = false;
    ped.state = 'guard';
    ped.guard = { x, y, angle: ped.angle };
    ped.mugger = true;
    w.pedestrians.push(ped);
    return ped;
  }
  return null;
}

function start(w, force = false) {
  if (S.phase) return false;
  const ped = spawnThief(w);
  if (!ped) return false;
  S.phase = 'approach';
  S.ped = ped;
  S.approach = 0;
  S.t = 0;
  w.__forceMug = false;
  return true;
}

function snatch(w) {
  const lost = stolenAmount(w.money);
  if (!(lost > 0)) { abort(w); return; }
  w.money -= lost;
  S.lost = lost;
  S.phase = 'chase';
  S.t = 0;
  const ped = S.ped;
  ped.guard = null;
  ped.jobPed = false;
  ped.state = 'flee';
  ped.fleeFrom = null;
  ped.fleeJitter = (Math.random() - 0.5) * 0.8;
  ped.fleeSpeed = MUG.fleeSpeed;
  ped.stateUntil = w.time + MUG.giveUpAfter + 4;
  ped.speechText = pick(MUG_TEXT.thiefBark);
  ped.speechUntil = w.time + 2.4;
  w.addMessage(MUG_TEXT.snatch(lost), 6, { kind: 'gevaar', key: 'beroving' });
}

export function updateMuggings(dt, w) {
  if (!dt || w.paused || !w.player || !w.map) return;
  world = w;
  S.since += dt;
  const p = w.player;
  const hour = hourOf(w);
  const wijk = wijkOf(w);
  const level = riskLevel(wijk, hour);

  // the warning card, once per wijk and night
  if (level > 0 && warnsOn(wijk, hour) && !S.warned.has(wijk) && !busy(w) && !cardsBusy() && !inHomeFlat() && (w.time || 0) > 20) {
    S.warned.add(wijk);
    showCard(w, { kind: 'tip', kicker: 'Waarschuwing', title: MUG_TEXT.warnTitle(wijk), body: MUG_TEXT.warnBody(riskWhy(wijk)), key: 'beroving-' + wijk, voice: false });
  }
  if (nightFactor(hour) === 0 && S.warned.size) S.warned.clear();

  if (S.phase === 'approach') {
    const ped = S.ped;
    S.approach += dt;
    if (!ped || !w.pedestrians.includes(ped) || ped.state === 'dead' || busy(w) || p.inVehicle || S.approach > MUG.approachMax) { abort(w); return; }
    if (walkPed(w, ped, p.x, p.y, MUG.approachSpeed, dt, MUG.snatchReach)) snatch(w);
    return;
  }
  if (S.phase === 'chase') {
    const ped = S.ped;
    S.t += dt;
    if (!ped || !w.pedestrians.includes(ped)) { w.addMessage(MUG_TEXT.gone(S.lost), 5); S.phase = null; S.ped = null; S.since = 0; w.muggerChase = null; return; }
    w.muggerChase = { x: ped.x, y: ped.y };
    const d = dist(p, ped);
    if (ped.state === 'dead' || caught(d, S.t)) {
      w.money += S.lost;
      w.addMessage(MUG_TEXT.back(S.lost), 5, { kind: 'geld', key: 'beroving-terug' });
      if (ped.state !== 'dead') { ped.state = 'wander'; ped.mugger = false; ped.speechText = 'Au! Hier, pak maar.'; ped.speechUntil = w.time + 2.4; }
      S.phase = null; S.ped = null; S.since = 0; w.muggerChase = null;
      return;
    }
    if (escaped(d, S.t)) {
      const i = w.pedestrians.indexOf(ped);
      if (i >= 0) w.pedestrians.splice(i, 1);
      w.addMessage(MUG_TEXT.gone(S.lost), 5);
      S.phase = null; S.ped = null; S.since = 0; w.muggerChase = null;
    }
    return;
  }
  if (level <= 0) return;
  if (!mayMug({ onFoot: !p.inVehicle && !p.swimming && !w.pigeonMode && !w.heliRun, busy: busy(w) || inHomeFlat(), dead: p.dead || w.pendingRespawn, wanted: w.wanted || 0, since: S.since, time: w.time || 0, money: w.money })) return;
  if (Math.random() < hazard(level) * dt) start(w);
}
