// Audit van de verhaalsystemen (WP-poort, #1121): controleert over alle aktes de poortvolgorde en de vlaggen op deadlocks.
// Zuiver data-gedreven, geen DOM, geen Electron, geen opslag. Draai: node scripts/verhaal_systemen_audit.mjs [--json]
// Controles:
//   A  structuur   unieke stap-id's, aktes monotoon, elke akte heeft een stap, elke stap bestaat en is gebouwd
//   B  bereikbaar  de verhaalketen (nextStoryStep) bezoekt elke stap precies een keer, ook met een oude save
//   C  poort       monotone ontgrendeling per akte, elke wereld gaat ooit open, elk doel dat een wereld nodig heeft staat dan open
//   D  vlaggen     elke gelezen vlag wordt gezet, mijlpalen kloppen met de aktes
//   E  beloning    elke missie hoort bij precies een stap (geen dubbele uitbetaling), elke unlocks-vlag komt op een stap
//   F  Bezit       takken, wereld en akte lopen gelijk; snackwagen-fasen volgen de mijlpalen
//   G  Jelle       elke akte heeft een offerte en een handlanger, de akten van jellebaas.js zijn die van de poort
//   H  migratie    oude saves (zonder poort, v:1, voorbij een gewijzigde stap) blijven doorgaan zonder dataverlies
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEPS, PARTS, MISSION_IDS, STEP_ALIAS, RETIRED_STEPS, BRIDGES, nextStoryStep, stepDone, ADDED_STEPS, BETWEEN_STEPS, STEP_BY_ID, CHARACTERS, SPEAKERS } from '../game/js/storyarc.js';
import { PART_ORDER, GATE_VERSION, gateWorlds, gateWorld, worldOpen, progressFrom, newGate, stampGate, migrateGate, gateProblems, registerGateWorld, resetGateRegistry } from '../game/js/unlockgate.js';
import { VAN_MILESTONES, VAN_FLAGS, milestoneFlagsFor, milestoneFlagsForDone } from '../game/js/storymilestones.js';
import { BEZIT_BRANCHES, GATE_WORLD, makeActGate } from '../game/js/bezitgate.js';
import { STAGE_FLAGS, STAGES, flagsFrom } from '../game/js/snackstory.js';
import { ROMANCE_CHOICES, ROMANCE_FLAGS } from '../game/js/storyromance.js';
import { BOSS, ACTS as BOSS_ACTS } from '../game/js/jellebaas.js';
import { VAK_IDS } from '../game/js/loopbaan.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');
const rows = [];
const count = { ok: 0, fout: 0, info: 0 };
const ok = (c, tag, ...rest) => { if (c) { count.ok++; rows.push({ s: 'ok', tag }); } else { count.fout++; rows.push({ s: 'FOUT', tag, d: rest.join(' ') }); } return !!c; };
const info = (tag, ...rest) => { count.info++; rows.push({ s: 'INFO', tag, d: rest.join(' ') }); };

