// De startkeuze (eigenaarsbesluit 21-11): bij elke start Alleen of Samen spelen. Pure regel (startchoice.js), de stroom met nepschermen,
// de kaarten met een nep-DOM, en de bedrading voor testruns (main.js, devtools.js, devflags.js). Geen Electron, geen netwerk.
//   node scripts/startchoice_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = { ws: 0, pc: 0, fetch: 0 };
globalThis.WebSocket = class { constructor() { log.ws++; } send() {} close() {} };
globalThis.RTCPeerConnection = class { constructor() { log.pc++; } };
globalThis.fetch = () => { log.fetch++; return Promise.reject(new Error('nep')); };
globalThis.window = globalThis;
globalThis.navigator ??= {};
const opslag = new Map();
globalThis.localStorage = {
  getItem: (k) => (k === 'gde-settings' && opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => { if (k !== 'gde-settings') throw new Error(`test schreef naar ${k}`); opslag.set(k, String(v)); },
  removeItem: (k) => opslag.delete(k),
};
const luisteraars = [];
globalThis.addEventListener = (ev, f) => { if (ev === 'keydown') luisteraars.push(f); };
globalThis.removeEventListener = (ev, f) => { const i = luisteraars.indexOf(f); if (i >= 0) luisteraars.splice(i, 1); };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, body: null, head: null, activeElement: null };

const S = await import('../game/js/settings.js');
const K = await import('../game/js/startchoice.js');
const C = await import('../game/js/onlineconsent.js');
const UI = await import('../game/js/startchoiceui.js');

let n = 0;
const t = async (naam, f) => { try { await f(); n++; } catch (e) { e.message = `${naam}: ${e.message}`; throw e; } };
const zet = (naam, meedoen, keuze = null) => { S.setSetting('onlineNaam', naam); S.setSetting('onlineMeedoen', meedoen); S.setSetting('startKeuze', keuze); };
const nieuwProfiel = () => zet('', null, null);
const oudProfiel = (meedoen = true, keuze = null) => zet('Bouwer', meedoen, keuze);

// Nepschermen: elk scherm schrijft op wat er gevraagd is, en antwoordt zoals de test het wil.
function stroom(plan, antwoorden) {
  const gevraagd = [];
  const samen = [];
  const a = { keuzes: [], toestemming: [], sessie: [], ...antwoorden };
  const deps = {
    plan,
    settings: () => S.getSettings(),
    naam: async () => { gevraagd.push('naam'); C.kiesNaam(a.naam || 'Bouwer'); },
    keuze: async (index) => { gevraagd.push(`keuze:${index}`); return a.keuzes.shift(); },
    toestemming: async () => { gevraagd.push('toestemming'); const ja = a.toestemming.shift(); if (ja) C.geefToestemming(); return ja; },
    sessie: async () => { gevraagd.push('sessie'); return a.sessie.shift(); },
    samen: (rol) => samen.push(rol),
    bewaar: (m) => K.bewaarKeuze(m),
  };
  return { deps, gevraagd, samen };
}

