// Loopbaan (#381): per vak (trein, bus, padel, een bijbaan, een racegame, ...) een teller, niveaus met
// ervaringspunten, een verzonnen functietitel per niveau en een loonfactor per niveau. Hoe meer je een
// vak doet, hoe hoger je niveau en hoe meer je er verdient. Elk vak heeft een eerste klus en een eigen
// startplek (#431): je begint een loopbaan zelf, en de eerste punten beginnen hem ook.
//
// Pure regels, geen DOM, geen THREE, geen opslag en geen klok: loopbaanlive.js hangt de haken van het spel
// eraan, loopbaanui.js tekent het Loopbaan-scherm (scripts/loopbaan_test.mjs, scripts/loopbaan_balans_test.mjs).
// Het profiel is van de speler en leeft in zijn eigen opslag (gde-loopbaan-v1), nooit in een savegame:
// wie samen speelt neemt zijn loopbaan mee naar elke wereld (docs/LOOPBAAN.md). Alle titels zijn verzonnen
// (constitution 2): geen echte bedrijven of beroepsorganisaties.

export const SLEUTEL_VERSIE = 1;
export const MAX_NIVEAU = 6;
// Ervaringspunten waarmee niveau 1 tot en met 6 begint.
export const XP_DREMPELS = [0, 50, 140, 300, 560, 950];
// Wat een vak betaalt per niveau, ten opzichte van niveau 1. Een bovengrens van +30%: de balans van de
// economie (docs/LOOPBAAN.md) verandert er nauwelijks door; het is een beloning, geen sprong.
export const LOON_FACTOR = [1, 1.05, 1.1, 1.16, 1.22, 1.3];
// Een nieuwe plek of baan in een vak (een andere padelbaan, een ander station) geeft eenmalig extra punten.
export const UNIEK_XP = 8;
const MAX_UNIEK = 120;      // per vak: zoveel verschillende plekken onthouden we
const MAX_XP = 100000;
const MAX_N = 1e7;

// #846: de blijvende beloning voor wie alle negentien loopbanen met een echte eerste klus begint: de titel
// "De Duizendpoot" (afgeleid uit het profiel, dus altijd terug te zien) en eenmalig €750. Het bedrag staat
// hier als regel, niet in de UI of de haak; het gaat nooit door de loonfactor en wordt nooit met gasten gedeeld
// (het is een prestatie van deze speler op dit apparaat). Zie docs/LOOPBAAN.md en loopbaanlive.js.
export const DUIZENDPOOT_TITEL = 'De Duizendpoot';
export const DUIZENDPOOT_EURO = 750;

export const GROEPEN = [
  { id: 'vervoer', naam: 'Vervoer' },
  { id: 'werk', naam: 'Werk' },
  { id: 'spel', naam: 'Sport en spel' },
];

