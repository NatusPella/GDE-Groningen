// Samen spelen (#291): wat een gast zelf op zijn eigen scherm doet terwijl de wereld van de host via het net binnenkomt.
// updateGameplay (main.js) draait voor een gast de wereld niet; alleen deze interacties lopen lokaal, met zijn eigen geld
// en spullen (winkels voor spullen voor jezelf, de muurkroket, horeca) en een paar losse activiteiten (hengelen, pannenkoeken
// bakken, de beiaard; GAST_ACTIVITEITEN in coopgast.js, #429; docs/COOP-GAST.md). Wat hier niet door E wordt opgepakt, gaat als
// "gebruik" naar de host: in- of uitstappen als bijrijder.
import { tryShopInteract } from './shops.js';
import { tryMachineInteract } from './snackautomaat.js';
import { tryHorecaInteract } from './horeca.js';
import { gastGebruik, gastBus } from './coopnet.js';
import { isShopOpen } from './shopui.js';
import { gastKijkHoek, bezigEvent } from './coopgast.js';
import { gastWapenTik } from './coopwapen.js';
import { openerNaam } from './coopplayers.js';
import { updateActivitiesGast, tryActivityInteractGast } from './activities.js';
import { getSettings } from './settings.js';
import { wedGastTik } from './coopwedstrijd.js';

// meld de host (alleen bij een wisseling) dat deze gast een activiteit speelt: hij staat dan stil. Een host zonder dit bericht negeert het.
function meldBezig(world, id) {
  const nu = id || null;
  if ((world.coopBezig || null) === nu) return;
  world.coopBezig = nu;
  const n = world.coopNet;
  try { if (n && n.role === 'client' && n.session && n.session.sendEvent) n.session.sendEvent(bezigEvent(nu)); } catch (e) { /* de verbinding is er even niet */ }
}

export function updateGastLokaal(world, dt = 1 / 60) {
  const input = world.input;
  if (world.coopWedstrijd && wedGastTik(world, dt)) return true; // een race tegen de anderen op zijn eigen scherm (#443): de invoer is van de kart
  if (!input || world.paused || isShopOpen()) { world.coopAanvalKnop = false; world.coopZichtKnop = false; world.scoped = false; return false; } // geen aanval vanuit een menu of winkel
  const n0 = world.coopNet;
  gastWapenTik(world, dt, (ev) => { try { if (n0 && n0.role === 'client' && n0.session && n0.session.sendEvent) n0.session.sendEvent(ev); } catch (e) { /* de verbinding is er even niet */ } }); // je wapen en je aanvalsknop (#434)
  // de muis draait de camera (player.js doet dat niet voor een gast, #388); niet tijdens een filmpje met een eigen camera
  if (input.lookActive && input.lookActive() && !world.cameraOverride && input.mouse) world.camYaw = gastKijkHoek(world.camYaw ?? (world.player && world.player.angle), input.mouse.dx, getSettings().mouseSensitivity * (world.scoped ? 0.3 : 1));
  if (input.wasPressed('o') && world.coopHostMissie && world.coopHostMissie.actief) world.addMessage(`${openerNaam(world.coopRoster, true)} bepaalt of de verhaalstap wordt overgeslagen.`, 3); // een verhaalstap overslaan kan alleen wie het spel opende (#434)
  if (input.wasPressed('o') && world.coopInVoertuig && !(world.coopHostMissie && world.coopHostMissie.actief)) { input.consume('o'); gastBus(world, 'deur'); } // de deuren van de bus: alleen het hulpje of de chauffeur (coopbus.js, #444)
  const bezig = updateActivitiesGast(dt, world); // hengelen, pannenkoeken bakken, de beiaard: op je eigen scherm (#429)
  meldBezig(world, bezig);
  if (bezig) return true;
  const e = input.wasPressed('e') || input.wasPressed('f');
  if (!e) { tryShopInteract(world); return false; } // R: lak en tuning (een melding)
  if (tryShopInteract(world) || tryMachineInteract(world) || tryHorecaInteract(world)) return true;
  if (tryActivityInteractGast(world)) { input.consume('e'); input.consume('f'); return true; } // een lokale activiteit start; de andere geven een melding
  input.consume('e');
  input.consume('f');
  return gastGebruik(world);
}
