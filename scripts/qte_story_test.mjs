// #962: het verhaal zit niet meer in moeilijke quicktime-events. Deze test bewaakt de
// afspraken van deze ronde:
//   - M18: de intake is een kantoorscène zonder afloop op foute antwoorden; het sluipen
//     langs de camera's kost een misser, maar laat de missie niet meer mislukken;
//   - M21: de keuze op de wagon heeft geen klok meer; de vier gesprekken bij Tinus'
//     schuur zijn vervangen door de scène M21.4 (het verhaal, niet de puzzel).
//   - de pure regels: een choice zonder wrongFails en een timing zonder failAt kunnen
//     niet meer op een fout antwoord/misser eindigen.
//   node scripts/qte_story_test.mjs
process.env.GDE_NIEUW_VERHAAL = '1';
import './node3d.mjs';
import { buildAkte4Defs, applyAkte4 } from '../game/js/missions_akte4.js';

const { enterChoice, stepChoice } = await import('../game/js/stagechoice.js');
const { enterTiming, stepTiming } = await import('../game/js/stagetiming.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const defs = buildAkte4Defs();
const by = (label) => defs.find((d) => d.label === label);

// --- M18: de intake en het sluipen ------------------------------------------
{
  const def = by("Wie draaide de camera's uit?");
  ok(!!def, 'M18 bestaat');
  const stages = def ? def.stages : [];
  const intake = stages.find((s) => s.kind === 'choice' && /intake/i.test(s.kicker || ''));
  ok(!!intake, 'de intake is een keuzestap');
  if (intake) {
    ok(intake.set === 'kantoor', 'de intake speelt binnen in het kantoor (#956)', intake.set);
    ok(intake.wrongFails === undefined && intake.wrongText === undefined, 'een fout antwoord laat de intake niet meer mislukken (#962)');
    ok(intake.countTag === 'argwaan', 'de argwaan-tags blijven (M18.6/M18.7)');
    ok(Array.isArray(intake.rounds) && intake.rounds.length === 3, 'drie korte vragen');
    ok(intake.rounds.every((r) => r.options.some((o) => o.ok !== false)), 'elke vraag heeft een goed antwoord');
  }
  const timings = stages.filter((s) => s.kind === 'timing');
  ok(timings.length === 2, 'twee sluipstappen langs de camera\'s', String(timings.length));
  ok(timings.every((s) => s.failAt === undefined && s.failText === undefined), 'een misser laat de missie niet meer mislukken (#962)');
  ok(timings.every((s) => Number.isFinite(s.goodAt)), 'de tag voor een schone sluip blijft');
  const hold = stages.find((s) => s.kind === 'hold' && /logboek/i.test(s.label || ''));
  ok(!!hold && hold.set === 'serverkamer', 'het logboek wordt in de serverkamer gelezen (#956)', hold && hold.set);
  const logboek = stages.find((s) => s.kind === 'scene' && s.script && s.script.ids && s.script.ids.includes('M18.3'));
  ok(!!logboek, 'de scène van het logboek hangt aan de stap');
}

// --- M21: de wagon en de vrienden -------------------------------------------
{
  // M21 is the old `fjord` def of the shared table; applyAkte4 stages it (missions_akte4.js)
  const list = [{ label: 'Iedereen heeft een rode auto gezien', stages: [] }];
  applyAkte4(list);
  const def = list[0];
  const stages = def.stages || [];
  const keuzes = stages.filter((s) => s.kind === 'choice');
  ok(keuzes.length === 1, 'M21 heeft nog één keuze (de auto of de bal)', String(keuzes.length));
  const wagon = keuzes[0];
  ok(wagon && wagon.rounds && wagon.rounds.length === 1, 'de wagon is één vraag');
  ok(wagon && !wagon.rounds.some((r) => r.time || r.timeoutPick), 'geen klok meer op de wagonkeuze (#962)');
  ok(!stages.some((s) => s.kind === 'choice' && /vrienden/i.test(s.kicker || '')), 'de vriendenkeuze is weg');
  const vrienden = stages.find((s) => s.kind === 'scene' && s.script && s.script.ids && s.script.ids.includes('M21.4'));
  ok(!!vrienden, 'de scène M21.4 vertelt het verhaal van de vrienden');
}

// --- de pure regels: geen afloop zonder wrongFails / failAt ------------------
{
  const st = {
    kicker: 'test', rounds: [
      { who: 'A', text: 'Eén?', options: [{ label: 'goed', reply: 'ok' }, { label: 'fout', ok: false, reply: 'nee' }] },
      { who: 'A', text: 'Twee?', options: [{ label: 'goed', reply: 'ok' }, { label: 'fout', ok: false, reply: 'nee' }] },
    ],
  };
  const S = {};
  enterChoice(S);
  let done = false;
  for (let i = 0; i < 2 && !done; i++) {
    stepChoice(st, S, '2', 0.02); // het foute antwoord
    const r = stepChoice(st, S, null, 10); // de reactie uitspelen
    done = r === 'done';
  }
  ok(done, 'de keuzestap loopt door na foute antwoorden');
  ok(!S.pendingFail, 'geen pendingFail zonder wrongFails (#962)', String(S.pendingFail));
}

{
  const st = { rounds: [{ text: 'Camera', speed: 1, zone: [0.45, 0.55], ok: 'door', bad: 'gezien' }, { text: 'Camera', speed: 1, zone: [0.45, 0.55], ok: 'door', bad: 'gezien' }] };
  const S = {};
  enterTiming(S, st);
  let failed = false;
  for (let i = 0; i < 4; i++) {
    stepTiming(st, S, true, 0); // op het verkeerde moment: een misser
    const r = stepTiming(st, S, null, 10);
    if (r && r.fail) failed = true;
  }
  ok(!failed, 'vier missers laten de missie niet mislukken zonder failAt (#962)');
  ok(S.miss >= 2, 'de missers tellen wel mee voor de tag', String(S.miss));
}

console.log(fails ? `${fails} van ${n} mislukt` : `qte_story_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
