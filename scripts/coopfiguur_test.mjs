// Samen spelen (#366): de figuur van elke extra speler (plek 2 en hoger, tot MAX_PLAYERS = 16) loopt met dezelfde botsingen als de metgezel
// (companion.js moveFigure: gebouwen, water, ring-wanden en -hoogte) en de gastheer zet hem bij de groep
// als hij te ver wegdwaalt of vastzit (coopnet.js bandFiguren), op een droge plek en met een melding.
//   node scripts/coopfiguur_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const { moveFigure, figuurVrij } = await import('../game/js/companion.js');
const { bandFiguren, stepFigures, figGebruik, FIGUUR_BAND, FIGUUR_TERUG_S } = await import('../game/js/coopnet.js');
const { maakRegister, zetPlek, bouwFoci } = await import('../game/js/coopfoci.js');
const { isInWater } = await import('../game/js/util.js');

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok  ' + naam); };

// Een nep-kaart: een huis op (10..20, -5..5) en een gracht op x 30..40 (breed genoeg om er niet naast te lopen).
const huis = { bounds: [10, -5, 20, 5], pts: [[10, -5], [20, -5], [20, 5], [10, 5], [10, -5]] };
const gracht = { bounds: [30, -1000, 40, 1000], pts: [[30, -1000], [40, -1000], [40, 1000], [30, 1000], [30, -1000]] };
const ring = { has: true, wallGrid: { at: (x, y) => (Math.abs(y - 50) < 20 ? [{ ax: 0, ay: 50, bx: 100, by: 50, nx: 0, ny: 1, parapet: true, z: 0, brk: null }] : null) } };
const mkMap = (elev = { has: false }) => ({
  buildingsNear: (x, y, r) => [huis].filter((b) => x > b.bounds[0] - r && x < b.bounds[2] + r && y > b.bounds[1] - r && y < b.bounds[3] + r),
  roads: [], roadsNear: () => [], waterNear: () => [gracht], coveredAt: () => false, isOnBridge: () => false,
  elev, groundHeightAt: (x, y, hint = 0) => (elev.has ? (x > 60 ? 4 : hint || 0) : 0),
});
const mkFig = (x, y, vx, vy) => ({ slot: 2, x, y, vx, vy, angle: 0, radius: 0.4 });
const loop = (w, f, secs, dt = 1 / 30) => { for (let i = 0; i < secs / dt; i++) moveFigure(f, dt, w); };

t('een figuur loopt niet door een gebouw', () => {
  const w = { map: mkMap(), pedestrians: [] }, f = mkFig(0, 0, 6, 0);
  loop(w, f, 5);
  assert.ok(f.x < 10, 'voor de muur van het huis: ' + f.x);
});

t('een figuur loopt het water niet in', () => {
  const w = { map: mkMap(), pedestrians: [] }, f = mkFig(22, 8, 6, 0);
  loop(w, f, 5);
  assert.ok(f.x < 30, 'op de kant van de gracht: ' + f.x);
  assert.ok(figuurVrij(f.x, f.y, w), 'hij staat op droog land');
});

t('een vertraagd beeld (grote tijdstap) geeft geen sprong door een muur', () => {
  const w = { map: mkMap(), pedestrians: [] }, f = mkFig(7, 0, 10, 0);
  moveFigure(f, 0.5, w);
  assert.ok(f.x < 10, 'één grote tijdstap: ' + f.x);
});

t('een lange frame tunnelt niet door het huis of de gracht', () => {
  const w = { map: mkMap(), pedestrians: [] };
  const a = mkFig(4, 0, 40, 0); moveFigure(a, 1, w); // 40 m in één frame: de sub-stappen volgen de afstand, niet star 8
  assert.ok(a.x < 10, 'niet door het huis: ' + a.x);
  const b = mkFig(24, 8, 40, 0); moveFigure(b, 1, w);
  assert.ok(b.x < 30 && figuurVrij(b.x, b.y, w), 'niet in de gracht: ' + b.x);
});

t('een figuur die in de gracht staat gaat terug naar de laatste droge plek', () => {
  const w = { map: mkMap(), pedestrians: [] }, f = mkFig(24, 8, 0, 0);
  moveFigure(f, 1 / 30, w); // op het droge: die plek wordt onthouden
  assert.ok(figuurVrij(f.x, f.y, w), 'droog begonnen');
  f.x = 35; f.y = 0; f.vx = 5; f.vy = 0; // een sprong van de gastheer zet hem in het water
  moveFigure(f, 1 / 30, w);
  assert.ok(!isInWater(w.map, f.x, f.y) && figuurVrij(f.x, f.y, w), `weer op het droge: ${f.x},${f.y}`);
  assert.deepEqual([f.x, f.y], [24, 8], 'precies de laatste droge plek');
  assert.equal(f.vx, 0, 'hij loopt niet verder het water in');
});

