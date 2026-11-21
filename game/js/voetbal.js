import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { toonStartkaart } from './startkaart.js';
import { getSettings } from './settings.js';
import { difficultyRecordKey, cleanDifficulty } from './difficulty.js';
import { getScene } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk } from './models3d_people.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { simHudTik, simHudPop, uitlegGezien, zetUitlegGezien } from './simhud.js';
import { reducedMotion } from './motion.js';
import { keyTextHtml } from './keycap.js';
import { createBoard, mgThema, bubble, clearBubbles, pick, stopPressed, easeCamera, clamp } from './minigamekit.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import { pushAudioEvent } from './pedgeom.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedLiveTik, wedHostLiveEind, wedGastVerlaat, wedGastReset } from './multiplayerwedstrijd.js';
import { hoofdspeler } from './players.js';
import { KEYS } from './storagekeys.js';
import {
  VELD, DUREN, DUUR_STANDAARD, LAAD_S, leesInvoer, leesDuurVoorkeur, recordWaarde, recordTekst, MEDAILLE_TEKSTEN, voetbalBeloning,
} from './voetbalrules.js';
import {
  maakWedstrijd, tikWedstrijd, verlaatVoetbal, uitslagVoetbal, medailleUitRij, liveVoetbal, maakVoetbalSpiegel, voerInVoetbal, tikVoetbalSpiegel,
} from './voetbalmatch.js';
import { voetbalHudModel, voetbalBord, popVan, UITLEG_ID } from './voetbalstatus.js';
import { VOETBAL_LINES, PROMPT_SUB } from './voetbaldata.js';
import { voetbalBonusVan, karakterStart, karakterEind, tessaRegel } from './voetbalkarakter.js';

// Voetbal in de Euroborg (#981, Voetbal Sim Light): vijf tegen vijf op een klein veld binnen de tribunes, twee helften, met verzonnen teams (geen echte clubs, spelers of merken). De regels, de bal en
// de computerspelers staan in voetbalrules.js, voetbalbal.js, voetbalai.js en voetbalmatch.js (puur, getest zonder beeld); dit bestand is de wereld (veld, doelen, spelers, camera), de invoer en de
// aansluiting op het spel. De speler start bij de spelerspoort aan de zuidkant (E), net als bij de penaltyserie (penalty.js, de bonusmodus 'Strafschoppen').
// Samen spelen: wie het spel opende is de wereld; de bal en de computerspelers zijn van hem (autoritatief). Gasten sturen hun invoer (stick en knoppen, dezelfde bytes als bij een voertuig) en
// tekenen de momentopnamen (de bestaande live-wedstrijd, soort 'live', zoals padel). Beloning en record zijn per speler. `window.__voetbal` is de debug.
const ACCENT = mgThema('voetbal').accent;
const CX = 1804.3, CY = 1458.1;                            // het midden van het veld (de Euroborg-pitch loopt noord-zuid; team 0 valt aan naar het zuiden)
const GATE = { x: 1797.3, y: 1549.5 };                    // de spelerspoort buiten de zuidtribune, naast die van de penaltyserie
const USE_RADIUS = 3.2;
const DETAIL_M = 420;
const BAL_VIS = 0.17;
const HB = VELD.B / 2, HL = VELD.L / 2, HD = VELD.DOEL_B / 2;
const toWorld = (fx, fy) => ({ x: CX - fx, y: CY + fy }); // veld (x dwars, y in de lengte) naar wereld; de kijker staat achter het noordelijke doel en kijkt naar het zuiden

let game = null;
let built = null;
let board = null;
let flitsEl = null;
let lodT = 0;
let runs = 0;
let ground = 0;
let uitnodiging = null; // wat de host koos bij de uitnodiging: { duur, stand, tg } (de gasten krijgen het mee in `v`)

// --- de voorkeur: kort of normaal (alleen dit apparaat, geen savegame) ----------------------------------------------------------

const duurVoorkeur = () => { try { return leesDuurVoorkeur(typeof localStorage !== 'undefined' ? localStorage.getItem(KEYS.voetbal) : null); } catch (e) { return DUUR_STANDAARD; } };
const zetDuurVoorkeur = (duur) => { try { if (DUREN[duur]) localStorage.setItem(KEYS.voetbal, JSON.stringify({ duur })); } catch (e) { /* geen opslag is geen ramp */ } };

// --- de wereld: het veld, de lijnen en de doelen ----------------------------------------------------------------------------------

