// Zet de uitvoer van streamsoepel.mjs (stad|provincie x voor|na .json in een map) om in een voor/na-tabel (markdown).
//   node scripts/perf/streamsoepel_table.mjs <uitvoermap>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || '.';
const read = (r, v) => { try { return JSON.parse(fs.readFileSync(path.join(dir, `${r}-${v}.json`), 'utf8').trim().split('\n').pop()); } catch (e) { return null; } };
const rows = [
  ['streamingwerk per frame, gemiddeld (ms)', (o) => o.streamMs.mean],
  ['streamingwerk p95 (ms)', (o) => o.streamMs.p95],
  ['streamingwerk p99 (ms)', (o) => o.streamMs.p99],
  ['streamingwerk max (ms)', (o) => o.streamMs.max],
  ['frames met meer dan 4 ms', (o) => o.framesOver4ms],
  ['frames met meer dan 8 ms', (o) => o.framesOver8ms],
  ['tegelrijen max (ms)', (o) => o.tileRowsMs.max],
  ['tegelwachtrij max (items)', (o) => o.tileQueue.max],
  ['late tegels binnen 250 m (tegel-frames)', (o) => o.lateTilesWithin250m],
  ['late verre tegels binnen 190 m (tegel-frames)', (o) => o.farTilesLateWithin190m],
  ['detailring kleinste (m, van 140)', (o) => o.ring.min],
  ['detailring p5 (m)', (o) => o.ring.p5],
  ['frames met ring onder 90% (%)', (o) => o.ring.pctBelow90],
  ['wachttijd gebouw tot detail p50 (ms)', (o) => o.waitToDetailMs.p50],
  ['wachttijd gebouw tot detail p95 (ms)', (o) => o.waitToDetailMs.p95],
  ['kale gebouwen per frame (gemiddeld)', (o) => o.bareBuildings.meanPerFrame],
  ['gaten in de ring (gebouw zonder mesh en zonder uitzondering)', (o) => o.holesInRing],
];
const lines = ['| | stad voor | stad na | provincie voor | provincie na |', '|---|---:|---:|---:|---:|'];
const all = [read('stad', 'voor'), read('stad', 'na'), read('provincie', 'voor'), read('provincie', 'na')];
for (const [name, fn] of rows) lines.push(`| ${name} | ${all.map((o) => (o ? fn(o) : 'n.v.t.')).join(' | ')} |`);
console.log(lines.join('\n'));
