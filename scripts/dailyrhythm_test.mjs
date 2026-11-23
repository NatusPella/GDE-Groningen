// Dagritmes van de stad (game/js/dailyrhythm.js, #1314): het schema per uur en dag, de keuze van bestemmingen,
// de terrasbezetting, het uitgaanspubliek en het plan bij aankomst. Pure test, zonder wereld.
//   node scripts/dailyrhythm_test.mjs
import fs from 'node:fs';
import {
  DAY_PARTS, DEST_KINDS, NIGHTLIFE_SPOTS, dayPartOf, isWeekend, effectiveWeekday, weekdayOfGameDay, readClock,
  destWeights, pickDestKind, paceFor, terraceShare, nightlifeScale, arrivalPlan, talkChance, topKinds,
} from '../game/js/dailyrhythm.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };

// een vaste reeks worpen (geen Math.random: de test is reproduceerbaar)
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function share(hour, weekday, kind, N = 4000, avail = null) {
  const r = rng(hour * 100 + weekday);
  let k = 0;
  for (let i = 0; i < N; i++) if (pickDestKind(hour, weekday, r(), avail) === kind) k++;
  return k / N;
}

// --- dagdelen --------------------------------------------------------------------------------------------
ok(dayPartOf(3) === 'nacht' && dayPartOf(6) === 'vroeg' && dayPartOf(8) === 'ochtendspits' && dayPartOf(10) === 'ochtend', 'ochtend-dagdelen');
ok(dayPartOf(12.5) === 'lunch' && dayPartOf(15) === 'middag' && dayPartOf(17.5) === 'avondspits' && dayPartOf(20) === 'avond' && dayPartOf(23) === 'laat', 'middag- en avonddagdelen');
ok(dayPartOf(24) === 'nacht' && dayPartOf(-1) === 'laat' && dayPartOf(NaN) === 'lunch', 'uur buiten bereik wordt genormaliseerd');
for (let h = 0; h < 24; h += 0.25) ok(DAY_PARTS.includes(dayPartOf(h)), 'elk uur heeft een dagdeel', String(h));

// --- weekdag ---------------------------------------------------------------------------------------------
// dag 1 = vrijdag 14 augustus 2026: dezelfde uitkomst als calendar.js weekdayOf (zonder die module te laden: die haalt het verhaal binnen)
for (let d = 1; d <= 60; d++) ok(weekdayOfGameDay(d) === new Date(Date.UTC(2026, 7, 14 + d - 1)).getUTCDay(), 'weekdag van speldag ' + d);
ok(weekdayOfGameDay(1) === 5 && isWeekend(weekdayOfGameDay(2)) && isWeekend(weekdayOfGameDay(3)) && !isWeekend(weekdayOfGameDay(4)), 'vr, za, zo, ma');
ok(effectiveWeekday(2, 6) === 5 && effectiveWeekday(7, 6) === 6, 'na middernacht hoort de nacht bij de avond ervoor');
{
  const c = readClock({ dayNight: { hour: 8.5 }, calendar: { day: 4 }, weather: { wet: 0.5 } }, {});
  ok(c.hour === 8.5 && c.weekday === 1 && c.wet === 0.5, 'readClock leest uur, kalenderdag en nat');
  const d = readClock({}, {});
  ok(d.hour === 14 && d.weekday === 5 && d.wet === 0, 'readClock zonder wereld: veilige standaard');
}

// --- schema: ochtendspits naar werk/school/station, middag winkels, avond horeca, nacht uitgaan of huis -----
const MA = 1, ZA = 6;
{
  const commute = (h, wd) => share(h, wd, 'werk') + share(h, wd, 'school') + share(h, wd, 'station') + share(h, wd, 'halte');
  ok(commute(8, MA) > 0.7, 'werkdag 08.00: meer dan 70% op weg naar werk, school, station of halte', commute(8, MA).toFixed(2));
  ok(commute(8, ZA) < 0.35, 'zaterdag 08.00: geen spits', commute(8, ZA).toFixed(2));
  ok(share(15, MA, 'winkel') > share(15, MA, 'werk'), 'werkdag middag: meer winkels dan werk');
  ok(share(15, ZA, 'winkel') > share(15, MA, 'winkel'), 'zaterdagmiddag nog meer winkelend publiek');
  ok(share(12.5, MA, 'horeca') > 0.25, 'lunch: horeca', share(12.5, MA, 'horeca').toFixed(2));
  ok(share(20, MA, 'horeca') > 0.3 && share(20, MA, 'horeca') > share(20, MA, 'winkel') * 3, 'avond: horeca, nauwelijks winkels');
  ok(share(2, MA, 'uitgaan') + share(2, MA, 'huis') > 0.75, 'nacht: uitgaan of naar huis');
  ok(share(3, MA, 'werk') < 0.05 && share(3, MA, 'school') === 0 && share(3, MA, 'winkel') === 0, 'nacht: geen werk, school of winkel');
  ok(share(8, ZA, 'school') === 0, 'geen school in het weekend');
  ok(share(17.5, MA, 'huis') + share(17.5, MA, 'station') + share(17.5, MA, 'halte') > 0.5, 'avondspits: naar huis, station of halte');
}
// elke soort komt op een gewone werkdag ergens voor, en geen gewicht is negatief
{
  const seen = new Set();
  for (let h = 0; h < 24; h += 0.5) for (const wd of [MA, ZA]) {
    const w = destWeights(h, wd);
    for (const k of DEST_KINDS) { ok(w[k] >= 0, 'gewicht niet negatief', k + '@' + h); if (w[k] > 0) seen.add(k); }
  }
  ok(DEST_KINDS.every((k) => seen.has(k)), 'elke bestemmingssoort komt voor in het schema');
  ok(topKinds(8, MA)[0] === 'werk' && topKinds(20, MA)[0] === 'horeca' && topKinds(15, ZA)[0] === 'winkel', 'zwaarste soort per moment', topKinds(8, MA) + ' / ' + topKinds(20, MA) + ' / ' + topKinds(15, ZA));
}

