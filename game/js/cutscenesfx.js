// Cutscene sound as data (feedback eigenaar 24-11): per scene id the ambience bed and the moments you SEE that have a sound in the
// game itself, with the sfx id of the game's own source for that scenario (a car door is the car door of player.js, a ringing
// phone is the ringtone of phone.js, a frituur is the fryer of the snack wagon). No new sounds: an id is resolved by
// sfx/sfxlist.js (sfxIdEvent) and has to exist there; what the game has no sound for is listed in GATEN, not made up.
// cutaudio.js reads this (sceneCues, sceneAmbience) and cutscenehost.js fires it through world.audioEvents, like every other sound.
// Pure data and small pure helpers: no THREE, no Web Audio (scripts/cutscene_sfx_test.mjs runs it in node).
//
// Scene ids are the ids the game plays: 'story-' + spec key for the staged mission scenes (cutscenes_akte*.js: 'story-M01.intro'),
// the def ids of cutscenes.js ('story-opening-keuken') and 'terugkeer-' + vignette id (terugkeerscenes.js).
//
// A scene: { amb, cues: [cue, ...] }
//   amb   the ambience bed (sfx/ambience.js), the same layer the game plays at that kind of place:
//         'stad' | 'dorp' | 'ommeland' | 'water' | 'haven' | 'kust' | 'kermis' (outdoors: the beds follow the real place of the scene)
//         'binnen:<room>' indoors, room = a ROOM_TONES id of sfx/binnenklank.js ('woning', 'horeca', 'kantoor', 'winkel', 'station', 'kerk', 'garage')
// A cue:  { on, dt, id, ...opts }   or   { t, id, ...opts }
//   on    the line the moment hangs on, as the specs do it: a line index or the start of its text ('end' = the end of the scene)
//   dt    seconds after the start of that line (may be negative)
//   t     instead of on: a cutscript time (seconds, 'L3', 'L3+0.4', 'end')
//   id    the sfx id: 'fx:<fxbank name>', 'sfx:<sfxmap key>', 'ev:<event kind>[/<sub>]' or 'stap:<surface>' (sfx/sfxlist.js)
//   at    [f, s] where it sounds, local to the scene like the props (default: the anchor)
//   n, every   footsteps: n steps, every s apart (only for 'stap:')
//   gain, auto, wood, strength   passed on to the audio event (auto: the recorded car door, wood: a wooden door, strength: applause)

// footsteps in a scene are someone else's feet: a bit under the player's own
export const STEP_GAIN = 0.6;

const S = {};
export const CUT_SFX = S;

// ===== the opening (cutscenes.js, C00.1-C00.3): the first minutes =====
S['story-opening-trailer'] = {
  amb: 'stad',
  cues: [
    // "Behalve de Martinitoren": the tower's bell over the street, the same bell the ambience rings at the Martinitoren
    { t: 'L2+0.8', id: 'sfx:church_bell', gain: 0.7 },
  ],
};
S['story-opening-keuken'] = {
  amb: 'binnen:woning',
  cues: [
    // Tammo comes in from the hall with two coffees (the door is already in the scene's own fx)
    { t: 'L2-3.2', id: 'stap:binnen', n: 4, every: 0.5, at: [1.2, 1.2] },
    // the phone on the table buzzes (the kit only shakes it): the buzz of a message coming in (sfx/ui.js)
    { t: 'L20+1.0', id: 'sfx:phone_vibrate', at: [-0.5, 0.2] },
    // "Kom. Werk.": both get up and walk out
    { t: 'L21+0.3', id: 'stap:binnen', n: 5, every: 0.42, at: [0.6, 1.4] },
  ],
};
S['story-opening-verhuisdag'] = {
  amb: 'stad',
  cues: [
    // Tammo drags the suitcase up the street
    { t: 0.2, id: 'stap:klinkers', n: 6, every: 0.42, at: [1.5, -3.5] },
    // "Rijden, niet praten": in the Escapade, as the player gets in: the door, the engine, the belt (player.js pushVehicleAudio)
    { t: 'L5+0.3', id: 'ev:door_open', auto: true, at: [8, 4.5] },
    { t: 'L5+0.3', id: 'ev:engine_start', at: [8, 4.5] },
    { t: 'L5+0.3', id: 'sfx:seatbelt_click', at: [8, 4.5] },
  ],
};

