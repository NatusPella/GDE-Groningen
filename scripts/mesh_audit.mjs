// Mesh QA on the generated city: builds the real road, structure, quay,
// water, terrain and track meshes (the game's own generators, in Node) and
// rasterises them top-down at 0.25 m to find
//   (a) gaps     joint     wedges where two ways meet end to end (road and
//                          sidewalk ribbons cut square, a crack on the outside of the bend)
//                void      holes to the void: dry ground with no surface at all
//                          (terrain cut away round water and cuttings, nothing over it)
//                floating  edges of roads, sidewalks and track beds hanging in the
//                          air: more than 0.25 m above what is below, no face under them
//                base      buildings floating over water or sunk into raised ground
//                seam      the city terrain against the Ommeland ground ring
//   (b) passages solid / hole   ways drawn through a building without an opening
//                          (incl. tunnel/layer ways drawn at street level), low portals
//   (c) z-fight  road      coplanar ground ribbons with the same polygon offset and a
//                          different look (material, or a per-road pattern)
//                mark      overlapping paint of different kinds in one marking layer
//                poke      quay coping sticking up through a street or sidewalk
//                roof      overlapping footprints with the same roof height
//                water     overlapping water polygons
//   node scripts/mesh_audit.mjs [--json] [--list[=check]] [--top=N] [--area=x0,y0,x1,y1]
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';
import fs from 'node:fs';

const args = process.argv.slice(2);
const has = (k) => args.some((a) => a === '--' + k || a.startsWith('--' + k + '='));
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const TOP = +opt('top', 12);
const LIST = has('list') ? (opt('list', '') || 'all') : null;
const PROBE_AT = opt('probe', '') ? opt('probe').split(';').map((p) => p.split(',').map(Number)) : [];
const AREA = opt('area', '') ? opt('area').split(',').map(Number) : PROBE_AT.length ? [Math.min(...PROBE_AT.map((p) => p[0])) - 30, Math.min(...PROBE_AT.map((p) => p[1])) - 30, Math.max(...PROBE_AT.map((p) => p[0])) + 30, Math.max(...PROBE_AT.map((p) => p[1])) + 30] : null;
const T0 = Date.now();
const log = (...a) => { if (!has('json')) console.error(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a); };

const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
// (entered through player.js like the game does: landmarks3d.js, thuis3d.js and
// marktgebouwen.js import each other round breakables.js, other entries hit a TDZ)
await import('../game/js/player.js');
const MB = await import('../game/js/models3d_buildings.js');
const { pointInPolygon, closestPointOnSegment, WATER_Y } = await import('../game/js/util.js');
const { buildRoadGroup, setRoadNetwork } = await import('../game/js/roadsurface.js');
const { buildShore } = await import('../game/js/quaywalls.js');
const { buildWaterGeometry } = await import('../game/js/water3d.js');
const { getWaterIndex } = await import('../game/js/waterindex.js');
const { buildTerrainMesh3D } = await import('../game/js/terrain3d.js');
const { countryRect } = await import('../game/js/countryfield.js');
const { openCutMask } = await import('../game/js/elevation.js');
const { buildRailDecks } = await import('../game/js/roadstructures3d.js');
const { setBuildingMap, sanitizeFootprint, HOUSEBOAT_BASE_Y } = MB;
// (older trees: walls always from street level, houseboats sunk)
const buildingBase = MB.buildingBase || ((b) => (b.type === 'houseboat' ? HOUSEBOAT_BASE_Y : 0));
const { passagesOf, runsInside, classifyRun } = await import('../game/js/passages.js');
const { passageHeight } = await import('../game/js/portalcut3d.js');
const THREE = await import('three');
const WATER_MAT = new THREE.MeshBasicMaterial({ transparent: true });

// true triangle total: every triangle the generators emit, per category,
// counted per drawn mesh (instanced meshes times their instance count)
const TRIS = {};
function triCount(root) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const g = o.geometry, all = g.index ? g.index.count : g.attributes.position.count;
    const drawn = Math.min(all, g.drawRange.count) - Math.min(all, g.drawRange.start);
    n += Math.floor(drawn / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return n;
}
const tally = (cat, root) => { if (root) TRIS[cat] = (TRIS[cat] || 0) + triCount(root); };
// triangles of a .glb, from its JSON chunk (meshes under the scene's nodes)
function glbTris(file) {
  const buf = fs.readFileSync(file);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));
  let n = 0;
  const visit = (i) => {
    const node = json.nodes[i];
    if (node.mesh !== undefined) {
      for (const p of json.meshes[node.mesh].primitives) {
        if (p.mode !== undefined && p.mode !== 4) continue;
        n += Math.floor(json.accessors[p.indices !== undefined ? p.indices : p.attributes.POSITION].count / 3);
      }
    }
    for (const c of node.children || []) visit(c);
  };
  for (const i of json.scenes[json.scene || 0].nodes) visit(i);
  return n;
}

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
setRoadNetwork(map);
setBuildingMap(map);
log('map loaded');
// home.js prepareHomeMap reshapes the House of Groningen when the game loads
const isHome = (b) => b.h >= 12 && pointInPolygon(-1289.19, -1082.05, b.pts);
const inArea = (x, y) => !AREA || (x >= AREA[0] && x <= AREA[2] && y >= AREA[1] && y <= AREA[3]);
const near = (bb, pad = 0) => !AREA || (bb[2] >= AREA[0] - pad && bb[0] <= AREA[2] + pad && bb[3] >= AREA[1] - pad && bb[1] <= AREA[3] + pad);

const results = {};
const offenders = {};
function note(check, item) { (offenders[check] || (offenders[check] = [])).push(item); }

// ------------------------------------------------------------------ sources

const CS = 0.25;
const TILE = 50;
const NC = TILE / CS;
const MARGIN = 8;
const W = NC + MARGIN * 2;
const K = 8;
const ZEPS = 0.003;

// materials: polygon offset and how their look depends on the way they belong to
const mats = [];
const matId = new Map();
const SURF_NAMES = { SURF_ASPHALT: 'asphalt', SURF_CYCLE: 'cycle', SURF_KLINKER: 'klinker', SURF_TILES: 'tiles', SURF_GRAVEL: 'gravel', SURF_MARKING: 'marking' };
function matOf(m, hint) {
  let id = matId.get(m);
  if (id !== undefined) return id;
  const defs = m.defines || {};
  let name = hint, ownerJz = 0;
  for (const [d, n] of Object.entries(SURF_NAMES)) {
    if (d in defs) {
      name = n + ('KLINKER_RED' in defs ? '_red' : '') + '@' + (-m.polygonOffsetFactor);
      // patterns tied to the way's own along/across coordinates, faded out near its junction ends
      ownerJz = n === 'asphalt' || n === 'klinker' ? 1 : n === 'tiles' ? 2.5 : 0;
    }
  }
  if (hint === 'water') ownerJz = -1;
  id = mats.length;
  mats.push({ name, factor: m.polygonOffset ? m.polygonOffsetFactor : 0, units: m.polygonOffset ? m.polygonOffsetUnits : 0, ownerJz, double: m.side === THREE.DoubleSide });
  matId.set(m, id);
  return id;
}

