// What you can buy at the counter of an interior that has no menu of its own (epic Interieurs, #1150): one small
// product per shop or café type, with price and effect. Pure data and one function; interiors.js applies it to the
// world (money, health). The shops of the game itself (Stoer & Stads, Nait Duur) open their own menu instead.
// Invented products only, no real brands.
const PRODUCTS = {
  supermarkt: { item: 'Boodschappentas', price: 18, health: 12 },
  bakker: { item: 'Krentenbol', price: 3, health: 8 },
  slager: { item: 'Rookworst', price: 6, health: 10 },
  snackbar: { item: 'Eierbal', price: 6, health: 10 },
  kleding: { item: 'Sjaal "Zomer"', price: 15, health: 0 },
  fietsen: { item: 'Fietsbel', price: 5, health: 0 },
  bloemist: { item: 'Boeket', price: 12, health: 3 },
  kapper: { item: 'Waspoeder voor het haar', price: 9, health: 0 },
  elektronica: { item: 'Oplaadkabel', price: 11, health: 0 },
  tweedehands: { item: 'Rommelkoopje', price: 7, health: 0 },
  souvenir: { item: 'Magneetje van de Martinitoren', price: 4, health: 0 },
  kiosk: { item: 'Krant en een zakje drop', price: 5, health: 4 },
  cafe: { item: 'Koffie met koek', price: 4, health: 8 },
  kroeg: { item: 'Pilsje', price: 4, health: 5 },
  restaurant: { item: 'Dagschotel', price: 16, health: 20 },
  sportschool: { item: 'Dagkaart sportschool', price: 8, health: 6 },
  museum: { item: 'Museumkaartje', price: 7, health: 0 },
  bioscoop: { item: 'Filmkaartje met popcorn', price: 12, health: 4 },
  // r6 (22-11): ook de balie van een apotheek, hotel, werkplaats en magazijn verkoopt iets kleins; gemeente, politie, ziekenhuis en school bewust niet
  werkplaats: { item: 'Fles ruitenvloeistof', price: 6, health: 0 }, magazijn: { item: 'Rol pakbandtape', price: 4, health: 0 },
  gemeente: null, politie: null, apotheek: { item: 'Pleisters', price: 5, health: 6 }, ziekenhuis: null, school: null,
  hotel: { item: 'Ontbijt op de kamer', price: 14, health: 15 },
};
// the variants that sell their product at the desk (balie) instead of at a till or a bar
export const DESK_SUBS = new Set(['sportschool', 'museum', 'bioscoop', 'apotheek', 'hotel', 'werkplaats', 'magazijn']);
export const productFor = (kind, sub) => (kind === 'winkel' || kind === 'horeca' || kind === 'publiek' || kind === 'garage' ? PRODUCTS[sub] || null : null);

// Apply a purchase to a plain state { money, health }: returns { ok, why, item, price, healed } and mutates only on success.
export function buyProduct(state, product, maxHealth = 100) {
  if (!product) return { ok: false, why: 'niets' };
  if (!(state.money >= product.price)) return { ok: false, why: 'arm', item: product.item, price: product.price };
  state.money -= product.price;
  const before = state.health;
  state.health = Math.min(maxHealth, state.health + product.health);
  return { ok: true, item: product.item, price: product.price, healed: state.health - before };
}
