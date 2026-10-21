// Steden in de provincie (#67): Delfzijl, Appingedam, Veendam, Winschoten,
// Hoogezand-Sappemeer, Leek en Uithuizen as data. Per stad: waar ze ligt, een
// regel voor onder de plaatsnaam, de straten die je er herkent, de sfeer per
// dagdeel, de props die erbij horen en de winkels (verzonnen namen). The
// real streets and buildings are real places (allowed); every shop, person
// and company is made up. Pure and Node-safe: the tile layer draws the
// roads, this names and dresses them (docs/PROVINCIE-PLAN.md).
import { wgsToWorld } from './rdnew.js';

// Prop kinds are keys for the prop builders; per: how many per square km of the
// built-up area, a hint for the placer, not a promise of what is on screen.
export const TOWN_PROFILES = [
  {
    id: 'delfzijl', name: 'Delfzijl', at: [53.3313, 6.9186], reach: 1800, kind: 'haven',
    teaser: 'Haven, zeedijk en schoorstenen. Het Chemiepark bromt altijd een beetje mee.',
    streets: ['Handelskade Oost', 'Molenberg', 'Marktstraat', 'Damsterdiep', 'Stationsweg'],
    sfeer: {
      ochtend: ['Een scheepshoorn in de verte. De haven is al uren wakker.', 'Het ruikt naar zout en motorolie. Dat is hier een goed teken.'],
      middag: ['Op de Zeedijk staan mensen naar de schepen te kijken alsof het televisie is.', 'Een vrachtwagen met een lading die niemand benoemt, rijdt langzaam voorbij.'],
      avond: ['De schoorstenen aan de overkant branden oranje tegen de lucht.', 'Op het Molenberg-terras klinkt een accordeon, maar net niet in de maat.'],
    },
    props: [{ kind: 'bolder', per: 14 }, { kind: 'container', per: 6 }, { kind: 'vuurtoren', per: 0.5 }, { kind: 'vlaggenmast', per: 3 }],
    shops: [
      { kind: 'garage', name: 'Garage Zoutkant', line: 'Een lekke band door de scheepsspijkers? Hier plakken ze alles, ook je geduld.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Roestbak', line: 'Achter de containers is een luik. Niemand kijkt hier naar containers.' },
      { kind: 'bijbaan', name: 'Bijbaan: bolderen op de kade', line: 'Kapitein Slaaplap zoekt iemand die touwen vastknoopt. Betaling in koffie en een dikke euro.' },
      { kind: 'racebord', name: 'Startbord Havenrace', line: 'Van de Handelskade Oost naar de Marktstraat. De bolders tellen niet als bocht.' },
      { kind: 'bakker', name: 'Bakkerij De Kielzog', line: 'Een krentenbol voor onderweg? Dan haal je de boot nog.' },
      { kind: 'viskraam', name: 'Visboer Kuttergat', line: 'Vers van de steiger, dat zegt hij elke dag.' },
      { kind: 'cafe', name: 'Café De Zoute Steiger', line: 'Bij het raam zit de kapitein die nooit vaart.' },
    ],
  },
  {
    id: 'appingedam', name: 'Appingedam', at: [53.3226, 6.8588], reach: 1500, kind: 'gracht',
    teaser: 'Hangende keukens boven het Damsterdiep. Hier mag je gewoon even kijken in andermans achtertuin.',
    streets: ['Wijkstraat', 'Dijkstraat', 'Damsterdiep', 'Farmsumerweg', 'Burgemeester Klauckelaan'],
    sfeer: {
      ochtend: ['Boven het Damsterdiep klinkt een koffiezetapparaat. Dat is een hangende keuken die opstaat.', 'De brug gaat open voor één bootje. Zeven fietsers wachten gelaten.'],
      middag: ['Op de Wijkstraat is het druk, behalve bij de winkel die gesloten is voor de middag.', 'Een toerist maakt een foto van een keuken. De keuken maakt er een terug.'],
      avond: ['De lichtjes spiegelen in het diep. Het is hier opeens heel romantisch.', 'Een eend loopt over de brug alsof ze de gemeente is.'],
    },
    props: [{ kind: 'brug', per: 2 }, { kind: 'bloembak', per: 12 }, { kind: 'fietsenrek', per: 8 }, { kind: 'wasdraad', per: 3 }],
    shops: [
      { kind: 'garage', name: 'Garage De Hangende Moer', line: 'Alles wat hier kapot gaat, hangt eerst even in de lucht.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Keukenkast', line: 'Achter een hangende keuken is een kamertje. Zeg maar dat je de kok bent.' },
      { kind: 'bijbaan', name: 'Bijbaan: brugwachter', line: 'De brug moet open voor één bootje. Wil jij het knopje indrukken?' },
      { kind: 'racebord', name: 'Startbord Dijkrace', line: 'Van de Wijkstraat naar de Dijkstraat. De brug staat open als je pech hebt.' },
      { kind: 'bakker', name: 'Banketbakker De Hangende Taart', line: 'Alles wat hier wordt gebakken, hangt even boven het water.' },
      { kind: 'cadeau', name: 'Cadeauwinkel Ooievaarsnest', line: 'Voor wie de keuken niet kan meenemen.' },
      { kind: 'cafe', name: 'Eetcafé Diepe Gedachten', line: 'De soep van de dag staat op het krijtbord. Of was dat gisteren?' },
    ],
  },
  {
    id: 'veendam', name: 'Veendam', at: [53.1058, 6.8756], reach: 2000, kind: 'veen',
    teaser: 'Lange diepen, rechte wegen en schippers uit het veen. Alles ligt hier in een lijn.',
    streets: ['Beneden Oosterdiep', 'Boven Oosterdiep', 'Boven Westerdiep', 'Kerkstraat', 'Julianalaan'],
    sfeer: {
      ochtend: ['Over het Winschoterdiep ligt een lage mist, het licht komt er recht doorheen.', 'Een trekker met een kar vol aardappelen tuft over de brug.'],
      middag: ['De winkelstraat is vol: de Veenkoloniën doen hier de boodschappen.', 'Iemand legt uit hoe het veen is afgegraven. Iedereen knikt, niemand luistert.'],
      avond: ['Langs het diep zitten mensen op een bank, met het water als televisie.', 'In de verte brandt een lamp op een zeilschip dat nergens heen gaat.'],
    },
    props: [{ kind: 'schuit', per: 3 }, { kind: 'aardappelkist', per: 5 }, { kind: 'brug', per: 1.5 }, { kind: 'bank', per: 6 }],
    shops: [
      { kind: 'garage', name: 'Garage Turfsteker', line: 'Hier sleutelen ze al sinds de tijd van de turfschepen.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Kolonist', line: 'Onder de scheepsbrug is een nis. Het veen houdt geheimen goed.' },
      { kind: 'bijbaan', name: 'Bijbaan: schippersknecht', line: 'Aan het Winschoterdiep zoeken ze iemand voor de touwen. Lange dagen, mooie uitzichten.' },
      { kind: 'racebord', name: 'Startbord Kanaalrace', line: 'Langs het diep, zo recht dat je je stuur kunt vergeten.' },
      { kind: 'bakker', name: 'Bakkerij Het Veenbrood', line: 'Zwaar brood, goed voor de maag en voor het geweten.' },
      { kind: 'markt', name: 'Aardappelhuisje Stoofpeer', line: 'Je kunt de aardappel bij naam vragen. Hij kent er achttien.' },
      { kind: 'cafe', name: 'Café De Lange Diep', line: 'Hier zit het verhaal, de bar is maar bijzaak.' },
    ],
  },
  {
    id: 'winschoten', name: 'Winschoten', at: [53.1444, 7.0356], reach: 2000, kind: 'graan',
    teaser: 'Molens op de wal, graan tot aan de horizon. De kermis houdt hier van een goede wind.',
    streets: ['Torenstraat', 'Langestraat', 'Marktstraat', 'Stationsstraat', 'Molenweg'],
    sfeer: {
      ochtend: ['De molen draait traag. Het graan daarachter beweegt mee, een golf van goud.', 'Een bakker zet zijn bord buiten. Hij is er klaar voor.'],
      middag: ['Op de markt hangt een geur van gebakken vis en suikerspinnen.', 'Een tractor komt de stad in. Niemand kijkt op, dit is gewoon dinsdag.'],
      avond: ['Boven het park hangt een roze lucht. Mensen zeggen mooi zonder te praten.', 'Ergens wordt gelachen om een grap die al drie jaar rondgaat.'],
    },
    props: [{ kind: 'molen', per: 0.4 }, { kind: 'graanbaal', per: 6 }, { kind: 'bank', per: 6 }, { kind: 'vlaggenmast', per: 2 }],
    shops: [
      { kind: 'garage', name: 'Garage Pekelhoofd', line: 'Pekela-pech? Ze hebben een mouw vol trucs.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Molenzolder', line: 'Boven in de molen is een zolder. Het geluid van de wieken dekt alles.' },
      { kind: 'bijbaan', name: 'Bijbaan: molenaarshulp', line: 'De molenaar zoekt iemand voor het zakkendragen. Meel in je haar, geld in je zak.' },
      { kind: 'racebord', name: 'Startbord Molenrace', line: 'Van de Stationsstraat naar de Molen. Je krijgt het vanzelf warm.' },
      { kind: 'bakker', name: 'Graanbakkerij De Volle Aar', line: 'Brood van het land hiernaast, zo vers als het kan.' },
      { kind: 'kermis', name: 'Zweefmolen De Oldambtster', line: 'Honderd rondjes voor een tientje. Je maag mag zelf kiezen.' },
      { kind: 'cafe', name: 'Brasserie Het Windstille Hoekje', line: 'De terrasstoelen staan altijd op de wind.' },
    ],
  },
  {
    id: 'hoogezand', name: 'Hoogezand-Sappemeer', at: [53.1612, 6.77], reach: 2400, kind: 'diep',
    teaser: 'Twee dorpen aan één diep. Wie zegt waar de ene ophoudt, mag het aan de bank vertellen.',
    streets: ['Hoofdstraat', 'Kerkstraat', 'Noorderstraat', 'Winschoterdiep', 'Meint Veningastraat'],
    sfeer: {
      ochtend: ['Schippers groeten elkaar niet, ze knikken hooguit.', 'Een bus stopt, niemand stapt uit. De bus gaat toch maar weer.'],
      middag: ['Aan het Winschoterdiep staat een rij mensen te wachten op een brug die nog even dicht blijft.', 'Het winkelcentrum is vol. De parkeerplaats is een legende.'],
      avond: ['De lichtjes van de fabriek spiegelen in het diep, er klinkt een zacht gebrom.', 'Een jongen oefent op de trompet. Hij is niet slecht, maar ook niet goed.'],
    },
    props: [{ kind: 'brug', per: 1.5 }, { kind: 'bolder', per: 6 }, { kind: 'fietsenrek', per: 7 }, { kind: 'bank', per: 5 }],
    shops: [
      { kind: 'garage', name: 'Garage Kanaalkroes', line: 'Een lange stad vraagt een lange sleepkabel. Die hebben ze.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Schippersbeurs', line: 'In de kelder van de beurs zijn de oude kluisjes nog vol rommel.' },
      { kind: 'bijbaan', name: 'Bijbaan: bruggenwachter', line: 'Er zijn veel bruggen en weinig wachters. Jij hoeft maar één knop.' },
      { kind: 'racebord', name: 'Startbord Kanaalrace', line: 'Langs het Winschoterdiep van brug tot brug. Eén rode brug telt dubbel.' },
      { kind: 'bakker', name: 'Bakker Twee Dorpen', line: 'Tompouce met één of twee glazuurlagen: ga ze zoeken.' },
      { kind: 'sport', name: 'Sporthuis De Zwarte Piste', line: 'Voor wie wil hardlopen, maar liever eerst kijkt.' },
      { kind: 'cafe', name: 'Café De Dubbele Naam', line: 'Er hangt een bord: Hier is het Hoogezand. Of Sappemeer.' },
    ],
  },
  {
    id: 'leek', name: 'Leek', at: [53.1639, 6.3764], reach: 1600, kind: 'park',
    teaser: 'Het kasteelpark van Nienoord ligt om de hoek. Hier gaat alles een tikje rustiger.',
    streets: ['Hoofdstraat', 'Nienoord', 'Tolberterstraat', 'Midwolderweg', 'Oldebertweg'],
    sfeer: {
      ochtend: ['Het is stil in het park. Een koets staat te wachten alsof hij net is gekomen.', 'Een fietser zingt zacht en denkt dat niemand het hoort.'],
      middag: ['Op de Hoofdstraat is het rustig. Een hond ligt midden op het zebrapad en heeft gelijk.', 'Bij de bakker staat de rij tot buiten: er is net iets vers uit de oven.'],
      avond: ['De koetsen zijn gestald. De paarden snuiven in de schemer.', 'Een schaduw glijdt over het gras. Het is een hert. Of een jongen met een hond.'],
    },
    props: [{ kind: 'koets', per: 0.5 }, { kind: 'boom', per: 20 }, { kind: 'bank', per: 6 }, { kind: 'bloembak', per: 8 }],
    shops: [
      { kind: 'garage', name: 'Garage De Kasteeltuin', line: 'Rustig sleutelen naast het slot. Geen haast, het gras groeit toch langzamer.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Parkschuur', line: 'Een tuinhuis achter de heg. Niemand ziet het, behalve de pauw.' },
      { kind: 'bijbaan', name: 'Bijbaan: parktuinman', line: 'De hovenier zoekt iemand voor het gras. De pauwen controleren je werk.' },
      { kind: 'racebord', name: 'Startbord Parkrace', line: 'Een rondje door het park, langs de bomen. Pauwen hebben voorrang.' },
      { kind: 'bakker', name: 'Banketbakkerij Het Kasteeltje', line: 'Taart voor een koets of voor een stoeltje op het gras.' },
      { kind: 'cadeau', name: 'Rijtuig & Co', line: 'Souvenirs in de vorm van een wiel.' },
      { kind: 'cafe', name: 'Theehuis De Paardenstal', line: 'Thee in een kopje dat ouder is dan jij.' },
    ],
  },
  {
    id: 'uithuizen', name: 'Uithuizen', at: [53.4097, 6.6753], reach: 1400, kind: 'borg',
    teaser: 'Een borg met een gracht, een dijk met uitzicht. Het Hogeland op zijn best.',
    streets: ['Menkemaweg', 'Kerkplein', 'Hoofdstraat-West', 'Departementsstraat', 'Ripperdadrift'],
    sfeer: {
      ochtend: ['De wind staat recht van de zee. Je hoort de dijk bijna denken.', 'Een tractor rijdt de akker op. De ganzen vinden het goed.'],
      middag: ['Bij de borg lopen schoolklassen langs de gracht. De gids vertelt bijna alles goed.', 'Op de dijk staat een bankje met de mooiste achterkant van Nederland.'],
      avond: ['De lampjes in de tuin gaan aan. Het ruikt naar gras en zout.', 'Ver weg kraait een haan. Het is half acht, het is een late haan.'],
    },
    props: [{ kind: 'gracht', per: 1 }, { kind: 'schaap', per: 15 }, { kind: 'windmolen', per: 0.3 }, { kind: 'bank', per: 5 }],
    shops: [
      { kind: 'garage', name: 'Garage Borgsteen', line: 'De sleutelaar woont achter de borg en wil niets liever dan jouw kleppen zien.' },
      { kind: 'schuilplaats', name: 'Schuilplaats Achter de Gracht', line: 'Een brugje, een schuurtje en een eend die niets zegt.' },
      { kind: 'bijbaan', name: 'Bijbaan: borgwachter', line: 'Kasteelheer Zwaardvis zoekt iemand om de poort te bewaken. Kan een saaie dag worden.' },
      { kind: 'racebord', name: 'Startbord Kleiweg-race', line: 'Over de klei, tussen de akkers door. Wie in de sloot belandt, verliest.' },
      { kind: 'bakker', name: 'Bakker De Kleine Borg', line: 'Het brood is groot, het winkeltje is klein.' },
      { kind: 'markt', name: 'Boerderijwinkel Zoute Klei', line: 'Eieren, kaas en een mening over het weer.' },
      { kind: 'cafe', name: 'Dorpscafé De Zeedijk', line: 'Bij het raam zit de gids van gisteren, hij oefent.' },
    ],
  },
  {
    id: 'stadskanaal', name: 'Stadskanaal', at: [52.9885, 6.9505], reach: 2000, kind: 'kanaal',
    teaser: 'Kilometers kanaal en bruggen die telkens net opengaan. In Westerwolde kom je altijd aan, maar nooit snel.',
    streets: ['Hoofdstraat', 'Julianastraat', 'Maarsdreef', 'Buinerweg', 'Krommewijk'],
    sfeer: {
      ochtend: ['Op het kanaal ligt een dunne laag mist. Een platbodem glijdt erdoorheen zonder geluid.', 'De brugwachter zet zijn koffie neer en kijkt of er iets aankomt. Dat is er niet.'],
      middag: ['Op de Hoofdstraat zijn de terrassen vol. Een fietsbel klinkt boven alles uit.', 'Een stuurman zwaait naar een auto. De auto zwaait terug, uit beleefdheid.'],
      avond: ['Langs het kanaal gaan de lantaarns aan, één voor één, als dominostenen.', 'Een bootje met lampjes vaart langzaam voorbij. Er staat niemand aan boord.'],
    },
    props: [{ kind: 'brug', per: 2 }, { kind: 'bolder', per: 6 }, { kind: 'fietsenrek', per: 7 }, { kind: 'bank', per: 6 }],
    shops: [
      { kind: 'garage', name: 'Garage Kanaalmoer', line: 'Een recht kanaal, een rechte rekening. Dat is hun belofte.' },
      { kind: 'schuilplaats', name: 'Schuilplaats Achter de Kade', line: 'In de loods staan oude boten. Eentje heeft een geheim luik.' },
      { kind: 'bijbaan', name: 'Bijbaan: brugdraaier', line: 'Draai de brug open voor de boot en weer dicht voor de fiets.' },
      { kind: 'racebord', name: 'Startbord Kanaalrace', line: 'Langs het Stadskanaal, van brug naar brug. De wind staat tegen.' },
      { kind: 'bakker', name: 'Bakkerij Lange Wijk', line: 'Het brood is net zo rechtdoor als het kanaal.' },
      { kind: 'cadeau', name: 'Kanaalkado Hoge Brug', line: 'Voor wie de brug wil meenemen. Past niet in de tas.' },
      { kind: 'cafe', name: 'Café De Bakboord', line: 'Hier hangt een stuurwiel dat nergens aan vastzit.' },
    ],
  },
  {
    id: 'zoutkamp', name: 'Zoutkamp', at: [53.33696, 6.30114], reach: 1200, kind: 'haven',
    teaser: 'Kotters, garnalen en de dijk naar het Lauwersmeer. Het ruikt hier altijd naar zout, ook in de koffie.',
    streets: ['Reitdiepskade', 'Dorpsstraat', 'Strandweg', 'Hunsingokanaal', 'Beatrixstraat'],
    sfeer: {
      ochtend: ['Op de kade worden garnalen gepeld. Er zingt iemand, verder is het stil.', 'Een kotter vaart uit. De meeuwen rekenen op een goed ontbijt.'],
      middag: ['Op het terras is het druk, vooral met mensen die naar de kotters kijken.', 'Een kind probeert een garnaal te leiden naar het water. De garnaal heeft andere plannen.'],
      avond: ['De haven kleurt oranje. De boten gaan zachtjes op en neer, als een slaaplied.', 'Aan de kade klinkt een mondharmonica. Hij is een beetje te laat voor de hoofdact.'],
    },
    props: [{ kind: 'visnet', per: 6 }, { kind: 'bolder', per: 12 }, { kind: 'kotter', per: 3 }, { kind: 'bank', per: 4 }],
    shops: [
      { kind: 'garage', name: 'Garage Garnaalschaaf', line: 'Van zoute kou tot roest: ze snappen het hier.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Vissersloods', line: 'Tussen de netten is een hoekje. Het ruikt er naar garnalen, dus niemand blijft hangen.' },
      { kind: 'bijbaan', name: 'Bijbaan: garnalen pellen', line: 'De pellerij zoekt snelle vingers. Je ruikt het uren later nog.' },
      { kind: 'racebord', name: 'Startbord Dijkrace', line: 'Over de zeedijk, met de wind in de rug. Wie remt, wordt een schaap.' },
      { kind: 'viskraam', name: 'Garnalenhuis De Pelder', line: 'Vers gepeld, vers gezegd.' },
      { kind: 'bakker', name: 'Bakkerij Zoute Lucht', line: 'Een broodje met zeezout, voor wie niet genoeg kreeg.' },
      { kind: 'cafe', name: 'Café De Reitdiepskade', line: 'Aan de bar zit de kapitein van de kotter die nooit aanmeert.' },
    ],
  },
  {
    id: 'winsum', name: 'Winsum', at: [53.3315, 6.517], reach: 1400, kind: 'wierde',
    teaser: 'Een molen, een diep en een wierde met uitzicht. In Hunsingo ziet elk dorp er een tikje trots uit.',
    streets: ['Wierdaweg', 'Winsumerdiep', 'Borgweg', 'Munsterweg', 'Provincialeweg'],
    sfeer: {
      ochtend: ['De molen draait rustig. Het diep ligt er glad bij, een eend bepaalt de koers.', 'Een boer rijdt op de trekker voorbij en zwaait. Zijn hond zit voorop.'],
      middag: ['Op de wierde zit een groepje te picknicken. Het uitzicht is beter dan het eten.', 'De winkelstraat is rustig. De bakker staat in de deur en kijkt naar de lucht.'],
      avond: ['De avondzon valt schuin over de klei. Alles wordt goudkleurig, ook de koeien.', 'Op het bankje bij het diep zit iemand die niets doet en dat uitstekend vindt.'],
    },
    props: [{ kind: 'molen', per: 0.5 }, { kind: 'bank', per: 6 }, { kind: 'schaap', per: 8 }, { kind: 'bloembak', per: 8 }],
    shops: [
      { kind: 'garage', name: 'Garage Wierdevoet', line: 'Een wierde, een garage en een toeter die altijd net niet werkt.' },
      { kind: 'schuilplaats', name: 'Schuilplaats De Wierdekerk', line: 'Achter het orgel is een luik. Koster Klok weet van niks.' },
      { kind: 'bijbaan', name: 'Bijbaan: kosterhulp', line: 'De koster zoekt iemand om de klokken te luiden. Draag oordoppen.' },
      { kind: 'racebord', name: 'Startbord Wierderace', line: 'Rond de wierde en terug. Het gaat omhoog, maar vooral omlaag.' },
      { kind: 'bakker', name: 'Bakkerij De Wierdekoek', line: 'Koek in de vorm van een heuvel. Daar kun je op wachten.' },
      { kind: 'markt', name: 'Kleiboer Streekwinkel', line: 'Kaas, eieren en uitleg over de bodem.' },
      { kind: 'cafe', name: 'Eetcafé Het Diepe Zuiden', line: 'Op het bord staat: soep van de dag. De dag is niet gespecificeerd.' },
    ],
  },
];

