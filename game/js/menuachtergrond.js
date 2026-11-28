// De levende achtergrond van het hoofdmenu (28-11, besluit eigenaar): een langzame vlucht rond de Martinitoren en de Grote Markt in het
// gouden ochtendlicht, achter het menu. Het is dezelfde wereld als het spel zelf (geen tweede wereld in het geheugen): de camera is een
// cameraOverride, de speler staat tijdelijk bij de toren zodat de straten en het verkeer er bij horen, en alles gaat terug als de
// startvraag klaar is (stopMenuAchtergrond). Het laadscherm wacht nergens op: de luchtfoto blijft staan tot de eerste tegels er zijn,
// dan vervaagt hij naar de wereld (CSS: body.hm-3d-klaar). Alleen lokaal, nooit netwerk (Samen spelen begint pas na de keuze).
//
// Puur en testbaar: menuPose (de baan), menuAchtergrondPlan (wanneer wat). De rest is de dunne laag met de wereld en de DOM.
import { hoofdspeler } from './players.js';
import { isPauseMenuOpen } from './pausestate.js';

export const TOREN = Object.freeze({ x: 213.81, y: 9.9 }); // de Martinitoren (Grote Markt), zelfde punt als de openingsfilm
export const MENU_UUR = 4.8; // gouden ochtend (spelklok, zon ~17 graden): warm licht en lange schaduwen, de zomerzon komt hier vroeg op
export const MENU_FPS_S = 1 / 30; // 30 beelden per seconde is genoeg achter een menu
export const MENU_FPS_VOL_S = 1 / 20; // een groot paneel (Instellingen, Opgeslagen spellen) dekt bijna alles af
export const KLAAR_MAX_S = 9; // zo lang wacht de luchtfoto hoogstens op de eerste tegels; daarna toont de wereld wat er is
export const KLAAR_RUST_BEELDEN = 12; // zoveel beelden achter elkaar zonder wachtend gebouw of weg telt als "de eerste tegels zijn er"
export const ACHTERGROND_STRAAL_M = 200; // het stuk stad dat gehouden wordt: klein, de rest van de provincie blijft uit beeld

// De baan: een cirkel rond de toren met een zachte ademhaling in straal en hoogte, een volle ronde in ~5 minuten. De camera kijkt iets
// opzij van de toren, zodat de toren rechts van het menu staat. t in seconden, hoek0 de beginhoek.
export function menuPose(t, hoek0 = 0, toren = TOREN) {
  const a = hoek0 + t * 0.021;
  const R = 150 + 18 * Math.sin(t * 0.031); // dichtbij genoeg voor de mist van het spel (de verte vervaagt vanaf 150 m)
  const z = 74 + 6 * Math.sin(t * 0.047 + 1);
  const px = toren.x + Math.cos(a) * R, py = toren.y + Math.sin(a) * R;
  // het kijkpunt schuift zijwaarts (haaks op de kijkrichting), zodat de toren naast het menu (links) in beeld staat
  const fx = toren.x - px, fy = toren.y - py;
  const len = Math.hypot(fx, fy) || 1;
  const zx = (fy / len) * ZIJ_M, zy = (-fx / len) * ZIJ_M;
  return { position: { x: px, y: py, z }, lookAt: { x: toren.x + zx, y: toren.y + zy, z: 38 }, fov: 52 };
}
const ZIJ_M = 38;

// Wat de laag nu doet. aan: het hoofdmenu staat op het scherm; klaar: de eerste tegels waren er al; rust: opeenvolgende beelden zonder werk;
// sinds: seconden sinds het menu verscheen; tegelsIn: de gehouden tegels zijn binnen; paneel: een groot paneel dekt het beeld.
export function menuAchtergrondPlan({ aan = false, klaar = false, rust = 0, sinds = 0, tegelsIn = false, paneel = false, verborgen = false } = {}) {
  if (!aan || verborgen) return { teken: false, wereld: aan && klaar, interval: MENU_FPS_S };
  const nuKlaar = klaar || (tegelsIn && rust >= KLAAR_RUST_BEELDEN) || sinds >= KLAAR_MAX_S;
  return { teken: true, wereld: nuKlaar, interval: paneel ? MENU_FPS_VOL_S : MENU_FPS_S };
}

let actief = null;

const noop = () => {};

