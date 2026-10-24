// Coöp-testbank (#443): golf (pitch & putt) tegen elkaar, gezien vanaf een gast in een echte Electron-instantie met een gescripte host in Node (zoals gastkant_443.mjs).
// De host nodigt uit, de gast zegt ja (J) en speelt zijn zes banen op zijn eigen scherm tegen de baan van de host, de host meldt zijn eigen slagen; de stand, de uitslag en
// de beloning per plek komen terug; in een tweede ronde stopt de gast na twee banen (Backspace).
//   node scripts/coop/gastkant_443_golf.mjs --stage=<gestagede game-map> [--out=<map>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startNodeHost } from './nodehost.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const STAGE = path.resolve(arg('stage', process.env.GDE_GAME_DIR || ''));
if (!STAGE || !fs.existsSync(path.join(STAGE, 'index.html'))) { console.error('--stage=<gestagede game-map> ontbreekt (scripts/coop/restage.mjs)'); process.exit(2); }
const SIZE = arg('size', '1280x720');
const MOCK = Math.max(0, Math.min(2, Number(arg('mock', 0)) || 0)); // extra headless spelers: 2 = vier in totaal; zij stappen mee in de auto
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gastkant', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
process.env.GDE_COOP_TEST = '1';
fs.mkdirSync(OUT, { recursive: true });

