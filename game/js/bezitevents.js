// Gebeurtenissen van Bezit (epic #1095, #1103; ontwerp docs/BEZIT-21-11.md 5.8): droogte, stortbui, mierenplaag, wespen, machine kapot, ziek vee, de
// Inspectiedienst Noordrand, storing in de koeling, staking, veiling (koopje), veilingdag, landbouwbeurs, buren-kibbelen met een keuze, kermis en
// dorpsfeest en een trekkertrek-wedstrijd als gegevensdefinitie. Alleen regels (pure functies in de stijl van eventrules.js): de afspeelcode en de
// meldingen zijn aan de bouwer. Puur: geen DOM, geen THREE, geen klok, geen opslag en geen Math.random (scripts/bezitevents_test.mjs).
//
// Alles is deterministisch uit een hash van event, plek en dag (bezithash.js), zodat weer en markt voor alle spelers in een sessie gelijk zijn
// (de dag komt uit de gedeelde kalender, calendar.js). Persoonlijke gebeurtenissen (machine, vee, inspectie, buren) hashen mee op een spelerszaad.
// Constitution: alle namen en teksten verzonnen, ALTIJD ZOMER (geen winter, sneeuw of natuurijs), geen aardbevingen of gaswinning in deze ronde,
// geen overval of geweld (satire, geen leed: ook een staking en een ziek dier zijn zonder beeld van leed).

import { hashUnit, hashPick, clamp, finite } from './bezithash.js';

export const INSPECTORATE = 'Inspectiedienst Noordrand';
export const UNION = 'Bond Kassa Vrij Noord';
export const FAIR = 'Landbouwbeurs Noorderveld';

// ---- de definities ----
// scope: 'region' (voor iedereen in de streek hetzelfde), 'asset' (per perceel, machine of kudde van de speler), 'player' (per speler).
// chance: kans per dag per scope-sleutel dat hij begint; duration: [min, max] dagen.
export const EVENT_DEFS = {
  droogte: { id: 'droogte', kind: 'weer', scope: 'region', chance: 0.03, duration: [3, 6], label: 'Droogte', text: 'Het is al dagen droog in {r}: het land is dor.' },
  stortbui: { id: 'stortbui', kind: 'weer', scope: 'region', chance: 0.015, duration: [1, 1], label: 'Stortbui', text: 'Een stortbui trekt over {r}: gezaaide percelen verliezen 30%.' },
  mierenplaag: { id: 'mierenplaag', kind: 'natuur', scope: 'region', chance: 0.02, duration: [4, 8], label: 'Mierenplaag', text: 'Mieren in de akkers en weiden van {r}. Bestrijden voor de oogst.' },
  wespen: { id: 'wespen', kind: 'natuur', scope: 'region', chance: 0.02, duration: [3, 5], label: 'Wespen in de boomgaard', text: 'Wespen in de boomgaarden van {r}: het fruit wordt aangevreten.' },
  machine: { id: 'machine', kind: 'pech', scope: 'asset', chance: 0, duration: [1, 3], label: 'Machine kapot', text: '{naam} staat stil met pech.' },
  vee: { id: 'vee', kind: 'pech', scope: 'asset', chance: 0.012, duration: [3, 3], label: 'Ziek vee', text: 'Een deel van je {soort} is ziek: de dierenarts komt en het vee blijft binnen.' },
  inspectie: { id: 'inspectie', kind: 'pech', scope: 'player', chance: 0.015, duration: [1, 1], label: INSPECTORATE, text: 'De {dienst} komt langs voor een onverwachte controle.' },
  koeling: { id: 'koeling', kind: 'pech', scope: 'asset', chance: 0.02, duration: [1, 1], label: 'Storing in de koeling', text: 'De koeling van {naam} valt uit: een deel van de voorraad is bedorven.' },
  staking: { id: 'staking', kind: 'pech', scope: 'region', chance: 0.01, duration: [1, 1], label: 'Staking', text: '{bond} roept in {r} een dag koffiepauze uit: de supermarkten zijn dicht.' },
  veiling: { id: 'veiling', kind: 'kans', scope: 'region', chance: 0.04, duration: [1, 1], label: 'Veiling', text: 'Op de veiling in {r} gaat een perceel of pand voor een koopje weg.' },
  veilingdag: { id: 'veilingdag', kind: 'kans', scope: 'global', chance: 0.06, duration: [1, 1], label: 'Veilingdag', text: 'Veilingdag: {product} brengt vandaag 25% meer op.' },
  buren: { id: 'buren', kind: 'verhaal', scope: 'player', chance: 0.02, duration: [1, 1], label: 'Buren', text: 'Een buur komt langs met een kleine kwestie.' },
};
export const EVENT_IDS = Object.keys(EVENT_DEFS);

