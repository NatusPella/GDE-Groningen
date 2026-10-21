// Save slots (#208): several savegames, each with a name, a date and a play time.
//
// - Slot 1 is the one save every player already has ('gde-save-v1'), so the move from
//   one save to slots loses nothing and moves nothing; slots 2.. have their own keys
//   (storagekeys.js slotKey). The list (names, the active slot) lives under KEYS.saveSlots.
// - Every write keeps the previous good save of that slot as a recovery copy; a slot
//   that no longer parses is read from that copy and says so.
// - Export and import are a plain file (a JSON envelope round the save): local, no network.
// - Pure (no DOM, no three.js): the storage is passed in, scripts/saveslots_test.mjs runs it.
//   savegame.js does the world <-> save part.
import { KEYS, MAX_SLOTS, slotKey, slotRecoveryKey, slotThumbKey } from './storagekeys.js';
import { migrateSave, savedArc, SAVE_VERSION } from './savemigrate.js';
import { ARC_ID } from './storyarc.js';

export const NAME_MAX = 28;
export const FILE_KIND = 'GDE-save';
// a save of this size or more is not ours (a real one is some tens of kB)
export const MAX_IMPORT_CHARS = 2_000_000;

const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function ls0(ls) {
  if (ls) return ls;
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch (e) { return null; }
}

export function cleanName(s, fallback = '') {
  const t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return t || fallback;
}

export const defaultName = (n) => `Opgeslagen spel ${n}`;

