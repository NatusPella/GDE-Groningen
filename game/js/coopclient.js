// Samen spelen (#95): de spelerskant in het spel en de vaste personages, voor N spelers.
// Pure functies op een `world`-achtig object (testbaar zonder spel):
// - plek 0 (de host) speelt Tammo, plek 1 (de eerste gast) Tessa ('anita'), geen keuze en geen wissel;
//   plek 2 en hoger zijn eigen figuren (coopplayers.js), zonder hoofdrol in het verhaal;
// - op elke client staat het eigen lichaam in world.player (de camera volgt dat); Tammo staat in
//   world.companion (of, op de host, Tessa); alle andere spelers zijn figuren in world.coopFigures[slot];
// - een client toont de toestand van de host (posities, wanted) en stuurt alleen invoer; geld en spullen blijven eigen.
// Niet in een echt spel gezien: extra figuren hebben nog geen model in de wereld (zie #95).

import { knoppen, wapenNaam, leesAanval, avatarVan } from './coopspeler.js';
import { eigenVerhaalrol, andereVerhaalrol } from './cooproles.js';

// 'host' = plek 0, 'client' = plek 1 (zoals voor er meer spelers waren), een getal is de plek zelf
export const mySlotOf = (me) => (me === 'host' ? 0 : me === 'client' ? 1 : me | 0);

export function figures(world) { return world.coopFigures || (world.coopFigures = {}); }
export function ensureFigure(world, slot, char, avatar = null) {
  const f = figures(world);
  if (!f[slot]) {
    const av = avatarVan({ ...(char ? { char } : {}), ...(avatar && typeof avatar === 'object' ? avatar : {}) }, slot); // (#455) anderen zie je als hun online-avatar
    f[slot] = { slot, char: av.char, naam: av.naam, kleur: av.kleur, avatar: av, x: 0, y: 0, angle: 0, vx: 0, vy: 0, input: null };
  }
  return f[slot];
}
export function removeFigure(world, slot) { if (world.coopFigures) delete world.coopFigures[slot]; }

// Welk lichaam hoort bij welke plek, gezien vanaf plek `me`?
export function bodyFor(world, me, slot) {
  const mine = mySlotOf(me);
  if (slot === mine) return world.player;
  if (mine === 0 && slot === 1) return world.companion;      // host: Tessa is zijn metgezel
  if (mine >= 1 && slot === 0) return world.companion;       // gasten: Tammo is hun metgezel
  return figures(world)[slot] || null;                       // alle anderen: figuren
}

// Zet de lichamen op hun eigen verhaalrol (#455): de rol hoort bij de speler, niet
// bij de plek, dus plek 0 en 1 hebben geen vaste Tammo/Tessa meer. De tweede
// verhaalrol is lokaal de metgezel. Extra spelers houden een eigen online-avatar.
// story.js kijkt naar world.coop.fixedChars om de verhaalwissel niet te dubbelen.
export function setFixedCharacters(world, me, char = null) {
  const mine = mySlotOf(me);
  const eigen = world.player;
  const rol = eigenVerhaalrol(eigen);
  if (eigen) eigen.character = rol;
  if (world.companion) world.companion.character = andereVerhaalrol(rol);
  if (eigen) eigen.coopChar = avatarVan({ ...(char ? { char } : {}), slot: mine }, mine).char;
  if (world.coop) world.coop.fixedChars = true;
}

// Toestand van de host op deze wereld zetten. sample = net/session.js ClientSession.world(); roster = lijst met spelers.
export function applyHostState(world, me, sample, roster = null, dt = 0) {
  if (!sample) return 0;
  let n = 0;
  const eigen = world.player;
  const zitters = []; world.coopZitters = zitters; // wie in een voertuig zit, voor coopzitten3d.js (#434)
  for (const p of sample.players) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    let b = bodyFor(world, me, p.slot);
    const r = roster && roster.find((x) => x.slot === p.slot);
    if (!b) { b = ensureFigure(world, p.slot, r && r.char, r && r.avatar); }
    // (#455) de online-avatar uit de spelerslijst blijft kloppen, ook als hij pas later binnenkwam
    else if (r && r.avatar && figures(world)[p.slot] === b) { b.avatar = { ...(b.avatar || {}), ...r.avatar }; const av = avatarVan(b, p.slot); b.naam = av.naam; b.kleur = av.kleur; }
    // snelheid uit de verplaatsing, zodat het model loopt (de gast simuleert zelf niets)
    const vx = dt > 0 && Number.isFinite(b.x) ? (p.x - b.x) / dt : 0, vy = dt > 0 && Number.isFinite(b.y) ? (p.y - b.y) / dt : 0;
    const ok = Math.hypot(vx, vy) < 40; // een sprong (teleport) is geen rennen
    b.x = p.x; b.y = p.y; b.angle = p.angle;
    if (b !== eigen) b.coopVoertuig = !!p.inVeh; // wie in een voertuig zit, tekenen we niet los: coopzitten3d.js zet hem op zijn stoel in het voertuig (#372, #434)
    b.z = !p.inVeh && Number.isFinite(p.z) ? p.z : 0; b.crouching = !!p.crouch && !p.inVeh; // springen en bukken (#434)
    if (b !== eigen) { // wat de gastheer van JOUW lichaam weet is niet leidend voor je eigen scherm; een ander lichaam wel (#369)
      if (Number.isFinite(p.health)) b.health = Math.max(0, Math.min(255, Math.round(p.health)));
      const neer = !!p.down;
      if (neer && !b.coopDown) b.coopVal = world.time || 0; // net neer: vanaf hier achterover vallen en blijven liggen (zoals coopextra3d.js bij een voetganger)
      b.coopDown = neer;
    }
    if (!p.inVeh && p.vehicle == null) { // wapen en aanval van de gastheer, voor de aanvalshoudingen van het model
      b.coopWapen = wapenNaam(p.weapon | 0);
      const a = leesAanval(p.attack);
      if (a && (!b.coopAanvalActief || b.coopAanvalTeken !== a.teken)) b.coopFx = { type: a.type, swing: a.swing, start: world.time || 0 };
      b.coopAanvalActief = !!a; b.coopAanvalTeken = a ? a.teken : false;
    }
    if (p.inVeh && p.vehicle != null) zitters.push({ slot: p.slot, char: b.char || b.character || 'tammo', voertuig: p.vehicle, stoel: p.seat | 0, bestuurder: !!p.driver });
    if (b.vx !== undefined) { b.vx = ok ? vx : 0; b.vy = ok ? vy : 0; }
    n++;
  }
  // alleen wanted is gedeeld; het geld, de spullen en de prestaties van de gast blijven zijn eigen
  if (sample.shared) world.wanted = sample.shared.wanted;
  return n;
}

// Invoer van de gast: schermrichting (axis x rechts, y omlaag) en de eigen camerahoek,
// zodat de host de richting in wereldruimte kan bepalen (coopglue.js).
// run: rennen (bit 0); handrem: Spatie (bit 1, voor wie het stuur heeft, #291)
export function makeClientInput(axis, run, camYaw, handrem = false, springen = false, bukken = false, aanval = false, zicht = false) {
  const [x, y] = axis || [0, 0];
  return { mx: x, my: y, buttons: knoppen({ rennen: run, handrem, springen: springen && !handrem, bukken, aanval, zicht }), yaw: Number.isFinite(camYaw) ? camYaw : 0 };
}
