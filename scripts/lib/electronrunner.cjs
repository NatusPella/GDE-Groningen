// Kwaliteitsmachine (docs/KWALITEITSMACHINE.md): EEN runnerbibliotheek voor alle beeldscripts die Electron starten.
// CommonJS, zodat zowel Node-scripts (.mjs: `import runner from '../lib/electronrunner.cjs'`) als scripts die zelf in het
// Electron-hoofdproces draaien (.cjs, zoals scripts/qa/personen_beeld.cjs) hem kunnen gebruiken.
//
// Wat hij garandeert:
//   - een wegwerpprofiel en een TEMP-map alleen in de opgegeven uitvoermap (nooit de systeem-temp: daar faalt Electron hier soms);
//   - ELECTRON_RUN_AS_NODE weg uit de omgeving (anders start electron.exe als kale Node);
//   - nooit een dialoogvenster: guardMainProcess() vangt uncaughtException/unhandledRejection (loggen en stoppen) en zet
//     dialog.showErrorBox om naar het logboek;
//   - een logboek met een hartslag elke minuut (zo is een vastgelopen run te herkennen aan een stil logboek);
//   - een Electron-slot uit ~/gde-locks (of GDE_LOCKS): mkdir van electron-1..3. Alleen EEXIST betekent bezet; elke andere fout
//     (EPERM, EACCES, ENOENT van een verdwenen schijf) stopt met een duidelijke fout in plaats van eindeloos te wachten;
//   - stale-lock-detectie: een slot met een eigenaar-PID die niet meer leeft, of zonder teken van leven langer dan
//     GDE_LOCK_STALE_HOURS (standaard 6 uur), wordt opgeruimd;
//   - een 'stille machine'-poort voor fps-metingen: wacht tot de CPU-belasting onder en het vrije geheugen boven een drempel zit.
//
// CLI (status en onderhoud, start geen Electron):
//   node scripts/lib/electronrunner.cjs --status            sloten, eigenaars, wat stale is, en een machinemeting
//   node scripts/lib/electronrunner.cjs --opruimen          stale sloten opruimen (alleen wat de regels stale noemen)
//   node scripts/lib/electronrunner.cjs --wacht-stil [--max-cpu=0.25] [--min-vrij-gb=4] [--minuten=30]
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const SLOT_NAMES = ['electron-1', 'electron-2', 'electron-3'];
const OWNER_FILE = 'eigenaar.json';
const HEARTBEAT_MS = 60000;

class RunnerFout extends Error {
  constructor(code, message, cause) { super(message); this.name = 'RunnerFout'; this.code = code; if (cause) this.cause = cause; }
}

