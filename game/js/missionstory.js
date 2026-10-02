import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildPersonMesh, animatePersonWalk, seatPose, seatedY, standBehindPose, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { HABBO_PALETTE } from './pixelart3d.js';
import { playCinematic, roofAt, showBanner } from './cinematics.js';
import { isInWater, WATER_Y } from './util.js';
import { spawnFxPuff, spawnFxSpark } from './fx3d.js';
import { makeBirds, updateBirds } from './intromontage.js';
import { playStoryVoice, stopStoryVoice, setStoryScene, playClueSting } from './audio.js';
import { buildVehicleMesh, updateVehicleWheelSpin } from './models3d_vehicles.js';
import { JELLE_LOOK, DURK_LOOK, DOUWE_LOOK, RIKUS_LOOK, MEM_LOOK, ROTOR_LOOK, ROELF_LOOK, HILJE_LOOK } from './storycast.js';
import { showLiveFrame } from './storycontact.js';
import { storyLineVoice } from './linevoice.js';
import { showNameCard } from './namecard.js';

// Story cutscenes around the mission chain: who asks and why (start), the
// payoff (success) and a short sting (fail). Tammo and Anita's relationship
// moves one step per mission; `stage` is how far the player has got.

let sceneMod = null;
import('./scene3d.js').then((m) => { sceneMod = m; }).catch(() => {});
let fjMod = null;
import('./fierljep.js').then((m) => { fjMod = m; }).catch(() => {});

