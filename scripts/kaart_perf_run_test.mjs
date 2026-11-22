// Kaart-perf 22-11: draait drawOverlayCached (de echte broncode uit mapview.js) DOM-loos met een mock-canvas
// en de state-vorm van de echte kaart, inclusief state.overlay als DOM-element (geen canvas): de vorige
// versie gebruikte state.overlay als cache en liep daardoor vast in compose().
import fs from 'node:fs';
import { overlayPlan } from '../game/js/mapcache.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const bron = fs.readFileSync(new URL('../game/js/mapview.js', import.meta.url), 'utf8');
const haal = (naam) => {
  const start = bron.indexOf(`function ${naam}(`);
  if (start < 0) throw new Error(`${naam} ontbreekt`);
  let diep = 0, eind = -1;
  for (let i = bron.indexOf('{', start); i < bron.length; i++) {
    if (bron[i] === '{') diep++;
    else if (bron[i] === '}' && --diep === 0) { eind = i; break; }
  }
  return bron.slice(start, eind + 1);
};

const calls = { build: 0, draw: [] };
const mkCtx = () => ({
  setTransform() {}, getTransform() { return {}; }, clearRect() {},
  drawImage(...a) { calls.draw.push(a.length); },
});
const mkCanvas = () => { const c = { width: 0, height: 0 }; c.getContext = () => (c.ctx ||= mkCtx()); return c; };

const state = {
  // zoals de echte kaart: overlay is het DOM-element van het scherm
  overlay: { classList: { contains: () => false }, querySelector: () => null },
  compose: Object.assign(mkCanvas(), { width: 800, height: 600 }),
  perf: {}, scale: 2, ox: 10, oy: 20, dpr: 1, cw: 800, ch: 600, baseScale: 1,
};
const document = { createElement: () => mkCanvas() };
const drawStaticOverlay = () => { calls.build++; };
const names = ['sameView', 'saveView', 'drawOverlayCached'];
const F = new Function('state', 'document', 'overlayPlan', 'drawStaticOverlay', `${names.map(haal).join('\n')}\nreturn { ${names.join(', ')} };`)(state, document, overlayPlan, drawStaticOverlay);
const c = mkCtx();

let interim = F.drawOverlayCached(c, true, 1000);
ok(calls.build === 1 && interim === false, 'eerste tekening bouwt de vaste laag', calls.build);
ok(state.overlay.classList && !state.overlay.canvas, 'state.overlay (DOM) blijft onaangeroerd');
ok(state.fixedLayerCache && state.fixedLayerCache.valid, 'cache staat op state.fixedLayerCache');
interim = F.drawOverlayCached(c, false, 1010);
ok(calls.build === 1 && interim === false, 'zelfde beeld, niets vuil: hergebruik');
interim = F.drawOverlayCached(c, true, 1020);
ok(calls.build === 2, 'zelfde beeld, vuil (laag aan/uit): meteen opnieuw');
state.scale = 2.2; state.ox = 5; // zoomstap
interim = F.drawOverlayCached(c, true, 1030);
ok(calls.build === 2 && interim === true, 'zoomstap: tussenbeeld, geen herbouw', calls.build);
interim = F.drawOverlayCached(c, true, 1060);
ok(calls.build === 2 && interim === true, 'tweede stap binnen 120 ms: nog tussenbeeld');
interim = F.drawOverlayCached(c, true, 1300);
ok(calls.build === 3 && interim === false, 'na stilstand: scherp opnieuw');
state.compose.width = 1000;
F.drawOverlayCached(c, true, 1310);
ok(calls.build === 4 && state.fixedLayerCache.canvas.width === 1000, 'andere canvasgrootte: opnieuw');

ok(!/state\.overlay\.(canvas|valid|view|ctx)\b/.test(bron), 'mapview gebruikt state.overlay niet als cache');
console.log(`${n - fails}/${n} kaart_perf_run`);
process.exit(fails ? 1 : 0);
