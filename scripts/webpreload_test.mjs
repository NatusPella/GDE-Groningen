// #657: de modulepreload-bundel voor de webversie.
// #757: ontwikkel-, QA- en trailerhulpen staan niet in de lijst.
import fs from 'node:fs';
import { modulePreloadTags, preloadStats } from '../web/preload.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const mods = Array.from({ length: 892 }, (_, i) => 'js/m' + i + '.js');
const files = ['', 'web.js', 'sw.js', 'index.html', ...mods, 'js/main.js', 'js/main.js', 'vendor/fonts/a.woff2', 'audio/p1.bin'];
const tags = modulePreloadTags(files);
ok(tags.length === 893, 'één hint per module (incl. main.js, ontdubbeld)', tags.length);
ok(!tags.some((t) => /web\.js|sw\.js|woff2|bin/.test(t)), 'loader, sw, fonts en audio niet');
ok(tags[0] === '<link rel="modulepreload" href="js/m0.js">', 'de vorm klopt', tags[0]);
const stats = preloadStats(files, (f) => (/^js\//.test(f) ? 1000 : 0));
ok(stats.files === 893 && stats.bytes === 893000, 'de meting telt modules en bytes', stats.files + '/' + stats.bytes);
// #757: dev/QA/trailerhulpen niet eager; de gewone trailer (vehicle) blijft
const dev = ['js/trailer.js', 'js/trailerplan.js', 'js/trailerprops.js', 'js/testmenu.js', 'js/testmenulogic.js', 'js/padtest.js', 'js/storytest.js', 'js/sfx/sfxtest.js', 'js/cutpreview.js', 'js/cutpreviewui.js', 'js/worldbuilder.js', 'js/sfx/engineworklet.js', 'js/randaudit.js', 'js/streekaudit.js', 'js/terrainaudit.js'];
const gewoon = ['js/vehicle/trailer.js', 'js/semitrailer.js', 'js/trailerstate.js'];
const metDev = modulePreloadTags([...files, ...dev, ...gewoon]);
ok(dev.every((f) => !metDev.some((t) => t.includes('href="' + f + '"'))), 'geen dev/QA/trailer-hints');
ok(gewoon.every((f) => metDev.some((t) => t.includes('href="' + f + '"'))), 'gewone trailer- en semitrailer-modules blijven erin');
const devStats = preloadStats([...dev, 'js/main.js'], () => 1000);
ok(devStats.files === 1 && devStats.bytes === 1000, 'de meting telt dev-modules niet mee', devStats.files + '/' + devStats.bytes);
console.log(`#657 meting: ${tags.length} modules (${(stats.bytes / 1e6).toFixed(2)} MB in de testopzet) in één parallelle modulepreload-golf i.p.v. 892 losse ontdekkingsstappen`);
console.log(`#757 meting: ${dev.length} dev/QA/trailer-modules staan niet meer in de preload-lijst`);
const build = fs.readFileSync(new URL('../web/build.mjs', import.meta.url), 'utf8');
ok(/modulePreloadTags\(files\.map\(rel\)\)/.test(build) && /tags \+ '\\n<script src="web\.js">/.test(build), 'de build zet de hints in index.html');
console.log(`${n - fails}/${n} webpreload`);
process.exit(fails ? 1 : 0);
