// Definities van de prestaties (#191): unieke ids, Nederlandse tekst, pictogram per prestatie.
// Draai: node scripts/achievements_defs_test.mjs
import { iconName, ICON_PATHS, iconSvg } from '../game/js/achievementicons.js';
import { readFileSync } from 'node:fs';

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.error('FAIL', m); } };
const src = readFileSync(new URL('../game/js/achievements.js', import.meta.url), 'utf8');
const ids = [...src.matchAll(/\{ id: '([a-z0-9_]+)', cat: '([a-z]+)', title: '([^']*)'/g)];
ok(ids.length > 100, 'definities gevonden: ' + ids.length);
ok(new Set(ids.map((m) => m[1])).size === ids.length, 'ids uniek');
const cats = new Set([...src.matchAll(/\['([a-z]+)', '[^']+'\],/g)].map((m) => m[1]));
for (const [, id, cat] of ids) {
  ok(cats.has(cat), `${id}: categorie ${cat}`);
  const n = iconName({ id, cat });
  ok(ICON_PATHS[n], `${id}: pictogram ${n}`);
}
for (const id of ['coop_uur', 'reuzenrad_1', 'varen_5', 'reizen_25', 'kart_5', 'drift_5000', 'trein_meerijden_5']) ok(ids.some((m) => m[1] === id), 'nieuw: ' + id);
ok(iconName({ id: 'x', cat: 'rijden', hidden: true }) === 'vraag', 'verborgen = vraagteken');
ok(iconSvg({ id: 'coop_uur', cat: 'sociaal' }).includes('<path'), 'svg');
for (const m of src.matchAll(/id: '(?:coop|reuzenrad|varen)[a-z0-9_]*'[^}]*desc: '([^']*)'/g)) ok(!/[A-Z]{3,}\b(?!-)/.test(m[1].replace(/NS|UMCG/g, '')), 'tekst: ' + m[1]);
// het overzicht geeft de categorie mee, anders valt elk pictogram terug op de trofee (#191)
ok(/id: a\.id, cat: a\.cat,/.test(src), 'getAchievementView geeft cat mee aan de pictogrammen');
console.log(fails ? `${fails} mislukt` : 'prestatiedefinities ok');
process.exit(fails ? 1 : 0);
