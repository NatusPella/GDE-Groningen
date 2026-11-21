// Pure model of the benchmark screens (no DOM, no three.js): the choice screen (course, length, commentary), the course lists, the commentary of
// Tammo and Tessa, and the REPORT CARD ("rapportkaart") with percentiles, 1% and 0.1% lows, hitches, the fps graph, grades per subject, the comparison
// and the plain-text export. benchmarkui.js draws it in Design System v3; trailer.js runs the course and feeds the frame times.
// Tests: scripts/benchmarkmodel_test.mjs (and benchstats_test.mjs for the statistics underneath).
import { BENCH_ROUTE, FILM_ROUTE, BENCH_CATEGORIES, HITCH_FRAME_MS, STAND_LABEL, recommendStand, frameStats, compareRuns, compareText, memText } from './benchstats.js';

// --- the choice -----------------------------------------------------------------------------------------------

export const COURSES = {
  film: { id: 'film', label: 'Grunn in een dag', sub: 'Een mini-film: zonsopgang, markt, polder, water, kermis, storm en nacht. Met commentaar van Tammo en Tessa.', course: FILM_ROUTE },
  classic: { id: 'classic', label: 'Klassiek', sub: 'De oorspronkelijke route van eerdere versies. Kies deze om met oude metingen te vergelijken.', course: BENCH_ROUTE },
};
const LENGTHS = {
  volledig: { id: 'volledig', label: 'Volledig', sub: 'Alle scènes, ca. 1 minuut' },
  kort: { id: 'kort', label: 'Kort', sub: 'Een keuze uit de zwaarste scènes, ca. 30 s' },
};
const COURSE_IDS = Object.keys(COURSES);
export const DEFAULT_CHOICE = { course: 'film', length: 'volledig', commentary: true };

// The shots of a choice: [[id, seconds, category]]. The classic course has no short cut (it stays exactly as it was, so it stays comparable).
export function courseFor(course = 'film', length = 'volledig') {
  const def = COURSES[course] || COURSES.film;
  const all = def.course.map(([id, d, cat, short]) => ({ id, d, cat, short: !!short }));
  const pick = def.id === 'film' && length === 'kort' ? all.filter((e) => e.short) : all;
  return pick.map((e) => [e.id, e.d, e.cat]);
}
export const courseSeconds = (course, length) => courseFor(course, length).reduce((a, [, d]) => a + d, 0);
export const normaliseChoice = (c = {}) => {
  const course = COURSES[c.course] ? c.course : DEFAULT_CHOICE.course;
  return { course, length: course === 'classic' ? 'volledig' : LENGTHS[c.length] ? c.length : DEFAULT_CHOICE.length, commentary: c.commentary !== false && course === 'film' };
};

// The choice screen as data: two cards for the course, two for the length, one switch. `lengthLocked` explains why the classic course has no short cut.
export function choiceModel(choice = DEFAULT_CHOICE, { preset = null, presetLabel = '' } = {}) {
  const c = normaliseChoice(choice);
  const mins = (course, length) => { const s = Math.round(courseSeconds(course, length)); return `${s} s`; };
  return {
    title: 'Benchmark',
    lead: 'Meet hoe soepel Grunn op deze computer draait en welke stand daarbij past. Eén scène per keer, elke keer hetzelfde.',
    courses: COURSE_IDS.map((id) => ({ id, label: COURSES[id].label, sub: COURSES[id].sub, selected: c.course === id, meta: `${courseFor(id, id === 'classic' ? 'volledig' : c.length).length} scènes · ${mins(id, id === 'classic' ? 'volledig' : c.length)}` })),
    lengths: Object.values(LENGTHS).map((l) => ({ id: l.id, label: l.label, sub: l.sub, selected: c.length === l.id, disabled: c.course === 'classic' && l.id !== 'volledig' })),
    lengthLocked: c.course === 'classic' ? 'De klassieke route heeft één lengte, zodat oude en nieuwe metingen te vergelijken blijven.' : '',
    commentary: { on: c.commentary, available: c.course === 'film', label: 'Commentaar van Tammo en Tessa', sub: 'Korte ondertitels bij de scènes. Uit telt hetzelfde: de meting verandert er niet door.' },
    preset: preset ? `Huidige stand: ${presetLabel || preset}` : 'Eigen instellingen',
    seconds: Math.round(courseSeconds(c.course, c.length)),
    choice: c,
  };
}

