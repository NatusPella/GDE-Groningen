// Een fietser van de fiets slaan (#944): de regel tussen combat.js (de melee-treffer) en
// pedestrians.js (de echte worp, throwRider). Tot nu toe viel een fietser alleen van zijn fiets
// bij een harde aanrijding tussen voertuigen (knockOffRiders); een klap met de vuist of een
// wapen deed de fiets alleen schade en de berijder bleef zitten.
//
// Puur, zonder three.js en zonder de wereld: combat.js zet het verzoek op de fiets
// (v.meleeOff) en pedestrians.js voert het een frame later uit, met dezelfde worp als bij een
// aanrijding. Zo hoeft combat.js pedestrians.js niet te importeren (dat zou een kring opleveren
// via world.js) en is de regel los te testen.
import { WEAPONS } from './weapons.js';

// Slaat deze fiets of scooter iemand? Alleen dan valt er iemand af. De regel volgt precies wie
// de wereld op de fiets tekent (ragdoll.syncBikeRider): een bestuurder, een fiets met een route,
// een landwegfietser, een agent op zijn politiefiets of een racer. Een geparkeerde fiets heeft
// niemand; een paard (politie) is geen fietser en heeft zijn eigen afwerpregel.
export function hasRider(v) {
  if (!v || !(v.isBike || v.isScooter)) return false;
  if (v.wrecked || v.sinking || v.riderOff || v._riderAway || v._mount === 'horse') return false;
  return !!(v.driver || v.road || v.countryDrive || v.racer || (v.isPolice && !v.hijacked));
}

// De klap op een fietser: zet het verzoek op de fiets. `ca`/`sa` is de richting van de slag
// (cos/sin van de kijkhoek), `weapon` de wapenstand (WEAPONS) en `opts.dader` de plek van een
// gast (0 = de speler van wie het spel opende). Geeft true als er een verzoek staat; de fiets
// zelf krijgt van deze slag geen schade, want de klap raakt de persoon.
export function requestRiderOff(v, ca, sa, weapon, opts = {}) {
  if (!hasRider(v)) return false;
  // je eigen fiets sla je niet onder je vandaan (en een gast slaat niet de fiets van de speler)
  if (v.driver === 'player') return false;
  const dmg = Math.max(0, (weapon && weapon.damage) || 0);
  const knock = Math.max(0, (weapon && weapon.knock) || 0);
  // De "closing" is de kracht van de klap in dezelfde maat als bij een aanrijding: de worp
  // gebruikt hem voor de boog en de schade aan de berijder.
  const closing = Math.min(8, 2.5 + dmg * 0.12 + knock * 0.6);
  const vx = ca * (2.4 + knock), vy = sa * (2.4 + knock);
  v.meleeOff = {
    nx: ca, ny: sa, vx, vy, closing,
    byPlayer: !opts.dader,
    dader: opts.dader | 0,
    weapon: (weapon && weapon.key) || null,
    at: Number.isFinite(opts.time) ? opts.time : 0,
  };
  return true;
}

// De uitvoerder (pedestrians.js) haalt het verzoek eraf; niets meer te doen is null.
export function takeRiderOff(v) {
  const off = v && v.meleeOff;
  if (!off) return null;
  v.meleeOff = null;
  return off;
}

// Het wapen waar de speler mee slaat, met zijn sleutel erbij (voor de test en de kracht).
export function meleeWeapon(key) {
  return WEAPONS[key] || WEAPONS.fists;
}
