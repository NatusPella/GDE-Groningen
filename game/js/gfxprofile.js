// Graphics presets, GPU detection, the first-run advice card and dynamic
// resolution. A preset sets every graphics setting at once; the player can
// still change each one in Instellingen > Beeld.
import { getSettings, setSetting } from './settings.js';
import { DRAW_DISTANCE_LABELS } from './viewdist.js';
import { KEYS } from './storagekeys.js';
import { FLAGS } from './devflags.js';

export const GFX_PRESETS = {
  laag: { quality: 'laag', shadows: false, drawDistance: 'kort', resolution: 0.75, autoResolution: true },
  middel: { quality: 'middel', shadows: true, drawDistance: 'normaal', resolution: 1, autoResolution: true },
  // Hoog's look with the view distance of Laag: no far LOD, no far terrain and countryside, ~400 draw calls fewer per frame
  // in the city. On the RTX 3060 test machine 4 to 5 ms less CPU time per frame than Hoog (docs/PERF-METING-2026-10-19.md Vervolg 8): the 60 fps preset.
  vlot: { quality: 'hoog', shadows: true, drawDistance: 'kort', resolution: 1, autoResolution: true },
  hoog: { quality: 'hoog', shadows: true, drawDistance: 'heelver', resolution: 1, autoResolution: true },
};
export const PRESET_ORDER = ['laag', 'middel', 'vlot', 'hoog'];
const LABELS = { laag: 'Laag', middel: 'Gemiddeld', vlot: 'Vlot', hoog: 'Hoog' };
export const presetLabel = (name) => LABELS[name] || name;

// "schaduwen uit · resolutie 75%, automatisch · zichtafstand kort"
export function describePreset(name) {
  const p = GFX_PRESETS[name];
  const res = `resolutie ${Math.round(p.resolution * 100)}%${p.autoResolution ? ', automatisch' : ''}`;
  return [p.shadows ? 'schaduwen aan' : 'schaduwen uit', res, `zichtafstand ${DRAW_DISTANCE_LABELS[p.drawDistance]}`].join(' · ');
}

const SETTING_WORDS = {
  quality: (v) => `kwaliteit ${v}`,
  shadows: (v) => (v ? 'schaduwen aan' : 'schaduwen uit'),
  resolution: (v) => `resolutie ${Math.round(v * 100)}%`,
  autoResolution: (v) => (v ? 'automatische resolutie aan' : 'automatische resolutie uit'),
  drawDistance: (v) => `zichtafstand ${DRAW_DISTANCE_LABELS[v] || v}`,
};
// what applying a preset changes compared with the current settings
export function describeChanges(name, st = getSettings()) {
  return Object.entries(GFX_PRESETS[name]).filter(([k, v]) => st[k] !== v).map(([k, v]) => SETTING_WORDS[k](v)).join(' · ');
}

// a small gear, for the advice card and the benchmark banner
export const GEAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4z"/></svg>';

export function applyPreset(name) {
  for (const [k, v] of Object.entries(GFX_PRESETS[name])) setSetting(k, v);
}

// the preset the settings match exactly, else null (the player tuned them)
export function currentPreset(st = getSettings()) {
  return PRESET_ORDER.find((n) => Object.entries(GFX_PRESETS[n]).every(([k, v]) => st[k] === v)) || null;
}

// The out-of-the-box graphics: Hoog with 'ver' instead of 'heelver'. Shown
// as Eigen; the first-run advice treats it like Hoog.
const GFX_DEFAULT = { ...GFX_PRESETS.hoog, drawDistance: 'ver' };
export const isDefaultGfx = (st = getSettings()) => Object.entries(GFX_DEFAULT).every(([k, v]) => st[k] === v);

// --- phones and tablets --------------------------------------------------

// Touch devices start lighter than a desktop: the same settings as a preset,
// tuned for a small screen with a shared GPU and a battery.
export const MOBILE_PROFILES = {
  telefoon: { quality: 'laag', shadows: false, drawDistance: 'kort', resolution: 0.6, autoResolution: true },
  // a phone with little memory or few cores (deviceMemory <= 3 or <= 4 cores): the same, a smaller render
  telefoonZwak: { quality: 'laag', shadows: false, drawDistance: 'kort', resolution: 0.5, autoResolution: true },
  tablet: { quality: 'laag', shadows: false, drawDistance: 'normaal', resolution: 0.75, autoResolution: true },
  tabletKrachtig: { quality: 'middel', shadows: true, drawDistance: 'normaal', resolution: 0.8, autoResolution: true },
};

