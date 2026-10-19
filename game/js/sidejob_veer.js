// Bijbaantje veerdienst (#192): de overtocht uit bijbaanregels.js op het Diepenring-water.
// Van de Oosterhaven naar de steiger bij de Poelestraat; binnen 30 m van de steiger geldt
// stapvoets, en je legt aan binnen de marge. Hergebruikt de vaarlijn van de rondvaart.

import { startRonde, stapRonde, rondeResultaat, bijbaanById } from './bijbaanregels.js';
import { LINE } from './sidejob_rondvaart.js';
import { spawnJobBoat, vehicleSpeed } from './sidejobkit.js';

const BOAT = { name: 'boat', len: 7.2, wid: 2.4, maxSpeed: 4.8, accel: 1.5, brake: 2.2, turnRate: 1.0, color: '#2f6a4f', cabin: '#f2ede0' };
const VAN = 34, NAAR = 55, HAVEN_R = 30;
const LAND = [797.92, 420.06];

const MELDING = { harbourSpeed: 'In de haven stapvoets!' };

const regel = bijbaanById('veerdienst');

export const veerdienst = {
  id: 'veerdienst', name: regel.naam, color: '#2f6a4f', glyph: 'rondvaart', boss: 'Kapitein Lauwers', vehicleWord: 'de veerboot', boardText: 'Ga aan boord van de veerboot',
  blurb: regel.blurb, tagline: regel.bedrijf, intro: regel.intro,
  sikkom: (c) => `${regel.naam} (${regel.bedrijf}): ${c.streak} overtochten op tijd`,

  anchor: () => ({ x: LAND[0], y: LAND[1] }),

  start(c) {
    const [nx, ny] = LINE[VAN + 1];
    const [bx, by] = LINE[VAN];
    const boat = spawnJobBoat(c.world, bx, by, Math.atan2(ny - by, nx - bx), BOAT);
    if (!boat) return 'De veerboot ligt niet klaar';
    c.vehicle = boat;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    c.data.ronde = startRonde('veerdienst', c.level);
    c.data.prev = null;
    c.timeLeft = null;
    c.msg(`${regel.bedrijf}: ${regel.intro[0]}`, 3.5);
  },

  update(dt, c) {
    const d = c.data, v = c.vehicle;
    if (!d.ronde || dt <= 0) return;
    const [tx, ty] = LINE[NAAR];
    const dist = Math.hypot(tx - v.x, ty - v.y);
    const speed = vehicleSpeed(v);
    const input = { speed, dist, harbour: dist < HAVEN_R, bump: 0 };
    for (const e of stapRonde(d.ronde, input, dt)) {
      if (MELDING[e.type] && (d.melding || 0) <= 0) { c.msg(MELDING[e.type], 2); d.melding = 4; }
      if (e.type === 'fail') { c.fail(e.why); return; }
      if (e.type === 'done') {
        const r = rondeResultaat(d.ronde);
        if (r.failed) c.fail(r.text);
        else c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
        return;
      }
    }
    d.melding = Math.max(0, (d.melding || 0) - dt);
  },

  view(c) {
    const [tx, ty] = LINE[NAAR];
    const s = c.data.ronde && c.data.ronde.s;
    const rest = s ? Math.max(0, Math.round(s.budget - s.t)) : 0;
    return {
      marker: { x: tx, y: ty },
      progress: `${regel.bedrijf} · nog ${rest} s`,
      goal: { label: 'Naar de steiger Poelestraat', desc: regel.blurb },
    };
  },

  stop() {},
};
