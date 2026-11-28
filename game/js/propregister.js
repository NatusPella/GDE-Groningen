// Het ene register van de gedeelde props (23-11): wat in de wereld op straat staat en wat een cutscene als decor
// neerzet komt uit dezelfde bouwer, geregistreerd hier met een korte kwaliteitsnorm. Puur (geen three): de test
// scripts/propregister_test.mjs bouwt elke prop en houdt hem aan zijn norm; docs/AAA-OBJECTEN-23-11.md legt uit waarom.
//
// Een nieuwe prop komt hier in, met:
//   bouwer  de sleutel in propmodels3d.js (propGeometry(id)): één vertexkleur-geometrie, oorsprong op de grond, +x voorkant
//   norm    tris [min, max] driehoeken, kleuren (minimaal aantal verschillende vertexkleuren), maat [b, h, d] in m (+- 25 %),
//           en `eisen`: wat er aan detail aan moet zitten, zodat een kale doos of cilinder de test niet haalt
//   gebruik waar hij staat: 'stad' (cityprops.js), 'buiten' (streetfurniture3d.js), 'cutscene' (storyprops.js DECOR_MAKERS),
//           'straat' (de tijdelijke straatgebeurtenissen van streetevents3d.js en de gitaar van models3d_people.js)
//   lod     (vettruck 23-11, eis eigenaar: elk model 2-3 LOD-niveaus) { grenzen: [m, ...], band, weg }: lodlevels.js legt de
//           vorm uit; propGeometry(id, niveau) bouwt de lichtere niveaus, lod3d.js DitherLOD dithert de overgang
// Kwaliteitsnorm voor iedere prop: zichtbaar materiaalverschil (hout tegen staal, glas tegen kader), echte onderdelen
// (voet, rand, bevestiging) in plaats van één primitief, en een driehoekenbudget dat per cel samen te voegen of te instancen blijft.

import { LOD_KINDS } from './lodregistry.js';