const partIdx = (p) => PART_ORDER.indexOf(p);
const idxOf = (id) => STEPS.findIndex((s) => s.id === id);
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---------- A: structuur ----------
const ids = STEPS.map((s) => s.id);
ok(new Set(ids).size === ids.length, 'A1 stap-id\'s zijn uniek', ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
ok(STEPS.every((s) => partIdx(s.part) >= 0 && PARTS[s.part]), 'A2 elke stap hoort bij een bekende akte');
{
  let prev = -1; let bad = '';
  for (const s of STEPS) { const p = partIdx(s.part); if (p < prev && !bad) bad = s.id; prev = Math.max(prev, p); }
  ok(!bad, 'A3 de aktes lopen alleen vooruit langs de stappen', bad);
}
ok(PART_ORDER.every((p) => STEPS.some((s) => s.part === p)), 'A4 elke akte uit de poortvolgorde heeft minstens een stap');
ok(Object.keys(PARTS).every((p) => PART_ORDER.includes(p)), 'A5 elke akte van het verhaal staat in de poortvolgorde');
ok(STEPS.every((s) => s.built === true), 'A6 elke stap is gebouwd');
ok(STEPS[0].id === 'M00' && STEPS[0].goal && STEPS[0].goal.type === 'opening', 'A7 het verhaal begint met de opening (M00); een nieuw spel krijgt daar zijn poort');
ok(STEPS.filter((s) => s.kind === 'mission').every((s) => s.mission && Number.isFinite(s.reward)), 'A8 elke missiestap heeft een missie en een beloning');
ok(STEPS.filter((s) => s.kind === 'activity').every((s) => s.goal && s.goal.type), 'A9 elke activiteit heeft een doel');
ok(BRIDGES.every((b) => idxOf(b.after) >= 0), 'A10 elke overgangsscène hangt aan een bestaande stap', BRIDGES.filter((b) => idxOf(b.after) < 0).map((b) => b.id).join(','));
ok(Object.values(STEP_ALIAS).every((id) => STEP_BY_ID.has(id)), 'A11 elke stapalias wijst naar een bestaande stap');
ok(RETIRED_STEPS.every((id) => !STEP_BY_ID.has(id)), 'A12 een uitgefaseerde stap bestaat niet meer');

// ---------- B: bereikbaarheid ----------
// Een speler speelt de stappen in volgorde; de eindkaart van een akte wordt gezien zodra de keten erom vraagt.
function walk() {
  const done = new Set(); const cards = new Set(); const order = [];
  for (let n = 0; n < STEPS.length * 3; n++) {
    const r = nextStoryStep((id) => done.has(id), () => false, (p) => cards.has(p));
    if (r.end) {
      if (r.finale && PARTS[r.end] && !cards.has(r.end) && STEPS.some((s) => PARTS[s.part].after === r.end)) { cards.add(r.end); continue; }
      return { order, end: r.end, finale: !!r.finale, stuck: r.next ? r.next.id : null };
    }
    if (order.includes(r.id)) return { order, loop: r.id };
    order.push(r.id); done.add(r.id);
  }
  return { order, loop: 'te veel rondes' };
}
const w = walk();
ok(!w.loop && !w.stuck, 'B1 de keten komt zonder lus of blokkade aan het einde', w.loop || w.stuck || '');
ok(w.order.length === STEPS.length && w.order.every((id, i) => id === STEPS[i].id), 'B2 elke stap wordt precies een keer en in volgorde gespeeld', `${w.order.length}/${STEPS.length}`);
ok(w.end === 'nazomer' && w.finale, 'B3 het verhaal eindigt na de nazomer', String(w.end));
{
  const missionDone = new Set(STEPS.filter((s) => s.kind === 'mission').map((s) => s.id));
  const r = nextStoryStep((id) => missionDone.has(id), () => false, () => true);
  ok(!r.end ? ADDED_STEPS.includes(r.id) && STEPS.slice(idxOf(r.id)).every((x) => ADDED_STEPS.includes(x.id) || x.kind === 'activity') : !r.next, 'B4 als alle missies gedaan zijn, blijft hooguit de laatste toegevoegde stap (F6) over: geen blokkade', r.id || '');
}
{
  let bad = '';
  for (let k = 0; k < STEPS.length; k++) {
    const done = new Set(STEPS.slice(0, k).map((s) => s.id));
    const cards = new Set(PART_ORDER.filter((p) => partIdx(p) < partIdx(STEPS[k].part)));
    const r = nextStoryStep((id) => done.has(id), () => false, (p) => cards.has(p));
    if (r.end || r.id !== STEPS[k].id) { bad = `${STEPS[k].id}->${r.id || 'einde:' + r.end}`; break; }
  }
  ok(!bad, 'B5 vanaf elke stand is de volgende stap de eerstvolgende in de lijst', bad);
}

// ---------- C: poort ----------
resetGateRegistry();
ok(gateProblems().length === 0, 'C1 elke wereld wijst naar een bestaande akte', gateProblems().join(';'));
const worlds = gateWorlds();
const vakWorlds = worlds.filter((x) => x.kind === 'loopbaan');
ok(VAK_IDS.every((v) => gateWorld(v)), 'C2 elk vak van de loopbanen heeft een poortregistratie (anders is het altijd open)', VAK_IDS.filter((v) => !gateWorld(v)).join(','));
ok(vakWorlds.every((x) => x.hint && /[.!?]$/.test(x.hint) && x.hint.length <= 140), 'C3 elk vak heeft een korte hint van een personage', vakWorlds.filter((x) => !x.hint).map((x) => x.id).join(','));
const known = new Set([...Object.values(SPEAKERS), ...Object.values(CHARACTERS).map((c) => c.name).filter(Boolean)]);
const strangers = [...new Set(worlds.map((x) => x.by).filter((b) => b && !known.has(b)))];
if (strangers.length) info('C4 introducerende personen die niet als sprekersnaam bestaan (controleer de naam)', strangers.join(', '));
const openAt = (k) => {
  const pr = progressFrom({ stepId: STEPS[k].id, gate: newGate() });
  return new Set(worlds.filter((x) => worldOpen(x.id, pr)).map((x) => x.id));
};
{
  let prevSet = new Set(); let regress = '';
  for (let k = 0; k < STEPS.length; k++) {
    const s = openAt(k);
    for (const x of prevSet) if (!s.has(x)) regress = `${x} bij ${STEPS[k].id}`;
    prevSet = s;
  }
  ok(!regress, 'C5 een wereld die open ging, blijft open langs de stappen', regress);
  const endOpen = new Set(worlds.filter((x) => worldOpen(x.id, progressFrom({ ended: true, gate: newGate() }))).map((x) => x.id));
  ok(endOpen.size === worlds.length, 'C6 elke wereld gaat uiterlijk bij het einde van het verhaal open', worlds.filter((x) => !endOpen.has(x.id)).map((x) => x.id).join(','));
  const lastStepOpen = openAt(STEPS.length - 1);
  ok(worlds.every((x) => lastStepOpen.has(x.id)), 'C6b elke wereld staat al open in de laatste stap (geen wereld die pas na de aftitels opengaat)', worlds.filter((x) => !lastStepOpen.has(x.id)).map((x) => x.id).join(','));
}
{
  const s0 = openAt(0);
  const early = worlds.filter((x) => partIdx(x.part) > 0 && s0.has(x.id)).map((x) => x.id);
  ok(early.length === 0, 'C7 een nieuw spel begint dicht: bij de opening staat niets van een latere akte open', early.join(','));
  ok(worlds.some((x) => x.part === 'kop' && s0.has(x.id)), 'C8 in akte 1 staat wel het werk van akte 1 open');
}
{
  // Elk doel dat een wereld nodig heeft staat open op het moment van de stap: anders vraagt het verhaal wat het zelf nog dicht houdt.
  const NEED = { train: ['trein'], padel: ['padel'], kermis: ['kermis'], flight: ['lucht'] };
  const bad = [];
  for (const [k, s] of STEPS.entries()) {
    if (s.kind !== 'activity' || !s.goal) continue;
    const need = s.goal.type === 'sideJob' ? (s.loopbanen || []) : NEED[s.goal.type] || [];
    const open = openAt(k);
    for (const v of need) if (gateWorld(v) && !open.has(v)) bad.push(`${s.id}:${v}`);
  }
  ok(!bad.length, 'C9 elk doel dat een loopbaan nodig heeft staat open op de stap zelf', bad.join(','));
  const bad2 = [];
  for (const [k, s] of STEPS.entries()) for (const v of s.loopbanen || []) if (gateWorld(v) && !openAt(k).has(v)) bad2.push(`${s.id}:${v}`);
  ok(!bad2.length, 'C10 de loopbanen die een stap noemt staan op die stap open', bad2.join(','));
  const firstStepIdx = (v) => STEPS.findIndex((s) => (s.loopbanen || []).includes(v));
  const unnamed = VAK_IDS.filter((v) => firstStepIdx(v) < 0);
  ok(unnamed.length === 0, 'C11 elk vak wordt door een stap genoemd (anders is de tour niet af te maken)', unnamed.join(','));
  const mism = VAK_IDS.filter((v) => firstStepIdx(v) >= 0 && gateWorld(v) && gateWorld(v).part !== STEPS[firstStepIdx(v)].part);
  ok(!mism.length, 'C12 de akte van elk vak is de akte van zijn eerste stap', mism.join(','));
  const n = gateWorlds().length;
  registerGateWorld({ id: 'snackwagen', part: 'ontzet', by: 'Tessa', hint: 'Test.' });
  ok(gateWorlds().length === n, 'C13 een wereld twee keer registreren verdubbelt niets');
  resetGateRegistry();
}

// ---------- D: vlaggen ----------
const unlocks = STEPS.filter((s) => s.unlocks).map((s) => ({ step: s.id, flag: s.unlocks }));
ok(new Set(unlocks.map((u) => u.flag)).size === unlocks.length, 'D1 elke unlocks-vlag staat op een stap (geen dubbele zetting)');
ok(VAN_MILESTONES.every((m) => idxOf(m.step) >= 0), 'D2 elke wagenmijlpaal hangt aan een bestaande stap');
ok(new Set(VAN_FLAGS).size === VAN_FLAGS.length, 'D3 elke wagenvlag komt een keer voor');
ok(VAN_MILESTONES.every((m) => STEPS[idxOf(m.step)] && STEPS[idxOf(m.step)].part === m.akte), 'D4 elke wagenmijlpaal noemt de akte van zijn stap', VAN_MILESTONES.filter((m) => STEPS[idxOf(m.step)] && STEPS[idxOf(m.step)].part !== m.akte).map((m) => m.flag).join(','));
ok(VAN_MILESTONES.every((m, i) => i === 0 || idxOf(m.step) >= idxOf(VAN_MILESTONES[i - 1].step)), 'D5 de wagenmijlpalen volgen de volgorde van het verhaal');
{
  const upTo = (k) => STEPS.slice(0, k + 1).map((s) => s.id);
  const all = new Set(milestoneFlagsForDone(upTo(STEPS.length - 1)));
  ok(VAN_FLAGS.every((f) => all.has(f)), 'D6 een save aan het einde krijgt alle wagenvlaggen');
  const mid = new Set(milestoneFlagsForDone(upTo(idxOf('M13'))));
  ok(mid.has('wagen:stek') && !mid.has('wagen:team') && !mid.has('wagen:naam'), 'D7 een save op M13 heeft de stek maar nog niet het team en de naam');
  ok(VAN_MILESTONES.every((m) => milestoneFlagsFor(m.step).includes(m.flag)), 'D8 milestoneFlagsFor geeft de vlag van elke mijlpaal');
}
{
  const settable = new Set([...unlocks.map((u) => u.flag), ...VAN_FLAGS, ...ROMANCE_FLAGS, 'credits']);
  const prefixes = ['met:', 'recap:', 'bridge:', 'keuze:', 'onderduik:', 'reis:', 'romantiek:'];
  const dir = path.join(ROOT, 'game', 'js');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  const reads = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of src.matchAll(/(?:storyFlag|flags\.has|state\.flags\.has)\(\s*'([^'$]+)'\s*\)/g)) reads.push({ f, flag: m[1] });
  }
  const unset = reads.filter((r) => !settable.has(r.flag) && !prefixes.some((p) => r.flag.startsWith(p)));
  ok(unset.length === 0, `D9 elke gelezen vlag (${reads.length} plekken) wordt gezet`, unset.map((r) => `${r.f}:${r.flag}`).join(','));
  const readSet = new Set(reads.map((r) => r.flag));
  const unread = unlocks.filter((u) => !readSet.has(u.flag));
  if (unread.length) info('D10 stille vlaggen die alleen gezet worden', unread.map((u) => u.flag).join(','));
  ok(ROMANCE_CHOICES.every((c) => BRIDGES.some((b) => b.id === c.bridge)), 'D11 elke romantiekkeuze hangt aan een bestaande overgangsscène');
  const extraFlags = BRIDGES.flatMap((b) => (b.extra || []).map((e) => e.if));
  ok(extraFlags.every((f) => ROMANCE_FLAGS.includes(f)), 'D12 elke vlag waar een scène op wacht kan door een keuze gezet worden', extraFlags.filter((f) => !ROMANCE_FLAGS.includes(f)).join(','));
  const bridgeIdx = (id) => idxOf(BRIDGES.find((b) => b.id === id).after);
  const late = BRIDGES.filter((b) => (b.extra || []).some((e) => bridgeIdx(ROMANCE_CHOICES.find((c) => c.flags.includes(e.if)).bridge) >= idxOf(b.after))).map((b) => b.id);
  ok(late.length === 0, 'D13 een keuze valt altijd voor de scène die erop wacht', late.join(','));
}

