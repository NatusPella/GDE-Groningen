// Percelen en erven (#415, stap 1): akkers en weilanden die je kunt kopen of leasen, een erf (huis, schuur, silo, machineplek) als thuis,
// opslag van gewassen en machines op het erf, en een leeg machinepark voor stap 2 (machines en werktuigen). Pure regels, geen DOM,
// geen THREE, geen opslag en geen klok (scripts/percelen_test.mjs); het bedrijf zit in de boerderij van de speler (boerderij.js, opslag
// gde-boerderij-v1) en boerderijlive.js betaalt uit zijn geld. Alle namen en eigenaren zijn verzonnen; de ligging is een vaste lijst
// bij de plaatsen rond Hoogkerk (geen landgebruikskaart nodig), altijd zomer: huur en groei lopen in speltijd, per dag of week.
//
// Huren (leasen) betaal je vooruit per speldag of per week. Lukt een betaling niet, dan staat het bedrag als achterstand open;
// mis je twee periodes achter elkaar, dan gaat het perceel terug naar de verhuurder (en de erf-opslag verhuist naar je eigen erf).

export const VERSIE = 1;
import { pointInPolygon } from './util.js';
export const DAG_UREN = 24;                    // een speldag
export const PERIODE_UREN = { dag: DAG_UREN, week: 7 * DAG_UREN };
export const WEEK_KORTING = 0.85;              // een week vooruit betalen is goedkoper dan zeven losse dagen
export const MAX_ACHTERSTAND = 2;              // zoveel gemiste periodes en het perceel gaat terug
export const VERKOOP_FACTOR = 0.75;            // wat je terugkrijgt als je een gekocht perceel of erf weer verkoopt
const MAX_BETALINGEN = 60;                     // een lange slaap telt hooguit zoveel periodes in één keer

const rond5 = (x) => Math.max(5, Math.round(x / 5) * 5);

// Eén perceel: soort akker of weiland, ha, bodem 0..1 (zwak tot uitstekend), ligging in graden, aanbod koop, huur of beide.
const P = (id, naam, soort, plaats, lat, lon, ha, bodem, prijsHa, eigenaar, aanbod = 'beide') => {
  const koop = Math.round((ha * prijsHa) / 50) * 50;
  return { id, naam, soort, plaats, lat, lon, ha, bodem, koop, huurDag: rond5(koop * 0.012), eigenaar, aanbod };
};

export const START_PERCEEL = 'zonnehoek-akker';
export const PERCELEN = [
  // de akker van de bestaande Eigen boerderij: vanaf het begin van jou (de eerste), niet te koop en niet te huur
  { id: START_PERCEEL, naam: 'Akker De Zonnehoek', soort: 'akker', plaats: 'Hoogkerk', lat: 53.2336, lon: 6.4977, ha: 1.2, bodem: 0.75, koop: 0, huurDag: 0, eigenaar: 'Boerderij De Zonnehoek', aanbod: 'eigen' },
  P('wierdeakker', 'Wierdeakker', 'akker', 'Hoogkerk', 53.2392, 6.4881, 2.0, 0.8, 2300, 'Maatschap Wierdehoek'),
  P('kleistuk-noord', 'Kleistuk Noord', 'akker', 'Zuidhorn', 53.2468, 6.4044, 3.5, 0.9, 2300, 'Maatschap De Kleihoek'),
  P('dijkweide', 'Dijkweide', 'weiland', 'Zuidhorn', 53.2531, 6.3907, 2.5, 0.6, 1500, 'Veehouderij Dijkzicht', 'huur'),
  P('zandkamp', 'Zandkamp', 'akker', 'Zuidhorn', 53.2405, 6.4210, 1.8, 0.35, 2300, 'Familiebedrijf Zandkamp', 'koop'),
  P('winsumer-wei', 'Winsumer Wei', 'weiland', 'Winsum', 53.3312, 6.5218, 4.0, 0.7, 1500, 'Melkveebedrijf Het Riet'),
  P('hoge-akker', 'Hoge Akker', 'akker', 'Winsum', 53.3248, 6.5063, 5.0, 0.85, 2300, 'Maatschap Hogeland'),
  P('zuiderzijde', 'Zuiderzijde', 'akker', 'Hoogkerk', 53.2271, 6.5042, 1.5, 0.55, 2300, 'Landbouwbedrijf Zuiderzijde', 'huur'),
  P('bedumer-klei', 'Bedumer Klei', 'akker', 'Bedum', 53.3002, 6.6021, 3.0, 0.95, 2300, 'Maatschap Zwarte Klei'),
  P('sauwerd-weide', 'Sauwerd Weide', 'weiland', 'Sauwerd', 53.2915, 6.5612, 1.6, 0.5, 1500, 'Schapenhouderij De Hoek', 'koop'),
  P('reitdiep-weide', 'Reitdiepweide', 'weiland', 'Winsum', 53.3197, 6.4801, 3.2, 0.8, 1500, 'Stichting Reitdiepland', 'huur'),
  P('leekster-veld', 'Leekster Veld', 'akker', 'Leek', 53.1632, 6.3792, 4.5, 0.65, 2300, 'Akkerbouwbedrijf Veldzicht'),
];
export const PERCEEL_IDS = PERCELEN.map((p) => p.id);

