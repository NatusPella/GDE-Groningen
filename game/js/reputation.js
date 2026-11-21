// Lichte reputatie (#1135, WP12): drie variabelen die alleen kleur geven, nooit een slot. `fame` (bekendheid van de wagen en het duo,
// 0 tot 100), `kind` (hoe je met mensen omgaat, -50 tot 50) en `buurt:<naam>` (per buurt, -20 tot 20). Een bijpersoon zegt een andere
// zin, een prijs is 5% anders, een rij is langer; Jelle spiegelt het ("Uw wagen heeft een goede naam. Dat is jammer voor mij").
// Het verhaal gebruikt dit voor het thema van de laatste akte: oprechte interesse, behulpzaamheid en liefde (`kind`) leveren
// bondgenoten op; Jelle probeert het met bureaucratie, omkoping en sabotage.
//
// Zuiver: geen DOM, geen wereld; de opslag wordt meegegeven. Lees met `reputationOf(state, scope)`, schrijf met `noteReputation`
// (een nieuwe stand, de oude blijft heel). Opslag: de eigen sleutel `reputatie` (storagekeys.js), per speler, nooit in
// een savegame en nooit over het net: bij Samen spelen heeft elke speler zijn eigen reputatie, een gast ook. Constitution: een ramp is een
// komische misser (een kar om, een frietpan in brand zonder gewonden), nooit leed. Test: scripts/reputation_test.mjs.
import { KEYS } from './storagekeys.js';
export const REPUTATION_KEY = KEYS.reputatie;
export const REPUTATION_VERSION = 1;
export const RANGES = { fame: [0, 100], kind: [-50, 50], buurt: [-20, 20] };
export const PRICE_SWING = 0.05;
export const NEIGHBOUR_MAX = 40;

const clamp = (x, [lo, hi]) => Math.max(lo, Math.min(hi, Math.round(x)));
const scopeRange = (scope) => (scope === 'fame' ? RANGES.fame : scope === 'kind' ? RANGES.kind : RANGES.buurt);
export const isNeighbourhoodScope = (scope) => typeof scope === 'string' && /^buurt:[a-z0-9 -]{1,30}$/i.test(scope);
export const validScope = (scope) => scope === 'fame' || scope === 'kind' || isNeighbourhoodScope(scope);

export function emptyReputation() { return { v: REPUTATION_VERSION, fame: 0, kind: 0, buurt: {} }; }

// Een stand uit de opslag of een lege: alles wat niet klopt, leest als 0 (nooit een fout, nooit een verlies van de rest).
export function readReputation(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = emptyReputation();
  if (Number.isFinite(s.fame)) out.fame = clamp(s.fame, RANGES.fame);
  if (Number.isFinite(s.kind)) out.kind = clamp(s.kind, RANGES.kind);
  if (s.buurt && typeof s.buurt === 'object') {
    for (const [k, v] of Object.entries(s.buurt).slice(0, NEIGHBOUR_MAX)) if (Number.isFinite(v) && /^[a-z0-9 -]{1,30}$/i.test(k)) out.buurt[k] = clamp(v, RANGES.buurt);
  }
  return out;
}

export function reputationOf(state, scope) {
  const s = readReputation(state);
  if (scope === 'fame' || scope === 'kind') return s[scope];
  if (isNeighbourhoodScope(scope)) return s.buurt[scope.slice(6)] || 0;
  return 0;
}

// Een nieuwe stand na een gebeurtenis; een onbekende scope verandert niets. `delta` is klein (-10 tot 10): een enkele gebeurtenis verandert nooit veel.
export function noteReputation(state, scope, delta) {
  const s = readReputation(state);
  const d = Math.max(-10, Math.min(10, Number(delta) || 0));
  if (!validScope(scope) || d === 0) return s;
  if (scope === 'fame' || scope === 'kind') return { ...s, [scope]: clamp(s[scope] + d, RANGES[scope]) };
  const name = scope.slice(6);
  const neighbourhood = { ...s.buurt, [name]: clamp((s.buurt[name] || 0) + d, RANGES.buurt) };
  const keys = Object.keys(neighbourhood);
  if (keys.length > NEIGHBOUR_MAX) delete neighbourhood[keys[0]];
  return { ...s, buurt: neighbourhood };
}

// Opslag per speler (een apart sleutelveld: { v, perSpeler: { <id>: stand } }); een gast heeft zijn eigen.
export function loadReputation(storage, playerId = 'lokaal') {
  try {
    const raw = storage && storage.getItem ? storage.getItem(REPUTATION_KEY) : null;
    const j = raw ? JSON.parse(raw) : null;
    return readReputation(j && j.perSpeler ? j.perSpeler[playerId] : null);
  } catch (e) { return emptyReputation(); }
}
export function saveReputation(storage, state, playerId = 'lokaal') {
  try {
    if (!storage || !storage.setItem) return false;
    const raw = storage.getItem ? storage.getItem(REPUTATION_KEY) : null;
    let j = { v: REPUTATION_VERSION, perSpeler: {} };
    try { if (raw) j = JSON.parse(raw) || j; } catch (e) { /* een kapotte opslag wordt overschreven */ }
    const perPlayer = { ...(j.perSpeler || {}), [playerId]: readReputation(state) };
    storage.setItem(REPUTATION_KEY, JSON.stringify({ v: REPUTATION_VERSION, perSpeler: perPlayer }));
    return true;
  } catch (e) { return false; }
}

