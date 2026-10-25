import { Vehicle } from './vehicle.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { buildPersonMesh, seatPerson, seatedY } from './models3d_people.js';
import { boatSeats } from './boattypes.js';
import { JELLE_LOOK } from './storycast.js';
import { routeAt, ROUTE_LENGTH, rondvaartWaypoints, rondvaartBerth, prepareDiepenringRoute, diepenringProgress } from './rondvaartchase.js';
import { getChallengeRecord } from './achievements.js';
import { clamp, isInWater } from './util.js';
import { waterPolyAt } from './waterlevels.js';
import { finish, jelle, setTarget, startWedstrijd } from './pghost.js';
import { hoofdspeler } from './spelersregister.js';
import { lichaamVan, bestuurInstappenIn, bestuurLos } from './coopbestuur.js';
import { registreerWedstrijd, wedHostBaan, wedBaanStand } from './coopwedstrijd.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { showBanner } from './cinematics.js';

// Elf Bruggenrace: one lap of the Diepenring from the Spilsluizen, under its
// eleven bridges (the rondvaart route and checkpoints, rondvaartchase.js), in
// a borrowed speedboat against Jelle in his "Fryske Flitser". Jelle follows
// the route line at a steady pace with a mild rubber band; the player has
// to pass every bridge in order. Win = zilver, win fast = goud, finish = brons.
//
// Samen spelen (#443): met gasten in de sessie is dit een wedstrijd tegen elkaar (WEDSTRIJDEN 'bruggenrace',
// soort 'baan'). Wie het spel opende drukt E bij het startpunt: iedereen krijgt "Meedoen?" (J of N), daarna
// krijgt elke deelnemer dezelfde boot op de startlijn en gaat het met een gezamenlijk aftellen weg. De host
// houdt per deelnemer de bruggen en de tijd bij (wedHostBaan), de gasten sturen zelf hun boot (coopbestuur.js)
// en zien de tussenstand van de host. De finish, de plekken en de beloning per plek regelt de wedstrijdlaag;
// solo blijft het de uitdaging van Jelle met een medaille.

const RACE_BOAT = { name: 'boat', kind: 'sloep', len: 4.4, wid: 1.7, maxSpeed: 10.8, accel: 3.4, brake: 3.6, turnRate: 1.8, color: '#e8e6e0', cabin: '#1c1c1c' };
const JELLE_BOAT = { name: 'boat', kind: 'sloep', len: 4.6, wid: 1.75, maxSpeed: 11, accel: 2, brake: 3, turnRate: 1.6, color: '#1d4f9c', cabin: '#f4f2ec' };
const COUNTDOWN = 3.5;
const LIMIT = 720;
const JELLE_PACE = 8.3;
const CP_REACH = 26;
const GRID_ROW = 8;      // m tussen twee rijen op de startlijn
const GRID_LANE = 2.6;   // m naast de hartlijn
const MAX_DEELN = 4;     // vier boten in de Diepenring is genoeg

let leftover = null;
let actie = null; // de postgame-run van de lopende race (voor de uitslag van de wedstrijd, #443)

function removeBoat(w, v) {
  if (!v) return;
  const i = w.vehicles.indexOf(v);
  if (i >= 0 && v.driver !== 'player') w.vehicles.splice(i, 1);
}

// Een vorige wedstrijd opruimen: de gasten uit hun oude raceboot en de lege raceboten weg (#443).
function ruimBoten(w) {
  for (const slot of Object.keys(w.coopRijders || {})) {
    const r = w.coopRijders[slot];
    if (r && r.v && r.v.raceBoat) bestuurLos(w, +slot);
  }
  for (const v of [...(w.vehicles || [])]) if (v.raceBoat && !v.driver) removeBoat(w, v);
}

function jelleFigure(v) {
  const mesh = getVehicleMesh(v.id);
  if (!mesh || mesh.userData.pgJelle) return;
  const seat = boatSeats(v)[0];
  const m = buildPersonMesh(JELLE_LOOK.shirt, JELLE_LOOK.skin, JELLE_LOOK);
  seatPerson(m, false, seat.pose);
  m.position.set(seat.x, seatedY(m, seat.y), seat.z);
  m.rotation.y = seat.face || 0;
  mesh.add(m);
  mesh.userData.pgJelle = m;
}

function fmt(s) {
  const t = Math.max(0, s), m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
}

