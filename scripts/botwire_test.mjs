// #312/#186: de bedrading van de nieuwe botmodules (run.mjs -> bot.page.js) en de droge cheats-sweep.
// Geen Electron: de CLI-paden worden als proces gestart en de paginabron wordt op de haken gecontroleerd.
//   node scripts/botwire_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const hier = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const ROOT = path.resolve(hier, '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const run = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'bot', 'run.mjs'), ...args], { cwd: ROOT, encoding: 'utf8' });
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };

t('#312: run.mjs injecteert landroute, boot, menu en cheatplan als venstermodules', () => {
  const r = lees('scripts/bot/run.mjs');
  for (const w of ['__botLandRoute', '__botBoat', '__botMenu', '__botCheat']) assert.ok(r.includes(`window.${w} =`), w);
  assert.match(r, /landroute\.mjs/); assert.match(r, /boat\.mjs/); assert.match(r, /menu\.mjs/); assert.match(r, /cheatplan\.mjs/);
  assert.match(r, /stageVehicle: arg\('stage-vehicle'/);
});

t('#312/#186: bot.page.js gebruikt de nieuwe modules en logt de cheat-ladder', () => {
  const p = lees('scripts/bot/bot.page.js');
  assert.match(p, /window\.__botLandRoute/); assert.match(p, /window\.__botBoat/); assert.match(p, /window\.__botMenu/); assert.match(p, /window\.__botCheat/);
  assert.match(p, /Lr\.landOmweg/);
  assert.match(p, /Bo\.bootAchtervolgStap/);
  assert.match(p, /Mn\.menuStap/);
  assert.match(p, /Cp\.cheatVoor\(\{ vast: true, geprobeerd: gep \}\)/);
  assert.match(p, /volgende,/, 'de cheat-log noemt de volgende rung');
  assert.match(p, /Bd\.pickStageVehicle/);
});

t('#186: de droge cheats-sweep draait zonder Electron en print het plan', () => {
  const r = run('--mode=cheatsweep', '--only=M03,M04', '--stappen=2');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Cheats-sweep \(droog, geen Electron\)/);
  assert.match(r.stdout, /- M03: stappen 1, 2; cheats nudge → objective → win/);
  assert.match(r.stdout, /- M04:/);
  assert.match(r.stdout, /Geen Electron gestart/);
});

t('#186: met --events vult de droge sweep de cheattabel van de analyse', () => {
  const map = fs.mkdtempSync(path.join(os.tmpdir(), 'botwire-'));
  const ev = path.join(map, 'events.jsonl');
  fs.writeFileSync(ev, [
    { type: 'cheat', step: 'M03:2', rung: 'objective' },
    { type: 'cheat', step: 'M03:2', rung: 'win' },
    { type: 'cheat', step: 'M04:1', rung: 'skip' },
    { type: 'cheat', step: 'M04:1', rung: 'nudge' },
  ].map((e) => JSON.stringify(e)).join('\n') + '\n');
  const r = run('--mode=cheatsweep', '--only=M03,M04', '--events=' + ev);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /## Cheats per missie uit de run/);
  assert.match(r.stdout, /\| M03 \| 2 \|/);
  assert.match(r.stdout, /\| M04 \| 1 \|/, 'nudge telt niet mee');
});

console.log(`botwire_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
