// AAA-upgrade van akte 4 en 5 (M17 tot M26, AAA-upgradeplan): wat de missies van de Veenkoloniën, Westerwolde en het
// Ontzet erbij krijgen op de bouwstenen die er al zijn: een regelkaart per stap (regelkaart.js), een wachtfiguur bij het
// wachten (wachtprops.js), aankleding om het doel (missiedecor.js: `perron`, `plein`) en stings op de stappen (`aaa: true`,
// de runner geeft dan bij elke voltooide tussenstap een sting).
//
// Alleen data: canon, ids, volgorde, beloning en stappen blijven zoals ze waren (saves). applyNieuw (missions_nieuw.js)
// roept applyAkte45 aan als laatste, na applyAkte3, op de lijst met defs. Een stap wordt gezocht op haar label; een missie of
// stap die er niet (meer) is, wordt overgeslagen. QTE-stappen (timing, choice) krijgen bewust geen kaart: ze hebben hun eigen
// hulpregel en een kaart zou over het paneel heen komen.
//
// Samen spelen (voor alle missies hieronder): een verhaalmissie is van wie het spel opende; een gast kiest bij Meedoen?
// (J of N, geen antwoord is nee). Regelkaart, wachtfiguur, aankleding en sting zijn lokaal beeld bij de speler die de stap
// draait: er gaat niets over het net en er wordt niets in beloning of voortgang geschreven (per speler, #429). Wie wegvalt of
// later aansluit mist alleen beeld; de stap blijft bij wie de missie opende (coopmissie.js). Bij M21 kijkt de gast mee naar
// Tessa's deel (solo), zoals eerst.

const stap = (icoon, label) => ({ icoon, label });
const stappen = (label, klaar, lijst, extra = {}) => ({ type: 'stappen', inv: { label, klaar, stappen: lijst }, ...extra });
const teller = (label, rest, extra = {}) => ({ type: 'teller', inv: { rest, totaal: rest, label }, ...extra });
const toets = (label, toetsen, handeling, extra = {}) => ({ type: 'toets', inv: { label, toetsen, handeling }, ...extra });
const wijzer = (label, afstand, tekst, extra = {}) => ({ type: 'wijzer', inv: { afstand, hoek: 0, label }, tekst, ...extra });

