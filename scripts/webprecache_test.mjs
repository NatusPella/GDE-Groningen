// #657: de service worker precachet nu alle JS-modules en fonts.
import fs from 'node:fs';
import { shellFiles } from '../web/precache.mjs';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const js = Array.from({ length: 892 }, (_, i) => 'js/mod' + i + '.js');
const files = ['', 'index.html', 'web.js', 'sw.js', 'js/main.js', ...js, 'vendor/fonts/a.woff2', 'vendor/fonts/b.ttf', 'audio/pack-1.bin', 'game/world/x.gdp'];
const shell = shellFiles(files);
ok(shell[0] === '' && shell[1] === 'web.js', 'de pagina en de loader staan vooraan', shell.slice(0, 2).join(','));
ok(js.every((f) => shell.includes(f)) && shell.includes('js/main.js'), 'alle JS-modules staan in de shell');
ok(shell.includes('vendor/fonts/a.woff2') && shell.includes('vendor/fonts/b.ttf'), 'de fonts staan erin');
ok(!shell.some((f) => /\.(bin|gdp|ogg|mp3|wav)$/.test(f)), 'audio en werelddata niet (die gaan via hun eigen pad)');
const dubbel = shell.filter((f, i) => shell.indexOf(f) !== i);
ok(dubbel.length === 0, 'geen dubbele entries', dubbel.slice(0, 3).join(','));
console.log(`#657 meting: shell ${shell.length} bestanden (was 4: pagina, web.js en fonts); ${js.length + 1} JS-modules worden bij install geprecachet i.p.v. pas bij het eerste gebruik`);
const src = fs.readFileSync(new URL('../web/build.mjs', import.meta.url), 'utf8');
ok(/shellFiles\(files\.map\(rel\)\)/.test(src), 'de build vult de shell met de bestandslijst');
ok(/__GDE_SHELL__/.test(fs.readFileSync(new URL('../web/sw.js', import.meta.url), 'utf8')), 'sw.js gebruikt de gestempelde shell');
console.log(`${n - fails}/${n} webprecache`);
process.exit(fails ? 1 : 0);
