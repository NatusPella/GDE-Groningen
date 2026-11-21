// Directing engine for dialogue scenes (cutscene quality system, docs/CUTSCENE-REGIE-21-11.md): from semantic data (who speaks, to whom,
// emotion, kind of line) it picks camera shots on the shot grammar of cutscript.js and the templates of cineshots.js, following the
// regie-bijbel: standard shot / reverse shot, a close-up on emotion, a reaction after a promise or a confession, room after a
// punch line, no shot shorter than MIN_SHOT, no static shot longer than MAX_HOLD, the camera always on one side of the axis.
// Pure (no THREE, no DOM): the host plays the shots, the linter (scripts/cutscene_lint.mjs) judges them.
//
// OPT-IN: a stage spec switches it on with `direct: { lines: [{ on, emotion, kind, to, humor }], wide? }`
// (cutscenes_akte1.js missionScene). No existing scene has it; existing staging is never rewritten.
//
//   const { shots, humor, stats } = directDialogue({
//     actors: ['tammo', 'tessa'],                        // the people on stage that talk (order = sides of the axis)
//     lines: [{ speaker: 'tammo', to: 'tessa', emotion: 'neutral', kind: 'line', at: 0.6, dur: 2.4, text: '...', humor: false }, ...],
//     wide: { from: [..], to: [..], look: '..', fov: 48 } // optional establishing dolly (shown until the end of the first line)
//   });
//
// emotion: neutral | joy | angry | sad | tender | shock | whisper;  kind: line | question | promise | confession | punch
// Humor: a line with `humor: true` or kind 'punch' only gets room (a reaction) and the label `humor-review`; its text and timing
// are never touched, and whether it is funny is not judged here (a panel does that, scripts/cutscene_review_pack.mjs).
import { placeTemplate, shiftTime } from './cineshots.js';

export const MIN_SHOT = 1.2; // s: a shot shorter than this is a flicker
export const MAX_HOLD = 7; // s: a still shot longer than this gets a second frame
const REACTION_HOLD = 1.3; // s: the listener stays in frame after a promise, confession or punch line
export const EMOTIONS = ['neutral', 'joy', 'angry', 'sad', 'tender', 'shock', 'whisper'];
export const KINDS = ['line', 'question', 'promise', 'confession', 'punch'];

const r2 = (n) => Math.round(n * 100) / 100;
const STRONG = { shock: 'schrikNadering', sad: 'langzameZoom', tender: 'langzameZoom', whisper: 'closeGezicht', joy: 'closeGezicht', angry: 'closeGezicht' };

// The camera angle (degrees from the face, cineshots.js) of a close-up template. The two people face each other, so the same sign would put
// the camera on opposite sides of the axis for the two of them: the sign follows the person's side (the camera stays on one side).
const ANGLE = { closeGezicht: 45, langzameZoom: 50, schrikNadering: 30, wachtOpReactie: 45 };
const angleFor = (tpl, side) => -side * (ANGLE[tpl] || 40);

// The template a line asks for, or null for the plain shot/reverse-shot.
export function templateFor(line) {
  if (line.kind === 'confession') return 'langzameZoom';
  if (line.kind === 'promise') return 'closeGezicht';
  return STRONG[line.emotion] || null;
}

