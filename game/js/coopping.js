// Samen spelen (#95, #367): snelle roepjes. Drie toetsen, bij iedereen een baken in de wereld, een punt op de minimap
// en de kaart, en een korte regel ("Tessa: Kom hier"). Pure logica: welke soort bij welke toets hoort, waar het
// baken staat en hoe een ping bij de ontvanger eruitziet. Het tekenen staat in cooppings3d.js, hud_panel.js en mapview.js.

import { charInfo } from './coopplayers.js';

// toets -> soort (de soort gaat over het net, partnerhud.js addPing kent 'hier', 'gevaar', 'doel')
export const PING_TOETSEN = [
  { toets: '7', soort: 'hier', tekst: 'Kom hier' },
  { toets: '8', soort: 'gevaar', tekst: 'Help!' },
  { toets: '9', soort: 'doel', tekst: 'Kijk daar' },
];
export const PING_TEKST = Object.fromEntries(PING_TOETSEN.map((p) => [p.soort, p.tekst]));
export const KIJK_AFSTAND = 25; // m: 'Kijk daar' wijst zoveel meter vooruit
// kleur van het baken per soort als de afzender onbekend is
export const SOORT_KLEUR = { hier: '#4fb3ff', gevaar: '#ff5a4f', doel: '#f2c94c' };

// Waar komt de ping te staan? 'Kom hier' en 'Help!' op je eigen plek, 'Kijk daar' een stuk voor je uit.
export function pingPlek(lichaam, soort) {
  if (!lichaam || !Number.isFinite(lichaam.x) || !Number.isFinite(lichaam.y)) return null;
  if (soort !== 'doel') return { x: lichaam.x, y: lichaam.y };
  const a = Number.isFinite(lichaam.angle) ? lichaam.angle : 0;
  return { x: lichaam.x + Math.cos(a) * KIJK_AFSTAND, y: lichaam.y + Math.sin(a) * KIJK_AFSTAND };
}

// Wie riep er? van = 'eigen' of de plek van een speler. Geeft naam en kleur uit de lijst met spelers.
export function afzender(van, roster, mijnPlek) {
  const slot = van === 'eigen' ? mijnPlek : Number(van);
  const r = (roster || []).find((x) => x && x.slot === slot);
  const c = r ? (charInfo(r.char) || {}) : {};
  return { slot, naam: (r && r.naam) || c.naam || '', kleur: (r && r.kleur) || c.kleur || null, vorm: (r && r.vorm) || c.vorm || 'cirkel' };
}

// De pings zoals de tekenaars ze nodig hebben: positie, kleur, tekst, hoe lang nog.
export function pingMarkers(pings, roster, mijnPlek, nu) {
  const out = [];
  for (const p of (pings && pings.lijst) || []) {
    if (p.tot <= nu) continue;
    const a = afzender(p.van, roster, mijnPlek);
    out.push({ id: `${p.x.toFixed(1)}|${p.y.toFixed(1)}|${p.tot.toFixed(2)}`, x: p.x, y: p.y, soort: p.soort, kleur: a.kleur || SOORT_KLEUR[p.soort] || '#ffffff', vorm: p.soort === 'gevaar' ? 'kruis' : p.soort === 'doel' ? 'ster' : a.vorm, naam: a.naam, tekst: PING_TEKST[p.soort] || PING_TEKST.hier, rest: p.tot - nu });
  }
  return out;
}

// De regel voor wie de ping ontvangt ("Tessa: Kom hier"); leeg als de afzender onbekend is.
export function pingRegel(van, soort, roster, mijnPlek) {
  const a = afzender(van, roster, mijnPlek);
  return a.naam ? `${a.naam}: ${PING_TEKST[soort] || PING_TEKST.hier}` : (PING_TEKST[soort] || PING_TEKST.hier);
}
