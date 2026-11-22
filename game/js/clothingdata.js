// Kleding (epic Kleding, 21-11): de gegevens. Puur, zonder three of DOM, zodat scripts/clothing_test.mjs alles in gewone node natrekt.
//
// Een kledingstuk is een item in een slot, in een kleur uit het palet. Een stuk heet "item.kleur" ('jack.blauw'); dat id staat in de
// save, in de kast en in de outfit-code. De catalogus is append-only: een bestaand id verandert nooit van betekenis (de outfit-code
// gebruikt de volgorde, zie ITEM_INDEX en PALETTE_INDEX).
//
// Alles komt uit het wereldpalet-achtige palet hieronder, zonder merken, logo's of opschrift: een stuk is een vorm en een kleur.
// Alleen zomerkleding (constitutie 3): geen winterjassen, geen sneeuwlaarzen; een regenjas mag, het regent ook in de zomer.

export const SLOTS = [
  { id: 'hat', label: 'Hoofd', empty: 'Geen hoofddeksel' },
  { id: 'glasses', label: 'Bril', empty: 'Geen bril' },
  { id: 'face', label: 'Gezicht', empty: 'Gladgeschoren' },
  { id: 'neck', label: 'Hals', empty: 'Geen sjaal' },
  { id: 'jewel', label: 'Sieraad', empty: 'Geen ketting' },
  { id: 'top', label: 'Shirt of trui', empty: 'Geen shirt' },
  { id: 'outer', label: 'Jas', empty: 'Geen jas' },
  { id: 'bottom', label: 'Broek of rok', empty: 'Geen broek' },
  { id: 'shoes', label: 'Schoenen', empty: 'Geen schoenen' },
  { id: 'back', label: 'Tas', empty: 'Geen tas' },
  { id: 'wrist', label: 'Pols', empty: 'Geen horloge' },
  { id: 'hands', label: 'Handen', empty: 'Geen handschoenen' },
  // sportslots (22-11, voetbalkleding): achteraan, want de outfit-code leidt het slot af uit het stuk en niet uit de volgorde
  { id: 'legs', label: 'Kousen', empty: 'Geen kousen' },
  { id: 'guard', label: 'Scheenbeschermers', empty: 'Geen scheenbeschermers' },
];
export const SLOT_IDS = SLOTS.map((s) => s.id);
// Zonder deze slots loop je niet de straat op: je kunt ze wisselen, niet uitdoen (een jurk telt voor top en broek).
export const REQUIRED_SLOTS = ['bottom', 'shoes'];

// id: [Nederlandse naam, hex]. Append-only (de outfit-code gebruikt de volgorde).
export const PALETTE = {
  wit: ['Wit', 0xe8e6e0], creme: ['Crème', 0xe3ddd0], ecru: ['Ecru', 0xd8d4cc], zwart: ['Zwart', 0x1c1c1e], diepzwart: ['Diepzwart', 0x19191b],
  inktzwart: ['Inktzwart', 0x232326], schoenzwart: ['Leerzwart', 0x1e1e1e], antraciet: ['Antraciet', 0x26262a], grijs: ['Grijs', 0x8a8478],
  lichtgrijs: ['Lichtgrijs', 0xb4afa6], marine: ['Marine', 0x1f2a4a], nachtblauw: ['Nachtblauw', 0x2f3b52], jeans: ['Jeansblauw', 0x3a4d6e],
  blauw: ['Blauw', 0x3f6ea8], zeeblauw: ['Zeeblauw', 0x2f5c8a], lichtblauw: ['Lichtblauw', 0x6fa3d6], rood: ['Rood', 0x9e3027],
  felrood: ['Felrood', 0xc13a2e], bordeaux: ['Bordeaux', 0x7a1f1f], oranje: ['Oranje', 0xe0701e], roest: ['Roest', 0xc8621e],
  mosterd: ['Mosterd', 0xc9a227], geel: ['Zonnegeel', 0xe6c84a], groen: ['Stadjersgroen', 0x1e9e56], bos: ['Bosgroen', 0x2e4a34],
  olijf: ['Olijf', 0x5b6b3a], saliegroen: ['Salie', 0x3b4a3a], mint: ['Mint', 0x8fd4b0], roze: ['Zachtroze', 0xc98fa8],
  knalroze: ['Knalroze', 0xd0457a], paars: ['Paars', 0x6a4a8a], bruin: ['Bruin', 0x4a3a2a], donkerbruin: ['Donkerbruin', 0x3b2a1e],
  espresso: ['Espresso', 0x2a1d14], cognac: ['Cognac', 0x5a3d26], zand: ['Zand', 0xb8a27a], kaki: ['Kaki', 0x8a7a5a],
  turquoise: ['Turquoise', 0x2a9d9a], natuur: ['Eigen haarkleur', 0x5a3d26],
};
export const PALETTE_IDS = Object.keys(PALETTE);
export const PALETTE_INDEX = Object.fromEntries(PALETTE_IDS.map((id, i) => [id, i]));
export const colorName = (id) => (PALETTE[id] ? PALETTE[id][0] : id);
export const colorHex = (id) => (PALETTE[id] ? PALETTE[id][1] : 0x888888);

// Welke afdeling een winkel heeft: een winkel kiest er een of twee en toont daaruit een wisselend aanbod.
export const PROFILES = {
  straat: 'Straat', sport: 'Sport', werk: 'Werk', chic: 'Chic', buiten: 'Buiten', feest: 'Feest', strand: 'Strand',
};
export const RARITY = {
  g: { id: 'gewoon', label: 'Gewoon', mult: 1 },
  b: { id: 'bijzonder', label: 'Bijzonder', mult: 1.5 },
  z: { id: 'zeldzaam', label: 'Zeldzaam', mult: 2.5 },
  u: { id: 'uniek', label: 'Uniek', mult: 4 },
};

