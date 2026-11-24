// De startkeuze: bij elke start vraagt het spel of je Alleen of Samen speelt (eigenaarsbesluit 21-11, hij komt terug op
// "direct spelen"). Dit bestand is de pure regel en de Nederlandse tekst; het scherm staat in launchchoiceui.js.
// Geen netwerk en geen DOM hier: de keuze zelf gebruikt niets buiten het apparaat (constitution 4 en 10).
//
// De volgorde (vastgelegd in docs/COOP-GAST.md):
//   1. elke start: alleen de keuzekaart (ook de allereerste; geen naamscherm). Alleen = direct spelen, zonder naam of akkoord;
//   2. Samen (of iets anders met Samen spelen, zie ensureSamenProfile in launchchoiceui.js) zonder bewaarde naam: de kaart "Je naam voor
//      Samen spelen" met naam EN akkoord (onlineconsent.js), de eerste keer verplicht; beide worden onthouden (onlineNaam, onlineMeedoen);
//   3. Samen met een naam maar zonder akkoord (ingetrokken in Instellingen, of een oude 'nee'): alleen de toestemmingskaart, de naam blijft;
//      er gaat niets naar buiten vóór dat akkoord; daarna de sessiekeuze (Een spel openen of Meedoen, samenkeuze.js);
//   4. wie al een naam en akkoord heeft krijgt niets nieuws; de naam en het akkoord pas je aan bij Instellingen, Samen spelen;
//   5. testruns (--stil, --story-test, --clip, benchmark, autoplay, testbank) en ?startkeuze=alleen slaan de kaart over.
// Er is geen "onthoud en sla over": de laatste keuze (gde-settings, startKeuze) is alleen de voorselectie.
import { moetNaamVragen, moetToestemmingVragen } from './onlineconsent.js';
import { CONSENT_TEXT } from './lobby.js';
import { getSettings, setSetting } from './settings.js';

export const KEUZES = Object.freeze([
  { id: 'alleen', label: 'Alleen spelen', uitleg: 'Jouw verhaal, jouw tempo.', icoon: 'solo', toets: '1' },
  { id: 'samen', label: 'Samen spelen', uitleg: 'Met vrienden, in een besloten sessie.', icoon: 'samen', toets: '2' },
]);

export const LAUNCH_TEXT = Object.freeze({
  eyebrow: 'Zomer vol misdaad',
  titel: 'Hoe wil je spelen?',
  hulp: ['{ARROWS} kiezen', '{ENTER} starten'],
  aria: 'Kies hoe je speelt: alleen of samen',
});

export const TOESTEMMING_TEKST = Object.freeze({
  eyebrow: 'Samen spelen',
  titel: 'Mag het spel online verbinden?',
  consent: 'Ik ga akkoord met online verbinden (mijn IP-adres wordt gedeeld).',
  meerInfo: 'Meer info',
  info: `${CONSENT_TEXT} Zonder jouw akkoord maakt het spel geen verbinding.`,
  geef: 'Akkoord en doorgaan',
  terug: 'Terug',
});

// De vlaggen van een geautomatiseerde run (testruns, beeld, perf, story, benchmark): één lijst voor main.js en startscreen.js.
export const AUTOMATION_FLAGS = Object.freeze(['noattract', 'storytest', 'stil', 'trailer', 'preview', 'benchmark', 'perf', 'spotsonly', 'autoplay', 'menutest']);
export const isAutomation = (flags = {}) => AUTOMATION_FLAGS.some((k) => !!flags[k]);

// De ene centrale regel: hoe start dit spel? 'benchmark' (vlag --benchmark, of de Benchmark uit Instellingen > Beeld die via een herlaad
// opent: `benchmarkPending`), 'automation' (andere testrun) of 'player'. Een benchmark is altijd lokaal en solo en begint meteen: geen
// keuzekaart, geen Samen-wizard, geen naamkaart, en er verandert niets in de opslag. `?startkeuze=vraag` toont de kaart alleen in een testrun.
export function launchKind(flags = {}, { benchmarkPending = false } = {}) {
  if (flags.benchmark || benchmarkPending) return 'benchmark';
  return isAutomation(flags) ? 'automation' : 'player';
}
export const skipStartChoice = (flags = {}, opts = {}) => {
  const kind = launchKind(flags, opts);
  return kind === 'benchmark' || flags.startkeuze === 'alleen' || (kind === 'automation' && flags.startkeuze !== 'vraag');
};

export const isKeuze = (v) => v === 'alleen' || v === 'samen';

// Wat de start vraagt. `testmodus`: een geautomatiseerde run (main.js telt de vlaggen); `vlag`: ?startkeuze=
//   'alleen' slaat de kaart over en speelt alleen (geen netwerk); 'vraag' toont de kaart ook in een testrun (beeld en tests).
export function launchPlan(settings = getSettings(), { testmodus = false, vlag = null, benchmark = false } = {}) {
  if (benchmark) return { naam: false, keuze: false, modus: 'alleen', reden: 'benchmark' }; // altijd solo, altijd meteen, niets bewaard
  if (vlag === 'alleen') return { naam: false, keuze: false, modus: 'alleen', reden: 'vlag' };
  if (testmodus && vlag !== 'vraag') return { naam: false, keuze: false, modus: null, reden: 'testmodus' };
  return { naam: false, keuze: true, modus: null, reden: '' }; // geen naamscherm bij de start: de naam komt bij Samen spelen
}

