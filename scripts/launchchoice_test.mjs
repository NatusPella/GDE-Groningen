// De startkeuze (eigenaarsbesluit 21-11): bij elke start Alleen of Samen spelen. Pure regel (launchchoice.js), de stroom met nepschermen,
// de kaarten met een nep-DOM, en de bedrading voor testruns (main.js, devtools.js, devflags.js). Geen Electron, geen netwerk.
//   node scripts/launchchoice_test.mjs
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
const K = await import('../game/js/launchchoice.js');
const C = await import('../game/js/onlineconsent.js');
const UI = await import('../game/js/launchchoiceui.js');

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
    naam: async () => { gevraagd.push('naam'); if (a.naamTerug && a.naamTerug.shift()) return false; C.kiesNaam(a.naam || 'Bouwer'); return true; },
    keuze: async (index) => { gevraagd.push(`keuze:${index}`); return a.keuzes.shift(); },
    toestemming: async () => { gevraagd.push('toestemming'); const ja = a.toestemming.shift(); if (ja) C.geefToestemming(); return ja; },
    sessie: async (voorkeur) => { gevraagd.push('sessie'); (a.voorkeuren ||= []).push(voorkeur); return a.sessie.shift(); },
    samen: (rol) => samen.push(rol),
    bewaar: (m) => K.bewaarKeuze(m),
    bewaarRol: (r) => K.bewaarRol(r),
  };
  return { deps, gevraagd, samen, voorkeuren: () => a.voorkeuren || [] };
}

