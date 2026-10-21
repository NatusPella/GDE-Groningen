// Samen spelen (#95): de wachtkamer voor het begin van een spel. Kiest iemand in het hoofdmenu "Samen spelen",
// dan begint het spel pas als de gastheer op "Spel starten" drukt: zo zien alle spelers de openingsscène
// samen. Een gewone variabele: het wereldobject wordt bij een nieuw spel opnieuw opgebouwd.
let gate = false;
export const gateOn = () => gate;
export const setGate = (aan) => { gate = !!aan; };
