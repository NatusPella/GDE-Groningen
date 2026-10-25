import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { closestPointOnSegment, pointInPolygon, isInWater } from './util.js';
import { addStaticCollider } from './breakables.js';
import { getScene } from './scene3d.js';
import { openShopMenu, isShopOpen } from './shopui.js';
import { isCinematicActive } from './cinematics.js';
import { tuningKind, optionsFor, PARTS, PART_LABELS, tuningEffects, installPrice, withOption, loadTuning, saveTuning, optionById } from './tuningplan.js';
import { KEYS } from './storagekeys.js';
import { vehicleUpgradeItems, paintItems, getOwnedEntries, spawnOwnedEntry, replacementFee, getHeroLook, vehiclePreviewOf } from './shops.js';
import { repairCost, platesCost, HERO_REPLACE_FEE } from './economy.js';
import { spawnHeroCarNear } from './vehicle.js';
import { markDirty } from './savehook.js';
import { recordStat } from './achievements.js';
import { startCall } from './phonefeed.js';
import { facilitiesOf, countryFacilities, poiLayerPlaces } from './facilities.js';
import { nearestWorldPlace } from './worldplaces.js';
import { noteMoney } from './finance.js';
import { zoneTotals, losseOnderdelen, onderdelenPrijs, schadeTekst } from './vehicledamage.js';
import { deelPrijs } from './vehicledoors.js';

// Garages: every Garage Knalpot branch (from the OSM car repair shops) and
// every Pomp & Poets gas station has a workshop with a roller door by the
// street; in town from the garages and fuel stations of the POI layers of the
// tiles (facilities.js poiLayerPlaces), out in the Ommelanden from
// the real car repair shops and fuel stations in facilities.js (the bay on
// the forecourt where its outline is mapped). Drive up and the door rolls open, drive in, stop, press R: repair
// (dents gone too), upgrades, new plates, and wrecks of your own vehicles
// brought back to life for a fee. Henk the mechanic phones when your own
// car is in a bad way and puts the nearest garage on your map.

const BAY_W = 5.2;
const BAY_D = 10.5; // a bakwagen (8.5 m) fits with room for the door
const BAY_H = 4.2;
const DOOR_OPEN_M = 16;
const STREAM_IN = 170;
const STREAM_OUT = 210;
const MECHANIC_HEALTH = 55;
const MECHANIC_COOLDOWN = 150;
const GARAGE_COLOR = '#c98a16';

let sites = [];
let world = null;
let lastCallAt = -Infinity;

const CHAIN = { garage: 'Garage Knalpot', pomp: 'Pomp & Poets' };

export function getGaragesForRender() {
  return sites;
}

function wijkAt(map, x, y) {
  let best = '', bd = Infinity;
  for (const h of map.meta.neighbourhoodPoints || []) {
    const d = (h.x - x) ** 2 + (h.y - y) ** 2;
    if (d < bd) { bd = d; best = h.name; }
  }
  return best;
}

// A footprint, water or the ring's heights (spotcheck.js finds a bay inside one).
function solidAt(map, x, y) {
  for (const b of map.buildingsNear(x, y, 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x >= minx && x <= maxx && y >= miny && y <= maxy && pointInPolygon(x, y, b.pts)) return true;
  }
  return isInWater(map, x, y) || (map.offStreetLevel && map.offStreetLevel(x, y));
}

function onOtherRoad(map, x, y, own) {
  for (const r of map.roadsNear(x, y, 8)) {
    if (r === own || r.cat === 'foot') continue;
    const hw = (r.width || 5) / 2 + (r.cat === 'cycle' ? 0.3 : 0.6);
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      if (closestPointOnSegment(x, y, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]).dist2 < hw * hw) return true;
    }
  }
  return false;
}

