import { hoofdspeler } from './players.js';
// Het bijbanenpakket van 22-11 op het sidejob-contract van sidejobs.js: vismarktkoerier (fiets), studentenfeest, boerenmarktkraam en
// toeristengids (te voet, met het DS3-keuzepaneel van choicepanel.js). De regels, de teksten en de beloning staan puur in
// sidejobpack_rules.js (getest in scripts/sidejobpack_test.mjs); dit bestand zet plekken, figuranten en het paneel neer, voedt de
// regels met de invoer en zet de gebeurtenissen om in meldingen, geluid (sfxEvent) en uitbetaling. Alleen tekst, geen opname.
//
// Samen spelen: de baan is van de speler die hem start (eigen voertuig, eigen paneel, eigen beloning en loopbaan, #429). Een gast
// doet via coopbijbaan.js mee als helper (E = extra fooi, bijbaanhulp.js) bij de drie banen te voet; de vismarktkoerier blijft in het
// eigen spel. Wegvallen of later aansluiten verandert niets aan wat een speler al heeft verdiend.
import { pick, kerbSide, nearestOnStreet, spawnPed, pedAlive, holdPed, freePed, walkPed, say, euro, spawnJobVehicle, randomStreetPoint, vehicleSpeed } from './sidejobkit.js';
import { createChoicePanel, keycap } from './choicepanel.js';
import { hulpStap, hulpTip } from './bijbaanhulp.js';
import { dist } from './util.js';
import { accentVan } from './sidejobprofiel.js';
import { ankerMetWeg, STAD } from './bijbaananker.js';
import { sfxEvent } from './sfx/haken.js';
import { storyWorldOpen, storyGateHint } from './storyquery.js';
import { isLoopbaanGestart } from './loopbaanlive.js';
import { PACK_JOBS, PACK_MESSAGE, STEP_G, gateReason, newRound, stepRound, roundResult, goalCount, goalIndex, ringPoints } from './sidejobpack_rules.js';

const REACH = 5.5;
const FAR_LEAVE = 14;
const SHIRTS = ['#e0902f', '#3a7ab8', '#a05ab0', '#6a9a5a', '#d8b030', '#c04a3a'];
const BIKE = { kind: 'bike' };

// De poort van het verhaal: een loopbaan komt pas vrij als het verhaal er een personage aan koppelt (unlockgate.js).
const gate = { open: storyWorldOpen, begun: isLoopbaanGestart, hint: storyGateHint };

const panels = new Map();
const panelOf = (id) => {
  if (!panels.has(id)) panels.set(id, createChoicePanel(accentVan(id)));
  return panels.get(id);
};
function closePanel(c) {
  const p = panels.get(c.job.id);
  if (p) p.hide();
  c.data.open = false;
}

// Een landmark uit de kaart (Vismarkt, Grote Markt, Martinitoren), met open grond ernaast; zonder landmark de vaste terugvalplek.
function poiSpot(map, name, fallback) {
  const lm = ((map.meta && map.meta.landmarks) || []).find((l) => l.name === name);
  const x = lm ? lm.x : fallback[0], y = lm ? lm.y : fallback[1];
  const o = map.findOpenSpawn(x, y, 60);
  return o ? { x: o.x, y: o.y } : { x, y };
}
function placeOf(map, job) {
  const p = job.place;
  if (p.street) {
    const hit = nearestOnStreet(map, p.street, STAD.x, STAD.y, 900);
    if (hit) { const k = kerbSide(map, hit); return { x: k.x, y: k.y }; }
  }
  return poiSpot(map, p.landmark || 'Martinitoren', p.fallback);
}

