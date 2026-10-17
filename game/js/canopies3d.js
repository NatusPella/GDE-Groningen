import * as THREE from 'three';
import { closestPointOnSegment } from './util.js';
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

function nearLine(P, x, y, r) {
  for (let i = 0; i < P.length - 1; i++) {
    if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < r * r) return true;
  }
  return false;
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
  const posts = [];
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
    geo.translate(0, CANOPY_Y + SLAB, 0);
    const slab = new THREE.Mesh(geo, slabMat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const len = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.round(len / POST_SPACING));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        if (!postInTheWay(map, px, py)) posts.push([px, py]);
      }
    }
  }
  if (posts.length) {
    const geo = new THREE.BoxGeometry(POST_W, CANOPY_Y, POST_W);
    geo.translate(0, CANOPY_Y / 2, 0);
    const inst = new THREE.InstancedMesh(geo, postMat, posts.length);
    const m = new THREE.Matrix4();
    posts.forEach(([x, y], i) => { m.makeTranslation(x, 0, y); inst.setMatrixAt(i, m); solid('post', x, y, POST_W * 0.7); });
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
