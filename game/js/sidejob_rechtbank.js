// Zijmissie: dossier naar de rechtbank. A clerk hands you a thin file with three
// facts about a made-up case; carry it to the Gerechtsgebouw (or back to the
// Politiebureau, round after round) and answer the three questions of the clerk
// at the desk. Tab reads the facts again, Backspace gives the file back. No
// timer and nothing to fail: wrong answers only pay a bit less. Text only, no
// recordings. All cases and names are invented.
import { namedBuildingSpot, pick, euro } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { pickDossier, dossierQuestions, verklaringPay, COURT_SAY } from './casework.js';
import { dist } from './util.js';
import { poiLayerPlaces } from './facilities.js';

const ARRIVE_R = 5.5;
const READ_MIN_S = 2;
const RESULT_S = 3;

let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel('#9a7ad0'));

function stationSpot(map) {
  const ps = poiLayerPlaces(map, 'policeStations').find((s) => /Centrum/.test(s.name)) || { x: 100, y: 76, name: 'Politiebureau' };
  const o = map.findOpenSpawn(ps.x + 5, ps.y + 5, 60);
  return { x: o ? o.x : ps.x, y: o ? o.y : ps.y, name: 'Politiebureau Groningen Centrum' };
}

function courtSpot(map) {
  const s = namedBuildingSpot(map, 'Gerechtsgebouw');
  return s ? { x: s.x, y: s.y, name: 'Gerechtsgebouw' } : stationSpot(map);
}

function destFor(c) {
  const map = c.world.map;
  return c.round % 2 === 0 ? courtSpot(map) : stationSpot(map);
}

function closePanel(c) {
  if (panel) panel.hide();
  if (c) c.data.open = false;
}

