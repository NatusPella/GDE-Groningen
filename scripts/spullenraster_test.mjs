// De galerij van Spullen (spullen-ui 21-11): rastermaten per scherm, focus door het raster, het lui vullen van de 3D-plaatjes met een budget,
// het cachebeleid en de koppeling met het menu. Puur plus een DOM-mock (geen three, geen Electron).
//   node scripts/spullenraster_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rasterMaat, kolommenUitTops, focusStep, visibleIndices, thumbSleutel, thumbPlan, uniekeModellen, snoei, CACHE_MAX, DETAIL_MAX, DETAIL_MIN, THUMB_RATIO } from '../game/js/spullenraster.js';
import { createThumbs } from '../game/js/spullenthumbs.js';
import './node3d.mjs';
const { zoekSpullen } = await import('../game/js/spullen.js');

const src = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (naam, fn) => {
  n++;
  try { fn(); } catch (e) { fails++; console.log('FAIL', naam, '\n  ', e.message.split('\n').slice(0, 4).join(' | ')); }
};

// ------------------------------------------------------------------ rastermaten
// de breedte van het gebied met raster en detail: 1920 en 1280 breed, met ui-schaal 1,0 en 1,5 (dan is er effectief minder ruimte)
const gebied = (vp, schaal) => Math.floor(vp / schaal) - 380 - 128; // min de rail en de marge van .m-main
for (const [vp, schaal] of [[1920, 1], [1920, 1.5], [1280, 1], [1280, 1.5]]) {
  t(`rastermaten ${vp} breed, ui-schaal ${schaal}`, () => {
    const b = gebied(vp, schaal);
    const m = rasterMaat({ breedte: b, dpr: 1 });
    if (m.smal) { assert.ok(b < 640, 'alleen een heel smal gebied is "smal"'); return; }
    assert.ok(m.detailB <= Math.max(DETAIL_MIN, b * DETAIL_MAX) + 1, `het detail is hooguit 30% (${m.detailB} van ${b})`);
    assert.ok(m.detailB >= DETAIL_MIN, 'maar niet smaller dan 260 px');
    assert.ok(m.rasterB >= b * 0.6, 'het raster krijgt de meeste ruimte');
    assert.ok(m.kolommen >= 2, 'minstens twee kolommen');
    assert.ok(m.tegelB * m.kolommen + 12 * (m.kolommen - 1) <= m.rasterB, 'de tegels passen in het raster');
    assert.ok(m.tegelB >= 100, `een tegel blijft leesbaar (${m.tegelB})`);
    assert.ok(m.thumbW >= m.tegelB || m.thumbW === 256, 'het plaatje is minstens zo breed als de tegel (of de bovengrens)');
    assert.equal(m.thumbW % 32, 0, 'in stappen van 32 px: een stabiele cachesleutel');
    assert.equal(m.thumbH, Math.round(m.thumbW * THUMB_RATIO), 'altijd 4:3');
  });
}
t('meer breedte geeft meer kolommen, nooit minder', () => {
  let vorig = 0;
  for (let b = 700; b <= 1600; b += 50) { const k = rasterMaat({ breedte: b }).kolommen; assert.ok(k >= vorig, `breedte ${b}: ${k} < ${vorig}`); vorig = k; }
});
t('geen breedte of onzin geeft veilige maten', () => {
  for (const b of [0, undefined, NaN, -5, 'x']) { const m = rasterMaat({ breedte: b }); assert.ok(m.smal && m.kolommen >= 2 && m.thumbW >= 128); }
  assert.ok(rasterMaat().thumbW >= 128);
});
t('een scherp scherm (dpr 1,5) geeft een groter plaatje dan dpr 1, maar nooit boven 256', () => {
  const a = rasterMaat({ breedte: 1100, dpr: 1 }); const b = rasterMaat({ breedte: 1100, dpr: 1.5 });
  assert.ok(b.thumbW >= a.thumbW && b.thumbW <= 256);
  assert.ok(rasterMaat({ breedte: 1500, dpr: 3 }).thumbW <= 256);
});