// kinds: road walk mark struct quay apron water terrain bed embank deck bldg
const SRC = [];
function addMesh(mesh, kind, owner, hint) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes.position || mesh.isInstancedMesh) return null;
  const pa = geo.attributes.position, e = mesh.matrixWorld.elements;
  const n = pa.count;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = pa.getX(i) + e[12];
    pos[i * 3 + 1] = pa.getY(i) + e[13];
    pos[i * 3 + 2] = pa.getZ(i) + e[14];
  }
  const idx = geo.index ? geo.index.array : null;
  const tris = (idx ? idx.length : n) / 3;
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const mat = matOf(m, hint || kind);
  const s = { kind, owner, mat, pos, idx, tris };
  const M = mats[mat];
  if (M.ownerJz > 0 && geo.attributes.aSurf) {
    const a = geo.attributes.aSurf.array, b = geo.attributes.aSurfEnd.array;
    s.jz = new Float32Array(n);
    for (let i = 0; i < n; i++) s.jz[i] = Math.min(a[i * 4 + 1] - a[i * 4 + 3], b[i] - a[i * 4 + 1]);
  }
  // kerb vertices (negative carriageway width in aSurf) and where along the way each vertex lies
  if ((kind === 'walk' || kind === 'road') && geo.attributes.aSurf) {
    const a = geo.attributes.aSurf.array;
    s.kerb = new Uint8Array(n);
    s.along = new Float32Array(n);
    for (let i = 0; i < n; i++) { s.kerb[i] = a[i * 4 + 2] < 0 ? 1 : 0; s.along[i] = a[i * 4 + 1]; }
  }
  if (kind === 'mark' && geo.attributes.uv) s.paint = paintClasses(geo, tris);
  SRC.push(s);
  return s;
}
const triIdx = (s, t, k) => (s.idx ? s.idx[t * 3 + k] : t * 3 + k);

// paint of each marking triangle: 1 white, 2 red (bus lane), 3 manhole, 4 grate, 5 bike, 6 BUS
function paintClasses(geo, tris) {
  const uv = geo.attributes.uv.array, idx = geo.index ? geo.index.array : null;
  const out = new Uint8Array(tris);
  for (let t = 0; t < tris; t++) {
    const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
    const ua = uv[a * 2], va = uv[a * 2 + 1], ub = uv[b * 2], vb = uv[b * 2 + 1], uc = uv[c * 2], vc = uv[c * 2 + 1];
    const area = Math.abs((ub - ua) * (vc - va) - (vb - va) * (uc - ua));
    const u = (ua + ub + uc) / 3, v = (va + vb + vc) / 3;
    if (area < 1e-9) out[t] = v > 0.7 ? 1 : 2;
    else if (u >= 0.5) out[t] = v >= 0.5 ? 3 : 5;
    else out[t] = v >= 0.5 ? 6 : 4;
  }
  return out;
}

function addGroup(root, kind, owner, hintOf) {
  if (!root) return;
  root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isMesh) addMesh(o, typeof kind === 'function' ? kind(o) : kind, owner, hintOf && hintOf(o)); });
}

// roads: sidewalk + kerbs, carriageway, markings, structures
const ROAD_SRC = new Map();
for (const r of map.roads) {
  if (!near(r.bounds, 20)) continue;
  const g = buildRoadGroup(r);
  tally('roads', g);
  g.updateMatrixWorld(true);
  const list = [];
  for (const c of g.children) {
    if (c.isMesh) {
      const m = c.material;
      const kind = m.defines && 'SURF_MARKING' in m.defines ? 'mark' : c.geometry === r._geoSidewalk ? 'walk' : 'road';
      list.push(addMesh(c, kind, r));
    } else addGroup(c, 'struct', r, (o) => 'struct:' + o.material.color.getHexString());
  }
  ROAD_SRC.set(r, list);
}
{
  const decks = buildRailDecks(map);
  tally('rail decks', decks);
  addGroup(decks, 'struct', null, () => 'struct:raildeck');
}
log('roads built', SRC.length, 'meshes');

// terrain (only where it has holes: round water and over open cuttings)
const terrain = buildTerrainMesh3D(map.meta.bounds, map.water);
terrain.updateMatrixWorld(true);
tally('terrain', terrain);
const terrainMat = matOf(terrain.material, 'terrain');
const index = getWaterIndex(map);
for (const w of map.water) {
  if (!near(w.bounds, 20)) continue;
  const shore = buildShore(w, map, { waterY: WATER_Y, apronMaterial: terrain.material });
  if (shore) {
    tally('quays and banks', shore);
    shore.updateMatrixWorld(true);
    shore.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      if (m === terrain.material) addMesh(o, 'apron', w);
      else if (m.map) addMesh(o, 'quay', w, 'quay:wall');
      else if (m.side === THREE.DoubleSide || m.transparent || m.emissive && m.emissive.getHex() === 0xffb760) return; // extras, glass
      else addMesh(o, 'quay', w, 'quay:stone');
    });
  }
  const wm = new THREE.Mesh(buildWaterGeometry(w, index), WATER_MAT);
  wm.position.y = WATER_Y;
  wm.updateMatrixWorld(true);
  tally('water', wm);
  addMesh(wm, 'water', w, 'water');
}
log('shore and water built');

// track beds (railway3d)
try {
  const rw = await import('../game/js/railway.js');
  rw.initRailway({ map, vehicles: [], pedestrians: [], player: { x: 0, y: 0 }, time: 0 });
  const r3 = await import('../game/js/railway3d.js');
  if (!r3.buildTrackMeshes) throw new Error('railway3d.js has no buildTrackMeshes');
  for (const g of r3.buildTrackMeshes(map)) {
    tally('track', g);
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      const m = o.material;
      const kind = m.vertexColors ? null : m.polygonOffset && m.color.getHex() === 0x6f675d ? 'bed' : m.polygonOffset ? 'embank' : 'deck';
      if (kind) addMesh(o, kind, null, 'rail:' + kind);
    });
  }
  log('track built');
} catch (e) {
  log('track skipped:', e.message);
}

// footprints: cover (nothing under a building is a hole) and the base check
const BLD = [];
for (const b of map.buildings) {
  if (b.hidden || !near(b.bounds, 10)) continue;
  const ring = sanitizeFootprint(b.pts).pts;
  const contour = ring.map(([x, y]) => new THREE.Vector2(x, y));
  let tris;
  try { tris = THREE.ShapeUtils.triangulateShape(contour, []); } catch (e) { continue; }
  BLD.push({ b, ring, tris });
}
log('footprints', BLD.length);

// building meshes (procedural; the one .glb landmark counted from its file)
{
  const { buildBuildingMesh } = MB;
  const glb = { Martinitoren: new URL('models/martinitoren.glb', root) };
  for (const b of map.buildings) {
    if (b.hidden || !near(b.bounds, 10)) continue;
    if (b.landmark && glb[b.name] && fs.existsSync(glb[b.name])) { TRIS.buildings = (TRIS.buildings || 0) + glbTris(glb[b.name]); continue; }
    try { tally('buildings', buildBuildingMesh(b)); } catch (e) { TRIS.buildingErrors = (TRIS.buildingErrors || 0) + 1; }
  }
  try { tally('canopies', (await import('../game/js/canopies3d.js')).buildCanopies(map)); } catch (e) { log('canopies skipped:', e.message); }
  TRIS.total = Object.entries(TRIS).reduce((a, [k, v]) => (k === 'buildingErrors' ? a : a + v), 0);
  results.triangles = TRIS;
  log('triangles', TRIS.total);
}

// ------------------------------------------------------------------ tiles

let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
for (const s of SRC) {
  const p = s.pos;
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < X0) X0 = p[i];
    if (p[i] > X1) X1 = p[i];
    if (p[i + 2] < Y0) Y0 = p[i + 2];
    if (p[i + 2] > Y1) Y1 = p[i + 2];
  }
}
X0 = Math.floor(X0 / TILE) * TILE; Y0 = Math.floor(Y0 / TILE) * TILE;
const TX = Math.ceil((X1 - X0) / TILE) + 1, TY = Math.ceil((Y1 - Y0) / TILE) + 1;
const tileOf = (x, y) => {
  const tx = Math.floor((x - X0) / TILE), ty = Math.floor((y - Y0) / TILE);
  return tx < 0 || ty < 0 || tx >= TX || ty >= TY ? -1 : ty * TX + tx;
};

