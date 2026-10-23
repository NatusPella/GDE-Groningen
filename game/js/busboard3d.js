// Lijnnummer en volgende bestemming op de bus (#160), de wereldkant: een
// LED-bestemmingsbord op de voorkant en zijkanten van elke bus met een lijn en
// de tekstkaart "volgende halte" voor de bus die de speler bestuurt. De tekst en
// regels staan in busboard.js (met tests); dit bestand is de lijm met de scene
// en het HUD en is in Electron door Claude in beeld bekeken (niet door een mens). Meldt zich in main.js als kind.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { getBusLines } from './vehicle.js';
import { startBusShift } from './sidejobs.js';
import { nearestLine, project } from './busroutes.js';
import { boardText, busLineOf, takeOverOffer, lineDirection, nextStopInfo, stopAnnouncement, roundDist, OPERATOR } from './busboard.js';

const BOARD_R = 140;            // m: alleen bussen in de buurt krijgen een bord
// m voor het buitenste vlak van de romp. De zijborden hingen op 0,02 m, precies gelijk met het deurblad
// (hw + 0,02 = 1,295 m): dat was het flikkerende bord (#382). De buitenste deurlijst ligt op 1,301 m.
const SIDE_OFF = 0.04;
const FRONT_OFF = 0.07;         // voor de ruit (0,041 m) en de lampenstrook (0,051 m) van de voorkant
const textures = new Map();

function boardTexture(b) {
  let t = textures.get(b.key);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 20;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0b0c';
  g.fillRect(0, 0, 128, 20);
  g.fillStyle = b.color;
  g.fillRect(1, 1, 28, 18);
  g.fillStyle = '#0b0b0c';
  g.font = 'bold 14px monospace';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(b.ref, 15, 11);
  g.fillStyle = '#ffb21a';
  g.textAlign = 'left';
  g.fillText(b.dest, 33, 11, 92);
  t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  textures.set(b.key, t);
  return t;
}

function addBoard(group, tex, x, y, z, w, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 20 / 128), new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  group.add(m);
  return m;
}

function ensureBoard(v) {
  const run = busLineOf(v);
  if (!run) return;
  const mesh = getVehicleMesh(v.id);
  if (!mesh) return;
  const b = boardText(run.line, run.dir);
  if (mesh.userData.busBoardKey === b.key) return;
  const tex = boardTexture(b);
  if (!mesh.userData.busBoards) attachBusBoards(mesh, v.model, tex);
  else for (const m of mesh.userData.busBoards) m.material.map = tex;
  mesh.userData.busBoardKey = b.key;
}

// De drie borden aan een busmesh; ook door scripts/zfight_audit.mjs --vehicles gebruikt.
export function attachBusBoards(mesh, model, tex) {
  const hl = model.len / 2, hw = model.wid / 2;
  // voor: op de plek van het gele bestemmingsvlak van het model (2,8 m); zijkanten: in het raam achter de voordeur
  // (de deur zit op hl - 1,05 en zou het bord half bedekken), niet over de deur heen
  mesh.userData.busBoards = [
    addBoard(mesh, tex, hl + FRONT_OFF, 2.8, 0, Math.min(1.9, model.wid * 0.75), Math.PI / 2),
    addBoard(mesh, tex, hl - 2.75, 2.4, hw + SIDE_OFF, 1.5, 0),
    addBoard(mesh, tex, hl - 2.75, 2.4, -hw - SIDE_OFF, 1.5, Math.PI),
  ];
  return mesh.userData.busBoards;
}

let card = null;
let last = { idx: -1, near: false, line: null };

