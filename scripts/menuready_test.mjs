// De 'menu klaar'-poort (#226): node scripts/menuready_test.mjs
import { makeMenuGate, GATE } from '../game/js/menuready.js';
let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL ' + name); } };
const run = (g, frames, extra = () => true) => { let t = 0, ready = -1; frames.forEach(([ms, pending], i) => { t += ms; if (ready < 0 && g.step(t, ms, pending, extra(i))) ready = i; }); return ready; };

// a calm start: ready after minFrames
ok(run(makeMenuGate(), Array(10).fill([16, 0])) === GATE.minFrames - 1, 'calm frames open the gate at the minimum');
// the hang: long frames (a blocked main thread) keep it closed until three quiet frames follow
{
  const g = makeMenuGate();
  const frames = [[16, 0], [16, 0], [400, 0], [350, 0], [16, 0], [16, 0], [16, 0], [16, 0]];
  const r = run(g, frames);
  ok(r === 6, 'closed during the freeze, open after three quiet frames (got ' + r + ')');
  ok(g.report().longestFrameMs === 400 && !g.report().timedOut, 'the report names the longest frame');
}
// tiles still streaming in keep it closed
ok(run(makeMenuGate(), [[16, 5], [16, 5], [16, 5], [16, 5], [16, 2], [16, 0], [16, 0], [16, 0], [16, 0]]) === 5, 'pending tiles keep it closed');
// the extra work (placement) too
ok(run(makeMenuGate(), Array(10).fill([16, 0]), (i) => i >= 6) === 6, 'extra work keeps it closed');
// a time-out opens it, and says so
{
  const g = makeMenuGate({ timeoutMs: 1000 });
  const r = run(g, Array(100).fill([200, 0]));
  ok(r >= 0 && g.report().timedOut, 'a page that never calms down opens by the time-out');
  const h = makeMenuGate(); h.step(0, 16, 0); h.expire(5000);
  ok(h.isReady() && h.report().timedOut, 'expire() opens a gate on a frozen page');
}
ok((() => { const g = makeMenuGate(); for (let i = 0; i < 6; i++) g.step(i * 16, 16, 0); return g.step(999, 9999, 9); })(), 'once open it stays open');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
