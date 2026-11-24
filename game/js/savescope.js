// Voortgang per save (22-11): wat bij een speler hoort maar tot nu toe één gedeelde apparaat-sleutel had
// (prestaties, verkende kaart, gebieden, garage, loopbanen, bezit, enz.), hoort bij zijn save. De modules
// lezen hun sleutel bij het laden; daarom wisselt dit bij de BOOT de inhoud van die werksleutels om naar
// die van de save die opent (zie savescopeactivate.js). Wat niet bij de actieve save hoort, staat opzij onder
// 'gde-scope-<slot>:<sleutel>'. Puur over een storage-object (`ls`), zodat de test het zonder browser draait.
//
// Migratie: bestaande werksleutels (van voor deze wijziging) horen bij de save die het laatst is bewaard
// (de huidige save), niet bij een nieuw spel; niets wordt weggegooid. Een tweede oude save begint leeg
// (haar prestaties komen uit de save zelf terug, zie applyAchievementSaveData).
import { KEYS } from './storagekeys.js';

// De sleutels die per save gaan. Bewust NIET: instellingen, toegankelijkheid, taal, audio, toestemmingen,
// toetsindeling, tutorial- en hintlijsten (hudSeen, hintsGezien, uitleg), foto's, radio, benchmark en serverlijst.
export const SCOPED_KEYS = [
  'achievements', 'exploration', 'gebieden', 'garageOntdekt', 'loopbaan', 'visboek', 'hengeltuig', 'boerderij',
  'bezit', 'dieren', 'voetbalCarriere', 'beleid', 'reputatie', 'tuning', 'tuningLook', 'snackChain', 'recap',
  'help', 'wijkenSeen',
];
const META_KEY = KEYS.saveScope;
const stashKey = (n, k) => `gde-scope-${n}:${k}`;
const workKeys = () => SCOPED_KEYS.map((k) => KEYS[k]).filter(Boolean);

const get = (ls, k) => { try { return ls.getItem(k); } catch (e) { return null; } };
const set = (ls, k, v) => { try { ls.setItem(k, v); return true; } catch (e) { return false; } };
const del = (ls, k) => { try { ls.removeItem(k); } catch (e) { /* ignore */ } };

export function readOwner(ls) {
  const raw = get(ls, META_KEY);
  if (raw == null) return null; // nog nooit toegewezen: de werksleutels zijn nog gedeeld (migratie)
  try { const d = JSON.parse(raw); return d && Number.isInteger(d.owner) ? d.owner : null; } catch (e) { return null; } // kapotte meta: als nog niet toegewezen
}
const writeOwner = (ls, n) => set(ls, META_KEY, JSON.stringify({ v: 1, owner: n }));

// Zet de werksleutels op de inhoud van slot `want`. legacyOwner: bij de allereerste keer, de save waar de
// gedeelde inhoud heen gaat (0 = geen: de inhoud wordt bewaard onder 0 en komt bij niemand terug).
// Geeft { changed, from, to } terug.
export function activateScope(ls, want, legacyOwner = 0) {
  if (!ls || !Number.isInteger(want) || want < 1) return { changed: false, from: readOwner(ls), to: want };
  let owner = readOwner(ls);
  if (owner == null) owner = Number.isInteger(legacyOwner) ? legacyOwner : 0;
  if (owner === want) { writeOwner(ls, want); return { changed: false, from: owner, to: want }; }
  const keys = workKeys();
  // eerst opzij zetten wat in de werksleutels staat (de vorige eigenaar), dan die van `want` terugzetten
  for (const k of keys) {
    const v = get(ls, k);
    if (v != null) { if (!set(ls, stashKey(owner, k), v)) return { changed: false, from: owner, to: want, failed: true }; }
    else del(ls, stashKey(owner, k));
  }
  for (const k of keys) {
    del(ls, k);
    const v = get(ls, stashKey(want, k));
    if (v != null && set(ls, k, v)) del(ls, stashKey(want, k)); // de opzij gezette kopie blijft als terugzetten mislukt
  }
  writeOwner(ls, want);
  return { changed: true, from: owner, to: want };
}

// Een slot wordt gewist: wat opzij stond gaat mee. Was het de eigenaar van de werksleutels, dan worden die
// onbeheerd (0) en kan geen nieuw spel ze erven.
export function dropScope(ls, n) {
  if (!ls || !Number.isInteger(n)) return;
  for (const k of workKeys()) del(ls, stashKey(n, k));
  if (readOwner(ls) === n) writeOwner(ls, 0);
}

// "Opslaan als nieuw spel" vanuit een lopend spel: het lopende spel gaat verder als de nieuwe save, dus die
// wordt de eigenaar van de werksleutels; de vorige eigenaar houdt een kopie van de stand van dit moment.
export function forkScope(ls, newN) {
  if (!ls || !Number.isInteger(newN)) return;
  const old = readOwner(ls);
  if (old != null && old !== newN && old >= 1) {
    for (const k of workKeys()) { const v = get(ls, k); if (v != null) set(ls, stashKey(old, k), v); else del(ls, stashKey(old, k)); }
  }
  writeOwner(ls, newN);
}
