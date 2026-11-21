// Meldingen: duur en aflopend balkje (opdracht van de eigenaar 21-11). Puur, geen DOM: scripts/meldingtijd_test.mjs controleert het.
// Eén regel voor alle tijdelijke meldingen (HUD-kaarten, prestatietoast, telefoonmelding, naamkaart, menumelding): ze blijven
// ongeveer even lang in beeld, de speler ziet aan een balkje wanneer ze weggaan, en de tijd loopt niet terwijl het spel of de
// melding stilstaat. De DOM-kant staat in melding.js, de opmaak in ds-melding.css, de regel in DESIGN_SYSTEM.md
// ("Meldingen: duur en aflopend balkje").
import { cardSeconds } from './cardtime.js';

// De drie gedeelde duurklassen (seconden). Een melding kiest een klas, of krijgt er een uit de lengte van zijn tekst.
export const DURATION_CLASSES = Object.freeze({ kort: 4, normaal: 6, lang: 9 });
export const NOTICE_MIN_S = DURATION_CLASSES.kort;
export const NOTICE_MAX_S = 10;          // ook een heel lange tekst blijft hier onder; langer lezen kan in het tekstlog
export const CHARS_PER_S = 15;           // leestempo
export const READ_BASE_S = 2;            // tijd om de melding op te merken, bovenop het lezen

// Leestijd van een tekst: 2 s + tekens / 15, tussen 4 en 10 s.
export function readingTime(tekst) {
  const n = String(tekst == null ? '' : tekst).length;
  return Math.min(NOTICE_MAX_S, Math.max(NOTICE_MIN_S, READ_BASE_S + n / CHARS_PER_S));
}

// De kleinste klas die de seconden dekt; daarboven het maximum. Zo hebben alle meldingen een van vier duren.
export function toClass(secs) {
  const s = Number.isFinite(secs) ? secs : 0;
  if (s <= DURATION_CLASSES.kort) return DURATION_CLASSES.kort;
  if (s <= DURATION_CLASSES.normaal) return DURATION_CLASSES.normaal;
  if (s <= DURATION_CLASSES.lang) return DURATION_CLASSES.lang;
  return NOTICE_MAX_S;
}

// De klasnaam bij een duur (voor de docs en de test): 'kort' | 'normaal' | 'lang' | 'max'
export function classLabel(secs) {
  const d = toClass(secs);
  return Object.keys(DURATION_CLASSES).find((k) => DURATION_CLASSES[k] === d) || 'max';
}

// De duur van een melding. klas ('kort' | 'normaal' | 'lang') zet een floorS; de tekst kan hem verlengen, nooit verkorten
// (een zin wordt nooit afgekapt voor hij te lezen is). Zonder klas telt alleen de tekst. De uitkomst is altijd een klasduur.
export function noticeDuration({ tekst = '', klas = null, duur = 0 } = {}) {
  const floorS = (klas && DURATION_CLASSES[klas]) || 0;
  const hint = Number.isFinite(duur) && duur > 0 ? Math.min(duur, NOTICE_MAX_S) : 0;
  return toClass(Math.max(floorS, hint, readingTime(tekst)));
}

// De duur van een HUD-kaart (hudcards.js): cardSeconds (cardtime.js, de oude formule met de leesstand) op een klasduur gezet.
// 'ruim' (Instellingen > Hints & uitleg) rekt de klas op; 'geen' verandert de duur niet (dat gedrag zit in stickyCard).
export function cardDuration({ textSeconds = 0, duration = 0, mode = 'normaal' } = {}) {
  const basis = toClass(cardSeconds({ textSeconds, duration, mode: 'normaal' }));
  return mode === 'ruim' ? Math.min(NOTICE_MAX_S * 1.8, basis * 1.7) : basis;
}

// Staat de timer stil? De HUD is verborgen of bevroren (pauze, menu, film, verhaalgesprek), of de speler houdt de muis boven de melding.
export function timerHeld({ pauze = false, menu = false, film = false, hover = false } = {}) {
  return !!(pauze || menu || film || hover);
}

// De timer van één melding: tik(dt, staat) telt af tenzij hij stilstaat; voortgang gaat van 1 (vol) naar 0 (weg).
// Kritiek (duur Infinity, of kritiek: true): loopt niet, heeft geen balk en blijft tot sluit() (knop of toets).
export function makeTimer(duur, { kritiek = false } = {}) {
  const kr = !!kritiek || duur === Infinity;
  let rest = kr ? Infinity : Math.max(0, Number.isFinite(duur) ? duur : NOTICE_MIN_S);
  const totaal = rest;
  let closed = false;
  return {
    kritiek: kr,
    totaal,
    get rest() { return rest; },
    get voortgang() { return kr ? 1 : totaal > 0 ? Math.max(0, Math.min(1, rest / totaal)) : 0; },
    get klaar() { return closed || (!kr && rest <= 0); },
    // geeft true zolang de timer echt telde
    tik(dt, staat = {}) {
      if (kr || closed || !(dt > 0) || timerHeld(staat)) return false;
      rest = Math.max(0, rest - dt);
      return true;
    },
    sluit() { closed = true; },
    // een nieuwe melding met dezelfde sleutel ververst de tijd in plaats van te stapelen
    ververs(nieuw) { if (!kr) rest = Math.max(0, nieuw); },
  };
}

