import * as THREE from 'three';
import { closestPointOnSegment, pointInPolygon } from './util.js';
import { addStaticCollider, removeProp } from './breakables.js';
import { SECTION } from './gdt.js';
import { isPaddepoelRoof, buildPaddepoelRoof } from './paddepoel3d.js';

// OSM building=roof footprints are open canopies (market roofs, station and
// square shelters). They used to render as solid blocks you could spawn in;
// here they are a thin roof slab on slim posts. Only the posts are solid, and
// none stands in a carriageway or on the track.

const CANOPY_Y = 5.2;
const SLAB = 0.28;
const POST_W = 0.18;
const POST_SPACING = 7;

const slabMat = new THREE.MeshStandardMaterial({ color: 0x5c6166, roughness: 0.7, metalness: 0.3, flatShading: true, side: THREE.DoubleSide });
const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.6, metalness: 0.5, flatShading: true });

// A canopy of thousands of m2 (the roof over a car park or a plant, as at the Eemshaven) is a solar roof, not one blank dark
// plate: solar-panel cells on the slab, and posts under it in a grid, so it does not hang on its rim alone (#260).
const BIG_CANOPY = 1500, GRID_POST = 11;
let pvMat = null;
function solarMaterial() {
  if (pvMat) return pvMat;
  if (typeof document === 'undefined') return (pvMat = slabMat);
  const S = 256, cells = 4, c = S / cells;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#26364f';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
    const v = 0.9 + ((i * 7 + j * 13) % 5) * 0.03;
    g.fillStyle = 'rgb(' + Math.round(34 * v) + ',' + Math.round(52 * v) + ',' + Math.round(84 * v) + ')';
    g.fillRect(i * c + 2, j * c + 2, c - 4, c - 4);
  }
  g.fillStyle = 'rgba(190,200,215,0.55)';
  for (let i = 0; i < cells; i++) { g.fillRect(i * c, 0, 2, S); g.fillRect(0, i * c, S, 2); }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 8, 1 / 8); // the slab's uv are metres: one texture is 8 m (4x4 cells of 2 m)
  tex.colorSpace = THREE.SRGBColorSpace;
  pvMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45, metalness: 0.35, flatShading: true, side: THREE.DoubleSide });
  return pvMat;
}
const ringArea2 = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };

function nearLine(P, x, y, r) {
  for (let i = 0; i < P.length - 1; i++) {
    if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < r * r) return true;
  }
  return false;
}

// The level a canopy stands on: platform roofs over a track on an embankment or a viaduct (Groningen Noord: the rails run 5.6 m
// up) sit on the track's level, not on the street under it, where they hung at the height of a first floor (#323). A roof by
// the street gets 0. The rail's z at the nearest point within RAIL_REACH of the footprint's vertices and middle.
const RAIL_REACH = 8;
// (the city's pinned tiles have no rail grid: all its rails are looked at, there are a couple of hundred)
const railsAround = (map, x, y) => { const g = map.railNear ? map.railNear(x, y, RAIL_REACH) : []; return g.length ? g : map.rails || []; };
export function canopyBase(map, pts) {
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p[0]; cy += p[1]; }
  const probes = [[cx / pts.length, cy / pts.length], ...pts];
  let base = 0;
  for (const [x, y] of probes) {
    for (const r of railsAround(map, x, y)) {
      if (!r.z || !r.pts || r.pts.length < 2) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const q = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
        if (q.dist2 > RAIL_REACH * RAIL_REACH) continue;
        const z = r.z[i] + (r.z[i + 1] - r.z[i]) * (q.t ?? 0);
        if (z > base) base = z;
      }
    }
  }
  return base > 0.6 ? base : 0;
}

function postInTheWay(map, x, y) {
  for (const r of map.roadsNear(x, y, 10)) {
    if (r.cat !== 'foot' && r.cat !== 'cycle' && nearLine(r.pts, x, y, (r.width || 5) / 2 + 0.4)) return true;
  }
  for (const rail of map.rails || []) {
    const P = rail.pts || rail;
    if (nearLine(P, x, y, 2.4)) return true;
  }
  return false;
}

export function buildCanopies(map) {
  return canopyGroup(map, map.canopies || [], null);
}