t('zonder droge plek in de buurt blijft hij staan (de band zet hem bij de groep)', () => {
  const w = { map: mkMap(), pedestrians: [] }, f = mkFig(35, 0, 5, 0); // in de gracht, geen droge plek onthouden
  moveFigure(f, 1 / 30, w);
  assert.deepEqual([f.x, f.y], [35, 0]);
  assert.equal(f.vx, 0);
});

t('figuurVrij: water en gebouw niet, open grond wel', () => {
  const w = { map: mkMap() };
  assert.equal(figuurVrij(35, 0, w), false); assert.equal(figuurVrij(15, 0, w), false); assert.equal(figuurVrij(0, 0, w), true);
});

t('op de ring blijft de figuur aan zijn kant van een wand en volgt hij de hoogte', () => {
  const w = { map: mkMap(ring), pedestrians: [] }, f = mkFig(10, 60, 0, -6); f.gz = 0;
  loop(w, f, 3);
  assert.ok(f.y >= 50 + 0.39, 'niet door de wand: ' + f.y);
  const g = mkFig(65, 0, 0, 0); g.gz = 0; moveFigure(g, 0.1, w);
  assert.equal(g.gz, 4, 'hoogte uit de kaart (groundHeightAt)');
});

const mkHost = (map, figs, extra = {}) => ({
  map, player: { x: 0, y: 0, gz: 0 }, messages: [], coopFigures: figs, coopMove: moveFigure,
  coopMeld(slot, tekst) { this.messages.push([slot, tekst]); }, coopVrij: figuurVrij, ...extra,
});
const stap = (w, secs, dt = 0.1) => { for (let i = 0; i < secs / dt; i++) bandFiguren(w, dt); };

t('te ver weg: eerst een waarschuwing, daarna terug bij de groep', () => {
  const f = { slot: 2, x: FIGUUR_BAND + 30, y: 0, vx: 0, vy: 0 };
  const w = mkHost(mkMap(), { 2: f });
  stap(w, 1);
  assert.match(w.messages.map((m) => m[1]).join(' '), /Blijf bij de groep/);
  stap(w, FIGUUR_TERUG_S + 1);
  assert.ok(Math.hypot(f.x, f.y) < 3, 'bij de groep: ' + f.x);
  assert.match(w.messages.map((m) => m[1]).join(' '), /weer bij de groep/);
});

t('de terugzetplek is droog: de gastheer staat aan de gracht', () => {
  const f = { slot: 2, x: 500, y: 0, vx: 0, vy: 0 };
  const w = mkHost(mkMap(), { 2: f }); w.player.x = 29; w.player.y = 0;
  for (const slot of [2, 3, 4, 5, 8, 15]) {
    f.slot = slot; f.x = 500; f.verTijd = 0; stap(w, FIGUUR_TERUG_S + 1);
    assert.ok(figuurVrij(f.x, f.y, w), `slot ${slot} op droog land: ${f.x},${f.y}`);
    assert.ok(Math.hypot(f.x - 29, f.y) < 3);
  }
});

t('een figuur die in het water of een muur vastzit wordt na een paar seconden bij de groep gezet', () => {
  const f = { slot: 3, x: 35, y: 0, vx: 0, vy: 0 };
  const w = mkHost(mkMap(), { 3: f }); w.player.x = 0; w.player.y = 20;
  stap(w, FIGUUR_TERUG_S - 1); assert.equal(f.x, 35, 'nog niet meteen');
  stap(w, 2);
  assert.ok(figuurVrij(f.x, f.y, w) && Math.hypot(f.x, f.y - 20) < 3, `bij de groep: ${f.x},${f.y}`);
});

t('uitstappen naast de gracht zet de figuur op het droge', () => {
  const v = { x: 28, y: 0, angle: Math.PI / 2, speed: 0, halfWid: 1, halfLen: 2, isBoat: false };
  const f = { slot: 2, x: v.x, y: v.y, vx: 0, vy: 0, inVeh: v, radius: 0.4 };
  const w = mkHost(mkMap(), { 2: f });
  assert.equal(figGebruik(w, 2), true, 'hij stapt uit');
  assert.ok(!f.inVeh, 'uit het voertuig');
  assert.ok(figuurVrij(f.x, f.y, w), `droog: ${f.x},${f.y}`);
  assert.ok(!isInWater(w.map, f.x, f.y), 'niet in de gracht');
});

