// Free-roam activities outside the story: carbid schieten on a field in the
// Ommelanden (carbid.js), the botsautootjes on the kermis at the Grote Markt
// (kermis.js), the hidden little things around town (geheimen.js), the
// drift zones, and Minigames batch 1: discgolf and pitch & putt around the
// Stadspark, the skatepark there and the kart track at Kardinge; batch 2: the
// swimming pool, the climbing tower and the water-ski lake (standactivity.js); the flying school on Eelde (vliegschool.js). One
// list, so the prompts, the E key, the frame loop, the maps, Ubbo and the
// spot check each have a single hook here instead of one per activity.
//
// An activity: { id, init(w), spots() -> [{ x, y, name, id }], prompt(w),
// secondary(w), interact(w) -> handled, active() -> its minigame runs, quit(w),
// update(dt, w) while active (instead of the player update), tick(dt, w)
// every frame, camera(w) while active, and for the maps: layer, legend
// { kind, label, note }, icon(ctx, s), mapSub(spot, w), ubbo(w) }.
// While a minigame runs, `world.activityGame` is its id; it claims the
// mouse buttons, number keys and Space through `world.minigameUntil`.
import { CARBID } from './carbid.js';
import { KERMIS } from './kermis.js';
import { HOOGVLIEGER } from './reuzenrad.js';
import { GEHEIMEN } from './geheimen.js';
import { DRIFT_ZONE } from './driftzone.js';
import { DISCGOLF } from './discgolf.js';
import { PITCHPUTT } from './pitchputt.js';
import { SKATEPARK } from './skatepark.js';
import { KARTBAAN } from './kartbaan.js';
import { ZWEMBAD } from './zwembad.js';
import { KLIMTOREN } from './klimtoren.js';
import { WATERSKI } from './waterski.js';
import { CARILLON_GAME } from './carillon.js';
import { PANNENKOEK } from './pannenkoek.js';
import { HENGELEN } from './hengelen.js';
import { WANDELING } from './wandeling.js';
import { SNACKKETEN } from './snackketen.js';
import { EVENEMENTEN } from './evenementenact.js';
import { REGATTA_GAME } from './regatta.js';
import { VLIEGSCHOOL } from './vliegschool.js';
import { SAFEHUIS } from './safehuizen.js';
import { PVP_ARENA_ACT } from './cooppvpwereld.js'; // de PvP-minigame in Samen spelen (#454)
import { maakVluchtdienst, vluchtStap, vluchtStand, vluchtUitslag } from './arcadeplane.js';
import { maakVaardienst, vaarStap, vaarStand, vaarUitslag } from './zeilvaren.js';
import { rondvluchtRoute, kadesLangsRoute, margeVoorDienst, dienstBordRij } from './simdienst.js';
import { pickTrip, getSharedNet } from './vaarnet.js';
import { isShopOpen } from './shopui.js';
import { GAST_ACTIVITEITEN, MELDING_ALLEEN_OPENER } from './coopgast.js';
import { waarschuwVoorStart, samenWaarschuwing } from './coopstatus.js';
import { isCinematicActive, showBanner } from './cinematics.js';
import { getScene } from './scene3d.js';
import { showCard } from './hudcards.js';
import { gameUi, mgThema, createBoard, key, stopPressed } from './minigamekit.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { registerBusyProbe, registerQuitHook } from './busy.js';
export { activityBlock, iconDisc };

Object.assign(gameUi, { getScene, showBanner, showCard });

// --- simulator services (#444): the flight and the boat service in the world ----------------
// The rules live in simdienst.js, arcadeplane.js and zeilvaren.js (pure, with tests). This is
// only the start: walk to the Kist on the field or to a boat at a jetty, press E (you board and
// the service starts), and the board shows the next stop. The player keeps the controls: the
// activity does not take the game over (active() is false), like the regatta. Backspace stops.
// Samen spelen: the service belongs to whoever opened the game. A guest cannot start it (not in
// GAST_ACTIVITEITEN) and sees no board, because his tick does not run.
let havens = null;
function laadHavens() {
  if (havens || typeof fetch === 'undefined' || typeof location === 'undefined') return;
  havens = [];
  fetch(new URL('marinas.json', location.href).href).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && Array.isArray(j.marinas)) havens = j.marinas; }).catch(() => {});
}

