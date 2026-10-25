// Test voor de reclametaxi (#404): de teksten (Nederlands, verzonnen, geen echt bedrijf of nummer), het deuntje (een lus
// van eigen noten) en wanneer er een taxi gaat omroepen (hooguit één, af en toe, alleen een rijdende bestaande taxi).
import assert from 'node:assert';
import { REKLAME, SONG, STAP_S, LUS_S, midiHz, nootenTussen, REKLAME_REGELS, isReklameTaxi, kiesReklameTaxi, maakReklame, stapReklame, scrollBand, BAND_SNELHEID, bordActie } from '../game/js/reklametaxi.js';

let n = 0;
const ok = (c, naam, x) => { n++; assert.ok(c, naam + (x !== undefined ? ' ' + JSON.stringify(x) : '')); };

// --- teksten ---
ok(/^050-555 \d\d \d\d$/.test(REKLAME.nummer), 'nepnummer met 555', REKLAME.nummer);
ok(REKLAME.slogans.length >= 6, 'genoeg kreten');
ok(new Set(REKLAME.slogans).size === REKLAME.slogans.length, 'kreten verschillen');
for (const s of REKLAME.slogans) {
  const woorden = s.trim().split(/\s+/).length;
  ok(woorden >= 4 && woorden <= 16, 'kreet van 4 tot 16 woorden', s);
  ok(!/[a-z]{3}[A-Z]/.test(s), 'geen plakwoorden', s);
}
const alles = [REKLAME.naam, REKLAME.band, ...REKLAME.slogans].join(' | ');
// echte bedrijven en merken horen er niet in (AGENTS.md); een paar waarschijnlijke uitglijders
ok(!/\b(uber|bolt|tesla|tcg|taxi ?centrale|gasunie|shell|albert heijn|jumbo|google|whatsapp)\b/i.test(alles), 'geen echt bedrijf of merk');
ok(!/\b(the|and|call|now|cheap|taxi service|best)\b/i.test(alles), 'alleen Nederlands');
ok(!/(?<!\d)0\d{1,2}-?\d{6,7}(?!\d)/.test(alles.replace(/050-555 01 23/g, '')), 'geen ander telefoonnummer');
ok(REKLAME.band.includes(REKLAME.naam.toUpperCase()) && REKLAME.band.includes(REKLAME.nummer), 'de tekstband noemt naam en nummer');

// --- deuntje ---
ok(SONG.bpm >= 90 && SONG.bpm <= 150, 'tempo');
ok(Math.abs(LUS_S - SONG.stappen * STAP_S) < 1e-9 && LUS_S > 5 && LUS_S < 15, 'lus van een paar seconden', LUS_S);
const hele = nootenTussen(0, LUS_S);
ok(hele.length > 40, 'veel noten', hele.length);
for (const q of hele) {
  if (q.stem === 'lead') ok(q.midi >= 60 && q.midi <= 84, 'lead in bereik', q);
  if (q.stem === 'bas') ok(q.midi >= 36 && q.midi <= 52, 'bas in bereik', q);
  ok(q.dur > 0 && q.dur < 1, 'nootlengte', q);
  ok(q.t >= 0 && q.t < LUS_S, 'noot valt binnen de lus', q);
}
ok(Math.abs(midiHz(69) - 440) < 1e-9 && Math.abs(midiHz(81) - 880) < 1e-9, 'midiHz');
// geen twee leadnoten over elkaar
const leads = hele.filter((q) => q.stem === 'lead').sort((a, b) => a.t - b.t);
for (let i = 1; i < leads.length; i++) ok(leads[i - 1].t + leads[i - 1].dur <= leads[i].t + 1e-9, 'leadnoten lopen niet over elkaar', [leads[i - 1], leads[i]]);
// vensters sluiten op elkaar aan: geen noot twee keer of nooit
for (const knip of [0.37, 1.9, LUS_S / 2, LUS_S - 0.01]) {
  const a = nootenTussen(0, knip), b = nootenTussen(knip, LUS_S);
  ok(a.length + b.length === hele.length, 'vensters sluiten aan', knip);
}
// de lus herhaalt zich
const tweede = nootenTussen(LUS_S, 2 * LUS_S);
ok(tweede.length === hele.length && tweede.every((q, i) => Math.abs(q.t - LUS_S - hele[i].t) < 1e-6 && q.midi === hele[i].midi), 'de lus herhaalt zich');
ok(nootenTussen(5, 5).length === 0, 'leeg venster');

