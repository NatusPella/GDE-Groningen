import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, prewarmStreamAt } from './scene3d.js';
import { Vehicle } from './vehicle.js';
import { attachPlane, makeStrip } from './planecontrol.js';
import { PLANE_MODEL } from './planeflight.js';
import { makeHeli, HELI_MODEL, helipadById } from './heliflight.js';
import { standActivity } from './standactivity.js';
import { createBoard, key, stopPressed } from './minigamekit.js';
import { gameUi } from './minigamekit.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { loopbaanVerdien, loopbaanTel } from './loopbaanlive.js';
import { assistGate, assistTime } from './assistlive.js';
import { pointInPolygon, WATER_Y } from './util.js';
import { waterAt } from './waterlevels.js';
import * as R from './vliegschoolrules.js';

// Vliegschool De Windwijzer bij Groningen Airport Eelde (#397), naast Rotor Roelf: dertien korte lessen met het
// vliegtuig (Kist Kees) en de helikopter (de Wieken Wubbo), met een medaille en een beloning per les, en punten in het
// vak Lucht van de Loopbaan. De regels, banen en het oordeel staan in vliegschoolrules.js (getest, met het arcade-
// vliegtuig door elke les); de gemeten plekken (water, velden, molens, openingen tussen hoge gebouwen) in
// game/vliegplekken.json (scripts/world/vliegplekken.mjs). Dit bestand is de lijm: de lesvliegtuigen, de ringen en
// markeringen, het bord en de uitslag. Het toestel wordt gevlogen door de gewone vlieg-code (player.update): de les
// kijkt alleen mee. Een crash kost niets (het toestel is van de school) en eindigt de les.
// `window.__vliegschool` (debug): stand(), start(id), state(), finish(), quit(), lessen().
const ACCENT = '#e7b83a';
const DEALER = { x: 1764.51, y: 9959.94 };
const INTRO_S = 3.2;
const SCHOOL_HEALTH = 400;

let worldRef = null;
let plekken = null;
let game = null;       // { fase: 'menu'|'intro'|'vlieg', ... }
let board = null;
let standCache = null;
let menu = { kist: null, cursor: 0 };

// --- de gemeten plekken -----------------------------------------------------------------------------------------
function laadPlekken() {
  if (plekken || typeof fetch === 'undefined' || typeof location === 'undefined') return;
  fetch(new URL('vliegplekken.json', location.href).href).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && j.v === 1) plekken = j; }).catch(() => {});
}

// --- de plek van de school ---------------------------------------------------------------------------------------
function stand() {
  const w = worldRef;
  const s = w && w.planeStrip;
  if (standCache && (standCache.strip || !s)) return standCache;
  const q = s ? s.point(14, -20) : { x: DEALER.x + 22, y: DEALER.y - 14 };
  const o = (w && w.map && w.map.findOpenSpawn && w.map.findOpenSpawn(q.x, q.y, 25)) || q;
  standCache = { x: o.x, y: o.y, strip: !!s };
  return standCache;
}

// --- de omgeving voor de regels -----------------------------------------------------------------------------------------
const groundAt = (map) => (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);

function roofAtFn(map) {
  return (x, y) => {
    let top = 0;
    for (const b of map.buildingsNear ? map.buildingsNear(x, y, 1) : []) {
      const [x0, y0, x1, y1] = b.bounds;
      if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, b.pts)) continue;
      top = Math.max(top, Number.isFinite(b.hm) ? b.hm : (b.h || 3) * 3.1);
    }
    return top;
  };
}

// De hoogte van de ondergrond onder het toestel: het wateroppervlak boven open water, anders de grond.
function surfaceZ(map, x, y) {
  const wq = waterAt(map, x, y);
  return wq ? wq.level : groundAt(map)(x, y);
}

function makeEnv(w) {
  const strip = w.planeStrip || null;
  const pad = helipadById('eelde');
  return {
    plekken: plekken || {}, eelde: (plekken && plekken.eelde) || DEALER, strip,
    pad: pad ? { x: pad.x, y: pad.y, r: pad.r, z: pad.z } : null,
    ground: groundAt(w.map), roofAt: roofAtFn(w.map),
  };
}

