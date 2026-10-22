// De echte gamepad.js tegen een nep-controller, zonder browser (#151):
// per situatie (menu, lopen, rijden, handmatig schakelen, skûtsje, heli, duif, trein, frituur, klokken,
// pannenkoeken, minigame) controleert dit dat de pollronde niet stukgaat, dat de situatie goed wordt gekozen en dat
// elke knop uit PAD_MAPS ook echt zijn toets, muisknop of wielstap geeft. Dat is het stuk dat een statische
// audit niet ziet: in 0.36-0.38 was `GAME_PAD_CTX` niet geimporteerd, zodat elk frame in het spel een
// ReferenceError gaf en het pad alleen in de menu's werkte.
//   node scripts/gamepad_live_test.mjs
let fails = 0, checks = 0;
const ok = (c, name, extra) => { checks++; if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

// --- een nepbrowser, net genoeg voor gamepad.js, input.js en settings.js
class ClassList {
  constructor() { this.s = new Set(); }
  add(c) { this.s.add(c); }
  remove(c) { this.s.delete(c); }
  toggle(c, on) { (on === undefined ? !this.s.has(c) : on) ? this.s.add(c) : this.s.delete(c); }
  contains(c) { return this.s.has(c); }
}
const el = () => ({ classList: new ClassList(), dataset: {}, querySelector: () => null, querySelectorAll: () => [], appendChild() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });
class KeyboardEvent extends Event {
  constructor(type, init = {}) { super(type, init); Object.assign(this, { key: init.key, code: init.code, repeat: !!init.repeat }); }
}
const win = new EventTarget();
globalThis.KeyboardEvent = KeyboardEvent;
globalThis.window = win;
globalThis.document = Object.assign(new EventTarget(), { documentElement: el(), body: el(), activeElement: null, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, pointerLockElement: null });
let rafCb = null;
globalThis.requestAnimationFrame = (f) => { rafCb = f; return 1; };
const pads = [];
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => pads, userAgent: 'node' } });

const { Input } = await import('../game/js/input.js');
const { initGamepad, padState, activePadIndex } = await import('../game/js/gamepad.js');
const { PAD_MAPS, PAD_BUTTONS, GAME_PAD_CTX } = await import('../game/js/controls.js');
const { setSetting } = await import('../game/js/settings.js');

const input = new Input(win);
const world = { player: { inVehicle: null }, coop: false };
const hooks = { open: false, phone: false, pause: false, map: false };
initGamepad(input, world, { menuOpen: () => hooks.open, phoneOpen: () => hooks.phone, pauseOpen: () => hooks.pause, mapOpen: () => hooks.map });

// de toetsen die gamepad.js als gebeurtenis stuurt, op volgorde
const seen = [];
win.addEventListener('keydown', (e) => seen.push(['down', e.key, !!e.repeat]));
win.addEventListener('keyup', (e) => seen.push(['up', e.key]));
const keyName = (k) => ({ ' ': ' ', shift: 'Shift', control: 'Control', escape: 'Escape', enter: 'Enter', backspace: 'Backspace', delete: 'Delete', tab: 'Tab', arrowup: 'ArrowUp', arrowdown: 'ArrowDown', arrowleft: 'ArrowLeft', arrowright: 'ArrowRight' }[k] || k);

let now = 1000;
let threw = null;
const frame = (n = 1) => { for (let i = 0; i < n; i++) { now += 16; try { rafCb(now); } catch (e) { threw = threw || e; } } };
const mk = (id, mapping = 'standard') => ({ id, index: pads.length, connected: true, mapping, axes: [0, 0, 0, 0], buttons: PAD_BUTTONS.map(() => ({ pressed: false, value: 0 })) });
const pad = mk('Xbox 360 Controller (XInput STANDARD GAMEPAD)');
pads[0] = pad;
const press = (slot, on = true) => { const b = pad.buttons[PAD_BUTTONS.indexOf(slot)]; b.pressed = on; b.value = on ? 1 : 0; };
const reset = () => { for (const s of PAD_BUTTONS) press(s, false); pad.axes = [0, 0, 0, 0]; frame(2); seen.length = 0; input.mouse.down = false; input.mouse.rightDown = false; input.mouse.wheel = 0; };

