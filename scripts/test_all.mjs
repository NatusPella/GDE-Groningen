// Eén commando dat alles test en een leesbaar rapport maakt (#186, #5, #4). Zie docs/TESTEN.md.
//   node scripts/test_all.mjs [--fase=licht|zwaar|electron|alles] [--rapport=<map>]
//        [--only=<tekst>] [--jobs=2] [--test-timeout=120] [--issues [--create]] [--force] [--locks=<map>] [--stage [--cache=<map>]] [--list]
// Fasen (standaard licht):
//   licht     module-check, import_check, voice_coverage, text_audit, dode-code-bewaking en alle
//             scripts/*_test.mjs (met duur en tijdslimiet; import_cycles_test bewaakt de cycli)
//   zwaar     de wereldchecks en audits (ring_probe, seat_audit, province_test, drive_audit, ...)
//   electron  smoke-run, verhaaltest, geocheck, spelbot-sweeps en de beeldrondes, met beeldchecks
// Uitvoer in <rapport>/<tijdstempel>/: fase-<naam>.json|md, rapport.json|md (samenvatting bovenaan),
// issues-concept.md (met --issues). <rapport>/state.json onthoudt de laatste run per fase voor de trend.
// Standaard <rapport> = %TEMP%/gde-testall (buiten de repo). Schrijft nooit naar echte opslag: de
// Electron-stappen gebruiken een wegwerpprofiel (GDE_TEST_PROFILE) in een eigen tijdelijke map.
// Raakt poort 9000 en de geïnstalleerde app nooit aan en start niet als er al een Electron draait (--force).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSyntax } from './lib/syntaxcheck.mjs';
import { EXCLUDED, SLOW, MISSING_DATA, listFiles } from './run_tests.mjs';
import { decodePng, analyseImage, signature, signatureDiff } from './lib/pngcheck.mjs';
import * as R from './lib/testrapport.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const a = argv.find((v) => v.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : d; };
const FASE = opt('fase', 'licht');
const BASE = path.resolve(opt('rapport', path.join(os.tmpdir(), 'gde-testall')));
const ONLY = opt('only', '');
const LOCKS = opt('locks', fs.existsSync('C:/Users/abuis/gde-locks') ? 'C:/Users/abuis/gde-locks' : '');
const JOBS = Math.max(1, Number(opt('jobs', 2)));
const TEST_MS = Number(opt('test-timeout', 120)) * 1000;
const STAMP = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
const RUN = path.join(BASE, STAMP);
const split = (s) => String(s || '').split(/\r?\n/);
const tail = (s, n = 12) => split(s).filter(Boolean).slice(-n).join('\n');
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- processen

function killTree(child) {
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGKILL');
  } catch { /* al weg */ }
}

// -> { code, timedOut, out, secs }; sluit het hele proces af bij de tijdslimiet.
export function runCmd(cmd, args, { ms = TEST_MS, env = {}, cwd = ROOT } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let out = '', timedOut = false, done = false;
    let child;
    try { child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, shell: /\.(cmd|bat)$/i.test(cmd) }); } catch (e) { resolve({ code: -1, timedOut: false, out: 'starten mislukt: ' + e.message, secs: 0 }); return; }
    const add = (d) => { out += d; if (out.length > 8e6) out = out.slice(-4e6); };
    child.stdout.on('data', add); child.stderr.on('data', add);
    const fin = (code) => { if (done) return; done = true; clearTimeout(timer); resolve({ code, timedOut, out, secs: (Date.now() - t0) / 1000 }); };
    const timer = setTimeout(() => { timedOut = true; killTree(child); setTimeout(() => fin(null), 2000); }, ms);
    child.on('error', (e) => { out += '\nstarten mislukt: ' + e.message; fin(-1); });
    child.on('close', (code) => fin(code));
  });
}

async function pool(taken, n) {
  const res = new Array(taken.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, taken.length) }, async () => {
    while (i < taken.length) { const k = i++; res[k] = await taken[k](); }
  }));
  return res;
}

