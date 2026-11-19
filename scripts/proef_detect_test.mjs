// De detectoren van de proefspeler (scripts/bot/detect/*.mjs) op gefabriceerde invoer: DOM-snapshots, PNG's, events.jsonl-regels. Geen Electron.
//   node scripts/proef_detect_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { encodePng, decodePng } from './lib/pngcheck.mjs';
import { parseColor, contrastRatio, blendColor, snapshotDom, auditDom, dedupeDom } from './bot/detect/dom.mjs';
import { beeldStats, beeldOordeel, flikkering, beeldAudit } from './bot/detect/beeld.mjs';
import { consoleSoort, consoleHandtekening, ConsoleVerzamelaar, consoleBevindingen } from './bot/detect/console.mjs';
import { HitchMeter, hitchBevindingen } from './bot/detect/frametijd.mjs';
import { leestempo, leesBevindingen } from './bot/detect/lezen.mjs';
import { soortPlek, contextOordeel, contextBevindingen } from './bot/detect/wereldcontext.mjs';
import { bereikOordeel, bereikBevindingen } from './bot/detect/bereikbaar.mjs';
import { eerlijkBevindingen, pearson } from './bot/detect/eerlijk.mjs';
import { detecteer } from './bot/detect/index.mjs';
import { detectPrelude } from './bot/detect/prelude.mjs';

let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.stack || e.message).split('\n').slice(0, 3).join('\n  ')); } };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'gde-detect-test-'));

// --- een nep-DOM voor snapshotDom: alleen wat de functie gebruikt ---------------------------------------------------------
function el(tag, tekst, { id = '', klas = '', rect = [0, 0, 100, 20], px = 14, kleur = 'rgb(255, 255, 255)', bg = 'rgba(0, 0, 0, 0)', overflow = 'visible', ellipsis = false, scroll = null, ouder = null, display = 'block', opacity = '1' } = {}) {
  const e = { tagName: tag.toUpperCase(), id, className: klas, childNodes: tekst ? [{ nodeType: 3, textContent: tekst }] : [], parentElement: ouder,
    getBoundingClientRect: () => ({ left: rect[0], top: rect[1], width: rect[2], height: rect[3] }),
    scrollWidth: scroll ? scroll[0] : rect[2], clientWidth: rect[2], scrollHeight: scroll ? scroll[1] : rect[3], clientHeight: rect[3],
    style: { display, visibility: 'visible', opacity, overflow, overflowX: overflow, overflowY: overflow, textOverflow: ellipsis ? 'ellipsis' : 'clip', fontSize: px + 'px', fontWeight: '400', color: kleur, backgroundColor: bg, webkitLineClamp: 'none' } };
  return e;
}
const doc = (perWortel) => ({ querySelectorAll: (sel) => { const w = sel.split(',')[0]; return perWortel[w] || []; } });
const win = (w = 1280, h = 720) => ({ innerWidth: w, innerHeight: h, getComputedStyle: (e) => e.style });

// --- (a) DOM-audit ---------------------------------------------------------------------------------------------------------------
t('kleur en contrast: wit op zwart 21, grijs op wit onder 4,5', () => {
  assert.deepEqual(parseColor('rgb(255, 0, 10)'), [255, 0, 10, 1]);
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
  assert.equal(parseColor('rgba(0,0,0,0.5)')[3], 0.5);
  assert.equal(contrastRatio([255, 255, 255], [0, 0, 0]), 21);
  assert.ok(contrastRatio([160, 160, 160], [255, 255, 255]) < 3);
  assert.deepEqual(blendColor([255, 255, 255, 0.5], [0, 0, 0]).slice(0, 3), [127.5, 127.5, 127.5]);
});

t('snapshotDom: leest alleen zichtbare elementen met eigen tekst, met rect, lettergrootte, kleur en achtergrond van een voorouder', () => {
  const hud = el('div', '', { id: 'hud', rect: [0, 0, 1280, 720], bg: 'rgb(0, 0, 0)' });
  const a = el('div', 'Breng de pakketten naar Delfstof Noord', { klas: 'objective', rect: [20, 20, 300, 20], ouder: hud });
  const verborgen = el('div', 'onzichtbaar', { rect: [0, 0, 100, 20], ouder: hud, display: 'none' });
  const leeg = el('div', '', { rect: [0, 0, 100, 20], ouder: hud });
  const s = snapshotDom(doc({ '#hud': [hud, a, verborgen, leeg] }), win());
  assert.equal(s.els.length, 1);
  assert.equal(s.els[0].tekst, 'Breng de pakketten naar Delfstof Noord');
  assert.equal(s.els[0].fontPx, 14);
  assert.deepEqual(s.els[0].bg.slice(0, 3), [0, 0, 0]);
  assert.equal(s.vw, 1280);
});

