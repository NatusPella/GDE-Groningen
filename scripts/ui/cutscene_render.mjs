// Gerenderde cutscene-controle (laag 3 van het cutscene-kwaliteitssysteem, docs/CUTSCENE-REGIE-21-11.md).
// Speelt elke geregisseerde cutscene in Electron af (het bestaande --perf-script-pad van scripts/qa/cutscene_shots.mjs) en neemt per
// shot drie frames: begin, midden, eind. Daarna meet de node-kant ze (scripts/lib/cutscene_measure.mjs): zwart of leeg beeld, camera in
// geometrie, spreker in beeld (projectie), ondertitel over spreker of HUD, luminantiesprong tussen shots, bevroren of NaN-camera.
// Uitvoer per cutscene in <out>/<id>/: de frames (sNNb|m|e.png), measure.json, vision/contact/blad-NN.png (rasters: rij = shot,
// kolom = begin/midden/eind) voor laag 4; en <out>/render-report.json met alle vondsten.
//
//   node scripts/ui/cutscene_render.mjs [--out=docs/beeld-21-11/cutscenes] [--only=M01,M02.intro] [--spot=x,y,hoek] [--settle=<ms>]
//        [--simulate]            geen Electron: alleen de pure projectiemetingen op de bemonsterde scènes (geen pixels)
//        [--analyse=<runmap>]    een eerdere run opnieuw beoordelen (records.json + frames in <runmap>)
//        [--strict]              exit 1 bij een blokkerende vondst
// Electron: `cd desktop && npm run stage`; ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt. Eén instantie, wegwerpprofiel,
// sluit zichzelf af (AGENTS.md); fps-metingen en de releasebouw blijven exclusief. De coördinator draait dit, niet de agent.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../lib/pngcheck.mjs';
import { writeContactSheets } from '../release/contactsheet.mjs';
import { lumaStats, analyseRecords, simulateRecords } from '../lib/cutscene_measure.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d = '') => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
const safe = (id) => String(id).replace(/[^\w.-]/g, '_');

// Records + de PNG's van de run -> pixelmetingen, vondsten en contactbladen per cutscene.
// recordsById: { id: [record...] }; frameDir: map met <safe(id)>__sNNx.png (of al per cutscene gesorteerd); outDir: doelmap.
export function verwerk(recordsById, { frameDir = null, outDir, w = 1600, h = 900, bladen = true } = {}) {
  const rapport = { cutscenes: {}, totaal: { blokkerend: 0, belangrijk: 0, nit: 0, frames: 0, cutscenes: 0 } };
  for (const [id, records] of Object.entries(recordsById)) {
    const dir = path.join(outDir, safe(id));
    fs.mkdirSync(dir, { recursive: true });
    const paden = [];
    for (const r of records) {
      const kort = `s${String(r.n ?? r.shot).padStart(2, '0')}${r.phase}.png`;
      const bron = frameDir && r.file ? path.join(frameDir, `shots-${r.file}.png`) : null;
      const doel = path.join(dir, kort);
      if (bron && fs.existsSync(bron)) { fs.copyFileSync(bron, doel); }
      if (fs.existsSync(doel)) {
        try { const png = decodePng(fs.readFileSync(doel)); r.pixels = lumaStats(png.rgba, png.w, png.h); r.beeld = { w: png.w, h: png.h }; }
        catch (e) { r.pixels = null; r.beeldfout = e.message; }
        paden.push({ pad: doel, label: `${id} shot ${r.shot} ${r.phase === 'b' ? 'begin' : r.phase === 'e' ? 'eind' : 'midden'} (${Number(r.t).toFixed(1)} s)` });
      }
    }
    const vondsten = analyseRecords(id, records, { w, h });
    let bladenInfo = [];
    if (bladen && paden.length) {
      try { bladenInfo = writeContactSheets(paden, dir, { cols: 3, rows: 3 }).sheets.map((s) => ({ naam: s.naam, labels: s.labels })); } catch (e) { bladenInfo = [{ fout: e.message }]; }
    }
    const per = { blokkerend: 0, belangrijk: 0, nit: 0 };
    for (const v of vondsten) per[v.ernst]++;
    fs.writeFileSync(path.join(dir, 'measure.json'), JSON.stringify({ cutscene: id, frames: records.length, ...per, bladen: bladenInfo, vondsten, records: records.map((r) => ({ ...r, pixels: r.pixels ? { mean: +r.pixels.mean.toFixed(1), std: +r.pixels.std.toFixed(1), dark: +r.pixels.dark.toFixed(3), bright: +r.pixels.bright.toFixed(3) } : null })) }, null, 1) + '\n');
    rapport.cutscenes[id] = { frames: records.length, ...per, vondsten, bladen: bladenInfo.length };
    for (const k of Object.keys(per)) rapport.totaal[k] += per[k];
    rapport.totaal.frames += records.length;
    rapport.totaal.cutscenes++;
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'render-report.json'), JSON.stringify({ gemaakt: new Date().toISOString().slice(0, 10), ...rapport }, null, 1) + '\n');
  return rapport;
}