let mats = null;
function materials() {
  if (mats) return mats;
  const net = document.createElement('canvas');
  net.width = 64; net.height = 64;
  const g = net.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3;
  for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
  const netTex = new THREE.CanvasTexture(net);
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(5, 3);
  const st = document.createElement('canvas');
  st.width = 64; st.height = 128;
  const sg = st.getContext('2d');
  for (let i = 0; i < 8; i++) { sg.fillStyle = i % 2 ? '#5fae52' : '#58a64b'; sg.fillRect(0, i * 16, 64, 16); }
  const gras = new THREE.CanvasTexture(st);
  gras.colorSpace = THREE.SRGBColorSpace; gras.wrapS = gras.wrapT = THREE.RepeatWrapping; gras.repeat.set(1, 1.6);
  mats = {
    paal: new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.5, metalness: 0.2 }),
    net: new THREE.MeshBasicMaterial({ map: netTex, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    lijn: new THREE.MeshBasicMaterial({ color: 0xf4f1e8 }),
    gras: new THREE.MeshStandardMaterial({ map: gras, roughness: 0.95 }),
    bal: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
    schaduw: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    ring: new THREE.MeshBasicMaterial({ color: 0xf4c430, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }),
    ringAnder: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
    pijl: new THREE.MeshBasicMaterial({ color: 0xf4c430 }),
    bord: new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 0.8 }),
  };
  return mats;
}

function doos(parent, mat, bx, by, bz, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function bouwDoel(root, M, fy, uit) { // fy: de doellijn (-HL of HL); uit: de richting (-1 of 1) van het net in wereld-z
  const w = toWorld(0, fy), ph = VELD.DOEL_H, diep = VELD.DOEL_DIEPTE;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(VELD.PAAL_R, VELD.PAAL_R, ph, 8), M.paal);
    p.position.set(w.x + s * HD, ph / 2, w.y); p.castShadow = true; root.add(p);
  }
  const lat = new THREE.Mesh(new THREE.CylinderGeometry(VELD.PAAL_R, VELD.PAAL_R, VELD.DOEL_B + 0.14, 8).rotateZ(Math.PI / 2), M.paal);
  lat.position.set(w.x, ph, w.y); lat.castShadow = true; root.add(lat);
  const achter = new THREE.Mesh(new THREE.PlaneGeometry(VELD.DOEL_B, ph), M.net);
  achter.position.set(w.x, ph / 2, w.y + uit * diep); root.add(achter);
  for (const s of [-1, 1]) {
    const zij = new THREE.Mesh(new THREE.PlaneGeometry(diep, ph).rotateY(Math.PI / 2), M.net);
    zij.position.set(w.x + s * HD, ph / 2, w.y + uit * diep / 2); root.add(zij);
  }
  const dak = new THREE.Mesh(new THREE.PlaneGeometry(VELD.DOEL_B, diep).rotateX(-Math.PI / 2), M.net);
  dak.position.set(w.x, ph, w.y + uit * diep / 2); root.add(dak);
}

function poortBord() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#1f3a2a'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#f4f1e8'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
  g.fillText('De Stadjers', 128, 40);
  g.font = '22px sans-serif'; g.fillText('Vijf tegen vijf', 128, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
}

function bouw(w) {
  const M = materials();
  if (w && w.map && typeof w.map.surfaceAt === 'function') { try { const r = w.map.surfaceAt(CX, CY, { z: 0, ribbon: null }); if (r && Number.isFinite(r.z)) ground = r.z; } catch (e) { ground = 0; } }
  const root = new THREE.Group();
  root.position.y = ground;
  const gras = new THREE.Mesh(new THREE.PlaneGeometry(VELD.B + 3, VELD.L + 6).rotateX(-Math.PI / 2), M.gras);
  gras.position.set(CX, 0.035, CY);
  gras.receiveShadow = true;
  root.add(gras);
  const lijn = (bx, bz, fx, fy) => { const q = toWorld(fx, fy); doos(root, M.lijn, bx, 0.02, bz, q.x, 0.06, q.y); };
  // de rand, de middenlijn, het middencirkeltje en de twee strafschopgebieden
  lijn(VELD.B, 0.12, 0, -HL); lijn(VELD.B, 0.12, 0, HL); lijn(0.12, VELD.L, -HB, 0); lijn(0.12, VELD.L, HB, 0);
  lijn(VELD.B, 0.1, 0, 0);
  const mid = new THREE.Mesh(new THREE.RingGeometry(2.9, 3.0, 32).rotateX(-Math.PI / 2), M.lijn);
  const mq = toWorld(0, 0); mid.position.set(mq.x, 0.065, mq.y); root.add(mid);
  for (const s of [-1, 1]) {
    const y0 = s * HL, y1 = s * (HL - VELD.STRAF_D);
    lijn(VELD.STRAF_B, 0.1, 0, y1); lijn(0.1, VELD.STRAF_D, -VELD.STRAF_B / 2, (y0 + y1) / 2); lijn(0.1, VELD.STRAF_D, VELD.STRAF_B / 2, (y0 + y1) / 2);
    const stip = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12).rotateX(-Math.PI / 2), M.lijn);
    const sq = toWorld(0, s * (HL - 4.5)); stip.position.set(sq.x, 0.066, sq.y); root.add(stip);
  }
  bouwDoel(root, M, -HL, -1); bouwDoel(root, M, HL, 1);
  const bord = new THREE.Group();
  doos(bord, M.bord, 0.18, 2.4, 0.18, -1.6, 1.2, 0); doos(bord, M.bord, 0.18, 2.4, 0.18, 1.6, 1.2, 0);
  const plaat = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.28), poortBord());
  plaat.position.set(0, 2.1, -0.1); plaat.rotation.y = Math.PI; bord.add(plaat);
  bord.position.set(GATE.x, ground, GATE.y + 1.4);
  const bal = new THREE.Mesh(new THREE.SphereGeometry(BAL_VIS, 14, 10), M.bal);
  bal.castShadow = true; bal.visible = false;
  const schaduw = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14).rotateX(-Math.PI / 2), M.schaduw);
  schaduw.visible = false;
  getScene().add(root, bord, bal, schaduw);
  return { root, bord, bal, schaduw };
}