// ===== act 1 (cutscenes_akte1.js) =====
S['story-M01.intro'] = {
  amb: 'stad',
  cues: [
    { on: 'Nul krassen. Of ik tel', dt: 0.4, id: 'stap:klinkers', n: 4, every: 0.5, at: [3.6, 0.4] },
    { on: 'Vijftig euro van Berend', id: 'stap:klinkers', n: 4, every: 0.38, at: [2.6, 1.4] },
  ],
};
S['story-M01.outro'] = {
  amb: 'stad',
  cues: [
    // Berend walks round his pickup, inspecting it
    { on: 0, dt: 0.6, id: 'stap:klinkers', n: 8, every: 0.55, at: [5, 3] },
    // "Hier, jullie vijftig euro": the notes counted out (the till of a sale, shops.js)
    { on: 'Ik zei nee, want nul krassen', dt: 2.2, id: 'sfx:shop_sell_bills', at: [1.8, 0.4] },
  ],
};
S['story-M01.3'] = {
  amb: 'stad',
  cues: [
    // the terrace in the evening sun: glasses
    { on: 'Moi moi chat', dt: 1.2, id: 'sfx:bar_glass_clink', at: [4.6, 3.6], gain: 0.7 },
    // the torenwachter calls Tammo: the ringtone of phone.js before he picks up
    { on: 'Tammo. Torenwachter', dt: -1.3, id: 'sfx:phone_ringtone' },
  ],
};
S['story-M01.5'] = {
  amb: 'stad',
  cues: [
    // "Kon minder!": the terrace applauds (regie M01.5)
    { on: 0, dt: 0.1, id: 'ev:applause', strength: 0.8, at: [4.6, 3.4] },
    // "Honderdvijftig euro, overgemaakt": the message on her phone
    { on: 'Honderdvijftig euro, overgemaakt', dt: 1.0, id: 'sfx:phone_message' },
  ],
};
S['story-M02.intro'] = {
  amb: 'stad',
  cues: [
    // the black tractor pulls the machine off (the drive itself is car_pass from cutaudio.js)
    { t: 'L1-0.4', id: 'sfx:tractor_start', at: [8.4, 3.4] },
    // "Ik rij": they run to the Escapade and get in
    { on: 'Ik rij', id: 'stap:ren', n: 4, every: 0.3, at: [-1.5, -1.6] },
    { on: 'Ik rij', dt: 1.5, id: 'ev:door_open', auto: true, at: [-3.2, -4.4] },
    { on: 'Ik rij', dt: 1.5, id: 'ev:engine_start', at: [-3.2, -4.4] },
    { on: 'Ik rij', dt: 1.5, id: 'sfx:seatbelt_click', at: [-3.2, -4.4] },
    // "Met alle richtingaanwijzers"
    { on: 'Ik rij', dt: 3.2, id: 'sfx:car_blinker', at: [-3.2, -4.4] },
  ],
};
S['story-M02.outro'] = {
  amb: 'stad',
  cues: [
    { on: 'Contant. Het Loket', id: 'stap:klinkers', n: 3, every: 0.45, at: [3, -0.6] },
  ],
};
S['story-M03.intro'] = {
  amb: 'binnen:kantoor',
  cues: [
    { on: 'Vierentwintig mensen', dt: 0.3, id: 'stap:binnen', n: 3, every: 0.5, at: [1.4, 1.2] },
  ],
};
S['story-M03.outro'] = {
  amb: 'binnen:kantoor',
  cues: [
    // the form is stamped (the stamp of a deed, bezit)
    { on: 0, dt: 1.2, id: 'sfx:deed_stamp', at: [4.2, 0.9] },
    // Bert calls Tammo
    { on: 'Tammo. Bert', dt: -1.4, id: 'sfx:phone_ringtone' },
  ],
};
S['story-M03.2'] = {
  amb: 'binnen:kantoor',
  cues: [
    // Jelle counts cash out of a klomp
    { on: 0, dt: 0.6, id: 'sfx:shop_sell_bills', at: [2.6, 0.7] },
    // he walks out of the hall and mutters in the doorway
    { on: 'Dat noemen wij', dt: 1.2, id: 'stap:binnen', n: 8, every: 0.6, at: [0, 2.3] },
    { on: 'Foar mem', dt: -0.4, id: 'sfx:door_interior_open', at: [-4.5, 0.8] },
  ],
};
S['story-M04.intro'] = {
  amb: 'stad',
  cues: [
    // "Fluiten": Tammo whistles and the pigeon comes (the pigeon's coo is cutaudio.js)
    { on: 'Kiek. Hij', dt: -0.5, id: 'ev:whistle' },
  ],
};
S['story-M04.outro'] = { amb: 'stad', cues: [] };
S['story-M05.intro'] = {
  amb: 'stad',
  cues: [
    // "Dat is een ja": to the bikes, a ring of the bell before the race
    { on: 'Dat is een ja', dt: 0.8, id: 'stap:klinkers', n: 4, every: 0.4, at: [-1.2, 0] },
    { on: 'Dat is een ja', dt: 2.6, id: 'ev:bell', at: [-2.8, -2.8] },
  ],
};
S['story-M05.outro'] = {
  amb: 'stad',
  cues: [
    { on: 'Precies. Proost', dt: 0.5, id: 'sfx:bar_glass_clink', at: [1.6, 0] },
  ],
};
S['story-M06.intro'] = {
  amb: 'water',
  cues: [
    // "Voor de grip": hand in hand, slowly to the museum
    { on: 'Voor de grip', dt: 1.4, id: 'stap:klinkers', n: 4, every: 0.7, at: [0.7, 0] },
  ],
};

