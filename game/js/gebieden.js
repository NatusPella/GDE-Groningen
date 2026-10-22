// Gebieden veroveren (#414): de provincie, haar gemeenten, woonplaatsen, wijken en buurten "doe je" door alles te doen wat er te doen
// is: de missies, bijbanen, minigames, vondsten en geheimen die er liggen. Veroveren is satire: je neemt een buurt over met werk en
// service, niet met geweld. Is een gebied helemaal gedaan, dan krijg je een titel (Burgemeester van ...), een vlag op de kaart en
// wat geld. Alles van de provincie gedaan is de hele kaart veroverd.
//
// Pure regels, geen DOM, geen THREE, geen opslag en geen klok: gebiedenlive.js houdt het profiel van deze speler bij en
// hangt de haken van het spel eraan, gebiedenbronnen.js verzamelt wat er te doen is, gebiedenui.js tekent het overzicht
// (scripts/gebieden_test.mjs, docs/GEBIEDEN.md). Het profiel is van de speler en leeft in zijn eigen opslag
// (gde-gebieden-v1), nooit in een savegame; samen spelen telt dus per speler. Alle titels zijn verzonnen (constitution 2).
//
// De indeling volgt de ECHTE grenzen (game/grenzen.json, zie grenzen.js): de provincie Groningen, haar gemeenten (Kadaster),
// de woonplaatsen (BAG) en de wijken en buurten (CBS). Een plek hoort bij precies één gebied per laag (punt-in-polygoon). Een gebied
// telt alles wat erin ligt; wijk en woonplaats overlappen dus, en een gemeente telt wat in haar woonplaatsen en wijken ligt.

import { grensVan } from './grenzen.js';

export const SLEUTEL_VERSIE = 2;     // 2: de indeling is de echte (v1 was wijkpunten, plaatsen en streken): oude beloningen en huizen vervallen
export const MIN_TAKEN = 2;          // een gebied met minder dan twee dingen te doen is niet te veroveren
const MAX_GEDAAN = 2000;
const MAX_ID = 80;

export const SOORTEN = [
  { id: 'missie', naam: 'Missies', enkel: 'missie', meer: 'missies' },
  { id: 'baan', naam: 'Bijbanen', enkel: 'bijbaan', meer: 'bijbanen' },
  { id: 'spel', naam: 'Minigames', enkel: 'minigame', meer: 'minigames' },
  { id: 'vondst', naam: 'Vondsten', enkel: 'vondst', meer: 'vondsten' },
  { id: 'geheim', naam: 'Geheimen', enkel: 'geheim', meer: 'geheimen' },
];
const SOORT_IDS = new Set(SOORTEN.map((s) => s.id));
export const soortInfo = (id) => SOORTEN.find((s) => s.id === id) || null;

// De vijf lagen, van groot naar klein: voorvoegsel van het id, titel van wie het gebied helemaal gedaan heeft, het geld
// daarbij en de kleur van de vlag. De laag in grenzen.json heet laag.
export const NIVEAUS = [
  { id: 'provincie', naam: 'Provincie', enkel: 'provincie', voor: 'pv', laag: 'provincie', geld: 10000, vlag: '#7a5cc7', titel: () => 'Provinciebaas van Grunn' },
  { id: 'gemeente', naam: 'Gemeenten', enkel: 'gemeente', voor: 'gm', laag: 'gemeenten', geld: 1500, vlag: '#d9534f', titel: (n) => `Gemeentebaas van ${n}` },
  { id: 'woonplaats', naam: 'Woonplaatsen', enkel: 'woonplaats', voor: 'wp', laag: 'woonplaatsen', geld: 400, vlag: '#4fb3a6', titel: (n) => `Burgemeester van ${n}` },
  { id: 'wijk', naam: 'Wijken', enkel: 'wijk', voor: 'wk', laag: 'wijken', geld: 150, vlag: '#e8a33c', titel: (n) => `Wijkheld van ${n}` },
  { id: 'buurt', naam: 'Buurten', enkel: 'buurt', voor: 'bu', laag: 'buurten', geld: 80, vlag: '#b5835a', titel: (n) => `Buurtheld van ${n}` },
];
export const niveauInfo = (id) => NIVEAUS.find((n) => n.id === id) || null;