// Recorded dialogue, keyed "<speaker>|<text>" so an edited line simply goes
// silent instead of playing the wrong recording.
const VOICE_DIR = new URL('../audio/voicelines/story/', import.meta.url).href;
let voices = {};
fetch(VOICE_DIR + 'manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { voices = m || {}; }).catch(() => {});
const voiceFor = (speaker, text) => voices[speaker + '|' + text] || storyLineVoice(speaker, text);

const SKIN = HABBO_PALETTE;
export const NPC = {
  berend: { name: 'Berend Bos', shirt: 0x4a5a3a, skin: SKIN.woodLight, variant: 'male', seed: 393 },
  torenwachter: { name: 'Torenwachter', shirt: 0x3a3a3a, skin: SKIN.woodLight, variant: 'male', seed: 1469 },
  terras: { name: 'Terrasgast', shirt: 0xd8d2c0, skin: SKIN.woodMid, variant: 'female', seed: 2817 },
  snackbar: { name: 'Snackbarhouder', shirt: 0xf2f0ea, skin: SKIN.woodLight, variant: 'male', seed: 3301 },
  toerist: { name: 'Toerist', shirt: 0xe07b1f, skin: SKIN.woodLight, variant: 'female', seed: 4120 },
  kind: { name: 'Kind', shirt: 0x2e7d4f, skin: SKIN.woodLight, variant: 'male', seed: 5170, look: { age: 'child' } },
  henk: { name: 'Henk', shirt: 0x5a5a62, skin: SKIN.woodMid, variant: 'male', seed: 2019 },
  jelmer: { name: 'Jelmer', shirt: 0xe2b93b, skin: SKIN.woodMid, variant: 'male', seed: 164 },
  sjoerd: { name: 'Sjoerd', shirt: 0x2e7d4f, skin: SKIN.woodLight, variant: 'male', seed: 1507 },
  femke: { name: 'Femke', shirt: 0x7a3f8f, skin: SKIN.woodLight, variant: 'female', seed: 198, hairStyle: 'curly' },
  harm: { name: 'Harm', shirt: 0xe07b1f, skin: SKIN.woodMid, variant: 'male', seed: 137 },
  geert: { name: 'Geert', shirt: 0xe8e3d6, skin: SKIN.woodLight, variant: 'male', seed: 1523 },
  trijntje: { name: 'Oma Trijntje', shirt: 0x5c6f8a, skin: SKIN.woodLight, variant: 'female', seed: 195, hairStyle: 'bun' },
  klaas: { name: 'Kapitein Klaas', shirt: 0x1f2f4a, skin: SKIN.woodDark, variant: 'male', seed: 1659 },
  sjabbe: { name: 'Sjabbe', shirt: 0x6b5a2e, skin: SKIN.woodMid, variant: 'male', seed: 811 },
  bert: { name: 'Duivenmelker Bert', shirt: 0x56709e, skin: SKIN.woodLight, variant: 'male', seed: 2203 },
  jelle: { ...JELLE_LOOK, name: 'Jelle Terpstra' },
  durk: { ...DURK_LOOK, name: 'Durk' },
  douwe: { ...DOUWE_LOOK, name: 'Douwe' },
  rikus: { ...RIKUS_LOOK, name: 'Rikus' },
  mem: { ...MEM_LOOK, name: 'Mem Terpstra' },
  hilly: { name: 'Hilly', shirt: 0xc2549a, skin: SKIN.woodLight, variant: 'female', seed: 4410, hairStyle: 'bob' },
  dijkstra: { name: 'Dokter Dijkstra', shirt: 0xe8641c, skin: SKIN.woodLight, variant: 'male', seed: 77 },
  rotor: { ...ROTOR_LOOK, name: 'Rotor Roelf' },
  roelf: { ...ROELF_LOOK, name: 'Boer Roelf' },
  hilje: { ...HILJE_LOOK, name: 'Hilje' },
};

// Display name for a story speaker key (T, A, V or an NPC key); missions.js
// uses it for its stage scenes, so voices are looked up under the right name.
export function storySpeakerName(key) {
  if (key === 'T') return 'Tammo';
  if (key === 'A') return 'Anita';
  if (key === 'V') return 'Rikus';
  return NPC[key] ? NPC[key].name : key;
}

// N = the mission's NPC, T = Tammo, A = Anita, V = the narrator (Rikus on Radio Nachtstreek,
// wide shots, his voice in the broadcast band), any other NPC key (e.g. 'durk') = that
// character speaking off camera or as an extra. `ask` is the intro line kept for the short
// version (a mission seen before); `replay` the outro when the mission is replayed as a klus
// (it makes sense without the story). Line options: clue, look, cam, card (a CHARACTERS key:
// its name card shows with the line), kiss (the kiss happens on this line).
// Entry options: introNpc: false (the intro has no NPC), outroNpcKey (another NPC for the
// outro), introCast/outroCast/introProps/outroProps, kiss (the outro is staged as a couple).
const STORY = [
  {
    // 0: H1 Berend telt de krassen (the first scene after the opening: the camera comes down onto the square)
    npc: 'berend', outroPose: 'hips', ask: 2, introOpen: 'descend',
    intro: [
      ['N', 'Goidag.', { cam: 'track', card: 'berend' }],
      ['A', 'Goidag, Berend.'],
      ['N', 'Ik heb gisteren alle krassen geteld. Nul. Zo blijft het.'],
      ['T', 'Waarom noemt iedereen jou eigenlijk Bommen Berend?'],
      ['N', 'Veertig jaar speel ik hem, op het Ontzet. Elk jaar val ik de stad aan, en elk jaar verlies ik. Dat doet wat met een mens.'],
      ['A', 'Ik rij.', { cam: 'close' }],
      ['T', 'Jij rijdt als een fietser met een deadline.', { cam: 'two' }],
      ['A', 'En jij als een fietser zonder fiets. Sleutels, Berend.'],
    ],
    outroNpc: true,
    outro: [
      ['N', '…Goud.'],
      ['A', 'Dat is trede twee, Tammo.'],
      ['N', 'Overdrijf niet. Er was hier trouwens al een Fries die mijn bakkie wilde kopen. Contant, uit een klomp. Een blauw colbert, in augustus.', { clue: true }],
      ['T', 'Wat moet een Fries met jouw bakkie?'],
      ['N', 'Wat moet een Fries met ons? Ze kopen altijd wat. Hier, vijftig euro. …Moi.'],
      ['T', 'Hij zei moi.'],
      ['A', 'Tegen mij.'],
    ],
    replay: [['N', 'Weer nul krassen. Ik begin het je bijna te gunnen.']],
    fail: [['A', 'Dit vertellen we Berend dus niet.'], ['T', 'Hij schrijft er vast een brief over.']],
  },
  {
    // 1: H3 Iets met de Grote Markt (a summer stunt evening, nobody gets hurt)
    npc: 'jelmer', outroPose: 'cheer', ask: 4,
    intro: [
      ['N', 'Moi moi chat! Dik feest vandaag! Zomeravond op de Grote Markt!', { card: 'jelmer' }],
      ['T', 'Ik ben geen content. Ik ben Tammo.'],
      ['A', 'Spreek voor jezelf. Ik ben heel veel content.'],
      ['T', 'En die terrassen?'],
      ['N', 'Die zijn het publiek! Niemand raken, wel laten schrikken!'],
      ['torenwachter', 'Tammo. Torenwachter. Er staan mensen op de Grote Markt.', { card: 'torenwachter' }],
      ['T', 'Het is de Grote Markt.'],
      ['torenwachter', 'Ik meld alleen.'],
    ],
    outroNpc: true,
    outro: [
      ['terras', 'Kon minder!'],
      ['N', 'Tienduizend kijkers! En kijk: "JelleWâld" in de chat. "Groot Loug. Moai foar in wykein."', { clue: true }],
      ['A', 'Groot Loug. Zo noemen wíj onszelf. Dat mag hij niet.'],
      ['N', '"En dat famke yn it read: sa\'n leaf gesicht."'],
      ['T', 'Wie is die man.'],
      ['A', 'Is dat een vraag?'],
      ['T', 'Nee.'],
    ],
    replay: [['N', 'Chat, hij is er weer! De man zonder content! Niemand raken, hè!']],
    fail: [['A', 'Saai. Zelfs de duiven gaan weg.'], ['T', 'Die zijn gewoon naar de Vismarkt.']],
  },
  {
    // 2: H5 Wind tegen, beide kanten op
    npc: 'sjoerd', outroPose: 'cheer', ask: 0,
    intro: [
      ['N', 'Op de kruispunten is alles tegelijk groen. Niemand heeft voorrang. Maak oogcontact.', { card: 'sjoerd' }],
      ['A', 'Tammo heeft hier nog gestudeerd. Twee weken.'],
      ['T', 'Drie. De derde was ik ziek.'],
      ['A', 'Van het studeren?'],
      ['T', 'Van de mensa.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Record. Jullie komen op het bierviltje. Achterkant.'],
      ['A', 'Je neef werkt \'s nachts in het museum?'],
      ['N', 'Om twaalf uur gaan de camera\'s drie minuten uit voor een update. Al sinds 2019. Niemand weet waarom. Dat mag ik eigenlijk niet zeggen.', { clue: true }],
      ['T', 'Je zei het ook niet.'],
      ['N', 'Precies. Proost.'],
      ['A', 'Drie minuten.'],
      ['T', 'Ik heb in drie minuten nog nooit iets goeds gedaan.'],
      ['A', 'Dan wordt het tijd.'],
    ],
    replay: [['N', 'Wind tegen? Natuurlijk. Beide kanten op. Proost.']],
    fail: [['T', 'Eerstejaars. Die hebben nog energie.'], ['A', 'En ouders die de huur betalen.']],
  },
  {
    // 3: H7 Heel aankomen is ook een kunst
    npc: 'femke', outroPose: 'cheer', ask: 0,
    intro: [
      ['N', 'Breekbaar. Het is een stuk over wind.', { card: 'femke' }],
      ['T', 'In Grunn. Dat is geen kunst. Dat is het weerbericht.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Heel! Bijna heel. En bij de groothandel: twee reuzen met een klomp vol geld. Ze kochten al het frituurvet van Stad. "Us Mem Vet" stond op de tankwagen.', { clue: true }],
      ['A', 'Geen vet, geen eierballen op het Ontzet. Geen eierballen, geen Grunn in de Snackprijs.'],
      ['T', 'Hij hoeft niet te winnen. Wij moeten alleen niet kunnen meedoen.'],
      ['N', 'Blijven jullie kijken?'],
      ['T', 'Ik kan heel goed tegen wind. Alleen niet tegen kunst.'],
      ['A', 'Hij kan wel tegen kunst. Als ik naast hem zit.'],
      ['T', '…Zei je dat nou hardop?'],
      ['A', 'Nee. Dat was de wind.'],
    ],
    replay: [['N', 'Het decor moet weer gisteren al staan. Het is altijd gisteren bij Noorderzon.']],
    fail: [['A', 'Dan wordt het moderne dans.'], ['T', 'Zonder decor. Daar krijg je hier subsidie voor.']],
  },
  {
    // 4: H9 Ring Zuid, laatste fase
    npc: 'harm', outroPose: 'cheer', ask: 0,
    introCast: [{ key: 'jelle', pose: 'arms' }], introProps: ['limo'],
    intro: [
      ['N', 'Eén rondje om de stad, vol gas. Als de weg het houdt, mag ik eindelijk met pensioen.', { card: 'harm' }],
      ['jelle', 'Moai, Grinzer. Onze echte derby is tegen Cambuur. Jullie zijn een uitje. Wie wint, mag famke een eierbal geven.'],
      ['A', 'Famke koopt haar eigen eierbal.'],
      ['T', 'Dat neem ik je kwalijk.', { cam: 'close' }],
      ['A', 'Dat was een hele zin, Tammo.'],
      ['T', 'Ik voelde het.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Hij ligt er! Ik ga met pensioen! Eindelijk mag ik er zelf overheen!'],
      ['A', 'Je pakte mijn hand in de bocht.'],
      ['T', 'Voor de grip.'],
      ['A', 'We zaten in een auto, Tammo. Met stuur.'],
      ['T', 'Met veel bocht.'],
      ['jelle', 'Dit is net klear, Grinzer.'],
    ],
    replay: [['N', 'De laatste fase. Weer. Ik kom elke keer kijken.']],
    fail: [['T', 'De weg is klaar. Wij nog niet.'], ['A', 'Nog een rondje. Ik let op de pionnen.']],
  },
  {
    // 5: H11 Nog eentje dan
    npc: 'geert', outroPose: 'hips', ask: 0,
    outroCast: [{ key: 'durk', pose: 'sway', at: [3.0, 1.1] }, { key: 'douwe', pose: 'arms', at: [3.1, 2.1] }],
    intro: [
      ['N', 'Vier kroegen, één avond, alles te voet. En Anita: mijn nieuwe barman wil heel graag je nummer.', { card: 'geert' }],
      ['T', 'Die barman heeft het druk.'],
      ['A', 'O ja? Sinds wanneer bepaal jij dat?'],
      ['T', 'Sinds nu.'],
      ['A', 'Jaloers én verantwoordelijk. Wat heb je met Tammo gedaan?'],
    ],
    outroNpc: true,
    outro: [
      ['durk', 'De bal… leit op it skûtsje. Hik. En mem… mem wil hem niet eens.', { clue: true }],
      ['douwe', 'Durk. Dat was geheim. …Hè.'],
      ['A', 'Zijn moeder wil hem niet eens? Waarom doet hij het dan?'],
      ['T', 'Iedereen doet weleens iets voor iemand die er niet om vraagt.'],
      ['T', 'Die barman had een snor.'],
      ['A', 'Ik hou niet van snorren. Ik hou van petten.'],
      ['T', '…Goed om te weten.'],
      ['A', 'Dat was het moment, Tammo. Om iets te zeggen.'],
      ['T', 'Nog eentje dan?'],
      ['A', '…Ja. Nog eentje dan.'],
      ['A', '…moi.', { cam: 'two' }],
      ['T', '…moi.', { cam: 'two' }],
    ],
    replay: [['N', 'Vier kroegen? Nog eentje dan.']],
    fail: [['A', 'Drie kroegen is ook een tocht.'], ['T', 'Een tochtje. Morgen de rest.']],
  },
  {
    // 6: H12 Fatbikes tellen niet als fiets (Oude Ebbingestraat, Noorderhaven)
    npc: 'trijntje', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Loop jij daar heelhuids overheen, jong, dan vertel ik je iets over die bal.', { card: 'trijntje' }],
      ['T', 'Fatbikes tellen niet als fiets, oma.'],
      ['N', 'Daarom mag je ze ook ontwijken.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Eet je krentjebrij.'],
      ['T', 'Ik ben vierendertig, oma.'],
      ['N', 'Dan eet je hem al vierendertig jaar te weinig.'],
      ['N', '1953. Ik won met mijn eierbal. Die handjes om de bal op die foto zijn van mij. Tweede werd een Fries meisje: Gerda Terpstra.', { clue: true }],
      ['N', 'Haar eierbal was beter. Ik wist het, zij wist het. De jury wist het niet.'],
      ['A', 'Terpstra. Jelle Terpstra.'],
      ['N', 'Haar zoon, zeker. Ik heb het nooit gezegd. Zeventig jaar trots. Dat is lang voor iets wat in één zin past.'],
      ['N', 'Die bal is gien geld, jong. Die bal is Grunn. En jij: één zin, hè. Niet zeventig jaar.', { clue: true }],
      ['T', 'Ik zeg wel wat.'],
      ['N', 'Niet tegen haar.'],
    ],
    replay: [['N', 'Hest weer veur \'n ander? Dat was geen compliment, jong.']],
    fail: [['T', 'Au. Ik heb nu profiel op mijn rug.'], ['A', 'Kom, ik help je overeind. Weer.']],
  },
  {
    // 7: H13 Alles klopt, behalve de papieren (the kiss)
    npc: 'klaas', ask: 0,
    intro: [
      ['N', 'Jullie varen, ik kijk de andere kant op. Wie is niemand? Schipper Wiebe. Die zit tot vieren in de kroeg. Meestal.', { card: 'klaas' }],
      ['T', 'Links ziet u Grunn. Rechts ziet u ook Grunn. Onder u ziet u fietsen.'],
      ['toerist', 'Hoeveel?'],
      ['T', 'Meer dan mensen. Iedereen heeft er één, en één in het water.'],
    ],
    outroNpc: false,
    kiss: true,
    outro: [
      ['A', 'Daar. Het skûtsje. Twee reuzen met hun voeten in het water.', { clue: true }],
      ['T', 'Weet je nog, Berends bakkie? Toen kreeg ik de sleutels niet eens.'],
      ['A', 'Die krijg je nog steeds niet.'],
      ['T', 'Maar de rest wel?'],
      ['A', 'Moi.'],
      ['T', '…Moi.', { kiss: true, cam: 'kiss' }],
      ['A', 'Dat was voor de toeristen.'],
      ['T', 'Die zijn al uitgestapt.'],
      ['A', '…Ja.'],
    ],
    replay: [['T', 'Links Grunn. Rechts ook. Alles klopt. Behalve de papieren.']],
    fail: [['A', 'Gids zijn is moeilijker dan het lijkt.'], ['T', 'Links water. Rechts ook. Onder ons: fietsen.']],
  },
  {
    // 8: H2 Even pinnen (Durk & Douwe rip out the ATM with Anita's pass in it)
    npc: 'sjabbe', outroPose: 'hips', ask: 4, introNpc: false,
    introCast: [{ key: 'durk', pose: 'arms', at: [5.2, 1.6] }, { key: 'douwe', pose: 'arms', at: [5.4, -0.4] }], introProps: ['limo', { kind: 'atm', at: [3.2, 2.6] }],
    intro: [
      ['A', 'Hij heeft mijn pas. Hij heeft mijn pas en hij…'],
      ['durk', 'Douwe. Hij is los.', { card: 'durk' }],
      ['douwe', '…los.'],
      ['T', 'Moi. Wat is er gebeurd?'],
      ['A', 'Mijn pas zit in die automaat. En die automaat zit op die aanhanger. En die aanhanger is van niemand.'],
      ['T', 'Dus we pinnen even.'],
      ['A', '…Er komt een politieauto aan. Instappen.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Braid noar de zin.', { card: 'sjabbe' }],
      ['N', 'Vierhonderd, voor de onderdelen.'],
      ['A', 'Daar koop je nog geen halve frietwagen van.'],
      ['N', 'Jullie dromen klein. Die reuzen kwamen hier vorige week met een klomp vol geld. Ze kochten alles wat met frituren te maken heeft.'],
      ['N', 'En hun baas vroeg waar het museum alarmen heeft.', { clue: true }],
      ['A', 'Het museum. De Gouden Eierbal.'],
      ['N', 'Achttien karaat. Ik zeg niks. Ik zeg alleen: wie hem eerst heeft, heeft hem.'],
    ],
    replay: [['N', 'Weer een automaat? Dit wordt een gewoonte. Een goede.']],
    fail: [['A', 'Mijn pas pint nu voor de pliesie.'], ['T', 'Hopelijk rekenen ze niks.']],
  },
  {
    // 9: H4 Kieken van boven (the first mentor)
    npc: 'bert', outroPose: 'hips', ask: 0, before: 'limo',
    intro: [
      ['N', 'Niemand kijkt naar een duif. Behalve als hij op je jas poept.', { card: 'bert' }],
      ['T', 'Hoe stuur je een duif?'],
      ['N', 'Diep in de ogen kieken. Fluiten. Ogen dicht.'],
      ['N', 'Kiek. Een keudeldoemke. Hij luustert noar dij, jong.', { clue: true }],
      ['T', 'Duiven luisteren naar niemand.'],
      ['A', 'Mijn vriend de duivenkoning.'],
      ['T', '"Vriend."'],
      ['A', 'Wat?'],
      ['T', 'Ow.'],
    ],
    outroNpc: false,
    outro: [
      ['A', 'Drie camera\'s, twee bewakers, en een stroomkast achter de fietsenstalling.'],
      ['T', 'En een zwarte trekker bij de achteringang, met een limousine erachter. Vlaggetjes met rode blaadjes. Een man in een blauw colbert die de alarmen telt.', { clue: true }],
      ['A', 'Pompeblêden. Een Fries. Hij gaat het echt doen.'],
      ['T', 'Hoe weet jij wat pompeblêden zijn?'],
      ['A', 'Dat weet je gewoon.'],
      ['T', 'Dat weet niemand. Behalve Friezen.'],
    ],
    replay: [['N', 'Zo. De duivenkoning is weer aan het werk.']],
    fail: [['T', 'Hij wilde alleen maar brood.'], ['A', 'Jij stuurt, Tammo. Niet het brood.']],
  },
  {
    // 10: H6 Het museum stond er al zo (the threshold; the empty case is a stage scene in missions.js)
    npc: null, ask: 2,
    intro: [
      ['T', 'Weet je zeker dat dit gebouw nog niet gekraakt is? Het ziet er al zo uit.'],
      ['A', 'Dat is architectuur. Eerst dertig jaar mopperen, dan trots. Zo gaat dat hier.'],
      ['A', 'Om twaalf uur. Drie minuten. Hand.'],
      ['T', 'Wat?'],
      ['A', 'Geef me je hand. Het is donker daarbinnen.'],
      ['T', '…Voor de grip.', { cam: 'two' }],
      ['A', 'Voor de grip.'],
    ],
    outroNpc: false,
    outro: [
      ['T', 'Hij heeft hem gestolen om hem eerlijk te winnen.'],
      ['A', 'En de camera\'s van daarnet hebben óns gefilmd.'],
    ],
    replay: [['A', 'Drie minuten. Hand.'], ['T', 'Voor de grip.'], ['A', 'Natuurlijk.']],
    fail: [['A', 'Nou zien ze ons wél.'], ['T', 'Drie minuten is kort.']],
  },
  {
    // 11: H8 Al het vet van Grunn
    npc: 'snackbar', outroPose: 'cheer', ask: 0, introNpc: false,
    intro: [
      ['A', 'Banden stuk, tankwagen pakken, naar de Oosterpoort.'],
      ['T', 'En de Krolbrug?'],
      ['V', 'Storingsbericht: de Krolbrug is in storing.'],
      ['A', 'Zie je. Daar kun je op rekenen.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Vet! Valt mie nait of!'],
      ['A', 'Trede drie, Tammo.'],
      ['T', 'Dit is het eerste wat ik ooit heb gedaan waar mensen voor klapten.'],
    ],
    replay: [['N', 'Weer vet in de pannen. Valt mie nait of.']],
    fail: [['T', 'Weg is het vet.'], ['A', 'Dan gaan we het halen. Nog een keer.']],
  },
  {
    // 12: H10 Er hangt iets Fries aan d'Olle Grieze (FOAR MEM)
    npc: 'bert', outroPose: 'cheer', ask: 0,
    intro: [
      ['N', 'Die Fries noemde d\'Olle Grieze "in aardich tuorke". Een áárdig torentje!'],
      ['A', '"Foar mem." Voor zijn moeder.', { clue: true }],
      ['T', 'Hij hangt een vlag aan onze toren voor zijn moeder.'],
      ['A', 'Dat is eigenlijk best lief.'],
      ['T', 'Het is vandalisme.'],
      ['A', 'Lief vandalisme.'],
      ['N', 'Vijf touwen. Een duif met een scherpe snavel.'],
      ['T', 'Ik fluit. Hij pikt.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Kon minder, jong.'],
      ['A', 'Heel Grunn klapt voor een duif.'],
      ['T', 'Niet voor de duif. Voor mij. Ik floot.'],
      ['A', 'Ik klapte ook. Een beetje.'],
      ['torenwachter', 'Tammo. De vlag ligt op de Grote Markt.'],
      ['T', 'Weet ik.'],
      ['torenwachter', 'Ik meld alleen.'],
    ],
    replay: [['N', 'Weer iets aan de toren? Fluiten maar, jong.']],
    fail: [['T', 'Die meeuwen waren groter dan mijn duif.'], ['A', 'Alles is groter dan een duif, duivenkoning.']],
  },
  {
    // 13: H14 Geleend van de Friezen (a chocolate ball, "Foar mem")
    npc: null, ask: 0,
    intro: [
      ['T', 'Springen. Van een boot. Op een andere boot.'],
      ['A', 'Jij stuurt, ik zeg wanneer.'],
    ],
    outroNpc: false,
    outro: [
      ['T', 'Chocola. We hebben een boot gekaapt voor chocola.'],
      ['A', 'Een oefenbal. Hij oefent hoe hij hem aan zijn moeder geeft.', { clue: true }],
      ['T', 'Hij is romantischer dan ik.'],
      ['A', 'Iedereen is romantischer dan jij.'],
      ['klaas', 'Proeksel, jongens. Ik heb net twee reuzen uit de haven gevist. Ze zwommen synchroon.'],
    ],
    replay: [['A', 'Weer een skûtsje? Laat de chocola deze keer heel, Tammo.']],
    fail: [['T', 'Het skûtsje is weg. Met zeil en al.'], ['A', 'Een zeilboot ontsnapt aan een bootje met een bel. Niet vertellen in de kroeg.']],
  },
  {
    // 14: H15 Spoedeisende duif
    npc: 'dijkstra', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Zij vliegt. Hij hangt.', { card: 'dijkstra' }],
      ['T', 'Natuurlijk hang ík.'],
      ['A', 'Ik vraag het, Tammo. Wil je hangen?'],
      ['T', '…Ja. Dank je dat je het vraagt.'],
    ],
    outroNpc: true,
    outro: [
      ['T', 'Ik heb hem. De echte. Hij smelt niet.'],
      ['A', 'Je praatte de hele tijd, aan dat touw.'],
      ['T', 'Ik had hoogtevrees.'],
      ['A', 'Je zei "doe bist schier". Tegen de ballon.'],
      ['T', '…Hij was mooi.'],
      ['N', 'Die Fries is geland in een weiland bij Ten Boer. Tussen de koeien. Hij was niet blij. De koeien ook niet.'],
    ],
    replay: [['N', 'Weer een spoedeisende duif? Ik zet het deze keer in het rooster.']],
    fail: [['A', 'Die ballon is sneller dan hij eruitziet.'], ['T', 'Alles van Jelle is sneller dan het eruitziet.']],
  },
  {
    // 15: H16 Iedereen heeft een rode auto gezien (the low point: Tammo's Escapade is gone)
    npc: null, ask: 6,
    intro: [
      ['T', '"Tige tank foar de auto. – W." De Fjord Frituur. Zonder Fjord.', { clue: true }],
      ['T', 'Wie heb je verteld waar we wonen?'],
      ['A', 'Niemand.'],
      ['T', 'Je appt al weken met Friesland.'],
      ['A', '…Ga je dit nu doen? Nu?'],
      ['T', 'Ik vraag het alleen.'],
      ['A', 'Nee, je vraagt het niet. Je vraagt nooit iets. Jij zegt nooit iets, Tammo, en dan word je stil en boos op mij.', { cam: 'close' }],
      ['A', 'Ik haal jouw auto wel terug. Alleen.'],
    ],
    outroNpc: false,
    outro: [
      ['A', 'Hoe wist jij dat hij hier was?'],
      ['T', 'Ik luisterde naar Rikus. En ik ben de trein achterna gefietst. Wind tegen.'],
      ['A', 'Beide kanten op.'],
      ['A', '"Iemand uit Friesland" is Mem Terpstra. Ze wil dat haar zoon ophoudt.', { clue: true }],
      ['T', '…Een moeder. Ik was jaloers op een moeder.'],
      ['A', 'Een beetje, hè.'],
      ['T', 'Sorry. Dat ik nooit wat zeg.'],
      ['A', 'Je zei net iets.'],
      ['T', 'Het voelde raar.'],
      ['A', 'Het klonk goed.'],
    ],
    replay: [['jelmer', 'Chat, iedereen heeft weer een rode auto gezien!']],
    fail: [['A', 'Op de trein naar Ljouwert. Niet zonder mij. Nog een keer.'], ['A', 'Hij komt terug. Hij mist Grunn nu al.']],
  },
  {
    // 16: H17 Het bod viel tegen (the choice), then Oma's kitchen
    npc: 'jelle', outroPose: 'hips', ask: 4, outroNpcKey: 'trijntje',
    introCast: [{ key: 'durk', pose: 'arms' }, { key: 'douwe', pose: 'arms' }], introProps: ['limo'],
    intro: [
      ['N', 'Ik ben een redelijk man. Jullie hebben iets wat van mem is.'],
      ['T', 'Van Grunn.'],
      ['N', 'Details. Geef me de bal, en op het Ontzet bak ik gewoon tegen jullie. Eerlijk.'],
      ['T', 'Het is jouw droom. Jij kiest.'],
      ['A', '…Het bod viel tegen.', { cam: 'close' }],
      ['N', 'Tegen? Dit is meer dan…'],
      ['A', 'Je biedt geld voor iets wat geen geld is. En je moeder wil iets anders.'],
      ['N', 'Wat dan?'],
      ['A', 'Dat iemand één keer zegt dat ze de beste was. Dat kost niks. Daarom doe je het niet.', { clue: true }],
      ['N', '…We bakken op het Ontzet. Wie wint, krijgt de bal.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Mosterd, eieren, stoetbrood. Grove mosterd, niet dat zoete spul.'],
      ['T', 'Oma, hoe zei opa het eigenlijk?'],
      ['N', 'Niet. Hij zei: "Woist ja wel."'],
      ['T', 'En wist je het?'],
      ['N', 'Al jaren. Maar ik wilde het één keer hóren, jong. Eén keer is genoeg.', { clue: true }],
      ['N', 'En bel Gerda Terpstra voor me.'],
      ['A', 'Nu?'],
      ['N', 'Ik ben tweeënnegentig. Alles is nu.'],
    ],
    replay: [['N', 'Eieren heel? Dan komt het goud.']],
    fail: [['T', 'Omelet. Achterin. Overal.'], ['A', 'Dan halen we nieuwe. Die kippen leggen wel door.']],
  },
  {
    // 17: H18 Ontzet, net als in 1672 (the finale: the jury, then behind the stall the five words)
    npc: 'berend', ask: 3,
    introCast: [{ key: 'jelle', pose: 'self' }, { key: 'durk', pose: 'arms' }, { key: 'douwe', pose: 'arms' }],
    outroCast: [{ key: 'jelle' }, { key: 'mem', pose: 'point', at: [2.2, 2.3] }, { key: 'trijntje', pose: 'hips', at: [2.4, -2.2] }, { key: 'durk', pose: 'shrug', at: [4.2, 1.2] }, { key: 'douwe', pose: 'shrug', at: [4.3, -0.6] }, { key: 'rikus', pose: 'cheer', at: [4.4, -2.6] }],
    intro: [
      ['V', 'Moi, Grunn. Nachtstreek, in het daglicht. Ik voel me een vleermuis.'],
      ['N', 'Grunn! Geef je over!'],
      ['kind', 'Nee!'],
      ['N', 'Elk jaar hetzelfde. Ik word er niet jonger op. Ik zit ook in de jury. Ik proef, ik tel, ik oordeel.'],
      ['A', 'Tammo bakt. Ik hou de kraam heel.'],
      ['T', 'Ik bak nooit onder druk.'],
      ['A', 'Je doet alles onder druk. Daarom werkt het.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Goud. …Valt mie nait of.'],
      ['N', '…Braid noar de zin. …Kon minder.'],
      ['V', 'Berend zegt niks meer. Hij heeft een kloet in de strotte. Dat is de hoogste trede. Dat is nog nooit gebeurd.'],
      ['trijntje', 'Gerda. Jouw eierbal was beter. In 1953.'],
      ['mem', 'Trijntje. Dat duurde lang.'],
      ['trijntje', 'Ik ben Gronings. Wij zeggen het één keer. Dan is het waar.'],
      ['mem', 'Sjochst? Dat wie alles wat ik woe. Priuw, jonge.'],
      ['jelle', '…Valt mie nait of.'],
      ['T', 'Hij praat Gronings.'],
      ['A', 'Dan is het ernstig.'],
      ['jelle', 'Better as ús. Net fertelle.', { clue: true }],
      ['N', 'De Noordelijke Snackprijs gaat naar Grunn. De bal blijft in Stad. En op het bordje in het museum komt een tweede naam: Gerda Terpstra, 1953.'],
      ['N', 'Ik schrijf de gemeente er wel een brief over.'],
      ['V', 'We schakelen over naar de kraam. Er is een peiling die al weken openstaat.'],
      ['A', 'Tammo. Iedereen luistert.', { cam: 'two' }],
      ['T', '…Woist ja wel.', { cam: 'two' }],
      ['A', 'Dat telt. Maar ik wil het één keer horen.', { cam: 'two' }],
      ['T', 'Ik wil bij jou blijven.', { cam: 'close' }],
      ['A', 'Vijf woorden.', { cam: 'two' }],
      ['T', 'Ik had er meer. Die waren minder goed.', { cam: 'two' }],
      ['A', 'Mien jong. Dat duurde twaalf jaar.', { cam: 'two' }],
      ['T', 'Kon minder.', { cam: 'two' }],
      ['A', 'Kon veel minder.', { cam: 'two' }],
      ['V', 'Peiling gesloten.'],
    ],
    replay: [['N', 'Ik proef, ik tel, ik oordeel. …Kon minder.']],
    fail: [['A', 'Hij is weg met de bal. Plan B, Tammo.'], ['T', 'Plan A is ook van jou.']],
  },
];

