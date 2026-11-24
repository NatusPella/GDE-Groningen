// Beeldregressie op vaste camerapunten (kwaliteitsmachine, docs/KWALITEITSMACHINE.md): stad, Grote Markt, Martinitoren,
// het appartement van Tammo en Tessa, garage, kaart, HUD tijdens het rijden, minikaart, laadscherm en twee filmpjesbeelden,
// op 1920x1080, deterministisch (vaste seed, klok, weer en tijdstap). Vergelijkt perceptueel (scripts/kwaliteit/perceptdiff.mjs)
// met referentiebeelden BUITEN git en maakt één HTML-pagina met voor/na/diff per punt.
//
//   node scripts/kwaliteit/beeldregressie.mjs --lijst
//   node scripts/kwaliteit/beeldregressie.mjs --run --out=<map> [--only=a,b] [--game-dir=<gestagede game>] [--geen-vergelijk] [--url-flags=perfoff=x]
//   node scripts/kwaliteit/beeldregressie.mjs --vergelijk --out=<map> [--ref=<map>] [--streng]
//   node scripts/kwaliteit/beeldregressie.mjs --ververs --out=<map> [--only=a,b] [--ref=<map>]
//
// Referenties: --ref, anders GDE_BEELDREF, anders ~/gde-beeldreferentie/camerapunten/<formaat>/ (nooit in git: 11 PNG's van
// 1920x1080 zijn samen ~30 MB per ververs). Alleen --ververs schrijft daar, met bron.json (datum, commit, punten).
// Uitvoer van een run in <out>: nieuw/<id>.png (+ camerapunten.json van de pagina), ref/<id>.png (kopie voor het rapport),
// diff/<id>.png, vergelijking.json en rapport.html. Electron via scripts/lib/electronrunner.cjs (slot, hartslag, --no-sandbox).
// Exitcodes: 0 alles binnen de drempel, 1 afwijking of fout, 2 verkeerd gebruik, 3 geen slot, 4 Electron niet te starten.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import R from '../lib/electronrunner.cjs';
import { decodePng, encodePng } from '../lib/pngdiff.mjs';
import { vergelijkPerceptueel, oordeel, diffBeeld, STANDAARD_DREMPEL } from './perceptdiff.mjs';
import { esc, rel, badge, pagina } from './html.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const PUNTEN_BESTAND = path.join(HERE, 'camerapunten.json');
export const laadPunten = (f = PUNTEN_BESTAND) => JSON.parse(fs.readFileSync(f, 'utf8'));
export const refMap = (cfg, ref = null) => path.resolve(ref || process.env.GDE_BEELDREF || path.join(os.homedir(), 'gde-beeldreferentie', 'camerapunten', cfg.formaat || '1920x1080'));

/**
 * Vergelijkt <nieuwMap>/<id>.png met <refMap>/<id>.png voor alle punten. Schrijft diffbeelden naar diffMap (als gegeven).
 * Geeft { rijen, afwijkend, nieuw, ontbreekt, fouten } met per rij { id, titel, staat, ssim, aandeelSlecht, redenen, drempel, regio }.
 * staat: gelijk | afwijking | geen-referentie | ontbreekt (geen nieuw beeld) | fout (de pagina meldde een fout).
 */
