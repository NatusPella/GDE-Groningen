// Dunne koppeling tussen coop.js (pure logica) en het spel (#95). Alleen
// actief na bindCoop(), dus alleen met ?coop; zonder blijft world.coop leeg.
import { readP2, remoteP2, stepSlot2, assignDevices, leash } from './coop.js';
import { activePadIndex } from './gamepad.js';
import { stapSprong, BUK_TEMPO } from './coopspeler.js';
import { getMissionList, getMissionDefs } from './missionquery.js';
import { lichaamVan } from './coopbestuur.js';
import { hoofdspeler } from './spelersregister.js';
import { verzoekBlok, leesVerzoek, verzoekEvent, startReden, beginVerzoek, opdrachtId, GROEP_RADIUS, MISSIE_TEKST, gastheerVraag } from './coopmissie.js';
import { beginGast as meedoenGast } from './coopmeedoen.js';
import { stapVanMissie } from './coopverhaal.js';

export function bindCoop(world, input) {
  world.coop = { input, devices: null };
}

function snapshot(coop) {
  const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
  const idx = [];
  for (const p of pads) if (p && p.connected) idx.push(p.index);
  const p1 = activePadIndex();
  coop.devices = assignDevices(idx, p1 >= 0 ? p1 : null);
  const d = coop.devices.p2;
  const pad = d.kind === 'pad' ? pads[d.pad] : null;
  return {
    isDown: (k) => coop.input.isDown(k),
    padAxes: pad ? pad.axes : null,
    padRun: !!(pad && pad.buttons[0] && pad.buttons[0].pressed),
  };
}

// Speler 2 stuurt de metgezel; beweging is camerarelatief zoals bij speler 1.
export function coopStep(c, dt, world, move) {
  if (!world.coop) return false;
  if (!world.coop.remote && world.coop.local === false) return false; // een sessie loopt, maar de gast is er (nog) niet: de volg-AI
  if ((c.coopWacht || c.coopWedstrijd) && world.coop.remote) { c.vx = 0; c.vy = 0; c.crouching = false; return true; } // de wereld rond haar wordt nog geladen (coopnet.js bandMetgezel, #429); coopWedstrijd: hij rijdt een race tegen de anderen (coopwedstrijd.js, #443)
  // online: de gast stuurt de metgezel via het net (net/session.js), anders het eigen toetsenbord of pad
  const inp = world.coop.remote ? remoteP2(world.coop.remoteInput) : readP2(snapshot(world.coop));
  const yaw = (world.coop.remote ? (world.coop.remoteInput && world.coop.remoteInput.yaw) : world.camYaw) || 0, cs = Math.cos(yaw), sn = Math.sin(yaw);
  // springen en bukken van de gast (#434): knoppen in de invoer; een sprong zet c.z, bukken vertraagt en zet c.crouching
  const sp = world.coop.remote ? stapSprong(c.sprong || (c.sprong = {}), world.coop.remoteInput && world.coop.remoteInput.buttons, dt) : null;
  if (sp && (sp.z > 0 || c.sprongActief)) { c.z = sp.z; c.sprongActief = sp.z > 0; }
  const buk = !!(sp && sp.bukt), k = buk ? BUK_TEMPO : 1;
  stepSlot2(c, { ...inp, run: inp.run && !buk, x: (cs * -inp.y - sn * inp.x) * k, y: (sn * -inp.y + cs * inp.x) * k }, dt, null);
  move(c, dt, world);
  const l = leash(world.player, c, world.coop.leash); // in een sessie Infinity (coopnet.js): daar doet het band het werk (#388)
  if (l.clamped) { c.x = l.x; c.y = l.y; }
  c.crouching = buk;
  c.pose = null;
  return true;
}

// ---- een gast start zelf een verhaalopdracht (#452)
// De gast staat bij het startpunt van zijn eigen volgende opdracht en drukt E: dat is een verzoek aan wie het spel opende. Die
// begint de opdracht (dezelfde poort, busy.js) en de andere gasten én de gastheer krijgen "Meedoen?"; de vrager doet zelf mee.
// De opdrachtstand per groep (coopmissie.js) blijft leidend: een groep die al loopt houdt zijn stap en doelen.
export const MISSIE_VRAAG_S = 2; // een tweede E binnen deze tijd doet niets (geen dubbel verzoek)