function updateLod(w) {
  const p = hoofdspeler(w);
  const d = Math.hypot(p.x - CX, p.y - CY);
  if (!built && d < DETAIL_M) built = bouw(w);
  if (!built) return;
  built.root.visible = d < DETAIL_M + 80 || !!game;
  built.bord.visible = built.root.visible;
}

// --- de spelers ---------------------------------------------------------------------------------------------------------------------

const VROUW = new Set(['Wietske', 'Grietje', 'Fenna', 'Marrit']);
function maakActors(sim) {
  const scene = getScene();
  const acts = sim.spelers.map((p) => {
    const t = sim.teams[p.team];
    const shirt = p.rol === 'keeper' ? t.keeperShirt : t.shirt;
    const mens = sim.mensen.find((x) => x.ctl === p.id);
    const vrouw = VROUW.has(p.naam) || (mens && mens.char === 'anita');
    const mesh = buildPersonMesh(shirt, 0xd9b48f, {
      variant: vrouw ? 'female' : 'male', seed: 9811 + p.id * 13, pants: t.broek, shoes: 0x1a1a1a,
      look: { age: 'adult', build: p.rol === 'keeper' ? 'avg' : 'slim', hat: null, top: 'tee', bottom: 'shorts', shoeType: 'sneaker', bag: null, umbrella: null, glasses: false },
    });
    mesh.rotation.order = 'ZYX';
    scene.add(mesh);
    return { mesh };
  });
  return acts;
}

function maakMarkeringen() {
  const M = materials(), scene = getScene();
  const eigen = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.78, 28).rotateX(-Math.PI / 2), M.ring);
  const pijl = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 10).rotateX(Math.PI), M.pijl);
  const ander = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 24).rotateX(-Math.PI / 2), M.ringAnder); r.visible = false; scene.add(r); return r; });
  eigen.visible = false; pijl.visible = false;
  scene.add(eigen, pijl);
  return { eigen, pijl, ander };
}

// --- de flits van een doelpunt: een korte witte flits (niet bij verminderde beweging) ------------------------------------------------

function flits() {
  if (reducedMotion() || typeof document === 'undefined') return;
  if (!flitsEl) {
    flitsEl = document.createElement('div');
    flitsEl.className = 'vb-flits';
    flitsEl.setAttribute('aria-hidden', 'true');
    (document.getElementById('hud') || document.body).appendChild(flitsEl);
  }
  flitsEl.classList.remove('vb-flits--aan');
  void flitsEl.offsetWidth;
  flitsEl.classList.add('vb-flits--aan');
}

// --- kaartpictogram -------------------------------------------------------------------------------------------------------------

function drawIcon(ctx, s) {
  iconDisc(ctx, s, ACCENT);
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#f2ede0';
  ctx.strokeStyle = '#f2ede0';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, -0.2, 2.5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.lineTo(Math.cos(a) * 1.1, -0.2 + Math.sin(a) * 1.1); }
  ctx.closePath(); ctx.fill();
  // twee doelpalen
  ctx.beginPath(); ctx.moveTo(-3, 3.4); ctx.lineTo(-3, 1.6); ctx.lineTo(3, 1.6); ctx.lineTo(3, 3.4); ctx.stroke();
  ctx.restore();
}

// --- prompt en start ------------------------------------------------------------------------------------------------------------

