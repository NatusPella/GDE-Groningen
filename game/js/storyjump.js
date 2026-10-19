// De sprong naar een verhaalstap (story.js devJumpTo, #249): wat er eerst moet stoppen en waar de speler komt te staan.
// Puur, zodat scripts/storyjump_test.mjs het zonder spel kan testen.
const fin = (v) => Number.isFinite(v);

// state: { missionActive, pigeon, heliRun, inVehicle }. Volgorde: eerst de missie weg (die geeft het voertuig vrij),
// dan duif en helikopterrun, en als laatste uit het voertuig (ook als dat vliegt of vaart).
export function jumpPrep(state = {}) {
  const todo = [];
  if (state.missionActive) todo.push('abortMission');
  if (state.pigeon) todo.push('stopPigeon');
  if (state.heliRun) todo.push('abortHeli');
  if (state.inVehicle) todo.push('exitVehicle');
  return todo;
}

// Waar de speler komt: de startplek van de missie (def.start), anders de gids van de stap. dist: afstand tot die plek;
// 0 = erop (de missie start dan zelf), anders op een willekeurige hoek op dist meter. rand: () => 0..1.
export function jumpSpot(def, guide, { dist = 12, rand = Math.random } = {}) {
  const base = def && def.start && fin(def.start.x) && fin(def.start.y) ? def.start : guide && fin(guide.x) && fin(guide.y) ? guide : null;
  if (!base) return null;
  const a = rand() * Math.PI * 2;
  return { x: base.x + Math.cos(a) * dist, y: base.y + Math.sin(a) * dist, source: def && base === def.start ? 'missie' : 'gids' };
}
