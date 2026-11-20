// Vlakgeometrie uit een polygoon (water, groen): earcut met een rasterterugval voor
// zelfdoorsnijdende contouren. Afgesplitst uit scene3d.js (#497), zonder inhoudelijke
// wijziging: dezelfde namen, dezelfde volgorde, dezelfde commentaren.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pointInPolygon, polygonBounds } from '../util.js';

function shapeFromPoly(pts) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
  return shape;
}

// Grid-tessellated fallback fill, same robust technique terrain3d.js already
// uses to cut real water holes: tile the polygon's own bbox and keep only
// triangles whose centroid passes a plain point-in-polygon test. Immune to
// the self-intersection assumption ShapeGeometry/earcut needs - which some
// real water/green polygons violate on purpose (e.g. a canal "ring" like
// the Diepenring, whose point list traces the outer edge forward then the
// inner edge backward specifically so the ray-cast tests used everywhere
// else in this codebase read it as a ring with a hole).
function buildGridFillGeometry(pts) {
  const [minx, miny, maxx, maxy] = polygonBounds(pts);
  const w = Math.max(maxx - minx, 1e-3), d = Math.max(maxy - miny, 1e-3);
  const targetSegs = 80;
  const cell = Math.max(w, d) / targetSegs;
  const segsX = Math.max(1, Math.round(w / cell));
  const segsZ = Math.max(1, Math.round(d / cell));
  const nx = segsX + 1, nz = segsZ + 1;

  const positions = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) {
    const wy = miny + (d * j) / segsZ;
    for (let i = 0; i < nx; i++) {
      const wx = minx + (w * i) / segsX;
      const idx = (j * nx + i) * 3;
      positions[idx] = wx; positions[idx + 1] = 0; positions[idx + 2] = wy;
    }
  }

  const maxTriangles = segsX * segsZ * 2;
  const indices = new Uint32Array(maxTriangles * 3);
  let indexCount = 0;
  for (let j = 0; j < segsZ; j++) {
    for (let i = 0; i < segsX; i++) {
      const a = j * nx + i, b = j * nx + i + 1, c = (j + 1) * nx + i, dd = (j + 1) * nx + i + 1;
      const ax = positions[a * 3], ay = positions[a * 3 + 2];
      const bx = positions[b * 3], by = positions[b * 3 + 2];
      const cx = positions[c * 3], cy = positions[c * 3 + 2];
      const dx = positions[dd * 3], dy = positions[dd * 3 + 2];

      const cx1 = (ax + cx + bx) / 3, cy1 = (ay + cy + by) / 3;
      if (pointInPolygon(cx1, cy1, pts)) { indices[indexCount++] = a; indices[indexCount++] = c; indices[indexCount++] = b; }

      const cx2 = (bx + cx + dx) / 3, cy2 = (by + cy + dy) / 3;
      if (pointInPolygon(cx2, cy2, pts)) { indices[indexCount++] = b; indices[indexCount++] = c; indices[indexCount++] = dd; }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexCount), 1));
  geo.computeBoundingSphere();
  return geo;
}

// earcut (via ShapeGeometry) silently collapses to a near-empty mesh on a
// self-intersecting contour instead of throwing - caught here by checking
// the triangulated vertex count against the input point count, since a
// healthy triangulation never drops points. Falls back to the grid fill
// above only for the rare polygons that actually need it; the cheap earcut
// path stays the default for every ordinary simple polygon (most ponds/
// parks), since building a full grid per polygon is needlessly expensive.
export function buildPolyGeometry(pts) {
  const shape = shapeFromPoly(pts);
  const geo = new THREE.ShapeGeometry(shape);
  if (geo.attributes.position.count < pts.length * 0.5) {
    geo.dispose();
    return buildGridFillGeometry(pts);
  }
  geo.rotateX(-Math.PI / 2);
  return geo;
}
