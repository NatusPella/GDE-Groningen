// The control scheme as data: which keyboard keys the player may rebind,
// the controller buttons per situation, and the labels for both. The game
// itself only ever sees the default ("canonical") keys: input.js turns a
// rebound key back into the key it stands in for, and gamepad.js turns
// buttons into those same keys. Node-safe: no DOM at import time.

// Keyboard keys the player may rebind: [canonical key, what it does, group].
// Escape, Enter, the arrows and the mouse stay fixed.
export const KEY_ACTIONS = [
  ['w', 'Vooruit, gas geven; heli: vooruit; vliegtuig: gas; trein: gas', 'beweging'],
  ['s', 'Achteruit, remmen; heli: remmen, achteruit; vliegtuig: gas terug; trein: rem', 'beweging'],
  ['a', 'Links, sturen; heli: draaien; vliegtuig: links rollen', 'beweging'],
  ['d', 'Rechts, sturen; heli: draaien; vliegtuig: rechts rollen', 'beweging'],
  [' ', 'Springen, over hek of auto klimmen, uit het water klimmen, handrem, klapwieken; heli: omhoog; vliegtuig: neus omhoog; trein: noodrem', 'beweging'],
  ['shift', 'Rennen, versnelling, duiken; heli: sneller; vliegtuig: remmen', 'beweging'],
  ['control', 'Bukken; duif: pikken en landen; heli: omlaag; vliegtuig: neus omlaag', 'beweging'],
  ['.', 'Rijden, handmatig schakelen: een versnelling hoger', 'beweging'],
  [',', 'Rijden, handmatig schakelen: een versnelling lager', 'beweging'],
  ['j', 'Rijden, handmatig met koppeling: koppeling indrukken', 'beweging'],
  ['e', 'Instappen (ook vanuit het water in een boot), praten, gebruiken; duif: pikken', 'actie'],
  ['f', 'Instappen (tweede toets); duif: poepen', 'actie'],
  ['k', 'Kusje', 'actie'],
  ['y', 'Samen spelen: het stuur aan je bijrijder geven of terugnemen; als bijrijder om het stuur vragen of het teruggeven', 'actie'],
  ['q', 'Achterom kijken; skûtsje: zeil aanhalen', 'actie'],
  ['z', 'Skûtsje: zeil vieren', 'actie'],
  ['h', 'Toeteren', 'actie'],
  ['l', 'Zwaailicht en sirene', 'actie'],
  ['[', 'Richtingaanwijzer links (nog eens: uit)', 'actie'],
  [']', 'Richtingaanwijzer rechts (nog eens: uit)', 'actie'],
  ['p', 'Alarmlichten aan of uit', 'actie'],
  ['v', 'Filmcamera', 'actie'],
  ['r', 'Lak of garagemenu', 'actie'],
  ['c', 'Duif: koeren', 'actie'],
  ['x', 'Duif: weer mens worden', 'actie'],
  ['tab', 'Volgend doelwit tijdens het richten', 'wapens'],
  ['1', 'Slaan', 'wapens'],
  ['2', 'Pistool', 'wapens'],
  ['3', 'Geweer', 'wapens'],
  ['4', 'Gooien: carbidbus, vuurwerk', 'wapens'],
  ['m', 'Kaart', 'menu'],
  ['o', 'Verhaalstap overslaan', 'menu'],
  ['n', 'Radio aan of uit (ook te voet)', 'menu'],
  ['u', 'Geluid aan of uit', 'menu'],
  ['backspace', 'Minigame stoppen', 'menu'],
];
export const KEY_GROUPS = [['beweging', 'Bewegen'], ['actie', 'Acties'], ['wapens', 'Wapens'], ['menu', 'Telefoon & menu']];
const CANON = new Set(KEY_ACTIONS.map(([k]) => k));
// keys that can never be bound: they open menus, confirm or are the fixed alternatives
const FIXED = new Set(['escape', 'enter', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'meta', 'alt', 'altgraph', 'capslock', 'contextmenu', 'dead', 'unidentified', 'process', 'f11', 'f12']);

