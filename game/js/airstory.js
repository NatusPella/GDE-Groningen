// Lucht (#1377, bijbel 28-11 deel 2 hoofdstuk 5 en deel 1 H9): heli, vliegtuig en nu ook de ballon als eigen verhaalstuk. De aanleiding bestond al in
// stukken (M12 met Dijkstra, M15 met Roelfien); de ballon kreeg zijn ingang in L1 en L2 (storyarc_nieuw.js, scènes in docs/verhaal/nieuw/09-script-akte3.md):
// Gerlof Hamminga leert de speler meevaren op de weide bij Eelde, en boven de Dollard zwaait Jelle vanuit zijn eigen mand. Dit bestand is wat
// erachter blijft voor de eindeloze modus:
//   - de kernlus en wat elke rang betekent (de Dienstkaart in het Loopbanen-scherm, loopbaanui.js),
//   - een verhaalmoment bij elke rang van Lucht (de rang-haak, docs/RANKMOMENTS.md),
//   - de terugblik voor wie de ballonvaarder niet zelf ontmoette (een gast, of wie de loopbaan via het scherm opent; bijbel 02 §0b regel 4).
// Puur: geen DOM, geen wereld, geen THREE, geen opslag. Geld en punten zijn die van de loopbaan zelf (loopbaan.js, per speler).
//
// Samen spelen: lokaal per speler. Het rangmoment en de terugblik spelen op het apparaat van wie omhoog gaat of de loopbaan begint (een gast die
// via een beloning van de gastheer stijgt, ziet zijn eigen moment); elke speler houdt zijn eigen loon en punten, nooit gedeeld of dubbel. In de
// ballon zit een gast als passagier (vehicle_balloon.js, docs/COOP-GAST.md): de brander bedient wie het spel opende.
import { registerRankMoment } from './rankmoments.js';
import * as L from './loopbaan.js';

export const LUCHT_VAK = 'lucht';
export const BALLONBEDRIJF = 'Ballonvaart Zuchtwind';
// De verhaalvlag die stap L1 zet (storyarc_nieuw.js unlocks): wie hem heeft, ontmoette Gerlof zelf en krijgt geen terugblik.
export const BALLON_VLAG = 'ballon';

// --- de kernlus en de rangen ------------------------------------------------------------------------------------------------------------

export const KERNLUS = [
  'Kies je toestel: de helikopter voor spoedwerk en rooster, het vliegtuig voor de velden, de ballon voor de rust.',
  'Een helikopter en een vliegtuig stuur je. Een ballon niet: de brander kiest de hoogte, de wind kiest de richting.',
  'Land zacht en op een plek waar het mag: een helikopter op een dek of pad, een ballon op open weiland.',
  'Een nette vlucht geeft loon en punten. Een harde landing of een volle tank die niets heeft gedaan geeft niets.',
  'Met genoeg punten stijg je in rang, en elke rang geeft meer loon en een nieuw toestel of een nieuwe plek.',
];

// Wat de rang betekent (de titels komen uit loopbaan.js): de trap loopt van meekijken naar het luchtruim delen.
export const ROLLEN = [
  { niveau: 1, rol: 'Meekijker', wat: 'Je kijkt mee vanaf de grond: een eerste vliegles bij Vliegschool De Windwijzer op Eelde en een eerste ritje in de ballon.' },
  { niveau: 2, rol: 'Hulp bij de heli', wat: 'Je vliegt mee met Dokter Dijkstra: spoedritten en de lier, zodat een ander kan hangen.' },
  { niveau: 3, rol: 'Leerling in de cockpit', wat: 'Je leert laag vliegen en precies landen, zoals bij Roelfien boven het graan.' },
  { niveau: 4, rol: 'Eigen toestel', wat: 'Je vliegt zelf, en je mag de ballon van Gerlof Hamminga lenen als je weet hoe de wind erover denkt.' },
  { niveau: 5, rol: 'Je kiest de route', wat: 'Je plant je eigen roosters en vluchten, van de Waddenkust naar de Dollard.' },
  { niveau: 6, rol: 'Baas van het luchtruim', wat: 'Het luchtruim boven Groningen is van jullie, met een heli, een vliegtuig en een ballon die niets stuurt.' },
];

