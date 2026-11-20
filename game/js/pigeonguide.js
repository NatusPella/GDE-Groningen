// De spotmissie van de duif in de wereld (de bug van de playtest van 0.64.0: "je ziet alleen dingen op de map"). Tijdens de vlucht staat er
// - bij elk te spotten ding een gele lichtkolom (simkolom3d.js) en een zwevende naamplaat met afstand, ook door gebouwen heen leesbaar;
// - boven het gebouw zelf zijn naam ("Het Groninger Museum");
// - bovenin een doelkaart met "Gespot 2 van 6", het dichtstbijzijnde doel, afstand en richting, en een balk terwijl je erboven hangt;
// - een pijl aan de rand van het scherm naar dat doel (met afstand en richtingswoord: niet alleen kleur);
// - bij de eerste vlucht een korte uitleg met toetsplaatjes (keycap.js);
// - per gespot ding een ring rond de duif, een flits van de kolom en een belletje.
// De logica staat in pigeonguidelogic.js (puur). Samen spelen: de spotmissie is van wie het spel opende (de duif is van de eigenaar, #525);
// de gast ziet de duif vliegen maar heeft deze kolommen en kaart niet.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, getCamera } from './scene3d.js';
import { maakSimKolom, KOLOM_HOOGTE } from './simkolom3d.js';
import { pushAudioEvent } from './pedgeom.js';
import { glyphHtml } from './keycap.js';
import { reducedMotion } from './motion.js';
import { guideModel, edgeIndicator, distText, GUIDE_INTRO } from './pigeonguidelogic.js';

const COLUMN_SCALE = 8; // 9 m x 8: de kolom reikt tot 72 m, ruim boven de vlieghoogte
const LABEL_H = 26;
const PLACE_H = 78;
const PLAAT_W = 640, PLAAT_H = 144;
const INTRO_S = 14;
const FX_S = 1.3;

let G = null;
let introSeen = false;
let dom = null;

// Kleuren uit de tokens van het ontwerpsysteem (ds-tokens.css), ook op het canvas en in three: geen losse hex.
const tok = (naam, terug) => (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue(naam).trim()) || terug;
const kleurGeel = () => new THREE.Color(tok('--ds-c-geel', 'gold'));

const CSS = `
#pigeon-guide { position: fixed; inset: 0; pointer-events: none; z-index: 6; zoom: var(--ui, 1); font-family: var(--ds-font-zeef-tekst, Arial, sans-serif); color: var(--ds-c-ink-inkt, #1d1b17); }
#pigeon-guide[hidden] { display: none; }
#pigeon-guide .pg-card { position: absolute; top: 204px; left: 50%; transform: translateX(-50%); min-width: 320px; max-width: min(560px, calc(100vw / var(--ui, 1) - 32px)); padding: 8px 18px 10px; background: var(--ds-c-ink-papier, #f3ead3); border: var(--ds-lijn-zeef, 3px) solid var(--ds-c-ink-inkt, #1d1b17); border-left: 8px solid var(--ds-c-geel, #f9c80e); border-radius: 8px; box-shadow: var(--ds-schaduw-hard); text-align: center; }
#pigeon-guide .pg-card small { display: block; font-size: 12px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
#pigeon-guide .pg-card b { display: block; font-family: var(--ds-font-zeef-kop, Arial, sans-serif); font-size: 28px; font-weight: 800; line-height: 1.1; }
#pigeon-guide .pg-card i { display: block; font-style: normal; font-size: 16px; font-weight: 700; margin-top: 2px; }
#pigeon-guide .pg-hold { height: 10px; margin-top: 6px; border: 2px solid var(--ds-c-ink-inkt, #1d1b17); border-radius: 6px; background: var(--ds-c-wit, #fff); overflow: hidden; }
#pigeon-guide .pg-hold[hidden] { display: none; }
#pigeon-guide .pg-hold u { display: block; height: 100%; width: 100%; background: var(--ds-c-geel, #f9c80e); transform-origin: left; transform: scaleX(0); text-decoration: none; }
#pigeon-guide .pg-arrow { position: absolute; left: 50%; top: 50%; width: 120px; margin: -34px 0 0 -60px; text-align: center; }
#pigeon-guide .pg-arrow[hidden] { display: none; }
#pigeon-guide .pg-arrow svg { display: block; width: 52px; height: 52px; margin: 0 auto; filter: drop-shadow(2px 2px 0 var(--ds-c-ink-inkt, #1d1b17)); }
#pigeon-guide .pg-arrow svg path { fill: var(--ds-c-geel, #f9c80e); stroke: var(--ds-c-ink-inkt, #1d1b17); stroke-width: 2.5; stroke-linejoin: round; }
#pigeon-guide .pg-arrow span { display: inline-block; margin-top: 2px; padding: 1px 8px; font-size: 15px; font-weight: 800; background: var(--ds-c-ink-papier, #f3ead3); border: 2px solid var(--ds-c-ink-inkt, #1d1b17); border-radius: 6px; white-space: nowrap; }
#pigeon-guide .pg-intro { position: absolute; top: 330px; left: 50%; transform: translateX(-50%); max-width: min(520px, calc(100vw / var(--ui, 1) - 32px)); padding: 10px 18px 12px; background: var(--ds-c-ink-papier, #f3ead3); border: var(--ds-lijn-zeef, 3px) solid var(--ds-c-ink-inkt, #1d1b17); border-radius: 8px; box-shadow: var(--ds-schaduw-hard); text-align: center; }
#pigeon-guide .pg-intro[hidden] { display: none; }
#pigeon-guide .pg-intro b { display: block; font-family: var(--ds-font-zeef-kop, Arial, sans-serif); font-size: 20px; font-weight: 800; }
#pigeon-guide .pg-intro p { margin: 4px 0 8px; font-size: 16px; font-weight: 600; line-height: 1.3; }
#pigeon-guide .pg-keys { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 16px; font-size: 14px; font-weight: 700; }
#pigeon-guide .pg-keys span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
`;

