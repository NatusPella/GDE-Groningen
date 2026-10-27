// Samen spelen (#447): spelers tegen elkaar in de wereld van wie het spel opende. De pure regels staan in cooppvp.js; hier zitten de
// lichamen, de treffers (slag en kogel uit combat.js) en wat er gebeurt als iemand neergaat. Geen bloed: een treffer is alleen het geluid
// en de schade. Een passieve speler hoort één keer dat een actieve speler hem wilde raken (pogingMelden). Wie door een medespeler
// neergaat staat zonder kosten weer op (geen respawn-reis, geen mislukte opdracht, geen prestatie
// "wasted", geen boete) en is zes seconden beschermd. Dood door de wereld loopt nog via requestRespawn en blijft zoals het was.
// Getest in scripts/cooppvp_test.mjs.
import { PVP_TEKST, pvpMag, pvpSchade, geefBescherming, beschermd, isPassief, arenaToegestaan, pogingMelden, leesPvpSchade, leesPvpDood, pvpDoodEvent } from './cooppvp.js';
import { maakArena, arenaMeld, arenaStart, arenaVerlaat, arenaStop, arenaTik, arenaTreffer, arenaNeer, arenaStand, arenaUitslag, arenaBeloning, arenaBeloningPerTeam, arenaSpawnVoor, arenaRegelVan, arenaRegel, arenaMelding, ARENA, ARENA_TEAMS, ARENA_ZONE_NAAM, ARENA_TEKST } from './pvparena.js'; // de PvP-minigame (#454)
import { gastLichamen, lichaamVan } from './coopbestuur.js';
import { charInfo } from './coopplayers.js';
import { geo, createBoard } from './minigamekit.js';
import { registerMusicProbe } from './scenariomusic.js';
import { hoofdspeler } from './spelersregister.js';
// De J/N-uitnodiging en de meldingen van een wedstrijd zijn er al (#443): de arena gebruikt ze opnieuw in plaats van een
// eigen bericht (PROTO en CODEC_VERSION blijven 2).
import { maakUitnodiging, antwoord, tikUitnodiging, jaSlots, uitEvent, verzoekBlok, verbondenGasten, registreerWedstrijd, zetWedGastHaken, WED_TEKST } from './multiplayerwedstrijd.js';
import { noteMoney } from './finance.js';

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
  arenaGastNeer(world, ik); // en weer bij zijn eigen team (#454)
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
// een plek in de wereld. Wie het spel opende rekent de ronde uit; de gasten horen de start (met hun eigen team), de stand en de
// uitslag via de gewone meldingen (coopnet.js 'melding'), dus geen nieuw netwerkformaat (PROTO en CODEC_VERSION blijven 2).
// De J/N-uitnodiging loopt via de berichten van een wedstrijd ('wed' f 'uit' en 'wedgast' ja/nee/start, multiplayerwedstrijd.js): elke
// speler, ook wie het spel opende, kan een ronde starten en meedoen of niet. Alleen spelers buiten de passieve stand doen mee en
// alleen wie bij de start in het veld staat (geen late instap). De beloning is gelijk per team met een kleine bonus voor de
// winnaar en gaat via de coopdeel-laag naar de eigen save (#448); dood kost hier niets. Bloed en gore mogen in deze PvP
// (constitutie 6), al tekent dit bestand niets.
const ARENA_PLEK = geo(53.2062, 6.5468); // het open veld in het noorden van het Stadspark (echte plek, verzonnen arena)
export const PVP_ARENA_PLEK = { x: ARENA_PLEK.x, y: ARENA_PLEK.y }; // voor de tests en de kaart
const ARENA_NABIJ = 14;                   // m: vanaf hier verschijnt de prompt bij het veld
const ARENA_MARGE = 4;                    // m: buiten de straal van het veld telt niemand meer mee
const ARENA_STAND_S = 5;                  // s: zoveel vaak hoort een deelnemer de stand (gewone melding)
const ARENA_ZONE = ARENA_ZONE_NAAM; // de namen van de zones staan bij de regels (pvparena.js)
let arenaBord = null;                     // het HUD-bord van deze pagina (minigamekit createBoard)
let arenaBordAan = false;                 // staat het bord in beeld?
let gastBord = null;                      // het bord van een gast (#454): dezelfde stand, op zijn eigen scherm
let gastBordAan = false;

