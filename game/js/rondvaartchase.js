// Missie 8, "Rondvaart met valse papieren": een heel rondje Diepenring met
// toeristen aan boord. Rustig begin, dan komt Schipper Wiebe (de echte
// eigenaar) in z'n sloep achter je aan. Botsingen maken de toeristen bang;
// rustig langs bezienswaardigheden varen (de gids vertelt) maakt ze blij.
// missions.js blijft de baas over checkpoints, timer en slagen/zakken.

import { paintSpeaker } from './speakers.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { boatDryPoints, inWaterPoly, keepBoatOffShore, normalizeAngle, pointInPolygon, clamp } from './util.js';
import { Vehicle, resolveVehicleBuildingCollision, vehicleContacts } from './vehicle.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { buildPersonMesh, seatPerson, seatedY } from './models3d_people.js';
import { HABBO_PALETTE } from './pixelart3d.js';
import { LINE as GIDS_LINE } from './sidejob_rondvaart.js';
import { isCinematicActive } from './cinematics.js';
import { playStoryVoice } from './audio.js';

// --- route ---------------------------------------------------------------------
// Clockwise from the Spilsluizen. The eastern arc (Turfsingel, Schuitendiep,
// Oosterhaven, Herebrug) is the Rondvaartgids side job's water centreline;
// the western arc (museum, Emmasingel, der A, Noorderhaven, Lopendediep) was
// grid-searched the same way over the water polygons minus houseboats,
// passing the Groninger Museum south of the island between the piers of the
// H.N. Werkmanbrug.
const WEST = [
  [152, 826], [144, 829], [124, 833], [102, 834], [82, 836], [60, 836], [38, 836], [16, 836], [-6, 836], [-28, 836], [-48, 832],
  [-70, 829], [-90, 823], [-110, 815], [-126, 808], [-146, 800], [-164, 793], [-184, 785], [-202, 775], [-208, 773], [-214, 770],
  [-220, 769], [-240, 762], [-260, 755], [-280, 746], [-300, 738], [-308, 734], [-326, 726], [-334, 718], [-350, 704], [-364, 688],
  [-379, 674], [-384, 662], [-384, 640], [-383, 618], [-381, 608], [-380, 588], [-380, 566], [-376, 544], [-376, 524], [-378, 504],
  [-380, 482], [-379, 474], [-376, 452], [-376, 430], [-376, 408], [-376, 386], [-377, 366], [-378, 354], [-378, 332], [-377, 316],
  [-375, 296], [-374, 282], [-374, 260], [-374, 240], [-378, 218], [-385, 198], [-394, 180], [-406, 162], [-420, 146], [-436, 131],
  [-452, 117], [-467, 102], [-478, 90], [-489, 72], [-500, 54], [-513, 36], [-518, 20], [-516, 6], [-513, 4], [-500, -10],
  [-484, -26], [-468, -39], [-450, -48], [-432, -58], [-426, -62], [-408, -72], [-390, -82], [-374, -90], [-362, -97], [-344, -107],
  [-328, -116], [-310, -126], [-290, -134], [-270, -143], [-250, -152], [-232, -161], [-214, -169], [-196, -178], [-178, -187],
  [-160, -196], [-140, -206], [-122, -216], [-118, -217], [-98, -224], [-78, -232], [-58, -241], [-38, -247], [-18, -256], [0, -267],
  [20, -275], [22, -276], [40, -288], [60, -296], [72, -300],
];
const FINISH_AT = 96; // WEST index of the finish, just short of the start berth

// where the side job's line hugs one quay in the Schuitendiep, these pull it
// back to mid-channel
const MID_CHANNEL = [[505.4, 85], [504.4, 79.3], [502.4, 74], [558.7, 200.8], [555.7, 195.8], [553.1, 190.5], [611.8, 301.8], [608.3, 297.6], [605.8, 292.8], [603.2, 288.1]];

const PTS = [
  [-28, -251], ...WEST.slice(98, 103),
  ...GIDS_LINE.slice().reverse(),
  ...WEST.slice(1, FINISH_AT + 1),
];
for (const q of MID_CHANNEL) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < PTS.length - 1; i++) {
    const [ax, ay] = PTS[i], [bx, by] = PTS[i + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((q[0] - ax) * dx + (q[1] - ay) * dy) / l2, 0, 1);
    const d = Math.hypot(ax + dx * t - q[0], ay + dy * t - q[1]);
    if (d < bd) { bd = d; bi = i; }
  }
  PTS.splice(bi + 1, 0, q);
}
const CUM = [];
export let ROUTE_LENGTH = 0;
function measure() {
  CUM.length = 0;
  CUM.push(0);
  for (let i = 1; i < PTS.length; i++) CUM.push(CUM[i - 1] + Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][1] - PTS[i - 1][1]));
  ROUTE_LENGTH = CUM[CUM.length - 1];
}
measure();

// Once per session, with the live map (procedural houseboats and all): slide
// the line sideways to where the widest boat still fits, then smooth it, so
// the guidance and Wiebe's sloep keep off the quays in the narrow stretches.
let refined = false;
function refineRoute(map) {
  if (refined) return;
  refined = true;
  const probe = { model: { len: 5.2, wid: 1.9 } };
  const offs = [0];
  for (let o = 0.5; o <= 3.5; o += 0.5) offs.push(o, -o);
  const samples = [];
  for (let s = 0; s <= ROUTE_LENGTH; s += 3) {
    const q = routeAt(s);
    const nx = -Math.sin(q.a), ny = Math.cos(q.a);
    let off = 0;
    search: for (const wid of [5.5, 4.5, 3.5, 2.6]) {
      probe.model.wid = wid;
      for (const o of offs) {
        if (boatDryPoints(map, probe, q.x + nx * o, q.y + ny * o, q.a) === 0) { off = o; break search; }
      }
    }
    samples.push({ q, nx, ny, off });
  }
  const sm = samples.map((_, i) => {
    let sum = 0, n = 0;
    for (let k = i - 3; k <= i + 3; k++) if (samples[k]) { sum += samples[k].off; n++; }
    return i === 0 || i === samples.length - 1 ? 0 : sum / n;
  });
  const last = PTS[PTS.length - 1];
  const out = [PTS[0]];
  for (let i = 2; i < samples.length - 1; i += 2) {
    const { q, nx, ny } = samples[i];
    out.push([q.x + nx * sm[i], q.y + ny * sm[i]]);
  }
  out.push(last);
  PTS.length = 0;
  PTS.push(...out);
  measure();
}

