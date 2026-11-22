// Geluidsgevoel (22-11, game/js/sfx/sfxfeel.js): de wind per plek, uur en weer, de spraakdemping met een houdtijd (geen pompen tussen
// twee regels), de plons onder een stap op natte grond en de stap onder een gesproken regel. Pure logica, zonder Web Audio.
//   node scripts/sfxfeel_test.mjs
import fs from 'node:fs';
import { breezeTargets, breezeDayFactor, BREEZE_BED_MAX, BREEZE_DAY_MIN, BREEZE_DAY_MAX, speechDuckStep, SPEECH_HOLD, wetStepLevel, stepSpeechGain } from '../game/js/sfx/sfxfeel.js';
import { speechDuckFactor } from '../game/js/sfx/mixplan.js';

let fails = 0, n = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const RARE = [NaN, Infinity, -Infinity, undefined, null, -5, 1e9, 'x', {}];

// -- wind: plek, uur en weer -----------------------------------------------------------------------------------------------
const W = (f) => breezeTargets({ open: 0, green: 0, coast: 0, sea: false, rain: 0, breeze: 0, hour: 12, closed: false, paused: 1, ...f });
const oud = (f) => (0.03 + (f.open || 0) * 0.04 + (f.green || 0) * 0.015 + (f.rain || 0) * 0.26) * (f.closed ? 0.35 : 1);
{
  // zonder bries en zonder kust blijft de wind binnen 25 procent van het oude niveau, op elk uur
  let worst = 0;
  for (const f of [{}, { open: 1 }, { open: 0.5, green: 0.6 }, { rain: 0.5 }, { rain: 1, open: 1 }, { open: 1, closed: true }]) {
    for (let h = 0; h < 24; h++) worst = Math.max(worst, Math.abs(W({ ...f, hour: h }).level / oud(f) - 1));
  }
  ok(worst <= 0.2501, 'zonder bries blijft de wind dicht bij het oude niveau', worst.toFixed(3));
}
ok(Math.abs(breezeDayFactor(15) - BREEZE_DAY_MAX) < 1e-9 && Math.abs(breezeDayFactor(3) - BREEZE_DAY_MIN) < 1e-9, 'de wind is het sterkst om 15 uur en het zwakst om 3 uur');
ok(breezeDayFactor(5) < breezeDayFactor(10) && breezeDayFactor(10) < breezeDayFactor(15) && breezeDayFactor(21) < breezeDayFactor(15), 'kalme ochtend, wind in de middag, liggend in de avond');
ok(Math.abs(breezeDayFactor(0) - breezeDayFactor(24)) < 1e-9 && Math.abs(breezeDayFactor(-1) - breezeDayFactor(23)) < 1e-9, 'het uur loopt rond zonder sprong');
{
  let maxStep = 0;
  for (let h = 0; h < 24; h += 0.05) maxStep = Math.max(maxStep, Math.abs(breezeDayFactor(h + 0.05) - breezeDayFactor(h)));
  ok(maxStep < 0.004, 'het daggetij van de wind verloopt zonder sprong', maxStep.toFixed(4));
}
ok(W({ open: 1, hour: 15 }).level > W({ open: 1, hour: 5 }).level * 1.3, 'open land: de middag waait hoorbaar harder dan de vroege ochtend');
ok(W({ open: 1, breeze: 1 }).level > W({ open: 1 }).level * 1.8, 'een stevige bries is op open land goed te horen');
ok(W({ open: 0, breeze: 1 }).level < W({ open: 1, breeze: 1 }).level * 0.6, 'een straat tussen huizen ligt in de luwte');
ok(W({ coast: 1, breeze: 0.6 }).level > W({ open: 0.3, breeze: 0.6 }).level, 'aan de kust waait het meer dan in het binnenland');
ok(W({ sea: true }).level === W({ coast: 1 }).level, 'op zee telt als volle kust');
ok(W({ open: 1, breeze: 1, closed: true }).level < W({ open: 1, breeze: 1 }).level * 0.36, 'een dichte cabine houdt de wind buiten');
ok(W({ open: 1, breeze: 1, paused: 0 }).level === 0 && Math.abs(W({ open: 1, paused: 0.45 }).level / W({ open: 1 }).level - 0.45) < 1e-9, 'pauze en dempen tellen mee');
ok(W({ closed: true, breeze: 1, rain: 1 }).lp === 700 && W({}).lp === 2500 && W({ rain: 1 }).lp === 8500, 'het filter: cabine dof, droog 2500 Hz, plensbui 8500 Hz (zoals het was)');
ok(W({ open: 1, breeze: 1 }).lp > W({ open: 1 }).lp, 'meer wind klinkt helderder');
{
  let max = 0, bad = 0;
  for (const open of [0, 0.5, 1]) for (const rain of [0, 0.5, 1]) for (const breeze of [0, 0.5, 1]) for (const coast of [0, 1]) for (let h = 0; h < 24; h += 3) {
    const o = W({ open, rain, breeze, coast, green: 1, hour: h });
    max = Math.max(max, o.level);
    if (!(o.level >= 0) || !(o.lp >= 700 && o.lp <= 20000)) bad++;
  }
  ok(max <= BREEZE_BED_MAX + 1e-9 && bad === 0, 'de wind blijft onder zijn plafond en het filter in het hoorbare gebied', max.toFixed(3));
}
{
  let bad = 0;
  for (const a of RARE) for (const key of ['open', 'green', 'coast', 'rain', 'breeze', 'hour', 'paused']) {
    const o = W({ [key]: a });
    if (!Number.isFinite(o.level) || !Number.isFinite(o.lp) || o.level < 0 || o.level > BREEZE_BED_MAX) bad++;
  }
  ok(bad === 0, 'rare waarden geven nooit een NaN-niveau of NaN-filter', String(bad));
  const out = { level: 0, lp: 0 };
  ok(breezeTargets({ open: 1 }, out) === out, 'breezeTargets schrijft in het meegegeven object (geen nieuw object per beeld)');
}