export function vergelijkRun({ cfg, nieuwMap, refDir, diffMap = null, paginaUit = null }) {
  const rijen = [];
  const standaard = { ...STANDAARD_DREMPEL, ...(cfg.standaardDrempel || {}) };
  const gemeld = paginaUit && paginaUit.punten ? paginaUit.punten : {};
  for (const p of cfg.punten) {
    const drempel = { ...standaard, ...(p.drempel || {}) };
    const rij = { id: p.id, titel: p.titel || p.id, soort: p.soort, drempel };
    const nieuwPad = path.join(nieuwMap, `${p.id}.png`), refPad = path.join(refDir, `${p.id}.png`);
    const pg = gemeld[p.id];
    if (pg && pg.ok === false) { rijen.push({ ...rij, staat: 'fout', redenen: [pg.fout || 'fout in de pagina'] }); continue; }
    if (!fs.existsSync(nieuwPad)) { rijen.push({ ...rij, staat: 'ontbreekt', redenen: ['geen nieuw beeld'] }); continue; }
    if (!fs.existsSync(refPad)) { rijen.push({ ...rij, staat: 'geen-referentie', redenen: ['nog geen referentie (--ververs na keuring)'] }); continue; }
    const regio = p.regio || (pg && pg.regio) || null;
    const nieuw = decodePng(fs.readFileSync(nieuwPad)), ref = decodePng(fs.readFileSync(refPad));
    const r = vergelijkPerceptueel(ref, nieuw, { regio, maskers: p.maskers || [], blokSsim: drempel.blokSsim, blokKleur: drempel.blokKleur });
    const o = oordeel(r, drempel);
    if (diffMap && r.gelijkMaat) { fs.mkdirSync(diffMap, { recursive: true }); fs.writeFileSync(path.join(diffMap, `${p.id}.png`), encodePng(diffBeeld(nieuw, r, { regio }))); }
    rijen.push({ ...rij, staat: o.ok ? 'gelijk' : 'afwijking', ssim: +r.ssim.toFixed(4), aandeelSlecht: +r.aandeelSlecht.toFixed(4), maxKleur: +r.maxKleur.toFixed(1), redenen: o.redenen, regio, maat: [nieuw.w, nieuw.h] });
  }
  const tel = (s) => rijen.filter((r) => r.staat === s).length;
  return { rijen, afwijkend: tel('afwijking'), nieuw: tel('geen-referentie'), ontbreekt: tel('ontbreekt'), fouten: tel('fout') };
}

const STAAT_BADGE = { gelijk: ['ok', 'binnen drempel'], afwijking: ['fout', 'afwijking'], 'geen-referentie': ['nieuw', 'geen referentie'], ontbreekt: ['fout', 'geen beeld'], fout: ['fout', 'fout in de run'] };

/** Eén HTML-pagina met per punt referentie, nieuw beeld en diff (relatieve links). */
export function rapportHtml({ out, v, cfg, refDir, meta = {} }) {
  const img = (map, id, wat) => { const f = path.join(out, map, `${id}.png`); return fs.existsSync(f) ? `<figure><a href="${rel(out, f)}"><img loading="lazy" src="${rel(out, f)}" alt="${esc(wat)} ${esc(id)}"></a><figcaption>${esc(wat)}</figcaption></figure>` : `<figure><figcaption>${esc(wat)}: geen beeld</figcaption></figure>`; };
  const kop = `<h1>Beeldregressie camerapunten</h1>
<p class="meta">${esc(meta.datum || new Date().toISOString().slice(0, 16).replace('T', ' '))} &middot; commit ${esc(meta.commit || '?')} &middot; ${esc(cfg.formaat)} &middot; seed ${esc(cfg.seed)}, klok ${esc(cfg.klok)}, weer ${esc(cfg.weer)} &middot; referentie: <code>${esc(refDir)}</code>${meta.refBron ? ` (gemaakt ${esc(meta.refBron.datum)}, commit ${esc(meta.refBron.commit)})` : ''}</p>
<p>${badge(v.afwijkend || v.ontbreekt || v.fouten ? 'fout' : 'ok', `${v.afwijkend} afwijkend`)} ${badge('nieuw', `${v.nieuw} zonder referentie`)} ${v.ontbreekt ? badge('fout', `${v.ontbreekt} zonder beeld`) : ''} ${v.fouten ? badge('fout', `${v.fouten} fout`) : ''} <span class="meta">Diff: rood = blok onder de blok-SSIM of boven het kleurverschil, oranje = twijfel, blauw = masker.</span></p>
<table><tr><th>punt</th><th>staat</th><th>SSIM</th><th>slechte blokken</th><th>drempel</th><th>waarom</th></tr>
${v.rijen.map((r) => `<tr><td><a href="#${esc(r.id)}">${esc(r.id)}</a></td><td>${badge(...(STAAT_BADGE[r.staat] || ['let', r.staat]))}</td><td>${r.ssim ?? ''}</td><td>${r.aandeelSlecht !== undefined ? (r.aandeelSlecht * 100).toFixed(1) + '%' : ''}</td><td class="klein">SSIM &ge; ${r.drempel.minSsim}, &le; ${(r.drempel.maxSlecht * 100).toFixed(1)}%</td><td class="klein">${esc((r.redenen || []).join('; '))}</td></tr>`).join('\n')}
</table>`;
  const punten = v.rijen.map((r) => `<div class="punt" id="${esc(r.id)}"><h3>${esc(r.titel)} ${badge(...(STAAT_BADGE[r.staat] || ['let', r.staat]))}</h3>
<p class="meta klein">${esc(r.id)} &middot; ${esc(r.soort)}${r.regio ? ' &middot; regio ' + esc(JSON.stringify(r.regio)) : ''}${r.maat ? ' &middot; ' + r.maat.join('x') : ''}</p>
<div class="drie">${img('ref', r.id, 'referentie (voor)')}${img('nieuw', r.id, 'nieuw (na)')}${img('diff', r.id, 'diff')}</div></div>`).join('\n');
  return pagina('Beeldregressie camerapunten', kop + '\n<h2>Per punt</h2>\n' + punten);
}