// --- records, medailles ---------------------------------------------------------------------------------------------------
const recId = (id) => 'vlieg-' + id;
const besteMedaille = (id) => { const r = getChallengeRecord(recId(id)); return r ? r.medal || 0 : 0; };
function stand_van_zaken() {
  let gehaald = 0, goud = 0;
  for (const id of R.LES_IDS) { const m = besteMedaille(id); if (m > 0) gehaald++; if (m === 3) goud++; }
  return { gehaald, goud, totaal: R.LES_IDS.length };
}
function recText() {
  const s = stand_van_zaken();
  return s.gehaald ? `Lessen: ${s.gehaald} van ${s.totaal} gehaald${s.goud ? ` · ${s.goud}× goud` : ''}` : null;
}

// --- de 3D-markeringen ---------------------------------------------------------------------------------------------------
const mat = (color, opacity = 0.85) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, fog: false });
const KLEUR = { volgende: 0xffc21a, later: 0xffe9a0, goed: 0x5dff7a, fout: 0xff5a3c, rand: 0x3ad0ff };

function ringMesh(g, r, kleur) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, Math.max(0.5, r * 0.05), 8, 44), mat(kleur, 0.9));
  m.position.set(g.x, g.z, g.y);
  m.rotation.y = Math.atan2(g.nx, g.ny);
  m.frustumCulled = false;
  return m;
}

