// Dezelfde telling op een git-ref (bijv. origin/main), voor de voor/na-vergelijking in docs/DESIGN-AUDIT-UI-21-11.md.
import { spawnSync } from 'node:child_process';
import { ROOT, telBestand, bewustReden } from './ds3_telling.mjs';

const TEKST = /\.(?:js|css|html)$/;
const GEEN_UI = /^game\/(?:world|audio|models|img|storydata|fonts)\//;

export function telAllesUitGit(ref) {
  const lijst = spawnSync('git', ['ls-tree', '-r', '--name-only', ref, 'game', 'desktop', 'web'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  const uit = {};
  for (const f of (lijst.stdout || '').split('\n').filter(Boolean)) {
    if (!TEKST.test(f) || GEEN_UI.test(f)) continue;
    const r = spawnSync('git', ['show', `${ref}:${f}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
    if (r.status !== 0 || r.stdout.length > 4e6) continue;
    uit[f] = { ...telBestand(f, r.stdout), bewust: bewustReden(f) };
  }
  return uit;
}
