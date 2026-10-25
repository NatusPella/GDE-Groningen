// Voertuigregister-audit: elk voertuigmodel kan spawnen, staat in de winkel of garage en is
// upgradebaar, en cutscenes gebruiken alleen modellen uit het register (game/js/vehicleregister.js).
//   node scripts/vehicleregister_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const JS = path.join(ROOT, 'game', 'js');
const src = (f) => fs.readFileSync(path.join(JS, f), 'utf8');

const { VOERTUIGEN, KLASSEN, REGISTER_NAMEN, coopVoertuig, coopVanModel } = await import('../game/js/vehicleregister.js');
const { VEHICLE_STOCK, upgradeListForStock, PAINTS } = await import('../game/js/shops.js');
const { TRAFFIC_PROFILES, hourFactor, carModel } = await import('../game/js/trafficfleet.js');

let n = 0, fails = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// --- het register zelf ---
for (const [naam, e] of Object.entries(VOERTUIGEN)) {
  ok(KLASSEN.includes(e.klasse), `${naam}: bekende klasse`, e.klasse);
  ok(Array.isArray(e.spawn) && e.spawn.length > 0, `${naam}: heeft een manier om te spawnen`);
  ok(typeof e.cutscene === 'boolean', `${naam}: cutscene ja of nee`);
  if (e.uitzondering) {
    ok(e.uitzondering.length > 15, `${naam}: uitzondering heeft een echte reden`);
    continue;
  }
  // volwaardig spelobject: te koop of te verzamelen, upgradebaar
  ok(e.winkel.length > 0 || !!e.vondst, `${naam}: te koop of te verzamelen`);
  ok(!!e.tuning, `${naam}: upgradebaar (tuning-soort)`);
}

// --- samen spelen (#452): elk model heeft een coöp-regel (stoelen, passagiers, mag een gast sturen) ---
for (const naam of REGISTER_NAMEN) {
  const r = coopVoertuig(naam);
  ok(!!r, `${naam}: coöp-regel`);
  if (!r) continue;
  ok(Number.isInteger(r.stoelen) && r.stoelen >= 1 && r.stoelen <= 2, `${naam}: stoelen 1 of 2`, r.stoelen);
  ok(Number.isInteger(r.passagiers) && r.passagiers >= 0 && r.passagiers <= 6, `${naam}: passagiers 0 tot 6`, r.passagiers);
  ok(r.bestuur === 'gast' || r.bestuur === 'nee', `${naam}: bestuur gast of nee`, r.bestuur);
}
ok(coopVoertuig('bike').stoelen === 1 && coopVoertuig('bike').passagiers === 0, 'fiets: één plek');
ok(coopVoertuig('bus').passagiers === 6 && coopVoertuig('bus').bestuur === 'nee', 'bus: zes passagiers, geen gast aan het stuur');
ok(coopVoertuig('heli').bestuur === 'nee' && coopVoertuig('plane').bestuur === 'nee', 'helikopter en vliegtuig: alleen in je eigen spel');
ok(coopVoertuig('train').bestuur === 'nee' && coopVoertuig('trein') === null, 'trein: openbaar vervoer, geen gast aan het stuur');
ok(coopVoertuig('taxi').bestuur === 'gast', 'taxi: een gast mag sturen');
ok(coopVoertuig('maaidorser').bestuur === 'gast', 'de machines van de boerderij deelt de boer');
ok(coopVanModel({ name: 'hatch' }).model === 'hatch', 'een modelnaam geeft de regel');
ok(coopVanModel({ naam: 'bus' }).passagiers === 6, 'ook de Nederlandse veldnaam werkt');
ok(coopVanModel(null) === null && coopVoertuig('bestaat-niet') === null, 'onbekend model heeft geen regel');

