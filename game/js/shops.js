import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { dist, closestPointOnSegment, isInWater } from './util.js';
import { getScene, refreshCharacterMeshes } from './scene3d.js';
import { spawnVehicleOnRoad } from './vehicle.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { getPickupsForRender } from './pickups.js';
import { getHorecaForRender } from './horeca.js';
import { initShopUi, openShopMenu, isShopOpen } from './shopui.js';
import { isCinematicActive } from './cinematics.js';
import { recordStat } from './achievements.js';

export const SHOP_USE_RADIUS = 2.6;
const GARAGE_PAINT_RADIUS = 7;
const OUTFIT_WANTED_COOLDOWN = 60;
const MAX_OWNED_VEHICLES = 4;
const REDELIVERY_FEE = 25;

export const SHOP_TYPES = {
  wapens: { color: '#b8322a', label: 'Wapenwinkel' },
  kleding: { color: '#7a4fb0', label: 'Kledingwinkel' },
  kapper: { color: '#23948a', label: 'Kapper' },
  fietsen: { color: '#2f6fb8', label: 'Fietsenwinkel' },
  auto: { color: '#c98a16', label: 'Autodealer' },
  tabak: { color: '#c23f78', label: 'Tabak & loterij' },
  spuit: { color: '#1e9e56', label: 'Spuiterij' },
};

// Anchor points sit on the named street (citymap.json has no shop data);
// initShops snaps each one to the nearest facade on that street.
const SHOP_DEFS = [
  { id: 'pang', type: 'wapens', name: 'Pang & Zo', tagline: 'Wapens, munitie en vesten. Geen vragen.', street: 'Oude Ebbingestraat', at: [75, -135] },
  { id: 'stoer', type: 'kleding', name: 'Stoer & Stads', tagline: 'Kleding voor de Stadjer met smaak', street: 'Herestraat', at: [150, 262] },
  { id: 'knip', type: 'kapper', name: 'Knip & Kuif', tagline: 'Kapsalon, ook zonder afspraak', street: 'Folkingestraat', at: [-30, 392] },
  { id: 'trap', type: 'fietsen', name: 'Trap & Toeter', tagline: 'Fietsen, fatbikes en brommers', street: 'Oosterstraat', at: [338, 258] },
  { id: 'harm', type: 'auto', name: 'Ome Harm Occasions', tagline: 'Nait zeuren, gewoon rijden', street: 'Damsterdiep', at: [740, 226] },
  { id: 'rook', type: 'tabak', name: 'Rook & Geluk', tagline: 'Kraskaarten, loten en een eierbal uit de muur', street: 'Gelkingestraat', at: [240, 262] },
];

// --- stock ------------------------------------------------------------------

const WEAPON_STOCK = [
  { key: 'pistol', label: 'Pistool "Klapperman"', desc: 'Betrouwbaar, handzaam, luid genoeg', gun: 180, ammoPrice: 45, ammo: 36, cap: 250 },
  { key: 'uzi', label: 'Uzi "Ratelaar"', desc: 'Veel lood, weinig precisie', gun: 450, ammoPrice: 70, ammo: 90, cap: 600 },
  { key: 'shotgun', label: 'Hagelgeweer "Boerenbuks"', desc: 'Van de boer uit Ten Boer. Dichtbij: weg is weg', gun: 600, ammoPrice: 60, ammo: 12, cap: 80 },
];

const OUTFITS = {
  tammo: [
    { id: 'stadjer', label: 'Stadjer classic', desc: 'Het vertrouwde jack en de oranje pet', price: 40, shirt: 0x3f6ea8, pants: 0x2f3b52, cap: 0xc8621e, shoes: 0xd8d4cc },
    { id: 'groenwit', label: 'Groen-wit tot in de kist', desc: 'Voor op de tribune en daarbuiten', price: 120, shirt: 0x1e9e56, pants: 0xe8e6e0, cap: 0x1e9e56, shoes: 0xe8e6e0 },
    { id: 'boer', label: 'Boer op zundag', desc: 'Olijfgroen en bruin, klaar voor het Hogeland', price: 80, shirt: 0x5b6b3a, pants: 0x4a3a2a, cap: 0x2e4a34, shoes: 0x3b2a1e },
    { id: 'keuning', label: 'Keuningsdag', desc: 'Oranje boven, ook buiten april', price: 90, shirt: 0xe0701e, pants: 0x2f3b52, cap: 0xe0701e, shoes: 0xd8d4cc },
    { id: 'corps', label: 'Corpsbal', desc: 'Navy colbert, chino, pet van pappie', price: 160, shirt: 0x1f2a4a, pants: 0xb8a27a, cap: 0x7a1f1f, shoes: 0x3b2a1e },
    { id: 'incognito', label: 'Zwart incognito', desc: 'Onopvallend: de politie raakt je sneller kwijt', price: 150, shirt: 0x1c1c1e, pants: 0x19191b, cap: 0x232326, shoes: 0x1e1e1e, stealth: 2 },
  ],
  anita: [
    { id: 'classic', label: 'Rode jas classic', desc: 'Haar eigen, vertrouwde jas', price: 40, shirt: 0x9e3027, pants: 0x26262a, shoes: 0x2a1d14 },
    { id: 'groenwit', label: 'Groen-wit tot in de kist', desc: 'Voor op de tribune en daarbuiten', price: 120, shirt: 0x1e9e56, pants: 0xe8e6e0, shoes: 0xe8e6e0 },
    { id: 'noorderzon', label: 'Noorderzon', desc: 'Mosterdgele jas, festivalproof', price: 90, shirt: 0xc9a227, pants: 0x3a4d6e, shoes: 0x5a3d26 },
    { id: 'pastel', label: 'Lente op de Vismarkt', desc: 'Zacht roze met crème', price: 100, shirt: 0xc98fa8, pants: 0xe3ddd0, shoes: 0xd8d4cc },
    { id: 'wadloper', label: 'Wadloper', desc: 'Zeeblauw en laarzen, klaar voor Pieterburen', price: 80, shirt: 0x2f5c8a, pants: 0x3b4a3a, shoes: 0x2a1d14 },
    { id: 'incognito', label: 'Zwart incognito', desc: 'Onopvallend: de politie raakt je sneller kwijt', price: 150, shirt: 0x1c1c1e, pants: 0x19191b, shoes: 0x1e1e1e, stealth: 2 },
  ],
};
const DEFAULT_OUTFIT = { tammo: 'stadjer', anita: 'classic' };

