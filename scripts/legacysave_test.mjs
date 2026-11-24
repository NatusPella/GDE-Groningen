// De kaart "Nieuw verhaal" bij een oude save (22-11):  node scripts/oudesave_test.mjs
// Zuiver (legacysave.js), met een geheugenopslag (saveslots.js), een kleine DOM-nabootsing (legacysavecardui.js) en bronchecks op de bedrading.
// Raakt nooit echte opslag.
import fs from 'node:fs';
import { LEGACY_CARD, isLegacyStorySave, legacyCardNeeded, withCardSeen, textWithCardSeen } from '../game/js/legacysave.js';
import { SAVE_VERSION, migrateSave } from '../game/js/savemigrate.js';
import { ARC_ID } from '../game/js/storyarc.js';
import { GATE_VERSION } from '../game/js/unlockgate.js';
import * as S from '../game/js/saveslots.js';
import { KEYS } from '../game/js/storagekeys.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const src = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// de tekst: titel kort, één zin
ok(LEGACY_CARD.titel === 'Nieuw verhaal' && LEGACY_CARD.titel.length <= 30, 'titel hoogstens 30 tekens');
ok(LEGACY_CARD.tekst === 'Dit spel komt van een eerdere versie. Voor het nieuwe verhaal werkt een nieuw spel het best.', 'de zin van de eigenaar');
ok(LEGACY_CARD.doorgaan === 'Doorgaan' && LEGACY_CARD.nieuw === 'Nieuw spel' && LEGACY_CARD.tag === 'Oude versie', 'knoppen en tag');
ok(!/winter|sneeuw|de Grunn/i.test(Object.values(LEGACY_CARD).join(' ')), 'constitution: geen verboden woorden');

// wat telt als oud
const gate = { v: GATE_VERSION, open: ['klus'] };
const metGate = { v: SAVE_VERSION, arc: ARC_ID, story: { v: 2, done: ['M00'], gate }, missions: { completed: [0] } };
const zonderGate = { v: SAVE_VERSION, arc: ARC_ID, story: { v: 2, done: ['M00', 'M01'] }, missions: { completed: [0, 1] } };
const verse = { v: SAVE_VERSION, arc: ARC_ID, story: { v: 2, done: [] }, missions: { completed: [] } };
ok(isLegacyStorySave(zonderGate), 'voortgang zonder poort is oud');
ok(!isLegacyStorySave(metGate), 'een save met poort is niet oud');
ok(!isLegacyStorySave(verse), 'een leeg spel zonder poort heeft niets te melden');
ok(isLegacyStorySave({ ...metGate, story: { ...metGate.story, gate: { ...gate, legacy: true } } }), 'een gemigreerde (legacy) poort is oud');
ok(isLegacyStorySave({ ...metGate, story: { ...metGate.story, gate: { v: GATE_VERSION - 1, open: [] } } }), 'een oudere poortversie is oud');
ok(isLegacyStorySave({ ...metGate, story: { ...metGate.story, v: 1 } }), 'een verhaalsave van de eerste vorm is oud');
ok(isLegacyStorySave({ v: SAVE_VERSION, arc: ARC_ID, oudGemigreerd: true }), 'een save van het eerste verhaal is oud');
ok(isLegacyStorySave({ missions: { completed: [3] } }), 'missies zonder verhaalsave zijn oud');
ok(!isLegacyStorySave(null) && !isLegacyStorySave([]) && !isLegacyStorySave('x') && !isLegacyStorySave({}), 'rommel is niet oud en geeft geen fout');
ok(!isLegacyStorySave({ story: { done: 'x' }, missions: 5 }), 'rare velden geven geen fout');

// eenmaal per save
ok(legacyCardNeeded(zonderGate) && !legacyCardNeeded(metGate), 'de kaart is nodig voor een oude save');
const gezien = withCardSeen(zonderGate);
ok(gezien.legacyCardSeen === true && !legacyCardNeeded(gezien) && isLegacyStorySave(gezien), 'gezien: geen kaart meer, de tag blijft');
ok(zonderGate.legacyCardSeen === undefined, 'de bron wordt niet aangepast');
ok(JSON.stringify({ ...gezien, legacyCardSeen: undefined }) === JSON.stringify({ ...zonderGate, legacyCardSeen: undefined }), 'voortgang en geld blijven ongemoeid');
ok(textWithCardSeen('niet json') === null && textWithCardSeen('[1]') === null, 'ruwe tekst: rommel geeft null');
const raw1 = textWithCardSeen(JSON.stringify(zonderGate));
ok(JSON.parse(raw1).legacyCardSeen === true && textWithCardSeen(raw1) === raw1, 'ruwe tekst: vlag erbij, een tweede keer verandert niets');

// de vlag overleeft de migraties (een oudere versie van de save krijgt hem ook)
{
  const oud = { v: 7, arc: 'nieuw', money: 100, story: { v: 2, done: ['M00'] }, legacyCardSeen: true };
  const m = migrateSave(oud);
  ok(m && m.data.legacyCardSeen === true && !legacyCardNeeded(m.data), 'migreren bewaart de vlag');
}

