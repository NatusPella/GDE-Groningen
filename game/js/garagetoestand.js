// De toestand van een eigen voertuig als statuschips (designsysteem, #980): schade en banden, elk met een
// pictogram en een woord, nooit alleen kleur. Pure regels zonder DOM; garageui.js tekent de chips.
// De bron is wat het voertuig al heeft: `health` (0 tot 100) en `flat` (lekke band), van het voertuig in de wereld
// (`e.v`) of van de bewaarde regel (`extra.entry`). Een boot en een helikopter hebben geen banden.

const MET_BANDEN = new Set(['car', 'bike', 'scooter', 'bus', 'truck']);
const heel = (n) => Math.max(0, Math.min(100, Math.round(Number(n))));

// [{ id, tone: ok | warn | no | mut, label }]; leeg voor een voertuig dat je niet hebt.
export function garageToestand(e, extra = {}) {
  if (!e || !e.owned) return [];
  const bron = e.v || extra.entry || {};
  const chips = [];
  // afgeschreven staat al als status naast de titel: niet nog eens als chip (#1239)
  if (e.status === 'lost') return [];
  const h = Number.isFinite(bron.health) ? heel(bron.health) : 100;
  if (h >= 90) chips.push({ id: 'schade', tone: 'ok', label: 'Geen schade' });
  else if (h >= 60) chips.push({ id: 'schade', tone: 'warn', label: `Lichte schade · ${h}% heel` });
  else chips.push({ id: 'schade', tone: 'no', label: `Zware schade · ${h}% heel` });
  if (MET_BANDEN.has(e.kind)) chips.push(bron.flat === true ? { id: 'banden', tone: 'no', label: 'Lekke band' } : { id: 'banden', tone: 'ok', label: 'Banden heel' });
  return chips;
}

// De toon van de korte status naast de titel (thuis, in de buurt, te koop, op slot, afgeschreven).
export function statusToon(e) {
  if (!e) return 'mut';
  if (e.locked) return 'mut';
  if (!e.owned) return 'kan';
  if (e.status === 'lost') return 'no';
  if (e.status === 'driving' || e.status === 'garage') return 'ok';
  return 'mut';
}

// Welke vraag staat er in het paneel: de tweede-druk-vraag van verkopen of dure bezorging (ownedvehicles.js
// `actieBevestiging`), herkend aan de tekst zelf. '' als de melding gewoon een uitslag of fout is.
export function vraagSoort(msg, vragen = {}) {
  if (!msg) return '';
  for (const soort of ['verkoop', 'aflever']) if (vragen[soort] && vragen[soort] === msg) return soort;
  return '';
}

import { icoon as fIcoon } from './icons.js';
import { escapeHtml as esc } from './htmlescape.js';
const SVG = (naam) => fIcoon(naam, { cls: 'ds-z-chip__icoon', maat: 's' });
// Betekenisnamen (icons.js, Phosphor, ADR 0041).
export const TOESTAND_ICOON = {
  ok: SVG('vinkje'),
  warn: SVG('waarschuwing'),
  no: SVG('waarschuwing'),
  mut: SVG('min'),
  kan: SVG('afspelen'),
};
const KLASSE = { ok: ' ds-z-chip--succes', warn: '', no: ' ds-z-chip--probleem', kan: ' ds-z-chip--primair', mut: '' };

// Eén chip als HTML (icoon en woord).
export function chipHtml(tone, label, extra = '') {
  return `<span class="ds-z-chip${KLASSE[tone] || ''}${extra}">${TOESTAND_ICOON[tone] || TOESTAND_ICOON.mut}${esc(label)}</span>`;
}
