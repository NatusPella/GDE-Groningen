// Het daglichtprofiel van de zomerdag (daynight.js computeLighting): node scripts/daglicht_profiel_test.mjs
// (eenmalig: cd desktop && npm run stage, of GDE_VENDOR_CACHE=desktop/vendor-cache)
// Bewaakt de kleurtaal van het licht over het etmaal (Wereldkleur-DS3, sprint licht 22-11):
//  - overdag is de zon warm (rood >= blauw) en bij een lage zon (gouden uur) warmer dan 's middags;
//  - de schaduwen worden bij een lage zon niet harder: het hemelvullicht (hemiI) is dan minstens 88% van 's middags;
//  - de schaduwverhouding (zon tegen hemel) blijft overdag begrensd, zodat schaduwen zacht blijven;
//  - mist en horizon liggen dicht bij elkaar (geen weggedrukte horizon: de mist heeft geen andere kleur dan de rand van de lucht);
//  - alles is eindig en continu: geen sprong groter dan een vaste stap per kwartier;
//  - de zon staat altijd boven de lichthoek (het schaduwlicht), en de nacht blijft een koel maanlicht.
import './node3d.mjs';
const { computeLighting } = await import('../game/js/daynight.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

const out = {};
const snap = (hour) => {
  const L = computeLighting(hour, out);
  return {
    hour, e: L.elevation, sun: L.sun.clone(), horizon: L.horizon.clone(), fog: L.fog.clone(), hemiI: L.hemiI, sunI: L.sunI,
    exp: L.exp, sat: L.sat, con: L.con, isMoon: L.isMoon, daylight: L.daylight, night: L.night, lightY: L.lightDir.y,
  };
};
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

const rows = [];
for (let h = 0; h < 24; h += 0.25) rows.push(snap(h));

// elke waarde eindig
ok(rows.every((r) => [r.e, r.hemiI, r.sunI, r.exp, r.sat, r.con, r.lightY, r.sun.r, r.sun.g, r.sun.b, r.fog.r, r.horizon.r].every(Number.isFinite)), 'alle lichtwaarden zijn eindig');

// de hoogste zon als referentie voor een hoge middag en de laagste daguur voor het gouden uur
const noon = rows.reduce((a, b) => (b.e > a.e ? b : a));
const golden = rows.filter((r) => r.e > 4 && r.e < 16).reduce((a, b) => (a && Math.abs(a.e - 10) < Math.abs(b.e - 10) ? a : b), null);
ok(noon.e > 45, 'de zomerzon komt hoog', String(noon.e));
ok(golden && golden.e > 4 && golden.e < 16, 'er is een gouden uur in het etmaal');

const warmth = (c) => (c.r + 1e-6) / (c.b + 1e-6);
ok(warmth(noon.sun) >= 1, 'de middagzon is niet koud');
ok(warmth(golden.sun) > warmth(noon.sun) + 0.15, 'het gouden uur is merkbaar warmer dan de middag', `${warmth(golden.sun)} ${warmth(noon.sun)}`);

// zachte schaduwen: hemiI blijft in het gouden uur dicht bij de middag, en de zon-hemel-verhouding is begrensd
ok(golden.hemiI >= noon.hemiI * 0.88, 'het gouden uur houdt het hemelvullicht (zachte schaduwen)', `${golden.hemiI} ${noon.hemiI}`);
for (const r of rows.filter((x) => x.e > 6)) {
  const ratio = r.sunI / r.hemiI;
  ok(ratio > 2.2 && ratio < 3.9, 'overdag blijft de schaduwverhouding zacht (zon tegen hemel)', `${r.hour}u: ${ratio.toFixed(2)}`);
}

// geen weggedrukte horizon: de mist en de horizon verschillen overdag hooguit een kwart in helderheid
for (const r of rows.filter((x) => x.e > 6)) {
  const a = lum(r.fog), b = lum(r.horizon);
  ok(Math.abs(a - b) / Math.max(a, b) < 0.25, 'de dagmist heeft de helderheid van de horizon', `${r.hour}u: ${a.toFixed(3)} ${b.toFixed(3)}`);
}

// continuiteit: geen sprong in een kwartier spelertijd (een zonsopkomst loopt in ca. 15 s echte tijd van 0,3 naar 1,4 zonsterkte: de ruimste stap; de vloeiende kromme van lightcurve.js (22-11) loopt midden in zo'n stuk tot 1,5x steiler dan de rechte lijn, vandaar 1,3 in plaats van 1,1: de totale verandering en de sleutels zijn gelijk, alleen de knik op de sleutel is weg)
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1], b = rows[i];
  ok(Math.abs(a.sunI - b.sunI) < 1.3 && Math.abs(a.hemiI - b.hemiI) < 0.3 && Math.abs(a.exp - b.exp) < 0.1, 'het licht verspringt niet', `${b.hour}u`);
}

// schaduwlicht boven de horizon; 's nachts koel maanlicht
ok(rows.every((r) => r.lightY > 0.03), 'het schaduwlicht blijft boven de horizon');
const night = rows.filter((r) => r.night > 0.95);
ok(night.length > 4 && night.every((r) => r.isMoon && r.sun.b >= r.sun.r), 'de nacht heeft koel maanlicht');

console.log(fails ? `${fails} of ${n} FAILED` : `ok: ${n} checks`);
process.exit(fails ? 1 : 0);
