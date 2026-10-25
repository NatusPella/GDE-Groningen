// Samen spelen (#95, #377): de lijst met spelers. Pure logica: per speler de online-avatar (#455: naam en kleur, met het
// personage als terugval), vorm, verbinding (met ping in ms waar bekend), wat die speler doet (te voet, in een voertuig, aan
// het stuur, in een opdracht) en de afstand. De lijst staat in het scherm als je Tab ingedrukt houdt en in het onderdeel
// Spelers van het pauzemenu (coopspelersui.js); er staat niets permanent in beeld.

import { charInfo } from './coopplayers.js';
import { pvpInSpel, isPassief } from './cooppvp.js';

export const VORM_TEKEN = { driehoek: '▲', ruit: '◆', vierkant: '■', cirkel: '●', vijfhoek: '⬟', ster: '★', plus: '✚', kruis: '✖', maan: '☾', hart: '♥', bliksem: 'ϟ', druppel: '◖', blok: '▮', golf: '≈', schild: '⬢', bloem: '✿' };
export const VERBINDING_TEKST = { ok: 'goed', lag: 'haperd', lost: 'weg' };

export function afstandTekst(d) {
  if (!Number.isFinite(d)) return '';
  return d < 15 ? 'bij je' : d >= 1000 ? `${(d / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(d / 10) * 10} m`;
}

// opts: { mijnSlot, roster (world.coopRoster), partners (world.coopPartners), mijn: { x, y, inVoertuig, rijdt }, rtt: (slot) => ms | null, opdracht: label | null }
export function spelersRijen({ mijnSlot = 0, roster = [], partners = [], mijn = null, rtt = () => null, opdracht = null, pvp = null } = {}) {
  const rijen = [];
  for (const r of roster || []) {
    if (!r || !Number.isInteger(r.slot)) continue;
    const jij = r.slot === mijnSlot;
    const p = (partners || []).find((x) => x.slot === r.slot) || null;
    let doet;
    if (jij) doet = mijn && mijn.rijdt ? 'aan het stuur' : mijn && mijn.inVoertuig ? 'in een voertuig' : 'te voet';
    else doet = p ? p.tekst : 'onbekend';
    // je eigen opdracht (#452, #455): die van jou, niet die van een andere groep of van een vaste plek
    if (opdracht && jij && !(p && p.status === 'neer')) doet += ' · in opdracht';
    let afstand = null;
    if (!jij && p && p.zichtbaar && mijn && Number.isFinite(mijn.x) && Number.isFinite(p.x)) afstand = Math.hypot(p.x - mijn.x, p.y - mijn.y);
    const ms = rtt(r.slot);
    const c = charInfo(r.char) || {}; // terugval zonder online-avatar: naam, kleur en vorm van het personage (een gast krijgt van wie het spel opende alleen plek en personage)
    const av = r.avatar && typeof r.avatar === 'object' ? r.avatar : {}; // (#455) de eigen online-avatar gaat voor de naam en kleur van het personage
    rijen.push({
      slot: r.slot, naam: av.naam || r.naam || c.naam || '?', kleur: av.kleur || r.kleur || c.kleur || '#cccccc', vorm: r.vorm || c.vorm || 'cirkel', jij,
      verbinding: r.verbinding || 'ok', verbindingTekst: VERBINDING_TEKST[r.verbinding || 'ok'] || 'goed', ms: Number.isFinite(ms) ? Math.round(ms) : null,
      passief: isPassief(pvp, r.slot), pvpInSpel: pvpInSpel(pvp), // #447: wie passief is; de stand telt als zichtbaar zodra iemand bewust op actief staat
      doet, afstand, afstandTekst: afstandTekst(afstand), x: p && p.zichtbaar ? p.x : null, y: p && p.zichtbaar ? p.y : null,
    });
  }
  // jij bovenaan, daarna op plek
  return rijen.sort((a, b) => (a.jij ? -1 : b.jij ? 1 : a.slot - b.slot));
}

// Een regel in de lijst als platte tekst (tests, schermlezers): "Tessa · te voet · goed 34 ms · 40 m"
export function rijTekst(r) {
  const naam = r.jij ? `${r.naam} (jij)` : r.naam;
  return [naam, r.doet, r.verbindingTekst + (r.ms != null ? ` ${r.ms} ms` : ''), r.afstandTekst, r.pvpInSpel ? (r.passief ? 'passief' : 'actief') : ''].filter(Boolean).join(' · ');
}

// Eruit zetten (#434): alleen wie het spel opende, en nooit zichzelf of plek 0. Daarna speelt iedereen gewoon door:
// een plek heeft geen verhaalrol die terug moet (#455).
export const kanEruitZetten = (rol, r) => rol === 'host' && !!r && !r.jij && r.slot !== 0;
// Het spel overdragen (#439): de knop bij een speler (coophostwisselnet.js doet de overdracht, coophostwissel.js is de pure basis).
export const kanOverdragen = (rol, r) => kanEruitZetten(rol, r);
export const overdragenKnopTekst = 'Spel overdragen';
export const eruitKnopTekst = (bevestig) => (bevestig ? 'Zeker weten?' : 'Eruit zetten');
export const eruitGezetTekst = (r) => `${r.naam} is uit het spel gezet. De anderen spelen door.`;
// wat de weggestuurde gast ziet; 'spel gestopt' is stoppen voor iedereen
// Alleen een kamercode (nooit een koppelcode van de IP-route: die bevat een adres) komt in beeld, zodat wie eruit gezet is weet hoe hij opnieuw kan aansluiten.
const KAMERCODE = /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;
export const wegMelding = (reden, opener, code = '') => (reden === 'spel gestopt'
  ? `${opener} heeft het spel gestopt. Je speelt weer in je eigen spel.`
  : `${opener} heeft je uit het spel gezet. Je speelt weer in je eigen spel, waar je gebleven was.${KAMERCODE.test(code || '') ? ` Opnieuw aansluiten kan met de kamercode ${code}: die staat klaar bij Samen spelen in het pauzemenu.` : ''}`);
