// #651: de spoorchunks kregen een tijdsbudget i.p.v. een vast aantal van 3 per
// frame. node scripts/railbudget_test.mjs  (pure regel)
import fs from 'node:fs';
import { railChunkAllowed, RAIL_CHUNK_BUDGET_MS } from '../game/js/railbudget.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(RAIL_CHUNK_BUDGET_MS === 3, 'budget 3 ms', RAIL_CHUNK_BUDGET_MS);
ok(railChunkAllowed(0, 0, 0, 3), 'altijd minstens één chunk');
ok(railChunkAllowed(0, 100, 0, 3), 'ook als de eerste duur was: minstens één');

// meten: hoeveel chunks passen in een frame bij verschillende chunkkosten
const chunksPerFrame = (cost) => { let made = 0; for (;;) { if (!railChunkAllowed(0, made * cost, made, 3)) return made; made++; if (made > 50) return made; } };
const cheap = chunksPerFrame(0.5), mid = chunksPerFrame(1.5), duur = chunksPerFrame(8);
ok(cheap > 3, 'goedkope chunks: meer dan de oude vaste 3 per frame', cheap);
ok(duur === 1, 'een dure chunk: één per frame (oud: 3 = 24 ms)', duur);
console.log(`#651 meting: chunkkosten 8 ms -> ${duur} per frame (oud 3 = 24 ms), 1,5 ms -> ${mid}, 0,5 ms -> ${cheap} (oud altijd 3)`);

const src = fs.readFileSync(new URL('../game/js/railway3d.js', import.meta.url), 'utf8');
ok(/railChunkAllowed\(t0, performance\.now\(\), made\)/.test(src), 'railway3d gebruikt het budget');
ok(!/MAX_CHUNK_BUILDS/.test(src), 'de vaste telling is weg');
console.log(`${n - fails}/${n} railbudget`);
process.exit(fails ? 1 : 0);
