// #820: genereert game/js/herkenningspunten.js uit game/landmarkkits.json. Eén bron, één richting:
// alleen punten met een naam worden een herkenningspunt in het album, zonder echte bedrijven of personen
// (constitutie 2) en zonder dubbelen.
//   node scripts/gen_herkenningspunten.mjs          schrijf het databestand
//   node scripts/gen_herkenningspunten.mjs --check  faal als het bestand achterloopt
// De puntvorm: { id, naam, x, y, soort }. `soort` is de kitsoort uit landmarkkits.json; de albummodule
// vertaalt hem naar kerk, molen, borg enz. De coördinaten komen uit de kit; de naam ook, tenzij hij een
// bedrijf of een persoon is: dan staat er een neutrale naam met soort en plaats.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wgsToRd, rdToWorld } from '../game/js/rdnew.js';

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KITS = path.join(REPO, 'game', 'landmarkkits.json');
const OUT = path.join(REPO, 'game', 'js', 'herkenningspunten.js');

const rond = (v) => Math.round(Number(v) * 10) / 10;

// Constitutie 2: echte plaatsen en gebouwen mogen, echte bedrijven en personen niet. De kits komen uit
// OpenStreetMap en bevatten beide. Een bekende naam staat in VERVANGING; wat daarna nog op een
// bedrijfsvorm of een persoonsnaam lijkt, krijgt de standaardnaam van de soort. Daarachter komt de plaats:
// "Aardappelfabriek bij Veendam".
const VERVANGING = new Map([
  ['Aviko Rixona', 'Aardappelfabriek'], ['Bollegraaf Recycling Solutions', 'Recyclingbedrijf'], ['Doornbos B.V.', 'Fabriek'],
  ['Labor Pallet B.V.', 'Pallettenfabriek'], ['Xafi', 'Fabriek'], ['Carwash Aqua Clean', 'Wasstraat'], ['A. Kijf', 'Bedrijfspand'],
  ["H.A. Auto's", 'Garagebedrijf'], ['Engine2Repair', 'Garagebedrijf'], ['RWE', 'Elektriciteitscentrale'],
  ['RWE Eemshavencentrale', 'Elektriciteitscentrale'], ['Kant - Telson', 'Bedrijfspand'], ['BIES draai en freeswerk', 'Metaalbedrijf'],
  ['Hessels zeefbanden', 'Bedrijfspand'], ['Drenth', 'Bedrijfspand'], ['Simpro evenementenservice', 'Bedrijfspand'],
  ['Bouwbedrijf Kooi', 'Bouwbedrijf'], ['Steenindustrie Strating', 'Steenfabriek'], ['AG Ems Borkumlijn', 'Veerdienst'],
  ['Damster Watersport Vereniging', 'Watersportvereniging'], ['Centrum voor dagbesteding Edama', 'Zorgcentrum'],
  ['Leger des Heils', 'Kerkgebouw'], ['Anna Borema toren', 'Toren'], ['Stadsmarkering S09 Architektron Urania', 'Stadsmarkering'],
  ['Rutger Kopland School', 'Basisschool'], ['H. de Cockschool', 'Basisschool'], ['OBS Feiko Clock', 'Basisschool'],
  ['Professor W.J. Bladergroenschool', 'Basisschool'], ['Kikkoman', 'Molen'], ['Winkler Prins', 'School'], ['Winkler Prins Flat', 'Flat'],
]);
const STANDAARD = { factory: 'Bedrijfspand', school: 'School', flat: 'Flat', church: 'Kerk', chapel: 'Kapel', mill: 'Molen', tower: 'Toren' };
// De vangnetten voor wat nog niet in VERVANGING staat: een bedrijfsvorm, of een school, flat of toren met een persoonsnaam.
export const BEDRIJFSVORM = /\b(B\.?V\.?|N\.?V\.?|Holding|Recycling|Solutions|Auto'?s|Garage|Carwash|Repair|Stichting|Foundation)\b|\b(RWE|Aviko|Xafi)\b/i;
export const PERSOONSNAAM = /\b(Professor|Prof\.|Dr\.|Mr\.|Rutger|Kopland|Winkler|Bladergroen|Cock|Feiko|Borema)\b|\b[A-Z]\.\s?[A-Z]?\.?\s?[A-Z][a-z]+/;
// Een naam met een van deze woorden zegt al wat het is; een kale naam (De Hoop, Elim) krijgt de soort en de plaats.
const TYPEWOORD = /(kerk|kapel|molen|toren|borg|huis|huize|school|college|station|museum|kathedraal|moskee|vuurtoren|gemaal|schuur|fabriek|heerd|stede|havezate|vesting|bunker|oven|veem|flat|residence|centrale|mole|synagoge|mandir|temple|tempel|masjid|centrum|gemeente|koninkrijkszaal|kluizenarij|church|gemeenschap|genootschap|abdij|moskee)/i;
// alleen bij deze soorten zegt een kale naam niets; een school of fabriek met een eigennaam blijft zoals hij is
const KALE_SOORTEN = new Set(['church', 'chapel', 'mill', 'tower', 'flat']);
const voorzetsel = (soort) => (soort === 'factory' ? 'bij' : 'te');
const PLAATS_STRAAL = 3000;

// Plaatsen met een RD-positie, uit game/borderplaces.json (lat/lon, de eigen plaatsenlijst van het spel).
function leesPlaatsen() {
  const lijst = JSON.parse(fs.readFileSync(path.join(REPO, 'game', 'borderplaces.json'), 'utf8'));
  return lijst.map(([naam, , lat, lon]) => { const [x, y] = rdToWorld(...wgsToRd(lat, lon)); return { naam, x, y }; });
}
export function plaatsBij(plaatsen, x, y) {
  let best = null, bd = PLAATS_STRAAL;
  for (const p of plaatsen) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p.naam; } }
  return best;
}

