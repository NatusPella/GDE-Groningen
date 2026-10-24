// Werktuigen achter de machines van de boerderij (#415, stap 2): ploeg, cultivator, zaaimachine, mestverspreider, spuit, maaier en een aanhanger,
// koppelen en ontkoppelen aan een trekker, de aftakas (aan of uit) en de hef (omhoog of omlaag), en het veldwerk dat daaruit volgt: ploegen,
// cultiveren, zaaien, bemesten, spuiten en maaien met een trekker, oogsten met de maaidorser, en de oogst wegbrengen met de aanhanger. Pure regels,
// geen DOM, geen THREE en geen klok (scripts/werktuigen_test.mjs); boerderijwereld.js zet het in de wereld en voedt de regels met de plek langs de rij.
//
// Het werk gaat per cel van vijf meter langs de vier rijen van het perceel (zoals werkgang.js), in elke volgorde. Een rij werkt alleen met het werktuig
// omlaag en, als het werktuig dat vraagt, de aftakas aan; te hard werkt slordig (de helft telt), te langzaam of naast de rij niets.

import { MACHINE_CATALOGUS } from './percelen.js';
import { BAND, RIJEN, RIJ_LEN, HARD_REM, HARD_BOCHT, LAAD_AF, EIGEN_RUIMTE } from './werkgang.js';

// De snelheidsbanden van de werkgang hebben alleen de bijbaantaken; de vrije klussen (cultiveren, spuiten) krijgen hier hun eigen band.
export const BANDEN = { ...BAND, cultiveren: { vMin: 2.0, vMax: 6.0, tol: 2.4 }, spuiten: { vMin: 3.0, vMax: 7.0, tol: 2.6 } };
export const CEL = 5;
export const CELLEN = RIJ_LEN / CEL;
export const KLAAR_AANDEEL = 0.96;           // zo veel cellen bewerkt en het werk is klaar (de laatste meter hoef je niet te zoeken)

// Per werktuigtype: de taak die het doet, of de hef omlaag moet (ploeg en cultivator in de grond, zaaimachine en maaier op hoogte), of de aftakas aan moet,
// het gewas waar het voor is (maaier: gras), een kort woord voor de hints en de plek achter de trekker (m achter het midden).
export const WERKTUIG = {
  ploeg: { taak: 'ploegen', hef: true, pto: false, achter: 3.4, woord: 'ploeg' },
  cultivator: { taak: 'cultiveren', hef: true, pto: false, achter: 3.0, woord: 'cultivator' },
  zaaimachine: { taak: 'zaaien', hef: true, pto: true, achter: 3.0, woord: 'zaaimachine' },
  mestverspreider: { taak: 'bemesten', hef: false, pto: true, achter: 3.4, woord: 'mestverspreider' },
  spuit: { taak: 'spuiten', hef: false, pto: true, achter: 2.8, woord: 'spuit' },
  maaier: { taak: 'oogsten', hef: true, pto: true, achter: 2.8, woord: 'maaier', gewas: ['gras'] },
  aanhanger: { taak: null, hef: false, pto: false, achter: 5.0, woord: 'aanhanger', vervoer: true, kg: 8000 },
};
export const WERKTUIG_TYPES = Object.keys(MACHINE_CATALOGUS).filter((id) => MACHINE_CATALOGUS[id].soort === 'werktuig' && WERKTUIG[MACHINE_CATALOGUS[id].type]);
export const werktuigDef = (m) => (m && MACHINE_CATALOGUS[m.type] ? WERKTUIG[MACHINE_CATALOGUS[m.type].type] || null : null);
// De maaidorser oogst zelf (aftakas voor het dorsen, de maaitafel omlaag): geen werktuig nodig; hij kan geen gras.
export const MAAIDORSER = { taak: 'oogsten', hef: true, pto: true, nietGewas: ['gras'] };

const isTrekker = (m) => !!m && !!MACHINE_CATALOGUS[m.type] && MACHINE_CATALOGUS[m.type].type === 'trekker';
const isDorser = (m) => !!m && !!MACHINE_CATALOGUS[m.type] && MACHINE_CATALOGUS[m.type].type === 'maaidorser';
export const naamVan = (m) => (m && MACHINE_CATALOGUS[m.type] ? MACHINE_CATALOGUS[m.type].naam : 'Machine');

// --- koppelen, aftakas en hef --------------------------------------------------------------

// Een rig is een machine in de wereld met wat eraan hangt: { machine: uid, werktuig: uid of null, pto: bool, hef: 'omhoog' | 'omlaag', lading }.
export const nieuweRig = (machineUid) => ({ machine: machineUid, werktuig: null, pto: false, hef: 'omhoog', lading: null });