const NIET_NODIG = /Cannot find (package|module)[^\n]*['"]three['"]|vendor[\\/]+three|is not vendored yet/i;
export function statusVan(res) {
  if (res.timedOut) return 'TIMEOUT';
  if (res.code === 0) return /^SKIP\b/m.test(res.out) ? 'SKIP' : 'PASS';
  if (MISSING_DATA.test(res.out) || NIET_NODIG.test(res.out)) return 'SKIP';
  return 'FAIL';
}
function itemUitRes(fase, id, naam, res, ms) {
  const st = statusVan(res);
  let detail = '';
  if (st === 'TIMEOUT') detail = `tijdslimiet van ${Math.round(ms / 1000)}s overschreden`;
  else if (st === 'SKIP') detail = 'niet gedraaid: ' + (split(res.out).find((l) => /^SKIP\b/.test(l.trim())) || 'game/world, data/cache of de gestagede three.js ontbreekt (cd desktop && npm run stage)');
  else if (st === 'FAIL') detail = (R.eersteFout(res.out) + '\n' + tail(res.out)).slice(0, 1500);
  return R.maakItem(fase, id, naam, st, res.secs, detail);
}

const heeftWereld = () => fs.existsSync(path.join(ROOT, 'game', 'world', 'index-provincie.json'));
const skip = (fase, id, naam, reden) => R.maakItem(fase, id, naam, 'SKIP', 0, 'niet gedraaid: ' + reden);
const wilDit = (id) => !ONLY || id.includes(ONLY);

// ---------------------------------------------------------------- stage (--stage)

// Bouwt game/world als die ontbreekt: hergebruikt een wereld-cache (--cache=<map>, standaard die van GDE-merge),
// neemt het exclusieve stage-slot en draait `npm run stage` in desktop/.
async function stageWereld() {
  const cache = opt('cache', 'C:/Users/abuis/GIT/GDE-merge/desktop/.world-cache');
  const doel = path.join(ROOT, 'desktop', '.world-cache');
  if (!fs.existsSync(doel) && fs.existsSync(cache)) fs.cpSync(cache, doel, { recursive: true });
  const slot = LOCKS ? path.join(LOCKS, 'stage') : null;
  while (slot) { try { fs.mkdirSync(slot); break; } catch { log('wacht op het stage-slot...'); await slaap(30e3); } }
  // game/world kan een koppeling naar de gestagede wereld zijn (zodat de node-tests de provincie vinden); die mag
  // niet mee naar build/game, dus eerst los en na het stagen weer vast.
  const gw = path.join(ROOT, 'game', 'world'), gebouwd = path.join(ROOT, 'desktop', 'build', 'game', 'world');
  let koppeling = false;
  try { koppeling = fs.lstatSync(gw).isSymbolicLink(); } catch { /* geen game/world */ }
  try {
    if (koppeling) fs.rmdirSync(gw);
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    if (!fs.existsSync(path.join(ROOT, 'desktop', 'node_modules'))) await runCmd(npm, ['install', '--no-audit', '--no-fund'], { ms: 15 * 60e3, cwd: path.join(ROOT, 'desktop') });
    const r = await runCmd(npm, ['run', 'stage'], { ms: 45 * 60e3, cwd: path.join(ROOT, 'desktop') });
    return r.code === 0 ? 'gestaged' : 'stage mislukte: ' + tail(r.out, 4);
  } finally {
    if (koppeling && !fs.existsSync(gw) && fs.existsSync(gebouwd)) fs.symlinkSync(gebouwd, gw, 'junction');
    if (slot) try { fs.rmdirSync(slot); } catch { /* al weg */ }
  }
}

// ---------------------------------------------------------------- fase licht

// Tests die minuten kosten (city_*, tegelwerelden): ruime limiet zodat ze echt uitkomen.
const ZWARE_TESTS = /^(city_|corridor|tileworld|world_tiles|navgraph|minigames|overlap|road_route|water_look|mode_route|swim_escape|barge|import_cycles)/;

async function faseLicht(prev) {
  const items = [];
  // 1. module-check van alle JS (module-aware, zie lib/syntaxcheck.mjs)
  if (!ONLY || 'module-check'.includes(ONLY) || ONLY === 'module') {
    const t0 = Date.now();
    const files = ['game', 'scripts', 'desktop', 'web'].filter((d) => fs.existsSync(path.join(ROOT, d))).flatMap((d) => listFiles(path.join(ROOT, d), /\.(js|mjs)$/)).sort();
    let bad = 0;
    for (const f of files) {
      const r = checkSyntax(f);
      if (!r.ok) { bad++; items.push(R.maakItem('licht', 'module:' + rel(f), 'module-check ' + rel(f), 'FAIL', 0, R.eersteFout(r.out) + '\n' + tail(r.out, 6))); }
    }
    items.push(R.maakItem('licht', 'module-check', `module-check (${files.length} bestanden)`, bad ? 'FAIL' : 'PASS', (Date.now() - t0) / 1000, bad ? `${bad} bestand(en) met een syntaxfout` : ''));
    log(`${bad ? 'FAIL' : 'PASS'}  module-check, ${files.length} bestanden, ${bad} fout`);
  }
  // 2. de losse controles
  const losse = [
    ['import_check', ['scripts/import_check.mjs']],
    ['voice_coverage', ['scripts/voice_coverage.mjs', '--quiet']],
    ['text_audit', ['scripts/text_audit.mjs']],
  ].filter(([id]) => wilDit(id));
  for (const [id, a] of losse) {
    const r = await runCmd(process.execPath, a, { ms: TEST_MS });
    const it = itemUitRes('licht', id, id, r, TEST_MS);
    items.push(it); log(`${it.status.padEnd(7)} ${id} ${it.secs}s`);
  }
  // 3. dode code: de aantallen mogen alleen dalen
  if (wilDit('dode-code')) {
    const r = await runCmd(process.execPath, ['scripts/dead_code.mjs', '--json'], { ms: TEST_MS });
    let it;
    try {
      const lijst = JSON.parse(r.out.slice(r.out.indexOf('[')));
      const wees = lijst.filter((m) => m.kind === 'wees').length;
      const ongebruikt = lijst.reduce((s, m) => s + (m.unused ? m.unused.length : 0), 0);
      const p = prev.get('dode-code');
      const pm = p && p.extra && p.extra.metrics;
      const erger = pm && (wees > pm.wees || ongebruikt > pm.ongebruikt);
      it = R.maakItem('licht', 'dode-code', 'dode-code-bewaking', erger ? 'FAIL' : 'PASS', r.secs,
        `${wees} wees-modules, ${ongebruikt} ongebruikte exports${pm ? ` (vorige run: ${pm.wees} en ${pm.ongebruikt})` : ' (eerste meting, nog geen drempel)'}${erger ? ': het is erger geworden' : ''}`, { metrics: { wees, ongebruikt } });
    } catch (e) { it = itemUitRes('licht', 'dode-code', 'dode-code-bewaking', r.code === 0 ? { ...r, code: 1, out: 'JSON van dead_code onleesbaar: ' + e.message } : r, TEST_MS); }
    items.push(it); log(`${it.status.padEnd(7)} dode-code ${it.detail}`);
  }
  // 4. alle scripts/*_test.mjs (zonder de zware: die staan in fase zwaar)
  const tests = fs.readdirSync(path.join(ROOT, 'scripts')).filter((n) => /_test\.mjs$/.test(n) && !EXCLUDED.has(n)).filter((n) => wilDit(n)).sort();
  const taken = tests.map((t) => async () => {
    const ms = ZWARE_TESTS.test(t) ? TEST_MS * 15 : SLOW.has(t) ? TEST_MS * 4 : TEST_MS;
    const r = await runCmd(process.execPath, [path.join('scripts', t)], { ms });
    const it = itemUitRes('licht', 'test:' + t, t, r, ms);
    log(`${it.status.padEnd(7)} ${t} ${it.secs}s`);
    return it;
  });
  items.push(...(await pool(taken, JOBS)));
  return items;
}

// ---------------------------------------------------------------- fase zwaar

const ZWAAR = [
  // [id, script, args, timeout s, wereld nodig]
  ['ring_probe', 'scripts/ring_probe.mjs', [], 300, false, (o) => { const m = /ring solids: (\d+)/.exec(o); return m && Number(m[1]) > 0 ? `${m[1]} vaste obstakels op de ring` : null; }],
  ['seat_audit', 'scripts/seat_audit.mjs', [], 300, false],
  ['placement_audit-stad', 'scripts/world/placement_audit.mjs', ['--strict'], 300, false],
  ['placement_audit-provincie', 'scripts/world/placement_audit.mjs', ['--world', '--strict'], 600, true],
  ['prop_conflict_audit', 'scripts/world/prop_conflict_audit.mjs', ['--strict'], 900, true],
  ['prop_conflict_audit_test', 'scripts/prop_conflict_audit_test.mjs', [], 600, true],
  ['prop_water_audit', 'scripts/world/prop_water_audit.mjs', ['--strict'], 600, true],
  ['water_layers_audit', 'scripts/world/water_layers_audit.mjs', ['--strict'], 600, true],
  ['province_water_audit', 'scripts/province_water_audit.mjs', [], 600, true],
  ['landmark_audit', 'scripts/world/landmark_audit.mjs', ['--strict'], 600, true],
  ['overlap_check', 'scripts/world/overlap_check.mjs', [], 600, true],
  ['randaudit', 'scripts/world/randaudit.mjs', [], 600, true],
  ['height_audit', 'scripts/world/height_audit.mjs', ['--strict'], 600, true],
  ['terrain_audit', 'scripts/world/terrain_audit.mjs', [], 600, true],
  ['railprofile', 'scripts/world/railprofile.mjs', ['--strict'], 300, false],
  ['drive_audit', 'scripts/world/drive_audit.mjs', ['--strict'], 1800, true],
  ['junction_sim_test', 'scripts/junction_sim_test.mjs', [], 900, true],
  ['network_drive_test', 'scripts/network_drive_test.mjs', [], 5400, true],
  ['province_test', 'scripts/province_test.mjs', [], 5400, true],
  ['province_detail_test', 'scripts/province_detail_test.mjs', [], 5400, true],
  ['vaarnet_province_test', 'scripts/vaarnet_province_test.mjs', [], 900, true],
  ['bridge_province_test', 'scripts/bridge_province_test.mjs', [], 900, true],
];

async function faseZwaar() {
  const items = [];
  const wereld = heeftWereld();
  const taken = ZWAAR.filter(([id]) => wilDit(id)).map(([id, script, args, secs, metWereld, extra]) => async () => {
    if (!fs.existsSync(path.join(ROOT, script))) return skip('zwaar', id, id, `${script} bestaat niet (meer)`);
    if (metWereld && !wereld) return skip('zwaar', id, id, 'game/world ontbreekt (cd desktop && npm run stage)');
    const ms = secs * 1000;
    const r = await runCmd(process.execPath, [script, ...args], { ms });
    const it = itemUitRes('zwaar', id, id, r, ms);
    const meer = it.status === 'PASS' && extra && extra(r.out);
    if (meer) { it.status = 'FAIL'; it.detail = meer; }
    log(`${it.status.padEnd(7)} ${id} ${it.secs}s`);
    return it;
  });
  items.push(...(await pool(taken, 1))); // zwaar: één tegelijk, de eigenaar speelt misschien
  return items;
}

// ---------------------------------------------------------------- fase electron

// Slotenprotocol (--locks=<map>, zie C:/Users/abuis/gde-locks/README.txt): maximaal 3 Electron-slots, mkdir faalt als bezet.
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
async function neemSlot(max = 3, wachtMs = 90 * 60e3) {
  if (!LOCKS) return null;
  const t0 = Date.now();
  for (;;) {
    for (let i = 1; i <= max; i++) {
      const d = path.join(LOCKS, 'electron-' + i);
      try { fs.mkdirSync(d); return d; } catch { /* bezet */ }
      try { if (Date.now() - fs.statSync(d).mtimeMs > 90 * 60e3) fs.rmdirSync(d); } catch { /* weg */ }
    }
    if (Date.now() - t0 > wachtMs) throw new Error('geen Electron-slot vrijgekomen');
    log('wacht op een Electron-slot...');
    await slaap(60e3);
  }
}
const geefSlot = (d) => { if (d) try { fs.rmdirSync(d); } catch { /* al weg */ } };

function electronExe() {
  if (process.env.ELECTRON_EXE) return process.env.ELECTRON_EXE;
  return path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : (process.platform === 'darwin' ? 'Electron.app/Contents/MacOS/Electron' : 'electron'));
}
function elektronDraait() {
  if (process.platform === 'win32') {
    const r = spawnSync('powershell', ['-NoProfile', '-Command', "(Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | Where-Object { $_.CommandLine -notmatch '--type=' } | Measure-Object).Count"], { encoding: 'utf8' });
    return Number((r.stdout || '').trim()) || 0;
  }
  const r = spawnSync('pgrep', ['-x', process.platform === 'darwin' ? 'Electron' : 'electron'], { encoding: 'utf8' });
  return split(r.stdout).filter(Boolean).length;
}