const HAIR_COLORS = [
  { id: 'naturel', label: 'Naturel', price: 30 },
  { id: 'zwart', label: 'Ravenzwart', price: 30, hair: 0x1b1716 },
  { id: 'bruin', label: 'Kastanjebruin', price: 30, hair: 0x5a3d26 },
  { id: 'blond', label: 'Strandblond', price: 35, hair: 0xcdb485 },
  { id: 'ros', label: 'Rossig', price: 35, hair: 0x93462a },
  { id: 'grijs', label: 'Grijs-chic', price: 35, hair: 0xb4afa6 },
  { id: 'groen', label: 'Stadjersgroen', price: 55, hair: 0x1e9e56 },
  { id: 'roze', label: 'Knalroze', price: 55, hair: 0xd0457a },
];
const HAIR_STYLES = {
  tammo: [['short', 'Kort en netjes'], ['buzz', 'Tondeuse op 3'], ['curly', 'Krullenbol']],
  anita: [['long', 'Lang en los'], ['ponytail', 'Paardenstaart'], ['bun', 'Knotje'], ['bob', 'Bob'], ['curly', 'Krullen']],
};
const STYLE_PRICE = 40;

// display names in vehiclenames.js are picked by id % list length, so a
// vehicle's id is chosen to land on the name it was sold under
const VEHICLE_STOCK = {
  omafiets: { kind: 'bike', label: 'Omafiets', desc: 'Zwart, zwaar en onverwoestbaar', price: 75, nameIdx: 0, color: '#1c1c1c', model: { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 6.2, accel: 3.2, brake: 6, turnRate: 4.6 } },
  stadsfiets: { kind: 'bike', label: 'Stadsfiets', desc: 'Lichter en sneller, in Stadjersgroen', price: 110, nameIdx: 2, color: '#1e9e56', model: { name: 'bike', len: 1.75, wid: 0.5, maxSpeed: 7.0, accel: 3.6, brake: 6.2, turnRate: 4.8 } },
  fatbike: { kind: 'bike', label: 'Fatbike "Dikke Tinus"', desc: 'Dikke banden, dikke prijs', price: 350, nameIdx: 0, color: '#20221f', model: { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 7.4, accel: 3.4, brake: 5, turnRate: 3.8 } },
  brommer: { kind: 'scooter', label: 'Brommer Zoemzoem', desc: 'Elektrisch, stil, rap', price: 600, nameIdx: 0, color: '#c94b3a', model: { name: 'scooter', len: 1.15, wid: 0.42, maxSpeed: 8.5, accel: 4.0, brake: 4.4, turnRate: 5.4 } },
  mug: { kind: 'car', label: 'Hunze Mug', desc: 'Kleine hatchback, parkeert overal', price: 800, nameIdx: 2, color: '#2e6b9e', model: { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 30, accel: 8.5, brake: 15, turnRate: 3.0 } },
  koopman: { kind: 'car', label: 'Reitdiep Koopman', desc: 'Stationwagen voor de hele familie', price: 1150, nameIdx: 0, color: '#2e4a34', model: { name: 'wagon', len: 4.5, wid: 1.8, maxSpeed: 32, accel: 8, brake: 15, turnRate: 2.5 } },
  klusbus: { kind: 'car', label: 'Oldambt Klusbus', desc: 'Bestelbus: ramt alles opzij', price: 1300, nameIdx: 0, color: '#d9d9d9', model: { name: 'van', len: 5.0, wid: 2.0, maxSpeed: 26, accel: 6.5, brake: 13, turnRate: 2.0 } },
  wervelwind: { kind: 'car', label: 'Wadden Wervelwind', desc: 'Sportwagen. Rap as de wind over de dijk', price: 2400, nameIdx: 0, color: '#c9a227', model: { name: 'sport', len: 4.1, wid: 1.85, maxSpeed: 42, accel: 12, brake: 19, turnRate: 3.2 } },
};

const PAINTS = [
  { id: 'rood', label: 'Brandweerrood', color: '#a11f1f' },
  { id: 'groen', label: 'Stadjersgroen', color: '#1e9e56' },
  { id: 'zwart', label: 'Nachtzwart', color: '#1b1c1f' },
  { id: 'wit', label: 'Kwarkwit', color: '#e8e6e0' },
  { id: 'geel', label: 'Koolzaadgeel', color: '#d9b21b' },
  { id: 'oranje', label: 'Oranje', color: '#d8641c' },
  { id: 'blauw', label: 'Reitdiepblauw', color: '#2e5f9e' },
  { id: 'paars', label: 'Paars-pimp', color: '#6a2e8a' },
];
const PAINT_PRICE = 120;

// --- state --------------------------------------------------------------------

let shops = [];
const state = {
  outfit: { ...DEFAULT_OUTFIT },
  ownedOutfits: new Set(['tammo:stadjer', 'anita:classic']),
  hair: { tammo: { color: 'naturel', style: 'short' }, anita: { color: 'naturel', style: 'long' } },
  vehicles: [], // { spec, color, v, x, y, angle }
  heroColor: null,
  lastStealthAt: -Infinity,
};
let baseLook = null;
let idSeq = 0;
let worldRef = null;

const snapshot = (a) => ({ shirt: a.shirt, pants: a.pants, shoes: a.shoes, hair: a.hair, hairStyle: a.hairStyle, cap: a.cap });

