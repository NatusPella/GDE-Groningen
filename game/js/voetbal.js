import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { toonStartkaart } from './startkaart.js';
import { getSettings } from './settings.js';
import { difficultyRecordKey, cleanDifficulty, footballLevel, footballDuration } from './difficulty.js'; // #1169: tegenstander en duur per save
import { getScene, disposeObject } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { actorLook } from './footballkit.js';
import { kitOn, kitOff, gateKit } from './footballkitlive.js';
import { levelPattern, levelOfDivision } from './clothingkit.js';
import { showBanner } from './cinematics.js';
import { unlockAchievement, recordChallengeResult, getChallengeRecord, recordStat, MEDALS } from './achievements.js';
import { activityBlock, iconDisc } from './activitykit.js';
import { simHudTik, simHudPop, uitlegGezien, zetUitlegGezien } from './simhud.js';
import { reducedMotion } from './motion.js';
import { keyTextHtml } from './keycap.js';
import { createBoard, mgThema, bubble, clearBubbles, pick, stopPressed, easeCamera, clamp } from './minigamekit.js';
import { loopbaanVerdien } from './loopbaanlive.js';
import * as CL from './voetbalcarrierelive.js';
import { matchSetup, commentaryContext, nextMatch, divisionOfMyClub } from './voetbalcarriere.js';
import { pitchPlacement } from './voetbalparken.js';
import { registerLauncher, registerCoachLauncher } from './voetbalcarriereui.js';
import { coachSetup, makeCoachMatch, coachTactic, coachMelding, coachResult } from './voetbalcoach.js';
import { formationList } from './voetbalrules.js';
import { awayKit, mapSpots, parkCrowdCount, crowdVisible, trainingSquads } from './voetbalworld.js';
import { buildCrowd, makeTrainers, buildAdBoards } from './voetbalpubliek.js';
import { bakeFigure, figureMaterial } from './voetbalfiguren.js';   // beeld 24-11: publiek en trainers als gebakken mensen in plaats van cilinders
import { boardNames } from './voetbalsponsors.js';
import { pushAudioEvent } from './pedgeom.js';
import { sfxEvent } from './sfx/haken.js';
import { registreerWedstrijd, zetWedGastHaken, wedNodigUit, wedNuStarten, wedLiveTik, wedHostLiveEind, wedGastVerlaat, wedGastReset } from './multiplayerwedstrijd.js';
import { hoofdspeler } from './players.js';
import { KEYS } from './storagekeys.js';
import {
  PITCH, DUREN, FORMATEN, OPPONENTS, STIJLEN, zetFormaat, formationNames, cleanFormation, cleanStijl, leesVoorkeur, LAAD_S, leesInvoer, recordValue, recordTekst, MEDAILLE_TEKSTEN, voetbalBeloning,
} from './voetbalrules.js';
import {
  makeMatch, tikWedstrijd, zetTactiek, verlaatVoetbal, uitslagVoetbal, medailleUitRij, liveVoetbal, makeFootballMirror, voerInVoetbal, tikVoetbalSpiegel,
} from './voetbalmatch.js';
import { voetbalHudModel, voetbalBoard, popVan, UITLEG_ID, toetsGroepenHtml } from './voetbalstatus.js';
import { makeCommentaar, commentaarVoor, tikCommentaar, commentMvp, derbyVan } from './voetbalcommentaar.js';
import { makeRegie, regieTik, cameraVoor, makeOpname, opnameTik, opnameClip, clipFrame, pasFrameToe, herstelStaat, planHerhaling, herhalingShot, nextMode, MODE_NAMES } from './voetbalregie.js';
import { magOverslaan, carriereBannerRijen, scoreboardRow, opstellingHtml, rustHtml, eindHtml, radarHtml, subtitleHtml, guestEvents, guestState, leesTvVoorkeur, hex } from './voetbalpresentatie.js';
import { matchMvp, statistiekenVan } from './voetbalextrarules.js';
import { besteOntvanger } from './voetbalai.js';
import { makeTvLayer } from './voetbaltvlayer.js';
import { lineVoiceFor } from './linevoice.js';
import { playBubbleVoice } from './audio.js';
import { VOETBAL_LINES, PROMPT_SUB } from './voetbaldata.js';
import { newCompetition, leesCompetitie, nextOpponent, applyRound, tabel, yourRank, isKampioen, clubName, KAMPIOEN_BONUS } from './voetbalcompetitie.js';
import { deriveTeams, encodeTeams, decodeTeams, decodeRatings, encodeRatings, teamOfSlot, guestCareerExtra, LEVEL_CAP } from './voetbalsamen.js';
import { simFactors } from './voetbalplayers.js';
import { voetbalBonusVan, characterEnter, zetVoetbalKarakterHaken, karakterEind, tessaLine, tessaUitleg } from './voetbalkarakter.js';
import { voetbalSprint, voetbalSchot, voetbalAanname, characterForActivity, enterActivity, endActivity, TESSA_LINES } from './karakterbonus.js';
// de haken van de dunne karakterlaag (voetbalkarakter.js): bonus en teksten van Tessa, en de wissel per speler via karakterbonus.js
zetVoetbalKarakterHaken({ bonus: (k) => ({ sprint: voetbalSprint(k), schot: voetbalSchot(k), aanname: voetbalAanname(k) }), voorActiviteit: (id) => (characterForActivity(id) ? { start: (w) => enterActivity(w, id), eind: (w) => endActivity(w, id) } : null), regels: TESSA_LINES.voetbal });

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
// De plek van het veld: standaard de Euroborg (hoek 0), bij een carrièrewedstrijd het sportpark van de thuisploeg (#1117: het middelpunt en de lengteas van het grootste veld van het park, `a` = r - pi/2).
let site = { x: CX, y: CY, a: 0 };
const toWorld = (fx, fy) => { const lx = -fx, ca = Math.cos(site.a), sa = Math.sin(site.a); return { x: site.x + lx * ca - fy * sa, y: site.y + lx * sa + fy * ca }; }; // veld (x dwars, y in de lengte) naar wereld; de kijker staat achter het noordelijke doel en kijkt naar het zuiden
const toLocal = (fx, fy) => ({ x: -fx, y: fy });          // het veld in de eigen ruimte van de groep (de groep draait en staat op de plek van het veld)

let game = null;
let built = null;
let parkBuilt = null;                                       // het tijdelijke veld van een carrièrewedstrijd op een sportpark (#1117)
const fld = () => parkBuilt || built;
let board = null;
let flitsEl = null;
let lodT = 0;
let runs = 0;
let ground = 0;
let uitnodiging = null; // wat de host koos bij de uitnodiging: { duur, stand, tg } (de gasten krijgen het mee in `v`)

// --- de voorkeur: kort of normaal (alleen dit apparaat, geen savegame) ----------------------------------------------------------

const leesOpslag = () => { try { return leesVoorkeur(typeof localStorage !== 'undefined' ? localStorage.getItem(KEYS.voetbal) : null); } catch (e) { return leesVoorkeur(null); } };
const leesTv = () => { try { return leesTvVoorkeur(typeof localStorage !== 'undefined' ? localStorage.getItem(KEYS.voetbal) : null); } catch (e) { return leesTvVoorkeur(null); } };
const schrijfOpslag = (v, tv = null) => {
  try {
    let oud = null; try { oud = JSON.parse(localStorage.getItem(KEYS.voetbal) || 'null'); } catch (e) { oud = null; }
    const nextTv = tv || (oud && oud.tv) || undefined;
    localStorage.setItem(KEYS.voetbal, JSON.stringify({ duur: v.duur, formaat: v.formaat, vorming: v.vorming, stijl: v.stijl, modus: v.modus, comp: v.comp || null, derby: v.derby === true, tv: nextTv }));
  } catch (e) { /* geen opslag is geen ramp */ }
};
const schrijfTv = (tv) => schrijfOpslag(leesOpslag(), { camera: tv.camera, regels: tv.regels });
const TV_TIMINGS = { intro: 7.5, rust: 10, eind: 12 };     // lang genoeg voor de opstelling, de rustpauze met statistieken en de eindsamenvatting
const zetDuurVoorkeur = (duur) => { const v = leesOpslag(); if (DUREN[duur]) { v.duur = duur; schrijfOpslag(v); } return leesOpslag().duur; };
let panel = null;         // het keuzescherm voor de wedstrijd (alleen solo): { v: voorkeur }
const stijlVan = (s) => STIJLEN[(STIJLEN.indexOf(s) + 1) % STIJLEN.length];
const nextFormation = (formaat, v) => { const l = formationNames(formaat); return l[(l.indexOf(cleanFormation(formaat, v)) + 1) % l.length]; };

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
    bar: new THREE.MeshBasicMaterial({ color: 0xf4f1e8 }),
    gras: new THREE.MeshStandardMaterial({ map: gras, roughness: 0.95 }),
    bal: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
    schaduw: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    ring: new THREE.MeshBasicMaterial({ color: 0xf4c430, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }),
    ringAnder: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
    pijl: new THREE.MeshBasicMaterial({ color: 0xf4c430 }),
    bord: new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 0.8 }),
  };
  for (const m of Object.values(mats)) m.userData.shared = true; // review 22-11 P1: gedeeld tussen wedstrijden; disposeObject laat ze staan
  return mats;
}

function doos(parent, mat, bx, by, bz, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function buildGoal(root, M, fy, uit) { // fy: de doellijn (-(VELD.L / 2) of (VELD.L / 2)); uit: de richting (-1 of 1) van het net in wereld-z
  const w = toLocal(0, fy), ph = PITCH.DOEL_H, diep = PITCH.DOEL_DIEPTE;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(PITCH.PAAL_R, PITCH.PAAL_R, ph, 8), M.paal);
    p.position.set(w.x + s * (PITCH.DOEL_B / 2), ph / 2, w.y); p.castShadow = true; root.add(p);
  }
  const lat = new THREE.Mesh(new THREE.CylinderGeometry(PITCH.PAAL_R, PITCH.PAAL_R, PITCH.DOEL_B + 0.14, 8).rotateZ(Math.PI / 2), M.paal);
  lat.position.set(w.x, ph, w.y); lat.castShadow = true; root.add(lat);
  const behind = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.DOEL_B, ph), M.net);
  behind.position.set(w.x, ph / 2, w.y + uit * diep); root.add(behind);
  for (const s of [-1, 1]) {
    const zij = new THREE.Mesh(new THREE.PlaneGeometry(diep, ph).rotateY(Math.PI / 2), M.net);
    zij.position.set(w.x + s * (PITCH.DOEL_B / 2), ph / 2, w.y + uit * diep / 2); root.add(zij);
  }
  const dak = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.DOEL_B, diep).rotateX(-Math.PI / 2), M.net);
  dak.position.set(w.x, ph, w.y + uit * diep / 2); root.add(dak);
}