function bouwMarkeringen(w, baan) {
  const scene = getScene();
  if (!scene) return null;
  const grp = new THREE.Group();
  grp.name = 'vliegschool';
  const gh = groundAt(w.map);
  const lijst = { ringen: [], palen: [], doel: null };
  const kolom = (x, y, hoogte, straal, kleur, opacity = 0.35) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(straal, straal, hoogte, 14, 1, true), mat(kleur, opacity));
    m.position.set(x, gh(x, y) + hoogte / 2, y);
    m.frustumCulled = false;
    grp.add(m);
    return m;
  };
  const vlak = (x, y, breedte, lengte, hoek, kleur, hoogte, opacity = 0.4) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(lengte, breedte), mat(kleur, opacity));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = hoek;
    m.position.set(x, hoogte, y);
    m.frustumCulled = false;
    grp.add(m);
    return m;
  };
  switch (baan.soort) {
    case 'ringen':
      baan.ringen.forEach((g, i) => { const m = ringMesh(g, g.r, i === 0 ? KLEUR.volgende : KLEUR.later); grp.add(m); lijst.ringen.push(m); });
      break;
    case 'landen': {
      const m = baan.merk;
      if (baan.kist === 'vliegtuig') {
        const s = baan.baan;
        vlak(m.x, m.y, s.width * 0.9, 4, -s.heading, 0xffd23f, gh(m.x, m.y) + 0.25, 0.85);
        vlak(m.x, m.y, s.width * 0.9, 60, -s.heading, 0xffd23f, gh(m.x, m.y) + 0.2, 0.18);
      } else {
        const schijf = new THREE.Mesh(new THREE.CircleGeometry(m.r * 1.1, 40), mat(0xffd23f, 0.3));
        schijf.rotation.x = -Math.PI / 2;
        schijf.position.set(m.x, (m.z === undefined ? gh(m.x, m.y) : m.z) + 0.3, m.y);
        schijf.frustumCulled = false;
        grp.add(schijf);
      }
      kolom(m.x, m.y, 200, 3, 0xffd23f, 0.3);
      break;
    }
    case 'water': {
      const c = baan.corridor, wq = waterAt(w.map, (c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2);
      const niveau = wq ? wq.level : WATER_Y;
      const mx = (c.a.x + c.b.x) / 2, my = (c.a.y + c.b.y) / 2;
      vlak(mx, my, c.breed * 2, c.lengte, -c.hoek, KLEUR.goed, niveau + baan.band.lo, 0.22);
      vlak(mx, my, c.breed * 2, c.lengte, -c.hoek, KLEUR.volgende, niveau + baan.band.hi, 0.2);
      kolom(c.a.x, c.a.y, 120, 3, KLEUR.goed, 0.3);
      kolom(c.b.x, c.b.y, 120, 3, KLEUR.volgende, 0.3);
      break;
    }
    case 'slalom':
      baan.molens.forEach((m) => {
        const k = kolom(m.x, m.y, baan.kist === 'vliegtuig' ? 260 : 160, 4, m.kant > 0 ? KLEUR.goed : KLEUR.rand, 0.28);
        lijst.palen.push(k);
      });
      break;
    case 'nood': {
      const v = baan.veld;
      vlak(v.x, v.y, v.breed, v.lengte, -v.heading, 0xffd23f, gh(v.x, v.y) + 0.3, 0.3);
      vlak(v.x, v.y, 3, v.lengte, -v.heading, 0xffd23f, gh(v.x, v.y) + 0.35, 0.8);
      kolom(v.x, v.y, 180, 3, 0xffd23f, 0.3);
      break;
    }
    case 'opening':
      baan.poorten.forEach((g) => {
        const gz = gh(g.x, g.y);
        const t = { x: -g.ny, y: g.nx };
        const hoek = Math.atan2(-g.nx, -g.ny);
        const balk = (b, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, d), mat(0xffc21a, 0.9)); m.position.set(px, pz, py); m.rotation.y = hoek; m.frustumCulled = false; grp.add(m); };
        balk(g.breedte, 0.6, 0.6, g.x, g.y, gz + g.hi);
        for (const zij of [-1, 1]) balk(0.6, g.hi, 0.6, g.x + t.x * zij * g.breedte / 2, g.y + t.y * zij * g.breedte / 2, gz + g.hi / 2);
        lijst.palen.push(kolom(g.x, g.y, g.hi + 120, 2.5, KLEUR.volgende, 0.22));
      });
      break;
    case 'hoveren': {
      const k = baan.cirkel;
      const schijf = new THREE.Mesh(new THREE.CircleGeometry(k.r, 40), mat(0xffd23f, 0.45));
      schijf.rotation.x = -Math.PI / 2;
      schijf.position.set(k.x, gh(k.x, k.y) + 0.3, k.y);
      schijf.frustumCulled = false;
      grp.add(schijf);
      const cil = new THREE.Mesh(new THREE.CylinderGeometry(k.r, k.r, baan.band.hi, 24, 1, true), mat(0xffd23f, 0.12));
      cil.position.set(k.x, gh(k.x, k.y) + baan.band.hi / 2, k.y);
      cil.frustumCulled = false;
      grp.add(cil);
      break;
    }
    default: break;
  }
  scene.add(grp);
  lijst.grp = grp;
  return lijst;
}

function ruimMarkeringenOp(m) {
  if (!m || !m.grp) return;
  const scene = getScene();
  if (scene) scene.remove(m.grp);
  m.grp.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}

// De ringen worden groen of rood zodra ze gehad zijn, de eerstvolgende is geel.
function kleurRingen(g) {
  const m = g.marks, st = g.st;
  if (!m || !m.ringen.length) return;
  m.ringen.forEach((r, i) => {
    const kleur = i < st.i ? (g.gehad[i] === 'goed' ? KLEUR.goed : KLEUR.fout) : i === st.i ? KLEUR.volgende : KLEUR.later;
    if (r.material.color.getHex() !== kleur) r.material.color.setHex(kleur);
  });
}

// --- de toestellen ---------------------------------------------------------------------------------------------------------
function maakKist(w, les, baan) {
  const s = baan.start;
  let v;
  if (les.kist === 'vliegtuig') {
    v = new Vehicle(s.x, s.y, s.heading, { ...PLANE_MODEL });
    v.isPlane = true;
    v.name = 'Schoolkist';
    attachPlane(v, s.x, s.y, s.z, s.heading);
    const p = v.plane;
    p.onGround = false; p.speed = s.speed; p.throttle = baan.gas || 0.6;
    v.planeCtl.thr = baan.gas || 0.6;
    v.speed = s.speed; v.onGround = false; v.airborne = true;
    v.groundZ = groundAt(w.map)(s.x, s.y);
  } else {
    v = makeHeli(s.x, s.y, s.z, s.heading, { ...HELI_MODEL, color: '#e8e6e0' });
    v.name = 'Schoolheli';
    v.onGround = false; v.rotor = 1; v.groundZ = groundAt(w.map)(s.x, s.y);
  }
  v.missionCar = true;
  v.playerOwned = false;
  v.schoolKist = true;
  v.health = SCHOOL_HEALTH;
  w.vehicles.push(v);
  return v;
}

