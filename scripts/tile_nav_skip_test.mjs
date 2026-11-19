// Prestatie: de gestreamde tegel decodeert sectie NAV niet (niemand in game/js leest hem; hij was ~31% van een
// stadstegel in de clone van de worker). Scripts die de NAV-graaf willen (navgraph_test) decoderen zonder skip.
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import * as G from '../game/js/gdt.js';
import { decodeCompressed } from '../game/js/tilestore.js';
import { GAME_SKIP_SECTIONS } from '../game/js/tileworld.js';

const nav = Array.from({ length: 50 }, (_, k) => ({ a: k, b: [k, k + 1], c: 'edge' + k }));
const blob = G.encodeBlob({ i: 3, j: -2, sections: [
  { type: G.SECTION.BUILDINGS, rows: [{ gid: 5, h: 7 }, { gid: 6, h: 9 }] },
  { type: G.SECTION.NAV, rows: nav },
  { type: G.SECTION.META, json: { x: 1 } },
] });
const z = new Uint8Array(zlib.deflateRawSync(blob));

assert.deepEqual(GAME_SKIP_SECTIONS, [G.SECTION.NAV], 'het spel slaat precies NAV over');

const full = await decodeCompressed(z);
const lean = await decodeCompressed(z, null, GAME_SKIP_SECTIONS);
assert.ok(full.sections.some((s) => s.type === G.SECTION.NAV), 'zonder skip blijft NAV decodeerbaar (scripts)');
assert.ok(!lean.sections.some((s) => s.type === G.SECTION.NAV), 'met skip geen NAV in de tegel');
const rest = full.sections.filter((s) => s.type !== G.SECTION.NAV);
assert.deepEqual(lean.sections, rest, 'alle andere secties (en dus de bouwstappen) zijn gelijk');
assert.equal(lean.i, 3); assert.equal(lean.j, -2);
const sizeOf = (t) => JSON.stringify(t).length;
assert.ok(sizeOf(lean) < sizeOf(full), 'de te klonen tegel wordt kleiner');
console.log('tile_nav_skip_test ok');
