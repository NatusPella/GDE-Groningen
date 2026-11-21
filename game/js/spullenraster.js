// De galerij van Spullen (spullen-ui 21-11): de maten, de focus en de wachtrij van de 3D-tegels. Puur: geen three, geen DOM.
// spullen.js tekent de tegels, spullenthumbs.js vult ze met plaatjes; hier staan alleen de rekenregels, zodat ze testbaar zijn
// (scripts/spullenraster_test.mjs). Samen spelen: Spullen zijn per speler (#429); dit is lokale weergave en stuurt niets.

export const GAP = 12; // ruimte tussen tegels (px, voor de ui-schaal)
export const DETAIL_MAX = 0.3; // het detail neemt hooguit 30% van de breedte
export const DETAIL_MIN = 260;
const DETAIL_CAP = 480;
const GOOT = 32; // lucht tussen raster en detail
const THUMB_STEP = 32; // plaatjesbreedte in stappen van 32 px, zodat een klein verschil in breedte dezelfde cachesleutel geeft
const THUMB_MIN = 128;
const THUMB_MAX = 256;
export const THUMB_RATIO = 0.75; // hoogte per breedte van het plaatje (4:3)
export const TEGEL_MIN = { ruim: 156, krap: 136 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const toInt = (v, d) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : d);

// De maten van het raster voor een breedte (px van het gebied met raster en detail, zoals gemeten na de ui-schaal) en de
// pixelverhouding van het scherm. Het detail is hooguit 30% van de breedte (maar nooit smaller dan 300 px, tenzij het scherm te
// smal is); het raster krijgt de rest en zoveel kolommen als erin passen.
export function rasterMaat({ breedte, dpr = 1 } = {}) {
  const b = Math.max(0, toInt(breedte, 0));
  if (b < 640) return { smal: true, detailB: 0, rasterB: b, kolommen: Math.max(2, Math.floor((b + GAP) / (TEGEL_MIN.krap + GAP))), tegelB: 0, thumbW: THUMB_MIN, thumbH: Math.round(THUMB_MIN * THUMB_RATIO) };
  const detailB = clamp(Math.floor(b * DETAIL_MAX), DETAIL_MIN, DETAIL_CAP);
  const rasterB = b - detailB - GOOT;
  const min = b < 1100 ? TEGEL_MIN.krap : TEGEL_MIN.ruim;
  const kolommen = Math.max(2, Math.floor((rasterB + GAP) / (min + GAP)));
  const tegelB = Math.floor((rasterB - GAP * (kolommen - 1)) / kolommen);
  // het plaatje is iets groter dan de tegel (scherp bij ui-schaal 1,5 en scherpe schermen), maar nooit meer dan 256 px breed
  const target = tegelB * clamp(Number(dpr) || 1, 1, 1.5);
  const thumbW = clamp(Math.ceil(target / THUMB_STEP) * THUMB_STEP, THUMB_MIN, THUMB_MAX);
  return { smal: false, detailB, rasterB, kolommen, tegelB, thumbW, thumbH: Math.round(thumbW * THUMB_RATIO) };
}

// Het aantal kolommen zoals de browser het werkelijk legde: het aantal tegels op de eerste rij (alle tegels met dezelfde top).
export function kolommenUitTops(tops) {
  if (!tops || !tops.length) return 1;
  let n = 0;
  for (const t of tops) { if (Math.abs(t - tops[0]) <= 2) n++; else break; }
  return Math.max(1, n);
}

// Pijltjes en Home/End door het raster. Geeft de nieuwe index, of null als er in die richting niets meer is (dan neemt het menu de
// toets over: omhoog naar het zoekveld, links naar de rail, rechts naar het detail). Omlaag vanaf een volle rij naar een rij die
// korter is, landt op de laatste tegel.
export function focusStep(index, aantal, kolommen, toets) {
  if (!aantal) return null;
  const k = Math.max(1, kolommen | 0);
  const i = clamp(index | 0, 0, aantal - 1);
  switch (toets) {
    case 'left': return i % k === 0 ? null : i - 1;
    case 'right': return i % k === k - 1 || i === aantal - 1 ? null : i + 1;
    case 'up': return i - k < 0 ? null : i - k;
    case 'down': {
      if (i + k < aantal) return i + k;
      const laatsteRij = Math.floor((aantal - 1) / k);
      return Math.floor(i / k) < laatsteRij ? aantal - 1 : null;
    }
    case 'home': return i === 0 ? null : 0;
    case 'end': return i === aantal - 1 ? null : aantal - 1;
    case 'pageup': return i === 0 ? null : Math.max(0, i - k * 3);
    case 'pagedown': return i === aantal - 1 ? null : Math.min(aantal - 1, i + k * 3);
    default: return null;
  }
}

// Welke tegels (index) in of vlak bij het beeld staan: rijen vanaf de scrollstand, met `marge` px erboven en eronder.
export function visibleIndices({ scrollTop = 0, hoogte = 0, rijH = 1, kolommen = 1, aantal = 0, marge = 120 } = {}) {
  if (!aantal || rijH <= 0) return [];
  const k = Math.max(1, kolommen | 0);
  const eerste = Math.max(0, Math.floor((scrollTop - marge) / rijH));
  const laatste = Math.floor((scrollTop + hoogte + marge) / rijH);
  const van = eerste * k;
  const tot = Math.min(aantal, (laatste + 1) * k);
  const uit = [];
  for (let i = van; i < tot; i++) uit.push(i);
  return uit;
}

// De sleutel van een plaatje: model (de hele spec, dus ook de kleuren) plus maat. Gelijke dingen (vijf keer dezelfde band) delen één plaatje.
export const thumbSleutel = (spec, w, h) => (spec ? `${w}x${h}|${JSON.stringify(spec)}` : '');

// De wachtrij voor een gedeelte van de tegels: wat nog geen plaatje heeft, het dichtst bij de geselecteerde tegel eerst, hooguit `max`
// aanvragen per ronde (de rest volgt bij het scrollen), nooit twee keer dezelfde sleutel. `items` zijn { key, viewer }.
export function thumbPlan({ indices, items, klaar = new Set(), requested = new Set(), gekozen = -1, w, h, max = 18 } = {}) {
  const uit = [];
  const gezien = new Set();
  const order = [...(indices || [])].sort((a, b) => (Math.abs(a - gekozen) - Math.abs(b - gekozen)) || a - b);
  for (const i of order) {
    const it = items[i];
    const sleutel = it && thumbSleutel(it.viewer, w, h);
    if (!sleutel || klaar.has(sleutel) || requested.has(sleutel) || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push({ i, key: it.key, sleutel, spec: it.viewer });
    if (uit.length >= max) break;
  }
  return uit;
}

// Hoeveel verschillende modellen er voor een lijst nodig zijn (voor het budget en de test).
export function uniekeModellen(items, w, h) {
  const s = new Set();
  for (const it of items || []) { const k = it && thumbSleutel(it.viewer, w, h); if (k) s.add(k); }
  return s.size;
}

// Cachebeleid: de plaatjes horen bij het menu. Bij sluiten of een ander tabblad gaan ze weg (releaseSnapshots); binnen één opening
// blijft elk plaatje staan zolang het past, daarboven vallen de oudste af. Geeft de sleutels die weg moeten.
export const CACHE_MAX = 160;
export function snoei(order, max = CACHE_MAX) {
  return order.length > max ? order.slice(0, order.length - max) : [];
}
