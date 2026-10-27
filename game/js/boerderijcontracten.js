// Leveringscontracten op de boerderij (#492): per speldag een vast aanbod per gewas, bovenop de dagmarkt van gewasmarkt.js.
// Je neemt een contract aan, levert de gevraagde kilo's bij de gewone verkoop of aflevering, en een afgerond contract betaalt
// een bonus. Verlopen kost niets. Puur: geen DOM, geen THREE, geen klok, geen opslag en geen Math.random
// (scripts/boerderijcontracten_test.mjs). De dag komt uit de boerderijstand (dagVan op b.uren, boerderijlive.js), nooit uit de
// muurklok, en het aanbod uit de dag en het boerderijzaad, zodat elke speler zijn eigen boerderij en zijn eigen aanbod heeft.
//
// De bonus is per kilo bovenop de dagprijs van de verkoop; het totaal staat als vast bedrag in het contract, zodat een
// deellevering niets uitkeert en een afgerond contract precies één keer betaalt (boerderijlive.js doet de uitbetaling via
// loopbaanVerdien, nooit world.money +=). Dit bestand importeert alleen de basisprijzen (gewasmarkt.js); boerderij.js
// importeert dit bestand en niet andersom (scripts/import_cycles_test.mjs).
import { PRIJS_KG } from './gewasmarkt.js';

export const GEWAS_IDS = ['aardappelen', 'bieten', 'graan', 'gras', 'uien'];
export const MAX_ACTIEF = 3;          // meer dan drie contracten tegelijk is te veel om waar te maken
export const MAX_HISTORIE = 12;       // de afgeronde en verlopen contracten die bewaard blijven
export const ZAAD = 0x5eed;           // het boerderijzaad als de stand er nog geen heeft
export const MIN_UREN = 48;           // de kortste uiterste tijd na aannemen (twee speldagen)
export const MAX_UREN = 120;          // de langste (vijf speldagen)
const MAX_KG = 1e6;

// Hoeveel kilo een contract per gewas vraagt: een flink deel van een goede oogst, nooit meer dan het hele perceel.
// Dit is de maat van het contract en niet de opbrengst van het land (die staat in GEWASSEN.kgBasis, boerderij.js).
const KG_RONDE = {
  aardappelen: [600, 1400],
  bieten: [1200, 3000],
  graan: [800, 2000],
  gras: [1500, 3800],
  uien: [800, 2000],
};
const MARGE_MIN = 0.12;               // de bonus per kilo ligt twaalf tot dertig procent boven de basisprijs
const MARGE_MAX = 0.30;

const alsDag = (x) => Math.max(0, Math.floor(Number.isFinite(x) ? x : 0));
const alsZaad = (x) => (Number.isFinite(x) ? Math.floor(Math.abs(x)) % 0x7fffffff : ZAAD);
const alsUren = (x) => Math.max(0, Number.isFinite(x) ? x : 0);
const centen = (x) => Math.round(x * 100) / 100;
const getal = (x, lo, hi, d = 0) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);

// Een stabiele ruis van 0 tot 1 uit gewas, dag, boerderijzaad en een zout: dezelfde boerderij op dezelfde dag krijgt
// altijd hetzelfde aanbod, ook na een herstart, en een andere dag of een andere boerderij geeft andere contracten.
const meng = (h) => {
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
};
function tekstHash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return h >>> 0; }
function ruis(gewas, dag, zaad, zout) {
  let h = tekstHash(String(gewas));
  h = meng(h ^ Math.imul(dag + 1, 0x9e3779b1));
  h = meng(h ^ Math.imul(zaad + 1, 0x85ebca6b));
  h = meng(h ^ Math.imul(zout + 1, 0xc2b2ae35));
  return h / 4294967296;
}

