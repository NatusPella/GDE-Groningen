// Verfijnronde 22-11, epic Verhaal en missies: regressie- en fuzztests voor wat de ronde aanpaste of controleerde.
// Zie docs/VERFIJNING-22-11-VERHAAL.md. Puur (geen Electron, geen wereld).
import fs from 'node:fs';
import { readingTime, READING_CAP_S, READING_RUIM } from '../game/js/storytext.js';
import { failSceneMode, FAIL_SCENE_MAX, CHECKPOINT_KINDS, isCheckpointStage, recordCheckpoint, makeCheckpoint, applyCheckpointProgress, createGrace, stepGrace, GRACE_S } from '../game/js/missioncheckpoint.js';
import { STEPS, nextStoryStep, stepDone, MISSION_STORY_ORDER, missionIndexOf, PARTS, computeMoneyTimeline } from '../game/js/storyarc.js';
import { recapContent, RECAP_MAX_WORDS } from '../game/js/recapcard.js';
import { REMIND_AT_S, remindDue, remindText } from '../game/js/storyremind.js';
import { chaseWaitMax, dijkEtappe, skipReward, CHASE_WAIT_MAX, failMessageSeconds } from '../game/js/missionrules.js';
import { stapVast } from '../game/js/vastlopen.js';
import { busyTitle, destinationTitle } from '../game/js/goaltext.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name} ${info}`); } };
// vaste pseudo-willekeur: een falende fuzzrun is reproduceerbaar
let seed = 22112026;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];

// --- 1. leestijd van regels zonder opname
ok(readingTime('Hoi.') === 2.2, 'korte regel: ondergrens 2,2 s');
ok(readingTime('x'.repeat(200)) > 8 && readingTime('x'.repeat(200)) <= READING_CAP_S, 'regel van 200 tekens krijgt meer dan 8 s, nooit boven het plafond');
ok(readingTime('x'.repeat(2000)) === READING_CAP_S, 'extreem lange regel: plafond');
ok(readingTime('x'.repeat(200)) >= 200 / 20, 'minstens 20 tekens per seconde of trager (leesbaar)');
ok(readingTime(null) === 2.2 && readingTime(undefined) === 2.2 && readingTime('') === 2.2, 'lege tekst is geen NaN');
const midden = 'Een middellange regel van zo een zestig tekens, ongeveer genoeg.';
ok(readingTime(midden, 'ruim') > readingTime(midden), 'ruim is langer');
ok(readingTime('abc', 'geen') === readingTime('abc', 'ruim'), 'geen timer telt als ruim (een scène kan niet wachten)');
ok(readingTime('abc', 'onzin') === readingTime('abc'), 'onbekende stand is normaal');
for (let i = 0; i < 300; i++) {
  const t = 'x'.repeat(Math.floor(rnd() * 400));
  const a = readingTime(t), b = readingTime(t, 'ruim');
  ok(Number.isFinite(a) && a >= 2.2 && a <= READING_CAP_S && b >= a && b <= READING_CAP_S * READING_RUIM + 0.01, 'fuzz leestijd', String(t.length));
}
// de data: elke regel zonder opname blijft binnen 25 tekens per seconde (het oude plafond brak dat voor 7 regels)
{
  const d = JSON.parse(fs.readFileSync(new URL('../game/storydata/script.json', import.meta.url), 'utf8'));
  let snel = 0;
  for (const s of d.scenes) for (const l of s.lines) if (l.channel !== 'app-stil' && (l.textOnly || !l.rec) && l.text.length / readingTime(l.text) > 25) snel++;
  ok(snel === 0, 'geen enkele ondertitel zonder opname sneller dan 25 tekens per seconde', String(snel));
}

// --- 2. mislukscène alleen de eerste keer
ok(FAIL_SCENE_MAX === 1 && failSceneMode(0) === 'scene', 'eerste mislukking: scène');
ok(failSceneMode(1) === 'banner' && failSceneMode(7) === 'banner', 'daarna alleen de kaart');
ok(failSceneMode(undefined) === 'scene' && failSceneMode(NaN) === 'scene' && failSceneMode(-3) === 'scene', 'rommel telt als nul');

