// Het werk met je eigen machines in de wereld (#415, stap 2): je erf (huis, schuur, silo, dieselvat) met je trekkers, maaidorser en laadmachine op de
// machineplekken, de werktuigen ernaast, koppelen met E (in de trekker of ernaast), aftakas aan of uit met G, hef omhoog of omlaag met T, ontkoppelen
// met X, diesel bijtanken met R bij het dieselvat van je erf of bij een pomp, en het veldwerk op je percelen: de rijen veranderen zichtbaar per
// fase (kleur en strepen), per cel van vijf meter terwijl je werkt (werktuigen.js heeft de regels). De regels, het geld en de opslag zitten in
// machines.js, werktuigen.js en boerderijlive.js; dit bestand zet ze in de wereld. Eén erf of perceel wordt alleen gebouwd als je er dichtbij bent.
//
// De machines zijn gewone voertuigen (playerOwned, nooit diefstal): instappen met E zoals altijd. Een trekker zonder diesel of een versleten machine
// kruipt nog naar het erf. Samen spelen: een gast ziet en bestuurt dit niet (zijn eigen bedrijf staat in zijn eigen spel, #429).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Vehicle, MACHINE_MODELLEN } from './vehicle.js';
import { getScene } from './scene3d.js';
import { nearestFacility } from './facilities.js';
import { wgsToWorld } from './rdnew.js';
import { akkerRijen, rijPositie, RIJ_AFSTAND } from './bietenrules.js';
import { RIJEN, RIJ_LEN } from './werkgang.js';
import { DAY_LENGTH_S } from './daynight.js';
import { isInWater } from './util.js';
import * as B from './boerderij.js';
import * as PC from './percelen.js';
import * as M from './machines.js';
import * as WT from './werktuigen.js';
import * as W3 from './werktuigen3d.js';
import { getBoerderij, getBedrijf, neemTaak, rondAf, draaiMachine, tankMachine, zetVeldPositie, zetActief, leverLading } from './boerderijlive.js';
import { loopbaanDeel } from './loopbaanlive.js';

export const SPAWN_R = 230;            // zo dichtbij worden erf, machines en velden gebouwd
export const DESPAWN_R = 330;          // zo ver weg gaan ze weer weg
export const KOPPEL_R = 6.5;           // m van het koppelpunt van de trekker tot het werktuig
export const KOPPEL_VOET_R = 3.6;      // m van jou tot het werktuig als je te voet koppelt
export const VEL_R = 75;               // m van het midden van het perceel: daarbinnen werk je op dat veld
export const AFLEVER_R = 22;           // m van de afnemer
export const TOETS = { pto: 'G', hef: 'T', los: 'X', tank: 'R' };
const UREN_PER_S = 24 / DAY_LENGTH_S;  // een speluur is een minuut
const GROND = { braak: 0x9aa05a, geploegd: 0x5b3e22, cult: 0x7a5a36, gezaaid: 0x6d4c2c, mest: 0x4f3a24, spuit: 0x6a5f38 };
// De afnemers staan bij Hoogkerk, op een weg vlakbij (de plek wordt bij de eerste rit op de dichtstbijzijnde weg gelegd). Verzonnen bedrijven.
const AFNEMER_PLEK = { aardappelen: [53.2388, 6.5106], bieten: [53.2301, 6.4923], graan: [53.2419, 6.4808], gras: [53.2262, 6.5019] };

const nieuweStaat = () => ({
  erven: new Map(), erfMeshes: new Map(), voertuigen: new Map(), werktuigen: new Map(), rigs: new Map(), pose: new Map(), velden: new Map(),
  werk: null, huidig: null, t: 0, sync: -9, zoek: new Set(), meld: {}, prompt: null, afnemers: new Map(), draaiT: 0, last: 0,
});
let S = nieuweStaat();

export function resetBoerderijWereld() {
  for (const e of S.erfMeshes.values()) ruimGroep(e);
  for (const v of S.velden.values()) ruimVeld(v);
  for (const w of S.werktuigen.values()) W3.ruimWerktuig(w.group);
  S = nieuweStaat();
}

const sceneAdd = (g) => { const sc = getScene(); if (sc && g) sc.add(g); };
function ruimGroep(g) {
  if (!g) return;
  if (g.parent) g.parent.remove(g);
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
}
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const grond = (w, x, y) => (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(x, y, 0) || 0 : 0);
const hoekVerschil = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
// Een melding: aan wie in de machine zit die nu aan de beurt is. Een gast (samen spelen) krijgt hem via zijn eigen melding, anders de speler.
function bericht(w, tekst, dur = 4) {
  const v = S.huidig;
  if (v && v.coopBestuurder > 0 && w.coopMeld) { w.coopMeld(v.coopBestuurder, tekst); return; }
  if (w && w.addMessage) w.addMessage(tekst, dur);
}
// zeg iets hooguit eens per `s` seconden (per sleutel, per machine)
function zeg(w, sleutel, tekst, s = 6, dur = 4) {
  const k = S.huidig ? sleutel + S.huidig.id : sleutel;
  if (S.meld[k] && S.t - S.meld[k] < s) return;
  S.meld[k] = S.t;
  bericht(w, tekst, dur);
}

// --- het erf ---------------------------------------------------------------------------------

// Een vrije plek voor het erf bij de plaats van het erf: geen gebouw en geen water in de buurt.
function vindErfPlek(w, x, y) {
  const map = w.map;
  const vrij = (px, py) => {
    try { if (isInWater(map, px, py)) return false; } catch (e) { /* geen waterlaag: dan is het droog */ }
    return !(map.buildingsNear && map.buildingsNear(px, py, 28).length);
  };
  for (const r of [0, 45, 90, 140]) {
    for (let k = 0; k < (r ? 8 : 1); k++) {
      const a = (k / 8) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (vrij(px, py)) return { x: px, y: py };
    }
  }
  return { x, y };
}

function erfPlek(w, erfId) {
  if (S.erven.has(erfId)) return S.erven.get(erfId);
  const d = PC.erfDef(erfId);
  if (!d) return null;
  const [x, y] = wgsToWorld(d.lat, d.lon);
  if (dist(w.player.x, w.player.y, x, y) > SPAWN_R) return null;     // de wereld hier is nog niet geladen: later
  const p = vindErfPlek(w, x, y);
  S.erven.set(erfId, p);
  return p;
}

const doos = (g, x, y, z, bx, by, bz, kleur) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), new THREE.MeshLambertMaterial({ color: kleur }));
  m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
};
function dak(g, x, y, z, br, di, kleur) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(br * 0.75, 2.2, 4), new THREE.MeshLambertMaterial({ color: kleur }));
  m.rotation.y = Math.PI / 4; m.scale.set(1, 1, di / br); m.position.set(x, y, z); m.castShadow = true; g.add(m);
}