// Beeldcheck van alle PNG's in een map. -> items (één samenvatting + één per mislukt of afwijkend beeld)
function beeldItems(stap, dir, prevSigs, sigsUit) {
  const items = [];
  const bestanden = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => /\.png$/i.test(n) && !n.startsWith('_')).sort() : [];
  if (!bestanden.length) return [R.maakItem('electron', 'beeld:' + stap, 'beeldcheck ' + stap, 'FAIL', 0, 'geen enkel beeld gemaakt in ' + dir)];
  let slecht = 0, afwijkend = 0, onleesbaar = 0, vergeleken = 0;
  for (const n of bestanden) {
    const id = `beeld:${stap}/${n}`;
    try {
      const img = decodePng(fs.readFileSync(path.join(dir, n)));
      const an = analyseImage(img);
      const sig = signature(img);
      sigsUit[`${stap}/${n}`] = sig;
      const diff = signatureDiff(prevSigs[`${stap}/${n}`], sig);
      if (diff != null) vergeleken++;
      const b = R.beoordeelBeeld(an, diff);
      if (b.status === 'FAIL') { slecht++; items.push(R.maakItem('electron', id, id, 'FAIL', 0, b.detail, { diff })); }
      else if (b.warn) { afwijkend++; items.push(R.maakItem('electron', id, id, 'PASS', 0, b.detail, { warn: true, diff })); }
    } catch (e) { onleesbaar++; items.push(R.maakItem('electron', id, id, 'FAIL', 0, 'PNG onleesbaar: ' + e.message)); }
  }
  items.unshift(R.maakItem('electron', 'beeld:' + stap, 'beeldcheck ' + stap, slecht || onleesbaar ? 'FAIL' : 'PASS', 0,
    `${bestanden.length} beelden: ${slecht} zwart/leeg/ongeldig, ${onleesbaar} onleesbaar, ${afwijkend} wijkt af van vorige run (${vergeleken} vergeleken)`));
  return items;
}

