// Bijbaantje: rondvaartgids op het Diepenring-water. Tussen twee steigers
// langs de bezienswaardigheden varen en bij elk punt rustig aan doen, zodat
// de toeristen het hele verhaal horen.

import { unlockAchievement } from './achievements.js';
import { pick, rand, spawnJobBoat, vehicleSpeed } from './sidejobkit.js';
import { lineVoiceFor } from './linevoice.js';
import { playLineVoice } from './audio.js';

const BOAT = { name: 'boat', len: 5.4, wid: 1.9, maxSpeed: 4.6, accel: 1.6, brake: 2.2, turnRate: 1.2, color: '#1f4a6e', cabin: '#f2ede0' };
const PIER_R = 12;
const SIGHT_R = 20;
const SLOW = 3.6;
const TALK_S = 7.5;

// Water centreline (grid search over the map's water polygons, >= 4 m from
// either quay) from the Groninger Museum to the Noorderhaven.
export const LINE = [[164.07, 828.12], [184.01, 821.75], [206.06, 821.39], [228.11, 821.03], [247.99, 810.63], [267.94, 804.27], [287.82, 793.88], [307.73, 785.5], [325.6, 775.14], [345.48, 764.74], [365.39, 756.36], [387.38, 751.97], [407.29, 743.59], [427.23, 737.23], [447.15, 728.85], [467.06, 720.46], [484.93, 710.1], [504.84, 701.72], [522.65, 687.34], [538.42, 670.97], [556.19, 654.57], [571.96, 638.21], [591.84, 627.81], [607.61, 611.45], [623.38, 595.08], [641.15, 578.68], [658.93, 562.28], [674.7, 545.91], [692.47, 529.52], [710.24, 513.12], [728.05, 498.73], [743.82, 482.36], [759.55, 463.98], [769.24, 443.69], [777.03, 429.47], [776.66, 407.33], [760.33, 389.48], [744.03, 373.64], [725.79, 361.86], [705.65, 356.15], [687.41, 344.37], [667.24, 336.65], [649, 324.88], [630.73, 311.08], [618.41, 293.17], [606.08, 275.25], [597.73, 255.25], [587.38, 235.29], [577.03, 215.33], [566.71, 197.38], [554.35, 177.45], [544, 157.49], [533.68, 139.54], [523.36, 121.59], [513.04, 103.64], [506.7, 83.61], [500.32, 61.57], [493.98, 41.54], [485.63, 21.54], [479.29, 1.52], [472.94, -18.51], [464.6, -38.51], [454.24, -58.47], [445.9, -78.47], [433.57, -96.38], [419.25, -114.27], [408.9, -134.23], [398.58, -152.18], [386.26, -170.1], [375.94, -188.05], [363.62, -205.97], [345.32, -221.77], [325.14, -229.49], [306.91, -241.27], [282.66, -252.96], [262.49, -260.68], [244.29, -270.45], [224.09, -280.18], [205.89, -289.95], [185.71, -297.67], [163.57, -303.35], [145.37, -313.12], [123.33, -312.76], [101.32, -310.38], [79.34, -305.99], [65.34, -303.75]];

const PIERS = [
  { i: 0, name: 'Steiger Groninger Museum', land: [153.03, 765.89] },
  { i: 34, name: 'Steiger Oosterhaven', land: [797.92, 420.06] },
  { i: 55, name: 'Steiger Poelestraat', land: [521.75, 84.37] },
  { i: LINE.length - 1, name: 'Steiger Noorderhaven', land: [66.06, -320.88] },
];

const SIGHTS = [
  { i: 2, name: 'Groninger Museum', lines: ['Links het Groninger Museum.', 'Nee, het is niet ingestort. Het hoort zo, dat heeft een architect bedacht.', 'Binnen hangt kunst. Buiten hangen meeuwen.'] },
  { i: 10, name: 'Herebrug', lines: ['We varen onder de Herebrug door.', 'Gaat die open, dan staan boven honderd fietsers te wachten.', 'Niemand klaagt. Nou ja: iedereen klaagt, maar in het Gronings.'] },
  { i: 39, name: 'De Oosterhaven', lines: ['De Oosterhaven: woonboten, sloepen en één eend die hier al jaren de baas is.', 'Wie hier woont, heeft een tuin die meebeweegt.', 'Zwaai maar. Ze zwaaien terug. Of ze gooien een brood.'] },
  { i: 45, name: 'Het Schuitendiep', lines: ['Het Schuitendiep. Vroeger kwamen hier turfschepen binnen.', 'Nu komen hier vooral fietsen binnen. In het water.', 'Elk jaar vissen ze er honderden uit. De rest heeft zich aangepast.'] },
  { i: 56, name: 'Poelestraat-kade', lines: ['Rechts, net om de hoek: de Poelestraat en de Peperstraat.', 'Overdag slaapt het hier. Om twaalf uur \'s nachts zegt heel Grunn hier "moi".', 'En om vier uur zegt heel Grunn hier "nog één".'] },
  { i: 71, name: 'Prinsentuin', lines: ['Links de Prinsentuin, uit de zeventiende eeuw.', 'Rozen, buxus en een zonnewijzer die hier weinig te doen heeft.', 'Het theehuis is open. Als het niet regent. Dus bijna nooit.'] },
  { i: 80, name: "d'Olle Grieze", lines: ["Kijk rechts over de daken: d'Olle Grieze, de Martinitoren.", 'Zevenennegentig meter. De langste Stadjer die nooit verhuist.', 'Wie de trap op loopt, krijgt uitzicht. En spierpijn.'] },
];

