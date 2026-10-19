// Bijbaantjes uit bijbaanregels.js (#192) op het sidejob-contract van sidejobs.js.
// De regels zijn puur; deze adapter zet de plekken en het voertuig neer, voedt de regels
// met snelheid, remvertraging en bochtkracht, en vertaalt hun gebeurtenissen naar
// meldingen, HUD en uitbetaling. Zes banen rijden (fietssoep, taxinacht, balenrit,
// berging, schoolrit, melkrit). Veerdienst, strandpost, kermisdraai en brugdienst
// hebben een eigen boot, quad of paneel nodig en staan hier nog niet in.

import { startRonde, stapRonde, rondeResultaat, bijbaanById, DOELEN } from './bijbaanregels.js';
import { STREKEN } from './regioleven.js';
import { wgsToWorld } from './rdnew.js';
import { spawnJobVehicle, randomStreetPoint, vehicleSpeed } from './sidejobkit.js';
import { TRACTOR_MODEL } from './vehicle.js';
import { ankerMetWeg, STAD } from './bijbaananker.js';

const MODELS = {
  fiets: { kind: 'bike' },
  auto: { kind: 'car', model: { name: 'sedan', len: 4.3, wid: 1.8, maxSpeed: 33, accel: 9, brake: 24, turnRate: 2.6, color: '#1b1c1f' } },
  // getter: vehicle.js importeert (via een kring) dit bestand, TRACTOR_MODEL bestaat bij het laden nog niet
  get trekker() { return { kind: 'car', model: { ...TRACTOR_MODEL, color: '#3f7d3a' } }; },
  sleepwagen: { kind: 'car', model: { name: 'van', len: 5.4, wid: 2.1, maxSpeed: 26, accel: 6, brake: 18, turnRate: 1.9, color: '#c9541e' } },
  bus: { kind: 'bus', model: { name: 'bus', len: 11.2, wid: 2.55, maxSpeed: 18, accel: 3.4, brake: 10, turnRate: 1.1, color: '#e0b020' } },
  tankwagen: { kind: 'car', model: { name: 'van', len: 6.2, wid: 2.2, maxSpeed: 24, accel: 5, brake: 16, turnRate: 1.7, color: '#e8e6e0' } },
};

// Waar de baan begint: het hart van de streek, of de binnenstad.
const regioPunt = (regio) => {
  const s = STREKEN.find((r) => r.id === regio);
  if (!s) return STAD;
  const [x, y] = wgsToWorld(s.at[0], s.at[1]);
  return { x, y };
};

const MELDING = {
  knoei: 'Pas op, je knoeit soep!', drop: 'Bezorgd!', baalWeg: 'Een baal is van de wagen gegleden.', aangehaakt: 'Aangehaakt, sleep rustig naar de garage.',
  tehard: 'Rustig rijden, de kinderen zitten in de bus.', hardremmen: 'Zachter remmen!', halte: 'Kinderen uitgestapt.', boerderij: 'Melk geladen.',
};

function maak(id, glyph, kleur, baas) {
  const regel = bijbaanById(id);
  const doelen = DOELEN[id];
  const voertuig = () => MODELS[regel.voertuig];
  return {
    id, name: regel.naam, color: kleur, glyph, boss: baas, vehicleWord: 'je voertuig',
    blurb: regel.blurb, tagline: regel.bedrijf, intro: regel.intro,
    sikkom: (c) => `${regel.naam} (${regel.bedrijf}): ${c.streak} ritten zonder klachten`,

    anchor(map) {
      return ankerMetWeg(map, regioPunt(regel.regio), voertuig().kind !== 'bike');
    },

    start(c) {
      const v = spawnJobVehicle(c.world, c.spot.x, c.spot.y, voertuig());
      if (!v) return 'Geen voertuig beschikbaar';
      c.vehicle = v;
      return true;
    },

    needsVehicle: () => true,

    round(c) {
      const d = c.data;
      d.ronde = startRonde(id, c.level);
      d.doelen = [];
      const n = doelen.total(d.ronde.s);
      let x = c.vehicle.x, y = c.vehicle.y;
      for (let k = 0; k < n; k++) {
        const p = randomStreetPoint(c.world.map, x, y, 220, 520, { drivable: voertuig().kind !== 'bike' }) || { x: x + 260, y };
        d.doelen.push({ x: p.x, y: p.y });
        x = p.x; y = p.y;
      }
      d.prev = null;
      c.timeLeft = 120 + n * 90;
      c.msg(`${regel.bedrijf}: ${regel.intro[0]}`, 3.5);
    },

    timeout: () => 'de klok liep af',

    update(dt, c) {
      const d = c.data, v = c.vehicle;
      if (!d.ronde || dt <= 0) return;
      const s = d.ronde.s;
      const doel = d.doelen[Math.min(doelen.at(s), d.doelen.length - 1)];
      const speed = vehicleSpeed(v);
      const prev = d.prev || { speed, angle: v.angle };
      const turn = Math.abs(Math.atan2(Math.sin(v.angle - prev.angle), Math.cos(v.angle - prev.angle))) / dt;
      d.prev = { speed, angle: v.angle };
      const input = { speed, decel: Math.max(0, (prev.speed - speed) / dt), lat: speed * turn, dist: Math.hypot(doel.x - v.x, doel.y - v.y), bump: 0 };
      for (const e of stapRonde(d.ronde, input, dt)) {
        if (MELDING[e.type] && e.type !== 'done') c.msg(MELDING[e.type], 2.2);
        if (e.type === 'fail') { c.fail(e.why); return; }
        if (e.type === 'done') {
          const r = rondeResultaat(d.ronde);
          if (r.failed) c.fail(r.text);
          else c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
          return;
        }
      }
    },

    view(c) {
      const d = c.data;
      if (!d.ronde) return {};
      const i = Math.min(doelen.at(d.ronde.s), d.doelen.length - 1);
      const doel = d.doelen[i];
      return {
        marker: { x: doel.x, y: doel.y },
        progress: `${regel.bedrijf} · ${Math.min(i + 1, d.doelen.length)}/${d.doelen.length}`,
        goal: { label: id === 'berging' && !d.ronde.s.hooked ? 'Naar het wrak' : 'Naar het doel', desc: regel.blurb },
      };
    },

    stop() {},
  };
}

export const fietssoep = maak('fietssoep', 'bezorger', '#e4572e', 'Keukenchef Zoep');
export const taxinacht = maak('taxinacht', 'taxi', '#f2b705', 'Centrale Taxi Noordoost');
export const balenrit = maak('balenrit', 'bezorger', '#7a9a3a', 'Boer Hooiland');
export const berging = maak('berging', 'taxi', '#c9541e', 'Bergingsmeester Hunsingo');
export const schoolrit = maak('schoolrit', 'bus', '#e0b020', 'Schoolvervoer Westerkwartier');
export const melkrit = maak('melkrit', 'bus', '#5aa9d6', 'Zuivel Noordpolder');
export const BIJBAAN_JOBS = [fietssoep, taxinacht, balenrit, berging, schoolrit, melkrit];