// tiles where the terrain has holes (water, cuttings): terrain is drawn there for real
const holeTiles = new Uint8Array(TX * TY);
const markRect = (x0, y0, x1, y1) => {
  for (let ty = Math.max(0, Math.floor((y0 - Y0) / TILE)); ty <= Math.min(TY - 1, Math.floor((y1 - Y0) / TILE)); ty++) {
    for (let tx = Math.max(0, Math.floor((x0 - X0) / TILE)); tx <= Math.min(TX - 1, Math.floor((x1 - X0) / TILE)); tx++) holeTiles[ty * TX + tx] = 1;
  }
};
for (const w of map.water) markRect(w.bounds[0] - 8, w.bounds[1] - 8, w.bounds[2] + 8, w.bounds[3] + 8);
const cut = map.elev && openCutMask(map.elev);
if (cut) markRect(cut.x0, cut.y0, cut.x0 + cut.w * cut.res, cut.y0 + cut.h * cut.res);
function cutMasked(x, y) {
  if (!cut) return false;
  const fx = (x - cut.x0) / cut.res, fy = (y - cut.y0) / cut.res;
  const i = Math.floor(fx), j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= cut.w - 1 || j >= cut.h - 1) return false;
  const tx = fx - i, ty = fy - j, d = cut.data, w = cut.w;
  const v = (d[j * w + i] * (1 - tx) + d[j * w + i + 1] * tx) * (1 - ty) + (d[(j + 1) * w + i] * (1 - tx) + d[(j + 1) * w + i + 1] * tx) * ty;
  return v / 255 > 0.75;
}
{
  const pos = terrain.children[0].geometry.attributes.position.array;
  const ty = terrain.position.y;
  const tpos = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) { tpos[i] = pos[i]; tpos[i + 1] = pos[i + 1] + ty; tpos[i + 2] = pos[i + 2]; }
  const keep = [];
  for (const c of terrain.children) {
    const ix = c.geometry.index.array;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
      const x0 = Math.min(tpos[a], tpos[b], tpos[c]) - MARGIN * CS, x1 = Math.max(tpos[a], tpos[b], tpos[c]) + MARGIN * CS;
      const y0 = Math.min(tpos[a + 2], tpos[b + 2], tpos[c + 2]) - MARGIN * CS, y1 = Math.max(tpos[a + 2], tpos[b + 2], tpos[c + 2]) + MARGIN * CS;
      if (holeTiles[tileOf(x0, y0)] || holeTiles[tileOf(x1, y0)] || holeTiles[tileOf(x0, y1)] || holeTiles[tileOf(x1, y1)]) keep.push(ix[t], ix[t + 1], ix[t + 2]);
    }
  }
  SRC.push({ kind: 'terrain', owner: null, mat: terrainMat, pos: tpos, idx: Uint32Array.from(keep), tris: keep.length / 3 });
}
const BLDSRC = SRC.length;

// bin every triangle into the tiles its box touches (plus the margin)
function binTris() {
  const counts = new Int32Array(TX * TY + 1);
  const pass = (fill, cursor, outS, outT) => {
    const pad = MARGIN * CS;
    const visit = (si, t, xs, ys) => {
      const x0 = Math.min(xs[0], xs[1], xs[2]) - pad, x1 = Math.max(xs[0], xs[1], xs[2]) + pad;
      const y0 = Math.min(ys[0], ys[1], ys[2]) - pad, y1 = Math.max(ys[0], ys[1], ys[2]) + pad;
      const tx0 = Math.max(0, Math.floor((x0 - X0) / TILE)), tx1 = Math.min(TX - 1, Math.floor((x1 - X0) / TILE));
      const ty0 = Math.max(0, Math.floor((y0 - Y0) / TILE)), ty1 = Math.min(TY - 1, Math.floor((y1 - Y0) / TILE));
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const k = ty * TX + tx;
          if (!fill) counts[k]++;
          else { const at = cursor[k]++; outS[at] = si; outT[at] = t; }
        }
      }
    };
    const xs = [0, 0, 0], ys = [0, 0, 0];
    SRC.forEach((s, si) => {
      for (let t = 0; t < s.tris; t++) {
        for (let k = 0; k < 3; k++) { const v = triIdx(s, t, k) * 3; xs[k] = s.pos[v]; ys[k] = s.pos[v + 2]; }
        visit(si, t, xs, ys);
      }
    });
    BLD.forEach((B, bi) => {
      for (let t = 0; t < B.tris.length; t++) {
        for (let k = 0; k < 3; k++) { const p = B.ring[B.tris[t][k]]; xs[k] = p[0]; ys[k] = p[1]; }
        visit(-1 - bi, t, xs, ys);
      }
    });
  };
  pass(false);
  const start = new Int32Array(TX * TY + 1);
  for (let k = 0; k < TX * TY; k++) start[k + 1] = start[k] + counts[k];
  const total = start[TX * TY];
  const outS = new Int32Array(total), outT = new Int32Array(total);
  const cursor = start.slice();
  pass(true, cursor, outS, outT);
  return { start, outS, outT, total };
}
const BINS = binTris();
log('binned', BINS.total, 'triangle refs in', TX * TY, 'tiles');

// ------------------------------------------------------------------ probes (edges and building outlines)

// boundary edges of the walkable / drivable top surfaces, sampled every 0.5 m
const PROBE_KINDS = new Set(['road', 'walk', 'bed']);
const probes = [];  // [x, y, h, nx, ny, srcIndex]
SRC.forEach((s, si) => {
  if (!PROBE_KINDS.has(s.kind) || !s.idx) return;
  const P = s.pos, edges = new Map();
  for (let t = 0; t < s.tris; t++) {
    const v = [s.idx[t * 3], s.idx[t * 3 + 1], s.idx[t * 3 + 2]];
    if (!upFacing(P, v[0], v[1], v[2])) continue;
    for (let k = 0; k < 3; k++) {
      const a = v[k], b = v[(k + 1) % 3], c = v[(k + 2) % 3];
      const key = a < b ? a * 4194304 + b : b * 4194304 + a;
      const e = edges.get(key);
      if (e) e.n++; else edges.set(key, { a, b, c, n: 1 });
    }
  }
  for (const { a, b, c, n } of edges.values()) {
    if (n !== 1 || (s.kerb && (s.kerb[a] || s.kerb[b]))) continue;
    const ax = P[a * 3], ay = P[a * 3 + 2], ah = P[a * 3 + 1], bx = P[b * 3], by = P[b * 3 + 2], bh = P[b * 3 + 1];
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 0.05) continue;
    let nx = -(by - ay) / L, ny = (bx - ax) / L;
    if ((P[c * 3] - ax) * nx + (P[c * 3 + 2] - ay) * ny > 0) { nx = -nx; ny = -ny; }
    const k = Math.max(1, Math.round(L));
    for (let i = 0; i < k; i++) {
      const t = (i + 0.5) / k;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      if (inArea(x, y)) probes.push([x, y, ah + (bh - ah) * t, nx, ny, si, L / k]);
    }
  }
});
function upFacing(P, a, b, c) {
  const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
  const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return Math.abs(ny) > 0.3 * Math.hypot(nx, ny, nz);
}
const probesByTile = new Map();
probes.forEach((p, i) => { const k = tileOf(p[0], p[1]); (probesByTile.get(k) || probesByTile.set(k, []).get(k)).push(i); });

