// AAA bijbanen, tweede ronde: een herkenbaar begin en eind (ritueel), een klant met een eigen praatje, en een reeks die je ziet
// groeien. Alleen tekst en een klein beetje rekenwerk, puur en zonder scène: sidejobs.js roept het aan bij de start van een dienst,
// na een betaalde klus en bij het einde. Niets hier verandert loon, niveau of voortgang: de reeksbonus is dezelfde 6% per klus
// (maximaal 10) die sidejobs.js al uitbetaalt, hier alleen zichtbaar gemaakt.
//
// Samen spelen (SS-4, BIJBAAN_REGELS in coopbijbaan.js): elke speler draait zijn eigen dienst. Het ritueel, het praatje en de
// reeks zijn lokaal beeld bij de speler die de dienst doet; een gast met een eigen dienst ziet zijn eigen versie, er gaat niets over
// het net en er wordt niets in loon of voortgang geschreven (per speler, #429).
//
// Spelregel voor de tekst: Nederlands, verzonnen namen, geen echte merken of personen, altijd zomer, geen getoond leed. Toetsen als
// {E} (toetsplaatje, keycap.js), nooit als losse letter.

// De reeksbonus per klus (zie basisFor in sidejobs.js: 1 + 0.06 * min(reeks, 10)).
const REEKS_PER_KLUS = 0.06;
const REEKS_MAX = 10;
const REEKS_MIJLPALEN = [3, 5, 8, 10];

// De bonus (in procenten) die de volgende klus krijgt na `streak` klussen op rij.
export const reeksBonusPct = (streak) => Math.round(REEKS_PER_KLUS * 100 * Math.min(Math.max(0, Math.floor(streak) || 0), REEKS_MAX));

