// #655, behaviour instead of source text: guestsave_test.mjs only checks with a regex that savegame.js mentions the
// backoff. This test runs the real updateSaveGame as a guest whose save keeps failing and counts the attempts.
// Storage is the in-memory one of node3d.mjs: never the real keys. Skips itself without the vendored three.js.
//   node scripts/guestsave_behavior_test.mjs
import './node3d.mjs';
import { registerHooks } from 'node:module';
import { GUEST_RETRY_MS } from '../game/js/guestsave.js';
import { skipAlsThreeOntbreekt } from './lib/threeskip.mjs';

// home.js builds its layout only in the real game; serialize reads home.center (same stand-in as compat_saves_test.mjs)
registerHooks({
  load(url, ctx, next) {
    const r = next(url, ctx);
    if (/\/game\/js\/home\.js$/.test(url)) return { ...r, source: String(r.source) + '\nexport function __zetHome(h) { home = h; }\n', shortCircuit: true };
    return r;
  },
});

let SG, SS, KEYS, WORLD;
try {
  SG = await import('../game/js/savegame.js');
} catch (e) {
  skipAlsThreeOntbreekt('guestsave_behavior_test.mjs', e); // #1298: alleen een ontbrekende three.js buiten CI is een SKIP
}
SS = await import('../game/js/saveslots.js');
KEYS = await import('../game/js/storagekeys.js');
WORLD = await import('../game/js/world.js');
(await import('../game/js/home.js')).__zetHome({ center: { x: 1e6, y: 1e6 } });

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// the guest world: every save attempt asks the reward book for its ids, so that call counts the attempts
let attempts = 0;
const w = {
  stats: { ...WORLD.STAT_DEFAULTS },
  player: { x: 0, y: 0, angle: 0, character: 'tammo', inVehicle: null },
  companion: null, vehicles: [], messages: [],
  addMessage(t) { this.messages.push({ text: t }); },
  map: { nearestRoadPoint: () => null, findOpenSpawn: (x, y) => ({ x, y }), escapeBuilding: (x, y) => [x, y], meta: {} },
  money: 100, ammo: {}, weapon: 'fists', health: 100, armor: 0,
  coopRole: 'client', coopVerdiend: 250, paused: true,
  coopBoek: { ids() { attempts++; return []; } },
};

// no readable slot: every attempt fails
localStorage.clear();
SS.resetReadCache();
// node3d.mjs has no body; updateSaveGame only asks whether the game has started
const classes = new Set(['game-started']);
document.body = { classList: { contains: (c) => classes.has(c), add: (c) => classes.add(c), remove: (c) => classes.delete(c) } };

const realNow = Date.now;
let clock = 1_000_000;
Date.now = () => clock;
try {
  // 60 frames in one second right after the first failure
  for (let f = 0; f < 60; f++) { SG.updateSaveGame(1 / 60, w); clock += 1000 / 60; }
  ok(attempts === 1, 'een mislukte gast-save: 1 poging in 60 beelden, niet elke frame', attempts);
  ok(w.coopVerdiend === 250, 'het verdiende bedrag blijft staan tot het bewaard is', w.coopVerdiend);
  ok(w.messages.filter((m) => /nog niet bewaard/.test(m.text)).length === 1, 'de speler hoort het één keer', w.messages.length);
  // after the backoff exactly one more attempt
  clock = 1_000_000 + GUEST_RETRY_MS + 1;
  for (let f = 0; f < 30; f++) { SG.updateSaveGame(1 / 60, w); clock += 1000 / 60; }
  ok(attempts === 2, 'na de backoff precies één nieuwe poging', attempts);
  // a slot that is readable again: the next due attempt stores the money and the retrying stops
  // (the guest's own save, written by the real saveGame while he still played alone)
  SS.setActive(null, 1); SG.bindSlot();
  w.coopRole = undefined;
  ok(SG.saveGame(w, { toast: false }) === true && !!localStorage.getItem(KEYS.slotKey(1)), 'de eigen save van de gast staat er');
  w.coopRole = 'client';
  SS.resetReadCache();
  clock += GUEST_RETRY_MS + 1;
  SG.updateSaveGame(1 / 60, w);
  ok(w.coopVerdiend === 0, 'zodra de slot weer leesbaar is, is het verdiende bedrag bewaard', w.coopVerdiend);
  const before = attempts;
  for (let f = 0; f < 30; f++) { SG.updateSaveGame(1 / 60, w); clock += 1000 / 60; }
  ok(attempts === before, 'niets meer te bewaren: geen pogingen meer', attempts - before);
  // new earnings right after a success are stored at once (success resets the backoff)
  w.coopVerdiend = 40;
  SG.updateSaveGame(1 / 60, w);
  ok(w.coopVerdiend === 0 && attempts > before, 'een nieuwe verdienste na een geslaagde opslag gaat meteen mee', `${w.coopVerdiend}/${attempts - before}`);
} finally {
  Date.now = realNow;
}

console.log(`${n - fails}/${n} guestsave_behavior`);
process.exit(fails ? 1 : 0);
