// Het slot van akte 5 (verhaal-eind, F1 tot en met F6, de snackwagen Tam & Tes, Jelle en zijn oma, de verzoening, de aftitelkaart):
//   node scripts/akte5_slot_test.mjs
// Zuiver, zonder spel en zonder kaart. Wat dit bewaakt: de stappen staan op hun plek in de keten en in de kalender; elke F-scène heeft een
// regie die op de echte regels past (elke beat vindt zijn regel, de scène bouwt, valideert en samplet) met props en figuranten die bestaan;
// de canon klopt (geen Fjord, Tam & Tes pas vanaf het luik, geen naam vóór zijn voorstelling, de vijf woorden en de telling kloppen); de
// terugblikgrappen van de aftitelkaart staan echt in het script. Wat het niet ziet: hoe het eruitziet (Electron) en of de plekken op de echte kaart op land liggen.
import { readFileSync } from 'node:fs';
import { compileScene, validateScene } from '../game/js/cutscript.js';
import { MORE_SPECS as SPECS, missionScene } from '../game/js/cutscenes_akte1.js';
import '../game/js/cutscenes_akte5.js';
import { propKindIssue, DECOR_KINDS, PROP_SOURCES, VEHICLE_MODEL_NAMES, PLACEHOLDER_KINDS } from '../game/js/cutscenemodels.js';
import { PROP_KINDS } from '../game/js/cutscript.js';
import { STEPS } from '../game/js/storyarc.js';
import { STEP_DAY } from '../game/js/calendar.js';
import { VAN_MILESTONES } from '../game/js/storymilestones.js';
import { BEPPE_LOOK } from '../game/js/storycast.js';
import { CLUES } from '../game/js/storyarc_nieuw.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

const data = JSON.parse(read('game/storydata/script.json'));
const scene = (id) => data.scenes.find((s) => s.id === id);
const textOf = (id) => (scene(id) ? scene(id).lines.map((l) => l.text).join(' ') : '');
const srcMission = read('game/js/missionstory.js');

// --- de stappen: plek in de keten, type, kalender -------------------------------------------------------------------------------
const idx = (id) => STEPS.findIndex((s) => s.id === id);
const F = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
for (const id of F) {
  const s = STEPS[idx(id)];
  ok(s, id + ' bestaat');
  if (!s) continue;
  ok(s.goal.type === 'reis' && s.added === true, id + ' is een toegevoegde reisstap (zonder beloning, met migratie)');
  ok(Array.isArray(s.goal.at) && s.goal.at[0] > 52.9 && s.goal.at[0] < 53.5 && s.goal.at[1] > 6.1 && s.goal.at[1] < 7.3, id + ' ligt in de provincie');
  ok(s.goal.r >= 200 && s.goal.r <= 600, id + ' heeft een redelijke straal', String(s.goal.r));
  ok(scene(s.goal.scene) && scene(s.goal.scene).lines.length >= 8, id + ' heeft een scène met regels');
  ok(Array.isArray(s.lead) && s.lead[1].length > 20, id + ' heeft een lead (wat nu)');
}
ok(idx('F1') < idx('M22') && idx('M22') < idx('F2') && idx('F2') < idx('M23'), 'F1 vóór M22, F2 tussen M22 en M23');
ok(idx('M26') < idx('F3') && idx('F3') < idx('F4') && idx('F4') < idx('F5') && idx('F5') < idx('E'), 'F3 tot en met F5 na M26 en vóór de epiloog');
ok(idx('M30') < idx('F6'), 'F6 na M30 (de overgang naar het eindspel)');
ok(STEPS.find((s) => s.part === 'ontzet').id === 'F1', 'F1 is de eerste stap van akte 5: de wereld snackwagen opent daar (unlockgate.js)');
ok(/id: .snackwagen., kind: .wereld., part: .ontzet./.test(read('game/js/unlockgate.js')), 'de poort snackwagen hoort bij akte 5');
const day = (id) => STEP_DAY.get(id);
ok(day('F1') === day('M22') && day('F2') > day('F1') && day('F2') === day('M23'), 'F1 en M22 op woensdag, F2 op donderdag');
ok(day('F3') > day('M26') && day('F4') > day('F3') && day('F5') === day('F4'), 'F3 zaterdag, F4 en F5 zondag, na het Ontzet');
ok(day('F5') < day('E'), 'het slot van augustus vóór de epiloog van 11 september');
let mono = true, last = -1;
for (const s of STEPS) { const d = day(s.id); if (d != null) { if (d < last) mono = false; last = d; } }
ok(mono, 'de kalender loopt nooit terug over de stappen');
// de mijlpalen van de snackwagen: de naam pas bij het luik (M22), de standplaats bij het Ontzet (M26)
const ms = (flag) => VAN_MILESTONES.find((m) => m.flag === flag);
ok(idx('F1') < idx(ms('wagen:naam').step), 'F1 komt vóór wagen:naam (het luik is nog een tekening)');
ok(idx(ms('wagen:standplaats').step) < idx('F3'), 'wagen:standplaats is gehaald vóór de verzoening');
// het logboek ("Wat weten we?") kent elke slotstap, en de naam van de wagen staat pas bij het luik
for (const id of F) ok(CLUES.some((c) => c.step === id), id + ' laat een regel achter in het logboek');
ok(!CLUES.filter((c) => idx(c.step) < idx('M22')).some((c) => /Tam & Tes/i.test(c.text + c.title)), 'het logboek noemt Tam & Tes niet vóór M22');

