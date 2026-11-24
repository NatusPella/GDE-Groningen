// Het kader van Land en bedrijf (ontwerp docs/ontwerp/BEZIT-UI-24-11.md, stap 3): de kopband met vier waardeplaatjes (geld, totale waarde, per dag,
// aandacht) en de strook "Nu te doen" met hoogstens drie klussen en "+n meer" voor de rest. De HTML komt uit pure functies (scripts/bezitframe_test.mjs);
// frameView verzamelt de cijfers uit het eigen bezit (per speler, #429). De tabs krijgen hun getal en een ruit bij iets dringends via zetTabs.

import * as L from './bezitlive.js';
import * as H from './holdingsmodel.js';
import * as BZ from './business.js';
import { getBoerderij } from './boerderijlive.js';
import { staffOf, staffWages } from './farmstaff.js';
import { icoon } from './icons.js';
import { euro } from './geldtekst.js';
import { waarden } from './bezitwaarden.js';
import { klussen, strook, tabAandacht, URGENTIE_NAAM } from './bezitklussen.js';
import { eigenPandPerDag } from './bezitrendement.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const IC = (n, cls) => icoon(n, { cls });
const URG_ICOON = { nu: 'waarschuwing', vandaag: 'tijd', later: 'zandloper' };

// ---- de cijfers (live, uit het eigen bezit) ----
export function frameView(world) {
  const bezit = L.getBezit(), farm = getBoerderij();
  const day = Math.floor(farm.uren / 24);
  const rows = H.holdingRows(bezit, farm, { regionOf: (id) => (L.parcelOffer(id) || {}).region });
  const punten = H.attentionPoints(rows, bezit, farm);
  const owned = bezit.buildings.size + Object.keys(bezit.parcels).filter((k) => !bezit.parcels[k].lg).length;
  const panden = L.myBusinesses().map((m) => ({ p: m.biz.p, perDay: eigenPandPerDag(m.biz, owned, (L.rentView(m.biz, day) || {}).rentDay) }));
  const wagens = L.myMobile().map((m) => ({ p: m.biz.p, perDay: m.forecast && Number.isFinite(m.forecast.net) ? m.forecast.net : 0 }));
  const alle = klussen({ punten });
  const w = waarden({ geld: (world && world.money) || 0, bezit, rows, loon: staffWages(staffOf(bezit)), panden, wagens, klussen: alle });
  return { w, alle, rows, bezit, farm, day, panden, wagens, punten };
}

// ---- de HTML (puur) ----
export const plaatHtml = (ic, getal, label, mod = '') => `<span class="ds-z-waarde bz-plaat${mod ? ` ds-z-waarde--${mod}` : ''}" data-plaat="${esc(label)}">${IC(ic, 'ds-z-waarde__icoon')}<span class="bz-plaat__tekst"><span class="ds-z-waarde__getal">${esc(getal)}</span><small>${esc(label)}</small></span></span>`;
const plus = (n) => (n >= 0 ? '+' : '−') + euro(Math.abs(n));

// In het pauzemenu staat de titel al in de kop van het paneel: zonder titel blijven alleen de plaatjes over (rechts uitgelijnd).
export function kopHtml(w, { titel = null, eb = 'Bezit' } = {}) {
  const platen = plaatHtml('geld', euro(w.geld), 'geld') + (w.leeg ? '' :
    plaatHtml('gebouw', euro(w.waarde), 'totale waarde') + plaatHtml('geldhand', plus(w.perDag), 'per dag') + plaatHtml('waarschuwing', String(w.aandacht), 'aandacht', w.aandacht ? 'gevaar' : ''));
  const titelHtml = titel ? `<div><div class="bz-kop__eb">${esc(eb)}</div><h2 class="bz-kop__titel">${esc(titel)}</h2></div>` : '';
  return `<header class="bz-kop">${titelHtml}<div class="bz-waarden" role="group" aria-label="Je bezit in cijfers">${platen}</div></header>`;
}

export const klusHtml = (k) => `<button type="button" class="bz-klus bz-klus--${k.urg}" data-klus="${esc(k.code)}" data-goto-sub="boerderij:${esc(k.tab)}">` +
  `<span class="bz-stand bz-stand--${k.urg}">${IC(URG_ICOON[k.urg], 'bz-ic')}${URGENTIE_NAAM[k.urg]}</span><span class="bz-klus__tekst"><b>${esc(k.kop)}</b><span>${esc(k.sub)}</span></span>${IC('pijl_rechts', 'bz-ic')}</button>`;

export function strookHtml(alle) {
  if (!alle || !alle.length) return '';
  const s = strook(alle);
  const meer = s.meer ? `<details class="bz-meer"><summary class="bz-klus__meer" aria-label="Alle klussen">+${s.meer} meer</summary><div class="bz-meer__lijst" role="dialog" aria-label="Alle klussen">${alle.map(klusHtml).join('')}</div></details>` : '';
  return `<div class="bz-nu" aria-label="Nu te doen"><div class="bz-nu__kop">${IC('klembord', 'bz-ic')}<span>Nu te doen</span></div>${s.items.map(klusHtml).join('')}${meer}</div>`;
}

export const frameHtml = (view, opts) => `<div class="bz-frame">${kopHtml(view.w, opts)}${strookHtml(view.alle)}</div>`;

// De tabs: een getal per tab en de ruit (data-new) bij iets dringends. counts: { tabId: n }.
export function zetTabs(root, view, counts = {}) {
  if (!root || !root.querySelector) return;
  for (const [id, n] of Object.entries(counts)) {
    const el = root.querySelector(`[data-of="boerderij"][data-subtab="${id}"]`);
    if (!el) continue;
    const small = el.querySelector('[data-count]');
    if (small) small.textContent = n ? String(n) : '';
    el.toggleAttribute('data-new', tabAandacht(view.alle, id));
  }
}