const grap = {
  buurt: ['De buren knikken je voortaan toe. Een paar zwaaien.', 'Iemand zet een stoel voor je neer op de stoep.', 'De bakker kent je bestelling al.'],
  wijk: ['De buurt kent je nu bij naam en een paar bij bijnaam.', 'Op het wijkfeest ben jij de ereburger.', 'De buren hangen een vlag uit. Een echte.'],
  woonplaats: ['De gemeente stuurt een bos bloemen en geen rekening.', 'Op het dorpsplein komt een bordje met jouw naam. Het is nog niet af, maar de bedoeling telt.', 'De harmonie speelt een lied. Het klinkt bijna als jouw naam.'],
  gemeente: ['In het gemeentehuis hangt een foto van jou, een beetje scheef.', 'De raad vergadert even niet: eerst een kopje koffie met jou.', 'Elke ambtenaar kent je naam. De koffie is gratis.'],
  provincie: ['Heel Grunn weet nu wie je bent. De koeien keken al eerder.', 'Op elke kaart staat een vlag met jouw naam. De schapen vinden het best.', 'De hele provincie is van jou. Je hoeft er alleen nog even langs te rijden.'],
};

// Welke minigames meetellen en waarmee de prestaties zeggen dat je er een gedaan hebt (de teller, en soms de plek van de loopbaan).
export const SPEL_SLEUTELS = {
  carbid: ['s:carbidGames', 'u:carbid'],
  kermis: ['s:botsautoRides', 'u:botsauto'],
  hoogvlieger: ['s:reuzenradRides'],
  drift: ['s:driftRuns'],
  discgolf: ['s:discgolfRounds'],
  pitchputt: ['s:pitchputtRounds'],
  skatepark: ['s:skateRuns'],
  kartbaan: ['s:kartRaces', 'u:kart'],
  zwembad: ['s:zwemRuns'],
  klimtoren: ['s:klimTops'],
  waterski: ['s:skiRuns'],
  carillon: ['s:carillonTunes'],
  pannenkoek: ['s:pannenkoekShifts'],
  hengelen: ['s:hengelSessions'],
  wandeling: ['s:wandelingen'],
  regatta: ['s:regatta', 'u:regatta'],
};

// --- de indeling ---------------------------------------------------------------------------------------------------

const afstand = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const naamOk = (s) => typeof s === 'string' && s.length > 0 && s.length <= MAX_ID;
const getal = (x) => Number.isFinite(x);

// Het id van een gebied: voorvoegsel van de laag plus de code uit de grensgegevens (pv:PV20, gm:GM0014, wp:WP1017, wk:WK001400, bu:BU...).
const gebiedId = (niveau, code) => `${niveau.voor}:${code}`;

// Welke gebieden bij een plek horen: { provincie, gemeente, woonplaats, wijk, buurt } met de id's (of null). De indeling is
// de echte: punt-in-polygoon in de grenzen van de indeling (ind.grenzen).
export function gebiedenVan(ind, x, y) {
  const uit = { provincie: null, gemeente: null, woonplaats: null, wijk: null, buurt: null };
  if (!ind.grenzen || !getal(x) || !getal(y)) return uit;
  const r = grensVan(ind.grenzen, x, y);
  for (const n of NIVEAUS) if (r[n.id]) uit[n.id] = gebiedId(n, r[n.id].id);
  return uit;
}

// De naam die de speler ziet: zonder het wijknummer van het CBS ("Wijk 03 Veendam-kern" wordt "Veendam-kern") en met de gemeente
// erbij als dezelfde naam in een laag vaker voorkomt ("Centrum (Veendam)").
export function weergaveNamen(laag, gemeenteNaam) {
  const kaal = laag.map((g) => { const k = String(g.naam).replace(/^Wijk \d+\s+/, ''); return k.trim() || String(g.naam); });
  const tel = new Map();
  for (const k of kaal) tel.set(k, (tel.get(k) || 0) + 1);
  return laag.map((g, i) => (tel.get(kaal[i]) > 1 && g.gm && gemeenteNaam.get(g.gm) ? `${kaal[i]} (${gemeenteNaam.get(g.gm)})` : kaal[i]).slice(0, MAX_ID));
}

