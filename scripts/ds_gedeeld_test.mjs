// De gedeelde componenten van 24-11 (ds-gedeeld.css): alle zeven klassen bestaan, alleen tokens, en index.html laadt het bestand.   node scripts/ds_gedeeld_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../game/js/ds-gedeeld.css', import.meta.url), 'utf8');
const kaal = css.replace(/\/\*[\s\S]*?\*\//g, '');
const html = fs.readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

t('alle zeven componenten zijn er', () => { for (const k of ['segment', 'status', 'tussenkop', 'stapper', 'kopband', 'tabel', 'link']) assert.ok(new RegExp(`\\.ds-z-${k}\\b`).test(kaal), k); });
t('onderdelen en modifiers: segment--blok, --klein, aria-checked, stapper__stap, tabel aria-current', () => {
  for (const s of ['.ds-z-segment--blok', '.ds-z-segment--klein', '[aria-checked="true"]', '.ds-z-stapper__stap', '.ds-z-tabel tr[aria-current="true"]', '.ds-z-kopband__waarden', '.ds-z-status--probleem']) assert.ok(kaal.includes(s), s);
});
t('alleen tokens: geen hex, rgb, verloop of vaste lettertypen', () => {
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(kaal)); assert.ok(!/rgba?\(|gradient|backdrop-filter/.test(kaal));
  for (const m of kaal.matchAll(/font-family\s*:\s*([^;}]+)/g)) assert.match(m[1], /var\(--ds-font/);
  for (const m of kaal.matchAll(/font-size\s*:\s*([^;}]+)/g)) assert.match(m[1], /var\(--ds-t-/, m[1]);
});
t('de tussenkop heeft geen misdruk, de kopband-titel wel', () => {
  const tk = kaal.match(/\.ds-z-tussenkop \{[^}]*\}/)[0], kt = kaal.match(/\.ds-z-kopband__titel \{[^}]*\}/)[0];
  assert.match(tk, /text-shadow: none/); assert.match(kt, /var\(--ds-misdruk\)/);
});
t('index.html laadt ds-gedeeld.css na ds-components.css', () => {
  const a = html.indexOf('js/ds-components.css'), b = html.indexOf('js/ds-gedeeld.css');
  assert.ok(a > 0 && b > a);
});
console.log(`ds_gedeeld_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
