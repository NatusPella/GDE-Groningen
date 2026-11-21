// Sponsorpanden (epic Bezit #1095, #1102; voetbalcarrière #1118): het pand bij een sponsorovereenkomst, uit de Bezit-pandindex. Puur op de kern na (scripts/sponsorpanden_test.mjs).
// findSponsorBuilding(type, [x, y]) geeft het OSM-id van het dichtstbijzijnde bedrijfspand dat past bij het sponsortype (SORTS[..].pand in voetbalsponsors.js) en dat te koop is
// via de gewone Bezit-flow (koopPand); de uitsluitlijst (businessexclusion.js) beslist, een pand dat al van de speler is mag ook. De verzonnen sponsornaam komt als gevelnaam op dat pand
// (sponsorNameOf). Samen spelen: de sponsorstand is van de carrière van de speler zelf (lokaal), de naam is dus alleen in het eigen spel zichtbaar.
// De eigenaar van het pand krijgt op thuiswedstrijddagen hooguit +10% op de omzet van dat pand (ownerBonus in voetbalsponsors.js) via bezitlive.setEventHook, nooit een tweede uitbetaling.
// Koppeling zonder importcyclus: registerSponsorPanden() zet de interface in voetbalsponsors.setPandIndex en de omzethaak in bezitlive; de carrière roept syncSponsorDeals(sponsors) aan na accept of laden.
import * as L from './bezitlive.js';
import { OWNER_BONUS_MAX, ownerBonus, setPandIndex, resolveMissingPanden } from './voetbalsponsors.js';

export { OWNER_BONUS_MAX };
export const SEARCH_RADII = [400, 1200, 4000, 12000];
// Per pandtype van de sponsor: welke OSM-pandsoorten uit de pandindex passen en hoe groot het pand ongeveer is (m2).
// Een zuivelhoeve of energiebedrijf is een bedrijfspand (industrial), een bank een kantoor of winkelpand, de rest een winkelpand.
const SHOP = ['retail', 'commercial', 'supermarket', 'kiosk'];
export const SPEC = {
  dairy: { types: ['industrial', 'warehouse', 'farm_auxiliary', 'commercial'], m2: [150, 4000] },
  bakery: { types: SHOP, m2: [40, 400] },
  doityourself: { types: ['retail', 'commercial', 'warehouse', 'industrial'], m2: [500, 8000] },
  car: { types: ['retail', 'commercial', 'industrial', 'service', 'warehouse'], m2: [250, 5000] },
  fast_food: { types: SHOP, m2: [30, 250] },
  bank: { types: ['commercial', 'office', 'retail'], m2: [100, 2500] },
  supermarket: { types: ['supermarket', 'retail', 'commercial'], m2: [350, 6000] },
  bicycle: { types: SHOP, m2: [60, 600] },
  energy: { types: ['industrial', 'office', 'service', 'commercial'], m2: [200, 6000] },
};
const typeRank = (spec, t) => { const i = spec.types.indexOf(t); return i < 0 ? -1 : i; };