// Bouwt de indeling uit de grenzen en de lijst van dingen te doen.
//   grenzen: wat grenzen.js ontvouw maakt van game/grenzen.json, of null (dan zijn er geen gebieden en blijven de taken bewaard)
//   taken:   [{ id, soort, naam, x, y, sleutels: [string] }]  sleutels: wat het spel meldt als je dit gedaan hebt
// ind.gebieden: [{ id, niveau, naam, x, y, ouder, taken, veroverbaar, grens }] met grens het gebied uit de grenzen (voor de kaart).
export function bouwIndeling(invoer) {
  const { grenzen = null, taken = [] } = invoer || {};
  const ind = { grenzen, gebieden: [], gebied: new Map(), taak: new Map(), perTaak: new Map(), perSleutel: new Map() };
  const maak = (niveau, grens, naam, ouder) => {
    const g = { id: gebiedId(niveau, grens.id), niveau: niveau.id, naam, x: grens.c[0], y: grens.c[1], ouder, taken: [], veroverbaar: false, grens };
    if (ind.gebied.has(g.id)) return;
    ind.gebieden.push(g);
    ind.gebied.set(g.id, g);
  };
  if (grenzen) {
    const [pv, gm, wp, wk, bu] = NIVEAUS;
    const gemNaam = new Map(grenzen.gemeenten.map((g) => [g.id, g.naam]));
    maak(pv, grenzen.provincie, grenzen.provincie.naam, null);
    for (const g of grenzen.gemeenten) maak(gm, g, g.naam, gebiedId(pv, grenzen.provincie.id));
    const pad = (laag, niveau, ouderVan) => { const namen = weergaveNamen(laag, gemNaam); laag.forEach((g, i) => maak(niveau, g, namen[i], ouderVan(g))); };
    pad(grenzen.woonplaatsen, wp, (g) => gebiedId(gm, g.gm));
    pad(grenzen.wijken, wk, (g) => gebiedId(gm, g.gm));
    pad(grenzen.buurten, bu, (g) => (g.wk ? gebiedId(wk, g.wk) : gebiedId(gm, g.gm)));
  }
  for (const t of taken) {
    if (!t || !naamOk(t.id) || !SOORT_IDS.has(t.soort) || !getal(t.x) || !getal(t.y) || ind.taak.has(t.id)) continue;
    const taak = { id: t.id, soort: t.soort, naam: String(t.naam || t.id).slice(0, 80), x: t.x, y: t.y, sleutels: (t.sleutels || [t.id]).filter(naamOk) };
    const van = gebiedenVan(ind, t.x, t.y);
    // ook een taak zonder gebied wordt onthouden: de grenzen kunnen later binnenkomen
    const lijst = NIVEAUS.map((n) => van[n.id]).filter((id) => id && ind.gebied.has(id));
    ind.taak.set(taak.id, taak);
    ind.perTaak.set(taak.id, lijst);
    for (const id of lijst) ind.gebied.get(id).taken.push(taak.id);
    for (const sl of taak.sleutels) {
      const arr = ind.perSleutel.get(sl);
      if (arr) arr.push(taak.id); else ind.perSleutel.set(sl, [taak.id]);
    }
  }
  for (const g of ind.gebieden) g.veroverbaar = g.taken.length >= MIN_TAKEN;
  return ind;
}

// De keten van een gebied naar boven, van groot naar klein, inclusief het gebied zelf: provincie > gemeente > wijk > buurt.
export function keten(ind, gebiedIdent) {
  const uit = [];
  for (let g = ind.gebied.get(gebiedIdent); g && uit.length < 6; g = g.ouder ? ind.gebied.get(g.ouder) : null) uit.unshift(g);
  return uit;
}

// De taak die bij een melding van het spel hoort: met die sleutel, en van de mogelijke het dichtst bij de speler.
export function kiesTaak(ind, sleutel, x, y) {
  const ids = ind.perSleutel.get(sleutel);
  if (!ids || !ids.length) return null;
  if (ids.length === 1 || !getal(x) || !getal(y)) return ids[0];
  let best = null, bd = Infinity;
  for (const id of ids) {
    const t = ind.taak.get(id);
    const d = afstand(t.x, t.y, x, y);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

// --- het profiel van de speler -------------------------------------------------------------------------------------

export const nieuwProfiel = () => ({ v: SLEUTEL_VERSIE, gedaan: [], beloond: [], huizen: [] });

const lijstVan = (a, max) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && x && x.length <= MAX_ID + 2))].slice(0, max) : []);