// De Dienstkaart voor het Loopbanen-scherm: de kernlus, de rol van dit niveau en wat de volgende rang aan rol geeft. null voor een ander vak.
export function luchtGids(vak, niveau) {
  if (vak !== LUCHT_VAK) return null;
  const info = L.vakInfo(vak);
  if (!info) return null;
  const n = Math.max(1, Math.min(L.MAX_NIVEAU, Math.floor(niveau) || 1));
  const nu = ROLLEN[n - 1];
  const straks = n < L.MAX_NIVEAU ? ROLLEN[n] : null;
  return {
    titel: 'Zo werkt de lucht',
    stappen: KERNLUS.slice(),
    nu: { titel: info.titels[n - 1], rol: nu.rol, wat: nu.wat },
    volgende: straks ? { titel: info.titels[n], rol: straks.rol, wat: straks.wat } : null,
  };
}

// --- de terugblik: de ballonvaarder in twee regels, voor wie hem niet zelf ontmoette ---------------------------------------------------

const TERUGBLIK = [
  ['Gerlof Hamminga', `Gerlof Hamminga, ballonvaarder van ${BALLONBEDRIJF} bij het vliegveld van Eelde. Een ballon stuur je niet: de wind doet dat.`],
  ['Gerlof Hamminga', 'Jij kiest alleen hoe hoog. Branden is stijgen, de klep open is dalen. Zacht landen, dan is de grond ook tevreden.'],
];

// De terugblik als talk-regels (storytalk.js playTalk), of [] als het vak er geen heeft of de speler Gerlof zelf ontmoette (stap L1).
export function luchtTerugblikTalk(vak, { gezien = false } = {}) {
  if (gezien || vak !== LUCHT_VAK) return [];
  return TERUGBLIK.map(([speaker, text]) => ({ speaker, text, voice: null, channel: 'stem', textOnly: true }));
}

// --- de rangmomenten --------------------------------------------------------------------------------------------------------------------

// [rang] = [[spreker, tekst], ...]; 'Anita' is de spreeksleutel van Tessa (op het scherm Tessa). Elke regel hoogstens 25 woorden, twee tot vier regels.
// Elk personage stelt zich in zijn eerste regel zelf voor: de speler kan de rang halen zonder M12, M15 of L1 gespeeld te hebben (een gast, een oude save).
export const MOMENTEN = {
  2: [
    ['Dokter Dijkstra', 'Dijkstra, traumaarts van het UMCG. Ik hoorde dat je kunt vliegen. Voortaan vlieg je mee als hulp bij de heli.'],
    ['Tammo', 'Mag ik de lier?'],
    ['Dokter Dijkstra', 'Nee. Wel het broodje voor mijn nachtdienst.'],
  ],
  3: [
    ['Roelfien', 'Roelfien, graanboerin bij Midwolda. Dijkstra zegt dat je laag vliegt. Dan leer je nu hoe je een graanveld leest.'],
    ['Anita', 'Leest een graanveld dan terug?'],
    ['Roelfien', 'Alleen als je te laag zit. Dan zit er een halm in je wiel.'],
  ],
  4: [
    ['Gerlof Hamminga', 'Gerlof Hamminga, de ballonvaarder van Eelde. Een piloot weet wie de baas is. Dat is niet de piloot.'],
    ['Tammo', 'De wind?'],
    ['Gerlof Hamminga', 'De wind. Je mag mijn ballon lenen, als je hem zacht terugbrengt.'],
  ],
  5: [
    ['Dokter Dijkstra', 'Gezagvoerder. Vanaf nu kies je zelf de route en heb ik een vrije nachtdienst.'],
    ['Roelfien', 'En laag over mijn graan, op gezag van de gezagvoerder.'],
    ['Anita', 'We plannen het in het rooster.'],
    ['Dokter Dijkstra', 'Het rooster. Eindelijk.'],
  ],
  6: [
    ['Gerlof Hamminga', 'Luchtbaas van het Noorden. De heli, het vliegtuig en een ballon zonder stuur. Dat is een mooie dag.'],
    ['Dokter Dijkstra', 'Het stond niet in het rooster, maar het is gelukt.'],
    ['Roelfien', 'Mijn graan heeft er geen last van gehad.'],
    ['Tammo', 'Dan nu het moeilijkste: zacht landen.'],
  ],
};

// De registratie staat op het hoogste niveau van de module, zoals docs/RANKMOMENTS.md vraagt: loopbaanlive.js importeert dit bestand, dus het
// register is gevuld zodra het spel draait. Het id is de sleutel van "gezien" en wordt nooit meer hernoemd.
export const momentId = (rang) => `lucht-rang${rang}`;
for (const [rang, regels] of Object.entries(MOMENTEN)) {
  registerRankMoment({ id: momentId(+rang), vak: LUCHT_VAK, rang: +rang, scene: { soort: 'talk', regels } });
}