// Koppelen: alleen een trekker neemt een werktuig mee, een tegelijk, en een werktuig hangt aan een trekker tegelijk (bezet: de uid's die al hangen).
export function koppel(rig, trekker, werktuig, bezet = []) {
  if (!isTrekker(trekker)) return { ok: false, reden: 'Alleen een trekker kan een werktuig koppelen.' };
  if (!werktuigDef(werktuig)) return { ok: false, reden: 'Dat werktuig kun je nog niet koppelen.' };
  if (rig.werktuig) return { ok: false, reden: 'Er hangt al een werktuig achter: ontkoppel dat eerst.' };
  if (bezet.includes(werktuig.uid)) return { ok: false, reden: 'Dat werktuig hangt al aan een andere trekker.' };
  rig.werktuig = werktuig.uid;
  rig.pto = false; rig.hef = 'omhoog';
  return { ok: true, naam: naamVan(werktuig) };
}

export function ontkoppel(rig) {
  if (!rig.werktuig) return { ok: false, reden: 'Er hangt niets achter.' };
  if (rig.lading && rig.lading.kg > 0) return { ok: false, reden: 'De aanhanger is geladen: lever eerst af.' };
  rig.werktuig = null; rig.pto = false; rig.hef = 'omhoog';
  return { ok: true };
}

// Wat de rig kan doen met wat eraan hangt: { taak, hef, pto, gewas, nietGewas, bron } of null (niets om mee te werken).
export function werkSet(rig, machine, werktuig) {
  if (isDorser(machine)) return { ...MAAIDORSER, bron: 'machine' };
  const d = werktuig && rig.werktuig === werktuig.uid ? werktuigDef(werktuig) : null;
  if (!d || !d.taak) return null;
  return { taak: d.taak, hef: d.hef, pto: d.pto, gewas: d.gewas || null, nietGewas: null, bron: 'werktuig' };
}

// Heeft de rig een aftakas of een hef om te bedienen? (voor de hints)
export function bedienbaar(rig, machine, werktuig) {
  const set = werkSet(rig, machine, werktuig);
  const d = werktuig && rig.werktuig === werktuig.uid ? werktuigDef(werktuig) : null;
  return { pto: !!(set && set.pto) || !!(d && d.pto), hef: !!(set && set.hef) || !!(d && d.hef) };
}

export function wisselPto(rig, machine, werktuig) {
  if (!bedienbaar(rig, machine, werktuig).pto) return { ok: false, reden: 'Er zit niets op de aftakas.' };
  rig.pto = !rig.pto;
  return { ok: true, aan: rig.pto };
}

export function wisselHef(rig, machine, werktuig) {
  if (!bedienbaar(rig, machine, werktuig).hef) return { ok: false, reden: 'Er hangt niets aan de hef.' };
  rig.hef = rig.hef === 'omlaag' ? 'omhoog' : 'omlaag';
  return { ok: true, omlaag: rig.hef === 'omlaag' };
}

// Werkt de rig nu? Hef omlaag als dat moet, aftakas aan als dat moet.
export const werktNu = (set, rig) => !!set && (!set.hef || rig.hef === 'omlaag') && (!set.pto || rig.pto);

// Wat ontbreekt er nog om te werken, in gewone woorden (voor de hint): 'Hef omlaag (T)', 'Aftakas aan (G)'.
export function ontbreekt(set, rig, toetsen = { pto: 'G', hef: 'T' }) {
  const uit = [];
  if (set && set.hef && rig.hef !== 'omlaag') uit.push(`hef omlaag (${toetsen.hef})`);
  if (set && set.pto && !rig.pto) uit.push(`aftakas aan (${toetsen.pto})`);
  return uit;
}

// Past het werktuig of de machine bij het gewas dat nu op het veld staat? Voor oogsten telt het gewas dat op het veld staat; gras is voor de maaier, de rest voor de maaidorser.
export function pastBij(set, taak, gewas) {
  if (!set || set.taak !== taak) return { ok: false, reden: 'Dit werktuig doet een andere klus.' };
  if (taak === 'oogsten') {
    if (set.gewas && !set.gewas.includes(gewas)) return { ok: false, reden: 'De maaier is voor gras; voor dit gewas heb je de maaidorser nodig.' };
    if (set.nietGewas && set.nietGewas.includes(gewas)) return { ok: false, reden: 'De maaidorser kan geen gras maaien: neem de maaier achter een trekker.' };
  }
  return { ok: true };
}

// --- het veldwerk, cel voor cel ------------------------------------------------------------------