function nearGate(w) {
  const p = hoofdspeler(w);
  if (game || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
  return Math.hypot(p.x - GATE.x, p.y - GATE.y) < USE_RADIUS;
}
const recSleutel = () => difficultyRecordKey(cleanDifficulty(getSettings().difficulty), 'voetbal');
function recText() {
  const rec = getChallengeRecord(recSleutel());
  return rec && rec.best != null && rec.best > 0 ? `Record: ${recordTekst(Math.round(rec.best))}${rec.medal ? ' · ' + MEDALS[rec.medal].toLowerCase() : ''}` : null;
}
function prompt(w) {
  if (!nearGate(w)) return null;
  const why = activityBlock(w);
  return { id: 'voetbal', x: GATE.x, y: GATE.y, h: 2.2, key: 'E', label: 'Voetbal Euroborg', sub: why || recText() || PROMPT_SUB, ring: true, dim: !!why };
}
function secondary(w) {
  if (game || hoofdspeler(w).inVehicle) return [];
  if (Math.hypot(hoofdspeler(w).x - GATE.x, hoofdspeler(w).y - GATE.y) > 160) return [];
  return [{ id: 'voetbal-2', x: GATE.x, y: GATE.y, h: 2.2, label: 'Voetbal Euroborg', sub: 'Loop naar de spelerspoort en druk E', kind: 'place' }];
}
function interact(w) {
  if (!nearGate(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  // met gasten in de sessie is de wedstrijd een uitnodiging aan iedereen (Meedoen? J of N); nog eens E start meteen
  const uit = wedNodigUit(w, 'voetbal');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  start(w);
  return true;
}

function nieuweOpties() {
  const stand = cleanDifficulty(getSettings().difficulty);
  return { duur: duurVoorkeur(), stand, tg: runs % 4, seed: ((Date.now() / 1000) | 0) + runs * 7919 };
}

// start: solo (sim = null), de host van een Samen-wedstrijd (online 'host', sim van het kader) of een gast (online 'gast', sim = de spiegel).
function start(w, { force = false, online = null, sim = null } = {}) {
  if (game) return false;
  if (!force && !online && activityBlock(w)) return false;
  if (!built) built = bouw(w);
  const p = hoofdspeler(w);
  if (p.inVehicle && p.exitVehicle) p.exitVehicle(w.map, w);
  runs++;
  const opt = online === 'gast' ? null : (uitnodiging && online ? uitnodiging : nieuweOpties());
  if (!sim) sim = maakWedstrijd([{ slot: 0, naam: 'Jij', char: p.character || null, bonus: voetbalBonusVan() }], { duur: opt.duur, stand: opt.stand, seed: opt.seed || 1, tegenstander: opt.tg });
  const mode = online === 'gast' ? sim.stand : opt.stand;
  const bon = karakterStart(w, 'voetbal'); // de speler voetbalt als Tessa (wissel per speler, terug bij het einde); zonder haak gebeurt er niets
  game = { online, sim, t: 0, dt: 0, cam: null, actors: maakActors(sim), marks: maakMarkeringen(), mode, said: 0, lastFase: sim.fase, laadG: { schot: 0, lang: 0 }, bon, exitX: GATE.x, exitY: GATE.y, gemeld: false };
  built.root.visible = true; built.bord.visible = true;
  built.bal.visible = true; built.schaduw.visible = true;
  w.voetbalGame = game;
  w.cinematicHidePlayers = true;
  ensureBoard(); board.show();
  w.companionHold = { x: GATE.x, y: GATE.y - 4, face: -Math.PI / 2 };
  if (online === 'gast') installeerGastKnoppen(w);
  if (online !== 'gast') toonStartkaart(w, 'voetbal', { record: recText() });
  say(w, 'start', true);
  teken(w, 0);
  return true;
}

function say(w, kind, force = false) {
  const lijst = VOETBAL_LINES[kind];
  if (!lijst || !game) return;
  if (!force && game.t - game.said < 5) return;
  game.said = game.t;
  const q = toWorld(HB + 3, 0);
  const tessa = (kind === 'goalThuis' && tessaRegel('viering')) || null; // alleen tekst; zonder de Tessa-haak is dit null
  bubble(w, { x: q.x, y: q.y, name: tessa ? 'Tessa' : VOETBAL_LINES.who, text: tessa || pick(lijst), h: 3.2, tag: 'voetbal', ttl: 4 });
}

// --- het spel zelf --------------------------------------------------------------------------------------------------------------

const eigenMens = (g) => g.sim.mensen.find((x) => (g.online === 'gast' ? x.slot === g.sim.mijnSlot : x.slot === 0)) || g.sim.mensen[0] || null;
const eigenId = (g) => { const m = eigenMens(g); return g.online === 'gast' ? g.sim.mijnId : m && !m.weg ? m.ctl : -1; };

function invoer(w) { return leesInvoer((k) => w.input.isDown(k), () => w.input.axis()); }

function updateSolo(w, dt) {
  const g = game;
  const inv = invoer(w);
  verwerk(w, tikWedstrijd(g.sim, dt, () => inv));
}
function updateHost(w, dt) {
  const g = game, n = w.coopNet;
  if (!n || !n.wed || n.wed.lv !== g.sim) { end(w, { quit: true, extern: true }); return; } // de sessie is weg
  const inv = invoer(w);
  verwerk(w, wedLiveTik(w, g.sim, dt, () => inv));
}

function verwerk(w, evs) {
  const g = game;
  for (const e of evs) {
    if (e.type === 'schop') { const q = toWorld(e.x, e.y); pushAudioEvent(w, { kind: 'golf', sub: 'slag', strength: 0.25 + 0.5 * (e.sterkte || 0.5), x: q.x, y: q.y }); }
    else if (e.type === 'paal' || e.type === 'lat') { const b = toWorld(g.sim.bal.x, g.sim.bal.y); pushAudioEvent(w, { kind: 'golf', sub: 'rand', strength: 0.7, x: b.x, y: b.y }); }
    else if (e.type === 'goal') {
      const b = toWorld(g.sim.bal.x, g.sim.bal.y); pushAudioEvent(w, { kind: 'golf', sub: 'hole', strength: 0.9, x: b.x, y: b.y });
      flits();
      say(w, e.team === 0 ? 'goalThuis' : 'goalUit', true);
    } else if (e.type === 'redding') say(w, 'redding');
    else if (e.type === 'uit') say(w, 'uit');
    else if (e.type === 'overtreding') say(w, 'overtreding');
    else if (e.type === 'fluit' && e.helft === 1) say(w, 'rust', true);
    else if (e.type === 'einde') say(w, e.winnaar === 0 ? 'winst' : e.winnaar < 0 ? 'gelijk' : 'verlies', true);
    const pop = popVan(e, 0);
    if (pop && (e.type === 'goal' || e.type === 'einde' || e.type === 'overtreding')) simHudPop(pop.tekst, pop.geluid);
  }
}

function gastTik(w, dt) {
  if (!game || game.online !== 'gast') return false;
  w.minigameUntil = w.time + 0.25;
  if (!w.coopNet || w.coopRole !== 'client') { wedGastReset(w); end(w, { quit: true, extern: true }); return true; } // de verbinding is weg
  if (w.input.wasPressed('backspace')) { w.input.consume('backspace'); wedGastVerlaat(w); end(w, { quit: true, extern: true }); return true; } // de computer neemt zijn speler over
  game.t += dt; game.dt = dt;
  tikVoetbalSpiegel(game.sim, dt);
  // de gast ziet de kracht van zijn eigen schot lokaal (de host rekent het echte laden met zijn invoer)
  const inv = invoer(w), b = inv.buttons | 0;
  const heeft = game.sim.bal.owner >= 0 && game.sim.bal.owner === game.sim.mijnId;
  game.laadG.schot = heeft && (b & 2) ? game.laadG.schot + dt : 0;
  game.laadG.lang = heeft && (b & 128) ? game.laadG.lang + dt : 0;
  if (game.sim.fase !== game.lastFase) { // de fasewissel is het teken voor de flits en het geluid bij de gast
    if (game.sim.fase === 'goal') { flits(); simHudPop('GOAL!', 'ui_verzameld'); }
    game.lastFase = game.sim.fase;
  }
  teken(w, dt);
  updateHud(w);
  return true;
}

// Een gast stuurt zijn knoppen mee in dezelfde byte als altijd (coopnet.js zet ze om); alleen de betekenis van de bits verschilt tijdens de wedstrijd.
function installeerGastKnoppen(w) {
  w.coopKnoppenHaak = (inp) => (game && game.online === 'gast' ? leesInvoer((k) => inp.isDown(k), () => [0, 0]).buttons : null);
}

function updateGame(w, dt) {
  const g = game;
  g.t += dt; g.dt = dt;
  w.minigameUntil = w.time + 0.25; // Spatie en de looptoetsen horen bij de wedstrijd (geen sprong)
  if (stopPressed(w.input)) { end(w, { quit: true }); return; }
  if (g.online === 'host') updateHost(w, dt); else updateSolo(w, dt);
  if (!game) return;
  if (g.sim.fase === 'klaar') { end(w); return; }
  const p = hoofdspeler(w), id = eigenId(g);
  if (id >= 0) { const q = toWorld(g.sim.spelers[id].x, g.sim.spelers[id].y); p.x = q.x; p.y = q.y; p.angle = Math.PI / 2; } // de wereld streamt rond het veld
  teken(w, dt);
  updateHud(w);
}

// --- tekenen --------------------------------------------------------------------------------------------------------------------

function teken(w, dt) {
  const g = game, sim = g.sim, b = sim.bal;
  sim.spelers.forEach((p, i) => {
    const a = g.actors[i], q = toWorld(p.x, p.y);
    a.mesh.position.set(q.x, ground, q.y);
    a.mesh.rotation.y = p.face - Math.PI;
    animatePersonWalk(a.mesh, p.speed || 0, dt);
    const ud = a.mesh.userData;
    a.mesh.rotation.z = p.duikT > 0 ? (p.duikDx || 0) * 1.15 : 0; // de keeper ligt languit (de kantelas is de wereld-z, zoals bij de penaltykeeper)
    a.mesh.position.y = ground + (p.duikT > 0 ? 0.35 : 0);
    if (p.tackleT > 0 || p.stun > 0) a.mesh.scale.y = 0.82; else a.mesh.scale.y = 1;
    if (p.vier > 0 && ud && ud.armL && ud.armR) { const s = Math.sin(g.t * 9 + p.id); ud.armL.rotation.z = 2.4 + s * 0.4; ud.armR.rotation.z = -2.4 - s * 0.4; }
  });
  const bq = toWorld(b.x, b.y);
  built.bal.position.set(bq.x, ground + (b.z || 0) + BAL_VIS, bq.y);
  built.schaduw.position.set(bq.x, ground + 0.07, bq.y);
  built.schaduw.scale.setScalar(clamp(1 - (b.z || 0) / 5, 0.4, 1));
  const id = eigenId(g), m = g.marks;
  if (id >= 0) {
    const p = sim.spelers[id], q = toWorld(p.x, p.y);
    m.eigen.visible = true; m.eigen.position.set(q.x, ground + 0.09, q.y);
    m.pijl.visible = true; m.pijl.position.set(q.x, ground + 2.5 + Math.sin(g.t * 5) * 0.08, q.y);
  } else { m.eigen.visible = false; m.pijl.visible = false; }
  let k = 0;
  for (const mm of sim.mensen) {
    if (mm.weg || mm.ctl === id || k >= m.ander.length) continue;
    const q = toWorld(sim.spelers[mm.ctl].x, sim.spelers[mm.ctl].y);
    m.ander[k].visible = true; m.ander[k].position.set(q.x, ground + 0.09, q.y); k++;
  }
  for (; k < m.ander.length; k++) m.ander[k].visible = false;
}

function camera(w) {
  const g = game;
  if (!g) return;
  const sim = g.sim, b = sim.bal, id = eigenId(g), me = id >= 0 ? sim.spelers[id] : null;
  const fx = me ? b.x * 0.7 + me.x * 0.3 : b.x, fy = me ? b.y * 0.8 + me.y * 0.2 : b.y;
  const cam = toWorld(clamp(fx * 0.55, -7, 7), clamp(fy - 15, -HL - 8, HL - 7));
  const at = toWorld(clamp(fx * 0.9, -HB, HB), clamp(fy + 2.5, -HL, HL));
  const c = easeCamera(g, { x: cam.x, y: cam.y, z: ground + 16 }, { x: at.x, y: at.y, z: ground + 0.5 }, 0.1);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: 58, cut: true };
}

// --- de HUD: het bord bovenin en de strook onderin -------------------------------------------------------------------------------

function ensureBoard() {
  if (!board) board = createBoard('voetbal');
  return board;
}

function updateHud(w) {
  const g = game;
  if (!g) return;
  const sim = g.sim, id = eigenId(g), p = id >= 0 ? sim.spelers[id] : null, mens = eigenMens(g);
  const owner = sim.bal.owner;
  const laad = g.online === 'gast' ? Math.max(g.laadG.schot, g.laadG.lang) / LAAD_S : mens && !mens.weg ? Math.max(mens.laad.schot, mens.laad.lang) / LAAD_S : 0;
  const laadSoort = g.online === 'gast' ? (g.laadG.lang > g.laadG.schot ? 'lang' : 'schot') : mens && mens.laad.lang > mens.laad.schot ? 'lang' : 'schot';
  const model = {
    fase: sim.fase, helft: sim.helft, klok: sim.klok, score: sim.score, namen: [sim.teams[0].kort, sim.teams[1].kort],
    bezitTeam: owner >= 0 ? sim.spelers[owner].team : -1, heeftBal: owner >= 0 && owner === id, rol: p && p.rol === 'keeper' ? 'keeper' : 'veld',
    laad: Math.min(1, laad), laadSoort, stamina: p ? (g.online === 'gast' ? (p.moe ? 0.05 : 1) : p.stamina) : 1, moe: !!(p && p.moe),
    eigen: g.online === 'gast' ? null : mens ? mens.doelpunten : 0, bezit: g.online === 'gast' ? null : sim.stat.bezit,
    hervat: sim.hervat ? sim.hervat.kind : null, tekst: g.online === 'gast' ? sim.flashTekst : sim.flash ? sim.flash.tekst : '', uitleg: !uitlegGezien(UITLEG_ID),
  };
  if (model.laad > 0.02) zetUitlegGezien(UITLEG_ID);
  const bord = voetbalBord({ ...model, help: keyTextHtml('{WASD} lopen · {F} pass · {E} lang · {SPATIE} schot · {CTRL} tackle · {Q} wissel · {BACKSPACE} stopt') });
  ensureBoard().set(bord);
  simHudTik(0, voetbalHudModel(model));
}

// --- einde ----------------------------------------------------------------------------------------------------------------------

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  w.voetbalGame = null;
  w.coopKnoppenHaak = null;
  w.companionHold = null;
  w.cameraOverride = null;
  w.cinematicHidePlayers = false;
  const p = hoofdspeler(w);
  p.z = 0; p.moving = false; p.speed = 0; p.vx = 0; p.vy = 0;
  if (board) board.hide();
  simHudTik(0, null);
  clearBubbles(w, 'voetbal');
  for (const a of g.actors) getScene().remove(a.mesh);
  for (const mk of [g.marks.eigen, g.marks.pijl, ...g.marks.ander]) { getScene().remove(mk); mk.geometry.dispose(); }
  if (built) { built.bal.visible = false; built.schaduw.visible = false; }
  p.x = g.exitX; p.y = g.exitY; p.angle = -Math.PI / 2;
  karakterEind(w, g.bon);
  let res = null;
  if (g.online === 'host' && !extern) res = wedHostLiveEind(w, g.sim, { gestopt: quit });
  if (quit) { w.addMessage('Voetbal gestopt', 2.5); return; }
  if (g.online === 'gast') { if (uitslag && !uitslag.gestopt) beloonLokaal(w, g, uitslag.rijen.find((r) => r.slot === g.sim.mijnSlot) || null); return; }
  if (g.online === 'host') { if (!res) return; beloonLokaal(w, g, res.rijen.find((r) => r.slot === 0) || null, res.jij); return; }
  beloonLokaal(w, g, uitslagVoetbal(g.sim)[0] || null);
}

// De beloning van één speler uit zijn eigen uitslagsregel: record, medaille, prestaties, het banner. Het geld van een gast betaalt de host (betaalGast); hier alleen wat bij de eigen speler hoort.
function beloonLokaal(w, g, rij, jij = null) {
  if (!rij || rij.weg) return;
  const r = medailleUitRij(rij);
  const rec = recordChallengeResult(w, difficultyRecordKey(g.mode || 'standaard', 'voetbal'), { value: recordWaarde(r), medal: r.medaille });
  recordStat(w, 'footballMatches');
  if (rij.plek === 1) unlockAchievement(w, 'voetbal_winst');
  if (r.eigen >= 3) unlockAchievement(w, 'voetbal_hattrick');
  if (jij && jij.geld > 0) { loopbaanVerdien(w, 'buiten', jij.geld, { xp: jij.xp, n: 0, uniek: 'voetbal-samen', deel: false }); w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4); }
  else if (!g.online) { const b = voetbalBeloning({ plek: rij.plek, nul: /-0\b/.test(rij.tekst || '') }); if (b.geld > 0) { loopbaanVerdien(w, 'buiten', b.geld, { xp: b.xp, n: 0, deel: false }); w.addMessage(`Beloning: €${b.geld.toLocaleString('nl-NL')}`, 4); } }
  const stats = [['Stand', `${r.gf}-${r.ga}`], ['Jouw doelpunten', String(r.eigen)]];
  if (r.medaille) stats.push(['Medaille', MEDALS[r.medaille]]);
  if (r.medaille < 3) stats.push(['Volgende', MEDAILLE_TEKSTEN[r.medaille]]);
  if (rec && rec.newBest && recordWaarde(r) > 0) stats.push(['Record', 'Nieuw!']);
  showBanner({ kind: rij.plek === 1 ? 'pass' : 'fail', title: rij.plek === 1 ? (r.eigen >= 3 ? 'HATTRICK IN DE EUROBORG' : 'GEWONNEN') : rij.plek === 3 ? 'GELIJKSPEL' : 'VERLOREN', reason: `${g.sim.teams[0].naam} ${r.gf}-${r.ga} ${g.sim.teams[1].naam}`, reward: 0, stats });
}