let gateMat = null;
function gateSign() {
  if (gateMat) return gateMat; // review 22-11 P1: een keer gemaakt en gedeeld (geen nieuwe textuur per wedstrijd)
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#17301f'; g.fillRect(0, 0, 256, 96);
  g.fillStyle = '#f0ede4'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center';
  g.fillText('De Stadjers', 128, 40);
  g.font = '22px sans-serif'; g.fillText('Vijf tegen vijf', 128, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  gateMat = new THREE.MeshBasicMaterial({ map: t });
  gateMat.userData.shared = true;
  return gateMat;
}

function bouw(w, formaat = 'klein', site = null) {
  zetFormaat(formaat);
  const M = materials();
  const at = site || { x: CX, y: CY, a: 0 };
  if (w && w.map && typeof w.map.surfaceAt === 'function') { try { const r = w.map.surfaceAt(at.x, at.y, { z: 0, ribbon: null }); if (r && Number.isFinite(r.z)) ground = r.z; } catch (e) { ground = 0; } }
  const root = new THREE.Group();
  root.position.set(at.x, ground, at.y);      // het veld is in eigen ruimte gebouwd (toLocal) en draait mee met de lengteas van het park
  root.rotation.y = -at.a;
  const gras = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.B + 3, PITCH.L + 6).rotateX(-Math.PI / 2), M.gras);
  gras.position.set(0, 0.035, 0);
  gras.receiveShadow = true;
  root.add(gras);
  const line = (bx, bz, fx, fy) => { const q = toLocal(fx, fy); doos(root, M.bar, bx, 0.02, bz, q.x, 0.06, q.y); };
  // de rand, de middenlijn, het middencirkeltje en de twee strafschopgebieden
  line(PITCH.B, 0.12, 0, -(PITCH.L / 2)); line(PITCH.B, 0.12, 0, (PITCH.L / 2)); line(0.12, PITCH.L, -(PITCH.B / 2), 0); line(0.12, PITCH.L, (PITCH.B / 2), 0);
  line(PITCH.B, 0.1, 0, 0);
  const groot = formaat === 'groot', cirkel = groot ? 9.15 : 3;
  const mid = new THREE.Mesh(new THREE.RingGeometry(cirkel - 0.1, cirkel, 48).rotateX(-Math.PI / 2), M.bar);
  const mq = toLocal(0, 0); mid.position.set(mq.x, 0.065, mq.y); root.add(mid);
  for (const s of [-1, 1]) {
    const y0 = s * (PITCH.L / 2), y1 = s * ((PITCH.L / 2) - PITCH.STRAF_D);
    line(PITCH.STRAF_B, 0.1, 0, y1); line(0.1, PITCH.STRAF_D, -PITCH.STRAF_B / 2, (y0 + y1) / 2); line(0.1, PITCH.STRAF_D, PITCH.STRAF_B / 2, (y0 + y1) / 2);
    const stip = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12).rotateX(-Math.PI / 2), M.bar);
    const sq = toLocal(0, s * ((PITCH.L / 2) - (groot ? 11 : 4.5))); stip.position.set(sq.x, 0.066, sq.y); root.add(stip);
  }
  buildGoal(root, M, -(PITCH.L / 2), -1); buildGoal(root, M, (PITCH.L / 2), 1);
  const gateBoard = new THREE.Group();
  doos(gateBoard, M.bord, 0.18, 2.4, 0.18, -1.6, 1.2, 0); doos(gateBoard, M.bord, 0.18, 2.4, 0.18, 1.6, 1.2, 0);
  const plaat = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.28), gateSign());
  plaat.position.set(0, 2.1, -0.1); plaat.rotation.y = Math.PI; gateBoard.add(plaat);
  gateBoard.position.set(GATE.x, ground, GATE.y + 1.4);
  gateBoard.visible = !site;                  // het bord bij de spelerspoort hoort alleen bij de Euroborg
  const bal = new THREE.Mesh(new THREE.SphereGeometry(BAL_VIS, 14, 10), M.bal);
  bal.castShadow = true; bal.visible = false;
  const schaduw = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14).rotateX(-Math.PI / 2), M.schaduw);
  schaduw.visible = false;
  getScene().add(root, gateBoard, bal, schaduw);
  return { root, bord: gateBoard, bal, schaduw, formaat };
}

// De borden horen bij een wedstrijd: het Euroborg-veld blijft staan tussen wedstrijden, dus de vorige borden gaan eerst weg (geen opeenstapeling).
function zetReclame(doel, namen) {
  if (!doel) return;
  if (doel.reclame) { doel.root.remove(doel.reclame.groep); disposeObject(doel.reclame.groep); doel.reclame = null; }
  if (namen && namen.length) doel.reclame = buildAdBoards(doel.root, { names: namen, B: PITCH.B, L: PITCH.L, toLocal });
}

function ruimBouwOp() {
  if (!built) return;
  const sc = getScene();
  for (const o of [built.root, built.bord, built.bal, built.schaduw]) { sc.remove(o); disposeObject(o); } // review 22-11 P1: geometrie vrij, gedeelde materialen blijven
  built = null;
}

// Het tijdelijke veld van een carrièrewedstrijd weer weg (en het veld terug naar de Euroborg).
function zetGround(w, x, y) {
  if (w && w.map && typeof w.map.surfaceAt === 'function') { try { const r = w.map.surfaceAt(x, y, { z: 0, ribbon: null }); if (r && Number.isFinite(r.z)) ground = r.z; } catch (e) { /* de grond blijft zoals hij was */ } }
}
function ruimParkOp() {
  if (!parkBuilt) return;
  const sc = getScene();
  if (parkBuilt.publiek) parkBuilt.publiek.dispose();
  for (const o of [parkBuilt.root, parkBuilt.bord, parkBuilt.bal, parkBuilt.schaduw]) { sc.remove(o); disposeObject(o); }
  parkBuilt = null;
}

// Bij de spelerspoort (de kleedkamer van het spel) draagt de speler met een carrière het trainingspak van zijn club; verder weg weer de eigen kleren (footballkitlive.js gateKit).
const POORT_KIT_M = 45;
function updateGateKit(w) {
  try {
    const p = hoofdspeler(w);
    const near = !!p && !game && !p.inVehicle && !p.swimming && Math.hypot(p.x - GATE.x, p.y - GATE.y) < POORT_KIT_M;
    gateKit(w, near, !!(game || panel || w.activityGame || w.pigeonMode || w.heliRun));
  } catch (e) { /* een tenue mag het spel nooit stoppen */ }
}

function updateLod(w) {
  const p = hoofdspeler(w);
  const d = Math.hypot(p.x - CX, p.y - CY);
  if (!built && d < DETAIL_M) built = bouw(w, 'klein');
  if (!built) return;
  built.root.visible = d < DETAIL_M + 80 || !!game;
  built.bord.visible = built.root.visible;
}

// --- de spelers ---------------------------------------------------------------------------------------------------------------------

const VROUW = new Set(['Wietske', 'Grietje', 'Fenna', 'Marrit']);
// kc: { level, mijnSlot, sponsors } (voetbalkleding 22-11): de kleding van elke speler komt uit het kledingsysteem (footballkit.js actorLook), op het niveau van de klasse; de eigen
// speler draagt precies wat Tammo of Tessa in de wereld draagt (het clubtenue, de override uit footballkitlive.js), teamgenoten en tegenstanders hun clubkleuren.
function makeActors(sim, kc = null) {
  const scene = getScene();
  const level = (kc && kc.level) || 'amateur';
  const adj = (x) => ({ ...x, patroon: levelPattern(x.patroon, level) });   // een dorpsclub speelt effen: het onderscheid tussen de teams moet daarop gecontroleerd worden
  const acts = sim.spelers.map((p) => {
    const t = p.team === 1 && sim.teams[0].patroon ? awayKit(adj(sim.teams[0]), adj(sim.teams[1])) : sim.teams[p.team]; // een carrièreduel waar beide teams op elkaar lijken: de uitploeg speelt in een uitshirt (voetbalworld.js)
    const human = sim.mensen.find((x) => x.ctl === p.id);
    const vrouw = VROUW.has(p.naam) || (human && human.char === 'anita');
    const own = human && kc && human.slot === kc.mijnSlot && (human.char === 'anita' || human.char === 'tammo') ? (human.char === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE) : null;
    let mesh;
    if (own && own.look && p.rol !== 'keeper') mesh = buildPersonMesh(own.shirt, own.skin, { ...own }); // precies de figuur uit de wereld, met het clubtenue erop
    else {
      const al = actorLook({ ...t, patroon: levelPattern(t.patroon, level) }, { level, role: p.rol, number: p.rol === 'keeper' ? 1 : 2 + (p.i % 20), seed: 9811 + p.id * 13, clubId: t.id || '', name: true, sponsors: p.team === 0 && kc ? kc.sponsors : [] });
      mesh = buildPersonMesh(al.shirt, 0xd9b48f, {
        variant: vrouw ? 'female' : 'male', seed: 9811 + p.id * 13, pants: al.pants, shoes: al.shoes, shirtBands: al.shirtBands, ...(al.body ? { body: al.body } : {}), ...(al.hairStyle ? { hairStyle: al.hairStyle } : {}), ...(al.hair != null ? { hair: al.hair } : {}),
        look: { ...al.look, age: 'adult', umbrella: null },
      });
    }
    mesh.rotation.order = 'ZYX';
    scene.add(mesh);
    return { mesh };
  });
  return acts;
}