// Het erf zelf: een grindvlak, het huis, de schuur, een silo als die er is en het dieselvat (daar tank je). Laag-poly, zonder tekst.
function bouwErf(w, erfId, pos) {
  const d = PC.erfDef(erfId);
  const g = new THREE.Group();
  g.name = 'boerderij-erf-' + erfId;
  const vloer = new THREE.Mesh(new THREE.PlaneGeometry(46, 40), new THREE.MeshLambertMaterial({ color: 0x9b9486 }));
  vloer.rotation.x = -Math.PI / 2; vloer.position.set(0, 0.05, 6);
  g.add(vloer);
  doos(g, -11, 2, -9, 9, 4, 7, 0xd2bfa0); dak(g, -11, 5.1, -9, 9, 7, 0x8a3b2e);
  doos(g, 8, 3, -10, 14, 6, 9, 0xa3452f); dak(g, 8, 7.1, -10, 14, 9, 0x4a4540);
  if (d.silo) { const s = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 11, 10), new THREE.MeshLambertMaterial({ color: 0xb5b8bb })); s.position.set(-21, 5.5, -9); s.castShadow = true; g.add(s); }
  const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.6, 10), new THREE.MeshLambertMaterial({ color: 0x2c5a8f }));
  vat.rotation.z = Math.PI / 2; vat.position.set(0, 0.9, 3); vat.castShadow = true; g.add(vat);
  doos(g, 0, 0.45, 3, 1.8, 0.1, 1.2, 0x3a3d40);
  g.position.set(pos.x, grond(w, pos.x, pos.y), pos.y);
  sceneAdd(g);
  return g;
}

// Waar de machines en werktuigen van een erf staan: rijen zuidelijk van de gebouwen.
function slotPlek(pos, i) {
  return { x: pos.x - 15 + (i % 5) * 7.5, y: pos.y + 14 + Math.floor(i / 5) * 9, angle: Math.PI / 2 };
}
export const dieselvatPlek = (pos) => ({ x: pos.x, y: pos.y + 3 });

// --- machines en werktuigen in de wereld --------------------------------------------------------------

function itemsVan(bd) {
  const uit = [];
  for (const erfId of Object.keys(bd.erven)) {
    const op = PC.machinesOp(bd, erfId).slice().sort((a, b) => (a.uid < b.uid ? -1 : 1));
    op.forEach((m, i) => uit.push({ m, erfId, slot: i, machine: PC.MACHINE_CATALOGUS[m.type].soort === 'machine' }));
  }
  return uit;
}

function maakVoertuig(w, m, pos) {
  const model = { ...(MACHINE_MODELLEN[PC.MACHINE_CATALOGUS[m.type].type === 'trekker' ? m.type : PC.MACHINE_CATALOGUS[m.type].type]) };
  if (!model.name) return null;
  const v = new Vehicle(pos.x, pos.y, pos.angle, model);
  v.z = w.map.spawnZ ? w.map.spawnZ(pos.x, pos.y) : 0;
  v.playerOwned = true;
  v.farm = m.uid;
  v.speed = 0;
  w.vehicles.push(v);
  S.voertuigen.set(m.uid, v);
  if (!S.rigs.has(m.uid)) S.rigs.set(m.uid, WT.nieuweRig(m.uid));
  return v;
}

function haalVoertuigWeg(w, uid) {
  const v = S.voertuigen.get(uid);
  if (!v) return;
  const i = w.vehicles.indexOf(v);
  if (i >= 0) w.vehicles.splice(i, 1);
  S.voertuigen.delete(uid);
}

function maakWerktuig(w, m, pos) {
  const type = PC.MACHINE_CATALOGUS[m.type].type;
  const group = W3.bouwWerktuig(type);
  const imp = { uid: m.uid, type, group, x: pos.x, y: pos.y, hoek: pos.angle };
  S.werktuigen.set(m.uid, imp);
  zetWerktuigPose(w, imp, false);
  sceneAdd(group);
  return imp;
}

function zetWerktuigPose(w, imp, omlaag) {
  imp.group.position.set(imp.x, grond(w, imp.x, imp.y), imp.y);
  imp.group.rotation.y = -imp.hoek + Math.PI / 2;
  W3.zetHef(imp.group, omlaag);
}

// Wie het werktuig nu meeneemt (een rig) of null.
const rigVan = (uid) => { for (const r of S.rigs.values()) if (r.werktuig === uid) return r; return null; };

function syncWereld(w) {
  const b = getBoerderij(), bd = b.bedrijf, p = w.player;
  const items = itemsVan(bd);
  const heeft = new Set(items.map((i) => i.m.uid));
  // wat niet meer van jou is (terug naar de verhuurder, verkocht) gaat uit de wereld, behalve een machine waar je nog in zit
  for (const uid of [...S.voertuigen.keys()]) {
    if (heeft.has(uid)) continue;
    const v = S.voertuigen.get(uid);
    if (v && v.driver === 'player') continue;
    haalVoertuigWeg(w, uid); S.rigs.delete(uid); S.pose.delete(uid);
  }
  for (const uid of [...S.werktuigen.keys()]) {
    if (heeft.has(uid)) continue;
    const imp = S.werktuigen.get(uid);
    W3.ruimWerktuig(imp.group); S.werktuigen.delete(uid); S.pose.delete(uid);
    for (const r of S.rigs.values()) if (r.werktuig === uid) { r.werktuig = null; r.pto = false; r.hef = 'omhoog'; }
  }
  for (const r of [...S.rigs.keys()]) if (!heeft.has(r) && !S.voertuigen.has(r)) S.rigs.delete(r);
  // de erven: bouwen als je dichtbij bent, weghalen als je ver weg bent
  for (const erfId of Object.keys(bd.erven)) {
    const pos = erfPlek(w, erfId);
    if (pos && !S.erfMeshes.has(erfId) && dist(p.x, p.y, pos.x, pos.y) < SPAWN_R) S.erfMeshes.set(erfId, bouwErf(w, erfId, pos));
  }
  for (const [erfId, g] of [...S.erfMeshes]) {
    const pos = S.erven.get(erfId);
    if (!bd.erven[erfId] || !pos || dist(p.x, p.y, pos.x, pos.y) > DESPAWN_R) { ruimGroep(g); S.erfMeshes.delete(erfId); }
  }
  // de machines en werktuigen: op hun plek (laatste stand, anders hun plek op het erf) bouwen als je dichtbij bent
  for (const it of items) {
    const uid = it.m.uid;
    const pose = S.pose.get(uid);
    let pos = pose;
    if (!pos) { const erf = S.erven.get(it.erfId); if (erf) pos = slotPlek(erf, it.slot); }
    if (it.machine) {
      const v = S.voertuigen.get(uid);
      if (v) {
        S.pose.set(uid, { x: v.x, y: v.y, angle: v.angle });
        if (v.driver !== 'player' && dist(p.x, p.y, v.x, v.y) > DESPAWN_R) haalVoertuigWeg(w, uid);
      } else if (pos && dist(p.x, p.y, pos.x, pos.y) < SPAWN_R) maakVoertuig(w, it.m, pos);
    } else {
      const imp = S.werktuigen.get(uid);
      const rig = rigVan(uid);
      if (imp) {
        if (!rig && dist(p.x, p.y, imp.x, imp.y) > DESPAWN_R) { S.pose.set(uid, { x: imp.x, y: imp.y, angle: imp.hoek }); W3.ruimWerktuig(imp.group); S.werktuigen.delete(uid); }
      } else if (rig) {
        const tv = S.voertuigen.get(rig.machine);
        if (tv) { maakWerktuig(w, it.m, { x: tv.x, y: tv.y, angle: tv.angle }); }
      } else if (pos && dist(p.x, p.y, pos.x, pos.y) < SPAWN_R) maakWerktuig(w, it.m, pos);
    }
  }
  // een werktuig dat aan een trekker hangt die ver weg is: stopt met bestaan als de trekker weggaat, het is dan niet meer in beeld
  for (const [uid, imp] of [...S.werktuigen]) {
    const rig = rigVan(uid);
    if (rig && !S.voertuigen.has(rig.machine)) { S.pose.set(uid, { x: imp.x, y: imp.y, angle: imp.hoek }); W3.ruimWerktuig(imp.group); S.werktuigen.delete(uid); }
  }
  // een rig zonder trekker in de wereld hangt nog wel aan zijn werktuig: bij het terugkomen komt het weer mee (pose van de trekker)
  syncVelden(w);
}