// --- placement ---------------------------------------------------------------

function facadeFor(map, x, y) {
  let best = null;
  for (const b of map.buildingsNear(x, y, 22)) {
    const pts = b.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, x: cp.x, y: cp.y, b, ax: pts[i][0], ay: pts[i][1], bx: pts[i + 1][0], by: pts[i + 1][1] };
    }
  }
  if (!best || best.d2 < 0.01) return null;
  let nx = -(best.by - best.ay), ny = best.bx - best.ax;
  const l = Math.hypot(nx, ny) || 1;
  nx /= l; ny /= l;
  if (nx * (x - best.x) + ny * (y - best.y) < 0) { nx = -nx; ny = -ny; }
  return { x: best.x, y: best.y, nx, ny, h: Math.max(2.4, (best.b.h || 3) * 3.1) };
}

function nearestOnStreet(map, name, x, y) {
  let best = null;
  for (const r of map.roadsNear(x, y, 120)) {
    if (r.name !== name) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, x: cp.x, y: cp.y, dx: r.pts[i + 1][0] - r.pts[i][0], dy: r.pts[i + 1][1] - r.pts[i][1] };
    }
  }
  return best;
}

function placeShop(map, def, horeca) {
  const street = nearestOnStreet(map, def.street, def.at[0], def.at[1]) || { x: def.at[0], y: def.at[1], dx: 1, dy: 0 };
  const l = Math.hypot(street.dx, street.dy) || 1;
  const tx = street.dx / l, ty = street.dy / l;
  for (let k = 0; k < 12; k++) {
    const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 4;
    const sx = street.x + tx * off, sy = street.y + ty * off;
    const f = facadeFor(map, sx, sy);
    if (!f) continue;
    const [dx, dy] = map.escapeBuilding(f.x + f.nx * 1.3, f.y + f.ny * 1.3, 0.8);
    if (isInWater(map, dx, dy)) continue;
    if (horeca.some((h) => dist(h.x, h.y, dx, dy) < 4.5)) continue;
    return { ...def, x: dx, y: dy, face: f };
  }
  return null;
}

export function initShops(world) {
  worldRef = world;
  initShopUi(world);
  baseLook = { tammo: snapshot(TAMMO_APPEARANCE), anita: snapshot(ANITA_APPEARANCE) };
  const horeca = getHorecaForRender();
  shops = SHOP_DEFS.map((d) => placeShop(world.map, d, horeca)).filter(Boolean);
  const scene = getScene();
  if (scene) for (const s of shops) scene.add(buildShopFront3D(s));
}

export function getShopsForRender() {
  return shops;
}

export function getOwnedVehiclesForRender() {
  return state.vehicles.filter((o) => o.v && !o.v.wrecked).map((o) => ({ v: o.v, label: o.spec.label }));
}

// --- interaction -------------------------------------------------------------

export function nearestShop(world) {
  if (!shops.length || world.player.inVehicle || world.player.swimming) return null;
  const { x, y } = world.player;
  let best = null, bestD = SHOP_USE_RADIUS;
  for (const s of shops) {
    const d = dist(x, y, s.x, s.y);
    if (d <= bestD) { best = s; bestD = d; }
  }
  return best;
}

function paintableVehicle(v) {
  return v && !v.isBoat && !v.isBus && !v.isPolice && !v.wrecked;
}

function garageForPaint(world) {
  const v = world.player.inVehicle;
  if (!paintableVehicle(v) || Math.abs(v.speed) > 2) return null;
  for (const g of getPickupsForRender().garages || []) {
    if (dist(v.x, v.y, g.x, g.y) < GARAGE_PAINT_RADIUS) return g;
  }
  return null;
}

function policeWatching(world) {
  return world.wanted > 0 && !!(world.police && world.police.seenRecently);
}

export function shopPrimaryPrompt(world) {
  const g = garageForPaint(world);
  if (g) return { id: 'paint-' + g.x, x: g.x, y: g.y, h: 2.6, key: 'R', label: 'Nieuwe lak', sub: `Spuit & Klaar: kies een kleur, €${PAINT_PRICE}`, ring: true };
  const s = nearestShop(world);
  if (!s) return null;
  if (policeWatching(world)) return { id: 'shop-' + s.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: 'Binnenlopen', sub: `${s.name}: deur op slot, politie op je hielen`, ring: true, dim: true };
  return { id: 'shop-' + s.id, x: s.x, y: s.y, h: 2.75, key: 'E', label: 'Binnenlopen', sub: `${s.name}: ${SHOP_TYPES[s.type].label.toLowerCase()}`, ring: true };
}

export function shopSecondaryPrompts(world) {
  if (world.player.inVehicle) return [];
  const { x, y } = world.player;
  const out = [];
  for (const s of shops) {
    if (Math.abs(s.x - x) > 16 || Math.abs(s.y - y) > 16) continue;
    out.push({ id: 'shop2-' + s.id, x: s.x, y: s.y, h: 2.2, label: s.name, sub: SHOP_TYPES[s.type].label, kind: 'place' });
  }
  return out;
}

// Runs before the horeca/player E handlers so E at a shop door opens the
// menu; R at a Spuit & Klaar opens the paint menu (E there still exits).
export function tryShopInteract(world) {
  const { input } = world;
  if (!input || isShopOpen() || isCinematicActive()) return false;
  if (input.wasPressed('r') && garageForPaint(world)) {
    input.consume('r');
    openShopMenu(world, paintShop(world));
    return true;
  }
  if (!(input.wasPressed('e') || input.wasPressed('f'))) return false;
  const s = nearestShop(world);
  if (!s) return false;
  input.consume('e');
  input.consume('f');
  if (policeWatching(world)) {
    world.addMessage(`${s.name} gooit de deur op slot. Eerst de politie kwijt!`, 3);
    return true;
  }
  openShopMenu(world, shopMenu(world, s));
  return true;
}