function nearestOnRoute(x, y, i0 = 0, i1 = PTS.length - 1) {
  let best = null;
  for (let i = Math.max(0, i0); i < Math.min(PTS.length - 1, i1); i++) {
    const [ax, ay] = PTS[i], [bx, by] = PTS[i + 1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const px = ax + dx * t, py = ay + dy * t;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    if (!best || d2 < best.d2) {
      const len = Math.sqrt(l2);
      best = { d2, i, s: CUM[i] + t * len, lat: ((x - ax) * -dy + (y - ay) * dx) / len };
    }
  }
  best.d = Math.sqrt(best.d2);
  return best;
}

// Progress along the route, searched near the last known segment so the
// start and finish (which lie side by side) never get confused.
function track(x, y, hint) {
  let r = hint == null ? nearestOnRoute(x, y) : nearestOnRoute(x, y, hint - 6, hint + 14);
  if (hint != null && r.d > 35) {
    const full = nearestOnRoute(x, y, hint - 40, hint + 60);
    if (full.d < r.d) r = full;
  }
  return r;
}

export function routeAt(s) {
  s = clamp(s, 0, ROUTE_LENGTH);
  let i = 0;
  while (i < PTS.length - 2 && CUM[i + 1] < s) i++;
  const [ax, ay] = PTS[i], [bx, by] = PTS[i + 1];
  const len = CUM[i + 1] - CUM[i] || 1;
  const t = (s - CUM[i]) / len;
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, a: Math.atan2(by - ay, bx - ax), i };
}

function sOf(x, y) {
  return nearestOnRoute(x, y).s;
}

// For other races over the same water (postgame.js Elf Bruggenrace):
// refine the line once for the live map, then follow progress along it.
export function prepareDiepenringRoute(map) {
  refineRoute(map);
}

export function diepenringProgress(x, y, hint = null) {
  const r = track(x, y, hint);
  return { s: r.s, d: r.d, i: r.i };
}

// Checkpoints under the Diepenring's bridges; `via` points in between keep
// the minimap line and the guidance dots on the water.
const CHECKPOINTS = [
  { at: [229, -275], bridge: 'Maagdenbrug' },
  { at: [455, -51], bridge: 'Sint Jansbrug' },
  { at: [511, 111], bridge: 'Poelebrug' },
  { at: [601, 283], bridge: 'Steentilbrug' },
  { at: [719, 507], bridge: 'Trompbrug' },
  { at: [353, 757], bridge: 'Herebrug' },
  { at: [60, 836], bridge: 'H.N. Werkmanbrug' },
  { at: [-208, 773], bridge: 'Emmabrug' },
  { at: [-377, 316], bridge: 'A-brug' },
  { at: [-452, 117], bridge: 'Visserbrug' },
  { at: [-270, -143], bridge: "Kijk in 't Jatbrug" },
  { at: PTS[PTS.length - 1], bridge: 'Spilsluizen' },
];
const VIA_STEP = 70;
const CP_SLACK = 12; // m of time bonus buffer per checkpoint on top of the sailing time
const CP_SPEED = 5.8; // m/s the time bonus is budgeted at

export function rondvaartWaypoints() {
  const out = [];
  let s0 = 0;
  for (const cp of CHECKPOINTS) {
    const s1 = sOf(cp.at[0], cp.at[1]);
    const n = Math.floor((s1 - s0) / VIA_STEP);
    for (let k = 1; k <= n; k++) {
      const s = s0 + (s1 - s0) * (k / (n + 1));
      const p = routeAt(s);
      out.push({ x: p.x, y: p.y, via: true });
    }
    const p = routeAt(s1);
    out.push({ x: p.x, y: p.y, bridge: cp.bridge, bonus: Math.round((s1 - s0) / CP_SPEED + CP_SLACK) });
    s0 = s1;
  }
  return out;
}

// The tour boat lies moored alongside the quay on the Spilsluizen side, bow
// towards the route, with the start marker on the quay next to it: slide out
// from the route line to the quay (left bank) until the hull would touch,
// back off a hand's width, and skip spots where a houseboat is moored.
const BERTH_FALLBACK = { start: { x: -33.8, y: -261.6 }, boat: { x: -33.0, y: -259.5, angle: -0.37 } };

export function rondvaartBerth(map) {
  const probe = { model: { len: 5.2, wid: 1.9 } };
  const hl = probe.model.len / 2;
  // the whole length of the hull must lie against the quay itself, not
  // against a houseboat moored there (those count as water obstacles)
  const againstQuay = (x, y, a, nx, ny) => [-hl, 0, hl].every((l) => {
    const px = x + Math.cos(a) * l + nx * (probe.model.wid / 2 + 1.6), py = y + Math.sin(a) * l + ny * (probe.model.wid / 2 + 1.6);
    return !inWaterPoly(map, px, py);
  });
  for (let s = 4; s <= 70; s += 3) {
    const q = routeAt(s);
    const nx = Math.sin(q.a), ny = -Math.cos(q.a);
    let last = null;
    for (let o = 0; o <= 22; o += 0.25) {
      if (boatDryPoints(map, probe, q.x + nx * o, q.y + ny * o, q.a) > 0) break;
      last = o;
    }
    if (last == null || last < 1) continue;
    const off = Math.max(0, last - 0.3);
    const bx = q.x + nx * off, by = q.y + ny * off;
    if (!againstQuay(bx, by, q.a, nx, ny)) continue;
    for (let m = 1.5; m <= 7; m += 0.5) {
      const sx = bx + nx * (probe.model.wid / 2 + m), sy = by + ny * (probe.model.wid / 2 + m);
      if (inWaterPoly(map, sx, sy) || map.buildingsNear(sx, sy, 1).some((b) => pointInPolygon(sx, sy, b.pts))) continue;
      return { start: { x: sx, y: sy }, boat: { x: bx, y: by, angle: q.a } };
    }
  }
  return BERTH_FALLBACK;
}

// --- sights ----------------------------------------------------------------------

