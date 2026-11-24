// Samen spelen (#530, ADR 0022): the first-start question and the switch in the players
// panel, as pure rules and Dutch texts. The DOM lives in onlineconsentui.js (the first
// start) and coopspelersui.js (the switch); both read and write the same gde-settings key
// onlineMeedoen through here, so no third truth appears.
// No network here: an answer only records a permission. The session itself still starts
// through the lobby (lobbyui.js, coopnet.js), which is the one place that connects.
import { profielNaam, CONSENT_TEXT } from './lobby.js';
import { getSettings, setSetting, magOnline } from './settings.js';

// De eigenaar koos: altijd online, en een verplichte naam. De vraag moet dus terugkomen
// zolang er geen echte ja én een geldige naam is; false of null uit een oude installatie
// wordt bij de volgende start één keer omgezet. Leeg is geen geldige online naam.
export const onlineNaamFout = (naam) => {
  const r = profielNaam(naam);
  if (!r.ok) return r.reason;
  if (!r.naam) return 'Vul een naam in: andere spelers zien je onder die naam.';
  if (!/\p{L}/u.test(r.naam)) return 'Gebruik minstens één letter in je naam.';
  return '';
};
export const onlineNaamOk = (naam) => onlineNaamFout(naam) === '';
export const moetVragen = (settings = getSettings()) => settings.onlineMeedoen !== true || !onlineNaamOk(settings.onlineNaam);
// Sinds de startkeuze (Alleen of Samen, launchchoice.js) zijn het twee vragen, en beide komen pas bij Samen spelen: de kaart
// met naam en akkoord de eerste keer, daarna nooit meer vanzelf. Is alleen het akkoord ingetrokken, dan vraagt het spel alleen
// dat (de naam blijft). Alleen spelen vraagt niets en gebruikt het netwerk niet voor Samen spelen; alleen de live bussen en treinen (elk met een
// eigen uitzetter in Instellingen) halen ook dan openbare gegevens op.
export const moetNaamVragen = (settings = getSettings()) => !onlineNaamOk(settings.onlineNaam);
export const moetToestemmingVragen = (settings = getSettings()) => settings.onlineMeedoen !== true;
// De naam wijzigen (Instellingen): dezelfde regels als de kaart (verboden woorden, geen echte persoonsnamen); bij een fout blijft de oude naam.
export function wijzigNaam(naam, { zet = setSetting } = {}) {
  const fout = onlineNaamFout(naam);
  if (fout) return { ok: false, error: fout };
  const r = profielNaam(naam);
  zet('onlineNaam', r.naam);
  return { ok: true, naam: r.naam };
}
// Alleen de toestemming, voor wie al een naam heeft (Samen gekozen na een ingetrokken toestemming). De naam blijft zoals hij is.
export function geefToestemming({ zet = setSetting } = {}) {
  zet('onlineMeedoen', true);
  return { ok: true, meedoen: true };
}

// What the first Samen spelen step shows (21-11, owner): a name and the online agreement on ONE card, the first time the
// player does anything with Samen spelen; Alleen spelen never sees it. Both are remembered (onlineNaam, onlineMeedoen).
export const EERSTE_START = {
  titel: 'Je naam voor Samen spelen',
  naamLabel: 'Je naam',
  // Tekstdieet 21-11: op de kaart staat één korte zin bij het vinkje; de uitleg zit achter "Meer info" (een uitklapper, niet standaard in beeld).
  consent: 'Ik ga akkoord met online verbinden (mijn IP-adres wordt gedeeld).',
  meerInfo: 'Meer info',
  info: `${CONSENT_TEXT} Andere spelers zien je onder je naam. Je kunt je naam en je akkoord later aanpassen of intrekken bij Instellingen, Samen spelen.`,
  wieZietWat: 'Wie ziet wat als je verbindt',
  doorgaan: 'Doorgaan',
  terug: 'Terug',
};

// Instellingen, Samen spelen: de naam en het akkoord, met dezelfde filter als de kaart.
export const ONLINE_INSTELLING = {
  titel: 'Samen spelen',
  naamLabel: 'Je naam voor Samen spelen',
  bewaar: 'Naam bewaren',
  bewaard: 'Naam bewaard.',
  akkoordAan: 'Je akkoord staat aan: het spel mag online verbinden als je Samen spelen kiest. Wat er dan naar buiten gaat, staat hieronder.',
  akkoordUit: 'Je akkoord staat uit: het spel maakt geen verbinding. Bij Samen spelen vraagt het spel er opnieuw om.',
  intrekken: 'Akkoord intrekken',
  geven: 'Akkoord geven',
};

