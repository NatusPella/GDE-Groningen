// Spelbot (#312): één stunt, de stuntavond van M01. De bot rijdt op de open zuidkant van de Grote
// Markt een aanloop en zet dan de handrem erop (Space met een volle lock): de slip levert punten,
// de reeks een combo. Zonder rekwisieten (startStunt zet ze op de square niet neer, #312) zijn de
// driftpunten de enige weg naar de vijftienhonderd. bot.page.js krijgt deze regels via run.mjs
// (als window.__botStunt); de spellogica blijft in game/js (stuntavond.js, omverrules.js).
// Tests: scripts/botlogic_test.mjs.
//
// De punten tellen als voortgang: elk nieuw punt boven STUNT.gain is een teken van leven. Zonder
// punten of beweging is de stunt na STUNT.budget een time-out (het rapport zegt waar en hoe lang),
// zodat de reddingsladder verder kan in plaats van een half uur rondjes rijden.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const STUNT = {
  budget: 240,      // zolang zonder nieuwe punten is de stunt op
  gain: 30,         // punten die als voortgang tellen
  runTop: 11.5,     // m/s voor de aanloop (boven 9 m/s begint de drift)
  startSpeed: 10,   // vanaf deze snelheid mag de handrem erop
  slideS: 5.5,      // een slid duurt hooguit zo lang
  arena: 80,        // binnen deze afstand van het doel is de bot op de stuntplek
  anchor: 30,       // binnen deze afstand van het driftpunt begint de slid
  nearStop: 4,      // een wandelaar dichterbij: de slid stopt
  nearStart: 9,     // een wandelaar dichterbij: geen nieuwe slid
  stallS: 3,        // zolang stilstaan in de aanloop is klem
  stallSpeed: 1,
};

// Eén tik van de stunt. s = { x, y, angle, speed, score, target, anchor: {x, y}, walker } waarbij
// walker de afstand tot de dichtstbijzijnde wandelaar is (of Infinity). Geeft:
//   { phase: 'aanloop', steer, throttle, aim }  gas naar het driftpunt
//   { phase: 'glij', steer, throttle, handbrake }  de handrem erop, de andere kant op dan de vorige
//   { phase: 'klem' }                            stilstaan in de aanloop: de pagina neemt een omweg
//   { phase: 'klaar' }                           het doel van de stunt is gehaald
//   { phase: 'timeout', why, forS, score }        geen punten meer: de reddingsladder
export function stuntStep(s, mem = {}, now = 0) {
  const score = Number.isFinite(s.score) ? s.score : null;
  const target = Number.isFinite(s.target) ? s.target : null;
  if (score != null && target != null && score >= target) return { phase: 'klaar', score, target };
  if (mem.t0 == null) { mem.t0 = now; mem.bestScore = score ?? 0; mem.bestAt = now; mem.dir = 1; mem.phase = 'aanloop'; mem.slides = 0; }
  if (score != null && score > mem.bestScore + STUNT.gain) { mem.bestScore = score; mem.bestAt = now; }
  const forS = now - mem.bestAt;
  if (forS > STUNT.budget) return { phase: 'timeout', why: 'stunt levert geen punten meer op', forS, score, target };
  const x = s.x, y = s.y, speed = Math.abs(s.speed || 0);
  const anchor = s.anchor || { x, y };
  const dist = Math.hypot(anchor.x - x, anchor.y - y);
  const walker = Number.isFinite(s.walker) ? s.walker : Infinity;
  if (mem.phase === 'glij' && (now - mem.t > STUNT.slideS || speed < 4.5 || dist > 38 || walker < STUNT.nearStop)) {
    mem.phase = 'aanloop'; mem.t = now; mem.still = null;
  }
  if (mem.phase === 'aanloop' && speed >= STUNT.startSpeed && dist < STUNT.anchor && walker > STUNT.nearStart) {
    mem.phase = 'glij'; mem.t = now; mem.dir = -mem.dir; mem.slides++;
    return { phase: 'glij', steer: mem.dir, throttle: 1, handbrake: true, slides: mem.slides, score };
  }
  if (mem.phase === 'glij') return { phase: 'glij', steer: mem.dir, throttle: 1, handbrake: true, slides: mem.slides, score };
  // de aanloop: stilstaan tegen een bank of hek is geen stilte maar een klem
  if (speed < STUNT.stallSpeed) {
    if (mem.still == null) mem.still = now;
    else if (now - mem.still > STUNT.stallS) { mem.still = null; return { phase: 'klem', x, y, forS: now - mem.still } };
  } else mem.still = null;
  // sturen naar het driftpunt (de pagina telt de bias van wandelaars erbij op)
  const err = Math.atan2(anchor.y - y, anchor.x - x) - (s.angle || 0);
  const wrapped = ((err + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return { phase: 'aanloop', steer: clamp(wrapped * 2, -1, 1), throttle: 1, aim: anchor, dist, score };
}
