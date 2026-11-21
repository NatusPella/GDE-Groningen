// De productieketen van Bezit (epic #1095, #1103; ontwerp docs/BEZIT-21-11.md 5.6): grondstof -> verwerker -> verkooppunt als schakels met een
// voorraadbuffer en een doorvoer per speldag, stokken als de volgende schakel vol zit, logistiek met een AI-chauffeur (reistijd afstand / 15 m/s
// plus laden), extra marge voor een eigen keten (eigen verwerker +15%, eigen verkooppunt +15%, beide +35%) en de zwakste-schakel-analyse
// voor het beheerscherm. Puur: geen DOM, geen THREE, geen klok, geen opslag en geen Math.random (scripts/supplychain_test.mjs).
// Alles per speldag. De namen van de chauffeurs zijn verzonnen voornamen; alle bedrijven zijn verzonnen (Suikerhal Hoogkerk is een bestaande
// afnemer van het spel, geen echt bedrijf).

import { hashPick, clamp, finite } from './bezithash.js';

export const TRUCK_KG = 8000;                 // wat een vrachtwagen per rit meeneemt
export const TRUCK_SPEED = 15;                 // m/s (afstand / 15)
export const LOAD_S = 300;                     // laden en lossen per rit, in spelseconden
export const SHIFT_S = 36000;                  // een chauffeur rijdt een dienst van tien uur per speldag
export const DRIVER_WAGE = 95;                 // loon per chauffeur per speldag
export const DIESEL_PER_KM = 0.9;              // euro per gereden kilometer (heen en terug)
export const MARGIN_ONE = 0.15;                // eigen verwerker of eigen verkooppunt
export const MARGIN_BOTH = 0.35;               // beide eigen: een kleine bonus voor de gesloten keten (in plaats van 30%)
export const DRIVER_NAMES = ['Hindrik', 'Gerke', 'Ruurd', 'Tineke', 'Sietse', 'Lutske', 'Jouke', 'Femke', 'Teake', 'Wietske'];

// Waarde per kilo van de grondstof (de basis waarop de marge rekent). Gewassen zijn de basisprijzen van gewasmarkt.js (PRIJS_KG); de rest is nieuw.
export const RAW_PRICE = { melk: 0.45, aardappelen: 0.22, graan: 0.15, eieren: 1.6, bieten: 0.1, gras: 0.07 };

// De ketens (ontwerp 5.6). yield: kilo uitvoer per kilo invoer. perDay: doorvoer in kilo invoer per speldag. cap: buffer van die schakel in kilo.
// ownable: de speler kan deze schakel kopen en dan telt de extra marge. sale: wat het eindpunt doet ('market' verkoopt, 'internal' voert eigen vee).
const L = (id, role, label, o = {}) => ({ id, role, label, yield: 1, perDay: 4000, cap: 12000, ownable: role !== 'source', ...o });
export const CHAIN_DEFS = {
  kaas: { id: 'kaas', name: 'Melk naar kaas', raw: 'melk', output: 'kaas', links: [
    L('melk', 'source', 'Melkvee', { cap: 20000, perDay: 6000 }),
    L('kaasmakerij', 'processor', 'Kaasmakerij', { in: 'melk', out: 'kaas', yield: 0.1, perDay: 5000, cap: 10000 }),
    L('verkoop', 'outlet', 'Boerderijwinkel of markt', { in: 'kaas', perDay: 400, cap: 1500 })] },
  friet: { id: 'friet', name: 'Aardappelen naar friet', raw: 'aardappelen', output: 'friet', links: [
    L('aardappelen', 'source', 'Aardappelakker', { cap: 40000, perDay: 12000 }),
    L('frietfabriek', 'processor', 'Frietfabriek', { in: 'aardappelen', out: 'friet', yield: 0.65, perDay: 9000, cap: 20000 }),
    L('snackbar', 'outlet', 'Snackbars (jouw snackwagen en andere)', { in: 'friet', perDay: 3500, cap: 8000 })] },
  brood: { id: 'brood', name: 'Graan naar brood', raw: 'graan', output: 'brood', links: [
    L('graan', 'source', 'Graanakker', { cap: 40000, perDay: 12000 }),
    L('meelmolen', 'processor', 'Meelmolen', { in: 'graan', out: 'meel', yield: 0.8, perDay: 9000, cap: 20000 }),
    L('bakkerij', 'processor', 'Bakkerij', { in: 'meel', out: 'brood', yield: 1.3, perDay: 5000, cap: 8000 }),
    L('verkoop', 'outlet', 'Bakker of supermarkt', { in: 'brood', perDay: 5000, cap: 9000 })] },
  eieren: { id: 'eieren', name: 'Eieren naar de winkel', raw: 'eieren', output: 'eieren', links: [
    L('kippen', 'source', 'Kippenhok', { cap: 4000, perDay: 1500 }),
    L('verkoop', 'outlet', 'Supermarkt of horeca', { in: 'eieren', perDay: 1200, cap: 3000 })] },
  hooi: { id: 'hooi', name: 'Gras naar hooi', raw: 'gras', output: 'hooi', links: [
    L('gras', 'source', 'Weide', { cap: 40000, perDay: 15000 }),
    L('hooiberg', 'processor', 'Hooiberg', { in: 'gras', out: 'hooi', yield: 0.4, perDay: 12000, cap: 20000, ownable: false }),
    L('vee', 'outlet', 'Eigen vee', { in: 'hooi', perDay: 2500, cap: 6000, ownable: false, sale: 'internal' })] },
  bieten: { id: 'bieten', name: 'Bieten naar de Suikerhal', raw: 'bieten', output: 'bieten', links: [
    L('bieten', 'source', 'Bietenakker', { cap: 80000, perDay: 25000 }),
    L('suikerhal', 'outlet', 'Suikerhal Hoogkerk', { in: 'bieten', perDay: 20000, cap: 60000, ownable: false })] },
};
export const CHAIN_IDS = Object.keys(CHAIN_DEFS);

