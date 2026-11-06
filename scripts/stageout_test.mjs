// De stage-uitvoer-beveiliging van desktop/build.mjs (#593 punt 6): GDE_STAGE_OUT wordt
// recursief verwijderd, dus de build mag nooit buiten desktop/build, web-dist of de
// temp-map opruimen en nooit de repo, de bron of een bovenliggende map raken.
//   node scripts/stageout_test.mjs
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { stageOutProblems, assertStageOut } from './lib/stageout.mjs';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const tmp = path.join(os.tmpdir(), 'gde-stageout-test');
const repo = path.join(tmp, 'repo');
const desktop = path.join(repo, 'desktop');
const home = path.join(tmp, 'home');
const opts = { repoRoot: repo, desktopDir: desktop, home, tmp };
const goed = (p) => assert.deepEqual(stageOutProblems(p, opts), [], 'veilig: ' + p);
const fout = (p, re) => {
  const problems = stageOutProblems(p, opts);
  assert.ok(problems.length > 0, 'geweigerd: ' + p);
  if (re) assert.match(problems.join(' '), re);
  n++;
};

// de gedocumenteerde vormen zijn veilig
goed(path.join(desktop, 'build', 'game'));
goed(path.join(repo, 'web-dist'));
goed(path.join(tmp, 'gde-proef', 'game'));
goed(path.join(tmp, 'gde-proef', 'game2'));
goed(path.join(home, 'stage', 'game'));
fout(path.join(repo, 'web-dist', 'sub'), /niet in desktop\/build of web-dist/);

// gevaarlijke paden worden geweigerd
fout(path.parse(tmp).root, /schijfroot/);
fout(repo, /repo zelf/);
fout(home, /gebruikersmap/);
fout(path.dirname(home), /boven je gebruikersmap/);
fout(path.join(repo, 'game'), /bronmap game/);
fout(path.join(repo, 'data'), /niet in desktop\/build of web-dist/);
fout(path.join(repo, 'docs'), /niet in desktop\/build of web-dist/);
fout(path.dirname(repo), /bovenliggende map van de repo/);
fout(path.join(repo, 'desktop', 'build', 'game', '..', '..', '..', '..'), /bovenliggende map van de repo/);
fout(path.join(path.parse(tmp).root, 'gde-stageout-x', 'map'), /niet onder desktop\/build of web-dist/);

// assertStageOut geeft het absolute pad terug of gooit
assert.equal(assertStageOut(path.join(desktop, 'build', 'game'), opts), path.join(desktop, 'build', 'game'));
n++;
assert.throws(() => assertStageOut(home, opts), /niet veilig om te vervangen/);
n++;

console.log(`stageout_test: ${n} checks ok`);