// ===== act 2 (cutscenes_akte2.js) =====
S['story-M07.intro'] = {
  amb: 'stad',
  cues: [
    // Jelle calls Tessa
    { on: 'Mevrouw. Al het vet', dt: -1.3, id: 'sfx:phone_ringtone' },
    { on: 'Zie je. Daar kun je', dt: 0.6, id: 'stap:klinkers', n: 4, every: 0.38, at: [3, 0] },
  ],
};
S['story-M07.outro'] = {
  amb: 'stad',
  cues: [
    { on: 'Dit is het eerste', dt: 2.8, id: 'sfx:phone_vibrate' },
  ],
};
S['story-M08.intro'] = {
  amb: 'stad',
  cues: [
    // Oma calls Tammo
    { on: 'Loop jij daar', dt: -1.3, id: 'sfx:phone_ringtone' },
    { on: 'Zeg dat maar', dt: 1.0, id: 'stap:klinkers', n: 4, every: 0.38, at: [2.4, 0] },
  ],
};
S['story-M08.outro'] = {
  amb: 'binnen:woning',
  cues: [
    { on: 'Het recept van 1953', dt: 0.2, id: 'stap:binnen', n: 3, every: 0.65, at: [1.3, -0.3] },
  ],
};
S['story-M09.intro'] = {
  amb: 'dorp',
  cues: [
    { on: 'De trekker staat', dt: 1.8, id: 'stap:grind', n: 4, every: 0.5, at: [3.4, 2.4] },
  ],
};
S['story-M09.outro'] = {
  amb: 'binnen:kerk',
  cues: [
    // Durk and Douwe come down into the cellar, too late
    { t: 0.5, id: 'stap:binnen', n: 8, every: 0.55, at: [10, 4] },
  ],
};
S['story-M10.intro'] = {
  amb: 'dorp',
  cues: [
    // they have just got out of the tractor-limo: the door shuts behind them (getting out, player.js)
    { t: 0.1, id: 'ev:door_close', auto: true, at: [8.6, 4.0] },
    { t: 0.3, id: 'stap:klinkers', n: 6, every: 0.55, at: [5.6, 3.2] },
    // "Uithuizen heeft een sloot": Tessa and Tammo run
    { on: 'Uithuizen heeft een sloot', dt: 0.3, id: 'stap:ren', n: 4, every: 0.3, at: [-1.2, -0.3] },
  ],
};
S['story-M11.intro'] = {
  amb: 'haven',
  cues: [
    // Klaas on the jetty
    { on: 'Hier. Een snelle boot', dt: 0.9, id: 'stap:wood', n: 4, every: 0.65, at: [3.7, -1.9] },
  ],
};
S['story-M11.outro'] = {
  amb: 'haven',
  cues: [
    // Dijkstra calls Tammo
    { on: 'Dijkstra, van het UMCG', dt: -1.3, id: 'sfx:phone_ringtone' },
    { on: 'Dat zout is van Oma', dt: 0.4, id: 'stap:wood', n: 3, every: 0.7, at: [2.2, 0.2] },
  ],
};
S['story-M11.3'] = { amb: 'water', cues: [] };
S['story-M11.5'] = { amb: 'water', cues: [] };
S['story-M11.6'] = { amb: 'water', cues: [] };

