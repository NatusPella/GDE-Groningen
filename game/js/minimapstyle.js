// De stijl- en laagregels van de minimap (23-11, wens van de eigenaar: "de minimap mag strakker en mooier").
// Puur: geen DOM en geen canvas, zodat scripts/minimapstyle_test.mjs de regels natrekt; hud_panel.js tekent ermee.
//
// De vaste besluiten blijven: geel is het actieve routedoel, je eigen route paars, overige iconen in hun iconkleur;
// de kleurenblindrollen (--mk-*, markerColors()) en de vormen naast de kleur. Hier staat alleen HOE de minimap ze ordent:
// welke laag waar ligt, wat eruit springt en wat stil is, hoeveel er tegelijk mag, hoe hij beweegt en wanneer de
// gecachete landlaag opnieuw getekend moet worden.

// ------------------------------------------------------------------ lagen
// Het land (alles wat in de wereld stilligt) is één gecachete laag, noord-boven in wereldcoördinaten; de minimap legt
// hem elke tekenbeurt gedraaid neer. Van onder naar boven:
export const LAND_LAYERS = ['weiland', 'buitenland', 'zee', 'wijkgrenzen', 'groen', 'water', 'veroverd', 'wegen', 'spoor', 'gebouwen', 'buitengrens'];
// Wat elke tekenbeurt bovenop komt, van onder naar boven. De route en de doelen liggen boven de plekken, de speler boven
// alles op de kaart, en de rand (noord, wind, de doelmarkeringen buiten beeld) als laatste.
export const MM_LAYERS = ['land', 'treinen', 'plaatsnamen', 'zoekgebied', 'routes', 'plekken', 'missielaag', 'doelen', 'medespelers', 'politie', 'speler', 'noord', 'wind', 'rand'];
export const layerIndex = (naam) => MM_LAYERS.indexOf(naam);

// ------------------------------------------------------------------ hiërarchie
// De route die je volgt springt eruit: dik, een inktrand en daarbuiten een papieren rand, met inktchevrons in de looprichting.
// Een andere route (een klus naast je missie) is dunner en stapt terug. Breedtes in HUD-px op een kaart van 250.
const ROUTE_ACTIEF = { width: 5, casing: 3, halo: 2, alpha: 1, chevrons: true };
const ROUTE_ANDER = { width: 3, casing: 2, halo: 0, alpha: 0.7, chevrons: false };
export const routeLook = (actief) => (actief ? ROUTE_ACTIEF : ROUTE_ANDER);
// de chevrons: een kleine inkthaak elke CHEVRON_STAP px langs de route, niet vlak bij de speler en niet vlak bij het doel
export const CHEVRON_STAP = 26;
export const CHEVRON_MAAT = 2.6;
// Met een doel in beeld of aan de rand zijn de plekken stil: ze blijven leesbaar (vorm en kleur), maar stappen een tree terug.
export const PLEK_STIL = 0.72;
export const plekAlpha = (heeftDoel) => (heeftDoel ? PLEK_STIL : 1);

// ------------------------------------------------------------------ niet te veel tegelijk
// Plekken (POI's) op de minimap: lopend acht, en hoe harder je gaat hoe minder (je kijkt korter), tot drie op topsnelheid.
// De lijst komt al op belangrijkheid gesorteerd binnen (mapPriority), dus wat afvalt is het minst belangrijke.
export const PLEK_MAX = 8;
export const PLEK_MIN = 3;
export function plekBudget(snelheid, topsnelheid) {
  const k = topsnelheid > 0 ? Math.min(1, Math.max(0, Math.abs(snelheid || 0) / topsnelheid)) : 0;
  return Math.round(PLEK_MAX - (PLEK_MAX - PLEK_MIN) * k);
}

// ------------------------------------------------------------------ beweging
// Easing die niet van de framerate afhangt: de minimap tekent op 16 tot 100 ms en dt telt de overgeslagen frames mee.
export const ease = (dt, rate) => 1 - Math.exp(-Math.max(0, dt || 0) * rate);
export const ZOOM_RATE = 1.8; // per seconde: de zoom loopt rustig mee met de snelheid
export const TURN_RATE = 9; // de draaiing volgt de camera vlot, maar zonder te schokken
export const SPEED_RATE = 2.2; // de snelheid waarop de zoom reageert, gladgestreken (schakelen, hobbels)
// De snelheid voor de zoom: gladgestreken, zodat een hobbel of een schakelmoment de kaart niet laat ademen.
export const volgSnelheid = (vorige, nu, dt) => (Number.isFinite(vorige) ? vorige + (Math.abs(nu || 0) - vorige) * ease(dt, SPEED_RATE) : Math.abs(nu || 0));
// "Beweging beperken": geen glijdende zoom maar twee standen (dichtbij en ver) met een tussenmarge, zodat hij niet heen
// en weer springt. Geeft de stand terug (0 of 1); de snelheid voor de zoom is dan 0 of de topsnelheid.
export const ZOOMSTAP_OP = 0.6, ZOOMSTAP_AF = 0.35;
export function zoomStap(vorige, snelheid, topsnelheid) {
  const k = topsnelheid > 0 ? Math.abs(snelheid || 0) / topsnelheid : 0;
  if (vorige === 1) return k < ZOOMSTAP_AF ? 0 : 1;
  return k > ZOOMSTAP_OP ? 1 : 0;
}
// De zoom naar zijn doel: glijdend, of in één keer bij Beweging beperken. { waarde, bezig }
export function naarZoom(huidig, doel, dt, beperkt) {
  if (beperkt || !Number.isFinite(huidig)) return { waarde: doel, bezig: false };
  const v = huidig + (doel - huidig) * ease(dt, ZOOM_RATE);
  const bezig = Math.abs(doel - v) > doel * 0.002;
  return { waarde: bezig ? v : doel, bezig };
}
// De draaiing naar zijn doel over de kortste kant; bij Beweging beperken direct (geen extra beweging bovenop de camera). { waarde, bezig }
export function naarHoek(huidig, doel, dt, beperkt) {
  if (!Number.isFinite(huidig)) return { waarde: doel, bezig: false };
  let d = doel - huidig;
  d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
  if (beperkt || Math.abs(d) < 0.002) return { waarde: huidig + d, bezig: false };
  return { waarde: huidig + d * ease(dt, TURN_RATE), bezig: true };
}

