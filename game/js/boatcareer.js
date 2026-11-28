// Water (#1376, bijbel 28-11 deel 2 hoofdstuk 4): de loopbaan van de rondvaart en de binnenvaart bij Noorderspoor Water. Twee sporen van één loopbaan:
//   - het stadsspoor (rang 1 tot en met 3, Dekhulp tot Schipper): de rondvaartboot van Wiebe Hazenberg op de Diepenring; Tammo vaart, Tessa vertelt,
//     Noor helpt;
//   - het provinciespoor (rang 4 tot en met 6, Kapitein tot Zeebaas van de Waddenzee): De Drie Zusters van Lammert Veenstra door de provincie, met vracht,
//     sluizen en havens (Tjalling in Zoutkamp, Dina bij de sluis, de loods bij Lauwersoog), later zeeschepen.
// De aanleiding "een schipper valt weg" staat in de verhaalstappen Z1 tot en met Z3 (storyarc_nieuw.js, scènes in docs/verhaal/nieuw/09-script-akte2.md); dit
// bestand is wat erachter blijft voor de eindeloze modus:
//   - de kernlus en wat elke rang betekent, per spoor (de Vaarkaart in het Loopbanen-scherm, loopbaanui.js),
//   - een verhaalmoment bij elke rang van 2 tot en met 6 (de rang-haak, docs/RANKMOMENTS.md),
//   - de terugblik voor wie de aanleiding niet speelde (een gast, of wie de loopbaan via het scherm opent; bijbel 02 §0b regel 4).
// Puur: geen DOM, geen wereld, geen THREE, geen opslag. Geld en punten zijn die van de loopbaan zelf (loopbaan.js, per speler); de contracten met lading en
// tarief staan in vaarvracht.js, de baan zelf in sidejob_binnenvaart.js.
//
// Samen spelen: het rangmoment en de terugblik zijn lokaal per speler (een gast die via een beloning van de gastheer stijgt, ziet zijn eigen moment op zijn
// eigen apparaat; niets gaat over het netwerk); elke speler houdt zijn eigen loon en punten, nooit gedeeld of dubbel. De boot, het schip en de lading zien
// alle spelers; een gast vaart mee als bemanning (BIJBAAN_REGELS.binnenvaart in coopbijbaan.js: dekhulp aan de kade, gids onder het varen) of heeft zijn eigen
// baan, en valt de stuurman weg van het roer dan ligt het schip voor anker.
import { registerRankMoment } from './rankmoments.js';
import * as L from './loopbaan.js';
import { storyFlag } from './storyquery.js';
import { REDERIJ } from './binnenvaartrules.js';

export const WATER_VAK = 'water';
// De verhaalvlaggen die Z1 en Z2 zetten (storyarc_nieuw.js unlocks): wie ze heeft, speelde de aanleiding zelf en krijgt geen terugblik.
export const WATER_VLAG = 'water';
export const BINNENVAART_VLAG = 'binnenvaart';
export const STADSSPOOR_TOT = 3;   // rang 1 tot en met 3 is het stadsspoor, daarna het provinciespoor

export const spoorVan = (niveau) => ((Math.floor(niveau) || 1) <= STADSSPOOR_TOT ? 'stad' : 'provincie');

// --- de kernlus en de rangen ------------------------------------------------------------------------------------------------------------------

export const KERNLUS = {
  stad: [
    'Stap aan de Diepenring aan boord van de rondvaartboot en vaar de steigers langs.',
    'Vaar rustig langs elke bezienswaardigheid: dan hoort iedereen het verhaal.',
    'Tevreden gasten geven fooi; elke tocht geeft loon en punten.',
    'Met genoeg punten stijg je in rang; vanaf Kapitein vaar je de binnenvaart.',
  ],
  provincie: [
    `Ga aan de kade bij het Rustpunt aan boord van De Drie Zusters van ${REDERIJ}.`,
    'Kies een contract: lading, kade van en naar, tarief per km. Laad aan de kade en vaar rustig, want bij de kade geldt een lage limiet.',
    'Leg aan en los. Het loon is het tarief min brandstof en kadegeld; een schone overtocht geeft fooi.',
    'Met genoeg punten stijg je in rang, tot je zeeschepen loodst bij Lauwersoog en de Eemshaven.',
  ],
};