// Elke beeld: de werktuigen die aan een trekker hangen volgen hem.
function volgWerktuigen(w, dt) {
  for (const [muid, rig] of S.rigs) {
    if (!rig.werktuig) continue;
    const v = S.voertuigen.get(muid), imp = S.werktuigen.get(rig.werktuig);
    if (!v || !imp) continue;
    const d = WT.WERKTUIG[imp.type];
    const trailer = !!d.vervoer;
    if (trailer) imp.hoek += hoekVerschil(v.angle, imp.hoek) * Math.min(1, dt * 3.5); else imp.hoek = v.angle;
    // het koppelpunt achter de trekker; het werktuig hangt daar met zijn voorkant en het midden ligt `achter` verder
    const hx = v.x - Math.cos(v.angle) * (v.model.len / 2 + 0.3), hy = v.y - Math.sin(v.angle) * (v.model.len / 2 + 0.3);
    imp.x = hx - Math.cos(imp.hoek) * (d.achter - 0.3 + (trailer ? 0.2 : 0));
    imp.y = hy - Math.sin(imp.hoek) * (d.achter - 0.3 + (trailer ? 0.2 : 0));
    zetWerktuigPose(w, imp, rig.hef === 'omlaag');
    if (trailer) W3.zetLading(imp.group, rig.lading ? rig.lading.kg / WT.AANHANGER_KG : 0, rig.lading && rig.lading.gewas);
  }
}

// --- koppelen ---------------------------------------------------------------------------------------

const koppelPunt = (v) => ({ x: v.x - Math.cos(v.angle) * (v.model.len / 2 + 1.6), y: v.y - Math.sin(v.angle) * (v.model.len / 2 + 1.6) });
const bezetUids = () => [...S.rigs.values()].map((r) => r.werktuig).filter(Boolean);
const recFrom = (bd, uid) => M.vind(bd, uid);

// Wat kan er nu gekoppeld worden: { trekker (voertuig), imp, rig } of null. In een trekker: het werktuig dichtbij het koppelpunt. Te voet: het werktuig
// vlakbij jou, aan de trekker die er het dichtst bij staat (en vrij is).
// De trekker (voertuig) die nu een werktuig kan koppelen: het werktuig het dichtst bij zijn koppelpunt, of null.
export function koppelKandidaatVoor(w, v) {
  const bd = getBedrijf();
  const m = recFrom(bd, v.farm), rig = S.rigs.get(v.farm);
  if (!rig || rig.werktuig || !m || PC.MACHINE_CATALOGUS[m.type].type !== 'trekker') return null;
  const k = koppelPunt(v);
  let best = null, bd2 = KOPPEL_R;
  for (const i of S.werktuigen.values()) {
    if (rigVan(i.uid) || !WT.werktuigDef(recFrom(bd, i.uid))) continue;
    const d = dist(i.x, i.y, k.x, k.y);
    if (d < bd2) { bd2 = d; best = i; }
  }
  return best ? { trekker: v, imp: best, rig } : null;
}

export function koppelKandidaat(w) {
  const p = w.player, bd = getBedrijf();
  const vrijeImp = [...S.werktuigen.values()].filter((i) => !rigVan(i.uid) && WT.werktuigDef(recFrom(bd, i.uid)));
  const inV = p.inVehicle && p.inVehicle.farm ? p.inVehicle : null;
  const vrijeRig = (v) => { const r = S.rigs.get(v.farm); const m = recFrom(bd, v.farm); return r && !r.werktuig && m && PC.MACHINE_CATALOGUS[m.type].type === 'trekker' ? r : null; };
  if (inV) return koppelKandidaatVoor(w, inV);
  if (p.inVehicle) return null;
  let best = null, bdist = KOPPEL_VOET_R;
  for (const i of vrijeImp) { const d = dist(i.x, i.y, p.x, p.y); if (d < bdist) { bdist = d; best = i; } }
  if (!best || bdist >= machineAfstand(p)) return null;     // staat er een machine dichterbij dan het werktuig, dan stapt E in die machine
  let tr = null, td = 9;
  for (const v of S.voertuigen.values()) {
    if (v.driver) continue;
    if (!vrijeRig(v)) continue;
    const k = koppelPunt(v), d = dist(best.x, best.y, k.x, k.y);
    if (d < td) { td = d; tr = v; }
  }
  return tr ? { trekker: tr, imp: best, rig: S.rigs.get(tr.farm) } : null;
}

// Te voet gaat E naar wat het dichtst bij is: de afstand tot de dichtstbijzijnde machine zonder bestuurder (tot zijn romp).
function machineAfstand(p) {
  let d = Infinity;
  for (const v of S.voertuigen.values()) if (!v.driver) d = Math.min(d, Math.max(0, dist(v.x, v.y, p.x, p.y) - v.model.len / 2 - v.model.wid / 4));
  return d;
}

// Te voet kan een gekoppeld werktuig ook los: de trekker staat stil en jij staat bij het werktuig.
function losKandidaat(w) {
  const p = w.player;
  if (p.inVehicle) return null;
  for (const [muid, rig] of S.rigs) {
    if (!rig.werktuig) continue;
    const imp = S.werktuigen.get(rig.werktuig), v = S.voertuigen.get(muid);
    if (imp && v && !v.driver && dist(imp.x, imp.y, p.x, p.y) - 1 < Math.min(KOPPEL_VOET_R, machineAfstand(p)) && Math.abs(v.speed) < 0.3) return { rig, imp, v };
  }
  return null;
}

function doeKoppel(w, c) {
  const bd = getBedrijf();
  const r = WT.koppel(c.rig, recFrom(bd, c.trekker.farm), recFrom(bd, c.imp.uid), bezetUids());
  if (!r.ok) { zeg(w, 'koppel', r.reden, 2, 3.5); return false; }
  const d = WT.WERKTUIG[c.imp.type];
  const hint = d.vervoer ? 'Laad de oogst bij je erf met E.' : [d.hef ? `${TOETS.hef} = hef` : null, d.pto ? `${TOETS.pto} = aftakas` : null].filter(Boolean).join(', ');
  bericht(w, `${r.naam} gekoppeld.${hint ? ' ' + hint + '.' : ''}`, 5);
  return true;
}

