// Snackwagen-mijlpalen (#1136, WP13): de snackwagen (de snackwagen) is een verhaaltwist die pas rond M22 een wagen wordt
// (kern 21-11: eerst zoeken Tammo en Tessa een plek in de wereld); daarna is hij thuisbasis en bedrijf en groeit hij mee met het verhaal. De
// verhaalstappen leveren alleen mijlpalen als stille vlaggen (`wagen:*`); de bedrijfsmechaniek (upgrades, menu, omzet,
// locaties, personeel) hoort bij de Bezit-epic en leest alleen deze vlaggen. Afspraak met Bezit en voetbal (verbindingspunten,
// docs/VERHAAL-ANALYSE-21-11.md 20.5): vlaggen alleen toevoegen, nooit hernoemen of weghalen.
//
// Zuiver: geen DOM, geen wereld. story.js zet de vlaggen bij het afronden van een stap en bij het laden van een save
// (een oude save krijgt de vlaggen van wat hij al deed). Dit is geen voortgang: er hangt niets aan vast behalve wat
// Bezit eraan koppelt.
import { STEPS } from './storyarc.js';

// stap = de stap waarna de mijlpaal geldt; `akte` hoort bij de ruggengraat (docs/verhaal/RUGGENGRAAT.md)
export const VAN_MILESTONES = [
  { flag: 'wagen:idee', step: 'M00', akte: 'kop', text: 'Tessa tekent een wagen op een bierviltje. Nog geen plan, nog geen naam: een idee dat ze zelf niet durft te geloven.' },
  { flag: 'wagen:menu', step: 'M08', akte: 'romp', text: "Oma Trijntjes recept van 1953: vet, eieren, zout, meel en mosterd zijn het eerste menu." },
  { flag: 'wagen:stek', step: 'M13', akte: 'staart', text: "Lammerts kade en de kermis: de eerste plekken waar een wagen zou kunnen staan." },
  { flag: 'wagen:team', step: 'M20', akte: 'zuid', text: 'Berend, Tinus en Wubbo helpen: er is een team voor wat ze samen gaan doen.' },
  { flag: 'wagen:naam', step: 'M22', akte: 'ontzet', text: 'Het luik zit erin: de Escapade is een snackwagen en heet Tam & Tes (de ontdekking na het herstel).' },
  { flag: 'wagen:standplaats', step: 'M26', akte: 'ontzet', text: 'Een luik en een standplaats op de Vismarkt.' },
  { flag: 'wagen:keten', step: 'M30', akte: 'nazomer', text: 'De wagen groeit: een tweede wagen, een pand en de boerderij als leverancier zijn mogelijk (de endgame).' },
];
export const VAN_FLAGS = VAN_MILESTONES.map((m) => m.flag);

// De boer (#1373, hoeve Zeldenrust): hetzelfde patroon naast de snackwagen, alleen toevoegen. boer:bezoek geldt zodra het bezoek aan de hoeve (N5) af is;
// boer:schenking zet boerstoryrun.js zelf zodra de akte is voorgelezen en de hoeve bijgeschreven is (geen stap, dus niet hier).
export const BOER_MILESTONES = [
  { flag: 'boer:bezoek', step: 'N5', akte: 'romp', text: 'Het bezoek aan hoeve Zeldenrust: Oom Hindrik gaat naar Huize Waddenzicht en Tante Aaltje regelt de rest bij de notaris.' },
];
export const BOER_FLAGS = BOER_MILESTONES.map((m) => m.flag);
const ALLE_MILESTONES = [...VAN_MILESTONES, ...BOER_MILESTONES];

const idx = (id) => STEPS.findIndex((s) => s.id === id);

// De vlaggen die bij het afronden van één stap horen.
export const milestoneFlagsFor = (stepId) => ALLE_MILESTONES.filter((m) => m.step === stepId).map((m) => m.flag);

// Alle vlaggen die horen bij wat al af is (`done`: Set of lijst met stap-id's). Een mijlpaal geldt ook als een latere
// stap af is (een save die een stap oversloeg of vooruit sprong, devJumpTo).
export function milestoneFlagsForDone(done) {
  const have = done instanceof Set ? done : new Set(done || []);
  const last = Math.max(-1, ...[...have].map(idx));
  return ALLE_MILESTONES.filter((m) => have.has(m.step) || idx(m.step) < last).map((m) => m.flag);
}

// Hoe ver is de wagen? 0 (niets) tot en met het aantal mijlpalen; Bezit leest dit voor zijn tijdlijn.
export const vanStage = (flags) => VAN_FLAGS.filter((f) => (flags && (flags.has ? flags.has(f) : flags.includes(f)))).length;
