// Samen spelen (#439): de haken tussen het overdragen en de wereld van het spel (deps van coophostwisselnet.js). Wat de nieuwe host na een
// overdracht of een overname van de oude toepast: de lopende opdracht (op dezelfde plaats in de keten, #452), kapotte objecten, de voertuigen
// waar spelers in zaten (met hun model en kleur, #452), de plek waar het spel stond en wat elke gast verdiende. Alleen wereldkennis,
// geen netwerk; coophostwisselui.js (wisselRoute) voegt deze haken toe aan de route.
import { missionDebug, getMissionDefs, isMissionActive } from './missions.js';
import { brokenKeysAll, breakPropByKey } from './breakables.js';
import { spawnVehicleOnRoad, TRAFFIC_MODELS, POLICE_MODEL, HERO_CAR_MODEL, TRACTOR_MODEL, QUAD_MODEL, MACHINE_MODELLEN } from './vehicle.js';
import { figures } from './coopclient.js';
import { tilesIn, withTiles } from './tileplace.js';
import { verplaatsStil } from './cheats.js';

const KAPOT_POGINGEN = 12;   // een kapot ding kan pas kapot als de prop is ingeladen: elke 3 s opnieuw, hoogstens zo vaak
const KAPOT_WACHT_MS = 3000;
const KEY_RE = /^([a-z]+)@(-?\d+),(-?\d+)$/;
const MAX_VOERTUIGEN = 16;
// het model van een voertuig uit de momentopname en de kleuren die erbij horen (#452)
const MODEL_EXTRA = [POLICE_MODEL, HERO_CAR_MODEL, TRACTOR_MODEL, QUAD_MODEL, ...Object.values(MACHINE_MODELLEN)];

// De stand binnen de lopende opdracht (#452): de stage in de keten, of het waypoint van een race. De keten weet het precies
// (missionDebug.state); zonder keten (of in een test) is het aantal gehaalde waypoints het beste dat we hebben.
function deelVan(m) {
  const def = getMissionDefs()[m.index];
  const s = typeof missionDebug.state === 'function' ? missionDebug.state() : null;
  if (s && s.index === m.index) {
    if (def && def.stages) return Math.max(0, s.stage | 0);
    if (Number.isInteger(s.wp)) return Math.max(0, s.wp | 0);
  }
  return def && def.stages ? 0 : Math.max(0, m.wpIndex | 0);
}

// De opdracht die nu loopt (id = het label, stap = de plaats in de lijst, deel = de stage) of null.
export function leesOpdracht(world) {
  const m = world.mission;
  if (!m || m.phase !== 'active' || !Number.isInteger(m.index)) return null;
  return {
    id: String(m.label || 'opdracht'), stap: m.index, deel: deelVan(m),
    tijd: Number.isFinite(m.timeLeft) ? m.timeLeft : null, staat: m.phase, t: Number(m.t) || 0,
  };
}
// De opdracht hervatten bij de nieuwe host: dezelfde opdracht, dezelfde stage (of het waypoint) en de tijd die nog over was.
// De speler blijft staan (zie missionDebug.hervat): een gast die host wordt ziet geen sprong.
export function zetOpdracht(world, o) {
  if (!o || isMissionActive()) return false;
  const defs = getMissionDefs();
  let i = defs[o.stap] && defs[o.stap].label === o.id ? o.stap : defs.findIndex((d) => d && d.label === o.id);
  if (i < 0 && Number.isInteger(o.stap) && defs[o.stap]) i = o.stap;
  if (i < 0) return false;
  try {
    if (typeof missionDebug.hervat === 'function') return !!missionDebug.hervat(world, i, o.deel, o.tijd);
    return !!missionDebug.start(world, i);
  } catch (e) { return false; }
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

// Het uiterlijk van een voertuig (modelnaam en kleuren), zodat de nieuwe host niet een willekeurige auto neerzet (#452).
export function uiterlijkVan(model) {
  if (!model || typeof model !== 'object') return null;
  return { naam: model.name || '', kleur: model.color || '', streep: model.stripe || '', accent: model.accent || '', kajuit: model.cabin || '' };
}
// Het model terug uit de momentopname: hetzelfde model als bij de vorige host. Onbekend: null, dan kiest de spawn er zelf een.
export function modelVan(v) {
  if (!v) return null;
  const u = v.uiterlijk || {};
  const naam = u.naam || v.soort || '';
  const basis = TRAFFIC_MODELS().find((m) => m.name === naam) || MODEL_EXTRA.find((m) => m && m.name === naam);
  if (!basis) return null;
  const m = { ...basis };
  if (u.kleur) m.color = u.kleur;
  if (u.streep) m.stripe = u.streep;
  if (u.accent) m.accent = u.accent;
  if (u.kajuit) m.cabin = u.kajuit;
  return m;
}

// De voertuigen waar spelers in zaten, met hun uiterlijk en hun schade (de momentopname is de onze, zie maakMomentopname).
export function leesVoertuigen(world) {
  const uit = [], gezien = new Set();
  for (const b of [world.player, world.companion, ...Object.values(figures(world))]) {
    const v = b && (b.inVehicle || b.inVeh);
    if (!v || typeof v !== 'object' || gezien.has(v)) continue;
    gezien.add(v);
    uit.push({
      id: String(v.id ?? 'v'), soort: (v.model && v.model.name) || v.type || 'auto', x: v.x, y: v.y, z: v.z || 0, hoek: v.angle || 0,
      schade: Number.isFinite(v.health) ? Math.max(0, Math.min(1, 1 - v.health / 100)) : Math.max(0, Math.min(1, v.damage || 0)),
      uiterlijk: uiterlijkVan(v.model),
    });
    if (uit.length >= MAX_VOERTUIGEN) break;
  }
  return uit;
}

// De voertuigen waar spelers in zaten (de standaardlezing van coophostwisselnet.js doet dat al); hier alleen het zetten.
export function zetVoertuigen(world, lijst) {
  const map = world.map; if (!map || !Array.isArray(lijst)) return false;
  for (const v of lijst.slice(0, MAX_VOERTUIGEN)) {
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) continue;
    if ((world.vehicles || []).some((q) => Math.hypot(q.x - v.x, q.y - v.y) < 3)) continue; // staat er al
    const zet = () => {
      const soort = String(v.soort || '') + ' ' + String((v.uiterlijk && v.uiterlijk.naam) || '');
      const fiets = /\b(fiets|bike)\b/.test(soort), scooter = /\b(scooter|moped)\b/.test(soort);
      const rp = map.nearestRoadPoint(v.x, v.y, 60, !fiets && !scooter);
      if (!rp || Math.hypot(rp.x - v.x, rp.y - v.y) > 40) return;
      const x = spawnVehicleOnRoad(map, rp.road, false, Math.random, fiets, false, rp, scooter, modelVan(v));
      x.x = v.x; x.y = v.y; x.z = Number.isFinite(v.z) ? v.z : 0; x.angle = v.hoek || 0; x.speed = 0; x.road = null; x.missionCar = true; // niet als verkeer opgeruimd
      if (v.schade > 0) x.health = Math.max(1, Math.round(100 * (1 - v.schade))); // dezelfde deuken
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
  return { leesOpdracht, zetOpdracht, leesKapot, zetKapot, leesVoertuigen, zetVoertuigen, zetPlek, gastGeld: gastGeld(world) };
}
