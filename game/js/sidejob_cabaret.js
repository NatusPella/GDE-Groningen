import { hoofdspeler } from './players.js';
// Zijmissie: cabaret in de Stadsschouwburg. The Frisian cabaret artist Ype Tjaarda
// (invented) performs and you sit on row seven with one job: shout something
// back on the beat. A sweeping marker crosses a green zone after each line;
// Space in the green is a perfect heckle, near it is fine, early or late the
// artist doesn't bite. Five beats, points for the audience, Backspace leaves
// the room. Text only, no recordings; the Frisian lines carry a Dutch gloss.
// Dry and friendly: nobody is hurt, nothing is damaged.
import { namedBuildingSpot, pick, euro } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { bubble, clearBubbles } from './minigamekit.js';
import { CABARET, heckleTiming, cabaretSchedule, cabaretPay } from './casework.js';
import { medeGrapje } from './bijbaanhulp.js';
import { dist } from './util.js';
import { accentVan } from './sidejobprofiel.js';

const SPEAK_S = 3.2;
const SWEEP_S = 2.4;
const AFTER_S = 0.6;
const STAY_R = 40;
const RESULT_S = 3.2;

let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel(accentVan('cabaret')));

function closePanel(c) {
  if (panel) panel.hide();
  if (c) { c.data.open = false; clearBubbles(c.world, 'cabaret'); }
}

