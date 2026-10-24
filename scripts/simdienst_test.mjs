// De gedeelde simulatordienst (#444): starten, de regels, de voortgang en de uitslag met medaille.
//   node scripts/simdienst_test.mjs
import assert from 'node:assert';
import {
  DIENSTREGELS, MEDAILLES, MEDAILLE_AT, maakDienst, stapDienst, afbrekenDienst,
  dienstVoortgang, dienstUitslag, dienstStand, uitslagUitPunten,
} from '../game/js/simdienst.js';

const H = (x, y, naam) => ({ x, y, naam });
const dt = 0.5;

// Vaar/rij naar een punt en leg daar aan (blijf `stopS` seconden stil liggen).
function naar(d, doel, { v = 4, stopS = 3 } = {}) {
  const evs = [];
  let x = Number.isFinite(d.x) ? d.x : 0, y = Number.isFinite(d.y) ? d.y : 0;
  for (let k = 0; k < 20000; k++) {
    const dist = Math.hypot(doel.x - x, doel.y - y);
    if (dist <= 0.5) break;
    const sp = Math.min(v, dist / dt);
    x += ((doel.x - x) / dist) * sp * dt;
    y += ((doel.y - y) / dist) * sp * dt;
    evs.push(...stapDienst(d, { x, y, v: sp, dt }));
  }
  for (let k = 0; k < Math.ceil(stopS / dt) + 1; k++) evs.push(...stapDienst(d, { x: doel.x, y: doel.y, v: 0, dt }));
  return evs;
}

// --- dienstregeling -----------------------------------------------------------------------
const d = maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'Kade Noord'), H(100, 0, 'Kade Zuid'), H(220, 0, 'Sluis')] });
assert.strictEqual(d.naam, 'Schip');
assert.strictEqual(d.halten[0].due, 0, 'de eerste halte is meteen');
assert.ok(d.halten[1].due > 20 && d.halten[2].due > d.halten[1].due, 'de tijden lopen op');
assert.strictEqual(d.regels, DIENSTREGELS.schip, 'de regel van het vervoer geldt');
assert.strictEqual(d.i, 0);
assert.strictEqual(dienstVoortgang(d), 0, 'nog niets gedaan');
assert.deepStrictEqual(d.gemist, []);

// --- een hele dienst: op tijd, rustig en zonder fouten -------------------------------------
const goed = maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'A'), H(100, 0, 'B'), H(220, 0, 'C')] });
const evs = [
  ...naar(goed, { x: 0, y: 0 }),
  ...naar(goed, { x: 100, y: 0 }),
  ...naar(goed, { x: 220, y: 0 }),
];
const stops = evs.filter((e) => e.soort === 'halte');
assert.strictEqual(stops.length, 3, 'drie halten');
assert.ok(stops.every((e) => e.opTijd), 'op tijd: ' + JSON.stringify(stops.map((e) => e.late)));
assert.ok(evs.some((e) => e.soort === 'klaar'), 'de dienst is klaar');
assert.strictEqual(dienstVoortgang(goed), 1);
const u = dienstUitslag(goed);
assert.strictEqual(u.gehaald, 3);
assert.strictEqual(u.punctueel, 100);
assert.strictEqual(u.veilig, 100);
assert.strictEqual(u.punten, 95, 'een dienst zonder fouten is 95 punten (de bonus vult de rest)');
assert.strictEqual(u.medailleNaam, 'Goud');
assert.strictEqual(u.klaar, true);
assert.strictEqual(MEDAILLES[u.medaille], 'Goud');

// --- te langzaam: wel gehaald, niet op tijd ------------------------------------------------
const traag = maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'A'), H(100, 0, 'B')] });
naar(traag, { x: 0, y: 0 }, { v: 0.8 });
naar(traag, { x: 100, y: 0 }, { v: 0.8 });
const ut = dienstUitslag(traag);
assert.strictEqual(ut.gehaald, 2, 'ook langzaam haal je de halten');
assert.strictEqual(ut.punctueel, 50, 'de eerste halte is meteen, de tweede te laat');
assert.ok(ut.punten < u.punten && ut.punten >= 60, 'punten zonder punctualiteit: ' + ut.punten);
assert.strictEqual(ut.medailleNaam, 'Zilver', 'alle halten maar niet op tijd: geen goud');

// --- te hard: de veiligheid zakt ----------------------------------------------------------
const hard = maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'A'), H(1000, 0, 'B')] });
const hardEv = [];
for (let k = 0; k < 20; k++) hardEv.push(...stapDienst(hard, { x: k, y: 0, v: 20, dt }));
assert.ok(hardEv.some((e) => e.soort === 'tehard'), 'te hard wordt gemeld');
assert.ok(hard.teHard >= 9.5, 'de tijd te hard telt: ' + hard.teHard);
assert.ok(dienstUitslag(hard).veilig < 50, 'veiligheid zakt');

// --- voorbij de halte zonder stoppen: die telt niet mee ------------------------------------
const mis = maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'A'), H(60, 0, 'B')] });
const misEv = [];
for (let x = 0; x <= 200; x += 2) misEv.push(...stapDienst(mis, { x, y: 0, v: 3, dt: 0.2 }));
const gemist = misEv.filter((e) => e.soort === 'gemist');
assert.strictEqual(gemist.length, 2, 'beide halten voorbijgevaren');
assert.strictEqual(mis.gemist.length, 2);
const um = dienstUitslag(mis);
assert.strictEqual(um.gehaald, 0);
assert.strictEqual(um.gemist, 2);
assert.ok(um.punten <= 20, 'zonder halten weinig punten: ' + um.punten);
assert.strictEqual(um.medaille, 0);