// eenheid: wat de teller telt; uniek: wat we per vak onthouden voor de variatie.
export const VAKKEN = [
  { id: 'trein', groep: 'vervoer', naam: 'Spoor', icoon: 'trein', eenheid: 'km', uniek: 'stations',
    wat: 'Reizen per trein, kaartjes controleren op het perron (vanaf Kaartjesknipper) en een dienst als machinist.',
    titels: ['Perronstaander', 'Vaste reiziger', 'Kaartjesknipper', 'Conducteur', 'Machinist', 'Spoorbaas van het Noorden'] },
  { id: 'bus', groep: 'vervoer', naam: 'Bus', icoon: 'bus', eenheid: 'km', uniek: 'lijnen',
    wat: 'Rijden met een bus en lijndiensten in stad en streek.',
    titels: ['Haltewachter', 'Invalchauffeur', 'Lijnchauffeur', 'Dienstroosterheld', 'Hoofd van de halte', 'Busbaas van Grunn'] },
  { id: 'taxi', groep: 'vervoer', naam: 'Taxi', icoon: 'taxi', eenheid: 'ritten', uniek: 'diensten',
    wat: 'Mensen van A naar B brengen, overdag en in de nacht.',
    titels: ['Meerijder', 'Invaltaxichauffeur', 'Nachtrijder', 'Stadsrijder', 'Taxiheld', 'Koning van de standplaats'] },
  { id: 'bezorg', groep: 'vervoer', naam: 'Bezorging', icoon: 'pakket', eenheid: 'ritten', uniek: 'diensten',
    wat: 'Pakjes, soep en verhuisdozen op tijd afleveren.',
    titels: ['Pakjesdrager', 'Rondbrenger', 'Bezorger', 'Koerier', 'Routeplanner', 'Baas van de bestelbus'] },
  { id: 'vracht', groep: 'vervoer', naam: 'Vrachtwagen', icoon: 'vrachtwagen', eenheid: 'ritten', uniek: 'diensten',
    wat: 'Opleggers, melk en bieten: zwaar vervoer over de weg.',
    titels: ['Bijrijder', 'Opleggerkoppelaar', 'Vrachtrijder', 'Containerchauffeur', 'Chef wagenpark', 'Baas van de snelweg'] },
  { id: 'water', groep: 'vervoer', naam: 'Water', icoon: 'boot', eenheid: 'km', uniek: 'diensten',
    wat: 'Varen met een rondvaartboot, een veerboot of een strandwacht.',
    titels: ['Dekhulp', 'Roeier', 'Schipper', 'Kapitein', 'Havenmeester', 'Zeebaas van de Waddenzee'] },
  { id: 'lucht', groep: 'vervoer', naam: 'Lucht', icoon: 'heli', eenheid: 'vluchten', uniek: 'plekken',
    wat: 'Vliegen met een helikopter of een vliegtuig.',
    titels: ['Wolkenkijker', 'Helikopterhulp', 'Piloot in opleiding', 'Piloot', 'Gezagvoerder', 'Luchtbaas van het Noorden'] },

  { id: 'handhaving', groep: 'werk', naam: 'Handhaving', icoon: 'schild', eenheid: 'diensten', uniek: 'diensten',
    wat: 'Toezicht, berging, bruggen en de rechtbank.',
    titels: ['Stagiair handhaving', 'Parkeercontroleur', 'Boa', 'Hoofdboa', 'Opsporingsambtenaar', 'Commandant van de wijk'] },
  { id: 'kantoor', groep: 'werk', naam: 'Kantoor', icoon: 'balie', eenheid: 'diensten', uniek: 'diensten',
    wat: 'Loketten, balies en dossiers in de stad.',
    titels: ['Stagiair achter de balie', 'Baliemedewerker', 'Dossierbeheerder', 'Teamleider', 'Afdelingshoofd', 'Directeur Loketzaken'] },
  { id: 'podium', groep: 'werk', naam: 'Podium', icoon: 'masker', eenheid: 'optredens', uniek: 'diensten',
    wat: 'Cabaret, rave, radio en de schouwburg.',
    titels: ['Figurant', 'Opkomer', 'Presentator', 'Cabaretier', 'Dagvoorzitter', 'Ster van het stadspodium'] },
  { id: 'horeca', groep: 'werk', naam: 'Horeca', icoon: 'pan', eenheid: 'diensten', uniek: 'diensten',
    wat: 'Pannenkoeken, frituur, borrels en een robotkok.',
    titels: ['Afwashulp', 'Bediening', 'Kok', 'Sous-chef', 'Chef-kok', 'Patron van de pannenkoek'] },
  { id: 'kermis', groep: 'werk', naam: 'Kermis', icoon: 'rad', eenheid: 'ritten', uniek: 'attracties',
    wat: 'De kermis draaiende houden en zelf in de attracties.',
    titels: ['Kermisganger', 'Lotenkoper', 'Ritjesmeester', 'Draaimolenhulp', 'Kermisexploitant', 'Kermiskoning'] },
  { id: 'landbouw', groep: 'werk', naam: 'Landbouw', icoon: 'trekker', eenheid: 'oogsten', uniek: 'diensten',
    wat: 'Met de trekker het land op: rooien, balen en de oogst naar de fabriek.',
    titels: ['Veldhulp', 'Zaaier', 'Trekkerrijder', 'Loonwerker', 'Akkerbouwer', 'Bietenbaron van Oldambt'] },
  { id: 'klus', groep: 'werk', naam: 'Klussen', icoon: 'hamer', eenheid: 'klussen', uniek: 'diensten',
    wat: 'Alles wat nergens anders bij hoort.',
    titels: ['Hulpje', 'Klusser', 'Allrounder', 'Vakman', 'Uitvoerder', 'Meesterklusser'] },

  { id: 'padel', groep: 'spel', naam: 'Padel', icoon: 'padel', eenheid: 'potjes', uniek: 'banen',
    wat: 'Potjes padel, hoe meer banen hoe beter.',
    titels: ['Beginner op de baan', 'Clublid', 'Wedstrijdspeler', 'Dubbelspecialist', 'Baankampioen', 'Padelkoning van Grunn'] },
  { id: 'golf', groep: 'spel', naam: 'Golf', icoon: 'vlag', eenheid: 'rondes', uniek: 'banen',
    wat: 'Discgolf en pitch and putt.',
    titels: ['Eerste worp', 'Rondespeler', 'Mandenjager', 'Baankenner', 'Kampioen van het Stadspark', 'Meester van de mand'] },
  { id: 'hengelen', groep: 'spel', naam: 'Vissen', icoon: 'vis', eenheid: 'vangsten', uniek: 'plekken',
    wat: 'Hengelen op elk water van de provincie: hoe meer soorten en plekken, hoe meer het oplevert.',
    titels: ['Dobbertjeskijker', 'Aasgooier', 'Visjager', 'Hengelaar van stand', 'Meester van het water', 'Visbaas van het Noorden'] },
  { id: 'race', groep: 'spel', naam: 'Racen', icoon: 'race', eenheid: 'races', uniek: 'banen',
    wat: 'Karten, driften, de regatta en de bruggenrace.',
    titels: ['Beginnend racer', 'Rondjesrijder', 'Podiumjager', 'Raceheld', 'Kampioen van Ulrum', 'Racelegende'] },
  { id: 'buiten', groep: 'spel', naam: 'Buiten', icoon: 'boom', eenheid: 'activiteiten', uniek: 'activiteiten',
    wat: 'Skaten, skiën, klimmen, zwemmen en wandelen.',
    titels: ['Wandelaar', 'Skater', 'Zwemmer', 'Klimmer', 'Buitensporter', 'Buitenmens van het Noorden'] },
];
export const VAK_IDS = VAKKEN.map((v) => v.id);
const BY_ID = new Map(VAKKEN.map((v) => [v.id, v]));
export const vakInfo = (id) => BY_ID.get(id) || null;

