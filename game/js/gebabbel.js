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

  // --- ronde 39: meer gesprekken, ook van één regel voor een mompelende voorbijganger ---
  G('s-o3', 'stad', 'ochtend', null, ['Student', 'Mijn eerste college begint over tien minuten.'], ['Maat', 'En je fiets?'], ['Student', 'Die begint over tien minuten ook.']),
  G('s-m3', 'stad', 'middag', 'droog', ['Toerist', 'Is dit de Grote Markt?'], ['Inwoner', 'Dat zeggen de borden.'], ['Toerist', 'En waar is de rest van de markt?']),
  G('s-m4', 'stad', 'middag', null, ['Terrasgast', 'Moi, nog een bakkie?']),
  G('s-a3', 'stad', 'avond', 'droog', ['Student', 'Er is een borrel in het park.'], ['Maat', 'Er is altijd een borrel in het park.']),
  G('s-n3', 'stad', 'nacht', null, ['Uitgaander', 'Waar is mijn fiets?'], ['Vriend', 'Je kwam met de bus.'], ['Uitgaander', 'Dan ben ik de bus kwijt.']),
  G('s-r3', 'stad', null, 'regen', ['Voorbijganger', 'Het regent op mijn plannen.'], ['Maat', 'Dan heb je dus plannen.']),
  G('s-w3', 'stad', null, 'mist', ['Toerist', 'Waar is de toren gebleven?'], ['Inwoner', 'Die staat er. Hij doet alleen even mee met de mist.']),
  G('s-w4', 'stad', null, 'onweer', ['Student', 'Dat is geen onweer, dat is mijn buurman met zijn bas.']),

  G('h-o3', 'hogeland', 'ochtend', 'droog', ['Boer', 'Het gras staat er mooi bij.'], ['Buurman', 'Het gras staat er altijd mooi bij.'], ['Boer', 'Daarom zeg ik het.']),
  G('h-m3', 'hogeland', 'middag', null, ['Fietser', 'Waar is het volgende dorp?'], ['Boer', 'Zie je die toren?'], ['Fietser', 'Die zie ik al een uur.']),
  G('h-m4', 'hogeland', 'middag', 'droog', ['Wandelaar', 'Wat een uitzicht. Er is gewoon niets in de weg.']),
  G('h-a3', 'hogeland', 'avond', null, ['Boer', 'Er komt weer een mooie lucht aan.'], ['Maat', 'Wil je die ophalen of laten hangen?']),
  G('h-n2', 'hogeland', 'nacht', null, ['Boer', 'Hoor je dat? Niets.'], ['Maat', 'Dat noem ik nou rust.']),
  G('h-r2', 'hogeland', null, 'regen', ['Fietser', 'Waar schuil je hier?'], ['Boer', 'Bij mij, in de schuur.'], ['Fietser', 'Is daar een dak?']),
  G('h-w3', 'hogeland', null, 'mist', ['Boer', 'De koeien weten de weg. Ik volg ze maar.']),

  G('e-o2', 'eemsdelta', 'ochtend', null, ['Visser', 'Het was een goede nacht.'], ['Havenmeester', 'Voor de vissen of voor jou?']),
  G('e-m3', 'eemsdelta', 'middag', 'droog', ['Toerist', 'Zijn die kranen echt?'], ['Inwoner', 'Ze doen in elk geval hun best.']),
  G('e-m4', 'eemsdelta', 'middag', null, ['Fietser', 'Waar waait het naartoe?'], ['Havenarbeider', 'Altijd naar de zee. Behalve vandaag.']),
  G('e-a3', 'eemsdelta', 'avond', null, ['Schipper', 'Het licht is mooi op het water.'], ['Maat', 'Het licht is altijd mooi, het water is het probleem.']),
  G('e-n2', 'eemsdelta', 'nacht', null, ['Wachter', 'Elke nacht hetzelfde schip.'], ['Maat', 'Dat noem ik trouw.']),
  G('e-r2', 'eemsdelta', null, 'regen', ['Visser', 'Zeg maar niets, het regent al genoeg.']),

  G('w-o2', 'wadden', 'ochtend', null, ['Gids', 'We vertrekken als het water weg is.'], ['Wadloper', 'En als het terugkomt?'], ['Gids', 'Dan lopen we sneller.']),
  G('w-m3', 'wadden', 'middag', 'droog', ['Toerist', 'Is dit nou de zee?'], ['Schipper', 'Dit is de plek waar de zee zich verstopt.']),
  G('w-m4', 'wadden', 'middag', null, ['Strandwandelaar', 'Dat is een heel grote schelp.'], ['Kind', 'Dat is mijn schoen.']),
  G('w-a3', 'wadden', 'avond', null, ['Schipper', 'De laatste boot vertrekt.'], ['Toerist', 'Zonder mij?'], ['Schipper', 'Daar is hij inmiddels aan gewend.']),
  G('w-n2', 'wadden', 'nacht', null, ['Vuurtorenwachter', 'De lamp draait. Ik niet.']),
  G('w-r2', 'wadden', null, 'regen', ['Wandelaar', 'Natte voeten.'], ['Gids', 'Voor straks is dat een voordeel.']),
  G('w-w3', 'wadden', null, 'mist', ['Schipper', 'Ik vaar op de geur van zout.'], ['Maat', 'Dat ruikt overal naar.']),

  G('k-o2', 'westerkwartier', 'ochtend', null, ['Fruitteler', 'De appels zijn vroeg wakker.']),
  G('k-m3', 'westerkwartier', 'middag', 'droog', ['Fietser', 'Mooie route, hier.'], ['Boer', 'Die gaat ook nog ergens heen.']),
  G('k-a2', 'westerkwartier', 'avond', null, ['Buurvrouw', 'Heb je gehoord? De bakker heeft nieuwe bollen.'], ['Buurman', 'Dat hoorde ik al van de bakker.']),
  G('k-n2', 'westerkwartier', 'nacht', null, ['Boer', 'Het dorp is stil, alleen het klokje tikt.']),
  G('k-r2', 'westerkwartier', null, 'regen', ['Fietser', 'Dat is wel weer een bui.'], ['Boer', 'Niet zeuren, die appels drinken mee.']),
  G('k-w3', 'westerkwartier', null, 'mist', ['Boer', 'Ik zie mijn eigen koeien niet.'], ['Buurman', 'Dan zijn het jouw koeien niet.']),
  G('k-w4', 'westerkwartier', null, 'onweer', ['Fruitteler', 'Alles dicht, behalve de appels.']),

  G('o-o3', 'oldambt', 'ochtend', null, ['Boer', 'Het graan staat er al.'], ['Maat', 'Het graan staat er altijd, jij komt later.']),
  G('o-m3', 'oldambt', 'middag', null, ['Fietser', 'Hoe ver is Winschoten?'], ['Boer', 'Even rechtdoor en dan nog een stukje rechtdoor.']),
  G('o-a3', 'oldambt', 'avond', null, ['Dorpeling', 'De zon zakt achter de molen.'], ['Maat', 'Dat doet hij elke dag, hij is er goed in.']),
  G('o-n2', 'oldambt', 'nacht', null, ['Boer', 'Zie je die sterren?'], ['Maat', 'Ik zie vooral de koplamp van die trekker.']),
  G('o-r2', 'oldambt', null, 'regen', ['Boer', 'Ons graan zegt dank u.'], ['Fietser', 'Mijn jas zegt iets anders.']),
  G('o-w3', 'oldambt', null, 'mist', ['Fietser', 'Is dit de weg?'], ['Boer', 'Dit is de akker.'], ['Fietser', 'Dat verklaart de klei op mijn banden.']),
  G('o-w4', 'oldambt', null, 'onweer', ['Boer', 'De lucht is donker, de akkers stil.']),

  G('v-o2', 'veenkolonien', 'ochtend', null, ['Aardappelboer', 'De rooier staat klaar.'], ['Buurman', 'En de koffie?'], ['Aardappelboer', 'Die ook.']),
  G('v-m3', 'veenkolonien', 'middag', 'droog', ['Fietser', 'Is dit nou het kanaal?'], ['Inwoner', 'Dit is het kanaal. Dat andere ook.']),
  G('v-a3', 'veenkolonien', 'avond', null, ['Schipper', 'De brug gaat open.'], ['Wachter', 'Kom maar, we hebben tijd.']),
  G('v-n2', 'veenkolonien', 'nacht', null, ['Boer', 'Het is stil in de kolonie.'], ['Maat', 'Stil is een woord voor een goede nacht.']),
  G('v-r2', 'veenkolonien', null, 'regen', ['Aardappelboer', 'Eindelijk water voor de aardappelen.'], ['Maat', 'En voor mijn pet.']),
  G('v-w3', 'veenkolonien', null, 'mist', ['Schipper', 'Ik zie de brug niet.'], ['Brugwachter', 'Dat hoort ook zo. Hij komt vanzelf.']),
  G('v-w4', 'veenkolonien', null, 'onweer', ['Boer', 'Alles onder dak, de trekker ook.']),
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
// rng() in [0, 1). maxParties: 1 geeft alleen gesprekken met één spreker (een mompelende voorbijganger).
export function rollGebabbel(area, part, wet, rng = Math.random, recent = [], maxParties = 9) {
  const parties = (g) => new Set(g.lines.map((l) => l[0])).size;
  const pool = gebabbelFor(area, part, wet).filter((g) => parties(g) <= maxParties);
  if (!pool.length) return null;
  const fresh = pool.filter((g) => !recent.includes(g.id));
  let pick = fresh.length ? fresh : pool;
  const specific = pick.filter((g) => g.wet === wet && wet !== 'droog');
  if (specific.length && rng() < 0.6) pick = specific;
  return pick[Math.floor(rng() * pick.length) % pick.length];
}
