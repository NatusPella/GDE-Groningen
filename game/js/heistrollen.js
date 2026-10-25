import { hoofdspeler } from './spelersregister.js';
// Een heist samen (#438): iedereen een eigen rol, of tegen elkaar om de buit.
// Puur: geen three.js, geen wereld, geen netwerk. De verhaalheist (heist.js) laat de
// rollen op de bouwtekening zien; de coöp-opdracht Kluisklus (coopactivities.js) gebruikt
// dezelfde rollen en de verdeling van de buit. Wat een gast zelf doet, gaat via de
// netlaag (coopnet.js); dit bestand rekent alleen wie welke rol heeft en wie wat krijgt.
// Nederlands, verzonnen namen, geen geweld (constitution 6).
// Tests: scripts/heistrollen_test.mjs.

// De rollen in de volgorde waarin ze verdeeld worden. Elke rol hoort bij een paar
// stappen van de heist: wie de rol heeft, doet die stap (of kijkt mee als die er niet is).
export const ROLLEN = ['uitkijk', 'loper', 'kluis', 'schipper'];

export const ROL = {
  uitkijk: { naam: 'Uitkijk', taak: 'Houdt de bewakers en de camera\'s in de gaten.', fasen: ['plan', 'watch', 'post', 'shot'] },
  loper: { naam: 'Loper', taak: 'Rolt het pasje en opent de deuren.', fasen: ['lock', 'pickpocket'] },
  kluis: { naam: 'Kluisspecialist', taak: 'Zet de stroom af en kraakt de vitrine.', fasen: ['fuse', 'laser', 'crack'] },
  schipper: { naam: 'Schipper', taak: 'Houdt de boot klaar voor de vlucht.', fasen: ['getaway'] },
};

export const isRol = (id) => ROLLEN.includes(id);
export const rolVanFase = (fase) => ROLLEN.find((r) => ROL[r].fasen.includes(fase)) || null;

// De rolverdeling: rol na rol bij een speler, in een rondje. Zo heeft iedereen minstens
// één rol en is elke rol bezet; met één speler doet die alle vier.
export function rollenVoor(spelers = []) {
  const slots = [...new Set((spelers || []).filter((s) => Number.isInteger(s) && s >= 0))].sort((a, b) => a - b);
  if (!slots.length) return [];
  return ROLLEN.map((rol, i) => ({ rol, slot: slots[i % slots.length] }));
}

// Per speler zijn rollen, in de volgorde van ROLLEN.
export function rollenPerSpeler(spelers = []) {
  const uit = [];
  for (const { rol, slot } of rollenVoor(spelers)) {
    let rij = uit.find((x) => x.slot === slot);
    if (!rij) { rij = { slot, rollen: [] }; uit.push(rij); }
    rij.rollen.push(rol);
  }
  return uit.sort((a, b) => a.slot - b.slot);
}

// Wie doet deze stap? De speler met de rol van de stap, of null als niemand die rol heeft.
export function wieDoet(verdeling, fase) {
  const rol = rolVanFase(fase);
  if (!rol) return null;
  const rij = (verdeling || []).find((x) => x.rol === rol);
  return rij ? rij.slot : null;
}

// De rolnaam zoals hij in een zin staat ("Tammo is de uitkijk en de loper.").
export const rolNaam = (rol) => (ROL[rol] ? ROL[rol].naam.toLowerCase() : 'helper');
export const rolZin = (naam, rollen) => `${naam} is de ${(rollen || []).filter(isRol).map(rolNaam).join(' en de ')}.`;

// De regel onder de bouwtekening: één zin per speler. Zonder namen blijft het bij de rol.
export function samenRegels(rijen = []) {
  return (rijen || [])
    .filter((r) => r && Array.isArray(r.rollen) && r.rollen.length)
    .map((r) => rolZin(r.naam || `Speler ${(r.slot | 0) + 1}`, r.rollen));
}

