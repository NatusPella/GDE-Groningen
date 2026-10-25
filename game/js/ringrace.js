// De ringrace (#443): één rondje over de ringweg van 17,5 km (ringroute.js),
// tegen vier tegenstanders. Solo is het de race van H9 zoals hij was
// (racers.js, dezelfde auto's en dezelfde baan); met gasten in de sessie is het
// een wedstrijd tegen elkaar: iedereen dezelfde racewagen, één gezamenlijke
// start, de tussenstand en de uitslag met een beloning per plek van de
// wedstrijdlaag (coopwedstrijdbaan.js, soort 'baan').
//
// Samen spelen: de host zet voor elke deelnemer een racewagen op de grid en zet
// een gast er zelf in (coopbestuur.js, #434); de gasten sturen met hun eigen
// stick en de host rijdt ze. De host meldt per deelnemer de gehaalde poorten en
// de tijd (wedHostBaan) en de laag rekent de stand, de finish en de beloning uit.
// Wie wegvalt of stopt zet zijn auto stil en de rest rijdt door; zonder gasten
// blijft het de solo-race.
import { Vehicle } from './vehicle.js';
import { RING_ROUTE, RING_CHECKPOINTS } from './ringroute.js';
import { createRace, updateRace, disposeRace, buildTrack, sample, racewagenModel } from './racers.js';
import { createBoard, key, fmtTime, stopPressed, gameUi } from './minigamekit.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { getChallengeRecord, recordChallengeResult, MEDALS } from './achievements.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { hoofdspeler } from './spelersregister.js';
import { lichaamVan, bestuurInstappenIn, bestuurLos } from './coopbestuur.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostBaan, wedBaanStand, wedScoreStop } from './coopwedstrijd.js';
import { CP_TOTAAL, stapPoort, meters, klaar as baanKlaar, gridRij, medailleVoorPlek, prijsVoorPlek, xpVoorPlek } from './ringbaan.js';

const ACCENT = '#c8102e';
const NAAM = 'Ringrace';
const LIMIT = 600;          // s: de hele race duurt hooguit tien minuten
const COUNTDOWN = 4;        // s: het gezamenlijke aftellen bij een wedstrijd
const MAX_DEELN = 4;
const START = { x: RING_ROUTE[0][0], y: RING_ROUTE[0][1] };
const START_REACH = 90;     // m: vanaf hier zie je de start van de race

let run = null;             // de lopende race (solo of wedstrijd)
let board = null;
let hudT = 0;