// Pure: which profile a touch device gets from its screen (CSS px) and
// machine. A phone has a short side under 600 px; a strong tablet has
// plenty of memory and cores.
export function mobileProfileFor({ width = 0, height = 0, cores = 0, memory = 0 } = {}) {
  const short = Math.min(width, height) || Math.max(width, height);
  if (short && short < 600) return (memory > 0 && memory <= 3) || (cores > 0 && cores <= 4) ? 'telefoonZwak' : 'telefoon';
  if (cores >= 8 && memory >= 6) return 'tabletKrachtig';
  return 'tablet';
}

// First start on a touch device: apply the profile once, and only while the
// graphics are still the out-of-the-box ones. Remembered in the same key the
// desktop advice uses, so that card doesn't follow. Returns the profile name.
export function applyMobileProfile(info = {}) {
  if (readAdvice() || !isDefaultGfx()) return null;
  const name = mobileProfileFor(info);
  for (const [k, v] of Object.entries(MOBILE_PROFILES[name])) setSetting(k, v);
  writeAdvice('mobiel:' + name);
  return name;
}

// --- benchmark result ---------------------------------------------------

// trailer.js runBenchmarkSuite: the full run on the current settings plus
// the other presets on its heaviest shots; Instellingen > Beeld shows it.
let bench = null;
export const getBenchResult = () => bench;

// the best looking preset that runs smoothly (50 fps), else the fastest
export function recommendPreset(fps, cur) {
  const measured = PRESET_ORDER.filter((n) => fps[n] > 0);
  if (!measured.length) return null;
  const smooth = measured.filter((n) => fps[n] >= 50);
  const pick = smooth.length ? smooth[smooth.length - 1] : measured.reduce((a, b) => (fps[b] > fps[a] ? b : a));
  return pick === cur ? null : pick;
}

export function setBenchResult(stats, preset, fps) {
  bench = stats ? { avg: stats.avg, low: stats.low, heaviest: stats.heaviest, preset, fps, rec: recommendPreset(fps, preset), banner: true } : null;
}

export function dismissBenchBanner() {
  if (bench) bench.banner = false;
}

// --- GPU detection ------------------------------------------------------

export function readGpu(gl) {
  let renderer = '';
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  } catch (e) { /* masked */ }
  // ?gpu=<renderer string>: test the advice as if on that GPU
  if (FLAGS.gpu) renderer = FLAGS.gpu;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  return { renderer, maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0, cores: nav.hardwareConcurrency || 0, memory: nav.deviceMemory || 0 };
}

const lower = (a, b) => PRESET_ORDER[Math.min(PRESET_ORDER.indexOf(a), PRESET_ORDER.indexOf(b))];

// Pure: the preset a GPU string and machine suggest. ANGLE strings look like
// "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)".
export function classifyGpu({ renderer = '', maxTexture = 0, cores = 0, memory = 0 }) {
  const r = renderer.toLowerCase();
  let tier = 'hoog', why = 'onbekend';
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(r)) { tier = 'laag'; why = 'software'; }
  else if (/mali|adreno|powervr|videocore|vivante|tegra|immortalis/.test(r)) { tier = 'laag'; why = 'mobiel'; }
  else if (/intel/.test(r)) {
    if (/arc\(tm\) a\d|arc a\d/.test(r)) { tier = 'hoog'; why = 'intel arc'; }
    else if (/arc/.test(r)) { tier = 'middel'; why = 'intel arc igpu'; }
    else { tier = 'laag'; why = 'intel igpu'; }
  } else if (/radeon|amd/.test(r)) {
    if (/rx\s?\d|radeon pro|vii|r9 /.test(r)) { tier = 'hoog'; why = 'radeon'; }
    else { tier = 'middel'; why = 'radeon igpu'; }
  } else if (/nvidia|geforce|quadro|rtx|gtx/.test(r)) {
    if (/\bmx\s?\d{3}|\bgt\s?\d{3}\b|\b9\d0m\b/.test(r)) { tier = 'middel'; why = 'geforce instap'; }
    else { tier = 'hoog'; why = 'geforce'; }
  } else if (/apple/.test(r)) { tier = 'hoog'; why = 'apple'; }
  if (maxTexture && maxTexture < 8192) { tier = 'laag'; why += ', kleine textures'; }
  if (cores && cores <= 2) { tier = 'laag'; why += ', 2 kernen'; }
  else if (cores && cores <= 4) { tier = lower(tier, 'middel'); why += ', 4 kernen'; }
  if (memory && memory <= 4) { tier = lower(tier, 'middel'); why += ', weinig geheugen'; }
  return { tier, why };
}

