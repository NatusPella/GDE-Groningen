// Visuele kwaliteitssweep (#sweep): screenshots op willekeurige plekken, tijden, weersoorten en
// verhaalstappen, met een vaste seed en een logboek, plus automatische beoordeling van elk beeld.
//   node scripts/qa/sweep.mjs [--seed=1] [--out=<map>] [--part=wereld,verhaal,cut,alles]
//        [--wereld=45] [--verhaal=26] [--cut=14] [--settle=6000] [--only=<stops>] [--slot] [--plan]
// --plan schrijft alleen plan.json (geen Electron). Eén Electron-instantie per deel, wegwerpprofiel,
// nooit echte opslag. --slot neemt een Electron-slot volgens <GDE_LOCKS>/README.txt.
// ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt; GAME_WORLD=<map> als de
// gestagede wereld niet in game/world of desktop/build/game/world staat.
// Uitvoer in <out>: plan.json, logboek.md, bevindingen.json, shots-<naam>.png, run-<deel>.log.
// Het logboek zegt altijd welke beelden niemand heeft bekeken; de automatische checks zijn geen oordeel.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodePng, analyseImage } from '../lib/pngcheck.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const SEED = Number(arg('seed', 1)) || 1;
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-sweep', `seed-${SEED}`)));
const PARTS = arg('part', 'alles').split(',').flatMap((x) => (x === 'alles' ? ['wereld', 'verhaal', 'cut'] : [x]));
const N_WERELD = Number(arg('wereld', 45)), N_VERHAAL = Number(arg('verhaal', 26)), N_CUT = Number(arg('cut', 14));
const SETTLE = Number(arg('settle', 6000));

// ---- seeded RNG (mulberry32) ----
let st = SEED >>> 0;
const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const worldDirs = [process.env.GAME_WORLD, path.join(ROOT, 'game', 'world'), path.join(ROOT, 'desktop', 'build', 'game', 'world')].filter(Boolean);
const worldDir = worldDirs.find((d) => fs.existsSync(path.join(d, 'index-provincie.json')));
if (!worldDir) { console.error('Geen gestagede wereld gevonden (cd desktop && npm run stage, of GAME_WORLD=<map>).'); process.exit(2); }
const index = JSON.parse(fs.readFileSync(path.join(worldDir, 'index-provincie.json'), 'utf8')).global;
const place = (name, kind) => { const p = index.places.find((q) => q.name === name && (!kind || q.kind === kind)); if (!p) throw new Error(`plaats niet gevonden: ${name}`); return p; };
const off = (a, dx, dy) => ({ x: a.x + dx, y: a.y + dy });
const jit = (p, r) => off(p, (rnd() * 2 - 1) * r, (rnd() * 2 - 1) * r);

const CLOCKS = [5.5, 7, 9, 11, 13, 15, 17, 19, 20.5, 22, 0.5, 3];
const WEATHERS = [{ kind: 'helder' }, { kind: 'helder' }, { kind: 'helder' }, { kind: 'motregen', intensity: 0.3, wet: 0.4, overcast: 0.6 }, { kind: 'regenbui', intensity: 0.6, wet: 0.8, overcast: 0.8 }, { kind: 'onweer', intensity: 0.85, wet: 1, overcast: 1 }, { kind: 'helder', mist: 0.7, overcast: 0.3 }];

