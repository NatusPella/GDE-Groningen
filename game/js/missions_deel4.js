// The provincial missions of the new story, akte 2 to 5 (storyarc_nieuw.js; docs/verhaal/nieuw 02-05):
// the defs of the ids that follow 'loket' and 'bakkiestunt' in NEW_MISSION_IDS (same order), and how
// the arc restages the defs it shares with the old one (the old defs are the city's, with the old
// plot's text). Every mission is a chain of small stages (goto, scene, hold) on real places of the
// province (deel4places.js) with the script's scenes (script.json); the heavy mechanics of the design
// (the plane, the boat chase on the Waddenzee, the colonne AI, the steam train) are NOT built: each of
// those missions plays as the walk or drive between its places, with the scene at each place.
// Only used with the feature flag `nieuwverhaal` (storyflag.js). Not yet looked at in the game.
import { placeSpot } from './deel4places.js';

const T = (place, off, label) => ({ place, off, snap: 'walk', label });
// drive or walk to a place
const go = (place, off, label, say, extra = {}) => ({ kind: 'goto', target: T(place, off, label), mode: 'any', radius: 45, label, say, ...extra });
// a script scene where you stand (the cast stands round you)
const sc = (ids, label, kicker, extra = {}) => ({ kind: 'scene', label, kicker, script: { ids: [].concat(ids) }, ...extra });
// stand still at a place for `time` seconds; ticks are said at one and two thirds
const hold = (place, off, label, say, time, ticks, extra = {}) => ({ kind: 'hold', target: T(place, off, label), radius: 16, time, mode: 'foot', label, say, ticks, ...extra });

