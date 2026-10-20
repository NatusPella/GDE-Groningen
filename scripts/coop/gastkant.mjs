// Coöp-testbank (#95): de kant van de GAST in een echte Electron-instantie, met een gescripte host in Node
// (scripts/coop/nodehost.mjs): één Electron-slot genoeg. De host beweegt Tammo, voertuigen en voetgangers, zet een
// opdracht, een filmpje, een keuze, pauze, wanted en een rit met Tessa als passagier in het spel en betaalt de gast.
// De gast speelt via het hoofdmenu en de lobby zoals een speler: toestemming, verbinden, aanraakbediening, een afwijking
// (desync), opnieuw verbinden via het wachtscherm, zijn eigen save, en het einde als de gastheer stopt.
//   node scripts/coop/gastkant.mjs --stage=<gestagede game-map> [--out=<map>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startNodeHost } from './nodehost.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const STAGE = path.resolve(arg('stage', process.env.GDE_GAME_DIR || ''));
if (!STAGE || !fs.existsSync(path.join(STAGE, 'index.html'))) { console.error('--stage=<gestagede game-map> ontbreekt (scripts/coop/restage.mjs)'); process.exit(2); }
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gastkant', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || 'C:/Users/abuis/gde-locks';
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
process.env.GDE_COOP_TEST = '1';
fs.mkdirSync(OUT, { recursive: true });

