// Gebieden veroveren (#414): het overzicht "Veroverd" in het Loopbaan-scherm (loopbaanui.js). Links alle te veroveren
// wijken, plaatsen en streken met een voortgangsbalk, rechts wat er in het gekozen gebied te doen is, per soort, en wat je
// al gedaan hebt. De gegevens komen uit gebiedenlive.js (en gebieden.js); dit bestand is alleen HTML. Niet door een mens in beeld bekeken.
import * as G from './gebieden.js';
import { getOverzicht } from './gebiedenlive.js';
import { reisNaarHuis } from './safehuizen.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
const VLAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21V4M7 5l10 3.5L7 12"/></svg>';

export const GEBIEDEN_CSS = `
.gb-groep { margin: 14px 0 4px; font: 14px "Arial Narrow", Arial, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.55; display: flex; gap: 10px; }
.gb-groep:first-child { margin-top: 0; }
.gb-groep .gb-n { margin-left: auto; letter-spacing: 0; }
.gb-li .gb-vlag { flex: none; width: 26px; height: 26px; display: grid; place-items: center; opacity: 0.35; }
.gb-li .gb-vlag svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.gb-li.klaar .gb-vlag { opacity: 1; color: var(--vlag, #e8a33c); }
.gb-li.klaar .gb-vlag svg { fill: currentColor; }
.gb-li .gb-tel { margin-left: auto; padding-left: 12px; white-space: nowrap; font-size: 15px; opacity: 0.8; }
.gb-li .m-bar { flex: none; width: 76px; margin-left: 12px; }
.gb-pane { min-width: 0; overflow-x: hidden; }
.gb-pane .m-h2 { font-size: 32px; overflow-wrap: anywhere; line-height: 1.05; }
.gb-pane .gb-titel { margin: 0 0 2px; font-size: 22px; overflow-wrap: anywhere; }
.gb-pane .gb-regel { margin: 4px 0 10px; }
.gb-soort { list-style: none; margin: 4px 0 8px; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 3px 16px; }
.gb-soort li { display: flex; gap: 6px; align-items: center; opacity: 0.55; }
.gb-soort li.klaar { opacity: 1; }
.gb-soort svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; flex: none; }
.gb-soort li:not(.klaar) svg { visibility: hidden; }
.gb-leeg { opacity: 0.7; max-width: 46ch; }
.gb-huis { margin: 6px 0 4px; }
.gb-huis p { margin: 3px 0; }
.gb-reis { margin-top: 8px; }
.gb-reisstatus { min-height: 1.3em; margin: 6px 0 0; }
`;

let gekozen = null;

// " · in Groningen": het gebied erboven (de gemeente bij een woonplaats of wijk, de wijk bij een buurt)
function ouderTekst(ind, g) {
  const o = g.ouder && g.niveau !== 'gemeente' ? ind.gebied.get(g.ouder) : null;
  return o ? ` · in ${o.naam}` : '';
}

function rij(r, ind) {
  const klaar = r.voltooid;
  const niv = G.niveauInfo(r.gebied.niveau);
  return `<button type="button" class="m-li lb-li gb-li${klaar ? ' klaar' : ''}${gekozen === r.gebied.id ? ' sel' : ''}" data-gebied="${esc(r.gebied.id)}" style="--vlag:${niv.vlag}"${gekozen === r.gebied.id ? ' aria-current="true"' : ''}>` +
    `<span class="gb-vlag">${VLAG}</span><span class="nm"><span class="one">${esc(r.gebied.naam)}</span><span class="mut one">${klaar ? esc(G.beloningVan(ind, r.gebied.id).titel) : esc(`${r.klaar > 0 ? 'Bezig' : 'Nog niet begonnen'}${ouderTekst(ind, r.gebied)}`)}</span></span>` +
    `<span class="gb-tel">${r.klaar} van ${r.totaal}</span><span class="m-bar${r.deel > 0 ? ' on' : ''}"><i data-bar="gb-${esc(r.gebied.id)}" data-w="${(r.deel * 100).toFixed(1)}"></i></span></button>`;
}

// Het safehouse van het gebied: wat het kost of dat het van jou is, wat erin staat, en de knop om erheen te reizen.
function huisHtml(o, id, v) {
  const h = G.huisVan(o.ind, id);
  if (!h) return '';
  const eigen = G.heeftHuis(o.profiel, h.id);
  const inr = G.inrichting(v.deel, v.voltooid);
  if (!eigen) {
    return `<h3 class="m-eb">Safehouse</h3><div class="gb-huis"><p><b>${esc(h.naam)}</b> <span class="mut">· ${esc(h.adres)} · ${esc(h.makelaar)}</span></p><p class="mut">Te koop voor €${G.huisPrijs(o.profiel, o.ind, h.id).toLocaleString('nl-NL')}, en hoe meer je hier doet, hoe lager de prijs. Veroveren is gratis: dan krijg je de sleutel. Het huisje staat bij het midden van het gebied.</p></div>`;
  }
  return `<h3 class="m-eb">Safehouse</h3><div class="gb-huis"><p><b>${esc(h.naam)}</b> <span class="mut">· ${esc(h.adres)}</span></p>` +
    `<p class="mut">Slapen en opslaan, kledingkast, garage en onderduiken (${G.ONDERDUIK_UREN[inr.niveau]} uur). De inrichting: ${inr.stappen.filter((x) => x.klaar).map((x) => esc(x.naam.toLowerCase())).join('; ')}.</p>` +
    `<button type="button" class="m-bp gb-reis" data-reis="${esc(h.id)}">Reis erheen</button><p class="mut gb-reisstatus" aria-live="polite"></p></div>`;
}

