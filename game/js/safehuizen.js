// Safehouses (#414, fase 2): in elke veroverbare wijk en plaats staat een verzonnen woning (adres en makelaar in gebieden.js).
// Je koopt hem, goedkoper naarmate je meer in dat gebied deed, of krijgt hem als het gebied helemaal gedaan is. Bij de deur (E):
// slapen en opslaan, de kledingkast van het spel, je voertuigen laten brengen, onderduiken (de politie zoekt je hier niet) en de
// inrichting die meegroeit met je voortgang. Een snelreisanker is de knop "Reis erheen" in Loopbaan › Veroverd. Sinds #458 staat
// het huis in een bestaand woonpand uit de gebouwenlaag: alleen de deur en het bord op de gevel, geen nieuw bouwvolume. Lukt dat
// niet (een industriewijk zonder woonhuizen), dan valt het terug op het losse huisje van #414. Een eigen pand heeft sinds #458
// ook een binnenkant: E bij de deur zet je met de lift in de kamer erachter (bed, kast, keukenblok, de cutaway-stijl van het flat
// van home.js); bij de deur binnen ga je weer naar buiten. Het is een activiteit van activities.js (prompt, E, kaart en minimap).
// Per speler: wat je bezit staat in je eigen profiel (gebiedenlive.js); in Samen spelen ziet iedereen dezelfde huizen op dezelfde
// plek en heeft zijn eigen sleutel. Niet door een mens in beeld bekeken.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import * as G from './gebieden.js';
import { getIndeling, getProfiel, koopHuisLive, heeftHuisLive } from './gebiedenlive.js';
import { getOwnedEntries, spawnOwnedEntry, wardrobeMenu } from './shops.js';
import { openShopMenu, closeShopMenu, isShopOpen } from './shopui.js';
import { respawnFade } from './respawn.js';
import { refreshDayNight } from './daynight.js';
import { clearDrunk } from './drunk.js';
import { recordStat } from './achievements.js';
import { saveGame } from './savehook.js';
import { groepAkkoord } from './coopgroep.js';
import { getScene, setBuildingHidden } from './scene3d.js';
import { addStaticCollider, removeProp } from './breakables.js';
import { iconDisc } from './activitykit.js';
import { playerBusy } from './busy.js';
import { isInWater, pointInPolygon } from './util.js';
import { inPassage } from './passages.js';
import { pushOutOfPlan } from './countryplan.js';
import { countryWeight } from './countryfield.js';
import { coveredByTiles } from './provinceworld.js';
import { provinceLandAt } from './regions.js';
import { puntInGebied } from './grenzen.js';
import { HX, HZ, DEUR_MARGE, deurVan, droogeKandidaten, huisMuren, kamerMaat, kamerSpots, kamerSolids, pandBox, KAMER_FLOOR, plaatsSafehuis } from './safehuisplek.js';
import { buildSafehouseMarker3D, buildSafehuisKamer3D, disposeHomeExterior } from './home3d.js';
import { registerMusicProbe } from './scenariomusic.js';

const GEBRUIK_R = 2.2;
const STREAM_IN = 200;
const STREAM_UIT = 260;
const MUREN = ['#d9c7a3', '#c9a98a', '#b9c7b0', '#d8b8b0', '#c4cdd6', '#e0d2a0'];
const WAKKER = [
  ['ochtend', 'Tot de ochtend', 'Wakker om half acht, fris en uitgerust', 7.5, 'Goeiemorgen, Grunn! Uitgeslapen en opgeslagen'],
  ['middag', 'Tot de middag', 'Uitslapen tot één uur, net als studenten', 13, 'Middag! Uitgeslapen als een student'],
  ['avond', 'Tot de avond', 'Wakker om half tien, klaar voor het nachtwerk', 21.5, 'Uitgeslapen tot de avond. Tijd voor actie'],
  ['nacht', 'Tot diep in de nacht', 'Om één uur, als heel Grunn slaapt', 1, 'Eén uur \'s nachts. Heel Grunn slaapt, behalve jij'],
];

let wereld = null;
let huizen = [];        // [{ ...huis uit gebieden.js, x, y, ang, geplaatst, mesh, props }]
let sig = '';
let bezig = false;      // een fade loopt
let groep = null;
let gebruiktePanden = new Set(); // elk bestaand pand krijgt hooguit één safehouse (#458)
let kamer = null;      // de kamer van het pand waar je binnen bent (#458), of null
let kamerGen = 0;      // een load of respawn maakt een lopende fade ongeldig
let respawnWorld = null; // de wereld waarin de respawn-haak al staat
const KAMER_R = 1.3;    // m: hoe dicht bij het bed, de kast of de deur je moet staan

const hashHoek = (id) => { let h = 2166136261; for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return (h % 3600) / 3600 * Math.PI * 2; };
const policeWatching = (w) => w.wanted > 0 && !!(w.police && w.police.seenRecently);