export function isBindableKey(k) {
  if (typeof k !== 'string' || !k || FIXED.has(k)) return false;
  if (/^f\d+$/.test(k)) return false;
  return k.length === 1 || CANON.has(k) || /^[a-z]+$/.test(k);
}

// In a browser Ctrl+W closes the tab and Ctrl+W is how you crouch forward or
// fly the heli down and ahead, so there Ctrl's action starts on C (and the
// pigeon's coo moves from C to G). The desktop app keeps Ctrl.
const BROWSER_KEYS = { control: 'c', c: 'g' };
const inDesktopApp = () => !!(typeof window !== 'undefined' && window.gdeDesktop && window.gdeDesktop.isDesktop);
let platformKeys = typeof window !== 'undefined' && !inDesktopApp() ? BROWSER_KEYS : {};
// 'browser' or 'desktop'; the tests use it, the game detects it on load
export function setKeyPlatform(kind) { platformKeys = kind === 'browser' ? BROWSER_KEYS : {}; }
export function defaultKey(canon) { return platformKeys[canon] || canon; }

// binds: { canonical: physical } holding only the keys changed from the
// platform's defaults.
export function physicalKey(binds, canon) {
  const p = binds && binds[canon];
  return typeof p === 'string' && p ? p : defaultKey(canon);
}

// Binds `canon` to the physical key `phys`. A key already in use by another
// action swaps over to the old key of `canon`, so no key ever does two things.
// Returns the new binds and the action that moved (or null).
export function bindKey(binds, canon, phys) {
  const out = { ...(binds || {}) };
  if (!CANON.has(canon) || !isBindableKey(phys)) return { binds: out, swapped: null };
  const old = physicalKey(out, canon);
  let swapped = null;
  for (const [c] of KEY_ACTIONS) {
    if (c !== canon && physicalKey(out, c) === phys) { out[c] = old; swapped = c; }
  }
  out[canon] = phys;
  return { binds: normalizeKeyBinds(out), swapped };
}

// Drops unknown, identity and duplicate entries (a damaged save) so the
// result is always a clean one-key-per-action table.
export function normalizeKeyBinds(binds) {
  const out = {};
  if (!binds || typeof binds !== 'object') return out;
  const used = new Map();
  for (const [c] of KEY_ACTIONS) used.set(c, c);
  for (const [c] of KEY_ACTIONS) {
    const p = binds[c];
    if (typeof p !== 'string' || !isBindableKey(p) || p === defaultKey(c)) continue;
    out[c] = p;
  }
  const seen = new Set();
  for (const [c] of KEY_ACTIONS) {
    const p = physicalKey(out, c);
    if (seen.has(p)) delete out[c];
    seen.add(physicalKey(out, c));
  }
  // a reset entry can collide again; fall back to the defaults then
  const all = KEY_ACTIONS.map(([c]) => physicalKey(out, c));
  if (new Set(all).size !== all.length) return {};
  return out;
}

// physical key -> canonical key; a canonical key that was bound away maps to
// null (it does nothing now). Keys not in the table pass through unchanged.
export function keyTranslation(binds) {
  const map = new Map();
  for (const [c] of KEY_ACTIONS) if (physicalKey(binds, c) !== c) map.set(c, null);
  for (const [c] of KEY_ACTIONS) { const p = physicalKey(binds, c); if (p !== c) map.set(p, c); }
  return map;
}