// Pure: what a few seconds of frame times say (median ms at the current
// settings) combined with the GPU's own tier.
export function adviseFromSample(gpuTier, medianMs, current) {
  // 17.5 ms is just over 60 fps: a machine that stays under it keeps Hoog, one between 17.5 and 22 ms gets Vlot (Hoog's look, a short view)
  const measured = medianMs > 30 ? 'laag' : medianMs > 22 ? 'middel' : medianMs > 17.5 ? 'vlot' : 'hoog';
  let pick = lower(gpuTier, measured);
  // a weak GPU that still renders smoothly here only drops one step
  if (measured === 'hoog' && pick === 'laag') pick = 'middel';
  return PRESET_ORDER.indexOf(pick) < PRESET_ORDER.indexOf(current || 'hoog') ? pick : null;
}

// --- first-run advice ----------------------------------------------------

const ADVICE_KEY = KEYS.gfxAdvice;
let sampling = false;
export const isAdvisorSampling = () => sampling;

function readAdvice() {
  try { return localStorage.getItem(ADVICE_KEY); } catch (e) { return 'x'; }
}
function writeAdvice(v) {
  try { localStorage.setItem(ADVICE_KEY, v); } catch (e) { /* ignore */ }
}

const CSS = `
#gfx-advice { position: fixed; right: 28px; bottom: 64px; z-index: 31; width: min(400px, calc(100vw - 32px)); box-sizing: border-box;
  background: rgba(10, 19, 13, 0.94); border: 1px solid rgba(63, 201, 122, 0.45); border-radius: 12px; box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  padding: 16px 20px 18px; color: #f0ede4; font-family: 'Bebas Neue', 'Arial Narrow', Arial, sans-serif; animation: gfx-adv-in 0.35s ease both; }
@keyframes gfx-adv-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
#gfx-advice h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 26px; font-weight: normal; letter-spacing: 1.5px; color: #3fc97a; }
#gfx-advice h3 svg { width: 20px; height: 20px; fill: none; stroke: #3fc97a; stroke-width: 1.8; stroke-linejoin: round; }
#gfx-advice p { margin: 0 0 6px; font: 16px/1.38 'Arial Narrow', Arial, sans-serif; letter-spacing: 0.2px; }
#gfx-advice .gfx-what { font-size: 14px; color: rgba(240, 237, 228, 0.6); }
#gfx-advice .gfx-row { display: flex; gap: 8px; margin-top: 14px; }
#gfx-advice button { font: 19px 'Bebas Neue', 'Arial Narrow', sans-serif; letter-spacing: 1.5px; padding: 7px 16px; border-radius: 4px; cursor: pointer;
  background: transparent; color: #f0ede4; border: 1px solid rgba(63, 201, 122, 0.6); }
#gfx-advice button.primary { background: #1e9e56; color: #0c140e; border-color: #1e9e56; }
#gfx-advice button:hover, #gfx-advice button:focus-visible { border-color: #3fc97a; color: #3fc97a; outline: none; }
#gfx-advice button.primary:hover, #gfx-advice button.primary:focus-visible { background: #3fc97a; border-color: #3fc97a; color: #0c140e; box-shadow: 0 0 0 2px #f0ede4; }
`;

let card = null;