// De plek van de woningen: even naast het hart van het gebied, op open begaanbare grond; hoe dichter bij, hoe zekerder (de tegels).
function ververs(w) {
  const ind = getIndeling();
  if (!ind) return;
  const lijst = G.huizenLijst(ind);
  const s = lijst.map((h) => h.id).join('|');
  if (s === sig) return;
  sig = s;
  for (const h of huizen) opruimen(h);
  gebruiktePanden = new Set();
  huizen = lijst.map((h) => {
    const ang = hashHoek(h.id);
    const o = { ...h, ang, grens: ind.gebied.get(h.gebied).grens, x0: h.x, y0: h.y };
    // ligt het binnenpunt op zee (de Eems), neem dan alvast het dichtstbijzijnde land van het gebied (het raster van de provincie, zonder tegels)
    if (!provinceLandAt(h.x, h.y)) { const k = droogeKandidaten(o, DEPS)[0]; if (k) { o.x0 = k[0]; o.y0 = k[1]; } }
    return { ...o, x: o.x0 + Math.cos(ang) * 22, y: o.y0 + Math.sin(ang) * 22, geplaatst: false, mesh: null, props: null };
  });
}
// Waar een huisje mag staan (safehuisplek.js, dezelfde eisen als de spotcheck): hier komen de echte functies van het spel binnen.
const DEPS = { isInWater, pointInPolygon, inPassage, provinceLandAt, puntInGebied, landSolid: (x, y) => countryWeight(x, y) > 0.5 && !coveredByTiles(x, y) && !!pushOutOfPlan({ x, y }, 0.35),
  // geen beschermd pand, geen eigen interieur en niet het huis van Tammo en Tessa (#458)
  verboden: (b) => !!b.landmark || !!b.noPassages || !!b.rooms || !!b.safehuisVerboden };
// Het binnenpunt van een woonplaats of wijk kan in het water vallen: Delfzijl en Termunten liggen als gebied deels in de Eems en de Dollard, en het binnenpunt van zo'n
// gebied ligt dan ver op zee. Bij het indelen nemen we daarom alvast het dichtstbijzijnde land van het gebied (het landraster van de provincie, dat geen tegels
// nodig heeft). Komt de speler binnen 200 m, dan zoeken we met de tegels erbij de plek (zoekPlek); vindt dat niets, dan is het huisje onbruikbaar: geen huisje,
// geen deur en geen icoon.
function plaats(h, w) {
  if (h.geplaatst || !w.map) return;
  h.geplaatst = true;
  const q = plaatsSafehuis(h, w.map, DEPS, gebruiktePanden, hashHoek(h.id));
  if (!q) { h.onbruikbaar = true; return; }
  h.x = q.x; h.y = q.y; h.ang = q.ang;
  h.deur = q.deur;
  h.pand = q.pand || null;
  h.soort = q.soort;
  if (q.pand) gebruiktePanden.add(q.pand);
}
const deur = (h) => h.deur || deurVan(h.x, h.y, h.ang);

// --- het huisje in 3D ------------------------------------------------------------------------------------------------

function bouw(h, w) {
  if (h.pand) { bouwPand(h, w); return; }
  const scene = getScene && getScene();
  if (!scene || h.mesh) return;
  if (!groep) { groep = new THREE.Group(); groep.name = 'safehuizen'; scene.add(groep); }
  const ind = getIndeling();
  const v = G.voortgang(getProfiel(), ind, h.gebied);
  const inr = G.inrichting(v.deel, v.voltooid);
  const eigen = heeftHuisLive(h.id);
  const gz = w.map.groundHeightAt ? w.map.groundHeightAt(h.x, h.y, 0) || 0 : 0;
  const g = new THREE.Group();
  const kleur = MUREN[Math.floor(hashHoek(h.id) / (Math.PI * 2) * MUREN.length) % MUREN.length];
  const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const box = (bx, by, bz, c, px, py, pz, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat(c, extra)); m.position.set(px, py, pz); g.add(m); return m; };
  box(HX * 2, 3, HZ * 2, kleur, 0, 1.5, 0);
  const dak = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(HX, HZ) + 0.5, 1.7, 4), mat('#7a4332'));
  dak.rotation.y = Math.PI / 4; dak.scale.set(HX / HZ * 1.0 + 0.0, 1, 1); dak.position.y = 3.85;
  g.add(dak);
  box(0.12, 2.1, 1.1, eigen ? '#2f6f4f' : '#8a3b2e', HX + 0.04, 1.05, 0);                    // de deur
  box(0.1, 0.9, 0.9, '#f2e6a8', HX + 0.04, 1.9, -1.8, { emissive: new THREE.Color('#665a20') }); // twee raampjes
  box(0.1, 0.9, 0.9, '#f2e6a8', HX + 0.04, 1.9, 1.8, { emissive: new THREE.Color('#665a20') });
  if (inr.niveau >= 1) box(0.9, 0.5, 0.5, '#8a6a3a', HX + 0.6, 0.25, -1.2);                  // een bankje
  if (inr.niveau >= 2) box(0.6, 0.6, 0.6, '#4f8f4a', HX + 0.5, 0.3, 1.3);                    // een plantenbak
  if (eigen) {                                                                               // de vlag, in de kleur van de laag
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), mat('#e9e2d0'));
    pole.position.set(HX - 0.3, 4.6, HZ - 0.3); g.add(pole);
    const nv = G.niveauInfo(h.niveau);
    const vl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshLambertMaterial({ color: nv.vlag, side: THREE.DoubleSide }));
    vl.position.set(HX - 0.3, 5.7, HZ - 0.3 - 0.62); vl.rotation.y = Math.PI / 2; g.add(vl);
  }
  g.position.set(h.x, gz, h.y);
  g.rotation.y = -h.ang;
  groep.add(g);
  h.mesh = g;
  // de muren houden je buiten (het huisje heeft geen binnenkant). Ze komen uit huisMuren, dezelfde HX en HZ als de doos hierboven,
  // zodat het huisje alleen botst waar het getekend is; ze gaan mee weg met het mesh (#434: een gast botste bij Hoogkerk tegen
  // muren van een huisje dat hij niet zag).
  h.props = huisMuren(h.x, h.y, h.ang).map(([mx, my, half, hoek]) => addStaticCollider('garagewall', mx, my, 0.2, half, hoek));
  h.gebouwdMet = `${inr.niveau}|${eigen}`;
}

