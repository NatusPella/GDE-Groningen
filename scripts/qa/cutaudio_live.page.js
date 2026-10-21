// Page half of scripts/qa/cutaudio_live.mjs (#117): elke gestuurde scène met rijdende voertuigen (cutaudio.js audioPlan) draait in echte
// tijd door de cutscene-host, terwijl de audiotap (audiotap.js, --audio-graph) meet wat er echt uit de geluidsgraaf komt:
// de effecten die de scène in de rij zet, en per scène het niveau (RMS en piek) tegenover de stilte vlak ervoor.
// Geeft per scène: rij (effectnamen), voertuigen (wat beweegt), bronnen (buffers die in de graaf starten), rms/piek, stilte.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
await imp('cutscenehost');
const host = window.__cutHost; // QA-haak van cutscenehost.js (geen export)
const scr = await imp('cutscript');
const prev = await imp('cutpreview');
const cam = await imp('camerapath');
const sc3 = await imp('scene3d');
const plan = await imp('cutaudio');
const cine = await imp('cinematics');
for (let i = 0; i < 240 && !(D && D.world); i++) await sleep(500);
await sleep(5000);
const tap = window.__qaAudio;
const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
const only = (window.__cl && window.__cl.only) || [];
const speed = (window.__cl && window.__cl.speed) || 1;
const results = {};
const root = sc3.getScene();
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
const stat = (a, b) => {
  const rows = (tap ? tap.rms : []).filter((r) => r.t >= a && r.t <= b);
  if (!rows.length) return { n: 0 };
  return { n: rows.length, rms: Math.max(...rows.map((r) => r.rms)), piek: Math.max(...rows.map((r) => r.peak)), gem: +(rows.reduce((s, r) => s + r.rms, 0) / rows.length).toFixed(4) };
};
const now = () => Math.round(performance.now() - (tap ? tap.t0 : 0));
const list = [];
for (const e of cat) {
  if (!e.scene || !e.def) continue;
  if (only.length && !only.some((o) => e.id === o || e.id.startsWith(o))) continue;
  // scènes met een rijdend voertuig of een fiets/duif in beweging (de plannen van cutaudio.js)
  const props = e.def.props || {};
  const moving = (e.def.cues || []).filter((c) => c.prop && (c.path || c.move) && props[c.prop] && plan.PROP_SOUND[props[c.prop].kind]);
  if (!moving.length) continue;
  list.push([e, [...new Set(moving.map((c) => props[c.prop].kind))]]);
}
for (const [e, pl] of list.slice(0, (window.__cl && window.__cl.max) || 12)) {
  const anchor0 = { x: p.x, y: p.y, facing: 0.3, z: p.gz || 0 };
  const env = { solid: (x, y, z) => cam.roofAt(map, x, y) > z - 0.2 };
  const at = scr.fitAnchor(e.scene, anchor0, env);
  const queued = [];
  const orig = w.audioEvents;
  const push = orig.push.bind(orig);
  orig.push = (...a) => { for (const x of a) queued.push((x.name || x.kind) + (x.sub ? ':' + x.sub : '')); return push(...a); };
  await sleep(2500);
  const quiet0 = now();
  await sleep(1500);
  const quiet1 = now();
  let run;
  try { run = host.buildScriptRun(e.def, e.scene, at, env, w); } catch (err) { results[e.id] = { fout: String(err).slice(0, 160) }; orig.push = push; continue; }
  root.add(run.group);
  const s0 = tap ? tap.sfx.length : 0;
  const t0 = now();
  const dur = Math.min(e.duration, 30 / speed);
  for (let t = 0; t <= dur; t += 0.1 * speed) { run.frame(t, 0.1 * speed); await sleep(100); }
  const t1 = now();
  run.dispose();
  orig.push = push;
  results[e.id] = { duur: +dur.toFixed(1), voertuigen: pl, rij: queued, bronnen: tap ? tap.sfx.length - s0 : null, stilte: stat(quiet0, quiet1), scene: stat(t0, t1) };
}
clearInterval(skipper);
return JSON.stringify({ results: { geluid: results, tap: !!tap } });
