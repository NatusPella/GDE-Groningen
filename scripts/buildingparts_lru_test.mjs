// De gebouwdelen-LRU (models3d_buildings.js touchParts, #1065): een gebouw waarvan het mesh nog in de scene staat of klaarligt mag zijn geometrie
// niet kwijtraken. Voorheen gooide de LRU na 800 gebouwen de oudste weg, ook als die nog getekend werd; three.js uploadde hem dan opnieuw
// terwijl de cache hem niet meer kende, en hij bleef voor altijd in de GPU-lijst (renderer.info.memory.geometries steeg per rit).
//   node scripts/buildingparts_lru_test.mjs
import './node3d.mjs';

const M = await import('../game/js/models3d_buildings.js');
const THREE = await import('three');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

let disposed = 0;
const gd = THREE.BufferGeometry.prototype.dispose;
THREE.BufferGeometry.prototype.dispose = function () { disposed++; this.userData.weg = true; return gd.call(this); };

function woning(i) {
  const x = (i % 40) * 14, y = Math.floor(i / 40) * 14;
  const pts = [[x, y], [x + 10, y], [x + 10, y + 8], [x, y + 8]];
  return { id: `t${i}`, pts, h: 2, hm: 6.4, kind: 'house', bounds: [x, y, x + 10, y + 8] };
}
const gebouwen = []; for (let i = 0; i < 900; i++) gebouwen.push(woning(i));

// 1. zonder in-gebruik-regel: de oudste gaat weg (het oude gedrag blijft de standaard buiten de scene)
const meshes = new Map();
const probeb = gebouwen[0];
let g0;
try { g0 = M.buildBuildingMesh(probeb); } catch (e) { console.log('buildBuildingMesh faalde in de test:', e.message); }
ok(!!g0 && !!probeb._geo3dParts, 'een gebouw bouwt en houdt zijn delen vast', probeb._geo3dParts ? Object.keys(probeb._geo3dParts).join() : 'geen delen');
if (!g0) { console.log(`buildingparts_lru_test: ${n - bad}/${n} ok`); process.exit(1); }

M.setPartsInUse(null);
for (let i = 1; i < 900; i++) M.buildBuildingMesh(gebouwen[i]);
ok(probeb._geo3dParts === null, 'zonder regel verdwijnen de delen van het oudste gebouw na 800', String(probeb._geo3dParts));
const stats0 = M.partCacheStats();
ok(stats0.size <= stats0.max, 'de cache blijft begrensd', JSON.stringify(stats0));

// 2. met de regel: gebouwen die getekend worden blijven staan, de rest wordt wel opgeruimd
for (const b of gebouwen) b._geo3dParts = null;
const inGebruik = new Set(gebouwen.slice(0, 100)); // 100 gebouwen in de scene
M.setPartsInUse((b) => inGebruik.has(b));
disposed = 0;
for (let i = 0; i < 900; i++) { const m = M.buildBuildingMesh(gebouwen[i]); if (inGebruik.has(gebouwen[i])) meshes.set(gebouwen[i], m); }
const weg = gebouwen.slice(0, 100).filter((b) => b._geo3dParts === null).length;
ok(weg === 0, 'gebouwen die nog getekend worden houden hun delen', `${weg} kwijt`);
let kapot = 0;
for (const [, m] of meshes) m.traverse((o) => { if (o.geometry && o.geometry.userData.weg) kapot++; });
ok(kapot === 0, 'geen enkele zichtbare geometrie is weggegooid', String(kapot));
const stats = M.partCacheStats();
ok(stats.size <= stats.max, 'ook met de regel blijft de cache op of onder zijn grens', JSON.stringify(stats));
ok(stats.gespaard > 0, 'de teller van gespaarde gebouwen loopt mee', JSON.stringify(stats));
ok(disposed > 0, 'de gebouwen buiten beeld zijn wel opgeruimd', String(disposed));

// 3. alles in gebruik: de lus stopt (geen oneindige lus) en de cache mag tijdelijk boven de grens
M.setPartsInUse(() => true);
for (const b of gebouwen) b._geo3dParts = null;
const t0 = Date.now();
for (let i = 0; i < 900; i++) M.buildBuildingMesh(gebouwen[i]);
ok(Date.now() - t0 < 60000, 'alles in gebruik: geen oneindige lus');

// 4. het gebouw dat nu gebouwd wordt (nog niet in de scene) verliest zijn delen nooit, ook niet als alle andere gespaard worden
//    (voorheen: parts null, TypeError "reading 'main'" in buildBuildingMeshRaw, de rode kaart "Er ging iets mis")
for (const b of gebouwen) b._geo3dParts = null;
const gebruik = new Set();
M.setPartsInUse((b) => gebruik.has(b));
let fout = null;
try {
  for (let i = 0; i < 850; i++) { gebruik.add(gebouwen[i]); M.buildBuildingMesh(gebouwen[i]); }
  for (let i = 850; i < 900; i++) { const m = M.buildBuildingMesh(gebouwen[i]); ok(!!m && !!gebouwen[i]._geo3dParts, 'nieuw gebouw naast alleen gespaarde gebouwen houdt zijn delen'); }
} catch (e) { fout = e.message; }
ok(fout === null, 'geen TypeError bij een cache vol gespaarde gebouwen', String(fout));
M.setPartsInUse(null);

console.log(`buildingparts_lru_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
