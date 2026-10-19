// Zijmissies uit stadmissies.js (#26) op het sidejob-contract van sidejobs.js. De regels
// zijn puur; deze adapter zet plekken en voertuig neer, voedt de regels met snelheid,
// remvertraging en bochtkracht en vertaalt hun gebeurtenissen naar meldingen, HUD en
// uitbetaling. Vijf missies: Museumbus (Nationaal Busmuseum), Suikerbieten (Hoogkerk),
// Herstelploeg (Delfstof Noord, Hogeland), Live bij Radio Noordkust (OOGTV) en Rave in
// het Telefoonhuis (te voet, volumeregeling in een paneel).
import {
  STAD_MISSIES, startStadRonde, stapStadRonde, stadRondeResultaat, STAD_DOELEN, STAD_MELDING, RAVE_LENGTH, raveBand,
} from './stadmissies.js';
import { wgsToWorld } from './rdnew.js';
import { spawnJobVehicle, randomStreetPoint, vehicleSpeed, namedBuildingSpot, euro } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { dist } from './util.js';

const STAD = { x: 213.81, y: 9.9 };
const MODELS = {
  oudebus: { kind: 'bus', model: { name: 'bus', len: 9.4, wid: 2.4, maxSpeed: 14, accel: 2.6, brake: 8, turnRate: 1.0, color: '#b9552b' } },
  vrachtwagen: { kind: 'car', model: { name: 'van', len: 7.2, wid: 2.4, maxSpeed: 20, accel: 4, brake: 12, turnRate: 1.4, color: '#7a8a3a' } },
  bestelbus: { kind: 'car', model: { name: 'van', len: 5.4, wid: 2.1, maxSpeed: 24, accel: 6, brake: 18, turnRate: 1.9, color: '#d8a31c' } },
  camerabus: { kind: 'car', model: { name: 'van', len: 5.6, wid: 2.1, maxSpeed: 26, accel: 6.5, brake: 18, turnRate: 1.9, color: '#e8e6e0' } },
};
const KLEUR = { museumbus: '#b9552b', suikerbieten: '#7a8a3a', herstelploeg: '#d8a31c', oogtv: '#3b8ad0', telefoonrave: '#b04ad0', vandermeden: '#8fb8a8', schouwburg: '#c0392b', bernardrit: '#9a7a4a' };
const BAAS = { museumbus: 'Conservator Wielema', suikerbieten: 'Opzichter Bietenbult', herstelploeg: 'Voorman Stutter', oogtv: 'Verslaggever Wendt', telefoonrave: 'Organisator Kiepkap', vandermeden: 'Portier Stilman', schouwburg: 'Portier Kleppe', bernardrit: 'Bernhard' };
const DOEL_NAAM = {
  museumbus: ['Dorpsfeest Oost', 'Tentoonstelling Zuid'],
  suikerbieten: ['de bietenhoop', 'de suikerfabriek'],
  herstelploeg: ['het eerste dorpshuis', 'het tweede dorpshuis', 'het derde dorpshuis'],
  oogtv: ['live-plek 1', 'live-plek 2', 'live-plek 3'],
  vandermeden: ['de hoofdpoort', 'de tuinpoort'],
  schouwburg: ['de eerste hoek', 'de tweede hoek', 'de derde hoek'],
  bernardrit: ['het eerste bankje', 'het tweede bankje'],
};

function plek(map, regel) {
  if (regel.plek.wgs) {
    const [x, y] = wgsToWorld(regel.plek.wgs[0], regel.plek.wgs[1]);
    return { x, y };
  }
  if (regel.plek.gebouw) {
    const s = namedBuildingSpot(map, regel.plek.gebouw);
    if (s) return { x: s.x, y: s.y };
    const o = map.findOpenSpawn(regel.plek.fallback[0], regel.plek.fallback[1], 80);
    return o ? { x: o.x, y: o.y } : { x: regel.plek.fallback[0], y: regel.plek.fallback[1] };
  }
  return STAD;
}

