import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { HABBO_PALETTE } from './pixelart3d.js';
import { playCinematic, roofAt, showBanner } from './cinematics.js';
import { isInWater } from './util.js';
import { spawnFxPuff } from './fx3d.js';
import { playStoryVoice, stopStoryVoice, setStoryScene } from './audio.js';
import { storyLineVoice } from './linevoice.js';

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
const NPC = {
  berend: { name: 'Bommen Berend', shirt: 0x4a5a3a, skin: SKIN.woodLight, variant: 'male', seed: 393 },
  jelmer: { name: 'Jelmer', shirt: 0xe2b93b, skin: SKIN.woodMid, variant: 'male', seed: 164 },
  sjoerd: { name: 'Sjoerd', shirt: 0x2e7d4f, skin: SKIN.woodLight, variant: 'male', seed: 1507 },
  femke: { name: 'Femke', shirt: 0x7a3f8f, skin: SKIN.woodLight, variant: 'female', seed: 198, hairStyle: 'curly' },
  harm: { name: 'Harm', shirt: 0xe07b1f, skin: SKIN.woodMid, variant: 'male', seed: 137 },
  geert: { name: 'Geert', shirt: 0xe8e3d6, skin: SKIN.woodLight, variant: 'male', seed: 1523 },
  trijntje: { name: 'Oma Trijntje', shirt: 0x5c6f8a, skin: SKIN.woodLight, variant: 'female', seed: 195, hairStyle: 'bun' },
  klaas: { name: 'Kapitein Klaas', shirt: 0x1f2f4a, skin: SKIN.woodDark, variant: 'male', seed: 1659 },
  sjabbe: { name: 'Sjabbe', shirt: 0x6b5a2e, skin: SKIN.woodMid, variant: 'male', seed: 811 },
  bert: { name: 'Duivenmelker Bert', shirt: 0x56709e, skin: SKIN.woodLight, variant: 'male', seed: 2203 },
  jelle: { name: 'Jelle Terpstra', shirt: 0x2553a6, skin: SKIN.woodLight, variant: 'male', seed: 1953 },
  durk: { name: 'Durk', shirt: 0xc8102e, skin: SKIN.woodLight, variant: 'male', seed: 777 },
  douwe: { name: 'Douwe', shirt: 0xc8102e, skin: SKIN.woodLight, variant: 'male', seed: 777 },
  dijkstra: { name: 'Dokter Dijkstra', shirt: 0xe8641c, skin: SKIN.woodLight, variant: 'male', seed: 77 },
};

// Display name for a story speaker key (T, A, V or an NPC key); missions.js
// uses it for its stage scenes, so voices are looked up under the right name.
export function storySpeakerName(key) {
  if (key === 'T') return 'Tammo';
  if (key === 'A') return 'Anita';
  if (key === 'V') return 'Verteller';
  return NPC[key] ? NPC[key].name : key;
}

