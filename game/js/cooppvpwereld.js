// Samen spelen (#447): spelers tegen elkaar in de wereld van wie het spel opende. De pure regels staan in cooppvp.js; hier zitten de
// lichamen, de treffers (slag en kogel uit combat.js) en wat er gebeurt als iemand neergaat. Geen bloed: een treffer is alleen het geluid
// en de schade. Een passieve speler hoort één keer dat een actieve speler hem wilde raken (pogingMelden). Wie door een medespeler
// neergaat staat zonder kosten weer op (geen respawn-reis, geen mislukte opdracht, geen prestatie
// "wasted", geen boete) en is zes seconden beschermd. Dood door de wereld loopt nog via requestRespawn en blijft zoals het was.
// Getest in scripts/cooppvp_test.mjs.
import { PVP_TEKST, pvpMag, pvpSchade, geefBescherming, beschermd, isPassief, arenaToegestaan, pogingMelden, leesPvpSchade, leesPvpDood, pvpDoodEvent } from './cooppvp.js';
import { maakArena, arenaMeld, arenaStart, arenaStop, arenaTik, arenaTreffer, arenaNeer, arenaStand, arenaUitslag, arenaRegel, ARENA, ARENA_TEAMS, ARENA_TEKST } from './pvparena.js'; // de PvP-minigame (#454)
import { gastLichamen } from './coopbestuur.js';
import { charInfo } from './coopplayers.js';
import { geo, createBoard } from './minigamekit.js';
import { registerMusicProbe } from './scenariomusic.js';
import { hoofdspeler } from './spelersregister.js';

const nuVan = (w) => (Number.isFinite(w.time) ? w.time : 0);
const isHost = (w) => w.coopRole === 'host' && !!w.coopPvp;
export const naamVanSlot = (world, slot) => {
  const r = (world.coopRoster || []).find((x) => x && x.slot === slot);
  return (r && (r.naam || (charInfo(r.char) || {}).naam)) || 'Een speler';
};

// Alle lichamen die tegen elkaar kunnen vechten: [[plek, lichaam]]; plek 0 is de speler van wie het spel opende.
export function pvpLichamen(world) {
  const uit = [];
  if (world.player) uit.push([0, world.player]);
  for (const g of gastLichamen(world)) uit.push(g);
  return uit;
}
// Te raken: niet in een voertuig, niet al neer, en voor de host niet midden in zijn eigen respawn.
const levend = (world, slot, l) => !!l && !l.inVehicle && !l.inVeh && l.state !== 'dead' && Number.isFinite(l.x) && Number.isFinite(l.y) && !(slot === 0 && (world.pendingRespawn || !(world.health > 0)));

// Een treffer van `dader` op `doel`; true als de schade is gegeven.
export function pvpTreffer(world, dader, doel, bedrag) {
  if (!isHost(world)) return false;
  const r = pvpSchade(world.coopPvp, dader, doel, bedrag, nuVan(world));
  if (!r.ok) { if (r.reden === 'doel-passief') poging(world, dader, doel); return false; }
  if (doel === 0) hostRaak(world, r.bedrag, dader);
  else if (world.coopPvpSchade) world.coopPvpSchade(doel, r.bedrag, dader);
  arenaTrefferHook(world, dader, doel, r.bedrag); // de PvP-minigame telt treffers tussen deelnemers (#454)
  return true;
}

// De passieve speler hoort één keer (per paar seconden) dat een actieve speler hem wilde raken; bij de host in beeld,
// bij een gast als gewone melding van de host. Zo weet je dat je passief staat in plaats van dat er "niets" gebeurt.
function poging(world, dader, doel) {
  if (!pogingMelden(world.coopPvp, dader, doel, nuVan(world))) return;
  const tekst = PVP_TEKST.poging(naamVanSlot(world, dader));
  if (doel === 0) { if (world.addMessage) world.addMessage(tekst, 4); }
  else if (world.coopMeld) world.coopMeld(doel, tekst);
}