// The nearest marina within the jetties (as the regatta does, regattaplas.js kiesPlek).
function havenBij(w) {
  const p = w.player, v = p.inVehicle;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  let best = null;
  for (const m of havens || []) {
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < 120 && (!best || d < best.d)) best = { m, d };
  }
  return best ? { x: best.m.x, y: best.m.y, naam: best.m.name } : null;
}

// The Kist as arcadeplane.js reads it (v.plane comes from attachPlane).
function vliegtuigStaat(v) {
  const p = v.plane || {};
  return {
    x: v.x, y: v.y, z: v.z, speed: Math.abs(v.speed || 0), onGround: !!v.onGround,
    roll: p.roll || 0, flaps: p.flaps || 0, gear: p.gear !== false, landing: p.landing || null,
    crashed: !!(p.crashed || v.wrecked),
  };
}

function dienstStats(u) {
  const stats = [['Halten', `${u.gehaald}/${u.totaal}`], ['Op tijd', `${u.punctueel}%`], ['Veilig', `${u.veilig}%`], ['Punten', String(u.punten)]];
  if (u.landing) stats.push(['Landing', u.landing === 'zacht' ? 'zacht' : 'hard']);
  if (u.gemist) stats.push(['Gemist', String(u.gemist)]);
  if (u.medaille) stats.push(['Medaille', u.medailleNaam]);
  return stats;
}