// --- 1. het plan: wat vraagt een start? ---------------------------------------
await t('plan: eerste start vraagt de naam en de keuze; een oud profiel alleen de keuze', () => {
  nieuwProfiel();
  assert.deepEqual(K.startPlan(S.getSettings()), { naam: true, keuze: true, modus: null, reden: '' });
  oudProfiel();
  assert.deepEqual(K.startPlan(S.getSettings()), { naam: false, keuze: true, modus: null, reden: '' });
});
await t('plan: een naam zonder (of met ingetrokken) toestemming krijgt de naamkaart NIET opnieuw; de toestemming komt bij Samen', () => {
  for (const meedoen of [null, false]) {
    oudProfiel(meedoen);
    const p = K.startPlan(S.getSettings());
    assert.equal(p.naam, false, `meedoen=${meedoen}`);
    assert.equal(p.keuze, true);
    assert.equal(K.naKeuze('alleen', S.getSettings()), 'klaar');
    assert.equal(K.naKeuze('samen', S.getSettings()), 'toestemming');
  }
});
await t('plan: een ongeldige bewaarde naam (met de hand bewerkt) vraagt de naamkaart weer, ook bij Samen', () => {
  zet('...', true);
  assert.equal(K.startPlan(S.getSettings()).naam, true);
  assert.equal(K.naKeuze('samen', S.getSettings()), 'naam');
});
await t('plan: testmodus en ?startkeuze=alleen slaan de kaart over; startkeuze=vraag toont hem ook in een testrun', () => {
  nieuwProfiel();
  assert.deepEqual(K.startPlan(S.getSettings(), { testmodus: true }), { naam: false, keuze: false, modus: null, reden: 'testmodus' });
  assert.deepEqual(K.startPlan(S.getSettings(), { vlag: 'alleen' }), { naam: false, keuze: false, modus: 'alleen', reden: 'vlag' });
  assert.deepEqual(K.startPlan(S.getSettings(), { testmodus: true, vlag: 'alleen' }).modus, 'alleen');
  assert.deepEqual(K.startPlan(S.getSettings(), { testmodus: true, vlag: 'vraag' }), { naam: true, keuze: true, modus: null, reden: '' });
});
await t('naKeuze: Alleen is klaar; Samen met naam en toestemming gaat naar de sessiekeuze', () => {
  oudProfiel(true);
  assert.equal(K.naKeuze('alleen'), 'klaar');
  assert.equal(K.naKeuze('samen'), 'sessie');
  assert.equal(K.naKeuze('onzin'), 'klaar', 'een onbekende keuze opent nooit het netwerkpad');
});

// --- 2. voorselectie en bewaren ------------------------------------------------
await t('voorselectie: de laatste keuze staat voorgeselecteerd, standaard Alleen; nooit overslaan', () => {
  oudProfiel(true, null);
  assert.equal(K.voorselectie(S.getSettings()), 0);
  oudProfiel(true, 'samen');
  assert.equal(K.voorselectie(S.getSettings()), 1);
  oudProfiel(true, 'alleen');
  assert.equal(K.voorselectie(S.getSettings()), 0);
  assert.equal(K.startPlan(S.getSettings()).keuze, true, 'een bewaarde keuze slaat de kaart niet over');
});
await t('bewaarKeuze: alleen de twee woorden, onder gde-settings (geen savegame-sleutel)', () => {
  oudProfiel(true, null);
  assert.equal(K.bewaarKeuze('samen'), true);
  assert.equal(JSON.parse(opslag.get('gde-settings')).startKeuze, 'samen');
  assert.equal(K.bewaarKeuze('iets'), false);
  assert.equal(S.getSettings().startKeuze, 'samen');
  S.setSetting('startKeuze', null);
});
await t('instellingen: een ongeldige startKeuze in het bestand wordt null', async () => {
  opslag.set('gde-settings', JSON.stringify({ v: 99, startKeuze: 'overal', onlineMeedoen: true, onlineNaam: 'Bouwer' }));
  const vers = await import(`../game/js/settings.js?herlaad=${Date.now()}`);
  assert.equal(vers.getSettings().startKeuze, null);
  opslag.set('gde-settings', JSON.stringify({ v: 99, startKeuze: 'samen' }));
  const vers2 = await import(`../game/js/settings.js?herlaad=${Date.now() + 1}`);
  assert.equal(vers2.getSettings().startKeuze, 'samen');
});