// -- spraakdemping met houdtijd --------------------------------------------------------------------------------------------
// een gesprek: regels van 2 s met een pauze ertussen; meet de diepste terugval van de dempstand tijdens de pauzes
const gesprek = (step, gap, fps = 60) => {
  const st = { level: 0, hold: 0 }, dt = 1 / fps;
  let low = 1, t = 0;
  for (let line = 0; line < 4; line++) {
    for (let u = 0; u < 2; u += dt) step(st, true, dt);
    if (line === 3) break;
    for (let u = 0; u < gap; u += dt) { const l = step(st, false, dt); low = Math.min(low, l); }
    t++;
  }
  return { low, st };
};
const oudeStap = (st, talking, dt) => { st.level += ((talking ? 1 : 0) - st.level) * Math.min(1, dt * (talking ? 6 : 1.5)); return st.level; };
{
  const was = gesprek(oudeStap, 0.3), nu = gesprek(speechDuckStep, 0.3);
  console.log(`  gemeten: dempstand in een pauze van 0,3 s tussen twee regels: was ${was.low.toFixed(2)}, nu ${nu.low.toFixed(2)}`);
  const dB = (lvl) => 20 * Math.log10(speechDuckFactor('omgeving', lvl) / speechDuckFactor('omgeving', 1));
  console.log(`  gemeten: de omgeving kwam in die pauze ${dB(was.low).toFixed(1)} dB omhoog, nu ${dB(nu.low).toFixed(1)} dB`);
  ok(was.low < 0.7, 'de oude regel pompte: de dempstand zakte in een korte pauze onder 0,7', was.low.toFixed(2));
  ok(nu.low > 0.99, 'met de houdtijd blijft de demping staan tussen twee regels', nu.low.toFixed(3));
  ok(gesprek(speechDuckStep, 0.55, 30).low > 0.99 && gesprek(speechDuckStep, 0.55, 144).low > 0.99, 'ook bij 30 en 144 beelden per seconde');
}
{
  // na de laatste regel: eerst de houdtijd, dan los in het oude tempo
  const st = { level: 0, hold: 0 }, dt = 1 / 60;
  for (let u = 0; u < 2; u += dt) speechDuckStep(st, true, dt);
  ok(st.level > 0.99, 'een regel van 2 s dempt volledig', st.level.toFixed(3));
  let t = 0, t50 = -1, t10 = -1;
  for (; t < 6; t += dt) { speechDuckStep(st, false, dt); if (t50 < 0 && st.level < 0.5) t50 = t; if (t10 < 0 && st.level < 0.1) t10 = t; }
  console.log(`  gemeten: na de laatste regel half terug na ${t50.toFixed(2)} s, onder 10 procent na ${t10.toFixed(2)} s`);
  ok(t50 > SPEECH_HOLD && t50 < SPEECH_HOLD + 0.6, 'de omgeving komt binnen ruim een seconde half terug', t50.toFixed(2));
  ok(t10 > 0 && t10 < 2.5 && st.level < 0.01, 'en de demping blijft nooit hangen', t10.toFixed(2));
}
{
  // een korte uitroep (0,2 s) dempt maar ten dele en laat ook weer los
  const st = { level: 0, hold: 0 }, dt = 1 / 60;
  for (let u = 0; u < 0.2; u += dt) speechDuckStep(st, true, dt);
  ok(st.level > 0.5 && st.level < 0.85, 'de aanzet is zacht (0,2 s is nog geen volle demping)', st.level.toFixed(2));
  for (let u = 0; u < 5; u += dt) speechDuckStep(st, false, dt);
  ok(st.level < 0.01 && st.hold === 0, 'na een uitroep is alles weer open');
}
{
  let bad = 0;
  for (const a of RARE) for (const b of RARE) {
    const st = { level: a, hold: b };
    for (const talking of [true, false, true, false]) { const l = speechDuckStep(st, talking, 1 / 60); if (!Number.isFinite(l) || l < 0 || l > 1 || !Number.isFinite(st.hold)) bad++; }
    const st2 = { level: 0.5, hold: 0.2 };
    const l2 = speechDuckStep(st2, false, a);
    if (!Number.isFinite(l2) || !Number.isFinite(st2.hold)) bad++;
  }
  ok(bad === 0, 'rare waarden (stand, houdtijd, dt) geven nooit NaN en lopen niet vast', String(bad));
  const st = { level: 1, hold: NaN };
  for (let u = 0; u < 5; u += 1 / 60) speechDuckStep(st, false, 1 / 60);
  ok(st.level < 0.01, 'een NaN-houdtijd laat de demping niet hangen');
  const st3 = { level: 1, hold: 0 };
  speechDuckStep(st3, false, 30);
  ok(st3.level >= 0 && st3.level < 1, 'een vastgelopen beeld (dt 30 s) schiet niet door');
}