// Welk vak een bijbaan (sidejobs.js) is; wat nergens in staat is een klus.
const BAAN_VAK = {
  bus: 'bus', lijn: 'bus', schoolrit: 'bus', museumbus: 'bus',
  taxi: 'taxi', taxinacht: 'taxi', bernard: 'taxi', bernardrit: 'taxi',
  bezorger: 'bezorg', krantenwijk: 'bezorg', fietssoep: 'bezorg', verhuizing: 'bezorg',
  vracht: 'vracht', melkrit: 'vracht', suikerbieten: 'vracht',
  bietenoogst: 'landbouw', balenrit: 'landbouw', boerderij: 'landbouw',
  rondvaart: 'water', rondvaarttour: 'water', veerdienst: 'water', strandpost: 'water',
  zeeschipwad: 'water', zeeschipeems: 'water',
  boa: 'handhaving', rechtbank: 'handhaving', fietsdepot: 'handhaving', berging: 'handhaving', brugdienst: 'handhaving', herstelploeg: 'handhaving',
  loket: 'kantoor', studiestaat: 'kantoor', wolkenhal: 'kantoor', vandermeden: 'kantoor',
  cabaret: 'podium', promotie: 'podium', oogtv: 'podium', telefoonrave: 'podium', schouwburg: 'podium',
  vigilantia: 'horeca', niemeyer: 'horeca', snackoverlast: 'horeca',
  kermisdraai: 'kermis',
  kamerkoning: 'klus', helix: 'klus', energielabel: 'klus', tjalke: 'klus',
};
export const BAAN_IDS = Object.keys(BAAN_VAK);
export const vakVanBaan = (id) => BAAN_VAK[id] || 'klus';
// De banen van een vak, voor het scherm: zo laten we alle soorten werk zien.
export const banenVan = (vak) => BAAN_IDS.filter((b) => BAAN_VAK[b] === vak);

// De eerste klus van een vak (#431): de baan waarmee je begint (`baan`, een id uit sidejobs.js) of, voor de
// vakken zonder bijbaan, de activiteit die de teller op gang brengt; `plek` zegt waar je moet staan. Zo is elke
// loopbaan vanaf zijn eigen startplek (de baan staat daar) of vanuit het Loopbaan-scherm te beginnen, en is de
// eerste klus nooit "zoek het zelf maar uit". De eerste klus van een baan is altijd een baan van datzelfde vak.
export const START = {
  trein: { baan: null, plek: 'Station Groningen', klus: 'Reis één keer met de trein, rijd een dienst als machinist (stap bij de cabine in, druk E en dan G) en controleer vanaf niveau 3 kaartjes op het perron.' },
  bus: { baan: 'lijn', plek: 'Bij de streekbus', klus: 'Eén dienst op de lijn: instappen en de route rijden.' },
  taxi: { baan: 'taxi', plek: 'Bij de taxistandplaats', klus: 'Eén rit met een klant van A naar B.' },
  bezorg: { baan: 'bezorger', plek: 'Bij de bezorgbus', klus: 'Eén ronde pakjes rondbrengen.' },
  vracht: { baan: 'vracht', plek: 'Bij de vrachtwagen', klus: 'Eén vrachtrit over de weg.' },
  water: { baan: 'rondvaart', plek: 'Bij de rondvaartboot', klus: 'Eén rondvaart met gasten aan boord.' },
  lucht: { baan: null, plek: 'Vliegschool De Windwijzer op Eelde', klus: 'Volg je eerste vliegles, met het vliegtuig of de helikopter.' },
  handhaving: { baan: 'fietsdepot', plek: 'Bij het fietsdepot', klus: 'Eén dienst in het fietsdepot.' },
  kantoor: { baan: 'loket', plek: 'Bij het loket', klus: 'Eén dienst achter de balie.' },
  podium: { baan: 'promotie', plek: 'Bij het promotieteam', klus: 'Eén promotiedienst of optreden.' },
  horeca: { baan: 'vigilantia', plek: 'Bij het café', klus: 'Eén dienst in de horeca.' },
  kermis: { baan: 'kermisdraai', plek: 'Bij de kermisattractie', klus: 'Eén attractie draaiende houden.' },
  landbouw: { baan: 'bietenoogst', plek: 'Bij de akker', klus: 'Eén oogst: vier rijen bieten rooien en naar de fabriek brengen.' },
  klus: { baan: 'helix', plek: 'Bij de klus', klus: 'Eén klus voor een van de bedrijven in de stad.' },
  padel: { baan: null, plek: 'Op de dichtstbijzijnde padelbaan', klus: 'Eén potje padel, gewonnen of verloren.' },
  golf: { baan: null, plek: 'Het Stadspark of een golfbaan', klus: 'Eén ronde discgolf of pitch and putt.' },
  hengelen: { baan: null, plek: 'Aan de kant van elk water', klus: 'Hengel één vis aan de kant (I).' },
  race: { baan: null, plek: 'Kardinge of een driftzone', klus: 'Eén kartrace of driftronde.' },
  buiten: { baan: null, plek: 'Het Stadspark of het Grunopark', klus: 'Eén activiteit buiten: skaten, skiën, klimmen, zwemmen of wandelen.' },
};
export const startVan = (vak) => START[vak] || null;
// De eerste klus is begonnen: een vak met voortgang telt als gestart, ook als het profiel van voor #431 is.
export const isGestart = (profiel, vak) => !!(profiel && Array.isArray(profiel.gestart) && profiel.gestart.includes(vak));
// Een loopbaan beginnen (vanuit het Loopbaan-scherm of de eerste punten van een vak): eenmalig, geeft de eerste klus terug.
export function startVak(profiel, vak) {
  if (!BY_ID.has(vak) || !profiel) return { gestart: false, nieuw: false, start: null };
  if (!Array.isArray(profiel.gestart)) profiel.gestart = [];
  const nieuw = !profiel.gestart.includes(vak);
  if (nieuw) profiel.gestart.push(vak);
  return { gestart: true, nieuw, start: startVan(vak) };
}
// Zijn alle loopbanen van een verhaalstap al begonnen? Dan telt die stap zijn loopbanen als gedaan (#431).
export const loopbanenGestart = (profiel, lijst) => (Array.isArray(lijst) ? lijst : []).every((v) => isGestart(profiel, v));