function steekIn(w, v) {
  const p = w.player;
  p.x = v.x; p.y = v.y; p.angle = v.angle; p.vx = p.vy = 0;
  p.enterVehicle(v, w);
  w.camYaw = v.angle;
  w.input.reset();
}

// --- een les starten -------------------------------------------------------------------------------------------------------
function startLes(w, id) {
  const les = R.lesVan(id);
  if (!les || !game) return false;
  if (!plekken) { w.addMessage('De lesplekken laden nog, een momentje', 2.5); return false; }
  const env = makeEnv(w);
  const why = R.beschikbaar(les, env);
  if (why) { w.addMessage(why, 3); return false; }
  const baan = R.bouwBaan(les, env);
  if (!baan) { w.addMessage('Deze les kan hier niet', 3); return false; }
  const v = maakKist(w, les, baan);
  const g = game;
  g.les = les; g.baan = baan; g.st = R.nieuweStaat(les, baan);
  g.v = v; g.fase = 'intro'; g.t = 0; g.hint = ''; g.flash = null; g.gehad = []; g.vorigOnGround = false;
  g.vorigeStrip = w.planeStrip || null;
  if (les.kist === 'vliegtuig') {
    if (baan.soort === 'landen') w.planeStrip = baan.baan;
    else if (baan.soort === 'nood') w.planeStrip = makeStrip({ x: baan.veld.x - Math.cos(baan.veld.heading) * baan.veld.lengte / 2, y: baan.veld.y - Math.sin(baan.veld.heading) * baan.veld.lengte / 2, heading: baan.veld.heading, length: baan.veld.lengte, width: baan.veld.breed });
    else w.planeStrip = null;
  }
  g.marks = bouwMarkeringen(w, baan);
  prewarmStreamAt(baan.start.x, baan.start.y, 8);
  const d0 = R.doel(les, baan, g.st, makeEnv(w));
  if (d0) prewarmStreamAt(d0.x, d0.y, 8);
  steekIn(w, v);
  const s = stand();
  w.companionHold = { x: s.x, y: s.y, face: 0 };
  menuSluit();
  gameUi.showCard(w, { kind: 'tip', kicker: R.INSTRUCTEUR, title: les.titel, body: R.LIJNEN[id].uitleg, duration: 10, key: 'vliegschool-' + id, voice: false });
  return true;
}

// --- het einde van een les --------------------------------------------------------------------------------------------------
function opruimen(w, { naarSchool = true } = {}) {
  const g = game;
  if (!g) return;
  if (g.marks) ruimMarkeringenOp(g.marks);
  const v = g.v;
  const p = w.player;
  if (v) {
    v.driver = null; v.passenger = null;
    const i = w.vehicles.indexOf(v);
    if (i >= 0) w.vehicles.splice(i, 1);
    if (p.inVehicle === v) p.inVehicle = null;
  }
  if (g.vorigeStrip !== undefined && g.les && g.les.kist === 'vliegtuig') w.planeStrip = g.vorigeStrip;
  if (naarSchool) {
    const s = stand();
    p.x = s.x; p.y = s.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; p.speed = 0; p.moving = false;
    p.gz = groundAt(w.map)(s.x, s.y);
    p.angle = 0;
    p.water = null; p.swimming = false; p.climb = null;
    w.camYaw = p.angle;
  }
  w.companionHold = null;
  w.cameraOverride = null;
  w.input.reset();
  g.v = null; g.marks = null; g.les = null; g.baan = null; g.st = null;
}

