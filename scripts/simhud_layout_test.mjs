// De HUD-strook van de light sims (#1056): de stappen nemen de ruimte van de primaire waarde niet meer in ("0 VAN" in plaats van "0 van 5").
//   node scripts/simhud_layout_test.mjs
// Er is geen browser nodig: de indeling staat in sim.css en de maten in ds-tokens.css; deze test leest ze na.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../game/js/sim.css', import.meta.url), 'utf8');
const tok = fs.readFileSync(new URL('../game/js/ds-tokens.css', import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const regel = (sel) => { const m = css.match(new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`)); assert.ok(m, `regel ${sel} bestaat`); return m[2]; };
const rij = (sel) => Number((regel(sel).match(/grid-row:\s*(\d+)/) || [])[1]);

t('de stappen staan op hun eigen rij onder de primaire waarde, over de volle breedte', () => {
  const st = regel('.sh-stappen');
  assert.match(st, /grid-column:\s*1 \/ -1/);
  assert.equal(rij('.sh-stappen'), 2);
  assert.match(st, /flex-wrap:\s*wrap/, 'de pillen slaan om als de strook smal is');
  assert.equal(rij('.sh-primair'), 1);
});

t('elke rij heeft zijn eigen plek: primair 1, stappen 2, meter 3, wat nu 4, cijfers 5', () => {
  const rijen = [rij('.sh-primair'), rij('.sh-stappen'), rij('.sh-meter'), rij('.sh-nu'), rij('.sh-cijfers')];
  assert.deepEqual(rijen, [1, 2, 3, 4, 5]);
});

t('de primaire waarde wordt nooit afgekapt: het getal blijft staan, alleen de naam mag een weglatingsteken krijgen', () => {
  assert.ok(!/overflow:\s*hidden/.test(regel('.sh-primair__tekst')), 'de tekstwrapper knipt niet meer');
  assert.match(regel('.sh-groot'), /flex:\s*none/);
  assert.match(regel('.sh-primair__naam'), /text-overflow:\s*ellipsis/);
});

t('de tekstmaten in de strook zijn minstens 13 px', () => {
  const px = (naam) => { const m = tok.match(new RegExp(`--${naam}:\\s*([^;]+);`)); assert.ok(m, `token ${naam}`); const w = m[1].match(/(\d+(?:\.\d+)?)px/g).map((v) => parseFloat(v)); return Math.min(...w.filter((v) => v >= 10)); };
  for (const naam of ['ds-t-hulp', 'ds-t-label']) assert.ok(px(naam) >= 13, `${naam} >= 13 px`);
  for (const m of css.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) assert.ok(parseFloat(m[1]) >= 13, `geen vaste maat onder 13 px: ${m[0]}`);
});

console.log(`simhud_layout_test: ${n}/${n} ok`);
