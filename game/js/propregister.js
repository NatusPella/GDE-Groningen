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
};

export const PROP_IDS = Object.keys(PROP_REGISTER);
export const propNorm = (id) => (PROP_REGISTER[id] ? PROP_REGISTER[id].norm : null);
export const isRegisteredProp = (id) => Object.prototype.hasOwnProperty.call(PROP_REGISTER, id);
// De soorten die een cutscene als decor mag noemen en uit dit register komen (cutscenemodels.js DECOR_KINDS neemt ze over).
export const CUTSCENE_PROPS = PROP_IDS.filter((id) => PROP_REGISTER[id].gebruik.includes('cutscene'));
