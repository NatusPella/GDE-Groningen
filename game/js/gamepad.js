import { hoofdspeler } from './players.js';
// Controller support through the Gamepad API (Xbox, PlayStation, Steam Deck;
// anything in the browser's "standard" mapping). Polled once per animation
// frame. Buttons become the keys the game already knows (controls.js
// PAD_MAPS, per situation) and are sent as key events to the focused
// element, so every menu, minigame and cutscene that listens for keys works
// unchanged; the sticks and triggers feed input.js directly (analog walking,
// steering, the camera, the mouse buttons). The last input used decides
// which glyphs the hints show: `pad-active` on <html> plus `data-pad` with
// the controller family; any real key or mouse use switches back.
import { PAD_BUTTONS, PAD_MAPS, PAD_COOP, GAME_PAD_CTX, buttonSlots, nintendoSwap, padFamily, coopVraag, HENGEL_HINT, isSamenSessie, WHEEL_CTX, WHEEL_HOLD_MS } from './controls.js';
import { getSettings, onSettingsChange } from './settings.js';
import { sendKey } from './input.js';
import { playerBusy } from './busy.js';
import { radialDeadzone, pickPad, spatialNext, nextSelectIndex, isPadTextField, DEAD } from './padlogic.js';
import { stickSteerCurve, pedalAxis } from './pedalfeel.js';
import { noteDevice, onDeviceChange } from './inputdevice.js';
import { hapticScale, hapticFrame, makeHapticState, eventProfile, drainHapticEvents, playHaptic } from './haptics.js';
import { reducedMotion } from './motion.js';
import { openRadial, closeRadial, radialIsOpen, radialAim, radialStep, radialPage, radialChoose, setRadialRunner, itemKeys } from './actionradial.js';
import { initActionRadialUi } from './actionradialui.js';

const TRIGGER_ON = 0.35;
const TRIGGER_OFF = 0.2;
const STICK_KEY_ON = 0.5;
const STICK_KEY_OFF = 0.35;
const REPEAT_DELAY = 380;
const REPEAT_EVERY = 110;
// the right stick at full tilt turns the camera like this many mouse px a second
const LOOK_PX_PER_S = 1100;
const WHEEL_TICK = 100;

let input = null;
let world = null;
let hooks = {};
let active = false;
let family = 'xbox';
let ctx = 'menu';
let lastT = 0;
let padIndex = -1;
// slot -> pressed last frame
const prevSlots = {};
// what each held slot sent, so its release undoes exactly that
const heldAction = {};
// stick-made keys held right now
const stickKeys = new Set();
const repeatAt = {};
let capture = null;
let captureBlock = new Set();
let slotMap = buttonSlots({});
const listeners = new Set();
let sprintLatch = false;
// Het acties-wiel (controls.js wheelItemsFor, actionradial.js): Overzicht (view) kort is de kaart, lang (of een tik in de tikstand) is het wiel.
// idle: los; down: ingedrukt, nog geen keuze; wheel: het wiel is door deze druk geopend of gesloten, loslaten doet niets meer.
let viewState = 'idle';
let viewAt = 0;
let radialSeen = false; // het wiel stond al open toen de vorige pollronde begon
// toetsen die het wiel indrukte en die over een paar beelden weer loskomen (Shift+N moet minstens een beeld Shift houden)
const pendingUp = [];
const WHEEL_KEY_MS = 90;


let rumbleUntil = 0;

export function onPadChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// the hint source setting can pin the glyphs to keys or to the controller
function hintsOnPad() {
  const src = getSettings().hintSource;
  return src === 'pad' ? true : src === 'keys' ? false : active;
}

// Index of the pad that drives player 1 (-1: none); coop gives player 2 another.
export function activePadIndex() { return padIndex; }

export function padState() {
  return { active: hintsOnPad(), family, ctx };
}

export function isPadActive() {
  return hintsOnPad();
}

function emit() {
  for (const cb of listeners) cb(padState());
}

