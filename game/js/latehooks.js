// Leaf: late-bound links between modules that must not import each other (import cycles, #108).
// The module that has the real function assigns it when it loads; the module that needs it calls it
// through here. The slots live in this leaf, so assigning is safe whatever order the modules evaluate
// in, and without the provider a slot does nothing (or answers empty).
export const walkPathHook = { find: () => null };              // routing.js -> pedroutes.js (findWalkPath)
export const throwablesHook = { update3D: () => {} };          // throwables.js -> gunfx3d.js (updateThrowables3D)
export const furnitureShopHook = { items: () => [], note: () => '' }; // furniture.js -> shops.js (Woonafdeling)
export const jobBonusHook = { get: () => 1 };                  // furniture.js -> sidejobs.js (Bureau bonus)
// cinematics.js asks respawn.js and scene3d.js through this (respawn.js and main.js fill it via setCinematicLinks)
export const cinematicLinks = { startRespawnScene: () => false, respawnFade: () => {}, getFollowPose: () => null, prewarmStreamAt: () => {} };
