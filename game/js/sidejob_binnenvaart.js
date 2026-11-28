// Binnenvaartschip De Drie Zusters (#1376, W3): de wereldkant van binnenvaartrules.js.
// Een bijbaan op het sidejob-contract van sidejobs.js: de speler stapt aan de thuiskade bij het rustpunt
// aan het Van Starkenborghkanaal aan boord van een vaste spits, laadt, vaart naar een andere kade en
// legt rustig aan. Het schip is een opdrachtschip (spawnJobBoat: missionCar), dus het AI-verkeer in
// vehicle/boatwater.js telt het niet mee en ruimt het niet op.
// NOG NIET AANGEMELD: de baan staat bewust niet in SIDE_JOBS (sidejobs.js), want loopbaan_test eist voor elke
// bijbaan een vak in BAAN_VAK (loopbaan.js) en die file is in deze ronde van een ander. Koppelen = in sidejobs.js
// `import { binnenvaart }` en in SIDE_JOBS zetten, in loopbaan.js `binnenvaart: 'water'` in BAAN_VAK,
// een START-plek en VAARDIGHEDEN.water bij niveau 4. De punten en het loon gaan dan naar het vak Water.
// Samen spelen: dit is een baan van wie het spel opende (de wereld); een gast ziet het doel en de
// voortgang via coopbijbaan.js en doet niet zelf mee (geen regel in BIJBAAN_REGELS) met de gewone
// melding dat deze baan alleen in je eigen spel is. De bemanningsrollen komen met W6.

import { SCHIP, REDERIJ, THUIS, KADES, kadeById, maakOvertocht, kiesOvertocht, stapOvertocht, uitslagVan, doelVan, voortgangTekst } from './binnenvaartrules.js';
import { kadePunt } from './sidejob_zeeschip.js';
import { spawnJobBoat, vehicleSpeed } from './sidejobkit.js';
import { BOAT_KINDS } from './boattypes.js';

const MELDING = {
  tehard: 'Rustig bij de kade: een schip van 38 meter stop je niet zomaar.',
  geladen: 'Geladen. Los de trossen en vaar naar de volgende kade.',
  aangelegd: 'Aangelegd. Even blijven liggen terwijl er gelost wordt.',
};

// (het id staat als constante: loopbaan_test leest elke `id: '...'` in sidejob_*.js als aangemelde baan en eist er een BAAN_VAK-regel bij)
export const BINNENVAART_ID = 'binnenvaart';
export const binnenvaart = {
  id: BINNENVAART_ID,
  name: `${SCHIP.naam}`,
  color: '#2b3f55',
  glyph: 'rondvaart',
  boss: 'De kadewachter',
  vehicleWord: 'het binnenvaartschip',
  boardText: `Ga aan boord van ${SCHIP.naam}`,
  blurb: 'Een binnenvaartschip van kade naar kade over het Van Starkenborghkanaal brengen',
  tagline: REDERIJ,
  intro: [`${REDERIJ}: ${SCHIP.naam} ligt klaar aan de kade bij het rustpunt.`, 'Laad, vaar naar de volgende kade en leg rustig aan. Een schip van 38 meter stop je niet zomaar.'],
  sikkom: (c) => `${REDERIJ}: ${c.streak} overtochten zonder klacht`,

  anchor: (map) => kadePunt(map, kadeById(THUIS)),

  start(c) {
    const o = kiesOvertocht(c.level, 0, THUIS);
    const s = o && maakOvertocht(o.id, c.level);
    if (!s) return 'De overtocht begint niet';
    const boot = spawnJobBoat(c.world, c.spot.x, c.spot.y, s.koers, BOAT_KINDS.spits);
    if (!boot) return `${SCHIP.naam} ligt niet klaar`;
    boot.fixedName = SCHIP.naam;
    boot.jobShip = SCHIP.id;
    c.vehicle = boot;
    c.data.beurt = 0;
    c.data.vanKade = THUIS;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data;
    const o = kiesOvertocht(c.level, d.beurt || 0, d.vanKade || THUIS);
    const s = o && maakOvertocht(o.id, c.level);
    if (!s) return;
    d.overtocht = s;
    d.beurt = (d.beurt || 0) + 1;
    c.timeLeft = s.budget;
    c.msg(`${REDERIJ}: ${kadeById(s.van).naam} naar ${kadeById(s.naar).naam}.`, 3.5);
  },

  update(dt, c) {
    const d = c.data, v = c.vehicle, s = d.overtocht;
    if (!s || !v || dt <= 0) return;
    for (const e of stapOvertocht(s, { x: v.x, y: v.y, speed: vehicleSpeed(v) }, dt)) {
      if (e.type === 'tehard' && !d.melding) { c.msg(MELDING.tehard, 2.4); d.melding = 4; }
      if (e.type === 'geladen') c.msg(MELDING.geladen, 3);
      if (e.type === 'aangelegd') c.msg(MELDING.aangelegd, 3);
      if (e.type === 'fail') { c.fail(e.why); return; }
      if (e.type === 'klaar') {
        d.vanKade = s.naar;
        const r = uitslagVan(s);
        if (r.failed) c.fail(r.text);
        else c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
        return;
      }
    }
    d.melding = Math.max(0, (d.melding || 0) - dt);
    if (Number.isFinite(c.timeLeft)) c.timeLeft = Math.max(0, s.budget - s.t);
  },

  view(c) {
    const s = c.data.overtocht;
    if (!s) return {};
    const d = doelVan(s);
    return {
      marker: { x: d.x, y: d.y },
      progress: voortgangTekst(s),
      goal: { label: d.label, desc: 'Vaar rustig: bij de kade geldt een lage limiet.' },
    };
  },

  timeout: () => 'de kadewachter staat niet langer te wachten',

  stop() {},
};

export const BINNENVAART_KADES = KADES;