// The guide's tour, in sailing order. `at` is the thing itself; the story
// starts where the route passes closest to it. Facts are kept to what is
// well documented; the jokes are clearly jokes.
const SIGHTS = [
  { at: [120, -330], name: 'de Stadsschouwburg', line: 'Links, aan de Turfsingel: de Stadsschouwburg, geopend in 1883. De Turfsingel heet zo omdat hier de turf uit de venen werd aangevoerd. Brandstof voor de hele stad.' },
  { at: [214, 13], name: "d'Olle Grieze", line: "Rechts over de daken: de Martinitoren, zo'n 97 meter hoog en rond 1482 voltooid. De Stadjers noemen hem d'Olle Grieze: de oude grijze." },
  { at: [265, -205], name: 'de Prinsentuin', line: 'Rechts de Prinsenhoftuin, aangelegd in 1625 bij het Prinsenhof, waar de stadhouders woonden. Met rozen, kruiden en een beroemde zonnewijzer.' },
  { at: [505, 91], name: 'het Schuitendiep', line: 'Dit is het Schuitendiep. Hier legden de schuiten aan, platte vrachtschepen die de stad bevoorraadden. Rechts de Poelestraat: overdag stil, om vier uur \'s nachts het drukste stukje Grunn.' },
  { at: [601, 283], name: 'de Steentilbrug', line: 'We gaan onder de Steentilbrug door. "Til" is Gronings voor brug, dus eigenlijk heet hij gewoon de stenen brug.' },
  { at: [744, 390], name: 'de Oosterhaven', line: 'De Oosterhaven: vroeger een drukke binnenhaven, nu vol woonboten. Tuinen die meebewegen. Zwaai maar, ze zwaaien terug.' },
  { at: [375, 753], name: 'de Herebrug', line: 'De Herebrug verbindt de Herestraat met de Hereweg: eeuwenlang de hoofdroute de stad uit, naar het zuiden en Drenthe. Gaat hij open, dan staat half Grunn te wachten.' },
  { at: [102, 834], name: 'het Groninger Museum', line: 'Links het Groninger Museum, geopend in 1994, op een eiland in het kanaal. Ontworpen door Alessandro Mendini, met paviljoens van onder anderen Philippe Starck en Coop Himmelb(l)au. Ja, het hoort zo scheef.' },
  { at: [60, 836], name: 'de Werkmanbrug', line: 'Deze brug is vernoemd naar Hendrik Werkman, drukker en kunstenaar van De Ploeg. Hij werd in april 1945 door de bezetter gefusilleerd, een paar dagen voor Groningen werd bevrijd.' },
  { at: [-60, 948], name: 'het Hoofdstation', line: 'Links, achter de bomen: het Hoofdstation uit 1896. Van buiten een paleis, van binnen een van de mooiste stationshallen van het land.' },
  { at: [-208, 773], name: 'de Emmabrug', line: 'De Emmabrug, net als de Emmasingel vernoemd naar koningin Emma. Hier komen studenten aan met één koffer en vertrekken ze tien jaar later met drie fietsen.' },
  { at: [-376, 250], name: 'de Hoge der A', line: 'De Hoge en de Lage der A, de oude stadshaven aan het riviertje de A. De pakhuizen komen uit de tijd dat de schepen via het Reitdiep naar zee voeren.' },
  { at: [-200, 359], name: 'de Der Aa-kerk', line: 'Rechts de Der Aa-kerk, voluit de Onze Lieve Vrouwe der A-kerk, vernoemd naar datzelfde riviertje. De toren is een paar keer ingestort; de huidige staat er sinds het begin van de achttiende eeuw.' },
  { at: [-408, -72], name: 'de Noorderhaven', line: 'De Noorderhaven, ooit de haven voor de zeeschepen. Nu liggen hier oude zeilschepen en woonboten. De eenden betalen geen liggeld.' },
  { at: [-270, -143], name: "de Kijk in 't Jatbrug", line: "De Kijk in 't Jatbrug, genoemd naar de Kijk in 't Jatstraat. Die dankt zijn naam aan een toren in de oude stadsmuur." },
  { at: [-143, -32], name: 'het Academiegebouw', line: 'Rechts, verderop: het Academiegebouw van de universiteit, die in 1614 werd opgericht. Het huidige gebouw is van 1909; het vorige brandde in 1906 af.' },
];
const WELCOME = 'Welkom aan boord! We varen een rondje over de Diepenring, de gracht rond de binnenstad, grotendeels gegraven in de zeventiende eeuw toen Grunn werd uitgebreid en een nieuwe vestinggordel kreeg.';
const SIGHT_R = 40;
const SIGHT_SLOW = 5.2;
const SIGHT_HOLD = 0.8;
const SIGHT_JOY = 8;

// --- tuning ------------------------------------------------------------------------

const JOY_START = 100;
const BUMP_DV = 1.8; // m/s of sudden velocity change in one step that counts as a bump
const BUMP_COOLDOWN = 0.7;
const CALM_AFTER = 6;
const CALM_RATE = 0.3;
const CALM_CAP = 60; // calm water settles nerves, but only the guide's stories make them truly happy
const MEGAPHONE_R = 22;
const MEGAPHONE_RATE = 0.15;

const WIEBE_MODEL = { name: 'sloep', len: 4.6, wid: 1.8, maxSpeed: 11.6, accel: 3.3, brake: 4.2, turnRate: 1.35, color: '#2e6b3f', cabin: '#e9e4d4' };
const WIEBE_GRIP = 6; // m/s^2 lateral, like a player boat, so he corners no better than you
const WIEBE_SPAWN_BACK = 125;
const WIEBE_SPAWN_MIN_DIST = 95;
const RAM_R = 34;
const RAM_COOLDOWN = 6.5;
const RAM_MAX_T = 5.5;
const BLOCK_MAX_T = 5.5;
const BRIDGE_CUTOFF_AHEAD = 85;
const HULL_START = 100;

const WIEBE = 'Schipper Wiebe';
const SHOUT = {
  appear: ['HÉ! DAT IS MIEN BOOT! KLAAS, IK WEET DAT JIJ DIT BENT!'],
  chase: [
    'Aanleggen! Nou! Of ik bel de havenmeester!',
    'Die toeristen hebben bij MIJ betaald!',
    'Dat schip is ouder dan jullie bij elkaar!',
    'Moi? MOI?! Niks moi!',
    'Dit is gain rondvaart, dit is een ontvoering!',
    'Ik ken elke brug in Grunn. Jullie niet!',
    'Ik haal je in, al moet ik tot Delfzijl!',
    'Dames en heren, u zit op een gestolen boot!',
    'Ik heb dertig jaar vaarbewijs, jij dertig seconden!',
    'Die gids weet niks! Die toren is niet eens scheef!',
    'Mien boot! Mien toeristen! Mien fooien!',
    'Wie leert jou varen? Een eend?',
    'Ik ruik je dieselwalm tot hier, prutser!',
    'Ze krijgen hun geld terug! Van JOU!',
    'Nog één brug en ik heb je, Klaas!',
    'Stuur eens recht, je vaart als een fietser op een ijsbaan!',
    'Havenmeester! HAVENMEESTER!',
  ],
  ram: ['BOEM! Nog een keer?', 'Zo! Dat was voor mien lak!', 'Aan de kant, zoetwatermatroos!', 'Tik! Nou jij weer!', 'Dat was nummer één, er komen er meer!', 'Hou je vast, dames en heren!'],
  block: ['Hier kom je niet langs! Dit is MIEN diep!', 'Brug dicht! Voor jou wel!', 'Voorrang? Die heb ik altijd!', 'Hier ligt Wiebe. Keer maar om!'],
  brake: ['Remmen kan ik ook!', 'Stop! Tol betalen!'],
  crash: ['Au! Die kade stond er gisteren nog niet!', 'Mien lak! Mien mooie lak!', 'Wie heeft die kade hier neergelegd?!', 'Dat was de kade. De kade is niet van mij.', 'Oei. Dat voelde ik in mien knieën.'],
  far: ['Ik zie je wel, Klaas! Ik zie je WEL!', 'Wacht maar tot ik bij het museum ben!', 'Ik ben er zo! Ik moet alleen even langs deze woonboot!', 'Rennen kan je niet op het water, Klaas!'],
  knock: ['Ik buk voor niemaAU! Mien kop!'],
  sunk: ['Mien motor! Mien mooie motor! Nou vaart hij niet meer!'],
  after: ['Dit is nog niet voorbij, Klaas!'],
};

