// Zichtbare voertuigschade (#205): zones, losse onderdelen en de fase van een voertuig.
// Pure regels, geen DOM en geen THREE (scripts/vehicledamage_test.mjs).
//
// De deuken zelf staan al in v.dentLog ([lx, lz, sterkte] per klap, de laatste 12; lx langs
// de neus, lz opzij) en worden door models3d_vehicles.js op het mesh getekend. Alles hier is
// een afgeleide van dat logboek en v.health, dus er komt geen nieuwe opslag bij en een
// reparatie (dentLog leeg) zet alles in één keer terug. Bloedloos: alleen plaatwerk, glas,
// rook en vuur; een bestuurder wordt hier nooit getoond of geraakt.

import { staatTekst } from './studentenfiets.js';

const ZONES = ['voor', 'achter', 'zijkant'];

// Welke zone een klap raakte; len en wid zijn de maten van het model.
export function zoneOf(lx, lz, len, wid) {
  const a = Math.abs(lx) / Math.max(0.1, len / 2), b = Math.abs(lz) / Math.max(0.1, wid / 2);
  if (a >= b) return lx >= 0 ? 'voor' : 'achter';
  return 'zijkant';
}

// Som van de klapsterktes per zone.
export function zoneTotals(dentLog, len = 4, wid = 1.8) {
  const t = { voor: 0, achter: 0, zijkant: 0 };
  if (!Array.isArray(dentLog)) return t;
  for (const d of dentLog) {
    if (!Array.isArray(d) || !Number.isFinite(d[0]) || !Number.isFinite(d[1])) continue;
    const s = Number.isFinite(d[2]) ? Math.max(0, d[2]) : 0;
    t[zoneOf(d[0], d[1], len, wid)] += s;
  }
  return t;
}

// Onderdelen die los kunnen raken: in welke zone, vanaf welke totale sterkte, wat de garage rekent.
export const ONDERDELEN = {
  grille: { label: 'Grille', zone: 'voor', at: 1.0, price: 15 },
  spiegels: { label: 'Spiegels', zone: 'zijkant', at: 0.9, price: 12 },
  sierdoppen: { label: 'Sierdoppen', zone: 'zijkant', at: 1.6, price: 8 },
  uitlaat: { label: 'Uitlaat', zone: 'achter', at: 1.2, price: 20 },
};

// Welke onderdelen er los zijn bij deze zonesommen.
export function losseOnderdelen(totals) {
  return Object.keys(ONDERDELEN).filter((id) => (totals[ONDERDELEN[id].zone] || 0) >= ONDERDELEN[id].at);
}

// Wat er door deze ene klap bij is gekomen: [id, ...] tussen twee logboeken.
export function nieuwLos(vorigLog, nieuwLog, len, wid) {
  const was = new Set(losseOnderdelen(zoneTotals(vorigLog, len, wid)));
  return losseOnderdelen(zoneTotals(nieuwLog, len, wid)).filter((id) => !was.has(id));
}

export const onderdelenPrijs = (ids) => ids.reduce((s, id) => s + (ONDERDELEN[id] ? ONDERDELEN[id].price : 0), 0);

// Een fiets (#402): wat eraan mankeert is de studentenstaat van het model (model.student: een scheef voorspatbord, geen voorlicht,
// blauwe banden, rammelt) plus wat een klap voorop erbij maakt: vanaf FIETS_SPATBORD_AT is het voorspatbord scheef, vanaf
// FIETS_LICHT_AT is het voorlicht los. Een nieuwe fiets heeft niets; bij het opnieuw opbouwen van het mesh staan ze er weer op.
export const FIETS_SPATBORD_AT = 0.6;
export const FIETS_LICHT_AT = 1.2;
export function fietsStaat(v, len = 1.75, wid = 0.5) {
  const s = { spatbord: false, licht: false, blauw: false, rammel: false, ...((v && v.model && v.model.student) || {}) };
  const t = zoneTotals(v && v.dentLog, len, wid);
  if (t.voor >= FIETS_SPATBORD_AT) s.spatbord = true;
  if (t.voor >= FIETS_LICHT_AT) s.licht = true;
  return s;
}

// De fases van een voertuig, van heel tot wrak.
export const SMOKE_HEALTH = 55; // vanaf hier rookt de motorkap
export const FIRE_HEALTH = 30; // en hieronder staat hij in brand (vehicle.js VEHICLE_FIRE_HEALTH_THRESHOLD)
const DENT_FROM = 0.4; // vanaf deze totale klapsterkte telt hij als gedeukt

// Een scheve of losse motorkap laat de motor eerder roken: vanaf deze klapsterkte vóór en deze gezondheid.
const KAP_ROOK_VANAF = 0.7; // gelijk aan scheefAt van de kap in vehicledoors.js
const KAP_ROOK_HEALTH = 78;
export function kapRookt(v, len, wid) {
  if (!v || v.wrecked) return false;
  const h = Number.isFinite(v.health) ? v.health : 100;
  return h <= KAP_ROOK_HEALTH && zoneTotals(v.dentLog, len, wid).voor >= KAP_ROOK_VANAF;
}

// v: { health, wrecked, disabled, dentLog }
export function schadeFase(v, len, wid) {
  if (!v) return 'heel';
  if (v.wrecked) return 'wrak';
  const h = Number.isFinite(v.health) ? v.health : 100;
  if (v.disabled || h <= FIRE_HEALTH) return 'brand';
  if (h <= SMOKE_HEALTH || kapRookt(v, len, wid)) return 'rook';
  const t = zoneTotals(v.dentLog, len, wid);
  return h < 90 || t.voor + t.achter + t.zijkant >= DENT_FROM ? 'gedeukt' : 'heel';
}

// Wat er bij een fase te zien is: rook en vlammen, en hoe groot.
export function faseEffect(fase) {
  switch (fase) {
    case 'rook': return { rook: 0.6, vlam: 0 };
    case 'brand': return { rook: 1, vlam: 1 };
    case 'wrak': return { rook: 1, vlam: 1 };
    default: return { rook: 0, vlam: 0 };
  }
}

const FASE_TEKST = { heel: 'Heel', gedeukt: 'Gedeukt', rook: 'Rookt', brand: 'Staat in brand', wrak: 'Wrak' };
const faseTekst = (f) => FASE_TEKST[f] || FASE_TEKST.heel;

// Een zin voor het garagemenu: "Gedeukt: voor en zijkant. Los: spiegels".
export function schadeTekst(v, len, wid) {
  const fase = schadeFase(v, len, wid);
  const t = zoneTotals(v && v.dentLog, len, wid);
  const zones = ZONES.filter((z) => t[z] >= DENT_FROM);
  const join = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} en ${a[a.length - 1]}` : a[0]);
  const los = losseOnderdelen(t).map((id) => ONDERDELEN[id].label.toLowerCase());
  const fiets = v && v.isBike ? staatTekst(fietsStaat(v, len, wid)) : '';
  return [faseTekst(fase) + (zones.length ? ` (deuken ${join(zones)})` : ''), los.length ? `Los: ${join(los)}` : '', fiets ? `Fiets: ${fiets}` : ''].filter(Boolean).join('. ');
}
