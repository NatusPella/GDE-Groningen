// Page half of scripts/qa/cutscene_shots.mjs (desktop --perf-script body, #136 #209).
// window.__cs = { only: ['M12.intro', ...], spot: {x,y,a} } is put in front. Per staged scene: the real
// cutscene host builds the scene on the real world at the spot (fitAnchor + roof check, as in the game),
// and one screenshot per shot is taken at the start of each shot ('[capture] <id>-shotNN-tX.X').
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const CS = window.__cs || {};
const cine = await imp('cinematics');
const host = await imp('cutscenehost');
const scr = await imp('cutscript');
const prev = await imp('cutpreview');
const cam = await imp('camerapath');
const sc3 = await imp('scene3d');
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.devInvuln = true;
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const spot = CS.spot || { x: 200.8, y: 45.4, a: 0.3 };
if (p.inVehicle) p.exitVehicle(map, w);
p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; p.z = 0;
p.gz = map.groundHeightAt ? map.groundHeightAt(spot.x, spot.y, 0) || 0 : 0;
const hold = setInterval(() => { p.x = spot.x; p.y = spot.y; p.vx = p.vy = 0; }, 100);
await sleep(CS.settle || 6000);

const script = await (await fetch('/storydata/script.json')).json();
const src = await (await fetch('/js/missionstory.js')).text();
const cat = prev.buildCatalog({ script, npcSource: src });
// the real NPC looks (names only in the catalogue's table): the real table comes from missionstory when exported
let T = 0;
const results = {};
const root = sc3.getScene();
for (const e of cat) {
  if (!e.scene || !e.def) continue;
  if (CS.only && CS.only.length && !CS.only.some((o) => e.id === o || e.id.startsWith(o))) continue;
  const anchor0 = { x: spot.x, y: spot.y, facing: spot.a, z: p.gz || 0 };
  const env = { solid: (x, y, z) => cam.roofAt(map, x, y) > z - 0.2 };
  const at = scr.fitAnchor(e.scene, anchor0, env);
  let run;
  const notes = [];
  try { run = host.buildScriptRun(e.def, e.scene, at, env, w); } catch (err) { results[e.id] = { fout: String(err).slice(0, 200) }; continue; }
  root.add(run.group);
  w.cinematicHidePlayers = true; w.cinematicHideNav = true;
  T = 0;
  cine.playCinematic({ id: 'cs-shots', duration: 3600, priority: 9, letterbox: false, hideHud: true, pause: true, skippable: false, shot: () => run.frame(T, 0.05) });
  await sleep(500);
  const times = prev.stillTimes(e);
  let k = 0;
  for (const t of times) {
    T = t;
    await sleep(120); // a few frames at this t
    await sleep(380);
    const name = prev.stillName(e.id, k, t).replace(/\.png$/, '').replace(/[^\w.-]/g, '_');
    console.log('[capture] ' + name);
    await sleep(450);
    k++;
  }
  cine.skipCinematic && cine.skipCinematic();
  run.dispose();
  w.cinematicHidePlayers = false; w.cinematicHideNav = false;
  results[e.id] = { shots: times.length, anker: { x: +at.x.toFixed(1), y: +at.y.toFixed(1), facing: +at.facing.toFixed(2) } };
  console.log('[cs-scene] ' + e.id + ' ' + JSON.stringify(results[e.id]));
  await sleep(300);
}
clearInterval(hold);
return JSON.stringify({ results });
