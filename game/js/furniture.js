import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildProductMesh } from './shopmodels3d.js';
import { openShopMenu, closeShopMenu } from './shopui.js';
import { unlockAchievement } from './achievements.js';
import { getEierballen } from './achievementtracker.js';
import { getMissionProgress, getMissionDefs } from './missionquery.js';
import { storyReplayLines } from './missionstory.js';
import { playStoryVoice, stopStoryVoice } from './audio.js';
import { requestSearchlight } from './nightlights3d.js';
import { setUserWaypoint, formatDistance } from './routing.js';
import { getShopsForRender } from './shops.js';
import { furnitureShopHook, jobBonusHook } from './latehooks.js';
import { SHOP_TYPES } from './shopdata.js';
import { getSideJobSpotsForRender } from './sidejobs.js';
import { getGaragesForRender } from './garages.js';
import { getStationsForRender } from './stationtravel.js';
import { storyFlag } from './storyquery.js';
import { isVerplaatsbaar, schoonPlekken, plekVan, volgendePlek, opPlek, plekInfo, zonderStock } from './inrichting.js';
import { getLedger, summary } from './finance.js';

// EIKEA furniture for Tammo and Tessa's flat (home.js). Bought in the EIKEA
// (shops.js eikeaSections), delivered "tussen 8 en 18 uur": the next time
// they come home. Every piece stands at a fixed spot in the flat's frame
// (x along the facade, z inward), is only built while they are upstairs and
// gives a perk. The Buukenkaas arrives flat-packed and wants assembling.
// The story's r-bank step (storyarc.js) buys one; the first sit on the
// Zitmoi after it is a quiet moment. Saved as `meubels` in the savegame.

const SEAT_Y = 0.46;
const SOFA_HEAL = 10;
const FRYER_COOLDOWN = 15;
const FRYER_ARMOR = 20;
const FRYER_ARMOR_CAP = 60;
const BED_ARMOR = 50;
const JOB_BONUS = 1.1;
const STEK_PAY = 20;
const STEK_MAX = 3;
const TIPS_PER_DAY = 3;
const SCREW_FROM = 231;
const SCREWS = 8;
const TV_RANGE = 5.5;

const FURNITURE = [
  { id: 'kast', short: 'Buukenkaas', label: 'Boekenkast "Buukenkaas"', price: 49, desc: 'Plat verpakt, 238 schroefjes, 1 te weinig',
    perk: 'Elke dag 3 eierbal-tips op de kaart', stat: ['Eierbal-tips', '3 per dag'], flatpack: true,
    at: { x: 0.36, z: 2.6, rot: Math.PI / 2, fit: 'h', size: 1.9 }, solid: [0.1, 1.95, 0.66, 3.25], use: { x: 1.15, z: 2.6 } },
  { id: 'bank', short: 'Zitmoi', label: 'Bank "Zitmoi"', price: 299, desc: 'Zit als een Grunneger: stug maar trouw',
    perk: 'Zitten (E): snel weer gezond', stat: ['Herstel op de bank', '+10 gezondheid per seconde'], replaces: true,
    at: { x: 3.7, z: 3.95, rot: Math.PI, fit: 'w', size: 2.5 }, solid: [2.4, 3.35, 5.0, 4.55], use: { x: 5.45, z: 3.75 } },
  { id: 'lamp', short: 'Lichtje Tjoek', label: 'Lamp "Lichtje Tjoek"', price: 15, desc: 'Voor lange avonden in Stad',
    perk: "'s Avonds echt licht in de flat", stat: ['Gezelligheid', 'Warm licht, elke avond'],
    at: { x: 0.6, z: 4.7, rot: 0, fit: 'h', size: 1.6 }, solid: [0.38, 4.48, 0.82, 4.92] },
  { id: 'bed', short: 'Sloapstee', label: 'Bedden "Sloapstee" (twee)', price: 349, desc: 'Twee eenpersoons, dekbedden zo dik als pap. Huisgenoten, hè',
    perk: 'Slapen: +50 pantser, kies zelf hoe laat', stat: ['Uitgerust', 'Pantser 50 en je eigen wekker'], replaces: true,
    at: { x: 6.6, z: 7.95, rot: Math.PI, fit: 'w', size: 0.95, d: 2.0 }, at2: { x: 7.8, z: 7.95, rot: Math.PI, fit: 'w', size: 0.95, d: 2.0 } },
  { id: 'tv', short: 'Kiekkast', label: 'Tv "Kiekkast"', price: 229, desc: 'Groot scherm, Kiekdoar TV zit er standaard op',
    perk: 'Terugkijken en het Kiekdoar Journaal', stat: ['Kiekdoar TV', 'Gespeelde verhaalscènes terugkijken'], replaces: true,
    at: { x: 3.7, z: 1.0, rot: 0, fit: 'w', size: 1.7 }, solid: [2.8, 0.2, 4.6, 1.35], use: { x: 5.25, z: 1.35 } },
  { id: 'prikbord', short: 'Woar Bin\'k', label: 'Wandkaart "Woar Bin\'k"', price: 19, desc: 'Heel Grunn aan de muur, punaises erbij',
    perk: 'Kies een bestemming: GPS staat klaar', stat: ['Routeplanner', 'Winkels, klussen, stations'],
    at: { x: 0.1, y: 0.5, z: 6.7, rot: Math.PI / 2, fit: 'w', size: 1.1 }, use: { x: 0.95, z: 6.7 } },
  { id: 'frituur', short: 'Vetpot', label: 'Frituurpan "Vetpot"', price: 129, desc: 'Twee manden, heet in één minuut',
    perk: 'Eierbal thuis: +20 pantser, sneller weer trek', stat: ['Frituur thuis', 'Elke 15 s, pantser tot 60'], replaces: true,
    at: { x: 8.4, y: 0.94, z: 0.55, rot: 0, fit: 'w', size: 0.46 } },
  { id: 'plant', short: 'Stekkie', label: 'Plant "Stekkie"', price: 9, desc: 'Groeit als kool, ook zonder zon',
    perk: 'Stekjes verkopen: €20 per dag', stat: ['Bijverdienste', `€${STEK_PAY} per dag, max ${STEK_MAX} dagen`],
    at: { x: 10.5, z: 4.7, rot: 0, fit: 'h', size: 1.15 }, solid: [10.2, 4.4, 10.85, 5.0], use: { x: 9.75, z: 4.45 } },
  { id: 'bureau', short: 'Warkplak', label: 'Bureau "Warkplak" met pc', price: 179, desc: 'Ubbo draait er de hele dag op',
    perk: 'Bijbaantjes betalen 10% meer', stat: ['Bijbaan-loon', '+10% per klus'],
    at: { x: 10.3, z: 8.62, rot: Math.PI, fit: 'w', size: 1.3 }, solid: [9.65, 8.3, 10.95, 8.95], use: { x: 10.3, z: 7.8 } },
];
const BY_ID = new Map(FURNITURE.map((f) => [f.id, f]));
const TOTAL = FURNITURE.length;

