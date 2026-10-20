// One definition of night, by the sun (#107): sunrules.js, daynight.js dayState and the rules
// that only know an hour (missions.isNight, musicpick, muggingrules, streetlifedata) agree at
// every hour and every season, and the transitions are where the sun puts them.
//   node scripts/sunrules_test.mjs
import './node3d.mjs';

const S = await import('../game/js/sunrules.js');
const D = await import('../game/js/daynight.js');
const MI = await import('../game/js/missions.js');
const MP = await import('../game/js/musicpick.js');
const MR = await import('../game/js/muggingrules.js');
const SL = await import('../game/js/streetlifedata.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// the dates the game has: the sun's declination from spring to midsummer, and the look the trailer was shot with
const DECLINATIONS = [null, 0, 10, 15, 20.5, -10];
for (const dec of DECLINATIONS) {
  S.setSunDeclination(dec);
  const tag = `declination ${dec}`;
  // the hours in quarters: every module says the same
  let diff = '';
  for (let h = 0; h < 24; h += 0.25) {
    const world = { clock: h };
    D.refreshDayNight(world);
    const ds = D.dayState(world), nf = S.nightAtHour(h);
    if (Math.abs(ds.night - nf) > 1e-9) diff += ` night@${h}`;
    if (ds.isNight !== S.isNightAtHour(h)) diff += ` isNight@${h}`;
    if (MI.isNight(world) !== ds.isNight) diff += ` missions@${h}`;
    if (MI.isNight({ dayNight: { hour: h } }) !== ds.isNight) diff += ` missionsDN@${h}`;
    if (MP.isNight(h) !== ds.isNight) diff += ` music@${h}`;
    if (SL.isNight(h) !== ds.isNight) diff += ` streetlife@${h}`;
    if (MR.nightFactor(h) !== nf) diff += ` mugging@${h}`;
  }
  ok(diff === '', `${tag}: dayState, missions, music, street life and muggings agree at every hour`, diff.slice(0, 120));
  ok(S.nightAtHour(13) === 0 && S.nightAtHour(2) > 0.5 || dec === 20.5 && S.nightAtHour(2) > 0.5, `${tag}: noon is day, the small hours are night`, `${S.nightAtHour(2)}`);
  // one dusk and one dawn: night goes 0 -> 1 once in the evening and back once in the morning
  let changes = 0, prev = S.isNightAtHour(0);
  for (let h = 0.05; h < 24; h += 0.05) { const v = S.isNightAtHour(h); if (v !== prev) changes++; prev = v; }
  ok(changes === 2, `${tag}: night starts once and ends once a day`, `${changes}`);
  // the transition is smooth: no jump in night between two minutes
  let jump = 0;
  for (let h = 0; h < 24; h += 1 / 60) jump = Math.max(jump, Math.abs(S.nightAtHour(h + 1 / 60) - S.nightAtHour(h)));
  ok(jump < 0.05, `${tag}: the twilight is smooth`, `${jump}`);
  // the clock wraps
  ok(Math.abs(S.nightAtHour(25) - S.nightAtHour(1)) < 1e-12 && Math.abs(S.nightAtHour(-1) - S.nightAtHour(23)) < 1e-12, `${tag}: the clock wraps`);
}

// the seasons: the later the sun sets, the later night begins, and spring nights are longer than midsummer's
const dusk = (dec) => { S.setSunDeclination(dec); for (let h = 12; h < 24; h += 0.01) if (S.isNightAtHour(h)) return h; return 24; };
const dawn = (dec) => { S.setSunDeclination(dec); for (let h = 12; h > 0; h -= 0.01) if (S.isNightAtHour(h)) return h; return 0; };
const lenNight = (dec) => (24 - dusk(dec)) + dawn(dec);
ok(dusk(20.5) > dusk(10) && dusk(10) > dusk(0), 'dusk comes later towards midsummer', `${dusk(0).toFixed(2)} ${dusk(10).toFixed(2)} ${dusk(20.5).toFixed(2)}`);
ok(lenNight(20.5) < lenNight(0), 'the midsummer night is shorter than the spring night', `${lenNight(20.5).toFixed(2)} vs ${lenNight(0).toFixed(2)}`);
ok(dusk(15) > 19 && dusk(15) < 22 && dawn(15) > 3 && dawn(15) < 6, 'at the default date night is from about 19:40 to 04:20', `${dusk(15).toFixed(2)} - ${dawn(15).toFixed(2)}`);

// junk in, day out
S.setSunDeclination(null);
ok(S.nightAtHour(NaN) === 0 && S.nightAtHour(undefined) === 0 && !S.isNightAtHour(NaN), 'a missing hour is day');
ok(MP.isNight(NaN) === false && SL.isNight(undefined) === false, 'and so for the radio and the street life');
ok(D.dayState(null).isNight === false && D.dayState({}).hour === 12, 'dayState of nothing is noon');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
