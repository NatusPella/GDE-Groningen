// Logic test for the HUD rules (hudrules.js, hudgps.js, roadaccess.js):
//   node scripts/hud_test.mjs
import * as R from '../game/js/hudrules.js';
import { nextTurn, turnText } from '../game/js/hudgps.js';
import * as A from '../game/js/roadaccess.js';
import * as U from '../game/js/uiscale.js';
import { readFileSync, readdirSync } from 'node:fs';
import * as L from '../game/js/hudlook.js';
import { PALETTES } from '../game/js/a11y.js';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const d = (s) => R.decideHud(s);

// quiet walk: only the minimap and the clock
let q = d({ hpFull: true, stamFull: true });
ok(q.show.minimap && q.show.clock, 'minimap and a small clock when walking');
ok(!q.show.stars && !q.show.money && !q.show.weapon && !q.show.bars && !q.show.vehicle && !q.show.gps, 'nothing else when nothing happens');
ok(!q.big.clock, 'clock small on a normal day');
ok(d({ specialDay: true }).big.clock && d({ timeGoal: true }).big.clock, 'clock big on a special day or with a time goal');

// stars: wanted + 6 s afterglow
ok(d({ wanted: 2 }).show.stars, 'stars when wanted');
ok(d({ wanted: 0, wantedAgo: 5 }).show.stars && !d({ wanted: 0, wantedAgo: 7 }).show.stars, 'stars glow on for 6 s');
// money
ok(d({ moneyAgo: 1 }).show.money && !d({ moneyAgo: 6 }).show.money, 'money on change, gone after 5 s');
ok(d({ nearShop: true }).show.money, 'money near a shop');
ok(!d({ moneyAgo: 1, busy: true, wanted: 1 }).show.money, 'money coming in waits in a chase');
// weapon / bars / vehicle
ok(d({ armed: true }).show.weapon && !d({}).show.weapon, 'weapon only when armed');
ok(d({ hpFull: false }).show.bars && d({ hpLow: true }).show.bars && !d({ hpFull: true, stamFull: true }).show.bars, 'bars only when not full');
ok(d({ stamFull: false }).show.bars, 'bars while stamina is down');
ok(d({ inVehicle: true }).show.vehicle && !d({}).show.vehicle, 'vehicle widgets only in a vehicle');
ok(d({ keys: 2 }).show.keys && !d({ keys: 0 }).show.keys, 'keys only when there is something to do');
// one card, priorities
ok(d({ cardA: R.P3, busy: true, wanted: 1 }).show.cardA === false, 'P3 cards wait during a chase');
ok(d({ cardA: R.P0, busy: true, wanted: 1 }).show.cardA, 'P0 cards always');
ok(d({ cardA: R.P1, busy: true, wanted: 1 }).show.cardA, 'P1 cards in a chase');
ok(!d({ cardE: R.P3, busy: true }).show.cardE && d({ cardE: R.P3 }).show.cardE, 'E waits in a chase');
ok(!d({ cardA: R.P3, dialogue: true }).show.cardA && d({ cardA: R.P2, dialogue: true }).show.cardA, 'tips wait out a conversation, a text does not');
// B: place name never with a timer, GPS wins
ok(!d({ place: true, timer: true }).show.place && !d({ place: true, gps: true }).show.place && d({ place: true }).show.place, 'place name only when B is free');
ok(!d({ place: true, busy: true, wanted: 1 }).show.place, 'place name waits when busy');
// G
ok(d({ objective: true, subtitle: true }).dimObjective && !d({ objective: true }).dimObjective, 'objective dims under a subtitle');
// rest: Slim only
const idle = { idle: 9, hpFull: true, stamFull: true, objective: true, inVehicle: true, keys: 2, moneyAgo: 1 };
const r = d(idle);
ok(r.show.minimap && !r.show.objective && !r.show.vehicle && !r.show.keys && !r.show.money, 'after 8 s idle only the minimap stays');
ok(d({ ...idle, wake: true }).show.vehicle, 'a key press brings it back');
ok(d({ ...idle, mode: 'alles' }).show.vehicle, 'Altijd alles never rests');
// never
ok(!Object.values(d({ hidden: true, wanted: 3, objective: true }).show).some(Boolean), 'nothing in cutscenes, photo mode and the map');
ok(d({ banner: true }).dimAll, 'a P0 banner dims the rest');
// minimaal
const mm = d({ mode: 'minimaal', wanted: 2, objective: true, subtitle: true, armed: true, inVehicle: true, moneyAgo: 1, cardA: R.P3, hpFull: false });
ok(mm.show.stars && mm.show.objective && mm.show.subtitle && !mm.show.minimap && !mm.show.money && !mm.show.weapon && !mm.show.vehicle && !mm.show.cardA, 'Minimaal: stars, objective, subtitles only');
ok(d({ mode: 'minimaal', cardA: R.P0 }).show.cardA, 'Minimaal keeps P0');
// ceiling: at most 6 besides the minimap, P3 then clock then money go first
const full = d({ wanted: 3, moneyAgo: 1, armed: true, hpFull: false, inVehicle: true, vehFull: false, keys: 2, objective: true, subtitle: true, cardA: R.P3, cardE: R.P3, gps: true, place: false });
ok(full.count <= R.CEILING, 'ceiling of 6 holds, got ' + full.count);
ok(!full.show.cardA && !full.show.cardE, 'P3 goes first over the ceiling');
ok(full.show.stars && full.show.objective && full.show.vehicle, 'P1/P2 stay');
// what talks: a message, the radio and a subtitle never stack all three
const talk = d({ cardA: R.P2, cardE: R.P3, subtitle: true });
ok(talk.show.cardA && !talk.show.cardE && talk.show.subtitle, 'of message, radio and subtitle the P3 one gives way');
ok(d({ cardA: R.P3, cardE: R.P2, subtitle: true }).show.cardE === true && d({ cardA: R.P3, cardE: R.P2, subtitle: true }).show.cardA === false, 'the lower priority gives way, also in A');
ok(d({ cardA: R.P2, cardE: R.P3 }).show.cardE, 'two talkers are fine');
// zone board
const z = new R.ZoneBoard();
ok(z.occupy('A', 'card', R.P3) && !z.occupy('A', 'phone', R.P2), 'one holder per zone');
z.setWaiting('A', 'phone', 2, R.P1);
ok(z.pressured('A', 'card') && z.waiting('A') === 2, 'a higher priority waiting pressures the holder');
z.vacate('A', 'card');
ok(z.occupy('A', 'phone', R.P1), 'a zone frees up');
// deferred: waits, lapses after 30 s
const df = new R.Deferred();
df.offer('x');
ok(df.tick(10, true) === 'wait' && df.tick(25, true) === 'drop' && df.tick(1, false) === 'none', 'P3 lapses after 30 s of waiting');
df.offer('y');
ok(df.tick(1, false) === 'show', 'and shows when quiet');

