// The central sound map (SFX round 5, 21-11): one table from a game EVENT KEY to its clips, level, bus, variant policy and
// Samen spelen policy. A feature (epic, mission, mini game) that wants a sound does not touch the audio code: it calls
// sfxEvent(world, 'shop_buy_coins', x, y) (sfx/haken.js) and this table says what plays. Pure data and small pure helpers,
// no Web Audio and no imports, so scripts/sfx_round5_test.mjs can check it and samples.js can build SAMPLE_INFO from it.
//
// Entry: { area, label, n, prio, bus, cat, gain, ref, range, gap, mp, eager }
//   area  the audit category of docs/SFX-DEKKING-21-11.md
//   label Dutch description (manifest "gebruik", the credits and the listening panel; no brand names)
//   n     number of variants; the clips are <key>_0 .. <key>_<n-1> in game/audio/sfx (sources: docs/AUDIO-LICENTIES.md)
//   bus   'ui' (UI bus, no distance), 'sfx' (Effecten: the world bus, at a place) or 'ambient' (Omgeving: animals, weather, crowd)
//   cat   the category of sfx/mixplan.js (level, speech ducking); ref and range: distance fade in metres
//   gap   cool-down in seconds per EVENT (not per clip), so rotating variants cannot stack a burst
//   mp    Samen spelen: 'local' = only the machine of the player who does it (UI, own hands, own screen); 'world' = a world event
//         that other players near it hear too, sparingly (remoteAllowed) and never twice (see dedupe in haken.js)
//   eager decode at the start (short and frequent UI sounds); the rest loads on first use (see samples.js EAGER_CATS)
// Variant policy for every entry: a pool of n clips, never the same clip twice in a row (pickClip), a small random pitch
// (+-4%) and level (+-1.5 dB) from samples.js VARIATIE.

const AREA_DEFAULTS = {
  ui: { bus: 'ui', cat: 'ui', gain: 0.8, ref: 3, range: 30, gap: 0.2, mp: 'local' },
  shop: { bus: 'sfx', cat: 'winkel', gain: 0.8, ref: 4, range: 40, gap: 0.4, mp: 'world' },
  interior: { bus: 'sfx', cat: 'deur', gain: 0.8, ref: 3, range: 40, gap: 0.4, mp: 'world' },
  clothing: { bus: 'sfx', cat: 'winkel', gain: 0.7, ref: 3, range: 25, gap: 0.5, mp: 'local' },
  tuning: { bus: 'sfx', cat: 'voertuig', gain: 0.8, ref: 5, range: 60, gap: 0.4, mp: 'world' },
  farm: { bus: 'sfx', cat: 'winkel', gain: 0.8, ref: 5, range: 70, gap: 0.4, mp: 'world' },
  animal: { bus: 'ambient', cat: 'dier', gain: 0.9, ref: 4, range: 120, gap: 1.5, mp: 'world' },
  football: { bus: 'sfx', cat: 'sport', gain: 0.85, ref: 8, range: 160, gap: 0.3, mp: 'world' },
  crowd: { bus: 'ambient', cat: 'omgeving', gain: 0.8, ref: 12, range: 250, gap: 4, mp: 'world' },
  nature: { bus: 'ambient', cat: 'omgeving', gain: 0.8, ref: 10, range: 250, gap: 3, mp: 'world' },
  npc: { bus: 'ambient', cat: 'dier', gain: 0.75, ref: 3, range: 45, gap: 1.2, mp: 'world' },
  transit: { bus: 'sfx', cat: 'spoor', gain: 0.7, ref: 8, range: 120, gap: 1, mp: 'world' },
  cutscene: { bus: 'ui', cat: 'sting', gain: 0.8, ref: 3, range: 30, gap: 0.5, mp: 'local' },
  phone: { bus: 'ui', cat: 'ui', gain: 0.8, ref: 3, range: 30, gap: 1, mp: 'local' },
};
export const AREAS = Object.keys(AREA_DEFAULTS);

export const SFX_MAP = {};
// def(key, area, label, n, prio, overrides)
function def(key, area, label, n, prio, o = {}) {
  SFX_MAP[key] = { area, label, n, prio, eager: false, ...AREA_DEFAULTS[area], ...o };
}

