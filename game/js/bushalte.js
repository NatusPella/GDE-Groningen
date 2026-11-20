// Bushaltes in de wereld en een busdienst starten bij elke halte (#985, eigenaarsfeedback 20-11). De regels staan in
// ovmissie.js (puur, met test); dit bestand is de lijm: de haltepalen (een vaste pool van instances rond de speler, dus
// geen alles-tegelijk-lijst en geen draw call per halte), de E-prompt en het keuzemenu bij de halte, en het starten van
// de bestaande bijbaan 'lijn' (sidejob_lijn.js) op die halte. Meldt zich in main.js als kind.
//
// Samen spelen: de wereld is van wie het spel opende; de palen zijn lokaal beeld uit dezelfde lijndata. Een gast die
// hier E drukt start geen eigen dienst (de gast draait geen eigen spelstap; een gastdienst loopt alleen op verzoek, coopbijbaan.js); meerijden als
// passagier blijft meerijden.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { hoofdspeler } from './players.js';
import { getScene } from './scene3d.js';
import { getBusLines } from './vehicle.js';
import { pointAt } from './busroutes.js';
import { isShopOpen, openShopMenu, closeShopMenu } from './shopui.js';
import { shopIconUrl } from './shopicon.js';
import { busShiftBlock, startBusDienstBijHalte } from './sidejobs.js';
import { isCinematicActive } from './cinematics.js';
import { haltesNabij, dichtsteHalte, halteOpties, haltePrompt, HALTE_ZIEN_R } from './ovmissie.js';
import { accentVan } from './sidejobprofiel.js';

const POOL = 48;            // palen tegelijk in beeld
const KERB = 4.2;           // m van het hart van de weg naar de paal, rechts van de rijrichting
const VERVERS_S = 0.6;      // s tussen twee verversingen van de pool
const VERVERS_M = 25;       // m: of eerder, als de speler zo ver is gelopen
const NAAM_R = 45;          // m: binnen deze afstand staat de haltenaam boven het bord
const KLEUR = '#2e8b6a';    // de streekbus (sidejob_lijn COACH)

let paal = null, bord = null, dak = null, glas = null, naamMesh = null, naamTex = null, naamCtx = null;
let laatst = { x: 1e9, y: 1e9, t: -1e9 };
let nu = [];                // de haltes in beeld, met hun geplaatste paal
const plek = new Map();     // halte-id -> { x, y, ang } (geplaatst naast de weg)

const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);

// Naast de weg: rechts van de rijrichting van de eerste lijn, bij de lijn (data, geen echte straatnaam).
function plaats(h) {
  let p = plek.get(h.id);
  if (p) return p;
  const e = h.ingangen[0];
  const pa = pointAt(e.line, e.line.stops[e.index].s);
  const hd = pa.heading;
  const x = h.x - Math.sin(hd) * KERB, y = h.y + Math.cos(hd) * KERB;
  p = { x, y, ang: hd };
  if (plek.size > 400) plek.clear();
  plek.set(h.id, p);
  return p;
}

const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

function bouw(scene) {
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  paal = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 2.6, 0.09), mat(0x6a7078), POOL);
  bord = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.62, 0.05), mat(0xe8c93a), POOL);
  dak = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), mat(0x5a6670), POOL);
  glas = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 1.7, 0.04), new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.45 }), POOL);
  for (const m of [paal, bord, dak, glas]) { m.frustumCulled = false; m.count = 0; scene.add(m); }
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  naamCtx = c.getContext('2d');
  naamTex = new THREE.CanvasTexture(c);
  naamTex.colorSpace = THREE.SRGBColorSpace;
  naamMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: naamTex, transparent: true, depthWrite: false }));
  naamMesh.visible = false;
  scene.add(naamMesh);
}

let naamVan = '';
function zetNaam(tekst) {
  if (tekst === naamVan) return;
  naamVan = tekst;
  const g = naamCtx;
  g.clearRect(0, 0, 256, 64);
  g.fillStyle = 'rgba(14,22,18,.82)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = KLEUR;
  g.fillRect(0, 0, 10, 64);
  g.fillStyle = '#f2ede0';
  g.font = 'bold 26px sans-serif';
  g.textBaseline = 'middle';
  g.fillText(tekst, 20, 33, 226);
  naamTex.needsUpdate = true;
}

