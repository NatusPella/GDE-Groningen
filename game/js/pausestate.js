// Leaf: is the pause menu open. pausemenu.js sets it; everything that only needs to
// ask (HUD, prompts, hints, cutscenes) imports this instead of the menu itself, so
// those modules are not part of the menu's import cycle (#108). The same for the map.
let mapOpen = false;
export function setMapOpenState(v) { mapOpen = !!v; }
export function isMapOpen() { return mapOpen; }
let open = false;
export function setPauseMenuOpen(v) { open = !!v; }
export function isPauseMenuOpen() { return open; }
// The unfolded phone is the pause menu on its Telefoon section; pausemenu.js reports the tab.
let tabName = null;
export function setPauseMenuTabState(name) { tabName = name; }
export function isPhoneOpen() { return open && tabName === 'telefoon'; }
// Open and close the menu from a module the menu itself imports (the phone): pausemenu.js registers
// its openPauseMenu and closePauseMenu here when it loads.
const controls = { openPauseMenu: () => {}, closePauseMenu: () => {} };
export function setPauseMenuControls(c) { Object.assign(controls, c); }
export function openPauseMenu(...args) { return controls.openPauseMenu(...args); }
export function closePauseMenu(...args) { return controls.closePauseMenu(...args); }
