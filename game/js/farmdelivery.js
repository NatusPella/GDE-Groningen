// From the barn of your farm to your snack van (#1379 X1): the one path for farm goods between the two stores (the farm in gde-boerderij-v1, the van in bezit.x.snack).
// The steps and the journal live in deliveries.js; this file only plugs the two stores in. No DOM, no THREE (scripts/farm_delivery_test.mjs).
//
// Order (see deliveries.js): the goods leave the estate storage and the delivery is written to the farm FIRST; then the van takes them (and remembers the delivery id)
// and is written; then the rest, if the van was full, goes back to the estate. A crash in between is finished by resumeFarmDeliveries() (called once a day by bezitlive.dayTick),
// so nothing is lost and nothing arrives twice.
//
// Multiplayer: per player (#429). Everything happens in your own stores; a guest uses his own farm and van, never the goods of the host. Trade between players (#1380)
// is not built: the delivery has an optional toPlayer, nothing sends it.

import * as DL from './deliveries.js';
import * as PC from './percelen.js';
import * as SN from './snackvan.js';
import * as L from './bezitlive.js';
import { getBoerderij, getBedrijf, bewaarNu as saveFarm } from './boerderijlive.js';
import { branchOpen, branchHint } from './bezitgate.js';

const VAN = { kind: 'van', id: 'own' };
const journal = () => { const b = getBoerderij(); if (!b.deliveries) b.deliveries = DL.newJournal(); return b.deliveries; };
// The id of every delivery of this farm starts with a tag of the farm itself, so a new farm (a reset) never repeats an id the van still remembers.
const playerTag = () => { const z = Number((getBoerderij().contracten || {}).zaad); return 'p' + (Number.isFinite(z) ? (z >>> 0).toString(36) : '0'); };

const io = {
  take(d) {
    const r = PC.haalUit(getBedrijf(), d.from.id, d.good, d.amount);
    return r.ok ? { ok: true, amount: r.kg } : { ok: false, reason: 'empty' };
  },
  give(d) {
    if (!branchOpen('snack')) return { ok: false, reason: 'closed' };
    const S = L.snackState();
    const r = SN.receiveFarmGoods(S, d);
    if (r.ok && !r.duplicate) L.markeer();
    return r;
  },
  putBack(d) {
    const bd = getBedrijf();
    const erf = bd.erven[d.from.id] ? d.from.id : bd.thuis;     // the estate was given up meanwhile: back to your home estate
    if (PC.opslagVrij(bd, erf) < d.amount) return { ok: false };
    return { ok: PC.bergOp(bd, erf, d.good, d.amount).ok };
  },
  saveSource: () => saveFarm(),
  saveTarget: () => L.bewaarNu(),
};

const NAME = (good) => DL.GOODS[good].label.toLowerCase();
function words(r, good) {
  if (r.reason === 'invalid') return 'Dat kan niet.';
  if (r.reason === 'empty' || r.reason === 'nothing-to-take') return `Op dit erf is geen ${NAME(good)} in opslag.`;
  if (r.state === 'pending') return `Onderweg naar de snackwagen: ${NAME(good)}. Dat komt bij de volgende speldag aan.`;
  if (r.reason === 'save-failed') return 'Het bewaren lukte niet: er is niets verplaatst.';
  if (r.delivered > 0) return `${r.delivered} kg ${NAME(good)} naar de snackwagen gebracht${r.returned > 0 ? `; ${r.returned} kg paste niet en ligt weer op het erf` : ''}.`;
  return `De snackwagen kan geen ${NAME(good)} meer kwijt: alles ligt weer op het erf.`;
}

// kg of good from an estate (default: your home) to the van. { ok, text, delivered, returned }.
export function sendToVan(good, kg, estate) {
  if (!branchOpen('snack')) return { ok: false, why: 'dicht', text: branchHint('snack') };
  if (!SN.FARM_GOODS.includes(good)) return { ok: false, why: 'not-accepted', text: 'Daar heeft de snackwagen niets aan.' };
  const bd = getBedrijf(), from = bd.erven[estate] ? estate : bd.thuis;
  const j = journal();
  const d = DL.makeDelivery(j, { from: { kind: 'estate', id: from }, to: VAN, good, amount: Math.floor(Number(kg)), player: playerTag() });
  if (!d) return { ok: false, why: 'invalid', text: 'Vul een aantal kilo in.' };
  const r = DL.transfer(j, d, io);
  return { ok: r.ok, why: r.reason, text: words(r, good), delivered: r.delivered || 0, returned: r.returned || 0, state: r.state };
}

// Finish what a crash or a closed van left pending. Safe to call at any time and as often as you like.
export function resumeFarmDeliveries() {
  const j = journal();
  return DL.pendingList(j).length ? DL.resume(j, io) : [];
}

export const vanFarmStock = () => ({ ...L.snackState().own.stock });
