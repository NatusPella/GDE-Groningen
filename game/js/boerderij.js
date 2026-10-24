// Eigen boerderij (#415): percelen met gewassen die groeien in speltijd, werk in vaste stappen (ploegen, cultiveren, zaaien, bemesten, spuiten,
// oogsten, afleveren), machines die je huurt of koopt, en een kasboek met een boekjaar en een lening. Pure regels, geen DOM, geen THREE, geen
// opslag en geen klok (scripts/boerderij_test.mjs); boerderijlive.js houdt de tijd bij en bewaart, sidejob_boerderij.js is het werk op het land
// als loonwerk, en machines.js, werktuigen.js en boerderijwereld.js zijn het werk met je eigen trekker en werktuigen.
//
// De kern is bewust klein: vier gewassen (aardappelen, suikerbieten, graan en op weiland gras), drie bijbaanmachines (ploeg, zaai- en strooimachine,
// rooier). Cultiveren en spuiten zijn vrije klussen (`vrij`): alleen met je eigen trekker en werktuig, niet in de bijbaan. Het zomerseizoen is
// lang genoeg voor meerdere rondes; er is geen winter (constitution 3). Eggen, uien en koolzaad zijn de uitbreiding (docs/BOERDERIJ.md).
// De boerderij is van de speler en leeft in zijn eigen opslag (gde-boerderij-v1), nooit in een savegame. Alle namen zijn verzonnen.

import { nieuwBedrijf, normaliseerBedrijf, actiefPerceel, bodemFactor, START_PERCEEL, PERCEEL_IDS } from './percelen.js';

export const VERSIE = 1;
export const MAX_UREN = 1e7;

// groeiUren: speluren tussen zaaien en rijp (een speldag is 24 minuten: 30 uur is ruim een halve speldag). kgBasis: opbrengst van het
// perceel (vier rijen van honderd meter) bij nette arbeid; prijsKg in euro. zaaigoed kost per keer zaaien. soort: akker of weiland.
export const GEWASSEN = {
  aardappelen: { naam: 'Aardappelen', zaaigoed: 40, groeiUren: 30, kgBasis: 1800, prijsKg: 0.22, afnemer: 'Coöperatie Noorderveld', jong: 0x5fa043, rijp: 0x8fb04a, vorm: 'struik', soort: 'akker' },
  bieten: { naam: 'Suikerbieten', zaaigoed: 30, groeiUren: 48, kgBasis: 4000, prijsKg: 0.10, afnemer: 'Suikerhal Hoogkerk', jong: 0x4a9a3c, rijp: 0x3d8a34, vorm: 'kegel', soort: 'akker' },
  graan: { naam: 'Graan', zaaigoed: 35, groeiUren: 40, kgBasis: 2600, prijsKg: 0.15, afnemer: 'Graanzolder Noorderveld', jong: 0x8fb04a, rijp: 0xd9b84a, vorm: 'halm', soort: 'akker' },
  gras: { naam: 'Gras', zaaigoed: 20, groeiUren: 20, kgBasis: 5000, prijsKg: 0.07, afnemer: 'Hooimarkt Reitdiep', jong: 0x5fb04a, rijp: 0x7fc24f, vorm: 'halm', soort: 'weiland' },
};
export const GEWAS_IDS = Object.keys(GEWASSEN);
export const STANDAARD_GEWAS = 'aardappelen';
export const standaardVoor = (soort) => (soort === 'weiland' ? 'gras' : STANDAARD_GEWAS);
// Op een akker zaai je akkerbouw, op een weiland gras: het gekozen gewas past zich aan het perceel aan.
export const gewasVoor = (gewas, soort) => (GEWASSEN[gewas] && GEWASSEN[gewas].soort === soort ? gewas : standaardVoor(soort));

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
  cultiveren: { naam: 'Cultiveren', rijen: true, mest: 0, vrij: true },   // alleen met je eigen trekker en cultivator: geen bijbaan
  spuiten: { naam: 'Spuiten', rijen: true, mest: 15, vrij: true },        // onkruid en ziekte: de spuitvloeistof kost materiaal
};
export const MEST_BONUS = 0.2;           // meeropbrengst bij een volledig bemest perceel
export const CULT_BONUS = 0.08;          // cultiveren maakt de zaaibedgrond fijn: tot +8%
export const SPUIT_BONUS = 0.08;         // spuiten houdt onkruid weg: tot +8%
export const HA_REF = 1.2;               // De Zonnehoek: opbrengst en loonwerk gaan naar de grootte van het perceel
export const OPSLAG_VERLIES = 0.0;       // de schuur houdt alles vast; de kwaliteit verandert alleen op de weg
export const UITPUTTING_MAX = 0.3;       // elke oogst put de grond uit; ploegen, mest en wisselen van gewas herstellen hem

