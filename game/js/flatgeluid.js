// Het geluid van de flat (23-11, akte 1 op eindniveau, #1306): boven in de toren in Paddepoel was het stil als buiten. Nu een zachte
// kamertoon (de lucht van een flat op de elfde: een lage, gefilterde ruis), het brommen van de koelkast dat sterker wordt in de keuken,
// en de stad die gedempt door het glas komt (een band tussen 150 en 900 Hz). Alles uit WebAudio-knopen op de wereldbus
// (audio.js ambientOut), zonder bestanden; zacht in en uit over een halve seconde. Puur deel (de niveaus) is getest in
// scripts/flatgeluid_test.mjs.
// Samen spelen: lokaal geluid van wie in de flat staat; er gaat niets over het net.
import { ambientOut } from './audio.js';

export const NIVEAU = { kamer: 0.010, koelkast: 0.006, stad: 0.007 };
export const KOELKAST = { x: 10.5, z: 1.6, bereik: 4.5 }; // flatplan.js: de koelkast staat in de keuken aan de gevel
export const FADE_S = 0.5;

// De doelniveaus voor een plek in de flat (lx, lz in het frame van flatplan.js); binnen = staat de speler in de flat.
export function flatNiveaus(binnen, lx = 0, lz = 0) {
  if (!binnen) return { kamer: 0, koelkast: 0, stad: 0 };
  const d = Math.hypot(lx - KOELKAST.x, lz - KOELKAST.z);
  const bijKoelkast = Math.max(0, 1 - d / KOELKAST.bereik);
  const bijGlas = Math.max(0.35, 1 - lz / 9); // de gevel ligt op z = 0: dichter bij het glas hoor je de stad iets meer
  return { kamer: NIVEAU.kamer, koelkast: NIVEAU.koelkast * bijKoelkast, stad: NIVEAU.stad * bijGlas };
}

let G = null;
function ruisBuffer(ctx) {
  const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } // bruine ruis
  return b;
}
function bouw(o) {
  const { ctx, bus } = o;
  const src = ctx.createBufferSource();
  src.buffer = ruisBuffer(ctx); src.loop = true;
  const kamerF = ctx.createBiquadFilter(); kamerF.type = 'lowpass'; kamerF.frequency.value = 320;
  const kamer = ctx.createGain(); kamer.gain.value = 0;
  const stadF = ctx.createBiquadFilter(); stadF.type = 'bandpass'; stadF.frequency.value = 420; stadF.Q.value = 0.6;
  const stad = ctx.createGain(); stad.gain.value = 0;
  src.connect(kamerF).connect(kamer).connect(bus);
  src.connect(stadF).connect(stad).connect(bus);
  const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 100;
  const hum2 = ctx.createOscillator(); hum2.type = 'sine'; hum2.frequency.value = 200;
  const koelkast = ctx.createGain(); koelkast.gain.value = 0;
  const h2 = ctx.createGain(); h2.gain.value = 0.35;
  hum.connect(koelkast); hum2.connect(h2).connect(koelkast); koelkast.connect(bus);
  src.start(); hum.start(); hum2.start();
  return { ctx, src, hum, hum2, gains: { kamer, koelkast, stad } };
}

// Elke frame vanuit home.js: binnen en de plek. Bouwt de knopen pas als er geluid is en ruimt ze op als je de flat uit bent.
export function updateFlatGeluid(binnen, lx, lz) {
  const o = ambientOut();
  if (!o) return;
  if (!G && !binnen) return;
  if (!G) G = bouw(o);
  const doel = flatNiveaus(binnen, lx, lz);
  const t = G.ctx.currentTime;
  for (const k of Object.keys(G.gains)) G.gains[k].gain.setTargetAtTime(doel[k], t, FADE_S / 3);
  if (!binnen) {
    const weg = G; G = null;
    setTimeout(() => { try { weg.src.stop(); weg.hum.stop(); weg.hum2.stop(); for (const g of Object.values(weg.gains)) g.disconnect(); } catch (e) { /* al weg */ } }, FADE_S * 2000);
  }
}
