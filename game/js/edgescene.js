// The turn-back scenes at the edge of the world (docs/PROVINCIE-PLAN.md 2.24,
// issue #6). worldedge.js says WHAT the edge does at a spot (warn, back);
// this is the scene that goes with it: a visible, in-world reason to turn
// round (a border post with a boom, a patrol boat, a bank of fog, a hunebed
// across the road) and the way the player is put back, facing inside. Pure
// logic, no DOM and no three.js: the renderer builds the props from the
// plan, the HUD shows the lines. No invisible wall: the props stand in
// front of the player, a few seconds before the turn-back.
//
//   createEdgeWatch() -> state
//   stepEdgeWatch(state, rule, dt, { skip, now }) -> null | event
//     { type: 'warn', rule } | { type: 'scene', plan } | { type: 'back', plan, spot }
//   scenePlan(rule, x, y) -> { edge, props, lines, duration, spot }
//
// A scene is skippable (`skip`): the turn-back happens at once. After a
// turn-back the edge stays quiet for COOL_S so nobody is caught in a loop.

export const SCENE_S = 4.5; // s from the first prop to the turn-back
export const COOL_S = 12; // s after a turn-back without a new scene
export const WARN_GAP_S = 20; // s between two warnings of the same edge
export const AHEAD_M = 28; // m in front of the player (towards the outside) where the scene stands
export const CLEAR_M = 120; // m the player is put back inside the warning band

// What stands at the edge per kind. Props sit relative to a point AHEAD_M
// beyond the player: `out` metres further outside, `along` metres sideways
// (left of the way back).
// The first prop is the one the camera should look at.
export const EDGE_SCENES = {
  duitsland: { props: [{ kind: 'rand_grenspost', out: 6, along: 0 }, { kind: 'rand_slagboom', out: 4, along: 0 }, { kind: 'rand_bord', out: 12, along: -4 }], lines: ['Een slagboom zakt. Het hokje van de Grenswacht staat op de weg.'] },
  eems: { props: [{ kind: 'rand_grenswachtboot', out: 25, along: 0 }, { kind: 'rand_boei', out: 15, along: -12 }, { kind: 'rand_boei', out: 15, along: 12 }], lines: ['De Grenswacht ligt dwars op de vaargeul.'] },
  wad: { props: [{ kind: 'rand_mistbank', out: 60, along: 0 }, { kind: 'rand_kustwachtboot', out: 30, along: 18 }], lines: ['Een muur van mist rolt over het water. De stroming trekt aan je.'] },
  schier: { props: [{ kind: 'rand_veerboot', out: 30, along: 0 }, { kind: 'rand_boei', out: 15, along: -10 }, { kind: 'rand_boei', out: 15, along: 10 }], lines: ['De veerboot naar het eiland vaart dwars voor je langs.'] },
  rottum: { props: [{ kind: 'rand_natuurbord', out: 10, along: 0 }, { kind: 'rand_boei', out: 16, along: -9 }, { kind: 'rand_boei', out: 16, along: 9 }, { kind: 'rand_mistbank', out: 70, along: 0 }], lines: ['Op de zandplaat liggen zeehonden te zonnen. Niet storen.'] },
  friesland: { props: [{ kind: 'rand_wegversperring', out: 8, along: 0 }, { kind: 'rand_neef', out: 10, along: 3 }, { kind: 'rand_neef', out: 10, along: -3 }], lines: ['Twee neven staan naast een hek met een schaap.'] },
  drenthe: { props: [{ kind: 'rand_hunebed', out: 8, along: 0 }, { kind: 'rand_bord', out: 12, along: 5 }], lines: ['Een hunebed ligt dwars over de weg.'] },
  lucht: { props: [{ kind: 'rand_mistbank', out: 80, along: 0 }], lines: ['De radio kraakt. De autopiloot pakt de knuppel.'] },
  // the land borders over water (worldedge.js friesland_water ...): a boat across the channel and two buoys
  friesland_water: { props: [{ kind: 'rand_kustwachtboot', out: 30, along: 0 }, { kind: 'rand_boei', out: 15, along: -12 }, { kind: 'rand_boei', out: 15, along: 12 }], lines: ['Een boot van de Friese vaarwacht ligt dwars op de vaargeul.'] },
  drenthe_water: { props: [{ kind: 'rand_boei', out: 12, along: 0 }, { kind: 'rand_boei', out: 15, along: -10 }, { kind: 'rand_boei', out: 15, along: 10 }, { kind: 'rand_mistbank', out: 60, along: 0 }], lines: ['Een boei met een bord ligt dwars op het water.'] },
  duitsland_water: { props: [{ kind: 'rand_grenswachtboot', out: 25, along: 0 }, { kind: 'rand_boei', out: 15, along: -12 }, { kind: 'rand_boei', out: 15, along: 12 }], lines: ['De Grenswacht ligt dwars op de vaargeul.'] },
};

// The plan for a turn-back at (x, y): world positions of the props, the lines
// (the scene's own, then the rule's text) and the spot the player returns to,
// facing inside.
export function scenePlan(rule, x, y) {
  const sc = EDGE_SCENES[rule.edge] || EDGE_SCENES.wad;
  const fx = Math.cos(rule.face), fy = Math.sin(rule.face); // towards inside
  const lx = -fy, ly = fx; // left of the way back
  const ox = x - fx * AHEAD_M, oy = y - fy * AHEAD_M;
  const props = sc.props.map((p) => ({ kind: p.kind, x: ox - fx * p.out + lx * p.along, y: oy - fy * p.out + ly * p.along, angle: rule.face }));
  const back = Math.max(0, (rule.d || 0) - (rule.warnAt || 0)) + CLEAR_M;
  return {
    edge: rule.edge,
    props,
    lines: sc.lines.concat(rule.text),
    duration: SCENE_S,
    spot: { x: x + fx * back, y: y + fy * back, angle: rule.face },
  };
}

export function createEdgeWatch() {
  return { phase: 'idle', t: 0, cool: 0, plan: null, warnAt: {} };
}

// One step. rule: edgeRule(...) of the player's spot (or null). Returns the
// event of this step, if any.
export function stepEdgeWatch(st, rule, dt, opts = {}) {
  const now = opts.now !== undefined ? opts.now : (st.clock = (st.clock || 0) + dt);
  if (st.cool > 0) st.cool = Math.max(0, st.cool - dt);
  if (st.phase === 'scene') {
    st.t += dt;
    if (!opts.skip && st.t < st.plan.duration) return null;
    const plan = st.plan;
    st.phase = 'idle'; st.plan = null; st.t = 0; st.cool = COOL_S;
    return { type: 'back', plan, spot: plan.spot };
  }
  if (!rule || st.cool > 0) return null;
  if (rule.action === 'back') {
    st.phase = 'scene'; st.t = 0;
    st.plan = scenePlan(rule, opts.x !== undefined ? opts.x : rule.at.x, opts.y !== undefined ? opts.y : rule.at.y);
    return { type: 'scene', plan: st.plan };
  }
  if (rule.action === 'warn' && now - (st.warnAt[rule.edge] ?? -Infinity) >= WARN_GAP_S) {
    st.warnAt[rule.edge] = now;
    return { type: 'warn', rule };
  }
  return null;
}
