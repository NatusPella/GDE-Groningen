// Travel beats hooked into the story (game/js/storytravel.js, #97):  node scripts/storytravel_test.mjs
import fs from 'node:fs';
import * as S from '../game/js/storytravel.js';
const script = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
const lookup = (id) => script.scenes.find((s) => s.id === id) || null;
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };
const tick = () => new Promise((r) => setTimeout(r, 0));

const beat = { x: 1 };
ok(S.decideTravel({ on: true, beat, handled: false, busy: false, dist: 20000 }) === 'vraag', 'far: ask');
ok(S.decideTravel({ on: true, beat, handled: false, busy: false, dist: 3000 }) === 'sla-over', 'near: skip the beat');
ok(S.decideTravel({ on: false, beat, handled: false, busy: false, dist: 20000 }) === null, 'flag off: nothing');
ok(S.decideTravel({ on: true, beat, handled: true, busy: false, dist: 20000 }) === null, 'handled: nothing');
ok(S.decideTravel({ on: true, beat, handled: false, busy: true, dist: 20000 }) === null, 'busy: wait');
ok(S.decideTravel({ on: true, beat: null, handled: false, busy: false, dist: 20000 }) === null, 'no beat');

const mkWorld = (x) => {
  const msgs = [];
  return { time: 0, clock: 10, money: 100, player: { x, y: 0 }, companion: { x, y: 0, state: 'ok' }, storyGuide: { x: 17000, y: 0 }, addMessage: (t) => msgs.push(t), msgs };
};
const step = { id: 'T1' };

// skip: player and companion are put at the goal, clock moves, lines show, flag set
{
  const w = mkWorld(0), flags = new Set();
  S.tickStoryTravel({ on: true, step, flags, world: w, busy: false, script: lookup, ask: async () => 'overslaan' });
  await tick(); await tick();
  ok(w.player.x === 17000 && w.companion.x > 16999, 'skip teleports both');
  ok(w.clock > 10.2, 'clock moved', w.clock);
  ok(flags.has('reis:T1'), 'flag set');
  ok(w.msgs.some((m) => m.startsWith('Tessa: ')) && w.msgs.some((m) => m === 'Aangekomen in Warffum'), 'lines and arrival', JSON.stringify(w.msgs));
  // asked once only
  let asked = 0;
  S.tickStoryTravel({ on: true, step, flags, world: w, busy: false, script: lookup, ask: async () => { asked++; return 'zelf'; } });
  ok(asked === 0, 'not asked twice');
}
// zelf: nobody moves, the reward comes on arrival only
{
  const w = mkWorld(0), flags = new Set();
  const step2 = { id: 'T2' };
  w.storyGuide = { x: 30000, y: 0 };
  S.tickStoryTravel({ on: true, step: step2, flags, world: w, busy: false, script: lookup, ask: async () => 'zelf' });
  await tick(); await tick();
  ok(w.player.x === 0 && w.clock === 10 && w.money === 100, 'zelf: no change yet');
  w.player.x = 29950;
  S.tickStoryTravel({ on: true, step: step2, flags, world: w, busy: false, script: lookup, ask: async () => 'zelf' });
  ok(w.money === 100 + 120, 'zelf: paid on arrival', w.money);
  S.tickStoryTravel({ on: true, step: step2, flags, world: w, busy: false, script: lookup, ask: async () => 'zelf' });
  ok(w.money === 220, 'paid once');
}
// near the start: handled without asking
{
  const w = mkWorld(16000), flags = new Set();
  let asked = 0;
  S.tickStoryTravel({ on: true, step, flags, world: w, busy: false, script: lookup, ask: async () => { asked++; return 'zelf'; } });
  ok(asked === 0 && flags.has('reis:T1'), 'near: marked, not asked');
}
// a step without a beat and an end step do nothing
{
  const w = mkWorld(0), flags = new Set();
  S.tickStoryTravel({ on: true, step: { id: 'M01' }, flags, world: w, busy: false, script: lookup, ask: async () => 'overslaan' });
  S.tickStoryTravel({ on: true, step: { id: 'T1', end: 'x' }, flags, world: w, busy: false, script: lookup, ask: async () => 'overslaan' });
  await tick();
  ok(w.player.x === 0 && flags.size === 0, 'no beat / end step: nothing');
}
// the ride that story.js passes is startMeerijden(world, option, dest): rideWith binds the world, so tickStoryTravel's ride(option, dest) reaches it right
{
  const w = mkWorld(0), flags = new Set();
  let got = null;
  const fake = async (world, o, d) => { got = { world, o, d }; world.player.x = d.x; return { aangekomen: true }; };
  S.tickStoryTravel({ on: true, step, flags, world: w, busy: false, script: lookup, ask: async () => 'meerijden', ride: S.rideWith(w, fake) });
  await tick(); await tick();
  ok(got && got.world === w && got.o.id === 'trein' && got.d.name === 'Warffum' && w.player.x === 17000, 'rideWith: de wereld gaat mee als eerste argument', JSON.stringify(got && { o: got.o.id, d: got.d }));
}
// meerijden: the ride scene gets the option and the goal; skip/overslaan bring the vehicle along
{
  const w = mkWorld(0), flags = new Set();
  let got = null;
  S.tickStoryTravel({ on: true, step, flags, world: w, busy: false, script: lookup, ask: async () => 'meerijden',
    ride: async (o, d) => { got = { o, d }; w.player.x = d.x; return { aangekomen: true }; } });
  await tick(); await tick();
  ok(got && got.o.id === 'trein' && got.d.x === 17000 && got.d.name === 'Warffum', 'ride scene gets option and goal', JSON.stringify(got));
  ok(got && got.o.etaS > 60 && got.o.stops.length === 2, 'ride option has real eta and stops');
  ok(w.msgs.length === 0, 'scene does the arrival, no double message');
}
{
  const w = mkWorld(0), flags = new Set();
  S.tickStoryTravel({ on: true, step, flags, world: w, busy: false, script: lookup, ask: async () => 'meerijden', ride: async () => ({ aangekomen: false }) });
  await tick(); await tick(); await tick();
  ok(w.player.x === 17000, 'scene refused (no money): arrive directly');
}
{
  const w = mkWorld(0), flags = new Set();
  w.player.inVehicle = { x: 5, y: 5, speed: 9 };
  S.tickStoryTravel({ on: true, step, flags, world: w, busy: false, script: lookup, ask: async () => 'overslaan' });
  await tick(); await tick();
  ok(w.player.inVehicle.x === 17000 && w.player.inVehicle.speed === 0, 'vehicle comes along');
}
console.log(`${n - fails}/${n} storytravel`);
process.exit(fails ? 1 : 0);
