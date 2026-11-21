// De spotmissie van de duif in de wereld (de bug van de playtest van 0.64.0: "je ziet alleen dingen op de map"). Tijdens de vlucht staat er
// - bij elk te spotten ding een gele lichtkolom (simkolom3d.js) en een zwevende naamplaat met afstand, ook door gebouwen heen leesbaar;
// - boven het gebouw zelf zijn naam ("Het Groninger Museum");
// - bovenin een doelkaart met "Gespot 2 van 6", het dichtstbijzijnde doel, afstand en richting, en een balk terwijl je erboven hangt;
// - een pijl aan de rand van het scherm naar dat doel (met afstand en richtingswoord: niet alleen kleur);
// - de toetsen staan maar op één plek: de balk onderaan (pigeonmode.js); de uitlegkaart "Je bent de duif" is vervallen (#1053);
// - per gespot ding een ring rond de duif, een flits van de kolom en een belletje.
// De logica staat in pigeonguidelogic.js (puur). Samen spelen: de spotmissie is van wie het spel opende (de duif is van de eigenaar, #525);
// de gast ziet de duif vliegen maar heeft deze kolommen en kaart niet.
import { stapel, stapelRuimte, duivenKaarten, duivenZones, pijlPlek, plaatSelectie, STAPEL_TOP } from './hudstapel.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, getCamera } from './scene3d.js';
import { maakSimKolom, KOLOM_HOOGTE } from './simkolom3d.js';
import { pushAudioEvent } from './pedgeom.js';
import { reducedMotion } from './motion.js';
import { guideModel, edgeIndicator, distText } from './pigeonguidelogic.js';

const COLUMN_SCALE = 8; // 9 m x 8: de kolom reikt tot 72 m, ruim boven de vlieghoogte
const LABEL_H = 26;
const PLACE_H = 78;
const PLAAT_W = 640, PLAAT_H = 144;
const FX_S = 1.3;

let G = null;
let dom = null;

// Kleuren uit de tokens van het ontwerpsysteem (ds-tokens.css), ook op het canvas en in three: geen losse hex.
const tok = (naam, terug) => (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue(naam).trim()) || terug;
const kleurGeel = () => new THREE.Color(tok('--ds-c-geel', 'gold'));

const CSS = `
#pigeon-guide { position: fixed; inset: 0; pointer-events: none; z-index: 6; zoom: var(--ui, 1); font-family: var(--ds-font-zeef-tekst); color: var(--ds-c-ink-inkt, #1d1b17); }
#pigeon-guide[hidden] { display: none; }
#pigeon-guide .pg-stack { position: absolute; top: 204px; left: 50%; width: 480px; max-width: calc(100vw / var(--ui, 1) - 32px); transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; }
#pigeon-guide .pg-card { box-sizing: border-box; width: 100%; min-width: 0; padding: 8px 18px 10px; background: var(--ds-c-ink-papier, #f3ead3); border: var(--ds-lijn-zeef, 3px) solid var(--ds-c-ink-inkt, #1d1b17); border-left: 8px solid var(--ds-c-geel, #f9c80e); border-radius: 8px; box-shadow: var(--ds-schaduw-hard); text-align: center; }
#pigeon-guide .pg-card small { display: block; font-size: 13px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
#pigeon-guide .pg-card b { display: block; font-family: var(--ds-font-zeef-kop); font-size: 28px; font-weight: 800; line-height: 1.1; }
#pigeon-guide .pg-card i { display: block; font-style: normal; font-size: 16px; font-weight: 700; margin-top: 2px; }
#pigeon-guide .pg-hold { height: 10px; margin-top: 6px; border: 2px solid var(--ds-c-ink-inkt, #1d1b17); border-radius: 6px; background: var(--ds-c-wit, #fff); overflow: hidden; }
#pigeon-guide .pg-hold[hidden] { display: none; }
#pigeon-guide .pg-hold u { display: block; height: 100%; width: 100%; background: var(--ds-c-geel, #f9c80e); transform-origin: left; transform: scaleX(0); text-decoration: none; }
#pigeon-guide .pg-arrow { position: absolute; left: 50%; top: 50%; width: 240px; margin: -50px 0 0 -120px; text-align: center; }   /* left/top komen uit pijlPlek (hudstapel.js): altijd binnen de vrije band */
#pigeon-guide .pg-arrow[hidden] { display: none; }
#pigeon-guide .pg-arrow svg { display: block; width: 52px; height: 52px; margin: 0 auto; filter: drop-shadow(2px 2px 0 var(--ds-c-ink-inkt, #1d1b17)); }
#pigeon-guide .pg-arrow svg path { fill: var(--ds-c-geel, #f9c80e); stroke: var(--ds-c-ink-inkt, #1d1b17); stroke-width: 2.5; stroke-linejoin: round; }
#pigeon-guide .pg-arrow span { display: inline-block; max-width: 240px; box-sizing: border-box; white-space: normal; margin-top: 2px; padding: 1px 8px; font-size: 15px; font-weight: 800; background: var(--ds-c-ink-papier, #f3ead3); border: 2px solid var(--ds-c-ink-inkt, #1d1b17); border-radius: 6px; }
`;