// opslag: samenvatting, tag en de vlag zetten
class Mem {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
const mk = (extra = {}) => ({ v: SAVE_VERSION, arc: ARC_ID, savedAt: 5000, money: 250, speeltijd: 900, character: 'tammo', ...extra });
{
  const ls = new Mem();
  ls.setItem(KEYS.save, JSON.stringify(mk(zonderGate)));
  S.resetReadCache();
  let l = S.listSlots(ls);
  ok(l.length === 1 && l[0].summary.legacyStory === true && l[0].summary.legacyCard === true, 'de lijst ziet een oude save');
  ok(S.markLegacyCardSeen(ls, 1) === true, 'vlag zetten lukt');
  l = S.listSlots(ls);
  ok(l[0].summary.legacyStory === true && l[0].summary.legacyCard === false, 'na het zetten: tag blijft, kaart weg');
  ok(l[0].summary.money === 250 && l[0].summary.playSeconds === 900 && l[0].summary.storyDone === 2 && l[0].summary.missionsDone === 2, 'geen dataverlies in de samenvatting');
  const d = JSON.parse(ls.getItem(KEYS.save));
  ok(d.money === 250 && d.story.done.length === 2 && d.missions.completed.length === 2 && d.legacyCardSeen === true, 'de ruwe save is gelijk, plus de vlag');
  ok(S.markLegacyCardSeen(ls, 1) === true, 'een tweede keer is stil goed');
  ok(S.markLegacyCardSeen(ls, 2) === false, 'een lege plek geeft false');
  ls.setItem(KEYS.save, JSON.stringify(mk(metGate)));
  S.resetReadCache();
  l = S.listSlots(ls);
  ok(l[0].summary.legacyStory === false && l[0].summary.legacyCard === false, 'een nieuwe save heeft geen tag');
}
{
  const ls = new Mem();
  ls.setItem(KEYS.save, '{kapot');
  S.resetReadCache();
  ok(S.markLegacyCardSeen(ls, 1) === false && ls.getItem(KEYS.save) === '{kapot', 'een kapotte save blijft zoals hij is');
}

// de kaart op het scherm (kleine DOM-nabootsing)
const listeners = [];
const cl = { toggle() {}, add() {}, remove() {}, contains: () => false };
const doc = { body: { appendChild() {}, classList: cl, style: {} }, documentElement: { classList: cl, style: {}, setAttribute() {} }, createElement: () => el, activeElement: null, addEventListener() {}, getElementById: () => null };
const knoppen = ['door', 'nieuw'].map((w) => ({ dataset: { ok: w }, focus() { doc.activeElement = this; }, closest() { return this; } }));
const klikken = [];
let verwijderd = false;
const el = { id: '', className: '', set innerHTML(v) { this.html = v; }, get innerHTML() { return this.html; }, querySelectorAll: () => knoppen, querySelector: (s) => knoppen.find((k) => s.includes(`"${k.dataset.ok}"`)), addEventListener: (t, f) => klikken.push(f), remove() { verwijderd = true; } };
globalThis.document = doc;
globalThis.window = { addEventListener: (t, f) => listeners.push(f), removeEventListener: (t, f) => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); } };
const { askLegacyCard, isLegacyCardOpen, legacyCardHtml } = await import('../game/js/legacysavecardui.js');
const key = (k, extra = {}) => { const e = { key: k, preventDefault() {}, stopPropagation() {}, ...extra }; [...listeners].forEach((f) => { try { f(e); } catch (x) { /* andere vensterluisteraars */ } }); };
const html = legacyCardHtml();
ok(html.includes(LEGACY_CARD.titel) && html.includes(LEGACY_CARD.tekst) && html.includes('data-ok="door"') && html.includes('data-ok="nieuw"'), 'de kaart toont titel, zin en twee knoppen');
ok(/data-ok="door"[^>]*>Doorgaan <span class="sk-toets-in">/.test(html), 'Doorgaan heeft de toets in de knop');
ok(/role="alertdialog" aria-modal="true"/.test(html), 'dialoogrol voor schermlezers');
const basis = listeners.length;
let door = 0, nieuw = 0;
ok(askLegacyCard({ onDoorgaan: () => door++, onNieuw: () => nieuw++ }) === true && isLegacyCardOpen(), 'de kaart opent');
ok(!askLegacyCard(), 'één kaart tegelijk');
ok(doc.activeElement === knoppen[0], 'Doorgaan heeft de voorselectie');
key('Escape'); key('Backspace');
ok(isLegacyCardOpen() && door === 0 && nieuw === 0, 'Escape en Backspace kiezen niets: de speler moet kiezen');
key('ArrowRight');
ok(doc.activeElement === knoppen[1], 'pijl naar rechts: Nieuw spel (controller: D-pad)');
key('ArrowRight');
ok(doc.activeElement === knoppen[0], 'rond aan de rand');
key('Tab');
ok(doc.activeElement === knoppen[1], 'Tab blijft op de kaart');
key('Enter');
ok(nieuw === 1 && door === 0 && !isLegacyCardOpen() && verwijderd && listeners.length === basis, 'Enter op Nieuw spel kiest Nieuw spel en ruimt op');
askLegacyCard({ onDoorgaan: () => door++, onNieuw: () => nieuw++ });
key('Enter', { repeat: true });
ok(door === 0, 'een vastgehouden toets kiest niet');
key('Enter');
ok(door === 1 && listeners.length === basis, 'Enter op de voorselectie: Doorgaan');
askLegacyCard({ onDoorgaan: () => door++, onNieuw: () => nieuw++ });
klikken[0]({ target: knoppen[1] });
ok(nieuw === 2, 'klik op Nieuw spel');

