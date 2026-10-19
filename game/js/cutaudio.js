// Sound for staged cutscenes (#117, #173): a pure plan from a scene def. A
// vehicle prop that drives gets its engine (and a siren for the police, a
// screech when it stops hard), a bike its bell, a pigeon its coo. The host
// (cutscenehost.js) fires the plan through the normal audio events; scenes
// can still add their own { fx: 'sfx' } entries, which win (same name, same
// moment is never doubled). No THREE, no Web Audio: node tests can run it.
import { resolveTime } from './cutscript.js';

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
    for (const s of sounds) out.push({ t: t0 + (s.after || 0), ...(s.name ? { kind: 'fx', name: s.name } : { kind: s.kind }), prop: c.prop, why: p.kind });
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
    out.push({ t: t0 + (c.dur || len / (c.speed || 3)) - 0.5, kind: 'fx', name: 'tyre_screech', prop: c.prop, why: 'politie' });
  }
  return out.sort((a, b) => a.t - b.t);
}
