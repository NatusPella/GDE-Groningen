// Zeeschip bij Lauwersoog en de Eemshaven (#438): de wereldkant van zeeschipvaart.js.
// Twee bijbanen (één per haven) op het sidejob-contract van sidejobs.js: de speler stapt
// aan boord van een kustvaarder, vaart de haven uit naar de boei, keert en legt weer aan.
// De punten en het loon gaan via sidejobs.js naar het vak Water (loopbaan.js).
// Samen spelen: dit is een baan van wie het spel opende (de wereld); een gast ziet het
// doel en de voortgang via coopbijbaan.js en doet niet zelf mee (geen regel in
// BIJBAAN_REGELS), met de gewone melding dat deze baan alleen in je eigen spel is.

import { HAVENS, maakVaart, stapVaart, uitslagVan, doelVan, voortgangTekst } from './zeeschipvaart.js';
import { spawnJobBoat, vehicleSpeed } from './sidejobkit.js';
import { BOAT_KINDS } from './boattypes.js';

// Een kustvaarder: een zeeschip met dezelfde kont als de grote vaart, maar kort genoeg
// om in de haven te manoeuvreren en aan de kade te liggen.
export const KUSTVAARDER = { ...BOAT_KINDS.zeeVracht, len: 42, wid: 8.4, maxSpeed: 5.6, accel: 0.5, brake: 0.8, turnRate: 0.34, color: '#2d4a63', cabin: '#e8e6e0' };

const MELDING = {
  tehard: 'Rustig in de haven: een zeeschip is niet wendbaar.',
  boei: 'Boei gerond. Terug naar de kade en rustig aanleggen.',
};

function maak(haven) {
  return {
    id: haven.id,
    name: `Zeeschip ${haven.haven}`,
    color: haven.kleur,
    glyph: 'rondvaart',
    boss: 'Havenmeester Lammert',
    vehicleWord: 'het zeeschip',
    boardText: 'Ga aan boord van het zeeschip',
    blurb: 'Een zeeschip de haven uit loodsen en weer aanleggen',
    tagline: haven.bedrijf,
    intro: haven.intro,
    sikkom: (c) => `${haven.bedrijf} (${haven.haven}): ${c.streak} schepen geloodst zonder klacht`,

    anchor: () => ({ x: haven.kade.x, y: haven.kade.y }),

    start(c) {
      const s = maakVaart(haven.id, c.level);
      const boot = spawnJobBoat(c.world, haven.kade.x, haven.kade.y, s.koers, KUSTVAARDER);
      if (!boot) return 'Het zeeschip ligt niet klaar';
      c.vehicle = boot;
      return true;
    },

    needsVehicle: () => true,

    round(c) {
      const s = maakVaart(haven.id, c.level);
      if (!s) return;
      c.data.vaart = s;
      c.timeLeft = s.budget;
      c.msg(`${haven.bedrijf}: ${haven.intro[0]}`, 3.5);
    },

    update(dt, c) {
      const d = c.data, v = c.vehicle, s = d.vaart;
      if (!s || !v || dt <= 0) return;
      const speed = vehicleSpeed(v);
      for (const e of stapVaart(s, { x: v.x, y: v.y, speed }, dt)) {
        if (e.type === 'tehard' && !d.melding) { c.msg(MELDING.tehard, 2.4); d.melding = 4; }
        if (e.type === 'boei') c.msg(MELDING.boei, 3);
        if (e.type === 'fail') { c.fail(e.why); return; }
        if (e.type === 'klaar') {
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
      const s = c.data.vaart;
      if (!s) return {};
      const d = doelVan(s);
      return {
        marker: { x: d.x, y: d.y },
        progress: voortgangTekst(s),
        goal: { label: d.label, desc: 'Vaar rustig: in de haven geldt een lage limiet.' },
      };
    },

    timeout: () => 'de loodsploeg staat niet langer te wachten',

    stop() {},
  };
}

export const zeeschipLauwersoog = maak(HAVENS.find((h) => h.id === 'zeeschipwad'));
export const zeeschipEemshaven = maak(HAVENS.find((h) => h.id === 'zeeschipeems'));