// --- 3. toetsen ----------------------------------------------------------------
await t('toetsen: pijlen en WASD, 1 en 2, Enter, spatie, Escape en Backspace', () => {
  assert.deepEqual(K.toetsActie('ArrowRight', 0), { focus: 1 });
  assert.deepEqual(K.toetsActie('ArrowLeft', 0), { focus: 1 }, 'rond');
  assert.deepEqual(K.toetsActie('d', 0), { focus: 1 });
  assert.deepEqual(K.toetsActie('a', 1), { focus: 0 });
  assert.deepEqual(K.toetsActie('1', 1), { kies: 'alleen' });
  assert.deepEqual(K.toetsActie('2', 0), { kies: 'samen' });
  assert.deepEqual(K.toetsActie('Enter', 1), { kies: 'samen' });
  assert.deepEqual(K.toetsActie(' ', 0), { kies: 'alleen' });
  assert.deepEqual(K.toetsActie('Escape', 1), { kies: 'alleen' }, 'Escape is de terugweg naar Alleen');
  assert.deepEqual(K.toetsActie('Backspace', 1), { kies: 'alleen' });
  assert.equal(K.toetsActie('Tab', 0), null, 'Tab blijft gewoon werken');
  assert.equal(K.toetsActie('x', 0), null);
});

