// De muziekmix van cutscenes (aaa30, 28-11) doorgerekend over de echte scènedata van de eerste 30 minuten:
//   node scripts/cutmix_test.mjs
// - de regels van sfx/cutmix.js (aanval, vasthouden, terugkeer, geen pompen, stand per scène, stings alleen in een stilte);
// - elke scène van de opening, de flat, M01 tot M05 en de overgangen O1 en O2 (scripts/lib/cutscene_data.mjs): in een regel zit de
//   muziek nooit boven LINE_MAX_DB, in geen enkele stand, en de oude stand (radio -4,6 dB, scenario -6 dB) faalt die toets;
// - de bedrading: radio, scenarioloop en thema volgen de mix, cinematics meldt begin, klok en eind, de clue-sting wacht op de stilte,
//   de stem in cutscenes staat op het speelniveau en de omgeving blijft hoorbaar onder de stem.
import { readFileSync } from 'node:fs';
import * as M from '../game/js/sfx/cutmix.js';
import { speechDuckFactor } from '../game/js/sfx/mixplan.js';
import { SCENE_MUSIC } from '../game/js/sfx/cutmuziek.js';
import { loadUnits } from './lib/cutscene_data.mjs';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const read = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// 1. de regels
ok(M.DUCK_DB >= 12 && M.DUCK_DB <= 18, 'duck tussen 12 en 18 dB');
ok(M.ATTACK_S === 0.15 && M.RELEASE_S === 0.6 && M.HOLD_S === 1.2, 'aanval 150 ms, terugkeer 600 ms, vasthouden 1,2 s');
{
  const mix = M.createCutMix('vol', { startDb: 0 });
  let db = 0;
  for (let t = 0; t < 0.15 - 1e-9; t += 0.01) db = mix.step(true, 0.01);
  ok(Math.abs(db - -M.DUCK_DB) < 1.2, 'na 150 ms staat de muziek op de duikstand', String(db));
  for (let t = 0; t < 1.1; t += 0.01) db = mix.step(false, 0.01);
  ok(db === -M.DUCK_DB, 'tot 1,1 s stilte blijft hij laag', String(db));
  for (let t = 0; t < 0.9; t += 0.01) db = mix.step(false, 0.01);
  ok(Math.abs(db) < 0.5, 'na vasthouden en terugkeer is hij weer op niveau', String(db));
  ok(M.dbToGain(0) === 1 && M.dbToGain(-60) === 0 && Math.abs(M.dbToGain(-16) - 0.158) < 0.01, 'dB naar gain');
  ok(Number.isFinite(mix.step(NaN, NaN, NaN)), 'NaN-vrij');
}
{
  // twee regels met 1,4 s pauze: geen terugkeer (de volgende regel is gepland binnen LOOKAHEAD_S)
  const lines = [{ at: 0.6, dur: 2 }, { at: 4.0, dur: 2 }];
  const r1 = M.simulateMix(lines, 6.5, 'vol');
  const gap = r1.samples.filter((s) => s.t > 2.6 && s.t < 4.0);
  ok(Math.max(...gap.map((s) => s.db)) <= -M.DUCK_DB + 0.01, 'een korte pauze tussen twee regels laat de muziek niet terugkomen');
  ok(r1.pumps === 0, 'geen pomp');
  // een echte stilte (6 s): de muziek komt terug en zakt weer bij de volgende regel
  const r2 = M.simulateMix([{ at: 0.6, dur: 2 }, { at: 9, dur: 2 }], 11.5, 'vol');
  const mid = r2.samples.find((s) => s.t > 6.3 && s.t < 6.4);
  ok(mid && mid.db > -1, 'na een lange stilte is de muziek terug', String(mid && mid.db));
  ok(r2.inLineMax <= -M.DUCK_DB + 0.01, 'en onder de tweede regel weer laag');
  ok(M.simulateMix([], 10, undefined).mode === 'vol', 'een scène zonder regels laat de muziek staan');
}
{
  const w = M.speechWindows([{ at: 1, dur: 3, vdur: 1 }, { at: 1.5, dur: 1 }, { at: 8, dur: 2, voiceDur: 0.5 }, { dur: 2 }, null]);
  ok(w.length === 2 && w[0].from === 1 && w[0].to === 2.5 && w[1].to === 8.5, 'stemvensters: opname telt vóór ondertiteltijd, overlap samengevoegd', JSON.stringify(w));
  ok(M.stingOkAt(w, 5) && !M.stingOkAt(w, 1.2) && !M.stingOkAt(w, 2.6) && M.stingOkAt(w, 2.8), 'een sting alleen in een stilte, met een rand');
  ok(M.sceneMusicMode({ music: 'laag' }, [], 10) === 'laag' && M.sceneMusicMode({ id: 'x', music: 'xx' }, [{ at: 0, dur: 9 }], 10, { x: 'vol' }) === 'vol'
    && M.sceneMusicMode({ id: 'y' }, [{ at: 0, dur: 9 }], 10, {}) === 'uit' && M.sceneMusicMode({ id: 'y' }, [{ at: 0, dur: 1 }], 10, {}) === 'laag', 'stand: scène-data, dan tabel, dan automatisch');
  for (const v of Object.values(SCENE_MUSIC)) ok(M.MUSIC_MODES.includes(v), 'tabelwaarde is een geldige stand');
}