let state = blank();
let world = null;
let parent = null;
let group = null;
let uses = [];
let seat = null;
let tv = null;
let tvEl = null;
let prevHour = null;
let moment = null;
const said = new Set();

function blank() {
  return { owned: new Set(), pending: new Set(), built: new Set(), plek: {}, day: 0, read: -1, stek: 0, tips: [], moment: false };
}

const has = (id) => state.owned.has(id) && (!BY_ID.get(id).flatpack || state.built.has(id));
const other = (w) => (w.player.character === 'anita' ? 'Tammo' : 'Tessa');
const sayOnce = (w, key, text) => { if (said.has(key)) return; said.add(key); w.addMessage(text, 4, { kind: 'tip' }); };

// --- save ------------------------------------------------------------------------

// The furniture you bought, for Spullen (spullen.js): ready (built and in
// place) or still to be delivered or built.
export function furnitureOwned() {
  return FURNITURE.filter((f) => state.owned.has(f.id)).map((f) => ({ ...f, ready: has(f.id), pending: state.pending.has(f.id) }));
}
export const FURNITURE_TOTAL = TOTAL;

export function getFurnitureSave() {
  return { owned: [...state.owned], pending: [...state.pending], built: [...state.built], day: state.day, read: state.read, stek: state.stek, tips: [...state.tips], moment: state.moment, plekken: { ...state.plek } };
}

export function applyFurnitureSave(d) {
  state = blank();
  if (!d || typeof d !== 'object') return;
  const ids = (a) => (Array.isArray(a) ? a.filter((id) => BY_ID.has(id)) : []);
  for (const id of ids(d.owned)) state.owned.add(id);
  for (const id of ids(d.pending)) if (!state.owned.has(id)) state.pending.add(id);
  for (const id of ids(d.built)) state.built.add(id);
  const n = (v) => (Number.isFinite(v) ? Math.floor(v) : 0);
  state.day = Math.max(0, n(d.day));
  state.read = Number.isFinite(d.read) ? Math.floor(d.read) : -1;
  state.stek = Math.max(0, Math.min(STEK_MAX, n(d.stek)));
  state.moment = d.moment === true;
  state.plek = schoonPlekken(d.plekken);
  state.tips = Array.isArray(d.tips) ? d.tips.filter((t) => typeof t === 'string').slice(0, TIPS_PER_DAY) : [];
}

// --- shop (shops.js eikeaSections) ----------------------------------------------------

export function furnitureShopItems(w, { pay, broke, preview }) {
  const n = state.owned.size + state.pending.size;
  return FURNITURE.map((f) => {
    const own = state.owned.has(f.id), coming = state.pending.has(f.id);
    const done = own || coming;
    return {
      id: f.id, label: f.label, desc: f.desc, price: f.price, keepFocus: true,
      preview: preview(f.id), effect: f.perk, tag: own ? 'In huis' : coming ? 'Besteld' : '',
      stats: [
        { label: f.stat[0], v: own ? 1 : 0, to: done ? null : 1, text: f.stat[1] },
        { label: 'Flat ingericht', v: n / TOTAL, to: done ? null : (n + 1) / TOTAL, text: done ? `${n} van ${TOTAL}` : `${n} → ${n + 1} van ${TOTAL}` },
      ],
      disabled: own ? 'Staat al thuis' : coming ? 'Wordt bezorgd' : broke(f.price),
      buy() {
        if (!pay(f.price)) return null;
        state.pending.add(f.id);
        return `${f.short} besteld! Bezorging tussen 8 en 18 uur: gewoon even thuiskomen`;
      },
    };
  });
}

// The story's EIKEA trip (storyeikea.js): pieces brought home on the roof,
// free, set up on the next visit to the flat. Returns the ids that were new.
const carried = new Set();
export function grantFurniture(ids) {
  const out = [];
  for (const id of ids) {
    if (!BY_ID.has(id) || state.owned.has(id) || state.pending.has(id)) continue;
    state.pending.add(id);
    carried.add(id);
    out.push(id);
  }
  return out;
}

export function furnitureShopNote() {
  return state.pending.size ? `Besteld: ${[...state.pending].map((id) => BY_ID.get(id).short).join(', ')}. Wordt thuis bezorgd` : 'Alles wordt bezorgd in de Pleiadenlaan';
}

