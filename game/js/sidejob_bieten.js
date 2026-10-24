// Bijbaantje: Bietenoogst (#393) voor "Akkerbouw Zonnehoek". Op een akker bij Hoogkerk eerst vier rijen rooien met de
// trekker (recht door de rij, in een vaste snelheidsband), daarna de oogst naar de bietenhoop van Suikerhal Hoogkerk brengen.
// De regels staan in bietenrules.js (puur, getest); dit is de adapter: hij zoekt een vrije akker, zet de rijen met bieten neer,
// voedt de regels met de plek langs de rij, en laat de bieten verdwijnen zodra je ze rooit. Altijd een zonnige dag.
// Bieten rooien hoort bij het boerderijsysteem (#437): dit loonwerk voor de buurman is er alleen zolang je zelf nog geen eigen
// akker hebt. Ligt die akker er eenmaal, dan oogst je bieten op Eigen boerderij en valt dit startpunt weg.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {
  init, step, result, akkerRijen, rijPositie, oogstFractie, RIJEN, RIJ_LEN, RIJ_AFSTAND, V_MIN,
} from './bietenrules.js';
import { wgsToWorld } from './rdnew.js';
import { spawnJobVehicle, vehicleSpeed } from './sidejobkit.js';
import { TRACTOR_MODEL } from './vehicle.js';
import { ankerMetWeg } from './bijbaananker.js';
import { heeftEigenAkker } from './boerderijlive.js';
import { isInWater, pointInPolygon } from './util.js';

// Suikerhal Hoogkerk: de bietenhoop. Pas bij gebruik berekend: wgsToWorld kent zijn kader pas als de wereld er is.
const fabriek = () => { const [x, y] = wgsToWorld(53.2336, 6.4977); return { x, y }; };
const BIET_STAP = 2;                            // m tussen twee bieten in een rij
const AKKER_STRALEN = [350, 500, 700, 950, 1300, 1800];

// Is dit stuk grond vrij voor een akker: droog, geen gebouw, geen weg, vlak.
function vrij(map, x, y, h0) {
  if (isInWater(map, x, y)) return false;
  if (map.buildingsNear(x, y, 3).some((b) => pointInPolygon(x, y, b.pts))) return false;
  if (map.roadsNear(x, y, 4.5).length) return false;
  return Math.abs((map.groundHeightAt(x, y, 0) || 0) - h0) < 0.9;
}

// Een akker bij de fabriek: een rechthoek van de vier rijen met wat marge, op open, vlak land. Dichtstbij eerst, met een willekeurige
// start in de hoek zodat een volgende ronde een andere akker kan krijgen.
export function vindAkker(map, bij, stralen = AKKER_STRALEN) {
  const breedte = (RIJEN - 1) * RIJ_AFSTAND + 10, lengte = RIJ_LEN + 12;
  for (const r of stralen) {
    const start = Math.random() * Math.PI * 2;
    for (let k = 0; k < 18; k++) {
      const a = start + (k / 18) * Math.PI * 2;
      const center = { x: bij.x + Math.cos(a) * r, y: bij.y + Math.sin(a) * r };
      const h0 = map.groundHeightAt(center.x, center.y, 0) || 0;
      for (const rich of [0.2, 1.77, 0.9, 2.5]) {
        const ux = Math.cos(rich), uy = Math.sin(rich);
        let ok = true;
        // dicht genoeg om een smalle sloot niet te missen: een trekker in het water is het einde van de dienst
        for (let l = -lengte / 2; ok && l <= lengte / 2; l += 4) {
          for (let b = -breedte / 2; ok && b <= breedte / 2; b += 3.5) ok = vrij(map, center.x + ux * l - uy * b, center.y + uy * l + ux * b, h0);
        }
        if (ok) return { center, angle: rich };
      }
    }
  }
  return null;
}

