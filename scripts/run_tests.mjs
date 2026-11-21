// Draait de standaardtests: syntaxcheck (modules via --input-type=module) op alle JS, voice_coverage, undef_check,
// text_audit, spec_check, player_singleton_audit, world_eigenaar en alle scripts/*_test.mjs met gewone node. Gebruik: node scripts/run_tests.mjs
//   --quick          snelle subset (geen check van alle JS, geen trage tests)
//   --timeout=<sec>  per test (standaard 120, bij --quick 30)
//   --only=<tekst>   alleen tests waarvan de naam de tekst bevat
//   --list           toon wat er zou draaien
//   --jobs=<n>       tests tegelijk (standaard 2; tests in SERIE en de losse poorten draaien altijd één voor één)
//   --json=<bestand> schrijf de uitkomst per test als JSON (voor het testrapport en de behoeftenmeting)
// Een test die langer dan de tijdslimiet duurt, krijgt TIMEOUT met de limiet in de melding; elke 30 s staat er een
// regel "nog bezig: ..." zodat een lange test geen minuten stilte geeft. Bekende flakes (KNOWN_FLAKES in
// scripts/lib/testloop.mjs, nu country_vehicles_test #1094) krijgen één herkansing; die staat als FLAKY in de uitvoer
// en in de samenvatting, nooit stil. Tests die de wereld nodig hebben (scripts/test_behoeften.json) worden zonder
// game/world met een SKIP "needs-world" overgeslagen. three.js wordt ook in een verse worktree gevonden
// (scripts/lib/vendorcache.mjs, GDE_VENDOR_CACHE).
// Tests die game/world of data/cache nodig hebben en die niet hebben, worden
// overgeslagen met een SKIP-melding. De dode-code-poort meet dezelfde drempel als de
// lichte fase van test_all (#646): scripts/dead_code_budget.json, dat alleen mag dalen. Provincie- en zware wereldchecks
// (province_test, ring_probe, drive_audit, ...) staan er bewust niet in.
//
// Verhouding tot scripts/test_all.mjs (#482): test_all is de standaard uit AGENTS.md en kent de
// fasen licht, zwaar en electron, met rapport en trend. Deze runner is de snelle selectie die CI
// draait; hij deelt de lijsten (EXCLUDED, SLOW, MISSING_DATA, listFiles) met test_all, zodat CI
// nooit iets anders meet dan de lichte fase op dezelfde data. Wat hier niet in zit, is de zware
// en de Electron-fase: die vragen de gestagede wereld en minuten, en draait de coördinator lokaal.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import fsMod from 'node:fs';
import osMod from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSyntax } from './lib/syntaxcheck.mjs';
import { foutUittreksel } from './lib/testrapport.mjs';
import { SERIE, KNOWN_FLAKES, runProces, pool, maakHartslag, runMetHerkansing, flakeMelding, laadBehoeften, skipReden, wereldAanwezig, dataCacheAanwezig } from './lib/testloop.mjs';
import { heeftVendorCache } from './lib/vendorcache.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => (args.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1];
const quick = flag('quick');
const timeoutMs = (Number(opt('timeout')) || (quick ? 30 : 120)) * 1000;
const only = opt('only');
const jobs = Math.max(1, Number(opt('jobs')) || 2);
const jsonOut = opt('json');