// De schenking (bijbel 28-11 §2.2, #1373): hoeve Zeldenrust aan de Waddenkust tussen Warffum en Usquert. Oom Hindrik de Jong gaat naar Huize Waddenzicht
// en schenkt de hoeve aan jou; Tante Aaltje zet de akte klaar. Dit is geen aanbod: er valt niets te kopen of te huren (aanbod 'schenking'), en de lijst
// staat bewust los van PERCELEN en ERVEN, zodat het aanbod, de kaart en de tellers van de vaste twaalf percelen ongemoeid blijven en je Zeldenrust pas
// ziet als het van jou is. De ligging ligt tussen Warffum (53,3911 N; 6,5588 E) en Usquert (53,4025 N; 6,6118 E) uit game/borderplaces.json, richting de dijk.
const SCHENKING = { aanbod: 'schenking', koop: 0, huurDag: 0, eigenaar: 'Oom Hindrik de Jong', plaats: 'Warffum' };
export const SCHENK_ERF = 'zeldenrust';
export const SCHENK_PERCELEN = [
  { id: 'zeldenrust-akker', naam: 'Akker Zeldenrust', soort: 'akker', lat: 53.4105, lon: 6.5995, ha: 5.0, bodem: 0.9, ...SCHENKING },
  { id: 'zeldenrust-wei', naam: 'Weide Zeldenrust', soort: 'weiland', lat: 53.4165, lon: 6.5835, ha: 5.0, bodem: 0.85, ...SCHENKING },
];
export const SCHENK_PERCEEL_IDS = SCHENK_PERCELEN.map((p) => p.id);
export const SCHENK_ERVEN = [
  { id: SCHENK_ERF, naam: 'Hoeve Zeldenrust', plaats: 'Warffum', lat: 53.4135, lon: 6.5905, huis: true, schuur: true, silo: true, opslagKg: 9000, machinePlekken: 12, ...SCHENKING },
];
export const SCHENK_ERF_IDS = SCHENK_ERVEN.map((e) => e.id);

// Extra percelen uit Bezit (epic #1095, #1101): een gekocht perceel uit de index werkt als veld zoals de vaste twaalf. parcelfarm.js
// meldt zijn definitie hier aan (id 'p' + 12 hex), waarna perceelDef, normaliseerBedrijf en boerderij.js het id kennen. Een register
// in het geheugen: niets hiervan komt in een savegame; wat het bedrijf bewaart blijft een gewone { status, sinds }-regel per id.
const EXTRA_PERCELEN = new Map();
export const EXTRA_ID = /^p[0-9a-f]{12}$/;
export function registreerExtraPerceel(d) {
  if (!d || typeof d.id !== 'string' || !EXTRA_ID.test(d.id) || PERCEEL_IDS.includes(d.id)) return false;
  if (!(d.ha > 0) || !['akker', 'weiland', 'boomgaard'].includes(d.soort)) return false;
  EXTRA_PERCELEN.set(d.id, { koop: 0, huurDag: 0, eigenaar: 'Jijzelf', aanbod: 'eigen', plaats: '', bodem: 0.6, ...d });
  return true;
}
export const vergeetExtraPerceel = (id) => EXTRA_PERCELEN.delete(id);
export const wisExtraPercelen = () => EXTRA_PERCELEN.clear();
export const extraPerceelIds = () => [...EXTRA_PERCELEN.keys()];
export const isPerceelId = (id) => PERCEEL_IDS.includes(id) || SCHENK_PERCEEL_IDS.includes(id) || EXTRA_PERCELEN.has(id);
export const perceelDef = (id) => PERCELEN.find((p) => p.id === id) || SCHENK_PERCELEN.find((p) => p.id === id) || EXTRA_PERCELEN.get(id) || null;
export const isSchenking = (soort, id) => { const d = soort === 'erf' ? SCHENK_ERVEN.find((e) => e.id === id) : SCHENK_PERCELEN.find((p) => p.id === id); return !!d; };

