// #840: een zachte regenboog na een bui, in de bestaande sky-shader. Geen nieuwe weersoort,
// geen extra mesh en geen orkanen; alleen een uniform dat weather.js na regen aanzet.
//   node scripts/weer_polish_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('de sky-shader heeft een regenbooguniform en een zachte boog', () => {
  const sky = lees('sky3d.js');
  assert.match(sky, /uniform vec3 uRainbowDir/);
  assert.match(sky, /uniform float uRainbow/);
  assert.match(sky, /smoothstep\(0\.70, 0\.74, rb\)/);
  assert.match(sky, /uRainbowDir: \{ value:/);
});

t('weather.js zet de regenboog alleen na een bui en laat hem weer uitfaden', () => {
  const wx = lees('weather.js');
  assert.match(wx, /u\.uRainbow\.value = regenboog \* 0\.35/);
  assert.match(wx, /\(\(w\.wet \|\| 0\) - 0\.35\) \/ 0\.3/);
  assert.match(wx, /\(1 - clamp\(t \* 4, 0, 1\)\)/);
});

t('er komen geen nieuwe weersoorten of orkanen bij', () => {
  const state = lees('weatherstate.js');
  assert.doesNotMatch(state, /orkaan|hurricane|tropisch/i);
});

console.log(`weer_polish_test: ${n}/${n} ok`);
