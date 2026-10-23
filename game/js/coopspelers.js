// Samen spelen (#95, #377): de lijst met spelers. Pure logica: per speler naam, kleur, vorm, verbinding (met ping in ms waar bekend),
// wat die speler doet (te voet, in een voertuig, aan het stuur, in een opdracht) en de afstand. De lijst staat in het scherm als
// je Tab ingedrukt houdt en in het onderdeel Spelers van het pauzemenu (coopspelersui.js); er staat niets permanent in beeld.

import { charInfo } from './coopplayers.js';

export const VORM_TEKEN = { driehoek: '▲', ruit: '◆', vierkant: '■', cirkel: '●', vijfhoek: '⬟', ster: '★', plus: '✚', kruis: '✖', maan: '☾', hart: '♥', bliksem: 'ϟ', druppel: '◖', blok: '▮', golf: '≈', schild: '⬢', bloem: '✿' };
export const VERBINDING_TEKST = { ok: 'goed', lag: 'haperd', lost: 'weg' };

export function afstandTekst(d) {
  if (!Number.isFinite(d)) return '';
  return d < 15 ? 'bij je' : d >= 1000 ? `${(d / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(d / 10) * 10} m`;
}

// opts: { mijnSlot, roster (world.coopRoster), partners (world.coopPartners), mijn: { x, y, inVoertuig, rijdt }, rtt: (slot) => ms | null, opdracht: label | null }
export function spelersRijen({ mijnSlot = 0, roster = [], partners = [], mijn = null, rtt = () => null, opdracht = null } = {}) {
  const rijen = [];
  for (const r of roster || []) {
    if (!r || !Number.isInteger(r.slot)) continue;
    const jij = r.slot === mijnSlot;
    const p = (partners || []).find((x) => x.slot === r.slot) || null;
    let doet;
    if (jij) doet = mijn && mijn.rijdt ? 'aan het stuur' : mijn && mijn.inVoertuig ? 'in een voertuig' : 'te voet';
    else doet = p ? p.tekst : 'onbekend';
    // wie het spel opende speelt de opdracht; de anderen kijken mee en lopen of rijden mee
    if (opdracht && r.slot === 0 && !(p && p.status === 'neer')) doet += ' · in opdracht';
    let afstand = null;
    if (!jij && p && p.zichtbaar && mijn && Number.isFinite(mijn.x) && Number.isFinite(p.x)) afstand = Math.hypot(p.x - mijn.x, p.y - mijn.y);
    const ms = rtt(r.slot);
    const c = charInfo(r.char) || {}; // een gast krijgt van de gastheer alleen plek en personage; naam, kleur en vorm horen bij dat personage
    rijen.push({
      slot: r.slot, naam: r.naam || c.naam || '?', kleur: r.kleur || c.kleur || '#cccccc', vorm: r.vorm || c.vorm || 'cirkel', jij,
      verbinding: r.verbinding || 'ok', verbindingTekst: VERBINDING_TEKST[r.verbinding || 'ok'] || 'goed', ms: Number.isFinite(ms) ? Math.round(ms) : null,
      doet, afstand, afstandTekst: afstandTekst(afstand), x: p && p.zichtbaar ? p.x : null, y: p && p.zichtbaar ? p.y : null,
    });
  }
  // jij bovenaan, daarna op plek
  return rijen.sort((a, b) => (a.jij ? -1 : b.jij ? 1 : a.slot - b.slot));
}

// Een regel in de lijst als platte tekst (tests, schermlezers): "Tessa · te voet · goed 34 ms · 40 m"
export function rijTekst(r) {
  const naam = r.jij ? `${r.naam} (jij)` : r.naam;
  return [naam, r.doet, r.verbindingTekst + (r.ms != null ? ` ${r.ms} ms` : ''), r.afstandTekst].filter(Boolean).join(' · ');
}

// Eruit zetten (#434): alleen wie het spel opende, en nooit zichzelf of plek 0. Tessa (plek 1) wordt daarna weer een AI-metgezel.
export const kanEruitZetten = (rol, r) => rol === 'host' && !!r && !r.jij && r.slot !== 0;
// Het spel overdragen (#439): de knop staat er, de overdracht zelf komt later (coophostwissel.js is de pure basis). Tot dan een duidelijke melding.
export const kanOverdragen = (rol, r) => kanEruitZetten(rol, r);
export const overdragenKnopTekst = 'Spel overdragen';
export const nogNietTekst = 'Nog niet beschikbaar: het spel overdragen komt later. Jij houdt het spel.';
export const eruitKnopTekst = (bevestig) => (bevestig ? 'Zeker weten?' : 'Eruit zetten');
export const eruitGezetTekst = (r) => `${r.naam} is uit het spel gezet.${r.slot === 1 ? ' Tessa loopt weer zelf mee.' : ''}`;
// wat de weggestuurde gast ziet; 'spel gestopt' is stoppen voor iedereen
export const wegMelding = (reden, opener) => (reden === 'spel gestopt'
  ? `${opener} heeft het spel gestopt. Je speelt weer in je eigen spel.`
  : `${opener} heeft je uit het spel gezet. Je speelt weer in je eigen spel, waar je gebleven was.`);