const held = [];
let wachtN = 0;
async function takeSlot() {
  for (;;) {
    for (const k of [1, 2, 3]) { const d = path.join(LOCKS, 'electron-' + k); try { fs.mkdirSync(d); held.push(d); return; } catch (e) { /* bezet */ } }
    if (++wachtN % 300 === 1) console.log('sloten bezet, wacht'); await new Promise((r) => setTimeout(r, 100));
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

// het programma van de gast (seconden na "allen-erbij") en het draaiboek van de host, op dezelfde tijdlijn
const PROGRAM = [[0, 'wacht', { s: 5 }], [5, 'golfgast', { s: 420 }]];
const HOST_STOP = 480;
const started = Date.now();
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE, max: 4 });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastkant443golf-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`, '--coop', '--autoplay=22',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
const done = new Promise((res) => child.on('exit', () => { fs.writeFileSync(path.join(OUT, 'run.log'), out); fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true }); const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] ')); let r = { result: 'ONBEKEND' }; try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ } res(r); }));
process.on('exit', () => { try { child.kill(); } catch (e) { /* weg */ } });
const readEvents = () => fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const imp = (f) => import(pathToFileURL(path.join(ROOT, 'game', 'js', f)).href);
const WD = await imp('coopwedstrijd.js'), PL = await imp('puttinglogic.js'), EP = await imp('echteplekken.js');
// de baan van de host: de eerste echte golfbaan uit echteplekken.json (zoals pitchputt.js setVenues), anders het Concours
let venue = { id: 'concours', holes: PL.ppHoles() };
try { const v = EP.golfVenues(JSON.parse(fs.readFileSync(path.join(STAGE, 'echteplekken.json'), 'utf8')))[0]; if (v) venue = { id: v.id, holes: PL.holesFromWorld(v.holes) }; } catch (e) { /* het Concours */ }
const STANDPLEK = PL.venueLayout(venue.holes).stand;
// de host: speelt zelf mee door zijn slagen te melden (12 s per baan in de eerste ronde, 3 s in de tweede)
const H = { sc: null, nr: 0, uit: [], eind: [], rematch: null, tempo: 12000 };
WD.registreerWedstrijd('pitchputt', { naam: 'Pitch & putt', soort: 'score', banen: () => venue.holes.map((h) => ({ par: h.par })), start: (w, sc) => { H.sc = sc; H.nr++; host.log.push(`ronde ${H.nr} begint met ${sc.deeln.map((d) => d.naam).join(' en ')} op ${venue.id}`); return true; }, plek: () => ({ ...STANDPLEK }), extra: () => ({ v: venue.id }), eind: (w, res) => { H.eind.push({ nr: H.nr, res: res || 'gestopt' }); H.sc = null; H.eindT = Date.now(); host.log.push(`ronde ${H.nr} klaar`); }, solo: () => true });
setInterval(() => { // de host meldt zijn slagen: een baan per H.tempo
  const sc = H.sc; if (!sc) return;
  if (!H.volgende || Date.now() >= H.volgende) { const i = (sc.kaart[0] || []).length; if (i < sc.banen.length) { WD.wedHostScore(host.world, i, sc.banen[i].par + (i % 3 === 0 ? 1 : 0)); H.volgende = Date.now() + H.tempo; } }
}, 250).unref();
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  await new Promise((r) => setTimeout(r, 9000));
  H.uit.push(WD.wedNodigUit(host.world, 'pitchputt')); host.log.push('uitnodiging verstuurd');
  for (let i = 0; i < 4000 && !(H.eindT && Date.now() - H.eindT > 14000); i++) await new Promise((r) => setTimeout(r, 250));
  H.tempo = 3000; H.volgende = 0;
  H.rematch = { willen: WD.willenOpnieuw(host.world), start: WD.wedOpnieuw(host.world) }; host.log.push('tweede ronde gestart');
  for (let i = 0; i < 4000 && H.eind.length < 2; i++) await new Promise((r) => setTimeout(r, 250));
  await new Promise((r) => setTimeout(r, 12000));
  host.log.push('host stopt'); await host.stop();
})();
const res = await done;
release();
try { await host.stop(); } catch (e) { /* al weg */ }

// ---------------------------------------------------------------- beoordelen
const E = readEvents(); const problems = [], notes = [];
const check = (c, m) => { if (!c) problems.push(m); };
const of = (t) => E.filter((e) => e.type === t);
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
for (const [f, v] of Object.entries(res.fasen || {})) check(v === 'ok', `fase ${f} ${v}`);
const uit = of('golf-uitnodiging'), st = of('golf-start'), ei = of('golf-einde'), ul = of('golf-uitslag')[0], gs = of('golf-gestopt')[0];
check(uit.length === 2 && /Meedoen\?/.test(uit[0].tekst) && /Pitch & putt/.test(uit[0].tekst), 'uitnodiging: ' + JSON.stringify(uit.map((u) => u.tekst)));
check(st.length === 2 && st[0].holes === venue.holes.length && st[0].banen.length === venue.holes.length && st[0].vlag, 'start: ' + JSON.stringify(st[0]));
check(st[0] && st[0].venueGast === venue.id, 'de gast speelt niet op de baan van de host: ' + JSON.stringify(st[0] && [st[0].venueGast, venue.id]));
const e1 = ei[0];
check(e1 && e1.banen === venue.holes.length && e1.wacht && e1.slagen >= venue.holes.length, 'ronde 1: de gast speelde niet alle banen: ' + JSON.stringify(e1));
check(e1 && e1.bord.some((b) => /Baan/.test(b) && /Tammo/.test(b) && /Tessa/.test(b)), 'ronde 1: het bord toont de stand van de anderen niet: ' + JSON.stringify(e1 && e1.bord));
check(ul && /uitslag/i.test(ul.kaart) && /Tammo/.test(ul.kaart) && /Tessa/.test(ul.kaart) && /slagen/.test(ul.kaart), 'uitslag: ' + (ul && ul.kaart));
check(ul && ul.geldErbij > 0, 'uitslag: de gast kreeg geen beloning in zijn eigen geld: ' + (ul && ul.geldErbij));
check(gs && gs.vrij && !gs.vlag, 'stoppen: de gast kwam niet vrij: ' + JSON.stringify(gs));
const h2 = H.eind.find((x) => x.nr === 2), h1 = H.eind.find((x) => x.nr === 1);
check(h1 && h1.res && h1.res.rijen && h1.res.rijen.length === 2 && h1.res.jij && h1.res.jij.geld > 0, 'host: uitslag van ronde 1: ' + JSON.stringify(h1 && h1.res && h1.res.jij));
check(h2 && h2.res && h2.res.rijen && h2.res.rijen.some((r) => r.weg), 'host: in de tweede ronde viel de gast weg en dat staat in de uitslag: ' + JSON.stringify(h2 && h2.res && h2.res.rijen));
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('baan van de host: ' + venue.id, 'uitnodigingen: ' + JSON.stringify(uit.map((u) => u.tekst)), 'start: ' + JSON.stringify(st), 'einde: ' + JSON.stringify(ei), 'uitslag: ' + JSON.stringify(ul), 'gestopt: ' + JSON.stringify(gs));
notes.push('host: ' + JSON.stringify({ uit: H.uit, rematch: H.rematch, ronde1: h1 && h1.res && h1.res.rijen, ronde2: h2 && h2.res && h2.res.rijen }), 'draaiboek: ' + host.log.join('; '), 'duur ' + Math.round((Date.now() - started) / 1000) + ' s');
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