// Wat een niveau in een vak aan een nieuwe handeling geeft (#437): een niveau omhoog is niet alleen een titel en wat meer
// loon, er komt iets te doen bij. Het Loopbanen-scherm laat de hoogste vaardigheid zien, zodat een kaartje niet het enige
// is wat je van een niveau merkt; de handeling zelf zit in het spel (kaartjescontrole.js bij Spoor). Een vaardigheid geldt
// vanaf zijn niveau en blijft daarna.
export const VAARDIGHEDEN = {
  trein: [
    { niveau: 2, titel: 'Vaste reiziger', wat: 'Korting op je treinkaartje: hoe hoger je niveau in het spoor, hoe goedkoper je reist.' },
    { niveau: 3, titel: 'Kaartjesknipper', wat: 'Op het perron van elk station: loop naar een reiziger en druk E. Een paar reizigers achter elkaar is een ronde die uitbetaalt en punten geeft; per station hooguit één ronde per kwartier.' },
  ],
};
// De hoogste vaardigheid die dit niveau al gaf, of null als er bij dit vak niets bij komt.
export function vaardigheidVan(vak, niveau) {
  let uit = null;
  for (const v of VAARDIGHEDEN[vak] || []) if (v.niveau <= niveau) uit = v;
  return uit;
}

// De treinloopbaan is meer dan reizen en kaartjes knippen: je rijdt zelf een volledige dienst als machinist (#437). De
// dienst bestaat al in machinist.js; deze regel brengt hem naar het Loopbanen-scherm, met de stand als hij loopt. `service`
// is wat getServiceMapState(world) geeft (stops met name/next/done) of null. Puur, zodat loopbaan_test.mjs hem dekt.
export function dienstTekst(service) {
  const stops = service && Array.isArray(service.stops) ? service.stops : [];
  if (!stops.length) return 'Dienst als machinist: stap bij de cabine in een stilstaande trein (E), druk dan G. Elke halte van de dienst telt mee voor Spoor.';
  const klaar = stops.filter((s) => s.done).length;
  const next = stops.find((s) => s.next);
  return `Dienst als machinist: ${klaar} van ${stops.length} halten klaar${next ? `, volgende ${next.name}` : ', laatste halte'}.`;
}

// Welke uitdaging van de nagame (postgame.js) bij welk vak hoort.
const UITDAGING_VAK = { bruggen: 'race', skutsje: 'water', fierljep: 'buiten', koe: 'buiten', fjord: 'horeca' };
export const vakVanUitdaging = (id) => UITDAGING_VAK[id] || 'buiten';

// Ervaring en premie voor gebeurtenissen die de prestaties al tellen (achievements.js recordStat): vak,
// punten, teller (n) en een eventuele vaste premie in euro (nieuw geld voor vakken die niets uitbetalen).
export const STAT_VAK = {
  discgolfRounds: { vak: 'golf', xp: 40, n: 1, premie: 20 },
  pitchputtRounds: { vak: 'golf', xp: 28, n: 1, premie: 15 },
  hengelSessions: { vak: 'hengelen', xp: 24, n: 1, premie: 10 },
  skateRuns: { vak: 'buiten', xp: 10, n: 1, premie: 10 },
  skiRuns: { vak: 'buiten', xp: 10, n: 1, premie: 10 },
  klimTops: { vak: 'buiten', xp: 15, n: 1, premie: 15 },
  zwemRuns: { vak: 'buiten', xp: 8, n: 1 },
  wandelingen: { vak: 'buiten', xp: 8, n: 1 },
  heliRuns: { vak: 'lucht', xp: 22, n: 1, premie: 20 },
  pannenkoekShifts: { vak: 'horeca', xp: 30, n: 1, premie: 20 },
  reuzenradRides: { vak: 'kermis', xp: 10, n: 1 },
};

