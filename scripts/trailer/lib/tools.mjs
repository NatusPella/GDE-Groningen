// Waar ffmpeg en ffprobe staan (PATH, GDE_FFMPEG, of de WinGet-link op Windows) en een paar hulpjes voor de trailerscripts.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

function find(name, envVar) {
  if (process.env[envVar] && fs.existsSync(process.env[envVar])) return process.env[envVar];
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  const hit = r.status === 0 && r.stdout.split(/\r?\n/).find(Boolean);
  if (hit) return hit;
  const w = `${process.env.LOCALAPPDATA || ''}\\Microsoft\\WinGet\\Links\\${name}.exe`;
  if (process.platform === 'win32' && fs.existsSync(w)) return w;
  throw new Error(`${name} niet gevonden (PATH of ${envVar})`);
}
export const ffmpegPath = () => find('ffmpeg', 'GDE_FFMPEG');
export const ffprobePath = () => find('ffprobe', 'GDE_FFPROBE');

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 29, ...opts });
  if (r.status !== 0 && !opts.allowFail) throw new Error(`${cmd} ${args.slice(0, 6).join(' ')}...: ${String(r.stderr).slice(-600)}`);
  return r;
}

export function probe(file) {
  const r = run(ffprobePath(), ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  return JSON.parse(r.stdout);
}

// een lettertype voor drawtext in ffmpeg (alleen voor labels in contactbladen en controlebeelden), met ontsnapte ':' voor het filter
export function fontFile() {
  const f = process.platform === 'win32' ? 'C:/Windows/Fonts/arialbd.ttf' : '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
  return f.replace(/:/g, '\\:');
}