// One service as an activity: the start, the board and the result. cfg supplies the vehicle.
function dienstActiviteit(cfg) {
  let worldRef = null;
  let run = null;
  let board = null;

  const plek = (w) => { try { return cfg.plek(w); } catch (e) { return null; } };

  // The vehicle for this service: the one the player is in, or a free one standing at the start
  // spot (the Kist on the field, a boat at the jetty) so E can board it.
  function voertuig(w) {
    const p = w.player;
    if (cfg.inVoertuig(p.inVehicle)) return p.inVehicle;
    let best = null;
    for (const v of w.vehicles) {
      if (!cfg.inVoertuig(v) || v.driver || v.wrecked || v.sinking) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d <= cfg.instap && (!best || d < best.d)) best = { v, d };
    }
    return best ? best.v : null;
  }

  function dichtbij(w, v) {
    const s = plek(w);
    const p = v || w.player.inVehicle;
    if (!s || !p) return null;
    return Math.hypot(p.x - s.x, p.y - s.y) <= cfg.reik ? s : null;
  }

  function start(w) {
    if (run) return false;
    const v = w.player.inVehicle;
    if (!cfg.inVoertuig(v)) { w.addMessage(cfg.stapIn, 3); return false; }
    const s = dichtbij(w, v);
    if (!s) { w.addMessage(cfg.geenPlek, 3); return false; }
    const d = cfg.maak(w, v, s);
    if (!d) { w.addMessage(cfg.geenRoute, 3); return false; }
    run = { d, v, flash: '', flashT: 0, bad: false, klok: 0 };
    if (!board) board = createBoard(cfg.titel, cfg.accent);
    board.show();
    gameUi.showCard(w, { kind: 'tip', kicker: cfg.label, title: cfg.kaartTitel, body: cfg.kaartBody, duration: 11, key: cfg.id + '-help', voice: false });
    return true;
  }

  function stop(w, { afgebroken = false } = {}) {
    const r = run;
    if (!r) return;
    run = null;
    if (board) board.hide();
    if (afgebroken) { w.addMessage('Dienst gestopt', 2.5); return; }
    const u = cfg.uitslag(r.d);
    gameUi.showBanner({
      kind: u.medaille ? 'pass' : 'fail',
      title: (u.medaille === 3 ? `${cfg.label} met goud` : u.medaille ? `${cfg.label} gehaald` : `${cfg.label} zonder medaille`).toUpperCase(),
      reason: u.medaille ? 'Alle halten van de dienstregeling, zonder brokken' : 'Let op de halten, de tijd en de snelheid',
      stats: dienstStats(u),
    });
  }

  function meld(e) {
    run.bad = false;
    if (e.soort === 'halte') {
      run.flash = e.opTijd ? `${e.halte.naam}: gehaald, op tijd` : `${e.halte.naam}: gehaald, ${Math.round(e.late)} s te laat`;
      run.flashT = 4;
    } else if (e.soort === 'gemist') {
      run.flash = `${e.halte.naam} gemist`; run.flashT = 5; run.bad = true;
    } else if (e.soort === 'tehard') {
      run.flash = `Te hard: ${e.snelheid} m/s (max ${e.max})`; run.flashT = 4; run.bad = true;
    } else if (e.soort === 'mislukt') {
      run.flash = e.reden === 'crash' ? 'Crash: de dienst stopt' : 'De dienst stopt'; run.flashT = 6; run.bad = true;
    } else if (e.soort === 'klaar') {
      run.flash = 'Dienst klaar'; run.flashT = 6;
    }
  }

  function teken(v) {
    if (!board || !run) return;
    const d = run.d, stand = cfg.stand(d);
    const rows = dienstBordRij(stand, { klok: run.klok, ...(cfg.extra ? cfg.extra(v) : {}) });
    board.set({
      row: rows.map(([k, val]) => `<span>${k} <b>${val}</b></span>`).join(''),
      cells: d.halten.map((h, i) => ({ t: `${i + 1}`, cls: i < d.i ? (d.gemist.some((g) => g.index === i) ? 'bad' : 'good') : i === d.i ? 'on' : '' })),
      meter: { v: stand.voortgang, text: `${Math.round(stand.voortgang * 100)}%` },
      flash: run.flash,
      bad: run.bad,
      help: cfg.help,
    });
  }

  function tick(dt, w) {
    worldRef = w;
    if (!run) return;
    if (run.flashT > 0 && (run.flashT -= dt) <= 0) { run.flash = ''; run.bad = false; }
    if (w.pendingRespawn || stopPressed(w.input)) { stop(w, { afgebroken: true }); return; }
    const v = w.player.inVehicle;
    if (!cfg.inVoertuig(v) || v !== run.v) { stop(w, { afgebroken: true }); return; }
    run.klok += dt;
    for (const e of cfg.stap(run.d, v, dt)) meld(e);
    teken(v);
    if (run.d.klaar || run.d.mislukt) stop(w);
  }

  return {
    id: cfg.id,
    layer: cfg.id,
    legend: { kind: 'act-' + cfg.id, label: cfg.label, note: cfg.note },
    init(w) {
      worldRef = w;
      window['__' + cfg.id] = {
        spot: () => plek(w),
        start: () => start(w),
        state: () => (run ? cfg.stand(run.d) : null),
        uitslag: () => (run ? cfg.uitslag(run.d) : null),
        quit: () => { if (!run) return false; stop(w, { afgebroken: true }); return true; },
      };
    },
    spots() {
      const s = worldRef ? plek(worldRef) : null;
      return s ? [{ id: cfg.id, name: cfg.naam, x: s.x, y: s.y, mode: cfg.mode] } : [];
    },
    prompt(w) {
      // on foot: E boards the Kist or the boat at the start spot and starts the service
      if (run || w.player.inVehicle) return null;
      const s = plek(w);
      if (!s || Math.hypot(w.player.x - s.x, w.player.y - s.y) > cfg.reik) return null;
      const v = voertuig(w);
      if (!v) return null;
      const why = activityBlock(w);
      return { id: cfg.id, x: v.x, y: v.y, h: 2.4, key: 'E', label: cfg.label, sub: why || cfg.stapIn, ring: true, dim: !!why };
    },
    secondary(w) {
      if (run) return [];
      const v = w.player.inVehicle;
      const s = plek(w);
      if (!s) return [];
      // prompts.js stays quiet in a vehicle: a place label says that E starts the service
      if (cfg.inVoertuig(v)) {
        if (!dichtbij(w, v) || (cfg.mag && !cfg.mag(w, v))) return [];
        return [{ id: cfg.id + '-start', x: s.x, y: s.y, h: 2.4, label: cfg.label, sub: cfg.startSub, kind: 'place' }];
      }
      if (Math.hypot(w.player.x - s.x, w.player.y - s.y) > cfg.reik || !voertuig(w)) return [];
      return [{ id: cfg.id + '-2', x: s.x, y: s.y, h: 2.4, label: cfg.naam, sub: cfg.stapIn, kind: 'place' }];
    },
    interact(w) {
      if (run) return false;
      const v = w.player.inVehicle;
      if (cfg.inVoertuig(v)) {
        if (!dichtbij(w, v) || (cfg.mag && !cfg.mag(w, v))) return false;
        const why = activityBlock(w);
        if (why) { w.addMessage(why, 2.5); return true; }
        return start(w);
      }
      if (v || w.player.swimming) return false;
      const doel = plek(w) ? voertuig(w) : null; // on foot: step in and start
      if (!doel) return false;
      const why = activityBlock(w);
      if (why) { w.addMessage(why, 2.5); return true; }
      w.player.enterVehicle(doel, w);
      return start(w);
    },
    active: () => false, // the player keeps the controls
    quit: (w) => { if (run) stop(w, { afgebroken: true }); },
    update: () => {},
    tick,
    icon(ctx, s) { iconDisc(ctx, s, cfg.accent); ctx.save(); ctx.scale(s, s); cfg.glyph(ctx); ctx.restore(); },
    mapSub: () => cfg.note,
    ubbo: () => null,
  };
}

