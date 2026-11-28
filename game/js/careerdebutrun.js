// De begincutscenes van de voetbalcarrière en van Bezit, het afspelen (22-11, docs/CARRIERESCENES-22-11.md). De regels, de regie en de vraag wanneer een
// scène aan de beurt is staan in careerdebut.js (puur, getest door scripts/careerdebut_test.mjs); dit is de dunne laag met de wereld.
//
// Wanneer: pas als de speler net begonnen is (een carrière zonder wedstrijd, of het eerste gekochte perceel) en het rustig is: geen laadscherm, geen
// menu, geen film, geen missie, geen melding in beeld en niets wat de meldingenpoort (notifyqueue.js) vasthoudt. Eenmaal per speler: de vlag
// `carriere:voetbal-start` of `carriere:bezit-start` staat in de verhaalvlaggen (per speler, #429) en gaat erin zodra de scène begint, dus overslaan telt als gezien.
// De scène is overslaanbaar (de filmlaag), pauzeert het spel en verplaatst de speler niet: hij speelt op het veld van de club of aan de weg van het perceel.
//
// Samen spelen: wie de carrière start of het perceel koopt ziet de scène. Een geregisseerde scène (playScript) gaat als data naar de gasten van een
// gastheer, die hem lokaal nakijken (coopcut.js); een gast die zelf een carrière start of een perceel koopt, speelt hem alleen voor zichzelf.
// Niets in de scène is voortgang: geen geld, geen vlag voor een ander.
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { mayStart } from './narrative.js';
import { storyDataReady } from './storytext.js';
import { hoofdspeler } from './players.js';
import { isMissionActive } from './missions.js';
import { isRecapOpen } from './recapstate.js';
import { AUTOPLAY, STORY_TEST } from './devflags.js';
import { noticeHeldBy, noticeQueue } from './notifyqueue.js';
import { playSpecScene } from './missionstory.js';
import { ANITA_APPEARANCE } from './models3d_people.js';
import { ownWorn } from './clothing.js';
import * as CL from './voetbalcarrierelive.js';
import { getBezit } from './bezitlive.js';
import {
  FOOTBALL_FLAG, FARM_FLAG, FOOTBALL_ID, FARM_ID, SCENES, FOOTBALL_LINES, FARM_LINES, footballSpec, farmSpec, clubLook, teamLooks,
  footballDue, farmDue, debutBlockers, debutDecide,
} from './careerdebut.js';
import { INVAL_FLAG, INVAL_ID, INVAL_LINES, INVAL_TITLE, INVAL_KICKER, invalSpec, invallerDue } from './careerdebut_voetbal.js';
import { STORY_PLACE_ID } from './footballstory.js';

const CHECK_EVERY_S = 1;       // zo vaak kijken we of er een scène aan de beurt is (goedkoop, en Bezit laadt lui)
const MAX_TRIES = 3;           // een scène die drie keer niet wil beginnen (film bezet) laten we met rust

let calmS = 0;
let checkS = 0;
let deathAgoS = 1e9;
let playing = false;
let waitingId = null;
let tries = 0;
let forced = null;             // de testbank: een scène die zonder wachten speelt


function snapshot(w, view, menuOpen) {
  const p = hoofdspeler(w);
  return {
    started: document.body.classList.contains('game-started'),
    loading: !!document.getElementById('load-screen'),
    held: noticeHeldBy(),
    noticeShown: noticeQueue.shown(),
    openingDue: view.currentId === 'M00',
    missionActive: isMissionActive(),
    cinematicActive: isCinematicActive(),
    sinceCinematicS: sinceCinematic(),
    pigeon: !!w.pigeonMode,
    activity: !!w.activityGame,
    respawn: !!w.pendingRespawn,
    wanted: w.wanted || 0,
    sinceDeathS: deathAgoS,
    menuOpen: !!(w.uiPaused || w.devPanelOpen || w.paused || (menuOpen && menuOpen())),
    recapOpen: isRecapOpen(),
    dataReady: storyDataReady(),
    inVehicle: !!(p && p.inVehicle),
  };
}

// Welke scène is nu aan de beurt: { id, ... } of null.
function dueScene(view) {
  if (forced) { const id = forced; forced = null; return { id, forced: true }; }
  try {
    const c = CL.getCareer();
    const village = CL.getIndex().byPlace.get(STORY_PLACE_ID);
    if (invallerDue(c, view.flags, village && village.id)) return { id: INVAL_ID, career: c };       // de aanleiding gaat voor de eerste training (careerdebut_voetbal.js)
    if (footballDue(c, view.flags)) return { id: FOOTBALL_ID, career: c };
  } catch (e) { /* geen carrière */ }
  try {
    const p = farmDue(getBezit(), view.flags);
    if (p) return { id: FARM_ID, parcel: p };
  } catch (e) { /* geen bezit */ }
  return null;
}

function eigenWorn() { try { return ownWorn('anita'); } catch (e) { return null; } }

