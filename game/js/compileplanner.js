// Planner voor shadercompilaties (#1046): verdeelt het voorcompileren van de scène in porties met een tijdbudget, zodat het
// laadscherm tussen twee porties kan tekenen en de hoofdthread niet één lange aanroep lang blokkeert. Zuiver (geen THREE, geen DOM):
// scripts/compileplanner_test.mjs loopt budget, volgorde en dubbele compilaties. De aanroeper levert per item een functie
// `run()` (bijvoorbeeld renderer.compile op één groep van de scène) en een sleutel; dezelfde sleutel draait nooit twee keer.
export const COMPILE_BUDGET_MS = 4;

export class CompilePlanner {
  // forget: een gedraaide sleutel mag later opnieuw (voor een lange sessie: de sleutelverzameling groeit anders zonder grens)
  constructor({ forget = false } = {}) {
    this.forget = forget;
    this.queue = [];        // { key, prio, order, run }; gesorteerd vanaf `head` zodra `dirty` onwaar is
    this.head = 0;          // index van het eerstvolgende item (geen shift: dat is O(n) per stap)
    this.dirty = false;     // er is iets bijgekomen sinds de laatste sortering (review 21-11: niet bij elke add sorteren)
    this.seen = new Set();  // sleutels die in de wachtrij staan of al gedraaid hebben
    this.order = 0;
    this.done = 0;
    this.spentMs = 0;
    this.steps = 0;
    this.errors = [];
  }

  // Zet een item in de wachtrij. Geeft false als de sleutel al bekend is (geen dubbele compilatie).
  // Lagere `prio` gaat eerst; bij gelijke prio de volgorde van aanmelden.
  add(key, run, prio = 0) {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    this.queue.push({ key, prio, order: this.order++, run });
    this.dirty = true;
    return true;
  }

  get pending() { return this.queue.length - this.head; }
  get total() { return this.pending + this.done; }
  get progress() { return this.total ? this.done / this.total : 1; }

  // Draait items tot het budget op is (minstens één, zodat het altijd vordert). `now` is de klok (standaard performance.now).
  // Een item dat een fout gooit telt als gedaan en komt in `errors`. Geeft het aantal gedraaide items terug.
  step(budgetMs = COMPILE_BUDGET_MS, now = () => performance.now()) {
    const t0 = now();
    let n = 0;
    while (true) {
      // een add (ook vanuit een run) sorteert hier, een keer per stap in plaats van bij elke add
      if (this.dirty) {
        if (this.head) { this.queue.splice(0, this.head); this.head = 0; }
        this.queue.sort((a, b) => a.prio - b.prio || a.order - b.order);
        this.dirty = false;
      }
      if (this.head >= this.queue.length) break;
      const it = this.queue[this.head++];
      if (this.forget) this.seen.delete(it.key);
      try { it.run(); } catch (e) { this.errors.push({ key: it.key, e }); }
      this.done++; n++;
      if (now() - t0 >= budgetMs) break;
    }
    if (this.head >= this.queue.length) { this.queue.length = 0; this.head = 0; }
    this.spentMs += now() - t0;
    if (n) this.steps++;
    return n;
  }
}