function maakRit(regel) {
  const id = regel.id;
  const voertuig = MODELS[regel.voertuig];
  const doelen = STAD_DOELEN[id];
  return {
    id, name: regel.naam, color: KLEUR[id], glyph: id, boss: BAAS[id], vehicleWord: 'je voertuig',
    kicker: 'Zijmissie', blurb: regel.blurb, tagline: regel.tagline, intro: regel.intro,
    sikkom: (c) => `${regel.naam} (${regel.bedrijf}): ${c.streak} ritten zonder gedoe`,

    anchor(map) {
      const p = plek(map, regel);
      const rp = map.nearestRoadPoint(p.x, p.y, 400, true);
      return rp ? { x: rp.x, y: rp.y } : p;
    },

    start(c) {
      const v = spawnJobVehicle(c.world, c.spot.x, c.spot.y, voertuig);
      if (!v) return 'Geen voertuig beschikbaar';
      c.vehicle = v;
      return true;
    },

    needsVehicle: () => true,

    round(c) {
      const d = c.data;
      d.ronde = startStadRonde(id, c.level);
      const n = doelen.total(d.ronde.s);
      d.doelen = [];
      let x = c.vehicle.x, y = c.vehicle.y;
      for (let k = 0; k < n; k++) {
        // Suikerbieten: de hoop ligt bij de start, de fabriek verderop.
        const p = id === 'suikerbieten' && k === 0 ? { x, y } : randomStreetPoint(c.world.map, x, y, 220, 520, { drivable: true }) || { x: x + 260, y };
        d.doelen.push({ x: p.x, y: p.y });
        x = p.x; y = p.y;
      }
      d.prev = null;
      c.timeLeft = id === 'suikerbieten' ? d.ronde.s.limit : 150 + n * 90;
      c.msg(`${regel.bedrijf}: ${regel.intro[0]}`, 3.5);
    },

    timeout: () => 'de klok liep af',

    update(dt, c) {
      const d = c.data, v = c.vehicle;
      if (!d.ronde || dt <= 0) return;
      const doel = d.doelen[Math.min(doelen.at(d.ronde.s), d.doelen.length - 1)];
      const speed = vehicleSpeed(v);
      const prev = d.prev || { speed, angle: v.angle };
      const turn = Math.abs(Math.atan2(Math.sin(v.angle - prev.angle), Math.cos(v.angle - prev.angle))) / dt;
      d.prev = { speed, angle: v.angle };
      const input = { speed, decel: Math.max(0, (prev.speed - speed) / dt), lat: speed * turn, dist: Math.hypot(doel.x - v.x, doel.y - v.y) };
      for (const e of stapStadRonde(d.ronde, input, dt)) {
        // doorlopende gebeurtenissen (elke stap) melden we hooguit om de drie seconden
        const vaak = e.type === 'laden' || e.type === 'kras' || e.type === 'bieten' || e.type === 'tehard' || e.type === 'hardremmen';
        if (STAD_MELDING[e.type] && (!vaak || (d.melT || 0) < c.world.time)) {
          c.msg(STAD_MELDING[e.type], 2.2);
          if (vaak) d.melT = c.world.time + 3;
        }
        if (e.type === 'fail') { c.fail(e.why); return; }
        if (e.type === 'done') {
          const r = stadRondeResultaat(d.ronde);
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
      const s = d.ronde.s;
      const namen = DOEL_NAAM[id];
      const extra = id === 'museumbus' ? ` · glans ${Math.round(s.shine)}%`
        : id === 'suikerbieten' ? (s.phase === 'laden' ? ` · laden ${Math.round(s.fill * 100)}%` : ` · lading ${Math.round(s.load)}%`)
          : id === 'herstelploeg' ? ` · vertrouwen ${Math.round(s.trust)}%`
            : id === 'vandermeden' ? ` · rust ${Math.round(s.rust)}%`
              : id === 'schouwburg' ? ` · klachten ${s.klacht}/3`
                : id === 'bernardrit' ? ` · verhalen ${Math.round(s.verhalen)}%`
                  : ` · beeld ${Math.round(Math.min(1, s.focus / 3) * 100)}%`;
      return {
        marker: { x: doel.x, y: doel.y },
        progress: `${regel.bedrijf} · ${Math.min(i + 1, d.doelen.length)}/${d.doelen.length}${extra}`,
        goal: { label: namen[Math.min(i, namen.length - 1)], desc: regel.blurb },
      };
    },

    stop() {},
  };
}

// --- Rave in het Telefoonhuis: te voet, volume met 1/3 of pijltjes ---------------------------

const raveRegel = STAD_MISSIES.find((m) => m.id === 'telefoonrave');
let panel = null;
const ensurePanel = () => panel || (panel = createChoicePanel(KLEUR.telefoonrave));

function maakRave() {
  const regel = raveRegel;
  const close = (c) => { if (panel) panel.hide(); if (c) c.data.open = false; };
  const spot = (map) => plek(map, regel);
  const paint = (c) => {
    const s = c.data.ronde.s, b = raveBand(s.t);
    ensurePanel().set({
      kicker: `TELEFOONHUIS · ${b.name.toUpperCase()} · NOG ${Math.max(0, Math.ceil(RAVE_LENGTH - s.t))} S`,
      text: s.vol < b.lo ? 'De zaal wil meer volume.' : s.vol > b.hi ? 'De buren worden wakker.' : 'Het geluid zit goed.',
      meter: { v: s.vol / 10, from: b.lo / 10, to: b.hi / 10 },
      flash: `Zaal ${Math.round(s.mood)}% · klachten ${s.complaints}/3`,
      bad: s.vol < b.lo || s.vol > b.hi,
      help: `${keycap('1')} zachter · ${keycap('3')} harder · ${keycap('BACKSPACE')} weglopen`,
    });
  };
  return {
    id: regel.id, name: regel.naam, color: KLEUR.telefoonrave, glyph: regel.id, boss: BAAS.telefoonrave,
    kicker: 'Zijmissie', noIntro: false, allowWanted: false, blurb: regel.blurb, tagline: regel.tagline, intro: regel.intro,
    sikkom: (c) => `Rave in het Telefoonhuis: ${c.streak} avonden zonder klacht`,

    anchor(map) { const s = spot(map); return { x: s.x, y: s.y }; },
    start() { return true; },

    round(c) {
      const d = c.data;
      close(c);
      d.dest = spot(c.world.map);
      d.ronde = null;
      d.phase = 'lopen';
    },

    update(dt, c) {
      const { world } = c;
      const d = c.data, p = world.player, input = world.input;
      if (d.phase === 'lopen') {
        if (input.wasPressed('backspace')) { input.consume('backspace'); c.skip('Je laat de knoppen even met rust.'); return; }
        if (dist(p.x, p.y, d.dest.x, d.dest.y) <= 5.5 && !p.inVehicle) {
          d.phase = 'draaien';
          d.ronde = startStadRonde('telefoonrave', c.level);
          c.msg('Achter de mengtafel staat de zaal al te wachten.', 4);
          ensurePanel().show();
          d.open = true;
          paint(c);
        }
        return;
      }
      world.minigameUntil = world.time + 0.25;
      if (input.wasPressed('backspace')) { input.consume('backspace'); close(c); c.skip('Je loopt weg van de mengtafel. Het feest gaat zonder jou door.'); return; }
      let dir = 0;
      for (const [k, v] of [['1', -1], ['arrowdown', -1], ['3', 1], ['arrowup', 1]]) if (input.wasPressed(k)) { input.consume(k); dir = v; }
      for (const e of stapStadRonde(d.ronde, { dir }, dt)) {
        if (STAD_MELDING[e.type] && e.type !== 'leeg') c.msg(STAD_MELDING[e.type], 2.4);
        if (e.type === 'fail') { close(c); c.fail(e.why); return; }
        if (e.type === 'done') {
          close(c);
          const r = stadRondeResultaat(d.ronde);
          c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
          return;
        }
      }
      paint(c);
    },

    view(c) {
      const d = c.data;
      if (!d.dest) return {};
      return {
        marker: d.phase === 'lopen' ? { x: d.dest.x, y: d.dest.y } : null,
        progress: `Telefoonhuis${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
        goal: { label: 'Telefoonhuis', desc: d.phase === 'lopen' ? 'Loop naar de mengtafel' : 'Houd het volume in de groene band' },
      };
    },

    stop(c) { close(c); },
  };
}

export const museumbus = maakRit(STAD_MISSIES[0]);
export const suikerbieten = maakRit(STAD_MISSIES[1]);
export const herstelploeg = maakRit(STAD_MISSIES[2]);
export const oogtv = maakRit(STAD_MISSIES[3]);
export const vandermeden = maakRit(STAD_MISSIES[5]);
export const schouwburg = maakRit(STAD_MISSIES[6]);
export const bernardrit = maakRit(STAD_MISSIES[7]);
export const telefoonrave = maakRave();
export const STAD_JOBS = [museumbus, suikerbieten, herstelploeg, oogtv, telefoonrave, vandermeden, schouwburg, bernardrit];