// Hoe een soort in het model landt (models3d_people.js, opts.look). Het model kent al: top (tee, longsleeve, sweater, hoodie, jacket,
// coat, blazer, raincoat, dress), bottom (jeans, trousers, shorts, skirt), schoenen (sneaker, leather, boot), hoed, bril, sjaal, tas
// en gezichtsbeharing. Sieraden, horloges en handschoenen zijn losse kleine meshes (models3d_clothing.js).
export const KIND_LOOK = {
  tee: { top: 'tee', hood: false },
  longsleeve: { top: 'longsleeve', rolled: false, hood: false },
  rolled: { top: 'longsleeve', rolled: true, hood: false },
  sweater: { top: 'sweater', hood: false },
  hoodie: { top: 'hoodie', hood: true },
  dress: { top: 'dress', bottom: 'dress', hood: false },
  jacket: { top: 'jacket', forceOpen: true, hood: true },
  coatshort: { top: 'coat', shortCoat: true, hood: false },
  coat: { top: 'coat', shortCoat: false, hood: false },
  blazer: { top: 'blazer', hood: false },
  raincoat: { top: 'raincoat', hood: false },
  jeans: { bottom: 'jeans' }, trousers: { bottom: 'trousers' }, shorts: { bottom: 'shorts' }, skirt: { bottom: 'skirt' },
  sneaker: { shoeType: 'sneaker' }, leather: { shoeType: 'leather' }, boot: { shoeType: 'boot' },
  cap: { hat: 'cap' }, tammo: { hat: 'tammo' }, flatcap: { hat: 'flatcap' }, beanie: { hat: 'beanie' }, krans: { hat: 'krans' },
  konijn: { hat: 'konijn' }, tiara: { hat: 'tiara' }, sluier: { hat: 'sluier' },
  glasses: { glasses: true, shades: false }, shades: { glasses: true, shades: true },
  stubble: { facial: 'stubble' }, beard: { facial: 'beard' }, moustache: { facial: 'moustache' }, goatee: { facial: 'goatee' },
  scarf: { scarf: true }, backpack: { bag: 'backpack' }, shoulder: { bag: 'shoulder' },
  chain: {}, pearls: {}, beads: {}, pendant: {}, watch: {}, band: {}, bracelet: {}, glove: {}, work: {}, garden: {},
  // voetbalkleding (22-11): het shirt is een tee of lange mouw, het patroon komt als eigen laag (clothingkit.js, shirtBands); de rest zit in outfitToLook
  kitshirt: { top: 'tee', hood: false }, kitlong: { top: 'longsleeve', rolled: false, hood: false },
  kitshorts: { bottom: 'shorts' }, trackpants: { bottom: 'trousers' },
  trackjack: { top: 'jacket', coatOpen: false, forceOpen: false, hood: false },
  bib: { top: 'tee', hood: false },
  cleat1: { shoeType: 'cleat', cleat: 1 }, cleat2: { shoeType: 'cleat', cleat: 2 }, cleat3: { shoeType: 'cleat', cleat: 3 }, cleat4: { shoeType: 'cleat', cleat: 4 },
  kitsocks: {}, shinguard: {}, captain: {}, keeperglove: {},
};
// Kleine meshes die niet in de rompgeometrie zitten (zie models3d_clothing.js)
export const ACCESSORY_KINDS = ['chain', 'pearls', 'beads', 'pendant', 'watch', 'band', 'bracelet', 'glove', 'work', 'garden', 'keeperglove'];

// [id, slot, soort, naam, basisprijs, zeldzaamheid, afdelingen, kleuren, omschrijving, npc]
// npc: true = niet te koop, alleen voor NPC's (rolkleding). Prijs: basis x zeldzaamheid, afgerond.
const R = (s) => s.split(' ');

// Voetbalkleding (22-11, docs/VOETBALKLEDING-22-11.md): echte kledingstukken in de bestaande slots, achteraan de catalogus (append-only: de outfit-code blijft kloppen).
// Het shirt heeft zes patronen en twee mouwlengtes, elk als eigen stuk; de tweede kleur van het patroon volgt uit de eerste (KIT_PAIR), zodat een stuk
// één kleur blijft en de outfit-code niet verandert. Per niveau is er een andere schoen (clothingkit.js KIT_LEVELS).
export const KIT_COLORS = R('groen rood felrood blauw zeeblauw marine oranje geel mosterd wit zwart antraciet bordeaux lichtblauw mint paars turquoise knalroze grijs');
// eerste kleur -> de tweede kleur van het patroon (en de kleur van de uitshirts)
export const KIT_PAIR = {
  groen: 'wit', rood: 'wit', felrood: 'wit', blauw: 'wit', zeeblauw: 'geel', marine: 'lichtblauw', oranje: 'zwart', geel: 'marine', mosterd: 'marine',
  wit: 'marine', zwart: 'wit', antraciet: 'oranje', bordeaux: 'lichtblauw', lichtblauw: 'marine', mint: 'marine', paars: 'geel', turquoise: 'wit',
  knalroze: 'zwart', grijs: 'zwart',
};
// patroon-id in een itemnaam -> patroon zoals voetbalclubs.js het noemt (hoepels en kruis zijn nieuw)
export const KIT_PATTERNS = { effen: 'effen', streep: 'brede-streep', smal: 'smalle-streep', helften: 'helften', hoepels: 'hoepels', kruis: 'kruis' };
const PATTERN_NAME = { effen: 'effen', streep: 'brede strepen', smal: 'smalle strepen', helften: 'helften', hoepels: 'hoepels', kruis: 'kruis' };
const KIT_SHIRTS = [];
for (const lang of [false, true]) {
  for (const pat of Object.keys(KIT_PATTERNS)) {
    KIT_SHIRTS.push([`voetbalshirt${lang ? '_lang' : ''}_${pat}`, 'top', lang ? 'kitlong' : 'kitshirt', `Voetbalshirt${lang ? ', lange mouw' : ''} (${PATTERN_NAME[pat]})`, lang ? 38 : 32, pat === 'effen' ? 'g' : 'b', R('sport'), KIT_COLORS,
      pat === 'effen' ? 'Effen katoen, zoals elk buurtveld het kent' : 'Het patroon van de club, zonder opdruk: het shirt is een vorm en een kleur']);
  }
}
const KIT_RAW = [
  ...KIT_SHIRTS,
  ['keepersshirt', 'top', 'kitlong', 'Keepersshirt', 42, 'b', R('sport'), R('geel mosterd oranje knalroze turquoise groen zwart felrood lichtblauw'), 'Lange mouwen en een kleur die niemand anders draagt'],
  ['voetbalbroekje', 'bottom', 'kitshorts', 'Voetbalbroekje', 18, 'g', R('sport'), KIT_COLORS, 'Kort en licht. Het is zomer in Grunn'],
  ['voetbalsokken', 'legs', 'kitsocks', 'Voetbalsokken', 10, 'g', R('sport'), KIT_COLORS, 'Kousen tot de knie, bij een broekje'],
  ['scheenbeschermers', 'guard', 'shinguard', 'Scheenbeschermers', 14, 'g', R('sport'), R('zwart wit oranje mint lichtgrijs'), 'Zichtbaar onder de kous. Verplicht, zegt de scheids, en daar heeft hij gelijk in'],
  ['noppen_basis', 'shoes', 'cleat1', 'Voetbalschoenen (buurtveld)', 28, 'g', R('sport'), R('zwart schoenzwart donkerbruin'), 'Effen en eenvoudig, met zes noppen. Doet wat hij moet doen'],
  ['noppen_semi', 'shoes', 'cleat2', 'Voetbalschoenen (streek)', 36, 'b', R('sport'), R('zwart wit oranje blauw mint'), 'Met een streep op de zijkant en betere noppen'],
  ['noppen_pro', 'shoes', 'cleat3', 'Voetbalschoenen (profklasse)', 36, 'z', R('sport'), R('zwart wit oranje geel mint knalroze'), 'Lage enkel, een manchet en dunne noppen'],
  ['noppen_top', 'shoes', 'cleat4', 'Voetbalschoenen (topklasse)', 55, 'u', R('sport'), R('geel oranje knalroze mint zeeblauw'), 'Opvallend, met hielkap en tong. De hele tribune ziet dat je ze hebt'],
  ['keepershandschoenen', 'hands', 'keeperglove', 'Keepershandschoenen', 22, 'b', R('sport'), R('geel oranje wit mint knalroze'), 'Gevoerd, met een brede manchet. Voor wie liever de bal vangt dan zijn handen'],
  ['aanvoerdersband', 'wrist', 'captain', 'Aanvoerdersband', 8, 'g', R('sport'), R('geel oranje felrood groen blauw wit'), 'Om de bovenarm. Wie hem draagt, praat met de scheids'],
  ['trainingsjack', 'outer', 'trackjack', 'Trainingsjack', 36, 'g', R('sport'), KIT_COLORS, 'Dicht tot de kin. Voor het warmlopen op een frisse zomeravond'],
  ['trainingsbroek', 'bottom', 'trackpants', 'Trainingsbroek', 28, 'g', R('sport'), KIT_COLORS, 'Lange pijpen, voor het warmlopen en het napraten'],
  ['opwarmhesje', 'outer', 'bib', 'Opwarmhesje', 8, 'g', R('sport'), R('oranje geel felrood mint knalroze lichtblauw wit'), 'Zodat je weet wie bij wie hoort tijdens het rondo'],
];

