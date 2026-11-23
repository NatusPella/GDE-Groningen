// Het ene register van de gedeelde props (23-11): wat in de wereld op straat staat en wat een cutscene als decor
// neerzet komt uit dezelfde bouwer, geregistreerd hier met een korte kwaliteitsnorm. Puur (geen three): de test
// scripts/propregister_test.mjs bouwt elke prop en houdt hem aan zijn norm; docs/AAA-OBJECTEN-23-11.md legt uit waarom.
//
// Een nieuwe prop komt hier in, met:
//   bouwer  de sleutel in propmodels3d.js (propGeometry(id)): één vertexkleur-geometrie, oorsprong op de grond, +x voorkant
//   norm    tris [min, max] driehoeken, kleuren (minimaal aantal verschillende vertexkleuren), maat [b, h, d] in m (+- 25 %),
//           en `eisen`: wat er aan detail aan moet zitten, zodat een kale doos of cilinder de test niet haalt
//   gebruik waar hij staat: 'stad' (cityprops.js), 'buiten' (streetfurniture3d.js), 'cutscene' (storyprops.js DECOR_MAKERS)
// Kwaliteitsnorm voor iedere prop: zichtbaar materiaalverschil (hout tegen staal, glas tegen kader), echte onderdelen
// (voet, rand, bevestiging) in plaats van één primitief, en een driehoekenbudget dat per cel samen te voegen of te instancen blijft.

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
  paaltje: {
    nl: 'Paaltje', bouwer: 'paaltje', gebruik: ['buiten', 'cutscene'],
    norm: { tris: [100, 260], kleuren: 4, maat: [0.23, 0.92, 0.23], eisen: ['rode romp met twee witte reflectiebanden', 'bolle kop', 'voetkraag'] },
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
    norm: { tris: [600, 2000], kleuren: 10, maat: [0.3, 1.8, 0.9], eisen: ['grenen kast met achterwand, plint en vijf planken', 'rijen boeken van wisselende dikte, hoogte en kleur met titelstreepjes', 'een liggend boek en gaten in de rij', 'doos, plantje en tijdschriften'] },
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
  laptop: {
    nl: 'Laptop', bouwer: 'laptop', gebruik: ['interieur'],
    norm: { tris: [50, 140], kleuren: 5, maat: [0.29, 0.22, 0.33], eisen: ['onderkant met toetsenbord en trackpad', 'scherm schuin achterover met een licht beeld', 'scharnier en camerapuntje'] },
  },
  buisradio: {
    nl: 'Buisradio', bouwer: 'buisradio', gebruik: ['interieur'],
    norm: { tris: [160, 420], kleuren: 7, maat: [0.17, 0.38, 0.31], eisen: ['houten kast met gewelfd dak en plint', 'luidsprekerstof met lijsten en messing bies', 'groen afstemvenster met naald', 'twee knoppen', 'antenne'] },
  },
};

export const PROP_IDS = Object.keys(PROP_REGISTER);
export const propNorm = (id) => (PROP_REGISTER[id] ? PROP_REGISTER[id].norm : null);
export const isRegisteredProp = (id) => Object.prototype.hasOwnProperty.call(PROP_REGISTER, id);
// De soorten die een cutscene als decor mag noemen en uit dit register komen (cutscenemodels.js DECOR_KINDS neemt ze over).
export const CUTSCENE_PROPS = PROP_IDS.filter((id) => PROP_REGISTER[id].gebruik.includes('cutscene'));

// De opgewaardeerde voertuigen staan in het voertuigregister (vehicle.js, vehicleregister.js); hier hun kwaliteitsnorm, zodat de
// lat voor een voertuig op dezelfde plek staat als die voor een prop. tris: driehoeken van het hele gebouwde model (romp en
// wielen), kleuren: verschillende vertexkleuren in de romp. propregister_test.mjs bouwt ze met buildVehicleMesh.
export const VOERTUIG_REGISTER = {
  trekkerlimo: {
    nl: 'Trekker-limo van Jelle', model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#141414' },
    norm: { tris: [4000, 9000], kleuren: 20, eisen: ['trekkerkop met grille, ronde koplampen en noppenbanden', 'limousine met wielkasten, C-stijl, schuine achterruit en afgerond dak met schuifdak', 'kofferdeksel in lak met chromen strip, geel kenteken zonder tekens', 'conferentie-interieur met barkastje', 'deurnaden, sturende voorwielen, hoogglanslak'] },
  },
  truck: {
    nl: 'Bakwagen', model: { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' },
    norm: { tris: [1500, 4000], kleuren: 10, eisen: ['laadbak met ribbels, aluminium randen en hoekstijlen', 'achterdeuren met scharnieren, sluitstangen en hendels', 'onderrijbeveiliging achter en opzij', 'cabinedeuren met naad'] },
  },
};
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