function consoleItem(stap, tekst, secs) {
  const f = R.scanLog(tekst);
  return R.maakItem('electron', 'console:' + stap, 'consolefouten ' + stap, f.length ? 'FAIL' : 'PASS', secs, f.map((x) => `${x.soort}: ${x.regel}`).join('\n'));
}

async function faseElectron(prev, staat) {
  const items = [];
  const exe = electronExe();
  const reden = !fs.existsSync(exe) ? `Electron ontbreekt (${exe}); cd desktop && npm install, of zet ELECTRON_EXE`
    : !heeftWereld() ? 'game/world ontbreekt (cd desktop && npm run stage)'
      : (!flag('force') && !LOCKS && elektronDraait() > 0) ? 'er draait al een Electron-instantie (de eigenaar speelt?); niets is gestart. Gebruik --force om toch te draaien'
        : null;
  const STAPPEN = ['smoke', 'wereldpoort', 'verhaaltest', 'geocheck', 'bot-missies', 'bot-minigames', 'qa-provincie-1', 'qa-provincie-2', 'qa-features', 'qa-visueel', 'ui-shots', 'coop'];
  if (reden) { for (const s of STAPPEN.filter(wilDit)) items.push(skip('electron', 'electron:' + s, s, reden)); return { items, sigs: {} }; }

  const prevSigs = (staat.fases && staat.fases.electron && staat.fases.electron.sigs) || {};
  const sigs = {};
  const profielen = [];
  const env = (stap) => { const p = `gde-testall-${process.pid}-${stap}`; profielen.push(p); return { GDE_TEST_PROFILE: p, ELECTRON_EXE: exe, GDE_ELECTRON: exe, GDE_MAX_ELECTRON: '3' }; };
  const stapDir = (s) => { const d = path.join(RUN, s); fs.mkdirSync(d, { recursive: true }); return d; };
  const desktop = path.join(ROOT, 'desktop');
  const basis = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720'];

  const stap = async (naam, fn, { eigenSlots = false } = {}) => {
    if (!wilDit(naam)) return;
    let slot = null;
    try { slot = eigenSlots ? null : await neemSlot(); items.push(...(await fn())); } catch (e) { items.push(R.maakItem('electron', 'electron:' + naam, naam, 'FAIL', 0, 'stap crashte: ' + (e && e.stack || e))); } finally { geefSlot(slot); }
    for (const it of items.filter((i) => i.fase === 'electron' && i.id.startsWith('electron:' + naam))) log(`${it.status.padEnd(7)} ${it.id} ${it.secs}s`);
  };

  await stap('smoke', async () => {
    const d = stapDir('smoke'), png = path.join(d, 'smoke.png'), ms = 5 * 60e3;
    const r = await runCmd(exe, [...basis, '--smoke-test=' + png], { ms, env: env('smoke'), cwd: desktop });
    fs.writeFileSync(path.join(d, 'run.log'), r.out);
    const fr = R.beoordeelFrames(R.parseFrameStats(r.out), (prev.get('frametijd:smoke') || {}).extra && prev.get('frametijd:smoke').extra.stats);
    const st = r.timedOut ? 'TIMEOUT' : (r.code === 0 && fs.existsSync(png) ? 'PASS' : 'FAIL');
    return [
      R.maakItem('electron', 'electron:smoke', 'smoke-run (wegwerpprofiel)', st, r.secs, st === 'PASS' ? '' : `afgesloten met code ${r.code}; ${R.eersteFout(r.out)}`),
      consoleItem('smoke', r.out, r.secs),
      R.maakItem('electron', 'frametijd:smoke', 'frametijd smoke', fr.status, 0, fr.detail, { warn: fr.warn, stats: R.parseFrameStats(r.out) }),
      ...beeldItems('smoke', d, prevSigs, sigs),
    ];
  });

  // poort zwarte wereld / consolefouten per frame: het spel draait 120 frames; een lege of niet getekende wereld,
  // NaN-meshes of een fout in meerdere frames laat de fase falen (scripts/perf/wereldpoort.js)
  await stap('wereldpoort', async () => {
    const d = stapDir('wereldpoort'), ms = 8 * 60e3;
    const r = await runCmd(exe, [...basis, '--smoke-test=' + path.join(d, 'wereldpoort.png'), '--perf-script=' + path.join(ROOT, 'scripts', 'perf', 'wereldpoort.js')], { ms, env: env('wereldpoort'), cwd: desktop });
    fs.writeFileSync(path.join(d, 'run.log'), r.out);
    const b = r.timedOut ? { status: 'TIMEOUT', detail: 'tijdslimiet overschreden' } : R.beoordeelWereldpoort(R.parseWereldpoort(r.out));
    return [R.maakItem('electron', 'electron:wereldpoort', 'poort zwarte wereld en fouten per frame', b.status, r.secs, b.detail), consoleItem('wereldpoort', r.out, 0), ...beeldItems('wereldpoort', d, prevSigs, sigs)];
  });

  await stap('verhaaltest', async () => {
    const d = stapDir('verhaaltest'), ms = 20 * 60e3;
    const r = await runCmd(exe, [...basis, '--story-test=' + d], { ms, env: env('verhaal'), cwd: desktop });
    fs.writeFileSync(path.join(d, 'run.log'), r.out);
    const p = R.parseStoryLog(r.out);
    const ok = !r.timedOut && p.gehaald && p.result === 'PASS' && !p.nanWaarschuwingen && !p.timeout;
    const detail = r.timedOut ? 'tijdslimiet overschreden' : p.timeout ? 'de verhaaltest meldde zelf een timeout' : !p.gehaald ? 'geen uitslag gevonden in de uitvoer: ' + R.eersteFout(r.out) : `${p.result}: ${p.steps} stappen, ${p.failedChecks} mislukte checks, ${p.nanWaarschuwingen} NaN-waarschuwingen\n` + p.fails.slice(0, 8).join('\n');
    return [
      R.maakItem('electron', 'electron:verhaaltest', 'Electron-verhaaltest (--story-test)', r.timedOut ? 'TIMEOUT' : ok ? 'PASS' : 'FAIL', r.secs, ok ? `${p.steps} stappen` : detail),
      R.maakItem('electron', 'nan-geometrie:verhaaltest', 'NaN-waarschuwingen in geometrie', p.nanWaarschuwingen ? 'FAIL' : 'PASS', 0, p.nanWaarschuwingen ? `${p.nanWaarschuwingen} computeBoundingSphere-waarschuwingen` : ''),
      consoleItem('verhaaltest', r.out, r.secs),
      ...beeldItems('verhaaltest', d, prevSigs, sigs),
    ];
  });

  await stap('geocheck', async () => {
    const d = stapDir('geocheck'), ms = 10 * 60e3;
    const r = await runCmd(exe, [...basis, '--smoke-test=' + path.join(d, 'geocheck.png'), '--perf-script=' + path.join(ROOT, 'scripts', 'perf', 'geocheck.js')], { ms, env: env('geocheck'), cwd: desktop });
    fs.writeFileSync(path.join(d, 'run.log'), r.out);
    const ok = !r.timedOut && /"ok":\s*true/.test(r.out);
    return [R.maakItem('electron', 'electron:geocheck', 'geometrie-worker byte voor byte (geocheck)', r.timedOut ? 'TIMEOUT' : ok ? 'PASS' : 'FAIL', r.secs, ok ? '' : R.eersteFout(r.out)), consoleItem('geocheck', r.out, 0)];
  });

  const botSweep = (naam, mode) => stap(naam, async () => {
    const d = stapDir(naam), ms = 45 * 60e3;
    const r = await runCmd(process.execPath, ['scripts/bot/run.mjs', `--mode=${mode}`, `--out=${d}`, '--force'], { ms, env: env(naam) });
    fs.writeFileSync(path.join(d, 'sweep.log'), r.out);
    let analyse = '';
    if (fs.existsSync(path.join(d, 'events.jsonl'))) {
      const a = await runCmd(process.execPath, ['scripts/bot/analyse.mjs', d, '--base=' + path.join(BASE, 'bot-' + mode)], { ms: 5 * 60e3 });
      analyse = tail(a.out, 8);
    }
    const st = r.timedOut ? 'TIMEOUT' : r.code === 0 ? 'PASS' : 'FAIL';
    return [R.maakItem('electron', 'electron:' + naam, `spelbot-sweep ${mode}`, st, r.secs, st === 'PASS' ? analyse : `code ${r.code}: ${R.eersteFout(r.out)}\n${analyse}`), consoleItem(naam, r.out, 0), ...beeldItems(naam, d, prevSigs, sigs)];
  });
  await botSweep('bot-missies', 'missions');
  await botSweep('bot-minigames', 'minigames');

  const qa = (naam, script, extra = []) => stap(naam, async () => {
    const d = stapDir(naam), ms = 45 * 60e3;
    let r = await runCmd(process.execPath, [script, ...extra, `--out=${d}`], { ms, env: env(naam) });
    let poging = '';
    // het spel startte niet op (te druk, trage wereldlading): één nieuwe poging
    if (r.code && !r.timedOut && /"ready":\s*false|plekken: 0\/|checks: 0,/.test(r.out + (fs.existsSync(path.join(d, 'run.log')) ? fs.readFileSync(path.join(d, 'run.log'), 'utf8') : ''))) {
      log(`${naam}: spel startte niet op, nieuwe poging`);
      r = await runCmd(process.execPath, [script, ...extra, `--out=${d}`, '--settle=20000'], { ms, env: env(naam) });
      poging = ' (na tweede poging)';
    }
    fs.writeFileSync(path.join(d, 'sweep.log'), r.out);
    const st = r.timedOut ? 'TIMEOUT' : r.code === 0 ? 'PASS' : 'FAIL';
    return [R.maakItem('electron', 'electron:' + naam, naam, st, r.secs, st === 'PASS' ? poging.trim() : `code ${r.code}${poging}: ${split(tail(r.out, 3)).join(' | ')}`), consoleItem(naam, r.out, 0), ...beeldItems(naam, d, prevSigs, sigs)];
  });
  await qa('qa-provincie-1', 'scripts/qa/province_shots.mjs', ['--ronde=1']);
  await qa('qa-provincie-2', 'scripts/qa/province_shots.mjs', ['--ronde=2']);
  await qa('qa-features', 'scripts/qa/feature_smoke.mjs');
  await qa('qa-visueel', 'scripts/qa/visual_issues.mjs');
  await qa('ui-shots', 'scripts/ui_shots.mjs');
  // coöp-testbank (y2): host en gast als twee Electrons op de loopback; neemt zelf de sloten
  if (fs.existsSync(path.join(ROOT, 'scripts', 'coop', 'testbank.mjs'))) {
    await stap('coop', async () => {
      const d = stapDir('coop'), ms = 20 * 60e3;
      const r = await runCmd(process.execPath, ['scripts/coop/testbank.mjs', '--stage=' + path.join(desktop, 'build', 'game'), '--duration=20', '--out=' + d], { ms, env: env('coop') });
      fs.writeFileSync(path.join(d, 'sweep.log'), r.out);
      const st = r.timedOut ? 'TIMEOUT' : r.code === 0 ? 'PASS' : 'FAIL';
      return [R.maakItem('electron', 'electron:coop', 'coöp-testbank (host en gast)', st, r.secs, st === 'PASS' ? '' : `code ${r.code}: ${split(tail(r.out, 4)).join(' | ')}`), consoleItem('coop', r.out, 0)];
    }, { eigenSlots: true });
  }

  for (const p of profielen) fs.rmSync(path.join(os.tmpdir(), p), { recursive: true, force: true });
  return { items, sigs };
}