const RAW = [
  // hoofd
  ['stadjerspet', 'hat', 'tammo', 'Stadjerspet', 18, 'g', R('straat sport'), R('roest groen bos oranje bordeaux inktzwart marine wit'), 'De pet met het gele plaatje van de Stadjer. Zit altijd een tikje scheef'],
  ['pet', 'hat', 'cap', 'Baseballpet', 14, 'g', R('straat sport'), R('zwart marine rood wit groen zand'), 'Voor als je haar niet meewerkt'],
  ['platpet', 'hat', 'flatcap', 'Platte pet', 22, 'g', R('werk chic'), R('lichtgrijs bruin kaki marine'), 'Voor een man die altijd weet waar het weer vandaan komt'],
  ['mutsje', 'hat', 'beanie', 'Zomermutsje', 12, 'g', R('straat'), R('zwart grijs mosterd mint roze rood'), 'Dun katoen. Voor het festival, niet voor de kou'],
  ['krans', 'hat', 'krans', 'Bloemenkrans', 20, 'b', R('feest strand'), R('roze geel wit oranje'), 'Madeliefjes uit de Noorderplantsoen-sloot. Bijna'],
  ['feestoren', 'hat', 'konijn', 'Feestoren', 16, 'b', R('feest'), R('wit roze grijs'), 'Twee lange oren. Je hoort er een vrolijker gesprek door'],
  ['kroontje', 'hat', 'tiara', 'Gouden kroontje', 40, 'z', R('feest'), R('mosterd'), 'Vijf puntjes. Wie hem draagt, wordt gegroet door de eenden'],
  ['sluier', 'hat', 'sluier', 'Feestsluier', 28, 'b', R('feest'), R('wit'), 'Een lichte sluier voor een vrijgezellendag'],
  // bril
  ['leesbril', 'glasses', 'glasses', 'Leesbril', 20, 'g', R('chic werk'), R('zwart'), 'Voor het kleingedrukte van de gemeente'],
  ['zonnebril', 'glasses', 'shades', 'Zonnebril "Zomerzicht"', 25, 'g', R('strand sport straat'), R('zwart'), 'Donkere glazen. Je blik is niemands zaak'],
  // gezicht
  ['stoppels', 'face', 'stubble', 'Stoppelbaardje', 10, 'g', R('straat'), R('natuur'), 'Drie dagen niet geschoren, met opzet'],
  ['volbaard', 'face', 'beard', 'Volle baard', 25, 'b', R('straat werk'), R('natuur'), 'Een baard met een eigen mening'],
  ['snor', 'face', 'moustache', 'Snor', 18, 'g', R('chic werk'), R('natuur'), 'Netjes in model. Hij kietelt alleen jou'],
  ['sik', 'face', 'goatee', 'Sikje', 18, 'g', R('straat chic'), R('natuur'), 'Een puntig sikje, voor de kunstenaar in je'],
  // hals
  ['sjaal', 'neck', 'scarf', 'Dunne sjaal', 18, 'g', R('buiten chic'), R('mosterd rood blauw grijs bos roest'), 'Luchtig katoen. Ook op de fiets over het Hogeland'],
  ['nekdoek', 'neck', 'scarf', 'Nekdoek', 10, 'g', R('straat werk'), R('rood blauw wit zwart'), 'Veegt het zweet en de zorgen weg'],
  ['strandsjaal', 'neck', 'scarf', 'Strandsjaal', 16, 'b', R('strand feest'), R('turquoise knalroze geel mint'), 'Zo licht dat hij bijna zweeft'],
  // sieraad
  ['ketting', 'jewel', 'chain', 'Dunne ketting', 25, 'b', R('chic strand'), R('mosterd lichtgrijs'), 'Goud of zilver. Niemand vraagt of het echt is'],
  ['parels', 'jewel', 'pearls', 'Parelsnoer', 35, 'b', R('chic'), R('wit'), 'Van oma, zegt de verkoper. Hij liegt vast niet'],
  ['kralen', 'jewel', 'beads', 'Kralenketting', 14, 'g', R('strand feest'), R('turquoise knalroze oranje geel'), 'Op de kermis gewonnen, of bijna'],
  ['hanger', 'jewel', 'pendant', 'Hanger', 22, 'g', R('chic straat'), R('lichtgrijs mosterd roest'), 'Een kleine ronde hanger aan een koordje'],
  // pols
  ['horloge', 'wrist', 'watch', 'Horloge', 30, 'g', R('chic sport werk'), R('zwart lichtgrijs cognac'), 'Wijst de tijd aan. Meer vraag je niet van een horloge'],
  ['polsbandje', 'wrist', 'band', 'Festivalbandje', 8, 'g', R('feest straat'), R('rood groen geel blauw wit'), 'Bewijst dat je erbij was. Niet meer afdoen'],
  ['armband', 'wrist', 'bracelet', 'Armband', 15, 'g', R('strand chic'), R('turquoise mosterd zwart'), 'Een smalle band van touw en kralen'],
  // handen
  ['fietshandschoen', 'hands', 'glove', 'Fietshandschoenen', 20, 'g', R('sport'), R('zwart rood blauw'), 'Zonder vingertoppen: lekker voor de bel'],
  ['werkhandschoen', 'hands', 'work', 'Werkhandschoenen', 15, 'g', R('werk'), R('mosterd grijs oranje'), 'Dikke handschoenen voor dikke klussen'],
  ['tuinhandschoen', 'hands', 'garden', 'Tuinhandschoenen', 10, 'g', R('buiten'), R('groen geel roze'), 'Voor de moestuin, de bietenoogst en de buren'],
  // shirt
  ['tshirt', 'top', 'tee', 'T-shirt', 12, 'g', R('straat sport strand'), R('wit zwart blauw rood groen geel grijs roze oranje'), 'Effen. Geen tekst, geen verhaal'],
  ['polo', 'top', 'tee', 'Poloshirt', 20, 'g', R('chic sport'), R('marine wit rood bos lichtblauw'), 'Voor op de golfbaan, ook zonder golfbaan'],
  ['overhemd', 'top', 'longsleeve', 'Overhemd', 30, 'g', R('chic werk'), R('wit lichtblauw creme roze'), 'Gestreken. Dat zie je'],
  ['zomerhemd', 'top', 'rolled', 'Hemd, mouwen omhoog', 24, 'g', R('straat werk buiten'), R('lichtblauw creme olijf zand mosterd'), 'De mouwen alvast opgerold, het is zomer'],
  ['blouse', 'top', 'tee', 'Bloemenblouse', 25, 'b', R('strand feest'), R('knalroze turquoise geel oranje'), 'Een kleur die je op het Noorderplantsoen hoort'],
  ['trui', 'top', 'sweater', 'Dunne trui', 28, 'g', R('buiten chic'), R('grijs marine bordeaux mosterd olijf'), 'Voor de avond bij de plas'],
  ['hoodie', 'top', 'hoodie', 'Hoodie', 35, 'g', R('straat sport'), R('zwart grijs bos blauw bordeaux'), 'Capuchon op voor de fietstunnel'],
  ['visserstrui', 'top', 'sweater', 'Visserstrui', 32, 'g', R('buiten'), R('marine wit zeeblauw'), 'Gebreid voor Lauwersoog, maar dan dun'],
  ['lange_mouw', 'top', 'longsleeve', 'Shirt met lange mouwen', 22, 'g', R('straat sport'), R('wit zwart grijs marine bos'), 'Gewoon, en daarom overal'],
  ['clubshirt', 'top', 'tee', 'Clubshirt', 40, 'b', R('sport'), R('groen wit oranje rood blauw'), 'Voor op de tribune. Het schuurt, maar het hoort zo'],
  ['jurk', 'top', 'dress', 'Zomerjurk', 40, 'g', R('straat strand chic'), R('mint geel roze wit felrood zeeblauw'), 'Wappert mee met de wind over de Vismarkt'],
  // jas
  ['jack', 'outer', 'jacket', 'Jack', 45, 'g', R('straat sport'), R('blauw groen olijf oranje marine zwart'), 'Het vertrouwde jack. Past bij alles, ook bij niks'],
  ['korte_jas', 'outer', 'coatshort', 'Korte jas', 45, 'g', R('straat chic'), R('rood mosterd roze zeeblauw zwart groen'), 'Tot net over de heup. Zakken genoeg voor een plan B'],
  ['lange_jas', 'outer', 'coat', 'Lange jas', 70, 'b', R('chic'), R('zwart marine grijs kaki bordeaux'), 'Tot over de knie. Voor een dramatische binnenkomst'],
  ['colbert', 'outer', 'blazer', 'Colbert', 60, 'g', R('chic werk'), R('marine grijs zwart zand bordeaux'), 'Strak, met mouwen die precies lang genoeg zijn'],
  ['regenjas', 'outer', 'raincoat', 'Regenjas', 40, 'g', R('buiten straat'), R('mosterd marine rood bos antraciet'), 'Het regent ook in de zomer. Vooral in de zomer'],
  ['werkjack', 'outer', 'jacket', 'Werkjack', 50, 'g', R('werk buiten'), R('oranje olijf kaki grijs'), 'Stevig katoen met stevige zakken'],
  ['zomerjas', 'outer', 'coatshort', 'Zomerjas', 42, 'g', R('buiten strand'), R('zand creme lichtblauw mint'), 'Zo dun dat je hem bijna vergeet. Maar bijna'],
  // broek
  ['jeans', 'bottom', 'jeans', 'Spijkerbroek', 35, 'g', R('straat sport werk'), R('jeans nachtblauw antraciet diepzwart wit bruin zand creme saliegroen zwart'), 'Een broek die alles overleeft behalve de was'],
  ['chino', 'bottom', 'trousers', 'Chino', 38, 'g', R('chic buiten'), R('zand kaki marine olijf grijs'), 'Voor als je net niet in een pak wilt'],
  ['pantalon', 'bottom', 'trousers', 'Pantalon', 48, 'b', R('chic'), R('zwart grijs marine'), 'Met vouw. De vouw is heilig'],
  ['werkbroek', 'bottom', 'trousers', 'Werkbroek', 32, 'g', R('werk'), R('olijf grijs bruin marine'), 'Veel zakken, weinig mode'],
  ['korte_broek', 'bottom', 'shorts', 'Korte broek', 22, 'g', R('strand sport straat'), R('marine kaki zand blauw bos'), 'Voor de eerste warme dag. En de tweede'],
  ['bermuda', 'bottom', 'shorts', 'Bermuda', 26, 'g', R('strand buiten'), R('kaki olijf turquoise creme'), 'Voor wie niet kiest tussen kort en lang'],
  ['rok', 'bottom', 'skirt', 'Rok', 30, 'g', R('straat chic strand'), R('zwart felrood jeans mint zand'), 'Draait mooi mee in de wind'],
  // schoenen
  ['gympen', 'shoes', 'sneaker', 'Gympen', 30, 'g', R('straat sport'), R('ecru wit donkerbruin schoenzwart espresso cognac'), 'Wit tot de eerste plas'],
  ['hardloopschoen', 'shoes', 'sneaker', 'Hardloopschoenen', 40, 'b', R('sport'), R('oranje mint blauw geel schoenzwart'), 'Lichter dan je smoes om niet te gaan'],
  ['instappers', 'shoes', 'leather', 'Instappers', 45, 'g', R('chic'), R('schoenzwart cognac donkerbruin'), 'Netjes aan de voet, ook als de rest een puinhoop is'],
  ['nette_schoenen', 'shoes', 'leather', 'Nette schoenen', 55, 'g', R('chic werk'), R('schoenzwart donkerbruin cognac'), 'Gepoetst. Door iemand anders'],
  ['laarzen', 'shoes', 'boot', 'Laarzen', 50, 'g', R('buiten werk'), R('espresso donkerbruin schoenzwart cognac ecru wit'), 'Voor modder, klei en de Hogelandse wind'],
  ['wandelschoen', 'shoes', 'boot', 'Wandelschoenen', 55, 'g', R('buiten'), R('donkerbruin kaki grijs olijf'), 'Voor de Pieterpad-ambitie'],
  ['veiligheidsschoen', 'shoes', 'boot', 'Veiligheidsschoenen', 48, 'g', R('werk'), R('schoenzwart donkerbruin mosterd'), 'Met stalen neus. Voor teen en hoogmoed'],
  // tas
  ['rugzak', 'back', 'backpack', 'Rugzak', 35, 'g', R('sport buiten straat'), R('zwart marine bos bordeaux mosterd bruin'), 'Past je hele plan B in'],
  ['schoudertas', 'back', 'shoulder', 'Schoudertas', 30, 'g', R('chic straat'), R('zwart cognac bordeaux marine creme'), 'Zakelijk genoeg voor een handtekening'],
  ['boodschappentas', 'back', 'shoulder', 'Boodschappentas', 12, 'g', R('straat buiten'), R('creme olijf mosterd'), 'Katoen. Voor de boodschappen en de moraal'],
  ['sporttas', 'back', 'shoulder', 'Sporttas', 28, 'g', R('sport'), R('zwart blauw groen'), 'Er zit altijd een natte handdoek in'],
  // rolkleding voor NPC's (niet te koop)
  ['koksjas', 'outer', 'coatshort', 'Koksjas', 0, 'u', [], R('wit'), 'Wit en onberispelijk, tot de eerste kapsalon', true],
  ['uniformjas', 'outer', 'jacket', 'Uniformjas', 0, 'u', [], R('marine zwart'), 'Dienstkleding', true],
  ['veiligheidsjas', 'outer', 'jacket', 'Veiligheidsjas', 0, 'u', [], R('oranje geel'), 'Opvallend op de bouwplaats', true],
  ['schort', 'top', 'tee', 'Schort', 0, 'u', [], R('wit creme bruin'), 'Voor de bakkerij en het slagersblok', true],
  ...KIT_RAW,
];