// ------------------------------------------------------------------ scherpte
// De canvas krijgt precies de apparaatpixels van zijn vak (ResizeObserver devicePixelContentBoxSize), en de tekening schaalt
// in vectoren naar dat vak: de browser hoeft niets te herschalen. Zonder die maat: de CSS-maat keer de pixelverhouding.
export function backingPx(apparaatPx, cssPx, verhouding) {
  if (Number.isFinite(apparaatPx) && apparaatPx > 0) return Math.round(apparaatPx);
  return Math.max(1, Math.round((cssPx || 0) * (verhouding || 1)));
}

// ------------------------------------------------------------------ de landcache
// De laag dekt een vierkant van LAND_MARGE keer de straal van het beeld (dat al de draaiing van de hoeken dekt), op minstens
// LAND_OVERSAMPLE apparaatpixels per HUD-px (gedraaid neerleggen blijft dan scherp) en hooguit LAND_MAX_PX breed.
export const LAND_MARGE = 1.45;
export const LAND_OVERSAMPLE = 1.5;
export const LAND_MAX_PX = 2048;
export const LAND_ZOOMBAND = 1.12; // zoveel mag de zoom afwijken voordat de laag opnieuw wordt getekend (tijdens het zoomen)
export const LAND_TEGEL_MS = 500; // nieuwe tegels gestreamd: hooguit zo vaak opnieuw
export const LAND_LADEN_MS = 250; // de provinciekaart laadt nog tegels: zo vaak opnieuw tot hij compleet is
export function landMaat(straalM, schaal, k) {
  const half = straalM * LAND_MARGE;
  const res = Math.min(schaal * Math.max(k, LAND_OVERSAMPLE), LAND_MAX_PX / (2 * half)); // apparaatpixels per meter
  return { half, res, px: Math.max(1, Math.ceil(2 * half * res)) };
}
// Waarom de laag opnieuw moet ('' = hij is goed). c: de cache { x, y, half, schaal, sleutel, geo, at };
// q: { x, y, straal, schaal, sleutel, geo, nu, bezig (zoom of draai loopt nog), laden (provinciekaart mist tegels) }.
export function landVerouderd(c, q) {
  if (!c) return 'leeg';
  if (c.sleutel !== q.sleutel) return 'stijl';
  const marge = c.half - q.straal;
  if (Math.abs(q.x - c.x) > marge || Math.abs(q.y - c.y) > marge) return 'rand';
  const r = q.schaal / c.schaal;
  if (r > LAND_ZOOMBAND || r < 1 / LAND_ZOOMBAND) return 'zoom';
  if (!q.bezig && Math.abs(r - 1) > 0.004) return 'scherp'; // de zoom staat stil: één keer op de echte maat, dan is hij weer scherp
  if (q.geo !== c.geo && q.nu - c.at >= LAND_TEGEL_MS) return 'tegels';
  if (q.laden && q.nu - c.at >= LAND_LADEN_MS) return 'laden';
  return '';
}

// ------------------------------------------------------------------ vormen
// De spelerpijl (HUD-px op een kaart van 250, punt naar rechts = hoek 0): een strakke pijl met een inkeping, een harde
// inktschaduw (het drukwerk van DS3) en een crème rand. Geen zachte gloed meer per beeld.
export const SPELER_PIJL = [[9, 0], [-6.5, 6.2], [-3.2, 0], [-6.5, -6.2]];
export const SPELER_SCHADUW = 1.4; // px, naar rechtsonder, zoals de harde schaduw van de papieren kaart
// De noordbadge: een papieren schijfje met inktrand en een inkt-N, met een klein inktpuntje naar buiten (waar noord ligt).
export const NOORD = { r: 10, rand: 1.5, punt: 4.2, inset: 17 };