// Tammo/Anita lines for when a mission is played before the ones leading up
// to it (via the phone), so no callback refers to something that hasn't happened.
const DUO_BY_STAGE = [
  { intro: [['A', 'Ik rij. Geen discussie.'], ['T', 'Er was ook geen discussie. Er was alleen jij.']], outro: [['T', 'Dat ging… verrassend goed.'], ['A', 'Verrassend voor jou.']] },
  { intro: [['T', 'Ik doe het wel. Maar daarna een eierbal.'], ['A', 'Dat zeg je elke keer.']], outro: [['A', 'Niet slecht, pet.'], ['T', 'De pet bedankt je.']] },
  { intro: [['A', 'Bijhouden, hè.'], ['T', 'Ik hou je al de hele week bij.']], outro: [['T', 'We worden hier best goed in.'], ['A', 'Ik was al goed. Jij haakte aan.']] },
  { intro: [['T', 'Laat mij maar praten.'], ['A', 'Dan staan we hier morgen nog.']], outro: [['A', 'Je was er echt, vandaag.'], ['T', 'Ik ben er altijd. Meestal zwijgend.']] },
  { intro: [['A', 'Voorzichtig doen, hè.'], ['T', 'Zegt degene met de rode jas en de haast.']], outro: [['T', 'Je had me door, daar.'], ['A', 'Ik heb je altijd door, droogkloot.']] },
  { intro: [['T', 'Blijf een beetje bij mij in de buurt.'], ['A', 'Moi. Dat klinkt bijna lief.']], outro: [['A', 'Zeg het maar gewoon, Tammo.'], ['T', 'Wat zeggen?'], ['A', 'Laat maar. Ik weet het al.']] },
  { intro: [['A', 'Samen, of helemaal niet.'], ['T', 'Samen.']], outro: [['T', 'Zonder jou lag ik allang in het Reitdiep.'], ['A', 'Weet ik. Daarom blijf ik.']] },
  { intro: [['T', 'Laatste klus?'], ['A', 'Voor vandaag.']], outro: [['A', 'Wij tweeën tegen Grunn?'], ['T', 'Wij tweeën tegen Grunn.']] },
];

// boats float at WATER_Y (scene3d.js); the deck is a little above that
const DECK_H = WATER_Y + 0.45;
const SKUTSJE_DECK = WATER_Y + 0.72;
const SWIM_H = WATER_Y - 1.25;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const P = (x, y, z) => ({ x, y, z });

function lineDur(text) {
  return Math.max(1.8, Math.min(3.8, 0.95 + text.length * 0.042));
}

// --- actors -------------------------------------------------------------------

const SHADOW_GEO = new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

function makeActor(app) {
  const m = buildPersonMesh(app.shirt, app.skin, app);
  m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sh = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT);
  sh.position.y = 0.03;
  m.add(sh);
  m.userData.blob = sh;
  return m;
}

function disposeActor(m) {
  m.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.geometry.dispose();
      if (o.skeleton) o.skeleton.dispose();
    }
  });
}

function resetLimbs(ud) {
  for (const k of ['armL', 'armR']) ud[k].rotation.set(0, 0, 0);
  ud.head.rotation.set(0, 0, 0);
  ud.chest.rotation.set(0, 0, 0);
}

function applyPose(m, pose, t, talking) {
  const ud = m.userData;
  const arm = (a, e, z, ez, x = 0) => { a.rotation.set(x, 0, z); if (e) e.rotation.z = ez; };
  if (pose === 'point') arm(ud.armR, ud.elbowR, 1.45, 0.1, -0.15);
  else if (pose === 'hips') { arm(ud.armL, ud.elbowL, 0.3, 1.5, 0.55); arm(ud.armR, ud.elbowR, 0.3, 1.5, -0.55); }
  else if (pose === 'phone') arm(ud.armR, ud.elbowR, 0.9, 1.9, -0.2);
  else if (pose === 'cheer') { const k = Math.sin(t * 7) * 0.2; arm(ud.armL, ud.elbowL, 2.6 + k, 0.3, -0.3); arm(ud.armR, ud.elbowR, 2.6 - k, 0.3, 0.3); }
  else if (pose === 'kissT') { ud.chest.rotation.z = -0.1; ud.head.rotation.z = -0.22; arm(ud.armL, ud.elbowL, 0.75, 1.25, -0.5); arm(ud.armR, ud.elbowR, 0.75, 1.25, 0.5); }
  else if (pose === 'kissA') { ud.chest.rotation.z = -0.04; ud.head.rotation.z = 0.12; arm(ud.armL, ud.elbowL, 2.05, 1.3, -0.45); arm(ud.armR, ud.elbowR, 2.05, 1.3, 0.45); }
  else if (pose === 'wave') arm(ud.armR, ud.elbowR, 2.75, 0.55 + Math.sin(t * 9) * 0.4, 0.25);
  else if (pose === 'self') { arm(ud.armR, ud.elbowR, 0.6, 2.05, 0.55); ud.chest.rotation.z = 0.05; ud.head.rotation.z = 0.12; }
  else if (pose === 'shrug') { arm(ud.armL, ud.elbowL, 0.45, 1.5, 0.75); arm(ud.armR, ud.elbowR, 0.45, 1.5, -0.75); ud.head.rotation.x = 0.12; }
  else if (pose === 'arms') { arm(ud.armL, ud.elbowL, 0.55, 1.95, -0.62); arm(ud.armR, ud.elbowR, 0.55, 1.95, 0.62); }
  else if (pose === 'sway') { ud.chest.rotation.x = Math.sin(t * 1.7) * 0.13; ud.head.rotation.x = Math.sin(t * 1.3 + 1) * 0.16; ud.head.rotation.z = -0.1; arm(ud.armR, ud.elbowR, 1.1, 1.5, -0.1); }
  else if (pose === 'hold') { arm(ud.armR, ud.elbowR, 1.35, 1.0, -0.05); ud.head.rotation.z = 0.06; }
  else if (pose === 'lookup') { ud.head.rotation.z = 0.5; ud.chest.rotation.z = 0.08; }
  else if (pose === 'look') ud.head.rotation.y = Math.sin(t * 1.1) * 0.7;
  if (talking && pose !== 'kissT' && pose !== 'kissA') {
    ud.head.rotation.z += Math.sin(t * 8.5) * 0.045;
    if (!pose) arm(ud.armR, ud.elbowR, 0.35 + Math.sin(t * 3.1) * 0.18, 0.9 + Math.sin(t * 2.3) * 0.25, -0.25);
  }
}

function standActor(m, x, y, a, h = 0) {
  const ud = m.userData;
  ud.faceA = a;
  m.visible = true;
  m.position.set(x, h, y);
  m.rotation.set(0, -a, 0);
  ud.blob.visible = true;
}

// --- set building ---------------------------------------------------------------

function blocked(w, x, y, z = 1.6) {
  return roofAt(w.map, x, y) > z - 0.5 || isInWater(w.map, x, y);
}

function carAt(w, x, y, r = 2.4) {
  return w.vehicles.some((v) => Math.hypot(v.x - x, v.y - y) < r + v.model.len * 0.3);
}

function sightBlocked(w, ax, ay, bx, by) {
  for (let k = 1; k < 5; k++) {
    const x = ax + (bx - ax) * k / 5, y = ay + (by - ay) * k / 5;
    if (carAt(w, x, y, 1.2) || roofAt(w.map, x, y) > 1) return true;
  }
  return false;
}

function freeSpot(w, x, y) {
  const [sx, sy] = w.map.escapeBuilding(x, y);
  return { x: sx, y: sy };
}

// Picks the facing that keeps the NPC and the close-up cameras out of walls
// and water, preferring to look towards the mission target.
function chooseFacing(w, ax, ay, prefer) {
  const offs = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, Math.PI];
  let best = null;
  for (const o of offs) {
    const a = prefer + o, fx = Math.cos(a), fy = Math.sin(a), nx = -fy, ny = fx;
    const pts = [
      [ax + fx * 2.1, ay + fy * 2.1], [ax - fx * 1.5 + nx * 1.9, ay - fy * 1.5 + ny * 1.9],
      [ax + fx * 3.9 - nx * 0.9, ay + fy * 3.9 - ny * 0.9], [ax - fx * 7 + nx * 4, ay - fy * 7 + ny * 4],
    ];
    let score = 0;
    pts.forEach(([x, y], i) => { if (blocked(w, x, y) || carAt(w, x, y)) score += i < 2 ? 3 : 1; });
    if (sightBlocked(w, pts[2][0], pts[2][1], ax, ay)) score += 2;
    if (sightBlocked(w, pts[1][0], pts[1][1], pts[0][0], pts[0][1])) score += 2;
    score += Math.abs(o) * 0.2;
    if (!best || score < best.score) best = { a, score };
  }
  return best.a;
}

function camClear(w, pos) {
  const top = roofAt(w.map, pos.x, pos.y);
  if (top && pos.z < top + 1.5) return P(pos.x, pos.y, top + 1.5);
  return pos;
}

function pose(pos, look, fov) {
  return { position: pos, lookAt: look, fov, cut: true };
}

// --- runtime --------------------------------------------------------------------

let run = null;

function speakerName(key, npc) {
  if (key === 'T') return 'Tammo';
  if (key === 'A') return 'Anita';
  if (key === 'V') return 'Rikus';
  if (key !== 'N' && NPC[key]) return NPC[key].name;
  return npc ? npc.name : '';
}

// Lines are [who, text, opts?] (a Frisian line's Dutch subtitle comes from
// subtitles.js, keyed by its text);// Frisian line (shown under it), opts.clue marks a story clue (camera
// push-in, a soft sting, a highlighted subtitle).
function timeline(lines, npc, lead = 0.5) {
  let t = lead;
  const out = lines.map(([who, text, o]) => {
    const speaker = speakerName(who, npc);
    const voice = voiceFor(speaker, text);
    const d = voice ? Math.max(lineDur(text), voice.dur + 0.25) : lineDur(text);
    const l = { who, speaker, text, at: t, dur: d, voice, clue: !!(o && o.clue), look: (o && o.look) || null, cam: (o && o.cam) || null, card: (o && o.card) || null, kiss: !!(o && o.kiss) };
    t += d + 0.1;
    return l;
  });
  return { lines: out, total: t + 0.3 };
}

// --- props: the trekker-limo and the (golden or chocolate) Eierbal ----------------

let limoN = 0;
function limoMesh() {
  const g = buildVehicleMesh({ id: 'cine-limo-' + (limoN++ % 4), model: { name: 'trekkerlimo', len: 5.6, wid: 2.0, color: '#141414' } });
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function limoFits(w, x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  for (const k of [-2.8, -1.4, 0, 1.4, 2.8]) for (const q of [-1, 1]) if (blocked(w, x + c * k - s * q, y + s * k + c * q, 2)) return false;
  return true;
}

const BALL_GEO = new THREE.SphereGeometry(0.12, 14, 10);
const BALL_GOLD = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.9, roughness: 0.28, emissive: 0x3a2804 });