// --- menus ---------------------------------------------------------------------

function pay(world, price) {
  if (world.money < price) return false;
  world.money -= price;
  recordStat(world, 'purchases');
  recordStat(world, 'spent', price);
  return true;
}

const hexCss = (n) => '#' + n.toString(16).padStart(6, '0');
const broke = (world, price) => world.money < price ? 'Te weinig geld' : '';

function shopMenu(world, s) {
  const build = { wapens: weaponSections, kleding: outfitSections, kapper: hairSections, fietsen: (w) => vehicleSections(w, 'fietsen'), auto: (w) => vehicleSections(w, 'auto'), tabak: tabakSections }[s.type];
  return { name: s.name, type: s.type, tagline: s.tagline, color: SHOP_TYPES[s.type].color, sections: () => build(world) };
}

function weaponSections(world) {
  const guns = WEAPON_STOCK.map((w) => {
    const have = world.ammo[w.key] || 0;
    const owned = have > 0;
    const price = owned ? w.ammoPrice : w.gun;
    const full = have >= w.cap;
    return {
      id: 'w-' + w.key,
      label: owned ? `${w.label.split(' ')[0]}-patronen` : w.label,
      desc: owned ? `+${w.ammo} patronen · nu ${have}` : `${w.desc} · met ${w.ammo} patronen`,
      price,
      disabled: full ? 'Zak zit vol' : broke(world, price),
      buy() {
        if (!pay(world, price)) return null;
        world.ammo[w.key] = Math.min(w.cap, have + w.ammo);
        if (world.weapon === 'fists' || !(world.ammo[world.weapon] > 0)) world.weapon = w.key;
        return owned ? `${w.ammo} patronen erbij` : `${w.label} gekocht. Voorzichtig ermee, jong`;
      },
    };
  });
  const vest = (amount, price, label, desc) => ({
    id: 'armor-' + amount, label, desc: `${desc} · pantser nu ${Math.round(world.armor)}`, price,
    disabled: world.armor >= 100 ? 'Pantser is al vol' : broke(world, price),
    buy() {
      if (!pay(world, price)) return null;
      world.armor = Math.min(100, world.armor + amount);
      return `${label} aangetrokken`;
    },
  });
  return [
    { title: 'Wapens & munitie', items: guns },
    { title: 'Bescherming', items: [vest(50, 85, 'Bodywarmer met plaatjes', '+50 pantser'), vest(100, 150, 'Kogelwerend vest', 'Volle bescherming')] },
  ];
}

function currentChar(world) {
  return world.player.character === 'anita' ? 'anita' : 'tammo';
}

function outfitSections(world) {
  const ch = currentChar(world);
  const name = ch === 'anita' ? 'Anita' : 'Tammo';
  const items = OUTFITS[ch].map((o) => {
    const key = ch + ':' + o.id;
    const owned = state.ownedOutfits.has(key);
    const wearing = state.outfit[ch] === o.id;
    return {
      id: 'o-' + o.id,
      label: o.label,
      desc: o.desc,
      price: owned ? 0 : o.price,
      tag: wearing ? 'Aan' : owned ? 'In bezit' : '',
      swatch: [o.shirt, o.pants, o.cap ?? o.shoes].map(hexCss),
      disabled: wearing ? 'Heb je al aan' : owned ? '' : broke(world, o.price),
      buy() {
        if (!owned && !pay(world, o.price)) return null;
        state.ownedOutfits.add(key);
        state.outfit[ch] = o.id;
        applyLooks();
        const lost = shakeWanted(world, o.stealth || 1);
        return (owned ? `${o.label} weer aangetrokken` : `${o.label} gekocht en meteen aan`) + (lost ? '. De politie herkent je niet meer zo goed!' : '');
      },
    };
  });
  const note = world.wanted > 0 ? 'Nieuwe kleren terwijl de politie je kwijt is: een ster minder' : 'Omkleden terwijl je gezocht wordt en niemand je ziet? Scheelt een ster';
  return [{ title: `Outfits voor ${name}`, note, items }];
}

function shakeWanted(world, stars) {
  if (world.wanted <= 0 || policeWatching(world) || world.time - state.lastStealthAt < OUTFIT_WANTED_COOLDOWN) return false;
  state.lastStealthAt = world.time;
  world.wanted = Math.max(0, world.wanted - stars);
  world.wantedDecayTimer = 0;
  return true;
}

function hairSections(world) {
  const ch = currentChar(world);
  const cur = state.hair[ch];
  const naturel = baseLook[ch].hair;
  const colors = HAIR_COLORS.map((c) => ({
    id: 'h-' + c.id, label: c.label, desc: c.id === 'naturel' ? 'Terug naar je eigen kleur' : 'Verven, föhnen, klaar',
    price: c.price, tag: cur.color === c.id ? 'Nu' : '', swatch: [hexCss(c.hair ?? naturel)],
    disabled: cur.color === c.id ? 'Heb je al' : broke(world, c.price),
    buy() {
      if (!pay(world, c.price)) return null;
      cur.color = c.id;
      applyLooks();
      return `Haar ${c.label.toLowerCase()}. Staat je goed!`;
    },
  }));
  const styles = HAIR_STYLES[ch].map(([id, label]) => ({
    id: 'hs-' + id, label, desc: ch === 'tammo' ? 'Onder de pet, maar jij weet het' : 'Knippen en stylen',
    price: STYLE_PRICE, tag: cur.style === id ? 'Nu' : '',
    disabled: cur.style === id ? 'Heb je al' : broke(world, STYLE_PRICE),
    buy() {
      if (!pay(world, STYLE_PRICE)) return null;
      cur.style = id;
      applyLooks();
      return `${label}: de kapper is tevreden`;
    },
  }));
  return [{ title: 'Haarkleur', items: colors }, { title: 'Model', items: styles }];
}