const naamOfIemand = (world, slot) => (Number.isInteger(slot) ? naamVanSlot(world, slot) : 'Iemand');
function zetOpPlek(l, p) { l.x = p.x; l.y = p.y; l.vx = 0; l.vy = 0; l.z = 0; l.vz = 0; }
// Een melding voor plek 0 (dit scherm) of voor een gast (de gewone korte melding van de host).
function meldAan(world, slot, tekst) {
  if (!world || typeof tekst !== 'string') return;
  if (slot === 0) { if (world.addMessage) world.addMessage(tekst, 5); }
  else if (world.coopMeld) world.coopMeld(slot, tekst);
}
// Waarom iemand nu niet mee kan doen: { ok, reden } met reden 'passief', 'voertuig', 'neer', 'plek' of 'onbekend'.
function arenaKanMee(world, slot, l) {
  if (!Number.isInteger(slot) || slot < 0) return { ok: false, reden: 'onbekend' };
  if (!arenaToegestaan(world.coopPvp, slot)) return { ok: false, reden: 'passief' };
  if (!levend(world, slot, l)) return { ok: false, reden: l && (l.inVehicle || l.inVeh) ? 'voertuig' : 'neer' };
  if (Math.hypot(l.x - ARENA_PLEK.x, l.y - ARENA_PLEK.y) > ARENA.straal + ARENA_MARGE) return { ok: false, reden: 'plek' };
  return { ok: true, reden: '' };
}
// Dezelfde regel op het scherm van een gast: zijn eigen lichaam is daar world.player (plek 0), zijn echte plek is die van de host.
function arenaKanMeeGast(world) {
  const n = world.coopNet, ik = (n && n.session && n.session.slot) || 1;
  if (!arenaToegestaan(world.coopPvp, ik)) return { ok: false, reden: 'passief' };
  const p = hoofdspeler(world);
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return { ok: false, reden: 'onbekend' };
  if (p.inVehicle || p.inVeh || world.coopInVoertuig) return { ok: false, reden: 'voertuig' };
  if (Math.hypot(p.x - ARENA_PLEK.x, p.y - ARENA_PLEK.y) > ARENA.straal + ARENA_MARGE) return { ok: false, reden: 'plek' };
  return { ok: true, reden: '' };
}
const ARENA_REDEN = { passief: ARENA_TEKST.passief, voertuig: ARENA_TEKST.voertuig, plek: ARENA_TEKST.plek, neer: ARENA_TEKST.opstaan, onbekend: ARENA_TEKST.min };

// Wie doen er mee: in het veld, niet passief, niet in een voertuig, niet al neer. De host bepaalt de lijst bij de start.
function arenaKandidaten(world) {
  const uit = [];
  for (const [slot, l] of pvpLichamen(world)) {
    if (!arenaKanMee(world, slot, l).ok) continue;
    uit.push({ slot, naam: naamVanSlot(world, slot) });
  }
  return uit.sort((a, b) => a.slot - b.slot).slice(0, ARENA.maxSpelers);
}