function initDom() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'pigeon-guide';
  root.hidden = true;
  root.innerHTML = `
    <div class="pg-card" role="status"><small>Spotopdracht</small><b data-prog></b><i data-line></i><div class="pg-hold" data-holdbox hidden><u data-hold></u></div></div>
    <div class="pg-arrow" data-arrow hidden><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L35 34 L20 27 L5 34 Z"/></svg><span data-adist></span></div>
    <div class="pg-intro" data-intro hidden><b></b><p></p><div class="pg-keys"></div></div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  dom = { root, prog: q('[data-prog]'), line: q('[data-line]'), holdBox: q('[data-holdbox]'), hold: q('[data-hold]'), arrow: q('[data-arrow]'), adist: q('[data-adist]'), intro: q('[data-intro]'), last: {} };
  const keys = dom.intro.querySelector('.pg-keys');
  dom.intro.querySelector('b').textContent = GUIDE_INTRO.title;
  dom.intro.querySelector('p').textContent = GUIDE_INTRO.goal;
  keys.innerHTML = GUIDE_INTRO.controls.map(([tok, tekst]) => `<span>${glyphHtml(tok)}${tekst}</span>`).join('');
}

function setText(key, el, text) {
  if (dom.last[key] === text) return;
  dom.last[key] = text;
  el.textContent = text;
}

// Een naamplaat als sprite: papier met inktrand, de naam en de afstand. Alleen opnieuw getekend als de tekst verandert.
function maakPlaat() {
  const c = document.createElement('canvas');
  c.width = PLAAT_W; c.height = PLAAT_H;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 50;
  sprite.userData = { c, tex, key: '' };
  return sprite;
}

function tekenPlaat(sprite, { label, dist, spotted, nearest, place }) {
  const key = `${label}|${dist}|${spotted ? 1 : 0}|${nearest ? 1 : 0}|${place ? 1 : 0}`;
  if (sprite.userData.key === key) return;
  sprite.userData.key = key;
  const { c, tex } = sprite.userData;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  const inkt = tok('--ds-c-ink-inkt', 'black'), papier = tok('--ds-c-ink-papier', 'white'), geel = tok('--ds-c-geel', 'gold');
  g.fillStyle = place ? inkt : spotted ? tok('--ds-c-sel-vlak', 'lightgray') : papier;
  g.strokeStyle = nearest ? geel : inkt;
  g.lineWidth = nearest ? 14 : 8;
  g.beginPath(); g.roundRect(10, 10, c.width - 20, c.height - 20, 18); g.fill(); g.stroke();
  if (nearest) { g.strokeStyle = inkt; g.lineWidth = 4; g.beginPath(); g.roundRect(4, 4, c.width - 8, c.height - 8, 22); g.stroke(); }
  g.fillStyle = place ? papier : inkt;
  g.textBaseline = 'middle';
  g.font = '800 40px Arial, sans-serif';
  let tekst = label;
  while (g.measureText(tekst).width > c.width - (spotted ? 150 : 60) && tekst.length > 4) tekst = tekst.slice(0, -2);
  if (tekst !== label) tekst += '…';
  g.textAlign = 'left';
  const x0 = spotted ? 104 : 32;
  g.fillText(tekst, x0, 50);
  g.font = '700 36px Arial, sans-serif';
  g.fillText(spotted ? 'Gespot' : distText(dist), x0, 100);
  if (spotted) {
    // een vinkje, zodat gespot niet alleen aan een kleur te zien is
    g.strokeStyle = tok('--ds-c-ink-bord', 'green'); g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(36, 74); g.lineTo(58, 98); g.lineTo(88, 48); g.stroke();
  }
  tex.needsUpdate = true;
}

const ringGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);

function build(world, o) {
  const scene = getScene();
  const group = new THREE.Group();
  group.name = 'pigeon-guide';
  const items = [];
  const map = world.map;
  const ground = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  if (o.world3d) {
    o.targets.forEach((t, k) => {
      if (!t) { items[k] = null; return; }
      const gr = ground(t.x, t.y);
      const col = maakSimKolom('spotkolom');
      col.scale.set(2.5, COLUMN_SCALE, 2.5);
      col.position.set(t.x, gr + (KOLOM_HOOGTE * COLUMN_SCALE) / 2, t.y);
      col.visible = true;
      const plaat = maakPlaat();
      plaat.position.set(t.x, gr + LABEL_H, t.y);
      // de zone waarin de duif moet hangen, op de grond
      const zone = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: kleurGeel(), transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
      zone.scale.setScalar(t.r || o.radius);
      zone.position.set(t.x, gr + 0.4, t.y);
      group.add(col, plaat, zone);
      items[k] = { col, plaat, zone, gr, spotted: false };
    });
  }
  if (o.place) {
    const plaat = maakPlaat();
    const gr = ground(o.place.x, o.place.y);
    plaat.position.set(o.place.x, gr + PLACE_H, o.place.y);
    group.add(plaat);
    items.place = { plaat, label: o.place.label || 'Doel' };
  }
  scene.add(group);
  return { group, items, fx: [], t: 0, introT: 0, seen: new Set() };
}

function dispose() {
  if (!G) return;
  G.group.parent && G.group.parent.remove(G.group);
  G.group.traverse((m) => {
    if (m.isSprite) { m.material.map.dispose(); m.material.dispose(); } else if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); }
  });
  G = null;
}

export function clearPigeonGuide() {
  dispose();
  if (dom) { dom.root.hidden = true; dom.last = {}; }
}

// Een gespot ding: een ring rond de duif, een flits van de kolom en een belletje.
function spotFx(world, it, flight) {
  if (it) it.flash = FX_S;
  if (!reducedMotion() && G) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: kleurGeel(), transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(flight.x, flight.z, flight.y);
    m.renderOrder = 49;
    G.group.add(m);
    G.fx.push({ m, t: 0 });
  }
  pushAudioEvent(world, { kind: 'notify', x: flight.x, y: flight.y, strength: 0.8 });
}

const _v = new THREE.Vector3();

// Elk frame tijdens een spotstage. o: { targets, spotted, holds, spotTime, radius, place, world3d }; flight: getPigeonFlight().
// Doelen die in de wereld al een eigen teken hebben (de knopen van de vlag) zetten world3d uit: dan komen alleen kaart en pijl.
export function tickPigeonGuide(dt, world, o, flight) {
  if (!dom) initDom();
  if (!G) G = build(world, o);
  G.t += dt;
  const model = guideModel({ targets: o.targets, spotted: o.spotted, holds: o.holds, spotTime: o.spotTime, flight, radius: o.radius });
  const calm = reducedMotion();

  for (const it of model.items) {
    const w = G.items[it.k];
    if (it.spotted && !G.seen.has(it.k)) { G.seen.add(it.k); if (w) { w.spotted = true; w.zone.visible = false; } spotFx(world, w, flight); }
    if (!w) continue;
    const d3 = Math.hypot(it.dist, flight.z - (w.gr + LABEL_H));
    const breed = Math.min(78, Math.max(9, d3 * 0.3));
    w.plaat.scale.set(breed, breed * (PLAAT_H / PLAAT_W), 1);
    tekenPlaat(w.plaat, { label: it.label, dist: Math.round(it.dist / (it.dist < 100 ? 5 : 10)) * (it.dist < 100 ? 5 : 10), spotted: it.spotted, nearest: it.nearest });
    w.plaat.material.opacity = it.spotted ? 0.75 : 1;
    if (w.flash > 0) {
      w.flash -= dt;
      w.col.material.opacity = 0.22 + 0.5 * Math.max(0, w.flash / FX_S);
      if (w.flash <= 0) w.col.visible = false;
    } else if (!w.spotted) {
      w.col.material.opacity = it.nearest ? (calm ? 0.34 : 0.3 + 0.08 * Math.sin(G.t * 2.4)) : 0.2;
    }
  }
  if (G.items.place) {
    const pl = G.items.place;
    const d = Math.hypot(o.place.x - flight.x, o.place.y - flight.y);
    const breed = Math.min(90, Math.max(12, d * 0.3));
    pl.plaat.scale.set(breed, breed * (PLAAT_H / PLAAT_W), 1);
    tekenPlaat(pl.plaat, { label: pl.label, dist: Math.round(d / 10) * 10, place: true });
  }
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    f.t += dt;
    const k = f.t / FX_S;
    if (k >= 1) { G.group.remove(f.m); f.m.material.dispose(); G.fx.splice(i, 1); continue; }
    f.m.scale.setScalar(2 + k * 26);
    f.m.material.opacity = 0.9 * (1 - k);
  }

  // de doelkaart
  dom.root.hidden = false;
  setText('prog', dom.prog, model.progress);
  setText('line', dom.line, model.line);
  const n = model.nearest;
  const holdOn = !!n && n.hold > 0;
  dom.holdBox.hidden = !holdOn;
  if (holdOn) dom.hold.style.transform = `scaleX(${n.hold.toFixed(3)})`;

  // de pijl naar het dichtstbijzijnde doel
  if (n) {
    const cam = getCamera();
    const w = G.items[n.k];
    const tz = o.targets[n.k] && o.targets[n.k].z;
    _v.set(n.x, Number.isFinite(tz) ? tz : (w ? w.gr : 0) + LABEL_H, n.y);
    let behind = false;
    if (cam) {
      cam.updateMatrixWorld();
      behind = _v.clone().applyMatrix4(cam.matrixWorldInverse).z > 0;
      _v.project(cam);
    }
    const e = edgeIndicator(_v.x, _v.y, behind);
    dom.arrow.hidden = false;
    // aan de rand: de pijl wijst naar het doel; in beeld: de pijl boven het doel wijst omlaag
    dom.arrow.style.left = `${(50 + e.x * 50).toFixed(2)}%`;
    dom.arrow.style.top = `calc(${(50 - e.y * 50).toFixed(2)}% ${e.onScreen ? '- 70px' : '+ 0px'})`;
    dom.arrow.firstElementChild.style.transform = `rotate(${(e.angle * 180 / Math.PI).toFixed(1)}deg)`;
    setText('adist', dom.adist, `${n.label} ${distText(n.dist)}`);
  } else dom.arrow.hidden = true;

  // de uitleg van de eerste vlucht
  if (!introSeen) {
    G.introT += dt;
    dom.intro.hidden = false;
    if (G.introT > INTRO_S || model.done > 0) { introSeen = true; dom.intro.hidden = true; }
  } else dom.intro.hidden = true;
}
