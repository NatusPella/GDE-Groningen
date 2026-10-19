// Opgevangen gebabbel per streek, tijd van de dag en weer (#190). Pure data en
// regels, Node-safe: regiolevenrt.js laat er af en toe een tekstkaartje van zien.
// Alleen tekst, geen stem. Alle sprekers zijn verzonnen en zonder naam; plaatsen
// mogen echt zijn. Gronings en Fries spaarzaam ("Grunn", nooit "de Grunn").
//
// Een regel is { id, area, part, wet, lines: [[spreker, tekst], ...] }:
//   area  stad | hogeland | eemsdelta | wadden | westerkwartier | oldambt | veenkolonien
//   part  ochtend | middag | avond | nacht, of null voor elk moment
//   wet   droog | regen | mist | onweer, of null voor elk weer
// Eén tot drie regels per gesprek; ondertitelen kan met de sprekerslabels.

export const AREAS = ['stad', 'hogeland', 'eemsdelta', 'wadden', 'westerkwartier', 'oldambt', 'veenkolonien'];
export const PARTS = ['ochtend', 'middag', 'avond', 'nacht'];
export const WETS = ['droog', 'regen', 'mist', 'onweer'];

export const AREA_NAMES = {
  stad: 'Grunn', hogeland: 'Hogeland', eemsdelta: 'Eemsdelta', wadden: 'Waddenkust',
  westerkwartier: 'Westerkwartier', oldambt: 'Oldambt', veenkolonien: 'Veenkoloniën',
};

const G = (id, area, part, wet, ...lines) => ({ id, area, part, wet, lines });