// Het boekjaar telt honderd speldagen (een speldag is 24 minuten); het kasboek bewaart de laatste jaren.
export const BOEKJAAR_UREN = 100 * 24;
export const BOEKJAREN_BEWAARD = 8;
// De bank (verzonnen): een kleine lening met een lage rente per speldag, die bij de schuld komt (geen geld uit je zak, geen beslag).
export const LENING = { bank: 'Boerenbank Noordhoek', max: 25000, renteDag: 0.0008 };

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const getal = (x, lo, hi, d = 0) => (Number.isFinite(x) ? clamp(x, lo, hi) : d);

export const nieuwVeld = () => ({ fase: 'braak', gewas: null, bodem: 0, zaai: 0, mest: 0, gezaaidOp: null, cult: 0, spuit: 0 });
const nieuwBoek = () => ({ velden: {}, jaren: {}, lening: { schuld: 0, opgenomen: 0, afgelost: 0, rente: 0, tot: 0 } });

export function nieuweBoerderij() {
  return {
    v: VERSIE, uren: 0, perceel: null, keuze: STANDAARD_GEWAS,
    veld: nieuwVeld(), veldVan: START_PERCEEL, velden: {},        // veld = het actieve perceel; velden = de overige per perceel (syncVeld)
    schuur: { gewas: null, kg: 0, kwaliteit: 1, veld: null },
    machines: Object.fromEntries(MACHINE_IDS.map((m) => [m, 'huur'])),
    totaal: { oogsten: 0, leveringen: 0, omzet: 0, uitgaven: 0 },
    bodemlog: {},                                                  // per perceel: { u: uitputting 0..0,3, g: laatste gewas }
    boek: nieuwBoek(),                                             // kosten en opbrengsten per veld en per boekjaar, en de lening
    bedrijf: nieuwBedrijf(),                 // percelen, erven, opslag en machinepark (percelen.js, #415 stap 1): oude opslag mist dit en krijgt het leeg
  };
}

function leesVeld(v) {
  if (!v || typeof v !== 'object') return nieuwVeld();
  const fase = ['braak', 'geploegd', 'gezaaid', 'geoogst'].includes(v.fase) ? v.fase : 'braak';
  const gewas = GEWASSEN[v.gewas] ? v.gewas : null;
  // een gezaaid veld zonder gewas of zaaitijd is niets: terug naar braak; een geoogst veld is braak
  if ((fase === 'gezaaid' && (!gewas || !Number.isFinite(v.gezaaidOp))) || fase === 'geoogst') return nieuwVeld();
  return { fase, gewas: fase === 'braak' ? null : gewas, bodem: getal(v.bodem, 0, 1), zaai: getal(v.zaai, 0, 1), mest: getal(v.mest, 0, 1), gezaaidOp: fase === 'gezaaid' ? getal(v.gezaaidOp, 0, MAX_UREN) : null, cult: getal(v.cult, 0, 1), spuit: getal(v.spuit, 0, 1) };
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
  b.veld = leesVeld(d.veld);
  if (PERCEEL_IDS.includes(d.veldVan)) b.veldVan = d.veldVan;
  if (d.velden && typeof d.velden === 'object') for (const id of PERCEEL_IDS) { const v = leesVeld(d.velden[id]); if (id !== b.veldVan && v.fase !== 'braak') b.velden[id] = v; }
  const s = d.schuur;
  if (s && typeof s === 'object' && GEWASSEN[s.gewas] && s.kg > 0) b.schuur = { gewas: s.gewas, kg: Math.round(getal(s.kg, 0, 1e6)), kwaliteit: getal(s.kwaliteit, 0, 1, 1), veld: PERCEEL_IDS.includes(s.veld) ? s.veld : null };
  if (d.machines && typeof d.machines === 'object') for (const m of MACHINE_IDS) if (d.machines[m] === 'eigen') b.machines[m] = 'eigen';
  if (d.totaal && typeof d.totaal === 'object') for (const k of Object.keys(b.totaal)) b.totaal[k] = Math.round(getal(d.totaal[k], 0, 1e9));
  if (d.bodemlog && typeof d.bodemlog === 'object') for (const id of PERCEEL_IDS) { const l = d.bodemlog[id]; if (l && typeof l === 'object') b.bodemlog[id] = { u: Math.round(getal(l.u, 0, UITPUTTING_MAX) * 1000) / 1000, g: GEWASSEN[l.g] ? l.g : null }; }
  leesBoek(b, d.boek);
  b.bedrijf = normaliseerBedrijf(d.bedrijf);
  syncVeld(b);
  return b;
}