// de voetbalkleding als groep: de kast en de winkel tonen ze onder Sport (clothingpanel.js)
export const SPORT_IDS = new Set(KIT_RAW.map((r) => r[0]));
export const ITEMS = RAW.map(([id, slot, kind, label, base, r, profiles, colors, desc, npc]) => ({
  id, slot, kind, label, base, rarity: r, profiles, colors, desc, npc: !!npc,
  price: Math.round(base * RARITY[r].mult),
  accessory: ACCESSORY_KINDS.includes(kind),
}));
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
export const ITEM_INDEX = Object.fromEntries(ITEMS.map((it, i) => [it.id, i]));
export const SHOP_ITEMS = ITEMS.filter((it) => !it.npc);

// Een stuk als tekst en terug: 'jack.blauw'.
export const pieceId = (itemId, color) => `${itemId}.${color}`;
export function parsePiece(p) {
  if (typeof p !== 'string') return null;
  const dot = p.indexOf('.');
  if (dot < 1) return null;
  const item = ITEM_BY_ID[p.slice(0, dot)];
  const color = p.slice(dot + 1);
  if (!item || !item.colors.includes(color)) return null;
  return { item, color, id: p, hex: colorHex(color) };
}
export const pieceLabel = (p) => {
  const x = typeof p === 'string' ? parsePiece(p) : p;
  if (!x) return '';
  return x.item.colors.length > 1 ? `${x.item.label} (${colorName(x.color).toLowerCase()})` : x.item.label;
};
export const piecePrice = (p) => { const x = parsePiece(p); return x ? x.item.price : 0; };
export const pieceSlot = (p) => { const x = parsePiece(p); return x ? x.item.slot : null; };

