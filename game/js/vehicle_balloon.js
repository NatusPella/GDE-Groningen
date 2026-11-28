// De ballon als voertuig (#1377, L3b): de wereldkant van balloonflight.js, zonder THREE.
// Een ballonmand is een luchtvaartuig (`isBalloon`, ook `isAirCraft` voor de navigatie): je stapt in bij
// een lanceerplek (een groot park of weiland, of de Dollard) als de ballon op de grond staat, je kiest je
// hoogte met de brander en de klep, en de wind doet de rest. Het decor (`world.balloons`, skyprops.js)
// blijft ongemoeid: dit is een eigen object in `world.balloonCrafts`.
//
// Samen spelen: de mand heeft twee plaatsen (basketrider.js SLOTS). Plaats 0 is de piloot, en dat is
// altijd een speler uit het spel dat de ballon bedient (de brander draait bij de host, net als de
// helikopter-simulator); een gast stapt in als PASSAGIER op plaats 1 en krijgt zijn eigen loon en
// punten (per speler, zie coopbeloning.js). Uitstappen kan alleen op de grond (coopgast.js
// kanUitstappen). Valt de piloot weg terwijl de ballon in de lucht is, dan blijft de gast aan boord en
// brandt de ballon zelf zacht bij vlak boven de grond: hij landt rustig en de gast stapt daarna uit.
// Wat nog niet gebouwd is: het model in beeld (skyprops3d.js), de camera en de HUD in de scène, en de
// hook in vehicle.js; dit bestand is de regelkant waar die op aansluiten.
// Tests: scripts/ballonrit_test.mjs.

import { BALLOON_MODEL, newBalloonFlight, stepBalloon, balloonReadout, refuel } from './balloonflight.js';
import { SLOTS, basketRiderPose } from './basketrider.js';
import { ROOSTER } from './heliplan.js';

// Een ballon is geen register-voertuig (niet te koop, geen garage): `name` staat achteraan zodat de registeraudit hem niet als model telt.
export const BALLOON_CRAFT_MODEL = Object.freeze({ kind: 'ballon', len: 3.2, wid: 3.2, maxSpeed: 8, name: 'ballon' });
export const INSTAP_AFSTAND = 6;   // m van de mand waar je kunt instappen
// De Dollard is een vaste lanceerplek naast de parken en weilanden die skyprops.js zoekt (launchSites).
export const DOLLARD_SITE = Object.freeze({ id: 'dollard', naam: 'de Dollard', x: ROOSTER.dollard.x, y: ROOSTER.dollard.y });
export const lanceerPlekken = (parken = []) => [...parken.map((p, i) => ({ id: `park${i}`, naam: 'een open veld', x: p.x, y: p.y })), DOLLARD_SITE];

const MELDING = {
  weer: 'Bij dit weer gaat de ballon niet op: wacht tot het opklaart.',
  nacht: 'Ballonvaarders vliegen overdag. Kom terug bij daglicht.',
  ver: 'Je staat te ver van de ballonmand.',
  lucht: 'De ballon is al in de lucht.',
  vol: 'De mand zit vol.',
  uitLucht: 'Uitstappen kan pas als de ballon op de grond staat.',
  geenPiloot: 'Een gast stapt alleen in als iemand de brander bedient.',
  gastPiloot: 'In een ballon zit je als gast mee; de brander bedient wie het spel opende.',
};
export const BALLON_MELDING = MELDING;

// Mag er nu een ballon op? Niet bij onweer of harde regen, niet in het donker (zoals het decor, skyprops.js).
export function ballonWeer(world) {
  const w = world && world.weather;
  if (w && w.active && (w.kind === 'storm' || w.kind === 'onweer' || w.intensity > 0.35)) return 'weer';
  const dn = world && world.dayNight;
  if (dn && dn.sunElevation <= -1) return 'nacht';
  return null;
}

// Een ballonmand op een lanceerplek. site: { x, y, id }. Staat op de grond, tank vol, brander uit.
export function makeBalloonCraft(site, { id = 1, fuel = 1, yaw = 0 } = {}) {
  const flight = newBalloonFlight(site.x, site.y, { fuel, yaw });
  return {
    id, isBalloon: true, isAirCraft: true, model: BALLOON_CRAFT_MODEL, site: site.id || null,
    x: site.x, y: site.y, z: 0, angle: yaw, speed: 0, onGround: true, wrecked: false,
    flight, driver: null, passengers: [], input: { burn: false, vent: false }, events: [],
    home: { x: site.x, y: site.y },
  };
}

// Elke plaats in de mand: { slot, rol: 'piloot'|'passagier' }.
export const zitplaatsen = (c) => [c.driver, ...c.passengers].filter(Boolean);
const bezetPlaatsen = (c) => (c.driver ? 1 : 0) + c.passengers.length;