// GPS turns
const right = [[0, 0], [100, 0], [200, 0], [200, 100], [200, 200]];
const t1 = nextTurn(right, 400);
ok(t1 && t1.side === 'rechts' && Math.abs(t1.dist - 200) < 1, 'a right turn 200 m ahead (y points south)');
ok(turnText(t1) === 'Over 200 m rechtsaf', 'turn text ' + turnText(t1));
const left = [[0, 0], [100, 0], [100, -100]];
ok(nextTurn(left, 400).side === 'links', 'a left turn');
ok(nextTurn([[0, 0], [100, 0], [300, 0], [900, 0]], 400) === null, 'straight: no card');
ok(nextTurn(right, 150) === null, 'beyond 400 m (here 150): no card');
ok(nextTurn([[0, 0], [100, 0], [300, 5], [900, 5]], 400) === null, 'a slight bend is no turn');
ok(turnText({ dist: 10, dir: 'linksaf' }) === 'Nu linksaf', 'close: Nu');

// travel modes and access
ok(A.travelModeOf({ player: {} }) === 'lopen', 'on foot');
ok(A.travelModeOf({ player: { inVehicle: { isBike: true } } }) === 'fiets' && A.travelModeOf({ player: { inVehicle: { isBoat: true } } }) === 'boot' && A.travelModeOf({ player: { inVehicle: { isHeli: true } } }) === 'lucht' && A.travelModeOf({ player: { inVehicle: {} } }) === 'auto', 'bike, boat, heli, car');
ok(A.travelModeOf({ player: { inVehicle: { isScooter: true, model: {} } } }) === 'fiets', 'e-step is fiets');
ok(A.travelModeOf({ player: { inVehicle: { isScooter: true, model: { moped: true } } } }) === 'auto' && A.travelModeOf({ player: { inVehicle: { isScooter: true, model: { motorbike: true } } } }) === 'auto', 'brommer en motor blijven auto');
ok(A.travelModeOf({ player: {}, trainDriving: true }) === 'ov', 'train is OV');
ok(A.roadAllowed({ type: 'trunk', cat: 'major' }, 'lopen') === false && A.roadAllowed({ type: 'trunk', cat: 'major' }, 'fiets') === false && A.roadAllowed({ type: 'trunk', cat: 'major' }, 'auto') === true, 'no walking or cycling on a trunk road');
ok(A.roadAllowed({ type: 'footway', cat: 'foot' }, 'auto') === false && A.roadAllowed({ type: 'cycleway', cat: 'cycle' }, 'auto') === false && A.roadAllowed({ type: 'cycleway', cat: 'cycle' }, 'fiets') === true, 'no cars on cycleways and footways');
ok(A.roadAllowed({ type: 'footway', cat: 'foot' }, 'fiets') === false && A.roadAllowed({ type: 'pedestrian', cat: 'foot' }, 'lopen') === true, 'no bikes on footways');
ok(A.roadAllowed({ type: 'trunk' }, 'boot') === null, 'no road rules for a boat');
ok(A.minimapScale('lucht', 0) < A.minimapScale('lopen', 0), 'zoomed out in the air');
ok(A.minimapScale('auto', 28) < A.minimapScale('auto', 0), 'car zoom scales with speed');
ok(A.northUp('lucht', 'lucht') && !A.northUp('lucht', 'auto') && A.northUp('altijd', 'lopen') && !A.northUp('nooit', 'lucht'), 'north-up setting');