// A free BAY_W x BAY_D rectangle right behind the pavement of a street near
// the POI, door facing that street.
function placeSite(map, poi) {
  let best = null;
  for (const road of map.roadsNear(poi.x, poi.y, 70)) {
    if ((road.cat !== 'normal' && road.cat !== 'minor' && road.cat !== 'major') || road.bridge || road.z || road.busOnly || road.type === 'track') continue;
    const P = road.pts;
    const hw = (road.width || 6) / 2 + (road.cat === 'minor' ? 0.6 : 2.0);
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < BAY_W + 2) continue;
      const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
      for (let t = BAY_W / 2 + 1; t < L - BAY_W / 2 - 1; t += 3) {
        const rx = a[0] + tx * t, ry = a[1] + ty * t;
        const score = Math.hypot(rx - poi.x, ry - poi.y);
        if (score > 70 || (best && score >= best.score)) continue;
        for (const side of [1, -1]) {
          const nx = -ty * side, ny = tx * side;
          const cx = rx + nx * (hw + BAY_D / 2), cy = ry + ny * (hw + BAY_D / 2);
          // the forecourt, where the station's outline is mapped, wins
          const sc = score - (poi.poly && pointInPolygon(cx, cy, poi.poly) ? 40 : 0);
          if (best && sc >= best.score) continue;
          let ok = true;
          for (let u = -0.5; u <= 0.5 && ok; u += 0.25) {
            for (let v = -0.5; v <= 0.5 && ok; v += 0.25) {
              const x = cx + nx * u * (BAY_D + 0.6) + tx * v * (BAY_W + 0.8), y = cy + ny * u * (BAY_D + 0.6) + ty * v * (BAY_W + 0.8);
              if (solidAt(map, x, y) || onOtherRoad(map, x, y, road)) ok = false;
            }
          }
          if (!ok) continue;
          best = { score: sc, x: cx, y: cy, angle: Math.atan2(-ny, -nx), road, reach: BAY_D / 2 + hw + 0.5 };
        }
      }
    }
  }
  return best;
}

function siteName(poi, wijk, road) {
  // out in the Ommelanden an unnamed road falls back on the nearest village
  const np = poi.country && !wijk && !road.name ? nearestWorldPlace(poi.x, poi.y) : null;
  const base = `${CHAIN[poi.kind]} ${wijk || road.name || (np && np.name) || ''}`.trim();
  if (!poi.country || !sites.some((s) => s.name === base)) return base;
  const alt = road.name ? `${CHAIN[poi.kind]} ${road.name}` : '';
  if (alt && !sites.some((s) => s.name === alt)) return alt;
  for (let k = 2; ; k++) if (!sites.some((s) => s.name === `${base} ${k}`)) return `${base} ${k}`;
}

// The city's garages and fuel stations: at the start, from the tiles of their POI layer (#314, C1; the whole list of
// map.meta when a world has no layer). Out in the Ommelanden they are placed on the tiles round them
// (initCountryGarages, in the background from the title screen on; main.js).
export function initGarages(w) {
  world = w;
  const map = w.map;
  sites = [];
  placeSites(map, [
    ...poiLayerPlaces(map, 'garages').map((g) => ({ ...g, kind: 'garage' })),
    ...poiLayerPlaces(map, 'fuel').map((f) => ({ ...f, kind: 'pomp' })),
    // every other real fuel station in town (the old list misses a few)
    ...facilitiesOf('fuel').filter((f) => f.city).map((f) => ({ x: f.x, y: f.y, kind: 'pomp' })),
  ]);
}

// The real car repair shops and fuel stations out in the Ommelanden, a bay
// behind the verge of the nearest road: their tiles are in while this runs.
export function initCountryGarages(w) {
  const country = (kinds, kind) => countryFacilities(kinds).map((f) => ({ x: f.x, y: f.y, poly: f.poly, place: f.place, kind, country: true }));
  placeSites(w.map, [...country(['car_repair', 'car', 'tyres'], 'garage'), ...country('fuel', 'pomp')]);
}

// A parked car's length along the kerb reaches this far beside the door.
const ZONE_SIDE = BAY_W / 2 + 2.8;

// (x, y) in the bay, or in the strip from its door to the middle of the street: parked cars, street props and trees stay
// out of it, so the door is never blocked (#332). `pad` widens the zone (a tree's crown).
function inGarageZone(x, y, pad = 0) {
  for (const s of sites) {
    if (Math.abs(s.x - x) > BAY_D + s.reach + 4 || Math.abs(s.y - y) > BAY_D + s.reach + 4) continue;
    const l = local(s, x, y);
    if (Math.abs(l.side) < ZONE_SIDE + pad && l.fwd > -BAY_D / 2 - 0.6 - pad && l.fwd < s.reach + pad) return true;
  }
  return false;
}

