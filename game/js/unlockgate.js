// De gedeelde ontgrendelpoort (#1131, WP8 van de verhaal-epic; één poort voor het verhaal, Bezit en de voetbalcarrière).
// Een wereld (loopbaan, bijbaan, boerderij, panden, voetbal) komt vrij doordat het verhaal er een personage en een
// verhaalmoment aan koppelt: akte 1 rijden en klussen, akte 2 boerderij (Tessa), akte 3 panden en ondernemen
// (de frietwagen als bedrijf), akte 4 voetbal en regio. Daarna blijft hij open.
//
// Zuiver: geen DOM, geen wereld, geen opslag. De aanroeper geeft de stand mee (`progress`); scripts/unlockgate_test.mjs
// loopt het in node. De migratieregel staat bovenaan elke functie: BESTAANDE saves houden alles wat al open was
// (een save zonder `gate`-veld leest als "alles open"), alleen een NIEUW spel begint dicht.
//
// Voor de andere epics (Bezit, voetbal): registreer je wereld met `registerGateWorld({ id, part, by, hint })` of gebruik
// de standaardingangen hieronder ('farm', 'bezit', 'voetbal'); vraag daarna `worldOpen(id, progress)`.
// `part` is de akte waarin het verhaal hem noemt: 'kop' (akte 1), 'romp' (2), 'staart' (3), 'zuid' (4), 'ontzet' (5).
// Geen harde muur: een gesloten wereld geeft `gateHint(id)` terug, een zin van het personage dat hem introduceert.
import { STEPS, PARTS } from './storyarc.js';

export const GATE_VERSION = 1;
export const PART_ORDER = ['kop', 'romp', 'staart', 'zuid', 'ontzet', 'nazomer'];
const partIdx = (p) => PART_ORDER.indexOf(p);
// Per verhaalstap (doorlopend model, bijbel 28-11): een wereld mag `atStep` (een stap-id) hebben; dan opent hij op die stap
// in plaats van aan het begin van zijn akte. Zonder `atStep` blijft de akte de maat (bestaande werelden veranderen niet).
const stepIdx = (id) => STEPS.findIndex((s) => s.id === id);

// Wat de loopbanen-data zegt (storyarc_nieuw.js `loopbanen`): de akte van de stap waar het vak voor het eerst opduikt.
// `by`: het personage dat het inleidt; `hint`: de zin voor de gedimde startplek.
const CAREER_BY = {
  klus: ['Sjabbe', 'Vraag het Sjabbe: die heeft altijd werk dat niemand wil.'],
  taxi: ['Tammo', 'Tammo rijdt het liefst zelf: eerst het museum, dan de taxi.'],
  kantoor: ['Sjabbe', 'Loop bij het Loket langs: daar kijkt een kantoor naar je.'],
  padel: ['Sjoerd', 'Sjoerd weet waar een baan vrij is.'],
  vracht: ['Oma Trijntje', 'Oma Trijntje heeft vet nodig: vrachtwerk komt vanzelf.'],
  bezorg: ['Oma Trijntje', 'Oma Trijntje stuurt je op bezorgrondes.'],
  buiten: ['Oma Trijntje', 'Frisse lucht: Oma Trijntje weet wel iets.'],
  trein: ['Tessa', 'Eerst de trein naar Warffum, dan staat het spoor open.'],
  horeca: ['Geesje', 'Geesje en haar eieren: dan begin je aan de keuken.'],
  landbouw: ['Tessa', 'Tessa is boerendochter: dit is haar wereld.'],
  bus: ['Kapitein Klaas', 'De streekbus naar Zoutkamp: Klaas wacht.'],
  hengelen: ['Kapitein Klaas', 'Kapitein Klaas weet waar de vis zit.'],
  water: ['Kapitein Klaas', 'Kapitein Klaas leent je een boot.'],
  lucht: ['Dokter Dijkstra', 'Dokter Dijkstra heeft een heli.'],
  handhaving: ['Lammert', 'Lammert van de haven zoekt handjes.'],
  kermis: ['Geert', 'Geert heeft drie tenten op de kermis.'],
  race: ['Tinus', 'Tinus heeft een schuur en een baan met modder.'],
  podium: ['Willemien', 'Willemien weet waar het feest is.'],
  golf: ['Berend', 'Berend en het Beleg: dat is een golfbaan, bijna.'],
};

// Werelden die niet uit een stap volgen: de epics van Bezit, boerderij en voetbal sluiten hier op aan.
const EXTRA = [
  { id: 'snackwagen', kind: 'wereld', part: 'ontzet', by: 'Tessa', hint: 'De snackwagen komt pas laat: eerst zoeken Tammo en Tessa hun plekje in de wereld.' },
  { id: 'farm', kind: 'wereld', part: 'romp', by: 'Tessa', hint: 'Tessa is boerendochter. Na Oma Trijntjes recept staat haar land voor je open.' },
  { id: 'bezit', kind: 'wereld', part: 'staart', by: 'Sjabbe', hint: 'Sjabbe van Pand & Poen: aan de Eems leer je panden beheren. Jelle koopt, wij bouwen.' },
  { id: 'voetbal', kind: 'wereld', part: 'zuid', by: 'Tammo', hint: 'In Veendam speelt Tessa met het dorpsteam. Daar begint de voetbalcarrière.' },
];

