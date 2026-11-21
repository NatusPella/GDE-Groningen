// De ene tabel van de randen rond percelen en weilanden (#1092, docs/PERCEELRANDEN-21-11.md): randklasse -> bron in de
// kaartdata, geometrie, hoogte, collision en kleur. Een rand bestaat alleen waar de KAART een lijn heeft (de gemapte
// barrier=hedge en barrier=fence, natural=tree_row en waterway=ditch|drain|stream van de tegels); het spel leidt geen rand
// meer af uit een perceelpolygoon of het hashraster. Wat een speler ziet en wat hem tegenhoudt komt uit dezelfde regel:
// streetfurniture.js (colliders), streetfurniture3d.js (geometrie en kleur) en worldbuilder.js (sloot- en boomrijbreedte) lezen
// deze tabel, en scripts/edgeclasses_test.mjs bewaakt dat elk getekend randtype een collision heeft en omgekeerd.
// Samen spelen: de randen komen uit de tegeldata en zijn dus voor elke speler gelijk (geen toeval, geen host-keuze).
// Puur: geen THREE, geen DOM (de kleur loopt door worldpalette.js, de ene wereldpalet-module).
import { dsWereld } from './worldpalette.js';

export const EDGE_CLASSES = Object.freeze({
  // Sloot, greppel of beek: echt water in de tegel (WATER-sectie, rij met ditch: true, kind 'sloot'). Collision is het
  // water zelf: vehicle.js offroadGround leest kind 'sloot' als 'ditch' (ditchsweep.js: harde rem, niet over te rijden),
  // voetgangers waden. Waar een weg de sloot kruist ligt een duiker (markDryRoad): de weg blijft heel.
  ditch: Object.freeze({
    label: 'sloot',
    source: Object.freeze({ section: 'WATER', osm: ['waterway=ditch', 'waterway=drain', 'waterway=stream'] }),
    width: Object.freeze({ ditch: 2.4, drain: 1.6, stream: 3 }), // m, als OSM er geen breedte bij geeft
    visual: Object.freeze({ kind: 'water', waterKind: 'sloot' }),
    collider: Object.freeze({ kind: 'water', ground: 'ditch' }),
  }),
  // Heg of houtwal (barrier=hedge): lage heg, overal hetzelfde profiel, vast voor voertuigen en wandelaars.
  hedge: Object.freeze({
    label: 'heg',
    source: Object.freeze({ section: 'FURNITURE', k: 'hedge', osm: ['barrier=hedge'] }),
    height: 1.4, // m, als OSM er geen height bij geeft
    visual: Object.freeze({ bodyH: 1, depth: 0.9, capH: 0.2, capDepth: 0.7, body: 0x3f6a30, cap: 0x4a7838, rol: 'groen' }),
    collider: Object.freeze({ kind: 'heg', r: 0.4, static: true }), // top = de hoogte van het stuk
  }),
  // Hek (barrier=fence): dun hek, breekt bij een flinke klap (breakables.js 'hek'), een stuk dat stuk is blijft weg tot het terugkomt.
  fence: Object.freeze({
    label: 'hek',
    source: Object.freeze({ section: 'FURNITURE', k: 'fence', osm: ['barrier=fence'] }),
    height: 1.4,
    visual: Object.freeze({ panelH: 1.4, panelY: 0.75, thick: 0.03, postH: 1.6, postW: 0.06, panel: 0x4f5a52, post: 0x3d4640, rol: 'donker' }),
    collider: Object.freeze({ kind: 'hek', r: 0.08, static: false }),
  }),
  // Boomrij (natural=tree_row): een boom om de 6 m, elke boom met stamcollision (breakables.js 'tree').
  treerow: Object.freeze({
    label: 'boomrij',
    source: Object.freeze({ section: 'TREES', osm: ['natural=tree_row'] }),
    spacing: 6, // m tussen twee bomen
    visual: Object.freeze({ kind: 'tree' }),
    collider: Object.freeze({ kind: 'tree', r: 0.28, static: false }),
  }),
});

// De collision van een stuk van een klasse (het formaat van streetfurniture.js furnitureColliders). `it`: { x, y, a, s, key, h }.
export function edgeCollider(cls, it) {
  const c = EDGE_CLASSES[cls].collider;
  const out = { kind: c.kind, x: it.x, y: it.y, r: c.r, half: it.s / 2, angle: it.a, key: it.key };
  if (c.static) { out.static = true; out.top = it.h !== undefined ? it.h : EDGE_CLASSES[cls].height; }
  return out;
}

// De hoogte (m) van een stuk: de OSM-hoogte, anders die van de klasse.
export const edgeHeight = (cls, h) => (Number.isFinite(h) && h > 0 ? h : EDGE_CLASSES[cls].height);

// De kleur van een deel van een randklasse, door de wereldpalet-module (DS-kleuren, geen eigen hexwaarde in de tekencode).
export const edgeColour = (cls, part) => {
  const v = EDGE_CLASSES[cls].visual;
  return dsWereld(v[part], v.rol || 'auto');
};

// De samenhangcontrole (scripts/edgeclasses_test.mjs): elke klasse met een zichtbaar deel heeft een collision, elke collision
// hoort bij een zichtbaar deel, en de klassen met een stuk uit de FURNITURE-sectie hebben een hoogte.
export function edgeClassProblems(classes = EDGE_CLASSES) {
  const bad = [];
  for (const [id, c] of Object.entries(classes)) {
    if (!c.visual) bad.push(`${id}: geen visual maar wel collision`);
    if (!c.collider) bad.push(`${id}: wel visual maar geen collision`);
    if (!c.source || !c.source.osm || !c.source.osm.length) bad.push(`${id}: geen kaartbron (een rand zonder kaartlijn mag niet)`);
    if (c.source && c.source.section === 'FURNITURE' && !(c.height > 0)) bad.push(`${id}: geen hoogte`);
    if (c.collider && c.collider.kind !== 'water' && !(c.collider.r > 0)) bad.push(`${id}: collision zonder straal`);
  }
  return bad;
}
