// Leaf: the weapon effect (muzzle flash, swing, squirt) of the moment, set by combat.js and read by
// scene3d.js and pedestrians.js; local state, not on world (#108).
let effect = null;
export function setCombatEffect(e) { effect = e; }
export function getCombatEffect() { return effect; }
