import { getShopsForRender } from './shops.js';
import { unlockAchievement, setStatMax } from './achievements.js';
import { iconDisc } from './activitykit.js';
import { isShopOpen } from './shopui.js';
import { isInWater, pointInPolygon } from './util.js';
import { pushAudioEvent } from './pedgeom.js';
import {
  STORE_KEY, CHAIN_NAME, SNACK, LEVEL_NAMES, newChain, restore, serialize, outletCount, outletCost, upgradeCost, buy, upgrade, collect, accrue,
  tillTotal, totalIncomePerMin, chainRank, counterSpot,
} from './snackrules.js';

// Kroketkoning: buy the snack bars of the province one by one (the invented
// chain Kroketkoning), upgrade them and empty the tills in person. The counter
// stands on the other side of the door than the Muurkroket machine
// (snackautomaat.js). The chain lives in the browser storage under
// `gde-snackketen-v1`, separate from the main save, so old saves keep working.
// Rules: snackrules.js. `window.__snackketen` debug.
const ACCENT = '#e0902f';
const USE_RADIUS = 2.4;
const SAVE_EVERY = 20;

let chain = newChain();
let spots = [];
let saveT = 0;
let dirty = false;

const euro = (v) => `€${Math.floor(v).toLocaleString('nl-NL')}`;

function load() {
  try { chain = restore(localStorage.getItem(STORE_KEY) || ''); } catch (e) { chain = newChain(); }
}

function save() {
  dirty = false;
  try { localStorage.setItem(STORE_KEY, serialize(chain)); } catch (e) { /* private window: the chain lives for this session only */ }
}

function buildSpots(map) {
  // open ground: not in the water, not inside a building
  const free = map ? (x, y) => !isInWater(map, x, y) && !map.buildingsNear(x, y, 1).some((b) => pointInPolygon(x, y, b.pts)) : () => true;
  spots = [];
  for (const s of getShopsForRender()) {
    if (s.type !== 'snack' || s.country) continue;
    const c = counterSpot(s, free);
    spots.push({ id: `${Math.round(s.x)}_${Math.round(s.y)}`, x: c.x, y: c.y, shop: s });
  }
}

function nearest(w) {
  const p = w.player;
  let best = null, bd = USE_RADIUS;
  for (const s of spots) {
    const d = Math.hypot(p.x - s.x, p.y - s.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function promptFor(s) {
  const o = chain.outlets[s.id];
  if (!o) {
    const cost = outletCost(outletCount(chain));
    return { label: `${CHAIN_NAME}: deze snackbar kopen`, sub: `${euro(cost)} · inkomsten ${euro(SNACK.baseIncome)} per minuut` };
  }
  const till = Math.floor(o.till);
  if (till >= 1) return { label: `${CHAIN_NAME}: kassa legen`, sub: `${euro(till)} in de kassa · ${LEVEL_NAMES[o.level]}` };
  if (o.level < SNACK.maxLevel) return { label: `${CHAIN_NAME}: ${LEVEL_NAMES[o.level + 1].toLowerCase()} van maken`, sub: `${euro(upgradeCost(o.level))} · nu ${LEVEL_NAMES[o.level]}` };
  return { label: `${CHAIN_NAME} ${LEVEL_NAMES[o.level]}`, sub: 'Kassa is leeg · hoogste niveau' };
}

function ding(w, s) { pushAudioEvent(w, { kind: 'fx', name: 'shop_bell', x: s.x, y: s.y }); }

function interactAt(w, s) {
  const o = chain.outlets[s.id];
  if (!o) {
    const r = buy(chain, s.id, w.money);
    if (!r.ok) { w.addMessage(r.why + (r.cost ? ` (${euro(r.cost)})` : ''), 2.8); return; }
    w.money -= r.cost;
    w.addMessage(`Snackbar gekocht voor ${euro(r.cost)}: nu ${outletCount(chain)} ${outletCount(chain) === 1 ? 'vestiging' : 'vestigingen'}`, 3.2);
    unlockAchievement(w, 'snackketen_eerste');
    ding(w, s);
  } else if (o.till >= 1) {
    const euros = collect(chain, s.id);
    w.money += euros;
    w.addMessage(`Kassa geleegd: ${euro(euros)}`, 2.5);
    ding(w, s);
  } else if (o.level < SNACK.maxLevel) {
    const r = upgrade(chain, s.id, w.money);
    if (!r.ok) { w.addMessage(r.why + (r.cost ? ` (${euro(r.cost)})` : ''), 2.8); return; }
    w.money -= r.cost;
    w.addMessage(`Verbouwd tot ${LEVEL_NAMES[o.level].toLowerCase()} voor ${euro(r.cost)}`, 3);
  } else {
    w.addMessage('De kassa is leeg. Kom later terug.', 2.2);
  }
  const n = outletCount(chain);
  setStatMax(w, 'snackBars', n);
  if (chainRank(chain) >= 1) unlockAchievement(w, 'snackketen_keten');
  if (chainRank(chain) >= 3) unlockAchievement(w, 'snackketen_rijk');
  save();
}

function glyph(ctx) {
  ctx.fillStyle = '#f2ede0';
  ctx.fillRect(-1.2, -3, 2.4, 6);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-1.2, -3, 2.4, 1.6);
}

export const SNACKKETEN = {
  id: 'snackketen',
  layer: 'snackketen',
  legend: { kind: 'act-snackketen', label: 'Kroketkoning', note: 'snackbarketen: koop snackbars, bouw ze om en leeg de kassa' },
  init(w) {
    load();
    buildSpots(w.map);
    window.__snackketen = {
      chain: () => chain,
      spots: () => spots.map((s) => ({ id: s.id, x: s.x, y: s.y })),
      reset: () => { chain = newChain(); },
      income: () => totalIncomePerMin(chain),
    };
  },
  // op de kaart alleen je eigen vestigingen; de spotcheck (all) en de bot krijgen elke snackbar
  spots: (all = false) => spots.filter((s) => all || chain.outlets[s.id]).map((s) => ({ id: s.id, name: `${CHAIN_NAME} vestiging`, x: s.x, y: s.y })),
  prompt(w) {
    if (isShopOpen() || w.player.inVehicle || w.player.swimming) return null;
    const s = nearest(w);
    if (!s) return null;
    const p = promptFor(s);
    return { id: 'snackketen-' + s.id, x: s.x, y: s.y, h: 2.2, key: 'E', label: p.label, sub: p.sub, ring: true };
  },
  secondary: () => [],
  interact(w) {
    if (isShopOpen() || w.player.inVehicle) return false;
    const s = nearest(w);
    if (!s) return false;
    interactAt(w, s);
    return true;
  },
  active: () => false,
  quit: () => {},
  update: () => {},
  tick(dt, w) {
    if (!outletCount(chain)) return;
    accrue(chain, Math.min(dt, 1));
    if ((saveT += dt) > SAVE_EVERY) { saveT = 0; save(); }
  },
  camera: () => {},
  icon(ctx, s) {
    iconDisc(ctx, s, ACCENT);
    ctx.save();
    ctx.scale(s, s);
    glyph(ctx);
    ctx.restore();
  },
  mapSub: () => `${outletCount(chain)} vestigingen · ${euro(tillTotal(chain))} in de kassa`,
  ubbo: () => null,
};