export const PROP_REGISTER = {
  bank: {
    nl: 'Parkbank', bouwer: 'bank', gebruik: ['stad', 'buiten', 'cutscene'],
    norm: { tris: [200, 480], kleuren: 6, maat: [0.73, 0.96, 1.7], eisen: ['vier zitlatten met een eigen tint', 'drie hellende rugleuninglatten', 'gietijzeren zijstukken met armleuning en voetplaat', 'schroefkopjes'] },
  },
  afvalbak: {
    nl: 'Afvalbak', bouwer: 'afvalbak', gebruik: ['stad', 'cutscene'],
    norm: { tris: [180, 420], kleuren: 6, maat: [0.61, 1.0, 0.54], eisen: ['verjongde romp met banden', 'deksel met bolle kap en asbakje', 'donkere inworpklep met omlijsting', 'paal met beugels en voetplaat'] },
  },
  fietsenrek: {
    nl: 'Fietsenrek', bouwer: 'fietsenrek', gebruik: ['stad', 'cutscene'],
    norm: { tris: [200, 560], kleuren: 4, maat: [0.13, 0.47, 2.9], eisen: ['twee leggers', 'beugels met dop en voetje', 'grondplaat', 'wielgeleiders tussen de beugels'] },
  },
  bushokje: {
    nl: 'Bushokje', bouwer: 'bushokje', gebruik: ['buiten', 'cutscene'],
    norm: { tris: [380, 900], kleuren: 9, maat: [4.14, 2.76, 1.76], eisen: ['dak met rand en goot', 'glazen wanden in lijsten met een lichter weerspiegelvlak', 'zitbank', 'lichtbak met lijnkaart', 'haltepaal met rond bord en dienstregelingkastje'] },
  },
  autostoel: {
    nl: 'Autostoel', bouwer: 'autostoel', gebruik: ['voertuig'],
    norm: { tris: [150, 400], kleuren: 4, maat: [0.62, 0.9, 0.48], eisen: ['zitting met zijwangen die naar achteren zakt', 'schuine rugleuning met zijwangen', 'hoofdsteun op twee stangen', 'rails en onderstel'] },
  },
  dashboard: {
    nl: 'Dashboard met stuur', bouwer: 'dashboard', gebruik: ['voertuig'],
    norm: { tris: [250, 700], kleuren: 5, maat: [0.75, 0.48, 1.42], eisen: ['aflopende bovenkant en kap boven de meters', 'twee ronde meters en ventilatieroosters', 'middenconsole met radio en pook', 'stuur met spaak en naaf op een schuine kolom'] },
  },
  paaltje: {
    nl: 'Paaltje', bouwer: 'paaltje', gebruik: ['buiten', 'cutscene'],
    norm: { tris: [100, 260], kleuren: 4, maat: [0.23, 0.92, 0.23], eisen: ['rode romp met twee witte reflectiebanden', 'bolle kop', 'voetkraag'] },
  },
  // vettruck 23-11: het frituurvet van M07 als echte verpakking in plaats van losse gele bollen
  vetvat: {
    nl: 'Vat frituurvet (200 l)', bouwer: 'vetvat', gebruik: ['cutscene'], lod: { grenzen: [18, 50], band: 4, weg: 140 },
    norm: { tris: [180, 480], kleuren: 6, maat: [0.6, 0.9, 0.6], eisen: ['romp met twee rolringen', 'felsnaad boven en onder', 'verzonken deksel met een grote en een kleine stop', 'etiket'] },
  },
  jerrycan: {
    nl: 'Jerrycan frituurvet (20 l)', bouwer: 'jerrycan', gebruik: ['cutscene'], lod: { grenzen: [12, 35], band: 3, weg: 90 },
    norm: { tris: [80, 260], kleuren: 5, maat: [0.18, 0.51, 0.33], eisen: ['kunststof romp waar het vet doorheen schemert', 'verdiepte zijpanelen', 'greep op twee pootjes', 'schroefdop en etiket'] },
  },
  // de straatgebeurtenissen (#1316, streetevents.js): tijdelijk, één tegelijk, dichtbij de speler
  kraampje: {
    nl: 'Kraampje op de stoep', bouwer: 'kraampje', gebruik: ['straat'],
    norm: { tris: [450, 800], kleuren: 14, maat: [1.1, 2.11, 1.61], eisen: ['schraagtafel met een kleed dat voor afhangt, met plooien', 'twee palen met een gestreepte luifel en een geschulpte rand', 'krijtbordje met regels', 'spullen op tafel: kan met glazen, boeken, geldkistje'] },
  },
  ijscokar: {
    nl: 'IJscokar', bouwer: 'ijscokar', gebruik: ['straat'],
    norm: { tris: [550, 900], kleuren: 13, maat: [1.6, 2.26, 1.6], eisen: ['koelbak met band, menuvlak en vier smaken', 'twee deksels met handgreep', 'wielen met band en velg aan een as, duwbeugel, steunpoten', 'gestreepte parasol en een hoorntje als uithangbord'] },
  },
  gitaarkoffer: {
    nl: 'Open gitaarkoffer', bouwer: 'gitaarkoffer', gebruik: ['straat'],
    norm: { tris: [260, 460], kleuren: 7, maat: [0.46, 0.38, 0.97], eisen: ['bak met brede onderkant en smalle hals', 'rood fluweel binnenin en in het open deksel', 'slotjes en randen', 'munten en een briefje'] },
  },
  gitaar: {
    nl: 'Akoestische gitaar', bouwer: 'gitaar', gebruik: ['straat'],
    norm: { tris: [480, 800], kleuren: 7, maat: [0.11, 1.1, 0.38], eisen: ['klankkast met twee rondingen en een taille', 'klankgat met rozet en een kam', 'hals met toets en fretten', 'kop met stemmechanieken en zes snaren'] },
  },
  // huisraad van akte 1 dat de CC0-packs niet hebben (23-11): de tv in de flat, de frituurpan op het fornuis, de radio in de keuken
  tv: {
    nl: 'Platte tv', bouwer: 'tv', gebruik: ['interieur'],
    norm: { tris: [100, 260], kleuren: 6, maat: [0.26, 0.94, 1.42], eisen: ['smalle rand om een donker scherm', 'lichtere schuine weerspiegeling', 'voet met hals', 'aan-lampje en luidsprekerroosters'] },
  },
  frituurpan: {
    nl: 'Frituurpan', bouwer: 'frituurpan', gebruik: ['interieur'],
    norm: { tris: [220, 520], kleuren: 7, maat: [0.42, 0.42, 0.44], eisen: ['rvs-bak met donkere randen en voetrand', 'olie met twee manden en gaas', 'grepen naar voren', 'schuin open deksel met venster', 'draaiknop en lampje'] },
  },
  // de woonkamer van twee net-afgestudeerden (23-11, na beeldcontrole coördinator): boeken, was, dozen, prints, een laptop
  boekenkast: {
    nl: 'Boekenkast met boeken', bouwer: 'boekenkast', gebruik: ['interieur'],
    norm: { tris: [600, 2000], kleuren: 10, maat: [0.3, 1.8, 0.9], eisen: ['grenen kast met achterwand, plint en vijf planken', 'rijen boeken van wisselende dikte, hoogte en kleur met titelstreepjes', 'een liggend boek en gaten in de rij', 'een doos met een plantje erop naast een stapel tijdschriften'] },
  },
  droogrek: {
    nl: 'Droogrek met was', bouwer: 'droogrek', gebruik: ['interieur'],
    norm: { tris: [150, 500], kleuren: 6, maat: [0.66, 0.92, 1.24], eisen: ['twee paar schuine poten', 'zeven stangen', 'handdoek, shirts en sokken in verschillende kleuren'] },
  },
  verhuisdozen: {
    nl: 'Stapel verhuisdozen', bouwer: 'verhuisdozen', gebruik: ['interieur'],
    norm: { tris: [150, 400], kleuren: 6, maat: [0.6, 1.1, 0.6], eisen: ['drie dozen van verschillende maat', 'plakband, etiket met regel, handgrepen', 'bovenste doos met open flappen'] },
  },
  lijst: {
    nl: 'Ingelijste print', bouwer: 'lijst', gebruik: ['interieur'],
    norm: { tris: [80, 200], kleuren: 7, maat: [0.03, 0.56, 0.42], eisen: ['donkere lijst met passe-partout', 'verzonnen illustratie: toren en daken in een avondlucht', 'geen tekst of merk'] },
  },
  poster: {
    nl: 'Poster', bouwer: 'poster', gebruik: ['interieur'],
    norm: { tris: [150, 400], kleuren: 6, maat: [0.01, 0.7, 0.5], eisen: ['verzonnen ontwerp met vlakken en een fiets in lijnen', 'plakband op de hoeken', 'geen tekst of merk'] },
  },
  // de haven van M13 (#1328, containerterminal.js): een herkenbare loskade in plaats van kale dozen, cilinders en een kraan als blokje
  container20: {
    nl: 'Zeecontainer (20 voet)', bouwer: 'container20', gebruik: ['haven'],
    norm: { tris: [600, 1400], kleuren: 6, maat: [6.24, 2.59, 2.44], eisen: ['golfplaat met ribben op de lange zijden en de kopse kant', 'frame met hoekstijlen, regels en acht hoekstukken', 'twee deuren met naad, scharnieren, vier sluitstangen met hendels en nokhouders', 'typeplaatje en vorkgaten'] },
  },
  container40: {
    nl: 'Zeecontainer (40 voet)', bouwer: 'container40', gebruik: ['haven'],
    norm: { tris: [1100, 2400], kleuren: 5, maat: [12.37, 2.59, 2.44], eisen: ['golfplaat met ribben op de lange zijden en de kopse kant', 'frame met hoekstijlen, regels en acht hoekstukken', 'twee deuren met naad, scharnieren, vier sluitstangen met hendels en nokhouders', 'dak met dwarsdeuken'] },
  },
  havenkraan: {
    nl: 'Havenkraan met kraankooi', bouwer: 'havenkraan', gebruik: ['haven'],
    norm: { tris: [700, 1800], kleuren: 7, maat: [20.0, 12.4, 4.0], eisen: ['portaal op vier poten met voeten, balken en schoren', 'draaikrans met machinehuis, roosters en contragewicht met strepen', 'cabine met ramen rondom, bordes en leuning', 'bok met tuien en een vakwerkgiek', 'kabel met haakblok en een ladder langs een poot'] },
  },
  havenhek: {
    nl: 'Havenhek (gaaspaneel)', bouwer: 'havenhek', gebruik: ['haven'],
    norm: { tris: [300, 700], kleuren: 6, maat: [0.62, 2.04, 3.5], eisen: ['buizenframe', 'gaas van staanders en liggers', 'twee betonnen voeten', 'bordje'] },
  },
  lichtmast: {
    nl: 'Lichtmast', bouwer: 'lichtmast', gebruik: ['haven'],
    norm: { tris: [120, 360], kleuren: 5, maat: [1.4, 10.25, 0.9], eisen: ['betonpoer met voetplaat en bouten', 'taps toelopende mast met luikje', 'kopbalk met vier schuine schijnwerpers en lichte lenzen'] },
  },
  heftruck: {
    nl: 'Heftruck', bouwer: 'heftruck', gebruik: ['haven'],
    norm: { tris: [400, 1000], kleuren: 8, maat: [3.5, 2.5, 1.2], eisen: ['chassis met contragewicht en motorkap', 'stoel, stuur en een kooi met roosterdak', 'hefmast met regels, vorkbord en twee vorken', 'wielen met naven, achterlichten en werklamp'] },
  },
  kabelhaspel: {
    nl: 'Kabelhaspel', bouwer: 'kabelhaspel', gebruik: ['haven'],
    norm: { tris: [500, 1100], kleuren: 5, maat: [2.6, 2.4, 2.2], eisen: ['twee houten flenzen met planknaden', 'opgerolde kabel met windingen', 'as-einden en een los kabeleinde'] },
  },
  bolder: {
    nl: 'Bolder', bouwer: 'bolder', gebruik: ['haven'],
    norm: { tris: [80, 220], kleuren: 4, maat: [0.6, 0.71, 0.6], eisen: ['voetplaat met bouten', 'gietijzeren paal', 'kraag en kop'] },
  },
  laptop: {
    nl: 'Laptop', bouwer: 'laptop', gebruik: ['interieur'],
    norm: { tris: [50, 140], kleuren: 5, maat: [0.29, 0.22, 0.33], eisen: ['onderkant met toetsenbord en trackpad', 'scherm schuin achterover met een licht beeld', 'scharnier en camerapuntje'] },
  },
  buisradio: {
    nl: 'Buisradio', bouwer: 'buisradio', gebruik: ['interieur'],
    norm: { tris: [160, 420], kleuren: 7, maat: [0.17, 0.38, 0.31], eisen: ['houten kast met gewelfd dak en plint', 'luidsprekerstof met lijsten en messing bies', 'groen afstemvenster met naald', 'twee knoppen', 'antenne'] },
  },
  // het carbidveld van boer Roelf (24-11, feedback eigenaar: carbidschieten moet zonder ondertitel herkenbaar zijn): de bouwers staan
  // in carbidprops3d.js; carbid.js (het veld), carbidintro.js (de intro) en de trailershot gebruiken ze
  melkbus: {
    nl: 'Melkbus (liggend, carbid)', bouwer: 'melkbus', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [600, 1000], kleuren: 6, maat: [0.68, 0.37, 0.34], eisen: ['gedraaide romp met voetrand, twee banden, schouder en hals met kraag', 'open mond met donker binnenwerk (het deksel zit los)', 'twee oren', 'ontsteekgaatje bij de bodem', 'roestplekken'] },
  },
  busdeksel: {
    nl: 'Deksel van de melkbus', bouwer: 'busdeksel', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [200, 420], kleuren: 4, maat: [0.23, 0.11, 0.24], eisen: ['schotel met opstaande rand', 'bolle kap', 'beugel op twee voetjes', 'binnenrand aan de onderkant'] },
  },
  carbidbok: {
    nl: 'Houten bok voor de melkbus', bouwer: 'carbidbok', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [200, 400], kleuren: 5, maat: [0.65, 0.56, 0.55], eisen: ['twee schragen met gespreide poten', 'V-vormige wieg voor de romp', 'regel onderlangs en schoren', 'spie onder de voorkant', 'bouten'] },
  },
  carbidspul: {
    nl: 'Emmer water en blik carbid', bouwer: 'carbidspul', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [380, 650], kleuren: 8, maat: [0.53, 0.43, 0.32], eisen: ['zinken emmer met rand, band, hengsel en water', 'blik met deksel, rode band en witte bies', 'lepel', 'gemorste brokjes carbid'] },
  },
  lontstok: {
    nl: 'Lontstok (fakkel op een stok)', bouwer: 'lontstok', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [120, 260], kleuren: 5, maat: [2.06, 0.07, 0.07], eisen: ['lange taps toelopende stok', 'greep van tape', 'omwikkelde lap met ijzerdraad', 'gloeiende punt'] },
  },
  gehoorkap: {
    nl: 'Gehoorkappen', bouwer: 'gehoorkap', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [250, 480], kleuren: 4, maat: [0.1, 0.21, 0.31], eisen: ['gebogen hoofdband met kussen', 'twee gele kappen', 'zwarte oorkussens', 'draaipunten'] },
  },
  koffietafel: {
    nl: 'Klaptafel met koffie', bouwer: 'koffietafel', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [700, 1200], kleuren: 10, maat: [0.7, 1.12, 1.32], eisen: ['geruit tafelzeil met overhang', 'schragenpoten in een X met regels', 'thermoskan met dop-beker en handvat', 'vier mokken met koffie en een oor', 'koektrommel en krant'] },
  },
  hooibaal: {
    nl: 'Ronde baal hooi', bouwer: 'hooibaal', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [800, 1200], kleuren: 5, maat: [1.36, 1.41, 1.24], eisen: ['rol met strovlekken', 'spiraal op de kopse kanten', 'netbanden om de omtrek', 'uitstekende strootjes'] },
  },
  weidehek: {
    nl: 'Weidehek (gegalvaniseerd)', bouwer: 'weidehek', gebruik: ['cutscene', 'activiteit'],
    norm: { tris: [160, 320], kleuren: 5, maat: [0.18, 1.43, 4.22], eisen: ['twee eiken palen met een kapje', 'vijf regels in twee tinten', 'stijlen en een schoor', 'scharnieren en een sluitketting'] },
  },
  // het Groningse erf (24-11, na de carbidbeelden: geen Amerikaanse schuur); bouwers in erfgebouwen3d.js. Gebouwen en wagens zijn
  // groter dan decor in een cutscene mag zijn (storyprops.js DECOR_BUDGET maxDim): alleen 'activiteit' (carbidset.js)
  kophalsromp: {
    nl: 'Groningse kop-hals-rompboerderij', bouwer: 'kophalsromp', gebruik: ['activiteit'],
    norm: { tris: [1100, 2000], kleuren: 10, maat: [48.65, 14.69, 24.68], eisen: ['woonhuis (kop) van baksteen met plint, speklaag, wit gootlijsten en donker pannendak met de nok dwars', 'voorgevel met roedenramen, groene voordeur met bovenlicht en stoep; schoorstenen op de nok', 'lage hals met eigen dak, deur en raam', 'schuur (romp) met lage muren en een hoog rood pannendak met wolfseinden, nokvorsten, goten en uilenborden', 'groen-witte baanderdeuren met een staldeur ernaast; gietijzeren stalraampjes'] },
  },
  werktuigloods: {
    nl: 'Werktuigenloods met inrichting', bouwer: 'werktuigloods', gebruik: ['activiteit'],
    norm: { tris: [700, 1300], kleuren: 15, maat: [10.9, 7.2, 14.9], eisen: ['stalen wanden op een gemetselde voet, golfplaatribben, zadeldak', 'half open schuifdeur met rail en greep', 'lichte binnenwanden en een betonvloer', 'trekkerband met velg, werkbank met bankschroef, gereedschapsbord, jerrycans en olievat', 'lamp onder de nok'] },
  },
  balenwagen: {
    nl: 'Balenwagen', bouwer: 'balenwagen', gebruik: ['activiteit'],
    norm: { tris: [450, 800], kleuren: 6, maat: [7.56, 2.63, 2.52], eisen: ['laadvloer van planken in twee tinten', 'chassisbalken en rode randbalk', 'vier wielen met velg op assen', 'dissel met trekoog', 'rek voorop'] },
  },
  // straatdetail (28-11, #1353): wijken en dorpen; bouwers in streetdetailprops3d.js, geplaatst door streetdetail.js
  klikogrijs: {
    nl: 'Kliko (grijs, restafval)', bouwer: 'klikogrijs', gebruik: ['buiten'],
    norm: { tris: [180, 330], kleuren: 9, maat: [0.78, 1.05, 0.62], eisen: ['romp in twee trappen die naar onderen smaller wordt', 'deksel met scharnierbalk en greep', 'twee wielen op een as', 'etiket en groef vooraan'] },
  },
  klikogroen: {
    nl: 'Kliko (groen, gft)', bouwer: 'klikogroen', gebruik: ['buiten'],
    norm: { tris: [180, 330], kleuren: 9, maat: [0.78, 1.05, 0.62], eisen: ['romp in twee trappen die naar onderen smaller wordt', 'deksel met scharnierbalk en greep', 'twee wielen op een as', 'etiket en groef vooraan'] },
  },
  klikoblauw: {
    nl: 'Kliko (blauw, papier)', bouwer: 'klikoblauw', gebruik: ['buiten'],
    norm: { tris: [180, 330], kleuren: 9, maat: [0.78, 1.05, 0.62], eisen: ['romp in twee trappen die naar onderen smaller wordt', 'deksel met scharnierbalk en greep', 'twee wielen op een as', 'etiket en groef vooraan'] },
  },
  fietszwart: {
    nl: 'Fiets (zwart met mand)', bouwer: 'fietszwart', gebruik: ['buiten'],
    norm: { tris: [580, 950], kleuren: 10, maat: [1.81, 1.27, 0.63], eisen: ['twee wielen met band, velg, naaf en spaken', 'frame van buizen met zadel en stuur', 'spatborden, jasbeschermer en bagagedrager', 'koplamp, achterlicht en standaard'] },
  },
  fietsrood: {
    nl: 'Fiets (rood)', bouwer: 'fietsrood', gebruik: ['buiten'],
    norm: { tris: [560, 920], kleuren: 10, maat: [1.81, 1.03, 0.63], eisen: ['twee wielen met band, velg, naaf en spaken', 'frame van buizen met zadel en stuur', 'spatborden, jasbeschermer en bagagedrager', 'koplamp, achterlicht en standaard'] },
  },
  fietsblauw: {
    nl: 'Fiets (blauw)', bouwer: 'fietsblauw', gebruik: ['buiten'],
    norm: { tris: [560, 920], kleuren: 10, maat: [1.81, 1.03, 0.63], eisen: ['twee wielen met band, velg, naaf en spaken', 'frame van buizen met zadel en stuur', 'spatborden, jasbeschermer en bagagedrager', 'koplamp, achterlicht en standaard'] },
  },
  lattenhek: {
    nl: 'Lattenhekje', bouwer: 'lattenhek', gebruik: ['buiten'],
    norm: { tris: [280, 480], kleuren: 5, maat: [0.09, 0.94, 2.07], eisen: ['twaalf spitse latten met een eigen tint', 'twee regels aan de achterkant', 'palen met een kopje', 'grondstrook'] },
  },
  schutting: {
    nl: 'Schutting', bouwer: 'schutting', gebruik: ['buiten'],
    norm: { tris: [120, 220], kleuren: 7, maat: [0.11, 1.86, 2.1], eisen: ['betonnen onderplaat', 'zeven liggende planken in vijf tinten', 'betonpalen met een kap', 'afdeklijst'] },
  },
  tuinpad: {
    nl: 'Tuinpad (tegels)', bouwer: 'tuinpad', gebruik: ['buiten'],
    norm: { tris: [110, 220], kleuren: 5, maat: [0.9, 0.03, 1], eisen: ['voegbed', 'vier rijen van drie tegels', 'tintverschil per tegel'] },
  },
  plantenbak: {
    nl: 'Plantenbak met bloeiende heesters', bouwer: 'plantenbak', gebruik: ['buiten'],
    norm: { tris: [260, 480], kleuren: 9, maat: [0.5, 0.9, 1.06], eisen: ['houten bak met hoekstijlen', 'afdeklijst en aarde', 'drie heesters in groentinten', 'bloeiende toppen in vier kleuren'] },
  },
  kabelkast: {
    nl: 'Kabelkast', bouwer: 'kabelkast', gebruik: ['buiten'],
    norm: { tris: [110, 220], kleuren: 6, maat: [0.36, 1.32, 0.8], eisen: ['betonnen sokkel', 'dak met overstek', 'twee deuren met ventilatiesleuven', 'slotkastje en waarschuwingsplaatje'] },
  },
  afvalzuil: {
    nl: 'Afvalzuil (ondergrondse container)', bouwer: 'afvalzuil', gebruik: ['buiten'],
    norm: { tris: [300, 520], kleuren: 8, maat: [0.9, 1.13, 1.95], eisen: ['dekplaat', 'drie zuilen in grijs, blauw en groen met kap', 'inworpklep met greep', 'pictogramvlak'] },
  },
  bord30: {
    nl: 'Verkeersbord zone 30', bouwer: 'bord30', gebruik: ['buiten'],
    norm: { tris: [260, 460], kleuren: 5, maat: [0.1, 2.42, 0.6], eisen: ['stalen paal met kap', 'rode rand en witte schijf', 'het getal 30 in zeven segmenten', 'beugel en grijze achterkant'] },
  },
  voorrangsbord: {
    nl: 'Voorrangsbord', bouwer: 'voorrangsbord', gebruik: ['buiten'],
    norm: { tris: [80, 160], kleuren: 5, maat: [0.51, 2.32, 0.66], eisen: ['stalen paal met kap', 'gele ruit met witte en zwarte rand', 'beugel en grijze achterkant'] },
  },
  bermpaal: {
    nl: 'Bermpaal', bouwer: 'bermpaal', gebruik: ['buiten'],
    norm: { tris: [50, 110], kleuren: 3, maat: [0.13, 1.08, 0.17], eisen: ['witte romp met afgeschuinde kop', 'rode reflectoren aan twee kanten', 'zwarte voetstrook en band'] },
  },
  rietpol: {
    nl: 'Rietpol', bouwer: 'rietpol', gebruik: ['buiten'],
    norm: { tris: [100, 220], kleuren: 5, maat: [0.65, 2.03, 0.64], eisen: ['negen bladeren in drie groentinten', 'pluimen', 'grondkluit'] },
  },
};

