// Veilige updatelus (#1065): een uitzondering in een systeem (een auto met een rare waarde, een missie met een ontbrekend veld)
// mag niet de rest van het beeld stilleggen. main.js draait updateGameplay, update3D, updateHud en updateSafety elk in
// frameGuard.run(naam, fn): bij een fout gaat de rest van het beeld gewoon door en komt er een teller per naam in de technische info
// (Ctrl+Shift+G, gpudiag.js). De console krijgt de eerste fout en daarna elke 600e, niet elk beeld (60 per seconde met een stack is zelf een last).
// Zuiver en zonder DOM; scripts/framesafe_test.mjs bewaakt het.

export function createFrameGuard({ onFirst = null, log = null, every = 600, keep = 12 } = {}) {
  const by = new Map(); // naam -> { n, last, at }
  let total = 0;
  return {
    // Draait fn; geeft het resultaat terug, of undefined als fn een fout gooide.
    run(name, fn, a, b) {
      try { return fn(a, b); } catch (err) { this.fail(name, err); return undefined; }
    },
    // quiet: een geval dat het systeem zelf heeft opgevangen (geen melding in beeld), alleen geteld voor de technische info
    fail(name, err, quiet = false) {
      total++;
      let e = by.get(name);
      if (!e) {
        if (by.size >= keep) { name = '(overig)'; e = by.get(name); }
        if (!e) { e = { n: 0, last: '', first: true }; by.set(name, e); }
      }
      e.n++;
      e.last = String((err && err.message) || err).slice(0, 160);
      if (e.first) { e.first = false; if (onFirst && !quiet) { try { onFirst(err, name); } catch (e2) { /* het melden mag niet zelf falen */ } } }
      if (log && !quiet && (e.n === 1 || e.n % every === 0)) { try { log(name, err, e.n); } catch (e2) { /* idem */ } }
    },
    snapshot() {
      return { total, by: [...by.entries()].map(([name, e]) => ({ name, n: e.n, last: e.last })).sort((a, b) => b.n - a.n) };
    },
    reset() { by.clear(); total = 0; },
  };
}