t('auditDom: afgekapte tekst (scrollWidth > clientWidth bij overflow hidden of ellipsis)', () => {
  const hud = el('div', '', { id: 'hud', bg: 'rgb(0,0,0)', rect: [0, 0, 1280, 720] });
  const a = el('div', 'Een heel lange doelregel die niet past', { rect: [10, 10, 100, 20], overflow: 'hidden', ellipsis: true, scroll: [260, 20], ouder: hud });
  const b = el('div', 'Past precies', { rect: [10, 50, 100, 20], overflow: 'hidden', scroll: [100, 20], ouder: hud });
  const r = auditDom(snapshotDom(doc({ '#hud': [hud, a, b] }), win()));
  const afg = r.filter((x) => x.type === 'dom-afgekapt');
  assert.equal(afg.length, 1);
  assert.match(afg[0].tekst, /lange doelregel/);
});

t('auditDom: een beletselteken in spelerstekst, maar een losse wachtindicator niet', () => {
  const hud = el('div', '', { id: 'hud', bg: 'rgb(0,0,0)', rect: [0, 0, 1280, 720] });
  const a = el('div', 'Ik wist niet of ik moest…', { rect: [10, 10, 200, 20], ouder: hud });
  const b = el('div', '…', { rect: [10, 40, 20, 20], ouder: hud });
  const r = auditDom(snapshotDom(doc({ '#hud': [hud, a, b] }), win())).filter((x) => x.type === 'dom-beletselteken');
  assert.equal(r.length, 1);
  assert.equal(r[0].bewijs.eind, true);
});

t('auditDom: buiten het scherm en een element dat half buiten valt', () => {
  const hud = el('div', '', { id: 'hud', bg: 'rgb(0,0,0)', rect: [0, 0, 1280, 720] });
  const half = el('div', 'Ondertitel half buiten beeld', { rect: [1110, 10, 200, 20], ouder: hud });
  const weg = el('div', 'Helemaal weg', { rect: [-300, 10, 200, 20], ouder: hud });
  const goed = el('div', 'Binnen', { rect: [10, 10, 100, 20], ouder: hud });
  const r = auditDom(snapshotDom(doc({ '#hud': [hud, half, weg, goed] }), win())).filter((x) => x.type === 'dom-buiten-beeld');
  assert.equal(r.length, 2);
  assert.equal(r.find((x) => /Helemaal/.test(x.tekst)).ernst, 'verwarrend');
  assert.equal(r.find((x) => /half/.test(x.tekst)).ernst, 'cosmetisch');
  assert.ok(!r.some((x) => /Binnen/.test(x.tekst)));
});

t('auditDom: overlap tussen niet-geneste elementen, maar niet tussen ouder en kind', () => {
  const hud = el('div', 'Ouder', { id: 'hud', bg: 'rgb(0,0,0)', rect: [0, 0, 1280, 720] });
  const a = el('div', 'Doelkaart tekst hier', { rect: [100, 100, 200, 40], ouder: hud });
  const b = el('div', 'Ondertitel over de kaart heen', { rect: [150, 110, 200, 40], ouder: hud });
  const c = el('div', 'Ver weg', { rect: [900, 600, 100, 20], ouder: hud });
  const r = auditDom(snapshotDom(doc({ '#hud': [hud, a, b, c] }), win())).filter((x) => x.type === 'dom-overlap');
  assert.equal(r.length, 1);
  assert.match(r[0].tekst, /Doelkaart.*Ondertitel/);
  assert.ok(r[0].bewijs.deel > 0.5);
});

t('auditDom: lettergrootte onder de vloer (12 px) is een fout, tussen 12 en 13 alleen een noot', () => {
  const hud = el('div', '', { id: 'hud', bg: 'rgb(0,0,0)', rect: [0, 0, 1280, 720] });
  const klein = el('div', 'Veel te klein', { rect: [10, 10, 100, 12], px: 10, ouder: hud });
  const grens = el('div', 'Twaalf pixels', { rect: [10, 40, 100, 14], px: 12, ouder: hud });
  const norm = el('div', 'Dertien pixels', { rect: [10, 70, 100, 14], px: 13, ouder: hud });
  const r = auditDom(snapshotDom(doc({ '#hud': [hud, klein, grens, norm] }), win()));
  assert.equal(r.filter((x) => x.type === 'dom-lettergrootte').length, 1);
  assert.equal(r.filter((x) => x.type === 'dom-lettergrootte-norm').length, 1);
  assert.equal(r.filter((x) => x.type.startsWith('dom-lettergrootte') && /Dertien/.test(x.tekst)).length, 0);
});