// ---- logistiek ----
// Reistijd van een rit in spelseconden: afstand / 15 m/s heen en terug plus laden. Binnen de streamstraal zichtbaar, anders alleen deze doorlooptijd.
export const tripSeconds = (distance) => Math.round((2 * Math.max(0, finite(distance, 0))) / TRUCK_SPEED + LOAD_S);
export const tripsPerDay = (distance) => (finite(distance, 0) <= 0 ? Infinity : Math.floor(SHIFT_S / tripSeconds(distance)));
// Wat de wagens van een schakel samen per dag naar de volgende schakel brengen: ongelimiteerd zonder afstand (zelfde erf), anders wagens x ritten x lading.
export const transportCapacity = (link) => {
  const d = finite(link && link.distance, 0);
  if (d <= 0) return Infinity;
  return ((link.trucks && link.trucks.length) || 0) * tripsPerDay(d) * TRUCK_KG;
};
export const dieselPerDay = (link, kg) => (finite(link && link.distance, 0) > 0 && kg > 0 ? Math.round(Math.ceil(kg / TRUCK_KG) * ((2 * link.distance) / 1000) * DIESEL_PER_KM) : 0);

// ---- de keten als toestand ----
// chain: { id, links: [{ id, role, label, yield, perDay, cap, ownable, owned, stock, distance, trucks: [{ id, driver, wage }], sale, in, out }], day }
export function newChain(defId, opts = {}) {
  const d = CHAIN_DEFS[defId];
  if (!d) return null;
  const owned = new Set(opts.owned || []), dist = opts.distance || {};
  return { id: d.id, name: d.name, raw: d.raw, output: d.output, day: Math.max(0, opts.day | 0),
    links: d.links.map((l) => ({ ...l, owned: !!(l.ownable && owned.has(l.id)), stock: 0, distance: Math.max(0, finite(dist[l.id], 0)), trucks: [] })) };
}
export function normalizeChain(raw) {
  const d = raw && CHAIN_DEFS[raw.id];
  if (!d || !Array.isArray(raw.links)) return null;
  const c = newChain(raw.id, { day: raw.day });
  c.links.forEach((l, i) => {
    const r = raw.links[i] || {};
    l.stock = clamp(finite(r.stock, 0), 0, l.cap);
    l.owned = !!(l.ownable && r.owned);
    l.distance = clamp(finite(r.distance, 0), 0, 400000);
    l.perDay = clamp(finite(r.perDay, l.perDay), 0, l.perDay * 4);       // een opwaardering mag, hoogstens viermaal
    l.cap = clamp(finite(r.cap, l.cap), l.cap, l.cap * 4);
    l.trucks = (Array.isArray(r.trucks) ? r.trucks : []).slice(0, 10).filter((t) => t && typeof t.id === 'string').map((t) => ({ id: t.id.slice(0, 30), driver: String(t.driver || 'Chauffeur').slice(0, 24), wage: DRIVER_WAGE }));
  });
  return c;
}
export const setOwned = (chain, linkId, owned) => ({ ...chain, links: chain.links.map((l) => (l.id === linkId && l.ownable ? { ...l, owned: !!owned } : l)) });
export const setDistance = (chain, linkId, distance) => ({ ...chain, links: chain.links.map((l) => (l.id === linkId ? { ...l, distance: Math.max(0, finite(distance, 0)) } : l)) });
// Een wagen met chauffeur erbij of weg (vast per keten, schakel en aantal; geen toeval).
export function addTruck(chain, linkId) {
  const i = chain.links.findIndex((l) => l.id === linkId);
  if (i < 0 || chain.links[i].trucks.length >= 10) return { ok: false, chain };
  const n = chain.links[i].trucks.length;
  const t = { id: `${chain.id}-${linkId}-${n}`, driver: hashPick(DRIVER_NAMES, chain.id, linkId, n), wage: DRIVER_WAGE };
  return { ok: true, chain: { ...chain, links: chain.links.map((l, j) => (j === i ? { ...l, trucks: [...l.trucks, t] } : l)) } };
}
export function removeTruck(chain, linkId) {
  const i = chain.links.findIndex((l) => l.id === linkId);
  if (i < 0 || !chain.links[i].trucks.length) return { ok: false, chain };
  return { ok: true, chain: { ...chain, links: chain.links.map((l, j) => (j === i ? { ...l, trucks: l.trucks.slice(0, -1) } : l)) } };
}

