// Opt-in frame-time probe for hunting hitches: load with ?hitch (or set
// window.__hitchOn = true before boot). Every frame is split into named
// sections; slow frames keep their breakdown plus the shader programs the
// renderer created in them. A long gap between two frames with little CPU
// in the second usually belongs to GPU work submitted by the first, so a
// slow gap reports the previous frame's breakdown. Read window.__hitch.

import { FLAGS } from './devflags.js';
import { latencyStats } from './benchstats.js';

const SLOW_MS = 40;
const KEEP = 300;

const enabled = FLAGS.hitch || !!globalThis.__hitchOn;

let t0 = 0;
let tLast = 0;
let rafPrev = 0;
let sections = [];
let programs = [];
let prev = null;
let renderer = null;
let mem0 = null;
const gaps = [];
// button-to-frame latency (#216 / G28): the real key press to the end of the frame that handled it
const latencies = [];
let inputAt = 0;
const slow = [];
const allPrograms = [];
// ms per section summed over every frame (gl:* overlaps the section it ran in)
const totals = new Map();
let totalFrames = 0;
// per section: [max ms in one frame, frames with >= 8 ms]
const peaks = new Map();

function topSections(list) {
  return list.filter((s) => s[1] > 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, ms]) => `${l} ${ms.toFixed(1)}`);
}

export const probe = {
  on: enabled,
  begin(now) {
    if (!enabled) return;
    const gap = rafPrev ? now - rafPrev : 0;
    if (rafPrev) gaps.push(gap);
    if (gaps.length > 20000) gaps.splice(0, 10000);
    rafPrev = now;
    if (prev && gap > SLOW_MS * 1.5 && prev.cpu < gap * 0.6) {
      slow.push({ ...prev, gap: +gap.toFixed(1), kind: 'gap' });
      if (slow.length > KEEP) slow.shift();
    }
    t0 = tLast = performance.now();
    sections = [];
    programs = [];
    mem0 = renderer ? [renderer.info.memory.geometries, renderer.info.memory.textures] : null;
  },
  setRenderer(r) {
    renderer = r;
    if (enabled) wrapGL(r.getContext());
  },
  mark(label) {
    if (!enabled) return;
    const t = performance.now();
    sections.push([label, t - tLast]);
    tLast = t;
  },
  // #804: begin een nieuw (genest) meetblok zonder de tijd sinds de vorige
  // mark aan dat blok toe te rekenen; daarna markeer je de fasen gewoon.
  split() {
    if (!enabled) return;
    tLast = performance.now();
  },
  // called by scene3d for every shader program three.js creates
  program(p) {
    if (!enabled) return;
    const key = p.cacheKey || '';
    const rec = { at: +(performance.now() / 1000).toFixed(2), name: `${p.type || '?'} ${key.slice(-24)}`, p };
    if (p.type === 'MeshDepthMaterial' || p.type === 'MeshDistanceMaterial') {
      rec.name += ' @' + (new Error().stack || '').split('\n').slice(3, 9).map((l) => l.trim().replace(/^at /, '').replace(/\(.*\/(\w+\.js):(\d+):\d+\)/, '$1:$2')).join(' < ');
    }
    programs.push(rec);
    allPrograms.push(rec);
  },
  // who owns the programs / slow uploads of this frame (hitch mode only, slow)
  identify(scene) {
    if (!enabled || !renderer) return;
    if (glBig.length) {
      const want = new Map(glBig.map((u) => [u.data, u]));
      scene.traverse((o) => {
        const g = o.geometry;
        if (!g) return;
        const attrs = [...Object.entries(g.attributes), ['index', g.index]];
        if (o.isInstancedMesh) attrs.push(['instanceMatrix', o.instanceMatrix], ['instanceColor', o.instanceColor]);
        for (const [n, a] of attrs) {
          const u = a && want.get(a.array);
          if (!u || u.who) continue;
          let p = o, label = '';
          while (p && !label) { label = (p.userData && (p.userData.kind || p.userData.type)) || p.name || ''; p = p.parent; }
          u.who = `${o.type}.${n} ${label}`;
        }
      });
    }
    if (!programs.length) return;
    const want = new Map(programs.map((r) => [r.p, r]));
    scene.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        const pr = renderer.properties.get(m);
        const hit = pr && pr.programs && [...pr.programs.values()].find((x) => want.has(x));
        if (!hit) continue;
        const r = want.get(hit);
        if (r.who) continue;
        let a = o, label = '';
        while (a && !label) { label = (a.userData && (a.userData.kind || a.userData.type || a.userData.propKind)) || a.name || ''; a = a.parent; }
        r.who = `${o.type}/${m.type}${m.name ? ':' + m.name : ''} ${label}${o.visible ? '' : ' (hidden)'}`;
      }
    });
  },
  // called for a real key press (input.js)
  input() {
    if (enabled && !inputAt) inputAt = performance.now();
  },
  end() {
    if (!enabled) return;
    if (inputAt) {
      latencies.push(performance.now() - inputAt);
      if (latencies.length > 5000) latencies.splice(0, 2500);
      inputAt = 0;
    }
    const cpu = +(performance.now() - t0).toFixed(1);
    const at = +(performance.now() / 1000).toFixed(2);
    const inFrame = new Map();
    for (const [l, ms] of sections) { totals.set(l, (totals.get(l) || 0) + ms); inFrame.set(l, (inFrame.get(l) || 0) + ms); }
    for (const [l, ms] of inFrame) {
      const pk = peaks.get(l) || peaks.set(l, [0, 0]).get(l);
      if (ms > pk[0]) pk[0] = ms;
      if (ms >= 8) pk[1]++;
    }
    totals.set('frame', (totals.get('frame') || 0) + cpu);
    totalFrames++;
    for (const k in glTime) {
      if (glTime[k]) totals.set('gl:' + k, (totals.get('gl:' + k) || 0) + glTime[k]);
      if (glTime[k] > 2) sections.push(['gl:' + k, glTime[k]]);
      glTime[k] = 0;
    }
    prev = { at, cpu, top: topSections(sections), programs: programs.length ? programs.slice(0, 8).map((r) => r.who || r.name) : undefined };
    if (glBig.length) { prev.uploads = glBig.slice(0, 4).map((u) => u.label + (u.who ? ' ' + u.who : '')); glBig.length = 0; }
    if (mem0) {
      const dg = renderer.info.memory.geometries - mem0[0], dt = renderer.info.memory.textures - mem0[1];
      if (dg) prev.geo = dg;
      if (dt) prev.tex = dt;
    }
    if (cpu >= SLOW_MS) {
      slow.push({ ...prev, kind: 'cpu' });
      if (slow.length > KEEP) slow.shift();
    }
  },
};