// ---- de ruggengraat: wanneer is een gebeurtenis actief ----
const startsOn = (def, key, d) => hashUnit('bezitev', def.id, key, d) < def.chance;
// Het zwaarste actieve exemplaar op `day` voor deze definitie en sleutel (streek of spelerszaad+bezit), of null. Geen toestand: de dagen terug worden gescand.
export function activeSpan(def, key, day) {
  const d = Math.floor(finite(day, 0));
  if (d < 1 || !def) return null;
  let best = null;
  for (let s = d; s > d - def.duration[1] && s >= 1; s--) {
    if (!startsOn(def, key, s)) continue;
    const dur = def.duration[0] + Math.floor(hashUnit('duur', def.id, key, s) * (def.duration[1] - def.duration[0] + 1));
    if (d >= s + dur) continue;
    const sev = hashUnit('ernst', def.id, key, s);
    if (!best || sev > best.sev) best = { start: s, dur, sev, day: d, first: d === s };
  }
  return best;
}
export const droughtOn = (region, day) => activeSpan(EVENT_DEFS.droogte, region, day);

const regionName = (r) => String(r || 'de streek').replace(/^./, (c) => c.toUpperCase());
const fill = (text, o = {}) => text.replace(/\{(\w+)\}/g, (_, k) => (o[k] !== undefined ? o[k] : `{${k}}`));

// ---- opbrengst: droogte, stortbui, mieren en wespen op een perceel ----
// parcel: { id, kind ('w' weide, 'a' akker, 'b' boomgaard), region, sandy (zand), sown (gezaaid), treated: { ants, wasps } }
export const STORM_LOSS = 0.3;
export const STORM_INSURANCE = { premiumPerHaDay: 3, covers: 0.8 };      // optioneel: een premie per ha per speldag; dekt 80% van het verlies
export const DROUGHT_RANGE = { clay: [0.15, 0.25], sand: [0.25, 0.35] };   // opbrengstverlies: zand meer (-15..-35% in totaal)
export const ANT_LOSS = 0.1, WASP_LOSS = 0.2;
export const ANT_CONTROL_PER_HA = 15, WASP_NEST_COST = 40;                  // wat bestrijden kost