// ===== act 3 (cutscenes_akte3.js) =====
S['story-M12.intro'] = { amb: 'haven', cues: [] };
S['story-M12.outro'] = { amb: 'haven', cues: [] };
S['story-M13.intro'] = { amb: 'haven', cues: [] };
S['story-M13.outro'] = { amb: 'haven', cues: [] };
S['story-M14.intro'] = {
  amb: 'kust',
  cues: [
    // "Ik rij": Tammo to the Escapade
    { on: 'Ik rij', dt: 0.5, id: 'stap:gras', n: 4, every: 0.45, at: [-2, -2] },
  ],
};
S['story-M14.outro'] = { amb: 'haven', cues: [] };
S['story-M15.intro'] = {
  amb: 'ommeland',
  cues: [
    { on: 0, dt: 0.4, id: 'stap:grind', n: 5, every: 0.55, at: [3, 0.5] },
  ],
};
S['story-M15.outro'] = { amb: 'kermis', cues: [] };
S['story-M16.intro'] = { amb: 'kermis', cues: [] };
S['story-M16.outro'] = { amb: 'kermis', cues: [] };
S['story-M16.dijk'] = { amb: 'kust', cues: [] };

// ===== act 4 (cutscenes_akte4.js) =====
S['story-M17.intro'] = { amb: 'water', cues: [] };
S['story-M17.outro'] = {
  amb: 'water',
  cues: [
    // Jelle calls Tessa
    { on: 'Mevrouw Tessa. Mijn schip', dt: -1.3, id: 'sfx:phone_ringtone' },
  ],
};
S['story-M18.intro'] = { amb: 'binnen:kantoor', cues: [] };
S['story-M18.outro'] = {
  amb: 'binnen:kantoor',
  cues: [
    // Mem calls Tessa
    { on: 'Famke. Dinsdag', dt: -1.3, id: 'sfx:phone_ringtone' },
  ],
};
S['story-M18.2'] = { amb: 'binnen:kantoor', cues: [] };
S['story-M18.3'] = { amb: 'binnen:kantoor', cues: [] };
S['story-M18.6'] = { amb: 'binnen:kantoor', cues: [] };
S['story-M18.7'] = { amb: 'binnen:kantoor', cues: [] };
S['story-M19.intro'] = { amb: 'stad', cues: [] };
S['story-M19.outro'] = { amb: 'stad', cues: [] };
S['story-M20.intro'] = { amb: 'ommeland', cues: [] };
S['story-M20.outro'] = {
  amb: 'ommeland',
  cues: [
    { on: 0, dt: 0.4, id: 'stap:grind', n: 4, every: 0.55, at: [3, 0] },
  ],
};
S['story-M20.2'] = { amb: 'water', cues: [] };
S['story-M20.3'] = { amb: 'binnen:woning', cues: [] };
S['story-M21.intro'] = { amb: 'ommeland', cues: [] };
S['story-M21.3'] = { amb: 'ommeland', cues: [] };
S['story-M21.4'] = { amb: 'ommeland', cues: [] };
S['story-M21.6'] = { amb: 'ommeland', cues: [] };
S['story-M22.intro'] = { amb: 'binnen:garage', cues: [] };
S['story-M22.2'] = { amb: 'ommeland', cues: [] };
S['story-M22.4'] = {
  amb: 'ommeland',
  cues: [
    // "We hebben een wagen": over the yard to the car
    { on: 'We hebben een wagen', id: 'stap:grind', n: 4, every: 0.5, at: [2, 1] },
  ],
};
S['story-M23.intro'] = { amb: 'ommeland', cues: [] };
S['story-M23.outro'] = { amb: 'stad', cues: [] };
S['story-M23.3'] = {
  amb: 'ommeland',
  cues: [
    // "En hier is je jas": Douwe hands over the coat
    { on: 'En hier is je jas', dt: 2.4, id: 'sfx:clothes_rustle' },
  ],
};
S['story-M23.6'] = { amb: 'ommeland', cues: [] };
S['story-M23.7'] = { amb: 'ommeland', cues: [] };
S['story-M23.8'] = { amb: 'ommeland', cues: [] };
S['story-M24.intro'] = { amb: 'stad', cues: [] };
S['story-M24.3'] = { amb: 'stad', cues: [] };
S['story-M25.intro'] = { amb: 'binnen:woning', cues: [] };
S['story-M25.outro'] = { amb: 'binnen:woning', cues: [] };
S['story-M25.3'] = { amb: 'binnen:woning', cues: [] };
S['story-M26.intro'] = { amb: 'stad', cues: [] };
S['story-M26.outro'] = {
  amb: 'stad',
  cues: [
    // the market claps after the kiss
    { on: 'Dat duurde elf seconden', id: 'ev:applause', strength: 0.9 },
  ],
};
S['story-M26.4#7-14'] = {
  amb: 'stad',
  cues: [
    // "Rook! Links": the firework starts to smoke: a fuse hisses (carbid.js / throwables)
    { on: 'Rook! Links', dt: 0.4, id: 'ev:weapon/fuse' },
  ],
};
S['story-M26.5'] = {
  amb: 'stad',
  cues: [
    // Jelle bites the eierbal (a bite of horeca.js)
    { on: 'Eierbal? Hij is warm', dt: 1.4, id: 'fx:horeca_hap' },
  ],
};
S['story-M26.6'] = {
  amb: 'stad',
  cues: [
    { on: 'Goud. …Valt mie', dt: -0.6, id: 'fx:horeca_hap' },
  ],
};
S['story-M26.10'] = { amb: 'stad', cues: [{ on: 'Tam & Tes. Vijf van', dt: 0.6, id: 'ev:applause', strength: 1 }] };
S['story-M26.11'] = { amb: 'stad', cues: [{ on: 'Tam & Tes. Vier van', dt: 0.6, id: 'ev:applause', strength: 0.85 }] };
S['story-M26.12'] = { amb: 'stad', cues: [{ on: 'Tam & Tes. Drie van', dt: 0.6, id: 'ev:applause', strength: 0.6 }] };
S['story-M26.13'] = { amb: 'stad', cues: [] };
S['story-M26.14'] = { amb: 'stad', cues: [] };
S['story-M26.15'] = { amb: 'stad', cues: [] };
S['story-M26.16'] = { amb: 'stad', cues: [] };
S['story-M06.3#0-4'] = { amb: 'binnen:winkel', cues: [] };

