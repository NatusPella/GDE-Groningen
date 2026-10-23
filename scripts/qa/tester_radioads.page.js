// Page half van scripts/qa/tester_bugs.mjs --check=radioads (#409): een reclameblok van de radio echt afspelen.
// Meet: de ondertitel (#radio-sub: tekst, firma, doorzichtigheid, plek op het scherm), de jingle (korte blokgolftonen op de
// stingbus) en het gemurmel van de stationsstem (driehoekstonen van 100 tot 320 Hz), en of de ondertitel na het blok weer weg is.
// Bewaart drie beelden met [capture]. Draait met GDE_MENU_TEST=1 en --audio-graph.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d && window.__radio); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const cine = await import('/js/cinematics.js');
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120; i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { if (window.__menuStart) window.__menuStart('nieuw'); else key('Enter', 'Enter'); await sleep(2500); if (!ss.classList.contains('visible')) break; } else await sleep(500);
}
for (let i = 0; i < 400; i++) { if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(150); if (i > 60 && !cine.isCinematicActive()) break; }
await sleep(4000);
w.devInvuln = true; w.clock = 13;
const lastSet = new WeakMap();
const origSet = AudioParam.prototype.setValueAtTime;
AudioParam.prototype.setValueAtTime = function (v, t) { try { lastSet.set(this, v); } catch (e) { /* meting */ } return origSet.call(this, v, t); };
const tones = { square: 0, mumble: 0 };
const origStart = OscillatorNode.prototype.start;
OscillatorNode.prototype.start = function (...a) {
  try { const f = lastSet.has(this.frequency) ? lastSet.get(this.frequency) : this.frequency.value; if (this.type === 'square' && f > 400 && f < 1200) tones.square++; if (this.type === 'triangle' && f > 80 && f < 320) tones.mumble++; } catch (e) { /* meting */ }
  return origStart.apply(this, a);
};
const shown = [];
const t0 = performance.now();
const poll = setInterval(() => {
  const el = document.getElementById('radio-sub');
  if (!el) return;
  const line = el.querySelector('.rs-line').textContent, firma = el.querySelector('.rs-firma').textContent, op = +getComputedStyle(el).opacity;
  const last = shown[shown.length - 1];
  if (op > 0.5 && line && (!last || last.tekst !== line)) { const r = el.getBoundingClientRect(); shown.push({ t: +((performance.now() - t0) / 1000).toFixed(1), firma, tekst: line, x: Math.round(r.x), y: Math.round(r.y), b: Math.round(r.width), h: Math.round(r.height), vensterH: innerHeight, vensterB: innerWidth }); }
}, 150);
const queued = window.__radio.adBlock();
const result = { regels: queued, voor: window.__radio.ads() };
let cap = 0;
for (let i = 0; i < 160; i++) {
  await sleep(250);
  if (shown.length > cap && cap < 3) { cap++; await sleep(300); console.log('[capture] reclame-' + cap); }
  if (!window.__radio.queue().length && !window.__radio.inBreak() && i > 8) break;
}
await sleep(1500);
clearInterval(poll);
const el = document.getElementById('radio-sub');
result.getoond = shown;
result.jingleTonen = tones.square;
result.murmelTonen = tones.mumble;
result.na = { ondertitelOpacity: el ? +getComputedStyle(el).opacity : null, wachtrij: window.__radio.queue().length, ads: window.__radio.ads() };
return JSON.stringify({ results: { radioads: result } });
