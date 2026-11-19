// AAA-upgrade van akte 2 (AAA-upgradeplan, M07 tot M11 en de bietencampagne A1): de pure plannen. De defs in
// missions_akte2.js vragen hier hun regelkaart, aankleding en wachtfiguur aan; pg_skutsje.js en sidejob_bieten.js halen er het
// publiek en de kaart op. Alles is data of een kleine pure functie (te testen zonder wereld); tekenen doen regelkaart.js,
// crowd.js en wachtprops.js.
//
// Samen spelen: alles is lokaal beeld bij de speler die de stap of bijbaan zelf draait. Er gaat niets over het net en er wordt
// niets in wereld, beloning of voortgang geschreven (per speler, #429); wie wegvalt of later aansluit mist alleen beeld.
import { seedFromKey } from './crowdplan.js';

const eindig = (v) => typeof v === 'number' && Number.isFinite(v);

// --- Regelkaarten (step.kaart, zie regelkaart.js) ----------------------------------------------------------------------

// M07 Al het vet van Grunn: de tankwagen kapen of zijn banden stukschieten.
export const KAART_M07 = {
  doel: 'Kaap de tankwagen of schiet zijn banden plat',
  druk: 'je hebt drie minuten',
  afloop: 'ontsnapt hij, dan begin je opnieuw',
  regels: [
    { type: 'stappen', inv: { label: 'Twee manieren', klaar: 0, stappen: [{ icoon: 'auto', label: 'Erin springen' }, { icoon: 'vet', label: 'Banden stuk' }] }, na: 8, duur: 7 },
    { type: 'teller', inv: { rest: 180, totaal: 180, label: 'Tijd' }, na: 20, duur: 6 },
  ],
};

// M08 Fatbikes tellen niet als fiets: de regel was "loop en overleef", nergens te zien.
export const KAART_M08 = {
  doel: 'Loop door de fatbikes naar Oma Trijntje',
  druk: 'binnen 160 seconden',
  afloop: 'geschept worden kost een tel, geen leven',
  regels: [
    { type: 'stappen', inv: { label: 'De straat uit', klaar: 0, stappen: [{ icoon: 'pijl', label: 'Wijk uit' }, { icoon: 'hand', label: 'Niet remmen: zij doen het niet' }, { icoon: 'hart', label: 'Over de Ebbingebrug' }] }, na: 8, duur: 8 },
    { type: 'teller', inv: { rest: 160, totaal: 160, label: 'Tijd' }, na: 24, duur: 6 },
  ],
};

// M09 Heel aankomen: de eierwidget (limiet en voorraad) als kaart, een regel tegelijk.
export const KAART_M09 = {
  doel: 'Breng de zestig eieren heel naar de kerkkelder',
  afloop: 'te veel eieren stuk: opnieuw proberen',
  regels: [
    { type: 'limiet', inv: { waarde: 0, limiet: 40, marge: 6, label: 'Snelheid' }, na: 7, duur: 8 },
    { type: 'voorraad', inv: { heel: 60, totaal: 60, icoon: 'ei', label: 'Eieren' }, bij: 'eierstoot', duur: 8 },
    { type: 'stappen', inv: { label: 'De rit', klaar: 0, stappen: [{ icoon: 'auto', label: 'Wierdepaden' }, { icoon: 'pakje', label: 'Tussenstop' }, { icoon: 'ei', label: 'Kerkkelder' }] }, na: 30, duur: 8 },
  ],
};

// M10 Een trekker-limo: waarom de quad de limo kwijtraakt (de regel stond alleen in de say-tekst).
export const KAART_M10 = {
  doel: 'Schud de limo af over de wierdepaden',
  afloop: 'zit hij drie seconden op je bumper, dan pakt Jelle de koffer',
  regels: [
    { type: 'stappen', inv: { modus: 'legenda', label: 'Zo raak je hem kwijt', stappen: [{ icoon: 'pijl', label: 'Kerkenpad', waarde: 'smal' }, { icoon: 'hart', label: 'Kerktuin', waarde: 'door' }, { icoon: 'auto', label: 'Wierdepad', waarde: 'om' }] }, na: 6, duur: 9 },
    { type: 'wijzer', inv: { afstand: 20, hoek: Math.PI, label: 'Limo achter je' }, tekst: 'De trekker-limo zit vlak achter je. Blijf rijden en neem een smal pad.', bij: 'limo', duur: 7 },
  ],
};

// M11 Geleend van de Friezen: langszij, aan boord, en daarna het zout (kustwacht).
export const KAART_M11_VAREN = {
  doel: 'Haal het skûtsje in en spring aan boord',
  druk: 'vier minuten',
  afloop: 'vaart het skûtsje weg, dan begin je opnieuw',
  regels: [
    { type: 'stappen', inv: { label: 'Aan boord komen', klaar: 0, stappen: [{ icoon: 'pijl', label: 'Vlak langszij' }, { icoon: 'hand', label: 'Even naast hem blijven' }, { icoon: 'hart', label: 'Tammo springt' }] }, na: 8, duur: 8 },
    { type: 'teller', inv: { rest: 240, totaal: 240, label: 'Tijd' }, na: 24, duur: 6 },
  ],
};
export const KAART_M11_ZOUT = {
  doel: 'Schep drie zoutkuipen leeg en wees terug voor het water komt',
  druk: 'ruim drie minuten',
  afloop: 'in het licht gezien of te laat: opnieuw',
  regels: [
    { type: 'toets', inv: { toetsen: ['Ctrl'], handeling: 'houd', label: 'Bukken als het licht komt' }, na: 8, duur: 8 },
    { type: 'teller', inv: { rest: 210, totaal: 210, label: 'Water komt' }, na: 22, duur: 6 },
    { type: 'stappen', inv: { label: 'Drie kuipen', klaar: 0, stappen: [{ icoon: 'zout', label: 'Kuip 1' }, { icoon: 'zout', label: 'Kuip 2' }, { icoon: 'zout', label: 'Kuip 3' }] }, na: 38, duur: 7 },
  ],
};

