// Screenshotjacht: een proefspeler die zonder doel door het spel loopt, rijdt, vaart en door menu's bladert en onderweg beelden maakt
// om iets vreemds te vinden (docs/SCREENSHOTJACHT-22-11.md). Eigen profiel buiten de repo, vaste seed (zelfde plan bij dezelfde seed).
//   node scripts/screenshotjacht.mjs --game=<gestagede game-map> [--seed=1] [--out=<map>] [--tijd=90] [--doel=600]
//        [--delen=verhaal,vrij,binnen,menu] [--ids=<id-voorvoegsels>] [--plan] [--galerij] [--chunk=16] [--max-stops=<n>] [--page=<bestand> --cfg=<json>]
// --plan schrijft alleen plan.json; --galerij bouwt index.json en galerij.html opnieuw uit de bestaande gebeurtenissen (geen Electron).
// --page=<bestand> draait een eigen pagina-script eenmalig (verkenning, zonder plan). GDE_GAME_DIR (met backslashes) of --game wijst de gestagede
// game aan, ELECTRON_EXE een Electron. Een tweede instantie naast een andere run mag (eigen profiel en uitvoermap), nooit poort 9000.
// Uitvoer in <out>: <volgnr>_<soort>_<plaats>.jpg, index.json (met tripwires), galerij.html, plan.json, events-*.jsonl, run-*.log, crashes.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { profileDirFor, verwijderProfiel } from './lib/testprofile.mjs';
import { mulberry32, pickFrom, shuffled, samenvoegen, indexVan, tellingen, galerijHtml } from './lib/jacht_logic.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const SEED = Number(arg('seed', 1)) || 1;
const OUT = path.resolve(arg('out', path.join(ROOT, 'desktop', 'build', 'jacht', `seed-${SEED}`)));
const TIJD_MIN = Number(arg('tijd', 90));
const DOEL = Number(arg('doel', 600));
const DELEN = arg('delen', 'verhaal,vrij,binnen,menu').split(',').filter(Boolean);
const CHUNK = Number(arg('chunk', 16));
const IDS = arg('ids', '').split(',').filter(Boolean);
const MAX_STOPS = Number(arg('max-stops', 0)) || Infinity;
const game = arg('game', process.env.GDE_GAME_DIR || '');
fs.mkdirSync(OUT, { recursive: true });
const metaBasis = { seed: SEED, doel: DOEL, tijdMinuten: TIJD_MIN, uitvoermap: OUT, geenMensHeeftDezeBeeldenGezien: true };

function schrijfIndex() {
  const events = [];
  for (const f of fs.readdirSync(OUT).filter((n) => /^events-.*\.jsonl$/.test(n)).sort()) {
    for (const l of fs.readFileSync(path.join(OUT, f), 'utf8').split(/\r?\n/)) { if (!l.trim()) continue; try { events.push(JSON.parse(l)); } catch { /* halve regel bij een crash */ } }
  }
  const samen = samenvoegen(events);
  const idx = indexVan(samen, metaBasis);
  fs.writeFileSync(path.join(OUT, 'index.json.tmp'), JSON.stringify(idx));
  fs.renameSync(path.join(OUT, 'index.json.tmp'), path.join(OUT, 'index.json'));
  return { idx, samen };
}
function schrijfGalerij(idx) { fs.writeFileSync(path.join(OUT, 'galerij.html'), galerijHtml(idx)); }

if (flag('galerij')) { const { idx } = schrijfIndex(); schrijfGalerij(idx); console.log(`galerij: ${idx.beelden.length} beelden, ${idx.tellingen.verdacht} verdacht -> ${path.join(OUT, 'galerij.html')}`); process.exit(0); }

// ---- wereld en plan ----
const worldDirs = [process.env.GAME_WORLD, game && path.join(game, 'world')].filter(Boolean);
const worldDir = worldDirs.find((d) => fs.existsSync(path.join(d, 'index-provincie.json')));
if (!worldDir) { console.error('Geen gestagede wereld: geef --game=<game-map> (met world/index-provincie.json).'); process.exit(2); }
const index = JSON.parse(fs.readFileSync(path.join(worldDir, 'index-provincie.json'), 'utf8')).global;
const rnd = mulberry32(SEED);
const plaats = (n, kind) => index.places.find((q) => q.name === n && (!kind || q.kind === kind));

