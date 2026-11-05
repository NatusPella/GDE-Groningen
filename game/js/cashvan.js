import { hoofdspeler } from './players.js';
// Geldwagen overvallen: a Poen Express van from traffic that is blown open
// (wrecked) drops a money bag. Pick it up for cash; the police see the blast
// and follow. Both the van and the bag are shown on minimap and map.
import { reportCrime } from './crime.js';
import { showCard } from './hudcards.js';

const LOOT_RADIUS = 4;
const LOOT_LIFE = 150;
const PAY_MIN = 600;
const PAY_SPREAD = 500;

const loot = [];

export function forEachCashTarget(world, fn) {
  for (const v of world.vehicles) {
    if (v.isCashVan && !v.wrecked && !v.playerOwned && !v.missionCar && v.driver !== 'player') fn(v.x, v.y, false);
  }
  for (const l of loot) fn(l.x, l.y, true);
}

export function updateCashVan(dt, w) {
  const now = w.time || 0;
  for (const v of w.vehicles) {
    if (!v.isCashVan || !v.wrecked || v._cashDone || v.playerOwned || v.missionCar) continue;
    v._cashDone = true;
    loot.push({ x: v.x, y: v.y, until: now + LOOT_LIFE });
    reportCrime(w, 'cashVanBlown', { seen: true });
    showCard(w, { kind: 'tip', kicker: 'Geldwagen', title: 'De Poen Express is opengeblazen', body: 'Pak de geldzak voordat de politie er is.', duration: 5, key: 'cashvan-blown-' + v.id, voice: false });
  }
  const p = hoofdspeler(w);
  for (let i = loot.length - 1; i >= 0; i--) {
    const l = loot[i];
    if (now > l.until) { loot.splice(i, 1); continue; }
    if (Math.hypot(p.x - l.x, p.y - l.y) > LOOT_RADIUS) continue;
    loot.splice(i, 1);
    const pay = PAY_MIN + Math.floor(Math.random() * PAY_SPREAD);
    w.money += pay;
    reportCrime(w, 'cashVanLoot', { seen: true });
    showCard(w, { kind: 'prestatie', kicker: 'Geldwagen', title: 'Geldzak binnen', body: `+€${pay} · de politie zit je op de hielen`, duration: 5, key: 'cashvan-loot-' + now, voice: false });
  }
}