// ------------------------------------------------------------------ focus door het raster
t('kolommen uit de posities van de tegels', () => {
  assert.equal(kolommenUitTops([10, 10, 10, 10, 120, 120, 120, 120, 230]), 4);
  assert.equal(kolommenUitTops([10, 11, 12, 120]), 3, 'twee pixels afrondverschil telt niet');
  assert.equal(kolommenUitTops([10]), 1);
  assert.equal(kolommenUitTops([]), 1);
});
t('focusStep: pijltjes lopen over het raster (4 kolommen, 10 tegels)', () => {
  assert.equal(focusStep(5, 10, 4, 'right'), 6);
  assert.equal(focusStep(5, 10, 4, 'left'), 4);
  assert.equal(focusStep(5, 10, 4, 'up'), 1);
  assert.equal(focusStep(5, 10, 4, 'down'), 9);
  assert.equal(focusStep(0, 10, 4, 'left'), null, 'links van de eerste: het menu (de rail)');
  assert.equal(focusStep(3, 10, 4, 'right'), null, 'rechts van de laatste kolom: het menu (het detail)');
  assert.equal(focusStep(9, 10, 4, 'right'), null);
  assert.equal(focusStep(2, 10, 4, 'up'), null, 'boven de eerste rij: het zoekveld');
  assert.equal(focusStep(8, 10, 4, 'down'), null, 'onder de laatste rij');
});
t('focusStep: omlaag naar een kortere laatste rij landt op de laatste tegel', () => {
  assert.equal(focusStep(3, 10, 4, 'down'), 7);
  assert.equal(focusStep(7, 10, 4, 'down'), 9, 'kolom 3 bestaat daar niet: de laatste tegel');
  assert.equal(focusStep(6, 10, 4, 'down'), 9);
});
t('focusStep: Home, End, PageUp en PageDown, en een lege of rare invoer', () => {
  assert.equal(focusStep(6, 10, 4, 'home'), 0);
  assert.equal(focusStep(6, 10, 4, 'end'), 9);
  assert.equal(focusStep(0, 10, 4, 'home'), null);
  assert.equal(focusStep(6, 30, 4, 'pageup'), 0, 'drie rijen omhoog, niet voorbij het begin');
  assert.equal(focusStep(14, 30, 4, 'pagedown'), 26);
  assert.equal(focusStep(0, 0, 4, 'right'), null);
  assert.equal(focusStep(0, 5, 4, 'draai'), null);
  assert.equal(focusStep(99, 5, 1, 'up'), 3, 'een index buiten het raster wordt de laatste');
});
t('focusStep: elke toets op elke tegel blijft binnen het raster en bereikt alles', () => {
  for (const [aantal, k] of [[1, 1], [7, 3], [10, 4], [13, 5], [100, 6]]) {
    const gezien = new Set([0]);
    const rij = [0];
    while (rij.length) {
      const i = rij.pop();
      for (const toets of ['left', 'right', 'up', 'down']) {
        const j = focusStep(i, aantal, k, toets);
        if (j === null) continue;
        assert.ok(j >= 0 && j < aantal, `${toets} vanaf ${i} gaf ${j}`);
        if (!gezien.has(j)) { gezien.add(j); rij.push(j); }
      }
    }
    assert.equal(gezien.size, aantal, `alle ${aantal} tegels te bereiken met ${k} kolommen`);
  }
});

// ------------------------------------------------------------------ zichtbaar, wachtrij en budget
t('zichtbaar: alleen de rijen in beeld en een marge', () => {
  const z = visibleIndices({ scrollTop: 0, hoogte: 400, rijH: 200, kolommen: 4, aantal: 100, marge: 0 });
  assert.deepEqual(z, [...Array(12).keys()], 'rij 0, 1 en 2 (de laatste raakt de onderrand)');
  const mid = visibleIndices({ scrollTop: 1000, hoogte: 400, rijH: 200, kolommen: 4, aantal: 100, marge: 0 });
  assert.equal(mid[0], 20); assert.ok(mid.length <= 12);
  assert.deepEqual(visibleIndices({ aantal: 0 }), []);
  assert.equal(visibleIndices({ scrollTop: 9999, hoogte: 400, rijH: 200, kolommen: 4, aantal: 10 }).length, 0, 'voorbij het einde: niets');
});

const maakItems = (aantal, uniek = aantal) => Array.from({ length: aantal }, (_, i) => ({ key: 'k' + i, viewer: { kind: 'spul', spul: { type: 'band', kleur: i % uniek } } }));