export const GEBABBEL = [
  // --- stad ---
  G('s-o1', 'stad', 'ochtend', null, ['Student', 'Is de fiets weg?'], ['Buurvrouw', 'Nee, die staat op je andere fiets.']),
  G('s-o2', 'stad', 'ochtend', 'droog', ['Bakker', 'Eerste krentenbollen zijn eruit.'], ['Klant', 'Dan ben ik dus op tijd.']),
  G('s-m1', 'stad', 'middag', null, ['Toerist', 'Welke toren is dit?'], ['Voorbijganger', 'De mooiste. De rest is ook goed.']),
  G('s-m2', 'stad', 'middag', 'droog', ['Terrasgast', 'Nog één kopje, het is te mooi om te gaan.']),
  G('s-a1', 'stad', 'avond', null, ['Fietser', 'Ik fiets gewoon nog een rondje.'], ['Maat', 'Dat zei je bij de vorige ook.']),
  G('s-a2', 'stad', 'avond', 'droog', ['Kok', 'Vanavond is het terras vol, let maar op.']),
  G('s-n1', 'stad', 'nacht', null, ['Uitgaander', 'Wie heeft mijn jas?'], ['Vriend', 'Jij draagt hem.']),
  G('s-n2', 'stad', 'nacht', null, ['Nachtbakker', 'Voor wie is die taart?'], ['Bezorger', 'Voor iemand die vandaag jarig is geweest.']),
  G('s-r1', 'stad', null, 'regen', ['Voorbijganger', 'Ik had een paraplu.'], ['Maat', 'Ik ook. Hij staat thuis.']),
  G('s-r2', 'stad', null, 'regen', ['Fietser', 'Dit is geen regen, dit is Grunn die nadenkt.']),
  G('s-w1', 'stad', null, 'onweer', ['Buurman', 'Hoor je dat? Daar hangt de toren in.'], ['Buurvrouw', 'Binnen blijven, die kat weet het ook al.']),
  G('s-w2', 'stad', null, 'mist', ['Fietser', 'Ik zie de Martinitoren niet.'], ['Maat', 'Die zie jij nooit, die is gewoon groot.']),

  // --- hogeland ---
  G('h-o1', 'hogeland', 'ochtend', null, ['Boer', 'De dijk is al wakker.'], ['Buurman', 'Wij zijn de dijk al voorbij.']),
  G('h-o2', 'hogeland', 'ochtend', 'droog', ['Fietser', 'Wind mee. Wie had dat gedacht.']),
  G('h-m1', 'hogeland', 'middag', null, ['Wandelaar', 'Hoe ver is het nog tot de volgende borg?'], ['Boer', 'Dat hangt van de wind af.']),
  G('h-m2', 'hogeland', 'middag', 'droog', ['Imker', 'De bijen hebben vandaag overwerk.']),
  G('h-a1', 'hogeland', 'avond', null, ['Boer', 'Het wordt een mooie avond.'], ['Vrouw', 'Dat zeg je elke avond.']),
  G('h-a2', 'hogeland', 'avond', 'droog', ['Schaapherder', 'Zon zakt, schapen blijven. Zo hoort het.']),
  G('h-n1', 'hogeland', 'nacht', null, ['Sterrenkijker', 'Hier zie je ze nog allemaal.'], ['Maat', 'Behalve de koe in de weg.']),
  G('h-r1', 'hogeland', null, 'regen', ['Boer', 'Eindelijk regen voor de bieten.'], ['Buurman', 'Nu nog even voor mijn jas.']),
  G('h-w1', 'hogeland', null, 'mist', ['Fietser', 'Ik fiets al een uur op een dijk die ik niet zie.']),
  G('h-w2', 'hogeland', null, 'onweer', ['Boer', 'Zo hoog en open, dat is me te spannend.']),

  // --- eemsdelta ---
  G('e-o1', 'eemsdelta', 'ochtend', null, ['Havenmeester', 'Het schip vaart vandaag weer netjes uit.'], ['Visser', 'Dat zeg je ook als het naar links vaart.']),
  G('e-m1', 'eemsdelta', 'middag', null, ['Toerist', 'Waarom hangen die keukens zo?'], ['Inwoner', 'Omdat ze daar mooi bij licht hangen.']),
  G('e-m2', 'eemsdelta', 'middag', 'droog', ['Kraamhouder', 'Verse vis, nog van vanochtend.']),
  G('e-a1', 'eemsdelta', 'avond', null, ['Visser', 'Morgen wordt het mooi weer.'], ['Maat', 'Dat zeg je elke avond.']),
  G('e-a2', 'eemsdelta', 'avond', 'droog', ['Havenarbeider', 'Het draaiorgel speelt weer. Dat is het sein.']),
  G('e-n1', 'eemsdelta', 'nacht', null, ['Wachter', 'Het water ligt stil. Het is te mooi om te geloven.']),
  G('e-r1', 'eemsdelta', null, 'regen', ['Schipper', 'Regen op het water. Die twee kennen elkaar.']),
  G('e-w1', 'eemsdelta', null, 'mist', ['Schipper', 'Ik vaar op gehoor vandaag.'], ['Maat', 'Dan zing je maar.']),
  G('e-w2', 'eemsdelta', null, 'onweer', ['Havenmeester', 'Alle schepen vast. Ook die van mij.']),

  // --- wadden ---
  G('w-o1', 'wadden', 'ochtend', null, ['Wadloper', 'Het water is al weg.'], ['Gids', 'Het komt zo weer terug. Dat doet het altijd.']),
  G('w-m1', 'wadden', 'middag', null, ['Vogelaar', 'Kijk, kluten. Drie.'], ['Maat', 'Ik zie er één, maar ik geloof je.']),
  G('w-m2', 'wadden', 'middag', 'droog', ['Strandwacht', 'Zwemmen mag, maar kijk wel de getijden.']),
  G('w-a1', 'wadden', 'avond', null, ['Wandelaar', 'Hoor je de zeehonden zingen?'], ['Maat', 'Ik hoor wind.']),
  G('w-n1', 'wadden', 'nacht', null, ['Wachter', 'De sterren hangen hier lager dan elders.']),
  G('w-r1', 'wadden', null, 'regen', ['Wadloper', 'Natter dan dit kan het hier niet worden.'], ['Gids', 'Ik zeg niks. Dat zeg je zelf al.']),
  G('w-w1', 'wadden', null, 'mist', ['Gids', 'In de mist lopen we niet. Dat staat in mijn eerste les.']),
  G('w-w2', 'wadden', null, 'onweer', ['Strandwacht', 'Uit het water, nu. Niet over twee minuten.']),

  // --- westerkwartier ---
  G('k-o1', 'westerkwartier', 'ochtend', null, ['Paardenmeisje', 'Hij wil niet naar buiten vandaag.'], ['Moeder', 'Hij is een paard. Hij staat al buiten.']),
  G('k-m1', 'westerkwartier', 'middag', null, ['Wandelaar', 'Is dit het bos of de weg?'], ['Boswachter', 'Ja.']),
  G('k-m2', 'westerkwartier', 'middag', 'droog', ['Fietser', 'Wat een prachtig landschap.'], ['Maat', 'Dan moet je kijken, niet praten.']),
  G('k-a1', 'westerkwartier', 'avond', null, ['Koetsier', 'Rustig, jongen. Het is nog niet bedtijd.']),
  G('k-n1', 'westerkwartier', 'nacht', null, ['Uilenkijker', 'Hoor je hem? Daar, links.'], ['Maat', 'Dat was mijn maag.']),
  G('k-r1', 'westerkwartier', null, 'regen', ['Boswachter', 'Goed voor het bos, slecht voor mijn schoenen.']),
  G('k-w1', 'westerkwartier', null, 'mist', ['Wandelaar', 'De bomen komen uit het niets.'], ['Boswachter', 'Ze waren er al.']),
  G('k-w2', 'westerkwartier', null, 'onweer', ['Boswachter', 'Weg bij de grote bomen. Dat weet ieder kind.']),

  // --- oldambt ---
  G('o-o1', 'oldambt', 'ochtend', null, ['Bakker', 'Het brood is nog warm.'], ['Klant', 'Dan neem ik het langzaam mee.']),
  G('o-m1', 'oldambt', 'middag', null, ['Molenaar', 'Windkracht drie. Prima dag voor niks.']),
  G('o-m2', 'oldambt', 'middag', 'droog', ['Boer', 'Het graan staat te wiegen.'], ['Buurman', 'Het graan staat te showen.']),
  G('o-a1', 'oldambt', 'avond', null, ['Boer', 'Kijk eens naar die lucht.'], ['Vrouw', 'Dat doe ik al een uur.']),
  G('o-n1', 'oldambt', 'nacht', null, ['Wachter', 'Zelfs de wieken slapen nu.']),
  G('o-r1', 'oldambt', null, 'regen', ['Boer', 'Dit is goed voor de tarwe.'], ['Buurman', 'Het is niet goed voor mijn hoed.']),
  G('o-w1', 'oldambt', null, 'mist', ['Molenaar', 'De wieken draaien, maar ik zie ze niet.']),
  G('o-w2', 'oldambt', null, 'onweer', ['Boer', 'Alles naar binnen. Ook de kippen.']),

  // --- veenkolonien ---
  G('v-o1', 'veenkolonien', 'ochtend', null, ['Schipper', 'Het diep is nog stil.'], ['Maat', 'Zo blijven we het houden.']),
  G('v-m1', 'veenkolonien', 'middag', null, ['Boer', 'Aardappelen, aardappelen, aardappelen.'], ['Buurman', 'Wil je ook nog iets anders zeggen?']),
  G('v-m2', 'veenkolonien', 'middag', 'droog', ['Fietser', 'Kaarsrecht, zo ver als je kijkt.']),
  G('v-a1', 'veenkolonien', 'avond', null, ['Schipper', 'Thee op het dek, zon in de rug.']),
  G('v-n1', 'veenkolonien', 'nacht', null, ['Wachter', 'Het veen vergeet niks. Het zegt het alleen niet.']),
  G('v-r1', 'veenkolonien', null, 'regen', ['Boer', 'Het veld drinkt, wij kijken toe.']),
  G('v-w1', 'veenkolonien', null, 'mist', ['Schipper', 'Mist op het diep. Ik vaar op het gevoel.'], ['Maat', 'Dat is ook je enige.']),
  G('v-w2', 'veenkolonien', null, 'onweer', ['Boer', 'Dit komt van ver. Dat zie je aan de lucht.']),
  // --- langere gesprekken (#190): drie regels, een kleine wending ---
  G('s-x1', 'stad', 'middag', null, ['Toerist', 'Waar is de Vismarkt?'], ['Student', 'Daar, maar de vis is al weg.'], ['Toerist', 'Wat staat er dan?']),
  G('s-x2', 'stad', 'avond', 'droog', ['Fietser', 'Mijn slot is kapot.'], ['Maat', 'Dan zet je hem tegen de brug.'], ['Fietser', 'Dat deed ik gisteren. Hij is nu van de brug.']),
  G('h-x1', 'hogeland', 'middag', null, ['Boer', 'Zie je die wolk?'], ['Buurman', 'Die komt hier nooit.'], ['Boer', 'Nee, hij blijft gewoon staan.']),
  G('h-x2', 'hogeland', 'ochtend', null, ['Wandelaar', 'Is dit het pad naar de kerk?'], ['Schaapherder', 'Alles is het pad naar de kerk, als je lang genoeg loopt.'], ['Wandelaar', 'Dat is niet erg geruststellend.']),
  G('e-x1', 'eemsdelta', 'middag', null, ['Havenarbeider', 'Dat schip is groter dan gisteren.'], ['Kraamhouder', 'Dat is hetzelfde schip.'], ['Havenarbeider', 'Dan is de haven kleiner.']),
  G('e-x2', 'eemsdelta', 'avond', null, ['Visser', 'Wat voor weer wordt het?'], ['Maat', 'Nat.'], ['Visser', 'Dat zei je gisteren ook.']),
  G('w-x1', 'wadden', 'middag', null, ['Wadloper', 'Is het al eb?'], ['Gids', 'Nog niet.'], ['Wadloper', 'Waarom staat mijn schoen dan al vol?']),
  G('w-x2', 'wadden', 'avond', 'droog', ['Toerist', 'Wanneer vaart de laatste boot?'], ['Schipper', 'Als hij vol is.'], ['Toerist', 'En als hij niet vol raakt?']),
  G('k-x1', 'westerkwartier', 'middag', null, ['Fruitteler', 'Deze appels zijn mooi dit jaar.'], ['Klant', 'Ze zijn nog groen.'], ['Fruitteler', 'Dat is hun kleur, dat noemen we mooi.']),
  G('k-x2', 'westerkwartier', 'avond', null, ['Fietser', 'Waar gaat dit fietspad heen?'], ['Boer', 'Naar de volgende bocht.'], ['Fietser', 'En daarna?']),
  G('o-x1', 'oldambt', 'middag', null, ['Boer', 'Kijk, de graanvelden golven.'], ['Fietser', 'Ik dacht dat dat de wind was.'], ['Boer', 'Wind en graan hebben afspraken.']),
  G('o-x2', 'oldambt', 'ochtend', null, ['Bakker', 'Eén brood of twee?'], ['Klant', 'Eén.'], ['Bakker', 'Je komt toch terug, neem er twee.']),
  G('v-x1', 'veenkolonien', 'middag', null, ['Kanaalbewoner', 'Dat is de Hoofdvaart.'], ['Toerist', 'Waar is dan de rest van de vaart?'], ['Kanaalbewoner', 'Die is hier, je kijkt er al uren naar.']),
  G('v-x2', 'veenkolonien', 'avond', null, ['Aardappelboer', 'De oogst is goed.'], ['Buurman', 'Hoe goed?'], ['Aardappelboer', 'Zo goed dat ik moe ben van het vertellen.']),
];