// ---------- E: beloning ----------
{
  const missions = STEPS.filter((s) => s.kind === 'mission');
  ok(new Set(missions.map((s) => s.mission)).size === missions.length, 'E1 elke missie hoort bij precies een stap (geen dubbele uitbetaling)');
  ok(new Set(MISSION_IDS).size === MISSION_IDS.length, 'E2 MISSION_IDS heeft geen dubbele id\'s');
  ok(missions.every((s) => MISSION_IDS.includes(s.mission)), 'E3 elke missie van een stap staat in MISSION_IDS');
  ok(STEPS.filter((s) => s.kind === 'activity').every((s) => !s.reward), 'E4 een activiteit betaalt zelf niets uit');
  ok(missions.every((s) => s.minReward === undefined || s.minReward <= s.reward), 'E5 de minimumbeloning ligt nooit boven de beloning');
  ok(STEPS.filter((s) => s.voorschot).every((s) => s.cost > 0), 'E6 een voorschot hoort bij een stap met kosten');
  ok(ADDED_STEPS.every((id) => !STEP_BY_ID.get(id).reward && !STEP_BY_ID.get(id).cost && !STEP_BY_ID.get(id).unlocks), 'E7 een toegevoegde stap geeft geen geld en zet geen vlag (veilig voor oude saves)');
}

