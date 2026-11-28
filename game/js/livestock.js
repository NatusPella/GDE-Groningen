// Vee op een perceel (epic #1095, #1101; ontwerp docs/BEZIT-21-11.md 5.4): melkvee (2,5 per ha), schapen (10 per ha) en kippen (een hok van
// 200). Een lichte sim per speldag: voer (eigen gras of hooi uit de opslag), melk, eieren en wol, ziekte als gebeurtenis die de aanroeper
// invoert (de events van 5.8 staan in een ander pakket), en de producten die naar de opslag of de verkoop gaan. Puur: geen DOM, geen THREE,
// geen klok, geen Math.random, geen opslag (scripts/livestock_test.mjs). De kudde in beeld is een afspiegeling van het aantal: hoogstens
// twaalf dieren (visibleAnimals). Altijd zomer: het vee staat buiten, er is geen stalperiode.
// Samen spelen: het vee is per speler (#429); een gast ziet het niet en deelt het niet.

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const VISIBLE_MAX = 12;
// perHa: dieren per hectare (kippen: een vast hok); voer: kg per dier per speldag; grazen: het dier eet van de eigen wei; producten per dier per speldag.
export const SPECIES = {
  melkvee: { naam: 'Melkvee', perHa: 2.5, hok: 0, kind: ['w'], voer: 18, grazen: true, product: 'melk', perDag: 22, eenheid: 'liter' },
  schapen: { naam: 'Schapen', perHa: 10, hok: 0, kind: ['w'], voer: 2.5, grazen: true, product: 'wol', perDag: 0.12, eenheid: 'kg' },
  kippen: { naam: 'Kippen', perHa: 0, hok: 200, kind: ['w'], voer: 0.12, grazen: false, product: 'eieren', perDag: 0.8, eenheid: 'stuks' },
};
export const SPECIES_IDS = Object.keys(SPECIES);
export const PRODUCT_PRICE = { melk: 0.45, wol: 2.4, eieren: 0.2 };   // euro per liter, kg of stuk
export const PASTURE_KG_HA_DAY = 90;      // wat een weide per hectare per speldag aan gras geeft (een zomer lang)
export const FEED_PRICE = { gras: 0.07, hooi: 0.09, graan: 0.15 };    // euro per kg als je voer bijkoopt
export const SICK_FACTOR = 0.25;          // een zieke kudde geeft een kwart
export const SICK_DAYS = 3;
export const ROBOT_FACTOR = 0.9;          // zonder melkrobot geeft de melk 10% minder (te laat of onregelmatig gemolken)
export const MAX_HERD = 5000;
export const KLUS_VOER_BONUS = 1.05;     // zelf voeren (extra hooi en een praatje) geeft 5% meer productie

// ---- aantallen ----
export const canKeep = (sp, kind, ha) => !!SPECIES[sp] && SPECIES[sp].kind.includes(kind) && (SPECIES[sp].hok > 0 ? ha >= 0.2 : Math.floor(ha * SPECIES[sp].perHa) >= 1);
export function capacityOf(sp, ha) {
  const s = SPECIES[sp];
  if (!s || !(ha > 0)) return 0;
  return s.hok > 0 ? (ha >= 0.2 ? s.hok : 0) : Math.floor(ha * s.perHa + 1e-9);
}
// Hoeveel dieren er in beeld staan voor een kudde van n: elk dier tot twaalf, daarboven twaalf (de rest "achter de heuvel").
export const visibleAnimals = (n, max = VISIBLE_MAX) => clamp(Math.floor(Number.isFinite(n) ? n : 0), 0, Math.max(0, max));

// ---- opslag: { <perceel>: { sp, n, sick } } ----
export const newHerds = () => ({});
export function normalizeHerds(raw, validId = () => true) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of Object.keys(raw).slice(0, 20000)) {
    const h = raw[id];
    if (!h || typeof h !== 'object' || !SPECIES[h.sp] || !validId(id)) continue;
    const n = Math.round(clamp(Number.isFinite(h.n) ? h.n : 0, 0, MAX_HERD));
    if (n > 0) out[id] = { sp: h.sp, n, sick: Math.round(clamp(Number.isFinite(h.sick) ? h.sick : 0, 0, 30)) };
  }
  return out;
}
const done = new WeakSet();
export function herdsOf(bezit) {
  if (!bezit.x.herds || !done.has(bezit.x.herds)) { bezit.x.herds = normalizeHerds(bezit.x.herds); done.add(bezit.x.herds); }
  return bezit.x.herds;
}

