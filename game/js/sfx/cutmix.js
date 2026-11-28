// De muziekmix van cutscenes (aaa30, eigenaar 28-11: "als er spraak is leidt muziek soms enorm af"): één pure plek met de regels,
// zonder Web Audio en zonder DOM, zodat scripts/cutmix_test.mjs hem over de echte scènedata kan doorrekenen.
//
//   a. ducking: zodra een stemregel klinkt zakt de muziek DUCK_DB (16 dB, binnen 12 tot 18) in ATTACK_S (0,15 s); na de regel blijft hij
//      laag tot HOLD_S (1,2 s) stilte en komt dan in RELEASE_S (0,6 s) terug. Twee regels met een korte pauze pompen dus niet.
//      Is de volgende regel al gepland binnen LOOKAHEAD_S, dan komt de muziek helemaal niet terug.
//   b. stand per scène (muziek: 'vol' | 'laag' | 'uit'): 'vol' speelt op normaal niveau in de stiltes, 'laag' op LAAG_DB, 'uit' valt weg.
//      Zonder opgave kiest autoMusicMode: een scène waarin vooral gepraat wordt is 'uit' (geen melodie onder een gesprek), de rest 'laag'.
//      De regie kan het per scène sturen: `music: 'vol'` in de scène-data, of een regel in SCENE_MUSIC (sfx/cutmuziek.js).
//   c. stings en muziekwissels alleen in een stilte: stingOkAt.
//   d./e. de omgeving en de effecten volgen mixplan.js (speechDuckFactor) en blijven hoorbaar; de stem zelf blijft op het speelniveau (1).
//
// Alles in dB ten opzichte van het gewone muziekniveau (musicBusGain); gain() geeft de factor voor de bus.

export const MUSIC_MODES = ['vol', 'laag', 'uit'];
export const DUCK_DB = 16;        // onder een stemregel (12 tot 18 dB)
export const ATTACK_S = 0.15;     // hoe snel de muziek zakt
export const RELEASE_S = 0.6;     // hoe snel hij terugkomt (de hele DUCK_DB)
export const HOLD_S = 1.2;        // zo lang blijft hij laag na het eind van een regel
export const LOOKAHEAD_S = 2.4;   // een regel die binnen zoveel seconden volgt houdt de muziek laag
export const LAAG_DB = -8;        // het niveau van 'laag' in een stilte
export const FLOOR_DB = -60;      // 'uit' en de bodem van de glijbaan
export const DENSE_SPEECH = 0.4;  // deel van de scène met stem waarboven 'uit' de standaard is
export const LINE_MAX_DB = -12;   // de toets: in een regel mag de muziek nooit boven dit niveau (t.o.v. normaal) klinken
export const STING_PAD_S = 0.2;   // een sting houdt zoveel afstand van een regel

export const normMusicMode = (m) => (MUSIC_MODES.includes(m) ? m : null);
export const dbToGain = (db) => (!Number.isFinite(db) || db <= FLOOR_DB + 1 ? 0 : Math.pow(10, db / 20));
export const openDb = (mode) => (mode === 'vol' ? 0 : mode === 'uit' ? FLOOR_DB : LAAG_DB);

const num = (x, d = null) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

// Wanneer er echt gesproken wordt: [{ from, to }], gesorteerd en samengevoegd. De opname (vdur, voiceDur of voice.dur) telt vóór de
// ondertiteltijd (dur), want die is langer dan de stem (minimale leestijd); een regel zonder opname telt voor haar hele dur.
export function speechWindows(lines) {
  const w = [];
  for (const l of Array.isArray(lines) ? lines : []) {
    const at = num(l && l.at);
    if (at == null) continue;
    const v = num(l.vdur) ?? num(l.voiceDur) ?? num(l.voice && l.voice.dur);
    const d = v != null && v > 0 ? v : num(l.dur, 2);
    if (d > 0) w.push({ from: at, to: at + d });
  }
  w.sort((a, b) => a.from - b.from);
  const out = [];
  for (const x of w) {
    const last = out[out.length - 1];
    if (last && x.from <= last.to) last.to = Math.max(last.to, x.to);
    else out.push({ ...x });
  }
  return out;
}

export function speechCoverage(lines, duration) {
  const d = num(duration, 0);
  if (d <= 0) return 0;
  return Math.min(1, speechWindows(lines).reduce((s, x) => s + Math.max(0, Math.min(d, x.to) - Math.max(0, x.from)), 0) / d);
}

export const speakingAt = (windows, t) => windows.some((x) => t >= x.from && t < x.to);
// seconden tot de volgende stem na t (0 als er nu gesproken wordt, Infinity als er niets meer komt)
export function nextSpeechIn(windows, t) {
  for (const x of windows) { if (t < x.from) return x.from - t; if (t < x.to) return 0; }
  return Infinity;
}

// de stand van een scène zonder opgave: vooral praten = 'uit', anders 'laag'. Een scène zonder regels laat de muziek gewoon staan ('vol').
export function autoMusicMode(lines, duration) {
  if (!speechWindows(lines).length) return 'vol';
  return speechCoverage(lines, duration) >= DENSE_SPEECH ? 'uit' : 'laag';
}