// Een profiel uit opslag (of iets anders): leeg, oud of kapot geeft een geldig profiel.
export function normaliseer(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  const p = nieuwProfiel();
  if (!d || typeof d !== 'object' || (d.v !== SLEUTEL_VERSIE && d.v !== 1)) return p;
  p.gedaan = lijstVan(d.gedaan, MAX_GEDAAN);
  // v1 had een andere indeling (wijkpunten, plaatsen, streken): wat je deed (de taken) blijft, de gebieden zijn nieuw en worden opnieuw gezaaid
  if (d.v === SLEUTEL_VERSIE) {
    p.beloond = lijstVan(d.beloond, 600);
    p.huizen = lijstVan(d.huizen, 600);
    if (d.zaad === true) p.zaad = true;
  }
  return p;
}

// Twee tabbladen of twee apparaten: wat in een van beide gedaan is, is gedaan.
export function voegSamen(a, b) {
  const x = normaliseer(a), y = normaliseer(b);
  const p = nieuwProfiel();
  p.gedaan = lijstVan([...x.gedaan, ...y.gedaan], MAX_GEDAAN);
  p.beloond = lijstVan([...x.beloond, ...y.beloond], 600);
  p.huizen = lijstVan([...x.huizen, ...y.huizen], 600);
  if (x.zaad || y.zaad) p.zaad = true;
  return p;
}

const isGedaan = (p, id) => p.gedaan.includes(id);

// Voortgang van een gebied: { klaar, totaal, deel, voltooid, veroverbaar, perSoort }. voltooid: alles gedaan, of eerder beloond.
export function voortgang(p, ind, gebiedId) {
  const g = ind.gebied.get(gebiedId);
  if (!g) return { klaar: 0, totaal: 0, deel: 0, voltooid: false, veroverbaar: false, perSoort: {} };
  const gedaan = new Set(p.gedaan);
  const perSoort = {};
  let klaar = 0;
  for (const id of g.taken) {
    const t = ind.taak.get(id);
    const s = perSoort[t.soort] || (perSoort[t.soort] = { klaar: 0, totaal: 0 });
    s.totaal++;
    if (gedaan.has(id)) { s.klaar++; klaar++; }
  }
  const totaal = g.taken.length;
  const voltooid = g.veroverbaar && (klaar >= totaal || p.beloond.includes(gebiedId));
  return { klaar, totaal, deel: totaal ? klaar / totaal : 0, voltooid, veroverbaar: g.veroverbaar, perSoort };
}

// De beloning van een gebied: titel, geld, de vlag en een regel erbij.
export function beloningVan(ind, gebiedId, kies = 0) {
  const g = ind.gebied.get(gebiedId);
  if (!g) return null;
  const n = niveauInfo(g.niveau);
  const regels = grap[g.niveau];
  return { gebied: g.id, naam: g.naam, niveau: g.niveau, titel: n.titel(g.naam), geld: n.geld, vlag: n.vlag, regel: regels[Math.abs(Math.floor(kies)) % regels.length], huis: g.niveau in HUIS_PRIJS };
}

// Een taak is gedaan. Geeft { nieuw, beloningen }: de gebieden die er nu helemaal klaar door zijn (en nog niet beloond waren).
export function markeer(p, ind, taakId) {
  const uit = { nieuw: false, beloningen: [] };
  if (!ind.taak.has(taakId) || isGedaan(p, taakId) || p.gedaan.length >= MAX_GEDAAN) return uit;
  p.gedaan.push(taakId);
  uit.nieuw = true;
  for (const gid of ind.perTaak.get(taakId) || []) {
    const g = ind.gebied.get(gid);
    if (!g.veroverbaar || p.beloond.includes(gid)) continue;
    if (voortgang(p, ind, gid).klaar >= g.taken.length) {
      p.beloond.push(gid);
      geefHuis(p, ind, gid);
      uit.beloningen.push(beloningVan(ind, gid, p.beloond.length));
    }
  }
  return uit;
}