const BUMP_SOFT = [
  'Tik! Een toerist morst koffie over z\'n kaart van Grunn.',
  'Schrap langs de kade. "Is this part of the tour?"',
  'Bonk. Een Duitse toerist klapt uit beleefdheid.',
];
const BUMP_HARD = [
  'KLABAM! Een toerist omhelst een wildvreemde.',
  'Dreun! Er ligt een selfiestick in het Diep.',
  'Boem! "Ich will aussteigen!"',
  'Krak! De toeristen checken hun reisverzekering.',
];
const BUMP_RAM = [
  'Wiebe ramt je! De toeristen gillen in vier talen.',
  'Dreun van Wiebe! Een toerist belt z\'n ambassade.',
  'Wiebe knalt erop! Iemand vraagt of dit een Gronings gebruik is.',
];

// --- voice (optional recordings, keyed "<speaker>|<text>" like the story) ----------

const VOICE_DIR = new URL('../audio/voicelines/story/', import.meta.url).href;
let voices = {};
fetch(VOICE_DIR + 'manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { voices = m || {}; }).catch(() => {});

// --- subtitles -------------------------------------------------------------------

let subEl = null;
function subtitleEl() {
  if (subEl) return subEl;
  subEl = document.createElement('div');
  subEl.id = 'rv-sub';
  subEl.setAttribute('aria-live', 'polite');
  Object.assign(subEl.style, {
    position: 'fixed', left: '50%', bottom: '17vh', transform: 'translateX(-50%)', width: 'min(86vw, 760px)',
    textAlign: 'center', font: "clamp(15px, 1.5vw, 20px) 'Arial Narrow', Arial, sans-serif", color: '#fff',
    letterSpacing: '0.3px', textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.6)', pointerEvents: 'none',
    opacity: '0', transition: 'opacity 0.25s', zIndex: '40',
  });
  subEl.innerHTML = '<span class="rv-speaker" style="font-weight:bold;margin-right:6px"></span><span class="rv-line"></span>';
  document.body.appendChild(subEl);
  return subEl;
}

// --- figures on the boats ------------------------------------------------------------

const TOURIST_LOOKS = [
  { shirt: 0xe0473c, skin: HABBO_PALETTE.woodLight, variant: 'female', seed: 2203, hairStyle: 'bun' },
  { shirt: 0xf2c230, skin: HABBO_PALETTE.woodMid, variant: 'male', seed: 2291 },
  { shirt: 0x3a8fd9, skin: HABBO_PALETTE.woodLight, variant: 'male', seed: 2377 },
];
const WIEBE_LOOK = { shirt: 0x1d3557, skin: HABBO_PALETTE.woodLight, variant: 'male', seed: 2441 };

function touristGroup(v) {
  const g = new THREE.Group();
  const hl = v.model.len / 2;
  const seats = [[hl * 0.35, 0.42], [hl * 0.35, -0.42], [-hl + 0.35, 0]];
  g.userData.people = seats.map(([x, z], k) => {
    const m = buildPersonMesh(TOURIST_LOOKS[k].shirt, TOURIST_LOOKS[k].skin, TOURIST_LOOKS[k]);
    seatPerson(m, false, { recline: 0.08, footX: 0.44, footY: -0.28, arms: 'lap' });
    m.position.set(x, seatedY(m, 0.39), z);
    m.rotation.y = k === 2 ? 0 : (z > 0 ? -0.25 : 0.25);
    g.add(m);
    return m;
  });
  return g;
}

function wiebeGroup(v) {
  const g = new THREE.Group();
  const m = buildPersonMesh(WIEBE_LOOK.shirt, WIEBE_LOOK.skin, WIEBE_LOOK);
  m.position.set(-v.model.len * 0.22, 0.14, 0);
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.045, 0.34, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xf4f1e8, side: THREE.DoubleSide }));
  horn.rotation.z = -Math.PI / 2;
  horn.position.set(0.36, 1.5, -0.1);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.05, 10, 1, true), new THREE.MeshLambertMaterial({ color: 0xd23b2f, side: THREE.DoubleSide }));
  band.rotation.z = -Math.PI / 2;
  band.position.set(0.5, 1.5, -0.1);
  m.add(horn, band);
  g.add(m);
  g.userData.man = m;
  g.userData.horn = [horn, band];
  return g;
}

function ensureDecor(v, key, build) {
  const mesh = getVehicleMesh(v.id);
  if (!mesh) return null;
  if (!mesh.userData[key]) {
    mesh.userData[key] = build(v);
    mesh.add(mesh.userData[key]);
  }
  return mesh.userData[key];
}

function dropDecor(v, key) {
  const mesh = v && getVehicleMesh(v.id);
  if (!mesh || !mesh.userData[key]) return;
  mesh.remove(mesh.userData[key]);
  mesh.userData[key] = null;
}

function animateTourists(g, st, t) {
  const scared = t - st.lastBumpAt < 1.6 || st.joy < 30;
  const cheer = t - st.lastJoyAt < 2.2;
  g.userData.people.forEach((m, k) => {
    const ud = m.userData;
    const ph = t * (scared ? 9 : 3) + k * 1.7;
    if (scared) {
      ud.armL.rotation.set(-0.3, 0, 2.7 + Math.sin(ph) * 0.25);
      ud.armR.rotation.set(0.3, 0, 2.7 - Math.sin(ph) * 0.25);
      if (ud.elbowL) { ud.elbowL.rotation.z = 0.3; ud.elbowR.rotation.z = 0.3; }
    } else if (cheer || (st.joy > 75 && Math.sin(t * 0.7 + k * 2.1) > 0.93)) {
      ud.armL.rotation.set(0, 0, 0.35);
      ud.armR.rotation.set(0.25, 0, 2.5 + Math.sin(ph * 2.4) * 0.35);
      if (ud.elbowR) ud.elbowR.rotation.z = 0.5;
    } else {
      ud.armL.rotation.set(0, 0, 0.35);
      ud.armR.rotation.set(0, 0, 0.35);
      if (ud.elbowL) { ud.elbowL.rotation.z = 1.05; ud.elbowR.rotation.z = 1.05; }
    }
    ud.head.rotation.y = scared ? Math.sin(ph * 1.3) * 0.5 : Math.sin(t * 0.4 + k) * 0.4;
  });
}