// 3725 -> '1 u 02 min', 540 -> '9 min', 0 -> 'net begonnen'
export function formatPlaytime(sec) {
  const m = Math.floor(num(sec) / 60);
  if (m < 1) return 'net begonnen';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} u ${String(m % 60).padStart(2, '0')} min`;
}

// --- the list ----------------------------------------------------------------------------

export function readIndex(ls) {
  const idx = { active: 1, names: {} };
  try {
    const d = JSON.parse(ls0(ls).getItem(KEYS.saveSlots) || 'null');
    if (isObj(d)) {
      if (Number.isInteger(d.active) && d.active >= 1 && d.active <= MAX_SLOTS) idx.active = d.active;
      if (isObj(d.names)) for (const [k, v] of Object.entries(d.names)) { const n = Number(k); if (Number.isInteger(n) && n >= 1 && n <= MAX_SLOTS && typeof v === 'string') idx.names[n] = cleanName(v); }
    }
  } catch (e) { /* no list yet: slot 1 is the active one */ }
  return idx;
}

function writeIndex(ls, idx) {
  try { ls0(ls).setItem(KEYS.saveSlots, JSON.stringify(idx)); return true; } catch (e) { return false; }
}

const getRaw = (ls, k) => { try { return ls0(ls).getItem(k); } catch (e) { return null; } };

// What a stored text is: { ok, data, from } for a save this game can load, else { ok: false, why }
// why: 'leeg' | 'kapot' (not JSON / not a save) | 'nieuwer' (written by a newer game) | 'ander-verhaal'
export function inspectRaw(raw) {
  if (raw == null || raw === '') return { ok: false, why: 'leeg' };
  let d;
  try { d = JSON.parse(raw); } catch (e) { return { ok: false, why: 'kapot' }; }
  if (!isObj(d)) return { ok: false, why: 'kapot' };
  if (Number.isInteger(d.v) && d.v > SAVE_VERSION) return { ok: false, why: 'nieuwer' };
  let m;
  try { m = migrateSave(d); } catch (e) { return { ok: false, why: 'kapot' }; } // e.g. nested too deep to copy
  if (!m) return { ok: false, why: 'kapot' };
  if (savedArc(m.data) !== ARC_ID) return { ok: false, why: 'ander-verhaal' };
  return { ok: true, data: m.data, from: m.from };
}

// a text worth keeping as the recovery copy: a save this game can load, or one from a newer game
// (not junk that merely parses: that would replace a good copy)
function isSaveText(t) {
  const r = inspectRaw(t);
  return r.ok || r.why === 'nieuwer';
}

// The state of one slot: { n, state, data, from, raw, why }
// state: 'leeg' | 'ok' | 'hersteld' (read from the recovery copy) | 'kapot' | 'nieuwer' | 'ander-verhaal'
export function readSlot(ls, n) {
  const raw = getRaw(ls, slotKey(n));
  const main = inspectRaw(raw);
  if (main.ok) return { n, state: 'ok', data: main.data, from: main.from, raw };
  const rec = getRaw(ls, slotRecoveryKey(n));
  if (main.why === 'kapot' || main.why === 'leeg') {
    const r = inspectRaw(rec);
    if (r.ok) return { n, state: 'hersteld', data: r.data, from: r.from, raw: rec, recovered: true };
  }
  return { n, state: main.why, data: null, raw, why: main.why };
}

// a short description for the lists, from a (migrated) save
export function summarize(d) {
  if (!isObj(d)) return null;
  const done = isObj(d.missions) && Array.isArray(d.missions.completed) ? d.missions.completed.length : 0;
  return {
    savedAt: num(d.savedAt),
    money: Math.max(0, num(d.money)),
    missionsDone: done,
    playSeconds: Math.max(0, num(d.speeltijd)),
    character: d.character === 'anita' ? 'Tessa' : 'Tammo',
    goal: isObj(d.doel) && typeof d.doel.name === 'string' ? cleanName(d.doel.name, '') : '',
    storyDone: isObj(d.story) && Array.isArray(d.story.done) ? d.story.done.length : 0,
  };
}

// All slots that hold something (or have a name), in slot order.
export function listSlots(ls) {
  const idx = readIndex(ls);
  const out = [];
  for (let n = 1; n <= MAX_SLOTS; n++) {
    const has = getRaw(ls, slotKey(n)) != null || getRaw(ls, slotRecoveryKey(n)) != null;
    if (!has) continue;
    const r = readSlot(ls, n);
    if (r.state === 'leeg') continue;
    out.push({ n, name: idx.names[n] || defaultName(n), state: r.state, why: r.why || '', active: idx.active === n, summary: r.data ? summarize(r.data) : null });
  }
  return out;
}

export function freeSlot(ls) {
  for (let n = 1; n <= MAX_SLOTS; n++) if (getRaw(ls, slotKey(n)) == null && getRaw(ls, slotRecoveryKey(n)) == null) return n;
  return 0;
}

export function activeSlot(ls) {
  return readIndex(ls).active;
}

// At boot: the active slot when it holds a save, else the slot saved last (a new game that never
// got to save leaves an empty active slot behind). Returns the active slot.
export function pickActive(ls) {
  const idx = readIndex(ls);
  if (readSlot(ls, idx.active).state !== 'leeg') return idx.active;
  const best = listSlots(ls).filter((x) => x.summary).sort((a, b) => b.summary.savedAt - a.summary.savedAt)[0];
  if (best) { setActive(ls, best.n); return best.n; }
  return idx.active;
}

export function setActive(ls, n) {
  const idx = readIndex(ls);
  idx.active = n;
  return writeIndex(ls, idx);
}

export function renameSlot(ls, n, name) {
  const idx = readIndex(ls);
  const nm = cleanName(name);
  if (nm && nm !== defaultName(n)) idx.names[n] = nm; else delete idx.names[n];
  return writeIndex(ls, idx);
}

// Makes the slot's name when it has none; returns the name shown.
export function nameOf(ls, n) {
  return readIndex(ls).names[n] || defaultName(n);
}

// --- writing ----------------------------------------------------------------------------

// The robust write: the previous good save becomes the recovery copy, the new text is
// read back and compared, and a failed write puts the old text back. No room for the
// recovery copy is no reason to lose the save itself. Returns true when the new text stands.
export function writeSlotRaw(ls, n, text) {
  const s = ls0(ls);
  if (!s) return false;
  const key = slotKey(n);
  let prev = null;
  try { prev = s.getItem(key); } catch (e) { return false; }
  if (prev != null && prev !== text && isSaveText(prev)) {
    try { s.setItem(slotRecoveryKey(n), prev); } catch (e) { /* full: the recovery copy of this round is skipped */ }
  }
  const put = () => { s.setItem(key, text); if (s.getItem(key) !== text) { const e = new Error('read-back differs'); e.torn = true; throw e; } };
  try {
    put();
    return true;
  } catch (e) {
    // full: the recovery copy takes as much room as the save, so give it up before giving up the save
    if (!e.torn) { try { s.removeItem(slotRecoveryKey(n)); put(); return true; } catch (e1) { /* still no room */ } }
    try { if (prev != null) s.setItem(key, prev); } catch (e2) { /* nothing more to do */ }
    return false;
  }
}

export function writeSlot(ls, n, save) {
  let text;
  try { text = JSON.stringify(save); } catch (e) { return false; }
  return writeSlotRaw(ls, n, text);
}

// A new empty slot (named), made the active one. Returns its number or 0 when all are in use.
export function createSlot(ls, name, want = 0) {
  const n = want >= 1 && want <= MAX_SLOTS && getRaw(ls, slotKey(want)) == null && getRaw(ls, slotRecoveryKey(want)) == null ? want : freeSlot(ls);
  if (!n) return 0;
  const idx = readIndex(ls);
  const nm = cleanName(name);
  if (nm && nm !== defaultName(n)) idx.names[n] = nm; else delete idx.names[n];
  idx.active = n;
  return writeIndex(ls, idx) ? n : 0;
}

// Deletes a slot and its recovery copy. When it was the active one, the first slot left
// (or 1) becomes the active one.
export function deleteSlot(ls, n) {
  const s = ls0(ls);
  try { s.removeItem(slotKey(n)); s.removeItem(slotRecoveryKey(n)); s.removeItem(slotThumbKey(n)); } catch (e) { return false; }
  const idx = readIndex(ls);
  delete idx.names[n];
  if (idx.active === n) {
    const left = listSlots(ls).filter((x) => x.n !== n);
    idx.active = left.length ? left[0].n : 1;
  }
  return writeIndex(ls, idx);
}

// --- thumbnails, copies, time words ------------------------------------------------------

// A thumbnail is a small 'data:image/jpeg' text; anything else is not kept.
const THUMB_MAX = 40_000;
const isThumb = (t) => typeof t === 'string' && t.length > 64 && t.length <= THUMB_MAX && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(t);

export function readThumb(ls, n) {
  const t = getRaw(ls, slotThumbKey(n));
  return isThumb(t) ? t : '';
}

export function writeThumb(ls, n, url) {
  if (!isThumb(url)) return false;
  try { ls0(ls).setItem(slotThumbKey(n), url); return true; } catch (e) { return false; } // full: no thumbnail, the savegame is what counts
}

// A copy of a slot in the first free place: the same save, the name + ' (kopie)', the thumbnail.
// Returns { ok, n, name } or { ok: false, why: 'leeg' | 'vol' | 'opslaan' }. Never changes the original.
export function copySlot(ls, n) {
  const r = readSlot(ls, n);
  if (!r.data) return { ok: false, why: 'leeg' };
  const to = freeSlot(ls);
  if (!to) return { ok: false, why: 'vol' };
  if (!writeSlot(ls, to, r.data)) return { ok: false, why: 'opslaan' };
  const name = cleanName(`${nameOf(ls, n).slice(0, NAME_MAX - 8)} (kopie)`);
  const idx = readIndex(ls);
  idx.names[to] = name;
  writeIndex(ls, idx);
  const th = readThumb(ls, n);
  if (th) writeThumb(ls, to, th);
  return { ok: true, n: to, name };
}

// 'zojuist', '12 min geleden', '3 u geleden', 'gisteren', '5 dagen geleden', else ''
export function agoText(ms, now = Date.now()) {
  if (!ms || !Number.isFinite(ms)) return '';
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 60) return 'zojuist';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min geleden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} u geleden`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'gisteren';
  if (d < 14) return `${d} dagen geleden`;
  return '';
}