t('thumbPlan: het dichtst bij de gekozen tegel eerst, hooguit max, nooit dubbel', () => {
  const items = maakItems(30);
  const p = thumbPlan({ indices: items.map((_, i) => i), items, gekozen: 10, w: 160, h: 120, max: 5 });
  assert.deepEqual(p.map((x) => x.i), [10, 9, 11, 8, 12]);
  const dubbel = maakItems(20, 4); // twintig tegels, vier verschillende modellen
  const q = thumbPlan({ indices: dubbel.map((_, i) => i), items: dubbel, w: 160, h: 120, max: 50 });
  assert.equal(q.length, 4, 'gelijke dingen delen één plaatje');
  assert.equal(uniekeModellen(dubbel, 160, 120), 4);
});
t('thumbPlan: wat klaar is of al requested is, komt niet terug; tegels zonder model geven geen aanvraag', () => {
  const items = [...maakItems(4), { key: 'x', viewer: null }];
  const klaar = new Set([thumbSleutel(items[0].viewer, 160, 120)]);
  const requested = new Set([thumbSleutel(items[1].viewer, 160, 120)]);
  const p = thumbPlan({ indices: [0, 1, 2, 3, 4], items, klaar, requested, w: 160, h: 120 });
  assert.deepEqual(p.map((x) => x.i), [2, 3]);
  assert.equal(thumbSleutel(null, 1, 1), '');
});
t('de sleutel bevat het model en de kleur: een andere kleur is een ander plaatje', () => {
  const a = thumbSleutel({ kind: 'person', look: { shirt: 1 } }, 160, 120);
  const b = thumbSleutel({ kind: 'person', look: { shirt: 2 } }, 160, 120);
  assert.notEqual(a, b);
  assert.notEqual(thumbSleutel({ kind: 'spul' }, 160, 120), thumbSleutel({ kind: 'spul' }, 192, 144), 'en een andere maat ook');
});
t('cachebeleid: boven het maximum vallen de oudste af, eronder niets', () => {
  assert.deepEqual(snoei(['a', 'b', 'c'], 5), []);
  assert.deepEqual(snoei(['a', 'b', 'c', 'd'], 2), ['a', 'b']);
  assert.equal(snoei(Array.from({ length: CACHE_MAX + 7 }, (_, i) => i)).length, 7);
});

// een nepcontainer met tegels: elke tegel heeft top, hoogte en een .sp-ph
function nepLijst(aantal, kolommen = 4, rijH = 200, hoogte = 450) {
  const tegels = Array.from({ length: aantal }, (_, i) => {
    const ph = { innerHTML: '', dataset: { state: 'laden' } };
    return { dataset: { i: String(i) }, offsetTop: Math.floor(i / kolommen) * rijH, offsetHeight: rijH - 12, querySelector: (s) => (s === '.sp-ph' ? ph : null), ph };
  });
  const luisteraars = {};
  return {
    tegels, scrollTop: 0, clientHeight: hoogte,
    querySelectorAll: (s) => (s === '.sp-tile' ? tegels : []),
    addEventListener: (e, f) => { luisteraars[e] = f; }, removeEventListener: (e) => { delete luisteraars[e]; },
    scroll(y) { this.scrollTop = y; luisteraars.scroll && luisteraars.scroll(); }, luisteraars,
  };
}
// rAF is er niet in Node: de planner valt terug op setTimeout 16 ms
const wacht = (ms = 60) => new Promise((r) => setTimeout(r, ms * 4));

