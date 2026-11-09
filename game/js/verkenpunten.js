// #807/#825: de verkenlaag van de provincie, op de bestaande infrastructuur. Pure data en regels:
// per streek één uitkijkpunt (uit MENU_PLEKKEN, anders het eerste kerk-/molen-/borgpunt uit
// landmarkkits.json), een albumteller over de herkenningspunten per streek, en sinds #825 de
// ontdekking per speler: welke streken hij kent, welke uitkijkpunten hij gebruikte, wanneer een
// streek helemaal verkend is en welk reisvoordeel daar bij hoort. Geen nieuwe merken, namen of
// munten; de coördinaten zijn de bestaande wereldpunten. Het eigen profiel (opslag, opschonen en
// de haken in het spel) staat in explorationlive.js; dit bestand blijft puur en Node-safe.
import { MENU_PLEKKEN } from './menuplekken.js';
import { STREKEN, streekAt } from './regioleven.js';
import { wgsToWorld } from './rdnew.js';

// Eén uitkijkpunt per streek: eerst de vaste menupiek (mooi camerastandpunt), anders het eerste
// kerk-, molen- of borgpunt in die streek. Zo heeft ook Lauwerskust/Hunsingo een punt zonder
// nieuwe data.
const SOORT_ORDE = ['castle', 'mill', 'church', 'tower', 'museum'];
// Een bestaand id als leesbare naam: menkemaborg -> Menkemaborg, uithuizen-jacobikerk -> Uithuizen Jacobikerk.
const netteNaam = (id) => String(id || '').split('-').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
export function uitkijkpunten(landmarks = [], plekken = MENU_PLEKKEN, streken = STREKEN) {
  const uit = [];
  for (const streek of streken) {
    const plek = plekken.find((p) => p.streek === streek.id);
    if (plek) { uit.push({ id: `uitkijkpunt:${streek.id}`, streek: streek.id, streekNaam: streek.name, naam: netteNaam(plek.id), x: plek.x, y: plek.y, bron: 'menuplek' }); continue; }
    const [cx, cy] = wgsToWorld(streek.at[0], streek.at[1]);
    const kandidaten = landmarks
      .filter((k) => k && Number.isFinite(k.x) && Number.isFinite(k.y) && SOORT_ORDE.includes(k.k || k.kind))
      .filter((k) => Math.hypot(k.x - cx, k.y - cy) <= streek.reach)
      .sort((a, b) => SOORT_ORDE.indexOf(a.k || a.kind) - SOORT_ORDE.indexOf(b.k || b.kind));
    const k = kandidaten[0];
    if (k) uit.push({ id: `uitkijkpunt:${streek.id}`, streek: streek.id, streekNaam: streek.name, naam: k.n || k.naam || k.name || netteNaam(k.kind || k.k), x: k.x, y: k.y, bron: 'landmark' });
  }
  return uit;
}

// De acht punten op de kaart zetten (#807, A15): de kaartlaag leest ze uit dit meta-veld,
// net als de landmarks. Geen nieuwe namen of coördinaten: alles komt uit MENU_PLEKKEN en
// landmarkkits.json. Aanroepen zodra de kits geladen zijn (ommelandlandmarks.js).
export function installeerUitkijkpunten(map, kits, { plekken = MENU_PLEKKEN, streken = STREKEN } = {}) {
  const punten = uitkijkpunten(kits || [], plekken, streken);
  if (map && map.meta) map.meta.uitkijkpunten = punten;
  return punten;
}

// Het album: hoeveel herkenningspunten per streek, en hoeveel daarvan kerk, molen of borg zijn.
export function albumStand(landmarks = [], streken = STREKEN, streekAtFn = null) {
  const per = new Map(streken.map((s) => [s.id, { totaal: 0, kerk: 0, molen: 0, borg: 0 }]));
  for (const k of landmarks) {
    if (!k || !Number.isFinite(k.x) || !Number.isFinite(k.y)) continue;
    let id = null;
    if (streekAtFn) { const s = streekAtFn(k.x, k.y); id = s && s.id; }
    // buiten de reach van een streek valt een punt toch bij de dichtstbijzijnde streek: het album telt
    // de hele provincie, niet alleen de cirkels rond de centra.
    if (!id) {
      let best = null, bd = Infinity;
      for (const s of streken) { const [cx, cy] = wgsToWorld(s.at[0], s.at[1]); const d = Math.hypot(cx - k.x, cy - k.y); if (d < bd) { bd = d; best = s; } }
      id = best && best.id;
    }
    if (!id) continue;
    const rij = per.get(id);
    if (!rij) continue;
    rij.totaal++;
    if (k.k === 'church') rij.kerk++;
    else if (k.k === 'mill') rij.molen++;
    else if (k.k === 'castle') rij.borg++;
  }
  return streken.map((s) => ({ streek: s.id, ...per.get(s.id) }));
}