// --- export / import --------------------------------------------------------------------

export function exportFileName(name, now = new Date()) {
  const slug = cleanName(name, 'save').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'save';
  return `gde-save-${slug}-${now.toISOString().slice(0, 10)}.json`;
}

// The file for a slot: { ok, filename, text } or { ok: false, why }.
export function exportSlot(ls, n, now = new Date()) {
  const r = readSlot(ls, n);
  if (!r.data) return { ok: false, why: r.state };
  const name = nameOf(ls, n);
  const env = { kind: FILE_KIND, v: 1, name, exportedAt: now.toISOString(), save: r.data };
  return { ok: true, filename: exportFileName(name, now), text: JSON.stringify(env) };
}

// Checks the text of a file: { ok, name, data, from } or { ok: false, why } with why
// 'groot' | 'kapot' | 'geen-save' | 'nieuwer' | 'ander-verhaal'. A bare save (the
// content of the localStorage key) is accepted as well.
export function parseImport(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, why: 'kapot' };
  if (text.length > MAX_IMPORT_CHARS) return { ok: false, why: 'groot' };
  let d;
  try { d = JSON.parse(text); } catch (e) { return { ok: false, why: 'kapot' }; }
  if (!isObj(d)) return { ok: false, why: 'geen-save' };
  let save = d, name = '';
  if (d.kind === FILE_KIND) {
    if (!isObj(d.save)) return { ok: false, why: 'geen-save' };
    save = d.save;
    name = cleanName(d.name);
  } else if (!Number.isInteger(d.v) || !('money' in d || 'missions' in d || 'story' in d)) {
    return { ok: false, why: 'geen-save' };
  }
  let r;
  try { r = inspectRaw(JSON.stringify(save)); } catch (e) { return { ok: false, why: 'kapot' }; }
  if (!r.ok) return { ok: false, why: r.why === 'leeg' ? 'kapot' : r.why };
  return { ok: true, name, data: r.data, from: r.from };
}