// Kilometers die het spel al meet (achievementtracker.js): ervaring per km.
export const KM_XP = { trein: 1.5, bus: 3, water: 3 };

export const nieuwVak = () => ({ xp: 0, n: 0, uniek: [] });
export function nieuwProfiel() {
  const vakken = {};
  for (const id of VAK_IDS) vakken[id] = nieuwVak();
  // kaarten: welke verhaalstappen al een eenmalig loopbaankaartje gaven (#846); duizendpoot: de eenmalige
  // beloning van #846 is betaald. Allebei per speler/apparaat, in hetzelfde profiel als de vakken.
  return { v: SLEUTEL_VERSIE, vakken, gestart: [], kaarten: [], duizendpoot: false };
}

// --- eerste klus (#846) ----------------------------------------------------
// De maatstaf voor het verhaalmoment, de teller en de prestatie is de eerste klus die echt gedaan is: punten of
// een getelde eenheid in het vak (`xp > 0 || n > 0`). Alleen een loopbaan starten vanuit het menu zet `gestart`
// en telt dus niet mee. Een profiel dat uit de prestaties gezaaid is (zaaiUitPrestaties) telt wel: die speler
// heeft die activiteit echt gedaan, alleen nog voordat de loopbaan bestond.
export function eersteKlusGedaan(profiel, vak) {
  if (!BY_ID.has(vak) || !profiel || !profiel.vakken) return false;
  const v = profiel.vakken[vak];
  if (!v || typeof v !== 'object') return false;
  return (Number(v.xp) || 0) > 0 || (Number(v.n) || 0) > 0;
}
export function eersteKlussen(profiel) {
  let n = 0;
  for (const id of VAK_IDS) if (eersteKlusGedaan(profiel, id)) n++;
  return n;
}
// De stand van de overkoepelende teller: hoeveel van de negentien loopbanen zijn begonnen, en de titel als het
// er allemaal zijn. Puur afgeleid, dus altijd gelijk aan het profiel en zonder tweede teller.
export function eersteKlusStand(profiel) {
  const gedaan = eersteKlussen(profiel);
  const totaal = VAKKEN.length;
  const klaar = gedaan >= totaal;
  return { gedaan, totaal, rest: totaal - gedaan, klaar, titel: klaar ? DUIZENDPOOT_TITEL : null };
}
// Het eenmalige kaartje bij een verhaalstap (#846): de titel en de body in gewone taal, uit START. Puur; het
// tonen en het eenmalig onthouden zit in loopbaankaarten.js en in het profiel hieronder.
export function kaartVoorVak(vak) {
  const info = BY_ID.get(vak);
  const start = startVan(vak);
  if (!info || !start) return null;
  return { vak, titel: `Loopbaan in zicht: ${info.naam}`, tekst: `Eerste klus: ${start.klus} · ${start.plek}` };
}
export const kaartGezien = (profiel, vak) => !!(profiel && Array.isArray(profiel.kaarten) && profiel.kaarten.includes(vak));
export function markeerKaart(profiel, vak) {
  if (!profiel || !BY_ID.has(vak)) return false;
  if (!Array.isArray(profiel.kaarten)) profiel.kaarten = [];
  if (profiel.kaarten.includes(vak)) return false;
  profiel.kaarten.push(vak);
  return true;
}
export const duizendpootKlaar = (profiel) => !!(profiel && profiel.duizendpoot === true);
// De eenmalige beloning uitkeren: alleen als alle negentien loopbanen begonnen zijn en hij nog niet betaald is.
// Alleen het profiel verandert hier; het geld en de melding doet loopbaanlive.js, zodat dit bestand puur blijft.
export function markeerDuizendpoot(profiel) {
  if (!profiel || profiel.duizendpoot === true) return false;
  if (!eersteKlusStand(profiel).klaar) return false;
  profiel.duizendpoot = true;
  return true;
}

const geheel = (x, max) => (Number.isFinite(x) ? Math.max(0, Math.min(max, Math.floor(x))) : 0);

// Een profiel uit opslag (of iets anders): leeg, oud of kapot geeft een geldig profiel; onbekende vakken gaan weg,
// getallen worden begrensd. Een vak met voortgang geldt als begonnen, ook als het profiel van voor #431 is.
export function normaliseer(raw) {
  const p = nieuwProfiel();
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  if (!d || typeof d !== 'object' || d.v !== SLEUTEL_VERSIE || !d.vakken || typeof d.vakken !== 'object') return p;
  for (const id of VAK_IDS) {
    const s = d.vakken[id];
    if (!s || typeof s !== 'object') continue;
    const v = p.vakken[id];
    v.xp = geheel(s.xp, MAX_XP);
    v.n = geheel(s.n, MAX_N);
    if (Array.isArray(s.uniek)) v.uniek = [...new Set(s.uniek.filter((x) => typeof x === 'string' && x && x.length <= 60))].slice(0, MAX_UNIEK);
  }
  if (Array.isArray(d.gestart)) p.gestart = [...new Set(d.gestart.filter((x) => BY_ID.has(x)))];
  // #846: de eenmalig getoonde kaartjes en de eenmalige beloning horen bij hetzelfde profiel; onbekende of
  // dubbele waarden gaan weg, en wie de beloning al kreeg, houdt hem (nooit twee keer uitbetalen).
  if (Array.isArray(d.kaarten)) p.kaarten = [...new Set(d.kaarten.filter((x) => BY_ID.has(x)))];
  if (d.duizendpoot === true) p.duizendpoot = true;
  markeerGestart(p);
  if (d.zaad === true) p.zaad = true;
  return p;
}

