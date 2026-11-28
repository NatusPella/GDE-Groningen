// Samen in dezelfde club of op hetzelfde erf (#1380, docs/verhaal/bijbel-28-11/02-loopbanen.md hoofdstuk 7): de regels van een gezelschap (crew), puur: geen DOM,
// geen netwerk, geen klok (scripts/loopbaansamen_test.mjs). Het transport staat in loopbaansamennet.js.
//
// Wie? De club of het erf is van één speler (de eigenaar, bijvoorbeeld de manager van een voetbalclub of de boer van een erf). Alle spelers zijn gelijkwaardig: de eigenaar hoeft niet wie
// het spel opende te zijn; de host is alleen de doorgever van berichten. De eigenaar nodigt medespelers uit ("Meedoen in mijn club?", J of N). Geen antwoord is nee. Wie J zegt tijdens een
// ronde (een wedstrijddag, een oogstdag) sluit pas aan bij de volgende ronde: niet halverwege.
//
// Beloning, eerlijk en zonder verlies: niemand legt eigen geld in en niemand krijgt minder dan alleen spelen. Wat de eigenaar alleen zou verdienen (zijn club- of erfopbrengst) blijft helemaal van hem.
// Samen werken levert er een TEAMBONUS bovenop: nieuw geld (zoals de groepsbonus bij een opdracht), 15% van die opbrengst per extra meewerkende mens, hooguit drie. Bij een club gaat
// KAS_AANDEEL (40%) daarvan naar de gedeelde clubkas (alleen clubgeld, nooit eigen geld: de eigenaar boekt het in zijn eigen clubrekening); de rest gaat over de meewerkende leden naar rato
// van hun inzet (zelf gespeelde minuten, bewerkte hectares), met de eigenaar als gewoon lid. Een rest van een eurocent gaat naar wie het meeste achter de komma overhield (grootste rest), bij
// gelijk spel naar de laagste plek: de verdeling klopt altijd op de cent met de bonus. Elke uitkering heeft een eigen id en wordt nooit twee keer geboekt (#448).
// Wegvallen: wat al per gebeurtenis uitgekeerd is blijft van wie het kreeg; wie weggaat telt niet meer mee. Valt de eigenaar weg, dan eindigt het gezelschap en niemand verliest iets
// (er staat geen saldo open: alles is per gebeurtenis geboekt). Een hostwissel begint een nieuwe sessie: het gezelschap wordt dan opnieuw uitgenodigd.
export const SOORTEN = Object.freeze({
  club: { naam: 'club', vraag: 'Meedoen in mijn club?', kasAandeel: 0.4, inzet: 'minuten' },
  erf: { naam: 'erf', vraag: 'Meedoen op mijn erf?', kasAandeel: 0, inzet: 'hectares' },
});
export const MAX_LEDEN = 4;            // de eigenaar meegeteld (zoals MAX_PER_TEAM bij voetbal)
export const UITNODIGING_S = 20;       // zo lang staat de vraag open; geen antwoord is nee
export const TEAMBONUS = 0.15;
export const MAX_EXTRA = 3;
export const MAX_BEDRAG = 5000;        // een bericht of gebeurtenis boekt hooguit zoveel (een bovengrens tegen een rare waarde)
export const MAX_BOEKINGEN = 200;      // zoveel gebeurtenis-id's onthoudt een gezelschap

const heel = (x, max = MAX_BEDRAG) => (Number.isFinite(Number(x)) ? Math.max(0, Math.min(max, Math.floor(Number(x)))) : 0);
const plek = (x) => (Number.isInteger(x) && x >= 0 && x < 64 ? x : null);

