import { iconDisc } from './activitykit.js';
import { today as calendarToday } from './calendarday.js';
import { activitySpotsFor, eventHere } from './evenementen.js';

// Evenementen (#203) als activiteit voor de kaarten en de spotcheck: een marker op
// de plek van elk evenement van vandaag. Er valt niets te starten; de wereldlaag
// (evenementenlive.js) doet melding, menigte, geluid en afsluitingen. Dit is alleen
// "er is hier iets te doen". `window.__evenementen` debug.
const ACCENT = '#ff8a3d';
let world = null;
const hourOf = (w) => ((w.clock % 24) + 24) % 24;

function glyph(ctx) {
  // vlaggetjes aan een lijn
  ctx.strokeStyle = '#f2ede0'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(-3, -1.8); ctx.quadraticCurveTo(0, 0.8, 3, -1.8); ctx.stroke();
  ctx.fillStyle = '#f2ede0';
  for (const x of [-1.8, 0, 1.8]) { ctx.beginPath(); ctx.moveTo(x - 0.7, -0.5 + (x === 0 ? 0.6 : 0)); ctx.lineTo(x + 0.7, -0.5 + (x === 0 ? 0.6 : 0)); ctx.lineTo(x, 1.8 + (x === 0 ? 0.6 : 0)); ctx.fill(); }
}

export const EVENEMENTEN = {
  id: 'evenementen',
  layer: 'evenementen',
  legend: { kind: 'act-evenementen', label: 'Evenement', note: 'kermis, markt, optocht, concert: alleen op de dag zelf' },
  init(w) {
    world = w;
    window.__evenementen = {
      spots: (all = true) => activitySpotsFor(calendarToday(w), hourOf(w), all),
      here: () => eventHere(w.player.x, w.player.y, calendarToday(w), hourOf(w), 0),
    };
  },
  spots: (all = false) => (world ? activitySpotsFor(calendarToday(world), hourOf(world), all) : []),
  prompt: () => null,
  secondary(w) {
    const out = [];
    const p = w.player;
    for (const s of activitySpotsFor(calendarToday(w), hourOf(w))) {
      if (!s.live || Math.hypot(s.x - p.x, s.y - p.y) > 200) continue;
      out.push({ id: 'evenement-' + s.id, x: s.x, y: s.y, h: 3, label: s.name, sub: 'Hier is iets te doen', kind: 'place' });
    }
    return out;
  },
  interact: () => false,
  active: () => false,
  quit: () => {},
  update: () => {},
  tick: () => {},
  camera: () => {},
  icon(ctx, s) {
    iconDisc(ctx, s, ACCENT);
    ctx.save(); ctx.scale(s, s); glyph(ctx); ctx.restore();
  },
  mapSub: (spot) => spot.sub || 'Evenement',
  ubbo: () => null,
};
