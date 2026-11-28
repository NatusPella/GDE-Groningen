// Diagnose van de videokaart en de snelheid (0.64.1, Nikky: benchmark 24 fps op een RX 9070 XT). Eén blok
// technische info dat de speler met één klik kopieert: welke GPU en welke ANGLE-backend WebGL echt gebruikt,
// of het softwarematig tekent, schermverversing, de rust-frametijden, de kwaliteitsstand en wat de stad kost
// (drawcalls, driehoeken). Niets gaat naar buiten: de speler plakt het zelf in een bericht.
// Bereikbaar via Instellingen > Beeld > Diagnose, de knop op het benchmarkscherm, Ctrl+Shift+G en ?gpuinfo=1.
// De pure delen (gpuKind, angleBackend, gpuWarning, formatReport) draaien ook in Node: scripts/gpudiag_test.mjs.
import { FLAGS } from './devflags.js';
import { VERSION } from './version.js';
import { classifyGpu, currentPreset, presetLabel, dynamicScale, cpuLevel } from './gfxprofile.js';
import { readLastRun } from './benchstats.js';
import { audioBlokTekst } from './audiodiag.js';
import { writeClipboardText } from './clipwrite.js';
import { gpuState, describeGpu } from './gpuherstel.js';
import { createHeapTracker, memSources, formatMemBlock } from './memwatch.js';
import { createLeakWatch, formatLeakBlock, collectLeakCounts, installLeakProbes, LEAK_EVERY_MS } from './leakwatch.js'; // #1065
import { programWatch } from './programwatch.js';
import { getRouteRibbonStats, formatRibbonStats } from './pathribbonwatch.js'; // #1036
import { devWarn } from './devwarn.js';

const SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic|warp\b/i;
// A GPU that shares the processor's memory: Intel UHD/Iris/HD, the AMD "Radeon(TM) Graphics" and the 3-digit-M Radeons
// of the Ryzen chips, Vega in a Ryzen. A discrete Intel Arc (A or B series) and any Radeon RX are not.
const INTEGRATED_RE = /intel\(r\)\s*(uhd|hd|iris)|intel.*(uhd|iris|hd graphics)|intel\(r\) graphics|arc\(tm\) graphics|radeon\(tm\) graphics|radeon graphics|radeon\s?\d{3}m\b|radeon\(tm\)\s?\d{3}m\b|radeon\(tm\) vega|radeon vega|radeon\(tm\) r\d/i;

// 'software' | 'integrated' | 'discrete' | 'onbekend' (empty or masked string)
export function gpuKind(renderer) {
  const r = String(renderer || '');
  if (!r.trim()) return 'onbekend';
  if (SOFTWARE_RE.test(r)) return 'software';
  if (/apple/i.test(r)) return 'integrated';
  if (/rx\s?\d|radeon pro|arc\(tm\) [ab]\d|arc [ab]\d|geforce|nvidia|quadro|rtx|gtx/i.test(r) && !INTEGRATED_RE.test(r)) return 'discrete';
  if (INTEGRATED_RE.test(r)) return 'integrated';
  return 'discrete';
}

// 'D3D11' | 'D3D9' | 'Vulkan' | 'OpenGL' | 'Metal' | '' from an ANGLE string such as
// "ANGLE (AMD, AMD Radeon RX 9070 XT (0x00007550) Direct3D11 vs_5_0 ps_5_0, D3D11)"
export function angleBackend(renderer) {
  const r = String(renderer || '');
  if (!/angle/i.test(r)) return '';
  if (/vulkan/i.test(r)) return 'Vulkan';
  if (/metal/i.test(r)) return 'Metal';
  if (/d3d11|direct3d11/i.test(r)) return 'D3D11';
  if (/d3d9|direct3d9/i.test(r)) return 'D3D9';
  if (/opengl|\bgl\b/i.test(r)) return 'OpenGL';
  return '?';
}