// N = the mission's NPC, T = Tammo, A = Anita, V = the narrator (Verteller,
// wide shots), any other NPC key (e.g. 'durk') = that character speaking off
// camera. `ask` is the NPC line kept
// for the short replay version.
const STORY = [
  {
    npc: 'berend', outroPose: 'hips', ask: 6,
    intro: [
      ['V', 'Grunn. Tweehonderdduizend mensen, driehonderdduizend fietsen en één toren die alles ziet.'],
      ['V', 'In het Groninger Museum staat sinds 1953 het stadsjuweel: de Gouden Eierbal. Achttien karaat. Onbetaalbaar.'],
      ['T', 'Ik heb nog nooit een eierbal gezien die ik niet kon betalen.'],
      ['A', 'Jij hebt nog nooit iets kunnen betalen, Tammo.'],
      ['V', 'En hier, bij het Martinikerkhof, begint het. Met een bakkie, een norse man en twee mensen zonder cent.'],
      ['N', 'Zo. Jullie zijn dat stel waar heel Grunn over kletst? Ik had er meer van verwacht.'],
      ['N', 'Mien bakkie staat hier. Naar het Boterdiep ermee, en geen kras. Ik tel ze.'],
      ['A', 'Ik rij.'],
      ['T', 'Jij rijdt als een fietser met een deadline.'],
      ['A', 'En jij als een fietser zonder fiets. Sleutels, Berend.'],
      ['N', 'Vóór mijn koffie koud is. En hij daar blijft van de radio af.'],
      ['T', 'Ik blijf overal van af.'],
      ['A', 'Dat is nou precies je probleem, Tammo.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Hij staat er nog. Geen kras. Ik weet even niet wat ik moet zeggen.'],
      ['A', 'Probeer eens: dank je, Berend.'],
      ['N', '…Dank je. Niet tegen de buren zeggen. Ik heb al sinds 1672 een reputatie.'],
      ['N', 'Er wou hier trouwens al een Fries m\'n bakkie kopen. Contant, uit een klomp.'],
      ['T', 'Wij zeggen nooit wat. Tegen elkaar al helemaal niet.'],
    ],
    fail: [['A', 'Dit vertellen we Berend dus niet.'], ['T', 'Welke Berend? Welk bakkie?']],
  },
  {
    npc: 'jelmer', outroPose: 'cheer', ask: 0,
    intro: [
      ['N', 'Moi moi chat! Sikkom zegt dat de Grote Markt dood is. Tijd om dat recht te zetten!'],
      ['N', 'Jullie doen mee, toch? Content, jongens. Content!'],
      ['T', 'Ik ben geen content. Ik ben Tammo.'],
      ['A', 'Spreek voor jezelf. Ik ben heel veel content.'],
      ['T', 'Na Berends bakkie wilde ik eigenlijk een eierbal op de bank.'],
      ['A', 'Die eierbal moet je eerst verdienen. Hup.'],
      ['N', 'Chat, zeg allemaal moi tegen Tammo!'],
      ['T', 'Nee.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Tienduizend kijkers! De Martinitoren is trending!'],
      ['T', 'Zeg tegen de chat dat ik niet op de foto wil.'],
      ['A', 'Te laat. Je pet heeft al meer volgers dan jij.'],
      ['N', 'Wacht, wie is "JelleWâld"? "Moai stedsje. Foar in wykein." Wat is dat voor taal?'],
      ['A', 'Fries. Die zie je hier vaker dan je denkt.'],
      ['T', 'De pet blijft.'],
    ],
    fail: [['A', 'Saai. Zelfs de duiven gaan weg.'], ['T', 'Die zijn gewoon naar de Vismarkt.']],
  },
  {
    npc: 'sjoerd', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'KEI-week, man! De eerstejaars zeggen dat niemand hun rondje door de stad sneller rijdt.'],
      ['N', 'Rondje vanaf het Academiegebouw. Winnaar krijgt eeuwige roem. En een bierviltje.'],
      ['A', 'Tammo heeft hier nog gestudeerd. Twee weken.'],
      ['T', 'Drie. De derde was ik ziek.'],
      ['A', 'Van het studeren?'],
      ['T', 'Van de mensa.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Record! Jullie komen op het bierviltje! Achterkant, maar toch.'],
      ['N', 'Tweede werd "Snits Snel". Gesponsord door Us Mem Snacks. Nooit van gehoord.'],
      ['A', 'Niet slecht voor drie weken studie.'],
      ['T', 'Ik heb veel geleerd, toen.'],
      ['A', 'Zoals?'],
      ['T', 'Dat ik bij jou in de buurt moet blijven.'],
    ],
    fail: [['T', 'Eerstejaars. Die hebben nog energie.'], ['A', 'En ouders die de huur betalen.']],
  },
  {
    npc: 'femke', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'Gelukkig, jullie zijn er! Het hele decor ligt nog hier in de auto.'],
      ['N', 'Zo begint het in het Noorderplantsoen. Zonder decor is het gewoon picknicken.'],
      ['T', 'Wij hebben geen rijbewijs voor theater.'],
      ['A', 'Hij bedoelt: komt goed. Hij wordt altijd een beetje nerveus van kunst.'],
      ['T', 'Ik ben niet nerveus. Ik ben… aandachtig.'],
      ['N', 'Rijden! Het publiek zit al op z\'n meegebrachte kussentje!'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Het decor staat! Komen jullie vanavond kijken? Het is een stuk over wind.'],
      ['N', 'O, en vanochtend bij de groothandel: twee reuzen op één fatbike. Ze kochten al het frituurvet op. Alles.'],
      ['A', 'Al het vet? Wie heeft er nou zoveel vet nodig?'],
      ['N', 'Ze hadden een tankwagen. "Us Mem Vet" stond erop.'],
      ['A', 'Tammo houdt niet van theater.'],
      ['T', 'Wel als jij naast me zit.'],
      ['A', '…Zei je dat nou hardop?'],
      ['T', 'Nee. Dat was de wind.'],
    ],
    fail: [['A', 'Dan wordt het moderne dans.'], ['T', 'Zonder decor. Daar krijg je hier subsidie voor.']],
  },
  {
    npc: 'harm', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'Twintig jaar heb ik aan die ringweg gewerkt. Mijn kleinzoon denkt dat ik een pion ben.'],
      ['N', 'Eén rondje om de stad, vol gas. Als de weg het houdt, mag ik eindelijk met pensioen.'],
      ['A', 'Een rondje? Is dat alles?'],
      ['T', 'Bij het Noorderplantsoen trok jij me nog net voor die bus weg.'],
      ['A', 'Anders was je nu een bushaltebordje. Gordel om.'],
      ['T', 'Ik had hem heus wel gezien. Ik liet hem gewoon voorgaan.'],
      ['N', 'Eén ding nog: die zwarte trekker op de grid. Dat is een Fries. Hij heeft zich ingeschreven als sponsor.'],
      ['jelle', 'Moai, Grinzers! Wat Grunn kin, kin Fryslân better. Ek hurdriden.'],
      ['A', 'Hij rijdt in een trekker, Tammo. Als hij wint, verhuizen we.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Hij ligt er nog! Ik ga met pensioen! Eindelijk mag ik er zelf overheen!'],
      ['T', 'Die laatste bocht was spannend.'],
      ['A', 'Je pakte mijn hand.'],
      ['T', 'Voor de grip.'],
      ['A', 'Natuurlijk, Tammo. Voor de grip.'],
      ['T', 'Hij reed in een tréker. En hij haalde me bijna in.'],
      ['A', 'Hij haalde je in, Tammo. Twee keer. Maar jij stond op het podium.'],
    ],
    fail: [['T', 'De weg is klaar. Wij nog niet.'], ['A', 'Nog een rondje. Ik let op de pionnen.']],
  },
  {
    npc: 'geert', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Vier kroegen, één avond, alles te voet. Wie het haalt, komt bij mij aan de muur.'],
      ['N', 'En Anita: mijn nieuwe barman wil heel graag je nummer.'],
      ['T', 'Die barman heeft het druk.'],
      ['A', 'O ja? Sinds wanneer bepaal jij dat?'],
      ['T', 'Sinds nu. En we lopen, hè. Niemand rijdt vanavond.'],
      ['A', 'Jaloers én verantwoordelijk. Wat heb je met Tammo gedaan?'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Alle vier! Morgen hangen jullie aan de muur. Naast de wc, maar toch.'],
      ['A', 'Die barman was best leuk.'],
      ['T', 'Hij had een snor.'],
      ['A', 'Ik hou niet van snorren. Ik hou van petten.'],
      ['T', '…Goed om te weten. Eierbal?'],
      ['N', 'Trouwens: die grote aan de bar zingt al een uur Friese liedjes. Die van de tweeling.'],
      ['durk', 'Us baas… is slim. De bal… de bal leit op it skûtsje. Hik. Net fertelle, hè?'],
      ['A', 'Het skûtsje. Tammo, de Eierbal ligt op een boot.'],
      ['T', 'Ik vertel het niemand. Behalve jou.'],
    ],
    fail: [['A', 'Drie kroegen is ook een tocht.'], ['T', 'Een tochtje. Morgen de rest.']],
  },
  {
    npc: 'trijntje', outroPose: 'hips', ask: 1,
    intro: [
      ['N', 'Die fatbikes! Ze scheuren over het fietspad alsof heel Grunn van hen is.'],
      ['N', 'Loop jij daar heelhuids overheen, dan laat ik de gemeente een filmpje zien.'],
      ['A', 'Ik loop wel.'],
      ['T', 'Nee, ik loop. Jij hebt al eens een bus voor me tegengehouden.'],
      ['A', 'Dat was een bus, Tammo. Dit zijn pubers op dikke banden.'],
      ['T', 'Juist daarom.'],
      ['N', 'Ach, wat een lieverd. Hou dij goud, jong.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Heelhuids! Dat filmpje gaat naar de gemeenteraad. En naar mijn bridgeclub.'],
      ['A', 'Je had kunnen vallen, sukkel.'],
      ['T', 'Maar ik viel niet.'],
      ['A', 'Nooit meer zonder mij.'],
      ['T', 'Afgesproken. Voortaan vallen we samen.'],
      ['N', 'En nog iets, nu jullie toch zo dapper zijn. In 1953 stond ik model voor die Gouden Eierbal. Die handjes eromheen: die zijn van mij.'],
      ['N', 'Die bal is gien geld, jong. Die bal is Grunn. En Grunn geeft nooit op.'],
      ['A', 'Dan hebben we bijna een oma verkocht.'],
      ['T', 'Misschien moeten we hem niet verkopen. Misschien moeten we hem terugbrengen.'],
    ],
    fail: [['T', 'Au. Ik heb nu profiel op mijn rug.'], ['A', 'Kom, ik help je overeind. Weer.']],
  },
  {
    npc: 'klaas', ask: 1,
    intro: [
      ['N', 'Die rondvaartboot is… tijdelijk van niemand. Jullie varen, ik kijk de andere kant op.'],
      ['N', 'Eén rondje over de Diepenring. Doe alsof je gids bent, dan vraagt niemand iets.'],
      ['A', 'Tammo als gids. Dit wil ik zien.'],
      ['T', 'Links ziet u Grunn. Rechts ziet u ook Grunn.'],
      ['A', 'Tijdelijk van niemand. En wie is niemand?'],
      ['N', 'Schipper Wiebe. Die zit tot vieren in de kroeg. Meestal.'],
      ['N', 'Komt hij toch: Wiebe kent elke brug blind. Behalve die bij het museum. Die is nieuw, pas dertig jaar.'],
      ['T', 'Dus als het misgaat, varen we heel hard naar het museum.'],
      ['N', 'En kijk even naar de Oosterhaven. Daar ligt sinds gisteren een Fries skûtsje. Mooi ding. Rare bemanning.'],
    ],
    outroNpc: false,
    kiss: true,
    outro: [
      ['T', 'Weet je nog, Berends bakkie? Toen kreeg ik de sleutels niet eens.'],
      ['A', 'Die krijg je nog steeds niet.'],
      ['T', 'Maar de rest wel?'],
      ['A', 'De rest wel. Wij tweeën tegen Grunn.'],
      ['T', 'Wij tweeën tegen Grunn. En daarna een eierbal.'],
      ['A', '…Of misschien: wij tweeën vóór Grunn.'],
    ],
    fail: [['A', 'Gids zijn is moeilijker dan het lijkt.'], ['T', 'Links water. Rechts ook. Onder ons: fietsen.']],
  },
  // 8: H2 Pinnen met de hele automaat
  {
    npc: 'sjabbe', outroPose: 'hips', ask: 4,
    intro: [
      ['A', 'Daar staat hij. Een auto met een hele pinautomaat achterin.'],
      ['T', 'Die van gisteren? Ik dacht dat we die hadden teruggebracht.'],
      ['A', 'We hebben hem verplaatst, Tammo. Dat is iets anders.'],
      ['T', 'En nu?'],
      ['A', 'Naar Pand & Poen. Sjabbe koopt alles. Echt alles.'],
      ['T', 'Ook een automaat met een alarm erin?'],
      ['A', '…Welk alarm?'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Een pinautomaat. Met verse lak. Die had ik nog niet.'],
      ['N', 'Vierhonderd. Meer is hij niet waard, zonder pasjes.'],
      ['A', 'Vierhonderd? Daar koop je nog geen halve foodtruck van.'],
      ['T', 'Foodtruck?'],
      ['A', 'De Fjord Frituur. Vier wielen, geen kenteken. Mijn droom, Tammo.'],
      ['N', 'Te weinig voor jullie droom. Echt geld ligt in het museum. De Gouden Eierbal, achttien karaat.'],
      ['T', 'Dat is toch gewoon een verhaaltje?'],
      ['A', 'Achttien karaat verhaaltje.'],
    ],
    fail: [['A', 'Die automaat pint nu voor de pliesie.'], ['T', 'Hopelijk rekenen ze niks.']],
  },
  // 9: H4 Duif op verkenning
  {
    npc: 'bert', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Jullie willen het museum bekijken zonder dat iemand jullie ziet? Neem een duif.'],
      ['N', 'Niemand kijkt ooit naar een duif. Alleen als hij op je jas poept.'],
      ['T', 'Hoe word je een duif?'],
      ['N', 'Diep in de ogen kieken. De rest gaat vanzelf.'],
      ['A', 'Drie camera\'s en twee bewakers. Allemaal op de foto, Tammo.'],
      ['T', 'En als ik op een bewaker poep?'],
      ['A', 'Dan heet het afleiding.'],
    ],
    outroNpc: false,
    outro: [
      ['A', 'Drie camera\'s, twee bewakers. En een stroomkast achter de fietsenstalling.'],
      ['T', 'En een zwarte trekker bij de achteringang. Met een limousine erachter geplakt.'],
      ['A', 'Een trekker-limo? In Grunn?'],
      ['T', 'Met vlaggetjes. Met van die rode blaadjes erop.'],
      ['A', 'Dat is geen boer. Dat is een Fries.'],
    ],
    fail: [['T', 'Ik zag alleen maar brood.'], ['A', 'Je was een duif, geen toerist.']],
  },
  // 10: H6 De Museumkraak
  {
    npc: null, ask: 4,
    intro: [
      ['A', 'Het is donker, de camera\'s weten we, de stroomkast weten we.'],
      ['T', 'En ik heb een zaklamp.'],
      ['A', 'Die blijft uit, Tammo.'],
      ['T', 'Waarom neem ik hem dan mee?'],
      ['A', 'Voor de sfeer. Eerst de stroomkast, dan de vitrine. En niemand raakt iets aan.'],
    ],
    outroNpc: false,
    outro: [
      ['A', '"Tige tank." Hij bedankt ons. Hij. Bedankt. Ons.'],
      ['T', 'Ik vind het wel beleefd, eigenlijk.'],
      ['A', 'Tammo.'],
      ['T', 'Dus we zijn inbrekers zonder buit.'],
      ['A', 'Wandelaars. Met een zaklamp.'],
    ],
    fail: [['A', 'Nou zien ze ons wél.'], ['T', 'Ik zei toch: zaklamp aan.']],
  },
  // 11: H8 Vet gekaapt
  {
    npc: 'femke', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'Daar rijdt hij! De tankwagen van Us Mem Vet, vol met al het frituurvet van Grunn.'],
      ['N', 'Zonder vet bakt er straks niemand meer iets in deze stad. Geen patat, geen kroket. Niks.'],
      ['T', 'Geen eierbal?'],
      ['N', 'Geen eierbal.'],
      ['T', 'Dit is persoonlijk.'],
      ['A', 'Banden stuk, tankwagen pakken, naar de Oosterpoort. Daar staat de feesttent met de frituurpannen.'],
      ['T', 'En als hij over de Krolbrug wil?'],
      ['A', 'Dan staat die in storing. Dat is het enige waar je in deze stad op kunt rekenen.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Het vet is terug! De frituurpannen gaan weer aan. Ik ruik het al.'],
      ['A', 'Een tankwagen vol frituurvet. Wat wil die man met al dat vet?'],
      ['T', 'Frituren, schat. Hij is Fries. Hij frituurt.'],
      ['A', 'Hij wil niet frituren. Hij wil dat wíj niet frituren.'],
    ],
    fail: [['T', 'Weg is het vet.'], ['A', 'Dan gaan we het halen. Nog een keer.']],
  },
  // 12: H10 Vlag van d'Olle Grieze
  {
    npc: 'bert', outroPose: 'cheer', ask: 1,
    intro: [
      ['N', 'Hebben jullie hem gezien? Een Friese vlag van dertig meter. Aan onze toren!'],
      ['N', 'Die Fries noemde d\'Olle Grieze "in aardich tuorke". Een áárdig torentje!'],
      ['N', 'Vijf touwen houden hem vast. Een duif met een scherpe snavel pikt ze zo los.'],
      ['T', 'Ik heb een heel scherpe snavel. Als duif.'],
      ['A', 'Pas op voor de meeuwen. Jelle heeft ze meegenomen uit Harlingen.'],
      ['N', 'Fryske meeuwen. Groot, brutaal, en ze verstaan geen Gronings.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Hij ligt op de keien! Heel Grunn staat te klappen.'],
      ['A', 'Heel Grunn stond te klappen voor een duif.'],
      ['T', 'Niet voor een duif. Voor mij, als duif.'],
      ['A', 'Ik klapte ook. Een beetje.'],
      ['N', 'Kon minder, jong.'],
    ],
    fail: [['T', 'Die meeuwen waren groter dan ik.'], ['A', 'Alles is groter dan jij, als duif.']],
  },
  // 13: H14 Skûtsje-kraak
  {
    npc: null, ask: 2,
    intro: [
      ['A', 'Klaas zei het al: een Fries skûtsje in de Oosterhaven. Rare bemanning.'],
      ['T', 'En wij hebben een huurbootje. Met een bel.'],
      ['A', 'Jelle gooit vandaag los. Wij varen erachteraan en springen aan boord.'],
      ['T', 'Springen. Van een boot. Op een andere boot.'],
      ['A', 'Jij stuurt, Tammo. Ik zeg wanneer.'],
      ['T', 'En wie springt er dan?'],
      ['A', 'Wij allebei. Voortaan vallen we samen, weet je nog?'],
    ],
    outroNpc: false,
    outro: [
      ['T', 'Chocola. We hebben een boot gekaapt voor chocola.'],
      ['A', 'Hij was wel lekker.'],
      ['T', 'Heb jij van de bewijslast gegeten?'],
      ['A', 'Eén hapje. En Jelle heeft zijn eigen plan verklapt: een ballon, vanavond.'],
      ['T', 'Wie verklapt er nou zijn eigen plan?'],
      ['A', 'Iemand die denkt dat hij toch wint. Ik ken een dokter met een heli.'],
    ],
    fail: [['T', 'Het skûtsje is weg. Met zeil en al.'], ['A', 'Een zeilboot ontsnapt aan een bootje met een bel. Niet vertellen in de kroeg.']],
  },
  // 14: H15 Traumaduif
  {
    npc: 'dijkstra', outroPose: 'hips', ask: 5,
    intro: [
      ['N', 'Jullie willen met mijn traumaheli achter een ballon aan? Dit is een ziekenhuis, geen kermis.'],
      ['A', 'In die mand zit de Gouden Eierbal. Het is een noodgeval voor heel Grunn.'],
      ['N', 'Een Grunneger noodgeval. Daar heb ik een formulier voor… Ach, stap maar in.'],
      ['A', 'Ik heb ooit een drone gehad.'],
      ['T', 'Die ligt nog in het Reitdiep.'],
      ['N', 'Zij vliegt, hij hangt aan het touw. Hoogte en snelheid gelijk houden met de mand.'],
      ['T', 'Aan het touw. Natuurlijk hang ík aan het touw.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Zo. Mijn heli heeft nog nooit iets zo waardevols vervoerd. Op een wethouder na.'],
      ['T', 'Ik heb hem. De echte. Hij is zwaar, en hij smelt niet.'],
      ['A', 'Ik heb een traumaheli gevlogen.'],
      ['T', 'Je hebt ermee geparkeerd. Op een ballon.'],
      ['N', 'Die Fries is geland in een weiland bij Ten Boer. Tussen de koeien. Hij was niet blij.'],
      ['A', 'De koeien ook niet, denk ik.'],
    ],
    fail: [['A', 'Die ballon is sneller dan hij eruitziet.'], ['T', 'Alles van Jelle is sneller dan het eruitziet.']],
  },
  // 15: H16 Waar is de Fjord?
  {
    npc: 'jelmer', outroPose: 'cheer', ask: 3,
    intro: [
      ['A', 'Mijn Fjord. Hij stond hier. Nu staat hier een klomp.'],
      ['T', 'Er zit een briefje in. "Tige tank foar de auto. J."'],
      ['N', 'Moi moi chat! De Fjord van Anita is foetsie! Wie hem ziet, zet het in de chat!'],
      ['N', 'Chat zegt: drie rode auto\'s rond het station. Pak een duif, dan zie je ze van boven.'],
      ['A', 'Durk en Douwe willen hem op de trein naar Leeuwarden zetten. Over mijn lijk.'],
      ['T', 'Liever over dat van Durk.'],
    ],
    outroNpc: true,
    outro: [
      ['N', 'Chat gaat los! Tienduizend hartjes voor de Fjord!'],
      ['A', 'Niemand. Raakt. Mijn. Fjord.'],
      ['T', 'Ik mag er ook niet in rijden.'],
      ['A', 'Precies. Niemand.'],
      ['T', 'Jelle wil ons weg hebben voor Gronings Ontzet. Daar gaat het hem om.'],
      ['A', 'Dan gaan we juist. Met de Fjord, en met een eierbal.'],
    ],
    fail: [['A', 'Mijn Fjord rijdt naar Leeuwarden. Zonder mij.'], ['T', 'Hij komt terug. Hij mist Grunn nu al.']],
  },
  // 16: H17 Het Bod
  {
    npc: 'jelle', outroPose: 'hips', ask: 0,
    intro: [
      ['N', 'Moai, Grinzers. Ik ha in foarstel. Op Gronings Ontzet bakke wy tsjin elkoar, foar de Noardlike Snackpriis.'],
      ['N', 'Winne jimme, dan meie jimme de Eierbal hâlde. Winne ik, dan krij ik him werom. En is de aaibal Frysk.'],
      ['T', 'Hij is niet eens van jou, Jelle.'],
      ['N', 'Dat is in detail, Grinzer.'],
      ['A', 'Mosterd, eieren, stoetbrood. Een echte Groninger eierbal. Wij winnen dit.'],
      ['T', 'Eieren van de kippen bij de volkstuin. Die leggen de beste.'],
      ['A', 'Dan rij jij, Tammo. En niet remmen. Eieren zijn geen pionnen.'],
    ],
    outroNpc: false,
    outro: [
      ['T', 'Stel dat we winnen. Dan hebben we een Gouden Eierbal. Achttien karaat.'],
      ['A', 'Dan kunnen we de Fjord Frituur kopen. En nog tien.'],
      ['T', 'En als we winnen, verkopen we hem toch nog?'],
      ['A', '…Nee. Hij hoort in Grunn.'],
      ['T', 'In het museum. Met een alarm dat het doet.'],
      ['A', 'Oma Trijntje zou trots zijn.'],
    ],
    fail: [['T', 'Omelet. Achterin. Overal.'], ['A', 'Dan halen we nieuwe. Die kippen leggen wel door.']],
  },
  // 17: H18 Finale: Gronings Ontzet
  {
    npc: 'berend', ask: 5,
    intro: [
      ['V', 'Achtentwintig augustus. Gronings Ontzet. In 1672 hield Grunn Bommen Berend buiten de stad.'],
      ['V', 'Dit jaar staat er gewoon een Berend op de Grote Markt. Als voorzitter van de jury.'],
      ['N', 'Zo. De Noordelijke Snackprijs. Ik proef, ik tel, ik oordeel. Streng.'],
      ['A', 'Tammo bakt. Ik hou de kraam heel.'],
      ['T', 'Ik bak nooit onder druk.'],
      ['N', 'Die twee Friese reuzen daar hebben vuurwerk bij zich. Dat is hier niet de bedoeling.'],
      ['A', 'Je doet alles onder druk, Tammo. Daarom werkt het.'],
      ['N', 'Een stad belegeren loopt nooit goed af. Vraag maar na.'],
    ],
    outroNpc: false,
    kiss: true,
    outro: [
      ['jelle', 'Goed. Ik priuw jimme aaibal. Mar ik sis neat.'],
      ['jelle', 'Dit is… better as ús. Net fertelle.'],
      ['A', 'Jelle zegt dat onze eierbal beter is. Hoorde iedereen dat?'],
      ['T', 'Heel de Grote Markt, schat.'],
      ['A', 'De Eierbal gaat terug naar het museum. En de beloning is voor de Fjord Frituur.'],
      ['T', 'Wij tweeën tegen Grunn. Weet je nog?'],
      ['A', 'Wij tweeën vóór Grunn.'],
    ],
    fail: [['A', 'Hij is weg. Met de Eierbal.'], ['T', 'Grunn geeft nooit op. Wij ook niet.']],
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

const DECK_H = 0.4;
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
  if (talking && pose !== 'kissT' && pose !== 'kissA') {
    ud.head.rotation.z += Math.sin(t * 8.5) * 0.045;
    if (!pose) arm(ud.armR, ud.elbowR, 0.35 + Math.sin(t * 3.1) * 0.18, 0.9 + Math.sin(t * 2.3) * 0.25, -0.25);
  }
}

