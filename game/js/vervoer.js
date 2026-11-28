// Vervoer (#1375, bijbel 28-11 deel 2 hoofdstuk 3): de loopbaan van bus, taxi en trein bij Noorderspoor. De aanleiding is dat Dries Oltmans, de
// chauffeur van de laatste bus naar Winsum, met een zere rug thuis moet blijven; Tammo neemt zijn dienst over en Tessa doet het rooster.
// De verhaalstappen D1 tot en met D3 staan in storyarc_nieuw.js met hun scènes in docs/verhaal/nieuw/09-script-akte2.md; dit bestand is wat
// erachter blijft voor de eindeloze modus (het verhaal van vervoer is bewust klein):
//   - de kernlus en wat elke rang betekent (de Dienstkaart in het Loopbanen-scherm, loopbaanui.js),
//   - een verhaalmoment bij elke rang van bus, taxi en trein (de rang-haak, docs/RANKMOMENTS.md),
//   - de terugblik voor wie de aanleiding niet speelde (een gast, of wie de loopbaan via het scherm opent; bijbel 02 §0b regel 4),
//   - de Lijn van Dries: de lijn die langs Winsum rijdt krijgt die naam, zodat de eerste vaste lijn een gezicht heeft.
// Puur: geen DOM, geen wereld, geen THREE, geen opslag. Geld en punten zijn die van de loopbaan zelf (loopbaan.js, per speler).
//
// Samen spelen: lokaal per speler. Het rangmoment en de terugblik spelen op het apparaat van wie omhoog gaat of de loopbaan begint (een gast die
// via een beloning van de gastheer stijgt, ziet zijn eigen moment); elke speler houdt zijn eigen loon en punten, nooit gedeeld of dubbel.
// De bus, de reizigers en de rit zien alle spelers (coopbus.js, buscoop.js); een gast stapt niet halverwege een dienst in als bestuurder.
import { registerRankMoment } from './rankmoments.js';
import * as L from './loopbaan.js';
import { wgsToWorld } from './rdnew.js';

export const BEDRIJF = 'Noorderspoor';
export const LIJN_VAN_DRIES = 'Lijn van Dries';
export const VERVOER_VAKKEN = ['bus', 'taxi', 'trein'];
// De verhaalvlag die stap D2 zet (storyarc_nieuw.js unlocks): wie hem heeft, speelde de aanleiding zelf en krijgt geen terugblik.
export const VERVOER_VLAG = 'vervoer';
// Winsum, waar Dries woont en de bus van D2 staat: de lijn die hier langs rijdt is de Lijn van Dries.
export const WINSUM = [53.33302, 6.51598];

// --- de kernlus en de rangen ------------------------------------------------------------------------------------------------------------

// Eén lus voor alle drie: kies een dienst, rij hem volgens het rooster, haal je tijden, krijg loon en punten, stijg in rang.
export const KERNLUS = [
  'Kies een dienst: de lijn van de streekbus, een taxistandplaats of een stoptrein van Noorderspoor.',
  'Rij hem volgens het rooster. Niet te vroeg weg, niet te laat aan.',
  'Laat reizigers rustig in- en uitstappen. Rem zacht, de reizigers staan.',
  'Een nette dienst geeft loon en punten; een slechte dienst alleen minder tevreden reizigers.',
  'Met genoeg punten stijg je in rang, en elke rang geeft meer loon en een nieuwe verantwoordelijkheid.',
];

// Wat de rang betekent voor een speler (zelfde trap voor bus, taxi en trein; de titels komen uit loopbaan.js, de rol is voor alle drie gelijk).
export const ROLLEN = [
  { niveau: 1, rol: 'Invaller', wat: 'Je springt bij voor Dries: de eerste dienst, op de lijn die hij achterliet.' },
  { niveau: 2, rol: 'Vaste invaller', wat: 'Je staat op het rooster van Noorderspoor: de eerste vaste lijn is van jou.' },
  { niveau: 3, rol: 'Nachtdienst', wat: 'Je rijdt de nachtdienst en de aansluiting bij het station.' },
  { niveau: 4, rol: 'Dienstleider', wat: 'Je draait de drukke dagen, zoals de drukste zaterdag van de zomer.' },
  { niveau: 5, rol: 'Eigen dienst', wat: 'Een eigen standplaats of halte en een eigen dienst die jij bedenkt.' },
  { niveau: 6, rol: 'Baas van de lijn', wat: 'De lijn bestaat veertig jaar en jij hoort bij de mensen die hem draaiende hielden.' },
];

// De Dienstkaart voor het Loopbanen-scherm: de kernlus, de rol van dit niveau en wat de volgende rang aan rol geeft. null voor een ander vak.
export function vervoerGids(vak, niveau) {
  if (!VERVOER_VAKKEN.includes(vak)) return null;
  const info = L.vakInfo(vak);
  if (!info) return null;
  const n = Math.max(1, Math.min(L.MAX_NIVEAU, Math.floor(niveau) || 1));
  const nu = ROLLEN[n - 1];
  const straks = n < L.MAX_NIVEAU ? ROLLEN[n] : null;
  return {
    titel: `Zo werkt vervoer bij ${BEDRIJF}`,
    stappen: KERNLUS.slice(),
    nu: { titel: info.titels[n - 1], rol: nu.rol, wat: nu.wat },
    volgende: straks ? { titel: info.titels[n], rol: straks.rol, wat: straks.wat } : null,
  };
}

