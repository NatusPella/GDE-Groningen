// Bijbaantjes: repeatable side jobs next to the story missions. Each job
// lives in its own sidejob_*.js file; this module places their start
// points, runs the shift (rounds, streak, pay, timers, fail/quit), publishes
// world.sideJob for the HUD, map and routing, and keeps the per-save levels.
//
// A job module exports a definition object:
//   id, name, color, glyph, boss, blurb, intro[], anchor(map) -> {x, y}
//   start(ctx) -> true | reason       set up the shift (vehicle, props)
//   round(ctx)                        begin the next round
//   update(dt, ctx)                   per frame; ctx.complete()/ctx.fail()
//   view(ctx) -> { marker, dots, progress, goal }
//   interact(ctx) -> bool, prompt(ctx), secondary(ctx)   optional, on foot
//   needsVehicle(ctx) -> bool         optional: abandon checks on ctx.vehicle
//   stop(ctx)                         clean up
// Everything a job spawns that the core should tidy goes through ctx.

import { SMS_SAY } from './smsvoice.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildWorldMarker3D, updateWorldMarker3D } from './worldmarker3d.js';
import { isMissionActive, getActiveRace } from './missionquery.js';
import { isCinematicActive, playMissionIntro, showBanner } from './cinematics.js';
import { isShopOpen } from './shopui.js';
import { recordStat, setStatMax, recordUnique, unlockAchievement } from './achievements.js';
import { dist, isInWater } from './util.js';
import { releaseVehicle, removeVehicle, removePed, euro } from './sidejobkit.js';
import { jobVoiceFor, sayJobLine, sayDuoJobLine } from './sidejobvoice.js';
import bezorger from './sidejob_bezorger.js';
import krantenwijk from './sidejob_krantenwijk.js';
import taxi from './sidejob_taxi.js';
import bus from './sidejob_bus.js';
import rondvaart from './sidejob_rondvaart.js';
import rondvaarttour from './sidejob_rondvaarttour.js';
import fietsdepot from './sidejob_fietsdepot.js';
import verhuizing from './sidejob_verhuizing.js';
import boa from './sidejob_boa.js';
import rechtbank from './sidejob_rechtbank.js';
import cabaret from './sidejob_cabaret.js';
import vracht from './sidejob_vracht.js';
import lijn from './sidejob_lijn.js';
import { BIJBAAN_JOBS } from './sidejob_bijbaan.js';
import { veerdienst } from './sidejob_veer.js';
import { zeeschipLauwersoog, zeeschipEemshaven } from './sidejob_zeeschip.js';
import { PANEEL_JOBS } from './sidejob_paneel.js';
import tjalke from './sidejob_tjalke.js';
import { loket, studiestaat, vigilantia, promotie, kamerkoning, wolkenhal, helix, niemeyer, bernard, energielabel } from './sidejob_keuze.js';
import { STAD_JOBS } from './sidejob_stad.js';
import bietenoogst from './sidejob_bieten.js';
import boerderij from './sidejob_boerderij.js';
import snackoverlast from './sidejob_snackbar.js';
import { SIDEJOB_PAY_MULT, SIDEJOB_LEVEL_BONUS, SIDEJOB_ACCIDENT_FINE } from './economy.js';
import { playerBusy } from './busy.js';
import { waarschuwVoorStart } from './coopstatus.js';
import { jobBonusHook } from './latehooks.js';
import { noteMoney } from './finance.js';
import { loopbaanLoon, loopbaanTel, loopbaanDeel } from './loopbaanlive.js';
import { vakVanBaan } from './loopbaan.js';
import { hoofdspeler } from './spelersregister.js'; // de speler achter dit scherm doet de dienst (#446); een gast ziet de bijbaan van de host (coopbijbaan.js)

export const SIDE_JOBS = [bezorger, krantenwijk, taxi, bus, rondvaart, fietsdepot, verhuizing, rondvaarttour, boa, rechtbank, cabaret, vracht, loket, studiestaat, vigilantia, promotie, kamerkoning, wolkenhal, helix, niemeyer, bernard, energielabel, tjalke, lijn, ...BIJBAAN_JOBS, veerdienst, zeeschipLauwersoog, zeeschipEemshaven, ...PANEEL_JOBS, ...STAD_JOBS, bietenoogst, boerderij, snackoverlast];
const BY_ID = new Map(SIDE_JOBS.map((j) => [j.id, j]));

export const JOB_TARGET_COLOR = '#ff9a3c';
const USE_RADIUS = 2.4;
const ABANDON_DIST = 70;
const ABANDON_TIME = 60;
const NEXT_ROUND_DELAY = 1.6;
const RESTART_COOLDOWN = 3;
const LEVEL_AT = [0, 5, 12, 25, 45];
const LEVEL_TITLES = ['Nieuweling', 'Invaller', 'Vaste kracht', 'Routinier', 'Legende'];

let world = null;
let spots = [];
let ctx = null;
let cooldownUntil = 0;
let leftover = null;
let progress = {};
let seen = new Set();
let hintAt = -Infinity;
let lastEnd = null;
let debugApi = null;
const pub = { active: false, id: null, label: '', color: JOB_TARGET_COLOR, marker: null, dots: [], progress: '', timeLeft: null, goal: null, bus: null };

// --- levels -----------------------------------------------------------------

function rec(id) {
  return progress[id] || (progress[id] = { rounds: 0, earned: 0, bestStreak: 0, shifts: 0 });
}

export function jobLevel(id) {
  const r = rec(id).rounds;
  let lvl = 1;
  for (let i = 0; i < LEVEL_AT.length; i++) if (r >= LEVEL_AT[i]) lvl = i + 1;
  return lvl;
}

export function levelTitle(lvl) {
  return LEVEL_TITLES[Math.max(0, Math.min(LEVEL_TITLES.length - 1, lvl - 1))];
}

export function getSideJobList() {
  return spots.map((s) => {
    const r = rec(s.job.id);
    const lvl = jobLevel(s.job.id);
    return { id: s.job.id, name: s.job.name, blurb: s.job.blurb, x: s.x, y: s.y, level: lvl, title: levelTitle(lvl), rounds: r.rounds, earned: r.earned, bestStreak: r.bestStreak, active: !!ctx && ctx.job === s.job };
  });
}

// Rough pay per round for the phone's job app until the player has own figures.
const PAY_GUESS = { lijn: [60, 120], bezorger: [27, 55], krantenwijk: [24, 46], taxi: [25, 60], bus: [90, 140], rondvaart: [55, 105], rondvaarttour: [40, 80], fietsdepot: [45, 90], verhuizing: [80, 180], boa: [38, 60], rechtbank: [60, 105], cabaret: [25, 85], vracht: [70, 130], loket: [52, 90], studiestaat: [62, 110], vigilantia: [56, 98], promotie: [58, 100], kamerkoning: [52, 92], wolkenhal: [58, 100], helix: [54, 92], niemeyer: [54, 94], bernard: [48, 84], energielabel: [54, 94], tjalke: [300, 400], museumbus: [48, 86], suikerbieten: [50, 90], bietenoogst: [70, 110], boerderij: [40, 250], herstelploeg: [66, 96], oogtv: [69, 93], telefoonrave: [40, 85], vandermeden: [56, 90], schouwburg: [56, 92], bernardrit: [52, 84], snackoverlast: [44, 78] };

