// Every effect ?sfxtest (sfxtest.js) can play, grouped. An entry plays either
// through the real audio-event path ({ ev }, the same code the game runs) or
// is a sample of the bank (buf, played via the 'fx' event). Pure data.
import { FX_INFO } from './fxbank.js';

const w = (sub, extra = {}) => ({ kind: 'weapon', sub, ...extra });

const GAME = [
  ['Wapens', 'Pistool', w('shot', { weapon: 'pistol' })],
  ['Wapens', 'Uzi', w('shot', { weapon: 'uzi' })],
  ['Wapens', 'Jachtgeweer', w('shot', { weapon: 'jachtgeweer' })],
  ['Wapens', 'Zwaai', w('swing')],
  ['Wapens', 'Leeg klikje', w('empty')],
  ['Wapens', 'Carbidbus: lont', w('fuse')],
  ['Wapens', 'Carbidbus: knal', w('carbid')],
  ['Wapens', 'Carbidbus: knal in water', w('carbid', { water: true })],
  ['Vuurwerk', 'Vuurpijl lanceert', w('launch')],
  ['Vuurwerk', 'Vuurpijl komt terug', w('incoming')],
  ['Vuurwerk', 'Vuurwerkbom', w('firework')],
  ['Vuurwerk', 'Barst', w('burst')],
  ['Aardbeving', 'Rommelen', w('rumble', { dur: 5 })],
  ['Verkeer', 'Claxon', { kind: 'horn' }],
  ['Verkeer', 'Fietsbel', { kind: 'bell' }],
  ['Verkeer', 'Deur open', { kind: 'door_open' }],
  ['Verkeer', 'Deur dicht', { kind: 'door_close' }],
  ['Verkeer', 'Motor aan', { kind: 'engine_start' }],
  ['Verkeer', 'Motor uit', { kind: 'engine_stop' }],
  ['Spoor', 'Overwegbel', { kind: 'crossing_bell' }],
  ['Spoor', 'Treinhoorn', { kind: 'train_horn' }],
  ['Spoor', 'Wielen over de lassen', { kind: 'train_clack', strength: 0.7 }],
  ['Mensen', 'Schreeuw', { kind: 'shout', strength: 0.8 }],
  ['Mensen', 'Hikken', { kind: 'hiccup' }],
  ['Mensen', 'Giechelen', { kind: 'giggle', female: true }],
  ['Mensen', 'Fluitje', { kind: 'whistle' }],
  ['Dieren', 'Duif', { kind: 'coo' }],
  ['Dieren', 'Kraai', { kind: 'caw' }],
  ['Water', 'Plons', { kind: 'splash' }],
  ['Stad', 'Alarm', { kind: 'alarm' }],
  ['Stad', 'Camera', { kind: 'camera_shutter' }],
  ['Menu', 'Melding', { kind: 'notify' }],
  ['Menu', 'Prestatie', { kind: 'prestatie' }],
  ['Menu', 'Prestatie (groot)', { kind: 'achievement' }],
];

const GROUP_OF = { explosie: 'Knallen', wapen: 'Wapens', winkel: 'Winkel', brug: 'Bruggen', spoor: 'Spoor', water: 'Water', kermis: 'Kermis', deur: 'Deuren', voertuig: 'Voertuigen', sport: 'Sport' };

export const FX_LIST = [
  ...Object.entries(FX_INFO).map(([name, i]) => ({ id: `fx:${name}`, group: GROUP_OF[i.cat] || 'Overig', label: i.label, buf: name, ev: { kind: 'fx', name } })),
  ...GAME.map(([group, label, ev], k) => ({ id: `ev:${k}`, group, label, ev })),
];

export function groupedFx() {
  const out = new Map();
  for (const e of FX_LIST) {
    if (!out.has(e.group)) out.set(e.group, []);
    out.get(e.group).push(e);
  }
  return out;
}