function makeProp(r, p, anchor) {
  const w = r.w, f = r.f, n = r.n;
  const spec = typeof p === 'string' ? { kind: p } : p;
  if (spec.kind === 'limo') {
    const tries = spec.at ? [spec.at] : [[7, 0], [8.5, 2.5], [8.5, -2.5], [6, 4], [6, -4], [10, 0], [-6, 3]];
    for (const [fw, sd] of tries) {
      const x = anchor.x + f.x * fw + n.x * sd, y = anchor.y + f.y * fw + n.y * sd;
      const a = Math.atan2(f.y, f.x) + Math.PI / 2 + (spec.turn || 0.25);
      if (!spec.at && (!limoFits(w, x, y, a) || carAt(w, x, y, 2))) continue;
      const m = limoMesh();
      m.position.set(x, r.h, y);
      m.rotation.y = -a;
      return { kind: 'limo', mesh: m, x, y, a };
    }
    return null;
  }
  if (spec.kind === 'atm') {
    // H2: the cash machine Durk & Douwe pulled out of the wall, on its side on the trailer
    const [fw, sd] = spec.at || [3, 2];
    const x = anchor.x + f.x * fw + n.x * sd, y = anchor.y + f.y * fw + n.y * sd;
    const m = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.5, metalness: 0.4 }));
    body.position.y = 0.8;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.02), new THREE.MeshStandardMaterial({ color: 0x1e9e56, emissive: 0x0c4a28 }));
    screen.position.set(0, 1.15, 0.31);
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 1.4), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 }));
    trailer.position.y = 0.35;
    body.position.y += 0.47;
    screen.position.y += 0.47;
    m.add(trailer, body, screen);
    m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    m.position.set(x, r.h, y);
    m.rotation.y = -(Math.atan2(f.y, f.x) + 0.4);
    return { kind: 'atm', mesh: m, x, y, own: true };
  }
  if (spec.kind === 'point') {
    const o = { kind: spec.name, mesh: { visible: true }, virtual: true, pos: { x: anchor.x, y: anchor.y }, z: 1.3 };
    o.update = () => { const q = spec.at(); if (q) { o.pos = { x: q.x, y: q.y }; o.z = q.z; } };
    o.update();
    return o;
  }
  if (spec.kind === 'fatbike') {
    const at = (q) => ({ x: anchor.x + f.x * q[0] + n.x * q[1], y: anchor.y + f.y * q[0] + n.y * q[1] });
    const from = at(spec.from || [10, -9]), to = at(spec.to || [10, 11]);
    const m = fatbikeMesh();
    if (spec.cans) addCans(m, 3);
    const riders = (spec.riders || ['durk', 'douwe']).map((k) => r.extras.find((e) => e.key === k) || null);
    // mount: the bike stands parked and the riders stand beside it until they get on (playCastScene times it)
    const mount = !!spec.mount;
    if (!mount) for (const e of riders) if (e) { e.riding = true; e.mesh.visible = false; }
    const a = Math.atan2(to.y - from.y, to.x - from.x), len = Math.hypot(to.x - from.x, to.y - from.y);
    m.visible = mount;
    if (mount) { m.position.set(from.x, 0, from.y); m.rotation.y = -a; }
    const o = { kind: 'fatbike', mesh: m, from, to, at0: spec.at0 ?? 0, dur: spec.dur || 8, auto: !!spec.auto, mount, cue: !!spec.cue, pos: from };
    o.update = (t, dt) => {
      const u = (t - o.at0) / o.dur;
      if (mount && u < 0) return;
      if (u < 0 || u > 1.05) { m.visible = false; for (const e of riders) if (e) e.mesh.visible = false; return; }
      if (mount) for (const e of riders) if (e) e.riding = true;
      m.visible = true;
      const x = lerp(from.x, to.x, u), y = lerp(from.y, to.y, u);
      o.pos = { x, y };
      rideFatbike(m, riders[0] && riders[0].mesh, riders[1] && riders[1].mesh, x, y, a, t, dt, len / o.dur);
    };
    return o;
  }
  if (spec.kind === 'ball') {
    const holder = r.extras.find((e) => e.key === spec.holder) || (spec.holder === 'N' && r.npc ? { mesh: r.npc } : null) || (spec.holder === 'T' ? { mesh: r.tammo } : spec.holder === 'A' ? { mesh: r.anita } : null);
    if (!holder) return null;
    const m = new THREE.Mesh(BALL_GEO, spec.material || BALL_GOLD);
    m.castShadow = true;
    m.position.set(0.03, -0.3, 0);
    holder.mesh.userData.elbowR.add(m);
    // from: it only shows once a line starting with this has begun ("Hier is hij")
    const o = { kind: 'ball', mesh: m, attached: true, holder: spec.holder, shown: !spec.from };
    m.visible = o.shown;
    o.update = (t, dt, cur) => {
      if (!o.shown && cur && cur.text.startsWith(spec.from)) o.shown = true;
      m.visible = o.shown;
    };
    r.ball = o;
    return o;
  }
  return null;
}

// Durk & Douwe's one fatbike: Durk pedals, Douwe stands on the rack, the
// whole thing wobbles. The bike's own rider is hidden.
const CAN_GEO = new THREE.BoxGeometry(0.22, 0.3, 0.14);
const CAN_MAT = new THREE.MeshLambertMaterial({ color: 0xd8b01a });
function fatbikeMesh() {
  const g = buildVehicleMesh({ id: 'cine-fatbike', isBike: true, model: { name: 'bike', fat: true, color: '#1b1b1b', rider: 0xc8102e, len: 1.9, wid: 0.6 } });
  for (const c of g.children) if (c.userData && c.userData.pelvis) c.visible = false;
  g.rotation.order = 'YXZ';
  return g;
}

function addCans(mesh, n = 2) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const c = new THREE.Mesh(CAN_GEO, CAN_MAT);
    c.position.set(-0.55 - k * 0.24, 0.95 + (k % 2) * 0.32, 0);
    mesh.add(c);
    out.push(c);
  }
  return out;
}

function rideFatbike(bike, durk, douwe, x, y, a, t, dt, speed) {
  const wob = Math.sin(t * 4.3) * 0.1 + Math.sin(t * 1.7) * 0.05;
  const c = Math.cos(a), s = Math.sin(a);
  bike.position.set(x, 0, y);
  bike.rotation.y = -a;
  bike.rotation.x = wob;
  updateVehicleWheelSpin(bike, speed, dt);
  if (durk) {
    durk.visible = true;
    durk.position.set(x - c * 0.3, seatedY(durk, 0.95), y - s * 0.3);
    durk.rotation.order = 'YXZ';
    durk.rotation.set(wob, -a, 0);
    seatPose(durk, { recline: -0.18, footX: 0.5, footY: -0.32, pedal: speed > 0.3, arms: 'wheel' }, t * Math.min(1.6, speed * 0.5 + 0.4));
  }
  if (douwe) {
    douwe.visible = true;
    douwe.position.set(x - c * 0.95, 0.5, y - s * 0.95);
    douwe.rotation.order = 'YXZ';
    douwe.rotation.set(wob * 1.4, -a, 0);
    standBehindPose(douwe);
    douwe.userData.armR.rotation.z = 2.4 + Math.sin(t * 6) * 0.3;
  }
}

// --- set building ------------------------------------------------------------------

// extras: story characters beside the NPC ('jelle', 'durk', { key, at: [forward, side], pose, face, h, bob });
// props: 'limo' (Jelle's trekker-limo as a backdrop), { kind: 'ball', holder }.
function buildRun(w, { npcKey, anchor, facing, kiss, h = 0, extras = [], props = [], noPair = false }) {
  const scene = sceneMod && sceneMod.getScene();
  if (!scene) return null;
  const group = new THREE.Group();
  group.name = 'mission-story';
  scene.add(group);
  const tammo = makeActor(TAMMO_APPEARANCE);
  const anita = makeActor(ANITA_APPEARANCE);
  group.add(tammo, anita);
  const npcDef = npcKey ? NPC[npcKey] : null;
  const npc = npcDef ? makeActor(npcDef) : null;
  if (npc) group.add(npc);

  const r = { w, group, tammo, anita, npc, npcDef, lastT: 0, kiss, extras: [], props: [], shake: 0.03 };
  const a = facing, fx = Math.cos(a), fy = Math.sin(a), nx = -fy, ny = fx;
  r.f = { x: fx, y: fy };
  r.n = { x: nx, y: ny };
  if (kiss) {
    standActor(tammo, anchor.x - fx * 0.23, anchor.y - fy * 0.23, a, h);
    standActor(anita, anchor.x + fx * 0.23, anchor.y + fy * 0.23, a + Math.PI, h);
    r.mid = { x: anchor.x, y: anchor.y };
  } else {
    const t = freeSpot(w, anchor.x + nx * 0.5, anchor.y + ny * 0.5);
    const an = freeSpot(w, anchor.x - nx * 0.5, anchor.y - ny * 0.5);
    standActor(tammo, t.x, t.y, a - 0.18, h);
    standActor(anita, an.x, an.y, a + 0.18, h);
    r.mid = { x: (t.x + an.x) / 2, y: (t.y + an.y) / 2 };
    if (npc) {
      const spot = freeSpot(w, anchor.x + fx * 2.1, anchor.y + fy * 2.1);
      standActor(npc, spot.x, spot.y, a + Math.PI, h);
      r.npcPos = spot;
    }
  }
  if (noPair) { tammo.visible = false; anita.visible = false; }
  r.h = h;
  const slots = kiss ? [[0.6, 2.6], [1.4, 3.3], [-0.2, 3.4]] : npc ? [[2.9, 1.6], [3.0, -1.6], [3.9, 0.6]] : [[2.1, 0], [2.9, 1.5], [2.9, -1.5]];
  extras.forEach((e, k) => {
    const spec = typeof e === 'string' ? { key: e } : e;
    const def = NPC[spec.key];
    if (!def) return;
    const m = makeActor(def);
    group.add(m);
    const [fw, sd] = spec.at || slots[k % slots.length];
    const spot = spec.xy || freeSpot(w, anchor.x + fx * fw + nx * sd, anchor.y + fy * fw + ny * sd);
    const ang = spec.face != null ? spec.face : Math.atan2(r.mid.y - spot.y, r.mid.x - spot.x);
    const eh = spec.h ?? h;
    standActor(m, spot.x, spot.y, ang, eh);
    r.extras.push({ key: spec.key, mesh: m, pos: spot, a: ang, h: eh, pose: spec.pose || null, bob: !!spec.bob, tall: m.scale.y, jump: spec.jump || null, jumpSide: spec.jumpSide || 1, jumpDelay: spec.jumpDelay || 0 });
  });
  for (const p of props) {
    const o = makeProp(r, p, anchor);
    if (!o) continue;
    if (!o.attached && !o.virtual) group.add(o.mesh);
    r.props.push(o);
  }
  const near = (q) => q.state !== 'dead' && Math.hypot(q.x - r.mid.x, q.y - r.mid.y) < 12;
  r.peds = w.pedestrians.filter(near);
  if (r.peds.length) w.pedestrians = w.pedestrians.filter((q) => !r.peds.includes(q));
  w.cinematicHidePlayers = true;
  w.cinematicHideNav = true;
  return r;
}

