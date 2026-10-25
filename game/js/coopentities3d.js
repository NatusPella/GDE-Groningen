// Samen spelen (#95): de wereld van de host bij een gast, getekend. Voertuigen dicht bij
// de spelers als vereenvoudigde blokken in de maat en kleur van het voertuig (coopworld.js
// VOERTUIG_MATEN), en het doel van de opdracht en het beginpunt van de volgende als
// wereldmarkers in de stijl van de gastheer (worldmarker3d.js, #434). Alleen three.js; de
// gegevens komen uit world.coopHost (coopnet.js) en world.coopExtra (coopextra.js). Niet in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { buildVehicleMesh, updateVehicleWheelSpin, applyFlatTire, updateIndicatorLamps, updatePoliceLamps, applyVehicleDamage, setBusRearAngle, updateBikeStaat } from './models3d_vehicles.js';
import { poseHeliRotors } from './heli3d.js';
import { uiterlijkSpec } from './coopworld.js';
import { doorsFor, ensureDoors, wantDoor } from './vehicledoors.js';
import { syncVehicleDoors } from './vehicledoors3d.js';
import { standVers, MISC_DEUREN, leesDeuren, gastDoelen } from './coopextra.js';
import { doelMarker } from './coopmissie.js';
import { buildWorldMarker3D, setWorldMarkerKind, updateWorldMarker3D } from './worldmarker3d.js';
import { WATER_Y } from './util.js';
import { surfaceLiftAt } from './waterlevels.js';
import { gladBoot, kiesEigenBoot, deiningBoot, bootBlijft } from './coopboot.js';
import { ruimMeshOp } from './coopruim.js';
import { syncZitters, clearZitters, zitterPlekken } from './coopzitten3d.js';
import { gunShotFx } from './gunfx3d.js';
import { nieuwSchot } from './coopwapen.js';

const voertuigen = new Map(); // id -> mesh
const gladStand = new Map(); // id -> het geheugen van een boot die glad beweegt (coopboot.js); blijft staan als het model opnieuw gebouwd wordt (#436)
const hornWas = new Map(); // id -> de toeter stond aan (de vorige keer)
// een voertuig weg uit de scene: een blok heeft eigen geometrie (de materialen zijn gedeeld), echte modellen delen hun geometrie
const ruimVoertuig = (scene, m) => ruimMeshOp(scene, m, { geometrie: !m.userData.vehicleId });
// De opdracht van de host (#434): het doel en het beginpunt van de volgende opdracht als wereldmarkers, in dezelfde stijl
// als de gastheer ze ziet (worldmarker3d.js). Ze gaan nooit samen: het doel gaat voor (zie `doelMarker` in coopmissie.js).
let doelBaken = null, startBaken = null, startHint = -1e9;
const MATS = {};
const mat = (c) => (MATS[c] ||= new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));

// De hoogte van de grond op (x, y); zonder kaart of tegel 0, net als de voertuigen hieronder.
const grondY = (world, x, y) => {
  try { return world.map && world.map.groundHeightAt && world.map.elev && world.map.elev.has ? world.map.groundHeightAt(x, y) : 0; } catch (e) { return 0; }
};
// Staat dit doel bij een garage of pomp? Een gast heeft dezelfde kaart als de host, dus de garages van de kaart
// (meta.garages en meta.fuel) staan ook bij hem; zo krijgt de spuitdienst van een opdracht het garageteken.
function bijGarage(world, x, y, m) {
  const meta = world.map && world.map.meta;
  if (!meta) return false;
  for (const lijst of [meta.garages, meta.fuel]) for (const g of lijst || []) if (g && Number.isFinite(g.x) && Number.isFinite(g.y) && Math.hypot(g.x - x, g.y - y) <= m) return true;
  return false;
}