// Het verlies in opbrengst (0..1) voor dit perceel op deze dag, uit alle actieve gebeurtenissen: { loss, causes: [{ id, loss, text }] }.
export function parcelLoss(parcel, day, { insured = false } = {}) {
  const causes = [];
  const reg = parcel.region;
  const dr = droughtOn(reg, day);
  if (dr && parcel.sown !== false) {
    const [a, b] = parcel.sandy ? DROUGHT_RANGE.sand : DROUGHT_RANGE.clay;
    causes.push({ id: 'droogte', loss: Math.round((a + (b - a) * dr.sev) * 1000) / 1000, text: parcel.sandy ? 'Droogte: zand houdt geen water vast.' : 'Droogte.' });
  }
  const storm = activeSpan(EVENT_DEFS.stortbui, reg, day);
  if (storm && parcel.sown) causes.push({ id: 'stortbui', loss: insured ? Math.round(STORM_LOSS * (1 - STORM_INSURANCE.covers) * 1000) / 1000 : STORM_LOSS, text: insured ? 'Stortbui, door je verzekering grotendeels gedekt.' : 'Stortbui: een derde van het gewas ligt plat.' });
  const ants = activeSpan(EVENT_DEFS.mierenplaag, reg, day);
  if (ants && (parcel.kind === 'a' || parcel.kind === 'w') && !(parcel.treated && parcel.treated.ants)) causes.push({ id: 'mierenplaag', loss: ANT_LOSS, text: 'Mierenplaag: bestrijd ze voor de oogst.' });
  const wasps = activeSpan(EVENT_DEFS.wespen, reg, day);
  if (wasps && parcel.kind === 'b' && !(parcel.treated && parcel.treated.wasps)) causes.push({ id: 'wespen', loss: WASP_LOSS, text: 'Wespen eten het fruit aan: laat het nest weghalen.' });
  const keep = causes.reduce((k, c) => k * (1 - c.loss), 1);
  return { loss: Math.round(clamp(1 - keep, 0, 0.6) * 1000) / 1000, causes };
}
export const yieldMultiplier = (parcel, day, o) => 1 - parcelLoss(parcel, day, o).loss;
// De verzekering: premie per ha per speldag, en de uitkering bij stortbui (80% van de geleden schade in euro).
export const insurancePremium = (ha) => Math.round(Math.max(0, finite(ha, 0)) * STORM_INSURANCE.premiumPerHaDay);
export const stormPayout = (lossValue, insured) => (insured ? Math.round(Math.max(0, finite(lossValue, 0)) * STORM_INSURANCE.covers) : 0);
export const antControlCost = (ha) => Math.round(Math.max(0, finite(ha, 0)) * ANT_CONTROL_PER_HA);

// ---- machine kapot (kans boven 70% slijtage) ----
export const WEAR_SAFE = 70;
// Kans per speldag: nul tot 70% slijtage, dan oplopend tot 20% bij 100%.
export const breakdownChance = (wear) => { const w = clamp(finite(wear, 0), 0, 100); return w <= WEAR_SAFE ? 0 : Math.round((0.02 + 0.18 * Math.pow((w - WEAR_SAFE) / (100 - WEAR_SAFE), 1.5)) * 10000) / 10000; };
// Gaat deze machine vandaag stuk? Geeft null of { days (stilstand), cost }. machine: { id, wear, price }.
export function machineBreakdown(machine, day, seed = '') {
  const c = breakdownChance(machine && machine.wear);
  if (!(c > 0) || hashUnit('machine', seed, machine.id, Math.floor(finite(day, 0))) >= c) return null;
  const sev = hashUnit('machine-ernst', seed, machine.id, Math.floor(finite(day, 0)));
  const frac = 0.08 + 0.2 * sev;
  return { days: 1 + Math.floor(sev * 3), cost: Math.round((Math.max(0, finite(machine.price, 0)) * frac) / 5) * 5, text: fill(EVENT_DEFS.machine.text, { naam: machine.name || 'Een machine' }) };
}

// ---- ziek vee ----
// herd: { id, kind ('melkvee', 'schapen', 'kippen'), count, perHa, refPerHa }. Een te volle weide (boven 120% van de bezetting) verdubbelt de kans.
export const VET_BASE = 40, VET_PER_ANIMAL = 6;
export function herdSickness(herd, day, seed = '') {
  const def = EVENT_DEFS.vee, key = `${seed}:${herd.id}`;
  const crowded = finite(herd.perHa, 0) > finite(herd.refPerHa, Infinity) * 1.2;
  const span = activeSpan({ ...def, chance: def.chance * (crowded ? 2.5 : 1) }, key, day);
  if (!span) return null;
  return { start: span.start, days: span.dur, first: span.first, quarantine: true, vetCost: span.first ? VET_BASE + VET_PER_ANIMAL * Math.max(0, herd.count | 0) : 0, text: fill(EVENT_DEFS.vee.text, { soort: herd.kind || 'vee' }) };
}