// The mapped trees inside a new site's zone leave the map (a tree in the bay half blocked the door).
function clearTreesFor(map, site) {
  if (!map.treesNear || !map.treeGrid) return 0;
  let n = 0;
  for (const t of map.treesNear(site.x, site.y, BAY_D + site.reach)) {
    const l = local(site, t[0], t[1]);
    if (Math.abs(l.side) < ZONE_SIDE + 0.8 && l.fwd > -BAY_D / 2 - 1.4 && l.fwd < site.reach + 0.8) { map.treeGrid.remove(t, [t[0], t[1], t[0], t[1]]); n++; }
  }
  return n;
}

function placeSites(map, pois) {
  if (!map.garageZones) {
    map.garageZones = true;
    const prev = map.reservedAt;
    map.reservedAt = (x, y) => (prev ? prev(x, y) : false) || inGarageZone(x, y);
  }
  for (const poi of pois) {
    if (sites.some((s) => Math.hypot(s.x - poi.x, s.y - poi.y) < 60)) continue;
    const spot = placeSite(map, poi);
    if (!spot || sites.some((s) => Math.hypot(s.x - spot.x, s.y - spot.y) < 40)) continue;
    const wijk = poi.country ? poi.place : wijkAt(map, spot.x, spot.y);
    const site = {
      kind: poi.kind, name: siteName(poi, wijk, spot.road),
      x: spot.x, y: spot.y, angle: spot.angle, reach: spot.reach, wijk, door: 0, mesh: null, cooldownUntil: 0,
    };
    clearTreesFor(map, site);
    const fx = Math.cos(site.angle), fy = Math.sin(site.angle), sx = -fy, sy = fx;
    if (poi.kind === 'pomp') {
      for (const side of [1, -1]) {
        const free = [-2.5, 0, 2.5].every((f) => [1.1, 2.2].every((o) => {
          const x = site.x + fx * f + sx * side * (BAY_W / 2 + o), y = site.y + fy * f + sy * side * (BAY_W / 2 + o);
          return !solidAt(map, x, y) && !onOtherRoad(map, x, y, null);
        }));
        if (free) { site.pumpSide = side; break; }
      }
    }
    // side walls and back wall; the door side stays open for driving in
    for (const side of [1, -1]) addStaticCollider('garagewall', site.x + sx * side * (BAY_W / 2), site.y + sy * side * (BAY_W / 2), 0.2, BAY_D / 2, site.angle);
    addStaticCollider('garagewall', site.x - fx * (BAY_D / 2), site.y - fy * (BAY_D / 2), 0.2, BAY_W / 2, site.angle + Math.PI / 2);
    sites.push(site);
  }
}

// Vehicle position in the site's frame: fwd along the door direction.
function local(site, x, y) {
  const dx = x - site.x, dy = y - site.y;
  const fx = Math.cos(site.angle), fy = Math.sin(site.angle);
  return { fwd: dx * fx + dy * fy, side: dx * -fy + dy * fx };
}

function insideBay(site, v) {
  const l = local(site, v.x, v.y);
  return Math.abs(l.side) < BAY_W / 2 - 0.2 && l.fwd < BAY_D / 2 + 0.5 && l.fwd > -BAY_D / 2;
}

function serviceable(v) {
  return v && !v.isBoat && !v.isBus && !v.sinking;
}

export function garageInside(w) {
  const v = w.player.inVehicle;
  if (!serviceable(v)) return null;
  for (const s of sites) {
    if (Math.abs(s.x - v.x) > 10 || Math.abs(s.y - v.y) > 10) continue;
    if (insideBay(s, v)) return s;
  }
  return null;
}

export function garagePrompt(w) {
  const s = garageInside(w);
  if (!s) return null;
  const v = w.player.inVehicle;
  if (Math.abs(v.speed) > 1.5) return { id: 'gar-' + s.name, x: s.x, y: s.y, h: 2.8, key: 'R', label: 'Garagemenu', sub: 'Eerst even stilstaan', ring: true, dim: true };
  return { id: 'gar-' + s.name, x: s.x, y: s.y, h: 2.8, key: 'R', label: 'Garagemenu', sub: `${s.name}: repareren en opvoeren`, ring: true };
}

function isOwn(v) {
  return !!(v && (v.isHeroCar || v.playerOwned));
}

function twoWheel(v) {
  return !!(v.isBike || v.isScooter);
}

