// The secret door in the Martinitoren (game/js/geheimen.js) sits on the face
// of the tower model, not floating beside it, and the player's spot lies
// outside the building footprint (collision). The model's plinth is read from
// game/models/martinitoren.glb the way landmarkmodels.js scales and centres it.
//   node scripts/geheimen_deur_test.mjs
import fs from 'node:fs';

// geheimen.js pulls in half the game; read its two constants from the source.
const src = fs.readFileSync(new URL('../game/js/geheimen.js', import.meta.url), 'utf8');
const DOOR = Function(`return ${/export const DOOR = (\{[^}]*\});/.exec(src)[1].replace(/Math\.PI/g, '3.141592653589793')}`)();
const DOOR_SPOT = Function(`return ${/export const DOOR_OUT = (\{[^}]*\});/.exec(src)[1]}`)();
const here = (f) => new URL(f, import.meta.url);
const { loadStadData } = await import('./lib/loadworld.mjs');
const map = await loadStadData();
const b = map.buildings.find((q) => q.name === 'Martinitoren');
const xs = b.pts.map((p) => p[0]), ys = b.pts.map((p) => p[1]);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;

const glb = fs.readFileSync(here('../game/models/martinitoren.glb'));
const j = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
let top = 0, plint = 0;
for (const n of j.nodes) {
  if (n.mesh === undefined) continue;
  const a = j.accessors[j.meshes[n.mesh].primitives[0].attributes.POSITION];
  const ty = n.matrix ? n.matrix[13] : 0;
  top = Math.max(top, ty + a.max[1]);
  if (n.name === 'plint') plint = a.max[0];
}
const scale = 95 / top; // TARGET_HEIGHT_M.Martinitoren, model starts at y 0
const half = plint * scale;
const faceY = cy - half; // south face of the plinth

function inside(x, y, P) {
  let c = false;
  for (let i = 0, k = P.length - 1; i < P.length; k = i++) {
    if ((P[i][1] > y) !== (P[k][1] > y) && x < ((P[k][0] - P[i][0]) * (y - P[i][1])) / (P[k][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
}
let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('FAIL', msg); } };
check(Math.abs(DOOR.y - faceY) < 0.1, `door y ${DOOR.y} is ${Math.abs(DOOR.y - faceY).toFixed(2)} m from the plinth face ${faceY.toFixed(2)}`);
check(Math.abs(DOOR.x - cx) <= half - 0.5, 'door lies within the plinth width');
check(Math.abs(Math.cos(DOOR.a)) < 0.01 && Math.sin(DOOR.a) < -0.99, 'door faces out of the south face');
check(!inside(DOOR_SPOT.x, DOOR_SPOT.y, b.pts), 'player spot is outside the footprint');
check(Math.hypot(DOOR_SPOT.x - DOOR.x, DOOR_SPOT.y - DOOR.y) < 4, 'player spot within 4 m of the door');
console.log(fails ? `${fails} failures` : `ok (plinth face y ${faceY.toFixed(2)}, door y ${DOOR.y})`);
process.exit(fails ? 1 : 0);