// #1092: er is geen verzonnen rechthoek meer als perceelvlak (de schets-rechthoek, de klik erop en zijn schaal zijn weg): een perceelrand komt alleen uit
// echte kaartdata (bezit-vormen.json, de omtrek van de echte percelen), nooit uit hectares en een hoek per id.

// Een erf: huis, schuur, silo's en plekken voor machines. De Zonnehoek is de eerste en van jou; opslagKg is de ruimte voor gewassen.
const E = (id, naam, plaats, lat, lon, opslagKg, machinePlekken, prijs, eigenaar, aanbod = 'beide') => ({ id, naam, plaats, lat, lon, huis: true, schuur: true, silo: opslagKg >= 6000, opslagKg, machinePlekken, koop: prijs, huurDag: rond5(prijs * 0.0045), eigenaar, aanbod });
export const START_ERF = 'zonnehoek';
export const ERVEN = [
  { id: START_ERF, naam: 'Boerderij De Zonnehoek', plaats: 'Hoogkerk', lat: 53.2336, lon: 6.4977, huis: true, schuur: true, silo: false, opslagKg: 4000, machinePlekken: 10, koop: 0, huurDag: 0, eigenaar: 'Jijzelf', aanbod: 'eigen' },
  E('wierdehoeve', 'Wierdehoeve', 'Winsum', 53.3278, 6.5144, 9000, 12, 15000, 'Maatschap Hogeland'),
  E('kleiplaats', 'Kleiplaats', 'Zuidhorn', 53.2436, 6.4102, 6000, 8, 11000, 'Maatschap De Kleihoek'),
  E('weidehof', 'Weidehof', 'Sauwerd', 53.2898, 6.5589, 2500, 4, 5500, 'Schapenhouderij De Hoek', 'huur'),
];
export const ERF_IDS = ERVEN.map((e) => e.id);
export const erfDef = (id) => ERVEN.find((e) => e.id === id) || SCHENK_ERVEN.find((e) => e.id === id) || null;

// De catalogus van machines en werktuigen (stap 2): alleen gegevens. Verzonnen namen en vormen, geen echte merken.
export const MACHINE_CATALOGUS = {
  'trekker-klein': { naam: 'Wierdetrekker W60', soort: 'machine', type: 'trekker', pk: 60, koop: 9000, huurDag: 60 },
  'trekker-groot': { naam: 'Kleibijter K140', soort: 'machine', type: 'trekker', pk: 140, koop: 22000, huurDag: 130 },
  maaidorser: { naam: 'Korenwolf M3', soort: 'machine', type: 'maaidorser', pk: 220, koop: 38000, huurDag: 220 },
  laadmachine: { naam: 'Laadkabouter L45', soort: 'machine', type: 'laadmachine', pk: 45, koop: 14000, huurDag: 90 },
  'ploeg-3': { naam: 'Ploegbaas 3-schaar', soort: 'werktuig', type: 'ploeg', koop: 1800, huurDag: 20 },
  cultivator: { naam: 'Egaliseur 3m', soort: 'werktuig', type: 'cultivator', koop: 1500, huurDag: 15 },
  zaaimachine: { naam: 'Zaaiwagen Zaadhoek', soort: 'werktuig', type: 'zaaimachine', koop: 2200, huurDag: 20 },
  mestwaaier: { naam: 'Mestwaaier Stroomsel', soort: 'werktuig', type: 'mestverspreider', koop: 1700, huurDag: 15 },
  spuit: { naam: 'Veldspuit Nevelaar 12m', soort: 'werktuig', type: 'spuit', koop: 2600, huurDag: 25 },
  maaier: { naam: 'Maaibalk Zeisnel', soort: 'werktuig', type: 'maaier', koop: 2400, huurDag: 20 },
  balenpers: { naam: 'Balenpers Rolrond', soort: 'werktuig', type: 'balenpers', koop: 3800, huurDag: 30 },
  aanhanger: { naam: 'Kipwagen Kleidrager', soort: 'werktuig', type: 'aanhanger', koop: 2000, huurDag: 15 },
};
export const MACHINE_CATALOGUS_IDS = Object.keys(MACHINE_CATALOGUS);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const getal = (x, lo, hi, d = 0) => (Number.isFinite(x) ? clamp(x, lo, hi) : d);

// --- bodem ---------------------------------------------------------------------

// Bodemkwaliteit 0..1: 0.75 is de gewone grond van De Zonnehoek (factor 1). Zwakke grond geeft minder, kleigrond meer.
export const bodemFactor = (q) => clamp(1 + 0.8 * (getal(q, 0, 1, 0.75) - 0.75), 0.6, 1.2);
export const bodemNaam = (q) => (q < 0.45 ? 'zwak' : q < 0.65 ? 'matig' : q < 0.85 ? 'goed' : 'uitstekend');

