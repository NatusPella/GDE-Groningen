// Terrasstoelen als zitplek voor voorbijgangers (#1314): cityprops.js meldt de stoelen van de terrassen per cel aan,
// pedroutes.js laat een wandelaar die bij horeca aankomt op een vrije stoel gaan zitten. Pure buffer, Node-safe, zonder
// THREE of wereld: geen import van cityprops (dat laadt pedestrians, dat pedroutes laadt).
// Een stoel is vrij als er geen scènefiguur van cityprops op zit (slot.ped), geen wandelaar hem bezet (slot.claim) en
// hij niet kapot is. Een bezetting vervalt vanzelf als de wandelaar weg, dood of ergens anders mee bezig is.
//
// slot: { kind: 'terrace', x, y, angle (de kijkrichting van wie zit), propKey, ped?, claim? }

const cells = new Map();   // celsleutel -> lijst slots (de lijst van cityprops zelf, niet gekopieerd)

export function registerTerraceSlots(key, slots) {
  const list = (slots || []).filter((s) => s && s.kind === 'terrace');
  if (list.length) cells.set(key, list); else cells.delete(key);
}
export function unregisterTerraceSlots(key) { cells.delete(key); }
export function clearTerraceSlots() { cells.clear(); }
export function terraceSlotCount() { let n = 0; for (const l of cells.values()) n += l.length; return n; }

// Zit de wandelaar die de stoel bezet er nog (of loopt hij erheen)?
export function claimLive(slot) {
  const p = slot && slot.claim;
  if (!p) return false;
  const S = p.nav && p.nav.sit;
  return p.state !== 'dead' && !p._entered && !!S && S.slot === slot;
}

export function seatFree(slot, isBroken = null) {
  if (!slot || slot.kind !== 'terrace') return false;
  if (slot.ped) return false;
  if (claimLive(slot)) return false;
  if (slot.claim) slot.claim = null;
  return !(isBroken && slot.propKey && isBroken(slot.propKey));
}

// De dichtstbijzijnde vrije terrasstoel binnen r, of null. now is voor later (afkoeling), isBroken(propKey) uit breakables.js.
export function freeTerraceSeat(x, y, r, now = 0, isBroken = null) {
  let best = null, bd = r * r;
  for (const list of cells.values()) {
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const dx = s.x - x, dy = s.y - y, d2 = dx * dx + dy * dy;
      if (d2 >= bd || !seatFree(s, isBroken)) continue;
      bd = d2; best = s;
    }
  }
  return best;
}

export function claimTerraceSeat(slot, ped, now = 0) { slot.claim = ped; slot.claimAt = now; }
export function releaseTerraceSeat(slot, ped) { if (slot && slot.claim === ped) slot.claim = null; }
