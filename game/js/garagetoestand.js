// De toestand van een eigen voertuig als statuschips (designsysteem v2, #980): schade en banden, elk met een
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
  if (e.status === 'lost') return [{ id: 'schade', tone: 'no', label: 'Afgeschreven' }];
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

const SVG = (d) => `<svg class="ds-chip__icoon" viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="${d}"/></svg>`;
export const TOESTAND_ICOON = {
  ok: SVG('M6.2 11.6 2.8 8.2l1.4-1.4 2 2 5.6-5.6 1.4 1.4z'),
  warn: SVG('M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7.2 4h1.6v5H7.2zm0 6h1.6v1.6H7.2z'),
  no: SVG('M8 1.5 15 14H1zM7.2 6h1.6v4H7.2zm0 5h1.6v1.6H7.2z'),
  mut: SVG('M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM4.5 7.2h7v1.6h-7z'),
  kan: SVG('M3 2.5l10 5.5-10 5.5z'),
};
const KLASSE = { ok: ' ds-chip--succes', warn: ' ds-chip--waarschuwing', no: ' ds-chip--probleem', kan: ' ds-chip--primair', mut: '' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Eén chip als HTML (icoon en woord).
export function chipHtml(tone, label, extra = '') {
  return `<span class="ds-chip${KLASSE[tone] || ''}${extra}">${TOESTAND_ICOON[tone] || TOESTAND_ICOON.mut}${esc(label)}</span>`;
}