t('auditDom: laag contrast (WCAG) met een dekkende achtergrond; zonder bekende achtergrond geen oordeel', () => {
  const hud = el('div', '', { id: 'hud', bg: 'rgb(255,255,255)', rect: [0, 0, 1280, 720] });
  const flets = el('div', 'Lichtgrijs op wit', { rect: [10, 10, 200, 20], kleur: 'rgb(200, 200, 200)', ouder: hud });
  const goed = el('div', 'Zwart op wit', { rect: [10, 40, 200, 20], kleur: 'rgb(0, 0, 0)', ouder: hud });
  const groot = el('div', 'Grote tekst grijs', { rect: [10, 70, 300, 40], px: 28, kleur: 'rgb(130, 130, 130)', ouder: hud });
  const over = el('div', 'Over de wereld', { id: 'x', rect: [10, 120, 200, 20], kleur: 'rgb(200, 200, 200)' });   // geen ouder met achtergrond
  const r = auditDom(snapshotDom(doc({ '#hud': [hud, flets, goed, groot], '#cine': [over] }), win())).filter((x) => x.type === 'dom-contrast');
  assert.ok(r.some((x) => /Lichtgrijs/.test(x.tekst)), 'flets');
  assert.ok(!r.some((x) => /Zwart op wit/.test(x.tekst)));
  assert.ok(!r.some((x) => /Grote tekst/.test(x.tekst)), 'grote tekst heeft een lagere drempel (3)');
  assert.ok(!r.some((x) => /Over de wereld/.test(x.tekst)), 'onbekende achtergrond');
});

t('dedupeDom: dezelfde tekst en soort twee keer is een bevinding', () => {
  assert.equal(dedupeDom([{ type: 'a', tekst: 'x' }, { type: 'a', tekst: 'x' }, { type: 'b', tekst: 'x' }]).length, 2);
});

// --- (b) beeld --------------------------------------------------------------------------------------------------------------------
const beeld = (w, h, f) => { const rgba = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = f(x, y); const i = (y * w + x) * 4; rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255; } return { w, h, rgba }; };
const ruis = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 255;
const druk = (im) => Buffer.from(encodePng(im.w, im.h, im.rgba));

t('beeldStats en -oordeel: zwart, blanco, mistig, egaal vlak en een gewoon beeld', () => {
  const zwart = beeldStats(beeld(160, 90, () => [2, 2, 2]));
  assert.deepEqual(beeldOordeel(zwart).map((x) => x.type), ['beeld-zwart']);
  const blanco = beeldStats(beeld(160, 90, (x, y) => [90 + (ruis(x, y) % 3), 90, 90]));
  assert.deepEqual(beeldOordeel(blanco).map((x) => x.type), ['beeld-blanco']);
  const mist = beeldStats(beeld(160, 90, (x, y) => [225 + (ruis(x, y) % 4), 225, 228]));
  assert.deepEqual(beeldOordeel(mist).map((x) => x.type), ['beeld-mistig']);
  const vlak = beeldStats(beeld(160, 90, (x, y) => (y < 60 ? [120, 170, 230] : [ruis(x, y), ruis(y, x), ruis(x + y, y)])));
  assert.deepEqual(beeldOordeel(vlak).map((x) => x.type), ['beeld-egaal-vlak']);
  const gewoon = beeldStats(beeld(160, 90, (x, y) => [ruis(x, y), ruis(y, x), ruis(x + y, y)]));
  assert.deepEqual(beeldOordeel(gewoon), []);
});

t('beeldOordeel: een filmpje of menu (kijktNaarWereld false) krijgt geen oordeel', () => {
  assert.deepEqual(beeldOordeel(beeldStats(beeld(64, 36, () => [0, 0, 0])), { kijktNaarWereld: false }), []);
});

t('flikkering: een vlak dat in b ineens lichter is boven de ruis van c geeft een score; gelijke beelden niet', () => {
  const basis = () => [100, 100, 100];
  const patch = (x, y) => x > 30 && x < 90 && y > 20 && y < 60;
  const A = beeld(120, 80, basis), C = beeld(120, 80, basis);
  const B = beeld(120, 80, (x, y) => (patch(x, y) ? [135, 135, 135] : basis()));   // een LOD-wissel of z-fighting in een vlak deel
  const f = flikkering(A, B, C);
  assert.ok(f.score >= 40, `score ${f.score}`);
  assert.equal(flikkering(A, C, A).score, 0);
  // ruis tussen a en c (verkeer) telt af: is c even anders als b, dan blijft er niets over
  assert.equal(flikkering(A, B, B).score, 0);
  assert.equal(flikkering(A, beeld(10, 10, basis), C), null, 'andere grootte');
});