// -- natte stappen ---------------------------------------------------------------------------------------------------------
ok(wetStepLevel(0, 0, 'klinkers') === 0 && wetStepLevel(0.3, 0.2, 'asfalt') === 0, 'droog: geen plons');
ok(Math.abs(wetStepLevel(0.8, 1, 'klinkers') - 0.4) < 1e-9 && Math.abs(wetStepLevel(0.4, 0, 'asfalt') - 0.2) < 1e-9, 'in de regen: de plons volgt de regen zoals voorheen (regen maal 0,5)');
ok(wetStepLevel(0, 1, 'klinkers') > 0.3 && wetStepLevel(0, 0.6, 'klinkers') > 0.1, 'na de bui: de straat is nog nat en de stap plonst nog');
ok(wetStepLevel(0, 1, 'klinkers') < wetStepLevel(1, 1, 'klinkers'), 'een natte straat plonst zachter dan een plensbui');
{
  // het opdrogen (weather.js: nat in ~6 s, droog in ~40 s): de plons sterft uit in plaats van te stoppen
  let wet = 1, prev = wetStepLevel(0, wet, 'klinkers'), maxDrop = 0, tEnd = -1;
  for (let t = 0; t < 120; t += 0.5) {
    wet += (0 - wet) * Math.min(1, 0.5 / 40);
    const l = wetStepLevel(0, wet, 'klinkers');
    maxDrop = Math.max(maxDrop, prev - l);
    if (tEnd < 0 && l === 0) tEnd = t;
    prev = l;
  }
  console.log(`  gemeten: na een plensbui plonst een stap nog ${tEnd.toFixed(0)} s, grootste stap omlaag per halve seconde ${maxDrop.toFixed(3)}`);
  ok(tEnd > 20 && tEnd < 90, 'de plons houdt een halve tot ruim een minuut aan', String(tEnd));
  ok(maxDrop < 0.01, 'en sterft geleidelijk uit', maxDrop.toFixed(4));
}
for (const s of ['gras', 'wet', 'binnen']) ok(wetStepLevel(1, 1, s) === 0, `${s}: nooit een plons eroverheen`);
ok(Math.abs(wetStepLevel(1, 1, 'grind') - wetStepLevel(1, 1, 'klinkers') * 0.5) < 1e-9 && wetStepLevel(1, 1, 'zand') === wetStepLevel(1, 1, 'grind'), 'grind en zand slikken de helft van de plons');
ok(wetStepLevel(1, 1, 'metaal') > 0 && wetStepLevel(1, 1, 'wood') > 0, 'een nat autodak en een natte brug plonsen wel');
{
  let bad = 0;
  for (const a of RARE) for (const b of RARE) for (const s of ['klinkers', 'grind', undefined, 'constructor']) { const l = wetStepLevel(a, b, s); if (!Number.isFinite(l) || l < 0 || l > 0.5) bad++; }
  ok(bad === 0, 'rare waarden geven nooit NaN of een plons boven 0,5', String(bad));
}

