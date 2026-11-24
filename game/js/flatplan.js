// The floor plan of Tammo and Tessa's flat in Paddepoel (home.js), as pure data in the flat's own frame: x along the glass facade
// (z = 0, looking out on the shopping centre), z inwards to the back wall (z = d, with the lift door). No THREE, no map: so
// scripts/spawnbinnen_test.mjs can check the spots where the player may appear (spawnbinnen.js) against the walls and the furniture.
// home.js turns these local points into world coordinates (fl) and builds the cutaway from them. Nothing here is new: the numbers
// moved from home.js unchanged.
export const FLAT_W = 11, FLAT_D = 9;
const HALL = 3.4, MID = 5.2, SPLIT = 7.2;

// Fresh copies every time: home.js and furniture.js may change what they get.
export function makeFlatPlan() {
  const W = FLAT_W, Dd = FLAT_D;
  return {
    w: W, d: Dd,
    rooms: [
      { name: 'woonkamer', x0: 0, x1: 6.8, z0: 0, z1: MID, floor: 'laminate' },
      { name: 'keuken', x0: 6.8, x1: W, z0: 0, z1: MID, floor: 'tiles' },
      { name: 'gang', x0: 0, x1: HALL, z0: MID, z1: Dd, floor: 'tiles' },
      { name: 'kamer Tammo', x0: HALL, x1: SPLIT, z0: MID, z1: Dd, floor: 'carpet' },
      { name: 'kamer Tessa', x0: SPLIT, x1: W, z0: MID, z1: Dd, floor: 'carpet' },
    ],
    // cutaway walls [x1, z1, x2, z2]: outer walls, hall | living room (doorway in line with the lift), hall | Tammo's room (doorway),
    // the bedrooms | living room and kitchen (a doorway from the kitchen into Tessa's room), Tammo's | Tessa's room
    walls: [
      [0, 0, 0, Dd], [W, 0, W, Dd], [0, Dd, W, Dd],
      [0, MID, 1.0, MID], [2.4, MID, HALL, MID],
      [HALL, MID, HALL, 6.2], [HALL, 7.4, HALL, Dd],
      [HALL, MID, 9.0, MID], [10.2, MID, W, MID],
      [SPLIT, MID, SPLIT, Dd],
    ],
    spots: {
      sofa: { x: 3.7, z: 3.9 }, tv: { x: 3.7, z: 1.0 }, table: { x: 8.2, z: 3.4 },
      counter: { x: 9.0, z: 0.55, w: 3.6 }, fryer: { x: 8.4, z: 0.55 }, fridge: { x: 10.5, z: 1.6 },
      // single beds, head to the back wall: bed is Tammo's, bed2 Tessa's
      bed: { x: 6.6, z: 7.95 }, bed2: { x: 7.8, z: 7.95 },
      wardrobe: { x: 4.7, z: 8.6 }, wardrobe2: { x: 10.65, z: 6.2, rot: true },
      door: { x: 1.7, z: Dd - 0.05 }, roof: { x: 0.08, z: 6.6 },
      companion: { x: 3.15, z: 3.98, seat: 0.46 },
    },
    // furniture as solid boxes for walking [x0, z0, x1, z1]; 23-11 (akte 1 op eindniveau, akte1sets.js FLAT_DRESSING): the wardrobes
    // follow the real cupboards, and the chairs, the desk, the night stands and the plant in the hall became solid too
    solids: [
      [2.4, 3.35, 5.0, 4.55], [3.0, 2.1, 4.4, 2.9], [0.2, 0.2, 0.9, 0.9],
      [7.1, 0.2, 10.9, 0.9], [10.1, 1.2, 10.9, 2.0], [7.6, 2.9, 8.8, 3.9],
      [6.1, 6.9, 7.1, 8.95], [7.3, 6.9, 8.3, 8.95], [3.95, 8.3, 5.45, 8.95], [10.3, 5.5, 10.95, 6.9],
      [7.15, 3.15, 7.7, 3.65], [8.7, 3.15, 9.25, 3.65], [9.1, 7.7, 10.7, 8.95], [5.48, 8.38, 6.02, 8.95], [8.38, 8.38, 8.92, 8.95],
      [0.25, 8.15, 0.85, 8.75], [6.0, 0.25, 6.6, 0.85],
      // the living room of two graduates (23-11): bookcase, desk with its chair, the moving boxes, the drying rack
      [0.05, 2.85, 0.42, 3.75], [0.05, 0.95, 0.85, 2.55], [0.8, 1.55, 1.35, 2.05], [0.1, 4.38, 0.75, 5.02], [4.5, 0.2, 5.8, 0.9],
    ],
    // the places where you stand to use something (the E prompt)
    use: {
      bed: { x: 5.65, z: 7.3 }, bed2: { x: 8.75, z: 7.3 },
      wardrobe: { x: 4.7, z: 7.8 }, wardrobe2: { x: 9.85, z: 6.2 }, fridge: { x: 9.7, z: 1.9 },
      fryer: { x: 8.4, z: 1.4 }, door: { x: 1.7, z: 8.4 }, dak: { x: 0.75, z: 6.6 },
    },
    // just out of the lift, in front of the hall
    entry: [1.7, 7.9],
    // where a player appears who is "at home" (spawnbinnen.js): the living room between the sofa and the kitchen, looking at the glass
    // facade (toward z = 0); the next ones are tried when the Sloapstee or an EIKEA piece stands in the way
    spawn: [[5.9, 2.6], [5.9, 3.4], [5.9, 1.8], [2.0, 3.0], [1.8, 2.0]],
  };
}
