// De vrachtkosten (#492): brandstof (liter × prijs), tol en een APK/onderhoudsdeel
// per rit, plus de koppeling met de vrachtbijbaan (eigen truck of leen-truck,
// boeken via finance). sidejob_vracht.js laadt three van een CDN en is in Node niet
// te importeren; daarom leest die controle de bron.
//   node scripts/vrachtkosten_test.mjs
import { readFileSync } from 'node:fs';
import {
  DIESEL_PRIJS, START_LITER, VERBRUIK, TOL_PER_RIT, APK_PER_RIT, SERVICE_PER_RIT,
  isVrachtTruck, litersVoor, brandstofKosten, tolKosten, onderhoudKosten, ritKosten,
  nettoLoon, eigenTruckHook,
} from '../game/js/vrachtkosten.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const eq = (a, b, name) => ok(a === b, name, `${a} !== ${b}`);
const json = (v) => JSON.stringify(v);
const dichtbij = (a, b, marge = 1e-9) => Math.abs(a - b) <= marge;
const heel = (v) => Number.isFinite(v) && Number.isInteger(v) && v >= 0;

// --- de prijzen en verbruiken ------------------------------------------------
for (const [naam, v] of [['dieselprijs', DIESEL_PRIJS], ['startliters', START_LITER], ['tol', TOL_PER_RIT],
  ['APK-deel', APK_PER_RIT], ['leen-onderhoud', SERVICE_PER_RIT]]) {
  ok(Number.isFinite(v) && v > 0, `${naam} is een positief getal`, String(v));
}
ok(VERBRUIK.eigen > 0 && VERBRUIK.leen > 0, 'beide trucks verbruiken brandstof');
ok(VERBRUIK.eigen < VERBRUIK.leen, 'de eigen truck is zuiniger dan de leen-truck');

// --- liters en brandstof: liter × prijs --------------------------------------
ok(dichtbij(litersVoor(0), START_LITER), 'stilstaan kost de startliters');
ok(dichtbij(litersVoor(1, true), START_LITER + VERBRUIK.eigen), 'eigen truck: startliters + 1 km');
ok(dichtbij(litersVoor(1, false), START_LITER + VERBRUIK.leen), 'leen-truck: startliters + 1 km');
ok(litersVoor(5, true) < litersVoor(5, false), 'over 5 km gebruikt de eigen truck minder');
for (const km of [0, 0.36, 1, 1.56, 5, 50, 200]) {
  eq(brandstofKosten(km, true), Math.round(litersVoor(km, true) * DIESEL_PRIJS), `${km} km eigen: liter × prijs`);
  eq(brandstofKosten(km, false), Math.round(litersVoor(km, false) * DIESEL_PRIJS), `${km} km leen: liter × prijs`);
  ok(heel(brandstofKosten(km, true)) && heel(brandstofKosten(km, false)), `${km} km: brandstof is hele euro's`);
  ok(brandstofKosten(km, true) <= brandstofKosten(km, false), `${km} km: eigen truck niet duurder aan brandstof`);
}
ok(litersVoor(5, true) > litersVoor(4, true), 'verder rijden is meer liters');
eq(litersVoor(-3), START_LITER, 'een negatieve afstand telt als 0');
eq(litersVoor(NaN), START_LITER, 'geen afstand telt als 0');
ok(dichtbij(litersVoor(1e12), START_LITER + 200 * VERBRUIK.leen), 'een enorme afstand wordt begrensd');

// --- tol en onderhoud --------------------------------------------------------
eq(tolKosten(), TOL_PER_RIT, 'de tol staat per rit vast');
eq(tolKosten(120), TOL_PER_RIT, 'de tol hangt niet van de afstand af');
eq(onderhoudKosten(true), APK_PER_RIT, 'eigen truck: APK/onderhoudsdeel');
eq(onderhoudKosten(false), SERVICE_PER_RIT, 'leen-truck: onderhoud van de zaak');
for (const raar of [null, undefined, NaN, 'ja', {}, 1]) {
  eq(tolKosten(raar), TOL_PER_RIT, `tol met ${json(raar)} blijft gelijk`);
  ok(heel(onderhoudKosten(raar)), `onderhoud met ${json(raar)} is een heel bedrag`);
}

// --- alle kosten van een rit -------------------------------------------------
for (const km of [0, 0.36, 0.7, 1, 1.56, 5, 50, 200]) {
  for (const eigen of [true, false]) {
    const k = ritKosten(km, eigen);
    ok(heel(k.brandstof) && heel(k.tol) && heel(k.onderhoud) && heel(k.totaal), `${km} km (${eigen}): hele, niet-negatieve bedragen`, json(k));
    eq(k.totaal, k.brandstof + k.tol + k.onderhoud, `${km} km (${eigen}): totaal is de som`);
    eq(k.tol, TOL_PER_RIT, `${km} km (${eigen}): tol zit erin`);
    ok(k.brandstof > 0 && k.onderhoud > 0, `${km} km (${eigen}): brandstof en onderhoud zitten erin`);
    ok(json(k) === json(ritKosten(km, eigen)), `${km} km (${eigen}): deterministisch`);
  }
  const eigen = ritKosten(km, true), leen = ritKosten(km, false);
  ok(eigen.totaal <= leen.totaal, `${km} km: de eigen truck kost niet meer dan de leen-truck`, `${eigen.totaal} vs ${leen.totaal}`);
}
ok(ritKosten(5, true).totaal < ritKosten(5, false).totaal, 'over 5 km scheelt de eigen truck echt geld');
eq(ritKosten(0).totaal, brandstofKosten(0) + TOL_PER_RIT + SERVICE_PER_RIT, '0 km: startliters, tol en onderhoud');

