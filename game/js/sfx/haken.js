// SFX ronde 4 (#988): de kleine haken van de missie-polish. Een spelmodule zegt "hier hoort dit geluid" en dit bestand
// maakt er een audio-gebeurtenis (wereldplek) of een UI-geluid van. De opnames staan in samples.js (FX_VERVANG en
// FX_OPNAME_ALLEEN); is er geen opname geladen, dan blijft het stil, en een fout in een haak raakt het spel nooit.
// Lokaal: elke speler hoort het van zijn eigen scherm (geen netwerkbericht, geen beloning, geen voortgang).
// Leaf: alleen latehooks.js en players.js, dus geen importcyclus. Test: scripts/sfx_haken_test.mjs.
import { sfxLinks } from '../latehooks.js';
import { hoofdspeler } from '../players.js';
import { SFX_MAP, remoteAllowed, newRemoteState } from './sfxmap.js';

const MAX_RIJ = 64;

// Een geluid op een plek (zonder x en y: op de plek van de eigen speler). true = in de rij gezet.
export function haakFx(world, naam, x, y, extra = {}) {
  try {
    if (!world || !naam) return false;
    let px = x, py = y;
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      const p = hoofdspeler(world);
      const l = p && (p.inVehicle || p);
      if (!l || !Number.isFinite(l.x) || !Number.isFinite(l.y)) return false;
      px = l.x; py = l.y;
    }
    const q = world.audioEvents || (world.audioEvents = []);
    if (q.length >= MAX_RIJ) return false;
    q.push({ ...extra, kind: 'fx', name: naam, x: px, y: py });
    return true;
  } catch (e) { return false; }
}

// Een klank van de UI-bus (geen plek): kaartje, sms, hover. true = door sfx/ui.js opgepakt.
export function haakUi(naam) {
  try { return !!(naam && sfxLinks.uiFx(naam)); } catch (e) { return false; }
}

// SFX round 5 (21-11): the one coupling function for the central sound map (sfx/sfxmap.js). A feature calls
//   sfxEvent(world, 'shop_buy_coins', x, y)                       a sound of this player (the own screen)
//   sfxEvent(world, 'football_kick', x, y, { from: 'p2', d: 31 }) a sound of ANOTHER player at distance d metres
// and the map decides: bus 'ui' goes to the UI bus (no place), 'sfx' and 'ambient' become an audio event at the place (x, y; none = the
// player). A sound of another player is only let through for 'world' events, within 60% of their range and sparingly (remoteAllowed);
// a 'local' event of someone else is never heard here. The machine that produced an event plays it itself, so there is no double play
// of host and guest: the caller passes 'from' only for what it RECEIVED, never for what it simulated. Returns true when queued.
const remoteState = newRemoteState();
export function sfxEvent(world, key, x, y, opts = {}) {
  try {
    const e = SFX_MAP[key];
    if (!e || !world) return false;
    if (opts.from !== undefined && opts.from !== null) {
      const now = Number.isFinite(opts.now) ? opts.now : Date.now() / 1000;
      if (!remoteAllowed(remoteState, key, Number(opts.d), now)) return false;
    }
    if (e.bus === 'ui') return haakUi(key);
    return haakFx(world, key, x, y, opts.gain ? { gain: opts.gain } : {});
  } catch (err) { return false; }
}
export function resetRemoteState() { remoteState.last.clear(); remoteState.window.length = 0; }