function detail(o, id) {
  const g = o.ind.gebied.get(id);
  if (!g) return '<p class="mut gb-leeg">Kies een gebied om te zien wat er te doen is.</p>';
  const v = G.voortgang(o.profiel, o.ind, id);
  const niv = G.niveauInfo(g.niveau);
  const gedaan = new Set(o.profiel.gedaan);
  const b = G.beloningVan(o.ind, id);
  const kop = v.voltooid
    ? `<p class="gb-titel g"><b>${esc(b.titel)}</b></p><p class="gb-regel mut">Veroverd, zonder een vinger uit te steken tegen iemand. ${esc(b.regel)}</p>`
    : `<p class="gb-regel mut">Doe alles wat er te doen is in ${esc(g.naam)} en de ${esc(niv.enkel)} is van jou. Titel: ${esc(b.titel)}, met €${b.geld} erbij en een vlag op de kaart.</p>`;
  const blokken = G.SOORTEN.map((s) => {
    const ids = g.taken.filter((t) => o.ind.taak.get(t).soort === s.id);
    if (!ids.length) return '';
    const klaar = ids.filter((t) => gedaan.has(t)).length;
    return `<h3 class="m-eb">${esc(s.naam)} <span class="mut">${klaar} van ${ids.length}</span></h3><ul class="gb-soort">` +
      ids.map((t) => `<li class="${gedaan.has(t) ? 'klaar' : ''}">${CHECK}<span>${esc(o.ind.taak.get(t).naam)}</span></li>`).join('') + '</ul>';
  }).join('');
  const bar = `<div class="lb-voort"><span class="m-bar${v.deel > 0 ? ' on' : ''}"><i data-bar="gbd-${esc(id)}" data-w="${(v.deel * 100).toFixed(1)}"></i></span><span class="m-num">${v.klaar} / ${v.totaal}</span></div>`;
  const pad = G.keten(o.ind, id).slice(0, -1).map((x) => esc(x.naam)).join(' › ');
  return `<div class="pm-pane-top"><span class="m-eb">${esc(niv.enkel)}${pad ? ` · ${pad}` : ''}</span><h2 class="m-h2 td-h2">${esc(g.naam)}</h2></div>${kop}${bar}${huisHtml(o, id, v)}${blokken}`;
}

// Het overzicht: { lijst, pane, totaal } als html, voor loopbaanui.js.
export function gebiedenHtml(kies = gekozen) {
  const o = getOverzicht();
  if (!o) return { lijst: '', pane: '<p class="mut gb-leeg">De kaart van de omgeving wordt nog ingeladen. Probeer het zo nog eens.</p>', totaal: '' };
  const alle = o.overzicht.flatMap((n) => n.gebieden);
  if (kies && !o.ind.gebied.has(kies)) kies = null;
  if (!kies && alle.length) kies = (alle.find((r) => r.klaar > 0 && !r.voltooid) || alle[0]).gebied.id;
  gekozen = kies;
  const lijst = `<div class="gb-groep">Kaart verkend<span class="gb-n">${o.kaart.gedaan} van ${o.kaart.totaal} buurten · ${o.kaart.pct}%</span></div>` +
    o.overzicht.map((n) => `<div class="gb-groep">${esc(n.niveau.naam)}<span class="gb-n">${n.voltooid} van ${n.gebieden.length} veroverd</span></div>` + n.gebieden.map((r) => rij(r, o.ind)).join('')).join('');
  const sam = G.samenvatting(o.profiel, o.ind);
  return { lijst, pane: detail(o, gekozen), totaal: `<span class="m-num">${sam.voltooid}</span><span class="mut">van ${sam.totaal} gebieden veroverd</span>` };
}

export const gekozenGebied = () => gekozen;
export function kiesGebied(id) { gekozen = id; return detailHtml(); }
export function detailHtml() {
  const o = getOverzicht();
  return o ? detail(o, gekozen) : '';
}

// Klik op "Reis erheen": de sprong met de bewakers van de kaartteleport; lukt het niet, dan staat de reden in beeld (de melding van het spel).
export function reisNaar(huisIdent, knop, sluit) {
  const ok = reisNaarHuis(huisIdent);
  if (ok && sluit) { sluit(); return true; }
  const st = knop && knop.parentElement && knop.parentElement.querySelector('.gb-reisstatus');
  if (st) st.textContent = ok ? '' : 'Nu even niet: tijdens een missie, met de politie op je hielen of op het water kan het niet.';
  return ok;
}