// Een safehouse in een bestaand pand (#458): alleen de deur en het bord op de
// gevel, geen nieuw bouwvolume en geen eigen muren (het pand is al solide).
// Samen spelen (#429): het pand is werelddata en staat voor iedereen op dezelfde
// plek; de markering volgt je eigen profiel (heeftHuisLive). Een gast ziet dus
// zijn eigen sleutel, nog niet die van een ander: dat vraagt een EXTRA-bericht
// en hoort bij #449/#458.
function bouwPand(h, w) {
  const scene = getScene && getScene();
  if (!scene || h.mesh) return;
  if (!groep) { groep = new THREE.Group(); groep.name = 'safehuizen'; scene.add(groep); }
  const eigen = heeftHuisLive(h.id);
  const d = deur(h);
  const gz = w.map.groundHeightAt ? w.map.groundHeightAt(d.x, d.y, 0) || 0 : 0;
  // het deurpunt ligt DEUR_MARGE van de gevel: het bord hoort op de gevel zelf
  const fx = d.x - Math.cos(h.ang) * DEUR_MARGE, fy = d.y - Math.sin(h.ang) * DEUR_MARGE;
  const g = buildSafehouseMarker3D({
    x: fx, y: fy, ang: h.ang, eigen,
    kleur: eigen ? G.niveauInfo(h.niveau).vlag : '#8a3b2e',
    naam: h.naam,
  });
  g.position.y = gz + 0.02;
  groep.add(g);
  h.mesh = g;
  h.props = null;
  h.gebouwdMet = `pand|${eigen}`;
}

// Het huisje weg: eerst de muren, dan het mesh, zodat er nooit een botsvolume blijft staan waar niets getekend is (#434).
function opruimen(h) {
  if (h.props) {
    for (const p of h.props) { try { removeProp(p); } catch (e) { /* al weg */ } }
    h.props = null;
  }
  if (h.mesh) {
    h.mesh.removeFromParent();
    h.mesh.traverse((o) => {
      if (!o.isMesh) return;
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m && !m.userData.shared) { if (m.map) m.map.dispose(); m.dispose(); }
    });
    h.mesh = null;
  }
}

// --- de kamer van een pand (#458) ----------------------------------------------------
//
// Een eigen safehouse in een bestaand pand heeft één kamer achter de voordeur:
// de begane grond is van het pand zelf, dus de kamer ligt op de eerste
// verdieping (KAMER_FLOOR), waar de gebouwenbotsing van de straat niet meer
// geldt (resolveWalker laat alles boven 4 m gaan, zoals bij het flat van
// home.js). Je komt er met de lift bij de deur en gaat er bij dezelfde deur weer
// uit. Het pand zelf gaat uit beeld zolang je binnen bent, zodat je de kamer in
// de cutaway-stijl van het flat ziet (muren tot heuphoogte, de camera erboven).
// Samen spelen (#429): iedereen bouwt zijn eigen kamer op zijn eigen scherm; de
// host ziet een gast gewoon bij de deur staan (z gaat niet over de lijn, net als
// bij het flat). Slapen en onderduiken vragen zoals altijd akkoord van iedereen.

// De maten en de indeling van de kamer van dit pand. Het eigen frame: x langs de
// gevel, z naar binnen, de oorsprong op de gevel bij de deur.
function kamerVan(h) {
  const box = h.pand ? pandBox(h.pand) : null;
  const s = kamerMaat(box);
  const d = deur(h);
  const gz = wereld && wereld.map && wereld.map.groundHeightAt ? wereld.map.groundHeightAt(d.x, d.y, 0) || 0 : 0;
  const spots = kamerSpots(s);
  return {
    h, ox: d.x - Math.cos(h.ang) * DEUR_MARGE, oy: d.y - Math.sin(h.ang) * DEUR_MARGE,
    angle: h.ang + Math.PI / 2, floorY: gz + KAMER_FLOOR, w: s, d: s,
    deurX: 1.7, liftX: 0.55, spots, groep: null,
    solids: kamerSolids(spots),
  };
}

