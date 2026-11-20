// SFX ronde 4 (#988): de kleine haken van de missie-polish. Een spelmodule zegt "hier hoort dit geluid" en dit bestand
// maakt er een audio-gebeurtenis (wereldplek) of een UI-geluid van. De opnames staan in samples.js (FX_VERVANG en
// FX_OPNAME_ALLEEN); is er geen opname geladen, dan blijft het stil, en een fout in een haak raakt het spel nooit.
// Lokaal: elke speler hoort het van zijn eigen scherm (geen netwerkbericht, geen beloning, geen voortgang).
// Leaf: alleen latehooks.js en players.js, dus geen importcyclus. Test: scripts/sfx_haken_test.mjs.
import { sfxLinks } from '../latehooks.js';
import { hoofdspeler } from '../players.js';

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