// De neutrale soortnaam voor een bedrijf of persoon, of null als de naam blijft zoals hij is.
export function neutraleNaam(naam, soort) {
  if (VERVANGING.has(naam)) return VERVANGING.get(naam);
  if (BEDRIJFSVORM.test(naam)) return STANDAARD[soort] || 'Bedrijfspand';
  if ((soort === 'school' || soort === 'flat' || soort === 'tower') && PERSOONSNAAM.test(naam)) return STANDAARD[soort];
  return null;
}

// Dezelfde volgorde als in landmarkkits.json, zodat het databestand deterministisch is. De id blijft de
// kit-index, ook als een dubbel erachter wegvalt: een bewaard album verwijst naar die id.
export function bouwPunten(kits, plaatsen = leesPlaatsen()) {
  const items = (kits && Array.isArray(kits.items) ? kits.items : []).filter((i) => i && typeof i.n === 'string' && i.n.trim() && Number.isFinite(i.x) && Number.isFinite(i.y));
  const punten = items.map((i, idx) => {
    const x = rond(i.x), y = rond(i.y), soort = String(i.k || 'overig');
    const orig = i.n.trim();
    const plaats = plaatsBij(plaatsen, x, y);
    let naam = orig;
    const vervanger = neutraleNaam(orig, soort);
    if (vervanger) naam = plaats ? `${vervanger} ${voorzetsel(soort)} ${plaats}` : vervanger;
    else if (KALE_SOORTEN.has(soort) && !TYPEWOORD.test(orig) && orig !== plaats) naam = `${STANDAARD[soort]} ${orig}${plaats && !orig.includes(plaats) ? ` te ${plaats}` : ''}`;
    return { id: `${i.k}-${idx + 1}`, naam, x, y, soort, plaats };
  });
  // ontdubbel: dezelfde naam binnen 30 m (station en fabriek 250 m: een perron of een terrein heeft twee kits)
  const uit = [];
  for (const p of punten) {
    const straal = p.soort === 'station' || p.soort === 'factory' ? 250 : 30;
    if (uit.some((q) => q.naam === p.naam && Math.hypot(q.x - p.x, q.y - p.y) <= straal)) continue;
    uit.push(p);
  }
  // dezelfde naam op verschillende plekken (Hervormde Kerk): de plaats erbij, en daarna een volgnummer
  const telling = new Map();
  for (const p of uit) telling.set(p.naam, (telling.get(p.naam) || 0) + 1);
  for (const p of uit) if (telling.get(p.naam) > 1 && p.plaats && !p.naam.includes(p.plaats)) p.naam = `${p.naam} ${voorzetsel(p.soort)} ${p.plaats}`;
  const gezien = new Map();
  for (const p of uit) {
    const n = (gezien.get(p.naam) || 0) + 1; gezien.set(p.naam, n);
    if (n > 1) p.naam = `${p.naam} (${n})`;
  }
  return uit.map(({ plaats, ...rest }) => rest);
}

export function genereer(kits = JSON.parse(fs.readFileSync(KITS, 'utf8')), plaatsen = undefined) {
  const punten = bouwPunten(kits, plaatsen);
  const lijnen = [];
  lijnen.push('// #820: de herkenningspunten van de provincie, gegenereerd uit game/landmarkkits.json.');
  lijnen.push('// Niet met de hand aanpassen: node scripts/gen_herkenningspunten.mjs schrijft dit bestand,');
  lijnen.push('// en scripts/herkenningspunten_test.mjs bewaakt dat de twee niet uit elkaar lopen.');
  lijnen.push(`// ${punten.length} punten met een naam (kerk, molen, borg en meer), zonder echte bedrijven of personen.`);
  lijnen.push('export const HERKENNINGSPUNTEN = [');
  for (const p of punten) lijnen.push(`  { id: ${JSON.stringify(p.id)}, naam: ${JSON.stringify(p.naam)}, x: ${p.x}, y: ${p.y}, soort: ${JSON.stringify(p.soort)} },`);
  lijnen.push('];');
  lijnen.push('');
  lijnen.push(`export const HERKENNINGSPUNTEN_TOTAAL = ${punten.length};`);
  return lijnen.join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tekst = genereer();
  if (process.argv.includes('--check')) {
    const huidig = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (huidig !== tekst) { console.error('herkenningspunten.js loopt achter; draai node scripts/gen_herkenningspunten.mjs'); process.exit(1); }
    console.log('herkenningspunten.js is actueel.');
  } else {
    fs.writeFileSync(OUT, tekst);
    console.log(`herkenningspunten.js geschreven: ${tekst.match(/^ {2}\{ id:/gm).length} punten`);
  }
}
