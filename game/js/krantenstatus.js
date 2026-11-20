// De HUD-stand van de krantenwijk (#985): puur, geen DOM en geen THREE (scripts/krantenhud_test.mjs). Maakt uit de stand van een ronde het model voor de gedeelde
// strook (simhud.js): de stappen (naar de wijk, bezorgen, klaar), de voortgang over de brievenbussen, de stapel en de uitkomst van de worpen, en één zin "wat nu".
// De regels van de worp en het loon staan in krantenrules.js; dit bestand leest ze alleen.
import { WORP_BEREIK, WORP_LOON } from './krantenrules.js';
import { IC } from './simicons.js';

// Icoonpaden voor de chips (24x24, lijn): wijk (huisjes), krant (rol), brievenbus, vinkje.
export const ICOON = {
  wijk: '<path d="M3 20V11l5-4 5 4v9"/><path d="M13 20v-7l4-3 4 3v7"/><path d="M2 20h20"/>',
  krant: '<rect x="4" y="9" width="16" height="7" rx="3.5"/><path d="M9 9v7"/>',
  bus: '<rect x="5" y="6" width="14" height="9" rx="2"/><path d="M9 11h6"/><path d="M12 15v5"/>',
  klaar: '<path d="M5 12l4 4 10-10"/>',
};

export const STAPPEN = [
  { id: 'naarwijk', label: 'Naar de wijk', icoon: ICOON.wijk },
  { id: 'bezorgen', label: 'Bezorgen', icoon: ICOON.krant },
  { id: 'klaar', label: 'Klaar', icoon: ICOON.klaar },
];

// De uitleg voor de eerste keer: vier iconen met een zin. Wordt getoond tot de eerste worp van dit apparaat.
export const UITLEG_ID = 'krantenwijk';
export const UITLEG = [
  { icoon: ICOON.wijk, tekst: 'Rij of loop naar de wijk' },
  { icoon: ICOON.krant, tekst: 'E: gooi een krant' },
  { icoon: ICOON.bus, tekst: 'Dichtbij en langzaam is raak' },
  { icoon: ICOON.klaar, tekst: 'Alle brievenbussen: ronde klaar' },
];

export const SNEL = 4.5; // m/s: sneller dan dit mik je slecht (de spreiding groeit met de snelheid, krantenrules.worpSpreiding)

const euro = (v) => '€' + v.toFixed(2).replace('.', ',');

// g: { fase: 'naarwijk'|'bezorgen'|'klaar', wijk, straat, totaal, gedaan, stapel, worpen: { bus, mat, gemist }, vijver, lui, afstand (m tot de volgende brievenbus),
//      snelheid (m/s), tijd (s of null), uitleg: bool }
export function krantHudModel(g) {
  if (!g || !g.totaal) return null;
  const idx = Math.max(0, STAPPEN.findIndex((s) => s.id === g.fase));
  const stappen = STAPPEN.map((s, i) => ({ label: s.label, icoon: s.icoon, stand: i < idx ? 'klaar' : i === idx ? 'nu' : 'straks' }));
  const gedaan = Math.max(0, Math.min(g.totaal, g.gedaan || 0));
  const meter = g.fase === 'naarwijk' ? null : { pct: (gedaan / g.totaal) * 100, naam: 'Brievenbussen bezorgd', label: `${gedaan} van ${g.totaal}` };
  const primair = g.fase === 'naarwijk' ? { icoon: IC.afstand, waarde: g.afstand == null ? '-' : `${Math.round(g.afstand)} m`, naam: 'naar de wijk' } : { icoon: IC.bus, waarde: `${gedaan}/${g.totaal}`, naam: 'bezorgd' };
  const cijfers = [{ icoon: IC.krant, label: 'Stapel kranten', waarde: String(Math.max(0, g.stapel || 0)), staat: (g.stapel || 0) <= 0 ? 'actie' : (g.stapel || 0) <= 1 ? 'let-op' : '' }];
  if (g.tijd != null) cijfers.push({ icoon: IC.klok, label: 'Tijd over', waarde: `${Math.max(0, Math.ceil(g.tijd))} s`, staat: g.tijd < 20 ? 'let-op' : '' });
  return {
    id: 'krantenwijk', titel: 'Krantenwijk', icoon: ICOON.krant, plek: g.wijk || '', stappen, primair, meter, cijfers, uitleg: g.uitleg ? UITLEG : [],
    nu: watNu(g), hulp: 'E gooit · dichtbij en langzaam is raak', slecht: g.fase === 'bezorgen' && (g.stapel || 0) <= 0 && gedaan < g.totaal,
  };
}

export function watNu(g) {
  if (g.fase === 'naarwijk') return `Naar de ${g.wijk}: ${g.totaal} brievenbussen in de ${g.straat}`;
  if (g.fase === 'klaar') return 'Wijk bezorgd';
  if ((g.stapel || 0) <= 0) return 'De stapel is op';
  const lui = g.vijver && !g.lui ? ' · of de hele stapel in de container' : '';
  if (g.afstand != null && g.afstand <= WORP_BEREIK) return ((g.snelheid || 0) > SNEL ? 'Rustig aan: dichtbij en langzaam is raak' : 'Nu E: gooi de krant') + lui;
  return 'Ga naar de brievenbus met de gele kolom' + lui;
}

// Wat een worp opspringt: het loon van die worp (bus, mat) of een korte tekst bij een misser. `geluid`: de bestaande UI-geluiden.
export function worpPop(uitkomst) {
  if (uitkomst === 'bus') return { tekst: `In de bus ${euro(WORP_LOON.bus)}`, geluid: 'ui_verzameld' };
  if (uitkomst === 'mat') return { tekst: `Op de mat ${euro(WORP_LOON.mat)}`, geluid: 'ui_loopbaan' };
  return { tekst: 'Mis, geen loon', geluid: null };
}