function vehicleSections(world, type) {
  const kinds = type === 'auto' ? ['car'] : ['bike', 'scooter'];
  const shop = shops.find((s) => s.type === type);
  const items = Object.entries(VEHICLE_STOCK).filter(([, sp]) => kinds.includes(sp.kind)).map(([key, sp]) => ({
    id: 'v-' + key, label: sp.label, desc: `${sp.desc} · wordt voor de deur gezet`, price: sp.price,
    swatch: [sp.color], disabled: broke(world, sp.price),
    buy() {
      if (!pay(world, sp.price)) return null;
      const v = deliver(world, key, sp.color, shop);
      if (!v) { world.money += sp.price; return 'Bezorging mislukt, geld terug'; }
      if (state.vehicles.length > MAX_OWNED_VEHICLES) state.vehicles.shift();
      return `${sp.label} staat voor de deur. Van jou, geen diefstal!`;
    },
  }));
  const sections = [{ title: type === 'auto' ? 'Occasions' : 'Tweewielers', items }];
  const mine = state.vehicles.filter((o) => kinds.includes(VEHICLE_STOCK[o.key].kind));
  if (mine.length) {
    sections.push({
      title: 'Jouw voertuigen',
      items: mine.map((o, i) => {
        const here = o.v && world.vehicles.includes(o.v) && dist(o.v.x, o.v.y, shop.x, shop.y) < 40;
        return {
          id: 'mine-' + i, label: o.spec.label, desc: here ? 'Staat al voor de deur' : 'Laat hem hier voor de deur zetten',
          price: REDELIVERY_FEE, tag: 'Van jou', swatch: [o.color],
          disabled: here ? 'Staat al hier' : o.v && o.v.driver === 'player' ? 'Je zit erop' : broke(world, REDELIVERY_FEE),
          buy() {
            if (!pay(world, REDELIVERY_FEE)) return null;
            removeFromWorld(world, o.v);
            const at = deliveryPoint(world.map, shop, o.spec.kind === 'car');
            o.v = spawnOwned(world, o, at.x, at.y);
            return `${o.spec.label} wordt voor de deur gezet`;
          },
        };
      }),
    });
  }
  return sections;
}

const SCRATCH = [[0.002, 500], [0.018, 50], [0.08, 15], [0.2, 5]];
const LOTTERY = [[0.004, 2500], [0.05, 200]];

function draw(table) {
  let r = Math.random();
  for (const [p, prize] of table) {
    if (r < p) return prize;
    r -= p;
  }
  return 0;
}

function tabakSections(world) {
  const gamble = (id, label, desc, price, table, big) => ({
    id, label, desc, price, disabled: broke(world, price), keepFocus: true,
    buy() {
      if (!pay(world, price)) return null;
      const prize = draw(table);
      world.money += prize;
      if (!prize) return { text: 'Niks. Volgende keer beter, jong', tone: 'lose' };
      return { text: prize >= big ? `JACKPOT! €${prize} gewonnen!` : `Joa! €${prize} gewonnen`, tone: prize >= big ? 'jackpot' : 'win' };
    },
  });
  const snack = (id, label, desc, price, hp) => ({
    id, label, desc: `${desc} · +${hp} gezondheid`, price, keepFocus: true,
    disabled: world.health >= 100 ? 'Je zit vol' : broke(world, price),
    buy() {
      if (!pay(world, price)) return null;
      world.health = Math.min(100, world.health + hp);
      return `${label} naar binnen gewerkt`;
    },
  });
  return [
    { title: 'Geluk', items: [
      gamble('scratch', 'Kraskaart "Grunneger Gokje"', 'Krassen maar! Hoofdprijs €500', 5, SCRATCH, 500),
      gamble('lot', 'Stadsloterij-lot', 'Trekking meteen. Hoofdprijs €2500', 25, LOTTERY, 2500),
    ] },
    { title: 'Uit de muur', items: [
      snack('eierbal', 'Eierbal', 'Warm uit de automaat naast de deur', 6, 10),
      snack('koek', 'Grunneger koek', 'Plak kruidkoek voor onderweg', 4, 6),
    ] },
  ];
}

function paintShop(world) {
  return {
    name: 'Spuit & Klaar', type: 'spuit', tagline: 'Nieuwe kleur, nieuwe kans. Klaar terwijl je wacht', color: SHOP_TYPES.spuit.color,
    sections: () => {
      const v = world.player.inVehicle;
      if (!v) return [];
      const cur = (v.model && v.model.color || '').toLowerCase();
      return [{
        title: 'Kies een kleur',
        note: world.wanted > 0 ? 'Een nieuwe kleur en de politie is je kwijt' : '',
        items: PAINTS.map((p) => ({
          id: 'p-' + p.id, label: p.label, desc: 'Complete spuitbeurt, droog in een minuut', price: PAINT_PRICE,
          swatch: [p.color], tag: cur === p.color ? 'Nu' : '',
          disabled: cur === p.color ? 'Heeft deze kleur al' : broke(world, PAINT_PRICE),
          buy() {
            if (!pay(world, PAINT_PRICE)) return null;
            repaint(world, v, p.color);
            if (world.wanted > 0) { world.wanted = 0; world.wantedDecayTimer = 0; }
            return `${p.label}: als nieuw!`;
          },
        })),
      }];
    },
  };
}

// --- looks -------------------------------------------------------------------

function applyLooks() {
  if (!baseLook) return;
  for (const ch of ['tammo', 'anita']) {
    const app = ch === 'tammo' ? TAMMO_APPEARANCE : ANITA_APPEARANCE;
    const o = OUTFITS[ch].find((x) => x.id === state.outfit[ch]) || OUTFITS[ch][0];
    const h = state.hair[ch];
    const hc = HAIR_COLORS.find((c) => c.id === h.color);
    Object.assign(app, baseLook[ch], { shirt: o.shirt, pants: o.pants, shoes: o.shoes });
    if (o.cap != null) app.cap = o.cap;
    if (hc && hc.hair != null) app.hair = hc.hair;
    if (HAIR_STYLES[ch].some(([id]) => id === h.style)) app.hairStyle = h.style;
  }
  refreshCharacterMeshes();
  for (const o of state.vehicles) if (o.v) setRider(o.v);
}

