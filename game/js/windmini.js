// De windaanwijzer op de minikaart (#399): zolang je zeilt staat er een windpijl met streepjes in de hoek van de
// minikaart. Puur (geen DOM, geen THREE): hud_panel.js tekent hem, scripts/windmini_test.mjs test de regels.
// De wind komt uit dezelfde bron als de zeilcode, dus de pijl klopt met wat de boot voelt:
//  - zeilboot (open water en de zeilregatta): world.wind, gezet door zeilvaren.js uit windOp (zeilrules.js);
//  - skûtsje-sprint (postgame): het weer, zoals pg_skutsje.js zelf (weerWindVan), met een vaste middensterkte.
import { WIND, WEER_WIND_SNELHEID, weerWindVan, wrap } from './zeilrules.js';

// { van, snelheid } (van = waar de wind vandaan komt, radialen zoals de wereld) of null als je niet zeilt
export function miniWind(world) {
  const p = world && world.player;
  const v = p && p.inVehicle;
  if (!v || !v.isBoat || v.driver !== 'player') return null;
  if (v.model && v.model.zeil) {
    const w = world.wind;
    return w && Number.isFinite(w.dir) && Number.isFinite(w.speed) ? { van: w.dir, snelheid: w.speed } : null;
  }
  if (world.challenge && world.challenge.id === 'skutsje' && v.sailTop != null) return { van: weerWindVan(world.weather), snelheid: WEER_WIND_SNELHEID };
  return null;
}

// Hoe sterk de wind is voor de tekening: t 0..1 over het bereik van de zeilcode, en 1 tot 3 streepjes
export function windSterkte(snelheid) {
  const t = Math.max(0, Math.min(1, (snelheid - WIND.min) / (WIND.max - WIND.min)));
  return { t, streepjes: t < 0.34 ? 1 : t < 0.67 ? 2 : 3 };
}

// De pijl wijst waar de wind heen waait (zoals de windwijzer van zeilvaren.js), op het scherm van de minikaart:
// elke wereldhoek plus de draaiing van de kaart (mapRotation) is een schermhoek.
export const windPijlHoek = (van, mapRotation) => wrap(van + Math.PI + mapRotation);

export const windTekst = (snelheid) => `${Math.round(snelheid)} m/s`;
