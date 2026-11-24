// Ontdekte voertuigen (eigenaarsbesluit 22-11): de garage toont een voertuig pas als je het kent. Ontdekt is een voertuig als je
// erin hebt gezeten (bestuurder of passagier), of als je het hebt gekocht of bezit (winkel, Bezit, beloning, tuning-aankoop, cheat).
// De Escapade is altijd ontdekt. Wat je niet kent blijft verborgen, met een teller "x van y ontdekt" en zonder spoilers.
//
// Opslag: gde-garage-ontdekt-v1 (storagekeys.js), per speler en nooit in een savegame (#429): een gast heeft zijn eigen lijst.
// Migratie: bestaat de sleutel nog niet, dan telt wat je nu bezit (ook een kwijtgeraakt of opgeborgen exemplaar staat nog in de
// collectie) als ontdekt. Geen savebreuk: de save zelf verandert niet.
// Samen spelen: lokaal per speler, geen netwerkverkeer. Alleen het lichaam van dit apparaat telt (een gast die bij de opener in
// zijn voertuig stapt, telt niet voor de opener). scripts/garageknown_test.mjs.
import { hoofdspeler } from './players.js';

export const STORE_VERSION = 1;
const HERO = 'hero';
const MAX_KEYS = 400;

export const emptyKnown = () => ({ versie: STORE_VERSION, keys: [] });

// Alleen bekende sleutels, geen dubbelen, begrensd. `valid(key)`: staat dit voertuig in de winkelvoorraad?
export function cleanKnown(rec, valid = () => true) {
  if (!rec || rec.versie !== STORE_VERSION || !Array.isArray(rec.keys)) return emptyKnown();
  const keys = [];
  for (const k of rec.keys) {
    if (typeof k !== 'string' || k === HERO || keys.includes(k) || !valid(k)) continue;
    keys.push(k);
    if (keys.length >= MAX_KEYS) break;
  }
  return { versie: STORE_VERSION, keys };
}

// null: de sleutel bestaat nog niet (eerste keer, migreer dan vanuit het bezit); kapotte inhoud telt als leeg.
export function loadKnown(store, key, valid) {
  let raw = null;
  try { raw = store && store.getItem(key); } catch (e) { raw = null; }
  if (raw == null) return null;
  try { return cleanKnown(JSON.parse(raw), valid); } catch (e) { return emptyKnown(); }
}

export function saveKnown(store, key, rec, valid) {
  try { if (!store) return false; store.setItem(key, JSON.stringify(cleanKnown(rec, valid))); return true; } catch (e) { return false; }
}

export const isKnown = (rec, key) => key === HERO || !!(rec && rec.keys.includes(key));

// Zet sleutels erbij; geeft het nieuwe record en welke sleutels echt fresh waren. Geen bijwerking op het origineel.
export function addKnown(rec, keys, valid = () => true) {
  const basis = rec && Array.isArray(rec.keys) ? rec : emptyKnown();
  const fresh = [];
  for (const k of keys || []) {
    if (typeof k !== 'string' || k === HERO || !valid(k) || basis.keys.includes(k) || fresh.includes(k)) continue;
    fresh.push(k);
  }
  return { rec: fresh.length ? { versie: STORE_VERSION, keys: [...basis.keys, ...fresh] } : basis, fresh };
}

// De catalogus met een vlag per voertuig (`discovered`): bezit telt altijd mee, ook als het record het nog niet kent.
export function markKnown(list, rec) {
  return list.map((e) => ({ ...e, discovered: !!e.owned || e.hero === true || isKnown(rec, e.key || e.id) }));
}
export const visibleList = (list) => list.filter((e) => e.discovered);

export function knownCount(list) {
  const ontdekt = list.filter((e) => e.discovered).length;
  return { ontdekt, totaal: list.length, verborgen: list.length - ontdekt };
}
export const knownText = (t) => `${t.ontdekt} van ${t.totaal} ontdekt`;

// De winkelsleutel van een voertuig in de wereld: de Escapade, of wat uit de collectie/voorraad is gezet (shops.js zet stockKey).
export function stockKeyOf(v) {
  if (!v) return null;
  if (v.isHeroCar) return HERO;
  return typeof v.stockKey === 'string' && v.stockKey ? v.stockKey : null;
}

// ---- de toestand van dit apparaat (per speler) -------------------------------------------------------------------------------------------

const ctx = { store: null, key: 'garage-ontdekt', valid: () => true, owned: () => [], onNew: null };
let cache = null;

// store/key/valid/owned/onNew komen van buiten (ownedvehicles.js): zo blijft deze module puur en testbaar.
//   owned() geeft de sleutels van wat je bezit; onNew(key, world) meldt een nieuw ontdekt voertuig.
export function setKnownContext(o = {}) {
  Object.assign(ctx, o);
  cache = null;
}

function record() {
  if (cache) return cache;
  let rec = loadKnown(ctx.store, ctx.key, ctx.valid);
  if (!rec) { // migratie: eerste keer, het bezit telt als ontdekt
    rec = addKnown(emptyKnown(), ctx.owned(), ctx.valid).rec;
    saveKnown(ctx.store, ctx.key, rec, ctx.valid);
  }
  cache = rec;
  return rec;
}

// Het huidige record, met het bezit er stil bij (kopen, een beloning of een cheat melden niets: de speler weet het al).
export function knownRecord() {
  const r = addKnown(record(), ctx.owned(), ctx.valid);
  if (r.fresh.length) { cache = r.rec; saveKnown(ctx.store, ctx.key, cache, ctx.valid); }
  return cache;
}

// De speler van dit apparaat zit in `v` (bestuurder of passagier). Geeft de sleutel als het voor het eerst was, anders null.
export function noteSeated(v, world = null, lichaam = null) {
  if (world && lichaam && lichaam !== hoofdspeler(world)) return null; // een gast of metgezel telt niet voor deze speler
  const key = stockKeyOf(v);
  if (!key || key === HERO || !ctx.valid(key)) return null;
  const rec = record();
  if (isKnown(rec, key)) return null;
  const fresh = !ctx.owned().includes(key); // eigen spul was al ontdekt: dan geen melding
  cache = addKnown(rec, [key], ctx.valid).rec;
  saveKnown(ctx.store, ctx.key, cache, ctx.valid);
  if (!fresh) return null;
  if (ctx.onNew) { try { ctx.onNew(key, world); } catch (e) { /* een melding houdt het instappen niet tegen */ } }
  return key;
}
