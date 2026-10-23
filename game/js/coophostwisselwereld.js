// Samen spelen (#439): de haken tussen het overdragen en de wereld van het spel (deps van coophostwisselnet.js). Wat de nieuwe host na een
// overdracht of een overname van de oude toepast: de lopende opdracht (hij begint opnieuw bij zijn start, de tussenstand gaat niet mee),
// kapotte objecten, de voertuigen waar spelers in zaten, de plek waar het spel stond en wat elke gast verdiende. Alleen wereldkennis,
// geen netwerk; coophostwisselui.js (wisselRoute) voegt deze haken toe aan de route.
import { missionDebug, getMissionDefs, isMissionActive } from './missions.js';
import { brokenKeysAll, breakPropByKey } from './breakables.js';
import { spawnVehicleOnRoad } from './vehicle.js';
import { tilesIn, withTiles } from './tileplace.js';
import { verplaatsStil } from './cheats.js';

const KAPOT_POGINGEN = 12;   // een kapot ding kan pas kapot als de prop is ingeladen: elke 3 s opnieuw, hoogstens zo vaak
const KAPOT_WACHT_MS = 3000;
const KEY_RE = /^([a-z]+)@(-?\d+),(-?\d+)$/;

// De opdracht die nu loopt (id = het label, stap = de plaats in de keten) of null.
export function leesOpdracht(world) {
  const m = world.mission;
  return m && m.phase === 'active' && Number.isInteger(m.index) ? { id: String(m.label || 'opdracht'), stap: m.index, staat: m.phase, t: Number(m.t) || 0 } : null;
}
// De opdracht hervatten bij de nieuwe host: de plek in de keten (of anders het label) en dan opnieuw starten.
export function zetOpdracht(world, o) {
  if (!o || isMissionActive()) return false;
  const defs = getMissionDefs();
  let i = defs[o.stap] && defs[o.stap].label === o.id ? o.stap : defs.findIndex((d) => d && d.label === o.id);
  if (i < 0 && Number.isInteger(o.stap) && defs[o.stap]) i = o.stap;
  if (i < 0) return false;
  try { return !!missionDebug.start(world, i); } catch (e) { return false; }
}

export const leesKapot = () => { try { return brokenKeysAll(400); } catch (e) { return []; } };
// De sleutels van kapotte objecten (soort@x10,y10) breken bij de nieuwe host; wat nog niet is ingeladen volgt zodra het er is.
export function zetKapot(world, ids) {
  let rest = (ids || []).filter((k) => typeof k === 'string' && KEY_RE.test(k)), poging = 0;
  const ronde = () => {
    rest = rest.filter((key) => { const m = KEY_RE.exec(key); try { return !breakPropByKey(key, +m[2] / 10, +m[3] / 10); } catch (e) { return false; } });
    if (rest.length && ++poging < KAPOT_POGINGEN && typeof setTimeout === 'function') setTimeout(ronde, KAPOT_WACHT_MS);
  };
  ronde();
  return true;
}

// De voertuigen waar spelers in zaten (de standaardlezing van coophostwisselnet.js doet dat al); hier alleen het zetten.
export function zetVoertuigen(world, lijst) {
  const map = world.map; if (!map || !Array.isArray(lijst)) return false;
  for (const v of lijst.slice(0, 16)) {
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
    if ((world.vehicles || []).some((q) => Math.hypot(q.x - v.x, q.y - v.y) < 3)) continue; // staat er al
    const zet = () => {
      const fiets = v.soort === 'fiets', rp = map.nearestRoadPoint(v.x, v.y, 60, !fiets);
      if (!rp || Math.hypot(rp.x - v.x, rp.y - v.y) > 40) return;
      const x = spawnVehicleOnRoad(map, rp.road, false, Math.random, fiets, false, rp);
      x.x = v.x; x.y = v.y; x.angle = v.hoek || 0; x.speed = 0; x.road = null; x.missionCar = true; // niet als verkeer opgeruimd
      world.vehicles.push(x);
    };
    if (tilesIn(map, [[v.x, v.y]], 160)) zet();
    else withTiles(map, [[v.x, v.y]], zet, { radius: 160, token: 'overdracht-voertuig' }).catch(() => {});
  }
  return true;
}

// De nieuwe host komt op de plek waar het spel stond (met de tegels erbij).
export const zetPlek = (world, x, y) => verplaatsStil(world, x, y);
// Wat een gast in deze sessie verdiende (coopnet.js payGuest houdt het bij).
export const gastGeld = (world) => (slot) => (world.coopNet && world.coopNet.betaald && world.coopNet.betaald[slot]) || 0;

export function wisselWereldHaken(world) {
  return { leesOpdracht, zetOpdracht, leesKapot, zetKapot, zetVoertuigen, zetPlek, gastGeld: gastGeld(world) };
}
