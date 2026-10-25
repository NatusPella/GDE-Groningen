// Eigen boerderij (#415) op het sidejob-contract van sidejobs.js: je werkt op je eigen perceel bij Hoogkerk, taak na taak (ploegen,
// zaaien, bemesten, oogsten, afleveren). De staat van het land (boerderij.js, per speler bewaard door boerderijlive.js) bepaalt welke
// taak er nu is; werkgang.js heeft de regels; deze adapter zet het perceel neer (de rijen, de grond, de gewassen die groeien), koppelt de
// machine achter de trekker en voedt de regels met de plek langs de rij. Geld loopt via boerderijlive.js (huur, zaaigoed, verkoop met de
// loonfactor van Landbouw), niet via de bijbaanuitbetaling: een afgeronde taak is voor de bijbaan een ronde zonder loon (c.skip).
// Altijd een zonnige dag. Het perceel staat vast zodra het gevonden is (vindAkker uit sidejob_bieten.js).

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import * as B from './boerderij.js';
import { init, step, result, fractie, RIJEN, RIJ_LEN, BAND } from './werkgang.js';
import { akkerRijen, rijPositie } from './bietenrules.js';
import { vindAkker } from './sidejob_bieten.js';
import { getBoerderij, neemTaak, rondAf, leverAf, zetPerceel } from './boerderijlive.js';
import { wgsToWorld } from './rdnew.js';
import { spawnJobVehicle, vehicleSpeed } from './sidejobkit.js';
import { TRACTOR_MODEL } from './vehicle.js';
import { ankerMetWeg } from './bijbaananker.js';

const fabriek = () => { const [x, y] = wgsToWorld(53.2336, 6.4977); return { x, y }; };
const PLANT_STAP = 2;
const SOORT = { struik: [new THREE.IcosahedronGeometry(0.42, 0), 0.55], kegel: [new THREE.ConeGeometry(0.34, 0.55, 6), 0.5] };
const NUL = new THREE.Matrix4().makeScale(0, 0, 0);
const kmh = (ms) => Math.round(ms * 3.6);
const pct = (f) => `${Math.round(f * 100)}%`;

