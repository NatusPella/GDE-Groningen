// De plek van het containerlabyrint (M13) in de Eemshaven (#928). De missie
// zocht container 4471 op een punt 260 m van de kade, in het gras; er stond
// niets. Hier staat waar de kade, de kraan, de container en Lammert liggen, als
// één bron voor de missiestappen (missions_nieuw.js) en de rekwisieten
// (containerterminal.js). Puur: geen THREE, geen DOM, zodat de missietests hem
// zonder wereld kunnen lezen.
import { wgsToWorld } from './rdnew.js';

const [BX, BY] = wgsToWorld(53.4440, 6.8560);
const plek = (dx, dy) => ({ x: BX + dx, y: BY + dy, road: null });

// De kade waar Lammert wacht (het startpunt van de missie).
export const M13_QUAY = plek(0, 0);
// De kraankooi waar je stil moet blijven staan.
export const M13_CRANE = plek(120, -55);
// Container 4471: het doel van de zoekstap en van het verwisselen van de papieren.
export const M13_CONTAINER = plek(260, 40);
// Lammert, aan de kade, voor de terugweg.
export const M13_LAMMERT = plek(10, 5);

const container = (dx, dy, lengte, kleur, stapel = 0) => ({
  x: M13_CONTAINER.x + dx, y: M13_CONTAINER.y + dy, lengte, kleur, stapel,
});

// De stapel: de blauwe 4471 staat midden op het doel, de rode ernaast; twee
// andere containers liggen eromheen, één op de stapel. Alles in de low-poly
// kleuren van de haven (DESIGN_SYSTEM.md), geen echte rederij.
export const CONTAINER_STACKS = Object.freeze([
  container(0, 0, 12.2, '#2d6a86'),        // de blauwe van 4471
  container(0, 3.0, 12.2, '#d55e00'),      // de rode ernaast
  container(13.5, 0.4, 6.1, '#34562c', 1), // groene, op de stapel
  container(-13.0, -2.2, 12.2, '#b8703a'), // oranje, aan de andere kant
]);

// De kabelrollen en de kraan horen bij het beeld van de kade; de kooi is de
// plek waar de missie je laat wachten.
export const CABLE_REELS = Object.freeze([
  { x: M13_CRANE.x + 5.5, y: M13_CRANE.y - 3.2, r: 1.6 },
  { x: M13_CRANE.x + 8.0, y: M13_CRANE.y - 6.5, r: 1.2 },
]);