// ---- plan ----
function buildPlan() {
  const centrum = place('Groningen', 'city');
  const cats = [];
  const dorpen = index.places.filter((p) => (p.kind === 'village' || p.kind === 'town') && p.pop > 150);
  const gehuchten = index.places.filter((p) => p.kind === 'hamlet' || p.kind === 'village');
  const wijken = index.places.filter((p) => p.kind === 'neighbourhood' || p.kind === 'quarter');
  const vast = {
    stad: () => ({ ...jit(centrum, 1800), snapR: 250 }),
    wijk: () => { const q = pick(wijken); return { ...jit(q, 60), snapR: 250, plaats: q.name }; },
    dorp: () => { const q = pick(dorpen); return { ...jit(q, 120), snapR: 300, plaats: q.name }; },
    gehucht: () => { const q = pick(gehuchten); return { ...jit(q, 80), snapR: 400, plaats: q.name }; },
    a7: () => ({ ...jit(pick([place('Hoogkerk'), place('Hoogezand'), place('Zuidbroek'), place('Scheemda'), place('Veendam')]), 1500), road: 'A7', snapR: 6000 }),
    kust: () => ({ ...jit(pick([place('Lauwersoog'), place('Termunterzijl'), place('Zoutkamp')]), 400), snapR: 900 }),
    eemshaven: () => ({ ...jit(place('Eemshaven'), 900), snapR: 1500 }),
    delfzijl: () => ({ ...jit(place('Delfzijl'), 700), snapR: 1000 }),
    waddenzee: () => ({ ...off(pick([place('Lauwersoog'), place('Eemshaven'), place('Rottum')]), (rnd() - 0.5) * 3000, -1500 - rnd() * 2500), snap: false }),
    ommeland: () => { const q = pick(gehuchten); return { ...jit(q, 1200), snapR: 1500, plaats: q.name }; },
  };
  const namen = Object.keys(vast);
  // elke categorie minstens één keer, de rest naar gewicht
  const gewicht = ['stad', 'stad', 'wijk', 'wijk', 'dorp', 'dorp', 'gehucht', 'a7', 'kust', 'eemshaven', 'delfzijl', 'waddenzee', 'ommeland', 'ommeland'];
  const rij = namen.concat(Array.from({ length: Math.max(0, N_WERELD - namen.length) }, () => pick(gewicht)));
  const wereld = shuffle(rij).slice(0, N_WERELD).map((c, i) => {
    const s = vast[c]();
    return { kind: 'wereld', name: `w${String(i + 1).padStart(2, '0')}-${c}`, cat: c, x: Math.round(s.x), y: Math.round(s.y), snapR: s.snapR, road: s.road, snap: s.snap, plaats: s.plaats, clock: pick(CLOCKS), weather: pick(WEATHERS), a: s.snap === false ? rnd() * Math.PI * 2 : undefined };
  });
  const nrs = shuffle(Array.from({ length: 26 }, (_, i) => i + 1));
  const menus = ['overzicht', 'todo', 'map', 'telefoon', 'verhaal', 'spullen', 'garage', 'settings', 'prestaties', 'fotos', 'streken', 'samen', 'controls'];
  const verhaal = Array.from({ length: N_VERHAAL }, (_, i) => {
    const m = nrs[i % 26];
    return { kind: 'verhaal', name: `v${String(i + 1).padStart(2, '0')}-M${String(m).padStart(2, '0')}`, cat: 'verhaal', mnum: m, r: rnd(), clock: pick(CLOCKS), weather: pick(WEATHERS), shots: 2, menu: i % 2 === 0 ? menus[(i / 2) % menus.length] : undefined };
  });
  return { seed: SEED, wereld, verhaal, cut: { seed: SEED, n: N_CUT } };
}
const plan = buildPlan();
// --only=w15-kust,v03-M26 (met cut): alleen die stops van het plan, met dezelfde seed (een controle na een fix)
const ONLY = arg('only', '').split(',').filter(Boolean);
if (ONLY.length) {
  plan.wereld = plan.wereld.filter((s) => ONLY.some((o) => s.name === o || s.name.startsWith(o + '-')));
  plan.verhaal = plan.verhaal.filter((s) => ONLY.some((o) => s.name === o || s.name.startsWith(o + '-')));
  if (!ONLY.includes('cut')) plan.cut.n = 0;
}
// --plan-file=<json>: eigen wereldplekken ({ wereld: [{ kind: 'wereld', name, cat, clock, weather, x, y, a, snap }] }), zoals
// scripts/qa/stadvergelijk.mjs ze maakt; er zijn dan geen verhaalstappen of cutscenes
if (arg('plan-file', '')) { const pf = JSON.parse(fs.readFileSync(path.resolve(arg('plan-file', '')), 'utf8')); plan.wereld = pf.wereld; plan.verhaal = []; plan.cut.n = 0; }
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(plan, null, 1));
if (flag('plan')) { console.log(`plan: ${plan.wereld.length} wereldplekken, ${plan.verhaal.length} verhaalstappen, ${plan.cut.n} cutscenes -> ${path.join(OUT, 'plan.json')}`); process.exit(0); }

// ---- slot ----
let slot = null;
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
if (flag('slot')) {
  const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
  for (let tries = 0; tries < 720 && !slot; tries++) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (!slot) await new Promise((r) => setTimeout(r, Number(process.env.SWEEP_SLOT_POLL_MS) || 20000));
  }
  if (!slot) { console.error('geen Electron-slot gekregen'); process.exit(4); }
}
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + `const kEnter = () => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); } };
let seen = false;
for (let i = 0; i < 60; i++) { const s = document.querySelector('#start-screen'); const up = !!s && s.classList.contains('visible'); if (up) { seen = true; const it = [...s.querySelectorAll('.ss-item')].find((e) => /nieuw spel/i.test(e.textContent)); if (it) it.click(); else kEnter(); } await new Promise((r) => setTimeout(r, up ? 2500 : 1000)); if (seen && !up) break; if (document.body.classList.contains('game-started')) break; }
await new Promise((r) => setTimeout(r, 4000));\n`;

