// Waar Tammo en Tessa op een boot staan of zitten in een scène (missionstory.js boatStage, cutscenes_akte1.js quickScene): puur,
// zonder THREE, zodat een test de plekken tegen de romp en het dak van de echte boot kan leggen (scripts/boatdeck_test.mjs,
// scripts/cutscene_regie_audit.mjs). Boot-lokaal: +x = boeg, +z = stuurboord, y omhoog vanaf de waterlijn van de romp.
//
// Waarom dit bestaat: de rondvaartboot heeft een glazen dak op 1,6 m dat bijna de hele boot overdekt. Een staand figuur (1,75 m)
// steekt daar met zijn hoofd doorheen, en een scène die dwars op de boot kijkt (facing = hoek + 90 graden) zette het paar op
// het dak-eind met de blik naar de zijkant: op beeld stonden ze BOVENOP het glas. Onder het dak kan alleen iemand zitten; dus
// praten zij op de bank, op het open voordek staan ze alleen aan de reling (het dekmoment).
import { boatSeats } from './boattypes.js';

// het dak van de rondvaartboot: één bron voor het model (models3d_vehicles.js rondvaartFit) en voor de plaatsing
export const CANOPY = { back: 1.25, front: 1.35, roofY: 1.6, glassThick: 0.07 };
export const PERSON_H = 1.78;   // een staand figuur (buildPersonMesh), met kapsel
export const SEATED_HEAD = 0.9; // zithoogte tot kruin (zitvlak tot hoofdtop)
export const HULL_FLOOR = 0.14; // de vloer van de romp boven de waterlijn (HULL_SHAPES.rondvaart.floor)

// het dak van een boot als { x0, x1, y } in boot-lokale coördinaten, of null als de boot geen dak heeft
export function canopyOf(model) {
  if (!model || model.kind !== 'rondvaart') return null;
  const hl = model.len / 2;
  return { x0: -hl + CANOPY.back, x1: hl - CANOPY.front, y: CANOPY.roofY };
}

// De zitplek voor een gesprek op de rondvaartboot: de derde bank van voren, twee zitplaatsen naast elkaar (zoals boatSeats ze
// legt). `seat` = hoogte van het zitvlak boven de vloer; `row` = de plek zelf in boot-lokale coördinaten.
export function benchPlan(model) {
  const seats = boatSeats({ model }).slice(1);
  if (!seats.length) return null;
  const rows = [...new Set(seats.map((s) => s.x))].sort((a, b) => b - a);
  const x = rows[Math.min(2, rows.length - 1)];
  const pair = seats.filter((s) => s.x === x).sort((a, b) => a.z - b.z);
  if (pair.length < 2) return null;
  return { x, left: pair[pair.length - 1], right: pair[0], seat: pair[0].y - HULL_FLOOR, floor: HULL_FLOOR };
}

// De plek van het paar bij een scène op een boot: { mode, x (boot-lokaal), floor, facing: 'bow' | 'side', seat? }.
// 'bench' = zittend onder het dak (rondvaart), 'stand' = staand op het dek zoals voorheen.
export function deckPlan(model) {
  if (model && model.kind === 'rondvaart') {
    const b = benchPlan(model);
    if (b) return { mode: 'bench', x: b.x, floor: HULL_FLOOR, seat: b.seat, facing: 'bow', gap: Math.abs(b.left.z - b.right.z) };
    return { mode: 'stand', x: model.len / 2 - 0.7, floor: HULL_FLOOR, facing: 'side' };
  }
  // andere boten: staand dwars op het dek (quickScene deck: true laat het paar 0,5 m dwars en 0,9 m langs de boot staan); past dat niet
  // in de romp (kano, kajak, SUP, roeiboot: een romp van een halve meter breed), dan zitten ze op hun eigen zitplaatsen (boatSeats)
  const fits = spotIssues(model, STAND_SPOTS).length === 0;
  if (fits) return { mode: 'stand', x: 0, floor: 0.45, facing: 'side' };
  const seats = boatSeats({ model }).slice(0, 2);
  return { mode: 'seats', x: 0, floor: 0.1, facing: 'bow', seats };
}
// de plekken van quickScene deck: true in boot-lokale coördinaten (x langs, z dwars): het paar loopt van 0 naar 0,9 m langs en 0,5 m dwars
export const STAND_SPOTS = [{ x: -0.9, z: 0.5, h: 0, sit: 0 }, { x: 0.9, z: 0.5, h: 0, sit: 0 }, { x: -0.9, z: -0.5, h: 0, sit: 0 }, { x: 0.9, z: -0.5, h: 0, sit: 0 }];

// Een lijst problemen met een plan: wie onder het dak staat zonder erdoor te passen, wie buiten de romp valt.
// `spots` = [{ x, z, h (boven de vloer), sit (0 = staand) }]; leeg = in orde.
export function spotIssues(model, spots) {
  const out = [];
  const roof = canopyOf(model);
  const hl = model.len / 2;
  for (const s of spots) {
    const top = (s.sit ? s.sit + SEATED_HEAD : PERSON_H) + (s.h || 0);
    if (roof && s.x > roof.x0 && s.x < roof.x1 && top + HULL_FLOOR > roof.y - 0.02) out.push(`op x=${s.x.toFixed(1)} steekt een ${s.sit ? 'zittend' : 'staand'} figuur door het dak (kruin ${(top + HULL_FLOOR).toFixed(2)} m, dak ${roof.y} m)`);
    if (Math.abs(s.x) > hl - 0.3 || Math.abs(s.z) > model.wid / 2 - 0.2) out.push(`op x=${s.x.toFixed(1)}, z=${s.z.toFixed(1)} valt een figuur buiten de romp`);
  }
  return out;
}