// Een nieuwe sleutel voor een speler die al lang speelt: neem over wat de rest van het spel al weet. gedaan: set van sleutels
// (missie-id's, bijbaan-id's, minigame-id's, vondst-id's). Gebieden die daardoor klaar zijn krijgen hun titel, zonder geld
// (anders kreeg een oude speler in een keer een stapel prijzen). Geeft het aantal overgenomen taken.
export function zaai(p, ind, bekend) {
  let n = 0;
  const heeft = bekend instanceof Set ? bekend : new Set(bekend || []);
  for (const t of ind.taak.values()) {
    if (isGedaan(p, t.id) || !t.sleutels.some((s) => heeft.has(s))) continue;
    if (p.gedaan.length >= MAX_GEDAAN) break;
    p.gedaan.push(t.id);
    n++;
  }
  for (const g of ind.gebieden) {
    if (g.veroverbaar && !p.beloond.includes(g.id) && voortgang(p, ind, g.id).klaar >= g.taken.length) { p.beloond.push(g.id); geefHuis(p, ind, g.id); }
  }
  p.zaad = true;
  return n;
}

// Alle gebieden voor het overzicht, per laag, met voortgang. Alleen te veroveren gebieden; eerst de bijna klaren.
export function overzicht(p, ind) {
  return NIVEAUS.map((n) => {
    const lijst = ind.gebieden.filter((g) => g.niveau === n.id && g.veroverbaar).map((g) => ({ gebied: g, ...voortgang(p, ind, g.id) }));
    lijst.sort((a, b) => (b.voltooid - a.voltooid) || (b.deel - a.deel) || (b.totaal - a.totaal) || a.gebied.naam.localeCompare(b.gebied.naam, 'nl'));
    return { niveau: n, gebieden: lijst, voltooid: lijst.filter((x) => x.voltooid).length, begonnen: lijst.filter((x) => x.klaar > 0).length };
  });
}

// De titels die je gewonnen hebt, nieuwste laatst.
export function titels(p, ind) {
  return p.beloond.filter((id) => ind.gebied.has(id)).map((id) => beloningVan(ind, id));
}

export function samenvatting(p, ind) {
  const o = overzicht(p, ind);
  return { voltooid: o.reduce((a, n) => a + n.voltooid, 0), totaal: o.reduce((a, n) => a + n.gebieden.length, 0), perNiveau: o.map((n) => ({ id: n.niveau.id, voltooid: n.voltooid, totaal: n.gebieden.length })) };
}

// Kleur van een gebied op de kaart: niets gedaan is niet getekend, wat gedaan is loopt van oker naar groen, en een veroverd
// gebied krijgt de kleur van zijn vlag. Geeft { kleur, alpha } of null.
export function kaartKleur(v, vlag) {
  if (!v.veroverbaar) return null;
  if (v.voltooid) return { kleur: vlag, alpha: 0.3 };
  if (!(v.deel > 0)) return null;
  const t = Math.min(1, v.deel);
  const r = Math.round(214 - 130 * t), g = Math.round(168 + 22 * t), b = Math.round(60 + 20 * t);
  return { kleur: `rgb(${r},${g},${b})`, alpha: 0.14 + 0.14 * t };
}

// --- safehouses (fase 2 van #414) -----------------------------------------------------------------------------------
// In elke veroverbare wijk en woonplaats staat één verzonnen woning. Je koopt hem (goedkoper naarmate je meer in dat gebied deed) of
// krijgt hem als het gebied helemaal gedaan is. Wat erin kan: slapen en opslaan, de garage, de kledingkast, een snelreisanker en
// onderduiken (daar zoekt de politie niet). De inrichting groeit mee met je voortgang. Alle straten en makelaars zijn verzonnen.
export const HUIS_PRIJS = { wijk: 1800, woonplaats: 4200 };
export const HUIS_KORTING_MAX = 0.5;     // bij bijna klaar nog de helft van de prijs
export const ONDERDUIK_UREN = [3, 3, 2, 2, 1]; // per inrichtingsniveau: hoe lang je onderduikt voor de politie je kwijt is

