// Lekbewaking (#1065) voor de technische info (Ctrl+Shift+G): goedkope tellers voor wat bij een lek blijft stijgen, met een alarm als een
// teller na het opwarmen blijft klimmen: GPU-lijst (geometrieen, texturen, shaders), DOM-knopen, luisteraars, timers, Web Audio-knopen,
// WebRTC-verbindingen en de fouten van de veilige updatelus (framesafe.js). Een lek is wat na een minuut of tien niet meer terugkomt;
// de tracker kijkt naar het laagste punt per blok (zoals memwatch.js voor de heap) en geeft alleen alarm bij een aanhoudende stijging.
// Het zuivere deel (createLeakWatch, formatLeakBlock) heeft geen DOM; installLeakProbes zet de tellers op de browser-API's en doet
// niets buiten de browser. Kosten: een telling per addEventListener/setTimeout, een meting per 5 s. scripts/leakwatch_test.mjs bewaakt het.

export const LEAK_EVERY_MS = 5000;
const LEAK_KEEP = 360;          // 360 metingen van 5 s: het laatste halfuur
const LEAK_WARM_S = 180;        // de eerste 3 minuten stijgen caches en tegels vanzelf
const LEAK_BLOCK = 12;          // een blok is een minuut
const LEAK_MIN_BLOCKS = 4;      // ten minste vier minuten na het opwarmen voor een oordeel

// De tellers waarvan een aanhoudende stijging verdacht is (de rest wordt alleen getoond).
const LEAK_WATCHED = ['geometries', 'textures', 'programs', 'domNodes', 'listeners', 'timers', 'intervals', 'peerConns'];

// Stijgt reeks `floor` (laagste punt per minuut) aanhoudend? Elke stap hoogstens een afwijking van -1, en de totale stijging is
// minstens 5 stuks en 5% van het begin.
export function risingFloor(floor) {
  if (floor.length < LEAK_MIN_BLOCKS) return false;
  let up = 0;
  for (let i = 1; i < floor.length; i++) { if (floor[i] < floor[i - 1] - 1) return false; if (floor[i] > floor[i - 1]) up++; }
  const first = floor[0], last = floor[floor.length - 1];
  return up >= floor.length - 2 && last - first >= Math.max(5, first * 0.05);
}

export function createLeakWatch({ keep = LEAK_KEEP, warmS = LEAK_WARM_S } = {}) {
  const rows = [];   // [tSeconden, { naam: waarde }]
  let lastAt = -Infinity, t0 = null;
  return {
    note(tMs, counts) {
      if (!Number.isFinite(tMs) || !counts || tMs - lastAt < LEAK_EVERY_MS) return false;
      lastAt = tMs;
      if (t0 === null) t0 = tMs;
      const row = {};
      for (const [k, v] of Object.entries(counts)) if (Number.isFinite(v) && v >= 0) row[k] = v;
      rows.push([(tMs - t0) / 1000, row]);
      while (rows.length > keep) rows.shift();
      return true;
    },
    snapshot() {
      const names = new Set();
      for (const [, r] of rows) for (const k of Object.keys(r)) names.add(k);
      const out = { n: rows.length, spanS: rows.length > 1 ? rows[rows.length - 1][0] - rows[0][0] : 0, metrics: {}, alarms: [] };
      for (const k of names) {
        const all = rows.filter(([, r]) => k in r);
        const after = all.filter(([t]) => t >= warmS).map(([, r]) => r[k]);
        const floor = [];
        for (let i = 0; i + LEAK_BLOCK <= after.length; i += LEAK_BLOCK) floor.push(Math.min(...after.slice(i, i + LEAK_BLOCK)));
        const now = all.length ? all[all.length - 1][1][k] : 0;
        const rising = LEAK_WATCHED.includes(k) && risingFloor(floor);
        const per10 = floor.length >= 2 ? ((floor[floor.length - 1] - floor[0]) / (floor.length - 1)) * 10 : 0;
        out.metrics[k] = { now, first: all.length ? all[0][1][k] : 0, max: all.reduce((m, [, r]) => Math.max(m, r[k]), 0), floor: floor.length ? floor[floor.length - 1] : null, per10, rising };
        if (rising) out.alarms.push(k);
      }
      return out;
    },
    reset() { rows.length = 0; lastAt = -Infinity; t0 = null; },
  };
}

const NAMES = {
  geometries: 'geometrieen', textures: 'texturen', programs: 'shaders', domNodes: 'DOM-knopen', listeners: 'luisteraars', timers: 'timers (setTimeout)',
  intervals: 'intervallen', audioNodes: 'audioknopen aangemaakt', peerConns: 'WebRTC-verbindingen', sceneNodes: 'scene-objecten', frameFouten: 'fouten in de updatelus',
  partsCache: 'gebouwdelen in de cache',
};
const f0 = (v) => (Number.isFinite(v) ? String(Math.round(v)) : '-');