await (async () => {
  n++;
  try {
    const items = maakItems(100);
    const lijst = nepLijst(100);
    const aanvragen = [];
    const t0 = { released: [], cancelled: [] };
    const th = createThumbs(lijst, {
      items, maat: () => ({ thumbW: 160, thumbH: 120 }), gekozen: () => 0, max: 18, planner: (f) => setTimeout(f, 5),
      render: (spec, w, h, cb, o) => { aanvragen.push({ spec, w, h, o }); setTimeout(() => cb('data:image/png;base64,X' + aanvragen.length), 1); return null; },
      release: (g) => { t0.released.push(g); return 0; }, cancel: (g) => t0.cancelled.push(g),
      icoon: () => '<svg></svg>',
    });
    await wacht(80);
    // 450 px hoog, rij 200: rijen 0 tot 3 (met marge 160): 4 rijen x 4 = 16 tegels, niet alle 100
    assert.ok(aanvragen.length > 0 && aanvragen.length <= 20, `alleen wat in beeld staat: ${aanvragen.length} van 100`);
    assert.ok(aanvragen.every((a) => a.o.group === 'spullen' && a.o.prio === true), 'in de groep spullen, voor wat zichtbaar is');
    assert.ok(lijst.tegels.slice(0, 4).every((x) => x.ph.innerHTML.includes('<img')), 'de eerste tegels hebben hun plaatje ' + JSON.stringify(lijst.tegels.slice(0, 4).map((x) => x.ph.innerHTML)) + aanvragen.length);
    assert.equal(lijst.tegels[0].ph.dataset.state, 'klaar');
    assert.equal(lijst.tegels[90].ph.innerHTML, '', 'ver buiten beeld: niets getekend');
    const eerste = aanvragen.length;
    // scrollen: de volgende rijen komen erbij, de oude worden niet opnieuw requested
    lijst.scroll(1600);
    await wacht(80);
    assert.ok(aanvragen.length > eerste, 'bij het scrollen volgen nieuwe tegels');
    assert.ok(aanvragen.length <= eerste + 20, 'en weer begrensd');
    const sleutels = aanvragen.map((a) => thumbSleutel(a.spec, a.w, a.h));
    assert.equal(new Set(sleutels).size, sleutels.length, 'nooit twee keer dezelfde aanvraag');
    assert.ok(th.stats().klaar >= eerste);
    th.dispose();
    assert.deepEqual(t0.released, ['spullen'], 'sluiten geeft de plaatjes terug');
    assert.deepEqual(t0.cancelled, ['spullen'], 'en laat wat nog wacht vallen');
    assert.equal(lijst.luisteraars.scroll, undefined, 'de scrolluisteraar gaat weg');
    const na = aanvragen.length;
    lijst.scroll(0);
    await wacht(40);
    assert.equal(aanvragen.length, na, 'na het sluiten komt er niets meer');
  } catch (e) { fails++; console.log('FAIL lui vullen met budget\n  ', e.message.split('\n').slice(0, 4).join(' | ')); }
})();

await (async () => {
  n++;
  try {
    // WebGL faalt (een leeg plaatje): het icoon staat er, als enige terugval; opnieuw tekenen vraagt het niet nog eens
    const items = maakItems(3);
    const lijst = nepLijst(3);
    let k = 0;
    const th = createThumbs(lijst, { items, planner: (f) => setTimeout(f, 5), maat: () => ({ thumbW: 160, thumbH: 120 }), render: (s, w, h, cb) => { k++; setTimeout(() => cb(''), 1); return null; }, icoon: () => '<svg class="ic"></svg>' });
    await wacht(80);
    assert.ok(lijst.tegels.every((x) => x.ph.innerHTML === '<svg class="ic"></svg>' && x.ph.dataset.state === 'icoon'), 'zonder beeld: het icoon');
    assert.equal(k, 3, 'één poging per model');
    th.dispose(false);
  } catch (e) { fails++; console.log('FAIL terugval naar het icoon\n  ', e.message.split('\n').slice(0, 4).join(' | ')); }
})();

await (async () => {
  n++;
  try {
    // dispose(false) (een actie tekent de tegels opnieuw) houdt de plaatjes; dispose() geeft ze terug
    const g = [];
    const l = nepLijst(2);
    const th = createThumbs(l, { planner: (f) => setTimeout(f, 5), items: maakItems(2), maat: () => ({ thumbW: 160, thumbH: 120 }), render: (s, w, h, cb) => { setTimeout(() => cb('u'), 1); return null; }, release: (x) => g.push(x) });
    await wacht(50);
    th.dispose(false);
    assert.deepEqual(g, [], 'een nieuwe tekening geeft de cache niet terug');
  } catch (e) { fails++; console.log('FAIL cache blijft bij een nieuwe tekening\n  ', e.message.split('\n').slice(0, 4).join(' | ')); }
})();