const naarLokaal = (k, x, y) => { const dx = x - k.ox, dy = y - k.oy, c = Math.cos(k.angle), s = Math.sin(k.angle); return { lx: dx * c + dy * s, lz: -dx * s + dy * c }; };
const naarWereld = (k, lx, lz) => { const c = Math.cos(k.angle), s = Math.sin(k.angle); return { x: k.ox + lx * c - lz * s, y: k.oy + lx * s + lz * c }; };
const inKamer = (k, x, y) => { const q = naarLokaal(k, x, y); return q.lx > -0.2 && q.lx < k.w + 0.2 && q.lz > -0.2 && q.lz < k.d + 0.2; };

// De kamer is een oppervlak voor de kaart zolang je er bent (net als het flat):
// de vloer van de eerste verdieping in plaats van de straat.
let onzeGrond = null;
function haakGrond(map) {
  if (!map || map.groundHeightAt === onzeGrond) return;
  const grond = map.groundHeightAt.bind(map);
  onzeGrond = (x, y, z = 0) => (kamer && inKamer(kamer, x, y) ? kamer.floorY : grond(x, y, z));
  map.groundHeightAt = onzeGrond;
}

// De speler binnen neerzetten op (lx, lz), met de neus de kamer in.
function zetBinnen(w, k, lx, lz) {
  const p = w.player, q = naarWereld(k, lx, lz);
  if (p.water && p.leaveWater) p.leaveWater();
  p.x = q.x; p.y = q.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = k.floorY;
  p.vault = null; p.climb = null; p.sofaSeat = null;
  p.angle = k.angle + Math.PI / 2;
  w.camYaw = p.angle;
}

// En weer bij de voordeur, met de neus van de gevel af.
function zetBijDeur(w, h) {
  const p = w.player, d = deur(h);
  p.x = d.x; p.y = d.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.vault = null; p.climb = null; p.sofaSeat = null;
  p.gz = (w.map && w.map.groundHeightAt ? w.map.groundHeightAt(d.x, d.y, 0) : 0) || 0;
  p.angle = h.ang;
  w.camYaw = p.angle;
}