// De lijnen met een eigen ritueel: wat de speler bij de start leest, wat de klant zegt en hoe de dienst eindigt.
// `open`: de regel bij de start van een dienst (de eerste twee diensten wat uitgebreider via `eerst`);
// `klant`: korte praatjes van de klant of de passagier, in vaste volgorde die met de ronde meedraait;
// `eind`: { goed, mager, mis }: de slotregel bij een dienst met, zonder en na een mislukte klus.
export const BIJBAAN_BEATS = {
  taxi: {
    open: 'De meter staat op nul. Rustig rijden, heel afzetten: dan komt de fooi.',
    eerst: 'De meter staat op nul. {E} bij de klant, rustig rijden en heel afzetten: dan komt de fooi.',
    klant: [
      'Klant: "Naar het station, maar niet te vlug. Ik heb mijn ontbijt nog bij me."',
      'Klant: "Kent u de achterom? Mijn zwager werkt bij de gemeente en ik wil hem niet tegenkomen."',
      'Klant: "Ik ben te laat voor mijn eigen verjaardag. Maar het is een feestje met koffie, dus het kan."',
      'Klant: "Mooi weer, hè? Altijd zomer in Grunn. Dat zegt de folder."',
      'Klant: "Zet mij maar bij de hoek. Ik moet nog even doen alsof ik gelopen ben."',
      'Klant: "Is de meter rond? Mijn tante zegt dat hij rond is. Ze heeft er verstand van."',
    ],
    eind: { goed: 'Meter uit, kassa dicht. De laatste klant zwaait nog even.', mager: 'Meter uit. Een rustige dag, maar de stoelen zijn warm.', mis: 'De meter gaat uit. Morgen een nieuwe dag, morgen weer klanten.' },
  },
  bus: {
    open: 'Deuren dicht, spiegels goed. Op de tijd rijden, niet te vroeg vertrekken.',
    eerst: 'Deuren dicht, spiegels goed. Wacht bij elke halte op de tijd en trek soepel op: dat betaalt het best.',
    klant: [
      'Reiziger: "Stopt u ook bij mijn halte? Ik ken de naam niet, maar er staat een geit."',
      'Reiziger: "Heeft u een extra stoel? Ik heb een plant bij me. Hij is nerveus."',
      'Reiziger: "Mag ik de ramen open? Het is zomer en mijn broodje wil ook lucht."',
      'Reiziger: "Is dit de bus naar het centrum? Of is dit de bus naar het gevoel van het centrum?"',
      'Reiziger: "Goeiemorgen. Of -middag. Ik reis al sinds de vorige halte."',
      'Reiziger: "Rijdt u altijd zo netjes? Mijn vorige chauffeur zong."',
    ],
    eind: { goed: 'Terug in de remise. De bus ruikt naar zonnebrandcrème en dat is goed.', mager: 'Dienst gedraaid. De dienstleider knikt en zet de koffie op.', mis: 'De bus staat in de remise. De dienstleider zegt: morgen beter.' },
  },
  lijn: {
    open: 'De dienstregeling hangt in de cabine. Op tijd aankomen, niet te vroeg vertrekken.',
    eerst: 'De dienstregeling hangt in de cabine. Vertrek op de minuut en kom op tijd aan: dat telt meer dan snelheid.',
    klant: [
      'Reiziger: "Ik ga elke ochtend mee. Voor de ramen en voor de rust."',
      'Reiziger: "Een kaartje? Ik heb het ergens. In mijn andere jas. Die ligt thuis."',
      'Reiziger: "Stopt u in Zuidlaren? Dat is nu niet de bedoeling, maar vragen mag."',
      'Reiziger: "Mooi uitzicht vanaf hier. De koeien zwaaien."',
      'Reiziger: "Mijn oma heeft deze lijn nog zien aanleggen. Dat zegt ze elke keer."',
    ],
    eind: { goed: 'De laatste halte. Het is stil in de bus en iedereen is op tijd.', mager: 'Dienst voorbij. De remise ruikt naar warm asfalt.', mis: 'De dienst is voorbij. De dienstleider reikt het rooster aan: morgen weer.' },
  },
  bezorger: {
    open: 'Tas om, bonnetjes in de hand. Haal het eten op en bezorg het voor het koud is.',
    eerst: 'Tas om, bonnetjes in de hand. Haal het eten op, trap door en bezorg het voor het koud is.',
    klant: [
      'Klant: "Perfect op tijd. Ik had net mijn bestek gepoetst."',
      'Klant: "Is dit de eierbal? Hij ziet er verdacht Gronings uit. Goed zo."',
      'Klant: "Mijn buurman heeft mijn bestelling al geroken. Ik heb een slot nodig."',
      'Klant: "Even wachten, ik moet de hond nog uitleggen dat dit niet voor hem is."',
      'Klant: "Warm? Heerlijk. Mijn vorige bezorger kwam met een koude hand en een warm verhaal."',
      'Klant: "Stop de fooi maar in de tas, de ontvangst is binnen."',
    ],
    eind: { goed: 'De tas is leeg, de bonnetjes zijn weg. Een goede dienst.', mager: 'Tas op de haak. Er kwam wat binnen, het was een rustige avond.', mis: 'De tas gaat op de haak. De volgende bestelling is een nieuwe kans.' },
  },
  krantenwijk: {
    open: 'De tas hangt zwaar aan het stuur. Mik op de brievenbus: {E} gooit.',
    eerst: 'De tas hangt zwaar aan het stuur. Mik op de brievenbus en druk op {E} om te gooien; de stoep telt ook, de plantenbak niet.',
    klant: [
      'Bewoner: "Net op tijd. De hond had de vorige al opgegeten."',
      'Bewoner: "Gooi hem maar in de bak, ik zoek de brievenbus al sinds 1999."',
      'Bewoner: "Staat er iets goeds in? Dat staat er nooit, maar ik lees hem toch."',
      'Bewoner: "Mooi gegooid! Mijn kat keek er nog even naar."',
      'Bewoner: "Voor de buurvrouw ook één? Zij leest alleen de puzzel."',
    ],
    eind: { goed: 'De tas is leeg, de wijk is bediend. De buurt leest weer.', mager: 'De wijk is rond. Een paar kranten dwars, maar niemand klaagt.', mis: 'Je zet de tas weg. Morgen weer een nieuwe wijk, nieuwe kans.' },
  },
  rondvaart: {
    open: 'Touwen los, de zon staat hoog. Vaar rustig langs de bezienswaardigheden.',
    eerst: 'Touwen los, de zon staat hoog. Vaar rustig langs de bezienswaardigheden: dan hoort iedereen het verhaal.',
    klant: [
      'Gast: "Is dat de toren? De mooie? Of de andere mooie?"',
      'Gast: "Mag ik de gids een vraag stellen? Zwemt hier iets?"',
      'Gast: "We hadden een rondvaart in Venetië, maar die was te droog."',
      'Gast: "Prachtig! Net een ansichtkaart, maar dan natter."',
      'Gast: "Rustig aan, kapitein. Mijn limonade heeft ook een mening."',
      'Gast: "Dit is de beste rondvaart van mijn leven. Het is ook mijn eerste."',
    ],
    eind: { goed: 'Aangemeerd. De gasten stappen blij van boord en klappen voor de kapitein.', mager: 'Aangemeerd. De gasten stappen uit met een glimlach en een kaartje.', mis: 'Aangemeerd. De boot ligt vast en de gasten vertrekken zonder verhaal.' },
  },
  rondvaarttour: {
    open: 'De steiger schommelt zacht. Een rustig rondje over de Diepenring, geen haast.',
    eerst: 'De steiger schommelt zacht. Een rustig rondje over de Diepenring, van steiger naar steiger, geen haast.',
    klant: [
      'Gast: "Rond? Het is rond. Ik zei toch dat het rond was."',
      'Gast: "Kan het ook sneller? Nee? Gelukkig, ik hoef nergens heen."',
      'Gast: "Tammo vertelt zo mooi. Hij weet zelfs de naam van de eend."',
    ],
    eind: { goed: 'Het rondje is af. De gasten kijken om, de zon staat nog hoog.', mager: 'Het rondje is af. Rustig aan, de steiger wacht.', mis: 'Het rondje is voorbij. Morgen kijken we weer rond.' },
  },
  verhuizing: {
    open: 'De laadklep is open, de banden staan strak. Alles heel afleveren: rij voorzichtig.',
    eerst: 'De laadklep is open. Sjouw de spullen, rij voorzichtig en laad alles heel uit: dat betaalt het best.',
    klant: [
      'Klant: "Die kast is van mijn oma. Hij heeft meer verhuizingen gezien dan ik."',
      'Klant: "Niet kantelen met de plant! Hij heet Harm en hij is gevoelig."',
      'Klant: "Is dit de laatste doos? Dan kan ik eindelijk weer zitten."',
      'Klant: "Zet de bank maar hier. Of daar. Nee, toch hier. Of daar."',
      'Klant: "Wat zit er in deze doos? Het klinkt als een kleine band."',
    ],
    eind: { goed: 'De laatste doos staat binnen. De klant zet koffie, de bank staat goed.', mager: 'Alles staat binnen. Er kwam wat langs de deur, maar niets ging stuk.', mis: 'De laadklep gaat dicht. De volgende verhuizing is een nieuwe kans.' },
  },
  vracht: {
    open: 'Cabine, spiegels, oplegger. Koppel netjes en lever de lading rustig af.',
    eerst: 'Cabine, spiegels, oplegger. Koppel netjes, rij rustig en lever de lading af: een inklapper is een slecht begin.',
    klant: [
      'Magazijnier: "Op de minuut. Mijn koffie is nog warm, dat zegt genoeg."',
      'Magazijnier: "Achteruit, achteruit, nog iets, nog iets... stop. Mooi als een prentbriefkaart."',
      'Magazijnier: "Weet je wat er in zit? Ik ook niet. Dat is het mooie aan dit werk."',
      'Magazijnier: "De vorige chauffeur parkeerde hier met zijn ogen dicht. Jij kijkt, dat scheelt."',
    ],
    eind: { goed: 'De oplegger staat leeg en recht. De magazijnier steekt een duim op.', mager: 'De lading is af. De dag was kort, de cabine ruikt naar warme koffie.', mis: 'De cabine gaat dicht. Morgen een nieuwe lading, een nieuwe kans.' },
  },
  veerdienst: {
    open: 'De loopplank ligt klaar, het water is glad. Breng de passagiers rustig over.',
    eerst: 'De loopplank ligt klaar. Passagiers aan boord, rustig overvaren en netjes aanleggen: zonder haast is het beste.',
    klant: [
      'Passagier: "Dit is de enige boot waar ik niet over een brug hoef. Heerlijk."',
      'Passagier: "Mag mijn fiets mee? Hij is mee, hij weet het nog niet."',
      'Passagier: "Het is zomer, het water is glad, ik ga nooit meer ergens anders heen."',
      'Passagier: "Rustig aan, kapitein. Mijn ijsje heeft nog geen tijd gehad om te smelten."',
    ],
    eind: { goed: 'De loopplank gaat omhoog. De laatste passagiers zwaaien vanaf de kade.', mager: 'De overtocht is klaar. Rustig water, rustig einde.', mis: 'De veerboot ligt vast. Morgen vaart hij weer, rustig aan.' },
  },
};

