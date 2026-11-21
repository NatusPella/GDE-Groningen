// De koppeling van de pimp-werkplaats aan het spel (epic Autotuning, #1155): welk bezit hoort bij een voertuig,
// wat zit er nu op, en het installeren (betalen via het kasboek, bewaren, op het voertuig zetten).
// De pure kant staat in tuningdraft.js, de weergave in tuningworkshopui.js.
import { KEYS } from './storagekeys.js';
import { getOwnedEntries, repaintVehicle } from './shops.js';
import { lookKind, sanitizeLook, lookCode, parseLook } from './vehiclelook.js';
import { loadLooks, saveLooks, withLook, lookOf, buildsOf, withBuild, withoutBuild } from './vehiclelookstore.js';
import { loadTuning, saveTuning, tuningEffects, tuningKind, sanitizeTuning } from './tuningplan.js';
import { makeState, canInstall } from './tuningdraft.js';
import { noteMoney } from './finance.js';
import { recordStat } from './achievements.js';
import { markDirty } from './savehook.js';
import { pushAudioEvent } from './pedgeom.js';

const store = () => (typeof localStorage !== 'undefined' ? localStorage : null);

// 'hero' voor de Escapade, de sleutel van het bezit voor een eigen voertuig, anders null (een gestolen auto kun je niet pimpen).
export function tuneId(v) {
  if (!v) return null;
  if (v.isHeroCar) return 'hero';
  const o = getOwnedEntries().find((e) => e.v === v);
  return o ? o.key : null;
}
export const tuneKind = (v) => lookKind(v);
export const partsKindOf = (v) => tuningKind(v);

// Wat er nu op zit: { look, parts, body }.
export function readState(v) {
  const id = tuneId(v), kind = tuneKind(v) || 'auto';
  const looks = loadLooks(store(), KEYS.tuningLook), parts = loadTuning(store(), KEYS.tuning);
  return makeState({ look: lookOf(looks, id, kind), parts: parts[id] || {}, body: v.model && v.model.color }, kind, partsKindOf(v));
}
export function readBuilds(v) { return buildsOf(loadLooks(store(), KEYS.tuningLook), tuneId(v)); }

// Past de bewaarde look en onderdelen op een (nieuw) voertuig toe; aangeroepen waar het voertuig verschijnt.
export function applyStored(v) {
  const id = tuneId(v);
  if (!id) return;
  const kind = tuneKind(v);
  if (!kind) return;
  const l = lookOf(loadLooks(store(), KEYS.tuningLook), id, kind);
  if (Object.keys(l).length) v.look = l; else delete v.look;
  const p = loadTuning(store(), KEYS.tuning)[id];
  v.tuning = p ? tuningEffects(p) : v.tuning;
}

function pay(w, price) {
  if (price <= 0) return true;
  if (w.money < price) return false;
  noteMoney('Garage');
  w.money -= price;
  recordStat(w, 'purchases');
  recordStat(w, 'spent', price);
  return true;
}

// Installeert het concept `st` op v. Geeft { ok, text, tone } terug; bij een fout is er niets betaald of bewaard.
export function installState(w, v, st, ctx) {
  const id = tuneId(v), kind = tuneKind(v);
  if (!id || !kind) return { ok: false, text: 'Dit voertuig kan hier niet', tone: 'no' };
  const inst = readState(v);
  const check = canInstall(st, inst, ctx, w.money);
  if (!check.ok) return { ok: false, text: check.reason, tone: 'no' };
  if (!pay(w, check.quote.total)) return { ok: false, text: 'Te weinig geld', tone: 'no' };
  const looks = withLook(loadLooks(store(), KEYS.tuningLook), id, sanitizeLook(st.look, kind), kind);
  saveLooks(store(), KEYS.tuningLook, looks);
  const parts = loadTuning(store(), KEYS.tuning);
  const clean = sanitizeTuning(st.parts, partsKindOf(v));
  if (Object.keys(clean).length) parts[id] = clean; else delete parts[id];
  saveTuning(store(), KEYS.tuning, parts);
  v.tuning = tuningEffects(clean);
  const l = sanitizeLook(st.look, kind);
  if (Object.keys(l).length) v.look = l; else delete v.look;
  if (st.body && st.body !== (v.model && v.model.color)) repaintVehicle(w, v, st.body); // verandert het id: het beeld wordt opnieuw gebouwd
  else v.meshDirty = true;
  pushAudioEvent(w, { kind: 'impact', material: 'metal', strength: 0.5, x: v.x, y: v.y });
  recordStat(w, 'tuneInstalls');
  recordStat(w, 'tuneParts', check.quote.changed);
  markDirty('tuning');
  return { ok: true, text: check.quote.total > 0 ? 'Klaar! Henk veegt zijn handen af. Dat zijn ze weer' : 'Klaar! Terug naar standaard', tone: 'win', quote: check.quote };
}

// builds: opslaan op een plek, wissen
export function saveBuild(v, slot, naam, look) {
  const id = tuneId(v), kind = tuneKind(v);
  if (!id || !kind) return false;
  const next = withBuild(loadLooks(store(), KEYS.tuningLook), id, slot, naam, look, kind);
  return !!next && saveLooks(store(), KEYS.tuningLook, next);
}
export function deleteBuild(v, slot) {
  const id = tuneId(v);
  if (!id) return false;
  return saveLooks(store(), KEYS.tuningLook, withoutBuild(loadLooks(store(), KEYS.tuningLook), id, slot));
}
export { lookCode, parseLook };
