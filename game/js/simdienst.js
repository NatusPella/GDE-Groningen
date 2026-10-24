// Simulatordienst (#444): één laag voor de dienst van trein, bus, vliegtuig en schip.
// Starten, de regels (snelheid, haltes, stops), de voortgang en de uitslag met medaille
// staan hier één keer; de besturing en de eigen mechanica blijven in traindrive.js,
// busride.js, arcadeplane.js en zeilvaren.js. Puur: geen THREE, geen DOM, geen wereld,
// geen klok van buiten (de tijd komt mee in de stap). Tests: scripts/simdienst_test.mjs.
import { medalFrom, clamp } from './minigamekit.js';

export const MEDAILLES = ['geen medaille', 'Brons', 'Zilver', 'Goud'];
export const MEDAILLE_AT = [55, 75, 92]; // punten voor brons, zilver en goud

// De regels per vervoermiddel. stopR: hoe dicht bij de halte; stopV: hoe langzaam om te
// stoppen; vmax: de hoogste toegestane snelheid; vaart: de snelheid waarop de dienstregeling
// rekent; venster: seconden die nog "op tijd" zijn; marge: m/s waarboven te hard telt;
// wacht: seconden die een halte minimaal kost in de dienstregeling.
export const DIENSTREGELS = {
  trein: { naam: 'Trein', stopR: 30, stopV: 0.3, vmax: 25, vaart: 20, venster: 10, marge: 1, wacht: 10 },
  bus: { naam: 'Bus', stopR: 12, stopV: 1.5, vmax: 14, vaart: 8.5, venster: 12, marge: 2, wacht: 9 },
  vliegtuig: { naam: 'Vliegtuig', stopR: 220, stopV: 62, vmax: 70, vaart: 48, venster: 30, marge: 8, wacht: 0 },
  schip: { naam: 'Schip', stopR: 18, stopV: 1.2, vmax: 5.5, vaart: 4, venster: 20, marge: 1, wacht: 6 },
};

// Een dienst: halten (in volgorde) met een geplande aankomsttijd (due, seconden na de start).
// Een halte mag zijn eigen stopR, stopV, stopS (seconden blijven liggen), wacht en vaart meegeven;
// een eigen due gaat voor.
export function maakDienst({ vervoer = 'bus', naam = null, halten = [], maxTijd = null, bonus = 0 } = {}) {
  const regel = DIENSTREGELS[vervoer] || DIENSTREGELS.bus;
  let t = 0, prev = null;
  const lijst = halten.map((h) => {
    const stop = { ...h, naam: h.naam || 'Halte' };
    if (prev) {
      const d = Math.hypot(stop.x - prev.x, stop.y - prev.y);
      t += Math.max(6, d / (stop.vaart || regel.vaart));
    }
    stop.due = stop.due != null ? stop.due : t;
    t = stop.due + (stop.wacht != null ? stop.wacht : regel.wacht);
    prev = stop;
    return stop;
  });
  return {
    vervoer, naam: naam || regel.naam, halten: lijst, regels: regel, i: 0,
    t: 0, x: NaN, y: NaN, gehaald: 0, opTijd: 0, teHard: 0, gemist: [], inBereik: false,
    klaar: false, afgebroken: false, mislukt: null, maxTijd, bonus,
  };
}

const einde = (d) => d.klaar || d.afgebroken || !!d.mislukt;

// Eén beeld. s: { x, y, v (m/s, absoluut), dt, stil, stop }. Een halte met stil: true telt pas
// als s.stil niet false is (een vliegtuig telt zijn veld pas als het aan de grond staat); met
// s.stop === false telt er deze stap geen halte (de piloot zit bijvoorbeeld op de verkeerde hoogte).
// Geeft de gebeurtenissen: 'halte', 'gemist', 'tehard', 'mislukt', 'klaar'.
export function stapDienst(d, s) {
  const ev = [];
  if (einde(d)) return ev;
  const dt = Math.max(0, s.dt || 0);
  d.t += dt;
  d.x = s.x; d.y = s.y;
  const regel = d.regels || DIENSTREGELS[d.vervoer] || DIENSTREGELS.bus;
  const v = Math.abs(s.v || 0);
  const max = d.vmax || regel.vmax;
  if (max && v > max + regel.marge) {
    d.teHard += dt;
    if (!d.teHardGemeld) { d.teHardGemeld = true; ev.push({ soort: 'tehard', snelheid: Math.round(v), max }); }
  } else d.teHardGemeld = false;
  const h = d.halten[d.i];
  if (h) {
    const r = h.stopR != null ? h.stopR : regel.stopR;
    const dist = Math.hypot(h.x - s.x, h.y - s.y);
    const stil = s.stil !== false;
    const mag = dist <= r && v <= (h.stopV != null ? h.stopV : regel.stopV) && (!h.stil || stil) && s.stop !== false;
    if (mag) {
      // stopS: eerst zo veel seconden stil blijven liggen voor de halte telt (aanleggen, deuren)
      d.stopT = (d.stopT || 0) + dt;
      if (d.stopT + 1e-9 >= (h.stopS || 0)) {
        d.stopT = 0;
        const late = d.t - h.due;
        const opTijd = Math.abs(late) <= (h.venster != null ? h.venster : regel.venster);
        d.gehaald++;
        if (opTijd) d.opTijd++;
        d.i++;
        d.inBereik = false;
        const laatste = d.i >= d.halten.length;
        ev.push({ soort: 'halte', index: d.i - 1, halte: h, seconden: d.t, late, opTijd, laatste });
        if (laatste) {
          d.klaar = true;
          ev.push({ soort: 'klaar', uitslag: dienstUitslag(d) });
        }
      }
    } else {
      d.stopT = 0;
      if (dist <= r * 2) {
        d.inBereik = true;
      } else if (d.inBereik && dist > r * 2.5) {
        // voorbij de halte zonder te stoppen: die telt niet mee (en de dienst gaat door)
        d.gemist.push({ naam: h.naam, index: d.i, seconden: d.t });
        d.i++;
        d.inBereik = false;
        const laatste = d.i >= d.halten.length;
        ev.push({ soort: 'gemist', index: d.i - 1, halte: h, laatste });
        if (laatste) {
          d.klaar = true;
          ev.push({ soort: 'klaar', uitslag: dienstUitslag(d) });
        }
      }
    }
  }
  if (d.maxTijd && d.t > d.maxTijd && !d.klaar) {
    d.mislukt = 'te laat';
    ev.push({ soort: 'mislukt', reden: 'te laat' });
  }
  return ev;
}

