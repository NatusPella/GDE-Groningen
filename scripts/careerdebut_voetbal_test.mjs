// Test van de invalbeurt (#1374, taak V2): game/js/careerdebut_voetbal.js. Puur, geen Electron.
// Dekt: de regels (kort, Nederlands, zonder echte merken, namen eerst ingeleid), dat code, script (V1.1 tot V1.3 in game/storydata/script.json) en footballstory.js
// dezelfde tekst hebben, de regie (valideert, compileert, elke beat en shot vindt zijn regel, de gebaren en de cast bestaan, het licht volgt het verhaal),
// de voorwaarde (alleen bij De Hoekers, eenmaal per speler, alleen aan het begin, vóór de eerste training) en de Samen-spelen-regel (data, terugblik, geen vlag).
//   node scripts/careerdebut_voetbal_test.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import PARKDATA from '../game/js/voetbalparkendata.js';
import * as I from '../game/js/careerdebut_voetbal.js';
import { footballDue, FOOTBALL_FLAG, stubLooks } from '../game/js/careerdebut.js';
import * as V from '../game/js/footballstory.js';
import { makeParkIndex } from '../game/js/voetbalparken.js';
import { createCareer } from '../game/js/voetbalcarriere.js';
import { missionScene } from '../game/js/cutscenes_akte1.js';
import { validateScene, compileScene, ACTOR_ANIMS } from '../game/js/cutscript.js';
import { npcNamesFromSource } from '../game/js/cutpreview.js';
import { hasForbiddenWord } from './voetbal_verboden.mjs';

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const src = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const NPC = npcNamesFromSource(src('game/js/missionstory.js'));
const script = JSON.parse(src('game/storydata/script.json'));
const index = makeParkIndex(PARKDATA);
const village = index.byPlace.get(V.STORY_PLACE_ID);
const start = () => createCareer({ char: 'anita', index, home: V.storyHome(index) });
const words = (s) => s.trim().split(/\s+/).length;