function cleanupRun(r) {
  if (!r || r.cleaned) return;
  r.cleaned = true;
  r.group.removeFromParent();
  for (const m of [r.tammo, r.anita, r.npc, ...r.extras.map((e) => e.mesh)]) if (m) disposeActor(m);
  for (const p of r.props) {
    if (p.attached) p.mesh.removeFromParent();
    if (p.own) p.mesh.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
  r.w.cinematicHidePlayers = false;
  r.w.cinematicHideNav = false;
  if (r.peds && r.peds.length) r.w.pedestrians.push(...r.peds);
  if (run === r) run = null;
}

const JELLE_GESTURES = ['self', 'point', 'shrug', null];

function animate(r, t, dt, talker, poses, cur = null) {
  const list = [[r.tammo, 'T'], [r.anita, 'A'], [r.npc, 'N'], ...r.extras.map((e) => [e.mesh, e.key, e])];
  for (const p of r.props) if (p.update) p.update(t, dt, cur);
  for (const [m, key, e] of list) {
    if (!m || (!m.visible && !(e && e.jump))) continue;
    if (e && e.riding) continue;
    if (e && e.jump && updateJump(r, e, t, dt, cur)) continue;
    const ud = m.userData;
    resetLimbs(ud);
    animatePersonWalk(m, 0, dt);
    let ps = poses[key] !== undefined ? poses[key] : e ? e.pose : null;
    const jelle = key === 'jelle' || (key === 'N' && r.npcDef === NPC.jelle);
    const seed = (key.charCodeAt(0) * 0.37) % 1;
    if (!ps && talker === key) {
      const list = jelle ? JELLE_GESTURES : TALK_GESTURES;
      ps = list[Math.floor(t / 1.5 + seed * 3) % list.length];
    }
    if (r.ball && r.ball.shown && r.ball.holder === key && talker === key && (!ps || ps === 'point' || ps === 'shrug' || ps === 'hips')) ps = 'hold';
    applyPose(m, ps, t, talker === key);
    ud.chest.rotation.x += Math.sin(t * 1.3 + seed * 6) * 0.025;
    // listeners look at the one talking
    const who = talker && talker !== key ? list.find((q) => q[1] === talker) : null;
    if (who && who[0] && ud.faceA != null && ps !== 'kissT' && ps !== 'kissA') {
      const d = Math.atan2(who[0].position.z - m.position.z, who[0].position.x - m.position.x) - ud.faceA;
      const rel = Math.atan2(Math.sin(d), Math.cos(d));
      ud.head.rotation.y = -Math.max(-0.95, Math.min(0.95, rel)) * 0.85;
    }
    if (e && e.bob) m.position.y = e.h + Math.sin(t * 3) * 0.08;
  }
}

const TALK_GESTURES = [null, 'point', null, 'shrug', null, 'hips'];

// Over the side and into the water when their line comes ("Plons."): a
// hop, a belly flop and a splash, then they bob and paddle.
function updateJump(r, e, t, dt, cur) {
  if (e.jumpT == null) {
    if (!(cur && cur.text === e.jump)) return false;
    e.jumpT = t + (e.jumpDelay || 0);
    const side = e.jumpSide || 1;
    e.jumpTo = { x: e.pos.x + r.n.x * 2.6 * side, y: e.pos.y + r.n.y * 2.6 * side };
  }
  const m = e.mesh, k = (t - e.jumpT) / 0.95;
  if (k < 0) return false;
  const ud = m.userData;
  resetLimbs(ud);
  if (k < 1) {
    const x = lerp(e.pos.x, e.jumpTo.x, k), y = lerp(e.pos.y, e.jumpTo.y, k);
    const z = lerp(e.h, SWIM_H, k) + Math.sin(k * Math.PI) * 1.3;
    standActor(m, x, y, e.a, z);
    ud.chest.rotation.z = -0.9 * k;
    ud.armL.rotation.set(0, 0, 2.8); ud.armR.rotation.set(0, 0, 2.8);
    return true;
  }
  if (!e.splashed) {
    e.splashed = true;
    for (let q = 0; q < 12; q++) {
      const a = (q / 12) * Math.PI * 2;
      spawnFxPuff(e.jumpTo.x, WATER_Y + 0.1, e.jumpTo.y, Math.cos(a) * 2.6, 2.6 + Math.random() * 2.5, Math.sin(a) * 2.6, 0.8, 0.3, 1, 0.92, 0.96, 1, 0.8, 2, -1);
    }
  }
  standActor(m, e.jumpTo.x, e.jumpTo.y, e.a + Math.PI / 2, SWIM_H + Math.sin(t * 3 + e.jumpTo.x) * 0.08);
  applyPose(m, 'cheer', t, false);
  return true;
}

// Camera helpers, all relative to the pair (mid), the NPC and facing f/n.
function camsFor(r) {
  const w = r.w, f = r.f, n = r.n, mid = r.mid, h = r.h;
  const npc = r.npcPos || { x: mid.x + f.x * 2.1, y: mid.y + f.y * 2.1 };
  const head = (p, z = 1.5) => P(p.x, p.y, h + z);
  const side = (k) => (blocked(w, mid.x - f.x * 1.5 + n.x * 1.9 * k, mid.y - f.y * 1.5 + n.y * 1.9 * k) ? -k : k);
  const s1 = side(1);
  return {
    est: (u) => {
      const a = camClear(w, P(mid.x - f.x * lerp(9, 6, smooth(u)) + n.x * lerp(5, 3.2, u) * s1, mid.y - f.y * lerp(9, 6, smooth(u)) + n.y * lerp(5, 3.2, u) * s1, h + lerp(4.2, 2.8, u)));
      return pose(a, head({ x: (mid.x + npc.x) / 2, y: (mid.y + npc.y) / 2 }, 1.3), 50);
    },
    // an opening: from high over the square, swooping down and round onto the group
    descend: (u) => {
      const k = smooth(u), e = 1 - (1 - k) * (1 - k);
      const ex = -f.x * 9 + n.x * 5 * s1, ey = -f.y * 9 + n.y * 5 * s1;
      const a = Math.atan2(ey, ex) + lerp(1.15, 0, k) * s1, R = lerp(26, 9.5, e);
      const c = { x: (mid.x + npc.x) / 2, y: (mid.y + npc.y) / 2 };
      const pos = camClear(w, P(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R, h + lerp(19, 3.6, e)));
      return pose(pos, head(c, lerp(0.4, 1.3, k)), lerp(56, 48, k));
    },
    // over the pair's shoulder, tracking sideways across onto the NPC
    track: (u) => {
      const k = smooth(u), sw = lerp(2.9, 0.5, k) * s1, back = lerp(2.3, 1.5, k);
      const a = camClear(w, P(mid.x - f.x * back + n.x * sw, mid.y - f.y * back + n.y * sw, h + lerp(1.5, 1.78, k)));
      return pose(a, head(npc, 1.5), lerp(44, 34, k));
    },
    npc: (u) => {
      const k = smooth(u), sw = lerp(2.2, 1.6, k) * s1, back = lerp(1.9, 1.3, k);
      const a = camClear(w, P(mid.x - f.x * back + n.x * sw, mid.y - f.y * back + n.y * sw, h + lerp(1.62, 1.74, k)));
      return pose(a, head(npc, 1.5), lerp(41, 35, k));
    },
    // a tight close-up on a strong line
    close: (key, u) => {
      const e = key === 'N' ? { pos: npc, tall: 1, h } : key === 'T' || key === 'A' ? { pos: key === 'T' ? { x: r.tammo.position.x, y: r.tammo.position.z } : { x: r.anita.position.x, y: r.anita.position.z }, tall: 1, h } : r.extras.find((q) => q.key === key);
      if (!e) return null;
      const d = Math.hypot(e.pos.x - mid.x, e.pos.y - mid.y);
      const dir = key === 'T' || key === 'A' || d < 0.5 ? f : { x: (mid.x - e.pos.x) / d, y: (mid.y - e.pos.y) / d };
      const a = camClear(w, P(e.pos.x + dir.x * lerp(1.7, 1.35, u) + n.x * 0.35, e.pos.y + dir.y * lerp(1.7, 1.35, u) + n.y * 0.35, e.h + 1.55 * e.tall));
      return pose(a, P(e.pos.x, e.pos.y, e.h + 1.52 * e.tall), 32);
    },
    // over the pair's shoulder onto one of the extra characters
    extra: (key, u) => {
      const e = r.extras.find((q) => q.key === key);
      if (!e) return null;
      const d = Math.hypot(e.pos.x - mid.x, e.pos.y - mid.y) || 1;
      const ux = (e.pos.x - mid.x) / d, uy = (e.pos.y - mid.y) / d;
      const px = -uy, py = ux;
      const k = smooth(u), back = Math.max(2.4, Math.min(d * 0.8, 3.2)) + lerp(0.4, -0.3, k), sw = lerp(1.6, 1.0, k) * s1;
      const a = camClear(w, P(e.pos.x - ux * back + px * sw, e.pos.y - uy * back + py * sw, e.h + lerp(1.5, 1.66, k) * e.tall));
      return pose(a, P(e.pos.x, e.pos.y, e.h + 1.4 * e.tall), lerp(44, 38, k));
    },
    // looking past the pair at a moving prop (the twins' fatbike)
    prop: (kind, u) => {
      const o = r.props.find((q) => q.kind === kind);
      if (!o || !o.mesh.visible) return null;
      const q = o.pos, d = Math.hypot(q.x - mid.x, q.y - mid.y) || 1;
      const a = camClear(w, P(mid.x - (q.x - mid.x) / d * 2.2 + n.x * 0.8 * s1, mid.y - (q.y - mid.y) / d * 2.2 + n.y * 0.8 * s1, h + 1.8));
      return pose(a, P(q.x, q.y, o.z ?? 1.3), lerp(30, 24, u));
    },
    duo: (u) => {
      const k = smooth(u), fw = lerp(2.2, 1.6, k), sw = lerp(1.3, 0.6, k) * s1;
      const a = camClear(w, P(npc.x + f.x * fw - n.x * sw, npc.y + f.y * fw - n.y * sw, h + lerp(1.6, 1.72, k)));
      return pose(a, head(mid, 1.42), lerp(42, 36, k));
    },
    two: (u) => {
      const a = camClear(w, P(mid.x + f.x * lerp(3.6, 3.0, u) + n.x * 0.4, mid.y + f.y * lerp(3.6, 3.0, u) + n.y * 0.4, h + 1.6));
      return pose(a, head(mid, 1.35), 42);
    },
    // everyone: a wider shot from behind the pair, towards the NPC and the extras
    group: (u) => {
      const k = smooth(u), sw = lerp(3.2, 1.4, k) * s1;
      const a = camClear(w, P(mid.x - f.x * lerp(6.8, 5.2, k) + n.x * sw, mid.y - f.y * lerp(6.8, 5.2, k) + n.y * sw, h + lerp(3.0, 2.3, k)));
      return pose(a, head({ x: mid.x + f.x * 2.4, y: mid.y + f.y * 2.4 }, 1.2), 50);
    },
    kiss: (u) => {
      const a = camClear(w, P(mid.x + n.x * lerp(3.6, 3.0, smooth(u)), mid.y + n.y * lerp(3.6, 3.0, smooth(u)), h + lerp(1.8, 1.65, u)));
      return pose(a, head(mid, 1.35), lerp(42, 38, u));
    },
    rise: (u) => {
      const k = smooth(u);
      const a = camClear(w, P(mid.x + n.x * lerp(3, 10, k) * s1 - f.x * lerp(2, 8, k), mid.y + n.y * lerp(3, 10, k) * s1 - f.y * lerp(2, 8, k), h + lerp(1.8, 9, k)));
      return pose(a, head(mid, lerp(1.4, 0.6, k)), 48);
    },
    glance: (u, target) => {
      const k = smooth(u);
      const tx = target ? target.x : mid.x + f.x * 60, ty = target ? target.y : mid.y + f.y * 60;
      const d = Math.hypot(tx - mid.x, ty - mid.y) || 1;
      const lim = Math.min(d, 140);
      const gx = mid.x + (tx - mid.x) / d * lim, gy = mid.y + (ty - mid.y) / d * lim;
      const a = camClear(w, P(mid.x - (gx - mid.x) / lim * 4 + n.x * 2.5 * s1, mid.y - (gy - mid.y) / lim * 4 + n.y * 2.5 * s1, h + lerp(2.2, 8, k)));
      return pose(a, P(lerp(mid.x, gx, k), lerp(mid.y, gy, k), lerp(1.4, 2.5, k)), 50);
    },
  };
}

function camFor(r, cams, who, isFirst, isLast, closing, target, text = '') {
  if (closing === 'two') return cams.two;
  if (who === 'V') return isFirst || isLast ? cams.rise : (u) => cams.glance(u, target);
  // a quick cut in close on an exclamation
  if (!isFirst && !isLast && /!$/.test(text)) return (u) => cams.close(who, u) || cams.two(u);
  if (isFirst) return r.extras.length && !r.npc ? cams.group : (u) => cams.est(u);
  if (closing === 'kiss' && isLast) return cams.kiss;
  if (isLast && closing === 'glance') return (u) => cams.glance(u, target);
  if (isLast && closing === 'rise') return cams.rise;
  if (r.extras.some((e) => e.key === who)) return (u) => cams.extra(who, u) || cams.group(u);
  return who === 'N' ? cams.npc : cams.duo;
}

// A clue line: the camera creeps a third of the way towards what it looks at.
function pushIn(p, k) {
  const q = 0.3 * k;
  return { ...p, position: P(lerp(p.position.x, p.lookAt.x, q), lerp(p.position.y, p.lookAt.y, q), lerp(p.position.z, p.lookAt.z, q)), fov: p.fov * (1 - 0.1 * k) };
}

const cineLines = (lines) => lines.map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur, clue: l.clue || undefined }));

// Runs a staged scene: voices, gestures, clue push-ins and the camera
// (camera(t, cur) returns a pose). keep: the caller cleans up (a queued card).
function runScene(r, tl, { id, kicker = '', title = '', cardFor = 3, camera, poses = () => ({}), update = null, banner, bannerAfter, live = null, keep = false, onDone = null }) {
  const lines = tl.lines;
  run = r;
  const ok = playCinematic({
    id, priority: 3, duration: tl.total, pause: true, letterbox: !live, skippable: true, hideHud: true,
    kicker, title, cardFor,
    lines: cineLines(lines),
    shot: (u, t) => {
      const dt = Math.max(0, Math.min(0.1, t - r.lastT));
      r.lastT = t;
      const cur = lines.find((l) => t >= l.at && t < l.at + l.dur);
      if (cur && cur !== r.voiced) {
        r.voiced = cur;
        // Rikus is always on the radio: his voice in the broadcast band
        if (cur.voice) playStoryVoice(VOICE_DIR + cur.voice.src, { radio: cur.who === 'V' || cur.who === 'rikus' });
        else stopStoryVoice();
        if (cur.clue) playClueSting();
        if (cur.card) showNameCard(cur.card);
      }
      if (update) update(t, dt, cur);
      animate(r, t, dt, cur ? cur.who : null, poses(t, cur), cur);
      let p = camera(t, cur);
      if (cur && cur.clue && p) p = pushIn(p, smooth((t - cur.at) / Math.min(1.8, cur.dur)));
      if (!live && p && r.shake) {
        const j = r.shake;
        p = { ...p, position: P(p.position.x + Math.sin(t * 1.7) * j, p.position.y + Math.cos(t * 1.3) * j, p.position.z + Math.sin(t * 2.1 + 1) * j * 0.6) };
      }
      if (live && p) {
        // handheld phone camera
        const j = 0.035;
        p = { ...p, position: P(p.position.x + Math.sin(t * 2.3) * j, p.position.y + Math.cos(t * 1.9) * j, p.position.z + Math.sin(t * 3.1) * j * 0.8), cut: true };
      }
      return p;
    },
    onStart: () => { setStoryScene(true); if (banner) showBanner(banner); if (live) showLiveFrame(true, live); },
    onEnd: (skipped) => {
      setStoryScene(false);
      if (live) showLiveFrame(false);
      if (!keep) cleanupRun(r);
      if (bannerAfter) showBanner(bannerAfter);
      if (onDone) onDone(skipped);
    },
  });
  if (!ok) {
    cleanupRun(r);
    if (banner || bannerAfter) showBanner(banner || bannerAfter);
  }
  return ok;
}

// opening: the first line's shot ('descend'); a line's own `cam` picks a shot by name
function lineCam(cams, name, who) {
  if (name === 'close') return (u) => cams.close(who, u) || cams.duo(u);
  return cams[name] || null;
}

function play(w, id, r, tl, { kicker, title, cardFor, closing, opening, target, poses = () => ({}), banner, bannerAfter }) {
  const cams = camsFor(r);
  const lines = tl.lines;
  const plan = lines.map((l, i) => {
    const own = i === 0 && opening ? lineCam(cams, opening, l.who) : l.cam ? lineCam(cams, l.cam, l.who) : null;
    const base = own || camFor(r, cams, l.who, i === 0 && lines.length > 1, i === lines.length - 1, closing, target, l.text);
    return { from: l.at - (i === 0 ? l.at : 0.06), to: l.at + l.dur + 0.06, fn: l.look ? (u) => cams.prop(l.look, u) || base(u) : base };
  });
  if (lines.length === 1) plan[0].fn = closing === 'glance' ? (u) => cams.glance(u, target) : cams.two;
  // a prop that drives by on cue: timed to the lines that look at it
  for (const p of r.props) {
    if (!p.auto) continue;
    const ls = lines.filter((l) => l.look === p.kind);
    if (!ls.length) { p.at0 = Infinity; continue; }
    p.at0 = ls[0].at - 1.4;
    p.dur = ls[ls.length - 1].at + ls[ls.length - 1].dur - p.at0 + 1.2;
  }
  plan[plan.length - 1].to = tl.total;
  return runScene(r, tl, {
    id, kicker, title, cardFor, poses, banner, bannerAfter,
    camera: (t) => {
      const seg = plan.find((p) => t < p.to) || plan[plan.length - 1];
      return seg.fn(clamp01((t - seg.from) / Math.max(0.1, seg.to - seg.from)));
    },
  });
}

function stageLines(i, stage, kind) {
  const s = STORY[i];
  const base = s[kind];
  if (stage >= i) return base;
  const npcLines = base.filter((l) => l[0] === 'N');
  const duo = DUO_BY_STAGE[Math.max(0, Math.min(DUO_BY_STAGE.length - 1, stage))][kind];
  return kind === 'intro' ? [...npcLines.slice(0, 2), ...duo, ...npcLines.slice(2)] : [...npcLines.slice(0, 1), ...duo];
}

function facingTowards(w, anchor, target) {
  const pref = target ? Math.atan2(target.y - anchor.y, target.x - anchor.x) : w.player.angle;
  return chooseFacing(w, anchor.x, anchor.y, Number.isFinite(pref) ? pref : 0);
}

function onFootAnchor(w) {
  const p = w.player;
  if (!p.inVehicle) return { x: p.x, y: p.y };
  const v = p.inVehicle;
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  for (const k of [-1, 1]) {
    const x = v.x - s * k * 2.6, y = v.y + c * k * 2.6;
    if (!blocked(w, x, y)) return freeSpot(w, x, y);
  }
  return freeSpot(w, v.x - s * 2.6, v.y + c * 2.6);
}

export function playStoryIntro(w, i, { stage = i, short = false, kicker = '', title = '', target = null } = {}) {
  const s = STORY[i];
  if (!s || run) return false;
  const v = w.player.inVehicle;
  const onDeck = !!(v && v.isBoat);
  const anchor = onDeck ? { x: v.x, y: v.y } : onFootAnchor(w);
  const facing = onDeck ? v.angle + Math.PI / 2 : facingTowards(w, anchor, target);
  const full = !short && stage >= i && !onDeck;
  const r = buildRun(w, { npcKey: onDeck || s.introNpc === false ? null : s.npc, anchor, facing, h: onDeck ? DECK_H : 0, extras: full ? s.introCast || [] : [], props: full ? s.introProps || [] : [] });
  if (!r) return false;
  // narration the opening montage (intromontage.js) already told is skipped
  const all = stageLines(i, stage, 'intro').filter((l) => !(l[0] === 'V' && w.introTold && w.introTold.includes(l[1])));
  const lines = short ? [s.intro[s.ask]] : all;
  const tl = timeline(lines, r.npcDef, short ? 0.4 : 0.6);
  const askText = s.intro[s.ask][1];
  return play(w, 'mission-intro', r, tl, {
    kicker, title, cardFor: short ? tl.total : 3.6, closing: 'glance', opening: full ? s.introOpen : null, target,
    poses: (t, cur) => ({ N: cur && cur.text === askText ? 'point' : i === 1 || i === 15 ? 'phone' : null, A: (i === 5 || i === 15) && cur && cur.who === 'A' ? 'hips' : null }),
  });
}

