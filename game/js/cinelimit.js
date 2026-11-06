// How long the safety watch gives a running cinematic before it calls it stuck:
// the scene's own declared duration plus a margin, under a fixed cap. There used
// to be only that cap, which cut every train ride longer than about 2.5 km short:
// the ride follows the timetable and can take half an hour, while it declares
// three times its real length. A scene that is meant to last as long as it takes
// says `long: true` and gets its own declared duration as the bound (#496).
export const CINE_MAX_S = 150;
export const CINE_MARGIN_S = 20;

// A cinematic may not hold the game forever: the very first opening has 30 s of wall
// clock to release the world clock, and any scene that does not advance its own clock
// (t stays under 2) is cut after 20 s. cinematics.js is the only owner of both
// time-outs (#635): main.js used to carry a second, 30 s copy that silently failed.
export const OPENING_HANG_MS = 30000;
export const SCENE_HANG_MS = 20000;

// 'opening' = the world clock is still frozen at the first second after 30 s;
// 'frozen' = the scene's own clock did not move after 20 s; null = let it play.
export function cinematicHang({ startedAt, now, worldTime, sceneT }) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return null;
  const age = now - startedAt;
  if (age > OPENING_HANG_MS && Number.isFinite(worldTime) && worldTime <= 1) return 'opening';
  if (age > SCENE_HANG_MS && !(sceneT >= 2)) return 'frozen';
  return null;
}

export function cinematicLimit(c) {
  const declared = (c && Number.isFinite(c.duration) ? c.duration : 10) + CINE_MARGIN_S;
  return c && c.long ? declared : Math.min(declared, CINE_MAX_S);
}