// the minimap's backing store stays square, also from a fresh 300x150 canvas
// at every HUD pixel ratio (dpr x --ui; 250 HUD px at 1.2x is exactly 300)
for (const ratio of [0.8, 1, 1.2, 1.25, 1.5, 2, 2.4, 3, 4.8]) {
  const c = { width: 300, height: 150 }, px = Math.round(250 * ratio);
  U.sizeSquareCanvas(c, px);
  ok(c.width === px && c.height === px, `minimap canvas square at ratio ${ratio}`);
}
{
  const c = { width: 300, height: 300 };
  ok(!U.sizeSquareCanvas(c, 300) && U.sizeSquareCanvas(c, 600) && c.height === 600, 'minimap canvas resized only when needed');
}

// hudlook.js: one visual language
ok(L.vehicleKind(null) === null && L.vehicleKind({ isBike: true }) === 'bike' && L.vehicleKind({ isBoat: true }) === 'boat' && L.vehicleKind({ isHeli: true }) === 'heli' && L.vehicleKind({ isScooter: true }) === 'scooter' && L.vehicleKind({}) === 'car' && L.vehicleKind({}, { train: true }) === 'train', 'vehicle kinds');
for (const k of L.VEHICLE_KINDS) ok(L.VEHICLE_HUD[k].speed && L.speedoLook(k, true).visible, 'every vehicle shows its speed: ' + k);
ok(L.speedoLook('car', true).gears && L.speedoLook('car', true).rpm && !L.speedoLook('car', false).rpm, 'a car with an engine shows gears and revs');
ok(L.vehicleKind({ isScooter: true, model: { motorbike: 'sport' } }) === 'motor' && L.vehicleKind({ isScooter: true, model: { moped: true, geared: true } }) === 'motor' && L.vehicleKind({ isScooter: true, model: { moped: true } }) === 'scooter', 'motor en brommer met versnellingen zijn motor'); ok(L.speedoLook('motor', true).gears && L.speedoLook('motor', true).rpm && !L.speedoLook('motor', false).gears, 'motor toont versnelling en toeren met een motor');
for (const k of ['bike', 'boat', 'heli', 'train', 'scooter']) ok(!L.speedoLook(k, true).gears && !L.speedoLook(k, true).rpm, 'no gears or revs on ' + k);
ok(!L.speedoLook('bike').damage && !L.speedoLook('train').damage && L.speedoLook('boat').damage, 'damage meter only where a vehicle can break');
ok(!L.speedoLook('onbekend').visible, 'unknown vehicle: nothing');
ok(L.meterLevel(1) === 'ok' && L.meterLevel(0.3) === 'low' && L.meterLevel(0.15) === 'crit' && L.meterLevel(NaN) === 'crit' && L.meterLevel(0.9, { invert: true }) === 'crit', 'meter levels');
for (const [name, pal] of Object.entries(PALETTES)) {
  const okL = L.meterLook('ok', pal), lowL = L.meterLook('low', pal), critL = L.meterLook('crit', pal);
  ok(okL.color !== lowL.color, 'ok and low differ in colour in ' + name);
  ok(okL.pattern !== lowL.pattern && lowL.glyph && critL.pulse && !lowL.pulse, 'low differs by shape too in ' + name);
}
for (const w of [[1280, 720], [1920, 1080], [2560, 1440], [3840, 2160]]) {
  const e = L.hudEdge(w[0], w[1], 1);
  ok(e >= L.EDGE_MIN && e <= L.EDGE_MAX, 'edge in range at ' + w[1] + 'p: ' + e);
}
ok(L.hudEdge(1280, 720) <= L.hudEdge(3840, 2160, 1), 'edge grows with the screen');
ok(L.textPx(11, 1) === L.READABLE_MIN && L.textPx(18, 2) === 36 && L.textPx(18, 0.8) === 18, 'text never below the readable minimum');
ok(L.distanceOwner({ gps: true, objective: true }) === 'gps' && L.distanceOwner({ objective: true }) === 'objective' && L.distanceOwner() === null, 'one owner per distance');
ok(L.vehicleLabelOwner({ nameCardVisible: true }) === 'card' && L.vehicleLabelOwner() === 'meter', 'one owner per vehicle name');

