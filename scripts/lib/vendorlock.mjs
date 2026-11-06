// De sha256-lock op de binnengehaalde three.js en fonts (#593 punt 8). De build haalt die
// bestanden van jsDelivr en Google Fonts; zonder controle komt een gecompromitteerde CDN,
// edge of een aangepast cachebestand ongewijzigd in elke distributie.
// desktop/vendor-cache.lock.json staat in git: per cachebestand de sha256 (en de bron-url).
// De build controleert na download én bij een cache-hit en faalt bij afwijking; bewust
// bijwerken met GDE_UPDATE_VENDOR_LOCK=1.
import crypto from 'node:crypto';
import fs from 'node:fs';

export const LOCK_VERSION = 1;
export const LOCK_FILE = 'vendor-cache.lock.json';

export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function parseLock(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !data.files || typeof data.files !== 'object') throw new Error('geen files-object');
  return { version: Number(data.version) || LOCK_VERSION, files: data.files };
}

// Ontbrekende of onleesbare lock = leeg: de build faalt dan op de eerste download met een
// duidelijke melding in plaats van stil door te gaan.
export function loadLock(file) {
  try { return parseLock(fs.readFileSync(file, 'utf8')); } catch { return { version: LOCK_VERSION, files: {} }; }
}

// -> null als het bestand klopt, anders de melding (zonder de bytes zelf te printen).
export function lockProblem(lock, key, buf, url) {
  const entry = lock && lock.files && lock.files[key];
  if (!entry || !entry.sha256) return `niet in ${LOCK_FILE}: ${key}${url ? ` (${url})` : ''}; maak de lock bewust bij met GDE_UPDATE_VENDOR_LOCK=1`;
  const hash = sha256(buf);
  if (entry.sha256 !== hash) {
    return `sha256 wijkt af voor ${key}: de lock zegt ${String(entry.sha256).slice(0, 12)}…, dit bestand is ${hash.slice(0, 12)}…${url ? ` (${url})` : ''}. Niet stil doorgaan: een gewijzigd vendorbestand is precies wat deze controle moet vangen.`;
  }
  return null;
}

// entries: { key: { url, sha256 } }; gesorteerd, zodat de lock stabiel in git staat.
export function serializeLock(entries) {
  const files = {};
  for (const key of Object.keys(entries).sort()) files[key] = { url: entries[key].url, sha256: entries[key].sha256 };
  return JSON.stringify({ version: LOCK_VERSION, note: 'sha256 per binnengehaald vendorbestand (#593); bijwerken met GDE_UPDATE_VENDOR_LOCK=1 node desktop/build.mjs', files }, null, 1) + '\n';
}
