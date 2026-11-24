// Brug- en viaductonderkant (#1192, #919): de onderkant van een dek krijgt een eigen, lichter
// materiaal met eigenlicht (soffit), zodat hij niet als egaal zwart vlak leest. Test op een
// synthetische brug: de onderkant zit in het part 'soffit', de zijkanten in 'concrete'.
//   node scripts/brugonderkant_test.mjs
import './node3d.mjs';
const R = await import('../game/js/roadstructures3d.js');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const r = { cat: 'primary', width: 8, bridge: true, pts: [[0, 0], [20, 0], [40, 0]], z: [4, 4, 4] };
const map = { elev: { segs: [], byRoad: new Map(), walls: [] }, roadsNear: () => [], inWaterRaw: () => false };
const S = R.structureArrays(r, map);
ok(!!S, 'een brug geeft civiele werken');
const parts = Object.fromEntries((S ? S.parts : []).map((p) => [p.m, p]));
ok(!!parts.soffit, 'de onderkant zit in een eigen part (soffit)');
ok(!!parts.concrete, 'de zijkanten blijven concrete');
// Alle soffit-driehoeken liggen onder het dek (y = 4 - DECK_T), geen enkele erboven.
const ys = parts.soffit ? Array.from(parts.soffit.pos).filter((_, i) => i % 3 === 1) : [];
ok(ys.length > 0 && ys.every((y) => y < 4), 'soffit ligt onder het wegdek', String(Math.max(...ys)));
// Het materiaal is lichter dan de zijkant en heeft eigenlicht.
const g = R.structureGroup(map, S);
const mesh = g && g.children.find((c) => c.material.emissive && c.material.emissive.getHex() !== 0);
ok(!!mesh, 'het soffit-materiaal heeft eigenlicht');
// #1192 (hertest 24-11): liggers onder het dek en een landhoofd met oplegbalk, voet en ribben
ok(!!parts.girder, 'het dek heeft liggers (part girder)');
const gy = parts.girder ? Array.from(parts.girder.pos).filter((_, i) => i % 3 === 1) : [];
ok(gy.length > 0 && Math.min(...gy) < 4 - 0.5 && Math.max(...gy) <= 4, 'de liggers hangen onder het dek, niet erboven', `${Math.min(...gy)}..${Math.max(...gy)}`);
ok(R.girderOffsets(4).length >= 3 && R.girderOffsets(0.6).length === 1, 'meer liggers op een breed dek, één op een smal pad', JSON.stringify(R.girderOffsets(4)));
const offs = R.girderOffsets(6);
ok(offs.every((o, i) => i === 0 || Math.abs(o - offs[i - 1] - (offs[1] - offs[0])) < 1e-9) && Math.abs(offs[0] + offs[offs.length - 1]) < 1e-9, 'gelijk verdeeld en symmetrisch');
const before = (b) => Object.fromEntries(Object.entries(b.p).map(([k, v]) => [k, v.length]));
const fake = { p: {}, wallBox(m) { (this.p[m] = this.p[m] || []).push(1); } };
R.abutmentDetail(fake, [0, -4], [0, 4], 1.6, 0, 5);
ok((fake.p.girder || []).length >= 4, 'een landhoofd krijgt oplegbalk, voet en ribben', JSON.stringify(before(fake)));
const laag = { p: {}, wallBox(m) { (this.p[m] = this.p[m] || []).push(1); } };
R.abutmentDetail(laag, [0, -4], [0, 4], 1.6, 0, 0.8);
ok(!laag.p.girder, 'een lage muur (onder 1,2 m) krijgt geen detail');
const S2 = R.structureArrays({ cat: 'primary', width: 8, bridge: true, pts: [[0, 0], [20, 0], [40, 0]], z: [4, 4, 4] }, map);
const g2 = R.structureGroup(map, S2);
const gm = g2 && g2.children.find((c) => c.geometry && c.material && c.material.color && c.material.color.getHex() === 0xb6b2a8);
ok(!!gm, 'de liggers hebben hun eigen lichtere beton');
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
