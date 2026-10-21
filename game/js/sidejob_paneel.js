// Bijbaantjes uit bijbaanregels.js (#192) die geen gewone rit zijn: de strandpost (quad, Spatie = fluit),
// de kermisdraai en de brugdienst (staan op een plek en spelen met een tekstpaneel, Spatie = knop).
// Zelfde familie als het cabaret: choicepanel bovenin, Backspace stopt, geen opnames, geen leed.

import { startRonde, stapRonde, rondeResultaat, bijbaanById } from './bijbaanregels.js';
import { STREKEN } from './regioleven.js';
import { wgsToWorld } from './rdnew.js';
import { spawnJobVehicle, randomStreetPoint, vehicleSpeed, euro } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { dist } from './util.js';
import { ankerMetWeg, ankerBijBrug } from './bijbaananker.js';

const STAD = { x: 213.81, y: 9.9 };
const STAY_R = 45;
const QUAD = { kind: 'car', model: { name: 'quad', len: 2.1, wid: 1.2, maxSpeed: 17, accel: 7, brake: 14, turnRate: 3.0, color: '#d6542b' } };

const regioPunt = (id) => {
  const s = STREKEN.find((r) => r.id === id);
  if (!s) return STAD;
  const [x, y] = wgsToWorld(s.at[0], s.at[1]);
  return { x, y };
};

function basis(id, kleur, baas, glyph) {
  const regel = bijbaanById(id);
  return {
    id, name: regel.naam, color: kleur, glyph, boss: baas,
    blurb: regel.blurb, tagline: regel.bedrijf, intro: regel.intro,
    sikkom: (c) => `${regel.naam} (${regel.bedrijf}): ${c.streak} diensten zonder gedoe`,
    regel,
  };
}

function afronden(d, c) {
  const r = rondeResultaat(d.ronde);
  if (r.failed) c.fail(r.text);
  else c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
}

// ---- Strandpost: quad over de weg, bij een oproep erheen en fluiten (Spatie) ----
const sb = basis('strandpost', '#d6542b', 'Strandwacht Dollard', 'taxi');
const MELD_STRAND = { oproep: 'Oproep! Een zwemmer roept om hulp, rij erheen en fluit.', geholpen: 'Geholpen, goed gedaan!', gemist: 'Te laat: de zwemmer redde zich zelf.' };

export const strandpost = {
  ...sb, vehicleWord: 'de quad',
  anchor(map) {
    return ankerMetWeg(map, regioPunt(sb.regel.regio), true);
  },
  start(c) {
    const v = spawnJobVehicle(c.world, c.spot.x, c.spot.y, QUAD);
    if (!v) return 'Geen quad beschikbaar';
    c.vehicle = v;
    return true;
  },
  needsVehicle: () => true,
  round(c) {
    const d = c.data;
    d.ronde = startRonde('strandpost', c.level);
    d.call = null;
    c.timeLeft = null;
    c.msg(`${sb.regel.bedrijf}: ${sb.regel.intro[0]}`, 3.5);
  },
  update(dt, c) {
    const d = c.data, v = c.vehicle, input = c.world.input;
    if (!d.ronde || dt <= 0) return;
    const act = input.wasPressed(' ');
    if (act) input.consume(' ');
    const dd = d.call ? Math.hypot(d.call.x - v.x, d.call.y - v.y) : 99;
    const ev = stapRonde(d.ronde, { speed: vehicleSpeed(v), dist: dd, act }, dt);
    for (const e of ev) {
      if (e.type === 'oproep') {
        const p = randomStreetPoint(c.world.map, v.x, v.y, 120, 300, { drivable: true }) || { x: v.x + 160, y: v.y };
        d.call = { x: p.x, y: p.y };
      }
      if (e.type === 'geholpen' || e.type === 'gemist') d.call = null;
      if (MELD_STRAND[e.type]) c.msg(MELD_STRAND[e.type], 2.4);
      if (e.type === 'fail') { c.fail(e.why); return; }
      if (e.type === 'done') { afronden(d, c); return; }
    }
  },
  view(c) {
    const d = c.data;
    if (!d.ronde) return {};
    const s = d.ronde.s;
    const left = s.active ? Math.ceil(s.active.left) : 0;
    return {
      marker: d.call ? { x: d.call.x, y: d.call.y } : null,
      progress: `${sb.regel.bedrijf} · ${s.answered}/${s.calls} geholpen${s.active ? ` · nog ${left} s` : ''}`,
      goal: { label: d.call ? 'Naar de zwemmer, Spatie = fluiten' : 'Patrouilleer langs het strand', desc: sb.regel.blurb },
    };
  },
  stop() {},
};

// ---- Paneelbanen: kermisdraai en brugdienst ----
let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel('#e0a030'));
function sluit(c) {
  if (panel) panel.hide();
  if (c) c.data.open = false;
}

