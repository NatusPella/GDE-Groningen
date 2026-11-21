// Opslag van de uiterlijk-tuning per voertuig en de opgeslagen builds (epic Autotuning, #1155).
// Eén JSON-object onder KEYS.tuningLook (storagekeys.js): { versie: 1, voertuigen: { [id]: { code, builds: [{ naam, code }] } } }.
// De sleutel staat los van de savegame (per speler, ook bij Samen spelen) en los van de onderdelen-opslag
// (gde-tuning-v1), zodat geen van beide kan stukgaan door de ander. `code` is de compacte look-code
// (vehiclelook.js lookCode); de id's zijn dezelfde als bij tuningplan: 'hero' of de sleutel van het bezit.
// Pure functies op een gewoon object, plus load/save op een localStorage-achtig `store`.
import { lookCode, parseLook, cleanBuildName, PRESETS_PER_VEHICLE } from './vehiclelook.js';
import { KEYS } from './storagekeys.js';

export const LOOK_STORE_VERSION = 1;
const MAX_VEHICLES = 64;

const cleanId = (id) => String(id).slice(0, 40);

function cleanRecord(rec, kind = 'auto') {
  if (!rec || typeof rec !== 'object') return null;
  const look = parseLook(rec.code, kind);
  const builds = [];
  for (const b of Array.isArray(rec.builds) ? rec.builds : []) {
    const l = b && parseLook(b.code, kind);
    if (l && Object.keys(l).length && builds.length < PRESETS_PER_VEHICLE) builds.push({ naam: cleanBuildName(b.naam), code: lookCode(l, kind) });
  }
  const code = look ? lookCode(look, kind) : '';
  if (!code && !builds.length) return null;
  return { code, builds };
}

// De stand uit de opslag; fouten, rommel of een andere versie geven een lege stand (nooit een crash).
export function loadLooks(store, key) {
  try {
    const raw = store && store.getItem(key);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (!data || data.versie !== LOOK_STORE_VERSION || typeof data.voertuigen !== 'object' || !data.voertuigen) return {};
    const out = {};
    for (const [id, rec] of Object.entries(data.voertuigen).slice(0, MAX_VEHICLES)) {
      const c = cleanRecord(rec);
      if (c) out[cleanId(id)] = c;
    }
    return out;
  } catch { return {}; }
}

export function saveLooks(store, key, all) {
  try {
    if (!store) return false;
    const vehicles = {};
    for (const [id, rec] of Object.entries(all || {}).slice(0, MAX_VEHICLES)) {
      const c = cleanRecord(rec);
      if (c) vehicles[cleanId(id)] = c;
    }
    store.setItem(key, JSON.stringify({ versie: LOOK_STORE_VERSION, voertuigen: vehicles }));
    return true;
  } catch { return false; }
}

// --- bewerken (geven een nieuw object terug, de invoer blijft heel) ----------------------------------
export const lookOf = (all, id, kind = 'auto') => (all && all[id] && parseLook(all[id].code, kind)) || {};
export const buildsOf = (all, id) => (all && all[id] && all[id].builds ? all[id].builds.map((b) => ({ ...b })) : []);

export function withLook(all, id, look, kind = 'auto') {
  const out = { ...(all || {}) };
  const cur = out[id] || { code: '', builds: [] };
  const code = lookCode(look, kind);
  if (!code && !cur.builds.length) delete out[id];
  else out[id] = { code, builds: cur.builds };
  return out;
}

// Een build opslaan op plek `slot` (0..2); een volle lijst vervangt die plek. Een kale look kan niet.
export function withBuild(all, id, slot, naam, look, kind = 'auto') {
  const code = lookCode(look, kind);
  if (!code || !(slot >= 0 && slot < PRESETS_PER_VEHICLE)) return null;
  const out = { ...(all || {}) };
  const cur = out[id] || { code: '', builds: [] };
  const builds = cur.builds.map((b) => ({ ...b }));
  const entry = { naam: cleanBuildName(naam), code };
  if (slot < builds.length) builds[slot] = entry;
  else builds.push(entry);
  out[id] = { code: cur.code, builds };
  return out;
}

export function withoutBuild(all, id, slot) {
  const out = { ...(all || {}) };
  const cur = out[id];
  if (!cur || !cur.builds[slot]) return out;
  const builds = cur.builds.filter((_, i) => i !== slot);
  if (!cur.code && !builds.length) delete out[id];
  else out[id] = { code: cur.code, builds };
  return out;
}

// --- de runtime-kant: de look aan een voertuig hangen -----------------------------------------------------
const defaultStore = () => (typeof localStorage !== 'undefined' ? localStorage : null);

// Zet v.look uit de opslag voor dit bezit (aangeroepen waar v.tuning ook wordt gezet).
export function attachStoredLook(v, id, key, store = defaultStore(), kind = 'auto') {
  try {
    if (!id) return false;
    const l = lookOf(loadLooks(store, key), id, kind);
    if (Object.keys(l).length) { v.look = l; return true; }
  } catch { /* zonder opslag geen look */ }
  return false;
}

// De look van één bezit voor weergave (garagekaarten, voorbeelden): leest de opslag met een geheugen op de ruwe tekst,
// zodat een kaartenlijst die elk beeld getekend wordt niet elke keer opnieuw parset. Geeft undefined bij een kale auto.
let memoRaw = null, memoAll = {};
export function storedLookOf(id, kind = 'auto', store = defaultStore()) {
  try {
    const raw = store ? store.getItem(KEYS.tuningLook) : null;
    if (raw !== memoRaw) { memoRaw = raw; memoAll = loadLooks(store, KEYS.tuningLook); }
    const l = lookOf(memoAll, id, kind);
    return Object.keys(l).length ? l : undefined;
  } catch { return undefined; }
}
