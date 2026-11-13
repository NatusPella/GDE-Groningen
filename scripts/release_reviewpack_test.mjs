// Test voor scripts/release/review_pack.mjs (#releasegate). Geen git nodig: de pure functie
// buildReviewPack() werkt op synthetische diffs, en de CLI draait op een fixture-diff.
//   node scripts/release_reviewpack_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildReviewPack, parseNameStatus, parseDiff } from './release/review_pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'release', 'review_pack.mjs');
let n = 0;
let fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

const regels = (aantal) => Array.from({ length: aantal }, (_, i) => `+regel ${i + 1}`);
function diffVoor(pad, body, { status = 'M', oudPad = pad } = {}) {
  const kop = [`diff --git a/${oudPad} b/${pad}`, 'index 1111111..2222222 100644'];
  if (status === 'A') kop.push('new file mode 100644');
  if (status === 'D') kop.push('deleted file mode 100644');
  kop.push(status === 'A' ? '--- /dev/null' : `--- a/${oudPad}`, status === 'D' ? '+++ /dev/null' : `+++ b/${pad}`);
  return [...kop, `@@ -1,${body.length} +1,${body.length} @@`, ...body].join('\n');
}
const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });

// ---------------------------------------------------------------- pure functie: indeling en aspecten

const diff = [
  diffVoor('game/js/scene3d.js', ['-const oud = 1;', '+const nieuw = 2;']),
  diffVoor('game/js/missies/kerk.js', ['+export const missie = {};']),
  diffVoor('game/index.html', ['+<div class="gm"></div>']),
  diffVoor('game/js/menu.css', ['+.gm { color: var(--gron-green); }']),
  diffVoor('game/js/net/session.js', ['+export const sessie = 1;']),
  diffVoor('game/js/savegame.js', ['+localStorage.setItem("gde-save-v1", data);']),
  diffVoor('scripts/release/review_pack.mjs', ['+export const x = 1;'], { status: 'A' }),
  diffVoor('docs/TESTEN.md', ['+Nieuwe regel.']),
  diffVoor('game/js/verdwenen.js', ['-export const weg = 1;'], { status: 'D' }),
].join('\n');

const r = buildReviewPack({ diff, commit: 'abc1234', from: 'v0.60.7', to: 'abc1234' });
ok(r.aspects[0] === 'correctness' && r.aspects[1] === 'rules', 'correctness en rules zijn altijd verplicht', r.aspects.join(','));
ok(r.aspects.includes('design'), 'design bij HTML/CSS', r.aspects.join(','));
ok(r.aspects.includes('perf'), 'perf bij scene3d (hot path)', r.aspects.join(','));
ok(r.aspects.includes('gameplay'), 'gameplay bij missies', r.aspects.join(','));
ok(r.aspects.includes('ux'), 'ux bij menu/UI', r.aspects.join(','));
ok(r.aspects.includes('multiplayer'), 'multiplayer bij net/', r.aspects.join(','));
ok(r.aspects.includes('privacy'), 'privacy bij localStorage/save', r.aspects.join(','));
ok(!r.aspects.includes('vision'), 'vision is niet standaard verplicht', r.aspects.join(','));
ok(r.files['game/js/scene3d.js'] === 'M' && r.files['scripts/release/review_pack.mjs'] === 'A', 'statussen uit de diff', JSON.stringify(r.files));
ok(r.files['game/js/verdwenen.js'] === 'D', 'verwijderd bestand herkend', JSON.stringify(r.files));
ok(Object.keys(r.required).sort().join(',') === 'aspecten,bestanden,commit,from,inkortingen,to', 'review-required heeft de vaste velden', Object.keys(r.required).join(','));
ok(r.required.commit === 'abc1234' && r.required.from === 'v0.60.7' && r.required.to === 'abc1234', 'commit, from en to staan in review-required');
ok(r.text.includes('### game/js') && r.text.includes('### scripts') && r.text.includes('### docs'), 'pakket groepeert per systeem');
ok(r.text.includes('### game/css'), 'CSS onder game/js valt in de groep game/css');
ok(r.text.includes('### game/html'), 'HTML valt in de groep game/html');
ok(r.text.includes('### Aspect: correctness') && r.text.includes('### Aspect: perf'), 'per aspect een kop');
ok(r.text.includes('scripts/release/prompts/perf.md') && r.text.includes('scripts/release/prompts/design.md'), 'per aspect de juiste prompt');
ok(r.text.includes('Outputinstructie') && r.text.includes('reviewrapport') && r.text.includes('"bevindingen": []'), 'strikte outputinstructie met JSON-skelet');
ok(r.text.includes('## Inkortingen') && r.text.includes('Geen: de hele diff past binnen de grenzen.'), 'geen inkortingen bij een kleine diff');
const diffRegels = r.entries.reduce((s, e) => s + e.display.length, 0);
ok(diffRegels === parseDiff(diff).entries.reduce((s, e) => s + e.header.length + e.body.length, 0), 'kleine diff gaat volledig mee', String(diffRegels));