// De dienst afbreken (de speler stapt uit of stopt): wat gedaan is telt, de rest niet.
export function afbrekenDienst(d) {
  if (!einde(d) && !d.klaar) d.afgebroken = true;
  return dienstUitslag(d);
}

// Hoe ver de dienst is, 0 tot 1: de gehaalde halten plus het stuk naar de volgende.
export function dienstVoortgang(d) {
  const n = d.halten.length;
  if (!n) return 1;
  if (d.klaar) return 1;
  const next = d.halten[d.i];
  if (!next) return 1;
  if (!d.i) return 0;
  const vorige = d.halten[d.i - 1];
  const leg = Math.hypot(next.x - vorige.x, next.y - vorige.y) || 1;
  const rest = Number.isFinite(d.x) ? Math.hypot(next.x - d.x, next.y - d.y) : leg;
  return clamp((d.i + (1 - Math.min(1, rest / leg))) / n, 0, 1);
}

// Punten naar een uitslag met medaille. Zo houden trein en bus (met hun eigen, rijkere
// regels) en vliegtuig en schip (via de dienst hierboven) dezelfde vorm. Een vervoer dat zijn
// eigen medaille al heeft (de trein, machinistrules.js) geeft die mee als extra.medaille.
export function uitslagUitPunten(vervoer, punten, extra = {}) {
  const p = clamp(Math.round(punten), 0, 100);
  const { medaille: eigen, ...rest } = extra;
  const medaille = eigen != null ? clamp(Math.round(eigen), 0, 3) : medalFrom(p, MEDAILLE_AT);
  return { vervoer, punten: p, medaille, medailleNaam: MEDAILLES[medaille], ...rest };
}

// De uitslag: gehaalde halten (55), op tijd (25) en niet te hard (15), plus een bonus. Een
// afgebroken of mislukte dienst levert hooguit 40 punten: geen medaille voor onafgemaakt werk.
export function dienstUitslag(d) {
  const totaal = d.halten.length;
  const gehaaldDeel = totaal ? d.gehaald / totaal : 0;
  const opTijdDeel = d.gehaald ? d.opTijd / d.gehaald : 0;
  const veilig = clamp(1 - d.teHard / Math.max(10, d.t), 0, 1);
  let punten = 55 * gehaaldDeel + 25 * opTijdDeel + 15 * veilig + (d.bonus || 0);
  if (d.afgebroken || d.mislukt) punten = Math.min(punten, 40);
  return uitslagUitPunten(d.vervoer, punten, {
    naam: d.naam, gehaald: d.gehaald, totaal, opTijd: d.opTijd,
    punctueel: Math.round(opTijdDeel * 100), veilig: Math.round(veilig * 100),
    seconden: Math.round(d.t * 10) / 10, teHard: Math.round(d.teHard),
    gemist: d.gemist.length, klaar: !!d.klaar, afgebroken: !!d.afgebroken, mislukt: d.mislukt || null,
    bonus: d.bonus || 0,
  });
}

// Wat een HUD of het loopbaanscherm van één beeld nodig heeft (geen opmaak, alleen cijfers).
export function dienstStand(d) {
  const h = d.halten[d.i];
  return {
    vervoer: d.vervoer, naam: d.naam, voortgang: dienstVoortgang(d),
    volgende: h ? h.naam : null,
    afstand: h && Number.isFinite(d.x) ? Math.round(Math.hypot(h.x - d.x, h.y - d.y)) : null,
    late: h ? Math.round(d.t - h.due) : null,
    gehaald: d.gehaald, totaal: d.halten.length, klaar: !!d.klaar, mislukt: d.mislukt || null, afgebroken: !!d.afgebroken,
  };
}
