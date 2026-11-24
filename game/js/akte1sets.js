// De aankleding van de ruimtes van akte 1 (vertical slice, 23-11) als pure data: welk meubel uit het interieurregister
// (propregister.js INTERIEUR_REGISTER) waar staat. Geen three, geen DOM: scripts/akte1_sets_test.mjs keurt de lijsten (alleen
// geregistreerde meubels, genoeg per ruimte, binnen de wanden, niet in elkaar, niet zwevend) zonder spel. De bouwers lezen ze:
// introkitchen3d.js (de keuken van de opening) en home3d.js buildFlat3D (de flat in Paddepoel).
//
// Een regel: { id, u, h, v, rot, fit?, scale?, op?, in? }
//   u, v    plek op de vloer (m) in het frame van de ruimte (keuken: u = x, v = z, de tafel op de oorsprong; flat: x langs de gevel,
//           z naar binnen); h de hoogte van de onderkant
//   rot     draaiing om de verticaal (rad, three-zin): 0 = voorkant naar +u, -PI/2 = naar +v, PI/2 = naar -v, PI = naar -u
//   fit     { b, h, d } doelmaat (m) langs de assen van het model; scale een vaste schaal (getal of [x, y, z])
//   op      waar hij op staat als hij niet op de vloer staat ('wandplank', 'nachtkastje', 'aanrecht', 'plafond', 'wand', 'kast')
//   in      'deur': hangt in het scharnier van de keukendeur; 'gang': in de gang achter de deur
//   kleuren een andere kleur voor een materiaal van de glb ({ Couch_Blue: 0xd9c9a6 }), zie interiorprops3d.js
//   prop    true: een prop uit het propregister (PROP_REGISTER, gebruik 'interieur': tv, frituurpan, boekenkast, droogrek, dozen,
//           prints, laptop), geplaatst met interiorprops3d.js registeredProp
//   op      'wand': hangt aan of staat tegen een wand (telt niet mee in de vloercontrole); 'vloer': ligt op de vloerbedekking
// Samen spelen: de keuken is een lokale filmset (de opening is per speler, openingfilm.js MULTIPLAYER); de flat is het huis van wie
// het spel opende en elke speler bouwt zijn eigen kopie. Niets hiervan gaat over het net of in een save.

const Q = Math.PI / 2;

// De keuken van Tessa op de zolder in de Oosterparkwijk: 4,4 x 3,6 m, 2,6 m hoog. Het raam zit in de wand u = -2,2 (achter Tessa),
// de deur in de wand v = +1,8 (scharnier op u = 1,75), het aanrecht tegen de wand v = -1,8. De plekken van Tammo en Tessa staan in
// introkitchen3d.js KITCHEN; de vloer rond (0,3; 0,9) en (1,3; 1,3) blijft vrij (terugkeerscenes.js laat Tammo daar staan).
export const KITCHEN_ROOM = { u0: -2.2, u1: 2.2, v0: -1.8, v1: 1.8, h: 2.6 };
export const KITCHEN_HALL = { u0: 0.82, u1: 1.78, v0: 1.8, v1: 3.4, h: 2.6 };
export const KITCHEN_FREE = [[0.3, 0.9, 0.35], [1.3, 1.3, 0.35], [1.3, 1.62, 0.3]]; // [u, v, straal]: staplekken die vrij blijven
export const KITCHEN_DRESSING = [
  // het aanrecht langs de achterwand: spoelkast, fornuis, wasmachine, koelkast (voorkant naar de kamer)
  { id: 'keukenkast', u: -0.95, h: 0, v: -1.49, rot: -Q },
  { id: 'fornuis', u: -0.33, h: 0, v: -1.48, rot: -Q },
  { id: 'wasmachine', u: 0.39, h: 0, v: -1.44, rot: -Q },
  { id: 'koelkast', u: 1.16, h: 0, v: -1.44, rot: -Q },
  { id: 'prullenbak', u: 1.78, h: 0, v: -1.63, rot: -Q },
  // een plank boven het aanrecht met een cactus
  { id: 'wandplank', u: -0.64, h: 1.5, v: -1.64, rot: -Q, op: 'wand' },
  { id: 'cactus', u: -0.98, h: 1.82, v: -1.66, rot: 0, op: 'wandplank' },
  // de tafel met twee stoelen (de zittingen op KITCHEN.seatH), een kleed eronder en een hanglamp erboven
  { id: 'vloerkleed', u: 0, h: 0, v: 0, rot: 0, fit: { b: 2.0, h: 0.012, d: 1.4 } },
  { id: 'keukentafel', u: 0, h: 0, v: 0, rot: 0, fit: { b: 1.3, h: 0.77, d: 0.86 } },
  { id: 'keukenstoel', u: -0.86, h: 0, v: 0, rot: 0, scale: 0.94, tag: 'tessa' },
  { id: 'keukenstoel', u: 0.86, h: 0, v: 0, rot: Math.PI, scale: 0.94, tag: 'tammo' },
  { id: 'hanglamp', u: 0, h: 2.04, v: 0, rot: 0, scale: 1.2, op: 'plafond' },
  // het raam achter Tessa (zonder gordijnen: de dageraad valt erdoor naar binnen), een plant in de hoek
  { id: 'raam', u: -2.17, h: 1.0, v: 0, rot: 0, fit: { b: 0.1, h: 1.2, d: 1.6 }, op: 'wand' },
  { id: 'kamerplant', u: -1.82, h: 0, v: -1.38, rot: 0 },
  // de deur en de gang erachter: een lamp, een plant en de deur naar het trappenhuis
  { id: 'deur', u: -0.44, h: 0, v: 0, rot: Q, fit: { h: 2.02, d: 0.88 }, in: 'deur' },
  { id: 'hanglamp', u: 1.3, h: 2.13, v: 2.6, rot: 0, op: 'plafond', in: 'gang' },
  { id: 'kamerplant', u: 1.42, h: 0, v: 2.9, rot: 0, scale: 0.8, in: 'gang' },
  { id: 'deur', u: 1.3, h: 0, v: 3.29, rot: Q, fit: { h: 2.02, d: 0.86 }, op: 'wand', in: 'gang' },
];

