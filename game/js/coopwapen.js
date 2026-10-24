// Samen spelen (#434): een gast met een wapen. Het wapen en de patronen zijn die van zijn eigen opgeslagen spel (world.weapon en world.ammo
// van de gast; coopsave.js GAST_VELDEN). De gast kiest zijn wapen zelf (1 tot 4, muiswiel) en houdt de aanvalsknop vast: dat gaat als een
// knop (KNOP_AANVAL) in zijn invoer naar wie het spel opende. Die rekent de slag of het schot uit vanuit het lichaam van de gast (combat.js
// gastAanvalUitvoeren: dezelfde schade, kogels en dracht als bij de speler), zodat de schade en de misdaad bij de gast horen (coopbestuur.js
// gastAanval, coopgezocht.js). Welk wapen de gast heeft komt als JSON-bericht { k: 'wapen', w, n } (alleen bij een wisseling); de
// gast en de host tellen de patronen met dezelfde klok (stapAanvalKlok), dus ze lopen gelijk. In het snapshot staan wapen en laatste
// aanval van de gast in de bytes die er al waren (coopnet.js spelerRecord): de anderen zien het wapen in zijn hand en de zwaai.
// Pure logica zonder three.js; combat.js komt binnen als haak (zetWapenHaken), getest in scripts/coopwapen_test.mjs.
// Geen nieuw netwerkformaat: PROTO en CODEC_VERSION blijven 2 (een oudere host negeert het bericht 'wapen').
import { WEAPONS, WEAPON_KEYS, SLOTS } from './weapons.js';
import { lichaamVan, invoerVan } from './coopbestuur.js';
import { KNOP_AANVAL, KNOP_ZICHT } from './coopspeler.js';

export const WAPEN_TEKST = {
  alleenEigen: 'Dit wapen werkt alleen in je eigen spel.',
  leeg: 'Leeg.',
};
export const WAPEN_HERHAAL_S = 5; // s: de gast meldt zijn wapen opnieuw (late host, verloren bericht)
export const MAX_PATRONEN = 9999;
// Een wapen met een kijker (jachtgeweer, weapons.js scope): rechtermuisknop vast = door de kijker richten; het schot gaat precies waar het richtkruis is.
export const heeftKijker = (key) => !!WEAPONS[key] && !!WEAPONS[key].scope && WEAPONS[key].kind === 'gun';

// Wat een gast aan de host kan overlaten: een slag of een schot. Spuiten en gooien (waterpistool, carbidbus, vuurwerk) zetten dingen in de wereld
// van wie het spel opende en blijven dus bij het eigen spel.
export const gastWapenKan = (key) => !!WEAPONS[key] && (WEAPONS[key].kind === 'melee' || WEAPONS[key].kind === 'gun');
export const heeftWapen = (world, key) => { const w = WEAPONS[key]; return !!w && (w.ammo === Infinity || Number.isFinite((world.ammo || {})[key])); };
export const heeftPatronen = (world, key) => { const w = WEAPONS[key]; return !!w && (w.ammo === Infinity || ((world.ammo || {})[key] || 0) > 0); };

// De klok van de aanvalsknop: één stap, voor de gast (zijn eigen patronen en effect) en de host (de echte aanval) dezelfde.
// st: { timer }; n: patronen (Infinity of een slagwapen: nooit op). Geeft { schiet, klik, n }.
export function stapAanvalKlok(st, dt, ingedrukt, key, n) {
  const w = WEAPONS[key];
  st.timer = Math.max(0, (st.timer || 0) - (dt > 0 ? dt : 0));
  if (!w || !ingedrukt || st.timer > 0) return { schiet: false, klik: false, n };
  const oneindig = w.kind === 'melee' || w.ammo === Infinity;
  if (!oneindig && !(n > 0)) { st.timer = 0.5; return { schiet: false, klik: true, n }; } // leeg: alleen het klikje
  st.timer = w.cooldown;
  return { schiet: true, klik: false, n: oneindig ? n : n - 1 };
}

// ---------------------------------------------------------------- berichten
export const wapenEvent = (key, n) => ({ k: 'wapen', w: gastWapenKan(key) ? key : '', n: Number.isFinite(n) ? Math.max(0, Math.min(MAX_PATRONEN, Math.floor(n))) : -1 });
export function leesWapen(b) {
  if (!b || b.k !== 'wapen') return null;
  const w = typeof b.w === 'string' && gastWapenKan(b.w) ? b.w : '';
  const n = Number.isFinite(b.n) ? (b.n < 0 ? Infinity : Math.min(MAX_PATRONEN, Math.floor(b.n))) : 0;
  return { w, n };
}

