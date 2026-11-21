// Samen spelen (#452, #429): de Samen-regel van elke verhaalstap die geen missie is (de tussenstappen N, T, A, J, F, V en E). Eén regel
// per soort doel: van wie het is, wat een gast ziet, wie de beloning krijgt en wat er gebeurt als iemand wegvalt of later aansluit.
// Een nieuw doeltype in storyarc.js zonder regel hier laat scripts/multiplayerstorysteps_test.mjs falen: elke nieuwe stap krijgt
// dus een Samen-regel voor hij af is (AGENTS.md, Multiplayer bij ontwerp). Pure data, geen DOM en geen netwerk.

// van: 'wereld' = van wie het spel opende (zijn lichaam telt: storyreis.js leest hoofdspeler). Geen enkele soort stuurt iets over het net.
export const STEP_MULTIPLAYER = {
  opening: { van: 'wereld', gast: 'De openingsmontage speelt bij wie het spel opende; een gast ziet hem niet en zijn eigen opening begint in zijn eigen spel.', beloning: 'Geen.', wegval: 'Niets te herstellen: de montage is beeld, geen voortgang.' },
  reis: { van: 'wereld', gast: 'De reis telt met het lichaam van wie het spel opende (of zijn voertuig); de scène bij aankomst speelt lokaal bij hem. Een gast loopt vrij rond en houdt zijn eigen verhaal.', beloning: 'Geen; de stap staat alleen in de voortgang van wie het spel opende. Een gast verliest niets.', wegval: 'Valt een gast weg of sluit hij later aan, dan verandert er niets aan de stap; gaat het spel over naar een ander, dan gaat de verhaalstand mee in de momentopname.' },
  home: { van: 'wereld', gast: 'De scène in de flat is van wie het spel opende en speelt lokaal; een gast speelt hem niet en kan er nooit in vastlopen.', beloning: 'Geen.', wegval: 'Niets te herstellen: de scène hoort bij een thuiskomst, geen gedeelde stand.' },
  sideJob: { van: 'wereld', gast: 'De bijbaan (bietenoogst) is een gewone bijbaan met een eigen Meedoen?: wie ja zegt loopt mee.', beloning: 'Volledige beloning per meespelende speler (coopbeloning); wie nee zei krijgt niets.', wegval: 'Wie wegvalt verliest alleen de lopende ronde; de beloning gaat per gebeurtenis, nooit dubbel.' },
  shop: { van: 'wereld', gast: 'De stap telt het winkelbezoek van wie het spel opende (de winkelbezoeken van zijn eigen spel); een gast die zelf een winkel binnengaat koopt voor zijn eigen geld in zijn eigen opslag, maar telt voor deze stap niet mee.', beloning: 'Geen extra beloning; wat je koopt betaal je zelf en blijft van jou.', wegval: 'Valt een gast weg of sluit hij later aan, dan verandert er niets aan de stap; hij verliest geen aankoop.' },
  kermis: { van: 'wereld', gast: 'De kermis is host-only (coopstatus: de minigame werkt alleen in het eigen spel); een gast speelt hem niet en krijgt een waarschuwing vooraf.', beloning: 'Alleen voor wie de kermis zelf speelt.', wegval: 'Niets te herstellen: de minigame hoort bij een lokaal spel.' },
  epilogue: { van: 'wereld', gast: 'Het slotbeeld speelt bij wie het spel opende; een gast ziet het niet en houdt zijn eigen voortgang.', beloning: 'Geen.', wegval: 'Niets te herstellen.' },
};
export const stepKind = (step) => (step && step.goal && step.goal.type) || null;
export function stepMultiplayerRule(step) {
  const r = STEP_MULTIPLAYER[stepKind(step)];
  return r ? { soort: stepKind(step), ...r } : null;
}
