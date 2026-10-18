// The real kart track of Ulrum (issue #176): OpenStreetMap way 474012393
// ("Kartbaan Ulrum", highway=raceway, sport=karting), the ring of its
// vertices as [lat, lon] (OpenStreetMap-bijdragers, ODbL). kartbaan.js lays the
// race track on it. Pure data and maths, no THREE, so the node tests use it.
export const ULRUM_RING = [
  [53.361319, 6.341249],
  [53.36147, 6.341453],
  [53.361475, 6.341513],
  [53.361469, 6.341564],
  [53.361458, 6.341601],
  [53.361424, 6.341623],
  [53.361368, 6.341653],
  [53.361323, 6.341689],
  [53.3613, 6.341729],
  [53.361299, 6.341773],
  [53.361301, 6.341822],
  [53.361332, 6.341884],
  [53.361373, 6.341907],
  [53.361776, 6.341913],
  [53.361806, 6.341914],
  [53.361836, 6.341891],
  [53.361852, 6.341842],
  [53.361858, 6.341791],
  [53.361851, 6.341731],
  [53.361841, 6.341703],
  [53.361807, 6.341638],
  [53.361775, 6.341565],
  [53.361764, 6.341514],
  [53.361778, 6.341437],
  [53.361812, 6.341363],
  [53.361841, 6.3413],
  [53.361848, 6.3412],
  [53.36184, 6.341043],
  [53.361829, 6.340909],
  [53.361816, 6.340869],
  [53.361795, 6.340842],
  [53.361768, 6.340825],
  [53.361673, 6.340834],
  [53.361651, 6.340864],
  [53.361631, 6.34093],
  [53.361633, 6.340995],
  [53.361657, 6.341069],
  [53.361669, 6.341129],
  [53.361669, 6.341182],
  [53.361649, 6.341222],
  [53.361621, 6.341254],
  [53.36158, 6.341256],
  [53.361545, 6.341228],
  [53.36135, 6.340874],
  [53.361309, 6.340827],
  [53.361273, 6.340822],
  [53.36124, 6.340836],
  [53.361215, 6.340885],
  [53.36121, 6.340969],
  [53.361219, 6.34108],
  [53.361245, 6.34115],
];

// The ring as local metres around its centre (an equirectangular projection is
// plenty at 70 m): [{ lat0, lon0, pts: [[x, y], ...] }], x east, y north.
export function ringToLocal(ring = ULRUM_RING) {
  const lat0 = ring.reduce((a, p) => a + p[0], 0) / ring.length;
  const lon0 = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110574;
  return { lat0, lon0, pts: ring.map(([la, lo]) => [(lo - lon0) * kx, (la - lat0) * ky]) };
}

// The loop with its first control point in the middle of the longest straight
// edge, so the start line and the grid have a straight to stand on.
export function startOnLongestStraight(pts) {
  const n = pts.length;
  let best = 0, bl = -1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > bl) { bl = l; best = i; }
  }
  const a = pts[best], b = pts[(best + 1) % n];
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const out = [mid];
  for (let k = 1; k <= n; k++) out.push(pts[(best + k) % n]);
  return out;
}