// Het schot van een andere speler (#434): de gast ziet de flits bij de loop en een korte kogelstreep. De kogel zelf
// rekent de host uit; hier alleen het beeld. Per speler onthouden we de laatste aanval, zodat één schot één flits geeft.
const schotGezien = new Map(); // slot -> fx.start van de laatste flits
const schoten = []; // { x, y, z, angle, tot } van de strepen die nog lopen
const SCHOT_MAX = 16, SCHOT_S = 0.12, SCHOT_LEN = 2.6;
let schotLijn = null, schotPos = null;
function zorgSchotLijn(scene) {
  if (schotLijn) return schotLijn;
  const geo = new THREE.BufferGeometry();
  schotPos = new Float32Array(SCHOT_MAX * 6);
  const col = new Float32Array(SCHOT_MAX * 6);
  for (let i = 0; i < SCHOT_MAX; i++) { col[i * 6] = 1.8; col[i * 6 + 1] = 1.4; col[i * 6 + 2] = 0.75; } // kop warm, staart zwart (additief)
  geo.setAttribute('position', new THREE.BufferAttribute(schotPos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.frustumCulled = false; m.name = 'fx-coop-tracers';
  scene.add(m); schotLijn = m;
  return m;
}
// (ook los te testen: de gast hoeft hiervoor geen echte scene te hebben)
export function syncSchoten(world, scene, nu) {
  const kandidaten = [];
  if (world.companion) kandidaten.push([0, world.companion]);
  for (const f of Object.values(world.coopFigures || {})) if (f && Number.isInteger(f.slot)) kandidaten.push([f.slot, f]);
  const gezien = new Set();
  for (const [slot, b] of kandidaten) {
    gezien.add(slot);
    const fx = b.coopFx;
    if (!nieuwSchot(schotGezien.get(slot), fx)) continue;
    schotGezien.set(slot, fx.start);
    if (!b.coopWapen || b.coopVoertuig || b.inVehicle) continue; // geen wapen in de hand of hij zit: geen flits
    const hoogte = (b.gz || 0) + (b.z || 0) + (b.crouching ? 0.95 : 1.38);
    const a = Number.isFinite(b.angle) ? b.angle : 0;
    const x = b.x + Math.cos(a) * 0.7, y = b.y + Math.sin(a) * 0.7;
    try { gunShotFx({ x, y, z: hoogte, angle: a, weapon: b.coopWapen, owner: 'medespeler', casing: false }); } catch (e) { /* zonder flits */ }
    schoten.push({ x, y, z: hoogte - 0.13, angle: a, tot: nu + SCHOT_S });
    if (schoten.length > SCHOT_MAX) schoten.shift();
    world.coopSchotDbg = (world.coopSchotDbg || 0) + 1;
  }
  for (const s of [...schotGezien.keys()]) if (!gezien.has(s)) schotGezien.delete(s);
  for (let i = schoten.length - 1; i >= 0; i--) if (schoten[i].tot <= nu) schoten.splice(i, 1);
  if (!schoten.length && !schotLijn) return;
  const lijn = zorgSchotLijn(scene), P = schotPos;
  let n = 0;
  for (const s of schoten) {
    if (n >= SCHOT_MAX) break;
    const o = n * 6, ux = Math.cos(s.angle), uy = Math.sin(s.angle);
    const len = SCHOT_LEN * Math.max(0, (s.tot - nu) / SCHOT_S); // de streep trekt zich terug
    P[o] = s.x; P[o + 1] = s.z; P[o + 2] = s.y;
    P[o + 3] = s.x - ux * len; P[o + 4] = s.z; P[o + 5] = s.y - uy * len;
    n++;
  }
  lijn.geometry.attributes.position.needsUpdate = true;
  lijn.geometry.setDrawRange(0, n * 2);
  lijn.visible = n > 0;
}

// De snapshot kent alleen de soort, niet het model of de kleur: een gast tekent het echte model van
// die soort (zelfde bouwer als de host), met een stabiele variatie op het id. Lukt dat niet, dan het blok.
const AUTO_MODELLEN = ['hatch', 'sedan', 'wagon', 'suv', 'sport'];
const AUTO_KLEUREN = ['#9aa3ad', '#b33a3a', '#2f5f9a', '#e8e6e0', '#3d7a52', '#c9a227', '#222428'];
function echteMesh(v) {
  const h = (v.id * 2654435761) >>> 0;
  const model = { name: 'hatch', len: v.len, wid: v.wid, color: v.kleur };
  const pv = { id: v.id, model, wrecked: false };
  switch (v.soort) {
    case 'auto': model.name = AUTO_MODELLEN[h % AUTO_MODELLEN.length]; model.color = AUTO_KLEUREN[(h >>> 8) % AUTO_KLEUREN.length]; break;
    case 'bakkie': model.name = 'van'; model.color = AUTO_KLEUREN[(h >>> 8) % AUTO_KLEUREN.length]; break;
    case 'politie': pv.isPolice = true; model.name = 'wagon'; break;
    case 'bus': pv.isBus = true; model.name = 'bus'; break;
    case 'vracht': model.name = 'truck'; break;
    case 'fiets': pv.isBike = true; break;
    case 'scooter': pv.isScooter = true; break;
    case 'motor': pv.isScooter = true; model.motorbike = true; break;
    default: return null;
  }
  try { const m = buildVehicleMesh(pv); m.userData.gokSpec = pv; return m; } catch (e) { return null; } // gokSpec: voor de stoelen van de zitters (coopzitten3d.js)
}

// De voertuigmodellen en hun gegevens voor coopzitten3d.js (wie meerijdt zit op zijn stoel in dit model)
export const zoekGastVoertuig = (id) => { const m = voertuigen.get(id); return m ? { mesh: m, v: m.userData.spec || m.userData.gokSpec || null } : null; };

// Het echte model van de host (look uit de snapshot, #428): dezelfde bouwer als de host, met deuken, lampen en wielen.
let dbgT = 0;
const wacht = new Map(); // id -> tijdstip waarop we het voertuig voor het eerst zagen zonder uiterlijk
const lookSleutel = (l) => [l.model, l.fl, l.len, l.wid, l.color, l.color2, l.extra].join('|');
const dentSleutel = (l) => l.dents.map((d) => d.map((n) => n.toFixed(2)).join(',')).join(';');
function echtMeshVanLook(spec) {
  try { return buildVehicleMesh(spec); } catch (e) { return null; }
}
// Een nieuwe deuk bij een bestaand model: alleen de nieuwe klappen toepassen (de host stuurt de laatste 8, dus het venster schuift).
// false = opnieuw bouwen (iets anders veranderd of de schade is hersteld).
function pasSchadeToe(m, look) {
  const ud = m.userData, spec = ud.spec;
  if (!spec || ud.gok) return false;
  const oud = ud.dentLijst || [], nieuw = look.dents;
  const gelijk = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 0.06);
  let overlap = -1;
  for (let k = Math.min(oud.length, nieuw.length); k >= 0; k--) { // de langste staart van oud die het begin van nieuw is
    let ok = true;
    for (let i = 0; i < k; i++) if (!gelijk(oud[oud.length - k + i], nieuw[i])) { ok = false; break; }
    if (ok) { overlap = k; break; }
  }
  if (overlap < 0 || (overlap === 0 && oud.length)) return false;
  try {
    for (const d of nieuw.slice(overlap)) applyVehicleDamage(m, spec, d[0], d[1], d[2]);
    spec.dentLog = nieuw.map((d) => d.slice());
    if (spec.isBike) updateBikeStaat(m, spec); // een fiets krijgt geen deuken maar een scheef spatbord (fietsStaat)
  } catch (e) { return false; }
  ud.dentLijst = nieuw.map((d) => d.slice());
  ud.dentSleutel = dentSleutel(look);
  return true;
}
// Open deuren van de host (MISC_DEUREN): de gast vraagt precies die deuren open en laat ze met dezelfde regels (vehicledoors.js) bewegen
let deurenOpen = 0;
function zetDeuren(m, spec, dt, deuren) {
  const defs = doorsFor(spec); if (!defs.length) return;
  const mask = deuren ? deuren.get(spec.id) || 0 : 0;
  if (mask || spec.doors) {
    const st = ensureDoors(spec);
    defs.forEach((d, i) => { if (mask & (1 << i)) wantDoor(st, d.id, true, 0); else if (st.want[d.id]) wantDoor(st, d.id, false); });
  }
  syncVehicleDoors(m, spec, dt, null);
  if (spec.doors && Object.values(spec.doors.open).some((x) => x > 0.3)) deurenOpen++;
}
// De snelheid waarmee de wielen en de trappers draaien: die uit de snapshot, en meldt de host er geen (een voertuig waar hij zelf op
// rijdt, of een auto die een script verzet), dan de verplaatsing sinds het vorige beeld, zoals scene3d.js bij een stilstaande wereld
// (#434). Met teken, zodat de trappers dezelfde kant op gaan als de wielen. ud.spinX/spinY onthouden waar we hem vorige keer tekenden.
export function tekensnelheid(ud, x, z, angle, gemeld, dt) {
  const lx = ud.spinX, lz = ud.spinY;
  ud.spinX = x; ud.spinY = z;
  const v = Number(gemeld) || 0;
  if (Math.abs(v) >= 0.1 || lx == null || !(dt > 0)) return v;
  const d = ((x - lx) * Math.cos(angle || 0) + (z - lz) * Math.sin(angle || 0)) / dt;
  return Number.isFinite(d) && Math.abs(d) < 40 ? d : 0; // een sprong (teleport) is geen snelheid
}
// Wielen, sturen, richtingaanwijzers, zwaailicht, lekke band, rotor en de achterkant van een gelede bus, uit de staat van de host.
// Een model dat nog een gok is (het uiterlijk is nog niet binnen) laat al wel de wielen en de trappers draaien (#434).
function animeerVoertuig(m, spec, v, klok, dt, deuren, vast = false) {
  const ud = m.userData;
  try { updateVehicleWheelSpin(m, tekensnelheid(ud, m.position.x, m.position.z, v.angle, v.snelheid, dt), dt, v.stuur); } catch (e) { /* een onderdeel dat niet past, laat de rest gewoon staan */ }
  if (!spec) return;
  spec.indicator = v.ind; spec.flat = v.lek; spec.sirenOn = v.sirene; spec.speed = v.snelheid; spec.steer = v.stuur; spec.horn = v.toeter;
  try {
    zetDeuren(m, spec, dt, deuren);
    if (v.lek || ud.flatIdx >= 0) applyFlatTire(m, spec);
    if (v.ind || ud.indLamps) updateIndicatorLamps(m, spec, klok);
    if (spec.isPolice || spec.isAmbulance || v.sirene) updatePoliceLamps(m, klok, v.sirene, spec.id);
    if (spec.isHeli) { ud.rotorHoek = ((ud.rotorHoek || 0) + dt * 30 * v.rotor) % (Math.PI * 2); poseHeliRotors(m, ud.rotorHoek, v.rotor); }
    if (spec.isBus && ud.busSections) { // de achterkant volgt de voorkant met vertraging: sneller bij meer snelheid
      const k = Math.min(1, dt * Math.abs(v.snelheid) / Math.max(2, spec.model.len * 0.6));
      let d = v.angle - (ud.busAchter ?? v.angle); d = Math.atan2(Math.sin(d), Math.cos(d));
      ud.busAchter = (ud.busAchter ?? v.angle) + d * k;
      setBusRearAngle(m, v.angle, ud.busAchter);
    }
    if (spec.isBoat && !vast) { // een boot ligt niet stil op het water; een lange romp deint nauwelijks (coopboot.js). Niet op de boot waar de gast zelf op zit (#436)
      m.rotation.order = 'YXZ';
      const d = deiningBoot(spec.model.len, klok, spec.id);
      m.rotation.z = d.roll; m.rotation.x = d.pitch; m.position.y += d.heave;
    }
  } catch (e) { /* een onderdeel dat niet past, laat de rest gewoon staan */ }
}

function bouw(v) {
  const echt = echteMesh(v);
  if (echt) return echt;
  const g = new THREE.Group();
  const romp = new THREE.Mesh(new THREE.BoxGeometry(v.len, v.hoogte * 0.55, v.wid), mat(v.kleur));
  romp.position.y = v.hoogte * 0.45; romp.castShadow = true;
  const dak = new THREE.Mesh(new THREE.BoxGeometry(v.len * 0.5, v.hoogte * 0.4, v.wid * 0.9), mat('#cfd8dc'));
  dak.position.set(-v.len * 0.05, v.hoogte * 0.85, 0); dak.castShadow = true;
  g.add(romp, dak);
  g.userData.blok = true;
  return g;
}

export const startHintTekst = () => 'Hier begint een opdracht. Hij start zodra wie het spel opende bij de marker staat: dan kun je meedoen.';
export const hasHostEntities = () => voertuigen.size > 0 || !!doelBaken || !!startBaken || !!schotLijn;

// Elke frame (main.js), alleen op een gast.
export function syncHostEntities(world, dt = 1 / 60) {
  const scene = getScene(); if (!scene) return;
  const host = world.coopHost || { voertuigen: [], doelen: [], voetgangers: [] };
  const seen = new Set();
  const klok = performance.now() / 1000;
  const stand = world.coopExtra, md = stand && standVers(stand, world.time) ? stand.misc.get(MISC_DEUREN) : null;
  const deuren = md ? (md.kaart || (md.kaart = leesDeuren(md.data) || new Map())) : null;
  const sirenes = [];
  const eigenId = kiesEigenBoot(world.coopBoot, host.voertuigen, world.player); // de boot waar deze gast zelf op zit
  deurenOpen = 0;
  for (const v of host.voertuigen) {
    seen.add(v.id);
    let m = voertuigen.get(v.id);
    const sleutel = v.look ? lookSleutel(v.look) : '';
    if (m && v.look && (m.userData.gok || m.userData.lookSleutel !== sleutel)) { // het uiterlijk is anders dan getekend: opnieuw bouwen
      ruimVoertuig(scene, m); voertuigen.delete(v.id); m = null;
    } else if (m && v.look && m.userData.dentSleutel !== dentSleutel(v.look)) { // alleen nieuwe deuken erbij, anders opnieuw bouwen
      if (!pasSchadeToe(m, v.look)) { ruimVoertuig(scene, m); voertuigen.delete(v.id); m = null; }
    }
    if (!m) {
      const spec = v.look ? uiterlijkSpec(v.look) : null;
      if (!spec) { // het uiterlijk is nog onderweg (hoogstens een paar snapshots): even wachten, daarna een gok op het id
        const sinds = wacht.get(v.id) ?? (wacht.set(v.id, klok), klok);
        if (klok - sinds < (v.soort === 'boot' ? 0.5 : 1.2)) continue; // een boot valt eerder op: die wacht korter (#434)
      }
      m = spec ? echtMeshVanLook(spec) : null;
      if (m) { const u = m.userData; u.lookSleutel = sleutel; u.dentSleutel = dentSleutel(v.look); u.dentLijst = v.look.dents.map((d) => d.slice()); u.spec = spec; u.gok = false; }
      else { m = bouw(v); m.userData.gok = true; }
      scene.add(m); voertuigen.set(v.id, m); wacht.delete(v.id);
    }
    const gz = grondY(world, v.x, v.y);
    let y = v.hoogteZ || gz;
    const spec = m.userData.spec;
    let px = v.x, py = v.y, hoek = v.angle;
    const vast = !!(spec && spec.isBoat && eigenId != null && v.id === eigenId); // de boot waar deze gast zelf op zit
    if (spec && spec.isBoat) { // een boot beweegt glad (coopboot.js): geen sprongen en geen slingerende koers (#434)
      if (vast) { // precies waar de host hem heeft: de camera van de gast staat op de stoel uit dezelfde snapshot
        gladStand.delete(v.id);
        m.rotation.x = 0; m.rotation.z = 0; // geen deining die de pose van de host overschrijft (#436)
      } else {
        const st = gladStand.get(v.id) || (gladStand.set(v.id, {}), gladStand.get(v.id)); // per id, niet per model: een nieuwe mesh (het uiterlijk komt binnen) mag niet springen
        const g = gladBoot(st, v.x, v.y, v.angle, v.snelheid, dt, spec.model.len);
        px = g.x; py = g.y; hoek = g.angle;
      }
      let lift = 0; try { lift = world.map ? surfaceLiftAt(world.map, px, py) : 0; } catch (e) { lift = 0; } y = WATER_Y + (Number.isFinite(lift) ? lift : 0);
      m.userData.bootStaat = { x: px, y: py, hoek, snelheid: Number(v.snelheid) || 0, gezien: klok }; // voor een schip dat de snapshot verlaat
    }
    m.position.set(px, y, py); m.rotation.y = -hoek;
    if (!m.userData.blok) animeerVoertuig(m, spec, v, klok, dt, deuren, vast);
    // geluid: de toeter bij het aangaan van de vlag (met de toonhoogte van dit voertuig) en de sirene zolang hij aan staat, met de bestaande geluiden (audio.js)
    const toet = !!v.toeter;
    const hp = world.player;
    if (toet && !hornWas.get(v.id) && hp && Math.hypot(v.x - hp.x, v.y - hp.y) < 130) {
      world.coopHoornDbg = (world.coopHoornDbg || 0) + 1; // voor de testbank
      (world.audioEvents || (world.audioEvents = [])).push(spec && (spec.isBike) ? { kind: 'bell', x: v.x, y: v.y } : { kind: 'horn', x: v.x, y: v.y, low: spec ? (spec.isBoat ? 0.45 : spec.isBus ? 0.7 : spec.model && spec.model.name === 'van' ? 0.85 : spec.isHeroCar ? 0.96 : 1) : 1 });
    }
    hornWas.set(v.id, toet);
    if (v.sirene) sirenes.push({ x: v.x, y: v.y, angle: v.angle, speed: v.snelheid, sirenOn: true, isPolice: !!(spec && spec.isPolice), id: v.id });
  }
  for (const id of hornWas.keys()) if (!seen.has(id)) hornWas.delete(id);
  world.coopSirenUnits = sirenes; world.coopDeurenDbg = deurenOpen; world.coopSirenDbg = sirenes.length;
  syncSchoten(world, scene, klok); // de flits en kogelstreep van een schot van een andere speler (#434)
  // wie meerijdt, op zijn stoel in het voertuig van de host (#434): de zitter hangt in het model, dus hij rijdt vanzelf mee
  world.coopZittersDbg = syncZitters(world.coopZitters, zoekGastVoertuig, world);
  if (klok - dbgT > 1) {
    dbgT = klok;
    world.coopZittersPlek = zitterPlekken(); // plek, stoel en de plek in het voertuig zelf, voor de testbank (binnen de carrosserie)
    const o = {};
    for (const [id, m] of voertuigen) { const u = m.userData; o[id] = [u.blok ? 'blok' : u.gok ? 'gok' : 'echt', u.wheels ? +u.wheels[0].rotation.z.toFixed(2) : null, u.frontWheels ? +u.frontWheels[0].rotation.y.toFixed(2) : null, u.indLamps ? u.indLamps.filter((l) => l.visible).length : 0, u.policeLamps ? +u.policeLamps[0].material.emissiveIntensity.toFixed(1) : null, u.rotorHoek ? +u.rotorHoek.toFixed(1) : null, u.dentLijst ? u.dentLijst.length : 0]; }
    world.coopHostDbg = o;
    const pos = {}; // waar de gast ze tekent (boten en schepen: x, hoogte, y, richting), voor de testbank
    for (const [id, m] of voertuigen) if (m.userData.spec && m.userData.spec.isBoat) pos[id] = [+m.position.x.toFixed(1), +m.position.y.toFixed(2), +m.position.z.toFixed(1), +m.rotation.y.toFixed(2), +m.rotation.x.toFixed(3)];
    world.coopHostPos = pos;
  }
  for (const [id, m] of voertuigen) {
    if (seen.has(id)) continue;
    const spec = m.userData.spec, s = m.userData.bootStaat;
    // een groot schip vaart buiten de snapshot nog even op zijn laatste koers door: het is van verre te zien en zou anders
    // met een harde sprong uit beeld verdwijnen (LOD, #434). Een kleine boot gaat meteen weg.
    if (spec && spec.isBoat && s && bootBlijft(spec.model.len, klok - s.gezien, s.snelheid)) {
      if (Math.abs(s.snelheid) > 1e-3) {
        s.x += Math.cos(s.hoek) * s.snelheid * dt; s.y += Math.sin(s.hoek) * s.snelheid * dt;
        const st = gladStand.get(id); if (st) { st.x = s.x; st.y = s.y; st.a = s.hoek; } // weer in beeld: hier loopt hij verder
      }
      let lift = 0; try { lift = world.map ? surfaceLiftAt(world.map, s.x, s.y) : 0; } catch (e) { lift = 0; }
      m.position.set(s.x, WATER_Y + (Number.isFinite(lift) ? lift : 0), s.y); m.rotation.y = -s.hoek;
      continue;
    }
    ruimVoertuig(scene, m); voertuigen.delete(id);
  }
  for (const id of gladStand.keys()) if (!voertuigen.has(id)) gladStand.delete(id);
  for (const id of wacht.keys()) if (!seen.has(id)) wacht.delete(id);
  // de voetgangers (uiterlijk, lopen, praten) tekent coopextra3d.js (#428), samen met dieren, verkeerslichten en kapotte objecten
  let echt = 0; for (const m of voertuigen.values()) if (!m.userData.blok) echt++;
  world.coopHostMeshes = [echt, voertuigen.size - echt, 0, 0]; // [echte modellen, blokken], voor de testbank
  const doel = gastDoelen(world)[0]; // de doelen van de groep van deze gast (EXTRA), met de snapshot als terugval (#434)
  const dm = doelMarker(doel, (x, y, m) => bijGarage(world, x, y, m));
  if (dm) {
    if (!doelBaken) { doelBaken = buildWorldMarker3D('goal'); scene.add(doelBaken); }
    doelBaken.visible = true;
    setWorldMarkerKind(doelBaken, dm.soort); // 'goal', of 'garage' bij de spuitdienst
    doelBaken.position.set(dm.x, grondY(world, dm.x, dm.y), dm.y);
    updateWorldMarker3D(doelBaken, klok);
  } else if (doelBaken) doelBaken.visible = false;
  // het beginpunt van de volgende opdracht van wie het spel opende: dezelfde gele marker die de gastheer ziet, en pas
  // als er geen doel is (dezelfde voorrang als op de kaart en de minimap, hud_panel.js `gastStart`, #434)
  const start = !dm && host.starts && host.starts[0];
  if (start && !startBaken) {
    startBaken = buildWorldMarker3D('start');
    scene.add(startBaken);
  }
  if (startBaken) {
    startBaken.visible = !!start;
    if (start) {
      startBaken.position.set(start.x, grondY(world, start.x, start.y), start.y);
      updateWorldMarker3D(startBaken, klok);
      const p = world.player;
      if (p && Math.hypot(start.x - p.x, start.y - p.y) < 25 && world.time - startHint > 40 && world.addMessage) { startHint = world.time; world.addMessage(startHintTekst(), 5); }
    }
  }
}

export function clearHostEntities() {
  clearZitters();
  const scene = getScene();
  if (scene) for (const m of voertuigen.values()) ruimVoertuig(scene, m);
  voertuigen.clear(); wacht.clear(); gladStand.clear();
  schoten.length = 0; schotGezien.clear();
  if (schotLijn && scene) ruimMeshOp(scene, schotLijn, { materiaal: true });
  schotLijn = null; schotPos = null;
  // de wereldmarkers delen hun glyph- en kolomtextuur met de andere markers (worldmarker3d.js): alleen uit de scene halen
  if (doelBaken && scene) scene.remove(doelBaken);
  doelBaken = null;
  if (startBaken && scene) scene.remove(startBaken);
  startBaken = null;
}