// Een nieuw gezelschap. id: een korte sleutel van de eigenaar (zijn plek en een teller); naam: de naam van de club of het erf (verzonnen, door de speler of het spel).
export function maakCrew({ id, soort = 'club', eigenaar = 0, naam = '' } = {}) {
  if (!SOORTEN[soort] || plek(eigenaar) === null || typeof id !== 'string' || !id) return null;
  return { v: 1, id: id.slice(0, 24), soort, eigenaar, naam: String(naam || '').slice(0, 40), leden: { [eigenaar]: { status: 'mee', sinds: 0 } }, ronde: null, open: {}, kasTotaal: 0, geboekt: [] };
}
export const meeLeden = (c) => (c ? Object.keys(c.leden).map(Number).filter((s) => c.leden[s].status === 'mee').sort((a, b) => a - b) : []);
export const isLid = (c, slot) => !!c && !!c.leden[slot] && c.leden[slot].status === 'mee';
export const wachtOpRonde = (c) => (c ? Object.keys(c.leden).map(Number).filter((s) => c.leden[s].status === 'later') : []);

// De eigenaar nodigt plekken uit. Geeft de plekken die nu echt een vraag krijgen (niet de eigenaar zelf, niemand die al meedoet, nooit boven het maximum).
export function nodigUit(c, slots, nu = 0) {
  if (!c) return [];
  const vraag = [];
  for (const s of Array.isArray(slots) ? slots : []) {
    if (plek(s) === null || s === c.eigenaar) continue;
    const l = c.leden[s];
    if (l && (l.status === 'mee' || l.status === 'later' || l.status === 'wacht')) continue;
    const bezet = Object.values(c.leden).filter((x) => x.status === 'mee' || x.status === 'later' || x.status === 'wacht').length;
    if (bezet >= MAX_LEDEN) break;
    c.leden[s] = { status: 'wacht', sinds: nu };
    vraag.push(s);
  }
  return vraag;
}
// Het antwoord van een uitgenodigde (J of N). Tijdens een ronde wordt een ja 'later': hij doet bij de volgende ronde mee. Geeft de nieuwe status of null (niet uitgenodigd of al beantwoord).
export function antwoord(c, slot, ja) {
  const l = c && c.leden[slot];
  if (!l || l.status !== 'wacht') return null;
  l.status = ja === true ? (c.ronde ? 'later' : 'mee') : 'nee';
  return l.status;
}
// Geen antwoord is nee: een vraag die te lang openstond verloopt. Geeft de plekken die nee werden.
export function tik(c, nu) {
  const nee = [];
  if (!c) return nee;
  for (const s of Object.keys(c.leden).map(Number)) { const l = c.leden[s]; if (l.status === 'wacht' && nu - l.sinds >= UITNODIGING_S) { l.status = 'nee'; nee.push(s); } }
  return nee;
}
// Een lid gaat weg (zelf of door wegvallen). Geeft true als het gezelschap daarmee eindigt (de eigenaar viel weg).
export function verlaat(c, slot) {
  if (!c || !c.leden[slot]) return false;
  if (slot === c.eigenaar) { c.leden = {}; c.ronde = null; c.open = {}; return true; }
  c.leden[slot] = { status: 'weg', sinds: c.leden[slot].sinds };
  delete c.open[slot];
  if (c.ronde) c.ronde.leden = c.ronde.leden.filter((s) => s !== slot);
  return false;
}
export const isOpgeheven = (c) => !c || !c.leden[c.eigenaar];

// Een ronde begint (een wedstrijddag, een oogstdag): wie 'later' zei doet nu mee, de ploeg staat vast tot het einde.
export function beginRonde(c, rondeId) {
  if (!c || c.ronde || typeof rondeId !== 'string' || !rondeId) return false;
  for (const s of wachtOpRonde(c)) c.leden[s].status = 'mee';
  c.ronde = { id: rondeId.slice(0, 32), leden: meeLeden(c) };
  c.open = {};
  return true;
}
export function eindeRonde(c) { if (c) { c.ronde = null; c.open = {}; } }
// Inzet van een lid in deze ronde (minuten, hectares); alleen wie in de ploeg van de ronde staat telt. Wordt bij elke boeking leeggemaakt, zodat inzet nooit twee keer betaalt.
export function zetInzet(c, slot, hoeveel) {
  if (!c || !c.ronde || !c.ronde.leden.includes(slot) || !isLid(c, slot)) return false;
  const h = Number(hoeveel);
  if (!Number.isFinite(h) || h <= 0) return false;
  c.open[slot] = Math.min(1e6, (c.open[slot] || 0) + h);
  return true;
}

