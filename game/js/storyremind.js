// Herinnering aan het huidige verhaaldoel (verfijning 22-11): wie een doel laat liggen, krijgt na 5 minuten één appje. Wie daarna
// nog een half uur in de wereld rondrijdt zonder het doel te raken, kreeg niets meer en had geen idee dat er een kaart en een
// Overzicht zijn. Nu komen er na 15 en 30 minuten nog twee, steeds op een ander toontje en steeds zonder iets op te dringen.
// Puur: geen DOM, geen wereld. story.js vraagt remindDue() elke frame en toont remindText().
//
// Samen spelen: het appje is lokaal en gaat naar de speler van dit spel (de verhaalstap is van wie het spel opende); een gast
// krijgt het niet, hij heeft geen eigen verhaalstap. Er hangt geen beloning of voortgang aan.
export const REMIND_AT_S = [300, 900, 1800];

// Is er nu een herinnering aan de beurt? elapsed: seconden sinds de stap begon (in spelertijd); gedaan: hoeveel er al kwamen.
export function remindDue(elapsed, gedaan) {
  const k = Math.max(0, Math.floor(Number(gedaan) || 0));
  return Number.isFinite(elapsed) && k < REMIND_AT_S.length && elapsed > REMIND_AT_S[k];
}

// De tekst van herinnering k (0 is de eerste, de oude tekst). Altijd een titel erin, nooit een toets of een getal.
export function remindText(k, title) {
  const t = String(title || '').trim();
  if (k <= 0) return `Nog even dit: ${t}. Staat op je kaart, als je zin hebt.`;
  if (k === 1) return `Nog steeds: ${t}. Geen haast, de kaart wijst het aan.`;
  return `Zit je ergens mee bij: ${t}? In Overzicht staat wat je al weet.`;
}