// Welke knop staat gekozen als de kaart opent: de laatste keuze, anders Alleen (het veilige, offline pad).
export const voorselectie = (settings = getSettings()) => (settings && settings.startKeuze === 'samen' ? 1 : 0);

// Welke knop staat gekozen op het scherm Een spel openen / Meedoen / Openbare sessies: de laatste rol die lukte, anders Een spel openen.
export const rolVoorkeur = (settings = getSettings()) => (settings && ['host', 'gast', 'lijst'].includes(settings.samenRol) ? settings.samenRol : 'host');

// Na de keuze: wat is er nog nodig voordat het spel verder mag?
//   'klaar' (Alleen), 'naam' (geen geldige naam: de kaart met naam en akkoord), 'toestemming', of 'sessie' (Een spel openen / Meedoen).
export function naKeuze(modus, settings = getSettings()) {
  if (modus !== 'samen') return 'klaar';
  if (moetNaamVragen(settings)) return 'naam';
  if (moetToestemmingVragen(settings)) return 'toestemming';
  return 'sessie';
}

// Toetsen op de kaart. index = de knop met focus. Geeft { focus: i } of { kies: 'alleen' | 'samen' } of null.
// Pijlen en WASD verplaatsen de focus (beide richtingen, de knoppen staan naast elkaar), 1 en 2 kiezen meteen,
// Enter en spatie kiezen de knop met focus, Escape en Backspace kiezen Alleen (de terugweg: Alleen is het veilige pad).
export function toetsActie(key, index = 0) {
  const n = KEUZES.length;
  const k = String(key);
  if (['ArrowLeft', 'ArrowUp', 'a', 'A', 'w', 'W'].includes(k)) return { focus: (index + n - 1) % n };
  if (['ArrowRight', 'ArrowDown', 'd', 'D', 's', 'S'].includes(k)) return { focus: (index + 1) % n };
  const direct = KEUZES.find((c) => c.toets === k);
  if (direct) return { kies: direct.id };
  if (k === 'Enter' || k === ' ') return { kies: KEUZES[((index % n) + n) % n].id };
  if (k === 'Escape' || k === 'Backspace') return { kies: 'alleen' };
  return null;
}

// De keuze bewaren als voorselectie. Nooit bij een testrun (dat telt de aanroeper) en nooit iets anders dan de twee woorden.
export function bewaarKeuze(modus, { zet = setSetting } = {}) {
  if (!isKeuze(modus)) return false;
  zet('startKeuze', modus);
  return true;
}

// De laatste rol bewaren als voorselectie (nooit iets anders dan de drie woorden).
export function bewaarRol(rol, { zet = setSetting } = {}) {
  if (!['host', 'gast', 'lijst'].includes(rol)) return false;
  zet('samenRol', rol);
  return true;
}

// De stand van deze sessie, voor main.js: 'alleen' houdt de automatische zoektocht naar een sessie dicht (sessionboot.js).
let launchMode = null;
export const applyLaunchMode = (modus) => { launchMode = isKeuze(modus) ? modus : null; };
export const getLaunchMode = () => launchMode;

// De hele start-vraag als één stroom, met de schermen als losse functies (main.js geeft de echte schermen mee, de test nepschermen).
//   deps: { plan, settings(), naam(), keuze(index), toestemming(), sessie(), samen(rol), bewaar(modus) }
// naam() resolvet truthy na een geldige naam met akkoord (falsy: Terug), keuze() met 'alleen' of 'samen', toestemming() met true (akkoord) of false (terug),
// sessie() met 'host' | 'gast' | 'lijst' of null (terug). Terug in Samen brengt je terug op de keuzekaart.
export async function askLaunchChoice(deps) {
  const plan = deps.plan;
  if (!plan.keuze) return plan.modus;
  for (;;) {
    const modus = await deps.keuze(voorselectie(deps.settings()));
    let nextStep = naKeuze(modus, deps.settings());
    if (nextStep === 'naam') {
      if (!(await deps.naam())) continue; // Terug: naar de keuzekaart, Alleen blijft kunnen
      nextStep = naKeuze(modus, deps.settings());
    }
    if (nextStep === 'toestemming') {
      if (!(await deps.toestemming())) continue;
      nextStep = naKeuze(modus, deps.settings());
      if (nextStep === 'toestemming') continue; // het akkoord is niet bewaard: nooit doorgaan op een gok
    }
    if (nextStep === 'sessie') {
      const rol = await deps.sessie(rolVoorkeur(deps.settings()));
      if (!rol) continue;
      deps.samen(rol);
      if (deps.bewaarRol) deps.bewaarRol(rol); // pas na een gelukte keuze: Terug verandert de voorselectie niet
    }
    deps.bewaar(modus);
    return modus;
  }
}
