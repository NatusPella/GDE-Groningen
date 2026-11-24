// Het kader van Land en bedrijf (24-11): waarden, klussen, rendement, kaartminiatuur, kopband en strook, en het portfolio.   node scripts/bezitkader_test.mjs
// Puur, geen DOM; de opslag is een nepobject (nooit echte opslag).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as W from '../game/js/bezitwaarden.js';
import * as K from '../game/js/bezitklussen.js';
import * as R from '../game/js/bezitrendement.js';
import * as M from '../game/js/bezitkaart.js';
import * as F from '../game/js/bezitframe.js';
import * as O from '../game/js/bezitoverzicht.js';
import * as L from '../game/js/bezitlive.js';
import * as BL from '../game/js/boerderijlive.js';

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nep = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const euro = (x) => '€' + Math.round(x).toLocaleString('nl-NL');

t('waarden: de totale waarde is de som van waarden, geen verkoopwaarde', () => {
  const bezit = { parcels: { a: { p: 2400 }, b: { p: 3600 } } };
  assert.equal(W.landWaarde(bezit), 6000);
  assert.equal(W.totaleWaarde({ bezit, panden: [{ p: 84000 }], wagens: [{ p: 7500 }], extra: 1000 }), 98500);
  assert.equal(W.totaleWaarde({}), 0);
});
t('waarden: per dag is opbrengst min loon plus panden en wagens; zonder bezit blijft alleen het geld', () => {
  assert.equal(W.perDag({ rows: [{ incomeDay: 95 }, { incomeDay: 45 }], loon: 60, panden: [{ perDay: 190 }], wagens: [{ perDay: 74 }] }), 344);
  const leeg = W.waarden({ geld: 5000, bezit: { parcels: {} } });
  assert.equal(leeg.leeg, true);
  assert.equal(leeg.geld, 5000);
  const vol = W.waarden({ geld: 1, bezit: { parcels: { a: { p: 10 } } }, klussen: [{}, {}] });
  assert.equal(vol.leeg, false);
  assert.equal(vol.aandacht, 2);
});

const punten = [
  { code: 'braak', tekst: '1 perceel ligt braak', count: 1, prio: 3 },
  { code: 'rijp', tekst: '1 perceel is oogstklaar', count: 1, prio: 0 },
  { code: 'zieke-kudde', tekst: '1 kudde is ziek', count: 1, prio: 1 },
  { code: 'grond-moe', tekst: 'De grond is moe', count: 1, prio: 4 },
  { code: 'onbekend', tekst: 'x', count: 1, prio: 0 },
];
t('klussen: schade eerst, dan wat kan, dan wat wacht; een onbekend punt valt weg', () => {
  const k = K.klussen({ punten });
  assert.deepEqual(k.map((x) => x.code), ['zieke-kudde', 'rijp', 'braak', 'grond-moe']);
  assert.deepEqual(k.map((x) => x.urg), ['nu', 'vandaag', 'vandaag', 'later']);
});
t('klussen: de vergunning van de snackwagen telt mee binnen vijf dagen, daarna niet', () => {
  assert.equal(K.klusVergunning({ dagen: 3, plek: 'Stationsplein', kosten: 480 }).urg, 'vandaag');
  assert.equal(K.klusVergunning({ dagen: 1 }).urg, 'nu');
  assert.equal(K.klusVergunning({ dagen: 12 }), null);
  assert.equal(K.klusVergunning(null), null);
  assert.ok(K.klussen({ punten: [], vergunning: { dagen: 2, plek: 'Markt' } })[0].kop.includes('Markt'));
});
t('klussen: de strook toont hoogstens drie en telt de rest; de tab krijgt de ruit alleen bij iets dringends', () => {
  const k = K.klussen({ punten });
  const s = K.strook(k);
  assert.equal(s.items.length, 3);
  assert.equal(s.meer, 1);
  assert.equal(K.tabAandacht(k, 'boerderij'), true);
  assert.equal(K.tabAandacht([{ tab: 'boerderij', urg: 'later' }], 'boerderij'), false);
});

