// #657: de modulepreload-bundel voor de webversie.
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
console.log(`#657 meting: ${tags.length} modules (${(stats.bytes / 1e6).toFixed(2)} MB in de testopzet) in één parallelle modulepreload-golf i.p.v. 892 losse ontdekkingsstappen`);
const build = fs.readFileSync(new URL('../web/build.mjs', import.meta.url), 'utf8');
ok(/modulePreloadTags\(files\.map\(rel\)\)/.test(build) && /tags \+ '\\n<script src="web\.js">/.test(build), 'de build zet de hints in index.html');
console.log(`${n - fails}/${n} webpreload`);
process.exit(fails ? 1 : 0);