// De volgende opdracht van deze speler zelf (zijn eigen verhaal), of null.
function eigenMissie() {
  const m = getMissionList().find((x) => x.status === 'volgende');
  return m && m.start ? { index: m.index, label: m.label, start: m.start, needs: m.needs || null } : null;
}
const afstand = (p, s) => (p && s && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(s.x) && Number.isFinite(s.y) ? Math.hypot(p.x - s.x, p.y - s.y) : Infinity);

// E bij een gast: bij het startpunt van zijn eigen volgende opdracht vraagt hij die te starten. Geeft true als E hiervoor was.
export function missieGastE(world) {
  const n = world && world.coopNet;
  if (!n || n.role !== 'client' || !n.session || !n.session.sendEvent) return false;
  const m = eigenMissie();
  if (!m) return false;
  const p = hoofdspeler(world);
  if (!p || p.inVehicle) return false; // in een voertuig is E om uit te stappen, geen verzoek
  if (afstand(p, m.start) > GROEP_RADIUS) return false; // niet bij het startpunt: E is voor iets anders
  if (m.needs) { if (world.addMessage) world.addMessage(m.needs, 4); return true; } // je eigen verhaal vraagt eerst iets anders
  const nu = Number.isFinite(world.time) ? world.time : 0;
  if (Number.isFinite(world.coopMissieVraagT) && nu - world.coopMissieVraagT < MISSIE_VRAAG_S) return true;
  const blok = verzoekBlok(world); // dezelfde poort als de gastheer gebruikt
  if (blok) { if (world.addMessage) world.addMessage(blok, 3); return true; }
  world.coopMissieVraagT = nu;
  n.session.sendEvent(verzoekEvent(m.index, m.label));
  if (world.addMessage) world.addMessage(MISSIE_TEKST.vraagt(m.label), 4);
  return true;
}

// Een verzoek van een gast bij wie het spel opende: controleren, beginnen en de anderen uitnodigen. Geeft true als het lukte.
export function missieGastVerzoek(world, body, van) {
  const n = world && world.coopNet;
  const v = leesVerzoek(body);
  if (!n || n.role !== 'host' || !n.hub || !v || !(van >= 1)) return false;
  const meld = (t) => { if (world.coopMeld) world.coopMeld(van, t); };
  const blok = verzoekBlok(world);
  if (blok) { meld(blok); return false; }
  const def = getMissionDefs()[v.i];
  const reden = startReden({ verzoek: v, def, lichaam: lichaamVan(world, van) });
  if (reden) { meld(reden); return false; }
  if (typeof world.coopMissieStart !== 'function' || !world.coopMissieStart(v.i)) { meld(MISSIE_TEKST.onbekend); return false; }
  // De opdracht loopt nu in deze wereld: de vrager is de deelnemer die hem begon, de andere gasten én de gastheer krijgen de gewone
  // vraag. De gastheer is ook een speler (#452): zegt hij nee, dan kijkt hij toe zonder beloning of verhaalstap.
  const label = String(def.label || '').slice(0, 80);
  const id = opdrachtId({ phase: 'active', index: v.i, label: def.label });
  const gasten = n.hub.roster.spelers.filter((s) => s.slot >= 1 && s.slot !== van && s.verbinding !== 'lost').map((s) => s.slot);
  const stap = stapVanMissie(v.i);
  // De groep van deze opdracht begint met de vrager erin; een groep die al liep, houdt zijn stand (coopmissie.js).
  if (world.coopGroepen) beginVerzoek(world.coopGroepen, { index: v.i, label: def.label, stap: '', lateInstap: true }, van, Number.isFinite(world.time) ? world.time : 0);
  const uit = meedoenGast(n.meedoen, id, [...gasten, 0], world.coopStapRegel ? world.coopStapRegel() : null, stap, van);
  n.hub.announce({ k: 'meedoen', label, verplicht: true, start: true, stap, id }, van); // de vrager doet mee en ziet dat de opdracht loopt
  for (const u of uit) {
    if (u.slot === 0) { gastheerVraag(world, id, label); continue; } // de gastheer antwoordt lokaal (coopmissie.js gastheerVraagTik)
    n.hub.announce({ k: 'meedoen', label, verplicht: u.verplicht, sec: u.sec, stap, id }, u.slot);
  }
  const rij = n.hub.roster.spelers.find((s) => s.slot === van);
  if (world.addMessage) world.addMessage(MISSIE_TEKST.hostStart((rij && rij.naam) || 'De ander', label), 5);
  meld(MISSIE_TEKST.gestart(label));
  return true;
}