// --- UI: buttons, menu, notifications, map, items (UI bus, only on the own screen) ---
def('ui_button_press', 'ui', 'Knop ingedrukt in het menu', 3, 'hoog', { eager: true, gain: 0.7, gap: 0.06 });
def('ui_button_hover', 'ui', 'Knop onder de muis of selectie in het menu', 2, 'hoog', { eager: true, gain: 0.5, gap: 0.08 });
def('ui_confirm', 'ui', 'Bevestigen of akkoord', 2, 'hoog', { eager: true, gain: 0.8, gap: 0.3 });
def('ui_cancel', 'ui', 'Terug of annuleren', 2, 'hoog', { eager: true, gain: 0.7, gap: 0.15 });
def('ui_page_turn', 'ui', 'Bladzijde omslaan (dagboek, boek, lijst)', 2, 'midden', { gain: 0.8, gap: 0.3 });
def('ui_slider_tick', 'ui', 'Tik van een schuifregelaar', 2, 'midden', { eager: true, gain: 0.5, gap: 0.05 });
def('ui_toggle_on', 'ui', 'Schakelaar aan in Instellingen', 2, 'midden', { eager: true, gain: 0.7, gap: 0.15 });
def('ui_toggle_off', 'ui', 'Schakelaar uit in Instellingen', 1, 'midden', { eager: true, gain: 0.7, gap: 0.15 });
def('ui_notify_pop', 'ui', 'Kleine melding verschijnt', 3, 'hoog', { eager: true, gain: 0.7, gap: 0.6 });
def('ui_achievement', 'ui', 'Prestatie behaald (kort fanfaretje)', 2, 'midden', { gain: 0.9, gap: 2 });
def('ui_endcard_whoosh', 'ui', 'Eindkaart schuift in beeld', 2, 'midden', { gain: 0.7, gap: 1 });
def('ui_map_pin', 'ui', 'Speld op de kaart zetten', 2, 'midden', { gain: 0.8, gap: 0.2 });
def('ui_map_zoom', 'ui', 'Kaart in- of uitzoomen', 2, 'midden', { gain: 0.5, gap: 0.25 });
def('ui_popup_open', 'ui', 'Venster of popup opent', 2, 'midden', { gain: 0.7, gap: 0.3 });
def('ui_travel_whoosh', 'ui', 'Snelreizen: scherm wisselt', 2, 'midden', { gain: 0.8, gap: 1 });
def('ui_item_pickup', 'ui', 'Voorwerp oppakken', 3, 'hoog', { eager: true, gain: 0.8, gap: 0.25 });
def('ui_item_equip', 'ui', 'Voorwerp uitrusten of omdoen', 2, 'midden', { gain: 0.8, gap: 0.3 });
def('ui_bag_open', 'ui', 'Rugzak of tas open', 2, 'laag', { gain: 0.7, gap: 0.4 });
def('ui_tick_soft', 'ui', 'Zachte tik van een microanimatie', 2, 'midden', { eager: true, gain: 0.4, gap: 0.05 });
// --- shops, bar, snack wagon (at the place of the counter; others nearby hear it) ---
def('shop_buy_coins', 'shop', 'Betalen aan de kassa (munten)', 3, 'hoog', { gain: 0.85, gap: 0.5 });
def('shop_sell_bills', 'shop', 'Verkopen: biljetten geteld', 1, 'hoog', { gain: 0.8, gap: 0.5 });
def('shop_drawer', 'shop', 'Kassalade gaat open', 2, 'midden', { gap: 0.6 });
def('shop_scanner_beep', 'shop', 'Piep van de scanner', 2, 'midden', { gain: 0.6, gap: 0.2 });
def('shop_bag_rustle', 'shop', 'Plastic tasje ritselt', 2, 'laag', { gain: 0.6, gap: 0.8 });
def('shop_door_chime', 'shop', 'Winkeldeur met belletje', 3, 'hoog', { gap: 0.8 });
def('coffee_brew', 'shop', 'Koffiezetapparaat pruttelt', 2, 'laag', { gain: 0.6, gap: 4 });
def('bar_glass_clink', 'shop', 'Glazen tikken tegen elkaar', 2, 'midden', { gain: 0.7, gap: 0.8 });
def('bar_pour', 'shop', 'Een drankje inschenken', 2, 'midden', { gain: 0.7, gap: 2 });
def('bar_bottle_open', 'shop', 'Flesje open', 2, 'midden', { gain: 0.8, gap: 0.8 });
def('fryer_sizzle', 'shop', 'Frituur sist', 2, 'midden', { gain: 0.6, gap: 3 });
def('snack_wrap', 'shop', 'Snack in papier gewikkeld', 2, 'midden', { gain: 0.6, gap: 1 });
// --- interiors ---
def('door_interior_open', 'interior', 'Binnendeur gaat open', 3, 'hoog', { gap: 0.5 });
def('door_interior_close', 'interior', 'Binnendeur gaat dicht', 3, 'hoog', { gap: 0.5 });
def('door_bell_ring', 'interior', 'Deurbel', 2, 'midden', { gain: 0.8, gap: 2 });
def('stairs_steps', 'interior', 'Stappen op een trap', 2, 'midden', { cat: 'voetstap', gain: 0.8, gap: 0.8, mp: 'local' });
def('elevator_ding', 'interior', 'Lift: bel bij aankomst', 2, 'laag', { gap: 1 });
def('elevator_doors', 'interior', 'Liftdeuren gaan open', 2, 'laag', { gain: 0.7, gap: 1.5 });
def('key_lock_turn', 'interior', 'Sleutel in het slot', 2, 'midden', { gap: 0.8 });
def('light_switch', 'interior', 'Lichtknop', 2, 'midden', { gap: 0.3 });
def('step_tile', 'interior', 'Stap op een tegelvloer', 3, 'hoog', { cat: 'voetstap', gain: 0.9, ref: 3, range: 30, gap: 0, mp: 'local' });
def('step_parquet', 'interior', 'Stap op een parketvloer', 3, 'hoog', { cat: 'voetstap', gain: 0.9, ref: 3, range: 30, gap: 0, mp: 'local' });
def('step_carpet', 'interior', 'Stap op een tapijt', 3, 'hoog', { cat: 'voetstap', gain: 0.9, ref: 3, range: 30, gap: 0, mp: 'local' });
// --- clothing and barber (own hands: local) ---
def('clothes_rustle', 'clothing', 'Kleding ritselt (aan- of uittrekken)', 3, 'hoog', { gap: 0.4 });
def('zipper_pull', 'clothing', 'Rits dicht of open', 2, 'midden', { gap: 0.6 });
def('curtain_pull', 'clothing', 'Gordijn van het pashokje', 2, 'midden', { gap: 0.8 });
def('scissors_snip', 'clothing', 'Kappersschaar knipt', 2, 'midden', { gain: 0.8, gap: 0.25 });
def('hairdryer_blast', 'clothing', 'Föhn aan', 1, 'laag', { gain: 0.6, gap: 3 });
def('hair_clipper', 'clothing', 'Tondeuse', 1, 'laag', { gain: 0.6, gap: 3 });
// --- tuning and garage ---
def('wrench_ratchet', 'tuning', 'Ratelsleutel', 3, 'midden', { gap: 0.3 });
def('spray_can', 'tuning', 'Spuitbus (laken, graffiti)', 2, 'midden', { gain: 0.7, gap: 1.5 });
def('impact_wrench', 'tuning', 'Slagmoersleutel', 2, 'midden', { gap: 1 });
def('neon_buzz_on', 'tuning', 'Neonverlichting gaat aan', 2, 'midden', { gain: 0.7, gap: 1.5 });
def('hood_slam', 'tuning', 'Motorkap dicht', 2, 'midden', { gap: 0.6 });
def('car_horn_short', 'tuning', 'Kort toeteren (claxon)', 3, 'hoog', { gain: 0.85, ref: 8, range: 150, gap: 0.25 });
def('car_blinker', 'tuning', 'Richtingaanwijzer tikt', 2, 'hoog', { gain: 0.5, ref: 3, range: 25, gap: 0.45 });
def('handbrake_ratchet', 'tuning', 'Handrem aantrekken', 2, 'midden', { gain: 0.8, ref: 3, range: 30, gap: 0.8 });
def('seatbelt_click', 'tuning', 'Gordel klikt', 2, 'laag', { gain: 0.7, ref: 3, range: 20, gap: 1 });
// --- Bezit: farm, plots, livestock ---
def('tractor_start', 'farm', 'Trekker start', 2, 'midden', { cat: 'voertuig', ref: 10, range: 150, gap: 3 });
def('harvest_cut', 'farm', 'Oogsten: gewas afsnijden', 2, 'hoog', { gap: 0.25 });
def('dig_soil', 'farm', 'Spitten en zaaien', 3, 'hoog', { gap: 0.3 });
def('grain_pour', 'farm', 'Graan in de silo of zak', 2, 'midden', { gap: 1.5 });
def('milking_machine', 'farm', 'Melkmachine', 1, 'laag', { gain: 0.6, gap: 4 });
def('chicken_cluck', 'animal', 'Kip kakelt', 3, 'midden', { gap: 1 });
def('cow_moo', 'animal', 'Koe loeit', 2, 'midden', { gap: 2 });
def('sheep_bleat', 'animal', 'Schaap blaat', 2, 'midden', { gap: 2 });
def('fence_hammer', 'farm', 'Hamer op een paal (paal plaatsen)', 3, 'hoog', { gap: 0.3 });
def('gate_latch', 'farm', 'Hek valt in het slot', 2, 'midden', { gap: 0.6 });
def('bucket_water', 'farm', 'Emmer water (drinkbak vullen)', 2, 'midden', { gain: 0.7, gap: 1.5 });
def('deed_stamp', 'farm', 'Stempel op de akte (bezit kopen)', 2, 'hoog', { gain: 0.9, gap: 0.8, mp: 'local' });
// --- football ---
def('football_kick', 'football', 'Bal trappen', 3, 'hoog', { gain: 0.9, gap: 0.15 });
def('football_post', 'football', 'Bal op de paal of lat', 2, 'midden', { gain: 0.9, gap: 0.5 });
def('football_net', 'football', 'Bal in het net', 2, 'hoog', { gain: 0.8, gap: 0.8 });
def('crowd_goal_roar', 'crowd', 'Publiek juicht bij een doelpunt', 2, 'hoog', { gain: 0.9, gap: 5 });
def('crowd_groan', 'crowd', 'Publiek kreunt (gemist)', 2, 'midden', { gain: 0.8, gap: 4 });
def('referee_whistle', 'football', 'Scheidsrechter fluit', 3, 'hoog', { gain: 0.8, ref: 14, range: 300, gap: 0.8 });
def('crowd_chant', 'crowd', 'Publiek zingt en klapt', 2, 'laag', { gain: 0.7, gap: 8 });
def('ball_bounce', 'football', 'Bal stuitert', 3, 'midden', { gain: 0.8, gap: 0.12 });
def('sport_stinger', 'football', 'Sportjingle (aftrap, rust, einde)', 2, 'midden', { bus: 'ui', cat: 'sting', gain: 0.8, gap: 3, mp: 'local' });
// --- nature and weather ---
def('bird_chirp', 'nature', 'Vogeltje fluit', 3, 'midden', { cat: 'dier', gain: 0.7, ref: 5, range: 110, gap: 1.5 });
def('rain_drips', 'nature', 'Druppels van een dak of in een plas', 3, 'laag', { cat: 'omgeving', gain: 0.6, ref: 4, range: 60, gap: 0.8 });
def('wind_gust', 'nature', 'Windvlaag door de bomen', 2, 'midden', { gain: 0.7, gap: 8 });
def('frog_croak', 'nature', 'Kikker kwaakt (zomeravond)', 3, 'midden', { cat: 'dier', gain: 0.7, ref: 6, range: 110, gap: 1.2 });
def('church_bell', 'nature', 'Kerkklok luidt', 2, 'midden', { gain: 0.9, ref: 40, range: 1200, gap: 20 });
def('owl_hoot', 'nature', 'Uil roept (nacht)', 2, 'laag', { cat: 'dier', gain: 0.8, ref: 8, range: 250, gap: 10 });
def('dog_bark', 'animal', 'Hond blaft', 3, 'midden', { gain: 0.9, ref: 5, range: 150, gap: 0.8 });
def('cat_meow', 'animal', 'Kat miauwt', 2, 'laag', { gain: 0.8, ref: 3, range: 40, gap: 3 });
// --- NPC reactions (human sounds without words; around the NPC) ---
def('npc_laugh', 'npc', 'Voorbijganger lacht', 3, 'midden', { gap: 2 });
def('npc_gasp', 'npc', 'Voorbijganger schrikt (hap naar adem)', 2, 'midden', { gap: 1.5 });
def('npc_chuckle', 'npc', 'Voorbijganger grinnikt', 2, 'midden', { gap: 2 });
def('npc_cough', 'npc', 'Voorbijganger hoest', 2, 'laag', { gap: 4 });
def('npc_sigh', 'npc', 'Voorbijganger zucht', 2, 'laag', { gain: 0.7, gap: 4 });
// --- public transport ---
def('train_air_brake', 'transit', 'Trein of bus: luchtremmen sissen', 2, 'midden', { cat: 'spoor', gain: 0.75, gap: 2 });
def('tram_doors', 'transit', 'Tramdeuren gaan open', 2, 'midden', { cat: 'voertuig', ref: 6, range: 60, gap: 2 });
def('bus_stop_button', 'transit', 'Stopknop in de bus', 2, 'midden', { cat: 'voertuig', gain: 0.7, ref: 4, range: 30, gap: 1.5 });
def('station_chime', 'transit', 'Omroepbel op het station', 2, 'midden', { gain: 0.7, ref: 10, range: 150, gap: 5 });
// --- cutscene stingers and the story phone (UI bus: they belong to the player's own screen) ---
def('cutscene_hit', 'cutscene', 'Dreun bij een wending in een tussenscene', 3, 'midden', { gain: 0.85, gap: 1 });
def('cutscene_riser', 'cutscene', 'Opbouw voor een spannend moment', 2, 'laag', { gain: 0.7, gap: 3 });
def('phone_ringtone', 'phone', 'Telefoon rinkelt', 2, 'midden', { gain: 0.8, gap: 3 });
def('phone_message', 'phone', 'Sms of bericht binnen', 3, 'hoog', { eager: true, gain: 0.7, gap: 0.8 });
def('phone_vibrate', 'phone', 'Telefoon trilt', 2, 'laag', { gain: 0.6, gap: 1 });

