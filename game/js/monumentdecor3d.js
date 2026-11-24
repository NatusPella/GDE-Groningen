// De tekenlaag van de monumentaankleding (monumentdecor.js, #953): bouwt het plan één keer als de speler het gebied nadert
// (kanonnen, lindebomen, lantaarns, figuranten via missiedecor.js) en ruimt het op als hij ver weg is. 's Avonds branden de
// lantaarns warm. Elke speler bouwt het zelf uit dezelfde data: niets over het net.
import { hoofdspeler } from './players.js';
import { dayState } from './daynight.js';
import { registreerAankleding, buildMissionDressing, updateMissionDressing, disposeMissionDressing } from './missiedecor.js';
import { monumentDecorPlan, monumentDecorItems, fitMonumentDecor } from './monumentdecor.js';
import { HERITAGE_AREAS, monumentLanternOn } from './heritagearea.js';
import { setMonumentLantern } from './monumentkits3d.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { canvasTex } from './canvastex.js';

// #1203 (hertest 24-11): de vloer van het plein, klinkers in keperverband in grijs en rood, over het gras en de wegen van de kaart heen
// (heritagearea.js plein). Eén schijf, een gedeelde textuur; hij gaat mee weg met de aankleding.
let pleinTex = null;
const VOEG = '#6f6a63'; // de voeg tussen de klinkers: 3D-textuur, geen UI-kleur
function pleinTexture() {
  if (pleinTex) return pleinTex;
  pleinTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = VOEG; g.fillRect(0, 0, w, h);
    const kl = ['#8a8279', '#7d766d', '#938a7f', '#86605a', '#7a5650'];
    let k = 0;
    // keperverband: stenen van 16 x 8 px, om en om liggend en staand
    for (let y = -16; y < h + 16; y += 8) for (let x = -16; x < w + 16; x += 16) {
      const staand = ((x / 16) + (y / 8)) % 2 === 0;
      g.fillStyle = kl[Math.abs(Math.floor(k++ * 7 + (x * 3 + y) / 8)) % kl.length];
      if (staand) g.fillRect(x + 1, y + 1, 6, 14); else g.fillRect(x + 1, y + 1, 14, 6);
    }
  }, { repeat: [1, 1] });
  pleinTex.wrapS = pleinTex.wrapT = THREE.RepeatWrapping;
  return pleinTex;
}
function buildPleinFloor(area, map) {
  const p = area && area.plein;
  if (!p) return null;
  const geo = new THREE.CircleGeometry(p.radius, 56);
  geo.rotateX(-Math.PI / 2);
  // de textuur in wereldmaat: een tegel van 128 px is 2 m klinkers
  const uv = geo.getAttribute('uv'), pos = geo.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 2, pos.getZ(i) / 2);
  const mat = new THREE.MeshLambertMaterial({ map: pleinTexture(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -10 });
  const m = new THREE.Mesh(geo, mat);
  let gy = 0;
  try { gy = (map && map.groundHeightAt && map.groundHeightAt(p.at[0], p.at[1], 0)) || 0; } catch (e) { gy = 0; }
  m.position.set(p.at[0], (Number.isFinite(gy) ? gy : 0) + 0.04, p.at[1]);
  m.receiveShadow = true;
  m.name = 'monument-plein';
  return m;
}

const BUILD_R = 60;   // m voorbij de rand van het gebied waarop de aankleding verschijnt
const DROP_R = 180;   // m voorbij de rand waarop hij weer weggaat

const live = new Map(); // gebied-id -> { set }

// Het plan wordt één keer bij missiedecor aangemeld (een bestaande naam blijft staan).
const kindOf = (id) => 'monument-' + id;
const registered = new Set();
function ensureRegistered(area, map) {
  if (registered.has(area.id)) return true;
  // wacht tot de tegels van het gebied er zijn: de plekken worden op de kaart gelegd (water, gebouwen, wegen)
  try { if (!map || !map.roadsNear || !map.roadsNear(area.at[0], area.at[1], 40).length) return false; } catch (e) { return false; }
  const plan = monumentDecorPlan(area.id, fitMonumentDecor(map, monumentDecorItems(area.id)));
  if (!plan) return false;
  registreerAankleding(kindOf(area.id), plan);
  registered.add(area.id);
  return true;
}

export function updateMonumentDecor(dt, world, scene) {
  if (!world || !scene) return;
  let p = null;
  try { p = hoofdspeler(world); } catch (e) { p = null; }
  if (!p) return;
  let hour = 12;
  try { hour = dayState(world).hour; } catch (e) { /* middag */ }
  for (const area of HERITAGE_AREAS) {
    if (!area.decor) continue;
    const d = Math.hypot(p.x - area.at[0], p.y - area.at[1]);
    let e = live.get(area.id);
    if (!e && d <= area.radius + BUILD_R && ensureRegistered(area, world.map)) {
      const set = buildMissionDressing(world, kindOf(area.id), { x: area.at[0], y: area.at[1], a: 0 }, scene);
      if (set) {
        const vloer = buildPleinFloor(area, world.map);
        if (vloer) scene.add(vloer);
        live.set(area.id, e = { set, on: null, vloer });
      }
    }
    if (e && d > area.radius + DROP_R) {
      disposeMissionDressing(e.set);
      dropFloor(e);
      live.delete(area.id);
      continue;
    }
    if (e) {
      updateMissionDressing(e.set, dt, p);
      const on = monumentLanternOn(area, hour);
      if (on !== e.on) { e.on = on; setMonumentLantern(on, area.light && area.light.lantern); }
    }
  }
}

function dropFloor(e) {
  if (!e || !e.vloer) return;
  if (e.vloer.parent) e.vloer.parent.remove(e.vloer);
  e.vloer.geometry.dispose();
  e.vloer.material.dispose();
  e.vloer = null;
}

export function disposeMonumentDecor() {
  for (const e of live.values()) { disposeMissionDressing(e.set); dropFloor(e); }
  live.clear();
}

export const monumentDecorLive = () => live.size;