const STRATEN = ['Kneuterlaan', 'Zoutkeetsteeg', 'Dikke Muurpad', 'Peerdestraat', 'Klaverhofje', 'Wierdeweg', 'Turfmarkt', 'Piepschuimlaan', 'Kwakkelsingel', 'Lantaarnsteeg', 'Boterkoekenlaan', 'Schuurdeurpad', 'Heidekoppad', 'Mosterdgang', 'Spekdijk', 'Notenkraakweg', 'Fietsbelhof', 'Klompenlaan', 'Waterhoenweg', 'Koekoeksbloemstraat'];
const MAKELAARS = ['Vastgoed Dubbeltje', 'Makelaardij Stevig en Scheef', 'Huisje Boompje Beestje', 'Woonbureau De Wierde', 'Makelaar Zeven Dakpannen', 'Kantoor Kwartje Korting'];
const hashTekst = (t) => { let h = 2166136261; for (const c of String(t)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };

export const huisId = (gebiedId) => 'h:' + gebiedId;

// De woning van een gebied, of null (een streek heeft er geen en een gebied met te weinig te doen ook niet).
export function huisVan(ind, gebiedId) {
  const g = ind.gebied.get(gebiedId);
  if (!g || !g.veroverbaar || !(g.niveau in HUIS_PRIJS)) return null;
  const h = hashTekst(gebiedId);
  return { id: huisId(gebiedId), gebied: gebiedId, niveau: g.niveau, naam: `Safehouse ${g.naam}`, adres: `${STRATEN[h % STRATEN.length]} ${(h >>> 8) % 98 + 1}`, makelaar: MAKELAARS[(h >>> 16) % MAKELAARS.length], x: g.x, y: g.y };
}
export function huizenLijst(ind) {
  return ind.gebieden.map((g) => huisVan(ind, g.id)).filter(Boolean);
}
export const heeftHuis = (p, huisIdent) => p.huizen.includes(huisIdent);

// Gratis bij een veroverd gebied (titel en huis horen bij elkaar).
export function geefHuis(p, ind, gebiedId) {
  const h = huisVan(ind, gebiedId);
  if (!h || heeftHuis(p, h.id)) return false;
  p.huizen.push(h.id);
  return true;
}

// De koopprijs: de basisprijs van de laag, tot de helft korting naarmate je meer in het gebied deed (afgerond op 5).
export function huisPrijs(p, ind, huisIdent) {
  const h = ind.gebied.has(huisIdent.slice(2)) ? huisVan(ind, huisIdent.slice(2)) : null;
  if (!h) return null;
  const v = voortgang(p, ind, h.gebied);
  return Math.max(5, Math.round(HUIS_PRIJS[h.niveau] * (1 - HUIS_KORTING_MAX * Math.min(1, v.deel)) / 5) * 5);
}

// Kopen: { ok, prijs, reden } met reden 'onbekend', 'al' of 'geld'. De aanroeper trekt het geld af als ok.
export function koopHuis(p, ind, huisIdent, geld) {
  const prijs = huisPrijs(p, ind, huisIdent);
  if (prijs == null) return { ok: false, prijs: 0, reden: 'onbekend' };
  if (heeftHuis(p, huisIdent)) return { ok: false, prijs, reden: 'al' };
  if (!(geld >= prijs)) return { ok: false, prijs, reden: 'geld' };
  p.huizen.push(huisIdent);
  return { ok: true, prijs, reden: '' };
}

// De inrichting groeit mee: vijf stappen, vanaf het begin, 25%, 50%, 75% en als het gebied helemaal gedaan is.
const INRICHTING = [
  ['Een matras, een lamp en een plant die nog leeft', 0],
  ['Een kledingkast van de kringloop', 0.25],
  ['Een bank met een plaid die naar vorige bewoners ruikt', 0.5],
  ['Een prikbord met jouw buurt erop en rode draad', 0.75],
  ['Een vlag voor de deur en een bordje: hier woont de baas', 1],
];
export function inrichting(deel, voltooid) {
  const d = voltooid ? 1 : Math.max(0, Math.min(1, deel || 0));
  const stappen = INRICHTING.map(([naam, vanaf]) => ({ naam, klaar: d >= vanaf }));
  return { niveau: stappen.filter((x) => x.klaar).length - 1, stappen };
}