t('beeldAudit: leest oogbeelden en a/b/c-sets uit een map en geeft bevindingen met stap, plek en shot', () => {
  const d = tmp();
  const zwart = beeld(160, 90, () => [1, 1, 1]);
  fs.writeFileSync(path.join(d, 'shots-M02-oog01-doel.png'), druk(zwart));
  fs.writeFileSync(path.join(d, 'shots-M02-oog02-filmpje.png'), druk(zwart));
  const basis = () => [100, 100, 100];
  fs.writeFileSync(path.join(d, 'shots-M02-fl1-a.png'), druk(beeld(120, 80, basis)));
  fs.writeFileSync(path.join(d, 'shots-M02-fl1-b.png'), druk(beeld(120, 80, (x, y) => (x > 30 && x < 90 && y > 20 && y < 60 ? [135, 135, 135] : basis()))));
  fs.writeFileSync(path.join(d, 'shots-M02-fl1-c.png'), druk(beeld(120, 80, basis)));
  const ev = [
    { type: 'oog', t: 10, reden: 'doel', shot: 'M02-oog01-doel', stap: 'M02', plek: [5, 6], filmpje: false, doelTekst: 'Pinnen' },
    { type: 'oog', t: 20, reden: 'filmpje', shot: 'M02-oog02-filmpje', stap: 'M02', plek: [5, 6], filmpje: true },
    { type: 'flikker', t: 30, shot: 'M02-fl1', stap: 'M02', plek: [7, 8] },
  ];
  const r = beeldAudit(ev, d);
  assert.equal(r.stats.length, 2);
  const typen = r.bevindingen.map((b) => b.type).sort();
  assert.deepEqual(typen, ['beeld-flikkering', 'beeld-zwart'], 'het filmpje telt niet');
  const z = r.bevindingen.find((b) => b.type === 'beeld-zwart');
  assert.equal(z.stap, 'M02'); assert.deepEqual(z.plek, [5, 6]); assert.equal(z.shot, 'M02-oog01-doel');
  assert.deepEqual(r.bevindingen.find((b) => b.type === 'beeld-flikkering').plek, [7, 8]);
  const png = decodePng(fs.readFileSync(path.join(d, 'shots-M02-oog01-doel.png')));
  assert.equal(png.w, 160);
});

// --- (c) console ------------------------------------------------------------------------------------------------------------------
t('consoleSoort en -handtekening: soorten, en dezelfde fout met andere getallen is een handtekening', () => {
  assert.equal(consoleSoort('error', 'THREE.BufferGeometry: Computed radius is NaN'), 'nan');
  assert.equal(consoleSoort('error', 'Uncaught ReferenceError: foo is not defined'), 'niet-gedefinieerd');
  assert.equal(consoleSoort('error', 'Failed to load resource: 404 /audio/x.ogg'), 'bron');
  assert.equal(consoleSoort('warn', 'deprecated'), 'warn');
  assert.equal(consoleSoort('onverwerkt', 'boem'), 'onverwerkt');
  assert.equal(consoleHandtekening('mesh 12 at 3.5 in http://a/b.js:10'), consoleHandtekening('mesh 99 at 8.25 in http://c/d.js:77'));
});

t('ConsoleVerzamelaar: telt per soort, logt hooguit drie regels per handtekening, haakt console.error en window-events', () => {
  const log = []; const verz = new ConsoleVerzamelaar({ log: (ty, o) => log.push({ type: ty, ...o }), tijd: () => 5 });
  const listeners = {}, orig = [];
  const w = { console: { error: (...a) => orig.push(['error', a]), warn: (...a) => orig.push(['warn', a]) }, addEventListener: (k, f) => { listeners[k] = f; } };
  const los = verz.haak(w);
  for (let i = 0; i < 10; i++) w.console.error('NaN in mesh ' + i);
  w.console.warn('let op');
  listeners.error({ message: 'kapot', filename: 'http://x/main.js', lineno: 4 });
  listeners.unhandledrejection({ reason: new Error('afgewezen') });
  assert.equal(verz.telling.nan, 10);
  assert.equal(log.filter((l) => l.soort === 'nan').length, 3);
  assert.equal(verz.telling.warn, 1); assert.equal(verz.telling.onverwerkt, 2);
  assert.equal(orig.length, 11, 'de oorspronkelijke console blijft werken');
  const tel = verz.telSamen();
  assert.equal(tel.top[0].n, 10);
  los();
  const ev = [...log.map((l, i) => ({ ...l, t: i, type: 'console' })), { type: 'consoletelling', ...tel }];
  const b = consoleBevindingen(ev);
  const nan = b.find((x) => x.type === 'console-nan');
  assert.equal(nan.bewijs.aantal, 10); assert.equal(nan.ernst, 'blokkeert');
  assert.ok(b.find((x) => x.type === 'console-warn' && x.ernst === 'cosmetisch'));
});

