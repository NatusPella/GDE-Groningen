// Story purchases: what the story wants the player to buy right now and in
// which shops (storyNeed), how the shop menu shows it (markStoryItems: a
// banner, the qualifying items first with a "Nodig voor je missie" badge,
// the rest marked "telt niet voor je missie") and a count of every item
// bought, which the story's shop steps (goal.buy) complete on.

import { currentStep, storyVoorschotInfo } from './storyquery.js';
import { getMissionDefs, unmetRequirement, requirementMet, requirementPlace, activeStage } from './missionquery.js';
import { VEHICLE_STOCK, SHOP_TYPES } from './shops.js';
import { STEPS } from './storyarc.js';
import { displayName } from './speakers.js';

const GUNS = new Set(['pistol', 'uzi', 'shotgun', 'jachtgeweer']);
const stockOf = (id) => (id && id.startsWith('v-') ? VEHICLE_STOCK[id.slice(2)] : null);

// A story requirement (missions.js REQUIREMENTS) as something to buy;
// `prefer` is listed first (what the step's cost and voorschot are sized for).
const REQ_BUY = {
  weapon: { shops: ['wapens', 'pand'], what: 'een wapen', prefer: 'w-pistol', ok: (id) => id === 'b-pistol' || (id.startsWith('w-') && GUNS.has(id.slice(2))) },
  bike: { shops: ['fietsen'], what: 'een fiets', prefer: 'v-omafiets', ok: (id) => { const sp = stockOf(id); return !!sp && sp.kind === 'bike' && !sp.unlock; } },
  racecar: { shops: ['tuning', 'auto'], what: 'een snelle auto', act: 'voer de Escapade op of koop een sportwagen', prefer: 'u-motor', ok: (id) => id === 'u-motor' || id === 'u-turbo' || (() => { const sp = stockOf(id); return !!sp && sp.kind === 'car' && (sp.model.name === 'sport' || sp.model.maxSpeed >= 200 / 3.6); })() },
  car: { shops: ['auto'], what: 'een auto', prefer: 'v-mug', ok: (id) => { const sp = stockOf(id); return !!sp && sp.kind === 'car' && !sp.unlock; } },
  boat: { shops: ['boot'], what: 'een huurboot', act: 'huur een boot', prefer: 'r-sloep', ok: (id) => id.startsWith('r-') },
  heist: { shops: ['kleding', 'boot'], what: 'zwart incognito of een huurboot', act: 'koop zwart incognito of huur een boot', prefer: 'r-sloep', ok: (id) => id === 'o-incognito' || id.startsWith('r-') },
};

const WHY_NOT = {
  weapon: 'alleen een echt wapen telt',
  bike: 'alleen een gewone fiets telt, geen e-step of scooter',
  racecar: 'alleen meer topsnelheid telt: 200 km/u of harder',
  car: 'alleen een gekochte auto telt',
  boat: 'alleen een huurboot van de steiger telt',
  heist: 'alleen zwart incognito of een huurboot telt',
};

const bought = {};

export function noteStoryPurchase(id) {
  bought[id] = (bought[id] || 0) + 1;
}

export function purchaseCount(ids) {
  return [].concat(ids || []).reduce((n, id) => n + (bought[id] || 0), 0);
}

const speaker = (step) => (step.player === 'anita' ? 'Anita' : 'Tammo');

function fromStep(step, extra) {
  const lead = step.lead ? step.lead[1] : '';
  return { stepId: step.id, voorschotId: step.id, title: step.title, why: step.why ? `${displayName(speaker(step))}: ${step.why}` : '', lead, cost: step.cost || 0, ...extra };
}