// A pick on the choice screen. The commentary switch is a wish that survives a visit to the classic course (which has no commentary): choosing
// classic and then the film course again must not leave the switch silently off. Returns the new choice and the wish.
export function pickChoice(choice, wish, group, id) {
  const w = group === 'commentary' ? !wish : wish !== false;
  const next = { ...choice, commentary: w };
  if (group === 'course' || group === 'length') next[group] = id;
  return { choice: normaliseChoice(next), wish: w };
}

// The keyboard and controller walk of the choice dialog as a pure step. key: KeyboardEvent.key; index: the focused button (-1: none), count: the
// enabled buttons. Returns null (not ours), { cancel: true }, { focus: n } or { press: n } / { press: null } (Enter on nothing does nothing).
export function choiceKey(key, { index = -1, count = 0, shift = false, repeat = false } = {}) {
  if (key === 'Escape' || key === 'Backspace') return { cancel: true };
  const forward = key === 'ArrowRight' || key === 'ArrowDown' || key === 'Tab';
  const back = key === 'ArrowLeft' || key === 'ArrowUp';
  if (forward || back) {
    if (count < 1) return { focus: null };
    const dir = forward && !shift ? 1 : -1;
    if (index < 0) return { focus: dir > 0 ? 0 : count - 1 };
    return { focus: (index + dir + count) % count };
  }
  if (key === 'Enter' || key === ' ') return { press: !repeat && index >= 0 && index < count ? index : null };
  return null;
}

// --- commentary (Tammo and Tessa, in tone: warm, droog, zomer) ---------------------------------------------------

// shot id -> [speaker, text]; each shows from 0.6 s for 2.8 s ('Anita' is the speaker key of Tessa in the story data).
export const COMMENTARY = {
  sunrise: ['Tammo', 'Zo vroeg is Grunn het mooist.'],
  vismarkt: ['Anita', 'Kijk, een meeuw. Die weet waar het goed is.'],
  escapade: ['Tammo', 'De Escapade. Nog steeds rood.'],
  plantsoen: ['Anita', 'Hier fietsen we straks nog vaak.'],
  ommeland: ['Tammo', 'En dit is allemaal Groningen.'],
  spoor: ['Anita', 'Daar komt de trein. Op tijd, voor één keer.'],
  aerial: ['Tammo', 'Van boven lijkt Grunn op een kaart.'],
  boat: ['Anita', 'Een boot op de gracht. Heel stads.'],
  gH14: ['Tammo', 'En dat is nog niet eens de zee.'],
  kermis: ['Anita', 'Kermis! Ik haal een worst.'],
  chase: ['Tammo', 'Dat klinkt niet als een goed idee.'],
  trauma: ['Anita', 'Daar gaat de heli. Iemand heeft haast.'],
  night: ['Tammo', 'Grunn is ’s nachts ook mooi.'],
  storm: ['Anita', 'Zomerstorm. Hij blijft niet lang.'],
  race: ['Tammo', 'Ik hou me maar even vast.'],
};
const COMMENT_AT = 0.6;
const COMMENT_DUR = 2.8;
// the lines for runTrailer: { shot id: [[at, dur, who, text]] }; empty when the commentary is off or the course is the classic one
export function commentaryFor(choice) {
  const c = normaliseChoice(choice);
  if (!c.commentary) return {};
  const out = {};
  for (const [id] of courseFor(c.course, c.length)) if (COMMENTARY[id]) out[id] = [[COMMENT_AT, COMMENT_DUR, COMMENTARY[id][0], COMMENTARY[id][1]]];
  return out;
}

// --- statistics for the report card -----------------------------------------------------------------------------

const clean = (ms) => (ms || []).filter((x) => Number.isFinite(x) && x > 0);
function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// All the numbers of a run from its frame times in ms: average fps, frame-time percentiles (median, 95th, 99th), the 1% and 0.1% lows (fps of the slowest
// 1% / 0.1% of the frames), the share of frames over the hitch limit and the longest frame.
export function frameReport(msInput) {
  const v = clean(msInput);
  if (!v.length) return null;
  const sorted = v.slice().sort((a, b) => a - b);
  const low = (share) => { const n = Math.max(1, Math.floor(sorted.length * share)); return 1000 / mean(sorted.slice(sorted.length - n)); };
  const slow33 = v.filter((x) => x > HITCH_FRAME_MS).length;
  const big = v.filter((x) => x > 100).length;
  return { frames: v.length, avg: 1000 / mean(v), p50: percentile(sorted, 0.5), p95: percentile(sorted, 0.95), p99: percentile(sorted, 0.99), low1: low(0.01), low01: low(0.001), slow33, slow33Share: slow33 / v.length, over100: big, worst: sorted[sorted.length - 1] };
}

