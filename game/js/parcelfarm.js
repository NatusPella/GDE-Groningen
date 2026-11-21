// De brug tussen Bezit en de boerderij (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.1 en 5.3): een gekocht perceel uit de index werkt
// als veld zoals de vaste twaalf van percelen.js. Dit bestand maakt uit een index- of bezitregel een perceeldefinitie (naam, soort, ha, bodem),
// meldt die aan in het register van percelen.js, zet het perceel in het bedrijf van de boerderij en kent de werkeenheid (hoe een groot
// perceel meer rondes vraagt in plaats van meer opbrengst per ronde). Puur: geen DOM, geen THREE, geen klok, geen Math.random, geen opslag
// (scripts/parcelfarm_test.mjs). Samen spelen: bezit en boerderij zijn per speler (#429); dit raakt alleen de eigen stand.

import * as B from './boerderij.js';
import * as PC from './percelen.js';
import { soilQuality, parcelName, regionId } from './bezitprijs.js';
import { buyParcel } from './bezit.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const SOORT = { w: 'weiland', a: 'akker', b: 'boomgaard' };

// ---- adapters: index- of bezitregel -> perceeldefinitie ----
// kind: 'w' | 'a' | 'b' (anders akker). region: een streek-id of { id } van bezitprijs.js. place: de dichtstbijzijnde woonplaats.
export function parcelDefOf(id, kind, ha, { region = 'overig', place = 'het Hogeland', name = null } = {}) {
  const k = kind === 'w' || kind === 'b' ? kind : 'a';
  const r = regionId(region);
  return {
    id, naam: name || parcelName({ id, kind: k }, place), soort: SOORT[k], plaats: place, ha: Math.max(0.1, Number(ha) || 0.1),
    bodem: soilQuality(id, r), region: r, kind: k, koop: 0, huurDag: 0, eigenaar: 'Jijzelf', aanbod: 'eigen', extra: true,
  };
}
// Uit een perceel van de index ({ id, kind, ha, ... }) of uit een bezitregel ({ k, ha }) met het id erbij.
export const parcelDefFromIndex = (p, ctx = {}) => parcelDefOf(p.id, p.kind, p.ha, ctx);
export const parcelDefFromRecord = (id, rec, ctx = {}) => parcelDefOf(id, rec.k, rec.ha, ctx);

// ---- het register en het bedrijf ----
// ctx.region(id) en ctx.place(id) (beide optioneel) geven de streek en de woonplaats van een perceel; zonder gelden 'overig' en het Hogeland.
const ctxFor = (ctx, id) => ({ region: (ctx && ctx.region && ctx.region(id)) || 'overig', place: (ctx && ctx.place && ctx.place(id)) || undefined });

// Alle niet-legacy percelen van het bezit in het register van percelen.js zetten (een bekend id wordt ververst). Geeft het aantal nieuw aangemelde.
export function registerOwnedParcels(bezit, ctx = {}) {
  let n = 0;
  for (const id of Object.keys(bezit.parcels)) {
    const rec = bezit.parcels[id];
    if (rec.lg || !PC.EXTRA_ID.test(id)) continue;
    const had = !!PC.perceelDef(id);
    if (PC.registreerExtraPerceel(parcelDefFromRecord(id, rec, ctxFor(ctx, id))) && !had) n++;   // opnieuw aanmelden ververst streek en plaats
  }
  return n;
}

// Het perceel in het bedrijf van de boerderij zetten (gekocht). Idempotent.
export function adoptParcel(farm, id, day = 0) {
  if (!PC.isPerceelId(id)) return false;
  if (!farm.bedrijf.percelen[id]) farm.bedrijf.percelen[id] = { status: 'gekocht', sinds: Math.max(0, Math.round(day * PC.DAG_UREN)) };
  return true;
}

// Een verkocht perceel uit het bedrijf halen (de vaste percelen en de Zonnehoek blijven). De stand van het veld en het plan gaan mee weg.
export function releaseParcel(farm, id) {
  if (!PC.extraPerceelIds().includes(id) || !farm.bedrijf.percelen[id]) return false;
  delete farm.bedrijf.percelen[id];
  delete farm.velden[id]; delete farm.plan[id]; delete farm.bodemlog[id]; delete farm.posities[id];
  if (farm.bedrijf.actief === id) farm.bedrijf.actief = PC.START_PERCEEL;
  B.syncVeld(farm);
  PC.vergeetExtraPerceel(id);
  return true;
}

// Bezit en boerderij gelijk zetten (na het laden, na een koop of verkoop): wat van jou is staat in het register en het bedrijf, wat weg is niet meer.
export function syncFarmWithBezit(farm, bezit, ctx = {}, day = 0) {
  const registered = registerOwnedParcels(bezit, ctx);
  let adopted = 0, released = 0;
  for (const id of Object.keys(bezit.parcels)) if (PC.EXTRA_ID.test(id) && !bezit.parcels[id].lg && !farm.bedrijf.percelen[id] && adoptParcel(farm, id, day)) adopted++;
  for (const id of PC.extraPerceelIds()) if (!bezit.parcels[id] && releaseParcel(farm, id)) released++;
  return { registered, adopted, released };
}

// Koop in één stap: bezit.buyParcel plus register en bedrijf. { ok, cost } of { ok: false, why }.
export function acquireParcel(bezit, farm, indexParcel, price, day, money, ctx = {}) {
  const r = buyParcel(bezit, indexParcel, price, day, money);
  if (!r.ok) return r;
  syncFarmWithBezit(farm, bezit, { region: () => ctx.region, place: () => ctx.place }, day);
  return r;
}

