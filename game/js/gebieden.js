// Gebieden veroveren (#414): wijken, plaatsen en streken "doe je" door alles te doen wat er te doen is: de missies, bijbanen,
// minigames, vondsten en geheimen die er liggen. Veroveren is satire: je neemt een wijk over met werk en service, niet met
// geweld. Is een gebied helemaal gedaan, dan krijg je een titel (Burgemeester van ...), een vlag op de kaart en wat geld.
//
// Pure regels, geen DOM, geen THREE, geen opslag en geen klok: gebiedenlive.js houdt het profiel van deze speler bij en
// hangt de haken van het spel eraan, gebiedenbronnen.js verzamelt wat er te doen is, gebiedenui.js tekent het overzicht
// (scripts/gebieden_test.mjs, docs/GEBIEDEN.md). Het profiel is van de speler en leeft in zijn eigen opslag
// (gde-gebieden-v1), nooit in een savegame; samen spelen telt dus per speler. Alle titels zijn verzonnen (constitution 2).
//
// Indeling uit de wereldgegevens, drie lagen:
//   wijk    de 66 wijkpunten van de stad (stad.json, zoals het HUD ze noemt: dichtstbijzijnde punt, tot WIJK_REACH)
//   plaats  de steden, dorpen en gehuchten van de provincie (worldplaces.js), binnen hun bereik per soort
//   streek  de acht streken (regioleven.js) en daarnaast de Stad Groningen als geheel. Er zijn geen gemeentegrenzen in de
//           gegevens; de streken doen de dienst van een gemeente, en dat staat zo in de uitleg.

export const SLEUTEL_VERSIE = 1;
export const MIN_TAKEN = 2;          // een gebied met minder dan twee dingen te doen is niet te veroveren
export const WIJK_REACH = 1800;      // m: verder dan dit van het dichtstbijzijnde wijkpunt hoort bij geen wijk
export const STAD_ID = 'stad';
export const STAD_NAAM = 'Stad Groningen';
// bereik van een plaats per soort (zoals worldplaces.js REACH); de stad Groningen zelf is de streek 'stad' met haar wijken
export const PLAATS_REACH = { town: 1700, village: 800, hamlet: 350 };
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

// De drie lagen: titel van wie het gebied helemaal gedaan heeft, het geld daarbij en de kleur van de vlag.
export const NIVEAUS = [
  { id: 'wijk', naam: 'Wijken', enkel: 'wijk', geld: 150, vlag: '#e8a33c', titel: (n) => `Wijkheld van ${n}` },
  { id: 'plaats', naam: 'Plaatsen', enkel: 'plaats', geld: 400, vlag: '#4fb3a6', titel: (n) => `Burgemeester van ${n}` },
  { id: 'streek', naam: 'Streken', enkel: 'streek', geld: 1200, vlag: '#d9534f', titel: (n) => `Streekbaas van ${n}` },
];
export const niveauInfo = (id) => NIVEAUS.find((n) => n.id === id) || null;