function makeMarkings() {
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
  ctx.fillStyle = '#f0ede4';
  ctx.strokeStyle = '#f0ede4';
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
  if (game || panel || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return false;
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
  return { id: 'voetbal', x: GATE.x, y: GATE.y, h: 2.2, key: 'E', label: 'Wedstrijd spelen', sub: why || recText() || PROMPT_SUB, ring: true, dim: !!why };
}
function secondary(w) {
  if (game || hoofdspeler(w).inVehicle) return [];
  if (Math.hypot(hoofdspeler(w).x - GATE.x, hoofdspeler(w).y - GATE.y) > 160) return [];
  return [{ id: 'voetbal-2', x: GATE.x, y: GATE.y, h: 2.2, label: 'Wedstrijd spelen in de Euroborg', sub: 'Loop naar de spelerspoort en druk E', kind: 'place' }];
}
function interact(w) {
  if (!nearGate(w)) return false;
  const why = activityBlock(w);
  if (why) { w.addMessage(why, 2.5); return true; }
  // met gasten in de sessie is de wedstrijd een uitnodiging aan iedereen (Meedoen? J of N); nog eens E start meteen
  const uit = wedNodigUit(w, 'voetbal');
  if (uit.ok) { if (uit.reden === 'wacht') wedNuStarten(w); return true; }
  openPanel(w); // alleen: eerst het keuzescherm (formaat, competitie, vorming, stijl, duur)
  return true;
}

// --- het keuzescherm (solo): formaat, competitie, vorming, speelstijl en duur; de keuze blijft staan op dit apparaat ----------------------------------------------------

function panelHud() {
  const v = panel.v, comp = v.modus === 'competitie' ? leesCompetitie(v.comp) : null;
  const formaat = v.modus === 'competitie' ? 'groot' : v.formaat;
  const next = comp && !comp.klaar ? nextOpponent(comp) : null;
  const modus = v.modus === 'competitie' ? (comp && !comp.klaar ? `Competitie, ronde ${comp.ronde + 1} van 5 tegen ${clubName(next)}` : 'Competitie: een newName seizoen') : 'Vriendschappelijk';
  const tv = leesTv();
  const row = `<span>Wedstrijd spelen</span><span><b>${FORMATEN[formaat].naam}</b></span><span>${modus}</span>`;
  const flash = `Vorming ${cleanFormation(formaat, v.vorming)} · stijl ${v.stijl} · ${v.duur === 'kort' ? 'kort' : 'normaal'} · kaarten en blessures ${tv.regels.kaarten ? 'aan' : 'uit'} · derby ${v.derby ? 'aan (vrienden in twee teams)' : 'uit (vrienden in jouw team)'} · ${MODE_NAMES[tv.camera].toLowerCase()}`;
  // De D-pad heeft maar vier cijfers (controls.js minigame: 1 tot 4): {E} (Y) zet een tweede pagina aan waar 1 tot 4 de opties 5 tot 8 zijn, zodat ook met een controller alles te kiezen is.
  const help = (panel.pagina === 1
    ? keyTextHtml('{F} Wedstrijd spelen · {1} duur · {2} kaarten en blessures · {3} camera · {4} derby met vrienden · {E} terug naar de eerste opties · {BACKSPACE} stopt')
    : keyTextHtml('{F} Wedstrijd spelen · {1} formaat · {2} competitie · {3} vorming · {4} stijl · {5} duur · {6} kaarten en blessures · {7} camera · {8} derby met vrienden · {E} tweede pagina · {BACKSPACE} stopt')) + ' · Penalty’s zijn een minigame bij de poort ernaast';
  ensureBoard().set({ row, cells: null, meter: null, flash, bad: false, help });
}
function openPanel(w) {
  panel = { v: leesOpslag(), pagina: 0, t0: w.time };
  const v = panel.v;
  if (v.modus === 'competitie') { v.formaat = 'groot'; v.vorming = cleanFormation('groot', v.vorming); }
  ensureBoard().show();
  panelHud();
  const tu = tessaUitleg();
  if (tu) w.addMessage(tu, 6);
}
function closePanel() {
  if (!panel) return;
  panel = null;
  if (board) board.hide();
}
function panelTick(w) {
  const inp = w.input, v = panel.v;
  w.minigameUntil = w.time + 0.25;
  if (w.pendingRespawn || stopPressed(inp)) { closePanel(); return; }
  let fresh = false;
  const druk = (k) => { if (inp.wasPressed(k)) { inp.consume(k); return true; } return false; };
  // E (Y op de controller) wisselt van pagina; de E die het keuzescherm opende telt niet mee (eerste halve seconde)
  if (w.time - panel.t0 > 0.5 && druk('e')) { panel.pagina = panel.pagina === 1 ? 0 : 1; panelHud(); }
  // pagina 1: de cijfers 1 tot 4 zijn de opties 5 tot 8 (de D-pad); 5 tot 8 blijven op het toetsenbord gewoon werken
  const optie = (n) => (n <= 4 ? panel.pagina !== 1 && druk(String(n)) : druk(String(n)) || (panel.pagina === 1 && druk(String(n - 4))));
  if (optie(1)) { v.formaat = v.formaat === 'klein' ? 'groot' : 'klein'; v.modus = 'vriendschappelijk'; fresh = true; }
  if (optie(2)) { v.modus = v.modus === 'competitie' ? 'vriendschappelijk' : 'competitie'; if (v.modus === 'competitie') v.formaat = 'groot'; fresh = true; }
  if (optie(3)) { v.vorming = nextFormation(v.modus === 'competitie' ? 'groot' : v.formaat, v.vorming); fresh = true; }
  if (optie(4)) { v.stijl = stijlVan(v.stijl); fresh = true; }
  if (optie(5)) { v.duur = v.duur === 'kort' ? 'normaal' : 'kort'; fresh = true; }
  if (optie(6)) { const tv = leesTv(), aan = !(tv.regels.kaarten && tv.regels.blessures); tv.regels = { ...tv.regels, kaarten: aan, blessures: aan }; schrijfTv(tv); fresh = true; }
  if (optie(7)) { const tv = leesTv(); tv.camera = nextMode(tv.camera); schrijfTv(tv); fresh = true; }
  if (optie(8)) { v.derby = !v.derby; fresh = true; }
  if (fresh) { v.vorming = cleanFormation(v.formaat, v.vorming); schrijfOpslag(v); panelHud(); }
  if (druk('f') || druk(' ')) { schrijfOpslag(v); closePanel(); launch(w, { force: true }); }
}

function freshOptions(v = leesOpslag()) {
  const level = footballLevel();
  let comp = null, tg = runs % OPPONENTS.length, formaat = v.formaat;
  if (v.modus === 'competitie') { // een seizoen: elf tegen elf tegen de club van deze ronde
    comp = leesCompetitie(v.comp);
    if (!comp || comp.klaar) comp = newCompetition(((Date.now() / 1000) | 0) + runs);
    const id = nextOpponent(comp), k = OPPONENTS.findIndex((t) => t.id === id);
    if (k >= 0) tg = k;
    formaat = 'groot';
  }
  return { duur: footballDuration(v.duur), stand: level, tg, formaat, vorming: cleanFormation(formaat, v.vorming), stijl: cleanStijl(v.stijl), comp, seed: ((Date.now() / 1000) | 0) + runs * 7919 };
}

// start: solo (sim = null), de host van een Samen-wedstrijd (online 'host', sim van het kader) of een gast (online 'gast', sim = de spiegel).
function launch(w, { force = false, online = null, sim = null, career = null } = {}) {
  if (game) return false;
  if (!force && !online && activityBlock(w)) return false;
  const p = hoofdspeler(w);
  if (p.inVehicle && p.exitVehicle) p.exitVehicle(w.map, w);
  runs++;
  let opt = online === 'gast' ? null : (uitnodiging && online ? uitnodiging : freshOptions());
  if (career) { const v = leesOpslag(); opt = { duur: 'normaal', stand: footballLevel(), tg: 0, formaat: 'groot', vorming: cleanFormation('groot', v.vorming), stijl: cleanStijl(v.stijl), comp: null, seed: ((Date.now() / 1000) | 0) + runs * 7919 }; }
  if (career) { site = career.site || { x: CX, y: CY, a: 0 }; }
  if (!sim && career) sim = makeMatch([{ slot: 0, naam: career.naam || 'Jij', char: career.char, bonus: career.bonus }], { duur: opt.duur, stand: opt.stand, seed: opt.seed, formaat: 'groot', vorming: opt.vorming, stijl: opt.stijl, teams: career.teams, ratings: career.ratings, regels: leesTv().regels, timings: TV_TIMINGS });
  if (!sim) sim = makeMatch([{ slot: 0, naam: 'Jij', char: p.character || null, bonus: voetbalBonusVan() }], { duur: opt.duur, stand: opt.stand, seed: opt.seed || 1, tegenstander: opt.tg, formaat: opt.formaat, vorming: opt.vorming, stijl: opt.stijl, regels: leesTv().regels, timings: TV_TIMINGS });
  const mode = online === 'gast' ? sim.stand : opt.stand;
  if (opt && opt.comp && !online) { const vv = leesOpslag(); vv.comp = opt.comp; schrijfOpslag(vv); }
  zetFormaat(sim.formaat);
  zetGround(w, site.x, site.y);
  if (built && built.formaat !== sim.formaat) ruimBouwOp();
  if (!built) built = bouw(w, sim.formaat);
  if (career && career.site) {
    ruimParkOp(); parkBuilt = bouw(w, sim.formaat, career.site);
    try { // supporters langs de lijn (voetbalpubliek.js): het aantal volgt de klasse; niet bij de laagste kwaliteit
      const cc = CL.getCareer(), div = (cc && cc.world && divisionOfMyClub(cc)) || 'talent';
      parkBuilt.publiek = buildCrowd(parkBuilt.root, { count: parkCrowdCount(div), seed: (sim.seed | 0) + 1, B: PITCH.B, L: PITCH.L, toLocal, uit: crowdVisible({ quality: getSettings().quality === 'laag' ? 'laagst' : 'hoog' }) === 'uit', bake: bakeFigure, material: figureMaterial() });
    } catch (e) { parkBuilt.publiek = null; }
  }
  try { // de reclameborden van de sponsors (verzonnen namen) langs de zijlijnen, op het park en in de Euroborg; zonder sponsors geen borden (#1118)
    const cs = career ? CL.getCareer() : null, namen = cs && cs.sponsors ? boardNames(cs.sponsors) : [];
    if (!parkBuilt && built) zetReclame(built, namen); else if (parkBuilt && built) zetReclame(built, []);
    if (parkBuilt) zetReclame(parkBuilt, namen);
  } catch (e) { /* een bord mag de wedstrijd nooit stoppen */ }
  const bon = career ? null : characterEnter(w, 'voetbal'); // de speler voetbalt als Tessa (wissel per speler, terug bij het einde); zonder haak gebeurt er niets
  // het clubtenue (voetbalkleding 22-11): carrière = de kit van je club op het niveau van je klasse (de Waddenbeker is topniveau), zonder club een neutrale trainingsset;
  // een tijdelijke override, de eigen outfit blijft bewaard en komt bij end() terug. De coach (geen mensen in de sim) kleedt niemand om.
  let kc = null;
  try {
    const cs = career ? CL.getCareer() : null, kind = career && career.match ? career.match.kind : 'league';
    const level = career ? (kind === 'europe' ? 'top' : levelOfDivision((cs && cs.world && divisionOfMyClub(cs)) || 'talent')) : 'amateur';
    kc = { level, mijnSlot: online === 'gast' ? sim.mijnSlot : 0, sponsors: cs && cs.sponsors ? boardNames(cs.sponsors) : [] };
    if (!(career && career.coach)) kitOn(w, { mode: 'wedstrijd', kind, neutraal: !career });
  } catch (e) { kc = null; }
  game = { online, sim, cctx: career ? career.cctx || null : null, t: 0, dt: 0, cam: null, actors: makeActors(sim, kc), marks: makeMarkings(), mode, said: 0, lastFase: sim.fase, laadG: { schot: 0, lang: 0 }, bon, exitX: career && career.site ? toWorld((PITCH.B / 2) + 4, 0).x : GATE.x, exitY: career && career.site ? toWorld((PITCH.B / 2) + 4, 0).y : GATE.y, career, gemeld: false, comp: online || !opt ? null : opt.comp };
  tvInit(w, game);
  const fl = fld();
  fl.root.visible = true; fl.bord.visible = !parkBuilt;
  fl.bal.visible = true; fl.schaduw.visible = true;
  w.voetbalGame = game;
  w.cinematicHidePlayers = true;
  ensureBoard(); board.show(); zetBordKop(game);
  w.companionHold = career && career.site ? { x: game.exitX, y: game.exitY, face: -Math.PI / 2 } : { x: GATE.x, y: GATE.y - 4, face: -Math.PI / 2 };
  if (online === 'gast') installeerGastKnoppen(w);
  if (online !== 'gast') toonStartkaart(w, 'voetbal', { record: recText() });
  ballSfx(w, 'sport_stinger');
  if (online !== 'gast' && tessaUitleg()) w.addMessage(tessaUitleg(), 6); // de regel over het dorpsteam van Tessa (alleen tekst, alleen met de Tessa-haak)
  teken(w, 0);
  return true;
}

function say(w, kind, force = false) {
  const pool = VOETBAL_LINES[kind];
  if (!pool || !game) return;
  if (!force && game.t - game.said < 5) return;
  const q = toWorld((PITCH.B / 2) + 3, 0);
  const tessa = (kind === 'goalThuis' && tessaLine('viering')) || (kind === 'redding' && tessaLine('keepersneer')) || (kind === 'overtreding' && tessaLine('tegenstandersneer')) || null; // alleen tekst; zonder de Tessa-haak is dit null
  if (!tessa) return;      // het gewone commentaar is van Hilbrand en Roelie (voetbalcommentaar.js); hier alleen nog Tessa's eigen regel
  game.said = game.t;
  bubble(w, { x: q.x, y: q.y, name: 'Tessa', text: tessa, h: 3.2, tag: 'voetbal', ttl: 4 });
}

// --- het spel zelf --------------------------------------------------------------------------------------------------------------

const ownHuman = (g) => g.sim.mensen.find((x) => (g.online === 'gast' ? x.slot === g.sim.mijnSlot : x.slot === 0)) || g.sim.mensen[0] || null;
const mijnTeam = (g) => { const m = ownHuman(g); return m && m.team === 1 ? 1 : 0; };   // derby (#1114): een mens kan in team 1 spelen
const eigenId = (g) => { const m = ownHuman(g); return g.online === 'gast' ? g.sim.mijnId : m && !m.weg ? m.ctl : -1; };

function invoer(w) { return leesInvoer((k) => w.input.isDown(k), () => w.input.axis()); }

function updateSolo(w, dt) {
  const g = game;
  const inv = invoer(w);
  g.evs = tikWedstrijd(g.sim, dt, () => inv);
  handleEvents(w, g.evs);
}
function updateHost(w, dt) {
  const g = game, n = w.coopNet;
  if (!n || !n.wed || n.wed.lv !== g.sim) { end(w, { quit: true, extern: true }); return; } // de sessie is weg
  const inv = invoer(w);
  g.evs = wedLiveTik(w, g.sim, dt, () => inv);
  handleEvents(w, g.evs);
}

// SFX ronde 5: een geluid van de centrale tabel op de plek van de bal (elke machine speelt zijn eigen wedstrijdgebeurtenissen: lokaal)
function ballSfx(w, key) { const b = game && game.sim && game.sim.bal ? toWorld(game.sim.bal.x, game.sim.bal.y) : null; sfxEvent(w, key, b && b.x, b && b.y); }

function handleEvents(w, evs) {
  const g = game;
  for (const e of evs) {
    commentaarVoor(g.com, e, comCtx(g));
    const hh = planHerhaling(g.op, e, { online: !!g.online, klok: g.sim.klok, laatste: g.lastKans });
    if (hh) { g.replayWacht = hh; if (hh.soort === 'kans') g.lastKans = g.op.t; }
    if (e.type === 'schop') { const q = toWorld(e.x, e.y); pushAudioEvent(w, { kind: 'golf', sub: 'slag', strength: 0.25 + 0.5 * (e.sterkte || 0.5), x: q.x, y: q.y }); sfxEvent(w, 'football_kick', q.x, q.y); }
    else if (e.type === 'paal' || e.type === 'lat') { const b = toWorld(g.sim.bal.x, g.sim.bal.y); pushAudioEvent(w, { kind: 'golf', sub: 'rand', strength: 0.7, x: b.x, y: b.y }); sfxEvent(w, 'football_post', b.x, b.y); sfxEvent(w, 'crowd_groan', b.x, b.y); }
    else if (e.type === 'goal') {
      const b = toWorld(g.sim.bal.x, g.sim.bal.y); pushAudioEvent(w, { kind: 'golf', sub: 'hole', strength: 0.9, x: b.x, y: b.y });
      sfxEvent(w, 'football_net', b.x, b.y); sfxEvent(w, 'crowd_goal_roar', b.x, b.y);   // SFX ronde 5: het net en het publiek
      flits();
      say(w, e.team === mijnTeam(g) ? 'goalThuis' : 'goalUit', true);
    } else if (e.type === 'redding') { say(w, 'redding'); ballSfx(w, 'crowd_groan'); }
    else if (e.type === 'uit') say(w, 'uit');
    else if (e.type === 'overtreding') say(w, 'overtreding');
    else if (e.type === 'fluit') { if (e.helft === 1) say(w, 'rust', true); ballSfx(w, 'referee_whistle'); }
    else if (e.type === 'aftrap') { ballSfx(w, 'referee_whistle'); if (g.sim.helft === 1 && g.sim.score[0] + g.sim.score[1] === 0) ballSfx(w, 'crowd_chant'); }   // SFX ronde 6: het publiek zingt bij de eerste aftrap
    else if (e.type === 'hervat') ballSfx(w, 'referee_whistle');
    else if (e.type === 'kaart' || e.type === 'buitenspel') ballSfx(w, 'referee_whistle');
    else if (e.type === 'stuit') ballSfx(w, 'ball_bounce');
    else if (e.type === 'einde') { say(w, e.winnaar === 0 ? 'winst' : e.winnaar < 0 ? 'gelijk' : 'verlies', true); ballSfx(w, 'referee_whistle'); sfxEvent(w, 'sport_stinger'); }
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
  const toest = guestState(game.sim);
  game.evs = guestEvents(game.gastPrev, toest);       // commentaar en regie zijn lokaal: ze lezen het verschil tussen twee momentopnamen
  game.gastPrev = toest;
  for (const e of game.evs) commentaarVoor(game.com, e, comCtx(game));
  tvRegie(w, dt);
  teken(w, dt);
  updateHud(w);
  tvTik(w, dt);
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
  if (g.replay) { tikHerhaling(w, dt); return; }
  if (w.input.wasPressed('3')) { w.input.consume('3'); const tv = leesTv(); tv.camera = nextMode(g.regie.modus); g.regie.modus = tv.camera; schrijfTv(tv); g.cam = null; w.addMessage(MODE_NAMES[tv.camera], 2.5); }
  if (g.faseVorig !== g.sim.fase) { g.faseVorig = g.sim.fase; g.faseSinds = 0; } else g.faseSinds += dt;
  if (!g.online && (g.sim.fase === 'intro' || g.sim.fase === 'rust' || g.sim.fase === 'eind') && magOverslaan(g.sim.fase, g.faseSinds) && (w.input.wasPressed('f') || w.input.wasPressed(' '))) { w.input.consume('f'); w.input.consume(' '); g.sim.faseT = Math.min(g.sim.faseT, 0.05); } // de opstelling, rustpauze of samenvatting overslaan
  if (g.career && g.career.coach) { // coachen: de tactiek onderweg met rusttijd (voetbalcoach.js); de voorkeur van het keuzescherm blijft ongemoeid
    for (const k of ['1', '2']) {
      if (!w.input.wasPressed(k)) continue;
      w.input.consume(k);
      const wissel = k === '1' ? { stijl: stijlVan(g.sim.tac[0].stijl) } : { vorming: nextFormation(g.sim.formaat, g.sim.tac[0].vorming) };
      const r = coachTactic(g.sim, wissel);
      w.addMessage(coachMelding(k === '1' ? `Speelstijl: ${wissel.stijl}` : `Vorming: ${wissel.vorming}`, r), 2.5);
    }
  } else {
    if (w.input.wasPressed('1')) { w.input.consume('1'); const freshStyle = stijlVan(g.sim.tac[0].stijl); zetTactiek(g.sim, 0, { stijl: freshStyle }); const vv = leesOpslag(); vv.stijl = freshStyle; schrijfOpslag(vv); w.addMessage(`Speelstijl: ${freshStyle}`, 2.5); }
    if (w.input.wasPressed('2')) { w.input.consume('2'); const nv = nextFormation(g.sim.formaat, g.sim.tac[0].vorming); zetTactiek(g.sim, 0, { vorming: nv }); const vv = leesOpslag(); if (vv.formaat === g.sim.formaat) { vv.vorming = nv; schrijfOpslag(vv); } w.addMessage(`Vorming: ${nv}`, 2.5); }
  }
  if (g.online === 'host') updateHost(w, dt); else updateSolo(w, dt);
  if (!game) return;
  if (g.sim.fase === 'klaar') { end(w); return; }
  const p = hoofdspeler(w), id = eigenId(g);
  if (id >= 0) { const q = toWorld(g.sim.spelers[id].x, g.sim.spelers[id].y); p.x = q.x; p.y = q.y; p.angle = Math.PI / 2; } // de wereld streamt rond het veld
  opnameTik(g.op, g.sim, dt);
  if (g.replayWacht && !g.online && (g.sim.fase === 'aftrap' || g.sim.fase === 'hervat')) launchReplay(w);
  else if (g.replayWacht && (g.sim.fase === 'rust' || g.sim.fase === 'eind' || g.sim.fase === 'klaar')) g.replayWacht = null;
  tvRegie(w, dt);
  teken(w, dt);
  updateHud(w);
  tvTik(w, dt);
  if (parkBuilt && parkBuilt.publiek) { if (g.sim.fase === 'goal') g.goalT = 0; else if (g.goalT >= 0) { g.goalT += dt; if (g.goalT > 5) g.goalT = -1; } parkBuilt.publiek.tik(dt, g.goalT >= 0 ? g.goalT : -1, !reducedMotion()); }
}

// --- de tv-laag: commentaar, regie, herhaling, namen, pijlen en overlay (alleen lokaal; Samen spelen stuurt hier niets voor over het net) -----------------------------------------------

const comCtx = (g) => ({ carriere: g.cctx || null, fase: g.sim.fase, helft: g.sim.helft, klok: g.sim.klok, duurHelft: g.sim.duurHelft, score: g.sim.score.slice(), bezit: g.bezitPct, derby: g.derby, naamVan: (id) => (g.sim.spelers[id] ? g.sim.spelers[id].naam : '') });

function tvInit(w, g) {
  const sim = g.sim;
  g.com = makeCommentaar({ seed: (sim.seed | 0) + runs, teams: [sim.teams[0].kort, sim.teams[1].kort], ids: [sim.teams[0].id, sim.teams[1].id], duurHelft: sim.duurHelft, buiten: !!(g.career && g.career.site) });
  g.derby = derbyVan(sim.teams[0].id, sim.teams[1].id);
  g.regie = makeRegie({ modus: leesTv().camera });
  g.op = makeOpname(); g.replay = null; g.replayWacht = null; g.lastKans = -999; g.camShot = 'breed'; g.camReplay = null; g.evs = [];
  g.tv = makeTvLayer(); g.namen = makeNamen(sim); g.pijlen = makePijlen();
  g.ondertitel = null; g.bezitPct = [50, 50]; g.bezitT = 0; g.radarT = -1; g.radarHtml = null; g.mvpGezegd = false; g.eindT = -1; g.gastPrev = guestState(sim); g.paneelCache = { fase: '', html: '' }; g.pasT = 0; g.pasId = -1;
  commentaarVoor(g.com, { type: 'aftrap', team: 0 }, { ...comCtx(g), helft: 1 });    // de commentatoren openen al tijdens de opstelling
}
function tvStop(g) {
  if (g.tv) g.tv.weg();
  const sc = getScene();
  for (const n of g.namen || []) { sc.remove(n.sp); n.mat.dispose(); n.tex.dispose(); }
  if (g.pijlen) for (const k of ['pas', 'schot']) { sc.remove(g.pijlen[k].g); g.pijlen[k].bar.geometry.dispose(); g.pijlen[k].kop.geometry.dispose(); g.pijlen[k].mat.dispose(); }
}

// De regie: welk shot nu (op de gebeurtenissen van deze tik); een wissel is een harde snit.
function tvRegie(w, dt) {
  const g = game, rs = regieTik(g.regie, g.sim, g.evs || [], dt);
  if (rs.cut) g.cam = null;
  g.camShot = rs.shot;
}

// Het commentaar op het scherm (ondertitel) en, als er een opname is, ook te horen. De ondertitel is er altijd.
function sayLine(w, r) {
  const g = game;
  let dur = Math.max(2.8, 0.9 + r.tekst.split(/\s+/).length * 0.42);
  const v = r.sleutel ? lineVoiceFor(r.stem, r.tekst) : null;
  if (v) { playBubbleVoice(v.src, v.dur, null); dur = Math.max(dur, v.dur + 0.4); }
  g.ondertitel = { html: subtitleHtml(r), tot: g.t + dur };
}

// Elke frame: het commentaar afspelen, de kaart van het moment (opstelling, rust, einde), de radar en de ondertitel.
// Waar de aftrap is, voor de opstellingskaart: een carrièrewedstrijd op een sportpark ligt in de plaats van de thuisclub, de rest in de Euroborg.
const plekTekst = (g) => { const m = g.career && g.career.site && g.career.match; const pl = m && m.parkPlaats; return pl ? `op het sportpark in ${pl}` : 'in de Euroborg'; };
function tvTik(w, dt) {
  const g = game, sim = g.sim;
  g.bezitT -= dt;
  if (g.bezitT <= 0 && !g.online) { g.bezitT = 2; g.bezitPct = statistiekenVan(sim).bezit; }
  for (const r of tikCommentaar(g.com, dt, comCtx(g))) sayLine(w, r);
  if (g.ondertitel && g.t > g.ondertitel.tot) g.ondertitel = null;
  if (sim.fase === 'eind' && g.eindT < 0) g.eindT = g.t;
  if (sim.fase === 'eind' && !g.mvpGezegd && g.t - g.eindT > 3.5 && !sim.spiegel) { g.mvpGezegd = true; const mvp = matchMvp(sim); if (mvp) commentMvp(g.com, mvp.naam); }
  let paneel = null, hint = null;
  const cardPhase = sim.fase === 'intro' || sim.fase === 'rust' || sim.fase === 'eind' || sim.fase === 'klaar';
  if (cardPhase) {
    if (g.paneelCache.fase !== sim.fase) g.paneelCache = { fase: sim.fase, html: sim.fase === 'intro' ? opstellingHtml(sim, plekTekst(g), { knop: !g.online }) : sim.fase === 'rust' ? rustHtml(sim) : eindHtml(sim) };
    paneel = g.paneelCache.html;
    hint = g.online || sim.fase === 'intro' ? null : '{F} Doorgaan';
  } else g.paneelCache = { fase: '', html: '' };
  g.radarT -= dt;
  if (g.radarT <= 0) { g.radarT = 0.2; g.radarHtml = cardPhase || g.replay ? null : radarHtml(sim, eigenId(g)); }
  g.tv.zet({ radar: g.radarHtml, paneel, hint, ondertitel: g.ondertitel ? g.ondertitel.html : null, herhaling: !!g.replay });
}

// De herhaling (alleen solo): na een doelpunt (of een grote kans) staat de wedstrijd even stil en zie je de opname van de laatste seconden vanaf de zijlijn en de doelcamera, op 80 procent snelheid.
function launchReplay(w) {
  const g = game, wacht = g.replayWacht;
  g.replayWacht = null;
  const clip = wacht ? opnameClip(g.op, wacht.van, wacht.tot) : null;
  if (!clip || clip.duur < 1.5) return;
  g.replay = { clip, t: 0, duur: clip.duur, soort: wacht.soort };
  g.cam = null;
}
function tikHerhaling(w, dt) {
  const g = game, r = g.replay, sim = g.sim;
  r.t += dt * 0.8;
  if (r.t >= r.duur || (magOverslaan('herhaling', r.t) && (w.input.wasPressed('f') || w.input.wasPressed(' ') || w.input.wasPressed('enter')))) { w.input.consume('f'); w.input.consume(' '); w.input.consume('enter'); g.replay = null; g.camReplay = null; g.cam = null; return; }
  const bw = pasFrameToe(sim, clipFrame(r.clip, r.t));
  g.camReplay = cameraVoor(herhalingShot(r.t / r.duur), sim, -1, g.t);
  g.replaySnit = herhalingShot(r.t / r.duur);
  teken(w, dt);
  herstelStaat(sim, bw);
  tvTik(w, dt);
}

// --- spelersnamen boven de spelers en de pas- en schotpijlen ----------------------------------------------------------------------------------

function makeNamen(sim) {
  if (typeof document === 'undefined') return [];
  const scene = getScene();
  return sim.spelers.map(() => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 56;
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    const sp = new THREE.Sprite(mat); sp.scale.set(3.6, 0.79, 1); sp.renderOrder = 12; sp.visible = false;
    scene.add(sp);
    return { sp, cv, tex, mat, sleutel: '' };
  });
}
function drawNameTag(n, naam, jij, kleur) {
  const sleutel = `${naam}|${jij ? 1 : 0}|${kleur}`;
  if (n.sleutel === sleutel) return;
  n.sleutel = sleutel;
  const c = n.cv.getContext && n.cv.getContext('2d');
  if (!c) return;
  c.clearRect(0, 0, 256, 56);
  c.fillStyle = hex(jij ? 0xf9c80e : 0xf3ead3); c.strokeStyle = hex(0x1d1b17); c.lineWidth = 4;
  c.fillRect(4, 8, 248, 40); c.strokeRect(4, 8, 248, 40);
  c.fillStyle = hex(kleur); c.fillRect(4, 8, 16, 40);
  c.fillStyle = hex(0x1d1b17); c.font = '700 26px "Barlow Condensed", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(String(naam).slice(0, 14), 138, 29);
  n.tex.needsUpdate = true;
}
// Namen: jouw speler (gemarkeerd), de baldrager, medespelers (mensen) en bij eigen bal de teamgenoten in de buurt (om aan te spelen). Op de rest staat niets: geen rommel in beeld.
function tekenNamen(g) {
  const sim = g.sim, id = eigenId(g), me = id >= 0 ? sim.spelers[id] : null, owner = sim.bal.owner;
  const eigenBal = owner >= 0 && sim.spelers[owner].team === mijnTeam(g);
  const actief = sim.fase === 'spel' || sim.fase === 'hervat' || sim.fase === 'aftrap' || sim.fase === 'goal';
  sim.spelers.forEach((p, i) => {
    const n = g.namen[i];
    if (!n) return;
    const jij = p.id === id;
    const tonen = actief && !p.rood && (jij || p.id === owner || sim.mensen.some((x) => !x.weg && x.ctl === p.id) || (me && eigenBal && p.team === me.team && Math.hypot(p.x - me.x, p.y - me.y) < 18));
    n.sp.visible = !!tonen;
    if (!tonen) return;
    drawNameTag(n, p.naam, jij, sim.teams[p.team].shirt);
    const q = toWorld(p.x, p.y);
    n.sp.position.set(q.x, ground + (jij ? 3.1 : 2.55), q.y);
  });
}
function makePijlen() {
  const scene = getScene();
  const mk = (kleur) => {
    const mat = new THREE.MeshBasicMaterial({ color: kleur, transparent: true, opacity: 0.85, depthWrite: false });
    const g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 1), mat);
    const kop = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 3).rotateX(Math.PI / 2), mat);
    g.add(bar, kop); g.visible = false; scene.add(g);
    return { g, bar, kop, mat };
  };
  return { pas: mk(0xf3ead3), schot: mk(0xf9c80e) };
}
function zetPijl(pj, van, naar, lengte) {
  const a = toWorld(van.x, van.y), b = toWorld(naar.x, naar.y), dx = b.x - a.x, dz = b.y - a.y, l = Math.hypot(dx, dz) || 1;
  pj.g.visible = true; pj.g.position.set(a.x, ground + 0.12, a.y); pj.g.rotation.y = Math.atan2(dx, dz);
  pj.bar.scale.z = lengte; pj.bar.position.z = lengte / 2 + 0.6; pj.kop.position.z = lengte + 0.9;
  return l;
}
// De pijlen: bij de bal een pijl naar de beste pass en, terwijl je laadt, een pijl voor de schotrichting (de lengte groeit met de kracht). Niets bij een gast (zijn invoer loopt via de host).
function tekenPijlen(g) {
  const k = g.pijlen, sim = g.sim, id = eigenId(g), human = ownHuman(g);
  k.pas.g.visible = false; k.schot.g.visible = false;
  if (g.online === 'gast' || g.replay || id < 0 || sim.bal.owner !== id || !human || human.weg || !(sim.fase === 'spel' || (sim.hervat && sim.hervat.t >= sim.hervat.pauze))) return;
  const p = sim.spelers[id];
  g.pasT -= g.dt;
  if (g.pasT <= 0) { g.pasT = 0.15; const q = p.rol === 'keeper' ? besteOntvanger(sim, p, { geenKeeper: true, minScore: 0.1 }) : besteOntvanger(sim, p, { minScore: 0.1 }); g.pasId = q ? q.id : -1; }
  if (g.pasId >= 0 && sim.spelers[g.pasId]) { const q = sim.spelers[g.pasId]; zetPijl(k.pas, p, q, Math.max(1, Math.min(8, Math.hypot(q.x - p.x, q.y - p.y) - 1.8))); }
  const laad = Math.max(human.laad.schot, human.laad.lang) / LAAD_S;
  if (laad > 0.02) {
    const dir = { x: Math.cos(p.face), y: Math.sin(p.face) };
    zetPijl(k.schot, p, { x: p.x + dir.x * 10, y: p.y + dir.y * 10 }, 2 + 6 * Math.min(1, laad));
  }
}