// --aspecten voegt aspecten toe (bv. vision vanuit de orchestrator) en onbekende namen blijven staan
const metVision = buildReviewPack({ diff, commit: 'abc1234', from: 'v', to: 'abc1234', aspecten: ['vision', 'mijn-aspect'] });
ok(metVision.aspects.includes('vision') && metVision.aspects.includes('mijn-aspect'), 'extra aspecten komen erbij', metVision.aspects.join(','));
ok(metVision.text.includes('### Aspect: vision'), 'extra aspect krijgt een kop');

// ---------------------------------------------------------------- bestanden en mate van inkorting

const status = parseNameStatus('M\tgame/js/a.js\nR100\toud.js\tnieuw.js\nA\tgame/js/b.js');
ok(status['game/js/a.js'] === 'M' && status['nieuw.js'] === 'R' && status['game/js/b.js'] === 'A', 'name-status met rename', JSON.stringify(status));

const metBestanden = buildReviewPack({ diff, files: { 'game/js/verdwenen.js': 'D', 'game/js/alleen-in-files.js': 'M' }, commit: 'abc1234', from: 'v', to: 'abc1234' });
ok(metBestanden.files['game/js/alleen-in-files.js'] === 'M', '--files vult bestanden aan');
ok(metBestanden.filesWithoutDiff.includes('game/js/alleen-in-files.js'), 'bestand zonder diff wordt gemeld');
ok(metBestanden.text.includes('## Bestanden zonder diff') && metBestanden.text.includes('alleen-in-files.js'), 'pakket noemt bestanden zonder diff');

// Te groot bestand: kop + eerste/laatste regels + INGEKORT-regel.
const groot = buildReviewPack({ diff: diffVoor('game/js/scene3d.js', regels(600)), commit: 'abc1234', from: 'v', to: 'abc1234' });
ok(groot.truncations.length === 1, 'één inkorting gemeld', JSON.stringify(groot.truncations));
const ink = groot.truncations[0];
ok(ink.bestand === 'game/js/scene3d.js' && ink.reden === 'per bestand', 'redenen per bestand', JSON.stringify(ink));
ok(ink.ingekort > 0 && ink.origineel === 605, 'oorspronkelijke en ingekorte omvang', JSON.stringify(ink));
ok(groot.entries[0].display.length <= 400, 'per bestand maximaal 400 regels', String(groot.entries[0].display.length));
ok(groot.text.includes('INGEKORT: ') && groot.text.includes('eerste 198') && groot.text.includes('laatste 197'), 'INGEKORT-regel met aantallen', groot.text.split('\n').find((l) => l.includes('INGEKORT:')));
ok(groot.text.includes('+regel 1') && groot.text.includes('+regel 600'), 'eerste en laatste regels blijven zichtbaar');
ok(groot.text.includes('605 regels oorspronkelijk') && groot.required.inkortingen.length === 1, 'inkorting staat ook in review-required');

// Totaalregel: tweede bestand wordt door --max-lines afgekapt.
const twee = [diffVoor('game/js/a.js', regels(300)), diffVoor('game/js/b.js', regels(300))].join('\n');
const totaal = buildReviewPack({ diff: twee, commit: 'abc1234', from: 'v', to: 'abc1234', maxLines: 400 });
ok(totaal.truncations.length === 1 && totaal.truncations[0].bestand === 'game/js/b.js', 'tweede bestand ingekort door totaalregel', JSON.stringify(totaal.truncations));
ok(totaal.truncations[0].reden.includes('totaalregel'), 'reden noemt de totaalregel', totaal.truncations[0].reden);
ok(totaal.entries.reduce((s, e) => s + e.display.length, 0) <= 400, 'totaal blijft binnen --max-lines');

// Strikt te kleine ruimte: het tweede bestand past niet meer en komt in de inkortingenlijst.
const krap = buildReviewPack({ diff: twee, commit: 'abc1234', from: 'v', to: 'abc1234', maxLines: 305 });
ok(krap.truncations.length === 1 && krap.truncations[0].opgenomen === 0 && krap.entries.length === 1, 'tweede bestand niet opgenomen', JSON.stringify(krap.truncations));
ok(krap.text.includes('0 opgenomen'), 'pakket meldt het niet-opgenomen bestand');