function eindig(w, { afgebroken = false } = {}) {
  const g = game;
  if (!g) return;
  if (g.fase === 'menu' || !g.les) { sluitAlles(w); return; }
  const les = g.les, baan = g.baan, st = g.st;
  const uit = R.beoordeel(les, baan, st);
  const eerder = besteMedaille(les.id);
  let geld = 0, rec = null;
  if (!afgebroken) {
    rec = recordChallengeResult(w, recId(les.id), { value: uit.punten, medal: uit.medaille });
    recordStat(w, 'vliegschoolLessen');
    const b = R.beloning(uit.medaille, eerder);
    if (uit.medaille > 0) {
      geld = loopbaanVerdien(w, 'lucht', b.geld, { xp: b.xp, n: 1, uniek: 'vliegschool-' + les.id, rubriek: 'Overig inkomsten' });
      unlockAchievement(w, 'vlieg_geslaagd');
      if (uit.medaille === 3) unlockAchievement(w, 'vlieg_goud');
      if (R.LES_IDS.every((x) => x === les.id ? true : besteMedaille(x) > 0)) unlockAchievement(w, 'vlieg_brevet');
    } else loopbaanTel(w, 'lucht', { n: 1, xp: 2 });
  }
  opruimen(w);
  const regels = [...uit.regels];
  if (uit.medaille) regels.push(['Medaille', MEDALS[uit.medaille]]);
  if (rec && rec.newBest) regels.push(['Record', 'Nieuw!']);
  const zin = uit.medaille === 3 ? R.LIJNEN.eind.goud : uit.medaille === 2 ? R.LIJNEN.eind.zilver : uit.medaille === 1 ? R.LIJNEN.eind.brons : R.LIJNEN.eind.geen;
  if (afgebroken) w.addMessage('Les gestopt', 2.5);
  else gameUi.showBanner({ kind: uit.medaille ? 'pass' : 'fail', title: uit.medaille === 3 ? 'GOUD IN DE LUCHT' : uit.medaille ? les.titel.toUpperCase() + ' GEHAALD' : 'NOG EVEN OEFENEN', reason: uit.medaille ? `${R.INSTRUCTEUR}: ${zin[Math.floor(Math.random() * zin.length)]}` : (uit.reden ? `${uit.reden}. ${zin[0]}` : zin[0]), reward: geld, stats: regels });
  game.fase = 'menu';
  menu.kist = les.kist;
  menu.cursor = R.lessenVan(les.kist).findIndex((l) => l.id === les.id);
  openMenu(w);
}

function sluitAlles(w) {
  if (!game) return;
  opruimen(w, { naarSchool: false });
  game = null;
  menuSluit();
  if (board) board.hide();
  w.activityGame = null;
}

// --- het menu ---------------------------------------------------------------------------------------------------------------
function openMenu(w) {
  if (!board) board = createBoard(R.SCHOOL.toUpperCase(), ACCENT);
  board.show();
  w.companionHold = w.companionHold || (() => { const s = stand(); return { x: s.x, y: s.y, face: 0 }; })();
}
function menuSluit() { /* het bord blijft staan voor het vliegen */ }