// Het aanbod van een speldag: per gewas één contract. kg is een ronde vracht uit een flink deel van de oogst, de uiterste
// tijd loopt mee met de grootte (een grote vracht krijgt meer tijd), en de bonus per kilo schommelt met de dag.
export function aanbod(dag, zaad = ZAAD) {
  const d = alsDag(dag), z = alsZaad(zaad);
  return GEWAS_IDS.map((gewas) => {
    const [lo, hi] = KG_RONDE[gewas];
    const deel = ruis(gewas, d, z, 0);
    const kg = Math.round((lo + (hi - lo) * deel) / 10) * 10;
    const uren = MIN_UREN + Math.round((MAX_UREN - MIN_UREN) * deel);
    const marge = MARGE_MIN + (MARGE_MAX - MARGE_MIN) * ruis(gewas, d, z, 1);
    const bonusPerKg = Math.max(0.01, centen(PRIJS_KG[gewas] * marge));
    return { id: `contract-${d}-${gewas}`, gewas, kg, deadlineUren: uren, bonusPerKg, bonus: Math.round(kg * bonusPerKg) };
  });
}

// Een lege stand met het aanbod van die dag.
export function leeg(zaad = ZAAD, dag = 0) {
  const z = alsZaad(zaad), d = alsDag(dag);
  return { zaad: z, dag: d, aanbod: aanbod(d, z), actief: [], historie: [] };
}

// Een nieuwe speldag: een nieuw aanbod, de lopende contracten en de historie blijven staan. Geeft true als de dag wisselde.
export function ververs(state, dag) {
  if (!state || typeof state !== 'object') return false;
  const d = alsDag(dag);
  if (state.dag === d && Array.isArray(state.aanbod) && state.aanbod.length) return false;
  state.dag = d;
  state.aanbod = aanbod(d, alsZaad(state.zaad));
  return true;
}

// Het aanbod dat nog niet aangenomen, afgerond of verlopen is (voor het scherm).
export function openAanbod(state) {
  if (!state || !Array.isArray(state.aanbod)) return [];
  return state.aanbod.filter((a) => !heeftContract(state, a.id));
}

export const heeftContract = (state, id) => !!state && ((state.actief || []).some((c) => c.id === id) || (state.historie || []).some((c) => c.id === id));

// Een contract aannemen: de uiterste tijd begint nu te lopen (speluren van de boerderij). { ok, contract } of { ok: false, reden }.
// Hetzelfde contract tweemaal aannemen kan niet (anders zou de bonus twee keer te halen zijn).
export function neemAan(state, id, uren) {
  if (!state || !Array.isArray(state.aanbod)) return { ok: false, reden: 'Er is vandaag geen aanbod.' };
  const a = state.aanbod.find((x) => x.id === id);
  if (!a) return { ok: false, reden: 'Dat contract staat er niet (meer).' };
  if (!Array.isArray(state.actief)) state.actief = [];
  if (state.actief.some((c) => c.id === id)) return { ok: false, reden: 'Dat contract loopt al.' };
  if (heeftContract(state, id)) return { ok: false, reden: 'Dat contract is al gedaan of verlopen.' };
  if (state.actief.length >= MAX_ACTIEF) return { ok: false, reden: `Je hebt al ${MAX_ACTIEF} contracten lopen.` };
  const nu = alsUren(uren);
  const c = { id: a.id, gewas: a.gewas, kg: a.kg, geleverd: 0, bonus: a.bonus, bonusPerKg: a.bonusPerKg, aangenomen: nu, deadline: nu + a.deadlineUren };
  state.actief.push(c);
  return { ok: true, contract: { ...c } };
}

// De historie begrenzen: de oudste posting valt eraf.
function bewaar(state, c) {
  if (!Array.isArray(state.historie)) state.historie = [];
  state.historie.push(c);
  while (state.historie.length > MAX_HISTORIE) state.historie.shift();
}

// De klok tikt: contracten waarvan de uiterste tijd voorbij is gaan naar de historie. Kost niets, geen boete.
// Geeft de verlopen contracten terug.
export function verval(state, uren) {
  const verlopen = [];
  if (!state || !Array.isArray(state.actief)) return { verlopen };
  const nu = alsUren(uren);
  const blijft = [];
  for (const c of state.actief) {
    if (c.deadline <= nu) verlopen.push({ ...c, resultaat: 'verlopen' }); else blijft.push(c);
  }
  state.actief = blijft;
  for (const c of verlopen) bewaar(state, c);
  return { verlopen };
}

