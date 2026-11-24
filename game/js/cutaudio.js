// Sound for staged cutscenes (#117, #173): a pure plan from a scene def. A
// vehicle prop that drives gets its engine (and a siren for the police, a
// screech when it stops hard), a bike its bell, a pigeon its coo. The host
// (cutscenehost.js) fires the plan through the normal audio events; scenes
// can still add their own { fx: 'sfx' } entries, which win (same name, same
// moment is never doubled). No THREE, no Web Audio: node tests can run it.
// On top of that the scene's own sound moments from cutscenesfx.js (per scene id: a car door, a phone, footsteps, a frituur),
// each one the game's own sound for that scenario (sfx/sfxlist.js sfxIdEvent). Every entry carries `ev`, the audio event as the
// host pushes it ({ kind, name?, key?, sub?, auto?, ... }), and optionally `at` ([f, s] local to the scene, like the props).
import { resolveTime } from './cutscript.js';
import { sceneSfx, cueTime, STEP_GAIN } from './cutscenesfx.js';
import { sfxIdEvent } from './sfx/sfxlist.js';
import { SFX_MAP, sfxClips } from './sfx/sfxmap.js';
import { FILE_VARIANTS } from './sfx/steps.js';

export { sceneAmbience } from './cutscenesfx.js';

// prop kind -> what it sounds like when it moves
export const PROP_SOUND = {
  politie: [{ name: 'siren_pass' }, { name: 'car_pass' }],
  bakkie: [{ name: 'car_pass' }],
  auto: [{ name: 'car_pass' }],
  bestelbus: [{ name: 'car_pass' }],
  trekker: [{ name: 'car_pass' }],
  fiets: [{ kind: 'bell', after: 0.4 }],
  duif: [{ kind: 'coo', after: 0.2 }],
};

// a moving cue: path, move or spin at the start of the cue
export function audioPlan(def, lines, duration) {
  const out = [];
  const props = (def && def.props) || {};
  const seen = new Set();
  for (const c of (def && def.cues) || []) {
    if (!c.prop || !(c.path || c.move)) continue;
    const p = props[c.prop];
    const sounds = p && PROP_SOUND[p.kind];
    if (!sounds) continue;
    const t0 = resolveTime(c.t, lines, duration);
    if (t0 == null) continue;
    // a bike crossing in the background gets one bell, not a ring per cue
    const key = c.prop;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const s of sounds) { const ev = s.name ? { kind: 'fx', name: s.name } : { kind: s.kind }; out.push({ t: t0 + (s.after || 0), ...ev, ev, prop: c.prop, why: p.kind }); }
  }
  // the police stopping hard next to the party
  for (const c of (def && def.cues) || []) {
    const p = c.prop && props[c.prop];
    if (!p || p.kind !== 'politie' || !c.path) continue;
    const t0 = resolveTime(c.t, lines, duration);
    if (t0 == null) continue;
    const pts = c.path;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    out.push({ t: t0 + (c.dur || len / (c.speed || 3)) - 0.5, kind: 'fx', name: 'tyre_screech', ev: { kind: 'fx', name: 'tyre_screech' }, prop: c.prop, why: 'politie' });
  }
  // the scene's own moments (cutscenesfx.js); one the scene's own fx already plays at that moment is not doubled
  const own = ((def && def.fx) || []).filter((f) => f.fx === 'sfx').map((f) => ({ t: resolveTime(f.t, lines, duration), kind: f.kind, name: f.name }));
  for (const q of sceneCues(def && def.id, lines, duration)) {
    if (own.some((f) => f.t != null && Math.abs(f.t - q.t) < 0.5 && f.kind === q.kind && (f.name || null) === (q.name || null))) continue;
    out.push(q);
  }
  return out.sort((a, b) => a.t - b.t);
}

// The cues of cutscenesfx.js for a scene id, on these lines: [{ t, kind, name?, ev, at?, why: 'scene', id }], sorted. A cue whose line is
// not in the scene (an edited text) or whose id the game does not have is skipped. Footsteps become n events, one recorded step each.
export function sceneCues(id, lines, duration) {
  const s = sceneSfx(id);
  const out = [];
  if (!s || !Array.isArray(s.cues)) return out;
  s.cues.forEach((c, ci) => {
    const t0 = cueTime(c, lines, duration);
    const base = c && sfxIdEvent(c.id);
    if (t0 == null || !base) return;
    const at = Array.isArray(c.at) && c.at.length >= 2 ? [c.at[0], c.at[1]] : null;
    const extra = {};
    for (const k of ['auto', 'wood', 'strength']) if (c[k] !== undefined) extra[k] = c[k];
    if (base.kind === 'sample' && base.surface) {
      const n = Math.max(1, Math.min(16, Math.round(c.n || 1))), every = Number.isFinite(c.every) ? c.every : 0.5;
      for (let i = 0; i < n; i++) {
        // a different recording each step (the player's feet never play the same one twice in a row either, steps.js)
        const ev = { kind: 'sample', key: `stap_${base.surface}_${(ci * 3 + i) % FILE_VARIANTS}`, gain: (c.gain ?? 1) * STEP_GAIN };
        out.push({ t: t0 + i * every, kind: ev.kind, ev, ...(at ? { at } : {}), why: 'scene', id: c.id });
      }
      return;
    }
    const ev = { ...base, ...extra, ...(c.gain !== undefined ? { gain: c.gain } : {}) };
    out.push({ t: t0, kind: ev.kind, ...(ev.name ? { name: ev.name } : {}), ev, ...(at ? { at } : {}), why: 'scene', id: c.id });
  });
  return out.sort((a, b) => a.t - b.t);
}

// The recordings a scene's cues will ask for (lazy clips of the sound map and footsteps): the host warms them at the start, so the
// first door or ringtone is not silent while it loads. At most 48 keys.
export function warmKeys(plan) {
  const keys = new Set();
  for (const p of plan || []) {
    const e = p && p.ev;
    if (!e) continue;
    if (e.kind === 'sample' && e.key) keys.add(e.key);
    else if (e.kind === 'fx' && e.name && Object.prototype.hasOwnProperty.call(SFX_MAP, e.name)) for (const k of sfxClips(e.name)) keys.add(k);
  }
  return [...keys].slice(0, 48);
}

// the audio event the host pushes for a plan entry, at the world position of the scene (anchor { x, y, facing }; at = [f, s] local)
export function planEvent(p, anchor) {
  const ev = (p && p.ev) || (p && p.name ? { kind: p.kind, name: p.name } : { kind: p && p.kind });
  let x = anchor.x, y = anchor.y;
  if (p && p.at) {
    const c = Math.cos(anchor.facing || 0), s = Math.sin(anchor.facing || 0);
    x = anchor.x + p.at[0] * c - p.at[1] * s;
    y = anchor.y + p.at[0] * s + p.at[1] * c;
  }
  return { ...ev, x, y };
}