// --- 3. hervatpunten na een achtervolging of timingproef
ok(['chase', 'boatchase', 'timing'].every((k) => CHECKPOINT_KINDS.includes(k)), 'achtervolging en timing zijn rustpunten');
{
  const def = { stages: [{ kind: 'goto' }, { kind: 'chase' }, { kind: 'goto' }, { kind: 'timing' }, { kind: 'goto' }, { kind: 'boatchase' }, { kind: 'scene' }] };
  ok(isCheckpointStage(def, 2) && isCheckpointStage(def, 4) && isCheckpointStage(def, 6), 'stage na chase, timing en boatchase is hervatpunt');
  ok(!isCheckpointStage(def, 1) && !isCheckpointStage(def, 3), 'de proef zelf niet');
  ok(!isCheckpointStage({ ...def, checkpoints: false }, 2), 'missie kan het uitzetten');
  ok(!isCheckpointStage({ heist: {}, stages: def.stages }, 2), 'inbraak blijft alleen op verzoek');
}

// --- 4. fuzz: het verhaal loopt altijd door en loopt nooit vast
{
  const missionPassed = (set) => (i) => set.has(i);
  for (const open of [false, true]) {
    const done = new Set(); const passed = new Set();
    if (open) for (const p of Object.values(PARTS)) p.open = true;
    let guard = 0, last = null;
    for (;;) {
      const nx = nextStoryStep((id) => done.has(id), missionPassed(passed), () => true);
      if (nx.end) break;
      ok(!done.has(nx.id), 'een afgevinkte stap komt niet terug', nx.id);
      done.add(nx.id);
      if (nx.kind === 'mission' && nx.mission) passed.add(missionIndexOf(nx.mission));
      last = nx.id;
      if (++guard > 500) { ok(false, 'verhaal loopt vast of herhaalt zich'); break; }
    }
    ok(guard > 20 && last, 'verhaal komt voorbij de eerste stappen', String(guard));
  }
  // vooruit gespeelde missies: de ketting levert nooit een gehaalde stap
  for (let r = 0; r < 200; r++) {
    const done = new Set(), passed = new Set();
    for (const s of STEPS) if (rnd() < 0.3) done.add(s.id);
    for (const i of MISSION_STORY_ORDER) if (rnd() < 0.2) passed.add(i);
    const nx = nextStoryStep((id) => done.has(id), missionPassed(passed), () => true);
    if (!nx.end) {
      const k = STEPS.indexOf(nx);
      ok(!stepDone(k, (id) => done.has(id), missionPassed(passed)), 'ketting levert nooit een voltooide stap', nx.id);
    }
  }
}

// --- 5. terugkeerkaart: nooit te lang, ook niet met extreme invoer
{
  const w = (k) => Array.from({ length: k }, (_, i) => 'woord' + i).join(' ');
  for (let r = 0; r < 200; r++) {
    const c = recapContent({ step: { id: 'M05', part: 'kop', title: 't', lead: w(1 + Math.floor(rnd() * 120)) + '.' }, ended: false, last: w(Math.floor(rnd() * 60)), partTitle: 'Akte 1: Moi, Grunn', why: w(Math.floor(rnd() * 80)) });
    if (!c) continue;
    const total = [c.why, c.last, c.now].join(' ').trim().split(/\s+/).filter(Boolean).length;
    ok(total <= RECAP_MAX_WORDS, 'terugkeerkaart blijft binnen het woordbudget', String(total));
  }
}