// De twaalf vaste sets uit de winkel van vroeger (shops.js OUTFITS), nu als stukken. De kleuren en vormen zijn dezelfde als toen:
// wie een set draagt ziet er precies zo uit als voorheen. Alle stukken van een set tegelijk dragen is de setbonus (stealth).
// price = de oude prijs van de hele set; wie stukken al heeft, betaalt alleen voor wat ontbreekt (naar rato).
export const SETS = [
  { id: 'tammo:stadjer', key: 'stadjer', char: 'tammo', label: 'Stadjer classic', desc: 'Het vertrouwde jack en de oranje pet', price: 40, pieces: ['stadjerspet.roest', 'jack.blauw', 'jeans.nachtblauw', 'gympen.ecru'] },
  { id: 'tammo:groenwit', key: 'groenwit', char: 'tammo', label: 'Groen-wit tot in de kist', desc: 'Voor op de tribune en daarbuiten', price: 120, pieces: ['stadjerspet.groen', 'jack.groen', 'jeans.wit', 'gympen.wit'] },
  { id: 'tammo:boer', key: 'boer', char: 'tammo', label: 'Boer op zundag', desc: 'Olijfgroen en bruin, klaar voor het Hogeland', price: 80, pieces: ['stadjerspet.bos', 'jack.olijf', 'jeans.bruin', 'gympen.donkerbruin'] },
  { id: 'tammo:keuning', key: 'keuning', char: 'tammo', label: 'Keuningsdag', desc: 'Oranje boven, ook buiten april', price: 90, pieces: ['stadjerspet.oranje', 'jack.oranje', 'jeans.nachtblauw', 'gympen.ecru'] },
  { id: 'tammo:corps', key: 'corps', char: 'tammo', label: 'Corpsbal', desc: 'Navy colbert, chino, pet van pappie', price: 160, pieces: ['stadjerspet.bordeaux', 'jack.marine', 'jeans.zand', 'gympen.donkerbruin'] },
  { id: 'tammo:incognito', key: 'incognito', char: 'tammo', label: 'Zwart incognito', desc: 'Onopvallend: de politie raakt je sneller kwijt', price: 150, pieces: ['stadjerspet.inktzwart', 'jack.zwart', 'jeans.diepzwart', 'gympen.schoenzwart'], bonus: { stealth: 2 } },
  { id: 'anita:classic', key: 'classic', char: 'anita', label: 'Rode jas classic', desc: 'Haar eigen, vertrouwde jas', price: 40, pieces: ['korte_jas.rood', 'jeans.antraciet', 'laarzen.espresso'] },
  { id: 'anita:groenwit', key: 'groenwit', char: 'anita', label: 'Groen-wit tot in de kist', desc: 'Voor op de tribune en daarbuiten', price: 120, pieces: ['korte_jas.groen', 'jeans.wit', 'laarzen.wit'] },
  { id: 'anita:noorderzon', key: 'noorderzon', char: 'anita', label: 'Noorderzon', desc: 'Mosterdgele jas, festivalproof', price: 90, pieces: ['korte_jas.mosterd', 'jeans.jeans', 'laarzen.cognac'] },
  { id: 'anita:pastel', key: 'pastel', char: 'anita', label: 'Lente op de Vismarkt', desc: 'Zacht roze met crème', price: 100, pieces: ['korte_jas.roze', 'jeans.creme', 'laarzen.ecru'] },
  { id: 'anita:wadloper', key: 'wadloper', char: 'anita', label: 'Wadloper', desc: 'Zeeblauw en laarzen, klaar voor Pieterburen', price: 80, pieces: ['korte_jas.zeeblauw', 'jeans.saliegroen', 'laarzen.espresso'] },
  { id: 'anita:incognito', key: 'incognito', char: 'anita', label: 'Zwart incognito', desc: 'Onopvallend: de politie raakt je sneller kwijt', price: 150, pieces: ['korte_jas.zwart', 'jeans.diepzwart', 'laarzen.schoenzwart'], bonus: { stealth: 2 } },
];
export const SET_BY_ID = Object.fromEntries(SETS.map((s) => [s.id, s]));
export const setsFor = (char) => SETS.filter((s) => s.char === char);
// Het verhaal kent sets op sleutel (setStoryOutfit('incognito')): dezelfde sleutel in beide kasten.
export const setKeyFor = (char, key) => SETS.find((s) => s.char === char && s.key === key) || null;