// 2. de echte scènes van de eerste 30 minuten
const data = await loadUnits();
const IDS = /^(story-opening|F\d$|M0[1-5]\.(intro|outro|\d)$)/;
const units = [...data.units.filter((u) => IDS.test(u.id) && u.lines.length), ...data.scriptUnits.filter((u) => /^(O1|O2)$/.test(u.id))];
ok(units.length >= 22, 'de eerste 30 minuten bevatten minstens 22 scènes met regels', String(units.length));
const rows = [];
for (const u of units) {
  const auto = M.autoMusicMode(u.lines, u.duration);
  for (const mode of ['uit', 'laag', 'vol']) {
    const s = M.simulateMix(u.lines, u.duration, mode);
    ok(s.inLineMax <= M.LINE_MAX_DB, `${u.id} (${mode}): in een regel zit de muziek op hoogstens ${M.LINE_MAX_DB} dB`, s.inLineMax.toFixed(1));
    ok(s.pumps === 0, `${u.id} (${mode}): de muziek pompt niet tussen twee regels`, String(s.pumps));
  }
  const s = M.simulateMix(u.lines, u.duration, auto);
  ok(s.final > -M.DUCK_DB || auto === 'uit', `${u.id}: na de scène komt de muziek terug`);
  ok(M.legacyDb('radio', true) > M.LINE_MAX_DB && M.legacyDb('scenario', true) > M.LINE_MAX_DB, `${u.id}: de oude stand zou hier falen`);
  rows.push({ id: u.id, mode: auto, cover: s.coverage });
}
ok(rows.filter((x) => x.mode === 'uit').length >= units.length * 0.8, 'de dialoogscènes zijn bijna allemaal uit (geen melodie onder gesprek)', JSON.stringify(rows.filter((x) => x.mode !== 'uit').map((x) => x.id)));

// 3. de bedrading
const radio = read('audio/radio.js'), scen = read('audio/scenario.js'), theme = read('theme.js'), cine = read('cinematics.js'), audio = read('audio.js');
const host = read('cutscenehost.js'), mis = read('missionstory.js'), cm = read('sfx/cutmusic.js');
ok(/tickCutMusic\(dt\)/.test(radio) && /\* cutMusicGain\(\)/.test(radio) && /cutMusicActive\(\) \? 0 : speech\.musicDuck/.test(radio), 'de radio volgt de cutscenemix');
ok(/\* cutMusicGain\(\) \*/.test(scen) && /cutMusicActive\(\) \? 0 : speech\.musicDuck/.test(scen), 'de scenarioloop volgt de cutscenemix');
ok(/createCutMix\('vol'/.test(theme) && /themeMix\.gain\(\)/.test(theme) && !/ducked \? 0\.4/.test(theme), 'het thema duikt via de mix, niet meer met een sprong');
ok(/beginCutMusic\(\{[^}]*music: active\.music/.test(cine) && /endCutMusic\(\)/.test(cine) && /clockCutMusic\(active\.t\)/.test(cine), 'cinematics meldt begin, klok en eind');
ok(/sceneId: useDef\.id/.test(host) && /useDef\.music/.test(host), 'de host geeft de stand van de scène door');
ok(/vdur: l\.voice/.test(mis), 'de missiescènes geven de duur van de opname mee');
ok(/whenSpeechQuiet\(playClueStingNu\)/.test(audio), 'de clue-sting wacht op de stilte');
ok(/export function whenSpeechQuiet/.test(cm), 'whenSpeechQuiet bestaat');
// de stem in een cutscene staat op het speelniveau: geen volumeknop op het element, geen gain onder 1
const px = audio.slice(audio.indexOf('function playExclusive'), audio.indexOf('export function playStoryVoice'));
ok(px.length > 200 && !/\.volume\s*=/.test(px) && !/gain\.value\s*=\s*0\./.test(px), 'playExclusive (verhaalstem) laat het niveau van de opname staan');
ok(/v\.node\.connect\(voiceBus\)/.test(px), 'de verhaalstem gaat rechtstreeks naar de stembus, zoals de spelstemmen');
// de omgeving en de effecten blijven hoorbaar maar onder de stem (mixplan): niet onder -20 dB, wel onder 1
const amb = (1 - 0.5) * speechDuckFactor('omgeving', 1);
ok(amb < 1 && 20 * Math.log10(amb) > -20, 'de omgeving onder een stem blijft hoorbaar (boven -20 dB)', (20 * Math.log10(amb)).toFixed(1));
for (const c of ['voetstap', 'deur', 'dier', 'voertuig']) ok(speechDuckFactor(c, 1) < 1 && speechDuckFactor(c, 1) >= 0.4, `${c} blijft hoorbaar onder een stem`);

console.log(`cutmix_test: ${n} controles, ${fails} fouten, ${units.length} scènes doorgerekend`);
process.exit(fails ? 1 : 0);