// ===== act 5 (cutscenes_akte5.js, the trip F1-F6) =====
S['story-F1'] = { amb: 'ommeland', cues: [] };
S['story-F2'] = {
  amb: 'binnen:garage',
  cues: [
    // "Doe de friteuse aan": the fryer of the snack wagon (pg_foodtruck.js)
    { on: 'Doe de friteuse aan', dt: 1.6, id: 'sfx:fryer_sizzle', at: [3.2, -1.5] },
  ],
};
S['story-F3'] = { amb: 'binnen:woning', cues: [] };
S['story-F4'] = { amb: 'stad', cues: [] };
S['story-F5'] = { amb: 'water', cues: [] };
S['story-F6'] = { amb: 'stad', cues: [] };

// ===== act 6 (cutscenes_akte6.js) =====
S['story-M27.intro'] = { amb: 'binnen:woning', cues: [] };
S['story-M27.2'] = { amb: 'binnen:woning', cues: [{ t: 1.6, id: 'sfx:cat_meow', at: [3.6, -1.2] }] };
S['story-M27.outro'] = { amb: 'dorp', cues: [] };
S['story-M28.intro'] = { amb: 'dorp', cues: [{ t: 2.0, id: 'sfx:cat_meow', at: [2.6, -1.6] }] };
S['story-M28.outro'] = { amb: 'binnen:woning', cues: [{ t: 2.0, id: 'sfx:cat_meow', at: [4.4, -1.2] }] };
S['story-M29.intro'] = { amb: 'dorp', cues: [{ t: 2.0, id: 'sfx:cat_meow', at: [2.4, -2.2] }] };
S['story-M29.2'] = { amb: 'dorp', cues: [] };
S['story-M29.outro'] = { amb: 'binnen:woning', cues: [] };
S['story-M30.intro'] = {
  amb: 'ommeland',
  cues: [
    // "Aanvallen.": the reenactors cheer (the crowd's cheer of the football)
    { on: 'Aanvallen.', dt: 0.3, id: 'sfx:crowd_goal_roar', gain: 0.6 },
  ],
};
S['story-M30.2'] = { amb: 'water', cues: [] };
S['story-M30.3'] = { amb: 'dorp', cues: [] };
S['story-M30.5'] = { amb: 'dorp', cues: [] };
S['story-M30.outro'] = { amb: 'ommeland', cues: [] };