function ververs(world, p) {
  const lines = getBusLines();
  nu = lines.length ? haltesNabij(lines, p.x, p.y, HALTE_ZIEN_R).slice(0, POOL) : [];
  const z = world.map && world.map.spawnZ ? (x, y) => world.map.spawnZ(x, y) : () => 0;
  let n = 0, nd = 0, best = null, bd = NAAM_R;
  for (const h of nu) {
    const pl = plaats(h);
    const zz = z(pl.x, pl.y);
    q.setFromAxisAngle(up, -pl.ang);
    paal.setMatrixAt(n, m4.compose(pos.set(pl.x, zz + 1.3, pl.y), q, sc));
    bord.setMatrixAt(n, m4.compose(pos.set(pl.x, zz + 2.35, pl.y), q, sc));
    n++;
    // een abri bij ongeveer elke tweede halte (vast per halte), over de stoep naast de paal
    if (hash(h.id) % 2 === 0 && nd < POOL) {
      const dx = Math.cos(pl.ang), dy = Math.sin(pl.ang);
      dak.setMatrixAt(nd++, m4.compose(pos.set(pl.x - Math.sin(pl.ang) * 0.9 + dx * 1.4, zz + 2.4, pl.y + Math.cos(pl.ang) * 0.9 + dy * 1.4), q, sc));
      glas.setMatrixAt(nd - 1, m4.compose(pos.set(pl.x - Math.sin(pl.ang) * 1.45 + dx * 1.4, zz + 1.6, pl.y + Math.cos(pl.ang) * 1.45 + dy * 1.4), q, sc));
    }
    const d = Math.hypot(pl.x - p.x, pl.y - p.y);
    if (d < bd) { bd = d; best = { h, pl, z: zz }; }
  }
  paal.count = bord.count = n;
  dak.count = glas.count = nd;
  for (const m of [paal, bord, dak, glas]) m.instanceMatrix.needsUpdate = true;
  if (best) {
    zetNaam(best.h.naam);
    naamMesh.position.set(best.pl.x, best.z + 2.95, best.pl.y);
    naamMesh.rotation.y = -best.pl.ang + Math.PI / 2;
    naamMesh.visible = true;
  } else naamMesh.visible = false;
}

function tik(dt, world) {
  if (world.cinemaLean) return;
  const scene = getScene();
  if (!scene) return;
  if (!paal) bouw(scene);
  const p = hoofdspeler(world);
  laatst.t += dt;
  if (laatst.t < VERVERS_S && Math.hypot(p.x - laatst.x, p.y - laatst.y) < VERVERS_M) return;
  laatst = { x: p.x, y: p.y, t: 0 };
  ververs(world, p);
}

// De haltes voor de kaart: de dichtstbijzijnde rond de speler, niet de hele provincie. Eén keer per 150 m berekend.
const KAART_R = 2500, KAART_MAX = 70;
let kaartCache = { x: 1e9, y: 1e9, lijst: [] };
export function haltesVoorKaart(p) {
  const lines = getBusLines();
  if (!lines.length || !p) return [];
  if (Math.hypot(p.x - kaartCache.x, p.y - kaartCache.y) > 150) {
    const lijst = haltesNabij(lines, p.x, p.y, KAART_R);
    lijst.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    kaartCache = { x: p.x, y: p.y, lijst: lijst.slice(0, KAART_MAX) };
  }
  return kaartCache.lijst;
}

// De halte waar de speler te voet bij staat, of null.
function halteBijSpeler(world) {
  if (world.coopRole === 'client') return null; // een gast draait de wereld niet: de halte is van wie het spel opende
  const p = hoofdspeler(world);
  if (p.inVehicle || world.pigeonMode || world.trainDriving || p.swimming || p.water) return null;
  const lines = getBusLines();
  if (!lines.length) return null;
  return dichtsteHalte(lines, p.x, p.y, 9);
}

export function bushaltePrompt(world) {
  const h = halteBijSpeler(world);
  if (!h) return null;
  const pr = haltePrompt(h, busShiftBlock(world));
  if (pr) { const pl = plaats(h); pr.x = pl.x; pr.y = pl.y; }
  return pr;
}

function menuVoor(world, h) {
  const opties = halteOpties(h);
  return {
    type: 'station', icon: shopIconUrl('station', 92), color: accentVan('lijn') || KLEUR,
    name: `Halte ${h.naam}`,
    tagline: 'Pak een bus die hier niet komt, of ga zelf achter het stuur.',
    sections() {
      return [{
        title: 'Een busdienst rijden',
        note: 'Een bus staat bij de halte klaar. Je rijdt de lijn halte na halte: halteren, de deuren met O, op de tijd wachten, niet te vroeg weg. Betaald per rit.',
        items: opties.map((o) => ({
          id: 'bus-' + o.key, label: o.tekst,
          desc: `Eerst ${o.volgende} · nog ${o.haltes} halte${o.haltes === 1 ? '' : 's'} tot de eindhalte`,
          cols: [`${o.haltes} haltes`], verb: 'Rijden ·', price: 0, swatch: [KLEUR],
          buy() { closeShopMenu(); startBusDienstBijHalte(world, o); return 'De bus staat klaar'; },
        })),
      }];
    },
  };
}

function interact(world) {
  const input = world.input;
  if (!input || isShopOpen() || isCinematicActive()) return;
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return;
  const h = halteBijSpeler(world);
  if (!h) return;
  const opties = halteOpties(h);
  if (!opties.length) return;
  input.consume('e');
  input.consume('f');
  const why = busShiftBlock(world);
  if (why) { world.addMessage(why, 2.8); return; }
  openShopMenu(world, menuVoor(world, h));
}

export const busHalteKind = { id: 'bushaltes', slot: 'act', tickPhase: 'world', interact, tick: tik };