// Een eigen boot op de startlijn: de eerste op de plek van de rondvaartsteiger (zoals solo), de rest in een
// grid erachter, zodat niemand in de ander begint.
function maakBoot(w, berth, s0, k) {
  let x = berth.boat.x, y = berth.boat.y, a = berth.boat.angle || 0;
  if (k > 0) {
    const row = Math.floor(k / 2) + 1, side = k % 2 ? 1 : -1;
    const q = routeAt(s0.s - row * GRID_ROW);
    const nx = -Math.sin(q.a), ny = Math.cos(q.a);
    x = q.x + nx * side * GRID_LANE;
    y = q.y + ny * side * GRID_LANE;
    a = q.a;
  }
  const boot = new Vehicle(x, y, a, { ...RACE_BOAT });
  boot.isBoat = true;
  boot.raceBoat = true; // geen missionCar: een gast moet er zelf in kunnen stappen (coopbestuur.js)
  boot.waterPoly = waterPolyAt(w.map, x, y);
  w.vehicles.push(boot);
  return boot;
}

// De boot waar deze deelnemer nu in zit: zijn eigen boot, of (als hij ergens anders in stapte) dat voertuig.
function bootVan(w, d) {
  if (!d.slot) { const p = hoofdspeler(w); return p && p.inVehicle ? p.inVehicle : null; } // de host: wat hij bestuurt
  const l = lichaamVan(w, d.slot);
  return l && (l.inVeh || l.inVehicle) ? l.inVeh || l.inVehicle : null;
}