// --- keuze bestemmingen -------------------------------------------------------------------------------------
ok(pickDestKind(8, MA, 0) !== null && pickDestKind(8, MA, 0.9999) !== null, 'worp 0 en bijna 1 geven een soort');
ok(pickDestKind(8, MA, 0.5, () => false) === null, 'niets in de buurt: null (terugval op een straatwandeling)');
ok(share(8, MA, 'station', 2000, (k) => k !== 'station') === 0, 'een soort zonder plekken in de buurt wordt nooit gekozen');
ok(share(8, MA, 'werk', 2000, (k) => k === 'werk') === 1, 'alleen werk beschikbaar: altijd werk');
ok(pickDestKind(8, MA, 0.3) === pickDestKind(8, MA, 0.3), 'zelfde worp, zelfde soort (deterministisch)');
ok(pickDestKind(8, MA, NaN) !== undefined && pickDestKind(8, MA, 7) !== null, 'onzinworp blijft binnen het bereik');

// --- tempo --------------------------------------------------------------------------------------------------
ok(paceFor(8, MA) > 1.1 && paceFor(20, MA) < 1 && paceFor(8, ZA) <= 1, 'spits met haast, avond slenterend, weekend rustig');
for (let h = 0; h < 24; h++) ok(paceFor(h, MA) > 0.8 && paceFor(h, MA) < 1.25, 'tempo binnen redelijke grenzen', String(h));

// --- terrassen ----------------------------------------------------------------------------------------------
ok(terraceShare(8, MA) < 0.1 && terraceShare(4, MA) < 0.1, 'terras leeg in de vroege ochtend en de nacht');
ok(terraceShare(12.5, MA) > 0.5 && terraceShare(20, MA) > 0.7, 'terras vol bij de lunch en de avond');
ok(terraceShare(15, ZA) > terraceShare(15, MA), 'zaterdagmiddag drukker op het terras');
ok(terraceShare(20, MA, 1) < terraceShare(20, MA, 0) * 0.3, 'regen jaagt het terras leeg');
for (let h = 0; h < 24; h += 0.5) ok(terraceShare(h, ZA) >= 0 && terraceShare(h, ZA) <= 0.9, 'terrasbezetting 0..0,9');

// --- uitgaanspubliek ----------------------------------------------------------------------------------------
ok(nightlifeScale(14, 5) === 0 && nightlifeScale(19, 5) === 0, 'overdag en vroeg op de avond geen uitgaanspubliek');
ok(nightlifeScale(1, 6) === 1 && nightlifeScale(23.5, 4) === 1, 'vrijdagnacht en donderdagavond laat vol');
ok(nightlifeScale(1, 2) < nightlifeScale(1, 6) && nightlifeScale(1, 2) > 0, 'maandagnacht rustiger maar niet leeg');
ok(NIGHTLIFE_SPOTS.length === 3 && NIGHTLIFE_SPOTS.every((s) => Number.isFinite(s.x) && s.r > 0), 'drie uitgaanskernen');