function standActor(m, x, y, a, h = 0) {
  const ud = m.userData;
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
  if (key === 'V') return 'Verteller';
  if (key !== 'N' && NPC[key]) return NPC[key].name;
  return npc ? npc.name : '';
}

function timeline(lines, npc, lead = 0.5) {
  let t = lead;
  const out = lines.map(([who, text]) => {
    const speaker = speakerName(who, npc);
    const voice = voiceFor(speaker, text);
    const d = voice ? Math.max(lineDur(text), voice.dur + 0.25) : lineDur(text);
    const l = { who, speaker, text, at: t, dur: d, voice };
    t += d + 0.1;
    return l;
  });
  return { lines: out, total: t + 0.3 };
}

function buildRun(w, { npcKey, anchor, facing, kiss, h = 0 }) {
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

  const r = { w, group, tammo, anita, npc, npcDef, lastT: 0, kiss };
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
  r.h = h;
  const near = (q) => q.state !== 'dead' && Math.hypot(q.x - r.mid.x, q.y - r.mid.y) < 10;
  r.peds = w.pedestrians.filter(near);
  if (r.peds.length) w.pedestrians = w.pedestrians.filter((q) => !r.peds.includes(q));
  w.cinematicHidePlayers = true;
  w.cinematicHideNav = true;
  return r;
}

