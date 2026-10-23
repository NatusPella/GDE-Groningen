// Samen spelen (#95): de wachtkamer voor het begin van een spel. Kiest iemand in het hoofdmenu "Samen spelen",
// dan begint het spel pas als de gastheer op "Spel starten" drukt: zo zien alle spelers de openingsscène
// samen. Een gewone variabele: het wereldobject wordt bij een nieuw spel opnieuw opgebouwd.
let gate = false;
export const gateOn = () => gate;
export const setGate = (aan) => { gate = !!aan; };
// Een gast hoort van de gastheer of het spel nog niet begonnen is (aan) of nu begint (uit). Ook een gast die niet via het hoofdmenu kwam
// (maar via het pauzemenu, in een spel dat al liep) wacht dan in de wachtkamer: anders loopt hij rond terwijl de wereld van de gastheer stilstaat
// en begint het filmpje pas na het spelen. world.coopHekMenu vraagt main.js het menu Samen spelen te openen.
export function hekBericht(world, aan) {
  world.coopHek = !!aan;
  if (aan && !gate) { gate = true; world.coopHekMenu = true; }
  else if (!aan && gate) { gate = false; world.coopHekMenu = false; }
  return gate;
}
