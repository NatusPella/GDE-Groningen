// Every effect ?sfxtest (sfxtest.js) can play, grouped. An entry plays either
// through the real audio-event path ({ ev }, the same code the game runs) or
// is a sample of the bank (buf, played via the 'fx' event). Pure data.
import { FX_INFO } from './fxbank.js';
import { SFX_MAP } from './sfxmap.js';
import { FILE_SURFACES } from './steps.js';

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
  // de dieren van de omgeving (sfx/ambience.js ANIMALS), als losse roep (cutscenes, cutscenesfx.js)
  ['Dieren', 'Meeuw', { kind: 'animal', name: 'seagull' }],
  ['Dieren', 'Eend', { kind: 'animal', name: 'duck' }],
  ['Mensen', 'Applaus', { kind: 'applause', strength: 0.7 }],
];

const GROUP_OF = { ui: 'Menu', explosie: 'Knallen', wapen: 'Wapens', winkel: 'Winkel', brug: 'Bruggen', spoor: 'Spoor', water: 'Water', kermis: 'Kermis', deur: 'Deuren', voertuig: 'Voertuigen', sport: 'Sport', sting: 'Stings' };

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

// A stable sfx id (cutscenesfx.js) -> the audio event the game plays for it, or null when the game has no such sound:
//   'fx:<name>'     an effect of the bank (fxbank.js), also a base name with variants ('horeca_hap' for horeca_hap_0..2)
//   'sfx:<key>'     an event of the central sound map (sfxmap.js), played by name like the other recordings
//   'ev:<kind>'     an event of the list above ('ev:bell', 'ev:door_open'); 'ev:<kind>/<sub>' picks the sub or name ('ev:weapon/carbid', 'ev:animal/seagull')
//   'stap:<surface>' a recorded footstep of the player's feet (steps.js FILE_SURFACES): { kind: 'sample', key: 'stap_<surface>_0' }
export function sfxIdEvent(id) {
  if (typeof id !== 'string') return null;
  const i = id.indexOf(':');
  if (i < 1) return null;
  const fam = id.slice(0, i), name = id.slice(i + 1);
  if (!name) return null;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  if (fam === 'fx') return own(FX_INFO, name) || own(FX_INFO, name + '_0') ? { kind: 'fx', name } : null;
  if (fam === 'sfx') return own(SFX_MAP, name) ? { kind: 'fx', name } : null;
  if (fam === 'stap') return FILE_SURFACES.includes(name) ? { kind: 'sample', key: `stap_${name}_0`, surface: name } : null;
  if (fam === 'ev') {
    const [kind, sub] = name.split('/');
    const hit = GAME.find(([, , ev]) => ev.kind === kind && (!sub || ev.sub === sub || ev.name === sub));
    return hit ? { ...hit[2] } : null;
  }
  return null;
}
