// Padel, the rules (#177). Pure maths, no DOM and no THREE: padel.js plays the match and
// scripts/padelrules_test.mjs checks this file in node.
//
// Real padel: a 10 x 20 m court under a net, closed in by glass (to 3 m) and fence (to 4 m);
// the ball may be played off the walls once it has bounced on your side's far half... that is,
// after one bounce on the floor. The serve is underhand: bounce the ball first, hit it below the
// waist and land it in the diagonal service box (behind the service line, 6.95 m from the net);
// two faults are a point. Counting: 15-30-40 and, at 40-40, one golden point. A game is four
// points, a (short) set is SET_GAMES games.
// Court frame as in padel.js: u across (-5..5), v along (-10..10), the net at v = 0.

export const COURT = { W: 10, L: 20, SERVICE: 6.95, NET_H: 0.92, WALL_H: 4, GLASS_H: 3, WAIST: 1.0 };
export const SET_GAMES = 4;
export const CALL = ['0', '15', '30', '40'];

// Counting a point to `team` (0 or 1): { points, games, gameWon, over, golden }.
export function scorePoint({ points, games }, team, gamesToWin = SET_GAMES) {
  const golden = points[0] >= 3 && points[1] >= 3;
  const p = points.slice(), g = games.slice();
  p[team]++;
  const gameWon = golden || p[team] >= 4;
  if (gameWon) { g[team]++; p[0] = 0; p[1] = 0; }
  return { points: p, games: g, gameWon, over: g[team] >= gamesToWin, golden };
}

// What the scoreboard says for a team: 0, 15, 30, 40 and GP at the golden point.
export function pointCall(points, team) {
  if (points[0] >= 3 && points[1] >= 3) return 'GP';
  return CALL[Math.min(3, points[team])];
}

// The serve is hit underhand: after the ball has bounced and no higher than the waist.
export function judgeServeHit({ bounced, z }) {
  if (!bounced) return 'te vroeg';
  if (z > COURT.WAIST) return 'te hoog';
  return 'ok';
}

// The diagonal service box the serve must land in: across from the server's side of the
// centre line, between the net and the service line on the receiving half.
// serverTeam 0 serves from the v < 0 half to the v > 0 half, team 1 the other way.
export function serviceBox(serverU, serverTeam) {
  const right = serverU >= 0;
  const recv = serverTeam === 0 ? 1 : -1;
  const v0 = recv > 0 ? 0 : -COURT.SERVICE, v1 = recv > 0 ? COURT.SERVICE : 0;
  return right ? { u0: -COURT.W / 2, u1: 0, v0, v1 } : { u0: 0, u1: COURT.W / 2, v0, v1 };
}

export function serveInBox(serverU, serverTeam, u, v) {
  const b = serviceBox(serverU, serverTeam);
  return u >= b.u0 && u <= b.u1 && v >= b.v0 && v <= b.v1;
}

// Two faults lose the point: returns { double, faults }.
export function serveFault(faults) {
  return faults + 1 >= 2 ? { double: true, faults: 0 } : { double: false, faults: faults + 1 };
}

// What a wall is at that height: glass below 3 m (a live bounce), fence above (dull, little pace).
export function wallKind(z) {
  return z <= COURT.GLASS_H ? { kind: 'glas', rest: 0.72 } : { kind: 'gaas', rest: 0.4 };
}

// The ball is at a wall. hitter: 0/1; side: the half it is on (0 = v < 0); bounces: floor bounces
// since the last hit. Returns { play: true } or { point: team, why }.
export function judgeWall({ z, side, hitter, bounces }) {
  if (z > COURT.WALL_H) return bounces ? { point: hitter, why: 'Over het glas' } : { point: 1 - hitter, why: 'Uit' };
  if (side !== hitter && bounces === 0) return { point: 1 - hitter, why: 'Direct tegen het glas' };
  return { play: true };
}
