// Het actieve invoerapparaat (#151, #200): toetsenbord+muis ('kb'), controller
// ('pad') of aanraking ('touch'). De laatste echte invoer wint, ook bij
// gemengd gebruik: pak je even de muis tijdens het rijden met een pad, dan
// tonen hints en cursor toetsen, en de volgende knopdruk brengt ze terug.
// Hints (glyphs.js), de cursor en menu's lezen alleen dit: er is geen
// instelling voor nodig (de keuze 'Hints tonen voor' in Instellingen kan het
// nog overrulen). Zet `dev-kb|dev-pad|dev-touch` en `data-device` op <html>.
// Synthetische toetsen van het pad (e.__gde) en niet-vertrouwde events tellen
// niet als toetsenbord. De beslisregel is puur en getest in
// scripts/inputdevice_test.mjs.

export const DEVICES = ['kb', 'pad', 'touch'];
// zo ver moet de muis bewegen (px) voordat het telt als echte muisinvoer
export const MOUSE_MOVE_MIN = 6;

// evt: { type: 'key'|'mouse'|'wheel'|'move'|'pointer'|'pad'|'touch', trusted, synthetic, dist, pointerType }
// Geeft het apparaat dat deze invoer aanwijst, of null als hij niet telt.
export function deviceFor(evt) {
  if (!evt) return null;
  if (evt.type === 'pad') return 'pad';
  if (evt.type === 'touch') return 'touch';
  if (!evt.trusted || evt.synthetic) return null;
  if (evt.pointerType === 'touch') return 'touch';
  if (evt.type === 'move') return (evt.dist || 0) > MOUSE_MOVE_MIN ? 'kb' : null;
  if (evt.type === 'key' || evt.type === 'mouse' || evt.type === 'wheel') return 'kb';
  return null;
}

let device = 'kb';
const listeners = new Set();

export function getDevice() { return device; }
export function isDevice(d) { return device === d; }
export function onDeviceChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

function paint(doc) {
  const root = doc && doc.documentElement;
  if (!root) return;
  for (const d of DEVICES) root.classList.toggle('dev-' + d, d === device);
  if (root.dataset) root.dataset.device = device;
}

let paintDoc = typeof document !== 'undefined' ? document : null;

export function noteDevice(d) {
  if (!DEVICES.includes(d) || d === device) return false;
  device = d;
  paint(paintDoc);
  for (const cb of listeners) cb(device);
  return true;
}

// Voor tests en voor het begin: zet het apparaat zonder meldingen.
export function resetDevice(d = 'kb', doc = paintDoc) {
  device = DEVICES.includes(d) ? d : 'kb';
  paintDoc = doc;
  paint(doc);
}

let inited = false;
export function initInputDevice(target = typeof window !== 'undefined' ? window : null, doc = paintDoc) {
  if (inited || !target) return;
  inited = true;
  paintDoc = doc;
  paint(doc);
  const note = (evt) => { const d = deviceFor(evt); if (d) noteDevice(d); };
  target.addEventListener('keydown', (e) => note({ type: 'key', trusted: e.isTrusted, synthetic: !!e.__gde }), true);
  target.addEventListener('mousedown', (e) => note({ type: 'mouse', trusted: e.isTrusted, pointerType: e.pointerType }), true);
  target.addEventListener('wheel', (e) => note({ type: 'wheel', trusted: e.isTrusted }), { capture: true, passive: true });
  target.addEventListener('mousemove', (e) => note({ type: 'move', trusted: e.isTrusted, dist: Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) }), true);
  target.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') note({ type: 'touch' }); }, true);
}

// alleen de tests: begin opnieuw
export function _resetForTest() { inited = false; device = 'kb'; listeners.clear(); }
