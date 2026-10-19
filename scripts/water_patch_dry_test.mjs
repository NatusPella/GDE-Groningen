// Waterstukken uit vaarnet_fixes.json (vaarnet.js patchRows) die over een weg liggen zonder
// brug in de kaart: de weg wordt een droog dek (markDryRoad), anders zinkt een auto er in
// (verhaaltest "major-road water crossings", #222/#235).
//   node scripts/water_patch_dry_test.mjs
import './node3d.mjs';
const { TileWorld } = await import('../game/js/tileworld.js');
const { patchRows } = await import('../game/js/vaarnet.js');
const { waterPolyAt } = await import('../game/js/waterlevels.js');

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

const road = (pts, o = {}) => ({ pts, cat: 'major', type: 'secondary', width: 9, bridge: false, ...o });
const inside = (b, x, y, r) => x >= b[0] - r && x <= b[2] + r && y >= b[1] - r && y <= b[3] + r;
const fake = () => {
  const water = [];
  const roads = [
    road([[-60, 0], [60, 0]], { name: 'Over het stuk' }),
    road([[-60, 400], [60, 400]], { name: 'Ver weg' }),
    road([[-60, 20], [60, 20]], { name: 'Brug', bridge: true }),
    road([[-60, -10], [60, -10]], { name: 'Profiel', z: [0, 5] }),
  ];
  return {
    roads, water,
    waterGrid: { insert: (w) => water.push(w) },
    waterNear: (x, y, r) => water.filter((w) => inside(w.bounds, x, y, r)),
    roadsNear: (x, y, r) => roads.filter((q) => q.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) <= r + 70)),
    addWaterPatches: TileWorld.prototype.addWaterPatches,
  };
};
{
  const map = fake();
  const rows = patchRows({ links: [{ from: [-30, -15], to: [30, -15], width: 80, name: 'Testlink' }] });
  ok(rows.length === 1 && rows[0].fix, 'een link wordt een waterstuk');
  ok(!waterPolyAt(map, 0, 0), 'zonder stuk geen water');
  map.addWaterPatches(rows);
  ok(!!waterPolyAt(map, 0, 0), 'het stuk ligt over de weg');
  const [over, ver, brug, profiel] = map.roads;
  ok(over.bridge && over.dryCrossing, 'de weg over het stuk is een droog dek');
  ok(!ver.bridge, 'een weg ver weg blijft zoals hij was');
  ok(brug.bridge && !brug.dryCrossing, 'een echte brug blijft een echte brug');
  ok(!profiel.bridge, 'een weg met hoogteprofiel wordt niet aangeraakt (die gaat er echt overheen)');
}
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
