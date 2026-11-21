// De prestatie als moment (wens van de eigenaar 21-11): een stempel die inslaat, een icoon dat ploft, titel en
// beschrijving die gestaffeld komen, een balkje "x/y prestaties" dat oploopt en een glans die sluit. Dit bestand is
// alleen de pure planning (geen DOM, geen audio): achievements.js zet er klassen, CSS-variabelen en timers van, en
// scripts/achievementunlock_test.mjs test het. Het gebruikt de staffel-helper van de eindkaart (eindkaartimpact.js),
// dezelfde maten (120 ms staffel, 250 ms per onderdeel, hooguit 1,6 s) en dezelfde klassen uit ds-micro.css.
//
// Regels uit DESIGN_SYSTEM.md "Microanimaties (DS3)": één animatie per gebeurtenis, overslaan kan, bij Beweging beperken
// en Rustig drukwerk geen staffel (direct de eindstand, één geluid). Geluid: een korte slag bij de inslag en tikjes van
// de teller, aanvullend op de bestaande prestatie-sting (achievementgeluid.js). De prestatie wacht al tot de eindkaart
// weg is (isOverlayHeld in achievements.js), dus de slag van de eindkaart en deze slag klinken nooit tegelijk.
// Samen spelen (#429): een prestatie is per speler lokaal; dit plan wordt alleen gemaakt waar de toast getoond wordt.

import { SNEL_MS, STAP_MS, MAX_TOTAAL_MS, tellerStappen } from './eindkaartimpact.js';

export const TELLER_MS = STAP_MS;   // de teller en de balk lopen hierover (250 ms: de balk vult in één stap, de teller tikt mee)
export const MAX_ZICHTBAAR = 3;     // hooguit drie losse prestatiekaarten per reeks; de rest wordt één samenvatting
export const KORT_FACTOR = 0.6;     // een korte kaart (er wachten er nog) blijft 60% van de gewone tijd staan
export const KORT_MIN_S = 2.4;      // maar nooit korter dan 2,4 s

export const ZELDZAAMHEDEN = ['gewoon', 'zeldzaam', 'goud'];
// Het inktaccent per categorie (tokens --ds-c-ink-*; de klassen .ds-m-inkt--* in ds-micro.css).
export const CATEGORIE_INKT = {
  missies: 'geel', verzamelen: 'geel', rijden: 'roze', politie: 'roze', sociaal: 'roze',
  verkennen: 'bord', bijbaan: 'bord', tevoet: 'bord', spoor: 'inkt', duif: 'inkt', nahetverhaal: 'inkt',
};

// Gewoon, zeldzaam (een geheime) of goud (een medaille of "alle goud").
export function zeldzaamheid(a) {
  if (!a) return 'gewoon';
  if (a.medal || a.id === 'alle_goud') return 'goud';
  if (a.hidden) return 'zeldzaam';
  return 'gewoon';
}

// De inkt van de kaart: goud is altijd geel, een zeldzame altijd roze; een gewone krijgt de inkt van zijn categorie.
export function accentInkt(a) {
  const z = zeldzaamheid(a);
  if (z === 'goud') return 'geel';
  if (z === 'zeldzaam') return 'roze';
  return (a && CATEGORIE_INKT[a.cat]) || 'bord';
}

const pct = (x, t) => (t > 0 ? Math.max(0, Math.min(100, Math.floor((x / t) * 100))) : 0);

