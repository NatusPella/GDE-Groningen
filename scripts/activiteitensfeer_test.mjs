// Eén sfeer per activiteit (#595): de pure tabel uit game/js/activiteitensfeer.js dekt alle 26
// activiteiten uit activities.js, gebruikt alleen bestaande tinten, patronen, accenten en iconen,
// en geen eigen font of hex. Zo kan geen activiteit buiten het sfeersysteem vallen.
//   node scripts/activiteitensfeer_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const lees = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const S = await import(new URL('../game/js/activiteitensfeer.js', import.meta.url).href);

let n = 0, fails = 0;
const t = (naam, fn) => {
  n++;
  try { fn(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 3).join('\n   ')); }
};

// --- de activiteiten uit activities.js, zonder de module te laden (die haalt THREE en de DOM) ----
const ACT = lees('game/js/activities.js');
const imports = {};
for (const m of ACT.matchAll(/import \{ ([^}]+) \} from '\.\/([^']+)\.js';/g)) {
  for (const n2 of m[1].split(',').map((x) => x.trim().split(' as ')[0])) imports[n2] = m[2];
}
const lijst = ACT.match(/const LIST = \[([^\]]+)\]/)[1].split(',').map((x) => x.trim());
// De id's staan per activiteit in de eigen module (soms in een cfg-object, zoals bij de
// standactiviteiten); elk tabel-id moet daar als `id: '...'` terug te vinden zijn.
const moduleBronnen = lijst.map((naam) => {
  const file = imports[naam];
  if (!file) return ACT; // de diensten (vluchtdienst, vaardienst) staan in activities.js zelf
  return lees(`game/js/${file}.js`);
});
const activiteitIds = Object.keys(S.ACTIVITEIT_SFEER).filter((id) => moduleBronnen.some((bron) => new RegExp(`id: '${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(bron)));

// --- de bestaande tabellen waarbinnen de sfeer moet blijven ------------------------------------
const MG = lees('game/js/minigamekit.js');
const accenten = new Set([...MG.matchAll(/accent:\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => m[1].toLowerCase()));
const iconen = new Set([...MG.matchAll(/icoon:\s*'([a-z]+)'/g)].map((m) => m[1]));
const CS = lees('game/js/carrieresfeer.js');
const vormen = new Set([...CS.match(/const VORMEN = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s{2}([a-z]+):\s*\{/gm)].map((m) => m[1]));
const tinten = new Set([...CS.match(/const TINT = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s{2}([a-z]+):/gm)].map((m) => m[1]));

// --- de tabel dekt alle activiteiten, en niets meer --------------------------------------------
t('elke activiteit heeft een sfeer en andersom', () => {
  assert.equal(activiteitIds.length, 26, 'activities.js heeft 26 activiteiten');
  assert.deepEqual(Object.keys(S.ACTIVITEIT_SFEER).sort(), [...activiteitIds].sort(), 'de sfeertabel dekt precies de activiteitenlijst');
  const namen = activiteitIds.map((id) => S.sfeerVan(id).naam);
  assert.equal(new Set(namen).size, namen.length, 'elke sfeer heeft een eigen naam');
});

t('de sfeervelden bestaan en komen uit de bestaande tabellen', () => {
  for (const id of activiteitIds) {
    const s = S.sfeerVan(id);
    assert.ok(s.naam && s.naam.length <= 34, `${id}: sfeernaam`);
    assert.ok(tinten.has(s.tint), `${id}: tint ${s.tint} bestaat in carrieresfeer.js`);
    assert.ok(vormen.has(s.vorm), `${id}: vorm ${s.vorm} bestaat in carrieresfeer.js`);
    assert.ok(accenten.has(s.accent.toLowerCase()), `${id}: accent ${s.accent} staat in de accenttabel`);
    assert.ok(iconen.has(s.icoon), `${id}: icoon ${s.icoon} bestaat in MG_THEMA`);
    assert.ok(S.BORDVORMEN.includes(s.bordvorm), `${id}: bordvorm`);
    assert.ok(['kapitalen', 'klein'].includes(s.typografie.kast), `${id}: kast`);
    assert.ok(Number.isFinite(s.typografie.spatiëring) && s.typografie.spatiëring >= 0 && s.typografie.spatiëring <= 6, `${id}: spatiëring`);
    assert.equal(typeof s.typografie.cursief, 'boolean', `${id}: cursief`);
    assert.equal(s.toon.length, 2, `${id}: twee toonregels`);
    for (const regel of s.toon) {
      assert.ok(regel && regel.length <= 90, `${id}: toonregel niet te lang`);
      assert.ok(regel.split(/\s+/).length <= 14, `${id}: toonregel hooguit 14 woorden (${regel})`);
    }
  }
});

t('geen eigen font, geen eigen hex, geen invoer van buiten', () => {
  const bron = lees('game/js/activiteitensfeer.js');
  assert.ok(!/font-family|'Bebas Neue'|'Arial Narrow'|system-ui|Segoe Print|Bradley|Comic Sans/.test(bron), 'de tabel noemt zelf geen fontstack');
  for (const id of activiteitIds) {
    const css = S.sfeerCss(S.sfeerVan(id));
    assert.ok(!/<|>|"/.test(css), `${id}: geen invoer van buiten in de CSS`);
    assert.equal(css, S.sfeerCss(S.sfeerVan(id)), `${id}: deterministisch`);
    assert.ok(css.includes(S.TINT_RGBA[S.sfeerVan(id).tint]), `${id}: de tint zit in de CSS`);
  }
  assert.deepEqual(Object.keys(S.TINT_RGBA).sort(), [...tinten].sort(), 'de vier tinten zijn precies die van carrieresfeer.js');
});

// --- contrast: het accent is een identiteitsrand, maar moet wel zichtbaar zijn op de HUD-achtergrond
const lum = (hex) => {
  const c = hex.replace('#', '');
  const kanaal = (v) => { const s = parseInt(v, 16) / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * kanaal(c.slice(0, 2)) + 0.7152 * kanaal(c.slice(2, 4)) + 0.0722 * kanaal(c.slice(4, 6));
};
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
t('elk accent is zichtbaar op de HUD-achtergrond (3:1 voor een rand, geen tekstkleur)', () => {
  for (const id of activiteitIds) {
    const c = contrast(S.sfeerVan(id).accent, '#0c140e');
    assert.ok(c >= 3, `${id}: contrast ${c.toFixed(2)} op #0c140e`);
  }
});

