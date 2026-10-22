// Zijmissies "Het Loket", "StudieStaat-balie" en "Borrel bij Vigilantia" (refs
// #26): walk to the named building, answer three multiple-choice questions at
// the desk. One factory, three jobs; the rules and all text live in
// keuzewerk.js. No timer: a wrong answer pays a little less, Backspace leaves.
// Text only, no recordings. Every name is invented.
import { namedBuildingSpot, pick, euro } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { KEUZE_JOBS, pickKeuzeRound, keuzePay } from './keuzewerk.js';
import { dist } from './util.js';
import { wgsToWorld } from './rdnew.js';

const ARRIVE_R = 5.5;
const RESULT_S = 3;

const GOOD_SAY = ['Juist.', 'Dat klopt.', 'Netjes.'];
const BAD_SAY = ['Dat staat er net niet.', 'Helaas, de volgende.', 'Bijna.'];

function makeJob(spec) {
  let panel = null;
  const ensurePanel = () => panel || (panel = createChoicePanel(spec.color));
  const closePanel = (c) => { if (panel) panel.hide(); if (c) c.data.open = false; };
  const spot = (map) => {
    const s = namedBuildingSpot(map, spec.building);
    if (s) return { x: s.x, y: s.y, name: spec.building };
    // the building is not in the loaded tiles by name: its approximate real spot (keuzewerk.js wgs), not the Grote Markt for every job
    const [fx, fy] = spec.wgs ? wgsToWorld(spec.wgs[0], spec.wgs[1]) : [100, 76];
    const o = map.findOpenSpawn(fx, fy, 80);
    return { x: o ? o.x : fx, y: o ? o.y : fy, name: spec.building };
  };
  const paintQuestion = (c) => {
    const d = c.data;
    const q = d.questions[Math.min(d.qi, d.questions.length - 1)];
    const shown = d.phase === 'answered';
    ensurePanel().set({
      kicker: `${spec.say.deskTitle} · VRAAG ${Math.min(d.qi + 1, d.questions.length)} VAN ${d.questions.length}`,
      text: q.q,
      options: q.options.map((o, i) => ({ key: String(i + 1), label: o.text, cls: shown ? (o.ok ? 'good' : d.picked === i ? 'bad' : '') : '' })),
      flash: shown ? (q.options[d.picked].ok ? pick(GOOD_SAY) : pick(BAD_SAY)) : '',
      bad: shown && !q.options[d.picked].ok,
      help: `${keycap('1')}${keycap('2')}${keycap('3')} antwoord · ${keycap('BACKSPACE')} weglopen`,
    });
  };
  const paintResult = (c) => {
    const d = c.data;
    ensurePanel().set({
      kicker: `${spec.say.deskTitle} · KLAAR`,
      text: `${d.right} van ${d.questions.length} vragen goed`,
      flash: d.pay.verdict,
      bad: d.right < d.questions.length,
      help: '',
    });
  };

  return {
    id: spec.id,
    name: spec.name,
    color: spec.color,
    glyph: spec.id,
    boss: spec.boss,
    kicker: 'Zijmissie',
    noIntro: false,
    allowWanted: false,
    blurb: spec.blurb,
    tagline: spec.tagline,
    intro: spec.intro,

    anchor(map) { const s = spot(map); return { x: s.x, y: s.y }; },

    start(c) { c.data.lastQs = []; return true; },

    round(c) {
      const d = c.data;
      closePanel(c);
      d.questions = pickKeuzeRound(spec.id, Math.random, d.lastQs);
      d.lastQs = d.questions.map((q) => q.q);
      d.dest = spot(c.world.map);
      d.phase = 'carry';
      d.qi = 0; d.right = 0; d.picked = null; d.resultT = 0;
    },

    update(dt, c) {
      const { world } = c;
      const d = c.data, p = world.player, input = world.input;
      if (d.phase !== 'carry') world.minigameUntil = world.time + 0.25;
      if (d.phase === 'carry') {
        if (input.wasPressed('backspace')) { input.consume('backspace'); c.skip('Je laat het even liggen. Een nieuwe ronde komt eraan.'); return; }
        if (dist(p.x, p.y, d.dest.x, d.dest.y) <= ARRIVE_R && !p.inVehicle) {
          d.phase = 'ask';
          c.msg(spec.say.arrive, 4.5);
          ensurePanel().show();
          d.open = true;
          paintQuestion(c);
        }
        return;
      }
      if (d.phase === 'ask') {
        if (input.wasPressed('backspace')) { input.consume('backspace'); closePanel(c); c.skip('Je loopt weg. Het gesprek wordt later voortgezet.'); return; }
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
        d.resultT -= dt;
        paintQuestion(c);
        if (d.resultT <= 0) {
          d.qi++;
          d.picked = null;
          if (d.qi >= d.questions.length) { d.phase = 'result'; d.resultT = RESULT_S; d.pay = keuzePay(spec.id, d.right, d.questions.length); paintResult(c); }
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
      return {
        marker: d.phase !== 'result' ? { x: d.dest.x, y: d.dest.y } : null,
        progress: `Ronde ${c.streak + 1}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
        goal: { label: d.dest.name, desc: d.phase === 'ask' || d.phase === 'answered' ? 'Beantwoord de vragen' : `Loop naar ${d.dest.name}` },
      };
    },

    stop(c) {
      closePanel(c);
      c.msg(spec.say.quit, 3);
    },
  };
}

export const loket = makeJob(KEUZE_JOBS.loket);
export const studiestaat = makeJob(KEUZE_JOBS.studiestaat);
export const vigilantia = makeJob(KEUZE_JOBS.vigilantia);
export const promotie = makeJob(KEUZE_JOBS.promotie);
export const kamerkoning = makeJob(KEUZE_JOBS.kamerkoning);
export const wolkenhal = makeJob(KEUZE_JOBS.wolkenhal);
export const helix = makeJob(KEUZE_JOBS.helix);
export const niemeyer = makeJob(KEUZE_JOBS.niemeyer);
export const bernard = makeJob(KEUZE_JOBS.bernard);
export const energielabel = makeJob(KEUZE_JOBS.energielabel);