// --- het bedrijf ---------------------------------------------------------------

const leeg = () => ({ status: 'gekocht', sinds: 0 });

// Een machine of werktuig op een erf (machines.js zet de rest): uid, type, erf en de staat: bezit (gekocht of gehuurd per dag), brandstof (liter),
// slijtage 0..100 en gedraaide uren. Onbekende velden gaan weg, getallen worden begrensd.
function normaliseerMachine(m, def) {
  const r = { uid: m.uid.slice(0, 40), type: m.type, erf: m.erf, bezit: m.bezit === 'gehuurd' ? 'gehuurd' : 'gekocht', sinds: getal(m.sinds, 0, 1e7) };
  if (r.bezit === 'gehuurd') { r.volgende = getal(m.volgende, 0, 1e7, r.sinds + DAG_UREN); r.achterstand = Math.round(getal(m.achterstand, 0, MAX_ACHTERSTAND)); }
  if (def.soort === 'machine') r.brandstof = Math.round(getal(m.brandstof, 0, 600, 40) * 10) / 10;
  r.slijtage = Math.round(getal(m.slijtage, 0, 100) * 10) / 10;
  r.uren = Math.round(getal(m.uren, 0, 1e6) * 10) / 10;
  return r;
}
export function nieuwBedrijf() {
  return {
    v: VERSIE,
    percelen: { [START_PERCEEL]: leeg() },
    erven: { [START_ERF]: leeg() },
    thuis: START_ERF,
    actief: START_PERCEEL,
    opslag: { [START_ERF]: {} },            // per erf: gewas -> kg
    machinepark: { machines: [], werktuigen: [] },   // stap 2: { uid, type, erf }
    totaal: { gekocht: 0, verkocht: 0, huur: 0, teruggegeven: 0 },
  };
}

function normaliseerBezit(x, nu) {
  if (!x || typeof x !== 'object') return null;
  const status = x.status === 'gehuurd' ? 'gehuurd' : 'gekocht';
  const r = { status, sinds: getal(x.sinds, 0, 1e7) };
  if (status === 'gehuurd') {
    r.betaling = x.betaling === 'week' ? 'week' : 'dag';
    r.volgende = getal(x.volgende, 0, 1e7, r.sinds + PERIODE_UREN[r.betaling]);
    r.schuld = Math.round(getal(x.schuld, 0, 1e7));
    r.achterstand = Math.round(getal(x.achterstand, 0, MAX_ACHTERSTAND));
  }
  return r;
}

// Een bedrijf uit opslag (of iets anders): ontbrekend, oud of kapot geeft een geldig bedrijf met De Zonnehoek als thuis.
export function normaliseerBedrijf(raw) {
  const b = nieuwBedrijf();
  if (!raw || typeof raw !== 'object' || raw.v !== VERSIE) return b;
  if (raw.percelen && typeof raw.percelen === 'object') for (const id of [...PERCEEL_IDS, ...SCHENK_PERCEEL_IDS, ...EXTRA_PERCELEN.keys()]) { if (id === START_PERCEEL) continue; const r = normaliseerBezit(raw.percelen[id]); if (r) b.percelen[id] = r; }
  if (raw.erven && typeof raw.erven === 'object') for (const id of [...ERF_IDS, ...SCHENK_ERF_IDS]) { if (id === START_ERF) continue; const r = normaliseerBezit(raw.erven[id]); if (r) b.erven[id] = r; }
  if (b.erven[raw.thuis]) b.thuis = raw.thuis;
  if (b.percelen[raw.actief]) b.actief = raw.actief;
  for (const id of Object.keys(b.erven)) b.opslag[id] = {};
  if (raw.opslag && typeof raw.opslag === 'object') {
    for (const id of Object.keys(b.erven)) {
      const o = raw.opslag[id];
      if (!o || typeof o !== 'object') continue;
      let vrij = erfDef(id).opslagKg;
      for (const g of Object.keys(o)) {
        if (!(Number.isFinite(o[g]) && o[g] > 0) || !/^[a-z]+$/.test(g)) continue;
        const kg = Math.min(Math.round(o[g]), vrij);
        if (kg > 0) { b.opslag[id][g] = kg; vrij -= kg; }
      }
    }
  }
  const mp = raw.machinepark;
  if (mp && typeof mp === 'object') {
    for (const soort of ['machines', 'werktuigen']) {
      if (!Array.isArray(mp[soort])) continue;
      for (const m of mp[soort].slice(0, 50)) {
        const def = m && MACHINE_CATALOGUS[m.type];
        if (!def || def.soort !== (soort === 'machines' ? 'machine' : 'werktuig') || typeof m.uid !== 'string' || !b.erven[m.erf]) continue;
        b.machinepark[soort].push(normaliseerMachine(m, def));
      }
    }
  }
  if (raw.totaal && typeof raw.totaal === 'object') for (const k of Object.keys(b.totaal)) b.totaal[k] = Math.round(getal(raw.totaal[k], 0, 1e9));
  return b;
}