// --- (d) frametijd ----------------------------------------------------------------------------------------------------------------
t('HitchMeter: logt alleen haperingen boven de drempel, met plek, pending en sectie; stopt met stop()', () => {
  const log = []; let cb = null;
  const m = new HitchMeter({ raf: (f) => { cb = f; }, log: (ty, o) => log.push({ type: ty, ...o }), plek: () => ({ x: 10, y: 21, stap: 'M02', v: 3 }), pending: () => 4, sectie: () => 'terrain', drempel: 50 });
  m.start();
  for (const ts of [0, 16, 32, 140, 156, 300]) cb(ts);
  assert.equal(log.length, 2);
  assert.deepEqual([log[0].ms, log[1].ms], [108, 144]);
  assert.equal(log[0].x, 10); assert.equal(log[0].pending, 4); assert.equal(log[0].sectie, 'terrain');
  assert.deepEqual(m.telling, { boven50: 2, boven100: 2, totaal: 5 });
  m.stop(); const n0 = log.length; cb(900); assert.equal(log.length, n0);
});

t('hitchBevindingen: clustert op plek, noemt streaming als oorzaak, negeert losse kleine haperingen', () => {
  const h = (t, ms, x, y, o = {}) => ({ type: 'hitch', t, ms, x, y, stap: 'M02', pending: 0, ...o });
  const ev = [h(1, 70, 100, 100, { pending: 3 }), h(5, 90, 110, 105, { pending: 2 }), h(9, 120, 105, 95, { pending: 1 }), h(30, 60, 900, 900), h(40, 400, 500, 500, { sectie: 'tiles' })];
  const r = hitchBevindingen(ev);
  assert.equal(r.length, 2);
  assert.equal(r[0].bewijs.maxMs, 400);   // ergste eerst
  const c = r.find((x) => x.bewijs.aantal === 3);
  assert.match(c.bewijs.oorzaak, /streaming/); assert.equal(c.type, 'frame-hitch-zwaar');
  assert.ok(!r.some((x) => x.plek[0] === 900), 'een losse hapering van 60 ms telt niet');
});

// --- (e) lezen --------------------------------------------------------------------------------------------------------------------
t('leestempo en te snel: > 3 woorden per seconde, korte uitroepen niet, kaarten niet (feedback #975)', () => {
  assert.equal(leestempo('een twee drie vier vijf zes', 2), 3);
  const tk = (o) => ({ type: 'tekst', t: 1, bron: 'cutscene', spreker: 'Tammo', stap: 'M02', ...o });
  const ev = [
    tk({ tekst: 'Wij moeten nu meteen naar het kantoor van Delfstof Noord rijden', zichtbaarS: 2 }),      // 11 woorden in 2 s: 5,5 wps
    tk({ tekst: 'Wij moeten naar de garage rijden vandaag', zichtbaarS: 2 }),                            // 7 in 2: 3,5
    tk({ tekst: 'Kom op nou', zichtbaarS: 0.3 }),                                                         // te kort om te tellen
    tk({ tekst: 'Een rustige zin van zeven woorden lang', zichtbaarS: 4 }),                              // 1,75
    tk({ bron: 'kaart', tekst: 'Houd E ingedrukt om te duiken en te zwemmen daarna', zichtbaarS: 1 }),
  ];
  const r = leesBevindingen(ev).filter((x) => x.type.startsWith('lees-') && /snel/.test(x.type));
  assert.equal(r.length, 2);
  assert.equal(r.find((x) => /kantoor/.test(x.tekst)).type, 'lees-onleesbaar-snel');
  assert.equal(r.find((x) => /garage/.test(x.tekst)).type, 'lees-te-snel');
  assert.equal(r[0].bewijs.minimaalNodigS > r[0].bewijs.zichtbaarS, true);
});

t('leesBevindingen: dezelfde zin over missies heen (kruisbestand), herhaling in een stap, en de watch-frasen', () => {
  const tk = (t, stap, tekst, o = {}) => ({ type: 'tekst', t, stap, bron: 'gesprek', spreker: 'Tessa', tekst, zichtbaarS: 9, ...o });
  const ev = [
    tk(10, 'M02', 'Dit is onze laatste klus, Tammo. Daarna stoppen we ermee.'),
    tk(200, 'M05', 'Het was een zware dag. Dit is onze laatste klus, Tammo.'),
    tk(300, 'M07', 'Wij tweeën tegen de rest, zoals altijd.'),
    tk(400, 'M09', 'Weet je nog? Wij tweeën tegen de rest!'),
    tk(500, 'M10', 'Pak de sleutel van de tafel en ga dan weg'), tk(560, 'M10', 'Pak de sleutel van de tafel en ga dan weg'),
    tk(600, 'M11', 'Hoi', { zichtbaarS: 9 }),
  ];
  const r = leesBevindingen(ev);
  const kruis = r.filter((x) => x.type === 'lees-herhaling-kruis');
  assert.ok(kruis.some((x) => /laatste klus/.test(x.tekst) && x.bewijs.stappen.includes('M05')), 'zin over missies heen');
  assert.ok(kruis.some((x) => /tweeën/.test(x.tekst)), 'watch-frase');
  assert.ok(r.some((x) => x.type === 'lees-herhaling' && /sleutel/.test(x.tekst) && x.stap === 'M10'));
  assert.ok(!r.some((x) => /Hoi/.test(x.tekst)), 'een uitroep telt niet als herhaling');
});