function repairPrice(v) {
  const dmg = 100 - Math.max(0, Math.min(100, v.health ?? 100));
  const dents = v.damage ? Math.min(3, v.damage.total || 0) : 0;
  return repairCost(dmg, dents, twoWheel(v)) + (v.flat ? (twoWheel(v) ? 3 : 15) : 0) + onderdelenPrijs(losseOnderdelen(zoneTotals(v.dentLog, v.model.len, v.model.wid))) + deelPrijs(v);
}

// Health back to 100 and every dent, crack and hanging bumper gone:
// scene3d rebuilds the mesh from scratch.
export function repairVehicle(v) {
  v.health = 100;
  v.wrecked = false;
  v.wreckedByPlayer = false;
  v._exploded = false;
  v.disabled = false;
  v.blewUp = false;
  v.fireWarned = false;
  v.riderOff = false;
  v.flat = false;
  v.damage = null;
  v.dentLog = [];
  v.meshDirty = true;
}

function pay(w, price) {
  if (!Number.isFinite(price) || price < 0) { console.warn('prijs zonder waarde', price); return false; }
  if (w.money < price) return false;
  noteMoney('Garage');
  w.money -= price;
  recordStat(w, 'purchases');
  recordStat(w, 'spent', price);
  return true;
}

// Onderdelen (tuningplan.js): banden, uitlaat, stoel, verlichting en geluid per eigen voertuig,
// bewaard onder KEYS.tuning (los van de save). v.tuning krijgt de gesommeerde effecten.
function tuningId(v) {
  if (v.isHeroCar) return 'hero';
  const o = getOwnedEntries().find((e) => e.v === v);
  return o ? o.key : null;
}

function tuningItems(w, v) {
  const id = tuningId(v);
  if (!id) return [];
  const kind = tuningKind(v);
  const store = typeof localStorage !== 'undefined' ? localStorage : null;
  const all = loadTuning(store, KEYS.tuning);
  const items = [];
  for (const part of PARTS) {
    for (const o of optionsFor(part, kind)) {
      const price = installPrice(all[id], o.id);
      const on = price === null;
      items.push({
        id: 'o-' + o.id, label: PART_LABELS[part] + ': ' + o.label, desc: o.desc, price: on ? 0 : price,
        tag: on ? 'Zit erop' : '',
        disabled: on ? 'Zit erop' : w.money < price ? 'Te weinig geld' : '',
        buy() {
          const next = withOption(all[id], o.id, kind);
          if (!next || !pay(w, price)) return null;
          all[id] = next;
          saveTuning(store, KEYS.tuning, all);
          v.tuning = tuningEffects(next);
          return o.label + ' erop. Henk knikt goedkeurend';
        },
      });
    }
  }
  return items;
}

function exitSpot(site) {
  const fx = Math.cos(site.angle), fy = Math.sin(site.angle);
  return { x: site.x + fx * 1.0, y: site.y + fy * 1.0, angle: site.angle + Math.PI };
}

