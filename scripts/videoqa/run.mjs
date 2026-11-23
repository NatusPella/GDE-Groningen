// Video-QA-pijplijn als één commando (kwaliteitsmachine, docs/KWALITEITSMACHINE.md): opnemen (Spelbot, menselijk profiel, vaste
// tijdstap), frame-analyse (zwart, egaal, wit, flikkering, pop-in, haperingen/streamwachten, rekentijdpieken, stilstand, tekst-overlap),
// contactvellen en één rapportpagina. Hervatbaar: de opname is verdeeld in DELEN van --deel-minuten (elk een eigen Electron-run met
// een eigen seed, geschreven in segmenten van --seg seconden); nog een keer hetzelfde commando met dezelfde --out gaat verder waar
// het stopte: klare delen, analyses en vellen worden overgeslagen, een afgebroken deel telt mee met wat er al op schijf staat.
//
//   node scripts/videoqa/run.mjs --minuten=30 [--out=<map>] [--game-dir=<gestagede game>] [--deel-minuten=10] [--seg=90]
//        [--seed=1] [--max-pogingen=8] [--stap=2] [--min-vrij-gb=60] [--alleen-analyse] [--opnieuw-analyse]
//
// Standaarduitvoer: ~/gde-qa/videoqa-<JJJJMMDD> (nooit de systeem-temp; een half uur 1080p is 1 tot 3 GB). Vóór elk deel controleert
// hij de vrije ruimte op de schijf van de uitvoer (standaard minstens 60 GB, zodat C: boven 50 GB blijft).
// In <out>: run-state.json (de stand, voor hervatten), deel-NN/ (opname, analyse.json, sheets/), samenvatting.json en rapport.html.
// Exitcodes: 0 doel gehaald en alles geanalyseerd, 1 niet af (opnieuw starten hervat), 3 geen slot, 5 te weinig schijfruimte.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

/** Hoeveel beelden een deel op schijf heeft (telemetrie, anders opname.json). */
export function deelBeelden(dir) {
  try { const o = JSON.parse(fs.readFileSync(path.join(dir, 'opname.json'), 'utf8')); if (Number.isFinite(o.frames)) return o.frames; } catch (e) { /* nog niet klaar */ }
  let n = 0;
  try { for (const f of fs.readdirSync(dir).filter((x) => /^tele-\d+\.json$/.test(x))) n += (JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).rows || []).length; } catch (e) { /* geen telemetrie */ }
  return n;
}

/** Puur: het volgende deel, of null als het doel gehaald is of er te vaak niets bijkwam. */
export function volgendDeel(state, { deelSeconden = 600, maxPogingen = 8 } = {}) {
  const opgenomen = state.delen.reduce((s, d) => s + (d.seconden || 0), 0);
  const rest = state.doelSeconden - opgenomen;
  if (rest <= 1) return null;
  if (state.delen.length >= maxPogingen) return null;
  const laatste2 = state.delen.slice(-2);
  if (laatste2.length === 2 && laatste2.every((d) => (d.seconden || 0) < 5)) return null; // twee keer niets: stoppen, niet eindeloos herstarten
  const nr = state.delen.length + 1;
  return { naam: `deel-${String(nr).padStart(2, '0')}`, seed: (state.seed || 1) + nr - 1, seconden: Math.min(rest, deelSeconden) };
}

const laadState = (f, init) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return init; } };
const bewaar = (f, s) => fs.writeFileSync(f, JSON.stringify(s, null, 1));
const nieuwste = (dir, re) => Math.max(0, ...fs.readdirSync(dir).filter((f) => re.test(f)).map((f) => fs.statSync(path.join(dir, f)).mtimeMs));

function node(script, args, log) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, [script, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env } });
    let staart = '';
    const lees = (b) => { const t = String(b); staart = (staart + t).slice(-4000); for (const r of t.split(/\r?\n/).filter(Boolean)) log(`  ${path.basename(script)}: ${r.slice(0, 220)}`); };
    c.stdout.on('data', lees); c.stderr.on('data', lees);
    c.on('close', (code) => resolve({ code, staart }));
    c.on('error', (e) => resolve({ code: 1, staart: e.message }));
  });
}

function vrijGB(dir) { try { const s = fs.statfsSync(dir); return (s.bavail * s.bsize) / 2 ** 30; } catch (e) { return Infinity; } }