async function runPart(deel, pre, pageFile, extraEnv = {}) {
  const profile = `gde-test-sweep-${process.pid}-${deel}`;
  const script = path.join(OUT, `_page-${deel}.js`);
  fs.writeFileSync(script, WACHT + (process.env.SWEEP_PRE || "") + pre + fs.readFileSync(path.join(HERE, pageFile), "utf8")); // SWEEP_PRE: eigen code vóór de pagina (stadvergelijk: HUD verbergen)
  const env = { ...process.env, GDE_TEST_PROFILE: profile, ...extraEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  const logFd = fs.openSync(path.join(OUT, `run-${deel}.log`), 'w');
  const child = spawn(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
    `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', logFd, logFd] });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen recht: gewone prioriteit */ }
  const kill = setTimeout(() => { try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); } catch { /* weg */ } }, 50 * 60 * 1000);
  const code = await new Promise((res) => { child.on('exit', (c, sig) => res(sig || c)); child.on('error', (e) => res('fout ' + e.message)); });
  clearTimeout(kill);
  fs.closeSync(logFd);
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  console.log(`${deel}: exit ${code}`);
  return fs.readFileSync(path.join(OUT, `run-${deel}.log`), 'utf8');
}

const stops = [];
const csInfo = [];
for (const deel of PARTS) {
  let log = '';
  if ((deel === 'wereld' && !plan.wereld.length) || (deel === 'verhaal' && !plan.verhaal.length) || (deel === 'cut' && !plan.cut.n)) continue;
  if (deel === 'wereld') log = await runPart(deel, `window.__sw = ${JSON.stringify({ plan: plan.wereld, settle: SETTLE })};\n`, 'sweep.page.js');
  else if (deel === 'verhaal') log = await runPart(deel, `window.__sw = ${JSON.stringify({ plan: plan.verhaal, settle: SETTLE })};\n`, 'sweep.page.js', { GDE_NIEUW_VERHAAL: '1' });
  else if (deel === 'cut') log = await runPart(deel, `window.__cs = ${JSON.stringify({ sample: plan.cut, settle: SETTLE })};\n`, 'cutscene_shots.page.js');
  let ret = {};
  for (const l of log.split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { ret = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
  for (const r of ret.stops || []) stops.push({ deel, ...r });
  for (const [id, r] of Object.entries(ret.results || {})) {
    csInfo.push(`${id}: ${r.fout ? 'fout ' + r.fout : r.shots + ' beelden'}${r.clip ? ', camera in gebouw/grond op t=' + r.clip.slice(0, 8).join(',') : ''}`);
    if (r.fout) stops.push({ deel, name: id, fout: r.fout });
  }
  // NaN / foutregels uit het hoofdproces
  stops.push({ deel, name: `log-${deel}`, logregels: log.split(/\r?\n/).filter((l) => /NaN|Cannot access .* before initialization|Uncaught|TypeError|ReferenceError/.test(l) && !/sweep-stop|perf-script/.test(l)).filter((l, i, a) => a.indexOf(l) === i).slice(0, 12) });
}

// ---- beoordeling van de PNG's ----
const files = fs.readdirSync(OUT).filter((f) => /^shots-.+\.png$/.test(f) && f !== 'shots.png');
const beelden = [];
for (const f of files) {
  const naam = f.replace(/^shots-/, '').replace(/\.png$/, '');
  try {
    const a = analyseImage(decodePng(fs.readFileSync(path.join(OUT, f))));
    beelden.push({ naam, bestand: f, verdict: a.verdict, black: +a.black.toFixed(3), mean: +a.mean.toFixed(1), std: +a.std.toFixed(1) });
  } catch (e) { beelden.push({ naam, bestand: f, verdict: 'onleesbaar', fout: e.message }); }
}
const vlaggen = [];
for (const b of beelden) {
  if (b.verdict !== 'ok') vlaggen.push({ naam: b.naam, vlag: `beeld ${b.verdict}` });
}
for (const s of stops) {
  if (s.fout) vlaggen.push({ naam: s.name, vlag: `script-fout: ${s.fout.split('\n')[0]}` });
  if (s.logregels && s.logregels.length) vlaggen.push({ naam: s.name, vlag: `logregels: ${s.logregels.join(' | ').slice(0, 300)}` });
  if (!s.scene) continue;
  if (s.startScreen) vlaggen.push({ naam: s.name, vlag: 'logomenu (titelscherm) ligt over de wereld' });
  if (s.scene.nan) vlaggen.push({ naam: s.name, vlag: `NaN-geometrie in ${s.scene.nan} meshes` });
  if (s.scene.noTex) vlaggen.push({ naam: s.name, vlag: `texture ontbreekt (${s.scene.badTex.join(', ')})` });
  if (s.scene.meshes < 300 && s.cat !== 'waddenzee') vlaggen.push({ naam: s.name, vlag: `bijna lege wereld (${s.scene.meshes} zichtbare meshes)` });
  if (s.hud && s.hud.clip.length) vlaggen.push({ naam: s.name, vlag: `HUD buiten beeld: ${s.hud.clip.map((c) => c.text).join(' | ')}` });
  if (s.hud && s.hud.overlap.length) vlaggen.push({ naam: s.name, vlag: `HUD-tekst overlapt: ${s.hud.overlap.map((o) => o.join(' / ')).join(' | ')}` });
  if (s.inWater && s.cat !== 'waddenzee') vlaggen.push({ naam: s.name, vlag: 'speler staat in water' });
  if (s.inBuilding) vlaggen.push({ naam: s.name, vlag: 'speler staat in een gebouw' });
  if (s.ground !== undefined && s.ground !== null && Math.abs((s.pz || 0) - s.ground) > 3 && !s.inWater) vlaggen.push({ naam: s.name, vlag: `speler zweeft of zakt (z ${(s.pz || 0).toFixed(1)}, grond ${s.ground.toFixed(1)})` });
  if (s.errors) vlaggen.push({ naam: s.name, vlag: `consolefouten: ${s.errors.join(' | ').slice(0, 300)}` });
  if (s.deel === 'verhaal' && s.jumped === false) vlaggen.push({ naam: s.name, vlag: `sprong naar ${s.step} mislukt` });
}
for (const l of csInfo) if (/camera in gebouw/.test(l)) vlaggen.push({ naam: 'cutscene', vlag: l });
fs.writeFileSync(path.join(OUT, 'bevindingen.json'), JSON.stringify({ seed: SEED, beelden, stops, vlaggen, cutscenes: csInfo }, null, 1));

const md = [`# Sweep seed ${SEED}`, '', `Beelden: ${beelden.length}; plekken/stappen gelogd: ${stops.filter((s) => s.scene).length}; vlaggen: ${vlaggen.length}.`, '**Geen van deze beelden is door een mens bekeken**; de vlaggen zijn automatisch. Beeldverdicten tellen alleen zwart, leeg en ongeldig.', '', '## Vlaggen', ...vlaggen.map((v) => `- ${v.naam}: ${v.vlag}`), '', '## Logboek', ...stops.filter((s) => s.scene).map((s) => `- ${s.name} (${s.cat}) klok ${s.clock}, ${s.weather}${s.plaats || s.place ? ', bij ' + (s.place || s.plaats) : ''}${s.step ? ', stap ' + s.step : ''}${s.at ? ', op ' + s.at.join(',') : ''}`), '', '## Cutscenes', ...csInfo.map((l) => `- ${l}`)];
fs.writeFileSync(path.join(OUT, 'logboek.md'), md.join('\n') + '\n');
// poort: een zwarte wereld of een fout per frame is geen vondst maar een gebroken build; de run faalt dan (exitcode 1)
const poort = vlaggen.filter((v) => /^(logregels|logomenu|bijna lege wereld|script-fout|NaN-geometrie|beeld (zwart|leeg|ongeldig))/.test(v.vlag));
if (poort.length) {
  fs.appendFileSync(path.join(OUT, 'logboek.md'), ['', '## POORT GEFAALD', ...poort.map((v) => `- ${v.naam}: ${v.vlag}`), ''].join('\n'));
  console.log(`POORT GEFAALD: ${poort.length} vlaggen (zwart beeld, lege wereld, consolefout of script-fout), zie logboek.md`);
}
console.log(`beelden: ${beelden.length}, vlaggen: ${vlaggen.length}; uitvoer: ${OUT}`);
process.exitCode = poort.length ? 1 : 0;