t('de 110 m-band geldt binnen de groep van de gastheer; met een eigen focus loopt de figuur vrij', () => {
  // binnen de samenvoegafstand (150 m) van de gastheer: de wereld is daar geladen, dus de band van 110 m geldt
  const f = { slot: 2, x: 130, y: 0, vx: 0, vy: 0 }, w = mkHost(mkMap(), { 2: f });
  const reg = maakRegister(); zetPlek(reg, 2, 130, 0);
  w.coopFociInfo = bouwFoci({ x: 0, y: 0 }, reg);
  assert.equal(w.coopFociInfo.foci.length, 1, 'nog een groep met de gastheer');
  stap(w, 1);
  assert.match(w.messages.map((m) => m[1]).join(' '), /Blijf bij de groep/);
  stap(w, FIGUUR_TERUG_S + 1);
  assert.ok(Math.hypot(f.x, f.y) < 3, 'terug bij de groep: ' + f.x);
  // ver weg heeft hij een eigen focus (#429): de wereld laadt daar, dus geen band en geen terugzetten
  const g = { slot: 3, x: 400, y: 0, vx: 0, vy: 0 }, w2 = mkHost(mkMap(), { 3: g });
  const reg2 = maakRegister(); zetPlek(reg2, 3, 400, 0);
  w2.coopFociInfo = bouwFoci({ x: 0, y: 0 }, reg2);
  assert.equal(w2.coopFociInfo.foci.length, 2, 'een eigen groep');
  stap(w2, FIGUUR_TERUG_S + 5);
  assert.deepEqual([g.x, g.y], [400, 0], 'niet teruggezet');
  assert.match(w2.messages.map((m) => m[1]).join(' '), /Druk op B/, 'wel de melding hoe hij terugkomt');
});

t('stepFigures stuurt de figuur met de echte moveFigure: hij stuit op het huis', () => {
  const f = { slot: 2, x: 0, y: 0, vx: 0, vy: 0, angle: 0, radius: 0.4 };
  const w = mkHost(mkMap(), { 2: f }); w.pedestrians = [];
  f.input = { mx: 0, my: -1, yaw: 0, buttons: 0 }; // camera 0: mijn -1 is wereld +x
  for (let i = 0; i < 30 * 8; i++) stepFigures(w, 1 / 30);
  assert.ok(f.x > 4, 'hij liep echt: ' + f.x);
  assert.ok(f.x < 10 && figuurVrij(f.x, f.y, w), `tegen de muur, niet erin: ${f.x},${f.y}`);
});

t('met 16 spelers (14 figuren): niemand loopt door het huis of het water, wie te ver weg is komt terug, en het kost weinig per beeld', () => {
  const figs = {};
  for (let slot = 2; slot < 16; slot++) figs[slot] = { slot, x: 0, y: -40 + slot * 5, vx: 0, vy: 0, radius: 0.4 };
  const w = mkHost(mkMap(), figs); w.pedestrians = [];
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 30 * 40; i++) { for (const f of Object.values(figs)) { f.vx = f.slot % 2 ? 7 : -7; moveFigure(f, 1 / 30, w); } bandFiguren(w, 1 / 30); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / (30 * 40);
  for (const f of Object.values(figs)) {
    assert.ok(figuurVrij(f.x, f.y, w), `slot ${f.slot} op droog land, buiten het huis: ${f.x},${f.y}`);
    assert.ok(Math.hypot(f.x, f.y) < FIGUUR_BAND + 10, `slot ${f.slot} bleef bij de groep: ${f.x},${f.y}`);
  }
  assert.ok(ms < 5, `14 figuren: ${ms.toFixed(2)} ms per beeld`);
  console.log(`    14 figuren: ${ms.toFixed(3)} ms per beeld`);
});

t('een figuur die netjes rondloopt wordt met rust gelaten', () => {
  const f = { slot: 2, x: 5, y: 8, vx: 0, vy: 0 };
  const w = mkHost(mkMap(), { 2: f });
  stap(w, 20); assert.deepEqual([f.x, f.y], [5, 8]); assert.deepEqual(w.messages, []);
});

t('wie tegen een muur of de waterkant staat zit niet vast en wordt niet teruggezet', () => {
  const f = { slot: 2, x: 10 - 0.35, y: 0, vx: 0, vy: 0 }, g = { slot: 3, x: 30 - 0.35, y: 8, vx: 0, vy: 0 };
  const w = mkHost(mkMap(), { 2: f, 3: g });
  stap(w, 20); assert.deepEqual([f.x, f.y, g.x, g.y], [10 - 0.35, 0, 30 - 0.35, 8]); assert.deepEqual(w.messages, []);
});

console.log(`${n} tests groen`);
