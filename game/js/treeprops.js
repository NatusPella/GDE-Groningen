import { makeProp, addProp, removeProp } from './breakables.js';
import { treeDims } from './greenery.js';

// Roadside trees as breakable props. Trees stay pure map data; a knocked
// tree sets raw._broken (the [x, y, species, height] row treesNear returns), which
// scene3d.js's syncTrees skips. The mesh builder is handed over by scene3d
// so the tumbling copy looks exactly like the standing tree.

const STREAM_RADIUS = 70;
const DROP_RADIUS = 80;

let buildTree = null;
const live = new Map();

export function setTreeMeshBuilder(fn) {
  buildTree = fn;
}

function treeHash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function makeTreeProp(raw) {
  const [x, y] = raw;
  const s = treeHash(x, y);
  // the trunk of its species and height (greenery.js): a young cherry gives
  // way sooner than a full-grown lime or plane
  const d = treeDims(raw);
  const big = Math.min(1, d.h / 20);
  return makeProp('tree', x, y, {
    r: Math.max(0.16, d.tr),
    mass: (350 + s * 900) * (0.4 + 0.6 * big),
    breakSpeed: (7 + s * 9) * (0.55 + 0.45 * big),
    breakCost: 3 + s * 4,
    h: d.h,
    onBreak: () => { raw._broken = true; },
    onRestore: () => { raw._broken = false; },
    makeMesh: () => {
      if (!buildTree) return null;
      const m = buildTree(raw);
      m.position.set(0, 0, 0);
      return m;
    },
  });
}

export function streamTreeProps(world, px, py) {
  for (const raw of world.map.treesNear(px, py, STREAM_RADIUS)) {
    if (live.has(raw) || raw._broken) continue;
    const p = makeTreeProp(raw);
    if (addProp(p)) live.set(raw, p);
  }
  for (const [raw, p] of live) {
    if (!p.cell || Math.hypot(raw[0] - px, raw[1] - py) > DROP_RADIUS) {
      removeProp(p);
      live.delete(raw);
    }
  }
}
