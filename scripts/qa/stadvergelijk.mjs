// Stad uit tegels tegenover de oude stad in beeld (#90): dezelfde camerastanden in twee (of meer) gestagede werelden.
//   node scripts/qa/stadvergelijk.mjs --game-dir=A=<map>,B=<map>[,A2=<map>] --out=<map> [--slot] [--settle=4500]
//        [--spots=scripts/qa/stadspots.json] [--only=<prefix,..>] [--alleen-vergelijken] [--basis=A]
// Per gestagede game draait scripts/qa/sweep.mjs (één Electron, wegwerpprofiel) met een eigen plan: elke plek van
// stadspots.json bij dag (13 u, helder) en een deel ook bij nacht (23 u), een straatbeeld en een hoog beeld, zonder
// HUD en startscherm. Daarna vergelijkt scripts/qa/stadverschil.mjs de beelden per plek (pixels, randen, blokken) en
// legt het ruisniveau vast: een tweede run van dezelfde game (A2) laat zien wat alleen beweging (voetgangers, auto's,
// water, wolken) al verschilt. ELECTRON_EXE als desktop/node_modules/electron ontbreekt.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const OUT = path.resolve(arg('out', path.join(process.env.TEMP || '.', 'gde-stadvergelijk')));
const RUNS = arg('game-dir', '').split(',').filter(Boolean).map((s) => { const m = /^([A-Za-z][\w-]*)=(.+)$/.exec(s); return { label: m[1], game: path.resolve(m[2]) }; });
const only = arg('only', '').split(',').filter(Boolean);
const spotsFile = path.resolve(arg('spots', path.join(HERE, 'stadspots.json')));
const SETTLE = arg('settle', '4500');
fs.mkdirSync(OUT, { recursive: true });

if (!flag('alleen-vergelijken')) {
  const { spots } = JSON.parse(fs.readFileSync(spotsFile, 'utf8'));
  const wereld = [];
  for (const s of spots) {
    if (only.length && !only.some((o) => s.name.startsWith(o))) continue;
    for (const dag of s.nacht ? [true, false] : [true]) {
      wereld.push({ kind: 'wereld', name: s.name + (dag ? '-dag' : '-nacht'), cat: s.cat, clock: dag ? 13 : 23, weather: { kind: 'helder' }, x: s.x, y: s.y, a: s.a, snap: false });
    }
  }
  const planFile = path.join(OUT, 'stadplan.json');
  fs.writeFileSync(planFile, JSON.stringify({ wereld }));
  const PRE = "{ const st = document.createElement('style'); st.textContent = '#hud, #start-screen, #subtitles { visibility: hidden !important; }'; document.head.appendChild(st); }\n";
  for (const run of RUNS) {
    const out = path.join(OUT, run.label);
    fs.mkdirSync(out, { recursive: true });
    console.log(`== ${run.label}: ${wereld.length} stops uit ${run.game}`);
    const r = spawnSync(process.execPath, [path.join(HERE, 'sweep.mjs'), '--part=wereld', `--plan-file=${planFile}`, `--out=${out}`, `--settle=${SETTLE}`, ...(flag('slot') ? ['--slot'] : [])],
      { stdio: 'inherit', env: { ...process.env, GDE_GAME_DIR: run.game, GAME_WORLD: path.join(run.game, 'world'), SWEEP_PRE: PRE } });
    console.log(`${run.label}: sweep exit ${r.status}`);
  }
}
const basis = arg('basis', RUNS.length ? RUNS[0].label : 'A');
const labels = fs.readdirSync(OUT).filter((d) => fs.statSync(path.join(OUT, d)).isDirectory() && d !== basis);
for (const l of labels) {
  const r = spawnSync(process.execPath, [path.join(HERE, 'stadverschil.mjs'), `--a=${path.join(OUT, basis)}`, `--b=${path.join(OUT, l)}`, `--out=${path.join(OUT, `verschil-${basis}-${l}`)}`], { stdio: 'inherit' });
  if (r.status) console.log(`verschil ${basis}-${l}: exit ${r.status}`);
}
