// The Steam Deck profile (#64): a 1280x800 handheld played with the controller
// or the touchscreen, no keyboard. Steam sets SteamDeck=1 for a game on the
// Deck; desktop/preload.js passes it on as gdeDesktop.isSteamDeck. Pure: what
// the first start looks like there. A player's own settings always win
// (settings.js lays them over these defaults).

// larger map and card text (a small screen held at arm's length), controller
// glyphs in every hint, and the Deck's own button layout until a pad says otherwise
export const DECK_DEFAULTS = { textSize: 'groot', hintSource: 'pad', padLayout: 'deck', touchControls: 'auto' };

export function isSteamDeck(desktop = typeof window !== 'undefined' ? window.gdeDesktop : null, env = {}) {
  return !!(desktop && desktop.isSteamDeck) || env.SteamDeck === '1';
}

// the settings defaults for this machine
export function deckDefaults(deck) {
  return deck ? { ...DECK_DEFAULTS } : {};
}

// the 16:10 screen of the Deck (or one like it): the HUD keeps the full-size layout (uiscale.js never
// goes below 1) and the title-safe edge is the same as for any 16:10 window
export function isDeckShape(width, height) {
  return Math.abs(width / height - 1.6) < 0.02 && width <= 1400;
}
