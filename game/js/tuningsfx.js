// Geluid van de pimp-werkplaats en de kapper (epic Autotuning ronde 4, #1155): één dunne laag tussen het scherm en de centrale geluidstabel
// (sfx/sfxmap.js, SFX ronde 5). Een scherm zegt wat er gebeurt ("lak", "velgen", "installeren"), dit bestand kiest het geluid en vraagt
// het via sfxEvent. Lokaal: elke speler hoort het van zijn eigen scherm; er is geen netwerkbericht, beloning of voortgang.
//
// sfxEvent staat in sfx/haken.js van main; een branch zonder die functie valt terug op haakFx (dezelfde audio-gebeurtenis, zonder de tabel) en
// op stilte als ook dat ontbreekt. Een fout in een haak raakt het spel nooit. Test: scripts/tuningsfx_test.mjs.
import * as haken from './sfx/haken.js';

// Welk geluid hoort bij een wisseling in een categorie van het voorbeeld (showroomplan.js categoryOfField).
export const CHANGE_SFX = {
  lak: 'spray_can', strepen: 'spray_can', velgen: 'wrench_ratchet', carrosserie: 'wrench_ratchet', licht: 'neon_buzz_on',
  details: 'ui_item_equip', snack: 'ui_item_equip', onderdelen: 'impact_wrench',
};
// Wat er bij Installeren klinkt, uit de velden die veranderden: onderdelen met de slagmoersleutel, lak met de spuitbus, licht met neon, de rest met de ratel.
export const installSfx = (changedFields = [], hasPart = false) => {
  const out = [];
  if (hasPart) out.push('impact_wrench');
  if (changedFields.includes('body') || changedFields.includes('finish') || changedFields.includes('color2')) out.push('spray_can');
  if (changedFields.includes('glow') || changedFields.includes('lamps') || changedFields.includes('lampColor')) out.push('neon_buzz_on');
  if (!out.length || changedFields.some((f) => !['body', 'finish', 'color2', 'glow', 'lamps', 'lampColor'].includes(f))) out.push('wrench_ratchet');
  return [...new Set(out)];
};

// Kapper: schaar bij een kapsel, tondeuse bij kaal of kort, föhn bij een kleur.
export const hairSfx = (style, colorChanged = false) => {
  if (colorChanged) return 'hairdryer_blast';
  return style === 'bald' || style === 'buzz' || style === 'undercut' || style === 'mohawk' ? 'hair_clipper' : 'scissors_snip';
};

// Eén geluid vragen. x en y zijn optioneel (zonder: de plek van de speler); gain is optioneel (de tabel kent de standaard).
export function play(world, key, x, y, opts = {}) {
  try {
    if (!world || !key) return false;
    if (typeof haken.sfxEvent === 'function') return !!haken.sfxEvent(world, key, x, y, opts);
    if (typeof haken.haakFx === 'function') return !!haken.haakFx(world, key, x, y, opts.gain ? { gain: opts.gain } : {});
  } catch (e) { /* een geluid mag het scherm nooit breken */ }
  return false;
}

export const sfxForChange = (category) => CHANGE_SFX[category] || null;

// Handig voor het scherm: een wissel in een categorie.
export const playChange = (world, category) => { const k = sfxForChange(category); return k ? play(world, k) : false; };
export const playInstall = (world, fields, hasPart) => installSfx(fields, hasPart).map((k) => play(world, k, undefined, undefined, {})).some(Boolean);
export const playHair = (world, style, colorChanged) => play(world, hairSfx(style, colorChanged));
