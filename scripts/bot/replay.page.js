// Page half of `scripts/bot/run.mjs --replay=<events.jsonl>` (desktop --perf-script body):
// plays the input events of an earlier run back through window.__bot (game time,
// same seed), logging its own events again so the two runs can be compared.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt' });
const events = window.__botReplay || [];
B.log('replay', { events: events.length });
const n = await B.replay(events);
await sleep(1500);
B.releaseAll();
B.shot('replay-einde');
const s = B.status();
B.log('einde', { result: 'REPLAY', replayed: n, x: s.player.x, y: s.player.y });
return JSON.stringify({ result: 'REPLAY', replayed: n, x: s.player.x, y: s.player.y, step: s.story.id || null });