// De buit: samen delen, of ieder voor zich (tegen elkaar). `punten` is wat elke speler
// bij elkaar sprokkelde. Geeft per plek het bedrag en wie er won (bij tegen elkaar).
export function buitVerdelen(modus, spelers = [], punten = {}, buit = 0) {
  const slots = [...new Set((spelers || []).filter((s) => Number.isInteger(s) && s >= 0))].sort((a, b) => a - b);
  const totaal = Math.max(0, Math.round(Number(buit) || 0));
  const geld = {};
  for (const s of slots) geld[s] = 0;
  if (!slots.length || !totaal) return { geld, winnaar: null, modus: modus === 'tegen' ? 'tegen' : 'samen' };
  const score = Object.fromEntries(slots.map((s) => [s, Math.max(0, Math.round(Number(punten && punten[s]) || 0))]));
  const som = slots.reduce((a, s) => a + score[s], 0);
  if (modus === 'tegen') {
    // Ieder houdt wat hij zelf bij elkaar sprokkelde; de rest gaat naar de grootste buit.
    let rest = totaal;
    for (const s of slots) { geld[s] = som ? Math.floor((totaal * score[s]) / som) : Math.floor(totaal / slots.length); rest -= geld[s]; }
    const winnaar = slots.slice().sort((a, b) => score[b] - score[a] || a - b)[0];
    geld[winnaar] += Math.max(0, rest);
    return { geld, winnaar, modus: 'tegen' };
  }
  // Samen: gelijk delen, de rest naar wie het meest deed (bij gelijke stand de eerste plek).
  const deel = Math.floor(totaal / slots.length);
  for (const s of slots) geld[s] = deel;
  const rest = totaal - deel * slots.length;
  if (rest) geld[slots.slice().sort((a, b) => score[b] - score[a] || a - b)[0]] += rest;
  return { geld, winnaar: null, modus: 'samen' };
}

// ---- de rolstap in Samen spelen (#438) ------------------------------------------------------
// Elke speler doet zijn eigen stuk van de inbraak (E bij de plek), de gastheer controleert: hij kent de
// stap, de rolverdeling en de plek van elk lichaam, en pas als de rolhouder het vraagt gaat de stap
// verder. De voortgang gaat met de bestaande berichten (de 'trek' van E en de 'melding' terug; de
// stap van de opdracht gaat als 'missie' mee). Geen nieuw protocolformaat (#438).
// Deze regels zijn puur: geen three.js, geen wereld, geen netwerk; de gastheer levert alleen de
// stap, de lichamen en de plek aan. Test: scripts/heistrollen_test.mjs.

// De stappen met een eigen rol (de rolstappen van de inbraak). Een stap die hier niet in staat
// (goto, scene, shot, getaway) is van de groep: die doet iedereen samen.
export const ROLSTAP = { fuse: 'kluis', laser: 'kluis', crack: 'kluis', lock: 'loper', pickpocket: 'loper' };
export const STAPPLEK = { fuse: 'de stroomkast', laser: 'de lasers in zaal 3', crack: 'de vitrine', lock: 'de achterdeur', pickpocket: 'de bewaker bij de glazen deur' };
export const STAPTEKST = {
  fuse: 'zet de stroom af bij de kast (druk op E).',
  laser: 'ga door de lasers (druk op E bij de vitrine).',
  crack: 'draai de kluis open: A en D draaien, Spatie zet vast.',
  lock: 'peuter de achterdeur open (druk op E bij de deur).',
  pickpocket: 'rol het pasje (druk op E achter de bewaker).',
};
export const STAPKLAAR = {
  fuse: 'De camera\'s staan op herhaling.',
  laser: 'Je bent door de lasers heen.',
  crack: 'De vitrine staat open.',
  lock: 'De achterdeur is open.',
  pickpocket: 'Je hebt het pasje.',
};
export const ROLBEREIK = 3.5; // m: zover van de plek mag de rolhouder staan bij zijn E
export const isRolstap = (fase) => Object.prototype.hasOwnProperty.call(ROLSTAP, fase);

// De plekken die meedoen: de gastheer (0) en de verbonden gasten uit de spelerslijst. Een plek die
// de sessie heeft verlaten telt niet mee, zodat niemand op een weggevallen speler wacht.
export function slotsVan(world) {
  const uit = [0];
  for (const r of (world && world.coopRoster) || []) {
    if (!r || !Number.isInteger(r.slot) || r.slot < 0) continue;
    if (r.verbinding === 'lost') continue;
    uit.push(r.slot);
  }
  for (const r of (world && Array.isArray(world.players) ? world.players : []) || []) if (r && Number.isInteger(r.slot)) uit.push(r.slot);
  return [...new Set(uit)].sort((a, b) => a - b);
}

// De plekken die aan deze opdracht meedoen: zonder deelnemerslijst alle verbonden plekken, met lijst alleen wie
// meespeelt. Een toeschouwer (nee gezegd bij Meedoen?) krijgt dus geen rol (#438).
export function rolSlots(world, deelnemersLijst = null) {
  const slots = slotsVan(world);
  if (!Array.isArray(deelnemersLijst) || !deelnemersLijst.length) return slots;
  const mee = new Set(deelnemersLijst);
  return slots.filter((s) => mee.has(s));
}

