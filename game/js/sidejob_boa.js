import { hoofdspeler } from './players.js';
// Zijmissie: BOA voor een dag. You wear the vest of the Hoofd-BOA for a shift:
// walk up to an offender, read the invented rulebook (casework.js) and write the
// fine it asks for: pick one of three amounts with 1, 2 or 3. Right = paid
// and a good mood, wrong = the offender objects (and you earn less), and
// Backspace lets any case go, so money never blocks. Text only, no recordings.
// Dry satire of fussiness; all rules and names are invented.
import { pick, randomStreetPoint, kerbSide, spawnPed, pedAlive, holdPed, freePed, say, euro, namedBuildingSpot } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { pickBoaCase, boaOptions, boaVerdict, euroText, BOA_SAY } from './casework.js';
import { dist } from './util.js';

const REACH = 3.4;
const FAR = 42;
const GIVE_UP_S = 60;
const SHOW_RESULT_S = 2.4;
const SHIRTS = ['#c04a3a', '#3a7ab8', '#d8b030', '#6a9a5a', '#a05ab0', '#e0e0d8'];

let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel('#d9a441'));

function offenderSpot(c) {
  const { map } = c.world;
  const base = c.spot || hoofdspeler(c.world);
  for (const [r0, r1] of [[40, 110], [25, 160]]) {
    const rp = randomStreetPoint(map, base.x, base.y, r0, r1, { cats: ['normal', 'minor'] });
    if (!rp) continue;
    const hit = { x: rp.x, y: rp.y, road: rp.road, dx: 1, dy: 0 };
    const near = map.roadsNear(rp.x, rp.y, 3).find((r) => r === rp.road);
    if (near) {
      let best = 1e9;
      for (let i = 0; i < near.pts.length - 1; i++) {
        const d = Math.hypot(near.pts[i][0] - rp.x, near.pts[i][1] - rp.y);
        if (d < best) { best = d; hit.dx = near.pts[i + 1][0] - near.pts[i][0]; hit.dy = near.pts[i + 1][1] - near.pts[i][1]; }
      }
    }
    return kerbSide(map, hit);
  }
  return null;
}

function closePanel(c) {
  if (panel) panel.hide();
  c.data.open = false;
}

