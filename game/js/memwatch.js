// Geheugenbewaking (#1004): goedkope tellers voor de technische info (Ctrl+Shift+G, gpudiag.js), zodat Nikky of de eigenaar
// een hoge heap kan melden met cijfers: heappiek, groei per minuut, geladen tegels, audiobuffers, texturen en geometrieen.
// Zuiver en zonder DOM: modules die geheugen vasthouden melden zich met registerMemSource(naam, () => ({ ... })); gpudiag.js leest ze.
// Kosten: een performance.memory-lezing elke 5 s (due/note; gpudiag.js leest pas als due() waar is, en bij een hapering) en niets per beeld. scripts/memwatch_test.mjs bewaakt de rekenkunde.

const sources = new Map();
export function registerMemSource(name, fn) { if (typeof fn === 'function') sources.set(name, fn); }
export function memSources() {
  const out = {};
  for (const [k, fn] of sources) { try { out[k] = fn(); } catch (e) { out[k] = null; } }
  return out;
}

export const MEM_EVERY_MS = 5000;
export const MEM_KEEP = 120;   // 120 metingen van 5 s: de laatste 10 minuten

// De heapreeks: piek sinds de start en de groei over het venster (kleinste kwadraten, MB per minuut).
// Een GC laat de lijn zagen; de helling over 10 minuten zegt of het bodemniveau stijgt (een lek) of niet.
export function createHeapTracker({ keep = MEM_KEEP } = {}) {
  const pts = [];   // [tSeconden, MB]
  let peak = 0, lastAt = -Infinity;
  const floor = [];  // het laagste punt per blok van 12 metingen (een minuut) (een goede schatting van de levende heap)
  return {
    // is er weer een meting aan de beurt? Laat de aanroeper performance.memory dan pas lezen (niets per beeld lezen).
    due(tMs) { return Number.isFinite(tMs) && tMs - lastAt >= MEM_EVERY_MS; },
    note(tMs, usedMB) {
      if (!(usedMB > 0) || !Number.isFinite(usedMB) || !Number.isFinite(tMs)) return false;
      if (tMs - lastAt < MEM_EVERY_MS) return false;
      lastAt = tMs;
      peak = Math.max(peak, usedMB);
      pts.push([tMs / 1000, usedMB]);
      while (pts.length > keep) pts.shift();
      return true;
    },
    snapshot() {
      const n = pts.length;
      const now = n ? pts[n - 1][1] : 0;
      floor.length = 0;
      for (let i = 0; i < n; i += 12) floor.push(Math.min(...pts.slice(i, i + 12).map((p) => p[1])));
      let slope = 0;
      if (floor.length >= 3) {
        // helling van de bodemlijn in MB per minuut (blok = 1 minuut)
        const m = floor.length, mx = (m - 1) / 2, my = floor.reduce((a, b) => a + b, 0) / m;
        let num = 0, den = 0;
        for (let i = 0; i < m; i++) { num += (i - mx) * (floor[i] - my); den += (i - mx) * (i - mx); }
        slope = den ? (num / den) : 0;
      }
      return { n, nowMB: now, peakMB: peak, floorMB: floor.length ? Math.min(...floor) : 0, slopePerMin: slope, spanS: n > 1 ? pts[n - 1][0] - pts[0][0] : 0 };
    },
  };
}

const f0 = (v) => (Number.isFinite(v) ? String(Math.round(v)) : '-');
const f1 = (v) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1) : '-');
const MB = (b) => (Number.isFinite(b) ? f1(b / 1048576) : '-');

// Het tekstblok voor de technische info. m: { heap: { usedMB, totalMB, limitMB, tracker }, render: { geometries, textures, programs },
// src: memSources() }. Elke ontbrekende bron geeft een streepje, nooit een fout of NaN.
export function formatMemBlock(m) {
  const x = m || {};
  const h = x.heap || {}, t = h.tracker || {}, r = x.render || {}, s = x.src || {};
  const out = ['[Geheugen]'];
  out.push(`JS-heap nu: ${f0(h.usedMB)} MB van ${f0(h.totalMB)} MB gereserveerd (limiet ${f0(h.limitMB)} MB)`);
  if (t.n) out.push(`Heappiek sinds de start: ${f0(t.peakMB)} MB; bodem (levend na opruimen, laatste ${f0((t.spanS || 0) / 60)} min): ${f0(t.floorMB)} MB; trend ${t.slopePerMin >= 0 ? '+' : ''}${f1(t.slopePerMin)} MB/min`);
  out.push(`Texturen en geometrieen in de GPU-lijst: ${f0(r.textures)} texturen, ${f0(r.geometries)} geometrieen, ${f0(r.programs)} shaders`);
  const a = s.audio;
  if (a) out.push(`Audio: ${f0(a.buffers)} klanken gedecodeerd (${MB(a.bytes)} MB), ${f0(a.uit)} opgeruimd, scenariomuziek ${MB(a.scenarioBytes)} MB`);
  const ti = s.tiles;
  if (ti) out.push(`Tegels: ${f0(ti.resident)} geladen (${MB(ti.bytes)} MB ruw), ${f0(ti.loads)} geladen sinds de start, ${f0(ti.evictions)} vrijgegeven`);
  for (const [k, v] of Object.entries(s)) {
    if (k === 'audio' || k === 'tiles' || !v || typeof v !== 'object') continue;
    out.push(`${k}: ${Object.entries(v).map(([a2, b]) => `${a2} ${Number.isFinite(b) ? f1(b) : b}`).join(', ')}`);
  }
  return out.join('\n');
}
