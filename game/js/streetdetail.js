// Straatdetail (28-11, #1353): de detaillaag voor wijken en dorpen, een tegel tegelijk en deterministisch. Dezelfde tegeldata geeft
// in elke build, bij elke speler en voor host en gast dezelfde items: elk zaad komt uit de plek van het gebouw of de weg (geen
// Math.random, geen speltoestand). Puur: geen scene, geen kaartvragen; de aanroeper geeft de wegen, gebouwen en het water van de
// tegel. streetfurniture3d.js voegt de items bij die van furnitureForTile en tekent ze met één InstancedMesh per soort.
//
//   detailForTile({ x0, y0, size, roads, buildings, water, rails }) -> [{ k, x, y, a, s?, h?, key }]
//
// Soorten (k): hedge (voortuinhaag, s m lang, h hoog; dezelfde soort en botsing als de gemapte heggen), lattenhek, schutting en
// tuinpad (stukken van 2 m, 2 m en 1 m, `a` is de looprichting), fence (hekwerk voor bedrijven), klikogrijs/klikogroen/
// klikoblauw, fietszwart/fietsrood/fietsblauw, plantenbak, kabelkast, afvalzuil, bord30, voorrangsbord (voorkant langs +a),
// bermpaal, rietpol en hooibaal.
// Regels per buurttype (wat een gebouw is, volgt uit zijn voetafdruk en verdiepingen):
//   woonhuis (25-450 m2, tot 3 lagen) met een straat ervoor: een voortuin met haag, lattenhek of open, een tuinpad naar de deur met
//     een opening in de haag, kliko's, een fiets, een plantenbak; staat de gevel aan de stoep, dan hoogstens een kliko en een fiets;
//   flat (450 m2 of 4+ lagen): fietsen tegen de gevel en een afvalzuil bij de straat;
//   bedrijf (450+ m2, tot 2 lagen) met ruimte voor de gevel: hekwerk langs de straat met een brede poort;
//   erf (180-1500 m2, tot 2 lagen, weinig buren): hooibalen naast de schuur;
//   straat: kabelkasten langs woonstraten, zone-30-borden aan de uiteinden, voorrangsborden op zijwegen, bermpalen langs
//     landwegen buiten de bebouwing en rietpollen langs sloten.
// Niets staat op een rijbaan, in een gebouw, in water of op het spoor (clear()), en een kliko of fiets staat nooit op een
// stuk dat al een ander item heeft (taken()).
import { boxOf } from './tileplace.js';
import { pointInPolygon, polygonBounds } from './util.js';
import { mulberry32 } from './rng.js';

export const DETAIL_KINDS = ['hedge', 'tuinhaag', 'lattenhek', 'schutting', 'tuinpad', 'fence', 'klikogrijs', 'klikogroen', 'klikoblauw', 'fietszwart', 'fietsrood', 'fietsblauw', 'plantenbak', 'kabelkast', 'afvalzuil', 'bord30', 'voorrangsbord', 'bermpaal', 'rietpol', 'hooibaal', 'boomspiegel'];
export const DETAIL_RULES = {
  houseMin: 25, houseMax: 450, houseLevels: 3, flatMin: 450, yardMin: 180, yardMax: 1500,
  sidewalk: 1.7,            // m tussen het hekje en de rand van de weg
  gardenMax: 6,             // m diepte van een voortuin
  streetReach: 16,          // m van de gevel tot de hartlijn van de straat
  cabinetEvery: 95, verge: 52, ditchRiet: 11,
};
const STREET_TYPES = new Set(['residential', 'living_street', 'unclassified', 'tertiary', 'secondary', 'primary']);
const HOME_STREETS = new Set(['residential', 'living_street']);

const seedOf = (a, b, c = 0) => (Math.imul(Math.round(a * 10) | 0, 73856093) ^ Math.imul(Math.round(b * 10) | 0, 19349663) ^ Math.imul(c | 0, 83492791)) >>> 0;
const keyOf = (k, x, y) => `${k}@${Math.round(x * 10)},${Math.round(y * 10)}`;

function area(P) {
  let s = 0;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) s += P[j][0] * P[i][1] - P[i][0] * P[j][1];
  return Math.abs(s) / 2;
}
function segDist(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(ax + dx * t - x, ay + dy * t - y);
}