t('rendement: altijd een schatting met ±; zonder data niets (geen verzonnen getal)', () => {
  const r = R.perceelRendement({ price: 2700 });
  assert.ok(r && r.perDag > 0 && r.terug > 0 && r.bron === 'verpacht');
  assert.equal(r.terug, Math.ceil(2700 / r.perDag));
  assert.match(R.perDagTekst(r, euro), /^± €\d/);
  assert.match(R.terugTekst(r), /^± \d+ dagen terug$/);
  assert.equal(R.perceelRendement(null), null);
  assert.equal(R.perceelRendement({ price: 0 }), null);
  assert.equal(R.perDagTekst(null, euro), null);
  assert.equal(R.terugverdiend(1000, 0), null);
  assert.equal(R.pandRendement({ price: 50000 }), null, 'zonder oppervlakte en soort geen rendement');
});
t('rendement: een woning geeft huur, een winkel omzet na kosten', () => {
  const w = R.pandRendement({ price: 50000, row: { m2: 90 }, kind: { type: 'woning', cls: 'rent' } });
  assert.ok(w && w.bron === 'huur' && w.perDag > 0);
  const s = R.pandRendement({ price: 40000, row: { m2: 100 }, kind: { type: 'winkel', cls: 'shop' } }, 3);
  assert.ok(s === null || (s.bron === 'omzet' && s.perDag > 0));
  assert.equal(R.eigenPandPerDag(null), 0);
  assert.equal(R.eigenPandPerDag({ p: 0 }), 0);
  assert.ok(R.eigenPandPerDag({ p: 50000, type: 'woning', cls: 'rent', q: 100 }, 0, 120) > 0);
});