// ---- werkeenheid (5.3) ----
// Eén werkveld is HA_REF (1,2 ha): vier rijen van 100 m. De oogst van een perceel volgt de grootte tot x4 (boerderij.opbrengstKg), maar de arbeid
// was vast; daarom schaalt het aantal rondes (de rijlengte) mee met sqrt(ha / 1,2), tot x3. De opbrengst per werkronde stijgt dan hooguit
// tot MAX_YIELD_PER_ROUND (bij 4,8 ha), waar hij zonder deze schaling tot x4 steeg.
export const WORK_CAP = 3;
export const WORK_MIN = 0.5;
export const MAX_YIELD_PER_ROUND = 2;
export const ROWS = 4;
export const ROW_LENGTH_M = 100;
export const ROW_SPACING_M = 3.5;
export const workFactor = (ha) => clamp(Math.sqrt(Math.max(0, Number(ha) || 0) / B.HA_REF), WORK_MIN, WORK_CAP);
export const yieldFactor = (ha) => clamp(Math.max(0, Number(ha) || 0) / B.HA_REF, 0.5, 4);       // zoals boerderij.opbrengstKg
export const yieldPerRound = (ha) => yieldFactor(ha) / workFactor(ha);
export const oldYieldPerRound = (ha) => yieldFactor(ha);                                         // vaste arbeid: de scheefheid van voor Bezit
export const rowLayout = (ha) => ({ rows: ROWS, rowLength: Math.round(ROW_LENGTH_M * workFactor(ha)), spacing: ROW_SPACING_M, factor: workFactor(ha) });

// Waar iemand staat als hij een deel `progress` (0..1) van de rijen van een perceel heeft gedaan: de rijen worden heen en terug gereden.
// center is { x, y, a } (a = de hoek van de rijen), zoals b.perceel en b.posities.
export function rowPose(layout, center, progress) {
  const total = layout.rows * layout.rowLength;
  const dist = clamp(Number.isFinite(progress) ? progress : 0, 0, 1) * total;
  const row = Math.min(layout.rows - 1, Math.floor(dist / layout.rowLength));
  const along = dist - row * layout.rowLength;
  const u = row % 2 === 0 ? along - layout.rowLength / 2 : layout.rowLength / 2 - along;
  const v = (row - (layout.rows - 1) / 2) * layout.spacing;
  const a = (center && center.a) || 0, cx = (center && center.x) || 0, cy = (center && center.y) || 0;
  return {
    x: Math.round((cx + u * Math.cos(a) - v * Math.sin(a)) * 10) / 10,
    y: Math.round((cy + u * Math.sin(a) + v * Math.cos(a)) * 10) / 10,
    heading: a + (row % 2 === 0 ? 0 : Math.PI), row,
  };
}

// ---- werken op een willekeurig perceel (niet alleen het actieve) ----
// boerderij.rondTaakAf werkt op het actieve veld. Dit zet het gevraagde perceel even actief, voert fn uit en zet alles terug, zodat het
// personeel, de loonwerker en de bulkacties exact dezelfde regels gebruiken als het handwerk (geen tweede model dat kan afwijken).
export function withField(farm, id, fn) {
  if (!farm.bedrijf.percelen[id]) return null;
  const sv = { veld: farm.veld, veldVan: farm.veldVan, actief: farm.bedrijf.actief };
  const target = id === sv.veldVan ? farm.veld : farm.velden[id] || B.nieuwVeld();
  if (id !== sv.veldVan) { delete farm.velden[id]; farm.veld = target; farm.veldVan = id; farm.bedrijf.actief = id; }
  try {
    return fn();
  } finally {
    if (id !== sv.veldVan) {
      if (farm.veld.fase !== 'braak' || farm.veld.stoppel) farm.velden[id] = farm.veld;
      farm.veld = sv.veld; farm.veldVan = sv.veldVan; farm.bedrijf.actief = sv.actief;
    }
  }
}

// De fase van een veld voor wie werk verdeelt: 'braak' (ook stoppel), 'geploegd', 'groeit' of 'rijp'; uren is de speltijd (standaard farm.uren).
export function fieldPhase(farm, id, uren = farm.uren) {
  const v = B.veldStand(farm, id);
  if (v.fase === 'gezaaid') { const g = B.GEWASSEN[v.gewas]; return g && Number.isFinite(v.gezaaidOp) && uren - v.gezaaidOp >= g.groeiUren ? 'rijp' : 'groeit'; }
  return v.fase === 'geploegd' ? 'geploegd' : 'braak';
}

// Het aantal werkvelden van een perceel (voor wie alle rondes werkt) en de schaal tegenover wat opbrengstKg al meetelt.
export const workUnits = (ha) => Math.max(0.5, (Number(ha) || 0) / B.HA_REF);
export const unitScale = (ha) => workUnits(ha) / yieldFactor(ha);

// Eén taak uitvoeren op een perceel met de regels van de boerderij. { taak, fractie, kg?, gewas?, load?, kosten }: load is de oogst
// (de schuur van de boerderij blijft onaangeroerd), kosten wat rondTaakAf aan huur en materiaal telde (betalen doet de aanroeper).
export function workField(farm, id, taak, { fractie = 1, opbrengst = 1, gewas = null } = {}) {
  return withField(farm, id, () => {
    const keep = farm.schuur;
    const g = gewas || B.planVoor(farm, id);
    const kosten = B.kosten(farm, taak, g, { vrij: true });
    const r = B.rondTaakAf(farm, taak, fractie, { gewas: g, vrij: true, opbrengst });
    const load = taak === 'oogsten' && farm.schuur !== keep ? farm.schuur : null;
    farm.schuur = keep;
    return { ...r, load, kosten };
  });
}
