// Bijbaantje: Krantenwijk (#405). Kranten en folders bezorgen in een wijk van Grunn, op de fiets of lopend: druk E om
// de krant naar de dichtstbijzijnde brievenbus te gooien. Dichtbij en langzaam is raak; op volle snelheid over de stoep
// belandt hij op de mat of in de border. In sommige wijken lezen ze niks: dan staat bij een vijver of gracht een
// papiercontainer en mag je de hele stapel daar in gooien. Dat betaalt (met een grapje van de opdrachtgever), maar
// minder dan netjes bezorgen. Het water blijft schoon: de stapel gaat in de container, niet in het water.
// De regels (worp, loon, teksten) staan in krantenrules.js; hier staan de wijk, de route, de beelden en de ronde.
// Verzonnen kranten, folders en bedrijven.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  pick, nearestOnStreet, doorSpot, randomStreetPoint, spawnJobVehicle, pointAlongRoad, decorateVehicle, streetNameAt, afstandNaast,
} from './sidejobkit.js';
import { isInWater } from './util.js';
import * as R from './krantenrules.js';
import { hoofdspeler } from './spelersregister.js';

const BIKE = { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 7.4, accel: 4.2, brake: 6, turnRate: 3.8, color: '#2e6f9e' };
const OVERNAME_R = 45;       // m van het eerste huis: vanaf hier telt de ronde als begonnen
const ROUTE_LENGTE = 150;    // m straat per ronde
const HUIS_AFSTAND = 12;     // m tussen twee brievenbussen langs de straat (minstens 8 m uit elkaar)

const rnd = () => Math.random();

function windSnelheid(world, p = hoofdspeler(world)) {
  return p.inVehicle ? Math.abs(p.inVehicle.speed || 0) : Math.hypot(p.vx || 0, p.vy || 0);
}

function groundAt(map, x, y) {
  return map.elev && map.elev.has ? map.groundHeightAt(x, y, 0) : 0;
}

// --- beelden: de krantenrol, de brievenbus en de papiercontainer -----------------------------------------------------

function krantMesh() {
  const g = new THREE.Group();
  const rol = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 8), new THREE.MeshLambertMaterial({ color: 0xefe9d6 }));
  rol.rotation.z = Math.PI / 2;
  g.add(rol);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.05, 8), new THREE.MeshLambertMaterial({ color: 0xc8402e }));
  band.rotation.z = Math.PI / 2;
  g.add(band);
  return g;
}

function brievenbusMesh() {
  const g = new THREE.Group();
  const paal = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), new THREE.MeshLambertMaterial({ color: 0x4a4a4a }));
  paal.position.y = 0.45;
  g.add(paal);
  const bak = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.24), new THREE.MeshLambertMaterial({ color: 0xd8402e }));
  bak.position.y = 0.95;
  g.add(bak);
  return g;
}

function containerMesh() {
  const g = new THREE.Group();
  const bak = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.25, 1.1), new THREE.MeshLambertMaterial({ color: 0x2f6f4e }));
  bak.position.y = 0.625;
  g.add(bak);
  const deksel = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.1, 1.16), new THREE.MeshLambertMaterial({ color: 0x23563c }));
  deksel.position.y = 1.3;
  g.add(deksel);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.24, 1.12), new THREE.MeshLambertMaterial({ color: 0xf2ede0 }));
  band.position.y = 0.85;
  g.add(band);
  return g;
}

// --- route: de brievenbussen langs een straat -------------------------------------------------------------------------

// Om de HUIS_AFSTAND m langs een straat een brievenbus, om en om aan de ene en de andere kant, bij de gevel die er het
// dichtst bij ligt (minstens 8 m van de vorige).
function bouwHuizen(map, rp, n) {
  const pts = rp.road.pts;
  if (!pts || pts.length < 2) return [];
  let best = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    const d = Math.hypot(mx - rp.x, my - rp.y);
    if (d < bd) { bd = d; best = i; }
  }
  const huizen = [];
  for (const dir of [1, -1]) {
    huizen.length = 0;
    let kant = 1;
    for (const m of R.meetpunten(pts, best, dir, rp.x, rp.y, HUIS_AFSTAND, ROUTE_LENGTE)) {
      if (huizen.length >= n) break;
      const nx = -m.uy * kant, ny = m.ux * kant;
      kant = -kant;
      const d = doorSpot(map, m.x + nx * 7, m.y + ny * 7);
      if (!d || isInWater(map, d.x, d.y) || Math.hypot(d.x - m.x, d.y - m.y) > 16) continue;
      if (huizen.some((h) => Math.hypot(h.x - d.x, h.y - d.y) <= 8)) continue;
      huizen.push({ x: d.x, y: d.y, face: d.face, nr: 1 + huizen.length * 2 + (kant > 0 ? 0 : 1), status: null });
    }
    if (huizen.length >= 3) break;
  }
  return huizen.slice();
}

