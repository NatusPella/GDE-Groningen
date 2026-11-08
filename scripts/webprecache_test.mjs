// #757: de service worker precacht alleen de schil en de fonts; de JS-modules
// komen on-demand via cacheFirst binnen.
import fs from 'node:fs';
import { shellFiles } from '../web/precache.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const js = Array.from({ length: 892 }, (_, i) => 'js/mod' + i + '.js');
const files = ['', 'index.html', 'web.js', 'sw.js', 'js/main.js', ...js, 'vendor/fonts/a.woff2', 'vendor/fonts/b.ttf', 'audio/pack-1.bin', 'game/world/x.gdp'];
const shell = shellFiles(files);
ok(shell[0] === '' && shell[1] === 'web.js', 'de pagina en de loader staan vooraan', shell.slice(0, 2).join(','));
ok(shell.length === 4, 'alleen de schil en de fonts, geen 892 modules', String(shell.length));
ok(js.every((f) => !shell.includes(f)), 'geen JS-modules in de precache');
ok(!shell.includes('sw.js') && !shell.includes('index.html'), 'sw.js en index.html gaan via hun eigen pad');
ok(shell.includes('vendor/fonts/a.woff2') && shell.includes('vendor/fonts/b.ttf'), 'de fonts staan erin');
ok(!shell.some((f) => /\.(bin|gdp|ogg|mp3|wav)$/.test(f)), 'audio en werelddata niet (die gaan via hun eigen pad)');
const dubbel = shell.filter((f, i) => shell.indexOf(f) !== i);
ok(dubbel.length === 0, 'geen dubbele entries', dubbel.slice(0, 3).join(','));
console.log(`#757 meting: shell ${shell.length} bestanden (was 897: pagina, loader, fonts en 893 JS-modules); de modules komen nu via cacheFirst binnen i.p.v. bij install`);
const src = fs.readFileSync(new URL('../web/build.mjs', import.meta.url), 'utf8');
ok(/shellFiles\(files\.map\(rel\)\)/.test(src), 'de build vult de shell met de bestandslijst');
ok(/__GDE_SHELL__/.test(fs.readFileSync(new URL('../web/sw.js', import.meta.url), 'utf8')), 'sw.js gebruikt de gestempelde shell');
console.log(`${n - fails}/${n} webprecache`);
process.exit(fails ? 1 : 0);