// --- tekenen --------------------------------------------------------------------------------------------------------------------

function teken(w, dt) {
  const g = game, sim = g.sim, b = sim.bal;
  sim.spelers.forEach((p, i) => {
    const a = g.actors[i], q = toWorld(p.x, p.y);
    a.mesh.position.set(q.x, ground, q.y);
    a.mesh.rotation.y = p.face - Math.PI - site.a;
    animatePersonWalk(a.mesh, p.speed || 0, dt);
    const ud = a.mesh.userData;
    a.mesh.rotation.z = p.duikT > 0 ? (p.duikDx || 0) * 1.15 : 0; // de keeper ligt languit (de kantelas is de wereld-z, zoals bij de penaltykeeper)
    a.mesh.position.y = ground + (p.duikT > 0 ? 0.35 : 0);
    if (p.tackleT > 0 || p.stun > 0) a.mesh.scale.y = 0.82; else a.mesh.scale.y = 1;
    if (p.vier > 0 && ud && ud.armL && ud.armR) { const s = Math.sin(g.t * 9 + p.id); ud.armL.rotation.z = 2.4 + s * 0.4; ud.armR.rotation.z = -2.4 - s * 0.4; }
  });
  const bq = toWorld(b.x, b.y);
  const fl = fld();
  fl.bal.position.set(bq.x, ground + (b.z || 0) + BAL_VIS, bq.y);
  fl.schaduw.position.set(bq.x, ground + 0.07, bq.y);
  fl.schaduw.scale.setScalar(clamp(1 - (b.z || 0) / 5, 0.4, 1));
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
  if (g.namen && !g.replay) tekenNamen(g); else if (g.namen) for (const n of g.namen) n.sp.visible = false;
  if (g.pijlen) tekenPijlen(g);
}

