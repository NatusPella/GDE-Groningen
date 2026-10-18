// Validity of queued story messages (#171):  node scripts/validity_test.mjs
// - validity.js: until/ttl, step, whileMission, within; an item without `valid` never expires
// - a synthetic queue with expiring messages: stale ones are logged, fresh ones are delivered, in order
// - the phone feed, the story contacts and story.js really use it
import fs from 'node:fs';
import { setValidityContext, withValidity, isStale, validityContext } from '../game/js/validity.js';

let n = 0, fails = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };

let ctx = { time: 100, stepIndex: 3, mission: { phase: 'idle', index: 0 }, player: { x: 0, y: 0 } };
setValidityContext(() => ctx);
ok(validityContext().time === 100, 'the context is served');

// compatible default: no `valid` = never stale (all existing messages)
ok(!isStale({ text: 'x' }, { time: 1e9, stepIndex: 99 }), 'an item without valid never expires');
ok(!isStale(null), 'null is not stale');
ok(withValidity({ text: 'x' }, {}).valid === undefined, 'an empty spec adds no valid');

// time
const a = withValidity({ text: 'a' }, { ttl: 60 });
ok(a.valid.until === 160, 'ttl is resolved against the clock now');
ok(!isStale(a, { time: 160 }) && isStale(a, { time: 160.1 }), 'stale only after the deadline');
// step
const b = withValidity({ text: 'b' }, { step: true });
ok(b.valid.step === 3, 'step:true stamps the current step');
ok(!isStale(b, { stepIndex: 3 }) && isStale(b, { stepIndex: 4 }), 'stale once the story moved past the step');
ok(!isStale(withValidity({}, { step: 7 }), { stepIndex: 7 }), 'an explicit step number works');
// mission
const c = withValidity({ text: 'c' }, { whileMission: true });
ok(isStale(c, { mission: { phase: 'idle' } }) && isStale(c, {}), 'whileMission: stale when no mission is active');
ok(!isStale(c, { mission: { phase: 'active', index: 5 } }), 'whileMission: valid in any active mission');
const d = withValidity({ text: 'd' }, { whileMission: 4 });
ok(isStale(d, { mission: { phase: 'active', index: 5 } }) && !isStale(d, { mission: { phase: 'active', index: 4 } }), 'whileMission: n only in mission n');
// distance
const e = withValidity({ text: 'e' }, { within: { x: 100, y: 0, r: 50 } });
ok(isStale(e, { player: { x: 0, y: 0 } }) && !isStale(e, { player: { x: 80, y: 0 } }), 'within: stale when the player is far from the spot');
ok(!isStale(e, {}), 'within: no player known = not stale');

// a synthetic queue like the phone feed's: fresh and stale messages while the clock and the story run
const log = [], shown = [];
const queue = [
  withValidity({ text: 'oud', story: true }, { ttl: 30, step: true }),
  withValidity({ text: 'nieuw', story: true }, { ttl: 300, step: true }),
  { text: 'zonder geldigheid' },
  withValidity({ text: 'tijdens missie' }, { whileMission: true }),
];
ctx = { ...ctx, time: 140 }; // 40 s later: the first one ran out
const drain = () => { for (let i = queue.length - 1; i >= 0; i--) if (isStale(queue[i])) log.unshift(queue.splice(i, 1)[0].text); shown.push(...queue.splice(0)); };
drain();
ok(log.join() === 'oud,tijdens missie', `stale ones are logged, not shown (${log})`);
ok(shown.map((q) => q.text).join() === 'nieuw,zonder geldigheid', 'fresh ones are delivered in order');

// the wiring
const src = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
ok(/isStale\(notes\[i\]\)/.test(src('phonefeed.js')) && /remember\(w/.test(src('phonefeed.js')), 'phonefeed.js drops stale texts into the history');
ok(/isStale\(queue\[0\]\)/.test(src('storycontact.js')) && /logHistory\(queue\.shift\(\)\)/.test(src('storycontact.js')), 'storycontact.js drops stale contacts into the history');
ok(/setValidityContext\(validityNow\)/.test(src('story.js')) && /withValidity\(\{ from, text/.test(src('story.js')), 'story.js sets the context and stamps its texts');
console.log(`${n - fails}/${n} validity checks passed`);
process.exit(fails ? 1 : 0);
