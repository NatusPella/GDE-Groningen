// De dunne adapter tussen het verhaal en de snackwagen (Snackimperium, epic #1095, #1102; verhaalvlaggen uit storymilestones.js, #1136).
// Het verhaal zet stille vlaggen `wagen:*` (idee, menu, stek, team, naam, standplaats, keten); de snackwagen leest ze hier en opent in fasen:
//   menu        -> je menu samenstellen            (wagen:menu, Oma Trijntjes recept)
//   stek        -> vergunningen op standplaatsen   (wagen:stek, Lammerts kade en de kermis)
//   team        -> medewerkers-wagens              (wagen:team, Berend, Tinus en Wubbo)
//   naam        -> de wagenbelettering 'TAM & TES' (wagen:naam)
//   standplaats -> je wagen zelf op een plek zetten (wagen:standplaats, de Vismarkt)
//   keten       -> een tweede medewerkers-wagen en het opnemen tegen Us Mem (overnemen) (wagen:keten)
// Geen import van story.js (die is van de verhaal-epic): main.js geeft de stand mee via setSnackFlagProvider(() => ({ flags, gate, ended, dev })).
// Migratieregel: zonder provider, zonder stand of bij een oude save (een gate-veld dat ontbreekt of 'legacy' is) staat alles open; een fase die dicht is,
// geeft een hint van een personage en nooit een leeg scherm. Puur: geen DOM, geen wereld, geen opslag (scripts/snackstory_test.mjs).

export const STAGE_FLAGS = { menu: 'wagen:menu', stek: 'wagen:stek', team: 'wagen:team', naam: 'wagen:naam', standplaats: 'wagen:standplaats', keten: 'wagen:keten' };
export const STAGES = Object.keys(STAGE_FLAGS);
export const STAGE_HINTS = {
  menu: 'Oma Trijntje heeft je recept nog niet doorgegeven: eerst haar vet, eieren en mosterd, dan kies je zelf wat er op het menu komt.',
  stek: 'Lammert wijst je nog geen kade aan: eerst de kermis en de haven, dan kun je vergunningen voor standplaatsen kopen.',
  team: 'Je team is er nog niet: eerst Berend, Tinus en Wubbo erbij, dan kun je medewerkers-wagens neerzetten.',
  naam: 'Je wagen heeft nog geen eigen naam: dat gebeurt zodra het luik erin zit.',
  standplaats: 'Tessa zoekt nog een goede plek: eerst de Vismarkt, dan zet je de wagen zelf op een standplaats.',
  keten: 'Een tweede wagen en de strijd met Us Mem Snacks komen aan het eind van de zomer, als de wagen echt groeit.',
};
export const PLAIN_SIGN = 'SNACKWAGEN';                // de belettering voor wagen:naam

let provider = null;
// main.js levert de echte story-stand: () => ({ flags: Set of lijst, gate, ended, dev }) of een Set. Zonder functie staat alles open.
export function setSnackFlagProvider(fn) { provider = typeof fn === 'function' ? fn : null; }

const isNewGate = (g) => !!g && typeof g === 'object' && g.v === 1 && Array.isArray(g.open) && g.legacy !== true;
const has = (flags, f) => !!flags && (flags.has ? flags.has(f) : Array.isArray(flags) && flags.includes(f));

// De vlaggen uit een stand: null = alles open (oude save, dev, verhaal uit, geen stand), anders een Set met de vlaggen die gelden.
export function flagsFrom(progress) {
  if (progress == null) return null;
  if (progress instanceof Set || Array.isArray(progress)) return new Set(progress);
  if (typeof progress !== 'object') return null;
  if (progress.dev || progress.ended) return null;
  if ('gate' in progress && !isNewGate(progress.gate)) return null;      // een save zonder (nieuwe) poort: migratieregel
  return new Set(Array.isArray(progress.flags) ? progress.flags : progress.flags && progress.flags.forEach ? [...progress.flags] : []);
}
const current = () => { try { return flagsFrom(provider ? provider() : null); } catch (e) { return null; } };

// Staat deze fase open?
export function stageOpen(stage) {
  const f = STAGE_FLAGS[stage];
  if (!f) return true;
  const flags = current();
  return flags === null || has(flags, f);
}
// De hint voor een dichte fase, anders null.
export const stageHint = (stage) => (stageOpen(stage) ? null : STAGE_HINTS[stage] || 'Dat komt later in het verhaal.');
// Alle fasen in één keer, voor het menu: { menu: { open, hint }, ... }.
export function stageView() { const o = {}; for (const s of STAGES) o[s] = { open: stageOpen(s), hint: stageHint(s) }; return o; }
// Hoe ver is het verhaal met de wagen: aantal open fasen (0 tot 6).
export const stageCount = () => STAGES.filter(stageOpen).length;
// De belettering op je eigen wagen: eerst een gewone, na wagen:naam de eigen naam (custom is de gekozen naam, standaard 'TAM & TES').
export const ownSignFor = (custom = 'TAM & TES') => (stageOpen('naam') ? custom : PLAIN_SIGN);