export default {
  id: 'cabaret',
  name: 'Cabaret in de Stadsschouwburg',
  color: accentVan('cabaret'),
  glyph: 'cabaret',
  boss: 'Ype Tjaarda',
  kicker: 'Zijmissie',
  noIntro: false,
  allowWanted: false,
  blurb: 'Roep op de maat iets terug naar een Friese cabaretier',
  tagline: 'Wacht op het groen en druk Spatie: een goed getimed grapje levert applaus op.',
  intro: [CABARET.intro, 'Tip: de pauze valt na elke grap. Daar zit je kans.'],

  anchor(map) {
    const s = namedBuildingSpot(map, 'Stadsschouwburg');
    if (s) return { x: s.x, y: s.y };
    const o = map.findOpenSpawn(100, 76, 80);
    return o ? { x: o.x, y: o.y } : { x: 100, y: 76 };
  },

  start(c) {
    c.data.home = { x: c.spot.x, y: c.spot.y };
    return true;
  },

  round(c) {
    const d = c.data;
    closePanel(c);
    d.sched = cabaretSchedule(SPEAK_S);
    d.t = 0;
    d.beat = 0;
    d.points = 0;
    d.results = [];
    d.flash = '';
    d.flashT = 0;
    d.pressed = false;
    d.phase = 'act';
    d.resultT = 0;
    ensurePanel().show();
    d.open = true;
    c.msg('De zaal wordt donker. Ype Tjaarda stapt het podium op.', 3.5);
  },

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world), input = world.input;
    world.minigameUntil = world.time + 0.25;
    if (d.flashT > 0) d.flashT -= dt;
    if (input.wasPressed('backspace')) {
      input.consume('backspace');
      closePanel(c);
      c.skip('Je sluipt de zaal uit. Ype speelt gewoon door.');
      return;
    }
    if (dist(p.x, p.y, d.home.x, d.home.y) > STAY_R) { closePanel(c); c.skip('Je liep de zaal uit. Ype speelt gewoon door.'); return; }
    if (d.phase === 'result') {
      d.resultT -= dt;
      paintResult(c);
      if (d.resultT <= 0) {
        closePanel(c);
        const pay = cabaretPay(d.points, d.sched.beats.filter((b) => b.cueAt != null).length);
        c.complete({ base: pay.base, tip: pay.tip, flawless: pay.flawless, text: pay.verdict });
      }
      return;
    }
    d.t += dt;
    const beats = d.sched.beats;
    // the current act line: the last one whose speakAt has passed
    let cur = 0;
    for (const b of beats) if (d.t >= b.speakAt) cur = b.i;
    d.cur = cur;
    const b = beats[cur];
    const pressed = input.wasPressed(' ');
    if (pressed) input.consume(' ');
    if (b.cueAt != null && !d.results[cur]) {
      const inWindow = d.t >= b.cueAt - SWEEP_S && d.t <= b.cueAt + AFTER_S;
      if (pressed && inWindow) {
        const res = heckleTiming(b.cueAt, d.t);
        d.results[cur] = res;
        d.points += CABARET.points[res];
        d.flash = pick(CABARET.reply[res]);
        d.flashT = 3;
        bubble(world, { x: p.x, y: p.y, follow: p, name: 'Jij', text: pick(CABARET.heckles), h: 2.2, tag: 'cabaret', ttl: 2 });
      } else if (d.t > b.cueAt + AFTER_S) {
        d.results[cur] = 'late';
        d.flash = pick(CABARET.reply.late);
        d.flashT = 3;
      }
    } else if (pressed && b.cueAt != null && d.results[cur]) {
      // a second shout on the same beat: nothing
    } else if (pressed) {
      d.flash = 'Te vroeg: wacht op het groen';
      d.flashT = 1.2;
    }
    if (d.t >= d.sched.end) {
      d.phase = 'result';
      d.resultT = RESULT_S;
      paintResult(c);
      return;
    }
    paintAct(c);
  },

  // Samen spelen (#683): een mede-optreder roept met E op de maat mee; de helft van de punten, één keer per grap.
  helperActie(c) {
    const d = c.data;
    if (d.phase !== 'act' || !d.sched) return false;
    const b = d.sched.beats[d.cur];
    if (!b || b.cueAt == null) return false;
    d.mede = d.mede || {};
    if (d.mede[b.i]) return false;
    const res = medeGrapje(b.cueAt, d.t);
    if (!res.ok) return false;
    d.mede[b.i] = true;
    d.points += res.punten;
    d.flash = res.soort === 'perfect' ? 'Je mede-optreder raakt de maat: de zaal lacht.' : 'Je mede-optreder roept mee: het is leuk.';
    d.flashT = 2.5;
    return true;
  },

  view(c) {
    const d = c.data;
    if (!d.home) return {};
    return {
      marker: null,
      help: d.phase === 'act',
      progress: `Voorstelling ${c.streak + 1}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
      goal: { label: 'Rij zeven', desc: d.phase === 'result' ? 'Applaus' : 'Druk Spatie in het groen' },
    };
  },

  stop(c) {
    closePanel(c);
  },
};

function paintAct(c) {
  const d = c.data;
  const a = CABARET.acts[d.cur];
  const b = d.sched.beats[d.cur];
  let meter = null;
  if (b.cueAt != null && !d.results[d.cur] && d.t >= b.cueAt - SWEEP_S - 0.4) {
    const span = SWEEP_S + AFTER_S;
    meter = { v: (d.t - (b.cueAt - SWEEP_S)) / span, from: (SWEEP_S - CABARET.windows.ok) / span, to: (SWEEP_S + CABARET.windows.ok) / span };
  }
  const heckled = d.results.filter((r) => r && r !== 'late' && r !== 'early').length;
  ensurePanel().set({
    kicker: `CABARET · ${CABARET.who.toUpperCase()} · PUNTEN ${d.points}`,
    text: a.text,
    meter,
    flash: d.flashT > 0 ? d.flash : meter ? 'Nu komt de pauze...' : '',
    bad: d.flashT > 0 && /let|vroeg|wachtsje|Te /.test(d.flash),
    help: `${keycap('SPATIE')} terugroepen als de balk in het groen is · ${keycap('BACKSPACE')} zaal verlaten`,
    options: [{ key: '☺', label: `${heckled} grapjes geland` }],
  });
}

function paintResult(c) {
  const d = c.data;
  const beats = d.sched.beats.filter((b) => b.cueAt != null).length;
  const pay = cabaretPay(d.points, beats);
  ensurePanel().set({
    kicker: 'APPLAUS',
    text: `${d.points} punten van ${beats * CABARET.points.perfect}`,
    flash: pay.verdict,
    bad: pay.base < 40,
    help: '',
  });
}