export const BRUGGEN = {
  id: 'bruggen',
  name: 'Elf Bruggenrace',
  blurb: 'Eén rondje Diepenring, onder elf bruggen door, tegen Jelle',
  icon: 'jelle',
  jelle: true,
  wedstrijd: 'bruggenrace', // samen spelen: Meedoen? en een wedstrijd tegen elkaar (#443)
  banter: 'post-bruggen',
  spots(world) {
    const b = rondvaartBerth(world.map);
    // a few steps along the quay from the rondvaart mission's own marker
    const a = b.boat.angle || 0;
    const along = [6, 4, 3, -4].find((k) => !isInWater(world.map, b.start.x + Math.cos(a) * k, b.start.y + Math.sin(a) * k)) ?? 0;
    const [x, y] = world.map.escapeBuilding(b.start.x + Math.cos(a) * along, b.start.y + Math.sin(a) * along, 0.4);
    return [{ x, y, name: 'Elf Bruggenrace', sub: 'Jelle daagt je uit op het water', berth: b }];
  },
  verb: () => 'Elf Bruggenrace tegen Jelle',
  // sc: de baanwedstrijd van de host (#443); zonder sc is dit de solo-uitdaging.
  start(run, sc = null) {
    const w = run.world, map = w.map;
    prepareDiepenringRoute(map);
    actie = run;
    if (leftover) { removeBoat(w, leftover); leftover = null; }
    ruimBoten(w);
    const berth = run.spot.data.berth;
    const wps = rondvaartWaypoints();
    const cps = [];
    let vias = [];
    for (const wp of wps) {
      if (wp.via) { vias.push(wp); continue; }
      cps.push({ x: wp.x, y: wp.y, bridge: wp.bridge, s: diepenringProgress(wp.x, wp.y).s, path: vias });
      vias = [];
    }
    const s0 = diepenringProgress(berth.boat.x, berth.boat.y);
    // de deelnemers: solo de host, samen wie ja zei (de host eerst)
    const online = !!sc;
    const deeln = (online ? sc.deeln : [{ slot: 0, naam: 'Jij' }]).slice(0, MAX_DEELN).map((d, k) => ({
      slot: d.slot, naam: d.naam || 'Speler', boot: maakBoot(w, berth, s0, k), cp: 0, ps: s0.s, pi: s0.i, klaar: false, tijd: null,
    }));
    const q = routeAt(s0.s + 7);
    const jv = new Vehicle(q.x, q.y, q.a, { ...JELLE_BOAT });
    jv.isBoat = true;
    jv.scripted = true;
    jv.missionCar = true;
    jv.driver = 'jelle';
    jv.label = 'Fryske Flitser';
    w.vehicles.push(jv);
    // de host in zijn eigen boot; een gast zet zijn lichaam naast zijn boot en stapt zelf in (E), zo blijft hij zelf de bestuurder
    const host = deeln.find((d) => !d.slot);
    if (host) {
      const p = hoofdspeler(w);
      if (p.inVehicle && p.inVehicle !== host.boot) p.exitVehicle(map, w); // uit de boot van de vorige keer
      p.x = host.boot.x; p.y = host.boot.y;
      p.enterVehicle(host.boot, w);
      const c = w.companion; // solo vaart de metgezel mee; samen is dat het lichaam van een gast, die vaart zelf
      if (!online && c && c.state !== 'dead' && !c.inVehicle) { c.x = host.boot.x; c.y = host.boot.y; c.water = null; c.swimming = false; c.inVehicle = host.boot; host.boot.passenger = 'companion'; }
    }
    for (const d of deeln) {
      if (!d.slot) continue;
      const l = lichaamVan(w, d.slot);
      if (l) { l.x = d.boot.x; l.y = d.boot.y; l.angle = d.boot.angle || 0; l.vx = 0; l.vy = 0; }
      // de gast in zijn eigen boot zetten: hij hoeft er niet zelf bij te staan en bestuurt hem met zijn stick (#434, #443)
      const inBoot = bestuurInstappenIn(w, d.slot, d.boot);
      if (!inBoot.gedaan && w.coopMeld) w.coopMeld(d.slot, 'Stap in je boot en druk op E: bij het aftellen gaat iedereen samen weg.');
    }
    const len = cps[cps.length - 1].s - s0.s;
    Object.assign(run.data, {
      online, deeln, cps, jv, js: s0.s + 7, jspeed: 0, jfin: null, s0: s0.s, len,
      gold: len / (JELLE_PACE * 1.07), elapsed: 0, go: false, count: COUNTDOWN, pos: deeln.length, said: 0,
    });
    run.ui.setSlot('<div class="pg-help">Onder elke brug door, in de goede volgorde. Jelle vaart de hele ring.</div>');
    return true;
  },
  update(run, dt) {
    const w = run.world, d = run.data;
    jelleFigure(d.jv);
    if (!w.vehicles.includes(d.jv)) w.vehicles.push(d.jv);
    const mijn = d.deeln.find((p) => !p.slot) || null;
    if (!d.online) {
      // solo: zoals het was, met dezelfde valkuilen (uitstappen of zinken is verliezen)
      const boat = mijn && mijn.boot;
      if (!boat) { finish(run, { success: false, medal: 0, reason: 'De boot is weg.', stats: [] }); return; }
      if (boat.wrecked || boat.sinking) { finish(run, { success: false, medal: 0, reason: 'Je boot is naar de bodem. Jelle zwaait.', stats: [] }); return; }
      const p = hoofdspeler(w);
      if (p.inVehicle !== boat) {
        d.offT = (d.offT || 0) + dt;
        if (d.offT > 10) { finish(run, { success: false, medal: 0, reason: 'Je bent uit de boot gestapt. Jelle vaart door.', stats: [] }); return; }
      } else d.offT = 0;
    }
    if (!d.go) {
      d.count -= dt;
      for (const p of d.deeln) if (p.boot) p.boot.speed = 0;
      w.startLockUntil = d.count > 0 ? w.time + 0.25 : 0; // houdt alle boten stil, ook die van de gasten (player.js driveVehicle)
      if (d.count <= 1 && !d.said) { d.said = 1; jelle(run, 'go', true); }
      if (d.online) { // ook de gasten horen het aftellen, want zij zitten al in hun boot
        const n = Math.max(0, Math.ceil(d.count - 0.5));
        for (const p of d.deeln) if (p.slot && p.aftel !== n) { p.aftel = n; if (w.coopMeld) w.coopMeld(p.slot, n > 0 ? String(n) : 'VAREN!'); }
      } else w.addMessage(d.count > 0.5 ? String(Math.ceil(d.count - 0.5)) : 'VAREN!', 0.4, { key: 'pg-count', exact: true });
      if (d.count <= 0) { d.go = true; if (d.online) w.addMessage('VAREN!', 1.4, { key: 'pg-count', exact: true }); }
      placeJelle(d, 0);
      setTarget(d.cps[0]);
      return;
    }
    d.elapsed += dt;
    for (const p of d.deeln) vaarDeelnemer(w, d, p);
    // Jelle: steady pace, eases off when the player falls far behind, pushes when the player leads
    const ref = mijn || d.deeln.reduce((a, p) => (p.ps > a.ps ? p : a), d.deeln[0]);
    if (ref) {
      const gap = d.js - ref.ps;
      const want = d.jfin != null ? 0 : gap > 90 ? JELLE_PACE * 0.86 : gap < -30 ? JELLE_PACE * 1.14 : JELLE_PACE;
      d.jspeed += clamp(want - d.jspeed, -3 * dt, 1.6 * dt);
    }
    placeJelle(d, dt);
    const finishS = d.cps[d.cps.length - 1].s;
    if (d.jfin == null && d.js >= finishS) { d.jfin = d.elapsed; d.js = finishS; }
    if (d.online) {
      // de wedstrijdlaag bepaalt wanneer het klaar is (iedereen binnen, de eerste + de korte klok, of de tijdslimiet)
      const rijen = wedBaanStandRijen(w);
      d.pos = (rijen.find((r) => r.slot === 0) || {}).plek || d.deeln.length;
      const klaar = d.deeln.filter((p) => p.klaar).length;
      run.ui.setRows([['Jouw plek', `${d.pos}/${d.deeln.length}`], ['Bruggen', `${mijn ? Math.min(d.cps.length, mijn.cp) : 0}/${d.cps.length}`], ['Binnen', `${klaar}/${d.deeln.length}`], ['Tijd', fmt(d.elapsed)]]);
      return;
    }
    d.pos = d.jfin != null || d.js > mijn.ps + 2 ? 2 : 1;
    if (d.pos !== d.lastPos) { jelle(run, d.pos === 1 ? 'behind' : 'lead', true); d.lastPos = d.pos; }
    else if (run.t - run.lastSay > 24) jelle(run, d.pos === 1 ? 'behind' : 'lead');
    const ahead = Math.round(Math.abs(d.js - mijn.ps));
    run.ui.setRows([['Jelle', d.jfin != null ? 'is al binnen' : d.js - mijn.ps > 0 ? `${ahead} m voor` : `${ahead} m achter`], ['Bruggen', `${Math.min(d.cps.length, mijn.cp)}/${d.cps.length}`]]);
    if (d.elapsed > LIMIT) finish(run, { success: false, medal: 0, reason: 'Te lang onderweg. Jelle heeft al koffie op.', stats: [] });
  },
  hud(run) {
    const d = run.data;
    const mijn = d.deeln.find((p) => !p.slot) || null;
    const rec = getChallengeRecord('bruggen');
    return { pos: d.go ? d.pos : null, total: d.online ? d.deeln.length : 2, elapsed: d.elapsed, timeLeft: Math.max(0, LIMIT - d.elapsed), cp: mijn ? Math.min(d.cps.length, mijn.cp + 1) : 0, cpTotal: d.cps.length, lap: null, laps: null, best: !d.online && rec && rec.best != null ? rec.best : null };
  },
  stop(run) {
    const w = run.world, d = run.data;
    actie = null;
    if (d.jv) removeBoat(w, d.jv);
    for (const p of d.deeln) {
      const boot = p.boot;
      if (!boot) continue;
      if (hoofdspeler(w) && hoofdspeler(w).inVehicle === boot) leftover = boot; // de host vaart er zelf nog in: laat hem staan
      else if (!bootVan(w, p)) removeBoat(w, boot); // leeg: opruimen (een gast die er nog in zit houden we)
    }
  },
  idle(world) {
    if (leftover && hoofdspeler(world).inVehicle !== leftover && Math.hypot(leftover.x - hoofdspeler(world).x, leftover.y - hoofdspeler(world).y) > 120) {
      removeBoat(world, leftover);
      leftover = null;
    }
  },
  debugWin(run) {
    const d = run.data;
    const mijn = d.deeln.find((p) => !p.slot) || d.deeln[0];
    if (!mijn) return;
    d.go = true;
    mijn.cp = d.cps.length - 1;
    mijn.ps = d.cps[mijn.cp].s;
    d.elapsed = d.gold - 5;
    end(run);
  },
  debugState(run) {
    const d = run.data, mijn = d.deeln.find((p) => !p.slot) || d.deeln[0] || {};
    return { cp: mijn.cp, ps: Math.round(mijn.ps), js: Math.round(d.js), len: Math.round(d.len), gold: Math.round(d.gold), pos: d.pos };
  },
};

