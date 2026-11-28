// De vier verhaalgebieden (#1361, docs/verhaal/bijbel-28-11/03-wereld-en-bouwplan.md 1.2): Waddenkust en Lauwersmeer,
// Hogeland en Veenkoloniën, stad Groningen, Westerkwartier en Gorecht. Alleen data en pure regels: geen DOM, geen THREE,
// geen opslag. Stappen en scènes verwijzen er met een id naar (regionAt, regionsOfStep); er wordt niets door afgesloten:
// het verhaal wijst een richting, de hele kaart blijft begaanbaar (storygate is een poort, geen muur).
//
// De gebieden zijn verhaalgebieden, geen administratieve grenzen; ze liggen over de streken van regioleven.js en de
// gemeenten van grenzen.json heen. Elke plek is een ECHTE plaats (lat/lon, RD New via rdnew.js) binnen de provincie; panden,
// bedrijven en personen in de scènes zijn verzonnen. Plekken die de bijbel noemt maar die in Drenthe of Friesland liggen
// (Eelde, Roden, Peize, Gieten) staan niet in de provincie en dus niet in deze lijst; de ballonstart rond Eelde hoort bij
// vliegplekken.json.
//
// Samen spelen: de gebieden zijn van wie het spel opende (de wereld). Voortgang en beloning zijn per speler (#429); een gast
// ziet het gebied waar hij loopt gewoon in de wereld van de host. Niets hiervan wordt opgeslagen of over het net gestuurd.
import { wgsToWorld } from './rdnew.js';

// Een punt verder dan dit van elke plek van een gebied hoort nergens bij: open land zonder gebied.
export const MAX_REIKWIJDTE = 14000;

// Loopbanen van de bijbel (02-loopbanen.md): thuisgebied (waar ze beginnen), andere gebieden en de bestaande vakken van
// loopbaan.js (VAKKEN) die erbij horen.
export const LOOPBANEN = Object.freeze([
  { id: 'boer', naam: 'Boer', thuis: 'hogeland', ook: ['westerkwartier'], vakken: ['landbouw'] },
  { id: 'voetbal', naam: 'Voetbal', thuis: 'hogeland', ook: ['westerkwartier', 'stad'], vakken: [] },
  { id: 'vervoer', naam: 'Vervoer', thuis: 'stad', ook: ['hogeland', 'westerkwartier', 'waddenkust'], vakken: ['trein', 'bus', 'taxi', 'bezorg', 'vracht'] },
  { id: 'water', naam: 'Water', thuis: 'waddenkust', ook: ['stad'], vakken: ['water'] },
  { id: 'horeca', naam: 'Snackwagen en horeca', thuis: 'stad', ook: ['hogeland', 'westerkwartier', 'waddenkust'], vakken: ['horeca'] },
  { id: 'lucht', naam: 'Lucht', thuis: 'westerkwartier', ook: ['waddenkust'], vakken: ['lucht'] },
]);