// #1226: het gevolg staat op de kaart en beide knoppen hebben hun toets (Doorgaan Enter, Nieuw spel N)
ok(LEGACY_CARD.gevolg === 'Je oude spel blijft bewaard.' && html.includes(LEGACY_CARD.gevolg), 'de kaart zegt dat het oude spel bewaard blijft');
ok(/data-ok="nieuw"[^>]*>Nieuw spel <span class="sk-toets-in">/.test(html), 'Nieuw spel heeft ook een toets in de knop');
askLegacyCard({ onDoorgaan: () => door++, onNieuw: () => nieuw++ });
key('n', { repeat: true });
ok(nieuw === 2, 'een vastgehouden N kiest niet');
key('n');
ok(nieuw > 2 && !isLegacyCardOpen() && listeners.length === basis, 'N kiest Nieuw spel en ruimt op');

// de bedrading in de bron
const ui =src('game/js/saveslotsui.js'), ss = src('game/js/startscreen.js'), sg = src('game/js/savegame.js'), sl = src('game/js/saveslots.js');
ok(/<span class="ds-z-status ds-z-status--zacht">\$\{esc\(LEGACY_CARD\.tag\)\}<\/span>/.test(ui) && /sm\.legacyStory/.test(ui), 'het opgeslagen-spellenscherm toont de tag Oude versie');
ok(/summary\.legacyCard && !cardDone\.has\(cur\.n\)\) \{ over = \{ n: cur\.n, kind: 'legacy' \}/.test(ui), 'laden van een oude save vraagt eerst');
ok(/act === 'legacy-continue'[\s\S]{0,200}markLegacyCardSeen\(cur\.n\)[\s\S]{0,120}doAction\('load'/.test(ui), 'Doorgaan zet de vlag en laadt zoals nu');
ok(/act === 'legacy-new'[\s\S]{0,500}doAction\('new', vrij, 0\)/.test(ui) && !/legacy-new[\s\S]{0,500}deleteSlot/.test(ui), 'Nieuw spel gaat via de gewone route en wist niets');
ok(/legacy-new[\s\S]{0,300}Alle plekken zijn in gebruik/.test(ui), 'zonder vrije plek zegt het dat, het neemt de oude plek niet in');
ok(/ssl-modal/.test(ui.slice(ui.indexOf('const legacyAsk'), ui.indexOf('const cardDone'))), 'de kaart is een modaal vak binnen het scherm (eigen toetsafhandeling, listnav-groep menu)');
ok((ss.match(/const continueGame = \(\) => legacyCardFirst\(continueNow, startNew\);/g) || []).length === 2 && /const continueGame = \(\) => \(afterBench && !afterBench\.legacyCard \? continueNow\(\) : legacyCardFirst\(continueNow, startNew\)\);/.test(ss), 'de Doorgaan-paden van het startscherm gaan langs de kaart, behalve terug uit een benchmark (benchmarkreturn.js)');
ok(/const testmodus = !!\(AUTO \|\| FLAGS\.autoplay \|\| FLAGS\.menutest\);\s*if \(!sm \|\| !sm\.legacyCard \|\| testmodus\)/.test(ss), 'een testrun slaat de kaart over');
ok(/legacyCard: legacyCardNeeded\(d\)/.test(sg) && /\.\.\.\(legacyCardSeen \? \{ legacyCardSeen: true \} : \{\}\)/.test(sg), 'de vlag reist mee in elke volgende save');
ok(/legacyCardSeen = false;\s*bindSlot\(\);/.test(sg), 'een nieuw spel begint zonder vlag');
ok(!/fetch|XMLHttpRequest|WebSocket|RTCPeer/.test(src('game/js/legacysave.js') + src('game/js/legacysavecardui.js')), 'lokaal: geen netwerk (Samen spelen)');
ok(!/removeItem|deleteSlot/.test(src('game/js/legacysave.js') + src('game/js/legacysavecardui.js')), 'de kaart wist nooit iets');
ok(/legacyStory: isLegacyStorySave\(d\)/.test(sl), 'de samenvatting kent de oude versie');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