function animateWiebe(g, w, t) {
  const m = g.userData.man, ud = m.userData;
  if (w.out) {
    const k = clamp((t - w.outAt) / 0.5, 0, 1);
    m.rotation.z = -1.35 * k;
    m.position.y = 0.14 + 0.1 * k;
    ud.armL.rotation.set(0, 0, 2.2 * k);
    ud.armR.rotation.set(0, 0, 2.2 * k);
    return;
  }
  m.rotation.z = 0;
  const shouting = t - w.shoutAt < 2.5;
  ud.armR.rotation.set(-0.2, 0, shouting ? 1.1 : 0.9);
  if (ud.elbowR) ud.elbowR.rotation.z = 1.9;
  ud.armL.rotation.set(0, 0, shouting ? 1.6 + Math.sin(t * 8) * 0.5 : 0.3);
  if (ud.elbowL) ud.elbowL.rotation.z = shouting ? 0.6 : 0.2;
  ud.head.rotation.z = shouting ? Math.sin(t * 9) * 0.06 : 0;
}

// --- state -----------------------------------------------------------------------------

let st = null;
let bridgeS = null;
let triggerS = null;
const wiebeTriggerS = () => triggerS ?? (triggerS = sOf(CHECKPOINTS[1].at[0], CHECKPOINTS[1].at[1]));
let werkmanS = 0;

// Shuffle bag per line list: every line once before any repeats, and never
// the same line twice in a row across a refill.
const bags = new Map();
function pick(list) {
  let bag = bags.get(list);
  if (!bag || !bag.left.length) {
    const left = list.slice();
    for (let i = left.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [left[i], left[j]] = [left[j], left[i]];
    }
    const last = bag && bag.last;
    if (left.length > 1 && left[left.length - 1] === last) [left[0], left[left.length - 1]] = [left[left.length - 1], left[0]];
    bag = { left, last };
    bags.set(list, bag);
  }
  bag.last = bag.left.pop();
  return bag.last;
}

function findBridges(map) {
  if (bridgeS) return bridgeS;
  refineRoute(map);
  const out = [];
  let inside = false, start = 0;
  for (let s = 0; s <= ROUTE_LENGTH; s += 2) {
    const p = routeAt(s);
    const on = map.isOnBridge(p.x, p.y);
    if (on && !inside) { inside = true; start = s; }
    if (!on && inside) { inside = false; out.push((start + s) / 2); }
  }
  bridgeS = out;
  werkmanS = sOf(60, 836);
  return out;
}

export function startRondvaart(world, boat) {
  stopRondvaart(world);
  findBridges(world.map);
  st = {
    world,
    boat,
    joy: JOY_START,
    bumps: 0,
    lastBumpAt: -99,
    lastJoyAt: -99,
    bumpMsgAt: -99,
    moodShown: 100,
    prevVel: null,
    ps: 0,
    pi: null,
    sights: SIGHTS.map((q) => {
      const s = sOf(q.at[0], q.at[1]);
      const p = routeAt(s);
      return { ...q, s, px: p.x, py: p.y, hold: 0, done: false };
    }).sort((a, b) => a.s - b.s),
    welcomed: false,
    slowHintShown: false,
    wiebe: null,
    wiebeGone: false,
    contactCursor: vehicleContacts.head,
    sub: null,
    subQueue: [],
    t: 0,
    cheerAt: 3,
  };
}

export function stopRondvaart(world) {
  if (!st) return;
  const w = st.wiebe;
  if (w && w.v) {
    const v = w.v;
    v.scripted = false;
    v.waterPoly = world.map.waterNear(v.x, v.y, 1).find((q) => pointInPolygon(v.x, v.y, q.pts)) || null;
    if (w.out) v.speed = 0;
  }
  dropDecor(st.boat, 'rvTourists');
  if (subEl) subEl.style.opacity = '0';
  st = null;
}

export function rondvaartStatus() {
  if (!st) return null;
  const w = st.wiebe;
  const near = w && !w.out ? Math.hypot(w.v.x - st.boat.x, w.v.y - st.boat.y) : Infinity;
  return { joy: Math.round(st.joy), bumps: st.bumps, wiebeDist: near < 90 ? Math.round(near) : null };
}

export function rondvaartTip() {
  if (!st) return 0;
  const j = clamp(st.joy, 0, 100);
  return Math.round((j * j) / 100 * 3);
}

export function rondvaartOutro() {
  const j = st ? st.joy : 50;
  if (j >= 85) return 'Rondje Diepenring! De toeristen klappen, geven dikke fooi en boeken meteen voor morgen. Wiebe zoekt z\'n boot nog.';
  if (j >= 55) return 'Rondje Diepenring voltooid. Een paar blauwe plekken, maar de fooienpot rammelt. Wiebe zoekt z\'n boot nog.';
  return 'Rondje Diepenring gehaald, net. De toeristen kussen de kade en geven een fooi uit medelijden.';
}

// --- subtitles & shouts ------------------------------------------------------------------

// prio: an event line cuts in (drops that speaker's queued chatter). guide:
// the tour never gets dropped, it waits in line ahead of any chatter.
function say(speaker, text, color, prio = false, guide = false) {
  const voice = voices[speaker + '|' + text];
  const item = { speaker, text, color, guide, dur: Math.max(clamp(1.4 + text.length * 0.052, 2.2, guide ? 10 : 5), voice ? voice.dur + 0.3 : 0) };
  if (guide) {
    st.subQueue = st.subQueue.filter((q) => q.guide || q.prio);
    st.subQueue.push(item);
  } else if (prio) {
    item.prio = true;
    st.subQueue = st.subQueue.filter((q) => q.speaker !== speaker);
    const at = st.subQueue.findIndex((q) => q.guide);
    st.subQueue.splice(at < 0 ? 0 : at, 0, item);
    if (st.sub && st.sub.speaker === speaker) st.sub = null;
  } else if (!st.subQueue.length) st.subQueue.push(item);
}

function updateSubs(dt) {
  const el = subtitleEl();
  const hidden = isCinematicActive();
  if (st.sub) {
    st.sub.left -= dt;
    if (st.sub.left <= 0) st.sub = null;
  }
  if (!st.sub && st.subQueue.length && !hidden) {
    const it = st.subQueue.shift();
    st.sub = { ...it, left: it.dur };
    paintSpeaker(el.querySelector('.rv-speaker'), it.speaker);
    el.querySelector('.rv-line').textContent = it.text;
    const voice = voices[it.speaker + '|' + it.text];
    if (voice) playStoryVoice(VOICE_DIR + voice.src);
  }
  el.style.opacity = st.sub && !hidden ? '1' : '0';
}

const SHOUT_GAP = 7; // s of quiet after any line before chatter may follow
const EVENT_GAP = 3; // event lines (rams, crashes) interrupt, but not back to back
const ALWAYS = new Set(['appear', 'knock', 'sunk', 'after']);

