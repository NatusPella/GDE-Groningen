// Voortgang van de game (#898): het rekenwerk. Puur, zonder DOM of three, zodat
// scripts/progress_test.mjs het in gewone node kan natrekken. De bronnen (het verhaal, de
// prestaties, de kaart en de gebieden) worden in progresslive.js bij elkaar gezocht; hier
// staat alleen hoe je van tellingen één percentage maakt.
//
// Geen nieuwe teller en geen nieuwe opslagsleutel: dit is een optelsom van wat het spel al
// bijhoudt, en dezelfde vraag wordt op vier plekken gesteld (de HUD, het Overzicht, het
// savegame-overzicht en het hervatten).
import { STEPS, stepAvailable, stepDone } from './storyarc.js';

// De vier onderdelen met hun gewicht. Het verhaal weegt het zwaarst (het is de game), de
// prestaties en de kaart zijn de brede lagen eromheen, de gebieden de fijnste. Samen 100.
export const PROGRESS_PARTS = [
  ['verhaal', 'Verhaal', 40],
  ['prestaties', 'Prestaties', 25],
  ['kaart', 'Kaart verkend', 20],
  ['gebieden', 'Gebieden', 15],
];

// Puur: de tellingen naar één percentage. Ontbreekt een onderdeel (0 of geen totaal), dan
// verdelen de andere hun gewicht, zodat een vroege save geen kunstmatig laag cijfer geeft.
// Geeft het percentage en de onderdelen met hun eigen percentage erbij.
export function combineProgress(counts = {}) {
  const parts = [];
  let gewogen = 0, gewicht = 0;
  for (const [id, label, w] of PROGRESS_PARTS) {
    const c = counts[id];
    const total = Number(c && c.total) || 0;
    if (!(total > 0)) continue;
    const done = Math.max(0, Math.min(Number(c && c.done) || 0, total));
    const pct = Math.round((done / total) * 100);
    parts.push({ id, label, weight: w, done, total, pct });
    gewogen += pct * w;
    gewicht += w;
  }
  const pct = gewicht ? Math.round(gewogen / gewicht) : 0;
  return { pct: Math.max(0, Math.min(100, pct)), parts };
}

// De stand van het verhaal uit de gegevens van een save: dezelfde regel die story.js gebruikt
// (een gemiste stap telt mee zodra een latere missie is gehaald), maar zonder de wereld nodig
// te hebben. Voor het savegame-overzicht en voor een save die nog niet geladen is.
export function storyCounts(data) {
  const done = new Set(data && data.story && Array.isArray(data.story.done) ? data.story.done : []);
  const passed = new Set(data && data.missions && Array.isArray(data.missions.completed) ? data.missions.completed : []);
  const isDone = (id) => done.has(id);
  const isPassed = (i) => passed.has(i);
  let total = 0, klaar = 0;
  for (let k = 0; k < STEPS.length; k++) {
    if (!stepAvailable(STEPS[k])) continue;
    total++;
    if (stepDone(k, isDone, isPassed)) klaar++;
  }
  return { done: klaar, total };
}

// De stand van één opgeslagen spel, uit zijn eigen gegevens. Prestaties en de kaart horen bij
// dit apparaat en niet bij die save, dus dit is het verhaal van dat spel: het enige cijfer dat
// per save eerlijk te geven is.
export function saveProgress(data) {
  const c = storyCounts(data);
  return c.total ? Math.round((c.done / c.total) * 100) : 0;
}

// De regel die overal hetzelfde klinkt: "42% klaar".
export const progressText = (pct) => `${pct}% klaar`;