export const BEAT_LIJNEN = Object.keys(BIJBAAN_BEATS);
const beatVan = (id) => (Object.prototype.hasOwnProperty.call(BIJBAAN_BEATS, id) ? BIJBAAN_BEATS[id] : null);

// De openingsregel van een dienst; de eerste twee diensten leggen ook de bediening uit (met toetsplaatje).
export function openingVan(id, diensten = 99) {
  const b = beatVan(id);
  if (!b) return null;
  return Number.isFinite(diensten) && diensten >= 1 && diensten <= 2 && b.eerst ? b.eerst : b.open;
}

// Het praatje van de klant bij klus `ronde` (0, 1, 2, ...): vaste volgorde, met `seed` een andere beginplek, zodat twee diensten
// achter elkaar niet met dezelfde klant beginnen. Zonder lijn: null.
export function klantPraatje(id, ronde = 0, seed = 0) {
  const b = beatVan(id);
  if (!b || !b.klant.length) return null;
  const n = b.klant.length;
  const i = (((Math.floor(ronde) || 0) + Math.floor(seed * n)) % n + n) % n;
  return b.klant[i];
}

// Een mijlpaal in de reeks (3, 5, 8, 10 klussen op rij) met wat de volgende klus extra betaalt; anders null.
export function reeksMelding(streak) {
  const s = Math.floor(streak) || 0;
  if (!REEKS_MIJLPALEN.includes(s)) return null;
  const pct = reeksBonusPct(s);
  if (s >= REEKS_MAX) return `Reeks ${s}: het maximum, elke klus nu ${pct}% extra.`;
  return `Reeks ${s}: de volgende klus betaalt ${pct}% extra.`;
}