// Kleur: een prijsfactor (hoogstens 5% naar beneden bij veel bekendheid en vriendelijkheid, 5% omhoog bij het omgekeerde).
export function priceFactor(state, scope = null) {
  const s = readReputation(state);
  const base = (s.fame - 50) / 50 * 0.5 + s.kind / 50 * 0.5;
  const local = scope && isNeighbourhoodScope(scope) ? (s.buurt[scope.slice(6)] || 0) / 20 : 0;
  const x = Math.max(-1, Math.min(1, base * 0.7 + local * 0.3));
  return Math.round((1 - x * PRICE_SWING) * 1000) / 1000;
}

// Een andere zin voor een bijpersoon: `lines` is [laag, midden, hoog] (of een lijst van twee). Alleen kleur: de scène werkt met elke regel.
export function reputationLine(state, lines, scope = 'kind') {
  const v = reputationOf(state, scope);
  const range = scopeRange(scope);
  const mid = (range[0] + range[1]) / 2;
  const t = (v - mid) / ((range[1] - range[0]) / 2);
  const list = Array.isArray(lines) ? lines : [];
  if (!list.length) return '';
  if (list.length === 2) return t >= 0.1 ? list[1] : list[0];
  return t <= -0.34 ? list[0] : t >= 0.34 ? list[2] : list[1];
}
// De rij voor de wagen: langer bij meer bekendheid (alleen een getal voor een rij NPC's, geen inkomen).
export const queueLength = (state, base = 3) => Math.max(base, Math.round(base + readReputation(state).fame / 12));

// ---- Schrijven en lezen vanuit het spel (#1135) ----
// Wat een gebeurtenis oplevert: een stand en een scope in, een nieuwe stand uit. Alleen kleine getallen; nooit een slot.
// Klanten bedienen: `served` dagen met verkoop geven bekendheid (hoogstens 3 per afrekening) en een tevreden of ontevreden wagen laat `kind` iets bewegen.
export function noteService(state, { days = 1, served = false, sat = 60 } = {}) {
  if (!served) return readReputation(state);
  let s = noteReputation(state, 'fame', Math.min(3, Math.max(1, Math.ceil((Number(days) || 1) / 3))));
  if (sat >= 75) s = noteReputation(s, 'kind', 1);
  else if (sat < 40) s = noteReputation(s, 'kind', -1);
  return s;
}
// Hulp aan de buurt: vriendelijk (`kind`), een beetje bekend (`fame`) en een bult in de eigen buurt (`buurt:<plek>`).
export function noteHelp(state, spot, size = 1) {
  const w = Math.max(1, Math.min(3, Math.round(Number(size) || 1)));
  let s = noteReputation(state, 'kind', 2 * w);
  s = noteReputation(s, 'fame', w);
  return /^[a-z0-9 -]{1,30}$/i.test(String(spot || '')) ? noteReputation(s, `buurt:${spot}`, 3 * w) : s;
}
// Een bijpersoon bij de wagen zegt iets anders; de zinnen zijn verzonnen en kort. [laag, midden, hoog] naar vriendelijkheid, met de buurt erbij.
export const BYSTANDER_LINES = [
  'Die wagen? Ja, die staat er. Ik heb hem nog niet geprobeerd.',
  'Ik hoor goede dingen over die frietwagen.',
  'Ik ben speciaal voor uw friet gekomen. Iedereen praat erover.',
];
// Jelle spiegelt het: pas als de wagen bekend is, anders valt er voor hem niets te zeggen.
export const JELLE_MIRROR = [
  'Uw wagen heeft een goede naam. Dat is jammer voor mij.',
  'Een hele buurt die u bedankt. Dat valt niet te declareren.',
];
export function jelleMirror(state) {
  const s = readReputation(state);
  if (s.fame < 40) return '';
  return s.kind >= 15 ? JELLE_MIRROR[1] : JELLE_MIRROR[0];
}
// Alles wat de wagenpagina toont, in één keer: de zin, Jelles spiegel en de rij (een getal voor NPC's, geen inkomen).
export function reputationView(state, spot = null) {
  const scope = spot && isNeighbourhoodScope(`buurt:${spot}`) ? `buurt:${spot}` : null;
  const line = reputationLine(state, BYSTANDER_LINES, 'kind');
  return { fame: reputationOf(state, 'fame'), kind: reputationOf(state, 'kind'), buurt: scope ? reputationOf(state, scope) : 0, line, jelle: jelleMirror(state), queue: queueLength(state), price: priceFactor(state, scope) };
}