// ---------- F: Bezit en snackwagen ----------
{
  for (const [branch, def] of Object.entries(BEZIT_BRANCHES)) {
    const wid = GATE_WORLD[branch];
    const gw = gateWorld(wid);
    ok(!!gw, `F1 tak ${branch} heeft een poortwereld (${wid})`);
    if (gw) ok(partIdx(gw.part) + 1 === def.act, `F2 tak ${branch}: akte ${def.act} is de akte van wereld ${wid} (${gw.part})`, `${partIdx(gw.part) + 1} <> ${def.act}`);
  }
  const act = (a) => makeActGate(() => a);
  ok(!act(1)('bezit-land') && act(2)('bezit-land') && !act(2)('bezit-bedrijven') && act(3)('bezit-bedrijven') && !act(4)('bezit-snack') && act(5)('bezit-snack'), 'F3 de actpoort opent land in akte 2, bedrijven in akte 3, de snackwagen in akte 5');
  ok(makeActGate(() => 1, () => true)('bezit-land') && !makeActGate(() => 1, () => true)('bezit-snack'), 'F4 een bestaand profiel houdt land en bedrijven, maar heeft de snackwagen nog niet');
  ok(STAGES.every((s) => VAN_FLAGS.includes(STAGE_FLAGS[s])), 'F5 elke snackfase leest een vlag die het verhaal zet');
  const order = STAGES.map((s) => idxOf(VAN_MILESTONES.find((m) => m.flag === STAGE_FLAGS[s]).step));
  ok(order.every((x, i) => i === 0 || x >= order[i - 1]), 'F6 de snackfasen openen in de volgorde van het verhaal');
  const naam = VAN_MILESTONES.find((m) => m.flag === 'wagen:naam');
  const snackW = gateWorld('snackwagen');
  ok(snackW && partIdx(STEPS[idxOf(naam.step)].part) >= partIdx(snackW.part), 'F7 de wagen heet pas Tam & Tes als de snackwagen-tak open is (akte 5)', `${naam.step} / ${snackW && snackW.part}`);
  ok(naam.step === 'M22', 'F8 de naam komt bij M22 (het luik): de ontdekking is laat');
  ok(flagsFrom({ gate: { v: GATE_VERSION, open: [] }, flags: new Set() }) instanceof Set, 'F9 snackstory leest dezelfde poortversie als unlockgate (GATE_VERSION)');
  ok(flagsFrom({ gate: { v: GATE_VERSION, legacy: true, open: [] } }) === null && flagsFrom({ ended: true, gate: newGate() }) === null && flagsFrom({ dev: true, gate: newGate() }) === null, 'F10 een oude save, het einde en dev laten de snackfasen open');
  const voetbal = gateWorld('voetbal');
  const vSteps = STEPS.filter((s) => /^V\d$/.test(s.id));
  ok(voetbal && vSteps.length > 0 && vSteps.every((s) => s.part === voetbal.part), 'F11 de voetbalstappen (V1 tot V3) staan in de akte waarin de voetbalcarrière opengaat', voetbal ? voetbal.part : 'geen wereld');
  ok(gateWorld('farm') && gateWorld('farm').part === 'romp' && gateWorld('bezit') && gateWorld('bezit').part === 'staart', 'F12 boerderij opent in akte 2 en panden in akte 3 (besluit eigenaar 21-11)');
  const rep = readSrc('game/js/reputation.js');
  ok(/KEYS\.reputatie/.test(rep) && !/getStorySave/.test(rep), 'F13 reputatie heeft een eigen sleutel, per speler, en zit niet in de verhaalsave');
}