function leesBoek(b, raw) {
  if (!raw || typeof raw !== 'object') return;
  const som = (x) => ({ omzet: Math.round(getal(x && x.omzet, 0, 1e9)), kosten: Math.round(getal(x && x.kosten, 0, 1e9)) });
  if (raw.velden && typeof raw.velden === 'object') for (const id of PERCEEL_IDS) if (raw.velden[id] && typeof raw.velden[id] === 'object') b.boek.velden[id] = { ...som(raw.velden[id]), kg: Math.round(getal(raw.velden[id].kg, 0, 1e9)) };
  if (raw.jaren && typeof raw.jaren === 'object') {
    const jaren = Object.keys(raw.jaren).filter((j) => /^\d{1,4}$/.test(j)).map(Number).sort((x, y) => y - x).slice(0, BOEKJAREN_BEWAARD);
    for (const j of jaren) {
      const r = raw.jaren[j], posten = {};
      if (r.posten && typeof r.posten === 'object') for (const k of Object.keys(r.posten)) if (/^[a-z]{1,16}$/.test(k)) posten[k] = Math.round(getal(r.posten[k], 0, 1e9));
      b.boek.jaren[j] = { ...som(r), posten };
    }
  }
  const l = raw.lening;
  if (l && typeof l === 'object') b.boek.lening = { schuld: Math.round(getal(l.schuld, 0, 1e7)), opgenomen: Math.round(getal(l.opgenomen, 0, 1e9)), afgelost: Math.round(getal(l.afgelost, 0, 1e9)), rente: Math.round(getal(l.rente, 0, 1e9)), tot: getal(l.tot, 0, MAX_UREN) };
}

// --- het veld per perceel --------------------------------------------------------

// Elk perceel heeft zijn eigen stand; b.veld is die van het actieve perceel. Wisselt het actieve perceel (of valt het weg), dan gaat de oude stand in
// b.velden en komt de stand van het nieuwe perceel (of braak) terug. Geeft true als er iets wisselde.
export function syncVeld(b) {
  const nu = b.bedrijf.actief;
  if (b.veldVan === nu) return false;
  if (b.bedrijf.percelen[b.veldVan] && b.veld.fase !== 'braak') b.velden[b.veldVan] = b.veld;   // is het perceel weg, dan blijft ook het gewas weg
  b.veld = b.velden[nu] || nieuwVeld();
  delete b.velden[nu];
  b.veldVan = nu;
  return true;
}

// De stand van elk perceel van jou, voor het scherm: { id, fase, gewas, groei }.
export function veldenOverzicht(b) {
  const uit = [];
  for (const id of Object.keys(b.bedrijf.percelen)) {
    const v = id === b.veldVan ? b.veld : b.velden[id] || nieuwVeld();
    const groeiVan = v.fase === 'gezaaid' && GEWASSEN[v.gewas] ? clamp((b.uren - v.gezaaidOp) / GEWASSEN[v.gewas].groeiUren, 0, 1) : 0;
    uit.push({ id, fase: v.fase === 'gezaaid' ? (groeiVan >= 1 ? 'rijp' : 'groeit') : v.fase, gewas: v.gewas, groei: groeiVan });
  }
  return uit;
}

