// Detector (c): console. Geen imports (run.mjs plakt dit bestand in de pagina, zoals mens.mjs).
//   consoleSoort(level, tekst)   rekent een regel in op een soort: nan, niet-gedefinieerd, onverwerkt, bron (404), error, warn
//   ConsoleVerzamelaar           page-kant: haakt console.error/warn en window.onerror/unhandledrejection, telt per soort en handtekening
//   consoleBevindingen(events)   pure kant: uit de 'console'- en 'consoletelling'-regels van een run de bevindingen
const SOORTEN = [
  ['nan', /\bNaN\b|Infinity|THREE\.\w*Geometry: Computed (radius|bounding)/i],
  ['niet-gedefinieerd', /is not defined|is not a function|is not iterable|Cannot read propert|Cannot set propert|undefined is not|is not a constructor/i],
  ['bron', /\b404\b|net::ERR|Failed to load resource|Failed to fetch|ERR_FILE_NOT_FOUND/i],
];

export function consoleSoort(level, tekst) {
  const t = String(tekst || '');
  if (level === 'onverwerkt') return 'onverwerkt';
  for (const [naam, re] of SOORTEN) if (re.test(t)) return naam;
  return level === 'warn' ? 'warn' : 'error';
}

// Een handtekening die getallen, hexwaarden en paden gelijk maakt: dezelfde fout op een andere plek is dezelfde bevinding.
export function consoleHandtekening(tekst) {
  return String(tekst || '').replace(/https?:\/\/\S+|[A-Za-z]:\\\S+|\/[\w./-]+\.\w+(:\d+)*/g, '<pad>').replace(/0x[0-9a-f]+|-?\d+(\.\d+)?/gi, '#').replace(/\s+/g, ' ').trim().slice(0, 140);
}

export class ConsoleVerzamelaar {
  constructor({ log = () => {}, tijd = () => 0, perHandtekening = 3, max = 200 } = {}) {
    this.log = log; this.tijd = tijd; this.per = perHandtekening; this.max = max;
    this.telling = {}; this.handtekeningen = {}; this.gelogd = 0;
  }
  voeg(level, tekst) {
    const soort = consoleSoort(level, tekst), sig = consoleHandtekening(tekst), k = soort + '|' + sig;
    this.telling[soort] = (this.telling[soort] || 0) + 1;
    const h = this.handtekeningen[k] = this.handtekeningen[k] || { soort, sig, n: 0, eerste: this.tijd() };
    h.n++;
    if (h.n <= this.per && this.gelogd < this.max) { this.gelogd++; this.log('console', { level, soort, tekst: String(tekst).slice(0, 240), sig }); }
    return soort;
  }
  // de eindstand: tellers per soort en de meest voorkomende handtekeningen
  telSamen() {
    return { telling: this.telling, top: Object.values(this.handtekeningen).sort((a, b) => b.n - a.n).slice(0, 25) };
  }
  haak(win) {
    const orig = {};
    for (const level of ['error', 'warn']) {
      orig[level] = win.console[level].bind(win.console);
      win.console[level] = (...a) => {
        try { this.voeg(level, a.map((x) => (x && x.stack ? x.stack.split('\n')[0] : typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')); } catch (e) { /* de hook mag het spel niet breken */ }
        orig[level](...a);
      };
    }
    win.addEventListener('error', (e) => this.voeg('onverwerkt', `${e.message || 'error'} (${(e.filename || '').split('/').pop()}:${e.lineno || 0})`));
    win.addEventListener('unhandledrejection', (e) => this.voeg('onverwerkt', `promise: ${e.reason && e.reason.message ? e.reason.message : String(e.reason)}`));
    return () => { for (const l of Object.keys(orig)) win.console[l] = orig[l]; };
  }
}

const ERNST = { nan: 'blokkeert', 'niet-gedefinieerd': 'blokkeert', onverwerkt: 'blokkeert', bron: 'verwarrend', error: 'verwarrend', warn: 'cosmetisch' };

// De bevindingen uit een run: per soort en handtekening één, met aantal en eerste tijdstip. Bron: 'console'-regels (de eerste drie per
// handtekening) en de 'consoletelling' aan het eind (de volledige aantallen).
export function consoleBevindingen(events) {
  const per = new Map();
  for (const e of events) {
    if (e.type !== 'console') continue;
    const k = e.soort + '|' + e.sig;
    if (!per.has(k)) per.set(k, { soort: e.soort, sig: e.sig, tekst: e.tekst, eerste: e.t, stap: e.stap || '', plek: e.plek || null, n: 0 });
    per.get(k).n++;
  }
  const tel = [...events].reverse().find((e) => e.type === 'consoletelling');
  if (tel) {
    for (const h of tel.top || []) {
      const k = h.soort + '|' + h.sig;
      if (per.has(k)) per.get(k).n = Math.max(per.get(k).n, h.n);
      else per.set(k, { soort: h.soort, sig: h.sig, tekst: h.sig, eerste: h.eerste, stap: '', plek: null, n: h.n });
    }
  }
  return [...per.values()].map((h) => ({
    type: 'console-' + h.soort, soort: 'console', ernst: ERNST[h.soort] || 'verwarrend', stap: h.stap, plek: h.plek, t: h.eerste, tekst: h.tekst, sig: h.sig,
    bewijs: { aantal: h.n, eerste: h.eerste },
  }));
}