function getCard() {
  if (card || typeof document === 'undefined') return card;
  const root = document.getElementById('hud');
  if (!root) return null;
  const st = document.createElement('style');
  st.textContent = `#hud .hud-busnext{position:absolute;left:50%;bottom:calc(var(--hud-edge,46px) + 4px);transform:translateX(-50%);display:none;padding:6px 14px 8px;color:#f0ede4;text-shadow:var(--hud-shadow);background:linear-gradient(90deg,rgba(12,20,14,.1),rgba(12,20,14,.8) 20%,rgba(12,20,14,.8) 80%,rgba(12,20,14,.1));text-align:center}
body.bus-driving #hud .hud-busnext{display:block}
#hud .hud-busnext small{display:block;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#ffb21a}
#hud .hud-busnext b{font-weight:normal;font-size:22px;letter-spacing:1px}
#hud .hud-busnext span{font-size:14px;color:rgba(240,237,228,.7);margin-left:8px}
#hud .hud-busnext em{display:none;font-style:normal;font-size:13px;margin-top:4px;color:rgba(240,237,228,.85)}
#hud .hud-busnext.offer em{display:block}
#hud .hud-busnext kbd{font:inherit;font-weight:bold;padding:0 6px;margin-right:6px;border-radius:3px;background:#f0ede4;color:#14201a;text-shadow:none}`;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.className = 'hud-busnext';
  el.innerHTML = '<small></small><div><b></b><span></span></div><em><kbd>G</kbd>Dienst overnemen</em>';
  root.appendChild(el);
  card = { el, small: el.querySelector('small'), b: el.querySelector('b'), span: el.querySelector('span') };
  return card;
}

// Geeft { line, dir } als de speler de dienst van deze bus kan overnemen (de G-toets), anders null.
function driverCard(w, pv) {
  const lines = getBusLines();
  const on = !!(pv && pv.isBus && lines.length);
  if (typeof document !== 'undefined') document.body.classList.toggle('bus-driving', on);
  if (!on) { last = { idx: -1, near: false, line: null }; return null; }
  const own = pv.boardLine && !pv.busRun && !pv.rideLine ? null : busLineOf(pv); // een bord-lijn van losse bus is geen dienst om over te nemen
  const line = own ? own.line : nearestLine(lines, pv.x, pv.y, 40);
  const dir = line ? (own ? own.dir : lineDirection(line, pv.x, pv.y, pv.angle)) : 0;
  const c = getCard();
  if (!line || !dir) { if (typeof document !== 'undefined') document.body.classList.remove('bus-driving'); return null; }
  const offer = takeOverOffer({ isBus: true, jobVehicle: !!pv.sideJob, shiftActive: !!(w.sideJob && w.sideJob.active), line, dir });
  const info = nextStopInfo(line, dir, project(line, pv.x, pv.y).s);
  const b = boardText(line, dir);
  if (c) {
    c.small.textContent = `${OPERATOR} · lijn ${b.ref} naar ${b.dest}`;
    c.small.style.color = b.color;
    c.b.textContent = info ? info.name : '';
    c.span.textContent = info ? roundDist(info.dist) : '';
    c.el.classList.toggle('offer', offer);
  }
  if (info) {
    const near = info.dist < 150;
    if (last.line !== line || last.idx !== info.index || last.near !== near) {
      // de eerste keer na het instappen of een halte verder: één tekstmelding
      if (last.line !== line || last.idx !== info.index || near) w.addMessage(stopAnnouncement(info), 3, { kind: 'tip', key: 'bus-next' });
      last = { idx: info.index, near, line };
    }
  }
  return offer ? { line, dir } : null;
}

// Een bus buiten een dienst (verdwaald, geparkeerd, verhaalbus) rijdt toch onder een lijn: de dichtstbijzijnde, in de
// rijrichting (#436). Eén keer per bus; zonder lijndata blijft het bord weg.
function giveBoardLine(v) {
  if (v.boardLineTried) return;
  v.boardLineTried = true;
  const lines = getBusLines();
  const line = lines.length ? nearestLine(lines, v.x, v.y, 4000) : null;
  if (!line) { v.boardLineTried = false; return; }
  const dir = lineDirection(line, v.x, v.y, v.angle, 4000) || 1;
  v.boardLine = { line, dir };
}

function updateBusBoards(dt, w) {
  const p = w.player;
  for (const v of w.vehicles) {
    if (!v.isBus || v.wrecked) continue;
    if (!busLineOf(v)) giveBoardLine(v);
    if (!busLineOf(v)) continue;
    if (Math.hypot(v.x - p.x, v.y - p.y) < BOARD_R) ensureBoard(v);
  }
  const offer = driverCard(w, p.inVehicle);
  // G: de dienst overnemen. Zonder die keuze rijd je gewoon rond (#396).
  if (offer && w.input && w.input.wasPressed('g')) {
    w.input.consume('g');
    startBusShift(w, p.inVehicle, offer.line, offer.dir);
  }
}

export const busBoardKind = { id: 'busboards', tickPhase: 'world', tick: updateBusBoards };
