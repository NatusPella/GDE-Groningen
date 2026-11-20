// De HUD-stand van de taxi-bijbaan (#985): puur, geen DOM en geen THREE (scripts/taxihud_test.mjs). Maakt uit de stand van een rit het model voor de gedeelde strook
// (simhud.js): de stappen (ophalen, meerijden, afzetten), een meter voor het comfort van je klant, de afstand tot het doel (groot) met je rit en je tijd, elk met een
// pictogram, en één zin "wat nu". De regels (comfort, drempels) staan in sidejob_taxi.js; dit bestand leest ze alleen.
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): klant (poppetje met arm omhoog), taxi (auto met bordje), afzetten (vlag).
export const ICOON = {
  klant: '<circle cx="12" cy="6" r="2.5"/><path d="M12 9v6M8 12l4-1 4-3M9 21l3-6 3 6"/>',
  taxi: '<path d="M4 16V12l2-4h12l2 4v4z"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/><path d="M10 6V4h4v2"/>',
  vlag: '<path d="M6 21V4"/><path d="M6 5h12l-2 4 2 4H6"/>',
};

export const STAPPEN = [
  { id: 'ophalen', label: 'Ophalen', icoon: ICOON.klant },
  { id: 'meerijden', label: 'Meerijden', icoon: ICOON.taxi },
  { id: 'afzetten', label: 'Afzetten', icoon: ICOON.vlag },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot de eerste klant is ingestapt (dit apparaat).
export const UITLEG_ID = 'taxi';
export const UITLEG = [
  { icoon: ICOON.klant, tekst: 'Stop naast de klant bij de gele kolom' },
  { icoon: ICOON.taxi, tekst: 'Rijd rustig: botsen en racen kost comfort' },
  { icoon: ICOON.vlag, tekst: 'Sta stil bij de bestemming' },
  { icoon: I.plaats, tekst: 'Een tevreden klant geeft fooi' },
];

export const STOP = 1.5;   // m/s: zo langzaam sta je stil (STOP_SPEED in sidejob_taxi.js)
export const NABIJ = 30;   // m: vanaf hier wijst de strook op het stoppen
export const COMFORT_LAAG = 50; // onder dit comfort is de fooi weg (sidejob_taxi.js: vanaf 50 een kleine fooi, vanaf 80 een grote)

// g: { fase: 'ophalen'|'meerijden', rit, klant, naar (naam van het doel), afstand (m), snelheid (m/s), limiet (m/s), comfort (0..100), tijd (s of null), instap (bool: de klant loopt naar de auto),
//      inTaxi (bool), uitleg }
export function taxiHudModel(g) {
  if (!g || !g.fase) return null;
  const idx = g.fase === 'ophalen' ? 0 : (g.afstand != null && g.afstand < NABIJ ? 2 : 1);
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const comfort = Math.max(0, Math.min(100, Number.isFinite(g.comfort) ? g.comfort : 100));
  const meter = g.fase === 'meerijden' ? { pct: comfort, naam: 'Comfort van je klant', label: comfort < COMFORT_LAAG ? 'Klant is boos' : 'Comfort', staat: comfort < COMFORT_LAAG ? 'laag' : '' } : null;
  const afstand = g.afstand == null ? '-' : g.afstand >= 1000 ? `${(g.afstand / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(g.afstand)} m`;
  const cijfers = [{ label: 'Afstand', waarde: afstand, icoon: I.vlag, primair: true }, { label: 'Rit', waarde: String(g.rit), icoon: I.ronde }];
  if (g.tijd != null) cijfers.push({ label: 'Tijd', waarde: `${Math.max(0, Math.ceil(g.tijd))} s`, icoon: I.klok });
  return {
    id: 'taxi', titel: 'Grunn Taxi', icoon: ICOON.taxi, plek: g.klant || '', stappen, meter, cijfers, uitleg: g.uitleg && g.fase === 'ophalen' ? UITLEG : [],
    nu: watNu(g), hulp: 'Rijd rustig en stop bij het doel', slecht: g.fase === 'meerijden' && comfort < COMFORT_LAAG,
  };
}

export function watNu(g) {
  if (g.fase === 'ophalen') {
    if (g.instap) return 'De klant stapt in';
    if (g.afstand != null && g.afstand < NABIJ) return (g.snelheid || 0) > STOP ? 'Stop naast de klant' : 'Blijf stilstaan: de klant stapt in';
    return `Rij naar ${g.naar} (gele kolom)`;
  }
  if (g.comfort != null && g.comfort < COMFORT_LAAG) return 'De klant is boos: rij rustiger';
  if (g.limiet != null && (g.snelheid || 0) > g.limiet) return 'Rustig aan: je klant wordt onwel';
  if (g.afstand != null && g.afstand < NABIJ) return (g.snelheid || 0) > STOP ? 'Stop bij de bestemming' : 'Je staat goed: de klant stapt uit';
  return `Naar ${g.naar}: rij rustig`;
}

// Wat opspringt na een rit: de fooi (of alleen de afronding als er geen fooi was).
export function ritPop(tip) {
  return tip > 0 ? { tekst: `Fooi €${tip.toFixed(2).replace('.', ',')}`, geluid: 'ui_verzameld' } : { tekst: 'Rit afgerond', geluid: null };
}