export function playStoryOutro(w, i, opts = {}) {
  const s = STORY[i];
  const { stage = i, short = false } = opts;
  // a beat before the talk, e.g. the trekker-limo pulling up at the museum (H4)
  if (s && s.before === 'limo' && !short && stage >= i && !run && playLimoReveal(w, () => outroNow(w, i, opts))) return true;
  return outroNow(w, i, opts);
}

function outroNow(w, i, { stage = i, short = false, reward = 0, stats = [], reason = '' } = {}) {
  const s = STORY[i];
  const banner = { kind: 'pass', title: 'MISSIE GESLAAGD', reason, reward, stats };
  if (!s || run) { showBanner(banner); return false; }
  const p = w.player;
  const v = p.inVehicle;
  const full = !short && stage >= i;
  const kiss = !!s.kiss && full;
  let r;
  // a replay (the mission as a klus) has its own short outro that needs no story
  const lines = short ? s.replay || [stageLines(i, stage, 'outro').slice(-1)[0]] : stageLines(i, stage, 'outro');
  const outroKey = s.outroNpcKey || s.npc;
  const wantNpc = short ? lines.some((l) => l[0] === 'N') : !!s.outroNpc && !kiss;
  if (v && v.isBoat) {
    r = buildRun(w, { anchor: { x: v.x, y: v.y }, facing: v.angle + Math.PI / 2, kiss, h: DECK_H });
  } else {
    const anchor = onFootAnchor(w);
    r = buildRun(w, { npcKey: wantNpc ? outroKey : null, anchor, facing: facingTowards(w, anchor, null), kiss, extras: full ? s.outroCast || [] : [], props: full ? s.outroProps || [] : [] });
  }
  if (!r) { showBanner(banner); return false; }
  const tl = timeline(lines, r.npcDef || NPC[outroKey], short ? 0.3 : 0.5);
  // the kiss: on the line marked `kiss`, else on the last line
  const kissLine = kiss ? tl.lines.find((l) => l.kiss) || tl.lines[tl.lines.length - 1] : null;
  return play(w, 'mission-outro', r, tl, {
    closing: kiss && kissLine === tl.lines[tl.lines.length - 1] ? 'kiss' : 'rise', banner,
    poses: (t, cur) => (kiss && cur === kissLine
      ? { T: 'kissT', A: 'kissA' }
      : kiss ? {} : { N: s.outroPose || null }),
  });
}

export function playStoryFail(w, i, { reason = '', stats = [] } = {}) {
  const s = STORY[i];
  const banner = { kind: 'fail', title: 'Sikkom.', reason, stats };
  if (!s || run) { showBanner(banner); return false; }
  const v = w.player.inVehicle;
  let r;
  if (v && v.isBoat) r = buildRun(w, { anchor: { x: v.x, y: v.y }, facing: v.angle + Math.PI / 2, h: DECK_H });
  else {
    const anchor = onFootAnchor(w);
    r = buildRun(w, { anchor, facing: facingTowards(w, anchor, null) });
  }
  if (!r) { showBanner(banner); return false; }
  const tl = timeline(s.fail, null, 0.3);
  r.shake = 0.07;
  return play(w, 'mission-fail', r, tl, { closing: 'two', bannerAfter: banner, poses: (t, cur) => ({ A: cur && cur.who === 'A' ? 'hips' : null }) });
}

// --- Jelle's fierljep escape ------------------------------------------------------

// The nearest canal crossing from (x, y): the dry bank before the water and
// a landing spot on the far side, at most `maxSpan` metres of water.
function waterCrossing(w, x, y, maxR = 90, maxSpan = 34) {
  let best = null;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    let wet = -1;
    for (let d = 2; d <= maxR; d += 1.5) if (isInWater(w.map, x + dx * d, y + dy * d)) { wet = d; break; }
    if (wet < 0 || (best && wet >= best.wet)) continue;
    let dry = -1;
    for (let d = wet + 1; d <= wet + maxSpan; d += 1) if (!isInWater(w.map, x + dx * d, y + dy * d)) { dry = d; break; }
    if (dry < 0) continue;
    best = { wet, dry, dx, dy };
  }
  if (!best) return null;
  const { wet, dry, dx, dy } = best;
  return { a: { x: x + dx * (wet - 1), y: y + dy * (wet - 1) }, b: { x: x + dx * (dry + 2), y: y + dy * (dry + 2) }, dx, dy };
}

// Jelle Terpstra talks, runs up and vaults over the nearest canal with his
// polsstok (fierljep.js, stepped from this paused scene; over the street
// when there's no water nearby); Durk and Douwe stay behind and then leg it.
// lines: [[who, text], ...] before the jump. fail: the pole stalls and tips
// over and Jelle drops into the water (the finale).
export function playVaultScene(w, { at, lines = [], landing = 'Moai! Oant sjen, Grinzers!', kicker = '', title = '', fail = false } = {}) {
  if (run) return false;
  const scene = sceneMod && sceneMod.getScene();
  if (!scene) return false;
  const spot = fjMod ? fjMod.findVaultSpot(w.map, at.x, at.y, 95, { maxWidth: 26 }) : null;
  let c = spot ? { a: spot.from, b: spot.to } : waterCrossing(w, at.x, at.y);
  if (spot) {
    const D = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y) || 1;
    c.dx = (c.b.x - c.a.x) / D; c.dy = (c.b.y - c.a.y) / D;
  }
  if (!c) {
    const a = w.player.angle || 0, dx = Math.cos(a), dy = Math.sin(a);
    c = { a: { x: at.x + dx * 4, y: at.y + dy * 4 }, b: { x: at.x + dx * 14, y: at.y + dy * 14 }, dx, dy };
  }
  const { dx, dy } = c;
  const nx = -dy, ny = dx;
  const span = Math.hypot(c.b.x - c.a.x, c.b.y - c.a.y);
  const plant = { x: (c.a.x + c.b.x) / 2, y: (c.a.y + c.b.y) / 2 };
  const ang = Math.atan2(dy, dx);
  const group = new THREE.Group();
  group.name = 'mission-vault';
  scene.add(group);
  const tammo = makeActor(TAMMO_APPEARANCE), anita = makeActor(ANITA_APPEARANCE);
  const jelle = makeActor(NPC.jelle), durk = makeActor(NPC.durk), douwe = makeActor(NPC.douwe);
  group.add(tammo, anita, jelle, durk, douwe);
  const at0 = (d, side = 0) => freeSpot(w, c.a.x - dx * d + nx * side, c.a.y - dy * d + ny * side);
  const start = at0(9);
  const tS = at0(15, 1.2), aS = at0(15, -0.2), dS = at0(6, 3), eS = at0(6.5, 4.3);
  standActor(tammo, tS.x, tS.y, ang - 0.2);
  standActor(anita, aS.x, aS.y, ang + 0.2);
  standActor(jelle, start.x, start.y, ang + Math.PI);
  standActor(durk, dS.x, dS.y, ang + Math.PI - 0.5);
  standActor(douwe, eS.x, eS.y, ang + Math.PI - 0.6);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1, 6), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
  group.add(pole);
  // the twins' getaway: both of them on one fatbike, parked behind them
  const bike = fail ? null : fatbikeMesh();
  const bS = at0(8.5, 6.2), awayA = Math.atan2(-dy, -dx) + 0.5;
  if (bike) {
    group.add(bike);
    bike.position.set(bS.x, 0, bS.y);
    bike.rotation.y = -awayA;
  }

  const tl = timeline(lines, NPC.jelle, 0.6);
  const talkEnd = tl.total;
  // fierljep.js timing: run-up, jump onto the pole, the swing (slowed down
  // at the top), then the drop or the topple and the splash
  const swingT = fail ? 1.5 : 1.05 + Math.max(6, Math.min(22, 0.94 * span + 1.3)) * 0.09;
  const RUN = 1.3, JUMP = spot ? 0.42 + swingT * 1.93 + (fail ? 1.9 : 0.8) : 1.7, AFTER = spot ? 3.4 : 2.6;
  const RIDE = bike ? 3.4 : 0;
  const jumpAt = talkEnd + RUN, landAt = jumpAt + JUMP, total = landAt + AFTER + RIDE;
  const apex = 3.5 + span * 0.18;
  const lineAt = !fail ? landAt + (spot ? 0.8 : 0.1) : spot ? jumpAt + 0.62 + swingT * 1.93 : jumpAt + JUMP * 0.4;
  const allLines = [...tl.lines, { who: 'jelle', speaker: NPC.jelle.name, text: landing, at: lineAt, dur: 2.2 }];
  let splashed = false;
  const hide = w.pedestrians.filter((q) => q.state !== 'dead' && Math.hypot(q.x - c.a.x, q.y - c.a.y) < 18);
  if (hide.length) w.pedestrians = w.pedestrians.filter((q) => !hide.includes(q));
  w.cinematicHidePlayers = true;
  w.cinematicHideNav = true;
  // the talk is filmed from the side where no wall or parked car (the tanker) blocks the view
  const talkMid = { x: (tS.x + start.x) / 2, y: (tS.y + start.y) / 2 };
  const blockers = (sx) => {
    const cx = talkMid.x + nx * 6.5 * sx - dx * 1.5, cy = talkMid.y + ny * 6.5 * sx - dy * 1.5;
    let n = roofAt(w.map, cx, cy) ? 10 : 0;
    for (let k = 0; k <= 4; k++) {
      const px = cx + (start.x - cx) * k / 5, py = cy + (start.y - cy) * k / 5;
      for (const v of w.vehicles) if (!v.isBoat && Math.hypot(v.x - px, v.y - py) < v.halfLen + 0.8) n++;
    }
    return n;
  };
  const talkSide = blockers(1) > blockers(-1) ? -1 : 1;
  const r = { w, group, lastT: 0, vault: null };
  const proxy = { x: start.x, y: start.y, angle: ang + Math.PI };
  const up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();
  const setPole = (x0, y0, z0, x1, y1, z1) => {
    tmp.set(x1 - x0, z1 - z0, y1 - y0);
    const len = tmp.length() || 1;
    pole.scale.set(1, len, 1);
    pole.position.set((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2);
    pole.quaternion.setFromUnitVectors(up, tmp.normalize());
  };
  const cleanup = () => {
    if (r.vault) { r.vault.dispose(); r.vault = null; }
    group.removeFromParent();
    for (const m of [tammo, anita, jelle, durk, douwe]) disposeActor(m);
    pole.geometry.dispose();
    pole.material.dispose();
    w.cinematicHidePlayers = false;
    w.cinematicHideNav = false;
    if (hide.length) w.pedestrians.push(...hide);
    if (run === r) run = null;
  };
  run = r;
  const ok = playCinematic({
    id: 'mission-vault', priority: 3, duration: total, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker, title, cardFor: kicker ? 2.4 : 0,
    lines: cineLines(allLines),
    shot: (u, t) => {
      const dt = Math.max(0, Math.min(0.1, t - r.lastT));
      r.lastT = t;
      const cur = allLines.find((l) => t >= l.at && t < l.at + l.dur);
      const talking = (key) => !!cur && cur.who === key;
      const fled = !fail && t > landAt + 0.6;
      const ft = t - landAt - 0.6;
      const riding = !!bike && fled && ft > 1.1;
      for (const [m, key] of [[tammo, 'T'], [anita, 'A'], [durk, 'durk'], [douwe, 'douwe']]) {
        if (riding && (key === 'durk' || key === 'douwe')) continue;
        resetLimbs(m.userData);
        animatePersonWalk(m, fled && (key === 'durk' || key === 'douwe') ? 3 : 0, dt);
        const twinPose = key === 'durk' && talking('durk') ? 'shrug' : (key === 'durk' || key === 'douwe') && !fled ? 'look' : null;
        applyPose(m, t > landAt && (key === 'T' || key === 'A') ? 'hips' : twinPose, t, talking(key));
      }
      if (fled && !bike) {
        const k = ft * 3;
        standActor(durk, dS.x - dx * k + nx * k * 0.3, dS.y - dy * k + ny * k * 0.3, ang + Math.PI + 0.3);
        standActor(douwe, eS.x - dx * k + nx * k * 0.3, eS.y - dy * k + ny * k * 0.3, ang + Math.PI + 0.3);
      } else if (fled && !riding) {
        // a waddle to the bike, bumping into each other
        const k = smooth(ft / 1.1);
        standActor(durk, lerp(dS.x, bS.x, k), lerp(dS.y, bS.y, k), Math.atan2(bS.y - dS.y, bS.x - dS.x));
        standActor(douwe, lerp(eS.x, bS.x, k) + nx * 0.4 * (1 - k), lerp(eS.y, bS.y, k) + ny * 0.4 * (1 - k), Math.atan2(bS.y - eS.y, bS.x - eS.x));
      } else if (riding) {
        // off they go, slowly, far too heavy for one fatbike
        const s2 = Math.max(0, ft - 1.1);
        const v = Math.min(3.2, 0.6 + s2 * 1.4), d = s2 * (0.6 + Math.min(3.2, s2 * 1.4) * 0.5);
        rideFatbike(bike, durk, douwe, bS.x + Math.cos(awayA) * d, bS.y + Math.sin(awayA) * d, awayA, t, dt, v);
      }
      const twinsCam = riding && t > landAt + AFTER - 0.2
        ? pose(camClear(w, P(bS.x + Math.cos(awayA + 1.4) * 5.5 - Math.cos(awayA) * 2, bS.y + Math.sin(awayA + 1.4) * 5.5 - Math.sin(awayA) * 2, 1.9)), P(bike.position.x, bike.position.z, 1.2), 44)
        : null;
      if (spot && t >= talkEnd) {
        if (!r.vault) {
          jelle.visible = false;
          pole.visible = false;
          r.vault = fjMod.poleVault(proxy, c.a, c.b, { fail, appearance: NPC.jelle, slowmo: true, say: false, keepActor: true, swimTime: Infinity });
        }
        // the scene pauses the world, so the vault is stepped from here
        fjMod.updatePoleVaults(dt, w);
        const q = r.vault.pos;
        const side = 9 + span * 0.35;
        const fx = (c.a.x + c.b.x) * 0.25 + q.x * 0.5, fy = (c.a.y + c.b.y) * 0.25 + q.y * 0.5;
        return twinsCam || pose(camClear(w, P(fx + nx * side * talkSide, fy + ny * side * talkSide, 4 + Math.max(0, q.z) * 0.45)), P(q.x, q.y, Math.max(q.z, -0.6) * 0.8 + 0.8), 54);
      }
      resetLimbs(jelle.userData);
      if (t < talkEnd) {
        animatePersonWalk(jelle, 0, dt);
        applyPose(jelle, talking('jelle') && Math.sin(t) > 0.3 ? 'point' : null, t, talking('jelle'));
        setPole(start.x + nx * 0.3 - dx * 1.5, start.y + ny * 0.3 - dy * 1.5, 0.2, start.x + nx * 0.3 + dx * 2, start.y + ny * 0.3 + dy * 2, 3.8);
      } else if (t < jumpAt) {
        const k = smooth((t - talkEnd) / RUN);
        const x = lerp(start.x, c.a.x, k), y = lerp(start.y, c.a.y, k);
        standActor(jelle, x, y, ang);
        animatePersonWalk(jelle, 6, dt);
        setPole(x + dx * 5, y + dy * 5, 0.9, x - dx * 1.5, y - dy * 1.5, 1.6);
      } else if (fail && t < landAt) {
        // up, the pole snaps, straight down into the water
        const k = (t - jumpAt) / JUMP;
        const x = lerp(c.a.x, plant.x, Math.min(1, k * 1.15)), y = lerp(c.a.y, plant.y, Math.min(1, k * 1.15));
        const z = k < 0.45 ? 4 * apex * 0.6 * (k / 0.9) * (1 - k / 0.9) : lerp(apex * 0.6 * 0.99, SWIM_H, smooth((k - 0.45) / 0.55));
        standActor(jelle, x, y, ang, z);
        applyPose(jelle, 'cheer', t, false);
        if (k < 0.45) setPole(plant.x, plant.y, -0.8, x, y, z + 1.9);
        else setPole(plant.x, plant.y, -0.8, plant.x + dx * 3 * (k - 0.45), plant.y + dy * 3 * (k - 0.45), 3.8 - (k - 0.45) * 5);
      } else if (fail) {
        // bobbing in the water, arms up, while the pair walks to the edge
        if (!splashed) {
          splashed = true;
          for (let q = 0; q < 14; q++) {
            const a = (q / 14) * Math.PI * 2;
            spawnFxPuff(plant.x, WATER_Y + 0.1, plant.y, Math.cos(a) * 3, 3 + Math.random() * 3, Math.sin(a) * 3, 0.9, 0.3, 1.1, 0.92, 0.96, 1, 0.8, 2, -1);
          }
        }
        standActor(jelle, plant.x, plant.y, ang + Math.PI, SWIM_H + Math.sin(t * 3) * 0.08);
        applyPose(jelle, 'cheer', t, talking('jelle'));
        pole.visible = false;
      } else if (t < landAt) {
        const k = (t - jumpAt) / JUMP;
        const x = lerp(c.a.x, c.b.x, k), y = lerp(c.a.y, c.b.y, k);
        const z = 4 * apex * k * (1 - k);
        standActor(jelle, x, y, ang, z);
        applyPose(jelle, 'cheer', t, false);
        setPole(plant.x, plant.y, -0.8, x, y, z + 1.9);
      } else {
        const k = Math.min(1, (t - landAt) / AFTER);
        const x = c.b.x + dx * k * 5, y = c.b.y + dy * k * 5;
        standActor(jelle, x, y, k < 0.35 ? ang + Math.PI : ang);
        animatePersonWalk(jelle, k < 0.35 ? 0 : 3, dt);
        applyPose(jelle, k < 0.35 ? 'cheer' : null, t, talking('jelle'));
        pole.visible = k < 0.35;
        setPole(plant.x, plant.y, -0.8, plant.x - dx * 0.5, plant.y - dy * 0.5, 5);
      }
      // cameras: past the duo at Jelle while he talks, then side-on for the jump
      if (t < talkEnd) {
        const mid = { x: (tS.x + start.x) / 2, y: (tS.y + start.y) / 2 };
        return pose(camClear(w, P(mid.x + nx * 6.5 * talkSide - dx * 1.5, mid.y + ny * 6.5 * talkSide - dy * 1.5, 2.6)), P(start.x, start.y, 1.5), 44);
      }
      const side = 13 + span * 0.55;
      const k = smooth(Math.min(1, (t - talkEnd) / (RUN + JUMP)));
      const fx = lerp(c.a.x, c.b.x, k * 0.8), fy = lerp(c.a.y, c.b.y, k * 0.8);
      return twinsCam || pose(camClear(w, P(fx + nx * side, fy + ny * side, 3.2 + apex * 0.3)), P(fx, fy, 1.5 + apex * 0.35 * Math.min(1, k * 2)), 50);
    },
    onStart: () => setStoryScene(true),
    onEnd: () => { setStoryScene(false); cleanup(); },
  });
  if (!ok) cleanup();
  return ok;
}

