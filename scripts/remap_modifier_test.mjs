// Omgezette toetsen (Instellingen > Besturing) met Ctrl ingedrukt.  node scripts/remap_modifier_test.mjs
// Ctrl is zelf een speltoets (bukken; heli omlaag; vliegtuig neus omlaag). Input._translate sloeg elke toets met Ctrl,
// Alt of Cmd erbij over, ook het loslaten: wie een omgezette toets losliet terwijl Ctrl nog ingedrukt was, bleef lopen,
// en wie gebukt een omgezette toets indrukte, kreeg de oude functie van die toets.
const listeners = { window: { capture: {}, bubble: {} }, document: { capture: {}, bubble: {} } };
const mk = (name) => ({
  addEventListener: (t, f, cap) => { const k = cap === true ? 'capture' : 'bubble'; (listeners[name][k][t] = listeners[name][k][t] || []).push(f); },
  removeEventListener() {},
});
class KeyboardEvent {
  constructor(type, init = {}) {
    Object.assign(this, { type, key: '', code: '', repeat: false, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, isTrusted: false }, init);
    this.stopped = false; this.defaultPrevented = false;
  }
  preventDefault() { this.defaultPrevented = true; }
  stopImmediatePropagation() { this.stopped = true; }
}
globalThis.KeyboardEvent = KeyboardEvent;
const dispatch = (ev) => {
  ev.target = ev.target || globalThis.window;
  for (const f of listeners.window.capture[ev.type] || []) { if (ev.stopped) return; f(ev); }
  for (const f of listeners.window.bubble[ev.type] || []) { if (ev.stopped) return; f(ev); }
};
globalThis.window = { ...mk('window'), dispatchEvent: dispatch };
globalThis.document = { ...mk('document'), pointerLockElement: null, activeElement: null, hidden: false, getElementById: () => null };
globalThis.performance = globalThis.performance || { now: () => 0 };
const { Input } = await import('../game/js/input.js');

let fails = 0;
const ok = (c, name, extra = '') => { if (!c) { fails++; console.log('FAIL', name, extra); } else console.log('ok  ', name); };
// a synthetic keydown is always followed by a keyup (AGENTS.md)
const key = (type, k, code, mods = {}) => dispatch(new KeyboardEvent(type, { key: k, code, ...mods }));

function fresh() {
  const inp = new Input(window);
  // vooruit staat op T: T is vooruit (w), de oude W doet niets meer
  inp._remap = new Map([['w', null], ['t', 'w']]);
  return inp;
}

// 1. zonder Ctrl: de omgezette toets werkt en laat weer los (dit ging al goed)
{
  const inp = fresh();
  key('keydown', 't', 'KeyT');
  ok(inp.keys.has('w') && !inp.keys.has('t'), 'T is vooruit');
  key('keyup', 't', 'KeyT');
  ok(!inp.keys.has('w'), 'T loslaten stopt het lopen');
}

// 2. de omgezette toets loslaten terwijl Ctrl (bukken) nog ingedrukt is
{
  const inp = fresh();
  key('keydown', 't', 'KeyT');
  key('keydown', 'Control', 'ControlLeft', { ctrlKey: true });
  ok(inp.keys.has('w') && inp.keys.has('control'), 'lopen en daarna bukken: allebei ingedrukt');
  key('keyup', 't', 'KeyT', { ctrlKey: true });
  ok(!inp.keys.has('w'), 'T loslaten met Ctrl nog ingedrukt stopt het lopen', [...inp.keys].join(','));
  key('keyup', 'Control', 'ControlLeft');
  ok(inp.keys.size === 0, 'daarna is niets meer ingedrukt', [...inp.keys].join(','));
}

// 3. gebukt (Ctrl ingedrukt) de omgezette toets indrukken: vooruit, niet de oude functie van T
{
  const inp = fresh();
  key('keydown', 'Control', 'ControlLeft', { ctrlKey: true });
  key('keydown', 't', 'KeyT', { ctrlKey: true });
  ok(inp.keys.has('w'), 'gebukt is T nog steeds vooruit', [...inp.keys].join(','));
  ok(!inp.keys.has('t'), 'gebukt doet T niet zijn oude functie', [...inp.keys].join(','));
  key('keyup', 't', 'KeyT', { ctrlKey: true });
  key('keyup', 'Control', 'ControlLeft');
  ok(inp.keys.size === 0, 'na loslaten is niets meer ingedrukt', [...inp.keys].join(','));
}

// 4. de vrijgemaakte toets (W) blijft ook gebukt zonder functie
{
  const inp = fresh();
  key('keydown', 'Control', 'ControlLeft', { ctrlKey: true });
  key('keydown', 'w', 'KeyW', { ctrlKey: true });
  ok(!inp.keys.has('w'), 'gebukt doet de vrijgemaakte W niets', [...inp.keys].join(','));
  key('keyup', 'w', 'KeyW', { ctrlKey: true });
  key('keyup', 'Control', 'ControlLeft');
}

// 5. Ctrl zelf omgezet (bukken op C): Ctrl is dan geen speltoets en sneltoetsen met Ctrl blijven van de browser
{
  const inp = new Input(window);
  inp._remap = new Map([['control', null], ['c', 'control'], ['w', null], ['t', 'w']]);
  key('keydown', 'Control', 'ControlLeft', { ctrlKey: true });
  const ev = new KeyboardEvent('keydown', { key: 't', code: 'KeyT', ctrlKey: true });
  dispatch(ev);
  ok(!ev.defaultPrevented && !inp.keys.has('w'), 'Ctrl+T met Ctrl niet als speltoets: niet vertaald', [...inp.keys].join(','));
  key('keyup', 't', 'KeyT', { ctrlKey: true });
  key('keyup', 'Control', 'ControlLeft');
}

// 6. Alt en Cmd erbij: indrukken wordt niet vertaald (sneltoets), maar loslaten van een al vertaalde toets wel
{
  const inp = fresh();
  key('keydown', 't', 'KeyT');
  key('keyup', 't', 'KeyT', { altKey: true });
  ok(!inp.keys.has('w'), 'T loslaten met Alt erbij stopt het lopen', [...inp.keys].join(','));
  key('keydown', 't', 'KeyT', { metaKey: true });
  ok(!inp.keys.has('w'), 'Cmd+T wordt niet vertaald');
  key('keyup', 't', 'KeyT', { metaKey: true });
}

console.log(fails ? `\n${fails} FOUT` : '\nremap_modifier_test: alles goed');
process.exit(fails ? 1 : 0);