// Een route van minstens 3 brievenbussen in de buurt van het midden van de wijk.
function bouwRoute(map, wijk, n) {
  for (let poging = 0; poging < 8; poging++) {
    const rp = randomStreetPoint(map, wijk.x, wijk.y, 0, 130, { cats: ['normal', 'minor'] });
    if (!rp) continue;
    const huizen = bouwHuizen(map, rp, n);
    if (huizen.length >= 3) return { straat: rp.name, huizen };
  }
  return null;
}

// Het dichtstbijzijnde water bij het midden van de route: [x, y] of null. Een vijver, een gracht of een kanaal: een open plek bij
// de oever voor de papiercontainer staat er 3 m vanaf.
function zoekVijver(map, mx, my) {
  for (let r = 20; r <= R.WIJK_ZOEK; r += 20) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + r * 0.31, x = mx + Math.cos(a) * r, y = my + Math.sin(a) * r;
      if (!isInWater(map, x, y)) continue;
      // de oever: van het water terug naar het midden tot droog land, plus 3 m
      const ux = (mx - x) / r, uy = (my - y) / r;
      for (let s = 1; s <= 40; s += 1) {
        const bx = x + ux * s, by = y + uy * s;
        if (isInWater(map, bx, by)) continue;
        const ex = bx + ux * 3, ey = by + uy * 3;
        if (isInWater(map, ex, ey) || map.isOnBridge(ex, ey)) break;
        const [ox, oy] = map.escapeBuilding(ex, ey, 1.0);
        if (isInWater(map, ox, oy) || Math.hypot(ox - ex, oy - ey) > 0.5) break;
        return { water: { x, y }, container: { x: ox, y: oy } };
      }
    }
  }
  return null;
}

// --- de baan ---------------------------------------------------------------------------------------------------------