// --- plan bij aankomst --------------------------------------------------------------------------------------
{
  const p = (h, kind, r, ctx) => arrivalPlan(h, MA, kind, r, ctx);
  ok(p(8, 'werk', [0.1, 0.5, 0.9], { building: true }).act === 'binnen', 'naar het werk: naar binnen');
  ok(p(8, 'werk', [0.1, 0.5, 0.9], { building: false }).act !== 'binnen', 'zonder pand dichtbij niet naar binnen');
  ok(p(12.5, 'horeca', [0.2, 0.5, 0.9], { terrace: true, building: true }).act === 'terras', 'lunch bij horeca met vrije stoel: terras');
  ok(p(8, 'horeca', [0.5, 0.5, 0.9], { terrace: true, building: true }).act !== 'terras', 'om acht uur niet op het terras');
  ok(p(12.5, 'park', [0.9, 0.1, 0.9], { bench: true }).act === 'bank', 'lunch in het park: op een bankje');
  ok(p(12.5, 'park', [0.9, 0.1, 0.1], { bench: false }).act === 'telefoon', 'geen bank: telefoon');
  ok(p(20, 'park', [0.9, 0.9, 0.2], { companion: true }).act === 'praten', 'met zijn tweeën: praten');
  ok(p(10, 'winkel', [0.9, 0.5, 0.1], { bike: true, building: true }).act === 'fiets', 'fiets op slot bij een rek');
  ok(p(3, 'winkel', [0.9, 0.5, 0.1], { bike: true, building: true }).act !== 'fiets', "'s nachts niet");
  const h = p(8, 'halte', [0.9, 0.9, 0.9], {});
  ok(h.act === 'wachten' && h.dur >= 15, 'bij de halte langer wachten', JSON.stringify(h));
  const r = rng(7);
  for (let i = 0; i < 300; i++) {
    const kind = DEST_KINDS[i % DEST_KINDS.length], hour = (i * 0.37) % 24;
    const pl = arrivalPlan(hour, i % 7, kind, [r(), r(), r()], { terrace: r() < 0.5, bench: r() < 0.5, bike: r() < 0.3, building: r() < 0.7, companion: r() < 0.3 });
    ok(['binnen', 'terras', 'bank', 'fiets', 'telefoon', 'praten', 'wachten'].includes(pl.act) && pl.dur > 0 && pl.dur < 200, 'plan is geldig', JSON.stringify(pl));
  }
  ok(talkChance(20) > talkChance(8), "'s avonds wordt er meer gepraat dan in de spits");
}

// --- bedrading: pedroutes gebruikt het ritme, cityprops de terrasbezetting, pedestrians het uitgaanspubliek ---------
{
  const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  const pr = src('pedroutes.js'), cp = src('cityprops.js'), pe = src('pedestrians.js');
  ok(/pickDestKind\(clock\.hour, clock\.weekday/.test(pr) && /arrivalPlan\(clock\.hour/.test(pr), 'pedroutes kiest soort en plan uit het dagritme');
  ok(/freeTerraceSeat\(/.test(pr) && /claimTerraceSeat\(/.test(pr), 'pedroutes laat wandelaars op een terrasstoel gaan zitten');
  ok(/terraceShare\(rhythm\.hour, rhythm\.weekday, rhythm\.wet\)/.test(cp) && /registerTerraceSlots\(/.test(cp), 'cityprops vult de terrassen naar het ritme en meldt de stoelen aan');
  ok(/setRhythmClock\(/.test(pe) && /nightlifeScale\(/.test(pe), 'pedestrians zet de klok en schaalt het uitgaanspubliek');
  ok(!/new Pedestrian|buildPersonMesh|BoxGeometry/.test(src('dailyrhythm.js')), 'dailyrhythm.js is puur: geen eigen figuren of geometrie');
}

// --- terrasstoelen (terraceseats.js) -----------------------------------------------------------------------
{
  const T = await import('../game/js/terraceseats.js');
  T.clearTerraceSlots();
  const a = { kind: 'terrace', x: 0, y: 0, angle: 0, propKey: 'chair@a' }, b = { kind: 'terrace', x: 5, y: 0, angle: 0, propKey: 'chair@b' };
  T.registerTerraceSlots('0,0', [a, b, { kind: 'vendor', x: 1, y: 1 }]);
  ok(T.terraceSlotCount() === 2, 'alleen terrasstoelen worden aangemeld');
  ok(T.freeTerraceSeat(1, 0, 10) === a, 'de dichtstbijzijnde vrije stoel');
  const ped = { state: 'wander', nav: { sit: null } };
  T.claimTerraceSeat(a, ped, 0); ped.nav.sit = { slot: a };
  ok(T.freeTerraceSeat(1, 0, 10) === b, 'een bezette stoel wordt overgeslagen');
  ped.nav.sit = null;
  ok(T.freeTerraceSeat(1, 0, 10) === a, 'een verlopen bezetting (wandelaar zit er niet meer) vervalt vanzelf');
  a.ped = {}; ok(T.freeTerraceSeat(1, 0, 10) === b, 'een stoel met een scènefiguur is bezet'); a.ped = null;
  ok(T.freeTerraceSeat(1, 0, 10, 0, (k) => k === 'chair@a') === b, 'een kapotte stoel is niet vrij');
  ok(T.freeTerraceSeat(100, 0, 10) === null, 'buiten bereik: null');
  T.unregisterTerraceSlots('0,0');
  ok(T.terraceSlotCount() === 0, 'een gevallen cel meldt zijn stoelen af');
}

console.log(fails ? `dailyrhythm_test: ${fails} van ${n} mislukt` : `dailyrhythm_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