// --- kopen, leasen, opzeggen -----------------------------------------------------

const def = (soort, id) => (soort === 'erf' ? erfDef(id) : perceelDef(id));
const bezit = (bd, soort) => (soort === 'erf' ? bd.erven : bd.percelen);
const naam = (d) => d.naam;
export const perceelOfErf = (soort, id) => def(soort, id) || { naam: id };

// Wat de verhuurder per periode vraagt (een week is goedkoper dan zeven dagen).
export const huurBedrag = (d, betaling) => (betaling === 'week' ? Math.round(d.huurDag * 7 * WEEK_KORTING) : d.huurDag);

// De stand van één perceel of erf voor deze speler: 'van-jou-gekocht', 'van-jou-gehuurd' of wat er aangeboden wordt.
export function stand(bd, soort, id) {
  const d = def(soort, id);
  if (!d) return null;
  const x = bezit(bd, soort)[id];
  if (x) return { ...x, def: d, van: 'jou', kunKopen: false, kunHuren: false };
  return { def: d, van: 'verhuurder', status: null, kunKopen: d.aanbod === 'koop' || d.aanbod === 'beide', kunHuren: d.aanbod === 'huur' || d.aanbod === 'beide' };
}

export function koop(bd, soort, id, geld) {
  const s = stand(bd, soort, id);
  if (!s) return { ok: false, reden: 'Dat bestaat niet.' };
  if (s.van === 'jou') return { ok: false, reden: `${naam(s.def)} is al van jou${s.status === 'gehuurd' ? ' (gehuurd): zeg de huur eerst op' : ''}.` };
  if (s.def.aanbod === 'schenking') return { ok: false, reden: `${naam(s.def)} is niet te koop: dat krijg je ten geschenke.` };
  if (!s.kunKopen) return { ok: false, reden: `${naam(s.def)} is alleen te huur.` };
  if (!(geld >= s.def.koop)) return { ok: false, reden: `Je hebt ${euro(s.def.koop)} nodig.` };
  bezit(bd, soort)[id] = { status: 'gekocht', sinds: 0 };
  if (soort === 'erf') bd.opslag[id] = {};
  bd.totaal.gekocht += s.def.koop;
  return { ok: true, prijs: s.def.koop };
}

// Leasen: de eerste periode betaal je meteen. betaling: 'dag' of 'week'; nu is de boerderijklok in speluren.
export function huur(bd, soort, id, betaling, nu, geld) {
  const s = stand(bd, soort, id);
  if (!s) return { ok: false, reden: 'Dat bestaat niet.' };
  if (betaling !== 'dag' && betaling !== 'week') return { ok: false, reden: 'Kies per dag of per week.' };
  if (s.van === 'jou') return { ok: false, reden: `${naam(s.def)} is al van jou.` };
  if (s.def.aanbod === 'schenking') return { ok: false, reden: `${naam(s.def)} is niet te huur: dat krijg je ten geschenke.` };
  if (!s.kunHuren) return { ok: false, reden: `${naam(s.def)} is alleen te koop.` };
  const bedrag = huurBedrag(s.def, betaling);
  if (!(geld >= bedrag)) return { ok: false, reden: `Je hebt ${euro(bedrag)} nodig voor de eerste ${betaling === 'week' ? 'week' : 'dag'}.` };
  const t = getal(nu, 0, 1e7);
  bezit(bd, soort)[id] = { status: 'gehuurd', sinds: t, betaling, volgende: t + PERIODE_UREN[betaling], schuld: 0, achterstand: 0 };
  if (soort === 'erf') bd.opslag[id] = {};
  bd.totaal.huur += bedrag;
  return { ok: true, bedrag };
}

// Wisselen tussen per dag en per week (de huidige periode blijft betaald).
export function wisselBetaling(bd, soort, id, betaling) {
  const x = bezit(bd, soort)[id];
  if (!x || x.status !== 'gehuurd' || (betaling !== 'dag' && betaling !== 'week')) return false;
  x.betaling = betaling;
  return true;
}

