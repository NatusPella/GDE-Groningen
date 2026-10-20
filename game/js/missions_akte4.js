// Akte 4 "Zuidwaarts" of the new story (docs/verhaal/nieuw 04-akte4.md, 09-script-akte4.md): the missions
// M17 bruggen, M18 wiebelwerk, M19 stoom, M20 beleg and the new staging of M21 (the old def `fjord`).
// Kept apart from missions_nieuw.js so the four acts built side by side do not edit the same block;
// buildNieuwDefs calls buildAkte4Defs and applyNieuw calls applyAkte4 (one line each).
//
// The places are real ones in the south of the province, given as WGS84 [lat, lon]: `ll` targets
// (missions.js resolveTarget). The coordinates are estimates from the map, not measured on the tiles:
// scripts/akte4_test.mjs only checks that they lie in the right place; nothing has been looked at in the
// game yet (the south's tiles were not available to the session that wrote this).
// The mechanics are the existing ones: stages (goto, hold, scene), the bridges' horn (movablebridges.js),
// the held bangs of the Gronings Ontzet stall (hold + fireworks), and the two small stage kinds of this
// act: `choice` (stagechoice.js) and `rit` (stagerit.js).
import { wgsToWorld } from './rdnew.js';

// places [lat, lon]
export const PLACES = {
  veendamBoot: [53.1050, 6.8570],     // the Oosterdiep at the western edge of Veendam (the route is still an estimate, not checked on the tiles)
  veendamA: [53.1054, 6.86585],
  veendamB: [53.10539, 6.87446],
  veendamC: [53.10662, 6.88408],
  veendamD: [53.10546, 6.89134],        // bridge eleven
  wiebelwerk: [53.1040, 6.8765],      // the invented web agency in an office building by a roundabout
  wiebelwerkServers: [53.1042, 6.8769],
  wiebelwerkUit: [53.1038, 6.87595],
  veendamPerron: [53.1033, 6.8830],   // the station of the museum line; the ride ends at Wildervank, 2.3 km on
  bourtangeWalB: [53.00693, 7.1892],
  bourtangeKruitB: [53.0074, 7.19305],
  bourtangeKruitC: [53.0070, 7.1934],
  bourtangeWal: [53.00669, 7.1900],
  bourtangeGracht: [53.0083, 7.19285],
  bourtangeKruit: [53.00711, 7.1928],
  bourtangePoort: [53.005, 7.19065],
  zuidhornOverweg: [53.2486, 6.4087],
  tinusSchuur: [53.2506, 6.4110],   // the barn on the north edge of Zuidhorn (the same spot as SCHUUR in missions_akte5.js)
};

const xy = (key) => { const [x, y] = wgsToWorld(PLACES[key][0], PLACES[key][1]); return { x, y }; };
const ll = (key, o = {}) => ({ ll: PLACES[key], ...o });
const spot = (key) => ({ ...xy(key), road: null });

