// De HUD-stand van de kartbaan (#985): puur, geen DOM en geen THREE (scripts/karthud_test.mjs). Maakt uit de stand van de race het model voor de gedeelde strook
// (simhud.js): de stappen (start, racen, finish), de driftmeter, de cijfers (ronde, plaats, tijd, snelheid, beste ronde) en één zin "wat nu".
// De regels van de race staan in kartrace.js; dit bestand leest ze alleen.
import { KART, LAPS } from './kartrace.js';
import { SIMICOON as I } from './simicoon.js';

// Icoonpaden voor de chips (24x24, lijn): startlicht, kart, finishvlag, drift (bocht met pijl).
export const ICOON = {
  licht: 'doel',
  kart: 'kart',
  vlag: 'vlag',
  drift: 'afslag_rechts',
};

export const STAPPEN = [
  { id: 'grid', label: 'Start', icoon: ICOON.licht },
  { id: 'race', label: 'Racen', icoon: ICOON.kart },
  { id: 'finish', label: 'Finish', icoon: ICOON.vlag },
];

export const UITLEG_ID = 'kartbaan';
export const UITLEG = [
  { icoon: ICOON.licht, tekst: 'Bij groen: gas met {W}' },
  { icoon: ICOON.kart, tekst: '{A} en {D} sturen, {S} remt' },
  { icoon: ICOON.drift, tekst: '{SPATIE} in een bocht: drift' },
  { icoon: ICOON.vlag, tekst: `${LAPS} ronden, eerste wint goud` },
];

export const tijdTekst = (s) => {
  if (!Number.isFinite(s)) return '-:--.--';
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2).replace('.', ',')}`;
};

// g: { fase: 'grid'|'race'|'finish'|'outro', lichten (0-3), ronde, plek, aantal, tijd (s), kmh, beste (s of null), drift: { t } of null, boost: bool, gras: bool, uitleg: bool }
export function kartHudModel(g) {
  if (!g) return null;
  const idx = g.fase === 'grid' ? 0 : g.fase === 'race' ? 1 : 2;
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const meter = g.drift ? { pct: Math.min(100, (g.drift.t / KART.charge2) * 100), naam: 'Driftlading', label: g.drift.t >= KART.charge2 ? 'Supergeladen' : g.drift.t >= KART.charge1 ? 'Geladen' : 'Laden', staat: '' } : null;
  // één primaire waarde (je plaats), de rest secundair, elk met een pictogram; de beste ronde springt op bij een ronde (rondePop) en staat niet ook in de strook
  const cijfers = [
    { label: 'Plaats', waarde: `${g.plek || 1}/${g.aantal || 4}`, icoon: I.plaats, primair: true },
    { label: 'Ronde', waarde: `${Math.min(LAPS, Math.max(1, g.ronde || 1))}/${LAPS}`, icoon: I.ronde },
    { label: 'Tijd', waarde: tijdTekst(g.tijd || 0), icoon: I.klok },
    { label: 'Tempo', waarde: `${Math.max(0, Math.round(g.kmh || 0))} km/u`, icoon: I.tempo },
  ];
  return {
    id: 'kartbaan', titel: 'Kartbaan Ulrum', icoon: ICOON.kart, plek: g.fase === 'grid' ? '' : `Ronde ${Math.min(LAPS, Math.max(1, g.ronde || 1))}`, stappen, meter, cijfers,
    uitleg: g.uitleg && g.fase === 'grid' ? UITLEG : [], nu: watNu(g), hulp: '{W} gas · {S} rem · {A}{D} sturen · {SPATIE} drift in een bocht', slecht: !!g.gras,
  };
}

export function watNu(g) {
  if (g.fase === 'grid') return g.lichten ? `Startlichten: ${Math.min(3, g.lichten)} van 3` : 'Rijders, op uw plaatsen';
  if (g.fase === 'finish' || g.fase === 'outro') return `Gefinisht als ${g.plek || 1}e`;
  if (g.gras) return 'Gras: terug naar het asfalt';
  if (g.drift) return g.drift.t >= KART.charge1 ? 'Laat {SPATIE} los voor de versnelling' : 'Houd {SPATIE} vast door de bocht';
  if (g.boost) return 'Boost!';
  return 'Bocht in: {SPATIE} voor een drift';
}

// Wat opspringt: een ronde (de tijd) of een boost.
export function rondePop(lap, tijd) { return { tekst: `Ronde ${lap}: ${tijdTekst(tijd)}`, geluid: 'ui_loopbaan' }; }
export function boostPop(lvl) { return { tekst: lvl === 2 ? 'Superboost!' : 'Boost!', geluid: 'ui_verzameld' }; }