// Een verkoop of aflevering van dit gewas: de kilo's tellen mee voor de actieve contracten van dat gewas, oudste
// uiterste tijd eerst en hooguit tot de vracht vol is. Een deellevering telt in kg, een vol contract betaalt zijn bonus
// en gaat naar de historie (en kan daarna niet nog eens betalen). Levert niets bij een onbekend gewas, geen kg of geen
// passend contract. Geeft { gewas, kg, bonus, per, afgerond }.
export function lever(state, gewas, kg, uren) {
  const uit = { gewas, kg: 0, bonus: 0, per: [], afgerond: [] };
  const n = getal(kg, 0, MAX_KG, 0);
  if (!state || !Array.isArray(state.actief) || !(n > 0) || !GEWAS_IDS.includes(gewas)) return uit;
  const nu = alsUren(uren);
  const kandidaten = state.actief
    .filter((c) => c.gewas === gewas && c.deadline > nu && c.geleverd < c.kg)
    .sort((a, b) => a.deadline - b.deadline || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let rest = n;
  const klaar = [];
  for (const c of kandidaten) {
    if (!(rest > 0)) break;
    const nodig = Math.max(0, c.kg - c.geleverd);
    if (!(nodig > 0)) continue;
    const deel = Math.min(nodig, rest);
    c.geleverd += deel; rest -= deel; uit.kg += deel;
    const af = c.geleverd >= c.kg;
    uit.per.push({ id: c.id, gewas, kg: deel, geleverd: c.geleverd, nodig: c.kg, klaar: af });
    if (af) klaar.push(c);
  }
  if (klaar.length) {
    state.actief = state.actief.filter((c) => !klaar.includes(c));
    for (const c of klaar) {
      const af = { ...c, resultaat: 'klaar', afgerondOp: nu };
      bewaar(state, af);
      uit.afgerond.push(af);
      uit.bonus += c.bonus;
    }
  }
  return uit;
}

// Hoeveel uur er nog over is voor een contract (0 als de tijd om is).
export const resterend = (c, uren) => (c ? Math.max(0, Math.ceil(c.deadline - alsUren(uren))) : 0);

// Een contract uit opslag: alleen een compleet en logisch contract telt mee; de rest valt weg. Een historiepost houdt
// zijn resultaat (klaar of verlopen).
function leesContract(raw, historie = false) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 64) return null;
  if (!GEWAS_IDS.includes(raw.gewas)) return null;
  const kg = getal(raw.kg, 0, MAX_KG, 0);
  if (!(kg > 0)) return null;
  const bonus = Math.round(getal(raw.bonus, 0, 1e9, 0));
  const c = {
    id: raw.id, gewas: raw.gewas, kg, geleverd: getal(raw.geleverd, 0, kg, 0),
    bonus, bonusPerKg: centen(getal(raw.bonusPerKg, 0, 100, 0)),
    aangenomen: getal(raw.aangenomen, 0, 1e7, 0), deadline: getal(raw.deadline, 0, 1e7, 0),
  };
  if (historie) {
    c.resultaat = raw.resultaat === 'klaar' ? 'klaar' : 'verlopen';
    c.afgerondOp = getal(raw.afgerondOp, 0, 1e7, 0);
  }
  return c;
}

// Een stand uit opslag (of iets anders): leeg, oud of kapot geeft een geldige stand met het aanbod van deze dag. Het
// aanbod wordt uit de dag en het zaad opnieuw gemaakt, zodat een bewaarde lijst nooit een dubbel contract kan opleveren.
// De dubbele normalisatie is stabiel (heen en terug geeft hetzelfde).
export function normaliseer(raw, dag = 0) {
  const d = alsDag(dag);
  let x = raw;
  if (typeof x === 'string') { try { x = JSON.parse(x); } catch (e) { x = null; } }
  if (!x || typeof x !== 'object') return leeg(ZAAD, d);
  const s = leeg(alsZaad(x.zaad), d);
  const ids = new Set();
  if (Array.isArray(x.actief)) {
    for (const r of x.actief) {
      const c = leesContract(r);
      if (!c || ids.has(c.id) || s.actief.length >= MAX_ACTIEF) continue;
      ids.add(c.id); s.actief.push(c);
    }
  }
  if (Array.isArray(x.historie)) {
    for (const r of x.historie) {
      const c = leesContract(r, true);
      if (!c || ids.has(c.id)) continue;
      ids.add(c.id); s.historie.push(c);
    }
  }
  s.historie = s.historie.slice(-MAX_HISTORIE);
  return s;
}
