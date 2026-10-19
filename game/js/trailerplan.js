// The montage of the two script cuts (docs/verhaal/nieuw/TRAILER-SCRIPT.md, #159):
// 'teaser' (40 s, also made vertical) and 'hoofd' (90 s). Pure data plus a
// validator, so scripts/trailerplan_test.mjs checks rhythm, spoilers and
// sound files in plain node. trailer.js plays it: each beat is one of its
// staged shots (the shot's own captions, lines and voices stay silent in
// these cuts; the beat brings its own), shown for `dur` seconds.
//
//   { shot, dur, plain?, caps: [cap], lines: [[at, dur, who, text]], voice: [[at, src, dur?]], sfx: [[at, kind]] }
//   cap kinds: 'tekst' (kicker + big words), 'radio', 'plakjes' (eight slices struck out
//   on the beat), 'eind' (the game title and the tagline)
//
// Sound is only what the game made itself: the theme song, the story lines
// that were already recorded, and a few synthesised hits (SFX_KINDS) that
// trailer.js and desktop/trailervideo.js both build from noise and sine tones.
// Lines in the script marked [NIEUW] are not voiced: nothing is recorded or
// generated for them.

export const PLAN_CUTS = ['teaser', 'hoofd'];
export const SFX_KINDS = ['knal', 'tik', 'stoot', 'riser'];

const BANTER = 'audio/voicelines/banter/';
const V = {
  rikus: 'audio/voicelines/trailer/rikus_augustus.mp3',
  rijden: BANTER + 'h8-pass-fierljepper_5_a_cf2581.mp3',
  bedoelde: BANTER + 'h10-pass-team_4_t_cc5cf0.mp3',
  zegniks: BANTER + 'id-rikus-duif_1_t_513b4f.mp3',
  oma: 'audio/voicelines/lines/oma_trijntje/die_bal_is_gien_geld_jong_die_ba_c28dcac6.mp3',
};

export const SLICES = 8;

const tekst = (at, dur, title, kicker = null) => ({ kind: 'tekst', at, dur, title, kicker });

// Eight slices, struck out one by one: the times (seconds into the card) and a
// tick of the snare on every one, so picture and sound share one rhythm.
export function sliceTimes(dur) {
  const t0 = dur * 0.22, step = (dur * 0.7) / SLICES;
  return Array.from({ length: SLICES }, (_, i) => +(t0 + i * step).toFixed(3));
}
const plakjes = (at, dur) => ({ kind: 'plakjes', at, dur, title: 'Acht plakjes.', kicker: 'Eén man.', strike: sliceTimes(dur) });
const plakjesTicks = (at, dur) => sliceTimes(dur).map((t) => [+(at + t).toFixed(3), 'tik']);
const eind = (at, dur, small = 'Gratis · voor pc en Mac') => ({ kind: 'eind', at, dur, title: 'GDE Groningen – Zomer vol misdaad', tagline: 'Heel Groningen. Voor één eierbal.', small });

