// Loopbaan (#381): per vak (trein, bus, padel, een bijbaan, een racegame, ...) een teller, niveaus met
// ervaringspunten, een verzonnen functietitel per niveau en een loonfactor per niveau. Hoe meer je een
// vak doet, hoe hoger je niveau en hoe meer je er verdient.
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
  boa: 'handhaving', rechtbank: 'handhaving', fietsdepot: 'handhaving', berging: 'handhaving', brugdienst: 'handhaving', herstelploeg: 'handhaving',
  loket: 'kantoor', studiestaat: 'kantoor', wolkenhal: 'kantoor', vandermeden: 'kantoor',
  cabaret: 'podium', promotie: 'podium', oogtv: 'podium', telefoonrave: 'podium', schouwburg: 'podium',
  vigilantia: 'horeca', niemeyer: 'horeca',
  kermisdraai: 'kermis',
  kamerkoning: 'klus', helix: 'klus', energielabel: 'klus', tjalke: 'klus',
};
export const BAAN_IDS = Object.keys(BAAN_VAK);
export const vakVanBaan = (id) => BAAN_VAK[id] || 'klus';
// De banen van een vak, voor het scherm: zo laten we alle soorten werk zien.
export const banenVan = (vak) => BAAN_IDS.filter((b) => BAAN_VAK[b] === vak);

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
  return { v: SLEUTEL_VERSIE, vakken };
}

const geheel = (x, max) => (Number.isFinite(x) ? Math.max(0, Math.min(max, Math.floor(x))) : 0);

// Een profiel uit opslag (of iets anders): leeg, oud of kapot geeft een geldig profiel; onbekende vakken gaan weg,
// getallen worden begrensd.
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
  if (d.zaad === true) p.zaad = true;
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
  return p;
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
  }
  if (o.zaad) p.zaad = true;
  return p;
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
