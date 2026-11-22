// Kaart-perf 22-11: node-microbench van de tekenkadans van de volledige kaart, zonder Electron.
// Modelleert wat mapview.js per frame doet (compose -> vaste laag) bij zoomniveaus 1..8: een wielzoom-
// burst en een pan-sleep per niveau, op 60 fps. Telt hoe vaak de dure vaste laag (labels, straatnamen,
// pictogrammen, botsingsregel) opnieuw gebouwd wordt, VOOR (elke compose) en NA (overlayPlan met debounce),
// en hoeveel measureText-aanroepen de breedtecache uitspaart op een label-set van de kaart.
// Gebruik: node scripts/perf/kaart_perf_bench.mjs [--json]
import { overlayPlan, OVERLAY_SETTLE_MS } from '../../game/js/mapcache.js';

const FRAME = 1000 / 60;

function simulate(useCache) {
  const out = { builds: 0, interim: 0, reuse: 0, composes: 0 };
  let now = 0, view = 0, seen = -1, movedAt = 0, ovView = -1, valid = false, dirty = true;
  const frame = (moving) => {
    now += FRAME;
    if (moving) { view++; dirty = true; }
    if (!dirty) return;
    out.composes++;
    if (!useCache) { out.builds++; dirty = false; return; }
    if (seen !== view) { seen = view; movedAt = now; }
    const plan = overlayPlan({ valid, sameView: ovView === view, wasDirty: dirty && ovView === view, sameBase: true, sinceMoveMs: now - movedAt });
    if (plan === 'build') { out.builds++; valid = true; ovView = view; dirty = false; }
    else if (plan === 'interim') { out.interim++; dirty = true; } // een scherpe herschil volgt
    else { out.reuse++; dirty = false; }
  };
  for (let level = 1; level <= 8; level++) {
    for (let i = 0; i < 6; i++) frame(true);        // wielzoom-burst (6 stappen)
    for (let i = 0; i < 30; i++) frame(false);      // stilstand (~500 ms)
    for (let i = 0; i < 30; i++) frame(true);       // pan-sleep (30 frames)
    for (let i = 0; i < 30; i++) frame(false);
  }
  return out;
}

// breedtecache: dezelfde labels bij elke herschil (de kaart legt per zoomstap ~300 labels)
function measureBench(cache) {
  let calls = 0;
  const ctx = { font: '12px x', measureText: (t) => { calls++; return { width: t.length * 6 }; } };
  const m = new Map();
  const labels = Array.from({ length: 300 }, (_, i) => `PLAATSNAAM ${i}`);
  for (let pass = 0; pass < 8; pass++) {
    for (const t of labels) {
      if (!cache) { ctx.measureText(t).width; continue; }
      const k = ctx.font + '|' + t;
      if (!m.has(k)) m.set(k, ctx.measureText(t).width);
    }
  }
  return calls;
}

const before = simulate(false), after = simulate(true);
const mb = measureBench(false), ma = measureBench(true);
const r = { settleMs: OVERLAY_SETTLE_MS, before, after, measureText: { before: mb, after: ma } };
if (process.argv.includes('--json')) console.log(JSON.stringify(r));
else {
  console.log(`vaste laag opnieuw gebouwd, 8 zoomniveaus (wielzoom + pan): voor ${before.builds}, na ${after.builds} (tussenbeeld ${after.interim}x geschaald, hergebruik ${after.reuse}x)`);
  console.log(`measureText per 8 herschilderingen van 300 labels: voor ${mb}, na ${ma}`);
}
