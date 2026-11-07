// #497: de poortwachters van een missie (wat je nog moet hebben of waar je het
// haalt) en de bijbehorende telefoon-/kaarttekst. De missieketen levert de staat,
// de hooks en de winkelbron via een host-naad; deze module kent geen world-update.
import { dist } from './util.js';
import { SHOP_TYPES } from './shopdata.js';
import { hoofdspeler } from './players.js';
import { SMS_SAY } from './smsvoice.js';

export function createMissionGates({ state, hooks, requirements, shops, homePlace }) {
  const reqList = (def) => (Array.isArray(def.requires) ? def.requires : def.requires ? [def.requires] : []);

  function unmetRequirement(w, def) {
    for (const key of reqList(def)) {
      const req = requirements[key];
      if (req && !req.met(w) && !hooks.waived(key)) return key;
    }
    return null;
  }

  function requirementMet(w, key) {
    const req = requirements[key];
    return !req || req.met(w) || hooks.waived(key);
  }

  function requirementPlace(w, key) {
    const req = requirements[key];
    if (!req) return null;
    const h = req.home && homePlace && homePlace();
    if (h) return h;
    if (req.garage) {
      const eigen = hoofdspeler(w);
      let best = null, bd = Infinity;
      for (const g of (w.map && w.map.meta && w.map.meta.garages) || []) {
        const d = dist(g.x, g.y, eigen.x, eigen.y);
        if (d < bd) { bd = d; best = g; }
      }
      return best;
    }
    const types = req.shop ? (Array.isArray(req.shop) ? req.shop : [req.shop]) : [];
    return types.length ? nearestShopOf(w, types) : null;
  }

  function nearestShopOf(w, types) {
    const eigen = hoofdspeler(w);
    let best = null, bd = Infinity;
    for (const s of shops() || []) {
      if (!types.includes(s.type)) continue;
      const d = dist(s.x, s.y, eigen.x, eigen.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  function chainName(req) {
    const t = Array.isArray(req.shop) ? req.shop[0] : req.shop;
    return t && SHOP_TYPES[t] ? SHOP_TYPES[t].chain : '';
  }

  function requirementText(w, def) {
    const key = unmetRequirement(w, def);
    if (!key) return null;
    const req = requirements[key];
    const place = requirementPlace(w, key);
    return req.text(place ? place.name : chainName(req));
  }

  function checkRequirement(w, def, force = false) {
    const key = unmetRequirement(w, def);
    if (!key) return true;
    if (w.time - state().reqHintAt < (force ? 3 : 25)) return false;
    state().reqHintAt = w.time;
    const place = requirementPlace(w, key);
    const text = requirements[key].text(place ? place.name : chainName(requirements[key]));
    w.addMessage(text, 5);
    if (w.phoneNotifications) w.phoneNotifications.push({ from: 'GDE', text: `${def.label}: ${text}${place ? ' Staat op je kaart.' : ''}`, duration: 6, say: SMS_SAY.gate.lines[0] });
    hooks.gated(w, state().index, key);
    return false;
  }

  return { unmetRequirement, requirementMet, requirementPlace, requirementText, checkRequirement, nearestShopOf };
}