// --- regelkaarten ----------------------------------------------------------------------------------------------------
// Elke kaart heeft een doel en hoogstens drie regels (regelkaart.js knipt de rest af).
export const KAARTEN = {
  // M17 Open, dicht: de regel stond alleen in de tekst (toeter, wacht op de fanfare); elf bruggen, één per deel.
  M17: [
    { doel: 'Vaar de eerste vier bruggen door: toeter, Wubbo opent', druk: 'zeven minuten voor alle elf', afloop: 'is het mosterdschip eerder, dan begin je opnieuw',
      regels: [stappen('Zo gaat een brug', 0, [stap('pijl', 'Vaar op de brug af'), stap('hand', 'Toeter met H'), stap('hart', 'Wacht tot hij open is')], { na: 6, duur: 9 }),
        teller('Tijd', 420, { na: 20, duur: 6 })] },
    { doel: 'Brug 5, 6 en 7: Wubbo fluit, zonder fanfare',
      regels: [stappen('Wubbo\'s fluit', 0, [stap('hart', 'Eén keer: open'), stap('hand', 'Twee keer: dicht'), stap('pijl', 'Niet te vroeg')], { na: 5, duur: 9 })] },
    { doel: 'Brug 8, 9 en 10: een dichte brug is dicht',
      regels: [toets('Bij een dichte brug', ['H'], 'tik', { na: 5, duur: 8 })] },
    { doel: 'Vaar tot brug elf: de limo staat aan de overkant',
      regels: [stappen('De laatste brug', 0, [stap('pijl', 'Rustig erheen'), stap('hand', 'Toeter, wacht'), stap('hart', 'Mosterdschip blijft vast')], { na: 5, duur: 9 })] },
  ],
  // M18: de kaarten staan op de loopstappen en de serverkamer; de QTE's en het gesprek hebben hun eigen paneel.
  M18: {
    naar: { doel: 'Ga naar binnen bij Wiebelwerk als klant', afloop: 'een fout antwoord maakt de manager wantrouwig, het stopt de missie niet',
      regels: [stappen('Het plan', 0, [stap('pijl', 'Naar binnen'), stap('hand', 'De intake'), stap('hart', 'De serverkamer')], { na: 6, duur: 9 })] },
    servers: { doel: 'Naar de serverkamer, langs de camera\'s',
      regels: [wijzer('Serverkamer', 45, 'De serverdeur ligt aan het eind van de gang.', { na: 6, duur: 7 })] },
    logboek: { doel: 'Lees het logboek van 12 augustus',
      regels: [teller('Lezen', 8, { tekst: 'Blijf bij de server staan tot alles gelezen is: acht seconden.', na: 2, duur: 7 })] },
    uit: { doel: 'Naar buiten met het printje, voor de manager terug is',
      regels: [wijzer('Buiten', 40, 'Weg voor de accountmanager terug is.', { na: 5, duur: 7 })] },
  },
  // M19 Stoom: de bediening van de trein stond alleen in de say-tekst.
  M19: {
    perron: { doel: 'Ga naar de stilstaande stoomtrein op het perron',
      regels: [stappen('Op het perron', 0, [stap('pijl', 'Naar de kop van de trein'), stap('hand', 'Instappen met E')], { na: 5, duur: 9 })] },
    rit: { doel: 'Rij de museumtrein naar het volgende perron', afloop: 'rij je door het perron, dan zitten de juryleden nog vast',
      regels: [toets('De stoomtrein', ['W', 'S', 'H'], 'houd', { tekst: 'W is gas, S is rem, H is de fluit.', na: 4, duur: 9 }),
        wijzer('Volgende perron', 2300, 'Het volgende perron ligt ruim twee kilometer verderop. Rem op tijd.', { na: 16, duur: 8 })] },
  },
  // M20 Het beleg van Bourtange: elf stappen met dezelfde regel (houd de plek); één kaart per soort.
  M20: {
    wallen: { doel: 'Verdedig de wallen van de vesting', afloop: 'een kartonnen kogel duwt je om, even liggen, dan terug',
      regels: [stappen('Het beleg', 0, [stap('hand', 'Westwal'), stap('pijl', 'Noordwal'), stap('hart', 'Gracht')], { na: 6, duur: 9 })] },
    wal1: { doel: 'Blijf op de westwal staan',
      regels: [teller('Houd de wal', 12, { na: 3, duur: 8 })] },
    wal2: { doel: 'Houd ook de noordwal',
      regels: [teller('Houd de wal', 10, { na: 3, duur: 8 })] },
    kruit: { doel: 'Naar de kruitkelder: de bal blijft hier', druk: 'drie deuren, een voor een', afloop: 'valt een deur, dan sluit Mem hem opnieuw',
      regels: [stappen('Drie deuren', 0, [stap('hand', 'Eerste deur'), stap('hand', 'Tweede deur'), stap('hand', 'Derde deur')], { na: 6, duur: 9 })] },
    deur1: { doel: 'Houd de eerste deur tegen Jelles mannen',
      regels: [stappen('Drie deuren', 0, [stap('hand', 'Eerste deur'), stap('hand', 'Tweede deur'), stap('hand', 'Derde deur')], { na: 2, duur: 8 })] },
    deur2: { doel: 'Houd de tweede deur tegen',
      regels: [stappen('Drie deuren', 1, [stap('hand', 'Eerste deur'), stap('hand', 'Tweede deur'), stap('hand', 'Derde deur')], { na: 2, duur: 8 })] },
    deur3: { doel: 'Houd de laatste deur tegen',
      regels: [stappen('Drie deuren', 2, [stap('hand', 'Eerste deur'), stap('hand', 'Tweede deur'), stap('hand', 'Derde deur')], { na: 2, duur: 8 })] },
    poort: { doel: 'Draag de bal naar het bakkie bij de poort',
      regels: [wijzer('Berends bakkie', 80, 'Links is vrij. Naar de poort, het bakkie staat klaar.', { na: 5, duur: 8 })] },
  },
  // M21: drie soorten stappen; de kaart zegt per deel wie speelt (Tessa de trein, Tammo de schuur).
  M21: {
    overweg: { doel: 'Tessa: naar de overweg bij Zuidhorn', druk: 'de trein stopt om middernacht',
      regels: [stappen('Tessa\'s deel', 0, [stap('auto', 'Naar de overweg'), stap('pijl', 'Over de wagons'), stap('hart', 'Auto of bal')], { na: 6, duur: 9 })] },
    schuur: { doel: 'Tammo: naar Tinus\' schuur bij Zuidhorn',
      regels: [stappen('Tammo\'s deel', 0, [stap('pijl', 'Naar de schuur'), stap('hart', 'Praat met de vrienden')], { na: 6, duur: 9 })] },
  },
  // M22 Een luik erin
  M22: {
    luik: { doel: 'Laat Henk het luik inbouwen: blijf bij de wagen',
      regels: [teller('Het luik', 6, { na: 2, duur: 7 })] },
    slalom: { doel: 'Rijproef: slalom door de modder', afloop: 'sta je stil, dan zakt hij weg',
      regels: [stappen('De rijproef', 0, [stap('pijl', 'Eerst links'), stap('pijl', 'Dan rechts'), stap('hart', 'De modder in')], { na: 5, duur: 9 }),
        { type: 'limiet', inv: { waarde: 0, limiet: 40, marge: 8, label: 'Houd gas' }, tekst: 'Houd de snelheid erin: in de modder zakt hij weg als je stilstaat.', na: 15, duur: 8 }] },
    modder: { doel: 'Rij de Escapade de modder in, tot hij vastzit', afloop: 'Tinus trekt hem er altijd uit',
      regels: [stappen('De modder', 0, [stap('auto', 'Rij erin'), stap('hand', 'Wip mee op het ritme'), stap('hart', 'Tinus trekt')], { na: 5, duur: 9 })] },
  },
  // M23 De colonne: de regel was onduidelijk (timeLimit x3, convoi); de afstand is een tekst op het kaartje, geen live meter.
  M23: {
    aduard: { doel: 'Rij voorop naar Aduard en houd de colonne bij elkaar', afloop: 'valt de colonne uiteen, dan begin je opnieuw',
      regels: [stappen('De colonne', 0, [stap('auto', 'Rij voorop'), stap('hand', 'Wacht op wie achterblijft'), stap('hart', 'Niemand kwijt')], { na: 6, duur: 9 }),
        wijzer('Aduard', 1800, 'Wie te ver achterblijft, valt weg. Wacht op ze.', { na: 18, duur: 7 })] },
    hoogkerk: { doel: 'Rij met de colonne naar Hoogkerk',
      regels: [stappen('De brug', 0, [stap('pijl', 'Niet te hard'), stap('hand', 'Wubbo draait open'), stap('hart', 'Aanhanger erdoor')], { na: 5, duur: 9 })] },
    markt: { doel: 'De hele colonne de Grote Markt op', afloop: 'valt de colonne uiteen, dan begin je opnieuw',
      regels: [wijzer('Grote Markt', 5000, 'Nog vijf kilometer. De hele colonne, de Grote Markt op.', { na: 6, duur: 8 })] },
  },
  // M25 Het bod viel tegen: het bakken (de eieren zijn uit de missie; er is geen schade meer die kan mislukken).
  M25: {
    oefenen: { doel: 'Bak een oefenronde eierballen met alle vijf ingrediënten', afloop: 'een fout is niet erg: dit is oefenen',
      regels: [toets('Oma\'s volgorde', ['1', '2', '3', '4', '5'], 'tik', { na: 5, duur: 9 }),
        stappen('De volgorde', 0, [stap('ei', 'Ei'), stap('zout', 'Zout'), stap('meel', 'Grof meel'), stap('vet', 'Vet'), stap('mosterd', 'Mosterd')], { na: 15, duur: 8 })] },
  },
  // M26 Ontzet (de finale)
  M26: {
    bakken: { doel: 'Bak de Groningse eierbal: drie rondes', afloop: 'het fijne meel is Fries: alleen het grove telt',
      regels: [toets('Oma\'s volgorde', ['1', '2', '3', '4'], 'tik', { na: 5, duur: 9 }),
        stappen('Het Ontzet', 0, [stap('ei', 'Bak'), stap('auto', 'Limo tegenhouden'), stap('hart', 'De jury proeft')], { na: 15, duur: 9 })] },
    vuurwerk: { doel: 'Houd de kraam heel tegen het vuurwerk',
      regels: [teller('Houd de kraam', 22, { na: 3, duur: 8 })] },
    limo: { doel: 'Zet de Fjord Frituur dwars voor Jelles limo', druk: 'voor drie uur', afloop: 'is Jelle bij de notaris, dan is plakje acht van hem',
      regels: [stappen('Zo stop je hem', 0, [stap('auto', 'Voor hem rijden'), stap('hand', 'Dwars zetten'), stap('hart', 'Hij staat vast')], { na: 5, duur: 9 }),
        teller('Tijd', 70, { na: 16, duur: 6 })] },
  },
};