// --- staged scenes: the Frisian cast on screen --------------------------------------

// A mission stage cutscene (missions.js 'scene' stages) with actors: Tammo
// and Anita where the player stands, plus `cast` (see buildRun extras) and
// `props`. deck: a boat to stand on (H14's skûtsje). shot(u, t): a camera for
// the first `shotFor` seconds (the whole scene when 0), else the camera
// follows the speaker. big: a card after the talk, over the same set.
export function playCastScene(w, { at, facing = null, lines = [], cast = [], props = [], kicker = '', title = '', big = '', shot = null, shotFor = 0, shotLines = 0, deck = null, lookTo = null, poses = null, update = null, solo = false } = {}) {
  if (run) return false;
  const anchor = deck ? { x: deck.x, y: deck.y } : freeSpot(w, at.x, at.y);
  // someone in the water (Jelle after his failed fierljep): the nearest wet spot
  const wet = cast.find((e) => e && e.water);
  let spots = cast;
  if (wet) {
    const ws = waterSpot(w, anchor);
    if (ws) { lookTo = ws; spots = cast.map((e) => (e === wet ? { ...e, xy: ws, h: SWIM_H, bob: true } : e)); }
  }
  const face = deck ? deck.angle : facing != null ? facing : facingTowards(w, anchor, lookTo);
  const r = buildRun(w, { anchor, facing: face, h: deck ? SKUTSJE_DECK : 0, extras: spots, props });
  if (!r) return false;
  // solo: Anita on her own (H16, the chase in H18), Tammo is elsewhere
  if (solo) r.tammo.visible = false;
  const tl = timeline(lines, null, 0.6);
  if (shotLines && tl.lines[shotLines - 1]) shotFor = tl.lines[shotLines - 1].at + tl.lines[shotLines - 1].dur;
  // a parked prop the cast gets on (mount), or one that comes by (cue): it moves on the first line that looks at it
  for (const p of r.props) {
    if (!p.mount && !p.cue) continue;
    const l = tl.lines.find((q) => q.look === p.kind);
    p.at0 = l ? l.at - (p.mount ? 0.2 : 1.4) : Infinity;
  }
  const cams = camsFor(r);
  const plan = tl.lines.map((l, i) => {
    const base = camFor(r, cams, l.who, i === 0 && tl.lines.length > 1 && !cast.length, false, 'none', null, l.text);
    return { from: i === 0 ? 0 : l.at - 0.06, to: l.at + l.dur + 0.06, fn: l.look ? (u) => cams.prop(l.look, u) || base(u) : base };
  });
  if (plan.length) plan[plan.length - 1].to = tl.total;
  const keep = !!big;
  const ok = runScene(r, tl, {
    id: 'mission-scene', kicker, title, cardFor: 2.5, keep, update,
    poses: poses || ((t, cur) => (cur && cur.clue ? { [cur.who]: 'point' } : {})),
    camera: (t) => {
      if (shot && (!shotFor || t < shotFor)) return shot(clamp01(t / (shotFor || tl.total)), t);
      const seg = plan.find((p) => t < p.to) || plan[plan.length - 1];
      return seg ? seg.fn(clamp01((t - seg.from) / Math.max(0.1, seg.to - seg.from))) : cams.two(0);
    },
  });
  if (ok && big) {
    let t0 = 0;
    const queued = playCinematic({
      id: 'mission-scene', priority: 3, duration: 3.6, pause: true, letterbox: true, skippable: true, hideHud: true, big, queue: true,
      shot: (u, t) => {
        const dt = Math.max(0, Math.min(0.1, t - t0));
        t0 = t;
        animate(r, 20 + t, dt, null, poses ? poses(20 + t, null) : {});
        return cams.group(u);
      },
      onStart: () => { w.cinematicHidePlayers = true; w.cinematicHideNav = true; },
      onEnd: () => cleanupRun(r),
    });
    if (!queued) cleanupRun(r);
  }
  return ok;
}

function waterSpot(w, from) {
  for (let d = 2; d <= 14; d += 1) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = from.x + Math.cos(a) * d, y = from.y + Math.sin(a) * d;
      if (isInWater(w.map, x, y) && isInWater(w.map, x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5)) return { x: x + Math.cos(a) * 0.8, y: y + Math.sin(a) * 0.8 };
    }
  }
  return null;
}

const LIVE_SPOT = { x: 741, y: 418 };

// Jelle's livestream after the museum break-in (a story contact, storycontact.js):
// he films himself in front of his trekker-limo, the twins behind him, and
// shows off a golden ball. Filmed as a phone selfie, inside the LIVE frame.
export function playLivestream(w, { lines = [], handle = 'JelleWâld', viewers = 1953, onDone = null } = {}) {
  if (run) return false;
  // filmed on the Oosterhaven quay, where his skûtsje lies (seen again in H14)
  const anchor = freeSpot(w, LIVE_SPOT.x, LIVE_SPOT.y);
  const facing = chooseFacing(w, anchor.x, anchor.y, Math.PI / 2);
  const r = buildRun(w, {
    anchor, facing, noPair: true,
    extras: [{ key: 'jelle', at: [1.4, 0] }, { key: 'durk', at: [3.1, 1.3], pose: 'arms' }, { key: 'douwe', at: [3.2, -1.3], pose: 'arms' }],
    props: [{ kind: 'limo', at: [6.5, 0], turn: 0.15 }, { kind: 'ball', holder: 'jelle', from: 'Jimme sykje' }],
  });
  if (!r) return false;
  const J = r.extras[0];
  const tl = timeline(lines, NPC.jelle, 0.8);
  // the selfie camera: an arm's length in front of Jelle, a little high
  const ux = r.mid.x - J.pos.x, uy = r.mid.y - J.pos.y, d = Math.hypot(ux, uy) || 1;
  const cx = J.pos.x + ux / d * 2.0, cy = J.pos.y + uy / d * 2.0;
  return runScene(r, tl, {
    id: 'story-live', cardFor: 0, live: { handle, viewers },
    poses: (t, cur) => {
      return {
        jelle: cur && cur.clue ? 'hold' : undefined,
        durk: cur && cur.who === 'durk' ? 'shrug' : undefined,
        douwe: cur && /Swaai/.test(cur.text) ? 'wave' : undefined,
      };
    },
    camera: (t, cur) => {
      const other = cur && (cur.who === 'durk' || cur.who === 'douwe') ? r.extras.find((e) => e.key === cur.who) : null;
      const look = other ? P(lerp(J.pos.x, other.pos.x, 0.6), lerp(J.pos.y, other.pos.y, 0.6), 1.75) : P(J.pos.x, J.pos.y, 1.62);
      return pose(camClear(w, P(cx, cy, 1.85)), look, other ? 58 : 50);
    },
    onDone,
  });
}

// The road points from `len` metres back along a road polyline up to its
// closest point to (x, y).
function roadRunIn(road, x, y, len) {
  const pts = road.pts;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
    const L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
    const k = clamp01(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L2);
    const dd = (ax + (bx - ax) * k - x) ** 2 + (ay + (by - ay) * k - y) ** 2;
    if (dd < bd) { bd = dd; bi = i; }
  }
  const walk = (dir) => {
    const out = [{ x, y }];
    let left = len, i = dir < 0 ? bi : bi + 1;
    let px = x, py = y;
    while (left > 0 && i >= 0 && i < pts.length) {
      const qx = pts[i][0], qy = pts[i][1], seg = Math.hypot(qx - px, qy - py);
      if (seg >= left) { out.push({ x: px + (qx - px) * left / seg, y: py + (qy - py) * left / seg }); left = 0; break; }
      out.push({ x: qx, y: qy });
      left -= seg; px = qx; py = qy; i += dir;
    }
    return { out, left };
  };
  const a = walk(-1), b = walk(1);
  return (a.left <= b.left ? a.out : b.out).reverse();
}

function alongPath(path, s) {
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + seg >= s || i === path.length - 2) {
      const k = seg ? clamp01((s - acc) / seg) : 1;
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), a: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    acc += seg;
  }
  const e = path[path.length - 1];
  return { x: e.x, y: e.y, a: 0 };
}

export const LIMO_LINES = [
  ['T', 'Wacht. Wat rijdt daar het museumterrein op?'],
  ['durk', 'Hier is het, Douwe. De achterdeur.', { clue: true }],
  ['douwe', 'En de baas?'],
  ['durk', 'De baas blijft zitten. De baas blijft altijd zitten.'],
  ['T', 'Een trekker met een limousine erachter. Wie doet nou zoiets?'],
];

// H4, before the outro: through the pigeon's eyes, Jelle's black trekker-limo
// rolls up to the museum's back door and the twins climb out.
function playLimoReveal(w, done) {
  const lm = (w.map.meta.landmarks || []).find((l) => l.name === 'Groninger Museum');
  if (!lm) return false;
  const rear = { x: lm.x - 22, y: lm.y - 40 };
  const rp = w.map.nearestRoadPoint(rear.x, rear.y, 160, true);
  if (!rp || !rp.road) return false;
  const path = roadRunIn(rp.road, rp.x, rp.y, 36);
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
  if (total < 12) return false;
  const end = alongPath(path, total);
  // the doors (and the pigeon on the museum roof) on the museum side of the road
  const toM = (-Math.sin(end.a)) * (lm.x - end.x) + Math.cos(end.a) * (lm.y - end.y);
  const doorA = end.a + (toM >= 0 ? Math.PI / 2 : -Math.PI / 2);
  const r = buildRun(w, { anchor: { x: end.x, y: end.y }, facing: doorA, noPair: true, extras: [{ key: 'durk', at: [2.4, 0.8], face: doorA }, { key: 'douwe', at: [2.5, -0.8], face: doorA - 0.4 }] });
  if (!r) return false;
  const limo = limoMesh();
  r.group.add(limo);
  const DRIVE = 4.6;
  const tl = timeline(LIMO_LINES, null, 0.9);
  // the twins wait inside until the car stops, then climb out on the near side
  const shift = Math.max(0, DRIVE + 0.6 - tl.lines[1].at);
  for (const l of tl.lines.slice(1)) l.at += shift;
  tl.total += shift;
  for (const e of r.extras) e.mesh.visible = false;
  const side = r.f;
  const perch = camClear(w, P(end.x + side.x * 8 - Math.cos(end.a) * 4, end.y + side.y * 8 - Math.sin(end.a) * 4, 9.5));
  const ground = alongPath(path, total * 0.45);
  let prev = 0;
  return runScene(r, tl, {
    id: 'mission-outro', kicker: 'Groninger Museum, achteringang', title: 'Een zwarte trekker-limo', cardFor: 2.8,
    update: (t, dt) => {
      const k = smooth(Math.min(1, t / DRIVE));
      const s = total * k;
      const q = alongPath(path, s);
      limo.position.set(q.x, 0, q.y);
      limo.rotation.y = -q.a;
      const speed = (s - prev) / Math.max(dt, 1e-3);
      prev = s;
      updateVehicleWheelSpin(limo, t < DRIVE ? speed : 0, dt);
      const out = t - DRIVE - 0.2;
      r.extras.forEach((e, n) => {
        if (out < n * 0.5) return;
        const k2 = smooth(Math.min(1, (out - n * 0.5) / 1.2));
        e.mesh.visible = true;
        const bx = end.x + side.x * 1.1 + Math.cos(end.a) * (n ? -0.9 : 0.9), by = end.y + side.y * 1.1 + Math.sin(end.a) * (n ? -0.9 : 0.9);
        standActor(e.mesh, lerp(bx, e.pos.x, k2), lerp(by, e.pos.y, k2), e.a, 0);
        e.pos0 = e.pos;
      });
    },
    poses: (t, cur) => ({ durk: cur && cur.clue ? 'point' : 'look', douwe: 'look' }),
    camera: (t, cur) => {
      const q = { x: limo.position.x, y: limo.position.z };
      if (t < DRIVE * 0.55) {
        // low by the kerb as the limo rolls past
        const g = camClear(w, P(ground.x + side.x * 5.5, ground.y + side.y * 5.5, 0.8));
        return pose(g, P(q.x, q.y, 1.2), 44);
      }
      // the pigeon on the roof: a bobbing head, looking down
      const bob = Math.sin(t * 6.5) * 0.06;
      const look = t > DRIVE + 0.4 ? P(end.x + side.x * 1.8, end.y + side.y * 1.8, 1.3) : P(q.x, q.y, 1);
      return pose(P(perch.x, perch.y, perch.z + bob), look, t > DRIVE + 1 ? 30 : 38);
    },
    onDone: () => done(),
  });
}

