// Eigen boerderij (#415): een perceel, gewassen die groeien in speltijd, werk in vaste stappen (ploegen, zaaien, bemesten, oogsten,
// afleveren), machines die je huurt of koopt, en een kasboekje. Pure regels, geen DOM, geen THREE, geen opslag en geen klok
// (scripts/boerderij_test.mjs); boerderijlive.js houdt de tijd bij en bewaart, sidejob_boerderij.js is het werk op het land.
//
// De kern is bewust klein: één perceel, twee gewassen (aardappelen en suikerbieten), drie machines (ploeg, zaai- en strooimachine,
// rooier). Het zomerseizoen is lang genoeg voor meerdere rondes; er is geen winter (constitution 3). Gewassen die de provincie nog
// meer kent (graan, uien, koolzaad, gras) en eggen, een veestapel en meer percelen zijn de uitbreiding (docs/BOERDERIJ.md).
// De boerderij is van de speler en leeft in zijn eigen opslag (gde-boerderij-v1), nooit in een savegame. Alle namen zijn verzonnen.

import { nieuwBedrijf, normaliseerBedrijf, actiefPerceel, bodemFactor } from './percelen.js';

export const VERSIE = 1;
export const MAX_UREN = 1e7;

// groeiUren: speluren tussen zaaien en rijp (een speldag is 24 minuten: 30 uur is ruim een halve speldag). kgBasis: opbrengst van het
// perceel (vier rijen van honderd meter) bij nette arbeid; prijsKg in euro. zaaigoed kost per keer zaaien.
export const GEWASSEN = {
  aardappelen: { naam: 'Aardappelen', zaaigoed: 40, groeiUren: 30, kgBasis: 1800, prijsKg: 0.22, afnemer: 'Coöperatie Noorderveld', jong: 0x5fa043, rijp: 0x8fb04a, vorm: 'struik' },
  bieten: { naam: 'Suikerbieten', zaaigoed: 30, groeiUren: 48, kgBasis: 4000, prijsKg: 0.10, afnemer: 'Suikerhal Hoogkerk', jong: 0x4a9a3c, rijp: 0x3d8a34, vorm: 'kegel' },
};
export const GEWAS_IDS = Object.keys(GEWASSEN);
export const STANDAARD_GEWAS = 'aardappelen';

// Eén machine hoort bij een of twee taken. huur: per keer werken; koop: eenmalig (daarna geen huur en een ruimere rij).
export const MACHINES = {
  ploeg: { naam: 'Ploeg', taken: ['ploegen'], huur: 15, koop: 300 },
  zaaimachine: { naam: 'Zaai- en strooimachine', taken: ['zaaien', 'bemesten'], huur: 10, koop: 250 },
  rooier: { naam: 'Rooier', taken: ['oogsten'], huur: 20, koop: 600 },
};
export const MACHINE_IDS = Object.keys(MACHINES);
export const machineVoor = (taak) => MACHINE_IDS.find((m) => MACHINES[m].taken.includes(taak)) || null;

// De taken: naam voor het scherm en wat ze kosten aan materiaal (bemesten kost mest; zaaien het zaaigoed van het gewas).
export const TAKEN = {
  ploegen: { naam: 'Ploegen', rijen: true, mest: 0 },
  zaaien: { naam: 'Zaaien', rijen: true, mest: 0 },
  bemesten: { naam: 'Bemesten', rijen: true, mest: 25 },
  oogsten: { naam: 'Oogsten', rijen: true, mest: 0 },
  afleveren: { naam: 'Afleveren', rijen: false, mest: 0 },
};
export const MEST_BONUS = 0.2;           // meeropbrengst bij een volledig bemest perceel
export const OPSLAG_VERLIES = 0.0;       // de schuur houdt alles vast; de kwaliteit verandert alleen op de weg

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const getal = (x, lo, hi, d = 0) => (Number.isFinite(x) ? clamp(x, lo, hi) : d);