// Phone job app: every job with pay, distance and why it can't start now.
export function getSideJobOffers(w) {
  const p = hoofdspeler(w);
  const why = blockReason(w);
  return spots.map((s) => {
    const r = rec(s.job.id);
    const [lo, hi] = r.rounds >= 2 ? [Math.round(r.earned / r.rounds * 0.75), Math.round(r.earned / r.rounds * 1.25)] : PAY_GUESS[s.job.id] || [25, 60];
    const lvl = jobLevel(s.job.id);
    return {
      id: s.job.id, name: s.job.name, blurb: s.job.blurb, x: s.x, y: s.y, level: lvl, title: levelTitle(lvl),
      pay: [lo, Math.max(lo + 5, hi)], dist: dist(s.x, s.y, p.x, p.y), active: !!ctx && ctx.job === s.job,
      blocked: ctx && ctx.job === s.job ? '' : why,
    };
  }).sort((a, b) => a.dist - b.dist);
}

// --- init -------------------------------------------------------------------

// Two jobs on one spot: only the first could be started, the nearest wins (speeltestlus: eight regional jobs whose
// region was not loaded yet all stood on one road point in the city, and the city jobs share their centre). The next
// one steps aside to another road point at least 10 m from every job already placed.
const SPREAD = [[0, 0]];
for (const r of [30, 60, 90, 120]) for (let k = 0; k < 8; k++) SPREAD.push([Math.round(Math.cos(k * Math.PI / 4) * r), Math.round(Math.sin(k * Math.PI / 4) * r)]);
function spreadSpot(map, x, y, taken) {
  const free = (q) => !taken.some((t) => dist(t.x, t.y, q.x, q.y) < 10);
  // first another road point (the drivable roads near a pedestrian centre are few), then simply open ground
  for (const [dx, dy] of SPREAD) {
    const rp = map.nearestRoadPoint ? map.nearestRoadPoint(x + dx, y + dy, 60, true) : null;
    if (rp && free(rp)) return { x: rp.x, y: rp.y };
  }
  for (const [dx, dy] of SPREAD) {
    const q = { x: x + dx, y: y + dy };
    if (free(q) && !isInWater(map, q.x, q.y)) return q;
  }
  return { x, y };
}

// A job whose region had no road at init stands in the city; once the region's tiles are in, it moves home.
let reanchorIn = 5;
function reanchor(w, dt) {
  if (ctx || (reanchorIn -= dt) > 0) return;
  reanchorIn = 5;
  for (const s of spots) {
    if (!s.fallback) continue;
    let at = null;
    try { at = s.job.anchor(w.map); } catch (e) { continue; }
    if (!at || at.fallback) continue;
    const open = isInWater(w.map, at.x, at.y) ? w.map.findOpenSpawn(at.x, at.y, 60) : { x: at.x, y: at.y };
    if (!open) continue;
    const free = spreadSpot(w.map, open.x, open.y, spots.filter((o) => o !== s));
    const [x, y] = w.map.escapeBuilding(free.x, free.y, 0.5);
    s.x = x; s.y = y; s.fallback = false;
    if (s.mesh) s.mesh.position.set(x, 0, y);
  }
}

export function initSideJobs(w) {
  world = w;
  const scene = getScene();
  spots = [];
  for (const job of SIDE_JOBS) {
    let at = null;
    try { at = job.anchor(w.map); } catch (e) { console.error(e); }
    if (!at) continue;
    const open = isInWater(w.map, at.x, at.y) ? w.map.findOpenSpawn(at.x, at.y, 60) : { x: at.x, y: at.y };
    if (!open) continue;
    const free = spreadSpot(w.map, open.x, open.y, spots);
    const [x, y] = w.map.escapeBuilding(free.x, free.y, 0.5);
    const spot = { job, x, y, mesh: null, fallback: !!at.fallback };
    if (scene) { spot.mesh = buildBadge3D(job, x, y); scene.add(spot.mesh); }
    spots.push(spot);
  }
  if (scene) buildBeacon(scene);
  w.sideJob = pub;
  w.sideJobActions = {
    active: () => !!ctx, stop: () => quitSideJob(), name: () => (ctx ? ctx.job.name : ''), vehicle: () => (ctx ? ctx.vehicle : null),
    // samen spelen (#452, coopbijbaan.js): een gast vraagt een baan te starten, helpt in de baan, en ziet bij welk startpunt hij staat
    startVoor: (id, slot) => startOpVerzoek(id, slot),
    helperActie: (slot, x, y) => helperActie(slot, x, y),
    spotBij: (x, y) => spotBij(x, y),
  };
  w.onRespawn.push((ww, { busted }) => {
    if (ctx) endShift('dead', busted ? 'Opgepakt: de dienst zit erop' : 'Je bent neergegaan: de dienst zit erop');
  });
  debugApi = { start: (id) => startJob(BY_ID.get(id)), ctx: () => ctx, spots: () => spots, quit: () => quitSideJob(), progress: () => progress, last: () => lastEnd };
}

export function getSideJobSpotsForRender() {
  return spots;
}

// --- start ------------------------------------------------------------------

function blockReason(w) {
  if (ctx) return 'Je bent al aan het werk';
  if (w.wanted > 0) return 'Niet nu: eerst de politie kwijt';
  if (playerBusy(w, ['mission', 'activeRace']).busy) return 'Niet nu: maak eerst je missie af';
  if (w.time < cooldownUntil) return 'Even op adem komen...';
  return null;
}

