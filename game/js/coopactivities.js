// Samen spelen (#95): coöp-activiteiten in de open wereld, los van het verhaal:
// samen te doen opdrachten (achtervolging, overval, minigames voor twee,
// reuzenrad, padel dubbelspel). Elke activiteit registreert zich in het
// cooproles-model (registerCoop('activiteit', ...)); de netcode hoeft niet
// mee te veranderen. Beloning: ieder krijgt zijn deel in zijn eigen portemonnee
// (de host direct, de gast via een beloning-bericht, coopnet.js payGuest).
// Pure logica; de spelwereld meldt alleen voortgang en uitkomst. Alle namen
// zijn verzonnen (constitution 2); een overval toont geen geweld (constitution 6).

import { registerCoop, coopRegel, REGISTRY } from './cooproles.js';

// id -> regel. plek is optioneel en wordt door de wereldbouw ingevuld waar de activiteit start.
export const CATALOGUS = [
  { id: 'achtervolging', naam: 'Achtervolging in duo', soort: 'rijden', beloning: 400, tijd: 240, tekst: 'Eén stuurt, de ander wijst de weg: haal de vluchtauto in voor de tijd om is.' },
  { id: 'overval', naam: 'Kluisklus', soort: 'overval', beloning: 600, tijd: 300, tekst: 'Eén houdt de portier bezig, de ander gaat naar binnen. Niemand raakt gewond; de buit wordt gedeeld.' },
  { id: 'reuzenrad', naam: 'Reuzenrad voor twee', soort: 'minigame', beloning: 150, tijd: 180, tekst: 'Samen in één gondel: houd het rad in balans.' },
  { id: 'padel-dubbel', naam: 'Padel dubbelspel', soort: 'minigame', beloning: 200, tijd: 600, tekst: 'Jullie tegen twee teamgenoten van de club.' },
  { id: 'kartrace-duo', naam: 'Kartrace om de beste tijd', soort: 'minigame', beloning: 250, tijd: 300, tekst: 'Twee karts, één klok: de optelsom telt.' },
];
for (const a of CATALOGUS) registerCoop('activiteit', a.id, { spelers: 'twee', soort: a.soort, beloning: a.beloning, tijd: a.tijd, naam: a.naam, tekst: a.tekst });

export const MAX_AFSTAND = 60; // m: samen starten kan als de ander dichtbij is

// Mag deze activiteit nu starten? ctx: { samen (er is een partner), afstand (m tot de partner), actief (er loopt al iets) }
export function mayStart(id, ctx) {
  const r = coopRegel('activiteit', id);
  if (!REGISTRY.activiteit.has(id)) return { ok: false, reden: 'Deze opdracht kennen we niet.' };
  if (r.spelers === 'twee' && !ctx.samen) return { ok: false, reden: 'Voor deze opdracht heb je een medespeler nodig. Nodig iemand uit via het pauzemenu.' };
  if (r.spelers === 'twee' && ctx.afstand > MAX_AFSTAND) return { ok: false, reden: 'Je medespeler is te ver weg. Loop naar elkaar toe.' };
  if (ctx.actief) return { ok: false, reden: 'Rond eerst de lopende opdracht af.' };
  return { ok: true };
}

export function createActivity(id, startSlot = 0) {
  const r = coopRegel('activiteit', id);
  return { id, regel: r, state: 'bezig', over: r.tijd || 0, start: startSlot, punten: [0, 0], opgegeven: false, uitkomst: null };
}
export function addPoints(a, slot, n) { if (a.state === 'bezig') a.punten[slot] += Math.max(0, n | 0); return a.punten[slot]; }
export function tick(a, dt) {
  if (a.state !== 'bezig' || !a.regel.tijd) return a.state;
  a.over -= dt;
  if (a.over <= 0) { a.over = 0; a.state = 'mislukt'; a.uitkomst = finish(a, false); }
  return a.state;
}
// Wegvallen van een van beiden midden in de opdracht: de opdracht stopt zonder straf of beloning.
export function cancel(a, reden = 'weg') { if (a.state === 'bezig') { a.state = 'afgebroken'; a.reden = reden; } return a.state; }

function finish(a, geslaagd) {
  const totaal = a.punten[0] + a.punten[1];
  const basis = geslaagd ? a.regel.beloning : Math.floor(a.regel.beloning * 0.1); // een mislukte poging levert een klein bedrag op
  // ieder krijgt zijn eigen deel: 40% basis plus tot 20% naar wat hij bijdroeg; samen de volledige beloning
  const share = (slot) => Math.floor(basis * (0.4 + 0.2 * (totaal > 0 ? a.punten[slot] / totaal : 0.5))); // samen precies de buit
  const geld = [share(0), share(1)];
  return { geslaagd, geld, medaille: geslaagd ? (totaal >= 20 ? 'goud' : totaal >= 10 ? 'zilver' : 'brons') : null };
}
export function complete(a) {
  if (a.state !== 'bezig') return a.uitkomst;
  a.state = 'geslaagd'; a.uitkomst = finish(a, true); return a.uitkomst;
}

// Uitbetaling: rewards[0] is voor de host (slot 0), rewards[1] voor de gast. pay(slot, geld) doet het werk
// (host: world.money +=; gast: payGuest). Het geld komt bij ieders eigen portemonnee.
export function payOut(a, pay) {
  if (!a.uitkomst || a.paid) return false;
  a.paid = true;
  a.uitkomst.geld.forEach((g, slot) => { if (g > 0) pay(slot, g); });
  return true;
}