const VLUCHTDIENST = dienstActiviteit({
  id: 'vluchtdienst',
  titel: 'RONDVLUCHT',
  label: 'Rondvlucht',
  naam: 'Rondvlucht bij het veld',
  note: 'een rondvlucht met de Kist: twee poorten en terug op het veld, met een medaille',
  accent: '#e7b83a',
  mode: 'air',
  inVoertuig: (v) => !!(v && v.isPlane),
  mag: (w, v) => !!v.onGround,
  plek: (w) => { const s = w.planeStrip; if (!s) return null; const p = s.point(30); return { x: p.x, y: p.y }; },
  reik: 420, // het hele veld: na de landing mag je meteen weer
  instap: 12,
  stapIn: 'Instappen en de rondvlucht starten',
  startSub: 'Druk E om de rondvlucht te starten',
  geenPlek: 'Zoek eerst het veld bij Eelde op',
  geenRoute: 'De route kon hier niet worden uitgezet',
  help: `${key('W')}${key('S')} gas · ${key('A')}${key('D')} rollen · ${key('SPATIE')} neus omhoog · ${key('K')} kleppen · ${key('BACKSPACE')} stoppen`,
  kaartTitel: 'Rondvlucht boven Eelde',
  kaartBody: 'Stijg op, vlieg door de twee poorten (niet te snel, op hoogte) en land zacht terug op het veld. De klok loopt; te hard vliegen kost veiligheid. [Backspace] stopt.',
  maak: (w, v) => { const d = maakVluchtdienst(rondvluchtRoute(v.x, v.y, v.angle)); d.naam = 'Rondvlucht Eelde'; return margeVoorDienst(d, 14); },
  stap: (d, v, dt) => vluchtStap(d, vliegtuigStaat(v), { dt }),
  stand: (d) => vluchtStand(d),
  uitslag: (d) => vluchtUitslag(d),
  extra: (v) => ({ hoogte: v.z, snelheid: Math.abs(v.speed || 0) }),
  glyph(ctx) {
    ctx.fillStyle = '#f2ede0';
    ctx.beginPath();
    ctx.moveTo(0, -3.6); ctx.lineTo(0.8, -1.4); ctx.lineTo(3.6, 0.6); ctx.lineTo(3.6, 1.6); ctx.lineTo(0.8, 0.8);
    ctx.lineTo(0.6, 2.6); ctx.lineTo(1.8, 3.4); ctx.lineTo(1.8, 4); ctx.lineTo(0, 3.5); ctx.lineTo(-1.8, 4); ctx.lineTo(-1.8, 3.4);
    ctx.lineTo(-0.6, 2.6); ctx.lineTo(-0.8, 0.8); ctx.lineTo(-3.6, 1.6); ctx.lineTo(-3.6, 0.6); ctx.lineTo(-0.8, -1.4);
    ctx.closePath(); ctx.fill();
  },
});