// Een kudde neerzetten op een perceel van jou (kind 'w' | 'a' | 'b' uit het bezit, ha van het perceel). Eén soort per perceel; n hooguit de capaciteit.
export function stockHerd(bezit, id, sp, n = Infinity) {
  const rec = bezit.parcels[id];
  if (!rec) return { ok: false, why: 'niet-van-jou' };
  if (!SPECIES[sp]) return { ok: false, why: 'onbekende-soort' };
  if (!canKeep(sp, rec.k, rec.ha)) return { ok: false, why: 'past-niet' };
  const h = herdsOf(bezit);
  if (h[id]) return { ok: false, why: 'al-vee' };
  const cap = capacityOf(sp, rec.ha);
  const count = Math.min(cap, Math.max(1, Math.floor(Number.isFinite(n) ? n : cap)));
  h[id] = { sp, n: count, sick: 0 };
  return { ok: true, n: count };
}
export function removeHerd(bezit, id) {
  const h = herdsOf(bezit);
  if (!h[id]) return false;
  delete h[id];
  return true;
}

// ---- kopen en verkopen (#1101): vee koop je per dier voor een weiland van jou; het perceel bepaalt hoeveel er past ----
export const ANIMAL_PRICE = { melkvee: 1400, schapen: 180, kippen: 9 };   // euro per dier (verzonnen prijzen, in de buurt van wat het kost)
export const SELL_FACTOR = 0.7;                                          // verkopen levert 70% op: het vee is al gewend aan je erf
export const herdCost = (sp, n) => (ANIMAL_PRICE[sp] && n > 0 ? Math.round(ANIMAL_PRICE[sp] * n) : 0);
export const herdSellValue = (herd) => (herd && ANIMAL_PRICE[herd.sp] ? Math.round(ANIMAL_PRICE[herd.sp] * herd.n * SELL_FACTOR) : 0);

// Wat past hier en wat kost het: een lijst { sp, naam, n (de capaciteit), cost, kan } voor een perceel van jou; leeg als het perceel geen weiland is, niet van jou, of al vee heeft.
export function herdOffers(bezit, id, money = Infinity) {
  const rec = bezit && bezit.parcels[id];
  if (!rec || rec.lg || herdsOf(bezit)[id]) return [];
  return SPECIES_IDS.filter((sp) => canKeep(sp, rec.k, rec.ha)).map((sp) => {
    const n = capacityOf(sp, rec.ha);
    const cost = herdCost(sp, n);
    return { sp, naam: SPECIES[sp].naam, n, cost, kan: n > 0 && cost <= money };
  });
}

// Een volle kudde kopen: { ok, n, cost } of { ok: false, why: 'te-weinig-geld' | 'past-niet' | 'al-vee' | ..., tekort }. De aanroeper trekt het geld af.
export function buyHerd(bezit, id, sp, money = 0) {
  const offer = herdOffers(bezit, id).find((o) => o.sp === sp);
  if (!offer) return { ok: false, why: herdsOf(bezit)[id] ? 'al-vee' : bezit && bezit.parcels[id] ? 'past-niet' : 'niet-van-jou' };
  if (!(money >= offer.cost)) return { ok: false, why: 'te-weinig-geld', tekort: Math.ceil(offer.cost - money) };
  const r = stockHerd(bezit, id, sp, offer.n);
  return r.ok ? { ok: true, n: r.n, cost: offer.cost } : r;
}

// De kudde van een perceel verkopen: { ok, n, value }. De aanroeper telt het geld bij.
export function sellHerd(bezit, id) {
  const h = herdsOf(bezit)[id];
  if (!h) return { ok: false, why: 'geen-vee' };
  const value = herdSellValue(h), n = h.n;
  removeHerd(bezit, id);
  return { ok: true, n, value };
}

// ---- ziekte: de aanroeper voert het in (een gebeurtenis uit 5.8), de sim rekent ermee ----
export function infect(herd, days = SICK_DAYS) {
  if (!herd || herd.sick > 0) return false;
  herd.sick = Math.max(1, Math.round(days));
  return true;
}
export const vetCost = (herd) => (herd ? Math.max(50, Math.round((40 + herd.n * 3) / 5) * 5) : 0);
// De dierenarts maakt de kudde beter, tegen het bedrag; zonder geld verandert er niets.
export function cure(herd, money = Infinity) {
  if (!herd || !(herd.sick > 0)) return { ok: false, why: 'niet-ziek' };
  const cost = vetCost(herd);
  if (!(money >= cost)) return { ok: false, why: 'te-weinig-geld', tekort: Math.round(cost - money) };
  herd.sick = 0;
  return { ok: true, cost };
}

