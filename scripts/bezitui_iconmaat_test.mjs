// Land en bedrijf: elk icoon heeft een vaste maat of een klasse met een maat (#1246, hertest 24-11). Zonder maat vulde het
// lege-staat-icoon (een plant) in het echte spel het hele paneel. Twee kanten:
//  1. statisch: elke icoon(...)-aanroep in bezitui.js, holdingcards.js en snackui.js geeft een maat of een cls mee, en elke cls heeft
//     een breedte in farm.css (of is een DS-componentklasse met een maat in ds-components.css);
//  2. gerenderd: de lege staten (Overzicht, Te koop) hebben een svg met width/height en de klasse bz-leeg-ic, en geen svg zonder maat.
//   node scripts/bezitui_iconmaat_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as U from '../game/js/bezitui.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

const rd = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const css = rd('farm.css') + '\n' + rd('ds-components.css');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

// Een klasse heeft een maat als een regel die op die klasse eindigt (of op "klasse svg") een width zet.
const heeftMaat = (cls) => new RegExp(`\\.${cls.replace(/[-]/g, '\\-')}(?:\\s*>?\\s*svg)?\\s*(?:,[^{]*)?\\{[^}]*\\bwidth\\s*:`).test(css) ||
  new RegExp(`[^{}]*\\.${cls.replace(/[-]/g, '\\-')}[^{}]*\\{[^}]*\\bwidth\\s*:`).test(css);

for (const f of ['bezitui.js', 'holdingcards.js', 'snackui.js']) {
  const src = rd(f);
  // icoon(<naam>, { ... }) of icoon(<naam>, CONST); de naam mag zelf een aanroep zijn (spotIcon(s)).
  const calls = [...src.matchAll(/\bicoon\(((?:[^()]|\([^()]*\))*)\)/g)].map((m) => m[1]);
  t(`${f}: heeft icoon-aanroepen`, () => assert.ok(f === 'snackui.js' || calls.length > 0));
  calls.forEach((args, i) => t(`${f}: icoon-aanroep ${i + 1} (${args.slice(0, 40)}) heeft een maat of klasse`, () => {
    const opts = args.match(/,\s*(\{[^}]*\}|[A-Z_]+)\s*$/);
    assert.ok(opts, 'geen opties: de svg krijgt geen maat');
    let o = opts[1];
    if (/^[A-Z_]+$/.test(o)) {
      const def = src.match(new RegExp(`const ${o} = (\\{[^}]*\\})`));
      assert.ok(def, `constante ${o} niet gevonden`);
      o = def[1];
    }
    const maat = /\bmaat\s*:/.test(o);
    const cls = (o.match(/\bcls\s*:\s*'([^']+)'/) || [])[1];
    assert.ok(maat || cls, 'geen maat en geen cls');
    if (cls && !maat) for (const c of cls.split(/\s+/)) assert.ok(heeftMaat(c), `klasse .${c} heeft geen width in farm.css/ds-components.css`);
  }));
}

const svgs = (h) => h.match(/<svg[^>]*>/g) || [];
t('lege staat Overzicht: plant-icoon met vaste maat en klasse, geen gestippeld placeholdervak', () => {
  const h = U.emptyState('gewas', 'Nog geen land', 'Een eerste perceel.', ['boerderij:tekoop', 'Koop'], 'percelen');
  const s = svgs(h);
  assert.equal(s.length, 1);
  assert.match(s[0], /width="32" height="32"/);
  assert.match(s[0], /class="ic bz-leeg-ic"/);
  assert.match(h, /class="ds-z-leeg__beeld bz-leeg-beeld"/);
});
t('lege staat Te koop: een echt Phosphor-icoon (bord), met maat', () => {
  const h = U.leegTeKoop(false);
  const s = svgs(h);
  assert.equal(s.length, 1);
  assert.match(s[0], /width="32" height="32"/);
  assert.ok(!/<svg[^>]*>\s*<\/svg>/.test(h), 'leeg icoon (onbekende naam of ontbrekende data)');
});
t('elke svg in Overzicht (leeg en met bezit) en Te koop heeft width of een klasse naast "ic"', () => {
  const m = new Map(); const opslag = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  L.initBezit({ opslag }); BL.initBoerderij({ opslag });
  const hs = [U.summaryHtml({ bezit: L.getBezit(), farm: BL.getBoerderij(), money: 5, day: 0 }), U.forSaleHtml({ money: 1, offers: [] })];
  for (const h of hs) for (const s of svgs(h)) assert.ok(/\bwidth="/.test(s) || /class="ic [^"]+"/.test(s), `svg zonder maat: ${s.slice(0, 80)}`);
});
t('farm.css: de lege-staat-klassen hebben een maat', () => {
  assert.ok(heeftMaat('bz-leeg-ic'));
  assert.match(css, /\.bz-leeg-beeld\s*\{[^}]*width:\s*var\(--ds-s-8\)/);
});

console.log(`bezitui_iconmaat_test: ${n - fails}/${n} geslaagd`);
if (fails) process.exit(1);
