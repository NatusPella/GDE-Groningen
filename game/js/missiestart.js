// De visuele hiërarchie bij het begin van een missie (23-11, akte 1 op eindniveau; beeldcontrole coördinator: bij de start van M01 stonden
// de doelbalk, de klok, een introkaart midden over de actie en het regelpaneel tegelijk in beeld, plus een bijbaanbord op de missieplek).
// Puur, zonder DOM of three: scripts/missiestart_test.mjs keurt de regels en dat de runner (missions.js), het stuntpaneel (stunthud.js)
// en de bijbaanprompt (sidejobs.js) ze volgen. Eén regel voor elke missiestart:
//   1. eén primair element: de doelbalk met wat je nu doet ("Stap in Berends bakkie");
//   2. moet je eerst instappen (de missie heeft een eigen voertuig), dan loopt de klok nog niet en staat hij niet in beeld, en ook het
//      punten- of regelpaneel en de introkaart wachten: die horen bij de actie, niet bij het lopen naar de auto;
//   3. de introkaart is kort (hoogstens INTRO_MAX_S) en staat onder de doelbalk, nooit midden over de actie;
//   4. tijdens een actieve missie geen prompt van een bijbaantje in de wereld (die hoort niet bij het verhaal van nu).
// Samen spelen: 'ingestapt' geldt voor de groep: één meespeler in het missievoertuig is genoeg (zoals de stappen van de groep).

export const INTRO_MAX_S = 5;
export const INTRO_PLEK = 'onder-doelbalk'; // stunthud.js zet de kaart daar (CSS top onder de doelbalk), niet in het midden

// voertuig: heeft de missie een eigen voertuig waar je eerst in moet; ingestapt: zat iemand van de groep er al in; cinematic: loopt er
// een scène (de klok stond daar altijd al stil).
export function startHierarchie({ voertuig = false, ingestapt = false, cinematic = false } = {}) {
  const wacht = !!voertuig && !ingestapt;
  return {
    primair: 'doel',
    klokLoopt: !wacht && !cinematic,
    klokZichtbaar: !wacht,
    paneel: !wacht,
    intro: !wacht,
    bijbaanPrompts: false,
  };
}

// Mag de prompt van een bijbaantje in de wereld staan? Niet zolang er een missie loopt.
export const bijbaanPromptToegestaan = (missie) => !(missie && missie.phase === 'active');