// Een paar figuranten bij de baan: open grond naast het startpunt.
function crowdSpots(map, base, n = 3) {
  const out = [];
  for (const [dx, dy] of [[3.4, 0.8], [4.6, -1.2], [4.0, 2.2], [5.4, 1.0]].slice(0, n)) {
    const o = map.findOpenSpawn(base.x + dx, base.y + dy, 8);
    out.push(o ? { x: o.x, y: o.y } : { x: base.x + dx, y: base.y + dy });
  }
  return out;
}
function spawnCrowd(c, base, n = 3) {
  return crowdSpots(c.world.map, base, n).map((s, i) => c.track(spawnPed(c.world, s.x, s.y, Math.PI + i * 0.5, { shirt: pick(SHIRTS), bag: false })));
}

// Alles wat alle vier delen: de basis van het contract.
function basis(id) {
  const job = PACK_JOBS[id];
  return {
    id, name: job.name, color: accentVan(id), glyph: job.glyph, boss: job.boss, kicker: 'Bijbaan', noIntro: false, allowWanted: false,
    blurb: job.blurb, tagline: job.tagline, intro: job.intro, job,
    sikkom: (c) => `${job.name} (${job.firm}): ${c.streak} diensten zonder klacht`,
    // de poort van het verhaal: eerst het verhaal, dan de baan; een begonnen loopbaan of een oude save is nooit dicht
    gateStart(c) {
      const why = gateReason(id, gate);
      return why ? `${job.boss}: "Nog niet. ${why}"` : true;
    },
  };
}

// De uitslag in euro's, met de hulp van een meespeler erbij (bijbaanhulp.js): per ronde hooguit HULP_MAX hulpjes.
function finish(c, soort) {
  const d = c.data;
  const r = roundResult(d.round);
  closePanel(c);
  if (d.crowd) for (const q of d.crowd) freePed(q);
  if (r.failed) { c.fail(r.text); return; }
  c.complete({ base: r.base, tip: r.tip + hulpTip(soort, d.help | 0), flawless: r.flawless, text: r.text });
}
function help(c, soort, tekst) {
  const d = c.data;
  if (!d.round || d.ended) return false;
  const h = hulpStap(d.help | 0);
  if (!h.ok) return false;
  d.help = h.help;
  c.msg(`${tekst} Extra fooi: €${hulpTip(soort, h.help)}.`, 3);
  return true;
}

// --- 1. Vismarktkoerier: fiets, doelen langs de weg ------------------------------------------------------------------------------
const fishJob = (() => {
  const id = 'vismarktkoerier', job = PACK_JOBS[id];
  return {
    ...basis(id), vehicleWord: 'je bakfiets',
    anchor(map) {
      const p = poiSpot(map, job.place.landmark, job.place.fallback);
      return ankerMetWeg(map, p, false);
    },
    start(c) {
      const g = this.gateStart(c);
      if (g !== true) return g;
      const v = spawnJobVehicle(c.world, c.spot.x, c.spot.y, BIKE);
      if (!v) return 'Geen fiets beschikbaar';
      c.vehicle = v;
      return true;
    },
    needsVehicle: () => true,
    round(c) {
      const d = c.data;
      d.round = newRound(id, c.level);
      d.goals = [];
      const n = goalCount(d.round);
      let x = c.vehicle.x, y = c.vehicle.y;
      for (let k = 0; k < n; k++) {
        const p = randomStreetPoint(c.world.map, x, y, 220, 520, { drivable: false }) || { x: x + 260, y };
        d.goals.push({ x: p.x, y: p.y });
        x = p.x; y = p.y;
      }
      d.prev = null;
      d.melT = 0;
      c.timeLeft = 140 + n * 90;
      c.msg(job.boss1, 4);
    },
    timeout: () => 'de klok liep af',
    update(dt, c) {
      const d = c.data, v = c.vehicle, { world } = c;
      if (!d.round || dt <= 0) return;
      const goal = d.goals[Math.min(goalIndex(d.round), d.goals.length - 1)];
      const speed = vehicleSpeed(v);
      const prev = d.prev || { speed, angle: v.angle };
      const turn = Math.abs(Math.atan2(Math.sin(v.angle - prev.angle), Math.cos(v.angle - prev.angle))) / dt;
      d.prev = { speed, angle: v.angle };
      const input = { decel: Math.max(0, (prev.speed - speed) / dt), lat: speed * turn, dist: Math.hypot(goal.x - v.x, goal.y - v.y) };
      for (const e of stepRound(d.round, input, dt)) {
        if (e.type === 'shake') {
          if (d.melT < world.time) { c.msg(PACK_MESSAGE.shake, 2.2); d.melT = world.time + 3; }
        } else if (e.type === 'delivered') {
          c.msg(PACK_MESSAGE.delivered, 2.4);
          sfxEvent(world, 'bucket_water', v.x, v.y);   // een vers koelelement in de kist
          sfxEvent(world, 'door_bell_ring', goal.x, goal.y);
        } else if (e.type === 'fail') { c.fail(e.why); return; }
        else if (e.type === 'done') { finish(c, 'koerier'); return; }
      }
    },
    view(c) {
      const d = c.data;
      if (!d.round) return {};
      const i = Math.min(goalIndex(d.round), d.goals.length - 1), goal = d.goals[i], s = d.round.s;
      return {
        marker: { x: goal.x, y: goal.y },
        progress: `${job.firm} · ${Math.min(i + 1, d.goals.length)}/${d.goals.length} · koeling ${Math.round(s.cool * 100)}%`,
        goal: { label: `Restaurant ${Math.min(i + 1, d.goals.length)}`, desc: job.blurb },
      };
    },
    stop(c) { c.msg(job.bossStop, 3); },
  };
})();

