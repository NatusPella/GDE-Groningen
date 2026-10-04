// Which record the radio plays next (audio.js). Node-safe, no DOM.
//
// A track: { id, stations: ['gmusic', ...] (its pools: 'gmusic' for the day
// programmes, 'nachtstreek' for the night one), time: 'any' | 'day' | 'night',
// weight, artist }. The manifest (audio/gmusic/manifest.json) may list a
// track as a plain file name; normalizeTrack fills in the defaults.
//
// pickTrack keeps one play history for both pools together (newest last),
// so the switch to Nachtstreek at 22:00 doesn't land on the record you just
// heard:
// - the last `window` records are never picked again (about 60% of the
//   pool, at least one);
// - of the rest, a record that has not played for longer weighs more, one by
//   the same act as the last record less;
// - 'night' records weigh more from 22:00 to 06:00 and less by day, 'day'
//   records the other way round;
// - `weight` in the manifest scales all of it (2 = twice as often).

export const MUSIC_STATIONS = ['gmusic', 'nachtstreek'];
// below this many own records a pool borrows the rest, at a lower weight
export const MIN_POOL = 6;
const BORROWED = 0.35;
const HISTORY_MAX = 60;

export function normalizeTrack(entry) {
  const e = typeof entry === 'string' ? { file: entry } : entry && typeof entry === 'object' ? entry : null;
  if (!e || typeof e.file !== 'string' || !e.file) return null;
  const stations = Array.isArray(e.stations) ? e.stations.filter((s) => MUSIC_STATIONS.includes(s)) : [];
  const w = Number(e.weight);
  return {
    file: e.file,
    id: e.file.replace(/\.[^.]+$/, ''),
    stations: stations.length ? stations : ['gmusic'],
    time: e.time === 'day' || e.time === 'night' ? e.time : 'any',
    weight: Number.isFinite(w) && w > 0 ? w : 1,
    artist: typeof e.artist === 'string' ? e.artist : '',
  };
}

export function isNight(hour) {
  return Number.isFinite(hour) && (hour >= 22 || hour < 6);
}

// The station's own records, topped up with the others when it has fewer
// than MIN_POOL (they come with `borrowed: true` and weigh less).
export function stationPool(tracks, station) {
  const own = tracks.filter((t) => t.stations.includes(station));
  if (own.length >= MIN_POOL || own.length === tracks.length) return own.map((t) => ({ t, borrowed: false }));
  return [...own.map((t) => ({ t, borrowed: false })), ...tracks.filter((t) => !own.includes(t)).map((t) => ({ t, borrowed: true }))];
}

export function trackWeight(t, { hour, ago, poolSize, lastArtist, borrowed = false }) {
  let w = t.weight;
  if (borrowed) w *= BORROWED;
  if (t.time !== 'any' && Number.isFinite(hour)) w *= (t.time === 'night') === isNight(hour) ? 2 : 0.5;
  w *= 1 + Math.min(ago, poolSize) / poolSize;
  if (lastArtist && t.artist && t.artist === lastArtist) w *= 0.3;
  return w;
}

// history: track ids, newest last. Returns a track (or null for no tracks).
export function pickTrack(tracks, history, { station = 'gmusic', hour = NaN, rng = Math.random } = {}) {
  const pool = stationPool(tracks, station);
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0].t;
  const n = pool.length;
  const window = Math.max(1, Math.min(n - 1, Math.floor(n * 0.6)));
  const recent = new Set(history.slice(-window));
  let cands = pool.filter((p) => !recent.has(p.t.id));
  if (!cands.length) cands = pool.filter((p) => p.t.id !== history[history.length - 1]);
  const lastId = history[history.length - 1];
  const last = tracks.find((t) => t.id === lastId);
  const weights = cands.map((p) => {
    const i = history.lastIndexOf(p.t.id);
    const ago = i < 0 ? n : history.length - 1 - i;
    return trackWeight(p.t, { hour, ago, poolSize: n, lastArtist: last && last.artist, borrowed: p.borrowed });
  });
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) {
    r -= weights[i];
    if (r <= 0) return cands[i].t;
  }
  return cands[cands.length - 1].t;
}

export function pushHistory(history, id) {
  history.push(id);
  if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX);
  return history;
}

// A jingle between two records, not every time and never the same one twice
// in a row; null = straight on to the next record.
export function pickJingle(keys, lastKey, { chance = 0.6, rng = Math.random } = {}) {
  if (!keys.length || rng() >= chance) return null;
  const pool = keys.length > 1 ? keys.filter((k) => k !== lastKey) : keys;
  return pool[Math.floor(rng() * pool.length)];
}

// --- the programme schedule ---------------------------------------------------------------
// One station with a programme per part of the game day. `music` is the
// pool, `every` the records between two talk breaks, `talk` the break kinds
// in turn (radio.js voices them), `jingles` whether the G-Music jingles run.
export const STATION_NAME = 'G-Music';
export const PROGRAMMES = [
  { id: 'ochtend', from: 6, to: 10, name: 'Proat in de ochtend', sub: 'Geesje met het nieuws, het verkeer en het weer', music: 'gmusic', jingles: true, every: 2, talk: ['ident', 'news', 'traffic', 'weather', 'ad', 'clip', 'traffic', 'cows'] },
  { id: 'dag', from: 10, to: 18, name: 'De hits', sub: 'Muziek, met af en toe het nieuws', music: 'gmusic', jingles: true, every: 3, talk: ['clip', 'ad', 'news', 'weather', 'cows', 'clip', 'traffic'] },
  { id: 'avond', from: 18, to: 22, name: 'Avondproat', sub: 'Geesje, de koeien en Kiekdoar', music: 'gmusic', jingles: true, every: 3, talk: ['news', 'cows', 'ad', 'rikus', 'clip', 'weather'] },
  { id: 'nacht', from: 22, to: 6, name: 'Nachtstreek', sub: 'Rikus draait streekmuziek tot de ochtend', music: 'nachtstreek', jingles: false, every: 2, talk: ['rikus', 'rikus', 'clip'] },
];

export function programmeAt(hour) {
  const h = Number.isFinite(hour) ? ((hour % 24) + 24) % 24 : 12;
  return PROGRAMMES.find((p) => (p.from < p.to ? h >= p.from && h < p.to : h >= p.from || h < p.to)) || PROGRAMMES[1];
}

// The radio in the save: 'on' or 'off'. 0.26's station ids (and anything
// unknown) are 'on'; only its 'uit' stays off.
export function normalizeRadio(v) {
  return v === 'off' || v === 'uit' ? 'off' : 'on';
}