// Start de achtergrond. env = { render, tick, relocate, wacht, licht } (main.js startEnv + streamPending; wacht() geeft { buildings, roads }; licht(world) = refreshDayNight). Geeft stop terug; een tweede aanroep geeft dezelfde stop.
export function startMenuAchtergrond(world, env = {}) {
  if (actief) return actief.stop;
  if (typeof document === 'undefined' || !world || !world.map || !env.render) return noop;
  const map = world.map;
  const p = hoofdspeler(world);
  if (!p) return noop;
  const home = { x: p.x, y: p.y };
  const homeClock = world.clock;
  const homeWeather = world.weather;
  const toren = (() => { const l = ((map.meta && map.meta.landmarks) || []).find((x) => x && x.name === 'Martinitoren' && Number.isFinite(x.x) && Number.isFinite(x.y)); return l ? { x: l.x, y: l.y } : TOREN; })();
  const hoek0 = Math.random() * Math.PI * 2;
  const st = { stop: null, raf: 0, t: 0, last: 0, acc: 0, aanSinds: 0, klaar: false, rust: 0, tegelsIn: false, gestart: false, weg: false, beelden: 0 };
  const body = document.body;
  const sluitKlasse = () => { body.classList.remove('hm-3d'); body.classList.remove('hm-3d-klaar'); };

  // de tegels rond de toren worden gevraagd en vastgehouden terwijl het menu er nog niet is: het boot-werk gaat gewoon door
  try {
    Promise.resolve(map.registerShots([{ at: [toren.x, toren.y] }], { radius: ACHTERGROND_STRAAL_M, token: 'menu' })).then(() => { st.tegelsIn = true; }, () => { st.tegelsIn = true; });
  } catch (e) { st.tegelsIn = true; }

  // het licht (zon, hemel, mist) volgt world.dayNight, en dat wordt alleen door de klok van de spellus en deze aanroep bijgewerkt
  const vernieuwLicht = () => { try { if (env.licht) env.licht(world); } catch (e) { /* het licht blijft dan zoals het was */ } };
  const zetOp = () => {
    if (st.gestart) return;
    st.gestart = true;
    world.menuCam = true;
    world.clock = MENU_UUR;
    vernieuwLicht();
    if (homeWeather) world.weather = { ...homeWeather, active: false, kind: undefined, peak: 0, intensity: 0, mist: 0, overcast: 0, duration: Infinity };
    try { (env.relocate || ((x, y) => { p.x = x; p.y = y; }))(toren.x, toren.y + 60); } catch (e) { /* de straten volgen dan later */ }
  };
  const zetTerug = () => {
    if (!st.gestart) return;
    st.gestart = false;
    world.menuCam = false;
    world.clock = homeClock;
    world.weather = homeWeather;
    vernieuwLicht();
    if (world.cameraOverride && world.cameraOverride.bron === 'hoofdmenu') world.cameraOverride = null;
    if (Math.hypot(p.x - home.x, p.y - home.y) > 1) { try { (env.relocate || ((x, y) => { p.x = x; p.y = y; }))(home.x, home.y); } catch (e) { p.x = home.x; p.y = home.y; } }
  };

  const lus = (now) => {
    if (st.weg) return;
    st.raf = requestAnimationFrame(lus);
    const dt = st.last ? Math.min(0.1, (now - st.last) / 1000) : 0;
    st.last = now;
    const ov = document.getElementById('online-start');
    const aan = !!(ov && ov.classList.contains('sp-hm'));
    const paneel = aan && (!!document.getElementById('saveslots') || isPauseMenuOpen());
    const verborgen = document.hidden;
    const plan = menuAchtergrondPlan({ aan, klaar: st.klaar, rust: st.rust, sinds: st.aanSinds, tegelsIn: st.tegelsIn, paneel, verborgen });
    // het menu is weg (de kaarten van Samen spelen): de luchtfoto/laadscherm keert terug en er wordt niets getekend
    if (!aan) { st.aanSinds = 0; body.classList.remove('hm-3d'); return; }
    if (!plan.teken) return;
    if (!st.gestart) zetOp();
    st.aanSinds += dt;
    body.classList.add('hm-3d');
    st.acc += dt;
    if (st.acc < plan.interval) return;
    const stap = Math.min(0.1, st.acc);
    st.acc = 0;
    st.t += stap;
    world.cameraOverride = { ...menuPose(st.t, hoek0, toren), cut: true, bron: 'hoofdmenu' };
    try { if (env.tick) env.tick(stap); } catch (e) { console.error('hoofdmenu-achtergrond tick', e); }
    try { env.render(stap); st.beelden++; } catch (e) { console.error('hoofdmenu-achtergrond render', e); }
    const sp = env.wacht ? env.wacht() : { buildings: 0, roads: 0 };
    st.rust = sp.buildings + sp.roads === 0 ? st.rust + 1 : 0;
    if (plan.wereld && !st.klaar) st.klaar = true;
    if (plan.wereld) body.classList.add('hm-3d-klaar');
  };
  st.raf = requestAnimationFrame(lus);

  st.stop = () => {
    if (st.weg) return;
    st.weg = true;
    cancelAnimationFrame(st.raf);
    sluitKlasse();
    zetTerug();
    try { if (map.releaseShots) map.releaseShots(); } catch (e) { /* niet erg */ }
    if (actief === st) actief = null;
  };
  actief = st;
  return st.stop;
}

export const stopMenuAchtergrond = () => { if (actief) actief.stop(); };
export const menuAchtergrondActief = () => !!actief;
// voor de proefruns: hoeveel beelden de achtergrond tekende en of de stad al voor de luchtfoto staat
export const menuAchtergrondStand = () => (actief ? { beelden: actief.beelden, klaar: actief.klaar, t: actief.t } : null);
