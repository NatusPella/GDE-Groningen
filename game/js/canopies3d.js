import * as THREE from 'three';
import { closestPointOnSegment } from './util.js';
import { addStaticCollider } from './breakables.js';

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
  const group = new THREE.Group();
  const posts = [];
  for (const c of map.canopies || []) {
    const pts = c.pts[0][0] === c.pts[c.pts.length - 1][0] && c.pts[0][1] === c.pts[c.pts.length - 1][1] ? c.pts.slice(0, -1) : c.pts;
    if (pts.length < 3) continue;
    // a canopy with its own model (thuis3d.js: the petrol station) brings its own columns
    if (c.custom) {
      const own = c.custom(map);
      group.add(own.group);
      for (const [x, y] of own.posts) addStaticCollider('post', x, y, 0.3);
      for (const i of own.islands) addStaticCollider('post', i.p[0], i.p[1], 0.6, i.half, i.angle);
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
    posts.forEach(([x, y], i) => { m.makeTranslation(x, 0, y); inst.setMatrixAt(i, m); addStaticCollider('post', x, y, POST_W * 0.7); });
    inst.castShadow = true;
    group.add(inst);
  }
  return group;
}