// Een klus op het veld: per rij CELLEN cellen: 0 nog niet, 1 slordig (te hard), 2 netjes. fractie = hoe netjes, klaar = bijna alles bewerkt.
export function nieuwWerk(taak, { eigen = true } = {}) {
  const band = BANDEN[taak] || { vMin: 2, vMax: 6, tol: 2.4 };
  return {
    taak, cellen: Array.from({ length: RIJEN }, () => new Array(CELLEN).fill(0)), gedaan: 0, goed: 0, klaar: false, tehard: 0, scheefT: 0,
    vMin: band.vMin, vMax: band.vMax, tol: band.tol + (eigen ? EIGEN_RUIMTE : 0), laatste: Array.from({ length: RIJEN }, () => null),
  };
}

export const totaalCellen = () => RIJEN * CELLEN;
export const aandeelKlaar = (w) => w.gedaan / totaalCellen();
export const fractieWerk = (w) => (w.gedaan === 0 ? 0 : w.goed / totaalCellen());

// Eén stap: de plek van het werktuig langs elke rij (pos[i] = { along, across } of null), de snelheid (m/s), of de rig werkt en de tijd. Geeft gebeurtenissen:
// { type: 'cel' } (er is iets bewerkt), 'tehard', 'scheef', 'klaar'.
export function werkStap(w, pos, speed, werkt, dt) {
  const ev = [];
  if (w.klaar) return ev;
  let binnenAls = false;
  for (let i = 0; i < RIJEN; i++) {
    const p = pos[i];
    if (!p) { w.laatste[i] = null; continue; }
    const binnen = Math.abs(p.across) <= w.tol && p.along > -1 && p.along <= RIJ_LEN + 3;
    if (binnen) binnenAls = true;
    if (!binnen || !werkt || speed < w.vMin) { w.laatste[i] = null; continue; }
    const nu = Math.max(0, Math.min(RIJ_LEN - 0.01, p.along));
    const van = w.laatste[i] == null || Math.abs(nu - w.laatste[i]) > 8 ? nu : Math.min(w.laatste[i], nu);
    w.laatste[i] = nu;
    const hard = speed > w.vMax;
    for (let c = Math.floor(van / CEL); c <= Math.floor(nu / CEL); c++) {
      if (w.cellen[i][c]) continue;
      w.cellen[i][c] = hard ? 1 : 2;
      w.gedaan++; w.goed += hard ? 0.5 : 1;
      ev.push({ type: 'cel', rij: i, cel: c, hard });
    }
    if (hard) { w.tehard += dt; ev.push({ type: 'tehard' }); }
  }
  // schuin of ernaast terwijl je er al midden in zat: een waarschuwing (niet bij het opdraaien)
  if (!binnenAls && werkt && w.gedaan > 0 && speed >= w.vMin) { w.scheefT += dt; if (w.scheefT > 1.6) { w.scheefT = 0; ev.push({ type: 'scheef' }); } } else w.scheefT = 0;
  if (aandeelKlaar(w) >= KLAAR_AANDEEL) { w.klaar = true; ev.push({ type: 'klaar' }); }
  return ev;
}

// --- de aanhanger ---------------------------------------------------------------------------------

export const AANHANGER_KG = WERKTUIG.aanhanger.kg;

// Laden bij de schuur: wat in de werkschuur ligt (b.schuur) gaat op de aanhanger, voor zover het past. Verandert de schuur. { ok, kg } of { ok: false, reden }.
export function laad(rig, schuur) {
  if (!(schuur.kg > 0)) return { ok: false, reden: 'De schuur is leeg: er ligt niets om te laden.' };
  if (rig.lading && rig.lading.kg > 0) return { ok: false, reden: 'De aanhanger is al geladen.' };
  const kg = Math.min(AANHANGER_KG, Math.round(schuur.kg));
  rig.lading = { gewas: schuur.gewas, kg, kwaliteit: 1, veld: schuur.veld || null };
  schuur.kg -= kg;
  if (schuur.kg <= 0) { schuur.gewas = null; schuur.kg = 0; schuur.kwaliteit = 1; schuur.veld = null; }
  return { ok: true, kg };
}

// Onderweg: hard remmen en scherpe bochten morsen lading (zoals de afleverrit in werkgang.js). Geeft true als er gemorst werd.
export function rijdMetLading(rig, { decel = 0, lat = 0, speed = 0 }, dt) {
  const l = rig.lading;
  if (!l || !(l.kg > 0)) return false;
  let mors = false;
  if (decel > HARD_REM || lat > HARD_BOCHT) { l.kwaliteit = Math.max(0, l.kwaliteit - dt * LAAD_AF / 100); mors = true; }
  if (speed > 9) { l.kwaliteit = Math.max(0, l.kwaliteit - dt * 0.02); mors = true; }
  return mors;
}

// De aanhanger leveren: de lading wordt een vracht voor boerderij.lever (kwaliteit); de aanhanger is leeg.
export function ledig(rig) {
  const l = rig.lading;
  rig.lading = null;
  return l;
}
