// Twee fouten die als de rode balk 'Er ging iets mis: ...' in beeld kwamen (21-11):
//   - "Cannot read properties of undefined (reading 'opdracht')": de meedoen-functies van coopmeedoen.js lazen een
//     standaardwaarde uit `st.opdracht` terwijl `st` (de stand van een gast of van een host zonder stand) ontbrak;
//   - "idx.inWater is not a function": een waterindex zonder functies (kaart zonder raster, kaartkopie, mislukte opbouw).
// De guards staan in coopmeedoen.js en waterindex.js; deze test dekt ze zonder spel, wereld of netwerk.
import fs from 'node:fs';
import * as M from '../game/js/coopmeedoen.js';
import { getWaterIndex, waterIndexAt } from '../game/js/waterindex.js';
import { showFrameError, frameErrorModel } from '../game/js/fouttoast.js';

let n = 0, fout = 0;
const ok = (c, w) => { n++; if (!c) { fout++; console.error('FOUT: ' + w); } };
const werpt = (f) => { try { f(); return false; } catch (e) { return String(e && e.message || e); } };

// ---- coopmeedoen: een ontbrekende stand is geen crash ----
for (const [naam, f] of [
  ['einde(undefined)', () => M.einde(undefined)],
  ['einde(null)', () => M.einde(null)],
  ['antwoord(undefined, 0, true)', () => M.antwoord(undefined, 0, true)],
  ['bevestig(undefined, 1)', () => M.bevestig(undefined, 1)],
  ['laat(undefined, 1)', () => M.laat(undefined, 1)],
  ['tik(undefined, 0.1)', () => M.tik(undefined, 0.1)],
  ['begin(undefined, "1|x", [1])', () => M.begin(undefined, '1|x', [1])],
  ['beginGast(undefined, "1|x", [1])', () => M.beginGast(undefined, '1|x', [1])],
  ['loopVrij(undefined, 1)', () => M.loopVrij(undefined, 1)],
  ['krijgtDeel(undefined, 1)', () => M.krijgtDeel(undefined, 1)],
  ['meespelers(undefined)', () => M.meespelers(undefined)],
  ['standVan(undefined)', () => M.standVan(undefined)],
]) ok(werpt(f) === false, `${naam} werpt niet (${werpt(f)})`);
ok(M.antwoord(undefined, 0, true) === false, 'antwoord zonder stand is false');
ok(M.laat(undefined, 1) === null, 'laat zonder stand is null');
ok(Array.isArray(M.tik(undefined, 1)) && M.tik(undefined, 1).length === 0, 'tik zonder stand geeft een lege lijst');
ok(Array.isArray(M.begin(undefined, 'x', [1])) && M.begin(undefined, 'x', [1]).length === 0, 'begin zonder stand geeft een lege lijst');
// het gewone gedrag blijft: een echte stand begint, krijgt een antwoord en sluit
{
  const st = M.maakMeedoen();
  const uit = M.begin(st, '1|test', [1]);
  ok(uit.length === 1 && st.opdracht === '1|test', 'begin met een stand werkt nog');
  ok(M.antwoord(st, 1, true) === true && st.keuze[1] === 'ja', 'antwoord met een stand werkt nog');
  M.einde(st);
  ok(st.opdracht === null, 'einde met een stand werkt nog');
}

// ---- waterindex: een index zonder functies wordt vervangen ----
{
  const map = { water: [] };
  const a = getWaterIndex(map);
  ok(typeof a.inWater === 'function' && a.inWater(0, 0) === false, 'een kaart zonder raster geeft een werkende index');
  map._waterIndex = {}; // een kopie zonder functies, met dezelfde versie
  map._waterIndexSeen = map._staticWaterVer || 0;
  const b = getWaterIndex(map);
  ok(typeof b.inWater === 'function', 'een kapotte gecachete index wordt opnieuw gebouwd');
  ok(typeof getWaterIndex(null).inWater === 'function', 'geen kaart geeft een lege index');
  ok(typeof getWaterIndex(undefined).inWater === 'function', 'geen kaart (undefined) geeft een lege index');
  const c = waterIndexAt({ water: [], waterNear: () => [], waterGrid: {}, _tileWater: new Map() }, 5, 5);
  ok(typeof c.inWater === 'function', 'waterIndexAt geeft altijd een index met inWater');
  const poly = { pts: [[0, 0], [10, 0], [10, 10], [0, 10]], _wi: { kapot: true } };
  const d = getWaterIndex({ water: [poly], waterNear: () => [poly], waterGrid: null }, poly);
  ok(typeof d.inWater === 'function', 'een polygoon met een kapotte _wi krijgt een nieuwe index');
}

// ---- de foutmelding: technische tekst blijft onder Details, de zichtbare tekst is Nederlands en kort ----
{
  const m = frameErrorModel(new TypeError("Cannot read properties of undefined (reading 'opdracht')"));
  ok(m.titel === 'Er ging iets mis', 'de titel is "Er ging iets mis"');
  ok(!/Cannot read|undefined|opdracht/.test(m.tekst), 'de zichtbare tekst bevat geen technische melding');
  ok(/Cannot read properties/.test(m.details), 'de technische melding staat in de details');
  ok(m.tekst.split(/\s+/).length <= 20, 'de zichtbare tekst is kort');
  ok(!!frameErrorModel('een tekst').details, 'een fout zonder message heeft toch details');
  ok(typeof showFrameError === 'function', 'showFrameError bestaat');
  // #1210: een speler leest een korte zin met wat hij moet doen; de ontwikkelaarsdetails zijn er alleen in een dev- of testrun
  ok(/Kopieer het foutrapport en stuur het ons/.test(m.tekst) && !/Meld je het/.test(m.tekst), 'de foutzin zegt wat de speler doet');
  const toastBron = fs.readFileSync(new URL('../game/js/fouttoast.js', import.meta.url), 'utf8');
  ok(/\.\.\.\(DEV \? \[det\] : \[\]\)/.test(toastBron), 'de details staan alleen in een dev- of testrun in de kaart');
  ok(!/kopieer\.className = 'ds-z-knop ds-z-knop--secundair'/.test(toastBron), 'Kopieer is de hoofdactie, niet secundair');
}

console.log(`foutbronnen_test: ${n - fout}/${n} controles`);
process.exit(fout ? 1 : 0);
