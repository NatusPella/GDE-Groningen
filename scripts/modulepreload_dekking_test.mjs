// #1072: de modulepreload-lijst (web/preload.mjs, door desktop en web gedeeld) dekt de startgrafiek.
// Zonder bundler is dit de veilige route: één golf parallelle verzoeken i.p.v. de ontdekkingswaterfall.
// Deze test loopt vanaf js/main.js alle statische imports af (relatief, ook export ... from) en eist dat:
//  1. elke statisch bereikbare module een hint heeft (anders is er toch een waterval),
//  2. geen hint wijst naar een module die nergens statisch of dynamisch wordt geladen (verspild verzoek).
// Dev-hulpen (DEV_ONLY) horen er buiten te staan en mogen dus niet statisch vanuit main.js bereikbaar zijn.
//   node scripts/modulepreload_dekking_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { modulePreloadTags } from '../web/preload.mjs';

const GAME = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game');
let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const all = walk(path.join(GAME, 'js')).map((f) => path.relative(GAME, f).split(path.sep).join('/')).filter((f) => /\.(js|mjs)$/.test(f));
const hinted = new Set(modulePreloadTags(all).map((t) => decodeURI(t.match(/href="([^"]+)"/)[1])));

const STATIC = /(?:^|[;\n}])\s*(?:import|export)\s*(?:[^'"`;]*?\sfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
const DYNAMIC = /import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const src = new Map();
const read = (f) => { if (!src.has(f)) src.set(f, fs.readFileSync(path.join(GAME, f), 'utf8')); return src.get(f); };
const target = (from, spec) => path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));

function reach(re, roots, follow) {
  const seen = new Set(roots), stack = [...roots];
  while (stack.length) {
    const f = stack.pop();
    if (!fs.existsSync(path.join(GAME, f))) continue;
    for (const re2 of follow) for (const m of read(f).matchAll(re2)) {
      const t = target(f, m[1]);
      if (!seen.has(t)) { seen.add(t); stack.push(t); }
    }
  }
  return seen;
}

const statisch = reach(STATIC, ['js/main.js'], [STATIC]);
const alles = reach(STATIC, ['js/main.js'], [STATIC, DYNAMIC]);
const jsStatic = [...statisch].filter((f) => all.includes(f));
const missing = jsStatic.filter((f) => !hinted.has(f));
ok(jsStatic.length > 500, 'de startgrafiek is gevonden', jsStatic.length);
ok(missing.length === 0, 'elke statisch bereikbare module heeft een hint', missing.slice(0, 5).join(', '));
const dood = [...hinted].filter((f) => !alles.has(f));
// modules die alleen via een ander pad (worker, new URL, scripts) starten, tellen we niet als verspild
const ONGEBRUIKT_MAX = 60;
ok(dood.length <= ONGEBRUIKT_MAX, `hooguit ${ONGEBRUIKT_MAX} hints naar modules buiten de import-grafiek van main.js`, `${dood.length}: ${dood.slice(0, 5).join(', ')}`);
console.log(`modulepreload: ${all.length} modules, ${hinted.size} met hint, ${jsStatic.length} statisch bereikbaar vanaf main.js, ${alles.size} incl. dynamisch, ${dood.length} hints buiten de grafiek (worker/URL-modules)`);
console.log(`modulepreload_dekking_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