function doeLos(w, rig, tractorUid) {
  const bd = getBedrijf();
  const werkUid = rig.werktuig;
  const r = WT.ontkoppel(rig);
  if (!r.ok) { zeg(w, 'los', r.reden, 2, 3.5); return false; }
  const imp = S.werktuigen.get(werkUid);
  if (imp) { zetWerktuigPose(w, imp, true); S.pose.set(werkUid, { x: imp.x, y: imp.y, angle: imp.hoek }); }
  const m = recFrom(bd, werkUid);
  bericht(w, `${WT.naamVan(m)} losgekoppeld.`, 3.5);
  return true;
}

// --- diesel -------------------------------------------------------------------------------------------

// Waar kun je tanken: bij het dieselvat van een erf van jou (goedkoper) of bij een pomp. { plek, tekst } of null.
function tankPlekBij(w, v) {
  const bd = getBedrijf();
  for (const erfId of Object.keys(bd.erven)) {
    const pos = S.erven.get(erfId);
    if (!pos) continue;
    const vat = dieselvatPlek(pos);
    if (dist(v.x, v.y, vat.x, vat.y) < 10) return { plek: 'erf', x: vat.x, y: vat.y };
  }
  const f = nearestFacility('fuel', v.x, v.y, { maxD: 16 });
  if (f) return { plek: 'pomp', x: f.x, y: f.y };
  return null;
}

// --- de afnemers ---------------------------------------------------------------------------------------

function afnemerPlek(w, gewas) {
  if (S.afnemers.has(gewas)) return S.afnemers.get(gewas);
  const t = AFNEMER_PLEK[gewas];
  if (!t) return null;
  const [x, y] = wgsToWorld(t[0], t[1]);
  let p = { x, y };
  try { const rp = w.map.nearestRoadPoint(x, y, 260, true); if (rp && dist(rp.x, rp.y, x, y) < 300) p = { x: rp.x, y: rp.y }; } catch (e) { /* geen wegen geladen: de ruwe plek */ }
  S.afnemers.set(gewas, p);
  return p;
}

// --- velden --------------------------------------------------------------------------------------------

const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; };

async function zoekVeld(w, id) {
  if (S.zoek.has(id)) return;
  S.zoek.add(id);
  try {
    const { vindAkker } = await import('./sidejob_bieten.js');         // uitgesteld geladen: een vaste import maakte een kring met de bijbanen
    const d = PC.perceelDef(id);
    const [x, y] = wgsToWorld(d.lat, d.lon);
    const a = vindAkker(w.map, { x, y }, id === PC.START_PERCEEL ? [140, 220, 320, 450] : [0, 70, 150, 260, 380]);
    if (a) zetVeldPositie(id, { x: a.center.x, y: a.center.y, a: a.angle });
    else S.meld['geenveld' + id] = S.t;
  } catch (e) { /* de wereld hier is nog niet geladen: later opnieuw */ }
  S.zoek.delete(id);
}

const tmpKleur = new THREE.Color();
function kleurVan(stand, werk, ri, c) {
  if (werk && werk.cellen[ri][c] > 0) {
    return { ploegen: GROND.geploegd, cultiveren: GROND.cult, zaaien: GROND.gezaaid, bemesten: GROND.mest, spuiten: GROND.spuit, oogsten: GROND.braak }[werk.taak] || GROND.gezaaid;
  }
  if (stand.fase === 'braak') return GROND.braak;
  if (stand.fase === 'geploegd') return stand.cult > 0 ? GROND.cult : GROND.geploegd;
  return stand.mest > 0 ? GROND.mest : stand.spuit > 0 ? GROND.spuit : GROND.gezaaid;
}

let streepTex = null;
function streepTextuur() {
  if (streepTex) return streepTex;
  const data = new Uint8Array(16 * 4);
  for (let i = 0; i < 16; i++) { const lichter = (i >> 1) % 2 === 0; const v = lichter ? 255 : 196; data.set([v, v, v, 255], i * 4); }
  streepTex = new THREE.DataTexture(data, 1, 16, THREE.RGBAFormat);
  streepTex.magFilter = THREE.NearestFilter; streepTex.minFilter = THREE.NearestFilter; streepTex.needsUpdate = true;
  return streepTex;
}

const sleutelVan = (b, id) => { const v = B.veldStand(b, id); return [v.fase, v.gewas, Math.round(Math.min(1, v.gezaaidOp == null ? 0 : (b.uren - v.gezaaidOp) / (B.GEWASSEN[v.gewas] ? B.GEWASSEN[v.gewas].groeiUren : 1)) * 10), v.cult > 0 ? 1 : 0, v.spuit > 0 ? 1 : 0, v.mest > 0 ? 1 : 0].join('|'); };

function bouwVeldMesh(w, id, pos, b) {
  const rijen = akkerRijen({ x: pos.x, y: pos.y }, pos.a);
  const stand = B.veldStand(b, id);
  const group = new THREE.Group();
  group.name = 'boerderijveld-' + id;
  const werk = S.werk && S.werk.id === id ? S.werk.werk : null;
  const cellen = new THREE.InstancedMesh(new THREE.PlaneGeometry(WT.CEL, RIJ_AFSTAND), new THREE.MeshLambertMaterial({ map: streepTextuur() }), RIJEN * WT.CELLEN);
  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), sc = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
  rijen.forEach((r, ri) => {
    q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -Math.atan2(r.uy, r.ux)));
    for (let c = 0; c < WT.CELLEN; c++) {
      const along = (c + 0.5) * WT.CEL, x = r.ax + r.ux * along, y = r.ay + r.uy * along;
      p3.set(x, grond(w, x, y) + 0.05, y);
      m.compose(p3, q, sc);
      cellen.setMatrixAt(ri * WT.CELLEN + c, m);
      cellen.setColorAt(ri * WT.CELLEN + c, tmpKleur.setHex(kleurVan(stand, werk, ri, c)));
    }
  });
  cellen.instanceMatrix.needsUpdate = true;
  if (cellen.instanceColor) cellen.instanceColor.needsUpdate = true;
  group.add(cellen);
  // de hoekpalen
  const paal = new THREE.CylinderGeometry(0.12, 0.12, 1.7, 5), palenMat = new THREE.MeshLambertMaterial({ color: 0xc8a96a });
  for (const [x, y] of [[rijen[0].ax, rijen[0].ay], [rijen[RIJEN - 1].ax, rijen[RIJEN - 1].ay], [rijen[0].bx, rijen[0].by], [rijen[RIJEN - 1].bx, rijen[RIJEN - 1].by]]) {
    const pm = new THREE.Mesh(paal, palenMat); pm.position.set(x, grond(w, x, y) + 0.85, y); group.add(pm);
  }
  // het gewas
  let planten = null;
  const g = B.GEWASSEN[stand.gewas];
  if (stand.fase === 'gezaaid' && g) {
    const gr = Math.min(1, Math.max(0, (b.uren - stand.gezaaidOp) / g.groeiUren));
    const geo = g.vorm === 'kegel' ? new THREE.ConeGeometry(0.34, 0.55, 6) : g.vorm === 'halm' ? new THREE.ConeGeometry(0.16, 0.8, 5) : new THREE.IcosahedronGeometry(0.4, 0);
    const hoogte = g.vorm === 'kegel' ? 0.5 : g.vorm === 'halm' ? 0.8 : 0.55;
    const per = Math.floor(RIJ_LEN / 2.5), lijnen = [-2.2, 0, 2.2];
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: tmpKleur.setHex(g.jong).lerp(new THREE.Color(g.rijp), gr).getHex() }), RIJEN * per * lijnen.length);
    const items = [];
    let n = 0;
    const s = 0.25 + 0.75 * gr;
    const qq = new THREE.Quaternion();
    rijen.forEach((r, ri) => {
      const nx = -r.uy, ny = r.ux;
      for (const off of lijnen) {
        for (let i = 0; i < per; i++) {
          const along = (i + 0.5) * 2.5, x = r.ax + r.ux * along + nx * off, y = r.ay + r.uy * along + ny * off;
          p3.set(x, grond(w, x, y) + hoogte * s * 0.5 + 0.05, y);
          m.compose(p3, qq, sc.set(s, s, s));
          mesh.setMatrixAt(n, m);
          items.push({ n, ri, cel: Math.min(WT.CELLEN - 1, Math.floor(along / WT.CEL)), x, y, weg: false });
          n++;
        }
      }
    });
    sc.set(1, 1, 1);
    mesh.instanceMatrix.needsUpdate = true;
    planten = { mesh, items };
    group.add(mesh);
  }
  sceneAdd(group);
  return { id, pos, rijen, group, cellen, planten, sleutel: sleutelVan(b, id), werkRef: werk, vuil: false };
}

