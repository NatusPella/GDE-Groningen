// Vindt de gevendorde three.js (desktop/vendor-cache) voor tests, ook in een verse worktree
// waar `cd desktop && npm run stage` nog nooit draaide (#1094-opruiming, testinfrastructuur 21-11).
// Zoekvolgorde (eerste die three.module.js bevat wint):
//   1. GDE_VENDOR_CACHE (de map vendor-cache zelf, of een map erboven: desktop/ of de repo-hoofdmap)
//   2. <worktree>/desktop/vendor-cache en <worktree>/desktop/build/game/vendor
//   3. dezelfde twee in de hoofdmap van de repo (de git-common-dir: elke worktree deelt die)
// De cache is alleen-lezen invoer: er wordt niets gekopieerd of geschreven.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const THREE_REL = path.join('npm', 'three@0.160.0', 'build', 'three.module.js');

// De hoofdmap van de repo vanuit een worktree, zonder git te starten als het niet hoeft:
// in een worktree is .git een bestand met "gitdir: <hoofd>/.git/worktrees/<naam>".
export function mainRepoRoot(root) {
  try {
    const dotGit = path.join(root, '.git');
    const st = fs.statSync(dotGit);
    if (st.isDirectory()) return root;
    const m = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(dotGit, 'utf8'));
    if (m) {
      const gitdir = path.resolve(root, m[1].trim());
      const idx = gitdir.split(path.sep).lastIndexOf('worktrees');
      if (idx > 0) return path.dirname(gitdir.split(path.sep).slice(0, idx).join(path.sep));
    }
  } catch { /* geen git-map */ }
  try {
    const r = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: root, encoding: 'utf8', timeout: 10e3 });
    if (r.status === 0 && r.stdout.trim()) return path.dirname(path.resolve(root, r.stdout.trim()));
  } catch { /* geen git */ }
  return '';
}

const heeftThree = (dir) => !!dir && fs.existsSync(path.join(dir, THREE_REL));

// Kandidaat-mappen met npm/ erin, in zoekvolgorde, voor een env-waarde en een worktree-root.
export function vendorKandidaten(root, env = process.env) {
  const lijst = [];
  const voeg = (d) => { if (d && !lijst.includes(d)) lijst.push(d); };
  const uitEnv = String(env.GDE_VENDOR_CACHE || '').trim();
  if (uitEnv) {
    const abs = path.resolve(uitEnv);
    for (const sub of ['', 'vendor-cache', path.join('desktop', 'vendor-cache')]) voeg(path.join(abs, sub));
  }
  const bases = [root];
  const hoofd = mainRepoRoot(root);
  if (hoofd && path.resolve(hoofd) !== path.resolve(root)) bases.push(hoofd);
  for (const b of bases) {
    voeg(path.join(b, 'desktop', 'vendor-cache'));
    voeg(path.join(b, 'desktop', 'build', 'game', 'vendor'));
  }
  return lijst;
}

// -> { dirs: [mappen met npm/ erin die three bevatten, in volgorde], three: pad of '' , bron: 'env'|'worktree'|'hoofdmap'|'' }
export function vindVendorCache(root, env = process.env) {
  const dirs = vendorKandidaten(root, env).filter(heeftThree);
  const eerste = dirs[0] || '';
  const uitEnv = String(env.GDE_VENDOR_CACHE || '').trim();
  let bron = '';
  if (eerste) bron = uitEnv && path.resolve(eerste).startsWith(path.resolve(uitEnv)) ? 'env' : path.resolve(eerste).startsWith(path.resolve(root) + path.sep) ? 'worktree' : 'hoofdmap';
  return { dirs, three: eerste ? path.join(eerste, THREE_REL) : '', bron };
}

export const heeftVendorCache = (root, env = process.env) => vindVendorCache(root, env).dirs.length > 0;
