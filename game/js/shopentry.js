// Waar en wanneer een winkel te gebruiken is: de marker buiten, de deur van een inloopwinkel en de toonbank binnen (#1150), en de
// terugval voor de winkel van het verhaal. Puur (geen three.js, geen wereld): shops.js en story.js vragen het hier.
//
// Waarom (spelbot 23-11, M05 'Koop een fiets bij Trap & Toeter'): bij een inloopwinkel stond de winkelprompt buiten uit, want binnen
// verkoopt de toonbank. Maar de gids wees naar de marker en niet naar de deur, en het interieur leeft alleen voor de twee dichtstbijzijnde
// panden binnen 24 m (interiors.js MAX_LIVE, BUILD_R): in de binnenstad kon de deur dicht blijven. Dan kon een speler de fiets nergens
// kopen en liep het verhaal vast. Nu geldt voor de winkel van het verhaal altijd:
//   - de prompt staat bij de marker en bij de deur, met een ruime straal, ook als de winkel een interieur heeft;
//   - binnen verkoopt de toonbank (interiors.js), en wijst de gids daarheen;
//   - wie 10 s bij de deur of binnen staat zonder te kopen, krijgt de winkelkaart vanzelf.
// Een andere inloopwinkel zonder levend interieur krijgt ook de prompt buiten (anders deed E daar niets).
// Samen spelen: lokaal, per speler; de winkel zelf volgt winkelMagVoorGast (shops.js).

export const SHOP_USE_RADIUS = 2.6;      // m: de marker van een gewone winkel
export const STORY_SHOP_RADIUS = 4.5;    // m: de winkel van het verhaal, rond de marker en rond de deur
export const STORY_SHOP_WAIT_S = 10;     // s bij de deur of binnen: dan opent de winkelkaart vanzelf
export const STORY_SHOP_NEAR = 6;        // m: zo dichtbij telt als 'bij de deur' voor de wachttijd

const d2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// entry: null (geen interieur, of nog geen plan) of { door: {x,y}, counter: {x,y}|null, live, inside } (interiors.js shopEntryAt)
// Geeft de afstand waarop de winkel buiten te gebruiken is, of null als hij hier buiten niet geldt.
export function shopReach(px, py, shop, entry, { story = false, walkIn = false } = {}) {
  let d = d2(px, py, shop.x, shop.y);
  if (walkIn) {
    if (entry && entry.inside) return null;            // binnen verkoopt de toonbank
    if (entry && entry.live && !story) return null;    // #1150: de deur gaat open, loop naar binnen
    if (entry && entry.door) d = Math.min(d, d2(px, py, entry.door.x, entry.door.y));
  }
  return d <= (story ? STORY_SHOP_RADIUS : SHOP_USE_RADIUS) ? d : null;
}

// Waar de prompt (en de gids) buiten staat: bij de deur van een inloopwinkel, anders bij de marker; binnen bij de toonbank.
export function shopSpot(shop, entry) {
  if (entry && entry.inside && entry.counter) return entry.counter;
  if (entry && entry.door) return entry.door;
  return { x: shop.x, y: shop.y };
}

// Is de speler bij de winkel van het verhaal (voor de wachttijd)? Binnen telt altijd.
export function nearStoryShop(px, py, shop, entry) {
  if (entry && entry.inside) return true;
  if (d2(px, py, shop.x, shop.y) <= STORY_SHOP_NEAR) return true;
  return !!(entry && entry.door && d2(px, py, entry.door.x, entry.door.y) <= STORY_SHOP_NEAR);
}

// De terugval: telt de tijd bij de winkel van het verhaal; 'open' één keer per bezoek (weglopen zet hem terug).
// blocked: er is iets anders in beeld (een menu, een cutscene, in een voertuig): de klok staat dan stil, zonder terug te gaan.
export function makeStoryShopWait(waitS = STORY_SHOP_WAIT_S) {
  let t = 0, done = false, key = null;
  return {
    tick(dt, { shopId, near, blocked }) {
      if (!shopId || shopId !== key) { key = shopId || null; t = 0; done = false; }
      if (!shopId || !near) { t = 0; done = false; return null; }
      if (blocked || done) return null;
      t += dt;
      if (t < waitS) return null;
      done = true;
      return 'open';
    },
    reset() { t = 0; done = false; key = null; },
    get t() { return t; },
  };
}
