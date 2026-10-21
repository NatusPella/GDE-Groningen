// De muisvergrendeling van Input.tryLock (#328).  node scripts/pointerlock_test.mjs
// Eén geweigerde aanvraag mag het spel nooit voorgoed op de vrije cursor zetten: met meerdere monitoren
// verlaat de cursor dan het venster na ~160 graden. Pas na LOCK_FAILS geweigerde gebaren op rij volgt de terugval
// (een browser zonder pointer lock, zoals het voorbeeldvenster van een app).
const listeners = { window: {}, document: {} };
const mk = (name) => ({ addEventListener: (t, f) => { (listeners[name][t] = listeners[name][t] || []).push(f); }, removeEventListener() {} });
globalThis.window = mk('window');
const canvas = { requestPointerLock: () => null };
globalThis.document = { ...mk('document'), pointerLockElement: null, getElementById: (id) => (id === 'game3d' ? canvas : null) };
let clock = 1000;
globalThis.performance = { now: () => clock };
const { Input } = await import('../game/js/input.js');

let fails = 0;
const ok = (c, name, extra = '') => { if (!c) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };
const settle = () => new Promise((r) => setTimeout(r, 0));
const fireLockChange = (on) => { document.pointerLockElement = on ? canvas : null; for (const f of listeners.document.pointerlockchange || []) f(); };

function fresh() {
  const inp = new Input(window);
  inp.canLock = () => true;
  return inp;
}
// de aanvraag: geweigerd (reject) of gelukt (lock verschijnt)
const refuse = () => { canvas.requestPointerLock = () => Promise.reject(new Error('NotAllowedError')); };
const accept = () => { canvas.requestPointerLock = () => { fireLockChange(true); return Promise.resolve(); }; };

// 1. een weigering zonder gebaar (de start van het spel) telt niet
{
  const inp = fresh(); refuse();
  inp.tryLock(false); await settle();
  ok(!inp.lookFallback, 'weigering zonder gebaar zet de terugval niet aan');
  clock += 100;
  accept(); inp.tryLock(); await settle();
  ok(inp.mouse.locked, 'de volgende toets of klik vergrendelt wel');
  fireLockChange(false);
}

// 2. één geweigerd gebaar (te snel na Esc) is geen terugval; de volgende poging lukt
{
  const inp = fresh(); refuse();
  clock += 5000;
  inp.tryLock(); await settle();
  ok(!inp.lookFallback, 'één geweigerd gebaar: geen terugval');
  clock += 2500;
  accept(); inp.tryLock(); await settle();
  ok(inp.mouse.locked && inp._lockFails === 0, 'daarna gelukt: de teller begint opnieuw', inp._lockFails);
  fireLockChange(false);
}

// 3. toetsherhaling (elke 30 ms) tijdens een open aanvraag levert één aanvraag op, geen drie weigeringen
{
  const inp = fresh();
  let asked = 0;
  canvas.requestPointerLock = () => { asked++; return new Promise((_, rej) => setTimeout(() => rej(new Error('x')), 20)); };
  clock += 5000;
  for (let i = 0; i < 20; i++) { inp.tryLock(); clock += 30; }
  await settle(); await new Promise((r) => setTimeout(r, 40));
  ok(asked === 1, 'toetsherhaling: één aanvraag tegelijk', asked);
  ok(!inp.lookFallback, 'toetsherhaling: geen terugval');
}

// 4. een browser die elk gebaar weigert, valt na LOCK_FAILS gebaren terug op de vrije cursor
{
  const inp = fresh(); refuse();
  clock += 10000;
  for (let i = 0; i < 4; i++) { inp.tryLock(); await settle(); clock += 2600; }
  ok(inp.lookFallback === true, 'drie geweigerde gebaren op rij: terugval aan', inp._lockFails);
  ok(inp.lookActive(), 'met de terugval stuurt de cursor');
  ok(inp.tryLock() === false, 'met de terugval vraagt tryLock niets meer');
}

// 5. een gelukte lock zet de teller terug; menu dicht (canLock onwaar) vraagt niets
{
  const inp = fresh(); refuse();
  clock += 20000;
  inp.tryLock(); await settle(); clock += 2600;
  inp.tryLock(); await settle(); clock += 2600;
  ok(inp._lockFails === 2, 'twee weigeringen geteld', inp._lockFails);
  accept(); inp.tryLock(); await settle();
  ok(inp._lockFails === 0, 'lock gelukt: teller terug naar nul');
  fireLockChange(false);
  inp.canLock = () => false;
  let asked = 0; canvas.requestPointerLock = () => { asked++; return Promise.resolve(); };
  clock += 3000;
  ok(inp.tryLock() === false && asked === 0, 'onder een menu vraagt tryLock niets');
}

// 6. een synchrone fout van requestPointerLock telt als weigering
{
  const inp = fresh();
  canvas.requestPointerLock = () => { throw new Error('NotSupportedError'); };
  clock += 30000;
  inp.tryLock(); clock += 2600; inp.tryLock(); clock += 2600; inp.tryLock();
  ok(inp.lookFallback === true, 'drie synchrone fouten: terugval');
}

console.log(fails ? `${fails} FAILED` : 'all ok');
process.exit(fails ? 1 : 0);