function shout(kind, force = false) {
  const w = st.wiebe;
  if (!w) return;
  const since = st.t - w.shoutAt;
  if (!force && since < SHOUT_GAP) return;
  if (force && !ALWAYS.has(kind) && since < EVENT_GAP) return;
  w.shoutAt = st.t;
  w.nextChatAt = st.t + 11 + Math.random() * 7;
  say(WIEBE + ' (megafoon)', pick(SHOUT[kind]), '#ffcf4a', force);
}

function guideName(world) {
  return world.player.character === 'anita' ? 'Anita' : 'Tammo';
}

// --- happiness ---------------------------------------------------------------------------

function scare(amount, msg) {
  const world = st.world;
  st.joy = Math.max(0, st.joy - amount);
  st.bumps++;
  st.lastBumpAt = st.t;
  if (msg && st.t - st.bumpMsgAt > 2.2) {
    st.bumpMsgAt = st.t;
    world.addMessage(`${msg} (toeristen -${Math.round(amount)})`, 2.6);
  }
}

function cheer(amount) {
  st.joy = Math.min(100, st.joy + amount);
  st.lastJoyAt = st.t;
}

function moodMessages(world) {
  const j = st.joy;
  const steps = [[60, 'De toeristen kijken nerveus naar de kant. Rustig aan, kaptein.'], [30, 'De toeristen zoeken de dichtstbijzijnde kade. Nog één klap en ze springen!']];
  for (const [lvl, text] of steps) {
    if (j < lvl && st.moodShown > lvl) { st.moodShown = lvl; world.addMessage(text, 3.2); }
  }
  if (j >= 75) st.moodShown = 100;
  else if (j >= 45 && st.moodShown < 60) st.moodShown = 60;
}

function boatVel(v) {
  return [Math.cos(v.angle) * v.speed + v.driftX, Math.sin(v.angle) * v.speed + v.driftY];
}

// Sudden velocity changes of the tour boat: quays, houseboats, piers, other
// boats and Wiebe's rams all show up here, the size of the jolt being the
// strength of the impact.
function checkBumps(world, driving) {
  const v = st.boat;
  const w = st.wiebe;
  let ram = 0;
  for (; st.contactCursor < vehicleContacts.head; st.contactCursor++) {
    if (vehicleContacts.head - st.contactCursor > vehicleContacts.cap) continue;
    const c = vehicleContacts.list[st.contactCursor % vehicleContacts.cap];
    if (!w || !((c.a === v && c.b === w.v) || (c.a === w.v && c.b === v))) continue;
    const n = c.a === v ? [c.nx, c.ny] : [-c.nx, -c.ny];
    const [pvx, pvy] = boatVel(v), [wvx, wvy] = boatVel(w.v);
    const mine = pvx * n[0] + pvy * n[1];
    const his = -(wvx * n[0] + wvy * n[1]);
    if (mine > his + 1 && c.impact > 2) {
      w.hull -= c.impact * 7;
      w.hitByPlayerAt = st.t;
    } else if (c.impact >= 1.5) {
      w.rammedAt = st.t;
      ram = Math.max(ram, c.impact);
    }
  }
  if (!driving || isCinematicActive()) { st.prevVel = null; return; }
  const vel = boatVel(v);
  let dv = 0;
  if (st.prevVel) dv = Math.hypot(vel[0] - st.prevVel[0], vel[1] - st.prevVel[1]);
  st.prevVel = vel;
  if (st.t - st.lastBumpAt < BUMP_COOLDOWN) return;
  if (ram > 0) {
    scare(clamp(2 + ram * 0.75, 2, 10), pick(BUMP_RAM));
  } else if (dv > BUMP_DV) {
    const amount = clamp((dv - 1.4) * 2.4, 2, 28);
    scare(amount, amount > 10 ? pick(BUMP_HARD) : pick(BUMP_SOFT));
  }
}

function updateSights(dt, world, speed) {
  const v = st.boat;
  for (const q of st.sights) {
    if (q.done || q.gone) continue;
    if (st.ps > q.s + 20) { q.gone = true; continue; }
    if (st.ps < q.s - SIGHT_R - 10) continue;
    const d = Math.hypot(v.x - q.px, v.y - q.py);
    if (d > SIGHT_R) continue;
    if (speed < SIGHT_SLOW) {
      q.hold += dt;
      if (q.hold >= SIGHT_HOLD) {
        q.done = true;
        say(`${guideName(world)} (gids)`, q.line, '#7fd4ff', false, true);
        cheer(SIGHT_JOY);
        world.addMessage(`Klik klik: de toeristen fotograferen ${q.name} (+${SIGHT_JOY})`, 2.6);
      }
    } else if (!st.slowHintShown) {
      st.slowHintShown = true;
      world.addMessage(`Gas eraf bij ${q.name}: dan vertelt de gids en worden de toeristen vrolijker.`, 3.6);
    }
    break;
  }
}

// --- Schipper Wiebe ------------------------------------------------------------------------

function poseClear(map, v, x, y, a) {
  if (boatDryPoints(map, v, x, y, a) > 0) return false;
  const c = Math.cos(a), s = Math.sin(a);
  const h = v.model.len / 2 + 1.2, w = v.model.wid / 2 + 1.2;
  for (const [lx, ly] of [[h, 0], [-h, 0], [0, w], [0, -w], [h, w], [h, -w], [-h, w], [-h, -w]]) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (!inWaterPoly(map, px, py)) return false;
    if (map.buildingsNear(px, py, 1).some((b) => pointInPolygon(px, py, b.pts))) return false;
  }
  return true;
}

// Out of sight behind the player (well back along the canal, round a bend),
// on open water: he is heard before he is seen, and never pops up in view.
function spawnWiebe(world) {
  const map = world.map, p = st.boat;
  const probe = new Vehicle(0, 0, 0, WIEBE_MODEL);
  probe.isBoat = true;
  for (let back = WIEBE_SPAWN_BACK; back <= WIEBE_SPAWN_BACK + 80; back += 8) {
    const s = st.ps - back;
    if (s < 20) break;
    const q = routeAt(s);
    if (Math.hypot(q.x - p.x, q.y - p.y) < WIEBE_SPAWN_MIN_DIST) continue;
    for (const lat of [0, 1.5, -1.5]) {
      const x = q.x - Math.sin(q.a) * lat, y = q.y + Math.cos(q.a) * lat;
      if (!poseClear(map, probe, x, y, q.a)) continue;
      const v = new Vehicle(x, y, q.a, { ...WIEBE_MODEL });
      v.isBoat = true;
      v.scripted = true;
      v.driver = 'wiebe';
      v.speed = 6;
      world.vehicles.push(v);
      return { v, mode: 'chase', modeT: 0, hull: HULL_START, s, wi: q.i, shoutAt: -99, rammedAt: -99, hitByPlayerAt: -99, ramReadyAt: 0, stuckT: 0, reverseT: 0, crashAt: -99, blockAt: -99, out: false, outAt: 0 };
    }
  }
  return null;
}