export default {
  id: 'krantenwijk',
  name: 'Krantenwijk',
  color: '#2e6f9e',
  glyph: 'krant',
  boss: R.BAAS,
  boardFirst: false,
  vehicleWord: 'de krantenfiets',
  blurb: 'Kranten en folders gooien in een wijk van Grunn',
  tagline: 'Mik op de brievenbus. E gooit.',
  intro: [
    `Moi! Welkom bij ${R.OPDRACHTGEVER}. Je krijgt een stapel kranten en folders voor een wijk, en een fiets als je wilt.`,
    'Druk E om de krant naar de dichtstbijzijnde brievenbus te gooien. Dichtbij en langzaam is raak. In een bocht op volle snelheid wordt het de deurmat, of de border.',
    'In sommige wijken leest niemand wat. Dan staat bij de vijver een papiercontainer. Daar mag de hele stapel in. Je wordt toch betaald, maar nette bezorgers krijgen meer.',
  ],
  sikkom: (c) => `Krantenbezorger gooit ${c.streak} wijken op rij raak, brievenbussen verbijsterd`,

  anchor(map) {
    const s = nearestOnStreet(map, 'Folkingestraat', 40, 410, 220) || nearestOnStreet(map, 'Herestraat', 267.5, 540, 220);
    return s ? doorSpot(map, s.x, s.y) || s : null;
  },

  start(c) {
    const map = c.world.map;
    const rp = map.nearestRoadPoint(c.spot.x, c.spot.y, 60, false);
    const at = rp ? pointAlongRoad(rp.road, rp, 4) : c.spot;
    // de fiets is een gemak, geen eis: lopend kan ook (alleen meer ruis bij een worp is er niet: snelheid is de spreiding)
    const v = spawnJobVehicle(c.world, at.x, at.y, { kind: 'bike', model: BIKE, angle: at.angle });
    if (v) c.vehicle = v;
    const punten = (map.meta && map.meta.neighbourhoodPoints) || [];
    if (!punten.length) return 'Geen wijken gevonden voor de ronde';
    c.data.punten = punten;
    c.data.laatsteWijken = [];
    c.data.flying = [];
    c.data.mesh = [];
    return true;
  },

  round(c) {
    const d = c.data, map = c.world.map;
    wis(c);
    d.phase = 'naarwijk';
    d.container = null;
    d.vijver = false;
    d.worpen = { bus: 0, mat: 0, gemist: 0 };
    d.lui = false;
    d.huizen = [];
    d.straat = '';
    // een wijk binnen bereik van het kantoor waar een route met minstens 3 brievenbussen ligt
    const n = R.huizenAantal(c.level, c.streak);
    let wijk = null, route = null;
    for (let poging = 0; poging < 10 && !route; poging++) {
      wijk = R.kiesWijk(d.punten, c.spot, { uitgezonderd: d.laatsteWijken.slice(-3) }) || R.kiesWijk(d.punten, c.spot, { maxAfstand: 4000, minAfstand: 0 });
      if (!wijk) break;
      route = bouwRoute(map, wijk, n);
      if (!route) d.laatsteWijken.push(wijk.name);
    }
    if (!route) { c.skip('Geen wijk om de krant te bezorgen. We proberen het zo opnieuw.'); return; }
    d.wijk = wijk;
    d.laatsteWijken.push(wijk.name);
    d.straat = route.straat;
    d.huizen = route.huizen;
    d.stapel = R.stapelGrootte(d.huizen.length);
    d.krant = pick(R.KRANTEN);
    d.folder = pick(R.FOLDERS);
    // de brievenbussen en, soms, de papiercontainer bij het water
    for (const h of d.huizen) {
      const m = brievenbusMesh();
      m.position.set(h.x, groundAt(map, h.x, h.y), h.y);
      m.rotation.y = -h.face + Math.PI / 2;
      c.addMesh(m); d.mesh.push(m);
    }
    const mx = d.huizen.reduce((s, h) => s + h.x, 0) / d.huizen.length, my = d.huizen.reduce((s, h) => s + h.y, 0) / d.huizen.length;
    const vijver = zoekVijver(map, mx, my);
    if (vijver && rnd() < 0.5) {
      d.vijver = true;
      d.container = vijver.container;
      const m = containerMesh();
      m.position.set(vijver.container.x, groundAt(map, vijver.container.x, vijver.container.y), vijver.container.y);
      m.rotation.y = Math.atan2(vijver.water.x - vijver.container.x, vijver.water.y - vijver.container.y);
      c.addMesh(m); d.mesh.push(m);
    }
    const eerste = d.huizen[0], p = c.world.player;
    c.timeLeft = Math.max(90, Math.hypot(eerste.x - p.x, eerste.y - p.y) * 1.6 / 6 + 36 * d.huizen.length);
    c.msg(`Nieuwe wijk: ${d.wijk.name}. ${d.huizen.length} brievenbussen in de ${d.straat}.`, 3.5);
  },

  needsVehicle: () => false,

  timeout(c) {
    return c.data.phase === 'naarwijk' ? 'de wijk is al bezorgd door iemand anders' : 'de stapel ligt nog in je tas. De wijk wacht op de volgende bezorger';
  },

  // E gooit: naar de dichtstbijzijnde brievenbus binnen bereik, of (in een vijverwijk) de hele stapel in de container.
  interact(c) {
    const d = c.data, p = c.world.player;
    if (!d.huizen || !d.huizen.length || d.phase === 'klaar') return false;
    const doel = nieuwsteDoel(c);
    if (doel && doel.soort === 'container') {
      gooiStapel(c);
      return true;
    }
    if (doel && doel.soort === 'huis') {
      gooiKrant(c, doel.huis, doel.d);
      return true;
    }
    // niets in bereik: alleen een berichtje als er nog een brievenbus te halen is
    const open = d.huizen.filter((h) => !h.status);
    if (open.length) {
      const dd = Math.min(...open.map((h) => Math.hypot(h.x - p.x, h.y - p.y)));
      if (dd < 60) { c.msg(pick(R.TE_VER), 1.8); return true; }
    }
    return false;
  },

  prompt(c) {
    const d = c.data, p = c.world.player;
    if (!d.huizen || d.phase === 'klaar' || !d.huizen.length) return null;
    const doel = nieuwsteDoel(c);
    if (!doel) return null;
    if (doel.soort === 'container') {
      return { id: 'krant-container', x: d.container.x, y: d.container.y, h: 2.4, key: 'E', label: 'Stapel in container', sub: 'Betaald, maar minder' };
    }
    return { id: 'krant-gooi', x: p.x, y: p.y, h: 2.2, key: 'E', label: 'Gooi de krant', sub: `brievenbus op ${Math.round(doel.d)} m` };
  },

  // Samen spelen (#452): een meespelende gast gooit een krant vanaf zijn eigen plek; de stapel en de brievenbussen zijn gedeeld.
  helperActie(c, h) {
    const d = c.data;
    if (!d.huizen || !d.huizen.length || d.phase !== 'bezorgen') return false;
    const p = { x: h.x, y: h.y, vx: 0, vy: 0 };
    const doel = nieuwsteDoel(c, p);
    if (!doel) return false;
    if (doel.soort === 'container') gooiStapel(c, p);
    else gooiKrant(c, doel.huis, doel.d, p);
    return true;
  },

  update(dt, c) {
    const { world } = c;
    const d = c.data;
    if (c.vehicle) decorateVehicle(c.vehicle, 'krant', krantTas);
    stapelBeelden(c, dt);
    if (!d.huizen || !d.huizen.length) return;
    if (d.phase === 'naarwijk') {
      const eerste = d.huizen[0];
      if (afstandNaast(world, eerste.x, eerste.y) < OVERNAME_R) { // de host of een meespelende gast
        d.phase = 'bezorgen';
        if (d.vijver) c.msg(pick(R.VIJVER_VOORAF), 6);
        else c.msg(`${d.krant} en een folder: ${d.folder}.`, 4.5);
      }
      return;
    }
    if (d.phase === 'bezorgen') {
      // alles ligt: de ronde is klaar zodra de laatste worp geland is
      const open = d.huizen.filter((h) => !h.status);
      if (!open.length && !d.flying.length) klaar(c);
    }
  },

  view(c) {
    const d = c.data;
    if (!d.huizen || !d.huizen.length) return {};
    const open = d.huizen.filter((h) => !h.status);
    const p = c.world.player;
    open.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    const gedaan = d.huizen.length - open.length;
    const dots = open.slice(1).map((h) => ({ x: h.x, y: h.y }));
    if (d.container && !d.lui) dots.push({ x: d.container.x, y: d.container.y });
    if (d.phase === 'naarwijk') {
      const h = d.huizen[0];
      return { marker: { x: h.x, y: h.y }, progress: `Naar de ${d.wijk.name}`, goal: { label: `Naar de ${d.wijk.name}`, desc: `${d.huizen.length} brievenbussen in de ${d.straat}` } };
    }
    const volgende = open[0];
    return {
      marker: volgende ? { x: volgende.x, y: volgende.y } : null,
      dots,
      progress: `${d.wijk.name} · ${gedaan}/${d.huizen.length} bezorgd · stapel ${d.stapel}`,
      goal: { label: `Bezorg de krant in de ${d.straat}`, desc: d.vijver ? 'E gooit. Of de hele stapel in de container bij het water.' : 'E gooit op de dichtstbijzijnde brievenbus' },
    };
  },

  stop(c) {
    wis(c);
  },
};