// ---- één slot, hooguit 12 minuten vasthouden en dan even loslaten voor anderen
const held = [];
async function takeSlot() {
  for (;;) {
    for (const k of [1, 2, 3]) { const d = path.join(LOCKS, 'electron-' + k); try { fs.mkdirSync(d); held.push(d); return; } catch (e) { /* bezet */ } }
    console.log('sloten bezet, wacht 10 s'); await new Promise((r) => setTimeout(r, 10000));
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

// ---- het programma van de gast (seconden na "verbonden") en het draaiboek van de host, op dezelfde tijdlijn
const PROGRAM = [
  [0, 'wacht', { s: 12 }], [22, 'shot', { name: 'g-filmpje' }], [34, 'shot', { name: 'g-keuze' }], [42, 'shot', { name: 'g-pauze' }], [54, 'shot', { name: 'g-passagier' }],
  [66, 'shot', { name: 'g-wanted' }], [76, 'opgeslagen', {}], [80, 'desync', { s: 25, wie: 'gast' }], [120, 'touch', { s: 12 }], [134, 'menushot', {}], [142, 'herverbind', { wie: 'gast' }], [178, 'verlaat', { wie: 'gast' }], [192, 'opnieuw', {}], [212, 'wacht', { s: 40 }],
];
const HOST_STOP = 242;
const code = {};
const started = Date.now();
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastkant-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', '--coop', '--autoplay=22', '--url-flags=touch=1',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
const done = new Promise((res) => child.on('exit', (c) => { fs.writeFileSync(path.join(OUT, 'run.log'), out); fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true }); const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] ')); let r = { result: 'ONBEKEND' }; try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ } res(r); }));
process.on('exit', () => { try { child.kill(); } catch (e) { /* weg */ } });
const readEvents = () => fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);

// het draaiboek van de host begint zodra de gast "allen-erbij" meldt
const traces = { companion: [], roster: [], wanted: [] };
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  const t0 = Date.now(); const rel = () => (Date.now() - t0) / 1000;
  const tr = setInterval(() => { traces.companion.push([+rel().toFixed(1), +host.world.companion.x.toFixed(1), +host.world.companion.y.toFixed(1)]); traces.roster.push([+rel().toFixed(1), JSON.stringify(host.roster())]); }, 1000);
  host.at(14, (h) => h.mission({ phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Trek een wachtnummer (1/6)', marker: { x: -1260, y: -1050 } }));
  host.at(20, (h) => { h.state.filmpje = true; h.state.regel = { wie: 'Tammo', tekst: 'Dit is een proeffilmpje, kijk even mee.' }; });
  host.at(30, (h) => { h.state.filmpje = false; h.state.regel = null; });
  host.at(32, (h) => { h.state.keuze = { tekst: 'Wat doe je?', opties: ['Eerst pinnen', 'Meteen naar het loket'] }; });
  host.at(40, (h) => { h.state.keuze = null; h.state.pauze = true; });
  host.at(46, (h) => { h.state.pauze = false; });
  host.at(48, (h) => h.rit(true));
  host.at(62, (h) => h.rit(false));
  host.at(64, (h) => { h.world.wanted = 3; });
  host.at(70, (h) => { h.world.wanted = 0; h.log.push('betaald ' + h.pay(250, 1)); });
  host.at(182.5, (h) => h.log.push('na vertrek ' + JSON.stringify(h.roster())));
  host.at(HOST_STOP, async (h) => { clearInterval(tr); h.log.push('host stopt'); await h.stop(); });
  host.T0 = t0;
})();
const res = await done;
release();
try { await host.stop(); } catch (e) { /* al weg */ }

// ---------------------------------------------------------------- beoordelen
const E = readEvents(); const problems = [], notes = [];
const check = (c, m) => { if (!c) problems.push(m); };
const of = (t) => E.filter((e) => e.type === t);
const S = of('sample'); const T0 = (of('allen-erbij')[0] || {}).t || 0;
const win = (a, b) => S.filter((s) => s.t >= T0 + a && s.t <= T0 + b);
const dist = (p, q) => Math.hypot(p.x - q[3], p.y - q[4]);
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
for (const [f, v] of Object.entries(res.fasen || {})) check(v === 'ok', `fase ${f} ${v}`);
const c1 = of('toestemming')[0], c2 = of('toestemming-wacht')[0], v1 = of('verbonden')[0];
check(c1 && c1.net.ws === 0 && c1.net.rtc === 0 && c1.net.fetch === 0 && c2 && c2.net.ws === 0 && c2.net.rtc === 0, 'toestemming: er ging verkeer uit vóór akkoord: ' + JSON.stringify([c1 && c1.net, c2 && c2.net]));
check(v1 && v1.net.ws === 0 && v1.net.rtc === 0 && v1.net.fetch === 0, 'de IP-route gebruikt de browser niet voor verkeer: ' + JSON.stringify(v1 && v1.net));
check(S.length > 100, 'te weinig samples: ' + S.length);
// wereld van de host: voertuigen, voetgangers en het doel
const w1 = win(2, 12); check(w1.length && w1.every((s) => s.hostEnt && s.hostEnt[0] >= 3 && s.hostEnt[2] >= 10), 'wereld: de gast ziet te weinig voertuigen of voetgangers: ' + JSON.stringify(w1.slice(-1).map((s) => s.hostEnt)));
const w2 = win(17, 28); check(w2.length && w2.some((s) => s.hm && /Het Loket/.test(s.hm) && /wachtnummer/.test(s.hm)) && w2.some((s) => s.hostEnt && s.hostEnt[1] === 1), 'opdracht: de gast ziet de stap of het doel niet: ' + JSON.stringify(w2.slice(-1).map((s) => [s.hm, s.hostEnt])));
// filmpje, keuze, pauze
const f1 = win(23, 29); check(f1.length && f1.every((s) => s.sc && s.sc[0] === 1 && s.sceneEl && s.inp && s.inp[0] === 0 && s.inp[1] === 0), 'filmpje: de laag ontbreekt of de gast stuurt invoer: ' + JSON.stringify(f1.slice(-1).map((s) => [s.sc, s.sceneEl, s.inp])));
check(f1.some((s) => s.sc && /proeffilmpje/.test(s.sc[2] || '')), 'filmpje: de regel van de gastheer ontbreekt');
const k1 = win(34, 39); check(k1.length && k1.every((s) => s.sc && s.sc[3] === 2 && s.sceneEl), 'keuze: de opties van de gastheer ontbreken: ' + JSON.stringify(k1.slice(-1).map((s) => [s.sc, s.sceneEl])));
const p1 = win(42, 45); check(p1.length && p1.every((s) => s.sc && s.sc[1] === 1 && s.sceneEl), 'pauze: de melding ontbreekt: ' + JSON.stringify(p1.slice(-1).map((s) => [s.sc, s.sceneEl])));
const n1 = win(48, 60 - 30).length; void n1;
check(win(32.5, 33.5).every((s) => !(s.sc && s.sc[0] === 1)), 'filmpje: de laag bleef na het filmpje staan');
// rit: Tessa (de gast) rijdt mee, haar camera volgt het voertuig
const r1 = win(52, 60).filter((s) => s.me && s.partners.some((p) => p[0] === 0));
const rd = r1.map((s) => dist(s.me, s.partners.find((p) => p[0] === 0)));
check(r1.length >= 4 && Math.max(...rd) < 18, `rit: Tessa blijft achter (grootste afstand ${rd.length ? Math.max(...rd).toFixed(0) : '?'} m)`);
check(r1.some((s) => s.partners.some((p) => p[0] === 0 && p[2] !== 'voet')), 'rit: Tammo staat niet als "in een voertuig"');
// wanted en geld
check(win(66, 69).every((s) => s.wanted === 3) && win(66, 69).length > 0, 'wanted: de gast ziet het wanted van de gastheer niet: ' + JSON.stringify(win(66, 69).slice(-1).map((s) => s.wanted)));
const sv = of('save')[0]; const m0 = (win(1, 5)[0] || {}).money, m1 = (win(74, 76).slice(-1)[0] || {}).money;
check(m1 === m0 + 250, `betalen: het geld van de gast steeg niet met 250 (${m0} → ${m1})`);
const vsv = of('voor-save')[0]; check(sv && sv.hadSave && vsv && sv.saveMoney === vsv.money + 250 && sv.verdiend === 0, 'save: de beloning van de gast staat niet in zijn eigen save (hij had er al een): ' + JSON.stringify({ voor: vsv, na: sv }));
// desync
const di = of('desync-ingebracht')[0], du = of('desync-uitkomst')[0];
check(di && du && du.hersync >= 1 && du.desync && du.desync.includes('stage'), 'desync: niet herkend of geen hersync gevraagd: ' + JSON.stringify(du));
// aanraakbediening
const tu = of('touch')[0], th = of('touch-half')[0], tv = of('touch-vol')[0], tl = of('touch-los')[0];
check(tu && tu.ui, 'touch: geen aanraakbediening: ' + JSON.stringify(tu));
check(th && th.axis && th.axis[0] > 0.25 && th.axis[0] < 0.85, 'touch: halve stick: ' + JSON.stringify(th)); check(tv && tv.axis && tv.axis[0] > 0.95, 'touch: volle stick: ' + JSON.stringify(tv)); check(tl && tl.axis && tl.axis[0] === 0 && tl.axis[1] === 0, 'touch: los: ' + JSON.stringify(tl));
note(notes, 'touch: ' + JSON.stringify({ knoppen: tu && tu.speelknoppen, half: th && th.axis, vol: tv && tv.axis }));
const tc = traces.companion.filter(([t]) => t >= 120 && t <= 134); check(tc.length > 4 && Math.hypot(tc[tc.length - 1][1] - tc[0][1], tc[tc.length - 1][2] - tc[0][2]) > 4, 'touch: Tessa bewoog niet in de wereld van de host: ' + JSON.stringify([tc[0], tc[tc.length - 1]]));
const ms = of('menushot')[0];
check(ms && ms.chip && ms.chipZichtbaar === false, 'pauzemenu: het partnerlabel ligt nog over het menu: ' + JSON.stringify(ms));
// opnieuw verbinden via het wachtscherm
const hh = of('herverbind-hold')[0], hk = of('herverbind-klaar')[0], hc = of('herverbind-code')[0];
check(hh && hh.hold && hh.paused && hh.coopHold, 'herverbinden: geen wachtscherm met pauze bij de gast: ' + JSON.stringify(hh));
check(hk && !hk.hold && !hk.paused && hk.slot === 1 && ['ok', 'lag'].includes(hk.status), 'herverbinden: de gast is niet terug op plek 1: ' + JSON.stringify(hk));
check(traces.roster.some(([t, r]) => t > 142 && t < 176 && !r.includes('[1,"ok"]')), 'herverbinden: de host zag Tessa niet haperen of wegvallen: ' + JSON.stringify(traces.roster.filter(([t]) => t > 142 && t < 176).map(([t, r]) => t + ':' + r).slice(0, 6)));
note(notes, 'herverbinden: code ' + (hc && hc.voorgevuld ? 'voorgevuld' : 'moest worden ingevoerd'));
// de gast verlaat het spel via het menu en sluit later opnieuw aan
const vl = of('verlaten')[0], on = of('opnieuw-klaar')[0];
const eerste = S.find((s) => s.me && s.role == null && s.me.x < -1000); const posVoor = eerste && eerste.me;
check(vl && vl.coopNet === false && vl.role === null, 'verlaten: de gast zit nog in de sessie: ' + JSON.stringify(vl));
check(vl && vl.pos && posVoor && Math.hypot(vl.pos[0] - posVoor.x, vl.pos[1] - posVoor.y) < 6, 'verlaten: de gast staat niet terug op zijn eigen plek: ' + JSON.stringify([vl && vl.pos, posVoor]));
check(host.log.some((l) => l === 'na vertrek [[0,"ok"]]'), 'verlaten: de lijst van de host klopt niet: ' + host.log.join('; '));
check(on && on.role === 'client' && on.slot === 1 && !on.paused, 'opnieuw aansluiten: ' + JSON.stringify(on));
// het einde: de gastheer stopt, de gast speelt weer in zijn eigen spel
const last = S[S.length - 1] || {};
check(last.role === null || last.role === undefined, 'einde: de gast zit na het stoppen van de gastheer nog in de sessie: ' + JSON.stringify({ role: last.role, status: last.status }));
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
function note(arr, m) { arr.push(m); }
notes.push('draaiboek: ' + host.log.join('; '));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res, traces: { companion: traces.companion.length } }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