function cleanupRun(r) {
  if (!r) return;
  r.group.removeFromParent();
  for (const m of [r.tammo, r.anita, r.npc]) if (m) disposeActor(m);
  r.w.cinematicHidePlayers = false;
  r.w.cinematicHideNav = false;
  if (r.peds && r.peds.length) r.w.pedestrians.push(...r.peds);
  if (run === r) run = null;
}

function animate(r, t, dt, talker, poses) {
  for (const [m, key] of [[r.tammo, 'T'], [r.anita, 'A'], [r.npc, 'N']]) {
    if (!m) continue;
    const ud = m.userData;
    resetLimbs(ud);
    animatePersonWalk(m, 0, dt);
    applyPose(m, poses[key] || null, t, talker === key);
  }
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
    npc: (u) => {
      const a = camClear(w, P(mid.x - f.x * (1.5 + u * 0.3) + n.x * 1.9 * s1, mid.y - f.y * (1.5 + u * 0.3) + n.y * 1.9 * s1, h + 1.7));
      return pose(a, head(npc, 1.5), 40);
    },
    duo: (u) => {
      const a = camClear(w, P(npc.x + f.x * 1.8 - n.x * 0.9 * s1 + f.x * u * 0.3, npc.y + f.y * 1.8 - n.y * 0.9 * s1 + f.y * u * 0.3, h + 1.68));
      return pose(a, head(mid, 1.42), 40);
    },
    two: (u) => {
      const a = camClear(w, P(mid.x + f.x * lerp(3.6, 3.0, u) + n.x * 0.4, mid.y + f.y * lerp(3.6, 3.0, u) + n.y * 0.4, h + 1.6));
      return pose(a, head(mid, 1.35), 42);
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

function camFor(cams, who, isFirst, isLast, closing, target) {
  if (closing === 'two') return cams.two;
  if (who === 'V') return isFirst ? cams.rise : (u) => cams.glance(u, target);
  if (isFirst) return (u) => cams.est(u);
  if (closing === 'kiss') return cams.kiss;
  if (isLast && closing === 'glance') return (u) => cams.glance(u, target);
  if (isLast && closing === 'rise') return cams.rise;
  return who === 'N' ? cams.npc : cams.duo;
}

function play(w, id, r, tl, { kicker, title, cardFor, closing, target, poses = () => ({}), banner, bannerAfter }) {
  const cams = camsFor(r);
  const lines = tl.lines;
  const plan = lines.map((l, i) => ({ from: l.at - (i === 0 ? l.at : 0.06), to: l.at + l.dur + 0.06, fn: camFor(cams, l.who, i === 0 && lines.length > 1, i === lines.length - 1, closing, target) }));
  if (lines.length === 1) plan[0].fn = closing === 'glance' ? (u) => cams.glance(u, target) : cams.two;
  plan[plan.length - 1].to = tl.total;
  run = r;
  const ok = playCinematic({
    id, priority: 3, duration: tl.total, pause: true, letterbox: true, skippable: true, hideHud: true,
    kicker, title, cardFor,
    lines: lines.map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur })),
    shot: (u, t) => {
      const dt = Math.max(0, Math.min(0.1, t - r.lastT));
      r.lastT = t;
      const cur = lines.find((l) => t >= l.at && t < l.at + l.dur);
      if (cur && cur !== r.voiced) {
        r.voiced = cur;
        if (cur.voice) playStoryVoice(VOICE_DIR + cur.voice.src);
        else stopStoryVoice();
      }
      animate(r, t, dt, cur ? cur.who : null, poses(t, cur));
      const seg = plan.find((p) => t < p.to) || plan[plan.length - 1];
      return seg.fn(clamp01((t - seg.from) / Math.max(0.1, seg.to - seg.from)));
    },
    onStart: () => { setStoryScene(true); if (banner) showBanner(banner); },
    onEnd: () => {
      setStoryScene(false);
      cleanupRun(r);
      if (bannerAfter) showBanner(bannerAfter);
    },
  });
  if (!ok) {
    cleanupRun(r);
    if (banner || bannerAfter) showBanner(banner || bannerAfter);
  }
  return ok;
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
  const r = buildRun(w, { npcKey: onDeck ? null : s.npc, anchor, facing, h: onDeck ? DECK_H : 0 });
  if (!r) return false;
  const all = stageLines(i, stage, 'intro');
  const lines = short ? [s.intro[s.ask]] : all;
  const tl = timeline(lines, r.npcDef, short ? 0.4 : 0.6);
  const askText = s.intro[s.ask][1];
  return play(w, 'mission-intro', r, tl, {
    kicker, title, cardFor: short ? tl.total : 3.6, closing: 'glance', target,
    poses: (t, cur) => ({ N: cur && cur.text === askText ? 'point' : i === 1 || i === 15 ? 'phone' : null, A: (i === 5 || i === 15) && cur && cur.who === 'A' ? 'hips' : null }),
  });
}

