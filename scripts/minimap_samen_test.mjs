// De minimap (#995): zoom per vervoermiddel en medespelers met hun identiteit (kleur en vorm); puur, zonder canvas.
//   node scripts/minimap_samen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { minimapScale, MINIMAP_MODE } from '../game/js/roadaccess.js';
import { mapCategory, isKeptKind } from '../game/js/mapicons.js';
import { MAIN_CHARS, EXTRA_CHARS, ABS_MAX } from '../game/js/coopplayers.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// zoom per vervoermiddel: lopend het dichtst bij, de lucht het verst, en sneller rijden zoomt uit
const volgorde = ['lopen', 'fiets', 'auto', 'boot', 'ov', 'lucht'];
for (let i = 1; i < volgorde.length; i++) ok(minimapScale(volgorde[i - 1], 0) > minimapScale(volgorde[i], 0), `${volgorde[i - 1]} zoomt verder in dan ${volgorde[i]}`);
for (const m of volgorde) {
  let vorige = Infinity;
  for (const v of [0, 2, 5, 10, 20, 40, 80]) { const s = minimapScale(m, v); ok(s <= vorige + 1e-9 && s > 0, `${m}: sneller is nooit verder ingezoomd (${v})`); vorige = s; }
  ok(Math.abs(minimapScale(m, 0, 1.5) - minimapScale(m, 0) * 1.5) < 1e-9, `${m}: de zoomregel in Instellingen vermenigvuldigt`);
}
ok(minimapScale('onzin', 0) === minimapScale('lopen', 0) && Object.keys(MINIMAP_MODE).length === volgorde.length, 'een onbekende stand valt terug op lopen');

// medespelers: nooit weg te drukken op de kaart, en elke speler heeft een kleur en een vorm die de kaart kan tekenen
ok(mapCategory('partner') === 'partner' && isKeptKind('partner'), 'een medespeler wordt nooit weggedrukt');
const hud = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
const vormen = new Set([...hud.slice(hud.indexOf('const PARTNER_VORMEN')).split('};')[0].matchAll(/\b([a-z]+): \{/g)].map((m) => m[1]));
const spelers = [...MAIN_CHARS, ...EXTRA_CHARS];
ok(spelers.length >= 4, 'minstens vier herkenbare spelers');
for (const c of spelers) ok(c.vorm && vormen.has(c.vorm) && /^#[0-9a-f]{6}$/i.test(c.kleur), `${c.id}: vorm ${c.vorm} en kleur kan de kaart tekenen`);
const aanTafel = spelers.slice(0, ABS_MAX);
ok(new Set(aanTafel.map((c) => c.vorm)).size === aanTafel.length, `de eerste ${ABS_MAX} spelers (het maximum aan tafel) hebben elk een eigen vorm (nooit alleen kleur)`);
ok(/case 'partner': \{ \/\/ medespeler[\s\S]{0,200}PARTNER_VORMEN\[opts\.vorm\][\s\S]{0,1500}ctx\.fillStyle = opts\.kleur/.test(hud), 'de kaart tekent een medespeler met zijn vorm en kleur');
console.log(`minimap_samen_test: ${n} controles ok`);
