// Logic test for the radio's record picker (game/js/musicpick.js) against
// the real manifest.
//   node scripts/music_pick_test.mjs
import fs from 'node:fs';
import * as M from '../game/js/musicpick.js';

let fails = 0, n = 0;
const ok = (c, name, extra) => { n++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const manifest = JSON.parse(fs.readFileSync(new URL('../game/audio/gmusic/manifest.json', import.meta.url), 'utf8'));
const tracks = manifest.tracks.map(M.normalizeTrack).filter(Boolean);
ok(tracks.length === manifest.tracks.length, 'every manifest entry is a track');
for (const t of tracks) ok(fs.existsSync(new URL('../game/audio/gmusic/' + t.file, import.meta.url)), `file exists: ${t.file}`);
ok(M.normalizeTrack('a.mp3').stations.join() === 'gmusic' && M.normalizeTrack('a.mp3').id === 'a', 'a plain file name is a G-Music track');
ok(M.normalizeTrack({ file: 'b.mp3', stations: ['bogus'], weight: -1, time: 'noon' }).weight === 1, 'bad fields fall back');
ok(M.normalizeTrack(null) === null && M.normalizeTrack({}) === null, 'junk is dropped');

// a seeded rng so the run is the same every time
let seed = 7;
const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

for (const station of M.MUSIC_STATIONS) {
  const pool = M.stationPool(tracks, station);
  const size = pool.length;
  const window = Math.max(1, Math.min(size - 1, Math.floor(size * 0.6)));
  const hist = [];
  const seen = new Map();
  let repeat = 0;
  for (let i = 0; i < 400; i++) {
    const t = M.pickTrack(tracks, hist, { station, hour: 14, rng });
    if (hist.slice(-window).includes(t.id)) repeat++;
    M.pushHistory(hist, t.id);
    seen.set(t.id, (seen.get(t.id) || 0) + 1);
  }
  ok(repeat === 0, `${station}: no record within the last ${window}`, repeat);
  ok(seen.size === size, `${station}: every record of its pool plays (${seen.size}/${size})`);
  ok(pool.every((p) => p.t.stations.includes(station) || p.borrowed), `${station}: pool is its own records`);
  console.log(`${station}: ${pool.filter((p) => !p.borrowed).length} own records, pool ${size}, no-repeat window ${window}`);
}

// night records weigh more at night
const count = (hour) => {
  const hist = [];
  let night = 0;
  for (let i = 0; i < 2000; i++) {
    const t = M.pickTrack(tracks, hist, { station: 'gmusic', hour, rng });
    M.pushHistory(hist, t.id);
    if (t.time === 'night') night++;
  }
  return night;
};
ok(count(23) > count(13) * 1.3, 'night records play more at night', [count(23), count(13)]);

// jingles: never the same twice in a row, sometimes none
let last = null, same = 0, none = 0;
for (let i = 0; i < 500; i++) {
  const j = M.pickJingle(['a', 'b', 'c'], last, { chance: 0.6, rng });
  if (!j) { none++; continue; }
  if (j === last) same++;
  last = j;
}
ok(same === 0, 'never the same jingle twice in a row');
ok(none > 100 && none < 300, 'a jingle about 60% of the time', none);
ok(M.pickTrack([], [], {}) === null, 'no tracks, no record');

// the schedule: a programme for every hour, Nachtstreek from 22:00
const onAir = new Set();
for (let h = 0; h < 24; h += 0.25) onAir.add(M.programmeAt(h).id);
ok(onAir.size === M.PROGRAMMES.length, 'every programme is on air some time', [...onAir]);
ok(M.programmeAt(22).id === 'nacht' && M.programmeAt(3).id === 'nacht' && M.programmeAt(5.99).id === 'nacht', 'Nachtstreek from 22:00 to 06:00');
ok(M.programmeAt(7).id === 'ochtend' && M.programmeAt(12).id === 'dag' && M.programmeAt(20).id === 'avond', 'morning, day and evening');
ok(M.programmeAt(NaN).id === 'dag' && M.programmeAt(-1).id === 'nacht' && M.programmeAt(30).id === 'ochtend', 'odd hours wrap');
for (const p of M.PROGRAMMES) {
  ok(M.MUSIC_STATIONS.includes(p.music) && p.every >= 1 && p.talk.length > 0, `${p.id}: a pool, a break rhythm and talk`);
  ok(M.stationPool(tracks, p.music).length >= M.MIN_POOL, `${p.id}: enough records`);
}
ok(!M.programmeAt(23).jingles && M.programmeAt(13).jingles, 'no G-Music jingles during Nachtstreek');
ok(['gmusic', 'nachtstreek', 'grunn', 'on', undefined, null, 5].every((v) => M.normalizeRadio(v) === 'on'), 'old stations and junk are on');
ok(M.normalizeRadio('uit') === 'off' && M.normalizeRadio('off') === 'off', 'off stays off');


// new records (#238): "nieuw": true in the manifest gets priority, then mixes in evenly
{
  ok(M.normalizeTrack({ file: 'n.mp3', nieuw: true }).nieuw === true && M.normalizeTrack('o.mp3').nieuw === false, 'nieuw flag is read, default off');
  const old = tracks.filter((t) => !t.nieuw);
  const fresh = ['nieuw_a', 'nieuw_b'].map((id) => M.normalizeTrack({ file: id + '.mp3', nieuw: true, stations: ['gmusic'] }));
  const all = [...old, ...fresh];
  let sd = 11; const r2 = () => ((sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648);
  // fresh start: an unheard new record comes first, every time
  for (let i = 0; i < 20; i++) ok(M.pickTrack(all, [], { hour: 14, rng: r2, fresh: true }).nieuw, 'fresh start plays a new record first');
  // boost: while under NIEUW.plays they are over-represented; afterwards equal to the rest
  const share = (hist0) => { let c = 0, hist = hist0.slice(); for (let i = 0; i < 600; i++) { const t = M.pickTrack(all, hist, { hour: 14, rng: r2 }); if (t.nieuw) c++; M.pushHistory(hist, t.id); if (!hist0.length) { hist.length = Math.min(hist.length, 3); } } return c / 600; };
  const base = fresh.length / all.length;
  ok(share([]) > base * 1.5, 'new records are played more than their share while unheard', share([]).toFixed(3));
  const heard = []; for (let i = 0; i < M.NIEUW.plays; i++) heard.push('nieuw_a', 'nieuw_b');
  ok(M.trackWeight(fresh[0], { hour: 14, ago: 5, poolSize: 10, plays: M.NIEUW.plays }) === M.trackWeight({ ...fresh[0], nieuw: false }, { hour: 14, ago: 5, poolSize: 10, plays: 0 }), 'after NIEUW.plays plays a new record weighs like any other');
  ok(M.isFreshNew(fresh[0], []) && !M.isFreshNew(fresh[0], heard) && !M.isFreshNew(old[0], []), 'isFreshNew');
  ok(M.NIEUW.boost > 1 && M.NIEUW.plays >= 1, 'NIEUW is tuned in one place');
}
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