export const PROP_IDS = Object.keys(PROP_REGISTER);
export const propLodSpec = (id) => (PROP_REGISTER[id] && PROP_REGISTER[id].lod) || null;
export const propNorm = (id) => (PROP_REGISTER[id] ? PROP_REGISTER[id].norm : null);
export const isRegisteredProp = (id) => Object.prototype.hasOwnProperty.call(PROP_REGISTER, id);
// De soorten die een cutscene als decor mag noemen en uit dit register komen (cutscenemodels.js DECOR_KINDS neemt ze over).
export const CUTSCENE_PROPS = PROP_IDS.filter((id) => PROP_REGISTER[id].gebruik.includes('cutscene'));

// De opgewaardeerde voertuigen staan in het voertuigregister (vehicle.js, vehicleregister.js); hier hun kwaliteitsnorm, zodat de
// lat voor een voertuig op dezelfde plek staat als die voor een prop. tris: driehoeken van het hele gebouwde model (romp en
// wielen), kleuren: verschillende vertexkleuren in de romp. propregister_test.mjs bouwt ze met buildVehicleMesh.
// De norm voor een personenauto (eigenaar 23-11): lengte 4,2-4,8 m, breedte 1,75-1,85, hoogte 1,40-1,50 (SUV 1,65-1,75), wielbasis
// 2,6-2,8, wieldiameter rond 0,65; een volwassene van 1,78 m past erin (hoofd onder het dak, een deuropening van minstens 0,95 m).
// De LOD-opgave van alle voertuigmodellen komt uit het centrale LOD-register (lodregistry.js, soort 'vehicle'): één systeem.
export const VOERTUIG_LOD = LOD_KINDS.vehicle.lod;
export const VOERTUIG_NORM = { len: [4.2, 4.8], wid: [1.75, 1.85], hoog: [1.4, 1.5], hoogSuv: [1.65, 1.75], wielbasis: [2.6, 2.8], wielDiameter: [0.58, 0.75], deurHoogte: 0.95, persoon: 1.78 };
// 23-11: 7.500 met het interieur uit het register (vier autostoelen en het dashboard, ca. 1.500 driehoeken; alleen op LOD-niveau 0)
const HYB_NORM = { tris: [1800, 7500], kleuren: 6, eisen: ['carrosserie uit het CC0-pakket, in lakkleur van het voertuig', 'echt gat in de flank met de uitgeknipte romp als deur (dikte, binnenkant), deurstijlen en dorpel', 'eenvoudig interieur achter de opening', 'onze wielen die draaien en sturen', 'koplampen en achterlichten in de lampgroep, schade met losse delen en hangende bumpers'] };
// de getekende maat van een hybride (null als het geen hybride is)
export const hybrideSchaal = (key) => { for (const e of Object.values(VOERTUIG_REGISTER)) if (e.hybride === key) return e.schaal; return null; };