// Alles wat op een erf lag gaat mee naar je thuis als het erf weg is (voor zover er plek is); de rest blijft achter bij de verhuurder.
function ontruim(bd, id) {
  const thuis = bd.erven[START_ERF] ? START_ERF : null;
  const o = bd.opslag[id] || {};
  if (thuis && id !== thuis) for (const g of Object.keys(o)) bergOp(bd, thuis, g, o[g]);
  for (const soort of ['machines', 'werktuigen']) {
    for (const m of bd.machinepark[soort]) if (m.erf === id) { if (thuis && vrijePlekken(bd, thuis) > 0) m.erf = thuis; else m.erf = null; }
    bd.machinepark[soort] = bd.machinepark[soort].filter((m) => m.erf);
  }
  delete bd.opslag[id];
  if (bd.thuis === id) bd.thuis = START_ERF;
}

function laatLos(bd, soort, id) {
  delete bezit(bd, soort)[id];
  if (soort === 'erf') ontruim(bd, id);
  else if (bd.actief === id) bd.actief = START_PERCEEL;
}

// Opzeggen van een huur: de verhuurder krijgt het terug, je krijgt niets terug van wat je al betaald hebt, een schuld blijft niet hangen.
export function zegOp(bd, soort, id) {
  const x = bezit(bd, soort)[id];
  if (!x) return { ok: false, reden: 'Dat is niet van jou.' };
  if (def(soort, id) && def(soort, id).aanbod === 'schenking') return { ok: false, reden: 'Een schenking houd je: die zeg je niet op.' };
  if (x.status !== 'gehuurd') return { ok: false, reden: 'Dat is gekocht: verkoop het in plaats van opzeggen.' };
  laatLos(bd, soort, id);
  return { ok: true };
}

// Een gekocht perceel of erf weer verkopen (De Zonnehoek niet): je krijgt een deel van de prijs terug.
export function verkoop(bd, soort, id) {
  const x = bezit(bd, soort)[id];
  const d = def(soort, id);
  if (!x || !d) return { ok: false, reden: 'Dat is niet van jou.' };
  if (id === START_ERF || id === START_PERCEEL) return { ok: false, reden: 'De Zonnehoek blijft van jou.' };
  if (d.aanbod === 'schenking') return { ok: false, reden: `${naam(d)} is een schenking van Oom Hindrik: dat verkoop je niet.` };
  if (x.status !== 'gekocht') return { ok: false, reden: 'Dat is gehuurd: zeg het op.' };
  const opbrengst = Math.round(d.koop * VERKOOP_FACTOR);
  laatLos(bd, soort, id);
  bd.totaal.verkocht += opbrengst;
  return { ok: true, opbrengst };
}

// De huur loopt in speltijd. Per verlopen periode: genoeg geld (met een eventuele schuld) betaalt alles, anders komt er een periode
// achterstand bij; bij MAX_ACHTERSTAND is het perceel (of erf) terug bij de verhuurder. Geeft wat er van het geld af moet en wat er gebeurde.
// Niets verschuldigd (elk beeld de gewone stand): één gedeeld, bevroren antwoord, zodat de aanroep geen objecten of arrays maakt.
const GEEN_HUUR = Object.freeze({ uitgave: 0, events: Object.freeze([]) });
const HUUR_SOORTEN = ['perceel', 'erf'];
export function verwerkHuur(bd, nu, geld = Infinity) {
  let events = null;
  let uitgave = 0;
  let over = geld;
  for (const soort of HUUR_SOORTEN) {
    const m = bezit(bd, soort);
    for (const id in m) {
      let x = m[id];
      if (x.status !== 'gehuurd' || nu < x.volgende) continue;
      const d = def(soort, id);
      let n = 0;
      while (x && nu >= x.volgende && n++ < MAX_BETALINGEN) {
        const bedrag = huurBedrag(d, x.betaling);
        const totaal = x.schuld + bedrag;
        if (!events) events = [];
        if (over >= totaal) {
          over -= totaal; uitgave += totaal; bd.totaal.huur += totaal;
          events.push({ type: 'betaald', soort, id, bedrag: totaal });
          x.schuld = 0; x.achterstand = 0;
        } else {
          x.schuld += bedrag; x.achterstand++;
          events.push({ type: 'achterstand', soort, id, schuld: x.schuld });
          if (x.achterstand >= MAX_ACHTERSTAND) {
            events.push({ type: 'terug', soort, id });
            bd.totaal.teruggegeven++;
            laatLos(bd, soort, id);
            x = null;
            break;
          }
        }
        if (x) x.volgende += PERIODE_UREN[x.betaling];
      }
    }
  }
  return events ? { uitgave, events } : GEEN_HUUR;
}

