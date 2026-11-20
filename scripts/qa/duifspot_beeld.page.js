// Page half of scripts/qa/duifspot_beeld.mjs (desktop --perf-script body; #1025): start de missie Kieken van boven, zet de duif op
// afstand van het Groninger Museum en neemt beelden mét en zonder de wereldmarkers van de spotmissie. window.__ds = { settle }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const SETTLE = (window.__ds || {}).settle || 9000;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const MQ = await imp('missionquery');
const MS = await imp('missions');
const S3 = window.__scene3d;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const fix = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
fix();
setInterval(fix, 500);
const grab = async (name) => { console.log('[capture] ' + name); await sleep(700); };
const out = { stappen: [] };
const i = MQ.getMissionDefs().findIndex((d) => d.label === 'Kieken van boven');
out.index = i;
if (i < 0) { clearInterval(skipper); return JSON.stringify({ fout: 'missie niet gevonden' }); }
// de startplek van het station is pas bekend als de spots staan
for (let k = 0; k < 60 && !MQ.getMissionDefs()[i].start; k++) await sleep(500);
const ok = MS.missionDebug.start(w, i);
out.gestart = ok;
for (let k = 0; k < 120 && !(D.pigeon && w.pigeonMode && !w.pigeonIntro); k++) { await sleep(500); if (D.pigeon && w.pigeonMode) break; }
await sleep(3500); // de opstijgfase
const lm = (map.meta.landmarks || []).find((l) => l.name === 'Groninger Museum');
out.museum = lm && { x: Math.round(lm.x), y: Math.round(lm.y) };
const P = D.pigeon && D.pigeon.P;
out.pigeon = !!P;
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const zet = (x, y, hoog) => {
  P.x = x; P.y = y; P.z = gh(x, y) + hoog; P.mode = 'fly'; P.speed = 11; P.pitch = 0;
  P.yaw = Math.atan2(lm.y - y, lm.x - x);
  p.x = x; p.y = y;
};
// de duif blijft hier hangen terwijl we kijken (anders vliegt hij door): de stand steeds terugzetten
let houd = null;
const tick = () => { if (houd && P) { P.x = houd.x; P.y = houd.y; P.z = houd.z; P.speed = 11; P.yaw = houd.yaw; } requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const guide = () => S3.scene.children.find((c) => c.name === 'pigeon-guide');
const dom = () => document.getElementById('pigeon-guide');
const aan = (on) => { const g = guide(); if (g) g.visible = on; const d = dom(); if (d) d.style.visibility = on ? 'visible' : 'hidden'; };
const metingen = () => ({
  kaart: (dom() && dom().querySelector('.pg-card') && dom().querySelector('.pg-card').textContent) || null,
  pijl: !!(dom() && !dom().querySelector('.pg-arrow').hidden),
  kolommen: guide() ? guide().children.filter((c) => c.name === 'spotkolom').length : 0,
  platen: guide() ? guide().children.filter((c) => c.isSprite).length : 0,
});

// 1. vanaf 260 m ten zuiden van het museum
const a = { x: lm.x - 60, y: lm.y + 260 }; const aj = Math.atan2(lm.y - a.y, lm.x - a.x);
zet(a.x, a.y, 45); houd = { x: a.x, y: a.y, z: P.z, yaw: aj };
await sleep(SETTLE);
out.stappen.push({ stap: 'ver', ...metingen() });
aan(false); await grab('voor-ver'); aan(true); await grab('na-ver');
// 2. dichterbij, 90 m
const b = { x: lm.x - 20, y: lm.y + 95 }; zet(b.x, b.y, 38); houd = { x: b.x, y: b.y, z: P.z, yaw: Math.atan2(lm.y - b.y, lm.x - b.x) };
await sleep(3500);
out.stappen.push({ stap: 'dichtbij', ...metingen() });
aan(false); await grab('voor-dichtbij'); aan(true); await grab('na-dichtbij');
// 3. bij het eerste doel hangen: de balk, de ring en het belletje
const lijst = MQ.getMissionDefs()[i].stages[0].targets;
const t1 = lijst[0]; // de vliegles boven het Stationsplein ligt bij het station
const doel = { x: -46.86, y: 864.79 };
zet(doel.x + 30, doel.y + 60, 30); houd = { x: doel.x + 30, y: doel.y + 60, z: P.z, yaw: Math.atan2(doel.y - (doel.y + 60), doel.x - (doel.x + 30)) };
await sleep(3500);
await grab('station-kolom');
houd = { x: doel.x, y: doel.y, z: gh(doel.x, doel.y) + 30, yaw: houd.yaw };
await sleep(350);
out.stappen.push({ stap: 'hangen', ...metingen() });
await grab('hangen');
await sleep(900);
out.stappen.push({ stap: 'gespot', ...metingen() });
await grab('gespot');
await sleep(500);
await grab('gespot-na');
houd = null;
clearInterval(skipper);
return JSON.stringify(out);