// ===== the return vignettes at home (terugkeerscenes.js): the kitchen and the living room of the flat =====
for (const id of ['f1-pan', 'f1-badkamer', 'f1-yoghurt', 'f1-koffie', 'f1-rooster', 'f1-wekker', 'f2-ontbijt', 'f2-proeven', 'f2-kruimel', 'f2-dinsdag', 'f2-eierbal', 'f2-plan', 'f3-bank', 'f3-dansen', 'f3-wang', 'f3-lijstje', 'f3-kopje', 'f3-graden', 'f4-stil', 'f4-roerei', 'f4-vijf', 'f4-afwas', 'f4-niks', 'f4-krant']) {
  S['terugkeer-' + id] = { amb: 'binnen:woning', cues: [] };
}
S['terugkeer-f1-koffie'].cues.push({ t: 'L2', id: 'stap:binnen', n: 3, every: 0.5 });
S['terugkeer-f3-wang'].cues.push({ t: 'L0', id: 'stap:binnen', n: 3, every: 0.5 });
S['terugkeer-f3-kopje'].cues.push({ t: 'L0', id: 'stap:binnen', n: 2, every: 0.6 });

// ===== flat scenes and the end card (cutscenes.js) =====
S['story-avond'] = { amb: 'binnen:woning', cues: [] };
S['story-wachten'] = { amb: 'binnen:woning', cues: [] };
S['story-card'] = { amb: 'stad', cues: [] };