// Een openstaande schuld nu zelf betalen (houdt het perceel).
export function betaalSchuld(bd, soort, id, geld) {
  const x = bezit(bd, soort)[id];
  if (!x || x.status !== 'gehuurd' || !(x.schuld > 0)) return { ok: false, reden: 'Er staat niets open.' };
  if (!(geld >= x.schuld)) return { ok: false, reden: `Je hebt ${euro(x.schuld)} nodig.` };
  const bedrag = x.schuld;
  x.schuld = 0; x.achterstand = 0;
  bd.totaal.huur += bedrag;
  return { ok: true, bedrag };
}

// --- de schenking van Zeldenrust (#1373) -----------------------------------------------------------------------

// Het erf en de percelen van Zeldenrust erbij schrijven. Alleen bijschrijven: wat je al had (percelen, opslag, machines, thuis, actief perceel) blijft
// onaangeroerd, en een tweede keer doet niets (feedbackles #1293, #1295: een schenking mag een bestaande boerderij nooit overschrijven). Je thuis blijft
// De Zonnehoek tot je zelf een ander erf kiest. Geeft { ok, nieuw: [{ soort, id }] } of { ok: false, reden } als alles er al is.
export function schenk(bd) {
  const nieuw = [];
  for (const e of SCHENK_ERVEN) if (!bd.erven[e.id]) { bd.erven[e.id] = { status: 'gekocht', sinds: 0 }; bd.opslag[e.id] = bd.opslag[e.id] || {}; nieuw.push({ soort: 'erf', id: e.id }); }
  for (const p of SCHENK_PERCELEN) if (!bd.percelen[p.id]) { bd.percelen[p.id] = { status: 'gekocht', sinds: 0 }; nieuw.push({ soort: 'perceel', id: p.id }); }
  return nieuw.length ? { ok: true, nieuw } : { ok: false, reden: 'Hoeve Zeldenrust is al van jou.' };
}
export const heeftHoeve = (bd) => !!(bd && bd.erven && bd.erven[SCHENK_ERF]);

// --- thuis en actief perceel ---------------------------------------------------------

export function zetThuis(bd, erfId) {
  if (!bd.erven[erfId]) return false;
  bd.thuis = erfId;
  return true;
}

// Het perceel waarop de boerderij werkt (de opbrengst hangt aan zijn bodem en grootte; op een weiland teel je gras). Alleen een perceel dat van jou (of gehuurd) is.
export function zetActief(bd, id) {
  const d = perceelDef(id);
  if (!d || !bd.percelen[id]) return false;
  bd.actief = id;
  return true;
}
export const actiefPerceel = (bd) => perceelDef(bd.actief) || perceelDef(START_PERCEEL);

// --- lasten en overzicht ------------------------------------------------------------------

// Wat de huur je per speldag kost (alle gehuurde percelen en erven, op dagbasis) en wat er openstaat.
export function huurPerDag(bd) {
  let som = 0;
  for (const soort of ['perceel', 'erf']) for (const [id, x] of Object.entries(bezit(bd, soort))) if (x.status === 'gehuurd') som += huurBedrag(def(soort, id), x.betaling) / (PERIODE_UREN[x.betaling] / DAG_UREN);
  return Math.round(som);
}
export function openSchuld(bd) {
  let som = 0;
  for (const soort of ['perceel', 'erf']) for (const x of Object.values(bezit(bd, soort))) if (x.status === 'gehuurd') som += x.schuld || 0;
  return som;
}
export const totaalHa = (bd) => Math.round(Object.keys(bd.percelen).reduce((s, id) => s + perceelDef(id).ha, 0) * 10) / 10;

// --- opslag op het erf ---------------------------------------------------------------------

export const opslagGebruikt = (bd, erfId) => Object.values(bd.opslag[erfId] || {}).reduce((s, v) => s + v, 0);
export const opslagVrij = (bd, erfId) => (erfDef(erfId) && bd.erven[erfId] ? Math.max(0, erfDef(erfId).opslagKg - opslagGebruikt(bd, erfId)) : 0);

// Gewas (kg) op een erf leggen: wat past gaat erin. { ok, kg } met kg wat er echt in ging.
export function bergOp(bd, erfId, gewas, kg) {
  if (!bd.erven[erfId]) return { ok: false, kg: 0, reden: 'Dat erf is niet van jou.' };
  if (!/^[a-z]+$/.test(String(gewas)) || !(kg > 0)) return { ok: false, kg: 0, reden: 'Er is niets om op te bergen.' };
  const nu = Math.min(Math.round(kg), opslagVrij(bd, erfId));
  if (nu <= 0) return { ok: false, kg: 0, reden: 'De opslag is vol.' };
  const o = bd.opslag[erfId] || (bd.opslag[erfId] = {});
  o[gewas] = (o[gewas] || 0) + nu;
  return { ok: true, kg: nu };
}