// Eén deelnemer op de baan: de bruggen in volgorde, de finish bij de laatste brug, en de stand naar de host (#443).
function vaarDeelnemer(w, d, p) {
  if (p.klaar) return;
  const boot = bootVan(w, p) || p.boot; // wie (nog) niet instapte staat stil op de startlijn
  const pr = diepenringProgress(boot.x, boot.y, p.pi);
  p.pi = pr.i;
  if (pr.d < 60) p.ps = pr.s;
  const cp = d.cps[p.cp];
  if (cp && (p.ps >= cp.s - 4 && pr.d < CP_REACH || Math.hypot(boot.x - cp.x, boot.y - cp.y) < 12)) {
    p.cp++;
    if (!p.slot) {
      const last = p.cp >= d.cps.length;
      if (last) w.addMessage('De laatste brug: naar de finish!', 2, { key: 'pg-cp' });
      else w.addMessage(`Brug ${p.cp}/${d.cps.length}: ${cp.bridge}`, 2, { key: 'pg-cp' });
      setTarget(p.cp < d.cps.length ? d.cps[p.cp] : cp); // de volgende brug voor de pijl (Jelle en de host zien hem)
    } else if (w.coopMeld) w.coopMeld(p.slot, `Brug ${Math.min(p.cp, d.cps.length)}/${d.cps.length}`);
    if (p.cp < d.cps.length) setTarget(cp); // de volgende brug voor de pijl (Jelle en de host zien hem)
    if (p.cp >= d.cps.length) { p.klaar = true; p.tijd = d.elapsed; }
  }
  wedHostBaan(w, p.slot, { cp: p.cp, s: p.cp * 100000 + p.ps, klaar: p.klaar, tijd: p.tijd });
}
const wedBaanStandRijen = (w) => { try { return wedBaanStand(w); } catch (e) { return []; } };

