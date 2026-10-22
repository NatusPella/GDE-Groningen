// De krant- en folderronde ("Krantenwijk", sidejob_krantenwijk.js, #405): de regels zonder DOM en zonder THREE, zodat
// scripts/krantenrules_test.mjs ze in node natrekt. Een worp is een afstand, een snelheid en een beetje geluk; wat er
// daarna ligt (brievenbus, deurmat of de border) bepaalt het loon. In sommige wijken mag de stapel ook gewoon in de
// papiercontainer bij de vijver: dat betaalt, met een grapje van de opdrachtgever, maar minder dan netjes bezorgen.
// Alle kranten, folders en bedrijven zijn verzonnen.

export const WORP_BEREIK = 18;   // m: verder weg gooit niemand
export const BUS_R = 1.0;        // m rond de brievenbus: de krant zit erin
export const MAT_R = 3.0;        // m: op de stoep of de deurmat
export const CONTAINER_R = 9;    // m: dichtbij genoeg om de hele stapel erin te gooien
export const WIJK_ZOEK = 260;    // m: zo ver zoeken we vanaf het midden van de wijk naar water

// Hoe ver de krant van de brievenbus belandt: een gooi uit stilstand vanaf dichtbij is raak, vanaf een fiets in volle
// vaart over de stoep minder. `ruis` is een getal uit een standaardnormale verdeling (de aanroeper levert het).
export function worpSpreiding(afstand, snelheid) {
  const d = Math.min(WORP_BEREIK, Math.max(0, afstand));
  return 0.5 + 0.10 * d + 0.12 * Math.max(0, snelheid);
}

export function worpFout(afstand, snelheid, ruis) {
  return Math.abs(ruis) * worpSpreiding(afstand, snelheid);
}

// 'bus' (in de brievenbus), 'mat' (op de stoep of de deurmat) of 'gemist' (in de border of op straat).
export function worpUitkomst(fout) {
  return fout <= BUS_R ? 'bus' : fout <= MAT_R ? 'mat' : 'gemist';
}

// Een bijna-normale verdeling uit drie gelijkmatige getallen (som van drie, geschaald: sd ~ 1).
export function ruisUit(rand = Math.random) {
  return ((rand() + rand() + rand()) - 1.5) * 2;
}

export const WORP_LOON = { bus: 4.5, mat: 2.7, gemist: 0 };
export const RONDE_VAST = 8;

// Het loon van een ronde: wat de worpen opleveren en de vaste vergoeding. `bus`, `mat` en `gemist` zijn aantallen.
// De fooi is voor wie alles in de brievenbus kreeg.
export function rondeLoon({ bus = 0, mat = 0, gemist = 0 }) {
  const huizen = bus + mat + gemist;
  const base = RONDE_VAST + bus * WORP_LOON.bus + mat * WORP_LOON.mat;
  const tip = huizen >= 3 && bus === huizen ? 8 + huizen : 0;
  return { base, tip, huizen, perfect: huizen > 0 && bus === huizen, schoon: gemist === 0 };
}

// De luie weg: de hele stapel in de papiercontainer bij de vijver. Betaalt iets minder dan een nette ronde met een paar
// raak gegooide kranten, geen fooi, en telt niet als foutloos.
export const LUI_FACTOR = 0.55;
export function luiLoon(huizen) {
  const netjes = rondeLoon({ bus: Math.ceil(huizen / 2), mat: Math.floor(huizen / 2) }).base;
  return { base: Math.max(1, Math.round(netjes * LUI_FACTOR)), tip: 0 };
}

// De dikte van de stapel: een ronde heeft huizen + een paar reserve.
export const huizenAantal = (niveau, reeks) => Math.min(8, 4 + Math.floor((niveau - 1) / 2) + (reeks >= 3 ? 1 : 0));
export const stapelGrootte = (huizen) => huizen + 3;