// --- delivery and the flat's 3D ----------------------------------------------------------

// home.js enterFlat, before the meshes are built.
export function deliverFurniture(w) {
  world = w;
  said.delete('sofa');
  if (!state.pending.size) { momentHint(w); return; }
  const names = [...state.pending].map((id) => BY_ID.get(id).short);
  const selfCarried = [...state.pending].every((id) => carried.has(id));
  carried.clear();
  for (const id of state.pending) state.owned.add(id);
  state.pending.clear();
  const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' en ' + names[names.length - 1] : names[0];
  // one card: tips are rationed (attention.js), a second one would be dropped
  const next = [];
  if (state.owned.has('kast') && !state.built.has('kast')) next.push('De Buukenkaas staat nog in de doos: loop erheen en druk E.');
  if (momentDue()) next.push('Ga even zitten op de Zitmoi (E).');
  const head = selfCarried ? `Naar boven gesjouwd: ${list}.` : `EIKEA heeft bezorgd: ${list}. Tussen 8 en 18 uur, dus om 17:59.`;
  w.addMessage(`${head} ${next.join(' ')}`.trim(), 6, { kind: next.length ? 'missie' : 'tip' });
  checkComplete(w);
}

const momentDue = () => !state.moment && has('bank') && storyFlag('zitmoi');

function momentHint(w) {
  if (momentDue()) w.addMessage('Ga even zitten op de Zitmoi (E)', 5, { kind: 'missie' });
}

// Stock pieces an EIKEA one replaces (home3d.js buildFlat3D skips them).
export function furnitureSkip() {
  return new Set(FURNITURE.filter((f) => f.replaces && state.owned.has(f.id)).map((f) => f.id));
}

// The piece as it stands now: lamp, plant, bookcase, tv, desk, sofa and beds can be moved (inrichting.js).
function eff(f) {
  const o = isVerplaatsbaar(f.id) && opPlek(f.id, plekVan(state.plek, f.id));
  if (!o) return f;
  if (o.bedden) {
    const [a, b] = o.bedden;
    return { ...f, at: { ...f.at, x: a.x, z: a.z, rot: a.rot }, at2: { ...f.at2, x: b.x, z: b.z, rot: b.rot }, solids: o.solids };
  }
  if (o.use) return { ...f, at: { ...f.at, x: o.x, z: o.z, rot: o.rot }, solid: o.solid, use: o.use };
  return { ...f, at: { ...f.at, x: o.x, z: o.z }, solid: o.solid, use: f.use && { x: f.use.x + o.dx, z: f.use.z + o.dz } };
}

// Walkable-flat solids of the placed pieces [x0, z0, x1, z1].
export function furnitureSolids() {
  const out = [];
  for (const f of FURNITURE) {
    if (!state.owned.has(f.id)) continue;
    const e = eff(f);
    if (e.solids) out.push(...e.solids);
    else if (e.solid) out.push(e.solid);
  }
  // de losse tv van de flat staat op zijn standaardplek tot de Kiekkast er is
  if (!state.owned.has('tv')) out.push(BY_ID.get('tv').solid);
  return out;
}

// home.js: the stock sofa and beds are blocks of flat.solids; once the EIKEA ones stand, only theirs count.
export function furnitureStockSolids(solids) {
  return zonderStock(solids, state.owned);
}

// home.js: where the sleeping spots of Tammo's (bed) and Tessa's (bed2) bed are now, in the flat's frame; null = stock.
export function furnitureBedUses() {
  if (!state.owned.has('bed')) return null;
  const o = opPlek('bed', plekVan(state.plek, 'bed'));
  return o ? { bed: o.bedden[0].use, bed2: o.bedden[1].use } : null;
}

const lambert = new Map();
function flatMaterial(m) {
  if (!m || Array.isArray(m) || m.map) return m;
  let l = lambert.get(m);
  if (!l) {
    l = new THREE.MeshLambertMaterial({ color: m.color });
    l.emissive = m.emissive && m.emissiveIntensity && m.emissive.getHex() ? m.emissive.clone().multiplyScalar(m.emissiveIntensity) : m.color.clone().multiplyScalar(0.2);
    l.userData.shared = true;
    lambert.set(m, l);
  }
  return l;
}

function pieceMesh(key, at) {
  const m = buildProductMesh(key);
  if (!m) return null;
  m.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(m);
  const size = b.getSize(new THREE.Vector3());
  const k = at.size / Math.max(1e-3, at.fit === 'h' ? size.y : at.fit === 'd' ? size.z : size.x);
  const kz = at.d ? at.d / Math.max(1e-3, size.z) : k;
  m.scale.set(k, k, kz);
  const c = b.getCenter(new THREE.Vector3());
  m.position.set(-c.x * k, -b.min.y * k, -c.z * kz);
  m.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(flatMaterial) : flatMaterial(o.material);
  });
  const g = new THREE.Group();
  g.add(m);
  g.rotation.y = at.rot || 0;
  g.position.set(at.x, at.y || 0, at.z);
  return g;
}

function buildGroup(flat) {
  const g = new THREE.Group();
  g.name = 'eikea';
  for (const f0 of FURNITURE) {
    if (!state.owned.has(f0.id)) continue;
    const f = eff(f0);
    const packed = f.flatpack && !state.built.has(f.id);
    const mesh = packed ? pieceMesh('pakket', { x: f.use.x + 0.1, z: f.at.z, rot: Math.PI / 2 + 0.15, fit: 'w', size: 1.3 }) : pieceMesh(f.id, f.at);
    if (mesh) g.add(mesh);
    const twin = !packed && f.at2 && pieceMesh(f.id, f.at2);
    if (twin) g.add(twin);
  }
  uses = FURNITURE.filter((f) => f.use && state.owned.has(f.id)).map((f0) => {
    const f = eff(f0);
    const [x, y] = flat.fl(f.use.x, f.use.z);
    return { k: 'f-' + f.id, x, y };
  });
  return g;
}

