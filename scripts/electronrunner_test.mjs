// Test van de runnerbibliotheek van de kwaliteitsmachine (scripts/lib/electronrunner.cjs): slotlogica (EEXIST tegen andere
// fouten, stale-detectie, exclusief), de stille-machinepoort, paden en de foutpaden van runElectron (met node als kind, geen Electron).
//   node scripts/electronrunner_test.mjs
// Schrijft alleen in een eigen wegwerpmap onder .scr/ van de worktree en ruimt die op.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from './lib/electronrunner.cjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const ok = (c, naam, extra) => { if (!c) { fails++; console.log('FAIL', naam, extra !== undefined ? JSON.stringify(extra) : ''); } };
const werk = path.join(ROOT, '.scr', `runner-test-${process.pid}`);
fs.mkdirSync(werk, { recursive: true });
const locks = path.join(werk, 'locks');
const stil = () => {};

try {
  // ---------- slotVerdict (puur) ----------
  const nu = Date.parse('2026-11-23T12:00:00Z');
  const levend = () => true, dood = () => false;
  ok(!R.slotVerdict({ held: false }).stale, 'een vrij slot is niet stale');
  ok(R.slotVerdict({ held: true, mtimeMs: nu, owner: { pid: 999999, host: os.hostname(), started: new Date(nu).toISOString() } }, { now: nu, isAlive: dood }).stale, 'een eigenaar-PID die niet leeft maakt het slot stale');
  ok(!R.slotVerdict({ held: true, mtimeMs: nu, owner: { pid: 5, host: os.hostname(), started: new Date(nu).toISOString() } }, { now: nu, isAlive: levend }).stale, 'een levende eigenaar met verse hartslag is niet stale');
  ok(!R.slotVerdict({ held: true, mtimeMs: nu, owner: { pid: 5, host: 'andere-pc', started: new Date(nu).toISOString() } }, { now: nu, isAlive: dood }).stale, 'een PID van een andere machine wordt niet gecontroleerd');
  const oudeHartslag = { held: true, mtimeMs: nu - 30 * 3600e3, owner: { pid: 5, host: os.hostname(), started: new Date(nu - 30 * 3600e3).toISOString(), heartbeat: new Date(nu - 7 * 3600e3).toISOString() } };
  ok(R.slotVerdict(oudeHartslag, { now: nu, hours: 6, isAlive: levend }).stale, 'hartslag ouder dan de grens is stale, ook als de PID (hergebruikt) leeft');
  const lang = { ...oudeHartslag, owner: { ...oudeHartslag.owner, heartbeat: new Date(nu - 60e3).toISOString() } };
  ok(!R.slotVerdict(lang, { now: nu, hours: 6, isAlive: levend }).stale, 'een lange run met verse hartslag is niet stale, ook al begon hij 30 uur geleden');
  ok(R.slotVerdict({ held: true, mtimeMs: nu - 7 * 3600e3, owner: null }, { now: nu, hours: 6 }).stale, 'een oud slot zonder eigenaarbestand is stale na de grens');
  ok(!R.slotVerdict({ held: true, mtimeMs: nu - 3600e3, owner: null }, { now: nu, hours: 6 }).stale, 'een jong slot zonder eigenaarbestand (oud script) blijft staan');

  // ---------- tryTakeSlot / cleanStale (echte map) ----------
  const a = R.tryTakeSlot({ dir: locks, label: 'test-a' });
  ok(a && a.name === 'electron-1', 'eerste slot genomen', a && a.name);
  ok(fs.existsSync(path.join(locks, 'electron-1', R.OWNER_FILE)), 'het slot krijgt een eigenaarbestand');
  const b = R.tryTakeSlot({ dir: locks, label: 'test-b' });
  ok(b && b.name === 'electron-2', 'tweede slot: EEXIST op het eerste telt als bezet, dan het volgende');
  ok(R.tryTakeSlot({ dir: locks, label: 'x', exclusive: true }) === null, 'exclusief: niet zolang een ander slot bezet is');
  ok(R.tryTakeSlot({ dir: locks, label: 'x', maxOthers: 1 }) === null, 'maxOthers 1: niet bij twee bezette sloten');
  ok(b.beat(), 'hartslag vernieuwt het eigen slot');
  ok(b.release() && !fs.existsSync(path.join(locks, 'electron-2')), 'vrijgeven haalt het slot weg');
  ok(!b.release(), 'twee keer vrijgeven is onschuldig');
  // een slot van een dode PID wordt opgeruimd
  fs.mkdirSync(path.join(locks, 'electron-3'));
  fs.writeFileSync(path.join(locks, 'electron-3', R.OWNER_FILE), JSON.stringify({ pid: 2147480000, host: os.hostname(), label: 'dood', started: new Date().toISOString() }));
  const weg = R.cleanStale({ dir: locks });
  ok(weg.length === 1 && weg[0].name === 'electron-3' && !fs.existsSync(path.join(locks, 'electron-3')), 'cleanStale haalt alleen het slot van de dode PID weg', weg);
  ok(fs.existsSync(path.join(locks, 'electron-1')), 'het levende slot blijft staan');
  // een slot dat na stale-opruiming door een ander is genomen, wordt bij release niet weggehaald
  fs.writeFileSync(path.join(locks, 'electron-1', R.OWNER_FILE), JSON.stringify({ pid: 1234, host: os.hostname(), label: 'ander', started: new Date().toISOString() }));
  ok(!a.release() && fs.existsSync(path.join(locks, 'electron-1')), 'release raakt een slot van een andere eigenaar niet');
  fs.rmSync(path.join(locks, 'electron-1'), { recursive: true, force: true });

  // andere fouten dan EEXIST: duidelijke fout, geen wachten
  const nep = { ...fs, mkdirSync: (p, o) => { if (o && o.recursive) return; const e = new Error('nee'); e.code = 'EPERM'; throw e; }, statSync: () => { const e = new Error('weg'); e.code = 'ENOENT'; throw e; } };
  let fout = null;
  try { R.tryTakeSlot({ dir: locks, fsImpl: nep }); } catch (e) { fout = e; }
  ok(fout && fout.code === 'SLOT' && /EPERM/.test(fout.message), 'EPERM bij mkdir is een fout, geen bezet slot', fout && fout.message);
  fout = null;
  try { await R.takeSlot({ dir: locks, fsImpl: nep, waitMin: 1, pollMs: 10 }); } catch (e) { fout = e; }
  ok(fout && fout.code === 'SLOT', 'takeSlot stopt meteen bij EPERM in plaats van te wachten');
  const nepMap = { ...fs, mkdirSync: () => { const e = new Error('x'); e.code = 'EACCES'; throw e; } };
  fout = null;
  try { R.tryTakeSlot({ dir: locks, fsImpl: nepMap }); } catch (e) { fout = e; }
  ok(fout && fout.code === 'SLOT_MAP', 'een slotenmap die niet te maken is, geeft SLOT_MAP');
  // alles bezet: takeSlot geeft na de wachttijd SLOT_TIMEOUT
  const vol = path.join(werk, 'vol');
  for (const n of R.SLOT_NAMES) fs.mkdirSync(path.join(vol, n), { recursive: true });
  fout = null;
  try { await R.takeSlot({ dir: vol, waitMin: 0.0005, pollMs: 5, log: stil }); } catch (e) { fout = e; }
  ok(fout && fout.code === 'SLOT_TIMEOUT', 'alles bezet: SLOT_TIMEOUT na de wachttijd', fout && fout.code);

  // ---------- stille machine (puur) ----------
  ok(R.quietVerdict({ cpu: 0.1, freeGB: 8 }).ok, 'rustige machine is stil');
  ok(!R.quietVerdict({ cpu: 0.6, freeGB: 8 }).ok, 'drukke CPU is niet stil');
  ok(!R.quietVerdict({ cpu: 0.1, freeGB: 1 }, { minFreeGB: 4 }).ok, 'te weinig vrij geheugen is niet stil');
  ok(!R.quietVerdict(null).ok, 'zonder meting niet stil');
  let n = 0;
  const reeks = [{ cpu: 0.9, freeGB: 8 }, { cpu: 0.1, freeGB: 8 }, { cpu: 0.1, freeGB: 8 }];
  const wq = await R.waitQuiet({ calm: 2, pauseMs: 1, sample: async () => reeks[Math.min(n++, reeks.length - 1)] });
  ok(wq.ok && n === 3, 'waitQuiet wacht tot twee stille metingen achter elkaar', { n });
  const wq2 = await R.waitQuiet({ calm: 2, pauseMs: 1, waitMin: 0.0003, sample: async () => ({ cpu: 1, freeGB: 8 }) });
  ok(!wq2.ok, 'waitQuiet geeft op na de wachttijd');

  // ---------- paden en omgeving ----------
  let tempFout = null;
  try { R.prepareRunDir(path.join(os.tmpdir(), 'gde-x')); } catch (e) { tempFout = e; }
  ok(tempFout && tempFout.code === 'TEMP', 'een uitvoermap in de systeem-temp wordt geweigerd');
  const rd = R.prepareRunDir(path.join(werk, 'uit'), { pid: 42 });
  ok(rd.profile === path.join(werk, 'uit', 'profiel-42') && fs.existsSync(rd.profile) && fs.existsSync(rd.tmp), 'profiel en TEMP liggen in de uitvoermap');
  const env = R.electronEnv({ base: { ELECTRON_RUN_AS_NODE: '1', PATH: 'x' }, profile: rd.profile, tmp: rd.tmp });
  ok(!('ELECTRON_RUN_AS_NODE' in env) && env.TEMP === rd.tmp && env.TMP === rd.tmp && env.GDE_TEST_PROFILE === rd.profile && env.PATH === 'x', 'electronEnv: ELECTRON_RUN_AS_NODE weg, TEMP en profiel in de uitvoermap');
  ok(R.electronArgs(['.']).join(' ') === '. --no-sandbox' && R.electronArgs(['.', '--no-sandbox']).length === 2 && R.electronArgs(['.'], { noSandbox: false }).length === 1, 'electronArgs: --no-sandbox standaard, nooit dubbel, uit te zetten');
  ok(R.isInside(path.join(werk, 'a', 'b'), werk) && !R.isInside(werk + '-anders', werk), 'isInside');

  // ---------- runElectron: foutpaden met node als kind ----------
  // (node krijgt '--' als laatste argument, zodat het --no-sandbox dat de runner toevoegt een scriptargument is)
  const runLocks = path.join(werk, 'runlocks');
  const prev = process.env.ELECTRON_RUN_AS_NODE;
  process.env.ELECTRON_RUN_AS_NODE = '1';
  const r1 = await R.runElectron({ electron: process.execPath, args: ['-e', 'console.log("env:" + (process.env.ELECTRON_RUN_AS_NODE || "weg") + " argv:" + process.argv.slice(1).join(" ")); console.log("[perf-script] {\\"a\\":1}"); process.exit(3)', '--'], out: path.join(werk, 'r1'), log: stil, slot: { dir: runLocks, label: 'r1' }, timeoutMin: 1 });
  ok(r1.code === 3 && !r1.timedOut, 'exitcode van het kind komt terug', r1);
  ok(r1.sandbox === true, 'een vroege exit 3 wordt als sandboxprobleem gemeld', r1);
  ok(/--no-sandbox/.test(fs.readFileSync(path.join(werk, 'r1', 'electron.log'), 'utf8')), 'het kind krijgt standaard --no-sandbox mee');
  ok(r1.perfScript === '{"a":1}', 'de [perf-script]-regel wordt opgevangen', r1.perfScript);
  ok(/env:weg/.test(fs.readFileSync(path.join(werk, 'r1', 'electron.log'), 'utf8')), 'het kind ziet geen ELECTRON_RUN_AS_NODE');
  ok(!fs.existsSync(path.join(runLocks, 'electron-1')), 'na een gewone run is het slot vrij');
  const r2 = await R.runElectron({ electron: process.execPath, args: ['-e', 'setTimeout(() => {}, 60000)', '--'], out: path.join(werk, 'r2'), log: stil, slot: { dir: runLocks, label: 'r2' }, timeoutMin: 0.02 });
  ok(r2.timedOut, 'tijdslimiet stopt het kind', r2);
  ok(!fs.existsSync(path.join(runLocks, 'electron-1')), 'na de tijdslimiet is het slot vrij');
  fout = null;
  try { await R.runElectron({ electron: path.join(werk, 'bestaat-niet.exe'), out: path.join(werk, 'r3'), log: stil, slot: { dir: runLocks, label: 'r3' }, timeoutMin: 1 }); } catch (e) { fout = e; }
  ok(fout && fout.code === 'START', 'een ontbrekend programma geeft START', fout && fout.message);
  ok(!fs.existsSync(path.join(runLocks, 'electron-1')), 'na een startfout is het slot vrij');
  fout = null;
  try { await R.runElectron({ electron: process.execPath, args: ['-e', '0', '--'], out: path.join(werk, 'r4'), log: stil, slot: false, quiet: { required: true, waitMin: 0.0003, pauseMs: 1, sample: async () => ({ cpu: 1, freeGB: 1 }) } }); } catch (e) { fout = e; }
  ok(fout && fout.code === 'ONRUSTIG', 'een verplichte stille machine die niet stil wordt, stopt de run', fout && fout.message);
  const beats = [];
  await R.runElectron({ electron: process.execPath, args: ['-e', 'setTimeout(() => {}, 300)', '--'], out: path.join(werk, 'r5'), log: (t) => beats.push(t), slot: false, heartbeatMs: 50, timeoutMin: 1 });
  ok(beats.some((t) => /^hartslag/.test(t)), 'de hartslag schrijft naar het logboek', beats);
  if (prev === undefined) delete process.env.ELECTRON_RUN_AS_NODE; else process.env.ELECTRON_RUN_AS_NODE = prev;

  // ---------- guardMainProcess ----------
  const regels = [];
  const dlg = { showErrorBox: () => { throw new Error('mag niet'); } };
  const voor = process.listeners('uncaughtException').length;
  let exitCode = null;
  const g = R.guardMainProcess({ dialog: dlg, log: (t) => regels.push(t), exit: (c) => { exitCode = c; } });
  dlg.showErrorBox('Titel', 'Tekst');
  ok(regels.some((t) => /foutvenster onderdrukt: Titel/.test(t)), 'showErrorBox gaat naar het logboek in plaats van een venster');
  g.fatal(new Error('boem'));
  ok(exitCode === 1 && regels.some((t) => /boem/.test(t)), 'een fatale fout wordt gelogd en stopt met code 1');
  for (const ev of ['uncaughtException', 'unhandledRejection']) { const l = process.listeners(ev); process.removeListener(ev, l[l.length - 1]); }
  ok(process.listeners('uncaughtException').length === voor, 'opruimen van de testhaken');
} finally {
  fs.rmSync(werk, { recursive: true, force: true });
}

console.log(fails ? `electronrunner_test: ${fails} mislukt` : 'electronrunner_test: ok');
process.exit(fails ? 1 : 0);