function showAdvice(pick) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  card = document.createElement('div');
  card.id = 'gfx-advice';
  card.className = 'gfx-advice';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'gfx-adv-title');
  card.innerHTML = `<h3 id="gfx-adv-title">${GEAR_SVG}Soepeler spelen?</h3>
    <p>Je computer heeft het zwaar met deze stand. Met ${presetLabel(pick)} loopt Grunn een stuk vloeiender. Je kunt het altijd terugzetten bij Instellingen › Beeld.</p>
    <p class="gfx-what">${presetLabel(pick)}: ${describePreset(pick)}</p>
    <div class="gfx-row"><button type="button" class="primary" data-act="apply">Toepassen</button><button type="button" data-act="no">Nee, bedankt</button></div>`;
  card.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    if (b.dataset.act === 'apply') {
      applyPreset(pick);
      writeAdvice('toegepast:' + pick);
      card.innerHTML = `<h3>${GEAR_SVG}Toegepast</h3><p>Beeld staat nu op ${presetLabel(pick)}. Terugzetten kan altijd bij Instellingen › Beeld.</p>`;
      setTimeout(hideAdvice, 4000);
    } else {
      writeAdvice('nee');
      hideAdvice();
    }
  });
  document.body.appendChild(card);
}

export function hideAdvice() {
  if (card) { card.remove(); card = null; }
}

// From the title screen on (also during the attract intro): a few seconds of
// frame times plus the GPU string. Asks once; never when the player already
// picked graphics settings of their own.
export function startGfxAdvisor(gl) {
  if (!FLAGS.gfxadvies) {
    if (readAdvice() || (FLAGS.noattract || FLAGS.storytest || FLAGS.trailer || FLAGS.benchmark || FLAGS.stil)) return;
    if (currentPreset() !== 'hoog' && !isDefaultGfx()) return;
  }
  const gpu = classifyGpu(readGpu(gl));
  const times = [];
  let last = 0, t0 = 0;
  sampling = true;
  const step = (now) => {
    if (document.hidden) { last = 0; requestAnimationFrame(step); return; }
    if (!t0) t0 = now;
    if (last && now - t0 > 2500) times.push(now - last);
    last = now;
    if (now - t0 < 7000 || times.length < 60) { requestAnimationFrame(step); return; }
    sampling = false;
    times.sort((a, b) => a - b);
    const median = times[times.length >> 1];
    const pick = adviseFromSample(gpu.tier, median, currentPreset() || 'hoog');
    window.__gfxAdvice = { gpu, median: +median.toFixed(1), pick };
    if (!pick) { writeAdvice('ok'); return; }
    if (!document.body.classList.contains('game-started')) showAdvice(pick);
  };
  requestAnimationFrame(step);
}

// --- adaptive quality ---------------------------------------------------

// With autoResolution on, sustained slow frames step the view down and a
// long run of good ones steps it back up. Each second is judged by its
// median frame time and median main-thread time, so hitches (streaming, GC,
// a worker burst) never count. GPU-bound (the frame much longer than the
// main thread's work, for at least two seconds; three on Hoog): render scale,
// down to 60%. CPU-bound: cpuLevel 1-2, fewer facade details and a shadow
// map every other frame (scene3d.js). A step back up that has to be undone
// again soon makes the next step up wait twice as long (15 s up to 2 min).
const DYN_MIN = 0.5;
const SLOW_MS = 27, GOOD_MS = 19;
// cpuLevel 3: no shadow map but one frame in four, the shortest view and detail ring, fewer facade details and a thinner city
const CPU_LEVEL_MAX = 3;
const COOL_MS = 2500, UP_WAIT_MS = 15000, UP_WAIT_MAX = 120000;
const dyn = { scale: 1, cpuLevel: 0, ms: [], cpu: [], sum: 0, slowGpu: 0, slowCpu: 0, good: 0, cool: 0, upWait: UP_WAIT_MS, upAt: 0, lastUp: -1e9, now: 0 };
export const dynamicScale = () => dyn.scale;
export const cpuLevel = () => dyn.cpuLevel;

// back to full scale (a new run in scripts/gfx_profile_test.mjs)
export function resetDynamic() {
  Object.assign(dyn, { scale: 1, cpuLevel: 0, ms: [], cpu: [], sum: 0, slowGpu: 0, slowCpu: 0, good: 0, cool: 0, upWait: UP_WAIT_MS, upAt: 0, lastUp: -1e9, now: 0 });
}

