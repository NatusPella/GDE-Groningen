// Page half for `cutscene_shots.mjs --page=cutaudio_check.page.js` (#117): per staged scene with moving vehicles
// the real cutscene host is run through its whole timeline and every world sound it asks for is recorded
// (w.audioEvents). Proves the plan reaches the game's audio queue; levels are not measured here.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
await imp('cutscenehost');
const host = window.__cutHost; // QA-haak van cutscenehost.js (geen export)
const scr = await imp('cutscript');
const prev = await imp('cutpreview');
const cam = await imp('camerapath');
const sc3 = await imp('scene3d');
await sleep(4000);
const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
const results = {};
const root = sc3.getScene();
const only = (window.__cs && window.__cs.only) || [];
for (const e of cat) {
  if (!e.scene || !e.def) continue;
  if (only.length && !only.some((o) => e.id === o || e.id.startsWith(o))) continue;
  const anchor0 = { x: p.x, y: p.y, facing: 0.3, z: p.gz || 0 };
  const env = { solid: (x, y, z) => cam.roofAt(map, x, y) > z - 0.2 };
  const at = scr.fitAnchor(e.scene, anchor0, env);
  const seen = [];
  const queue = [];
  queue.push = (...a) => { for (const x of a) seen.push(x.name || x.kind); return Array.prototype.push.apply(queue, a); };
  w.audioEvents = queue;
  let run;
  try { run = host.buildScriptRun(e.def, e.scene, at, env, w); } catch (err) { results[e.id] = { fout: String(err).slice(0, 160) }; continue; }
  root.add(run.group);
  for (let t = 0; t <= e.duration; t += 0.1) run.frame(t, 0.1);
  run.dispose();
  if (seen.length) results[e.id] = seen.reduce((m, k) => { m[k] = (m[k] || 0) + 1; return m; }, {});
}
return JSON.stringify({ results: { geluid: results } });
