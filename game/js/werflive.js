// Scheepswerf De Kielhaal in de wereld (#398): de agenda (evenementen.js, soort 'tewaterlating') zegt wanneer er een schip klaarligt,
// dit bestand laat het te water gaan: aankondiging, sirene, het schip komt los (werf.js tijdlijn), de golf duwt wie op de kade
// staat landinwaarts (spelers, auto's, voetgangers: nooit het water in, nooit leed), de boten in de basin worden eerst weggeduwd,
// en daarna wordt het schip een echt zeeschip dat via het vaarnet naar de Waddenzee vaart. werf3d.js tekent alles van `world.werf`.
// De regels zonder wereld staan in werf.js (scripts/werf_test.mjs); de stappen met een nepwereld in scripts/werflive_test.mjs.
import { activeEvents } from './evenementen.js';
import { WERF, SCHIP, N, KOERS, START_AFSTAND, LANCEERUUR, T_PLONS, T_RUST, T_GOLF_EINDE, TIJD, HART_Q, naarWereld, naarWerf, schipOp, werfFase, duwStap, golfDuw, GOLF } from './werf.js';
import { BOAT_KINDS } from './boattypes.js';

export const ZICHT_AFSTAND = 700;     // m: dichterbij staat het schip (en de helling) in beeld
export const AANKONDIGING = 650;      // m: dichterbij komt de aankondiging
export const WEG_AFSTAND = 950;       // m: verder weg is een vertrokken schip uit beeld en wordt opgeruimd
export const BASIN_RUIMTE = { q0: -2, q1: -30, l: 58 }; // de strook water waar het schip terechtkomt: boten moeten eruit
const SCHIP_MAX_LEVEN_S = 1500;       // een vertrokken schip blijft hooguit zo lang (echte seconden)

const hash = (a) => { const h = Math.sin(a * 127.1 + 311.7) * 43758.5453; return h - Math.floor(h); };

export function nieuweWerfStaat() {
  return { zichtbaar: false, u: null, schipWeg: false, gedaan: new Set(), verteld: new Set(), geduwd: new Set(), schip: null, leeftijd: 0 };
}

// Het lopende evenement van de werf (of null) en het uur.
const werfEvent = (n, hour) => activeEvents(n, hour).find((e) => e.kind === 'tewaterlating') || null;

// De afstand van (x, y) tot het midden van de helling.
export function afstandTotHelling(x, y) {
  const c = naarWereld(0, HART_Q);
  return Math.hypot(c.x - x, c.y - y);
}

// Land en ruimte voor iemand die wordt weggeduwd: geen water, geen gebouw.
export const kanStaan = (map, x, y, waterAt, buildingAt) => {
  if (buildingAt(map, x, y, 0.6)) return false;
  const w = waterAt(map, x, y);
  return !w;
};

// De route van het schip van de werf naar de zee, als punten; null zonder net.
export function vertrekRoute(net, planVaarRoute, x, y) {
  if (!net || !net.hubs) return null;
  const hub = net.nodes[net.hubs[WERF.hub]];
  if (!hub) return null;
  const r = planVaarRoute(net, [x, y], [hub.x, hub.y], { kind: 'zeeschip' });
  return r && r.pts && r.pts.length > 1 ? r.pts : null;
}

// Eén stap van de werf. env bevat de dingen die een wereld nodig heeft (zodat een test ze kan nabootsen):
// { Vehicle, waterAt, buildingAt, waterPolyAt, getVaarNet, planVaarRoute, isShip }
export function updateWerf(dt, world, n, env) {
  if (!world || !world.player || !world.map) return;
  const W = world.werf || (world.werf = nieuweWerfStaat());
  const hour = ((world.clock % 24) + 24) % 24;
  const p = world.player;
  const ev = werfEvent(n, hour);
  const fase = werfFase(!!ev, hour);
  const afstand = afstandTotHelling(p.x, p.y);
  const id = ev ? ev.id : null;

  // het vertrokken schip opruimen
  if (W.schip) {
    W.leeftijd += dt;
    const away = Math.hypot(W.schip.x - p.x, W.schip.y - p.y);
    const i = world.vehicles.indexOf(W.schip);
    if (i < 0) W.schip = null;
    else if (away > WEG_AFSTAND || W.leeftijd > SCHIP_MAX_LEVEN_S || W.schip.wrecked) { world.vehicles.splice(i, 1); W.schip = null; }
  }

  // de aankondiging van verderaf (de aankomst bij het evenement zelf meldt evenementenlive.js)
  if (ev && !W.verteld.has(id) && afstand < AANKONDIGING && (fase === 'wacht' || fase === 'nu')) {
    W.verteld.add(id);
    world.addMessage(`${WERF.naam}: schip te water om ${String(LANCEERUUR).padStart(2, '0')}:00 uur. Blijf achter het hek!`, 6);
  }

  // is er iets te zien?
  const klaar = !!ev && !W.gedaan.has(id) && (fase === 'wacht' || fase === 'nu');
  if (W.u == null) {
    W.zichtbaar = klaar && afstand < ZICHT_AFSTAND;
    W.schipWeg = false;
    if (ev && fase === 'voorbij' && !W.gedaan.has(id)) W.gedaan.add(id); // te laat: het schip is al weg
    if (klaar && fase === 'nu' && afstand < START_AFSTAND) { W.u = 0; W.zichtbaar = true; W.run = id; W.geduwd = new Set(); world.addMessage('De sirene gaat: het schip komt los! Blijf achter het hek.', 4); }
    return;
  }

  // de lancering loopt
  if (world.paused) return;
  const vorige = W.u;
  W.u += dt;
  W.zichtbaar = true;
  if (afstand > WEG_AFSTAND) { finish(W, world, env, false); return; } // de speler is weg: het schip is zonder hem te water gegaan

  // boten in de basin gaan voor de plons uit de weg
  if (W.u < T_PLONS + 1) ruimBasin(world, dt);

  // de golf
  if (W.u > T_PLONS && W.u < T_GOLF_EINDE) duwWie(world, W, dt, env);

  if (W.u >= T_RUST) finish(W, world, env, true);
}

