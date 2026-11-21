// Terugkeerscène (#986 #987), het afspelen: na het laden van een opgeslagen spel (Doorgaan) wacht dit op een rustig
// moment en speelt dan één korte flat-vignet van Tammo en Tessa (terugkeerscenes.js), gekozen bij de stand van
// hun relatie (terugkeer.js). De regels staan in terugkeer.js en worden door scripts/terugkeer_test.mjs gelopen.
//
// Wat dit nooit doet: de speler verplaatsen, de klok of de telefoon aanraken, of iets in de save schrijven. De scène
// hangt in een gesloten kamer hoog boven de straat (net als de keuken van de opening) en het spel staat stil
// (playScript pauzeert); daarna gaat het spel verder waar het stond.
//
// Samen spelen: de scène is van wie het spel opende. Een gast speelt hem niet zelf (hij kijkt mee als de gastheer er
// een speelt, via coopcut.js) en een lopende sessie slaat hem over; een spel laden kan dan niet eens (savegame.js).
import { playScript } from './cutscenehost.js';
import { getSettings } from './settings.js';
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { narrativeBusy } from './narrative.js';
import { storyDataReady } from './storytext.js';
import { currentStep } from './storyquery.js';
import { hoofdspeler } from './players.js';
import { isMissionActive } from './missions.js';
import { terugkeerFase, kiesVignet, leesLaatste, schrijfLaatste, terugkeerBlockers, terugkeerBeslis } from './terugkeer.js';
import { vignettenVoor, bouwTerugkeerScene } from './terugkeerscenes.js';

// De kamer hangt even hoog boven de straat als de keuken van de opening (story.js KITCHEN_Z).
const KAMER_Z = 345;

let gezien = 0;        // het laatste world.loadCount waarvoor we al een poging deden
let poging = null;     // { wachtS, rustigS } zolang we op een rustig moment wachten
let doodSindsS = 1e9;  // seconden sinds de laatste dood of het terugzetten
let spelend = false;

function opslag() { try { return window.localStorage; } catch (e) { return null; } }

function momentopname(w, menuOpen) {
  const p = hoofdspeler(w);
  const st = currentStep();
  return {
    uit: getSettings().terugkeerScene === false,
    started: document.body.classList.contains('game-started'),
    loading: !!document.getElementById('load-screen'),
    loaded: !!w.loadedFromSave,
    client: w.coopRole === 'client',
    session: !!(w.coopNet && !w.coopSolo),
    openingDue: !!st && !st.end && !!st.goal && st.goal.type === 'opening',
    missionActive: isMissionActive(),
    cinematicActive: isCinematicActive(),
    sinceCinematicS: sinceCinematic(),
    narrativeBusy: narrativeBusy(),
    pigeon: !!w.pigeonMode,
    activiteit: !!w.activityGame,
    respawn: !!w.pendingRespawn,
    inVehicle: !!(p && p.inVehicle),
    wanted: w.wanted || 0,
    sinceDeathS: doodSindsS,
    menuOpen: !!(w.uiPaused || w.devPanelOpen || (menuOpen && menuOpen())),
    dataReady: storyDataReady(),
  };
}

// `menuOpen`: main.js geeft mee of een menu, de kaart, de telefoon of een winkel open staat.
export function updateTerugkeer(dt, w, menuOpen) {
  if (!w || spelend) return;
  if (w.health <= 0 || w.pendingRespawn) doodSindsS = 0; else doodSindsS += dt;
  const lc = w.loadCount || 0;
  if (lc > gezien) { gezien = lc; poging = { wachtS: 0, rustigS: 0 }; }
  if (!poging) return;
  if (!document.body.classList.contains('game-started')) return;
  poging.wachtS += dt;
  const blockers = terugkeerBlockers(momentopname(w, menuOpen));
  poging.rustigS = blockers.length ? 0 : poging.rustigS + dt;
  const besluit = terugkeerBeslis({ blockers, wachtS: poging.wachtS, rustigS: poging.rustigS });
  if (besluit === 'wacht') return;
  poging = null;
  if (besluit === 'speel') speel(w);
}

function speel(w) {
  const step = currentStep();
  const fase = terugkeerFase(step && step.id, { end: !!(step && step.end) });
  const opsl = opslag();
  const v = kiesVignet(vignettenVoor(fase), leesLaatste(opsl));
  if (!v) return false;
  const { def, lines, duration } = bouwTerugkeerScene(v);
  const p = hoofdspeler(w);
  const ok = playScript(w, def, {
    lines, duration,
    anchor: { x: p.x, y: p.y, facing: 0, z: KAMER_Z },
    cine: {
      id: 'terugkeer', priority: 2, pause: true, letterbox: true, skippable: true, hideHud: true,
      onStart: () => { spelend = true; },
      onEnd: () => { spelend = false; },
    },
  });
  if (ok) schrijfLaatste(opsl, v.id);
  else spelend = false;
  return ok;
}

// Voor de testbank: dwing een vignet af (of een fase) zonder te wachten. Niet in het spel zelf gebruikt.
export function terugkeerTest(w, id) {
  const v = id ? vignettenVoor(1).concat(vignettenVoor(2), vignettenVoor(3), vignettenVoor(4)).find((x) => x.id === id) : null;
  if (!v) return false;
  const { def, lines, duration } = bouwTerugkeerScene(v);
  const p = hoofdspeler(w);
  return playScript(w, def, { lines, duration, anchor: { x: p.x, y: p.y, facing: 0, z: KAMER_Z }, cine: { id: 'terugkeer', priority: 2, pause: true, letterbox: true, skippable: true, hideHud: true } });
}