// The fps graph: one point per bucket of `bucketS` seconds of play time (the average fps of that bucket), at most `maxPoints` points. `shots` is
// [{ id, label, ms: [..] }] in course order; a point also carries the shot it is in, so the graph can name the dips.
export function fpsSeries(shots, { bucketS = 0.5, maxPoints = 160 } = {}) {
  const pts = [];
  let t = 0, acc = [], accT = 0, shotId = null, shotLabel = '';
  const flush = () => { if (acc.length) { pts.push({ t: +(t - accT / 2 / 1000).toFixed(2), fps: 1000 / mean(acc), shot: shotId, label: shotLabel }); } acc = []; accT = 0; };
  for (const s of shots || []) {
    for (const x of clean(s.ms)) {
      if (!acc.length) { shotId = s.id; shotLabel = s.label || s.id; }
      acc.push(x); accT += x; t += x / 1000;
      if (accT >= bucketS * 1000) flush();
    }
    flush();
  }
  if (pts.length <= maxPoints) return pts;
  const step = Math.ceil(pts.length / maxPoints);
  const out = [];
  for (let i = 0; i < pts.length; i += step) { const g = pts.slice(i, i + step); out.push({ t: g[Math.floor(g.length / 2)].t, fps: mean(g.map((p) => p.fps)), shot: g[0].shot, label: g[0].label }); }
  return out;
}

// --- the grade ("rapportcijfer", 1 to 10) and the subjects ---------------------------------------------------------

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const r1 = (n) => Math.round(n * 10) / 10;
export const TONES = [[9, 'Uitmuntend', 'goed'], [8, 'Goed', 'goed'], [6.5, 'Voldoende', 'neutraal'], [5.5, 'Matig', 'let-op'], [0, 'Onvoldoende', 'probleem']];
export const toneOf = (cijfer) => { const t = TONES.find(([min]) => cijfer >= min); return { label: t[1], tone: t[2] }; };

// Smooth (avg towards 60), stable (the 1% low towards 45), without hitches (frames over 30 fps). Each is a grade; the end grade is their weighted mean.
export function subjectGrades(rep) {
  if (!rep) return null;
  const vlot = r1(1 + 9 * clamp(rep.avg / 60, 0, 1));
  const stabiel = r1(1 + 9 * clamp(rep.low1 / 45, 0, 1));
  const haperingen = r1(10 - 9 * clamp(rep.slow33Share / 0.1, 0, 1)); // 10 % of the frames over 33 ms is a 1
  return { vlot, stabiel, haperingen, eind: r1(0.4 * vlot + 0.35 * stabiel + 0.25 * haperingen) };
}