// --- 4. de stroom: alle paden ---------------------------------------------------
await t('pad: nieuw profiel kiest Alleen: naam, keuze, geen toestemming, geen netwerk, keuze bewaard', async () => {
  nieuwProfiel();
  const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['alleen'] });
  const modus = await K.startVragen(s.deps);
  assert.equal(modus, 'alleen');
  assert.deepEqual(s.gevraagd, ['naam', 'keuze:0']);
  assert.deepEqual(s.samen, []);
  assert.equal(S.getSettings().startKeuze, 'alleen');
  assert.deepEqual([log.ws, log.pc, log.fetch], [0, 0, 0]);
});
await t('pad: de tweede start vraagt de naam niet meer, de keuze wel (met de laatste keuze voorgeselecteerd)', async () => {
  const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['alleen'] });
  await K.startVragen(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:0']);
  S.setSetting('startKeuze', 'samen');
  const s2 = stroom(K.startPlan(S.getSettings()), { keuzes: ['alleen'] });
  await K.startVragen(s2.deps);
  assert.deepEqual(s2.gevraagd, ['keuze:1']);
});
await t('pad: Samen met bewaarde toestemming gaat naar de sessiekeuze (Een spel openen)', async () => {
  oudProfiel(true);
  const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['samen'], sessie: ['host'] });
  assert.equal(await K.startVragen(s.deps), 'samen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'sessie']);
  assert.deepEqual(s.samen, ['host']);
  assert.equal(S.getSettings().startKeuze, 'samen');
});
await t('pad: Meedoen en Openbare sessies komen als gast door', async () => {
  for (const rol of ['gast', 'lijst']) {
    oudProfiel(true);
    const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['samen'], sessie: [rol] });
    await K.startVragen(s.deps);
    assert.deepEqual(s.samen, [rol]);
  }
});
await t('pad: Samen zonder toestemming vraagt eerst de toestemming, dan pas de sessiekeuze', async () => {
  oudProfiel(false);
  const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['samen'], toestemming: [true], sessie: ['gast'] });
  assert.equal(await K.startVragen(s.deps), 'samen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'toestemming', 'sessie'], 'de toestemming staat voor de sessie');
  assert.equal(S.getSettings().onlineMeedoen, true);
});
await t('pad: de toestemming weigeren (Terug) brengt je terug op de keuzekaart; Alleen kan dan nog', async () => {
  oudProfiel(null);
  const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['samen', 'alleen'], toestemming: [false] });
  assert.equal(await K.startVragen(s.deps), 'alleen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'toestemming', 'keuze:0'], 'na Terug staat de kaart er weer');
  assert.equal(S.getSettings().onlineMeedoen, null, 'zonder akkoord blijft de toestemming leeg');
  assert.deepEqual(s.samen, []);
  assert.deepEqual([log.ws, log.pc, log.fetch], [0, 0, 0], 'geen netwerk zonder toestemming');
});
await t('pad: Terug in de sessiekeuze brengt je terug op de keuzekaart', async () => {
  oudProfiel(true);
  const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['samen', 'samen'], sessie: [null, 'host'] });
  await K.startVragen(s.deps);
  assert.equal(s.gevraagd.filter((g) => g.startsWith('keuze')).length, 2);
  assert.deepEqual(s.samen, ['host']);
});
await t('pad: Alleen met ingetrokken toestemming vraagt niets over toestemming', async () => {
  oudProfiel(false);
  const s = stroom(K.startPlan(S.getSettings()), { keuzes: ['alleen'] });
  await K.startVragen(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:0']);
  assert.equal(S.getSettings().onlineMeedoen, false, 'de intrekking blijft staan');
});
await t('pad: testmodus en de vlag vragen niets en bewaren niets', async () => {
  nieuwProfiel();
  for (const opties of [{ testmodus: true }, { vlag: 'alleen' }]) {
    const s = stroom(K.startPlan(S.getSettings(), opties), { keuzes: [] });
    const modus = await K.startVragen(s.deps);
    assert.deepEqual(s.gevraagd, []);
    assert.equal(modus, opties.vlag === 'alleen' ? 'alleen' : null);
    assert.equal(S.getSettings().startKeuze, null);
    assert.equal(S.getSettings().onlineNaam, '', 'geen naam verzonnen');
  }
});
await t('pad: startKeuze=vraag in een testrun toont de kaart en de naamkaart (nieuw profiel)', async () => {
  nieuwProfiel();
  const s = stroom(K.startPlan(S.getSettings(), { testmodus: true, vlag: 'vraag' }), { keuzes: ['alleen'] });
  await K.startVragen(s.deps);
  assert.deepEqual(s.gevraagd, ['naam', 'keuze:0']);
});
await t('de naamkaart blijft verplicht en eenmalig: nooit een weg zonder geldige naam, nooit opnieuw na een geldige', () => {
  nieuwProfiel();
  assert.equal(C.kiesNaam('').ok, false);
  assert.equal(C.moetNaamVragen(), true);
  assert.equal(C.kiesNaam('Bouwer').ok, true);
  assert.equal(C.moetNaamVragen(), false);
  S.setSetting('onlineMeedoen', false); // later ingetrokken in het spelerspaneel
  assert.equal(C.moetNaamVragen(), false, 'de naamkaart komt niet terug');
  assert.equal(C.moetToestemmingVragen(), true);
});
await t('stand van de sessie: zetStartModus onthoudt alleen echte keuzes', () => {
  K.zetStartModus('alleen'); assert.equal(K.startModus(), 'alleen');
  K.zetStartModus('onzin'); assert.equal(K.startModus(), null);
  K.zetStartModus(null); assert.equal(K.startModus(), null);
});

// --- 5. de kaarten: tekst, toegankelijkheid, toetsen ---------------------------
await t('keuzekaart: twee grote knoppen met icoon, toets, uitleg, aria en geen losse toetsnamen', () => {
  const html = UI.startKeuzeHtml({ index: 1 });
  assert.equal((html.match(/<button\b/g) || []).length, 2);
  assert.match(html, /Alleen spelen/);
  assert.match(html, /Samen spelen/);
  assert.match(html, /Speel met vrienden in een eigen, besloten sessie\./);
  assert.match(html, /role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="sk-titel"/);
  assert.match(html, /role="group" aria-label="Kies hoe je speelt/);
  assert.equal((html.match(/aria-describedby="sk-u-/g) || []).length, 2, 'elke knop wijst naar zijn uitleg');
  assert.equal((html.match(/aria-keyshortcuts="[12]"/g) || []).length, 2);
  assert.equal((html.match(/<svg class="ic sk-icoon"[^>]*aria-hidden="true"/g) || []).length, 2, 'Phosphor-iconen, decoratief');
  assert.match(html, /data-keuze="samen"[^>]*data-voorkeur/, 'de voorselectie is gemarkeerd');
  assert.ok(!/\b(Esc|Enter|pijltjes|Spatie)\b/.test(html.replace(/<[^>]*>/g, '')), 'toetsen zijn keycaps, geen woorden: ' + html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
  assert.ok(!/style="[^"]*font-size/.test(html), 'geen eigen maten in de markup');
});
await t('toestemmingskaart: de STUN- en brokertekst, een vinkje, Akkoord en Terug', () => {
  const html = UI.toestemmingHtml();
  assert.match(html, /gaat naar je medespeler en naar de openbare servers/);
  assert.match(html, /STUN-server en openbare brokers/);
  assert.match(html, /class="os-consent-vink"/);
  assert.match(html, /data-geef/);
  assert.match(html, /data-terug/);
  assert.match(html, /role="alert"[^>]*hidden/);
});

// Een nep-DOM die genoeg kan voor openStartKeuze en openToestemming.
function nepDom() {
  const knoppen = ['alleen', 'samen'].map((id, i) => ({ dataset: { keuze: id }, i, focus() { document.activeElement = this; }, addEventListener() {} }));
  const vink = { checked: false, focus() { document.activeElement = vink; } };
  const fout = { hidden: true };
  const klik = {};
  const el = {
    id: '', className: '', innerHTML: '', weg: false, remove() { el.weg = true; },
    querySelectorAll: (sel) => (sel === '.sk-keuze' ? knoppen : []),
    querySelector: (sel) => (sel === '.os-consent-vink' ? vink : sel === '.os-fout' ? fout : null),
    addEventListener(ev, f) { klik[ev] = f; },
  };
  document.createElement = () => el;
  document.body = { appendChild() {}, classList: { toggle() {}, contains: () => false, add() {}, remove() {} }, style: {} };
  return {
    el, knoppen, vink, fout,
    toets(key) { const e = { key, repeat: false, preventDefault() {}, stopPropagation() {} }; luisteraars.slice().forEach((f) => f(e)); const k = { key }; return k; },
    klikOp(selDoel) { klik.click({ target: { closest: (s) => (selDoel.matches(s) ? selDoel.node : null) } }); },
  };
}
await t('keuzekaart in een nep-DOM: de focus start op de voorselectie, 2 kiest Samen, de kaart sluit', async () => {
  const d = nepDom();
  const belofte = UI.openStartKeuze({ index: 1 });
  assert.equal(document.activeElement, d.knoppen[1]);
  d.toets('ArrowLeft');
  assert.equal(document.activeElement, d.knoppen[0]);
  d.toets('2');
  assert.equal(await belofte, 'samen');
  assert.equal(d.el.weg, true);
  assert.equal(luisteraars.length, 0, 'de toetsluisteraar is weg');
});
await t('keuzekaart in een nep-DOM: Escape kiest Alleen; Enter kiest de knop met focus', async () => {
  let d = nepDom();
  let b = UI.openStartKeuze({ index: 1 });
  d.toets('Escape');
  assert.equal(await b, 'alleen');
  d = nepDom();
  b = UI.openStartKeuze({ index: 1 });
  d.toets('Enter');
  assert.equal(await b, 'samen');
});
await t('toestemmingskaart in een nep-DOM: zonder vinkje geen akkoord; met vinkje bewaard; Escape is Terug', async () => {
  oudProfiel(false);
  let d = nepDom();
  let b = UI.openToestemming();
  d.klikOp({ matches: (s) => s.includes('data-geef'), node: { hasAttribute: (a) => a === 'data-geef' } });
  assert.equal(d.fout.hidden, false, 'de fout verschijnt');
  assert.equal(S.getSettings().onlineMeedoen, false, 'niets bewaard zonder vinkje');
  d.vink.checked = true;
  d.klikOp({ matches: (s) => s.includes('data-geef'), node: { hasAttribute: (a) => a === 'data-geef' } });
  assert.equal(await b, true);
  assert.equal(S.getSettings().onlineMeedoen, true);
  assert.equal(S.getSettings().onlineNaam, 'Bouwer', 'de naam blijft zoals hij was');
  oudProfiel(false);
  d = nepDom();
  b = UI.openToestemming();
  d.toets('Escape');
  assert.equal(await b, false);
  assert.equal(S.getSettings().onlineMeedoen, false);
  assert.deepEqual([log.ws, log.pc, log.fetch], [0, 0, 0]);
});

// --- 6. bedrading: testruns slaan de kaart over; geen netwerk in de keuze ------
const lees = (p) => fs.readFileSync(path.join(root, p), 'utf8');
await t('main.js: dezelfde testvlaggen slaan de kaart over; Alleen houdt de sessiezoektocht dicht', () => {
  const m = lees('game/js/main.js');
  const lijst = /const testmodus = !!\(([^)]*)\);/.exec(m);
  assert.ok(lijst, 'main.js telt de testmodus');
  for (const f of ['noattract', 'storytest', 'stil', 'trailer', 'preview', 'benchmark', 'perf', 'spotsonly', 'autoplay', 'menutest']) assert.ok(lijst[1].includes(`FLAGS.${f}`), `FLAGS.${f} slaat de kaart over`);
  assert.match(m, /startPlan\(getSettings\(\), \{ testmodus, vlag: FLAGS\.startkeuze \}\)/);
  assert.match(m, /startModus\(\) !== 'alleen'\) sessionBootTick/);
  assert.match(m, /magOnline\(\) && startModus\(\) !== 'alleen'/);
  assert.match(m, /FLAGS\.startkeuze === 'alleen'\) zetStartModus\('alleen'\)/);
});
await t('devtools.js: elke testrun krijgt startkeuze=alleen (behalve --coop), GDE_STARTKEUZE=vraag toont de kaart', () => {
  const d = lees('desktop/devtools.js');
  assert.match(d, /GDE_STARTKEUZE === 'vraag' \? 'startkeuze=vraag' : isTestRun && !hasFlag\('--coop'\) && 'startkeuze=alleen'/);
  assert.match(d, /const isTestRun = !!\(TRAILER \|\| CLIP \|\| hasFlag\('--autoplay'\) \|\| BENCH \|\| hasFlag\('--stil'\) \|\| hasFlag\('--smoke-test'\) \|\| hasFlag\('--story-test'\)/);
});
await t('de keuzebestanden gebruiken geen netwerk (constitution 4 en 10)', () => {
  for (const f of ['game/js/startchoice.js', 'game/js/startchoiceui.js']) {
    const bron = lees(f).replace(/\/\/.*$/gm, '');
    assert.ok(!/WebSocket|RTCPeerConnection|\bfetch\(|XMLHttpRequest|sendBeacon|EventSource/.test(bron), `${f} raakt het netwerk niet aan`);
    assert.ok(!/localStorage|sessionStorage/.test(bron), `${f} schrijft alleen via setSetting`);
  }
});
await t('css: tekst op de keuzekaart nooit onder 13 px, focusring aanwezig, beweging uit bij Beweging beperken', () => {
  const css = lees('game/js/onlineconsent.css');
  const stuk = css.slice(css.indexOf('/* Startkeuze'));
  for (const m of stuk.matchAll(/font-size:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 13, `font-size ${m[1]}px`);
  assert.match(stuk, /\.sk-keuze:focus-visible \{ outline: var\(--ds-focus-dikte\)/);
  assert.match(stuk, /prefers-reduced-motion: reduce/);
  assert.match(stuk, /html\.reduce-motion \.sk-keuze \{ transition: none; \}/);
});
await t('devflags: startkeuze staat in FLAGS en FLAG_DOCS', async () => {
  const f = await import('../game/js/devflags.js');
  assert.ok('startkeuze' in f.FLAGS && typeof f.FLAG_DOCS.startkeuze === 'string');
});

console.log(`startchoice_test: ${n}/${n} ok`);
process.exit(0);