// ---------------------------------------------------------------- de uitnodiging (J/N) en de start
// Waarom een ronde nu niet kan beginnen, of null.
function arenaStartBlok(world) {
  if (!world.coopPvp || !world.coopNet || world.coopNet.role !== 'host') return ARENA_TEKST.promptSolo;
  if (world.pvpArena && world.pvpArena.fase === 'bezig') return ARENA_TEKST.alBezig;
  const n = world.coopNet;
  if (n.wed && (n.wed.u || n.wed.r || n.wed.sc || n.wed.lv)) return WED_TEKST.bezig; // er loopt al een wedstrijd of uitnodiging
  const blok = verzoekBlok(world); // politie, filmpje, opdracht, bijbaan, activiteit
  if (blok) return blok;
  if (!verbondenGasten(world).length) return ARENA_TEKST.min; // minstens twee spelers
  return null;
}
// De host stuurt elke verbonden gast de gewone J/N-uitnodiging van een wedstrijd. starter: de gast die erom vroeg (doet mee).
function arenaNodigUit(world, starter = null) {
  const n = world.coopNet, gasten = verbondenGasten(world).map((s) => s.slot);
  const u = maakUitnodiging(ARENA.id, ARENA_TEKST.label, [0, ...gasten], ARENA.uitnS, { starter, wie: naamVanSlot(world, starter != null ? starter : 0) });
  if (starter == null) antwoord(u, 0, true); // E bij het veld is zelf meedoen
  world.pvpArenaUitn = u;
  for (const s of gasten) if (s !== starter) n.hub.announce(uitEvent(u), s);
  meldAan(world, 0, starter != null ? ARENA_TEKST.hostVraag(naamVanSlot(world, starter)) : ARENA_TEKST.verstuurd(ARENA.uitnS));
  return true;
}
// Iemand antwoordt op de uitnodiging (een gast via 'wedgast' ja/nee, de host met J/N of E).
export function pvpArenaAntwoord(world, slot, ja) {
  const u = world && world.pvpArenaUitn;
  if (!u || !antwoord(u, slot, ja)) return false;
  meldAan(world, slot, ja ? ARENA_TEKST.meedoen : ARENA_TEKST.nee);
  if (slot !== 0) meldAan(world, 0, `${naamVanSlot(world, slot)} ${ja ? 'doet mee' : 'doet niet mee'}.`);
  return true;
}
// Een gast vroeg de host een ronde te starten ('wedgast' a 'start', ook via E bij het veld: wedGastE in coopgastlokaal.js).
export function pvpArenaVraag(world, van) {
  if (!world || world.coopRole !== 'host' || !(van >= 1)) return false;
  const nee = (t) => { meldAan(world, van, t); return false; };
  const blok = arenaStartBlok(world);
  if (blok) return nee(world.pvpArenaUitn ? ARENA_TEKST.wacht : blok);
  const kan = arenaKanMee(world, van, lichaamVan(world, van));
  if (!kan.ok) return nee(ARENA_REDEN[kan.reden] || ARENA_TEKST.min);
  return arenaNodigUit(world, van);
}
// De gastenkant van dat verzoek: het gewone bericht van een wedstrijd, geen eigen formaat.
function pvpArenaVraagGast(world) {
  const n = world.coopNet;
  if (!n || !n.joined || !n.session) { meldAan(world, 0, ARENA_TEKST.promptSolo); return false; }
  const kan = arenaKanMeeGast(world);
  if (!kan.ok) { meldAan(world, 0, ARENA_REDEN[kan.reden] || ARENA_TEKST.min); return false; }
  meldAan(world, 0, ARENA_TEKST.vraagt);
  n.session.sendEvent({ k: 'wedgast', a: 'start', id: ARENA.id });
  return true;
}
// E bij het veld (activities.js): de host nodigt uit, een gast vraagt een ronde. Een tweede E start meteen.
export function pvpArenaStart(world) {
  if (!world) return false;
  if (!world.coopPvp || !world.coopNet) { meldAan(world, 0, ARENA_TEKST.promptSolo); return false; }
  if (world.coopRole === 'client') return pvpArenaVraagGast(world);
  if (world.pvpArenaUitn) { pvpArenaAntwoord(world, 0, true); world.pvpArenaUitn.rest = 0; return true; } // nu beginnen
  const blok = arenaStartBlok(world);
  if (blok) { meldAan(world, 0, world.pvpArenaUitn ? ARENA_TEKST.wacht : blok); return false; }
  const kan = arenaKanMee(world, 0, hoofdspeler(world));
  if (!kan.ok) { meldAan(world, 0, ARENA_REDEN[kan.reden] || ARENA_TEKST.min); return false; }
  return arenaNodigUit(world, null);
}
// De uitnodiging is klaar: alleen wie ja zei en bij de start in het veld staat, doet mee (geen late instap).
function arenaBegin(world) {
  const u = world.pvpArenaUitn; world.pvpArenaUitn = null;
  if (!u) return false;
  const n = world.coopNet;
  if (n && n.wed && (n.wed.u || n.wed.r || n.wed.sc || n.wed.lv)) { meldAan(world, 0, WED_TEKST.bezig); return false; } // er kwam een wedstrijd tussen
  const ja = new Set(jaSlots(u)), kandidaten = arenaKandidaten(world).filter((k) => ja.has(k.slot));
  for (const s of ja) if (s > 0 && !kandidaten.some((k) => k.slot === s)) {
    const kan = arenaKanMee(world, s, lichaamVan(world, s));
    meldAan(world, s, kan.reden === 'plek' ? ARENA_TEKST.nietInVeld : (ARENA_REDEN[kan.reden] || ARENA_TEKST.min));
  }
  if (kandidaten.length < 2) {
    meldAan(world, 0, kandidaten.some((k) => k.slot > 0) ? ARENA_TEKST.min : ARENA_TEKST.niemand);
    for (const k of kandidaten) meldAan(world, k.slot, ARENA_TEKST.min);
    return false;
  }
  const ar = maakArena({ x: ARENA_PLEK.x, y: ARENA_PLEK.y });
  for (const k of kandidaten) arenaMeld(ar, k.slot, k.naam, false);
  if (!arenaStart(ar, nuVan(world)).ok) { meldAan(world, 0, ARENA_TEKST.min); return false; }
  world.pvpArena = ar; world.pvpArenaFlash = null; world.pvpArenaUitslag = null; world.pvpArenaStandT = nuVan(world); world.pvpArenaBetaald = null;
  for (const d of ar.deeln) meldAan(world, d.slot, ARENA_TEKST.startJij(ARENA_TEAMS[d.team].naam)); // iedereen hoort zijn eigen team
  return true;
}
// Een bericht van een gast over de arena: het antwoord op de uitnodiging of het verzoek een ronde te starten. Geeft true als
// het bericht van de arena was, zodat coopnet.js het niet aan een wedstrijd hoeft te geven.
export function pvpArenaGastBericht(world, body, van) {
  if (!world || world.coopRole !== 'host' || !(van >= 1) || !body || body.k !== 'wedgast') return false;
  if (body.a === 'start') return body.id === ARENA.id ? pvpArenaVraag(world, van) : false;
  if (body.a !== 'ja' && body.a !== 'nee') return false;
  const u = world.pvpArenaUitn, n = world.coopNet;
  if (!u || u.keuze[van] !== 'wacht') return false;
  if (n && n.wed && n.wed.u) return false; // een lopende wedstrijd-uitnodiging gaat voor: die gast antwoordde daarop
  return pvpArenaAntwoord(world, van, body.a === 'ja');
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
// De ronde is voorbij: de uitslag, de beloning per team (#448) en een melding voor elke deelnemer met zijn eigen team.
function arenaKlaar(world, ar) {
  if (world.pvpArenaUitslag != null) return;
  const u = arenaUitslag(ar);
  world.pvpArenaUitslag = u;
  const bel = arenaBeloningPerTeam(ar), eigen = arenaBeloning(ar, 0);
  arenaBeloon(world, ar, bel);
  const tekst = `${u.tekst} ${ARENA_TEKST.rematch}`;
  if (world.addMessage) world.addMessage(eigen ? `${tekst} ${ARENA_TEKST.kreeg(bel[eigen.team].geld, bel[eigen.team].naam)}` : tekst, 6);
  const deeln = new Set(ar.deeln.map((d) => d.slot));
  for (const d of ar.deeln) if (d.slot > 0) meldAan(world, d.slot, ARENA_TEKST.einde(u.tekst, bel[d.team].geld, bel[d.team].naam));
  for (const g of verbondenGasten(world)) if (!deeln.has(g.slot)) meldAan(world, g.slot, u.tekst); // wie niet meedeed hoort de uitslag ook
}
// De beloning, één keer per ronde: gelijk per team via de coopdeel-laag (de gasten in hun eigen save, de host in de zijne).
// Dood kost niets: er gaat nooit geld af. Geeft het aantal gasten dat betaald is.
function arenaBeloon(world, ar, bel = arenaBeloningPerTeam(ar)) {
  if (!ar || world.pvpArenaBetaald === ar) return 0;
  world.pvpArenaBetaald = ar;
  if (!world.coopRole) return 0; // buiten Samen spelen bestaat de arena niet
  const eigen = arenaBeloning(ar, 0);
  if (eigen) { world.money = (world.money || 0) + bel[eigen.team].geld; noteMoney('Overig inkomsten'); }
  let n = 0;
  if (world.coopDeel) for (const b of bel) {
    const slots = ar.deeln.filter((d) => d.slot > 0 && d.team === b.team).map((d) => d.slot);
    if (slots.length && world.coopDeel(b.geld, { slots }) > 0) n += slots.length;
  }
  return n;
}

// Elke frame bij de host (activities.js): de uitnodiging telt af, de klok loopt, de zones wisselen, de stand gaat naar de
// deelnemers en het bord staat erbij. Bij een gast doet pvpArenaGastTik hetzelfde met wat de host hem meldt (#454).
export function pvpArenaTik(world, dt) {
  if (!world) return;
  if (world.coopRole === 'client') return pvpArenaGastTik(world, dt);
  const u = world.pvpArenaUitn;
  if (u) {
    for (const s of Object.keys(u.keuze)) if (+s > 0 && u.keuze[s] === 'wacht' && !verbondenGasten(world).some((g) => g.slot === +s)) u.keuze[s] = 'nee'; // weggevallen
    if (tikUitnodiging(u, dt) || u.nu) arenaBegin(world);
  }
  const ar = world.pvpArena;
  if (!ar) { verbergBord(); return; }
  const nu = nuVan(world);
  if (ar.fase === 'bezig') {
    for (const d of ar.deeln.slice()) if (d.slot > 0 && !verbondenGasten(world).some((g) => g.slot === d.slot)) { arenaVerlaat(ar, d.slot, nu); if (world.coopPvpMeld) world.coopPvpMeld(`${d.naam} is weg: de ronde loopt door.`, 0); } // iemand valt weg
    const lichamen = [];
    for (const [slot, l] of pvpLichamen(world)) if (Number.isInteger(slot) && levend(world, slot, l)) lichamen.push({ slot, x: l.x, y: l.y });
    for (const e of arenaTik(ar, dt, lichamen, nu)) {
      if (e.type === 'zone') {
        const z = `${ARENA_ZONE[e.zone] || e.zone} is van ${ARENA_TEAMS[e.team].naam}`;
        world.pvpArenaFlash = z;
        if (world.coopPvpMeld) world.coopPvpMeld(z, 0); // de gasten zien dezelfde wisseling
      } else if (e.type === 'eind') arenaKlaar(world, ar);
    }
    if (ar.fase === 'bezig' && nu - (world.pvpArenaStandT || 0) > ARENA_STAND_S) {
      world.pvpArenaStandT = nu;
      const regel = arenaRegel(ar);
      for (const d of ar.deeln) if (d.slot > 0) meldAan(world, d.slot, regel); // elke paar seconden de stand op het bord van de gast
    }
    if (ar.fase === 'klaar') arenaKlaar(world, ar); // de ronde stopte omdat er te weinig spelers over zijn
  }
  if (ar.fase === 'klaar') {
    arenaKlaar(world, ar);
    if (nu >= ar.klaarTot) { world.pvpArena = null; world.pvpArenaUitslag = null; verbergBord(); return; }
  }
  toonBord(world, ar);
}

function verbergBord() { if (arenaBord && arenaBordAan) { arenaBord.hide(); arenaBordAan = false; } }
function verbergGastBord() { if (gastBord && gastBordAan) { gastBord.hide(); gastBordAan = false; } }

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

// ---------------------------------------------------------------- de gastenkant (#454)
// De gast hoort de start (met zijn team), de stand, de zonewisselingen en de uitslag als gewone meldingen (coopnet.js). Daarmee
// houdt hij zijn eigen bord bij, kent hij zijn team en staat hij na een uitschakeling bij zijn eigen team weer op. Geen nieuw
// bericht en geen eigen spel: de ronde loopt in de wereld van de host, met dezelfde wapens en dezelfde schade.
export function pvpArenaGastMelding(world, tekst) {
  if (!world || world.coopRole !== 'client') return false;
  const m = arenaMelding(tekst);
  if (!m) return false;
  if (m.soort === 'start') {
    const g = world.pvpArenaGast || (world.pvpArenaGast = { team: null, score: [0, 0], rest: ARENA.rondeS, flash: '', tekst: '', klaar: false, klaarTot: 0 });
    if (m.team != null) g.team = m.team;
    g.score = [0, 0]; g.rest = ARENA.rondeS; g.flash = ''; g.tekst = ''; g.klaar = false; g.klaarTot = 0;
    return true;
  }
  const g = world.pvpArenaGast;
  if (!g) return false;
  if (m.soort === 'stand') { g.score = m.score; g.rest = m.rest; return true; }
  if (m.soort === 'zone') { g.flash = `${ARENA_ZONE[m.zone] || m.zone} is van ${ARENA_TEAMS[m.team].naam}`; return true; }
  if (m.soort === 'neer') { g.flash = m.tekst; return true; }
  if (m.soort === 'eind') { g.tekst = m.tekst; g.klaar = true; g.klaarTot = nuVan(world) + ARENA.klaarS; return true; }
  return false;
}
// De gast staat na een uitschakeling weer bij zijn eigen team. Hij rekent zijn opstelplaats zelf uit: de arena is een vaste plek.
function arenaGastNeer(world, slot) {
  const g = world && world.pvpArenaGast;
  if (!g || g.team == null || world.coopRole !== 'client') return false;
  const p = arenaSpawnVoor(maakArena({ x: ARENA_PLEK.x, y: ARENA_PLEK.y }), g.team, slot), l = hoofdspeler(world);
  if (!p || !l) return false;
  zetOpPlek(l, p);
  g.flash = 'Je staat weer bij je team.';
  return true;
}
// Elke frame bij een gast (coopnet.js tickCoopNet): de klok van de ronde loopt door en het eigen bord staat erbij.
export function pvpArenaGastTik(world, dt) {
  if (!world || world.coopRole !== 'client') return false;
  const g = world.pvpArenaGast;
  if (!g) { verbergGastBord(); return false; }
  if (!g.klaar) g.rest = Math.max(0, g.rest - Math.max(0, Number(dt) || 0));
  if (g.klaar && nuVan(world) >= g.klaarTot) { world.pvpArenaGast = null; verbergGastBord(); return false; }
  if (typeof document === 'undefined' || !document.body) return true;
  if (!gastBord) gastBord = createBoard('pvparena', ARENA_TEAMS[0].kleur);
  const team = g.team == null ? 'je kijkt mee' : `team ${ARENA_TEAMS[g.team].naam}`;
  if (!gastBordAan) { gastBord.show(); gastBordAan = true; }
  gastBord.set({
    row: arenaRegelVan(g.score, g.rest),
    extra: `Jij: ${team}<br>${g.klaar ? 'De ronde is afgelopen.' : 'Verover de zones met je team.'}`,
    flash: g.klaar ? g.tekst : (g.flash || ''),
    help: g.klaar ? ARENA_TEKST.rematch : `Treffer ${ARENA.puntenTreffer} punt · uitschakeling ${ARENA.puntenNeer} · dood kost je niets`,
  });
  return true;
}
// De sessie stopt of deze speler stopt met de arena: geen bord meer en geen ronde meer (coopnet.js stopCoopNet).
export function pvpArenaReset(world) {
  if (world) {
    if (world.pvpArena) arenaStop(world.pvpArena, nuVan(world));
    world.pvpArena = null; world.pvpArenaUitn = null; world.pvpArenaUitslag = null; world.pvpArenaGast = null;
  }
  verbergBord(); verbergGastBord();
}

// De prompt bij het veld (activities.js) en de E-toets.
export const pvpArenaDichtbij = (world) => {
  const p = hoofdspeler(world);
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.hypot(p.x - ARENA_PLEK.x, p.y - ARENA_PLEK.y) <= ARENA_NABIJ;
};
export function pvpArenaPrompt(world) {
  if (!pvpArenaDichtbij(world)) return null;
  const ar = world.pvpArena, g = world.pvpArenaGast;
  if (ar && ar.fase === 'bezig') return { id: 'pvparena', x: ARENA_PLEK.x, y: ARENA_PLEK.y, h: 2.2, key: 'E', label: ARENA_TEKST.prompt, sub: arenaRegel(ar), ring: true, dim: true };
  if (g && !g.klaar) return { id: 'pvparena', x: ARENA_PLEK.x, y: ARENA_PLEK.y, h: 2.2, key: 'E', label: ARENA_TEKST.prompt, sub: arenaRegelVan(g.score, g.rest), ring: true, dim: true };
  if (world.pvpArenaUitn) return { id: 'pvparena', x: ARENA_PLEK.x, y: ARENA_PLEK.y, h: 2.2, key: 'E', label: ARENA_TEKST.prompt, sub: ARENA_TEKST.wacht, ring: true, dim: true };
  if (!world.coopPvp || !world.coopNet) return { id: 'pvparena', x: ARENA_PLEK.x, y: ARENA_PLEK.y, h: 2.2, key: 'E', label: ARENA_TEKST.prompt, sub: ARENA_TEKST.promptSolo, ring: true, dim: true };
  const kan = world.coopRole === 'client' ? arenaKanMeeGast(world) : arenaKanMee(world, 0, hoofdspeler(world));
  return { id: 'pvparena', x: ARENA_PLEK.x, y: ARENA_PLEK.y, h: 2.2, key: 'E', label: ARENA_TEKST.prompt, sub: kan.ok ? ARENA_TEKST.promptSub : (ARENA_REDEN[kan.reden] || ARENA_TEKST.promptSub), ring: true, dim: !kan.ok };
}

// De activiteit in de lijst van activities.js: één plek op de kaart, een prompt, de E-toets en de klok. Geen eigen scherm
// (active() blijft false): de wereld blijft spelen, alleen het bord staat erbij. Een gast vraagt de ronde met E aan de host
// (wedGastE, coopgastlokaal.js: 'wedgast' met a 'start'), die de gewone J/N-uitnodiging stuurt.
export const PVP_ARENA_ACT = {
  id: 'pvparena',
  init() {},
  spots: () => [{ id: 'pvparena', name: ARENA_TEKST.naam, x: ARENA_PLEK.x, y: ARENA_PLEK.y }],
  prompt: (world) => pvpArenaPrompt(world),
  interact: (world) => { if (!pvpArenaDichtbij(world)) return false; pvpArenaStart(world); return true; },
  active: () => false,
  tick: (dt, world) => pvpArenaTik(world, dt),
  quit: (world) => pvpArenaReset(world),
};

// De gastenkant in de lijst met wedstrijden (#454): zo pakt E bij het veld het gewone verzoek aan de host (wedGastE,
// coopgastlokaal.js) en is er geen eigen bericht nodig. De arena zelf rekent buiten dat kader: de stand en de beloning zijn
// per team, geen plek, en de rematch gaat met E bij het veld.
registreerWedstrijd(ARENA.id, { naam: ARENA_TEKST.label, geenHerhaling: true });
zetWedGastHaken(ARENA.id, { dichtbij: (world) => pvpArenaDichtbij(world) });

// De eigen muziek van de arena (audio.js pvp_arena_loop) zolang deze speler een ronde speelt (host of gast).
registerMusicProbe('pvp', (world) => !!world && ((world.pvpArena && world.pvpArena.fase === 'bezig') || (world.pvpArenaGast && !world.pvpArenaGast.klaar)));

