// Gras over de weg (#883) en de brug die doorzichtig was (#884): de diepte-
// volgorde van de lagen moet vastliggen. Dit leest de offsetgetallen uit de
// bron (grass.js, farlod.js, roadsurface.js) en rekent de volgorde na.
//   node scripts/grass_road_depth_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(HERE, '..', 'game', 'js', f), 'utf8');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
const num = (src, re) => {
  const m = src.match(re);
  return m ? Number(m[1]) : NaN;
};

// --- de graslaag blijft onder de weg, ook in de LOD-ring -------------------
{
  const grass = read('grass.js');
  const farlod = read('farlod.js');
  const f = num(grass, /FILL_OFFSET = \{ factor: ([\d.]+), units: ([\d.]+), factorStep: ([\d.]+), unitsStep: ([\d.]+)/);
  const u = num(grass, /FILL_OFFSET = \{ factor: [\d.]+, units: ([\d.]+), factorStep: [\d.]+, unitsStep: ([\d.]+)/);
  const fs2 = num(grass, /factorStep: ([\d.]+)/);
  const us = num(grass, /unitsStep: ([\d.]+)/);
  const road = num(farlod, /road: groundMaterial\(([\d.]+)[,)]/);
  const green = num(farlod, /green: groundMaterial\(([\d.]+)[,)]/);
  ok([f, u, fs2, us, road, green].every(Number.isFinite), 'de offsetgetallen zijn te lezen');
  // de hoogste graslaag (laag 9, sublaag 0,5) blijft onder de verre weg
  const maxF = f + fs2 * 9.5, maxU = u + us * 9.5;
  ok(maxF < road, `gras (${maxF.toFixed(2)}) blijft onder de verre weg (${road})`);
  ok(maxU < road * 4, `gras (${maxU.toFixed(2)}) blijft onder de verre weg (${road * 4})`);
  ok(f > green, 'de detailgraslaag ligt boven de verre groenlaag');
  const edge = num(grass, /polygonOffsetFactor: -([\d.]+), polygonOffsetUnits: -([\d.]+)/);
  const edgeU = num(grass, /polygonOffsetFactor: -[\d.]+, polygonOffsetUnits: -([\d.]+)/);
  ok(edge > maxF && edgeU > maxU && edge < road, 'de randstrip ligt boven het gras en onder de verre weg');
}

// --- een brug over water houdt zijn dek ------------------------------------
{
  const road = read('roadsurface.js');
  ok(/if \(level && !r\.bridge && !profiled && index\.inWater\(x, y\)\) return \[0, 0\]/.test(road), 'een brug of een weg met hoogteprofiel wordt niet over water weggeknipt (#884)');
  ok(!/if \(level && index\.inWater\(x, y\)\) return \[0, 0\]/.test(road), 'de oude regel zonder brug-uitzondering is weg');
}

console.log(`grass_road_depth_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