// Wat de rang betekent voor een speler (de titels komen uit loopbaan.js).
export const ROLLEN = [
  { niveau: 1, spoor: 'stad', rol: 'Dekhulp', wat: 'Je helpt Wiebe Hazenberg: de eerste rondvaart over de Diepenring, met Noor aan boord.' },
  { niveau: 2, spoor: 'stad', rol: 'Roeier', wat: 'Je vaart de rondvaarten zelf; Tessa vertelt de stad en Noor schenkt de stroopwafels.' },
  { niveau: 3, spoor: 'stad', rol: 'Schipper', wat: 'De boot van Wiebe is jouw boot, met ontspannen tochten en eigen routes.' },
  { niveau: 4, spoor: 'provincie', rol: 'Kapitein', wat: `Je vaart De Drie Zusters voor ${REDERIJ}: vracht van kade naar kade, met contract.` },
  { niveau: 5, spoor: 'provincie', rol: 'Havenmeester', wat: 'Je kent de havens en sluizen van het Noorden: Zoutkamp met Tjalling, de sluis met Dina, de lange overtochten.' },
  { niveau: 6, spoor: 'provincie', rol: 'Zeebaas', wat: 'Je loodst zeeschepen bij Lauwersoog en de Eemshaven; de loods op de marifoon kent je stem.' },
];

// De Vaarkaart voor het Loopbanen-scherm: het spoor van dit niveau met zijn kernlus, de rol nu en de rol van de volgende rang. null voor een ander vak.
export function waterGids(vak, niveau) {
  if (vak !== WATER_VAK) return null;
  const info = L.vakInfo(vak);
  if (!info) return null;
  const n = Math.max(1, Math.min(L.MAX_NIVEAU, Math.floor(niveau) || 1));
  const nu = ROLLEN[n - 1];
  const straks = n < L.MAX_NIVEAU ? ROLLEN[n] : null;
  return {
    titel: nu.spoor === 'stad' ? 'Zo werkt de rondvaart in de stad' : `Zo werkt de binnenvaart bij ${REDERIJ}`,
    spoor: nu.spoor,
    stappen: KERNLUS[nu.spoor].slice(),
    nu: { titel: info.titels[n - 1], rol: nu.rol, wat: nu.wat },
    volgende: straks ? { titel: info.titels[n], rol: straks.rol, wat: straks.wat } : null,
  };
}

// --- de terugblik (bijbel 02 §0b regel 4): de aanleiding in twee regels, voor wie hem niet zelf speelde ----------------------------------------------

const TERUGBLIK_STAD = [
  ['Noor', 'Noor, de gids-student. Wiebe Hazenberg, de schipper van de rondvaartboot, struikelde over zijn eigen megafoon en ligt drie weken thuis.'],
  ['Noor', 'Nu vaart Tammo en vertelt Tessa. De pet blijft aan de haak in het stuurhuis, en wie de boot vaart laat hem hangen.'],
];
const TERUGBLIK_PROVINCIE = [
  ['Schipper Lammert', `Lammert Veenstra, schipper van De Drie Zusters. Wiebe viel uit en ${REDERIJ} zocht schippers voor het kanaal.`],
  ['Schipper Lammert', 'Dus vaar jij haar, een week zei ik, en de lading ligt klaar aan de kade bij het Rustpunt.'],
];
const talk = (regels) => regels.map(([speaker, text]) => ({ speaker, text, voice: null, channel: 'stem', textOnly: true }));

// De terugblik als talk-regels (storytalk.js playTalk), of [] als het vak er geen heeft of de speler de aanleiding zelf speelde (`gezien`: de vlag water).
export function terugblikTalk(vak, { gezien = false } = {}) {
  if (gezien || vak !== WATER_VAK) return [];
  return talk(TERUGBLIK_STAD);
}
// De terugblik van het provinciespoor (Lammert), voor wie Z2 niet speelde: staat voor het rangmoment van rang 4.
export const provincieTerugblik = () => TERUGBLIK_PROVINCIE.map(([speaker, text]) => [speaker, text]);

// --- de rangmomenten --------------------------------------------------------------------------------------------------------------------------