// Nooit in de standaardrun: hebben de provinciedata of minuten nodig.
// scripts/perf en scripts/ui en scripts/weer zijn CDP-snippets (top-level await/return): die
// controleert lib/syntaxcheck.mjs door ze als async-functielichaam te compileren; audio_check.js
// en *.page.js worden overgeslagen omdat ze niet meer zijn dan een losse expressie.
export const EXCLUDED = new Set([
  'province_test.mjs', 'province_detail_test.mjs', 'network_drive_test.mjs',
  'junction_sim_test.mjs', 'ring_probe.mjs', 'drive_audit.mjs', 'vaarnet_province_test.mjs', 'prop_conflict_audit_test.mjs',
  // Deze twee staan ook in de zware fase (test_all.mjs ZWAAR, met --stad en met de wereld);
  // in de lichte fase en CI zouden ze dubbel draaien en zonder wereld alleen SKIP opleveren (#646).
  'terrain_pariteit_test.mjs', 'bridge_province_test.mjs',
]);
// Niet in --quick: tests van meer dan ~5 s.
export const SLOW = new Set([
  'swim_escape_test.mjs', 'corridor_test.mjs', 'barge_test.mjs', 'tileworld_test.mjs',
  'mode_route_test.mjs', 'world_tiles_test.mjs', 'navgraph_test.mjs', 'minigames_test.mjs',
  'import_cycles_test.mjs', 'stad_test.mjs', 'overlap_test.mjs', 'road_route_test.mjs', 'water_look_test.mjs', 'route_quality_test.mjs',
  'grass_water_paved_test.mjs', // leest de echte tegels (±20 s: groen tegen water en verharding)
  'leak_mock_soak_test.mjs', // 1000 voertuigen en 1600 personen bouwen en vrijgeven (ca. 8 s, #1065)
  'coop_licht_test.mjs', // start alle coop-tests als eigen Node-processen (samen ±1 min)
  // vragen de stadsbouw-cache (os.tmpdir()/gde-stad-cache, sleutel op bestandstijden): op een schone checkout of na een wijziging bouwt de eerste ca. 280 s, daarna 14 s
  'akte1_doelen_test.mjs', 'akte2_doelen_test.mjs', 'akte3_test.mjs', 'boat_waypoint_test.mjs',

]);
// Waar een test op stukloopt als de wereld ontbreekt.
export const MISSING_DATA = /(ENOENT|Cannot find|no such file|not found)[^\n]*(game[\\/]+world|data[\\/]+cache)|(game[\\/]+world|data[\\/]+cache)[^\n]*(ENOENT|no such file|not found)/i;

export function listFiles(dir, re, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'world' && dir === join(ROOT, 'game')) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (name === 'audio_check.js' || /\.page\.js$/.test(name)) continue; // snippets voor de browserconsole/CDP (top-level await)
    if (st.isDirectory()) {
      if (['build', 'dist', 'vendor', '.claude'].includes(name) || /^\.shots/.test(name)) continue;
      listFiles(p, re, out);
    } else if (re.test(name)) out.push(p);
  }
  return out;
}

export function run(cmd, cmdArgs, ms) {
  const t0 = Date.now();
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', timeout: ms, maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, timedOut: r.error && r.error.code === 'ETIMEDOUT', out, secs: (Date.now() - t0) / 1000 };
}