async function bouwPlan() {
  const stops = [];
  // (a) verhaal: elke stap van het verhaal (missies met vier beelden, de rest met drie); de ids komen uit de stappenlijst van het spel
  const arc = await import(new URL('../game/js/storyarc_nieuw.js', import.meta.url).href);
  const stappen = arc.STEPS.map((s) => ({ id: s.id, kind: s.kind, titel: s.title }));
  for (const s of stappen) stops.push({ id: `verhaal-${s.id}`, soort: 'verhaal', stap: s.id, kind: s.kind, titel: s.titel });
  // (b) vrij verkennen: ~40 plekken in de provincie
  const stad = plaats('Groningen', 'city');
  const wijken = shuffled(rnd, index.places.filter((p) => p.kind === 'neighbourhood' || p.kind === 'quarter')).slice(0, 6);
  const dorpen = shuffled(rnd, index.places.filter((p) => (p.kind === 'village' || p.kind === 'town') && p.pop > 200)).slice(0, 11);
  const gehuchten = shuffled(rnd, index.places.filter((p) => p.kind === 'hamlet')).slice(0, 6);
  const vast = ['Bourtange', 'Eemshaven', 'Lauwersoog', 'Zoutkamp', 'Termunterzijl', 'Delfzijl', 'Pieterburen', 'Nieuweschans', 'Veendam', 'Winschoten'].map((n) => plaats(n)).filter(Boolean);
  const mk = (p, typ, extra = {}) => ({ naam: p.name, x: Math.round(p.x), y: Math.round(p.y), typ, ...extra });
  const plekken = [
    ...wijken.map((p) => mk(p, 'wijk')), ...dorpen.map((p) => mk(p, 'dorp')), ...gehuchten.map((p) => mk(p, 'boerderij')),
    ...vast.map((p) => mk(p, /Eems|Lauwers|Zoutkamp|Termunter|Delfzijl|Pieterburen/.test(p.name) ? 'kust' : p.name === 'Bourtange' ? 'bourtange' : 'dorp')),
    ...(stad ? Array.from({ length: 3 }, () => ({ naam: 'Groningen-centrum', x: Math.round(stad.x + (rnd() - 0.5) * 2400), y: Math.round(stad.y + (rnd() - 0.5) * 2400), typ: 'stad' })) : []),
    ...Array.from({ length: 3 }, (_, i) => ({ naam: `brug-${i + 1}`, x: 0, y: 0, typ: 'brug', zoek: 'brug', nth: i })),
    ...Array.from({ length: 3 }, (_, i) => ({ naam: `station-${i + 1}`, x: 0, y: 0, typ: 'station', zoek: 'station', nth: i })),
  ].slice(0, 44);
  const CLOCKS = [[8, 14, 21.5], [9, 13, 23.5], [7, 15, 20.5], [8.5, 16, 1]];
  const CAMS = ['derde', 'eerste', 'hoog'];
  plekken.forEach((pl, i) => stops.push({ id: `vrij-${String(i + 1).padStart(2, '0')}-${pl.naam}`, soort: 'vrij', plek: pl, tijden: CLOCKS[i % CLOCKS.length], camera: shuffled(rnd, CAMS), weer: Array.from({ length: 3 }, () => pickFrom(rnd, ['helder', 'helder', 'helder', 'motregen', 'regenbui', 'mist'])) }));
  // (c) interieurs
  stops.push({ id: 'binnen-1', soort: 'binnen', aantal: 15, r: Array.from({ length: 80 }, () => rnd()) });
  // (d) menu's en schermen
  stops.push({ id: 'menu-1', soort: 'menu' });
  return stops;
}
const plan = await bouwPlan();
fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify({ seed: SEED, delen: DELEN, stops: plan }, null, 1));
if (flag('plan')) { console.log(`plan: ${plan.length} stops (${Object.entries(plan.reduce((a, s) => (a[s.soort] = (a[s.soort] || 0) + 1, a), {})).map(([k, v]) => k + ' ' + v).join(', ')}) -> ${path.join(OUT, 'plan.json')}`); process.exit(0); }
if (!game && !process.env.GDE_GAME_DIR) { console.error('--game=<gestagede game-map> ontbreekt'); process.exit(2); }

// ---- Electron ----
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const t0 = Date.now();
const klok = () => Math.round((Date.now() - t0) / 1000);
const logLijn = (s) => { const r = `[${String(klok()).padStart(5)}s] ${s}`; console.log(r); fs.appendFileSync(path.join(OUT, 'jacht.log'), r + '\n'); };
const kill = (pid) => { try { spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* weg */ } };