// Wat een personage aan heeft als er niets is opgeslagen: de kleding waarmee het begon.
export const DEFAULT_WORN = {
  tammo: { hat: 'stadjerspet.roest', outer: 'jack.blauw', bottom: 'jeans.nachtblauw', shoes: 'gympen.ecru', face: 'stoppels.natuur' },
  anita: { outer: 'korte_jas.rood', bottom: 'jeans.antraciet', shoes: 'laarzen.espresso' },
};

// Bijzondere sets die er nieuw bij komen (geen oude set): een dagje strand, een festival, een regenachtige zomermiddag. Ze zijn
// niet gekoppeld aan een personage, dus elk kan ze dragen. Dragen van alle stukken geeft geen bonus (kleding geeft alleen de
// setbonus uit het bestaande systeem), maar telt wel voor de prestatie "Alle stukken van een set".
export const LOOKS = [
  { id: 'strandmiddag', label: 'Strandmiddag', desc: 'Korte broek, bloemenblouse en zonnebril. Alleen de zon ontbreekt nog', pieces: ['blouse.turquoise', 'korte_broek.kaki', 'zonnebril.zwart', 'gympen.wit'] },
  { id: 'festivalgast', label: 'Festivalgast', desc: 'Bandje om, krans op. Het is zomer in Grunn', pieces: ['tshirt.geel', 'korte_broek.blauw', 'krans.roze', 'polsbandje.rood', 'gympen.ecru'] },
  { id: 'regenmiddag', label: 'Regenmiddag', desc: 'Het regent, en jij loopt erdoorheen', pieces: ['regenjas.mosterd', 'jeans.jeans', 'laarzen.donkerbruin'] },
  { id: 'kantoordag', label: 'Kantoordag', desc: 'Colbert, overhemd en instappers. Je ziet eruit alsof je een afspraak hebt', pieces: ['colbert.marine', 'overhemd.wit', 'chino.zand', 'instappers.cognac', 'horloge.cognac'] },
  { id: 'sportdag', label: 'Sportdag', desc: 'Clubshirt, korte broek en handschoenen voor de fiets', pieces: ['clubshirt.groen', 'korte_broek.marine', 'hardloopschoen.oranje', 'fietshandschoen.zwart', 'pet.wit'] },
  { id: 'werkpak', label: 'Werkpak', desc: 'Werkjack, werkbroek en werkhandschoenen: klaar voor een klus', pieces: ['werkjack.oranje', 'werkbroek.olijf', 'veiligheidsschoen.donkerbruin', 'werkhandschoen.mosterd'] },
  { id: 'zomeravond', label: 'Zomeravond', desc: 'Jurk of hemd, een sjaal en een ketting voor een lange avond', pieces: ['jurk.mint', 'strandsjaal.geel', 'ketting.mosterd', 'instappers.cognac'] },
  { id: 'tuindag', label: 'Tuindag', desc: 'Zomerhemd, bermuda en tuinhandschoenen. De buren kijken mee', pieces: ['zomerhemd.olijf', 'bermuda.kaki', 'tuinhandschoen.groen', 'laarzen.donkerbruin', 'platpet.kaki'] },
];
export const LOOK_BY_ID = Object.fromEntries(LOOKS.map((s) => [s.id, s]));

// Winkelregels: hoeveel stukken een winkel tegelijk toont, hoe vaak het aanbod wisselt, welke afdeling in welke soort winkel.
export const SHOP_STOCK = 14;      // soorten stukken per winkel en dag; elke soort ligt er in al zijn kleuren (zelf combineren)
export const SHOP_RARE_CHANCE = 0.18; // kans dat een zeldzaam stuk vandaag in de etalage ligt
export const SALE_DISCOUNT = 0.25; // uitverkoop: een dag per week, een afdeling
export const SET_DISCOUNT = 0;     // sets kosten de oude prijs (naar rato van wat je mist)
export const PRESET_COUNT = 5;     // Outfit 1 tot 5 per personage
export const PRESET_NAME_MAX = 18;