function layoutFor(id) {
  const pref = getSettings().padLayout;
  return pref && pref !== 'auto' ? pref : padFamily(id);
}

function setActive(on, id) {
  const fam = on ? layoutFor(id) : family;
  if (on === active && fam === family) return;
  active = on;
  if (on) noteDevice('pad');
  family = fam;
  slotMap = buttonSlots(padBinds, family);
  if (input) input.padLook = on;
  const html = document.documentElement;
  html.classList.toggle('pad-active', on);
  html.dataset.pad = family;
  if (!on) {
    releaseAll(); closeRadial(); viewState = 'idle';
    // #1297: a button held when the pad drops out (or the keyboard takes over) is released above; forget its last
    // state too, otherwise the first press of that button after reconnecting looks like 'still held' and is swallowed
    for (const s of Object.keys(prevSlots)) delete prevSlots[s];
  }
  emit();
}

// Next button press goes to cb(slot as pressed physically) instead of the
// game (the remap screen). Returns a cancel function.
export function capturePadButton(cb) {
  capture = cb;
  // the button that chose the row is still down: it doesn't count
  const pad = currentPad();
  captureBlock = new Set();
  if (pad) pad.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > TRIGGER_OFF)) captureBlock.add(i); });
  return () => { if (capture === cb) capture = null; };
}

// Vibration via haptics.js: the setting 'rumble' (on/off), 'rumbleStrength' and 'Beweging beperken' decide.
function rumble(strong = 0.5, weak = 0.5, ms = 150) {
  if (!active) return;
  const scale = hapticScale({ ...getSettings(), reduceMotion: reducedMotion() });
  if (!(scale > 0)) return;
  const now = performance.now();
  if (now < rumbleUntil - ms * 0.5) return;
  if (playHaptic(currentPad(), strong * scale, weak * scale, ms)) rumbleUntil = now + ms;
}

function currentPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  if (padIndex >= 0 && pads[padIndex] && pads[padIndex].connected) return pads[padIndex];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

function started() {
  return document.body.classList.contains('game-started');
}

// De vraag van Samen spelen (J of N) staat in controls.js (coopVraag): de controller en de aanraakbediening
// stellen hem daarmee op precies dezelfde manier (#151).
// Staat de vrije hengelhint van prompts.js (id 'hengel-vrij') onderin? Die verschijnt alleen als je aan de
// waterkant staat met niets anders te doen; zolang hij er staat, hengelt X (#151). Zo hoeft de voetindeling
// zelf geen I te krijgen: X blijft daar F, voor het uitstappen bij de attracties en de aanraakbediening.
function hengelHint() {
  return !!(typeof document !== 'undefined' && document.querySelector && document.querySelector(HENGEL_HINT));
}

// Menu-achtig: de menu-indeling en het schermtoetsenbord (onscreenkeyboard.js) lopen met pijlen, herhaling en de stick als pijlen.
const menuLike = (c = ctx) => c === 'menu' || c === 'osk';

