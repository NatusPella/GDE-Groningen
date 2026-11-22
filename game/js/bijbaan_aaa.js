// AAA-upgrade van de bijbanen (AAA-upgradeplan, BB-rij en BB-weg): één regelkaart per bijbaan, uit de eigen tagline van de baan,
// zodat de speler het doel, de regel en de afloop ziet in plaats van te raden. sidejobs.js toont hem bij de eerste twee diensten
// van een baan (daarna kent de speler hem) en geeft een sting bij elke betaalde ronde.
//
// Alleen data: niets in loon, niveau, voortgang of regels verandert, en een baan zonder kaart blijft zoals hij was.
// Samen spelen (SS-4, BIJBAAN_REGELS in coopbijbaan.js): de kaart is lokaal beeld bij de speler die zelf de dienst draait (de
// host of een gast met een eigen dienst); er gaat niets over het net en er wordt niets in loon of voortgang geschreven
// (per speler, #429). Wie wegvalt of later aansluit mist alleen beeld.
const stap = (icoon, label) => ({ icoon, label });
const stappen = (label, lijst, extra = {}) => ({ type: 'stappen', inv: { label, klaar: 0, stappen: lijst }, ...extra });
const toets = (label, toetsen, handeling, extra = {}) => ({ type: 'toets', inv: { label, toetsen, handeling }, ...extra });