// home.js enterFlat: the owned pieces into the flat's group (its local frame).
export function attachFurniture3D(flatMesh, flat) {
  parent = { mesh: flatMesh, flat };
  group = buildGroup(flat);
  flatMesh.add(group);
}

function refresh3D() {
  if (!parent) return;
  if (group) parent.mesh.remove(group);
  group = buildGroup(parent.flat);
  parent.mesh.add(group);
}

// home.js exitFlatNow: the meshes go with the flat (disposed there).
export function leaveFurniture(w) {
  standUp(w, false);
  stopTv();
  moment = null;
  if (w && w.companion) w.companion.sofaSeat = null;
  parent = null;
  group = null;
  uses = [];
}

export function furnitureUses() {
  return uses;
}

// --- perks used by home.js ----------------------------------------------------------------

export function fridgeCooldown(base) {
  return has('frituur') ? FRYER_COOLDOWN : base;
}

// After the fridge eierbal: the Vetpot's crust as armour.
export function fridgePerk(w) {
  if (!has('frituur') || w.armor >= FRYER_ARMOR_CAP) return false;
  w.armor = Math.min(FRYER_ARMOR_CAP, w.armor + FRYER_ARMOR);
  return true;
}

export function furnitureJobBonus() {
  return has('bureau') ? JOB_BONUS : 1;
}

// home.js sleep, after the clock moved on.
export function furnitureSlept(w, fromHour, toHour) {
  if (toHour <= fromHour) newDay();
  prevHour = toHour;
  if (!has('bed')) return;
  w.armor = Math.max(w.armor, BED_ARMOR);
  sayOnce(w, 'bed', 'Wat een bed. Hier kom ik nooit meer uit.');
}

// Where the companion stays in the flat: on the Zitmoi when there is one.
export function companionSeat() {
  const o = has('bank') && bankNow();
  return o ? { x: o.buur.x, z: o.buur.z, seat: SEAT_Y, kijk: o.kijk } : null;
}

const bankNow = () => opPlek('bank', plekVan(state.plek, 'bank'));

function newDay() {
  state.day++;
  if (state.owned.has('plant')) state.stek = Math.min(STEK_MAX, state.stek + 1);
}

// Every frame (home.js updateHome): a new day when the clock passes midnight.
export function updateFurniture(dt, w) {
  world = w;
  const h = ((w.clock % 24) + 24) % 24;
  if (prevHour != null && h < prevHour - 12) newDay();
  prevHour = h;
}

// --- prompts and E ------------------------------------------------------------------

// A use that holds the focus wherever the player stands (on the sofa, TV on).
export function furnitureFocus(w) {
  if (seat) return { k: 'f-bank', s: { x: w.player.x, y: w.player.y } };
  if (tv && parent) {
    const tvEff = eff(BY_ID.get('tv'));
    const [x, y] = parent.flat.fl(tvEff.use.x, tvEff.use.z);
    return { k: 'f-tv', s: { x, y } };
  }
  return null;
}

// [label, sub] for a flat use, or null for home.js's own text.
export function furniturePrompt(k, w) {
  if (k === 'bed') return has('bed') ? ['Slapen', 'Sloapstee: kies hoe laat je wakker wordt, pantser erbij'] : null;
  if (k === 'fridge' || k === 'fryer') return has('frituur') ? ['Eierbal pakken', 'Door de Vetpot: gezondheid vol en een knapperig pantser'] : null;
  switch (k) {
    case 'f-kast':
      if (!state.built.has('kast')) return ['In elkaar zetten', 'Buukenkaas: 238 schroefjes, wat kan er misgaan'];
      return state.read === state.day ? ['Buukenkaas', 'Vandaag al gelezen. Morgen weer tips'] : ['Lezen', `${other(w)} leest zich in: eierbal-tips op de kaart`];
    case 'f-bank': return seat ? ['Opstaan', 'Of loop gewoon weg'] : ['Zitten', 'Even bijkomen op de Zitmoi'];
    case 'f-tv': return tv ? ['Uitzetten', `Kiekdoar TV: ${tv.title}`] : ['Tv kijken', 'Kiekdoar TV: terugkijken en het journaal'];
    case 'f-prikbord': return ['Wandkaart', 'Kies waar je heen wilt, de GPS doet de rest'];
    case 'f-plant': return state.stek ? ['Stekjes verkopen', `${state.stek} ${state.stek > 1 ? 'dagen' : 'dag'} gegroeid: €${state.stek * STEK_PAY}`] : ['Stekkie', 'Nog geen stekjes. Morgen weer kijken'];
    case 'f-bureau': return ['Pc aan', 'Klussen, kasboek en de flat inrichten'];
    default: return null;
  }
}

// E on a flat use; true when handled. api.sleep(hour, msg) sleeps (home.js).
export function useFurniture(w, k, api) {
  world = w;
  if (k === 'bed') {
    if (!has('bed')) return false;
    openShopMenu(w, sleepMenu(w, api));
    return true;
  }
  switch (k) {
    case 'f-kast': state.built.has('kast') ? readBooks(w) : openShopMenu(w, assemblyMenu(w)); return true;
    case 'f-bank': seat ? standUp(w, true) : sitDown(w); return true;
    case 'f-tv': tv ? stopTv() : openShopMenu(w, tvMenu(w)); return true;
    case 'f-prikbord': openShopMenu(w, mapMenu(w)); return true;
    case 'f-plant': sellStekjes(w); return true;
    case 'f-bureau': openShopMenu(w, pcMenu(w)); return true;
    default: return false;
  }
}