// ---------------------------------------------------------------- de gast (eigen scherm)
// Kies een wapenslot met een cijfertoets: de wapens van dat slot die je hebt, telkens het volgende.
export function kiesSlot(world, slot) {
  const eigen = WEAPON_KEYS.filter((k) => WEAPONS[k].slot === slot && heeftWapen(world, k));
  if (!eigen.length) return false;
  world.weapon = eigen[(eigen.indexOf(world.weapon) + 1) % eigen.length];
  return true;
}
const WIEL_STAP = 60, WIEL_PAUZE = 0.12;
function wiel(world, st, dt, inp) {
  st.wielPauze = Math.max(0, (st.wielPauze || 0) - dt);
  st.wielSom = (st.wielSom || 0) + ((inp.mouse && inp.mouse.wheel) || 0);
  if (Math.abs(st.wielSom) < WIEL_STAP || st.wielPauze > 0) { if (!(inp.mouse && inp.mouse.wheel)) st.wielSom *= 0.9; return; }
  const richting = st.wielSom > 0 ? 1 : -1; st.wielSom = 0; st.wielPauze = WIEL_PAUZE;
  const bruikbaar = WEAPON_KEYS.filter((k) => heeftWapen(world, k));
  if (bruikbaar.length < 2) return;
  const i = Math.max(0, bruikbaar.indexOf(world.weapon));
  world.weapon = bruikbaar[(i + richting + bruikbaar.length) % bruikbaar.length];
}

// Elke frame bij de gast, als zijn eigen scherm loopt (coopgastlokaal.js). Zet world.coopAanvalKnop (coopnet.js stuurt hem mee in de invoer) en meldt
// wapen en patronen aan de host. haken.effect(world, fx) en haken.geluid(world, ev) zijn voor het eigen beeld en geluid van de gast.
const gastHaken = { effect: null, geluid: null };
export function zetGastWapenHaken(h) { Object.assign(gastHaken, h || {}); }
export function gastWapenTik(world, dt, meld) {
  const inp = world.input, p = world.player;
  if (!world.ammo) world.ammo = {};
  const st = world.coopGastWapen || (world.coopGastWapen = { klok: { timer: 0 }, verstuurd: null, sinds: 0, melding: 0 });
  if (!heeftWapen(world, world.weapon)) world.weapon = 'fists';
  const vrij = !!inp && !world.paused && !world.coopInVoertuig && !world.coopBezig && !world.cameraOverride && !(p && (p.swimming || p.state === 'dead' || p.ragdoll)) && !(world.padelGame || world.minigameUntil > world.time);
  if (vrij) {
    for (let i = 1; i <= SLOTS; i++) if (inp.wasPressed && inp.wasPressed(String(i))) kiesSlot(world, i);
    if (inp.mouse) wiel(world, st, dt, inp);
  }
  const key = world.weapon, kan = gastWapenKan(key);
  // de kijker: zoals combat.js updateCombat (world.scoped stuurt de camera van scene3d.js en het richtkruis van aimassist.js); het aanvalsrecht blijft aan de host
  const zicht = vrij && heeftKijker(key) && !!(inp.mouse && inp.mouse.rightDown);
  world.scoped = zicht;
  world.coopZichtKnop = zicht;
  const ingedrukt = vrij && !!(inp.mouse && inp.mouse.down);
  if (ingedrukt && !kan) { st.melding -= dt; if (st.melding <= 0) { st.melding = 3; if (world.addMessage) world.addMessage(WAPEN_TEKST.alleenEigen, 2.5); } }
  const aan = ingedrukt && kan;
  const stap = stapAanvalKlok(st.klok, dt, aan, key, world.ammo[key]);
  if (stap.schiet && WEAPONS[key].kind === 'gun') world.ammo[key] = stap.n;
  if (stap.klik && gastHaken.geluid) gastHaken.geluid(world, { kind: 'weapon', sub: 'empty', weapon: key, x: p.x, y: p.y });
  if (stap.schiet && gastHaken.effect) gastHaken.effect(world, key, p);
  world.coopAanvalKnop = aan;
  // melden: bij een wisseling, als de patronen anders zijn zonder dat je schiet, en af en toe opnieuw
  st.sinds += dt;
  const n = Number.isFinite(world.ammo[key]) ? world.ammo[key] : Infinity, vorig = st.verstuurd;
  const verschil = !vorig || vorig.w !== (kan ? key : '') || (!aan && vorig.n !== n) || st.sinds >= WAPEN_HERHAAL_S;
  if (verschil && meld) {
    const ev = wapenEvent(kan ? key : '', n);
    st.verstuurd = { w: ev.w, n }; st.sinds = 0;
    meld(ev);
  }
  return aan;
}
export function gastWapenWeg(world) { world.coopAanvalKnop = false; world.coopZichtKnop = false; if (world.coopGastWapen) world.scoped = false; world.coopGastWapen = null; }