// Een slag: alle andere spelers binnen bereik (inReach is die van combat.js meleeHit). Geeft true als er iemand geraakt is.
export function pvpSlag(world, dader, inReach, bedrag) {
  if (!isHost(world)) return false;
  let geraakt = false;
  for (const [slot, l] of pvpLichamen(world)) {
    if (slot === dader || !levend(world, slot, l) || !inReach(l.x, l.y, 0)) continue;
    if (pvpTreffer(world, dader, slot, bedrag)) geraakt = true;
  }
  return geraakt;
}

// Een kogel van een speler (owner 'player'; dader is de plek van een gast, geen dader is de speler zelf). true: de kogel is op.
export function pvpKogel(world, b) {
  if (!isHost(world) || !b || b.owner !== 'player') return false;
  const dader = b.dader | 0, nu = nuVan(world);
  for (const [slot, l] of pvpLichamen(world)) {
    if (slot === dader || !levend(world, slot, l)) continue;
    if (Math.hypot(l.x - b.x, l.y - b.y) > (l.radius || 0.4) + 0.12 || Math.abs((l.gz || 0) - (b.gz || 0)) > 3) continue;
    const m = pvpMag(world.coopPvp, dader, slot, nu);
    if (!m.ok) { if (m.reden === 'doel-passief') poging(world, dader, slot); continue; } // een kogel gaat dwars door een passieve speler
    return pvpTreffer(world, dader, slot, b.damage);
  }
  return false;
}

// ---------------------------------------------------------------- de speler van wie het spel opende raakt of valt om
function hostRaak(world, schade, dader) {
  let d = schade;
  if (world.armor > 0) { const a = Math.min(world.armor, d); world.armor -= a; d -= a; }
  world.health = Math.max(0, (world.health === undefined ? 100 : world.health) - d);
  if (world.health <= 0) hostOpstaan(world, dader);
}
function hostOpstaan(world, dader) {
  world.health = 100; world.armor = 0;
  geefBescherming(world.coopPvp, 0, nuVan(world));
  const p = world.player; if (p) { p.vx = 0; p.vy = 0; }
  arenaNeerHook(world, dader, 0); // de PvP-minigame: punten, respawn bij het eigen team (#454)
  if (world.addMessage) world.addMessage(PVP_TEKST.neergeslagen(naamVanSlot(world, dader)), 5);
  if (world.coopPvpMeld) world.coopPvpMeld(PVP_TEKST.neergeslagenAnderen(naamVanSlot(world, dader), naamVanSlot(world, 0)), 0);
}

// ---------------------------------------------------------------- een gast raakt of valt om (eigen scherm, eigen gezondheid)
// body: het bericht { k: 'schade', n, door } van de host. Geeft true als het een speler-treffer was (ook als hij niet telde).
export function pvpGastRaak(world, body, ik) {
  const pv = leesPvpSchade(body); if (!pv) return false;
  const st = world.coopPvp, nu = nuVan(world);
  if (!st || world.coopRole !== 'client' || isPassief(st, ik) || beschermd(st, ik, nu)) return true;
  let d = pv.n;
  if ((world.armor || 0) > 0) { const a = Math.min(world.armor, d); world.armor -= a; d -= a; }
  world.health = (world.health === undefined ? 100 : world.health) - d;
  if (world.health > 0) return true;
  world.health = 100; world.armor = 0; // zonder kosten weer op
  geefBescherming(st, ik, nu);
  if (world.addMessage) world.addMessage(PVP_TEKST.neergeslagen(naamVanSlot(world, pv.door)), 5);
  arenaNeerHook(world, pv.door, ik); // de PvP-minigame op het scherm van de gast (#454)
  const n = world.coopNet;
  try { if (n && n.session && n.session.sendEvent) n.session.sendEvent(pvpDoodEvent(pv.door)); } catch (e) { /* de verbinding is er even niet */ }
  return true;
}