// --- H18: the pigeons over the Ontzet fireworks -----------------------------------

const FW_TINTS = [[1, 0.35, 0.3], [1, 0.85, 0.3], [0.4, 0.8, 1], [0.6, 1, 0.5], [1, 0.5, 0.9]];

function fireworkBurst(w, x, y, z) {
  const [r0, g0, b0] = FW_TINTS[Math.floor(Math.random() * FW_TINTS.length)];
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2, up = (Math.random() - 0.3) * 6;
    spawnFxPuff(x, z, y, Math.cos(a) * 7, up, Math.sin(a) * 7, 0.9, 0.35, 1.2, r0, g0, b0, 0.95, 1.8, -0.4);
    spawnFxSpark(x, z, y, Math.cos(a) * 10, up + 2, Math.sin(a) * 10, 0.8);
  }
  (w.audioEvents || (w.audioEvents = [])).push({ kind: 'weapon', sub: 'burst', x, y });
}

// Tammo whistles at the stall, the pigeons lift off d'Olle Grieze, fly through
// the Ontzet fireworks over the Grote Markt and land on the trekker-limo's
// windscreen (D-definitief H18). limo: the fleeing vehicle; stall: { x, y }.
export function playPigeonSwarm(w, { limo, stall, lines = [], kicker = '', onDone = null } = {}) {
  if (run || !limo || !stall) return false;
  const lm = (w.map.meta.landmarks || []).find((l) => l.name === 'Martinitoren');
  const tower = lm ? { x: lm.x, y: lm.y } : { x: stall.x - 40, y: stall.y - 40 };
  // a ledge on the stall side of the tower, not inside it
  const tw = Math.atan2(stall.y - tower.y, stall.x - tower.x);
  const perch = { x: tower.x + Math.cos(tw) * 7, y: tower.y + Math.sin(tw) * 7 };
  const toLimo = Math.atan2(limo.y - stall.y, limo.x - stall.x);
  const face = chooseFacing(w, stall.x, stall.y, Math.atan2(tower.y - stall.y, tower.x - stall.x));
  const r = buildRun(w, { anchor: stall, facing: face, noPair: true });
  if (!r) return false;
  r.tammo.visible = true;
  standActor(r.tammo, stall.x, stall.y, face);
  const flock = makeBirds(r.group, perch.x, perch.y, 3, 80);
  const tl = timeline(lines, null, 0.6);
  const L = tl.lines;
  // the flight: off the tower top, a dip through the bursts over the square, onto the glass
  const fwd = { x: Math.cos(limo.angle), y: Math.sin(limo.angle) };
  const glass = { x: limo.x + fwd.x * 1.4, y: limo.y + fwd.y * 1.4 };
  const over = { x: (tower.x + stall.x) / 2, y: (tower.y + stall.y) / 2 };
  const leave = L[0] ? L[0].at + L[0].dur * 0.6 : 1.5;
  const land = L[2] ? L[2].at - 0.2 : leave + 4;
  const flightAt = (u) => {
    // two legs: the ledge (55 m) -> over the square (28 m) -> the windscreen (1.6 m)
    if (u < 0.5) {
      const k = smooth(u / 0.5);
      return P(lerp(perch.x, over.x, k), lerp(perch.y, over.y, k), lerp(55, 28, k));
    }
    const k = (u - 0.5) / 0.5, e = k * k * (3 - 2 * k);
    return P(lerp(over.x, glass.x, e), lerp(over.y, glass.y, e), lerp(28, 1.6, e * e));
  };
  const offs = flock.list.map(() => ({ a: Math.random() * Math.PI * 2, d: Math.sqrt(Math.random()), z: Math.random() - 0.5, ph: Math.random() * 6 }));
  let nextBurst = 0.4, whistled = false;
  return runScene(r, tl, {
    id: 'mission-swarm', kicker: kicker || 'Gronings Ontzet', title: 'Boven het vuurwerk', cardFor: 2.2,
    update: (t, dt) => {
      if (!whistled && t > 0.25) { whistled = true; (w.audioEvents || (w.audioEvents = [])).push({ kind: 'whistle', x: stall.x, y: stall.y }); }
      // the fireworks go up over the square until the birds are through
      if (t < land && (nextBurst -= dt) <= 0) {
        nextBurst = 0.28 + Math.random() * 0.3;
        const a = Math.random() * Math.PI * 2, d = Math.random() * 22;
        fireworkBurst(w, over.x + Math.cos(a) * d, over.y + Math.sin(a) * d, 22 + Math.random() * 14);
      }
      const u = clamp01((t - leave) / Math.max(0.5, land - leave));
      const c = flightAt(u);
      const ahead = flightAt(Math.min(1, u + 0.02));
      const h = Math.atan2(ahead.y - c.y, ahead.x - c.x);
      // a loose cloud in the air, a tight carpet on the bonnet and the glass
      const spread = t < leave ? 2.5 : u < 0.97 ? 5 - u * 2.5 : 1.3;
      flock.list.forEach((p, i) => {
        const o = offs[i];
        const sx = Math.cos(o.a + t * 0.6) * o.d * spread, sy = Math.sin(o.a + t * 0.6) * o.d * spread;
        p.x = c.x + sx; p.y = c.y + sy;
        p.z = Math.max(1.2, c.z + o.z * spread * (u > 0.97 ? 0.3 : 1) + Math.sin(t * 3 + o.ph) * 0.2);
        if (t < leave) p.z = 55 + o.z;
        p.h = u > 0.97 ? o.a : h;
        p.vx = p.vy = p.vz = 0; p.air = 0; p.delay = 0; p.fly = t >= leave - 0.3;
      });
      updateBirds(flock, dt, t);
    },
    poses: (t) => ({ T: t < leave + 0.5 ? 'wave' : 'point' }),
    camera: (t, cur) => {
      const who = cur ? cur.who : null;
      if (t < leave + 0.4 || who === 'T') {
        // low past Tammo at the stall, d'Olle Grieze and the bursts behind him
        const back = { x: stall.x - Math.cos(face) * 4.5 + Math.cos(face + 1.4) * 1.2, y: stall.y - Math.sin(face) * 4.5 + Math.sin(face + 1.4) * 1.2 };
        return pose(camClear(w, P(back.x, back.y, 1.3)), P(tower.x, tower.y, 30), 52);
      }
      const u = clamp01((t - leave) / Math.max(0.5, land - leave));
      if (t < land + 0.3) {
        // alongside the flock through the fireworks
        const c = flightAt(u), n = flightAt(Math.min(1, u + 0.06));
        const h = Math.atan2(n.y - c.y, n.x - c.x);
        const side = { x: -Math.sin(h) * 9, y: Math.cos(h) * 9 };
        return pose(camClear(w, P(c.x - Math.cos(h) * 7 + side.x, c.y - Math.sin(h) * 7 + side.y, c.z + 3)), P(c.x, c.y, c.z), 50);
      }
      if (who === 'A') {
        // from behind Anita's car: a trekker-limo covered in pigeons
        const pv = w.player.inVehicle || w.player;
        return pose(camClear(w, P(pv.x - Math.cos(toLimo) * 2, pv.y - Math.sin(toLimo) * 2, 2.4)), P(limo.x, limo.y, 1.2), 46);
      }
      // the windscreen, from the front: nothing but pigeons
      return pose(camClear(w, P(limo.x + fwd.x * 5.5 + fwd.y * 1.5, limo.y + fwd.y * 5.5 - fwd.x * 1.5, 1.6)), P(glass.x, glass.y, 1.4), 40);
    },
    onDone: (skipped) => {
      flock.body.dispose(); flock.wings.dispose();
      if (onDone) onDone(skipped);
    },
  });
}

// --- H5: the all-green crossing -------------------------------------------------

let bikeN = 0;
function cineBike(color, rider) {
  const g = buildVehicleMesh({ id: 'cine-bike-' + (bikeN++ % 4), isBike: true, model: { name: 'bike', color, rider, len: 1.8, wid: 0.6 } });
  for (const c of g.children) if (c.userData && c.userData.pelvis) c.visible = false;
  g.rotation.order = 'YXZ';
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function rideBike(bike, m, x, y, a, t, dt, speed, lean = 0) {
  const c = Math.cos(a), s = Math.sin(a);
  bike.position.set(x, 0, y);
  bike.rotation.set(lean, -a, 0);
  updateVehicleWheelSpin(bike, speed, dt);
  m.visible = true;
  m.position.set(x - c * 0.3, seatedY(m, 1.0), y - s * 0.3);
  m.rotation.order = 'YXZ';
  m.rotation.set(lean, -a, 0);
  m.userData.faceA = a;
  seatPose(m, { recline: speed > 0.5 ? -0.2 : -0.05, footX: 0.5, footY: -0.42, pedal: speed > 0.5, arms: 'wheel' }, t * Math.min(1.6, speed * 0.3 + 0.4));
}

// Clear ground (no wall, water or car) from (x, y) along angle a, in metres.
function clearRun(w, x, y, a, len) {
  for (let d = 2; d <= len; d += 1.5) {
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (blocked(w, px, py) || carAt(w, px, py, 1.2)) return d - 1.5;
  }
  return len;
}

// The KEI race's all-green crossing (D-definitief H5): Tammo rides in, Anita
// comes from the other side on her own bike, they look at each other and
// both brake. No words. at/heading: where the player is and which way he rides.
export function playEyeContact(w, { at, heading, onDone = null } = {}) {
  if (run || !at) return false;
  const a = Number.isFinite(heading) ? heading : 0;
  // she comes in across his path from the clearer side, else head-on
  const sides = [a + Math.PI / 2, a - Math.PI / 2, a];
  const runs = sides.map((b) => clearRun(w, at.x, at.y, b, 16));
  let k = runs[0] >= runs[1] ? 0 : 1;
  if (runs[k] < 8 && runs[2] > runs[k]) k = 2;
  const from = sides[k];
  const herA = from + Math.PI;
  const back = Math.max(6, clearRun(w, at.x, at.y, a + Math.PI, 14));
  const herLen = Math.max(6, runs[k]);
  const r = buildRun(w, { anchor: at, facing: a, noPair: true });
  if (!r) return false;
  const tammo = makeActor(TAMMO_APPEARANCE), anita = makeActor(ANITA_APPEARANCE);
  const bT = cineBike('#2f4f6f', 0x3f6ea8), bA = cineBike('#7a2a24', 0x9e3027);
  r.group.add(tammo, anita, bT, bA);
  r.extras.push({ key: 'T', mesh: tammo, riding: true }, { key: 'A', mesh: anita, riding: true });
  // Tammo stops just short of the crossing, Anita in it, both facing in
  const tEnd = { x: at.x - Math.cos(a) * 1.6, y: at.y - Math.sin(a) * 1.6 };
  const aEnd = { x: at.x + Math.cos(from) * 2.6, y: at.y + Math.sin(from) * 2.6 };
  const tStart = { x: tEnd.x - Math.cos(a) * back, y: tEnd.y - Math.sin(a) * back };
  const aStart = { x: at.x + Math.cos(from) * herLen, y: at.y + Math.sin(from) * herLen };
  const RIDE = 2.6, BRAKE = 0.7, TOTAL = 7.2;
  // steady speed, then a short braking ease into the stop
  const posAt = (p0, p1, t) => {
    const u = t < RIDE ? (t / RIDE) * 0.86 : 0.86 + 0.14 * smooth((t - RIDE) / BRAKE);
    const v = Math.hypot(p1.x - p0.x, p1.y - p0.y) * 0.86 / RIDE;
    return { x: lerp(p0.x, p1.x, u), y: lerp(p0.y, p1.y, u), speed: t < RIDE ? v : t < RIDE + BRAKE ? v * 0.4 * (1 - (t - RIDE) / BRAKE) : 0 };
  };
  const tl = { lines: [], total: TOTAL };
  let braked = false;
  const mid = { x: (tEnd.x + aEnd.x) / 2, y: (tEnd.y + aEnd.y) / 2 };
  const high = camClear(w, P(at.x - Math.cos(a) * 9 + Math.cos(from) * 7, at.y - Math.sin(a) * 9 + Math.sin(from) * 7, 7.5));
  const low = camClear(w, P(at.x - Math.cos(from) * 4 - Math.cos(a) * 3, at.y - Math.sin(from) * 4 - Math.sin(a) * 3, 0.9));
  const dTA = Math.atan2(aEnd.y - tEnd.y, aEnd.x - tEnd.x);
  const over = (q, d, z) => camClear(w, P(q.x - Math.cos(d) * 1.5 - Math.sin(d) * 0.5, q.y - Math.sin(d) * 1.5 + Math.cos(d) * 0.5, z));
  const look = (m, ma, tx, ty, k) => {
    const d = Math.atan2(ty - m.position.z, tx - m.position.x) - ma;
    m.userData.head.rotation.y = -Math.max(-1.1, Math.min(1.1, Math.atan2(Math.sin(d), Math.cos(d)))) * k;
  };
  return runScene(r, tl, {
    id: 'mission-scene', kicker: 'KEI-week · alles groen', title: 'Oogcontact', cardFor: 2.4,
    update: (t, dt) => {
      const qt = posAt(tStart, tEnd, t), qa = posAt(aStart, aEnd, t);
      const dip = t > RIDE && t < RIDE + BRAKE ? Math.sin((t - RIDE) / BRAKE * Math.PI) * 0.06 : 0;
      rideBike(bT, tammo, qt.x, qt.y, a, t, dt, qt.speed, dip);
      rideBike(bA, anita, qa.x, qa.y, herA, t, dt, qa.speed, -dip);
      if (t > RIDE && !braked) { braked = true; playClueSting(); }
      // from just before the brake they only look at each other
      if (t > RIDE - 0.4) {
        const k = smooth((t - RIDE + 0.4) / 0.8);
        look(tammo, a, anita.position.x, anita.position.z, k);
        look(anita, herA, tammo.position.x, tammo.position.z, k);
        if (t > 5.2) anita.userData.head.rotation.z += 0.08;
      }
    },
    camera: (t) => {
      if (t < 1.9) return pose(high, P(lerp(at.x, mid.x, t / 1.9), lerp(at.y, mid.y, t / 1.9), 0.8), 50);
      if (t < RIDE + BRAKE + 0.3) return pose(low, P(anita.position.x, anita.position.z, 1.2), 42);
      // over his shoulder at her, then over hers at him, then the two of them
      if (t < 5.1) return pose(over(tEnd, dTA, 1.75), P(aEnd.x, aEnd.y, 1.55), 32);
      if (t < 6.3) return pose(over(aEnd, dTA + Math.PI, 1.7), P(tEnd.x, tEnd.y, 1.6), 30);
      return pose(camClear(w, P(mid.x - Math.sin(dTA) * 6, mid.y + Math.cos(dTA) * 6, 2.2)), P(mid.x, mid.y, 1.0), 44);
    },
    onDone: (skipped) => { if (onDone) onDone(skipped); },
  });
}

// A finished mission's intro and outro as plain lines, for Sikkom TV in the
// flat (furniture.js): { speaker, text, src (voice URL or null), dur }.
export function storyReplayLines(i) {
  const s = STORY[i];
  if (!s) return [];
  const npc = NPC[s.npc], outNpc = NPC[s.outroNpcKey || s.npc];
  const n = (s.intro || []).length;
  return [...(s.intro || []), ...(s.outro || [])].map(([who, text], k) => {
    const speaker = speakerName(who, k < n ? npc : outNpc);
    const v = voiceFor(speaker, text);
    return { speaker, text, src: v ? VOICE_DIR + v.src : null, dur: v ? v.dur : 0 };
  });
}
