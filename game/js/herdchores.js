// De kudde van hoeve Zeldenrust en de dagelijkse verzorging (#1373, audit boer B8). Twee dingen, beide puur (geen DOM, geen wereld, geen klok):
//
// 1. De schenking zet een kudde op de weide van de hoeve (zetHoeveKudde). Besluit 6 van de audit: 40 koeien passen niet op 5 hectare (melkvee is 2,5 per
//    hectare), dus de mechanica blijft zoals ze is en de verhaaltekst zegt twaalf koeien (Oom Hindrik en Tante Aaltje in 09-script-akte2.md, N5 en N5.2).
// 2. Eén handeling per speldag per kudde: voeren en melken (doeKlus). Het is een kleine bonus bovenop livestock.js, geen plicht: een kudde zonder
//    verzorging blijft gewoon leven. Melken door jezelf telt als de melkrobot (geen 10% minder melk), voeren geeft 5% meer productie
//    (livestock.KLUS_VOER_BONUS). De klus van speldag D telt mee in de dagverwerking van D+1 (de eerstvolgende die het bezit rekent; holdingsmodel.advanceDays).
//
// Opslag: bezit.x.dierklus = { dag, gedaan: { <perceel>: bits } } (1 = voeren, 2 = melken); per speler (bezit is per speler, #429), een oude opslag
// zonder het veld laadt gewoon. Samen spelen: het vee is van de speler zelf en een gast ziet het niet (livestock.js); niets gaat over het net.
import { stockHerd, herdsOf, SPECIES } from './livestock.js';
import { syncLegacyParcels } from './bezit.js';

export const HOEVE_WEI = 'zeldenrust-wei';
export const HOEVE_KUDDE = { sp: 'melkvee', n: 12 };
export const KLUSSEN = {
  voeren: { naam: 'Voeren', bit: 1, xp: 4, tekst: 'Je voerde de kudde zelf: ze geven vandaag iets meer.' },
  melken: { naam: 'Melken', bit: 2, xp: 6, tekst: 'Je molk de koeien zelf: geen melkrobot nodig.' },
};
export const KLUS_IDS = Object.keys(KLUSSEN);

// Zet de kudde van de hoeve neer. Schrijft de geschonken percelen als eigen bezit bij (niet te koop of verkopen) en zet er twaalf koeien op de weide.
// Dubbel aanroepen doet niets. Geeft { ok, n } of { ok: false, why }.
export function zetHoeveKudde(bezit, bedrijf) {
  syncLegacyParcels(bezit, bedrijf);
  if (!bezit.parcels[HOEVE_WEI]) return { ok: false, why: 'geen-perceel' };
  if (herdsOf(bezit)[HOEVE_WEI]) return { ok: false, why: 'al-vee' };
  return stockHerd(bezit, HOEVE_WEI, HOEVE_KUDDE.sp, HOEVE_KUDDE.n);
}

const clean = (raw) => {
  const out = { dag: -1, gedaan: {} };
  if (!raw || typeof raw !== 'object') return out;
  if (Number.isFinite(raw.dag)) out.dag = Math.round(raw.dag);
  if (raw.gedaan && typeof raw.gedaan === 'object') {
    for (const id of Object.keys(raw.gedaan).slice(0, 64)) {
      const v = raw.gedaan[id];
      if (Number.isInteger(v) && v >= 1 && v <= 3 && /^[a-z0-9-]{1,40}$/.test(id)) out.gedaan[id] = v;
    }
  }
  return out;
};
const stand = (bezit) => {
  const k = clean(bezit.x.dierklus);
  bezit.x.dierklus = k;
  return k;
};

// Wat is er op deze speldag al gedaan voor dit perceel? { voeren, melken }.
export function klusStand(bezit, id, dag) {
  const k = stand(bezit);
  const bits = k.dag === dag ? k.gedaan[id] || 0 : 0;
  return { voeren: !!(bits & KLUSSEN.voeren.bit), melken: !!(bits & KLUSSEN.melken.bit) };
}

// Wat kan hier vandaag nog: een lijst klussen met of ze kunnen. Melken kan alleen bij melkvee.
export function klusAanbod(bezit, id, dag) {
  const herd = herdsOf(bezit)[id];
  if (!herd || !SPECIES[herd.sp]) return [];
  const s = klusStand(bezit, id, dag);
  return KLUS_IDS.filter((k) => k !== 'melken' || herd.sp === 'melkvee').map((k) => ({ id: k, naam: KLUSSEN[k].naam, gedaan: s[k], xp: KLUSSEN[k].xp }));
}

// Eén klus doen. Geeft { ok, xp, tekst } of { ok: false, why: 'geen-kudde' | 'onbekende-klus' | 'past-niet' | 'al-gedaan' }.
export function doeKlus(bezit, id, soort, dag) {
  const herd = herdsOf(bezit)[id];
  if (!herd) return { ok: false, why: 'geen-kudde' };
  const kl = KLUSSEN[soort];
  if (!kl) return { ok: false, why: 'onbekende-klus' };
  if (soort === 'melken' && herd.sp !== 'melkvee') return { ok: false, why: 'past-niet' };
  const k = stand(bezit);
  if (k.dag !== dag) { k.dag = dag; k.gedaan = {}; }
  if ((k.gedaan[id] || 0) & kl.bit) return { ok: false, why: 'al-gedaan' };
  k.gedaan[id] = (k.gedaan[id] || 0) | kl.bit;
  return { ok: true, xp: kl.xp, tekst: kl.tekst };
}

// Voor de dagverwerking van `day`: de klus van gisteren of vandaag telt. Geeft een functie id -> { voeren, melken } of null zonder klus.
export function klusVan(bezit, day) {
  const k = clean(bezit && bezit.x ? bezit.x.dierklus : null);
  if (!(k.dag === day - 1 || k.dag === day)) return null;
  return (id) => { const bits = k.gedaan[id] || 0; return { voeren: !!(bits & KLUSSEN.voeren.bit), melken: !!(bits & KLUSSEN.melken.bit) }; };
}
