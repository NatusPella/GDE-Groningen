// Vrachtkosten (#492): wat één rit van de vrachtbijbaan kost. Brandstof is liters
// maal de literprijs, de tol staat per rit vast en het APK/onderhoudsdeel hangt af
// van de truck: een eigen truck slijt van jou, de leen-truck krijgt zijn onderhoud
// van de zaak. Pure regels: geen THREE, geen DOM, geen klok en geen Math.random,
// zodat dezelfde rit altijd hetzelfde kost (scripts/vrachtkosten_test.mjs).
//
// De baan zelf (sidejob_vracht.js) boekt de kosten via de bestaande finance-haak
// (noteMoney + world.money); dit bestand rekent alleen en schrijft niets weg.

export const DIESEL_PRIJS = 1.99;   // € per liter
export const START_LITER = 2;       // l: starten, manoeuvreren en de koeling
export const VERBRUIK = { eigen: 0.30, leen: 0.38 }; // l/km
export const TOL_PER_RIT = 3;       // €: het tolpoortje bij de afnemer (verzonnen)
export const APK_PER_RIT = 2;       // €: jouw deel van de APK en het onderhoud
export const SERVICE_PER_RIT = 2;   // €: onderhoud van de leen-truck, voor de zaak

const KM_MAX = 200;                 // dezelfde grens als het contract (vrachtmarkt.js)
const getal = (v) => (Number.isFinite(v) ? v : 0);
const km = (v) => Math.min(KM_MAX, Math.max(0, getal(v)));
const rond = (v) => Math.max(0, Math.round(getal(v)));

// Een truck die achter een oplegger past: het model van de bakwagen, de sjouwer en
// de tankwagen (shopdata.js), niet de bestelbus, de trekker of de stadsbus.
export function isVrachtTruck(model) {
  return !!(model && model.name === 'truck');
}

export const litersVoor = (afstandKm, eigen = false) =>
  START_LITER + km(afstandKm) * (eigen ? VERBRUIK.eigen : VERBRUIK.leen);

// Liter × literprijs, in hele euro's: een koude truck gebruikt altijd iets.
export const brandstofKosten = (afstandKm, eigen = false) => rond(litersVoor(afstandKm, eigen) * DIESEL_PRIJS);
export const tolKosten = () => TOL_PER_RIT;
export const onderhoudKosten = (eigen = false) => (eigen ? APK_PER_RIT : SERVICE_PER_RIT);

// Alle kosten van één rit, in hele euro's en nooit negatief.
export function ritKosten(afstandKm, eigen = false) {
  const brandstof = brandstofKosten(afstandKm, eigen);
  const tol = tolKosten();
  const onderhoud = onderhoudKosten(!!eigen);
  return { brandstof, tol, onderhoud, totaal: brandstof + tol + onderhoud };
}

// Het nettoloon: bruto min de kosten van de rit, nooit onder nul. `kosten` mag het
// bedrag zijn of het resultaat van ritKosten().
export function nettoLoon(bruto, kosten) {
  const uit = typeof kosten === 'object' && kosten ? kosten.totaal : kosten;
  return Math.max(0, rond(getal(bruto) - getal(uit)));
}

// De garage (ownedvehicles.js) vult deze haak: die leent de eigen truck van de
// speler en zet hem bij het startpunt neer. Een vaste import zou een kring maken
// (ownedvehicles -> shops -> sidejobs -> sidejob_vracht), daarom een haak zoals in
// latehooks.js (#108). Zonder eigen truck antwoordt de haak null en rijdt de baan in
// de leen-truck.
export const eigenTruckHook = { haal: () => null };