async function main(argv) {
  const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const flag = (k) => argv.includes(`--${k}`);
  const minuten = Number(opt('minuten', 30));
  const datum = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const out = path.resolve(opt('out', path.join(os.homedir(), 'gde-qa', `videoqa-${datum}`)));
  try { R.assertNotSystemTemp(out); } catch (e) { console.error(e.message); return 2; }
  fs.mkdirSync(out, { recursive: true });
  const log = R.makeLog(out, 'pijplijn.log');
  const stateFile = path.join(out, 'run-state.json');
  const state = laadState(stateFile, { schema: 1, doelSeconden: Math.round(minuten * 60), seed: Number(opt('seed', 1)), begonnen: new Date().toISOString(), delen: [] });
  if (opt('minuten')) state.doelSeconden = Math.round(minuten * 60); // een nieuw doel bij hervatten mag (langer doorgaan)
  const fps = Number(opt('fps', 30));
  const deelSeconden = Math.round(Number(opt('deel-minuten', 10)) * 60);
  const minVrij = Number(opt('min-vrij-gb', 60));
  const gameDir = opt('game-dir', process.env.GDE_GAME_DIR || '');
  log(`video-QA: doel ${(state.doelSeconden / 60).toFixed(1)} min in delen van ${deelSeconden / 60} min; uitvoer ${out}`);
  const stopBeat = R.startHeartbeat(log, { status: () => `${state.delen.length} deel/delen, ${(state.delen.reduce((s, d) => s + (d.seconden || 0), 0) / 60).toFixed(1)} min opgenomen` });
  let code = 0;
  try {
    // 1. afgebroken delen (status bezig: de vorige run is gestopt) tellen mee met wat er op schijf staat
    for (const d of state.delen) if (d.status === 'bezig') { d.seconden = +(deelBeelden(path.join(out, d.naam)) / fps).toFixed(1); d.status = 'afgebroken'; log(`${d.naam} was afgebroken: ${d.seconden} s op schijf`); }
    bewaar(stateFile, state);

    // 2. opnemen tot het doel
    if (!flag('alleen-analyse')) {
      for (let d = volgendDeel(state, { deelSeconden, maxPogingen: Number(opt('max-pogingen', 8)) }); d; d = volgendDeel(state, { deelSeconden, maxPogingen: Number(opt('max-pogingen', 8)) })) {
        const vrij = vrijGB(out);
        if (vrij < minVrij) { log(`te weinig schijfruimte: ${vrij.toFixed(0)} GB vrij, minstens ${minVrij} GB nodig; gestopt (later hervatten)`); code = 5; break; }
        const deel = { ...d, status: 'bezig', start: new Date().toISOString() };
        state.delen.push(deel); bewaar(stateFile, state);
        log(`${deel.naam}: ${deel.seconden} s opnemen met seed ${deel.seed}`);
        const args = [`--out=${path.join(out, deel.naam)}`, `--seconds=${deel.seconden}`, `--seed=${deel.seed}`, `--seg=${opt('seg', 90)}`, `--fps=${fps}`, ...(gameDir ? [`--game-dir=${gameDir}`] : []), ...(opt('max-slots') ? [`--max-slots=${opt('max-slots')}`] : [])];
        const r = await node(path.join(HERE, 'opname.mjs'), args, log);
        deel.exit = r.code;
        deel.seconden = +(deelBeelden(path.join(out, deel.naam)) / fps).toFixed(1);
        deel.status = r.code === 0 ? 'klaar' : 'afgebroken';
        deel.einde = new Date().toISOString();
        bewaar(stateFile, state);
        log(`${deel.naam}: ${deel.status} (exit ${r.code}), ${deel.seconden} s`);
        if (r.code === 3) { log('geen Electron-slot: gestopt; hetzelfde commando hervat later'); code = 3; break; }
        if (r.code === 4 || r.code === 2) { log('Electron of game niet te starten: gestopt (zie ' + path.join(out, deel.naam, 'run.log') + ')'); code = 1; break; }
      }
    }

    // 3. analyse en contactvellen per deel (overslaan wat al klaar en nieuwer dan de opname is)
    for (const d of state.delen) {
      const dir = path.join(out, d.naam);
      if (!fs.existsSync(dir) || !fs.readdirSync(dir).some((f) => /^seg\d+\.mp4$/.test(f))) { d.analyse = 'geen opname'; continue; }
      const segT = nieuwste(dir, /^seg\d+\.mp4$/);
      const an = path.join(dir, 'analyse.json');
      if (flag('opnieuw-analyse') || !fs.existsSync(an) || fs.statSync(an).mtimeMs < segT) {
        log(`${d.naam}: analyse`);
        const r = await node(path.join(HERE, 'analyse.mjs'), [dir, `--fps=${fps}`], log);
        d.analyse = r.code === 0 ? 'klaar' : `fout (exit ${r.code})`;
        bewaar(stateFile, state);
        if (r.code !== 0) continue;
      } else d.analyse = 'klaar';
      const vellen = path.join(dir, 'sheets');
      if (flag('opnieuw-analyse') || !fs.existsSync(path.join(vellen, '.klaar')) || fs.statSync(path.join(vellen, '.klaar')).mtimeMs < fs.statSync(an).mtimeMs) {
        log(`${d.naam}: contactvellen`);
        fs.rmSync(vellen, { recursive: true, force: true });
        const r = await node(path.join(HERE, 'sheets.mjs'), [dir, `--step=${opt('stap', 2)}`], log);
        if (r.code === 0) fs.writeFileSync(path.join(vellen, '.klaar'), new Date().toISOString());
        d.vellen = r.code === 0 ? 'klaar' : `fout (exit ${r.code})`;
      } else d.vellen = 'klaar';
      bewaar(stateFile, state);
    }

    // 4. samenvatting en rapport (scripts/kwaliteit/eindrapport.mjs met alleen dit deel)
    const opgenomen = state.delen.reduce((s, d) => s + (d.seconden || 0), 0);
    const samen = { doelSeconden: state.doelSeconden, opgenomenSeconden: +opgenomen.toFixed(1), doelGehaald: opgenomen >= state.doelSeconden - 1, delen: state.delen, bijgewerkt: new Date().toISOString() };
    fs.writeFileSync(path.join(out, 'samenvatting.json'), JSON.stringify(samen, null, 1));
    const rr = await node(path.join(ROOT, 'scripts', 'kwaliteit', 'eindrapport.mjs'), [`--videoqa=${out}`, `--uit=${path.join(out, 'rapport.html')}`], log);
    log(`rapport: ${rr.code === 0 ? path.join(out, 'rapport.html') : 'niet gemaakt (exit ' + rr.code + ')'}`);
    if (!code && (!samen.doelGehaald || state.delen.some((d) => d.analyse !== 'klaar' && d.analyse !== 'geen opname'))) code = 1;
    log(`klaar: ${(opgenomen / 60).toFixed(1)} van ${(state.doelSeconden / 60).toFixed(1)} min${code ? ' (niet af: hetzelfde commando hervat)' : ''}`);
  } finally { stopBeat(); bewaar(stateFile, state); }
  return code;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e && e.stack || e); process.exit(1); });