// De machine achter de trekker, laag-poly: een ploeg met scharen, een zaai- en strooimachine met een bak, een rooier met een band.
function bouwMachine(id) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  if (id === 'ploeg') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.8), mat(0x7b8085)); frame.position.set(0, 0.55, 0); g.add(frame);
    for (let k = 0; k < 3; k++) { const schaar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.9), mat(0xe2e5e8)); schaar.position.set(-0.6 + k * 0.6, 0.3, -0.7 + k * 0.5); schaar.rotation.y = 0.5; g.add(schaar); }
  } else if (id === 'zaaimachine') {
    const bak = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.2), mat(0xd8a31c)); bak.position.set(0, 1.0, 0); g.add(bak);
    const balk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.2), mat(0x3a3d40)); balk.position.set(0, 0.4, 0.5); g.add(balk);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.3, 2.2), mat(0xb9552b)); body.position.set(0, 1.0, 0); g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 2.4), mat(0x2b2b2e)); band.position.set(0, 0.35, 0.2); band.rotation.x = -0.35; g.add(band);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function ruimVeld(d) {
  if (!d.veld) return;
  d.veld.parent && d.veld.parent.remove(d.veld);
  d.veld.traverse((o) => { if (o.geometry && !o.geometry.userData.gedeeld) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  d.veld = null; d.planten = null; d.stroken = null;
}

// Het perceel zoals het nu is: hoekpalen, de grond per rij (geploegd of gezaaid) en de gewassen, zo groot als ze zijn.
function bouwVeld(c, rijen) {
  const d = c.data, b = getBoerderij(), map = c.world.map;
  ruimVeld(d);
  const group = new THREE.Group();
  group.name = 'boerderijveld';
  const hoogte = (x, y) => map.groundHeightAt(x, y, 0) || 0;
  const paal = new THREE.CylinderGeometry(0.1, 0.1, 1.6, 5);
  const palenMat = new THREE.MeshLambertMaterial({ color: 0xc8a96a });
  for (const [x, y] of [[rijen[0].ax, rijen[0].ay], [rijen[RIJEN - 1].ax, rijen[RIJEN - 1].ay], [rijen[0].bx, rijen[0].by], [rijen[RIJEN - 1].bx, rijen[RIJEN - 1].by]]) {
    const m = new THREE.Mesh(paal, palenMat); m.position.set(x, hoogte(x, y) + 0.8, y); group.add(m);
  }
  const f = B.fase(b);
  const grond = f === 'geploegd' ? 0x6d4c2c : f === 'braak' ? 0 : 0x7f5f38;
  d.stroken = [];
  rijen.forEach((r) => {
    const strook = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.6), new THREE.MeshLambertMaterial({ color: grond || 0x7f5f38 }));
    strook.rotation.set(-Math.PI / 2, 0, -Math.atan2(r.uy, r.ux));
    strook.userData = { r };
    const toon = grond ? 1 : 0;
    d.stroken.push({ mesh: strook, r, p: toon });
    placeStrook(strook, r, hoogte, toon);
    group.add(strook);
  });
  // de gewassen
  d.planten = null;
  if ((f === 'groeit' || f === 'rijp') && B.GEWASSEN[b.veld.gewas]) {
    const g = B.GEWASSEN[b.veld.gewas];
    const [geo, hoogtePlant] = SOORT[g.vorm];
    const per = Math.floor(RIJ_LEN / PLANT_STAP);
    const gr = B.groei(b);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: gr >= 1 ? g.rijp : g.jong }), rijen.length * per);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const items = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0;
    const s = 0.25 + 0.75 * gr;
    rijen.forEach((r, ri) => {
      for (let i = 0; i < per; i++) {
        const along = (i + 0.5) * PLANT_STAP;
        const x = r.ax + r.ux * along, y = r.ay + r.uy * along, z = hoogte(x, y);
        p.set(x, z + hoogtePlant * s * 0.5, y); sc.set(s, s, s);
        m.compose(p, q, sc); mesh.setMatrixAt(n, m);
        items.push({ ri, along, n, x, y, z, weg: false });
        n++;
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    d.planten = { mesh, items, gr };
    group.add(mesh);
  }
  d.veld = group;
  c.addMesh(group);
}

function placeStrook(strook, r, hoogte, p) {
  const len = Math.max(0.01, r.len * p);
  const mx = r.ax + r.ux * len / 2, my = r.ay + r.uy * len / 2;
  strook.scale.x = len;
  strook.position.set(mx, hoogte(mx, my) + 0.04, my);
  strook.visible = p > 0.01;
}

// Wat de machine doet, in gewone woorden en met de toets erbij: de ploeg, zaaier, strooier en rooier hebben geen eigen knop;
// ze werken zodra je in de rij rijdt. Gas geven is W (of het pijltje omhoog), sturen met A en D.
export const UITLEG = {
  ploegen: 'De ploeg zakt vanzelf zodra je in de rij rijdt: gas geven met W en recht door, er is geen knop voor de ploeg.',
  zaaien: 'De zaaimachine zaait vanzelf zodra je in de rij rijdt: gas geven met W en recht door.',
  bemesten: 'De strooier strooit vanzelf zodra je in de rij rijdt: gas geven met W en recht door.',
  oogsten: 'De rooier rooit vanzelf zodra je in de rij rijdt: gas geven met W en recht door.',
};
// De knop in het pausemenu heet "Stoppen met <naam van de baan>" (pausemenu.js): noem die naam, dan zoekt de speler niet.
const stopHint = (baan) => `Stoppen kan altijd: Esc en dan Stoppen met ${baan || 'deze dienst'}.`;
const MELDING = { tehard: 'Te hard: het werk wordt slordig (de helft van die meters telt). Gas terug.', scheef: 'Blijf in de rij.', lading: 'Rustig: de oogst rolt van de kar.' };

// De uitleg bij rij 1 van 4 (#437): wat de machine doet (geen knop), waarmee je gas geeft en hoe je stopt. Puur, zodat
// scripts/ploegwerk_test.mjs de tekst kan controleren zonder de wereld te bouwen.
export function rijUitleg(taak, baan = null) {
  return `Rij 1 van ${RIJEN}: ${UITLEG[taak] || ''} ${stopHint(baan)}`.trim();
}
// Het doel in het HUD: dezelfde uitleg, de snelheidsband in km/u en de stophint. De bovengrens komt uit de ronde (die
// zakt op een hoger niveau), niet uit de tabel; harder dan de band is slordig werk.
export function doelUitleg(taak, vMax, baan = null) {
  const band = BAND[taak];
  return `${UITLEG[taak] || ''} Houd ${kmh(band.vMin)} tot ${kmh(vMax)} km/u aan; harder is slordig werk. ${stopHint(baan)}`.trim();
}
// De volgende klus als doel op de kaart (#437): je eigen akker met wat er nu moet gebeuren, of null als er niets te
// doen is (er is nog geen akker, of het gewas groeit). routing.js zet het waypoint; hier alleen de gegevens.
export function volgendeKlus() {
  const b = getBoerderij();
  if (!b.perceel) return null;
  const taak = B.volgendeTaak(b);
  return taak ? { x: b.perceel.x, y: b.perceel.y, label: `Je akker: ${B.TAKEN[taak].naam.toLowerCase()}` } : null;
}

function stelTaakIn(c, taak) {
  const d = c.data, b = getBoerderij();
  d.taak = taak;
  d.machineId = B.machineVoor(taak);
  const eigen = d.machineId && b.machines[d.machineId] === 'eigen';
  d.ronde = init(taak, { eigen });
  d.prev = null; d.melT = 0;
  d.uitleg = false;
  d.laad = taak === 'afleveren' ? 'laden' : null;
  d.laadT = 0;
  if (d.machine) { c.removeMesh(d.machine); d.machine = null; }
  if (d.machineId) { d.machine = c.addMesh(bouwMachine(d.machineId)); }
  c.timeLeft = d.ronde.limit;
}

export default {
  id: 'boerderij',
  name: 'Eigen boerderij',
  color: '#8fb04a',
  glyph: 'suikerbieten',
  kicker: 'Boerderij',
  boss: 'Boerderij De Zonnehoek',
  vehicleWord: 'de trekker',
  blurb: 'Je eigen akker bij Hoogkerk: ploegen, zaaien, oogsten en afleveren',
  tagline: 'Boerderij De Zonnehoek: je eigen land, je eigen gewassen en een zonnige dag',
  intro: [
    'Boerderij De Zonnehoek is van jou: één akker bij Hoogkerk, een trekker en machines die je huurt of koopt.',
    'Ploegen, zaaien, het gewas laten groeien (dat gaat vanzelf met de speltijd), oogsten en afleveren. Rij recht door de rij, niet te hard en niet te langzaam. De machine werkt vanzelf: je hoeft geen knop te drukken. Stoppen kan altijd via Esc.',
  ],
  sikkom: (c) => `Boerderij De Zonnehoek: ${c.streak} klussen op eigen land`,

  anchor(map) {
    return ankerMetWeg(map, fabriek(), true, [250, 400]);
  },

  start(c) {
    const b = getBoerderij();
    const taak = B.volgendeTaak(b);
    if (!taak) {
      const w = B.wacht(b);
      return w ? `Het gewas groeit nog ${Math.ceil(w.uren)} uur. Kom later terug.` : 'Er is nu niets te doen op het land.';
    }
    const v = spawnJobVehicle(c.world, c.spot.x, c.spot.y, { kind: 'car', model: { ...TRACTOR_MODEL, color: '#3f7d3a' } });
    if (!v) return 'Geen trekker beschikbaar';
    c.vehicle = v;
    return true;
  },

  needsVehicle: () => true,

  round(c) {
    const d = c.data, b = getBoerderij();
    // het perceel: vast zodra het gevonden is
    if (!b.perceel) {
      const akker = vindAkker(c.world.map, c.spot);
      if (!akker) { c.quit('Er is geen vrije akker bij Hoogkerk te vinden. Probeer het later nog eens.'); return; }
      zetPerceel({ x: akker.center.x, y: akker.center.y, a: akker.angle });
    }
    d.rijen = akkerRijen({ x: b.perceel.x, y: b.perceel.y }, b.perceel.a);
    d.hoop = { x: c.spot.x, y: c.spot.y };
    const taak = B.volgendeTaak(b);
    if (!taak) {
      const w = B.wacht(b);
      c.quit(w ? `Het gewas groeit nog ${Math.ceil(w.uren)} uur. Kom later terug.` : 'Er is nu niets meer te doen op het land.');
      return;
    }
    const nm = neemTaak(c.world, taak);
    if (!nm.ok) { c.quit(nm.reden); return; }
    stelTaakIn(c, taak);
    bouwVeld(c, d.rijen);
    const k = nm.kosten;
    const m = d.machineId ? B.MACHINES[d.machineId].naam : null;
    const bits = [B.TAKEN[taak].naam];
    if (m) bits.push(k.huur ? `${m.toLowerCase()} gehuurd €${k.huur}` : `eigen ${m.toLowerCase()} gekoppeld`);
    if (k.materiaal) bits.push(`${taak === 'zaaien' ? 'zaaigoed' : 'mest'} €${k.materiaal}`);
    c.msg(bits.join(' · '), 3.5);
    if (UITLEG[taak]) c.msg(`${B.TAKEN[taak].naam}: ${UITLEG[taak]}`, 6);
  },

  timeout: () => 'de zon zakt',

  update(dt, c) {
    const d = c.data, v = c.vehicle, b = getBoerderij();
    if (!d.ronde || !d.veld || dt <= 0) return;
    const s = d.ronde;
    const speed = vehicleSpeed(v);
    const prev = d.prev || { speed, angle: v.angle };
    const turn = Math.abs(Math.atan2(Math.sin(v.angle - prev.angle), Math.cos(v.angle - prev.angle))) / dt;
    d.prev = { speed, angle: v.angle };
    const input = { speed, decel: Math.max(0, (prev.speed - speed) / dt), lat: speed * turn };
    // de machine volgt de trekker
    if (d.machine) {
      const ax = Math.cos(v.angle), ay = Math.sin(v.angle), af = v.model.len / 2 + 1.5;
      const mx = v.x - ax * af, my = v.y - ay * af;
      d.machine.position.set(mx, (c.world.map.groundHeightAt(mx, my, 0) || 0), my);
      d.machine.rotation.y = -v.angle + Math.PI / 2;
    }
    if (s.soort === 'rit') {
      const pc = { x: b.perceel.x, y: b.perceel.y };
      if (d.laad === 'laden') {
        // eerst de schuur laden: stil bij het perceel
        if (Math.hypot(pc.x - v.x, pc.y - v.y) < 40 && speed < 0.8) d.laadT += dt; else d.laadT = Math.max(0, d.laadT - dt);
        if (d.laadT >= 2) { d.laad = null; c.msg(`${B.GEWASSEN[b.schuur.gewas].naam} geladen. Naar ${B.GEWASSEN[b.schuur.gewas].afnemer}.`, 3); }
        return;
      }
      input.dist = Math.hypot(d.hoop.x - v.x, d.hoop.y - v.y);
    } else {
      const rij = d.rijen[s.rij];
      const pos = rijPositie(rij, v.x, v.y);
      input.along = pos.along; input.across = pos.across;
      // De uitleg komt pas als je echt bij rij 1 staat (#437): bij de start van de dienst sta je nog bij het startpunt, ver van het perceel.
      if (!d.uitleg && s.rij === 0 && Math.abs(pos.across) <= s.tol && pos.along > -1 && pos.along <= s.len) {
        d.uitleg = true;
        c.msg(rijUitleg(d.taak, c.job && c.job.name), 8);
      }
    }
    for (const e of step(s, input, dt)) {
      const vaak = e.type === 'tehard' || e.type === 'scheef' || e.type === 'lading';
      if (MELDING[e.type] && (!vaak || d.melT < c.world.time)) { c.msg(MELDING[e.type], 2.2); if (vaak) d.melT = c.world.time + 3; }
      // de rij die nu begint, niet de rij die net klaar is: na de eerste rij begin je aan rij 2
      if (e.type === 'rij' && s.rij < RIJEN) c.msg(`Rij ${s.rij + 1} van ${RIJEN}${s.rij + 1 === RIJEN ? ', de laatste' : ''}.`, 2.5);
      if (e.type === 'fail') {
        if (s.soort === 'rit' && b.schuur.kg > 0) b.schuur.kg = Math.floor(b.schuur.kg * 0.5); // de helft bleef op de weg liggen
        c.fail(e.why); return;
      }
      if (e.type === 'klaar') { klaar(c); return; }
    }
    // het land verandert terwijl je werkt
    if (s.soort === 'rijen') {
      const f = s.taak;
      if (f === 'ploegen') {
        d.stroken.forEach((st, i) => {
          const p = i < s.rij ? 1 : i === s.rij ? s.voortgang / s.len : st.p;
          if (p > st.p + 0.01) { st.p = p; placeStrook(st.mesh, st.r, (x, y) => c.world.map.groundHeightAt(x, y, 0) || 0, st.p); }
        });
      }
      if (f === 'oogsten' && d.planten) {
        let veranderd = false;
        for (const it of d.planten.items) {
          if (it.weg) continue;
          if (it.ri < s.rij || (it.ri === s.rij && it.along <= s.voortgang)) { d.planten.mesh.setMatrixAt(it.n, NUL); it.weg = true; veranderd = true; }
        }
        if (veranderd) d.planten.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  },

  view(c) {
    const d = c.data, b = getBoerderij();
    if (!d.ronde || !d.rijen) return {};
    const s = d.ronde, naam = B.TAKEN[d.taak].naam;
    if (s.soort === 'rit') {
      const g = B.GEWASSEN[b.schuur.gewas] || { afnemer: 'de afnemer' };
      if (d.laad === 'laden') return { marker: { x: b.perceel.x, y: b.perceel.y }, progress: `Boerderij · ${naam} · laden`, goal: { label: 'Naar het perceel', desc: 'Sta stil bij het perceel om de schuur te laden' } };
      return { marker: { x: d.hoop.x, y: d.hoop.y }, progress: `Boerderij · ${naam} · lading ${pct(s.kwaliteit)}`, goal: { label: `Naar ${g.afnemer}`, desc: 'Rustig rijden: de oogst rolt van de kar' } };
    }
    const rij = d.rijen[s.rij];
    const pos = rijPositie(rij, c.vehicle.x, c.vehicle.y);
    const naarBegin = pos.along < 6 || Math.abs(pos.across) > s.tol * 2;
    return {
      marker: naarBegin ? { x: rij.ax, y: rij.ay } : { x: rij.bx, y: rij.by },
      dots: d.rijen.slice(s.rij + 1).map((r) => ({ x: r.ax, y: r.ay })),
      progress: `Boerderij · ${naam} · rij ${Math.min(s.rij + 1, RIJEN)}/${RIJEN} · ${pct(fractie(s))}`,
      goal: { label: naarBegin ? 'Naar het begin van de rij' : `${naam}: rij tot het eind`, desc: doelUitleg(d.taak, s.vMax, c.job && c.job.name) },
    };
  },

  stop(c) {
    const d = c.data;
    if (d.machine) { c.removeMesh(d.machine); d.machine = null; }
    ruimVeld(d);
    // de volgende klus als doel op de kaart: je akker, met wat er nu moet gebeuren
    const doel = volgendeKlus();
    if (doel) import('./routing.js').then((r) => r.setUserWaypoint(doel.x, doel.y, doel.label)).catch(() => {}); // uitgesteld geladen: een vaste import maakte een kring met routing, shops en sidejobs
  },
};

// De taak is af: het land verandert, het vak telt punten, en na een korte pauze komt de volgende taak of een rustig einde.
function klaar(c) {
  const d = c.data, b = getBoerderij(), w = c.world, s = d.ronde;
  const r = result(s);
  const taak = d.taak;
  if (taak === 'afleveren') {
    const g = B.GEWASSEN[b.schuur.gewas];
    const uit = leverAf(w, r.kwaliteit);
    c.skip(`${g ? g.afnemer : 'De afnemer'}: ${uit.kg} kg afgeleverd, +€${uit.betaald}.`);
    return;
  }
  const uit = rondAf(w, taak, r.fractie);
  bouwVeld(c, d.rijen);
  const tekst = {
    ploegen: `Geploegd: ${pct(r.fractie)} netjes.`,
    zaaien: `${B.GEWASSEN[uit.gewas] ? B.GEWASSEN[uit.gewas].naam : 'Het gewas'} gezaaid (${pct(r.fractie)}). Nu groeit het.`,
    bemesten: `Bemest: ${pct(r.fractie)}. Dat geeft meer opbrengst.`,
    oogsten: `Geoogst: ${uit.kg} kg. Breng het naar de afnemer.`,
  }[taak];
  c.skip(tekst);
}