function camera(w) {
  const g = game;
  if (!g) return;
  const sim = g.sim, id = eigenId(g);
  // de tv-regie (voetbalregie.js) kiest het shot; het standaardshot is de camera achter je speler. De posities zijn veldcoördinaten.
  const shot = g.replay ? g.replaySnit : g.camShot;
  const extra = { ...(shot === 'viering' ? { speler: g.regie.scorer } : g.regie.extra), team1: mijnTeam(g) === 1 };   // derby (#1114): team 1 kijkt vanaf de andere kant
  const cv = g.replay && g.camReplay ? g.camReplay : cameraVoor(shot, sim, id, g.t, extra);
  const wp = (q) => { const t = toWorld(q.x, q.y); return { x: t.x, y: t.y, z: ground + q.z }; };
  const c = easeCamera(g, wp(cv.pos), wp(cv.at), shot === 'speler' ? 0.1 : shot === 'breed' ? 0.06 : 0.14);
  w.cameraOverride = { position: c.position, lookAt: c.lookAt, fov: cv.fov, cut: true };
}

// --- de HUD: het bord bovenin en de strook onderin -------------------------------------------------------------------------------

// De kop van het bord: de vaste kop van het thema zegt "Voetbal Euroborg · Vijf tegen vijf", ook bij elf tegen elf op een sportpark (beeld 24-11). Nu de plek en het formaat van deze wedstrijd.
function zetBordKop(g) {
  try {
    const m = g.career && g.career.match, plek = g.career && g.career.site ? (m && m.parkPlaats ? `Voetbal · ${m.parkPlaats}` : 'Voetbal · sportpark') : 'Voetbal Euroborg';
    const kop = board.root.querySelector('small > span'), sfeer = board.root.querySelectorAll('.mg-sfeer, .mg-watermark'), formaat = FORMATEN[g.sim.formaat] ? FORMATEN[g.sim.formaat].naam : '';
    if (kop) kop.textContent = plek;
    for (const el of sfeer) el.textContent = formaat;
  } catch (e) { /* de kop is versiering */ }
}