// A1 Bietenoogst: de rij en de lading (de bijbaan toont hem als kaart bij elke ronde).
export function kaartA1(vMin, vMax) {
  const lo = eindig(vMin) ? vMin : 2, hi = eindig(vMax) && vMax > lo ? vMax : lo + 4;
  return {
    doel: 'Rooi vier rijen en breng de bieten naar de hoop',
    afloop: 'rij je slordig, dan gaat dat van je loon af',
    regels: [
      { type: 'limiet', inv: { waarde: 0, limiet: Math.round(hi), marge: 1, eenheid: 'm/s', label: 'Rooisnelheid' }, na: 6, duur: 8 },
      { type: 'stappen', inv: { label: 'De oogst', klaar: 0, stappen: [{ icoon: 'pijl', label: `Rij recht, ${Math.round(lo)} tot ${Math.round(hi)} m/s` }, { icoon: 'pakje', label: 'Naar de hoop' }, { icoon: 'hart', label: 'Weegbrug' }] }, na: 16, duur: 8 },
    ],
  };
}

// --- Wachtfiguren (step.wacht, zie wachtprops.js) -----------------------------------------------------------------------

// M11: de drie zoutkuipen op de kwelder. Klaas wacht bij de eerste met zijn kist, bij de laatste staat hij rustig te kijken.
export const WACHT_M11 = [
  { figuur: true, prop: 'kist', seed: 0.21 },
  { figuur: true, prop: 'ton', seed: 0.57 },
  { figuur: true, prop: 'baal', seed: 0.83 },
];

// --- Publiek van de skûtsje-sprint ---------------------------------------------------------------------------------------

// Twee groepen toeschouwers langs de Diepenring: een grote bij de start aan de kade (de zijde waar de speler aan boord gaat) en
// een kleinere bij de finish bij de Hoge der A. `at(s)` geeft een punt { x, y } van de vaarlijn op afstand s; `side` is de zijde
// van de kade (1 of -1, zoals de aanlegplaats), `s0` en `s1` zijn begin en eind van de race.
export function skutsjePubliek(at, s0, s1, side = 1) {
  if (typeof at !== 'function' || !eindig(s0) || !eindig(s1) || !(s1 > s0)) return null;
  const punten = (a, b) => {
    const lijst = [];
    for (let k = 0; k <= 3; k++) { const q = at(a + ((b - a) * k) / 3); if (!q || !eindig(q.x) || !eindig(q.y)) return null; lijst.push([q.x, q.y]); }
    return lijst;
  };
  const kant = side < 0 ? 'right' : 'left';
  const start = punten(s0 - 4, s0 + 36), finish = punten(Math.max(s0 + 1, s1 - 36), s1 + 2);
  if (!start || !finish) return null;
  return {
    start: { shape: 'line', pts: start, count: 24, seed: seedFromKey('pg_skutsje.start'), side: 6, spread: 5, sides: kant },
    finish: { shape: 'line', pts: finish, count: 16, seed: seedFromKey('pg_skutsje.finish'), side: 7, spread: 5, sides: 'both' },
  };
}

// De sprint heeft een klok van `limit` seconden: één keer waarschuwen in de laatste minuut.
export function sprintBijna(elapsed, limit, alGemeld, marge = 60) {
  return !alGemeld && eindig(elapsed) && eindig(limit) && elapsed > 0 && limit - elapsed <= marge && elapsed < limit;
}

// De brug gaat open voor de boot: één keer per brug klinkt de sting (afkoeltijd van de bank doet de rest), zodat de speler hoort
// dat zijn wachten bij het hek bedoeld is. `bekend` is de verzameling van bruggen waarvoor het al klonk.
export function brugSeinNodig(bekend, brug, staat) {
  if (!bekend || !brug || staat === 'closed') return false;
  const sleutel = String(brug.name || `${Math.round(brug.x)},${Math.round(brug.y)}`);
  if (bekend.has(sleutel)) return false;
  bekend.add(sleutel);
  return true;
}

// --- Publiek bij de suikerhal (A1) ---------------------------------------------------------------------------------------

// De aankomst bij de bietenhoop: twee wegers en een paar collega's (een klein publiek) in een ring rond de hoop, met een opening
// naar waar de trekker komt. `hoop` is { x, y }; `hoek` is de richting waar de trekker vandaan komt (radialen).
export function hoopPubliek(hoop, hoek = 0) {
  if (!hoop || !eindig(hoop.x) || !eindig(hoop.y)) return null;
  return { shape: 'ring', x: hoop.x, y: hoop.y, radius: 11, depth: 3, count: 8, seed: seedFromKey('A1.hoop'), gapA: eindig(hoek) ? hoek : 0, gapW: 1.0 };
}