// Wie al iets in een vak deed, is er ooit aan begonnen: de verhaalstap die bij dat vak hoort telt dan als gedaan.
function markeerGestart(p) {
  for (const id of VAK_IDS) {
    const v = p.vakken[id];
    if ((v.xp > 0 || v.n > 0 || v.uniek.length) && !p.gestart.includes(id)) p.gestart.push(id);
  }
  return p;
}

// Voor een nieuwe sleutel: begin niet bij nul als de speler al lang speelt. Een deel van wat de prestaties
// (gde-prestaties-v1) al telden, hooguit tot niveau 3. stats: de levensduur-tellers; sets: de lijsten met plekken.
const ZAAD_PER_STAT = {
  trainTrips: ['trein', 20], padelMatches: ['padel', 6], kartRaces: ['race', 5], regatta: ['race', 5], driftRuns: ['race', 3],
  discgolfRounds: ['golf', 6], pitchputtRounds: ['golf', 5], hengelSessions: ['hengelen', 4], skateRuns: ['buiten', 3], skiRuns: ['buiten', 3],
  klimTops: ['buiten', 5], heliRuns: ['lucht', 7], pannenkoekShifts: ['horeca', 7], botsautoRides: ['kermis', 4], reuzenradRides: ['kermis', 3], carbidGames: ['kermis', 4],
};
export const ZAAD_MAX_XP = XP_DREMPELS[2];
export function zaaiUitPrestaties(stats, sets) {
  const p = nieuwProfiel();
  const s = stats && typeof stats === 'object' ? stats : {};
  for (const [key, [vak, per]] of Object.entries(ZAAD_PER_STAT)) {
    const n = Number(s[key]);
    if (!(n > 0)) continue;
    const v = p.vakken[vak];
    v.xp = Math.min(ZAAD_MAX_XP, v.xp + Math.floor(n * per));
    if (vak !== 'trein') v.n = geheel(v.n + n, MAX_N);
  }
  const st = sets && Array.isArray(sets.trainStations) ? sets.trainStations.filter((x) => typeof x === 'string' && x && x.length <= 60).slice(0, MAX_UNIEK) : [];
  if (st.length) { p.vakken.trein.uniek = st; p.vakken.trein.xp = Math.min(ZAAD_MAX_XP, p.vakken.trein.xp + st.length * UNIEK_XP); }
  p.zaad = true;
  return markeerGestart(p);
}

// --- niveaus ---------------------------------------------------------------

export function niveauVan(xp) {
  let n = 1;
  for (let i = 1; i < XP_DREMPELS.length; i++) if (xp >= XP_DREMPELS[i]) n = i + 1;
  return n;
}
export const titelVan = (vak, niveau) => {
  const v = BY_ID.get(vak);
  return v ? v.titels[Math.max(1, Math.min(MAX_NIVEAU, niveau)) - 1] : '';
};
export const factorVoorNiveau = (niveau) => LOON_FACTOR[Math.max(1, Math.min(MAX_NIVEAU, niveau)) - 1];

export const niveauVoorVak = (profiel, vak) => (profiel.vakken[vak] ? niveauVan(profiel.vakken[vak].xp) : 1);
export const loonFactor = (profiel, vak) => factorVoorNiveau(niveauVoorVak(profiel, vak));
// Een bedrag aan loon in dit vak: het basisbedrag keer de factor, op hele euro's, nooit minder dan 1 als er iets was.
export function loon(profiel, vak, basis) {
  if (!(basis > 0)) return 0;
  return Math.max(1, Math.round(basis * loonFactor(profiel, vak)));
}
export const percentage = (factor) => Math.round((factor - 1) * 100);

// Het volgende doel van een vak: het niveau, de titel en hoeveel punten er nog nodig zijn (null op het hoogste niveau).
export function volgendDoel(profiel, vak) {
  const v = profiel.vakken[vak];
  const xp = v ? v.xp : 0;
  const nu = niveauVan(xp);
  const van = XP_DREMPELS[nu - 1];
  if (nu >= MAX_NIVEAU) return { niveau: nu, titel: titelVan(vak, nu), volgend: null, nodig: 0, deel: 1, xp };
  const tot = XP_DREMPELS[nu];
  return { niveau: nu, titel: titelVan(vak, nu), volgend: titelVan(vak, nu + 1), volgendNiveau: nu + 1, nodig: tot - xp, deel: Math.max(0, Math.min(1, (xp - van) / (tot - van))), xp, tot, extra: percentage(factorVoorNiveau(nu + 1)) };
}

// De eerstvolgende stap in gewone taal (#671): hoeveel punten nog, hoeveel nieuwe plekken, rondes of kilometers dat
// is, en waar je die doet. De drempels en de puntentelling blijven ongewijzigd; dit is alleen uitleg bij de balk.
// `ind` is optioneel (de verover-indeling); de banen komen uit BAAN_VAK en de startplek uit START.
const ENKEL = { km: 'km', ritten: 'rit', potjes: 'potje', rondes: 'ronde', races: 'race', diensten: 'dienst', optredens: 'optreden', vluchten: 'vlucht', klussen: 'klus', activiteiten: 'activiteit', vangsten: 'vangst', oogsten: 'oogst' };

