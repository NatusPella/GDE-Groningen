// Waar staat de gebouwde wereld (#1183)? Eén zoeker voor test_all en de releasegate: in een worktree of na
// `npm run stage` zonder game/world staat hij in desktop/build/game/world, en dan mag de wereldfase niet
// stil groen zijn terwijl de helft van de audits 'game/world ontbreekt' zei.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Kandidaten in volgorde: GDE_GAME_DIR/world, GDE_PREBUILT_WORLD, GAME_WORLD, game/world, desktop/build/game/world.
export function worldCandidates(root, env = process.env) {
  return [
    env.GDE_GAME_DIR && path.join(env.GDE_GAME_DIR, 'world'),
    env.GDE_PREBUILT_WORLD,
    env.GAME_WORLD,
    path.join(root, 'game', 'world'),
    path.join(root, 'desktop', 'build', 'game', 'world'),
  ].filter(Boolean);
}

// -> de eerste map met index-provincie.json, of '' als er geen wereld is.
export function findWorld(root, env = process.env, bestaat = (f) => fs.existsSync(f)) {
  return worldCandidates(root, env).find((d) => bestaat(path.join(d, 'index-provincie.json'))) || '';
}

// Een SKIP die zegt dat de wereld ontbreekt (test_all-reden of de SKIP-regel van het script zelf).
const WORLD_SKIP = /game[\\/]world|needs-world|geen wereld|wereld ontbreekt/i;
export const isWorldSkip = (item) => !!item && item.status === 'SKIP' && WORLD_SKIP.test(String(item.detail || ''));

// Uitslag van de gate-fase world uit de exitcode van test_all --fase=zwaar en de items van die fase.
// Bestaat er een wereld en zijn er toch items om een ontbrekende wereld overgeslagen, dan is de fase
// onvolledig (code 3) en niet PASS. Een rode run blijft rood.
export function worldPhaseVerdict(code, items, wereldBestaat) {
  const gemist = (items || []).filter(isWorldSkip);
  if (code !== 0 && code !== 3) return { status: 'FAIL', code: 1, gemist: gemist.length };
  if (wereldBestaat && gemist.length) return { status: 'SKIP', code: 3, gemist: gemist.length };
  return code === 0 ? { status: 'PASS', code: 0, gemist: gemist.length } : { status: 'SKIP', code: 3, gemist: gemist.length };
}

// De wereldmap voor een audit of test zonder eigen --world (#1183): dezelfde zoektocht als test_all en de gate,
// zodat een audit in een worktree GAME_WORLD of desktop/build/game/world vindt in plaats van te SKIPpen.
// Zonder wereld: game/world van de repo (dan SKIPt de audit zoals altijd).
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export function worldDir(env = process.env) {
  return findWorld(REPO_ROOT, env) || path.join(REPO_ROOT, 'game', 'world');
}
// Hetzelfde als file-URL met een slash erachter (voor new URL('index-provincie.json', root)).
export const worldDirUrl = (env = process.env) => pathToFileURL(worldDir(env) + path.sep);