function paneelBaan(id, kleur, baas, glyph, anker, teken, melding) {
  const b = basis(id, kleur, baas, glyph);
  return {
    ...b, kicker: 'Bijbaantje', allowWanted: false,
    anchor(map) {
      const p = typeof anker === 'function' ? anker(map) : anker;
      const o = map.findOpenSpawn(p.x, p.y, 80);
      return o ? { x: o.x, y: o.y, fallback: p.fallback } : p;
    },
    start(c) { c.data.home = { x: c.spot.x, y: c.spot.y }; return true; },
    needsVehicle: () => false,
    round(c) {
      const d = c.data;
      d.ronde = startRonde(id, c.level);
      d.flash = '';
      d.flashT = 0;
      c.timeLeft = null;
      ensurePanel().show();
      d.open = true;
      c.msg(`${b.regel.bedrijf}: ${b.regel.intro[0]}`, 3.5);
    },
    update(dt, c) {
      const d = c.data, p = c.world.player, input = c.world.input;
      if (!d.ronde || dt <= 0) return;
      c.world.minigameUntil = c.world.time + 0.25;
      if (d.flashT > 0) d.flashT -= dt;
      if (input.wasPressed('backspace')) { input.consume('backspace'); sluit(c); c.skip('Je laat de knoppen even met rust.'); return; }
      if (dist(p.x, p.y, d.home.x, d.home.y) > STAY_R) { sluit(c); c.skip('Je liep bij je post weg.'); return; }
      const act = input.wasPressed(' ');
      if (act) input.consume(' ');
      for (const e of stapRonde(d.ronde, { act, speed: 0, dist: 99 }, dt)) {
        const m = melding[e.type];
        if (m) { d.flash = m[0]; d.bad = !!m[1]; d.flashT = 2.2; }
        if (e.type === 'fail') { sluit(c); c.fail(e.why); return; }
        if (e.type === 'done') { sluit(c); afronden(d, c); return; }
      }
      teken(d, ensurePanel(), b.regel);
    },
    view(c) {
      const d = c.data;
      if (!d.home) return {};
      return {
        marker: null,
        progress: `${b.regel.bedrijf}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
        goal: { label: b.regel.naam, desc: 'Spatie is je knop · Backspace stopt' },
      };
    },
    stop(c) { sluit(c); },
  };
}

const FASE = { laden: 'Instappen', draaien: 'Draaien', laden_uit: 'Uitstappen' };
const LEN = { laden: 4, draaien: 5, laden_uit: 3 };

export const kermisdraai = paneelBaan('kermisdraai', '#e04f8a', 'Kermisbaas De Vrolijke Tol', 'cabaret', STAD,
  (d, pn, regel) => {
    const s = d.ronde.s, len = LEN[s.phase];
    const [from, span] = s.window;
    pn.set({
      kicker: `KERMIS · RIT ${Math.min(s.rides + 1, s.target)}/${s.target} · ${FASE[s.phase].toUpperCase()}`,
      text: regel.blurb,
      meter: { v: s.clock / len, from: from / len, to: Math.min(1, (from + span) / len) },
      flash: d.flashT > 0 ? d.flash : '',
      bad: !!d.bad,
      help: `${keycap('SPATIE')} in het groen · ${keycap('BACKSPACE')} stoppen`,
      options: [{ key: '☺', label: `Rij blij: ${Math.round(s.happy * 100)}%` }],
    });
  },
  { goed: ['Precies op tijd!', false], fout: ['Te vroeg of te laat: de rij kijkt.', true], rit: ['Een rit erop, volgende groep!', false] });

export const brugdienst = paneelBaan('brugdienst', '#4a8fc0', 'Brugmeester Damsterdiep', 'rondvaart', (map) => ankerBijBrug(map),
  (d, pn) => {
    const s = d.ronde.s;
    pn.set({
      kicker: `BRUG · ${s.open ? 'OPEN' : 'DICHT'} · NOG ${Math.max(0, Math.ceil(s.length - s.shift))} S`,
      text: s.open ? 'De brug staat open: boten varen door.' : 'De brug ligt dicht: auto\'s rijden over.',
      flash: d.flashT > 0 ? d.flash : '',
      bad: !!d.bad,
      help: `${keycap('SPATIE')} brug open of dicht · ${keycap('BACKSPACE')} stoppen`,
      options: [
        { key: '⛴', label: `Boten in de rij: ${Math.floor(s.boats)}` },
        { key: '🚗', label: `Auto's in de rij: ${Math.floor(s.cars)}` },
        { key: '✉', label: `Klachten: ${s.complaints}/4` },
      ],
    });
  },
  { open: ['Brug open!', false], dicht: ['Brug dicht.', false], bootDoor: ['Een schip is erdoor.', false], klacht: ['Klacht: het autoverkeer staat te lang.', true] });

export const PANEEL_JOBS = [strandpost, kermisdraai, brugdienst];