// Which PAD_MAPS table applies right now.
function context() {
  // het schermtoetsenbord staat open: zijn eigen indeling (A typt, B wist), ook boven het menu of het wachtscherm
  if (document.documentElement.classList.contains('osk-open')) return 'osk';
  if (!started() || (hooks.menuOpen && hooks.menuOpen())) return 'menu';
  const w = world;
  if (!w) return 'foot';
  if (w.pigeonMode) return 'pigeon';
  if (w.trainDriving) return 'train';
  if (w.challenge && w.challenge.id === 'fjord') return 'foodtruck';
  // de vliegschool (#397) blijft de hele les een activiteit, ook als je in het lesvliegtuig zit: in de lucht
  // de gewone vliegindeling, in het lesmenu de pijlen met A en B (anders stopte B de les en kon je niet bladeren)
  if (w.activityGame === 'vliegschool') {
    const sv = hoofdspeler(w) && hoofdspeler(w).inVehicle;
    if (sv && sv.isPlane) return 'plane';
    if (sv && sv.isHeli) return 'heli';
    return 'vliegschool';
  }
  if (w.voetbalGame) return GAME_PAD_CTX.voetbal; // ook een gast speelt voetbal op zijn eigen scherm (#981)
  if (GAME_PAD_CTX[w.activityGame]) return GAME_PAD_CTX[w.activityGame];
  if (playerBusy(w, ['padel', 'activityGame']).busy) return 'minigame';
  // de wandeling neemt de speler niet over (wandeling.js), maar B hoort hem wel te stoppen
  if (w.wandelingActief) return 'minigame';
  // het wachtscherm als een speler wegvalt (coophold.js) staat stil en heeft doodgewone dialoogknoppen: in de
  // menu-indeling lopen de pijlen erlangs en klikt A de gefocuste (#151)
  if (w.coopHold) return 'menu';
  // een vraag van Samen spelen: A is ja, B is nee (#151)
  if (coopVraag(w)) return 'coopvraag';
  const v = hoofdspeler(w) && hoofdspeler(w).inVehicle;
  // een zeilboot (boattypes.js `zeil`) vaart met de skûtsje-indeling: Q en Z op de bumpers, D-pad omlaag hengelt
  // in een boot die stilligt (#151); een trekker op het erf heeft zijn eigen werktuigknoppen (#151)
  if (v) return v.isPlane ? 'plane' : v.isHeli ? 'heli' : w.noLookBack || (v.model && v.model.zeil) ? 'skutsje' : v.farm ? 'trekker' : v.gb && getSettings().shiftMode !== 'auto' ? 'vehicleManual' : v.isBus ? 'bus' : 'vehicle';
  // een bijbaan of tekstpaneel dat de invoer opeist (stagechoice, rechtbank, boa, snackbar: minigameUntil) leest
  // de cijfers 1-4, Tab en Backspace: de minigame-indeling heeft ze (#151). In een voertuig (taxi, bus) blijft de
  // voertuigindeling, want daar rijdt de speler.
  if (w.minigameUntil > w.time) return 'minigame';
  if (hengelHint()) return 'hengelen';
  return 'foot';
}


const tapMode = () => { const t = getSettings().tikStand; return !!t && t !== 'uit'; };
const wheelCtx = () => WHEEL_CTX.includes(ctx) && started() && !(hooks.menuOpen && hooks.menuOpen());
const wheelOpts = () => ({ samen: !!(world && isSamenSessie(world)), tap: tapMode() });

// Een gekozen onderdeel van het wiel: dezelfde toetsen als het toetsenbord, even vastgehouden.
function playWheelItem(it) {
  const k = itemKeys(it);
  for (const key of k.down) sendKey('keydown', key, 'pad');
  pendingUp.push({ at: lastT + WHEEL_KEY_MS, keys: k.up }); // de klok van de pollronde (lastT), dezelfde als die van flushUp
}
function flushUp(now) {
  while (pendingUp.length && pendingUp[0].at <= now) for (const key of pendingUp.shift().keys) sendKey('keyup', key, 'pad');
}

// Overzicht in het spel: tik is de kaart (bij het loslaten), houden of (tikstand) een tik opent het wiel.
function viewButton(on, was, now) {
  if (on && !was) {
    viewState = 'down'; viewAt = now;
    if (tapMode() && openRadial(ctx, wheelOpts())) { viewState = 'wheel'; releaseAll(); }
  } else if (on && viewState === 'down' && now - viewAt >= WHEEL_HOLD_MS) {
    if (openRadial(ctx, wheelOpts())) { viewState = 'wheel'; releaseAll(); } else viewState = 'nowheel';
  } else if (!on && was) {
    const tik = viewState === 'down' || viewState === 'nowheel';
    viewState = 'idle';
    if (tik) { sendKey('keydown', 'm', 'pad'); sendKey('keyup', 'm', 'pad'); }
  }
}