// A warning line for the player, or null when nothing is wrong. `windows` limits the integrated-GPU advice to
// the platform where the app can be pointed to the fast GPU.
export function gpuWarning(renderer, { windows = true, softwareProbe = false } = {}) {
  const kind = softwareProbe ? 'software' : gpuKind(renderer);
  if (kind === 'software') return { kind, text: 'Je spel tekent met de processor in plaats van met een videokaart. Daardoor is het erg traag. Controleer je videokaartstuurprogramma.', help: false };
  if (kind === 'integrated' && windows && !/apple/i.test(String(renderer))) return { kind, text: 'Je spel draait op de ingebouwde videokaart. Kies de snelle in de grafische instellingen van je besturingssysteem.', help: true };
  return null;
}

const f1 = (x) => (Number.isFinite(x) ? (Math.round(x * 10) / 10).toString().replace('.', ',') : '-');

// median, p95 and worst of frame intervals, plus the average fps
export function frameSummary(ms) {
  const v = (ms || []).filter((x) => Number.isFinite(x) && x > 0);
  if (!v.length) return null;
  const s = v.slice().sort((a, b) => a - b);
  const sum = v.reduce((a, b) => a + b, 0);
  return { n: v.length, median: s[s.length >> 1], p95: s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)], max: s[s.length - 1], fps: 1000 / (sum / v.length) };
}
const sumLine = (st) => (st ? `${st.n} beelden, gemiddeld ${f1(st.fps)} fps, mediaan ${f1(st.median)} ms, p95 ${f1(st.p95)} ms, langste ${f1(st.max)} ms` : 'niet gemeten');

// the plain-text block (pure: info comes from collectTechInfo or from a test)
export function formatReport(info) {
  const i = info || {};
  const g = i.gl || {};
  const cls = classifyGpu({ renderer: g.renderer || '', maxTexture: g.maxTexture || 0, cores: i.cores || 0, memory: i.memory || 0 });
  const kind = i.softwareProbe ? 'software' : gpuKind(g.renderer);
  const out = [`GDE Groningen ${i.version || VERSION}: technische info`];
  const add = (k, v) => out.push(`${k}: ${v === undefined || v === null || v === '' ? '-' : v}`);
  out.push('', '[Videokaart]');
  add('WebGL-renderer', g.renderer);
  add('WebGL-leverancier', g.vendor);
  add('WebGL-versie', g.version);
  add('ANGLE-backend', angleBackend(g.renderer) || 'onbekend (geen ANGLE-tekst)');
  add('Soort', kind + (i.softwareProbe ? ' (WebGL zonder softwarevangnet geweigerd)' : ''));
  add('Klasse voor het advies', `${cls.tier} (${cls.why})`);
  add('Max. textuurgrootte', g.maxTexture);
  add('Parallel shaders compileren', g.parallelCompile ? 'ja' : 'nee');
  add('Processorkernen', i.cores);
  add('Geheugen (GB, afgerond door de browser)', i.memory);
  if (i.electron) {
    const e = i.electron;
    out.push('', '[Electron en Chromium (hoofdproces)]');
    add('Electron / Chromium', `${(e.versions || {}).electron || '-'} / ${(e.versions || {}).chrome || '-'}`);
    if (e.features) for (const [k, v] of Object.entries(e.features)) out.push(`  ${k}: ${v}`);
    for (const d of e.devices || []) out.push(`  GPU-apparaat: ${[d.vendorId && 'vendor 0x' + Number(d.vendorId).toString(16), d.deviceId && 'device 0x' + Number(d.deviceId).toString(16), d.driverVendor, d.driverVersion, d.active ? 'actief' : ''].filter(Boolean).join(', ')}`);
    if (e.aux) for (const [k, v] of Object.entries(e.aux)) out.push(`  ${k}: ${v}`);
    add('Opstartvlaggen', (e.switches || []).join(' ') || 'geen');
    for (const d of e.displays || []) out.push(`  Scherm: ${d.width}x${d.height}, schaal ${d.scale}, ${d.hz || '?'} Hz${d.primary ? ', hoofdscherm' : ''}`);
  }
  out.push('', '[Scherm en beeld]');
  add('devicePixelRatio', f1(i.dpr));
  add('Venster (CSS-pixels)', i.win);
  add('Tekenvlak (pixels)', i.canvas);
  add('Verversing (rAF)', i.rafHz ? `${f1(i.rafHz)} Hz` : 'niet gemeten');
  add('Venster zichtbaar en gefocust', i.visible === undefined ? '-' : `${i.visible ? 'zichtbaar' : 'verborgen'}, ${i.focused ? 'focus' : 'geen focus'}`);
  out.push('', '[Kwaliteit]');
  add('Stand', i.preset || 'eigen instellingen');
  add('Instellingen', i.settings);
  add('Dynamische resolutie', i.dyn);
  out.push('', '[Snelheid]');
  add('Eerste 5 s na het starten', sumLine(i.boot));
  add('Nu (3 s)', sumLine(i.now));
  if (i.hitches) {
    out.push('', '[Haperingen, laatste 60 s (beelden langer dan 50 ms)]');
    const h = i.hitches;
    add('Aantal', `${h.length}; boven 100 ms: ${h.filter((x) => x.ms > 100).length}`);
    for (const x of h.slice(-25)) out.push(`  +${f1(x.t)} s: ${f1(x.ms)} ms${x.programs > 0 ? `, ${x.programs} nieuwe shaders` : ''}${x.longest ? `, langste taak ${f1(x.longest)} ms` : ''}${x.heapDrop ? `, heap -${f1(x.heapDrop)} MB (opruimen?)` : ''}`);
  }
  if (i.render) add('De stad per beeld', `${f1(i.render.calls)} drawcalls, ${Math.round(i.render.triangles || 0)} driehoeken, ${i.render.geometries || '-'} geometrieën, ${i.render.textures || '-'} texturen, ${i.render.programs || '-'} shaders`);
  if (i.programmas && i.programmas.length) out.push('', '[Shaderprogramma\'s na de start]', ...i.programmas);
  if (i.routeStrook !== undefined) add('Routestrook (waakhond)', i.routeStrook);
  if (i.bench) add('Laatste benchmark', `${i.bench.avg} fps gemiddeld, p95 ${i.bench.p95} ms, laagste 1% ${i.bench.low1} fps, stand ${i.bench.preset || 'eigen'}${i.bench.cats ? '; per categorie ' + Object.entries(i.bench.cats).map(([c, v]) => `${c} ${v}`).join(', ') : ''}`);
  if (i.mem) out.push('', formatMemBlock(i.mem));
  if (i.leak) out.push('', i.leak);
  if (i.audioBlok) out.push('', i.audioBlok);
  if (i.herstel && i.herstel.length) out.push('', '[Beeldherstel]', ...i.herstel);
  const w = gpuWarning(g.renderer, { windows: /win/i.test(i.platform || ''), softwareProbe: !!i.softwareProbe });
  if (w) out.push('', `Let op: ${w.text}`);
  return out.join('\n');
}