// De host hoort dat een gast is neergegaan: bescherming voor hem en een melding voor de rest.
export function pvpDoodVerwerk(world, body, slot) {
  const d = leesPvpDood(body); if (!d || !isHost(world) || !(slot >= 1) || isPassief(world.coopPvp, slot)) return false;
  geefBescherming(world.coopPvp, slot, nuVan(world));
  arenaNeerHook(world, d.door, slot); // de PvP-minigame: de host hoort dat een gast neerging (#454)
  const tekst = PVP_TEKST.neergeslagenAnderen(naamVanSlot(world, d.door), naamVanSlot(world, slot));
  if (world.addMessage) world.addMessage(tekst, 4);
  if (world.coopPvpMeld) world.coopPvpMeld(tekst, slot);
  return true;
}

// ---------------------------------------------------------------- de PvP-minigame (#454)
// De regels staan in pvparena.js; hier hangt de arena aan de PvP-laag hierboven (dezelfde treffers, hetzelfde neergaan) en aan
// een plek in de wereld. Wie het spel opende rekent de ronde uit; de gasten horen de stand via de gewone meldingen
// (coopnet.js 'melding'), dus geen nieuw netwerkformaat (PROTO en CODEC_VERSION blijven 2). Alleen spelers buiten de passieve
// stand doen mee en alleen wie bij de start in het veld staat (geen late instap). Dood kost hier niets: geen geld, geen
// voortgang; bloed en gore mogen in deze PvP (constitutie 6), al tekent dit bestand niets.
const ARENA_PLEK = geo(53.2062, 6.5468); // het open veld in het noorden van het Stadspark (echte plek, verzonnen arena)
export const PVP_ARENA_PLEK = { x: ARENA_PLEK.x, y: ARENA_PLEK.y }; // voor de tests en de kaart
const ARENA_NABIJ = 14;                   // m: vanaf hier verschijnt de prompt bij het veld
const ARENA_ZONE = { midden: 'Midden', west: 'West', oost: 'Oost' };
let arenaBord = null;                     // het HUD-bord van deze pagina (minigamekit createBoard)
let arenaBordAan = false;                 // staat het bord in beeld?

const naamOfIemand = (world, slot) => (Number.isInteger(slot) ? naamVanSlot(world, slot) : 'Iemand');
function zetOpPlek(l, p) { l.x = p.x; l.y = p.y; l.vx = 0; l.vy = 0; l.z = 0; l.vz = 0; }

// Wie doen er mee: in het veld, niet passief, niet in een voertuig, niet al neer. De host bepaalt de lijst bij de start.
function arenaKandidaten(world) {
  const uit = [];
  for (const [slot, l] of pvpLichamen(world)) {
    if (!Number.isInteger(slot) || slot < 0 || !arenaToegestaan(world.coopPvp, slot) || !levend(world, slot, l)) continue;
    if (Math.hypot(l.x - ARENA_PLEK.x, l.y - ARENA_PLEK.y) > ARENA.straal + 4) continue;
    uit.push({ slot, naam: naamVanSlot(world, slot) });
  }
  return uit.sort((a, b) => a.slot - b.slot).slice(0, ARENA.maxSpelers);
}

// De start: een nieuwe ronde voor iedereen die erbij staat. Alleen de host (of de enige speler) rekent.
export function pvpArenaStart(world) {
  const meld = (t) => { if (world.addMessage) world.addMessage(t, 5); };
  if (!world.coopPvp || !world.coopNet) { meld(ARENA_TEKST.promptSolo); return false; }
  if (world.coopRole === 'client') { meld(ARENA_TEKST.alleenHost); return false; }
  if (world.pvpArena && world.pvpArena.fase === 'bezig') { meld(ARENA_TEKST.alBezig); return false; }
  if (isPassief(world.coopPvp, 0)) { meld(ARENA_TEKST.passief); return false; }
  const ik = hoofdspeler(world);
  if (ik && ik.inVehicle) { meld(ARENA_TEKST.voertuig); return false; }
  const kandidaten = arenaKandidaten(world);
  if (kandidaten.length < 2) { meld(ARENA_TEKST.min); return false; }
  const ar = maakArena({ x: ARENA_PLEK.x, y: ARENA_PLEK.y });
  for (const k of kandidaten) arenaMeld(ar, k.slot, k.naam, false);
  if (!arenaStart(ar, nuVan(world)).ok) { meld(ARENA_TEKST.min); return false; }
  world.pvpArena = ar; world.pvpArenaFlash = null; world.pvpArenaUitslag = null; world.pvpArenaStandT = nuVan(world);
  meld(ARENA_TEKST.start);
  if (world.coopPvpMeld) world.coopPvpMeld(ARENA_TEKST.start, 0);
  return true;
}

