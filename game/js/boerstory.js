// Het verhaal rond de boer (#1373, audit B2 en B4): het bezoek aan hoeve Zeldenrust (N5, Oom Hindrik en Tante Aaltje) en daarna de akte bij de notaris (N5.2),
// waarna de hoeve van de speler is. Dit is het zuivere deel: wanneer is de schenking aan de beurt en wat houdt haar tegen. Geen DOM, geen wereld, geen THREE
// (scripts/boerstory_test.mjs); het afspelen en het bijschrijven staan in boerstoryrun.js.
//
// Vlaggen (alleen toevoegen, nooit hernoemen; naar het voorbeeld van snackstory.js): boer:bezoek zet het verhaal zelf zodra N5 af is (storymilestones.js BOER_MILESTONES),
// boer:schenking zet boerstoryrun.js nadat de hoeve is bijgeschreven. Een oude save die al voorbij N5 is, krijgt de akte op het eerstvolgende rustige moment.
//
// Samen spelen: de schenking is per speler en lokaal (de boerderij is per speler, #429). Wie het verhaal speelt, krijgt de hoeve; de scène speelt niet tijdens een sessie
// en niet voor een meespeler: dan schrijft boerstoryrun.js de hoeve stil bij en meldt het in een regel. Een gast zonder schenking boert gewoon op De Zonnehoek. De hoeve is
// voor een gast niet zichtbaar in de wereld van de host. Wegvallen: niets te herstellen (de vlag staat pas na het bijschrijven). Later aansluiten: de eigen volgende rustige moment.
import { bridgeBlockers } from './storybridge.js';

export const BEZOEK_FLAG = 'boer:bezoek';
export const SCHENKING_FLAG = 'boer:schenking';
export const BEZOEK_STEP = 'N5';             // het bezoek aan de hoeve; de schenking komt erna
export const SCHENKING_SCENE = 'N5.2';       // de akte bij de notaris in script.json (docs/verhaal/nieuw/09-script-akte2.md)

// 'nog-niet' (het bezoek is nog niet af), 'klaar' (de vlag staat), 'markeer' (de hoeve is er al: alleen de vlag zetten, geen scène) of 'scene' (de akte is aan de beurt).
export function schenkingStand({ done, flags, hoeve = false }) {
  const d = done instanceof Set ? done : new Set(done || []);
  const f = flags instanceof Set ? flags : new Set(flags || []);
  if (f.has(SCHENKING_FLAG)) return 'klaar';
  // boer:bezoek telt ook: een save die voorbij N5 is (stap overgeslagen of van voor N5) krijgt de milestonevlag mee van storymilestones.milestoneFlagsForDone
  if (!d.has(BEZOEK_STEP) && !f.has(BEZOEK_FLAG)) return 'nog-niet';
  return hoeve ? 'markeer' : 'scene';
}

// Wat houdt de akte tegen: de lijst van de overgangsscènes, behalve "meespeler" en "Samen spelen" (daar schrijft de run de hoeve stil bij).
// Geeft { blockers, sessie }: sessie is waar als alleen of ook een sessie of meespeler in de weg zit.
export function schenkingBlockers(s) {
  const sessie = !!(s.client || s.session);
  return { blockers: bridgeBlockers({ ...s, client: false, session: false }), sessie };
}

// Wat nu: 'niets' (nog niet aan de beurt of al klaar), 'markeer' (alleen de vlag), 'wacht' (er is iets in de weg of het is nog niet rustig genoeg), 'stil' (hoeve bijschrijven zonder scène:
// sessie, meespeler of geen scènedata) of 'speel' (de akte spelen). `calmS`: hoe lang het al rustig is; `kan`: of de scène te spelen is (data geladen, regels aanwezig).
export function schenkingBesluit({ stand, blockers = [], sessie = false, calmS = 0, calmNodig = 2.5, mag = true, kan = true }) {
  if (stand === 'nog-niet' || stand === 'klaar') return 'niets';
  if (stand === 'markeer') return 'markeer';
  if (blockers.length || calmS < calmNodig || !mag) return 'wacht';
  return sessie || !kan ? 'stil' : 'speel';
}

export const SCHENKING_REGEL = 'Hoeve Zeldenrust is van jullie. Je vindt hem in het pauzemenu onder Boerderij.';
export const SCHENKING_REGEL_STIL = 'Tante Aaltje liet weten dat hoeve Zeldenrust van jullie is. Je vindt hem in het pauzemenu onder Boerderij.';
