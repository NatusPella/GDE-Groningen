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
console.log(`${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
