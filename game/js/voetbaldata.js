// De teksten van de voetbalwedstrijd in de Euroborg (#981): commentaar van een verzonnen verslaggever en een opmerking van Oma Trijntje op de tribune. Alleen Nederlands, alleen verzonnen
// namen en clubs (geen echte spelers, clubs of merken). Pure data, geen DOM: scripts/voetbal_test.mjs controleert dat elke soort regels heeft en niets echts noemt.
export const VOETBAL_LINES = {
  who: 'Verslaggever Hilbrand',
  oma: 'Oma Trijntje (tribune)',
  start: ['Welkom in de Euroborg! Vijf tegen vijf, één bal en een heleboel Grunnegers.', 'De bal ligt op de stip. Op de tribune: Oma Trijntje met een thermosfles en grote verwachtingen.'],
  goalThuis: ['GOAL voor de Stadjers! Dat noem ik een vloeiende aanval.', 'Binnen! De Stadjers vieren het met een polonaise.', 'Wat een schot! De keeper keek nog naar de verkeerde hoek.'],
  goalUit: ['De tegenstander scoort. Even slikken, even doorgaan.', 'Tegendoelpunt. Oma Trijntje schudt haar hoofd, maar ze blijft zitten.', 'Binnen. De keeper wil de grasmat even onder handen nemen.'],
  redding: ['Wat een redding! De keeper houdt zijn doel schoon.', 'Gestopt! Die ging er bijna in.', 'De keeper vloog erheen. Er zat gras in zijn haar.'],
  paal: ['Tegen de paal! Dat scheelde een haar.', 'Op de lat! De hele tribune hield de adem in.'],
  uit: ['De bal is uit. Even de adem inhouden.', 'Naar de tribune. Oma Trijntje vangt hem, en geeft hem niet terug.'],
  overtreding: ['Overtreding. Vrije bal, de scheidsrechter wijst.', 'Dat was te fel. Vrije bal voor de ander.'],
  rust: ['Rust. De thermosfles gaat rond.', 'Rust. Even bijkomen en dan weer vol gas.'],
  winst: ['Gewonnen! De Stadjers dansen over het veld.', 'Een overwinning in de Euroborg. Oma Trijntje trakteert op pepermunt.'],
  verlies: ['Verloren. De volgende keer beter, Oma Trijntje blijft komen.', 'Dat was niet ons dagje. Het gras kan er niets aan doen.'],
  gelijk: ['Gelijkspel. Niemand wint, niemand gaat boos naar huis.', 'Gelijk. De pepermunt wordt eerlijk verdeeld.'],
  omaPraat: ['Oma Trijntje: Schiet nou eens, jongen!', 'Oma Trijntje: In mijn tijd speelden we op klompen.', 'Oma Trijntje: Die scheids is blind, maar wel aardig.'],
};
export const PROMPT_SUB = '11 tegen 11 met commentaar · Euroborg · gratis';
