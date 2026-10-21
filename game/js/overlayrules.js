// Welke overlay wacht op welke (#239): pure regels, geen DOM. De resultaatkaart ("Missie geslaagd") en
// het keuzepaneel zijn van het hele scherm: wat er die tijd onder of over zou liggen (personagenaam,
// duelbalk, prestatie) wacht tot de kaart weg is. Een duelbalk houdt prestaties en de plaatsnaam
// tegen. Zo ligt er één ding tegelijk in beeld. overlayhold.js past het toe op de DOM;
// scripts/overlayrules_test.mjs.

// De tabellen en de regel staan in hudbus.js (mayShow('overlay', ...)); hier blijven de namen die de
// DOM-kant (overlayhold.js) en de test gebruiken.
import { OVERLAY_RANK, OVERLAY_HOLDS, heldOverlays as busHeld, mayShow } from './hudbus.js';

// Rang: hoger wint. Zelfde rang houdt elkaar niet tegen.
export const RANK = OVERLAY_RANK;

// Wat een actieve overlay tegenhoudt.
export const HOLDS = OVERLAY_HOLDS;

// active: een lijst of Set met namen van wat nu in beeld is. Geeft de Set van wat moet wachten.
export const heldOverlays = busHeld;

// Mag deze overlay nu beginnen?
export const mayStartOverlay = (name, active) => mayShow('overlay', { name, active });