function ruimVeld(v) { if (v) ruimGroep(v.group); }

const NUL = new THREE.Matrix4().makeScale(0, 0, 0);

function syncVelden(w) {
  const b = getBoerderij(), bd = b.bedrijf, p = w.player;
  for (const id of Object.keys(bd.percelen)) {
    const pos = B.veldPositie(b, id);
    if (!pos) {
      const d = PC.perceelDef(id);
      const [x, y] = wgsToWorld(d.lat, d.lon);
      if (dist(p.x, p.y, x, y) < SPAWN_R + 150) zoekVeld(w, id);
      continue;
    }
    const v = S.velden.get(id);
    const dichtbij = dist(p.x, p.y, pos.x, pos.y) < SPAWN_R;
    const key = sleutelVan(b, id);
    const werk = S.werk && S.werk.id === id ? S.werk.werk : null;
    if (v && (!dichtbij && dist(p.x, p.y, pos.x, pos.y) > DESPAWN_R)) { ruimVeld(v); S.velden.delete(id); continue; }
    if (v && (v.sleutel !== key || v.werkRef !== werk)) { ruimVeld(v); S.velden.set(id, bouwVeldMesh(w, id, pos, b)); continue; }
    if (!v && dichtbij) S.velden.set(id, bouwVeldMesh(w, id, pos, b));
  }
  for (const [id, v] of [...S.velden]) if (!bd.percelen[id]) { ruimVeld(v); S.velden.delete(id); }
}

// Een cel is bewerkt: de kleur van die cel past zich aan en bij het oogsten verdwijnen de planten in die cel.
function celKlaar(veld, ri, c, b) {
  const werk = S.werk && S.werk.id === veld.id ? S.werk.werk : null;
  veld.cellen.setColorAt(ri * WT.CELLEN + c, tmpKleur.setHex(kleurVan(B.veldStand(b, veld.id), werk, ri, c)));
  veld.vuil = true;
  if (veld.planten && werk && werk.taak === 'oogsten') {
    for (const it of veld.planten.items) if (!it.weg && it.ri === ri && it.cel === c) { veld.planten.mesh.setMatrixAt(it.n, NUL); it.weg = true; }
    veld.planten.mesh.instanceMatrix.needsUpdate = true;
  }
}

// --- het werk ------------------------------------------------------------------------------------------

const WERK_TEKST = {
  ploegen: (f) => `Geploegd: ${pct(f)} netjes.`,
  cultiveren: (f) => `Gecultiveerd: ${pct(f)}. De zaaibedgrond ligt fijn: iets meer opbrengst.`,
  zaaien: (f, uit) => `${B.GEWASSEN[uit.gewas] ? B.GEWASSEN[uit.gewas].naam : 'Het gewas'} gezaaid (${pct(f)}). Nu groeit het in speltijd.`,
  bemesten: (f) => `Bemest: ${pct(f)}. Dat geeft meer opbrengst.`,
  spuiten: (f) => `Gespoten: ${pct(f)}. Het onkruid blijft weg: iets meer opbrengst.`,
  oogsten: (f, uit) => `Geoogst: ${uit.kg} kg. Laad de oogst op de aanhanger (bij je erf) of laat de loonwerker afleveren.`,
};
const pct = (f) => `${Math.round(f * 100)}%`;
const NAAM = { ploegen: 'ploegen', cultiveren: 'cultiveren', zaaien: 'zaaien', bemesten: 'bemesten', spuiten: 'spuiten', oogsten: 'oogsten' };

// Het punt van het werktuig: bij de maaidorser de maaitafel voorin, anders het midden van het werktuig achter de trekker.
function werkPunt(v, set, imp) {
  if (set.bron === 'machine') return { x: v.x + Math.cos(v.angle) * (v.model.len / 2 - 0.5), y: v.y + Math.sin(v.angle) * (v.model.len / 2 - 0.5) };
  return imp ? { x: imp.x, y: imp.y } : null;
}

