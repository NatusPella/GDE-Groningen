// De rust van de Boerderij (#609): geen subpagina opent met een lange handleiding, de toetsen
// van het land staan als toetsplaatje en de feiten staan in kolommen. Zonder DOM: een nep-element
// vangt de HTML en de klikken op, net als boerderijui_machines_test.
//   node scripts/boerderijui_rust_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './node3d.mjs';

const Live = await import('../game/js/boerderijlive.js');
const { renderBoerderijPanel } = await import('../game/js/boerderijui.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');

Live.zetBoerderijVoorTest(null, nepOpslag());
const handlers = {};
const el = { innerHTML: '', dataset: {}, addEventListener: (k, f) => { handlers[k] = f; }, querySelector: () => null, querySelectorAll: () => [] };
const world = { money: 50000, clock: 8, addMessage() {} };
const klik = (data) => handlers.click({ target: { closest: (sel) => (sel === '[data-bd]' && data.bd ? { dataset: data } : null) } });
const PAGINA = ['perceel', 'percelen', 'erf', 'gewas', 'machines', 'kas', 'bank'];
const tekst = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

renderBoerderijPanel(el, world);

t('elke subpagina opent met een sfeerband en zonder lange alinea', () => {
  for (const page of PAGINA) {
    klik({ bd: page });
    const html = el.innerHTML;
    assert.match(html, /class="lb-sfeer"/, `${page}: heeft de sfeerband`);
    assert.match(html, /Weer een laars|Boerenzakdoek/, `${page}: met de sfeernaam van het vak`);
    const paras = [...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map((m) => tekst(m[1])).filter(Boolean);
    for (const p of paras) {
      assert.ok(p.length <= 240, `${page}: geen lange alinea (${p.length} tekens): ${p.slice(0, 60)}…`);
      const zinnen = (p.match(/[.!?](\s|$)/g) || []).length;
      assert.ok(zinnen <= 2, `${page}: hooguit twee zinnen uitleg: ${p.slice(0, 80)}…`);
    }
  }
  // de oude handleiding-alinea's zijn weg
  const src = lees('boerderijui.js');
  assert.ok(!/In de wereld stap je in een trekker met E/.test(src), 'geen proza-handleiding meer bij Machines');
  assert.ok(!/hooguit twintig procent boven of onder de basisprijs/.test(src), 'geen lange uitleg meer bij Gewas');
});

t('#1243: één tabrij; de onderdelen zijn een segmentbalk en de band draagt de naam van de boerderij', () => {
  klik({ bd: 'perceel' });
  const html = el.innerHTML;
  assert.match(html, /<nav class="ds-z-tabs bd-seg" role="tablist" aria-label="Boerderij">/, 'segmentbalk, nog steeds role=tablist voor Q en E');
  assert.ok(!/class="m-tablist"/.test(html), 'geen tweede onderstreepte tabrij');
  assert.match(html, /role="tab" class="ds-z-tab bd-seg-tab sel" data-bd="perceel" aria-selected="true"/);
  assert.equal((html.match(/Boerenzakdoek/g) || []).length, 1, 'de sfeernaam staat één keer, in de band');
  assert.match(html, /lb-sfeer-klein">Boerderij De Zonnehoek, bij Hoogkerk</, 'de band draagt de naam: geen losse kop erboven');
  const css = fs.readFileSync(new URL('../game/js/farm.css', import.meta.url), 'utf8');
  assert.match(css, /\.bd-pane \.lb-sfeer \{ min-height: var\(--ds-s-8\); \}/, 'de band is laag, de hoofdactie staat hoger');
});

t('de toetsen van het land staan als toetsplaatje', () => {
  klik({ bd: 'machines' });
  for (const k of ['E', 'G', 'T', 'X', 'R']) assert.match(el.innerHTML, new RegExp(`class="m-kc">${k}</span>`), `toets ${k} als plaatje`);
  assert.match(el.innerHTML, /class="bd-toetsen"/);
});

t('de feiten van een rij staan in kolommen in plaats van één lange prozaregel', () => {
  for (const page of ['gewas', 'machines', 'percelen', 'erf']) {
    klik({ bd: page });
    assert.match(el.innerHTML, /class="bd-feiten"/, `${page}: de feiten staan in kolommen`);
  }
  const css = lees('boerderijui.js');
  assert.match(css, /\.bd-rij \.mut \{ font-size: 18px; \}/, 'de rij-subtekst staat op de menu-maat van 18 px');
  assert.match(css, /\.bd-feiten \{[^}]*flex-wrap: wrap/, 'de kolommen wikkelen op smalle schermen');
});

t('de sfeer zegt geen ontwerptaal meer', () => {
  for (const f of ['loopbaanui.js', 'visboekui.js', 'boerderijui.js', 'carrieresfeer.js']) {
    assert.ok(!/· sfeer|sfeer<\/span>/.test(lees(f)), `${f}: geen "· sfeer" in spelerstekst`);
  }
});

console.log(`boerderijui_rust_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