t('kaart: een SVG met vormen, letters en een legenda; zonder vlakken een lege grond; geen hex in de code', () => {
  const v = [
    { id: 'a', shape: [[0, 0], [100, 0], [100, 80], [0, 80]], statusId: 'rijp', level: 'self', naam: 'Wierdeakker' },
    { id: 'b', x: 400, y: 300, statusId: 'braak', level: 'self', naam: 'Schets' },
    { id: 'c', x: 200, y: 100, statusId: 'groeiend', level: 'leased', naam: 'Pacht' },
  ];
  const s = M.kaartSvg(v, { sel: 'a' });
  assert.match(s, /<svg class="bz-kaartvlak"/);
  assert.equal((s.match(/<polygon/g) || []).length, 3);
  assert.match(s, />O<\/text>/); assert.match(s, />B<\/text>/); assert.match(s, />V<\/text>/);
  assert.match(s, /bzk-sel/); assert.match(s, /bzk-streep/);
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(s.replace(/url\(#bzk-raster\)|id="bzk-raster"/g, '')), 'geen hex in de uitvoer');
  assert.ok(!/<polygon/.test(M.kaartSvg([])));
  assert.match(M.legendaHtml(), /Verpacht/);
  assert.equal(M.standKaart('rijp').letter, 'O');
});

const view = (over = {}) => ({ w: { geld: 18450, waarde: 186400, perDag: 559, aandacht: 3, leeg: false }, alle: K.klussen({ punten }), rows: [], punten: [], bezit: { parcels: {} }, panden: [], wagens: [], ...over });
t('kader: vier waardeplaatjes en de strook met drie klussen en "+1 meer"', () => {
  const h = F.frameHtml(view());
  for (const l of ['geld', 'totale waarde', 'per dag', 'aandacht']) assert.ok(h.includes(`data-plaat="${l}"`), l);
  assert.match(h, /€18\.450/); assert.match(h, /\+€559/);
  assert.equal((h.match(/class="bz-klus bz-klus--/g) || []).length, 3 + 4, 'drie in de strook en vier in de lijst achter +1 meer');
  assert.match(h, /<details class="bz-meer">[\s\S]*\+1 meer/);
  assert.match(h, /data-goto-sub="boerderij:boerderij"/);
  assert.match(h, /bz-stand--nu/); assert.match(h, /NU/); assert.match(h, /VANDAAG/);
});
t('kader: zonder bezit alleen het geld en geen strook; zonder klussen geen strook', () => {
  const h = F.frameHtml(view({ w: { geld: 5000, waarde: 0, perDag: 0, aandacht: 0, leeg: true }, alle: [] }));
  assert.match(h, /data-plaat="geld"/);
  assert.ok(!h.includes('totale waarde') && !h.includes('bz-nu'));
  assert.equal(F.strookHtml([]), '');
});
t('kader: een negatief dagbedrag krijgt een minteken en de aandacht is rood als er iets is', () => {
  assert.match(F.kopHtml({ geld: 1, waarde: 2, perDag: -40, aandacht: 2, leeg: false }), /−€40/);
  assert.match(F.kopHtml({ geld: 1, waarde: 2, perDag: 5, aandacht: 2, leeg: false }), /ds-z-waarde--gevaar/);
  assert.ok(!/ds-z-waarde--gevaar/.test(F.kopHtml({ geld: 1, waarde: 2, perDag: 5, aandacht: 0, leeg: false })));
});
t('kader: de tabs krijgen hun getal en de ruit', () => {
  const el = (id) => { const attrs = new Set(); const small = { textContent: '' }; return { id, attrs, small, querySelector: () => small, toggleAttribute: (a, on) => { if (on) attrs.add(a); else attrs.delete(a); } }; };
  const tabs = { boerderij: el('boerderij'), bedrijven: el('bedrijven') };
  const root = { querySelector: (sel) => { const m = /data-subtab="(\w+)"/.exec(sel); return m ? tabs[m[1]] || null : null; } };
  F.zetTabs(root, view(), { boerderij: 6, bedrijven: 0, tekoop: 12 });
  assert.equal(tabs.boerderij.small.textContent, '6');
  assert.ok(tabs.boerderij.attrs.has('data-new'));
  assert.equal(tabs.bedrijven.small.textContent, '');
  assert.ok(!tabs.bedrijven.attrs.has('data-new'));
});

t('portfolio: kaarten per soort bezit, de hele kaart opent zijn tab, geen verzonnen verloop', () => {
  const v = view({ rows: [{ id: 'a', ha: 2, incomeDay: 95, level: 'staff', statusId: 'rijp' }], punten: [{ code: 'rijp', count: 1 }, { code: 'zieke-kudde', count: 1 }], panden: [{ p: 84000, perDay: 190 }], wagens: [{ p: 5600, perDay: 74 }] });
  const h = O.portfolioHtml(v, { vlakken: [{ id: 'a', x: 1, y: 1, statusId: 'rijp', level: 'staff', naam: 'A' }] });
  for (const tab of ['boerderij', 'bedrijven', 'snack']) assert.ok(h.includes(`data-pkaart="${tab}"`) && h.includes(`data-goto-sub="boerderij:${tab}"`), tab);
  assert.match(h, /1 oogstklaar/); assert.match(h, /Zieke kudde/);
  assert.match(h, /Volgende stap/); assert.ok(!/<polyline|bz-spark/.test(h), 'geen verloop zonder gegevens');
  assert.match(O.portfolioHtml(view({ alle: [] })), /Niets dringends/);
});
t('leeg: drie stappen, de eerste is de gele knop, het rendement alleen met ±, een dichte tak is "Komt later"', () => {
  const h = O.leegHtml({ money: 5000, bedrijvenOpen: false, snackOpen: false });
  assert.match(h, /Nog niets in bezit/); assert.match(h, /je hebt €5\.000/);
  assert.equal((h.match(/data-stap="/g) || []).length, 3);
  assert.match(h, /Levert<\/dt><dd>± €\d/);
  assert.equal((h.match(/Komt later/g) || []).length, 2);
  assert.ok(!/ds-z-knop ds-z-knop--secundair[^>]*>Bekijk wat te koop/.test(h));
  assert.equal((O.leegHtml({ bedrijvenOpen: true, snackOpen: true }).match(/Komt later/g) || []).length, 0);
});

t('samen spelen: het kader leest alleen het eigen bezit (frameView met een nepopslag), geen netwerk', () => {
  const st = nep(); L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
  const vw = F.frameView({ money: 5000 });
  assert.equal(vw.w.leeg, true); assert.equal(vw.w.geld, 5000);
  assert.equal(vw.alle.length, 0);
  const src = ['bezitframe', 'bezitoverzicht', 'bezitkaart', 'bezitklussen', 'bezitwaarden', 'bezitrendement'].map((f) => fs.readFileSync(new URL(`../game/js/${f}.js`, import.meta.url), 'utf8')).join('\n');
  assert.ok(!/fetch\(|WebSocket|RTCPeer|localStorage|sessionStorage/.test(src), 'geen netwerk en geen eigen opslag');
});

t('css: ds-bezit.css gebruikt alleen tokens (geen hex, geen verloop, geen rgb)', () => {
  const css = fs.readFileSync(new URL('../game/js/ds-bezit.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), 'geen hex');
  assert.ok(!/rgba?\(|gradient|backdrop-filter/.test(css), 'geen rgb of verloop');
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g)) assert.match(m[1], /var\(--ds-font/, 'lettertype via token: ' + m[1]);
});

console.log(`bezitkader_test: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