t('de regels: een korte scène, Nederlands, zonder echte merken en met alle vier de sprekers', () => {
  assert.ok(I.INVAL_LINES.length >= 20 && I.INVAL_LINES.length <= 40, String(I.INVAL_LINES.length));
  const tl = I.invalTimeline();
  assert.ok(tl.total >= 45 && tl.total <= 110, `leestijd ${tl.total}`);
  for (const [who, text, o] of I.INVAL_LINES) {
    assert.ok(Object.prototype.hasOwnProperty.call(I.INVAL_SPEAKER_NAME, who), who);
    assert.ok(text.length >= 3 && text.length <= 110 && words(text) <= 18, text);
    assert.ok(!/[{}<>]/.test(text) && !/—/.test(text), text);
    assert.ok(!hasForbiddenWord(text) && !/\b(de Grunn|winter|sneeuw|ijs|kerst|Ajax|PSV|Feyenoord|FC Groningen)\b/i.test(text), text);
    assert.ok(!o || (Number.isFinite(o.ov) && o.ov >= 0.1 && o.ov <= 1.2), JSON.stringify(o));
  }
  assert.deepEqual([...new Set(I.INVAL_LINES.map(([w]) => w))].sort(), ['A', 'T', 'albert', 'trainer']);
  assert.ok(I.INVAL_LINES.filter(([w]) => w !== 'T' && w !== 'A').length >= 8, 'de bijfiguren hebben hun eigen beurten');
});
t('begrijpelijk: Albert en Eppo stellen zich voor voor iemand hun naam gebruikt, en de vervallen namen komen niet voor', () => {
  const tekst = I.INVAL_LINES.map(([, x]) => x);
  const eerste = (re) => tekst.findIndex((x) => re.test(x));
  assert.equal(eerste(/Albert Teuben, de voorzitter/), 0, 'Albert noemt zijn naam en rol als eerste');
  assert.equal(eerste(/Eppo Rozema, de trainer/), 1, 'Eppo noemt zijn naam en rol meteen daarna');
  assert.equal(eerste(/Tammo en Tessa/), 2, 'Tammo stelt het duo voor');
  // niemand wordt bij de naam genoemd voor hij zich voorstelde (behalve Tessa/Tammo na regel 2)
  tekst.slice(0, 1).forEach((x) => assert.ok(!/Eppo/.test(x)));
  const alles = tekst.join(' ');
  assert.ok(!/Remco|Kleibijter|VV |SC /.test(alles), 'geen vervallen namen en geen voorvoegsels');
  assert.match(alles, /De Hoekers/);
});
t('code, script en footballstory.js hebben dezelfde tekst (V1.1 tot V1.3)', () => {
  const sc = (id) => script.scenes.find((s) => s.id === id);
  for (const [deel, id] of [['avond', 'V1.1'], ['zondag', 'V1.2'], ['clubhuis', 'V1.3']]) {
    const s = sc(id);
    assert.ok(s, `${id} staat in script.json`);
    assert.equal(s.step, 'V1');
    assert.deepEqual(s.lines.map((l) => l.text), I.INVAL_PARTS[deel].map(([, x]) => x), `${id}: tekst`);
    const naam = { T: 'Tammo', A: 'Tessa', trainer: 'Eppo Rozema', albert: 'Albert Teuben' };
    assert.deepEqual(s.lines.map((l) => l.speaker), I.INVAL_PARTS[deel].map(([w]) => naam[w]), `${id}: sprekers`);
    assert.ok(s.lines.every((l) => l.textOnly && l.tag === 'NIEUW'), `${id}: nog geen opname`);
  }
  // de data van de terugblik en van V1 volgt de scène
  for (const deel of ['avond', 'zondag']) assert.deepEqual(V.INVAL[deel].map((l) => l.tekst), I.INVAL_PARTS[deel].map(([, x]) => x), deel);
  assert.deepEqual(V.INVAL.clubhuis.map((l) => l.tekst), I.INVAL_PARTS.clubhuis.slice(0, 2).map(([, x]) => x), 'de terugblik is het begin van het clubhuis');
});
t('de regie valideert en compileert; elke beat, shot en lichtwissel vindt zijn regel; gebaren en cast bestaan', () => {
  const spec = I.invalSpec();
  const looks = { ...NPC, ...stubLooks() };
  const tl = I.invalTimeline();
  const def = missionScene(null, tl.lines, { looks, spec });
  assert.ok(def, 'missionScene bouwt een definitie');
  const probs = validateScene(def, { lines: tl.lines, duration: tl.total });
  assert.deepEqual(probs, [], probs.join(' | '));
  assert.ok(compileScene(def, { lines: tl.lines, duration: tl.total }));
  const vindt = (on) => typeof on !== 'string' || tl.lines.some((l) => l.text.startsWith(on));
  for (const b of spec.beats) { assert.ok(vindt(b.on), `beat "${b.on}"`); assert.ok(!b.anim || ACTOR_ANIMS.includes(b.anim), b.anim); }
  for (const s of spec.shots) assert.ok(vindt(s.on), `shot "${s.on}"`);
  for (const l of spec.lights) assert.ok(vindt(l.on), `licht "${l.on}"`);
  // een prefix die twee regels raakt is dubbelzinnig: elke `on` is uniek voor zijn regel
  for (const b of spec.beats) if (typeof b.on === 'string') assert.equal(tl.lines.filter((l) => l.text.startsWith(b.on)).length, 1, `beat "${b.on}" is eenduidig`);
  for (const c of Object.values(spec.cast)) assert.ok(c.key.startsWith('ploeg') || NPC[c.key], `${c.key} staat in de NPC-tabel van missionstory.js`);
  assert.equal(NPC.albert.name, 'Albert Teuben');
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(def))), JSON.stringify(def), 'de definitie is gewone data (een gast kijkt lokaal na)');
  assert.ok(Object.values(spec.cast).every((c) => Math.hypot(c.at[0], c.at[1]) <= 30), 'iedereen staat dichtbij');
  assert.ok(spec.cast.eppo.at[0] > 8, 'Eppo komt van ver');
  assert.equal(spec.duo.tessa.look, undefined, 'Tessa draagt haar eigen kleren; het clubtenue komt in de eerste training');
  assert.ok(['avond-buiten'].includes(spec.light) && spec.lights.map((l) => l.light).join() === 'dag,gouden-uur', 'avond, dan de zondag, dan het gouden uur');
});
t('de voorwaarde: alleen een nieuwe carrière bij De Hoekers, eenmaal per speler, vóór de eerste training', () => {
  assert.ok(village && village.naam === V.STORY_VILLAGE_CLUB);
  const c = start();
  assert.equal(c.club, village.id);
  const vlaggen = new Set();
  assert.equal(I.invallerDue(c, vlaggen, village.id), true, 'een nieuwe carrière bij De Hoekers');
  assert.equal(footballDue(c, vlaggen), true, 'de eerste training zou ook aan de beurt zijn: de aanleiding gaat voor (careerdebutrun.js)');
  assert.equal(I.invallerDue(c, new Set([I.INVAL_FLAG]), village.id), false, 'eenmaal gezien of overgeslagen: nooit meer');
  assert.equal(I.invallerDue(c, new Set([FOOTBALL_FLAG]), village.id), true, 'de vlag van de eerste training is een andere vlag');
  assert.equal(I.invallerDue({ ...c, stats: { ...c.stats, matches: 1 } }, vlaggen, village.id), false, 'na een eerste wedstrijd is het geen begin meer');
  assert.equal(I.invallerDue({ ...c, stats: { ...c.stats, simulated: 1 } }, vlaggen, village.id), false);
  assert.equal(I.invallerDue({ ...c, seasonNr: 2 }, vlaggen, village.id), false);
  assert.equal(I.invallerDue({ ...c, club: 'stadjers' }, vlaggen, village.id), false, 'een andere startclub krijgt alleen de eerste training');
  assert.equal(I.invallerDue(c, vlaggen, null), false, 'zonder dorpsclub in de data geen scène');
  assert.equal(I.invallerDue(null, vlaggen, village.id), false);
  assert.equal(I.invallerDue({ started: false }, vlaggen, village.id), false);
  assert.equal(I.invallerDue(c, null, village.id), false);
});
t('Samen spelen: de scène is data, een gast krijgt de terugblik van Albert en schrijft geen vlag', () => {
  const vlaggen = new Set();
  const terug = I.guestRetrospect();
  assert.ok(terug.length >= 1 && terug.every((l) => l.wie === 'Albert Teuben'));
  I.invallerDue(start(), vlaggen, village.id);          // alleen lezen
  assert.equal(vlaggen.size, 0, 'de voorwaarde schrijft nooit een vlag; dat doet alleen wie de scène start');
  const a = I.invalTimeline(), b = I.invalTimeline();
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'de tijdlijn is deterministisch (host en gast zien hetzelfde)');
});
console.log(`careerdebut_voetbal_test: ${n} groepen ok`);