function ensureBoard() {
  if (!board) board = createBoard('voetbal');
  return board;
}

function updateHud(w) {
  const g = game;
  if (!g) return;
  const sim = g.sim, id = eigenId(g), p = id >= 0 ? sim.spelers[id] : null, human = ownHuman(g);
  const owner = sim.bal.owner;
  const laad = g.online === 'gast' ? Math.max(g.laadG.schot, g.laadG.lang) / LAAD_S : human && !human.weg ? Math.max(human.laad.schot, human.laad.lang) / LAAD_S : 0;
  const chargeKind = g.online === 'gast' ? (g.laadG.lang > g.laadG.schot ? 'lang' : 'schot') : human && human.laad.lang > human.laad.schot ? 'lang' : 'schot';
  const model = {
    fase: sim.fase, helft: sim.helft, klok: sim.klok, score: sim.score, mijnTeam: mijnTeam(g), namen: [sim.teams[0].kort, sim.teams[1].kort],
    bezitTeam: owner >= 0 ? sim.spelers[owner].team : -1, heeftBal: owner >= 0 && owner === id, rol: p && p.rol === 'keeper' ? 'keeper' : 'veld',
    laad: Math.min(1, laad), laadSoort: chargeKind, stamina: p ? (g.online === 'gast' ? (p.moe ? 0.05 : 1) : p.stamina) : 1, moe: !!(p && p.moe),
    eigen: g.online === 'gast' ? null : human ? human.doelpunten : 0, bezit: g.online === 'gast' ? null : sim.stat.bezit,
    hervat: sim.hervat ? sim.hervat.kind : null, tekst: g.online === 'gast' ? sim.flashTekst : sim.flash ? sim.flash.tekst : '', uitleg: !uitlegGezien(UITLEG_ID),
  };
  if (model.laad > 0.02) zetUitlegGezien(UITLEG_ID);
  const boardModel = voetbalBoard({ ...model, help: toetsGroepenHtml(keyTextHtml) });
  boardModel.row = scoreboardRow(sim);
  ensureBoard().set(boardModel);
  simHudTik(0, voetbalHudModel({ ...model, formaatNaam: FORMATEN[sim.formaat].naam }));
}