function initDom() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = document.createElement('div');
  root.id = 'pigeon-guide';
  root.hidden = true;
  root.innerHTML = `
    <div class="pg-stack"><div class="pg-card" role="status"><small>Spotopdracht</small><b data-prog></b><i data-line></i><div class="pg-hold" data-holdbox hidden><u data-hold></u></div></div>
    </div>
    <div class="pg-arrow" data-arrow hidden><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L35 34 L20 27 L5 34 Z"/></svg><span data-adist></span></div>`;
  document.body.appendChild(root);
  const q = (s) => root.querySelector(s);
  dom = { root, stack: q('.pg-stack'), prog: q('[data-prog]'), line: q('[data-line]'), holdBox: q('[data-holdbox]'), hold: q('[data-hold]'), arrow: q('[data-arrow]'), adist: q('[data-adist]'), last: {} };
}

// De onderkant (HUD-px) van de zichtbare doel- en routekaart van de gewone HUD bovenin het midden; 0 als er geen zijn.
function kaartenOnder(ui) {
  let onder = 0;
  if (typeof document === 'undefined') return onder;
  const mid = (typeof innerWidth === 'number' ? innerWidth : 1280) / 2;
  for (const el of document.querySelectorAll('#hud .hud-mission, #hud .hud-zone-b, #hud .hud-gps, #hud .hud-route')) {
    const r = el.getBoundingClientRect();
    // alleen wat bovenin het midden staat (niet de kolommen links en rechts)
    if (r.height > 0 && r.width > 0 && r.top < 300 * ui && r.left < mid && r.right > mid) onder = Math.max(onder, r.bottom / ui);
  }
  return onder;
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
  return { group, items, fx: [], t: 0, seen: new Set() };
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

const _v = new THREE.Vector3(), _r = new THREE.Vector3(), _w = new THREE.Vector3();

// De naamplaat als rechthoek in HUD-px (midden, breedte, hoogte), of null als hij achter de camera staat.
function plaatRechthoek(sprite, cam, vw, vh) {
  if (!cam) return null;
  cam.updateMatrixWorld();
  _w.copy(sprite.position);
  if (_w.clone().applyMatrix4(cam.matrixWorldInverse).z > 0) return null;
  _r.setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(sprite.scale.x / 2).add(sprite.position).project(cam);
  _w.project(cam);
  const w = Math.abs(_r.x - _w.x) * vw;
  return { x: (_w.x + 1) / 2 * vw, y: (1 - _w.y) / 2 * vh, w, h: w * (PLAAT_H / PLAAT_W) };
}

// Elk frame tijdens een spotstage. o: { targets, spotted, holds, spotTime, radius, place, world3d }; flight: getPigeonFlight().
// Doelen die in de wereld al een eigen teken hebben (de knopen van de vlag) zetten world3d uit: dan komen alleen kaart en pijl.
export function tickPigeonGuide(dt, world, o, flight) {
  if (!dom) initDom();
  if (!G) G = build(world, o);
  G.t += dt;
  const model = guideModel({ targets: o.targets, spotted: o.spotted, holds: o.holds, spotTime: o.spotTime, flight, radius: o.radius });
  const calm = reducedMotion();

  const platen = [];
  for (const it of model.items) {
    const w = G.items[it.k];
    if (it.spotted && !G.seen.has(it.k)) { G.seen.add(it.k); if (w) { w.spotted = true; w.zone.visible = false; } spotFx(world, w, flight); }
    if (!w) continue;
    const d3 = Math.hypot(it.dist, flight.z - (w.gr + LABEL_H));
    const breed = Math.min(78, Math.max(9, d3 * 0.3)) * (it.nearest ? 1 : it.spotted ? 0.4 : 0.55);   // #1053: alleen het dichtstbijzijnde doel groot
    w.plaat.scale.set(breed, breed * (PLAAT_H / PLAAT_W), 1);
    platen.push({ id: 'k' + it.k, sprite: w.plaat, prio: it.nearest ? 0 : it.spotted ? 2000 + it.dist : 1 + it.dist });
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
    pl.plaat.scale.set(breed * 0.8, breed * 0.8 * (PLAAT_H / PLAAT_W), 1);
    tekenPlaat(pl.plaat, { label: pl.label, dist: Math.round(d / 10) * 10, place: true });
    platen.push({ id: 'plek', sprite: pl.plaat, prio: 0.5 });
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

  // één stapel (hudstapel.js): opdracht (en later hoogtekaart) onder elkaar; krap = compact, daarna weg. De toetsen staan alleen in de balk onderaan.
  const ui = parseFloat(tok('--ui', '1')) || 1;
  const vw = (typeof innerWidth === 'number' ? innerWidth : 1280) / ui, vh = (typeof innerHeight === 'number' ? innerHeight : 720) / ui;
  // de stapel begint onder de doel- en routekaart van de gewone HUD, ook als die hoger zijn (op 1280x720 slaat de doelregel om)
  const top = Math.max(STAPEL_TOP, Math.ceil(kaartenOnder(ui) + 8));
  dom.stack.style.top = `${top}px`;
  const stap = stapel(duivenKaarten({ introActief: false, holdActief: holdOn }), { top, ruimte: stapelRuimte(vh, top) });
  const { zones, pijl } = duivenZones(vw, vh, stap.onder, top);

  // de pijl naar het dichtstbijzijnde doel, binnen de vrije band (nooit over paneel, stapel, kaarten of toetsbalk)
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
    const pos = pijlPlek(e, vw, vh, pijl, { w: 240, h: 100 });
    dom.arrow.style.left = `${pos.x.toFixed(1)}px`;
    dom.arrow.style.top = `${pos.y.toFixed(1)}px`;
    dom.arrow.firstElementChild.style.transform = `rotate(${(e.angle * 180 / Math.PI).toFixed(1)}deg)`;
    setText('adist', dom.adist, `${n.label} ${distText(n.dist)}`);
  } else dom.arrow.hidden = true;

  // de naamplaten: alleen wat past (niet over elkaar, niet onder een kaart); het dichtstbijzijnde doel eerst
  const cam2 = getCamera();
  const recht = platen.map((q) => { const r = plaatRechthoek(q.sprite, cam2, vw, vh); return r && { id: q.id, prio: q.prio, ...r }; }).filter(Boolean);
  const blijft = new Set(plaatSelectie(recht, vw, vh, zones, 3));
  for (const q of platen) q.sprite.visible = blijft.has(q.id);
}