// --- de scènes: regie op de echte regels --------------------------------------------------------------------------------------------
const looks = {};
for (const m of srcMission.matchAll(/^ {2}(\w+): \{.*?name: \x27([^\x27]+)\x27/gm)) looks[m[1]] = { name: m[2], shirt: 0x808080, skin: 0xd0a080 };
ok(looks.beppe && looks.beppe.name === 'Beppe' && looks.mem && looks.jelle && looks.durk && looks.douwe && looks.trijntje, 'de rolkaart kent Beppe, Mem, Jelle, Durk, Douwe en Oma Trijntje');
ok(BEPPE_LOOK && BEPPE_LOOK.look && BEPPE_LOOK.look.age === 'old', 'Beppe heeft een uiterlijk in storycast.js');
const NAME = { T: 'Tammo', A: 'Anita' };
function linesOf(id) {
  const out = [];
  let t = 0.6;
  for (const l of scene(id).lines) {
    if (l.channel === 'app-stil') continue;
    const dur = Math.max(2.2, Math.min(8, 1.3 + l.text.length * 0.058));
    out.push({ speaker: NAME[l.key] || (looks[l.key] && looks[l.key].name) || l.key, text: l.text, at: t, dur });
    t += dur + 0.1;
  }
  return { lines: out, total: t + 0.3 };
}
for (const id of F) {
  const spec = SPECS[id];
  ok(spec, id + ' heeft een regie (cutscenes_akte5.js)');
  if (!spec) continue;
  const { lines, total } = linesOf(id);
  for (const b of spec.beats) if (typeof b.on === 'string') ok(lines.some((l) => l.text.startsWith(b.on)), id + ' beat vindt zijn regel', b.on);
  for (const s of spec.shots) if (typeof s.on === 'string') ok(lines.some((l) => l.text.startsWith(s.on)), id + ' shot vindt zijn regel', s.on);
  for (const [pid, p] of Object.entries(spec.props || {})) ok(!propKindIssue(p.kind) && PROP_KINDS.includes(p.kind), id + ' prop ' + pid + ' bestaat (' + p.kind + ')');
  const def = missionScene(id, lines, { looks });
  ok(def, id + ' bouwt');
  if (!def) continue;
  const issues = validateScene(def, { lines, duration: total });
  ok(issues.length === 0, id + ' valideert', issues.join(' | '));
  if (issues.length) continue;
  const sc = compileScene(def, { lines, duration: total });
  const anchor = { x: 500, y: -300, facing: 1.1, z: 0 };
  let finite = true, near = true, maxStep = 0, prev = null;
  const shotsSeen = new Set();
  for (let t = 0; t <= total; t += 0.1) {
    const s = sc.sample(t, anchor), c = s.camera;
    for (const v of [c.position.x, c.position.y, c.position.z, c.lookAt.x, c.lookAt.y, c.lookAt.z, c.fov]) if (!Number.isFinite(v)) finite = false;
    if (Math.hypot(c.position.x - anchor.x, c.position.y - anchor.y) > 45) near = false;
    for (const a of Object.values(s.actors)) for (const v of [a.x, a.y, a.a, a.gaze]) if (!Number.isFinite(v)) finite = false;
    if (prev) for (const [aid, a] of Object.entries(s.actors)) maxStep = Math.max(maxStep, Math.hypot(a.x - prev.actors[aid].x, a.y - prev.actors[aid].y));
    shotsSeen.add(c.shotIndex);
    prev = s;
  }
  ok(finite, id + ' samplet eindig');
  ok(near, id + ' camera blijft bij de set');
  ok(maxStep < 0.45, id + ' niemand springt', String(maxStep));
  ok(shotsSeen.size >= 3, id + ' de camera varieert', String(shotsSeen.size));
  for (const l of lines) {
    const s = sc.sample(l.at + 0.5, anchor);
    if (l.speaker === 'Tammo') ok(s.speakerActor === 'tammo', id + ' Tammo spreekt', l.text);
    else if (l.speaker === 'Anita') ok(s.speakerActor === 'tessa', id + ' Tessa spreekt', l.text);
  }
  // een bewerkte tekst breekt de scène niet
  const edited = lines.map((l, i) => ({ ...l, text: 'Bewerkte regel ' + i }));
  const d2 = missionScene(id, edited, { looks });
  ok(d2 && validateScene(d2, { lines: edited, duration: total }).length === 0, id + ' valideert ook met bewerkte regels');
}
// F3 is de verzoeningsscène met Beppe; F4 heeft de rij en Mem als doorslag; F5 is het zoete hoogtepunt
ok(SPECS.F3.set === 'omakeuken' && SPECS.F3.cast.beppe && SPECS.F3.cast.trijntje && SPECS.F3.cast.mem, 'F3: Oma Trijntje, Beppe en Mem in één keuken');
ok(Object.keys(SPECS.F4.cast).filter((k) => /^rij\d/.test(k)).length >= 5 && SPECS.F4.cast.mem && SPECS.F4.cast.jelle, 'F4: een rij met Jelle achteraan en Mem aan zijn arm');
ok(Object.values(SPECS.F5.duo).every((d) => d.sit > 0) && Object.values(SPECS.F5.props).some((p) => p.kind === 'deken'), 'F5: ze zitten naast elkaar, met een deken');
ok(Object.values(SPECS.F6.props).some((p) => p.kind === 'kaart') && Object.values(SPECS.F6.props).some((p) => p.kind === 'snackwagen'), 'F6: de kaart ligt op het luik van de snackwagen');

// --- props en modellen bestaan --------------------------------------------------------------------------------------------------
const host = read('game/js/cutscenehost.js');
const makers = new Set([...host.matchAll(/^ {2}(\w+): \(\) =>/gm)].map((m) => m[1]));
for (const k of ['frituuraanhanger', 'friteuse', 'bierviltje', 'deken', 'soepketel', 'mosterdpot', 'kaart', 'hek']) {
  ok(DECOR_KINDS.includes(k) && PROP_KINDS.includes(k) && makers.has(k), 'decor ' + k + ' heeft een model in cutscenehost.js');
}
ok(PROP_SOURCES.snackwagen && PROP_SOURCES.snackwagen.vehicle === 'foodtruck' && VEHICLE_MODEL_NAMES.includes('foodtruck'), 'snackwagen komt uit het voertuigregister (de foodtruck met TAM & TES)');
ok(PLACEHOLDER_KINDS.includes('aanhanger') && !Object.values(SPECS).some((s) => Object.values(s.props || {}).some((p) => p.kind === 'aanhanger')), 'geen placeholder-aanhanger in een scène');
ok(read('game/js/models3d_vehicles.js').includes('TAM & TES'), 'de wagen draagt TAM & TES');

// --- canon ------------------------------------------------------------------------------------------------------------------------
const slot = [...F, 'E1', 'E2', 'E3', 'M22.1', 'M22.2', 'M22.3', 'M22.4', 'M23.1', 'M24.1', 'M25.1', 'M26.1', 'M26.4', 'M26.13'];
for (const id of slot) ok(scene(id), id + ' bestaat in script.json');
ok(!slot.some((id) => /\bFjord\b/.test(textOf(id))), 'geen "Fjord" meer in het slot (de wagen heet Tam & Tes)');
// een humorkeuze (humor.*.json) mag nooit een regel dubbel maken: dezelfde spreker zegt in een scène nooit twee keer dezelfde zin
for (const s of data.scenes.filter((q) => /^(F\d|E\d?|M2[2-6](\.|$)|M30\.)/.test(q.id))) {
  const seen = new Set();
  let dup = null;
  for (const l of s.lines) { const k = l.key + '|' + l.text; if (seen.has(k) && l.text.length > 12) dup = l.text; seen.add(k); }
  ok(!dup, s.id + ': geen dubbele regel van dezelfde spreker', dup || '');
}
const earlier = (id) => data.scenes.filter((s) => idx(s.step) !== -1 && idx(s.step) < idx(id));
const blob = (s) => s.lines.map((l) => l.text).join(' ');
ok(!earlier('M22').some((s) => /TAM & TES/i.test(blob(s))), 'Tam & Tes staat pas vanaf het luik (M22) in de tekst');
ok(!earlier('M27').some((s) => /Willemien/.test(blob(s))), 'Willemien is pas voorgesteld in M27 en wordt daarvoor niet bij naam genoemd');
ok(/Eén koekje/.test(textOf('M22.2')) && /Tam\. Tes\./.test(textOf('M22.2')), 'Henk merkt de naam op en de grap wordt niet uitgelegd (M22.2)');
const wordsOf = (t) => t.replace(/[.,!?…]/g, ' ').split(/\s+/).filter(Boolean).length;
ok(wordsOf('Ik wil bij jou blijven') === 5 && /Ik wil bij jou blijven\./.test(textOf('M26.7')), 'de vijf woorden van M26.7 zijn er vijf');
{
  const f5 = scene('F5').lines;
  const at = f5.findIndex((l) => /^Wat wil jij eigenlijk/.test(l.text));
  const wish = f5[at + 1].text, counted = f5[at + 2].text;
  const NUM = { een: 1, twee: 2, drie: 3, vier: 4, vijf: 5 };
  const said = NUM[(/Dat waren er (\w+)/.exec(counted) || [])[1]];
  ok(said === wordsOf(wish), 'F5: Tessa telt wat Tammo echt zei', wish + ' / ' + counted);
}
ok(/Gerda Terpstra/.test(textOf('M26.13')) && /Mem/.test(textOf('F4')) && /1953/.test(textOf('F4')), 'Jelle: de doorslag is zijn oma Mem (M26.13, F4), nooit geweld');
ok(!slot.some((id) => /\b(slaan|slaat|sloeg|bloed)\b/i.test(textOf(id))), 'satire zonder leed: geen geweld in het slot');
ok(/Hij is Gronings, ik ben Fries/.test(textOf('F3')) && /It smakket/.test(textOf('F3')), 'F3: Groningers en Friezen verzoend (Beppe, Oma Trijntje, Mem)');
ok(textOf('F6').includes('Alles blijft open') && /Hereweg/.test(textOf('F6')), 'F6: niets stopt, de overgang naar het eindspel');
ok(/eenenveertig/i.test(textOf('E2')) && /Eenenveertig tegen één/.test(textOf('F6')), 'de 41 snackbars kloppen tussen F6 en E2');

// --- de aftitelkaart: elke terugblikgrap staat echt in het script ------------------------------------------------------------------
const story = read('game/js/story.js');
const tb = /const TERUGBLIK = \[([\s\S]*?)\n\];/.exec(story);
ok(tb, 'TERUGBLIK staat in story.js');
const pairs = tb ? [...tb[1].matchAll(/\[\x27([^\x27]+)\x27, \x27([^\x27]+)\x27\]/g)].map((m) => [m[1], m[2]]) : [];
ok(pairs.length === 7, 'zeven terugblikgrappen', String(pairs.length));
const TRACE = [['F1', 'viltje'], [null, 'stoep met een overeenkomst'], ['E2', 'Krolbrug'], ['M22.2', 'vijf minuten voor'], ['M22.2', 'Eén koekje'], ['F5', 'elf seconden'], ['E1', 'duiven staan weer in de rij']];
ok(pairs.length === TRACE.length, 'elke terugblikgrap heeft een herkomst in het script');
TRACE.forEach(([sid, frag], k) => {
  const t = (sid ? textOf(sid) : data.scenes.map(blob).join(' ')).toLowerCase();
  ok(t.includes(frag.toLowerCase()), 'terugblik ' + (k + 1) + ' (' + (pairs[k] ? pairs[k][0] : '?') + '): "' + frag + '" staat in ' + (sid || 'het script'));
});
ok(new Set(pairs.map((p) => p[0])).size === pairs.length, 'geen dubbele terugblikgrap');

console.log(fails ? `${fails} of ${n} failed` : `akte5_slot_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
