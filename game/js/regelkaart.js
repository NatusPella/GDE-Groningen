// De REGELKAART per missiestap (AAA-upgradeplan, bouwsteen 1): een kaartje met het doel van de stap en
// daarna de regels als regelwidget-vormen (limiet, teller, voorraad, wijzer, timing, toets, stappen), één regel
// tegelijk en pas wanneer ze nodig is; daarna is de kaart stil. De gegevens staan declaratief in de stap:
//
//   { kind: 'goto', ...,
//     kaart: {
//       doel: 'Breng de eieren heel naar Tinus',
//       druk: 'Je hebt drie minuten',                 // optioneel: tijdsdruk, bij het doel
//       afloop: 'Alle eieren stuk: opnieuw proberen', // optioneel: wat er misgaat, bij het doel
//       regels: [                                     // hoogstens drie
//         { type: 'limiet', label: 'Snelheid', inv: { waarde: 0, limiet: 40 }, na: 7 },
//         { type: 'voorraad', inv: { heel: 60, totaal: 60, icoon: 'ei', label: 'Eieren' }, bij: 'eierstoot' },
//       ],
//     } }
//
// `na` (seconden sinds het begin van de stap) of `bij` (een sleutel die de runner meldt met meldRegelkaart) bepaalt
// wanneer de regel aan de beurt is; zonder beide volgt de regel de vorige. Nooit twee kaartjes tegelijk: een regel
// wacht tot de vorige zijn tijd (`duur`, standaard 8 s) heeft gehad. Een stap zonder `kaart` of met een kapotte
// beschrijving krijgt niets: kaartVan geeft null en de runner doet gewoon wat hij deed.
//
// Samen spelen: de kaart is lokaal (showCard in het eigen venster) en leest alleen de eigen stapstand; er gaat
// niets over het net en er wordt niets in de wereld, de beloning of de voortgang geschreven. Elke speler die de
// stap zelf draait, ziet zijn eigen kaart en zijn eigen tijdslijn.
//   node scripts/regelkaart_test.mjs
import { showCard } from './hudcards.js';
import { haakUi } from './sfx/haken.js'; // ronde 4: zacht papier bij een nieuw kaartje
import { TYPES, vorm, iconSvg, ICONEN } from './regelwidget.js';

export const MAX_REGELS = 3;
export const DUUR_DOEL = 7;
export const DUUR_REGEL = 8;
const MAX_TEKST = 90;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tekst = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TEKST) : '');
const klem = (v, a, b) => Math.min(b, Math.max(a, v));
const STANDAARD_ICOON = { limiet: 'meter', teller: 'klok', voorraad: 'pakje', wijzer: 'pijl', timing: 'klok', toets: 'hand', stappen: 'pakje' };

// Normaliseert de beschrijving; null als er niets te tonen valt (geen kaart, geen doel en geen bruikbare regel).
// De invoer wordt nooit gewijzigd.
export function kaartVan(stap) {
  const k = stap && stap.kaart;
  if (!k || typeof k !== 'object') return null;
  const doel = tekst(k.doel);
  const regels = [];
  let vrij = DUUR_DOEL; // vanaf wanneer een regel zonder `na` of `bij` aan de beurt is
  for (const r of Array.isArray(k.regels) ? k.regels : []) {
    if (regels.length >= MAX_REGELS) break;
    if (!r || typeof r !== 'object' || !TYPES.includes(r.type)) continue;
    const inv = r.inv && typeof r.inv === 'object' ? { ...r.inv } : {};
    const label = tekst(r.label) || tekst(inv.label);
    const duur = Number.isFinite(r.duur) ? klem(r.duur, 3, 20) : DUUR_REGEL;
    const bij = tekst(r.bij) || null;
    const na = Number.isFinite(r.na) ? Math.max(0, r.na) : bij ? Infinity : vrij;
    if (!bij || Number.isFinite(r.na)) vrij = Math.max(vrij, na + duur);
    // een regel zonder bruikbare getallen en zonder eigen tekst heeft niets te zeggen
    const v = vorm(r.type, inv, {});
    const zin = tekst(r.tekst) || (v && !v.verborgen ? tekst(v.alt) : '');
    if (!zin) continue;
    regels.push({ type: r.type, label, inv, zin, icoon: tekst(r.icoon) || (v && v.icoon) || STANDAARD_ICOON[r.type], na, bij, duur });
  }
  if (!doel && !regels.length) return null;
  return { doel, druk: tekst(k.druk), afloop: tekst(k.afloop), regels };
}