// De [cs-rec]-regels uit de uitvoer van de pagina: { id: [record] }
export function parseRecords(stdout) {
  const out = {};
  for (const l of String(stdout).split('\n')) {
    const m = l.match(/^\[cs-rec\] (\S+) (.*)$/);
    if (!m) continue;
    try { (out[m[1]] = out[m[1]] || []).push(JSON.parse(m[2])); } catch { /* ingekorte regel: overslaan */ }
  }
  return out;
}

async function main() {
  const OUT = path.resolve(String(arg('out', path.join(ROOT, 'docs', 'beeld-21-11', 'cutscenes'))));
  const ONLY = String(arg('only', '')).split(',').filter(Boolean);
  const strict = !!arg('strict');
  const klaar = (rapport) => {
    const t = rapport.totaal;
    console.log(`cutscene_render: ${t.cutscenes} cutscenes, ${t.frames} frames, ${t.blokkerend} blokkerend, ${t.belangrijk} belangrijk, ${t.nit} nit; uitvoer ${OUT}`);
    return strict && t.blokkerend ? 1 : 0;
  };

  if (arg('analyse')) {
    const run = path.resolve(String(arg('analyse')));
    const recs = JSON.parse(fs.readFileSync(path.join(run, 'records.json'), 'utf8'));
    return klaar(verwerk(recs, { frameDir: run, outDir: OUT }));
  }

  if (arg('simulate')) {
    const { loadUnits } = await import('../lib/cutscene_data.mjs');
    const { units } = await loadUnits();
    const recs = {};
    for (const u of units) { if (ONLY.length && !ONLY.some((o) => u.id === o || u.id.startsWith(o))) continue; const r = simulateRecords(u); if (r.length) recs[u.id] = r; }
    return klaar(verwerk(recs, { outDir: OUT, bladen: false }));
  }

  // --- Electron
  const SETTLE = Number(arg('settle', 8000));
  const SPOT = String(arg('spot', ''));
  const run = path.join(OUT, '_run');
  fs.mkdirSync(run, { recursive: true });
  const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
    + `for (let i = 0; i < 120; i++) { if (document.body.classList.contains('game-started')) break; const w = window.__debug && window.__debug.world; if (w && w.paused) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } } await new Promise((r) => setTimeout(r, 500)); }
await new Promise((r) => setTimeout(r, 4000));\n`;
  const profile = path.join(run, `profiel-${process.pid}`);
  fs.mkdirSync(profile, { recursive: true });
  const script = path.join(run, '_page.js');
  const cr = { only: ONLY, settle: SETTLE, spot: SPOT ? (([x, y, a]) => ({ x, y, a: a || 0 }))(SPOT.split(',').map(Number)) : undefined };
  fs.writeFileSync(script, WACHT + `window.__cr = ${JSON.stringify(cr)};\n` + fs.readFileSync(path.join(HERE, 'cutscene_render.page.js'), 'utf8'));
  const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  const r = spawnSync(electron, ['.', ...(process.env.GDE_EXTRA_FLAGS ? process.env.GDE_EXTRA_FLAGS.split(' ') : []), '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900', `--smoke-test=${path.join(run, 'shots.png')}`, `--perf-script=${script}`],
    { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 29, timeout: 120 * 60 * 1000, killSignal: 'SIGKILL' });
  if (r.error) console.error('Electron starten mislukt:', r.error.message);
  fs.writeFileSync(path.join(run, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const recs = parseRecords(r.stdout);
  if (!Object.keys(recs).length) { console.error(`geen records uit Electron (exit ${r.status}); zie ${path.join(run, 'run.log')}`); return 1; }
  fs.writeFileSync(path.join(run, 'records.json'), JSON.stringify(recs));
  const rapport = verwerk(recs, { frameDir: run, outDir: OUT });
  // de losse run-frames mogen weg zodra ze per cutscene staan
  for (const f of fs.readdirSync(run)) if (/^shots-.*\.png$/.test(f)) fs.rmSync(path.join(run, f), { force: true });
  return klaar(rapport);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
}
