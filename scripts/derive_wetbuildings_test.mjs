// #878: natte gebouwen in de wereldbouw (derive_tiles.mjs rescueStuckWaterBuildings).
// Synthetische features: een groot gebouw dat na 60 m schuiven nog steeds >50 % in
// het water staat valt weg; een groot gebouw dat binnen 60 m droog land vindt schuift
// daarheen; een klein laag loodsje (tot 2,2 m: een bootloods) wordt woonboot (blijft);
// een gemapt huis wordt nooit een woonboot; een gebouw op de kant blijft staan; een
// woonboot en een mooring-rij in het water blijven.
//   node scripts/derive_wetbuildings_test.mjs
import './node3d.mjs';
const { deriveFeatures } = await import('./world/derive_tiles.mjs');
const { waterIndex, wetFraction } = await import('./world/placement_audit.mjs');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
const box = (cx, cy, w, h) => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2], [cx - w / 2, cy - h / 2]];

const lakeBig = { pts: rect(-200, -200, 200, 200), kind: 'meer' };
const lakeNarrow = { pts: rect(560, -200, 640, 200), kind: 'meer' };
const water = [{ kind: 'water', row: lakeBig }, { kind: 'water', row: lakeNarrow }];

const bigWet = { pts: box(0, 0, 20, 12), type: 'yes', h: 8 };            // moet weg (geen droog land binnen 60 m)
const rescurable = { pts: box(600, 0, 10, 10), type: 'yes', h: 6 };      // 100 % nat, droog op ~45 m -> schuift
const shed = { pts: box(0, 150, 5, 4), type: 'yes', h: 1 };              // 100 % nat, klein/laag -> woonboot
const onBank = { pts: box(0, 300, 12, 8), type: 'house', h: 5 };         // op de kant -> blijft, zelfde plek
const houseboat = { pts: box(0, -150, 8, 5), type: 'houseboat', h: 2 };  // blijft
const mooring = { pts: box(0, -60, 6, 4), type: 'mooring', h: 1, name: 'Aanlegsteiger' };       // blijft

const feats = [
  ...water,
  { kind: 'buildings', row: bigWet },
  { kind: 'buildings', row: rescurable },
  { kind: 'buildings', row: shed },
  { kind: 'buildings', row: onBank },
  { kind: 'buildings', row: houseboat },
  { kind: 'buildings', row: mooring },
];
const bankPts = JSON.stringify(onBank.pts);
const out = deriveFeatures(feats, { clear: false, clip: false });
const blds = out.feats.filter((f) => f.kind === 'buildings').map((f) => f.row);
const has = (row) => blds.includes(row);
const wet = waterIndex([lakeBig, lakeNarrow]);

ok(out.stats.wetDropped === 1, 'groot nat gebouw wordt weggelaten', JSON.stringify(out.stats));
ok(!has(bigWet), 'het weggehaalde gebouw staat niet in de wereld');
ok(has(rescurable), 'het redbare gebouw blijft in de wereld');
ok(wetFraction(rescurable.pts, wet) < 0.03, 'het geredde gebouw staat nu op droog land', wetFraction(rescurable.pts, wet).toFixed(2));
ok(out.stats.wetRescued === 1, 'de tweede schuifronde telt één verplaatsing', out.stats.wetRescued);
ok(has(shed) && shed.type === 'houseboat', 'het kleine loodsje is een woonboot geworden', shed.type);
ok(has(onBank), 'het gebouw op de kant blijft');
ok(JSON.stringify(onBank.pts) === bankPts, 'het gebouw op de kant is niet verschoven');
ok(has(houseboat) && houseboat.type === 'houseboat', 'de woonboot blijft een woonboot');
ok(has(mooring) && mooring.type === 'mooring', 'de mooring-rij blijft');
ok(!blds.some((b) => wetFraction(b.pts, wet) >= 0.5 && !['houseboat', 'mooring', 'pier'].includes(b.type)),
  'geen niet-drijvend gebouw met ≥50 % natte voet meer in de wereld',
  JSON.stringify(blds.filter((b) => wetFraction(b.pts, wet) >= 0.5).map((b) => b.type)));
ok(out.stats.buildings === 6, 'de telling begint met zes voeten', out.stats.buildings);

// een 2 m hoge bootloods in het water is een woonboot; een gemapt huis niet
{
  const lake = { pts: rect(-100, -100, 100, 100), kind: 'meer' };
  const shedTall = { pts: box(0, 0, 4, 4), type: 'yes', h: 2 };
  const houseLow = { pts: box(60, 60, 10, 8), type: 'house', h: 2 };
  const feats2 = [
    { kind: 'water', row: lake },
    { kind: 'buildings', row: shedTall },
    { kind: 'buildings', row: houseLow },
  ];
  const o2 = deriveFeatures(feats2, { clear: false, clip: false });
  ok(shedTall.type === 'houseboat', 'een 2 m hoge yes-loods in het water wordt woonboot', shedTall.type);
  ok(houseLow.type !== 'houseboat', 'een gemapt huis wordt niet stilletjes een woonboot', houseLow.type);
  const b2 = o2.feats.filter((f) => f.kind === 'buildings').map((f) => f.row);
  const w2 = waterIndex([lake]);
  ok(!b2.includes(houseLow) || wetFraction(houseLow.pts, w2) < 0.5, 'het huis is weg of droog');
}

console.log(`${n - fails}/${n} wetbuildings`);
process.exit(fails ? 1 : 0);