// What the story asks to buy now, or null:
// { shops, what, ok(id), strict, why, lead, title, cost, auto?, pay? }
// strict: a requirement (the step waits for it); auto: a mission stage that
// pays by itself at its marker (H17's shopping).
function storyNeed(world) {
  const stage = activeStage();
  if (stage && stage.pay && stage.target && stage.target.shop) {
    return { shops: [].concat(stage.target.shop), what: stage.paid || stage.label, title: stage.label, ok: () => false, auto: true, pay: stage.pay, why: '', lead: stage.say || '' };
  }
  if (stage) return null;
  let step = null;
  try { step = currentStep(); } catch (e) { return null; }
  if (!step || step.end) return null;
  if (step.kind === 'activity' && step.goal) {
    const g = step.goal;
    if (g.type === 'require' && REQ_BUY[g.req] && !requirementMet(world, g.req)) {
      const r = REQ_BUY[g.req];
      return fromStep(step, { req: g.req, shops: r.shops, what: r.what, act: r.act, ok: r.ok, prefer: r.prefer, strict: true, whyNot: WHY_NOT[g.req] });
    }
    if (g.type === 'shop' && g.buy) {
      const ids = new Set([].concat(g.buy));
      return fromStep(step, { shops: [g.shop], what: g.what || 'iets', ok: (id) => ids.has(id), prefer: g.prefer, strict: false, optional: !!step.optional });
    }
    return null;
  }
  if (step.kind === 'mission') {
    const k = STEPS.indexOf(step);
    const def = getMissionDefs().find((d) => d.id === step.mission) || null;
    const gate = def ? unmetRequirement(world, def) : null;
    if (gate && REQ_BUY[gate]) {
      const r = REQ_BUY[gate];
      const prev = STEPS.slice(0, k).reverse().find((s) => s.goal && s.goal.req === gate) || step;
      return fromStep(prev, { stepId: step.id, title: step.title, req: gate, shops: r.shops, what: r.what, act: r.act, ok: r.ok, prefer: r.prefer, strict: true, gate: true, whyNot: WHY_NOT[gate] });
    }
  }
  return null;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// a boat is rented, not bought: "huur een boot"
const needAct = (need) => need.act || `koop ${need.what}`;

// "Koop een wapen bij Pang & Zo Herestraat", "Huur een boot bij Bootje Huren", for the route and the HUD.
export function storyBuyLabel(world, at = null) {
  const need = storyNeed(world);
  if (!need || need.auto) return null;
  const place = at && at.name ? at : need.req ? requirementPlace(world, need.req) : null;
  const name = place ? place.name : SHOP_TYPES[need.shops[0]] ? SHOP_TYPES[need.shops[0]].chain : '';
  return `${cap(needAct(need))} bij ${name}`;
}


// The shop menu's sections with the story's need applied (shopType is the
// shop being shown); returns { sections, banner } where banner is null
// when the story wants nothing from this shop.
export function markStoryItems(world, shopType, sections) {
  const need = storyNeed(world);
  if (!need || !need.shops.includes(shopType)) return { sections, banner: null };
  const vs = need.voorschotId ? storyVoorschotInfo(need.voorschotId) : null;
  const banner = {
    title: need.auto ? `Voor het verhaal: ${need.title}` : `Voor het verhaal: ${needAct(need)}`,
    why: need.why || '',
    lead: need.auto ? `Loop naar de gele marker voor de deur: daar reken je €${need.pay} af.` : need.gate ? `Anders start "${need.title}" niet.` : need.optional ? 'Hoeft niet, helpt wel.' : '',
    voorschot: vs ? `${vs.from} schiet het voor${vs.gift ? `: +€${vs.gift}` : ''}` : '',
  };
  if (need.auto) return { sections, banner };
  const picked = [];
  const rest = sections.map((sec) => {
    const items = [];
    for (const it of sec.items) {
      if (!it.id) { items.push(it); continue; }
      if (need.ok(it.id)) {
        picked.push({ ...it, story: 'ok', tag: 'Nodig voor je missie' });
        continue;
      }
      if (it.income > 0 || it.disabled) { items.push(it); continue; }
      const marked = { ...it, story: 'no', desc: `${it.desc || ''} · telt niet voor je missie`.replace(/^ · /, '') };
      if (need.strict && !it.confirmText) marked.confirmText = `Telt niet voor je missie: ${need.whyNot || 'kies iets met "Nodig voor je missie"'}. Nog eens = toch kopen`;
      items.push(marked);
    }
    return { ...sec, items };
  }).filter((sec) => sec.items.length);
  if (!picked.length) return { sections, banner };
  const rank = (it) => (it.disabled ? 2 : it.id === need.prefer ? 0 : 1);
  picked.sort((a, b) => rank(a) - rank(b) || (a.price || 0) - (b.price || 0));
  return { sections: [{ title: cap(need.what.replace(/^(een|de|het) /, '')) + ': nodig voor je missie', story: true, items: picked }, ...rest], banner };
}
