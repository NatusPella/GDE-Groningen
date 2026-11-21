// Modulepreload (review 22-11 N1): alleen modules die vanaf js/main.js bereikbaar zijn (statisch of met een letterlijke import()) krijgen een hint;
// onbereikbare hulpen (ringcheck.js, heistui.js, net/upnp.js ...) blijven buiten de golf. Draai: node scripts/preload_bereikbaar_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { modulePreloadTags, preloadStats, withModulePreload, reachableFromMain } from '../web/preload.mjs';

const GAME = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

// synthetisch
{
  const bron = { 'js/main.js': "import { a } from './a.js'; const m = () => import('./lui.js');", 'js/a.js': "export * from './sub/b.js'; export const a = 1;", 'js/sub/b.js': "import '../c.js';", 'js/c.js': '', 'js/lui.js': '', 'js/dood.js': "import './c.js';", 'js/sub/dood2.js': '' };
  const set = reachableFromMain(Object.keys(bron), (f) => bron[f]);
  ok([...set].sort().join() === 'js/a.js,js/c.js,js/main.js,js/sub/b.js', 'bereikbaar: statisch en export from; lui import() niet', [...set].join());
  const tags = modulePreloadTags(Object.keys(bron), { reachable: set }).join('');
  ok(!/dood/.test(tags) && !/lui\.js/.test(tags) && /sub\/b\.js/.test(tags), 'onbereikbaar en lui geladen vallen af');
  ok(modulePreloadTags(Object.keys(bron)).join('').includes('dood.js'), 'zonder opties blijft het gedrag zoals het was');
  ok(preloadStats(Object.keys(bron), () => 10, { reachable: set }).files === 4, 'preloadStats telt alleen bereikbare modules');
  const html = withModulePreload('<script type="module" src="js/main.js"></script>', Object.keys(bron), null, { reachable: set });
  ok(!/dood/.test(html) && /main\.js/.test(html), 'withModulePreload geeft de optie door');
}

// de echte boom
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const all = walk(path.join(GAME, 'js')).map((f) => path.relative(GAME, f).split(path.sep).join('/')).filter((f) => /\.(js|mjs)$/.test(f));
const read = (f) => fs.readFileSync(path.join(GAME, f), 'utf8');
const set = reachableFromMain(all, read);
const hrefs = (tags) => new Set(tags.map((t) => decodeURI(t.match(/href="([^"]+)"/)[1])));
const hinted = hrefs(modulePreloadTags(all, { reachable: set }));
for (const f of ['js/ringcheck.js', 'js/spotcheck.js', 'js/net/upnp.js', 'js/benchmarkui.js', 'js/radiostudio.js', 'js/botaudio.js']) {
  if (fs.existsSync(path.join(GAME, f))) ok(!hinted.has(f), `${f} (onbereikbaar) krijgt geen hint`);
}
ok(hinted.has('js/main.js'), 'main.js zelf blijft gehint');
const gewoon = hrefs(modulePreloadTags(all));
ok(hinted.size < gewoon.size, `er vallen modules af (${gewoon.size} naar ${hinted.size})`);
ok(hinted.size > 1000, `de golf blijft groot genoeg (${hinted.size})`);
const verloren = [...gewoon].filter((f) => set.has(f) && !hinted.has(f));
ok(verloren.length === 0, 'bereikbare modules blijven gehint', verloren.slice(0, 3).join());
const bytes = [...gewoon].filter((f) => !hinted.has(f)).reduce((a, f) => a + fs.statSync(path.join(GAME, f)).size, 0);
console.log(`preload_bereikbaar_test: ${n - bad}/${n} ok (${gewoon.size - hinted.size} modules, ${(bytes / 1024).toFixed(0)} kB minder in de golf)`);
process.exit(bad ? 1 : 0);
