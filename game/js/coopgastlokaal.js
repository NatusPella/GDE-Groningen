// Samen spelen (#291): wat een gast zelf op zijn eigen scherm doet terwijl de wereld van de host via het net binnenkomt.
// updateGameplay (main.js) draait voor een gast de wereld niet; alleen deze interacties lopen lokaal, met zijn eigen geld
// en spullen (winkels voor spullen voor jezelf, de muurkroket, horeca; docs/COOP-GAST.md). Wat hier niet door E wordt
// opgepakt, gaat als "gebruik" naar de host: in- of uitstappen als bijrijder.
import { tryShopInteract } from './shops.js';
import { tryMachineInteract } from './snackautomaat.js';
import { tryHorecaInteract } from './horeca.js';
import { gastGebruik } from './coopnet.js';
import { isShopOpen } from './shopui.js';

export function updateGastLokaal(world) {
  const input = world.input;
  if (!input || world.paused || isShopOpen()) return false;
  const e = input.wasPressed('e') || input.wasPressed('f');
  if (!e) { tryShopInteract(world); return false; } // R: lak en tuning (een melding)
  if (tryShopInteract(world) || tryMachineInteract(world) || tryHorecaInteract(world)) return true;
  input.consume('e');
  input.consume('f');
  return gastGebruik(world);
}