export default {
  id: 'rechtbank',
  name: 'Dossier naar de rechtbank',
  color: '#7a5aa8',
  glyph: 'rechtbank',
  boss: 'Griffier Smid',
  kicker: 'Zijmissie',
  noIntro: false,
  allowWanted: false,
  blurb: 'Breng een dossier weg en beantwoord de vragen van de griffier',
  tagline: 'Lees de feiten, loop naar de balie en beantwoord drie vragen. Geen haast, geen straf.',
  intro: [
    'Een dossier. Dun, maar het moet vandaag nog aankomen.',
    'Lees de feiten goed: aan de balie stelt de griffier er drie vragen over. Met Tab lees je ze nog eens.',
  ],

  anchor(map) {
    const s = stationSpot(map);
    return { x: s.x, y: s.y };
  },

  start(c) {
    c.data.last = null;
    return true;
  },

  round(c) {
    const d = c.data;
    closePanel(c);
    d.dossier = pickDossier(Math.random, d.last);
    d.last = d.dossier.id;
    d.questions = dossierQuestions(d.dossier);
    d.dest = destFor(c);
    d.phase = 'read';
    d.readT = READ_MIN_S;
    d.qi = 0;
    d.right = 0;
    d.picked = null;
    d.resultT = 0;
    ensurePanel().show();
    d.open = true;
    c.msg(COURT_SAY.pickup, 4.5);
  },

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = world.player, input = world.input;
    if (d.phase === 'read' || d.phase === 'reread' || d.phase === 'ask' || d.phase === 'result') world.minigameUntil = world.time + 0.25;
    if (d.phase === 'read') {
      d.readT -= dt;
      paintFacts(c, d.readT > 0 ? '' : 'Spatie: op weg');
      if (d.readT <= 0 && (input.wasPressed(' ') || input.wasPressed('e'))) { input.consume(' '); input.consume('e'); closePanel(c); d.phase = 'carry'; }
      return;
    }
    if (d.phase === 'reread') {
      paintFacts(c, 'Spatie: verder');
      if (input.wasPressed(' ') || input.wasPressed('tab') || input.wasPressed('backspace')) { input.consume(' '); input.consume('tab'); input.consume('backspace'); closePanel(c); d.phase = 'carry'; }
      return;
    }
    if (d.phase === 'carry') {
      if (input.wasPressed('tab')) { input.consume('tab'); ensurePanel().show(); d.open = true; d.phase = 'reread'; return; }
      if (input.wasPressed('backspace')) { input.consume('backspace'); c.skip('Dossier teruggegeven. Een nieuw dossier komt eraan.'); return; }
      if (dist(p.x, p.y, d.dest.x, d.dest.y) <= ARRIVE_R && !p.inVehicle) {
        d.phase = 'ask';
        c.msg(COURT_SAY.arrive, 4);
        ensurePanel().show();
        d.open = true;
        paintQuestion(c);
      }
      return;
    }
    if (d.phase === 'ask') {
      if (input.wasPressed('backspace')) {
        input.consume('backspace');
        closePanel(c);
        c.skip('Verklaring geweigerd. De zaak wordt later behandeld.');
        return;
      }
      const q = d.questions[d.qi];
      for (let i = 0; i < q.options.length; i++) {
        const k = String(i + 1);
        if (input.wasPressed(k)) {
          input.consume(k);
          d.picked = i;
          if (q.options[i].ok) d.right++;
          d.phase = 'answered';
          d.resultT = 1.4;
          paintQuestion(c);
          return;
        }
      }
      if (dist(p.x, p.y, d.dest.x, d.dest.y) > ARRIVE_R + 12 || p.inVehicle) { closePanel(c); d.phase = 'carry'; }
      return;
    }
    if (d.phase === 'answered') {
      world.minigameUntil = world.time + 0.25;
      d.resultT -= dt;
      paintQuestion(c);
      if (d.resultT <= 0) {
        d.qi++;
        d.picked = null;
        if (d.qi >= d.questions.length) { d.phase = 'result'; d.resultT = RESULT_S; d.pay = verklaringPay(d.right, d.questions.length); paintResult(c); }
        else { d.phase = 'ask'; paintQuestion(c); }
      }
      return;
    }
    if (d.phase === 'result') {
      d.resultT -= dt;
      paintResult(c);
      if (d.resultT <= 0) {
        closePanel(c);
        const pay = d.pay;
        c.complete({ base: pay.base, tip: pay.tip, flawless: pay.flawless, text: pay.verdict });
      }
    }
  },

  view(c) {
    const d = c.data;
    if (!d.dest) return {};
    const carrying = d.phase !== 'result';
    return {
      marker: carrying ? { x: d.dest.x, y: d.dest.y } : null,
      progress: `Dossier ${c.streak + 1}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
      goal: { label: d.dest.name, desc: d.phase === 'ask' || d.phase === 'answered' ? 'Beantwoord de vragen van de griffier' : 'Breng het dossier naar de balie (Tab: feiten lezen)' },
    };
  },

  stop(c) {
    closePanel(c);
    c.msg(COURT_SAY.quit, 3);
  },
};

function paintFacts(c, hint) {
  const d = c.data;
  ensurePanel().set({
    kicker: `DOSSIER · ${d.dossier.title.toUpperCase()}`,
    text: 'Onthoud de feiten: aan de balie stelt de griffier er drie vragen over.',
    options: d.dossier.facts.map((f) => ({ key: '•', label: f })),
    flash: hint,
    help: `${keycap('SPATIE')} verder · ${keycap('TAB')} later nog eens lezen`,
  });
}

function paintQuestion(c) {
  const d = c.data;
  const q = d.questions[Math.min(d.qi, d.questions.length - 1)];
  const shown = d.phase === 'answered';
  ensurePanel().set({
    kicker: `VERKLARING · VRAAG ${Math.min(d.qi + 1, d.questions.length)} VAN ${d.questions.length}`,
    text: q.q,
    options: q.options.map((o, i) => ({ key: String(i + 1), label: o.text, cls: shown ? (o.ok ? 'good' : d.picked === i ? 'bad' : '') : '' })),
    flash: shown ? (q.options[d.picked].ok ? 'Juist.' : pick(COURT_SAY.gavel)) : '',
    bad: shown && !q.options[d.picked].ok,
    help: `${keycap('1')}${keycap('2')}${keycap('3')} antwoord · ${keycap('BACKSPACE')} verklaring weigeren`,
  });
}

function paintResult(c) {
  const d = c.data;
  ensurePanel().set({
    kicker: 'VERKLARING AFGELEGD',
    text: `${d.right} van ${d.questions.length} vragen goed`,
    flash: d.pay.verdict,
    bad: d.right < d.questions.length,
    help: '',
  });
}