// --- ontdekking per speler (#825) ------------------------------------------------------------
// Het profiel van deze speler: welke streken hij kent (streken), welke uitkijkpunten hij gebruikte
// (punten, de id's uit uitkijkpunten()) en welke streken hij helemaal verkende (stempels). Het staat
// in zijn eigen opslag (gde-verkenning-v1, explorationlive.js) en nooit in de wereld of een savegame:
// een gast heeft zo zijn eigen ontdekkingen. De wereld, de punten en de missies zijn voor iedereen
// gelijk; alleen de kaart verbergt van een onbekende streek de naam en de activiteiten-iconen.
export const EXPLORATION_VERSION = 1;
// een helemaal verkende streek reist 10% sneller: het kleinste bestaande reisvoordeel, geen munt en geen snelreizen
export const TRAVEL_BONUS = 0.1;

const AREA_IDS = new Set(STREKEN.map((s) => s.id));
const MAX_POINT_ID = 80;

// Een streek-id dat echt bestaat (en niet een oude of verzonnen id uit een profiel).
export const isAreaId = (id) => typeof id === 'string' && AREA_IDS.has(id);

export const newExplorationProfile = () => ({ v: EXPLORATION_VERSION, streken: [], punten: [], stempels: [] });

const cleanAreaIds = (a) => (Array.isArray(a) ? [...new Set(a.filter(isAreaId))].slice(0, STREKEN.length) : []);
const cleanPointIds = (a) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && x.length > 0 && x.length <= MAX_POINT_ID))].slice(0, 2 * STREKEN.length) : []);

// Een profiel uit opslag (of iets anders): leeg, oud of kapot geeft een geldig profiel.
export function normaliseExploration(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  const p = newExplorationProfile();
  if (!d || typeof d !== 'object' || d.v !== EXPLORATION_VERSION) return p;
  p.streken = cleanAreaIds(d.streken);
  p.punten = cleanPointIds(d.punten);
  p.stempels = cleanAreaIds(d.stempels);
  return p;
}

// Twee tabbladen (of een oude sessie): wat een van beide ontdekte, is ontdekt. De invoer blijft heel.
export function mergeExploration(a, b) {
  const x = normaliseExploration(a), y = normaliseExploration(b);
  const p = newExplorationProfile();
  p.streken = cleanAreaIds([...x.streken, ...y.streken]);
  p.punten = cleanPointIds([...x.punten, ...y.punten]);
  p.stempels = cleanAreaIds([...x.stempels, ...y.stempels]);
  return p;
}

// De streken die deze speler kent, in de volgorde van STREKEN.
export function knownAreas(profile) {
  const known = new Set(profile && Array.isArray(profile.streken) ? profile.streken : []);
  return STREKEN.filter((s) => known.has(s.id)).map((s) => s.id);
}

export const areaIsKnown = (profile, areaId) => !!profile && Array.isArray(profile.streken) && profile.streken.includes(areaId);
export const hasAreaStamp = (profile, areaId) => !!profile && Array.isArray(profile.stempels) && profile.stempels.includes(areaId);
export const usesPoint = (profile, pointId) => !!profile && Array.isArray(profile.punten) && profile.punten.includes(pointId);

export const areaName = (areaId) => { const s = STREKEN.find((q) => q.id === areaId); return s ? s.name : ''; };

// De streek van een punt in de wereld (null in de stad of buiten de streken).
export function areaForPoint(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const s = streekAt(x, y);
  return s ? s.id : null;
}

// De streek van een uitkijkpunt ({ streek } of een plek x/y) en de sleutel waaronder het in het
// profiel staat. Eén punt per streek, dus de id is de streek; een eigen id van het punt gaat voor.
export function pointArea(point) {
  if (!point) return null;
  if (isAreaId(point.streek)) return point.streek;
  return Number.isFinite(point.x) && Number.isFinite(point.y) ? areaForPoint(point.x, point.y) : null;
}
export const viewpointKey = (point) => (point && typeof point.id === 'string' && point.id ? point.id : (pointArea(point) ? `uitkijkpunt:${pointArea(point)}` : ''));

// De streek van een missie: een eigen `streek`-veld, anders de plek waar hij begint ({ x, y } of
// { start: { x, y } }). Missies in de stad horen bij geen streek en tellen dus nergens mee.
function missionArea(mission) {
  if (mission && isAreaId(mission.streek)) return mission.streek;
  if (!mission || typeof mission !== 'object') return null;
  const x = Number.isFinite(mission.x) ? mission.x : mission.start && Number.isFinite(mission.start.x) ? mission.start.x : NaN;
  const y = Number.isFinite(mission.y) ? mission.y : mission.start && Number.isFinite(mission.start.y) ? mission.start.y : NaN;
  return Number.isFinite(x) && Number.isFinite(y) ? areaForPoint(x, y) : null;
}