// --- einde ----------------------------------------------------------------------------------------------------------------------

function end(w, { quit = false, extern = false, uitslag = null } = {}) {
  const g = game;
  if (!g) return;
  game = null;
  kitOff(); // de eigen kleren terug, ook bij stoppen of een afgebroken wedstrijd (voetbalkleding 22-11)
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
  tvStop(g);
  for (const a of g.actors) { getScene().remove(a.mesh); disposeObject(a.mesh); } // review 22-11 P1: skelet, persoonsteller en racket terug
  for (const mk of [g.marks.eigen, g.marks.pijl, ...g.marks.ander]) { getScene().remove(mk); mk.geometry.dispose(); }
  if (built) { built.bal.visible = false; built.schaduw.visible = false; }
  p.x = g.exitX; p.y = g.exitY; p.angle = -Math.PI / 2;
  ruimParkOp(); zetReclame(built, []); site = { x: CX, y: CY, a: 0 };
  karakterEind(w, g.bon);
  let res = null;
  if (g.online === 'host' && !extern) res = wedHostLiveEind(w, g.sim, { gestopt: quit });
  if (g.career) { afrondenCarriere(w, g, quit); return; }
  if (quit) { w.addMessage('Voetbal gestopt', 2.5); return; }
  if (g.online === 'gast') { if (uitslag && !uitslag.gestopt) beloonLokaal(w, g, uitslag.rijen.find((r) => r.slot === g.sim.mijnSlot) || null); return; }
  if (g.online === 'host') { if (!res) return; beloonLokaal(w, g, res.rijen.find((r) => r.slot === 0) || null, res.jij); return; }
  beloonLokaal(w, g, uitslagVoetbal(g.sim)[0] || null);
}

// --- de carrièrewedstrijd (#1110, #1117): de sim met de clubs en ratings van de carrière, op het sportpark van de thuisploeg (of de Euroborg); het resultaat gaat naar het profiel -------------------

// Start de wedstrijd van de volgende ronde van de carrière. Geeft true als hij begon.
export function launchCareerMatch(w) {
  if (game || !CL.hasCareer()) return false;
  const c = CL.getCareer(), v = leesOpslag();
  const setup = matchSetup(c, CL.getClub, formationList('groot', cleanFormation('groot', v.vorming)));
  if (!setup) return false;
  const m = setup.match;
  const venue = m.park ? m.park : null;
  let site = null;
  if (venue) { const pp = pitchPlacement(venue); site = { x: pp.x, y: pp.y, a: pp.angle - Math.PI / 2 }; }
  return launch(w, { force: true, career: { teams: setup.teams, ratings: setup.ratings, bonus: setup.bonus, char: c.char, naam: c.me.name, site: site, match: m, cctx: commentaryContext(c, CL.getClub, m) } });
}
registerLauncher((w) => launchCareerMatch(w));

// Coachen (#1111): de Trainer kijkt en stuurt de tactiek bij (toets 1 stijl, toets 2 vorming) terwijl alleen computerspelers voetballen; geen mensen in de sim (`alleenAi`).
export function launchCoachMatch(w) {
  if (game || !CL.hasCareer()) return false;
  const c = CL.getCareer();
  const setup = coachSetup(c, CL.getClub);
  if (!setup) return false;
  const sim = makeCoachMatch(setup, { duur: 'normaal', stand: footballLevel(), seed: ((Date.now() / 1000) | 0) + runs * 7919, regels: leesTv().regels, timings: TV_TIMINGS });
  if (!sim) return false;
  const m = setup.match, venue = m.park ? m.park : null;
  let site = null;
  if (venue) { const pp = pitchPlacement(venue); site = { x: pp.x, y: pp.y, a: pp.angle - Math.PI / 2 }; }
  return launch(w, { force: true, sim, career: { coach: true, teams: setup.teams, char: c.char, naam: c.me.name, site, match: m, cctx: commentaryContext(c, CL.getClub, m) } });
}
registerCoachLauncher((w) => launchCoachMatch(w));

// De kaartlaag Voetbal (#1115, #1117): met een carrière staan op de kaart de club van de speler (en zijn trainingsveld) en het park van de volgende tegenstander (de uitwedstrijd als doel);
// de overige 281 parken zijn geen markers (te druk), die staan in de index voor de wedstrijden. Zonder carrière alleen de Euroborg. Het resultaat staat in een kleine cache per carrièrestand.
// Trainende teams (#1115): met een carrière en een speler binnen 150 m van een veld van zijn club lopen er een paar figuren rondjes; elke halve seconde bijgewerkt, nooit tijdens een wedstrijd.
let trainers = null, trainT = 0;
// Een trap van een trainende ploeg: zacht en alleen binnen 60 m van de speler (SFX via sfxEvent, zelfde sleutel en bijschrift als de wedstrijd; lokaal decor, geen netwerk).
const TRAIN_HOORBAAR = 60;
function trainerKick(w, x, y) { const p = hoofdspeler(w); if (p && Math.hypot(p.x - x, p.y - y) <= TRAIN_HOORBAAR) sfxEvent(w, 'football_kick', x, y, { gain: 0.35 }); }
function updateTrainers(w) {
  try {
    if (game || !CL.hasCareer() || reducedMotion()) { if (trainers) { trainers.dispose(); trainers = null; } return; }
    const p = hoofdspeler(w);
    const squads = trainingSquads(CL.getIndex(), { x: p.x, y: p.y }, 1);
    if (!squads.length && !trainers) return;
    if (!trainers) trainers = makeTrainers(getScene(), { bake: bakeFigure, material: figureMaterial() });
    trainers.sync(squads, (x, y) => { try { const r = w.map.surfaceAt(x, y, { z: 0, ribbon: null }); return r && Number.isFinite(r.z) ? r.z : 0; } catch (e) { return 0; } });
    if (!squads.length) { trainers.dispose(); trainers = null; }
  } catch (e) { if (trainers) { try { trainers.dispose(); } catch (e2) { /* weg */ } trainers = null; } }
}
let mapCache = { sleutel: '', spots: [] };
function mapLayerSpots() {
  try {
    if (!CL.hasCareer()) return [];
    const c = CL.getCareer(), nm = nextMatchOf(c);
    const sleutel = `${c.club}|${c.evDone}|${c.seasonNr}|${nm ? nm.opponent : ''}`;
    if (mapCache.sleutel === sleutel) return mapCache.spots;
    const spots = mapSpots(CL.getIndex(), { homeId: c.club, nextId: nm && !nm.isHome ? nm.opponent : null });
    mapCache = { sleutel, spots };
    return spots;
  } catch (e) { return []; }
}
const nextMatchOf = (c) => { try { return nextMatch(c, CL.getClub); } catch (e) { return null; } };

function afrondenCarriere(w, g, quit) {
  if (quit) { w.addMessage('Wedstrijd gestopt: de ronde blijft staan', 3); return; }
  const sim = g.sim, mm = ownHuman(g);
  const gf = sim.score[0], ga = sim.score[1];
  const coach = !!(g.career && g.career.coach);   // de Trainer speelde niet mee
  const stats = { goals: mm ? mm.doelpunten | 0 : 0, assists: mm ? mm.assist | 0 : 0, shots: mm ? mm.schoten | 0 : 0, minutes: Math.round((sim.duurHelft * 2) / 60 * 10) / 10 || 8 };
  recordStat(w, 'footballMatches');
  const r = CL.finishMatch(w, coach ? coachResult(sim) : { gf, ga, stats });
  const s = r.summary;
  if (!s) return;
  const rows = carriereBannerRijen(s, { gf, ga, doelpunten: stats.goals, coach });
  showBanner({ kind: s.outcome === 'winst' ? 'pass' : 'fail', title: s.outcome === 'winst' ? 'GEWONNEN' : s.outcome === 'gelijk' ? 'GELIJKSPEL' : 'VERLOREN', reason: `${sim.teams[0].naam} ${gf}-${ga} ${sim.teams[1].naam}`, reward: 0, stats: rows });
}

// De beloning van één speler uit zijn eigen uitslagsregel: record, medaille, prestaties, het banner. Het geld van een gast betaalt de host (betaalGast); hier alleen wat bij de eigen speler hoort.
function beloonLokaal(w, g, rij, jij = null) {
  if (!rij || rij.weg) return;
  const r = medailleUitRij(rij);
  const rec = recordChallengeResult(w, difficultyRecordKey(g.mode || 'standaard', 'voetbal'), { value: recordValue(r), medal: r.medaille });
  recordStat(w, 'footballMatches');
  if (rij.plek === 1) unlockAchievement(w, 'voetbal_winst');
  if (r.eigen >= 3) unlockAchievement(w, 'voetbal_hattrick');
  if (g.online === 'gast' && CL.hasCareer()) { // de host betaalt de gast al; zijn eigen carrière krijgt het verschil en de ervaring (60%), nooit competitiepunten (#1157)
    const x = guestCareerExtra(rij, eigenKlasse() || 'talent', voetbalBeloning({ plek: rij.plek, nul: /-0\b/.test(rij.tekst || '') }).geld);
    if (x.geld > 0 || x.xp > 0) loopbaanVerdien(w, 'buiten', x.geld, { xp: x.xp, n: 0, deel: false });
  }
  if (jij && jij.geld > 0) { loopbaanVerdien(w, 'buiten', jij.geld, { xp: jij.xp, n: 0, uniek: 'voetbal-samen', deel: false }); w.addMessage(`Beloning: €${jij.geld.toLocaleString('nl-NL')}`, 4); }
  else if (!g.online) { const b = voetbalBeloning({ plek: rij.plek, nul: /-0\b/.test(rij.tekst || '') }); if (b.geld > 0) { loopbaanVerdien(w, 'buiten', b.geld, { xp: b.xp, n: 0, deel: false }); w.addMessage(`Beloning: €${b.geld.toLocaleString('nl-NL')}`, 4); } }
  const stats = [['Stand', `${r.gf}-${r.ga}`], ['Jouw doelpunten', String(r.eigen)]];
  if (r.medaille) stats.push(['Medaille', MEDALS[r.medaille]]);
  if (r.medaille < 3) stats.push(['Volgende', MEDAILLE_TEKSTEN[r.medaille]]);
  if (rec && rec.newBest && recordValue(r) > 0) stats.push(['Record', 'Nieuw!']);
  if (g.comp && !g.online) {
    const fresh = applyRound(g.comp, r.gf, r.ga), vv = leesOpslag();
    vv.comp = fresh; schrijfOpslag(vv);
    stats.push(['Competitie', fresh.klaar ? `seizoen voorbij: plek ${yourRank(fresh)} van 6` : `plek ${yourRank(fresh)} van 6 na ronde ${fresh.ronde} van 5`]);
    if (isKampioen(fresh)) { unlockAchievement(w, 'voetbal_kampioen'); loopbaanVerdien(w, 'buiten', KAMPIOEN_BONUS, { xp: 60, n: 0, deel: false }); w.addMessage(`Kampioen van de Euroborgcompetitie! Beloning: €${KAMPIOEN_BONUS}`, 5); stats.push(['Kampioen', 'De Stadjers']); }
    else if (fresh.klaar) w.addMessage(`Seizoen voorbij: kampioen is ${clubName(fresh.kampioen)}`, 5);
  }
  showBanner({ kind: rij.plek === 1 ? 'pass' : 'fail', title: rij.plek === 1 ? (r.eigen >= 3 ? 'HATTRICK IN DE EUROBORG' : 'GEWONNEN') : rij.plek === 3 ? 'GELIJKSPEL' : 'VERLOREN', reason: `${g.sim.teams[mijnTeam(g)].naam} ${r.gf}-${r.ga} ${g.sim.teams[1 - mijnTeam(g)].naam}`, reward: 0, stats });
}