const puntVan = (p) => (p && (p.inVehicle || p)) || null;
const bijStart = (w) => {
  const q = puntVan(w.player);
  return !!q && Math.hypot(q.x - START.x, q.y - START.y) <= START_REACH;
};
const fmt = (s) => fmtTime(Math.max(0, s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// --- solo: de race van H9 (racers.js) ----------------------------------------

function startSolo(w) {
  if (run) return false;
  const race = createRace(w, RING_ROUTE, RING_CHECKPOINTS, { topScale: 1.35, accelScale: 1.3, band: 320, jelle: true });
  if (!board) board = createBoard('RINGRACE', ACCENT);
  board.show();
  run = { online: false, race, cp: 0, t: 0, gestopt: false };
  gameUi.showCard(w, {
    kind: 'tip', kicker: 'Ringrace', title: 'Eén rondje ringweg',
    body: `Volg de poorten in volgorde: ${CP_TOTAAL} in totaal, de finish ligt op de startlijn. Stap in je racewagen en wacht op het aftellen. [Backspace] stopt.`,
    duration: 10, key: 'ringrace-help', voice: false,
  });
  return true;
}

function tickSolo(dt, w) {
  const r = run, race = r.race;
  if (stopPressed(w.input)) { finish(w, { quit: true }); return; }
  const was = race.phase;
  updateRace(dt, w, race, Math.min(r.cp, race.cpS.length - 1));
  if (race.phase === 'race' && was !== 'race') r.t = 0;
  if (race.phase === 'race') {
    r.t += dt;
    const q = puntVan(w.player);
    if (q) {
      const cp = stapPoort(q.x, q.y, r.cp);
      if (cp !== r.cp) {
        r.cp = cp;
        if (baanKlaar(cp)) { finish(w); return; }
        w.addMessage(`Poort ${cp}/${CP_TOTAAL}`, 1.6, { key: 'ring-poort' });
      }
    }
    if (r.t > LIMIT) { finish(w, { teLang: true }); return; }
  }
  if ((hudT -= dt) <= 0) { hudT = 0.1; updateHud(w); }
}

// --- samen: de wedstrijd tegen elkaar (soort 'baan') ------------------------

// Een eigen racewagen op de grid: precies de auto die de solo-race krijgt, dus
// voor iedereen dezelfde. Geen missionCar of racer: een gast moet er zelf in
// kunnen stappen (coopbestuur.js).
function maakAuto(w, track, k) {
  const g = gridRij(k), at = sample(track, -g.terug);
  const x = at.x + at.nx * g.zij, y = at.y + at.ny * g.zij;
  const auto = new Vehicle(x, y, Math.atan2(-at.nx, at.ny), racewagenModel());
  auto.z = w.map.spawnZ ? w.map.spawnZ(x, y) : 0;
  auto.raceCar = true;
  auto.road = null;
  w.vehicles.push(auto);
  return auto;
}

function removeAuto(w, v) {
  if (!v) return;
  const i = w.vehicles.indexOf(v);
  if (i >= 0 && !v.driver) w.vehicles.splice(i, 1); // nooit een auto wegzetten waar iemand nog in zit
}

// Een vorige wedstrijd opruimen: de gasten uit hun oude racewagen en de lege
// wagens weg (#443).
function ruimAutos(w) {
  for (const slot of Object.keys(w.coopRijders || {})) {
    const r = w.coopRijders[slot];
    if (r && r.v && r.v.raceCar) bestuurLos(w, +slot);
  }
  for (const v of [...(w.vehicles || [])]) if (v.raceCar && !v.driver) removeAuto(w, v);
}

// De auto van een deelnemer: de host wat hij bestuurt, een gast het voertuig
// waar hij in zit (coopbestuur.js).
const autoVan = (w, p) => {
  if (!p.slot) { const h = hoofdspeler(w); return h ? h.inVehicle : null; }
  const l = lichaamVan(w, p.slot);
  return l ? l.inVeh || l.inVehicle || null : null;
};

function startBaan(w, sc) {
  const deeln = sc.deeln.slice(0, MAX_DEELN).map((d) => ({ ...d }));
  if (!deeln.length) return false;
  ruimAutos(w);
  const track = buildTrack(w.map, RING_ROUTE);
  const hostMee = deeln.some((d) => d.slot === 0);
  const rijders = deeln.map((d, k) => ({ slot: d.slot, naam: d.naam, auto: maakAuto(w, track, k), cp: 0, klaar: false, tijd: null }));
  // de grid vrij maken van geparkeerd en doorrijdend verkeer (zoals createRace bij de solorace doet)
  const autos = rijders.map((d) => d.auto);
  const ikRij = (hoofdspeler(w) || {}).inVehicle || null;
  for (let i = w.vehicles.length - 1; i >= 0; i--) {
    const o = w.vehicles[i];
    if (o.driver === 'player' || o.missionCar || o.isPolice || o.raceCar || o === ikRij) continue;
    if (autos.some((q) => Math.hypot(o.x - q.x, o.y - q.y) < 7 + (o.halfLen || 0))) w.vehicles.splice(i, 1);
  }
  // de host in zijn eigen wagen; een gast zet zijn lichaam naast zijn wagen en
  // stapt zelf in (E), zodat hij zelf de bestuurder blijft (#434)
  if (hostMee) {
    const p = hoofdspeler(w), ik = rijders.find((d) => !d.slot);
    if (p && ik) {
      if (p.inVehicle && p.inVehicle !== ik.auto) p.exitVehicle(w.map, w);
      p.x = ik.auto.x; p.y = ik.auto.y;
      p.enterVehicle(ik.auto, w);
    }
  }
  for (const d of rijders) {
    if (!d.slot) continue;
    const l = lichaamVan(w, d.slot);
    if (l) { l.x = d.auto.x; l.y = d.auto.y; l.angle = d.auto.angle || 0; l.vx = 0; l.vy = 0; }
    const inAuto = bestuurInstappenIn(w, d.slot, d.auto);
    if (!inAuto.gedaan && w.coopMeld) w.coopMeld(d.slot, 'Stap in je racewagen en druk op E: bij het aftellen gaat iedereen samen weg.');
  }
  if (!board) board = createBoard('RINGRACE', ACCENT);
  board.show();
  run = { online: true, deeln: rijders, af: COUNTDOWN, said: null, t: 0, gestopt: false, sc };
  if (hostMee) gameUi.showCard(w, {
    kind: 'tip', kicker: 'Ringrace', title: 'Iedereen dezelfde auto',
    body: `Eén rondje ringweg, ${CP_TOTAAL} poorten in volgorde, de finish op de startlijn. Dezelfde auto en dezelfde start voor iedereen. [Backspace] stopt de wedstrijd voor iedereen.`,
    duration: 11, key: 'ringrace-wedstrijd-help', voice: false,
  });
  return true;
}

function tickBaan(dt, w) {
  const r = run;
  if (stopPressed(w.input)) { finish(w, { quit: true }); return; } // de host stopt: voor iedereen
  if (r.af > 0) { // gezamenlijk aftellen: alle wagens staan stil (startLockUntil houdt ook de gasten stil)
    r.af -= dt;
    for (const d of r.deeln) if (d.auto) d.auto.speed = 0;
    w.startLockUntil = r.af > 0 ? w.time + 0.25 : 0;
    const sec = Math.max(0, Math.ceil(r.af - 0.5));
    if (r.said !== sec) {
      r.said = sec;
      const tekst = sec > 0 ? String(sec) : 'RIJDEN!';
      for (const d of r.deeln) if (d.slot && w.coopMeld) w.coopMeld(d.slot, tekst);
      if (r.deeln.some((d) => !d.slot)) w.addMessage(tekst, sec > 0 ? 0.5 : 1.4, { key: 'ring-count', exact: true });
    }
    if ((hudT -= dt) <= 0) { hudT = 0.1; updateHud(w); }
    return;
  }
  r.t += dt;
  for (const d of r.deeln) {
    if (d.klaar) continue;
    const auto = autoVan(w, d);
    if (!auto) continue; // wie (nog) niet instapte staat stil op de grid
    const cp = stapPoort(auto.x, auto.y, d.cp);
    if (cp !== d.cp) {
      d.cp = cp;
      if (d.slot && w.coopMeld) w.coopMeld(d.slot, baanKlaar(cp) ? 'Binnen! De anderen rijden door.' : `Poort ${cp}/${CP_TOTAAL}`);
    }
    if (baanKlaar(d.cp)) { d.klaar = true; d.tijd = r.t; }
    wedHostBaan(w, d.slot, { cp: Math.min(d.cp, CP_TOTAAL), s: meters(auto.x, auto.y, d.cp), klaar: d.klaar, tijd: d.tijd });
  }
  if ((hudT -= dt) <= 0) { hudT = 0.1; updateHud(w); }
}

// --- het bord -----------------------------------------------------------------

function updateHud(w) {
  if (!run || !board) return;
  const r = run;
  if (r.online) {
    const stand = wedBaanStand(w);
    const mijn = stand.find((x) => x.slot === 0) || null;
    const regels = stand.map((s) => `<span>${s.weg ? '<s>' : ''}${s.plek}. ${esc(String(s.naam).slice(0, 12))} <b>${s.klaar && s.tijd != null ? fmt(s.tijd) : `${Math.min(s.cp, CP_TOTAAL)}/${CP_TOTAAL}`}</b>${s.weg ? '</s>' : ''}</span>`).join('');
    board.set({
      row: `<span>Tijd <b>${fmt(r.t)}</b></span><span>Plaats <b>${mijn ? mijn.plek : '-'}/${stand.length || r.deeln.length}</b></span><span>Poort <b>${mijn ? Math.min(mijn.cp + 1, CP_TOTAAL) : 0}/${CP_TOTAAL}</b></span>`,
      extra: regels || '',
      help: `${key('BACKSPACE')} stopt de wedstrijd voor iedereen`,
    });
    return;
  }
  const race = r.race, pos = race.playerPos || 0, totaal = race.rivals.length + 1;
  board.set({
    row: `<span>Tijd <b>${fmt(r.t)}</b></span><span>Plaats <b>${pos}/${totaal}</b></span><span>Poort <b>${Math.min(r.cp + 1, CP_TOTAAL)}/${CP_TOTAAL}</b></span>`,
    help: `${key('BACKSPACE')} stoppen`,
  });
}

// --- klaar en beloond ---------------------------------------------------------

function finish(w, { quit = false, extern = false, teLang = false, uitslag = null } = {}) {
  const r = run;
  if (!r) return false;
  if (r.online && !extern) { // de host stopt: de wedstrijdlaag stopt hem voor iedereen
    if (quit && !r.gestopt) { r.gestopt = true; wedScoreStop(w); }
    return true;
  }
  run = null;
  if (board) board.hide();
  if (r.online) { eindeBaan(w, r, uitslag); return true; }
  disposeRace(w, r.race);
  if (quit) { w.addMessage('Ringrace gestopt', 2.5); return true; }
  const plek = teLang ? 0 : (r.race.playerPos || 0);
  const medal = medailleVoorPlek(plek);
  const rec = teLang ? null : recordChallengeResult(w, 'ringrace', { value: r.t, medal, lower: true });
  const geld = prijsVoorPlek(plek);
  const premie = loopbaanVerdien(w, 'race', geld, { xp: xpVoorPlek(plek || 5), n: 1, uniek: 'ringrace' }); // loopbaan (#381)
  const stats = [['Plaats', plek ? `${plek} van ${r.race.rivals.length + 1}` : 'niet gefinisht'], ['Tijd', fmt(r.t)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  gameUi.showBanner({
    kind: medal ? 'pass' : 'fail',
    title: medal === 3 ? 'WINNAAR VAN DE RINGRACE' : medal ? 'OP HET PODIUM' : 'DE RING IS LANG',
    reason: teLang ? 'Te lang onderweg: de ringweg wint altijd van de klok.' : medal ? 'Eén rondje ringweg, met de eerlijke auto van iedereen' : 'Je haalde de finish, maar niet op het podium',
    reward: premie, stats,
  });
  return true;
}

// De uitslag van de wedstrijdlaag: de host ziet de stand, krijgt zijn eigen
// beloning per plek en de racewagens gaan vrij (de gasten zijn al betaald).
function eindeBaan(w, r, res) {
  if (res) {
    const jij = res.jij;
    if (jij) loopbaanVerdien(w, 'race', jij.geld, { xp: jij.xp, n: 1, uniek: 'ringrace', deel: false });
    if (jij && jij.geld > 0) w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4);
    const stats = res.rijen.map((x) => [`${x.plek}. ${x.naam}`, x.tekst || '']);
    gameUi.showBanner({
      kind: jij && jij.plek === 1 ? 'pass' : 'fail',
      title: jij && jij.plek === 1 ? 'WINNAAR VAN DE RINGRACE' : 'DE RINGRACE IS GEREDEN',
      reason: jij && jij.weg ? 'Je stopte onderweg: de rest reed door.' : jij && jij.fin ? 'Iedereen dezelfde auto, dezelfde baan' : 'Niet alle poorten gehad voor de tijd om was',
      reward: jij ? jij.geld : 0, stats,
    });
  } else w.addMessage('Ringrace gestopt', 2.5);
  for (const d of r.deeln) if (d.auto && !autoVan(w, d)) removeAuto(w, d.auto);
}

function tick(dt, w) {
  if (!run) return;
  if (run.online) tickBaan(dt, w); else tickSolo(dt, w);
}

// --- de activiteit in de wereld ----------------------------------------------

function glyph(ctx) {
  // een racewagen van opzij: neus, dak en twee wielen
  ctx.fillStyle = '#f0ede4';
  ctx.beginPath(); ctx.moveTo(-3.2, 0.4); ctx.lineTo(-2.4, -1.2); ctx.lineTo(-0.6, -1.2); ctx.lineTo(0.4, -2.6); ctx.lineTo(2.2, -2.6); ctx.lineTo(2.9, -1.2); ctx.lineTo(3.2, -0.6); ctx.lineTo(3.2, 0.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(-1.9, 1.0, 0.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1.9, 1.0, 0.8, 0, Math.PI * 2); ctx.fill();
}

const recTekst = () => { const r = getChallengeRecord('ringrace'); return r && r.best != null ? `Record: ${fmt(r.best)}` : null; };

export const RINGRACE = {
  id: 'ringrace',
  layer: 'ringrace',
  legend: { kind: 'act-ringrace', label: NAAM, note: 'één rondje over de ringweg, tegen vier tegenstanders of tegen elkaar' },
  init(w) {
    window.__ringrace = {
      start: () => start(w),
      state: () => (run ? { online: run.online, t: run.t, cp: run.online ? (run.deeln.find((d) => !d.slot) || {}).cp : run.cp, af: run.af || 0 } : null),
      quit: () => (run ? finish(w, { quit: true }) : false),
    };
  },
  spots: () => [{ id: 'ringrace-start', name: NAAM, x: START.x, y: START.y, mode: 'drive' }],
  prompt(w) {
    if (run || !bijStart(w)) return null;
    const why = activityBlock(w);
    return { id: 'ringrace', x: START.x, y: START.y, h: 3, key: 'E', label: NAAM, sub: why || recTekst() || 'Eén rondje ringweg, 17,5 km', ring: true, dim: !!why };
  },
  secondary(w) {
    if (run || bijStart(w)) return [];
    return [{ id: 'ringrace-2', x: START.x, y: START.y, h: 3, label: NAAM, sub: 'Rijd naar de start van de ringrace en druk E', kind: 'place' }];
  },
  interact(w) {
    if (run || !bijStart(w)) return false;
    const why = activityBlock(w);
    if (why) { w.addMessage(why, 2.5); return true; }
    // samen spelen (#443): met gasten eerst "Meedoen?", daarna de wedstrijd; alleen is het de solo-race
    const uit = wedNodigUit(w, 'ringrace');
    if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
    return start(w);
  },
  active: () => false, // de speler rijdt zelf: de race neemt het spel niet over
  quit: (w) => { if (run) finish(w, { quit: true }); },
  update: () => {},
  tick,
  camera: () => {},
  icon(ctx, s) { iconDisc(ctx, s, ACCENT); ctx.save(); ctx.scale(s, s); glyph(ctx); ctx.restore(); },
  mapSub: () => recTekst() || 'Eén rondje over de ringweg',
  ubbo: () => null,
};

function start(w, sc = null) {
  if (run) return false;
  return sc ? startBaan(w, sc) : startSolo(w);
}

// --- samen spelen (#443): de wedstrijdlaag start, telt en betaalt ------------
// Iedereen dezelfde racewagen op één grid; de host meldt per deelnemer de
// poorten en de tijd (wedHostBaan) en de laag houdt de stand, de eerste + de
// korte klok, de tijdslimiet en de beloning per plek bij (coopwedstrijdbaan.js).
registreerWedstrijd('ringrace', {
  naam: NAAM, soort: 'baan', vak: 'race', minSpelers: 2,
  opties: () => ({ cps: CP_TOTAAL, cpNaam: 'poorten', cap: LIMIT, naEerste: 180 }),
  start: (w, sc) => start(w, sc),
  plek: () => ({ ...START }),
  // een gast die de wedstrijd aanvraagt (#452) moet bij de start van de ring staan
  gastPlek: (w, x, y) => Math.hypot(x - START.x, y - START.y) <= START_REACH,
  extra: () => ({ v: 'ringweg' }),
  // een gast valt weg: hij stapt uit en zijn wagen stopt en blijft achter (de rest rijdt door)
  weg: (w, sc, slot) => {
    const d = run && run.online ? run.deeln.find((x) => x.slot === slot) : null;
    const los = bestuurLos(w, slot);
    if (d && d.auto) { d.auto.speed = 0; d.auto.throttle = 0; d.auto.handbrake = true; }
    return los || !!d;
  },
  eind: (w, res) => { if (run && run.online) finish(w, { extern: true, uitslag: res }); },
  solo: (w) => startSolo(w), // niemand deed mee: dan is het de gewone race
});
// Een gast bij de start van de ring kan de wedstrijd zelf aanvragen (#452).
zetWedGastHaken('ringrace', { dichtbij: (w) => !run && bijStart(w) });

// De prijs van de dijkrace (M14), die in de missie wordt uitbetaald maar als race telt (#443): hier, zodat missions.js
// zelf geen loopbaan aanraakt en de balanstest blijft gelden.
export function dijkPrijs(world, bedrag, xp = 0) {
  return loopbaanVerdien(world, 'race', bedrag, { xp, n: 1, uniek: 'dijk', deel: false });
}