function riderShirt() {
  const anita = worldRef && worldRef.player.character === 'anita';
  return hexCss((anita ? ANITA_APPEARANCE : TAMMO_APPEARANCE).shirt);
}

function setRider(v) {
  if (v.isBike || v.isScooter) v.model = { ...v.model, rider: riderShirt() };
}

// --- vehicles -------------------------------------------------------------------

function newVehicleId(nameIdx) {
  idSeq++;
  return 720000 + idSeq * 6 + nameIdx;
}

function removeFromWorld(world, v) {
  if (!v || v.driver === 'player') return;
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
}

function spawnOwned(world, o, x, y, angle = null) {
  const sp = o.spec;
  const map = world.map;
  const point = map.nearestRoadPoint(x, y, 150, sp.kind === 'car');
  if (!point) return null;
  const v = spawnVehicleOnRoad(map, point.road, false, Math.random, sp.kind === 'bike', false, angle == null ? point : { x, y }, sp.kind === 'scooter');
  v.model = { ...sp.model, color: o.color };
  v.id = newVehicleId(sp.nameIdx);
  v.playerOwned = true;
  setRider(v);
  if (angle == null) {
    const kerb = Math.max(0, (point.road.width || 6) / 2 - sp.model.wid / 2 - 0.3);
    v.x += -Math.sin(v.angle) * kerb;
    v.y += Math.cos(v.angle) * kerb;
    [v.x, v.y] = map.escapeBuilding(v.x, v.y, sp.model.wid);
  } else {
    v.x = x; v.y = y; v.angle = angle;
  }
  v.road = null;
  v.speed = 0;
  world.vehicles.push(v);
  return v;
}

// a few metres down the street from the door, so the E prompt for the new
// ride doesn't compete with the shop's own
function deliveryPoint(map, shop, car) {
  const rp = map.nearestRoadPoint(shop.x, shop.y, 150, car);
  if (!rp) return { x: shop.x, y: shop.y };
  const pts = rp.road.pts;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(rp.x, rp.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < bd) { bd = cp.dist2; bi = i; }
  }
  const dx = pts[bi + 1][0] - pts[bi][0], dy = pts[bi + 1][1] - pts[bi][1];
  const l = Math.hypot(dx, dy) || 1;
  const step = car ? 9 : 5;
  return { x: rp.x + dx / l * step, y: rp.y + dy / l * step };
}

function deliver(world, key, color, shop) {
  const o = { key, spec: VEHICLE_STOCK[key], color, v: null };
  const at = deliveryPoint(world.map, shop, o.spec.kind === 'car');
  o.v = spawnOwned(world, o, at.x, at.y);
  if (!o.v) return null;
  state.vehicles.push(o);
  return o.v;
}

function repaint(world, v, color) {
  v.model = { ...v.model, color };
  // scene3d keys vehicle meshes by id: a fresh id makes it rebuild the mesh
  // in the new colour; +600000 keeps id % 6 and with it the display name
  v.id += 600000;
  if (v.isHeroCar) state.heroColor = color;
  const o = state.vehicles.find((x) => x.v === v);
  if (o) o.color = color;
}

let upkeepTimer = 0;
const riderMeshes = new Map();

// Parked owned bikes/scooters show no rider: the built-in rider figure is
// taken over from syncBikeRider (ragdoll.js) and only shown while ridden.
function syncOwnedRiders(world, lookup) {
  const scene = lookup ? getScene() : null;
  for (const o of state.vehicles) {
    const v = o.v;
    if (!v || !(v.isBike || v.isScooter)) continue;
    let rec = riderMeshes.get(v);
    if (rec && (!rec.mesh.parent || rec.mesh.userData.vehicleId !== v.id)) { riderMeshes.delete(v); rec = null; }
    if (!rec && scene) {
      const mesh = scene.children.find((c) => c.userData && c.userData.vehicleId === v.id);
      const rider = mesh && mesh.children.find((c) => c.userData && c.userData.legL);
      if (rider) {
        mesh.userData.riderFig = null;
        rec = { mesh, rider };
        riderMeshes.set(v, rec);
      }
    }
    if (rec) rec.rider.visible = v.driver === 'player' && !v.riderOff;
  }
  if (world.player.character !== lastRiderChar) {
    lastRiderChar = world.player.character;
    for (const o of state.vehicles) if (o.v) setRider(o.v);
  }
}
let lastRiderChar = null;

export function updateShops(dt, world) {
  upkeepTimer -= dt;
  syncOwnedRiders(world, upkeepTimer <= 0);
  if (upkeepTimer > 0) return;
  upkeepTimer = 0.25;
  for (let i = state.vehicles.length - 1; i >= 0; i--) {
    const o = state.vehicles[i];
    const v = o.v;
    if (!v) continue;
    if (v.wrecked) {
      state.vehicles.splice(i, 1);
      if (world.player.inVehicle !== v) world.addMessage(`Je ${o.spec.label} is total loss. Weg is weg.`, 3);
      continue;
    }
    // the ambient population managers sweep far-away bikes and cars; an
    // owned one is simply put back where it stood (unless it sank)
    if (!world.vehicles.includes(v)) {
      if (v.sinking) { o.v = null; continue; }
      world.vehicles.push(v);
    }
    o.x = v.x; o.y = v.y; o.angle = v.angle;
  }
  const hero = world.vehicles.find((v) => v.isHeroCar);
  if (hero && state.heroColor && hero.model.color !== state.heroColor) repaint(world, hero, state.heroColor);
}

// --- save ----------------------------------------------------------------------