function garageMenu(w, site) {
  const sections = () => {
    const v = w.player.inVehicle;
    const out = [];
    if (serviceable(v)) {
      const price = repairPrice(v);
      const broken = (v.health ?? 100) < 100 || (v.damage && v.damage.total > 0) || v.riderOff || v.flat;
      const items = [{
        id: 'g-fix', label: twoWheel(v) ? 'Rechtzetten en plakken' : 'Deuken eruit, alles heel', price,
        preview: vehiclePreviewOf(v), stats: [{ label: 'Staat', v: (v.health ?? 100) / 100, to: 1, text: `${Math.round(v.health ?? 100)} → 100%` }],
        desc: broken ? `Staat nu op ${Math.round(v.health ?? 100)}%${v.flat ? ', met een lekke band' : ''}. ${schadeTekst(v, v.model.len, v.model.wid)}. Henk maakt hem weer als nieuw` : 'Mankeert niks, zegt Henk',
        disabled: broken ? (w.money < price ? 'Te weinig geld' : '') : 'Mankeert niks',
        buy() {
          if (!pay(w, price)) return null;
          repairVehicle(v);
          markDirty('reparatie');
          return 'Als nieuw! Henk veegt zijn handen af aan zijn overall';
        },
      }];
      const plates = platesCost(w.wanted);
      items.push({
        id: 'g-plates', label: 'Andere kentekenplaten', price: plates, preview: { kind: 'product', product: 'kenteken' },
        desc: w.wanted > 0 ? 'Niemand herkent je bak meer: sterren weg' : 'Alleen nodig als de politie je zoekt',
        disabled: w.wanted <= 0 ? 'Je wordt niet gezocht' : w.money < plates ? 'Te weinig geld' : '',
        buy() {
          if (!pay(w, plates)) return null;
          w.wanted = 0;
          w.wantedDecayTimer = 0;
          return 'Nieuwe platen erop. Wie ben jij ook alweer?';
        },
      });
      items.push({
        id: 'g-coffee', label: 'Bak koffie en een pleister', price: 8, preview: { kind: 'product', product: 'mok' },
        stats: [{ label: 'Gezondheid', v: w.health / 100, to: 1, text: `${Math.round(w.health)} → 100` }],
        desc: `Voor jezelf · gezondheid nu ${Math.round(w.health)}`,
        disabled: w.health >= 100 ? 'Je bent fit' : w.money < 8 ? 'Te weinig geld' : '',
        buy() {
          if (!pay(w, 8)) return null;
          w.health = 100;
          return 'Koffie van Henk: sterk genoeg om een deuk uit te drukken';
        },
      });
      out.push({ title: 'Werkplaats', note: isOwn(v) ? '' : 'Let op: niet jouw voertuig, upgrades blijven er niet aan hangen', items });
      const paint = paintItems(w, v);
      if (paint.length) out.push({ title: 'Spuit & Klaar: nieuwe lak', note: w.wanted > 0 ? 'Een nieuwe kleur en de politie is je kwijt' : '', items: paint.map((it) => ({ ...it, buy() { const r = it.buy(); if (r != null) markDirty('lak'); return r; } })) });
      const up = vehicleUpgradeItems(w, v);
      if (up.length) out.push({ title: twoWheel(v) ? 'Opvoeren' : 'Tuning', items: up.map((it) => ({ ...it, buy() { const r = it.buy(); if (r != null) markDirty('upgrade'); return r; } })) });
    }
    if (serviceable(v) && isOwn(v)) {
      const parts = tuningItems(w, v);
      if (parts.length) out.push({ title: 'Onderdelen', note: 'Banden, uitlaat, stoel, verlichting en geluid', items: parts });
    }
    const wrecks = [];
    const look = getHeroLook();
    if (!w.vehicles.some((x) => x.isHeroCar && !x.wrecked)) {
      wrecks.push({
        id: 'g-hero', label: 'Wrak van je Escapade opknappen', price: HERO_REPLACE_FEE, swatch: [look.color || '#a11f1f'],
        desc: 'Staat daarna hier voor de deur, als nieuw',
        disabled: w.money < HERO_REPLACE_FEE ? 'Te weinig geld' : '',
        buy() {
          if (!pay(w, HERO_REPLACE_FEE)) return null;
          const at = exitSpot(site);
          const car = spawnHeroCarNear(w.map, at.x, at.y);
          if (!car) { w.money += HERO_REPLACE_FEE; return 'Geen plek om hem neer te zetten, geld terug'; }
          for (const x of w.vehicles) if (x.isHeroCar && x.wrecked) x.isHeroCar = false;
          w.vehicles.push(car);
          markDirty('reparatie');
          return 'Je Escapade staat weer te glimmen';
        },
      });
    }
    for (const o of getOwnedEntries()) {
      if (!o.lost || o.spec.kind === 'boat') continue;
      const fee = replacementFee(o);
      wrecks.push({
        id: 'g-w-' + o.key, label: `Wrak van je ${o.spec.label} opknappen`, price: fee, swatch: [o.color],
        preview: { kind: o.spec.kind, model: o.spec.model, color: o.color, nameIdx: o.spec.nameIdx, flags: o.spec.flags || null },
        desc: 'Afgeschreven? Niet bij Henk. Staat daarna hier voor de deur',
        disabled: w.money < fee ? 'Te weinig geld' : '',
        buy() {
          if (!pay(w, fee)) return null;
          const at = exitSpot(site);
          const nv = spawnOwnedEntry(w, o, at.x, at.y, at.angle);
          if (!nv) { w.money += fee; return 'Geen plek om hem neer te zetten, geld terug'; }
          markDirty('reparatie');
          return `${o.spec.label} is weer heel`;
        },
      });
    }
    if (wrecks.length) out.push({ title: 'Wrakken van jezelf', items: wrecks });
    if (!out.length) out.push({ title: 'Werkplaats', note: 'Rij met een voertuig naar binnen, dan kijkt Henk ernaar', items: [] });
    return out;
  };
  return { name: site.name, type: 'tuning', tagline: site.kind === 'pomp' ? 'Tanken, poetsen en sleutelen' : 'Sleutelen, spuiten, opvoeren. Nait zeuren', color: GARAGE_COLOR, sections };
}