// Per rang van 2 tot en met 6 een kort gesprek: MOMENTEN[rang] = [[spreker, tekst], ...]; 'Anita' is de spreeksleutel van Tessa (op het scherm Tessa).
// Elke regel hoogstens 25 woorden, drie tot vijf regels. De bijfiguren zijn eerder ingeleid (Z1 tot en met Z3); Tjalling stelt zich in rang 5 zelf voor.
export const MOMENTEN = {
  2: [
    ['Noor', 'Wiebe belde vanaf de bank. Hij hoorde van de steiger dat jullie de bocht bij de Herebrug niet meer raken.'],
    ['Tammo', 'Wij raken alles niet meer. Dat is vooruitgang.'],
    ['Noor', 'Hij zegt: roeien is varen met meer armen. Het staat op een tegeltje.'],
  ],
  3: [
    ['Wiebe', 'Schipper. Ik zeg het één keer, zonder megafoon: jullie hielden de boot warm.'],
    ['Anita', 'Dank je, Wiebe.'],
    ['Wiebe', 'Hier, de megafoon. Niet gebruiken om te schelden.'],
    ['Tammo', 'Wij schelden niet. Wij zeggen moi met volume.'],
  ],
  4: [
    ['Schipper Lammert', 'Kapitein. Ik zei een week, het is een maand. De Drie Zusters houdt van jullie, en zij houdt van niemand.'],
    ['Tammo', 'Zij is een schip.'],
    ['Schipper Lammert', 'Dan hoef je nergens bang voor te zijn. Eén aan het roer, één op het dek, en geef de stuurboordkant aan de ander.'],
    ['Anita', 'Dat is vertrouwen.'],
    ['Schipper Lammert', 'Dat staat nergens op een tegeltje. Jammer.'],
  ],
  5: [
    ['Tjalling', 'Tjalling, havenmeester van Zoutkamp. Lammert zei: neem ze serieus. Ik neem alles serieus, behalve de wind.'],
    ['Tammo', 'Moi, Tjalling.'],
    ['Tjalling', 'Er hangt een brief van Jelle Terpstra: een standplaats op het water is geen standplaats, artikel twaalf, lid vier.'],
    ['Anita', 'Dat is Jelle.'],
    ['Tjalling', 'Dat is Jelle. Ik heb hem onder de koffie gelegd.'],
  ],
  6: [
    ['De loods', 'Loods Lauwersoog aan alle schepen: de zeebaas van de Waddenzee vaart door. Maak ruimte.'],
    ['Dina', 'Sluis open. Ik wacht altijd, nu even uit respect.'],
    ['Wiebe', 'Ik sta aan de wal en ik schreeuw niet. Dit is een uitzondering.'],
    ['Tammo', 'Dat was bijna een gedicht.'],
    ['Wiebe', 'Zeg dat tegen niemand.'],
  ],
};

// De registratie staat op het hoogste niveau van de module, zoals docs/RANKMOMENTS.md vraagt: loopbaanlive.js importeert dit bestand, dus het register is
// gevuld zodra het spel draait. Het id is de sleutel van "gezien" en wordt nooit meer hernoemd.
export const momentId = (rang, variant = '') => `water-rang${rang}${variant}`;
const heeftBinnenvaartVlag = () => !!storyFlag(BINNENVAART_VLAG);
for (const [rang, regels] of Object.entries(MOMENTEN)) {
  const r = +rang;
  if (r !== 4) { registerRankMoment({ id: momentId(r), vak: WATER_VAK, rang: r, scene: { soort: 'talk', regels } }); continue; }
  // rang 4 heeft twee vormen: wie Z2 speelde kent Lammert al; wie hem niet speelde (een gast, of wie via het scherm begon) hoort eerst wie hij is
  registerRankMoment({ id: momentId(4), vak: WATER_VAK, rang: 4, voorwaarde: heeftBinnenvaartVlag, scene: { soort: 'talk', regels } });
  registerRankMoment({ id: momentId(4, '-terugblik'), vak: WATER_VAK, rang: 4, voorwaarde: () => !heeftBinnenvaartVlag(), scene: { soort: 'talk', regels: [...provincieTerugblik(), ...regels] } });
}