// Een streek onthullen: hij komt in de lijst van deze speler. `point` is het uitkijkpunt dat hij
// gebruikte (dan telt het punt meteen als gebruikt). Geeft true als de streek nieuw was.
export function revealArea(profile, areaId, { point = null } = {}) {
  if (!profile || !isAreaId(areaId)) return false;
  if (!Array.isArray(profile.streken)) profile.streken = [];
  const isNew = !profile.streken.includes(areaId);
  if (isNew) profile.streken.push(areaId);
  if (typeof point === 'string' && point) {
    if (!Array.isArray(profile.punten)) profile.punten = [];
    if (!profile.punten.includes(point)) profile.punten.push(point);
  }
  return isNew;
}

// De streken die deze speler al gezien heeft volgens de bezochte buurten van het gebiedenprofiel
// (gebieden.js `bezocht`, #435): zo begint een oude speler niet bij nul. gebieden is de indeling
// (ind.gebied is een Map van buurt-id naar gebied met x/y).
export function areasFromVisits(profile, gebieden) {
  const out = [];
  const seen = new Set(profile && Array.isArray(profile.bezocht) ? profile.bezocht : []);
  if (!seen.size || !gebieden || !gebieden.gebied || typeof gebieden.gebied.get !== 'function') return out;
  for (const id of seen) {
    const district = gebieden.gebied.get(id);
    if (!district || !Number.isFinite(district.x) || !Number.isFinite(district.y)) continue;
    const area = areaForPoint(district.x, district.y);
    if (area && !out.includes(area)) out.push(area);
  }
  return out;
}

// De stand van één streek voor deze speler: ontdekt, alle missies klaar, alle uitkijkpunten
// gebruikt, en dus helemaal verkend. `missions` is de missielijst (missionquery.getMissionList(),
// met done) en `points` zijn de uitkijkpunten van de kaart (map.meta.uitkijkpunten).
export function areaProgress(profile, areaId, { missions = [], points = [] } = {}) {
  const known = areaIsKnown(profile, areaId);
  const areaPoints = (Array.isArray(points) ? points : []).filter((q) => pointArea(q) === areaId);
  const pointsUsed = areaPoints.filter((q) => usesPoint(profile, viewpointKey(q))).length;
  const areaMissions = (Array.isArray(missions) ? missions : []).filter((m) => missionArea(m) === areaId);
  const missionsDone = areaMissions.filter((m) => m && (m.done === true || m.klaar === true || m.status === 'klaar')).length;
  // zonder bekende punten is er niets te vieren: dan is de streek nog niet verkend (de kits laden later)
  const complete = known && areaPoints.length > 0 && pointsUsed >= areaPoints.length && missionsDone >= areaMissions.length;
  return { area: areaId, discovered: known, missionsDone, missionsTotal: areaMissions.length, pointsUsed, pointsTotal: areaPoints.length, complete };
}

// De stempel: een keer per speler, als de streek helemaal verkend is. Geeft true als hij nieuw is.
export function awardAreaStamp(profile, areaId, opts = {}) {
  if (!profile || !isAreaId(areaId) || hasAreaStamp(profile, areaId)) return false;
  if (!areaProgress(profile, areaId, opts).complete) return false;
  if (!Array.isArray(profile.stempels)) profile.stempels = [];
  profile.stempels.push(areaId);
  return true;
}

// De namen die de kaart van deze speler tekent: alleen ontdekte streken, met een stempel als ze
// helemaal verkend zijn. x/y is het bestaande streekhart (regioleven.js).
export function areaLabels(profile, streken = STREKEN) {
  const known = new Set(knownAreas(profile));
  return streken.filter((s) => known.has(s.id)).map((s) => {
    const [x, y] = wgsToWorld(s.at[0], s.at[1]);
    return { id: s.id, name: s.name, x, y, stamp: hasAreaStamp(profile, s.id) };
  });
}

// Reisvoordeel naar een plek: 1, of 1 - TRAVEL_BONUS voor een streek die deze speler helemaal verkende.
export function travelFactor(profile, x, y) {
  const area = areaForPoint(x, y);
  return area && hasAreaStamp(profile, area) ? 1 - TRAVEL_BONUS : 1;
}

// Hoort dit punt op de kaart bij een streek die deze speler nog niet kent? Dan blijven de naam, het
// streeklabel en de activiteiten-iconen daar weg; de wereld, de wegen en de missies blijven zichtbaar.
export function isHiddenOnMap(profile, x, y) {
  const area = areaForPoint(x, y);
  return !!area && !areaIsKnown(profile, area);
}

