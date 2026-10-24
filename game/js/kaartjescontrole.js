// Kaartjesknipper (#437): treinloopbaan niveau 3. Op het perron van een station staan reizigers (stationlife3d.js);
// wie Kaartjesknipper is controleert er een paar: lopen naar een reiziger, E, een kort antwoord. Is de ronde
// rond (CONTROLE_DOEL reizigers, of minder als het rustig is) dan betaalt het loon van het vak plus loopbaanpunten.
// De trein zelf staat in het spel niet vol zittende reizigers (de rit is een filmpje), dus de controle gebeurt op het perron.
// Pure regels met de stationstoestand als parameter (scripts/kaartjescontrole_test.mjs).
import { currentStation, reizigerPlekken } from './stationlife.js';
import { getProfiel, loopbaanTel, loopbaanVerdien } from './loopbaanlive.js';
import { niveauVoorVak } from './loopbaan.js';
import { playerBusy } from './busy.js';

export const CONTROLE_MIN_NIVEAU = 3;   // Kaartjesknipper
export const CONTROLE_DOEL = 5;         // reizigers per ronde
export const CONTROLE_M = 2;            // zo dichtbij moet je staan
export const CONTROLE_LOON = 45;        // basisloon voor een volle ronde (keer de loonfactor van het vak)
export const CONTROLE_XP = 25;          // punten voor een volle ronde
export const CONTROLE_XP_PER = 3;       // punten per gecontroleerde reiziger
export const CONTROLE_PAUZE_S = 900;    // na een ronde even rust op dat station (spelklok, seconden)
const MAX_REIZIGERS = 16;               // gelijk aan stationlife3d.js

// Wat een reiziger zegt: vast per station en plek, zodat dezelfde reiziger altijd hetzelfde antwoord geeft.
export const ANTWOORDEN = {
  ok: 'Kaartje in orde, prettige reis.',
  zoeken: 'Even zoeken... zat in zijn jaszak. In orde!',
  automaat: 'Geen kaartje, maar hij koopt er bij de automaat meteen een. Netjes.',
};
export function uitkomst(stationNaam, i) {
  let h = 7;
  for (const ch of `${stationNaam}|${i}`) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const k = h % 10;
  return k < 6 ? 'ok' : k < 9 ? 'zoeken' : 'automaat';
}

let toestand = { station: null, gedaan: new Set(), klaarOp: {} };

export function resetControle() { toestand = { station: null, gedaan: new Set(), klaarOp: {} }; }
export const controleToestand = () => toestand;

// Het aantal reizigers dat op het perron te zien is, en het doel van deze ronde.
export function perronReizigers(cur) {
  if (!cur || !cur.station || !cur.view) return [];
  const n = Math.min(MAX_REIZIGERS, Math.max(0, Math.floor(cur.view.drukte || 0)));
  return reizigerPlekken(cur.station, MAX_REIZIGERS).slice(0, n).map((s, i) => ({ i, x: s.x, y: s.y }));
}
export const rondeDoel = (reizigers) => Math.min(CONTROLE_DOEL, reizigers.length);

export function magControleren(w) {
  const p = w && w.player;
  if (!p || p.inVehicle || p.swimming || w.paused || w.uiPaused) return false;
  if (playerBusy(w).busy) return false;
  return niveauVoorVak(getProfiel(), 'trein') >= CONTROLE_MIN_NIVEAU;
}

function synchroon(cur) {
  const naam = cur && cur.station ? cur.station.name : null;
  if (naam !== toestand.station) { toestand.station = naam; toestand.gedaan = new Set(); }
}

// De dichtstbijzijnde reiziger die nog gecontroleerd moet worden, of null.
export function dichtstbij(w, cur = currentStation()) {
  if (!cur || !magControleren(w)) return null;
  synchroon(cur);
  if ((w.time - (toestand.klaarOp[cur.station.name] ?? -1e9)) < CONTROLE_PAUZE_S) return null;
  const lijst = perronReizigers(cur);
  if (lijst.length < 2) return null;
  let best = null, bd = CONTROLE_M;
  for (const r of lijst) {
    if (toestand.gedaan.has(r.i)) continue;
    const d = Math.hypot(r.x - w.player.x, r.y - w.player.y);
    if (d <= bd) { bd = d; best = { ...r, doel: rondeDoel(lijst) }; }
  }
  return best;
}

export function kaartjesPrompt(w, cur = currentStation()) {
  const r = dichtstbij(w, cur);
  if (!r) return null;
  return { id: 'kaartje-' + r.i, x: r.x, y: r.y, h: 1.9, key: 'E', label: 'Kaartje controleren', sub: `Reiziger ${toestand.gedaan.size + 1} van ${r.doel}`, ring: true };
}

// De controle zelf: antwoord, punten, en bij een volle ronde het loon.
export function controleer(w, cur = currentStation()) {
  const r = dichtstbij(w, cur);
  if (!r) return false;
  const naam = cur.station.name;
  toestand.gedaan.add(r.i);
  loopbaanTel(w, 'trein', { xp: CONTROLE_XP_PER });
  w.addMessage(ANTWOORDEN[uitkomst(naam, r.i)], 2.8);
  if (toestand.gedaan.size >= r.doel) {
    toestand.klaarOp[naam] = w.time;
    toestand.gedaan = new Set();
    const betaald = loopbaanVerdien(w, 'trein', CONTROLE_LOON, { xp: CONTROLE_XP, rubriek: 'Overig inkomsten' });
    w.addMessage(`Perron gecontroleerd in ${naam}: €${betaald}`, 4, { kind: 'geld', key: 'kaartjes-klaar' });
  }
  return true;
}

export function tryControle(w, cur = currentStation()) {
  const input = w && w.input;
  if (!input || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  if (!kaartjesPrompt(w, cur)) return false;
  input.consume('e');
  input.consume('f');
  return controleer(w, cur);
}

// Elk beeld: ander station, nieuwe ronde.
export function updateControle() {
  synchroon(currentStation());
}