const medaljeTekst = (m) => (m ? '★'.repeat(m) : '');
function tekenMenu() {
  if (!board || !game || game.fase !== 'menu') return;
  if (!menu.kist) {
    const s = stand_van_zaken();
    board.set({
      row: `<span>${R.INSTRUCTEUR}: moi, welkom! Kies een toestel</span><span>Lessen gehaald <b>${s.gehaald}/${s.totaal}</b></span>`,
      cells: [{ t: '1 Vliegtuig', key: '1', cls: 'on' }, { t: '2 Helikopter', key: '2', cls: 'on' }],
      flash: '', help: `${key('1')} ${key('2')} kiezen · ${key('BACKSPACE')} sluiten`,
    });
    return;
  }
  const lessen = R.lessenVan(menu.kist);
  const les = lessen[menu.cursor] || lessen[0];
  const m = besteMedaille(les.id);
  const r = getChallengeRecord(recId(les.id));
  board.set({
    row: `<span><b>${les.titel}</b> · ${les.kort}</span>${r && r.best != null ? `<span>Beste <b>${Math.round(r.best)}</b> punten</span>` : ''}${m ? `<span>${R.MEDAL_NAMEN[m]}</span>` : ''}`,
    cells: lessen.map((l, i) => ({ t: `${i + 1} ${korteNaam(l)} ${medaljeTekst(besteMedaille(l.id))}`.trim(), key: String(i + 1), cls: i === menu.cursor ? 'on' : besteMedaille(l.id) ? 'good' : '' })),
    flash: game.melding || '',
    bad: !!game.melding,
    help: `${key('1')}-${key(String(lessen.length))} of ${key('A')}${key('D')} en ${key('ENTER')} kiezen · ${key('BACKSPACE')} terug`,
  });
}
const korteNaam = (l) => ({ ringen: 'Ringen', landen: 'Landen', water: 'Water', slalom: 'Slalom', nood: 'Nood', opening: 'Opening', hoveren: 'Hoveren' }[l.soort] || l.titel);

function updateMenu(w, dt) {
  const g = game, input = w.input;
  if (g.melding) { g.meldingT -= dt; if (g.meldingT <= 0) g.melding = ''; }
  if (stopPressed(input)) { if (menu.kist) { menu.kist = null; menu.cursor = 0; } else sluitAlles(w); return; }
  const pressed = (k) => { if (input.wasPressed(k)) { input.consume(k); return true; } return false; };
  if (!menu.kist) {
    if (pressed('1')) { menu.kist = 'vliegtuig'; menu.cursor = 0; } else if (pressed('2')) { menu.kist = 'heli'; menu.cursor = 0; }
    return;
  }
  const lessen = R.lessenVan(menu.kist);
  for (let i = 0; i < lessen.length; i++) {
    if (pressed(String(i + 1))) { menu.cursor = i; return startMelding(w, lessen[i]); }
  }
  if (pressed('a') || pressed('arrowleft')) menu.cursor = (menu.cursor + lessen.length - 1) % lessen.length;
  else if (pressed('d') || pressed('arrowright')) menu.cursor = (menu.cursor + 1) % lessen.length;
  else if (pressed('enter') || pressed(' ') || pressed('e')) startMelding(w, lessen[menu.cursor]);
}
function startMelding(w, les) {
  const env = makeEnv(w);
  const why = plekken ? R.beschikbaar(les, env) : 'De lesplekken laden nog';
  if (why) { game.melding = why; game.meldingT = 3; return; }
  startLes(w, les.id);
}

// --- vliegen -------------------------------------------------------------------------------------------------------------------
function monster(w, g) {
  const v = g.v, map = w.map;
  const surf = surfaceZ(map, v.x, v.y);
  const plane = !!v.isPlane;
  const speed = plane ? v.speed : Math.hypot(v.vx || 0, v.vy || 0);
  let touchdown = null;
  if (plane) { if (v.plane && v.plane.landing) touchdown = v.plane.landing; }
  else if (v.onGround && !g.vorigOnGround && v.surfaceKind !== 'water') touchdown = v.health >= (g.hp0 === undefined ? v.health : g.hp0) - 1 ? 'zacht' : 'hard';
  g.vorigOnGround = !!v.onGround;
  const strip = plane ? (g.baan.soort === 'landen' ? g.baan.baan : w.planeStrip) : null;
  return {
    x: v.x, y: v.y, z: v.z, agl: v.z - surf, speed, vz: v.vz || 0, heading: v.angle, onGround: !!v.onGround,
    touchdown, crashed: plane ? !!(v.wrecked || (v.plane && v.plane.crashed)) : false, opBaan: strip ? strip.contains(v.x, v.y) : false,
  };
}