function hoogsteNr() {
  let m = 0; for (const f of fs.readdirSync(OUT)) { const q = f.match(/^(\d{4})_.*\.jpg$/); if (q) m = Math.max(m, Number(q[1])); }
  return m;
}

// Draait één Electron over een lijst stops (of een eigen pagina); geeft { code, klaar: Set(id), bezig: id|null, crash: bool }.
async function draai(naam, pageSrc, cfg, { maxMs, stilMs = 150 * 1000 }) {
  const profDir = profileDirFor(`gde-test-jacht-${process.pid}-${naam}`, OUT);
  const script = path.join(OUT, `_page-${naam}.js`);
  const events = path.join(OUT, `events-${naam}.jsonl`);
  fs.writeFileSync(events, '');
  fs.writeFileSync(script, `window.__jt = ${JSON.stringify(cfg)};\n` + pageSrc);
  const env = { ...process.env, GDE_TEST_PROFILE: profDir, GDE_NO_THROTTLE: '1' };
  if (game) env.GDE_GAME_DIR = path.resolve(game);
  delete env.ELECTRON_RUN_AS_NODE;
  const logPad = path.join(OUT, `run-${naam}.log`);
  const logFd = fs.openSync(logPad, 'w');
  const child = spawn(electron, ['.', '--windowed', '--stil', '--no-sandbox', '--force-device-scale-factor=1', '--window-size=1280x720',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
    `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`],
  { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', logFd, logFd] });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* gewone prioriteit */ }
  let gedood = null;
  const wacht = setInterval(() => {
    let st = null; try { st = fs.statSync(events); } catch { /* nog niet */ }
    const stil = Date.now() - (st ? st.mtimeMs : t0);
    if (Date.now() - started > maxMs) { gedood = 'tijdslimiet van deze run'; kill(child.pid); }
    else if (stil > stilMs) { gedood = `vastgelopen: ${Math.round(stil / 1000)} s geen gebeurtenis`; kill(child.pid); }
  }, 5000);
  const started = Date.now();
  const tussenIndex = setInterval(() => { try { const { idx } = schrijfIndex(); schrijfGalerij(idx); } catch { /* volgende keer */ } }, 30000);
  const code = await new Promise((res) => { child.on('exit', (c, sig) => res(sig || c)); child.on('error', (e) => res('fout ' + e.message)); });
  clearInterval(wacht); clearInterval(tussenIndex);
  fs.closeSync(logFd);
  verwijderProfiel(profDir);
  const log = fs.readFileSync(logPad, 'utf8');
  const lijnen = fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const klaar = new Set(lijnen.filter((e) => e.type === 'stopklaar').map((e) => e.stop));
  const begonnen = lijnen.filter((e) => e.type === 'stop').map((e) => e.stop);
  const bezig = begonnen.filter((s) => !klaar.has(s)).pop() || null;
  const eind = log.split(/\r?\n/).find((l) => l.startsWith('[perf-script] '));
  return { code, klaar, bezig, gedood, log, eind: eind ? eind.slice(14) : null, eindeNetjes: !!eind, events };
}

const PAGE = fs.readFileSync(path.join(HERE, 'ui', 'jacht.page.js'), 'utf8');

// verkenning: een eigen pagina-script, eenmalig
if (arg('page', '')) {
  const r = await draai('eigen', fs.readFileSync(path.resolve(arg('page', '')), 'utf8'), JSON.parse(arg('cfg', '{}')), { maxMs: 15 * 60 * 1000 });
  console.log(`exit ${r.code}${r.gedood ? ' (' + r.gedood + ')' : ''}\n${r.eind || '(geen resultaat)'}\nlog: ${path.join(OUT, 'run-eigen.log')}`);
  process.exit(0);
}

// ---- de jacht ----
const crashes = [];
const crashLog = path.join(OUT, 'crashes.md');
let chunkNr = 0;
// volgorde van uitvoeren: de korte, kwetsbare delen eerst (menu, binnen), dan het verhaal, als laatste het vrije verkennen (dat is bij tijdsnood het eerst te missen)
const VOLGORDE = { menu: 0, binnen: 1, verhaal: 2, vrij: 3 };
const teDoen = plan.slice().sort((a, b) => VOLGORDE[a.soort] - VOLGORDE[b.soort]).filter((s) => DELEN.includes(s.soort) && (!IDS.length || IDS.some((i) => s.id.startsWith(i)))).slice(0, MAX_STOPS);
const gedaan = new Set(); const faalpoging = new Map();
// al gedane stops uit een eerdere (onderbroken) run met dezelfde uitvoermap tellen mee
for (const f of fs.readdirSync(OUT).filter((n) => /^events-.*\.jsonl$/.test(n))) for (const l of fs.readFileSync(path.join(OUT, f), 'utf8').split(/\r?\n/)) { if (l.includes('"stopklaar"')) try { gedaan.add(JSON.parse(l).stop); } catch { /* halve regel */ } }
if (gedaan.size) logLijn(`hervat: ${gedaan.size} stops waren al klaar`);
const deadline = t0 + TIJD_MIN * 60 * 1000;
logLijn(`start: seed ${SEED}, ${teDoen.length} stops, delen ${DELEN.join(',')}, limiet ${TIJD_MIN} min, uitvoer ${OUT}`);
while (Date.now() < deadline) {
  const open = teDoen.filter((s) => !gedaan.has(s.id));
  if (!open.length) break;
  if (hoogsteNr() >= DOEL) { logLijn(`doel van ${DOEL} beelden bereikt`); break; }
  // een chunk: opeenvolgende stops van dezelfde soort (binnen en menu elk alleen)
  const soort = open[0].soort;
  const maat = soort === 'verhaal' ? CHUNK : soort === 'vrij' ? Math.max(6, Math.round(CHUNK / 2)) : 1;
  const chunk = open.filter((s) => s.soort === soort).slice(0, maat);
  const naam = `c${String(++chunkNr).padStart(3, '0')}-${soort}`;
  const resterendMs = deadline - Date.now();
  logLijn(`chunk ${naam}: ${chunk.length} stops (${chunk[0].id} ... ${chunk[chunk.length - 1].id}), start bij beeld ${hoogsteNr() + 1}`);
  let r;
  try { r = await draai(naam, PAGE, { seed: SEED, startNr: hoogsteNr(), stops: chunk, doel: DOEL, testCrash: process.env.JACHT_TEST_CRASH || '' }, { maxMs: Math.min(resterendMs, 40 * 60 * 1000) }); }
  catch (e) { logLijn(`chunk ${naam} kon niet starten: ${e.message}`); break; }
  for (const id of r.klaar) gedaan.add(id);
  const gehaald = chunk.filter((s) => r.klaar.has(s.id)).length;
  logLijn(`chunk ${naam}: exit ${r.code}${r.gedood ? ' (' + r.gedood + ')' : ''}, ${gehaald}/${chunk.length} stops klaar, beelden nu ${hoogsteNr()}`);
  if (!r.eindeNetjes || r.gedood) {
    // crash of hang: de stop waarop het misging is de bevinding; een tweede keer faalt hij niet nog eens, hij wordt overgeslagen
    const bij = r.bezig || chunk.find((s) => !r.klaar.has(s.id))?.id || '?';
    const staart = r.log.split(/\r?\n/).filter((l) => l.trim()).slice(-25).join('\n');
    const rec = { type: 'crash', chunk: naam, stop: bij, code: String(r.code), reden: r.gedood || 'Electron stopte zonder resultaat', beeldNr: hoogsteNr(), tijd: new Date().toISOString() };
    crashes.push(rec);
    fs.appendFileSync(r.events, JSON.stringify(rec) + '\n');
    fs.appendFileSync(crashLog, `## ${naam}, stop ${bij}\n- ${rec.reden}; exit ${rec.code}; na beeld ${rec.beeldNr}\n\n\`\`\`\n${staart}\n\`\`\`\n\n`);
    const n = (faalpoging.get(bij) || 0) + 1; faalpoging.set(bij, n);
    if (n >= 1) { gedaan.add(bij); logLijn(`crash bij ${bij}: gelogd in crashes.md, stop wordt overgeslagen`); }
  } else if (gehaald < chunk.length) {
    for (const s of chunk) if (!r.klaar.has(s.id)) { gedaan.add(s.id); logLijn(`stop ${s.id} niet voltooid (zie stopfout in index.json)`); }
  }
  schrijfGalerij(schrijfIndex().idx);
}
const { idx, samen } = schrijfIndex();
schrijfGalerij(idx);
const t = tellingen(samen.beelden);
logLijn(`klaar: ${t.totaal} beelden, ${t.verdacht} verdacht, ${crashes.length} crashes; per soort ${JSON.stringify(t.perSoort)}; vlaggen ${JSON.stringify(t.perVlag)}`);
console.log(`uitvoer: ${OUT}`);