export const BUSES = ['ui', 'sfx', 'ambient'];
export const MP_POLICIES = ['local', 'world'];

// the clip keys (file names without .ogg) of an event
export const sfxClips = (key) => { const e = SFX_MAP[key]; return e ? Array.from({ length: e.n }, (_, i) => `${key}_${i}`) : []; };
export const SFX_CLIP_KEYS = Object.keys(SFX_MAP).flatMap(sfxClips);
export const isSfxEvent = (key) => Object.prototype.hasOwnProperty.call(SFX_MAP, key);

// SAMPLE_INFO rows (samples.js format) for every clip: the mixing category, level and distance fade of the event
export function sfxSampleInfo() {
  const out = {};
  for (const [key, e] of Object.entries(SFX_MAP)) for (const c of sfxClips(key)) out[c] = { cat: e.cat, gain: e.gain, ref: e.ref, range: e.range, gap: 0, vary: true, lazy: !e.eager, event: key };
  return out;
}
// FX_OPNAME_ALLEEN rows: event key -> clips (the existing haakFx / haakUi path then plays them like the other recordings)
export function sfxOpnameAlleen() { const out = {}; for (const key of Object.keys(SFX_MAP)) out[key] = sfxClips(key); return out; }
// cool-down per event for the UI bus (uitaal.js UI_COOLDOWN and UI_NIVEAU take these)
export function sfxUiGaps() { const o = {}; for (const [k, e] of Object.entries(SFX_MAP)) if (e.bus === 'ui') o[k] = e.gap; return o; }