// rare invoer: altijd eindig, heel en nooit negatief
for (const raar of [null, undefined, NaN, Infinity, -Infinity, 'veel', {}, [], -5, 1e12, 2 ** 40]) {
  const k = ritKosten(raar);
  ok(heel(k.brandstof) && heel(k.tol) && heel(k.onderhoud) && heel(k.totaal), `ritKosten ${json(raar)}: eindig en nooit negatief`, json(k));
  ok(k.totaal <= 200, `ritKosten ${json(raar)}: blijft begrensd`, json(k));
}

// --- nettoloon: bruto min kosten --------------------------------------------
eq(nettoLoon(120, ritKosten(1, true)), 120 - ritKosten(1, true).totaal, 'netto = bruto − kosten');
eq(nettoLoon(120, 9), 111, 'netto mag ook een bedrag als kosten krijgen');
eq(nettoLoon(120, { totaal: 9 }), 111, 'netto leest het totaal van ritKosten');
eq(nettoLoon(5, 9), 0, 'netto gaat nooit onder nul');
eq(nettoLoon(0, 0), 0, 'niets blijft niets');
for (const raar of [[null, null], [NaN, NaN], [Infinity, 5], [-4, -2], ['x', {}], [1e12, 1e9]]) {
  ok(heel(nettoLoon(...raar)), `netto met ${json(raar)}: eindig en nooit negatief`);
}

// --- welke truck is geschikt -------------------------------------------------
ok(isVrachtTruck({ name: 'truck' }), 'het truckmodel is geschikt');
for (const naam of ['van', 'tractor', 'bus', 'midibus', 'trekkerlimo', 'foodtruck', 'escort', 'bike']) {
  ok(!isVrachtTruck({ name: naam }), `${naam} is geen truck voor de oplegger`);
}
for (const raar of [null, undefined, 'truck', 5, {}]) ok(!isVrachtTruck(raar), `isVrachtTruck ${json(raar)}: nee`);

// --- de koppeling met de vrachtbijbaan (broncheck) ---------------------------
const src = readFileSync(new URL('../game/js/sidejob_vracht.js', import.meta.url), 'utf8');
const ov = readFileSync(new URL('../game/js/ownedvehicles.js', import.meta.url), 'utf8');
const sj = readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');

ok(/import \{[^}]*ritKosten[^}]*\} from '\.\/vrachtkosten\.js'/.test(src), 'de baan haalt de kosten uit vrachtkosten.js');
ok(/import \{[^}]*eigenTruckHook[^}]*\} from '\.\/vrachtkosten\.js'/.test(src), 'de baan leent de eigen truck via de haak');
ok(/eigenTruckHook\.haal\(/.test(src), 'de baan vraagt de garage om de eigen truck');
ok(/const v = eigen \|\| spawnJobVehicle\(/.test(src), 'zonder eigen truck blijft de leen-truck');
ok(/c\.ownVehicle = !!eigen/.test(src), 'de baan onthoudt of het de eigen truck is');
ok(/const kosten = ritKosten\(dist \/ 1000, !!c\.ownVehicle\)/.test(src), 'de ritkosten hangen van de rit en de truck af');
ok(/noteMoney\('Overige uitgaven'\)/.test(src), 'de kosten gaan via de finance-haak');
ok(/world\.money -= betaald/.test(src), 'de kosten gaan van je geld af');
ok(!/world\.money\s*\+=/.test(src), 'geen eigen kasboek in de baan');
ok(!/getLedger\(/.test(src), 'de baan houdt geen tweede kasboek bij');
ok(/newTrailer\(contract\.trailer/.test(src), 'de oplegger volgt het contracttype, ook achter de eigen truck');
ok(/eigenTruckHook\.haal\(c\.world, qx, qy, at\.angle\)/.test(src), 'de eigen truck komt op de plek van de leen-truck');
ok(/c\.vehicleWord = 'je eigen truck'/.test(src), 'de meldingen noemen de eigen truck');
ok(/Math\.abs\(v\.speed\) >= STIL_SPEED/.test(src), 'de bijrijder kan nog steeds alleen bij stilstand helpen');
ok(!/Math\.random\(/.test(src), 'de kosten en het contract hangen niet van Math.random af');

ok(/eigenTruckHook\.haal = \(world, x, y, angle\) => eigenVrachtTruckBij/.test(ov), 'de garage vult de truckhaak');
ok(/isVrachtTruck\(o\.spec\.model\)/.test(ov), 'de garage kiest alleen een echte truck');
ok(/spawnOwnedEntry\(world, e\.entry, x, y, angle\)/.test(ov), 'een truck uit de garage wordt voor de rit neergezet');
ok(/parkAt\(world, e\.v, \{ x, y, angle \}\)/.test(ov), 'een truck die er al staat schuift naar het startpunt');
ok(/if \(!c\.ownVehicle\) \{ releaseVehicle\(world, c\.vehicle\); leftover = c\.vehicle; \}/.test(sj), 'de eigen truck wordt na de dienst niet opgeruimd');

// De haak zonder garage (losse vrachtkosten.js) geeft niets: dan rijdt de leen-truck.
eq(typeof eigenTruckHook.haal, 'function', 'de haak is een functie');
eq(eigenTruckHook.haal({ vehicles: [] }, 0, 0, 0), null, 'zonder eigen truck antwoordt de haak null');

console.log(fails ? `${fails} of ${n} failed` : `vrachtkosten_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