// Een treffer tussen twee deelnemers (de schade is al door pvpSchade goedgekeurd).
function arenaTrefferHook(world, dader, doel, bedrag) {
  const ar = world.pvpArena;
  if (!ar || ar.fase !== 'bezig') return;
  arenaTreffer(ar, dader, doel, bedrag, nuVan(world));
}
// Iemand gaat neer: punten voor de dader, respawn bij het eigen team en bescherming (nooit korter dan wat de PvP-laag al gaf).
function arenaNeerHook(world, dader, doel) {
  const ar = world.pvpArena;
  if (!ar || ar.fase !== 'bezig' || !world.coopPvp) return;
  const r = arenaNeer(ar, dader, doel, nuVan(world));
  if (!r.ok) return;
  const nu = nuVan(world), tot = ((world.coopPvp.tot || {})[doel] || 0);
  if (tot < nu + ARENA.beschermS) geefBescherming(world.coopPvp, doel, nu, ARENA.beschermS);
  const ik = hoofdspeler(world);
  if (doel === 0 && r.spawn && ik) zetOpPlek(ik, r.spawn); // de host staat weer bij zijn team
  const tekst = ARENA_TEKST.neer(naamOfIemand(world, dader), naamOfIemand(world, doel));
  if (world.addMessage) world.addMessage(tekst, 3);
  if (world.coopPvpMeld) world.coopPvpMeld(tekst, 0);
}
function arenaKlaar(world, ar) {
  if (world.pvpArenaUitslag != null) return;
  const u = arenaUitslag(ar);
  world.pvpArenaUitslag = u;
  if (world.addMessage) world.addMessage(`${u.tekst} ${ARENA_TEKST.rematch}`, 6);
  if (world.coopPvpMeld) world.coopPvpMeld(u.tekst, 0); // de gasten horen de uitslag
}

// Elke frame bij de host (activities.js): de klok, de zones, de stand en het bord.
export function pvpArenaTik(world, dt) {
  const ar = world.pvpArena;
  if (!ar) { verbergBord(); return; }
  const nu = nuVan(world);
  if (ar.fase === 'bezig') {
    const lichamen = [];
    for (const [slot, l] of pvpLichamen(world)) if (Number.isInteger(slot) && levend(world, slot, l)) lichamen.push({ slot, x: l.x, y: l.y });
    for (const e of arenaTik(ar, dt, lichamen, nu)) {
      if (e.type === 'zone') world.pvpArenaFlash = `${ARENA_ZONE[e.zone] || e.zone} is van ${ARENA_TEAMS[e.team].naam}`;
      else if (e.type === 'eind') arenaKlaar(world, ar);
    }
    if (ar.fase === 'bezig' && nu - (world.pvpArenaStandT || 0) > 30) { world.pvpArenaStandT = nu; if (world.coopPvpMeld) world.coopPvpMeld(arenaRegel(ar), 0); } // elke halve minuut de stand
  }
  if (ar.fase === 'klaar') {
    arenaKlaar(world, ar);
    if (nu >= ar.klaarTot) { world.pvpArena = null; world.pvpArenaUitslag = null; verbergBord(); return; }
  }
  toonBord(world, ar);
}

function verbergBord() { if (arenaBord && arenaBordAan) { arenaBord.hide(); arenaBordAan = false; } }