// --- 1. het plan: wat vraagt een start? ---------------------------------------
await t('plan: bij de allereerste start alleen de keuzekaart, geen naamscherm; een oud profiel ook', () => {
  nieuwProfiel();
  assert.deepEqual(K.launchPlan(S.getSettings()), { naam: false, keuze: true, modus: null, reden: '' });
  oudProfiel();
  assert.deepEqual(K.launchPlan(S.getSettings()), { naam: false, keuze: true, modus: null, reden: '' });
});
await t('plan: een naam zonder (of met ingetrokken) toestemming krijgt alleen de toestemmingskaart bij Samen, de naam blijft', () => {
  for (const meedoen of [null, false]) {
    oudProfiel(meedoen);
    const p = K.launchPlan(S.getSettings());
    assert.equal(p.naam, false, `meedoen=${meedoen}`);
    assert.equal(p.keuze, true);
    assert.equal(K.naKeuze('alleen', S.getSettings()), 'klaar');
    assert.equal(K.naKeuze('samen', S.getSettings()), 'toestemming');
  }
});
await t('plan: een ongeldige bewaarde naam (met de hand bewerkt) vraagt bij Samen de kaart met naam en akkoord', () => {
  zet('...', true);
  assert.equal(K.launchPlan(S.getSettings()).naam, false, 'bij de start nooit');
  assert.equal(K.naKeuze('samen', S.getSettings()), 'naam');
});
await t('plan: testmodus en ?startkeuze=alleen slaan de kaart over; startkeuze=vraag toont hem ook in een testrun', () => {
  nieuwProfiel();
  assert.deepEqual(K.launchPlan(S.getSettings(), { testmodus: true }), { naam: false, keuze: false, modus: null, reden: 'testmodus' });
  assert.deepEqual(K.launchPlan(S.getSettings(), { vlag: 'alleen' }), { naam: false, keuze: false, modus: 'alleen', reden: 'vlag' });
  assert.deepEqual(K.launchPlan(S.getSettings(), { testmodus: true, vlag: 'alleen' }).modus, 'alleen');
  assert.deepEqual(K.launchPlan(S.getSettings(), { testmodus: true, vlag: 'vraag' }), { naam: false, keuze: true, modus: null, reden: '' });
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
  assert.equal(K.launchPlan(S.getSettings()).keuze, true, 'een bewaarde keuze slaat de kaart niet over');
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
await t('pad: nieuw profiel kiest Alleen: alleen de keuze, geen naam, geen akkoord, geen netwerk, keuze bewaard', async () => {
  nieuwProfiel();
  const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['alleen'] });
  const modus = await K.askLaunchChoice(s.deps);
  assert.equal(modus, 'alleen');
  assert.deepEqual(s.gevraagd, ['keuze:0']);
  assert.equal(S.getSettings().onlineNaam, '');
  assert.notEqual(S.getSettings().onlineMeedoen, true);
  assert.deepEqual(s.samen, []);
  assert.equal(S.getSettings().startKeuze, 'alleen');
  assert.deepEqual([log.ws, log.pc, log.fetch], [0, 0, 0]);
});
await t('pad: de tweede start vraagt de naam niet meer, de keuze wel (met de laatste keuze voorgeselecteerd)', async () => {
  const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['alleen'] });
  await K.askLaunchChoice(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:0']);
  S.setSetting('startKeuze', 'samen');
  const s2 = stroom(K.launchPlan(S.getSettings()), { keuzes: ['alleen'] });
  await K.askLaunchChoice(s2.deps);
  assert.deepEqual(s2.gevraagd, ['keuze:1']);
});
await t('pad: Samen met bewaarde toestemming gaat naar de sessiekeuze (Een spel openen)', async () => {
  oudProfiel(true);
  const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen'], sessie: ['host'] });
  assert.equal(await K.askLaunchChoice(s.deps), 'samen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'sessie']);
  assert.deepEqual(s.samen, ['host']);
  assert.equal(S.getSettings().startKeuze, 'samen');
});
await t('pad: Meedoen en Openbare sessies komen als gast door', async () => {
  for (const rol of ['gast', 'lijst']) {
    oudProfiel(true);
    const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen'], sessie: [rol] });
    await K.askLaunchChoice(s.deps);
    assert.deepEqual(s.samen, [rol]);
  }
});
await t('pad: Samen zonder toestemming vraagt eerst de toestemming, dan pas de sessiekeuze', async () => {
  oudProfiel(false);
  const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen'], toestemming: [true], sessie: ['gast'] });
  assert.equal(await K.askLaunchChoice(s.deps), 'samen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'toestemming', 'sessie'], 'de toestemming staat voor de sessie');
  assert.equal(S.getSettings().onlineMeedoen, true);
});
await t('pad: de toestemming weigeren (Terug) brengt je terug op de keuzekaart; Alleen kan dan nog', async () => {
  oudProfiel(null);
  const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen', 'alleen'], toestemming: [false] });
  assert.equal(await K.askLaunchChoice(s.deps), 'alleen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'toestemming', 'keuze:0'], 'na Terug staat de kaart er weer');
  assert.equal(S.getSettings().onlineMeedoen, null, 'zonder akkoord blijft de toestemming leeg');
  assert.deepEqual(s.samen, []);
  assert.deepEqual([log.ws, log.pc, log.fetch], [0, 0, 0], 'geen netwerk zonder toestemming');
});
await t('pad: Terug in de sessiekeuze brengt je terug op de keuzekaart', async () => {
  oudProfiel(true);
  const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen', 'samen'], sessie: [null, 'host'] });
  await K.askLaunchChoice(s.deps);
  assert.equal(s.gevraagd.filter((g) => g.startsWith('keuze')).length, 2);
  assert.deepEqual(s.samen, ['host']);
});
await t('pad: Alleen met ingetrokken toestemming vraagt niets over toestemming', async () => {
  oudProfiel(false);
  const s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['alleen'] });
  await K.askLaunchChoice(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:0']);
  assert.equal(S.getSettings().onlineMeedoen, false, 'de intrekking blijft staan');
});
await t('pad: testmodus en de vlag vragen niets en bewaren niets', async () => {
  nieuwProfiel();
  for (const opties of [{ testmodus: true }, { vlag: 'alleen' }]) {
    const s = stroom(K.launchPlan(S.getSettings(), opties), { keuzes: [] });
    const modus = await K.askLaunchChoice(s.deps);
    assert.deepEqual(s.gevraagd, []);
    assert.equal(modus, opties.vlag === 'alleen' ? 'alleen' : null);
    assert.equal(S.getSettings().startKeuze, null);
    assert.equal(S.getSettings().onlineNaam, '', 'geen naam verzonnen');
  }
});
await t('pad: startKeuze=vraag in een testrun toont de kaart (nieuw profiel), zonder naamscherm', async () => {
  nieuwProfiel();
  const s = stroom(K.launchPlan(S.getSettings(), { testmodus: true, vlag: 'vraag' }), { keuzes: ['alleen'] });
  await K.askLaunchChoice(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:0']);
});
await t('eerste Samen: de kaart met naam en akkoord, daarna onthouden; Terug brengt je terug naar de keuze; ingetrokken vraagt alleen het akkoord', async () => {
  nieuwProfiel();
  let s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['alleen'] });
  await K.askLaunchChoice(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:0']);
  assert.equal(S.getSettings().onlineNaam, '', 'Alleen: geen naam');
  nieuwProfiel();
  s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen', 'alleen'], naamTerug: [true] });
  assert.equal(await K.askLaunchChoice(s.deps), 'alleen', 'Terug op de naamkaart: alsnog Alleen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'naam', 'keuze:0']);
  assert.notEqual(S.getSettings().onlineMeedoen, true);
  nieuwProfiel();
  s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen'], sessie: ['host'] });
  assert.equal(await K.askLaunchChoice(s.deps), 'samen');
  assert.deepEqual(s.gevraagd, ['keuze:0', 'naam', 'sessie'], 'naam en akkoord op één kaart, geen aparte toestemmingskaart');
  assert.equal(S.getSettings().onlineNaam, 'Bouwer');
  assert.equal(S.getSettings().onlineMeedoen, true, 'onthouden');
  s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen'], sessie: ['gast'] });
  await K.askLaunchChoice(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:1', 'sessie'], 'de tweede keer niets nieuws');
  S.setSetting('onlineMeedoen', false); // ingetrokken in Instellingen
  s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen'], toestemming: [true], sessie: ['host'] });
  await K.askLaunchChoice(s.deps);
  assert.deepEqual(s.gevraagd, ['keuze:1', 'toestemming', 'sessie'], 'alleen het akkoord, niet de naam');
  assert.equal(S.getSettings().onlineNaam, 'Bouwer');
});
await t('de kaart blijft verplicht voor Samen: nooit een weg zonder geldige naam en akkoord, nooit opnieuw na een geldige', () => {
  nieuwProfiel();
  assert.equal(C.kiesNaam('').ok, false);
  assert.equal(C.moetNaamVragen(), true);
  assert.equal(C.kiesNaam('Bouwer', { consent: false }).ok, false);
  assert.equal(C.kiesNaam('Bouwer').ok, true);
  assert.equal(C.moetNaamVragen(), false);
  S.setSetting('onlineMeedoen', false); // later ingetrokken in Instellingen
  assert.equal(C.moetNaamVragen(), false, 'de naam wordt niet opnieuw gevraagd');
  assert.equal(C.moetToestemmingVragen(), true);
});
await t('stand van de sessie: applyLaunchMode onthoudt alleen echte keuzes', () => {
  K.applyLaunchMode('alleen'); assert.equal(K.getLaunchMode(), 'alleen');
  K.applyLaunchMode('onzin'); assert.equal(K.getLaunchMode(), null);
  K.applyLaunchMode(null); assert.equal(K.getLaunchMode(), null);
});

// --- 5. de kaarten: tekst, toegankelijkheid, toetsen ---------------------------
await t('keuzekaart: twee grote knoppen met icoon, toets, uitleg, aria en geen losse toetsnamen', () => {
  const html = UI.launchChoiceHtml({ index: 1 });
  assert.equal((html.match(/<button\b/g) || []).length, 2);
  assert.match(html, /Alleen spelen/);
  assert.match(html, /Samen spelen/);
  assert.match(html, /Met vrienden, in een besloten sessie./);
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
  assert.match(html, /class="m-sw os-consent-vink"/);
  assert.match(html, /data-geef/);
  assert.match(html, /data-terug/);
  assert.match(html, /role="alert"[^>]*hidden/);
  // #1225 (hertest 24-11): een schakelaar (m-sw) zoals de naamkaart en de toetsen in de knoppen
  assert.match(html, /data-geef aria-keyshortcuts="Enter">[^<]*<span class="sk-toets-in">/);
  assert.match(html, /data-terug aria-keyshortcuts="Escape">[^<]*<span class="sk-toets-in">/);
});

// Een nep-DOM die genoeg kan voor openLaunchChoice en openToestemming.
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
  const belofte = UI.openLaunchChoice({ index: 1 });
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
  let b = UI.openLaunchChoice({ index: 1 });
  d.toets('Escape');
  assert.equal(await b, 'alleen');
  d = nepDom();
  b = UI.openLaunchChoice({ index: 1 });
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
  // 22-11: één centrale regel (launchchoice.js launchKind/skipStartChoice); de vlaggenlijst staat in AUTOMATION_FLAGS
  assert.match(m, /const testmodus = launchKind\(FLAGS\) !== 'player';/);
  assert.match(m, /launchPlan\(getSettings\(\), \{ testmodus, vlag: FLAGS\.startkeuze, benchmark: /);
  assert.match(m, /const vraagOnline = !skipStartChoice\(FLAGS, /);
  for (const f of ['noattract', 'storytest', 'stil', 'trailer', 'preview', 'benchmark', 'perf', 'spotsonly', 'autoplay', 'menutest']) assert.ok(K.AUTOMATION_FLAGS.includes(f), `${f} slaat de kaart over`);
  assert.match(m, /getLaunchMode\(\) !== 'alleen'\) sessionBootTick/);
  assert.match(m, /magOnline\(\) && getLaunchMode\(\) !== 'alleen'/);
  assert.match(m, /FLAGS\.startkeuze === 'alleen' \|\| benchStart\) applyLaunchMode\('alleen'\)/);
});
await t('devtools.js: elke testrun krijgt startkeuze=alleen (behalve --coop), GDE_STARTKEUZE=vraag toont de kaart', () => {
  const d = lees('desktop/devtools.js');
  assert.match(d, /GDE_STARTKEUZE === 'vraag' \? 'startkeuze=vraag' : isTestRun && !hasFlag\('--coop'\) && 'startkeuze=alleen'/);
  assert.match(d, /const isTestRun = !!\(TRAILER \|\| CLIP \|\| hasFlag\('--autoplay'\) \|\| BENCH \|\| hasFlag\('--stil'\) \|\| hasFlag\('--smoke-test'\) \|\| hasFlag\('--story-test'\)/);
});
await t('de keuzebestanden gebruiken geen netwerk (constitution 4 en 10)', () => {
  for (const f of ['game/js/launchchoice.js', 'game/js/launchchoiceui.js']) {
    const bron = lees(f).replace(/\/\/.*$/gm, '');
    assert.ok(!/WebSocket|RTCPeerConnection|\bfetch\(|XMLHttpRequest|sendBeacon|EventSource/.test(bron), `${f} raakt het netwerk niet aan`);
    assert.ok(!/localStorage|sessionStorage/.test(bron), `${f} schrijft alleen via setSetting`);
  }
});
await t('css: tekst op de keuzekaart nooit onder 13 px, focusring aanwezig, beweging uit bij Beweging beperken', () => {
  const css = lees('game/js/onlineconsent.css');
  const stuk = css.slice(css.indexOf('/* Startkeuze'));
  for (const m of stuk.matchAll(/font-size:\s*(\d+)px/g)) assert.ok(Number(m[1]) >= 13, `font-size ${m[1]}px`);
  assert.match(stuk, /\.sk-keuze:focus, \.sk-keuze:focus-visible \{ background: var\(--ds-zeef-primair\)[^}]*outline: var\(--ds-focus-dikte\)/, 'de knop met focus is de gele hoofdknop met de DS-focusring');
  assert.doesNotMatch(stuk, /\.sk-keuze\[data-keuze="samen"\] \{ background/, 'Samen is niet altijd de gele hoofdknop');
  assert.match(css, /body:has\(#loading:not\(\.done\)\) \.os-overlay \{ place-items: end center;/, 'de kaart staat onderaan zolang het logo van het laadscherm er staat');
  assert.doesNotMatch(css, /^\.os-overlay \{ place-items: end center;/m, '#1228: zonder laadscherm staat de kaart niet altijd onderaan');
  assert.match(css, /\.os-overlay \{\s*position: fixed; inset: 0;[^}]*place-items: center;/, '#1228: de basis is gecentreerd');
  assert.match(css, /body:has\(#online-start\) #loading \.bt-load \{ visibility: hidden; \}/, 'de laadstatus lekt niet onder de kaart door');
  assert.match(stuk, /prefers-reduced-motion: reduce/);
  assert.match(stuk, /html\.reduce-motion \.sk-keuze \{ transition: none; \}/);
});
await t('devflags: startkeuze staat in FLAGS en FLAG_DOCS', async () => {
  const f = await import('../game/js/devflags.js');
  assert.ok('startkeuze' in f.FLAGS && typeof f.FLAG_DOCS.startkeuze === 'string');
});

await t('flow: de sessiekeuze onthoudt de laatste rol (een terugkerende gast drukt alleen Enter)', async () => {
  oudProfiel(true);
  S.setSetting('samenRol', null);
  assert.equal(K.rolVoorkeur(), 'host', 'zonder geschiedenis: Een spel openen');
  let s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen', 'samen'], sessie: [null, 'gast'] });
  await K.askLaunchChoice(s.deps);
  assert.equal(S.getSettings().samenRol, 'gast', 'een gelukte rol wordt bewaard');
  assert.deepEqual(s.voorkeuren(), ['host', 'host'], 'Terug bewaart niets');
  s = stroom(K.launchPlan(S.getSettings()), { keuzes: ['samen'], sessie: ['gast'] });
  await K.askLaunchChoice(s.deps);
  assert.deepEqual(s.voorkeuren(), ['gast'], 'de volgende keer staat Meedoen al gekozen');
  assert.equal(K.bewaarRol('hacker'), false);
  S.setSetting('samenRol', null);
});
await t('instellingen: een ongeldige samenRol in het bestand wordt null', async () => {
  opslag.set('gde-settings', JSON.stringify({ v: 99, samenRol: 'overal' }));
  const vers = await import('../game/js/settings.js?samenrol=1');
  assert.equal(vers.getSettings().samenRol, null);
  opslag.delete('gde-settings');
});

console.log(`launchchoice_test: ${n}/${n} ok`);
process.exit(0);
