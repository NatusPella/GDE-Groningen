// Overlast bij de snackbar (#400): de regels van een korte bijbaan in de Herenstraat. Een groepje verzonnen jongeren ("de Dikke
// Banden") hangt met hun fatbikes bij de snackbar van de Kroketkoning, en de snackbarhouder vraagt jou ze weg te sturen. Je kiest
// per poging een van drie grappige acties (een gesprek, een bord, een geluid of iets met een dweil); elke actie heeft een kracht
// en wie van soort wisselt krijgt een bonus. Bij genoeg punten fietsen ze lachend weg; na drie pogingen gaan ze er vanzelf van
// door. Geld blokkeert nooit: een slechte keuze betaalt alleen minder, en Backspace laat de groep voor wat hij is.
// Puur (geen DOM, geen THREE) en alleen tekst: geen opname, geen nieuwe muziek. Alles is verzonnen en vriendelijk bedoeld:
// geen echte keten, geen echte groep, geen geweld. Tests: scripts/missie_snackbar_test.mjs.
import { makeRng } from './minigamekit.js';

export const SNACKBAR = { zaak: 'Kroketkoning Herenstraat', baas: 'Snackbarhouder Rinus', straat: 'Herenstraat', groep: 'de Dikke Banden' };
export const DOEL_PUNTEN = 4;      // zoveel punten sturen de groep weg
export const MAX_POGINGEN = 3;
export const BONUS_ANDERE_SOORT = 1;
export const BASIS = { snel: 78, gewoon: 60, mager: 44 };   // betaling bij weg in 2, weg in 3, vanzelf vertrokken

// kracht 0 (ze blijven en vinden het geweldig) tot 3 (ze vinden het te mooi en gaan). soort: praat, bord, geluid of actie.
export const ACTIES = [
  { id: 'vriendelijk', soort: 'praat', kracht: 1, label: 'Vraag vriendelijk of ze een straatje verderop willen hangen', note: 'Een gesprek, met een glimlach',
    reactie: 'Een straatje verder? Maar onze banden staan hier zo mooi in de zon.', slot: 'Oké, oké, we gaan al.' },
  { id: 'kroket', soort: 'praat', kracht: 1, label: 'Leg uit dat een kroket niet wegloopt, maar de klanten wel', note: 'Een gesprek, met logica',
    reactie: 'Dat is waar. Maar wij zijn ook klanten, toch?', slot: 'Een beetje logisch is het wel. Wij gaan.' },
  { id: 'wedstrijd', soort: 'actie', kracht: 2, label: 'Daag ze uit voor een wedstrijdje om de Grote Markt: wie het eerst terug is', note: 'Een rondje op de fatbike',
    reactie: 'Een wedstrijdje? Dat laten wij ons niet zeggen!', slot: 'Weg zijn ze, met zes banden in de lucht. Tot de Grote Markt.' },
  { id: 'bord', soort: 'bord', kracht: 2, label: 'Zet een bord neer: "Hier geen fatbikes parkeren, wel kroketten eten"', note: 'Een bord',
    reactie: 'Moet je dat lezen. Zo netjes geschreven.', slot: 'Netjes geschreven. Dan parkeren we netjes verderop.' },
  { id: 'quiz', soort: 'bord', kracht: 2, label: 'Hang een bord op: "Gratis bitterbal bij elke vraag over de Martinitoren"', note: 'Een bord met een quiz',
    reactie: 'Hoeveel treden heeft die toren eigenlijk?', slot: 'Te moeilijk. Wij gaan het opzoeken.' },
  { id: 'klassiek', soort: 'geluid', kracht: 3, label: 'Zet de klassieke zender hard aan: een sierlijke wals uit de speaker', note: 'Een geluid (alleen tekst, geen opname)',
    reactie: 'Is dit... mooi? Dit is veel te mooi voor ons.', slot: 'Zo mooi dat het pijn doet. Wij gaan, hoor.' },
  { id: 'dweil', soort: 'actie', kracht: 2, label: 'Begin met een dweil de stoep te boenen, precies rond hun fietsen', note: 'Een grappige actie',
    reactie: 'Hé, dat is nat! Mijn banden worden nat.', slot: 'Mijn sokken ook. Wij verhuizen.' },
  { id: 'toeter', soort: 'geluid', kracht: 0, label: 'Blaas drie keer op een toeter', note: 'Een geluid',
    reactie: 'Haha! Nog een keer, nog een keer!', slot: 'Nog een keer. En nog een. Wij blijven.' },
  { id: 'gratis', soort: 'praat', kracht: 0, label: 'Deel gratis kroketten uit aan iedereen', note: 'Een gesprek, met kroketten',
    reactie: 'Gratis? Dan blijven we nog wel een uurtje.', slot: 'Nog een? Dan blijven we nog wel een uurtje.' },
];
const BY_ID = new Map(ACTIES.map((a) => [a.id, a]));
export const actieById = (id) => BY_ID.get(id) || null;