function nearestSpot(w) {
  const p = hoofdspeler(w);
  if (w.pigeonMode || p.inVehicle || p.swimming || p.water) return null;
  let best = null, bd = USE_RADIUS;
  for (const s of spots) {
    const d = dist(s.x, s.y, p.x, p.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function makeCtx(job, spot) {
  const c = {
    world, job, spot,
    level: jobLevel(job.id),
    streak: 0, earned: 0, round: 0,
    timeLeft: null, vehicle: null, vehicleWord: job.vehicleWord || 'je voertuig',
    data: {}, peds: [], meshes: [], vehicles: [],
    nextRoundAt: 0, awayFor: 0, carrying: null, ended: false, flawless: true,
    msg: (text, s = 3) => world.addMessage(text, s),
    complete: (res) => completeRound(c, res),
    fail: (reason) => endShift('fail', reason),
    skip: (text) => skipRound(c, text),
    quit: (reason) => endShift('quit', reason),
    pay: (base) => payFor(c, base),
    addMesh: (m) => { const sc = getScene(); if (sc) sc.add(m); c.meshes.push(m); return m; },
    removeMesh: (m) => { if (m && m.parent) m.parent.remove(m); const i = c.meshes.indexOf(m); if (i >= 0) c.meshes.splice(i, 1); },
    track: (ped) => { c.peds.push(ped); return ped; },
    carry: (mesh, info) => startCarry(c, mesh, info),
    drop: () => stopCarry(c),
  };
  return c;
}

// Samen spelen (#452): een gast die bij een startpunt E drukt vraagt de host de baan te starten. Zelfde regels als bij de host zelf;
// de baan draait op de wereld van de host, de gast doet mee via coopbijbaan.js (Meedoen? J of N, volledige beloning per ronde).
let verzoekVan = null;
function startOpVerzoek(id, slot) {
  const job = BY_ID.get(id);
  if (!job || !world) return { ok: false, reden: 'Die bijbaan kennen we niet.' };
  const why = blockReason(world);
  if (why) return { ok: false, reden: why };
  verzoekVan = slot;
  let ok = false;
  try { ok = startJob(job); } finally { verzoekVan = null; }
  return { ok, reden: ok ? '' : `${job.name} kan nu niet beginnen` };
}
// Een hulpactie van een gast in de lopende baan (een krant gooien vanaf zijn plek); de baan beslist of dat kan.
function helperActie(slot, x, y) {
  const c = ctx;
  if (!c || c.ended || !c.job.helperActie) return false;
  try { return !!c.job.helperActie(c, { slot, x, y }); } catch (e) { crash(e); return false; }
}
// Het startpunt waar iemand staat (voor een gast die E drukt), of null.
function spotBij(x, y) {
  let best = null, bd = USE_RADIUS;
  for (const s of spots) {
    const d = dist(s.x, s.y, x, y);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { id: best.job.id, name: best.job.name } : null;
}

function startJob(job, takeover = null) {
  if (!job || ctx) return false;
  const spot = spots.find((s) => s.job === job) || { job, x: hoofdspeler(world).x, y: hoofdspeler(world).y };
  if (leftover && !(takeover && leftover === takeover.vehicle)) removeVehicle(world, leftover);
  leftover = null;
  const c = makeCtx(job, spot);
  c.takeover = takeover; // de dienst van een rijdende bus overnemen (#396): { vehicle, line, dir }
  let ok;
  try { ok = job.start(c); } catch (e) { console.error(e); ok = 'Er ging iets mis bij het klaarzetten'; }
  if (ok !== true) {
    cleanup(c);
    world.addMessage(typeof ok === 'string' ? ok : `${job.name} kan nu niet beginnen`, 3);
    return false;
  }
  ctx = c;
  c.opVerzoek = verzoekVan != null; // een gast vroeg erom: de host staat misschien ver weg, dus geen afbreken om de afstand voor iemand in het voertuig zit (#452)
  rec(job.id).shifts++;
  waarschuwVoorStart(world, 'bijbaan', job.id); // samen spelen: een melding als deze bijbaan nog niet samen werkt; de start gaat door
  if (world.coopBijbaanStart) { try { world.coopBijbaanStart(job.id, job.name, verzoekVan); } catch (e) { console.error(e); } } // uitnodiging voor de andere spelers (#452)
  const lvl = c.level;
  const kicker = `Bijbaantje · niveau ${lvl}: ${levelTitle(lvl)}`;
  const intro = !takeover && verzoekVan == null && !job.noIntro && !seen.has(job.id) && playMissionIntro(world, { kicker, title: job.name, objective: c.vehicle || null, ...introLines(job) });
  if (intro) seen.add(job.id);
  else {
    world.addMessage(`${job.name}: ${job.tagline || job.blurb}`, 3.5);
    if (Math.random() < 0.65) sayJobLine(job, 'greet');
    else sayDuoJobLine(hoofdspeler(world).character, 'start');
  }
  try { job.round(c); } catch (e) { crash(e); return false; }
  publish();
  return true;
}

// The boss's intro, timed to the recordings when every line has one.
function introLines(job) {
  const voiced = job.intro.map((text) => ({ text, v: jobVoiceFor(job.boss, text) }));
  if (!voiced.every((l) => l.v)) return { lines: job.intro.map((text) => ({ speaker: job.boss, text })) };
  let at = 0.5;
  const lines = voiced.map(({ text, v }) => {
    const l = { speaker: job.boss, text, at, dur: v.dur + 0.3, voice: v.src };
    at += v.dur + 0.3;
    return l;
  });
  return { lines, duration: at + 0.5 };
}

// --- rounds -----------------------------------------------------------------

// Het loon voor de ronde voor de loopbaan (#381): wat de bijbaan zelf betaalt, en dat keer de factor van het vak.
function basisFor(c, base) {
  const lvlMul = SIDEJOB_PAY_MULT * (1 + SIDEJOB_LEVEL_BONUS * (c.level - 1));
  const streakMul = 1 + 0.06 * Math.min(c.streak, 10);
  return Math.max(1, Math.round(base * lvlMul * streakMul * jobBonusHook.get()));
}
function payFor(c, base) {
  return Math.max(1, loopbaanLoon(vakVanBaan(c.job.id), basisFor(c, base)));
}

function completeRound(c, res = {}) {
  if (c !== ctx || c.ended) return;
  const base = Math.max(0, res.base || 0);
  const pay = payFor(c, base);
  const tip = Math.max(0, Math.round(res.tip || 0));
  const total = pay + tip;
  const vak = vakVanBaan(c.job.id);
  const xp = 8 + (res.flawless === false ? 0 : 2) + Math.max(0, Math.round(res.xp || 0)); // res.xp: extra loopbaanpunten (bus, #444)
  const hostMee = world.coopBijbaanHostMee ? world.coopBijbaanHostMee() !== false : true; // samen spelen (#452): wie N zei op Meedoen? krijgt geen loon en geen loopbaanpunten
  if (hostMee) { noteMoney('Bijbaantjes'); world.money += total; }
  // samen spelen: een baan met samen-regels (coopbijbaan.js) betaalt elke meespeler het volle bedrag (#452); een andere baan deelt zoals eerst (#365).
  // De gast verdient volgens zijn eigen niveau (#381): hij krijgt de basis en past zijn eigen loonfactor toe.
  const gedeeld = world.coopBijbaanBeloning ? world.coopBijbaanBeloning(c.job.id, basisFor(c, base) + tip, vak, xp, c.round) : false;
  if (!gedeeld && world.coopDeel) world.coopDeel(total, Array.isArray(res.coopSlots) ? { ...loopbaanDeel(vak, basisFor(c, base) + tip, xp), slots: res.coopSlots } : loopbaanDeel(vak, basisFor(c, base) + tip, xp));
  if (hostMee) loopbaanTel(world, vak, { n: 1, xp, uniek: c.job.id });
  c.earned += total;
  c.streak++;
  c.round++;
  if (res.flawless === false) c.flawless = false;
  const r = rec(c.job.id);
  const before = jobLevel(c.job.id);
  r.rounds++;
  r.earned += total;
  if (c.streak > r.bestStreak) r.bestStreak = c.streak;
  recordStat(world, 'sjRounds');
  recordStat(world, 'sjEarned', total);
  recordUnique(world, 'sjJobs', c.job.id);
  setStatMax(world, `sj_${c.job.id}_streak`, c.streak);
  setStatMax(world, `sj_${c.job.id}_shift`, c.earned);
  const after = jobLevel(c.job.id);
  const bits = [`+${euro(total)}`];
  if (tip) bits.push(`fooi ${euro(tip)}`);
  bits.push(`reeks ${c.streak}`);
  world.addMessage(`${res.text ? res.text + ' ' : ''}${bits.join(' · ')}`, 3.6);
  if (after > before) sayJobLine(c.job, 'level');
  else sayJobLine(c.job, 'done', 0.5);
  if (after > before) {
    c.level = after;
    world.addMessage(`${c.job.name}: niveau ${after}, ${levelTitle(after)}! Beter betaald, pittiger werk.`, 4.5);
    if (after >= 5) unlockAchievement(world, 'sj_legende');
  }
  if (c.streak % 5 === 0 && world.phoneNotifications && c.job.sikkom) {
    const say = SMS_SAY['job_' + c.job.id];
    world.phoneNotifications.push({ text: 'KIEKDOAR: ' + c.job.sikkom(c), duration: 4, say: say && say.lines[0] });
  }
  c.timeLeft = null;
  // a job that is played once (job.once: the ride to Tjalke, #411) ends its shift after the pay, not with a next round
  if (c.job.once) { endShift('quit', c.job.onceText || 'Klaar, in één keer'); return; }
  c.nextRoundAt = world.time + NEXT_ROUND_DELAY;
  c.betweenRounds = true;
}

// A round that went wrong without it being the player's fault: no pay, the
// streak is gone, and the next round comes as usual.
function skipRound(c, text) {
  if (c !== ctx || c.ended) return;
  c.streak = 0;
  c.flawless = false;
  if (text) world.addMessage(text, 4);
  c.timeLeft = null;
  c.nextRoundAt = world.time + NEXT_ROUND_DELAY;
  c.betweenRounds = true;
}

export function quitSideJob() {
  if (!ctx) return false;
  endShift('quit', 'Je hebt de dienst er zelf op zitten');
  return true;
}

function endShift(kind, reason = '') {
  const c = ctx;
  if (!c || c.ended) return;
  lastEnd = { kind, reason, job: c.job.id, streak: c.streak, earned: c.earned };
  c.ended = true;
  ctx = null;
  if (world.coopBijbaanEind) { try { world.coopBijbaanEind(kind); } catch (e) { console.error(e); } } // de anderen horen dat de baan voorbij is (#452)
  const job = c.job;
  const r = rec(job.id);
  const best = r.bestStreak;
  if (kind !== 'dead') {
    const title = kind === 'fail' ? 'KLUS MISLUKT' : kind === 'wanted' ? 'DIENST GESTAAKT' : 'DIENST VOORBIJ';
    const stats = [['Klussen', String(c.streak)], ['Verdiend', euro(c.earned)], ['Beste reeks', String(best)]];
    const pretty = reason ? reason[0].toUpperCase() + reason.slice(1) : '';
    showBanner({ kind: kind === 'quit' ? 'pass' : 'fail', title, reason: `${job.name}: ${pretty}`, reward: 0, stats });
  } else if (reason) {
    world.addMessage(reason, 3);
  }
  if (c.streak > 0 && c.streak === best && best >= 3) world.addMessage(`Nieuw record bij ${job.name}: ${best} klussen op rij!`, 4);
  if (kind === 'fail' || kind === 'wanted') sayJobLine(job, 'fail');
  else if (kind === 'quit' && c.streak > 0) sayDuoJobLine(hoofdspeler(world).character, 'end');
  try { job.stop(c); } catch (e) { console.error(e); }
  cleanup(c);
  cooldownUntil = world.time + RESTART_COOLDOWN;
  publish();
}

function cleanup(c) {
  stopCarry(c);
  for (const m of c.meshes) if (m.parent) m.parent.remove(m);
  c.meshes.length = 0;
  for (const p of c.peds) if (p.jobPed) removePed(world, p);
  c.peds.length = 0;
  for (const v of c.vehicles) {
    if (v === c.vehicle) continue;
    releaseVehicle(world, v);
    removeVehicle(world, v);
  }
  if (c.vehicle) {
    releaseVehicle(world, c.vehicle);
    leftover = c.vehicle;
    c.vehicle = null;
  }
}

function crash(e) {
  console.error(e);
  if (ctx) endShift('fail', 'de baas belt: er ging iets mis');
}

// --- per frame --------------------------------------------------------------

export function updateSideJobs(dt, w) {
  world = w;
  if (window.__debug && !window.__debug.sidejobs) window.__debug.sidejobs = debugApi;
  animateBadges(w);
  reanchor(w, dt);
  const c = ctx;
  if (!c) { publish(); updateBeacon(w); return; }
  if (w.pigeonMode) { endShift('quit', 'Een duif kan geen dienst draaien'); return; }
  if (w.wanted > 0 && !c.job.allowWanted && !forgiveAccident(c, w)) { endShift('wanted', 'met de politie achter je aan stuurt de baas je naar huis'); return; }
  if (isMissionActive()) { endShift('quit', 'er kwam een missie tussen'); return; }
  if (w.pendingRespawn) { publish(); updateBeacon(w); return; }

  try {
    if (!checkVehicle(dt, c)) return;
    if (c.timeLeft != null) {
      c.timeLeft -= dt;
      if (c.timeLeft <= 0) {
        c.timeLeft = 0;
        endShift('fail', c.job.timeout ? c.job.timeout(c) : 'tijd op');
        return;
      }
    }
    if (c.betweenRounds) {
      if (w.time >= c.nextRoundAt) { c.betweenRounds = false; c.job.round(c); }
    } else {
      c.job.update(dt, c);
    }
    if (ctx !== c) return;
    updateCarry(c);
  } catch (e) { crash(e); return; }
  publish();
  updateBeacon(w);
}

// Pedestrians step out in front of you: a traffic accident never ends a
// shift. The boss smooths it over with the police, but the streak and the
// flawless bonus are gone and each accident costs a bit more. Stars earned
// any other way (shooting, stealing) still send you home.
const ACCIDENT_FINE = SIDEJOB_ACCIDENT_FINE;
const ACCIDENT_LINES = [
  'KIEKDOAR: Stadjer aan het werk rijdt voetganger van de sokken, voetganger bestelt daarna gewoon een patatje',
  'KIEKDOAR: "Hij kwam uit het niets," zegt voetganger die midden op straat naar zijn telefoon stond te staren',
  'KIEKDOAR: Stadjer ontdekt dat de rijbaan geen stoep is, getuigen spreken van een leerzaam moment',
];
function forgiveAccident(c, w) {
  if (w.time - (w.lastPedHitAt ?? -Infinity) > 3 || w.wanted > 2) return false;
  c.accidents = (c.accidents || 0) + 1;
  c.streak = 0;
  c.flawless = false;
  const fine = Math.min(ACCIDENT_FINE * c.accidents, Math.max(0, w.money));
  noteMoney('Boetes');
  w.money -= fine;
  w.wanted = 0;
  w.addMessage(`Aanrijding! De baas sust het met de politie, maar je reeks is weg${fine ? ` en het kost je €${fine}` : ''}.`, 4);
  if (w.phoneNotifications) w.phoneNotifications.push({ text: ACCIDENT_LINES[(c.accidents - 1) % ACCIDENT_LINES.length], duration: 4 });
  return true;
}

function checkVehicle(dt, c) {
  const v = c.vehicle;
  const need = c.job.needsVehicle ? c.job.needsVehicle(c) : !!v;
  if (!need || !v) { c.awayFor = 0; return true; }
  const p = hoofdspeler(world);
  if (!world.vehicles.includes(v) || v.sunk) { endShift('fail', `${c.vehicleWord} is foetsie`); return false; }
  if (v.wrecked || v.disabled) { endShift('fail', `${c.vehicleWord} is afgeschreven`); return false; }
  if (p.inVehicle === v) { c.awayFor = 0; c.boarded = true; return true; }
  if (c.opVerzoek && !c.boarded) return true; // een gast startte de baan: de host loopt eerst naar het voertuig (#452)
  if (c.boarded) c.awayFor += dt;
  const d = dist(p.x, p.y, v.x, v.y);
  if (d > ABANDON_DIST || c.awayFor > ABANDON_TIME) {
    endShift('fail', `je liet ${c.vehicleWord} gewoon staan`);
    return false;
  }
  if ((d > 45 || p.inVehicle) && world.time - hintAt > 6) {
    hintAt = world.time;
    world.addMessage(`Terug naar ${c.vehicleWord}!`, 2.5);
  }
  return true;
}

// --- carrying (fietsen, dozen) -------------------------------------------------

function startCarry(c, mesh, info = {}) {
  stopCarry(c);
  const sc = getScene();
  if (sc && mesh) sc.add(mesh);
  c.carrying = { mesh, ...info };
  hoofdspeler(world).carrying = info.slow ?? 0.72;
  updateCarry(c);
}

function stopCarry(c) {
  const k = c.carrying;
  if (!k) return null;
  if (k.mesh && k.mesh.parent) k.mesh.parent.remove(k.mesh);
  c.carrying = null;
  const p = world && hoofdspeler(world);
  if (p) p.carrying = 0;
  return k;
}

function updateCarry(c) {
  const k = c.carrying;
  if (!k || !k.mesh) return;
  const p = hoofdspeler(world);
  if (p.inVehicle || p.water) { c.job.onCarryLost ? c.job.onCarryLost(c) : stopCarry(c); return; }
  const a = p.angle;
  const fwd = k.forward ?? 0.45;
  k.mesh.position.set(p.x + Math.cos(a) * fwd, (k.height ?? 0.55) + (p.z || 0), p.y + Math.sin(a) * fwd);
  k.mesh.rotation.set(0, -a + (k.yaw ?? 0), 0);
}

// --- interaction ----------------------------------------------------------------

// Runs before the shop/horeca/player E handlers.
export function trySideJobInteract(w) {
  const input = w.input;
  if (!input || isShopOpen() || isCinematicActive() || w.pigeonMode) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const consume = () => { input.consume('e'); input.consume('f'); return true; };
  if (ctx) {
    let used = false;
    try { used = ctx.job.interact ? ctx.job.interact(ctx) : false; } catch (e) { crash(e); return consume(); }
    if (used) return consume();
    if (ctx && ctx.carrying && !hoofdspeler(w).inVehicle) {
      w.addMessage(ctx.carrying.hint || 'Handen vol: eerst neerzetten', 2.2);
      return consume();
    }
    return false;
  }
  const s = nearestSpot(w);
  if (!s) return false;
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return consume(); }
  startJob(s.job);
  return consume();
}

// Waarom je de dienst van deze bus nu niet kunt overnemen (tekst), of null als het kan (#396).
export function busShiftBlock(w) { return blockReason(w); }

// De dienst van een lijnbus overnemen: de bijbaan Streekbus op de lijn, richting en volgende halte van deze bus.
export function startBusShift(w, vehicle, line, dir) {
  world = w;
  const why = blockReason(w);
  if (why) { w.addMessage(why, 2.5); return false; }
  return startJob(BY_ID.get('lijn'), { vehicle, line, dir });
}

export function sideJobPrompt(w) {
  if (ctx) {
    let pr = null;
    try { pr = ctx.job.prompt ? ctx.job.prompt(ctx) : null; } catch (e) { pr = null; }
    const k = ctx.carrying;
    if (!pr && k && !hoofdspeler(w).inVehicle) {
      const p = hoofdspeler(w);
      pr = { id: 'sj-carry', x: p.x, y: p.y, h: 2.3, key: 'E', label: 'Handen vol', sub: k.hint || 'Eerst neerzetten', dim: true };
    }
    return pr;
  }
  const s = nearestSpot(w);
  if (!s) return null;
  const why = blockReason(w);
  const lvl = jobLevel(s.job.id);
  const best = rec(s.job.id).bestStreak;
  const sub = why || `${s.job.blurb} · niveau ${lvl}${best ? ` · record ${best}` : ''}`;
  return { id: 'sj-' + s.job.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: `${s.job.kicker || 'Bijbaantje'}: ${s.job.name}`, sub, ring: true, dim: !!why };
}

export function sideJobSecondary(w) {
  const out = [];
  if (w.pigeonMode) return out;
  if (ctx) {
    if (ctx.job.secondary) { try { out.push(...ctx.job.secondary(ctx)); } catch (e) { /* ignore */ } }
    return out;
  }
  if (hoofdspeler(w).inVehicle) return out;
  const { x, y } = hoofdspeler(w);
  for (const s of spots) {
    if (Math.abs(s.x - x) > 20 || Math.abs(s.y - y) > 20) continue;
    out.push({ id: 'sj2-' + s.job.id, x: s.x, y: s.y, h: 2.2, label: s.job.name, sub: `${s.job.kicker || 'Bijbaantje'} · loop erheen en druk E`, kind: 'place' });
  }
  return out;
}


// --- published state ------------------------------------------------------------

function publish() {
  const c = ctx;
  pub.active = !!c;
  if (!c) {
    pub.id = null; pub.label = ''; pub.marker = null; pub.dots = []; pub.progress = ''; pub.timeLeft = null; pub.goal = null; pub.bus = null;
    return;
  }
  let v = {};
  try { v = c.job.view(c) || {}; } catch (e) { v = {}; }
  pub.id = c.job.id;
  pub.label = c.job.name;
  pub.color = c.job.color;
  pub.marker = v.marker && Number.isFinite(v.marker.x) ? v.marker : null;
  pub.dots = v.dots || [];
  pub.progress = v.progress || '';
  pub.timeLeft = c.timeLeft;
  pub.goal = v.goal || null;
  pub.bus = v.bus || null;
  if (c.betweenRounds) {
    pub.marker = null;
    pub.dots = [];
    pub.progress = `Klus ${c.streak} klaar · reeks ${c.streak}`;
    pub.goal = { label: 'Even wachten', desc: 'De volgende klus komt eraan' };
    return;
  }
  // on foot, away from both the job vehicle and the objective: point at the ride first
  const veh = c.vehicle, p = hoofdspeler(world);
  if (c.job.boardFirst && veh && p.inVehicle !== veh && world.vehicles.includes(veh) && !veh.wrecked) {
    const far = !pub.marker || dist(p.x, p.y, pub.marker.x, pub.marker.y) > 25;
    if (far && dist(p.x, p.y, veh.x, veh.y) > 2) {
      pub.marker = { x: veh.x, y: veh.y };
      const next = pub.goal ? pub.goal.label : '';
      pub.goal = { label: c.job.boardText || `Stap in ${c.vehicleWord}`, desc: next ? `Daarna: ${next[0].toLowerCase()}${next.slice(1)}` : '' };
    }
  }
}

// --- 3D: start badges and the objective beacon ------------------------------------

const padGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.04, 6);
const badgeMats = new Map();

function badgeTexture(job) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  hexPath(g, S / 2 - 6);
  g.fillStyle = job.color; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#f2ede0'; g.stroke();
  drawJobGlyph(g, job.glyph, 34, job.color);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildBadge3D(job, x, y) {
  let m = badgeMats.get(job.id);
  if (!m) {
    m = {
      sprite: new THREE.SpriteMaterial({ map: badgeTexture(job), transparent: true, depthWrite: false, fog: true }),
      pad: new THREE.MeshLambertMaterial({ color: new THREE.Color(job.color), transparent: true, opacity: 0.85 }),
    };
    badgeMats.set(job.id, m);
  }
  const group = new THREE.Group();
  group.position.set(x, 0, y);
  const pad = new THREE.Mesh(padGeo, m.pad);
  pad.position.y = 0.03;
  group.add(pad);
  const badge = new THREE.Sprite(m.sprite);
  badge.scale.set(0.56, 0.56, 1);
  badge.position.y = 2.3;
  group.add(badge);
  group.userData.badge = badge;
  group.userData.phase = Math.random() * Math.PI * 2;
  return group;
}

function animateBadges(w) {
  const t = performance.now() / 650;
  const p = hoofdspeler(w);
  for (const s of spots) {
    if (!s.mesh) continue;
    const near = Math.abs(s.x - p.x) < 120 && Math.abs(s.y - p.y) < 120;
    s.mesh.visible = near && !(ctx && ctx.job === s.job);
    if (near) s.mesh.userData.badge.position.y = 2.3 + Math.sin(t + s.mesh.userData.phase) * 0.06;
  }
}

let beacon = null;
const dotMeshes = [];
const beaconMats = {
  beam: new THREE.MeshBasicMaterial({ color: JOB_TARGET_COLOR, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
  ring: new THREE.MeshBasicMaterial({ color: JOB_TARGET_COLOR, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }),
  ground: new THREE.MeshBasicMaterial({ color: JOB_TARGET_COLOR, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  dot: new THREE.MeshBasicMaterial({ color: JOB_TARGET_COLOR, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }),
};
const dotGeo = new THREE.SphereGeometry(0.32, 10, 8);

function buildBeacon(scene) {
  beacon = buildWorldMarker3D('job');
  beacon.visible = false;
  scene.add(beacon);
}

function updateBeacon(w) {
  if (!beacon) return;
  const navVisible = document.body.classList.contains('game-started') && !w.pigeonMode && !w.cinematicHideNav;
  const m = pub.active ? pub.marker : null;
  beacon.visible = !!m && navVisible;
  if (m) {
    beacon.position.set(m.x, 0, m.y);
    const t = w.time;
    updateWorldMarker3D(beacon, t);
  }
  const dots = pub.active ? pub.dots : [];
  const scene = beacon.parent;
  while (dotMeshes.length < Math.min(dots.length, 24) && scene) {
    const d = new THREE.Mesh(dotGeo, beaconMats.dot);
    scene.add(d);
    dotMeshes.push(d);
  }
  for (let i = 0; i < dotMeshes.length; i++) {
    const d = dotMeshes[i], p = dots[i];
    d.visible = !!p && navVisible;
    if (p) d.position.set(p.x, (p.h ?? 2.2) + Math.sin(w.time * 3 + i) * 0.12, p.y);
  }
}

// --- map icons ------------------------------------------------------------------

function hexPath(g, r) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
}

// Cream pictogram per job in a unit box (-1..1).
export function drawJobGlyph(g, glyph, r, bg) {
  g.save();
  g.scale(r, r);
  g.fillStyle = '#f2ede0';
  g.strokeStyle = '#f2ede0';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 0.14;
  g.beginPath();
  switch (glyph) {
    case 'bezorger':
      g.rect(-0.62, -0.34, 1.24, 0.9);
      g.fill();
      g.fillStyle = bg;
      g.fillRect(-0.62, -0.08, 1.24, 0.12);
      g.beginPath(); g.moveTo(-0.3, -0.34); g.quadraticCurveTo(0, -0.8, 0.3, -0.34); g.stroke();
      break;
    case 'taxi':
      g.moveTo(-0.84, 0.36); g.lineTo(-0.84, 0.04); g.lineTo(-0.5, -0.04); g.lineTo(-0.3, -0.36); g.lineTo(0.3, -0.36);
      g.lineTo(0.52, -0.04); g.lineTo(0.84, 0.04); g.lineTo(0.84, 0.36); g.closePath();
      g.fill();
      g.fillRect(-0.2, -0.62, 0.4, 0.2);
      g.fillStyle = bg;
      for (const wx of [-0.46, 0.46]) { g.beginPath(); g.arc(wx, 0.38, 0.17, 0, Math.PI * 2); g.fill(); }
      break;
    case 'bus':
      g.roundRect(-0.6, -0.72, 1.2, 1.26, 0.18);
      g.fill();
      g.fillStyle = bg;
      g.fillRect(-0.46, -0.52, 0.92, 0.46);
      g.beginPath(); g.arc(-0.3, 0.26, 0.1, 0, Math.PI * 2); g.arc(0.3, 0.26, 0.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f2ede0';
      g.fillRect(-0.5, 0.54, 0.24, 0.2); g.fillRect(0.26, 0.54, 0.24, 0.2);
      break;
    case 'rondvaart':
      g.moveTo(-0.86, -0.06); g.lineTo(0.86, -0.06); g.lineTo(0.6, 0.3); g.lineTo(-0.66, 0.3); g.closePath();
      g.fill();
      g.fillRect(-0.4, -0.42, 0.7, 0.3);
      g.lineWidth = 0.1;
      g.beginPath();
      g.moveTo(-0.86, 0.56); g.quadraticCurveTo(-0.64, 0.42, -0.43, 0.56); g.quadraticCurveTo(-0.21, 0.7, 0, 0.56);
      g.quadraticCurveTo(0.21, 0.42, 0.43, 0.56); g.quadraticCurveTo(0.64, 0.7, 0.86, 0.56);
      g.stroke();
      break;
    case 'fietsdepot':
      g.lineWidth = 0.12;
      g.arc(-0.46, 0.3, 0.3, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0.46, 0.3, 0.3, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-0.46, 0.3); g.lineTo(-0.1, -0.2); g.lineTo(0.28, -0.2); g.lineTo(0.46, 0.3);
      g.moveTo(-0.46, 0.3); g.lineTo(0.04, 0.3); g.lineTo(0.28, -0.2); g.stroke();
      g.beginPath(); g.moveTo(0.1, -0.78); g.lineTo(0.62, -0.78); g.lineTo(0.62, -0.42); g.lineTo(0.1, -0.42); g.lineTo(-0.04, -0.6); g.closePath(); g.fill();
      break;
    case 'vracht':
      g.rect(-0.9, -0.4, 1.1, 0.8);
      g.rect(0.28, -0.1, 0.62, 0.5);
      g.fill();
      g.beginPath(); g.arc(-0.5, 0.5, 0.17, 0, Math.PI * 2); g.arc(0.55, 0.5, 0.17, 0, Math.PI * 2); g.fill();
      break;
    case 'verhuizing':
      g.moveTo(-0.66, -0.3); g.lineTo(0.66, -0.3); g.lineTo(0.66, 0.66); g.lineTo(-0.66, 0.66); g.closePath();
      g.fill();
      g.beginPath(); g.moveTo(-0.66, -0.3); g.lineTo(-0.9, -0.62); g.lineTo(-0.3, -0.62); g.lineTo(-0.1, -0.3);
      g.moveTo(0.66, -0.3); g.lineTo(0.9, -0.62); g.lineTo(0.3, -0.62); g.lineTo(0.1, -0.3); g.fill();
      g.fillStyle = bg;
      g.fillRect(-0.08, -0.3, 0.16, 0.96);
      break;
    case 'boa':
      g.roundRect(-0.5, -0.66, 1.0, 1.32, 0.12);
      g.fill();
      g.fillStyle = bg;
      for (const y of [-0.34, -0.06, 0.22]) g.fillRect(-0.3, y, 0.6, 0.1);
      break;
    case 'rechtbank':
      g.moveTo(-0.8, -0.2); g.lineTo(0, -0.7); g.lineTo(0.8, -0.2); g.closePath();
      g.fill();
      for (const x of [-0.55, -0.18, 0.18, 0.55]) g.fillRect(x - 0.07, -0.12, 0.14, 0.6);
      g.fillRect(-0.8, 0.54, 1.6, 0.14);
      break;
    case 'cabaret':
      g.arc(0, -0.08, 0.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = bg;
      g.beginPath(); g.arc(-0.22, -0.2, 0.09, 0, Math.PI * 2); g.arc(0.22, -0.2, 0.09, 0, Math.PI * 2); g.fill();
      g.lineWidth = 0.1; g.strokeStyle = bg;
      g.beginPath(); g.arc(0, 0.04, 0.3, 0.2, Math.PI - 0.2); g.stroke();
      break;
    case 'museumbus':
      g.roundRect(-0.7, -0.5, 1.4, 1.0, 0.3);
      g.fill();
      g.fillStyle = bg;
      for (const x of [-0.46, -0.1, 0.26]) g.fillRect(x, -0.3, 0.26, 0.3);
      g.beginPath(); g.arc(-0.4, 0.5, 0.17, 0, Math.PI * 2); g.arc(0.4, 0.5, 0.17, 0, Math.PI * 2); g.fill();
      break;
    case 'suikerbieten':
      g.moveTo(0, 0.7); g.quadraticCurveTo(-0.8, 0.2, -0.4, -0.3); g.quadraticCurveTo(0, -0.6, 0.4, -0.3); g.quadraticCurveTo(0.8, 0.2, 0, 0.7);
      g.fill();
      g.beginPath(); g.moveTo(-0.15, -0.4); g.lineTo(-0.3, -0.85); g.moveTo(0.05, -0.42); g.lineTo(0.1, -0.9); g.moveTo(0.25, -0.38); g.lineTo(0.5, -0.8); g.stroke();
      break;
    case 'herstelploeg':
      g.moveTo(-0.7, -0.1); g.lineTo(0, -0.7); g.lineTo(0.7, -0.1); g.lineTo(0.5, -0.1); g.lineTo(0.5, 0.6); g.lineTo(-0.5, 0.6); g.lineTo(-0.5, -0.1); g.closePath();
      g.fill();
      g.fillStyle = bg;
      g.fillRect(-0.12, 0.1, 0.24, 0.5);
      break;
    case 'oogtv':
      g.roundRect(-0.8, -0.35, 1.1, 0.8, 0.1);
      g.fill();
      g.beginPath(); g.moveTo(0.4, -0.05); g.lineTo(0.85, -0.35); g.lineTo(0.85, 0.45); g.lineTo(0.4, 0.15); g.closePath(); g.fill();
      g.fillStyle = bg;
      g.beginPath(); g.arc(-0.25, 0.05, 0.2, 0, Math.PI * 2); g.fill();
      break;
    case 'schouwburg':
      g.arc(0, 0, 0.62, 0, Math.PI);
      g.fill();
      g.fillRect(-0.62, 0.0, 1.24, 0.12);
      break;
    case 'bernardrit':
      g.roundRect(-0.5, -0.1, 1.0, 0.55, 0.1);
      g.fill();
      g.beginPath(); g.arc(-0.3, 0.55, 0.15, 0, Math.PI * 2); g.arc(0.3, 0.55, 0.15, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(0, -0.1); g.lineTo(0, -0.7); g.stroke();
      break;
    case 'vandermeden':
      g.arc(0, 0, 0.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = bg;
      g.fillRect(-0.4, -0.08, 0.8, 0.16);
      break;
    case 'telefoonrave':
      g.rect(-0.7, -0.2, 0.5, 0.4);
      g.fill();
      g.beginPath(); g.moveTo(-0.2, -0.2); g.lineTo(0.2, -0.55); g.lineTo(0.2, 0.55); g.lineTo(-0.2, 0.2); g.closePath(); g.fill();
      g.beginPath(); g.arc(0.2, 0, 0.38, -0.9, 0.9); g.stroke();
      g.beginPath(); g.arc(0.2, 0, 0.65, -0.9, 0.9); g.stroke();
      break;
    case 'loket':   // a stamp: handle, neck, base
      g.roundRect(-0.28, -0.74, 0.56, 0.4, 0.14);
      g.fill();
      g.fillRect(-0.12, -0.36, 0.24, 0.36);
      g.fillRect(-0.7, 0.0, 1.4, 0.3);
      g.fillRect(-0.7, 0.44, 1.4, 0.12);
      break;
    case 'studiestaat':   // two coins
      g.arc(-0.22, 0.12, 0.42, 0, Math.PI * 2);
      g.fill();
      g.beginPath(); g.arc(0.3, -0.24, 0.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = bg;
      g.fillRect(0.2, -0.4, 0.2, 0.32);
      break;
    case 'vigilantia':   // a glass raised
      g.moveTo(-0.5, -0.64); g.lineTo(0.5, -0.64); g.lineTo(0.16, 0.14); g.lineTo(-0.16, 0.14); g.closePath();
      g.fill();
      g.fillRect(-0.06, 0.12, 0.12, 0.46);
      g.fillRect(-0.4, 0.56, 0.8, 0.12);
      break;
    case 'promotie':   // a mortarboard with its tassel
      g.moveTo(0, -0.62); g.lineTo(0.9, -0.16); g.lineTo(0, 0.3); g.lineTo(-0.9, -0.16); g.closePath();
      g.fill();
      g.beginPath(); g.moveTo(-0.5, 0.06); g.lineTo(-0.5, 0.5); g.quadraticCurveTo(0, 0.82, 0.5, 0.5); g.lineTo(0.5, 0.06); g.lineTo(0, 0.3); g.closePath(); g.fill();
      g.lineWidth = 0.1;
      g.beginPath(); g.moveTo(0.8, -0.12); g.lineTo(0.8, 0.4); g.stroke();
      break;
    case 'kamerkoning':   // a crown
      g.moveTo(-0.72, 0.5); g.lineTo(-0.72, -0.34); g.lineTo(-0.36, 0.04); g.lineTo(0, -0.5); g.lineTo(0.36, 0.04); g.lineTo(0.72, -0.34); g.lineTo(0.72, 0.5);
      g.closePath();
      g.fill();
      break;
    case 'wolkenhal':   // a cloud
      g.arc(-0.34, 0.12, 0.36, 0, Math.PI * 2);
      g.fill();
      g.beginPath(); g.arc(0.02, -0.18, 0.44, 0, Math.PI * 2); g.arc(0.4, 0.14, 0.34, 0, Math.PI * 2); g.fill();
      g.fillRect(-0.34, 0.12, 0.74, 0.36);
      break;
    case 'helix':   // a spiral
      g.lineWidth = 0.16;
      for (let a = 0.2; a < 9; a += 0.2) { const r = 0.07 * a; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      g.stroke();
      break;
    case 'niemeyer':   // a robot head
      g.roundRect(-0.56, -0.4, 1.12, 0.92, 0.16);
      g.fill();
      g.fillRect(-0.05, -0.72, 0.1, 0.32);
      g.fillStyle = bg;
      g.beginPath(); g.arc(-0.22, -0.06, 0.12, 0, Math.PI * 2); g.arc(0.22, -0.06, 0.12, 0, Math.PI * 2); g.fill();
      g.fillRect(-0.28, 0.2, 0.56, 0.1);
      break;
    case 'energielabel':   // a house with a label bar
      g.moveTo(-0.8, -0.04); g.lineTo(0, -0.74); g.lineTo(0.8, -0.04); g.closePath();
      g.fill();
      g.fillRect(-0.58, -0.04, 1.16, 0.7);
      g.fillStyle = bg;
      for (const [i, w] of [[0, 0.3], [1, 0.46], [2, 0.62], [3, 0.78]]) g.fillRect(-0.46, 0.04 + i * 0.15, w, 0.09);
      break;
    case 'tjalke':   // a traffic cone with a white band
      g.moveTo(0, -0.78); g.lineTo(0.5, 0.5); g.lineTo(-0.5, 0.5); g.closePath();
      g.fill();
      g.fillRect(-0.74, 0.5, 1.48, 0.2);
      g.fillStyle = bg;
      g.fillRect(-0.3, -0.1, 0.6, 0.16);
      break;
    case 'bernard':   // an umbrella
      g.moveTo(-0.84, 0.0); g.quadraticCurveTo(0, -1.0, 0.84, 0.0); g.quadraticCurveTo(0.42, -0.14, 0, 0.0); g.quadraticCurveTo(-0.42, -0.14, -0.84, 0.0);
      g.fill();
      g.lineWidth = 0.12;
      g.beginPath(); g.moveTo(0, 0.0); g.lineTo(0, 0.6); g.quadraticCurveTo(0, 0.82, 0.22, 0.82); g.stroke();
      break;
    case 'krant':   // a rolled-up newspaper with a band
      g.roundRect(-0.78, -0.3, 1.56, 0.6, 0.3);
      g.fill();
      g.fillStyle = bg;
      g.fillRect(-0.12, -0.3, 0.24, 0.6);
      g.fillStyle = '#f2ede0';
      g.fillRect(-0.62, -0.08, 0.34, 0.06); g.fillRect(0.28, 0.06, 0.34, 0.06);
      break;
    case 'snackbar':   // a paper cone of chips with three chips sticking out
      g.moveTo(-0.5, -0.1); g.lineTo(0.5, -0.1); g.lineTo(0.28, 0.78); g.lineTo(-0.28, 0.78); g.closePath();
      g.fill();
      g.lineWidth = 0.16;
      g.beginPath(); g.moveTo(-0.3, -0.14); g.lineTo(-0.42, -0.7); g.moveTo(0, -0.14); g.lineTo(0.02, -0.82); g.moveTo(0.3, -0.14); g.lineTo(0.44, -0.66); g.stroke();
      g.fillStyle = bg;
      g.fillRect(-0.3, 0.2, 0.6, 0.14);
      break;
    default:
      g.arc(0, 0, 0.5, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// 'sj-<id>' start badge, 'sj-target' current objective, 'sj-dot' secondary target.
export function drawSideJobMapIcon(ctx2, kind, s, opts = {}) {
  const t = opts.t ?? performance.now() / 1000;
  if (kind === 'sj-target') {
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    ctx2.beginPath();
    ctx2.arc(0, 0, (5.4 + pulse * 1.4) * s, 0, Math.PI * 2);
    ctx2.lineWidth = 3.4 * s; ctx2.strokeStyle = 'rgba(0,0,0,0.6)'; ctx2.stroke();
    ctx2.lineWidth = 2 * s; ctx2.strokeStyle = JOB_TARGET_COLOR; ctx2.stroke();
    ctx2.beginPath();
    ctx2.arc(0, 0, 2.6 * s, 0, Math.PI * 2);
    ctx2.fillStyle = JOB_TARGET_COLOR; ctx2.fill();
    ctx2.lineWidth = 0.8 * s; ctx2.strokeStyle = '#0c140e'; ctx2.stroke();
    return;
  }
  if (kind === 'sj-dot') {
    ctx2.beginPath();
    ctx2.arc(0, 0, 2.5 * s, 0, Math.PI * 2);
    ctx2.fillStyle = 'rgba(255, 154, 60, 0.75)'; ctx2.fill();
    ctx2.lineWidth = 0.8 * s; ctx2.strokeStyle = '#0c140e'; ctx2.stroke();
    return;
  }
  const job = BY_ID.get(kind.slice(3)) || SIDE_JOBS[0];
  hexPath(ctx2, 5 * s);
  ctx2.fillStyle = job.color;
  ctx2.fill();
  ctx2.lineWidth = 1.2 * s;
  ctx2.strokeStyle = '#0c140e';
  ctx2.stroke();
  drawJobGlyph(ctx2, job.glyph, 3.3 * s, job.color);
}

// --- save -------------------------------------------------------------------------

export function getSideJobSave() {
  const jobs = {};
  for (const [id, r] of Object.entries(progress)) if (BY_ID.has(id)) jobs[id] = { ...r };
  return { v: 1, jobs, seen: [...seen] };
}

export function applySideJobSave(w, d) {
  if (ctx) {
    const c = ctx;
    c.ended = true;
    ctx = null;
    try { c.job.stop(c); } catch (e) { /* ignore */ }
    cleanup(c);
    publish();
  }
  progress = {};
  seen = new Set();
  if (!d || typeof d !== 'object' || d.v !== 1) return;
  const n = (v) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  for (const [id, r] of Object.entries(d.jobs || {})) {
    if (!BY_ID.has(id) || !r || typeof r !== 'object') continue;
    progress[id] = { rounds: n(r.rounds), earned: n(r.earned), bestStreak: n(r.bestStreak), shifts: n(r.shifts) };
  }
  if (Array.isArray(d.seen)) for (const id of d.seen) if (BY_ID.has(id)) seen.add(id);
}