// --- winkel en garage: VEHICLE_STOCK ---
const geclaimd = new Map();
for (const [naam, e] of Object.entries(VOERTUIGEN)) {
  for (const key of e.winkel) {
    const spec = VEHICLE_STOCK[key];
    ok(!!spec, `${naam}: winkelsleutel ${key} bestaat in VEHICLE_STOCK`);
    if (!spec) continue;
    const modelNaam = spec.model && spec.model.name;
    ok(modelNaam === (e.alias || naam) || modelNaam === naam, `${naam}: ${key} heeft model ${modelNaam}`, `verwacht ${e.alias || naam}`);
    if (!e.alias) geclaimd.set(key, naam);
  }
}
for (const key of Object.keys(VEHICLE_STOCK)) {
  const spec = VEHICLE_STOCK[key];
  ok(geclaimd.has(key) || [...Object.values(VOERTUIGEN)].some((e) => e.alias && e.winkel.includes(key)), `winkelvoertuig ${key} staat in het register`, spec.model && spec.model.name);
  ok(!!spec.shop && (spec.price > 0 || !!spec.unlock), `${key}: te koop (prijs) of vrij te spelen (unlock)`);
  ok(upgradeListForStock(spec).length > 0, `${key}: heeft upgrades`);
}
ok(PAINTS.length > 3, 'er zijn verfkleuren');

// --- spawnen: verkeer per wijk en tijd van de dag ---
for (const [naam, e] of Object.entries(VOERTUIGEN)) {
  for (const sp of e.spawn) {
    if (sp.soort === 'wijk') {
      for (const kind of sp.kinds) {
        const gewicht = Object.values(TRAFFIC_PROFILES).reduce((s, p) => s + (p.car[kind] || 0), 0);
        ok(gewicht > 0, `${naam}: ${kind} komt voor in minstens één wijkprofiel`, gewicht);
        const model = carModel(kind, () => 0.5);
        ok(model.name === naam, `${naam}: wijksoort ${kind} geeft model ${model.name}`);
        const uren = Array.from({ length: 24 }, (_, h) => hourFactor(kind, h));
        ok(uren.every((f) => f > 0), `${naam}/${kind}: op elk uur een kans`);
      }
    } else {
      ok(fs.existsSync(path.join(JS, sp.bestand)), `${naam}: ${sp.bestand} bestaat`);
      ok(fs.existsSync(path.join(JS, sp.bestand)) && src(sp.bestand).includes(sp.zoek), `${naam}: ${sp.bestand} bevat "${sp.zoek}"`);
    }
  }
}
// de tijd van de dag verandert echt iets
ok(hourFactor('taxi', 2) > hourFactor('taxi', 13), 'taxi vaker in de nacht');
ok(hourFactor('delivery', 18) > hourFactor('delivery', 3), 'bezorgbus vaker in de avond');
ok(hourFactor('truck', 10) > hourFactor('truck', 23), 'vrachtwagen overdag');
ok(hourFactor('hatch', NaN) === 1 && hourFactor('onbekend', 12) === 1, 'onbekend uur of soort verandert niets');

// --- elk modelliteral in de code staat in het register; cutscenes alleen met registermodellen ---
const MODEL = /\bname:\s*'([a-z0-9_]+)'[^{}]*?\blen:\s*[\d.]+[^{}]*?\bwid:/g;
const modellen = (f) => [...src(f).matchAll(MODEL)].map((m) => m[1]);
const bestanden = fs.readdirSync(JS).filter((f) => f.endsWith('.js') && f !== 'vehicleregister.js' && f !== 'boattypes.js');
const NIET_EEN_VOERTUIG = new Set([]);
for (const f of bestanden) {
  for (const naam of new Set(modellen(f))) {
    if (NIET_EEN_VOERTUIG.has(naam)) continue;
    ok(naam in VOERTUIGEN, `${f}: model ${naam} staat in het voertuigregister`);
  }
}
const cutsceneBestanden = fs.readdirSync(JS).filter((f) => /^cutscene.*\.js$/.test(f) || ['intromontage.js', 'trailer.js', 'cinematics.js'].includes(f));
for (const f of cutsceneBestanden) {
  for (const naam of new Set(modellen(f))) ok(VOERTUIGEN[naam] && VOERTUIGEN[naam].cutscene, `cutscene ${f}: model ${naam} is toegestaan`);
}
ok(cutsceneBestanden.length >= 4, 'cutscene-bestanden gevonden', cutsceneBestanden.join());

console.log(fails ? `vehicleregister_test: ${fails} van ${n} fout` : `vehicleregister_test: ${n}/${n} ok (${REGISTER_NAMEN.length} voertuigfamilies)`);
process.exit(fails ? 1 : 0);