// De akker in 3D: een strook droge aarde per rij en de bieten (loof en wortel) om de twee meter.
function bouwAkker(rijen, map) {
  const group = new THREE.Group();
  group.name = 'bietenakker';
  const leafGeo = new THREE.ConeGeometry(0.34, 0.55, 6);
  const rootGeo = new THREE.IcosahedronGeometry(0.24, 0);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0x4a9a3c }), rijen.length * Math.floor(RIJ_LEN / BIET_STAP));
  const roots = new THREE.InstancedMesh(rootGeo, new THREE.MeshLambertMaterial({ color: 0xe8ddc2 }), leaves.count);
  const items = [];
  const m = new THREE.Matrix4();
  let n = 0;
  rijen.forEach((r, ri) => {
    const mid = { x: (r.ax + r.bx) / 2, y: (r.ay + r.by) / 2 };
    const strook = new THREE.Mesh(new THREE.PlaneGeometry(r.len, 2.6), new THREE.MeshLambertMaterial({ color: 0xa88a5a }));
    strook.rotation.set(-Math.PI / 2, 0, -Math.atan2(r.uy, r.ux));
    strook.position.set(mid.x, (map.groundHeightAt(mid.x, mid.y, 0) || 0) + 0.04, mid.y);
    group.add(strook);
    for (let i = 0; i < Math.floor(RIJ_LEN / BIET_STAP); i++) {
      const along = (i + 0.5) * BIET_STAP;
      const x = r.ax + r.ux * along, y = r.ay + r.uy * along, z = map.groundHeightAt(x, y, 0) || 0;
      m.makeTranslation(x, z + 0.5, y); leaves.setMatrixAt(n, m);
      m.makeTranslation(x, z + 0.2, y); roots.setMatrixAt(n, m);
      items.push({ ri, along, n, x, y, z, weg: false });
      n++;
    }
  });
  leaves.instanceMatrix.needsUpdate = true;
  roots.instanceMatrix.needsUpdate = true;
  group.add(leaves, roots);
  return { group, leaves, roots, items };
}

// Verberg de bieten die je gerooid hebt: tot en met de afgelegde meters van rij ri (en alle rijen ervoor).
const NUL = new THREE.Matrix4().makeScale(0, 0, 0);
function rooiWeg(a, ri, tot, volledig) {
  let veranderd = false;
  for (const it of a.items) {
    if (it.weg) continue;
    if (it.ri < ri || (it.ri === ri && (volledig || it.along <= tot))) {
      a.leaves.setMatrixAt(it.n, NUL); a.roots.setMatrixAt(it.n, NUL); it.weg = true; veranderd = true;
    }
  }
  if (veranderd) { a.leaves.instanceMatrix.needsUpdate = true; a.roots.instanceMatrix.needsUpdate = true; }
}

const MELDING = {
  tehard: 'Te hard: je rooit slordig.', scheef: 'Blijf in de rij.', bieten: 'Rustig: de bieten rollen van de kar.',
};

function ruim(c) {
  const d = c.data;
  if (d.akker) {
    c.removeMesh(d.akker.group);
    d.akker.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    d.akker = null;
  }
}