// begin: het eerste frame zonder invoer houdt het pad rustig, een knop maakt het actief
frame(2);
ok(!padState().active, 'zonder invoer is het pad niet actief');
press('down'); frame(2); press('down', false); frame(2);
ok(padState().active && activePadIndex() === 0, 'de eerste knopdruk maakt het pad actief', padState());
ok(threw === null, 'de pollronde in de menusituatie gaat niet stuk', threw && String(threw));

// de wereld in een situatie zetten
document.body.classList.add('game-started');
const situaties = {
  // in het pauzemenu bladeren LB en RB door de tabbladen; elders doen ze niets
  menu: () => { hooks.open = true; hooks.pause = true; },
  foot: () => {},
  vehicle: () => { world.player.inVehicle = { speed: 0 }; },
  vehicleManual: () => { world.player.inVehicle = { speed: 0, gb: {} }; setSetting('shiftMode', 'manual'); },
  skutsje: () => { world.player.inVehicle = { speed: 0 }; world.noLookBack = true; },
  heli: () => { world.player.inVehicle = { speed: 0, isHeli: true }; },
  pigeon: () => { world.pigeonMode = true; },
  train: () => { world.trainDriving = true; },
  foodtruck: () => { world.challenge = { id: 'fjord' }; },
  klokken: () => { world.activityGame = 'carillon'; },
  pannenkoek: () => { world.activityGame = 'pannenkoek'; },
};
function zet(naam) {
  hooks.open = false; hooks.phone = false; hooks.pause = false; hooks.map = false;
  world.player.inVehicle = null; world.noLookBack = false; world.pigeonMode = false; world.trainDriving = false; world.challenge = null; world.activityGame = null; world.padelGame = null;
  setSetting('shiftMode', 'auto');
  situaties[naam]();
}

for (const naam of Object.keys(situaties)) {
  zet(naam);
  reset();
  ok(PAD_MAPS[naam], `${naam}: bestaat in PAD_MAPS`);
  frame(2);
  ok(document.documentElement.dataset.padCtx === naam, `${naam}: de situatie wordt gekozen`, document.documentElement.dataset.padCtx);
  ok(threw === null, `${naam}: de pollronde gaat niet stuk`, threw && String(threw));
  const map = PAD_MAPS[naam];
  for (const slot of PAD_BUTTONS) {
    const a = map[slot];
    if (a == null) continue;
    reset();
    // L3 vergrendelt het rennen alleen terwijl de stick helt (los is het weer lopen)
    if (slot === 'ls' && a === 'shift' && map.stick === 'move') { pad.axes = [0, -1, 0, 0]; frame(2); }
    press(slot); frame(2);
    const downs = seen.filter((s) => s[0] === 'down' && !s[2]).map((s) => s[1]);
    if (a === '@fire') ok(input.mouse.down, `${naam}: ${slot} houdt de linkermuisknop vast`);
    else if (a === '@aim') ok(input.mouse.rightDown, `${naam}: ${slot} houdt de rechtermuisknop vast`);
    else if (a === '@wheel+' || a === '@wheel-') ok(input.mouse.wheel === (a === '@wheel+' ? 100 : -100), `${naam}: ${slot} draait het wiel`, input.mouse.wheel);
    else if (a === '@gas' || a === '@brake') ok(true);
    else if (slot === 'ls' && a === 'shift' && map.stick === 'move') { ok(input.padKeys.has('shift'), `${naam}: L3 vergrendelt rennen`); }
    else {
      // in de menusituatie vertaalt menuKey sommige knoppen (B terug in de telefoon, A is spatie op de titel); hier alleen de gewone
      ok(downs.includes(keyName(a)) || downs.includes(a), `${naam}: ${slot} stuurt ${a}`, downs);
    }
    press(slot, false); frame(2);
    if (!String(a).startsWith('@') && !(slot === 'ls' && a === 'shift' && map.stick === 'move')) {
      ok(seen.some((s) => s[0] === 'up' && (s[1] === keyName(a) || s[1] === a)), `${naam}: ${slot} laat ${a} weer los`, seen);
    }
    ok(!input.mouse.down && !input.mouse.rightDown, `${naam}: ${slot} laat de muisknoppen los`);
  }
  // de linkerstick: lopen of sturen geeft een analoge as, pijlen/menu geven toetsen
  reset();
  pad.axes = [0, -1, 0, 0]; frame(3);
  const mode = map.stick;
  if (mode === 'move') ok(input.padAxis[1] < -0.9 && input.padKeys.has('w'), `${naam}: stick omhoog loopt vooruit`, [input.padAxis, [...input.padKeys]]);
  else if (mode === 'steer') { pad.axes = [1, 0, 0, 0]; frame(3); ok(input.padAxis[0] > 0.9, `${naam}: stick opzij stuurt`, input.padAxis); }
  else if (mode === 'arrows') ok(input.padKeys.has('arrowup'), `${naam}: stick omhoog is pijl omhoog`, [...input.padKeys]);
  else if (mode === 'nav') ok(seen.some((s) => s[0] === 'down' && s[1] === 'ArrowUp'), `${naam}: stick omhoog is pijl omhoog in het menu`, seen);
  pad.axes = [0, 0, 0, 0]; frame(3);
  ok(input.padAxis[0] === 0 && input.padAxis[1] === 0 && input.padKeys.size === 0, `${naam}: een losse stick laat alles los`, [input.padAxis, [...input.padKeys]]);
  // de rechterstick kijkt rond (alleen buiten de menu's)
  if (naam !== 'menu') {
    const dx = input.mouse.dx;
    pad.axes = [0, 0, 1, 0]; frame(3); pad.axes = [0, 0, 0, 0]; frame(1);
    ok(input.mouse.dx > dx, `${naam}: de rechterstick draait de camera`, input.mouse.dx);
  }
  // triggers geven gas en rem
  if (map.stick === 'steer') {
    reset(); press('rt'); pad.buttons[PAD_BUTTONS.indexOf('rt')].value = 1; frame(3);
    ok(input.padKeys.has('w') && input.padAxis[1] < -0.5, `${naam}: RT is gas`, [input.padAxis, [...input.padKeys]]);
    press('rt', false); reset();
  }
  input.mouse.dx = 0;
}

