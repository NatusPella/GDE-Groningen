// #954: het uitkijkpunt bij Vesting Bourtange werkt niet. Twee oorzaken:
//  1. het punt is de menupiek van de vesting en ligt midden in de vestingmolen; de
//     E-actie hing daardoor op een plek waar je niet hoort te staan;
//  2. regiolevenrt sloeg de E-actie van het uitkijkpunt over zolang de speler "ergens
//     mee bezig" was, en een actieve missie (Bourtange is missiegebied) telt daaronder.
// Deze test dekt de plek (snappen naar een open plekje), de installatie op de kaart en
// de volgorde in de update:
//   node scripts/uitkijkpunt_test.mjs
import fs from 'node:fs';
import { snapViewpoint, installeerUitkijkpunten, uitkijkpunten } from '../game/js/verkenpunten.js';
import { MENU_PLEKKEN } from '../game/js/menuplekken.js';
import { STREKEN } from '../game/js/regioleven.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };

// --- snapViewpoint ---------------------------------------------------------------------
const openAlles = { isOpenSpot: () => true };
const p1 = { x: 10.2, y: 20.7 };
const snap1 = snapViewpoint({ ...p1 }, openAlles);
ok(snap1.x === p1.x && snap1.y === p1.y, 'een punt op een open plek blijft staan');

// een gebouw van 6 bij 6 m rond (10, 20): het punt moet naar de rand
const dicht = (x, y) => !(x > 6.5 && x < 13.5 && y > 16.5 && y < 23.5);
const muur = { isOpenSpot: dicht };
const p2 = snapViewpoint({ x: 10.2, y: 20.7 }, muur);
ok(dicht(p2.x, p2.y), 'het punt staat niet meer in het gebouw', `${p2.x},${p2.y}`);
ok(Math.hypot(p2.x - 10.2, p2.y - 20.7) <= 8, 'en blijft dicht bij de oorspronkelijke plek', Math.hypot(p2.x - 10.2, p2.y - 20.7).toFixed(1));
const p2b = snapViewpoint({ ...p2 }, muur);
ok(p2b.x === p2.x && p2b.y === p2.y, 'nog eens snappen verandert niets');

// geen open plek binnen de straal: het punt blijft staan
const nergens = { isOpenSpot: () => false };
const p3 = snapViewpoint({ x: 1, y: 2 }, nergens, 5);
ok(p3.x === 1 && p3.y === 2, 'zonder open plek blijft het punt staan');

// --- de echte menupiek van Bourtange ----------------------------------------------------
const WEST = MENU_PLEKKEN.find((p) => p.streek === 'westerwolde');
ok(!!WEST && WEST.id === 'bourtange-vesting', 'Westerwolde heeft de vesting als menupiek');
// de molen van Bourtange (landmarkkits.json): het punt lag daarin
const molen = [42438.53, 22700.71, 42445.32, 22707.52];
const inMolen = (x, y) => x >= molen[0] && x <= molen[2] && y >= molen[1] && y <= molen[3];
ok(inMolen(WEST.x, WEST.y), 'de menupiek ligt in de vestingmolen (de gemeten oorzaak)');
const kaart = { meta: {}, isOpenSpot: (x, y) => !inMolen(x, y) };
const gezet = installeerUitkijkpunten(kaart, JSON.parse(fs.readFileSync(new URL('../game/landmarkkits.json', import.meta.url), 'utf8')).items);
ok(gezet.length === STREKEN.length, 'elke streek heeft nog een uitkijkpunt', String(gezet.length));
const w = gezet.find((p) => p.streek === 'westerwolde');
ok(!!w && !inMolen(w.x, w.y), 'het uitkijkpunt van Westerwolde staat buiten de molen', w ? `${w.x},${w.y}` : '-');
ok(!!w && Math.hypot(w.x - WEST.x, w.y - WEST.y) < 10, 'en vlak bij de vesting', w ? Math.hypot(w.x - WEST.x, w.y - WEST.y).toFixed(1) : '-');
ok(gezet.filter((p) => p.bron === 'menuplek' && p.streek !== 'westerwolde').every((p) => {
  const m = MENU_PLEKKEN.find((q) => q.streek === p.streek);
  return m && p.x === m.x && p.y === m.y;
}), 'de andere punten zijn niet verschoven');

// --- de updatevolgorde ------------------------------------------------------------------
const rt = fs.readFileSync(new URL('../game/js/regiolevenrt.js', import.meta.url), 'utf8');
const iUitkijk = rt.indexOf('tryViewpointInteract(w)');
const iBusy = rt.indexOf('if (playerBusy(w).busy) return;');
ok(iUitkijk > 0 && iBusy > 0 && iUitkijk < iBusy, 'het uitkijkpunt gaat vóór de algemene bezig-poort', `${iUitkijk} < ${iBusy}`);
ok(/playerBusy\(w, \['cinematic', 'respawn', 'padel', 'activityGame', 'heliRun', 'pigeon', 'train'\]\)/.test(rt), 'een missie houdt het uitkijkpunt niet meer tegen');
ok(!/playerBusy\(w, \[[^\]]*missionPhase/.test(rt), 'de missiefase staat niet in de uitzonderingen');

// en het punt is met de echte STREKEN ook echt het punt van Westerwolde
const punten = uitkijkpunten([], MENU_PLEKKEN, STREKEN);
ok(punten.find((p) => p.streek === 'westerwolde').x === WEST.x, 'zonder kaart blijft de bron de menupiek');

console.log(bad ? `${bad} van ${n} mislukt` : `uitkijkpunt_test: ok (${n} controles)`);
process.exit(bad ? 1 : 0);