// contrast: marks and meters stay readable on the HUD card in every palette
ok(Math.abs(L.contrast('#000000', '#ffffff') - 21) < 0.01 && L.contrast('#123456', '#123456') === 1, 'contrast maths');
ok(L.contrast('#f0ede4', L.HUD_CARD_BG) >= L.TEXT_CONTRAST, 'HUD text on the card');
for (const [name, pal] of Object.entries(PALETTES)) {
  for (const k of ['ok', 'danger', 'mission', 'user', 'job', 'police']) {
    if (name === 'uit' && k === 'police') continue; // the map's blue, drawn on a light ring
    ok(L.contrast(pal[k], L.HUD_CARD_BG) >= L.GRAPHIC_CONTRAST, 'contrast of ' + k + ' in ' + name + ': ' + L.contrast(pal[k], L.HUD_CARD_BG).toFixed(2));
  }
}
// #169: no loose mode switches; the planner follows your vehicle unless another way is chosen
ok(A.planModeFor(null, 'auto') === null && A.planModeFor('zelf', 'fiets') === null && A.planModeFor('auto', 'auto') === null, 'your own way plans as null');
ok(A.planModeFor('ov', 'lopen') === 'ov' && A.planModeFor('boot', 'auto') === 'boat' && A.planModeFor('onbekend', 'auto') === null, 'another way plans for that mode');
{
  const src = readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
  ok(!/mapview-modes|data-act="mode"/.test(src), 'the map has no mode switches any more');
}