// --- 6. checkpointopslag en grace: fuzz
{
  const store = new Map();
  const best = new Map();
  for (let r = 0; r < 500; r++) {
    const mi = Math.floor(rnd() * 4), si = Math.floor(rnd() * 8);
    recordCheckpoint(store, makeCheckpoint({ missionIndex: mi, stageIndex: si, timeLeft: rnd() * 300, chain: {} }));
    best.set(mi, Math.max(best.get(mi) ?? -1, si));
    ok(store.get(mi).stageIndex === best.get(mi), 'checkpoint gaat nooit terug', `${mi}:${si}`);
  }
  for (let r = 0; r < 200; r++) {
    const g = createGrace();
    for (let k = 0; k < 100; k++) {
      const st = pick(['near', 'away', 'away', 'away']);
      const out = stepGrace(g, rnd() * 3, st);
      ok(out.left >= 0 && out.left <= GRACE_S, 'grace blijft in bereik');
      if (st === 'near') ok(out.state === 'ok' && out.left === GRACE_S, 'terug bij het voertuig herstelt de grace volledig');
      if (out.state === 'fail') break;
    }
  }
  const tijd = { timeLeft: 3 };
  applyCheckpointProgress(makeCheckpoint({ missionIndex: 1, stageIndex: 1, timeLeft: 1, chain: {} }), tijd);
  ok(tijd.timeLeft >= 45, 'een hervatpunt vlak voor de klok geeft minstens 45 s');
}

// --- 7. herinnering aan het verhaaldoel: drie keer, nooit vaker, nooit te vroeg
{
  ok(REMIND_AT_S.length === 3 && REMIND_AT_S.every((t, i) => i === 0 || t > REMIND_AT_S[i - 1]), 'drie oplopende herinneringen');
  ok(!remindDue(299, 0) && remindDue(301, 0), 'de eerste na 5 minuten (zoals voorheen)');
  ok(!remindDue(301, 1) && remindDue(901, 1) && !remindDue(901, 2) && remindDue(1801, 2) && !remindDue(99999, 3), 'tweede na 15, derde na 30 minuten, daarna stil');
  ok(!remindDue(NaN, 0) && !remindDue(undefined, 0) && !remindDue(Infinity, 3) && remindDue(1e9, -4) === true, 'rommel geeft geen herinnering of crash');
  ok(remindText(0, 'Het Loket') === 'Nog even dit: Het Loket. Staat op je kaart, als je zin hebt.', 'eerste tekst is ongewijzigd');
  const teksten = [0, 1, 2].map((k) => remindText(k, 'Het Loket'));
  ok(new Set(teksten).size === 3 && teksten.every((t) => t.includes('Het Loket') && !/[{}]/.test(t) && t.length < 90), 'drie verschillende korte teksten met de titel, zonder toetscodes');
  // een simulatie van twee uur zonder het doel te raken: precies drie berichten
  let gedaan = 0;
  for (let t = 0; t < 7200; t += 1) if (remindDue(t, gedaan)) gedaan++;
  ok(gedaan === 3, 'twee uur wachten geeft precies drie herinneringen', String(gedaan));
}

// --- 8. rotte getallen (NaN, oneindig) maken geen vaste stand meer
{
  const rare = [NaN, Infinity, -Infinity, undefined, null, 'abc'];
  for (const a of rare) for (const b of rare) {
    ok(Number.isFinite(chaseWaitMax(a, { parked: b })), 'chaseWaitMax is altijd eindig', `${a}/${b}`);
    const e = dijkEtappe(a, b);
    ok(Number.isInteger(e.cp) && Number.isFinite(e.s), 'dijkEtappe geeft nooit NaN', `${a}/${b}`);
    const S = { stil: 0, houd: 0, hint: false };
    stapVast(S, a, { inVoertuig: true, gas: true, snelheid: b });
    ok(Number.isFinite(S.stil), 'stapVast: een rotte frame maakt de teller geen NaN', `${a}/${b}`);
  }
  for (const a of rare) ok(Number.isFinite(skipReward(a)) && skipReward(a) >= 0, 'skipReward blijft eindig', String(a));
  ok(chaseWaitMax(300, { parked: 20 }) === CHASE_WAIT_MAX + 28 && chaseWaitMax(10, { parked: 20 }) === CHASE_WAIT_MAX, 'chaseWaitMax: gewone waarden ongewijzigd');
  ok(skipReward(400) === 200 && skipReward(0) === 0, 'skipReward: gewone waarden ongewijzigd');
  const g = { stil: 0, houd: 0, hint: false };
  let hint = false;
  for (let i = 0; i < 20; i++) { stapVast(g, i === 3 ? NaN : 1, { inVoertuig: true, gas: true, snelheid: 0 }); }
  hint = g.hint;
  ok(hint, 'een NaN-frame tussendoor houdt de vastzit-hint niet tegen');
}

