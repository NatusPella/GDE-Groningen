// The picture behind the load screens and the boot screen: one of the game's
// own renders (img/laad/), never a separate illustration style. This file is
// the approved set (see DESIGN_SYSTEM.md "Beeldstijl"): which picture belongs
// to which kind of place or mission, with its alt text. loadscreen.js and
// startscreen.js put it in; scripts/loadlogic_test.mjs checks the set. Pure
// string builder, no DOM.

export const PICTURES = {
  vismarkt: 'Vismarkt in Groningen, overdag',
  luchtfoto: 'Luchtfoto van de binnenstad',
  rondvaart: 'Een rondvaartboot op de gracht',
  kermis: 'De kermis bij avond',
  ringrace: 'De ringweg',
  achtervolging: 'Een straat bij nacht',
  duif: 'Grunn van boven',
};
export const APPROVED = Object.keys(PICTURES);

// one background per kind of mission (story, side jobs, races, pigeon flights)
export const MISSION_PICTURE = {
  verhaal: 'vismarkt',
  rondvaart: 'rondvaart',
  race: 'ringrace',
  achtervolging: 'achtervolging',
  kermis: 'kermis',
  duif: 'duif',
  overzicht: 'luchtfoto',
};
export const missionPicture = (kind) => MISSION_PICTURE[kind] || 'vismarkt';

export const pictureOk = (name) => APPROVED.includes(name);

// cls: 'ls-bg' on the load screens, 'bt-bg' on the boot screen
export function pictureHtml(name, cls = 'ls-bg') {
  const n = pictureOk(name) ? name : 'vismarkt';
  return `<img class="${cls}" src="img/laad/${n}.jpg" alt="${PICTURES[n]}" decoding="async">`;
}
