// Coöp (#95): wat een sessie onthoudt. Er is één savegame met één
// verhaalvoortgang; de modus (Alleen of Samen) wordt per sessie gekozen en
// voortgang die samen is gemaakt telt voor die save. Hier staat dus alleen de
// laatste sessie-keuze onder een eigen sleutel (KEYS.coopSession): geen
// verhaal, geen geld, geen netwerkgegevens van de host. De gast bewaart het
// verhaal niet. Opslag wordt als argument meegegeven (localStorage-achtig).

import { runMigrations } from './savemigrate.js';
import { KEYS } from './storagekeys.js';

export const SESSION_VERSION = 1;
export const SESSION_MIGRATIONS = {}; // stap n -> n + 1
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);

export const MODI = { ALLEEN: 'alleen', SAMEN: 'samen' };
export const ROLLEN = { HOST: 'host', GAST: 'gast', LOKAAL: 'lokaal' };

export function newSession() {
  return { v: SESSION_VERSION, modus: MODI.ALLEEN, rol: null, laatsteCode: '' };
}

// Alleen deze velden en vormen worden bewaard; een code mag alleen van een gast zijn
// (zo kan die opnieuw verbinden), van een host wordt nooit iets bewaard.
export function toSession(prev, { modus, rol, code }) {
  const s = isObj(prev) ? { ...prev } : newSession();
  s.v = SESSION_VERSION;
  s.modus = modus === MODI.SAMEN ? MODI.SAMEN : MODI.ALLEEN;
  s.rol = s.modus === MODI.SAMEN && Object.values(ROLLEN).includes(rol) ? rol : null;
  if (s.rol === ROLLEN.GAST && typeof code === 'string' && /^GDE2-[0-9.:A-Z-]{10,60}$/.test(code)) s.laatsteCode = code;
  if (s.rol !== ROLLEN.GAST) s.laatsteCode = '';
  return s;
}

export function parseSession(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { return null; }
  const r = runMigrations(raw, SESSION_MIGRATIONS, SESSION_VERSION, 1);
  if (!r) return null;
  const d = r.data;
  if (d.modus !== MODI.SAMEN) d.modus = MODI.ALLEEN;
  if (typeof d.laatsteCode !== 'string') d.laatsteCode = '';
  return d;
}

export function readSession(storage) {
  try { const t = storage.getItem(KEYS.coopSession); return t == null ? newSession() : (parseSession(t) || newSession()); } catch (e) { return newSession(); }
}
export function writeSession(storage, s) {
  try { storage.setItem(KEYS.coopSession, JSON.stringify(s)); return true; } catch (e) { return false; }
}
export function clearSession(storage) { try { storage.removeItem(KEYS.coopSession); return true; } catch (e) { return false; } }

// Wie mag het verhaal bewaren? Alleen en Samen als host/lokaal: ja. Gast: nee.
export const mayWriteStory = (modus, rol) => !(modus === MODI.SAMEN && rol === ROLLEN.GAST);
