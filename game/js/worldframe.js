// Hand-placed coordinates written in the legacy (pre-RD) frame, converted to
// the world frame (RD New, rdnew.js) when the module loads. Results are
// rounded to the centimetre, so scripts/world/rebase_coords.mjs can later
// write the converted numbers into the source without changing anything.
//
//   P(x, y)          -> [x, y]                     a point
//   PO(x, y)         -> { x, y }                   spread it: { name, ...PO(18, 244), r: 38 }
//   P3(x, h, y)      -> [x, h, y]                  three.js order (height in the middle)
//   PA(x, y, a)      -> a                          a heading at that point (0 = +x, y south)
//   PL([[x, y, ...rest], ...]) -> same list        polylines and polygons; extra fields kept
//   PB([x0, y0, x1, y1])       -> [x0, y0, x1, y1] an axis-aligned box: the box round its turned corners
//   L(x, y)          -> [x, y]                     world -> legacy (keeps an old axis-aligned region test exact)
import { legacyToWorld, worldToLegacy, legacyAngleToWorld } from './rdnew.js';

const cm = (v) => Math.round(v * 100) / 100;

export function P(x, y) {
  const [a, b] = legacyToWorld(x, y);
  return [cm(a), cm(b)];
}

export function PO(x, y) {
  const [a, b] = legacyToWorld(x, y);
  return { x: cm(a), y: cm(b) };
}

export function P3(x, h, y) {
  const [a, b] = legacyToWorld(x, y);
  return [cm(a), h, cm(b)];
}

export function PA(x, y, a) {
  return Math.round(legacyAngleToWorld(x, y, a) * 1e4) / 1e4;
}

export function PL(list) {
  return list.map(([x, y, ...rest]) => [...P(x, y), ...rest]);
}

export function PB([x0, y0, x1, y1]) {
  const c = [P(x0, y0), P(x1, y0), P(x0, y1), P(x1, y1)];
  return [
    Math.floor(Math.min(...c.map((p) => p[0]))), Math.floor(Math.min(...c.map((p) => p[1]))),
    Math.ceil(Math.max(...c.map((p) => p[0]))), Math.ceil(Math.max(...c.map((p) => p[1]))),
  ];
}

export const L = (x, y) => worldToLegacy(x, y);