// De teambonus: nieuw geld bovenop wat de eigenaar zelf verdient. 0 zonder meewerkende anderen.
export const teamBonus = (bedrag, mee) => (mee > 1 ? Math.round(heel(bedrag) * TEAMBONUS * Math.min(MAX_EXTRA, mee - 1)) : 0);

// Verdeel `totaal` (hele euro's) over leden naar rato van hun inzet; alle inzet nul = gelijk. De som is altijd gelijk aan totaal (grootste rest, bij gelijk spel de laagste plek).
export function verdeelNaarInzet(totaal, leden) {
  const uit = {}, t = heel(totaal, 1e9);
  if (!leden.length) return uit;
  const gew = leden.map((l) => Math.max(0, Number(l.inzet) || 0));
  const som = gew.reduce((a, b) => a + b, 0);
  const w = som > 0 ? gew : gew.map(() => 1), ws = som > 0 ? som : leden.length;
  const rest = leden.map((l, i) => { const exact = (t * w[i]) / ws; return { slot: l.slot, hele: Math.floor(exact), frac: exact - Math.floor(exact) }; });
  let over = t - rest.reduce((a, r) => a + r.hele, 0);
  rest.slice().sort((a, b) => b.frac - a.frac || a.slot - b.slot).forEach((r) => { if (over > 0) { r.hele++; over--; } });
  for (const r of rest) uit[r.slot] = r.hele;
  return uit;
}

// De boeking van een gebeurtenis van de eigenaar: bedrag = wat de club of het erf zelf opleverde (blijft van de eigenaar). Geeft null als het id al geboekt is of er niets te verdelen valt;
// anders { id, bonus, kas, uitkering: { slot: euro } } met kas + som(uitkering) = bonus. Alleen de eigenaar draait dit. De inzet sinds de vorige boeking telt mee en wordt leeggemaakt.
export function boek(c, gebeurtenisId, bedrag) {
  if (!c || typeof gebeurtenisId !== 'string' || !gebeurtenisId || isOpgeheven(c)) return null;
  const id = `${c.id}:${gebeurtenisId}`.slice(0, 48);
  if (c.geboekt.includes(id)) return null;
  const mee = c.ronde ? c.ronde.leden.filter((s) => isLid(c, s)) : meeLeden(c);
  const bonus = teamBonus(bedrag, mee.length);
  c.geboekt.push(id); if (c.geboekt.length > MAX_BOEKINGEN) c.geboekt.shift();
  if (bonus <= 0) { c.open = {}; return null; }
  const kas = Math.round(bonus * SOORTEN[c.soort].kasAandeel);
  const uitkering = verdeelNaarInzet(bonus - kas, mee.map((s) => ({ slot: s, inzet: c.open[s] || 0 })));
  c.open = {};
  c.kasTotaal += kas;
  return { id, bonus, kas, uitkering };
}

// Een uitkering van een eigenaar aan een lid, zoals het lid hem ontvangt: wat het lid gelooft is begrensd (nooit meer dan MAX_BEDRAG, nooit negatief) en komt alleen van de eigenaar
// van het gezelschap waarin het lid zit. lid = { crew, eigenaar } (wat het lid van de uitnodiging onthield).
export function leesUitkering(lid, body, van) {
  if (!lid || !body || body.crew !== lid.crew || van !== lid.eigenaar || typeof body.ev !== 'string' || !body.ev) return null;
  const geld = heel(body.geld);
  return geld > 0 ? { ev: `crew:${body.ev.slice(0, 48)}`, geld } : null;
}

// De tekst die een speler ziet (Nederlands, zonder echte namen).
export const vraagTekst = (soort, naamEigenaar, naamCrew) => `${naamEigenaar || 'Een medespeler'} vraagt: ${SOORTEN[soort] ? SOORTEN[soort].vraag : 'Meedoen?'}${naamCrew ? ` (${naamCrew})` : ''} J = ja, N = nee.`;
export const uitkeringTekst = (geld, soort) => `Teambonus van de ${SOORTEN[soort] ? SOORTEN[soort].naam : 'groep'}: €${geld.toLocaleString('nl-NL')}`;