const KEY_NAMES = { ' ': 'SPATIE', shift: 'SHIFT', control: 'CTRL', tab: 'TAB', backspace: 'BACKSPACE', escape: 'ESC', enter: 'ENTER', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', delete: 'DEL' };
export function keyName(k) {
  return KEY_NAMES[k] || String(k).toUpperCase();
}
// The key an action is on now, for running text: 'Ctrl', 'Spatie', 'C'.
export function keyWord(binds, canon) {
  const n = keyName(physicalKey(binds, canon));
  return n.length > 1 && /^[A-Z]+$/.test(n) ? n[0] + n.slice(1).toLowerCase() : n;
}

// Glyph tokens (prompts.js glyphHtml, the Besturing table) to canonical keys.
const TOKEN_KEYS = { SPACE: ' ', SPATIE: ' ', SHIFT: 'shift', CTRL: 'control', TAB: 'tab', BACKSPACE: 'backspace', ESC: 'escape', ENTER: 'enter' };
export function tokenKey(token) {
  const t = String(token).trim();
  if (TOKEN_KEYS[t.toUpperCase()]) return TOKEN_KEYS[t.toUpperCase()];
  return t.length === 1 ? t.toLowerCase() : t.toLowerCase();
}

// --- controller --------------------------------------------------------------

// Buttons in the W3C "standard" gamepad mapping order.
export const PAD_BUTTONS = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
// buttons the player may move around (Start always opens the pause menu)
export const PAD_REMAPPABLE = PAD_BUTTONS.filter((b) => b !== 'start');

// binds: { slot: physical button } - a permutation, only changed entries.
export function physicalButton(binds, slot) {
  const p = binds && binds[slot];
  return PAD_REMAPPABLE.includes(p) ? p : slot;
}

export function bindButton(binds, slot, phys) {
  const out = { ...(binds || {}) };
  if (!PAD_REMAPPABLE.includes(slot) || !PAD_REMAPPABLE.includes(phys)) return { binds: out, swapped: null };
  const old = physicalButton(out, slot);
  let swapped = null;
  for (const s of PAD_REMAPPABLE) if (s !== slot && physicalButton(out, s) === phys) { out[s] = old; swapped = s; }
  out[slot] = phys;
  return { binds: normalizePadBinds(out), swapped };
}

export function normalizePadBinds(binds) {
  const out = {};
  if (!binds || typeof binds !== 'object') return out;
  for (const s of PAD_REMAPPABLE) if (PAD_REMAPPABLE.includes(binds[s]) && binds[s] !== s) out[s] = binds[s];
  const all = PAD_REMAPPABLE.map((s) => physicalButton(out, s));
  return new Set(all).size === all.length ? out : {};
}

// physical button -> the slot it plays
export function buttonSlots(binds) {
  const m = {};
  for (const s of PAD_BUTTONS) m[physicalButton(binds, s)] = s;
  return m;
}

// What each button does per situation. A string is a key (held while the
// button is); '@...' are the mouse stand-ins: @fire (left button), @aim
// (right button), @wheel+/@wheel- (scroll, the next/previous weapon).
// stick: what the left stick does - 'move' (analog walk, plus WASD for the
// minigames and the helicopter: forward/back and turn), 'arrows' (the arrow
// keys); triggers 'drive' make RT/LT the gas and the brake.
const FOOT = {
  a: ' ', b: 'control', x: 'f', y: 'e', lb: '@wheel-', rb: '@wheel+', lt: '@aim', rt: '@fire',
  ls: 'shift', rs: 'tab', up: 'n', down: 'k', left: 'o', right: 'r', view: 'm', start: 'escape', stick: 'move',
};
// Minigames with their own button layout: world.activityGame -> PAD_MAPS situation
export const GAME_PAD_CTX = { carillon: 'klokken', pannenkoek: 'pannenkoek' };

export const PAD_MAPS = {
  foot: FOOT,
  vehicle: { a: ' ', b: 'l', x: 'h', y: 'e', lb: 'n', rb: '@fire', lt: '@brake', rt: '@gas', ls: 'shift', rs: 'q', up: 'p', down: 'v', left: '[', right: ']', view: 'm', start: 'escape', stick: 'steer' },
  // manual shifting (setting shiftMode): the bumpers shift, L3 is the clutch, the radio moves to the D-pad
  vehicleManual: { a: ' ', b: 'l', x: 'h', y: 'e', lb: ',', rb: '.', lt: '@brake', rt: '@gas', ls: 'j', rs: 'q', up: 'n', down: 'v', left: '[', right: ']', view: 'm', start: 'escape', stick: 'steer' },
  skutsje: { a: ' ', b: 'l', x: 'h', y: 'e', lb: 'z', rb: 'q', lt: '@brake', rt: '@gas', ls: 'shift', rs: null, up: null, down: 'v', left: 'o', right: 'r', view: 'm', start: 'escape', stick: 'steer' },
  // the helicopter: left stick flies (forward/back, turn), A or RT up, B or LT down, RB or L3 faster
  heli: { a: ' ', b: 'control', x: null, y: 'e', lb: null, rb: 'shift', lt: 'control', rt: ' ', ls: 'shift', rs: null, up: null, down: 'v', left: 'o', right: 'backspace', view: 'm', start: 'escape', stick: 'move' },
  pigeon: { a: ' ', b: 'control', x: 'f', y: 'e', lb: 'c', rb: 'q', lt: 'shift', rt: '@fire', ls: 'shift', rs: null, up: null, down: 'x', left: 'o', right: null, view: 'm', start: 'escape', stick: 'move' },
  train: { a: ' ', b: 'backspace', x: 'h', y: 'e', lb: null, rb: 'g', lt: 's', rt: 'w', ls: null, rs: null, up: null, down: null, left: 'o', right: null, view: 'm', start: 'escape', stick: 'move' },
  // carbid, botsauto's, padel and the other games on foot: B stops the game
  minigame: { ...FOOT, b: 'backspace', lt: '@aim', rt: '@fire', stick: 'move' },
  // the carillon: eight bells on the D-pad and the face buttons (A S D F J K L ;), the bumpers pick a tune
  klokken: { a: ';', b: 'l', x: 'j', y: 'k', lb: 'q', rb: 'e', lt: 'backspace', rt: ' ', ls: null, rs: null, up: 'f', down: 's', left: 'a', right: 'd', view: 'm', start: 'escape', stick: 'arrows' },
  // the pancake ship: A B X Y serve the four toppings (Q W E R), the bumpers and LT pick the pans (1 2 3), RT stops
  pannenkoek: { a: 'q', b: 'w', x: 'e', y: 'r', lb: '1', rb: '2', lt: '3', rt: 'backspace', ls: null, rs: null, up: null, down: null, left: null, right: null, view: 'm', start: 'escape', stick: 'none' },
  // the Fjord Frituur: the D-pad and the bumpers pick from the menu
  foodtruck: { a: ' ', b: 'backspace', x: 'backspace', y: 'e', up: '1', right: '2', down: '3', left: '4', lb: '5', rb: '6', lt: null, rt: '@gas', ls: null, rs: null, view: 'm', start: 'escape', stick: 'move' },
  menu: { a: 'enter', b: 'escape', x: 'delete', y: ' ', lb: 'q', rb: 'e', lt: '[', rt: ']', ls: null, rs: null, up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', view: 'm', start: 'escape', stick: 'nav' },
};

// The button for a canonical key or a mouse token in a situation, as a slot
// name ('a', 'rt', ...) or 'lstick'/'rstick'; null when the pad has none.
export function padSlotFor(token, ctx = 'foot') {
  const map = PAD_MAPS[ctx] || FOOT;
  let t = String(token).trim().toUpperCase();
  const ARROW = { '↑': 'arrowup', '↓': 'arrowdown', '←': 'arrowleft', '→': 'arrowright' };
  if (/^[↑↓←→]{2,}$/.test(t)) t = 'ARROWS';
  else if (ARROW[t]) token = ARROW[t];
  if (t === '⌫') token = 'backspace';
  if (t === 'MOUSE') return 'rstick';
  if (t === 'WASD' || t === 'ARROWS') return map.stick === 'nav' ? 'dpad' : 'lstick';
  if (t === 'LMB') return find(map, '@fire') || find(map, '@gas');
  if (t === 'RMB') return find(map, '@aim');
  if (t === 'WHEEL') return find(map, '@wheel+');
  const k = tokenKey(token);
  if (ctx !== 'menu' && (map.stick === 'steer') && (k === 'a' || k === 'd')) return 'lstick';
  if (map.stick === 'steer' && k === 'w') return find(map, '@gas');
  if (map.stick === 'steer' && k === 's') return find(map, '@brake');
  if (map.stick === 'move' && 'wasd'.includes(k) && k.length === 1) return find(map, k) || 'lstick';
  if (map.stick === 'arrows' && k.startsWith('arrow')) return 'lstick';
  const hit = find(map, k);
  if (hit) return hit;
  // in menus Backspace goes back like Esc
  if (ctx === 'menu' && k === 'backspace') return find(map, 'escape');
  // 'f' does what 'e' does in most places (enter, use)
  if (k === 'f') return find(map, 'e');
  return null;
}

function find(map, v) {
  for (const s of PAD_BUTTONS) if (map[s] === v) return s;
  return null;
}

// Labels per controller family. Xbox and the Steam Deck share letters; the
// PlayStation face buttons are shapes (drawn by glyphs.js).
export const PAD_LAYOUTS = {
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', view: 'Overzicht', start: 'Menu', ls: 'L3', rs: 'R3', lstick: 'L', rstick: 'R' },
  ps: { a: 'cross', b: 'circle', x: 'square', y: 'triangle', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', view: 'Delen', start: 'Opties', ls: 'L3', rs: 'R3', lstick: 'L', rstick: 'R' },
  // Switch: dezelfde plekken, andere letters (de onderste knop is B)
  switch: { a: 'B', b: 'A', x: 'Y', y: 'X', lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR', view: '−', start: '+', ls: 'L3', rs: 'R3', lstick: 'L', rstick: 'R' },
  deck: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', view: 'Overzicht', start: 'Menu', ls: 'L3', rs: 'R3', lstick: 'L', rstick: 'R' },
};
export const PAD_SLOT_NAMES = {
  a: 'Onderste knop', b: 'Rechter knop', x: 'Linker knop', y: 'Bovenste knop', lb: 'Linker bumper', rb: 'Rechter bumper',
  lt: 'Linker trigger', rt: 'Rechter trigger', view: 'Overzicht/Terug', start: 'Menu/Start', ls: 'Linker stick indrukken', rs: 'Rechter stick indrukken',
  up: 'D-pad omhoog', down: 'D-pad omlaag', left: 'D-pad links', right: 'D-pad rechts',
};

export function padFamily(id) {
  const s = String(id || '').toLowerCase();
  if (/28de|steam deck|valve/.test(s)) return 'deck';
  if (/057e|nintendo|switch|pro controller|joy-?con/.test(s)) return 'switch';
  if (/054c|dualsense|dualshock|playstation/.test(s) || (/wireless controller/.test(s) && !/xbox|045e/.test(s))) return 'ps';
  return 'xbox';
}

// Wat de controllertest en de hints van een pad weten, puur uit de id-tekst en
// `mapping` van de Gamepad API: soort, indeling en of de knoppen standaard
// liggen. Zonder 'standard' mapping (oude Steam Controller, losse Joy-Cons)
// klopt de knoppositie niet: dan zegt `note` wat de speler kan doen.
export function padInfo(id, mapping = '') {
  const s = String(id || '').toLowerCase();
  const family = padFamily(id);
  const standard = mapping === 'standard' || /standard gamepad/.test(s);
  let name = { xbox: 'Controller met letterknoppen', ps: 'Controller met vormknoppen', switch: 'Controller met wisselende letters', deck: 'Handheld' }[family];
  if (/steam controller/.test(s) || (/28de/.test(s) && /product:\s*(1102|1142)/.test(s))) name = 'Controller met trackpads';
  else if (/joy-?con/.test(s)) name = 'Losse controllerhelft';
  else if (/pro controller/.test(s)) name = 'Controller met wisselende letters';
  let note = '';
  if (!id) note = 'Geen controller gevonden. Druk op een knop.';
  else if (!standard) note = 'Dit pad meldt geen standaardindeling: de knoppen kunnen verkeerd liggen. Zet de controller in de standaardmodus (letterknoppen), of kies bij Knoppen tonen als de juiste indeling.';
  return { family, name: id ? name : '', standard, note };
}

// What a button does on foot and in a vehicle, for the remap list.
export function slotUses(slot) {
  const words = [];
  const say = (ctx, label) => {
    const v = PAD_MAPS[ctx][slot];
    if (!v) return;
    const d = describe(v);
    if (d && !words.some((w) => w.endsWith(d))) words.push((label ? label + ': ' : '') + d);
  };
  say('foot', '');
  say('vehicle', 'rijden');
  const m = PAD_MAPS.menu[slot];
  if (m && MENU_WORDS[m]) words.push('menu: ' + MENU_WORDS[m]);
  return words.join(' · ');
}

const ACTION_WORDS = Object.fromEntries(KEY_ACTIONS.map(([k, d]) => [k, d.split(/[;,]/)[0]]));
Object.assign(ACTION_WORDS, {
  '@fire': 'Aanvallen, schieten', '@aim': 'Richten', '@wheel+': 'Volgend wapen', '@wheel-': 'Vorig wapen', '@gas': 'Gas', '@brake': 'Remmen, achteruit',
  escape: 'Pauzemenu', enter: 'Kiezen', delete: 'Doel wissen',
  arrowup: 'Omhoog', arrowdown: 'Omlaag', arrowleft: 'Links', arrowright: 'Rechts', ' ': 'Springen, handrem', q: 'Achterom kijken', e: 'Instappen, gebruiken', f: 'Gebruiken (tweede knop), duif: poepen', m: 'Kaart',
});
const MENU_WORDS = { enter: 'kiezen', escape: 'terug', delete: 'doel wissen', ' ': 'naar jezelf op de kaart', q: 'vorig onderdeel', e: 'volgend onderdeel', '[': 'vorig tabblad, uitzoomen', ']': 'volgend tabblad, inzoomen', m: 'kaart' };
export function describe(v) {
  return ACTION_WORDS[v] || '';
}

// Look back in a vehicle (hold Q, the right stick or the middle mouse
// button): off during a camera override and while a minigame owns Q.
export function lookBackActive({ inVehicle, override, noLookBack, qDown, middleDown }) {
  return !!inVehicle && !override && ((!!qDown && !noLookBack) || !!middleDown);
}

// How far the chase camera closes on its target this frame. Looking back it
// is rigid: a lagging camera trails the car by speed/rate metres, which at
// speed puts it behind the car again, looking forward.
export const CHASE_FOLLOW_RATE = 6;
export function chaseFollowLerp(dt, { cut = false, lookBack = false } = {}) {
  return cut || lookBack ? 1 : Math.min(1, dt * CHASE_FOLLOW_RATE);
}

// Het invoerlaag-overzicht als data (#151): per situatie welke knop welke
// actie doet, en per toets in KEY_ACTIONS welke knop erbij hoort. Voor het
// besturingsoverzicht en voor tests die gaten en dubbele knoppen zoeken.
export function inputOverview() {
  const out = {};
  for (const [ctx, map] of Object.entries(PAD_MAPS)) {
    const rows = [];
    for (const s of PAD_BUTTONS) if (map[s]) rows.push({ slot: s, action: map[s], label: describe(map[s]) });
    const byAction = {};
    for (const r of rows) (byAction[r.action] = byAction[r.action] || []).push(r.slot);
    out[ctx] = { stick: map.stick, rows, duplicates: Object.entries(byAction).filter(([, v]) => v.length > 1).map(([action, slots]) => ({ action, slots })) };
  }
  return out;
}