export function buildDeel4Defs({ walk }) {
  const at = (place, off = [0, 0]) => {
    const q = placeSpot(place, off) || { x: 0, y: 0 };
    return walk(q.x, q.y);
  };
  return [
    {
      // M09 Heel aankomen is ook een kunst (id eieren): Geesje's last six crates from Warffum to the church cellar in Usquert
      type: 'stages',
      label: 'Heel aankomen is ook een kunst',
      intro: ['Geesje in Warffum heeft de laatste zes kratten eieren van het Hogeland: zestig stuks. Oma\'s recept van 1953 heeft er zestig nodig.', 'Rij ze heel naar de kerkkelder in Usquert. Jelle sloot de Dorpsweg af: neem de wierdepaden, en rij rustig.'],
      outro: 'Zestig eieren heel in de kerkkelder. Een kerkelijk wonder.',
      timeLimit: null,
      reward: 400,
      start: at('Warffum', [0, 0]),
      eggs: { from: 1, failAt: 30, fail: 'meer dan de helft van de eieren is stuk. Sikkom, opnieuw laden' },
      stages: [
        sc('M09.2', 'De afgesloten Dorpsweg', 'Warffum', { cast: [{ key: 'jelle', pose: 'self', at: [3, 1] }, { key: 'boer', pose: 'hips', at: [2.4, -2.4] }] }),
        go('Usquert', [0, 0], 'Rij de eieren naar de kerkkelder in Usquert', 'Over de wierdepaden naar Usquert. Rustig, Tammo. Heel.', { talk: { ids: ['M09.3'], delay: 4 }, radius: 35, stop: 0.8 }),
      ],
    },
    {
      // M10 Een trekker-limo op de wierde (id wierde): Jelle with the case; the chase to the ditch at Uithuizen
      type: 'stages',
      label: 'Een trekker-limo op de wierde',
      intro: ['Jelle rijdt het erf van Geesje op, met een gouden koffer in zijn hand. Hij zegt dat de Gouden Eierbal erin zit.', 'Als hij de koffer loslaat, pakken jullie hem: schud de trekker-limo af en haal hem in bij de sloot bij Uithuizen.'],
      outro: 'Jelle viel in de sloot, met de koffer boven water. Durk en Douwe vingen hem op.',
      timeLimit: 600,
      reward: 500,
      start: at('Usquert', [-250, 150]),
      stages: [
        go('Usquert', [350, -80], 'Over het kerkenpad', 'Links, over het kerkenpad. De limo zit dicht achter ons.', { talk: { ids: ['M10.2'], delay: 1.5 }, radius: 40 }),
        go('Uithuizen', [-300, 120], 'De sloot bij Uithuizen', 'Naar de sloot bij Uithuizen. Hij springt, zei hij.', { radius: 40, stop: 0.6 }),
      ],
    },
    {
      // M13 Het containerlabyrint (id containers): Eemshaven, swap the papers of container 4471 before the ship leaves
      type: 'stages',
      label: 'Het containerlabyrint',
      intro: ['Lammert, havenmeester van de Eemshaven, wijst naar de stapels: Jelles schip vertrekt om zes uur, met de voorraad van Oma\'s vrienden aan boord.', 'Vind container 4471 en verwissel de papieren. De kraan piept: bij het tweede piepje kijkt de bewaker omhoog.'],
      outro: 'De papieren zijn verwisseld. Het schip vaart leeg weg.',
      timeLimit: 420,
      reward: 600,
      onFoot: true,
      start: at('Eemshaven', [0, 0]),
      stages: [
        go('Eemshaven', [120, -60], 'Naar de kraankooi', 'Naar de kraankooi. Blijf uit het zicht van de bewaker.', { mode: 'foot', radius: 14, talk: { ids: ['M13.2'], delay: 1.5 } }),
        hold('Eemshaven', [120, -60], 'Wacht in de kraankooi op het tweede piepje', 'Wacht tot de kraan het tweede piepje geeft.', 9, ['Eén piepje. De bewaker kijkt nog niet.', 'Twee piepjes. Nu kijkt hij omhoog.']),
        go('Eemshaven', [-90, 150], 'Container 4471', 'Container 4471, rij vier. Verwissel de papieren.', { mode: 'foot', radius: 12, stop: 2 }),
      ],
    },
    {
      // M14 De dijk (id dijk): the race along the dyke to the lock at Delfzijl before the bailiff
      type: 'stages',
      label: 'De dijk',
      intro: ['Jelles deurwaarder legt om acht uur beslag op de ligplaats van het woonschip van Oma\'s vrienden bij de sluis van Delfzijl.', 'Wees eerder aan de sluis dan de deurwaarder. Over de dijk, voorbij de schapen.'],
      outro: 'Het beslag mislukt: het woonschip staat sinds vanochtend op naam van Trijntje.',
      timeLimit: 900,
      reward: 500,
      vehicle: 'car',
      start: at('Eemshaven', [-300, 400]),
      stages: [
        go('Delfzijl', [-2700, -6000], 'De dijk langs de Eems', 'De dijk op. Schaap links, Tammo.', { mode: 'vehicle', radius: 60, talk: { ids: ['M14.2'], delay: 6 } }),
        go('Delfzijl', [0, 0], 'De sluis van Delfzijl', 'Door naar de sluis. De deurwaarder komt vast ook net aan.', { mode: 'any', radius: 40, stop: 0.6 }),
      ],
    },
    {
      // M15 Laag over het graan (id graan): the banner over the kermis of Winschoten (no plane yet: on the ground)
      type: 'stages',
      label: 'Laag over het graan',
      intro: ['Roelfien, graanboerin en vlieger, is Oma\'s nicht. Op de kermis in Winschoten koopt Jelle de juryleden met een gratis proeverij.', 'Sleep een spandoek over de kermis, zodat iedereen het ziet. Het vliegtuig is er nog niet: Roelfien hangt het spandoek met jullie op.'],
      outro: 'Het hele Oldambt las het spandoek. De jury kijkt naar Jelle.',
      timeLimit: 600,
      reward: 500,
      start: at('Winschoten', [-1200, 300]),
      stages: [
        go('Winschoten', [-200, 40], 'Naar de kermis in Winschoten', 'Naar de kermis, met het spandoek.', { radius: 40 }),
        hold('Winschoten', [0, 0], 'Hang het spandoek over de kermis', 'Blijf bij de mast tot het spandoek hangt.', 10, ['Het ene touw zit vast.', 'Nog één knoop.']),
        sc('M15.2', 'Boven de kermis', 'Winschoten', { cast: [{ key: 'roelfien', pose: 'point', at: [3, 1.2] }, { key: 'jelle', pose: 'self', at: [4.5, -1.5] }] }),
      ],
    },
    {
      // M17 Open, dicht (id bruggen): eleven bridges at the beat of the fanfare, Veendam
      type: 'stages',
      label: 'Open, dicht',
      intro: ['Wubbo, brugwachter in Veendam, opent zijn elf bruggen op het ritme van de fanfare. Jelles mosterdschip moet er voor Oma langs.', 'Rij langs de bruggen en wees er op tijd. Mis je de maat, dan wacht je.'],
      outro: 'De mosterd gaat naar Oma. De limo van Jelle stond voor de laatste brug.',
      timeLimit: 600,
      reward: 500,
      start: at('Veendam', [-400, 100]),
      stages: [
        go('Veendam', [-150, 20], 'De eerste brug', 'De eerste brug. Wubbo draait hem open op de maat.', { radius: 25 }),
        sc('M17.2', 'De fanfare is weg', 'Veendam', { cast: [{ key: 'wubbo', pose: 'hips', at: [2.6, 0.6] }] }),
        go('Veendam', [500, -60], 'Langs de bruggen', 'Door, op het fluitsignaal. Zonder fanfare.', { radius: 30 }),
        go('Veendam', [1100, 120], 'De laatste brug', 'De laatste brug. Daarachter ligt de mosterd.', { radius: 30, stop: 0.6 }),
      ],
    },
    {
      // M18 Wie draaide de camera's uit? (id wiebelwerk): the web agency in Veendam, the log of 12 August
      type: 'stages',
      label: 'Wie draaide de camera\'s uit?',
      intro: ['Wiebelwerk in Veendam deed elke nacht om middernacht de update van het museum. Wie zette de camera\'s op 12 augustus langer uit?', 'Loop het kantoor in, laat je door de intake praten en zoek het logboek van 12 augustus.'],
      outro: 'Het logboek van Wiebelwerk wijst naar één klant. En naar een printje.',
      timeLimit: null,
      reward: 400,
      onFoot: true,
      start: at('Veendam', [250, -150]),
      stages: [
        go('Veendam', [250, -170], 'Wiebelwerk, de balie', 'Naar de balie van Wiebelwerk.', { mode: 'foot', radius: 12 }),
        sc('M18.2', 'De intake', 'Wiebelwerk', { cast: [{ key: 'accountmanager', pose: 'hips', at: [2.2, 0.4] }] }),
        go('Veendam', [260, -190], 'De serverruimte', 'Naar de serverruimte, zolang hij praat.', { mode: 'foot', radius: 10, stop: 1, talk: { ids: ['M18.3'], delay: 0.8 } }),
      ],
    },
    {
      // M19 Stoom (id stoom): the bribed driver, Tammo drives the steam train (gas and brake) to the next platform
      type: 'stages',
      label: 'Stoom',
      intro: ['De machinist van de stoomtrein is omgekocht en zit al een uur op een bankje. In de wagons zitten twee juryleden en de Bewaarder.', 'Tammo rijdt de trein naar het volgende perron: alleen gas en rem. Tessa gaat door de wagons.'],
      outro: 'Het volgende perron. Een jurylid stapt uit en laat zich niet kopen met een eierbal.',
      timeLimit: 600,
      reward: 700,
      onFoot: true,
      start: at('Stadskanaal', [0, 0]),
      stages: [
        go('Stadskanaal', [60, 30], 'Naar de stoomloc', 'Naar de loc op het perron.', { mode: 'foot', radius: 10 }),
        hold('Stadskanaal', [60, 30], 'Rij de trein: gas en rem', 'Gas erop, dan de rem. Tessa loopt door de wagons.', 16, ['Gas. De trein trekt op.', 'Rem. Daar komt het perron.'], { talk: { ids: ['M19.2'], delay: 1 } }),
      ],
    },
    {
      // M20 Het beleg van Bourtange (id beleg): the low point; the vesting, the moat, the powder cellar, the ball
      type: 'stages',
      label: 'Het beleg van Bourtange',
      intro: ['Het Beleg van Bourtange: de vesting speelt het na, met kartonnen kanonnen op de wallen. Jelles beleggers komen er ook.', 'Houd de vesting tegen de beleggers, spring over de gracht voor Durk en Douwe en bescherm de bal in de kruitkelder tot hij in het bakkie ligt.'],
      outro: 'De bal is weg. In de klomp: "Tige tank foar de auto. – J." De Fjord Frituur, zonder Fjord.',
      timeLimit: null,
      reward: 1000,
      onFoot: true,
      start: at('Vesting Bourtange', [0, 90]),
      stages: [
        go('Vesting Bourtange', [0, 40], 'De wallen', 'Naar de wallen. Berend deelt de kanonnen uit.', { mode: 'foot', radius: 15 }),
        go('Vesting Bourtange', [60, 0], 'De gracht', 'Over de gracht, voor Durk en Douwe.', { mode: 'foot', radius: 12, stop: 0.8, talk: { ids: ['M20.2'], delay: 1 } }),
        go('Vesting Bourtange', [-13, 33], 'De kruitkelder', 'In de kruitkelder ligt de bal. Mem is er ook.', { mode: 'foot', radius: 8 }),
        sc('M20.3', 'De kruitkelder', 'Vesting Bourtange', { cast: [{ key: 'jelle', pose: 'hold', at: [2.4, 0.8] }, { key: 'mem', pose: 'point', at: [3.2, -1.4] }, { key: 'trijntje', pose: 'hips', at: [1.4, 2.4] }, { key: 'berend', pose: 'hips', at: [-1.6, 2.6] }] }),
        hold('Vesting Bourtange', [-13, 33], 'Houd de bal vast in de kruitkelder', 'Blijf bij de bal tot hij in het bakkie ligt.', 18, ['Het kruit ruikt naar boter.', 'Nog even. Tammo houdt de deur.'], { talk: { ids: ['M20.4'], delay: 1 } }),
        go('Vesting Bourtange', [0, 140], 'Het bakkie bij de poort', 'Met de bal naar het bakkie bij de poort.', { mode: 'foot', radius: 12, stop: 0.6 }),
      ],
    },
    {
      // M22 Een luik erin (id luik): Tinus' barn, the hatch in the Escapade, the mud
      type: 'stages',
      label: 'Een luik erin',
      intro: ['Tinus, trekkertrekker, heeft een schuur in het Westerkwartier. Henk belde: jullie zoeken een luik in de Escapade.', 'Bouw een luik in de zijkant, bewijs dat de as het houdt in de modder, en trek hem met Tinus\' trekker eruit.'],
      outro: 'Een wagen met een luik. De Fjord Frituur bestaat. Alleen de bal ontbreekt.',
      timeLimit: null,
      reward: 600,
      onFoot: true,
      start: at('Zuidhorn', [2300, 700]),
      stages: [
        go('Zuidhorn', [2300, 740], 'De garage in de schuur', 'Naar de werkplaats achterin de schuur.', { mode: 'foot', radius: 14 }),
        sc('M22.2', 'De garage', 'Het Westerkwartier', { cast: [{ key: 'henk', pose: 'hips', at: [2.2, 0.6] }] }),
        hold('Zuidhorn', [2500, 900], 'Blijf in de modder, Tinus trekt', 'In de modder. Tinus trekt je eruit.', 14, ['De as piept.', 'Het luik houdt het.'], { talk: { ids: ['M22.3'], delay: 1 } }),
      ],
    },
    {
      // M23 De colonne (id colonne): everyone in one line from the Westerkwartier to the Grote Markt (the colonne AI is not built)
      type: 'stages',
      label: 'De colonne',
      intro: ['Mem en Oma Trijntje hebben hun vrienden gebeld: Geesje, Wubbo, Klaas, Berend. Ze komen allemaal.', 'Rijd met alle vrienden van Oma in één colonne naar de Grote Markt, zonder dat Jelle ons splitst.'],
      outro: 'We zijn er. Allemaal.',
      timeLimit: null,
      reward: 800,
      vehicle: 'car',
      start: at('Zuidhorn', [2300, 700]),
      stages: [
        go('Zuidhorn', [-2500, 600], 'De colonne rijdt weg', 'De colonne rijdt weg. Blijf voorop, hou ze bij elkaar.', { mode: 'vehicle', radius: 60, talk: { ids: ['M23.2'], delay: 4 } }),
        go('Hoogkerk', [0, 0], 'Hoogkerk, bij de brug', 'Door Hoogkerk, naar de stad.', { mode: 'vehicle', radius: 60 }),
        sc('M23.3', 'Durk en Douwe lopen over', 'Hoogkerk', { cast: [{ key: 'durk', pose: 'arms', at: [3, 1] }, { key: 'douwe', pose: 'arms', at: [3, -1] }] }),
        { kind: 'goto', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, mode: 'any', radius: 25, stop: 0.8, label: 'De Grote Markt', say: 'De Grote Markt. Allemaal samen.' },
      ],
    },
  ];
}