export default {
  id: 'bietenoogst',
  name: 'Loonwerk: bietenoogst',
  kicker: 'Boerderij',
  color: '#8a9a3a',
  glyph: 'suikerbieten',
  boss: 'Boer Zonnehoek',
  vehicleWord: 'de trekker',
  blurb: 'Loonwerk voor de boer: bieten rooien en naar de hoop brengen (zolang je zelf nog geen akker hebt; daarna oogst je bieten op Eigen boerderij)',
  tagline: 'Akkerbouw Zonnehoek: vier rijen, één trekker en een zonnige dag',
  intro: [
    'Akkerbouw Zonnehoek: het is bietentijd en de zon schijnt. Vier rijen op het land, één trekker met een rooier.',
    'Rij elke rij recht door, tussen twee en zes meter per seconde. Daarna de bieten rustig naar de hoop bij Suikerhal Hoogkerk.',
    'Dit is loonwerk voor de buurman. Zodra je eigen akker bij de Zonnehoek vastligt, oogst je bieten op Eigen boerderij en is dit startpunt weg.',
  ],
  sikkom: (c) => `Bietenoogst (Akkerbouw Zonnehoek): ${c.streak} oogsten zonder gemors`,

  // Alleen zolang de speler zelf nog geen akker heeft: daarna hoort de bietenoogst bij de eigen boerderij (#437).
  anchor(map) {
    if (heeftEigenAkker()) return null;
    return ankerMetWeg(map, fabriek(), true, [250, 400]);
  },

  start(c) {
    if (heeftEigenAkker()) return 'Je eigen akker ligt vast: oogst je bieten daar (Eigen boerderij).';
    const v = spawnJobVehicle(c.world, c.spot.x, c.spot.y, { kind: 'car', model: { ...TRACTOR_MODEL, color: '#3f7d3a' } });
    if (!v) return 'Geen trekker beschikbaar';
    c.vehicle = v;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data;
    ruim(c);
    const akker = vindAkker(c.world.map, c.spot);
    if (!akker) { c.skip('Er is vandaag geen akker vrij bij Hoogkerk. Straks nog eens proberen.'); return; }
    d.rijen = akkerRijen(akker.center, akker.angle);
    d.akker = bouwAkker(d.rijen, c.world.map);
    c.addMesh(d.akker.group);
    d.ronde = init(c.level);
    d.hoop = { x: c.spot.x, y: c.spot.y };
    d.prev = null;
    d.melT = 0;
    c.timeLeft = d.ronde.limit;
    c.msg(`${this.tagline}.`, 3.5);
  },

  timeout: () => 'de bietentijd is voorbij',

  update(dt, c) {
    const d = c.data, v = c.vehicle;
    if (!d.ronde || !d.akker || dt <= 0) return;
    const s = d.ronde;
    const speed = vehicleSpeed(v);
    const prev = d.prev || { speed, angle: v.angle };
    const turn = Math.abs(Math.atan2(Math.sin(v.angle - prev.angle), Math.cos(v.angle - prev.angle))) / dt;
    d.prev = { speed, angle: v.angle };
    const input = { speed, decel: Math.max(0, (prev.speed - speed) / dt), lat: speed * turn, dist: Math.hypot(d.hoop.x - v.x, d.hoop.y - v.y) };
    if (s.phase === 'rooien') {
      const rij = d.rijen[s.rij];
      const pos = rijPositie(rij, v.x, v.y);
      input.along = pos.along; input.across = pos.across;
    }
    const rijVoor = s.rij;
    for (const e of step(s, input, dt)) {
      const vaak = e.type === 'tehard' || e.type === 'scheef' || e.type === 'bieten';
      if (MELDING[e.type] && (!vaak || d.melT < c.world.time)) { c.msg(MELDING[e.type], 2.2); if (vaak) d.melT = c.world.time + 3; }
      if (e.type === 'rij') c.msg(`Rij ${e.n} van ${RIJEN} gerooid.`, 2.4);
      if (e.type === 'geoogst') c.msg(`Alles gerooid! Nu de bieten naar de hoop bij Suikerhal Hoogkerk.`, 4);
      if (e.type === 'fail') { c.fail(e.why); return; }
      if (e.type === 'done') {
        const r = result(s);
        if (r.failed) c.fail(r.text);
        else c.complete({ base: r.base, tip: r.tip, flawless: r.flawless, text: r.text });
        return;
      }
    }
    // de gerooide bieten verdwijnen: afgeronde rijen helemaal, de lopende rij tot de afgelegde meters
    rooiWeg(d.akker, Math.min(s.rij, RIJEN), s.voortgang, false);
    if (s.rij > rijVoor) rooiWeg(d.akker, s.rij, 0, false);
  },

  view(c) {
    const d = c.data;
    if (!d.ronde || !d.rijen) return {};
    const s = d.ronde;
    if (s.phase === 'rooien') {
      const rij = d.rijen[s.rij];
      const pos = rijPositie(rij, c.vehicle.x, c.vehicle.y);
      const naarBegin = pos.along < 6 || Math.abs(pos.across) > s.tol * 2;
      return {
        marker: naarBegin ? { x: rij.ax, y: rij.ay } : { x: rij.bx, y: rij.by },
        dots: d.rijen.slice(s.rij + 1).map((r) => ({ x: r.ax, y: r.ay })),
        progress: `Bietenoogst · rij ${Math.min(s.rij + 1, RIJEN)}/${RIJEN} · geoogst ${Math.round(oogstFractie(s) * 100)}%`,
        goal: { label: naarBegin ? 'Naar het begin van de rij' : 'Rooi de rij tot het eind', desc: `Rij recht door met ${V_MIN} tot ${Math.floor(s.vMax)} meter per seconde` },
      };
    }
    return {
      marker: { x: d.hoop.x, y: d.hoop.y },
      progress: `Bietenoogst · lading ${Math.round(s.kwaliteit)}% · geoogst ${Math.round(oogstFractie(s) * 100)}%`,
      goal: { label: 'Naar de bietenhoop', desc: 'Rustig rijden: de bieten rollen van de kar' },
    };
  },

  stop(c) { ruim(c); },
};