export const actiefGewas = (b) => gewasVoor(b.keuze, actiefPerceel(b.bedrijf).soort);

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
// De eerste is de aanbevolen taak. Wachten is geen taak: wacht() zegt waarop. Met { vrij: true } horen de vrije klussen er ook bij
// (cultiveren en spuiten: eigen trekker en werktuig); de bijbaan en de lijst in het menu kennen ze niet.
export function opties(b, { vrij = false } = {}) {
  const f = fase(b);
  const uit = [];
  // eerst de schuur leeg: een tweede oogst zou de eerste overschrijven
  if (b.schuur.kg > 0) uit.push({ taak: 'afleveren', verplicht: true });
  if (f === 'braak') uit.push({ taak: 'ploegen', verplicht: true });
  else if (f === 'geploegd') { uit.push({ taak: 'zaaien', verplicht: true }); if (vrij && !(b.veld.cult > 0)) uit.push({ taak: 'cultiveren', verplicht: false, vrij: true }); }
  else if (f === 'groeit') {
    if (b.veld.mest <= 0 && groei(b) < 0.85) uit.push({ taak: 'bemesten', verplicht: false });
    if (vrij && !(b.veld.spuit > 0) && groei(b) < 0.9) uit.push({ taak: 'spuiten', verplicht: false, vrij: true });
  } else if (f === 'rijp' && !(b.schuur.kg > 0)) uit.push({ taak: 'oogsten', verplicht: true });
  return uit;
}

export const wacht = (b) => (fase(b) === 'groeit' ? { wat: 'groeit', uren: urenTotRijp(b) } : null);

// De volgende taak zonder keuze: de eerste verplichte, anders de eerste mogelijke.
export function volgendeTaak(b) {
  const o = opties(b);
  return (o.find((x) => x.verplicht) || o[0] || {}).taak || null;
}

// Wat een taak nu kost: huur van de machine (niets als die van jou is of als je met je eigen trekker werkt: vrij), zaaigoed of mest.
export function kosten(b, taak, gewas = actiefGewas(b), { vrij = false } = {}) {
  const t = TAKEN[taak];
  if (!t) return { huur: 0, materiaal: 0, totaal: 0 };
  const m = machineVoor(taak);
  const huur = !vrij && m && b.machines[m] !== 'eigen' ? MACHINES[m].huur : 0;
  const materiaal = taak === 'zaaien' ? (GEWASSEN[gewas] ? GEWASSEN[gewas].zaaigoed : 0) : t.mest;
  return { huur, materiaal, totaal: huur + materiaal };
}

// Is de taak nu toegestaan? { ok } of { ok: false, reden }.
export function magTaak(b, taak, geld = Infinity, { vrij = false } = {}) {
  if (!TAKEN[taak]) return { ok: false, reden: 'Die taak bestaat niet.' };
  if (!opties(b, { vrij }).some((o) => o.taak === taak)) {
    const w = wacht(b);
    return { ok: false, reden: w ? `Het gewas groeit nog ${Math.ceil(w.uren)} uur.` : 'Dat kan nu niet.' };
  }
  const k = kosten(b, taak, actiefGewas(b), { vrij });
  if (k.totaal > geld) return { ok: false, reden: `Je hebt €${k.totaal} nodig.` };
  return { ok: true, kosten: k };
}

// --- kasboek ---------------------------------------------------------------------

export const boekjaar = (b) => Math.floor(b.uren / BOEKJAAR_UREN) + 1;

// Een bedrag in het kasboek: per boekjaar (met de post) en per veld. omzet en kosten zijn euro's; kg wat er werd geoogst of verkocht.
export function boek(b, { omzet = 0, kosten: k = 0, veld = null, kg = 0, post = null } = {}) {
  const o = Math.round(omzet), c = Math.round(k);
  if (!(o > 0 || c > 0 || kg > 0)) return;
  const j = boekjaar(b);
  const jr = b.boek.jaren[j] || (b.boek.jaren[j] = { omzet: 0, kosten: 0, posten: {} });
  jr.omzet += o; jr.kosten += c;
  if (post && c > 0) jr.posten[post] = (jr.posten[post] || 0) + c;
  for (const oud of Object.keys(b.boek.jaren).map(Number).sort((x, y) => y - x).slice(BOEKJAREN_BEWAARD)) delete b.boek.jaren[oud];
  if (veld && PERCEEL_IDS.includes(veld)) {
    const f = b.boek.velden[veld] || (b.boek.velden[veld] = { omzet: 0, kosten: 0, kg: 0 });
    f.omzet += o; f.kosten += c; f.kg += Math.round(kg);
  }
}