// Boten (niet het schip) in de strook waar het schip terechtkomt varen weg van de kade.
function ruimBasin(world, dt) {
  for (const v of world.vehicles) {
    if (!v.isBoat || v.werfSchip) continue;
    const w = naarWerf(v.x, v.y);
    if (w.q > BASIN_RUIMTE.q0 || w.q < BASIN_RUIMTE.q1 || Math.abs(w.l) > BASIN_RUIMTE.l) continue;
    const stap = (v.driver === 'player' ? 5.5 : 7) * dt;
    v.x += N.x * stap; v.y += N.y * stap;
    if (v.driver === 'player' && !world.werf.verwittigd) { world.werf.verwittigd = true; world.addMessage('Weg uit de basin! Het schip komt het water in.', 3); }
  }
}

// De golf duwt wie op de kade staat landinwaarts: de speler te voet of in een voertuig, auto's, voetgangers.
function duwWie(world, W, dt, env) {
  const { map } = world;
  const ok = (x, y) => kanStaan(map, x, y, env.waterAt, env.buildingAt);
  const p = world.player;
  const wp = naarWerf(p.x, p.y);
  const x = W.u - T_PLONS;
  if (!p.inVehicle) {
    const v = golfDuw(wp.q, wp.l, x);
    if (v > 0.5) {
      // de duw komt via de terugstoot van de speler (player.js shoveX/Y); die wordt tegen gebouwen en water gecontroleerd
      p.shoveX = -N.x * v; p.shoveY = -N.y * v;
      if (!W.geduwd.has('speler')) { W.geduwd.add('speler'); world.addMessage('De golf spoelt je van de kade! Je bent niet gewond.', 3); }
    }
  }
  for (const veh of world.vehicles) {
    if (veh.isBoat || veh.wrecked) continue;
    const w = naarWerf(veh.x, veh.y);
    if (w.q < -2 || w.q > GOLF.reik || Math.abs(w.l) > GOLF.breed + GOLF.uitloop) continue;
    const r = duwStap(veh.x, veh.y, W.u, dt, ok);
    if (r.v > 0) {
      veh.x = r.x; veh.y = r.y;
      veh.speed *= Math.max(0, 1 - 1.4 * dt);
      veh.angle += (hash(veh.id || 1) - 0.5) * 1.3 * dt * Math.min(1, r.v / 6);
      if (veh === p.inVehicle && !W.geduwd.has('voertuig')) { W.geduwd.add('voertuig'); world.addMessage('De golf spoelt je voertuig de kade op! Er is niemand gewond.', 3); }
    }
  }
  for (const ped of world.pedestrians || []) {
    const w = naarWerf(ped.x, ped.y);
    if (w.q < -2 || w.q > GOLF.reik || Math.abs(w.l) > GOLF.breed + GOLF.uitloop) continue;
    const r = duwStap(ped.x, ped.y, W.u, dt, ok);
    if (r.v > 0) { ped.x = r.x; ped.y = r.y; }
  }
}

// Het einde van de lancering: het schip wordt een echt schip (als de speler er nog bij is) dat naar de Eems vaart.
function finish(W, world, env, metSchip) {
  const id = W.run;
  if (id) W.gedaan.add(id);
  W.u = null; W.run = null; W.zichtbaar = false; W.verwittigd = false;
  if (!metSchip) return;
  const pose = schipOp(T_RUST);
  const pos = naarWereld(0, pose.q);
  const veh = new env.Vehicle(pos.x, pos.y, KOERS, { ...BOAT_KINDS[SCHIP.model] });
  veh.isBoat = true;
  veh.werfSchip = true;
  veh.name = SCHIP.naam;
  veh.waterPoly = env.waterPolyAt(world.map, pos.x, pos.y);
  const route = vertrekRoute(env.getVaarNet(), env.planVaarRoute, pos.x, pos.y);
  // eerst van de kade af het midden van de basin in, dan de route van het vaarnet
  const uit = naarWereld(0, TIJD.eindQ - 28);
  if (route) veh._vaar = { pts: [[uit.x, uit.y], ...route], i: 0, name: WERF.hub };
  else veh.waypoint = [uit.x, uit.y];
  veh.speed = 0.3;
  world.vehicles.push(veh);
  W.schip = veh; W.leeftijd = 0;
  world.addMessage(`${SCHIP.naam} vaart uit naar de Waddenzee. Goede reis!`, 4);
}
