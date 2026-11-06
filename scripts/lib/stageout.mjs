// Beschermt de stage-uitvoer van desktop/build.mjs (#593 punt 6). De build doet
// `fs.rmSync(OUT, { recursive: true, force: true })` en GDE_STAGE_OUT is een pad van de
// gebruiker: een typefout als %USERPROFILE% of een pad naar de repo zelf mag nooit een
// map wissen. Daarom alleen onder desktop/build, de web-dist van de repo, de tijdelijke
// map of een map met de naam `game`, en nooit de repo, de bron of een bovenliggende map.
import os from 'node:os';
import path from 'node:path';

const zelfde = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
/** Ligt p in dir (of is het dir zelf)? */
const binnen = (dir, p) => {
  const rel = path.relative(path.resolve(dir), path.resolve(p));
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
};

// -> lijst met problemen; leeg = veilig om te vervangen
export function stageOutProblems(out, { repoRoot, desktopDir, home = os.homedir(), tmp = os.tmpdir() }) {
  const abs = path.resolve(out);
  const repo = path.resolve(repoRoot), desktop = path.resolve(desktopDir);
  const build = path.join(desktop, 'build');
  // de web-build (web/build.mjs) stage't in de gitignored web-dist/ van de repo
  const webDist = path.join(repo, 'web-dist');
  const problems = [];
  const toegestaan = binnen(build, abs) || zelfde(abs, webDist) || binnen(tmp, abs) || path.basename(abs) === 'game';
  if (!toegestaan) problems.push('het pad ligt niet onder desktop/build of web-dist, niet in de tijdelijke map en heet geen "game"');
  if (zelfde(abs, path.parse(abs).root)) problems.push('het is de schijfroot');
  if (zelfde(abs, repo)) problems.push('het is de repo zelf');
  if (zelfde(abs, path.resolve(home))) problems.push('het is je gebruikersmap');
  if (zelfde(abs, path.dirname(path.resolve(home)))) problems.push('het is de map boven je gebruikersmap');
  if (binnen(path.join(repo, 'game'), abs)) problems.push('het is de bronmap game/ van de repo');
  if (binnen(repo, abs) && !zelfde(abs, repo) && !binnen(build, abs) && !zelfde(abs, webDist)) problems.push('het ligt in de repo maar niet in desktop/build of web-dist');
  if (binnen(abs, repo) && !zelfde(abs, repo)) problems.push('het is een bovenliggende map van de repo');
  return problems;
}

export function assertStageOut(out, opts) {
  const problems = stageOutProblems(out, opts);
  if (problems.length) throw new Error(`GDE_STAGE_OUT is niet veilig om te vervangen (${path.resolve(out)}):\n  ${problems.join('\n  ')}`);
  return path.resolve(out);
}