function updateVlucht(w, dt) {
  const g = game, p = w.player, v = g.v;
  if (stopPressed(w.input)) { eindig(w, { afgebroken: true }); return; }
  if (p.inVehicle !== v || !w.vehicles.includes(v)) { eindig(w, { afgebroken: true }); return; }
  if (g.fase === 'intro') {
    g.t += dt;
    // het toestel hangt stil tot de tegels er zijn
    const s = g.baan.start;
    if (v.isPlane) { v.plane.x = s.x; v.plane.y = s.y; v.plane.z = s.z; v.plane.speed = s.speed; v.plane.vz = 0; v.x = s.x; v.y = s.y; v.z = s.z; }
    else { v.x = s.x; v.y = s.y; v.z = s.z; v.vx = v.vy = v.vz = 0; v.speed = 0; v.onGround = false; v.rotor = 1; }
    g.flash = { t: 1, text: `Over ${Math.max(0, Math.ceil(INTRO_S - g.t))}...` };
    if (g.t >= INTRO_S) { g.fase = 'vlieg'; g.t = 0; g.flash = null; if (v.isPlane) { v.plane.speed = s.speed; } }
    return;
  }
  const assist = { widen: assistGate({ r: 1, lo: 0, hi: 0 }).r, timeK: assistTime(100) / 100 };
  if (!v.isPlane) { v.health = Math.max(v.health, SCHOOL_HEALTH - 150); g.hp0 = v.health; } // de school betaalt een stuk rotor
  if (v.isPlane && g.baan.gas && v.planeCtl) v.planeCtl.thr = Math.min(v.planeCtl.thr, g.baan.gas);
  p.update(dt, w);
  if (p.inVehicle !== v) { eindig(w, { afgebroken: true }); return; }
  if (v.isPlane && g.baan.gas && v.planeCtl) v.planeCtl.thr = Math.min(v.planeCtl.thr, g.baan.gas);
  const c = monster(w, g);
  // een crash is van de school: het toestel is zo weer heel, de les is voorbij
  if (v.isPlane && (v.wrecked || v.plane.crashed)) { v.plane.crashed = false; v.wrecked = false; v.health = SCHOOL_HEALTH; v.plane.speed = 0; v.speed = 0; }
  g.t += dt;
  const ev = R.stap(g.les, g.baan, g.st, c, dt, assist);
  for (const e of ev) meld(w, g, e);
  kleurRingen(g);
  if (g.st.fase !== 'vlieg') eindig(w);
}

function meld(w, g, e) {
  const lijnen = R.LIJNEN[g.les.id] || {};
  if (e.k === 'goed') { g.flash = { t: 2.2, text: e.tekst }; if (e.i !== undefined && e.i >= 0) g.gehad[e.i] = 'goed'; }
  else if (e.k === 'fout') { g.flash = { t: 2.4, text: e.tekst, bad: true }; if (e.i !== undefined && e.i >= 0) g.gehad[e.i] = 'fout'; }
  else if (e.k === 'info') g.flash = { t: 2.5, text: e.tekst };
  else if (e.k === 'mislukt') g.flash = { t: 3, text: e.tekst, bad: true };
  void lijnen;
}

// --- het bord tijdens het vliegen ----------------------------------------------------------------------------------------------
function tekenVlucht(w, dt) {
  const g = game;
  if (!g || !board) return;
  if (g.flash && (g.flash.t -= dt) <= 0) g.flash = null;
  const les = g.les, baan = g.baan, st = g.st;
  const rij = R.bordRij(les, baan, st).map(([k, val]) => `<span>${k} <b>${val}</b></span>`);
  const d = R.doel(les, baan, st, makeEnv(w));
  if (d && g.v) {
    const dist = Math.round(Math.hypot(d.x - g.v.x, d.y - g.v.y));
    const dh = R.hoekVerschil(Math.atan2(d.y - g.v.y, d.x - g.v.x), g.v.angle);
    const kant = Math.abs(dh) < 0.2 ? 'recht vooruit' : dh > 0 ? 'links' : 'rechts';
    rij.push(`<span>${d.label} <b>${dist} m · ${kant}</b></span>`);
  }
  const hulp = les.kist === 'vliegtuig'
    ? `${key('W')}${key('S')} gas · ${key('A')}${key('D')} rollen · ${key('SPATIE')} neus omhoog · ${key('CTRL')} neus omlaag · ${key('SHIFT')} remmen · ${key('BACKSPACE')} stoppen`
    : `${key('W')}${key('S')} vooruit en remmen · ${key('A')}${key('D')} draaien · ${key('SPATIE')} omhoog · ${key('CTRL')} omlaag · ${key('SHIFT')} sneller · ${key('BACKSPACE')} stoppen`;
  board.set({ row: rij.join(''), flash: g.flash ? g.flash.text : '', bad: !!(g.flash && g.flash.bad), help: hulp });
}