// How the arc restages the defs it shares with the old one (matched by label). The old stage scenes
// carry the old plot's text, so the stages of the changed ones are replaced; the list keeps its order.
export function applyDeel4(list, { walk }) {
  const at = (place, off = [0, 0]) => {
    const q = placeSpot(place, off) || { x: 0, y: 0 };
    return walk(q.x, q.y);
  };
  const i = (label) => list.findIndex((d) => d.label === label);
  const put = (label, def) => { const k = i(label); if (k >= 0) list[k] = { ...def, label }; };

  // M08 Fatbikes: the lane stays in the city; Tessa and Tammo talk on the way
  const fat = list[i('Fatbikes tellen niet als fiets')];
  if (fat && fat.notes && fat.notes[0]) fat.notes[0].talk = { ids: ['M08.2'], delay: 0.5 };

  // M11 Geleend van de Friezen: Zoutkamp, the sluice, the salt flats of Noordpolderzijl (on foot and by road)
  put('Geleend van de Friezen', {
    type: 'stages',
    intro: ['Kapitein Klaas in Zoutkamp leent jullie een snelle boot, tot de sluis. Jelles skûtsje gooit los, en het zout van Oma ligt bij Noordpolderzijl.', 'Haal Jelles skûtsje in, haal daarna het wadzout van de kwelder, blijf uit het licht van de kustwacht en wees terug voor het water komt.'],
    outro: 'Het zout is van Oma. Jelle heeft het nakijken.',
    timeLimit: 900,
    reward: 1300,
    start: at('Zoutkamp', [200, 0]),
    stages: [
      sc('M11.2', 'Het skûtsje', 'Zoutkamp', { cast: [{ key: 'klaas', pose: 'point', at: [2.6, 0.6] }] }),
      go('Lauwersoog', [0, 0], 'Het skûtsje bij Lauwersoog', 'Achter het skûtsje aan, naar Lauwersoog.', { radius: 40 }),
      sc('M11.3', 'Aan boord', 'Lauwersoog', { cast: [{ key: 'klaas', pose: 'hips', at: [2.4, 0.8] }] }),
      go('Noordpolderzijl', [0, 0], 'De kwelder bij Noordpolderzijl', 'Naar de kwelder, het water is weg.', { mode: 'foot', radius: 35, talk: { ids: ['M11.4'], delay: 3 } }),
      sc('M11.5', 'De zandplaat', 'Het wad', { cast: [{ key: 'klaas', pose: 'hips', at: [2.4, 0.8] }] }),
      sc('M11.6', 'De lange blik', 'Onder de sterren', { big: 'Een uur wachten onder de sterren.' }),
      hold('Noordpolderzijl', [60, 20], 'Schep het zout uit de drie kuipen', 'Schep het zout, en blijf uit het zoeklicht.', 12, ['De eerste kuip is vol.', 'De tweede. Het licht gaat langs.']),
      sc('M11.7', 'De kwelder', 'Noordpolderzijl', { cast: [{ key: 'kustwachter', pose: 'hips', at: [3.5, 1.5] }] }),
      go('Noordpolderzijl', [-300, 40], 'Terug voor de vloed', 'Terug naar de boot, voor het water komt.', { mode: 'foot', radius: 20, stop: 0.6 }),
    ],
  });

  // M12 Het staat niet in het rooster: from the UMCG roof to the balloon over the Dollard (the helicopter run stays out of it)
  put('Het staat niet in het rooster', {
    type: 'stages',
    intro: ['Dokter Dijkstra van het UMCG heeft zijn traumaheli in onderhoud en een lunch die niet op tijd komt. Rotor Roelf leent zijn demoheli.', 'Vlieg naar de Dollard, houd de heli stil naast Jelles ballon en pak de aktetas met zijn koopboek.'],
    outro: 'Het koopboek van Jelle: acht plakjes, en welke hij als volgende koopt.',
    timeLimit: null,
    reward: 1500,
    // the start moves to the UMCG helipad once the pads exist (resolveSpotStarts)
    start: walk(-26.58, 878.55),
    startSpot: 'umcg',
    stages: [
      sc('M12.2', 'De lunch', 'Het UMCG', { cast: [{ key: 'rotor', pose: 'hips', at: [2.4, 0.8] }, { key: 'dijkstra', pose: 'point', at: [3, -1.2] }] }),
      go('Dollard', [0, 0], 'Naar de Dollard', 'Naar de Dollard, achter de gele ballon aan.', { radius: 80 }),
      hold('Dollard', [0, 0], 'Blijf stil naast de mand', 'Stil houden naast de mand. Tammo pakt de aktetas.', 14, ['De ballon schommelt.', 'De riem van de aktetas gaat los.'], { mode: 'any', radius: 60, talk: { ids: ['M12.3'], delay: 1 } }),
    ],
  });

  // M16 Nog eentje dan: three tents of the kermis in Winschoten, the bumper-car ride, the answer
  put('Nog eentje dan', {
    type: 'stages',
    intro: ['Geert van de Poelestraat belde: twee Friese reuzen zitten aan zijn bar en ze zingen al. Ze zitten nu op de kermis in Winschoten.', 'Loop drie kermistenten af om Durk en Douwe bij te houden, en win dan een rit botsauto\'s: wie wint, krijgt een antwoord.'],
    outro: 'Een antwoord, een kus op de dijk, en een kater.',
    timeLimit: null,
    reward: 600,
    onFoot: true,
    start: at('Winschoten', [-80, 40]),
    stages: [
      go('Winschoten', [0, 0], 'De eerste tent', 'De eerste tent. Proost!', { mode: 'foot', radius: 14, stop: 1 }),
      sc('M16.2', 'Tussen de tenten', 'De kermis', { cast: [{ key: 'student', pose: 'cheer', at: [2.6, 0.8] }] }),
      go('Winschoten', [90, 60], 'De tweede tent', 'De tweede tent. Nog eentje dan.', { mode: 'foot', radius: 14, stop: 1 }),
      go('Winschoten', [-70, 110], 'De derde tent', 'De derde tent. Durk en Douwe zijn al bij de botsauto\'s.', { mode: 'foot', radius: 14, stop: 1 }),
      sc('M16.3', 'De botsauto\'s', 'De kermis', { cast: [{ key: 'durk', pose: 'arms', at: [3, 1] }, { key: 'douwe', pose: 'arms', at: [3, -1] }] }),
      sc('M16.4', 'De rit en de kus', 'De kermis', { cast: [{ key: 'kermisexploitant', pose: 'hips', at: [3.4, 1.4] }, { key: 'durk', pose: 'arms', at: [3, -1.6] }] }),
      sc('M16.5', 'Het antwoord', 'Op de dijk', { cast: [{ key: 'durk', pose: 'shrug', at: [2.8, 0.8] }, { key: 'douwe', pose: 'shrug', at: [2.8, -0.8] }] }),
    ],
  });

  // M21 Iedereen heeft een rode auto gezien: Tessa at the level crossing at Zuidhorn, Tammo with the friends in the barn
  put('Iedereen heeft een rode auto gezien', {
    type: 'stages',
    intro: ['Tessa en Tammo gaan allebei hun eigen kant op: zij naar de overweg, hij naar de vrienden van Oma.', 'Tessa: haal de Escapade terug van de trein. Tammo: houd Oma\'s vrienden bij elkaar, ook al zeggen ze nee.'],
    outro: 'Tammo hield de vrienden bij elkaar. Zonder hen is er geen recept.',
    timeLimit: null,
    reward: 1100,
    start: at('Zuidhorn', [-300, -200]),
    stages: [
      sc('M21.2', 'De overweg bij Zuidhorn', 'Tessa', { solo: true, cast: [{ key: 'berend', pose: 'hips', at: [2.6, 0.6] }, { key: 'jelle', pose: 'self', at: [4, -1.4] }] }),
      hold('Zuidhorn', [-300, -200], 'Blokkeer de overweg', 'Blijf op de overweg staan tot de trein stopt.', 8, ['De bellen gaan.', 'De slagbomen gaan dicht.'], { mode: 'any', radius: 20 }),
      sc('M21.3', 'De wagon', 'Tessa', { solo: true, cast: [{ key: 'henk', pose: 'hips', at: [2.6, 0.6] }] }),
    ],
  });

  // M24 Vlag: the old stages stay (the pigeon pecks the five ropes); the script's lines are said during the flight
  const vlag = list[i("Er hangt iets Fries aan d'Olle Grieze")];
  if (vlag) {
    const p = vlag.stages.find((q) => q.kind === 'pigeon');
    if (p) p.talk = { ids: ['M24.2'], delay: 6 };
  }

  // M25 Het bod viel tegen: Oma's kitchen at the Noorderhaven, the practice round with coarse flour, Jelle's offer
  put('Het bod viel tegen', {
    type: 'stages',
    intro: ['Oma Trijntje heeft mosterd, eieren, zout, vet en het meel van Roelfien klaarstaan. Grove mosterd, niet dat zoete spul.', 'Bak een oefenronde eierballen met alle vijf de ingrediënten, en wijs Jelles bod af.'],
    outro: 'De eieren zijn heel, en het bod is afgewezen. Morgen volgt het goud.',
    timeLimit: null,
    reward: 600,
    onFoot: true,
    start: walk(-289.25, -106.7),
    stages: [
      sc('M25.2', 'Het bakken', 'Oma\'s keuken', { cast: [{ key: 'trijntje', pose: 'hips', at: [2.2, 0.6] }, { key: 'mem', pose: 'point', at: [3, -1.4] }] }),
      hold('Noorderhaven', [0, 0], 'Bak de oefenronde', 'Eerst het ei. Dan het zout. Dan het meel.', 18, ['De eerste ronde gaat het vet in.', 'Goudbruin. Bijna.'], { target: { at: [-289.25, -106.7], snap: 'walk', label: 'Oma\'s keuken' }, radius: 12 }),
      sc('M25.3', 'Het bod', 'Oma\'s keuken', { cast: [{ key: 'jelle', pose: 'self', at: [2.8, 0.6] }] }),
    ],
  });

  // M26 Ontzet: the competition on the Grote Markt (baking, the blockade, the jury, the five words)
  put('Ontzet, net als in 1672', {
    type: 'stages',
    intro: ['Gronings Ontzet. De Noordelijke Snackprijs op de Grote Markt, Berend in de jury en een luik in de Escapade: de Fjord Frituur.', 'Bak de Groningse eierbal, houd de kraam heel, stop Jelles laatste plakje bij de notaris en laat de jury kiezen.'],
    outro: 'De Snackprijs gaat naar Grunn. De standplaats is van de Fjord Frituur.',
    timeLimit: null,
    reward: 4000,
    start: walk(176.46, 116.21),
    stages: [
      { kind: 'goto', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, mode: 'any', radius: 12, label: 'Naar de kraam op de Grote Markt', say: 'Naar de kraam. De uitzending begint.' },
      sc('M26.2', 'De regels', 'Gronings Ontzet', { cast: [{ key: 'berend', pose: 'hips', at: [2.4, 0.8] }, { key: 'jelle', pose: 'self', at: [4, -1.2] }] }),
      { kind: 'hold', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, radius: 9, time: 40, mode: 'foot', label: 'Bak de Groningse eierbal in drie rondes', say: 'Drie rondes: het ei, het zout, het meel. Niet zeuren, zegt Oma.', ticks: ['De eerste ronde gaat de pan in.', 'De tweede ronde. Durk en Douwe kijken mee.'], talk: { ids: ['M26.3'], delay: 1 } },
      { kind: 'goto', target: { at: [-61.63, -38.94], snap: 'walk', label: 'Oude Boteringestraat' }, mode: 'any', radius: 25, stop: 0.8, label: 'Blokkeer de Oude Boteringestraat', say: 'Sluit de straat af met de wagen: de limo mag er niet langs.', talk: { ids: ['M26.4'], delay: 1 } },
      sc('M26.5', 'Mem', 'Gronings Ontzet', { cast: [{ key: 'mem', pose: 'point', at: [2.6, 0.6] }, { key: 'jelle', pose: 'self', at: [3.8, -1.2] }] }),
      { kind: 'goto', target: { landmark: 'Grote Markt', off: [20, -5], snap: 'walk' }, mode: 'any', radius: 12, stop: 0.8, label: 'Terug naar de jurytafel', say: 'Terug naar de jury. Zij kiest nu.' },
      sc('M26.6', 'De jury', 'Gronings Ontzet', { cast: [{ key: 'berend', pose: 'hips', at: [2.4, 0.8] }, { key: 'jurylid', pose: 'hips', at: [3.2, -1.2] }, { key: 'trijntje', pose: 'hips', at: [1.4, 2.6] }, { key: 'mem', pose: 'point', at: [3.4, 2] }] }),
      sc('M26.7', 'De vijf woorden', 'Achter de kraam', { cast: [] }),
    ],
  });
}