// outline samples 0.3 m outside every wall
const baseProbes = [];  // [x, y, base, buildingIndex]
BLD.forEach((B, bi) => {
  const { b, ring } = B;
  if (isHome(b)) return;
  const base = buildingBase(b);
  // a houseboat lies against the quay: only one that is mostly on land counts
  if (base < -1) {
    let land = 0, n = 0;
    for (let x = b.bounds[0] + 0.5; x < b.bounds[2]; x += 1) for (let y = b.bounds[1] + 0.5; y < b.bounds[3]; y += 1) {
      if (!pointInPolygon(x, y, ring)) continue;
      n++;
      if (!map.inWaterRaw(x, y)) land++;
    }
    if (!n || land / n < 0.5) return;
  }
  // facades by the water stand on a foundation down below the waterline
  const found = MB.buildingFoundation && MB.buildingFoundation(b);
  const wetAt = new Set();
  if (found) found.edges.forEach((e, i) => { if (found.wet[i]) wetAt.add(e.ax + ',' + e.ay); });
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[(i + 1) % ring.length];
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 0.5) continue;
    const edgeBase = found ? (wetAt.has(ax + ',' + ay) ? found.y : 0) : base;
    let nx = -(by - ay) / L, ny = (bx - ax) / L;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    if (pointInPolygon(mx + nx * 0.3, my + ny * 0.3, ring)) { nx = -nx; ny = -ny; }
    const k = Math.max(1, Math.round(L));
    for (let j = 0; j < k; j++) {
      const t = (j + 0.5) / k;
      const x = ax + (bx - ax) * t + nx * 0.3, y = ay + (by - ay) * t + ny * 0.3;
      if (inArea(x, y)) baseProbes.push([x, y, edgeBase, bi, L / k, nx, ny]);
    }
  }
});
const baseByTile = new Map();
baseProbes.forEach((p, i) => { const k = tileOf(p[0], p[1]); (baseByTile.get(k) || baseByTile.set(k, []).get(k)).push(i); });
log('probes', probes.length, 'edge samples,', baseProbes.length, 'outline samples');

// ------------------------------------------------------------------ raster

const cellN = new Uint8Array(W * W);
const cellH = new Float32Array(W * W * K);
const cellS = new Int32Array(W * W * K);
const cellF = new Uint8Array(W * W * K);   // 1 up, 2 own pattern active, 4.. paint << 2
const cover = new Uint8Array(W * W);
let ox = 0, oy = 0, isHoleTile = false, tileCut = false;

function insert(c, h, si, fl) {
  let n = cellN[c];
  const base = c * K;
  let at = n;
  while (at > 0 && cellH[base + at - 1] < h) at--;
  if (n === K) {
    if (at === K) return;
    n = K - 1;
  }
  for (let q = n; q > at; q--) { cellH[base + q] = cellH[base + q - 1]; cellS[base + q] = cellS[base + q - 1]; cellF[base + q] = cellF[base + q - 1]; }
  cellH[base + at] = h; cellS[base + at] = si; cellF[base + at] = fl;
  cellN[c] = n + 1;
}

const steep = [];  // per tile: [srcIndex, tri]
function rasterSource(si, t) {
  const s = SRC[si], P = s.pos;
  const a = triIdx(s, t, 0), b = triIdx(s, t, 1), c = triIdx(s, t, 2);
  if (!upFacing(P, a, b, c)) { if (s.kind !== 'terrain') steep.push(si, t); return; }
  const ax = (P[a * 3] - ox) / CS, ay = (P[a * 3 + 2] - oy) / CS, ah = P[a * 3 + 1];
  const bx = (P[b * 3] - ox) / CS, by = (P[b * 3 + 2] - oy) / CS, bh = P[b * 3 + 1];
  const cx = (P[c * 3] - ox) / CS, cy = (P[c * 3 + 2] - oy) / CS, ch = P[c * 3 + 1];
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < 1e-9) return;
  const i0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)), i1 = Math.min(W - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
  const j0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)), j1 = Math.min(W - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
  if (i0 > i1 || j0 > j1) return;
  const inv = 1 / area, eps = -1e-7;
  const M = mats[s.mat];
  const masked = s.kind === 'terrain' && tileCut;
  const jz = s.jz, thr = M.ownerJz;
  const fl0 = 1 | (s.paint ? s.paint[t] << 2 : 0) | (thr < 0 ? 2 : 0);
  const jza = jz ? jz[a] : 0, jzb = jz ? jz[b] : 0, jzc = jz ? jz[c] : 0;
  // barycentrics step linearly across the cells
  const d0x = (by - cy) * inv, d0y = (cx - bx) * inv, d1x = (cy - ay) * inv, d1y = (ax - cx) * inv;
  const ha = ah - ch, hb = bh - ch;
  for (let j = j0; j <= j1; j++) {
    const py = j + 0.5, px0 = i0 + 0.5;
    let w0 = ((bx - px0) * (cy - py) - (by - py) * (cx - px0)) * inv;
    let w1 = ((cx - px0) * (ay - py) - (cy - py) * (ax - px0)) * inv;
    const row = j * W;
    for (let i = i0; i <= i1; i++, w0 += d0x, w1 += d1x) {
      if (w0 < eps || w1 < eps || 1 - w0 - w1 < eps) continue;
      if (masked && cutMasked(ox + (i + 0.5) * CS, oy + py * CS)) continue;
      let fl = fl0;
      if (jz && w0 * jza + w1 * jzb + (1 - w0 - w1) * jzc > thr) fl |= 2;
      const c = row + i, h = ch + w0 * ha + w1 * hb;
      if (cellN[c] === 0) { const k = c * K; cellH[k] = h; cellS[k] = si; cellF[k] = fl; cellN[c] = 1; }
      else insert(c, h, si, fl);
    }
  }
}

function rasterCover(bi, t) {
  const B = BLD[bi], tri = B.tris[t];
  const p = tri.map((k) => B.ring[k]);
  const ax = (p[0][0] - ox) / CS, ay = (p[0][1] - oy) / CS, bx = (p[1][0] - ox) / CS, by = (p[1][1] - oy) / CS, cx = (p[2][0] - ox) / CS, cy = (p[2][1] - oy) / CS;
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < 1e-9) return;
  const inv = 1 / area;
  const i0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)), i1 = Math.min(W - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
  const j0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)), j1 = Math.min(W - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const px = i + 0.5, py = j + 0.5;
      const w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) * inv;
      const w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) * inv;
      if (w0 >= 0 && w1 >= 0 && 1 - w0 - w1 >= 0) cover[j * W + i] = 1;
    }
  }
}

const cellAt = (x, y) => {
  const i = Math.floor((x - ox) / CS), j = Math.floor((y - oy) / CS);
  return i < 0 || j < 0 || i >= W || j >= W ? -1 : j * W + i;
};

// highest top surface at or below h at (x, y), or null for none (the void)
let groundKind = null;
function groundBelow(x, y, h, skip = -1) {
  const c = cellAt(x, y);
  groundKind = null;
  if (c < 0) return null;
  const base = c * K;
  for (let q = 0; q < cellN[c]; q++) {
    if (cellH[base + q] <= h && cellS[base + q] !== skip) { groundKind = SRC[cellS[base + q]].kind; return cellH[base + q]; }
  }
  groundKind = 'terrain';
  return isHoleTile ? null : -0.05;
}

// does the surface of source si lie in the cell at (x, y), level with h?
function onSource(x, y, si, h) {
  const c = cellAt(x, y);
  if (c < 0) return false;
  for (let q = 0; q < cellN[c]; q++) if (cellS[c * K + q] === si && Math.abs(cellH[c * K + q] - h) < 0.05) return true;
  return false;
}

