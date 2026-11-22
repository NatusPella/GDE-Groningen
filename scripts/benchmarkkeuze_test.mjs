// De logica van het benchmark-keuzescherm (benchmarkmodel.js pickChoice en choiceKey, gebruikt door benchmarkui.js) en de hoogte van de
// rapportkaart zoals hij nu is (cijferstempel, drie vakken, grafiek, feiten, presets, zes knoppen). Zonder browser: de hoogte is een
// schatting uit de ontwerpmaten; het echte beeld volgt bij de sweep (docs/OPENING-TRAILER-BENCHMARK-VERIFICATIE-21-11.md §3).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pickChoice, choiceKey, normaliseChoice, choiceModel, DEFAULT_CHOICE, frameReport, fpsSeries, reportCard } from '../game/js/benchmarkmodel.js';
import { choiceHtml, reportHtml } from '../game/js/benchmarkui.js';
import { scopeTokens, resolveToken } from './release/ds_tokens_lib.mjs';

// 1. pickChoice: een keuze verandert alleen wat je aanraakt; het commentaar blijft zoals de speler het liet na een bezoek aan de klassieke route
let st = { choice: normaliseChoice({}), wish: true };
assert.deepEqual(st.choice, DEFAULT_CHOICE);
st = pickChoice(st.choice, st.wish, 'commentary', null);
assert.equal(st.choice.commentary, false);
st = pickChoice(st.choice, st.wish, 'course', 'classic');
assert.equal(st.choice.course, 'classic');
assert.equal(st.choice.length, 'volledig', 'klassiek heeft één lengte');
assert.equal(st.choice.commentary, false);
st = pickChoice(st.choice, st.wish, 'course', 'film');
assert.equal(st.choice.commentary, false, 'de speler zette het commentaar uit en dat blijft zo');
st = pickChoice(st.choice, st.wish, 'commentary', null);
assert.equal(st.choice.commentary, true);
// het commentaar aan, naar klassiek en terug: weer aan (voorheen bleef de schakelaar stil uit)
let a = { choice: normaliseChoice({ course: 'film', length: 'kort' }), wish: true };
a = pickChoice(a.choice, a.wish, 'course', 'classic');
assert.equal(a.choice.commentary, false);
a = pickChoice(a.choice, a.wish, 'course', 'film');
assert.deepEqual(a.choice, { course: 'film', length: 'volledig', commentary: true });
a = pickChoice(a.choice, a.wish, 'length', 'kort');
assert.deepEqual(a.choice, { course: 'film', length: 'kort', commentary: true });
assert.equal(choiceModel(normaliseChoice({ course: 'classic' })).commentary.available, false);
// een onbekende lengte of route valt terug op de standaard
assert.deepEqual(pickChoice(DEFAULT_CHOICE, true, 'course', 'onzin').choice, DEFAULT_CHOICE);
assert.equal(pickChoice(DEFAULT_CHOICE, true, 'length', 'onzin').choice.length, 'volledig');

// 2. choiceKey: de toetsen en de controller (pijlen, A, B)
const k = (key, o = {}) => choiceKey(key, { index: 2, count: 6, ...o });
assert.deepEqual(k('Escape'), { cancel: true });
assert.deepEqual(k('Backspace'), { cancel: true });
assert.deepEqual(k('ArrowRight'), { focus: 3 });
assert.deepEqual(k('ArrowDown'), { focus: 3 });
assert.deepEqual(k('Tab'), { focus: 3 });
assert.deepEqual(k('Tab', { shift: true }), { focus: 1 });
assert.deepEqual(k('ArrowRight', { shift: true }), { focus: 3 }, 'Shift keert alleen Tab om');
assert.deepEqual(k('ArrowDown', { shift: true }), { focus: 3 });
assert.deepEqual(k('ArrowLeft', { shift: true }), { focus: 1 });
assert.deepEqual(k('ArrowLeft'), { focus: 1 });
assert.deepEqual(k('ArrowUp'), { focus: 1 });
assert.deepEqual(k('ArrowRight', { index: 5 }), { focus: 0 }, 'rond na de laatste knop');
assert.deepEqual(k('ArrowLeft', { index: 0 }), { focus: 5 }, 'rond voor de eerste knop');
assert.deepEqual(k('ArrowLeft', { index: -1 }), { focus: 5 }, 'zonder focus begint terug bij de laatste knop');
assert.deepEqual(k('ArrowRight', { index: -1 }), { focus: 0 });
assert.deepEqual(k('Enter'), { press: 2 });
assert.deepEqual(k(' '), { press: 2 });
assert.deepEqual(k('Enter', { repeat: true }), { press: null }, 'een vastgehouden toets drukt niet nog een keer');
assert.deepEqual(k('Enter', { index: -1 }), { press: null }, 'Enter zonder focus doet niets');
assert.deepEqual(k('ArrowRight', { count: 0 }), { focus: null }, 'geen knoppen: geen fout');
assert.equal(k('a'), null);
assert.equal(k('F5'), null);

// 3. de markup volgt de keuze: de lengte is vergrendeld bij klassiek, het commentaar uitgegrijsd, Start en Annuleren met hun toets
const klassiek = choiceHtml(choiceModel(normaliseChoice({ course: 'classic' })));
assert.match(klassiek, /data-groep="length" data-id="kort" disabled/);
assert.match(klassiek, /data-groep="commentary"[^>]* disabled/);
assert.ok(!/data-slot="locked" hidden/.test(klassiek), 'de uitleg staat zichtbaar');
const film = choiceHtml(choiceModel(normaliseChoice({})));
assert.ok(!/data-id="kort" disabled/.test(film));
assert.match(film, /data-slot="locked" hidden/);
assert.match(film, /data-act="start"/);
assert.match(film, /data-act="cancel"/);

