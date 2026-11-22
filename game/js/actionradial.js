// Het acties-wiel van de controller (22-11): de stand en de keuzelogica, puur en zonder DOM (scripts/controller_ingame_test.mjs).
// De onderdelen per situatie staan in controls.js (wheelItemsFor); gamepad.js opent het met een lange druk op Overzicht, stuurt de
// stick en de knoppen erheen en zet de gekozen toets om in dezelfde toetsgebeurtenissen als het toetsenbord. actionradialui.js tekent het.
// Lokaal per speler: er gaat niets over het net.
import { wheelItemsFor } from './controls.js';

const st = { open: false, ctx: '', pages: [], page: 0, sel: -1 };
const listeners = new Set();
let runner = null;

/** gamepad.js zet hier wat een gekozen onderdeel doet (de toets sturen): een keuze met A en een klik met de muis lopen zo langs hetzelfde pad. */
export function setRadialRunner(fn) { runner = fn; }

export function onRadialChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }
const emit = () => { for (const cb of listeners) cb(radialModel()); };

export const radialIsOpen = () => st.open;

/** De stand voor het tekenen: de pagina met haar onderdelen, het gekozen onderdeel (-1: nog niets), het aantal pagina's. */
export function radialModel() {
  const page = st.pages[st.page] || { id: '', title: '', items: [] };
  return { open: st.open, ctx: st.ctx, page: st.page, pages: st.pages.length, title: page.title, items: page.items, sel: st.sel };
}

/** Opent het wiel voor een situatie. Geeft false als de situatie niets te kiezen heeft (dan blijft de kaartknop gewoon de kaart). */
export function openRadial(ctx, opts = {}) {
  const pages = wheelItemsFor(ctx, opts);
  if (!pages.length) return false;
  st.open = true; st.ctx = ctx; st.pages = pages; st.page = 0; st.sel = -1;
  emit();
  return true;
}

export function closeRadial() {
  if (!st.open) return;
  st.open = false; st.pages = []; st.sel = -1;
  emit();
}

const count = () => (st.pages[st.page] ? st.pages[st.page].items.length : 0);

/** De stick: het onderdeel in die richting (bovenaan begint het, met de klok mee). Binnen de dode zone verandert er niets. Geeft de nieuwe keuze. */
export function radialAim(x, y, dead = 0.5) {
  const n = count();
  if (!n || Math.hypot(x, y) < dead) return st.sel;
  let ang = Math.atan2(x, -y);
  if (ang < 0) ang += Math.PI * 2;
  const i = Math.round(ang / (Math.PI * 2 / n)) % n;
  if (i !== st.sel) { st.sel = i; emit(); }
  return st.sel;
}

/** De D-pad: rechts en omlaag naar het volgende onderdeel, links en omhoog naar het vorige; rond aan de randen. */
export function radialStep(dir) {
  const n = count();
  if (!n) return -1;
  const fwd = dir === 'right' || dir === 'down';
  st.sel = st.sel < 0 ? (fwd ? 0 : n - 1) : (st.sel + (fwd ? 1 : -1) + n) % n;
  emit();
  return st.sel;
}

/** LB en RB: een pagina verder (delta 1) of terug (-1); rond. Een wiel met een pagina doet niets. */
export function radialPage(delta) {
  const n = st.pages.length;
  if (n < 2) return st.page;
  st.page = (st.page + delta + n) % n; st.sel = -1;
  emit();
  return st.page;
}

/** Kiest het gekozen onderdeel en sluit het wiel; null (en het wiel blijft open) als er nog niets gekozen is. */
export function radialChoose() {
  const page = st.pages[st.page];
  const it = page && st.sel >= 0 ? page.items[st.sel] : null;
  if (!it) return null;
  closeRadial();
  if (runner) runner(it);
  return it;
}

/** Kiest een bepaald onderdeel (een klik met de muis op het wiel). */
export function radialPick(i) {
  st.sel = i;
  return radialChoose();
}

/** De toetsen van een onderdeel in volgorde van indrukken (down) en loslaten (up): Shift eerst in, laatst uit. */
export function itemKeys(it) {
  const keys = it.shift ? ['shift', it.key] : [it.key];
  return { down: keys, up: [...keys].reverse() };
}