// Het veld van de club en het clubtenue van Tessa en haar ploeggenoten (amateur, de Talentenklasse).
function playFootball(w, due, view) {
  const c = due.career || null;
  const club = (c && CL.getClub(c.club)) || CL.getIndex().clubs[0] || null;
  const park = club && (club.park || club);
  if (!park || !Number.isFinite(park.x) || !Number.isFinite(park.y)) return false;
  const own = eigenWorn();
  const nr = c ? (((c.char === 'anita' ? c.me : c.mate) || {}).num | 0) || 10 : 10;
  const tessaLook = clubLook(club, { base: ANITA_APPEARANCE, number: nr, human: own ? { hair: own.hair, body: own.body } : null });
  const r = Number.isFinite(park.r) ? park.r : 0;
  return playSpecScene(w, {
    spec: footballSpec({ tessaLook }), lines: FOOTBALL_LINES, looks: teamLooks(club),
    at: { x: park.x, y: park.y }, lookTo: { x: park.x + Math.cos(r) * 20, y: park.y + Math.sin(r) * 20 },
    kicker: SCENES[FOOTBALL_ID].kicker, title: SCENES[FOOTBALL_ID].titel,
    onStart: () => { view.flags.add(FOOTBALL_FLAG); playing = true; },
    onEnd: () => { playing = false; },
  });
}

// De invalbeurt: het park van De Hoekers; Tessa draagt haar eigen kleren, de ploeggenoten het clubtenue.
function playInval(w, due, view) {
  const c = due.career || null;
  const club = (c && CL.getClub(c.club)) || CL.getIndex().clubs[0] || null;
  const park = club && (club.park || club);
  if (!park || !Number.isFinite(park.x) || !Number.isFinite(park.y)) return false;
  const r = Number.isFinite(park.r) ? park.r : 0;
  return playSpecScene(w, {
    spec: invalSpec(), lines: INVAL_LINES, looks: teamLooks(club),
    at: { x: park.x, y: park.y }, lookTo: { x: park.x + Math.cos(r) * 20, y: park.y + Math.sin(r) * 20 },
    kicker: INVAL_KICKER, title: INVAL_TITLE,
    onStart: () => { view.flags.add(INVAL_FLAG); playing = true; },
    onEnd: () => { playing = false; },
  });
}

// Het eerste perceel: het toegangspunt aan de weg is het anker, het veld ligt vooruit.
function playFarm(w, due, view) {
  let p = due.parcel;
  if (!p && due.forced) { const h = hoofdspeler(w); p = { ax: h.x, ay: h.y, cx: h.x + 30, cy: h.y }; }
  if (!p || ![p.ax, p.ay, p.cx, p.cy].every(Number.isFinite)) return false;
  return playSpecScene(w, {
    spec: farmSpec(), lines: FARM_LINES,
    at: { x: p.ax, y: p.ay }, lookTo: { x: p.cx, y: p.cy },
    kicker: SCENES[FARM_ID].kicker, title: SCENES[FARM_ID].titel,
    onStart: () => { view.flags.add(FARM_FLAG); playing = true; },
    onEnd: () => { playing = false; },
  });
}

function launch(w, view, due) {
  let ok = false;
  try { ok = due.id === INVAL_ID ? playInval(w, due, view) : due.id === FOOTBALL_ID ? playFootball(w, due, view) : playFarm(w, due, view); } catch (e) { console.error('careerdebut', due.id, e); ok = false; }
  if (ok) { tries = 0; waitingId = null; return; }
  playing = false;
  // mislukt (film bezet, geen veld): een paar keer opnieuw; daarna beschouwen we hem als gezien, zodat niets blijft hangen
  if (++tries >= MAX_TRIES) { view.flags.add(due.id === INVAL_ID ? INVAL_FLAG : due.id === FOOTBALL_ID ? FOOTBALL_FLAG : FARM_FLAG); tries = 0; waitingId = null; }
  calmS = 0;
}

// `view`: story.js storyBridgeView() { done, flags, currentId }; `menuOpen`: main.js geeft mee of een menu, de kaart, de telefoon of een winkel open staat.
export function updateCareerDebuts(dt, w, view, menuOpen) {
  if (!w || !view || typeof document === 'undefined' || playing) return;
  if (w.health <= 0 || w.pendingRespawn) deathAgoS = 0; else deathAgoS += dt;
  if (!document.body.classList.contains('game-started')) return;
  if ((AUTOPLAY || STORY_TEST) && !window.__carriereOn) return;
  if (!forced) {
    checkS += dt;
    if (checkS < CHECK_EVERY_S) return;
    checkS = 0;
  }
  const due = dueScene(view);
  if (!due) { waitingId = null; calmS = 0; return; }
  if (due.forced) { launch(w, view, due); return; }
  if (waitingId !== due.id) { waitingId = due.id; calmS = 0; }
  const blockers = debutBlockers(snapshot(w, view, menuOpen));
  calmS = blockers.length ? 0 : calmS + CHECK_EVERY_S;
  if (debutDecide({ blockers, calmS }) !== 'speel' || !mayStart('say')) return;
  launch(w, view, due);
}

// De testbank en de verhaaltest: speel een scène zonder te wachten (alleen via window.__careerdebut).
if (typeof window !== 'undefined') {
  window.__careerdebut = {
    due: (view) => { const d = dueScene(view); return d ? d.id : null; },
    play: (id) => { forced = id === 'bezit' ? FARM_ID : id === 'invalbeurt' ? INVAL_ID : FOOTBALL_ID; },
    state: () => ({ playing, waiting: waitingId, calmS, tries }),
    enable: () => { window.__carriereOn = true; },
  };
}
