// Contactvellen van cutscenes in één webpagina (#1322): per cutscene één keyframe per shot, met ondertitel, spreker, camera, wie er in
// beeld is, het licht van het shot (#1323) en de lintvondsten (#1324) van dat shot. Zo kunnen de coördinator en agents een cutscene
// beoordelen zonder het spel te spelen; de eigenaar gebruikt zelf geen editor.
//
//   node scripts/cutscene_contactvel.mjs [--only=M16.outro,M22.4 | --set=regie] [--out=.contactvel] [--label=na]
//        [--electron | --schets]   standaard: Electron als er een slot vrij is en een gestagede game is, anders alleen schetsen
//        [--width=960]             breedte van de Electron-keyframes (16:9, JPEG)
//        [--html]                  alleen de webpagina opnieuw maken uit de runs in --out
//
// Uitvoer in <out>/:
//   index.html                     alle cutscenes van alle runs; twee runs (bijv. voor en na) staan per shot naast elkaar
//   runs/<label>/data.json         de metadata per shot
//   runs/<label>/schets/<id>/kNN.svg   een schets door de echte camera (pure bemonstering, scripts/lib/contactvel_schets.mjs): altijd, ook in CI
//   runs/<label>/foto/<id>/kNN.jpg     het echte beeld uit Electron (alleen met --electron)
// Electron (scripts/lib/electronrunner.cjs): --no-sandbox, een wegwerpprofiel in <out>, nooit een dialoog, alleen eigen PID's, en alleen
// als een slot in ~/gde-locks vrij is (geen wachtrij: anders worden het schetsen). De game komt uit GDE_GAME_DIR (gestaged, zie
// docs/TESTEN.md) en Electron uit ELECTRON_EXE of desktop/node_modules. Fps-metingen en de releasebouw blijven exclusief.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runLint } from './cutscene_lint.mjs';
import { sampleScene, shotsVan, shotType, inFrame, speakerActorId } from './lib/cutscene_lint.mjs';
import { schetsSvg, figureOf } from './lib/contactvel_schets.mjs';
import { describeLight } from '../game/js/shotlight.js';
import { propFoot } from '../game/js/cutscenemodels.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d = '') => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
export const safe = (id) => String(id).replace(/[^\w.-]/g, '_');
const AANKER = { x: 500, y: -300, facing: 1.1, z: 0 }; // dezelfde plek als de linter (scripts/lib/cutscene_lint.mjs)
const r2 = (v) => Math.round(v * 100) / 100;
const isOff = (l) => /^(radio|telefoon|app|voicemail)/.test(l.channel || '') || l.key === 'V';

// De twintig scènes van de regieronde (#1325): buiten akte 1 (die heeft zijn eigen branch), gekozen uit de verhaalspec:
// Jelle als tegenstander, de romance van Tammo en Tessa, de familie en de finale; F1 erbij op verzoek van de coördinator (24-11: camera achter de aanhanger).
export const REGIE_SET = ['M07.intro', 'M10.intro', 'M11.6', 'M14.intro', 'M14.outro', 'M16.outro', 'M17.outro', 'M20.3', 'M20.outro', 'M22.4',
  'M25.3', 'M25.outro', 'M26.5', 'M26.13', 'M26.outro', 'F1', 'F5', 'F6', 'M30.intro', 'M30.5', 'M30.outro'];

