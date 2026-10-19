// Radio watchdog (game/js/musicwatch.js) and the picker's guarantees for #146.
//   node scripts/musicwatch_test.mjs
import * as W from '../game/js/musicwatch.js';
import * as M from '../game/js/musicpick.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const base = { active: true, hasEl: true, ended: false, currentTime: 0, inBreak: false };

// healthy: the position moves, nothing happens
{
  const w = W.createMusicWatch();
  let acts = [];
  for (let t = 0; t < 60; t += 2) acts.push(w.step(t, { ...base, currentTime: t }));
  ok(acts.every((a) => a === null), 'playing music is left alone', acts);
}
// frozen position: first resume, then the next record, then quiet
{
  const w = W.createMusicWatch();
  const acts = [];
  for (let t = 0; t <= 30; t += 2) acts.push([t, w.step(t, { ...base, currentTime: 12 })].join(':'));
  const seq = acts.map((a) => a.split(':')[1]).filter(Boolean);
  ok(seq[0] === 'resume' && seq[1] === 'advance', 'stall: resume, then advance', seq);
  ok(w.nudges <= 4, 'stall: no storm of nudges', w.nudges);
}
// a lost 'ended' event
{
  const w = W.createMusicWatch();
  const a = [0, 2, 4, 6].map((t) => w.step(t, { ...base, ended: true, currentTime: 100 }));
  ok(a[0] === null && a[1] === null && a[2] === 'advance', 'ended without event: advance after the grace', a);
}
// no element at all while it should play
ok(W.createMusicWatch().step(5, { ...base, hasEl: false }) === 'advance', 'no current element: advance');
// held / off / pending / suspended: never nudged, however long
{
  const w = W.createMusicWatch();
  let bad = 0;
  for (let t = 0; t < 600; t += 2) if (w.step(t, { ...base, active: false, currentTime: 3 })) bad++;
  ok(bad === 0, 'inactive radio is never nudged', bad);
  // and the stall clock restarts when it becomes active again
  ok(w.step(602, { ...base, currentTime: 3 }) === null && w.step(604, { ...base, currentTime: 3 }) === null, 'stall clock starts fresh after being inactive');
}
// talk break: left alone, until its handler is overdue
{
  const w = W.createMusicWatch();
  let early = 0;
  for (let t = 0; t < W.BREAK_MAX_S; t += 2) if (w.step(t, { ...base, inBreak: true, ended: true })) early++;
  ok(early === 0, 'a normal break is left alone', early);
  ok(w.step(W.BREAK_MAX_S + 2, { ...base, inBreak: true, ended: true }) === 'endBreak', 'a stuck break is ended');
  ok(w.step(W.BREAK_MAX_S + 4, { ...base, ended: true }) === null, 'cooldown after endBreak');
}

// the picker: never empty, never the same record twice in a row, also when
// the pool is small
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((x) => M.normalizeTrack({ file: x + '.mp3', stations: ['gmusic', 'nachtstreek'] }));
let seed = 3;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
{
  const tracks = files;
  for (const station of M.MUSIC_STATIONS) for (const hour of [3, 9, 14, 20]) {
    const hist = []; let prev = null, bad = 0, empty = 0;
    for (let i = 0; i < 300; i++) {
      const t = M.pickTrack(tracks, hist, { station, hour, rng });
      if (!t) { empty++; continue; }
      if (t.id === prev) bad++;
      prev = t.id; M.pushHistory(hist, t.id);
    }
    ok(empty === 0 && bad === 0, `picker ${station} h${hour} (7 records): never empty, no direct repeat`, { empty, bad });
  }
}
ok(M.pickTrack([], [], { station: 'gmusic' }) === null, 'empty pool answers null (audio.js then does nothing)');
const one = [files[0]];
ok(M.pickTrack(one, [one[0].id], { station: 'gmusic' }) === one[0], 'a single record repeats rather than silence');

// silence / empty items never enter the pool
ok(M.normalizeTrack('Stilte.mp3') === null && M.normalizeTrack({ file: 'x.mp3', title: 'Even stilte' }) === null && M.normalizeTrack('silence_30s.mp3') === null && M.normalizeTrack('leeg.mp3') === null, 'silence items are dropped');
ok(M.normalizeTrack('Stilteloos_dansen.mp3') !== null && M.normalizeTrack('Staal_op_staal.mp3') !== null, 'real titles survive');
console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
