// Zacht herstel na een verloren WebGL-context: toestand, tellers, sluier en
// kijkafstandsramp (game/js/gpuherstel.js) en de proces-regels van de desktopschil.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

const G = await import('../game/js/gpuherstel.js');
const require = createRequire(import.meta.url);
const E = require('../desktop/gpuevents.cjs');

// beginstand
const s = G.createGpuState();
assert.equal(s.phase, 'ok');
assert.equal(G.rampAt(s, 0), 1);
assert.equal(G.veilAt(s, 0), 0);

// verlies: teller, reden, sluier dicht, ramp op de beginwaarde
G.noteLost(s, 1000, 'GPU reset');
assert.equal(s.lost, 1);
assert.equal(s.phase, 'lost');
assert.equal(s.lastReason, 'GPU reset');
assert.equal(G.veilAt(s, 1500), 1);
assert.equal(G.rampAt(s, 1500), G.RAMP_START);
assert.match(G.veilText(s, 1500), /even weg/);
assert.match(G.veilText(s, 1000 + G.STUCK_MS + 1), /sluit het spel/);

// een tweede verlies zonder reden krijgt een nette tekst
G.noteLost(s, 1200, '');
assert.equal(s.lost, 2);
assert.match(s.lastReason, /onbekend/);

// herstel: teller, herbouwtijd, sluier houdt vast en vervaagt, ramp groeit monotoon naar 1
G.noteRestored(s, 2000);
assert.equal(s.restored, 1);
assert.equal(s.phase, 'recovering');
assert.equal(s.lastRebuildAt, 2000);
assert.equal(G.veilAt(s, 2000 + G.HOLD_MS), 1);
assert.ok(G.veilAt(s, 2000 + G.HOLD_MS + G.FADE_OUT_MS / 2) > 0 && G.veilAt(s, 2000 + G.HOLD_MS + G.FADE_OUT_MS / 2) < 1);
assert.equal(G.veilAt(s, 2000 + G.HOLD_MS + G.FADE_OUT_MS), 0);
let prev = 0;
for (let t = 0; t <= G.RECOVER_MS; t += 250) {
  const r = G.rampAt(s, 2000 + t);
  assert.ok(r >= prev - 1e-9 && r >= G.RAMP_START - 1e-9 && r <= 1 + 1e-9, `ramp ${r}`);
  prev = r;
}
assert.equal(G.rampAt(s, 2000 + G.RECOVER_MS), 1);
assert.match(G.veilText(s, 2100), /hersteld/);

// een dubbel herstelbericht telt niet
G.noteRestored(s, 2100);
assert.equal(s.restored, 1);
assert.equal(s.lastRebuildAt, 2000);

// na de ramp is de stand weer normaal
assert.equal(G.stepPhase(s, 2000 + G.RECOVER_MS - 1), 'recovering');
assert.equal(G.stepPhase(s, 2000 + G.RECOVER_MS), 'ok');
assert.equal(G.veilAt(s, 2000 + G.RECOVER_MS + 5), 0);

// tweede verlies na herstel telt door; een nieuw verlies midden in het herstel ook
G.noteLost(s, 20000, 'nogmaals');
G.noteRestored(s, 20500);
G.noteLost(s, 21000, 'tijdens herstel');
assert.equal(s.lost, 4);
assert.equal(s.phase, 'lost');
assert.equal(G.rampAt(s, 21000), G.RAMP_START);

// bewuste kwaliteitswissel: korte sluier zonder fase te veranderen
const q = G.createGpuState();
G.noteVeil(q, 100, 700, 'Beeld wordt aangepast.');
assert.equal(G.veilAt(q, 500), 1);
assert.equal(G.veilAt(q, 801), 0);
assert.equal(q.phase, 'ok');
assert.equal(G.rampAt(q, 500), 1);

// technische info: Nederlands, met tellers, tijd sinds herbouw en reden
const lines = G.describeGpu(s, 25000);
assert.match(lines[0], /verloren: 4x, hersteld: 2x/);
assert.match(lines[1], /5 s geleden/);
assert.match(lines[2], /tijdens herstel/);
assert.equal(G.describeGpu(G.createGpuState(), 0)[1], 'Laatste herbouw van de wereld: nog niet');
G.noteExternal(s, 'GPU-proces weggevallen (crashed)');
assert.match(G.describeGpu(s, 25000)[4], /: 1, laatste: GPU-proces/);
assert.equal(G.sinceText(200000), '3 min geleden');

// desktopschil: welke meldingen tellen, en de herlaadgrens
assert.equal(E.describeGone('child', { type: 'GPU', reason: 'crashed', exitCode: 3 }), 'GPU-proces weggevallen (crashed, code 3)');
assert.equal(E.describeGone('child', { type: 'Utility', reason: 'crashed' }), null);
assert.equal(E.describeGone('child', { type: 'GPU', reason: 'clean-exit' }), null);
assert.match(E.describeGone('render', { reason: 'oom' }), /^Renderproces weggevallen \(oom\)/);
let h = [];
let r1 = E.reloadAllowed(h, 1000); assert.ok(r1.ok); h = [1000];
let r2 = E.reloadAllowed(h, 2000); assert.ok(r2.ok); h = [1000, 2000];
assert.ok(!E.reloadAllowed(h, 3000).ok);
assert.ok(E.reloadAllowed(h, 62000).ok);

console.log('gpuherstel_test: ok');