// a near-vertical face at the edge (x, y): hanging below it (h - 0.04 to
// h - 0.25) or rising beside it (a wall, h + 0.02 to h + 0.3)
function faceBelow(x, y, h, nx, ny) {
  const px = x + nx * 0.05, py = y + ny * 0.05;
  const bi = Math.floor((px - ox) / SB), bj = Math.floor((py - oy) / SB);
  if (bi < 0 || bj < 0 || bi >= SW || bj >= SW) return false;
  for (const q of sbuckets[bj * SW + bi]) {
    const s = SRC[steep[q]], P = s.pos, t = steep[q + 1];
    const a = triIdx(s, t, 0) * 3, b = triIdx(s, t, 1) * 3, c = triIdx(s, t, 2) * 3;
    const xs = [P[a], P[b], P[c]], ys = [P[a + 2], P[b + 2], P[c + 2]], hs = [P[a + 1], P[b + 1], P[c + 1]];
    if (Math.max(...hs) < h - 0.25 || Math.min(...hs) > h + 0.3) continue;
    if (px < Math.min(...xs) - 0.2 || px > Math.max(...xs) + 0.2 || py < Math.min(...ys) - 0.2 || py > Math.max(...ys) + 0.2) continue;
    // the face's plane, horizontal direction d and plan normal m
    const ux = xs[1] - xs[0], uy = ys[1] - ys[0], uh = hs[1] - hs[0], vx = xs[2] - xs[0], vy = ys[2] - ys[0], vh = hs[2] - hs[0];
    let mx = uh * vy - uy * vh, my = ux * vh - uh * vx;
    const ml = Math.hypot(mx, my);
    if (ml < 1e-9) continue;
    mx /= ml; my /= ml;
    if (Math.abs((px - xs[0]) * mx + (py - ys[0]) * my) > 0.2) continue;
    const dx = -my, dy = mx;
    const up = (px - xs[0]) * dx + (py - ys[0]) * dy;
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      const u0 = (xs[k] - xs[0]) * dx + (ys[k] - ys[0]) * dy, u1 = (xs[k2] - xs[0]) * dx + (ys[k2] - ys[0]) * dy;
      if ((up - u0) * (up - u1) > 0 || Math.abs(u1 - u0) < 1e-9) {
        if (Math.abs(up - u0) < 0.05) { lo = Math.min(lo, hs[k]); hi = Math.max(hi, hs[k]); }
        continue;
      }
      const tt = (up - u0) / (u1 - u0), hh = hs[k] + (hs[k2] - hs[k]) * tt;
      lo = Math.min(lo, hh); hi = Math.max(hi, hh);
    }
    if (Math.min(hi, h - 0.04) - Math.max(lo, h - 0.25) > 0.08 || Math.min(hi, h + 0.3) - Math.max(lo, h + 0.02) > 0.1) return true;
  }
  return false;
}

// z-fighting in one cell: of the surfaces drawn on top (the highest and all
// within ZEPS of it, of those the strongest polygon offset), two that look
// different. Road markings are judged among themselves (they are worn paint
// with holes over the carriageway).
function zfCell(base, n, marks, x, y) {
  let top = null;
  for (let q = 0; q < n; q++) if ((SRC[cellS[base + q]].kind === 'mark') === marks) { top = cellH[base + q]; break; }
  if (top === null) return;
  let bf = Infinity, bu = Infinity;
  for (let q = 0; q < n && cellH[base + q] >= top - ZEPS; q++) {
    const s = SRC[cellS[base + q]];
    if ((s.kind === 'mark') !== marks) continue;
    const M = mats[s.mat];
    if (M.factor < bf || (M.factor === bf && M.units < bu)) { bf = M.factor; bu = M.units; }
  }
  let first = -1;
  for (let q = 0; q < n && cellH[base + q] >= top - ZEPS; q++) {
    const sq = SRC[cellS[base + q]];
    if ((sq.kind === 'mark') !== marks) continue;
    const Mq = mats[sq.mat];
    if (Mq.factor !== bf || Mq.units !== bu) continue;
    if (first < 0) { first = q; continue; }
    const sp = SRC[cellS[base + first]], Mp = mats[sp.mat], fp = cellF[base + first], fq = cellF[base + q];
    // (a bank or wall crossing the water line is an intersection, not two coplanar surfaces)
    if ((sp.kind === 'water') !== (sq.kind === 'water')) continue;
    let differ = sp.mat !== sq.mat || (fp >> 2) !== (fq >> 2);
    if (!differ && sp !== sq && sp.owner !== sq.owner && ((fp | fq) & 2)) differ = true;
    if (!differ) continue;
    const a = Mp.name + (fp >> 2 ? '#' + (fp >> 2) : ''), b = Mq.name + (fq >> 2 ? '#' + (fq >> 2) : '');
    const pairKey = a < b ? a + ' | ' + b : b + ' | ' + a;
    bump(marks ? zf.mark : zf.road, pairKey, CS * CS);
    if (atJunction(x, y)) zfJunction[marks ? 'mark' : 'road'] += CS * CS;
    bump(zfSpots, (marks ? 'mark' : 'road') + '~' + spotKey(x, y) + '~' + pairKey);
    return;
  }
}

// near-vertical triangles of the tile in 2 m buckets
const SB = 2, SW = Math.ceil((W * CS) / SB);
const sbuckets = Array.from({ length: SW * SW }, () => []);
function bucketSteep() {
  for (const b of sbuckets) b.length = 0;
  for (let q = 0; q < steep.length; q += 2) {
    const s = SRC[steep[q]], P = s.pos, t = steep[q + 1];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const v = triIdx(s, t, k) * 3;
      x0 = Math.min(x0, P[v]); x1 = Math.max(x1, P[v]); y0 = Math.min(y0, P[v + 2]); y1 = Math.max(y1, P[v + 2]);
    }
    const i0 = Math.max(0, Math.floor((x0 - 0.3 - ox) / SB)), i1 = Math.min(SW - 1, Math.floor((x1 + 0.3 - ox) / SB));
    const j0 = Math.max(0, Math.floor((y0 - 0.3 - oy) / SB)), j1 = Math.min(SW - 1, Math.floor((y1 + 0.3 - oy) / SB));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) sbuckets[j * SW + i].push(q);
  }
}

const zf = { road: new Map(), mark: new Map() };
// junctions: nodes where three or more arms of different ways meet; a cell
// within 15 m of one counts as at a junction
const zfJunction = { road: 0, mark: 0 };
const JGRID = new Map();
{
  const arms = new Map();
  const k = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);
  for (const r of map.roads) {
    r.pts.forEach((p, i) => {
      const e = arms.get(k(p)) || arms.set(k(p), { p, n: 0, roads: new Set() }).get(k(p));
      e.n += i === 0 || i === r.pts.length - 1 ? 1 : 2;
      e.roads.add(r);
    });
  }
  for (const { p, n, roads } of arms.values()) {
    if (n < 3 || roads.size < 2) continue;
    const g = Math.floor(p[0] / 15) + ',' + Math.floor(p[1] / 15);
    (JGRID.get(g) || JGRID.set(g, []).get(g)).push(p);
  }
}
function atJunction(x, y) {
  const gx = Math.floor(x / 15), gy = Math.floor(y / 15);
  for (let i = gx - 1; i <= gx + 1; i++) for (let j = gy - 1; j <= gy + 1; j++) {
    for (const p of JGRID.get(i + ',' + j) || []) if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < 225) return true;
  }
  return false;
}
const zfSpots = new Map();
let pokeArea = 0;
const pokeSpots = new Map();
const voidCells = [];
const floating = new Map();
const floatSpots = new Map();
const floatOffGrade = new Map();
const baseHits = new Map();   // bi -> { float, sink, void }
const spotKey = (x, y, g = 10) => Math.round(x / g) * g + ',' + Math.round(y / g) * g;
const bump = (m, k, v = 1) => m.set(k, (m.get(k) || 0) + v);