// De keyframes van een eenheid: één per shot, in het midden van het shot (of iets eerder als er daar een regel begint).
export function keyframesOf(unit, rapport = null) {
  const frames = sampleScene(unit);
  const shots = shotsVan(frames);
  const defShots = unit.def.shots || [];
  const names = {};
  for (const [id, a] of Object.entries(unit.def.actors || {})) names[id] = [].concat(a.speaker || [])[0] || id;
  return shots.map((sh, n) => {
    const t0 = sh.t0, t1 = n + 1 < shots.length ? shots[n + 1].t0 : unit.duration;
    let t = t0 + (t1 - t0) * 0.5;
    // een regel die in dit shot loopt: het keyframe valt in die regel (ondertitel en spreker horen bij het beeld)
    const regel = (unit.lines || []).find((l) => !isOff(l) && l.at < t1 - 0.2 && l.at + l.dur > t0 + 0.2);
    if (regel && !(t >= regel.at && t < regel.at + regel.dur)) t = Math.max(t0 + 0.1, Math.min(t1 - 0.1, regel.at + Math.min(1.2, regel.dur / 2)));
    t = Math.min(t, unit.duration - 0.06);
    const s = unit.scene.sample(t, AANKER);
    const line = (unit.lines || []).find((l) => t >= l.at && t < l.at + l.dur) || null;
    const speakerId = line && !isOff(line) ? speakerActorId(unit, line.speaker) : null;
    const inBeeld = Object.entries(s.actors).filter(([, a]) => a.visible !== false && inFrame(s.camera, { x: a.x, y: a.y, z: figureOf(a).head })).map(([id]) => id);
    const vondsten = rapport ? rapport.vondsten.filter((v) => !v.uitzondering && v.categorie !== 'smaak' && v.t != null && v.t >= t0 - 0.01 && v.t < t1 - 0.01).map((v) => ({ regel: v.regel, ernst: v.ernst, bericht: v.bericht })) : [];
    const c = s.camera;
    return {
      n, shot: sh.idx, t0: r2(t0), t1: r2(t1), t: r2(t), type: shotType(sh, defShots[sh.idx]), soort: (defShots[sh.idx] || {}).shot || '?',
      camera: { position: { x: r2(c.position.x - AANKER.x), y: r2(c.position.y - AANKER.y), z: r2(c.position.z) }, lookAt: { x: r2(c.lookAt.x - AANKER.x), y: r2(c.lookAt.y - AANKER.y), z: r2(c.lookAt.z) }, fov: r2(c.fov) },
      light: c.light || null, lightText: describeLight(c.light || null),
      line: line ? { speaker: line.speaker, text: line.text, channel: line.channel || null } : null, speakerId, inBeeld: inBeeld.map((id) => names[id] || id),
      vondsten, _sample: s, _names: names,
    };
  });
}

function schetsVoor(k) {
  const cam = k._sample.camera;
  return schetsSvg({ sample: k._sample, camera: cam, shot: { n: k.n, t: k.t, type: k.type }, light: k.light, footOf: propFoot, anchor: AANKER, speakerId: k.speakerId, line: k.line, flags: k.vondsten.filter((v) => v.ernst !== 'nit').map((v) => v.regel), names: k._names });
}

// ---------------------------------------------------------------- Electron

function electronKlaar() {
  let runner;
  try { runner = require('./lib/electronrunner.cjs'); } catch { return { ok: false, reden: 'electronrunner ontbreekt' }; }
  const game = process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game');
  if (!fs.existsSync(path.join(game, 'index.html'))) return { ok: false, reden: `geen gestagede game in ${game} (zet GDE_GAME_DIR)` };
  const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
  if (!fs.existsSync(electron)) return { ok: false, reden: `geen Electron in ${electron} (zet ELECTRON_EXE)` };
  // beeldruns: hooguit twee tegelijk (AGENTS.md); is er al meer dan één slot bezet, dan geen Electron (geen wachtrij)
  const bezet = runner.inspectSlots().filter((s) => s.held && !s.verdict.stale);
  if (bezet.length > 1) return { ok: false, reden: `${bezet.length} Electron-sloten in ~/gde-locks zijn bezet (${bezet.map((s) => s.verdict.reden).join('; ')})` };
  return { ok: true, runner, game, electron };
}