// --- de terugblik (bijbel 02 §0b regel 4): de aanleiding in twee regels, voor wie hem niet zelf speelde ------------------------------------

const TERUGBLIK = {
  bus: [
    ['Annemarie', `${BEDRIJF}, de centrale. Dries Oltmans reed dertig jaar de laatste bus naar Winsum, met zijn eigen koffiekan.`],
    ['Annemarie', 'Zijn rug liet hem thuis. Nu rijden jullie: Tammo stuurt, Tessa doet het rooster. De kan blijft staan.'],
  ],
  taxi: [
    ['Annemarie', `${BEDRIJF}, de centrale. Dries Oltmans, onze oudste chauffeur, ligt met zijn rug op de bank.`],
    ['Annemarie', 'Jullie nemen zijn diensten over, ook die van de taxistandplaats. Tessa doet het rooster, Tammo stuurt.'],
  ],
  trein: [
    ['Jochem Luiken', `Jochem Luiken, stationschef. Dries Oltmans, chauffeur van de laatste bus, viel uit en ${BEDRIJF} zocht invallers.`],
    ['Jochem Luiken', 'Dus ook voor de trein: eerst conducteur, dan de cabine. Op tijd is op tijd.'],
  ],
};

// De terugblik als talk-regels (storytalk.js playTalk), of [] als het vak er geen heeft of de speler de aanleiding zelf speelde.
export function terugblikTalk(vak, { gezien = false } = {}) {
  if (gezien || !TERUGBLIK[vak]) return [];
  return TERUGBLIK[vak].map(([speaker, text]) => ({ speaker, text, voice: null, channel: 'stem', textOnly: true }));
}

// --- de rangmomenten --------------------------------------------------------------------------------------------------------------------

// Per vak per rang van 2 tot 6 een kort gesprek: [vak][rang] = [[spreker, tekst], ...]; 'Anita' is de spreeksleutel van Tessa (op het scherm Tessa).
// Elke regel hoogstens 25 woorden, drie tot vier regels. De bijfiguren zijn eerder ingeleid (D1 tot en met D3), Jelle in H5.
export const MOMENTEN = {
  bus: {
    2: [
      ['Annemarie', 'De Lijn van Dries is nu van jullie, zolang zijn rug het zegt. Jullie staan op het rooster van Noorderspoor.'],
      ['Tammo', 'Op het rooster. Met een pen.'],
      ['Mevrouw Wassink', 'Dries nam de bocht bij Winsum altijd langzaam. Dat doe jij ook. Prima.'],
    ],
    3: [
      ['Annemarie', 'De nachtbus naar Winsum zoekt een vaste chauffeur. Er zit niemand in, behalve de koffiekan.'],
      ['Anita', 'Ik doe de lijnomroep. In het donker klinkt alles belangrijker.'],
      ['Tammo', 'Ook de halte Veldweg?'],
      ['Anita', 'Vooral de halte Veldweg.'],
    ],
    4: [
      ['Annemarie', 'Zaterdag is de drukste van de zomer: markt en strand. Jullie draaien de dienst als dienstleider.'],
      ['Tammo', 'Dienstleider. Dat is iemand die zegt waar de bus staat.'],
      ['Annemarie', 'Dat is iemand die zegt waar de bus moet staan. Er ligt ook een brief van Jelle Terpstra voor Lijn 0, naar nergens.'],
    ],
    5: [
      ['Annemarie', 'Hoofd van de halte. Jullie krijgen een eigen halte in Winsum en een eigen dienst: de ochtendrit.'],
      ['Anita', 'Er lag een kaartje achter in de bus. "Voor als je wilt." Het is zijn handschrift.'],
      ['Dries', 'Dat was voor mijn eigen zaak. Maar de bus is van jullie, dus het kaartje ook.'],
    ],
    6: [
      ['Annemarie', 'De lijn bestaat veertig jaar. De hele halte komt, en Dries zit voorin met zijn koffiekan.'],
      ['Dries', 'Ik rijd niet. Ik zit. Dit is het mooiste wat ik ooit deed.'],
      ['Mevrouw Wassink', 'Dries, ik was net te laat.'],
      ['Dries', 'Nee, mevrouw. De bus was te vroeg.'],
    ],
  },
  taxi: {
    2: [
      ['Annemarie', 'De taxistandplaats bij het station kent jullie nu. De nachtrijder is ziek, dus jullie staan op de lijst.'],
      ['Anita', 'We staan op een lijst. Zo begint alles.'],
    ],
    3: [
      ['Annemarie', 'Nachtdienst, stationstaxi. De laatste trein komt om half een en iemand moet de reizigers thuisbrengen.'],
      ['Tammo', 'Ik breng iedereen thuis.'],
      ['Anita', 'En je bedankt ze niet allemaal. Het is nacht.'],
    ],
    4: [
      ['Annemarie', 'Zaterdag staat de hele stad op straat. Iedereen wil een taxi en niemand weet waarheen.'],
      ['Anita', 'Iedereen weet waarheen. Naar huis, via de kroeg.'],
    ],
    5: [
      ['Annemarie', 'Een eigen standplaats voor de taxi, naast de bushalte. Jullie bepalen de volgorde.'],
      ['Tammo', 'Dan ga ik eerst. Vanwege de leeftijd.'],
      ['Anita', 'We zijn even oud.'],
    ],
    6: [
      ['Annemarie', 'De standplaats bestaat veertig jaar. Alle chauffeurs komen. Jullie krijgen de kroon.'],
      ['Tammo', 'Een kroon?'],
      ['Annemarie', 'Een pet met een stempel. Wel een mooie.'],
    ],
  },
  trein: {
    2: [
      ['Jochem Luiken', 'Jullie kennen het perron nu. Dat is meer dan de meeste reizigers kunnen zeggen.'],
      ['Tammo', 'Ik ken ook het bankje.'],
      ['Jochem Luiken', 'Dat bankje is van mij.'],
    ],
    3: [
      ['Jochem Luiken', 'De conducteurstang is van jullie. Hij knipt een gaatje, en nog nooit heeft iemand teruggeknipt.'],
      ['Anita', 'Tammo, ik heb de tang. Jij hebt het kaartje.'],
    ],
    4: [
      ['Jochem Luiken', 'Zaterdag rijdt de extra trein naar het strand. Er zijn meer reizigers dan zitplaatsen.'],
      ['Anita', 'Dan staan ze.'],
      ['Jochem Luiken', 'Dan staan ze, en ik fluit.'],
    ],
    5: [
      ['Jochem Luiken', 'Machinist. Je rijdt een eigen dienst, van Station Groningen tot de kust.'],
      ['Tammo', 'Ik rijd een trein.'],
      ['Jochem Luiken', 'Je rijdt de dienstregeling. De trein doet mee.'],
    ],
    6: [
      ['Jochem Luiken', 'Veertig jaar dienstregeling. Op perron 1 staat een taart in de vorm van een locomotief.'],
      ['Anita', 'Is dat een eierbal?'],
      ['Jochem Luiken', 'Het is een taart. Blijf van mijn perron af.'],
    ],
  },
};