// Variant choice: a clip out of `ready` (the loaded ones), never the one played last for this event when there is a choice.
// last: Map event -> clip. rand: 0..1.
export function pickClip(key, ready, last, rand = Math.random()) {
  const ok = !ready ? () => true : typeof ready === 'function' ? ready : (c) => ready.includes(c);
  const all = sfxClips(key).filter(ok);
  if (!all.length) return null;
  const prev = last && last.get(key);
  const pool = all.length > 1 && prev ? all.filter((c) => c !== prev) : all;
  const clip = pool[Math.floor(rand * pool.length) % pool.length];
  if (last) last.set(key, clip);
  return clip;
}

// Cool-down per event: may this event sound now? state: Map event -> time of the last time (s). Records the time when it may.
export function eventCoolOk(state, key, now) {
  const e = SFX_MAP[key];
  const gap = e ? e.gap : 0;
  const t = state.get(key);
  if (t !== undefined && now - t < gap) return false;
  state.set(key, now);
  return true;
}

// Samen spelen: should this event, done by ANOTHER player at distance d (m) from the listener, be heard here?
// 'local' events never (each player hears his own); 'world' events within 60% of their range, and sparingly: at most one
// per event per 0.8 s and four per second over all events. state: { last: Map, window: [] }. Records when it passes.
export const REMOTE = { rangeFactor: 0.6, perEventS: 0.8, perSecond: 4 };
export function remoteAllowed(state, key, d, now) {
  const e = SFX_MAP[key];
  if (!e || e.mp !== 'world' || !(d <= e.range * REMOTE.rangeFactor)) return false;
  const t = state.last.get(key);
  if (t !== undefined && now - t < Math.max(REMOTE.perEventS, e.gap)) return false;
  state.window = state.window.filter((x) => now - x < 1);
  if (state.window.length >= REMOTE.perSecond) return false;
  state.last.set(key, now); state.window.push(now);
  return true;
}
export const newRemoteState = () => ({ last: new Map(), window: [] });

// No host + guest double play: an event that carries the id of the machine that produced it (origin) is played only when that
// id is not ours, via remoteAllowed; the producing machine plays its own at once. dedupeKey makes the id of one occurrence.
export const dedupeKey = (key, origin, x, y, t) => `${key}|${origin}|${Math.round(x / 2)}|${Math.round(y / 2)}|${Math.round(t * 4)}`;
