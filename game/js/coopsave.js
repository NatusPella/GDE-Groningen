// Samen spelen (#95): wat een sessie onthoudt. Er is geen coöp-save en geen
// gedeelde save: iedereen houdt zijn eigen voortgang in zijn eigen save. Hier
// staat alleen de laatste kamercode of koppelcode van een gast, onder een eigen
// sleutel (KEYS.coopSession), zodat opnieuw verbinden snel gaat. Van een host
// wordt niets bewaard. Opslag wordt als argument meegegeven (localStorage-achtig).

import { runMigrations } from './savemigrate.js';
import { KEYS } from './storagekeys.js';

export const SESSION_VERSION = 1;
export const SESSION_MIGRATIONS = {}; // stap n -> n + 1
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const CODE_RE = /^(?:[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}|GDE2-[0-9.:A-Z-]{10,60})$/;

export const newSession = () => ({ v: SESSION_VERSION, laatsteCode: '' });

// Bewaart alleen een code die er als kamercode of koppelcode uitziet.
export function toSession(prev, { code } = {}) {
  const s = isObj(prev) ? { ...prev } : newSession();
  s.v = SESSION_VERSION;
  s.laatsteCode = typeof code === 'string' && CODE_RE.test(code.trim().toUpperCase()) ? code.trim().toUpperCase() : '';
  return s;
}
export function parseSession(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return null; }
  const r = runMigrations(raw, SESSION_MIGRATIONS, SESSION_VERSION, 1);
  if (!r) return null;
  return { v: SESSION_VERSION, laatsteCode: typeof r.data.laatsteCode === 'string' && CODE_RE.test(r.data.laatsteCode) ? r.data.laatsteCode : '' };
}
export function readSession(storage) {
  try { const t = storage.getItem(KEYS.coopSession); return t == null ? newSession() : (parseSession(t) || newSession()); } catch (e) { return newSession(); }
}
export function writeSession(storage, s) { try { storage.setItem(KEYS.coopSession, JSON.stringify(s)); return true; } catch (e) { return false; } }
export function clearSession(storage) { try { storage.removeItem(KEYS.coopSession); return true; } catch (e) { return false; } }