// --- tegen elkaar (Samen spelen): twee tot vier spelers in één team tegen de computer ------------------------------------------

registreerWedstrijd('voetbal', {
  naam: 'Voetbal Euroborg', soort: 'live', live: liveVoetbal, minSpelers: 2,
  maak: (deeln) => {
    uitnodiging = nieuweOpties();
    return maakWedstrijd(deeln.map((d) => ({ slot: d.slot, naam: d.naam, char: d.char, bonus: voetbalBonusVan() })), { duur: uitnodiging.duur, stand: uitnodiging.stand, seed: uitnodiging.seed, tegenstander: uitnodiging.tg });
  },
  start: (w, sim) => start(w, { online: 'host', force: true, sim }),
  plek: () => ({ ...GATE }),
  extra: () => (uitnodiging ? { v: `${uitnodiging.duur}|${uitnodiging.stand}|${uitnodiging.tg}` } : null),
  eind: () => {},
  solo: (w) => start(w),
  gastPlek: (w, x, y) => !game && !hoofdspeler(w).inVehicle && Math.hypot(x - GATE.x, y - GATE.y) < 4.5, // een gast vraagt het bij de spelerspoort
});
const leesStartV = (v) => {
  const d = String(v || '').split('|');
  return { duur: DUREN[d[0]] ? d[0] : DUUR_STANDAARD, stand: cleanDifficulty(d[1]), tegenstander: Math.max(0, Math.min(3, parseInt(d[2], 10) || 0)) };
};
zetWedGastHaken('voetbal', {
  dichtbij: (w) => !game && !hoofdspeler(w).inVehicle && Math.hypot(hoofdspeler(w).x - GATE.x, hoofdspeler(w).y - GATE.y) < 3.4,
  spiegel: (st, mijn) => maakVoetbalSpiegel(st, mijn, leesStartV(st.v)),
  voerIn: voerInVoetbal,
  start: (w, st, sp) => { if (!sp) return false; return start(w, { online: 'gast', force: true, sim: sp }); },
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit, extern: true }); if (uit.gestopt && w.addMessage) w.addMessage('De wedstrijd is gestopt.', 3); },
  tik: (w, dt) => gastTik(w, dt),
});

