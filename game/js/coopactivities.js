// Samen spelen (#95): coöp-activiteiten in de open wereld, los van het verhaal,
// voor 2 tot 8 spelers: samen te doen opdrachten (achtervolging, overval,
// minigames, reuzenrad, padel dubbelspel, kartrace). Elke activiteit registreert
// zich in het cooproles-model (registerCoop('activiteit', ...), met min en max
// spelers); de netcode hoeft niet mee te veranderen. Ook extra spelers doen mee.
// Beloning: ieder krijgt zijn deel in zijn eigen portemonnee (de host direct,
// gasten via een beloning-bericht, coopnet.js payGuest).
// De Kluisklus (overval) heeft sinds #438 rollen (heistrollen.js): samen met een
// eigen rol en een gedeelde buit, of tegen elkaar om de grootste buit.
// Pure logica; de spelwereld meldt alleen voortgang en uitkomst. Alle namen
// zijn verzonnen (constitution 2); een overval toont geen geweld (constitution 6).

import { registerCoop, coopRegel, REGISTRY } from './cooproles.js';
import { rollenPerSpeler, buitVerdelen, isModus, MODI } from './heistrollen.js';

// id -> regel. min/max = aantal spelers dat meedoet (2 tot 8).
export const CATALOGUS = [
  { id: 'achtervolging', naam: 'Achtervolging in duo', soort: 'rijden', beloning: 400, tijd: 240, min: 2, max: 4, tekst: 'Eén stuurt, de anderen wijzen de weg: haal de vluchtauto in voor de tijd om is.' },
  { id: 'overval', naam: 'Kluisklus', soort: 'overval', beloning: 600, tijd: 300, min: 2, max: 4, rollen: true, modi: ['samen', 'tegen'], tekst: 'Eén houdt de portier bezig, de anderen gaan naar binnen. Niemand raakt gewond; de buit wordt gedeeld of ieder houdt de eigen buit.' },
  { id: 'reuzenrad', naam: 'Reuzenrad voor twee', soort: 'minigame', beloning: 150, tijd: 180, min: 2, max: 4, tekst: 'Samen in één gondel: houd het rad in balans.' },
  { id: 'padel-dubbel', naam: 'Padel dubbelspel', soort: 'minigame', beloning: 200, tijd: 600, min: 2, max: 4, tekst: 'Jullie tegen twee teamgenoten van de club.' },
  { id: 'kartrace-duo', naam: 'Kartrace om de beste tijd', soort: 'minigame', beloning: 250, tijd: 300, min: 2, max: 8, tekst: 'Alle karts, één klok: de optelsom telt.' },
];
for (const a of CATALOGUS) registerCoop('activiteit', a.id, { spelers: 'twee', soort: a.soort, beloning: a.beloning, tijd: a.tijd, naam: a.naam, tekst: a.tekst, min: a.min, max: a.max });

export const MAX_AFSTAND = 60; // m: samen starten kan als de anderen dichtbij zijn

// Mag deze activiteit nu starten? ctx: { aanwezig: [plekken], afstanden: { plek: m tot de starter }, actief }
export function mayStart(id, ctx) {
  const r = coopRegel('activiteit', id);
  if (!REGISTRY.activiteit.has(id)) return { ok: false, reden: 'Deze opdracht kennen we niet.' };
  const aanwezig = ctx.aanwezig || (ctx.samen ? [0, 1] : [0]);
  const dichtbij = aanwezig.filter((s) => s === 0 || ((ctx.afstanden || {})[s] ?? ctx.afstand ?? 0) <= MAX_AFSTAND);
  const min = r.min || 2;
  if (r.spelers === 'twee' && aanwezig.length < min) return { ok: false, reden: 'Voor deze opdracht heb je een medespeler nodig. Nodig iemand uit via het pauzemenu.' };
  if (r.spelers === 'twee' && dichtbij.length < min) return { ok: false, reden: 'Je medespeler is te ver weg. Loop naar elkaar toe.' };
  if (ctx.actief) return { ok: false, reden: 'Rond eerst de lopende opdracht af.' };
  return { ok: true, spelers: dichtbij.slice(0, r.max || 8) };
}