function median(a) {
  a.sort((x, y) => x - y);
  return a[a.length >> 1];
}

// --- per-frame counter (development and measurement only) ----------------
// ?dev, ?testmenu, ?benchmark or ?perf (or window.__gfxPerfAan = true in a run)
// keep a window of the last 120 frames: the draw calls the renderer made, the
// main-thread CPU time of the frame and what the static batches cost
// (staticbatch3d.js noteBatchWork). window.__gfxPerf holds the latest frame
// and the averages; a player never pays for it.
const PERF_WINDOW = 120;
const PERF_MIN = 30;
let perfWin = null;

export const perfCounterOn = () => !!(FLAGS.dev || FLAGS.testmenu || FLAGS.benchmark || FLAGS.perf
  || (typeof window !== 'undefined' && window.__gfxPerfAan));

function makePerfWindow() {
  return {
    n: 0, i: 0, f: 0, pendMeshes: 0, pendMs: 0,
    ms: new Float32Array(PERF_WINDOW), cpu: new Float32Array(PERF_WINDOW), draws: new Float32Array(PERF_WINDOW),
    batchMeshes: new Float32Array(PERF_WINDOW), batchMs: new Float32Array(PERF_WINDOW),
    out: { frames: 0, draws: 0, cpu: 0, batchMeshes: 0, batchMs: 0, avgDraws: 0, avgCpu: 0, avgBatchMeshes: 0, avgBatchMs: 0 },
  };
}
const perf = () => perfWin || (perfWin = makePerfWindow());

// staticbatch3d.js, once per frame per batcher: the draw slots its merged cells
// and loose batch meshes hold, and the ms the batcher spent (dev/benchmark only)
export function noteBatchWork(meshes, ms) {
  if (!perfCounterOn()) return;
  const w = perf();
  w.pendMeshes += meshes;
  w.pendMs += ms;
}

// the window as plain numbers (scripts/gfx_profile_test.mjs and a run)
export function perfSnapshot() {
  if (!perfWin) return null;
  const w = perfWin, n = w.n;
  return {
    frames: n,
    ms: Array.from(w.ms.subarray(0, n)), cpu: Array.from(w.cpu.subarray(0, n)), draws: Array.from(w.draws.subarray(0, n)),
    batchMeshes: Array.from(w.batchMeshes.subarray(0, n)), batchMs: Array.from(w.batchMs.subarray(0, n)),
    avgDraws: w.out.avgDraws, avgCpu: w.out.avgCpu, avgBatchMeshes: w.out.avgBatchMeshes, avgBatchMs: w.out.avgBatchMs,
  };
}

export function resetPerfCounter() {
  perfWin = null;
  if (hooked) { hooked.renderer.render = hooked.orig; hooked = null; }
  if (typeof window !== 'undefined') delete window.__gfxPerf;
}

// three resets info.render at the start of every render() (info.autoReset, its default) and a
// frame has one scene render plus the post-chain's quads, so the calls of the frame are summed
// here (the same hook scripts/perf/routes.js uses)
let hooked = null;
function hookRenderer() {
  const s = typeof window !== 'undefined' ? window.__scene3d : null;
  if (!s || !s.renderer) return null;
  if (hooked && hooked.renderer === s.renderer) return hooked;
  const renderer = s.renderer, orig = renderer.render;
  const h = hooked = { renderer, orig, calls: 0 };
  renderer.render = function (...args) {
    const out = orig.apply(this, args);
    h.calls += renderer.info.render.calls || 0;
    return out;
  };
  return h;
}

