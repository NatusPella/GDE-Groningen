// Lijm tussen de verkeers-AI (traffic.js) en het halteren van een lijnbus (busstop.js, wens eigenaar 23-11).
// Per beeld, alleen voor een bus met een rit (v.busRun) die niet door een speler wordt gereden. Zet op de bus:
// halteVmax (remmen naar de halte), laneMode 'halte' (naar de stoeprand, vehicle.js lanePoint), indForce (de
// richtingaanwijzer, indicators.js), deurenDicht (vehicledoors.js: alleen open bij de halte) en halteFase (een
// staande bus is een obstakel waar ander verkeer omheen mag, traffic.js resolveDeadlocks). Bij aankomst gaat er een
// uitwisseling naar het beeld (haltefiguren.js queueHalte; boarding3d.js tekent hem). Geen allocaties per beeld.
//
// Samen spelen: het verkeer is van de host; dit draait alleen waar de verkeers-AI draait. Een gast ziet de bus
// stoppen, knipperen en de deuren openen uit de snapshot (snelheid en richtingaanwijzer), en tekent de reizigers
// zelf (boarding3d.js, uit de stilstand van de bus bij een halte).

import { makeHalteStaat, stapHalte, halteAfstand, HALTE } from '../busstop.js';
import { halteGehaald, DWELL } from '../busroutes.js';
import { queueHalte } from '../haltefiguren.js';

const _in = { stop: null, afstand: Infinity, speed: 0, dt: 0, dwell: DWELL, decel: HALTE.DECEL, live: false, liveStil: false };
const _ev = { board: -1, alight: 0 };
export const LOS_M = 25; // m: zoveel verder hemelsbreed dan langs de lijn en de bus hoort niet meer bij deze halte

// out: wat stepRunner(…, zacht) gaf ({ stop }); lp: de positie van de echte bus (#395) of null.
export function stapBusHalte(v, out, dt, world, lp = null, rng = Math.random) {
  const r = v.busRun;
  const hs = v.halteStaat || (v.halteStaat = makeHalteStaat());
  if (hs.trips !== r.trips) { hs.trips = r.trips; hs.vorige = null; } // na het keren mag dezelfde halte weer
  const doel = hs.fase === 'nadering' ? hs.stop : out.stop;
  _in.stop = out.stop;
  _in.afstand = doel ? halteAfstand(r, doel) : Infinity;
  // De rit loopt niet mee met de bus (hij rijdt van zijn lijn af of de andere kant op): de afstand langs de lijn blijft dan
  // staan terwijl de bus wegrijdt, en hij kroop met knipperlicht op remsnelheid door tot de nadering na 60 s afbrak (samen-qa
  // 24-11, in twee vensters gezien). Is hij hemelsbreed veel verder van het stoppunt dan langs de lijn, dan is de halte gemist.
  if (doel && Number.isFinite(doel.x) && Number.isFinite(doel.y) && Math.hypot(doel.x - v.x, doel.y - v.y) > Math.max(0, _in.afstand) + LOS_M) _in.afstand = -Infinity;
  _in.speed = v.speed || 0;
  _in.dt = dt;
  _in.live = !!lp;
  _in.liveStil = !!lp && Math.abs(lp.speed || 0) < 0.5;
  stapHalte(hs, _in);
  if (hs.aankomst) {
    halteGehaald(r, hs.stop);
    _ev.alight = Math.floor(rng() * (HALTE_UIT + 1));
    queueHalte(world, v, _ev);
  } else if (hs.gemist) halteGehaald(r, hs.vorige);
  v.halteVmax = hs.vmax;
  v.halteFase = hs.fase;
  v.indForce = hs.knipper;
  v.deurenDicht = !hs.deurOpen;
  if (hs.stoep) { v.laneMode = 'halte'; v.laneModeUntil = world.time + 0.6; }
  else if (v.laneMode === 'halte') v.laneMode = null;
}

const HALTE_UIT = 3; // zoveel stappen er hoogstens uit (bescheiden)

// De bus doet niet (meer) mee aan het halteren (een speler nam het stuur, de rit is weg): alles terug.
export function wisBusHalte(v) {
  if (!v.halteStaat && v.halteVmax == null) return;
  v.halteStaat = null; v.halteVmax = null; v.halteFase = null; v.indForce = null; v.deurenDicht = false;
  if (v.laneMode === 'halte') v.laneMode = null;
}