export function getShopSave() {
  const round = (n) => Math.round(n * 10) / 10;
  return {
    outfit: { ...state.outfit },
    ownedOutfits: [...state.ownedOutfits],
    hair: { tammo: { ...state.hair.tammo }, anita: { ...state.hair.anita } },
    heroColor: state.heroColor,
    vehicles: state.vehicles.slice(-MAX_OWNED_VEHICLES).map((o) => {
      const v = o.v;
      const pos = v && !v.isBoat ? { x: round(v.x), y: round(v.y), angle: round(v.angle) } : o.x != null ? { x: round(o.x), y: round(o.y), angle: round(o.angle) } : null;
      return { key: o.key, color: o.color, ...pos };
    }),
  };
}

const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

export function applyShopSave(world, d) {
  if (!d || typeof d !== 'object') return;
  for (const ch of ['tammo', 'anita']) {
    if (d.outfit && OUTFITS[ch].some((o) => o.id === d.outfit[ch])) state.outfit[ch] = d.outfit[ch];
    const h = d.hair && d.hair[ch];
    if (h && HAIR_COLORS.some((c) => c.id === h.color)) state.hair[ch].color = h.color;
    if (h && HAIR_STYLES[ch].some(([id]) => id === h.style)) state.hair[ch].style = h.style;
  }
  if (Array.isArray(d.ownedOutfits)) for (const k of d.ownedOutfits) if (typeof k === 'string') state.ownedOutfits.add(k);
  state.heroColor = isColor(d.heroColor) ? d.heroColor : null;
  for (const o of state.vehicles) removeFromWorld(world, o.v);
  state.vehicles = [];
  for (const sv of Array.isArray(d.vehicles) ? d.vehicles.slice(-MAX_OWNED_VEHICLES) : []) {
    const spec = VEHICLE_STOCK[sv && sv.key];
    if (!spec) continue;
    const o = { key: sv.key, spec, color: isColor(sv.color) ? sv.color : spec.color, v: null };
    const has = Number.isFinite(sv.x) && Number.isFinite(sv.y);
    o.v = has ? spawnOwned(world, o, sv.x, sv.y, Number.isFinite(sv.angle) ? sv.angle : 0) : spawnOwned(world, o, world.player.x, world.player.y);
    if (o.v) state.vehicles.push(o);
  }
  applyLooks();
  upkeepTimer = 0;
}

// --- icons ---------------------------------------------------------------------