t('onbekende activiteit geeft geen sfeer en geen crash', () => {
  assert.equal(S.sfeerVan('bestaatniet'), null);
  assert.equal(S.sfeerCss(null), '');
  assert.equal(S.sfeerRegel('bestaatniet'), '');
  assert.equal(S.sfeerRegel('pitchputt'), 'De club betreurt uw slag. De club betreurt uw slag.');
});

t('de module is puur: geen imports, geen DOM, geen THREE', () => {
  const bron = lees('game/js/activiteitensfeer.js');
  assert.ok(!/^\s*import\s/m.test(bron), 'geen imports');
  assert.ok(!/\bdocument\.|\bwindow\.|localStorage|\bTHREE\./.test(bron), 'geen DOM, opslag of THREE');
});

// --- #595/#596: createBoard draagt de sfeer (data-sfeer, sfeernaam, watermark, bordvorm) ----------
{
  const maakEl = () => ({
    dataset: {}, style: { setProperty() {}, cssText: '' }, hidden: false, innerHTML: '', className: '',
    children: [], addEventListener() {}, appendChild(c) { this.children.push(c); }, setAttribute() {}, removeAttribute() {}, remove() {},
    querySelector: () => maakEl(), querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} },
  });
  globalThis.document = { createElement: maakEl, getElementById: () => maakEl(), body: maakEl(), head: maakEl() };
  const MK = await import(new URL('../game/js/minigamekit.js', import.meta.url).href);
  t('createBoard zet de sfeer op de balk', () => {
    const bord = MK.createBoard('pitchputt');
    assert.equal(bord.root.dataset.sfeer, 'pitchputt', 'data-sfeer');
    assert.equal(bord.root.dataset.sfeerbord, 'clubschild', 'de bordvorm uit de sfeertabel');
    assert.match(bord.root.innerHTML, /BESLOTEN CLUB|De club betreurt uw slag/i, 'de sfeernaam staat op het bord');
    assert.match(bord.root.innerHTML, /mg-watermark/, 'één watermark in de marge');
    const neutraal = MK.createBoard('onbekend-spel');
    assert.equal(neutraal.root.dataset.sfeer, undefined, 'een bord zonder sfeer blijft neutraal');
  });
  t('het vormvlak komt uit de patroontabel', () => {
    const bord = MK.createBoard('pitchputt');
    assert.match(bord.root.innerHTML, /class="mg-vorm"/, 'het vormvlak staat op het bord');
    assert.match(bord.root.innerHTML, /background-image:/, 'met het patroon uit carrieresfeer.js');
    assert.match(lees('game/js/minigamekit.js'), /data-sfeerbord="clubschild"[\s\S]{0,200}clip-path/, 'de bordvorm heeft een eigen silhouet');
  });
  t('de bordmaat past op 1280x720, 1920x1080 en 390x844', () => {
    const groot = MK.boardBox(1280);
    assert.ok(groot.max >= 360 && groot.max <= 760, `1280: ${groot.max}`);
    assert.equal(MK.boardBox(1920).max, 760, '1920: het bord is op zijn breedst');
    const mobiel = MK.boardBox(390);
    assert.equal(mobiel.mobile, true);
    assert.equal(mobiel.max, 358, '390: het bord past met 16 px marge');
    assert.ok(MK.boardBox(1600, 2).max >= 0 && MK.boardBox(390, 2).max === 358, 'de maat blijft geldig bij ui-schaal 2');
  });
  t('het stopvenster staat in de HUD-stijl met knoppen', () => {
    const input = { wasPressed: (k) => k === 'escape', consume() {} };
    MK.stopPressed(input);
    const modal = globalThis.document.body.children[globalThis.document.body.children.length - 1];
    const html = String(modal.innerHTML);
    assert.match(html, /mg-stopbtns/, 'de knoppenrij');
    assert.match(html, /data-do="stop"/, 'een Stoppen-knop');
    assert.match(html, /data-do="door"/, 'een Doorgaan-knop');
    assert.match(html, /Spatie = doorgaan/, 'de toetsuitleg blijft');
  });
}