// De kern: kies uit rijen { osm, x, y, m2, type, landmark } het beste pand. Dichtbij wint, een nauwere typeovereenkomst telt als een kleine afstandskorting, een monument nooit.
// ok(row) -> bool laat de aanroeper uitsluiten (niet te koop); taken is een Set met OSM-id's die al een andere sponsor hebben.
export function pickSponsorBuilding(rows, pandType, xy, { ok = () => true, taken = null } = {}) {
  const spec = SPEC[pandType];
  if (!spec || !Array.isArray(xy) || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return null;
  let best = null, bs = Infinity;
  for (const r of rows || []) {
    if (!r || r.landmark || (taken && taken.has(r.osm))) continue;
    const rank = typeRank(spec, r.type);
    if (rank < 0 || !(r.m2 >= spec.m2[0] && r.m2 <= spec.m2[1])) continue;
    const score = Math.hypot(r.x - xy[0], r.y - xy[1]) * (1 + rank * 0.15) + r.osm * 1e-9;     // het OSM-id breekt gelijke stand: deterministisch
    if (score < bs && ok(r)) { bs = score; best = r; }
  }
  return best ? best.osm : null;
}

// De sponsorstand van de carrière: osm -> naam, gevuld door syncSponsorDeals.
let names = new Map();
export function syncSponsorDeals(sponsors) {
  names = new Map();
  for (const s of (sponsors && sponsors.slots) || []) if (s && s.accepted && Number.isFinite(s.osm) && typeof s.naam === 'string') names.set(s.osm, s.naam);
  return names.size;
}
export const sponsorNameOf = (osm) => names.get(osm) || null;
export const isSponsorPand = (osm) => names.has(osm);
export const hasSponsorPanden = () => names.size > 0;

export function findSponsorBuilding(type, xy, ctx = {}) {
  const ix = ctx.index || (L.getIndexNow() || null);
  if (!ix || !ix.buildings || !SPEC[type] || !Array.isArray(xy)) return null;
  const ok = ctx.ok || ((r) => { const o = L.buildingOffer(r.osm); return !!o && (o.forSale || o.mine); });
  const taken = new Set(names.keys());
  for (const r of SEARCH_RADII) {
    const hit = pickSponsorBuilding(ix.buildings.near(xy[0], xy[1], r), type, xy, { ok, taken });
    if (hit != null) return hit;
  }
  return null;
}

// De omzetfactor voor de eigenaar op een thuiswedstrijddag: 1 tot 1 + OWNER_BONUS_MAX; nooit een uitbetaling.
export function ownerRevMult(osm, { isHomeDay = false, form = 1 } = {}) {
  if (!isSponsorPand(osm)) return 1;
  return ownerBonus({ isHomeDay, ownsPand: !!L.getBezit().buildings.has(osm), form }).factor;
}
// De omzethaak voor bezitlive: vermenigvuldigt event.revMult. homeDayOf(kalenderdag) en formOf() komen van de carrière (standaard: nooit een thuiswedstrijd).
let homeDayOf = () => false, formOf = () => 1;
export const setCareerHooks = (h = {}) => { homeDayOf = h.homeDayOf || (() => false); formOf = h.formOf || (() => 1); };
export function eventModsFor(osm, mods, day) {
  const f = ownerRevMult(osm, { isHomeDay: !!homeDayOf(day), form: formOf() });
  if (f === 1 || (mods && mods.closed)) return mods;
  return { ...mods, revMult: (mods.revMult || 1) * f };
}

// De carrière aan de pandkant: de sponsorstand (naam per pand) volgt elke wijziging van de carrière en wordt nu meteen gelezen (na laden); de thuisbonus telt voor vandaag en voor eerder onthouden thuiswedstrijddagen.
// c = { getCareer, subscribe, homeMatchToday(career, getClub), formOf(career), getClub, today() } uit voetbalcarrierelive.js en voetbalcarriere.js; geeft de afmelder terug.
// Optioneel: replaceCareer(c) en clubPlace(clubId) -> [x, y]; dan krijgt een sponsor die voor het laden van de pandindex is aangenomen (osm null) zijn pand alsnog zodra de index er is.
export function linkCareer({ getCareer, subscribe, homeMatchToday, formOf, getClub, today = () => L.calToday(), replaceCareer = null, clubPlace = null } = {}) {
  // een thuiswedstrijddag wordt onthouden zodra hij open staat (daarna is hij gespeeld): ook een rekendag na slapen of reizen krijgt de bonus (hoogstens 30 dagen, alleen in dit spel)
  const homeDays = new Set();
  const noteHome = (c) => { const d = today(); if (homeMatchToday(c, getClub)) { homeDays.add(d); if (homeDays.size > 30) homeDays.delete(homeDays.values().next().value); } };
  setCareerHooks({
    homeDayOf: (day) => homeDays.has(day) || (day === today() && !!homeMatchToday(getCareer(), getClub)),
    formOf: () => formOf(getCareer()),
  });
  const sync = (c) => { noteHome(c); return syncSponsorDeals(c && c.sponsors); };
  sync(getCareer());
  const off = subscribe(sync);
  const offIndex = replaceCareer && clubPlace ? L.onIndexReady(() => resolvePendingSponsors({ getCareer, replaceCareer, clubPlace })) : () => {};
  return () => { off(); offIndex(); };
}
// Zoek het pand voor aangenomen overeenkomsten zonder pand; geeft het aantal gevonden panden (de carrière wordt dan vervangen, wat de sponsorstand ververst).
export function resolvePendingSponsors({ getCareer, replaceCareer, clubPlace }) {
  const c = getCareer();
  if (!c || !c.sponsors || !c.club) return 0;
  const r = resolveMissingPanden(c.sponsors, { find: (type, xy) => findSponsorBuilding(type, xy) }, clubPlace(c.club));
  if (!r.changed) return 0;
  replaceCareer({ ...c, sponsors: r.sponsors });
  return r.changed;
}

export function registerSponsorPanden() {
  setPandIndex({ find: (type, xy) => findSponsorBuilding(type, xy) });
  L.setEventHook(eventModsFor);
}