// ---------- G: Jelle ----------
{
  ok(JSON.stringify(BOSS_ACTS) === JSON.stringify(PART_ORDER), 'G1 de aktes van jellebaas.js zijn de aktes van de poort', BOSS_ACTS.join(','));
  ok(BOSS_ACTS.every((a) => BOSS[a].offerte && BOSS[a].handlanger && BOSS[a].wat), 'G2 elke akte heeft een offerte, een handlanger en een wat');
  const kinds = ['storing', 'pech', 'recensie', 'oorlog', 'overkoop', 'vergunning'];
  ok(BOSS_ACTS.filter((a) => a !== 'nazomer').every((a) => kinds.every((k) => BOSS[a].streek[k])), 'G3 elke akte tot en met het ontzet heeft een handlangerregel voor elke streek');
  ok(Object.keys(BOSS.nazomer.streek).length === 0, 'G4 na het verhaal doet Jelle geen streken meer met handlangers (zijn oma had gelijk)');
  const offers = BOSS_ACTS.map((a) => BOSS[a].offerte);
  ok(new Set(offers).size === offers.length, 'G5 geen twee aktes met dezelfde offerte');
  const src = readSrc('game/js/bezitlive.js');
  const at = src.indexOf('const storyPartNow');
  ok(at >= 0 && src.slice(at, at + 300).includes('PARTS[c.end]'), 'G6 na het einde van het verhaal levert bezitlive.js de laatste akte, zodat Jelles teruggetrokken offerte te zien is');
  const rivalCode = readSrc('game/js/rival.js').split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('//')).join(' ');
  ok(!/Math\.random|Date\.now/.test(rivalCode), 'G7 rival.js is deterministisch (geen willekeur of klok)');
}