// Kan deze speler nu instappen? who: { x, y, gast }. Geeft { ok, rol } of { ok:false, reden, tekst }.
export function kanInstappen(craft, who, world) {
  const nee = (reden) => ({ ok: false, reden, tekst: MELDING[reden] });
  if (!craft || !who) return nee('ver');
  if (!craft.onGround) return nee('lucht');
  if (Math.hypot(craft.x - who.x, craft.y - who.y) > INSTAP_AFSTAND) return nee('ver');
  if (bezetPlaatsen(craft) >= SLOTS.length) return nee('vol');
  const w = ballonWeer(world);
  if (w) return nee(w);
  if (who.gast) return craft.driver ? { ok: true, rol: 'passagier' } : nee('geenPiloot');
  return craft.driver ? { ok: true, rol: 'passagier' } : { ok: true, rol: 'piloot' };
}

export function stapIn(craft, who, world) {
  const r = kanInstappen(craft, who, world);
  if (!r.ok) return r;
  const plek = { slot: who.slot ?? 0, gast: !!who.gast };
  if (r.rol === 'piloot') craft.driver = plek; else craft.passengers.push(plek);
  return { ok: true, rol: r.rol, plaats: r.rol === 'piloot' ? 0 : craft.passengers.length };
}

// Uitstappen: alleen op de grond (de gast blijft anders aan boord). Stapt de piloot uit en zitten er
// passagiers, dan wordt de eerste speler uit het eigen spel de nieuwe piloot; zit er alleen een gast, dan
// stapt die ook uit (er is niemand om de brander te bedienen).
export function stapUit(craft, slot) {
  if (!craft.onGround) return { ok: false, reden: 'uitLucht', tekst: MELDING.uitLucht };
  if (craft.driver && craft.driver.slot === slot) {
    craft.driver = null;
    const eigen = craft.passengers.findIndex((p) => !p.gast);
    if (eigen >= 0) craft.driver = craft.passengers.splice(eigen, 1)[0];
    else craft.passengers.length = 0;
    return { ok: true };
  }
  const i = craft.passengers.findIndex((p) => p.slot === slot);
  if (i < 0) return { ok: false, reden: 'niet-aan-boord' };
  craft.passengers.splice(i, 1);
  return { ok: true };
}

// Valt de piloot weg (netwerk, afsluiten): in de lucht blijft iedereen aan boord en landt de ballon zacht.
export function pilootWeg(craft) {
  if (!craft.driver) return;
  craft.driver = null;
  if (craft.onGround) craft.passengers.length = 0; // op de grond stapt iedereen gewoon uit
}

// Zonder piloot in de lucht: een zachte brand als hij te snel zakt, zodat de landing rustig is.
export function autoLandInvoer(craft) {
  const f = craft.flight;
  if (f.onGround || f.fuel <= 0) return { burn: false, vent: false };
  const maxZak = f.z < 50 ? 1.0 : 2.2;
  return { burn: f.vz < -maxZak, vent: false };
}

// Eén stap van de ballon. input: { burn, vent } van de piloot (genegeerd zonder piloot).
// world: { weather: { windAngle, windSpeed } } voor de wind. Zet x/y/z/angle/speed/onGround van het
// voertuig gelijk aan het vliegmodel. Geeft de gebeurtenissen van balloonflight.js.
export function stepBalloonCraft(craft, input, dt, world) {
  if (!craft || craft.wrecked) return [];
  const f = craft.flight;
  const inv = craft.driver ? { burn: !!(input && input.burn), vent: !!(input && input.vent) } : autoLandInvoer(craft);
  craft.input = inv;
  const w = world && world.weather ? { angle: world.weather.windAngle, speed: world.weather.windSpeed } : {};
  const ev = stepBalloon(f, inv, dt, w);
  craft.x = f.x; craft.y = f.y; craft.z = f.z;
  craft.speed = Math.hypot(f.vx, f.vy);
  craft.onGround = f.onGround;
  craft.angle = Math.atan2(f.vy, f.vx) || craft.angle;
  craft.events = ev;
  return ev;
}

// Waar elke inzittende staat (voor de camera en de figuren): { slot, rol, x, y, z, heading }.
export function inzittendePosities(craft, yaw = 0, age = 0) {
  const mand = { x: craft.x, y: craft.y, z: craft.z, yaw, age, burn: craft.input && craft.input.burn ? 1 : 0, seed: craft.id };
  const lijst = [];
  if (craft.driver) lijst.push({ ...craft.driver, rol: 'piloot', ...basketRiderPose(mand, 0) });
  craft.passengers.forEach((p, i) => lijst.push({ ...p, rol: 'passagier', ...basketRiderPose(mand, i + (craft.driver ? 1 : 0)) }));
  return lijst;
}

// De HUD-regel voor de piloot en de passagier.
export function ballonHud(craft) {
  const r = balloonReadout(craft.flight);
  return {
    ...r,
    tekst: `${r.stand} · ${r.hoogte} m · brandstof ${r.brandstof}%`,
    waarschuwing: r.laag ? 'Brandstof bijna op: zoek een plek om te landen.' : '',
  };
}

// Tanken op de plek waar hij staat (alleen aan de grond), bijvoorbeeld bij de lanceerplek.
export const tankOp = (craft) => refuel(craft.flight);

// Voor de navigatie: de ballon telt als luchtvaartuig (airguide.js isAirCraft kijkt naar isBalloon).
export const isBalloonCraft = (v) => !!(v && v.isBalloon);

// Past de hoogte van de mand bij de camera-eis: nooit onder de grond en eindig.
export const maxHoogte = BALLOON_MODEL.ceiling;