const TERRAIN_SRC = SRC.findIndex((s) => s.kind === 'terrain');
for (let tile = 0; tile < TX * TY; tile++) {
  const b0 = BINS.start[tile], b1 = BINS.start[tile + 1];
  if (b0 === b1 && !probesByTile.has(tile) && !baseByTile.has(tile)) continue;
  const tx = tile % TX, ty = Math.floor(tile / TX);
  ox = X0 + tx * TILE - MARGIN * CS; oy = Y0 + ty * TILE - MARGIN * CS;
  isHoleTile = !!holeTiles[tile];
  if (AREA && (ox > AREA[2] || oy > AREA[3] || ox + W * CS < AREA[0] || oy + W * CS < AREA[1])) continue;
  tileCut = !!cut && ox < cut.x0 + cut.w * cut.res && oy < cut.y0 + cut.h * cut.res && ox + W * CS > cut.x0 && oy + W * CS > cut.y0;
  cellN.fill(0);
  cover.fill(0);
  steep.length = 0;
  for (let q = b0; q < b1; q++) {
    const si = BINS.outS[q];
    if (si < 0) rasterCover(-1 - si, BINS.outT[q]);
    else rasterSource(si, BINS.outT[q]);
  }
  // --probe: a top-down map round each point in this tile (# building, letter:
  // top surface kind, blank: the void)
  for (const [qx, qy] of PROBE_AT) {
    if (qx < ox + MARGIN * CS || qy < oy + MARGIN * CS || qx >= ox + (MARGIN + NC) * CS || qy >= oy + (MARGIN + NC) * CS) continue;
    console.error(`map round ${qx},${qy} (rows +y down, 0.5 m)`);
    for (let y = qy - 6; y <= qy + 6; y += 0.5) {
      let row = '';
      for (let x = qx - 6; x <= qx + 6; x += 0.5) {
        const c = cellAt(x, y);
        row += c < 0 ? '?' : cover[c] ? '#' : cellN[c] ? SRC[cellS[c * K]].kind[0] : isHoleTile ? ' ' : 't';
      }
      console.error('  ' + row);
    }
  }
  // cells of the tile proper
  for (let j = MARGIN; j < MARGIN + NC; j++) {
    for (let i = MARGIN; i < MARGIN + NC; i++) {
      const c = j * W + i, n = cellN[c], base = c * K;
      if (n === 1 || (n === 0 && (!isHoleTile || cover[c]))) continue;
      const x = ox + (i + 0.5) * CS, y = oy + (j + 0.5) * CS;
      if (AREA && !inArea(x, y)) continue;
      if (n === 0) { voidCells.push(Math.round(x / CS), Math.round(y / CS)); continue; }
      // stone poking up through a street or sidewalk
      for (let p = 0; p < n; p++) {
        if (SRC[cellS[base + p]].kind !== 'quay') continue;
        for (let q = p + 1; q < n; q++) {
          const dh = cellH[base + p] - cellH[base + q];
          if (dh >= 0.3) break;
          const k = SRC[cellS[base + q]].kind;
          if ((k === 'road' || k === 'walk') && dh > 0.004) {
            pokeArea += CS * CS;
            bump(pokeSpots, spotKey(x, y));
            if (PROBE_AT.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < 6)) console.error(`poke ${x.toFixed(2)},${y.toFixed(2)} ${cellH[base + p].toFixed(3)} over ${k} ${cellH[base + q].toFixed(3)} ${SRC[cellS[base + q]].owner.name || SRC[cellS[base + q]].owner.type}${SRC[cellS[base + q]].owner.bridge ? ' bridge' : ''}`);
            break;
          }
        }
        break;
      }
      zfCell(base, n, false, x, y);
      zfCell(base, n, true, x, y);
    }
  }
  bucketSteep();
  // --probe=x,y[;x,y]: what lies at a point (debugging the checks)
  for (const [px, py] of PROBE_AT) {
    const c = cellAt(px, py);
    if (tileOf(px, py) !== tile || c < 0) continue;
    const list = [];
    for (let q = 0; q < cellN[c]; q++) {
      const s = SRC[cellS[c * K + q]], o = s.owner;
      list.push(`${cellH[c * K + q].toFixed(3)} ${s.kind} ${mats[s.mat].name} fl${cellF[c * K + q]} ${o ? (o.cat ? `${o.cat}:${o.type} ${o.name || ''}${o.bridge ? ' bridge' : ''}` : o.name || 'water') : ''}`);
    }
    const st = sbuckets[Math.floor((py - oy) / SB) * SW + Math.floor((px - ox) / SB)] || [];
    console.error(`probe ${px},${py} tile hole=${isHoleTile} cover=${cover[c]} steep-near=${st.length}\n  ` + list.join('\n  '));
  }
  // floating edges
  for (const pi of probesByTile.get(tile) || []) {
    const [x, y, h, nx, ny, si, len] = probes[pi];
    const xo = x + nx * 0.12, yo = y + ny * 0.12;
    // something level with the edge beside it (or a few cm over it) closes it
    // (the 0.25 m cell holding that point can still have its centre on this
    // surface, a few cm inside the edge: then 0.3 m out, where a slope down
    // from the edge, like an embankment's, has dropped further)
    const own = onSource(xo, yo, si, h);
    const g = own ? groundBelow(x + nx * 0.3, y + ny * 0.3, h + 0.15, si) : groundBelow(xo, yo, h + 0.15, si);
    if (own && onSource(x + nx * 0.3, y + ny * 0.3, si, h)) continue;
    const drop = h - (g === null ? WATER_Y - 0.5 : g);
    if (drop < (own ? 0.48 : 0.25)) continue;
    if (faceBelow(x, y, h, nx, ny)) continue;
    const kind = SRC[si].kind;
    if (PROBE_AT.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < 12)) console.error(`floating ${kind} ${x.toFixed(1)},${y.toFixed(1)} h ${h.toFixed(2)} n ${nx.toFixed(2)},${ny.toFixed(2)} below ${g === null ? 'void' : g.toFixed(2)} ${SRC[si].owner ? (SRC[si].owner.cat || '') + ':' + (SRC[si].owner.type || '') + ' ' + (SRC[si].owner.name || '') + ' ' + JSON.stringify(SRC[si].owner.pts[0]) : ''}`);
    bump(floating, kind, len);
    // ways with a height profile (the ring, its ramps, viaducts): raised or sunken
    const ow = SRC[si].owner;
    if (ow && ow.z) {
      const zs = ow.z, lo = Math.min(...zs), hi = Math.max(...zs);
      bump(floatOffGrade, lo < -1.5 ? 'sunken' : hi > 1.5 ? 'raised' : 'level', len);
      if (lo < -1.5) bump(floatSpots, 'sunken|' + spotKey(x, y), len);
      else if (hi > 1.5) bump(floatSpots, 'raised|' + spotKey(x, y), len);
    }
    bump(floatSpots, kind + '|' + spotKey(x, y), len);
  }
  // building bases
  for (const pi of baseByTile.get(tile) || []) {
    const [x, y, base, bi, len] = baseProbes[pi];
    const c = cellAt(x, y);
    if (c < 0 || cover[c]) continue;
    const g = groundBelow(x, y, base + 0.6);
    const e = baseHits.get(bi) || baseHits.set(bi, { float: 0, sink: 0, voidLen: 0, drop: 0, at: null }).get(bi);
    const drop = base - (g === null ? WATER_Y - 0.5 : g);
    if (drop > 0.3) {
      // a quay wall right under the facade carries it down to the water
      const [wx, wy, nx, ny] = [x - baseProbes[pi][5] * 0.3, y - baseProbes[pi][6] * 0.3, baseProbes[pi][5], baseProbes[pi][6]];
      if (faceBelow(wx - nx * 0.05, wy - ny * 0.05, base, nx, ny)) continue;
      e.float += len;
      if (g === null) e.voidLen += len;
      if (drop > e.drop) { e.drop = drop; e.at = [x, y]; }
    } else if ((base > -0.5 || BLD[bi].b.type === 'houseboat') && g - base > 0.3 && groundKind !== 'water') { e.sink += len; if (!e.at) e.at = [x, y]; }
  }
}
log('rasterised');

// ------------------------------------------------------------------ (a) gaps

