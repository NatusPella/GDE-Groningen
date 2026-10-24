// Machines van de boerderij (#415, stap 2): de trekkers, de maaidorser en de laadmachine uit de catalogus (percelen.js, verzonnen namen) die je
// kunt kopen of per speldag huren, met brandstof (diesel bijtanken op het erf of bij een pomp), slijtage en een onderhoudsbeurt, en een loonwerker die
// een klus voor je doet tegen betaling. Pure regels, geen DOM, geen THREE, geen opslag en geen klok (scripts/machines_test.mjs); de staat van elke
// machine zit op zijn regel in het machinepark van het bedrijf (bd.machinepark, percelen.js) en boerderijlive.js betaalt uit het geld van de speler.
//
// Tijd loopt in speluren (een speldag is 24 minuten). Altijd zomer: geen vorst die de motor niet start, geen modder die het werk stopt.

import { MACHINE_CATALOGUS, MAX_ACHTERSTAND, DAG_UREN, stal } from './percelen.js';

export const DIESEL_ERF = 1.6;               // euro per liter uit het dieselvat op je erf
export const DIESEL_POMP = 2.05;             // euro per liter bij de pomp (Pomp & Poets en andere pompen in de wereld)
export const VERKOOP_MACHINE = 0.6;          // wat je van de prijs terugkrijgt als je een gekochte machine of een werktuig verkoopt (nieuwstaat)
export const SLIJTAGE_KAPOT = 100;