const locksDir = () => process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const staleHours = () => { const v = Number(process.env.GDE_LOCK_STALE_HOURS); return Number.isFinite(v) && v > 0 ? v : 6; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = (t = Date.now()) => new Date(t).toISOString().replace('T', ' ').slice(0, 19);

// ---------- paden ----------

const norm = (p) => { const r = path.resolve(p); return process.platform === 'win32' ? r.toLowerCase() : r; };
/** true als `kind` gelijk is aan `ouder` of eronder ligt. */
function isInside(kind, ouder) {
  const a = norm(kind), b = norm(ouder);
  if (a === b) return true;
  const rel = path.relative(b, a);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Gooit als `dir` in de systeem-temp ligt (Electron kan daar op deze machine niet altijd schrijven). */
function assertNotSystemTemp(dir, tmp = os.tmpdir()) {
  if (isInside(dir, tmp)) throw new RunnerFout('TEMP', `uitvoermap ${dir} ligt in de systeem-temp (${tmp}); kies een eigen map (bijvoorbeeld <worktree>/.scr/<naam> of ~/gde-qa/<naam>)`);
}

/** Maakt <out>, <out>/profiel-<pid> en <out>/_tmp. Geeft { out, profile, tmp }. */
function prepareRunDir(out, { pid = process.pid, tmp = os.tmpdir() } = {}) {
  if (!out) throw new RunnerFout('UIT', 'geen uitvoermap opgegeven (--out=<map>)');
  const abs = path.resolve(out);
  assertNotSystemTemp(abs, tmp);
  const profile = path.join(abs, `profiel-${pid}`);
  const tmpDir = path.join(abs, '_tmp');
  try { for (const d of [abs, profile, tmpDir]) fs.mkdirSync(d, { recursive: true }); } catch (e) {
    throw new RunnerFout('UIT', `uitvoermap ${abs} niet te maken: ${e.code || e.message}`, e);
  }
  return { out: abs, profile, tmp: tmpDir };
}

/** De omgeving voor een Electron-kind: zonder ELECTRON_RUN_AS_NODE, met TEMP en profiel in de uitvoermap. */
function electronEnv({ base = process.env, profile, tmp, gameDir, extra = {} } = {}) {
  const env = { ...base };
  delete env.ELECTRON_RUN_AS_NODE;
  if (profile) env.GDE_TEST_PROFILE = profile;
  if (tmp) { env.TEMP = tmp; env.TMP = tmp; env.TMPDIR = tmp; }
  if (gameDir) env.GDE_GAME_DIR = gameDir;
  return Object.assign(env, extra);
}

/** Zoekt electron.exe: ELECTRON_EXE, de worktree, of de hoofdmap (een worktree onder .claude/worktrees heeft vaak geen node_modules). */
function findElectron(root) {
  const exe = process.platform === 'win32' ? 'electron.exe' : 'electron';
  const kandidaten = [
    process.env.ELECTRON_EXE,
    root && path.join(root, 'desktop', 'node_modules', 'electron', 'dist', exe),
    root && path.join(root, '..', '..', '..', 'desktop', 'node_modules', 'electron', 'dist', exe),
  ].filter(Boolean);
  for (const k of kandidaten) if (fs.existsSync(k)) return path.resolve(k);
  throw new RunnerFout('ELECTRON', `electron niet gevonden (geprobeerd: ${kandidaten.join(', ')}); zet ELECTRON_EXE`);
}

// ---------- logboek en hartslag ----------

/** log(...) schrijft een regel met tijd naar <out>/<naam> en naar stdout. log.file is het pad. */
function makeLog(out, naam = 'run.log', { echo = true } = {}) {
  const file = path.join(out, naam);
  fs.mkdirSync(out, { recursive: true });
  const log = (...a) => {
    const t = `[${stamp()}] ${a.map((x) => (typeof x === 'string' ? x : x instanceof Error ? (x.stack || x.message) : JSON.stringify(x))).join(' ')}`;
    try { fs.appendFileSync(file, t + '\n'); } catch (e) { /* logboek onbereikbaar: alleen stdout */ }
    if (echo) { try { process.stdout.write(t + '\n'); } catch (e) { /* geen stdout (Electron op Windows) */ } }
  };
  log.file = file;
  return log;
}

/** Elke `everyMs` een regel 'hartslag' met status(); vernieuwt ook het slot. Geeft stop(). */
function startHeartbeat(log, { everyMs = HEARTBEAT_MS, status = () => '', slot = null } = {}) {
  const t0 = Date.now();
  const iv = setInterval(() => {
    let s = '';
    try { s = status() || ''; } catch (e) { s = 'status onbekend: ' + e.message; }
    if (slot && slot.beat) { try { slot.beat(); } catch (e) { s += ` (slot vernieuwen mislukt: ${e.code || e.message})`; } }
    log(`hartslag ${((Date.now() - t0) / 60000).toFixed(1)} min${s ? ': ' + s : ''}`);
  }, everyMs);
  if (iv.unref) iv.unref();
  return () => clearInterval(iv);
}

// ---------- Electron-sloten ----------

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

/** Leest één slotmap: { name, dir, held, mtimeMs, owner, ownerError }. */
function readSlot(dir, { fsImpl = fs } = {}) {
  const name = path.basename(dir);
  let st;
  try { st = fsImpl.statSync(dir); } catch (e) {
    if (e.code === 'ENOENT') return { name, dir, held: false };
    throw new RunnerFout('SLOT_LEZEN', `slot ${dir} niet te lezen: ${e.code || e.message}`, e);
  }
  const info = { name, dir, held: true, mtimeMs: st.mtimeMs, owner: null, ownerError: null };
  try { info.owner = JSON.parse(fsImpl.readFileSync(path.join(dir, OWNER_FILE), 'utf8')); } catch (e) { info.ownerError = e.code === 'ENOENT' ? 'ontbreekt' : 'onleesbaar'; }
  return info;
}

/**
 * Puur: is dit slot stale? info zoals readSlot. Regels:
 *   - een eigenaar op deze machine met een PID die niet meer leeft: stale;
 *   - het laatste teken van leven (hartslag, anders start, anders de mtime van de map) ouder dan staleHours: stale;
 *   - een slot zonder eigenaarbestand (oudere scripts maken alleen de map) valt alleen onder de leeftijdsregel.
 * Geeft { stale, reden }.
 */
function slotVerdict(info, { now = Date.now(), hours = staleHours(), host = os.hostname(), isAlive = pidAlive } = {}) {
  if (!info || !info.held) return { stale: false, reden: 'vrij' };
  const o = info.owner;
  if (o && Number.isInteger(o.pid) && (!o.host || o.host === host) && !isAlive(o.pid)) return { stale: true, reden: `eigenaar-PID ${o.pid} (${o.label || '?'}) leeft niet meer` };
  const sign = Math.max(Number(o && Date.parse(o.heartbeat || '')) || 0, Number(o && Date.parse(o.started || '')) || 0) || info.mtimeMs || 0;
  const ageH = (now - sign) / 3600000;
  if (ageH > hours) return { stale: true, reden: `${o ? 'laatste hartslag' : 'slot zonder eigenaar'} ${ageH.toFixed(1)} uur oud (grens ${hours} uur)` };
  return { stale: false, reden: o ? `in gebruik door PID ${o.pid} (${o.label || '?'})` : 'in gebruik (oud script zonder eigenaarbestand)' };
}

/** Alle sloten met hun oordeel. */
function inspectSlots({ dir = locksDir(), fsImpl = fs, ...opts } = {}) {
  return SLOT_NAMES.map((n) => { const info = readSlot(path.join(dir, n), { fsImpl }); return { ...info, verdict: slotVerdict(info, opts) }; });
}

/** Ruimt stale sloten op (na een tweede blik vlak voor het weghalen). Geeft de opgeruimde namen met reden. */
function cleanStale({ dir = locksDir(), fsImpl = fs, log = () => {}, ...opts } = {}) {
  const weg = [];
  for (const s of inspectSlots({ dir, fsImpl, ...opts })) {
    if (!s.held || !s.verdict.stale) continue;
    const nog = slotVerdict(readSlot(s.dir, { fsImpl }), opts);
    if (!nog.stale) continue;
    try { fsImpl.rmSync(s.dir, { recursive: true, force: true }); weg.push({ name: s.name, reden: nog.reden }); log(`stale slot ${s.name} opgeruimd: ${nog.reden}`); } catch (e) { log(`stale slot ${s.name} niet op te ruimen: ${e.code || e.message}`); }
  }
  return weg;
}

/**
 * Probeert één keer een slot te nemen. Geeft een handle, null als alles bezet is (of het aantal bezette sloten boven de grens zit),
 * en gooit een RunnerFout bij elke andere fout dan EEXIST.
 *   exclusive: alleen als geen enkel slot bezet is (voor fps-metingen); maxOthers: hooguit zoveel anderen tegelijk.
 */
function tryTakeSlot({ dir = locksDir(), label = 'beeld', exclusive = false, maxOthers = SLOT_NAMES.length - 1, fsImpl = fs, pid = process.pid, now = Date.now() } = {}) {
  try { fsImpl.mkdirSync(dir, { recursive: true }); } catch (e) { throw new RunnerFout('SLOT_MAP', `slotenmap ${dir} niet te maken: ${e.code || e.message}`, e); }
  const held = SLOT_NAMES.filter((n) => { try { fsImpl.statSync(path.join(dir, n)); return true; } catch (e) { return false; } });
  if (exclusive ? held.length > 0 : held.length > maxOthers) return null;
  for (const n of SLOT_NAMES) {
    const d = path.join(dir, n);
    try { fsImpl.mkdirSync(d); } catch (e) {
      if (e && e.code === 'EEXIST') continue; // bezet: het enige geval waarin wachten zin heeft
      throw new RunnerFout('SLOT', `slot ${n} nemen mislukt met ${(e && e.code) || e} (geen 'bezet'): controleer rechten op ${dir}`, e);
    }
    const owner = { pid, host: os.hostname(), label, started: new Date(now).toISOString(), heartbeat: new Date(now).toISOString() };
    try { fsImpl.writeFileSync(path.join(d, OWNER_FILE), JSON.stringify(owner)); } catch (e) {
      try { fsImpl.rmSync(d, { recursive: true, force: true }); } catch (e2) { /* al weg */ }
      throw new RunnerFout('SLOT', `eigenaarbestand in ${d} niet te schrijven: ${e.code || e.message}`, e);
    }
    return slotHandle(d, owner, fsImpl);
  }
  return null;
}

function slotHandle(d, owner, fsImpl = fs) {
  let vrij = false;
  const own = () => { try { const o = JSON.parse(fsImpl.readFileSync(path.join(d, OWNER_FILE), 'utf8')); return o.pid === owner.pid && o.started === owner.started; } catch (e) { return false; } };
  return {
    dir: d, name: path.basename(d), owner,
    beat() { if (vrij || !own()) return false; owner.heartbeat = new Date().toISOString(); fsImpl.writeFileSync(path.join(d, OWNER_FILE), JSON.stringify(owner)); return true; },
    // alleen ons eigen slot weghalen: is het intussen als stale opgeruimd en door een ander genomen, dan blijft het staan
    release() { if (vrij) return false; vrij = true; if (!own()) return false; try { fsImpl.rmSync(d, { recursive: true, force: true }); return true; } catch (e) { return false; } },
  };
}

/** Wacht op een slot (ruimt elke ronde stale sloten op). Gooit RunnerFout('SLOT_TIMEOUT') na waitMin minuten. */
async function takeSlot({ dir = locksDir(), label = 'beeld', exclusive = false, maxOthers, waitMin = 120, pollMs = Number(process.env.GDE_LOCK_POLL_MS) || 15000, log = () => {}, fsImpl = fs, ...rest } = {}) {
  const t0 = Date.now();
  let laatsteMelding = 0;
  for (;;) {
    cleanStale({ dir, fsImpl, log, ...rest });
    const h = tryTakeSlot({ dir, label, exclusive, maxOthers, fsImpl });
    if (h) { log(`slot ${h.name} genomen (${label}${exclusive ? ', exclusief' : ''}) na ${((Date.now() - t0) / 1000).toFixed(0)} s`); return h; }
    if (Date.now() - t0 > waitMin * 60000) throw new RunnerFout('SLOT_TIMEOUT', `geen Electron-slot gekregen in ${waitMin} min (${dir})`);
    if (Date.now() - laatsteMelding >= 60000) {
      laatsteMelding = Date.now();
      const bezet = inspectSlots({ dir, fsImpl, ...rest }).filter((s) => s.held).map((s) => `${s.name}: ${s.verdict.reden}`);
      log(`wacht op slot${exclusive ? ' (exclusief: alle sloten moeten vrij zijn)' : ''}; bezet: ${bezet.join('; ') || 'geen'}`);
    }
    await sleep(pollMs);
  }
}

// ---------- stille machine ----------

function cpuTimes() { return os.cpus().map((c) => { const t = c.times; return { idle: t.idle, total: t.user + t.nice + t.sys + t.idle + t.irq }; }); }
/** Meet de CPU-belasting (0..1) over `ms` en het vrije geheugen. */
async function sampleMachine(ms = 1500) {
  const a = cpuTimes(); await sleep(ms); const b = cpuTimes();
  let idle = 0, total = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { idle += b[i].idle - a[i].idle; total += b[i].total - a[i].total; }
  return { cpu: total > 0 ? +(1 - idle / total).toFixed(3) : 0, freeGB: +(os.freemem() / 2 ** 30).toFixed(2), totalGB: +(os.totalmem() / 2 ** 30).toFixed(1) };
}

/** Puur: { ok, redenen } voor één meting tegen de drempels. */
function quietVerdict(s, { maxCpu = 0.25, minFreeGB = 4 } = {}) {
  const redenen = [];
  if (!s || !Number.isFinite(s.cpu) || !Number.isFinite(s.freeGB)) return { ok: false, redenen: ['geen meting'] };
  if (s.cpu > maxCpu) redenen.push(`CPU ${(s.cpu * 100).toFixed(0)}% > ${(maxCpu * 100).toFixed(0)}%`);
  if (s.freeGB < minFreeGB) redenen.push(`vrij geheugen ${s.freeGB} GB < ${minFreeGB} GB`);
  return { ok: redenen.length === 0, redenen };
}

/** Wacht tot `calm` metingen achter elkaar stil zijn. Geeft { ok, last, waitedS } (ok false na waitMin). */
async function waitQuiet({ maxCpu = 0.25, minFreeGB = 4, calm = 3, waitMin = 30, sampleMs = 1500, pauseMs = 5000, log = () => {}, sample = sampleMachine } = {}) {
  const t0 = Date.now();
  let rustig = 0, last = null, laatsteMelding = 0;
  while (Date.now() - t0 <= waitMin * 60000) {
    last = await sample(sampleMs);
    const v = quietVerdict(last, { maxCpu, minFreeGB });
    if (v.ok) { if (++rustig >= calm) { log(`machine stil: CPU ${(last.cpu * 100).toFixed(0)}%, vrij ${last.freeGB} GB`); return { ok: true, last, waitedS: Math.round((Date.now() - t0) / 1000) }; } }
    else {
      rustig = 0;
      if (Date.now() - laatsteMelding >= 60000) { laatsteMelding = Date.now(); log(`wacht op een stille machine: ${v.redenen.join(', ')}`); }
    }
    await sleep(pauseMs);
  }
  log(`machine niet stil geworden in ${waitMin} min (laatste: ${JSON.stringify(last)})`);
  return { ok: false, last, waitedS: Math.round((Date.now() - t0) / 1000) };
}

// ---------- in het Electron-hoofdproces ----------

/** Voor scripts die zelf het Electron-hoofdproces zijn: fouten loggen en stoppen, nooit een dialoogvenster. */
function guardMainProcess({ app = null, dialog = null, log = (t) => { try { process.stderr.write(t + '\n'); } catch (e) { /* */ } }, exit = null } = {}) {
  const stop = exit || ((code) => { try { if (app) app.exit(code); else process.exit(code); } catch (e) { process.exit(code); } });
  const fatal = (e) => { try { log('fout (gestopt): ' + ((e && e.stack) || e)); } catch (e2) { /* */ } stop(1); };
  process.on('uncaughtException', fatal);
  process.on('unhandledRejection', fatal);
  if (dialog) {
    dialog.showErrorBox = (title, body) => log(`foutvenster onderdrukt: ${title} ${body || ''}`);
    for (const k of ['showMessageBox', 'showMessageBoxSync']) if (typeof dialog[k] === 'function') dialog[k] = (...a) => { log(`dialoog onderdrukt (${k}): ${JSON.stringify(a[a.length - 1] && a[a.length - 1].message || '')}`); return k.endsWith('Sync') ? 0 : Promise.resolve({ response: 0 }); };
  }
  return { fatal };
}

// ---------- Electron starten ----------

function killTree(child) {
  if (!child || !child.pid) return;
  // alleen ons eigen kind en zijn kinderen (nooit op naam: zie AGENTS.md en de eigenaar-Chrome)
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { child.kill('SIGKILL'); } catch (e) { /* al weg */ } }
}

/**
 * Start een Electron (of elk ander programma) met slot, hartslag, tijdslimiet en logboek, en ruimt altijd op.
 *   electron, args, cwd, env: zoals spawn; out: uitvoermap (electron.log komt daar); log: van makeLog (anders een nieuwe in out)
 *   slot: false of { label, exclusive, maxOthers, waitMin }; quiet: false of { maxCpu, minFreeGB, waitMin, required }
 *   timeoutMin: harde grens; onLine(regel): elke regel van stdout/stderr; status(): extra tekst in de hartslag
 *   below: true = lagere prioriteit (BelowNormal) zodat de machine bruikbaar blijft
 * Geeft { code, signal, timedOut, minutes, slot, perfScript, quiet }. Gooit RunnerFout bij geen slot, geen start of een onrustige machine
 * (alleen met quiet.required); het slot is dan al vrijgegeven.
 */
async function runElectron({ electron, args = [], cwd, env = process.env, out, log = null, slot = { label: 'beeld' }, quiet = false, timeoutMin = 60, onLine = null, status = null, below = true, heartbeatMs = HEARTBEAT_MS } = {}) {
  if (!out) throw new RunnerFout('UIT', 'runElectron zonder uitvoermap');
  fs.mkdirSync(out, { recursive: true });
  log = log || makeLog(out);
  const runEnv = { ...env };
  delete runEnv.ELECTRON_RUN_AS_NODE;
  let handle = null, child = null, stopBeat = null, timer = null;
  const vrij = () => { if (handle) { handle.release(); log(`slot ${handle.name} vrijgegeven`); handle = null; } };
  const onSignal = (sig) => { log(`${sig}: kind stoppen en slot vrijgeven`); killTree(child); vrij(); process.exit(130); };
  const onExit = () => { killTree(child); if (handle) handle.release(); };
  process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal); process.on('exit', onExit);
  const t0 = Date.now();
  try {
    if (slot) handle = await takeSlot({ log, ...slot });
    let q = null;
    if (quiet) {
      q = await waitQuiet({ log, ...quiet });
      if (!q.ok && quiet.required) throw new RunnerFout('ONRUSTIG', `machine niet stil genoeg voor een meting: ${quietVerdict(q.last, quiet).redenen.join(', ')}`);
    }
    const elog = fs.createWriteStream(path.join(out, 'electron.log'), { flags: 'a' });
    let perfScript = null, laatste = '', regels = 0;
    const lees = (buf) => {
      elog.write(buf);
      for (const r of String(buf).split(/\r?\n/)) {
        if (!r) continue;
        regels++; laatste = r.slice(0, 160);
        if (r.startsWith('[perf-script] ')) perfScript = r.slice(14);
        if (onLine) { try { onLine(r); } catch (e) { log('onLine-fout: ' + e.message); } }
      }
    };
    log(`start ${path.basename(electron)} ${args.slice(0, 3).join(' ')}${args.length > 3 ? ' ...' : ''} (limiet ${timeoutMin} min)`);
    const res = await new Promise((resolve, reject) => {
      try { child = spawn(electron, args, { cwd, env: runEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false }); } catch (e) { reject(new RunnerFout('START', `starten mislukt: ${e.code || e.message}`, e)); return; }
      child.on('error', (e) => reject(new RunnerFout('START', `starten van ${electron} mislukt: ${e.code || e.message}`, e)));
      if (below && child.pid) { try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* geen recht */ } }
      child.stdout.on('data', lees); child.stderr.on('data', lees);
      let timedOut = false;
      timer = setTimeout(() => { timedOut = true; log(`tijdslimiet ${timeoutMin} min: kind ${child.pid} stoppen`); killTree(child); }, timeoutMin * 60000);
      stopBeat = startHeartbeat(log, { everyMs: heartbeatMs, slot: handle, status: () => `pid ${child.pid}, ${regels} regels, laatste: ${laatste}${status ? ' | ' + status() : ''}` });
      child.on('close', (code, signal) => resolve({ code, signal, timedOut }));
    });
    elog.end();
    const minutes = +((Date.now() - t0) / 60000).toFixed(2);
    log(`klaar: exit ${res.code}${res.signal ? ' ' + res.signal : ''}${res.timedOut ? ' (tijdslimiet)' : ''} na ${minutes} min`);
    return { ...res, minutes, slot: handle ? handle.name : null, perfScript, quiet: q };
  } finally {
    clearTimeout(timer);
    if (stopBeat) stopBeat();
    vrij();
    process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal); process.off('exit', onExit);
  }
}