// De bonus van een mens in de Samen-wedstrijd: de host speelt met zijn eigen personage; een gast geeft bij Meedoen zijn ratings mee (d.r, een compact blok), die de host klemt op het niveau van de klasse (#1114).
function gastBonus(d, level) {
  const eigen = voetbalBonusVan();
  const perStand = level === 'uitdagend' ? 'kroon' : level === 'ontspannen' ? 'talent' : 'terp';
  const eigenK = eigenKlasse(); // de host klemt ook op de klasse van zijn eigen carrière: een gast wordt nooit sterker dan wat de host zelf kan halen (#1157)
  const klem = eigenK && LEVEL_CAP[eigenK] < LEVEL_CAP[perStand] ? eigenK : perStand;
  const r = d.slot > 0 && d.r ? decodeRatings(d.r, klem)[0] : null;
  return r ? { ...eigen, ...r.f } : eigen;
}
// De klasse van deze speler in zijn eigen carrière; null zonder carrière (dan geldt alleen het niveau van de wereld).
const eigenKlasse = () => { try { return CL.hasCareer() ? divisionOfMyClub(CL.getCareer()) || null : null; } catch (e) { return null; } };
// Wat een gast bij Meedoen meestuurt: de factoren van zijn eigen carrière (leeg zonder carrière: dan telt alleen zijn personage).
export function guestRatingsText() {
  try { if (!CL.hasCareer()) return ''; return encodeRatings([{ slot: 0, f: simFactors(CL.getCareer().me) }]); } catch (e) { return ''; }
}

// --- tegen elkaar (Samen spelen): twee tot vier spelers in één team tegen de computer, of als derby in twee teams ------------------------------------------

registreerWedstrijd('voetbal', {
  naam: 'Voetbal Euroborg', soort: 'live', live: liveVoetbal, minSpelers: 2,
  maak: (deeln) => {
    uitnodiging = freshOptions({ ...leesOpslag(), modus: 'vriendschappelijk' }); // een competitie speel je alleen; samen is het een vriendschappelijke wedstrijd met de gekozen tactiek
    const dr = deriveTeams(deeln.map((d) => d.slot), leesOpslag().derby);   // derby (#1114): vrienden in twee teams; de indeling reist mee in de start-v
    uitnodiging.team1 = dr.team1;
    return makeMatch(deeln.map((d) => ({ slot: d.slot, naam: d.naam, char: d.char, team: teamOfSlot(dr.team1, d.slot), bonus: gastBonus(d, uitnodiging.stand) })), { duur: uitnodiging.duur, stand: uitnodiging.stand, seed: uitnodiging.seed, tegenstander: uitnodiging.tg, formaat: uitnodiging.formaat, vorming: uitnodiging.vorming, stijl: uitnodiging.stijl, regels: leesTv().regels, timings: TV_TIMINGS });
  },
  start: (w, sim) => launch(w, { online: 'host', force: true, sim }),
  plek: () => ({ ...GATE }),
  extra: () => (uitnodiging ? { v: encodeKickoff(uitnodiging) } : null),
  eind: () => {},
  solo: (w) => launch(w),
  gastPlek: (w, x, y) => !game && !hoofdspeler(w).inVehicle && Math.hypot(x - GATE.x, y - GATE.y) < 4.5, // een gast vraagt het bij de spelerspoort
});
// De start naar de gasten in één korte tekst (hoogstens 40 tekens): duur.stand.tegenstander.formaat.vorming.stijl, bijvoorbeeld n.s.2.g.4-3-3.a
export const encodeKickoff = (o) => `${o.duur === 'kort' ? 'k' : 'n'}.${cleanDifficulty(o.stand)[0]}.${o.tg | 0}.${o.formaat === 'groot' ? 'g' : 'k'}.${o.vorming}.${cleanStijl(o.stijl)[0]}${o.team1 && o.team1.length ? '.' + encodeTeams(o.team1) : ''}`;
export function decodeKickoff(v) {
  const d = String(v || '').split('.');
  const formaat = d[3] === 'g' ? 'groot' : 'klein';
  return {
    duur: d[0] === 'k' ? 'kort' : 'normaal', stand: ({ o: 'ontspannen', s: 'standaard', u: 'uitdagend' })[d[1]] || 'standaard', tegenstander: Math.max(0, Math.min(OPPONENTS.length - 1, parseInt(d[2], 10) || 0)),
    formaat, vorming: cleanFormation(formaat, d[4]), stijl: ({ v: 'verdedigend', e: 'evenwichtig', a: 'aanvallend' })[d[5]] || 'evenwichtig', team1: decodeTeams(d[6]),
  };
}
zetWedGastHaken('voetbal', {
  dichtbij: (w) => !game && !hoofdspeler(w).inVehicle && Math.hypot(hoofdspeler(w).x - GATE.x, hoofdspeler(w).y - GATE.y) < 3.4,
  spiegel: (st, mijn) => makeFootballMirror(st, mijn, decodeKickoff(st.v)),
  ratings: () => guestRatingsText(),
  voerIn: voerInVoetbal,
  start: (w, st, sp) => { if (!sp) return false; return launch(w, { online: 'gast', force: true, sim: sp }); },
  eind: (w, uit) => { if (game && game.online === 'gast') end(w, uit.gestopt ? { quit: true, extern: true } : { uitslag: uit, extern: true }); if (uit.gestopt && w.addMessage) w.addMessage('De wedstrijd is gestopt.', 3); },
  tik: (w, dt) => gastTik(w, dt),
});

// --- de activiteit --------------------------------------------------------------------------------------------------------------

export const VOETBAL = {
  id: 'voetbal',
  layer: 'voetbal',
  legend: { kind: 'act-voetbal', label: 'Voetbal Euroborg', note: 'vijf tegen vijf tegen de computer, alleen of samen' },
  init(w) {
    window.__voetbal = {
      spot: () => ({ ...GATE }),
      veld: () => ({ x: CX, y: CY, B: PITCH.B, L: PITCH.L }),
      start: (force = true, o = null) => { if (o) { const vv = leesOpslag(); Object.assign(vv, o); schrijfOpslag(vv); } return launch(w, { force }); },
      menu: () => { openPanel(w); return true; },
      voorkeur: () => leesOpslag(),
      state: () => (game ? { fase: game.sim.fase, helft: game.sim.helft, klok: game.sim.klok, score: game.sim.score.slice(), bal: { x: game.sim.bal.x, y: game.sim.bal.y }, online: game.online } : null),
      zetDuur: (duur) => zetDuurVoorkeur(duur),
      finish: () => { if (!game || game.online) return false; game.sim.klok = 0.05; return true; },
      quit: () => { if (!game) return false; end(w, { quit: true }); return true; },
    };
  },
  spots: (voorCheck = false) => [{ id: 'voetbal', name: 'Voetbal Euroborg', x: GATE.x, y: GATE.y }, ...(voorCheck ? [] : mapLayerSpots())],
  prompt,
  secondary,
  interact,
  active: () => !!game || !!panel,
  quit: (w) => { closePanel(); end(w, { quit: true }); },
  update(dt, w) {
    if (!game && panel) { panelTick(w); return; }
    if (!game) return;
    if (w.pendingRespawn) { end(w, { quit: true }); return; }
    if (game.online === 'gast') return; // de gast loopt via zijn wedstrijdhaak (gastTik)
    updateGame(w, dt);
  },
  tick(dt, w) {
    if ((lodT -= dt) <= 0) { lodT = 0.5; updateLod(w); updateTrainers(w); updateGateKit(w); }
    if (trainers) { trainT += dt; trainers.tik(trainT, (sq, x, y) => trainerKick(w, x, y)); }
  },
  camera,
  icon: drawIcon,
  mapSub: (s) => (s && s.sub) || recText() || 'Voetbal: vijf of elf tegen elf in de Euroborg, ook als competitie',
  ubbo(w) {
    const d = Math.hypot(GATE.x - hoofdspeler(w).x, GATE.y - hoofdspeler(w).y);
    const rec = getChallengeRecord(recSleutel());
    return { name: 'Voetbal Euroborg', sub: rec && rec.medal ? `record: ${MEDALS[rec.medal].toLowerCase()}` : 'vijf tegen vijf, gratis', dist: d, x: GATE.x, y: GATE.y, play: 'voetbal', where: 'de spelerspoort van de Euroborg', hint: 'loop naar de poort en druk E' };
  },
  runs: () => runs,
};