// --- wachtfiguren ----------------------------------------------------------------------------------------------------
// Jelles mannen bij de kruitkelder (geen eigen kostuum: de figuur kiest zijn kleren zelf, zie wachtprops.js), de bewaker op de
// wal, Berend met zijn flyers aan het eind, en Tinus bij het luik.
export const WACHT = {
  M20: { wal1: { figuur: true, prop: 'ton', seed: 0.18 }, wal2: { figuur: true, prop: 'ton', seed: 0.44 },
    deur1: { figuur: true, prop: 'kist', seed: 0.62 }, deur2: { figuur: true, prop: 'ton', seed: 0.77 }, deur3: { figuur: true, prop: 'kist', seed: 0.9 },
    einde: { figuur: true, prop: 'krant', seed: 0.31 } },
  M22: { luik: { figuur: true, prop: 'koffie', seed: 0.52 } },
  M26: { vuurwerk: { figuur: true, prop: 'koffie', seed: 0.67 } },
};

// --- de toepassing ---------------------------------------------------------------------------------------------------

// Zet de aankleding van akte 4 en 5 op de defs. `list` is de lijst van missions.js (na applyNieuw); een missie die er niet is
// wordt overgeslagen.
export function applyAkte45(list) {
  const by = (label) => list.find((d) => d.label === label);
  const vind = (def, soort, re, nr = 0) => (def && Array.isArray(def.stages) ? def.stages.filter((s) => s && s.kind === soort && re.test(s.label || ''))[nr] : null) || null;
  const zet = (s, veld) => { if (s) Object.assign(s, veld); return !!s; };

  // M17 Open, dicht: een kaart per brugdeel en een sting bij elk deel. Wubbo als figuur op elke brug is niet gebouwd (een
  // `goto` over water heeft geen wachtstap).
  const m17 = by('Open, dicht');
  if (m17 && m17.stages) {
    m17.aaa = true;
    const gotos = m17.stages.filter((s) => s.kind === 'goto');
    gotos.forEach((s, i) => { if (KAARTEN.M17[i]) s.kaart = KAARTEN.M17[i]; });
  }

  // M18 Wie draaide de camera's uit?: kaart op de loopstappen en het logboek; de QTE's en het gesprek houden hun eigen paneel.
  const m18 = by('Wie draaide de camera\'s uit?');
  if (m18 && m18.stages) {
    m18.aaa = true;
    zet(vind(m18, 'goto', /binnen bij Wiebelwerk/), { kaart: KAARTEN.M18.naar });
    zet(vind(m18, 'goto', /serverkamer/), { kaart: KAARTEN.M18.servers });
    zet(vind(m18, 'hold', /logboek/), { kaart: KAARTEN.M18.logboek });
    zet(vind(m18, 'goto', /Naar buiten/), { kaart: KAARTEN.M18.uit });
  }

  // M19 Stoom: het perron met reizigers en een fotograaf bij de stilstaande trein, en de bediening als kaart.
  const m19 = by('Stoom');
  if (m19 && m19.stages) {
    m19.aaa = true;
    zet(vind(m19, 'goto', /stilstaande stoomtrein/), { kaart: KAARTEN.M19.perron, dressing: 'perron' });
    zet(m19.stages.find((s) => s.kind === 'rit'), { kaart: KAARTEN.M19.rit });
  }

  // M20 Het beleg van Bourtange: kaart per soort stap, een wachtfiguur bij elke houd-stap. De kruitkelder als binnenset is niet
  // gebouwd (roomspec.js kent geen kruitkelder); de drie deuren spelen nog buiten.
  const m20 = by('Het beleg van Bourtange');
  if (m20 && m20.stages) {
    m20.aaa = true;
    zet(vind(m20, 'goto', /wallen van de vesting/), { kaart: KAARTEN.M20.wallen });
    zet(vind(m20, 'hold', /westwal/), { kaart: KAARTEN.M20.wal1, wacht: { ...WACHT.M20.wal1 } });
    zet(vind(m20, 'hold', /noordwal/), { kaart: KAARTEN.M20.wal2, wacht: { ...WACHT.M20.wal2 } });
    zet(vind(m20, 'goto', /Naar de kruitkelder/), { kaart: KAARTEN.M20.kruit });
    zet(vind(m20, 'hold', /eerste deur/), { kaart: KAARTEN.M20.deur1, wacht: { ...WACHT.M20.deur1 } });
    zet(vind(m20, 'hold', /tweede deur/), { kaart: KAARTEN.M20.deur2, wacht: { ...WACHT.M20.deur2 } });
    zet(vind(m20, 'hold', /derde deur/), { kaart: KAARTEN.M20.deur3, wacht: { ...WACHT.M20.deur3 } });
    zet(vind(m20, 'goto', /bakkie bij de poort/), { kaart: KAARTEN.M20.poort });
    zet(vind(m20, 'hold', /naspeling: het publiek klapt/), { wacht: { ...WACHT.M20.einde } });
  }

  // M21 Iedereen heeft een rode auto gezien: een kaart per deel (Tessa, Tammo). De overweg-stap met treincamera is niet gebouwd.
  const m21 = by('Iedereen heeft een rode auto gezien');
  if (m21 && m21.stages) {
    m21.aaa = true;
    zet(vind(m21, 'goto', /overweg bij Zuidhorn/), { kaart: KAARTEN.M21.overweg });
    zet(vind(m21, 'goto', /Tinus' schuur bij Zuidhorn/), { kaart: KAARTEN.M21.schuur });
  }

  // M22 Een luik erin: kaarten op het luik, de slalom en de modder; Tinus staat met koffie bij het luik. De modder-stap blijft
  // de korte, nooit falende timing (#962); hij is geen `hold` met trekkeranimatie geworden.
  const m22 = by('Een luik erin');
  if (m22 && m22.stages) {
    m22.aaa = true;
    zet(vind(m22, 'hold', /Henk het luik inbouwen/), { kaart: KAARTEN.M22.luik, wacht: { ...WACHT.M22.luik } });
    zet(vind(m22, 'goto', /slalom door de modder, eerst links/), { kaart: KAARTEN.M22.slalom });
    zet(vind(m22, 'goto', /de modder in, tot hij vastzit/), { kaart: KAARTEN.M22.modder });
  }

  // M23 De colonne: de regel van de colonne als kaart, per rit. De cinedrive-intro met de colonne is niet gebouwd.
  const m23 = by('De colonne');
  if (m23 && m23.stages) {
    m23.aaa = true;
    zet(vind(m23, 'convoy', /naar Aduard/), { kaart: KAARTEN.M23.aduard });
    zet(vind(m23, 'convoy', /naar Hoogkerk/), { kaart: KAARTEN.M23.hoogkerk });
    zet(vind(m23, 'convoy', /Grote Markt op/), { kaart: KAARTEN.M23.markt });
  }

  // M24 Er hangt iets Fries aan d'Olle Grieze: de referentiemissie; alleen de stings. De duivenstap heeft zijn eigen toetsenhulp.
  const m24 = by('Er hangt iets Fries aan d\'Olle Grieze');
  if (m24) m24.aaa = true;

  // M25 Het bod viel tegen: de bakregel als kaart. De eieren zijn uit deze missie gehaald (geen schadevloer meer nodig) en de
  // oefenronde speelt in Oma's keuken: geen plein, geen publiek.
  const m25 = by('Het bod viel tegen');
  if (m25 && m25.stages) {
    m25.aaa = true;
    zet(m25.stages.find((s) => s.kind === 'bake'), { kaart: KAARTEN.M25.oefenen });
  }

  // M26 Ontzet (de finale): het plein met jurytafel, kramen en publiek rond de kraam, bij het bakken, het vuurwerk en de drie
  // slotscènes (jury, stemming, uitslag). De finishcamera bij de uitslag en de sting 'geslaagd_groot' zijn niet gebouwd.
  const m26 = by('Ontzet, net als in 1672');
  if (m26 && m26.stages) {
    m26.aaa = true;
    zet(vind(m26, 'bake', /eierbal: drie rondes/), { kaart: KAARTEN.M26.bakken, dressing: 'plein' });
    zet(vind(m26, 'hold', /kraam heel/), { kaart: KAARTEN.M26.vuurwerk, wacht: { ...WACHT.M26.vuurwerk }, dressing: 'plein' });
    zet(vind(m26, 'chase', /dwars voor Jelles limo/), { kaart: KAARTEN.M26.limo });
    for (const re of [/^De jury$/, /^De stemming$/, /^De uitslag$/]) zet(vind(m26, 'scene', re), { dressing: 'plein' });
  }
}