export function directDialogue({ lines, actors = [], wide = null } = {}) {
  const notes = [];
  if (!Array.isArray(lines) || !lines.length) return { shots: [], humor: [], notes: ['geen regels: niets te regisseren'], stats: { shots: 0, reverse: 0, closeUps: 0, reactions: 0 } };
  const ids = actors.length ? actors : [...new Set(lines.map((l) => l.speaker).filter(Boolean))];
  const side = (id) => (ids.indexOf(id) % 2 === 0 ? 1 : -1); // the same person is always on the same side: the camera never crosses the axis
  const listenerOf = (l, i) => {
    if (l.to) return l.to;
    for (let k = i + 1; k < lines.length; k++) if (lines[k].speaker && lines[k].speaker !== l.speaker) return lines[k].speaker;
    for (let k = i - 1; k >= 0; k--) if (lines[k].speaker && lines[k].speaker !== l.speaker) return lines[k].speaker;
    return ids.find((x) => x !== l.speaker) || null;
  };
  const at = (i, dt = 0) => lines[i].at + dt;
  const plan = []; // { t (s), key (cutscript time), shot, tag, strong }
  const push = (i, dt, shots, tag, strong = false) => { for (const s of shots) plan.push({ t: at(i, dt) + (s.dt || 0), key: shiftTime(`L${i}`, dt + (s.dt || 0)), shot: s, tag, strong }); };
  const humor = [];
  const stats = { shots: 0, reverse: 0, closeUps: 0, reactions: 0 };

  // the opening: an establishing dolly when given (until the end of the first line), else straight onto the pair
  let first = 0;
  if (wide) {
    plan.push({ t: 0, key: 0, shot: { shot: 'dolly', from: wide.from, to: wide.to, look: wide.look, fov: wide.fov || 48 }, tag: 'wide', strong: false });
    first = lines[0].dur >= MIN_SHOT * 2 ? 1 : 2; // the first line is covered by the wide
  } else {
    const a = lines[0].speaker, b = listenerOf(lines[0], 0);
    if (a && b) plan.push({ t: 0, key: 0, shot: placeTemplate('tweeshot', { a, b }, 0)[0], tag: 'two', strong: false });
    else plan.push({ t: 0, key: 0, shot: { shot: 'orbit', target: `mid:${ids[0]},${ids[1] || ids[0]}@1.2`, radius: 6.5, start: 200, sweep: 40, h0: 3, h1: 2.4, look: `mid:${ids[0]},${ids[1] || ids[0]}@1.2`, fov: 46 }, tag: 'wide', strong: false });
    first = 1; // line 0 is covered by the two-shot
  }

  let lastSpeaker = lines[0] && first >= 1 ? lines[0].speaker : null;
  let reactionDue = 0; // earliest time the next shot may start (room after a punch line)
  for (let i = 0; i < lines.length; i++) {
    const covered = i < first; // the opening shot already covers this line: only its humor label and its reaction are still ours
    const l = lines[i];
    if (!l.speaker) continue; // a voice off screen (radio, phone) is covered by the previous shot
    const listener = listenerOf(l, i);
    const tpl = templateFor(l);
    const isPunch = l.kind === 'punch' || l.humor === true;
    if (isPunch) humor.push({ line: i, label: 'humor-review', text: l.text });
    const dtStart = Math.max(0, reactionDue - at(i));
    if (covered) { lastSpeaker = l.speaker; } else if (tpl && listener) {
      push(i, dtStart, placeTemplate(tpl, { target: l.speaker, angle: angleFor(tpl, side(l.speaker)) }, 0), tpl, true);
      stats.closeUps++;
    } else if (l.speaker !== lastSpeaker || l.dur > MAX_HOLD - 1 || i === first) {
      if (listener) {
        const s = side(l.speaker);
        push(i, dtStart, [{ shot: 'ots', from: listener, target: l.speaker, dist: 1.7, side: r2(0.55 * s), fov: 34 }], 'reverse');
        stats.reverse++;
      } else push(i, dtStart, [{ shot: 'cut', at: [-2.4, 0.6, 1.7], look: l.speaker, fov: 38 }], 'single');
    }
    lastSpeaker = l.speaker;
    // room after a promise, a confession or a punch line: cut to the listener while the line ends and hold on his face
    const wantsReaction = ['promise', 'confession', 'punch'].includes(l.kind) || isPunch;
    if (wantsReaction && listener && i + 1 < lines.length) {
      const start = Math.max(0.5, l.dur - REACTION_HOLD * 0.6);
      const react = { ...placeTemplate('wachtOpReactie', { target: listener, angle: angleFor('wachtOpReactie', side(listener)) }, 0)[0], offscreen: 'reaction: the speaker is heard, the listener is seen' };
      plan.push({ t: at(i, start), key: shiftTime(`L${i}`, r2(start)), shot: react, tag: 'reaction', strong: true });
      reactionDue = at(i, start) + REACTION_HOLD;
      stats.reactions++;
    }
  }

  // sort, then keep every shot at least MIN_SHOT long: the weaker of two close shots goes (a strong one wins over a plain reverse)
  plan.sort((a, b) => a.t - b.t);
  const kept = [];
  for (const p of plan) {
    const prev = kept[kept.length - 1];
    if (prev && p.t - prev.t < MIN_SHOT && p.t > 0.001) {
      if (p.strong && !prev.strong && prev.t > 0.001) { kept[kept.length - 1] = p; notes.push(`shot ${prev.tag} op ${r2(prev.t)} s weggelaten: te kort voor het shot ${p.tag}`); } else notes.push(`shot ${p.tag} op ${r2(p.t)} s weggelaten: minder dan ${MIN_SHOT} s na het shot ${prev.tag}`);
      continue;
    }
    kept.push(p);
  }
  // a still shot held too long gets a second frame in the middle (a slow push on the pair)
  const end = lines[lines.length - 1].at + lines[lines.length - 1].dur;
  const extra = [];
  kept.forEach((p, k) => {
    const next = kept[k + 1] ? kept[k + 1].t : end;
    const still = !['dolly', 'orbit', 'push', 'crane'].includes(p.shot.shot) || p.tag === 'reverse';
    if (still && next - p.t > MAX_HOLD) {
      const mid = p.t + (next - p.t) / 2;
      const li = lines.findIndex((l, i) => mid >= l.at && (i + 1 >= lines.length || mid < lines[i + 1].at));
      const dt = li >= 0 ? r2(mid - lines[li].at) : 0;
      const a = ids[0], b = ids[1] || ids[0];
      extra.push({ t: mid, key: li >= 0 ? shiftTime(`L${li}`, dt) : r2(mid), shot: placeTemplate('tweeshot', { a, b }, 0)[0], tag: 'refresh', strong: false });
      notes.push(`tweeshot toegevoegd op ${r2(mid)} s: het shot ${p.tag} zou ${r2(next - p.t)} s stilstaan`);
    }
  });
  const all = [...kept, ...extra].sort((a, b) => a.t - b.t);
  const shots = all.map((p) => { const { dt, t, ...rest } = p.shot; return { t: p.key, ...rest }; });
  // times must rise strictly (cutscript.js): an equal key moves by a hair
  for (let i = 1; i < all.length; i++) if (all[i].t <= all[i - 1].t) { all[i].t = all[i - 1].t + 0.05; shots[i].t = shiftTime(shots[i].t, 0.05); }
  stats.shots = shots.length;
  return { shots, humor, notes, stats };
}