/** Ruimt een profielmap op (stil als hij al weg is). */
function removeProfile(dir) { if (dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* in gebruik of al weg */ } } }

module.exports = {
  RunnerFout, SLOT_NAMES, OWNER_FILE, HEARTBEAT_MS, locksDir, staleHours,
  isInside, assertNotSystemTemp, prepareRunDir, electronEnv, findElectron, removeProfile,
  makeLog, startHeartbeat,
  pidAlive, readSlot, slotVerdict, inspectSlots, cleanStale, tryTakeSlot, takeSlot,
  sampleMachine, quietVerdict, waitQuiet,
  guardMainProcess, killTree, runElectron,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const log = (...a) => console.log(...a);
  (async () => {
    if (argv.includes('--opruimen')) { const weg = cleanStale({ log }); console.log(weg.length ? `${weg.length} opgeruimd` : 'niets stale'); return 0; }
    if (argv.includes('--wacht-stil')) {
      const r = await waitQuiet({ maxCpu: Number(opt('max-cpu', 0.25)), minFreeGB: Number(opt('min-vrij-gb', 4)), waitMin: Number(opt('minuten', 30)), log });
      return r.ok ? 0 : 4;
    }
    console.log(`slotenmap: ${locksDir()} (stale na ${staleHours()} uur zonder teken van leven)`);
    for (const s of inspectSlots()) console.log(`  ${s.name}: ${s.held ? (s.verdict.stale ? 'STALE, ' : 'bezet, ') + s.verdict.reden : 'vrij'}`);
    const m = await sampleMachine();
    const v = quietVerdict(m);
    console.log(`machine: CPU ${(m.cpu * 100).toFixed(0)}%, vrij ${m.freeGB} van ${m.totalGB} GB: ${v.ok ? 'stil' : 'niet stil (' + v.redenen.join(', ') + ')'}`);
    return 0;
  })().then((c) => process.exit(c), (e) => { console.error(e.message); process.exit(1); });
}