// ---- de Inspectiedienst Noordrand ----
// state: { qAvg (gemiddeld onderhoud 0..100), staffed (heeft personeel), tidyFields (aandeel verzorgde percelen 0..1), dailyRevenue }.
// Boete bij verwaarlozing, lof bij orde; nooit een gevolg dat spelverlies is: een kleine som.
export function inspection(state, day, seed = '') {
  const span = activeSpan(EVENT_DEFS.inspectie, seed, day);
  if (!span) return null;
  const q = clamp(finite(state && state.qAvg, 100), 0, 100), tidy = clamp(finite(state && state.tidyFields, 1), 0, 1);
  const score = 0.6 * (q / 100) + 0.4 * tidy;
  if (score < 0.55) { const fine = Math.round((150 + 450 * (0.55 - score) / 0.55 + Math.min(300, finite(state && state.dailyRevenue, 0) * 0.1)) / 10) * 10; return { outcome: 'boete', amount: -fine, text: `${INSPECTORATE}: de zaken zijn niet op orde. Boete: €${fine}. Doe wat aan het onderhoud.` }; }
  if (score >= 0.85) { const bonus = Math.round((100 + 150 * (score - 0.85) / 0.15) / 10) * 10; return { outcome: 'lof', amount: bonus, text: `${INSPECTORATE}: complimenten voor de orde. Een bonus van €${bonus} voor de netheid.` }; }
  return { outcome: 'geen-opmerkingen', amount: 0, text: `${INSPECTORATE}: geen opmerkingen. Alles in orde.` };
}

// ---- storing in de koeling ----
export const PERISHABLE = ['melk', 'kaas', 'eieren', 'friet', 'brood', 'vlees', 'fruit'];
// stock: { <product>: kg } van een pand of verwerker met koeling. Geeft null of { lost: { product: kg } }.
export function coolingFailure(id, day, stock, seed = '') {
  const span = activeSpan(EVENT_DEFS.koeling, `${seed}:${id}`, day);
  if (!span) return null;
  const f = 0.15 + 0.15 * span.sev, lost = {};
  for (const p of PERISHABLE) { const kg = finite(stock && stock[p], 0); if (kg > 0) lost[p] = Math.round(kg * f); }
  return { fraction: Math.round(f * 1000) / 1000, lost, text: fill(EVENT_DEFS.koeling.text, { naam: id }) };
}

// ---- staking, kermis en dorpsfeest: de bedrijfsmods voor business.js stepDay (ctx.event, ctx.kermis) ----
// biz: { id, type }. Geeft { closed, note, revMult, cost } (alleen de velden die gelden).
export function businessMods(biz, region, day) {
  const out = {};
  const st = activeSpan(EVENT_DEFS.staking, region, day);
  if (st && (biz.type === 'supermarkt' || biz.type === 'kiosk')) { out.closed = true; out.note = `Staking (${UNION}): een dag dicht.`; }
  const fest = festivalOn(region, day);
  if (fest && !out.closed && biz.type !== 'kantoor' && biz.type !== 'hotel') { out.revMult = fest.revMult; out.note = fest.name; }
  const vd = auctionDay(day);
  if (vd && !out.closed && vd.product === 'souvenir' && biz.type === 'souvenir') out.revMult = (out.revMult || 1) * 1.25;
  return out;
}
export const FESTIVAL = { period: 12, length: 3, revMult: 1.2 };
const FESTIVALS = [
  { kind: 'kermis', name: 'Kermis in het dorp' }, { kind: 'dorpsfeest', name: 'Dorpsfeest met een gezellige markt' }, { kind: 'kermis', name: 'Zomerkermis' }, { kind: 'dorpsfeest', name: 'Dorpsfeest op het plein' },
];
// Kermis of dorpsfeest in deze streek op deze dag (een venster van drie dagen per twaalf, per streek verschoven): { kind, name, revMult, kermis } of null.
export function festivalOn(region, day) {
  const d = Math.floor(finite(day, 0));
  if (d < 1) return null;
  const off = Math.floor(hashUnit('feest', region) * FESTIVAL.period);
  const pos = (((d + off) % FESTIVAL.period) + FESTIVAL.period) % FESTIVAL.period;
  if (pos >= FESTIVAL.length) return null;
  const round = Math.floor((d + off) / FESTIVAL.period), f = hashPick(FESTIVALS, 'feestsoort', region, round);
  return { kind: f.kind, name: f.name, revMult: FESTIVAL.revMult, kermis: f.kind === 'kermis' };
}