// De staat van één stap, bij de speler zelf. `id` maakt de kaartsleutels uniek per stap.
export function startKaart(stap, id = '') {
  const kaart = kaartVan(stap);
  if (!kaart) return null;
  return { kaart, id: String(id), t: 0, doelGetoond: false, vrijVanaf: 0, getoond: 0, regelGetoond: kaart.regels.map(() => false), bij: Object.create(null), klaar: false };
}

// De runner (of een missie-module) meldt dat er iets gebeurde waarvoor een regel `bij` wacht.
export function meldKaart(staat, sleutel) {
  if (staat && !staat.klaar && sleutel) staat.bij[String(sleutel)] = true;
}

function doelSpec(staat) {
  const { kaart, id } = staat;
  const regels = [];
  if (kaart.druk) regels.push(`Tijd: ${kaart.druk}`);
  if (kaart.afloop) regels.push(`Afloop: ${kaart.afloop}`);
  const titel = kaart.doel || 'Regel';
  const body = [kaart.doel ? `Doel: ${kaart.doel}` : '', ...regels].filter(Boolean).join(' ');
  return {
    kind: 'tip', missie: true, kicker: 'Doel', title: titel, body,
    bodyHtml: regels.map((r) => esc(r)).join('<br>') || esc(body),
    duration: DUUR_DOEL, key: `regelkaart-${id}-doel`, voice: false, important: true,
  };
}

function regelSpec(staat, i) {
  const r = staat.kaart.regels[i];
  return {
    kind: 'tip', missie: true, kicker: 'Regel', title: r.label || staat.kaart.doel || 'Regel', body: r.zin,
    bodyHtml: `<span class="rw-kaartregel">${iconSvg(ICONEN[r.icoon] ? r.icoon : STANDAARD_ICOON[r.type])} ${esc(r.zin)}</span>`,
    duration: r.duur, key: `regelkaart-${staat.id}-${i}`, voice: false, important: true,
  };
}

// Eén tik van de kaart: geeft de kaartspec die nu getoond moet worden, of null. Puur op de staat; maakt alleen
// een object op een toonmoment (hoogstens vier keer per stap), nooit per beeld. Daarna: klaar, en stil.
export function tikKaart(staat, dt) {
  if (!staat || staat.klaar) return null;
  staat.t += Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.5) : 0;
  if (!staat.doelGetoond) {
    staat.doelGetoond = true;
    staat.vrijVanaf = DUUR_DOEL;
    staat.getoond++;
    if (staat.kaart.doel || staat.kaart.druk || staat.kaart.afloop) return doelSpec(staat);
  }
  if (staat.t < staat.vrijVanaf) return null;
  const regels = staat.kaart.regels;
  for (let i = 0; i < regels.length; i++) {
    if (staat.regelGetoond[i]) continue;
    const r = regels[i];
    const aanDeBeurt = staat.t >= r.na || (r.bij && staat.bij[r.bij] === true);
    if (!aanDeBeurt) continue; // een regel die op een gebeurtenis wacht, houdt de volgende niet tegen
    staat.regelGetoond[i] = true;
    staat.vrijVanaf = staat.t + r.duur;
    staat.getoond++;
    return regelSpec(staat, i);
  }
  // alles getoond: stil. Regels die op een gebeurtenis wachten die nooit kwam, blijven stil.
  if (staat.regelGetoond.every(Boolean)) staat.klaar = true;
  return null;
}

// De dunne laag voor de runner: tik en toon. Een fout in de kaart mag een missie nooit raken.
export function toonRegelkaart(world, staat, dt) {
  try {
    const spec = tikKaart(staat, dt);
    if (spec) { showCard(world, spec); haakUi('regelkaart_papier'); }
    return spec;
  } catch (e) {
    if (staat) staat.klaar = true;
    return null;
  }
}