const rngOf = (r) => (typeof r === 'function' ? r : makeRng(r || 1));
const pickOf = (list, rng) => list[Math.floor(rng() * list.length)];

// Drie verschillende acties die je nog niet hebt gebruikt, waaronder altijd een sterke (kracht 2 of meer) en een zwakke (0 of 1).
export function kiesActies(gebruikt = [], rng = Math.random) {
  const r = rngOf(rng);
  const vrij = ACTIES.filter((a) => !gebruikt.includes(a.id));
  const sterk = vrij.filter((a) => a.kracht >= 2), zwak = vrij.filter((a) => a.kracht <= 1);
  const uit = [];
  if (sterk.length) uit.push(pickOf(sterk, r));
  if (zwak.length) uit.push(pickOf(zwak, r));
  const rest = vrij.filter((a) => !uit.includes(a));
  while (uit.length < 3 && rest.length) uit.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
  // een vaste schudbeurt, zodat de sterke niet altijd bovenaan staat
  for (let i = uit.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [uit[i], uit[j]] = [uit[j], uit[i]]; }
  return uit;
}

export function maakRonde(rng = Math.random) {
  return { gebruikt: [], laatste: null, score: 0, poging: 0, klaar: false, uitkomst: null, acties: kiesActies([], rng), rng };
}

// Een actie kiezen (index in ronde.acties). Geeft { actie, kracht, bonus, punten, score, klaar, uitkomst, tekst }; bij 'klaar' zijn de
// jongeren weg (uitkomst 'weg') of vanzelf vertrokken ('opgegeven'); anders staan er nieuwe acties klaar in ronde.acties.
export function kies(ronde, index) {
  const actie = ronde.acties[index];
  if (!actie || ronde.klaar) return null;
  const bonus = ronde.laatste && ronde.laatste !== actie.soort && actie.kracht > 0 ? BONUS_ANDERE_SOORT : 0;
  const punten = actie.kracht + bonus;
  ronde.score += punten;
  ronde.poging += 1;
  ronde.gebruikt.push(actie.id);
  ronde.laatste = actie.soort;
  let tekst = actie.reactie;
  if (ronde.score >= DOEL_PUNTEN) { ronde.klaar = true; ronde.uitkomst = 'weg'; tekst = actie.slot; }
  else if (ronde.poging >= MAX_POGINGEN) { ronde.klaar = true; ronde.uitkomst = 'opgegeven'; tekst = 'Het wordt ze te koud en te laat. Ze fietsen zelf maar weg, met de kroketten van een ander.'; }
  else ronde.acties = kiesActies(ronde.gebruikt, ronde.rng);
  return { actie, kracht: actie.kracht, bonus, punten, score: ronde.score, klaar: ronde.klaar, uitkomst: ronde.uitkomst, tekst };
}

// De uitbetaling en de slottekst van een afgeronde ronde (money blokkeert nooit).
export function rondeResultaat(ronde) {
  if (ronde.uitkomst === 'weg') {
    const snel = ronde.poging <= 2;
    return { base: snel ? BASIS.snel : BASIS.gewoon, tip: snel ? 8 : 0, flawless: snel, text: snel ? 'De snackbar is weer van de klanten!' : 'Ze zijn weg. Het kostte wat moeite.' };
  }
  return { base: BASIS.mager, tip: 0, flawless: false, text: 'Ze zijn vanzelf weggegaan, maar de snackbarhouder dankt je toch.' };
}

// De voortgangsbalk van de groep: 0 (blijft hangen) tot 1 (op het punt te vertrekken).
export const voortgang = (ronde) => Math.max(0, Math.min(1, ronde.score / DOEL_PUNTEN));
