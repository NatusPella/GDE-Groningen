// Coöp-testbank (#443): races tegen elkaar, gezien vanaf een gast in een echte Electron-instantie met een gescripte host in Node (zoals gastkant_434.mjs; één slot).
// De host (Node, de echte koppeling en coopwedstrijd.js met de pure race van kartrace.js) nodigt uit, de gast zegt ja met J, rijdt mee met de stick en krijgt de uitslag
// en een beloning; in een rematch stopt de gast halverwege (Backspace) en rijdt de host door.
//   node scripts/coop/gastkant_443.mjs --stage=<gestagede game-map> [--out=<map>]
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
const PROGRAM = [[0, 'wacht', { s: 5 }], [5, 'wedstrijd', { s: 300, stop: 20 }]];
const HOST_STOP = 400;
const started = Date.now();
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE, max: 4 });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastkant443-${process.pid}`;
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
const WD = await imp('coopwedstrijd.js'), KR = await imp('kartrace.js'), TRACK = (await imp('kartbaanspoor.js')).KARTBAAN_TRACK;
// de host: staat van de wedstrijd (een kleine toestandsmachine op de gebeurtenissen van de gast)
const H = { race: null, nr: 0, uit: [], eind: [], rematch: null, weg: null, stand: 'wacht' };
WD.registreerWedstrijd('kartbaan', { naam: 'Karten in Ulrum', start: (w, r) => { H.race = r; H.nr++; host.log.push(`race ${H.nr} begint met ${r.karts.filter((k) => k.mens).map((k) => k.name).join(' en ')} en ${r.karts.filter((k) => !k.mens).length} AI`); return true; }, solo: () => true });
let lastT = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  const r = H.race; if (!r) return;
  const ev = WD.wedRaceTik(host.world, r, dt, () => KR.bestInput(r.karts[0], TRACK));
  if (H.nr === 2 && !H.weg && r.karts[1].weg) H.weg = { t: Date.now(), progHost: r.karts[0].prog, progGast: r.karts[1].prog };
  if (H.weg && !H.wegNa && Date.now() - H.weg.t > 15000) H.wegNa = { progHost: r.karts[0].prog, progGast: r.karts[1].prog, lichaamVrij: host.world.companion.coopWedstrijd === false };
  if (H.weg && Date.now() - H.weg.t > 16000) { H.eind.push({ nr: 2, gestopt: true, res: WD.wedHostEind(host.world, r, { gestopt: true }) }); H.race = null; H.stand = 'klaar'; return; }
  if (ev.some((e) => e.type === 'klaar')) { H.eind.push({ nr: H.nr, res: WD.wedHostEind(host.world, r) }); H.race = null; H.eindT = Date.now(); host.log.push(`race ${H.nr} klaar`); }
}, 16).unref();
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  await new Promise((r) => setTimeout(r, 9000));
  H.uit.push(WD.wedNodigUit(host.world, 'kartbaan')); host.log.push('uitnodiging verstuurd');
  for (let i = 0; i < 4000 && !(H.eindT && Date.now() - H.eindT > 14000); i++) await new Promise((r) => setTimeout(r, 250));
  H.rematch = { willen: WD.willenOpnieuw(host.world), start: WD.wedOpnieuw(host.world) }; host.log.push('rematch gestart');
  for (let i = 0; i < 4000 && H.stand !== 'klaar'; i++) await new Promise((r) => setTimeout(r, 250));
  await new Promise((r) => setTimeout(r, 14000));
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
const uit = of('wed-uitnodiging'), st = of('wed-start'), ei = of('wed-einde'), ul = of('wed-uitslag')[0], rm = of('wed-rematch-gevraagd')[0], stp = of('wed-stop')[0], gs = of('wed-gestopt')[0], gr = of('wed-grid');
check(uit.length === 2, `de gast kreeg ${uit.length} uitnodigingen (2 verwacht)`);
check(uit[0] && /Meedoen\?/.test(uit[0].tekst) && /J = ja, N = nee/.test(uit[0].tekst) && /Tammo/.test(uit[0].tekst), 'uitnodiging: tekst klopt niet: ' + (uit[0] && uit[0].tekst));
check(st.length === 2 && st[0].karts.length === 4 && st[0].eigen === 'Tessa' && st[0].karts.includes('Tammo') && st[0].wedstrijdVlag, 'start: ' + JSON.stringify(st[0]));
check(gr.length >= 1 && /Startlichten|Rijders/.test(gr[0].bord || ''), 'grid: het bord toont het aftellen niet: ' + JSON.stringify(gr[0]));
const e1 = ei[0];
check(e1 && e1.duur > 60 && e1.duur < 190, 'race 1: duur ' + (e1 && e1.duur));
check(e1 && e1.momentopnamenPerS >= 8 && e1.momentopnamenPerS <= 14, 'race 1: momentopnamen per seconde ' + (e1 && e1.momentopnamenPerS));
check(e1 && e1.gemeten > 1200 && e1.sprong <= e1.gemeten * 0.005 && e1.stil <= e1.gemeten * 0.005, 'race 1: de weergave haperde: ' + JSON.stringify(e1 && { sprong: e1.sprong, stil: e1.stil, gemeten: e1.gemeten, frames: e1.frames }));
check(e1 && e1.vmax > 15, 'race 1: de gast kwam niet op snelheid (stick): ' + (e1 && e1.vmax));
check(e1 && e1.fasen.map((f) => f[0]).join().startsWith('grid,race'), 'race 1: fasen ' + (e1 && JSON.stringify(e1.fasen)));
check(e1 && e1.bord.some((b) => /Ronde/.test(b) && /Plaats/.test(b) && /Tijd/.test(b)), 'race 1: het bord toont ronde, plaats en tijd niet: ' + JSON.stringify(e1 && e1.bord));
check(ul && /uitslag/i.test(ul.kaart) && /Tammo/.test(ul.kaart) && /Tessa/.test(ul.kaart) && /Jij werd|niet gefinisht/.test(ul.kaart), 'uitslag: ' + (ul && ul.kaart));
check(ul && ul.geldErbij > 0, 'uitslag: de gast kreeg geen beloning in zijn eigen geld: ' + (ul && ul.geldErbij));
check(rm && rm.nogmaals === true, 'rematch: de gast kon niet nog een keer vragen: ' + JSON.stringify(rm));
check(H.rematch && H.rematch.willen.includes(1) && H.rematch.start.ok, 'rematch: de host kreeg het verzoek niet of kon niet starten: ' + JSON.stringify(H.rematch));
check(stp && gs && gs.vrij && !gs.vlag, 'stoppen: de gast kwam niet vrij: ' + JSON.stringify(gs));
check(H.weg && H.wegNa && H.wegNa.progHost > H.weg.progHost + 100 && H.wegNa.progGast > H.weg.progGast + 50 && H.wegNa.lichaamVrij, 'wegvallen: de race liep niet door voor de host of de kart van de gast stond stil: ' + JSON.stringify({ weg: H.weg, na: H.wegNa }));
const h1 = H.eind.find((x) => x.nr === 1);
const rijen = h1 && h1.res && h1.res.rijen;
check(rijen && rijen.length === 4 && rijen.filter((x) => !x.ai).length === 2, 'host: eindstand van race 1: ' + JSON.stringify(rijen));
check(h1 && h1.res && h1.res.jij && h1.res.jij.geld > 0, 'host: geen beloning voor wie het spel opende: ' + JSON.stringify(h1 && h1.res && h1.res.jij));
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('uitnodigingen: ' + JSON.stringify(uit.map((u) => u.tekst)), 'start: ' + JSON.stringify(st), 'grid: ' + JSON.stringify(gr), 'einde: ' + JSON.stringify(ei), 'uitslag: ' + JSON.stringify(ul), 'rematch: ' + JSON.stringify(rm), 'stop: ' + JSON.stringify(stp), 'gestopt: ' + JSON.stringify(gs));
notes.push('host: ' + JSON.stringify({ uit: H.uit, rematch: H.rematch, weg: H.weg, wegNa: H.wegNa, rijen, jij: h1 && h1.res && h1.res.jij }), 'draaiboek: ' + host.log.join('; '), 'duur ' + Math.round((Date.now() - started) / 1000) + ' s');
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