// --- wanneer en welke taxi ---
const rng0 = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const speler = { x: 0, y: 0 };
const taxi = (o = {}) => ({ id: 1, isTaxi: true, x: 80, y: 0, speed: 8, angle: 0, road: {}, driver: null, ...o });
ok(isReklameTaxi(taxi()), 'een rijdende taxi mag');
for (const slecht of [{ isTaxi: false }, { wrecked: true }, { parked: true }, { road: null }, { driver: 'player' }, { missionCar: true }, { sideJob: true }, { isPolice: true }]) ok(!isReklameTaxi(taxi(slecht)), 'taxi die niet mag', slecht);
ok(kiesReklameTaxi([taxi()], speler, rng0) !== null, 'kiest een taxi op 80 m');
ok(kiesReklameTaxi([taxi({ x: 20 })], speler, rng0) === null, 'te dichtbij');
ok(kiesReklameTaxi([taxi({ x: 400 })], speler, rng0) === null, 'te ver');
ok(kiesReklameTaxi([taxi({ speed: 0.5 })], speler, rng0) === null, 'staat stil');
ok(kiesReklameTaxi([], speler, rng0) === null, 'geen taxi');

// een rit: wachten, beginnen, kreten, stoppen, weer wachten; nooit twee tegelijk
{
  const st = maakReklame(rng0, 0);
  ok(st.volgende >= REKLAME_REGELS.eerstWacht[0] && st.volgende <= REKLAME_REGELS.eerstWacht[1], 'eerste wachttijd', st.volgende);
  const t = taxi();
  const lijst = [t];
  let nu = 0, starts = 0, kreten = 0, stops = 0, tegelijk = 0;
  const kreetTijden = [];
  for (let i = 0; i < 3600 * 2; i++) { // 2 uur in seconden
    nu += 1;
    const ev = stapReklame(st, 1, nu, { voertuigen: lijst, speler, rng: rng0 });
    for (const e of ev) {
      if (e.type === 'start') { starts++; ok(st.taxi === t, 'start zet de taxi'); }
      if (e.type === 'slogan') { kreten++; kreetTijden.push(nu); ok(REKLAME.slogans.includes(e.tekst), 'kreet uit de lijst'); }
      if (e.type === 'stop') { stops++; ok(e.reden === 'klaar', 'rustig afgelopen', e.reden); }
    }
    if (st.taxi) tegelijk = Math.max(tegelijk, 1);
  }
  ok(starts >= 10 && starts <= 40, 'af en toe: aantal reclametaxi\'s in twee uur', starts);
  ok(Math.abs(starts - stops) <= 1, 'elke start eindigt', [starts, stops]);
  ok(kreten >= starts * 3 && kreten <= starts * 8, 'een paar kreten per rit', [kreten, starts]);
  ok(tegelijk === 1, 'hooguit één tegelijk');
}
// de taxi verdwijnt, wordt gekaapt of rijdt te ver weg: dan stopt het meteen
{
  const mk = () => { const st = maakReklame(rng0, 0); st.volgende = 0; return st; };
  for (const [naam, verander, reden] of [
    ['uit de lijst', (t, l) => l.splice(0, 1), 'taxi weg'],
    ['gekaapt', (t) => { t.driver = 'player'; }, 'taxi weg'],
    ['gesloopt', (t) => { t.wrecked = true; }, 'taxi weg'],
    ['te ver', (t) => { t.x = 500; }, 'te ver'],
  ]) {
    const st = mk(), t = taxi(), l = [t];
    const e1 = stapReklame(st, 1, 1, { voertuigen: l, speler, rng: rng0 });
    ok(e1.some((e) => e.type === 'start'), 'begint: ' + naam);
    verander(t, l);
    const e2 = stapReklame(st, 1, 2, { voertuigen: l, speler, rng: rng0 });
    ok(e2.length === 1 && e2[0].type === 'stop' && e2[0].reden === reden && st.taxi === null, 'stopt: ' + naam, e2);
    ok(st.volgende >= 2 + REKLAME_REGELS.daarnaWacht[0], 'daarna een lange pauze: ' + naam, st.volgende);
  }
  // niet beginnen als het niet mag (filmpje) of als er geen taxi is
  const st = mk();
  ok(stapReklame(st, 1, 5, { voertuigen: [taxi()], speler, rng: rng0, mag: false }).length === 0 && !st.taxi, 'niet tijdens een filmpje');
  const st2 = mk();
  ok(stapReklame(st2, 1, 5, { voertuigen: [], speler, rng: rng0 }).length === 0 && st2.volgende === 5 + 15, 'zonder taxi na 15 s opnieuw');
}

