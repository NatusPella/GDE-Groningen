import { accentVan } from './sidejobprofiel.js';
// Uitje: ontspannen rondvaart. The H13 tour without the conflict: the
// rondvaartboot at the Spilsluizen quay, a boat full of tourists, one whole
// round of the Diepenring with Tammo at the microphone and Tessa correcting
// him (rondvaartlines.js, shared with the mission). No Schipper Wiebe, no
// timer, nothing to fail: a calm, bump-free round makes the tip. Runs on the
// side-job core (start badge, E prompt, Ubbo, rounds, pay); the tour itself
// is rondvaartchase.js in relaxed mode. Next to the Rondvaartgids bijbaan
// (sidejob_rondvaart.js: you are the guide, pier to pier, against the clock).

import { spawnJobBoat, vehicleSpeed } from './sidejobkit.js';
import { TOUR_BOAT, rondvaartBerth, startRondvaart, updateRondvaart, stopRondvaart, rondvaartProgress, routeAt } from './rondvaartchase.js';
import { inMapWater, pointInPolygon } from './util.js';

const MOOR_R = 14;
const END_SLACK = 30; // m short of the route's end that counts as round
const DOT_STEP = 40;

let berth = null;
const berthOf = (map) => berth || (berth = rondvaartBerth(map));

export default {
  id: 'rondvaarttour',
  name: 'Ontspannen rondvaart',
  color: accentVan('rondvaarttour'),
  glyph: 'rondvaart',
  boss: 'Tammo',
  kicker: 'Uitje',
  layer: 'rondvaarttour',
  noIntro: true,
  allowWanted: false,
  boardFirst: true,
  vehicleWord: 'de rondvaartboot',
  blurb: 'Een rondje Diepenring met toeristen, zonder haast',
  tagline: 'Rustig varen, Tammo vertelt, Tessa verbetert hem. Geen haast, geen Wiebe.',

  // on the quay a few metres along from the H13 start marker
  anchor(map) {
    const b = berthOf(map);
    const a = b.boat.angle;
    for (const back of [10, 14, 7, -8]) {
      const x = b.start.x - Math.cos(a) * back, y = b.start.y - Math.sin(a) * back;
      if (inMapWater(map, x, y) || map.buildingsNear(x, y, 1).some((q) => pointInPolygon(x, y, q.pts))) continue;
      return { x, y };
    }
    return { x: b.start.x, y: b.start.y };
  },

  start(c) {
    const b = berthOf(c.world.map);
    const boat = spawnJobBoat(c.world, b.boat.x, b.boat.y, b.boat.angle, { ...TOUR_BOAT });
    if (!boat) return 'De rondvaartboot ligt niet klaar';
    c.vehicle = boat;
    c.msg('De rondvaartboot ligt aan de kade. Stap in: de toeristen zitten al klaar.', 3.5);
    return true;
  },

  round(c) {
    c.data.started = false;
    c.data.moor = false;
    c.data.paid = false;
    c.timeLeft = null;
    startRondvaart(c.world, c.vehicle, { relaxed: true });
    if (c.round > 0) c.msg('Nieuwe groep toeristen aan boord. Nog een rondje?', 3);
  },

  needsVehicle: () => true,

  update(dt, c) {
    const { world } = c;
    const d = c.data, v = c.vehicle;
    const onBoat = world.player.inVehicle === v;
    updateRondvaart(dt, world);
    const pr = rondvaartProgress();
    if (!pr) return;
    if (onBoat && !d.started) d.started = true;
    if (!d.moor && pr.s >= pr.length - END_SLACK) {
      d.moor = true;
      c.msg('Rondje gevaren! Leg aan bij de kade van de Spilsluizen.', 3.5);
    }
    if (!d.moor || d.paid || pr.talking) return;
    const b = berthOf(world.map).boat;
    if (onBoat && vehicleSpeed(v) < 1 && Math.hypot(v.x - b.x, v.y - b.y) < MOOR_R) {
      const joy = Math.round(pr.joy);
      const tip = joy >= 85 ? 20 + Math.round((joy - 85) * 0.6) : joy >= 55 ? 8 : 0;
      d.paid = true;
      c.complete({ base: 30 + Math.round(pr.told / 2), tip, text: joy >= 85 ? 'Applaus aan boord!' : joy >= 55 ? 'De toeristen stappen tevreden uit.' : 'De toeristen stappen wat bleekjes uit.', flawless: joy >= 85 });
    }
  },

  view(c) {
    const pr = rondvaartProgress();
    if (!pr) return {};
    const joy = `toeristen ${Math.round(pr.joy)}% blij`;
    if (c.data.moor) {
      const b = berthOf(c.world.map).boat;
      return { marker: { x: b.x, y: b.y }, progress: `Rondje ${c.streak + 1} · ${pr.told}/${pr.stops} verhalen · ${joy}`, goal: { label: 'Kade Spilsluizen', desc: pr.talking ? 'Tammo rondt z\'n verhaal af' : 'Aanleggen: stilliggen bij de kade' } };
    }
    const dots = [];
    for (let k = 1; k <= 4; k++) {
      const q = routeAt(Math.min(pr.length, pr.s + DOT_STEP * k));
      dots.push({ x: q.x, y: q.y, h: 1.4 });
    }
    const ahead = routeAt(Math.min(pr.length, pr.s + DOT_STEP * 5));
    const left = Math.max(0, Math.round((pr.length - pr.s) / 100) / 10);
    return { marker: { x: ahead.x, y: ahead.y }, dots, progress: `Rondje ${c.streak + 1} · ${pr.told}/${pr.stops} verhalen · ${joy}`, goal: { label: 'Rondje Diepenring', desc: c.data.started ? `Nog ${String(left).replace('.', ',')} km. Rustig varen, niet botsen` : 'Stap in de rondvaartboot' } };
  },

  stop(c) {
    stopRondvaart(c.world, 'relaxed');
  },
};


