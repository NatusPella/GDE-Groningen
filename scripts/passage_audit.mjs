// Roads, cycleways and footways through building footprints, per class
// (game/js/passagecheck.js), straight from the map data:
//   node scripts/passage_audit.mjs [--all] [--json]
// Exits 1 when a stretch runs through a solid wall or an invisible hole.
import fs from 'node:fs';
import { GameMap, applyMapExtras } from '../game/js/mapdata.js';
import { auditPassages } from '../game/js/passagecheck.js';
import { pointInPolygon } from '../game/js/util.js';

const root = new URL('../game/', import.meta.url);
const { loadCityData } = await import('./lib/loadworld.mjs');
const data = await loadCityData();
const map = new GameMap(data);
const all = process.argv.includes('--all');
// the House of Groningen: home.js prepareHomeMap reshapes its footprint and
// takes the garage aisles out when the game loads (the story test checks it)
const home = (b) => b.h >= 12 && pointInPolygon(-1289.19, -1082.05, b.pts);
const res = auditPassages(map, { all, skip: home });
if (process.argv.includes('--json')) console.log(JSON.stringify(res.list));
else for (const e of res.list) console.log(`${e.cls.padEnd(8)} ${String(e.x).padStart(8)} ${String(e.y).padStart(8)}  depth ${e.depth} len ${e.len}  ${e.road}  | ${e.building}`);
console.log(JSON.stringify(res.counts));
process.exit(res.bad.length ? 1 : 0);