export function nieuweBoerderij() {
  return {
    v: VERSIE, uren: 0, perceel: null, keuze: STANDAARD_GEWAS,
    veld: { fase: 'braak', gewas: null, bodem: 0, zaai: 0, mest: 0, gezaaidOp: null },
    schuur: { gewas: null, kg: 0, kwaliteit: 1 },
    machines: Object.fromEntries(MACHINE_IDS.map((m) => [m, 'huur'])),
    totaal: { oogsten: 0, leveringen: 0, omzet: 0, uitgaven: 0 },
    bedrijf: nieuwBedrijf(),                 // percelen, erven, opslag en machinepark (percelen.js, #415 stap 1): oude opslag mist dit en krijgt het leeg
  };
}

// Een boerderij uit opslag (of iets anders): leeg, oud of kapot geeft een geldige, onbekende velden gaan weg, getallen worden begrensd.
export function normaliseer(raw) {
  const b = nieuweBoerderij();
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  if (!d || typeof d !== 'object' || d.v !== VERSIE) return b;
  b.uren = getal(d.uren, 0, MAX_UREN);
  if (d.perceel && typeof d.perceel === 'object' && Number.isFinite(d.perceel.x) && Number.isFinite(d.perceel.y)) {
    b.perceel = { x: d.perceel.x, y: d.perceel.y, a: Number.isFinite(d.perceel.a) ? d.perceel.a : 0 };
  }
  if (GEWASSEN[d.keuze]) b.keuze = d.keuze;
  const v = d.veld;
  if (v && typeof v === 'object') {
    const fase = ['braak', 'geploegd', 'gezaaid', 'geoogst'].includes(v.fase) ? v.fase : 'braak';
    const gewas = GEWASSEN[v.gewas] ? v.gewas : null;
    // een gezaaid veld zonder gewas of zaaitijd is niets: terug naar braak
    if (fase === 'gezaaid' && (!gewas || !Number.isFinite(v.gezaaidOp))) b.veld = { ...b.veld };
    else b.veld = { fase, gewas: fase === 'braak' ? null : gewas, bodem: getal(v.bodem, 0, 1), zaai: getal(v.zaai, 0, 1), mest: getal(v.mest, 0, 1), gezaaidOp: fase === 'gezaaid' ? getal(v.gezaaidOp, 0, MAX_UREN) : null };
    if (fase === 'geoogst') b.veld = { fase: 'braak', gewas: null, bodem: 0, zaai: 0, mest: 0, gezaaidOp: null };
  }
  const s = d.schuur;
  if (s && typeof s === 'object' && GEWASSEN[s.gewas] && s.kg > 0) b.schuur = { gewas: s.gewas, kg: Math.round(getal(s.kg, 0, 1e6)), kwaliteit: getal(s.kwaliteit, 0, 1, 1) };
  if (d.machines && typeof d.machines === 'object') for (const m of MACHINE_IDS) if (d.machines[m] === 'eigen') b.machines[m] = 'eigen';
  if (d.totaal && typeof d.totaal === 'object') for (const k of Object.keys(b.totaal)) b.totaal[k] = Math.round(getal(d.totaal[k], 0, 1e9));
  b.bedrijf = normaliseerBedrijf(d.bedrijf);
  return b;
}

// --- groei -------------------------------------------------------------------

// Hoeveel van de groei is voorbij (0..1) voor een gezaaid veld, anders 0.
export function groei(b) {
  const v = b.veld;
  if (v.fase !== 'gezaaid' || !GEWASSEN[v.gewas]) return 0;
  return clamp((b.uren - v.gezaaidOp) / GEWASSEN[v.gewas].groeiUren, 0, 1);
}

// De toestand van het veld zoals de speler hem ziet: braak, geploegd, groeit, rijp of (na het oogsten) leeg.
export function fase(b) {
  const v = b.veld;
  if (v.fase === 'gezaaid') return groei(b) >= 1 ? 'rijp' : 'groeit';
  return v.fase;
}

