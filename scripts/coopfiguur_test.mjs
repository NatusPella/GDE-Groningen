// Samen spelen (#366): de figuur van elke extra speler (plek 2 en hoger, tot MAX_PLAYERS = 16) loopt met dezelfde botsingen als de metgezel
// (companion.js moveFigure: gebouwen, water, ring-wanden en -hoogte) en de gastheer zet hem bij de groep
// als hij te ver wegdwaalt of vastzit (coopnet.js bandFiguren), op een droge plek en met een melding.
//   node scripts/coopfiguur_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';

const { moveFigure, figuurVrij } = await import('../game/js/companion.js');
const { bandFiguren, FIGUUR_BAND, FIGUUR_TERUG_S } = await import('../game/js/coopnet.js');

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
  map, player: { x: 0, y: 0, gz: 0 }, messages: [], coopFigures: figs,
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
