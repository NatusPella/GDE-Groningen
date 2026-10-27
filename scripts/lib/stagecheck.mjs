// Checks on a staged game folder (desktop/build/game, web-dist): the two places
// where a package can silently go out incomplete, and the player only sees a
// 404 at runtime (#496).
//
//   checkWorld  every pack named in an index exists next to it, with the size
//               the index says, and every tile points at a pack that is there.
//               The world builder writes the packs before the index and rewrites
//               packs when it merges the overlays, so an interrupted build
//               leaves exactly this: an index from one generation and packs from
//               another.
//   checkAudio  every scenario loop, jingle and station track that js/audio.js
//               names as a fixed path is in the folder. The music has no
//               manifest of its own; a missing file is a 404 at the first menu.
import fs from 'node:fs';
import path from 'node:path';

// The province and corridor layers are extra; a city-only checkout has no
// index for them. index.json is the one every build needs.
export const WORLD_INDEXES = ['index.json', 'index-provincie.json', 'index-corridor.json'];

export function checkWorld(dir) {
  const problems = [];
  let packs = 0, tiles = 0;
  const files = new Map();
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile()) files.set(e.name, fs.statSync(path.join(dir, e.name)).size);
    }
  } catch (err) {
    return { ok: false, packs, tiles, problems: [`wereldmap onleesbaar: ${err.message}`] };
  }
  if (!files.has('index.json')) {
    return { ok: false, packs, tiles, problems: ['index.json ontbreekt'] };
  }
  for (const name of WORLD_INDEXES) {
    if (!files.has(name)) continue;
    let index;
    try { index = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch (err) {
      problems.push(`${name}: onleesbaar (${err.message})`);
      continue;
    }
    const packsOfIndex = index.packs || {};
    for (const [key, pack] of Object.entries(packsOfIndex)) {
      packs++;
      if (!pack || !pack.file) { problems.push(`${name}: pack ${key} heeft geen bestand`); continue; }
      const size = files.get(pack.file);
      if (size === undefined) problems.push(`${name}: pack ${key} ontbreekt (${pack.file})`);
      else if (Number.isFinite(pack.size) && size !== pack.size) problems.push(`${name}: pack ${key} is ${size} B, de index zegt ${pack.size} B (${pack.file})`);
    }
    for (const [key, tile] of Object.entries(index.tiles || {})) {
      tiles++;
      if (!tile || !tile.pack) problems.push(`${name}: tegel ${key} heeft geen pack`);
      else if (!packsOfIndex[tile.pack]) problems.push(`${name}: tegel ${key} wijst naar onbekend pack ${tile.pack}`);
    }
  }
  return { ok: problems.length === 0, packs, tiles, problems };
}

// js/audio.js and js/theme.js name their files as './audio/...' string literals
// (the generated voice and radio paths use template strings and a manifest of
// their own, so they are not part of this check).
const AUDIO_JS = ['audio.js', 'theme.js'];

export function checkAudio(dir) {
  const problems = [];
  const refs = new Set();
  for (const file of AUDIO_JS) {
    let src;
    try { src = fs.readFileSync(path.join(dir, 'js', file), 'utf8'); } catch (err) { problems.push(`js/${file} ontbreekt`); continue; }
    for (const m of src.matchAll(/['"]\.\/(audio\/[^'"\s]+\.(?:mp3|ogg|wav))['"]/g)) refs.add(m[1]);
  }
  // the radio playlist is data, not code: every track must ship with the stage
  const manifest = path.join(dir, 'audio', 'gmusic', 'manifest.json');
  try {
    const data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    for (const t of data.tracks || []) if (t && t.file) refs.add(`audio/gmusic/${t.file}`);
  } catch (err) {
    problems.push(`audio/gmusic/manifest.json onleesbaar (${err.message})`);
  }
  for (const rel of refs) if (!fs.existsSync(path.join(dir, rel))) problems.push(`audiobestand ontbreekt (${rel})`);
  return { ok: problems.length === 0, files: refs.size, problems };
}

export const formatProblems = (problems) => problems.map((p) => '  ' + p).join('\n');
