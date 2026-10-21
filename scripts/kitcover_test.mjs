// De tegelgebouwen onder een kerk-, molen- of borgkit worden verborgen (landmarkkit.js kitCoversBuilding, #338).
//   node scripts/kitcover_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const K = await import('../game/js/landmarkkit.js');
let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const rect = (cx, cy, len, wid, a = 0) => {
  const c = Math.cos(a), s = Math.sin(a);
  return [[-len / 2, -wid / 2], [len / 2, -wid / 2], [len / 2, wid / 2], [-len / 2, wid / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
};
const kerk = { kind: 'church', x: 100, y: 200, angle: 0.5, len: 30, wid: 20 };
const molen = { kind: 'mill', x: 500, y: 600 };

check('kerk: een gewoon gebouw (yes) op dezelfde voetafdruk wordt gedekt', K.kitCoversBuilding(kerk, { type: 'yes', pts: rect(100, 200, 26, 18, 0.5) }));
check('kerk: een tegelkerk op dezelfde voetafdruk ook (de kit tekent de hele kerk)', K.kitCoversBuilding(kerk, { type: 'church', pts: rect(101, 201, 30, 12, 0.5) }));
check('kerk: een huisje ernaast niet (te klein)', !K.kitCoversBuilding(kerk, { type: 'house', pts: rect(100, 200, 8, 6, 0.5) }));
check('kerk: een groot gebouw ernaast niet (middelpunt buiten het vak)', !K.kitCoversBuilding(kerk, { type: 'yes', pts: rect(150, 260, 26, 18, 0.5) }));
check('kerk: een veel te groot blok niet (verhouding)', !K.kitCoversBuilding(kerk, { type: 'yes', pts: rect(100, 200, 80, 50, 0.5) }));
check('kerk: een stadslandmark (landmark) nooit', !K.kitCoversBuilding(kerk, { type: 'yes', landmark: true, pts: rect(100, 200, 26, 18, 0.5) }));
check('kerk: zonder punten niets', !K.kitCoversBuilding(kerk, { type: 'yes' }) && !K.kitCoversBuilding(kerk, null));
check('molen: een flat-achtig gebouw (yes) om het punt wordt gedekt', K.kitCoversBuilding(molen, { type: 'yes', pts: rect(500, 600, 10, 10, 0.2) }));
check('molen: een gebouw vlak naast het punt (binnen 3 m) ook', K.kitCoversBuilding(molen, { type: 'yes', pts: rect(507, 600, 10, 10) }));
check('molen: een gebouw verderop niet', !K.kitCoversBuilding(molen, { type: 'yes', pts: rect(540, 600, 10, 10) }));
check('molen: een grote hal om het punt niet (te groot voor een molen)', !K.kitCoversBuilding(molen, { type: 'yes', pts: rect(500, 600, 60, 40) }));
check('andere kits (boerderij, toren) tellen niet mee', !K.kitCoversBuilding({ kind: 'farm', x: 100, y: 200, angle: 0, len: 30, wid: 20 }, { type: 'yes', pts: rect(100, 200, 26, 18) }) && !K.kitCoversBuilding({ kind: 'tower', x: 500, y: 600 }, { type: 'yes', pts: rect(500, 600, 6, 6) }));
check('borg: het huis onder de borg wordt gedekt', K.kitCoversBuilding({ kind: 'castle', x: 0, y: 0, angle: 0, len: 40, wid: 16 }, { type: 'house', pts: rect(2, 1, 36, 14) }));

// de echte kits uit game/landmarkkits.json: elk gedekt gebouw is een gewoon gebouw naast zijn kit (met de provinciewereld; anders SKIP)
const idx = new URL('../game/world/index-provincie.json', import.meta.url);
if (!fs.existsSync(idx)) console.log('SKIP echte kits: geen game/world');
else {
  const { loadAround } = await import('./world/tegelprobe.mjs');
  const world = { dir: new URL('../game/world/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), index: JSON.parse(fs.readFileSync(idx, 'utf8')) };
  const kits = JSON.parse(fs.readFileSync(new URL('../game/landmarkkits.json', import.meta.url), 'utf8')).items;
  const pick = (re, k) => kits.find((i) => i.k === k && re.test(i.n || ''));
  for (const [re, k, naam] of [[/^PKN Ontmoetingskerk$/, 'church', 'PKN Ontmoetingskerk (building=yes)'], [/^De Leeuw$/, 'mill', 'molen De Leeuw'], [/^Allersmaborg$/, 'castle', 'Allersmaborg']]) {
    const it = pick(re, k);
    if (!it) { check(`${naam}: kit gevonden`, false); continue; }
    const p = K.landmarkParams(it);
    const d = loadAround(world, p.x, p.y, 60);
    const dek = d.buildings.filter((b) => K.kitCoversBuilding(p, b));
    check(`${naam}: precies één tegelgebouw wordt gedekt`, dek.length === 1, dek.map((b) => b.type + b.osm).join(','));
  }
}
console.log(bad ? `${bad} van ${n} mislukt` : `kitcover_test ok (${n} checks)`);
process.exit(bad ? 1 : 0);
