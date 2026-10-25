import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { iconDisc, activityBlock } from './activitykit.js';
import { createBoard, mgThema, key, fmtTime, stopPressed, windText, gameUi } from './minigamekit.js';
import { waterAt, waterPolyAt } from './waterlevels.js';
import { buildingAt } from './tileplace.js';
import { WATER_Y } from './util.js';
import { createRegatta, stepRegatta, regattaMedaille, regattaVoortgang, REGATTA, windHoek, windOp, besteTrim } from './zeilrules.js';
import { windSnelheid } from './zeilvaren.js';
import { kiesBaan, richtTijd } from './regattabaan.js';
import { maakBots, stepBots, speelPlaats, plaatsTekst } from './regattabots.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { PLAS, plasBaan, plasBeloning, kiesPlek } from './regattaplas.js';
import { today as calendarToday } from './calendarday.js';
import { Vehicle } from './vehicle.js';
import { BOAT_KINDS } from './boattypes.js';
import { hoofdspeler } from './spelersregister.js';
import { lichaamVan, bestuurInstappenIn, bestuurLos } from './coopbestuur.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedHostBaan, wedBaanStand, wedScoreStop } from './coopwedstrijd.js';

// Zeilregatta (#197): een activiteit die de speler NIET overneemt. Zit je in een zeilboot bij een
// jachthaven, dan start E de regatta: vier tonnen op open water, twee rondes, in volgorde ronden.
// Backspace stopt. De wind komt uit zeilvaren.js (world.wind). Regels: zeilrules.js, baan:
// regattabaan.js. `window.__regatta` debug. Gratis; de medaille hangt aan de tijd. Op de Hoornse Plas (regattaplas.js, #399) ligt een
// lange vaste baan: vijf tonnen, twee ronden, vier tegenstanders en een eigen beloning en record.
const ACCENT = mgThema('regatta').accent; // één bron voor het HUD-thema: minigamekit.js (#453)
const NAAM = 'Zeilregatta';
const STAP_IN = 'Stap in je zeilboot: alleen daarmee tel je mee';
let marinas = null;
let run = null;
let board = null;
let meshes = null;
let hudT = 0;

const isZeil = (v) => !!(v && v.isBoat && v.model && v.model.zeil);
// (a vaarnet patch over a block of houses is water for waterAt, but no ton belongs on a roof: #362)
const waterOk = (map) => (x, y) => { const w = waterAt(map, x, y); return !!(w && w.navigable && w.depth > 1.5) && !buildingAt(map, x, y); };

function loadMarinas() {
  if (marinas || typeof fetch === 'undefined') return;
  marinas = [];
  fetch(new URL('marinas.json', location.href).href).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (j && Array.isArray(j.marinas)) marinas = j.marinas;
  }).catch((e) => console.warn('regatta: marinas niet geladen', e && e.message));
}

// de dichtstbijzijnde jachthaven of de Hoornse Plas (regattaplas.js kiesPlek)
const nearestMarina = (w) => kiesPlek(marinas, w.player.x, w.player.y);

function buildMeshes(tonnen, bots) {
  const g = new THREE.Group();
  const list = tonnen.map((t) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.2, 8), new THREE.MeshLambertMaterial({ color: 0xff7a1a }));
    m.position.set(t.x, WATER_Y + 1.0, t.y);
    const vlag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.9), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    vlag.position.set(0, 1.9, 0);
    m.add(vlag);
    g.add(m);
    return m;
  });
  const botList = (bots || []).map((b) => {
    const boot = new THREE.Group();
    const romp = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.7, 1.6), new THREE.MeshLambertMaterial({ color: 0xf2ede0 }));
    const zeil = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.2, 2.2), new THREE.MeshLambertMaterial({ color: 0xe8453c, emissive: 0x7a2018 })); // emissive: de platte zijkant bleef anders bijna zwart in de schaduw
    zeil.position.set(0, 2.6, 0);
    boot.add(romp, zeil);
    boot.position.set(b.x, WATER_Y + 0.3, b.y);
    g.add(boot);
    return boot;
  });
  const scene = gameUi.getScene();
  if (scene) scene.add(g);
  return { g, list, botList };
}