const TOWN_BY_ID = new Map(TOWN_PROFILES.map((t) => [t.id, t]));
const TOWN_BY_NAME = new Map(TOWN_PROFILES.map((t) => [t.name, t]));
export const DAYPARTS = ['ochtend', 'middag', 'avond'];

// world position of a profile's centre
export function townCentre(t) { const [x, y] = wgsToWorld(t.at[0], t.at[1]); return { x, y }; }

// the profile for a place name from the tiles ("Delfzijl", "Hoogezand", "Sappemeer"), or null
export function townProfile(name) {
  if (!name) return null;
  const hit = TOWN_BY_NAME.get(name);
  if (hit) return hit;
  return name === 'Hoogezand' || name === 'Sappemeer' ? TOWN_BY_ID.get('hoogezand') : null;
}

// the town a world point is in (nearest centre within its reach), or null
export function townAt(x, y) {
  let best = null, bestD = Infinity;
  for (const t of TOWN_PROFILES) {
    const c = townCentre(t);
    const d = Math.hypot(c.x - x, c.y - y);
    if (d <= t.reach && d < bestD) { best = t; bestD = d; }
  }
  return best;
}

export function daypart(hour) {
  const h = ((hour % 24) + 24) % 24;
  return h < 12 ? 'ochtend' : h < 18 ? 'middag' : 'avond';
}

// one ambience line for the hour, avoiding `last` when there is a choice
export function sfeerLine(t, hour, rng = Math.random, last = '') {
  const lines = t.sfeer[daypart(hour)];
  const pool = lines.length > 1 ? lines.filter((l) => l !== last) : lines;
  return pool[Math.floor(rng() * pool.length) % pool.length];
}