export default {
  id: 'boa',
  name: 'BOA voor een dag',
  color: '#c98a2a',
  glyph: 'boa',
  boss: 'Hoofd-BOA Vermeer',
  kicker: 'Zijmissie',
  noIntro: false,
  allowWanted: false,
  blurb: 'Schrijf de boetes uit het dikke boekje van onzin',
  tagline: 'Loop op een overtreder af, reken de boete uit en schrijf hem uit. Overslaan mag altijd.',
  intro: [
    'Je bent BOA voor een dag. Hier is een vest, een boekje en een heel dik wetboek.',
    'Geen paniek: elke regel staat erin, met bedragen erbij. Reken maar goed uit, de overtreder let op.',
  ],

  // at the Stadhuis, where the Hoofd-BOA keeps the rulebook
  anchor(map) {
    const s = namedBuildingSpot(map, 'Stadhuis');
    if (s) return { x: s.x, y: s.y };
    const o = map.findOpenSpawn(100, 76, 80);
    return o ? { x: o.x, y: o.y } : { x: 100, y: 76 };
  },

  start(c) {
    c.data.last = null;
    c.msg('Je trekt het BOA-vest aan. Loop op de overtreder af.', 3.5);
    return true;
  },

  round(c) {
    const d = c.data;
    closePanel(c);
    d.phase = 'walk';
    d.case = pickBoaCase(Math.random, d.last);
    d.last = d.case.id;
    d.options = boaOptions(d.case);
    d.picked = null;
    d.farFor = 0;
    d.resultT = 0;
    const spot = offenderSpot(c);
    if (!spot) { c.skip('Geen overtreder te vinden. Even rustig aan.'); return; }
    d.ped = c.track(spawnPed(c.world, spot.x, spot.y, Math.random() * Math.PI * 2, { shirt: pick(SHIRTS), bag: Math.random() < 0.5 }));
    d.spot = spot;
    if (c.round === 0) c.msg('Loop op de overtreder af, tot 3 meter.', 3);
  },

  update(dt, c) {
    const { world } = c;
    const d = c.data, p = hoofdspeler(world);
    const ped = d.ped;
    if (!pedAlive(world, ped)) { closePanel(c); c.skip('De overtreder is verdwenen. Volgende.'); return; }
    holdPed(ped, p.x, p.y);
    const dd = dist(p.x, p.y, ped.x, ped.y);
    if (d.phase === 'walk') {
      d.farFor = dd > FAR ? d.farFor + dt : 0;
      if (d.farFor > GIVE_UP_S) { c.skip('De overtreder is er vandoor. Volgende.'); return; }
      if (dd <= REACH && !p.inVehicle && !p.swimming) {
        d.phase = 'case';
        say(world, ped, pick(BOA_SAY.start), 4);
        ensurePanel().show();
        d.open = true;
      }
      return;
    }
    world.minigameUntil = world.time + 0.25;
    const input = world.input;
    if (d.phase === 'case') {
      const keys = ['1', '2', '3'];
      for (let i = 0; i < d.options.length; i++) {
        if (input.wasPressed(keys[i])) { input.consume(keys[i]); choose(c, i); return; }
      }
      if (input.wasPressed('backspace') || input.wasPressed('0')) {
        input.consume('backspace'); input.consume('0');
        say(world, ped, pick(BOA_SAY.skip), 3);
        closePanel(c);
        freePed(ped);
        c.skip('Zaak laten rusten. Volgende overtreder.');
        return;
      }
      if (dd > REACH + 6 || p.inVehicle) { closePanel(c); d.phase = 'walk'; return; }
      paint(c);
    } else if (d.phase === 'result') {
      d.resultT -= dt;
      paint(c);
      if (d.resultT <= 0) {
        closePanel(c);
        const v = d.verdict;
        freePed(ped);
        c.complete({ base: v.base, tip: v.kind === 'goed' && c.streak >= 2 ? 6 : 0, flawless: v.flawless, text: v.kind === 'goed' ? 'Boete geschreven!' : 'Boete geschreven, met bezwaar.' });
      }
    }
  },

  view(c) {
    const d = c.data;
    const ped = d.ped;
    if (!ped || !pedAlive(c.world, ped)) return {};
    return {
      marker: d.phase === 'walk' ? { x: ped.x, y: ped.y } : null,
      progress: `Boete ${c.streak + 1}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
      goal: { label: d.phase === 'walk' ? 'Overtreder' : 'Boete schrijven', desc: d.phase === 'walk' ? 'Loop erheen, tot 3 meter' : 'Reken uit wat het boekje vraagt' },
    };
  },

  stop(c) {
    closePanel(c);
    c.msg(BOA_SAY.quit, 3);
  },
};

function choose(c, i) {
  const d = c.data;
  const opt = d.options[i];
  d.picked = i;
  d.verdict = boaVerdict(opt);
  d.phase = 'result';
  d.resultT = SHOW_RESULT_S;
  say(c.world, d.ped, pick(BOA_SAY[d.verdict.kind]), SHOW_RESULT_S + 0.5);
  paint(c);
}

function paint(c) {
  const d = c.data;
  const cs = d.case;
  const resultOn = d.phase === 'result';
  const options = d.options.map((o, i) => ({
    key: String(i + 1),
    label: euroText(o.amount),
    cls: resultOn ? (o.ok ? 'good' : d.picked === i ? 'bad' : '') : '',
  }));
  const flash = resultOn ? (d.verdict.kind === 'goed' ? 'Precies wat het boekje vraagt!' : d.verdict.kind === 'hoog' ? 'Te hoog: de overtreder maakt bezwaar' : 'Te laag: de BOA straalt zwakte uit') : '';
  ensurePanel().set({
    kicker: `BOA VOOR EEN DAG · BOETE ${c.streak + 1}`,
    text: cs.scene,
    rule: cs.rule,
    options,
    flash,
    bad: resultOn && d.verdict.kind !== 'goed',
    help: `${keycap('1')}${keycap('2')}${keycap('3')} boete kiezen · ${keycap('BACKSPACE')} laat maar`,
  });
}