// The report card model for the screen and the export. run: { stats, preset, presetFps, course, length, prev (packRun or null), size: [w, h], settings: {...} }
export function reportCard(run) {
  const st = run && run.stats;
  if (!st) return { empty: true, title: 'Benchmark', message: 'Er is niets gemeten. Probeer het nog een keer.' };
  const rep = st.rep || { frames: st.frames || 0, avg: st.avg, p50: st.p50 || 0, p95: st.p95, p99: st.p99 || 0, low1: st.low1, low01: st.low01 || 0, slow33: st.slow33 || 0, slow33Share: st.slow33Share || 0, over100: st.over100 || 0, worst: st.worst || 0 };
  const grades = subjectGrades(rep);
  const tone = toneOf(grades.eind);
  const course = COURSES[run.course] ? run.course : 'classic';
  const cats = Object.entries(st.cats || {}).map(([c, v]) => ({ id: c, label: BENCH_CATEGORIES[c] || c, fps: v.avg, cijfer: r1(1 + 9 * clamp(v.avg / 60, 0, 1)) })).sort((a, b) => a.fps - b.fps);
  const same = run.prev && (run.prev.course || 'classic') === course;
  const diff = same ? compareRuns(run.prev, { avg: rep.avg, low1: rep.low1, p95: rep.p95 }) : null;
  const basis = run.basis || { avg: rep.avg, low1: rep.low1, p95: rep.p95 };
  const rec = recommendStand(basis, run.preset, run.diag || null);
  const hitches = (st.hitches || []).filter((h) => h.slow33 > 0).slice(0, 3).map((h) => ({ id: h.id, frames: h.slow33, share: h.share }));
  return {
    title: 'Rapportkaart',
    course: COURSES[course].label, courseId: course, length: run.length || 'volledig',
    cijfer: grades.eind, ...tone,
    vakken: [
      { id: 'vlot', naam: 'Vlotheid', sub: 'gemiddelde fps', waarde: `${Math.round(rep.avg)} fps`, cijfer: grades.vlot, ...toneOf(grades.vlot) },
      { id: 'stabiel', naam: 'Stabiliteit', sub: 'langzaamste 1% van de beelden', waarde: `${Math.round(rep.low1)} fps`, cijfer: grades.stabiel, ...toneOf(grades.stabiel) },
      { id: 'haperingen', naam: 'Haperingen', sub: 'beelden langzamer dan 30 fps', waarde: `${(rep.slow33Share * 100).toFixed(1).replace('.', ',')}%`, cijfer: grades.haperingen, ...toneOf(grades.haperingen) },
    ],
    feiten: [
      { id: 'avg', n: String(Math.round(rep.avg)), l: 'fps gemiddeld' },
      { id: 'low1', n: String(Math.round(rep.low1)), l: 'laagste 1%' },
      { id: 'low01', n: String(Math.round(rep.low01)), l: 'laagste 0,1%' },
      { id: 'p50', n: r1(rep.p50).toFixed(1).replace('.', ','), l: 'ms mediaan' },
      { id: 'p95', n: r1(rep.p95).toFixed(1).replace('.', ','), l: 'ms p95' },
      { id: 'p99', n: r1(rep.p99).toFixed(1).replace('.', ','), l: 'ms p99' },
      ...(st.memory > 0 ? [{ id: 'heap', n: memText(st.memory), l: 'JS-heap (piek)' }] : []),
    ],
    hitches, hitchTotal: rep.slow33, over100: rep.over100, frames: rep.frames,
    series: st.series || [],
    cats,
    weakest: cats[0] && cats[0].fps < 60 ? cats[0].id : null,
    compare: diff ? { verdict: diff.verdict, pct: diff.pct, text: compareText(diff) } : { verdict: 'geen', pct: 0, text: run.prev && !same ? 'De vorige meting gebruikte een andere route: geen vergelijking.' : 'Eerste meting met deze route op deze computer.' },
    presets: Object.entries(run.presetFps || {}).map(([k, v]) => ({ id: k, label: STAND_LABEL[k] || k, fps: v, current: k === run.preset })),
    advice: { stand: rec.stand, label: STAND_LABEL[rec.stand], change: rec.change, text: [rec.text + (run.describe ? ` ${run.describe(rec.stand)}.` : ''), run.extra || ''].filter(Boolean).join(' '), apply: rec.change !== 'same' || (!run.preset && rec.stand) ? rec.stand : null },
    size: run.size || null,
    remeasured: !!st.remeasured,
    busy: rep.p95 >= 100 || rep.low1 < 8,
  };
}

// A short caption for a screen reader and for the card header: "Rapportcijfer 8,5: Goed. 74 fps gemiddeld, 52 fps in het slechtste 1%."
export const cardSummary = (card) => (card.empty ? card.message : `Rapportcijfer ${String(card.cijfer).replace('.', ',')}: ${card.label}. ${card.feiten[0].n} fps gemiddeld, ${card.feiten[1].n} fps in het slechtste 1%.`);

// --- export (a local file, never a network call) ------------------------------------------------------------------

export const exportName = (date = new Date()) => `gde-benchmark-${date.toISOString().slice(0, 10)}.txt`;
export function exportText(card, { version = '', date = new Date() } = {}) {
  if (card.empty) return card.message;
  const L = [`GDE Groningen: benchmark ${date.toISOString().slice(0, 10)}${version ? ` (versie ${version})` : ''}`, `Route: ${card.course} (${card.length})`, card.size ? `Beeld: ${card.size[0]}×${card.size[1]}` : '', '', `Rapportcijfer: ${String(card.cijfer).replace('.', ',')} (${card.label})`, ''].filter((x, i) => x !== '' || i > 3);
  for (const v of card.vakken) L.push(`${v.naam}: ${v.waarde}, cijfer ${String(v.cijfer).replace('.', ',')}`);
  L.push('');
  for (const f of card.feiten) L.push(`${f.l}: ${f.n}`);
  L.push(`Beelden: ${card.frames}, langzamer dan 30 fps: ${card.hitchTotal}, langzamer dan 10 fps: ${card.over100}`);
  if (card.cats.length) { L.push('', 'Per soort scène:'); for (const c of card.cats) L.push(`- ${c.label}: ${Math.round(c.fps)} fps`); }
  if (card.presets.length) { L.push('', 'Per grafische stand:'); for (const p of card.presets) L.push(`- ${p.label}${p.current ? ' (nu)' : ''}: ca. ${Math.round(p.fps)} fps`); }
  L.push('', `Aanbeveling: ${card.advice.label}`, card.advice.text, '', card.compare.text);
  return L.join('\n') + '\n';
}