// #168: 'x prestaties wachten' is not in the HUD any more; the count is a quiet dot in the pause menu
{
  const dir = new URL('../game/js/', import.meta.url);
  const hud = readdirSync(dir).filter((f) => /^(hud.*|prompts|narrative|attention).(js|css)$/.test(f));
  ok(hud.length > 3, 'found the HUD sources');
  for (const f of hud) ok(!/prestaties? (wachten|wacht)/.test(readFileSync(new URL(f, dir), 'utf8')), 'no achievement counter notice in ' + f);
  ok(!/unseenAchievementCount/.test(readFileSync(new URL('hudcards.js', dir), 'utf8')), 'hudcards.js does not count unseen achievements');
}
// --- HUD text budget (#92): hudtext.js and scripts/hud_text_audit.mjs ---------
{
  const T = await import('../game/js/hudtext.js');
  const AU = await import('./hud_text_audit.mjs');
  ok(T.wordCount('') === 0 && T.wordCount('Brug open') === 2 && T.wordCount('  een   twee  ') === 2 && T.wordCount('<b>Ga</b> {E} nu') === 3, 'wordCount');
  ok(T.wordCount('km/u · 30') === 3 && T.wordCount(null) === 0, 'wordCount separators and null');
  ok(T.trimWords('Dit is een lange zin hier', 3) === 'Dit is een' && T.trimWords('kort', 3) === 'kort', 'trimWords');
  ok(T.trimWords('Te weinig geld, even wachten', 3) === 'Te weinig geld', 'trimWords drops a trailing comma');
  // the seen counter: an explanation shows EXPLAIN_TIMES times, then never
  let seen = T.emptySeen();
  ok(T.wantsExplain(seen, 'a'), 'new explanation wanted');
  for (let i = 0; i < T.EXPLAIN_TIMES; i++) seen = T.markSeen(seen, 'a');
  ok(!T.wantsExplain(seen, 'a') && T.wantsExplain(seen, 'b'), 'explanation gone after its times, others unaffected');
  ok(T.markSeen(T.emptySeen(), 'a') !== T.emptySeen() && T.seenCount(T.markSeen({ a: 9 }, 'a'), 'a') === 9, 'markSeen is pure and capped');
  ok(JSON.stringify(T.parseSeen('{"a":2,"b":"x","c":-1,"d":1.5}')) === '{"a":2}' && Object.keys(T.parseSeen('kapot')).length === 0 && Object.keys(T.parseSeen('[1]')).length === 0, 'parseSeen drops junk');
  ok(T.withExplain('kort', 'lang uitleg', {}, 'x') === 'lang uitleg' && T.withExplain('kort', 'lang uitleg', { x: 5 }, 'x') === 'kort', 'withExplain');
  // hints: a long explanation only the first times; blocked reasons stay short; short subs stay
  const long = { label: 'Binnenlopen', sub: 'Een lange uitleg over wat hier kan en waarom dat leuk is' };
  ok(T.promptSub(long, {}) === long.sub && T.promptSub(long, { 'hint:Binnenlopen': 2 }) === '', 'long hint sub only the first times');
  ok(T.promptSub({ label: 'X', sub: 'Fiets 2/5' }, { 'hint:X': 9 }) === 'Fiets 2/5', 'short sub always');
  ok(T.promptSub({ label: 'X', sub: 'Te weinig geld voor dit ding hier', dim: true }, { 'hint:X': 9 }) === 'Te weinig geld', 'blocked reason cut to 3 words');
  ok(T.promptSub({ label: 'X', sub: 'Lange tekst met veel woorden erin hier', learn: true }, { 'hint:X': 9 }) !== '', 'learning hint keeps its text');
  ok(T.explains(long, {}) && !T.explains(long, { 'hint:Binnenlopen': 2 }) && !T.explains({ label: 'X', sub: 'kort' }, {}), 'explains() counts only long first-time subs');
  // the inventory: nothing over its budget (lower the ceilings in hud_text_audit.mjs when texts shrink)
  const rows = AU.auditHudText();
  ok(rows.length > 100, 'the audit finds the HUD texts', rows.length);
  const over = AU.overBudget(rows);
  const byKind = {};
  for (const r of over) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  for (const [k, lim] of Object.entries(AU.LIMITS)) ok((byKind[k] || 0) <= lim, `HUD text over budget: ${k}`, over.filter((r) => r.kind === k).map((r) => `${r.where} ${r.words}/${r.budget}`).join('; '));
  ok(!over.some((r) => !(r.kind in AU.LIMITS)), 'every audited kind has a ceiling', over.map((r) => r.kind).join());
  // the one place that stays long on purpose: the first-time travel help is shown, then gone
  const RV = await import('../game/js/reisview.js');
  const beat = { to: 'Winsum', length: 9000, ride: 'bus', lines: ['a'] };
  ok(RV.panelState(beat, null, {}).help === 'Kies hoe je gaat' && RV.panelState(beat, null, { [RV.TRAVEL_HELP_ID]: 2 }).help === '', 'travel help only the first times');
  ok(RV.panelState(beat).rule === '9,0 km', 'travel rule is the distance');
}

// channel cases (#104): the surfaces of hudbus.js sit in the HUD's zones, and a card asked through the surface
// or through hudrules.js gets the same answer
{
  const B = await import('../game/js/hudbus.js');
  for (const [id] of Object.entries(B.SURFACES)) { const z = B.surfaceZone(id); ok(z === null || z in R.ZONES, `surface ${id}: zone ${z} is a HUD zone`); }
  for (const k of Object.keys(B.KINDS)) ok(B.cardZone(k) in R.ZONES && R.cardPrio(k) === B.cardPrio(k) && R.cardZone(k) === B.cardZone(k), `card kind ${k}: P and zone shared with hudrules.js`);
  for (const [k, v] of Object.entries(B.KINDS)) {
    for (const ctx of [{}, { busy: true }, { dialogue: true }, { busy: true, dialogue: true }]) {
      ok(R.mayShow(v.p, { ...ctx, zone: v.zone }) === B.mayShow('hud', { p: v.p, zone: v.zone, ...ctx }), `card ${k}: hudrules and hudbus agree ${JSON.stringify(ctx)}`);
    }
  }
  // a chase holds a tip and a money card in zone A, not the police and not a mission card
  const held = (kind, ctx) => !R.mayShow(R.cardPrio(kind), { ...ctx, zone: R.cardZone(kind) });
  ok(held('tip', { busy: true }) && held('geld', { busy: true }) && !held('politie', { busy: true }) && !held('missie', { busy: true }), 'busy: tips and money cards wait, the police and missions do not');
  ok(held('tip', { dialogue: true }) && !held('geld', { dialogue: true }) && held('prestatie', { dialogue: true }), 'a call holds tips and the achievement card (zone E), not money');
}

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
