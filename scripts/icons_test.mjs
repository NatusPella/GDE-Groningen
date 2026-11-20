// Pure test voor de iconenmodule (ADR 0041): elke betekenisnaam wijst naar een gebundeld
// Phosphor-icoon, het bundeltje bevat niets wat niemand gebruikt, de bestanden zijn klein en
// een onbekende naam geeft een veilige terugval. Geen DOM, geen netwerk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICON_MAP, ICON_SIZES } from '../game/js/iconmap.js';
import { PHOSPHOR } from '../game/js/phosphordata.js';
import { icoon, iconInner, iconBekend } from '../game/js/icons.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fouten = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fouten++; console.log('FAIL ' + m); } };

const namen = Object.keys(ICON_MAP);
ok(namen.length >= 100, `genoeg betekenisnamen (${namen.length})`);
for (const [betekenis, ph] of Object.entries(ICON_MAP)) {
  ok(/^[a-z][a-z0-9_]*$/.test(betekenis), `${betekenis}: betekenisnaam in kleine letters met underscores`);
  ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(ph), `${betekenis}: ${ph} is een Phosphor-naam`);
  const d = PHOSPHOR[ph];
  ok(Array.isArray(d) && d.length === 2 && d[0].includes('<path') && d[1].includes('<path'), `${betekenis}: ${ph} staat gebundeld (regular en bold)`);
}
// Geen dubbele sleutels in de bron (een object laat de laatste winnen zonder te klagen).
const bron = fs.readFileSync(path.join(root, 'game/js/iconmap.js'), 'utf8').replace(/\/\/[^\n]*/g, '');
const sleutels = [...bron.matchAll(/(?:^|[\s,{])([a-z][a-z0-9_]*):\s*'/g)].map((m) => m[1]);
const dubbel = sleutels.filter((k, i) => sleutels.indexOf(k) !== i);
ok(dubbel.length === 0, `geen dubbele betekenisnamen: ${[...new Set(dubbel)].join(', ')}`);
ok(sleutels.length === namen.length, `iconmap.js: ${sleutels.length} regels tegen ${namen.length} sleutels`);
// Alles gebundeld wordt gebruikt, alles gebruikte is gebundeld.
const gebruikt = new Set(Object.values(ICON_MAP));
for (const k of Object.keys(PHOSPHOR)) ok(gebruikt.has(k), `phosphordata.js bevat ${k}, dat niemand gebruikt: draai phosphor_kies.mjs opnieuw`);
// Klein: de bundel en elk icoon.
const grootte = fs.statSync(path.join(root, 'game/js/phosphordata.js')).size;
ok(grootte < 250 * 1024, `phosphordata.js is klein (${Math.round(grootte / 1024)} kB)`);
for (const [k, d] of Object.entries(PHOSPHOR)) ok(d[0].length < 3000 && d[1].length < 4000, `${k} is klein`);
// De uitvoer van icoon().
const g = icoon('geld', { maat: 'm' });
ok(g.startsWith('<svg') && g.includes('currentColor') && g.includes('aria-hidden="true"') && g.includes('width="20"'), 'icoon() geeft een decoratieve currentColor-svg op token-maat');
ok(icoon('geld', { maat: 's' }) !== icoon('geld', { maat: 'm' }), 'onder 16 px bold, daarboven regular: s en m verschillen');
ok(icoon('geld', { maat: 'm' }) === icoon('geld', { maat: 20 }), 'maat als token of als getal geeft hetzelfde');
ok(icoon('geld', { maat: 15 }).includes(iconInner('geld', true)) && icoon('geld', { maat: 20 }).includes(iconInner('geld', false)), 'bold onder 16 px, regular erboven');
ok(icoon('geld', { label: 'Geld' }).includes('role="img" aria-label="Geld"'), 'met label een role="img"');
ok(icoon('geld', { label: '"><script>' }).includes('&quot;&gt;&lt;script&gt;'), 'het label wordt ge-escaped');
ok(Object.values(ICON_SIZES).every((v) => [16, 20, 24, 32].includes(v)), 'vaste maten 16, 20, 24 en 32');
// Veilige terugval.
ok(!iconBekend('bestaat_niet') && icoon('bestaat_niet').includes('<path'), 'onbekende naam geeft de terugval, geen leeg icoon');
ok(iconInner('bestaat_niet') === iconInner('vraag'), 'de terugval is het vraagteken');
ok(iconInner(undefined) === iconInner('vraag'), 'undefined geeft ook de terugval');

// Geen verwijzing naar een ontbrekende betekenisnaam: icoon('naam') in elk bronbestand, en de
// naamtabellen van de schermen die een tabel gebruiken.
const jsDir = path.join(root, 'game/js');
const TABELLEN = { 'pausemenu.js': ['ICONS', 'GROUP_ICONS'], 'todoui.js': ['ICON', 'CHIP_ICOON'], 'hud_panel.js': ['VEH_ICONS', 'TURN_ICON'], 'kaartactie.js': ['ICONEN'], 'phonefeed.js': ['APP_ICON'], 'boerderijui.js': ['ICOON'], 'achievementsui.js': ['CHIP_ICOON'], 'prompts.js': ['PIC_BETEKENIS'], 'hudcards.js': ['ICON'] };
let literals = 0;
for (const f of fs.readdirSync(jsDir).filter((x) => x.endsWith('.js') && x !== 'icons.js' && x !== 'iconmap.js' && x !== 'phosphordata.js')) {
  const src = fs.readFileSync(path.join(jsDir, f), 'utf8');
  const gebruiktIcons = /import \{[^}]*\bicoon\b(?!\s+as)[^}]*\} from '\.\/icons\.js'/.test(src);
  if (gebruiktIcons) for (const m of src.matchAll(/\bicoon\('([a-z_]+)'/g)) { literals++; ok(iconBekend(m[1]), `${f}: icoon('${m[1]}') bestaat niet in iconmap.js`); }
  for (const t of TABELLEN[f] || []) {
    const blok = src.match(new RegExp(`const ${t} = \\{([^}]*)\\}`));
    ok(!!blok, `${f}: tabel ${t} gevonden`);
    if (blok) for (const m of blok[1].matchAll(/:\s*'([a-z_]+)'/g)) ok(iconBekend(m[1]), `${f}: ${t} verwijst naar ${m[1]}, dat niet in iconmap.js staat`);
  }
}
ok(literals >= 10, `icoon('...')-aanroepen gevonden (${literals})`);

console.log(`icons_test: ${n} controles, ${fouten} fouten`);
process.exit(fouten ? 1 : 0);
