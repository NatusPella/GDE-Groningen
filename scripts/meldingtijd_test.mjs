// Meldingen: duur en aflopend balkje (game/js/noticetiming.js, melding.js, ds-melding.css; DESIGN_SYSTEM.md "Meldingen: duur en aflopend balkje").
// Puur deel (duurfunctie, klassen, timer met pauze en hover, wachtrij, prioriteit) en de DOM-kant met een nagebootst document.
//   node scripts/meldingtijd_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DURATION_CLASSES, NOTICE_MIN_S, NOTICE_MAX_S, readingTime, toClass, classLabel, noticeDuration, cardDuration,
  timerHeld, makeTimer, precedence, queuePlan, queueDuration, shortening, NOTICE_TYPES,
} from '../game/js/noticetiming.js';
import { noticeBar, runNoticeTimer, adjustRemaining } from '../game/js/melding.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
let n = 0, fouten = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fouten++; console.log(`FOUT ${naam}${info !== '' ? ` (${JSON.stringify(info)})` : ''}`); } };

// ---- de duurfunctie: 2 s + tekens / 15, tussen 4 en 10 s ----
ok(DURATION_CLASSES.kort === 4 && DURATION_CLASSES.normaal === 6 && DURATION_CLASSES.lang === 9, 'de drie klassen zijn 4, 6 en 9 s');
ok(readingTime('') === NOTICE_MIN_S && readingTime('Moi') === NOTICE_MIN_S, 'een korte tekst blijft op de minimumtijd (4 s)');
ok(readingTime('x'.repeat(60)) === 6, '60 tekens: 2 + 60/15 = 6 s', readingTime('x'.repeat(60)));
ok(readingTime('x'.repeat(105)) === 9, '105 tekens: 9 s');
ok(readingTime('x'.repeat(900)) === NOTICE_MAX_S, 'een heel lange tekst stopt bij 10 s');
ok(readingTime(null) === NOTICE_MIN_S && readingTime(undefined) === NOTICE_MIN_S, 'geen tekst valt terug op het minimum');
let eerder = 0, stijgend = true;
for (let len = 0; len <= 400; len += 5) { const d = readingTime('x'.repeat(len)); if (d < eerder) stijgend = false; eerder = d; }
ok(stijgend, 'langere tekst is nooit korter');

// ---- klassen: alles valt op 4, 6, 9 of 10 ----
ok(toClass(1) === 4 && toClass(4) === 4 && toClass(4.01) === 6 && toClass(6) === 6 && toClass(7) === 9 && toClass(9) === 9 && toClass(9.5) === 10 && toClass(30) === 10, 'toClass rondt omhoog af');
ok(toClass(NaN) === 4 && toClass(undefined) === 4, 'onzin geeft de korte klas');
ok(classLabel(5) === 'normaal' && classLabel(12) === 'max', 'classLabel');
const alle = new Set();
for (let len = 0; len <= 500; len += 3) for (const klas of [null, 'kort', 'normaal', 'lang']) alle.add(noticeDuration({ tekst: 'x'.repeat(len), klas }));
ok([...alle].every((d) => [4, 6, 9, 10].includes(d)), 'noticeDuration geeft alleen klasduren', [...alle]);
ok(noticeDuration({ tekst: 'Moi', klas: 'lang' }) === 9, 'een klas zet een ondergrens');
ok(noticeDuration({ tekst: 'x'.repeat(200), klas: 'kort' }) === 10, 'de tekst verlengt een korte klas: een zin wordt nooit afgekapt');
ok(noticeDuration({ tekst: 'Moi', duur: 7 }) === 9, 'een opgegeven duur telt mee (naar boven afgerond)');
ok(noticeDuration({ tekst: 'Moi', duur: 99 }) === 10, 'een opgegeven duur stopt bij het maximum');

// ---- de duur van een HUD-kaart sluit aan op cardtime.js (leesstand) ----
ok(cardDuration({ textSeconds: 1 }) === 4 && cardDuration({ textSeconds: 4 }) === 6 && cardDuration({ textSeconds: 60 }) === 10, 'cardDuration: klasseduren uit de oude formule', [cardDuration({ textSeconds: 4 })]);
ok(cardDuration({ textSeconds: 4, mode: 'ruim' }) > cardDuration({ textSeconds: 4 }) && cardDuration({ textSeconds: 60, mode: 'ruim' }) <= NOTICE_MAX_S * 1.8, 'ruim rekt de klas op, met een grens');
ok(cardDuration({ textSeconds: 4, mode: 'geen' }) === cardDuration({ textSeconds: 4 }), 'geen verandert de duur niet');