// joints: two ways meeting end to end, ribbons cut square at the shared node
function jointGaps() {
  const ends = new Map();
  const key = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);
  for (const r of map.roads) {
    if (r.pts.length < 2 || !ROAD_SRC.has(r)) continue;
    for (const end of [0, r.pts.length - 1]) {
      const k = key(r.pts[end]);
      (ends.get(k) || ends.set(k, []).get(k)).push([r, end]);
    }
  }
  const nodeAll = new Map();
  for (const r of map.roads) for (const p of r.pts) bump(nodeAll, key(p));
  const out = { n: 0, len: 0, worst: 0 };
  for (const [k, list] of ends) {
    if (list.length !== 2 || nodeAll.get(k) !== 2) continue;
    const [[ra, ea], [rb, eb]] = list;
    if (ra === rb) continue;
    // a V (both ways leaving the node the same way: merging ramps) is no
    // joint, each ends square there (roadstructures3d.js jointAway)
    const dirOf = (r, e) => { const p = r.pts[e], q = r.pts[e ? e - 1 : 1], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / l, (q[1] - p[1]) / l]; };
    const da = dirOf(ra, ea), db = dirOf(rb, eb);
    if (da[0] * db[0] + da[1] * db[1] > 0.3) continue;
    for (const kind of ['road', 'walk']) {
      const ga = ROAD_SRC.get(ra).find((s) => s && s.kind === kind), gb = ROAD_SRC.get(rb).find((s) => s && s.kind === kind);
      if (!ga || !gb) continue;
      // the two corner vertices of each ribbon at that end (ribbon vertices come first, two per point)
      // a crack: the narrower ribbon's end corners off the other's end line
      // (a change of width along one cut line is no crack)
      const ca = cornerPair(ga, ra, ea), cb = cornerPair(gb, rb, eb);
      const off = (P, Q) => Math.max(...P.map((p) => Math.sqrt(closestPointOnSegment(p[0], p[1], Q[0][0], Q[0][1], Q[1][0], Q[1][1]).dist2)));
      const gap = Math.min(off(ca, cb), off(cb, ca));
      if (gap <= 0.05) continue;
      out.n++; out.len += gap; out.worst = Math.max(out.worst, gap);
      const p = ra.pts[ea];
      if (inArea(p[0], p[1])) note('joint', { x: p[0], y: p[1], v: gap, what: `${kind} ${ra.cat}:${ra.name || ra.type} / ${rb.cat}:${rb.name || rb.type}` });
    }
  }
  return out;
}
function cornerPair(s, r, end) {
  // the ribbon's two vertices at that end: along = 0, or the way's length
  const P = s.pos, A = s.along;
  let target = 0;
  if (end !== 0) for (let v = 0; v < A.length; v++) if (!s.kerb[v]) target = Math.max(target, A[v]);
  const out = [];
  for (let v = 0; v < A.length && out.length < 2; v++) if (!s.kerb[v] && Math.abs(A[v] - target) < 1e-3) out.push([P[v * 3], P[v * 3 + 2]]);
  return out.length === 2 ? out : [[P[0], P[2]], [P[3], P[5]]];
}
const joints = jointGaps();
results.joint = { count: joints.n, worst: +joints.worst.toFixed(2), sum: +joints.len.toFixed(1) };

// void components
function components(cells, link = 1) {
  const set = new Map();
  for (let i = 0; i < cells.length; i += 2) set.set(cells[i] * 1e6 + cells[i + 1], i);
  const seen = new Set(), out = [];
  for (const [k] of set) {
    if (seen.has(k)) continue;
    const stack = [k];
    seen.add(k);
    let n = 0, sx = 0, sy = 0;
    while (stack.length) {
      const c = stack.pop();
      const cx = Math.round(c / 1e6), cy = c - cx * 1e6;
      n++; sx += cx; sy += cy;
      for (let dx = -link; dx <= link; dx++) for (let dy = -link; dy <= link; dy++) {
        const q = (cx + dx) * 1e6 + cy + dy;
        if (!seen.has(q) && set.has(q)) { seen.add(q); stack.push(q); }
      }
    }
    out.push({ n, x: sx / n * CS, y: sy / n * CS });
  }
  return out;
}
const voids = components(voidCells).filter((c) => c.n >= 3);
function context(x, y) {
  for (const r of map.roadsNear(x, y, 12)) {
    if (!r.bridge) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (cp.dist2 < (r.width / 2 + 5) ** 2) return 'bridge ' + (r.cat === 'foot' || r.cat === 'cycle' ? 'foot/cycle' : 'road');
    }
  }
  for (const rl of map.rails) {
    const P = rl.pts || rl;
    for (let i = 0; i < P.length - 1; i++) if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < 64) return 'rail';
  }
  if (cutMasked(x, y)) return 'cutting';
  return map.inWaterRaw(x + 3, y) || map.inWaterRaw(x - 3, y) || map.inWaterRaw(x, y + 3) || map.inWaterRaw(x, y - 3) ? 'shore' : 'other';
}
const voidByCtx = {};
for (const v of voids) {
  v.ctx = context(v.x, v.y);
  const e = voidByCtx[v.ctx] || (voidByCtx[v.ctx] = { count: 0, area: 0 });
  e.count++; e.area += v.n * CS * CS;
  note('void.' + v.ctx.split(' ')[0], { x: v.x, y: v.y, v: v.n * CS * CS, what: v.ctx });
}
results.void = { count: voids.length, area: +voids.reduce((a, v) => a + v.n * CS * CS, 0).toFixed(1), byContext: round(voidByCtx) };

// floating edges
results.floating = { length: +[...floating.values()].reduce((a, b) => a + b, 0).toFixed(1), byKind: round(Object.fromEntries(floating)), profiled: round(Object.fromEntries(floatOffGrade)) };
for (const [k, len] of floatSpots) {
  const [kind, xy] = k.split('|');
  const [x, y] = xy.split(',').map(Number);
  if (len >= 1) note('floating.' + kind, { x, y, v: len, what: kind });
}

// building bases
let nFloat = 0, nSink = 0, lFloat = 0, lSink = 0;
for (const [bi, e] of baseHits) {
  const b = BLD[bi].b, p = e.at || b.pts[0];
  if (e.float >= 1) { nFloat++; lFloat += e.float; note('base.float', { x: p[0], y: p[1], v: e.float, what: `floating ${e.drop.toFixed(1)} m ${b.type}${b.name ? ' ' + b.name : ''}` }); }
  if (e.sink >= 1) { nSink++; lSink += e.sink; note('base.sink', { x: p[0], y: p[1], v: e.sink, what: `sinking ${b.type}${b.name ? ' ' + b.name : ''}` }); }
}
results.base = { floating: nFloat, floatLength: +lFloat.toFixed(1), sinking: nSink, sinkLength: +lSink.toFixed(1) };

// city terrain vs the Ommeland ground ring (countryside.js updateGround)
{
  const r = countryRect();
  const [minx, miny, maxx, maxy] = map.meta.bounds;
  const padT = Math.max(maxx - minx, maxy - miny) * 0.15;
  const padC = Math.max(r.hx, r.hy) * 2 * 0.15 - 1;
  const overlap = padT - padC;
  results.seam = { overlap: +overlap.toFixed(2), gap: overlap < 0 ? +(-overlap).toFixed(2) : 0, sameLook: true };
}

// ------------------------------------------------------------------ (b) ways through buildings

{
  const counts = { solid: 0, hole: 0, low: 0, railSolid: 0 };
  for (const r of map.roads) {
    // drawn at street level: everything without a height profile (tunnel and layer tags included)
    if (r.pts.length < 2 || (r.z && r.z.some((z) => Math.abs(z) > 1.5))) continue;
    const [minx, miny, maxx, maxy] = r.bounds;
    for (const b of map.buildingGrid.query(minx, miny, maxx, maxy)) {
      if (b.hidden || isHome(b)) continue;
      const { runs, total } = runsInside(r, b);
      for (const run of runs) {
        const c = classifyRun(map, r, b, run, total);
        if (c.cls !== 'solid' && c.cls !== 'hole') continue;
        const m = run.pts[run.pts.length >> 1];
        if (!inArea(m[0], m[1])) continue;
        counts[c.cls]++;
        note('passage', { x: m[0], y: m[1], v: c.depth, what: `${c.cls} ${r.cat}:${r.type}${r.tunnel ? ' tunnel' : ''}${r.layer ? ' L' + r.layer : ''} ${r.name || ''} / ${b.type} ${b.name || ''}`.trim() });
      }
    }
  }
  // portals too low for what drives through them
  for (const b of map.buildings) {
    if (!b.passages || b.rooms || isHome(b)) continue;
    const depth = Math.max(2.4, b.h * 3.1) + (b.lift || 0);
    for (const p of b.passages) {
      if (!p.shown || p.hall) continue;
      const H = passageHeight(p.cat, depth);
      const need = p.cat === 'foot' || p.cat === 'cycle' ? 2.5 : p.cat === 'minor' || p.cat === 'service' ? 3.2 : 4.0;
      if (H + 0.01 >= need) continue;
      const m = p.pts[p.pts.length >> 1];
      if (!inArea(m[0], m[1])) continue;
      counts.low++;
      note('passage', { x: m[0], y: m[1], v: need - H, what: `low ${H.toFixed(1)} m for ${p.cat} (${b.type} ${b.name || ''} h${b.h})` });
    }
  }
  // rails through footprints that stayed solid
  for (const rl of map.rails) {
    const P = rl.pts || rl;
    for (const b of map.buildingGrid.query(...boundsOf(P))) {
      const { runs } = runsInside({ pts: P }, b);
      for (const run of runs) {
        if (run.s1 - run.s0 < 1) continue;
        const m = run.pts[run.pts.length >> 1];
        if (!inArea(m[0], m[1])) continue;
        counts.railSolid++;
        note('passage', { x: m[0], y: m[1], v: run.s1 - run.s0, what: `rail through ${b.type} ${b.name || ''}` });
      }
    }
  }
  results.passage = counts;
}
function boundsOf(P) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of P) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a, b, c, d];
}