// De extra marge van de eigen keten (ontwerp 5.6): geen eigen schakel 0, een eigen verwerker of een eigen verkooppunt 15%, beide 35%.
export function extraMargin(chain) {
  const proc = chain.links.some((l) => l.role === 'processor' && l.owned && l.ownable);
  const out = chain.links.some((l) => l.role === 'outlet' && l.owned && l.ownable);
  return proc && out ? MARGIN_BOTH : proc || out ? MARGIN_ONE : 0;
}
// Hoeveel kilo grondstof er in één kilo van deze schakel zit: het product van de opbrengsten ervoor.
const rawPerUnit = (chain, idx) => { let y = 1; for (let i = 0; i < idx; i++) y *= chain.links[i].yield; return y; };

// Eén speldag. Geeft { chain: nieuwe toestand, report }; past de invoer niet aan.
// produced: kilo grondstof die de percelen die dag in de bron leggen; regionFactor: de streekprijs-factor van het verkooppunt (areamarket.js, 0,7 tot 1,4).
// report: { intake, blocked (oogst die niet de schuur in kon), moved: [kg per schakel], sold, fed, revenue, cost: { wages, diesel }, net, margin, stuck: [{ index, why }] }
export function stepChainDay(chain, { produced = 0, regionFactor = 1, day } = {}) {
  const links = chain.links.map((l) => ({ ...l, trucks: l.trucks.slice() }));
  const n = links.length, rf = clamp(finite(regionFactor, 1), 0.7, 1.4);
  const rep = { day: Number.isFinite(day) ? day : chain.day + 1, intake: 0, blocked: 0, moved: new Array(n).fill(0), sold: 0, fed: 0, revenue: 0, cost: { wages: 0, diesel: 0 }, net: 0, margin: 0, stuck: [] };
  // de bron neemt de oogst op (de rest blijft op het veld: een waarschuwing)
  const prod = Math.max(0, finite(produced, 0));
  const room = Math.max(0, links[0].cap - links[0].stock);
  rep.intake = Math.min(prod, room); rep.blocked = prod - rep.intake;
  links[0].stock += rep.intake;
  // van achter naar voren, zodat de ruimte van de volgende schakel in dezelfde dag vrijkomt
  for (let i = n - 1; i >= 0; i--) {
    const l = links[i];
    if (l.role === 'outlet') {
      const a = Math.min(l.stock, l.perDay);
      l.stock -= a; rep.moved[i] = a;
      if (l.sale === 'internal') rep.fed += a; else rep.sold += a;
      continue;
    }
    const nxt = links[i + 1];
    const space = Math.max(0, nxt.cap - nxt.stock);
    const tcap = transportCapacity(l);
    let a = Math.min(l.stock, l.perDay);
    const outAmount = (x) => x * l.yield;
    if (outAmount(a) > space) a = space / l.yield;
    if (outAmount(a) > tcap) a = tcap / l.yield;
    a = Math.max(0, a);
    const out = outAmount(a);
    l.stock -= a; nxt.stock += out; rep.moved[i] = a;
    if (a < Math.min(links[i].stock + a, l.perDay) - 1e-9) {
      const why = outAmount(Math.min(l.stock + a, l.perDay)) > space + 1e-9 && space <= tcap + 1e-9 ? 'vol' : 'transport';
      rep.stuck.push({ index: i, why });
    }
    const km = finite(l.distance, 0);
    if (km > 0 && out > 0) rep.cost.diesel += dieselPerDay(l, out);
  }
  for (const l of links) rep.cost.wages += l.trucks.length * DRIVER_WAGE;
  const rawSold = rep.sold / rawPerUnit({ links }, n - 1);
  rep.margin = extraMargin({ links });
  rep.revenue = Math.round(rawSold * finite(RAW_PRICE[chain.raw], 0) * (1 + rep.margin) * rf * 100) / 100;
  rep.revenueBase = Math.round(rawSold * finite(RAW_PRICE[chain.raw], 0) * rf * 100) / 100;       // wat dezelfde kilo's zonder eigen schakels hadden opgebracht
  rep.cost.diesel = Math.round(rep.cost.diesel);
  rep.net = Math.round((rep.revenue - rep.cost.wages - rep.cost.diesel) * 100) / 100;
  rep.fill = links.map((l) => Math.round((l.stock / Math.max(1, l.cap)) * 1000) / 1000);
  return { chain: { ...chain, links, day: rep.day }, report: rep };
}

