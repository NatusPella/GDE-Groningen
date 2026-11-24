// De radio bedienen zonder menu (22-11, #988, #495): de pure regels, node-veilig (geen DOM, geen opslag, geen audio).
// radio.js (de glue) leest hier de N-toets (kort = aan of uit, vasthouden = het zenderwiel, Shift+N = volgende, Alt+N = vorige) en bouwt het
// zenderwiel; actionradial.js tekent het (hetzelfde wiel als het acties-wiel van de controller: Overzicht vasthouden) en gamepad.js stuurt de
// stick en de knoppen erheen. Op de controller bestaat er geen aparte radioknop: in een voertuig is geen knop vrij (#495), dus staat de radio
// in het acties-wiel (controls.js WHEEL_ITEMS: radio, zender, vorige zender, zenders) en te voet is de D-pad omhoog de N-toets zelf.
// scripts/radiocontrol_test.mjs loopt alles in node. Alle namen zijn verzonnen (radiochannels.js).
import { PAD_MAPS, PAD_COOP, PAD_BUTTONS, WHEEL_HOLD_MS, wheelItemsFor } from './controls.js';

// Het zenderwiel is een pagina met een lijst: elke zender met een icoon en zijn naam, de huidige gemarkeerd, 'Binnenkort' grijs.
const RADIO_DIAL_TITLE = 'Zenders';
export const RADIO_OFF = '__uit';

// list: channelList() uit radio.js ({ id, name, dj, sub, status: 'open' | 'soon', active }); een geheime zender die nog niet gevonden is
// ('hidden') staat er nooit in. De laatste rij zet de radio uit. Geeft de pagina's voor actionradial.js openRadialPages.
export function radioDialPages(list, { currentId = null, on = true } = {}) {
  const items = [];
  for (const z of list || []) {
    if (!z || z.status === 'hidden') continue;
    const open = z.status === 'open';
    items.push({
      id: 'zender-' + z.id, radio: z.id, label: z.name, sub: open ? z.dj : 'Binnenkort', icon: 'muziek',
      disabled: !open, active: !!on && z.id === currentId,
    });
  }
  items.push({ id: 'zender-uit', radio: RADIO_OFF, label: 'Radio uit', sub: '', icon: 'geluid_uit', disabled: false, active: !on });
  return [{ id: 'zenders', title: RADIO_DIAL_TITLE, layout: 'lijst', items }];
}

// De rij waar het wiel op opent: de huidige zender (of Radio uit), anders de eerste te kiezen rij.
export function radioDialRow(pages) {
  const items = (pages && pages[0] && pages[0].items) || [];
  const i = items.findIndex((it) => it.active);
  if (i >= 0) return i;
  const j = items.findIndex((it) => !it.disabled);
  return j < 0 ? -1 : j;
}

// Wat een gekozen rij doet: { type: 'uit' } | { type: 'zender', channel } | null (Binnenkort of onbekend: niets).
export function radioDialResult(it) {
  if (!it || it.disabled || typeof it.radio !== 'string') return null;
  return it.radio === RADIO_OFF ? { type: 'uit' } : { type: 'zender', channel: it.radio };
}

// --- N: kort, vasthouden, met Shift of Alt -------------------------------------------------------------------------------------------
// Eén stap per beeld. pressed: de toets ging dit beeld omlaag; down: hij is ingedrukt; shift, alt: de wijzigers; dt in seconden;
// blocked: een menu of filmpje houdt de toets tegen. Geeft 'toggle' (kort: bij het loslaten, zodat vasthouden niet ook de radio omzet),
// 'wheel' (na de houdtijd, één keer), 'next' (Shift+N, meteen), 'prev' (Alt+N, meteen) of null. De houdtijd is die van het acties-wiel.
export function createNKey({ holdS = WHEEL_HOLD_MS / 1000 } = {}) {
  let mode = '', held = 0;
  return {
    step({ pressed = false, down = false, shift = false, alt = false, dt = 0, blocked = false } = {}) {
      if (blocked) { mode = ''; held = 0; return null; }
      if (pressed) {
        held = 0;
        if (shift) { mode = 'klaar'; return 'next'; }
        if (alt) { mode = 'klaar'; return 'prev'; }
        mode = 'wacht';
      }
      if (mode === 'wacht') {
        if (!down) { mode = ''; return 'toggle'; }
        held += dt;
        if (held >= holdS) { mode = 'klaar'; return 'wheel'; }
        return null;
      }
      if (mode === 'klaar' && !down) mode = '';
      return null;
    },
    state: () => mode,
  };
}

// --- Samen spelen ------------------------------------------------------------------------------------------------------------------------
// De bestuurder kiest de zender van het voertuig; een passagier volgt hem en kan niet wisselen (radio aan of uit blijft zijn eigen keuze: de
// radio is lokaal). Passagier: in een echte sessie, in een voertuig, en niet achter het stuur. Gastheer: hij gaf het stuur aan een gast
// (coopWielSlot). Gast: hij zit in het voertuig van de host zonder bestuurder of het stuur van de bijrijder te zijn (coopBestuurder, coopWiel).
export function radioPassenger(w, inVehicle) {
  if (!w || !inVehicle || !w.coopNet || w.coopSolo) return false;
  if (w.coopRole === 'client') return !!w.coopInVoertuig && !w.coopBestuurder && !w.coopWiel;
  return w.coopWielSlot != null;
}
export const PASSENGER_TEXT = 'De bestuurder kiest de zender.';

// --- de routes per situatie (voor de docs en de tests) -------------------------------------------------------------------------
// Waar zit elke radioactie op het pad in een situatie van controls.js PAD_MAPS? Een eigen knop (D-pad omhoog is N te voet) of het acties-wiel.
// Geeft { toggle, next, prev, dial }: 'dpad-up' (een slot) of 'acties-wiel' of null; dial is een lijst (houd de N-knop, of het acties-wiel).
export function radioPaths(ctx, samen = false) {
  const map = PAD_MAPS[ctx];
  if (!map) return null;
  const co = (samen && PAD_COOP[ctx]) || {};
  const direct = PAD_BUTTONS.find((s) => (Object.hasOwn(co, s) ? co[s] : map[s]) === 'n') || null;
  const ids = new Set();
  for (const p of wheelItemsFor(ctx, { samen })) for (const it of p.items) ids.add(it.id);
  const via = (id) => (ids.has(id) ? 'acties-wiel' : null);
  const dial = [];
  if (direct) dial.push('houd ' + direct);
  if (ids.has('zenderwiel')) dial.push('acties-wiel');
  return { toggle: direct || via('radio'), next: via('zender'), prev: via('vorige-zender'), dial };
}