// --- 2. Studentenfeest: te voet, keuzepaneel 1, 2 of 3 ---------------------------------------------------------------------------
const partyJob = (() => {
  const id = 'studentenfeest', job = PACK_JOBS[id];
  const paint = (c) => {
    const d = c.data, s = d.round.s, o = s.orders[Math.min(s.i, s.orders.length - 1)];
    panelOf(id).set({
      kicker: `STUDENTENFEEST · GAST ${Math.min(s.i + 1, s.orders.length)} VAN ${s.orders.length}`,
      text: d.line || o.guest.ask,
      options: o.options.map((dr, k) => ({ key: String(k + 1), label: dr.label })),
      meter: { v: 1 - Math.min(1, s.t / s.time), from: null, to: null },
      flash: d.flash || '',
      bad: !!d.bad,
      help: `${keycap('1')}${keycap('2')}${keycap('3')} drankje kiezen · ${keycap('BACKSPACE')} laat maar`,
    });
  };
  return {
    ...basis(id), vehicleWord: 'je dienblad',
    anchor(map) { const p = placeOf(map, job); return { x: p.x, y: p.y }; },
    start(c) { const g = this.gateStart(c); if (g !== true) return g; c.msg(job.boss1, 4); return true; },
    round(c) {
      const d = c.data;
      closePanel(c);
      d.round = newRound(id, c.level);
      d.phase = 'walk'; d.help = 0; d.flash = ''; d.bad = false; d.line = '';
      d.crowd = spawnCrowd(c, c.spot);
      if (c.round === 0) c.msg('Loop naar de bar, tot 5 meter.', 3);
    },
    update(dt, c) {
      const { world } = c;
      const d = c.data, p = hoofdspeler(world), input = world.input;
      const crowd = d.crowd.filter((q) => pedAlive(world, q));
      const lead = crowd[0];
      for (const q of crowd) holdPed(q, p.x, p.y);
      if (d.phase === 'walk') {
        if (input.wasPressed('backspace')) { input.consume('backspace'); for (const q of crowd) freePed(q); c.skip('Je laat de bar even voor wat hij is.'); return; }
        if (dist(p.x, p.y, c.spot.x, c.spot.y) <= REACH && !p.inVehicle && !p.swimming) {
          d.phase = 'serve';
          panelOf(id).show();
          d.open = true;
          c.msg('Het feest barst los: de eerste gast staat al voor je neus.', 3);
          if (lead) say(world, lead, d.round.s.orders[0].guest.ask, 4);
          paint(c);
        }
        return;
      }
      world.minigameUntil = world.time + 0.25;
      if (input.wasPressed('backspace') || input.wasPressed('0')) {
        input.consume('backspace'); input.consume('0');
        closePanel(c); for (const q of crowd) freePed(q);
        c.skip('Je laat de bar achter je. Het feest gaat zonder jou door.');
        return;
      }
      if (dist(p.x, p.y, c.spot.x, c.spot.y) > FAR_LEAVE || p.inVehicle) { closePanel(c); d.phase = 'walk'; return; }
      let pickKey = null;
      for (let k = 0; k < 3; k++) if (input.wasPressed(String(k + 1))) { input.consume(String(k + 1)); pickKey = k; }
      const before = d.round.s.i;
      if (pickKey != null) sfxEvent(world, 'bar_pour', p.x, p.y);
      for (const e of stepRound(d.round, { pick: pickKey }, dt)) {
        if (e.type === 'good') { d.flash = e.fast ? 'Snel en goed: extra fooi' : 'Precies wat de gast wilde'; d.bad = false; say(world, lead, e.text, 3); sfxEvent(world, 'bar_glass_clink', p.x, p.y); }
        else if (e.type === 'wrong') { d.flash = 'Dat was niet wat de gast bedoelde'; d.bad = true; say(world, lead, e.text, 3); sfxEvent(world, 'npc_sigh', p.x, p.y); }
        else if (e.type === 'late') { d.flash = 'Te laat: de gast liep door'; d.bad = true; say(world, lead, e.text, 3); sfxEvent(world, 'npc_cough', p.x, p.y); }
        else if (e.type === 'fail') { closePanel(c); for (const q of crowd) freePed(q); c.fail(e.why); return; }
        else if (e.type === 'done') { sfxEvent(world, 'npc_laugh', p.x, p.y); finish(c, 'bar'); return; }
      }
      if (d.round.s.i !== before) {
        d.line = '';
        const o = d.round.s.orders[d.round.s.i];
        if (o && lead) say(world, lead, o.guest.ask, 4);
      }
      paint(c);
    },
    helperActie(c) {
      const d = c.data;
      if (d.phase !== 'serve') return false;
      return help(c, 'bar', 'Je mede-barkeeper schenkt een rondje mee.');
    },
    view(c) {
      const d = c.data;
      if (!d.round) return {};
      const s = d.round.s;
      return {
        marker: d.phase === 'walk' ? { x: c.spot.x, y: c.spot.y } : null,
        help: d.phase === 'serve',
        progress: `Feest ${Math.min(s.i + 1, s.orders.length)}/${s.orders.length}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
        goal: { label: d.phase === 'walk' ? 'De bar' : 'Schenk het juiste drankje', desc: d.phase === 'walk' ? 'Loop naar de bar, tot 5 meter' : 'Kies 1, 2 of 3 voor de gast ongeduldig wordt' },
      };
    },
    stop(c) { closePanel(c); c.msg(job.bossStop, 3); },
  };
})();

// --- 3. Boerenmarktkraam: te voet, afwegen op gewicht -----------------------------------------------------------------------------
const stallJob = (() => {
  const id = 'marktkraam', job = PACK_JOBS[id];
  const paint = (c) => {
    const d = c.data, s = d.round.s, o = s.orders[Math.min(s.i, s.orders.length - 1)];
    const top = Math.max(1000, Math.ceil(o.target * 2 / 500) * 500);
    ((panelOf(id))).set({
      kicker: `BOERENMARKT · KLANT ${Math.min(s.i + 1, s.orders.length)} VAN ${s.orders.length}`,
      text: d.line || `Ik wil graag ${o.say} ${o.product.name}, dus ${o.target} gram.`,
      options: [
        { key: '1', label: `${STEP_G} gram eraf`, note: 'Minder op de weegschaal' },
        { key: '3', label: `${STEP_G} gram erbij`, note: 'Meer op de weegschaal' },
        { key: '2', label: 'Afrekenen', note: 'Zo is het goed' },
      ],
      meter: { v: Math.min(1, s.grams / top), from: Math.max(0, (o.target - s.tol) / top), to: Math.min(1, (o.target + s.tol) / top) },
      flash: d.flash || `Op de weegschaal: ${s.grams} gram · gevraagd: ${o.target} gram`,
      bad: !!d.bad,
      help: `${keycap('1')} minder · ${keycap('3')} meer · ${keycap('2')} afrekenen · ${keycap('BACKSPACE')} laat maar`,
    });
  };
  return {
    ...basis(id), vehicleWord: 'je weegschaal',
    anchor(map) { const p = placeOf(map, job); return { x: p.x, y: p.y }; },
    start(c) { const g = this.gateStart(c); if (g !== true) return g; c.msg(job.boss1, 4); return true; },
    round(c) {
      const d = c.data;
      closePanel(c);
      d.round = newRound(id, c.level);
      d.phase = 'walk'; d.help = 0; d.flash = ''; d.bad = false; d.line = '';
      d.crowd = spawnCrowd(c, c.spot, 2);
      if (c.round === 0) c.msg('Loop naar de kraam, tot 5 meter.', 3);
    },
    update(dt, c) {
      const { world } = c;
      const d = c.data, p = hoofdspeler(world), input = world.input;
      const crowd = d.crowd.filter((q) => pedAlive(world, q));
      for (const q of crowd) holdPed(q, p.x, p.y);
      if (d.phase === 'walk') {
        if (input.wasPressed('backspace')) { input.consume('backspace'); for (const q of crowd) freePed(q); c.skip('Je laat de kraam even met rust.'); return; }
        if (dist(p.x, p.y, c.spot.x, c.spot.y) <= REACH && !p.inVehicle && !p.swimming) {
          d.phase = 'weigh';
          panelOf(id).show();
          d.open = true;
          c.msg('De eerste klant staat al bij de kraam.', 3);
          paint(c);
        }
        return;
      }
      world.minigameUntil = world.time + 0.25;
      if (input.wasPressed('backspace') || input.wasPressed('0')) {
        input.consume('backspace'); input.consume('0');
        closePanel(c); for (const q of crowd) freePed(q);
        c.skip('Je laat de kraam achter je. Aaltje neemt het wel over.');
        return;
      }
      if (dist(p.x, p.y, c.spot.x, c.spot.y) > FAR_LEAVE || p.inVehicle) { closePanel(c); d.phase = 'walk'; return; }
      let dir = 0, confirm = false;
      if (input.wasPressed('1')) { input.consume('1'); dir = -1; }
      if (input.wasPressed('3')) { input.consume('3'); dir = 1; }
      if (input.wasPressed('2')) { input.consume('2'); confirm = true; }
      if (dir) sfxEvent(world, 'ui_slider_tick', p.x, p.y);
      for (const e of stepRound(d.round, { dir, confirm }, dt)) {
        if (e.type === 'hen') { d.flash = e.text; d.bad = true; sfxEvent(world, 'chicken_cluck', p.x, p.y); c.msg(e.text, 3); }
        else if (e.type === 'perfect') { d.flash = `Precies ${e.grams} gram: de klant is blij`; d.bad = false; sfxEvent(world, 'shop_sell_bills', p.x, p.y); }
        else if (e.type === 'close') { d.flash = `${e.grams} gram: dichtbij genoeg`; d.bad = false; sfxEvent(world, 'shop_drawer', p.x, p.y); }
        else if (e.type === 'over') { d.flash = `${e.grams} gram: te veel weggegeven`; d.bad = true; sfxEvent(world, 'shop_bag_rustle', p.x, p.y); }
        else if (e.type === 'under') { d.flash = `${e.grams} gram: dat is te weinig, een klacht`; d.bad = true; sfxEvent(world, 'npc_sigh', p.x, p.y); }
        else if (e.type === 'gone') { d.flash = e.text; d.bad = true; sfxEvent(world, 'npc_sigh', p.x, p.y); }
        else if (e.type === 'fail') { closePanel(c); for (const q of crowd) freePed(q); c.fail(e.why); return; }
        else if (e.type === 'done') { finish(c, 'kraam'); return; }
      }
      paint(c);
    },
    helperActie(c) {
      const d = c.data;
      if (d.phase !== 'weigh') return false;
      return help(c, 'kraam', 'Je kraamhulp pakt de zakjes aan.');
    },
    view(c) {
      const d = c.data;
      if (!d.round) return {};
      const s = d.round.s;
      return {
        marker: d.phase === 'walk' ? { x: c.spot.x, y: c.spot.y } : null,
        help: d.phase === 'weigh',
        progress: `Kraam ${Math.min(s.i + 1, s.orders.length)}/${s.orders.length}${c.earned ? ` · verdiend ${euro(c.earned)}` : ''}`,
        goal: { label: d.phase === 'walk' ? 'De kraam' : 'Weeg af', desc: d.phase === 'walk' ? 'Loop naar de kraam, tot 5 meter' : '1 minder, 3 meer, 2 afrekenen' },
      };
    },
    stop(c) { closePanel(c); c.msg(job.bossStop, 3); },
  };
})();

// --- 4. Toeristengids: te voet, drie stops rond de toren -------------------------------------------------------------------------
const guideJob = (() => {
  const id = 'toeristengids', job = PACK_JOBS[id];
  const paint = (c) => {
    const d = c.data, s = d.round.s, stop = s.stopsOf[Math.min(s.i, s.stopsOf.length - 1)];
    panelOf(id).set({
      kicker: `MARTINITOREN · STOP ${Math.min(s.i + 1, s.n)} VAN ${s.n} · ${stop.tourist.who.toUpperCase()}`,
      text: d.line || stop.tourist.ask,
      options: stop.options.map((o, k) => ({ key: String(k + 1), label: o.label })),
      meter: { v: Math.max(0, Math.min(1, s.attention)), from: null, to: null },
      flash: d.flash || `Aandacht van de groep: ${Math.round(s.attention * 100)}%`,
      bad: !!d.bad,
      help: `${keycap('1')}${keycap('2')}${keycap('3')} verhaal kiezen · ${keycap('BACKSPACE')} laat maar`,
    });
  };
  return {
    ...basis(id), vehicleWord: 'je gidsvlaggetje',
    anchor(map) { const p = placeOf(map, job); return { x: p.x, y: p.y }; },
    start(c) { const g = this.gateStart(c); if (g !== true) return g; c.msg(job.boss1, 4); return true; },
    round(c) {
      const d = c.data;
      closePanel(c);
      d.round = newRound(id, c.level);
      d.phase = 'walk'; d.help = 0; d.flash = ''; d.bad = false; d.line = '';
      const pts = ringPoints(c.spot.x, c.spot.y, d.round.s.n);
      d.stops = pts.map((q) => { const o = c.world.map.findOpenSpawn(q.x, q.y, 18); return o ? { x: o.x, y: o.y } : q; });
      d.crowd = spawnCrowd(c, c.spot, 3);
      if (c.round === 0) c.msg('Loop met de groep naar de stops: de markering laat de eerste zien.', 3.5);
    },
    update(dt, c) {
      const { world } = c;
      const d = c.data, p = hoofdspeler(world), input = world.input;
      const s = d.round.s;
      const crowd = d.crowd.filter((q) => pedAlive(world, q));
      const stop = d.stops[Math.min(s.i, d.stops.length - 1)];
      if (input.wasPressed('backspace') && d.phase === 'walk') { input.consume('backspace'); for (const q of crowd) freePed(q); c.skip('Je laat de groep zelf een terras zoeken.'); return; }
      if (s.phase === 'walk') {
        // de groep loopt vooruit naar de stop, de gids volgt: ze wachten niet op elkaar
        crowd.forEach((q, k) => walkPed(world, q, stop.x + (k - 1) * 1.6, stop.y + k * 0.8, 1.5, dt, 1.5));
        if (d.open) { closePanel(c); }
      } else for (const q of crowd) holdPed(q, p.x, p.y);
      if (s.phase === 'tell') {
        world.minigameUntil = world.time + 0.25;
        if (!d.open) { panelOf(id).show(); d.open = true; }
        if (input.wasPressed('backspace') || input.wasPressed('0')) {
          input.consume('backspace'); input.consume('0');
          closePanel(c); for (const q of crowd) freePed(q);
          c.skip('Je laat de groep staan. Ze vinden zelf wel een terras.');
          return;
        }
      }
      let pickKey = null;
      if (s.phase === 'tell') for (let k = 0; k < 3; k++) if (input.wasPressed(String(k + 1))) { input.consume(String(k + 1)); pickKey = k; }
      const lead = crowd[0];
      const wasPhase = s.phase;
      for (const e of stepRound(d.round, { dist: dist(p.x, p.y, stop.x, stop.y), pick: pickKey }, dt)) {
        if (e.type === 'arrive') {
          d.flash = ''; d.bad = false; d.line = '';
          c.msg(PACK_MESSAGE.arrive, 2.6);
          sfxEvent(world, 'church_bell', stop.x, stop.y);
          if (lead) say(world, lead, s.stopsOf[s.i].tourist.ask, 4);
        } else if (e.type === 'good') { d.flash = 'Raak: de groep hangt aan je lippen'; d.bad = false; say(world, lead, e.text, 3.5); sfxEvent(world, 'npc_chuckle', p.x, p.y); }
        else if (e.type === 'wrong') { d.flash = 'Niet wat de groep wilde horen'; d.bad = true; say(world, lead, e.text, 3.5); sfxEvent(world, 'npc_cough', p.x, p.y); }
        else if (e.type === 'quiet') { d.flash = 'Stilte: de groep kijkt op zijn horloge'; d.bad = true; say(world, lead, e.text, 3); sfxEvent(world, 'npc_sigh', p.x, p.y); }
        else if (e.type === 'fail') { closePanel(c); for (const q of crowd) freePed(q); c.fail(e.why); return; }
        else if (e.type === 'done') { sfxEvent(world, 'npc_laugh', p.x, p.y); finish(c, 'gids'); return; }
      }
      if (s.phase === 'walk' && wasPhase === 'tell') closePanel(c); // het verhaal is verteld: op naar de volgende stop
      if (s.phase === 'tell') {
        if (!d.open) { panelOf(id).show(); d.open = true; }
        paint(c);
      }
    },
    helperActie(c) {
      const d = c.data;
      if (!d.round || d.round.s.phase !== 'tell') return false;
      return help(c, 'gids', 'Je mede-gids vult het verhaal aan.');
    },
    view(c) {
      const d = c.data;
      if (!d.round || !d.stops) return {};
      const s = d.round.s;
      const i = Math.min(goalIndex(d.round), d.stops.length - 1);
      return {
        marker: s.phase === 'walk' ? { x: d.stops[i].x, y: d.stops[i].y } : null,
        help: s.phase === 'tell',
        progress: `Tour ${Math.min(i + 1, s.n)}/${s.n} · aandacht ${Math.round(s.attention * 100)}%`,
        goal: { label: s.phase === 'walk' ? `Stop ${i + 1}` : 'Vertel de groep iets', desc: s.phase === 'walk' ? 'Loop naar de stop, tot 5 meter' : 'Kies het verhaal dat ze willen horen' },
      };
    },
    stop(c) { closePanel(c); c.msg(job.bossStop, 3); },
  };
})();

export const PACK_SIDE_JOBS = [fishJob, partyJob, stallJob, guideJob];