// De flat van Tammo en Tessa (flatplan.js: 11 x 9 m; woonkamer x 0-6,8, keuken 6,8-11 aan de glasgevel z = 0; gang, kamer Tammo en
// kamer Tessa achterin, z 5,2-9). `vervangt`: het stuk dat een EIKEA-meubel vervangt (furniture.js; buildFlat3D slaat het dan over).
// De plekken uit flatplan.js spots blijven gelden (gebruik, botsing, spawn): de meubels staan op of rond die plekken.
export const FLAT_DRESSING = [
  // woonkamer van twee net-afgestudeerden met weinig geld (23-11, na beeldcontrole coördinator): de bank recht tegenover de tv, beide
  // op een groot kleed met de bijzettafel ertussen; een boekenkast en een bureau met laptop tegen de westwand, een stapel dozen die nog
  // niet uitgepakt is, een droogrek in het licht bij het raam, prints en een poster, planten, een staande lamp. Geen gordijnen: in de
  // cutaway zakt de glasgevel tot heuphoogte als de camera erbuiten staat, en een gordijn van 2,4 m zou dan los in de lucht hangen. Looproutes blijven vrij: van de gangdeur (x 1,0-2,4) naar het raam, en langs het raam naar de keuken.
  // Geen hanglampen: de flat is een cutaway (wanden tot heuphoogte, de camera erboven), een lamp aan het plafond zou zweven.
  { id: 'zitbank', u: 3.7, h: 0, v: 3.95, rot: Q, vervangt: 'bank' },
  { id: 'vloerkleed', u: 3.7, h: 0.021, v: 2.75, rot: 0, fit: { b: 3.2, h: 0.012, d: 2.6 }, op: 'vloer' }, // op het laminaat (2 cm)
  { id: 'salontafel', u: 3.7, h: 0, v: 2.5, rot: 0, fit: { b: 0.8, h: 0.45, d: 0.8 } },
  { id: 'ladekast', u: 3.7, h: 0, v: 1.0, rot: -Q, vervangt: 'tv' },
  { id: 'tv', prop: true, u: 3.7, h: 0.74, v: 1.0, rot: -Q, op: 'ladekast', vervangt: 'tv' },
  { id: 'lijst', prop: true, u: 4.3, h: 0.74, v: 0.85, rot: -Q, op: 'ladekast' },
  { id: 'vloerlamp', u: 2.55, h: 0, v: 4.35, rot: 0 },
  { id: 'boekenkast', prop: true, u: 0.24, h: 0, v: 3.3, rot: 0 },
  { id: 'bureau', u: 0.45, h: 0, v: 1.75, rot: 0 },
  { id: 'laptop', prop: true, u: 0.49, h: 0.78, v: 1.95, rot: 0, op: 'bureau' },
  { id: 'tafellamp', u: 0.32, h: 0.78, v: 1.2, rot: 0, op: 'bureau' },
  { id: 'keukenstoel', u: 1.07, h: 0, v: 1.8, rot: Math.PI },
  { id: 'verhuisdozen', prop: true, u: 0.42, h: 0, v: 4.7, rot: 0 },
  { id: 'poster', prop: true, u: 0.075, h: 0.3, v: 4.1, rot: 0, op: 'wand' },
  { id: 'lijst', prop: true, u: 2.9, h: 0.42, v: 5.12, rot: Q, op: 'wand' },
  { id: 'droogrek', prop: true, u: 5.15, h: 0, v: 0.55, rot: Q },
  { id: 'kamerplant', u: 0.45, h: 0, v: 0.45, rot: 0 },
  { id: 'kamerplant', u: 6.3, h: 0, v: 0.55, rot: 0 },
  { id: 'cactus', u: 4.05, h: 0.74, v: 1.12, rot: 0, op: 'ladekast' },
  // keuken: aanrecht langs de gevel (spoelkast, fornuis met de frituurpan erop, wasmachine), koelkast aan het eind, tafel en stoelen
  { id: 'keukenkast', u: 7.76, h: 0, v: 0.55, rot: -Q },
  { id: 'fornuis', u: 8.4, h: 0, v: 0.55, rot: -Q },
  { id: 'frituurpan', prop: true, u: 8.4, h: 0.876, v: 0.55, rot: -Q, op: 'fornuis', vervangt: 'frituur' },
  { id: 'wasmachine', u: 9.09, h: 0, v: 0.6, rot: -Q },
  { id: 'koelkast', u: 10.5, h: 0, v: 1.6, rot: Math.PI },
  { id: 'prullenbak', u: 7.2, h: 0, v: 0.4, rot: -Q },
  { id: 'keukentafel', u: 8.2, h: 0, v: 3.4, rot: 0, fit: { b: 1.2, h: 0.75, d: 0.85 } },
  { id: 'keukenstoel', u: 7.42, h: 0, v: 3.4, rot: 0 },
  { id: 'keukenstoel', u: 8.98, h: 0, v: 3.4, rot: Math.PI },
  // kamer Tammo (x 3,4-7,2): bed met het hoofd tegen de achterwand, nachtkastje met lamp, kledingkast
  { id: 'bed', u: 6.6, h: 0, v: 7.88, rot: Q, scale: [0.9, 1, 0.84], vervangt: 'bed' },
  { id: 'nachtkastje', u: 5.75, h: 0, v: 8.65, rot: Q },
  { id: 'tafellamp', u: 5.75, h: 0.53, v: 8.65, rot: 0, op: 'nachtkastje' },
  { id: 'kledingkast', u: 4.7, h: 0, v: 8.65, rot: Q, scale: [1, 1, 1.35] },
  // kamer Tessa (x 7,2-11): bed, nachtkastje, bureau met stoel tegen de achterwand, kledingkast aan de zijwand
  { id: 'bed', u: 7.8, h: 0, v: 7.88, rot: Q, scale: [0.9, 1, 0.84], vervangt: 'bed' },
  { id: 'nachtkastje', u: 8.65, h: 0, v: 8.65, rot: Q },
  { id: 'tafellamp', u: 8.65, h: 0.53, v: 8.65, rot: 0, op: 'nachtkastje' },
  { id: 'kledingkast', u: 10.65, h: 0, v: 6.2, rot: Math.PI, scale: [1, 1, 1.35] },
  { id: 'bureau', u: 9.9, h: 0, v: 8.6, rot: Q },
  { id: 'keukenstoel', u: 9.9, h: 0, v: 7.98, rot: -Q },
  { id: 'laptop', prop: true, u: 10.05, h: 0.78, v: 8.55, rot: -Q, op: 'bureau' },
  // gang: een plant bij de voordeur
  { id: 'kamerplant', u: 0.55, h: 0, v: 8.45, rot: 0.9, scale: 0.9 },
];
export const FLAT_ROOMS_MIN = 3; // elke kamer van de flat (behalve de gang) heeft minstens zoveel meubels

