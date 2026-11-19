// De wereld waarin een bijbaan draait, voor de host én voor een gast (Samen spelen, #492). Een gast draait zijn
// baan op een schaduw van de wereld van de host (Object.create(world), zie sidejobs.js gastWereld): lezen valt
// door naar de host, maar een schrijfactie (world.money -= x, world.wanted = n) kwam op het schaduwobject terecht
// en ging verloren of las daarna de verkeerde stand. Een baan schrijft daarom nooit rechtstreeks, maar via deze
// haken: bij de host (de echte wereld) gaan ze naar world.money en world.wanted, bij een gast naar zijn eigen
// gezocht-niveau (world.coopWanted[plek], #434) en zonder te raken aan het geld van de host: het geld van een
// gast staat in zijn eigen spel en komt alleen als beloning binnen (coopnet.js, #365). Zonder three.js.
import { wantedVan, zetWantedVan } from './coopgezocht.js';

// Eigenschappen van de host-wereld die een gastbaan nooit rechtstreeks mag schrijven.
export const GAST_NIET_SCHRIJVEN = ['money', 'wanted', 'wantedDecayTimer', 'drunkExempt'];

// Het gezocht-niveau van de speler van deze baan.
export function banenWanted(world) {
  return typeof world.spelerWanted === 'function' ? world.spelerWanted() : Number(world.wanted) || 0;
}
// Zet het gezocht-niveau van de speler van deze baan (en de afloopteller, zoals de bestaande banen deden).
export function zetBanenWanted(world, n) {
  if (typeof world.zetSpelerWanted === 'function') return world.zetSpelerWanted(n);
  world.wanted = n;
  world.wantedDecayTimer = 0;
  return n;
}
// Geld dat de baan zelf kost (brandstof, tol). Geeft terug hoeveel er echt van de speler af ging. `boek` is
// de finance-haak (noteMoney) voor de host. Bij een gast: 0, want zijn geld staat in zijn eigen spel.
export function betaalBanenUitgave(world, bedrag, rubriek, boek = null) {
  if (typeof world.betaalUitgave === 'function') return world.betaalUitgave(bedrag, rubriek);
  const te = Math.max(0, Math.round(bedrag));
  const betaald = Math.min(te, Math.max(0, Math.floor(world.money || 0)));
  if (betaald > 0) {
    if (boek) boek(rubriek);
    world.money -= betaald;
  }
  return betaald;
}
export const isGastWereld = (world) => !!(world && world.gastWereld);

// Zet de expliciete haken op het schaduwobject van een gast en bewaak de rest: een directe schrijfactie op een
// host-eigenschap wordt gemeld en niet bewaard (anders blijft er een stille afwijking op het schaduwobject staan).
// `host` is de echte wereld, `slot` de plek van de gast.
export function bewaakGastWereld(schaduw, host, slot, waarschuw = (k) => console.warn(`bijbaan van een gast schreef rechtstreeks world.${k}; gebruik zetBanenWanted of betaalBanenUitgave`)) {
  schaduw.gastWereld = true;
  schaduw.spelerWanted = () => wantedVan(host, slot);
  schaduw.zetSpelerWanted = (n) => zetWantedVan(host, slot, n);
  schaduw.betaalUitgave = () => 0;
  const gemeld = new Set();
  const dicht = new Set(GAST_NIET_SCHRIJVEN);
  return new Proxy(schaduw, {
    set(t, k, v) {
      if (dicht.has(k)) {
        if (!gemeld.has(k)) { gemeld.add(k); try { waarschuw(k); } catch { /* alleen een waarschuwing */ } }
        return true;
      }
      t[k] = v;
      return true;
    },
  });
}

// Het lichaam van een gast, met één verschil: een gast is een figuur en zit in `inVeh` (coopbestuur.js, #502). De banen
// vragen naar `inVehicle`; dit beeld geeft ze allebei.
export function spelerBeeld(l) {
  if (!l) return null;
  const gebonden = new Map(); // methode -> { fn, bound }: één bind per methode in plaats van één per lezing (de banen lezen dit elk frame)
  return new Proxy(l, {
    get(t, k) {
      if (k === 'inVehicle') return t.inVehicle || t.inVeh || null;
      if (k === 'character') return t.character || t.char;
      const v = t[k];
      if (typeof v !== 'function') return v;
      let e = gebonden.get(k);
      if (!e || e.fn !== v) { e = { fn: v, bound: v.bind(t) }; gebonden.set(k, e); }
      return e.bound;
    },
    set(t, k, v) { t[k] = v; return true; },
    has(t, k) { return k in t; },
  });
}