// Per machinetype: tank (liter), verbruik (liter per speluur in rust, bij rijden en bij werk), slijtage per speluur (rijden en werk),
// topsnelheid (m/s) en de bijbehorende voertuigmodellen staan in vehicle.js (MACHINE_MODELLEN).
export const SPEC = {
  'trekker-klein': { tank: 90, verbruik: [1.5, 5, 9], slijt: [0.2, 0.8, 1.6], top: 9 },
  'trekker-groot': { tank: 160, verbruik: [2.5, 8, 14], slijt: [0.15, 0.6, 1.3], top: 11 },
  maaidorser: { tank: 320, verbruik: [4, 14, 26], slijt: [0.3, 1.0, 2.0], top: 7 },
  laadmachine: { tank: 70, verbruik: [1, 4, 7], slijt: [0.2, 0.7, 1.4], top: 7.5 },
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const alle = (bd) => [...bd.machinepark.machines, ...bd.machinepark.werktuigen];
export const vind = (bd, uid) => alle(bd).find((m) => m.uid === uid) || null;
export const catalogus = (m) => MACHINE_CATALOGUS[m.type];
export const isMachine = (m) => !!catalogus(m) && catalogus(m).soort === 'machine';

export const tankInhoud = (m) => (SPEC[m.type] ? SPEC[m.type].tank : 0);
export const brandstofPct = (m) => (tankInhoud(m) > 0 ? clamp((m.brandstof || 0) / tankInhoud(m), 0, 1) : 0);

// De staat van de slijtage in een woord, en wat die doet: boven 40% gaat de topsnelheid omlaag (tot -40%) en het verbruik omhoog (tot +50%).
export const staat = (m) => (m.slijtage >= SLIJTAGE_KAPOT ? 'kapot' : m.slijtage >= 85 ? 'versleten' : m.slijtage >= 60 ? 'matig' : m.slijtage >= 30 ? 'redelijk' : 'goed');
export const snelheidsFactor = (m) => (m.slijtage >= SLIJTAGE_KAPOT || !(m.brandstof > 0) ? 0 : 1 - 0.4 * clamp((m.slijtage - 40) / 60, 0, 1));
export const verbruikFactor = (m) => 1 + 0.5 * clamp((m.slijtage || 0) / 100, 0, 1);
export const topSnelheid = (m) => (SPEC[m.type] ? SPEC[m.type].top * snelheidsFactor(m) : 0);

// Kan de motor aan? { ok } of { ok: false, reden } (leeg, kapot).
export function kanStarten(m) {
  if (!m || !SPEC[m.type]) return { ok: false, reden: 'Dat is geen machine met een motor.' };
  if (m.slijtage >= SLIJTAGE_KAPOT) return { ok: false, reden: `${catalogus(m).naam} is versleten: eerst een onderhoudsbeurt.` };
  if (!(m.brandstof > 0)) return { ok: false, reden: `${catalogus(m).naam} staat zonder diesel: tank bij op het erf of bij een pomp.` };
  return { ok: true };
}

// Een stuk gebruik: uren speltijd, belasting 0 (stil), 1 (rijden) of 2 (werken met aftakas en werktuig). Verbruikt diesel en slijt. Geeft wat er gebeurde:
// { leeg: true } als de tank leeg raakte, { kapot: true } als hij versleten raakte.
export function draai(m, uren, belasting = 1) {
  const s = SPEC[m.type];
  if (!s || !(uren > 0)) return {};
  const b = clamp(Math.round(belasting), 0, 2);
  const lit = s.verbruik[b] * verbruikFactor(m) * uren;
  const voor = m.brandstof;
  m.brandstof = Math.max(0, Math.round((m.brandstof - lit) * 10) / 10);
  m.slijtage = Math.min(SLIJTAGE_KAPOT, Math.round((m.slijtage + s.slijt[b] * uren) * 100) / 100);
  m.uren = Math.round((m.uren + (b > 0 ? uren : 0)) * 100) / 100;
  return { leeg: voor > 0 && m.brandstof <= 0, kapot: m.slijtage >= SLIJTAGE_KAPOT, liter: voor - m.brandstof };
}

// Bijtanken: tot vol (of hooguit `maxLiter`, of wat je geld toelaat). plek: 'erf' (dieselvat, goedkoop) of 'pomp'. { ok, liter, kosten } of { ok: false, reden }.
export function tankBij(m, plek, geld = Infinity, maxLiter = Infinity) {
  const s = SPEC[m.type];
  if (!s) return { ok: false, reden: 'Dat is geen machine met een motor.' };
  const prijs = plek === 'pomp' ? DIESEL_POMP : DIESEL_ERF;
  const nodig = s.tank - m.brandstof;
  if (nodig < 0.5) return { ok: false, reden: 'De tank is al vol.' };
  const liter = Math.min(nodig, maxLiter, Math.floor((geld / prijs) * 10) / 10);
  if (!(liter >= 1)) return { ok: false, reden: `Je hebt €${Math.ceil(prijs)} per liter nodig voor diesel.` };
  const kosten = Math.round(liter * prijs);
  m.brandstof = Math.round(Math.min(s.tank, m.brandstof + liter) * 10) / 10;
  return { ok: true, liter: Math.round(liter * 10) / 10, kosten };
}

// De prijs van een volle tank, voor het scherm.
export const volleTankKosten = (m, plek) => Math.round(Math.max(0, tankInhoud(m) - (m.brandstof || 0)) * (plek === 'pomp' ? DIESEL_POMP : DIESEL_ERF));

// Een onderhoudsbeurt: slijtage terug naar nul. Kost een basisbedrag plus een deel van de nieuwprijs naar gelang de slijtage.
export function onderhoudKosten(m) {
  const c = catalogus(m);
  if (!c || !(m.slijtage > 1)) return 0;
  return Math.round((20 + c.koop * 0.02 * (m.slijtage / 100)) / 5) * 5;
}
export function onderhoud(m, geld) {
  const k = onderhoudKosten(m);
  if (!(k > 0)) return { ok: false, reden: 'Er is niets aan te doen: het is nog in goede staat.' };
  if (!(geld >= k)) return { ok: false, reden: `Een onderhoudsbeurt kost €${k}.` };
  m.slijtage = 0;
  return { ok: true, kosten: k };
}

// --- kopen en huren ------------------------------------------------------------------

// Uit de catalogus kopen of huren, op een erf van jou met een vrije plek. Een gehuurde machine betaal je per speldag vooruit (de eerste meteen).
// Een nieuwe machine is gespoeld, afgesteld en half vol (een gehuurde vol).
function neem(bd, type, erfId, geld, huur, nu) {
  const c = MACHINE_CATALOGUS[type];
  if (!c) return { ok: false, reden: 'Dat staat niet in de catalogus.' };
  if (!SPEC[type] && c.soort === 'machine') return { ok: false, reden: 'Dat is nog niet te koop.' };
  const prijs = huur ? c.huurDag : c.koop;
  if (!(geld >= prijs)) return { ok: false, reden: `Je hebt €${prijs} nodig.` };
  const r = stal(bd, type, erfId);
  if (!r.ok) return r;
  const m = vind(bd, r.uid);
  if (huur) { m.bezit = 'gehuurd'; m.sinds = nu; m.volgende = nu + DAG_UREN; m.achterstand = 0; }
  if (c.soort === 'machine') m.brandstof = huur ? tankInhoud(m) : Math.round(tankInhoud(m) / 2);
  return { ok: true, uid: r.uid, prijs, naam: c.naam };
}
export const koopUitCatalogus = (bd, type, erfId, geld) => { const r = neem(bd, type, erfId, geld, false, 0); if (r.ok) bd.totaal.gekocht += r.prijs; return r; };
export const huurUitCatalogus = (bd, type, erfId, nu, geld) => { const r = neem(bd, type, erfId, geld, true, nu); if (r.ok) bd.totaal.huur += r.prijs; return r; };

function weg(bd, uid) {
  for (const s of ['machines', 'werktuigen']) bd.machinepark[s] = bd.machinepark[s].filter((m) => m.uid !== uid);
}

// Een gehuurde machine terugbrengen (geen geld terug); een gekochte verkopen voor een deel van de prijs (minus slijtage).
export function terugOfVerkoop(bd, uid) {
  const m = vind(bd, uid);
  if (!m) return { ok: false, reden: 'Die machine heb je niet.' };
  const c = catalogus(m);
  if (m.bezit === 'gehuurd') { weg(bd, uid); return { ok: true, soort: 'terug', bedrag: 0, naam: c.naam }; }
  const bedrag = Math.round((c.koop * VERKOOP_MACHINE * (1 - 0.4 * clamp(m.slijtage / 100, 0, 1))) / 5) * 5;
  weg(bd, uid);
  bd.totaal.verkocht += bedrag;
  return { ok: true, soort: 'verkocht', bedrag, naam: c.naam };
}
export const verkoopWaarde = (m) => (m.bezit === 'gehuurd' ? 0 : Math.round((catalogus(m).koop * VERKOOP_MACHINE * (1 - 0.4 * clamp(m.slijtage / 100, 0, 1))) / 5) * 5);

// De huur loopt per speldag. Genoeg geld betaalt de dag; anders staat hij open (achterstand); bij MAX_ACHTERSTAND gaat de machine terug. Geeft de uitgave en de gebeurtenissen.
export function verwerkMachineHuur(bd, nu, geld = Infinity) {
  const events = [];
  let uitgave = 0, over = geld;
  for (const m of alle(bd)) {
    if (m.bezit !== 'gehuurd') continue;
    const c = catalogus(m);
    let n = 0;
    while (nu >= m.volgende && n++ < 60) {
      if (over >= c.huurDag) { over -= c.huurDag; uitgave += c.huurDag; bd.totaal.huur += c.huurDag; m.achterstand = 0; events.push({ type: 'betaald', uid: m.uid, naam: c.naam, bedrag: c.huurDag }); }
      else {
        m.achterstand++;
        events.push({ type: 'achterstand', uid: m.uid, naam: c.naam });
        if (m.achterstand >= MAX_ACHTERSTAND) { events.push({ type: 'terug', uid: m.uid, naam: c.naam }); bd.totaal.teruggegeven++; weg(bd, m.uid); break; }
      }
      m.volgende += DAG_UREN;
    }
  }
  return { uitgave, events };
}

export const huurPerDagMachines = (bd) => alle(bd).filter((m) => m.bezit === 'gehuurd').reduce((s, m) => s + catalogus(m).huurDag, 0);

// --- de loonwerker ---------------------------------------------------------------------

// De loonwerker (verzonnen: Loonbedrijf De Ploegschaar) doet een klus op je actieve perceel, met zijn eigen trekker, tegen een bedrag per hectare.
// Hij werkt netjes maar niet perfect. Het materiaal (zaaigoed, mest) en de diesel zijn voor jou.
export const LOONWERKER = { naam: 'Loonbedrijf De Ploegschaar', kwaliteit: 0.85 };
export const LOONWERK_HA = { ploegen: 95, cultiveren: 60, zaaien: 55, bemesten: 45, spuiten: 40, oogsten: 150 };
export const LOONWERK_AFLEVEREN = 0.06;      // aandeel van de opbrengst voor het wegbrengen van de lading

export function loonwerkKosten(taak, ha = 1.2) {
  const t = LOONWERK_HA[taak];
  return t ? Math.max(15, Math.round((t * ha) / 5) * 5) : 0;
}
export const loonwerkBestaat = (taak) => Object.prototype.hasOwnProperty.call(LOONWERK_HA, taak);
