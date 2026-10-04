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

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
