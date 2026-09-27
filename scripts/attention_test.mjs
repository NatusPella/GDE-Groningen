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
ok(A.mayVoiceText('news'), 'first Sikkom news is read aloud');
A.noteVoiceText('news');
t += 20;
ok(!A.mayVoiceText('news'), 'the next Sikkom news within 45 s only pings');
ok(A.mayVoiceText('system'), 'the app voice has its own gap');
t += 30;
ok(A.mayVoiceText('news'), 'Sikkom news is read aloud again after the gap');

console.log(`${n - fails}/${n} attention rules ok`);
process.exit(fails ? 1 : 0);
