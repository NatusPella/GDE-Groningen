import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { iconDisc, activityBlock } from './activitykit.js';
import { createBoard, key, fmtTime, stopPressed, windText, gameUi } from './minigamekit.js';
import { waterAt } from './waterlevels.js';
import { buildingAt } from './tileplace.js';
import { WATER_Y } from './util.js';
import { createRegatta, stepRegatta, regattaMedaille, regattaVoortgang, REGATTA, windHoek } from './zeilrules.js';
import { kiesBaan, richtTijd } from './regattabaan.js';
import { maakBots, stepBots, speelPlaats, plaatsTekst } from './regattabots.js';
import { loopbaanVerdien } from './loopbaanlive.js';

// Zeilregatta (#197): een activiteit die de speler NIET overneemt. Zit je in een zeilboot bij een
// jachthaven, dan start E de regatta: vier tonnen op open water, twee rondes, in volgorde ronden.
// Backspace stopt. De wind komt uit zeilvaren.js (world.wind). Regels: zeilrules.js, baan:
// regattabaan.js. `window.__regatta` debug. Gratis; de medaille hangt aan de tijd.
const ACCENT = '#2a7fd6';
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

const nearestMarina = (w) => {
  const p = w.player;
  let best = null;
  for (const m of marinas || []) {
    const d = Math.hypot(m.x - p.x, m.y - p.y);
    if (d < 120 && (!best || d < best.d)) best = { m, d };
  }
  return best;
};

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

function finish(w, { quit = false } = {}) {
  const r = run;
  if (!r) return;
  run = null;
  removeMeshes();
  if (board) board.hide();
  if (quit) { w.addMessage('Regatta gestopt', 2.5); return; }
  // regattaMedaille: 1 = goud ... 3 = brons; MEDALS en de records tellen andersom (3 = goud)
  const rr = r.reg, rm = regattaMedaille(rr), medal = rm ? 4 - rm : 0;
  const rec = recordChallengeResult(w, 'regatta', { value: rr.tijd, medal, lower: true });
  recordStat(w, 'regatta');
  const premie = loopbaanVerdien(w, 'race', [0, 15, 25, 40][medal] || 0, { xp: 18 + medal * 3, n: 1, uniek: 'regatta' }); // loopbaan (#381)
  const plaats = speelPlaats(rr, w.player.x, w.player.y, r.bots);
  const stats = [['Plaats', plaatsTekst(plaats, r.bots.length + 1)], ['Tijd', fmtTime(rr.tijd)], ['Richttijd', fmtTime(rr.richttijd)], ['Tonnen', String(rr.gerond)]];
  if (medal) stats.push(['Medaille', MEDALS[medal]]);
  if (rec && rec.newBest) stats.push(['Record', 'Nieuw!']);
  gameUi.showBanner({ kind: medal ? 'pass' : 'fail', title: medal === 3 ? 'WINNAAR VAN DE REGATTA' : medal ? 'MOOI GEVAREN' : 'UITGEVAREN', reason: medal ? 'Twee rondes langs alle tonnen' : 'Je was niet snel genoeg voor een medaille: let op de wind', reward: premie, stats });
}

function start(w) {
  if (run) return false;
  const near = nearestMarina(w);
  if (!near) return false;
  const baan = kiesBaan(near.m.x, near.m.y, waterOk(w.map));
  if (!baan) { w.addMessage('Geen vrij water voor een baan bij deze haven', 3); return false; }
  if (!board) board = createBoard('ZEILREGATTA', ACCENT);
  board.show();
  const bots = maakBots(baan.tonnen, 3);
  meshes = buildMeshes(baan.tonnen, bots);
  // de baan kan een eind van de haven liggen (smal water, #384): de aanloop telt mee in de richttijd en de bots wachten er even mee
  const aanloop = Math.max(0, Math.hypot(baan.tonnen[0].x - w.player.x, baan.tonnen[0].y - w.player.y) - 25) / 2.6;
  run = { reg: createRegatta(baan.tonnen, { richttijd: Math.round(richtTijd(baan.tonnen) + aanloop) }), bots, baan, haven: near.m.name, flash: null, flashT: 0, aanloop };
  gameUi.showCard(w, { kind: 'tip', kicker: 'Zeilregatta', title: 'Twee rondes langs de tonnen', body: 'Ronde de vier tonnen in volgorde, twee keer. Vaar niet recht tegen de wind in: kruis. [Q] haalt het zeil aan, [Z] viert het. [Backspace] stopt.', duration: 11, key: 'regatta-help', voice: false });
  return true;
}

function updateHud(w) {
  if (!run || !board) return;
  const r = run.reg, ton = r.tonnen[r.volgend], p = w.player;
  const afstand = ton ? Math.round(Math.hypot(ton.x - p.x, ton.y - p.y)) : 0;
  const wind = w.wind;
  const row = `<span>Tijd <b>${fmtTime(r.t)}</b></span><span>Ronde <b>${Math.min(r.ronde + 1, r.rondes)}/${r.rondes}</b></span><span>Plaats <b>${plaatsTekst(speelPlaats(r, p.x, p.y, run.bots), run.bots.length + 1)}</b></span><span>Ton <b>${r.volgend + 1}/${r.tonnen.length}</b> (${afstand} m)</span>${wind ? `<span>${windText(wind)}</span>` : ''}`;
  const cells = r.tonnen.map((_, i) => ({ t: `${i + 1}`, cls: i < r.volgend ? 'good' : i === r.volgend ? 'on' : '' }));
  board.set({ row, cells, flash: run.flash || '', bad: run.flash === STAP_IN, help: `${key('Q')} zeil aan · ${key('Z')} vieren · ${key('BACKSPACE')} stoppen` });
}

function tick(dt, w) {
  loadMarinas();
  if (!run) return;
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

const recText = () => {
  const r = getChallengeRecord('regatta');
  return r && r.best != null ? `Record: ${fmtTime(r.best)}${r.medal ? ' · ' + MEDALS[r.medal].toLowerCase() : ''}` : null;
};

export const REGATTA_GAME = {
  id: 'regatta',
  layer: 'regatta',
  legend: { kind: 'act-regatta', label: NAAM, note: 'zeilen langs vier tonnen bij een jachthaven, tegen de klok' },
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
  spots: () => (marinas || []).map((m) => ({ id: 'regatta-' + m.id, name: `${NAAM} ${m.name}`, x: m.x, y: m.y, mode: 'boat' })),
  prompt(w) {
    if (run || !isZeil(w.player.inVehicle)) return null;
    const near = nearestMarina(w);
    if (!near) return null;
    const why = activityBlock(w);
    return { id: 'regatta', x: near.m.x, y: near.m.y, h: 3, key: 'E', label: NAAM, sub: why || recText() || `Twee rondes langs vier tonnen · ${near.m.name}`, ring: true, dim: !!why };
  },
  secondary(w) {
    if (run || isZeil(w.player.inVehicle)) return [];
    const near = nearestMarina(w);
    return near ? [{ id: 'regatta-2', x: near.m.x, y: near.m.y, h: 3, label: NAAM, sub: 'Vaar hier in een zeilboot en druk E', kind: 'place' }] : [];
  },
  interact(w) {
    if (run || !isZeil(w.player.inVehicle) || !nearestMarina(w)) return false;
    const why = activityBlock(w);
    if (why) { w.addMessage(why, 2.5); return true; }
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
