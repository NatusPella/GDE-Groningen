// De kamertoon van een pand (epic Interieurs, #1164): wat je binnen hoort per soort pand, als data. interiors.js zet
// world.insideKind en world.insideSub zolang de speler in een pand staat; sfx/ambience.js vraagt hier de niveaus van de
// lagen (menigte, kamertoon, machinebrom) en audio.js het laagdoorlaatfilter van de muziek (de radio en G-Music klinken
// door een muur). De ambience-id komt uit KINDS[kind].ambience (interiorkinds.js), dus een nieuwe soort pand zonder
// toon valt in de test op. Puur en lokaal: elke speler hoort zijn eigen kamer, er gaat niets over het netwerk.
import { KINDS } from '../interiorkinds.js';

// per ambience-id: crowd = menigtebed (0 tot 1), room = kamertoon 'binnen' (0 tot 1), machine = industriebrom (0 tot 1),
// musicHz = laagdoorlaat van de muziek binnen (20000 = open)
export const ROOM_TONES = {
  winkel: { crowd: 0.05, room: 0.25, machine: 0, musicHz: 3200 },
  horeca: { crowd: 0.22, room: 0.25, machine: 0, musicHz: 2600 },
  kantoor: { crowd: 0.03, room: 0.26, machine: 0, musicHz: 2200 },
  woning: { crowd: 0, room: 0.25, machine: 0, musicHz: 3800 },
  kerk: { crowd: 0, room: 0.12, machine: 0, musicHz: 900 },
  station: { crowd: 0.14, room: 0.2, machine: 0, musicHz: 3000 },
  bibliotheek: { crowd: 0, room: 0.12, machine: 0, musicHz: 1100 },
  garage: { crowd: 0, room: 0.28, machine: 0.1, musicHz: 3400 },
};

// varianten van een soort pand die anders klinken dan hun soort
const SUB_TONES = {
  school: { crowd: 0.1, room: 0.22 },
  ziekenhuis: { crowd: 0.05, room: 0.2 },
  museum: { crowd: 0.02, room: 0.12, musicHz: 1300 },
  bioscoop: { crowd: 0.04, room: 0.14, musicHz: 1500 },
  sportschool: { crowd: 0.12, room: 0.22, machine: 0.05, musicHz: 4200 },
  hotel: { crowd: 0.04, room: 0.2 },
  kapel: { crowd: 0, room: 0.1, musicHz: 800 },
  magazijn: { crowd: 0, room: 0.28, machine: 0.12 },
};

export const OUTDOOR_MUSIC_HZ = 20000;
const NONE = { crowd: 0, room: 0.25, machine: 0, musicHz: OUTDOOR_MUSIC_HZ };

// de ambience-id van een soort pand ('winkel', 'horeca', ... of null)
export const ambienceOf = (kind) => (KINDS[kind] ? KINDS[kind].ambience : null);

// de niveaus van een pand: { crowd, room, machine, musicHz }; een onbekende soort of buiten krijgt de neutrale kamertoon
export function roomTone(kind, sub = null) {
  const base = ROOM_TONES[ambienceOf(kind)];
  if (!base) return NONE;
  const over = sub ? SUB_TONES[sub] : null;
  return over ? { ...base, ...over } : base;
}

// het laagdoorlaatfilter (Hz) van de muziek terwijl je in dit pand staat (buiten: open)
export const roomMusicHz = (kind, sub = null) => (kind ? roomTone(kind, sub).musicHz : OUTDOOR_MUSIC_HZ);