// 4. de hoogte van de rapportkaart (ontwerp-px, zoals ds3_schermen_test): wat de kaart nu nodig heeft tegen wat er is
const tok = scopeTokens(fs.readFileSync(new URL('../game/js/ds-tokens.css', import.meta.url), 'utf8'), 'papier');
const num = (n) => parseFloat(resolveToken(tok, n)) || 0;
const s = (i) => num(`--ds-s-${i}`);
const wave = (n, base) => Array.from({ length: n }, (_, i) => base + 1.5 * Math.sin(i / 37));
const shots = [{ id: 'a', label: 'A', ms: wave(300, 12) }, { id: 'b', label: 'B', ms: wave(300, 14) }];
const rep = frameReport(shots.flatMap((x) => x.ms));
const stats = { rep, series: fpsSeries(shots), avg: rep.avg, p95: rep.p95, low1: rep.low1, cats: { stad: { avg: 80 }, water: { avg: 52 } }, hitches: [{ id: 'b', slow33: 3, share: 0.02 }], memory: 640 };
const card = reportCard({ stats, preset: 'vlot', course: 'film', length: 'volledig', prev: null, size: [1920, 1080], presetFps: { laag: 130, vlot: 75, hoog: 50 } });
const html = reportHtml(card);
const knoppen = (html.match(/<button[^>]*data-act=/g) || []).filter((b) => !/ hidden/.test(b)).length;
function kaartHoogte(h) {
  const compact = h <= 780;
  const rij = s(2) * 2 + num('--ds-t-body') * 1.4 + num('--ds-t-hulp') * 1.4; // padding, naam, sub
  const kop = s(2) * 2 + num('--ds-t-subkop');
  const samenvatting = num('--ds-t-hulp') * 1.4 * 2;
  const stempel = s(3) * 2 + num(compact ? '--ds-t-kop' : '--ds-t-cijfer') + s(1) + num('--ds-t-label');
  const vakken = Math.max(stempel, card.vakken.length * rij);
  const grafiek = s(8) * 2 + s(2);
  const paneelB = Math.min(s(8) * 9, 1280 - 2 * s(4));
  const tegelH = s(2) * 2 + num(compact ? '--ds-t-kop' : '--ds-t-cijfer') + num('--ds-t-hulp') * 1.4 + s(1) + 5;
  const tegelB = (compact ? s(8) * 1.25 : s(8) * 1.5) + 24;
  const perRij = Math.max(1, Math.floor((paneelB - 2 * s(4) + s(3)) / (tegelB + s(3))));
  const feitRijen = Math.ceil(card.feiten.length / perRij);
  const feiten = feitRijen * tegelH + (feitRijen - 1) * s(3);
  const tekst = num('--ds-t-hulp') * 1.4 * 3; // haperingen, vergelijking, toetsregel
  const cats = num('--ds-hoogte-chip') * 2 + s(2);
  const presets = card.presets.length * rij;
  const advies = s(4) * 2 + num('--ds-t-subkop') + num('--ds-t-hulp') * 1.4 * 2 + s(1);
  const knopH = compact ? num('--ds-hoogte-chip') : num('--ds-hoogte-knop');
  const px = compact ? num('--ds-t-label') : num('--ds-t-subkop');
  let r = 1, b = 0;
  for (const l of ['Toepassen', 'Nog een keer', 'Bewaar als bestand', 'Instellingen', 'Technische info kopiëren', 'Terug']) {
    const w = l.length * px * 0.42 + 2 * (compact ? s(4) : s(5)) + 6;
    if (b && b + w + s(3) > paneelB - 2 * s(4)) { r++; b = 0; }
    b += w + s(3);
  }
  const knopRijen = r * knopH + (r - 1) * s(3);
  const gaten = 13 * (compact ? s(2) : s(3));
  return { nodig: kop + samenvatting + vakken + grafiek + feiten + tekst + cats + presets + advies + knopRijen + gaten + 2 * s(4), knopRijen: r };
}
assert.ok(knoppen >= 5 && knoppen <= 6, `knoppen in de kaart: ${knoppen}`);
const css = fs.readFileSync(new URL('../game/js/ds-schermen.css', import.meta.url), 'utf8');
const paneel = /#trailer-result \.tr-res \{[^}]*\}/.exec(css)[0];
const uitkomst = [];
for (const [b, h] of [[1280, 720], [1920, 1080]]) {
  const { nodig } = kaartHoogte(h);
  const ruimte = h - 2 * s(4);
  uitkomst.push(`${b}x${h}: ${Math.round(nodig)} van ${ruimte} px${nodig > ruimte ? ' (scrolt)' : ''}`);
  // wat de kaart ook nodig heeft: hij mag nooit afgekapt zijn; past hij niet, dan scrolt het paneel zelf binnen het venster
  assert.ok(nodig <= ruimte || (/max-height: calc\(100vh/.test(paneel) && /overflow: auto/.test(paneel)), `de kaart past niet op ${b}x${h} en scrolt niet`);
  assert.ok(nodig < 2 * ruimte, `de kaart is op ${b}x${h} meer dan twee schermen hoog`);
}
console.log(`benchmarkkeuze_test: ok (kaart ${uitkomst.join('; ')})`);