// situaties die de wereld hoort te kiezen
zet('foot');
world.activityGame = 'carillon'; frame(2);
ok(document.documentElement.dataset.padCtx === 'klokken', 'het klokkenspel kiest de klokkenindeling');
zet('foot');

// menu: B in de telefoon gaat een niveau terug, A is spatie op de titel, de triggers zoomen de kaart
zet('menu'); hooks.phone = true; reset(); press('b'); frame(2);
ok(seen.some((s) => s[0] === 'down' && s[1] === 'Backspace'), 'telefoon: B is een niveau terug', seen);
hooks.phone = false; hooks.map = true; reset(); press('lt'); frame(2);
ok(seen.some((s) => s[0] === 'down' && s[1] === '-'), 'kaart: LT zoomt uit', seen);
hooks.map = false;
document.body.classList.remove('game-started'); reset(); press('a'); frame(2);
ok(seen.some((s) => s[0] === 'down' && s[1] === ' '), 'titelscherm: A is spatie', seen);
document.body.classList.add('game-started');

// hotplug: pad weg, hints terug; een ander pad komt, eerste knop maakt het actief
zet('foot'); reset();
pads[0] = null; frame(2);
ok(!padState().active, 'een losgekoppeld pad zet de hints terug');
const pad2 = mk('Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)'); pad2.index = 0;
pads[0] = pad2; frame(2);
ok(!padState().active, 'een nieuw pad blijft rustig tot de eerste knop');
pad2.buttons[0].pressed = true; pad2.buttons[0].value = 1; frame(2);
ok(padState().active && padState().family === 'switch', 'het Switch-pad wordt herkend en actief', padState());
pad2.buttons[0].pressed = false; pad2.buttons[0].value = 0; frame(2);