// Zolang het wiel open staat gaat geen enkele knop of stick naar het spel: A kiest, B sluit, LB en RB bladeren, de D-pad en de stick kiezen.
function wheelFrame(slots, pad, now) {
  const edge = (s) => slots[s] && !prevSlots[s];
  if (edge('b') || edge('start')) closeRadial();
  else if (edge('view')) { closeRadial(); viewState = 'wheel'; }
  else if (edge('a')) radialChoose();
  else if (edge('lb')) radialPage(-1);
  else if (edge('rb')) radialPage(1);
  else for (const d of ['up', 'down', 'left', 'right']) if (edge(d)) radialStep(d);
  if (!slots.view && viewState === 'wheel') viewState = 'idle';
  const ax = pad.axes || [];
  const [lx, ly] = dz(ax[0] || 0, ax[1] || 0);
  if (radialIsOpen()) radialAim(lx, ly, 0.5, now);
  for (const s of Object.keys(slots)) prevSlots[s] = slots[s];
}

function press(slot) {
  const map = PAD_MAPS[ctx] || PAD_MAPS.foot;
  let a = map[slot];
  // Samen spelen: in een voertuig geeft D-pad omhoog het stuur (Y op het toetsenbord). Alleen spelen is
  // een sessie van één en houdt de gewone indeling (#560).
  const coop = world && isSamenSessie(world) && PAD_COOP[ctx];
  if (coop && coop[slot]) a = coop[slot];
  if (a == null) return;
  if (ctx === 'menu') a = menuKey(slot, a);
  if (a == null) return;
  heldAction[slot] = a;
  if (a === '@fire') { input.mouse.down = true; return; }
  if (a === '@aim') { input.setAim ? input.setAim(true) : (input.mouse.rightDown = true); return; }
  if (a === '@wheel+' || a === '@wheel-') { input.mouse.wheel += a === '@wheel+' ? WHEEL_TICK : -WHEEL_TICK; return; }
  if (a === '@gas' || a === '@brake') return; // analog, in sticks()
  if (slot === 'ls' && a === 'shift' && map.stick === 'move') { sprintLatch = !sprintLatch; delete heldAction[slot]; return; }
  const ev = sendKey('keydown', a, 'pad');
  if (menuLike()) {
    repeatAt[slot] = a.startsWith('arrow') || a === '[' || a === ']' || (ctx === 'osk' && (a === 'backspace' || a === 'pageup' || a === 'pagedown')) ? performance.now() + REPEAT_DELAY : Infinity;
    if (ctx === 'menu') menuFallback(a, ev);
  }
}

function release(slot) {
  const a = heldAction[slot];
  delete heldAction[slot];
  delete repeatAt[slot];
  if (a == null) return;
  if (a === '@fire') { input.mouse.down = false; return; }
  if (a === '@aim') { input.setAim ? input.setAim(false) : (input.mouse.rightDown = false); return; }
  if (a.startsWith('@')) return;
  sendKey('keyup', a, 'pad');
}

// The menus differ a little: B goes back a level in the phone section, A is Space
// on the title screen (the attract intro skips on a held Space), and the
// triggers zoom the map.
function menuKey(slot, a) {
  const open = hooks.phoneOpen && hooks.phoneOpen();
  if (slot === 'b' && open) return 'backspace';
  if (slot === 'a' && !started()) return ' ';
  if ((slot === 'lt' || slot === 'rt') && hooks.mapOpen && hooks.mapOpen()) return slot === 'lt' ? '-' : '+';
  // een open winkel heeft tabbladen (Afdeling): LB en RB wisselen ze net als in het pauzemenu (shopui.js leest [ en ])
  if ((slot === 'lb' || slot === 'rb') && document.body.classList.contains('shop-open')) return slot === 'lb' ? '[' : ']';
  if ((slot === 'lb' || slot === 'rb') && !(hooks.pauseOpen && hooks.pauseOpen())) return null;
  return a;
}