console.log(`activiteitensfeer_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);

// --- #596: de thematabel dekt de drie borden die erbuiten vielen, en de balk schaalt/kleurt goed ------
{
  const tema = lees('game/js/minigamekit.js');
  t('de thematabel dekt ringrace, boerenwerk en het vertrekbord', () => {
    assert.match(tema, /ringrace: \{ titel: 'RINGRACE'/, 'ringrace heeft een rij');
    assert.match(tema, /boeren: \{ titel: 'BOERENWERK'/, 'boerenwerk heeft een rij');
    assert.match(tema, /station: \{ titel: 'VERTREKBORD'/, 'het vertrekbord heeft een rij');
  });
  t('de balk schaalt mee en gebruikt gevaar voor fouten', () => {
    assert.match(tema, /font-size: max\(12px, calc\(13px \* var\(--ui, 1\)\)\)/, 'de titel schaalt mee met --ui');
    assert.match(tema, /\.mg-flash\.bad \{ color: var\(--mk-danger, #d93f3f\); \}/, 'fout leest als gevaar');
    assert.match(tema, /\.mg-cells i\.bad \{ color: var\(--mk-danger, #d93f3f\); \}/, 'ook de cellen');
    assert.match(tema, /mg-stopask button \{ min-height: 44px/, 'het stopvenster heeft 44 px-knoppen');
    assert.match(tema, /\.mg-stand/, 'de tussenstand heeft een tabelvorm');
  });
}


