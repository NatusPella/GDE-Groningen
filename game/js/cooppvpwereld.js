// Samen spelen (#447): spelers tegen elkaar in de wereld van wie het spel opende. De pure regels staan in cooppvp.js; hier zitten de
// lichamen, de treffers (slag en kogel uit combat.js) en wat er gebeurt als iemand neergaat. Geen bloed: een treffer is alleen het geluid
// en de schade. Een passieve speler hoort één keer dat een actieve speler hem wilde raken (pogingMelden). Wie door een medespeler
// neergaat staat zonder kosten weer op (geen respawn-reis, geen mislukte opdracht, geen prestatie
// "wasted", geen boete) en is zes seconden beschermd. Dood door de wereld loopt nog via requestRespawn en blijft zoals het was.
// Getest in scripts/cooppvp_test.mjs.
import { PVP_TEKST, pvpMag, pvpSchade, geefBescherming, beschermd, isPassief, pogingMelden, leesPvpSchade, leesPvpDood, pvpDoodEvent } from './cooppvp.js';
import { gastLichamen } from './coopbestuur.js';
import { charInfo } from './coopplayers.js';

const nuVan = (w) => (Number.isFinite(w.time) ? w.time : 0);
const isHost = (w) => w.coopRole === 'host' && !!w.coopPvp;
export const naamVanSlot = (world, slot) => {
  const r = (world.coopRoster || []).find((x) => x && x.slot === slot);
  return (r && (r.naam || (charInfo(r.char) || {}).naam)) || 'Een speler';
};

// Alle lichamen die tegen elkaar kunnen vechten: [[plek, lichaam]]; plek 0 is de speler van wie het spel opende.
export function pvpLichamen(world) {
  const uit = [];
  if (world.player) uit.push([0, world.player]);
  for (const g of gastLichamen(world)) uit.push(g);
  return uit;
}
// Te raken: niet in een voertuig, niet al neer, en voor de host niet midden in zijn eigen respawn.
const levend = (world, slot, l) => !!l && !l.inVehicle && !l.inVeh && l.state !== 'dead' && Number.isFinite(l.x) && Number.isFinite(l.y) && !(slot === 0 && (world.pendingRespawn || !(world.health > 0)));

// Een treffer van `dader` op `doel`; true als de schade is gegeven.
export function pvpTreffer(world, dader, doel, bedrag) {
  if (!isHost(world)) return false;
  const r = pvpSchade(world.coopPvp, dader, doel, bedrag, nuVan(world));
  if (!r.ok) { if (r.reden === 'doel-passief') poging(world, dader, doel); return false; }
  if (doel === 0) hostRaak(world, r.bedrag, dader);
  else if (world.coopPvpSchade) world.coopPvpSchade(doel, r.bedrag, dader);
  return true;
}

// De passieve speler hoort één keer (per paar seconden) dat een actieve speler hem wilde raken; bij de host in beeld,
// bij een gast als gewone melding van de host. Zo weet je dat je passief staat in plaats van dat er "niets" gebeurt.
function poging(world, dader, doel) {
  if (!pogingMelden(world.coopPvp, dader, doel, nuVan(world))) return;
  const tekst = PVP_TEKST.poging(naamVanSlot(world, dader));
  if (doel === 0) { if (world.addMessage) world.addMessage(tekst, 4); }
  else if (world.coopMeld) world.coopMeld(doel, tekst);
}

// Een slag: alle andere spelers binnen bereik (inReach is die van combat.js meleeHit). Geeft true als er iemand geraakt is.
export function pvpSlag(world, dader, inReach, bedrag) {
  if (!isHost(world)) return false;
  let geraakt = false;
  for (const [slot, l] of pvpLichamen(world)) {
    if (slot === dader || !levend(world, slot, l) || !inReach(l.x, l.y, 0)) continue;
    if (pvpTreffer(world, dader, slot, bedrag)) geraakt = true;
  }
  return geraakt;
}

// Een kogel van een speler (owner 'player'; dader is de plek van een gast, geen dader is de speler zelf). true: de kogel is op.
export function pvpKogel(world, b) {
  if (!isHost(world) || !b || b.owner !== 'player') return false;
  const dader = b.dader | 0, nu = nuVan(world);
  for (const [slot, l] of pvpLichamen(world)) {
    if (slot === dader || !levend(world, slot, l)) continue;
    if (Math.hypot(l.x - b.x, l.y - b.y) > (l.radius || 0.4) + 0.12 || Math.abs((l.gz || 0) - (b.gz || 0)) > 3) continue;
    const m = pvpMag(world.coopPvp, dader, slot, nu);
    if (!m.ok) { if (m.reden === 'doel-passief') poging(world, dader, slot); continue; } // een kogel gaat dwars door een passieve speler
    return pvpTreffer(world, dader, slot, b.damage);
  }
  return false;
}

// ---------------------------------------------------------------- de speler van wie het spel opende raakt of valt om
function hostRaak(world, schade, dader) {
  let d = schade;
  if (world.armor > 0) { const a = Math.min(world.armor, d); world.armor -= a; d -= a; }
  world.health = Math.max(0, (world.health === undefined ? 100 : world.health) - d);
  if (world.health <= 0) hostOpstaan(world, dader);
}
function hostOpstaan(world, dader) {
  world.health = 100; world.armor = 0;
  geefBescherming(world.coopPvp, 0, nuVan(world));
  const p = world.player; if (p) { p.vx = 0; p.vy = 0; }
  if (world.addMessage) world.addMessage(PVP_TEKST.neergeslagen(naamVanSlot(world, dader)), 5);
  if (world.coopPvpMeld) world.coopPvpMeld(PVP_TEKST.neergeslagenAnderen(naamVanSlot(world, dader), naamVanSlot(world, 0)), 0);
}

// ---------------------------------------------------------------- een gast raakt of valt om (eigen scherm, eigen gezondheid)
// body: het bericht { k: 'schade', n, door } van de host. Geeft true als het een speler-treffer was (ook als hij niet telde).
export function pvpGastRaak(world, body, ik) {
  const pv = leesPvpSchade(body); if (!pv) return false;
  const st = world.coopPvp, nu = nuVan(world);
  if (!st || world.coopRole !== 'client' || isPassief(st, ik) || beschermd(st, ik, nu)) return true;
  let d = pv.n;
  if ((world.armor || 0) > 0) { const a = Math.min(world.armor, d); world.armor -= a; d -= a; }
  world.health = (world.health === undefined ? 100 : world.health) - d;
  if (world.health > 0) return true;
  world.health = 100; world.armor = 0; // zonder kosten weer op
  geefBescherming(st, ik, nu);
  if (world.addMessage) world.addMessage(PVP_TEKST.neergeslagen(naamVanSlot(world, pv.door)), 5);
  const n = world.coopNet;
  try { if (n && n.session && n.session.sendEvent) n.session.sendEvent(pvpDoodEvent(pv.door)); } catch (e) { /* de verbinding is er even niet */ }
  return true;
}

// De host hoort dat een gast is neergegaan: bescherming voor hem en een melding voor de rest.
export function pvpDoodVerwerk(world, body, slot) {
  const d = leesPvpDood(body); if (!d || !isHost(world) || !(slot >= 1) || isPassief(world.coopPvp, slot)) return false;
  geefBescherming(world.coopPvp, slot, nuVan(world));
  const tekst = PVP_TEKST.neergeslagenAnderen(naamVanSlot(world, d.door), naamVanSlot(world, slot));
  if (world.addMessage) world.addMessage(tekst, 4);
  if (world.coopPvpMeld) world.coopPvpMeld(tekst, slot);
  return true;
}
