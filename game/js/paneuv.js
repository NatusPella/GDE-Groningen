// Ruitattribuut van de nepinterieurs (THREE-vrij, zodat de tests en de CPU-referentie het echte coderen gebruiken).
// Pane attribute encoding in uv (both parts integer + fraction):
//   uv.x = K * 64 + widthDm + 0.5 + x / 8     x: metres from pane centre along cross(up, n)
//   uv.y = -(16 + kind * 64 + heightDm) + 0.002 + y / 4     y: metres above pane bottom
// K is the night-light rank (256 levels; shops: 32 levels * 8 bays),
// kind 0 = upper-floor home, 1 = ground-floor home, 2 = shop, 3 = office.
// De decoder staat in interiorglass.js (igDecode) en in scripts/lib/interior_shader_ref.mjs (CPU-referentie).

export const PANE_HOME = 0, PANE_GROUND = 1, PANE_SHOP = 2, PANE_OFFICE = 3;

export function paneUV(rank, kind, w, h, tx, tz, nx, nz, bay = 0) {
  const along = tx * nz - tz * nx >= 0 ? 1 : -1;
  const r = Math.min(0.999, Math.max(0, rank));
  const K = kind === PANE_SHOP ? (Math.floor(r * 32) << 3) | (bay & 7) : Math.floor(r * 256);
  const wd = Math.min(63, Math.max(1, Math.round(w * 10)));
  const hd = Math.min(63, Math.max(1, Math.round(h * 10)));
  const fx = (x) => K * 64 + wd + 0.5 + x / 8;
  const base = -(16 + kind * 64 + hd) + 0.002;
  const fy = (y) => base + Math.min(y, 3.99) / 4;
  const xa = -along * w / 2, xb = along * w / 2;
  return [fx(xa), fy(0), fx(xb), fy(0), fx(xb), fy(h), fx(xa), fy(h)];
}