// de stand van een scène: de opgave in de scène-data (def.music), anders de tabel van de regie (table[def.id]), anders automatisch
export function sceneMusicMode(def, lines, duration, table = null) {
  return normMusicMode(def && def.music) || normMusicMode(table && def && table[def.id]) || autoMusicMode(lines, duration);
}

// een sting mag alleen in een stilte: niet in een regel, en op STING_PAD_S afstand ervan
export function stingOkAt(windows, t, pad = STING_PAD_S) {
  return !windows.some((x) => t >= x.from - pad && t < x.to + pad);
}

// ---- de glijdende stand (runtime en simulatie gebruiken dezelfde) ----------------------------------------------------------
export function createCutMix(mode = 'laag', opts = {}) {
  const o = { duck: DUCK_DB, attack: ATTACK_S, release: RELEASE_S, hold: HOLD_S, look: LOOKAHEAD_S, startDb: null, ...opts };
  const st = { mode: normMusicMode(mode) || 'laag', db: null, holdLeft: 0 };
  // een scène begint op het niveau waarop de muziek net speelde (startDb, normaal 0): hij zakt dan met de aanzet, geen klik
  st.db = Number.isFinite(o.startDb) ? o.startDb : openDb(st.mode);
  return {
    state: st,
    setMode(m) { st.mode = normMusicMode(m) || st.mode; },
    // speaking: klinkt er nu een regel; nextIn: seconden tot de volgende geplande regel (Infinity als onbekend); dt in s. Geeft dB.
    step(speaking, dt, nextIn = Infinity) {
      const d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.25) : 0;
      const open = openDb(st.mode);
      if (speaking) st.holdLeft = o.hold; else st.holdLeft = Math.max(0, st.holdLeft - d);
      const low = speaking || st.holdLeft > 0 || (Number.isFinite(nextIn) && nextIn < o.look);
      const target = st.mode === 'uit' ? FLOOR_DB : low ? open - o.duck : open;
      if (st.db == null || !Number.isFinite(st.db)) st.db = target;
      const down = o.duck / o.attack, up = o.duck / o.release; // dB per seconde
      if (target < st.db) st.db = Math.max(target, st.db - down * d);
      else if (target > st.db) st.db = Math.min(target, st.db + up * d);
      st.db = Math.max(FLOOR_DB, st.db);
      return st.db;
    },
    gain: () => dbToGain(st.db),
  };
}

// De hele scène doorgerekend met een vaste stap: [{ t, db, speaking }] plus de maten waar de test en de grafiek op steunen.
// tail = stilte na het einde van de scène (de muziek komt dan terug).
export function simulateMix(lines, duration, mode, { dt = 0.02, tail = 3, look = true, opts = {} } = {}) {
  const windows = speechWindows(lines);
  const m = normMusicMode(mode) || autoMusicMode(lines, duration);
  const mix = createCutMix(m, { startDb: 0, ...opts });
  const samples = [];
  const end = num(duration, 0) + tail;
  let inLineMax = -Infinity;
  for (let t = 0; t <= end + 1e-9; t += dt) {
    const speaking = speakingAt(windows, t);
    const db = mix.step(speaking, dt, look ? nextSpeechIn(windows, t) : Infinity);
    samples.push({ t: +t.toFixed(3), db: +db.toFixed(2), speaking });
    // in een regel telt pas na de aanzet (ATTACK_S) mee
    if (t < duration && windows.some((x) => t >= x.from + ATTACK_S + dt && t < x.to)) inLineMax = Math.max(inLineMax, db);
  }
  // een pomp: tussen twee regels met minder dan 2 x HOLD_S stilte komt de muziek meer dan 6 dB terug
  let pumps = 0;
  for (let i = 1; i < windows.length; i++) {
    const gapFrom = windows[i - 1].to, gapTo = windows[i].from;
    const inGap = samples.filter((s) => s.t >= gapFrom && s.t <= gapTo);
    if (!inGap.length) continue;
    const lo = Math.min(...inGap.map((s) => s.db)), hi = Math.max(...inGap.map((s) => s.db));
    if (hi - lo > 6 && gapTo - gapFrom < 2 * HOLD_S) pumps++;
  }
  // hoeveel van de scène de muziek hoorbaar is (boven -20 dB) buiten de regels: de stiltes die hij mag vullen
  const quiet = samples.filter((s) => s.t < duration && !s.speaking);
  const audibleQuiet = quiet.length ? quiet.filter((s) => s.db > -20).length / quiet.length : 0;
  return { mode: m, windows, samples, inLineMax: Number.isFinite(inLineMax) ? inLineMax : -Infinity, pumps, audibleQuiet, coverage: speechCoverage(lines, duration), final: samples[samples.length - 1].db };
}

// De stand van vóór deze mix (audio/radio.js, scenario.js, theme.js), voor het voor-en-na: de hele scène hield de radio op
// GMUSIC_DUCK/GMUSIC (-4,6 dB), de scenarioloop op musicDuckGain(1) (-6 dB) en de thema-intro dipte tot 0,4 (-8 dB) alleen in een regel.
export const LEGACY_DB = { radio: 20 * Math.log10(0.5 / 0.85), scenario: 20 * Math.log10(0.5), theme: 20 * Math.log10(0.4) };
export function legacyDb(bron, speaking) {
  if (bron === 'theme') return speaking ? LEGACY_DB.theme : 0;
  return LEGACY_DB[bron] ?? LEGACY_DB.radio;
}