// Cream pictogram per shop type in a unit box (-1..1) centred on the origin;
// shared by the 3D badges, shopfront signs, map icons and the shop menu.
export function drawShopGlyph(g, type, r, bg) {
  g.save();
  g.scale(r, r);
  g.fillStyle = '#f2ede0';
  g.strokeStyle = '#f2ede0';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = 0.16;
  g.beginPath();
  switch (type) {
    case 'wapens':
      g.rect(-0.78, -0.42, 1.36, 0.32);
      g.moveTo(0.08, -0.12); g.lineTo(0.56, -0.12); g.lineTo(0.42, 0.62); g.lineTo(0.02, 0.62); g.closePath();
      g.fill();
      g.beginPath(); g.moveTo(-0.14, -0.1); g.quadraticCurveTo(-0.16, 0.24, 0.06, 0.24); g.stroke();
      break;
    case 'kleding':
      g.moveTo(-0.34, -0.64); g.quadraticCurveTo(0, -0.36, 0.34, -0.64);
      g.lineTo(0.8, -0.3); g.lineTo(0.58, 0.02); g.lineTo(0.4, -0.08); g.lineTo(0.4, 0.66);
      g.lineTo(-0.4, 0.66); g.lineTo(-0.4, -0.08); g.lineTo(-0.58, 0.02); g.lineTo(-0.8, -0.3); g.closePath();
      g.fill();
      break;
    case 'kapper':
      g.lineWidth = 0.15;
      g.arc(-0.34, 0.42, 0.22, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0.34, 0.42, 0.22, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-0.2, 0.25); g.lineTo(0.32, -0.72); g.moveTo(0.2, 0.25); g.lineTo(-0.32, -0.72); g.stroke();
      break;
    case 'fietsen':
      g.lineWidth = 0.13;
      g.arc(-0.48, 0.24, 0.32, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0.48, 0.24, 0.32, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(-0.48, 0.24); g.lineTo(-0.12, -0.3); g.lineTo(0.3, -0.3); g.lineTo(0.48, 0.24);
      g.moveTo(-0.48, 0.24); g.lineTo(0.02, 0.24); g.lineTo(0.3, -0.3);
      g.moveTo(-0.2, -0.46); g.lineTo(0.0, -0.46); g.moveTo(0.3, -0.3); g.lineTo(0.26, -0.52); g.lineTo(0.44, -0.54);
      g.stroke();
      break;
    case 'auto':
      g.moveTo(-0.84, 0.3); g.lineTo(-0.84, 0.0); g.lineTo(-0.5, -0.08); g.lineTo(-0.28, -0.44); g.lineTo(0.32, -0.44);
      g.lineTo(0.54, -0.08); g.lineTo(0.84, 0.0); g.lineTo(0.84, 0.3); g.closePath();
      g.fill();
      g.fillStyle = bg;
      g.beginPath(); g.moveTo(-0.18, -0.34); g.lineTo(0.0, -0.34); g.lineTo(0.0, -0.1); g.lineTo(-0.36, -0.1); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(0.1, -0.34); g.lineTo(0.28, -0.34); g.lineTo(0.42, -0.1); g.lineTo(0.1, -0.1); g.closePath(); g.fill();
      g.fillStyle = '#f2ede0'; g.strokeStyle = bg; g.lineWidth = 0.1;
      for (const wx of [-0.46, 0.46]) { g.beginPath(); g.arc(wx, 0.32, 0.2, 0, Math.PI * 2); g.fill(); g.stroke(); }
      break;
    case 'tabak':
      g.rotate(-0.22);
      g.rect(-0.72, -0.46, 1.44, 0.92);
      g.fill();
      g.fillStyle = bg;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.14 : 0.34;
        if (i) g.lineTo(Math.cos(a) * rr - 0.16, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr - 0.16, Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
      g.strokeStyle = bg; g.lineWidth = 0.09;
      g.beginPath(); g.moveTo(0.3, -0.2); g.lineTo(0.56, -0.2); g.moveTo(0.3, 0.02); g.lineTo(0.56, 0.02); g.moveTo(0.3, 0.24); g.lineTo(0.5, 0.24); g.stroke();
      break;
    case 'spuit':
      g.rect(-0.32, -0.3, 0.52, 0.96);
      g.rect(-0.2, -0.5, 0.28, 0.2);
      g.fill();
      g.beginPath(); g.arc(0.42, -0.62, 0.06, 0, Math.PI * 2); g.arc(0.62, -0.42, 0.06, 0, Math.PI * 2); g.arc(0.66, -0.72, 0.05, 0, Math.PI * 2); g.fill();
      break;
  }
  g.restore();
}

// Map marker: rounded square in the shop colour (horeca is a circle).
export function drawShopMapIcon(ctx, type, s) {
  const t = SHOP_TYPES[type];
  if (!t) return;
  ctx.beginPath();
  ctx.roundRect(-4.6 * s, -4.6 * s, 9.2 * s, 9.2 * s, 2 * s);
  ctx.fillStyle = t.color;
  ctx.fill();
  ctx.lineWidth = 1.2 * s;
  ctx.strokeStyle = '#0c140e';
  ctx.stroke();
  drawShopGlyph(ctx, type, 3.4 * s, t.color);
}

const iconUrls = {};
export function shopIconUrl(type, px = 64) {
  const k = type + px;
  if (iconUrls[k]) return iconUrls[k];
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const col = SHOP_TYPES[type] ? SHOP_TYPES[type].color : '#1e9e56';
  g.translate(px / 2, px / 2);
  g.beginPath(); g.arc(0, 0, px / 2 - 2, 0, Math.PI * 2); g.fillStyle = col; g.fill();
  g.lineWidth = px * 0.05; g.strokeStyle = '#f2ede0'; g.stroke();
  drawShopGlyph(g, type, px * 0.3, col);
  return (iconUrls[k] = c.toDataURL());
}

// --- 3D shopfront ----------------------------------------------------------------

const padGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.04, 20);
const badgeMaterials = {};
const padMaterials = {};

function badgeTexture(type) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const col = SHOP_TYPES[type].color;
  g.translate(S / 2, S / 2);
  g.beginPath(); g.arc(0, 0, S / 2 - 6, 0, Math.PI * 2);
  g.fillStyle = col; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#f2ede0'; g.stroke();
  drawShopGlyph(g, type, 36, col);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function signTexture(shop) {
  const W = 512, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const col = SHOP_TYPES[shop.type].color;
  g.fillStyle = '#10180f';
  g.fillRect(0, 0, W, H);
  g.fillStyle = col;
  g.fillRect(6, 6, W - 12, H - 12);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(6, H - 30, W - 12, 24);
  g.save(); g.translate(64, H / 2 - 6); drawShopGlyph(g, shop.type, 38, col); g.restore();
  g.fillStyle = '#f2ede0';
  g.textBaseline = 'middle';
  let size = 64;
  g.font = `${size}px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif`;
  while (g.measureText(shop.name.toUpperCase()).width > W - 150 && size > 30) { size -= 4; g.font = `${size}px 'Bebas Neue', 'Arial Narrow', Arial, sans-serif`; }
  g.fillText(shop.name.toUpperCase(), 124, H / 2 - 10);
  g.font = "bold 17px 'Arial Narrow', Arial, sans-serif";
  g.fillStyle = 'rgba(242,237,224,0.85)';
  g.fillText(SHOP_TYPES[shop.type].label.toUpperCase(), 126, H - 18);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildShopFront3D(shop) {
  const type = shop.type;
  const col = new THREE.Color(SHOP_TYPES[type].color);
  if (!badgeMaterials[type]) {
    badgeMaterials[type] = new THREE.SpriteMaterial({ map: badgeTexture(type), transparent: true, depthWrite: false, fog: true });
    padMaterials[type] = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: 0.85 });
  }
  const root = new THREE.Group();
  root.name = 'shop-' + shop.id;

  const door = new THREE.Group();
  door.position.set(shop.x, 0, shop.y);
  const pad = new THREE.Mesh(padGeometry, padMaterials[type]);
  pad.position.y = 0.03;
  door.add(pad);
  const badge = new THREE.Sprite(badgeMaterials[type]);
  badge.scale.set(0.52, 0.52, 1);
  const phase = Math.random() * Math.PI * 2;
  badge.position.y = 2.3;
  badge.onBeforeRender = () => { badge.position.y = 2.3 + Math.sin(performance.now() / 650 + phase) * 0.06; };
  door.add(badge);
  root.add(door);

  // lit sign board flat on the facade, facing the street
  const f = shop.face;
  const draw = () => {
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture(shop), fog: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), signMat);
    const y = Math.max(2.7, Math.min(3.4, f.h - 0.7));
    sign.position.set(f.x + f.nx * 0.34, y, f.y + f.ny * 0.34);
    sign.rotation.y = Math.atan2(f.nx, f.ny);
    root.add(sign);
    const awningMat = new THREE.MeshLambertMaterial({ color: col });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.0), awningMat);
    awning.position.set(f.x + f.nx * 0.8, y - 0.62, f.y + f.ny * 0.8);
    awning.rotation.y = Math.atan2(f.nx, f.ny);
    awning.rotation.x = 0.28;
    awning.rotation.order = 'YXZ';
    root.add(awning);
  };
  // wait for the web font so the sign doesn't bake in the fallback face
  if (document.fonts && document.fonts.load) document.fonts.load("64px 'Bebas Neue'").then(draw, draw);
  else draw();
  return root;
}
