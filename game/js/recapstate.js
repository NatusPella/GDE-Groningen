// The state of the recap card ("Waar waren we?", recapcardrun.js) as a light leaf, so phone.js (the world pause) and
// the pause menu can ask whether the card is open without importing the whole card layer.
let open = false;
export const isRecapOpen = () => open;
export function markRecapOpen(v) { open = !!v; }