// --- de activiteit --------------------------------------------------------------------------------------------------------------

export const VOETBAL = {
  id: 'voetbal',
  layer: 'voetbal',
  legend: { kind: 'act-voetbal', label: 'Voetbal Euroborg', note: 'vijf tegen vijf tegen de computer, alleen of samen: pass, schiet en win' },
  init(w) {
    window.__voetbal = {
      spot: () => ({ ...GATE }),
      veld: () => ({ x: CX, y: CY, B: VELD.B, L: VELD.L }),
      start: (force = true) => start(w, { force }),
      state: () => (game ? { fase: game.sim.fase, helft: game.sim.helft, klok: game.sim.klok, score: game.sim.score.slice(), bal: { x: game.sim.bal.x, y: game.sim.bal.y }, online: game.online } : null),
      zetDuur: (duur) => { zetDuurVoorkeur(duur); return duurVoorkeur(); },
      finish: () => { if (!game || game.online) return false; game.sim.klok = 0.05; return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
    };
  },
  spots: () => [{ id: 'voetbal', name: 'Voetbal Euroborg', x: GATE.x, y: GATE.y }],
  prompt,
  secondary,
  interact,
  active: () => !!game,
  quit: (w) => end(w, { quit: true }),
  update(dt, w) {
    if (!game) return;
    if (w.pendingRespawn) { end(w, { quit: true }); return; }
    if (game.online === 'gast') return; // de gast loopt via zijn wedstrijdhaak (gastTik)
    updateGame(w, dt);
  },
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); }
  },
  camera,
  icon: drawIcon,
  mapSub: () => recText() || 'Voetbal: vijf tegen vijf in de Euroborg',
  ubbo(w) {
    const d = Math.hypot(GATE.x - hoofdspeler(w).x, GATE.y - hoofdspeler(w).y);
    const rec = getChallengeRecord(recSleutel());
    return { name: 'Voetbal Euroborg', sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : 'vijf tegen vijf, gratis', dist: d, x: GATE.x, y: GATE.y, play: 'voetbal', where: 'de spelerspoort van de Euroborg', hint: 'loop naar de poort en druk E' };
  },
  runs: () => runs,
};