// Outfit-sets per rol voor NPC's (zie clothing.npcOutfit). Per slot een gewogen lijst: [stuk-zonder-kleur, gewicht, kleuren (leeg = alle)].
// Rollen met een vaste, herkenbare kleding (politie, verhaalpersonages) staan in models3d_people.js en missionstory.js; dit zijn de
// rollen waar de generator het werk doet.
export const ROLE_POOLS = {
  voetganger: {
    top: [['tshirt', 30], ['lange_mouw', 12], ['trui', 10], ['hoodie', 12], ['polo', 8], ['overhemd', 8], ['zomerhemd', 6], ['jurk', 6], ['blouse', 3]],
    outer: [[null, 55], ['jack', 14], ['korte_jas', 12], ['regenjas', 6], ['colbert', 5], ['lange_jas', 4], ['zomerjas', 4]],
    bottom: [['jeans', 46], ['chino', 14], ['korte_broek', 14], ['rok', 10], ['pantalon', 6], ['bermuda', 6], ['werkbroek', 4]],
    shoes: [['gympen', 45], ['instappers', 14], ['nette_schoenen', 10], ['laarzen', 12], ['wandelschoen', 8], ['hardloopschoen', 6], ['veiligheidsschoen', 5]],
    hat: [[null, 78], ['pet', 10], ['mutsje', 5], ['platpet', 5], ['stadjerspet', 2]],
    glasses: [[null, 84], ['leesbril', 8], ['zonnebril', 8]],
    back: [[null, 70], ['rugzak', 14], ['schoudertas', 10], ['boodschappentas', 6]],
    neck: [[null, 90], ['sjaal', 6], ['nekdoek', 4]],
  },
  student: {
    top: [['hoodie', 28], ['tshirt', 34], ['lange_mouw', 14], ['trui', 12], ['clubshirt', 6], ['blouse', 6]],
    outer: [[null, 70], ['jack', 18], ['regenjas', 12]],
    bottom: [['jeans', 60], ['korte_broek', 22], ['chino', 10], ['rok', 8]],
    shoes: [['gympen', 80], ['hardloopschoen', 12], ['laarzen', 8]],
    hat: [[null, 70], ['pet', 16], ['mutsje', 14]],
    back: [[null, 25], ['rugzak', 62], ['schoudertas', 13]],
    glasses: [[null, 80], ['zonnebril', 14], ['leesbril', 6]],
  },
  toerist: {
    top: [['tshirt', 30], ['blouse', 22], ['polo', 14], ['jurk', 16], ['zomerhemd', 18]],
    outer: [[null, 70], ['regenjas', 20], ['zomerjas', 10]],
    bottom: [['korte_broek', 36], ['bermuda', 22], ['chino', 20], ['rok', 12], ['jeans', 10]],
    shoes: [['gympen', 40], ['wandelschoen', 40], ['hardloopschoen', 20]],
    hat: [[null, 40], ['pet', 36], ['krans', 6], ['platpet', 18]],
    glasses: [[null, 30], ['zonnebril', 70]],
    back: [[null, 20], ['rugzak', 62], ['boodschappentas', 18]],
    jewel: [[null, 70], ['kralen', 18], ['hanger', 12]],
  },
  // een figurant of burger van de vesting (heritagearea.js): eenvoudige stukken in aardse tinten, een lange jas of vest, laarzen en een platte hoed;
  // alleen bestaande stukken, geen echte persoon of tijdperk-uniform
  historisch: {
    top: [['overhemd', 40], ['zomerhemd', 24], ['blouse', 16], ['trui', 10], ['jurk', 10]],
    outer: [[null, 30], ['lange_jas', 34], ['colbert', 22], ['zomerjas', 14]],
    bottom: [['pantalon', 40], ['rok', 30], ['bermuda', 14], ['werkbroek', 16]],
    shoes: [['laarzen', 62], ['nette_schoenen', 28], ['instappers', 10]],
    hat: [[null, 25], ['platpet', 38], ['stadjerspet', 22], ['mutsje', 15]],
    neck: [[null, 55], ['sjaal', 25], ['nekdoek', 20]],
  },
  bouwvakker: {
    top: [['tshirt', 40], ['lange_mouw', 20], ['zomerhemd', 20], ['hoodie', 20]],
    outer: [[null, 30], ['veiligheidsjas', 55], ['werkjack', 15]],
    bottom: [['werkbroek', 80], ['jeans', 20]],
    shoes: [['veiligheidsschoen', 90], ['laarzen', 10]],
    hands: [[null, 40], ['werkhandschoen', 60]],
    hat: [[null, 70], ['pet', 30]],
  },
  boer: {
    top: [['zomerhemd', 40], ['tshirt', 30], ['lange_mouw', 20], ['trui', 10]],
    outer: [[null, 55], ['werkjack', 35], ['regenjas', 10]],
    bottom: [['werkbroek', 55], ['jeans', 45]],
    shoes: [['laarzen', 85], ['veiligheidsschoen', 15]],
    hat: [[null, 35], ['platpet', 40], ['pet', 25]],
    hands: [[null, 70], ['tuinhandschoen', 30]],
  },
  kok: {
    top: [['schort', 100]],
    outer: [['koksjas', 100]],
    bottom: [['werkbroek', 60], ['jeans', 40]],
    shoes: [['gympen', 50], ['veiligheidsschoen', 50]],
  },
  bakker: {
    top: [['schort', 100]],
    outer: [[null, 100]],
    bottom: [['werkbroek', 50], ['chino', 50]],
    shoes: [['gympen', 60], ['nette_schoenen', 40]],
  },
  winkelier: {
    top: [['overhemd', 40], ['polo', 30], ['blouse', 15], ['trui', 15]],
    outer: [[null, 75], ['colbert', 25]],
    bottom: [['chino', 50], ['pantalon', 30], ['jeans', 20]],
    shoes: [['instappers', 50], ['nette_schoenen', 50]],
    wrist: [[null, 60], ['horloge', 40]],
    glasses: [[null, 80], ['leesbril', 20]],
  },
  zakenman: {
    top: [['overhemd', 100]],
    outer: [['colbert', 100]],
    bottom: [['pantalon', 70], ['chino', 30]],
    shoes: [['nette_schoenen', 100]],
    wrist: [[null, 30], ['horloge', 70]],
    glasses: [[null, 70], ['leesbril', 30]],
    back: [[null, 50], ['schoudertas', 50]],
  },
  sporter: {
    top: [['clubshirt', 40], ['tshirt', 40], ['hoodie', 20]],
    outer: [[null, 80], ['jack', 20]],
    bottom: [['korte_broek', 80], ['jeans', 20]],
    shoes: [['hardloopschoen', 70], ['gympen', 30]],
    hands: [[null, 80], ['fietshandschoen', 20]],
    hat: [[null, 60], ['pet', 40]],
    wrist: [[null, 50], ['horloge', 50]],
  },
  ambtenaar: {
    top: [['overhemd', 40], ['blouse', 28], ['polo', 20], ['trui', 12]],
    outer: [[null, 65], ['colbert', 25], ['regenjas', 10]],
    bottom: [['pantalon', 48], ['chino', 40], ['rok', 12]],
    shoes: [['nette_schoenen', 45], ['instappers', 45], ['gympen', 10]],
    wrist: [[null, 55], ['horloge', 45]],
    glasses: [[null, 60], ['leesbril', 40]],
    back: [[null, 45], ['schoudertas', 55]],
  },
  wandelaar: {
    top: [['lange_mouw', 30], ['tshirt', 30], ['polo', 20], ['trui', 20]],
    outer: [[null, 45], ['regenjas', 25], ['jack', 20], ['zomerjas', 10]],
    bottom: [['chino', 40], ['korte_broek', 25], ['jeans', 20], ['bermuda', 15]],
    shoes: [['wandelschoen', 80], ['laarzen', 10], ['gympen', 10]],
    hat: [[null, 40], ['pet', 30], ['platpet', 30]],
    back: [[null, 20], ['rugzak', 80]],
    glasses: [[null, 70], ['zonnebril', 30]],
  },
  // een ambulancebroeder: opvallend, werkbaar en niet de vaste look van de politie
  ambulance: {
    top: [['polo', 60], ['tshirt', 30], ['lange_mouw', 10]],
    outer: [['veiligheidsjas', 70], [null, 30]],
    bottom: [['werkbroek', 100]],
    shoes: [['veiligheidsschoen', 80], ['gympen', 20]],
    hat: [[null, 80], ['pet', 20]],
  },
  // een chauffeur van een bus of taxi: netjes, een bril tegen de zon
  chauffeur: {
    top: [['overhemd', 55], ['polo', 35], ['lange_mouw', 10]],
    outer: [[null, 70], ['colbert', 15], ['jack', 15]],
    bottom: [['pantalon', 60], ['chino', 40]],
    shoes: [['nette_schoenen', 60], ['instappers', 40]],
    hat: [[null, 80], ['pet', 20]],
    glasses: [[null, 60], ['zonnebril', 40]],
    wrist: [[null, 50], ['horloge', 50]],
  },
  // een voetballer (22-11): teamgenoten en tegenstanders gebruiken dezelfde stukken als de speler. npcOutfit bouwt hem uit clothingkit.js (één shirtkleur
  // voor shirt, broek en sokken, het niveau uit ctx.level); deze lijst is de neutrale terugval en houdt de poolcontrole eerlijk.
  voetballer: {
    top: [['voetbalshirt_effen', 100]],
    bottom: [['voetbalbroekje', 100]],
    legs: [['voetbalsokken', 100]],
    guard: [[null, 40], ['scheenbeschermers', 60]],
    shoes: [['noppen_basis', 100]],
  },
  feestganger: {
    top: [['blouse', 30], ['tshirt', 30], ['jurk', 20], ['clubshirt', 20]],
    outer: [[null, 85], ['zomerjas', 15]],
    bottom: [['korte_broek', 40], ['rok', 30], ['jeans', 30]],
    shoes: [['gympen', 100]],
    hat: [[null, 50], ['krans', 20], ['feestoren', 15], ['mutsje', 15]],
    wrist: [[null, 40], ['polsbandje', 60]],
    jewel: [[null, 50], ['kralen', 50]],
  },
};