// Het HUD-bord (minigamekit createBoard): de stand van beide teams, de zones, de tijd en je eigen punten.
function toonBord(world, ar) {
  if (typeof document === 'undefined' || !document.body) return; // de pure tests hebben geen DOM (scripts/node3d.mjs)
  if (!arenaBord) arenaBord = createBoard('pvparena', ARENA_TEAMS[0].kleur); // titel, kleur en icoon uit het thema (#453)
  const s = arenaStand(ar), m = Math.floor(s.rest / 60), r = Math.floor(s.rest % 60);
  const zones = s.zones.map((z) => `${ARENA_ZONE[z.id] || z.id}: ${z.eigenaar == null ? 'vrij' : ARENA_TEAMS[z.eigenaar].naam}`).join(' · ');
  const eigen = s.rijen.map((d) => `${d.naam} ${d.punten}`).join(' · ');
  if (!arenaBordAan) { arenaBord.show(); arenaBordAan = true; }
  arenaBord.set({
    row: `${ARENA_TEAMS[0].naam} <b>${s.score[0]}</b> · ${m}:${r < 10 ? '0' : ''}${r} · ${ARENA_TEAMS[1].naam} <b>${s.score[1]}</b>`,
    extra: `${zones}<br>${eigen}`,
    flash: ar.fase === 'klaar' && world.pvpArenaUitslag ? world.pvpArenaUitslag.tekst : (world.pvpArenaFlash || ''),
    help: ar.fase === 'klaar' ? ARENA_TEKST.rematch : `Verover de zones met je team · treffer ${ARENA.puntenTreffer} punt, uitschakeling ${ARENA.puntenNeer}`,
  });
}

// De prompt bij het veld (activities.js) en de E-toets.
export const pvpArenaDichtbij = (world) => {
  const p = hoofdspeler(world);
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.hypot(p.x - ARENA_PLEK.x, p.y - ARENA_PLEK.y) <= ARENA_NABIJ;
};
export function pvpArenaPrompt(world) {
  if (!pvpArenaDichtbij(world)) return null;
  const ar = world.pvpArena;
  if (ar && ar.fase === 'bezig') return { id: 'pvparena', x: ARENA_PLEK.x, y: ARENA_PLEK.y, h: 2.2, key: 'E', label: ARENA_TEKST.prompt, sub: arenaRegel(ar), ring: true, dim: true };
  const host = world.coopRole !== 'client';
  const samen = host && !!world.coopPvp && !!world.coopNet;
  return { id: 'pvparena', x: ARENA_PLEK.x, y: ARENA_PLEK.y, h: 2.2, key: 'E', label: ARENA_TEKST.prompt, sub: !host ? ARENA_TEKST.alleenHost : samen ? ARENA_TEKST.promptSub : ARENA_TEKST.promptSolo, ring: true, dim: !samen };
}

// De activiteit in de lijst van activities.js: één plek op de kaart, een prompt, de E-toets en de klok. Geen eigen scherm
// (active() blijft false): de wereld blijft spelen, alleen het bord staat erbij. Een gast krijgt de gewone melding dat dit bij
// wie het spel opende gebeurt; de gastenkant van het bord is nog open (zie #454).
export const PVP_ARENA_ACT = {
  id: 'pvparena',
  init() {},
  spots: () => [{ id: 'pvparena', name: ARENA_TEKST.naam, x: ARENA_PLEK.x, y: ARENA_PLEK.y }],
  prompt: (world) => pvpArenaPrompt(world),
  interact: (world) => { if (!pvpArenaDichtbij(world)) return false; pvpArenaStart(world); return true; },
  active: () => false,
  tick: (dt, world) => pvpArenaTik(world, dt),
  quit: (world) => { if (world.pvpArena) { arenaStop(world.pvpArena, nuVan(world)); world.pvpArena = null; } verbergBord(); },
};

// De eigen muziek van de arena (audio.js pvp_arena_loop) zolang deze speler een ronde speelt.
registerMusicProbe('pvp', (world) => !!(world && world.pvpArena && world.pvpArena.fase === 'bezig'));

