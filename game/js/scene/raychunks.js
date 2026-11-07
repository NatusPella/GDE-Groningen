// #497: de raycast-chunks van de camera-occlusie uit scene3d.js. Puur: de module kent geen THREE en geen
// scène; hij leest de positie-/index-attributen van een geometry en bouwt de dozen, en toetst of het
// segment (de host levert de punten, bv. THREE.Vector3) een doos raakt. Zo kan een test het natrekken.
export const RAY_CHUNK_TRIS = 32;
export const RAY_BOX_EPS = 1e-3;

// De geometry in stukken van RAY_CHUNK_TRIS driehoeken: per stuk een doos met een kleine marge, gecachet op
// de attribuutversie (de camera-raycast doet dit elke frame en de geometry verandert bijna nooit).
export function rayChunks(g) {
  const pos = g.attributes.position, idx = g.index;
  const version = (idx ? idx.version : 0) + pos.version;
  let c = g.userData.rayChunks;
  if (c && c.version === version && c.pos === pos && c.idx === idx) return c;
  const triCount = ((idx ? idx.count : pos.count) / 3) | 0;
  const n = Math.ceil(triCount / RAY_CHUNK_TRIS);
  const boxes = new Float32Array(n * 6);
  for (let k = 0; k < n; k++) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    const end = Math.min(triCount, (k + 1) * RAY_CHUNK_TRIS) * 3;
    for (let v = k * RAY_CHUNK_TRIS * 3; v < end; v++) {
      const i = idx ? idx.getX(v) : v;
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    const o = k * 6;
    boxes[o] = x0 - RAY_BOX_EPS; boxes[o + 1] = y0 - RAY_BOX_EPS; boxes[o + 2] = z0 - RAY_BOX_EPS;
    boxes[o + 3] = x1 + RAY_BOX_EPS; boxes[o + 4] = y1 + RAY_BOX_EPS; boxes[o + 5] = z1 + RAY_BOX_EPS;
  }
  c = { boxes, n, triCount, version, pos, idx };
  g.userData.rayChunks = c;
  return c;
}

// Snijdt het segment a->b een van de dozen? De host geeft de segmentpunten als gewone getallen mee.
export function segmentHitsChunk(boxes, o, ax, ay, az, bx, by, bz) {
  const a = [ax, ay, az], b = [bx, by, bz];
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) {
    const d = b[k] - a[k];
    const lo = boxes[o + k], hi = boxes[o + 3 + k];
    if (d === 0) {
      if (a[k] < lo || a[k] > hi) return false;
      continue;
    }
    let ta = (lo - a[k]) / d, tb = (hi - a[k]) / d;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta;
    if (tb < t1) t1 = tb;
    if (t0 > t1) return false;
  }
  return true;
}