t('leesBevindingen: een uitlegkaart die langer blijft dan 25 s', () => {
  const ev = [{ type: 'oog', t: 100, stap: 'M03', kaart: { tekst: 'Houd Shift voor sprinten', zichtbaarS: 61 } }, { type: 'oog', t: 120, stap: 'M03', kaart: { tekst: 'Korte tip', zichtbaarS: 6 } }];
  const r = leesBevindingen(ev);
  assert.equal(r.length, 1);
  assert.equal(r[0].type, 'lees-kaart-blijft'); assert.equal(r[0].bewijs.zichtbaarS, 61);
});

// --- (f) wereldcontext ------------------------------------------------------------------------------------------------------------
t('soortPlek: gebouw, water, weg, weiland, stad en onbekend (null blijft onbekend)', () => {
  assert.equal(soortPlek({ binnen: true }).soort, 'gebouw');
  assert.equal(soortPlek({ binnen: false, waterNabijM: 0, gebouwNabijM: 30 }).soort, 'water');
  assert.equal(soortPlek({ binnen: false, gebouwNabijM: 80, wegNabijM: 40, waterNabijM: 200 }).soort, 'weiland');
  assert.equal(soortPlek({ binnen: false, gebouwNabijM: 25, wegNabijM: 3, waterNabijM: 50 }).soort, 'weg');
  assert.equal(soortPlek({ binnen: false, gebouwNabijM: 20, wegNabijM: 12, waterNabijM: 50 }).soort, 'stad');
  assert.equal(soortPlek({ binnen: false, gebouwNabijM: 80, wegNabijM: null, waterNabijM: 200 }).soort, 'onbekend');
});

t('contextOordeel: een gesprek in een kantoor op grasland (#950) is een mismatch; in een gebouw of onbekend niet', () => {
  const gras = { binnen: false, gebouwNabijM: 80, wegNabijM: 40, waterNabijM: 200 };
  const r = contextOordeel('Kom maar binnen in mijn kantoor, de koffie staat klaar', gras);
  assert.equal(r.length, 1); assert.equal(r[0].type, 'wereld-binnen-buiten'); assert.equal(r[0].ernst, 'verwarrend');
  assert.deepEqual(contextOordeel('Kom maar binnen in mijn kantoor', { binnen: true }), []);
  assert.deepEqual(contextOordeel('Kom maar binnen in mijn kantoor', { binnen: false, gebouwNabijM: 80, wegNabijM: null, waterNabijM: 200 }), [], 'wat de kaart niet weet geeft geen bevinding');
  assert.deepEqual(contextOordeel('Mooi weer vandaag, hè', gras), []);
  const strand = contextOordeel('Zullen we naar het strand varen met de boot?', { binnen: false, gebouwNabijM: 10, wegNabijM: 20, waterNabijM: 400 });
  assert.equal(strand.length, 0, 'in de stad (geen gebouw of weiland) is een waterwoord geen mismatch');
  assert.equal(contextOordeel('Aan boord van de boot is het fijn', { binnen: true, waterNabijM: 400 })[0].type, 'wereld-water-ver');
});

t('contextBevindingen: stap, plek, tekst en uitleg komen uit de plekprobe-regel', () => {
  const r = contextBevindingen([{ type: 'plekprobe', t: 50, stap: 'M07', x: 100.2, y: 200.7, bron: 'cutscene', tekst: 'In de keuken ruikt het naar koffie', probe: { binnen: false, gebouwNabijM: 90, wegNabijM: 50, waterNabijM: 200 } }]);
  assert.equal(r.length, 1);
  assert.equal(r[0].stap, 'M07'); assert.deepEqual(r[0].plek, [100, 201]); assert.match(r[0].bewijs.uitleg, /weiland/);
});