// Puts an imported save in a new slot (never over an existing one). Returns { ok, n } or { ok: false, why }.
export function importAsNewSlot(ls, text) {
  const p = parseImport(text);
  if (!p.ok) return p;
  const n = freeSlot(ls);
  if (!n) return { ok: false, why: 'vol' };
  if (!writeSlot(ls, n, p.data)) return { ok: false, why: 'opslaan' };
  const idx = readIndex(ls);
  if (p.name && p.name !== defaultName(n)) idx.names[n] = p.name;
  writeIndex(ls, idx);
  return { ok: true, n, name: p.name || defaultName(n) };
}

// The words for a state in the lists (Dutch, for the player).
export function stateText(state) {
  switch (state) {
    case 'hersteld': return 'Hersteld uit de herstelkopie';
    case 'kapot': return 'Kapot: kan niet geladen worden';
    case 'nieuwer': return 'Gemaakt met een nieuwere versie van het spel';
    case 'ander-verhaal': return 'Hoort bij het andere verhaal';
    default: return '';
  }
}

export function importErrorText(why) {
  switch (why) {
    case 'groot': return 'Dit bestand is te groot voor een savegame.';
    case 'nieuwer': return 'Deze savegame komt uit een nieuwere versie van het spel.';
    case 'ander-verhaal': return 'Deze savegame hoort bij het andere verhaal.';
    case 'vol': return `Alle ${MAX_SLOTS} plekken zijn in gebruik. Verwijder eerst een savegame.`;
    case 'opslaan': return 'Opslaan mislukt: er is geen ruimte meer.';
    case 'geen-save': return 'Dit bestand is geen GDE-savegame.';
    default: return 'Dit bestand is kapot en kan niet gelezen worden.';
  }
}