// herbinden: de onderste en de rechterknop wisselen, de gevolgen zitten in de situatie lopen
{
  const { bindButton } = await import('../game/js/controls.js');
  const { capturePadButton } = await import('../game/js/gamepad.js');
  pads[0] = pad; zet('foot'); reset();
  setSetting('padBinds', bindButton({}, 'a', 'b').binds);
  press('b'); frame(2);
  ok(seen.some((s) => s[0] === 'down' && s[1] === ' '), 'herbinden: de fysieke B doet nu wat A deed (spatie)', seen);
  press('b', false); frame(2); seen.length = 0;
  press('a'); frame(2);
  ok(seen.some((s) => s[0] === 'down' && s[1] === 'Control'), 'herbinden: de fysieke A doet nu wat B deed (Control)', seen);
  press('a', false); frame(2);
  // de volgende knopdruk gaat naar de herbindscherm, niet naar het spel
  let gevangen = null; capturePadButton((b) => { gevangen = b; });
  reset(); press('x'); frame(2); press('x', false); frame(2);
  ok(gevangen === 'x' && !seen.some((s) => s[0] === 'down'), 'herbinden: de volgende knop gaat naar het herbindscherm', [gevangen, seen]);
  setSetting('padBinds', {});
  reset();
}

// Samen spelen: in een voertuig geeft D-pad omhoog het stuur (Y); zonder sessie blijft het de alarmlichten
{
  zet('vehicle'); reset();
  press('up'); frame(2); press('up', false); frame(2);
  ok(seen.some((s) => s[0] === 'down' && s[1] === 'p'), 'zonder sessie: D-pad omhoog is de alarmlichten (p)', seen);
  world.coopNet = {}; reset();
  press('up'); frame(2); press('up', false); frame(2);
  ok(seen.some((s) => s[0] === 'down' && s[1] === 'y') && !seen.some((s) => s[1] === 'p'), 'Samen spelen: D-pad omhoog in het voertuig is Y (het stuur)', seen);
  zet('foot'); reset();
  press('up'); frame(2); press('up', false); frame(2);
  ok(seen.some((s) => s[0] === 'down' && s[1] === 'n'), 'Samen spelen: te voet blijft D-pad omhoog de radio', seen);
  // de roepjes (#367): D-pad links, omlaag en rechts te voet zijn Kom hier (7), Help! (8) en Kijk daar (9); zonder sessie zijn het de gewone toetsen
  for (const [knop, toets] of [['left', '7'], ['down', '8'], ['right', '9']]) {
    zet('foot'); reset();
    press(knop); frame(2); press(knop, false); frame(2);
    ok(seen.some((s) => s[0] === 'down' && s[1] === toets), 'Samen spelen: te voet is D-pad ' + knop + ' het roepje ' + toets, seen);
  }
  delete world.coopNet;
  for (const [knop, toets] of [['left', 'o'], ['down', 'k'], ['right', 'r']]) {
    zet('foot'); reset();
    press(knop); frame(2); press(knop, false); frame(2);
    ok(seen.some((s) => s[0] === 'down' && s[1] === toets) && !seen.some((s) => ['7', '8', '9'].includes(s[1])), 'zonder sessie: te voet is D-pad ' + knop + ' de gewone toets ' + toets, seen);
  }
}

// trillen bij schade, als de controller een motor heeft en de speler het wil
{
  const slagen = [];
  pad.vibrationActuator = { playEffect: (type, p) => { slagen.push([type, p.duration]); return Promise.resolve(); } };
  zet('foot'); reset();
  world.health = 100; world.armor = 0; frame(3);
  world.health = 40; frame(3);
  ok(slagen.length >= 1 && slagen[0][0] === 'dual-rumble', 'trillen: schade geeft een trilling', slagen);
  const na = slagen.length;
  setSetting('rumble', false); world.health = 10; frame(3); ok(slagen.length === na, 'trillen: uit in de instellingen is stil');
  setSetting('rumble', true);
  hooks.open = true; world.health = 5; frame(3);
  ok(slagen.length === na, 'trillen: niet in een menu');
  hooks.open = false;
  delete pad.vibrationActuator;
}

// coop: speler 1 houdt zijn pad ook als pad 2 invoer geeft
const pad3 = mk('Xbox 360 Controller (XInput STANDARD GAMEPAD)'); pad3.index = 1;
pads[1] = pad3; world.coop = true; frame(2);
const index1 = activePadIndex();
pad3.buttons[0].pressed = true; pad3.buttons[0].value = 1; frame(3);
ok(activePadIndex() === index1, 'coop: de tweede controller kaapt de eerste niet', [index1, activePadIndex()]);
world.coop = false;

ok(threw === null, 'de hele run zonder uitzondering', threw && String(threw));
if (fails) { console.log(`${fails} mislukt`); process.exit(1); }
console.log(`gamepad_live_test: ok (${checks} controles)`);
