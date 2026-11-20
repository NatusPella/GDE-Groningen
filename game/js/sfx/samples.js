// De sample-laag (#460): de CC0-opnames van Freesound in game/audio/sfx (manifest.json beschrijft ze) naast de synth.
// Lui geladen en gedecodeerd naar AudioBuffers; audio.js speelt ze met dezelfde SFX-bus, afstandsdemping en
// positie als playFx. Ontbreekt een bestand of laadt het niet, dan geeft buffer(sleutel) null en blijft het
// bestaande synthgeluid (zonder fout in de console). Alleen een relatief pad (zelfde aanpak als de rest, ook voor web
// en Electron), geen netwerkcode buiten het ophalen van de eigen bestanden. Zuivere logica en een kleine lader:
// scripts/sfxsamples_test.mjs controleert het zonder Web Audio.

export const SAMPLE_BASE = './audio/sfx/';

import { FILE_STEP_KEYS } from './steps.js';

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
  // voertuigen (sfx/aircraft.js): naadloze lussen en een paar eenmalige klanken, de sturing staat in sfx/aircraftmap.js
  heli_rotor_stat: { cat: 'voertuig', gain: 0.85, ref: 30, range: 1400, gap: 0 },
  heli_rotor_vlucht: { cat: 'voertuig', gain: 0.85, ref: 30, range: 1400, gap: 0 },
  vliegtuig_start: { cat: 'voertuig', gain: 0.9, ref: 25, range: 1400, gap: 0 },
  vliegtuig_stationair: { cat: 'voertuig', gain: 0.8, ref: 25, range: 1400, gap: 0 },
  vliegtuig_toeren: { cat: 'voertuig', gain: 0.8, ref: 25, range: 1400, gap: 0 },
  vliegtuig_wind: { cat: 'voertuig', gain: 0.8, ref: 25, range: 1400, gap: 0 },
  vliegtuig_overtrek: { cat: 'voertuig', gain: 0.5, ref: 25, range: 1400, gap: 0 },
  vliegtuig_gestel: { cat: 'voertuig', gain: 0.8, ref: 25, range: 1400, gap: 0 },
  vliegtuig_rol_asfalt: { cat: 'voertuig', gain: 0.8, ref: 25, range: 1400, gap: 0 },
  vliegtuig_rol_gras: { cat: 'voertuig', gain: 0.8, ref: 25, range: 1400, gap: 0 },
  boot_motor_stat: { cat: 'voertuig', gain: 0.7, ref: 12, range: 400, gap: 0 },
  boot_motor_vol: { cat: 'voertuig', gain: 0.7, ref: 12, range: 400, gap: 0 },
};
// weer, zomer en onweer (sfx/weermap.js, ambience.js): lussen voor de lagen van de omgeving en donderslagen; auto-lussen (audio.js)
for (const k of ['regen_motregen', 'regen_bui', 'regen_plens', 'regen_dak', 'regen_auto', 'wind_gras', 'zomer_insecten', 'zomer_vogels', 'zomer_stadsvogels']) SAMPLE_INFO[k] = { cat: 'omgeving', gain: 1, ref: 10, range: 400, gap: 0 };
for (const k of ['donder_dichtbij_0', 'donder_dichtbij_1', 'donder_dichtbij_2', 'donder_ver_0', 'donder_ver_1']) SAMPLE_INFO[k] = { cat: 'omgeving', gain: 1, ref: 100, range: 6000, gap: 0 };
SAMPLE_INFO.band_drift = { cat: 'voertuig', gain: 0.5, ref: 6, range: 60, gap: 0 };
SAMPLE_INFO.motor_auto_stationair = { cat: 'voertuig', gain: 0.5, ref: 8, range: 70, gap: 0 };
// voetstappen (sfx/steps.js, foley.js): stap_<ondergrond>_<n>; de sturing (variant, links en rechts, afstand) zit in steps.js en foley.js
for (const k of FILE_STEP_KEYS) SAMPLE_INFO[k] = { cat: 'voetstap', gain: 1, ref: 3, range: 30, gap: 0 };
// SFX ronde 3 (#988): eenmalige klanken die een synthgeluid vervangen (zie FX_VERVANG), dieren voor sfx/ambience.js en de lussen van de omgeving.
const RONDE3_FX = {
  kassa_koop: { cat: 'ui', gain: 0.8, ref: 3, range: 30 },
  winkelbel_deur: { cat: 'winkel', gain: 0.8, ref: 4, range: 40 },
  deur_hout_open_op: { cat: 'deur', gain: 0.8, ref: 3, range: 40 },
  deur_hout_dicht_op: { cat: 'deur', gain: 0.9, ref: 3, range: 45 },
  deur_huis_dicht_op: { cat: 'deur', gain: 0.9, ref: 3, range: 45 },
  plons_groot: { cat: 'water', gain: 0.8, ref: 6, range: 120 },
  scheepshoorn_op: { cat: 'water', gain: 0.8, ref: 30, range: 1200 },
  camera_sluiter: { cat: 'ui', gain: 0.7, ref: 3, range: 25 },
  alarm_loeit: { cat: 'omgeving', gain: 0.7, ref: 8, range: 140 },
  vuurwerk_knal_0: { cat: 'explosie', gain: 0.9, ref: 25, range: 1500 },
  vuurwerk_knal_1: { cat: 'explosie', gain: 0.9, ref: 25, range: 1500 },
  trein_remmen_piep: { cat: 'spoor', gain: 0.7, ref: 12, range: 300 },
};
Object.assign(RONDE3_FX, {
  trein_hoorn_kort: { cat: 'spoor', gain: 0.8, ref: 14, range: 500 },
  trein_hoorn_lang: { cat: 'spoor', gain: 0.8, ref: 14, range: 500 },
  tram_bel_op_0: { cat: 'voertuig', gain: 0.8, ref: 8, range: 120 },
  tram_bel_op_1: { cat: 'voertuig', gain: 0.8, ref: 8, range: 120 },
  bus_halte_ding: { cat: 'voertuig', gain: 0.7, ref: 6, range: 80 },
  bus_deur_sis: { cat: 'voertuig', gain: 0.8, ref: 5, range: 60 },
  ui_klik: { cat: 'ui', gain: 1, ref: 3, range: 30 },   // menu: select() en tick() in sfx/ui.js, zonder afstand
});
for (const [k, i] of Object.entries(RONDE3_FX)) SAMPLE_INFO[k] = { ...i, gap: 0 };
SAMPLE_INFO.motor_diesel_stationair = { cat: 'voertuig', gain: 0.5, ref: 8, range: 70, gap: 0 };   // trekker en bus, onder de motorsynth (audio.js updateEngineLayer)
SAMPLE_INFO.kermis_lawaai = { cat: 'omgeving', gain: 1, ref: 10, range: 400, gap: 0 };   // lus voor de kermis (sfx/ambience.js)
// dierengeluiden en de lussen van de omgeving: de sturing (afstand, tijdstip, plek) staat in sfx/ambience.js
for (const k of ['dier_koe', 'dier_schaap', 'dier_paard', 'dier_eend', 'dier_meeuw_0', 'dier_meeuw_1']) SAMPLE_INFO[k] = { cat: 'dier', gain: 1, ref: 4, range: 120, gap: 0 };
for (const k of ['golfjes_oever', 'menigte_gemurmel', 'kikkers_nacht', 'stad_nacht_nl', 'ruimte_binnen']) SAMPLE_INFO[k] = { cat: 'omgeving', gain: 1, ref: 10, range: 400, gap: 0 };
// SFX ronde 4 (#988): kleine opnames voor de missie-polish (zie scripts/audio/master_sfx_ronde4.mjs en docs/SFX-GAPS.md); cat/gain/ref/range zoals hierboven
const RONDE4_FX = {
  gejuich_0: ['omgeving', 0.8, 10, 200], gejuich_1: ['omgeving', 0.8, 10, 200], applaus_klein: ['omgeving', 0.7, 8, 150],
  klok_tik: ['ui', 0.6, 3, 30], kaartje_schuif: ['ui', 0.6, 3, 30], ui_fout: ['ui', 0.7, 3, 30],
  munten_0: ['ui', 0.6, 3, 30], munten_1: ['ui', 0.6, 3, 30],
  ei_breuk_0: ['winkel', 0.8, 4, 50], ei_breuk_1: ['winkel', 0.8, 4, 50], kratten_klets: ['winkel', 0.9, 5, 60], bel_uitslag: ['winkel', 0.8, 4, 40],
  haspel_draai: ['water', 0.6, 3, 30], dobber_plons: ['water', 0.7, 4, 60], kopje_klink_0: ['winkel', 0.6, 3, 25], kopje_klink_1: ['winkel', 0.6, 3, 25],
  stoomfluit: ['spoor', 0.8, 14, 600], omroep_ding: ['spoor', 0.7, 8, 100], toeter_start: ['voertuig', 0.8, 10, 300], fluitje: ['voertuig', 0.8, 8, 200],
  hydrauliek_sis: ['voertuig', 0.8, 6, 100], weegbrug_klik: ['deur', 0.7, 4, 50], brievenbus_klep: ['deur', 0.8, 3, 40], worp_lucht: ['voetstap', 0.7, 3, 40],
};
for (const [k, [cat, gain, ref, range]] of Object.entries(RONDE4_FX)) SAMPLE_INFO[k] = { cat, gain, ref, range, gap: 0 };
export const SAMPLE_KEYS = Object.keys(SAMPLE_INFO);

