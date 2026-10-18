// Coöp fase 3 (#95): de coöp-save. Eigen sleutel (KEYS.coopSave = gde-coop-v1)
// met eigen versie en migratieketen; de solosave (gde-save-v1) wordt hier
// alleen gelezen (kopie van de story-sectie) en nooit geschreven of gewist.
// Gast: bewaart niets van de sessie; alleen de host schrijft deze save.
// Pure logica; opslag wordt als argument meegegeven (localStorage-achtig).

import { runMigrations } from './savemigrate.js';
import { KEYS } from './storagekeys.js';

export const COOP_SAVE_VERSION = 1;
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

// De stap van version n naar n + 1 is COOP_MIGRATIONS[n]. (Nog leeg: v1.)
export const COOP_MIGRATIONS = {};

export function newCoopSave(arc = 'oud', now = 0) {
  return { v: COOP_SAVE_VERSION, arc, origin: 'nieuw', savedAt: now, story: null, shared: { money: 0, wanted: 0 }, players: [{ char: 'tammo' }, { char: 'anita' }], mission: null };
}

// "Coöp vanaf mijn verhaal": kopieert de story-sectie, het geld en de arc uit
// een solosave. De solosave zelf blijft onaangeroerd (diepe kopie).
export function coopFromSolo(solo, now = 0) {
  if (!isObj(solo)) return newCoopSave('oud', now);
  const c = newCoopSave(solo.arc === 'nieuw' ? 'nieuw' : 'oud', now);
  c.origin = 'solo';
  c.story = solo.story != null ? JSON.parse(JSON.stringify(solo.story)) : null;
  c.shared.money = Number.isFinite(solo.money) ? Math.max(0, Math.floor(solo.money)) : 0;
  return c;
}

// Wat er van de coöp-toestand wordt bewaard: host-eigen en gedeeld, geen
// gezondheid of netwerkgegevens (geen IP-adressen, constitution 4).
export function toCoopSave(prev, { story, shared, mission, arc }, now = 0) {
  const c = isObj(prev) ? JSON.parse(JSON.stringify(prev)) : newCoopSave(arc, now);
  c.v = COOP_SAVE_VERSION;
  c.savedAt = now;
  if (story !== undefined) c.story = JSON.parse(JSON.stringify(story));
  if (isObj(shared)) c.shared = { money: Math.max(0, Math.floor(shared.money) || 0), wanted: Math.max(0, Math.min(5, shared.wanted | 0)) };
  if (mission !== undefined) c.mission = mission == null ? null : { id: String(mission.id), stage: mission.stage | 0 };
  return c;
}

// Leest en migreert. Geeft null bij kapotte, nieuwere of ontbrekende data.
export function parseCoopSave(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return null; }
  const r = runMigrations(raw, COOP_MIGRATIONS, COOP_SAVE_VERSION, 1);
  if (!r) return null;
  const d = r.data;
  if (!isObj(d.shared)) d.shared = { money: 0, wanted: 0 };
  if (!Array.isArray(d.players)) d.players = [{ char: 'tammo' }, { char: 'anita' }];
  return d;
}

export function readCoopSave(storage) {
  try { const t = storage.getItem(KEYS.coopSave); return t == null ? null : parseCoopSave(t); } catch (e) { return null; }
}
export function hasCoopSave(storage) { return readCoopSave(storage) != null; }
export function writeCoopSave(storage, save) {
  try { storage.setItem(KEYS.coopSave, JSON.stringify(save)); return true; } catch (e) { return false; }
}
export function clearCoopSave(storage) {
  try { storage.removeItem(KEYS.coopSave); return true; } catch (e) { return false; }
}

// Alleen de host bewaart; een gast schrijft nooit de sessie weg.
export const mayWrite = (role) => role === 'host' || role === 'local';