// Speluren erbij (boerderijlive.js, uit de klok van het spel).
export function tikUren(b, uren) {
  if (Number.isFinite(uren) && uren > 0) b.uren = Math.min(MAX_UREN, b.uren + uren);
}

// Nog zoveel speluren tot het gewas rijp is (0 als het al rijp is of niets groeit).
export function urenTotRijp(b) {
  const v = b.veld;
  if (v.fase !== 'gezaaid') return 0;
  return Math.max(0, GEWASSEN[v.gewas].groeiUren - (b.uren - v.gezaaidOp));
}

// --- taken -------------------------------------------------------------------

// Wat kan er nu? { taak, verplicht } voor elke mogelijkheid, of een lege lijst als het gewas groeit en niets te doen valt.
// De eerste is de aanbevolen taak. Wachten is geen taak: wacht() zegt waarop.
export function opties(b) {
  const f = fase(b);
  const uit = [];
  // eerst de schuur leeg: een tweede oogst zou de eerste overschrijven
  if (b.schuur.kg > 0) uit.push({ taak: 'afleveren', verplicht: true });
  if (f === 'braak') uit.push({ taak: 'ploegen', verplicht: true });
  else if (f === 'geploegd') uit.push({ taak: 'zaaien', verplicht: true });
  else if (f === 'groeit' && b.veld.mest <= 0 && groei(b) < 0.85) uit.push({ taak: 'bemesten', verplicht: false });
  else if (f === 'rijp' && !(b.schuur.kg > 0)) uit.push({ taak: 'oogsten', verplicht: true });
  return uit;
}

export const wacht = (b) => (fase(b) === 'groeit' ? { wat: 'groeit', uren: urenTotRijp(b) } : null);

// De volgende taak zonder keuze: de eerste verplichte, anders de eerste mogelijke.
export function volgendeTaak(b) {
  const o = opties(b);
  return (o.find((x) => x.verplicht) || o[0] || {}).taak || null;
}

// Wat een taak nu kost: huur van de machine (niets als die van jou is), zaaigoed of mest.
export function kosten(b, taak, gewas = b.keuze) {
  const t = TAKEN[taak];
  if (!t) return { huur: 0, materiaal: 0, totaal: 0 };
  const m = machineVoor(taak);
  const huur = m && b.machines[m] !== 'eigen' ? MACHINES[m].huur : 0;
  const materiaal = taak === 'zaaien' ? (GEWASSEN[gewas] ? GEWASSEN[gewas].zaaigoed : 0) : t.mest;
  return { huur, materiaal, totaal: huur + materiaal };
}

// Is de taak nu toegestaan? { ok } of { ok: false, reden }.
export function magTaak(b, taak, geld = Infinity) {
  if (!TAKEN[taak]) return { ok: false, reden: 'Die taak bestaat niet.' };
  if (!opties(b).some((o) => o.taak === taak)) {
    const w = wacht(b);
    return { ok: false, reden: w ? `Het gewas groeit nog ${Math.ceil(w.uren)} uur.` : 'Dat kan nu niet.' };
  }
  const k = kosten(b, taak);
  if (k.totaal > geld) return { ok: false, reden: `Je hebt €${k.totaal} nodig.` };
  return { ok: true, kosten: k };
}