// De punten van één gemiddelde ronde in dit vak: de bekende STAT_VAK-xp (discgolf, hengelen, padel, ...), anders
// de km-punten van een rit van 10 km, anders een kleine aanname zodat de regel altijd iets zegt.
function xpPerRonde(vak) {
  let best = 0;
  for (const s of Object.values(STAT_VAK)) if (s.vak === vak) best = Math.max(best, s.xp || 0);
  if (best > 0) return best;
  const km = KM_XP[vak];
  return km ? km * 10 : 10;
}

export function volgendeStap(profiel, vak, ind = null) {
  const info = BY_ID.get(vak);
  const v = profiel && profiel.vakken ? profiel.vakken[vak] : null;
  if (!info || !v) return null;
  const d = volgendDoel(profiel, vak);
  const banen = banenVan(vak);
  const start = startVan(vak);
  // Waar je het doet: de eerste nog niet gedane baan van dit vak, anders de eerste baan van het vak.
  const gedaan = new Set(Array.isArray(v.uniek) ? v.uniek : []);
  const baan = banen.find((b) => !gedaan.has(b)) || banen[0] || null;
  const plek = start ? start.plek : '';
  if (!d.volgend) {
    return { vak, niveau: d.niveau, klaar: true, nodig: 0, tekst: `Hoogste niveau van ${info.naam} bereikt: ${d.titel}.`, waar: baan, banen, plek, eenheid: info.eenheid };
  }
  const perRonde = xpPerRonde(vak);
  const plekken = Math.max(0, Math.ceil(d.nodig / UNIEK_XP));
  const rondes = perRonde > 0 ? Math.max(0, Math.ceil(d.nodig / perRonde)) : 0;
  const tel = (n, eenheid) => `${n} ${n === 1 ? ENKEL[eenheid] || eenheid : eenheid}`;
  const opties = [];
  if (plekken > 0 && info.uniek) opties.push(tel(plekken, info.uniek));
  if (info.eenheid === 'km' && KM_XP[vak]) opties.push(`${Math.max(1, Math.ceil(d.nodig / KM_XP[vak]))} km`);
  else if (rondes > 0) opties.push(tel(rondes, info.eenheid));
  const hoe = opties.length > 1 ? opties.join(' of ') : opties[0] || 'een volgende klus';
  const tekst = `Nog ${Math.round(d.nodig)} punten tot niveau ${d.volgendNiveau} (${d.volgend}): ${hoe}.`;
  return { vak, niveau: d.niveau, volgendNiveau: d.volgendNiveau, titel: d.volgend, nodig: Math.round(d.nodig), plekken, rondes, tekst, waar: baan, banen, plek, eenheid: info.eenheid };
}

// --- punten tellen ---------------------------------------------------------

// Tel een gebeurtenis bij een vak: n (de teller), xp, en een nieuwe plek (uniek). Verandert het profiel.
// Geeft { xp, omhoog } terug: omhoog is { vak, van, naar, titel } als het niveau steeg, anders null.
export function tel(profiel, vak, { n = 0, xp = 0, uniek = null } = {}) {
  const v = profiel.vakken[vak];
  if (!v) return { xp: 0, omhoog: null };
  const voor = niveauVan(v.xp);
  let punten = Number.isFinite(xp) && xp > 0 ? xp : 0;
  if (typeof uniek === 'string' && uniek && uniek.length <= 60 && !v.uniek.includes(uniek)) {
    if (v.uniek.length < MAX_UNIEK) v.uniek.push(uniek);
    punten += UNIEK_XP;
  }
  punten = Math.round(punten);
  if (Number.isFinite(n) && n > 0) v.n = Math.min(MAX_N, v.n + Math.round(n * 10) / 10);
  v.xp = Math.min(MAX_XP, v.xp + punten);
  const na = niveauVan(v.xp);
  const omhoog = na > voor ? { vak, van: voor, naar: na, titel: titelVan(vak, na) } : null;
  return { xp: punten, omhoog };
}

// Kilometers van een rit (meters in): n in km en punten volgens KM_XP.
export const kmPunten = (vak, meters) => {
  const km = Math.max(0, Number(meters) || 0) / 1000;
  return { n: km, xp: km * (KM_XP[vak] || 0) };
};

// Eén regel over de teller van een vak: "86 km" of "12 potjes".
export function tellerTekst(profiel, vak) {
  const v = profiel.vakken[vak];
  const info = BY_ID.get(vak);
  if (!v || !info) return '';
  const n = info.eenheid === 'km' ? Math.round(v.n) : Math.floor(v.n);
  const eenh = n === 1 ? ({ ritten: 'rit', potjes: 'potje', rondes: 'ronde', races: 'race', diensten: 'dienst', optredens: 'optreden', vluchten: 'vlucht', klussen: 'klus', activiteiten: 'activiteit', vangsten: 'vangst' }[info.eenheid] || info.eenheid) : info.eenheid;
  return `${n.toLocaleString('nl-NL')} ${eenh}`;
}