// Meerdere dagen achter elkaar met dezelfde of een per-dag-productie (produced: getal of functie van de dag). Hoogstens 400 dagen.
export function settleChain(chain, fromDay, toDay, { produced = 0, regionFactor = 1 } = {}) {
  const a = Math.max(0, Math.floor(finite(fromDay, 0))), z = Math.min(Math.max(a, Math.floor(finite(toDay, a))), a + 400);
  const sum = { days: 0, intake: 0, blocked: 0, sold: 0, fed: 0, revenue: 0, wages: 0, diesel: 0, net: 0 };
  let cur = chain, last = null;
  for (let d = a + 1; d <= z; d++) {
    const r = stepChainDay(cur, { produced: typeof produced === 'function' ? produced(d) : produced, regionFactor: typeof regionFactor === 'function' ? regionFactor(d) : regionFactor, day: d });
    cur = r.chain; last = r.report; sum.days++;
    sum.intake += last.intake; sum.blocked += last.blocked; sum.sold += last.sold; sum.fed += last.fed; sum.revenue += last.revenue; sum.wages += last.cost.wages; sum.diesel += last.cost.diesel; sum.net += last.net;
  }
  return { chain: cur, sum, last };
}

// ---- de zwakste schakel (beheerscherm) ----
// Kijkt naar het laatste rapport: een schakel die stokt (volgende vol of geen wagen), een schakel die vol zit, of een bron die leeg loopt.
// Geeft { index, link, kind, text } met een Nederlandse raad, of null als de keten loopt.
export function weakestLink(chain, report) {
  const links = chain.links;
  const name = (i) => links[i].label;
  const stuck = (report && report.stuck) || [];
  const tr = stuck.find((s) => s.why === 'transport');
  if (tr) return { index: tr.index, link: links[tr.index].id, kind: 'transport', text: `${name(tr.index)}: te weinig wagens naar de volgende schakel. Stel een chauffeur aan.` };
  const full = stuck.find((s) => s.why === 'vol');
  if (full) {
    // het knelpunt is de volgende schakel: die neemt niet genoeg op
    const nx = Math.min(links.length - 1, full.index + 1);
    return { index: nx, link: links[nx].id, kind: 'vol', text: `${name(nx)} zit vol: ${name(full.index)} stokt. Meer doorvoer of een grotere buffer.` };
  }
  if (report && report.blocked > 0) return { index: 0, link: links[0].id, kind: 'oogst', text: `${name(0)}: de oogst past niet in de schuur. Verwerk of verkoop sneller.` };
  // zonder stokken: de schakel met de laagste benutting van zijn doorvoer die wel werk heeft, of een leeg magazijn voor een schakel die doorvoer over heeft
  let best = null;
  for (let i = 1; i < links.length; i++) {
    const l = links[i], moved = (report && report.moved && report.moved[i]) || 0;
    if (l.stock <= 0 && moved < l.perDay * 0.5 && !best) best = { index: i, link: l.id, kind: 'leeg', text: `${name(i)} wacht op aanvoer: er komt te weinig binnen.` };
  }
  return best;
}

// De keten als rij voor het beheerscherm: per schakel voorraadbalk (0..1), doorvoer, eigen of niet; marge; de zwakste schakel.
export function chainView(chain, report = null) {
  return { id: chain.id, name: chain.name, margin: extraMargin(chain), weakest: weakestLink(chain, report),
    links: chain.links.map((l, i) => ({ id: l.id, label: l.label, role: l.role, owned: !!l.owned, ownable: !!l.ownable, stock: Math.round(l.stock), cap: l.cap, fill: Math.round((l.stock / Math.max(1, l.cap)) * 1000) / 1000, perDay: l.perDay, trucks: l.trucks.length, moved: report ? Math.round(report.moved[i]) : 0 })) };
}