// Prioriteit: kritiek eerst, dan hogere prio, dan de oudste. a, b: { kritiek?, prio?, at? }
export function precedence(a, b) {
  if (!!a.kritiek !== !!b.kritiek) return a.kritiek ? -1 : 1;
  if ((a.prio || 0) !== (b.prio || 0)) return (b.prio || 0) - (a.prio || 0);
  return (a.at || 0) - (b.at || 0);
}

// De wachtrij: hooguit `max` zichtbaar (standaard 1: één kaart tegelijk, zie hudcards.js), de rest wacht in volgorde van precedence.
// Wat wacht krijgt een korte duur (kort 4 s) zodra er twee of meer wachten, zodat een rij niet minuten duurt; een lopende melding
// wordt pas ingekort nadat hij minstens `leesMin` seconden stond. Geeft { toon, wacht } (ids, in volgorde); wijzigt niets.
export function queuePlan({ zichtbaar = [], wachtend = [], max = 1 } = {}) {
  const open = Math.max(0, max - zichtbaar.filter((m) => !m.weg).length);
  const gesorteerd = [...wachtend].sort(precedence);
  const toon = gesorteerd.slice(0, open);
  const wacht = gesorteerd.slice(open);
  return { toon: toon.map((m) => m.id), wacht: wacht.map((m) => m.id) };
}

// De duur van een melding die uit een rij komt: bij twee of meer wachtenden altijd kort (kritiek blijft zoals hij is).
export function queueDuration(duur, wachtend, { kritiek = false } = {}) {
  if (kritiek || duur === Infinity) return duur;
  return wachtend >= 2 ? Math.min(duur, DURATION_CLASSES.kort) : duur;
}

// Hoeveel seconden een lopende melding nog mag staan als er een andere wacht: nooit korter dan een seconde na de minimale readingTime.
export const READ_MIN_S = 3;
export function shortening(rest, verstreken, wachtend) {
  if (!wachtend || !(verstreken > READ_MIN_S) || !(rest > 1)) return rest;
  return Math.min(rest, 1);
}

// Het register van alle meldingstypen (de inventaris in docs/MELDINGEN-21-11.md; de ratel in scripts/ds3_dekking_test.mjs).
// balk: de melding heeft het aflopende balkje (via melding.js of de eigen DOM met de klasse ds-melding__tijd). Een type zonder balk
// heeft een reden: kritiek (sluit met knop of toets), een eigen readingTime (ondertitel), een filmmoment, of geen tijd (status).
export const NOTICE_TYPES = Object.freeze([
  { id: 'kaart', bestand: 'hudcards.js', balk: true, klas: 'tekst', zone: 'A', pauze: 'ja' },
  { id: 'prestatie', bestand: 'achievements.js', balk: true, klas: 'tekst', zone: 'E', pauze: 'ja' },
  { id: 'telefoonmelding', bestand: 'phonefeed.js', balk: true, klas: 'tekst', zone: 'A', pauze: 'ja' },
  { id: 'naamkaart', bestand: 'namecard.js', balk: true, klas: 'kort', zone: '-', pauze: 'ja' },
  { id: 'menumelding', bestand: 'menumelding.js', balk: true, klas: 'kort', zone: 'menu', pauze: 'nvt' },
  { id: 'fout', bestand: 'fouttoast.js', balk: false, reden: 'kritiek: blijft staan tot de speler Sluiten kiest' },
  { id: 'groot-moment', bestand: 'bigmoment.js', balk: false, reden: 'eigen regie van de eindkaart en het grote moment (eigen duur en overslaan)' },
  { id: 'wijkkaart', bestand: 'cinematics.js', balk: false, reden: 'filmisch moment met eigen regie (wijkkaart, landmark); geen kaart' },
  { id: 'ondertitel', bestand: 'subtitles.js', balk: false, reden: 'dialoog-ondertitel: duur is de lengte van de gesproken regel' },
  { id: 'laadscherm', bestand: 'loadscreen.js', balk: false, reden: 'geen melding: het laadscherm blijft tot het laden klaar is' },
  { id: 'stunt-uitleg', bestand: 'stunthud.js', balk: false, reden: 'uitleg van de activiteit zelf (briefT in de stunt); de activiteit bepaalt wanneer; vervolg: balk toevoegen' },
  { id: 'opgeslagen', bestand: 'savegame.js', balk: false, reden: 'statusvinkje van 1,5 s; geen tekst om te lezen, het verdwijnt vanzelf' },
]);