// Samenvatting voor het overzicht en voor een naamplaatje bij samen spelen: de hoogste titel en de som van de niveaus.
export function samenvatting(profiel) {
  let hoogste = null, som = 0, aantal = 0;
  for (const info of VAKKEN) {
    const niv = niveauVoorVak(profiel, info.id);
    som += niv;
    if (profiel.vakken[info.id].xp > 0) aantal++;
    if (!hoogste || profiel.vakken[info.id].xp > profiel.vakken[hoogste.vak].xp) hoogste = { vak: info.id, niveau: niv };
  }
  const h = hoogste && profiel.vakken[hoogste.vak].xp > 0 ? { ...hoogste, titel: titelVan(hoogste.vak, hoogste.niveau) } : null;
  return { som, max: VAKKEN.length * MAX_NIVEAU, aantal, hoogste: h };
}

// Twee profielen samenvoegen (een tweede tabblad schreef ook): per vak het grootste.
export function voegSamen(a, b) {
  const p = normaliseer(a);
  const o = normaliseer(b);
  for (const id of VAK_IDS) {
    const x = p.vakken[id], y = o.vakken[id];
    x.xp = Math.max(x.xp, y.xp);
    x.n = Math.max(x.n, y.n);
    for (const u of y.uniek) if (!x.uniek.includes(u) && x.uniek.length < MAX_UNIEK) x.uniek.push(u);
    if (o.gestart.includes(id) && !p.gestart.includes(id)) p.gestart.push(id);
  }
  for (const k of o.kaarten) if (!p.kaarten.includes(k)) p.kaarten.push(k);
  if (o.duizendpoot) p.duizendpoot = true;
  if (o.zaad) p.zaad = true;
  return markeerGestart(p);
}

// Wat een gast op het eigen apparaat krijgt bij een beloning van de gastheer (docs/LOOPBAAN.md): de gastheer stuurt
// het deel van het bedrag voor zijn eigen factor, en de gast verdient daar zijn eigen loonfactor over. Een beloning
// zonder bekend vak blijft zoals ze was.
export const gastBedrag = (profiel, geld, vak) => (BY_ID.has(vak) ? loon(profiel, vak, geld) : geld);

// Waar het hogere loon van een vak zich laat zien, voor het scherm.
export function loonTekst(vak) {
  const info = BY_ID.get(vak);
  if (!info) return '';
  if (vak === 'trein') return 'Meer loon voor een dienst als machinist en korting op je kaartje.';
  if (info.groep === 'spel') return 'Meer prijzengeld en premie per keer.';
  return 'Meer loon voor elke dienst in dit vak.';
}

// --- #674: het hoogste niveau is buiten het Loopbanen-scherm te zien en geeft één concreet voordeel ---
// De loonfactor blijft begrensd (LOON_FACTOR, max 1,30); dit is een extra teken en gemak, geen economie.
// Per groep (vervoer, werk, spel) op niveau 6 in minstens één vak:
//  - vervoer: 20% korting op een reparatie bij de garage;
//  - werk: een ritje in de botsauto's is gratis;
//  - spel: de titel staat naast je naam op de kaart en bij wedstrijden (zichtbaarheid, geen geld).
export const TITEL_GROEP_KLEUR = { vervoer: '#4fb3ff', werk: '#f2c230', spel: '#5dff7a' };
export const GROEP_VOORDELEN = {
  vervoer: { id: 'garage', korting: 0.2, tekst: 'Bij de garage betaal je 20% minder voor een reparatie aan je eigen wagen.' },
  werk: { id: 'kermis', gratis: 'kermis', tekst: 'Een ritje in de botsauto\'s is gratis voor jou.' },
  spel: { id: 'titel', tekst: 'Je titel staat naast je naam op de kaart en bij wedstrijden.' },
};
// De hoogste titel van deze speler, als hij ergens op het hoogste niveau staat; anders null.
export function loopbaanTeken(profiel) {
  const s = samenvatting(profiel);
  if (!s.hoogste || s.hoogste.niveau < MAX_NIVEAU) return null;
  const info = BY_ID.get(s.hoogste.vak);
  if (!info) return null;
  return { vak: s.hoogste.vak, titel: s.hoogste.titel, niveau: s.hoogste.niveau, groep: info.groep, kleur: TITEL_GROEP_KLEUR[info.groep] || '#f0ede4' };
}
// Het voordeel van één groep, alleen als deze speler daar op het hoogste niveau staat.
export function groepVoordeel(profiel, groep) {
  if (!GROUP_IDS.has(groep)) return null;
  for (const info of VAKKEN) if (info.groep === groep && niveauVoorVak(profiel, info.id) >= MAX_NIVEAU) return GROEP_VOORDELEN[groep] || null;
  return null;
}
export const voordelenVan = (profiel) => GROEPEN.map((g) => groepVoordeel(profiel, g.id)).filter(Boolean);
export const garageKorting = (profiel) => (groepVoordeel(profiel, 'vervoer') ? GROEP_VOORDELEN.vervoer.korting : 0);
export const kermisGratis = (profiel) => !!groepVoordeel(profiel, 'werk');
const GROUP_IDS = new Set(GROEPEN.map((g) => g.id));
