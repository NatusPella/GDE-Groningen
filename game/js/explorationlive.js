// #825: wat deze speler van de provincie ontdekt heeft, en de haken daarvan in het spel. Het eigen
// profiel staat in zijn eigen opslag (gde-verkenning-v1), net als het gebiedenprofiel van Veroverd:
// per speler en per apparaat, dus een gast ontdekt op zijn eigen scherm en de opener ziet de zijne.
// Nooit in een savegame en er gaat geen netwerkbericht over: de wereld, de uitkijkpunten en de
// missies zijn voor iedereen gelijk en alleen de kaart verbergt van een onbekende streek de naam,
// het streeklabel en de activiteiten-iconen. De regels zelf (wat is ontdekt, wat is een streek
// waard, wanneer is hij helemaal verkend) staan puur in verkenpunten.js; dit bestand doet opslag,
// de tik langs de speler, de E-actie bij een uitkijkpunt en de meldingen.
import { KEYS } from './storagekeys.js';
import { hoofdspeler } from './players.js';
import { getMissionList } from './missionquery.js';
import { getProfiel as getGebiedenProfiel, getIndeling } from './gebiedenlive.js';
import {
  TRAVEL_BONUS, newExplorationProfile, normaliseExploration, mergeExploration,
  knownAreas, areaIsKnown, revealArea, usesPoint, pointArea, viewpointKey,
  areasFromVisits, awardAreaStamp, hasAreaStamp, areaLabels, travelFactor, isHiddenOnMap,
  areaName, areaForPoint,
} from './verkenpunten.js';

const ENTRY_CHECK_S = 1;      // how often the player's own position is laid along the streken
const VIEWPOINT_R = 22;       // metres from an uitkijkpunt where its E-action works

let profile = null;
let seeded = false;
let firstCheck = true;
let checkT = 0;
const listeners = new Set();

const storage = () => {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
};

function readProfile() {
  const st = storage();
  let raw = null;
  try { raw = st ? st.getItem(KEYS.exploration) : null; } catch (e) { raw = null; }
  return raw == null ? newExplorationProfile() : normaliseExploration(raw);
}

function getExplorationProfile() {
  if (!profile) profile = readProfile();
  return profile;
}

// Bewaren, met wat een tweede tabblad intussen ontdekte erbij (net als gebiedenlive.js): wat een van
// beide zag, is gezien. De luisteraars horen het ook als de opslag vol of geblokkeerd is, want de
// ontdekking geldt dan in elk geval voor deze sessie.
function persist() {
  const st = storage();
  if (st && profile) {
    try {
      const bestaand = st.getItem(KEYS.exploration);
      if (bestaand != null) profile = mergeExploration(profile, bestaand);
      st.setItem(KEYS.exploration, JSON.stringify(profile));
    } catch (e) { /* opslag vol of geblokkeerd: de ontdekking blijft in dit spel */ }
  }
  for (const f of listeners) { try { f(profile); } catch (e) { /* de luisteraar is niet ons probleem */ } }
}

// De kaart vraagt hierom als hij opnieuw moet tekenen (een streek erbij, een stempel erbij).
export function onExplorationChange(f) {
  listeners.add(f);
  return () => listeners.delete(f);
}

// --- wat de kaart vraagt -----------------------------------------------------

// Onbekende streek op deze plek: naam, streeklabel en activiteiten-iconen blijven weg.
export const isAreaHidden = (x, y) => isHiddenOnMap(getExplorationProfile(), x, y);
export const isAreaKnown = (areaId) => areaIsKnown(getExplorationProfile(), areaId);
export const isViewpointUsed = (point) => !!point && usesPoint(getExplorationProfile(), viewpointKey(point));
export const explorationLabels = () => areaLabels(getExplorationProfile());
// reisvoordeel voor een bestemming: 1, of 1 - TRAVEL_BONUS voor een helemaal verkende streek
export const travelFactorFor = (x, y) => travelFactor(getExplorationProfile(), x, y);

// --- de tik langs de speler --------------------------------------------------

// Wie hier al eerder was (de bezochte buurten van gebieden.js) begint niet bij nul: dat is het
// startpunt van deze laag. Zonder de grenzen van de wereld kan het niet, dus proberen we het later
// opnieuw.
function seedFromVisits() {
  if (seeded) return;
  let ind = null;
  try { ind = getIndeling(); } catch (e) { ind = null; }
  if (!ind || !ind.grenzen) return;
  seeded = true;
  let changed = false;
  let visits = null;
  try { visits = getGebiedenProfiel(); } catch (e) { visits = null; }
  for (const area of areasFromVisits(visits, ind)) if (revealArea(getExplorationProfile(), area)) changed = true;
  if (changed) persist();
}