// --- blijven liggen voor de halte telt pas na stopS ---------------------------------------
const wacht = maakDienst({ vervoer: 'schip', halten: [{ x: 0, y: 0, naam: 'Kade', stopS: 3 }] });
for (let k = 0; k < 4; k++) stapDienst(wacht, { x: 0, y: 0, v: 0, dt }); // 2 s: nog niet
assert.strictEqual(wacht.gehaald, 0, 'twee seconden is te kort');
assert.strictEqual(wacht.stopT, 2);
stapDienst(wacht, { x: 0, y: 0, v: 0, dt }); // 2,5 s
stapDienst(wacht, { x: 0, y: 0, v: 0, dt }); // 3 s
assert.strictEqual(wacht.gehaald, 1, 'na drie seconden telt de halte');
// wegvaren voor de tijd telt niet en de teller begint opnieuw
const weg = maakDienst({ vervoer: 'schip', halten: [{ x: 0, y: 0, naam: 'Kade', stopS: 3 }] });
stapDienst(weg, { x: 0, y: 0, v: 0, dt: 1 });
stapDienst(weg, { x: 40, y: 0, v: 3, dt: 1 });
assert.strictEqual(weg.gehaald, 0);
assert.strictEqual(weg.stopT, 0, 'de teller is gereset');

// --- stil: een halte die pas telt als je echt stilstaat ------------------------------------
const veld = maakDienst({ vervoer: 'vliegtuig', halten: [{ x: 0, y: 0, naam: 'Veld', stopR: 300, stopV: Infinity, stil: true }] });
stapDienst(veld, { x: 0, y: 0, v: 40, dt, stil: false });
assert.strictEqual(veld.gehaald, 0, 'in de lucht telt het veld niet');
stapDienst(veld, { x: 0, y: 0, v: 0, dt, stil: true });
assert.strictEqual(veld.gehaald, 1, 'aan de grond wel');

// --- stop: false blokkeert de halte (verkeerde hoogte) ------------------------------------
const hoog = maakDienst({ vervoer: 'vliegtuig', halten: [{ x: 0, y: 0, naam: 'Poort', stopR: 300, stopV: Infinity }] });
stapDienst(hoog, { x: 0, y: 0, v: 10, dt, stop: false });
assert.strictEqual(hoog.gehaald, 0, 'op de verkeerde hoogte telt de poort niet');
stapDienst(hoog, { x: 0, y: 0, v: 10, dt });
assert.strictEqual(hoog.gehaald, 1);

// --- te laat: de dienst mislukt ------------------------------------------------------------
const laat = maakDienst({ vervoer: 'bus', halten: [H(0, 0, 'A'), H(500, 0, 'B')], maxTijd: 10 });
const laatEv = stapDienst(laat, { x: 0, y: 0, v: 0, dt: 11 });
assert.strictEqual(laat.mislukt, 'te laat');
assert.ok(laatEv.some((e) => e.soort === 'mislukt'));
assert.strictEqual(dienstUitslag(laat).mislukt, 'te laat');

// --- afbreken: wat gedaan is telt ----------------------------------------------------------
const af = maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'A'), H(60, 0, 'B'), H(120, 0, 'C')] });
stapDienst(af, { x: 0, y: 0, v: 0, dt: 1 });
const ua = afbrekenDienst(af);
assert.strictEqual(ua.afgebroken, true);
assert.strictEqual(ua.gehaald, 1);
assert.ok(ua.punten < 60, 'een halve dienst levert minder: ' + ua.punten);

// --- punten naar medaille ------------------------------------------------------------------
assert.strictEqual(uitslagUitPunten('bus', 0).medaille, 0);
assert.strictEqual(uitslagUitPunten('bus', MEDAILLE_AT[0]).medailleNaam, 'Brons');
assert.strictEqual(uitslagUitPunten('bus', MEDAILLE_AT[1]).medailleNaam, 'Zilver');
assert.strictEqual(uitslagUitPunten('bus', MEDAILLE_AT[2]).medailleNaam, 'Goud');
assert.strictEqual(uitslagUitPunten('bus', MEDAILLE_AT[2] - 1).medailleNaam, 'Zilver');
assert.strictEqual(uitslagUitPunten('bus', 250).punten, 100, 'nooit boven de honderd');
assert.strictEqual(uitslagUitPunten('bus', -10).punten, 0, 'nooit onder nul');
assert.strictEqual(uitslagUitPunten('trein', 70, { gehaald: 2 }).gehaald, 2, 'extra velden gaan mee');

// --- de stand voor de HUD ------------------------------------------------------------------
const stand = dienstStand(goed);
assert.strictEqual(stand.vervoer, 'schip');
assert.strictEqual(stand.volgende, null, 'aan het eind is er geen volgende halte');
assert.strictEqual(stand.volgende ?? null, null);
{
  const half = maakDienst({ vervoer: 'schip', halten: [H(0, 0, 'A'), H(100, 0, 'B')] });
  for (let k = 0; k < 20; k++) stapDienst(half, { x: 0, y: 0, v: 0, dt: 0.5 });
  stapDienst(half, { x: 50, y: 0, v: 0, dt: 0.5 });
  const s = dienstStand(half);
  assert.strictEqual(s.volgende, 'B');
  assert.strictEqual(s.afstand, 50);
  assert.ok(s.voortgang > 0 && s.voortgang < 1, 'onderweg: ' + s.voortgang);
  assert.ok(Number.isFinite(s.late));
}

console.log('simdienst_test ok');
