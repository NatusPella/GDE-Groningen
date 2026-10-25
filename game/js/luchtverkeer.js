// Luchtverkeer (#492): de toren van het veld als parodie bij de rondvlucht. Puur: geen DOM,
// geen THREE, geen klok, geen opslag en geen random, zodat het bord bij elke start van de
// dienst dezelfde twee regels toont. De regels zijn verzonnen en bevatten geen echte namen van
// luchtvaartmaatschappijen, toestellen of velden; de toren hoort bij het veld dat de dienst al
// kent (de naam van de dienst), dus er is geen tweede lijst met velden.
// Hier staat ook wat de toren na de landing betaalt: geld en ervaring in het vak 'lucht', per
// medaille en maar één keer per dienst. Onder de eenmalige medailles van de vliegschool, zodat
// een rondvlucht herhalen niet de beste geldbron wordt.
// Tests: scripts/luchtverkeer_test.mjs en scripts/vluchtdienst_test.mjs.

// Eén vertrekregel en één naderingsregel per dienst, gekozen met een hash van de veldnaam.
const VERTREK = [
  'Toren: vrij voor vertrek, taxiën maar.',
  'Toren: de baan is van u, geen wachtrij vandaag.',
  'Toren: u mag gaan, de koffie is hier toch op.',
  'Toren: start toegestaan, blijf wel van de toren af.',
  'Toren: taxi vrij, groet de wolken van ons.',
];

const NADERING = [
  'Toren: u nadert, zet hem zacht neer.',
  'Toren: baan vrij, graag in één keer landen.',
  'Toren: we luisteren mee, geen applaus nodig.',
  'Toren: nadering goedgekeurd, koffie staat klaar.',
  'Toren: welkom terug, de toren heeft niets gezien.',
];

// Zonder veldnaam zegt de toren toch iets veiligs, zodat het bord nooit leeg blijft.
export const STANDAARD_VERTREK = 'Toren: veld onbekend, u mag vertrekken.';
export const STANDAARD_NADERING = 'Toren: veld onbekend, zet hem rustig neer.';

// FNV-1a over de veldnaam: klein, stabiel en zonder random of klok.
function veldHash(veld) {
  let h = 0x811c9dc5;
  for (let i = 0; i < veld.length; i++) {
    h ^= veld.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Alleen de veldnaam zelf bepaalt de regel: spaties en hoofdletters tellen niet mee.
function veldSleutel(veld) {
  if (typeof veld !== 'string') return '';
  return veld.trim().toLowerCase().slice(0, 80);
}

function kies(lijst, veld, zout) {
  const sleutel = veldSleutel(veld);
  if (!sleutel) return null;
  return lijst[((veldHash(sleutel) ^ zout) >>> 0) % lijst.length];
}

// De vertrekregel van de toren bij dit veld, of een veilige standaardregel.
export function departure(veld) {
  return kies(VERTREK, veld, 0x5bd1) || STANDAARD_VERTREK;
}

// De naderingsregel van de toren bij dit veld, of een veilige standaardregel.
export function approach(veld) {
  return kies(NADERING, veld, 0x9e37) || STANDAARD_NADERING;
}

// De beloning na de landing, per medaille (0 geen, 1 brons, 2 zilver, 3 goud).
export const VLUCHT_LOON = [0, 18, 28, 40];   // euro; onder de medailles van de vliegschool (€25-60)
export const VLUCHT_XP = [2, 14, 20, 26];     // loopbaanpunten in het vak 'lucht'

// Wat de dienst uitbetaalt bij deze uitslag. Een afgebroken of mislukte vlucht levert niets op;
// een geslaagde vlucht betaalt één keer (run.betaald), ook als het bord nog een beeld nabrandt.
export function vluchtLoon(u, run = null) {
  const niets = { geld: 0, xp: 0, n: 0 };
  if (run && run.betaald) return niets;
  if (!u || !u.klaar || u.afgebroken || u.mislukt) return niets;
  const m = Math.max(0, Math.min(3, Math.round(Number(u.medaille) || 0)));
  if (run) run.betaald = true;
  return { geld: VLUCHT_LOON[m] || 0, xp: VLUCHT_XP[m] || 0, n: 1 };
}