// ---------------------------------------------------------------- issues

function ghPad() {
  if (process.env.GH) return process.env.GH;
  const w = 'C:\\Program Files\\GitHub CLI\\gh.exe';
  return process.platform === 'win32' && fs.existsSync(w) ? w : 'gh';
}

function issuesAfhandelen(report, staat) {
  const concepten = R.issueConcepten(report, staat.issues || {});
  const maken = flag('create');
  const o = [`# Issue-concepten (${maken ? 'aanmaken' : 'droge run, niets aangemaakt'})`, ''];
  if (!concepten.length) o.push('Geen nieuwe fouten zonder issue.');
  const gh = ghPad();
  let labels = null;
  if (maken && concepten.length) {
    const r = spawnSync(gh, ['label', 'list', '--json', 'name', '--limit', '200'], { encoding: 'utf8' });
    try { labels = new Set(JSON.parse(r.stdout).map((l) => l.name)); } catch { labels = null; }
  }
  staat.issues = staat.issues || {};
  for (const c of concepten) {
    o.push(`## ${c.titel}`, '', `Afdruk \`${c.fp}\`. Labels: ${c.labels.join(', ')}`, '', c.body, '');
    if (!maken) continue;
    const zoek = spawnSync(gh, ['issue', 'list', '--state', 'all', '--search', `testall-afdruk: ${c.fp}`, '--json', 'number', '--limit', '1'], { encoding: 'utf8' });
    let bestaand = null;
    try { bestaand = (JSON.parse(zoek.stdout)[0] || {}).number || null; } catch { /* gh niet beschikbaar */ }
    if (bestaand) { staat.issues[c.fp] = bestaand; o.push(`> bestaat al als #${bestaand}, niet opnieuw aangemaakt`, ''); continue; }
    const lab = c.labels.filter((l) => !labels || labels.has(l));
    const r = spawnSync(gh, ['issue', 'create', '--title', c.titel, '--body', c.body, ...lab.flatMap((l) => ['--label', l])], { encoding: 'utf8' });
    const m = /\/issues\/(\d+)/.exec(r.stdout || '');
    if (r.status === 0 && m) { staat.issues[c.fp] = Number(m[1]); o.push(`> aangemaakt: #${m[1]}`, ''); } else o.push(`> aanmaken mislukt: ${tail(r.stderr || r.stdout, 3)}`, '');
  }
  fs.writeFileSync(path.join(RUN, 'issues-concept.md'), o.join('\n'));
  return concepten.length;
}