function checkComplete(w) {
  if (FURNITURE.every((f) => has(f.id))) unlockAchievement(w, 'ingericht');
}

// --- the Buukenkaas: flat-pack, and one screw too few -----------------------------------

let screws = 0;
function assemblyMenu(w) {
  screws = 0;
  const finish = (self) => {
    state.built.add('kast');
    closeShopMenu();
    refresh3D();
    if (self) {
      unlockAchievement(w, 'schroefje');
      w.addMessage('Eén schroefje te weinig. Ach, een kauwgompje houdt ook.', 4, { kind: 'tip' });
    } else w.addMessage(`${other(w)} zet de Buukenkaas in twee minuten in elkaar. Zonder de beschrijving`, 4, { kind: 'tip' });
    checkComplete(w);
    return 'De Buukenkaas staat!';
  };
  return {
    name: 'Buukenkaas in elkaar zetten', type: 'eikea', color: '#1d4fa3', tagline: 'Stap 1 van 1. Niet in paniek raken',
    sections: () => {
      const last = screws >= SCREWS;
      const step = last
        // same id as the screws: the selection (and the keyboard focus) stays on the step
        ? { id: 'schroef', label: 'Schroefje 238 bestaat niet', desc: 'Doos leeg, zak leeg, vloer leeg. Kauwgompje erin?', verb: 'Kauwgom erin', price: 0, keepFocus: true,
          preview: { kind: 'product', product: 'kast' }, effect: 'Zelf in elkaar gezet', buy: () => finish(true) }
        : { id: 'schroef', label: `Schroefje ${SCREW_FROM + screws} van 238`, desc: 'Inbussleuteltje erin en draaien. Rechtsom is vast', verb: 'Draaien', price: 0, keepFocus: true,
          preview: { kind: 'product', product: screws >= SCREWS / 2 ? 'kast' : 'pakket' },
          stats: [{ label: 'Opgebouwd', v: screws / SCREWS, to: (screws + 1) / SCREWS, text: `${SCREW_FROM + screws - 1} van 238` }],
          buy() { screws++; return screws >= SCREWS ? 'Nog één... waar is schroefje 238?' : 'Krrrk. Vast!'; } };
      return [
        { title: 'Handleiding (alleen plaatjes)', items: [step] },
        { title: 'Of niet', items: [{ id: 'laatmaar', label: `Laat ${other(w)} het maar doen`, desc: 'Overslaan: de kast staat meteen', verb: 'Overslaan', price: 0, keepFocus: true, buy: () => finish(false) }] },
      ];
    },
  };
}

// The Ommeland villages' hidden eierballen (ommelandfun.js registers
// dorpsuitjes.js getVillageEggs): the books point at those too.
let extraEggs = () => [];
export function setExtraEggs(fn) {
  extraEggs = fn;
}
const allEggs = (withExtra) => (withExtra ? getEierballen().concat(extraEggs()) : getEierballen());

function readBooks(w) {
  if (state.read === state.day) { w.addMessage('Vandaag al gelezen. Morgen staan er weer tips in', 3); return; }
  const open = allEggs(true).filter((e) => !e.found);
  if (!open.length) { w.addMessage(`Alle eierballen zijn al gevonden. ${other(w)} leest gewoon een detective`, 4, { kind: 'tip' }); return; }
  for (let i = open.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [open[i], open[j]] = [open[j], open[i]]; }
  state.tips = open.slice(0, TIPS_PER_DAY).map((e) => e.id);
  state.read = state.day;
  w.addMessage(`${other(w)} leest "Verstopt in Stad" ${state.day + 1}: ${state.tips.length} eierbal-tips`, 5, { kind: 'tip' });
}

// Unfound eierballen the Buukenkaas pointed at, for the map (mapview.js).
export function getEierbalTips() {
  if (!state.tips.length) return [];
  const want = new Set(state.tips);
  return allEggs(state.tips.some((id) => String(id).startsWith('dorp:'))).filter((e) => want.has(e.id) && !e.found);
}

// --- the Zitmoi ------------------------------------------------------------------------

function seatSpot() {
  const s = bankNow().seat;
  const [x, y] = parent.flat.fl(s.x, s.z);
  return { x, y };
}

function sitDown(w) {
  if (!parent) return;
  const p = w.player;
  const s = seatSpot();
  seat = { x: s.x, y: s.y };
  p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0;
  p.sofaSeat = SEAT_Y;
  const k = bankNow().kijk, F = parent.flat;
  p.angle = Math.atan2(k.x * F.X[1] + k.z * F.Y[1], k.x * F.X[0] + k.z * F.Y[0]);
  if (momentDue()) {
    state.moment = true;
    said.add('sofa');
    moment = { t: w.time, i: 0 };
  }
  sayOnce(w, 'sofa', 'Zitmoi. Nu snap ik waarom ze hem zo noemen.');
}

function standUp(w, place) {
  if (!seat) return;
  seat = null;
  const p = w && w.player;
  if (!p) return;
  p.sofaSeat = null;
  if (place && parent) {
    const s = bankNow().sta;
    const [x, y] = parent.flat.fl(s.x, s.z);
    p.x = x; p.y = y;
  }
}

// The quiet moment after the story's r-bank step, said by the one you don't play.
const MOMENT = [
  [0, 'Zitmoi. Nu snap ik waarom ze hem zo noemen.'],
  [5, 'Oma Trijntje heeft gelijk, hè. Die bal is gien geld. Die bal is Grunn.'],
  [11, 'Als we hem vinden, brengen we hem terug. Toch?'],
];