function playerLat() {
  const p = st.boat;
  return (st.pi == null ? nearestOnRoute(p.x, p.y) : nearestOnRoute(p.x, p.y, st.pi - 4, st.pi + 6)).lat;
}

function setMode(w, mode) {
  w.mode = mode;
  w.modeT = 0;
}

function latClamp(map, s, lat) {
  const q = routeAt(s);
  const nx = -Math.sin(q.a), ny = Math.cos(q.a);
  for (const k of [lat, lat * 0.5, 0]) {
    const edge = k + Math.sign(k || 1) * 2.6;
    if (inWaterPoly(map, q.x + nx * edge, q.y + ny * edge)) return { x: q.x + nx * k, y: q.y + ny * k };
  }
  return { x: q.x, y: q.y };
}

// the fastest he can take the bends ahead with a boat's grip (v^2 = grip * R)
function cornerSpeed(s, top) {
  let v = top;
  for (const [from, span] of [[2, 20], [12, 24], [26, 30]]) {
    const turn = Math.abs(normalizeAngle(routeAt(s + from + span).a - routeAt(s + from).a));
    if (turn < 0.05) continue;
    const r = span / turn;
    v = Math.min(v, Math.sqrt(WIEBE_GRIP * 0.85 * r) + from * 0.12);
  }
  return clamp(v, 3.5, top);
}

function driveWiebe(dt, world, w, aim, vDes) {
  const v = w.v, map = world.map;
  const speed = v.speed;
  let steer = clamp(normalizeAngle(Math.atan2(aim.y - v.y, aim.x - v.x) - v.angle) * 1.8, -1, 1);
  let throttle = 0, brake = 0;
  if (w.reverseT > 0) {
    w.reverseT -= dt;
    throttle = -1;
    steer = -steer;
  } else if (speed < vDes - 0.3) throttle = 1;
  else if (speed > vDes + 0.6) brake = clamp((speed - vDes) / 3, 0.2, 1);
  // his sloep corners like any other boat: cap the yaw at the same lateral grip
  const s = Math.abs(speed);
  if (s > 1) {
    const yawMax = Math.min(s / (v.model.len * 1.25), v.model.turnRate, 16 / s);
    steer = clamp(steer, -1, 1) * Math.min(1, (WIEBE_GRIP / s) / yawMax);
  }
  const px = v.x, py = v.y, pa = v.angle;
  const before = boatVel(v);
  v.applyControls(dt, throttle, steer, brake);
  resolveVehicleBuildingCollision(v, map, dt);
  // the same shore rule as the player's boat (player.js driveVehicle)
  if (!keepBoatOffShore(map, v, px, py, pa)) {
    v.speed *= -0.25;
    v.driftX = 0; v.driftY = 0;
  }
  const after = boatVel(v);
  const dv = Math.hypot(after[0] - before[0], after[1] - before[1]);
  // only crashes the player baited him into count: going for a ram, or close behind
  const baited = w.mode === 'ram' || w.mode === 'block' || Math.hypot(st.boat.x - v.x, st.boat.y - v.y) < 30;
  if (dv > 3.5 && baited && st.t - w.crashAt > 1 && st.t - w.rammedAt > 0.4 && st.t - w.hitByPlayerAt > 0.4) {
    w.crashAt = st.t;
    w.hull -= clamp((dv - 2.5) * 6, 0, 60);
    if (w.hull > 0) shout('crash', true);
  }
  // wedged against a quay: back off and try again
  if (w.reverseT <= 0) {
    if (Math.abs(v.speed) < 0.6 && vDes > 2) w.stuckT += dt;
    else w.stuckT = 0;
    if (w.stuckT > 1.2) { w.stuckT = 0; w.reverseT = 1.1; }
  }
}

function knockOut(world, w, how) {
  w.out = how;
  w.outAt = st.t;
  st.wiebeGone = true;
  const near = Math.hypot(w.v.x - st.boat.x, w.v.y - st.boat.y) < 90;
  if (how === 'brug') {
    shout('knock', true);
    world.addMessage(near ? 'BONK! Wiebe vergat te bukken onder de H.N. Werkmanbrug. Die is pas dertig jaar oud.' : 'In de verte: BONK. Wiebe vergat te bukken onder de H.N. Werkmanbrug.', 4.5);
  } else {
    shout('sunk', true);
    world.addMessage('Wiebes sloep geeft de geest. Hij dobbert nog wat na, met z\'n megafoon als peddel.', 4.5);
  }
  world.audioEvents = world.audioEvents || [];
  world.audioEvents.push({ kind: 'impact', x: w.v.x, y: w.v.y, strength: 0.7 });
  cheer(10);
  w.afterAt = st.t + 6;
}