// summary (uitklapper) en textarea horen erbij: zonder die twee sloeg de D-pad ze over (de uitleg bij een toestemmingsvinkje, een tekstvak)
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// A dialog that has no key handling of its own still works: arrows walk its
// buttons, A clicks the focused one.
function menuFallback(a, ev) {
  if (ev.defaultPrevented) return;
  const el = document.activeElement;
  // een keuzelijst (<select>) opent niet met een nagebootste toets: A stapt naar de volgende optie, X naar de vorige (controller-review 22-11)
  if ((a === 'enter' || a === ' ' || a === 'delete') && el && el.tagName === 'SELECT') {
    const j = nextSelectIndex([...el.options].map((o) => !o.disabled), el.selectedIndex, a === 'delete' ? -1 : 1);
    if (j >= 0 && j !== el.selectedIndex) {
      el.selectedIndex = j;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }
  // B in een tekstveld gaat eerst uit het veld (een niveau terug), anders bleef B er dood: het veld houdt zijn eigen toetsen
  if (a === 'escape' && isPadTextField(el)) { leaveTextField(el); return; }
  if ((a === 'enter' || a === ' ') && el && el !== document.body) {
    if (el.matches('button, a, [role="button"], [role="tab"], [role="radio"], summary, input[type="checkbox"]')) el.click();
    return;
  }
  if (!a.startsWith('arrow')) return;
  stepFocus(a);
}

// de focus een stap in een richting: eerst de buur op het scherm, anders door de lijst heen
function stepFocus(a) {
  const el = document.activeElement;
  const scope = (el && el.closest && el.closest('[role="dialog"], [role="alertdialog"]')) || document.querySelector('[role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])') || document.body;
  const list = [...scope.querySelectorAll(FOCUSABLE)].filter((b) => b.getClientRects().length && !b.closest('[hidden]'));
  if (!list.length) return;
  const i = list.indexOf(el);
  // eerst de buur in die richting op het scherm, anders door de lijst heen
  const rects = list.map((b) => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  let j = spatialNext(rects, i, a.slice(5));
  if (j < 0) j = i < 0 ? 0 : (i + (a === 'arrowup' || a === 'arrowleft' ? -1 : 1) + list.length) % list.length;
  const next = list[j];
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest' });
}

function leaveTextField(el) {
  stepFocus('arrowup');
  if (document.activeElement === el) stepFocus('arrowdown');
  if (document.activeElement === el) el.blur();
}

const dz = (x, y) => radialDeadzone(x, y, DEAD);

function holdStick(k, on) {
  if (on === stickKeys.has(k)) return;
  if (on) stickKeys.add(k); else stickKeys.delete(k);
  if (menuLike()) {
    if (on) { const ev = sendKey('keydown', k, 'pad'); repeatAt['stick-' + k] = performance.now() + REPEAT_DELAY; if (ctx === 'menu') menuFallback(k, ev); } else { sendKey('keyup', k, 'pad'); delete repeatAt['stick-' + k]; }
    return;
  }
  input.padHold(k, on);
}

// hysteresis: a key goes on past STICK_KEY_ON, off below STICK_KEY_OFF
const past = (v, k) => (stickKeys.has(k) ? v > STICK_KEY_OFF : v > STICK_KEY_ON);

function sticks(pad, dt) {
  const map = PAD_MAPS[ctx] || PAD_MAPS.foot;
  const ax = pad.axes || [];
  const [lx, ly] = dz(ax[0] || 0, ax[1] || 0);
  const [rx, ry] = dz(ax[2] || 0, ax[3] || 0);
  const lt = trig(pad, 'lt'), rt = trig(pad, 'rt');
  let axis = [0, 0];
  const mode = map.stick;
  if (mode === 'move') {
    axis = [lx, ly];
    holdStick('w', past(-ly, 'w')); holdStick('s', past(ly, 's'));
    holdStick('a', past(-lx, 'a')); holdStick('d', past(lx, 'd'));
    if (sprintLatch && Math.hypot(lx, ly) < 0.3) sprintLatch = false;
    holdStick('shift', sprintLatch);
  } else if (mode === 'steer') {
    const gas = map.rt === '@gas' ? rt : 0;
    const brake = map.lt === '@brake' ? lt : 0;
    // analog pedals and an expo curve on the steering stick (pedalfeel.js); the keys below keep the raw values
    axis = [stickSteerCurve(lx), pedalAxis(gas, brake)];
    holdStick('w', past(gas, 'w')); holdStick('s', past(brake, 's'));
    holdStick('a', past(-lx, 'a')); holdStick('d', past(lx, 'd'));
  } else if (mode === 'arrows') {
    holdStick('arrowup', past(-ly, 'arrowup')); holdStick('arrowdown', past(ly, 'arrowdown'));
    holdStick('arrowleft', past(-lx, 'arrowleft')); holdStick('arrowright', past(lx, 'arrowright'));
  } else if (mode === 'nav') {
    // one direction at a time, the stronger one
    const horiz = Math.abs(lx) > Math.abs(ly);
    holdStick('arrowleft', horiz && past(-lx, 'arrowleft')); holdStick('arrowright', horiz && past(lx, 'arrowright'));
    holdStick('arrowup', !horiz && past(-ly, 'arrowup')); holdStick('arrowdown', !horiz && past(ly, 'arrowdown'));
  }
  input.padAxis = axis;
  if (menuLike()) {
    // right stick scrolls whatever list has the focus
    if (ry) {
      let el = document.activeElement;
      while (el && el !== document.body && !(el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
      // 22-11: staat de focus buiten het scrollgebied (bv. op de rail), dan scrolt de stick het eerste zichtbare gebied met meer inhoud
      if (!el || el === document.body) el = [...document.querySelectorAll('.ds-scroll[data-onder="1"], .ds-scroll[data-boven="1"]')].find((e) => e.offsetParent !== null) || null;
      if (el && el !== document.body) el.scrollBy(0, ry * 900 * dt);
    }
    return;
  }
  if (rx || ry) {
    const k = LOOK_PX_PER_S * (getSettings().padLookSensitivity || 1) * dt;
    input.mouse.dx += rx * Math.abs(rx) * k;
    input.mouse.dy += ry * Math.abs(ry) * k * 0.7;
  }
}

function trig(pad, slot) {
  const idx = PAD_BUTTONS.indexOf(physicalOf(slot));
  const b = pad.buttons[idx];
  return b ? (typeof b.value === 'number' ? b.value : b.pressed ? 1 : 0) : 0;
}

let padBinds = {};
function physicalOf(slot) {
  const p = padBinds[slot];
  return p || slot;
}

function readSlots(pad) {
  const out = {};
  for (let i = 0; i < PAD_BUTTONS.length; i++) {
    const b = pad.buttons[i];
    if (!b) continue;
    const phys = PAD_BUTTONS[i];
    const slot = slotMap[phys] || phys;
    const v = typeof b.value === 'number' ? b.value : 0;
    const was = prevSlots[slot];
    out[slot] = phys === 'lt' || phys === 'rt' ? (was ? v > TRIGGER_OFF : v > TRIGGER_ON) || (b.pressed && v === 0) : !!b.pressed;
  }
  return out;
}

function releaseAll() {
  for (const s of Object.keys(heldAction)) release(s);
  for (const k of [...stickKeys]) holdStick(k, false);
  sprintLatch = false;
  if (input) { input.padAxis = [0, 0]; input.mouse.down = false; input.mouse.rightDown = false; }
}

function anyInput(pad) {
  for (const b of pad.buttons) if (b && (b.pressed || b.value > 0.3)) return true;
  for (const a of pad.axes) if (Math.abs(a) > 0.45) return true;
  return false;
}

const feelState = makeHapticState();
const feelSnap = { hp: 0, speed: null, kind: '', ground: '', slip: 0, money: 0, wanted: 0, impact: null, melee: null, kickFov: 0, inVehicle: false };

function vehicleKind(v) {
  return v.isHeli ? 'heli' : v.isPlane ? 'plane' : v.isBoat ? 'boat' : v.isBus ? 'bus' : v.isBike || v.isScooter ? 'bike' : 'car';
}

function playQueued(name, k) {
  const p = eventProfile(name, k, 1);
  rumble(p.strong, p.weak, p.ms);
}

function watchFeel(dt) {
  const w = world;
  if (!w || menuLike() || !active) { feelState.hp = null; feelState.speed = null; feelState.money = null; return; }
  const scale = hapticScale({ ...getSettings(), reduceMotion: reducedMotion() });
  const sn = feelSnap, me = hoofdspeler(w), v = me && me.inVehicle;
  sn.hp = (w.health || 0) + (w.armor || 0);
  sn.speed = v && Number.isFinite(v.speed) ? v.speed : null;
  sn.kind = v ? vehicleKind(v) : '';
  sn.ground = v ? v.ground || '' : '';
  sn.slip = v && Number.isFinite(v.slipAngle) ? v.slipAngle : 0;
  sn.money = w.money || 0;
  sn.wanted = w.wanted || 0;
  sn.impact = w.lastImpact || null;
  sn.melee = w.lastMeleeHit || null;
  sn.kickFov = w.camKick ? w.camKick.fov || 0 : 0;
  sn.inVehicle = !!v;
  const o = hapticFrame(feelState, sn, dt, scale > 0 ? 1 : 0); // rumble() applies the scale
  if (o.ms > 0) rumble(o.strong, o.weak, o.ms);
  if (scale > 0) drainHapticEvents(playQueued);
}

// B (1) or Start (9) on any connected pad: the controller's way to stop the
// benchmark (#159, #379). trailer.js turns this branch on during a benchmark;
// the buttons go nowhere else, so the menu behind the overlay stays still.
// Returns a function that turns the branch off again.
let benchStop = null;
export function onBenchmarkStop(cb) {
  benchStop = cb;
  releaseAll();
  return () => { if (benchStop === cb) benchStop = null; };
}

function poll(now) {
  requestAnimationFrame(poll);
  const dt = Math.min(0.05, Math.max(0, (now - (lastT || now)) / 1000));
  lastT = now;
  flushUp(now);
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  // coop: speler 1 houdt zijn pad, ook als speler 2 op de andere drukt
  padIndex = pickPad([...pads].filter(Boolean).map((p) => ({ index: p.index, connected: p.connected, active: anyInput(p) })), padIndex, { sticky: !!(world && world.coop) });
  const pad = padIndex >= 0 ? pads[padIndex] : null;
  if (!pad) { if (active) setActive(false); return; }
  if (!active) {
    if (!anyInput(pad)) return;
    setActive(true, pad.id);
  }
  const nctx = context();
  if (nctx !== ctx) {
    releaseAll();
    closeRadial();
    ctx = nctx;
    document.documentElement.dataset.padCtx = ctx;
    emit();
  }
  const slots = readSlots(pad);
  if (capture) {
    for (const i of [...captureBlock]) if (!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > TRIGGER_OFF))) captureBlock.delete(i);
    for (let i = 0; i < PAD_BUTTONS.length; i++) {
      const b = pad.buttons[i];
      if (b && (b.pressed || b.value > TRIGGER_ON) && !captureBlock.has(i)) {
        const cb = capture;
        capture = null;
        captureBlock = new Set(pad.buttons.map((x, j) => (x && (x.pressed || x.value > TRIGGER_OFF) ? j : -1)).filter((j) => j >= 0));
        cb(nintendoSwap(PAD_BUTTONS[i], family)); // opgeslagen als vóór de Nintendo-wissel
        break;
      }
    }
    for (const s of Object.keys(slots)) prevSlots[s] = slots[s];
    return;
  }
  // buttons still held from a capture do nothing until they are let go
  if (captureBlock.size) {
    for (const i of [...captureBlock]) if (!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > TRIGGER_OFF))) captureBlock.delete(i);
    for (const s of Object.keys(slots)) prevSlots[s] = slots[s];
    if (captureBlock.size) return;
  }
  // benchmark (#379): B or Start stops the run; no other input reaches the game
  if (benchStop) {
    const stop = (slots.b && !prevSlots.b) || (slots.start && !prevSlots.start);
    for (const s of Object.keys(slots)) prevSlots[s] = slots[s];
    if (stop) { const cb = benchStop; benchStop = null; cb(); }
    return;
  }
  if (radialIsOpen()) {
    // een wiel dat niet door deze knoppen openging (het zenderwiel na N vasthouden): eerst alles loslaten wat nog ingedrukt staat
    if (!radialSeen) releaseAll();
    radialSeen = true;
    if (wheelCtx()) { wheelFrame(slots, pad, now); return; }
    closeRadial();
  }
  radialSeen = false;
  for (const s of PAD_BUTTONS) {
    const on = !!slots[s];
    if (s === 'view' && wheelCtx()) { viewButton(on, !!prevSlots[s], now); prevSlots[s] = on; continue; }
    if (on && !prevSlots[s]) press(s);
    else if (!on && prevSlots[s]) release(s);
    else if (on && repeatAt[s] && now >= repeatAt[s] && heldAction[s]) {
      repeatAt[s] = now + REPEAT_EVERY;
      const ev = sendKey('keydown', heldAction[s], 'pad', { repeat: true });
      menuFallback(heldAction[s], ev);
    }
    prevSlots[s] = on;
  }
  for (const [k, at] of Object.entries(repeatAt)) {
    if (!k.startsWith('stick-') || now < at) continue;
    repeatAt[k] = now + REPEAT_EVERY;
    const key = k.slice(6);
    const ev = sendKey('keydown', key, 'pad', { repeat: true });
    menuFallback(key, ev);
  }
  sticks(pad, dt);
  watchFeel(dt);
}

