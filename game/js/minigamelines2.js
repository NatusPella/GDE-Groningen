// What is said at Minigames batch 2: the lifeguard at Zwembad Het Natte Papier,
// the climbing instructor at the Klimtoren and the boat driver at the
// waterskibaan, all as text bubbles (no recorded voice). Pure data, invented
// names and places only.
export const POOL_LINES = {
  who: 'Badmeester Joost',
  start: ['Moi! Vier banen, vijfentwintig meter. Eerst duiken, dan om en om zwemmen.', 'Niet rennen langs het bad. Ook niet voor een medaille.'],
  dive: ['Mooie duik. Dat scheelt een halve seconde.', 'Strak het water in. Zo hoort het.'],
  flop: ['Au. Dat was een buikschuiver, dat hoorde ik tot hier.', 'De eenden hielden het voor een golfbreker.'],
  flip: ['Mooie keerpunt! Zo draai je in één keer om.'],
  last: ['Laatste baan! Houd je ritme vast.'],
  endGood: ['Mooi gezwommen. Er is koffie bij de ingang.', 'Zo snel zie ik ze niet vaak. Handdoek is voor jou.'],
  endPoor: ['Volgende keer rustiger slaan. Het water loopt niet weg.', 'Droog je maar even af. Het bad blijft liggen.'],
};

export const CLIMB_LINES = {
  who: 'Instructeur Nienke',
  start: ['Moi! Houd A en D vast om je handen te pakken. Eén hand los, de andere houdt.', 'Grote greepjes zijn rustplekken. Gebruik ze.'],
  rest: ['Rust op een grote greep. Je armen zeggen dank.'],
  low: ['Je armen worden moe. Zoek een grote greep.', 'Houd je kalmte. Magnesium helpt, met Spatie.'],
  fall: ['Valt erbij! De mat vangt je op. Opnieuw.', 'Rustig opstaan. De wand loopt niet weg.'],
  top: ['Bovenaan! Wat een uitzicht over Zernike.'],
  endGood: ['Goed geklommen. De wand is blij met je.'],
  endPoor: ['Probeer het nog eens. Kijk eerst waar je volgende hand heen gaat.'],
};

export const SKI_LINES = {
  who: 'Schipper Wiebe',
  start: ['Moi! Houd de lijn strak en leun met A en D. Over de golven met Spatie.', 'Zwaai ruim om de boeien. Ik vaar rustig.'],
  jump: ['Over de golf! Mooie sprong.', 'Hoog! Houd je ski recht voor de landing.'],
  clean: ['Schoon geland. Zo hoort het.', 'Strak. Doe dat nog een keer.'],
  fall: ['Plons! Het meer is ook maar water.', 'Ski kwijt? Gelukkig drijft hij.'],
  gate: ['Netjes om de boei.'],
  endGood: ['Mooie ronde. Het meer was blij.'],
  endPoor: ['Nog een keer? De boot wacht.'],
};