function placeJelle(d, dt) {
  d.js = Math.min(ROUTE_LENGTH, d.js + d.jspeed * dt);
  const q = routeAt(d.js);
  const v = d.jv;
  v.x = q.x; v.y = q.y;
  let da = q.a - v.angle;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  v.angle += da * Math.min(1, dt * 4);
  v.speed = d.jspeed;
  v.driftX = 0; v.driftY = 0;
}

function end(run) {
  const d = run.data;
  const won = d.jfin == null;
  const medal = won ? (d.elapsed <= d.gold ? 3 : 2) : 1;
  finish(run, {
    success: won, medal, value: d.elapsed, lower: true,
    reason: won ? 'Elf bruggen, en Jelle zag alleen je hek.' : 'Jelle was eerder binnen. Hij zwaait met zijn pet.',
    stats: [['Tijd', fmt(d.elapsed)], ['Goud onder', fmt(d.gold)]],
  });
}

// --- samen spelen (#443): de wedstrijdlaag start, telt en betaalt --------------------------
// De host drukt E bij het startpunt en de laag stuurt eerst "Meedoen?"; daarna start dit de race voor iedereen.
registreerWedstrijd('bruggenrace', {
  naam: 'Elf Bruggenrace', soort: 'baan', vak: 'race', minSpelers: 2,
  opties: () => ({ cps: 11, cpNaam: 'bruggen', cap: LIMIT, naEerste: 150 }),
  start: (w, sc) => startWedstrijd('bruggen', sc),
  plek: (w) => { const b = rondvaartBerth(w.map); return { ...b.boat }; },
  extra: () => ({ v: 'diepenring' }),
  // een gast valt weg: hij stapt uit en zijn boot stopt en blijft achter (de rest vaart door)
  weg: (w, sc, slot) => {
    const p = sc.deeln.find((d) => d.slot === slot);
    if (!p) return false;
    bestuurLos(w, slot);
    if (p.boot) { p.boot.speed = 0; p.boot.throttle = 0; p.boot.handbrake = true; }
    return true;
  },
  eind: (w, res) => eindBaan(w, res),
  solo: (w) => startWedstrijd('bruggen', null), // niemand deed mee: dan is het de gewone uitdaging van Jelle
});

// Klaar: de uitslag van de host, zijn eigen beloning per plek en de boten weer vrij.
function eindBaan(w, res) {
  const run = actie;
  const d = run && run.data;
  if (!d || !d.online) return false;
  const rijen = res ? res.rijen : [];
  finish(run, { aborted: true }); // boten opruimen, zonder medaille: de beloning komt per plek van de wedstrijdlaag
  if (!res) { w.addMessage('De Elf Bruggenrace is gestopt.', 3); return true; }
  const jij = res.jij;
  if (jij) loopbaanVerdien(w, 'race', jij.geld, { xp: jij.xp, n: 1, uniek: 'bruggenrace', deel: false });
  if (jij && jij.geld > 0) w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4);
  const stats = rijen.map((r) => [`${r.plek}. ${r.naam}`, r.tekst || '']);
  showBanner({
    kind: jij && jij.plek === 1 ? 'pass' : 'fail',
    title: jij && jij.plek === 1 ? 'WINNAAR VAN DE ELF BRUGGENRACE' : 'DE BRUGGENRACE IS GEVAREN',
    reason: jij && jij.weg ? 'Je stopte onderweg: de rest voer door.' : jij && jij.fin ? 'Elf bruggen, en de eerlijke boot van iedereen' : 'Niet alle bruggen gehad voor de tijd om was',
    reward: jij ? jij.geld : 0,
    stats,
  });
  return true;
}