// hooks: { menuOpen, phoneOpen, pauseOpen, mapOpen } from main.js
export function initGamepad(inp, w, h = {}) {
  if (typeof window === 'undefined' || input) return;
  input = inp;
  world = w;
  hooks = h;
  onSettingsChange((st, key) => {
    if (!key || key === 'padBinds') { padBinds = { ...st.padBinds }; slotMap = buttonSlots(padBinds, family); }
    if (key === 'hintSource') { family = layoutFor(currentPad() && currentPad().id); slotMap = buttonSlots(padBinds, family); document.documentElement.dataset.pad = family; emit(); }
    if (key === 'padLayout' && active) { family = layoutFor(currentPad() && currentPad().id); slotMap = buttonSlots(padBinds, family); document.documentElement.dataset.pad = family; emit(); }
  });
  // real keys, clicks, mouse sweeps and touches are noticed by inputdevice.js; they hand the hints back
  onDeviceChange((d) => { if (d !== 'pad' && active) setActive(false); });
  inp.onRealKey = () => noteDevice('kb');
  window.addEventListener('gamepaddisconnected', () => { if (!currentPad()) setActive(false); });
  // #1297: input.reset() empties padKeys on focus loss; let go of the stick keys here as well, so a stick still pushed
  // after Alt-Tab presses its W/A/S/D again on the next poll instead of staying 'held' in stickKeys without a key down
  const lose = () => { if (active) releaseAll(); };
  window.addEventListener('blur', lose);
  if (typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => { if (document.hidden) lose(); });
  document.documentElement.dataset.padCtx = ctx;
  setRadialRunner(playWheelItem);
  initActionRadialUi();
  requestAnimationFrame(poll);
}

