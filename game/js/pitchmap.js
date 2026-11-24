// De kaartlaag "Standplaatsen" (Snackimperium, epic #1095, #1102): welke standplaatsen er in beeld zijn, met stand (van jou, van Us Mem Snacks, van een medespeler, vrij), prijs en
// wagen. Puur: geen DOM, geen canvas, geen klok (scripts/pitchmap_test.mjs); mapview.js tekent wat dit teruggeeft (pitchdraw.js). Zelfde stijl als de laag Te koop (forsalemap.js).
//
// Kleurtaal (DS3): vrij = policeBlue met een streeplijn en een cirkel, van jou = greenLight vol, van Us Mem Snacks = rood met een ruit, medespeler = zijn kleur met een vierkant.
// Geel blijft gereserveerd voor 'volg dit'-doelen. Nooit alleen kleur: elke stand heeft een eigen vorm en lijnpatroon.

export const MIN_SCALE = 0.004;          // daaronder (de hele provincie in beeld) zijn de plekken te klein om te lezen, maar de punten blijven: tot 16 stuks
export const LABEL_SCALE = 0.02;         // vanaf hier een kaartje met de naam
export const PICK_PX = 16;               // zo ver (in pixels) van een punt telt een klik nog

export const STATES = {
  vrij: { shape: 'circle', dash: [6, 4], ink: 'policeBlue', label: 'Vrij: te koop als vergunning' },
  jij: { shape: 'disc', dash: [], ink: 'greenLight', label: 'Van jou' },
  usmem: { shape: 'diamond', dash: [], ink: 'red', label: 'Van Us Mem Snacks' },
  medespeler: { shape: 'square', dash: [3, 3], ink: 'routeUser', label: 'Van een medespeler' },
};

// rows: snacklive.spotRows(); rect = [x0, y0, x1, y1] in wereldmeters; scale = pixels per meter.
export function pitchMarkerView(rows, rect, scale) {
  if (!Array.isArray(rows) || !rows.length || !(scale >= MIN_SCALE)) return { mode: 'none', markers: [] };
  const [x0, y0, x1, y1] = rect;
  const margin = 60 / Math.max(scale, 1e-6);
  const markers = [];
  for (const r of rows) {
    if (r.x < x0 - margin || r.x > x1 + margin || r.y < y0 - margin || r.y > y1 + margin) continue;
    const st = STATES[r.status] || STATES.vrij;
    const sub = r.status === 'jij' ? (r.wagon ? 'TAM & TES staat er' : `nog ${r.daysLeft} dagen`) : r.status === 'usmem' ? `overnemen ${fmt(r.ask)}` : r.status === 'vrij' ? `vergunning ${fmt(r.price)}` : (r.claim ? r.claim.name : 'medespeler');
    markers.push({ id: r.id, x: r.x, y: r.y, state: r.status, shape: st.shape, dash: st.dash, ink: st.ink, color: r.claim && r.claim.color ? r.claim.color : null, label: r.short, sub, wagon: r.wagon, showLabel: scale >= LABEL_SCALE });
  }
  return { mode: 'markers', markers };
}
const fmt = (n) => `€${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

// Een klik op de kaart: de dichtstbijzijnde plek binnen PICK_PX pixels, of null.
export function pickMarker(markers, wx, wy, scale) {
  if (!Array.isArray(markers) || !(scale > 0)) return null;
  const reach = PICK_PX / scale;
  let best = null, bd = reach;
  for (const m of markers) { const d = Math.hypot(m.x - wx, m.y - wy); if (d <= bd) { bd = d; best = m; } }
  return best;
}

export const LEGEND = [
  { state: 'vrij', note: 'blauwe cirkel met streeplijn: een standplaats die nog vrij is, met de prijs van de vergunning' },
  { state: 'jij', note: 'groene schijf: een standplaats van jou' },
  { state: 'usmem', note: 'rode ruit: een standplaats van Us Mem Snacks, met de prijs om hem over te nemen' },
  { state: 'medespeler', note: 'vierkant in een andere kleur: van een medespeler in deze sessie' },
];