// ---------------------------------------------------------------- main

async function main() {
  // --issues-van=<runmap>: issue-concepten (of met --create: issues) uit een eerder rapport.json
  if (opt('issues-van')) {
    fs.mkdirSync(RUN, { recursive: true });
    const oud = JSON.parse(fs.readFileSync(path.join(path.resolve(opt('issues-van')), 'rapport.json'), 'utf8'));
    let st = {};
    try { st = JSON.parse(fs.readFileSync(path.join(BASE, 'state.json'), 'utf8')); } catch { /* nog geen staat */ }
    const n = issuesAfhandelen(oud, st);
    fs.writeFileSync(path.join(BASE, 'state.json'), JSON.stringify(st));
    log(`Issue-concepten: ${n}; zie ${path.join(RUN, 'issues-concept.md')}`);
    return 0;
  }
  if (flag('list')) { log('licht: module-check, import_check, voice_coverage, text_audit, dode-code, alle scripts/*_test.mjs\nzwaar: ' + ZWAAR.map((z) => z[0]).join(', ') + '\nelectron: smoke, verhaaltest, geocheck, bot-missies, bot-minigames, qa-provincie-1, qa-provincie-2, qa-features, qa-visueel, ui-shots'); return 0; }
  const fasen = FASE === 'alles' ? R.FASEN : FASE.split(',').filter((f) => R.FASEN.includes(f));
  if (!fasen.length) { console.error('Onbekende fase: ' + FASE + ' (kies licht, zwaar, electron of alles)'); return 2; }
  fs.mkdirSync(RUN, { recursive: true });
  if (flag('stage')) log('stage: ' + await stageWereld());
  const stateFile = path.join(BASE, 'state.json');
  let staat = {};
  try { staat = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { /* eerste run */ }
  const t0 = Date.now();
  const report = { stamp: STAMP, gestart: new Date().toISOString(), fases: {} };
  for (const f of fasen) {
    const prevFase = staat.fases && staat.fases[f];
    const prev = new Map(((prevFase && prevFase.items) || []).map((i) => [i.id, i]));
    log(`\n== fase ${f}${prevFase ? ` (vorige run ${prevFase.stamp})` : ' (geen vorige run)'}`);
    const f0 = Date.now();
    let items, extra = {};
    try {
      if (f === 'licht') items = await faseLicht(prev);
      else if (f === 'zwaar') items = await faseZwaar();
      else { const e = await faseElectron(prev, staat); items = e.items; extra = { sigs: e.sigs }; }
    } catch (e) { items = [R.maakItem(f, 'fase:' + f, 'fase ' + f, 'FAIL', 0, 'de fase crashte: ' + (e && e.stack || e))]; }
    // een deel-run (--only) vergelijkt alleen wat nu gedraaid is
    const diff = R.diffRuns(ONLY ? [...prev.values()].filter((i) => items.some((n) => n.id === i.id)) : [...prev.values()], items);
    const secs = (Date.now() - f0) / 1000;
    report.fases[f] = { gedraaid: true, items, secs, diff, vorige: prevFase ? prevFase.stamp : null };
    const deel = { ...report, toon: [f] };
    fs.writeFileSync(path.join(RUN, `fase-${f}.json`), JSON.stringify(deel, null, 1));
    fs.writeFileSync(path.join(RUN, `fase-${f}.md`), R.renderMarkdown(deel));
    // met --only blijven de oude items van andere ids staan, zodat de trend niet leegloopt
    const bewaar = ONLY ? [...items, ...[...prev.values()].filter((i) => !items.some((n) => n.id === i.id))] : items;
    staat = R.werkStaatBij(staat, f, STAMP, bewaar, extra.sigs ? { sigs: { ...((prevFase && prevFase.sigs) || {}), ...extra.sigs } } : (prevFase && prevFase.sigs ? { sigs: prevFase.sigs } : {}));
  }
  report.duurSecs = Math.round((Date.now() - t0) / 1000);
  let nieuweIssues = 0;
  if (flag('issues')) nieuweIssues = issuesAfhandelen(report, staat);
  fs.mkdirSync(BASE, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(staat));
  const md = R.renderMarkdown(report);
  fs.writeFileSync(path.join(RUN, 'rapport.json'), JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(RUN, 'rapport.md'), md);
  fs.writeFileSync(path.join(BASE, 'laatste-rapport.md'), md);
  log('\n' + R.samenvatting(report).map((r) => '* ' + r).join('\n'));
  if (flag('issues')) log(`* Issue-concepten: ${nieuweIssues}${flag('create') ? '' : ' (droge run, --create maakt ze aan)'}.`);
  log(`\nRapport: ${path.join(RUN, 'rapport.md')}`);
  const alle = fasen.flatMap((f) => report.fases[f].items);
  return alle.some((i) => R.isFout(i.status)) ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().then((c) => process.exit(c), (e) => { console.error('test_all crashte:', e && e.stack || e); process.exit(2); });
}
