// Travel time per story beat (#97). Pure: lengths in metres in, seconds out.
// A beat is the walk from where the last step ended to where the next one starts;
// its length decides the class, the class decides whether a travel beat (choice
// between riding along, driving yourself and skipping) is mandatory.

// average speeds in m/s on a long trip (provincial roads, not the arcade top speed)
export const CRUISE = { lopen: 1.5, fiets: 5, auto: 22, trekker: 8, bus: 14, trein: 17, ov: 16, boot: 6, lucht: 35 };

// class limits in metres of road, at CRUISE.auto (1 km = 45 s)
export const CLASSES = [
  { id: 'dichtbij', max: 1500, beat: false },
  { id: 'rit', max: 4000, beat: false },
  { id: 'etappe', max: 6500, beat: false },
  { id: 'sprong', max: Infinity, beat: true },
];

// the ceilings from the design, in seconds
export const CAP = { meerijden: 120, zelf: 480, overslaan: 20 };
// the longest stretch of driving in a mission without a cut
export const MAX_DRIVE_S = 480;
// time budget per act in minutes of driving yourself (A1..A5)
export const ACT_BUDGET_MIN = [7, 14, 12, 15, 20];

export function classOf(length) {
  const m = Math.max(0, +length || 0);
  return CLASSES.find((c) => m <= c.max);
}

export function needsBeat(length) {
  return classOf(length).beat;
}

// seconds for `length` metres by `mode` ('auto', 'trein', 'bus', ...)
export function travelSeconds(length, mode = 'auto') {
  const v = CRUISE[mode] || CRUISE.auto;
  return Math.max(0, +length || 0) / v;
}

// A beat from the story data: { km, from, to }. Returns the numbers the choice
// panel and the audits need, per mode that makes sense for the length.
export function beatTimes(length, modes = ['auto']) {
  const t = {};
  for (const m of modes) t[m] = Math.round(travelSeconds(length, m));
  return { length, klasse: classOf(length).id, beat: needsBeat(length), t };
}

// How much of a drive has to be cut to stay under MAX_DRIVE_S: the number of
// pieces a drive of `seconds` should be split into (cut, event or checkpoint between).
export function piecesFor(seconds) {
  return Math.max(1, Math.ceil(seconds / MAX_DRIVE_S));
}

// Total self-driven minutes of an act against its budget (act is 1..5).
export function actBudget(act, legs) {
  const used = legs.reduce((s, l) => s + travelSeconds(l.length, l.mode || 'auto'), 0) / 60;
  const max = ACT_BUDGET_MIN[act - 1] ?? Infinity;
  return { used, max, over: used > max };
}
