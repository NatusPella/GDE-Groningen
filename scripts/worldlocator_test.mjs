// #1183: de wereldzoeker van test_all en de releasegate, en de uitslag van de gate-fase world.
import assert from 'node:assert/strict';
import path from 'node:path';
import { worldCandidates, findWorld, isWorldSkip, worldPhaseVerdict } from './lib/worldlocator.mjs';

const root = path.resolve('/repo');
const idx = (d) => path.join(d, 'index-provincie.json');
const alleen = (...mappen) => (f) => mappen.some((d) => f === idx(d));
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

// zoeker: game/world eerst, daarna de gestagede wereld (het geval uit de gate-run van 22-11)
const gw = path.join(root, 'game', 'world'), gebouwd = path.join(root, 'desktop', 'build', 'game', 'world');
ok(findWorld(root, {}, alleen(gw, gebouwd)) === gw, 'game/world gaat voor');
ok(findWorld(root, {}, alleen(gebouwd)) === gebouwd, 'desktop/build/game/world wordt gevonden');
ok(findWorld(root, {}, alleen()) === '', 'geen wereld: lege string');
ok(findWorld(root, { GDE_GAME_DIR: '/x/game' }, alleen(gw, path.join('/x/game', 'world'))) === path.join('/x/game', 'world'), 'GDE_GAME_DIR gaat voor');
ok(findWorld(root, { GAME_WORLD: '/w' }, alleen('/w')) === '/w', 'GAME_WORLD telt mee');
ok(worldCandidates(root, {}).length === 2, 'zonder omgeving twee kandidaten');

// welke SKIP telt als 'wereld ontbrak'
ok(isWorldSkip({ status: 'SKIP', detail: 'niet gedraaid: game/world ontbreekt (cd desktop && npm run stage)' }), 'reden van test_all');
ok(isWorldSkip({ status: 'SKIP', detail: 'niet gedraaid: SKIP passage_open_audit: geen wereld (GAME_WORLD of game/world)' }), 'SKIP-regel van het script');
ok(!isWorldSkip({ status: 'SKIP', detail: 'niet gedraaid: data/cache ontbreekt' }), 'andere SKIP telt niet');
ok(!isWorldSkip({ status: 'PASS', detail: 'game/world' }), 'PASS telt niet');

// gate-uitslag
const items = [{ status: 'PASS' }, ...Array.from({ length: 35 }, () => ({ status: 'SKIP', detail: 'niet gedraaid: game/world ontbreekt' }))];
const u = worldPhaseVerdict(0, items, true);
ok(u.status === 'SKIP' && u.code === 3 && u.gemist === 35, 'wereld bestaat maar 35 items overgeslagen: onvolledig (was PASS)');
ok(worldPhaseVerdict(0, items, false).status === 'PASS', 'zonder wereld blijft het oude gedrag (de fase hoort dan niet bij de gate)');
ok(worldPhaseVerdict(0, [{ status: 'PASS' }], true).status === 'PASS', 'alles gedraaid: PASS');
ok(worldPhaseVerdict(1, items, true).status === 'FAIL', 'rood blijft rood');
ok(worldPhaseVerdict(3, [], true).code === 3, 'niets gemeten blijft onvolledig');

console.log(`worldlocator_test: ${n} ok`);
