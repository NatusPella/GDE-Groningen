// De sample-laag (#460): de CC0-opnames van Freesound in game/audio/sfx (manifest.json beschrijft ze) naast de synth.
// Lui geladen en gedecodeerd naar AudioBuffers; audio.js speelt ze met dezelfde SFX-bus, afstandsdemping en
// positie als playFx. Ontbreekt een bestand of laadt het niet, dan geeft buffer(sleutel) null en blijft het
// bestaande synthgeluid (zonder fout in de console). Alleen een relatief pad (zelfde aanpak als de rest, ook voor web
// en Electron), geen netwerkcode buiten het ophalen van de eigen bestanden. Zuivere logica en een kleine lader:
// scripts/sfxsamples_test.mjs controleert het zonder Web Audio.

export const SAMPLE_BASE = './audio/sfx/';

// cat: mixplan.js-categorie; gain: basisniveau; ref en range: afstandsdemping (m); gap: afkoeling in s tegen herhaling
export const SAMPLE_INFO = {
  auto_portiergreep: { cat: 'deur', gain: 0.7, ref: 3, range: 45, gap: 0.3 },
  auto_deur_open: { cat: 'deur', gain: 0.85, ref: 3, range: 50, gap: 0.3 },
  auto_deur_dicht_1: { cat: 'deur', gain: 0.9, ref: 3, range: 55, gap: 0.3 },
  auto_deur_dicht_2: { cat: 'deur', gain: 0.9, ref: 3, range: 55, gap: 0.3 },
  band_piep_bocht: { cat: 'voertuig', gain: 0.5, ref: 6, range: 55, gap: 0 },   // loop: volume en toonhoogte naar slip (audio.js updateSqueal)
  handrem_bocht: { cat: 'voertuig', gain: 0.6, ref: 6, range: 60, gap: 6 },
  remmen_grind: { cat: 'voertuig', gain: 0.7, ref: 5, range: 55, gap: 1.5 },
  trein_deur_open: { cat: 'spoor', gain: 0.45, ref: 6, range: 40, gap: 4 },
  trein_deur_piep: { cat: 'spoor', gain: 0.35, ref: 6, range: 40, gap: 6 },
  trein_deur_dicht: { cat: 'spoor', gain: 0.5, ref: 6, range: 40, gap: 3 },
};
export const SAMPLE_KEYS = Object.keys(SAMPLE_INFO);

// kleine willekeurige variatie per keer: toonhoogte ±4% en volume ±1,5 dB
export const VARIATIE = { rate: 0.04, db: 1.5 };
export function variatie(rand = Math.random) {
  return { rate: 1 + (rand() * 2 - 1) * VARIATIE.rate, gain: Math.pow(10, ((rand() * 2 - 1) * VARIATIE.db) / 20) };
}

// afkoeling tegen herhaling: mag deze sleutel nu klinken? (last: Map sleutel naar tijd van de vorige keer)
export function afkoelingOk(last, key, now, gap = (SAMPLE_INFO[key] || {}).gap || 0) {
  const t = last.get(key);
  if (t !== undefined && now - t < gap) return false;
  last.set(key, now);
  return true;
}

// Een voertuig met een portier dat zijn deur laat horen: auto's, bestelwagens en taxi's (niet fiets, step, quad, boot, tractor, bus of helikopter).
const GEEN_PORTIER = new Set(['quad', 'tractor', 'bike', 'scooter', 'boat', 'heli', 'helicopter']);
export function heeftAutoPortier(v) {
  if (!v || v.isBike || v.isScooter || v.isBoat || v.isHeli || v.isBus) return false;
  const n = v.model && v.model.name;
  return !GEEN_PORTIER.has(n);
}

// De volgorde bij in- en uitstappen: eerst de greep, dan de deur open, na het stappen de deur dicht (een van de twee dichtgeluiden).
export function autoDeurPlan(rand = Math.random) {
  return [
    { key: 'auto_portiergreep', delay: 0 },
    { key: 'auto_deur_open', delay: 0.22 },
    { key: rand() < 0.5 ? 'auto_deur_dicht_1' : 'auto_deur_dicht_2', delay: 1.15 },
  ];
}

// Bandenslip en handrem: wanneer klinkt het sample, en hoe sterk. Snelheden in m/s.
export const HANDREM_MIN_V = 7;          // zo'n 25 km/u
export const SLIPSTOOT_SLIP = 0.7;       // slip boven dit getal na een rustig stuk telt als een slipstoot
export function slipLoopNiveau(slip) { return Math.max(0, Math.min(1, (slip - 0.3) / 0.6)); }
export function slipLoopRate(slip) { return 0.88 + 0.3 * Math.max(0, Math.min(1, slip)); }
export function grindNodig(v) {
  return !!v && v.surface === 'gras' && Math.abs(v.speed || 0) > 6 && (v._fxDec || 0) > 9 && !v.isBoat && !v.isHeli;
}

// De lader: haalt manifest.json en daarna elk bestand van de eigen map, decodeert met ctx.decodeAudioData.
// fetchFn en ctx komen mee (testbaar); een mislukking is stil: buffer() blijft null en de synth neemt het over.
export function createSamples(ctx, { fetchFn = typeof fetch === 'function' ? fetch : null, base = SAMPLE_BASE, keys = SAMPLE_KEYS } = {}) {
  const buffers = new Map();
  const last = new Map();
  const stats = { geladen: 0, mislukt: 0 };
  let manifest = null, started = null;
  async function laad(key) {
    try {
      const m = manifest && manifest.geluiden && manifest.geluiden[key];
      if (!m || !m.bestand) { stats.mislukt++; return; }
      const res = await fetchFn(base + m.bestand);
      if (!res || !res.ok) { stats.mislukt++; return; }
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      if (buf) { buffers.set(key, buf); stats.geladen++; } else stats.mislukt++;
    } catch (e) { stats.mislukt++; /* stil: de synth blijft de terugval */ }
  }
  return {
    // idempotent; geeft een belofte die nooit weigert
    start() {
      if (started) return started;
      started = (async () => {
        try {
          if (!ctx || !fetchFn) return;
          const res = await fetchFn(base + 'manifest.json');
          if (!res || !res.ok) return;
          manifest = await res.json();
          for (const k of keys) await laad(k);
        } catch (e) { /* geen manifest of geen toegang: geen samples */ }
      })();
      return started;
    },
    buffer(key) { return buffers.get(key) || null; },
    has(key) { return buffers.has(key); },
    isLoop(key) { return !!(manifest && manifest.geluiden && manifest.geluiden[key] && manifest.geluiden[key].loop); },
    cool(key, now) { return afkoelingOk(last, key, now); },
    stats,
  };
}