export const PLAN = {
  teaser: {
    target: 40,
    // ink: a snare ticks through the chaos stretch and a riser leads into it
    beats: [
      { shot: 'sunrise', dur: 4.0, caps: [tekst(1.0, 2.8, 'Grunn.', 'd’Olle Grieze')], sfx: [[0.0, 'stoot']] },
      { shot: 'escapade', dur: 5.0, plain: true, voice: [[0.7, V.rijden, 2.03]], lines: [[0.7, 2.1, 'Anita', 'Rijden, niet praten.']] },
      { shot: 'anita', dur: 5.0, plain: true, caps: [tekst(0.6, 4.0, 'Een frietwagen. Eén standplaats.')], sfx: [[3.6, 'riser']] },
      { shot: 'jelle', dur: 3.6, caps: [], sfx: [[0.0, 'stoot']] },
      { shot: 'twins', dur: 3.4, plain: true, caps: [plakjes(0.2, 3.1)], sfx: plakjesTicks(0.2, 3.1) },
      { shot: 'ommeland', dur: 2.2, sfx: [[0.0, 'tik']] },
      { shot: 'chase', dur: 2.2, sfx: [[0.0, 'tik'], [1.1, 'tik']] },
      { shot: 'boat', dur: 2.0, sfx: [[0.0, 'tik'], [1.0, 'tik']] },
      { shot: 'pigeon', dur: 2.2, sfx: [[0.0, 'tik'], [1.1, 'tik']] },
      { shot: 'bijna', dur: 1.3, sfx: [[0.0, 'tik'], [0.65, 'tik']] },
      { shot: 'tammo', dur: 4.0, plain: true, voice: [[1.6, V.bedoelde, 0.9]], lines: [[1.6, 1.0, 'Tammo', 'Dat bedoelde ik ook.']] },
      { shot: 'logo', dur: 5.0, caps: [eind(0.3, 4.2)], sfx: [[0.3, 'stoot']] },
    ],
  },
  hoofd: {
    target: 90,
    beats: [
      { shot: 'radio', dur: 4.0, caps: [{ kind: 'radio', at: 0.25, dur: 3.6, kicker: 'Radio Nachtstreek', title: '06:12' }], voice: [[0.05, V.rikus, 4.85]], lines: [[0.9, 3.1, 'Rikus', 'Augustus. In Grunn heet dat zomer.']] },
      { shot: 'sunrise', dur: 4.0, caps: [tekst(0.8, 3.0, 'Grunn.', 'd’Olle Grieze')] },
      { shot: 'vismarkt', dur: 4.0, plain: true },
      { shot: 'anita', dur: 4.0, plain: true, caps: [tekst(0.5, 3.2, 'Een frietwagen. Eén standplaats.')] },
      { shot: 'escapade', dur: 3.6, plain: true, voice: [[0.6, V.rijden, 2.03]], lines: [[0.6, 2.1, 'Anita', 'Rijden, niet praten.']] },
      { shot: 'aerial', dur: 6.2, lines: [[0.4, 5.6, 'Oma Trijntje', 'Die bal is gien geld, jong. Die bal is Grunn. En jij: één zin, hè. Niet zeventig jaar.']], voice: [[0.4, V.oma, 5.99]] },
      { shot: 'jelle', dur: 4.0, sfx: [[0.0, 'stoot']] },
      { shot: 'twins', dur: 3.4, plain: true, caps: [plakjes(0.2, 3.1)], sfx: plakjesTicks(0.2, 3.1) },
      { shot: 'night', dur: 3.4 },
      { shot: 'ommeland', dur: 3.5, caps: [tekst(0.3, 3.0, 'Heel Groningen.', 'Voor één eierbal.')], sfx: [[0.0, 'riser']] },
      { shot: 'boat', dur: 3.0 },
      { shot: 'storm', dur: 2.2 },
      { shot: 'kermis', dur: 2.6 },
      { shot: 'tanker', dur: 3.0 },
      { shot: 'chase', dur: 3.7, voice: [[1.0, V.zegniks, 0.71]], lines: [[1.0, 0.9, 'Tammo', 'Ik zeg niks.']], sfx: [[0.0, 'tik'], [0.6, 'tik'], [1.9, 'tik'], [2.5, 'tik']] },
      { shot: 'race', dur: 3.5, sfx: [[0.0, 'tik'], [0.6, 'tik'], [1.7, 'tik'], [2.3, 'tik']] },
      { shot: 'pigeon', dur: 3.0 },
      { shot: 'bijna', dur: 1.3, sfx: [[0.0, 'tik'], [0.65, 'tik']] },
      { shot: 'trauma', dur: 3.0 },
      { shot: 'timelapse', dur: 3.0 },
      { shot: 'tammo', dur: 5.0, plain: true, voice: [[1.8, V.bedoelde, 0.9]], lines: [[1.8, 1.0, 'Tammo', 'Dat bedoelde ik ook.']] },
      { shot: 'plantsoen', dur: 8.0, plain: true },
      { shot: 'berend', dur: 3.6, plain: true, voice: [[1.05, 'audio/voicelines/trailer/berend_kon_minder.mp3', 0.64]], lines: [[1.05, 1.75, 'Bommen Berend', '…Kon minder.']] },
      { shot: 'logo', dur: 5.0, caps: [eind(0.3, 4.2)], sfx: [[0.3, 'stoot']] },
    ],
  },
};

