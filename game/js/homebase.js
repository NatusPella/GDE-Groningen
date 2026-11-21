// Thuis per verhaalstap (#1121, pakket "verhuizen"): Tammo en Tessa blijven niet in één flat. Per akte is er een andere logische
// verhaalplek (Paddepoel, Oma Trijntjes logeerkamer, het havenkantoor, Tinus' schuur, ...) en het actieve thuis van een speler
// wisselt mee; de speler kan het ook zelf vastpinnen. Dit is het zuivere datamodel (geen DOM, geen wereld, geen opslag, geen
// THREE): scripts/homebase_test.mjs loopt het in node. De consumenten (slapen en opslaan, naar huis reizen, respawn, het
// flat-interieur, de garage, de kast, de kaartmarkering, de startkaart) lezen `activeHome()` en bouwen hun eigen gedrag daarop;
// wat al klaarstaat en wat nog moet staat in docs/VERHAAL-THUIS-21-11.md.
//
// Migratie: een bestaande save heeft nog geen `home`-veld. Dat leest als { active: 'paddepoel', unlocked: ['paddepoel'], pinned: false }
// en blijft dus precies zoals het was (Paddepoel is het eerste huis, `readHomeState`). Er wordt niets in de save geschreven tot
// de speler iets doet. Samen spelen: elke speler heeft zijn eigen thuis (lokaal, zoals de rest van zijn voortgang); een gast ziet in
// andermans wereld zijn eigen `activeHome`, de host ziet dat van de host. Geen enkel thuis verandert voortgang, geld of een einde.
import { STEPS } from './storyarc.js';

export const HOME_STATE_VERSION = 1;
export const DEFAULT_HOME = 'paddepoel';

// kind: 'flat' | 'kamer' | 'kantoor' | 'schuur' | 'wagen' | 'pand' (een Bezit-pand: zie registerHome)
// fromStep: de stap waarvan het verhaal hier woont; interior: de variant van het bestaande flat-interieur (andere indeling of
// kleur, geen nieuwe assets); anchor: waar op de kaart (een startplek van een missie of een eigen spot; geen echte adressen)
const BASE = [
  { id: 'paddepoel', name: 'De flat in Paddepoel', kind: 'flat', fromStep: 'M00', until: 'M07', interior: 'flat-standaard', anchor: { spot: 'flat' }, neighbours: ['veldkamp'], sleeps: true, closet: true, garage: true,
    why: 'Huisgenoten sinds 14 augustus: elfde verdieping, een garage voor de Escapade.', hint: 'Je flat in Paddepoel.' },
  { id: 'oma_noorderhaven', name: 'Oma Trijntjes logeerkamer', kind: 'kamer', fromStep: 'M07', until: 'M12', interior: 'kamer-oma', anchor: { mission: 'fatbike' }, neighbours: ['trijntje'], sleeps: true, closet: false, garage: false,
    why: 'Akte 2: ze logeren bij Oma aan de Noorderhaven terwijl het recept van 1953 wordt gered.', hint: 'Een logeerkamer bij Oma Trijntje.' },
  { id: 'havenkantoor', name: 'Lammerts havenkantoor', kind: 'kantoor', fromStep: 'M12', until: 'M17', interior: 'kantoor-haven', anchor: { mission: 'containers' }, neighbours: ['lammert'], sleeps: true, closet: false, garage: false,
    why: 'Akte 3: twee bedden in een havenkantoor aan de Eems (de grap van Lammert); hun eerste eigen stek.', hint: 'Het havenkantoor in de Eemshaven.' },
  { id: 'schuur_tinus', name: "Tinus' schuur", kind: 'schuur', fromStep: 'M17', until: 'M23', interior: 'schuur-tinus', anchor: { mission: 'luik' }, neighbours: ['tinus', 'henk'], sleeps: true, closet: false, garage: true,
    why: 'Akte 4 en het begin van akte 5: slapen in de schuur bij Zuidhorn, waar de Escapade een luik krijgt.', hint: "De schuur van Tinus bij Zuidhorn." },
  { id: 'oma_keuken', name: "Oma's keuken", kind: 'kamer', fromStep: 'M23', until: 'M27', interior: 'kamer-oma', anchor: { mission: 'bod' }, neighbours: ['trijntje'], sleeps: true, closet: false, garage: false,
    why: 'De dagen rond het Ontzet: terug bij Oma aan de Noorderhaven.', hint: "Oma's keuken aan de Noorderhaven." },
  { id: 'paddepoel_stel', name: 'De flat in Paddepoel (als stel)', kind: 'flat', fromStep: 'M27', until: null, interior: 'flat-stel', anchor: { spot: 'flat' }, neighbours: ['veldkamp'], sleeps: true, closet: true, garage: true,
    why: 'Deel 4 en de open wereld: weer thuis in Paddepoel, nu als stel (de kamerindeling is anders, de koelkastlijst hangt vol).', hint: 'Je flat in Paddepoel.' },
];

