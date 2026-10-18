// Maakt de launcher-icoontjes uit desktop/resources/icon.png (ffmpeg nodig).
// Eenmalig draaien; de PNG's staan in git. Een nieuw app-icoon (a1-appicoon):
// vervang het bronbestand en draai dit script opnieuw.
//   node scripts/icons.mjs [bron.png]
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { ANDROID, ROOT } from './common.mjs';

const SRC = process.argv[2] || path.join(ROOT, 'desktop', 'resources', 'icon.png');
const RES = path.join(ANDROID, 'android', 'app', 'src', 'main', 'res');
// dpi -> legacy-grootte (48 dp), adaptieve laag (108 dp)
const DENS = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
// de bron heeft ~10% rand rond de afgeronde tegel (1024 px, tegel 96..928)
const TILE = 'crop=832:832:96:96';
const INNER = 'crop=700:700:162:162'; // alleen de letters en de rand, voor de adaptieve laag

const ff = (vf, size, out) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-vf', `${vf},scale=${size}:${size}:flags=lanczos`, out]);
for (const [d, [legacy, adaptive]] of Object.entries(DENS)) {
  const dir = path.join(RES, 'mipmap-' + d);
  ff(TILE, legacy, path.join(dir, 'ic_launcher.png'));
  ff(TILE, legacy, path.join(dir, 'ic_launcher_round.png'));
  // adaptief: de binnenkant op 61% van het doek (veilige zone), doorzichtig eromheen
  const inner = Math.round(adaptive * 0.61);
  const pad = Math.round((adaptive - inner) / 2);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-vf', `${INNER},scale=${inner}:${inner}:flags=lanczos,pad=${adaptive}:${adaptive}:${pad}:${pad}:color=0x00000000`, '-pix_fmt', 'rgba', path.join(dir, 'ic_launcher_foreground.png')]);
}
fs.writeFileSync(path.join(RES, 'values', 'ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F1D17</color>\n</resources>\n');
console.log('icoontjes gemaakt uit ' + path.relative(ROOT, SRC));