// Kleurstemmingen voor NPC's: één stemming per figuur (uit zijn zaad), zodat shirt, broek en jas bij elkaar passen; elke kleur in de
// stemming weegt zwaar, de rest weegt 1 en komt af en toe als accent. Een stemming is een lijst paletkleuren (PALETTE).
export const NPC_MOODS = {
  aarde: ['bruin', 'donkerbruin', 'cognac', 'zand', 'kaki', 'olijf', 'roest', 'mosterd', 'creme', 'bos'],
  pastel: ['wit', 'ecru', 'lichtblauw', 'mint', 'roze', 'lichtgrijs', 'zand', 'geel', 'creme'],
  fel: ['felrood', 'oranje', 'geel', 'knalroze', 'turquoise', 'groen', 'blauw', 'paars', 'wit'],
  donker: ['zwart', 'diepzwart', 'antraciet', 'nachtblauw', 'marine', 'bordeaux', 'inktzwart', 'grijs', 'espresso'],
  koel: ['jeans', 'blauw', 'zeeblauw', 'marine', 'grijs', 'lichtgrijs', 'wit', 'saliegroen', 'turquoise'],
  neutraal: [],
};
export const MOOD_IDS = Object.keys(NPC_MOODS);
// Welke stemmingen bij welke rol passen (gewicht per stemming); een rol zonder regel gebruikt `standaard`.
export const ROLE_MOODS = {
  standaard: { neutraal: 30, aarde: 18, pastel: 14, fel: 14, donker: 14, koel: 18 },
  student: { fel: 30, aarde: 16, pastel: 16, koel: 20, donker: 12, neutraal: 6 },
  toerist: { fel: 34, pastel: 24, koel: 16, aarde: 14, neutraal: 12 },
  boer: { aarde: 60, koel: 18, neutraal: 22 },
  historisch: { aarde: 70, donker: 14, neutraal: 16 },
  zakenman: { donker: 46, koel: 26, neutraal: 28 },
  ambtenaar: { koel: 30, donker: 22, neutraal: 28, pastel: 12, aarde: 8 },
  wandelaar: { aarde: 38, koel: 26, fel: 16, neutraal: 20 },
  feestganger: { fel: 40, donker: 30, pastel: 12, koel: 10, aarde: 8 },
  sporter: { fel: 46, koel: 22, donker: 18, neutraal: 14 },
};
export const MOOD_WEIGHT = 7;     // gewicht van een kleur uit de stemming ten opzichte van de rest (1)
export const MOOD_ACCENT = 0.16;  // kans op een kleur buiten de stemming (een accent)