// De taak is gedaan: fractie 0..1 is hoe netjes het werk was. Verandert de boerderij; geeft wat er te melden valt.
// Betalen doet de aanroeper (boerderijlive.js) met kosten().
export function rondTaakAf(b, taak, fractie, { gewas = b.keuze } = {}) {
  const f = clamp(Number.isFinite(fractie) ? fractie : 0, 0, 1);
  const v = b.veld;
  const k = kosten(b, taak, gewas);
  b.totaal.uitgaven += k.totaal;
  if (taak === 'ploegen') { b.veld = { fase: 'geploegd', gewas: null, bodem: f, zaai: 0, mest: 0, gezaaidOp: null }; return { taak, fractie: f }; }
  if (taak === 'zaaien') {
    if (!GEWASSEN[gewas]) return { taak, fractie: 0 };
    b.veld = { fase: 'gezaaid', gewas, bodem: v.bodem, zaai: f, mest: 0, gezaaidOp: b.uren };
    return { taak, fractie: f, gewas };
  }
  if (taak === 'bemesten') { v.mest = f; return { taak, fractie: f }; }
  if (taak === 'oogsten') {
    const kg = opbrengstKg(b) * f;
    b.schuur = { gewas: v.gewas, kg: Math.round(kg), kwaliteit: 1 };
    b.veld = { fase: 'braak', gewas: null, bodem: 0, zaai: 0, mest: 0, gezaaidOp: null };
    b.totaal.oogsten++;
    return { taak, fractie: f, kg: b.schuur.kg, gewas: v.gewas };
  }
  return { taak, fractie: f };
}

// Wat het perceel nu zou opleveren als je het op dit moment oogstte (bij een perfecte oogst): afhankelijk van hoe goed er geploegd,
// gezaaid en bemest is, en van hoe ver de groei is.
export function opbrengstKg(b) {
  const v = b.veld;
  const g = GEWASSEN[v.gewas];
  if (!g) return 0;
  const bodem = 0.6 + 0.4 * v.bodem, zaai = 0.5 + 0.5 * v.zaai, mest = 1 + MEST_BONUS * v.mest;
  return g.kgBasis * bodem * zaai * mest * groei(b) * bodemFactor(actiefPerceel(b.bedrijf).bodem);
}

// Het afleveren: de lading wordt verkocht tegen de prijs van het gewas, met de kwaliteit die de rit overleefde (0..1). Geeft het
// bedrag voor de loonfactor van de loopbaan; de schuur is daarna leeg.
export function lever(b, kwaliteit) {
  const s = b.schuur;
  if (!(s.kg > 0) || !GEWASSEN[s.gewas]) return { bedrag: 0, kg: 0, gewas: null };
  const q = clamp(Number.isFinite(kwaliteit) ? kwaliteit : 0, 0, 1);
  const bedrag = Math.round(s.kg * GEWASSEN[s.gewas].prijsKg * q);
  const r = { bedrag, kg: s.kg, gewas: s.gewas, kwaliteit: q };
  b.schuur = { gewas: null, kg: 0, kwaliteit: 1 };
  b.totaal.leveringen++;
  b.totaal.omzet += bedrag;
  return r;
}

// Een machine kopen: daarna geen huur meer. { ok, prijs } of { ok: false, reden }.
export function koop(b, machine, geld) {
  const m = MACHINES[machine];
  if (!m) return { ok: false, reden: 'Die machine bestaat niet.' };
  if (b.machines[machine] === 'eigen') return { ok: false, reden: 'Die machine is al van jou.' };
  if (!(geld >= m.koop)) return { ok: false, reden: `Je hebt €${m.koop} nodig.` };
  b.machines[machine] = 'eigen';
  b.totaal.uitgaven += m.koop;
  return { ok: true, prijs: m.koop };
}

// Welk gewas bij het volgende zaaien (alleen een bekend gewas).
export function kiesGewas(b, gewas) {
  if (!GEWASSEN[gewas]) return false;
  b.keuze = gewas;
  return true;
}

// Een snelle blik voor het scherm en de tests.
export function samenvatting(b) {
  const f = fase(b);
  const o = opties(b);
  return {
    fase: f, gewas: b.veld.gewas, groei: groei(b), urenTotRijp: urenTotRijp(b), schuurKg: b.schuur.kg, schuurGewas: b.schuur.gewas,
    volgende: volgendeTaak(b), opties: o.map((x) => x.taak), eigen: MACHINE_IDS.filter((m) => b.machines[m] === 'eigen'),
    winst: b.totaal.omzet - b.totaal.uitgaven, ...b.totaal,
  };
}