// Het plan voor één prestatiekaart. o: { id, cat, medal, hidden, behaald (aantal na deze), totaal, kort (er wachten er nog),
// rustig (Beweging beperken of Rustig drukwerk) }.
// Geeft { impact, kort, zeldzaam, inkt, totaal, kaart, icoon, titel, beschrijving, balk, teller, glans, geluid } terug;
// alle tijden in ms vanaf het begin van het moment, 'eenh' is dezelfde tijd in --ds-moment-stap (120 ms).
export function planPrestatie(o = {}) {
  const zeldzaam = zeldzaamheid(o);
  const inkt = accentInkt(o);
  const totaal = Number.isFinite(o.totaal) ? Math.max(0, Math.round(o.totaal)) : 0;
  const naar = Math.max(0, Math.min(totaal || Infinity, Math.round(o.behaald || 0)));
  const van = Math.max(0, naar - 1);
  const balkWaarden = { van, naar, totaal, pctVan: pct(van, totaal), pctNaar: pct(naar, totaal), p: totaal ? naar / totaal : 0 };
  const basis = { zeldzaam, inkt, kort: !!o.kort };
  if (o.rustig) {
    // geen beweging, geen staffel: één slag, direct de eindstand
    return { ...basis, impact: false, totaal: 0, kaart: { at: 0 }, icoon: null, titel: null, beschrijving: null,
      balk: o.kort ? null : { at: 0, duur: 0, ...balkWaarden }, teller: null, glans: null, geluid: [{ at: 0, naam: 'slag' }] };
  }
  const at = (k) => Math.round(k * SNEL_MS);
  const eenh = (ms) => Math.round((ms / SNEL_MS) * 100) / 100;
  const kaart = { at: 0 };
  const icoon = { at: at(1) }, titel = { at: at(2) }, beschrijving = { at: at(3) };
  const geluid = [{ at: 0, naam: 'slag' }];
  if (o.kort) {
    // een kaart in een reeks: de inslag, het icoon en de titel, zonder balk, teller of glans
    const totaalMs = titel.at + STAP_MS;
    return { ...basis, impact: true, totaal: totaalMs, kaart, icoon: { ...icoon, eenh: eenh(icoon.at) }, titel: { ...titel, eenh: eenh(titel.at) },
      beschrijving: { at: beschrijving.at, eenh: eenh(beschrijving.at) }, balk: null, teller: null, glans: null, geluid };
  }
  const balk = { at: at(4), duur: TELLER_MS, ...balkWaarden };
  const stappen = tellerStappen(Math.max(0, naar - van), TELLER_MS, 6).map((s) => ({ t: s.t, waarde: van + s.waarde, tik: s.tik }));
  const teller = stappen.length ? { at: balk.at, duur: TELLER_MS, van, naar, stappen } : null;
  const glansAt = balk.at + TELLER_MS;
  let totaalMs = glansAt + STAP_MS;
  if (teller) for (const s of teller.stappen) geluid.push({ at: teller.at + s.t, naam: s.tik === teller.stappen.length - 1 ? 'munt' : 'tik', i: s.tik });
  geluid.push({ at: glansAt, naam: 'glans' });
  if (totaalMs > MAX_TOTAAL_MS) totaalMs = MAX_TOTAAL_MS; // de onderdelen zijn al gekozen onder de grens; dit is alleen de vangnet
  geluid.sort((a, b) => a.at - b.at);
  return {
    ...basis, impact: true, totaal: totaalMs, kaart,
    icoon: { ...icoon, eenh: eenh(icoon.at) }, titel: { ...titel, eenh: eenh(titel.at) }, beschrijving: { ...beschrijving, eenh: eenh(beschrijving.at) },
    balk: { ...balk, eenh: eenh(balk.at) }, teller, glans: { at: glansAt, eenh: eenh(glansAt) }, geluid,
  };
}

// De wachtrij: de eerste van een reeks is een volle kaart, de volgende zijn kort, en zijn er na drie nog meer, dan komen ze
// samen in één samenvatting (de prestaties zelf staan in het menu). index: hoeveelste van deze reeks (0 = de eerste),
// resterend: hoeveel er nog staan te wachten, deze meegerekend.
export function wachtrijStap({ index = 0, resterend = 1 } = {}) {
  const i = Math.max(0, Math.floor(index));
  const rest = Math.max(1, Math.floor(resterend));
  if (i >= MAX_ZICHTBAAR && rest >= 2) return { variant: 'samenvatting', aantal: rest, nog: 0 };
  if (i === 0) return { variant: 'vol', aantal: 1, nog: rest - 1 };
  return { variant: 'kort', aantal: 1, nog: rest - 1 };
}

// De hele reeks van n prestaties in één keer, voor de test en voor een voorspelling.
export function wachtrijPlan(n) {
  const uit = [];
  let over = Math.max(0, Math.floor(n));
  let index = 0;
  while (over > 0) {
    const s = wachtrijStap({ index, resterend: over });
    uit.push(s);
    over -= s.aantal;
    index++;
  }
  return uit;
}

// Hoe lang een kaart staat (in seconden), uit de gewone duur van de component: een korte kaart 60%, nooit onder 2,4 s.
export function verblijfS(gewoonS, variant) {
  if (variant === 'kort') return Math.max(KORT_MIN_S, Math.round(gewoonS * KORT_FACTOR * 10) / 10);
  if (variant === 'samenvatting') return Math.max(KORT_MIN_S, 3);
  return gewoonS;
}

// De tekst van de samenvatting: Nederlands, enkelvoud en meervoud.
export function samenvattingTekst(aantal) {
  const n = Math.max(1, Math.floor(aantal));
  return { titel: n === 1 ? 'Nog 1 prestatie' : `Nog ${n} prestaties`, tekst: 'Alles staat in het menu onder Prestaties.' };
}

// Het "x/y prestaties" van de balk, in het Nederlands.
export const balkTekst = (x, totaal) => `${x}/${totaal} prestaties`;

// ---- Het prestatiemenu ----
// Een net-ontgrendelde rij glanst één keer per sessie (niet bij elke tab of klik); de categorie-teller tikt op van
// wat er eerder stond naar wat er nu is, en een balk die al vol was staat er direct (geen herhaling).
export function menuPlan({ vers = [], gezien = new Set(), vorigeTellers = new Map(), tellers = [], rustig = false } = {}) {
  const glans = [];
  for (const id of vers) if (!gezien.has(id)) { glans.push(id); gezien.add(id); }
  const tel = tellers.map(({ cat, done }) => {
    const was = vorigeTellers.has(cat) ? vorigeTellers.get(cat) : done; // de eerste keer: geen telling
    vorigeTellers.set(cat, done);
    if (rustig || was === done) return { cat, was, naar: done, stappen: [] };
    const d = Math.abs(done - was);
    const stappen = tellerStappen(d, 300, 5).map((s) => ({ t: s.t, waarde: was + Math.sign(done - was) * s.waarde, tik: s.tik }));
    return { cat, was, naar: done, stappen };
  });
  return { glans: rustig ? [] : glans, tellers: tel };
}