// Elke kaart heeft een doel, een afloop (wat er gebeurt als het misgaat) en een of twee regels.
export const BIJBAAN_KAARTEN = {
  taxi: { doel: 'Haal de klant op en zet hem heel af', afloop: 'heel afzetten, dan komt de fooi',
    regels: [stappen('Een rit', [stap('hand', 'Ophalen'), stap('hart', 'Rustig rijden'), stap('pijl', 'Afzetten')], { na: 6, duur: 9 })] },
  bezorger: { doel: 'Haal het eten op en bezorg het voor het koud is', afloop: 'het eten moet bezorgd zijn voor het koud is',
    regels: [stappen('Een bestelling', [stap('pakje', 'Ophalen'), stap('pijl', 'Trappen'), stap('hand', 'Bezorgen')], { na: 6, duur: 9 })] },
  krantenwijk: { doel: 'Gooi de krant op de stoep of in de brievenbus', afloop: 'mik op de brievenbus, {E} gooit',
    regels: [toets('Gooien', ['E'], 'tik', { na: 6, duur: 8 })] },
  verhuizing: { doel: 'Sjouw de spullen en lever alles heel af', afloop: 'alles moet heel aankomen: rij voorzichtig',
    regels: [stappen('Een verhuizing', [stap('pakje', 'Sjouwen'), stap('hart', 'Voorzichtig rijden'), stap('pijl', 'Uitladen')], { na: 6, duur: 9 })] },
  vracht: { doel: 'Koppel de oplegger en lever de lading af', afloop: 'een inklapper is een slecht begin: rij rustig',
    regels: [stappen('Een lading', [stap('hand', 'Koppelen'), stap('hart', 'Rustig rijden'), stap('pijl', 'Afleveren')], { na: 6, duur: 9 })] },
  bus: { doel: 'Rij het rondje langs de haltes', afloop: 'op tijd, niet te vroeg, en zonder koffievlekken',
    regels: [stappen('De lijn', [stap('pijl', 'Naar de halte'), stap('klok', 'Op de tijd wachten'), stap('hart', 'Soepel weg')], { na: 6, duur: 9 })] },
  lijn: { doel: 'Rij de lijn volgens de dienstregeling', afloop: 'op tijd aankomen, niet te vroeg vertrekken',
    regels: [stappen('De dienst', [stap('pijl', 'Naar de halte'), stap('klok', 'Wachten op de tijd'), stap('hart', 'Op tijd aankomen')], { na: 6, duur: 9 })] },
  rondvaart: { doel: 'Vaar rustig langs de bezienswaardigheden', afloop: 'rustig varen: dan hoort iedereen het verhaal',
    regels: [stappen('De rondvaart', [stap('pijl', 'Naar de eerste stop'), stap('hart', 'Rustig varen'), stap('hand', 'Verhaal horen')], { na: 6, duur: 9 })] },
  rondvaarttour: { doel: 'Vaar een rustig rondje over de Diepenring', afloop: 'geen haast en geen straf',
    regels: [stappen('Het rondje', [stap('pijl', 'Van steiger naar steiger'), stap('hart', 'Zonder haast'), stap('hand', 'Tammo vertelt')], { na: 6, duur: 9 })] },
  boa: { doel: 'Loop op een overtreder af en schrijf de boete uit', afloop: 'overslaan mag altijd, zonder gevolg',
    regels: [stappen('Een boete', [stap('pijl', 'Naar de overtreder'), stap('meter', 'De boete uitrekenen'), stap('hand', 'Uitschrijven')], { na: 6, duur: 9 })] },
  rechtbank: { doel: 'Lees de feiten en beantwoord drie vragen bij de balie', afloop: 'geen haast, geen straf',
    regels: [stappen('Het dossier', [stap('pakje', 'Feiten lezen'), stap('pijl', 'Naar de balie'), stap('hand', 'Drie vragen')], { na: 6, duur: 9 })] },
  cabaret: { doel: 'Roep op de maat iets terug naar de cabaretier', afloop: 'een goed getimed grapje levert applaus op',
    regels: [toets('Op het groen', ['Spatie'], 'tik', { na: 6, duur: 8 })] },
  fietsdepot: { doel: 'Haal de foutgeparkeerde fietsen weg bij het station', afloop: 'boze eigenaren: pas op',
    regels: [stappen('Een fiets', [stap('hand', 'Oranje label'), stap('pijl', 'Naar het depot'), stap('hart', 'Eigenaar sussen')], { na: 6, duur: 9 })] },
  snackoverlast: { doel: 'Stuur de fatbikers weg bij de snackbar', afloop: 'overslaan mag altijd',
    regels: [stappen('Een grap', [stap('pijl', 'Naar de fatbikers'), stap('hand', 'Kies een actie'), stap('hart', 'Ze fietsen weg')], { na: 6, duur: 9 })] },
  vismarktkoerier: { doel: 'Breng de verse vis van de Vismarkt naar de restaurants', afloop: 'rustig rijden: de kist wordt warm en schudden kost koeling',
    regels: [stappen('Een bestelling', [stap('pakje', 'Kist laden'), stap('hart', 'Rustig fietsen'), stap('hand', 'Afleveren')], { na: 6, duur: 9 })] },
  studentenfeest: { doel: 'Schenk het juiste drankje voor elke gast op het studentenfeest', afloop: 'te veel klachten en je gaat naar de afwas',
    regels: [stappen('Een gast', [stap('pijl', 'Naar de bar'), stap('hand', 'Kies een drankje'), stap('hart', 'Blije gast')], { na: 6, duur: 9 })] },
  marktkraam: { doel: 'Weeg af wat de klant vraagt, op de gram nauwkeurig', afloop: 'te weinig is een klacht, te veel is zonde',
    regels: [stappen('Een klant', [stap('pijl', 'Naar de kraam'), stap('meter', 'Afwegen'), stap('hand', 'Afrekenen')], { na: 6, duur: 9 })] },
  toeristengids: { doel: 'Loop langs de stops bij de Martinitoren en vertel wat de groep wil horen', afloop: 'stilte of het verkeerde verhaal kost aandacht',
    regels: [stappen('Een stop', [stap('pijl', 'Naar de stop'), stap('hand', 'Kies een verhaal'), stap('hart', 'Applaus')], { na: 6, duur: 9 })] },
  boerderij: { doel: 'Werk je eigen akker bij Hoogkerk', afloop: 'wat je niet doet, groeit niet',
    regels: [stappen('Het seizoen', [stap('hand', 'Ploegen en zaaien'), stap('meel', 'Oogsten'), stap('pakje', 'Afleveren')], { na: 6, duur: 9 })] },
  tjalke: { doel: 'Rij naar Tjalke in Drachten, één keer', afloop: 'op eigen risico: pionnen en politie',
    regels: [stappen('De rit', [stap('auto', 'Over de A7'), stap('hart', 'Pionnen ontwijken'), stap('pijl', 'Naar Tjalke')], { na: 6, duur: 9 })] },
  veerdienst: { doel: 'Vaar de veerdienst en breng de passagiers over', afloop: 'rustig varen, zonder haast',
    regels: [stappen('De overtocht', [stap('hand', 'Passagiers aan boord'), stap('pijl', 'Overvaren'), stap('hart', 'Aan wal')], { na: 6, duur: 9 })] },
};

// Een bijbaan krijgt zijn kaart bij de eerste twee diensten; daarna kent de speler hem.
export const KAART_DIENSTEN = 2;
export const bijbaanKaart = (id) => (Object.prototype.hasOwnProperty.call(BIJBAAN_KAARTEN, id) ? BIJBAAN_KAARTEN[id] : null);
export const kaartNodig = (id, diensten) => !!bijbaanKaart(id) && Number.isFinite(diensten) && diensten >= 1 && diensten <= KAART_DIENSTEN;