async function electronRun(items, runDir, { width, log }) {
  const ek = electronKlaar();
  if (!ek.ok) { log(`Electron overgeslagen: ${ek.reden}`); return { ok: false, reden: ek.reden, recs: {} }; }
  const { runner, game, electron } = ek;
  const work = path.join(runDir, '_electron');
  const { profile, tmp } = runner.prepareRunDir(work);
  const script = path.join(work, '_page.js');
  fs.writeFileSync(script, `window.__cv = ${JSON.stringify({ items, width, settle: 7000 })};\n` + fs.readFileSync(path.join(ROOT, 'scripts', 'ui', 'cutscene_contactvel.page.js'), 'utf8'));
  const recs = {};
  const env = runner.electronEnv({ profile, tmp, gameDir: game, extra: { GDE_NO_THROTTLE: '1' } });
  let res;
  try {
    res = await runner.runElectron({
      electron, cwd: path.join(ROOT, 'desktop'), env, out: work, slot: { label: 'contactvel', waitMin: 0.1, maxOthers: 1, pollMs: 2000 }, timeoutMin: 20 + items.reduce((s, i) => s + i.keys.length, 0) * 0.06,
      args: ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--smoke-test=${path.join(work, 'shots.png')}`, `--perf-script=${script}`],
    });
    try { Object.assign(recs, JSON.parse(res.perfScript || '{}').recs || {}); } catch (e) { log(`resultaat van de pagina onleesbaar: ${e.message}`); }
  } catch (e) { log(`Electron mislukt: ${e.message}`); runner.removeProfile(profile); return { ok: false, reden: e.message, recs }; }
  runner.removeProfile(profile);
  // de JPEG's per cutscene in foto/<id>/kNN.jpg
  for (const it of items) {
    const dir = path.join(runDir, 'foto', safe(it.id));
    fs.mkdirSync(dir, { recursive: true });
    for (const k of it.keys) {
      const bron = path.join(work, `cv__${safe(it.id)}__k${String(k.n).padStart(2, '0')}.jpg`);
      if (fs.existsSync(bron)) fs.renameSync(bron, path.join(dir, `k${String(k.n).padStart(2, '0')}.jpg`));
    }
  }
  log(`Electron: exit ${res.code} na ${res.minutes} min, ${Object.values(recs).reduce((s, l) => s + l.length, 0)} keyframes`);
  return { ok: res.code === 0 || Object.keys(recs).length > 0, recs };
}

// ---------------------------------------------------------------- webpagina

export function paginaHtml(runs) {
  const data = JSON.stringify(runs).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Contactvellen cutscenes</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;margin:0;background:#1d1f22;color:#e6e6e6}
header{padding:10px 16px;background:#111;position:sticky;top:0;z-index:2;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
header h1{font-size:17px;margin:0}header label{font-size:13px}
nav{position:fixed;top:48px;left:0;bottom:0;width:190px;overflow:auto;background:#17181a;font-size:12px;padding:6px}
nav a{display:block;color:#ccc;text-decoration:none;padding:2px 4px;border-radius:3px}nav a:hover{background:#333}
nav .v{color:#f07070}main{margin-left:200px;padding:8px 16px}
section{margin-bottom:28px}section h2{font-size:15px;margin:10px 0 4px}section .meta{font-size:12px;color:#aaa;margin-bottom:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.card{background:#26292d;border-radius:5px;padding:5px;cursor:pointer;border:2px solid transparent}.card.v{border-color:#c33}
.card .imgs{display:flex;gap:3px}.card .imgs figure{margin:0;flex:1;min-width:0}.card img{width:100%;display:block;border-radius:3px;background:#000}
.card figcaption{font-size:10px;color:#999;text-align:center}
.card .k{font-size:11.5px;margin-top:3px}.card .sub{font-size:11px;color:#cfcfcf;font-style:italic;margin-top:2px}.card .l{font-size:10.5px;color:#d9b76a}
.card .f{font-size:10.5px;color:#f08080}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.88);display:none;z-index:5;overflow:auto}#lb.open{display:block}
#lb .in{max-width:1500px;margin:20px auto;padding:0 16px}#lb .imgs{display:flex;gap:8px}#lb figure{margin:0;flex:1}#lb img{width:100%}
#lb table{font-size:13px;border-collapse:collapse;margin-top:8px}#lb td{padding:2px 10px 2px 0;vertical-align:top}#lb td:first-child{color:#999}
#lb .x{float:right;font-size:22px;cursor:pointer}
</style></head><body>
<header><h1>Contactvellen cutscenes</h1><span id="info"></span>
<label><input type="checkbox" id="foto" checked> echt beeld (als het er is)</label>
<label><input type="checkbox" id="vglk" checked> runs naast elkaar</label>
<label>alleen met vondsten <input type="checkbox" id="alleenV"></label></header>
<nav id="nav"></nav><main id="main"></main>
<div id="lb"><div class="in" id="lbin"></div></div>
<script>
const RUNS = ${data};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ids = []; for (const r of RUNS) for (const c of r.cutscenes) if (!ids.includes(c.id)) ids.push(c.id);
const van = (run, id) => run.cutscenes.find((c) => c.id === id);
const safe = (id) => String(id).replace(/[^\\w.-]/g, '_');
const pad = (n) => String(n).padStart(2, '0');
function beeld(run, c, k) {
  const foto = $('#foto').checked && run.foto && run.foto[c.id] && run.foto[c.id].includes(k.n);
  return 'runs/' + run.label + '/' + (foto ? 'foto/' + safe(c.id) + '/k' + pad(k.n) + '.jpg' : 'schets/' + safe(c.id) + '/k' + pad(k.n) + '.svg');
}
function teken() {
  const naast = $('#vglk').checked && RUNS.length > 1;
  const runs = naast ? RUNS : [RUNS[RUNS.length - 1]];
  $('#info').textContent = RUNS.map((r) => r.label + ' (' + r.gemaakt + ', ' + r.cutscenes.length + ' cutscenes' + (r.foto ? ', met Electron' : ', schets') + ')').join(' · ');
  const nav = [], main = [];
  for (const id of ids) {
    const na = van(runs[runs.length - 1], id) || van(runs[0], id);
    const nV = na.keys.reduce((s, k) => s + k.vondsten.length, 0);
    if ($('#alleenV').checked && !nV) continue;
    nav.push('<a href="#' + esc(safe(id)) + '" class="' + (nV ? 'v' : '') + '">' + esc(id) + (nV ? ' (' + nV + ')' : '') + '</a>');
    const cards = na.keys.map((k) => {
      const imgs = runs.map((r) => { const c = van(r, id); const kk = c && c.keys.find((q) => q.n === k.n); return kk ? '<figure><img loading="lazy" src="' + beeld(r, c, kk) + '">' + (naast ? '<figcaption>' + esc(r.label) + '</figcaption>' : '') + '</figure>' : '<figure><figcaption>' + esc(r.label) + ': geen shot ' + k.n + '</figcaption></figure>'; }).join('');
      return '<div class="card' + (k.vondsten.length ? ' v' : '') + '" data-id="' + esc(id) + '" data-n="' + k.n + '"><div class="imgs">' + imgs + '</div>'
        + '<div class="k">#' + k.n + ' · ' + k.t.toFixed(1) + ' s · ' + esc(k.type) + ' · lens ' + Math.round(k.camera.fov) + (k.line ? ' · <b>' + esc(k.line.speaker) + '</b>' : '') + '</div>'
        + (k.line ? '<div class="sub">' + esc(k.line.text) + '</div>' : '') + '<div class="l">' + esc(k.lightText) + '</div>'
        + k.vondsten.map((v) => '<div class="f">' + esc(v.regel) + ' ' + esc(v.bericht) + '</div>').join('') + '</div>';
    }).join('');
    main.push('<section id="' + esc(safe(id)) + '"><h2>' + esc(id) + ' · ' + esc(na.titel || '') + '</h2><div class="meta">akte ' + (na.akte || '?') + ' · ' + na.duur.toFixed(1) + ' s · ' + na.keys.length + ' shots · score ' + (na.score ?? '?') + (na.sprekers ? ' · ' + esc(na.sprekers.join(', ')) : '') + '</div><div class="grid">' + cards + '</div></section>');
  }
  $('#nav').innerHTML = nav.join(''); $('#main').innerHTML = main.join('');
}
function open(id, n) {
  const rows = RUNS.map((r) => { const c = van(r, id); const k = c && c.keys.find((q) => q.n === n); return { r, c, k }; }).filter((x) => x.k);
  const k = rows[rows.length - 1].k;
  const pos = (p) => p.x.toFixed(2) + ', ' + p.y.toFixed(2) + ', ' + p.z.toFixed(2);
  $('#lbin').innerHTML = '<span class="x" onclick="document.getElementById(\\'lb\\').classList.remove(\\'open\\')">×</span><h2>' + esc(id) + ' shot ' + n + '</h2><div class="imgs">'
    + rows.map((x) => '<figure><img src="' + beeld(x.r, x.c, x.k) + '"><figcaption>' + esc(x.r.label) + '</figcaption></figure>').join('') + '</div><table>'
    + '<tr><td>tijd</td><td>' + k.t.toFixed(2) + ' s (shot ' + k.t0.toFixed(1) + ' tot ' + k.t1.toFixed(1) + ' s)</td></tr>'
    + '<tr><td>shot</td><td>' + esc(k.type) + ' (' + esc(k.soort) + '), lens ' + k.camera.fov + '°</td></tr>'
    + '<tr><td>camera</td><td>' + pos(k.camera.position) + ' → ' + pos(k.camera.lookAt) + ' (lokaal, m)</td></tr>'
    + '<tr><td>in beeld</td><td>' + esc(k.inBeeld.join(', ') || 'niemand') + '</td></tr>'
    + '<tr><td>spreker</td><td>' + (k.line ? esc(k.line.speaker) + ': ' + esc(k.line.text) : '-') + '</td></tr>'
    + '<tr><td>licht</td><td>' + esc(k.lightText) + '</td></tr>'
    + rows.filter((x) => x.k.electron).map((x) => '<tr><td>Electron (' + esc(x.r.label) + ')</td><td>' + esc(JSON.stringify(x.k.electron)) + '</td></tr>').join('')
    + '<tr><td>vondsten</td><td>' + (k.vondsten.map((v) => esc(v.ernst + ' ' + v.regel + ': ' + v.bericht)).join('<br>') || 'geen') + '</td></tr></table>';
  $('#lb').classList.add('open');
}
document.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) open(c.dataset.id, Number(c.dataset.n)); else if (e.target.id === 'lb') $('#lb').classList.remove('open'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#lb').classList.remove('open'); });
for (const s of ['#foto', '#vglk', '#alleenV']) $(s).addEventListener('change', teken);
teken();
</script></body></html>
`;
}

function leesRuns(out) {
  const dir = path.join(out, 'runs');
  if (!fs.existsSync(dir)) return [];
  const runs = fs.readdirSync(dir).map((l) => path.join(dir, l, 'data.json')).filter((p) => fs.existsSync(p)).map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
  // 'voor' altijd eerst, 'na' altijd laatst; de rest op datum
  const orde = (r) => (r.label === 'voor' ? 0 : r.label === 'na' ? 2 : 1);
  return runs.sort((a, b) => orde(a) - orde(b) || String(a.gemaakt).localeCompare(String(b.gemaakt)));
}

export function schrijfPagina(out) {
  const runs = leesRuns(out);
  fs.writeFileSync(path.join(out, 'index.html'), paginaHtml(runs));
  return runs.length;
}

// ---------------------------------------------------------------- hoofdprogramma

async function main() {
  const OUT = path.resolve(String(arg('out', path.join(ROOT, '.contactvel'))));
  const log = (t) => console.log(`contactvel: ${t}`);
  if (arg('html')) { const n = schrijfPagina(OUT); log(`${n} run(s) -> ${path.join(OUT, 'index.html')}`); return 0; }
  const label = safe(String(arg('label', 'na')));
  const only = arg('set') === 'regie' ? REGIE_SET : String(arg('only', '')).split(',').filter(Boolean);
  const { rapporten, data } = await runLint();
  const rapVan = new Map(rapporten.map((r) => [r.id, r]));
  const units = data.units.filter((u) => u.scene && u.def && u.lines && u.lines.length && (!only.length || only.some((o) => u.id === o)));
  if (only.length) for (const o of only) if (!units.some((u) => u.id === o)) log(`onbekende of ongeregisseerde cutscene: ${o}`);
  if (!units.length) { log('geen cutscenes'); return 2; }
  const runDir = path.join(OUT, 'runs', label);
  fs.rmSync(runDir, { recursive: true, force: true });
  fs.mkdirSync(runDir, { recursive: true });
  const run = { label, gemaakt: new Date().toISOString().slice(0, 16).replace('T', ' '), commit: '', cutscenes: [], foto: null };
  { const g = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }); run.commit = g.status === 0 ? g.stdout.trim() : ''; }
  const items = [];
  for (const u of units) {
    const keys = keyframesOf(u, rapVan.get(u.id));
    const dir = path.join(runDir, 'schets', safe(u.id));
    fs.mkdirSync(dir, { recursive: true });
    for (const k of keys) fs.writeFileSync(path.join(dir, `k${String(k.n).padStart(2, '0')}.svg`), schetsVoor(k));
    const r = rapVan.get(u.id);
    run.cutscenes.push({ id: u.id, titel: r ? r.titel : '', akte: u.act, duur: r2(u.duration), score: r ? r.score : null, sprekers: [...new Set(u.lines.map((l) => l.speaker))], keys: keys.map(({ _sample, _names, ...k }) => k) });
    items.push({ id: u.id, keys: keys.map((k) => ({ n: k.n, t: k.t })) });
  }
  const wilElectron = arg('electron') ? true : arg('schets') ? false : 'auto';
  if (wilElectron) {
    const e = await electronRun(items, runDir, { width: Number(arg('width', 960)) || 960, log });
    if (e.ok) {
      run.foto = {};
      for (const c of run.cutscenes) {
        const dir = path.join(runDir, 'foto', safe(c.id));
        run.foto[c.id] = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => Number((/^k(\d+)\.jpg$/.exec(f) || [])[1])).filter(Number.isFinite) : [];
        for (const rec of e.recs[c.id] || []) { const k = c.keys.find((q) => q.n === rec.n); if (k) k.electron = { near: rec.near, blocked: rec.blocked, light: rec.light }; }
      }
    } else if (wilElectron === true) { log('Electron gevraagd maar niet gelukt; alleen schetsen'); }
  }
  fs.writeFileSync(path.join(runDir, 'data.json'), JSON.stringify(run, null, 1) + '\n');
  const n = schrijfPagina(OUT);
  const shots = run.cutscenes.reduce((s, c) => s + c.keys.length, 0);
  log(`${run.cutscenes.length} cutscenes, ${shots} shots (${run.foto ? 'met Electron-beeld' : 'schetsen'}), run '${label}'; ${n} run(s) in ${path.join(OUT, 'index.html')}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(2); });
}