// ---- de timer: pauze, menu, film, hover ----
ok(!timerHeld({}) && timerHeld({ pauze: true }) && timerHeld({ menu: true }) && timerHeld({ film: true }) && timerHeld({ hover: true }), 'stil bij pauze, menu, film en hover');
{
  const t = makeTimer(6);
  ok(t.voortgang === 1 && t.rest === 6 && !t.klaar, 'een nieuwe timer staat vol');
  t.tik(3);
  ok(t.rest === 3 && t.voortgang === 0.5, 'halverwege is de balk half');
  ok(t.tik(1, { menu: true }) === false && t.rest === 3, 'in het menu loopt de tijd niet');
  ok(t.tik(1, { film: true }) === false && t.rest === 3, 'tijdens een film loopt de tijd niet');
  ok(t.tik(1, { pauze: true }) === false && t.rest === 3, 'bij pauze loopt de tijd niet');
  ok(t.tik(5, { hover: true }) === false && t.rest === 3, 'hover houdt vast');
  ok(t.tik(1, {}) === true && t.rest === 2, 'daarna loopt hij door');
  t.tik(10);
  ok(t.rest === 0 && t.klaar && t.voortgang === 0, 'op nul is de melding klaar, nooit negatief');
  ok(t.tik(-1) === false && t.tik(NaN) === false, 'een negatieve of ontbrekende dt doet niets');
  const v = makeTimer(4); v.tik(3); v.ververs(6);
  ok(v.rest === 6 && v.voortgang === 1, 'dezelfde melding opnieuw ververst de tijd');
  const k = makeTimer(Infinity);
  ok(k.kritiek && k.voortgang === 1 && !k.klaar && k.tik(100) === false, 'een kritieke melding loopt niet af');
  k.sluit();
  ok(k.klaar, 'een kritieke melding sluit alleen met sluit()');
  ok(makeTimer(6, { kritiek: true }).kritiek, 'kritiek: true kan ook los van de duur');
  ok(makeTimer(NaN).rest === NOTICE_MIN_S, 'een onzinnige duur wordt de korte klas');
}

// ---- prioriteit en wachtrij ----
{
  const l = [{ id: 'tip', prio: 1, at: 1 }, { id: 'gevaar', prio: 5, at: 3 }, { id: 'oudtip', prio: 1, at: 0 }, { id: 'fout', kritiek: true, prio: 0, at: 9 }];
  ok([...l].sort(precedence).map((m) => m.id).join() === 'fout,gevaar,oudtip,tip', 'kritiek eerst, dan prio, dan de oudste', [...l].sort(precedence).map((m) => m.id));
  const p = queuePlan({ zichtbaar: [], wachtend: l, max: 1 });
  ok(p.toon.join() === 'fout' && p.wacht.join() === 'gevaar,oudtip,tip', 'hooguit max zichtbaar, de rest wacht in volgorde');
  const p2 = queuePlan({ zichtbaar: [{ id: 'a' }], wachtend: l, max: 1 });
  ok(p2.toon.length === 0 && p2.wacht.length === 4, 'is er al een zichtbaar, dan wacht alles');
  const p3 = queuePlan({ zichtbaar: [{ id: 'a', weg: true }], wachtend: l, max: 2 });
  ok(p3.toon.length === 2, 'een melding die weggaat telt niet mee');
  ok(queuePlan({}).toon.length === 0, 'leeg is leeg');
  ok(queueDuration(9, 1) === 9 && queueDuration(9, 2) === 4 && queueDuration(4, 5) === 4, 'bij twee of meer wachtenden is de duur kort');
  ok(queueDuration(Infinity, 5) === Infinity && queueDuration(9, 5, { kritiek: true }) === 9, 'kritiek wordt nooit ingekort');
  ok(shortening(8, 5, 1) === 1 && shortening(8, 2, 1) === 8 && shortening(8, 5, 0) === 8, 'een lopende melding wordt pas ingekort na de readingTime, en alleen als er een wacht');
}