// --- the page half: measuring --------------------------------------------------------------

let bootTimes = null;
// The hitch log (the last 60 s): every frame over 50 ms with the time, what changed around it (new shader programs,
// a long task, a heap drop that looks like a garbage collection). Kept in a small ring; a player never pays for more
// than one cheap callback per frame.
const HITCH_MS = 50, HITCH_KEEP_S = 60, HITCH_MAX = 60;
const hitchLog = [];
const heapTracker = createHeapTracker();
const leakWatch = createLeakWatch();
let leakAt = -Infinity;
let longTasks = [];
export const hitchEntries = () => hitchLog.slice();

function noteHitch(t, ms, extra) {
  hitchLog.push({ t, ms, ...extra });
  while (hitchLog.length > HITCH_MAX || (hitchLog.length && t - hitchLog[0].t > HITCH_KEEP_S)) hitchLog.shift();
}

// The first seconds after the page starts: frame intervals, to compare with the later rest measurement.
// The same loop keeps the hitch log for as long as the page lives.
export function startRestSampler(ms = 5000) {
  if (bootTimes || typeof requestAnimationFrame !== 'function') return;
  bootTimes = [];
  try { installLeakProbes(); } catch (e) { devWarn('gpudiag', e); }
  try {
    if (typeof PerformanceObserver !== 'undefined') {
      const po = new PerformanceObserver((list) => { for (const e of list.getEntries()) longTasks.push({ at: e.startTime, d: e.duration }); if (longTasks.length > 200) longTasks = longTasks.slice(-100); });
      po.observe({ entryTypes: ['longtask'] });
    }
  } catch (e) { devWarn('gpudiag', e); }
  let last = 0, t0 = 0, progs = 0, heap = 0;
  const step = (now) => {
    if (!t0) t0 = now;
    const dt = last ? now - last : 0;
    if (last && now - t0 < ms) bootTimes.push(dt);
    if (dt > HITCH_MS && dt < 5000) {
      const s = typeof window !== 'undefined' ? window.__scene3d : null;
      const p = s && s.renderer && s.renderer.info.programs ? s.renderer.info.programs.length : 0;
      const tasks = longTasks.filter((x) => x.at + x.d >= last && x.at <= now);
      // a heap reading only on a hitch (to see a garbage collection) and once per 5 s below: never one per frame (memwatch.js)
      const h = performance && performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
      noteHitch((now - t0) / 1000, dt, { programs: p - progs, longest: tasks.reduce((m, x) => Math.max(m, x.d), 0), heapDrop: heap && h && heap - h > 2 ? heap - h : 0 });
    }
    if (typeof window !== 'undefined' && window.__scene3d && window.__scene3d.renderer && window.__scene3d.renderer.info.programs) progs = window.__scene3d.renderer.info.programs.length;
    if (performance && performance.memory && heapTracker.due(now)) { heap = performance.memory.usedJSHeapSize / 1048576; heapTracker.note(now, heap); }
    if (now - leakAt >= LEAK_EVERY_MS) { leakAt = now; try { leakWatch.note(now, collectLeakCounts(window, { frame: window.__frameGuard ? window.__frameGuard.snapshot() : null })); } catch (e) { devWarn('gpudiag', e); } }
    last = now;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function sampleFrames(ms) {
  return new Promise((resolve) => {
    const times = [];
    let last = 0, t0 = 0;
    const step = (now) => {
      if (!t0) t0 = now;
      if (last) times.push(now - last);
      last = now;
      if (now - t0 < ms) requestAnimationFrame(step); else resolve(times);
    };
    requestAnimationFrame(step);
  });
}

// the drawcalls and triangles of a frame, summed over its renders (three resets info.render per render call)
function sampleRender(frames = 20) {
  const s = typeof window !== 'undefined' ? window.__scene3d : null;
  const ren = s && s.renderer;
  if (!ren) return Promise.resolve(null);
  return new Promise((resolve) => {
    const orig = ren.render;
    let calls = 0, tris = 0, n = 0, inFrame = 0, ended = false;
    ren.render = function (...a) {
      const out = orig.apply(this, a);
      calls += ren.info.render.calls || 0;
      tris += ren.info.render.triangles || 0;
      return out;
    };
    const step = () => {
      if (ended) return;
      if (++n > frames) {
        ended = true;
        ren.render = orig;
        const m = ren.info.memory, p = ren.info.programs;
        resolve({ calls: calls / frames, triangles: tris / frames, geometries: m.geometries, textures: m.textures, programs: p ? p.length : 0 });
        return;
      }
      inFrame++;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function glInfo() {
  const s = typeof window !== 'undefined' ? window.__scene3d : null;
  let gl = null;
  try { gl = s && s.renderer ? s.renderer.getContext() : null; } catch (e) { gl = null; }
  let own = false;
  if (!gl) { try { gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'); own = true; } catch (e) { gl = null; } }
  if (!gl) return {};
  const out = {};
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    out.renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    out.vendor = String(gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR) || '');
    out.version = String(gl.getParameter(gl.VERSION) || '');
    out.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
    out.parallelCompile = !!gl.getExtension('KHR_parallel_shader_compile');
  } catch (e) { devWarn('gpudiag', e); }
  if (FLAGS.gpu) out.renderer = FLAGS.gpu;
  if (own) { const l = gl.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
  return out;
}

// a WebGL context that is refused when the browser would draw in software
function softwareProbe() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) || c.getContext('webgl', { failIfMajorPerformanceCaveat: true });
    if (!gl) return true;
    const l = gl.getExtension('WEBGL_lose_context');
    if (l) l.loseContext();
    return false;
  } catch (e) { return false; }
}

// everything of the report as data; takes about 3 seconds (the rest measurement)
export async function collectTechInfo({ nowMs = 3000 } = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const D = typeof window !== 'undefined' ? window.gdeDesktop : null;
  const info = { version: VERSION, platform: (D && D.platform) || nav.platform || '', cores: nav.hardwareConcurrency || 0, memory: nav.deviceMemory || 0 };
  info.gl = glInfo();
  info.softwareProbe = typeof document !== 'undefined' ? softwareProbe() : false;
  info.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  info.win = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '';
  const s = typeof window !== 'undefined' ? window.__scene3d : null;
  if (s && s.renderer && s.renderer.domElement) info.canvas = `${s.renderer.domElement.width}x${s.renderer.domElement.height}`;
  info.visible = typeof document !== 'undefined' ? !document.hidden : undefined;
  info.focused = typeof document !== 'undefined' && document.hasFocus ? document.hasFocus() : undefined;
  try {
    const st = JSON.parse(localStorage.getItem('gde-settings') || '{}');
    info.settings = ['quality', 'shadows', 'drawDistance', 'resolution', 'autoResolution', 'zuinig'].map((k) => `${k}=${st[k]}`).join(' ');
  } catch (e) { info.settings = '-'; }
  const cur = currentPreset();
  info.preset = cur ? presetLabel(cur) : '';
  info.dyn = `schaal ${dynamicScale()}, cpuLevel ${cpuLevel()}`;
  info.boot = frameSummary(bootTimes);
  const times = await sampleFrames(nowMs);
  info.now = frameSummary(times);
  const med = info.now ? info.now.median : 0;
  info.rafHz = med > 0 ? 1000 / med : 0;
  info.render = await sampleRender(20);
  info.hitches = hitchEntries().filter((x) => x.t >= 0);
  try { info.programmas = programWatch.lines(); } catch (e) { devWarn('gpudiag', e); }
  try { info.routeStrook = formatRibbonStats(getRouteRibbonStats()); } catch (e) { devWarn('gpudiag', e); }
  const last = readLastRun();
  if (last) info.bench = { avg: last.avg, p95: last.p95, low1: last.low1, preset: last.preset, cats: last.cats };
  try { info.herstel = describeGpu(gpuState, performance.now()); } catch (e) { devWarn('gpudiag', e); }
  try {
    const pm = typeof performance !== 'undefined' ? performance.memory : null;
    info.mem = { heap: { usedMB: pm ? pm.usedJSHeapSize / 1048576 : NaN, totalMB: pm ? pm.totalJSHeapSize / 1048576 : NaN, limitMB: pm ? pm.jsHeapSizeLimit / 1048576 : NaN, tracker: heapTracker.snapshot() }, render: info.render || {}, src: memSources() };
  } catch (e) { devWarn('gpudiag', e); }
  try { info.leak = formatLeakBlock(leakWatch.snapshot(), typeof window !== 'undefined' && window.__frameGuard ? window.__frameGuard.snapshot() : null); } catch (e) { devWarn('gpudiag', e); }
  try { info.audioBlok = audioBlokTekst(); } catch (e) { devWarn('gpudiag', e); }
  if (D && D.gpuInfo) { try { info.electron = await D.gpuInfo(); } catch (e) { devWarn('gpudiag', e); } }
  return info;
}

export async function techInfoText(opts) {
  return formatReport(await collectTechInfo(opts));
}

const writeClipboard = (text) => writeClipboardText(text); // clipwrite.js: desktop, navigator.clipboard, execCommand

// collects the block and puts it on the clipboard; true when that worked
export async function copyTechInfo() {
  return writeClipboard(await techInfoText());
}

// the first-start check for the fast GPU: the renderer string alone (no measuring)
export function currentGpuWarning() {
  try {
    const g = glInfo();
    return gpuWarning(g.renderer, { windows: /win/i.test((window.gdeDesktop && window.gdeDesktop.platform) || navigator.platform || '') });
  } catch (e) { return null; }
}

// --- the dialog: Ctrl+Shift+G and ?gpuinfo=1 ------------------------------------------------

// De opmaak staat in ds-schermen.css (zeefdruk, designsysteem): een .ds-z-kaart met .ds-z-knop-knoppen.

let dlg = null;
let vorigeFocus = null;

// Tab in de dialoog: de volgende (of met Shift de vorige) knop, rond; buiten de dialoog terug naar de eerste. Puur, voor de test.
export function focusVolgende(knoppen, actief, terug) {
  if (!knoppen || !knoppen.length) return null;
  const i = knoppen.indexOf(actief);
  if (i < 0) return terug ? knoppen[knoppen.length - 1] : knoppen[0];
  return knoppen[(i + (terug ? knoppen.length - 1 : 1)) % knoppen.length];
}

export function isTechInfoOpen() { return !!(dlg && !dlg.hidden); }

// Sluiten geeft de focus terug aan wat hem had (de dialoog was een onderbreking, geen nieuwe plek).
function sluitTechInfo() {
  if (!dlg) return;
  dlg.hidden = true;
  const v = vorigeFocus; vorigeFocus = null;
  try { if (v && v.isConnected !== false && typeof v.focus === 'function') v.focus({ preventScroll: true }); } catch (e) { devWarn('gpudiag', e); }
}

let techRun = 0;
export async function showTechInfo(opts) {
  if (typeof document === 'undefined') return;
  if (!dlg) {
    dlg = document.createElement('div');
    dlg.id = 'gpudiag';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'gpudiag-t');
    dlg.innerHTML = '<div class="gd-box ds-zeef ds-z-kaart ds-z-kaart--recht"><div class="ds-z-kaart__kop"><h2 id="gpudiag-t" class="ds-z-kaart__titel">Technische info</h2></div><pre data-gd-text>Meten, een paar seconden…</pre><div class="gd-row ds-z-kaart__voet"><button type="button" class="ds-z-knop ds-z-knop--secundair" data-gd="close">Sluiten</button><button type="button" class="ds-z-knop" data-gd="copy">Kopiëren</button></div></div>';
    dlg.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-gd]');
      if (!b) return;
      if (b.dataset.gd === 'close') sluitTechInfo();
      else writeClipboard(dlg.querySelector('[data-gd-text]').textContent).then((ok) => { b.textContent = ok ? 'Gekopieerd' : 'Kopiëren lukte niet'; });
    });
    window.addEventListener('keydown', (e) => {
      if (!dlg || dlg.hidden) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.stopImmediatePropagation();
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); if (!e.repeat) sluitTechInfo(); return; }
      if (e.key === 'Tab') { // focusval (aria-modal): Tab blijft binnen de dialoog
        e.preventDefault();
        const knoppen = [...dlg.querySelectorAll('button')];
        const volgende = focusVolgende(knoppen, document.activeElement, e.shiftKey);
        if (volgende) volgende.focus({ preventScroll: true });
        return;
      }
      if (e.key !== 'Enter' && e.key !== ' ') e.preventDefault();
    }, true);
    document.body.appendChild(dlg);
  }
  vorigeFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
  dlg.hidden = false;
  // a token per opening: a measurement that finishes after the dialog was closed or opened again must not touch the clipboard
  const run = ++techRun;
  const pre = dlg.querySelector('[data-gd-text]');
  pre.textContent = 'Meten, een paar seconden…';
  dlg.querySelector('[data-gd="copy"]').textContent = 'Kopiëren';
  dlg.querySelector('[data-gd="copy"]').focus({ preventScroll: true });
  try {
    const text = await techInfoText(opts);
    if (run !== techRun || dlg.hidden) return;
    pre.textContent = text;
    // geen automatische schrijfactie naar het klembord (review 21-11): wat de speler daar had, blijft staan tot hij op Kopiëren klikt
  } catch (e) { if (run === techRun && !dlg.hidden) pre.textContent = `Meten mislukte: ${e && e.message}`; }
}

// main.js calls this once: starts the boot sampler, listens for Ctrl+Shift+G and opens the dialog for ?gpuinfo=1
export function installGpuDiag() {
  if (typeof window === 'undefined') return;
  startRestSampler();
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'G' || e.key === 'g') && !e.repeat) { e.preventDefault(); showTechInfo(); }
  });
  window.__gpuInfo = () => techInfoText();
  if (FLAGS.gpuinfo) setTimeout(showTechInfo, 7000);
}