// The group for a list of canopies; `props`, when given, collects the posts'
// colliders so a streamed tile can take them away again.
function canopyGroup(map, list, props) {
  const group = new THREE.Group();
  const posts = [], gridPosts = [];
  const solid = (kind, ...args) => { const p = addStaticCollider(kind, ...args); if (props) props.push(p); return p; };
  for (const c of list) {
    if (isPaddepoelRoof(c)) { group.add(buildPaddepoelRoof(map)); continue; }
    const pts = c.pts[0][0] === c.pts[c.pts.length - 1][0] && c.pts[0][1] === c.pts[c.pts.length - 1][1] ? c.pts.slice(0, -1) : c.pts;
    if (pts.length < 3) continue;
    // a canopy with its own model (thuis3d.js: the petrol station) brings its own columns
    if (c.custom) {
      const own = c.custom(map);
      group.add(own.group);
      for (const [x, y] of own.posts) solid('post', x, y, 0.3);
      for (const i of own.islands) solid('post', i.p[0], i.p[1], 0.6, i.half, i.angle);
      continue;
    }
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    // shape (x, y) + extrude z -> rotateX(90deg) -> (x, -z, y): map y lands on three z
    const geo = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: false });
    geo.rotateX(Math.PI / 2);
    const base = canopyBase(map, pts);
    geo.translate(0, base + CANOPY_Y + SLAB, 0);
    const big = ringArea2(pts) > BIG_CANOPY;
    const slab = new THREE.Mesh(geo, big ? solarMaterial() : slabMat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
    if (big) {
      // visual posts in a grid under the slab (the rim posts below are the solid ones)
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let y = y0 + GRID_POST; y < y1 && gridPosts.length < 6000; y += GRID_POST) for (let x = x0 + GRID_POST; x < x1; x += GRID_POST) {
        if (pointInPolygon(x, y, pts) && !postInTheWay(map, x, y)) gridPosts.push([x, y, base]);
      }
    }
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const len = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.round(len / POST_SPACING));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        if (!postInTheWay(map, px, py)) posts.push([px, py, base]);
      }
    }
  }
  if (gridPosts.length) {
    const geo = new THREE.BoxGeometry(POST_W, CANOPY_Y, POST_W);
    geo.translate(0, CANOPY_Y / 2, 0);
    const inst = new THREE.InstancedMesh(geo, postMat, gridPosts.length);
    const m = new THREE.Matrix4();
    gridPosts.forEach(([x, y, b], i) => { m.makeTranslation(x, b, y); inst.setMatrixAt(i, m); });
    inst.castShadow = true;
    group.add(inst);
  }
  if (posts.length) {
    const geo = new THREE.BoxGeometry(POST_W, CANOPY_Y, POST_W);
    geo.translate(0, CANOPY_Y / 2, 0);
    const inst = new THREE.InstancedMesh(geo, postMat, posts.length);
    const m = new THREE.Matrix4();
    // (the posts of a roof up on an embankment carry no collider: it would stand in the street below)
    posts.forEach(([x, y, b], i) => { m.makeTranslation(x, b, y); inst.setMatrixAt(i, m); if (b < 0.6) solid('post', x, y, POST_W * 0.7); });
    inst.castShadow = true;
    group.add(inst);
  }
  return group;
}

// The canopies of streamed tiles (the province's: derive_tiles.mjs puts platform
// roofs and building=roof in the tile's canopies section) come and go with
// their tile, as buildCanopies draws the city's.
export function streamCanopies(scene, map) {
  if (!map.onTiles) return;
  const live = new Map();
  const drop = (key) => {
    const e = live.get(key);
    if (!e) return;
    live.delete(key);
    scene.remove(e.group);
    e.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    for (const p of e.props) removeProp(p);
  };
  map.onTiles((kind, tile, key) => {
    if (kind === 'drop') { drop(key); return; }
    const sec = tile.sections.find((q) => q.type === SECTION.CANOPIES);
    if (!sec || !sec.rows.length) return;
    drop(key);
    const props = [];
    const group = canopyGroup(map, sec.rows, props);
    scene.add(group);
    live.set(key, { group, props });
  });
}