const grap = {
  wijk: ['De buurt kent je nu bij naam en een paar bij bijnaam.', 'Op het wijkfeest ben jij de ereburger.', 'De buren hangen een vlag uit. Een echte.'],
  plaats: ['De gemeente stuurt een bos bloemen en geen rekening.', 'Op het dorpsplein komt een bordje met jouw naam. Het is nog niet af, maar de bedoeling telt.', 'De harmonie speelt een lied. Het klinkt bijna als jouw naam.'],
  streek: ['De hele streek weet nu wie je bent. De koeien keken al eerder.', 'In het streekblad sta je op de voorpagina, net onder het weer.', 'Een streekfeest zonder jou had niet gekund. Dat zeggen ze nu.'],
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

// Welke gebieden bij een plek horen: { wijk, plaats, streek } met de id's (of null). Wijk en plaats zijn ondeelbaar: het
// dichtstbijzijnde wijkpunt, de plaats met de kleinste afstand ten opzichte van zijn bereik. Ligt de plek in een wijk, dan
// hoort ze bij de streek 'stad'; anders bij de streek met het dichtstbijzijnde hart binnen zijn bereik.
export function gebiedenVan(ind, x, y) {
  const uit = { wijk: null, plaats: null, streek: null };
  if (!getal(x) || !getal(y)) return uit;
  let bd = WIJK_REACH;
  for (const p of ind.wijken) {
    const d = afstand(p.x, p.y, x, y);
    if (d <= bd) { bd = d; uit.wijk = 'w:' + p.naam; }
  }
  let bs = 1;
  for (const p of ind.plaatsen) {
    const d = afstand(p.x, p.y, x, y) / p.reach;
    if (d <= bs) { bs = d; uit.plaats = 'p:' + p.naam; }
  }
  if (uit.wijk) { uit.streek = 's:' + STAD_ID; return uit; }
  let sd = Infinity;
  for (const s of ind.streken) {
    const d = afstand(s.x, s.y, x, y);
    if (d <= s.reach && d < sd) { sd = d; uit.streek = 's:' + s.id; }
  }
  return uit;
}

// Bouwt de indeling uit de wereldgegevens en de lijst van dingen te doen.
//   wijken:  [{ naam, x, y }]                  plaatsen: [{ naam, kind, x, y }]   (steden tellen niet mee)
//   streken: [{ id, naam, x, y, reach }]       stad: { x, y } het hart van de Stad Groningen
//   taken:   [{ id, soort, naam, x, y, sleutels: [string] }]  sleutels: wat het spel meldt als je dit gedaan hebt
export function bouwIndeling(invoer) {
  const { wijken = [], plaatsen = [], streken = [], stad = null, taken = [] } = invoer || {};
  const w = [];
  const gezien = new Set();
  for (const p of wijken) {
    if (!p || !naamOk(p.naam) || !getal(p.x) || !getal(p.y) || gezien.has(p.naam)) continue;
    gezien.add(p.naam);
    w.push({ naam: p.naam, x: p.x, y: p.y });
  }
  const pl = [];
  const plNamen = new Set();
  for (const p of plaatsen) {
    const reach = p && PLAATS_REACH[p.kind];
    if (!reach || !naamOk(p.name || p.naam) || !getal(p.x) || !getal(p.y)) continue;
    const naam = p.name || p.naam;
    if (plNamen.has(naam)) continue;
    plNamen.add(naam);
    pl.push({ naam, kind: p.kind, x: p.x, y: p.y, reach });
  }
  const st = [];
  for (const s of streken) {
    if (!s || !naamOk(s.id) || !naamOk(s.naam) || !getal(s.x) || !getal(s.y) || !(s.reach > 0)) continue;
    st.push({ id: s.id, naam: s.naam, x: s.x, y: s.y, reach: s.reach });
  }
  const ind = { wijken: w, plaatsen: pl, streken: st, stad: stad && getal(stad.x) && getal(stad.y) ? { x: stad.x, y: stad.y } : null,
    gebieden: [], gebied: new Map(), taak: new Map(), perTaak: new Map(), perSleutel: new Map() };

  const maak = (id, niveau, naam, x, y, r) => { const g = { id, niveau, naam, x, y, r, taken: [], veroverbaar: false }; ind.gebieden.push(g); ind.gebied.set(id, g); return g; };
  for (const p of w) {
    // de schijf op de kaart: de helft van de afstand tot het dichtstbijzijnde andere wijkpunt, tussen 180 en 700 m
    let dicht = Infinity;
    for (const q of w) if (q !== p) dicht = Math.min(dicht, afstand(p.x, p.y, q.x, q.y));
    maak('w:' + p.naam, 'wijk', p.naam, p.x, p.y, Math.max(180, Math.min(700, (Number.isFinite(dicht) ? dicht : 800) / 2)));
  }
  for (const p of pl) maak('p:' + p.naam, 'plaats', p.naam, p.x, p.y, Math.min(p.reach, 1200));
  for (const s of st) maak('s:' + s.id, 'streek', s.naam, s.x, s.y, Math.min(s.reach, 7000));
  if (ind.stad) maak('s:' + STAD_ID, 'streek', STAD_NAAM, ind.stad.x, ind.stad.y, 3000);

  for (const t of taken) {
    if (!t || !naamOk(t.id) || !SOORT_IDS.has(t.soort) || !getal(t.x) || !getal(t.y) || ind.taak.has(t.id)) continue;
    const taak = { id: t.id, soort: t.soort, naam: String(t.naam || t.id).slice(0, 80), x: t.x, y: t.y, sleutels: (t.sleutels || [t.id]).filter(naamOk) };
    const van = gebiedenVan(ind, t.x, t.y);
    // ook een taak zonder gebied wordt onthouden: de plaatsen van de provincie komen soms later binnen
    const lijst = [van.wijk, van.plaats, van.streek].filter((id) => id && ind.gebied.has(id));
    ind.taak.set(taak.id, taak);
    ind.perTaak.set(taak.id, lijst);
    for (const id of lijst) ind.gebied.get(id).taken.push(taak.id);
    for (const s of taak.sleutels) {
      const a = ind.perSleutel.get(s);
      if (a) a.push(taak.id); else ind.perSleutel.set(s, [taak.id]);
    }
  }
  for (const g of ind.gebieden) g.veroverbaar = g.taken.length >= MIN_TAKEN;
  return ind;
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

export const nieuwProfiel = () => ({ v: SLEUTEL_VERSIE, gedaan: [], beloond: [] });

const lijstVan = (a, max) => (Array.isArray(a) ? [...new Set(a.filter((x) => typeof x === 'string' && x && x.length <= MAX_ID + 2))].slice(0, max) : []);

// Een profiel uit opslag (of iets anders): leeg, oud of kapot geeft een geldig profiel.
export function normaliseer(raw) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  const p = nieuwProfiel();
  if (!d || typeof d !== 'object' || d.v !== SLEUTEL_VERSIE) return p;
  p.gedaan = lijstVan(d.gedaan, MAX_GEDAAN);
  p.beloond = lijstVan(d.beloond, 400);
  if (d.zaad === true) p.zaad = true;
  return p;
}

// Twee tabbladen of twee apparaten: wat in een van beide gedaan is, is gedaan.
export function voegSamen(a, b) {
  const x = normaliseer(a), y = normaliseer(b);
  const p = nieuwProfiel();
  p.gedaan = lijstVan([...x.gedaan, ...y.gedaan], MAX_GEDAAN);
  p.beloond = lijstVan([...x.beloond, ...y.beloond], 400);
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
  const n = g.niveau === 'streek' && g.id === 's:' + STAD_ID ? { ...NIVEAUS[2], titel: () => 'Stadsbaas van Grunn' } : niveauInfo(g.niveau);
  const regels = grap[g.niveau];
  return { gebied: g.id, naam: g.naam, niveau: g.niveau, titel: n.titel(g.naam), geld: n.geld, vlag: n.vlag, regel: regels[Math.abs(Math.floor(kies)) % regels.length] };
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
    if (g.veroverbaar && !p.beloond.includes(g.id) && voortgang(p, ind, g.id).klaar >= g.taken.length) p.beloond.push(g.id);
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