// spelers: de plekken die meedoen (standaard 0 en 1); iedereen houdt zijn eigen punten
export function createActivity(id, spelers = [0, 1], startSlot = 0) {
  const r = coopRegel('activiteit', id);
  const lijst = [...new Set(spelers)].slice(0, r.max || 8);
  return { id, regel: r, state: 'bezig', over: r.tijd || 0, start: startSlot, spelers: lijst, punten: Object.fromEntries(lijst.map((s) => [s, 0])), uitkomst: null };
}
export function addPoints(a, slot, n) { if (a.state === 'bezig' && slot in a.punten) a.punten[slot] += Math.max(0, n | 0); return a.punten[slot]; }
export function tick(a, dt) {
  if (a.state !== 'bezig' || !a.regel.tijd) return a.state;
  a.over -= dt;
  if (a.over <= 0) { a.over = 0; a.state = 'mislukt'; a.uitkomst = finish(a, false); }
  return a.state;
}
// Een speler valt weg: de opdracht loopt door als er nog genoeg spelers zijn, anders stopt hij zonder straf of beloning.
export function verlaat(a, slot) {
  if (a.state !== 'bezig' || !a.spelers.includes(slot)) return a.state;
  a.spelers = a.spelers.filter((s) => s !== slot); // zijn punten blijven staan; hij krijgt geen beloning
  if (a.rollen) a.rollen = rollenPerSpeler(a.spelers); // de rollen van wie overblijft opnieuw verdelen (#438)
  if (a.spelers.length < (a.regel.min || 2)) { a.state = 'afgebroken'; a.reden = 'te weinig spelers'; }
  return a.state;
}
export function cancel(a, reden = 'weg') { if (a.state === 'bezig') { a.state = 'afgebroken'; a.reden = reden; } return a.state; }

// De Kluisklus met rollen (#438): iedereen een eigen rol (uitkijk, loper, kluisspecialist,
// schipper) met een gedeelde buit, of tegen elkaar: ieder doet het hele plan en de grootste
// buit wint. De rollen en de verdeling staan in heistrollen.js; dit is dezelfde activiteit
// als createActivity('overval'), met de rollen erbij.
export function maakOverval(spelers = [0, 1], modus = 'samen', startSlot = 0) {
  const a = createActivity('overval', spelers, startSlot);
  a.modus = isModus(modus) ? modus : 'samen';
  a.rollen = rollenPerSpeler(a.spelers);
  a.modusTekst = MODI[a.modus].tekst;
  return a;
}
// De rol van een plek in de Kluisklus (null zonder rollen of met een onbekende stap).
export const overvalRol = (a, slot) => ((a && a.rollen ? a.rollen.find((r) => r.slot === slot) : null) || {}).rollen || [];

function finish(a, geslaagd) {
  const totaal = a.spelers.reduce((x, s) => x + a.punten[s], 0);
  const basis = geslaagd ? a.regel.beloning : Math.floor(a.regel.beloning * 0.1); // een mislukte poging levert een klein bedrag op
  const medaille = geslaagd ? (totaal >= 20 ? 'goud' : totaal >= 10 ? 'zilver' : 'brons') : null;
  // De Kluisklus met rollen (#438): samen delen of ieder voor zich; de buit gaat volgens heistrollen.js.
  if (a.rollen) {
    const b = buitVerdelen(a.modus, a.spelers, a.punten, basis);
    return { geslaagd, geld: b.geld, medaille, winnaar: b.winnaar, modus: b.modus };
  }
  // ieder krijgt zijn eigen deel: 80% gelijk verdeeld plus 20% naar wat hij bijdroeg; samen de volledige beloning
  const n = a.spelers.length;
  const geld = {};
  for (const s of a.spelers) geld[s] = Math.floor(basis * (0.8 / n + 0.2 * (totaal > 0 ? a.punten[s] / totaal : 1 / n)));
  return { geslaagd, geld, medaille };
}
export function complete(a) {
  if (a.state !== 'bezig') return a.uitkomst;
  a.state = 'geslaagd'; a.uitkomst = finish(a, true); return a.uitkomst;
}

// Uitbetaling: pay(slot, geld) doet het werk (host: world.money +=; gast: payGuest(world, geld, slot)).
// Het geld komt bij ieders eigen portemonnee, precies een keer.
export function payOut(a, pay) {
  if (!a.uitkomst || a.paid) return false;
  a.paid = true;
  for (const [slot, g] of Object.entries(a.uitkomst.geld)) if (g > 0) pay(+slot, g);
  return true;
}