// Tekstblok voor de technische info. snap: createLeakWatch().snapshot(); frame: createFrameGuard().snapshot() (mag ontbreken).
export function formatLeakBlock(snap, frame) {
  const out = ['[Lekbewaking]'];
  if (!snap || !snap.n) { out.push('Nog geen metingen (een meting per 5 s).'); return out.join('\n'); }
  out.push(`Metingen: ${snap.n} over ${f0(snap.spanS / 60)} min; alarm pas na ${f0(LEAK_WARM_S / 60)} min opwarmen en ${LEAK_MIN_BLOCKS} minuten vergelijken`);
  for (const [k, m] of Object.entries(snap.metrics)) {
    const trend = m.floor === null ? '' : `, bodem ${f0(m.floor)}, ${m.per10 >= 0 ? '+' : ''}${(Math.round(m.per10 * 10) / 10).toFixed(1)} per 10 min`;
    out.push(`${NAMES[k] || k}: ${f0(m.now)} nu (begin ${f0(m.first)}, hoogste ${f0(m.max)}${trend})${m.rising ? '  ALARM: blijft stijgen' : ''}`);
  }
  if (snap.alarms.length) out.push(`ALARM: ${snap.alarms.map((k) => NAMES[k] || k).join(', ')} stijgt aanhoudend: meld dit met deze tekst (mogelijk een lek).`);
  if (frame && frame.total > 0) {
    out.push(`Updatelus: ${frame.total} fouten opgevangen, het beeld liep door`);
    for (const e of frame.by.slice(0, 5)) out.push(`  ${e.name}: ${e.n}x, laatste: ${e.last}`);
  }
  return out.join('\n');
}

// --- browsertellers ------------------------------------------------------------------------------------------------------------------

const probe = { listeners: 0, timers: new Set(), intervals: new Set(), audioNodes: 0, pcs: [], on: false };
export function probeCounts() {
  const pcs = probe.pcs.filter((w) => { const p = w.deref(); return p && p.connectionState !== 'closed'; });
  probe.pcs = pcs;
  return { listeners: Math.max(0, probe.listeners), timers: probe.timers.size, intervals: probe.intervals.size, audioNodes: probe.audioNodes, peerConns: pcs.length };
}

// Zet de tellers op de browser-API's; één keer per pagina. Opties met once of signal tellen niet mee (ze ruimen zichzelf op).
export function installLeakProbes(g = typeof globalThis !== 'undefined' ? globalThis : null) {
  if (!g || probe.on || !g.EventTarget || !g.EventTarget.prototype) return false;
  probe.on = true;
  const ET = g.EventTarget.prototype, add = ET.addEventListener, rem = ET.removeEventListener;
  const plain = (o) => !(o && typeof o === 'object' && (o.once || o.signal));
  ET.addEventListener = function (type, fn, opts) { if (fn && plain(opts)) probe.listeners++; return add.call(this, type, fn, opts); };
  ET.removeEventListener = function (type, fn, opts) { if (fn) probe.listeners--; return rem.call(this, type, fn, opts); };
  if (typeof g.setTimeout === 'function' && typeof g.clearTimeout === 'function') {
    const st = g.setTimeout, ct = g.clearTimeout;
    g.setTimeout = function (fn, ms, ...a) {
      if (typeof fn !== 'function') return st.call(this, fn, ms, ...a);
      let id;
      id = st.call(this, function () { probe.timers.delete(id); return fn.apply(this, arguments); }, ms, ...a);
      probe.timers.add(id);
      return id;
    };
    g.clearTimeout = function (id) { probe.timers.delete(id); return ct.call(this, id); };
  }
  if (typeof g.setInterval === 'function' && typeof g.clearInterval === 'function') {
    const si = g.setInterval, ci = g.clearInterval;
    g.setInterval = function (...a) { const id = si.apply(this, a); probe.intervals.add(id); return id; };
    g.clearInterval = function (id) { probe.intervals.delete(id); return ci.call(this, id); };
  }
  const BAC = g.BaseAudioContext && g.BaseAudioContext.prototype;
  if (BAC) {
    for (const k of Object.getOwnPropertyNames(BAC)) {
      if (!/^create(Oscillator|BufferSource|Gain|StereoPanner|Panner|BiquadFilter|DynamicsCompressor|MediaElementSource|ConstantSource|Convolver|Delay|WaveShaper|Analyser)$/.test(k) || typeof BAC[k] !== 'function') continue;
      const orig = BAC[k];
      BAC[k] = function (...a) { probe.audioNodes++; return orig.apply(this, a); };
    }
  }
  if (typeof g.RTCPeerConnection === 'function' && typeof g.WeakRef === 'function' && typeof g.Proxy === 'function') {
    g.RTCPeerConnection = new g.Proxy(g.RTCPeerConnection, { construct(T, args, nt) { const p = Reflect.construct(T, args, nt); probe.pcs.push(new g.WeakRef(p)); return p; } });
  }
  return true;
}

// De tellers voor de tracker. g: window (of een mock).
export function collectLeakCounts(g, { frame = null, extra = null } = {}) {
  const out = { ...probeCounts() };
  try {
    const s = g && g.__scene3d;
    const info = s && s.renderer && s.renderer.info;
    if (info) { out.geometries = info.memory.geometries; out.textures = info.memory.textures; out.programs = info.programs ? info.programs.length : 0; }
    if (s && s.scene && typeof s.scene.children === 'object') out.sceneNodes = s.scene.children.length;
  } catch (e) { /* geen renderer */ }
  try { const d = g && g.document; if (d && d.getElementsByTagName) out.domNodes = d.getElementsByTagName('*').length; } catch (e) { /* geen DOM */ }
  if (frame) out.frameFouten = frame.total;
  if (extra) Object.assign(out, extra);
  return out;
}
