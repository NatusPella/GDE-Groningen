// Settings rules, the pure part (verfijnronde 22-11, toegankelijkheid en instellingen): which setting belongs to which tab of
// Instellingen (for "Dit tabblad herstellen" and the counters on the tabs), which setting is switched off by another one (and why),
// a warning for a silent setup, search synonyms and when the Cheats item shows in the menu. No DOM, no storage:
// settings.js and pausemenu.js apply it, scripts/settingsrules_test.mjs and scripts/instellingen_audit_test.mjs check it.

// The keys per tab of Instellingen. A key that has no tab here has no row in Instellingen (NO_ROW) or has its own screen (OWN_SCREEN);
// the audit (scripts/instellingen_audit_test.mjs) keeps this list and the rows in pausemenu.js equal, so there is no hidden and no double option.
export const TAB_KEYS = {
  video: ['resolution', 'autoResolution', 'zuinig', 'shadows', 'drawDistance', 'brightness', 'worldColor', 'quality'],
  sound: ['masterVolume', 'musicVolume', 'sfxVolume', 'voiceVolume', 'showSubtitles', 'subtitleSize', 'subtitleBox', 'subtitleVlak', 'soundCaptions', 'footballMusic', 'footballMusicVolume'],
  spel: ['ruzie', 'drunkFx', 'gore', 'shiftMode', 'speedFeel', 'driftAssist', 'bikeAssist', 'liveBussen', 'liveTreinen', 'mapShiftTeleport', 'startBinnen'],
  besturing: ['mouseSensitivity', 'invertY', 'padLayout', 'padLookSensitivity', 'rumble', 'rumbleStrength', 'touchControls', 'steerSensitivity'],
  camera: ['firstPersoon', 'fov', 'cameraDistance', 'autoAim', 'cinematicMoments', 'terugkeerScene'],
  display: ['hudMode', 'showMinimap', 'minimapZoom', 'minimapNorth', 'showFog'],
  hints: ['showHints', 'hintSource', 'onboardingTips', 'uitlegIconen', 'qteStand', 'readingTime'],
  a11y: ['colorBlind', 'markerVormen', 'uiScale', 'textSize', 'subtitleContrast', 'reduceMotion', 'screenShake', 'rustigDrukwerk', 'stapAnimatie', 'reduceFlash', 'screenNarration', 'tikStand', 'helpTime', 'helpDamage', 'helpGates', 'helpOffer'],
};

// Own screens: the difficulty is part of the save (#1169), the binds have their own reset on Besturing, the online identity and the consent for
// Samen spelen are never reset (#528), and the Samen spelen tab draws its own panel.
export const OWN_SCREEN = ['difficulty', 'keyBinds', 'padBinds', 'onlineNaam', 'onlineKleur', 'onlineMeedoen', 'samenZinnen', 'multiplayerConsentRemembered'];
// Settings that are set elsewhere than as a row of Instellingen (a key in the game, the start card, an old file, the measurement at the first start).
export const NO_ROW = ['ritCamera', 'startKeuze', 'attractSeen', 'radioVehicle', 'samenRol', 'gfxAuto'];

export const tabOfKey = (key) => Object.keys(TAB_KEYS).find((t) => TAB_KEYS[t].includes(key)) || null;

// The values that differ from the default, as [{ key, value, standaard }] (objects compare by their JSON)
const same = (a, b) => a === b || (a && b && typeof a === 'object' && typeof b === 'object' && JSON.stringify(a) === JSON.stringify(b));
export function changedKeys(keys, settings, defaults) {
  const out = [];
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(defaults, key)) continue;
    if (!same(settings[key], defaults[key])) out.push({ key, value: settings[key], standaard: defaults[key] });
  }
  return out;
}

// How many settings of every tab differ from the default: { video: 2, sound: 0, ... } (the counter on the tab)
export function changedPerTab(settings, defaults) {
  const out = {};
  for (const tab of Object.keys(TAB_KEYS)) out[tab] = changedKeys(TAB_KEYS[tab], settings, defaults).length;
  return out;
}

// What the reset message says: "3 instellingen teruggezet" or that everything already was the default
export function resetMessage(n, wat = 'Alles') {
  if (!n) return `${wat} stond al op de standaard.`;
  return `${n} ${n === 1 ? 'instelling' : 'instellingen'} teruggezet naar de standaard.`;
}