// --- (g) bereikbaarheid -----------------------------------------------------------------------------------------------------------
t('bereikOordeel: doel in water, in een gebouw, zonder route en een grote omweg; boot en vliegtuig mogen op het water', () => {
  const ev = (o, voertuig = 'te voet') => ({ type: 'bereik', t: 1, stap: 'M04', doel: { x: 10, y: 20, naam: 'Steiger' }, voertuig, probe: { inWater: false, inGebouw: false, vrij: true, dichtstbijVrijM: 0, routeGevonden: true, routeLengteM: 100, luchtM: 90, ...o } });
  assert.equal(bereikOordeel(ev({ inWater: true, vrij: false, dichtstbijVrijM: 12 }))[0].type, 'bereik-doel-in-water');
  assert.deepEqual(bereikOordeel(ev({ inWater: true }, 'boot')), []);
  assert.equal(bereikOordeel(ev({ inGebouw: true, vrij: false, dichtstbijVrijM: null }))[0].type, 'bereik-doel-in-gebouw');
  assert.deepEqual(bereikOordeel(ev({ inGebouw: true, vrij: false, dichtstbijVrijM: 4 })), [], 'een vrije plek binnen 6 m is goed genoeg');
  assert.equal(bereikOordeel(ev({ routeGevonden: false }))[0].type, 'bereik-geen-route');
  assert.equal(bereikOordeel(ev({ routeLengteM: 900, luchtM: 150 }))[0].type, 'bereik-omweg');
  assert.equal(bereikOordeel(ev({ vrij: false, dichtstbijVrijM: 30 }))[0].type, 'bereik-doel-onbereikbaar');
  const b = bereikBevindingen([ev({ routeGevonden: false })]);
  assert.equal(b[0].ernst, 'blokkeert'); assert.deepEqual(b[0].plek, [10, 20]); assert.equal(b[0].tekst, 'Steiger');
});

// --- (h) eerlijkheid --------------------------------------------------------------------------------------------------------------
t('pearson: perfecte en tegengestelde correlatie', () => {
  assert.equal(Math.round(pearson([1, 2, 3, 4], [2, 4, 6, 8]) * 100), 100);
  assert.equal(Math.round(pearson([1, 2, 3, 4], [8, 6, 4, 2]) * 100), -100);
  assert.equal(pearson([1, 1, 1], [1, 2, 3]), null);
});

t('eerlijkBevindingen: een rivaal die wacht als de speler stilstaat, elastiek (negatieve correlatie) en een duw', () => {
  const sm = (t, pv, rv, o = {}) => ({ type: 'rivaal', t, stap: 'M11', speler: { v: pv, x: 0, y: 0 }, rivalen: [{ v: rv, x: o.rx ?? 50, y: 0, voorsprong: o.v }] });
  // de speler staat 6 s stil; de rivaal rijdt eerst 8 m/s en wacht dan (0,5 m/s)
  const wacht = [sm(0, 5, 8, { v: 10 }), sm(1, 5, 8, { v: 20 }), sm(2, 0, 8, { v: 30 }), sm(3, 0, 1, { v: 35 }), sm(4, 0, 0.5, { v: 35 }), sm(5, 0, 0.5, { v: 35 }), sm(6, 0, 0.4, { v: 35 }), sm(7, 6, 8, { v: 33 })];
  const r = eerlijkBevindingen(wacht);
  assert.ok(r.some((x) => x.type === 'eerlijk-rivaal-wacht'), JSON.stringify(r.map((x) => x.type)));
  assert.equal(r.find((x) => x.type === 'eerlijk-rivaal-wacht').bewijs.vermoedelijk, true);
  // elastiek: hoe verder voor, hoe trager
  const el = Array.from({ length: 16 }, (_, i) => sm(i, 6, 12 - i * 0.6, { v: i * 10 }));
  assert.ok(eerlijkBevindingen(el).some((x) => x.type === 'eerlijk-elastiek'));
  // geen elastiek: constante snelheid
  const vast = Array.from({ length: 16 }, (_, i) => sm(i, 6, 9, { v: i * 10 }));
  assert.ok(!eerlijkBevindingen(vast).some((x) => x.type === 'eerlijk-elastiek'));
  // duw: de speler gaat in een seconde van 10 naar 2 m/s met een snellere rivaal op 2 m
  const duw = [sm(0, 10, 12, { rx: 30 }), { ...sm(1, 2, 12), speler: { v: 2, x: 0, y: 0 }, rivalen: [{ v: 12, x: 2, y: 0 }] }];
  assert.ok(eerlijkBevindingen(duw).some((x) => x.type === 'eerlijk-botsing-duw'));
  assert.deepEqual(eerlijkBevindingen([]), []);
});