export function tryGarageInteract(w) {
  const input = w.input;
  if (!input || isShopOpen() || isCinematicActive() || !input.wasPressed('r')) return false;
  const s = garageInside(w);
  if (!s || Math.abs(w.player.inVehicle.speed) > 1.5) return false;
  input.consume('r');
  openShopMenu(w, garageMenu(w, s));
  return true;
}

function nearestSite(x, y) {
  let best = null, bd = Infinity;
  for (const s of sites) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

// Nearest garage or Pomp & Poets station (routing.js care route).
export function nearestRepairSite(x, y) {
  return nearestSite(x, y);
}

// Henk rings when the player's own car is in a bad way.
function mechanicCall(w) {
  const v = w.player.inVehicle;
  if (!v || !isOwn(v) || v.isBoat) return;
  const h = v.health ?? 100;
  if (h >= 90) v._mechCalled = false;
  if (v.wrecked || v._mechCalled || h > MECHANIC_HEALTH || w.time - lastCallAt < MECHANIC_COOLDOWN) return;
  const s = nearestSite(v.x, v.y);
  if (!s) return;
  v._mechCalled = true;
  lastCallAt = w.time;
  // an offer, never an override: the pink care route (routing.js) points
  // at the nearest garage, the player's own waypoint stays
  const car = v.isHeroCar ? 'hero' : twoWheel(v) ? 'fiets' : 'bak';
  startCall(w, { from: 'Henk (Garage Knalpot)', lines: [{ speaker: 'Henk', text: HENK_CALL[car] }, { speaker: 'Henk', text: HENK_CALL.kaart, sub: s.name }] });
}

// Henk's call (phonefeed.js startCall; voiced, lines manifest "Henk|...")
const HENK_CALL = {
  hero: 'Jong, je Escapade heeft er een paar karaktertrekjes bij. Kom even langs, dan maak ik hem weer heel.',
  fiets: 'Jong, je fiets heeft er een paar karaktertrekjes bij. Kom even langs, dan maak ik hem weer heel.',
  bak: 'Jong, je bak heeft er een paar karaktertrekjes bij. Kom even langs, dan maak ik hem weer heel.',
  kaart: 'Volg de roze lijn op je kaart, dan sta je zo bij mij. Tot zo!',
};

export function updateGarages(dt, w, gast = false) {
  world = w;
  if (!gast) mechanicCall(w); // een gast (#434) bouwt en opent alleen de garages: Henk belt de eigenaar van het spel
  const scene = getScene();
  const p = w.player;
  const pv = p.inVehicle;
  for (const s of sites) {
    const d = Math.max(Math.abs(s.x - p.x), Math.abs(s.y - p.y));
    if (!s.mesh && d < STREAM_IN && scene) {
      s.mesh = buildGarageMesh3D(s);
      scene.add(s.mesh);
    } else if (s.mesh && d > STREAM_OUT) {
      scene.remove(s.mesh);
      disposeGarage(s.mesh);
      s.mesh = null;
    }
    if (!s.mesh) continue;
    let want = 0;
    if (d < DOOR_OPEN_M + 6) {
      const who = pv || p;
      const l = local(s, who.x, who.y);
      if (l.fwd > -BAY_D / 2 - 1 && l.fwd < BAY_D / 2 + DOOR_OPEN_M && Math.abs(l.side) < BAY_W + 3) want = 1;
    }
    s.door += Math.max(-dt * 0.8, Math.min(dt * 0.8, want - s.door));
    const door = s.mesh.userData.door;
    door.scale.y = Math.max(0.04, 1 - s.door);
    door.position.y = BAY_H - (BAY_H - 0.1) * door.scale.y / 2 - 0.05;
  }
}

// --- 3D ----------------------------------------------------------------------------

const BRICK = new THREE.MeshLambertMaterial({ color: 0x8e4a38 });
const POMP_WALL = new THREE.MeshLambertMaterial({ color: 0xe8e6e0 });
const ROOF = new THREE.MeshLambertMaterial({ color: 0x3a3d40 });
const FLOOR = new THREE.MeshLambertMaterial({ color: 0x6f7275 });
const DOOR = new THREE.MeshLambertMaterial({ color: 0xb9bcbf });
const TRIM = new THREE.MeshLambertMaterial({ color: 0xc98a16 });
const PUMP = new THREE.MeshLambertMaterial({ color: 0x2f6b3f });
const LAMP = new THREE.MeshBasicMaterial({ color: 0xfff2d0 });
const SHARED = new Set([BRICK, POMP_WALL, ROOF, FLOOR, DOOR, TRIM, PUMP, LAMP]);
for (const m of SHARED) m.userData.shared = true;
const BOX = new THREE.BoxGeometry(1, 1, 1);
BOX.userData.shared = true;

function signTexture(site) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = site.kind === 'pomp' ? '#2f6b3f' : '#1b1c1f';
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#c98a16';
  g.fillRect(0, 84, 512, 12);
  g.fillStyle = '#f4f2ec';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = 48;
  do { g.font = `bold ${size}px sans-serif`; size -= 2; } while (g.measureText(site.name).width > 480 && size > 14);
  g.fillText(site.name, 256, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(group, mat, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(BOX, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  group.add(m);
  return m;
}

// Local frame: +X points out of the door, towards the street.
export function buildGarageMesh3D(site) {
  const g = new THREE.Group();
  const wall = site.kind === 'pomp' ? POMP_WALL : BRICK;
  const hw = BAY_W / 2, hd = BAY_D / 2;
  box(g, FLOOR, 0, 0.02, 0, BAY_D, 0.04, BAY_W);
  for (const s of [1, -1]) box(g, wall, 0, BAY_H / 2, s * hw, BAY_D, BAY_H, 0.3);
  box(g, wall, -hd, BAY_H / 2, 0, 0.3, BAY_H, BAY_W + 0.3);
  box(g, ROOF, -0.2, BAY_H + 0.12, 0, BAY_D + 0.6, 0.24, BAY_W + 0.8);
  box(g, wall, hd, BAY_H - 0.25, 0, 0.3, 0.5, BAY_W + 0.3);
  box(g, TRIM, hd + 0.16, BAY_H - 0.52, 0, 0.04, 0.06, BAY_W + 0.3);
  // tool wall and a lamp inside
  box(g, TRIM, -hd + 0.2, 1.6, 0, 0.06, 1.2, BAY_W * 0.6);
  box(g, LAMP, 0, BAY_H - 0.05, 0, 1.6, 0.04, 0.2);
  const door = box(g, DOOR, hd + 0.1, BAY_H / 2, 0, 0.08, BAY_H - 0.1, BAY_W - 0.35);
  g.userData.door = door;
  const tex = signTexture(site);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(BAY_W, BAY_W * 96 / 512), new THREE.MeshBasicMaterial({ map: tex }));
  sign.position.set(hd + 0.17, BAY_H + 0.45, 0);
  sign.rotation.y = Math.PI / 2;
  g.add(sign);
  g.userData.sign = sign;
  if (site.pumpSide) {
    // two pumps with a small roof against the side wall
    const z = site.pumpSide * (hw + 1.1);
    box(g, ROOF, 0.5, 3.2, z, 5, 0.2, 2.2);
    for (const px of [-1.2, 2.2]) {
      box(g, PUMP, px, 0.8, z, 0.9, 1.6, 0.6);
      box(g, LAMP, px, 1.25, z + site.pumpSide * 0.31, 0.5, 0.3, 0.02);
    }
    box(g, DOOR, 0.5 + 2.4, 1.6, z + site.pumpSide * 0.9, 0.16, 3.2, 0.16);
  }
  const gz = world && world.map.spawnZ ? world.map.spawnZ(site.x, site.y) : 0;
  g.position.set(site.x, gz, site.y);
  g.rotation.y = -site.angle;
  return g;
}

function disposeGarage(root) {
  const sign = root.userData.sign;
  if (sign) {
    sign.material.map.dispose();
    sign.material.dispose();
    sign.geometry.dispose();
  }
}
