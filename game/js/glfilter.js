import { perfOff } from './devflags.js';

// Redundant GL calls left out (#246). Every call of the WebGL context is a command that the renderer's main thread writes to the GPU process,
// and a texture that three.js uploads every frame (the bone textures of the ~70 people in view) sets the same pixel-store and sampler
// parameters again at each upload: 131 `pixelStorei` and 131 `texParameteri` calls a frame, ~9 per cent of the main pass's GL calls
// (scripts/perf glcalls). The filter keeps what the context was last told and skips a call that would tell it the same again:
// - pixelStorei: per parameter, the last value (global state of the context);
// - texParameteri: per texture object and parameter, the last value (sampler state belongs to the texture; the filter follows which texture
//   is bound on the active unit through activeTexture and bindTexture).
// A lost context forgets all of it. ?perfoff=glfilter passes everything through (A/B runs).

const MAX_UNITS = 64;

export function installGlFilter(gl) {
  if (gl.__glFilter) return gl.__glFilter;
  const pass = {
    activeTexture: gl.activeTexture.bind(gl),
    bindTexture: gl.bindTexture.bind(gl),
    texParameteri: gl.texParameteri.bind(gl),
    pixelStorei: gl.pixelStorei.bind(gl),
  };
  const bound = Array.from({ length: MAX_UNITS }, () => new Map()); // unit -> target -> texture
  let params = new WeakMap(); // texture -> pname -> value
  const store = new Map(); // pixelStorei: pname -> value
  let unit = 0;
  const stats = { skippedPixelStore: 0, skippedTexParameter: 0 };
  const base = gl.TEXTURE0;

  gl.activeTexture = (u) => { unit = u - base; return pass.activeTexture(u); };
  gl.bindTexture = (target, tex) => { if (unit >= 0 && unit < MAX_UNITS) bound[unit].set(target, tex); return pass.bindTexture(target, tex); };
  // what was told is always noted, also while the filter is switched off (?perfoff=glfilter), so that switching it on never trusts a stale note
  gl.texParameteri = (target, pname, value) => {
    if (unit >= 0 && unit < MAX_UNITS) {
      const t = bound[unit].get(target);
      if (t) {
        let m = params.get(t);
        if (!m) params.set(t, m = new Map());
        const same = m.get(pname) === value;
        m.set(pname, value);
        if (same && !perfOff('glfilter')) { stats.skippedTexParameter++; return undefined; }
      }
    }
    return pass.texParameteri(target, pname, value);
  };
  gl.pixelStorei = (pname, value) => {
    const same = store.get(pname) === value;
    store.set(pname, value);
    if (same && !perfOff('glfilter')) { stats.skippedPixelStore++; return undefined; }
    return pass.pixelStorei(pname, value);
  };
  const c = gl.canvas;
  if (c && c.addEventListener) {
    c.addEventListener('webglcontextlost', () => { store.clear(); params = new WeakMap(); for (const m of bound) m.clear(); unit = 0; });
    c.addEventListener('webglcontextrestored', () => { store.clear(); params = new WeakMap(); for (const m of bound) m.clear(); unit = 0; });
  }
  gl.__glFilter = stats;
  return stats;
}