// --- Kiekdoar TV --------------------------------------------------------------------------

function tvMenu(w) {
  const prog = getMissionProgress();
  const defs = getMissionDefs();
  const done = prog ? [...prog.completed].sort((a, b) => a - b) : [];
  const shows = done.map((i) => ({
    id: 'tv-' + i, label: (defs[i] && defs[i].label) || `Missie ${i + 1}`, desc: 'Aflevering ' + (i + 1) + ' van "Tammo en Tessa: de Gouden Eierbal"',
    verb: 'Kijken', price: 0, keepFocus: true, buy() { closeShopMenu(); startTv(w, this.label, storyReplayLines(i)); return 'Kijken maar'; },
  }));
  return {
    name: 'Kiekdoar TV', type: 'eikea', color: '#1e3a5a', tagline: 'De enige zender van Grunn. Nait zeuren',
    sections: () => [
      { title: 'Journaal', items: [{ id: 'tv-nieuws', label: 'Kiekdoar Journaal', desc: 'Het laatste nieuws uit Stad, over jullie natuurlijk', verb: 'Kijken', price: 0, keepFocus: true,
        buy() { closeShopMenu(); startTv(w, 'Kiekdoar Journaal', newsLines(w)); return 'Journaal'; } }] },
      { title: 'Terugkijken', note: shows.length ? '' : 'Nog niks gebeurd. Eerst een missie spelen', items: shows },
    ],
  };
}

function newsLines(w) {
  const st = w.stats || {};
  const eggs = getEierballen();
  const found = eggs.filter((e) => e.found).length;
  const say = (text) => ({ speaker: 'Nieuwslezer', text, src: null, dur: 0 });
  const out = [say('Goeienavond Grunn, dit is het Kiekdoar Journaal.')];
  out.push(say(st.missionsDone ? `De mysterieuze klussers uit Paddepoel hebben al ${st.missionsDone} klussen op hun naam.` : 'Rustig in Stad. Verdacht rustig.'));
  out.push(say(st.playerWrecks ? `Garages juichen: al ${st.playerWrecks} auto's afgeschreven in de stad.` : 'Opvallend: nog geen auto afgeschreven. Garages maken zich zorgen.'));
  if (eggs.length) out.push(say(found ? `Eierbaljager gesignaleerd: ${found} van de ${eggs.length} verstopte eierballen zijn al weg.` : `Ergens in Stad liggen ${eggs.length} eierballen verstopt. Niemand weet waar.`));
  if (st.copKills) out.push(say('De politie zoekt nog altijd getuigen. Bellen kan, maar niemand doet het.'));
  out.push(say(`EIKEA meldt: ${state.owned.size} van de ${TOTAL} meubels bezorgd aan de Pleiadenlaan.`));
  out.push(say('Het weer: kans op regen. In Grunn is dat geen voorspelling maar een belofte.'));
  out.push(say('Dat was het nieuws. Moi!'));
  return out;
}

function ensureTvEl() {
  if (tvEl) return tvEl;
  tvEl = document.createElement('div');
  tvEl.className = 'fm-tv';
  tvEl.setAttribute('role', 'status');
  tvEl.innerHTML = '<style>.fm-tv{position:fixed;left:50%;bottom:17%;transform:translateX(-50%);z-index:40;width:min(640px,calc(100vw - 32px));box-sizing:border-box;padding:10px 16px 12px;background:rgba(12,20,14,.9);border:2px solid #3fc97a;border-radius:6px;color:#f0ede4;font:17px/1.35 Arial,sans-serif;pointer-events:none;display:none}.fm-tv.on{display:block}.fm-tv h4{margin:0 0 4px;font:15px \'Bebas Neue\',\'Arial Narrow\',Arial,sans-serif;letter-spacing:1.5px;color:#3fc97a}.fm-tv b{color:#e8c93a;margin-right:6px}.fm-tv small{display:block;margin-top:6px;color:rgba(240,237,228,.55);font-size:13px}.fm-tv kbd{display:inline-block;min-width:12px;margin-right:4px;padding:1px 6px;border:1px solid rgba(255,255,255,.5);border-bottom-width:2px;border-radius:4px;font:bold 12px/1.2 system-ui,sans-serif;color:#f0ede4;text-align:center}</style><h4></h4><p style="margin:0"><b></b><span></span></p><small><kbd>E</kbd> uitzetten · weglopen zet hem ook uit</small>';
  document.body.appendChild(tvEl);
  return tvEl;
}

function startTv(w, title, lines) {
  stopTv();
  if (!lines.length) return;
  tv = { title, lines, i: -1, t: 0, next: 0.5 };
  const el = ensureTvEl();
  el.querySelector('h4').textContent = 'Kiekdoar TV · ' + title;
  el.querySelector('b').textContent = '';
  el.querySelector('span').textContent = '…';
  el.classList.add('on');
}

function stopTv() {
  if (!tv) return;
  if (tv.voiced) stopStoryVoice();
  tv = null;
  if (tvEl) tvEl.classList.remove('on');
}