const BUMP_LINES = ['Bonk! Een toerist laat de stroopwafel in het water vallen.', 'Tik tegen de kade. "Is this part of the tour?"', 'Schrap! De woonboot-bewoner kijkt niet blij.'];

function legBounds(k) {
  const n = PIERS.length - 1;
  const fwd = Math.floor(k / n) % 2 === 0;
  const j = k % n;
  const a = fwd ? PIERS[j] : PIERS[n - j];
  const b = fwd ? PIERS[j + 1] : PIERS[n - j - 1];
  return { from: a, to: b, dir: fwd ? 1 : -1 };
}

export default {
  id: 'rondvaart',
  name: 'Rondvaartgids',
  color: '#1b8fc9',
  glyph: 'rondvaart',
  boss: 'Schipper Geert',
  boardFirst: true,
  boardText: 'Ga aan boord van de rondvaartboot',
  vehicleWord: 'de rondvaartboot',
  blurb: 'Toeristen over het Diepenring-water varen',
  tagline: 'Rustig langs de bezienswaardigheden, dan hoort iedereen het verhaal.',
  intro: [
    'Moi, ik ben Geert. Mijn rug doet het niet meer, dus jij bent vandaag de gids.',
    'Vaar van steiger naar steiger. Bij elk mooi plekje: gas eraf, dan vertel ik het verhaal via de speaker.',
    'Te hard langs? Dan missen ze het. En toeristen die iets missen, geven geen fooi.',
  ],
  sikkom: (c) => `Rondvaartgids vaart ${c.streak} tochten zonder één toerist overboord`,

  anchor() {
    return { x: PIERS[0].land[0], y: PIERS[0].land[1] };
  },

  start(c) {
    const [nx, ny] = LINE[2];
    const { x, y } = c.spot;
    const boat = spawnJobBoat(c.world, x, y, Math.atan2(ny - y, nx - x), BOAT) || spawnJobBoat(c.world, LINE[0][0], LINE[0][1], Math.atan2(ny - LINE[0][1], nx - LINE[0][0]), BOAT);
    if (!boat) return 'De boot ligt niet klaar';
    c.vehicle = boat;
    c.data.leg = 0;
    return true;
  },

  round(c) {
    const d = c.data;
    const k = c.streak;
    const leg = legBounds(k);
    d.legInfo = leg;
    const lo = Math.min(leg.from.i, leg.to.i), hi = Math.max(leg.from.i, leg.to.i);
    d.sights = SIGHTS.filter((s) => s.i >= lo && s.i <= hi).sort((a, b) => (a.i - b.i) * leg.dir).map((s) => ({ ...s, t: 0, done: false, missed: false, said: 0 }));
    d.cursor = leg.from.i;
    d.rating = 100;
    d.boarded = false;
    d.boardT = 0;
    d.prevSpeed = null;
    d.bumpAt = -Infinity;
    const len = (hi - lo) * 21;
    const tight = (1 - 0.03 * Math.min(c.streak, 8)) * (1 - 0.03 * (c.level - 1));
    d.budget = (len / 5.5 + d.sights.length * TALK_S + 40) * tight;
    c.timeLeft = null;
    c.msg(`Nieuwe groep toeristen bij ${leg.from.name}. Stop even bij de steiger om ze aan boord te laten.`, 3.5);
  },

  needsVehicle: () => true,

  timeout: () => 'de toeristen missen hun bus. Ze schrijven een boze recensie in vier talen',

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = world.player, v = c.vehicle;
    const onBoat = p.inVehicle === v;
    const speed = vehicleSpeed(v);
    const leg = d.legInfo;

    if (!d.boarded) {
      const [px, py] = LINE[leg.from.i];
      const first = c.round === 0 && d.boardT >= 0;
      if (onBoat && speed < 1 && (first || Math.hypot(v.x - px, v.y - py) < PIER_R)) {
        d.boardT += dt;
        if (d.boardT > 1.5) {
          d.boarded = true;
          c.timeLeft = d.budget;
          c.msg(`Iedereen aan boord! Op naar ${leg.to.name}.`, 3);
        }
      } else d.boardT = 0;
      return;
    }

    if (onBoat) {
      const s = v.speed;
      if (d.prevSpeed != null && Math.abs(d.prevSpeed) > 1.2 && (Math.sign(s) !== Math.sign(d.prevSpeed) || Math.abs(d.prevSpeed) - Math.abs(s) > 1.2) && world.time - d.bumpAt > 1.5) {
        d.bumpAt = world.time;
        d.rating = Math.max(0, d.rating - 8);
        c.msg(pick(BUMP_LINES), 2.8);
      }
      d.prevSpeed = s;
    } else d.prevSpeed = null;

    // follow progress along the line so the guidance dots stay ahead
    for (let step = 0; step < 3; step++) {
      const nx = d.cursor + leg.dir;
      if (nx < 0 || nx >= LINE.length) break;
      const [ax, ay] = LINE[nx];
      if (Math.hypot(ax - v.x, ay - v.y) < Math.hypot(LINE[d.cursor][0] - v.x, LINE[d.cursor][1] - v.y)) d.cursor = nx;
      else break;
    }

    for (const s of d.sights) {
      if (s.done || s.missed) continue;
      const [sx, sy] = LINE[s.i];
      const dd = Math.hypot(sx - v.x, sy - v.y);
      const passed = (d.cursor - s.i) * leg.dir > 3;
      if (dd < SIGHT_R && onBoat) {
        if (speed < SLOW) {
          s.t += dt;
          // the player is the guide: a recorded line holds the next one back
          // until it's done, and waits (briefly) for other talk to finish
          const next = s.nextAt || 0;
          if (s.said < s.lines.length && s.t >= next) {
            const text = s.lines[s.said];
            const v = lineVoiceFor(world.player.character === 'anita' ? 'Anita' : 'Tammo', text);
            if (!v || playLineVoice(v.src, v.dur) || s.t - next > 1.5) {
              c.msg(`Gids: "${text}"`, v ? Math.max(3.2, v.dur + 0.4) : 3.2);
              s.said++;
              s.nextAt = s.t + Math.max(TALK_S / s.lines.length, v ? v.dur + 0.3 : 0);
            }
          }
          if (s.said >= s.lines.length && s.t >= Math.max(TALK_S, s.nextAt || 0)) { s.done = true; c.msg(`Toeristen fotograferen ${s.name}. Klik klik.`, 2.2); }
        } else if (world.time - (d.slowHintAt || -99) > 4) {
          d.slowHintAt = world.time;
          c.msg('Gas eraf! De toeristen willen het verhaal horen.', 2.2);
        }
      } else if (passed || (dd > SIGHT_R + 6 && s.t > 0)) {
        s.missed = true;
        d.rating = Math.max(0, d.rating - 20);
        c.msg(`De toeristen hebben ${s.name} gemist. Ze fotograferen nu maar een eend.`, 3);
      }
      break;
    }

    const [tx, ty] = LINE[leg.to.i];
    if (onBoat && speed < 1 && Math.hypot(v.x - tx, v.y - ty) < PIER_R) {
      const all = d.sights.every((s) => s.done);
      if (all) unlockAchievement(world, 'sj_rondvaart');
      const told = d.sights.filter((s) => s.done).length;
      const tip = d.rating >= 85 && all ? rand(14, 24) : d.rating >= 60 ? rand(4, 9) : 0;
      c.complete({ base: 30 + Math.abs(leg.to.i - leg.from.i) * 1.1 + told * 6, tip, text: all ? 'Applaus aan boord!' : `Tocht klaar (${told}/${d.sights.length} verhalen).`, flawless: all });
    }
  },

  view(c) {
    const d = c.data;
    const leg = d.legInfo;
    if (!leg) return {};
    if (!d.boarded) {
      const [x, y] = LINE[leg.from.i];
      return { marker: { x, y }, progress: `Tocht ${c.streak + 1} · instappen`, goal: { label: leg.from.name, desc: 'Leg even stil aan de steiger' } };
    }
    const next = d.sights.find((s) => !s.done && !s.missed);
    const dots = [];
    for (let k = 1; k <= 5; k++) {
      const i = d.cursor + leg.dir * k * 2;
      if ((i - leg.to.i) * leg.dir > 0 || i < 0 || i >= LINE.length) break;
      dots.push({ x: LINE[i][0], y: LINE[i][1], h: 1.4 });
    }
    const told = d.sights.filter((s) => s.done).length;
    if (next) {
      const [x, y] = LINE[next.i];
      const talk = next.t > 0 ? ` · uitleg ${Math.round(Math.min(1, next.t / TALK_S) * 100)}%` : '';
      return { marker: { x, y }, dots, progress: `Tocht ${c.streak + 1} · ${told}/${d.sights.length} verhalen${talk}`, goal: { label: next.name, desc: 'Vaar er rustig langs (gas eraf)' } };
    }
    const [x, y] = LINE[leg.to.i];
    return { marker: { x, y }, dots, progress: `Tocht ${c.streak + 1} · ${told}/${d.sights.length} verhalen`, goal: { label: leg.to.name, desc: 'Aanleggen: stilliggen bij de steiger' } };
  },

  stop() {},
};
