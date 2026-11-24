// #919: een verhoogd brugdek (z boven 2,2 m) moet iets hebben dat de grond raakt: een pijler, een
// landhoofd of een talud. Anders hangt het dek in de lucht en lijkt het 'zwevend'. Loopt de hele
// provincie langs (zoals bridge_all_test, maar dan voor de bruggen MET eigen hoogte) en bouwt het
// echte bouwwerk (roadsurface.buildRoadGroup); telt de dekken waarvan de onderste punt van de
// bouwwerk-mesh niet tot bij de grond komt.
//
//   node scripts/bridge_support_test.mjs        (zonder game/world: SKIP)
//   node scripts/bridge_support_test.mjs --lijst  toon de dekken zonder steun
import fs from 'node:fs';
import './node3d.mjs';
import { worldDirUrl } from './lib/worldlocator.mjs';

const root = worldDirUrl();
if (!fs.existsSync(new URL('index-provincie.json', root))) { console.log('SKIP bridge_support_test: geen game/world met de provincie'); process.exit(0); }

const S = await import('../game/js/tilestore.js');
const TW = await import('../game/js/tileworld.js');
const PW = await import('../game/js/provinceworld.js');
const RS = await import('../game/js/roadsurface.js');

const files = new Proxy({}, { get: (o, f) => (typeof f === 'string' ? (o[f] || (o[f] = new Uint8Array(fs.readFileSync(new URL(f, root))))) : undefined) });
const T = await TW.loadTileWorld('world/', { source: new S.MemorySource(files), pool: false, extra: ['index-provincie.json'] });
const map = T.world;
PW.initProvince({ index: T.index, world: map });
map.tileQueue.run(1e9);
RS.setRoadNetwork(map);

// drempel: dekken zonder steun die de generator niet kan oplossen (gemeten stand; mag alleen dalen)
export const MAX_ZWEVEND = Number((process.argv.find((v) => v.startsWith('--max=')) || '--max=0').slice(6));
const LIJST = process.argv.includes('--lijst');

const gezien = new Set(), dekken = [];
const b = map.meta.bounds;
for (let x = b[0]; x <= b[2]; x += 200) {
  for (let y = b[1]; y <= b[3]; y += 200) {
    for (const r of map.roadsNear(x, y, 150) || []) {
      if (!r || !r.bridge || r.tunnel || !r.z || !r.pts || r.pts.length < 2) continue;
      if (Math.max(...r.z) <= 2.2) continue;
      const k = r.gid !== undefined ? r.gid : `${r.name || r.type}@${Math.round(r.pts[0][0])},${Math.round(r.pts[0][1])}`;
      if (gezien.has(k)) continue;
      gezien.add(k);
      dekken.push(r);
    }
  }
}

let zwevend = 0, n = 0;
const doorzicht = new Set(); // materialen van het bouwwerk met transparantie of zonder dieptewrite (dan lijkt het dek doorzichtig)
const slecht = [];
for (const r of dekken) {
  n++;
  const group = RS.buildRoadGroup(r);
  let minY = Infinity, maxZ = Math.max(...r.z);
  group.traverse((o) => {
    if (!o.isMesh || !o.userData.roadStructure) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) if (m.transparent || m.opacity < 1 || m.depthWrite === false || m.alphaTest > 0) doorzicht.add(m.name || m.type);
    const p = o.geometry.attributes.position.array;
    for (let i = 1; i < p.length; i += 3) if (p[i] < minY) minY = p[i];
  });
  // iets moet tot bij de grond (of het water) komen: anders is er geen pijler, landhoofd of talud
  // een dek over een lagere weg staat niet op de rijbaan eronder: de steun staat in de buurdekken (daar is het deel van de lijst voor)
  const mid = r.pts[Math.floor(r.pts.length / 2)];
  const overRoad = (map.roadsNear(mid[0], mid[1], 25) || []).some((o) => o !== r && !o.tunnel && o.pts && Math.max(...(o.z || [0])) < maxZ - 2 && o.pts.some((q) => Math.hypot(q[0] - mid[0], q[1] - mid[1]) < 25));
  if (!(minY < 0.5) && !overRoad) { zwevend++; slecht.push([r.cat, r.name, Math.round(r.pts[0][0]), Math.round(r.pts[0][1]), +maxZ.toFixed(1), Number.isFinite(minY) ? +minY.toFixed(1) : null, Math.round(r.pts.length), Math.round(r.pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0))]); }
}
console.log(`bridge_support_test: ${n} verhoogde brugdekken, ${zwevend} zonder iets dat de grond raakt (hoogstens ${MAX_ZWEVEND})`);
if (LIJST || zwevend > MAX_ZWEVEND) for (const s of slecht.slice(0, 60)) console.log('  ' + JSON.stringify(s));
if (doorzicht.size) { console.log('bridge_support_test: ROOD, bouwwerk-materiaal doorzichtig: ' + [...doorzicht].join(', ')); process.exit(1); }
if (zwevend > MAX_ZWEVEND) { console.log('bridge_support_test: ROOD'); process.exit(1); }
console.log('bridge_support_test: groen');