// --- 9. doelbalk: een opdracht die al met een werkwoord begint krijgt geen "Bezig:" of "Ga naar:" ervoor
{
  const echt = ['Naar de serverkamer', 'Terug naar de steiger, voor het water komt', 'Houd de tweede deur tegen', 'Spring op de quad', 'Plant de vlag op het eerste bolwerk',
    'Zet de kat in de mand', 'Ren naar de derde deur: de laatste', 'Luister naar Mem in de kruitkelder', 'Glip langs de camera', 'Draag de bal naar het bakkie bij de poort',
    'Kijk naar de naspeling: het publiek klapt', 'Zit vast: wip de wagen los terwijl Tinus trekt', 'Stop even op de wierde: de kratten schuiven', 'Sluip naar de kluis', 'Trek de toren omver'];
  for (const t of echt) ok(busyTitle(t) === t && destinationTitle(t) === t, 'geen dubbel werkwoord in de doelbalk', t);
  ok(destinationTitle('Haven Delfzijl') === 'Ga naar: Haven Delfzijl' && destinationTitle('Tilburg') === 'Ga naar: Tilburg' && destinationTitle('Houtenstraat') === 'Ga naar: Houtenstraat', 'een plaatsnaam krijgt nog steeds zijn werkwoord');
  ok(busyTitle('Het Loket') === 'Bezig: Het Loket' && busyTitle('Plantsoenfestijn') === 'Bezig: Plantsoenfestijn', 'een naam krijgt nog steeds Bezig');
  // elke stagelabel in de missiebestanden die met een gewoon bevelswoord begint, blijft onaangeroerd
  const bevel = /^(Naar|Terug|Houd|Spring|Plant|Zet|Stop|Ren|Luister|Glip|Draag|Zweef|Zit|Kijk|Sluip|Trek|Kies|Lees|Neem|Pak|Breng|Haal|Ga|Rij|Vaar|Vlieg) /;
  let gezien = 0;
  for (const f of fs.readdirSync(new URL('../game/js/', import.meta.url)).filter((x) => /^missions_.*\.js$/.test(x))) {
    const src = fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
    for (const m of src.matchAll(/\blabel: '([^'\\]{3,80})'/g)) if (bevel.test(m[1])) { gezien++; ok(busyTitle(m[1]) === m[1], 'stagelabel zonder Bezig-voorvoegsel', m[1]); }
  }
  ok(gezien > 40, 'de scan vond de stagelabels', String(gezien));
}

// --- 11. geld: geen enkele verplichte aankoop is onbetaalbaar, ook niet voor wie elke missie overslaat (halve beloning)
for (const share of [1, 0.9, 0.75, 0.5, 0.25, 0]) {
  const tl = computeMoneyTimeline(undefined, share);
  const neg = tl.rows.filter((r) => r.margin != null && r.margin < 0);
  ok(neg.length === 0 && tl.low >= 0, 'verhaalgeld blijft positief bij uitbetaling ' + share, neg.map((r) => r.id).join(' '));
}

// --- 10. de mislukmelding blijft lang genoeg staan om de reden te lezen
{
  ok(failMessageSeconds('Even pinnen mislukt') === 3.5, 'korte melding: 3,5 s zoals voorheen');
  const lang = 'Het Loket mislukt: tijd op. Zelfs de brandweer was er sneller geweest, en die komt nooit op tijd.';
  ok(failMessageSeconds(lang) > 5 && failMessageSeconds(lang) <= 8, 'lange reden krijgt meer tijd', String(failMessageSeconds(lang)));
  ok(failMessageSeconds('x'.repeat(5000)) === 8 && failMessageSeconds(null) === 3.5 && failMessageSeconds(undefined) === 3.5, 'plafond en lege tekst');
  for (let i = 0; i < 200; i++) { const s = failMessageSeconds('x'.repeat(Math.floor(rnd() * 300))); ok(s >= 3.5 && s <= 8 && Number.isFinite(s), 'fuzz melding'); }
}

console.log(`${n - fails}/${n} verfijn_verhaal_test`);
process.exit(fails ? 1 : 0);