// A setting another one makes useless: { why } when `key` has no effect now, else null. The row dims and says why (like the camera distance in first person).
export function dependency(key, s) {
  switch (key) {
    case 'subtitleVlak':
      if (!s.subtitleBox) return { why: 'Zet "Donker vlak erachter" aan om dit te zien' };
      if (s.subtitleContrast === 'hoog') return { why: 'Bij Contrast ondertitels Hoog is het vlak altijd vol' };
      return null;
    case 'screenShake':
      return s.reduceMotion ? { why: 'Beweging beperken staat aan: het beeld schudt niet' } : null;
    case 'rumbleStrength':
      return s.rumble ? (s.reduceMotion ? { why: 'Beweging beperken staat aan: het trilt niet' } : null) : { why: 'Trillen staat uit' };
    case 'minimapZoom':
    case 'minimapNorth':
      return s.showMinimap ? null : { why: 'De minimap staat uit' };
    case 'hintSource':
      return s.showHints ? null : { why: 'Toetshints staan uit' };
    case 'markerVormen':
      return s.colorBlind && s.colorBlind !== 'uit' ? { why: 'Staat al aan door de kleurenstand' } : null;
    default:
      return null;
  }
}

// Every key with a dependency right now: { key: why }
export function dependencies(s) {
  const out = {};
  for (const key of ['subtitleVlak', 'screenShake', 'rumbleStrength', 'minimapZoom', 'minimapNorth', 'hintSource', 'markerVormen']) {
    const d = dependency(key, s);
    if (d) out[key] = d.why;
  }
  return out;
}

// Nothing to hear and nothing to read: all sound at 0 (or the master) while the subtitles are off. A line under the volumes says so,
// so a player who slid everything down does not think the game is broken.
export function silenceWarning(s) {
  const geen = (v) => !(Number(v) > 0);
  const stil = geen(s.masterVolume) || (geen(s.sfxVolume) && geen(s.voiceVolume) && geen(s.musicVolume));
  if (!stil) return '';
  if (s.showSubtitles) return 'Je hoort niets. Gesproken tekst staat wel in ondertitels.';
  return 'Je hoort niets en leest niets: de ondertitels staan uit. Zet ze hieronder aan als dat niet de bedoeling is.';
}

// Search synonyms per setting (the menu search looks in the label and the note; players use other words)
export const SYNONYMS = {
  colorBlind: 'kleurenblindheid kleurenblind rood groen blauw geel daltonisme',
  markerVormen: 'vorm vormen symbool cijfer ster wanted kleur',
  uiScale: 'lettergrootte groter kleiner schaal zoom interface',
  textSize: 'lettergrootte tekst groter leesbaar lezen',
  subtitleContrast: 'ondertitel contrast leesbaar wit zwart',
  reduceMotion: 'beweging bewegingsziekte misselijk duizelig draaien animatie',
  screenShake: 'schudden trillen camera schok beving',
  reduceFlash: 'flits flitsen epilepsie licht knipper fotosensitief',
  rustigDrukwerk: 'rustig drukwerk schuin raster contrast',
  masterVolume: 'volume harder zachter geluid',
  musicVolume: 'muziek radio harder zachter',
  sfxVolume: 'effecten geluiden harder zachter',
  voiceVolume: 'stemmen praten harder zachter',
  showSubtitles: 'ondertitels tekst gesproken',
  soundCaptions: 'geluid beschrijven doof slechthorend sirene',
  mouseSensitivity: 'muis snelheid gevoeligheid draaien',
  invertY: 'omkeren omgekeerd muis stick kijken',
  rumble: 'trillen rumble haptisch controller',
  tikStand: 'tikken ingedrukt houden vasthouden knop hand pols',
  helpTime: 'meer tijd langzamer makkelijker',
  helpDamage: 'minder schade makkelijker',
  gore: 'bloed geweld ledematen',
  fov: 'beeldhoek zicht fov gezichtsveld',
  showHints: 'hints toetsen tips aanwijzingen',
  zuinig: 'batterij warm zuinig stroom 30 fps',
  drawDistance: 'zichtafstand ver kijken mist',
  brightness: 'helderheid licht donker',
};
export const synonymsFor = (key) => SYNONYMS[key] || '';

// The Cheats item is for development or for a player who unlocked it in the story (cheats.js cheatsOpen); a cheat that is on keeps the item
// in the menu, so no one has to look for the switch to turn it off. In Samen spelen it follows the same rule per player.
export function cheatsVisible({ dev = false, actief = false } = {}) {
  return !!(dev || actief);
}

// The plain-language names of the colour vision modes (the Greek names alone mean nothing to most players)
export const COLOR_BLIND_LABELS = {
  uit: 'Uit',
  deuteranopie: 'Groen zwak (deuteranopie)',
  protanopie: 'Rood zwak (protanopie)',
  tritanopie: 'Blauw en geel (tritanopie)',
};

// Choices and ranges a setting must stay in, for the keys settings.js did not check before (a hand-edited file, a preset, a call from code)
export const DRUNK_FX_CHOICES = ['aan', 'mild', 'uit'];
export const RUMBLE_STRENGTH_RANGE = [0.25, 1.5];
// the shake preview: how far the sample box moves for a mode, in pixels (the real shake is a camera, the sample is 2D)
const SHAKE_PREVIEW_PX = 6;
export const shakePreviewPx = (factor) => Math.round(SHAKE_PREVIEW_PX * Math.max(0, Number(factor) || 0) * 10) / 10;