// Drie bestanden: wat niet meer past komt alleen in de inkortingenlijst en de totaalregel blijft kloppen.
const drie = [diffVoor('game/js/a.js', regels(300)), diffVoor('game/js/b.js', regels(300)), diffVoor('game/js/c.js', regels(300))].join('\n');
const vol = buildReviewPack({ diff: drie, commit: 'abc1234', from: 'v', to: 'abc1234', maxLines: 310 });
ok(vol.entries.reduce((s, e) => s + e.display.length, 0) <= 310, 'totaal blijft ook met drie bestanden binnen --max-lines');
ok(vol.truncations.length === 2, 'de twee niet-geplaatste bestanden staan in de inkortingen', JSON.stringify(vol.truncations));
const nietGeplaatst = vol.truncations.find((t) => t.bestand === 'game/js/c.js');
ok(nietGeplaatst && nietGeplaatst.opgenomen === 0 && nietGeplaatst.reden === 'totaalregel', 'derde bestand is niet opgenomen', JSON.stringify(nietGeplaatst));
ok(vol.text.includes('0 opgenomen'), 'pakket meldt het niet-opgenomen bestand in de inkortingen');

// ---------------------------------------------------------------- CLI op een fixture-diff

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-reviewpack-'));
try {
  const diffFile = path.join(tmp, 'fixture.diff');
  const filesFile = path.join(tmp, 'files.json');
  const out = path.join(tmp, 'uit');
  // Een extra groot bestand, zodat --max-lines=200 echt iets moet inkorten.
  const cliDiff = diff + '\n' + diffVoor('scripts/release/groot.mjs', regels(300), { status: 'A' });
  fs.writeFileSync(diffFile, cliDiff);
  fs.writeFileSync(filesFile, JSON.stringify({ 'game/js/scene3d.js': 'M', 'game/js/weg.js': 'D' }));

  const cli = run([`--from=v0.60.7`, '--to=abc1234', `--out=${out}`, `--diff=${diffFile}`, `--files=${filesFile}`, '--max-lines=200', '--aspecten=vision']);
  ok(cli.status === 0, 'CLI met fixture-diff eindigt met 0', `exit ${cli.status}: ${cli.stderr}`);
  const packPad = path.join(out, 'review-pack.md');
  const reqPad = path.join(out, 'review-required.json');
  ok(fs.existsSync(packPad) && fs.existsSync(reqPad), 'CLI schrijft review-pack.md en review-required.json');
  const req = JSON.parse(fs.readFileSync(reqPad, 'utf8'));
  const cliPack = fs.readFileSync(packPad, 'utf8');
  ok(req.commit === 'abc1234' && req.from === 'v0.60.7' && req.to === 'abc1234', 'CLI vult commit/from/to', JSON.stringify({ commit: req.commit, from: req.from, to: req.to }));
  ok(req.bestanden['game/js/weg.js'] === 'D' && req.bestanden['game/js/scene3d.js'] === 'M', 'CLI neemt --files over', JSON.stringify(req.bestanden));
  ok(Array.isArray(req.aspecten) && req.aspecten.includes('vision') && req.aspecten.includes('correctness'), 'CLI neemt --aspecten over', String(req.aspecten));
  ok(Array.isArray(req.inkortingen) && req.inkortingen.length > 0, 'CLI meldt inkortingen in review-required', JSON.stringify(req.inkortingen));
  ok(/Aspect: correctness/.test(cliPack) && /Outputinstructie/.test(cliPack) && /INGEKORT: /.test(cliPack), 'CLI-pakket bevat aspecten en inkorting');
  ok(cli.stdout.includes('Reviewpakket:'), 'CLI print een Nederlandse samenvatting');
  ok(fs.statSync(out).isDirectory(), 'CLI maakt de uitvoermap aan');

  // Zonder --from en zonder --diff: duidelijke fout, exit 2.
  const zonderFrom = run(['--out=' + path.join(tmp, 'fout')]);
  ok(zonderFrom.status === 2, 'CLI zonder --from/--diff eindigt met 2', `exit ${zonderFrom.status}`);
  ok((zonderFrom.stderr + zonderFrom.stdout).includes('--from'), 'foutmelding noemt --from', (zonderFrom.stderr + zonderFrom.stdout).trim().slice(0, 160));

  // Onleesbare diff: exit 2.
  const onleesbaar = run([`--from=v0.60.7`, `--out=${path.join(tmp, 'fout2')}`, '--diff=' + path.join(tmp, 'bestaat-niet.diff')]);
  ok(onleesbaar.status === 2, 'CLI met onleesbare diff eindigt met 2', `exit ${onleesbaar.status}`);

  // Ongeldige --max-lines: exit 2.
  const slechteMax = run([`--from=v0.60.7`, '--diff=' + diffFile, '--max-lines=3', `--out=${path.join(tmp, 'fout3')}`]);
  ok(slechteMax.status === 2, 'CLI met te kleine --max-lines eindigt met 2', `exit ${slechteMax.status}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`release_reviewpack: ${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
