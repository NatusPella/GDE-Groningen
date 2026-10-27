// De versie van de APK komt uit desktop/package.json, niet uit een tweede getal dat blijft staan (#483).
// Daarom schrijft dit script android/version.properties, en leest build.gradle dat bestand.
//
//   node scripts/version.mjs          schrijf android/version.properties
//   node scripts/version.mjs --print  alleen tonen: "versionName versionCode"
//
// versionName = de versie uit desktop/package.json (0.53.0), versionCode = major*10000 + minor*100 + patch
// (0.53.0 -> 5300), zodat Android elke volgende release als nieuwer ziet.
import fs from 'fs';
import path from 'path';
import { PROJECT, ROOT } from './common.mjs';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8'));
const m = /^(\d+)\.(\d+)\.(\d+)/.exec(pkg.version);
if (!m) throw new Error('desktop/package.json: versie "' + pkg.version + '" is geen major.minor.patch');
const versionCode = Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3]);
const versionName = pkg.version;

if (process.argv.includes('--print')) {
  console.log(versionName + ' ' + versionCode);
} else {
  const file = path.join(PROJECT, 'version.properties');
  fs.writeFileSync(file, 'versionName=' + versionName + '\nversionCode=' + versionCode + '\n');
  console.log('android/version.properties: ' + versionName + ' (' + versionCode + ')');
}
