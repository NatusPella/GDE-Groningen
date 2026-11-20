// Wat een opdracht vooraf vraagt: de uitrusting (REQUIREMENTS) en het voertuig waarmee je
// aan de start moet komen (rideOk, WRONG_RIDE). Afgesplitst uit missions.js (#497), zonder
// inhoudelijke wijziging; missions.js exporteert RACE_MIN_TOP nog steeds.
import { getOwnedEntries, storyShopState, ownedCarTops } from './shops.js';
import { SHOP_TYPES } from './shopdata.js';
import { isNight } from './missionquery.js';
import { hoofdspeler } from './players.js';

// --- requirements ------------------------------------------------------------
// Some missions need gear first: a gun of your own for Jelmer's livestream, a
// car on your own name for the sponsored ring race.

export const REQUIREMENTS = {
  bike: {
    met: () => getOwnedEntries().some((o) => o.spec && o.spec.kind === 'bike'),
    shop: 'fietsen',
    text: (shop) => `De KEI-weekrace is een fietsrace: alleen wie een eigen fiets heeft, mag starten. Koop er een bij ${shop}.`,
  },
  heist: {
    met: () => { const st = storyShopState(); return st.incognito || st.rental; },
    shop: ['kleding', 'boot'],
    text: (shop) => `Voor de kraak heb je zwart incognito nodig (Stoer & Stads) of een huurboot (Bootje Huren). Dichtstbij: ${shop}.`,
  },
  night: {
    met: (w) => isNight(w),
    garage: true, home: true,
    text: () => 'Kraken doe je in het donker. Wacht thuis in de flat tot het avond is (na 21:00), of slaap tot de avond.',
  },
  boat: {
    met: () => storyShopState().rental,
    shop: 'boot',
    text: (shop) => `Hiervoor heb je een eigen boot nodig. Huur er een bij ${shop}.`,
  },
  weapon: {
    met: (w) => ['pistol', 'uzi', 'shotgun', 'jachtgeweer'].some((k) => (w.ammo[k] || 0) > 0),
    shop: 'wapens',
    text: (shop) => `Jelmer leent geen wapens meer uit. Koop eerst een wapen bij ${shop}.`,
  },
  // H9: a car of your own that can keep up on the ringweg (the Escapade once tuned)
  racecar: {
    met: (w) => ownedCarTops().some((c) => isRaceCar(c.name, c.top)) || rideOk(w, 'racecar'),
    shop: 'tuning',
    text: (shop) => `De ringweg-race win je alleen in een snelle auto, 200 km/u of meer. Voer de Escapade op bij ${shop}, of koop een sportwagen bij ${SHOP_TYPES.auto.chain}.`,
  },
  car: {
    met: () => getOwnedEntries().some((o) => o.spec && o.spec.kind === 'car' && !o.spec.unlock), // bought, not a story unlock
    shop: 'auto',
    text: (shop) => `De ringweg-race wordt gesponsord door ${SHOP_TYPES.auto.chain}: alleen wie een eigen auto heeft mag starten. Koop er eerst een bij ${shop}.`,
  },
};

// --- the right ride at the start ----------------------------------------------
// def.ride: what you have to arrive in for the mission to start (the start
// marker waits, with a line from the companion, until you do).
//   racecar  H9: a sports car, or any car tuned to 200 km/u (RACE_MIN_TOP)
//   bike     H5: any bike, a fatbike included
//   quay     H13: on the quay, not in a boat of your own: the tour boat waits

export const RACE_MIN_TOP = 200 / 3.6;
// the rivals top out at ~55 m/s (racers.js RACE_TOP x topScale) and the
// rubber band holds the leaders back: from 200 km/u the podium is a fair fight
export const isRaceCar = (name, top) => name === 'sport' || top >= RACE_MIN_TOP - 0.01;
export const isCarRide = (v) => !!v && !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli;

export function rideOk(w, ride, v = hoofdspeler(w).inVehicle) {
  if (ride === 'racecar') return isCarRide(v) && !v.wrecked && isRaceCar(v.model.name, v.model.maxSpeed);
  if (ride === 'bike') return !!v && v.isBike;
  if (ride === 'quay') return !v || !v.isBoat;
  return true;
}

// What the companion says when you turn up in the wrong thing.
export const WRONG_RIDE = {
  racecar: [
    { when: (v) => !v, say: 'Lopend win je geen race. Haal je snelste auto.' },
    { when: (v) => v.model.tank, say: 'Met die vetwagen win je geen race. Haal je snelste auto.' },
    { when: (v) => v.isBike || v.isScooter, say: 'Op de ringweg win je niks op twee wielen. Haal je snelste auto.' },
    { when: (v) => v.isHeroCar, say: 'De Escapade is nog te traag voor de ringweg. Eerst langs Knal & Kolder.' },
    { when: () => true, say: 'Daarmee win je geen race. Haal je snelste auto, of laat hem opvoeren bij Knal & Kolder.' },
  ],
  bike: [
    { when: () => true, say: 'Het is een fietsrace. Kom op je eigen fiets.' },
  ],
  quay: [{ when: () => true, say: 'Eerst aanmeren en uitstappen. De rondvaartboot ligt al klaar aan de kade.' }],
};
