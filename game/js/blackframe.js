// Black-frame check for testers and perf runs (?zwartcheck, or
// window.__blackCheck = true from a script). At the end of a rAF in which the
// city was drawn, a 4x4 patch at the centre and near each corner of the
// canvas is read back; when all five are black, the frame about to be shown
// is black and the error log gets an entry with what the renderer did just
// before (resizes, post-chain rebuilds, quality steps, context events) and
// any dark full-screen overlay at the centre. readPixels waits for the GPU
// to finish the frame (40-80 ms at Hoog on an M1), so it samples every frame
// right after an event and otherwise one frame every 2 s.
import { logError } from './errorlog.js';
import { FLAGS } from './devflags.js';

const EVENT_WINDOW_MS = 1500;
const EVERY = 120;
const events = [];
let n = 0, seen = 0;
const px = new Uint8Array(4 * 4 * 4);

const enabledByUrl = FLAGS.zwartcheck;
const enabled = () => enabledByUrl || (typeof window !== 'undefined' && !!window.__blackCheck);

// Lost WebGL contexts show as a black or frozen view; the error log keeps
// them so a tester's report says so.
export function watchContext(canvas, name) {
  canvas.addEventListener('webglcontextlost', (e) => {
    noteGfxEvent(`context verloren (${name})`);
    logError('error', `WebGL-context verloren (${name})${e.statusMessage ? ': ' + e.statusMessage : ''}`);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    noteGfxEvent(`context terug (${name})`);
    logError('warn', `WebGL-context hersteld (${name})`);
  });
  canvas.addEventListener('webglcontextcreationerror', (e) => {
    logError('error', `WebGL-context niet aangemaakt (${name})${e.statusMessage ? ': ' + e.statusMessage : ''}`);
  });
}

// Renderer-side events worth knowing about when a frame turns out black.
export function noteGfxEvent(what) {
  events.push([performance.now(), what]);
  if (events.length > 24) events.shift();
}

function recentEvents(now) {
  return events.filter((e) => now - e[0] < EVENT_WINDOW_MS).map((e) => `${e[1]} (${Math.round(now - e[0])} ms)`);
}

function patchBlack(gl, x, y) {
  gl.readPixels(x, y, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, px);
  for (let i = 0; i < px.length; i += 4) if (px[i] > 6 || px[i + 1] > 6 || px[i + 2] > 6) return false;
  return true;
}

// A dark element over most of the view at the centre (fades, cards).
function darkOverlay() {
  const els = document.elementsFromPoint(innerWidth / 2, innerHeight / 2);
  for (const el of els) {
    if (el.id === 'game3d') return '';
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.9 || r.height < innerHeight * 0.9) continue;
    let op = 1;
    for (let a = el; a && a !== document.body; a = a.parentElement) op *= Number(getComputedStyle(a).opacity);
    const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/.exec(getComputedStyle(el).backgroundColor);
    if (!m) continue;
    const alpha = (m[4] === undefined ? 1 : Number(m[4])) * op;
    if (alpha > 0.6 && Math.max(+m[1], +m[2], +m[3]) < 40) return `${el.id ? '#' + el.id : el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : ''} ${alpha.toFixed(2)}`;
  }
  return '';
}

// End of a main-loop rAF. drawn: the scene was rendered to the canvas this
// frame. state(): a short description of the renderer settings.
export function checkFrame(renderer, drawn, state) {
  if (!enabled() || !renderer) return;
  const now = performance.now();
  const fresh = events.length && now - events[events.length - 1][0] < 120;
  if (!document.body.classList.contains('game-started')) return;
  if ((++n % EVERY) && !fresh) return;
  const overlay = darkOverlay();
  if (overlay) report(`zwart beeld door overlay ${overlay}`, state, now);
  // after compositing the canvas reads back empty: only frames drawn now
  if (!drawn) return;
  const gl = renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  if (w < 16 || h < 16) return;
  const ix = Math.round(w * 0.08), iy = Math.round(h * 0.08);
  const spots = [[w / 2 - 2, h / 2 - 2], [ix, iy], [w - ix - 4, iy], [ix, h - iy - 4], [w - ix - 4, h - iy - 4]];
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  let black = true;
  for (const [x, y] of spots) if (!patchBlack(gl, Math.round(x), Math.round(y))) { black = false; break; }
  renderer.setRenderTarget(prev);
  if (black) report('zwart frame', state, now);
}

function report(what, state, now) {
  seen++;
  const ev = recentEvents(now);
  let st = '';
  try { st = state(); } catch (e) { st = '?'; }
  const msg = `${what} · ${st}${ev.length ? ' · net ervoor: ' + ev.join(', ') : ''}`;
  if (typeof window !== 'undefined') (window.__blackFrames || (window.__blackFrames = [])).push({ t: Math.round(now), msg });
  // the error log groups identical messages; the timings would split them
  logError('warn', `${what} · ${st}${ev.length ? ' · net ervoor: ' + events.filter((e) => now - e[0] < EVENT_WINDOW_MS).map((e) => e[1]).join(', ') : ''}`);
}

export const blackFramesSeen = () => seen;