// muzieklaag: een verwijzing (id) naar de kleur van de dagmuziek van het gebied; de koppeling aan de echte nummers is
// aan musicpick.js. toon is de sfeer in een paar woorden voor wie de laag kiest.
// bijfiguren: ids met een bestaand dossier (storyarc_nieuw.js CHARACTERS); bijfigurenNieuw: ideeën uit de bijbel die nog
// een dossier krijgen.
const GEBIEDEN = [
  {
    id: 'waddenkust', naam: 'Waddenkust en Lauwersmeer', motto: 'de rand van het land',
    sfeer: 'Ruim, stil, zout. Mensen praten weinig en zeggen dan iets raars. Getij bepaalt de dag, de zomeravond duurt eindeloos.',
    muzieklaag: { id: 'kust', toon: 'ruim en zout, weinig noten' },
    plekken: [
      { id: 'zoutkamp', naam: 'Zoutkamp', soort: 'haven', at: [53.3306, 6.2959], wat: 'Garnalenhaven, visafslag, thuishaven van de binnenvaartlijn' },
      { id: 'lauwersoog', naam: 'Lauwersoog', soort: 'haven', at: [53.4028, 6.2002], wat: 'Veersteiger, haven en vliegstrook; opstijgpunt van de heli-stukken' },
      { id: 'pieterburen', naam: 'Pieterburen', soort: 'dorp', at: [53.4, 6.4264], wat: 'Zeehonden (alleen kijken), het wad en de wadlopers' },
      { id: 'lauwersmeer', naam: 'Lauwersmeer', soort: 'natuur', at: [53.3675, 6.2325], wat: 'Vogelkijkhut, zandbank en de nacht vol sterren' },
      { id: 'warffum', naam: 'Warffum', soort: 'dorp', at: [53.3903, 6.5667], wat: 'Wierdedorp met kerkje; Geesje en haar eieren' },
      { id: 'usquert', naam: 'Usquert', soort: 'dorp', at: [53.4036, 6.6], wat: 'Wierdedorp met kerkje' },
      { id: 'eemshaven', naam: 'Eemshaven', soort: 'haven', at: [53.4411, 6.8317], wat: 'Grote grijze dozen, windmolens aan de horizon en de veerdienst' },
      { id: 'uithuizen', naam: 'Uithuizen', soort: 'dorp', at: [53.4094, 6.6764], wat: 'Kermis en een deftige stoep bij de borg' },
      { id: 'nieuwe-statenzijl', naam: 'Nieuwe Statenzijl', soort: 'sluis', at: [53.2367, 7.2058], wat: 'De sluis en het uiterste puntje; eindpunt van de binnenvaart en een ballonstart' },
    ],
    bijfiguren: ['geesje', 'klaas', 'lammert'],
    bijfigurenNieuw: ['wadloopgids', 'visafslager', 'reddingspostvrijwilliger', 'dijkgraaf', 'pontbaas'],
    gags: ['De pontbaas behandelt elke klant als stamgast, ook de eerste keer.', 'Een zandbank zet zichzelf op de kaart: "Hier was gisteren nog water."', 'Een kip bestuurt de haven.'],
  },
  {
    id: 'hogeland', naam: 'Hogeland en Veenkoloniën', motto: 'ruim land, droge mensen',
    sfeer: 'Horizon, boerenschuur, bieten, wind en trekkers op de provinciale weg. Het land is plat en recht en dat heet overzichtelijk.',
    muzieklaag: { id: 'land', toon: 'droog, breed, een beetje scheef' },
    plekken: [
      { id: 'erfenisboerderij', naam: 'De boerderij van de erfenis', soort: 'erf', at: [53.3395, 6.5403], wat: 'Verzonnen boerderij bij een wierde in het Hogeland; thuis van de boerenlijn' },
      { id: 'winsum', naam: 'Winsum', soort: 'dorp', at: [53.3322, 6.5214], wat: 'Dorpsleven en de dorpsclub waar de voetballijn begint' },
      { id: 'baflo', naam: 'Baflo', soort: 'dorp', at: [53.3589, 6.5011], wat: 'Dorpsleven en het café na afloop' },
      { id: 'bedum', naam: 'Bedum', soort: 'dorp', at: [53.3, 6.6], wat: 'De scheve toren en dorpse verontwaardiging over een boete' },
      { id: 'veendam', naam: 'Veendam', soort: 'stad', at: [53.1056, 6.8794], wat: 'Bruggen en kanalen; onder brug elf de frituurwagen' },
      { id: 'stadskanaal', naam: 'Stadskanaal', soort: 'stad', at: [52.9894, 6.9542], wat: 'Lange kanalen, dorpsfeest en vrachtroutes' },
      { id: 'winschoten', naam: 'Winschoten', soort: 'stad', at: [53.1442, 7.0361], wat: 'Molens, grote velden, bietenoogst en kermisrit' },
      { id: 'ter-apel', naam: 'Ter Apel', soort: 'dorp', at: [52.8764, 7.0619], wat: 'Stil en groen; het veld waar het dorpsteam traint' },
            { id: 'kropswolde', naam: 'Kropswolde', soort: 'water', at: [53.1494, 6.7253], wat: 'Aan de rand: zwemplas en picknickterras bij het Zuidlaardermeer' },
    ],
    bijfiguren: ['wubbo', 'stien', 'daan', 'tinus', 'anneke'],
    bijfigurenNieuw: ['weerboer', 'loonwerker', 'bietenkoningin', 'notaris', 'trainer', 'scheidsrechter'],
    gags: ['Het weer heeft een eigen woordenboek: "een beetje druilerig" is storm.', 'Een trekker voor een stoplicht dat altijd rood blijft.', 'Een handmatig scorebord waarvan de stand nooit klopt.'],
  },
  {
    id: 'stad', naam: 'Stad Groningen', motto: 'het grootste dorp van het noorden',
    sfeer: 'Studenten, fietsen, markt, bureaucratie en terrassen, met de Martinitoren boven alles. Snel, dichtbij en gelaagd.',
    muzieklaag: { id: 'stad', toon: 'levendig, fietsbel en terras' },
    plekken: [
      { id: 'tammo-flat', naam: 'De flat van Tammo', soort: 'thuis', at: [53.2412, 6.5326], wat: 'Thuis: keuken, trap en raam op de straat (Paddepoel)' },
      { id: 'het-loket', naam: 'Het Loket', soort: 'kantoor', at: [53.2189, 6.5687], wat: 'Jelles verzonnen loketten; hoorbaar via brieven en omroepen' },
      { id: 'grote-markt', naam: 'Grote Markt en Martinitoren', soort: 'plein', at: [53.2192, 6.5669], wat: 'Het centrum waar alles samenkomt' },
      { id: 'euroborg', naam: 'De Euroborg', soort: 'stadion', at: [53.2063, 6.5876], wat: 'Hoogste niveau van de voetballijn (de club heeft een verzonnen naam)' },
      { id: 'oosterhaven', naam: 'Oosterhaven en Hoendiep', soort: 'water', at: [53.2228, 6.5737], wat: 'De rondvaart, water door de stad' },
      { id: 'noorderhaven', naam: 'De Noorderhaven', soort: 'water', at: [53.225, 6.561], wat: 'Oma Trijntje en de logeerkamer' },
      { id: 'studentenkwartier', naam: 'Het studentenkwartier', soort: 'wijk', at: [53.2236, 6.559], wat: 'Ebbingekwartier met verzonnen verenigingen; de rivaal uit de straat' },
      { id: 'noorderplantsoen', naam: 'Noorderplantsoen', soort: 'park', at: [53.2237, 6.5531], wat: 'Picknick en de rustige scènes van Tammo en Tessa' },
      { id: 'hoofdstation', naam: 'Hoofdstation en Zuiderdiep', soort: 'station', at: [53.2108, 6.5646], wat: 'Begin en eind van treinreizen, de taxistandplaats' },
      { id: 'kardinge', naam: 'Kardinge', soort: 'recreatie', at: [53.2342, 6.6178], wat: 'Recreatie en zonaanbidders' },
    ],
    bijfiguren: ['berend', 'sjabbe', 'bert', 'sjoerd', 'jelle', 'bewaarder', 'trijntje', 'veldkamp', 'henk', 'jelmer'],
    bijfigurenNieuw: ['marktkoopman', 'rivaal-snackbar', 'buurvrouw-vergrootglas', 'concierge', 'fietsenmaker', 'borrelcommissie'],
    gags: ['Het Loket sluit altijd tien minuten voor je aankomst.', 'De duif heeft een eigen vergunning.', 'Een kermis die er één dag per jaar niet staat.'],
  },
  {
    id: 'westerkwartier', naam: 'Westerkwartier en Gorecht', motto: 'groen, rustig, vol gekheid',
    sfeer: 'Coulissenlandschap, houtwallen, fietspaden, kleine dorpen en meren. Zachter en groener, vol losse dorpsfeesten.',
    muzieklaag: { id: 'groen', toon: 'zacht, groen, dorpsfeest op afstand' },
    plekken: [
      { id: 'leek', naam: 'Leek', soort: 'dorp', at: [53.1667, 6.3833], wat: 'Dorpscentrum, dorpsclub met een klein veld en het tuincentrum met het grote geheim' },
      { id: 'zuidhorn', naam: 'Zuidhorn', soort: 'dorp', at: [53.2467, 6.4], wat: 'Lange fietsroutes en een bietenbult' },
      { id: 'grijpskerk', naam: 'Grijpskerk', soort: 'dorp', at: [53.2653, 6.3], wat: 'Een oude melkfabriek als decor, zonder merknaam' },
      { id: 'marum', naam: 'Marum', soort: 'dorp', at: [53.1383, 6.2407], wat: 'Molen en ambachtelijke markt' },
      { id: 'niekerk', naam: 'Niekerk', soort: 'dorp', at: [53.2262, 6.3681], wat: 'Dorp aan de rand van het Westerkwartier' },
      { id: 'leekstermeer', naam: 'Leekstermeer', soort: 'water', at: [53.1545, 6.3283], wat: 'Het pannenkoekenschip' },
      { id: 'haren', naam: 'Haren', soort: 'dorp', at: [53.1722, 6.6056], wat: 'Dorps met stadse verwachtingen' },
      { id: 'noordlaren', naam: 'Noordlaren', soort: 'dorp', at: [53.1267, 6.6651], wat: 'Zeilclub en zomerse steiger aan het Zuidlaardermeer' },
    ],
    bijfiguren: ['roelfien', 'willemien', 'mem', 'lieke'],
    bijfigurenNieuw: ['dorpsdichter', 'ballonvaarder', 'heemkundige', 'oma-van-iedereen', 'kwekersdochter'],
    gags: ['De rotonde die iedereen anders noemt.', 'Een dorp dat in augustus per se carnaval viert.', 'Een tuinman die al jaren hetzelfde heggetje knipt.'],
  },
];