// ---- de DOM-kant, met een nagebootst document ----
class Lijst { constructor() { this.s = new Set(); } add(...k) { k.forEach((x) => this.s.add(x)); } remove(...k) { k.forEach((x) => this.s.delete(x)); } contains(k) { return this.s.has(k); } toggle(k, aan) { if (aan === undefined) aan = !this.s.has(k); if (aan) this.s.add(k); else this.s.delete(k); return aan; } }
class El {
  constructor(doc, tag = 'div') { this.ownerDocument = doc; this.tag = tag; this.classList = new Lijst(); this.kinderen = []; this.stijl = {}; this.style = { setProperty: (k, v) => { this.stijl[k] = v; } }; this.listeners = {}; this.offsetWidth = 1; this.attrs = {}; }
  set className(v) { this.classList = new Lijst(); v.split(/\s+/).filter(Boolean).forEach((k) => this.classList.add(k)); }
  get className() { return [...this.classList.s].join(' '); }
  setAttribute(k, v) { this.attrs[k] = v; }
  appendChild(k) { this.kinderen.push(k); k.ouder = this; return k; }
  remove() { if (this.ouder) this.ouder.kinderen = this.ouder.kinderen.filter((x) => x !== this); }
  querySelector(sel) { const m = /^:scope > \.(\S+)$/.exec(sel) || /^\.(\S+)$/.exec(sel); return m ? this.kinderen.find((k) => k.classList.contains(m[1])) || null : null; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  removeEventListener(t, f) { this.listeners[t] = (this.listeners[t] || []).filter((x) => x !== f); }
  uit(t) { (this.listeners[t] || []).forEach((f) => f()); }
}
const maakDoc = ({ menu = false, film = false } = {}) => {
  const doc = { menu, film };
  doc.createElement = (t) => new El(doc, t);
  doc.body = new El(doc, 'body');
  doc.querySelector = (sel) => (sel === '#pause-menu.visible' && doc.menu ? new El(doc) : null);
  Object.defineProperty(doc, 'film', { get() { return doc.body.classList.contains('cine-hide-hud'); } });
  return doc;
};
{
  const doc = maakDoc();
  const el = new El(doc);
  const balk = noticeBar(el, { duur: 6 });
  ok(balk && balk.classList.contains('ds-melding__tijd') && el.classList.contains('ds-melding') && el.classList.contains('ds-melding--loopt'), 'noticeBar zet het balkje en de klassen');
  ok(el.stijl['--ds-melding-duur'] === '6s', 'de duur staat op de melding (een token, geen letterlijke tijd in de css)');
  ok(balk.attrs['aria-hidden'] === 'true', 'het balkje is voor de schermlezer verborgen (de tekst blijft)');
  noticeBar(el, { duur: 9 });
  ok(el.kinderen.filter((k) => k.classList.contains('ds-melding__tijd')).length === 1, 'een tweede balkje vervangt het eerste (een ververste melding start opnieuw)');
  ok(el.stijl['--ds-melding-duur'] === '9s', 'de nieuwe duur staat erop');
  noticeBar(el, { duur: 6, soort: 'waarschuwing' });
  ok(el.classList.contains('ds-melding--waarschuwing'), 'waarschuwing: rood balkje');
  noticeBar(el, { duur: 6, soort: 'bord' });
  ok(!el.classList.contains('ds-melding--waarschuwing') && !el.classList.contains('ds-melding--donker'), 'bord is de standaard (bordgroen, geen extra klasse)');
  const kr = new El(doc);
  ok(noticeBar(kr, { kritiek: true }) === null && kr.classList.contains('ds-melding--kritiek') && !kr.kinderen.length, 'een kritieke melding krijgt geen balkje');
  ok(noticeBar(new El(doc), { duur: Infinity }) === null, 'duur Infinity is ook kritiek');
  ok(noticeBar(null) === null, 'zonder element gebeurt er niets');
  // een melding die eerst kritiek was en nu tijdelijk is, verliest de kritiek-klas
  noticeBar(kr, { duur: 4 });
  ok(!kr.classList.contains('ds-melding--kritiek') && kr.kinderen.length === 1, 'kritiek wordt tijdelijk: de klas gaat eraf, het balkje komt');
}
// de timer met nagebootste klok: de intervals lopen we met de hand
{
  let nu = 0;
  const echtDate = Date.now;
  Date.now = () => nu;
  const echtInterval = globalThis.setInterval, echtClear = globalThis.clearInterval;
  globalThis.setInterval = () => 1; globalThis.clearInterval = () => {};
  try {
    const doc = maakDoc();
    const el = new El(doc);
    let klaar = 0;
    const m = runNoticeTimer(el, { duur: 4, onKlaar: () => { klaar++; }, hover: true });
    ok(el.classList.contains('ds-melding--hover') && !m.timer.kritiek, 'hover maakt de melding aanwijsbaar');
    nu += 1000; m.tik();
    ok(Math.abs(m.timer.rest - 3) < 1e-9 && !el.classList.contains('ds-melding--pauze'), 'de timer loopt in seconden');
    el.uit('mouseenter'); nu += 2000; m.tik();
    ok(Math.abs(m.timer.rest - 3) < 1e-9 && el.classList.contains('ds-melding--pauze'), 'hover houdt de timer vast (en het balkje, via ds-melding--pauze)');
    el.uit('mouseleave'); nu += 1000; m.tik();
    ok(Math.abs(m.timer.rest - 2) < 1e-9 && !el.classList.contains('ds-melding--pauze'), 'na de hover loopt hij door');
    doc.menu = true; nu += 5000; m.tik();
    ok(Math.abs(m.timer.rest - 2) < 1e-9 && el.classList.contains('ds-melding--pauze'), 'een open pauzemenu houdt de timer vast');
    doc.menu = false; doc.body.classList.add('cine-hide-hud'); nu += 5000; m.tik();
    ok(Math.abs(m.timer.rest - 2) < 1e-9, 'een film houdt de timer vast');
    doc.body.classList.remove('cine-hide-hud');
    nu += 1000; m.tik();
    nu += 1000; m.tik();
    ok(klaar === 1 && m.timer.klaar, 'na de readingTime komt onKlaar, precies een keer');
    nu += 1000; m.tik();
    ok(klaar === 1, 'en niet nog eens');
    // staat(): world.paused
    let gepauzeerd = true;
    const el2 = new El(doc);
    const m2 = runNoticeTimer(el2, { duur: 4, staat: () => gepauzeerd });
    nu += 2000; m2.tik();
    ok(m2.timer.rest === 4, 'staat() (world.paused) houdt de timer vast');
    gepauzeerd = false; nu += 1000; m2.tik();
    ok(Math.abs(m2.timer.rest - 3) < 1e-9, 'na de pauze loopt hij door');
    // film: false (de naamkaart hoort bij een film)
    const el3 = new El(doc);
    const m3 = runNoticeTimer(el3, { duur: 4, film: false });
    doc.body.classList.add('cine-hide-hud'); nu += 1000; m3.tik();
    ok(Math.abs(m3.timer.rest - 3) < 1e-9, 'film: false loopt tijdens de film door');
    // kritiek: geen timer, geen balk, sluit() sluit
    const el4 = new El(doc);
    const m4 = runNoticeTimer(el4, { kritiek: true });
    nu += 60000; m4.tik();
    ok(m4.timer.kritiek && !el4.kinderen.length && !m4.timer.klaar, 'kritiek: geen balk en geen timer');
    m4.timer.sluit();
    ok(m4.timer.klaar, 'kritiek sluit met sluit() (knop of toets)');
    m.stop(); m2.stop(); m3.stop(); m4.stop();
    ok(!el.listeners.mouseenter.length, 'stop haalt de hover-luisteraars weg');
  } finally { Date.now = echtDate; globalThis.setInterval = echtInterval; globalThis.clearInterval = echtClear; }
}
ok(adjustRemaining(null, 3) === false && adjustRemaining(new El(maakDoc()), 3) === false, 'adjustRemaining zonder lopende animatie doet niets');

// ---- tokens, css en adapters ----
{
  const tokens = lees('game/js/ds-tokens.css');
  const tok = (naam) => { const m = new RegExp(`--ds-melding-${naam}:\\s*([\\d.]+)s`).exec(tokens); return m ? +m[1] : null; };
  ok(tok('kort') === DURATION_CLASSES.kort && tok('normaal') === DURATION_CLASSES.normaal && tok('lang') === DURATION_CLASSES.lang && tok('max') === NOTICE_MAX_S, 'de duurtokens in ds-tokens.css zijn dezelfde als de klassen in noticetiming.js');
  ok(!/--ds-melding-(kort|normaal|lang|max):[^;]*\b0ms/.test(tokens), 'de leestijden gaan niet op 0 bij Beweging beperken (ze zijn geen animatie)');
  const css = lees('game/js/ds-melding.css');
  ok(/@keyframes ds-melding-tijd \{ to \{ transform: scaleX\(0\); \} \}/.test(css), 'het balkje loopt met transform: scaleX');
  const kf = /@keyframes ds-melding-tijd \{([^]*?)\}\s*\}?/.exec(css);
  ok(kf && !/width|height|left|right|margin|filter|all/.test(kf[1]), 'het balkje animeert geen layout');
  ok(!/(#[0-9a-f]{3,8}\b|rgb\(|hsl\()/i.test(css.replace(/\/\*[^]*?\*\//g, '')), 'ds-melding.css gebruikt alleen tokens, geen losse kleuren');
  ok(!/geel/.test(css.replace(/\/\*[^]*?\*\//g, '')) && !/ink-geel/.test(tokens.split('--ds-melding-balk')[1] || ''), 'geen geel in het balkje (gereserveerd)');
  ok(/prefers-reduced-motion: reduce[^]*steps\(var\(--ds-melding-stappen/.test(css) && /html\.reduce-motion[^{]*\.ds-melding[^{]*\{[^}]*steps\(/.test(css) && /html\.rustig-drukwerk[^{]*\.ds-melding[^{]*\{[^}]*steps\(/.test(css), 'Beweging beperken, Rustig drukwerk en prefers-reduced-motion: het balkje loopt in stappen');
  ok(!/animation:\s*none/.test(css.replace(/\.ds-melding\.ds-mi-in:not[^}]*\}/, '')), 'het balkje blijft in elke tak zichtbaar (geen animation: none)');
  ok(/\.ds-melding--pauze[^{]*\{[^}]*animation-play-state:\s*paused/.test(css), 'het balkje staat stil bij pauze en hover');
  ok(/\.ds-melding--kritiek > \.ds-melding__tijd[^{]*\{[^}]*display:\s*none/.test(css), 'een kritieke of blijvende melding toont geen balkje');
  const cards = lees('game/js/hudcards.js') + lees('game/js/hudcards.css');
  ok(/ds-melding__tijd/.test(cards) && /ds-melding'/.test(cards) && /cardDuration/.test(cards) && !/@keyframes hc-time/.test(cards), 'hudcards.js gebruikt het gedeelde balkje en de gedeelde duur');
  ok(/ds-melding--waarschuwing/.test(cards), 'gevaar en politie krijgen het rode balkje');
  ok(/ds-melding__tijd/.test(lees('game/js/phonefeed.js')) && /toClass/.test(lees('game/js/phonefeed.js')) && !/pf-time var/.test(lees('game/js/phonefeed.css')), 'phonefeed.js gebruikt het gedeelde balkje en de klassen');
  ok(/runNoticeTimer/.test(lees('game/js/achievements.js')) && /ds-melding/.test(lees('game/js/achievements.js')), 'de prestatietoast krijgt het balkje en houdt zijn moment (ds-moment-stempel)');
  ok(/ds-moment-stempel/.test(lees('game/js/achievements.js')), 'de prestatietoast houdt zijn moment-animatie');
  ok(/runNoticeTimer/.test(lees('game/js/namecard.js')) && /noticeBar/.test(lees('game/js/menumelding.js')), 'naamkaart en menumelding krijgen het balkje');
}

// ---- het register klopt met de code: elk type met balk gebruikt het, elk type zonder balk heeft een reden ----
{
  const ids = new Set();
  for (const t of NOTICE_TYPES) {
    ok(!ids.has(t.id), `type ${t.id} komt maar een keer voor`); ids.add(t.id);
    ok(fs.existsSync(path.join(ROOT, 'game/js', t.bestand)), `${t.id}: ${t.bestand} bestaat`);
    if (t.balk) { const src = lees('game/js/' + t.bestand); ok(/ds-melding|noticeBar|runNoticeTimer/.test(src), `${t.id}: ${t.bestand} gebruikt het gedeelde balkje`); }
    else ok(typeof t.reden === 'string' && t.reden.length >= 20, `${t.id}: een melding zonder balkje heeft een reden`);
  }
}

console.log(fouten ? `${fouten} van ${n} FOUT` : `meldingtijd_test: ${n}/${n} ok`);
process.exit(fouten ? 1 : 0);