// Zonder gestagede three.js (en zonder GDE_VENDOR_CACHE of een hoofdmap met cache) is een test een SKIP, geen fout.
export const NIET_NODIG = /Cannot find (package|module)[^\n]*['"]three['"]|vendor[\\/]+three|is not vendored yet/i;

export function classify(res) {
  if (res.timedOut) return 'TIMEOUT';
  // Een test die zelf meldt dat hij niets kon meten (SKIP-regel, exit 0) telt niet als geslaagd (zoals test_all).
  if (res.code === 0) return /^SKIP\b/m.test(res.out || '') ? 'SKIP' : 'PASS';
  if (MISSING_DATA.test(res.out) || NIET_NODIG.test(res.out)) return 'SKIP';
  return 'FAIL';
}

function tail(s, n = 25) { return s.split(/\r?\n/).filter(Boolean).slice(-n).join('\n'); }

// De dode-code-drempel (#646): wees-modules en ongebruikte exports mogen niet groeien.
// De vaste drempel staat in scripts/dead_code_budget.json; een volgende sessie mag hem
// alleen verlagen. -> { wees, ongebruikt, mag, fout }
export function deadCodeGate(lijst, budget) {
  const wees = lijst.filter((m) => m.kind === 'wees').length;
  const ongebruikt = lijst.reduce((s, m) => s + (m.unused ? m.unused.length : 0), 0);
  const mag = { wees: Number(budget.wees) || 0, ongebruikt: Number(budget.ongebruikt) || 0 };
  const fout = wees > mag.wees || ongebruikt > mag.ongebruikt
    ? `dode code is gegroeid: ${wees} wees-modules en ${ongebruikt} ongebruikte exports (drempel ${mag.wees} en ${mag.ongebruikt})`
    : '';
  return { wees, ongebruikt, mag, fout };
}

// Draait dead_code met een bestand in plaats van een pijp (#140) en vergelijkt met de drempel.
export function deadCodeRun() {
  const os = requireOs();
  const tmp = join(os.tmpdir(), `gde-deadcode-${process.pid}.json`);
  const r = run(process.execPath, ['scripts/dead_code.mjs', '--json=' + tmp], timeoutMs);
  let lijst = null;
  try { lijst = JSON.parse(requireFs().readFileSync(tmp, 'utf8')); } catch { /* geen JSON */ }
  try { requireFs().rmSync(tmp, { force: true }); } catch { /* al weg */ }
  if (!Array.isArray(lijst)) return { ...r, code: 1, out: r.out + '\ngeen bruikbaar dead_code-rapport' };
  const budget = JSON.parse(requireFs().readFileSync(join(ROOT, 'scripts', 'dead_code_budget.json'), 'utf8'));
  const g = deadCodeGate(lijst, budget);
  return { ...r, code: g.fout ? 1 : 0, out: `${g.wees} wees-modules, ${g.ongebruikt} ongebruikte exports (drempel ${g.mag.wees} en ${g.mag.ongebruikt})${g.fout ? ': ' + g.fout : ''}` };
}

// require in een ESM-bestand zonder extra import in de test te hoeven doen
function requireFs() { return fsMod; }
function requireOs() { return osMod; }

// De basis voor de regels- en designcontrole op de diff (releasegate, ADR 0034): CI geeft
// de PR-basis of de vorige main-commit mee via GDE_RULES_BASE. Lokaal valt hij terug op de
// merge-base met origin/main en anders op de laatste tag; zonder basis is er niets te
// toetsen (SKIP, geen stille groen).
export function resolveRulesBase(env = process.env, gitRun = (args) => run('git', args, 60e3)) {
  const kandidaten = [env && env.GDE_RULES_BASE].filter(Boolean).map((k) => String(k).trim()).filter(Boolean);
  for (const kandidaat of kandidaten) {
    const rev = gitRun(['rev-parse', '--verify', `${kandidaat}^{commit}`]);
    if (rev && rev.code === 0 && rev.out && rev.out.trim()) return rev.out.trim();
  }
  const mergeBase = gitRun(['merge-base', 'origin/main', 'HEAD']);
  if (mergeBase && mergeBase.code === 0 && mergeBase.out && mergeBase.out.trim()) return mergeBase.out.trim();
  const tag = gitRun(['describe', '--tags', '--abbrev=0']);
  if (tag && tag.code === 0 && tag.out && tag.out.trim()) return tag.out.trim();
  return '';
}

// Eén test (of poort) asynchroon met tijdslimiet, hartslag en, voor een bekende flake, een herkansing.
async function draai(naam, cmdArgs, hartslag, ms = timeoutMs) {
  const r = await runMetHerkansing(naam, async (poging) => {
    hartslag.start(naam, ms, poging);
    try { return { ...(await runProces(process.execPath, cmdArgs, { ms, cwd: ROOT })), ms }; } finally { hartslag.stop(naam); }
  }, { isFout: (x) => classify(x) === 'FAIL' || classify(x) === 'TIMEOUT' });
  return r;
}

async function main() {
  const results = [];
  const hartslag = maakHartslag();
  const wereld = wereldAanwezig(ROOT);
  const behoeften = laadBehoeften(ROOT);
  const omgeving = { wereld, three: heeftVendorCache(ROOT), data: dataCacheAanwezig(ROOT) };
  const note = (name, res, status, extra = '') => {
    results.push({ name, status, secs: res.secs, out: res.out, flaky: /^FLAKY/.test(extra) || undefined, detail: extra || undefined });
    const limiet = status === 'TIMEOUT' ? ` (tijdslimiet van ${Math.round((res.ms || timeoutMs) / 1000)}s overschreden)` : '';
    const tekst = extra ? (status === 'SKIP' ? ` (${extra})` : ` [${extra}]`) : (status === 'SKIP' ? ' (game/world, data/cache of three.js ontbreekt)' : '');
    console.log(`${status.padEnd(7)} ${name} ${res.secs.toFixed(1)}s${tekst}${limiet}`);
    // #570: de foutregels en de eerste en laatste regels van de uitvoer, niet alleen de staart. Een
    // FAIL boven regel 25 viel buiten tail(25) en dan leek een rode test in de CI-log groen.
    if (status === 'FAIL' || status === 'TIMEOUT') console.log(foutUittreksel(res.out).replace(/^/gm, '    '));
  };
  const losse = async (name, cmdArgs, ms = timeoutMs) => {
    hartslag.start(name, ms);
    let r;
    try { r = await runProces(process.execPath, cmdArgs, { ms, cwd: ROOT }); } finally { hartslag.stop(name); }
    return r;
  };

  const tests = readdirSync(join(ROOT, 'scripts'))
    .filter((n) => /_test\.mjs$/.test(n) && !EXCLUDED.has(n) && !(quick && SLOW.has(n)))
    .filter((n) => !only || n.includes(only))
    .sort();

  if (flag('list')) { console.log(tests.join('\n')); return 0; }

  if (!quick && !only) {
    const files = ['game', 'scripts', 'desktop', 'web']
      .filter((d) => existsSync(join(ROOT, d)))
      .flatMap((d) => listFiles(join(ROOT, d), /\.(js|mjs|cjs)$/))
      .sort();
    let bad = 0;
    const t0 = Date.now();
    let laatste = Date.now();
    for (const [i, f] of files.entries()) {
      // De syntaxcheck is synchroon (de hartslagtimer komt er niet doorheen): zelf elke 30 s voortgang melden.
      if (Date.now() - laatste >= 30e3) { laatste = Date.now(); console.log(`...     node --check: ${i}/${files.length} bestanden`); }
      const r = checkSyntax(f);
      if (!r.ok) { bad++; console.log(`FAIL    syntaxcheck ${relative(ROOT, f)}\n` + tail(r.out, 8).replace(/^/gm, '    ')); }
    }
    results.push({ name: `node --check (${files.length} bestanden)`, status: bad ? 'FAIL' : 'PASS', secs: (Date.now() - t0) / 1000, out: '' });
    console.log(`${bad ? 'FAIL   ' : 'PASS   '} node --check op ${files.length} bestanden, ${bad} fout`);
  }

  if (!only) {
    const v = await losse('voice_coverage.mjs --quiet', ['scripts/voice_coverage.mjs', '--quiet']);
    note('voice_coverage.mjs --quiet', v, classify(v));
    const ic = await losse('import_check.mjs', ['scripts/import_check.mjs']);
    note('import_check.mjs', ic, classify(ic));
    // De twee statische poorten die een echte fout vingen die deze runner miste (#482):
    // heist.js gebruikte namen die het niet importeerde en CI bleef groen.
    const uc = await losse('undef_check.mjs', ['scripts/undef_check.mjs']);
    note('undef_check.mjs', uc, classify(uc));
    const ta = await losse('text_audit.mjs', ['scripts/text_audit.mjs']);
    note('text_audit.mjs', ta, classify(ta));
    // De poort op de enkelspeler-aanname (#500): directe world.player-lezers mogen niet groeien.
    const psa = await losse('player_singleton_audit.mjs', ['scripts/player_singleton_audit.mjs']);
    note('player_singleton_audit.mjs', psa, classify(psa));
    // De dekking van Samen spelen (21-11): elk systeem een Samen-regel, nieuwe modules bij een systeem, opslagsleutels per speler of als wereldstaat.
    const cda = await losse('coop_coverage_audit.mjs', ['scripts/coop_coverage_audit.mjs']);
    note('coop_coverage_audit.mjs', cda, classify(cda));
    // De veldkeuring op het gedeelde World (#498): dezelfde poort die de lichte fase draait,
    // anders kan een nieuwe schrijver met groene CI naar main (#593).
    const we = await losse('world_eigenaar.mjs', ['scripts/world_eigenaar.mjs']);
    note('world_eigenaar.mjs', we, classify(we));
    // De specs tegen de code (#499): regelverwijzingen en de tellers in proza.
    const sc = await losse('spec_check.mjs', ['scripts/spec_check.mjs']);
    note('spec_check.mjs', sc, classify(sc));
    // De cutscene-linter (regie-bijbel, docs/CUTSCENE-REGIE-21-11.md): streng voor alle cutscenes; hier alleen melden, de releasegate blokkeert op blokkerende vondsten.
    const cl = await losse('cutscene_lint.mjs (meld)', ['scripts/cutscene_lint.mjs', '--meld', '--quiet']);
    note('cutscene_lint.mjs (meld)', cl, classify(cl));
    // De dode-code-poort (#646): de lichte fase van test_all bewaakt dit met de vorige run;
    // CI heeft geen vorige run en gebruikt daarom de gecommitte drempel. Alleen omlaag.
    hartslag.start('dead_code.mjs (drempel)', timeoutMs);
    const dc = deadCodeRun();
    hartslag.stop('dead_code.mjs (drempel)');
    note('dead_code.mjs (drempel)', dc, classify(dc));
    // Regels en design op precies deze diff (releasegate, ADR 0034): dezelfde controle die
    // de gate bij een release doet, nu ook op elke PR en push naar main. De basis komt van
    // de CI (GDE_RULES_BASE); lokaal van de merge-base met origin/main of de laatste tag.
    const rulesBase = resolveRulesBase();
    if (rulesBase) {
      const rb = await losse('rules_audit.mjs', ['scripts/release/rules_audit.mjs', `--from=${rulesBase}`]);
      note(`rules_audit.mjs (sinds ${rulesBase.slice(0, 10)})`, rb, rb.code === 0 ? 'PASS' : rb.code === 3 ? 'SKIP' : 'FAIL');
    } else {
      console.log('SKIP    rules_audit.mjs (geen basis: geen GDE_RULES_BASE, origin/main of tag)');
    }
    const mr = await losse('merkenregister_check.mjs', ['scripts/merkenregister_check.mjs']);
    note('merkenregister_check.mjs', mr, classify(mr));
  }

  // De tests zelf: parallel (jobs) behalve de tijdgevoelige uit SERIE, die na de pool één voor één draaien (#519).
  const eenTest = async (t, alleen) => {
    const reden = skipReden(t, behoeften, omgeving);
    if (reden) { note(t, { secs: 0, out: '' }, 'SKIP', reden); return; }
    // trage tests krijgen een veelvoud van de limiet, zoals in test_all (coop_licht_test start alle coop-tests als eigen processen)
    const r = await draai(t, [join('scripts', t)], hartslag, SLOW.has(t) ? timeoutMs * 4 : timeoutMs);
    const st = classify(r.res);
    const melding = flakeMelding(r);
    note(t + (alleen ? ' (alleen)' : ''), r.res, st, melding);
  };
  await pool(tests.filter((t) => !SERIE.has(t)).map((t) => () => eenTest(t, false)), jobs);
  for (const t of tests.filter((n) => SERIE.has(n))) await eenTest(t, true);
  hartslag.sluit();

  const count = (s) => results.filter((r) => r.status === s).length;
  const skipped = results.filter((r) => r.status === 'SKIP').map((r) => r.name);
  const flaky = results.filter((r) => r.flaky).map((r) => r.name);
  console.log(`\nSamenvatting${quick ? ' (--quick)' : ''}: ${count('PASS')} geslaagd, ${count('FAIL')} mislukt, ${count('TIMEOUT')} timeout, ${count('SKIP')} overgeslagen`);
  if (flaky.length) console.log('FLAKY (bij herkansing geslaagd, zie KNOWN_FLAKES in scripts/lib/testloop.mjs): ' + flaky.join(', '));
  if (skipped.length) console.log('SKIP (wereld- of cachedata nodig): ' + skipped.join(', '));
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ wereld, three: omgeving.three, resultaten: results.map((r) => ({ name: r.name, status: r.status, secs: Math.round(r.secs * 10) / 10, flaky: r.flaky, detail: r.detail, out: r.status === 'PASS' ? '' : String(r.out).slice(-1500) })) }, null, 1));
  return count('FAIL') + count('TIMEOUT') ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().then((c) => process.exit(c));
