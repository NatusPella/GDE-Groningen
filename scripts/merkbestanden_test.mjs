// Controleert de logo's en de Steam- en socialbeelden (#1003): ze bestaan, de maat in de bestandsnaam klopt met de
// viewBox, ze zijn vlak (geen lettertype, verloop, filter, rasterbeeld of extern verzoek), gebruiken alleen de vijf
// inkten, de rustige varianten hebben geen misdruk, en ze zijn te reproduceren met desktop/scripts/make-brand-assets.cjs.
//   node scripts/merkbestanden_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FILES } = require('../desktop/scripts/make-brand-assets.cjs');
let checks = 0, fails = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.error('FAIL', m); } };
const INKTEN = ['#1d1b17', '#e8505b', '#0e6b3c', '#f3ead3', '#f9c80e'];

const VERPLICHT = ['header-capsule-460x215', 'small-capsule-231x87', 'main-capsule-616x353', 'vertical-capsule-374x448', 'library-capsule-600x900', 'library-hero-3840x1240', 'library-logo-1280x720'];
for (const n of VERPLICHT) ok(Object.keys(FILES).includes(`steam/art/${n}.svg`), `Steam-maat ${n} wordt gemaakt`);
for (const n of ['logo-kleur', 'logo-inkt', 'logo-klein', 'social-card']) ok(Object.keys(FILES).includes(`website/brand/${n}.svg`), `${n} wordt gemaakt`);

for (const [rel, bron] of Object.entries(FILES)) {
  const p = path.join(ROOT, rel);
  ok(fs.existsSync(p), `${rel} staat in de repo`);
  if (!fs.existsSync(p)) continue;
  const svg = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
  ok(svg === bron, `${rel} is gelijk aan wat het script maakt (draai make-brand-assets.cjs)`);
  const m = /width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  ok(m && m[1] === m[3] && m[2] === m[4], `${rel}: width/height en viewBox kloppen`);
  const naam = /-(\d+)x(\d+)\.svg$/.exec(rel);
  if (naam) ok(m && m[1] === naam[1] && m[2] === naam[2], `${rel}: de maat in de naam is de maat van het beeld`);
  ok(!/<text|<image|filter|Gradient|@font-face|base64|<script|href=|url\(|<foreignObject|<style/i.test(svg), `${rel}: vlak, zonder lettertype, verloop, rasterbeeld of extern verzoek`);
  const kleuren = [...new Set((svg.match(/#[0-9a-f]{6}\b/gi) || []).map((c) => c.toLowerCase()))];
  ok(kleuren.every((c) => INKTEN.includes(c)), `${rel}: alleen de vijf inkten (${kleuren.join(' ')})`);
  ok(/role="img" aria-label="[^"]+"/.test(svg), `${rel}: heeft een toegankelijke naam`);
  if (/logo-klein|small-capsule/.test(rel)) ok(!/#e8505b/i.test(svg), `${rel}: rustige variant zonder misdruk`);
  if (/logo-inkt/.test(rel)) ok(kleuren.every((c) => ['#1d1b17', '#f3ead3'].includes(c)), `${rel}: één inkt op papier`);
  if (/library-logo/.test(rel)) ok(!/fill="#f3ead3"\/>\n<rect|<rect width="1280" height="720"/.test(svg), `${rel}: bibliotheeklogo heeft geen achtergrondvlak`);
}
console.log(`merkbestanden_test: ${checks - fails}/${checks} controles ok.`);
process.exit(fails ? 1 : 0);