function notePerfFrame(ms, cpuMs) {
  const w = perf();
  const h = hookRenderer();
  const i = w.i;
  w.ms[i] = ms;
  w.cpu[i] = cpuMs;
  w.draws[i] = h ? h.calls : 0;
  if (h) h.calls = 0;
  w.batchMeshes[i] = w.pendMeshes;
  w.batchMs[i] = w.pendMs;
  w.pendMeshes = 0; w.pendMs = 0;
  w.i = (i + 1) % PERF_WINDOW;
  if (w.n < PERF_WINDOW) w.n++;
  const o = w.out;
  o.frames = w.n; o.draws = w.draws[i]; o.cpu = cpuMs; o.batchMeshes = w.batchMeshes[i]; o.batchMs = w.batchMs[i];
  // the averages every 16 frames, so a frame costs only its ring slot
  if (++w.f % 16 === 0 && w.n >= PERF_MIN) {
    let sd = 0, sc = 0, sb = 0, sbm = 0;
    for (let k = 0; k < w.n; k++) { sd += w.draws[k]; sc += w.cpu[k]; sb += w.batchMeshes[k]; sbm += w.batchMs[k]; }
    o.avgDraws = +(sd / w.n).toFixed(1); o.avgCpu = +(sc / w.n).toFixed(2);
    o.avgBatchMeshes = +(sb / w.n).toFixed(1); o.avgBatchMs = +(sbm / w.n).toFixed(3);
  }
  if (typeof window !== 'undefined') window.__gfxPerf = o;
}

// One rendered in-game frame: interval and main-thread ms. True when
// something changed.
export function noteFrame(ms, cpuMs) {
  if (perfCounterOn()) notePerfFrame(ms, cpuMs);
  if (!getSettings().autoResolution) {
    if (dyn.scale === 1 && dyn.cpuLevel === 0) return false;
    dyn.scale = 1; dyn.cpuLevel = 0;
    return true;
  }
  if (!(ms > 0)) return false;
  // a frame past 250 ms is a hitch (or a hidden window) to the judgement, but a machine that only manages 3 fps must still be seen as slow:
  // it counts as 250 (each second is judged by its median, so single hitches do not move it)
  ms = Math.min(ms, 250); cpuMs = Math.min(cpuMs, 250);
  dyn.now += ms;
  if (dyn.cool > 0) { dyn.cool -= ms; return false; }
  dyn.ms.push(ms); dyn.cpu.push(cpuMs); dyn.sum += ms;
  if (dyn.sum < 1000) return false;
  const med = median(dyn.ms), cpu = median(dyn.cpu);
  dyn.ms = []; dyn.cpu = []; dyn.sum = 0;
  const was = dyn.scale + dyn.cpuLevel * 10;
  const gpuBound = med - cpu > Math.max(6, med * 0.35);
  const hoog = getSettings().quality === 'hoog';
  if (med > SLOW_MS) {
    dyn.good = 0;
    // far over budget (a weak machine): each such second counts double, so the steps come twice as fast
    const sev = med > SLOW_MS * 2.5 ? 2 : 1;
    if (gpuBound) { dyn.slowGpu += sev; dyn.slowCpu = 0; } else { dyn.slowCpu += sev; dyn.slowGpu = 0; }
    if (dyn.slowGpu >= (hoog ? 3 : 2) && dyn.scale > DYN_MIN) {
      dyn.scale = Math.max(DYN_MIN, dyn.scale - 0.1);
      dyn.slowGpu = 0;
    } else if (dyn.slowCpu >= 2 && dyn.cpuLevel < CPU_LEVEL_MAX) {
      dyn.cpuLevel++;
      dyn.slowCpu = 0;
    }
  } else {
    dyn.slowGpu = dyn.slowCpu = 0;
    if (med < GOOD_MS && ++dyn.good >= 5 && dyn.now >= dyn.upAt) {
      dyn.good = 0;
      if (dyn.scale < 1) { dyn.scale = Math.min(1, dyn.scale + 0.05); dyn.lastUp = dyn.now; }
      else if (dyn.cpuLevel > 0) dyn.cpuLevel--;
    }
  }
  dyn.scale = Math.round(dyn.scale * 20) / 20;
  const now = dyn.scale + dyn.cpuLevel * 10;
  if (now === was) return false;
  // every step up waits upWait after the last change; undoing a recent step
  // up doubles that wait
  if (now < was) dyn.upWait = dyn.now - dyn.lastUp < 30000 ? Math.min(UP_WAIT_MAX, dyn.upWait * 2) : UP_WAIT_MS;
  dyn.upAt = dyn.now + dyn.upWait;
  dyn.cool = COOL_MS;
  if (typeof window !== 'undefined') window.__gfxDyn = { scale: dyn.scale, cpuLevel: dyn.cpuLevel, median: +med.toFixed(1), cpu: +cpu.toFixed(1) };
  return true;
}