// De stempel per streek: alle missies van de streek klaar en alle uitkijkpunten gebruikt. De punten
// komen van de kaart (map.meta.uitkijkpunten, gevuld zodra de kits geladen zijn), de missies uit de
// missielijst van deze speler.
function refreshStamps(world) {
  const own = getExplorationProfile();
  const areas = knownAreas(own);
  if (!areas.length) return [];
  const points = (world && world.map && world.map.meta && world.map.meta.uitkijkpunten) || null;
  if (!points || !points.length) return [];
  let missions = [];
  try { missions = getMissionList() || []; } catch (e) { missions = []; }
  // zonder missielijst (nog niet geladen) weten we niet of een streek af is: dan nog geen stempel
  if (!missions.length) return [];
  const fresh = [];
  for (const area of areas) {
    if (hasAreaStamp(own, area)) continue;
    if (awardAreaStamp(own, area, { missions, points })) fresh.push(area);
  }
  if (!fresh.length) return fresh;
  persist();
  const bonus = Math.round(TRAVEL_BONUS * 100);
  for (const area of fresh) {
    const name = areaName(area);
    if (world && world.addMessage) {
      world.addMessage(`Streekstempel: ${name} verkend. Op de kaart reis je er ${bonus}% sneller heen.`, 7, { kind: 'prestatie', kicker: 'Streek verkend', key: 'streekstempel-' + area });
    }
  }
  return fresh;
}

function announceArea(world, area) {
  if (!world || !world.addMessage) return;
  const name = areaName(area);
  world.addMessage(`Nieuwe streek: ${name}. De naam staat nu op je kaart.`, 5, { kind: 'prestatie', kicker: 'Verkend', key: 'streek-ontdekt-' + area });
}

// Per frame (regiolevenrt.js voor de opener, coopgastlokaal.js voor een gast): de eigen plek langs
// de streken leggen en de stempels bijwerken. De eerste keer stil, zodat een laadbeurt niet meteen
// een melding geeft als de speler al in een streek stond.
export function updateExploration(dt, world) {
  if (!world) return;
  const p = hoofdspeler(world);
  if (!p) return;
  seedFromVisits();
  checkT -= dt;
  if (checkT > 0) return;
  checkT = ENTRY_CHECK_S;
  const area = areaForPoint(p.x, p.y);
  const quiet = firstCheck;
  firstCheck = false;
  if (area && revealArea(getExplorationProfile(), area)) {
    persist();
    if (!quiet) announceArea(world, area);
  }
  refreshStamps(world);
}

// --- het uitkijkpunt in de wereld --------------------------------------------

// Het dichtstbijzijnde uitkijkpunt binnen bereik, of null. Alleen als de kits al op de kaart staan.
function nearestViewpoint(world) {
  const p = hoofdspeler(world);
  const points = (world && world.map && world.map.meta && world.map.meta.uitkijkpunten) || null;
  if (!p || !points || !points.length) return null;
  let best = null, bestD = VIEWPOINT_R;
  for (const u of points) {
    if (!u || !Number.isFinite(u.x) || !Number.isFinite(u.y)) continue;
    const d = Math.hypot(u.x - p.x, u.y - p.y);
    if (d <= bestD) { bestD = d; best = u; }
  }
  return best;
}

// De E-hint bij het uitkijkpunt (prompts.js). Een punt dat al gebruikt is vraagt niets meer.
export function viewpointPrompt(world) {
  const point = nearestViewpoint(world);
  if (!point || !pointArea(point)) return null;
  const own = getExplorationProfile();
  if (usesPoint(own, viewpointKey(point))) return null;
  const p = hoofdspeler(world);
  if (p && p.inVehicle) return null; // uitkijken doe je te voet
  const known = areaIsKnown(own, point.streek);
  return {
    id: 'uitkijkpunt:' + point.streek, x: point.x, y: point.y, h: 1.7, key: 'E', label: 'Uitzicht bekijken',
    sub: known ? `Het uitkijkpunt van ${point.streekNaam || areaName(point.streek)}` : 'Vanaf hier ontdek je de streek',
    ring: true,
  };
}

// E bij een uitkijkpunt: de streek onthullen en het punt in het eigen profiel zetten. Geeft true als
// de toets van het uitkijkpunt was.
export function tryViewpointInteract(world) {
  const input = world && world.input;
  const point = nearestViewpoint(world);
  if (!point || !pointArea(point)) return false;
  const p = hoofdspeler(world);
  if (p && p.inVehicle) return false;
  if (!input || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const own = getExplorationProfile();
  if (usesPoint(own, viewpointKey(point))) return false;
  if (input.consume) { input.consume('e'); input.consume('f'); }
  const known = areaIsKnown(own, point.streek);
  revealArea(own, point.streek, { point: viewpointKey(point) });
  persist();
  if (world.addMessage) {
    const name = point.streekNaam || areaName(point.streek);
    world.addMessage(known ? `Uitkijkpunt gebruikt: ${name} was al bekend, dit punt telt nu mee.` : `Je kijkt uit over ${name}. De streek staat nu op je kaart.`, 5, { kind: 'prestatie', kicker: 'Uitkijkpunt', key: 'uitkijkpunt-' + point.streek });
  }
  refreshStamps(world);
  return true;
}