// --- daypart, weather and area -------------------------------------------------------------
export function partOf(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6 && h < 12) return 'ochtend';
  if (h >= 12 && h < 18) return 'middag';
  if (h >= 18 && h < 23) return 'avond';
  return 'nacht';
}

// kind: de soort van weatherstate.js (helder, bewolkt, mist, motregen, regenbui, onweer)
export function wetOf(kind) {
  if (kind === 'mist') return 'mist';
  if (kind === 'onweer') return 'onweer';
  if (kind === 'motregen' || kind === 'regenbui') return 'regen';
  return 'droog';
}

// streekId uit regioleven.js (of null); y noordwaarts negatief, de eilanden en de Waddenzee
// liggen ver in het noorden.
export function areaOf(streekId, y = 0) {
  if (Number.isFinite(y) && y < -24000) return 'wadden';
  return AREAS.includes(streekId) ? streekId : 'stad';
}

export function gebabbelFor(area, part, wet) {
  return GEBABBEL.filter((g) => g.area === area && (g.part === null || g.part === part) && (g.wet === null || g.wet === wet));
}

// Eén gesprek: weer en tijd van de dag eerst (specifiek wint), nooit er één uit `recent` (ids) als er keus is.
// rng() in [0, 1).
export function rollGebabbel(area, part, wet, rng = Math.random, recent = []) {
  const pool = gebabbelFor(area, part, wet);
  if (!pool.length) return null;
  const fresh = pool.filter((g) => !recent.includes(g.id));
  let pick = fresh.length ? fresh : pool;
  const specific = pick.filter((g) => g.wet === wet && wet !== 'droog');
  if (specific.length && rng() < 0.6) pick = specific;
  return pick[Math.floor(rng() * pick.length) % pick.length];
}
