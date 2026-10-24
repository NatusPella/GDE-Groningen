// Duurtest op lekken (opdracht eigenaar 24-10): draait de route `soak` van routes.js in Electron (scripts/perf/run.mjs, een wegwerpprofiel, met
// --js-flags=--expose-gc voor een GC voor elke meting) en beoordeelt de trend. Daarna: JSON in <PERF_OUT>/soak.json en een oordeel.
//   node scripts/perf/leak_soak.mjs [--min=12]           draaien (zelfde omgeving als run.mjs: GDE_GAME_DIR, ELECTRON_EXE, PERF_LOCKS, PERF_OUT)
//   node scripts/perf/leak_soak.mjs --judge=<soak.json>   alleen beoordelen
// Per cyclus van 60 s: lopen, auto, helikopter, pauzemenu 5x, kaart 5x, missie starten en stoppen, samen-spelen-sessie met een proefgast.
// Oordeel: na het opwarmen (2 metingen) mag de heap hooguit +2% per 10 minuten stijgen en mogen de tellers (geometrieen, texturen, programma's,
// DOM-knopen, luisteraars, timers, scene-knopen, materialen, tegels) niet stijgen (hoogstens +2% per 10 minuten, en minder dan 3 stuks absoluut).
// Exit 1 bij een lek of een route-fout.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const OUT = process.env.PERF_OUT || path.join(os.tmpdir(), 'gde-perf');
let file = arg('judge');
if (!file) {
  const min = Number(arg('min')) || 12;
  const env = { ...process.env, PERF_ONLY: 'soak', PERF_SOAK_MIN: String(min), PERF_OUT: OUT, PERF_DUR: String(min * 60000 + 8000) };
  const res = spawnSync(process.execPath, [path.join(HERE, 'run.mjs'), 'soak', '--js-flags=--expose-gc'], { env, stdio: 'inherit' });
  if (res.status !== 0) console.error('run.mjs eindigde met', res.status);
  file = path.join(OUT, 'soak.json');
}
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const r = (d.routes || {}).soak;
if (!r || r.error) { console.error('geen uitslag van de soak-route', r && r.error); process.exit(1); }
console.log(`soak ${r.soakMin} min, ${r.samples.length} metingen, opwarmen ${r.warm}, acties ${JSON.stringify(r.counts)}, gc ${r.samples[0] && r.samples[0].gc}`);
console.log('metriek'.padEnd(12) + ['eerste', 'laatste', '/min', '%/10min'].map((h) => h.padStart(10)).join('') + '  oordeel');
let bad = false;
const LIM = { heapMB: 2, geometries: 2, textures: 2, programs: 2, domNodes: 2, listeners: 2, timers: 2, sceneNodes: 2, materials: 2, tiles: 2 };
for (const [k, t] of Object.entries(r.trend)) {
  if (!t) { console.log(k.padEnd(12) + '(te weinig metingen)'); continue; }
  const climb = t.slopePerMin * 10; // per 10 minutes, absolute
  const lek = t.pctPer10Min != null && t.pctPer10Min > LIM[k] && climb >= (k === 'heapMB' ? 5 : 3);
  if (lek) bad = true;
  console.log(k.padEnd(12) + [t.first, t.last, t.slopePerMin, t.pctPer10Min].map((v) => String(v).padStart(10)).join('') + (lek ? '  LEK?' : '  vlak'));
}
if ((r.counts.missionFail || 0) + (r.counts.coopFail || 0) > 0) console.log('acties mislukt:', JSON.stringify(r.counts));
console.log('levende timers (bij het eind):', JSON.stringify(r.liveTimersBy.slice(0, 8)));
console.log('luisteraars die netto groeiden:', JSON.stringify(r.listenersByType.slice(0, 10)));
console.log('frames: gem', r.avg, 'p99', r.p99, 'max', r.max);
process.exit(bad ? 1 : 0);
