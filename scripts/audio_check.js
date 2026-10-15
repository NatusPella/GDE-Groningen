// Scripted check of the audio state machine in the real game (no sound):
//   cd desktop && npm run stage && GDE_TEST_PROFILE=gde-test-audio npx electron . --windowed \
//     --stil --audio-graph --smoke-test=/tmp/gde-audio.png --perf-script=../scripts/audio_check.js
// --audio-graph (?stil&audiograf) builds the whole graph into a muted sink.
// Breaks things on purpose (stuck holds, a stuck story scene, zeroed gains,
// a muffle, a held or suspended G-Music, a suspended context) and checks
// that the watchdog (window.__audio.heal) repairs each one. Logs
// "[perf-script] AUDIO CHECK PASS|FAIL ...".
const A = window.__audio;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
let fails = 0;
const ok = (cond, name, info = '') => { if (!cond) fails++; out.push(`${cond ? 'ok' : 'XX'} ${name}${info ? ' (' + info + ')' : ''}`); };
const until = async (fn, ms = 8000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (fn()) return true; } catch (e) { /* not yet */ } await sleep(150); } return false; };
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };

if (!A) return 'AUDIO CHECK FAIL: no window.__audio';
ok(await until(() => A.state().ctx === 'running'), 'context runs in graph-test mode', JSON.stringify(A.state().ctx));
const s0 = A.state();
ok(s0.graphTest, 'graph test flag on');
const lvl = s0.master;
ok(!s0.muted && lvl > 0, 'master gain up', String(lvl));
ok(await until(() => A.state().gmusic.started && A.state().gmusic.tracks > 0, 10000), 'G-Music started', JSON.stringify(A.state().gmusic));
// whatever opens the game (intro, a call) has to finish first
const quiet = () => !A.state().sceneLive && !A.state().speech.holds.length && !A.state().speech.talking && A.state().speech.silentFor > 1.5;
// a running cutscene (the intro montage) is skipped the player's way: hold Space
for (let i = 0; i < 6 && A.state().sceneLive; i++) {
  for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  await sleep(2200);
  for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
  await sleep(800);
}
ok(await until(quiet, 60000), 'channel quiet', JSON.stringify(A.state().speech));

// a hold whose owner is gone: swept after the grace, music unducks
A.speech.hold('test-call', 'call', null, { alive: () => false });
ok(A.state().musicDuck === 1, 'dead call hold ducks the music');
A.heal();
ok(await until(() => !A.speech.holding('test-call'), 7000), 'dead call hold swept', JSON.stringify(A.state().speech.holds));
ok(await until(() => A.state().musicTarget > 0.8, 6000), 'music back up after the sweep', String(A.state().musicTarget));

// a story scene nobody ends (no cutscene runs): swept, voices free again
A.setStoryScene(true);
ok(A.state().storyScene && !A.speech.canSpeak('banter'), 'stuck story scene blocks voices');
A.heal();
ok(await until(() => !A.state().storyScene && !A.speech.holding('story'), 7000), 'stuck story scene released', JSON.stringify(A.state().speech.history.slice(-3)));

// gains and filters knocked out of place are put back
A.poke('master'); A.poke('music'); await sleep(100); A.heal(); await sleep(900);
ok(Math.abs(A.state().master - lvl) < 0.03 && Math.abs(A.state().musicOut - lvl) < 0.03, 'master and music gain restored', `${A.state().master} ${A.state().musicOut}`);
A.poke('lowpass');
ok(await until(() => A.state().lowpass > 15000, 4000), 'stray music muffle lifted', String(A.state().lowpass));
A.poke('held'); A.heal();
ok(!A.state().gmusic.held, 'G-Music held without a scenario track is released');
A.poke('gmusic'); A.heal();
ok(!A.state().gmusic.suspended, 'G-Music "suspended" while visible is cleared');

// a suspended context resumes (watchdog, or the next key press)
A.poke('suspend');
ok(await until(() => A.state().ctx === 'suspended', 2000), 'context suspended on purpose');
A.heal();
ok(await until(() => A.state().ctx === 'running', 4000), 'context resumed', A.state().ctx);

// U mutes and stays muted through the watchdog, U again unmutes
key('u', 'KeyU');
ok(await until(() => A.state().muted && A.state().master < 0.01, 2000), 'U mutes', String(A.state().master));
A.heal(); await sleep(400);
ok(A.state().muted && A.state().master < 0.01, 'watchdog keeps a real mute');
key('u', 'KeyU');
ok(await until(() => !A.state().muted && Math.abs(A.state().master - lvl) < 0.03, 2000), 'U unmutes', String(A.state().master));

// no media players piling up
await sleep(1500);
ok(A.state().voiceEls < 12, 'voice elements are released', String(A.state().voiceEls));
ok(A.state().watchdog.nan === 0, 'no NaN in the mix');
return `AUDIO CHECK ${fails ? 'FAIL' : 'PASS'}\n${out.join('\n')}`;