// ---- de speldag ----
// ctx: { hay: { gras, hooi, graan } kg in de opslag, robot (melkrobot aanwezig), buy (voer bijkopen als er te weinig is; standaard ja), kind ('w'|'a'|'b' van het perceel), ha,
//        klus: { voeren, melken } (de speler verzorgde de kudde zelf, herdchores.js): melken telt als de robot, voeren geeft 5% meer }
// Geeft { products: { melk|wol|eieren: hoeveelheid }, value, hayUsed: { soort: kg }, feedCost, fed (0..1), sick }. Verandert de kudde (de ziektedagen lopen af), de opslag niet:
// de aanroeper haalt hayUsed uit de opslag, stopt products erin of verkoopt ze (sellValue) en betaalt feedCost.
export function herdDayTick(herd, ctx = {}) {
  const s = herd && SPECIES[herd.sp];
  const rep = { products: {}, value: 0, hayUsed: {}, feedCost: 0, fed: 1, sick: false };
  if (!s || !(herd.n > 0)) return rep;
  const klus = ctx.klus || {};
  const need = herd.n * s.voer;
  let left = need;
  // 1. de eigen wei (alleen een weide geeft gras; kippen scharrelen niet mee)
  if (s.grazen && ctx.kind === 'w' && ctx.ha > 0) left -= Math.min(left, ctx.ha * PASTURE_KG_HA_DAY);
  // 2. de opslag: hooi of gras, kippen graan
  const hay = ctx.hay || {};
  for (const feed of s.grazen ? ['gras', 'hooi'] : ['graan']) {
    if (left <= 1e-9) break;
    const take = Math.min(left, Math.max(0, hay[feed] || 0));
    if (take > 0) { rep.hayUsed[feed] = Math.round(take * 10) / 10; left -= take; }
  }
  // 3. bijkopen, anders honger: de productie volgt het deel dat gevoerd is
  if (left > 1e-9 && ctx.buy !== false) { rep.feedCost = Math.round(left * (s.grazen ? FEED_PRICE.hooi : FEED_PRICE.graan) * 100) / 100; left = 0; }
  rep.fed = need > 0 ? clamp(1 - left / need, 0, 1) : 1;
  rep.sick = herd.sick > 0;
  const f = rep.fed * (rep.sick ? SICK_FACTOR : 1) * (herd.sp === 'melkvee' && !ctx.robot && !klus.melken ? ROBOT_FACTOR : 1) * (klus.voeren ? KLUS_VOER_BONUS : 1);
  const amount = herd.n * s.perDag * f;
  const q = s.product === 'wol' ? Math.round(amount * 100) / 100 : Math.round(amount);
  if (q > 0) { rep.products[s.product] = q; rep.value = Math.round(q * PRODUCT_PRICE[s.product]); }
  if (herd.sick > 0) herd.sick--;
  return rep;
}

// De waarde van producten bij verkoop (een deel kan naar de opslag gaan in plaats van verkocht): { melk, wol, eieren } -> euro.
export const sellValue = (products) => Math.round(Object.keys(products || {}).reduce((n, k) => n + (PRODUCT_PRICE[k] ? products[k] * PRODUCT_PRICE[k] : 0), 0));

// Alle kuddes van het bezit een speldag laten leven: { products, value, feedCost, hayUsed, herds, sick, rows }. De aanroeper verrekent het geld en de opslag.
// hay is de voorraad van de opslag (wordt hier niet gewijzigd, maar wel verdeeld: een kudde die eerder aan de beurt is, neemt het weg voor de volgende).
export function livestockDayTick(bezit, ctx = {}) {
  const herds = herdsOf(bezit);
  const hay = { ...(ctx.hay || {}) };
  const total = { products: {}, value: 0, feedCost: 0, hayUsed: {}, herds: 0, sick: 0, rows: [] };
  for (const id of Object.keys(herds).sort()) {
    const rec = bezit.parcels[id];
    if (!rec) { delete herds[id]; continue; }                       // het perceel is verkocht: de kudde gaat mee
    const r = herdDayTick(herds[id], { hay, robot: ctx.robot, buy: ctx.buy, kind: rec.k, ha: rec.ha, klus: ctx.klus ? ctx.klus(id) : null });
    for (const k of Object.keys(r.products)) total.products[k] = Math.round(((total.products[k] || 0) + r.products[k]) * 100) / 100;
    for (const k of Object.keys(r.hayUsed)) { hay[k] -= r.hayUsed[k]; total.hayUsed[k] = Math.round(((total.hayUsed[k] || 0) + r.hayUsed[k]) * 10) / 10; }
    total.value += r.value; total.feedCost += r.feedCost; total.herds++; if (r.sick) total.sick++;
    total.rows.push({ id, sp: herds[id].sp, n: herds[id].n, fed: r.fed, sick: r.sick, products: r.products });
  }
  total.feedCost = Math.round(total.feedCost * 100) / 100;
  return total;
}