function updateWiebe(dt, world) {
  const w = st.wiebe;
  const v = w.v, p = st.boat, map = world.map;
  if (!world.vehicles.includes(v)) world.vehicles.push(v); // the boat population despawns far boats
  const tr = track(v.x, v.y, w.wi);
  w.wi = tr.i;
  w.s = tr.s;
  w.modeT += dt;
  if (w.out) {
    v.applyControls(dt, 0, 0, 0.35);
    if (w.afterAt && st.t > w.afterAt) { w.afterAt = 0; shout('after', true); }
    return;
  }
  if (w.hull <= 0 || v.wrecked) { knockOut(world, w, 'motor'); return; }
  if (w.s >= werkmanS - 1 && w.s <= werkmanS + 25) { knockOut(world, w, 'brug'); return; }

  const gap = st.ps - w.s; // > 0: player ahead
  const d = Math.hypot(p.x - v.x, p.y - v.y);
  const pSpeed = Math.abs(p.speed);
  const baseTop = WIEBE_MODEL.maxSpeed;
  // far behind and out of sight he catches up quicker: no teleports, just a heavier throttle hand
  v.model.maxSpeed = gap > 80 && d > 70 ? baseTop + Math.min(2.5, (gap - 80) / 30) : baseTop;
  const top = v.model.maxSpeed;
  const nextBridge = (bridgeS || []).find((b) => b > st.ps + 8 && b < werkmanS - 20);
  const bridgeAhead = nextBridge != null && nextBridge - st.ps < BRIDGE_CUTOFF_AHEAD;

  if (st.t > (w.nextChatAt || 0)) shout(d > 110 ? 'far' : 'chase');

  let aim, vDes;
  switch (w.mode) {
    case 'chase': {
      const look = 6 + Math.abs(v.speed) * 0.65;
      if (gap < -6) { setMode(w, 'block'); shout('block', true); break; }
      if (d < RAM_R && gap > -3 && gap < 30 && st.t >= w.ramReadyAt) { setMode(w, 'ram'); break; }
      if (st.t < w.ramReadyAt && d < 30 && bridgeAhead && st.t - w.blockAt > 14) {
        // overtake on the far side to cut the player off at the bridge
        const lat = tr.lat - clamp(playerLat(), -3, 3) > 0 ? 2 : -2;
        aim = latClamp(map, w.s + look, lat);
        vDes = top;
      } else if (st.t < w.ramReadyAt && gap < 18) {
        aim = latClamp(map, w.s + look, 0);
        vDes = Math.max(3, pSpeed * 0.95);
      } else {
        aim = latClamp(map, w.s + look, 0);
        vDes = cornerSpeed(w.s, top);
      }
      break;
    }
    case 'ram': {
      // go for the stern quarter on his own side: a shove that spins the
      // tour boat towards the quay, not a polite tap on the transom
      const [vx, vy] = boatVel(p);
      const lead = clamp(d / 9, 0.35, 1.3);
      const side = ((v.x - p.x) * -Math.sin(p.angle) + (v.y - p.y) * Math.cos(p.angle)) > 0 ? 1 : -1;
      const back = p.model.len * 0.3;
      aim = {
        x: p.x + vx * lead - Math.cos(p.angle) * back - Math.sin(p.angle) * side * 0.7,
        y: p.y + vy * lead - Math.sin(p.angle) * back + Math.cos(p.angle) * side * 0.7,
      };
      vDes = Math.min(top + 2, pSpeed + 7.5);
      w.ramClosest = Math.min(w.ramClosest ?? 99, d);
      if (st.t - w.rammedAt < 0.3 || w.modeT > RAM_MAX_T || gap < -8 || d > RAM_R + 14) {
        if (st.t - w.rammedAt < 0.3) shout('ram', true);
        else if ((w.ramClosest ?? 99) < 8 && st.t - st.lastBumpAt > 1.5) {
          cheer(4);
          world.addMessage('Gemist! Wiebe schiet voorbij. De toeristen juichen (+4)', 2.4);
        }
        w.ramReadyAt = st.t + RAM_COOLDOWN;
        w.ramClosest = 99;
        setMode(w, gap < -8 ? 'block' : 'backoff');
      }
      break;
    }
    case 'backoff':
      aim = latClamp(map, w.s + 12, -Math.sign(tr.lat || 1) * 1.5);
      vDes = Math.max(2, pSpeed * 0.55);
      if (w.modeT > 2.5) setMode(w, 'chase');
      break;
    case 'block': {
      // ahead of the player: sit on their line, slow them down, brake-check once
      w.blockAt = st.t;
      const pl = playerLat();
      aim = latClamp(map, w.s + 10, clamp(pl, -3, 3));
      vDes = Math.max(2.5, pSpeed * 0.85);
      if (gap > 6) { setMode(w, 'chase'); break; }
      if (w.modeT > BLOCK_MAX_T) {
        if (-gap < 14) { setMode(w, 'brake'); shout('brake', true); } else setMode(w, 'yield');
      }
      break;
    }
    case 'brake':
      aim = latClamp(map, w.s + 10, tr.lat);
      vDes = 0;
      if (w.modeT > 1.1) setMode(w, 'yield');
      break;
    case 'yield':
      aim = latClamp(map, w.s + 12, tr.lat > 0 ? 3 : -3);
      vDes = 2;
      if (gap > 8 || w.modeT > 4) { w.ramReadyAt = st.t + 2.5; setMode(w, 'chase'); }
      break;
    default:
      setMode(w, 'chase');
      aim = latClamp(map, w.s + 12, 0);
      vDes = top;
  }
  if (!aim) { aim = latClamp(map, w.s + 12, 0); vDes = cornerSpeed(w.s, top); }
  driveWiebe(dt, world, w, aim, vDes);
  if (d < MEGAPHONE_R) st.joy = Math.max(0, st.joy - MEGAPHONE_RATE * dt);
}

// --- per frame ---------------------------------------------------------------------------------

// Returns a failure reason, or null.
export function updateRondvaart(dt, world) {
  if (!st) return null;
  st.t += dt;
  const v = st.boat, p = world.player;
  const driving = p.inVehicle === v;
  if (driving) {
    const tr = track(v.x, v.y, st.pi);
    st.pi = tr.i;
    st.ps = Math.max(st.ps, tr.s);
  }
  checkBumps(world, driving);
  const speed = Math.abs(v.speed);

  if (driving) {
    if (!st.welcomed && !isCinematicActive()) {
      st.welcomed = true;
      say(`${guideName(world)} (gids)`, WELCOME, '#7fd4ff', false, true);
    }
    if (st.cheerAt && st.t > st.cheerAt) {
      st.cheerAt = 0;
      world.addMessage('De toeristen zwaaien naar de terrassen. Vaar rustig, dan blijven ze blij.', 3.5);
    }
    updateSights(dt, world, speed);
    const calm = st.t - st.lastBumpAt > CALM_AFTER && (!st.wiebe || st.wiebe.out || Math.hypot(st.wiebe.v.x - v.x, st.wiebe.v.y - v.y) > 50);
    if (calm && st.joy < CALM_CAP) st.joy = Math.min(CALM_CAP, st.joy + CALM_RATE * dt);
  }

  if (!st.wiebe && !st.wiebeGone && driving && st.ps >= wiebeTriggerS() - 5) {
    st.wiebe = spawnWiebe(world);
    if (st.wiebe) {
      shout('appear', true);
      world.addMessage('Achter je: Schipper Wiebe, de échte eigenaar, in z\'n sloep. Laat hem op een kade knallen of lok hem naar het museum: Wiebe bukt voor niemand.', 6);
    }
  }
  if (st.wiebe) updateWiebe(dt, world);

  moodMessages(world);
  updateSubs(dt);

  const tg = ensureDecor(v, 'rvTourists', touristGroup);
  if (tg) animateTourists(tg, st, st.t);
  if (st.wiebe) {
    const wg = ensureDecor(st.wiebe.v, 'rvWiebe', wiebeGroup);
    if (wg) animateWiebe(wg, st.wiebe, st.t);
  }

  if (st.joy <= 0) return 'de toeristen zijn gevlucht. Bij de eerste de beste kade sprongen ze aan wal';
  if (!driving && p.inVehicle && p.inVehicle.isBoat && Math.hypot(p.x - v.x, p.y - v.y) > 45) return 'je liet de toeristen gewoon op het water achter';
  return null;
}

// Debug/test access.
export function getRondvaartDebug() {
  return st ? { st, PTS, CUM, bridgeS, werkmanS, ROUTE_LENGTH } : { PTS, CUM, ROUTE_LENGTH };
}