// --- samen ------------------------------------------------------------------------------------------------------------------------
t('detecteer: alle detectoren samen op een run, een bevinding zonder stap krijgt de actieve stap, een falende detector breekt niet af', () => {
  const ev = [
    { type: 'step', event: 'begin', id: 'M02', t: 0 },
    { type: 'detect', soort: 'dom', t: 12, stap: 'M02', plek: [1, 2], scherm: [1280, 720], items: [{ type: 'dom-afgekapt', ernst: 'verwarrend', tekst: 'Lang', sel: 'div.x', rect: {}, bewijs: { scrollW: 9, clientW: 5 } }] },
    { type: 'console', t: 13, level: 'error', soort: 'nan', sig: 'NaN in mesh #', tekst: 'NaN in mesh 1' },
    { type: 'tekst', t: 14, bron: 'cutscene', stap: 'M02', spreker: 'A', tekst: 'Wij moeten nu meteen naar het kantoor van Delfstof Noord rijden', zichtbaarS: 2 },
    { type: 'rivaal', t: 15, speler: null, rivalen: 'kapot' },
  ];
  const r = detecteer(ev);
  const typen = r.bevindingen.map((b) => b.type);
  assert.ok(typen.includes('dom-afgekapt') && typen.includes('console-nan') && typen.includes('lees-onleesbaar-snel'));
  assert.equal(r.bevindingen.find((b) => b.type === 'console-nan').stap, 'M02');
  assert.ok(!typen.includes('detector-fout'), 'een rivaal-regel zonder speler wordt genegeerd, niet als fout gemeld');
  assert.equal(detecteer(ev, { uit: ['dom', 'console'] }).bevindingen.some((b) => b.soort === 'dom'), false);
});

// --- de pagina-voorloop in Node ---------------------------------------------------------------------------------------------------
t('detectPrelude: de pagina-bundel is geldig JavaScript, heeft de verwachte namen en de page-kant werkt met een nepbot', () => {
  const win0 = { console: { error() {}, warn() {} }, addEventListener() {}, requestAnimationFrame() {}, innerWidth: 1280, innerHeight: 720, getComputedStyle: (e) => e.style };
  const ctxVm = { window: win0, document: { querySelectorAll: () => [], documentElement: { classList: { add() {} } } }, performance: { now: () => 0 }, console, setTimeout, Promise };
  vm.createContext(ctxVm); ctxVm.window.window = ctxVm.window;
  vm.runInContext(detectPrelude(), ctxVm);
  const D = ctxVm.window.__botDetect;
  for (const k of ['snapshotDom', 'auditDom', 'dedupeDom', 'ConsoleVerzamelaar', 'HitchMeter']) assert.equal(typeof D[k], 'function', k);
  assert.equal(typeof ctxVm.window.__botDetectPage.maak, 'function');
  // de nepbot: B.log verzamelt, status geeft een vaste stand
  const logs = []; const player = { x: 1, y: 2, inVehicle: null, health: 100 };
  const status = () => ({ t: 10, player: { x: 1, y: 2, money: 5, vehicle: null, health: 100 }, story: { id: 'M02', done: 0, total: 3, fails: 0 }, mission: { active: true, stage: 'goto' }, target: { name: 'Garage', x: 50, y: 60, distance: 70 }, hud: { subtitle: { source: 'gesprek', speaker: 'Tessa', text: 'Hallo daar' }, objective: 'Pinnen' }, blocking: { cinematic: false, banner: false, talk: false, loading: false, paused: false, respawn: false }, wanted: 0 });
  const B = { log: (ty, o) => logs.push({ type: ty, ...o }), time: () => 10, status, player, shot() {}, stick() {} };
  const imp = () => Promise.reject(new Error('geen spel in deze test'));
  const Dt = ctxVm.window.__botDetectPage.maak({ B, world: { map: {}, clock: 12 }, player, CFG: { klok: 22, chaos: { soort: 'snelreis', na: 0 } }, imp, keyTap: async () => {}, footFree: () => true, stilS: () => 99 });
  Dt.tick(status());
  const s2 = status(); s2.hud.subtitle = null; s2.t = 15; Dt.tick(s2);
  assert.ok(logs.some((l) => l.type === 'perturbatie' && l.as === 'tijd'), 'klok vastgezet');
  const tek = logs.find((l) => l.type === 'tekst');
  assert.ok(tek && tek.tekst === 'Hallo daar' && tek.zichtbaarS === 5, JSON.stringify(tek));
  assert.ok(logs.some((l) => l.type === 'bereik' && l.doel.naam === 'Garage'));
  Dt.eind();
  assert.ok(logs.some((l) => l.type === 'consoletelling'));
  // de uitvoer van de page-kant is precies wat de pure kant verwacht
  const r = leesBevindingen(logs); assert.ok(Array.isArray(r));
});

console.log(`${n - fails}/${n} detectortests geslaagd`);
if (fails) process.exit(1);
