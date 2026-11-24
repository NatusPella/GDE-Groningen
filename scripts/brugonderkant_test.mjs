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
// hertest 24-11: in de schaduw onder het dek zag je de liggers niet (bijna dezelfde toon als de onderkant): ze zijn nu duidelijk donkerder
const lum = (c) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
const meshOf = (name) => g2 && g2.children.find((c) => c.geometry && c.geometry.attributes.position.count === S2.parts.find((p) => p.m === name).pos.length / 3);
const gm = meshOf('girder'), sm = meshOf('soffit');
ok(!!gm && !!sm && gm.material !== sm.material, 'de liggers hebben hun eigen beton');
ok(gm && sm && lum(gm.material.emissive) < lum(sm.material.emissive) * 0.7 && lum(gm.material.color) < lum(sm.material.color) * 0.9, 'de liggers zijn duidelijk donkerder dan de onderkant (contrast in de schaduw)');
// een ligger is van onderen dicht: er is een driehoek met een normaal naar beneden op de onderkant van de ligger
const gp = S2.parts.find((p) => p.m === 'girder');
let dicht = false;
for (let i = 0; gp && i < gp.pos.length; i += 9) {
  const y = [gp.pos[i + 1], gp.pos[i + 4], gp.pos[i + 7]];
  const ux = gp.pos[i + 3] - gp.pos[i], uy = y[1] - y[0], uz = gp.pos[i + 5] - gp.pos[i + 2], vx = gp.pos[i + 6] - gp.pos[i], vy = y[2] - y[0], vz = gp.pos[i + 8] - gp.pos[i + 2];
  const ny = uz * vx - ux * vz;
  if (Math.max(...y) < 4 - 1 - 0.5 + 0.01 && ny < 0) dicht = true;
}
ok(dicht, 'de ligger heeft een onderkant die naar beneden kijkt');
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
