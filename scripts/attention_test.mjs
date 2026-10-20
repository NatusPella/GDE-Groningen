// Logic test for the attention budget (game/js/attention.js) on a fake clock:
//   node scripts/attention_test.mjs
import * as A from '../game/js/attention.js';

let t = 1000;
A.setAttentionClock(() => t);
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name, JSON.stringify(A.attentionState())); } };
const idle = { player: { inVehicle: null } };

ok(A.mayInterrupt('wijk', idle), 'a flyover may play when nothing happened');
A.noteMoment('wijk');
t += 30;
ok(!A.mayInterrupt('landmark', idle), 'no landmark scene 30 s after a flyover (global gap)');
t += 60;
ok(!A.mayInterrupt('landmark', idle), 'discovery scenes share a 3.5 min cooldown');
ok(A.mayInterrupt('crash', idle), 'a crash replay is not a discovery scene');
A.noteMoment('crash');
t += 45;
ok(A.mayInterrupt('wanted5', idle) === true, 'five stars after the global gap');
t += 200;
ok(A.mayInterrupt('wijk', idle), 'flyovers again after the cooldown');
ok(!A.mayInterrupt('wijk', { player: { inVehicle: { speed: 20 } } }), 'no flyover when driving fast');
ok(A.mayInterrupt('crash', { player: { inVehicle: { speed: 20 } } }), 'crash replays do happen at speed');
ok(!A.mayInterrupt('wijk', { player: {}, mission: { phase: 'active' } }), 'never during a mission');
ok(!A.mayInterrupt('crash', { player: {}, sideJob: { active: true } }), 'never during a bijbaan');
ok(A.mayInterrupt('story-anything', idle), 'unknown kinds (story) are exempt');
ok(A.CARD_PRIORITY.missie > A.CARD_PRIORITY.politie && A.CARD_PRIORITY.politie > A.CARD_PRIORITY.geld && A.CARD_PRIORITY.geld > A.CARD_PRIORITY.tip, 'card priority order');
ok(A.mayShowTip(), 'first tip');
A.noteTip();
t += 5;
ok(!A.mayShowTip(), 'tips are rationed');
t += 20;
ok(A.mayShowTip(), 'next tip after the gap');

// phone messages read aloud
ok(A.mayVoiceText('story'), 'a character\'s text is always read aloud');
A.noteVoiceText('story');
ok(A.mayVoiceText('story'), 'story texts have no gap');
ok(A.mayVoiceText('news'), 'first Kiekdoar news is read aloud');
A.noteVoiceText('news');
t += 20;
ok(!A.mayVoiceText('news'), 'the next Kiekdoar news within 45 s only pings');
ok(A.mayVoiceText('system'), 'the app voice has its own gap');
t += 30;
ok(A.mayVoiceText('news'), 'Kiekdoar news is read aloud again after the gap');

// channel cases (#104): the cinematic moments, the tip ration and the read-aloud texts are surfaces of
// hudbus.js; asking the surface gives the same answer as asking attention.js
const B = await import('../game/js/hudbus.js');
const momentKinds = B.SURFACES.moment.gates.map(([, k]) => k);
ok(momentKinds.length === Object.keys(B.MOMENTS).length && momentKinds.every((k) => k in B.MOMENTS), 'the moment surface lists every moment');
const asSurface = (kind, w) => B.mayShowSurface('moment', {
  moment: { now: t, busy: false, callOn: false, narrativeBusy: false, speed: w.player.inVehicle ? w.player.inVehicle.speed : 0, last: A.attentionState() },
}, kind);
A.resetAttention(); t += 1000;
const fast = { player: { inVehicle: { speed: 20 } } };
for (const w of [idle, fast]) for (const k of momentKinds) ok(asSurface(k, w) === A.mayInterrupt(k, w), `moment ${k}: surface and attention.js agree (quiet)`);
A.noteMoment('crash'); t += 30;
for (const w of [idle, fast]) for (const k of momentKinds) ok(asSurface(k, w) === A.mayInterrupt(k, w), `moment ${k}: surface and attention.js agree (after a crash)`);
t += 100;
ok(A.mayShowTip() === B.mayShowSurface('kaart', { tip: { now: t, last: A.attentionState().tip } }), 'tip ration: surface and attention.js agree (free)');
A.noteTip(); t += 5;
ok(!A.mayShowTip() && !B.mayShowSurface('kaart', { tip: { now: t, last: A.attentionState().tip } }), 'tip ration: both wait');
A.noteVoiceText('news'); t += 5;
ok(!A.mayVoiceText('news') && !B.mayShowSurface('bericht', { voice: { kind: 'news', now: t, voicedAt: { news: t - 5 } } }), 'read aloud: both wait for the news gap');
ok(A.mayVoiceText('character') && B.mayShowSurface('bericht', { voice: { kind: 'character', now: t, voicedAt: { character: t - 1 } } }), 'read aloud: a character is always read');

console.log(`${n - fails}/${n} attention rules ok`);
process.exit(fails ? 1 : 0);
