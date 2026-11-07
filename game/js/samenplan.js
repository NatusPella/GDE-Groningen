// Samen spelen (#684): de positieve kant. Een gast leest bij het meeste aanbod vooral wat hij niet
// kan; daarom noemt het spel één keer wat samen wél kan (naast "Meedoen?"), en krijgt hij een "eigen
// plan"-kaart als hij bij een activiteit staat die alleen de opener kan (zwembad, kermis, vliegschool).
//
// Gewone HUD-tips (hudcards.js), geen nieuw paneel en geen knoppen: de vier eigen activiteiten staan
// met hun plek in de tekst. De lijsten en teksten staan in coopstatus.js (uit het register, alleen wat
// 'werkt' is) en zijn daar puur getest; dit bestand toont ze één keer per wereld.
import { showCard } from './hudcards.js';
import { SAMEN_KAN_KORT, SAMEN_KAN_TITEL, EIGEN_PLAN_TEKST, EIGEN_PLAN_TITEL } from './coopstatus.js';

// Eén keer per wereld: dezelfde kaart niet bij elke uitnodiging of poging opnieuw.
const kanGehad = new WeakSet();
const planGehad = new WeakSet();

// Naast de eerste "Meedoen?"-kaart: wat kan samen? De wachtkamer noemt de volledige lijst.
export function meldSamenKan(world, { force = false } = {}) {
  if (!world || (!force && kanGehad.has(world))) return false;
  kanGehad.add(world);
  showCard(world, { kind: 'tip', kicker: 'Samen spelen', title: SAMEN_KAN_TITEL, body: SAMEN_KAN_KORT, key: 'samen-kan', duration: 14, voice: false });
  return true;
}

// De opener doet iets dat alleen hij kan: de gast hoeft niet werkloos toe te kijken.
export function toonEigenPlan(world) {
  if (!world || planGehad.has(world)) return false;
  planGehad.add(world);
  showCard(world, { kind: 'tip', kicker: 'Samen spelen', title: EIGEN_PLAN_TITEL, body: EIGEN_PLAN_TEKST, key: 'eigen-plan', duration: 16, voice: false });
  return true;
}