// ---------------------------------------------------------------- de host (de echte aanval)
// Haken: aanval(world, slot, lichaam, key, hoek, kijker) -> { fx, wacht } of null (combat.js gastAanvalUitvoeren); landing(world, slot, lichaam, wacht) (de klap na het uithalen).
const haken = { aanval: null, landing: null };
export function zetWapenHaken(h) { Object.assign(haken, h || {}); }

export const wapens = (world) => world.coopWapens || (world.coopWapens = {});
export function zetWapen(world, slot, key, n) {
  if (!Number.isInteger(slot) || slot < 1) return false;
  const lijst = wapens(world), w = typeof key === 'string' && gastWapenKan(key) ? key : '';
  const st = lijst[slot] || (lijst[slot] = { w: '', n: 0, klok: { timer: 0 }, fx: null, teller: 0, wacht: null });
  st.w = w; st.n = n;
  return true;
}
export function wapenVerwerk(world, slot, body) { const r = leesWapen(body); return r ? zetWapen(world, slot, r.w, r.n) : false; }
export function wapenWeg(world, slot) {
  const l = lichaamVan(world, slot);
  if (l) { l.coopWapen = undefined; l.coopFx = null; }
  if (world.coopWapens) delete world.coopWapens[slot];
}
export function wapenAllesWeg(world) { for (const s of Object.keys(world.coopWapens || {})) wapenWeg(world, +s); }

// Voor het snapshot (coopnet.js spelerRecord): { w: sleutel, fx, teller } van een gast, of null als hij niets in de hand heeft of zit.
export function wapenVan(world, slot) {
  const st = (world.coopWapens || {})[slot];
  return st ? { w: st.w, fx: st.fx, teller: st.teller } : null;
}

// Een nieuwe flits van een medespeler (#434): de aanval uit het snapshot is een schot en nog niet eerder getekend.
// De gast tekent de flits en een korte kogelstreep bij de loop; de kogel zelf rekent de host uit.
export function nieuwSchot(vorigeStart, fx) {
  return !!fx && fx.type === 'muzzle' && fx.start !== undefined && fx.start !== vorigeStart;
}

// Elke frame bij de host: de aanval van elke gast met een wapen. Pauzeert de wereld voor iedereen, dan gebeurt er niets.
export function wapenTick(world, dt) {
  const lijst = world.coopWapens; if (!lijst) return 0;
  if (world.coopHold || (world.paused && !world.coopDoorloopNu)) return 0;
  const nu = Number.isFinite(world.time) ? world.time : 0;
  let n = 0;
  for (const s of Object.keys(lijst)) {
    const slot = +s, st = lijst[s], l = lichaamVan(world, slot);
    if (!l) continue;
    const zit = !!(l.inVehicle || l.inVeh || l.coopBestuurt), inv = invoerVan(world, slot);
    // wat de anderen zien: het wapen in zijn hand (niet in een voertuig of in het water), en de zwaai of het schot gedurende een korte tijd.
    // Het wapen verdwijnt niet als de patronen op zijn (#434): st.w verandert alleen als de gast zelf een ander wapen kiest.
    l.coopWapen = !zit && !l.swimming && !l.water ? st.w : '';
    if (st.fx && nu - st.fx.start > 1.2) st.fx = null;
    l.coopFx = st.fx && !zit ? { type: st.fx.type, swing: st.fx.swing, start: st.fx.start } : null;
    if (st.wacht && nu >= st.wacht.at) { const w = st.wacht; st.wacht = null; if (haken.landing && !zit) haken.landing(world, slot, l, w); }
    const knop = !!(inv && ((inv.buttons | 0) & KNOP_AANVAL)) && !zit && !l.swimming && !l.water && l.state !== 'dead' && !l.coopWacht;
    const hoek = inv && Number.isFinite(inv.yaw) ? inv.yaw : l.angle || 0;
    const kijker = !!(inv && ((inv.buttons | 0) & KNOP_ZICHT)) && heeftKijker(st.w) && !zit && !l.swimming && !l.water && l.state !== 'dead' && !l.coopWacht;
    if (knop || kijker) l.angle = hoek; // zoals de speler: wie de knop vasthoudt kijkt waar de camera heen kijkt
    const stap = stapAanvalKlok(st.klok, dt, knop && gastWapenKan(st.w), st.w, st.n);
    if (!stap.schiet) continue;
    st.n = stap.n;
    const r = haken.aanval ? haken.aanval(world, slot, l, st.w, hoek, kijker) : null;
    st.teller++; n++;
    const w = WEAPONS[st.w];
    st.fx = r && r.fx ? { type: r.fx.type, swing: r.fx.swing, start: nu } : { type: w.kind === 'melee' ? 'melee' : 'muzzle', swing: w.swing, start: nu };
    if (r && r.wacht) st.wacht = r.wacht;
    l.coopFx = { ...st.fx };
  }
  return n;
}