// ------------------------------------------------------------------ (c) z-fighting

results.zfight = {
  road: { area: sum(zf.road), junction: +zfJunction.road.toFixed(1), top: topPairs(zf.road) },
  mark: { area: sum(zf.mark), junction: +zfJunction.mark.toFixed(1), top: topPairs(zf.mark) },
  poke: { area: +pokeArea.toFixed(1) },
};
for (const [k, n] of zfSpots) {
  const [kind, xy, pair] = k.split('~');
  const [x, y] = xy.split(',').map(Number);
  if (n >= 8) note('zf.' + kind, { x, y, v: n * CS * CS, what: pair });
}
for (const [k, n] of pokeSpots) {
  const [x, y] = k.split(',').map(Number);
  if (n >= 2) note('zf.poke', { x, y, v: n * CS * CS, what: 'coping above street' });
}
// footprints overlapping at the same roof height
{
  let n = 0, area = 0;
  const depthOf = (b) => Math.max(2.4, b.h * 3.1) + (b.lift || 0);
  for (const b of map.buildings) {
    if (b.hidden || !near(b.bounds)) continue;
    for (const o of map.buildingGrid.query(...b.bounds)) {
      if (o === b || o.hidden || o.bounds[0] < b.bounds[0] || (o.bounds[0] === b.bounds[0] && o.bounds[1] <= b.bounds[1])) continue;
      if (Math.abs(depthOf(o) - depthOf(b)) > 0.05) continue;
      const x0 = Math.max(b.bounds[0], o.bounds[0]), y0 = Math.max(b.bounds[1], o.bounds[1]), x1 = Math.min(b.bounds[2], o.bounds[2]), y1 = Math.min(b.bounds[3], o.bounds[3]);
      if (x1 - x0 < 0.5 || y1 - y0 < 0.5) continue;
      let hit = 0;
      for (let x = x0 + 0.25; x < x1; x += 0.5) for (let y = y0 + 0.25; y < y1; y += 0.5) if (pointInPolygon(x, y, b.pts) && pointInPolygon(x, y, o.pts)) hit++;
      if (hit < 4) continue;
      n++; area += hit * 0.25;
      note('zf.roof', { x: (x0 + x1) / 2, y: (y0 + y1) / 2, v: hit * 0.25, what: `${b.type} / ${o.type} h${b.h}` });
    }
  }
  results.zfight.roof = { pairs: n, area: +area.toFixed(1) };
}
// overlapping water polygons
{
  let n = 0, area = 0;
  for (let i = 0; i < map.water.length; i++) {
    const a = map.water[i];
    if (!near(a.bounds)) continue;
    for (const b of map.waterGrid.query(...a.bounds)) {
      if (map.water.indexOf(b) <= i) continue;
      const x0 = Math.max(a.bounds[0], b.bounds[0]), y0 = Math.max(a.bounds[1], b.bounds[1]), x1 = Math.min(a.bounds[2], b.bounds[2]), y1 = Math.min(a.bounds[3], b.bounds[3]);
      if (x1 <= x0 || y1 <= y0) continue;
      const step = Math.max(0.5, Math.sqrt((x1 - x0) * (y1 - y0) / 20000));
      let hit = 0;
      for (let x = x0 + step / 2; x < x1; x += step) for (let y = y0 + step / 2; y < y1; y += step) if (pointInPolygon(x, y, a.pts) && pointInPolygon(x, y, b.pts)) hit++;
      if (!hit) continue;
      n++; area += hit * step * step;
      note('zf.water', { x: (x0 + x1) / 2, y: (y0 + y1) / 2, v: hit * step * step, what: `${a.name || '?'} / ${b.name || '?'}` });
    }
  }
  results.zfight.water = { pairs: n, area: +area.toFixed(1) };
}

// ------------------------------------------------------------------ report

function sum(m) { return +[...m.values()].reduce((a, b) => a + b, 0).toFixed(1); }
function topPairs(m) { return [...m].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}: ${v.toFixed(1)}`); }
function round(o) { return JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' ? +v.toFixed(1) : v))); }

if (has('json')) {
  console.log(JSON.stringify({ results, offenders: LIST ? offenders : undefined }));
} else {
  const R = results, Z = R.zfight;
  const lines = [
    `mesh audit${AREA ? ' ' + AREA.join(',') : ''}: ${SRC.length} meshes, ${BINS.total} triangle refs, ${((Date.now() - T0) / 1000).toFixed(0)} s`,
    `triangles ${R.triangles.total.toLocaleString('en')}  ${fmt(Object.fromEntries(Object.entries(R.triangles).filter(([k]) => k !== 'total')), (v) => v.toLocaleString('en'))}`,
    '(a) gaps',
    `  joint     ${R.joint.count} way joints with a wedge > 5 cm (worst ${R.joint.worst} m)`,
    `  void      ${R.void.count} holes, ${R.void.area} m²  ${fmt(R.void.byContext, (v) => `${v.count}/${v.area} m²`)}`,
    `  floating  ${R.floating.length} m of edge in the air  ${fmt(R.floating.byKind, (v) => v + ' m')}; on profiled ways ${fmt(R.floating.profiled, (v) => v + ' m')}`,
    `  base      ${R.base.floating} buildings floating (${R.base.floatLength} m of wall), ${R.base.sinking} sinking (${R.base.sinkLength} m)`,
    `  seam      city terrain / Ommeland ring overlap ${R.seam.overlap} m, gap ${R.seam.gap} m`,
    '(b) ways through buildings',
    `  passage   ${R.passage.solid} solid, ${R.passage.hole} hole, ${R.passage.low} low portals, ${R.passage.railSolid} rails through a building`,
    '(c) z-fighting',
    `  road      ${Z.road.area} m² (at junctions ${Z.road.junction} m²)  ${Z.road.top.slice(0, 4).join('; ')}`,
    `  mark      ${Z.mark.area} m² (at junctions ${Z.mark.junction} m²)  ${Z.mark.top.slice(0, 4).join('; ')}`,
    `  poke      ${Z.poke.area} m² of quay coping above streets`,
    `  roof      ${Z.roof.pairs} footprint pairs, ${Z.roof.area} m²`,
    `  water     ${Z.water.pairs} polygon pairs, ${Z.water.area} m²`,
  ];
  console.log(lines.join('\n'));
  if (LIST) {
    for (const [check, list] of Object.entries(offenders)) {
      if (LIST !== 'all' && check !== LIST && !check.startsWith(LIST + '.')) continue;
      console.log(`-- ${check} (${list.length})`);
      for (const o of list.sort((a, b) => b.v - a.v).slice(0, TOP)) console.log(`  ${o.x.toFixed(1).padStart(8)} ${o.y.toFixed(1).padStart(8)}  ${o.v.toFixed(2).padStart(7)}  ${o.what}`);
    }
  }
}
function fmt(o, f) { return Object.entries(o).map(([k, v]) => `${k} ${f(v)}`).join(', '); }