function updateTv(dt, w) {
  if (!tv) return;
  const tvAt = eff(BY_ID.get('tv')).at;
  const [x, y] = parent.flat.fl(tvAt.x, tvAt.z + 2.4);
  if (Math.hypot(w.player.x - x, w.player.y - y) > TV_RANGE) { stopTv(); return; }
  tv.t += dt;
  if (tv.t < tv.next) return;
  tv.i++;
  if (tv.i >= tv.lines.length) { stopTv(); w.addMessage('Afgelopen. Morgen weer Kiekdoar TV', 3); return; }
  const l = tv.lines[tv.i];
  tv.next = tv.t + (l.src ? Math.max(1.6, l.dur + 0.35) : Math.max(2.4, l.text.length * 0.065));
  if (l.src) { playStoryVoice(l.src); tv.voiced = true; }
  tvEl.querySelector('b').textContent = l.speaker ? l.speaker + ':' : '';
  tvEl.querySelector('span').textContent = l.text;
}

// --- sleep menu (Sloapstee) ---------------------------------------------------------------

const WAKE = [
  ['ochtend', 'Tot de ochtend', 'Wakker om half acht, fris en uitgerust', 7.5, 'Goeiemorgen, Grunn! Uitgeslapen en opgeslagen'],
  ['middag', 'Tot de middag', 'Uitslapen tot één uur, net als studenten', 13, 'Middag! Uitgeslapen als een student'],
  ['avond', 'Tot de avond', 'Wakker om half tien, klaar voor het nachtwerk', 21.5, 'Uitgeslapen tot de avond. Tijd voor actie'],
  ['nacht', 'Tot diep in de nacht', 'Om één uur, als heel Grunn slaapt', 1, 'Eén uur \'s nachts. Heel Grunn slaapt, behalve jullie'],
];

function sleepMenu(w, api) {
  return {
    name: 'Sloapstee', type: 'eikea', color: '#1d4fa3', tagline: 'Welterusten. De wekker staat waar jij wilt',
    sections: () => [{ title: 'Hoe laat wakker worden?', note: 'Slapen slaat het spel op, geeft volle gezondheid en 50 pantser', items: WAKE.map(([id, label, desc, hour, msg]) => ({
      id: 'wake-' + id, label, desc, verb: 'Slapen', price: 0, keepFocus: true, preview: { kind: 'product', product: 'bed' },
      buy() { closeShopMenu(); api.sleep(hour, msg); return 'Welterusten'; },
    })) }],
  };
}

// --- wandkaart: pick a destination ------------------------------------------------------

function mapMenu(w) {
  const p = w.player;
  const d = (o) => Math.hypot(o.x - p.x, o.y - p.y);
  const go = (id, label, o, sub) => ({
    id, label, desc: `${sub} · ${formatDistance(d(o))}`, verb: 'Route uitzetten', price: 0, keepFocus: true,
    buy() { setUserWaypoint(o.x, o.y, label); closeShopMenu(); w.addMessage(`Route uitgezet naar ${label}. Punaise erin!`, 3.5, { kind: 'tip' }); return 'Route staat'; },
  });
  const nearest = (list) => list.reduce((b, o) => (!b || d(o) < d(b) ? o : b), null);
  const shops = [];
  const byType = new Map();
  for (const s of getShopsForRender()) {
    const cur = byType.get(s.type);
    if (!cur || d(s) < d(cur)) byType.set(s.type, s);
  }
  for (const [type, s] of byType) shops.push(go('w-' + type, s.name, s, (SHOP_TYPES[type] && SHOP_TYPES[type].label) || 'Winkel'));
  shops.sort((a, b) => a.label.localeCompare(b.label, 'nl'));
  const jobs = getSideJobSpotsForRender().map((sj, i) => go('j-' + i, sj.job.name, sj, 'Bijbaantje'));
  const other = [];
  const g = nearest(getGaragesForRender());
  if (g) other.push(go('g', g.name || 'Garage', g, 'Dichtstbijzijnde garage'));
  const st = nearest(getStationsForRender());
  if (st) other.push(go('st', st.name, st, 'Dichtstbijzijnde station'));
  return {
    name: 'Wandkaart "Woar Bin\'k"', type: 'eikea', color: '#1e9e56', tagline: 'Punaise erin en de GPS weet de weg',
    sections: () => [
      { title: 'Dichtbij', items: other },
      { title: 'Bijbaantjes', items: jobs },
      { title: 'Winkels (dichtstbijzijnde)', items: shops },
    ],
  };
}

// --- Stekkie and the Warkplak --------------------------------------------------------

function sellStekjes(w) {
  if (!state.stek) { w.addMessage('Nog geen stekjes. Stekkie groeit per dag', 3); return; }
  const pay = state.stek * STEK_PAY;
  state.stek = 0;
  w.money += pay;
  w.addMessage(`+€${pay} voor stekjes via de buurtapp`, 3, { kind: 'geld' });
  sayOnce(w, 'plant', 'Stekkies verkocht aan de buren. Groene vingers, groen geld.');
}