const metWereld = (g) => ({
  ...g,
  plekken: g.plekken.map((p) => { const [x, y] = wgsToWorld(p.at[0], p.at[1]); return { ...p, gebied: g.id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }; }),
  loopbanen: LOOPBANEN.filter((l) => l.thuis === g.id || l.ook.includes(g.id)).map((l) => l.id),
  thuisLoopbanen: LOOPBANEN.filter((l) => l.thuis === g.id).map((l) => l.id),
});

export const REGIONS = Object.freeze(GEBIEDEN.map((g) => Object.freeze(metWereld(g))));
export const REGION_IDS = Object.freeze(REGIONS.map((g) => g.id));
export const regionInfo = (id) => REGIONS.find((g) => g.id === id) || null;
export const ALL_PLACES = Object.freeze(REGIONS.flatMap((g) => g.plekken));
export const placeInfo = (id) => ALL_PLACES.find((p) => p.id === id) || null;

// De dichtstbijzijnde plek van (x, y) binnen MAX_REIKWIJDTE, of null.
export function nearestPlace(x, y) {
  let best = null, bestD = Infinity;
  for (const p of ALL_PLACES) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { best = p; bestD = d; }
  }
  return best && bestD <= MAX_REIKWIJDTE ? { plek: best, afstand: bestD } : null;
}

