// Which interiors live right now (epic Interieurs, #1150): the rule of the stream planner for interiors, as a pure function so a
// walk along a street can be simulated in Node (scripts/interior_stress_test.mjs). Inputs: the buildings whose door is within the
// build radius (nearest first) and the interiors that exist; output: which to throw away and which one to build now. At most one
// build per call (a scan every 0.3 s: no frame builds two), never more than `max` alive, a drop only beyond `dropR` (hysteresis
// against a player who stands on the border), never the one the player is in, and a far one makes room for a nearer one.
export const BUILD_R = 20, DROP_R = 32, MAX_LIVE = 2;

// want: [{ id, d }] sorted by d, d <= buildR; live: [{ id, d, inside }]
export function chooseLive(want, live, o = {}) {
  const buildR = o.buildR ?? BUILD_R, dropR = o.dropR ?? DROP_R, max = o.max ?? MAX_LIVE;
  const drops = [];
  for (const l of live) if (l.d > dropR && !l.inside) drops.push(l.id);
  const alive = live.filter((l) => !drops.includes(l.id));
  const have = new Set(alive.map((l) => l.id));
  let build = null;
  for (const w of want) {
    if (have.has(w.id) || w.d > buildR) continue;
    if (alive.length >= max) {
      // make room by dropping the farthest one that is not the one the player is in, if the wanted one is nearer
      let far = null;
      for (const l of alive) if (!l.inside && (!far || l.d > far.d)) far = l;
      if (!far || far.d <= w.d) break;
      drops.push(far.id);
    }
    build = w.id;
    break;
  }
  return { drops, build };
}
