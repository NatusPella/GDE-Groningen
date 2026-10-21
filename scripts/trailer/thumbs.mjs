// Maakt van in-game beelden (PNG 1920x1080 uit clip.page.js: c.png na c.thumbOverlay) YouTube-miniaturen van 1280x720 (JPEG, onder 2 MB).
//   node scripts/trailer/thumbs.mjs <in.png> <uit.jpg>
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { ffmpegPath } from './lib/tools.mjs';

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('gebruik: thumbs.mjs <in.png> <uit.jpg>'); process.exit(2); }
for (const q of [2, 4, 6, 8, 11]) {
  const r = spawnSync(ffmpegPath(), ['-v', 'error', '-y', '-i', src, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', String(q), '-pix_fmt', 'yuvj420p', out], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  if (fs.statSync(out).size < 1.9e6) { console.log(`${out}: ${(fs.statSync(out).size / 1e3).toFixed(0)} kB (q ${q})`); process.exit(0); }
}
console.error('te groot'); process.exit(1);