export const VOERTUIG_REGISTER = {
  trekkerlimo: {
    nl: 'Trekker-limo van Jelle', model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: 0x141414 },
    norm: { tris: [4000, 9000], kleuren: 20, eisen: ['trekkerkop met grille, ronde koplampen en noppenbanden', 'limousine met wielkasten, C-stijl, schuine achterruit en afgerond dak met schuifdak', 'kofferdeksel in lak met chromen strip, geel kenteken zonder tekens', 'conferentie-interieur met barkastje', 'deurnaden, sturende voorwielen, hoogglanslak'] },
  },
  truck: {
    nl: 'Bakwagen', model: { name: 'truck', len: 8.5, wid: 2.5, color: 0xe8e6e0 },
    norm: { tris: [3500, 7000], kleuren: 10, eisen: ['afgeronde laadbak met ribbels, aluminium randen en hoekstijlen', 'achterdeuren met scharnieren, sluitstangen en hendels', 'onderrijbeveiliging achter en opzij', 'kantelcabine met wielkast, raked voorruit, spiegels, grille en koplampen', 'cabinedeur met zijraam (echt deurgat)', 'chassis met tank, assen en dikke wielen met velg'] },
  },
  // De hybride auto's (23-11): de Quaternius-romp (CC0) met onze functies. `schaal` is de getekende maat in meter (lengte, breedte,
  // hoogte van de romp zonder daklicht of taxibord); de romp wordt daarop geschaald (zie VOERTUIG_NORM en voertuigschaal_test.mjs).
  hybrideSedan: { nl: 'Sedan (hybride)', model: { name: 'sedan', len: 4.3, wid: 1.8, color: 0x90b0d1 }, hybride: 'sedan', schaal: { len: 4.5, wid: 1.8, hoog: 1.45 }, norm: HYB_NORM },
  hybrideHatch: { nl: 'Hatchback (hybride)', model: { name: 'hatch', len: 3.8, wid: 1.7, color: 0x5a7392 }, hybride: 'hatch', schaal: { len: 4.33, wid: 1.78, hoog: 1.45 }, norm: HYB_NORM },
  hybrideSuv: { nl: 'SUV (hybride)', model: { name: 'suv', len: 4.7, wid: 1.95, color: 0x23262a }, hybride: 'suv', schaal: { len: 4.55, wid: 1.85, hoog: 1.7 }, norm: HYB_NORM },
  hybrideWagon: { nl: 'Stationwagen (hybride)', model: { name: 'wagon', len: 4.5, wid: 1.8, color: 0x6e937c }, hybride: 'wagon', schaal: { len: 4.5, wid: 1.8, hoog: 1.5 }, norm: HYB_NORM }, // de SUV-romp op wagenhoogte, met dakrails en spoiler (vehicle_wagon.js)
  hybrideSport: { nl: 'Sportauto (hybride)', model: { name: 'sport', len: 4.1, wid: 1.85, color: 0xb93a32, qcar: 'sport' }, hybride: 'sport', schaal: { len: 4.25, wid: 1.82, hoog: 1.42 }, norm: HYB_NORM },
  hybrideSport2: { nl: 'Sportauto 2 (hybride)', model: { name: 'sport', len: 4.1, wid: 1.85, color: 0xe8e6e0, qcar: 'sport2' }, hybride: 'sport2', schaal: { len: 4.25, wid: 1.82, hoog: 1.42 }, norm: HYB_NORM },
  hybrideEscapade: { nl: 'Fjord Escapade (hybride)', model: { name: 'escort', len: 4.0, wid: 1.65, color: '#a11f1f', qcar: 'escapade' }, hybride: 'escapade', schaal: { len: 4.0, wid: 1.65, hoog: 1.4 }, maatNorm: { len: [3.9, 4.1], wid: [1.6, 1.7], wielbasis: [2.35, 2.55] }, norm: HYB_NORM }, // een oude compacte hatchback: de botsmaat van het verhaal (4,0 x 1,65)
  hybrideTaxi: { nl: 'Taxi (hybride)', model: { name: 'taxi', len: 4.6, wid: 1.8, color: 0xe8c93a }, isTaxi: true, hybride: 'taxi', schaal: { len: 4.5, wid: 1.8, hoog: 1.45 }, norm: HYB_NORM },
  hybridePolitie: { nl: 'Politieauto (hybride)', model: { name: 'police', len: 4.3, wid: 1.8, color: 0x1c1c1c }, isPolice: true, hybride: 'police', schaal: { len: 4.3, wid: 1.8, hoog: 1.45 }, norm: HYB_NORM },
  // vettruck 23-11: de tankwagen van Us Mem Vet (M07, de cutscenes, de trailer en de winkel), opnieuw gebouwd in plaats van drie
  // gestapelde dozen op de bakwagen. Rijgedrag: vehicle/heavyload.js.
  tankwagen: {
    nl: 'Tankwagen Us Mem Vet', model: { name: 'truck', tank: true, livery: 'usmemvet', len: 8.5, wid: 2.5, color: 0x2f4fa8 },
    // niveau 0 vol detail (ook in de trailershot, die op 50 m begint), 1 tank en cabine met belettering, 2 silhouet met wielblokken
    lod: { grenzen: [60, 160], band: 8 },
    norm: { tris: [3500, 8000], kleuren: 24, eisen: ['elliptische rvs-tank met gebolde koppen en spanbanden', 'loopbrug met dekselputten, ontluchting en neergeklapte leuning', 'ladder achter, aftapkraan met handwiel, lichtbalk en onderrijbeveiliging', 'kantelcabine met wielkast, grille, zonneklep, dakspoiler, spiegels en opstap', 'dubbellucht achter, pompkast, dieseltank, slangkokers en zijbeveiliging', 'gebogen belettering van het verzonnen merk, deurnaden'] },
  },
};
// De botsmaat volgt de getekende maat (23-11): een gewone personenauto die als hybride getekend wordt (hybridKey in
// models3d_vehicles.js: geen roest, elektrisch, tokkie, belettering of model.hybride === false), botst met de lengte en breedte uit het
// register. Puur, zodat vehicle.js het bij het bouwen van een Vehicle kan toepassen. null: de maat van het model blijft.
const HYB_PER_NAAM = { escort: 'escapade', wagon: 'wagon', sedan: 'sedan', hatch: 'hatch', suv: 'suv', sport: 'sport', taxi: 'taxi', police: 'police' };
export function getekendeMaat(model) {
  if (!model || model.hybride === false || model.rusty || model.electric || model.tokkie || model.livery) return null;
  const key = model.qcar || HYB_PER_NAAM[model.name];
  return key ? hybrideSchaal(key) : null;
}
export const VOERTUIG_IDS = Object.keys(VOERTUIG_REGISTER);