// Gewas uit de opslag halen (hooguit wat er ligt).
export function haalUit(bd, erfId, gewas, kg) {
  const o = bd.opslag[erfId];
  if (!o || !(o[gewas] > 0) || !(kg > 0)) return { ok: false, kg: 0, reden: 'Daar ligt dat niet.' };
  const nu = Math.min(Math.round(kg), o[gewas]);
  o[gewas] -= nu;
  if (o[gewas] <= 0) delete o[gewas];
  return { ok: true, kg: nu };
}

// --- machinepark (stap 2: gegevens en plekken, nog geen kopen) -------------------------------

export const machinesOp = (bd, erfId) => ['machines', 'werktuigen'].flatMap((s) => bd.machinepark[s]).filter((m) => m.erf === erfId);
export const vrijePlekken = (bd, erfId) => (erfDef(erfId) && bd.erven[erfId] ? Math.max(0, erfDef(erfId).machinePlekken - machinesOp(bd, erfId).length) : 0);

// Een machine of werktuig uit de catalogus op een erf zetten (stap 2 zet hier het kopen en huren voor). { ok, uid } of { ok: false, reden }.
export function stal(bd, type, erfId, uid) {
  const c = MACHINE_CATALOGUS[type];
  if (!c) return { ok: false, reden: 'Dat bestaat niet.' };
  if (!bd.erven[erfId]) return { ok: false, reden: 'Dat erf is niet van jou.' };
  if (vrijePlekken(bd, erfId) <= 0) return { ok: false, reden: 'Er is geen plek meer op het erf.' };
  const id = uid || `${type}-${bd.machinepark.machines.length + bd.machinepark.werktuigen.length + 1}`;
  bd.machinepark[c.soort === 'machine' ? 'machines' : 'werktuigen'].push(normaliseerMachine({ uid: id, type, erf: erfId, bezit: 'gekocht', sinds: 0 }, c));
  return { ok: true, uid: id };
}

// Een machine naar een ander erf van jou.
export function verplaats(bd, uid, erfId) {
  const m = ['machines', 'werktuigen'].flatMap((s) => bd.machinepark[s]).find((x) => x.uid === uid);
  if (!m) return { ok: false, reden: 'Die machine heb je niet.' };
  if (!bd.erven[erfId]) return { ok: false, reden: 'Dat erf is niet van jou.' };
  if (m.erf !== erfId && vrijePlekken(bd, erfId) <= 0) return { ok: false, reden: 'Er is geen plek meer op het erf.' };
  m.erf = erfId;
  return { ok: true };
}

// --- aanbod en kaart ---------------------------------------------------------------------------

// Alle percelen met hun stand voor deze speler, voor het scherm en de kaartlaag.
// De vaste percelen plus de geschonken percelen die van jou zijn (zonder schenking is de lijst precies PERCELEN).
export const perceelLijst = (bd) => (bd && bd.percelen ? PERCELEN.concat(SCHENK_PERCELEN.filter((p) => bd.percelen[p.id])) : PERCELEN);
export function overzichtPercelen(bd) {
  return perceelLijst(bd).map((p) => ({ ...stand(bd, 'perceel', p.id), id: p.id }));
}
export function overzichtErven(bd) {
  return ERVEN.concat(SCHENK_ERVEN.filter((e) => bd.erven[e.id])).map((e) => ({ ...stand(bd, 'erf', e.id), id: e.id }));
}

// Een label voor de kaartlaag Percelen: 'perceel-eigen', 'perceel-koop' (te koop, of koop en huur) of 'perceel-huur' (alleen te huur).
export function kaartSoort(s) {
  if (s.van === 'jou') return 'perceel-eigen';
  return s.kunKopen ? 'perceel-koop' : 'perceel-huur';
}

export const euro = (n) => `€${Math.round(n).toLocaleString('nl-NL')}`;
export function kaartOnderschrift(s) {
  const d = s.def;
  const basis = `${d.soort === 'akker' ? 'Akker' : d.soort === 'boomgaard' ? 'Boomgaard' : 'Weiland'}, ${String(d.ha).replace('.', ',')} ha, bodem ${bodemNaam(d.bodem)}`;
  if (s.van === 'jou') return `${basis} · van jou${s.status === 'gehuurd' ? ' (gehuurd)' : ''}`;
  const aanbod = [s.kunKopen ? `te koop ${euro(d.koop)}` : null, s.kunHuren ? `te huur ${euro(d.huurDag)} per dag` : null].filter(Boolean).join(', ');
  return `${basis} · ${aanbod} · ${d.eigenaar}`;
}