// ---------- H: migratie ----------
{
  const worldsAll = gateWorlds().map((x) => x.id);
  const legacy = migrateGate({ v: 2, done: ['M01'] });
  ok(legacy.gate.legacy === true && worldsAll.every((id) => worldOpen(id, progressFrom({ stepId: 'M01', gate: legacy.gate }))), 'H1 een save zonder poort leest als alles open');
  ok(worldsAll.every((id) => worldOpen(id, progressFrom({ stepId: 'M01', gate: undefined }))), 'H2 een heel oude save (geen gate-veld) heeft alles open');
  ok(migrateGate({ v: 2, gate: newGate(), done: [] }).gate.open.length === 0, 'H3 een nieuw spel houdt zijn dichte poort bij het laden');
  let g = newGate(); let regress = false; let lastLen = 0;
  for (let k = 0; k < STEPS.length; k++) {
    const g2 = stampGate(g, progressFrom({ stepId: STEPS[k].id, gate: g }));
    if (g2.open.length < g.open.length || !g.open.every((x) => g2.open.includes(x))) regress = true;
    lastLen = g2.open.length; g = g2;
  }
  ok(!regress && lastLen === worldsAll.length, 'H4 het opgeslagen gate-veld groeit alleen en bevat aan het eind elke wereld', `${lastLen}/${worldsAll.length}`);
  const back = stampGate(g, progressFrom({ stepId: 'M02', gate: g }));
  ok(worldsAll.every((id) => worldOpen(id, progressFrom({ stepId: 'M02', gate: back }))), 'H5 een gestempelde poort sluit niets bij een eerdere stap (devJumpTo terug)');
  const oldSteps = STEPS.filter((s) => !ADDED_STEPS.includes(s.id));
  let stuck = '';
  for (let k = 0; k < oldSteps.length && !stuck; k++) {
    const done = new Set(oldSteps.slice(0, k).map((s) => s.id));
    const r = nextStoryStep((id) => done.has(id), () => false, () => true);
    if (r.end) { stuck = `${oldSteps[k].id} -> einde ${r.end}`; break; }
    // de volgende stap is de eerstvolgende oude stap of een toegevoegde stap die er vlak voor staat; nooit een stap erna of ervoor
    if (idxOf(r.id) > idxOf(oldSteps[k].id)) stuck = `${oldSteps[k].id} -> ${r.id} (te ver)`;
    else if (k > 0 && idxOf(r.id) <= idxOf(oldSteps[k - 1].id)) stuck = `${oldSteps[k].id} -> ${r.id} (terug)`;
  }
  ok(!stuck, 'H6 een oude save (zonder de toegevoegde stappen) blijft doorgaan, nooit terug en nooit vast', stuck);
  let skipped = '';
  for (const s of STEPS.filter((x) => ADDED_STEPS.includes(x.id))) {
    const k = idxOf(s.id);
    const later = STEPS.slice(k + 1).find((x) => x.kind === 'mission');
    if (later && !stepDone(k, (id) => id === later.id, () => false)) skipped = s.id;
  }
  ok(!skipped, 'H7 een save voorbij een toegevoegde stap speelt die niet meer', skipped);
  ok(BETWEEN_STEPS.every((id) => STEP_BY_ID.has(id)), 'H8 elk v:1-tussenstuk bestaat nog (A1, A2, V1 tot V3)');
  const st = readSrc('game/js/story.js');
  ok(st.includes('d.gate.v === 1') && st.includes('d.gate.legacy !== true') && GATE_VERSION === 1, 'H9 story.js leest de poort met dezelfde regel als unlockgate.js (versie 1, geen legacy)');
  ok(st.includes('d.v !== 1 && d.v !== 2'), 'H10 story.js leest v:1 en v:2 en negeert verder alles zonder iets te wissen');
}

// ---------- uitvoer ----------
if (asJson) console.log(JSON.stringify({ count, rows }, null, 1));
else {
  for (const r of rows) if (r.s !== 'ok') console.log(`${r.s}: ${r.tag}${r.d ? ' [' + r.d + ']' : ''}`);
  console.log(`verhaal_systemen_audit: ${count.ok} ok, ${count.fout} fout, ${count.info} info (${STEPS.length} stappen, ${PART_ORDER.length} aktes, ${gateWorlds().length} werelden, ${VAN_FLAGS.length} wagenvlaggen)`);
}
process.exit(count.fout ? 1 : 0);