const VAARDIENST = dienstActiviteit({
  id: 'vaardienst',
  titel: 'RONDVAART',
  label: 'Rondvaart',
  naam: 'Rondvaart vanaf de kade',
  note: 'een rondvaart met de boot langs drie kades, met een dienstregeling en een medaille',
  accent: '#2a7fd6',
  mode: 'boat',
  inVoertuig: (v) => !!(v && v.isBoat),
  plek: (w) => { laadHavens(); return havenBij(w); },
  reik: 200,
  instap: 12,
  stapIn: 'Instappen en de rondvaart starten',
  startSub: 'Druk E om de rondvaart te starten',
  geenPlek: 'Meer hier eerst aan bij een jachthaven',
  geenRoute: 'Hier is geen vaarroute in de buurt',
  help: `${key('W')}${key('S')} gas en rem · ${key('A')}${key('D')} sturen · ${key('BACKSPACE')} stoppen`,
  kaartTitel: 'Rondvaart langs de kades',
  kaartBody: 'Vaar de drie kades in volgorde langs, leg bij elke kade aan (langzaam en stil) en blijf even liggen. Op tijd aankomen loont; te hard varen kost veiligheid. [Backspace] stopt.',
  maak: (w, v) => {
    // the route over the waterway net (vaarnet.js) from where the boat lies, to a hub it can sail
    const net = getSharedNet();
    const trip = net ? pickTrip(net, v.x, v.y, v.angle, v, Math.random, 220, 2200) : null;
    const kades = trip && trip.pts ? kadesLangsRoute(trip.pts, 3) : [];
    if (kades.length < 2) return null;
    return margeVoorDienst(maakVaardienst({ naam: 'Rondvaart', halten: kades }), 10);
  },
  stap: (d, v, dt) => vaarStap(d, v, { dt }),
  stand: (d) => vaarStand(d),
  uitslag: (d) => vaarUitslag(d),
  extra: (v) => ({ snelheid: Math.abs(v.speed || 0) }),
  glyph(ctx) {
    ctx.fillStyle = '#f2ede0';
    ctx.beginPath(); ctx.moveTo(-3.4, 0.4); ctx.lineTo(3.4, 0.4); ctx.lineTo(2.2, 1.8); ctx.lineTo(-2.2, 1.8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1.2, -0.2); ctx.lineTo(1.2, -0.2); ctx.lineTo(0.8, 0.6); ctx.lineTo(-0.8, 0.6); ctx.closePath(); ctx.fill();
  },
});

const LIST = [CARBID, KERMIS, HOOGVLIEGER, GEHEIMEN, DRIFT_ZONE, DISCGOLF, PITCHPUTT, SKATEPARK, KARTBAAN, ZWEMBAD, KLIMTOREN, WATERSKI, CARILLON_GAME, PANNENKOEK, HENGELEN, WANDELING, SNACKKETEN, EVENEMENTEN, REGATTA_GAME, VLIEGSCHOOL, SAFEHUIS, PVP_ARENA_ACT, VLUCHTDIENST, VAARDIENST];

export function initActivities(w) {
  for (const a of LIST) {
    try { a.init(w); } catch (e) { console.error('activity', a.id, e); }
  }
  window.__activities = {
    list: () => LIST.map((a) => ({ id: a.id, spots: a.spots().length, active: a.active(), thema: activityThema(a.id) })),
    get: (id) => LIST.find((a) => a.id === id) || null,
  };
}

// Het HUD-thema van een activiteit (#453): één tabel in minigamekit.js (titel, kleur, icoon). null als de activiteit
// geen eigen thema heeft of niet in de lijst staat.
export function activityThema(id) {
  return LIST.some((a) => a.id === id) ? mgThema(id) : null;
}

function current() {
  for (const a of LIST) if (a.active()) return a;
  return null;
}

export function isActivityActive() {
  return !!current();
}
registerBusyProbe('activity', isActivityActive);

// A loaded save ends a running minigame (savegame.js).
export function quitActivity(w) {
  for (const a of LIST) if (a.active() && a.quit) a.quit(w);
  w.activityGame = null;
}
registerQuitHook(quitActivity);

// main.js: instead of player.update while a minigame runs
export function updateActivityGame(dt, w) {
  const a = current();
  if (!a) { w.activityGame = null; return; }
  w.activityGame = a.id;
  w.minigameUntil = w.time + 0.25;
  a.update(dt, w);
}