const registry = new Map();
function seed() {
  registry.clear();
  for (const s of STEPS) {
    for (const v of s.loopbanen || []) {
      if (registry.has(v)) continue;
      const [by, hint] = CAREER_BY[v] || ['', ''];
      registry.set(v, { id: v, kind: 'loopbaan', part: s.part, step: s.id, by, hint });
    }
  }
  for (const w of EXTRA) registry.set(w.id, { ...w, step: null });
}
seed();

// Een andere epic meldt zijn wereld. Een bekend id wordt bijgewerkt (zodat Bezit zijn eigen tekst kan zetten).
export function registerGateWorld({ id, part, by = '', hint = '', kind = 'wereld', atStep = null }) {
  if (!id || partIdx(part) < 0) throw new Error('registerGateWorld: id en een bekende akte nodig');
  if (atStep && stepIdx(atStep) < 0) throw new Error('registerGateWorld: onbekende stap ' + atStep);
  registry.set(id, { id, kind, part, by, hint, step: null, ...(atStep ? { atStep } : {}) });
  return registry.get(id);
}
export const gateWorlds = () => [...registry.values()];
export const gateWorld = (id) => registry.get(id) || null;
export function resetGateRegistry() { seed(); }

// De stand die de poort nodig heeft. `partNow`: de akte van de huidige stap (of null), `ended`: het verhaal is uit.
export function progressFrom({ stepId = null, ended = false, gate = undefined, begun = null, dev = false } = {}) {
  const st = stepId ? STEPS.find((s) => s.id === stepId) : null;
  return { partNow: st ? st.part : null, stepNow: st ? st.id : null, ended, gate, begun, dev };
}

const isNewGate = (g) => !!g && typeof g === 'object' && g.v === GATE_VERSION && Array.isArray(g.open) && g.legacy !== true;

// Is deze wereld open? Volgorde van de redenen (de eerste die klopt wint):
//  - dev (devJumpTo, spelbot, trailerscripts): altijd;
//  - een save zonder (nieuwe) poort, of een gemigreerde: alles wat al open was blijft open: ALLES (migratieregel);
//  - het verhaal is uit;
//  - de speler is er al aan begonnen (voortgang) of de poort kent hem al;
//  - het verhaal heeft de stap (`atStep`) of anders de akte bereikt.
export function worldOpen(id, progress = {}) {
  if (progress.dev) return true;
  const w = registry.get(id);
  if (!w) return true; // een onbekende wereld sluiten we nooit
  const g = progress.gate;
  if (!isNewGate(g)) return true;
  if (progress.ended) return true;
  if (g.open.includes(id)) return true;
  if (typeof progress.begun === 'function' && progress.begun(id)) return true;
  if (w.atStep) return !!progress.stepNow && stepIdx(progress.stepNow) >= stepIdx(w.atStep);
  return !!progress.partNow && partIdx(progress.partNow) >= partIdx(w.part);
}

// De zachte hint voor een gesloten wereld: null als hij open is.
export function gateHint(id, progress = {}) {
  const w = registry.get(id);
  if (!w || worldOpen(id, progress)) return null;
  return w.hint || (w.by ? `Vraag het ${w.by}.` : 'Dit komt later in het verhaal.');
}

export const openWorlds = (progress = {}) => gateWorlds().filter((w) => worldOpen(w.id, progress)).map((w) => w.id);

// De gate die een NIEUW spel meekrijgt (alles dicht, tot het verhaal het opent).
export const newGate = () => ({ v: GATE_VERSION, open: [] });

// Leg vast wat nu open is (de poort schrijft alleen een verzameling, nooit minder): aanroepen na elke stap.
export function stampGate(gate, progress = {}) {
  if (!isNewGate(gate)) return gate;
  const open = new Set(gate.open);
  for (const w of registry.values()) if (worldOpen(w.id, { ...progress, gate })) open.add(w.id);
  return { v: GATE_VERSION, open: [...open] };
}

// Migratie bij het laden: een save zonder gate krijgt er geen opgelegd en blijft "alles open" (legacy). Wel een
// stempel zodat tests en de spelbot het zien. Geeft altijd een nieuw object; raakt voortgang en geld nooit aan.
export function migrateGate(save) {
  const s = save && typeof save === 'object' ? save : {};
  if (isNewGate(s.gate)) return s;
  return { ...s, gate: { v: GATE_VERSION, legacy: true, open: gateWorlds().map((w) => w.id) } };
}

// Controle voor de tests: elke wereld wijst naar een bestaande akte.
export const gateProblems = () => gateWorlds().flatMap((w) => [
  ...(!PARTS[w.part] ? [`${w.id}: onbekende akte ${w.part}`] : []),
  ...(w.atStep && stepIdx(w.atStep) < 0 ? [`${w.id}: onbekende stap ${w.atStep}`] : []),
]);