export function buildAkte4Defs() {
  const list = [];
  list.push(
    {
      // M17 Open, dicht: eleven bridges on the Oosterdiep in a sloep, ahead of Jelle's mustard ship. The horn opens a bridge (movablebridges.js).
      type: 'stages',
      label: 'Open, dicht',
      intro: ['Wubbo bedient elf bruggen in Veendam, op het ritme van de fanfare. Jelles mosterdschip moet er ook door.', 'Vaar door alle elf de bruggen, vóór het mosterdschip uit. Toeter bij een gesloten brug; dan opent Wubbo hem.'],
      outro: 'Het mosterdschip zit vast. De grove mosterd is van Oma, niet van Jelle.',
      timeLimit: 420,
      timeUp: 'tijd op. Jelles mosterdschip is al door alle elf de bruggen',
      costRow: ['Gered', 'Plakje zeven: de grove mosterd gaat naar Oma'],
      reward: 700,
      boatAt: { ...xy('veendamBoot'), angle: 0 },
      boatModel: 'sloep',
      start: spot('veendamBoot'),
      say: 'Een sloep op het Oosterdiep, elf bruggen en Jelles mosterdschip erachteraan.',
      stages: [
        { kind: 'board', label: 'Stap in de sloep', say: 'Instappen. De sloep ligt aan de kant, Wubbo wacht bij de eerste brug.' },
        { kind: 'goto', target: ll('veendamA', { label: 'Brug 1 tot en met 4' }), mode: 'boat', radius: 45, limit: 105, late: 'de bruggen draaiden te laat open. Het mosterdschip was eerder',
          label: 'Vaar door de eerste vier bruggen', say: 'Toeter bij een gesloten brug, Wubbo opent op het ritme van de fanfare.' },
        { kind: 'goto', target: ll('veendamB', { label: 'Brug 5 tot en met 7' }), mode: 'boat', radius: 45, limit: 105, late: 'zonder fanfare miste je de maat. Het mosterdschip was eerder',
          label: 'Vaar door brug 5, 6 en 7 op de fluit van Wubbo', say: 'De fanfare is weg: Jelle kocht haar voor zijn optocht. Wubbo fluit: één keer is open, twee keer is dicht.',
          talk: { ids: ['M17.2'], delay: 1.5 } },
        { kind: 'goto', target: ll('veendamC', { label: 'Brug 8 tot en met 10' }), mode: 'boat', radius: 45, limit: 105, late: 'brug negen bleef dicht. Het mosterdschip was eerder',
          label: 'Vaar door brug 8, 9 en 10', say: 'Brug acht, negen en tien. Niet te vroeg: een dichte brug is dicht.' },
        { kind: 'goto', target: ll('veendamD', { label: 'Brug elf' }), mode: 'boat', radius: 35, stop: 0.8, limit: 90, late: 'brug elf draaide niet op tijd. Jelles mosterdschip was erdoor',
          label: 'Vaar tot brug elf: de limo staat aan de overkant', say: 'Brug elf. Aan de overkant staat de limo met de gouden koffer. De brug draait niet voor een limo.' },
      ],
    },
    {
      // M18 Wie draaide de camera's uit?: an intake at Wiebelwerk (a conversation puzzle), the server room, the logbook of 12 August
      type: 'stages',
      label: 'Wie draaide de camera\'s uit?',
      intro: ['Wiebelwerk in Veendam werkt elke nacht om middernacht de camera\'s van het museum bij.', 'Doel: ga naar binnen als klant en beantwoord de vragen van de accountmanager. Lees daarna in de serverkamer het logboek van 12 augustus.'],
      outro: 'Het logboek bewijst het: Jelle had de bal op 12 augustus al. Tessa print het.',
      reward: 600,
      onFoot: true,
      costRow: ['Ontdekt', 'Jelle had de bal al op 12 augustus'],
      tagAdjust: { 'sluip-top': 100, argwaan1: -50, argwaan2: -100 },
      tagRows: { 'sluip-top': ['Sluipen', 'Langs alle drie de camera\'s, zonder één piep'], argwaan1: ['Intake', 'De accountmanager twijfelde en liep mee'], argwaan2: ['Intake', 'Twee foute antwoorden: de beveiliging liep mee'] },
      start: spot('wiebelwerk'),
      say: 'Wiebelwerk, websites met karakter. Wij zijn klant.',
      stages: [
        { kind: 'goto', target: ll('wiebelwerk', { label: 'Wiebelwerk' }), mode: 'foot', radius: 14, label: 'Ga naar binnen bij Wiebelwerk', say: 'Wiebelwerk, websites met karakter. Binnen doen we alsof we een website willen.' },
        {
          kind: 'choice', kicker: 'Intake bij Wiebelwerk', wrongFails: 3, countTag: 'argwaan', wrongText: 'de accountmanager ziet dat je geen klant bent. De beveiliging komt eraan',
          label: 'Overtuig de accountmanager: je bent klant', say: 'Geef de juiste antwoorden op de intake, dan mogen we naar de serverkamer.',
          rounds: [
            { who: 'Accountmanager', text: 'Wat is uw merkpersoonlijkheid?', options: [
              { label: 'Friet.', ok: false, reply: 'Dat is een product, geen persoonlijkheid.' },
              { label: 'Warm, droog en een beetje Gronings.', reply: 'Dat noteer ik.' },
              { label: 'Geen idee.', ok: false, reply: 'Dan beginnen we met een workshop. Die duurt een week.' },
            ] },
            { who: 'Accountmanager', text: 'Wilt u een chatbot?', options: [
              { label: 'Wat is een chatbot?', ok: false, reply: 'Dat vraagt een klant niet. Bent u wel een klant?' },
              { label: 'Nee.', reply: 'Iedereen wil een chatbot. Dan doen wij hem toch.' },
              { label: 'Ja, graag.', reply: 'Prachtig. Dat noteer ik ook.' },
            ] },
            { who: 'Accountmanager', text: 'En hoe lang bestaat uw bedrijf?', options: [
              { label: 'Sinds deze zomer. Wij zijn jong, maar eerlijk.', reply: 'Een start-up. Dat zie ik graag. Dat noteer ik.' },
              { label: 'Sinds 1672.', ok: false, reply: 'Dat is het jaar van het Ontzet. U bent geen bedrijf, u bent een geschiedenisles.' },
              { label: 'Dat mag u niet vragen.', ok: false, reply: 'Dit is de derde vraag die u niet kent. Ik loop even mee.' },
            ] },
          ],
        },
        {
          // how wary the manager got: one wrong answer and he walks along, two and the guard does
          kind: 'scene', label: 'De accountmanager reageert', target: ll('wiebelwerk', { label: 'Wiebelwerk' }), kicker: 'Wiebelwerk', script: { ids: ['M18.2'] },
          scriptIf: [{ tag: 'argwaan2', ids: ['M18.7'] }, { tag: 'argwaan1', ids: ['M18.6'] }],
          cast: [{ key: 'accountmanager', pose: 'hips', at: [3.0, -0.4] }],
        },
        { kind: 'goto', target: ll('wiebelwerkServers', { label: 'De serverkamer' }), mode: 'foot', radius: 5, label: 'Naar de serverkamer', say: 'De accountmanager belt een collega. Nu snel naar de serverkamer.' },
        {
          // a wary manager walks along and the guard looks out: the same hall, a faster sweep, a narrower dark zone
          kind: 'timing', ifTag: 'argwaan1', kicker: 'De gang, met de accountmanager achter je', help: 'druk als de camera wegdraait', failAt: 2, failText: 'de accountmanager zag je: de beveiliging komt eraan', goodAt: 3, tagGood: 'sluip-top',
          label: 'Glip langs de camera\'s, met de accountmanager in je nek', say: 'Hij loopt twee stappen achter je. De camera\'s draaien sneller en het groen is smaller.',
          rounds: [
            { text: 'Camera één kijkt naar de koffieautomaat. De accountmanager vraagt of je koffie wilt.', speed: 0.85, zone: [0.39, 0.61], ok: 'Door, achter de plant.', bad: 'Camera één piept. Hij kijkt om.' },
            { text: 'Camera twee draait over de deuren. Hij zegt: "Hier lang, hoor."', speed: 1.0, zone: [0.42, 0.58], ok: 'Door, terwijl hij naar de verkeerde deur wijst.', bad: 'Camera twee zwenkt je kant op. Hij kijkt om.' },
            { text: 'Camera drie hangt boven de serverdeur. Hij belt zijn collega.', speed: 1.15, zone: [0.44, 0.56], ok: 'Binnen. De deur valt zacht dicht.', bad: 'Camera drie ziet een schoen.' },
          ],
        },
        {
          kind: 'timing', unlessTag: 'argwaan1', kicker: 'De gang naar de serverkamer', help: 'druk als de camera wegdraait', failAt: 2, failText: 'de camera zag je: de beveiliging komt eraan', goodAt: 3, tagGood: 'sluip-top',
          label: 'Glip langs de camera\'s: druk als de camera wegdraait', say: 'Drie camera\'s in de gang. Wacht tot de streep in het vak staat, dan sluip je door.',
          rounds: [
            { text: 'Camera één kijkt naar de koffieautomaat.', speed: 0.7, zone: [0.36, 0.64], ok: 'Door, achter de plant.', bad: 'Camera één piept. Terug achter de plant.' },
            { text: 'Camera twee draait langzaam over de deuren.', speed: 0.85, zone: [0.4, 0.6], ok: 'Door, onder de camera.', bad: 'Camera twee zwenkt je kant op.' },
            { text: 'Camera drie hangt boven de serverdeur.', speed: 1.0, zone: [0.42, 0.58], ok: 'Binnen. De deur valt zacht dicht.', bad: 'Camera drie ziet een schoen.' },
          ],
        },
        {
          kind: 'hold', target: ll('wiebelwerkServers', { label: 'De serverkamer' }), mode: 'foot', radius: 6, time: 8, ticks: ['Update, altijd 00:00, drie minuten. Behalve 12 augustus: elf minuten, aangevraagd door Us Mem Snacks.', 'Zijdeur 00:03, pas van bewaker twee, gast: D en D, tilwerk. De pas van mevrouw Hoving is die dag geblokkeerd.'],
          label: 'Lees het logboek van 12 augustus', say: 'Het logboek van 12 augustus. Blijf bij de server staan tot alles gelezen is.',
          talk: { ids: ['M18.3'], delay: 1 },
        },
        { kind: 'goto', target: ll('wiebelwerkUit', { label: 'Buiten' }), mode: 'any', radius: 18, label: 'Naar buiten, met het printje', say: 'Tessa heeft het logboek geprint. Nu weg voor de accountmanager terug is.' },
      ],
    },
    {
      // M19 Stoom: Tammo drives the stopped museum steam train to the next platform (gas and brake only), Tessa frees the jury in the carriages (the script's scene)
      type: 'stages',
      label: 'Stoom',
      intro: ['Jelle heeft de machinist van de museumstoomtrein omgekocht. De trein staat stil, en de laatste juryleden zitten er vier uur in vast.', 'Doel: rij de trein van Veendam naar het perron van Wildervank, zodat de juryleden kunnen uitstappen.'],
      outro: 'Eén jurylid stapt uit. Eén blijft bij Jelle. De bewaarder blijft zitten, dus het oudste jurylid, Berend, zit voor.',
      reward: 800,
      onFoot: true,
      costRow: ['Gevolg', 'Eén jurylid bevrijd, één blijft bij Jelle, de voorzitter is verhinderd'],
      start: spot('veendamPerron'),
      say: 'Het perron in Veendam. De machinist eet een eierbal op een bank.',
      stages: [
        { kind: 'goto', target: ll('veendamPerron', { label: 'Het perron' }), mode: 'foot', radius: 14, label: 'Ga naar de stilstaande stoomtrein', say: 'De trein staat stil, de machinist zit op een bank. Naar de kop van de trein.' },
        {
          kind: 'rit', target: ll('veendamPerron', { label: 'De kop van de trein' }), length: 2300, radius: 45,
          label: 'Rij de trein naar het perron van Wildervank: W gas, S rem', say: 'Instappen met E bij de kop. W is gas, S is rem, H is de fluit. Rem op tijd bij het perron.',
          exit: true, late: 'de trein reed door het station. De juryleden zitten nog vast',
          talk: { ids: ['M19.2'], delay: 6 },
        },
      ],
    },
    {
      // M20 Het beleg van Bourtange: defend the walls, the fierljep challenge, the powder cellar where Mem takes the ball, then keep the cellar and carry the ball to the bakkie
      type: 'stages',
      label: 'Het beleg van Bourtange',
      intro: ['Het Beleg van Bourtange: veertig mensen in kostuum, vijftien kanonnen van karton en een vesting. Jelle komt met zijn mannen in blauwe colberts.', 'Doel: verdedig de wallen en spring over de gracht.'],
      outro: 'De bal ligt in het bakkie. Jelle gaf de bal aan Mem en nam daarna de Escapade.',
      reward: 1200,
      onFoot: true,
      costRow: ['Gevolg', 'Mem nam de bal van Jelle af; de Escapade is weg'],
      tagAdjust: { 'duel-won': 200 },
      tagRows: { 'duel-won': ['Fierljep', 'Verder gesprongen dan Durk en Douwe'], 'duel-lost': ['Fierljep', 'Tammo landde nat, maar landde'] },
      start: spot('bourtangeWal'),
      say: 'Vesting Bourtange, fakkels, een gracht en kartonnen kanonnen.',
      stages: [
        { kind: 'goto', target: ll('bourtangeWal', { label: 'De wallen' }), mode: 'foot', radius: 18, label: 'Naar de wallen van de vesting', say: 'Het Beleg begint. Berend is de bisschop en valt aan. Wij verdedigen de wallen.' },
        {
          kind: 'hold', target: ll('bourtangeWal', { label: 'De wallen' }), mode: 'foot', radius: 12, time: 16, ticks: ['Het eerste kanon van karton is leeg. Volgende!'],
          fireworks: { every: [2.5, 4.5], hit: 1.9, cost: 2, hitText: 'Een kartonnen kogel met confetti. Even liggen, dan weer de wal op.' },
          label: 'Verdedig de westwal tegen het beleg', say: 'Blijf op de wal staan. De kartonnen kogels zijn confetti, maar ze duwen je wel om.',
        },
        { kind: 'goto', target: ll('bourtangeWalB', { label: 'De noordwal' }), mode: 'foot', radius: 10, label: 'Ren naar de noordwal: daar breekt Berends bisschopsleger door', say: 'Het leger van de bisschop komt aan de andere kant. Ren naar de noordwal.' },
        {
          kind: 'hold', target: ll('bourtangeWalB', { label: 'De noordwal' }), mode: 'foot', radius: 12, time: 14, ticks: ['De wal houdt stand. Nog even.'],
          fireworks: { every: [2.0, 3.8], hit: 1.9, cost: 2, hitText: 'Confetti in je gezicht. Even liggen, dan weer de wal op.' },
          label: 'Houd ook de noordwal tegen het beleg', say: 'Blijf op de noordwal staan tot het beleg voorbij is.',
        },
        { kind: 'goto', target: ll('bourtangeGracht', { label: 'De gracht' }), mode: 'foot', radius: 12, label: 'Naar de gracht: Durk en Douwe dagen je uit', say: 'Durk en Douwe houden je bezig. Naar de gracht.' },
        {
          kind: 'timing', vaultJump: true, kicker: 'Fierljep-duel in Bourtange', help: 'druk op het goede moment', goodAt: 2, tagGood: 'duel-won', tagLow: 'duel-lost',
          label: 'Fierljep-duel: spring verder dan Durk en Douwe', say: 'Durk en Douwe springen mee. Aanloop, polsstok, klimmen: druk als de streep in het vak staat.',
          rounds: [
            { text: '1. De aanloop: vol gas naar de gracht.', speed: 0.8, zone: [0.36, 0.64], ok: 'Een strakke aanloop. Durk kijkt jaloers.', bad: 'Je struikelt over een kartonnen kanon.' },
            { text: '2. Pak de polsstok.', speed: 1.0, zone: [0.4, 0.6], ok: 'De stok zit. Douwe zegt: …wauw.', bad: 'De stok glijdt weg. Douwe zegt: …oei.' },
            { text: '3. Klim en wacht op het kantelpunt.', speed: 1.15, zone: [0.43, 0.57], ok: 'Boven. Het kantelt precies goed.', bad: 'Te vroeg. De stok kantelt zijwaarts.' },
          ],
        },
        {
          kind: 'scene', target: ll('bourtangeGracht', { label: 'De gracht' }), label: 'Durk en Douwe', kicker: 'De gracht van Bourtange',
          script: { ids: ['M20.2'] }, cast: [{ key: 'durk', pose: 'arms', at: [3.2, 1.0] }, { key: 'douwe', pose: 'arms', at: [3.2, -1.4] }],
        },
        {
          kind: 'goto', target: ll('bourtangeKruit', { label: 'De kruitkelder' }), mode: 'foot', radius: 12, label: 'Naar de kruitkelder', say: 'Mem en Oma Trijntje zitten in de kruitkelder. Jelle heeft de bal in een koffer.',
        },
        {
          kind: 'scene', target: ll('bourtangeKruit', { label: 'De kruitkelder' }), label: 'Mem', kicker: 'De kruitkelder',
          script: { ids: ['M20.3'] }, cast: [{ key: 'mem', pose: 'hold', at: [2.4, 0.6] }, { key: 'trijntje', pose: 'hips', at: [2.6, -0.8] }, { key: 'jelle', pose: 'hips', at: [4.2, 0] }, { key: 'berend', pose: 'arms', at: [3.6, 2.0] }],
        },
        {
          kind: 'hold', target: ll('bourtangeKruit', { label: 'De kruitkelder' }), mode: 'foot', radius: 7, time: 12, ticks: ['Jelles mannen storten zich op de deur. Hou vol.'],
          fireworks: { every: [2.0, 3.5], hit: 1.9, cost: 3, hitText: 'Een blauwe colbert duwt je opzij. Even liggen, dan terug in de deur.' },
          label: 'Houd de eerste deur van de kruitkelder tegen Jelles mannen', say: 'Houd de deur van de kruitkelder met de kartonnen kanonnen. Jelles mannen komen in colberts.',
          talk: { ids: ['M20.4'], delay: 1.5 },
        },
        { kind: 'goto', target: ll('bourtangeKruitB', { label: 'De tweede deur' }), mode: 'foot', radius: 6, label: 'Ren naar de tweede deur: die begint te bezwijken', say: 'De tweede deur geeft mee. Rennen.' },
        {
          kind: 'hold', target: ll('bourtangeKruitB', { label: 'De tweede deur' }), mode: 'foot', radius: 7, time: 12, ticks: ['Nog een deur. Hou vol.'],
          fireworks: { every: [1.8, 3.2], hit: 1.9, cost: 3, hitText: 'Een colbert met een aktetas. Even liggen, dan terug in de deur.' },
          label: 'Houd de tweede deur tegen', say: 'Houd ook de tweede deur. Daarna de derde.',
        },
        { kind: 'goto', target: ll('bourtangeKruitC', { label: 'De derde deur' }), mode: 'foot', radius: 6, label: 'Ren naar de derde deur: de laatste', say: 'De derde deur. De bal blijft hier.' },
        {
          kind: 'hold', target: ll('bourtangeKruitC', { label: 'De derde deur' }), mode: 'foot', radius: 7, time: 12, ticks: ['Nog even. De bal blijft hier.'],
          fireworks: { every: [1.6, 3.0], hit: 1.9, cost: 3, hitText: 'Jelles mannen duwen allemaal tegelijk. Even liggen, dan terug in de deur.' },
          label: 'Houd de derde deur tegen', say: 'De laatste deur. Daarna naar de poort.',
        },
        { kind: 'goto', target: ll('bourtangePoort', { label: 'Berends bakkie' }), mode: 'foot', radius: 9, stop: 1, label: 'Draag de bal naar het bakkie bij de poort', say: 'Links is vrij. Naar de poort, Berends bakkie staat klaar.' },
      ],
    },
  );
  return list;
}