// ---- veiling (koopje) en veilingdag ----
// Een koopje in de streek: { discount (0,2..0,35), index (een stabiele keuze 0..1 voor welk aanbod), text } of null.
export function auctionOffer(region, day) {
  const span = activeSpan(EVENT_DEFS.veiling, region, day);
  if (!span) return null;
  return { discount: Math.round((0.2 + 0.15 * span.sev) * 100) / 100, pick: hashUnit('veiling-keuze', region, span.start), kind: hashUnit('veiling-soort', region, span.start) < 0.5 ? 'perceel' : 'pand', text: fill(EVENT_DEFS.veiling.text, { r: regionName(region) }) };
}
export const AUCTION_PRODUCTS = ['aardappelen', 'bieten', 'graan', 'uien', 'melk', 'kaas', 'brood', 'eieren', 'fruit', 'souvenir'];
// De veilingdag: één product brengt vandaag 25% meer op (mult voor areamarket.js eventMult), of null.
export function auctionDay(day) {
  const span = activeSpan(EVENT_DEFS.veilingdag, 'wereld', day);
  if (!span) return null;
  const product = hashPick(AUCTION_PRODUCTS, 'veilingdag-product', span.start);
  return { product, mult: 1.25, text: fill(EVENT_DEFS.veilingdag.text, { product }) };
}
// De eventfactor voor een product op een dag (1 als er geen veilingdag is).
export const marketEventMult = (product, day) => { const a = auctionDay(day); return a && a.product === product ? a.mult : 1; };

// ---- de landbouwbeurs: vaste dagen, korting op machines ----
export const FAIR_DAYS = { period: 14, first: 10, length: 2, discount: 0.15 };
export function fairOn(day) {
  const d = Math.floor(finite(day, 0));
  if (d < FAIR_DAYS.first) return null;
  const pos = (d - FAIR_DAYS.first) % FAIR_DAYS.period;
  return pos < FAIR_DAYS.length ? { name: FAIR, discount: FAIR_DAYS.discount, dayOfFair: pos + 1, text: `${FAIR}: 15% korting op machines en werktuigen.` } : null;
}
export const fairPrice = (price, day) => { const f = fairOn(day); return f ? Math.round((price * (1 - f.discount)) / 5) * 5 : price; };

