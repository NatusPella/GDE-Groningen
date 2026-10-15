// What is said at Minigames batch 1: the caddie at the disc golf course, the
// greenkeeper at pitch & putt, the skaters in the Stadspark and the baanwacht at
// the kart track, all as text bubbles (no recorded voice). Pure data.
export const DISC_LINES = {
  who: 'Wiebe',
  start: ['Moi! Negen manden, een briesje uit het westen. Gooi maar raak.', 'Kijk naar de vlag boven de mand. Daar moet hij heen.'],
  ace: ['ACE! Dat hoort heel de wijk vanavond.'],
  eagle: ['Eagle! Dat doet mijn knie goed.'],
  birdie: ['Birdie! Dat gooit lekker.', 'Onder par. Houd dat vast.'],
  par: ['Par. Netjes, niks aan te merken.'],
  bogey: ['Bogey. Volgende keer minder wind in je bocht.', 'Dat kan beter, maar de eenden vonden het mooi.'],
  worse: ['Au. Zo gaat het soms in het park.', 'Opgepakt. Op naar de volgende.'],
  water: ['Plons. Die haalt niemand meer terug.', 'De eenden bedanken je voor de disc.'],
  tree: ['Die boom stond er al voor jij kwam.', 'Boom wint, zoals altijd.'],
  rattle: ['Aan de ketting en eruit. Pijnlijk.'],
  windy: ['Wat een wind. Mik naar links, hij waait het wel recht.'],
  endGood: ['Mooie ronde. Zelfs de duiven klappen.'],
  endPoor: ['Volgende keer weer. Het park blijft liggen.'],
};

export const PUTT_LINES = {
  who: 'Jochem',
  start: ['Moi! Zes holes, korte grassprietjes. Let op het talud op de green.', 'Kijk naar de pijltjes op de green: daar loopt de bal naartoe.'],
  hole1: ['In één! Dat zie je hier niet vaak.'],
  birdie: ['Onder par, vakwerk.'],
  par: ['Par. Zo hoort het.'],
  bogey: ['Bijna. De green trekt naar links, vergeet dat niet.'],
  bunker: ['Zand. Dat blijft aan je schoenen plakken.'],
  rough: ['Naast de green. De hei is niet zacht.'],
  endGood: ['Mooie ronde. De greenkeeper is tevreden.'],
  endPoor: ['De holes lopen niet weg. Probeer het nog eens.'],
};

export const SKATE_LINES = {
  who: 'Luuk',
  start: ['Ollie met de spatie, flips met E en F, en draaien met A en D in de lucht.', 'De rail is vrij. Houd je balans met A en D.'],
  big: ['Hoog! Dat is een mooie lucht.', 'Dat ging zo de wolken in.'],
  combo: ['Combo! Houd hem vast.', 'Dat loopt als een trein.'],
  bail: ['Au, dat deed pijn.', 'Valt erbij. Opstaan en door.'],
  grind: ['Dat sist lekker op die rail.'],
  endGood: ['Wat een run. Je komt hier vaker, hè.'],
  endPoor: ['Het park loopt niet weg. Nog een run?'],
};

export const KART_LINES = {
  who: 'Wubbe',
  start: ['Welkom bij de kartbaan. Drie ronden, drie tegenstanders, geen ghosts.', 'Gas op de rechte stukken, handrem in de bochten.'],
  lights: ['Startlichten...'],
  go: ['Daar gaan ze!'],
  last: ['Laatste ronde!'],
  win: ['Eerste! Daar mag de vlag voor wapperen.'],
  podium: ['Podium! Dat kan er mee door.'],
  poor: ['Volgende keer beter. De bocht bleef gewoon staan.'],
  wall: ['De banden zijn zacht, maar wel van rubber.'],
  boost: ['Boost! Kijk die vonken.'],
};

export const KART_RIVALS = [
  { name: 'Jelmer', shirt: 0x3fa0d0, variant: 'male', age: 'young', kart: 0xe0452e, hit: ['Hé, kijk uit!', 'Rijbewijs gehaald in de supermarkt?'], hitBy: ['Sorry, mijn stuur trok.', 'Ruimte is gratis, hoor!'] },
  { name: 'Marlies', shirt: 0xe07ab0, variant: 'female', age: 'adult', kart: 0x2f6fd0, hit: ['Pas op voor mijn lak!', 'Eerst kijken, dan sturen!'], hitBy: ['Oeps!', 'Dat was jij die er stond.'] },
  { name: 'Hendrik', shirt: 0x6a5a48, variant: 'male', age: 'old', kart: 0x2fa04a, hit: ['Jongen, rustig aan.', 'In mijn tijd reden we netjes.'], hitBy: ['Zo hoort het.', 'Ha! Meters maken.'] },
];