// ------------------------------------------------------------------ geen GL-contextgroei, koppelingen, stijl
t('de galerij maakt zelf geen WebGL-context: alleen de gedeelde renderer', () => {
  for (const f of ['spullen.js', 'spullenthumbs.js', 'spullenraster.js']) {
    const s = src(f);
    assert.ok(!/WebGLRenderer|getContext\(|createVehiclePreview|OffscreenCanvas/.test(s), `${f}: geen eigen renderer of canvas`);
  }
  const sp = src('spullen.js');
  assert.match(sp, /renderSnapshot/);
  assert.match(sp, /createSharedPreview/);
  const vp = src('vehiclepreview.js');
  assert.equal((vp.match(/new THREE\.WebGLRenderer/g) || []).length, 2, 'vehiclepreview.js houdt zijn twee bouwplekken (winkel en gedeeld): niets erbij');
  assert.match(vp, /export function releaseSnapshots\(group\)/);
});
t('de tegel is een 3D-plaatje, geen icoon: het icoon alleen als terugval', () => {
  const s = src('spullen.js');
  const i = s.indexOf('function tegel(');
  const tegel = s.slice(i, s.indexOf('\n}\n', i));
  assert.match(tegel, /it\.viewer \? '<span class="sp-ph" data-state="laden"><\/span>'/, 'met een model: een vak dat zijn plaatje nog krijgt');
  assert.match(tegel, /data-state="icoon"/, 'zonder model: het icoon');
  assert.match(s, /renderSnapshot, cancelSnapshots, releaseSnapshots/);
});
t('opruimen: sluiten en een ander tabblad geven plaatjes en model terug', () => {
  const s = src('spullen.js');
  assert.match(s, /export function disposeSpullenViewer\(\) \{ stopViewer\(\); stopThumbs\(true\); \}/);
  assert.match(s, /releaseSnapshots\('spullen'\)/);
  const pm = src('pausemenu.js');
  assert.match(pm, /if \(name !== 'spullen'\) disposeSpullenViewer\(\)/);
  assert.match(pm, /spullenNavigeer\(activePanel\(\), t, dir\)/, 'pijltjes en D-pad lopen over het raster');
});
t('de stijl: DS3-beweging (transform en opacity, geen loop), beperkte beweging, tekst vanaf 13 px', () => {
  const s = src('spullen.js');
  const css = s.slice(s.indexOf('<style data-spul-css>'), s.indexOf('</style>`;'));
  assert.match(css, /\.sp-tile\{[^}]*transition:transform var\(--ds-m-midden/, 'de tegel beweegt met transform');
  assert.ok(!/transition:[^;}]*(background|border-color|box-shadow|width|height|all)/.test(css), 'geen paint- of layoutovergangen');
  assert.ok(!/infinite/.test(css), 'geen lus');
  assert.match(css, /prefers-reduced-motion:reduce\)\{#pause-menu \.sp-tile/);
  assert.match(css, /html\.reduce-motion #pause-menu \.sp-tile/);
  assert.match(css, /\.sp-tile:focus-visible\{outline:3px solid var\(--ds-focus/, 'de focusring van DS3');
  for (const m of css.matchAll(/font-size:(\d+)px/g)) assert.ok(Number(m[1]) >= 13, `tekst onder 13 px: ${m[0]}`);
  assert.match(css, /\.m-pane\{flex:0 0 var\(--sp-detail/, 'het detail heeft zijn eigen maat');
  assert.match(css, /clamp\(140px,24vh,200px\)/, 'het model in het detail is compact');
});
t('het detail blijft: draaien, terugzetten, acties met toets in de knop', () => {
  const s = src('spullen.js');
  for (const x of ['data-spul-reset', 'data-spul-act', 'data-spul-weg', "glyphHtml('ENTER')", 'turnSpullenViewer', 'createSharedPreview(c, {']) assert.ok(s.includes(x), x);
  assert.match(s, /traag/, 'een toets door het raster bouwt niet bij elke tegel een model');
});

// ------------------------------------------------------------------ filter en zoek blijven werken op de galerij
t('zoeken en filteren op de galerij: dezelfde regels als eerder', () => {
  const items = [
    { key: 'a', cat: 'wapens', title: 'Knuppel', sub: 'Slaan' }, { key: 'b', cat: 'eten', title: 'Kroket', sub: 'Snackbar' },
    { key: 'c', cat: 'thuis', title: 'Kast', sub: 'Staat thuis' }, { key: 'd', cat: 'werp', title: 'Vuurwerk', sub: 'patronen' },
  ];
  assert.equal(zoekSpullen(items, '', 'alles').length, 4);
  assert.deepEqual(zoekSpullen(items, '', 'wapens').map((i) => i.key), ['a', 'd'], 'werpspul hoort bij Wapens');
  assert.deepEqual(zoekSpullen(items, 'kroket', 'alles').map((i) => i.key), ['b']);
  assert.deepEqual(zoekSpullen(items, 'kroket', 'wapens'), [], 'een zoekwoord buiten het gekozen deel geeft niets');
  assert.equal(zoekSpullen(items, 'zzz', 'alles').length, 0);
});

console.log(`spullenraster_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