// --- hulpfuncties van de baan -----------------------------------------------------------------------------------------

function krantTas() {
  const g = new THREE.Group();
  const tas = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.5), new THREE.MeshLambertMaterial({ color: 0x2e6f9e }));
  tas.position.set(-0.66, 0.96, 0);
  g.add(tas);
  const rol = krantMesh();
  rol.position.set(-0.66, 1.22, 0);
  rol.rotation.y = Math.PI / 2;
  g.add(rol);
  return g;
}

function wis(c) {
  const d = c.data;
  for (const m of d.mesh || []) c.removeMesh(m);
  d.mesh = [];
  for (const f of d.flying || []) c.removeMesh(f.mesh);
  d.flying = [];
}

// Het dichtstbijzijnde doel binnen bereik: een brievenbus zonder krant, of de container als je er vlakbij staat.
function nieuwsteDoel(c, p = hoofdspeler(c.world)) {
  const d = c.data;
  if (d.phase !== 'bezorgen' || d.stapel <= 0) return null;
  if (d.container && !d.lui && Math.hypot(d.container.x - p.x, d.container.y - p.y) <= R.CONTAINER_R) return { soort: 'container', d: Math.hypot(d.container.x - p.x, d.container.y - p.y) };
  let best = null, bd = R.WORP_BEREIK;
  for (const h of d.huizen) {
    if (h.status) continue;
    const dd = Math.hypot(h.x - p.x, h.y - p.y);
    if (dd < bd) { bd = dd; best = h; }
  }
  return best ? { soort: 'huis', huis: best, d: bd } : null;
}