// --- de lopende tekstband op het dakbord (#404, #436) ---
{
  // per seconde, niet per beeld: bij een lange of korte beeldtijd even ver
  ok(Math.abs(scrollBand(0, 1) - BAND_SNELHEID) < 1e-9, 'de band schuift per seconde');
  ok(Math.abs(scrollBand(0, 0.5) - BAND_SNELHEID * 0.5) < 1e-9, 'een half beeld is half zo ver');
  ok(Math.abs(scrollBand(0.5, 0.5) - (0.5 + BAND_SNELHEID * 0.5)) < 1e-9, 'de band gaat verder waar hij was');
  ok(scrollBand(0, 0) === 0, 'stilstand laat de band staan');
  let o = 0.9;
  for (let i = 0; i < 5; i++) o = scrollBand(o, 0.5);
  ok(o >= 0 && o < 1, 'de band blijft binnen 0..1 na een ronde', o);
  ok(scrollBand(0.99, -0.5) >= 0 && scrollBand(0.99, -0.5) < 1, 'ook bij een negatieve dt blijft de band in zijn baan');
  ok(BAND_SNELHEID > 0.02 && BAND_SNELHEID < 0.3, 'de band loopt leesbaar, niet te snel', BAND_SNELHEID);
}

// --- het dakbord en de mesh van de taxi (#436) ---
{
  // een nieuwe taxi of nog geen bord: maken
  ok(bordActie({ heeftBord: false }) === 'maak', 'zonder bord een bord maken');
  // de mesh is er even niet (ver weg, net opnieuw gebouwd): het bord blijft, het is van de taxi
  ok(bordActie({ heeftBord: true, hangt: true }) === 'laat', 'zonder mesh blijft het bord staan');
  ok(bordActie({ heeftBord: true, hangt: false }) === 'hang', 'zonder mesh en los hangend: niet weggooien');
  // dezelfde mesh, bord hangt er niet meer aan (een opruimronde haalde het eraf): terug eraan
  ok(bordActie({ heeftBord: true, levendMesh: true, zelfdeMesh: true, hangt: false }) === 'hang', 'zelfde mesh: bord er weer aan');
  ok(bordActie({ heeftBord: true, levendMesh: true, zelfdeMesh: true, hangt: true }) === 'laat', 'zelfde mesh en hangt: niets doen');
  // een ander, levend model voor dezelfde taxi: het bord hoort bij het nieuwe model
  ok(bordActie({ heeftBord: true, levendMesh: true, zelfdeMesh: false, hangt: true }) === 'vervang', 'nieuw model: bord vervangen');
}

console.log(`reklametaxi_test ok (${n} controles)`);