export const planDuration = (cut) => PLAN[cut].beats.reduce((a, b) => a + b.dur, 0);

// Words that must not be on screen or in sound (script: spoilers) and brands.
export const FORBIDDEN = ['vitrine', 'Tige tank', 'briefje', 'kus', 'Bourtange', 'Ik wil bij jou blijven', 'finale', 'wint', 'uitslag', 'Fjord Frituur'];
export const BRANDS = ['Albert Heijn', 'McDonald', 'Coca', 'Google', 'Facebook', 'Instagram', 'Netflix', 'Shell', 'Spotify', 'YouTube'];
const BAD_SHOTS = ['vitrine'];

// Developer messages; empty = fine. opts: shotIds (the ids trailer.js knows),
// has(src) (does the sound file exist).
export function validatePlan(cut, opts = {}) {
  const out = [];
  const plan = PLAN[cut];
  if (!plan) return [`onbekende cut ${cut}`];
  const used = new Set();
  const minShot = 1.2, maxShot = 8.5;
  plan.beats.forEach((b, i) => {
    const what = `${cut} beat ${i + 1} (${b.shot})`;
    if (opts.shotIds && !opts.shotIds.includes(b.shot)) out.push(`${what}: onbekende shot`);
    if (BAD_SHOTS.includes(b.shot)) out.push(`${what}: shot staat niet in de spoilerregels`);
    if (used.has(b.shot)) out.push(`${what}: shot twee keer in één cut`);
    used.add(b.shot);
    if (!(b.dur >= minShot && b.dur <= maxShot)) out.push(`${what}: ${b.dur} s valt buiten ${minShot}-${maxShot}`);
    if (i > 0 && plan.beats[i - 1].dur > 5.5 && b.dur > 5.5) out.push(`${what}: twee lange shots achter elkaar`);
    for (const c of b.caps || []) {
      if (c.at < 0 || c.at + c.dur > b.dur + 1e-6) out.push(`${what}: kaart valt buiten de shot`);
      if (c.kind === 'plakjes' && (!c.strike || c.strike.length !== SLICES || c.strike.some((t) => t > c.dur))) out.push(`${what}: plakjes kloppen niet`);
    }
    for (const [at, , , text] of b.lines || []) if (at < 0 || at > b.dur) out.push(`${what}: ondertitel buiten de shot (${text})`);
    for (const [at, src, d] of b.voice || []) {
      if (at < 0 || at + (d || 0) > b.dur + 1.0) out.push(`${what}: stem ${src} loopt de shot uit`);
      if (opts.has && !opts.has(src)) out.push(`${what}: geluidsbestand ontbreekt: ${src}`);
    }
    for (const [at, kind] of b.sfx || []) {
      if (!SFX_KINDS.includes(kind)) out.push(`${what}: onbekend geluid ${kind}`);
      if (at < 0 || at > b.dur) out.push(`${what}: geluid buiten de shot`);
    }
    const text = JSON.stringify([b.caps, b.lines]);
    for (const w of [...FORBIDDEN, ...BRANDS]) if (new RegExp(String.raw`(^|[^\p{L}])${w}([^\p{L}]|$)`, 'iu').test(text)) out.push(`${what}: verboden woord ${w}`);
  });
  const total = planDuration(cut);
  if (Math.abs(total - plan.target) > 0.6) out.push(`${cut}: ${total.toFixed(1)} s, doel ${plan.target} s`);
  const last = plan.beats[plan.beats.length - 1];
  if (!(last.caps || []).some((c) => c.kind === 'eind')) out.push(`${cut}: sluit niet met de titelkaart`);
  return out;
}