// -- stappen onder een gesproken regel -------------------------------------------------------------------------------------
ok(stepSpeechGain(true, 0) === 1 && stepSpeechGain(false, 0) === 1, 'niemand praat: de stap is onaangetast');
ok(stepSpeechGain(false, 1) === speechDuckFactor('voetstap', 1), 'andermans stap volgt het mixplan (voetstap)');
ok(stepSpeechGain(true, 1) > stepSpeechGain(false, 1) && stepSpeechGain(true, 1) < 1, 'je eigen stap blijft beter hoorbaar dan die van een voorbijganger');
ok(Math.abs(20 * Math.log10(stepSpeechGain(true, 1)) + 2.5) < 0.1 && Math.abs(20 * Math.log10(stepSpeechGain(false, 1)) + 6) < 0.1, 'eigen stap 2,5 dB zachter, andermans stap 6 dB', `${(20 * Math.log10(stepSpeechGain(true, 1))).toFixed(2)} / ${(20 * Math.log10(stepSpeechGain(false, 1))).toFixed(2)}`);
{
  let bad = 0;
  for (const a of RARE) for (const own of [true, false]) { const g = stepSpeechGain(own, a); if (!Number.isFinite(g) || g < 0.4 || g > 1) bad++; }
  ok(bad === 0, 'rare spraakstanden geven nooit NaN', String(bad));
}

// -- de koppeling in het spel (bron) ---------------------------------------------------------------------------------------
const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
{
  const audio = src('audio.js'), amb = src('sfx/ambience.js'), foley = src('sfx/foley.js');
  ok(audio.includes('speechLevel = speechDuckStep(speechDuck, voiceBusy(), dt)'), 'audio.js: de spraakdemping loopt via speechDuckStep');
  ok(amb.includes('beds.wind.target = breezeTargets(windIn, windOut).level') && amb.includes('setTargetAtTime(windOut.lp'), 'ambience.js: het windbed en zijn filter komen uit breezeTargets');
  ok(!/breezeTargets\(\{/.test(amb), 'ambience.js: geen nieuw object per beeld voor de wind');
  ok(foley.includes('wetStepLevel(rain, groundWet, surface)') && foley.includes('stepSpeechGain(prio > 0'), 'foley.js: de plons en de spraakdemping van de stap komen uit sfxfeel.js');
}

console.log(fails ? `sfxfeel_test: ${fails} van ${n} mislukt` : `sfxfeel_test: ${n} controles geslaagd`);
process.exit(fails ? 1 : 0);