// --- de activiteit ----------------------------------------------------------------------------------------------------------------
function start(w) {
  if (game) return false;
  worldRef = w;
  laadPlekken();
  game = { fase: 'menu', les: null, melding: '', meldingT: 0 };
  menu = { kist: null, cursor: 0 };
  const p = w.player;
  if (p.inVehicle) p.exitVehicle(w.map, w);
  openMenu(w);
  w.input.reset();
  return true;
}

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.beginPath();
  ctx.moveTo(0, -3.6); ctx.lineTo(0.8, -1.4); ctx.lineTo(3.6, 0.6); ctx.lineTo(3.6, 1.6); ctx.lineTo(0.8, 0.8);
  ctx.lineTo(0.6, 2.6); ctx.lineTo(1.8, 3.4); ctx.lineTo(1.8, 4); ctx.lineTo(0, 3.5); ctx.lineTo(-1.8, 4); ctx.lineTo(-1.8, 3.4);
  ctx.lineTo(-0.6, 2.6); ctx.lineTo(-0.8, 0.8); ctx.lineTo(-3.6, 1.6); ctx.lineTo(-3.6, 0.6); ctx.lineTo(-0.8, -1.4);
  ctx.closePath(); ctx.fill();
}

export const VLIEGSCHOOL = standActivity({
  id: 'vliegschool',
  name: 'Vliegschool De Windwijzer',
  label: 'Vliegschool',
  note: 'vliegschool op Eelde: lessen voor het vliegtuig en de helikopter, met medailles',
  accent: ACCENT,
  stand: () => stand(),
  origin: () => stand(),
  useRadius: 3.4,
  labelRadius: 220,
  sub: 'Dertien lessen met vliegtuig en helikopter · gratis',
  hint: 'Loop naar de balie bij de baan en druk E',
  ubboSub: 'vlieglessen met het vliegtuig en de helikopter, gratis',
  where: 'de vliegschool bij Rotor Roelf op Eelde',
  recText,
  glyph,
  isActive: () => !!game,
  start,
  quit: (w) => { if (game) eindig(w, { afgebroken: true }); },
  update: (dt, w) => {
    if (!game) return;
    if (game.fase === 'menu') updateMenu(w, dt); else updateVlucht(w, dt);
  },
  tick(dt, w) {
    worldRef = w;
    if (!plekken) laadPlekken();
    if (!game) return;
    if (game.fase === 'menu') tekenMenu(); else tekenVlucht(w, dt);
  },
  camera: () => {},
  debug: (w) => {
    worldRef = w;
    return {
      spot: () => ({ ...stand() }),
      lessen: () => R.LES_IDS.slice(),
      geladen: () => !!plekken,
      start: (id) => { if (!game) start(w); if (!id) return !!game; menu.kist = (R.lesVan(id) || {}).kist || null; return startLes(w, id); },
      state: () => {
        if (!game) return null;
        if (game.fase === 'menu' || !game.les) return { fase: 'menu', kist: menu.kist };
        const c = monster(w, { ...game, vorigOnGround: true });
        return { fase: game.fase, les: game.les.id, st: { ...game.st, p: undefined }, baan: game.baan, c, soort: game.baan.soort };
      },
      finish: () => { if (!game || !game.st || game.fase === 'menu') return false; game.st.fase = 'klaar'; game.st.goed = 99; eindig(w); return true; },
      quit: () => { if (!game) return false; if (game.fase === 'menu') sluitAlles(w); else eindig(w, { afgebroken: true }); return true; },
      status: () => ({ stand: stand_van_zaken() }),
    };
  },
});