// De kleine reeksregel die achter elke betaalde klus komt: "reeks 4 (+24%)". Voor de eerste klus nog geen bonus.
export function reeksTekst(streak) {
  const s = Math.floor(streak) || 0;
  const pct = reeksBonusPct(s);
  return pct > 0 ? `reeks ${s} (+${pct}%)` : `reeks ${s}`;
}

// De slotregel van een dienst: goed (3 of meer klussen), mager (1 of 2) of mis (geen klus of mislukt).
// #1286: telt de betaalde rondes (rondes), niet de reeks: een reeks die door pech brak maakte van een goede dienst een magere.
// Zonder rondes valt hij terug op de reeks (oude aanroepers).
export function eindregel(id, { kind = 'quit', streak = 0, rondes } = {}) {
  const b = beatVan(id);
  if (!b) return null;
  if (kind === 'fail' || kind === 'wanted') return b.eind.mis;
  const s = Math.floor(Number.isFinite(rondes) ? rondes : streak) || 0;
  return s >= 3 ? b.eind.goed : s >= 1 ? b.eind.mager : b.eind.mis;
}

// Voor de teksttests: elke regel die de speler hier kan lezen.
export function alleBeatRegels() {
  const uit = [];
  for (const [id, b] of Object.entries(BIJBAAN_BEATS)) {
    uit.push({ id, soort: 'open', tekst: b.open });
    if (b.eerst) uit.push({ id, soort: 'eerst', tekst: b.eerst });
    for (const t of b.klant) uit.push({ id, soort: 'klant', tekst: t });
    for (const [k, t] of Object.entries(b.eind)) uit.push({ id, soort: 'eind:' + k, tekst: t });
  }
  return uit;
}