// De voetafdruk van een regel op de vloer (u0, u1, v0, v1), uit de maat van het model (`maat` = [b, h, d] van het register of de data)
// met schaal en draaiing (alleen veelvouden van een kwartslag; anders de omhullende cirkel).
export function footprint(e, maat) {
  const s = scaleOf(e, maat);
  const b = maat[0] * s[0], d = maat[2] * s[2];
  const r = ((e.rot || 0) % Math.PI + Math.PI) % Math.PI;
  const quarter = Math.abs(r - Q) < 0.01;
  const straight = r < 0.01 || Math.abs(r - Math.PI) < 0.01;
  const [du, dv] = quarter ? [d / 2, b / 2] : straight ? [b / 2, d / 2] : [Math.hypot(b, d) / 2, Math.hypot(b, d) / 2];
  return { u0: e.u - du, u1: e.u + du, v0: e.v - dv, v1: e.v + dv, top: (e.h || 0) + maat[1] * s[1] };
}

// De schaal per as zoals interiorprops3d.js fitScale hem rekent (zelfde regel, zonder three).
function scaleOf(e, maat) {
  if (e.scale) return Array.isArray(e.scale) ? e.scale : [e.scale, e.scale, e.scale];
  if (!e.fit) return [1, 1, 1];
  const want = [e.fit.b, e.fit.h, e.fit.d];
  const f = want.map((w, i) => (typeof w === 'number' && w > 0 ? w / maat[i] : null));
  const known = f.filter((v) => v != null);
  const avg = known.length ? known.reduce((a, c) => a + c, 0) / known.length : 1;
  return f.map((v) => (v == null ? avg : v));
}