// De speler blijft binnen de muren en buiten de meubels, net als op het flat.
function houdBinnen(k, p) {
  const r = 0.32;
  let { lx, lz } = naarLokaal(k, p.x, p.y);
  const rand = () => { lx = Math.max(r + 0.15, Math.min(k.w - r - 0.15, lx)); lz = Math.max(r + 0.15, Math.min(k.d - r - 0.15, lz)); };
  rand();
  for (const [x0, z0, x1, z1] of k.solids) {
    const cx = Math.max(x0, Math.min(x1, lx)), cz = Math.max(z0, Math.min(z1, lz));
    const dx = lx - cx, dz = lz - cz, d = Math.hypot(dx, dz);
    if (d >= r) continue;
    if (d < 1e-4) {
      const opties = [[lx - x0, -1, 0], [x1 - lx, 1, 0], [lz - z0, 0, -1], [z1 - lz, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      lx += opties[1] * (opties[0] + r); lz += opties[2] * (opties[0] + r);
    } else { lx += dx / d * (r - d); lz += dz / d * (r - d); }
  }
  rand();
  const q = naarWereld(k, lx, lz);
  p.x = q.x; p.y = q.y;
}

// Een fade naar zwart, de kamer in of uit in het donker.
function kamerFade(fn, hold = 380) {
  if (bezig) return false;
  bezig = true;
  const gen = kamerGen;
  respawnFade(1, 320);
  setTimeout(() => {
    if (gen === kamerGen) { try { fn(); } catch (e) { console.error('safehuis', e); } }
    setTimeout(() => { respawnFade(0, 420); bezig = false; }, 120);
  }, hold);
  return true;
}

function binnen(w, h) {
  if (kamer || !h.pand || !h.pand.pts) return false;
  return kamerFade(() => {
    if (kamer || !h.pand || !h.pand.pts) return;
    const scene = getScene && getScene();
    if (!scene) return;
    const k = kamerVan(h);
    k.groep = buildSafehuisKamer3D(k);
    scene.add(k.groep);
    haakGrond(w.map);
    kamer = k;
    setBuildingHidden(h.pand, true);
    zetBinnen(w, k, k.spots.binnen.x, k.spots.binnen.z);
    w.addMessage(`Binnen bij ${h.naam}. Bed: slapen en opslaan, kast: je kleren, deur: naar buiten`, 5, { kind: 'tip' });
  });
}

// Uit de kamer. stil: zonder fade (een respawn, een laadbeurt of een sprong):
// wie dan nog in het pand staat, gaat naar de voordeur.
function verlaat(w, stil = false) {
  const k = kamer;
  if (!k) return false;
  const opruimenKamer = () => {
    kamer = null;
    if (k.groep) { const scene = getScene && getScene(); if (scene) scene.remove(k.groep); disposeHomeExterior(k.groep); }
    if (k.h.pand) setBuildingHidden(k.h.pand, false);
  };
  if (stil) {
    kamerGen++;
    opruimenKamer();
    if (k.h.pand && k.h.pand.pts && pointInPolygon(w.player.x, w.player.y, k.h.pand.pts)) zetBijDeur(w, k.h);
    return true;
  }
  return kamerFade(() => { opruimenKamer(); zetBijDeur(w, k.h); });
}

// Bij het bed, de kast of de deur staan (binnen).
function kamerGebruik(p) {
  if (!kamer) return null;
  let best = null, bd = KAMER_R;
  for (const k of ['bed', 'kast', 'deur']) {
    const q = naarWereld(kamer, kamer.spots[k].x, kamer.spots[k].z);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bd) { bd = d; best = { k, ...q }; }
  }
  return best;
}

function kamerPrompt(w) {
  if (bezig) return null;
  const u = kamerGebruik(w.player);
  if (!u) return null;
  const h = kamer.h, hgt = kamer.floorY + 1.3;
  if (u.k === 'bed') return { id: 'safehuis-bed', x: u.x, y: u.y, h: hgt, key: 'E', label: 'Slapen en opslaan', sub: 'Ook onderduiken, de kast, je voertuigen en de inrichting', ring: true };
  if (u.k === 'kast') return { id: 'safehuis-kast', x: u.x, y: u.y, h: hgt, key: 'E', label: 'Kledingkast', sub: 'Trek iets anders aan', ring: true };
  return { id: 'safehuis-uit', x: u.x, y: u.y, h: hgt, key: 'E', label: 'Naar buiten', sub: `Met de lift naar de straat, ${h.adres}`, ring: true };
}

// De camera in de kamer: boven de cutaway-muren, zoals op het flat (home.js
// homeCamera vraagt dit via world.kamerCamera). null = niets aan de hand.
function kamerCamera(x, y, z) {
  if (!kamer) return null;
  return [x, Math.max(y, kamer.floorY + 2.4), z];
}

// --- de menu's -------------------------------------------------------------------------------------------------------

function laatBrengen(w, h) {
  const d = deur(h);
  const lijst = getOwnedEntries().filter((o) => !(o.v && o.v.driver === 'player'));
  return lijst.slice(0, 24).map((o, i) => ({
    id: 'veh-' + i, label: o.spec.name || o.spec.model || 'Voertuig', desc: o.lost ? 'Kwijt of gesloopt: hier staat hij weer voor de deur' : 'Wordt voor de deur gezet',
    verb: 'Laten brengen', price: 0, keepFocus: true,
    preview: { kind: o.spec.kind, model: o.spec.model, color: o.color, nameIdx: o.spec.nameIdx, flags: o.spec.flags || null },
    buy() {
      const ang = h.ang;
      const v = spawnOwnedEntry(w, o, d.x + Math.cos(ang) * 4.5 + Math.cos(ang + Math.PI / 2) * 3, d.y + Math.sin(ang) * 4.5 + Math.sin(ang + Math.PI / 2) * 3, ang + Math.PI / 2);
      return v ? `${o.spec.name || 'Voertuig'} staat voor de deur` : 'Er is geen plek voor de deur';
    },
  }));
}

// Slapen en onderduiken verzetten de klok voor iedereen: met meer spelers pas na akkoord van alle anderen (#452, coopgroep.js). Alleen: meteen.
function slaap(w, h, uur, bericht) {
  if (bezig) return false;
  bezig = true;
  closeShopMenu();
  const gestart = groepAkkoord(w, 'slapen', null, () => slaapNu(w, h, uur, bericht), () => { bezig = false; });
  if (!gestart) bezig = false;
  return gestart;
}
function slaapNu(w, h, uur, bericht) {
  respawnFade(1, 320);
  setTimeout(() => {
    try {
      w.clock = uur;
      refreshDayNight(w);
      w.health = 100;
      clearDrunk(w);
      recordStat(w, 'slept');
      saveGame(w, { toast: true });
      w.addMessage(bericht, 4, { kind: 'tip' });
    } catch (e) { console.error('safehuis', e); }
    setTimeout(() => { respawnFade(0, 420); bezig = false; }, 120);
  }, 900);
  return true;
}

function duikOnder(w, h, uren) {
  if (bezig) return false;
  bezig = true;
  closeShopMenu();
  const gestart = groepAkkoord(w, 'onderduiken', null, () => duikOnderNu(w, h, uren), () => { bezig = false; });
  if (!gestart) bezig = false;
  return gestart;
}
function duikOnderNu(w, h, uren) {
  respawnFade(1, 320);
  setTimeout(() => {
    try {
      w.clock = (((w.clock + uren) % 24) + 24) % 24;
      refreshDayNight(w);
      w.wanted = 0;
      w.wantedDecayTimer = 0;
      w.addMessage(`${uren} uur onderduiken: de politie is je kwijt`, 5, { kind: 'tip' });
    } catch (e) { console.error('safehuis', e); }
    setTimeout(() => { respawnFade(0, 420); bezig = false; }, 120);
  }, 900);
  return true;
}

// de eigen muziek van je huis (thuis_loop) klinkt zolang het menu van je safehouse openstaat: slapen, opslaan, kledingkast
let huisMenuOpen = false;
registerMusicProbe('thuis', () => { if (huisMenuOpen && !isShopOpen()) huisMenuOpen = false; return huisMenuOpen; });
function menu(w, h) {
  const ind = getIndeling();
  const p = getProfiel();
  const v = G.voortgang(p, ind, h.gebied);
  const inr = G.inrichting(v.deel, v.voltooid);
  const stappen = {
    title: 'De inrichting', note: `Groeit mee met wat je in ${ind.gebied.get(h.gebied).naam} doet: ${v.klaar} van ${v.totaal}`,
    items: inr.stappen.map((s, i) => ({ id: 'inr-' + i, label: s.naam, desc: s.klaar ? 'Staat er' : 'Komt als je verder komt in dit gebied', verb: 'Bekijken', price: 0, disabled: s.klaar ? 'Staat er' : 'Komt nog', preview: { kind: 'product', product: 'bed' }, buy: () => 'Gezellig' })),
  };
  const tag = `${h.adres} · ${h.makelaar}`;
  if (!heeftHuisLive(h.id)) {
    const prijs = G.huisPrijs(p, ind, h.id);
    return {
      name: h.naam, type: 'eikea', color: '#b8741c', tagline: `Te koop: ${tag}`,
      sections: () => [
        { title: 'Te koop', note: `Gratis als je ${ind.gebied.get(h.gebied).naam} helemaal veroverd hebt. Hoe meer je al deed, hoe lager de prijs`, items: [{
          id: 'koop', label: `Koop ${h.naam}`, desc: `${tag}. Slapen en opslaan, garage, kledingkast en onderduiken`, verb: 'Kopen', price: prijs, preview: { kind: 'product', product: 'huisje' },
          buy() {
            const r = koopHuisLive(w, h.id);
            if (!r.ok) return r.reden === 'geld' ? null : 'Dit huis is al van jou';
            closeShopMenu({ save: true });
            w.addMessage(`Gefeliciteerd met ${h.naam}! De sleutel ligt op de mat`, 5, { kind: 'tip' });
            return 'Sleutel in de hand';
          },
        }] },
        stappen,
      ],
    };
  }
  return {
    name: h.naam, type: 'eikea', color: G.niveauInfo(h.niveau).vlag, tagline: tag,
    sections: () => [
      { title: 'Slapen en opslaan', note: 'Slapen slaat het spel op en geeft volle gezondheid', items: WAKKER.map(([id, label, desc, uur, msg]) => ({
        id: 'wake-' + id, label, desc, verb: 'Slapen', price: 0, keepFocus: true, preview: { kind: 'product', product: 'bed' }, buy() { slaap(w, h, uur, msg); return 'Welterusten'; } })) },
      { title: 'Onderduiken', note: 'De politie zoekt je hier niet. Hoe beter ingericht, hoe korter het duurt', items: [{
        id: 'onderduik', label: `Onderduiken (${G.ONDERDUIK_UREN[inr.niveau]} uur)`, desc: w.wanted > 0 ? 'Gezocht niveau naar nul, de klok loopt door' : 'Alleen als de politie je zoekt', verb: 'Onderduiken', price: 0, plain: true, disabled: w.wanted > 0 ? '' : 'Niet gezocht',
        preview: { kind: 'product', product: 'bed' }, buy() { duikOnder(w, h, G.ONDERDUIK_UREN[inr.niveau]); return 'Even stil zitten'; } }] },
      { title: 'Kledingkast', note: 'Alles wat je ooit kocht, in de kast bij de deur', items: [{
        id: 'kast', label: 'Kleren aantrekken', desc: 'Zelfde kast als thuis', verb: 'Openen', price: 0, plain: true, preview: { kind: 'product', product: 'bed' },
        buy() { setTimeout(() => openShopMenu(w, wardrobeMenu(w)), 0); return 'Kast open'; } }] },
      { title: 'Garage', note: h.pand ? 'Geen eigen garage in dit pand: je voertuigen komen voor de deur te staan' : 'Je voertuigen komen hier voor de deur te staan', items: laatBrengen(w, h) },
      { title: 'Snelreisanker', note: 'Vanuit Loopbaan › Veroverd kom je hier meteen terecht', items: [{ id: 'anker', label: 'Snelreisanker', desc: 'Pauzemenu › Loopbaan › Veroverd › Reis erheen', verb: 'Bekijken', price: 0, disabled: 'Via Loopbaan', preview: { kind: 'product', product: 'bed' }, buy: () => 'Jouw huis staat op de kaart' }] },
      stappen,
    ].filter((s) => s.items.length),
  };
}

// --- de activiteit (activities.js) -----------------------------------------------------------------------------------

function dichtbij(w) {
  const p = w.player;
  let best = null, bd = GEBRUIK_R;
  for (const h of huizen) {
    if (h.onbruikbaar) continue;
    const d = deur(h);
    const afst = Math.hypot(p.x - d.x, p.y - d.y);
    if (afst < bd) { bd = afst; best = h; }
  }
  return best;
}
const kanNiet = (w) => {
  const p = w.player;
  if (!wereld || bezig || isShopOpen() || w.pigeonMode || w.heliRun || p.inVehicle || p.swimming) return 'x';
  return playerBusy(w, ['mission', 'activeRace']).busy ? 'Niet nu: maak eerst je missie af' : '';
};

export const SAFEHUIS = {
  id: 'safehuis',
  layer: 'safehuis',
  gastTick: true, // ook bij een gast bouwen: het losse huisje heeft muren die zijn lichaam tegenhouden (#434), een bestaand pand is al solide
  legend: { kind: 'act-safehuis', label: 'Safehouse', note: 'een woning om te kopen of te krijgen in elk gebied dat je kunt veroveren' },
  init(w) {
    if (kamer) verlaat(wereld || w, true);
    kamerGen++;
    wereld = w;
    haakGrond(w.map);
    w.kamerCamera = kamerCamera;
    if (respawnWorld !== w) {
      respawnWorld = w;
      // dood of opgepakt: de kamer gaat mee terug, zonder fade
      w.onRespawn.push((ww) => { if (kamer) verlaat(ww, true); });
    }
    window.__safehuis = {
      lijst: () => huizen.map((h) => ({ id: h.id, naam: h.naam, adres: h.adres, x: h.x, y: h.y, ang: h.ang, deur: deur(h), gebied: h.gebied, soort: h.soort || 'huisje', pand: h.pand ? (h.pand.osm || null) : null, geplaatst: h.geplaatst, onbruikbaar: !!h.onbruikbaar, mesh: !!h.mesh, eigen: heeftHuisLive(h.id) })),
      menu: (id) => { const h = huizen.find((q) => q.id === id); return h ? openShopMenu(w, menu(w, h)) : null; },
      binnen: (id) => { const h = huizen.find((q) => q.id === id); return h ? binnen(w, h) : false; },
      uit: () => verlaat(w),
      kamer: () => (kamer ? { id: kamer.h.id, floorY: kamer.floorY, w: kamer.w, groep: !!kamer.groep } : null),
    };
  },
  spots: (voorCheck) => (voorCheck ? [] : huizen.filter((h) => !h.onbruikbaar)).map((h) => ({ id: h.id, name: h.naam, ...deur(h), mode: 'walk' })),
  prompt(w) {
    if (kamer) return kamerPrompt(w);
    const h = kanNiet(w) === 'x' ? null : dichtbij(w);
    if (!h) return null;
    const eigen = heeftHuisLive(h.id), d = deur(h);
    if (policeWatching(w)) return { id: h.id, x: d.x, y: d.y, h: 2.4, key: 'E', label: 'Safehouse', sub: 'Deur op slot: politie op je hielen', ring: true, dim: true };
    if (eigen) {
      const pand = h.soort === 'pand' && h.pand;
      return { id: h.id, x: d.x, y: d.y, h: 2.4, key: 'E', label: pand ? 'Naar binnen' : h.naam, sub: pand ? `${h.naam}: slapen, kleren, onderduiken en je voertuigen` : `${h.adres}: slapen, kleren, garage, onderduiken`, ring: true };
    }
    const prijs = G.huisPrijs(getProfiel(), getIndeling(), h.id);
    return { id: h.id, x: d.x, y: d.y, h: 2.4, key: 'E', label: `${h.naam} bekijken`, sub: `${h.adres} · €${prijs.toLocaleString('nl-NL')}`, ring: true };
  },
  secondary(w) {
    if (kamer) return [];
    const p = w.player;
    const lijst = [];
    const hier = dichtbij(w);
    for (const h of huizen) {
      if (h.onbruikbaar || Math.hypot(p.x - h.x, p.y - h.y) > 70 || h === hier) continue;
      lijst.push({ id: h.id + '-2', x: h.x, y: h.y, h: 4.6, label: h.naam, sub: heeftHuisLive(h.id) ? h.adres : `Te koop · ${h.adres}`, kind: 'place' });
    }
    return lijst;
  },
  interact(w) {
    if (kamer) {
      if (bezig || isShopOpen()) return false;
      const u = kamerGebruik(w.player);
      if (!u) return false;
      if (u.k === 'deur') verlaat(w);
      else if (u.k === 'kast') openShopMenu(w, wardrobeMenu(w));
      else { huisMenuOpen = true; openShopMenu(w, menu(w, kamer.h)); }
      return true;
    }
    const k = kanNiet(w);
    if (k === 'x') return false;
    const h = dichtbij(w);
    if (!h) return false;
    if (k) { w.addMessage(k, 3); return true; }
    if (policeWatching(w)) { w.addMessage('Deur op slot: eerst de politie kwijt', 3); return true; }
    // je eigen pand: de kamer in (#458); te koop of een los huisje: het menu bij de deur
    if (heeftHuisLive(h.id) && h.soort === 'pand' && h.pand) { binnen(w, h); return true; }
    huisMenuOpen = true;
    openShopMenu(w, menu(w, h));
    return true;
  },
  active: () => false,
  quit() {},
  update() {},
  tick(dt, w) {
    wereld = w;
    ververs(w);
    const p = w.player;
    // binnen in de kamer: de muren en de meubels houden je tegen, en wie er
    // buiten raakt (een sprong, een teleport, een respawn) is weer buiten
    if (kamer) {
      const q = naarLokaal(kamer, p.x, p.y);
      const weg = p.inVehicle || w.pigeonMode || q.lx < -2 || q.lx > kamer.w + 2 || q.lz < -2 || q.lz > kamer.d + 2 || Math.abs((p.gz || 0) - kamer.floorY) > 2.5;
      if (weg) verlaat(w, true);
      else { houdBinnen(kamer, p); p.gz = kamer.floorY; }
    }
    for (const h of huizen) {
      const d = Math.hypot(p.x - h.x, p.y - h.y);
      if (d < STREAM_IN) {
        if (!h.geplaatst) plaats(h, w);
        if (h.onbruikbaar) continue;
        // een save die binnen is gemaakt (of een sprong): niet in het pand laten staan
        if (!kamer && h.pand && h.pand.pts && Math.hypot(p.x - h.deur.x, p.y - h.deur.y) < 12 && (p.gz || 0) < 1.2 && pointInPolygon(p.x, p.y, h.pand.pts) && !inPassage(w.map, h.pand, p.x, p.y)) {
          zetBijDeur(w, h);
          continue;
        }
        const eigen = heeftHuisLive(h.id);
        if (h.mesh && h.gebouwdMet !== undefined && !h.gebouwdMet.endsWith(String(eigen))) opruimen(h); // net gekocht: de vlag erbij
        if (!h.mesh) { if (h.props) opruimen(h); bouw(h, w); } // geen muren zonder getekend huisje (#434)
      } else if (d > STREAM_UIT && (h.mesh || h.props)) opruimen(h);
    }
  },
  camera() {},
  icon(ctx, s) {
    iconDisc(ctx, s, '#b8741c');
    ctx.save();
    ctx.scale(s, s);
    ctx.fillStyle = '#f2ede0';
    ctx.beginPath(); ctx.moveTo(-3.2, 0.2); ctx.lineTo(0, -3); ctx.lineTo(3.2, 0.2); ctx.lineTo(2.4, 0.2); ctx.lineTo(2.4, 3); ctx.lineTo(-2.4, 3); ctx.lineTo(-2.4, 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b8741c'; ctx.fillRect(-0.7, 0.9, 1.4, 2.1);
    ctx.restore();
  },
  mapSub(spot) {
    const h = huizen.find((q) => q.id === spot.id);
    if (!h) return 'Safehouse';
    return heeftHuisLive(h.id) ? `Jouw safehouse · ${h.adres}` : `Te koop · ${h.adres} · gratis als je het gebied veroverd hebt`;
  },
};

export const safehuisLijst = () => huizen;
export const huisVanGebied = (gebiedId) => huizen.find((h) => h.gebied === gebiedId) || null;

// Het snelreisanker: naar de deur van je eigen safehouse, met de bewakers van de kaartteleport (geen missie, geen politie, niet op het water).
export function reisNaarHuis(huisIdent) {
  const h = huizen.find((q) => q.id === huisIdent);
  if (!h || h.onbruikbaar || !wereld || !heeftHuisLive(huisIdent)) return false;
  const d = deur(h);
  return !!(wereld.cheatActions && wereld.cheatActions.teleport(d.x, d.y, h.naam, { reis: true })); // een snelreis voor jezelf, geen cheat: ook met meer spelers (#452)
}

// Voor spotcheck.js (de verhaaltest): elk huisje met de tegels eromheen plaatsen en de plek bij de deur geven. Een onbruikbaar huisje (geen droge, vrije plek in zijn
// gebied) bestaat niet in het spel en telt niet mee. onTiles(map, punt, straal, fn) laadt eerst de tegels.
export async function safehuisCheckSpots(world, onTiles) {
  if (!world || !world.map) return [];
  ververs(world);
  const uit = [];
  for (const h of huizen) {
    const d = await onTiles(world.map, { x: h.x, y: h.y }, 240, () => { plaats(h, world); return h.onbruikbaar ? null : deur(h); });
    if (d) uit.push({ kind: 'safehuis', id: h.naam, x: d.x, y: d.y, mode: 'walk' });
  }
  return uit;
}