// Ubbo's pc: the best job, the money book (finance.js) and moving the furniture (inrichting.js).
function pcMenu(w) {
  const euro = (v) => '€' + Math.round(v).toLocaleString('nl-NL');
  const move = FURNITURE.filter((f) => isVerplaatsbaar(f.id) && state.owned.has(f.id)).map((f) => {
    const next = volgendePlek(state.plek, state.owned, f.id);
    const nu = plekInfo(plekVan(state.plek, f.id)).label;
    return {
      id: 'plek-' + f.id, label: f.short, desc: next ? `Nu: ${nu}. Straks: ${plekInfo(next).label}` : `Nu: ${nu}. Geen andere plek vrij`, verb: 'Verplaatsen', price: 0, keepFocus: true,
      preview: { kind: 'product', product: f.id }, disabled: next ? '' : 'Geen plek vrij',
      buy() { state.plek[f.id] = next; refresh3D(); return `${f.short} staat nu: ${plekInfo(next).label}`; },
    };
  });
  return {
    name: 'Warkplak', type: 'eikea', color: '#1e9e56', tagline: 'Ubbo draait. Klus, kasboek of de boel verschuiven',
    sections: () => {
      const s = summary(getLedger());
      return [
        { title: 'Klus', items: [{ id: 'klus', label: 'Beste bijbaantje zoeken', desc: 'Ubbo zet de dichtstbijzijnde klus op de GPS', verb: 'Zoeken', price: 0, keepFocus: true, buy() { closeShopMenu(); bestJob(w); return 'Route staat'; } }] },
        { title: 'Kasboek', note: 'Alles wat je verdient en uitgeeft', items: [
          { id: 'kas-v', label: 'Vandaag', desc: `Binnen ${euro(s.todayIn)}, uit ${euro(s.todayOut)}`, plain: true, price: 0, buy: () => '' },
          { id: 'kas-w', label: 'Deze week', desc: `Binnen ${euro(s.weekIn)}, uit ${euro(s.weekOut)}`, plain: true, price: 0, buy: () => '' },
          { id: 'kas-t', label: 'Totaal', desc: `Verdiend ${euro(s.inTotal)}, uitgegeven ${euro(s.outTotal)}${s.topOut.length ? `. Meeste uitgaven: ${s.topOut.map(([k, v]) => `${k} ${euro(v)}`).join(', ')}` : ''}`, plain: true, price: 0, buy: () => '' },
        ] },
        ...(move.length ? [{ title: 'Flat inrichten', note: 'Lamp, plant, kast, bureau, tv, bank en bedden kunnen op een andere plek', items: move }] : []),
      ];
    },
  };
}

function bestJob(w) {
  const spots = getSideJobSpotsForRender();
  if (!spots.length) { w.addMessage('Ubbo vindt geen klussen. Raar', 3); return; }
  const p = w.player;
  const s = spots.reduce((b, o) => (!b || Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? o : b), null);
  setUserWaypoint(s.x, s.y, s.job.name);
  w.addMessage(`Ubbo op de pc: bijbaantjes betalen nu 10% extra. Dichtstbij: ${s.job.name}, route staat`, 4.5, { kind: 'tip' });
}

// --- per frame while upstairs ----------------------------------------------------------

// home.js updateHome while inside; true while the player sits (no clamping).
export function updateFurnitureInside(dt, w) {
  world = w;
  if (!parent) return false;
  const f = parent.flat;
  const night = (w.dayNight && w.dayNight.night) || 0;
  if (night > 0.05) {
    // the ceiling lamp of the room you are in; the Lichtje Tjoek outshines it in the living room
    const p = w.player, dx = p.x - f.ox, dy = p.y - f.oy;
    const px = dx * f.X[0] + dy * f.X[1], pz = dx * f.Y[0] + dy * f.Y[1];
    const room = f.rooms.find((r) => px >= r.x0 && px <= r.x1 && pz >= r.z0 && pz <= r.z1);
    const k = Math.min(1, night * 1.5);
    if (has('lamp') && (!room || room.name === 'woonkamer')) {
      const [lx, ly] = f.fl(0.6, 4.7);
      const [tx, ty] = f.fl(3.0, 3.0);
      requestSearchlight(lx, f.floorY + 2.6, ly, tx, f.floorY, ty, 4.4, 0.85 * k);
      sayOnce(w, 'lamp', 'Lekker lichtje. Nu is het echt gezellig.');
    } else if (room) {
      const [cx, cy] = f.fl((room.x0 + room.x1) / 2, (room.z0 + room.z1) / 2);
      requestSearchlight(cx, f.floorY + 2.7, cy, cx, f.floorY, cy, Math.max(room.x1 - room.x0, room.z1 - room.z0) * 0.6, 0.4 * k);
    }
  }
  updateTv(dt, w);
  if (moment && w.time - moment.t > MOMENT[moment.i][0]) {
    w.addMessage(MOMENT[moment.i][1], 5, { kind: 'missie', kicker: other(w) });
    if (++moment.i >= MOMENT.length) moment = null;
  }
  if (!seat) return false;
  const p = w.player;
  const [ax, ay] = w.input ? w.input.axis() : [0, 0];
  if (ax || ay || p.inVehicle) { standUp(w, true); return false; }
  p.x = seat.x; p.y = seat.y; p.vx = 0; p.vy = 0;
  if (w.health < 100) w.health = Math.min(100, w.health + SOFA_HEAL * dt);
  return true;
}

window.__furniture = {
  state: () => getFurnitureSave(),
  give: (...ids) => { for (const id of ids.length ? ids : [...BY_ID.keys()]) if (BY_ID.has(id) && !state.owned.has(id)) state.pending.add(id); return getFurnitureSave(); },
  reset: () => { state = blank(); refresh3D(); },
  newDay: () => newDay(),
  seated: () => !!seat,
  // QA (#359): zet een meubel op een plek van inrichting.js (alleen een geldige plek van dat meubel) en bouw de flat opnieuw; zit/sta op de bank
  plek: (id, p) => { if (isVerplaatsbaar(id) && schoonPlekken({ [id]: p })[id]) { state.plek[id] = p; refresh3D(); } return { ...state.plek }; },
  zit: () => { if (!seat && world && parent && has('bank')) sitDown(world); return !!seat; },
  sta: () => { if (seat) standUp(world, true); return !seat; },
  tv: () => (tv ? { title: tv.title, i: tv.i, n: tv.lines.length } : null),
};

// shops.js (Woonafdeling) and sidejobs.js (the Bureau pays more) use these through latehooks.js
furnitureShopHook.items = furnitureShopItems;
furnitureShopHook.note = furnitureShopNote;
jobBonusHook.get = furnitureJobBonus;
