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
}