// ---- buren-kibbelen met een keuze ----
// Kleine meldingen in een Gronings-vriendelijk toontje; elke keuze kost hooguit een kleine som en nooit een straf.
export const NEIGHBOR_SCENES = [
  { id: 'heg', text: 'Buurman Hindrik vindt je heg een kop te hoog en laat dat luid blijken over het hek.', choices: [
    { id: 'praat', label: 'Een praatje maken', cost: 0, goodwill: 1, result: 'Na twee koppen koffie is de heg opeens prima.' },
    { id: 'knip', label: 'De heg bijknippen', cost: 25, goodwill: 2, result: 'Hindrik knikt goedkeurend: "Moi, dat ziet er netter uit."' },
    { id: 'negeer', label: 'Gewoon doorwerken', cost: 0, goodwill: 0, result: 'Hindrik gromt iets onverstaanbaars en gaat weer naar binnen.' }] },
  { id: 'trekker', text: 'Buurvrouw Gerke zegt dat je trekker te vroeg start. Het is half zes.', choices: [
    { id: 'sorry', label: 'Sorry zeggen en een mand eieren brengen', cost: 15, goodwill: 2, result: 'Gerke is gerustgesteld en brengt later een appeltaart.' },
    { id: 'later', label: 'Voortaan om zeven uur beginnen', cost: 0, goodwill: 1, result: 'Gerke steekt een duim op over de sloot.' },
    { id: 'negeer', label: 'Het negeren', cost: 0, goodwill: 0, result: 'De hond van Gerke blaft de hele ochtend terug.' }] },
  { id: 'schaap', text: 'Een schaap van de buren staat in jouw weide en kijkt tevreden. Wie heeft hier gelijk?', choices: [
    { id: 'terug', label: 'Het schaap terugbrengen', cost: 0, goodwill: 2, result: 'De buren bedanken je met een worst.' },
    { id: 'laat', label: 'Het even laten grazen', cost: 0, goodwill: 1, result: 'Het schaap blijft een middagje. Niemand klaagt.' },
    { id: 'rekening', label: 'Een rekening voor het gras sturen', cost: 0, goodwill: -1, result: 'De buren betalen niet, maar knikken kortaf naar je.' }] },
  { id: 'hek', text: 'Het hek tussen jullie percelen staat scheef. Beide kanten vinden dat de ander het moet rechtzetten.', choices: [
    { id: 'half', label: 'Samen repareren', cost: 20, goodwill: 2, result: 'Het hek staat weer recht en er is koffie.' },
    { id: 'alleen', label: 'Zelf rechtzetten', cost: 40, goodwill: 3, result: 'De buren kijken beteuterd en zeggen: "Dat is aardig."' },
    { id: 'wacht', label: 'Wachten tot de buren het doen', cost: 0, goodwill: 0, result: 'Het hek staat nog steeds scheef. Het blijft gezellig.' }] },
];
export function neighborScene(day, seed = '') {
  const span = activeSpan(EVENT_DEFS.buren, seed, day);
  if (!span) return null;
  const scene = hashPick(NEIGHBOR_SCENES, 'buren-scene', seed, span.start);
  return { id: scene.id, text: scene.text, choices: scene.choices.map((c) => ({ id: c.id, label: c.label, cost: c.cost })), start: span.start };
}
export function resolveNeighbor(sceneId, choiceId) {
  const scene = NEIGHBOR_SCENES.find((s) => s.id === sceneId), c = scene && scene.choices.find((x) => x.id === choiceId);
  return c ? { ok: true, cost: c.cost, goodwill: c.goodwill, text: c.result } : { ok: false, cost: 0, goodwill: 0, text: '' };
}

// ---- trekkertrek-wedstrijd: alleen de gegevensdefinitie (de minigame is aan de bouwer; opzet van de bestaande minigames) ----
export const TRACTOR_PULL = {
  id: 'trekkertrek', label: 'Trekkertrek', place: 'Het dorpsfeest', minigame: 'trekkertrek', needs: { vehicle: 'trekker' },
  classes: [{ id: 'licht', label: 'Licht tot 90 pk', fee: 50, prizes: [250, 120, 60] }, { id: 'zwaar', label: 'Zwaar vanaf 90 pk', fee: 100, prizes: [500, 250, 120] }],
  rules: ['Trek de slee zo ver mogelijk over de baan.', 'Wie het verst komt, wint.', 'Een trekker met veel slijtage trekt minder.'],
  schedule: 'tijdens een dorpsfeest of kermis in de streek (festivalOn)',
  coop: 'doe je zelf mee met je eigen trekker; een medespeler doet in zijn eigen spel mee, de prijs is voor degene die de rit doet',
};
export const trekkertrekAvailable = (region, day) => !!festivalOn(region, day);
export const pullPrize = (cls, place) => { const c = TRACTOR_PULL.classes.find((x) => x.id === cls); return c && place >= 1 && place <= c.prizes.length ? c.prizes[place - 1] : 0; };