// Kosten die bij het bedrijf horen en niet bij een perceel (brandstof, onderhoud, machinehuur): ook in b.totaal.
export function uitgaven(b, bedrag, post, veld = null) {
  const c = Math.round(bedrag);
  if (!(c > 0)) return;
  b.totaal.uitgaven += c;
  boek(b, { kosten: c, post, veld });
}

// --- de bank ----------------------------------------------------------------------

export const schuldBank = (b) => b.boek.lening.schuld;
export const leenRuimte = (b) => Math.max(0, LENING.max - b.boek.lening.schuld);

// Een lening opnemen: het geld komt bij de speler (de aanroeper), de schuld stijgt. { ok, bedrag } of { ok: false, reden }.
export function leen(b, bedrag) {
  const n = Math.round(bedrag);
  if (!(n >= 100)) return { ok: false, reden: 'De bank leent vanaf €100.' };
  if (n > leenRuimte(b)) return { ok: false, reden: `Je kunt nog €${leenRuimte(b)} lenen bij ${LENING.bank}.` };
  const l = b.boek.lening;
  if (l.schuld <= 0) l.tot = b.uren;
  l.schuld += n; l.opgenomen += n;
  return { ok: true, bedrag: n };
}

// Aflossen: hooguit de schuld, hooguit wat je hebt. { ok, bedrag } of { ok: false, reden }.
export function los(b, bedrag, geld) {
  const l = b.boek.lening;
  if (!(l.schuld > 0)) return { ok: false, reden: 'Je hebt geen lening.' };
  const n = Math.min(Math.round(Number.isFinite(bedrag) ? bedrag : 0), l.schuld, Math.floor(Number.isFinite(geld) ? geld : 0));
  if (!(n > 0)) return { ok: false, reden: 'Je hebt te weinig geld om af te lossen.' };
  l.schuld -= n; l.afgelost += n;
  return { ok: true, bedrag: n };
}

// De rente loopt per volle speldag, over de schuld (op rente). Geeft de rente van deze stap.
export function renteTik(b) {
  const l = b.boek.lening;
  if (!(l.schuld > 0)) { l.tot = b.uren; return 0; }
  const dagen = Math.min(400, Math.floor((b.uren - l.tot) / 24));
  if (dagen < 1) return 0;
  let rente = 0;
  for (let i = 0; i < dagen; i++) { const r = Math.ceil(l.schuld * LENING.renteDag); rente += r; l.schuld += r; }
  l.tot += dagen * 24; l.rente += rente;
  boek(b, { kosten: rente, post: 'rente' });
  b.totaal.uitgaven += rente;
  return rente;
}