// De rolverdeling van deze sessie; met één speler is er niets te verdelen (die doet alle rollen zelf).
export const verdelingVoor = (slots) => (Array.isArray(slots) && new Set(slots).size >= 2 ? rollenVoor(slots) : []);

// Wie houdt deze stap? { slot, rol } of null als er geen verdeling is.
export function houderVan(verdeling, fase) {
  if (!isRolstap(fase) || !Array.isArray(verdeling) || !verdeling.length) return null;
  const slot = wieDoet(verdeling, fase);
  return Number.isInteger(slot) ? { slot, rol: ROLSTAP[fase] } : null;
}

// Het lichaam van een plek in deze wereld (de gastheer is world.player, een gast een figuur of de
// metgezel). Onbekend: null.
export function lichaamVan(world, slot) {
  const reg = world && Array.isArray(world.players) ? world.players : null;
  if (reg) { const r = reg.find((x) => x && x.slot === slot); if (r && r.entiteit) return r.entiteit; }
  if (!world) return null;
  if (slot === 0) return hoofdspeler(world) || null;
  if (slot === 1) return world.companion || null;
  return null;
}

// De stand van de rolstap van deze wereld: welke stap, is hij klaar, en wie vroeg hem.
export function maakRolstand() { return { fase: null, klaar: false, vraag: null, gemeld: null }; }
export function rolStand(world) {
  if (!world) return maakRolstand();
  return world.coopHeistRol || (world.coopHeistRol = maakRolstand());
}
export function beginRolstap(world, fase) {
  const st = rolStand(world);
  st.fase = fase; st.klaar = false; st.vraag = null; st.gemeld = null;
  return st;
}
export function rolKlaar(world) {
  const st = rolStand(world);
  st.klaar = true; st.vraag = null;
  return st;
}

// De E van een speler bij een rolstap (de gastheer controleert). Geeft { ok, klaar, rol, houder,
// tekst }: ok = deze E hoort bij de rolstap, klaar = de stap is al gedaan, tekst = wat de speler leest.
export function rolClaim(stand, { verdeling, fase, slot, lichaam, doel, bereik = ROLBEREIK } = {}) {
  const houder = houderVan(verdeling, fase);
  if (!houder || !stand) return null;
  const rol = houder.rol;
  if (stand.fase !== fase) { stand.fase = fase; stand.klaar = false; stand.vraag = null; }
  if (stand.klaar) return { ok: true, klaar: true, rol, houder, tekst: 'Dit stuk is al gedaan.' };
  if (slot !== houder.slot) return { ok: false, klaar: false, rol, houder, tekst: `Dat stuk is voor de ${rolNaam(rol)}.` };
  if (!lichaam || !doel || !Number.isFinite(lichaam.x) || !Number.isFinite(lichaam.y) || !Number.isFinite(doel.x) || !Number.isFinite(doel.y)) {
    return { ok: false, klaar: false, rol, houder, tekst: `Ga bij ${STAPPLEK[fase]} staan.` };
  }
  if (Math.hypot(lichaam.x - doel.x, lichaam.y - doel.y) > bereik) return { ok: false, klaar: false, rol, houder, tekst: `Ga bij ${STAPPLEK[fase]} staan.` };
  stand.vraag = slot;
  return { ok: true, klaar: false, rol, houder, tekst: `Jij bent de ${rolNaam(rol)}: ${STAPTEKST[fase]}` };
}

// Wat deze speler van zijn rol te horen krijgt als de stap begint (de gastheer stuurt dit als
// 'melding'): de houder krijgt zijn taak, de anderen horen wie het doet.
export function rolRegel(fase, houder, mijnSlot, naam = 'De ander') {
  if (!houder || !isRolstap(fase)) return '';
  if (mijnSlot === houder.slot) return `Jij bent de ${rolNaam(houder.rol)}: ${STAPTEKST[fase]}`.slice(0, 90);
  return `${naam} is de ${rolNaam(houder.rol)}: die doet dit stuk.`.slice(0, 90);
}

// De poort voor de stap (de gastheer, elke frame): 'klaar' als de rolhouder zijn stuk deed,
// 'wacht' zolang hij het nog moet doen, of null als de gastheer zelf de rol heeft (dan speelt hij
// de stap gewoon, zoals alleen). De rolhouder vroeg het met zijn E (rolClaim).
export function rolGate(world, stap, verdeling) {
  if (!stap || !isRolstap(stap.kind)) return null;
  const houder = houderVan(verdeling, stap.kind);
  if (!houder || houder.slot === 0) return null;
  const stand = rolStand(world);
  if (stand.fase !== stap.kind) beginRolstap(world, stap.kind);
  if (stand.klaar) return 'klaar';
  if (stand.vraag != null) { rolKlaar(world); return 'klaar'; }
  return 'wacht';
}