// Time spent inside the GL calls that can block (uploads, shader status
// queries, draws), summed per frame and shown as gl:* sections.
const glTime = {};
const glBig = [];
const GL_CALLS = ['texImage2D', 'texSubImage2D', 'texStorage2D', 'generateMipmap', 'bufferData', 'bufferSubData', 'compileShader', 'linkProgram',
  'getProgramParameter', 'getShaderParameter', 'getProgramInfoLog', 'getShaderInfoLog', 'getUniformLocation', 'getActiveUniform', 'getActiveAttrib',
  'getAttribLocation', 'drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'readPixels', 'clear', 'useProgram', 'blitFramebuffer'];
function wrapGL(gl) {
  if (!gl || gl.__probed) return;
  gl.__probed = true;
  for (const name of GL_CALLS) {
    const fn = gl[name];
    if (typeof fn !== 'function') continue;
    const key = name.startsWith('draw') ? 'draw' : name;
    glTime[key] = 0;
    const upload = name === 'bufferData' || name === 'bufferSubData';
    gl[name] = function (...args) {
      const t = performance.now();
      const r = fn.apply(gl, args);
      const ms = performance.now() - t;
      glTime[key] += ms;
      if (upload && ms > 4) {
        const data = args[name === 'bufferData' ? 1 : 2];
        glBig.push({ label: `${name} ${data && data.byteLength !== undefined ? Math.round(data.byteLength / 1024) + 'KB' : data} ${ms.toFixed(0)}ms`, data });
      }
      return r;
    };
  }
}

function summary() {
  const g = gaps.slice().sort((a, b) => a - b);
  const q = (p) => (g.length ? +g[Math.min(g.length - 1, Math.floor(g.length * p))].toFixed(1) : 0);
  const over = (ms) => gaps.filter((x) => x > ms).length;
  return {
    frames: g.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1),
    over50: over(50), over100: over(100), over200: over(200),
    over33: over(33.4),
    latency: latencyStats(latencies),
    slow: slow.slice(),
    sections: Object.fromEntries([...totals].sort((a, b) => b[1] - a[1]).map(([l, ms]) => [l, +(ms / Math.max(1, totalFrames)).toFixed(2)])),
    peaks: Object.fromEntries([...peaks].filter(([, v]) => v[0] >= 4).map(([l, v]) => [l, [+v[0].toFixed(1), v[1]]])),
    programs: allPrograms.map((r) => ({ at: r.at, name: r.who || r.name, key: r.p.cacheKey })),
  };
}

if (enabled) {
  globalThis.__hitch = {
    summary,
    reset() { totals.clear(); peaks.clear(); totalFrames = 0; gaps.length = 0; latencies.length = 0; inputAt = 0; slow.length = 0; allPrograms.length = 0; rafPrev = 0; prev = null; },
  };
}