// De taak is gedaan: fractie 0..1 is hoe netjes het werk was. Verandert de boerderij; geeft wat er te melden valt.
// Betalen doet de aanroeper (boerderijlive.js) met kosten().
export function rondTaakAf(b, taak, fractie, { gewas = actiefGewas(b), vrij = false } = {}) {
  const f = clamp(Number.isFinite(fractie) ? fractie : 0, 0, 1);
  const v = b.veld;
  const k = kosten(b, taak, gewas, { vrij });
  b.totaal.uitgaven += k.totaal;
  const veldId = b.veldVan;
  boek(b, { kosten: k.huur, post: 'machines' });
  boek(b, { kosten: k.materiaal, post: taak === 'zaaien' ? 'zaaigoed' : 'mest', veld: veldId });
  const log = b.bodemlog[veldId] || (b.bodemlog[veldId] = { u: 0, g: null });
  const herstel = (x) => { log.u = Math.max(0, Math.round((log.u - x) * 1000) / 1000); };
  if (taak === 'ploegen') { herstel(0.02); b.veld = { ...nieuwVeld(), fase: 'geploegd', bodem: f }; return { taak, fractie: f }; }
  if (taak === 'cultiveren') {
    if (v.fase !== 'geploegd') return { taak, fractie: 0 };
    v.cult = f;
    return { taak, fractie: f };
  }
  if (taak === 'zaaien') {
    if (!GEWASSEN[gewas]) return { taak, fractie: 0 };
    b.veld = { ...nieuwVeld(), fase: 'gezaaid', gewas, bodem: v.bodem, zaai: f, cult: v.cult, gezaaidOp: b.uren };
    return { taak, fractie: f, gewas };
  }
  if (taak === 'bemesten') { v.mest = f; herstel(0.03); return { taak, fractie: f }; }
  if (taak === 'spuiten') { v.spuit = f; return { taak, fractie: f }; }
  if (taak === 'oogsten') {
    const kg = opbrengstKg(b) * f;
    b.schuur = { gewas: v.gewas, kg: Math.round(kg), kwaliteit: 1, veld: veldId };
    // de grond wordt moe van dezelfde teelt achter elkaar: wisselen van gewas put hem minder uit
    log.u = Math.min(UITPUTTING_MAX, Math.round((log.u + (log.g === v.gewas ? 0.08 : 0.04)) * 1000) / 1000);
    log.g = v.gewas;
    b.veld = nieuwVeld();
    b.totaal.oogsten++;
    return { taak, fractie: f, kg: b.schuur.kg, gewas: v.gewas };
  }
  return { taak, fractie: f };
}

// De uitputting van de grond van een perceel (0..0,3) en wat dat de opbrengst kost (factor 0,7..1).
export const uitputting = (b, id = b.veldVan) => (b.bodemlog[id] ? b.bodemlog[id].u : 0);

// Wat het perceel nu zou opleveren als je het op dit moment oogstte (bij een perfecte oogst): afhankelijk van hoe goed er geploegd,
// gecultiveerd, gezaaid, bemest en gespoten is, van hoe ver de groei is, van de grootte en de bodem van het perceel en van hoe moe de grond is.
export function opbrengstKg(b) {
  const v = b.veld;
  const g = GEWASSEN[v.gewas];
  if (!g) return 0;
  const bodem = 0.6 + 0.4 * v.bodem, zaai = 0.5 + 0.5 * v.zaai, mest = 1 + MEST_BONUS * v.mest;
  const p = actiefPerceel(b.bedrijf);
  const ha = clamp(p.ha / HA_REF, 0.5, 4);
  return g.kgBasis * bodem * zaai * mest * (1 + CULT_BONUS * (v.cult || 0)) * (1 + SPUIT_BONUS * (v.spuit || 0)) * groei(b) * bodemFactor(p.bodem) * ha * (1 - uitputting(b));
}

// Het afleveren: de lading wordt verkocht tegen de prijs van het gewas, met de kwaliteit die de rit overleefde (0..1). Geeft het
// bedrag voor de loonfactor van de loopbaan; de schuur is daarna leeg.
export function lever(b, kwaliteit) {
  const s = b.schuur;
  const r = leverVracht(b, s, kwaliteit);
  if (r.kg > 0) b.schuur = { gewas: null, kg: 0, kwaliteit: 1, veld: null };
  return r;
}

// Een vracht (de schuur, of de lading op een aanhanger: { gewas, kg, kwaliteit, veld }) verkopen; de kwaliteit van de lading telt mee.
export function leverVracht(b, vracht, kwaliteit) {
  if (!vracht || !(vracht.kg > 0) || !GEWASSEN[vracht.gewas]) return { bedrag: 0, kg: 0, gewas: null };
  const q = clamp(Number.isFinite(kwaliteit) ? kwaliteit : 0, 0, 1) * clamp(Number.isFinite(vracht.kwaliteit) ? vracht.kwaliteit : 1, 0, 1);
  const bedrag = Math.round(vracht.kg * GEWASSEN[vracht.gewas].prijsKg * q);
  const r = { bedrag, kg: vracht.kg, gewas: vracht.gewas, kwaliteit: q };
  boek(b, { omzet: bedrag, veld: vracht.veld, kg: vracht.kg });
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
  boek(b, { kosten: m.koop, post: 'machines' });
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
