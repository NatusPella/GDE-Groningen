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
// de bron (zeefdruk-icoon, ADR 0040) heeft rand rond tegel en harde schaduw (1024 px, inhoud 42..976)
const TILE = 'crop=934:934:42:42';
const INNER = TILE; // de hele tegel met zijn inktrand en schaduw; de achtergrondlaag is papier

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
fs.writeFileSync(path.join(RES, 'values', 'ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F3EAD3</color>\n</resources>\n');
// Opstartscherm van de app (Capacitor): effen papier met het icoon in het midden, zelfde maten als eerst.
for (const d of fs.readdirSync(RES).filter((n) => /^drawable(-(land|port))?(-[a-z]*dpi)?$/.test(n))) {
  const file = path.join(RES, d, 'splash.png');
  if (!fs.existsSync(file)) continue;
  const head = fs.readFileSync(file).subarray(16, 24);
  const w = head.readUInt32BE(0), h = head.readUInt32BE(4), s = Math.round(Math.min(w, h) * 0.4);
  const tmp = file + '.tmp.png';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=0xF3EAD3:s=${w}x${h}`, '-i', SRC, '-filter_complex',
    `[1:v]${TILE},scale=${s}:${s}:flags=lanczos[i];[0:v][i]overlay=(W-w)/2:(H-h)/2,format=rgb24`, '-frames:v', '1', tmp]);
  fs.renameSync(tmp, file);
}
console.log('icoontjes gemaakt uit ' + path.relative(ROOT, SRC));