const registry = new Map();
const order = [];
function seed() {
  registry.clear();
  order.length = 0;
  for (const h of BASE) { registry.set(h.id, { ...h, registered: false }); order.push(h.id); }
}
seed();

export const homes = () => order.map((id) => registry.get(id));
export const homeOf = (id) => registry.get(id) || null;
export function resetHomes() { seed(); }

// Een andere werkstroom meldt een thuis (de Bezit-epic: een gekocht pand kan je woning worden). `ref` wijst naar het pand.
// Zo'n thuis komt nooit vanzelf uit het verhaal (geen fromStep): de speler zet het zelf als actief (pin).
export function registerHome({ id, name, kind = 'pand', ref = null, interior = 'flat-standaard', anchor = null, sleeps = true, closet = true, garage = false, why = '', hint = '' }) {
  if (!id || !name) throw new Error('registerHome: id en name nodig');
  const h = { id, name, kind, ref, interior, anchor, neighbours: [], sleeps, closet, garage, why, hint: hint || name, fromStep: null, until: null, registered: true };
  registry.set(id, h);
  if (!order.includes(id)) order.push(id);
  return h;
}

const idx = (id) => STEPS.findIndex((s) => s.id === id);

// Welk thuis hoort bij deze stap van het verhaal? (`stepId` null of onbekend: het eerste huis)
export function storyHome(stepId) {
  const k = stepId ? idx(stepId) : -1;
  if (k < 0) return DEFAULT_HOME;
  let found = DEFAULT_HOME;
  for (const h of BASE) {
    if (!h.fromStep) continue;
    const from = idx(h.fromStep);
    if (from >= 0 && k >= from) found = h.id;
  }
  return found;
}

// De thuisstand van een speler. Een lege of vreemde stand leest als het eerste huis (migratie, zie boven).
export function readHomeState(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const unlocked = Array.isArray(s.unlocked) ? s.unlocked.filter((id) => registry.has(id)) : [];
  if (!unlocked.includes(DEFAULT_HOME)) unlocked.unshift(DEFAULT_HOME);
  const active = registry.has(s.active) && unlocked.includes(s.active) ? s.active : DEFAULT_HOME;
  return { v: HOME_STATE_VERSION, active, unlocked, pinned: !!s.pinned && active !== null };
}

// Elk thuis dat het verhaal tot en met deze stap heeft laten zien, komt vrij (de poort schrijft alleen een verzameling, nooit minder).
export function unlockHomes(state, stepId) {
  const st = readHomeState(state);
  const k = stepId ? idx(stepId) : -1;
  const open = new Set(st.unlocked);
  for (const h of BASE) {
    const from = h.fromStep ? idx(h.fromStep) : -1;
    if (from >= 0 && k >= from) open.add(h.id);
  }
  return { ...st, unlocked: order.filter((id) => open.has(id) || st.unlocked.includes(id)) };
}

// Het actieve thuis van de speler: het vastgepinde (als het nog open is), anders de verhaalplek van deze stap.
export function activeHome(state, stepId) {
  const st = unlockHomes(state, stepId);
  if (st.pinned && st.unlocked.includes(st.active)) return registry.get(st.active);
  const story = storyHome(stepId);
  return registry.get(st.unlocked.includes(story) ? story : DEFAULT_HOME);
}

// De speler kiest zelf een thuis (alleen uit wat open is) of laat het verhaal weer kiezen (null).
export function pinHome(state, id, stepId) {
  const st = unlockHomes(state, stepId);
  if (id === null) return { ...st, pinned: false, active: storyHome(stepId) };
  if (!st.unlocked.includes(id)) return st;
  return { ...st, pinned: true, active: id };
}

// Het verhaal verhuist de speler mee als hij niet vastgepind heeft: geeft de stand na een nieuwe stap en of er verhuisd is.
export function moveWithStory(state, prevStepId, stepId) {
  const before = activeHome(state, prevStepId);
  const st = unlockHomes(state, stepId);
  const after = activeHome(st, stepId);
  return { state: { ...st, active: st.pinned ? st.active : after.id }, moved: after.id !== before.id, from: before.id, to: after.id };
}

// Controle voor de tests: de verhaalhuizen volgen elkaar zonder gat of overlap en elk verwijst naar een bestaande stap.
export function homeProblems() {
  const out = [];
  const story = BASE.filter((h) => h.fromStep);
  story.forEach((h, i) => {
    if (idx(h.fromStep) < 0) out.push(`${h.id}: onbekende stap ${h.fromStep}`);
    if (h.until && idx(h.until) < 0) out.push(`${h.id}: onbekende stap ${h.until}`);
    const next = story[i + 1];
    if (next && h.until !== next.fromStep) out.push(`${h.id}: eindigt bij ${h.until} maar ${next.id} begint bij ${next.fromStep}`);
    if (i > 0 && idx(h.fromStep) <= idx(story[i - 1].fromStep)) out.push(`${h.id}: staat niet in verhaalvolgorde`);
  });
  if (story.length < 4) out.push('minstens drie verhuizingen (vier verhaalhuizen) nodig');
  return out;
}
