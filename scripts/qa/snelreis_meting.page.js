// Page half van scripts/qa/snelreis_meting.mjs (desktop --perf-script body; #929): na een sprong van een paar kilometer
// (zoals snelreizen, het laadscherm opent via watchJumps) meet dit hoe lang het laadscherm duurt en hoe soepel de
// frames daarna zijn, per venster van 2 s, plus de streamteller en de verre laag. window.__sr = { van, naar: [namen], na: s }.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
// de openingsfilm van een nieuw spel dempt watchJumps (swallow): eerst vasthouden op Spatie tot hij klaar is
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 10 && cine.isCinematicActive(); i++) { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); await sleep(2500); for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); await sleep(1500); }
await sleep(4000);
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(200); }
const CFG = window.__sr || {};
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const plaats = (naam) => index.places.find((x) => x.name === naam);
const S3 = window.__scene3d;
const SM = await import('/js/scene3d.js');
const out = { reizen: [], errors: [] };
window.addEventListener('error', (e) => out.errors.push(String(e.message)));
// frame-opnemer: alle rAF-intervallen met tijdstip
let frames = []; let opnemen = true; let last = performance.now();
const lus = (t) => { frames.push([t, t - last]); last = t; if (opnemen) requestAnimationFrame(lus); };
requestAnimationFrame(lus);
const stats = (a) => { const s = [...a].sort((x, y) => x - y); const q = (f) => s.length ? +s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(1) : 0; return { n: a.length, med: q(0.5), p95: q(0.95), max: s.length ? +s[s.length - 1].toFixed(1) : 0, boven50: a.filter((x) => x > 50).length, boven100: a.filter((x) => x > 100).length }; };

async function reis(van, naar, nr) {
  const a = plaats(van), b = plaats(naar);
  const rep = { van, naar, afstandM: Math.round(Math.hypot(a.x - b.x, a.y - b.y)) };
  out.reizen.push(rep);
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = a.x; p.y = a.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  await sleep(CFG.settle || 14000);
  frames = [];
  const t0 = performance.now();
  p.x = b.x; p.y = b.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; // de sprong die watchJumps ziet (snelreizen)
  let open = null, dicht = null; const samples = [];
  const na = (CFG.na || 25) * 1000;
  while (true) {
    const nu = performance.now();
    const el = document.getElementById('load-screen');
    if (el && open == null) open = nu - t0;
    if (open != null && !el && dicht == null) dicht = nu - t0;
    const st = SM.streamPending();
    samples.push({ s: +((nu - t0) / 1000).toFixed(1), ls: !!el, b: st.buildings, r: st.roads, tq: map.tileQueue ? map.tileQueue.size : -1, geo: map.geoVer });
    if (dicht != null && nu - t0 > dicht + na) break;
    if (nu - t0 > (dicht == null ? 40000 : 90000)) break;
    if (dicht != null && Math.abs(nu - t0 - dicht - 600) < 130) console.log('[capture] sr' + nr + '-na06');
    await sleep(250);
  }
  rep.laadschermOpenMs = open == null ? null : Math.round(open); rep.laadschermDichtMs = dicht == null ? null : Math.round(dicht);
  rep.laadschermDuurS = open == null || dicht == null ? null : +((dicht - open) / 1000).toFixed(1);
  const ft = frames.filter(([t]) => dicht != null && t - t0 > dicht + 700); // het uitfaden van het scherm (700 ms) niet meetellen
  rep.vensters = [];
  for (let v = 0; v < (na / 1000) / 2; v++) { const lo = dicht + 700 + v * 2000, hi = lo + 2000; rep.vensters.push({ vanS: +((lo - dicht) / 1000).toFixed(1), ...stats(frames.filter(([t]) => t - t0 >= lo && t - t0 < hi).map((f) => f[1])) }); }
  rep.totaalNa = stats(ft.map((f) => f[1]));
  // tijd-tot-soepel: eerste moment na het scherm waarna 30 frames op rij onder 25 ms blijven
  let run = 0, soepel = null; for (const [t, d] of ft) { run = d < 25 ? run + 1 : 0; if (run >= 30) { soepel = Math.round(t - t0 - dicht - 700); break; } }
  rep.tijdTotSoepelMs = soepel;
  rep.streamLaatst = samples[samples.length - 1];
  rep.streamHalverwege = samples.filter((x) => x.s > (dicht / 1000) + 2).slice(0, 1)[0];
  try { rep.farLod = S3.farLod && S3.farLod.stats ? JSON.parse(JSON.stringify(S3.farLod.stats)) : null; } catch (e) { rep.farLod = String(e); }
  console.log('[capture] sr' + nr + '-na' + (CFG.na || 25));
  await sleep(500);
}
try {
  const doelen = CFG.naar || ['Delfzijl', 'Ter Apel'];
  let van = CFG.van || 'Groningen';
  for (let i = 0; i < doelen.length; i++) { await reis(van, doelen[i], i); van = doelen[i]; }
} catch (e) { out.fout = String(e && e.stack || e).slice(0, 500); }
opnemen = false;
return JSON.stringify(out);