function gitCommit() { const r = spawnSync('git', ['rev-parse', '--short=10', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : '?'; }

/** --vergelijk: diff, kopie van de referenties, vergelijking.json en rapport.html. Geeft het resultaat. */
export function vergelijkEnRapporteer({ out, cfg, refDir }) {
  const nieuwMap = path.join(out, 'nieuw');
  let paginaUit = null;
  try { paginaUit = JSON.parse(fs.readFileSync(path.join(nieuwMap, 'camerapunten.json'), 'utf8')); } catch (e) { /* geen paginaverslag */ }
  for (const d of ['diff', 'ref']) fs.rmSync(path.join(out, d), { recursive: true, force: true });
  const v = vergelijkRun({ cfg, nieuwMap, refDir, diffMap: path.join(out, 'diff'), paginaUit });
  fs.mkdirSync(path.join(out, 'ref'), { recursive: true });
  for (const p of cfg.punten) { const f = path.join(refDir, `${p.id}.png`); if (fs.existsSync(f)) fs.copyFileSync(f, path.join(out, 'ref', `${p.id}.png`)); }
  let refBron = null;
  try { refBron = JSON.parse(fs.readFileSync(path.join(refDir, 'bron.json'), 'utf8')); } catch (e) { /* geen bron */ }
  const meta = { datum: new Date().toISOString().slice(0, 16).replace('T', ' '), commit: gitCommit(), refBron };
  fs.writeFileSync(path.join(out, 'vergelijking.json'), JSON.stringify({ ...meta, refDir, ...v }, null, 1));
  fs.writeFileSync(path.join(out, 'rapport.html'), rapportHtml({ out, v, cfg, refDir, meta }));
  return v;
}

async function main(argv) {
  const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const flag = (k) => argv.includes(`--${k}`);
  const cfg = laadPunten(opt('punten') ? path.resolve(opt('punten')) : PUNTEN_BESTAND);
  const only = (opt('only', '') || '').split(',').filter(Boolean);
  const refDir = refMap(cfg, opt('ref'));
  if (flag('lijst')) { for (const p of cfg.punten) console.log(`${p.id.padEnd(20)} ${p.soort.padEnd(11)} ${p.titel}`); console.log(`referenties: ${refDir}`); return 0; }
  if (!opt('out')) { console.error('geef --out=<map> (niet in de systeem-temp)'); return 2; }
  const out = path.resolve(opt('out'));

  if (flag('run')) {
    let dirs;
    try { dirs = R.prepareRunDir(out); } catch (e) { console.error(e.message); return 2; }
    const log = R.makeLog(out, 'run.log');
    const nieuwMap = path.join(out, 'nieuw');
    fs.rmSync(nieuwMap, { recursive: true, force: true }); fs.mkdirSync(nieuwMap, { recursive: true });
    const gameDir = path.resolve(opt('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
    if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir} (--game-dir= of GDE_GAME_DIR)`); return 2; }
    let electron;
    try { electron = R.findElectron(ROOT); } catch (e) { log(e.message); return 4; }
    const kp = { punten: cfg.punten, only, klok: cfg.klok, weer: cfg.weer, naSettle: cfg.naSettle };
    const lib = fs.readFileSync(path.join(ROOT, 'scripts', 'trailer', 'lib', 'clip.page.js'), 'utf8');
    const page = fs.readFileSync(path.join(HERE, 'camerapunten.page.js'), 'utf8');
    const script = path.join(out, '_page.js');
    fs.writeFileSync(script, `window.__kp = ${JSON.stringify(kp)};\n${lib}\n${page}\nreturn await kpMain();\n`);
    const args = ['.', `--smoke-test=${path.join(out, '_smoke.png')}`, `--perf-script=${script}`, `--autoplay=${cfg.seed || 7}`, '--stil',
      '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
      `--clip=${nieuwMap}`, `--clip-size=${cfg.formaat || '1920x1080'}`, `--preset=${cfg.preset}`, ...(opt('url-flags') ? [`--url-flags=${opt('url-flags')}`] : [])];
    const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NIEUW_VERHAAL: '1' } });
    delete env.GDE_MENU_TEST;
    try {
      const r = await R.runElectron({ electron, args, cwd: path.join(ROOT, 'desktop'), env, out, log, slot: { label: 'beeldregressie', maxOthers: Number(opt('max-slots', 1)), waitMin: Number(opt('slot-wacht-min', 120)) }, timeoutMin: Number(opt('limiet-min', 40)), status: () => `${fs.readdirSync(nieuwMap).filter((f) => f.endsWith('.png')).length} beeld(en)` });
      R.removeProfile(dirs.profile);
      log(`pagina: ${r.perfScript || 'geen resultaat'}`);
      if (r.code !== 0 && !fs.existsSync(path.join(nieuwMap, 'camerapunten.json'))) log(`let op: Electron stopte met ${r.code}${r.sandbox ? ' (sandbox, zie hierboven)' : ''} zonder paginaverslag`);
    } catch (e) { log('fout: ' + e.message); return e.code && e.code.startsWith('SLOT') ? 3 : e.code === 'START' ? 4 : 1; }
    if (flag('geen-vergelijk')) return 0;
  }
  if (flag('run') || flag('vergelijk')) {
    const v = vergelijkEnRapporteer({ out, cfg, refDir });
    for (const r of v.rijen) console.log(`${r.id.padEnd(20)} ${r.staat.padEnd(16)} ${r.ssim !== undefined ? 'SSIM ' + r.ssim + ', ' + (r.aandeelSlecht * 100).toFixed(1) + '% slecht' : ''} ${(r.redenen || []).join('; ')}`);
    console.log(`rapport: ${path.join(out, 'rapport.html')}`);
    return v.afwijkend || v.ontbreekt || v.fouten || (flag('streng') && v.nieuw) ? 1 : 0;
  }
  if (flag('ververs')) {
    const nieuwMap = path.join(out, 'nieuw');
    fs.mkdirSync(refDir, { recursive: true });
    const gezet = [];
    for (const p of cfg.punten) {
      if (only.length && !only.includes(p.id)) continue;
      const f = path.join(nieuwMap, `${p.id}.png`);
      if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(refDir, `${p.id}.png`)); gezet.push(p.id); }
    }
    let bron = {};
    try { bron = JSON.parse(fs.readFileSync(path.join(refDir, 'bron.json'), 'utf8')); } catch (e) { /* nieuw */ }
    const punten = { ...(bron.punten || {}) };
    for (const id of gezet) punten[id] = { datum: new Date().toISOString().slice(0, 10), commit: gitCommit(), uit: out };
    fs.writeFileSync(path.join(refDir, 'bron.json'), JSON.stringify({ datum: new Date().toISOString().slice(0, 10), commit: gitCommit(), formaat: cfg.formaat, punten }, null, 1));
    console.log(`${gezet.length} referentie(s) gezet in ${refDir}: ${gezet.join(', ')}`);
    return gezet.length ? 0 : 1;
  }
  console.error('geef --lijst, --run, --vergelijk of --ververs');
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(e && e.stack || e); process.exit(1); });