// Meetpunten om de `stap` m langs de punten van een weg, vanaf het punt (x, y) op het segment `best`, tot `totaal` m: { x, y, ux, uy }.
export function meetpunten(pts, best, dir, x, y, stap, totaal) {
  const uit = [];
  let idx = dir > 0 ? best + 1 : best, sinds = 0, afgelegd = 0;
  while (afgelegd < totaal && idx >= 0 && idx < pts.length) {
    const tx = pts[idx][0], ty = pts[idx][1], seg = Math.hypot(tx - x, ty - y);
    if (seg < 1e-6) { idx += dir; continue; }
    const ux = (tx - x) / seg, uy = (ty - y) / seg;
    if (sinds + seg >= stap) {
      const f = stap - sinds;
      x += ux * f; y += uy * f; afgelegd += f; sinds = 0;
      uit.push({ x, y, ux, uy });
    } else { sinds += seg; afgelegd += seg; x = tx; y = ty; idx += dir; }
  }
  return uit;
}

// --- verzonnen kranten, folders en opdrachtgevers ------------------------------------------------------------------

export const KRANTEN = [
  'Het Wijkwoord', 'De Noorderlijke Nieuwsbode', 'De Noorderpost', 'Het Gezellige Weekblad', 'De Peerdestal Courant',
];
export const FOLDERS = [
  'Meubelhal Fjord & Zoon: nu drie voor twee', 'Bouwmarkt Bieten Bart: bijna alles met korting', 'Tuincentrum De Groene Duim: tulpen in september',
  'Pizzabakker Mamma Grunn: de tweede gratis', 'Eierballenhuis Het Gouden Ei: de bal blijft bij ons', 'Tweewielerhal De Lekke Band: tweedehands, eerste keus',
];
export const OPDRACHTGEVER = 'Drukkerij De Natte Inkt';
export const BAAS = 'Wijkbezorger De Natte Inkt';

export const VIJVER_VOORAF = [
  'In deze wijk lezen ze niks. De papiercontainer staat bij de vijver: gooi de stapel erin en je krijgt gewoon betaald.',
  'Deze buurt heeft al jaren geen krant gelezen. Bij de vijver staat een papiercontainer. Wij betalen toch.',
  'Niemand in deze wijk kijkt naar de brievenbus. De container bij de vijver wel. Jouw keuze.',
];
export const VIJVER_KLAAR = [
  'Netjes recycled. Dit zijn onze meest tevreden lezers.',
  'Onbezorgd én betaald. Zo houden wij het gezellig.',
  'De stapel is weg, de opdrachtgever blij. Niemand die het merkt.',
  'Papier hoort bij papier. En de vijver blijft schoon.',
];
export const BUS_LINES = ['Raak! In de brievenbus.', 'Precies door de gleuf.', 'In één keer in de bus.', 'Keurig, de klep klapt dicht.'];
export const MAT_LINES = ['Op de deurmat. Dat is ook bezorgd.', 'Op de stoep, vlak bij de deur.', 'Bijna in de bus, maar de mat leest mee.'];
export const MIS_LINES = ['In de border. De buurman vindt hem wel.', 'Over de heg. Dat telt niet.', 'Op straat. De wind doet de rest.'];
export const TE_VER = ['Nog te ver weg voor een worp.', 'Dichterbij. Je gooit geen tien meter ver.'];
export const KLAAR_NETJES = ['Alles bezorgd.', 'Wijk gedaan.', 'Elke bus gehad.'];
export const GEEN_STAPEL = 'De stapel is op. Naar de volgende wijk.';

export const pickFrom = (arr, rand = Math.random) => arr[Math.floor(rand() * arr.length) % arr.length];

// Welke wijken komen in aanmerking: binnen `maxAfstand` van het kantoor, en dichtst bij eerst. De aanroeper levert de punten
// (map.meta.neighbourhoodPoints: { name, x, y }) en een functie die zegt of er water bij ligt.
export function kiesWijk(punten, vanaf, { maxAfstand = 1500, minAfstand = 250, vijver = null, rand = Math.random, uitgezonderd = [] } = {}) {
  const lijst = punten
    .filter((p) => p && p.name && Number.isFinite(p.x) && Number.isFinite(p.y) && !uitgezonderd.includes(p.name))
    .map((p) => ({ ...p, d: Math.hypot(p.x - vanaf.x, p.y - vanaf.y) }))
    .filter((p) => p.d >= minAfstand && p.d <= maxAfstand);
  if (!lijst.length) return null;
  if (vijver === true) { const w = lijst.filter((p) => p.vijver); if (w.length) return pickFrom(w, rand); }
  if (vijver === false) { const w = lijst.filter((p) => !p.vijver); if (w.length) return pickFrom(w, rand); }
  return pickFrom(lijst, rand);
}
