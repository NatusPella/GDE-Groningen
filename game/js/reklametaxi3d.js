// De reclametaxi (#404), de wereldkant: de pure regels staan in reklametaxi.js. Hier hoort het bij een taxi uit het
// verkeer: een dakbord met lopende tekstband, het chiptune-deuntje op de plek van de taxi (audio.js: afstandsdemping
// en Doppler), de megafoon als tekstballon met een kraakje, en een regel in de geluidsondertitels. Hooguit één taxi
// tegelijk. Meldt zich in main.js als kind.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { markShared } from './pixelart3d.js';
import { playReklameNoot, playReklameKraak } from './audio.js';
import { noteSound } from './soundcaptions.js';
import { isCinematicActive } from './cinematics.js';
import { REKLAME, maakReklame, stapReklame, nootenTussen, midiHz, scrollBand, bordActie } from './reklametaxi.js';

const ROOF_Y = 1.62;      // m: de onderkant van het bord boven het voertuigdek van een taxi
let st = null;
let bord = null;          // { taxi, mesh, groep, tex }
let noten = 0, kreten = 0; // geteld voor window.__reklametaxi (de bot en de beeldtest)

function bandTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#12206b';
  g.fillRect(0, 0, 1024, 64);
  g.font = 'bold 40px monospace';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffe14a';
  const tekst = REKLAME.band;
  let x = 0;
  while (x < 1024) { g.fillText(tekst, x, 34); x += g.measureText(tekst).width; }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(0.5, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function maakBord(taxi) {
  const mesh = getVehicleMesh(taxi.id);
  if (!mesh) return null;
  const tex = bandTexture();
  const groep = new THREE.Group();
  const doos = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.7), new THREE.MeshLambertMaterial({ color: 0xe8e6e0 }));
  doos.position.set(0, ROOF_Y + 0.16, 0);
  groep.add(doos);
  for (const [z, ry] of [[0.36, 0], [-0.36, Math.PI]]) {
    const vlak = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.26), new THREE.MeshBasicMaterial({ map: tex }));
    vlak.position.set(0, ROOF_Y + 0.16, z);
    vlak.rotation.y = ry;
    groep.add(vlak);
  }
  // Het dakbord hoort bij de taxi en niet bij de mesh: een opruimronde van de mesh (LOD, wrak, een nieuwe
  // deuk) disposeert de geometrie en de materialen van alles wat eraan hangt. Zonder deze vlag kwam het bord
  // er wel weer aan te hangen, maar was het al weggegooid: de taxi leek zijn lichtkrant te verliezen (#436).
  // haalBordWeg gooit ze zelf op.
  groep.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = false; o.receiveShadow = false;
    markShared(o.geometry);
    markShared(o.material);
  });
  markShared(tex);
  mesh.add(groep);
  return { taxi, mesh, groep, tex };
}

function haalBordWeg() {
  if (!bord) return;
  if (bord.groep.parent) bord.groep.parent.remove(bord.groep);
  bord.groep.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  bord.tex.dispose();
  bord = null;
}

function omroep(w, taxi, tekst) {
  const sp = w.extraSpeakers || (w.extraSpeakers = []);
  for (let i = sp.length - 1; i >= 0; i--) if (sp[i].reklameTaxi) sp.splice(i, 1);
  sp.push({ x: taxi.x, y: taxi.y, h: 2.5, follow: taxi, speechName: REKLAME.naam, speechText: tekst, speechUntil: w.time + 4.2, reklameTaxi: true });
  playReklameKraak(taxi.x, taxi.y);
  noteSound('reklametaxi');
  kreten++;
}

function tick(dt, w) {
  if (!st) {
    st = maakReklame(Math.random, w.time);
    // debug: window.__reklametaxi.nu() forceert een reclametaxi bij de eerstvolgende gelegenheid
    window.__reklametaxi = { nu: () => { st.volgende = 0; }, staat: () => ({ taxi: st.taxi ? st.taxi.id : null, bord: !!bord, noten, kreten, songT: st.songT }) };
  }
  if (w.paused || w.pigeonMode || dt <= 0) return;
  const speler = w.player;
  const ev = stapReklame(st, dt, w.time, { voertuigen: w.vehicles, speler, mag: !isCinematicActive() });
  for (const e of ev) {
    if (e.type === 'slogan') omroep(w, e.taxi, e.tekst);
    else if (e.type === 'stop') {
      haalBordWeg();
      if (w.extraSpeakers) w.extraSpeakers = w.extraSpeakers.filter((q) => !q.reklameTaxi);
    }
  }
  const taxi = st.taxi;
  if (!taxi) return;
  // Het dakbord: alleen vervangen als er een ánder, levend model voor deze taxi staat. Is de mesh even
  // weg (de wereld bouwt hem opnieuw of hij is nog niet gebouwd), dan blijft het bord staan en hangt het
  // er weer aan zodra de mesh er is: het bord is van de taxi, niet van de mesh (#436).
  const levend = getVehicleMesh(taxi.id);
  const actie = bordActie({ heeftBord: !!bord, levendMesh: !!levend, zelfdeMesh: !!bord && bord.mesh === levend, hangt: !!bord && bord.groep.parent === bord.mesh });
  if (actie === 'vervang') haalBordWeg();
  if (actie === 'vervang' || actie === 'maak') bord = maakBord(taxi);
  else if (actie === 'hang' && bord) bord.mesh.add(bord.groep);
  if (bord) bord.groep.visible = true;
  if (bord) bord.tex.offset.x = scrollBand(bord.tex.offset.x, dt);
  // het deuntje: de noten van dit beeld, op de plek van de taxi met zijn snelheid voor de Doppler
  const t0 = st.songT - dt;
  const vx = Math.cos(taxi.angle) * taxi.speed, vy = Math.sin(taxi.angle) * taxi.speed;
  for (const n of nootenTussen(Math.max(0, t0), st.songT)) {
    noten++;
    playReklameNoot(taxi.x, taxi.y, { freq: n.midi ? midiHz(n.midi) : 0, dur: n.dur * 0.9, stem: n.stem, vx, vy, delay: Math.max(0, n.t - Math.max(0, t0)) });
  }
}

export const reklameTaxiKind = { id: 'reklametaxi', tickPhase: 'world', tick };