// The switch in the players panel, with one line of explanation.
export const SCHAKELAAR = {
  label: 'Meedoen met andere spelers',
  uitleg: CONSENT_TEXT,
  aan: 'Je mag nu meedoen. Open Samen spelen om een sessie te openen of aan te sluiten.',
  uitOpenbaar: 'De sessie staat niet meer in de openbare lijst. Wie al meespeelt blijft; nieuwe spelers komen er alleen nog bij met de kamercode.',
  uitSessie: 'Deze sessie blijft besloten: wie al meespeelt blijft, nieuwe spelers komen er alleen nog bij met de kamercode.',
  uitGast: 'Bewaard. Deze sessie loopt nog; de volgende keer dat je het spel opent, speel je alleen.',
  uit: 'Je speelt alleen. Je sessie gaat niet naar buiten.',
};

// De uitkomst van de kaart "Je naam voor Samen spelen": een verplichte naam én het akkoord. Dezelfde filter als het
// profielveld (lobby.js). Niets wordt bewaard bij een fout, zodat een typefout nooit een halve keuze achterlaat.
export function kiesNaam(naam, { zet = setSetting, consent = true } = {}) {
  if (!consent) return { ok: false, error: 'Vink eerst de online-toestemming aan.' };
  const fout = onlineNaamFout(naam);
  if (fout) return { ok: false, error: fout };
  const r = profielNaam(naam);
  zet('onlineNaam', r.naam);
  zet('onlineMeedoen', true);
  return { ok: true, meedoen: true, naam: r.naam };
}
// Oude naam van dezelfde regel, voor bestaande aanroepers: altijd online.
export function kiesToestemming(_meedoen, naam, opts = {}) { return kiesNaam(naam, opts); }

// The switch. Turning it off records the answer and takes a session that lists itself out
// of the public list (hub.zetOpenbaar(false), net/hub.js): the guests that are already in
// stay, and new players can only come in with the room code. A guest cannot close the host's
// session, so there the answer applies from the next start. Turning it on only records the
// permission and asks for the panel that opens or joins (requestOpenSamen in samenpanel.js);
// connecting stays the lobby's job (lobbyui.js), there is no second network path here.
export function zetMeedoen(aan, { world = null, zet = setSetting, nu = magOnline() } = {}) {
  if (!!aan === nu) return { ok: true, meedoen: nu, veranderd: false, tekst: '' };
  zet('onlineMeedoen', !!aan);
  if (aan) return { ok: true, meedoen: true, veranderd: true, openSamen: true, tekst: SCHAKELAAR.aan };
  const n = world && world.coopNet;
  const hub = n && n.role === 'host' ? n.hub : null;
  const openbaar = !!(hub && hub.openbaar);
  const solo = !!(world && world.coopSolo); // Alleen spelen (#554): geen kamercode en geen medespelers (#580)
  if (openbaar && typeof hub.zetOpenbaar === 'function') hub.zetOpenbaar(false);
  const tekst = openbaar ? SCHAKELAAR.uitOpenbaar : hub && !solo ? SCHAKELAAR.uitSessie : n && n.role === 'client' ? SCHAKELAAR.uitGast : SCHAKELAAR.uit;
  return { ok: true, meedoen: false, veranderd: true, openbaarGesloten: openbaar, tekst };
}


// De tabel "Wie ziet wat" (ontwerp 24-11, hoofdstuk 5c): eerlijk per partij wat die ziet, in gewone woorden. Het zegt niet meer en niet minder dan constitutie 4 en 10:
// medespelers zien je IP-adres (een rechtstreekse verbinding kan niet anders), de openbare hulpservers (STUN) en postbussen (brokers) zien het zoals elke server die je bereikt,
// berichten voor het opzetten zijn versleuteld, de openbare lijst alleen als de speler het zelf kiest, en niets gaat naar een server van de makers.
export const WIE_ZIET_WAT = Object.freeze([
  { id: 'medespelers', wie: 'Je medespelers', klein: 'de mensen in jouw sessie', ziet: 'Je naam, je kleur en je IP-adres. Een rechtstreekse verbinding kan niet zonder.' },
  { id: 'hulpservers', wie: 'Hulpservers', klein: 'openbaar, om elkaar te vinden', ziet: 'Je IP-adres en dat je een verbinding zoekt, zoals elke server die je bereikt.' },
  { id: 'postbussen', wie: 'Postbussen', klein: 'openbaar, om de verbinding op te zetten', ziet: 'Alleen versleutelde berichten. Zij kunnen ze niet lezen.' },
  { id: 'lijst', wie: 'De lijst met openbare sessies', klein: 'alleen als jij je sessie openbaar maakt', ziet: 'De naam van je sessie, het aantal spelers en de versie. Geen IP-adres, geen wachtwoord.' },
  { id: 'wij', wie: 'Wij', klein: 'de makers van het spel', ziet: 'Niets. Er gaat niets naar een server van ons en er wordt niets bewaard.', niets: true },
]);
export const WIE_ZIET_WAT_VOET = 'Los hiervan haalt het spel openbare gegevens op, zoals de live bussen en treinen. Daar gaat niets over jou naartoe; je zet ze uit bij Instellingen.';