export function playStoryOutro(w, i, { stage = i, short = false, reward = 0, stats = [], reason = '' } = {}) {
  const s = STORY[i];
  const banner = { kind: 'pass', title: 'MISSIE GESLAAGD', reason, reward, stats };
  if (!s || run) { showBanner(banner); return false; }
  const p = w.player;
  const v = p.inVehicle;
  const kiss = !!s.kiss && !short && stage >= i;
  let r;
  if (v && v.isBoat) {
    r = buildRun(w, { anchor: { x: v.x, y: v.y }, facing: v.angle + Math.PI / 2, kiss, h: DECK_H });
  } else {
    const anchor = onFootAnchor(w);
    r = buildRun(w, { npcKey: s.outroNpc && !kiss ? s.npc : null, anchor, facing: facingTowards(w, anchor, null), kiss });
  }
  if (!r) { showBanner(banner); return false; }
  const all = stageLines(i, stage, 'outro');
  const lines = short ? [all[all.length - 1]] : all;
  const tl = timeline(lines, r.npcDef, short ? 0.3 : 0.5);
  return play(w, 'mission-outro', r, tl, {
    closing: kiss ? 'kiss' : 'rise', banner,
    poses: (t, cur) => (kiss && cur === tl.lines[tl.lines.length - 1]
      ? { T: 'kissT', A: 'kissA' }
      : kiss ? {} : { N: s.outroPose || null }),
  });
}

