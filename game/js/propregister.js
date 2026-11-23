// Het ene register van de gedeelde props (23-11): wat in de wereld op straat staat en wat een cutscene als decor
// neerzet komt uit dezelfde bouwer, geregistreerd hier met een korte kwaliteitsnorm. Puur (geen three): de test
// scripts/propregister_test.mjs bouwt elke prop en houdt hem aan zijn norm; docs/AAA-OBJECTEN-23-11.md legt uit waarom.
//
// Een nieuwe prop komt hier in, met:
//   bouwer  de sleutel in propmodels3d.js (propGeometry(id)): één vertexkleur-geometrie, oorsprong op de grond, +x voorkant
//   norm    tris [min, max] driehoeken, kleuren (minimaal aantal verschillende vertexkleuren), maat [b, h, d] in m (+- 25 %),
//           en `eisen`: wat er aan detail aan moet zitten, zodat een kale doos of cilinder de test niet haalt
//   gebruik waar hij staat: 'stad' (cityprops.js), 'buiten' (streetfurniture3d.js), 'cutscene' (storyprops.js DECOR_MAKERS)
//   lod     (vettruck 23-11, eis eigenaar: elk model 2-3 LOD-niveaus) { grenzen: [m, ...], band, weg }: lodlevels.js legt de
//           vorm uit; propGeometry(id, niveau) bouwt de lichtere niveaus, lod3d.js DitherLOD dithert de overgang
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
  // vettruck 23-11: het frituurvet van M07 als echte verpakking in plaats van losse gele bollen
  vetvat: {
    nl: 'Vat frituurvet (200 l)', bouwer: 'vetvat', gebruik: ['cutscene'], lod: { grenzen: [18, 50], band: 4, weg: 140 },
    norm: { tris: [180, 480], kleuren: 6, maat: [0.6, 0.9, 0.6], eisen: ['romp met twee rolringen', 'felsnaad boven en onder', 'verzonken deksel met een grote en een kleine stop', 'etiket'] },
  },
  jerrycan: {
    nl: 'Jerrycan frituurvet (20 l)', bouwer: 'jerrycan', gebruik: ['cutscene'], lod: { grenzen: [12, 35], band: 3, weg: 90 },
    norm: { tris: [80, 260], kleuren: 5, maat: [0.18, 0.51, 0.33], eisen: ['kunststof romp waar het vet doorheen schemert', 'verdiepte zijpanelen', 'greep op twee pootjes', 'schroefdop en etiket'] },
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
export const VOERTUIG_REGISTER = {
  trekkerlimo: {
    nl: 'Trekker-limo van Jelle', model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#141414' },
    norm: { tris: [4000, 9000], kleuren: 20, eisen: ['trekkerkop met grille, ronde koplampen en noppenbanden', 'limousine met wielkasten, C-stijl, schuine achterruit en afgerond dak met schuifdak', 'kofferdeksel in lak met chromen strip, geel kenteken zonder tekens', 'conferentie-interieur met barkastje', 'deurnaden, sturende voorwielen, hoogglanslak'] },
  },
  truck: {
    nl: 'Bakwagen', model: { name: 'truck', len: 8.5, wid: 2.5, color: '#e8e6e0' },
    norm: { tris: [1500, 4000], kleuren: 10, eisen: ['laadbak met ribbels, aluminium randen en hoekstijlen', 'achterdeuren met scharnieren, sluitstangen en hendels', 'onderrijbeveiliging achter en opzij', 'cabinedeuren met naad'] },
  },
  // vettruck 23-11: de tankwagen van Us Mem Vet (M07, de cutscenes, de trailer en de winkel), opnieuw gebouwd in plaats van drie
  // gestapelde dozen op de bakwagen. Rijgedrag: vehicle/heavyload.js.
  tankwagen: {
    nl: 'Tankwagen Us Mem Vet', model: { name: 'truck', tank: true, livery: 'usmemvet', len: 8.5, wid: 2.5, color: '#1d4f9c' },
    // niveau 0 vol detail (ook in de trailershot, die op 50 m begint), 1 tank en cabine met belettering, 2 silhouet met wielblokken
    lod: { grenzen: [60, 160], band: 8 },
    norm: { tris: [3500, 8000], kleuren: 24, eisen: ['elliptische rvs-tank met gebolde koppen en spanbanden', 'loopbrug met dekselputten, ontluchting en neergeklapte leuning', 'ladder achter, aftapkraan met handwiel, lichtbalk en onderrijbeveiliging', 'kantelcabine met wielkast, grille, zonneklep, dakspoiler, spiegels en opstap', 'dubbellucht achter, pompkast, dieseltank, slangkokers en zijbeveiliging', 'gebogen belettering van het verzonnen merk, deurnaden'] },
  },
};
export const VOERTUIG_IDS = Object.keys(VOERTUIG_REGISTER);
