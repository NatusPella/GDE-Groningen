// Detector (d): frametijd. Geen imports (de page-kant plakt dit in de pagina).
//   HitchMeter        page-kant: meet de tijd tussen twee animatieframes (requestAnimationFrame) en logt elke haper boven de drempel
//                     met positie, streamPending-stand en de dichtstbijzijnde probe-sectie (window.__hitch, alleen als het spel met ?hitch draait)
//   hitchBevindingen  pure kant: clustert de 'hitch'-regels op plek en geeft per cluster de oorzaak-aanwijzing
export class HitchMeter {
  constructor({ raf, log, plek = () => null, pending = () => null, sectie = () => null, drempel = 50, max = 300 }) {
    Object.assign(this, { raf, log, plek, pending, sectie, drempel, max });
    this.vorige = null; this.n = 0; this.aan = false; this.telling = { boven50: 0, boven100: 0, totaal: 0 };
  }
  start() { this.aan = true; this.raf((t) => this._tik(t)); }
  stop() { this.aan = false; }
  _tik(t) {
    if (!this.aan) return;
    if (this.vorige != null) {
      const ms = t - this.vorige; this.telling.totaal++;
      if (ms > this.drempel) {
        this.telling.boven50++; if (ms > 100) this.telling.boven100++;
        if (this.n < this.max) { this.n++; const p = this.plek() || {}; this.log('hitch', { ms: Math.round(ms), x: p.x, y: p.y, stap: p.stap || '', pending: this.pending(), sectie: this.sectie(), snelheid: p.v }); }
      }
    }
    this.vorige = t; this.raf((q) => this._tik(q));
  }
}

const r1 = (v) => Math.round(v * 10) / 10;

// Clustert hitches binnen `straal` meter (zelfde stap) en geeft per cluster aantal, ergste, aandeel met streamPending en de vaakste sectie.
// Een enkele hitch boven 100 ms telt ook; een paar losse hitches van 50 tot 100 ms niet (de wereld hapert altijd wel eens).
export function hitchBevindingen(events, { straal = 40, minAantal = 3, ernstig = 100 } = {}) {
  const hs = events.filter((e) => e.type === 'hitch' && Number.isFinite(e.ms));
  const clusters = [];
  for (const h of hs) {
    const c = clusters.find((q) => q.stap === (h.stap || '') && Number.isFinite(h.x) && Math.hypot(q.x - h.x, q.y - h.y) <= straal);
    if (c) { c.items.push(h); c.x = (c.x * (c.items.length - 1) + h.x) / c.items.length; c.y = (c.y * (c.items.length - 1) + h.y) / c.items.length; }
    else clusters.push({ stap: h.stap || '', x: h.x ?? 0, y: h.y ?? 0, items: [h] });
  }
  const uit = [];
  for (const c of clusters) {
    const ms = c.items.map((h) => h.ms), max = Math.max(...ms), n = c.items.length;
    if (n < minAantal && max < ernstig) continue;
    const pend = c.items.filter((h) => h.pending > 0 || h.pending === true).length / n;
    const secties = {};
    for (const h of c.items) if (h.sectie) secties[h.sectie] = (secties[h.sectie] || 0) + 1;
    const top = Object.entries(secties).sort((a, b) => b[1] - a[1])[0];
    const oorzaak = pend >= 0.6 ? 'streaming (streamPending > 0 bij de meeste hapers)' : top ? `sectie ${top[0]}` : 'onbekend (start het spel met ?hitch voor secties)';
    uit.push({
      type: max > ernstig ? 'frame-hitch-zwaar' : 'frame-hitch', soort: 'frame', ernst: max > 250 ? 'verwarrend' : 'cosmetisch', stap: c.stap, plek: [Math.round(c.x), Math.round(c.y)],
      t: c.items[0].t, tekst: '', bewijs: { aantal: n, maxMs: Math.round(max), gemMs: Math.round(ms.reduce((a, b) => a + b, 0) / n), aandeelStreamPending: r1(pend), sectie: top ? top[0] : null, oorzaak },
    });
  }
  return uit.sort((a, b) => b.bewijs.maxMs - a.bewijs.maxMs);
}