// De registratie staat op het hoogste niveau van de module, zoals docs/RANKMOMENTS.md vraagt: loopbaanlive.js importeert dit bestand, dus het
// register is gevuld zodra het spel draait. Het id is de sleutel van "gezien" en wordt nooit meer hernoemd.
export const momentId = (vak, rang) => `vervoer-${vak}-rang${rang}`;
for (const vak of VERVOER_VAKKEN) {
  for (const [rang, regels] of Object.entries(MOMENTEN[vak])) {
    registerRankMoment({ id: momentId(vak, +rang), vak, rang: +rang, scene: { soort: 'talk', regels } });
  }
}

// --- de Lijn van Dries -----------------------------------------------------------------------------------------------------------------

const afstand = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const NABIJ_M = 800;     // de lijn komt hoogstens zover van Winsum
// Kortste afstand van een punt tot de polylijn van een buslijn (de punten staan in wereldmeters).
function afstandTot(line, p) {
  let best = Infinity;
  const pts = line.pts || [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    best = Math.min(best, afstand(p, [a[0] + t * dx, a[1] + t * dy]));
  }
  return best;
}

// De lijn die het dichtst langs Winsum rijdt (binnen 800 m; bij gelijk spel de langste), of null. `winsum` is wereldmeters [x, y]; zonder hem
// rekent de functie WINSUM om via de projectie van het spel.
export function lijnVanDries(lines, winsum = null) {
  if (!Array.isArray(lines) || !lines.length) return null;
  const p = winsum || wgsToWorld(WINSUM[0], WINSUM[1]);
  if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
  let best = null;
  for (const l of lines) {
    if (!l || !Array.isArray(l.pts) || l.pts.length < 2) continue;
    const d = afstandTot(l, p);
    if (d > NABIJ_M) continue;
    if (!best || d < best.d - 50 || (Math.abs(d - best.d) <= 50 && (l.length || 0) > (best.l.length || 0))) best = { l, d };
  }
  return best ? best.l : null;
}

// Geef die lijn zijn naam, één keer en op de gegevens zelf (de bus-AI, het bord en het haltescherm lezen line.name). Geeft de lijst terug.
export function markeerLijnVanDries(lines, winsum = null) {
  const l = lijnVanDries(lines, winsum);
  if (l) { l.name = LIJN_VAN_DRIES; l.vast = true; }
  return lines;
}