// Het gebied op spelframe-punt (x, y): dat van de dichtstbijzijnde plek; null is open land zonder gebied (daar werkt alles
// gewoon, het verhaal wijst alleen geen sfeer aan).
export function regionAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const n = nearestPlace(x, y);
  return n ? n.plek.gebied : null;
}

// De gebieden van een verhaalstap (storyarc_nieuw.js): zijn doelplek (goal.at = [lat, lon]), een eigen at of x/y, en de
// loopbanen van de stap (step.loopbanen) voor zover ze een thuisgebied hebben. Eerst de plek, dan de loopbanen, zonder
// dubbelen; een stap zonder plek of loopbaan geeft []. Een lijst, omdat een stap meer gebieden kan raken.
export function regionsOfStep(step) {
  if (!step || typeof step !== 'object') return [];
  const uit = [];
  const zet = (id) => { if (id && !uit.includes(id)) uit.push(id); };
  const at = step.goal && Array.isArray(step.goal.at) ? step.goal.at : Array.isArray(step.at) ? step.at : null;
  if (at && Number.isFinite(at[0]) && Number.isFinite(at[1])) { const [x, y] = wgsToWorld(at[0], at[1]); zet(regionAt(x, y)); }
  else if (Number.isFinite(step.x) && Number.isFinite(step.y)) zet(regionAt(step.x, step.y));
  for (const v of Array.isArray(step.loopbanen) ? step.loopbanen : []) {
    const l = LOOPBANEN.find((k) => k.id === v || k.vakken.includes(v));
    if (l) zet(l.thuis);
  }
  return uit;
}