function gooiKrant(c, huis, afstand, p = hoofdspeler(c.world)) {
  const d = c.data, w = c.world;
  const sp = windSnelheid(w, p);
  const fout = R.worpFout(afstand, sp, R.ruisUit(rnd));
  const uitkomst = R.worpUitkomst(fout);
  // waar hij landt: bij de brievenbus als hij raak is, anders `fout` m ernaast, in een willekeurige richting
  const a = rnd() * Math.PI * 2;
  const land = uitkomst === 'bus' ? { x: huis.x, y: huis.y } : { x: huis.x + Math.cos(a) * Math.min(fout, 7), y: huis.y + Math.sin(a) * Math.min(fout, 7) };
  d.stapel -= 1;
  huis.status = 'onderweg';
  const mesh = krantMesh();
  const hoog = (p.inVehicle ? p.inVehicle.z || 0 : (p.gz || 0) + (p.z || 0)) + (p.inVehicle ? 1.2 : 1.35);
  c.addMesh(mesh);
  d.flying.push({ mesh, van: { x: p.x, y: p.y, z: hoog }, naar: land, t: 0, dur: 0.3 + 0.035 * afstand, huis, uitkomst, fout });
}

function gooiStapel(c, p = hoofdspeler(c.world)) {
  const d = c.data, w = c.world;
  d.lui = true;
  const mesh = krantMesh();
  mesh.scale.set(2.4, 2.4, 2.4);
  c.addMesh(mesh);
  const hoog = (p.inVehicle ? p.inVehicle.z || 0 : (p.gz || 0) + (p.z || 0)) + (p.inVehicle ? 1.2 : 1.35);
  d.flying.push({ mesh, van: { x: p.x, y: p.y, z: hoog }, naar: { x: d.container.x, y: d.container.y }, t: 0, dur: 0.5 + 0.04 * Math.hypot(d.container.x - p.x, d.container.y - p.y), stapel: true, uitkomst: 'container' });
}

// de werpen in de lucht, en wat er gebeurt als ze landen
function stapelBeelden(c, dt) {
  const d = c.data, map = c.world.map;
  for (let i = d.flying.length - 1; i >= 0; i--) {
    const f = d.flying[i];
    f.t += dt;
    const u = Math.min(1, f.t / f.dur);
    const x = f.van.x + (f.naar.x - f.van.x) * u, y = f.van.y + (f.naar.y - f.van.y) * u;
    const gr = groundAt(map, f.naar.x, f.naar.y) + (f.stapel ? 1.1 : 0.12);
    const z = f.van.z + (gr - f.van.z) * u + Math.sin(u * Math.PI) * (f.stapel ? 1.6 : 1.1);
    f.mesh.position.set(x, z, y);
    f.mesh.rotation.x += dt * 14; f.mesh.rotation.y += dt * 3;
    if (u < 1) continue;
    d.flying.splice(i, 1);
    if (f.stapel) { c.removeMesh(f.mesh); stapelInContainer(c); continue; }
    // geland: een rol blijft liggen waar hij viel (de brievenbus en de mat), tot het einde van de ronde
    f.mesh.rotation.set(0, rnd() * Math.PI, 0);
    f.mesh.position.set(f.naar.x, groundAt(map, f.naar.x, f.naar.y) + 0.07, f.naar.y);
    if (f.uitkomst === 'bus') { c.removeMesh(f.mesh); } else d.mesh.push(f.mesh);
    f.huis.status = f.uitkomst;
    d.worpen[f.uitkomst] += 1;
    c.msg(pick(f.uitkomst === 'bus' ? R.BUS_LINES : f.uitkomst === 'mat' ? R.MAT_LINES : R.MIS_LINES), 2);
  }
}

function stapelInContainer(c) {
  const d = c.data;
  const open = d.huizen.filter((h) => !h.status);
  for (const h of open) h.status = 'container';
  d.stapel = 0;
  c.msg(pick(R.VIJVER_KLAAR), 3.4);
  const { base, tip } = R.luiLoon(d.huizen.length);
  d.phase = 'klaar';
  c.complete({ base, tip, text: 'De stapel in de container.', flawless: false });
}

function klaar(c) {
  const d = c.data;
  d.phase = 'klaar';
  const res = R.rondeLoon(d.worpen);
  c.complete({ base: res.base, tip: res.tip, text: res.perfect ? 'Elke krant in de bus!' : pick(R.KLAAR_NETJES), flawless: res.schoon });
}
