// #848: de Hogelandrit, de wrakduiken en de onderdelen zijn vindbaar via kaart, minikaart,
// prompt en Te doen. Broncheck op de wiring; de live modules zelf hebben aparte tests.
//   node scripts/gta6_vindbaar_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mapCategory } from '../game/js/mapicons.js';
import { MAP_GLYPH_KINDS } from '../game/js/mapglyphs.js';

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('de drie nieuwe soorten hebben een kaartcategorie en glyph', () => {
  for (const kind of ['onderdeel', 'wrakduik', 'streekuitdaging']) {
    assert.equal(mapCategory(kind), 'fun', kind + ' is een fun-icoon');
    assert.ok(MAP_GLYPH_KINDS.includes(kind), kind + ' heeft een glyph');
  }
});

t('de kaart en minikaart tekenen de drie lagen', () => {
  const map = lees('mapview.js');
  const hud = lees('hud_panel.js');
  for (const k of ['getOnderdeelSpotsForRender', 'getWrakduikSpotsForRender', 'getStreekuitdagingSpotsForRender']) {
    assert.match(map, new RegExp(k + '\\(\\)'));
    assert.match(hud, new RegExp(k + '\\(\\)'));
  }
  assert.match(map, /icon\('onderdeel', 'onderdeel-' \+ q\.id/);
  assert.match(map, /icon\('wrakduik', 'wrakduik-' \+ q\.id/);
  assert.match(map, /icon\('streekuitdaging', 'hogelandrit'/);
});

t('de duik heeft een korte visuele scène', () => {
  const live = lees('wrakduikenlive.js');
  assert.match(live, /function speelDuikScene/);
  assert.match(live, /speelDuikScene\(plek\)/);
  assert.match(live, /document\.body\.appendChild\(el\)/);
});

t('prompts voor duiken en de Hogelandrit staan in de E-keten', () => {
  const prompts = lees('prompts.js');
  assert.match(prompts, /wrakduikPrompt\(world\)/);
  assert.match(prompts, /streekuitdagingPrompt\(world\)/);
});

t('Te doen heeft de drie rijen met een route', () => {
  const todo = lees('todo.js');
  for (const key of ['col:onderdelen', 'col:wrakduiken', 'col:hogelandrit']) assert.ok(todo.includes(key), key);
  assert.match(todo, /onderdelenAlbum\(\)/);
  assert.match(todo, /duikAlbum\(\)/);
  assert.match(todo, /getStreekuitdagingSpotsForRender/);
});

t('de nieuwe iconen vallen onder de onbekende-streek-filter', () => {
  const map = lees('mapview.js');
  assert.match(map, /getOnderdeelSpotsForRender\(\)\) \{ if \(onbekend/);
  assert.match(map, /getWrakduikSpotsForRender\(\)\) \{ if \(q\.gedoken \|\| onbekend/);
  assert.match(map, /getStreekuitdagingSpotsForRender\(\)\) \{ if \(onbekend/);
});

console.log(`gta6_vindbaar_test: ${n}/${n} ok`);
