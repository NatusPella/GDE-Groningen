// Leaf: is the pause menu open. pausemenu.js sets it; everything that only needs to
// ask (HUD, prompts, hints, cutscenes) imports this instead of the menu itself, so
// those modules are not part of the menu's import cycle (#108). The same for the map.
let mapOpen = false;
export function setMapOpenState(v) { mapOpen = !!v; }
export function isMapOpen() { return mapOpen; }
let open = false;
export function setPauseMenuOpen(v) { open = !!v; }
export function isPauseMenuOpen() { return open; }