// ---- alle gebeurtenissen van een dag voor een speler (voor het meldingenscherm) ----
// ctx: { regions: [streek-id's van je percelen en panden], seed (spelerszaad), machines: [{ id, name, wear, price }], herds: [...], buildings: [{ id, stock }], audit: state voor inspection }
// Geeft een lijst { id, kind, scope, region?, title, text, first } met first = begint vandaag (alleen dan een melding).
export function eventsOn(day, ctx = {}) {
  const out = [], seed = ctx.seed || '';
  for (const r of [...new Set(ctx.regions || [])]) {
    for (const id of ['droogte', 'stortbui', 'mierenplaag', 'wespen', 'staking', 'veiling']) {
      const span = activeSpan(EVENT_DEFS[id], r, day);
      if (span) out.push({ id, kind: EVENT_DEFS[id].kind, scope: 'region', region: r, title: EVENT_DEFS[id].label, text: fill(EVENT_DEFS[id].text, { r: regionName(r), bond: UNION }), first: span.first });
    }
    const fest = festivalOn(r, day);
    if (fest) out.push({ id: fest.kind, kind: 'verhaal', scope: 'region', region: r, title: fest.name, text: `${fest.name} in ${regionName(r)}: de winkels draaien extra.`, first: false });
  }
  const vd = auctionDay(day); if (vd) out.push({ id: 'veilingdag', kind: 'kans', scope: 'global', title: 'Veilingdag', text: vd.text, first: true });
  const fair = fairOn(day); if (fair) out.push({ id: 'landbouwbeurs', kind: 'kans', scope: 'global', title: FAIR, text: fair.text, first: fair.dayOfFair === 1 });
  for (const m of ctx.machines || []) { const b = machineBreakdown(m, day, seed); if (b) out.push({ id: 'machine', kind: 'pech', scope: 'asset', asset: m.id, title: EVENT_DEFS.machine.label, text: b.text, first: true, cost: b.cost, days: b.days }); }
  for (const h of ctx.herds || []) { const s = herdSickness(h, day, seed); if (s) out.push({ id: 'vee', kind: 'pech', scope: 'asset', asset: h.id, title: EVENT_DEFS.vee.label, text: s.text, first: s.first, cost: s.vetCost, days: s.days }); }
  for (const b of ctx.buildings || []) { const c = coolingFailure(b.id, day, b.stock, seed); if (c) out.push({ id: 'koeling', kind: 'pech', scope: 'asset', asset: b.id, title: EVENT_DEFS.koeling.label, text: c.text, first: true, lost: c.lost }); }
  const ins = ctx.audit ? inspection(ctx.audit, day, seed) : null; if (ins) out.push({ id: 'inspectie', kind: 'pech', scope: 'player', title: INSPECTORATE, text: ins.text, first: true, amount: ins.amount });
  const nb = neighborScene(day, seed); if (nb) out.push({ id: 'buren', kind: 'verhaal', scope: 'player', title: 'Buren', text: nb.text, first: true, choices: nb.choices, scene: nb.id });
  return out;
}

// Alle spelertekst van de definities, voor de tekstcontrole van de test (Nederlands, altijd zomer).
export const ALL_TEXTS = () => [
  ...Object.values(EVENT_DEFS).flatMap((d) => [d.label, d.text]),
  ...NEIGHBOR_SCENES.flatMap((s) => [s.text, ...s.choices.flatMap((c) => [c.label, c.result])]),
  ...FESTIVALS.map((f) => f.name), ...TRACTOR_PULL.rules, TRACTOR_PULL.label, TRACTOR_PULL.place, ...TRACTOR_PULL.classes.map((c) => c.label),
  FAIR, INSPECTORATE, UNION,
];