// What the game has no sound for (so a scene stays silent there): noted for the next sound round, never filled with a made-up source.
export const GATEN = [
  { scene: 'story-opening-verhuisdag', wat: 'Tammo zet de koffer neer (geen geluid van een koffer of tas die neergezet wordt)' },
  { scene: 'story-opening-keuken', wat: 'twee koffiekopjes op tafel (geen geluid van servies)' },
  { scene: 'story-M01.intro', wat: 'Berend legt zijn kladblok neer (geen papier- of klembordgeluid in de wereld; ui_page_turn is een menuklank)' },
  { scene: 'story-M02.intro', wat: 'de pinautomaat slikt de pas in (geen pinautomaatgeluid)' },
  { scene: 'story-M02.outro', wat: 'Sjabbe wrikt de klep van de automaat open (geen breekijzer of wrikgeluid)' },
  { scene: 'story-M03.intro', wat: 'het nummerscherm van het Loket (geen nummerbel of ding van een wachtrij)' },
  { scene: 'story-M03.2', wat: 'het nummerscherm springt van 4093 naar 4139 (idem)' },
  { scene: 'story-M06.intro', wat: 'de radio op de kade (geen radio-als-voorwerp-geluid; G-Music is muziek, geen sfx)' },
  { scene: 'story-M16.outro', wat: 'botsauto\'s op de kermis (kermis_ding is de kop van Jut van de botsauto\'s, geen rijgeluid)' },
  { scene: 'story-M19.intro', wat: 'de museumtrein op het perron van Stadskanaal staat niet als voorwerp in de scene (wel de trein- en stoomfluit in de game, maar niets in beeld)' },
  { scene: 'story-M29.2', wat: 'de radio op het buurtfeest en het dansen (geen sfx)' },
  { scene: 'story-M30.3', wat: 'de lier van de poort in Bourtange (geen lier- of kettinggeluid; bridge_clunk is een brug)' },
  { scene: 'terugkeer-f4-afwas', wat: 'afwassen (geen geluid van water en borden)' },
  { scene: 'terugkeer-f1-wekker', wat: 'een wekker (geen wekkergeluid)' },
];

// --- resolving a cue's time against the scene's lines (the same rules as the specs: cutscenes_akte1.js resolveOn) ---
function lineIndex(on, lines) {
  if (on === 'end') return null;
  if (typeof on === 'number') return lines && lines[on] ? on : -1;
  if (typeof on === 'string') return (lines || []).findIndex((l) => l && typeof l.text === 'string' && l.text.startsWith(on));
  return -1;
}
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
// seconds into the scene, or null when the line is not there (an edited text: the cue is skipped, like a beat)
export function cueTime(c, lines, duration) {
  if (!c) return null;
  const dt = isNum(c.dt) ? c.dt : 0;
  if (c.on !== undefined) {
    if (c.on === 'end') return isNum(duration) ? Math.max(0, duration + dt) : null;
    const i = lineIndex(c.on, lines);
    return i >= 0 && isNum(lines[i].at) ? Math.max(0, lines[i].at + dt) : null;
  }
  const t = c.t;
  if (isNum(t)) return Math.max(0, t + dt);
  if (t === 'end') return isNum(duration) ? Math.max(0, duration + dt) : null;
  const m = typeof t === 'string' && /^L(\d+)([+-]\d+(?:\.\d+)?)?$/.exec(t);
  if (!m) return null;
  const l = lines && lines[+m[1]];
  return l && isNum(l.at) ? Math.max(0, l.at + (m[2] ? +m[2] : 0) + dt) : null;
}

export const sceneSfx = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(S, id) ? S[id] : null);

// the ambience of a scene as { amb, binnen, room } or null (no entry: the ambience stays the game's own at that place)
export function sceneAmbience(id) {
  const s = sceneSfx(id);
  if (!s || typeof s.amb !== 'string') return null;
  const m = /^binnen:(\w+)$/.exec(s.amb);
  return m ? { amb: s.amb, binnen: true, room: m[1] } : { amb: s.amb, binnen: false, room: null };
}