// M21 in the new arc: Tessa's part (the crossing at Zuidhorn, the choice on the wagon) and Tammo's (the friends at Tinus' schuur).
// The old def `fjord` is the Groningen version (the goods train at the Stationsplein): the new arc stages it new.
export function applyAkte4(list) {
  const fj = list.find((d) => d.label === 'Iedereen heeft een rode auto gezien');
  if (!fj) return;
  fj.intro = ['De Escapade staat op een wagon van een goederentrein, op weg naar Ljouwert. Mem appte waar hij stopt: de overweg bij Zuidhorn.', 'Doel (Tessa): haal de Escapade terug van de trein. Daarna zoekt Tammo bij Tinus\' schuur de woorden om Oma\'s vrienden te laten blijven.'];
  fj.outro = 'De Escapade is terug. De bal is weg. En de vrienden zijn weg.';
  fj.costRow = ['Gevolg', 'De bal is van Jelle; de vrienden gingen weg'];
  // the wagon choice has a consequence: the car saves a scratch, the ball costs one (Berend counts)
  fj.tagAdjust = { bal: -150, 'sprint-slecht': -100 };
  fj.tagRows = { 'sprint-goed': ['Sprint', 'Over alle wagons, zonder val'], 'sprint-slecht': ['Sprint', 'Gevallen op de wagons: de schade is voor jou'], auto: ['Gekozen', 'De auto: geen kras'], bal: ['Gekozen', 'De bal: een kras op de Escapade, Berend telt'] };
  fj.fjordTrain = false;
  delete fj.vehicle;
  fj.start = spot('zuidhornOverweg');
  fj.timeLimit = null;
  fj.stages = [
    { kind: 'goto', target: ll('zuidhornOverweg', { label: 'De overweg bij Zuidhorn' }), mode: 'any', radius: 30, label: 'Naar de overweg bij Zuidhorn: daar stopt de trein om middernacht', say: 'Mems appje: de trein met de rode auto stopt om middernacht bij de overweg in Zuidhorn.', talk: { ids: ['M21.2'], delay: 3 } },
    {
      kind: 'timing', kicker: 'Over de wagons', help: 'spring op het goede moment', goodAt: 2, tagGood: 'sprint-goed', tagLow: 'sprint-slecht',
      label: 'Spring van wagon naar wagon naar de Escapade', say: 'De trein rijdt. Druk als de streep in het vak staat om naar de volgende wagon te springen.',
      rounds: [
        { text: 'Wagon één naar twee: de koppeling schudt.', speed: 0.9, zone: [0.38, 0.62], ok: 'Over de koppeling.', bad: 'Je glijdt, maar grijpt de reling.' },
        { text: 'Wagon twee naar drie: Jelles mannen kijken om.', speed: 1.1, zone: [0.41, 0.59], ok: 'Drie. Zij zien je nog niet.', bad: 'Je valt op je rugzak. Au.' },
        { text: 'Wagon drie naar de Escapade: hij staat los.', speed: 1.25, zone: [0.43, 0.57], ok: 'Je landt op de motorkap.', bad: 'Je landt op je knieën, naast de motorkap.' },
      ],
    },
    {
      kind: 'choice', kicker: 'Op de wagon', label: 'Kies: de auto of de bal', say: 'Jelles mannen staan op de wagon. Jelle belt: de auto redden of de bal houden. Niet allebei.',
      rounds: [
        { who: 'Jelle', time: 6, timeoutPick: 2, rule: 'Beslis snel', text: 'U kunt de auto redden of de bal houden. Beide tegelijk is juridisch niet mogelijk.', options: [
          { label: 'De auto: de Escapade redden', tag: 'auto', reply: 'Tessa laat de rugzak vallen. Jelles mannen springen met de bal naar een limo.' },
          { label: 'De bal: de rugzak vasthouden', ok: false, tag: 'bal', reply: 'Tessa houdt de bal tot een belegger hem uit haar handen trekt. Dan springt ze terug naar de Escapade: de wagon rolt, maar ze haalt hem in.' },
        ] },
      ],
    },
    { kind: 'scene', target: ll('zuidhornOverweg', { label: 'De overweg' }), label: 'De klomp', kicker: 'De overweg bij Zuidhorn', script: { ids: ['M21.3'] }, scriptIf: [{ tag: 'bal', ids: ['M21.6'] }], cast: [{ key: 'berend', pose: 'arms', at: [3.2, 0.8] }] },
    { kind: 'scene', target: ll('tinusSchuur', { label: 'Tinus\' schuur' }), label: 'Tammo', kicker: 'Woensdag 26 augustus', big: 'Tammo, bij Tinus\' schuur', solo: true, lines: [] },
    { kind: 'goto', target: ll('tinusSchuur', { label: 'Tinus\' schuur' }), mode: 'any', radius: 25, label: 'Naar Tinus\' schuur bij Zuidhorn', say: 'Oma heeft alle vrienden met hun ingrediënten naar de schuur geroepen. Jelles advocaten bellen ze terug.' },
    {
      kind: 'choice', kicker: 'De vrienden bij Tinus\' schuur', label: 'Houd Oma\'s vrienden bij elkaar, ook al zeggen ze nee', say: 'Zeg het goed. Elke vriend zegt dat Jelles advocaten gebeld hebben.',
      rounds: [
        { who: 'Geesje', text: 'Mijn kerkvoogdij is gebeld. De kerkkelder is verhuurd. Het spijt me, jong.', options: [
          { label: 'Wacht.', reply: 'Tinus: "Laat ze, jong. Praten kun je niet."' },
          { label: 'Alsjeblieft.', reply: 'Geesje vertrekt met haar eieren.' },
          { label: 'Ik… zeg het niet goed.', reply: 'Geesje: "Dat hoor ik."' },
        ] },
        { who: 'Kapitein Klaas', text: 'Mijn rubberboot is in beslag genomen. Tot de sluis ging het. Nu ben ik voor eigen rekening.', options: [
          { label: 'Alsjeblieft.', reply: 'Klaas tilt zijn pet op en vertrekt.' },
          { label: 'Wacht.', reply: 'Klaas wacht. Twee tellen.' },
          { label: 'Ik vind wel een boot.', reply: 'Klaas: "Daar ging het niet om."' },
        ] },
        { who: 'Wubbo', text: 'De brug draait op tijd. Maar vandaag draait hij voor een evenement.', options: [
          { label: 'Ik… zeg het niet goed.', reply: 'Wubbo knikt en loopt weg.' },
          { label: 'Wacht.', reply: 'Wubbo: "Ik heb een brug."' },
          { label: 'Blijf nog even.', reply: 'Wubbo kijkt naar zijn horloge.' },
        ] },
        { who: 'Roelfien', text: 'Mijn vliegvergunning is ingetrokken. Zeg het tegen Trijntje.', options: [
          { label: 'Wacht.', reply: 'Tinus: "Mijn schuur is leeg, maar Henk komt met een luik. Voor jou en je ruzie."' },
          { label: 'Alsjeblieft.', reply: 'Roelfien loopt naar buiten.' },
          { label: 'Voor ons.', reply: 'Tammo zegt: "Voor ons." Roelfien is al weg.' },
        ] },
      ],
    },
  ];
}
