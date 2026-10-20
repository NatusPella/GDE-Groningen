// Testmenu (?testmenu): the pure part. Which URL switches there are, how one
// is flipped in a query string, and the shortcut list (testmenu.js runs them).
// Node-safe: no DOM. Switches are set through the URL, as every switch is
// (devflags.js); the dev run keeps its own gde-dev: storage, so nothing here
// can touch the real save, settings or prestaties.

// Switches that make no sense to flip from the menu (they start a mode of
// their own, or are the menu itself).
export const MENU_SKIP = new Set(['testmenu', 'dev', 'storytest', 'autoplay', 'spotsonly', 'trailer', 'shot', 'cut', 'frames', 'video', 'benchmark', 'perf']);

// Switches that take a value, with a few useful values to offer.
export const VALUE_FLAGS = {
  marker: ['vorm'],
  gpu: ['Intel UHD'],
  touch: ['1', '0'],
  preset: ['quality:laag,drawDistance:kort'],
};

// [{ name, doc, on, value, values }] for every switch in FLAG_DOCS.
export function flagRows(docs, search) {
  const q = new URLSearchParams(search || '');
  return Object.keys(docs).filter((k) => !MENU_SKIP.has(k)).sort().map((name) => ({
    name,
    doc: docs[name],
    on: q.has(name),
    value: q.has(name) ? q.get(name) : null,
    values: VALUE_FLAGS[name] || null,
  }));
}

// The query string with `name` turned on (optionally with a value) or off.
// ?testmenu always stays.
export function withFlag(search, name, on, value) {
  const q = new URLSearchParams(search || '');
  q.delete(name);
  if (on) q.set(name, value == null ? '' : String(value));
  if (!q.has('testmenu')) q.set('testmenu', '');
  return '?' + q.toString().replace(/=(&|$)/g, '$1');
}

// Everything off but the menu itself.
export const clearedSearch = () => '?testmenu';

// Shortcuts. act is what testmenu.js runs; the rest is for the list.
export const SHORTCUTS = [
  { id: 'martinitoren', group: 'Wereld', label: 'Naar de Martinitoren-deur', act: { kind: 'landmark', name: 'Martinitoren' } },
  { id: 'reuzenrad', group: 'Wereld', label: 'Naar het reuzenrad (Hoogvlieger)', act: { kind: 'reuzenrad' } },
  { id: 'brug', group: 'Wereld', label: 'Naar een brug', act: { kind: 'bridge' } },
  { id: 'avond', group: 'Wereld', label: 'Zomeravond (21:00)', act: { kind: 'clock', hour: 21 } },
  { id: 'dag', group: 'Wereld', label: 'Middag (12:00)', act: { kind: 'clock', hour: 12 } },
  { id: 'schip', group: 'Boten en bruggen', label: 'Zet een binnenvaartschip neer (water in de buurt)', act: { kind: 'ship', model: 'spits' } },
  { id: 'schip2', group: 'Boten en bruggen', label: 'Zet een Kempenaar neer', act: { kind: 'ship', model: 'kempenaar' } },
  { id: 'wanted3', group: 'Verkeer en politie', label: 'Zet wanted op 3 sterren', act: { kind: 'wanted', level: 3 } },
  { id: 'wanted0', group: 'Verkeer en politie', label: 'Wanted weg', act: { kind: 'wanted', level: 0 } },
  { id: 'missie1', group: 'Missies en verhaal', label: 'Start de eerste missie', act: { kind: 'story', what: 'first' } },
  { id: 'volgend', group: 'Missies en verhaal', label: 'Naar het volgende doel', act: { kind: 'story', what: 'teleport' } },
  { id: 'machinist', group: 'Missies en verhaal', label: 'Naar het station (stap in een trein, druk G)', act: { kind: 'station' } },
  { id: 'geld', group: 'Missies en verhaal', label: '+€500', act: { kind: 'money', amount: 500 } },
];

export function shortcutGroups() {
  const out = [];
  for (const s of SHORTCUTS) {
    let g = out.find((x) => x.name === s.group);
    if (!g) out.push(g = { name: s.group, items: [] });
    g.items.push(s);
  }
  return out;
}

// The nearest water spot to (x, y), in rings. isWater(x, y) -> bool.
export function findWaterNear(x, y, isWater, maxR = 160, step = 16) {
  for (let r = 0; r <= maxR; r += step) {
    const n = Math.max(1, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (isWater(px, py)) return { x: px, y: py, angle: a };
    }
  }
  return null;
}