export function detailForTile({ x0, y0, size = 1000, roads = [], buildings = [], water = [], rails = [], trees = [], opts = {} }) {
  const items = [];
  const inTile = (x, y) => x >= x0 && x < x0 + size && y >= y0 && y < y0 + size;
  const seen = new Set();
  const put = (it) => {
    if (!inTile(it.x, it.y)) return false;
    it.key = keyOf(it.k, it.x, it.y);
    if (seen.has(it.key)) return false;
    seen.add(it.key);
    items.push(it);
    return true;
  };

  // --- rasters: wegen (alle ways, zonder voetpad) en gebouwen, per cel van 24 m ---------------------------------------------
  const RG = 24, rg = new Map(), bg = new Map();
  const cell = (gx, gy) => gx * 65536 + gy;
  const roadsList = [];
  for (const r of roads) {
    if (!r.pts || r.pts.length < 2 || r.tunnel) continue;
    if (r.cat === 'foot') continue;
    roadsList.push(r);
    const h = (r.width || (r.cat === 'cycle' ? 2 : 5)) / 2 + 2;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const A = r.pts[i], Bp = r.pts[i + 1];
      for (let gx = Math.floor((Math.min(A[0], Bp[0]) - h) / RG); gx <= Math.floor((Math.max(A[0], Bp[0]) + h) / RG); gx++)
        for (let gy = Math.floor((Math.min(A[1], Bp[1]) - h) / RG); gy <= Math.floor((Math.max(A[1], Bp[1]) + h) / RG); gy++) {
          const k = cell(gx, gy);
          (rg.get(k) || rg.set(k, []).get(k)).push(r, i);
        }
    }
  }
  const blds = [];
  for (const b of buildings) {
    if (!b.pts || b.pts.length < 4) continue;
    const q = b.bounds || (b.bounds = polygonBounds(b.pts));
    blds.push(b);
    for (let gx = Math.floor((q[0] - 1) / RG); gx <= Math.floor((q[2] + 1) / RG); gx++)
      for (let gy = Math.floor((q[1] - 1) / RG); gy <= Math.floor((q[3] + 1) / RG); gy++) {
        const k = cell(gx, gy);
        (bg.get(k) || bg.set(k, []).get(k)).push(b);
      }
  }
  // de dichtstbijzijnde weg van een soort bij een punt: { d (tot de hartlijn), road, px, py, ux, uy }
  const nearest = (x, y, reach, accept) => {
    let best = null, bd = reach;
    const gx0 = Math.floor((x - reach) / RG), gx1 = Math.floor((x + reach) / RG), gy0 = Math.floor((y - reach) / RG), gy1 = Math.floor((y + reach) / RG);
    for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
      const c = rg.get(cell(gx, gy));
      if (!c) continue;
      for (let k = 0; k < c.length; k += 2) {
        const r = c[k], i = c[k + 1];
        if (accept && !accept(r)) continue;
        const A = r.pts[i], Bp = r.pts[i + 1];
        const d = segDist(x, y, A[0], A[1], Bp[0], Bp[1]);
        if (d < bd) {
          const dx = Bp[0] - A[0], dy = Bp[1] - A[1], L = Math.hypot(dx, dy) || 1;
          const t = Math.max(0, Math.min(1, ((x - A[0]) * dx + (y - A[1]) * dy) / (L * L)));
          bd = d; best = { d, road: r, px: A[0] + dx * t, py: A[1] + dy * t, ux: dx / L, uy: dy / L };
        }
      }
    }
    return best;
  };
  const isStreet = (r) => r.cat !== 'cycle' && STREET_TYPES.has(r.type) && !r.tunnel;
  const buildingGap = (x, y, reach = 3) => {
    const c = bg.get(cell(Math.floor(x / RG), Math.floor(y / RG)));
    let best = Infinity;
    // een gebouw kan de cel delen met buurcellen: kijk ook in de acht buren als het punt dicht bij een celrand ligt
    const cells = [c];
    const fx = x / RG - Math.floor(x / RG), fy = y / RG - Math.floor(y / RG), m = reach / RG;
    if (fx < m) cells.push(bg.get(cell(Math.floor(x / RG) - 1, Math.floor(y / RG))));
    if (fx > 1 - m) cells.push(bg.get(cell(Math.floor(x / RG) + 1, Math.floor(y / RG))));
    if (fy < m) cells.push(bg.get(cell(Math.floor(x / RG), Math.floor(y / RG) - 1)));
    if (fy > 1 - m) cells.push(bg.get(cell(Math.floor(x / RG), Math.floor(y / RG) + 1)));
    for (const list of cells) {
      if (!list) continue;
      for (const b of list) {
        const q = b.bounds;
        if (x < q[0] - reach || x > q[2] + reach || y < q[1] - reach || y > q[3] + reach) continue;
        if (pointInPolygon(x, y, b.pts)) return 0;
        for (let i = 0; i < b.pts.length - 1; i++) best = Math.min(best, segDist(x, y, b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1]));
      }
    }
    return best;
  };
  const inWater = (x, y) => {
    for (const w of water) {
      if (!w.pts || w.pts.length < 4) continue;
      const q = w.bounds || (w.bounds = polygonBounds(w.pts));
      if (x < q[0] - 0.4 || x > q[2] + 0.4 || y < q[1] - 0.4 || y > q[3] + 0.4) continue;
      if (pointInPolygon(x, y, w.pts)) return true;
    }
    return false;
  };
  const onRail = (x, y) => {
    for (const r of rails) {
      const P = r.pts;
      if (!P || P.length < 2) continue;
      for (let i = 0; i < P.length - 1; i++) if (segDist(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]) < 2.6) return true;
    }
    return false;
  };
  // vrij: niet op een rijbaan of fietspad (rand + margin), niet in een gebouw (house m), niet in water en niet op het spoor
  const clear = (x, y, { house = 0.45, road = 0.35 } = {}) => {
    if (buildingGap(x, y, house) < house) return false;
    const hit = nearest(x, y, 12, null);
    if (hit) {
      const w = (hit.road.width || (hit.road.cat === 'cycle' ? 2 : 5)) / 2;
      if (hit.d < w + road) return false;
    }
    return !inWater(x, y) && !onRail(x, y);
  };
  // iets wat al staat: een kliko, fiets of plantenbak mag er niet bovenop (0,7 m)
  const spots = [];
  const taken = (x, y, r = 0.7) => spots.some((s) => (s[0] - x) ** 2 + (s[1] - y) ** 2 < r * r);
  const claim = (x, y) => spots.push([x, y]);

  // vaste volgorde: het resultaat hangt niet af van de volgorde waarin de kaart de rijen levert (een claim van het ene gebouw telt voor het volgende)
  blds.sort((p, q) => p.bounds[0] - q.bounds[0] || p.bounds[1] - q.bounds[1]);
  roadsList.sort((p, q) => p.pts[0][0] - q.pts[0][0] || p.pts[0][1] - q.pts[0][1]);

  // --- gebouwen ------------------------------------------------------------------------------------------------------------
  const R = DETAIL_RULES;
  const lo = (v) => v - 14;
  for (const b of blds) {
    const q = b.bounds;
    const cx = (q[0] + q[2]) / 2, cy = (q[1] + q[3]) / 2;
    if (cx < lo(x0) || cx >= x0 + size + 14 || cy < lo(y0) || cy >= y0 + size + 14) continue;
    const lv = b.h || 1, ar = area(b.pts);
    if (ar < R.houseMin || b.kind === 'church') continue;
    const box = boxOf(b);
    const rnd = mulberry32(seedOf(box.x, box.y));
    const house = ar <= R.houseMax && lv <= R.houseLevels;
    const flat = ar > R.flatMin && lv > 2.5 && lv <= 12;
    const works = ar > R.flatMin && lv <= 2.5;
    // de gevel naar de straat: van de vier zijden van de oriëntatiebox die met de kortste afstand tot een straat
    const ca = Math.cos(box.a), sa = Math.sin(box.a);
    let front = null;
    for (const [nx, ny, half, tx, ty, halfT] of [[ca, sa, box.w / 2, -sa, ca, box.l / 2], [-ca, -sa, box.w / 2, sa, -ca, box.l / 2], [-sa, ca, box.l / 2, ca, sa, box.w / 2], [sa, -ca, box.l / 2, -ca, -sa, box.w / 2]]) {
      const mx = box.x + nx * (half + 0.2), my = box.y + ny * (half + 0.2);
      const hit = nearest(mx, my, R.streetReach, isStreet);
      if (!hit) continue;
      // de straat moet voor de gevel liggen, niet ernaast
      const vx = hit.px - mx, vy = hit.py - my, vl = Math.hypot(vx, vy) || 1;
      if ((vx * nx + vy * ny) / vl < 0.5) continue;
      const hw = (hit.road.width || 6) / 2;
      const space = hit.d - hw - 0.2;
      if (!front || space < front.space) front = { nx, ny, tx, ty, half, halfT, hit, space, mx, my };
    }
    if (flat) { flatDetail(b, box, front, rnd); continue; }
    if (works) { worksDetail(b, box, front, rnd); continue; }
    if (!house) continue;
    if (!front) { yardDetail(b, box, rnd); continue; }
    houseDetail(b, box, front, rnd);
  }

  function houseDetail(b, box, f, rnd) {
    const { nx, ny, tx, ty, half, halfT, space } = f;
    const faceA = Math.atan2(ny, nx);
    const tAng = Math.atan2(ty, tx);
    const at = (u, d) => [box.x + nx * (half + d) + tx * u, box.y + ny * (half + d) + ty * u];
    const rowOk = (u, d, o) => { const [x, y] = at(u, d); return clear(x, y, o); };
    const doorU = Math.round((rnd() - 0.5) * halfT * 0.9 * 2 * 2) / 2;
    const gd = Math.min(space - R.sidewalk, R.gardenMax);
    const style = rnd();
    if (gd >= 1.5 && halfT >= 2) {
      // voortuin: de haag of het hekje op gd van de gevel, over de hele breedte met een opening bij het tuinpad
      const u0 = -halfT - 0.1, u1 = halfT + 0.1, gate = 0.65;
      const hedgeH = 0.75 + Math.round(rnd() * 5) * 0.08;
      const kind = style < 0.5 ? 'hedge' : style < 0.82 ? 'lattenhek' : null;
      if (kind) {
        for (const [a0, a1] of [[u0, doorU - gate], [doorU + gate, u1]]) {
          if (a1 - a0 < 0.8) continue;
          if (kind === 'hedge') {
            const n = Math.max(1, Math.round((a1 - a0) / 2)), len = (a1 - a0) / n;
            for (let i = 0; i < n; i++) {
              const [x, y] = at(a0 + len * (i + 0.5), gd);
              if (!rowOk(a0 + len * (i + 0.5), gd, { house: 0.5, road: 0.5 }) || !rowOk(a0 + len * i, gd) || !rowOk(a0 + len * (i + 1), gd)) continue;
              put({ k: 'tuinhaag', x, y, a: tAng, s: len / 2, h: hedgeH });
            }
          } else {
            const n = Math.max(1, Math.round((a1 - a0) / 2)), len = (a1 - a0) / n;
            // stukken van 2 m: bij een afwijkende lengte schalen we niet; de laatste vult met een stuk iets korter
            for (let i = 0; i < n; i++) {
              const u = a0 + len * (i + 0.5), [x, y] = at(u, gd);
              if (!rowOk(u, gd) || !rowOk(u - 1, gd) || !rowOk(u + 1, gd)) continue;
              put({ k: 'lattenhek', x, y, a: faceTo(tAng, faceA), s: len / 2 });
            }
          }
        }
      }
      // tuinpad: van de gevel door de opening naar de rand van het trottoir
      const reach = Math.min(gd + 1.2, space - 0.9);
      for (let d = 0.6; d < reach; d += 1) {
        const [x, y] = at(doorU, d);
        if (clear(x, y, { house: 0.1 })) { put({ k: 'tuinpad', x, y, a: faceA }); }
      }
      // plantenbak naast de deur (zomer: altijd bloeiend)
      if (rnd() < 0.3 && gd >= 2) {
        const side = rnd() < 0.5 ? -1 : 1, u = doorU + side * 1.5, [x, y] = at(u, 0.4);
        if (Math.abs(u) < halfT - 0.4 && rowOk(u, 0.4, { house: 0.2 }) && !taken(x, y, 0.9)) { put({ k: 'plantenbak', x, y, a: faceA }); claim(x, y); }
      }
      // kliko's: één of twee in de tuin, aan de kant van de gevel zonder deur
      const kn = rnd() < 0.78 ? (rnd() < 0.42 ? 2 : 1) : 0;
      for (let i = 0; i < kn; i++) {
        const side = doorU > 0 ? -1 : 1, u = side * (halfT * (0.45 + rnd() * 0.4)) + (i ? side * 0.85 : 0);
        const d = 0.65 + rnd() * Math.max(0, Math.min(gd - 1.3, 1.6));
        const [x, y] = at(u, d);
        if (Math.abs(u) > halfT - 0.3 || !rowOk(u, d, { house: 0.25 }) || taken(x, y)) continue;
        const kk = i === 0 ? (rnd() < 0.7 ? 'klikogrijs' : 'klikogroen') : (rnd() < 0.5 ? 'klikoblauw' : 'klikogroen');
        put({ k: kk, x, y, a: faceA + (rnd() - 0.5) * 0.5 });
        claim(x, y);
      }
      // een fiets bij de deur, parallel aan de gevel
      if (rnd() < 0.38) {
        const side = rnd() < 0.5 ? -1 : 1, u = doorU + side * (1.5 + rnd() * 1.2), d = 0.55 + rnd() * 0.5, [x, y] = at(u, d);
        if (Math.abs(u) < halfT - 0.9 && rowOk(u, d, { house: 0.2 }) && !taken(x, y, 1.2)) {
          put({ k: FIETS[Math.floor(rnd() * 3)], x, y, a: tAng + (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.2 });
          claim(x, y);
        }
      }
    } else if (space >= 2.4) {
      // de gevel staat aan de stoep: een kliko of fiets tegen de gevel
      if (rnd() < 0.3) {
        const u = (rnd() - 0.5) * halfT * 1.4, [x, y] = at(u, 0.5);
        if (rowOk(u, 0.5, { house: 0.2 }) && !taken(x, y)) { put({ k: rnd() < 0.7 ? 'klikogrijs' : 'klikogroen', x, y, a: faceA }); claim(x, y); }
      }
      if (rnd() < 0.25) {
        const u = (rnd() - 0.5) * halfT * 1.4, [x, y] = at(u, 0.55);
        if (rowOk(u, 0.55, { house: 0.2 }) && !taken(x, y, 1.2)) { put({ k: FIETS[Math.floor(rnd() * 3)], x, y, a: tAng + (rnd() < 0.5 ? 0 : Math.PI) }); claim(x, y); }
      }
    }
  }

  function flatDetail(b, box, f, rnd) {
    if (!f) return;
    const { nx, ny, tx, ty, half, halfT, space } = f;
    const at = (u, d) => [box.x + nx * (half + d) + tx * u, box.y + ny * (half + d) + ty * u];
    // een rij fietsen loodrecht tegen de gevel, elk een eigen kleur en een eigen hoek; nooit dezelfde twee naast elkaar
    if (space >= 3 && rnd() < 0.85) {
      const n = 2 + Math.floor(rnd() * 4), u0 = (rnd() - 0.5) * Math.max(0, halfT * 1.2 - n * 0.35);
      let last = -1;
      for (let i = 0; i < n; i++) {
        const u = u0 + (i - n / 2) * 0.72, [x, y] = at(u, 0.95);
        if (Math.abs(u) > halfT - 0.5 || !clear(x, y, { house: 0.15 }) || taken(x, y, 0.5)) continue;
        let k = Math.floor(rnd() * 3); if (k === last) k = (k + 1) % 3; last = k;
        put({ k: FIETS[k], x, y, a: Math.atan2(-ny, -nx) + (rnd() - 0.5) * 0.35 });
        claim(x, y);
      }
    }
    // afvalzuil bij de straat
    if (space >= 6 && rnd() < 0.55) {
      const u = (rnd() < 0.5 ? -1 : 1) * Math.min(halfT - 1.5, 4 + rnd() * 4), [x, y] = at(u, space - 3.2);
      if (clear(x, y, { house: 1, road: 0.8 }) && !taken(x, y, 2)) { put({ k: 'afvalzuil', x, y, a: Math.atan2(ny, nx) }); claim(x, y); }
    }
  }

  function worksDetail(b, box, f, rnd) {
    if (!f || f.space < 5.5 || f.halfT < 5) return;
    const { nx, ny, tx, ty, half, halfT, space } = f;
    const at = (u, d) => [box.x + nx * (half + d) + tx * u, box.y + ny * (half + d) + ty * u];
    const d = space - 2.4, gate = 3.2, tAng = Math.atan2(ty, tx);
    if (d < 2.5) return;
    for (const [a0, a1] of [[-halfT - 0.5, -gate], [gate, halfT + 0.5]]) {
      if (a1 - a0 < 3) continue;
      const n = Math.ceil((a1 - a0) / 4), len = (a1 - a0) / n;
      for (let i = 0; i < n; i++) {
        const u = a0 + len * (i + 0.5), [x, y] = at(u, d);
        if (!clear(x, y, { house: 0.6, road: 0.6 }) || !clear(...at(u - len / 2, d)) || !clear(...at(u + len / 2, d))) continue;
        put({ k: 'fence', x, y, a: tAng, s: len });
      }
    }
  }

  function yardDetail(b, box, rnd) {
    // een erf: een schuur of boerderij met weinig buren; hooibalen aan de zijkant, nooit voor de deur
    if (box.lv > 2.5) return;
    const ar = box.w * box.l;
    if (ar < R.yardMin || ar > R.yardMax) return;
    let near = 0;
    for (const o of blds) { if (o !== b && Math.abs(o.bounds[0] - box.x) < 70 && Math.abs(o.bounds[1] - box.y) < 70) near++; }
    if (near > 6 || rnd() > 0.45) return;
    const ca = Math.cos(box.a), sa = Math.sin(box.a);
    const side = rnd() < 0.5 ? 1 : -1, n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const u = box.w / 2 + 2 + i * 2.9 * (rnd() < 0.5 ? 1 : 0.9), v = (rnd() - 0.5) * box.l * 0.5;
      const x = box.x + ca * u * side - sa * v, y = box.y + sa * u * side + ca * v;
      if (!clear(x, y, { house: 1.1, road: 1.2 }) || taken(x, y, 1.6)) continue;
      put({ k: 'hooibaal', x, y, a: rnd() * Math.PI * 2 });
      claim(x, y);
    }
  }

  // --- straten: kabelkasten, borden, bermpalen ----------------------------------------------------------------------------
  const ends = new Map(); // eindpunt -> aantal wegen dat er eindigt of langskomt
  for (const r of roadsList) for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) { const k = Math.round(p[0]) * 100003 + Math.round(p[1]); ends.set(k, (ends.get(k) || 0) + 1); }
  for (const r of roadsList) {
    if (!isStreet(r)) continue;
    const P = r.pts, hw = (r.width || 6) / 2;
    let total = 0;
    const rnd = mulberry32(seedOf(P[0][0], P[0][1], 7));
    let next = R.cabinetEvery * (0.3 + rnd() * 0.7), nextPost = R.verge * (0.3 + rnd());
    for (let i = 0; i < P.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      if (L < 0.5) continue;
      const ux = (P[i + 1][0] - P[i][0]) / L, uy = (P[i + 1][1] - P[i][1]) / L;
      while (total + L > next) {
        const t = next - total, x = P[i][0] + ux * t, y = P[i][1] + uy * t, side = rnd() < 0.5 ? -1 : 1;
        next += R.cabinetEvery * (0.8 + rnd() * 0.5);
        if (!HOME_STREETS.has(r.type) || r.type === 'living_street' && rnd() < 0.5) continue;
        const off = hw + 1.45, px = x - uy * side * off, py = y + ux * side * off;
        // de kast staat met zijn deuren naar de straat
        if (clear(px, py, { house: 1.0, road: 0.6 }) && buildingGap(px, py, 6) < 6 && !taken(px, py, 2)) { put({ k: 'kabelkast', x: px, y: py, a: Math.atan2(-side * ux, side * uy) }); claim(px, py); }
      }
      while (!HOME_STREETS.has(r.type) && r.type !== 'living_street' && total + L > nextPost) {
        const t = nextPost - total, x = P[i][0] + ux * t, y = P[i][1] + uy * t, side = (Math.round(nextPost / R.verge) & 1) ? -1 : 1;
        nextPost += R.verge;
        // bermpalen alleen buiten de bebouwing (geen gebouw binnen 40 m): langs de landweg
        if (r.type === 'primary' || r.type === 'secondary' || buildingGap(x, y, 40) < 40) continue;
        const off = hw + 1.2, px = x - uy * side * off, py = y + ux * side * off;
        if (clear(px, py, { house: 2, road: 0.8 })) put({ k: 'bermpaal', x: px, y: py, a: Math.atan2(uy, ux) + (side > 0 ? 0 : Math.PI) });
      }
      total += L;
    }
    // borden aan de uiteinden van een woonstraat (zone 30) en op zijwegen (voorrang)
    for (const [idx, dir] of [[0, 1], [P.length - 1, -1]]) {
      const p = P[idx], q = P[idx === 0 ? 1 : P.length - 2];
      const key = Math.round(p[0]) * 100003 + Math.round(p[1]);
      if ((ends.get(key) || 0) < 2) continue;
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
      const off = hw + 0.9, x = p[0] + ux * 7 + uy * off, y = p[1] + uy * 7 - ux * off;
      if (!clear(x, y, { house: 0.6, road: 0.5 }) || taken(x, y, 2)) continue;
      // het bord kijkt tegen de verkeersrichting in (de bestuurder die de straat inrijdt ziet de voorkant)
      const faceAng = Math.atan2(-uy, -ux);
      if (HOME_STREETS.has(r.type) && L >= 20) { put({ k: 'bord30', x, y, a: faceAng }); claim(x, y); }
      else if ((r.type === 'tertiary' || r.type === 'unclassified') && L >= 20) { put({ k: 'voorrangsbord', x, y, a: faceAng }); claim(x, y); }
    }
  }

  // --- boomspiegels: een boom naast een woonstraat in de bebouwde kom (een gebouw binnen 30 m) staat in een spiegel ----------------
  const rndT = mulberry32(seedOf(x0, y0, 5));
  for (const t of trees) {
    const tx = Array.isArray(t) ? t[0] : t.x !== undefined ? t.x : t.pts ? t.pts[0][0] : NaN, ty = Array.isArray(t) ? t[1] : t.y !== undefined ? t.y : t.pts ? t.pts[0][1] : NaN;
    if (!Number.isFinite(tx) || !inTile(tx, ty)) continue;
    const hit = nearest(tx, ty, 9, isStreet);
    if (!hit || hit.d < (hit.road.width || 6) / 2 + 0.6 || hit.d > (hit.road.width || 6) / 2 + 5.5) continue;
    if (buildingGap(tx, ty, 30) >= 30) continue;
    if (rndT() < 0.15 || !clear(tx, ty, { house: 0.5, road: 0.3 })) continue;
    put({ k: 'boomspiegel', x: tx, y: ty, a: Math.atan2(hit.uy, hit.ux) });
  }

  // --- rietpollen langs sloten en vijvers -----------------------------------------------------------------------------------
  let riet = 0;
  for (const w of water) {
    if (!w.pts || w.pts.length < 4) continue;
    const q = w.bounds || (w.bounds = polygonBounds(w.pts));
    if (q[2] < x0 - 20 || q[0] > x0 + size + 20 || q[3] < y0 - 20 || q[1] > y0 + size + 20) continue;
    if (area(w.pts) > 6000) continue; // alleen sloten en vijvers; geen meren of kanalen
    const rnd = mulberry32(seedOf(q[0], q[1], 11));
    const P = w.pts;
    let next = rnd() * R.ditchRiet, total = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      if (L < 0.3) continue;
      const ux = (P[i + 1][0] - P[i][0]) / L, uy = (P[i + 1][1] - P[i][1]) / L;
      while (total + L > next) {
        const t = next - total, bx = P[i][0] + ux * t, by = P[i][1] + uy * t;
        next += R.ditchRiet * (0.7 + rnd() * 0.9);
        if (rnd() < 0.45) continue;
        // naar de oever toe: aan de kant buiten het water
        let px = bx - uy * 0.9, py = by + ux * 0.9;
        if (pointInPolygon(px, py, P)) { px = bx + uy * 0.9; py = by - ux * 0.9; }
        if (!inTile(px, py) || riet >= 160) continue;
        if (clear(px, py, { house: 1.4, road: 0.9 }) && !taken(px, py, 2)) { put({ k: 'rietpol', x: px, y: py, a: rnd() * Math.PI * 2 }); claim(px, py); riet++; }
      }
      total += L;
    }
  }
  return items;
}

const FIETS = ['fietszwart', 'fietsrood', 'fietsblauw'];
// de hoek waarmee een hekstuk (voorkant -z lokaal na de draai, zie streetfurniture3d.js) naar de straat kijkt
function faceTo(tAng, faceA) {
  // de lokale -z van een stuk met hoek a wijst naar (sin a, -cos a); gewenst: de straat (faceA)
  const c1 = Math.sin(tAng) * Math.cos(faceA) - Math.cos(tAng) * Math.sin(faceA);
  return c1 > 0 ? tAng : tAng + Math.PI;
}