function removeMeshes() {
  if (!meshes) return;
  const scene = gameUi.getScene();
  if (scene) scene.remove(meshes.g);
  meshes.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  meshes = null;
}

function finish(w, { quit = false, extern = false, uitslag = null } = {}) {
  const r = run;
  if (!r) return;
  if (r.online && !extern) { // de host stopt: de wedstrijdlaag stopt hem voor iedereen (#443)
    if (quit && !r.gestopt) { r.gestopt = true; wedScoreStop(w); }
    return;
  }
  run = null;
  removeMeshes();
  if (board) board.hide();
  if (r.online) { eindeBaan(w, r, uitslag); return; }
  if (quit) { w.addMessage('Regatta gestopt', 2.5); return; }
  // regattaMedaille: 1 = goud ... 3 = brons; MEDALS en de records tellen andersom (3 = goud)
  const rr = r.reg, rm = regattaMedaille(rr), medal = rm ? 4 - rm : 0;
  const plas = !!r.plas, rec = recordChallengeResult(w, plas ? PLAS.record : 'regatta', { value: rr.tijd, medal, lower: true });
  recordStat(w, 'regatta');
  const bel = plas ? plasBeloning(medal) : { geld: [0, 15, 25, 40][medal] || 0, xp: 18 + medal * 3 };
  const premie = loopbaanVerdien(w, 'race', bel.geld, { xp: bel.xp, n: 1, uniek: 'regatta', ...(plas ? { uniek: PLAS.record } : null) }); // loopbaan (#381)
  const plaats = speelPlaats(rr, w.player.x, w.player.y, r.bots);
  const stats = [['Plaats', plaatsTekst(plaats, r.bots.length + 1)], ['Tijd', fmtTime(rr.tijd)], ['Richttijd', fmtTime(rr.richttijd)], ['Tonnen', String(rr.gerond)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  gameUi.showBanner({ kind: medal ? 'pass' : 'fail', title: medal === 3 ? (plas ? 'WINNAAR OP DE HOORNSE PLAS' : 'WINNAAR VAN DE REGATTA') : medal ? 'MOOI GEVAREN' : 'UITGEVAREN', reason: medal ? 'Twee rondes langs alle tonnen' : 'Je was niet snel genoeg voor een medaille: let op de wind', reward: premie, stats });
}

function start(w, sc = null) {
  if (run) return false;
  const near = nearestMarina(w);
  if (!near) return false;
  // de Hoornse Plas heeft een vaste baan (op de tegels gecontroleerd); bij een jachthaven zoekt kiesBaan er een
  const plas = !!near.m.plas;
  const baan = plas ? { tonnen: plasBaan(), vorm: 'plas' } : kiesBaan(near.m.x, near.m.y, waterOk(w.map));
  if (!baan) { w.addMessage('Geen vrij water voor een baan bij deze haven', 3); return false; }
  const rondes = plas ? PLAS.rondes : REGATTA.rondes, snelheid = plas ? PLAS.snelheid : 2.6;
  if (sc) return startBaan(w, sc, near, baan, plas, rondes, snelheid); // samen spelen: een wedstrijd tegen elkaar (#443)
  if (!board) board = createBoard('regatta');
  board.show();
  const bots = maakBots(baan.tonnen, plas ? PLAS.bots : 3);
  meshes = buildMeshes(baan.tonnen, bots);
  // de baan kan een eind van de haven liggen (smal water, #384): de aanloop telt mee in de richttijd en de bots wachten er even mee
  const aanloop = Math.max(0, Math.hypot(baan.tonnen[0].x - w.player.x, baan.tonnen[0].y - w.player.y) - 25) / snelheid;
  run = { reg: createRegatta(baan.tonnen, { rondes, richttijd: Math.round(richtTijd(baan.tonnen, rondes, snelheid) + aanloop) }), bots, baan, haven: near.m.name, flash: null, flashT: 0, aanloop, plas };
  const tel = baan.tonnen.length === 5 ? 'vijf' : 'vier';
  gameUi.showCard(w, { kind: 'tip', kicker: plas ? 'Zeilwedstrijd' : 'Zeilregatta', title: plas ? 'Twee ronden over de Hoornse Plas' : 'Twee rondes langs de tonnen', body: `Ronde de ${tel} tonnen in volgorde, twee keer. Vaar niet recht tegen de wind in: kruis. [Q] haalt het zeil aan, [Z] viert het. [Backspace] stopt.${plas ? ' Een medaille levert geld op: hoe sneller, hoe meer.' : ''}`, duration: 11, key: plas ? 'regatta-plas-help' : 'regatta-help', voice: false });
  return true;
}

// Samen spelen (#443): iedereen dezelfde zeilboot op één startlijn, één aftellen, en de host houdt per deelnemer de tonnen en de
// tijd bij. De schoot staat voor iedereen automatisch goed (besteTrim): het enige verschil is sturen en kruisen, dus eerlijk.
const MAX_DEELN = 4;
function startBaan(w, sc, near, baan, plas, rondes, snelheid) {
  const host = hoofdspeler(w);
  const deeln = sc.deeln.slice(0, MAX_DEELN).map((d) => ({ ...d }));
  const mijn = deeln.find((d) => !d.slot);
  if (mijn && !(host && isZeil(host.inVehicle))) { w.addMessage(STAP_IN, 3); return false; }
  if (!board) board = createBoard('regatta');
  board.show();
  ruimBoten(w); // een vorige wedstrijd: de gasten uit hun oude raceboot en de lege boten weg
  const punten = startLijn(w, baan, deeln.length);
  const richttijd = Math.round(richtTijd(baan.tonnen, rondes, snelheid));
  deeln.forEach((p, k) => {
    const q = punten[k];
    let boot;
    if (!p.slot) { // de host vaart in zijn eigen zeilboot, op de startlijn
      boot = host.inVehicle;
      boot.x = q.x; boot.y = q.y; boot.angle = q.a; boot.speed = 0; boot.sailTop = 0; boot.omgeslagen = 0;
    } else {
      boot = new Vehicle(q.x, q.y, q.a, { ...BOAT_KINDS.zeilboot });
      boot.isBoat = true;
      boot.raceBoat = true;
      boot.waterPoly = waterPolyAt(w.map, q.x, q.y);
      w.vehicles.push(boot);
      const inBoot = bestuurInstappenIn(w, p.slot, boot); // de gast zit meteen in zijn boot en stuurt met zijn stick (#434)
      if (!inBoot.gedaan && w.coopMeld) w.coopMeld(p.slot, 'Stap in je boot en druk op E: bij het aftellen gaat iedereen samen weg.');
    }
    p.boot = boot; p.klaar = false;
    p.reg = createRegatta(baan.tonnen, { rondes, richttijd });
  });
  const bots = maakBots(baan.tonnen, plas ? PLAS.bots : 3);
  meshes = buildMeshes(baan.tonnen, bots);
  const eigen = deeln.find((p) => !p.slot) || deeln[0];
  run = { online: true, deeln, baan, bots, haven: near.m.name, flash: null, flashT: 0, plas, af: 3.5, said: 99, reg: eigen.reg };
  gameUi.showCard(w, { kind: 'tip', kicker: 'Zeilwedstrijd', title: 'Iedereen dezelfde boot', body: 'Ronde de tonnen in volgorde, twee keer. De schoot staat voor iedereen automatisch goed: sturen en kruisen is het enige verschil. [Q] en [Z] doen in een wedstrijd niets. [Backspace] stopt de wedstrijd voor iedereen.', duration: 11, key: 'regatta-wedstrijd-help', voice: false });
  return true;
}

// De startlijn: een rij boten op het water even voor de eerste ton, zodat niemand op de ton begint.
function startLijn(w, baan, n) {
  const b0 = baan.tonnen[0], b1 = baan.tonnen[1] || b0;
  const a = Math.atan2(b1.y - b0.y, b1.x - b0.x);
  const nx = -Math.sin(a), ny = Math.cos(a);
  const ok = waterOk(w.map);
  for (const af of [36, 28, 22]) {
    const cx = b0.x - Math.cos(a) * af, cy = b0.y - Math.sin(a) * af;
    const punten = Array.from({ length: n }, (_, k) => ({ x: cx + nx * (k - (n - 1) / 2) * 7, y: cy + ny * (k - (n - 1) / 2) * 7, a }));
    if (punten.every((q) => ok(q.x, q.y))) return punten;
  }
  return Array.from({ length: n }, (_, k) => ({ x: b0.x + nx * (k - (n - 1) / 2) * 7, y: b0.y + ny * (k - (n - 1) / 2) * 7, a }));
}

// De boot van een deelnemer: de host wat hij bestuurt, een gast het voertuig waar hij in zit.
const bootVan = (w, p) => {
  if (!p.slot) { const h = hoofdspeler(w); return h ? h.inVehicle : null; }
  const l = lichaamVan(w, p.slot);
  return l ? l.inVeh || l.inVehicle || null : null;
};

// Een vorige wedstrijd opruimen: de gasten uit hun oude raceboot en de lege raceboten uit het water (#443).
function ruimBoten(w) {
  for (const slot of Object.keys(w.coopRijders || {})) {
    const r = w.coopRijders[slot];
    if (r && r.v && r.v.raceBoat) bestuurLos(w, +slot);
  }
  for (const v of [...(w.vehicles || [])]) {
    if (!v.raceBoat || v.driver === 'player') continue;
    const i = w.vehicles.indexOf(v);
    if (i >= 0) w.vehicles.splice(i, 1);
  }
}
function updateHud(w) {
  if (!run || !board) return;
  const r = run.reg, p = hoofdspeler(w) || w.player;
  const ton = r.tonnen[r.volgend];
  const afstand = ton ? Math.round(Math.hypot(ton.x - p.x, ton.y - p.y)) : 0;
  const wind = w.wind;
  let plaats = plaatsTekst(speelPlaats(r, p.x, p.y, run.bots), run.bots.length + 1);
  let extra = '';
  if (run.online) { // de stand van alle deelnemers (#443)
    const stand = wedBaanStand(w);
    const totaal = r.tonnen.length * r.rondes;
    plaats = plaatsTekst((stand.find((x) => x.slot === 0) || {}).plek || stand.length || 1, stand.length || run.deeln.length);
    extra = stand.map((x) => `<span>${x.weg ? '<s>' : ''}${x.naam} <b>${x.klaar ? fmtTime(x.tijd) : `${x.banen}/${totaal}`}</b>${x.weg ? '</s>' : ''}</span>`).join('');
  }
  const row = `<span>Tijd <b>${fmtTime(r.t)}</b></span><span>Ronde <b>${Math.min(r.ronde + 1, r.rondes)}/${r.rondes}</b></span><span>Plaats <b>${plaats}</b></span><span>Ton <b>${r.volgend + 1}/${r.tonnen.length}</b> (${afstand} m)</span>${wind ? `<span>${windText(wind)}</span>` : ''}${extra}`;
  const cells = r.tonnen.map((_, i) => ({ t: `${i + 1}`, cls: i < r.volgend ? 'good' : i === r.volgend ? 'on' : '' }));
  board.set({ row, cells, flash: run.flash || '', bad: run.flash === STAP_IN, help: run.online ? `${key('BACKSPACE')} stopt de wedstrijd voor iedereen` : `${key('Q')} zeil aan · ${key('Z')} vieren · ${key('BACKSPACE')} stoppen` });
}

// Samen spelen (#443): één aftellen voor alle boten, dezelfde boot en dezelfde wind voor iedereen, en de host meldt per deelnemer
// de tonnen en de tijd aan de wedstrijdlaag. De finish en de beloning per plek komen van de laag (eind: eindeBaan).
function tickBaan(dt, w) {
  const d = run;
  if (w.pendingRespawn || stopPressed(w.input)) { finish(w, { quit: true }); return; } // de host stopt: voor iedereen
  if (d.af > 0) { // gezamenlijk aftellen: alle boten liggen stil (startLockUntil houdt ook de gasten stil)
    d.af -= dt;
    w.startLockUntil = d.af > 0 ? w.time + 0.25 : 0;
    for (const p of d.deeln) if (p.boot) p.boot.speed = 0;
    const sec = Math.max(0, Math.ceil(d.af - 0.5));
    if (d.said !== sec) { d.said = sec; w.addMessage(sec > 0 ? String(sec) : 'START!', 0.5, { key: 'regatta-count', exact: true }); }
    updateHud(w);
    return;
  }
  const wind = w.wind || windOp(calendarToday(w), Math.floor(w.clock || 12));
  for (const p of d.deeln) {
    const boot = bootVan(w, p);
    if (!boot) continue; // wie (nog) niet in zijn boot zit vaart niet mee
    boot.zeilTrim = besteTrim(windHoek(boot.angle, wind));
    boot.sailTop = boot.omgeslagen > 0 ? 0 : windSnelheid(boot.angle, boot.zeilTrim, wind); // dezelfde boot, dezelfde wind: de schoot staat voor iedereen goed
    const was = p.reg.gerond;
    stepRegatta(p.reg, boot.x, boot.y, dt);
    if (p.reg.gerond > was && !p.slot) {
      d.flash = p.reg.klaar ? 'Over de finish!' : `Ton ${p.reg.gerond}: goed gedaan`;
      d.flashT = 2.5;
      if (meshes) meshes.list.forEach((m, i) => m.material.color.setHex(i < p.reg.volgend || p.reg.klaar ? 0x3adf6a : 0xff7a1a));
    }
    if (p.reg.klaar && !p.klaar) { p.klaar = true; if (p.slot && w.coopMeld) w.coopMeld(p.slot, 'Binnen! De anderen varen door.'); }
    const ton = p.reg.tonnen[p.reg.volgend];
    const af = ton ? Math.hypot(ton.x - boot.x, ton.y - boot.y) : 0;
    wedHostBaan(w, p.slot, { cp: p.reg.gerond, s: p.reg.gerond * 2000 - Math.min(1900, af), klaar: p.reg.klaar, tijd: p.reg.tijd });
  }
  d.reg = (d.deeln.find((p) => !p.slot) || d.deeln[0]).reg; // het bord van de host
  if (d.flashT > 0 && (d.flashT -= dt) <= 0) d.flash = null;
  if (meshes) {
    if (d.reg.t > 0) stepBots(d.bots, d.reg.tonnen, wind, dt, d.reg.t, d.reg.rondes);
    d.bots.forEach((b, i) => { const m = meshes.botList[i]; if (m) { m.position.set(b.x, WATER_Y + 0.3, b.y); m.rotation.y = -b.heading; } });
  }
  updateHud(w);
}

// De uitslag van de wedstrijdlaag: de host ziet de stand, krijgt zijn eigen beloning per plek en de boten gaan vrij.
function eindeBaan(w, r, res) {
  if (!res) { w.addMessage('Regatta gestopt', 2.5); return; }
  const jij = res.jij;
  if (jij) loopbaanVerdien(w, 'race', jij.geld, { xp: jij.xp, n: 1, uniek: r.plas ? PLAS.record : 'regatta', deel: false });
  if (jij && jij.geld > 0) w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4);
  const stats = res.rijen.map((x) => [`${x.plek}. ${x.naam}`, x.tekst || '']);
  gameUi.showBanner({
    kind: jij && jij.plek === 1 ? 'pass' : 'fail',
    title: jij && jij.plek === 1 ? (r.plas ? 'WINNAAR OP DE HOORNSE PLAS' : 'WINNAAR VAN DE REGATTA') : 'DE REGATTA IS GEVAREN',
    reason: jij && jij.weg ? 'Je stopte onderweg: de rest voer door.' : jij && jij.fin ? 'Iedereen dezelfde boot, dezelfde wind' : 'Niet alle tonnen gehad voor de tijd om was',
    reward: jij ? jij.geld : 0,
    stats,
  });
}

function tick(dt, w) {
  loadMarinas();
  if (!run) return;
  if (run.online) { tickBaan(dt, w); return; }
  if (w.pendingRespawn || stopPressed(w.input)) { finish(w, { quit: true }); return; }
  const v = w.player.inVehicle;
  const r = run.reg;
  const was = r.gerond;
  if (isZeil(v)) {
    stepRegatta(r, v.x, v.y, dt);
    if (run.flash === STAP_IN) run.flash = null;
  } else { r.t += dt; run.flash = STAP_IN; }
  if (!r.klaar && w.wind) {
    if (r.t > run.aanloop) stepBots(run.bots, r.tonnen, w.wind, dt, r.t - run.aanloop, r.rondes);
    if (meshes) run.bots.forEach((b, i) => { const m = meshes.botList[i]; if (m) { m.position.set(b.x, WATER_Y + 0.3, b.y); m.rotation.y = -b.heading; } });
  }
  if (r.gerond > was) {
    run.flash = r.klaar ? 'Over de finish!' : `Ton ${r.gerond}: goed gedaan`;
    run.flashT = 2.5;
    if (meshes) meshes.list.forEach((m, i) => m.material.color.setHex(i < r.volgend || r.klaar ? 0x3adf6a : 0xff7a1a));
  } else if (run.flashT > 0 && (run.flashT -= dt) <= 0 && run.flash !== STAP_IN) run.flash = null;
  if (r.klaar) { finish(w); return; }
  if ((hudT -= dt) <= 0) { hudT = 0.1; updateHud(w); }
}

function glyph(ctx) {
  // een zeil: driehoek op een romp
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath(); ctx.moveTo(-0.3, -3.2); ctx.lineTo(2.4, 1.4); ctx.lineTo(-0.3, 1.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-2.8, 2.0); ctx.lineTo(2.8, 2.0); ctx.lineTo(1.8, 3.0); ctx.lineTo(-1.8, 3.0); ctx.closePath(); ctx.fill();
}

const recText = (plas = false) => {
  const r = getChallengeRecord(plas ? PLAS.record : 'regatta');
  return r && r.best != null ? `Record: ${fmtTime(r.best)}${r.medal ? ' · ' + MEDALS[r.medal].toLowerCase() : ''}` : null;
};

export const REGATTA_GAME = {
  id: 'regatta',
  layer: 'regatta',
  legend: { kind: 'act-regatta', label: NAAM, note: 'zeilen langs de tonnen bij een jachthaven of op de Hoornse Plas, tegen de klok' },
  init(w) {
    loadMarinas();
    window.__regatta = {
      marinas: () => (marinas || []).map((m) => ({ id: m.id, name: m.name, x: m.x, y: m.y })),
      start: () => start(w),
      state: () => (run ? { ronde: run.reg.ronde, volgend: run.reg.volgend, t: run.reg.t, klaar: run.reg.klaar, tonnen: run.reg.tonnen } : null),
      voortgang: () => (run ? regattaVoortgang(run.reg) : 0),
      quit: () => { if (!run) return false; finish(w, { quit: true }); return true; },
      ronden: REGATTA.rondes,
      hoek: () => (w.wind && w.player.inVehicle ? windHoek(w.player.inVehicle.angle, w.wind) : null),
    };
  },
  spots: () => [...(marinas || []).map((m) => ({ id: 'regatta-' + m.id, name: `${NAAM} ${m.name}`, x: m.x, y: m.y, mode: 'boat' })), { id: 'regatta-plas', name: PLAS.naam, x: PLAS.x, y: PLAS.y, mode: 'boat' }],
  prompt(w) {
    if (run || !isZeil(w.player.inVehicle)) return null;
    const near = nearestMarina(w);
    if (!near) return null;
    const why = activityBlock(w);
    return { id: 'regatta', x: near.m.x, y: near.m.y, h: 3, key: 'E', label: near.m.plas ? PLAS.naam : NAAM, sub: why || recText(!!near.m.plas) || (near.m.plas ? 'Twee ronden langs vijf tonnen · Hoornse Plas' : `Twee rondes langs vier tonnen · ${near.m.name}`), ring: true, dim: !!why };
  },
  secondary(w) {
    if (run || isZeil(w.player.inVehicle)) return [];
    const near = nearestMarina(w);
    return near ? [{ id: 'regatta-2', x: near.m.x, y: near.m.y, h: 3, label: near.m.plas ? PLAS.naam : NAAM, sub: 'Vaar hier in een zeilboot en druk E', kind: 'place' }] : [];
  },
  interact(w) {
    if (run || !isZeil(w.player.inVehicle) || !nearestMarina(w)) return false;
    const why = activityBlock(w);
    if (why) { w.addMessage(why, 2.5); return true; }
    // samen spelen (#443): met gasten eerst "Meedoen?", daarna de wedstrijd; alleen is het de gewone regatta
    const uit = wedNodigUit(w, 'regatta');
    if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
    return start(w);
  },
  // de speler vaart zelf: geen overname van het spel
  active: () => false,
  quit: (w) => { if (run) finish(w, { quit: true }); },
  update: () => {},
  tick,
  camera: () => {},
  icon(ctx, s) { iconDisc(ctx, s, ACCENT); ctx.save(); ctx.scale(s, s); glyph(ctx); ctx.restore(); },
  mapSub: () => recText() || 'Zeilen langs vier tonnen',
  ubbo: () => null,
};

// --- samen spelen (#443): een wedstrijd tegen elkaar, geregeld door de wedstrijdlaag ----------------
// Iedereen dezelfde zeilboot op één startlijn; de host meldt per deelnemer de tonnen en de tijd (wedHostBaan) en de laag
// houdt de stand, de eerste + de korte klok, de tijdslimiet en de beloning per plek bij (coopwedstrijdbaan.js).
registreerWedstrijd('regatta', {
  naam: 'Zeilregatta', soort: 'baan', vak: 'race', minSpelers: 2,
  opties: (w) => {
    const n = nearestMarina(w), plas = !!(n && n.m.plas);
    return { cps: (plas ? 5 : 4) * (plas ? PLAS.rondes : REGATTA.rondes), cpNaam: 'tonnen', cap: 900, naEerste: 180 };
  },
  start: (w, sc) => start(w, sc),
  plek: (w) => { const n = nearestMarina(w); return n ? { x: n.m.x, y: n.m.y } : null; },
  extra: () => ({ v: run ? (run.plas ? PLAS.naam : 'haven') : 'haven' }),
  // een gast valt weg: hij stapt uit en zijn boot stopt (de rest vaart door)
  weg: (w, sc, slot) => {
    const p = sc.deeln.find((d) => d.slot === slot);
    if (!p) return false;
    bestuurLos(w, slot);
    if (p.boot) { p.boot.speed = 0; p.boot.sailTop = 0; }
    return true;
  },
  eind: (w, res) => { if (run && run.online) finish(w, { extern: true, uitslag: res }); },
  solo: (w) => start(w),
});
// Een gast bij een jachthaven of de Hoornse Plas kan de wedstrijd zelf aanvragen (#452).
zetWedGastHaken('regatta', { dichtbij: (w) => !run && !!nearestMarina(w) });
