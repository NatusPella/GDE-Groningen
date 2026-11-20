// De vaarroutelijn in de wereld: één mesh op het wateroppervlak (zeefdruk: donkere rand,
// routekleur, crème chevrons in vaarrichting). Eén vaste buffergeometrie, geen allocatie per
// frame; de regels (bemonstering, uitfade, hoogte) staan pure in ../vaarlijn.js.
// Een eigen module naast routeribbon3d.js (het lint op land); die roept hem alleen aan.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markerColors } from '../a11y.js';
import { reducedMotion } from '../motion.js';
import { waterSurfaceAt } from '../waterlevels.js';
import { waterSwellAmp } from '../water3d.js';
import { INK } from '../mapstyle.js';
import {
  VAARLIJN, vaarlijnGewenst, vaarlijnTerugval, herbemonster, terugvalPunten, maakLijnBuffers, vulLijn, lijnSleutel,
} from '../vaarlijn.js';

const OPACITY = 0.92;
const FADE_S = 0.2;           // microinteractie: erin en eruit in 200 ms
let mesh = null;
let buf = null;
let key = '';
let colorKey = '';
let fade = 0;
const texCache = new Map();
const status = { gewenst: false, bestaat: false, zichtbaar: false, terugval: false, punten: 0 };

// canvas: donkere rand, vulling in de routekleur, crème chevron (punt naar boven = vaarrichting)
function lijnTextuur(kleur) {
  let tex = texCache.get(kleur);
  if (tex) return tex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = INK.dark;
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = kleur;
  g.fillRect(8, 0, 48, 128);
  g.fillStyle = INK.cream;
  g.beginPath();
  g.moveTo(32, 18); g.lineTo(52, 50); g.lineTo(52, 70); g.lineTo(32, 38); g.lineTo(12, 70); g.lineTo(12, 50);
  g.closePath();
  g.fill();
  tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(kleur, tex);
  return tex;
}

function ensure(scene) {
  if (mesh) return;
  buf = maakLijnBuffers();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(buf.pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(buf.uv, 2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(buf.col, 4).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(new THREE.BufferAttribute(buf.idx, 1).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0, 0);
  mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16,
  }));
  mesh.name = 'vaarlijn';
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
}

export function hideVaarlijn3D() {
  if (mesh) mesh.visible = false;
  key = '';
  fade = 0;
  status.zichtbaar = false;
}

// route: de actieve route (routing.js); getAhead(m): het stuk vooruit; world.map voor de waterhoogte.
// Voor ALLE boten: wie een boot bestuurt krijgt route.mode 'boat', ook bij een doel op het water
// vanuit de kaart. Zonder vaarroute (route.noRoute): een gestippelde luchtlijn.
export function updateVaarlijn3D(dt, scene, route, getAhead, world, color) {
  const gewenst = vaarlijnGewenst(route);
  status.gewenst = gewenst;
  if (!gewenst) { if (mesh && mesh.visible && fade <= 0) hideVaarlijn3D(); else if (mesh && mesh.visible) fadeOut(dt); status.bestaat = !!mesh; return; }
  ensure(scene);
  const terugval = vaarlijnTerugval(route);
  const kleur = color || markerColors().mission;
  const sleutel = lijnSleutel(route);
  if (sleutel !== key) {
    key = sleutel;
    let ahead = getAhead(terugval ? VAARLIJN.DASH_AHEAD_M : VAARLIJN.AHEAD_M);
    let pts = null;
    if (ahead && ahead.length >= 2) {
      if (terugval) ahead = terugvalPunten(ahead[0], route.target ? [route.target.x, route.target.y] : ahead[ahead.length - 1]);
      pts = herbemonster(ahead, terugval ? 0.8 : VAARLIJN.STEP_M);
    }
    const map = world && world.map;
    const extra = 0.5 * waterSwellAmp();   // boven de golftoppen, niet erdoorheen
    const yAt = (x, y) => (map ? waterSurfaceAt(map, x, y) : -2.3) + extra;
    const p0 = route.pts[route.idx];
    const along0 = route.cum ? route.cum[route.idx] + Math.hypot(route.px - p0[0], route.py - p0[1]) : 0;
    const afgekapt = !terugval && route.remaining > VAARLIJN.AHEAD_M + 1;
    const r = pts && pts.length >= 2 ? vulLijn(buf, pts, yAt, { along0, afgekapt, dash: terugval }) : { n: 0, nIdx: 0 };
    const g = mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.uv.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.index.needsUpdate = true;
    g.setDrawRange(0, r.nIdx);
    status.punten = r.n;
  }
  if (kleur !== colorKey) { colorKey = kleur; mesh.material.map = lijnTextuur(kleur); mesh.material.needsUpdate = true; }
  mesh.visible = status.punten >= 2;
  fade = Math.min(1, fade + dt / FADE_S);
  mesh.material.opacity = OPACITY * fade * (terugval ? 0.85 : 1);
  // de chevrons schuiven in vaarrichting, behalve bij verminderde beweging ('Rustig drukwerk')
  if (!terugval && !reducedMotion()) mesh.material.map.offset.y -= dt * 0.5;
  status.bestaat = true;
  status.zichtbaar = mesh.visible;
  status.terugval = terugval;
}

function fadeOut(dt) {
  fade = Math.max(0, fade - dt / FADE_S);
  mesh.material.opacity = OPACITY * fade;
  if (fade <= 0) hideVaarlijn3D();
}

// voor de bewaker en de tests: bestaat de lijn als er een actieve vaarroute is?
export function vaarlijnStatus() { return { ...status }; }
