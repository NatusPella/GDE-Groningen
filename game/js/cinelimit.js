// How long the safety watch gives a running cinematic before it calls it stuck:
// the scene's own declared duration plus a margin, under a fixed cap. There used
// to be only that cap, which cut every train ride longer than about 2.5 km short:
// the ride follows the timetable and can take half an hour, while it declares
// three times its real length. A scene that is meant to last as long as it takes
// says `long: true` and gets its own declared duration as the bound (#496).
export const CINE_MAX_S = 150;
export const CINE_MARGIN_S = 20;

export function cinematicLimit(c) {
  const declared = (c && Number.isFinite(c.duration) ? c.duration : 10) + CINE_MARGIN_S;
  return c && c.long ? declared : Math.min(declared, CINE_MAX_S);
}
