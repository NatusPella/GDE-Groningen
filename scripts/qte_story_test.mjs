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
import { buildAkte5Defs, applyAkte5 } from '../game/js/missions_akte5.js';

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

// --- M24/M25/M26: het verhaal is geen QTE meer --------------------------------
{
  // the shared defs get their act 5 staging from applyAkte5; the M22 def comes
  // from buildAkte5Defs so its action timing can be checked too.
  const list = [
    { label: "Er hangt iets Fries aan d'Olle Grieze", stages: [{ kind: 'pigeon' }, { kind: 'scene', dropFlag: true }], start: {} },
    { label: 'Het bod viel tegen', stages: [{ kind: 'goto' }], start: {} },
    { label: 'Ontzet, net als in 1672', stages: [{ kind: 'bake' }, { kind: 'hold' }, { kind: 'chase', route: [] }], start: {} },
  ];
  applyAkte5(list);
  const m24 = list.find((d) => /Fries/.test(d.label));
  ok(m24 && !m24.stages.some((s) => s.kind === 'timing'), 'M24: de windvlaag is geen timing-QTE meer (#962)');
  const pig = m24 && m24.stages.find((s) => s.kind === 'pigeon');
  ok(pig && pig.tag === 'vlag-top', 'M24: de duifstap geeft de wind-uitkomst als tag');
  const m26 = list.find((d) => /Ontzet/.test(d.label));
  ok(m26 && !m26.stages.some((s) => s.kind === 'timing'), 'M26: de duiven en de straten zijn geen timing-QTE meer (#962)');
  ok(m26 && m26.stages.find((s) => s.kind === 'chase').tag === 'duiven-top', 'M26: de achtervolging geeft de duiventag');
  ok(m26 && m26.stages.some((s) => s.kind === 'scene' && s.tag === 'straten-dicht' && (s.scriptIf || []).length === 3), 'M26: de straten-scène draagt de tag en de bondgenoot');
  ok(m26 && !m26.stages.some((s) => s.script && (s.script.ids || []).some((id) => /M26\.14/.test(id)) && s.scriptIf && s.scriptIf.length !== 3), 'M26: de straten-scène blijft één scène met drie varianten');

  const defs5 = buildAkte5Defs({ map: { nearestRoadPoint: () => null }, walk: (x, y) => ({ x, y }), drive: (x, y) => ({ x, y }) });
  const luik = defs5.find((d) => d.label === 'Een luik erin');
  const mud = luik && luik.stages.find((s) => s.kind === 'timing');
  ok(!!mud && mud.kicker === 'Los uit de modder' && mud.failAt === undefined && mud.failText === undefined, 'M22: het loswippen is een korte actie-QTE zonder afloop');
  const bod = list.find((d) => /bod/.test(d.label));
  ok(!!bod && bod.stages.some((s) => s.kind === 'bake' && s.set === 'omakeuken'), 'M25: het bakken speelt binnen in Oma\'s keuken (#956)');
}

// --- alle overgebleven QTE's zijn mild: geen failAt/failText -------------------
{
  const defs = [...buildAkte4Defs()];
  const list = [
    { label: "Er hangt iets Fries aan d'Olle Grieze", stages: [{ kind: 'pigeon' }, { kind: 'scene', dropFlag: true }], start: {} },
    { label: 'Ontzet, net als in 1672', stages: [{ kind: 'bake' }, { kind: 'hold' }, { kind: 'chase', route: [] }], start: {} },
  ];
  applyAkte5(list);
  const all = [...defs, ...buildAkte5Defs({ map: { nearestRoadPoint: () => null }, walk: (x, y) => ({ x, y }), drive: (x, y) => ({ x, y }) }), ...list];
  const timings = all.flatMap((d) => (d.stages || []).filter((s) => s.kind === 'timing').map((s) => ({ d: d.label, s })));
  ok(timings.length >= 4 && timings.length <= 6, 'er blijven een paar korte actie-QTE\'s over', String(timings.length));
  ok(timings.every(({ s }) => s.failAt === undefined && s.failText === undefined), 'geen enkele QTE laat de missie nog mislukken (#962)');
  ok(timings.every(({ s }) => Array.isArray(s.rounds) && s.rounds.length <= 3), 'elke QTE is kort: hooguit drie rondes');
  const kinds = timings.map(({ s }) => s.kicker || '').join(' | ');
  ok(/Fierljep|wagons|modder|gang/.test(kinds), 'de overgebleven QTE\'s zijn actie (klimmen, springen, wippen, sluipen)', kinds);
  ok(!/wind|duiven|straten|vrienden/i.test(kinds), 'verhaal-QTE\'s zijn weg', kinds);
}

console.log(fails ? `${fails} van ${n} mislukt` : `qte_story_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
