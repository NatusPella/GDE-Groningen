// De geluiden van kleding (epic Kleding, ronde 4): kleding ritselt bij aan- en uittrekken, een rits bij een jas, het gordijn van het
// pashokje. Lokaal: elke speler hoort alleen zijn eigen kleren (geen netwerkbericht, geen beloning, geen voortgang).
// De opnames horen bij de SFX-map (sfx/sfxmap.js: clothes_rustle, zipper_pull, curtain_pull). Zodra die map in deze tak zit, is dit
// een dunne laag om sfxEvent(world, key, x, y); tot dan zet dit dezelfde audio-gebeurtenis in de rij (kind 'fx', zoals sfx/haken.js) en
// blijft het stil als de opname niet geladen is. Een fout hier raakt het spel nooit. Leaf (alleen players.js); test: clothing_test.mjs.
import { hoofdspeler } from './players.js';

export const CLOTHING_SFX = ['clothes_rustle', 'zipper_pull', 'curtain_pull'];
const MAX_QUEUE = 64;

// Het geluid dat bij het aantrekken van een stuk hoort: een jas gaat dicht (rits), de rest ritselt.
export const soundForSlot = (slot) => (slot === 'outer' ? 'zipper_pull' : 'clothes_rustle');

// true = in de rij gezet. Zonder x en y klinkt het op de plek van de eigen speler.
export function clothingSfx(world, key, x, y) {
  try {
    if (!world || !CLOTHING_SFX.includes(key)) return false;
    let px = x, py = y;
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      const p = hoofdspeler(world);
      const l = p && (p.inVehicle || p);
      if (!l || !Number.isFinite(l.x) || !Number.isFinite(l.y)) return false;
      px = l.x; py = l.y;
    }
    const q = world.audioEvents || (world.audioEvents = []);
    if (q.length >= MAX_QUEUE) return false;
    q.push({ kind: 'fx', name: key, x: px, y: py });
    return true;
  } catch (e) { return false; }
}