export function playStoryFail(w, i, { reason = '', stats = [] } = {}) {
  const s = STORY[i];
  const banner = { kind: 'fail', title: 'MISSIE MISLUKT', reason, stats };
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

  const tl = timeline(lines, NPC.jelle, 0.6);
  const talkEnd = tl.total;
  // fierljep.js timing: run-up, jump onto the pole, the swing (slowed down
  // at the top), then the drop or the topple and the splash
  const swingT = fail ? 1.5 : 1.05 + Math.max(6, Math.min(18, 0.94 * span + 1.3)) * 0.09;
  const RUN = 1.3, JUMP = spot ? 0.42 + swingT * 1.93 + (fail ? 1.9 : 0.8) : 1.7, AFTER = spot ? 3.4 : 2.6;
  const jumpAt = talkEnd + RUN, landAt = jumpAt + JUMP, total = landAt + AFTER;
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
    lines: allLines.map((l) => ({ speaker: l.speaker, text: l.text, at: l.at, dur: l.dur })),
    shot: (u, t) => {
      const dt = Math.max(0, Math.min(0.1, t - r.lastT));
      r.lastT = t;
      const cur = allLines.find((l) => t >= l.at && t < l.at + l.dur);
      const talking = (key) => !!cur && cur.who === key;
      const fled = !fail && t > landAt + 0.6;
      for (const [m, key] of [[tammo, 'T'], [anita, 'A'], [durk, 'durk'], [douwe, 'douwe']]) {
        resetLimbs(m.userData);
        animatePersonWalk(m, fled && (key === 'durk' || key === 'douwe') ? 3 : 0, dt);
        applyPose(m, t > landAt && (key === 'T' || key === 'A') ? 'hips' : null, t, talking(key));
      }
      if (fled) {
        const k = (t - landAt - 0.6) * 3;
        standActor(durk, dS.x - dx * k + nx * k * 0.3, dS.y - dy * k + ny * k * 0.3, ang + Math.PI + 0.3);
        standActor(douwe, eS.x - dx * k + nx * k * 0.3, eS.y - dy * k + ny * k * 0.3, ang + Math.PI + 0.3);
      }
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
        return pose(camClear(w, P(fx + nx * side * talkSide, fy + ny * side * talkSide, 4 + Math.max(0, q.z) * 0.45)), P(q.x, q.y, Math.max(q.z, -0.6) * 0.8 + 0.8), 54);
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
        const z = k < 0.45 ? 4 * apex * 0.6 * (k / 0.9) * (1 - k / 0.9) : lerp(apex * 0.6 * 0.99, -0.9, smooth((k - 0.45) / 0.55));
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
            spawnFxPuff(plant.x, -0.9, plant.y, Math.cos(a) * 3, 3 + Math.random() * 3, Math.sin(a) * 3, 0.9, 0.3, 1.1, 0.92, 0.96, 1, 0.8, 2, -1);
          }
        }
        standActor(jelle, plant.x, plant.y, ang + Math.PI, -1.05 + Math.sin(t * 3) * 0.08);
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
      return pose(camClear(w, P(fx + nx * side, fy + ny * side, 3.2 + apex * 0.3)), P(fx, fy, 1.5 + apex * 0.35 * Math.min(1, k * 2)), 50);
    },
    onStart: () => setStoryScene(true),
    onEnd: () => { setStoryScene(false); cleanup(); },
  });
  if (!ok) cleanup();
  return ok;
}
