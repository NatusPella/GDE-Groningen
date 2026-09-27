// Logic test for the speech arbiter (game/js/speech.js) on a fake clock:
//   node scripts/speech_test.mjs
// Exits 1 on the first broken rule.
import * as S from '../game/js/speech.js';

let t = 100;
S.setSpeechClock(() => t);
let fails = 0, n = 0;
const ok = (cond, name) => { n++; if (!cond) { fails++; console.log('FAIL', name, JSON.stringify(S.speechState())); } };
const fresh = () => { S.resetSpeech(); t += 100; };

// one line at a time, same class waits
fresh();
const a = S.begin('react', 2);
ok(a, 'react gets a free channel');
ok(!S.begin('react', 2), 'second react is refused while the first talks');
ok(!S.canSpeak('ambient'), 'bubble refused while a reaction talks');
t += 1; S.end(a);
ok(!S.canSpeak('ambient'), 'bubble waits the ambient gap after a line');
t += 1.1;
ok(S.canSpeak('ambient'), 'bubble may talk after the gap');

// a clip that never reports its end frees the channel on its own
fresh();
S.begin('job', 1.5);
t += 2.1;
ok(S.canSpeak('job'), 'channel frees itself after duration + tail');

// preemption: an important line cuts chatter off, not the other way round
fresh();
let stopped = 0;
S.begin('ambient', 3, { stop: () => stopped++ });
ok(S.begin('job', 2), 'bijbaan boss cuts a bubble off');
ok(stopped === 1, 'the bubble got its stop()');
ok(!S.begin('ambient', 2), 'bubble cannot cut the boss');
ok(!S.begin('radio', 2), 'radio cannot cut the boss');

// a phone call is not cut by mission/reaction lines, only by story
fresh();
S.hold('call', 'call');
ok(!S.canSpeak('banter'), 'banter waits for a call');
ok(!S.canSpeak('mission'), 'mission quip waits for a call');
ok(!S.canSpeak('react'), 'reaction waits for a call');
ok(S.begin('call', 2, { owner: 'call' }), 'the call itself may talk');
ok(!S.radioMayTalk(), 'radio silent during a call');
ok(S.musicDuck() === 1, 'music ducks fully under a call');
let callCut = 0;
S.release('call');
S.hold('call', 'call', () => callCut++);
ok(S.begin('story', 3, { owner: 'story' }), 'story line always plays');
ok(callCut === 1, 'story ends the call hold');

// banter conversation: lower lines wait, a call cuts it off
fresh();
let banterCut = null;
S.hold('banter', 'banter', (by) => { banterCut = by; });
ok(S.begin('banter', 2, { owner: 'banter' }), 'banter line in its own conversation');
ok(!S.canSpeak('job'), 'bijbaan boss waits for banter');
ok(!S.canSpeak('ambient'), 'bubbles wait for banter');
t += 2.5;
ok(!S.canSpeak('react'), 'between two banter lines the hold still blocks reactions');
ok(S.begin('call', 3, { owner: 'call' }), 'incoming call cuts banter');
ok(banterCut === 'call', 'banter got onPreempt(call)');
ok(!S.holding('banter'), 'banter hold is gone');

// story scene hold blocks everything else, even calls
fresh();
S.hold('story', 'story');
ok(!S.canSpeak('call'), 'call waits for a story scene');
ok(!S.hold('call', 'call'), 'a call cannot take the channel during a story scene');
ok(!S.canSpeak('banter') && !S.canSpeak('ambient') && !S.canSpeak('radio'), 'the rest waits for a story scene');
S.release('story');
ok(S.canSpeak('call'), 'call may start once the scene is over');

// queue: waiting lines play in priority order when the channel frees
fresh();
const played = [];
const tk = S.begin('call', 2, { owner: 'x' });
ok(S.request('job', 1, () => played.push('job'), { maxWait: 5 }) === 'queued', 'job line queued behind the call');
ok(S.request('react', 1, () => played.push('react'), { maxWait: 5 }) === 'queued', 'reaction queued');
ok(S.request('ambient', 1, () => played.push('ambient')) === 'drop', 'bubble without maxWait drops');
t += 1; S.end(tk); t += 0.4; S.tick();
ok(played[0] === 'job', 'the more important queued line plays first');
t += 1.2; S.tick(); t += 0.6; S.tick();
ok(played[1] === 'react', 'then the next one');
S.request('react', 1, () => played.push('late'), { maxWait: 0.5 });
t += 3; S.tick(); t += 0.6; S.tick();
ok(!played.includes('late') || played.indexOf('late') === 2, 'queued line plays or expires, never twice');
ok(S.request('react', 1, () => {}, { maxWait: 1, key: 'k' }) !== 'drop', 'keyed request');

// radio: jingles/DJ only after real silence, music ducks under any voice
fresh();
ok(S.radioMayTalk(), 'radio may talk in silence');
const b = S.begin('ambient', 1);
ok(!S.radioMayTalk(), 'no jingle while a bubble talks');
ok(S.musicDuck() > 0 && S.musicDuck() < 1, 'light duck under a bubble');
t += 0.5; S.end(b); t += 1;
ok(!S.radioMayTalk(), 'no jingle right after a line');
t += 2;
ok(S.radioMayTalk(), 'jingle after RADIO_QUIET');
ok(S.musicDuck() === 0, 'no duck in silence');
ok(S.begin('radio', 3), 'radio DJ line');
S.resetSpeech();
let djStop = 0;
S.end(S.begin('ambient', 0));
t += 3;
S.begin('radio', 3, { stop: () => djStop++ });
ok(S.begin('react', 1) && djStop === 1, 'any voice cuts the DJ off');

console.log(`${n - fails}/${n} speech rules ok`);
process.exit(fails ? 1 : 0);