// Opnames in de plaats van een synthgeluid: fx-naam van sfx/fxbank.js (met of zonder _n) naar de sleutels die hem vervangen.
// audio.js playFx en sfx/ui.js uiFx kiezen een geladen sleutel; is er niets geladen, dan blijft de synth de terugval.
export const FX_VERVANG = {
  winkel_kassa: ['kassa_koop'],
  shop_bell: ['winkelbel_deur'],
  door_wood_open: ['deur_hout_open_op'],
  door_wood_close: ['deur_hout_dicht_op'],
  door_house_close: ['deur_huis_dicht_op'],
  splash_big: ['plons_groot'],
  ship_horn: ['scheepshoorn_op'],
  camera_click: ['camera_sluiter'],
  alarm_ring: ['alarm_loeit'],
  firework_burst: ['vuurwerk_knal_0', 'vuurwerk_knal_1'],
  rail_squeal: ['trein_remmen_piep'],
  train_horn: ['trein_hoorn_kort', 'trein_hoorn_lang'],   // een audio-event (audio.js playTrainHorn), geen effect van fxbank.js
  tram_bel: ['tram_bel_op_0', 'tram_bel_op_1'],
  bus_bel: ['bus_halte_ding'],
  bus_door_hiss: ['bus_deur_sis'],
  // ronde 4: opnames voor bestaande synthgeluiden
  ui_weiger: ['ui_fout'],
  ui_uitgave: ['munten_0', 'munten_1'],
  hengel_vangst: ['haspel_draai'],
  horeca_hap: ['kopje_klink_0', 'kopje_klink_1'],
};
// Effecten die alleen als opname bestaan (geen synthgeluid in fxbank.js): een haak duwt { kind: 'fx', name } (of sfxLinks.uiFx(name) voor een UI-klank)
// en het geluid klinkt zodra de opname geladen is; zonder opname blijft het stil. De haken staan bij de missie-polish (zie docs/SFX-GAPS.md, ronde 4).
export const FX_OPNAME_ALLEEN = {
  regelkaart_papier: ['kaartje_schuif'],
  wacht_klaar: ['omroep_ding'],
  publiek_gejuich: ['gejuich_0', 'gejuich_1'],
  publiek_applaus: ['applaus_klein'],
  startsein_toeter: ['toeter_start'],
  startsein_fluit: ['fluitje'],
  klok_tik: ['klok_tik'],
  kratten_klets: ['kratten_klets'],
  ei_breuk: ['ei_breuk_0', 'ei_breuk_1'],
  weegbrug_klik: ['weegbrug_klik'],
  oplegger_hydrauliek: ['hydrauliek_sis'],
  perron_ding: ['omroep_ding'],
  stoomfluit: ['stoomfluit'],
  bel_uitslag: ['bel_uitslag'],
  brievenbus_klep: ['brievenbus_klep'],
  worp_lucht: ['worp_lucht'],
  dobber_plons: ['dobber_plons'],
};
export function vervangSleutel(name, has, rand = Math.random) {
  const kaal = String(name).replace(/_\d+$/, '');
  const lijst = FX_VERVANG[name] || FX_VERVANG[kaal] || FX_OPNAME_ALLEEN[name] || FX_OPNAME_ALLEEN[kaal];
  if (!lijst || typeof has !== 'function') return null;
  const klaar = lijst.filter((k) => has(k));
  return klaar.length ? klaar[Math.floor(rand() * klaar.length) % klaar.length] : null;
}

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
// De drift (band_drift): een echte driftlus onder de piep zodra de slip groot is; niveau en toonhoogte volgen slip en snelheid.
export const DRIFT_SLIP = 0.62;
export function driftLoopNiveau(slip) { return Math.max(0, Math.min(1, (slip - DRIFT_SLIP) / 0.3)); }
export function driftLoopRate(slip, speed) { return Math.max(0.8, Math.min(1.3, 0.85 + 0.25 * Math.max(0, Math.min(1, slip)) + Math.max(0, Math.min(30, speed)) * 0.006)); }
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