function veldBij(w, punt) {
  const b = getBoerderij();
  let best = null, bd = VEL_R;
  for (const id of Object.keys(b.bedrijf.percelen)) {
    const pos = B.veldPositie(b, id);
    if (!pos) continue;
    const d = dist(punt.x, punt.y, pos.x, pos.y);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}

function werkStapWereld(dt, w, v, rig, m, imp, gast = false) {
  const b = getBoerderij();
  const impRec = imp ? recFrom(getBedrijf(), imp.uid) : null;
  const set = WT.werkSet(rig, m, impRec);
  if (!set || !set.taak) return;
  const punt = werkPunt(v, set, imp);
  if (!punt) return;
  const id = veldBij(w, punt);
  if (!id) { return; }
  const speed = Math.abs(v.speed);
  const werkt = WT.werktNu(set, rig);
  const pos = B.veldPositie(b, id);
  const rijen = akkerRijen({ x: pos.x, y: pos.y }, pos.a);
  const posRijen = rijen.map((r) => rijPositie(r, punt.x, punt.y));
  const tol = (WT.BANDEN[set.taak] || { tol: 2.4 }).tol + 0.4;
  const binnen = posRijen.some((q) => Math.abs(q.across) <= tol && q.along >= 0 && q.along <= RIJ_LEN);
  if (!binnen) return;
  // het werk begint bij een ander perceel: de boerderij werkt vanaf nu daar
  if (id !== getBedrijf().actief) {
    if (!werkt || speed < 1) return;
    S.werk = null;
    if (zetActief(id)) bericht(w, `De boerderij werkt nu op ${PC.perceelDef(id).naam}.`, 4);
    return;
  }
  const taak = set.taak;
  const mag = B.magTaak(b, taak, Infinity, { vrij: true });          // het geld voor het materiaal gaat bij het begin van het werk (neemTaak)
  const past = WT.pastBij(set, taak, b.veld.gewas);
  if (!mag.ok) {
    const reden = taak === 'oogsten' && b.schuur.kg > 0 ? 'Eerst de schuur leeg: laad de oogst op de aanhanger bij je erf, of laat de loonwerker afleveren (menu: Boerderij > Perceel).' : mag.reden;
    if (werkt && speed >= 1) zeg(w, 'mag-' + taak, reden, 7);
    S.werk = S.werk && S.werk.taak === taak ? null : S.werk;
    return;
  }
  if (taak === 'oogsten' && !past.ok) { if (werkt && speed >= 1) zeg(w, 'past', past.reden, 7); return; }
  if (!S.werk || S.werk.taak !== taak || S.werk.id !== id) {
    if (!werkt || speed < (WT.BANDEN[taak] || { vMin: 2 }).vMin) { zegUitleg(w, set, rig, speed); return; }
    const nm = neemTaak(w, taak, { vrij: true });
    if (!nm.ok) { zeg(w, 'neem', nm.reden, 6); return; }
    S.werk = { taak, id, werk: WT.nieuwWerk(taak, { eigen: true }) };
    const k = nm.kosten;
    bericht(w, `${cap(NAAM[taak])} begonnen${k.materiaal ? ` (${taak === 'zaaien' ? 'zaaigoed' : taak === 'spuiten' ? 'spuitmiddel' : 'mest'} €${k.materiaal})` : ''}. Rij de rijen netjes recht, niet te hard.`, 5);
    const veld = S.velden.get(id);
    if (veld) veld.sleutel = null;            // bouwt opnieuw, met het werk erbij
    return;
  }
  const werkS = S.werk.werk;
  const ev = WT.werkStap(werkS, posRijen, speed, werkt, dt);
  const veld = S.velden.get(id);
  for (const e of ev) {
    if (e.type === 'cel' && veld) celKlaar(veld, e.rij, e.cel, b);
    else if (e.type === 'tehard') zeg(w, 'tehard', 'Te hard: het werk wordt slordig (de helft van die meters telt). Gas terug.', 3, 2.5);
    else if (e.type === 'scheef') zeg(w, 'scheef', 'Blijf in de rij.', 3, 2);
    else if (e.type === 'klaar') {
      const f = WT.fractieWerk(werkS);
      const uit = rondAf(w, taak, f, { vrij: true });
      // een gast die meewerkt krijgt zijn deel: wat de loonwerker voor deze klus zou vragen, volgens het deel dat gasten van een verdienste krijgen (samen spelen)
      if (gast && w.coopDeel) w.coopDeel(M.loonwerkKosten(taak, PC.perceelDef(id).ha), loopbaanDeel('landbouw', M.loonwerkKosten(taak, PC.perceelDef(id).ha), 8));
      S.werk = null;
      bericht(w, (WERK_TEKST[taak] || (() => 'Klaar.'))(f, uit), 6);
      if (veld) veld.sleutel = null;
      return;
    }
  }
  if (veld && veld.vuil) {
    if (veld.cellen.instanceColor) veld.cellen.instanceColor.needsUpdate = true;
    veld.vuil = false;
  }
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Op het veld, het werk nog niet begonnen: zeg wat er ontbreekt (een keer per zoveel seconden).
function zegUitleg(w, set, rig, speed) {
  const nodig = WT.ontbreekt(set, rig, TOETS);
  if (nodig.length) zeg(w, 'ontbreekt', `Nog nodig om te werken: ${nodig.join(' en ')}.`, 8);
  else if (speed < (WT.BANDEN[set.taak] || { vMin: 2 }).vMin) zeg(w, 'trager', 'Rij iets sneller: te langzaam werkt niet.', 8);
}

// --- elk beeld ---------------------------------------------------------------------------------------------

export function updateBoerderijWereld(dt, w) {
  if (!w || !w.map || !w.player || w.coopRole === 'client' || !(dt > 0)) return;
  S.t += dt;
  const b = getBoerderij();
  // de staat van het bedrijf kan veranderen (kopen, huren, terug naar de verhuurder): synchroniseren
  if (S.t - S.sync > 0.5) { S.sync = S.t; syncWereld(w); }
  volgWerktuigen(w, dt);
  // elke machine met een bestuurder: de speler zelf, of (samen spelen) een gast die zijn eigen trekker op jouw akker bestuurt
  for (const v of S.voertuigen.values()) {
    if (v.driver !== 'player') continue;
    const rig = S.rigs.get(v.farm), m = recFrom(b.bedrijf, v.farm);
    if (!rig || !m) continue;
    S.huidig = v;
    const imp = rig.werktuig ? S.werktuigen.get(rig.werktuig) : null;
    const gast = v.coopBestuurder > 0;
    if (gast) autoBediening(w, v, rig, m, imp);
    rijdt(dt, w, v, m, rig, imp);
    werkStapWereld(dt, w, v, rig, m, imp, gast);
    lading(dt, w, v, rig, m);
    S.huidig = null;
  }
  S.prompt = bepaalPrompt(w);
}

// Een gast kan alleen sturen en remmen (zijn toetsen gaan niet naar jouw wereld): koppelen, de hef en de aftakas gaan voor hem vanzelf. Een werktuig dat
// vlak achter zijn trekker staat koppelt hij zodra hij stilstaat; op het veld gaat de hef omlaag en de aftakas aan als het werk dat vraagt, ernaast weer uit.
function autoBediening(w, v, rig, m, imp) {
  const bd = getBedrijf();
  if (!rig.werktuig) {
    if (Math.abs(v.speed) < 0.6) {
      const k = koppelKandidaatVoor(w, v);
      if (k && dist(k.imp.x, k.imp.y, koppelPunt(v).x, koppelPunt(v).y) < 3.2) doeKoppel(w, k);
    }
    return;
  }
  const impRec = imp ? recFrom(bd, imp.uid) : null;
  const set = WT.werkSet(rig, m, impRec);
  if (!set) return;
  const punt = werkPunt(v, set, imp);
  const opVeld = !!punt && !!veldBij(w, punt);
  rig.hef = opVeld && set.hef ? 'omlaag' : 'omhoog';
  rig.pto = opVeld && set.pto && M.kanStarten(m).ok;
}

// Diesel, slijtage en de topsnelheid van de machine waar je in zit.
function rijdt(dt, w, v, m, rig, imp) {
  const speed = Math.abs(v.speed);
  const set = WT.werkSet(rig, m, imp ? recFrom(getBedrijf().bedrijf ? getBedrijf() : getBedrijf(), imp.uid) : null);
  const werkend = !!set && WT.werktNu(set, rig) && !!set.taak;
  const top = M.topSnelheid(m);
  const basis = MACHINE_MODELLEN[PC.MACHINE_CATALOGUS[m.type].type === 'trekker' ? m.type : PC.MACHINE_CATALOGUS[m.type].type];
  const wens = M.kanStarten(m).ok ? Math.max(0.6, top) : 0.6;
  if (basis && Math.abs(v.model.maxSpeed - wens) > 0.05) v.model = { ...v.model, maxSpeed: wens };
  S.draaiT += dt;
  if (S.draaiT >= 0.5) {
    const uren = S.draaiT * UREN_PER_S;
    S.draaiT = 0;
    const belasting = speed > 0.4 ? (werkend ? 2 : 1) : rig.pto ? 1 : 0;
    const vorigPct = M.brandstofPct(m);
    const r = draaiMachine(v.farm, uren, belasting);
    if (r.leeg) { zeg(w, 'leeg', `${PC.MACHINE_CATALOGUS[m.type].naam} staat zonder diesel. Rij naar het dieselvat op je erf of naar een pomp en tank bij met ${TOETS.tank}.`, 20, 6); rig.pto = false; }
    else if (vorigPct > 0.15 && M.brandstofPct(m) <= 0.15) zeg(w, 'laag', 'De diesel is bijna op: tank bij met ' + TOETS.tank + ' bij het dieselvat of een pomp.', 30, 5);
    if (r.kapot) zeg(w, 'kapot', `${PC.MACHINE_CATALOGUS[m.type].naam} is versleten en kruipt nog. Een onderhoudsbeurt kan in het menu: Boerderij > Machines.`, 30, 6);
    else if (m.slijtage >= 60 && !S.meld.slijt) { S.meld.slijt = S.t; zeg(w, 'slijt', `${PC.MACHINE_CATALOGUS[m.type].naam} slijt (${Math.round(m.slijtage)}%): rijdt trager en gebruikt meer diesel. Een onderhoudsbeurt helpt.`, 60, 6); }
  }
}

// De aanhanger: aan de afnemer leveren (stil staan binnen de afleverkring) en laden bij je erf.
function lading(dt, w, v, rig, m) {
  const l = rig.lading;
  if (!l || !(l.kg > 0)) return;
  const speed = Math.abs(v.speed);
  const prev = S.last;
  const decel = Math.max(0, (prev - speed) / dt);
  S.last = speed;
  const mors = WT.rijdMetLading(rig, { decel, lat: 0, speed }, dt);
  if (mors) zeg(w, 'mors', 'Rustig: de oogst rolt van de aanhanger.', 3, 2.5);
}

function loadPlek(w, v) {
  const bd = getBedrijf();
  const pos = S.erven.get(bd.thuis);
  return pos && dist(v.x, v.y, pos.x, pos.y) < 45 ? pos : null;
}

// --- toetsen -------------------------------------------------------------------------------------------------

// De sleutels E, G, T, X en R in de trekker en E te voet bij een werktuig. Draait voor de rest van de E-afhandeling (slot 'pre' in main.js).
export function interactBoerderijWereld(w) {
  const input = w && w.input;
  if (!input || !w.map || w.coopRole === 'client') return false;
  const p = w.player;
  const v = p.inVehicle && p.inVehicle.farm ? p.inVehicle : null;
  const e = input.wasPressed('e') || input.wasPressed('f');
  const b = getBoerderij(), bd = b.bedrijf;
  const eat = () => { input.consume('e'); input.consume('f'); };
  if (e) {
    const k = koppelKandidaat(w);
    if (k) { eat(); doeKoppel(w, k); return true; }
    const l = losKandidaat(w);
    if (l) { eat(); doeLos(w, l.rig, l.v.farm); return true; }
    if (v) {
      const rig = S.rigs.get(v.farm), imp = rig && rig.werktuig ? S.werktuigen.get(rig.werktuig) : null;
      // laden bij het erf en leveren bij de afnemer met de aanhanger
      if (rig && imp && WT.WERKTUIG[imp.type].vervoer) {
        if (rig.lading && rig.lading.kg > 0) {
          const a = afnemerPlek(w, rig.lading.gewas);
          if (a && dist(v.x, v.y, a.x, a.y) < AFLEVER_R) {
            if (Math.abs(v.speed) > 1.5) { eat(); zeg(w, 'stil', 'Sta stil om te lossen.', 2, 2.5); return true; }
            eat();
            const vracht = WT.ledig(rig);
            const r = leverLading(w, vracht, 1);
            bericht(w, `${B.GEWASSEN[r.gewas] ? B.GEWASSEN[r.gewas].afnemer : 'De afnemer'}: ${r.kg} kg afgeleverd, +€${r.betaald}.`, 6);
            return true;
          }
        } else if (b.schuur.kg > 0 && loadPlek(w, v)) {
          eat();
          const r = WT.laad(rig, b.schuur);
          if (r.ok) {
            bericht(w, `${r.kg} kg geladen. Rij naar ${B.GEWASSEN[rig.lading.gewas].afnemer}: ik zet hem op je kaart.`, 6);
            zetWaypoint(w, rig.lading.gewas);
          } else zeg(w, 'laad', r.reden, 2, 3);
          return true;
        }
      }
    }
  }
  // te voet: R tankt de machine naast je bij het dieselvat of een pomp (ook die van een gast, die zelf geen toets heeft)
  if (!p.inVehicle && input.wasPressed('r')) {
    let best = null, bdist = 6;
    for (const vv of S.voertuigen.values()) {
      const mm = recFrom(bd, vv.farm);
      const d = dist(vv.x, vv.y, p.x, p.y) + (mm && M.brandstofPct(mm) < 0.98 ? 0 : 3);       // een machine die diesel nodig heeft gaat voor
      if (d < bdist && tankPlekBij(w, vv)) { bdist = d; best = vv; }
    }
    if (best) {
      input.consume('r');
      const r = tankMachine(w, best.farm, tankPlekBij(w, best).plek);
      if (r.ok) bericht(w, `${Math.round(r.liter)} liter diesel getankt: €${r.kosten}.`, 4); else zeg(w, 'tank', r.reden, 2, 3.5);
      return true;
    }
  }
  if (v) {
    const rig = S.rigs.get(v.farm), m = recFrom(bd, v.farm);
    if (!rig || !m) return false;
    const imp = rig.werktuig ? S.werktuigen.get(rig.werktuig) : null;
    const impRec = imp ? recFrom(bd, imp.uid) : null;
    if (input.wasPressed('g')) {
      input.consume('g');
      const r = WT.wisselPto(rig, m, impRec);
      if (!r.ok) zeg(w, 'pto', r.reden, 2, 3);
      else if (r.aan && !M.kanStarten(m).ok) { rig.pto = false; bericht(w, M.kanStarten(m).reden, 4); }
      else bericht(w, r.aan ? 'Aftakas aan.' : 'Aftakas uit.', 2);
      return true;
    }
    if (input.wasPressed('t')) {
      input.consume('t');
      const r = WT.wisselHef(rig, m, impRec);
      if (!r.ok) zeg(w, 'hef', r.reden, 2, 3);
      else { bericht(w, r.omlaag ? 'Hef omlaag.' : 'Hef omhoog.', 2); if (imp) { zetWerktuigPose(w, imp, r.omlaag); } }
      return true;
    }
    if (input.wasPressed('x')) {
      input.consume('x');
      if (!rig.werktuig) { zeg(w, 'los', 'Er hangt niets achter.', 2, 3); return true; }
      if (Math.abs(v.speed) > 0.6) { zeg(w, 'los', 'Sta stil om los te koppelen.', 2, 3); return true; }
      doeLos(w, rig, v.farm);
      return true;
    }
    if (input.wasPressed('r')) {
      const plek = tankPlekBij(w, v);
      if (!plek) { zeg(w, 'tank', 'Rij naar het dieselvat op je erf (bij de schuur) of naar een pomp om bij te tanken.', 3, 4); input.consume('r'); return true; }
      if (Math.abs(v.speed) > 1) { zeg(w, 'tank', 'Sta stil om te tanken.', 3, 2.5); input.consume('r'); return true; }
      input.consume('r');
      const r = tankMachine(w, v.farm, plek.plek);
      if (r.ok) bericht(w, `${Math.round(r.liter)} liter diesel getankt${plek.plek === 'pomp' ? ' bij de pomp' : ' uit je dieselvat'}: €${r.kosten}.`, 4);
      else zeg(w, 'tank', r.reden, 2, 3.5);
      return true;
    }
  }
  return false;
}

async function zetWaypoint(w, gewas) {
  const a = afnemerPlek(w, gewas);
  if (!a) return;
  try { const r = await import('./routing.js'); r.setUserWaypoint(a.x, a.y, B.GEWASSEN[gewas].afnemer); } catch (e) { /* geen kaart: dan zonder doel */ }
}

// --- de aanwijzing in beeld -----------------------------------------------------------------------------------

const pctTxt = (x) => Math.round(x * 100) + '%';

// Het wereldprompt boven je machine of werktuig (prompts.js): wat E nu doet, of de stand van de rig terwijl je rijdt.
function bepaalPrompt(w) {
  const p = w.player, bd = getBedrijf();
  const k = koppelKandidaat(w);
  if (k) {
    const naam = WT.naamVan(recFrom(bd, k.imp.uid));
    return { id: 'koppel-' + k.imp.uid, x: k.imp.x, y: k.imp.y, h: 1.9, key: 'E', label: `${naam} koppelen`, sub: p.inVehicle ? 'Staat vlak achter je: koppel het aan de trekker' : 'Hang het achter de trekker die vlakbij staat', ring: true };
  }
  const l = losKandidaat(w);
  if (l) return { id: 'los-' + l.imp.uid, x: l.imp.x, y: l.imp.y, h: 1.9, key: 'E', label: `${WT.naamVan(recFrom(bd, l.imp.uid))} losmaken`, sub: 'Zet het werktuig neer', ring: true };
  const v = p.inVehicle && p.inVehicle.farm ? p.inVehicle : null;
  if (!v) return null;
  const rig = S.rigs.get(v.farm), m = recFrom(bd, v.farm);
  if (!rig || !m) return null;
  const imp = rig.werktuig ? S.werktuigen.get(rig.werktuig) : null;
  const impRec = imp ? recFrom(bd, imp.uid) : null;
  const b = getBoerderij();
  // leveren en laden: E
  if (imp && WT.WERKTUIG[imp.type].vervoer) {
    if (rig.lading && rig.lading.kg > 0) {
      const a = afnemerPlek(w, rig.lading.gewas);
      if (a && dist(v.x, v.y, a.x, a.y) < AFLEVER_R) return { id: 'lever-' + v.farm, x: a.x, y: a.y, h: 3, key: 'E', label: 'Lading lossen', sub: `${B.GEWASSEN[rig.lading.gewas].afnemer}: ${rig.lading.kg} kg`, ring: true };
    } else if (b.schuur.kg > 0 && loadPlek(w, v)) return { id: 'laad-' + v.farm, x: v.x, y: v.y, h: 3, key: 'E', label: 'Aanhanger laden', sub: `${b.schuur.kg} kg ${B.GEWASSEN[b.schuur.gewas].naam.toLowerCase()} uit je schuur`, ring: true };
  }
  const tank = M.brandstofPct(m) < 0.9 ? tankPlekBij(w, v) : null;
  if (tank && Math.abs(v.speed) < 1.5) return { id: 'tank-' + v.farm, x: tank.x, y: tank.y, h: 1.9, key: TOETS.tank, label: 'Diesel bijtanken', sub: `${tank.plek === 'pomp' ? 'Pomp' : 'Dieselvat'}: volle tank €${M.volleTankKosten(m, tank.plek)}`, ring: true };
  const bed = WT.bedienbaar(rig, m, impRec);
  const stand = [];
  if (bed.hef) stand.push(`hef ${rig.hef} (${TOETS.hef})`);
  if (bed.pto) stand.push(`aftakas ${rig.pto ? 'aan' : 'uit'} (${TOETS.pto})`);
  if (rig.werktuig) stand.push(`${TOETS.los} los`);
  stand.push(`diesel ${pctTxt(M.brandstofPct(m))}`);
  if (m.slijtage >= 30) stand.push(`slijtage ${Math.round(m.slijtage)}%`);
  const naam = impRec ? WT.naamVan(impRec) : WT.naamVan(m);
  return { id: 'rig-' + v.farm, x: v.x, y: v.y, h: 3.6, key: bed.pto ? TOETS.pto : bed.hef ? TOETS.hef : TOETS.tank, label: naam, sub: stand.join(' · '), ring: false };
}

// Voor prompts.js: het prompt van dit beeld of null.
export function boerderijPrompt(w) {
  if (!S.prompt || !w || w.coopRole === 'client') return null;
  return S.prompt;
}

// Voor tests en de stand van de boerderij in de wereld.
export function boerderijWereldStand() {
  return { voertuigen: [...S.voertuigen.keys()], werktuigen: [...S.werktuigen.keys()], rigs: Object.fromEntries([...S.rigs].map(([k, r]) => [k, { ...r }])), erven: [...S.erven.keys()], velden: [...S.velden.keys()], werk: S.werk ? { taak: S.werk.taak, id: S.werk.id, aandeel: WT.aandeelKlaar(S.werk.werk) } : null };
}
export const _staat = () => S;

// Eén kind voor activityhub.js: init, E-toetsen (slot 'pre') en tick (fase 'late').
export const BOERDERIJ_WERELD_KIND = { id: 'boerderijwereld', init: () => resetBoerderijWereld(), slot: 'pre', interact: interactBoerderijWereld, tickPhase: 'late', tick: (dt, w) => updateBoerderijWereld(dt, w) };
