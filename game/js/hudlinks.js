// De locatiekaart naast de minimap (straat + plaats/buurt, "Bisschopskwartier / Grunn", #1079): één bron van waarheid voor
// hoe hoog hij staat. Standaard zo laag mogelijk (onderkant gelijk aan de onderkant van de minimap); alleen als er werkelijk
// iets onder getoond wordt gaat hij omhoog, precies zoveel als wat eronder komt (plus de gap). Puur, zonder DOM: hud_panel.js
// meet de hoogtes bij een verandering (ResizeObserver, geen meting per frame) en zet het resultaat als één CSS-variabele.
//
//   locatieLift({ onder, hindernissen, kaart, gap, max })   hoe ver de kaart boven zijn laagste plek staat (px, HUD-px)
//   locatieHysterese(staat, wil, nu, opties)                 wanneer die stand echt verandert (omhoog 300 ms, omlaag 600 ms)
//   locatieVerschuiving(stroomH, gap, lift)                  translateY (px, omlaag) voor een kaart die in de kolom boven `onder` staat
//
// onder: items in de kolom onder de kaart, [{ id, h, zichtbaar }] (nu: het speler-blok met de meters; verborgen = geen ruimte).
// hindernissen: dingen in de onderrand die de kaart zouden raken (ondertitels), [{ id, x0, x1, top }] in HUD-px van de bovenrand.
// kaart: { x0, x1, bodem } de plek op de laagste stand; alleen nodig voor hindernissen.
export const LOCATIE_GAP = 10;          // px: de ruimte tussen kaart en wat eronder staat (de gap van .hud-fcol)
export const LOCATIE_OMHOOG_MS = 300;   // een item dat korter dan dit zichtbaar is laat de kaart niet bewegen
export const LOCATIE_OMLAAG_MS = 600;   // terug omlaag wacht langer, zodat een knipperend item de kaart niet laat pompen
export const LOCATIE_MOVE_MS = 200;     // de glijdende verschuiving zelf (CSS), hoogstens 250 ms
export const LOCATIE_MAX = 400;
export const LOCATIE_EPS = 2;           // een verschil van minder dan dit is meetruis en telt niet

const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

export function locatieLift({ onder = [], hindernissen = [], kaart = null, gap = LOCATIE_GAP, max = LOCATIE_MAX } = {}) {
  let lift = 0, door = null;
  for (const o of Array.isArray(onder) ? onder : []) {
    if (!o || o.zichtbaar === false || !eindig(o.h) || o.h <= 0) continue;
    lift += o.h + gap;
    door = o.id || door;
  }
  if (kaart && eindig(kaart.bodem) && eindig(kaart.x0) && eindig(kaart.x1)) {
    for (const h of Array.isArray(hindernissen) ? hindernissen : []) {
      if (!h || !eindig(h.top) || !eindig(h.x0) || !eindig(h.x1)) continue;
      if (h.x0 >= kaart.x1 || h.x1 <= kaart.x0) continue;      // staat naast de kaart, niet eronder
      const nodig = kaart.bodem - h.top + gap;                  // de kaart moet zijn onderkant `gap` boven de hindernis hebben
      if (nodig > lift) { lift = nodig; door = h.id || door; }
    }
  }
  return { lift: Math.min(Math.max(0, lift), max), door };
}

// De kaart staat in de kolom boven het blok eronder (stroomH + gap hoog, ook als dat onzichtbaar is: het houdt zijn ruimte).
// Op de laagste plek (lift 0) schuift de kaart er dus stroomH + gap omlaag; bij lift = stroomH + gap blijft hij waar de stroom hem zet.
export const locatieVerschuiving = (stroomH, gap, lift) => Math.max(0, (eindig(stroomH) ? stroomH : 0) + gap - (eindig(lift) ? lift : 0));

// Hysterese: de toegepaste stand verandert pas als de gewenste stand 300 ms (omhoog) of 600 ms (omlaag) aaneen anders is.
// staat: null bij de start (dan geldt `wil` meteen) of het vorige resultaat. Geeft { staat, lift, wacht } met wacht = ms tot
// de volgende controle (null = niets te wachten); de aanroeper plant daar één timer voor.
export function locatieHysterese(staat, wil, nu, { omhoog = LOCATIE_OMHOOG_MS, omlaag = LOCATIE_OMLAAG_MS, eps = LOCATIE_EPS } = {}) {
  const w = eindig(wil) ? Math.max(0, wil) : 0;
  if (!staat) return { staat: { lift: w, wil: w, sinds: nu, richting: 0 }, lift: w, wacht: null };
  const verschil = w - staat.lift;
  if (Math.abs(verschil) < eps) return { staat: { lift: staat.lift, wil: w, sinds: nu, richting: 0 }, lift: staat.lift, wacht: null };
  const richting = verschil > 0 ? 1 : -1;
  const sinds = staat.richting === richting ? staat.sinds : nu;   // een omkering of terugval begint opnieuw
  const duur = richting > 0 ? omhoog : omlaag;
  if (nu - sinds >= duur) return { staat: { lift: w, wil: w, sinds: nu, richting: 0 }, lift: w, wacht: null };
  return { staat: { lift: staat.lift, wil: w, sinds, richting }, lift: staat.lift, wacht: duur - (nu - sinds) };
}