// De E van een speler bij een rolstap (de gastheer controleert). Het antwoord gaat terug met het
// bestaande 'melding'-bericht (world.coopMeld) of, op de eigen machine, in beeld. Geeft true als deze
// E bij de rolstap hoorde, zodat hij niet ook iemand uit een voertuig trekt of een winkel opent.
export function heistRolGebruik(world, slot, stap) {
  if (!world || !stap || !isRolstap(stap.kind)) return false;
  const verdeling = verdelingVoor(slotsVan(world));
  if (!houderVan(verdeling, stap.kind)) return false;
  const lichaam = lichaamVan(world, slot);
  if (!lichaam || lichaam.inVehicle || lichaam.inVeh) return false; // in een voertuig is E om uit te stappen
  const doel = world.mission && world.mission.marker;
  const r = rolClaim(rolStand(world), { verdeling, fase: stap.kind, slot, lichaam, doel });
  if (!r) return false;
  if (r.tekst) {
    if (world.coopMeld) world.coopMeld(slot, r.tekst.slice(0, 90));
    else if (world.addMessage) world.addMessage(r.tekst, 3.5);
  }
  return true;
}

// ---- de kluis: dezelfde draaischijf voor de gastheer en voor een gast die hem zelf draait ------
export const KLUISCODE = [19, 5, 3];
export const KLOKSCHIJF = 40;
export function maakDraai(code = KLUISCODE) {
  return { v: 0, cur: 0, code: [...code], t: 0, dirT: 0, misses: 0, showCode: false, showMark: false, feel: 0, hot: false, hinted: false };
}

// Eén frame van de draaischijf. toets = { links, rechts, linksNu, rechtsNu, vast }. Geeft
// { hint, klik, mis, klaar }: hint = de code mag in beeld, klik = een cijfer vast, mis = naast, klaar = open.
export function draaiKluis(C, dt, toets = {}) {
  const uit = { hint: false, klik: false, mis: false, klaar: false };
  if (!C || !Array.isArray(C.code) || !C.code.length) return { ...uit, klaar: true };
  if (C.cur >= C.code.length) return { ...uit, klaar: true };
  C.t += dt;
  const dir = toets.rechts && !toets.links ? 1 : toets.links && !toets.rechts ? -1 : 0;
  if (toets.linksNu) C.v -= 1;
  if (toets.rechtsNu) C.v += 1;
  C.dirT = dir ? C.dirT + dt : 0;
  if (dir && C.dirT > 0.28) C.v += dir * 9 * dt;
  C.v = ((C.v % KLOKSCHIJF) + KLOKSCHIJF) % KLOKSCHIJF;
  if (!dir) C.v += (Math.round(C.v) - C.v) * Math.min(1, dt * 12);
  const doel = C.code[C.cur];
  const dd = Math.abs(((C.v - doel + KLOKSCHIJF * 1.5) % KLOKSCHIJF) - KLOKSCHIJF / 2);
  C.feel = Math.max(0, 1 - dd / 6) ** 1.5;
  C.hot = ((Math.round(C.v) % KLOKSCHIJF) + KLOKSCHIJF) % KLOKSCHIJF === doel;
  if ((C.misses >= 2 || C.t > 12) && !C.hinted) { C.hinted = true; C.showCode = true; uit.hint = true; }
  if (C.t > 32) C.showMark = true;
  if (toets.vast) {
    if (C.hot) { C.cur++; uit.klik = true; C.t = Math.min(C.t, 20); }
    else { C.misses++; uit.mis = true; }
  }
  uit.klaar = C.cur >= C.code.length;
  return uit;
}

// ---- de gastkant: de gastheer levert de tekenkant (heistui.js) via deze haken ---------------------
const haken = {};
export function zetHeistHaken(h) { Object.assign(haken, h || {}); }

// Elke frame op de gast (coopnet.js): de chip met je rol, en bij de kluis de draaischijf op je eigen
// scherm. De gastheer levert de stap aan; zonder haken doet dit niets.
export function heistGastTik(world, dt, stap) {
  return haken.gastTik ? !!haken.gastTik(world, dt, stap) : false;
}

// De twee manieren om de Kluisklus te spelen.
export const MODI = {
  samen: { id: 'samen', naam: 'Samen', tekst: 'Iedereen heeft een eigen rol en de buit wordt gedeeld.' },
  tegen: { id: 'tegen', naam: 'Tegen elkaar', tekst: 'Iedereen doet het hele plan zelf: wie het meest buitmaakt, wint.' },
};
export const isModus = (id) => Object.prototype.hasOwnProperty.call(MODI, id);