// --- Interieur: meubels en huisraad uit de CC0-packs van Quaternius (23-11, akte 1 op eindniveau) ---------------------------------
// Bron: Ultimate House Interior Pack en Ultimate Furniture Pack (Quaternius, CC0; zie docs/MEUBEL-LICENTIES.md en ADR 0050).
// scripts/akte1/meubels_converteer.mjs leest de glb's (buiten git), bakt de materiaalkleuren in vertexkleuren (één materiaal; alleen
// lampkappen gloeien en glas is doorzichtig), zet de voorkant op +x en de oorsprong midden op de grond, en schrijft het model naar
// game/js/interiorprops_data.js. De LOD's (eis eigenaar 23-11: elk model) maakt het centrale LOD-systeem: interiorprops3d.js geeft elk
// geplaatst meubel aan lodkit3d.js makeLodObject met de soort 'interior' van lodregistry.js (afstanden, dither, weg-afstand).
//   bron    { pack: 'home' | 'furniture', bestand }    voor  de richting van de voorkant in de glb na Y-omhoog ('+z', '-z', '+x', '-x')
//   norm    tris [min, max] van lod 0, kleuren (minimaal aantal vertexkleuren), maat [b, h, d] in m na schalen (+- 25 %)
//   gebruik de ruimtes van akte 1 waar hij staat ('keuken': de opening, introkitchen3d.js; 'flat': home3d.js buildFlat3D)
//   echt    de functionele maat die het meubel in het echt heeft, en hoe de test hem meet (scripts/interiorprops_test.mjs):
//           'top' de bovenkant, 'zit' het hoogste vlak dat omhoog wijst in de voorste helft (zitting, matras), 'mat' de bovenkant van
//           één materiaal van de glb (het werkblad). Normen van de eigenaar (23-11): deur 2,0-2,1, aanrecht 0,9, tafel 0,75, stoelzitting
//           0,45, bankzitting 0,42, bed 0,5, koelkast 1,8, plafond 2,6 m; personages zijn ~1,78 m.
// De importschaal ligt per pack vast (PACK_SCHAAL: de huisraadpack is ongeveer twee keer te groot, een deur van 4,2 m); een meubel
// wijkt daar alleen van af met een correctie en een reden (Q(..., correctie, waarom)), en de test houdt elk meubel aan zijn echte maat.
// Gemeten tegen de normen (23-11): huisraad 0,55 (aanrecht 0,89, fornuis 0,88, koelkast 1,82 m), meubels 0,85 (tafel 0,70, stoelzitting
// 0,49, bureau 0,78 m). Binnen één pack wijken de modellen tot 25 % van elkaar af; die krijgen een correctie met reden.
export const PACK_SCHAAL = { home: 0.55, furniture: 0.85 };
const Q = (pack, bestand, correctie = 1, waarom = null) => ({ pack, bestand, schaal: +(PACK_SCHAAL[pack] * correctie).toFixed(4), correctie, waarom, voor: '+z' });
const N = (tris, kleuren, maat) => ({ tris, kleuren, maat });
export const INTERIEUR_REGISTER = {
  keukenkast: { nl: 'Keukenkastje met spoelbak', bron: Q('home', 'Kitchen Sink.glb'), gebruik: ['keuken', 'flat'], norm: N([350, 560], 4, [0.63, 1.08, 0.57]), echt: { soort: 'mat', mat: 'KitchenTop', h: 0.9 } },
  fornuis: { nl: 'Fornuis met oven', bron: Q('home', 'Oven.glb'), gebruik: ['keuken', 'flat'], norm: N([420, 640], 5, [0.6, 0.89, 0.66]), echt: { soort: 'top', h: 0.9 } },
  koelkast: { nl: 'Koelkast', bron: Q('home', 'Kitchen Fridge.glb'), gebruik: ['keuken', 'flat'], norm: N([320, 500], 2, [0.73, 1.85, 0.73]), echt: { soort: 'top', h: 1.8 } },
  deur: { nl: 'Binnendeur', bron: Q('home', 'Door-LI93WgnjyS.glb', 0.89, 'de deur is in de pack groter dan de rest: 2,30 m'), gebruik: ['keuken'], norm: N([360, 560], 2, [0.21, 2.05, 0.85]), echt: { soort: 'top', h: 2.05 } },
  keukentafel: { nl: 'Houten tafel', bron: Q('furniture', 'Table.glb'), gebruik: ['keuken', 'flat'], norm: N([880, 1330], 2, [2.36, 0.7, 1.21]), echt: { soort: 'top', h: 0.75 } },
  keukenstoel: { nl: 'Houten stoel met kussen', bron: Q('furniture', 'Chair.glb'), gebruik: ['keuken', 'flat'], norm: N([580, 890], 2, [0.54, 0.91, 0.43]), echt: { soort: 'zit', h: 0.45 } },
  raam: { nl: 'Raamkozijn met glas', bron: Q('home', 'Window Large.glb'), gebruik: ['keuken'], norm: N([300, 450], 2, [0.08, 0.95, 1.02]) },
  hanglamp: { nl: 'Hanglamp', bron: Q('home', 'Light Ceiling.glb'), gebruik: ['keuken'], norm: N([210, 330], 3, [0.3, 0.4, 0.3]) },
  kamerplant: { nl: 'Kamerplant in een pot', bron: Q('home', 'Houseplant-bfLOqIV5uP.glb'), gebruik: ['keuken', 'flat'], norm: N([360, 540], 3, [0.68, 0.49, 0.66]) },
  cactus: { nl: 'Cactus in een pot', bron: Q('home', 'Cactus.glb'), gebruik: ['keuken', 'flat'], norm: N([330, 500], 4, [0.19, 0.47, 0.19]) },
  wandplank: { nl: 'Wandplank', bron: Q('home', 'Shelf Small.glb'), gebruik: ['keuken'], norm: N([100, 160], 1, [0.31, 0.32, 1.09]) },
  prullenbak: { nl: 'Pedaalemmer', bron: Q('home', 'Trashcan Small.glb'), gebruik: ['keuken', 'flat'], norm: N([200, 320], 2, [0.17, 0.4, 0.28]) },
  vloerkleed: { nl: 'Vloerkleed', bron: Q('home', 'Rug.glb'), gebruik: ['keuken', 'flat'], norm: N([80, 140], 2, [1.73, 0.02, 1.19]) },
  zitbank: { nl: 'Driezitsbank', bron: Q('home', 'Couch Medium.glb', 0.76, 'de bank is in de pack te groot: zitting 0,55 m en 2,5 m lang'), gebruik: ['flat'], norm: N([700, 1060], 2, [0.84, 0.82, 1.89]), echt: { soort: 'zit', h: 0.42 } },
  salontafel: { nl: 'Ronde bijzettafel', bron: Q('home', 'Table Round Small-57W671WvS2.glb'), gebruik: ['flat'], norm: N([470, 720], 1, [1.09, 0.64, 1.09]) },
  ladekast: { nl: 'Ladekast (tv-meubel)', bron: Q('home', 'Drawer.glb'), gebruik: ['flat'], norm: N([320, 490], 3, [0.63, 0.76, 1.56]) },
  wasmachine: { nl: 'Wasmachine', bron: Q('home', 'Washing Machine.glb'), gebruik: ['keuken', 'flat'], norm: N([250, 370], 3, [0.73, 0.81, 0.71]), echt: { soort: 'top', h: 0.85 } },
  bed: { nl: 'Eenpersoonsbed', bron: Q('home', 'Bed Single.glb', 1.05, 'het bed is in de pack laag: matras op 0,44 m'), gebruik: ['flat'], norm: N([430, 650], 5, [2.28, 0.78, 1.14]), echt: { soort: 'zit', h: 0.5 } },
  nachtkastje: { nl: 'Nachtkastje', bron: Q('home', 'Night Stand.glb'), gebruik: ['flat'], norm: N([140, 230], 2, [0.53, 0.53, 0.53]), echt: { soort: 'top', h: 0.55 } },
  kledingkast: { nl: 'Kledingkast', bron: Q('furniture', 'Closet.glb', 0.79, 'de kast is in de pack 2,5 m hoog: te hoog voor een plafond van 2,6 m'), gebruik: ['flat'], norm: N([2400, 3600], 3, [0.58, 2.0, 1.04]), echt: { soort: 'top', h: 2.0 } },
  tafellamp: { nl: 'Tafellamp', bron: Q('home', 'Light Floor.glb'), gebruik: ['flat'], norm: N([190, 300], 2, [0.24, 0.5, 0.22]) },
  vloerlamp: { nl: 'Staande lamp', bron: Q('home', 'Light Stand.glb'), gebruik: ['flat'], norm: N([190, 300], 2, [0.4, 1.7, 0.4]), echt: { soort: 'top', h: 1.6 } },
  bureau: { nl: 'Bureau met lades', bron: Q('furniture', 'Desk.glb'), gebruik: ['flat'], norm: N([2100, 3200], 2, [0.72, 0.78, 1.55]), echt: { soort: 'top', h: 0.76 } },
};
export const INTERIEUR_IDS = Object.keys(INTERIEUR_REGISTER);
export const isInterieurProp = (id) => Object.prototype.hasOwnProperty.call(INTERIEUR_REGISTER, id);