// main.js: every frame, minigame or not
// Samen spelen (#434): een gast draait de wereld niet, maar bouwt wel wat de host ook bouwt en waar zijn lichaam tegenaan botst (een safehouse: gastTick)
export function tickActivitiesGast(dt, w) {
  for (const a of LIST) {
    if (!a.gastTick && !(GAST_ACTIVITEITEN.has(a.id) && (a.active() || !w.coopInVoertuig || (a.id === 'hengelen' && w.coopBoot)))) continue; // hengelen, pannenkoek, beiaard: ook bij een gast (#429)
    try { a.tick(dt, w); } catch (e) { console.error('activity', a.id, e); }
  }
}

// Samen spelen (#429, #434): een gast speelt een lokale activiteit (GAST_ACTIVITEITEN) op zijn eigen scherm. Zijn lichaam bij de host staat
// stil zolang de activiteit loopt (input.stil), de rest van de wereld komt gewoon via het net. Geeft het id van die activiteit terug, of null.
export function updateActivitiesGast(dt, w) {
  const a = current();
  if (!a || !GAST_ACTIVITEITEN.has(a.id)) return null;
  if (w.input) w.input.stil = 2;
  w.activityGame = a.id;
  w.minigameUntil = w.time + 0.25;
  a.update(dt, w);
  return a.id;
}

// E bij een gast: een lokale activiteit start op zijn eigen scherm; bij een andere activiteit hoort hij dat dit alleen bij wie het spel opende kan.
export function tryActivityInteractGast(w) {
  const input = w.input;
  if (!input || current() || isShopOpen() || isCinematicActive() || w.coopInVoertuig) return false;
  for (const a of LIST) {
    if (!a.interact) continue;
    if (GAST_ACTIVITEITEN.has(a.id)) { if (a.interact(w)) return true; continue; }
    let dichtbij = false;
    try { dichtbij = !!(a.prompt && a.prompt(w)); } catch (e) { dichtbij = false; }
    if (dichtbij) { const sw = samenWaarschuwing(w, 'activiteit', a.id); w.addMessage(sw ? sw.tekst : MELDING_ALLEEN_OPENER, 3); return true; } // een gast hoort ook dat dit nog niet samen werkt
  }
  return false;
}

export function updateActivitiesWorld(dt, w) {
  for (const a of LIST) {
    try { a.tick(dt, w); } catch (e) { console.error('activity', a.id, e); }
  }
  if (!current()) w.activityGame = null;
}

export function activityCamera(w) {
  const a = current();
  if (a && a.camera) a.camera(w);
}

export function activityPrompt(w) {
  if (current()) return null;
  for (const a of LIST) {
    const p = a.prompt && a.prompt(w);
    if (p) return p;
  }
  return null;
}

export function activitySecondary(w) {
  if (current()) return [];
  const out = [];
  for (const a of LIST) if (a.secondary) out.push(...a.secondary(w));
  return out;
}

export function tryActivityInteract(w) {
  const input = w.input;
  if (!input || current() || isShopOpen() || isCinematicActive()) return false;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  for (const a of LIST) {
    if (a.interact && a.interact(w)) {
      waarschuwVoorStart(w, 'activiteit', a.id); // samen spelen: een melding als dit nog niet (helemaal) samen werkt; de start gaat door
      input.consume('e');
      input.consume('f');
      return true;
    }
  }
  return false;
}

// --- maps, Ubbo, spot check -----------------------------------------------------------

export const ACTIVITY_LEGEND = LIST.filter((a) => a.legend).map((a) => ({ ...a.legend, layer: a.layer }));

// [{ layer, kind, x, y, name, sub }] for the full map and the minimap
export function activityMapIcons(w) {
  const out = [];
  for (const a of LIST) {
    if (!a.legend) continue;
    for (const s of a.spots()) out.push({ id: a.id, layer: a.layer, kind: a.legend.kind, x: s.x, y: s.y, name: s.name, sub: a.mapSub ? a.mapSub(s, w) : a.legend.note });
  }
  return out;
}

export function drawActivityMapIcon(ctx, kind, s) {
  const a = LIST.find((q) => q.legend && q.legend.kind === kind);
  if (!a || !a.icon) return false;
  a.icon(ctx, s);
  return true;
}


// Fixed places the player walks to, for spotcheck.js.
export function activitySpots() {
  const out = [];
  for (const a of LIST) for (const s of a.spots(true)) out.push({ kind: a.id, id: s.name || s.id, x: s.x, y: s.y, mode: s.mode || 'walk' });
  return out;
}
