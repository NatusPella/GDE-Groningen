// #673: een variant met een eigen record na de hoogste medaille. Drie activiteiten met een sterke
// vaardigheidslus krijgen er één: discgolf (de volle ronde, die al een eigen record had), de kartbaan
// (snelste ronde als tijdattack) en het skatepark (de beste keten als combo-run). De variant gaat open
// zodra de basisactiviteit goud is, of zodra je de variant zelf al eens speelde. Puur: geen DOM, geen
// opslag; de records lopen via achievements.js `recordChallengeResult`/`getChallengeRecord`, per speler.
//
// fmt: hoe het record op het scherm komt ('rel' = slagen t.o.v. par, 'time' = seconden, 'points').
// lager: true betekent dat een lager getal beter is (tijd, slagen).
export const VARIANTEN = [
  {
    id: 'discgolf-achttien', base: 'discgolf', baseNaam: 'Discgolf', layer: 'discgolf', playId: 'discgolf', icon: 'act-discgolf',
    naam: 'Discgolf: de volle ronde', record: 'discgolf-achttien', eis: 'discgolf_goud', lager: true, fmt: 'rel',
    doel: 'Achttien banen heen en terug: dezelfde manden, de volle ronde. Zelfde medailles, meer wind.',
    medailles: [[1, '6 boven par'], [2, '1 boven par'], [3, '2 onder par']], drempels: [6, 1, -2],
  },
  {
    id: 'kart-tijdattack', base: 'kart-race', baseNaam: 'Karten', layer: 'kartbaan', playId: 'kartbaan', icon: 'act-kartbaan',
    naam: 'Kartbaan: tijdattack', record: 'kart-lap', eis: 'kart_goud', lager: true, fmt: 'time',
    doel: 'Eén snelle ronde op Kardinge, zonder tegenstanders: het gaat om je beste ronde, niet om de race.',
    medailles: [[1, 'onder 0:38'], [2, 'onder 0:35'], [3, 'onder 0:32']], drempels: [38, 35, 32],
  },
  {
    id: 'skate-combo', base: 'skatepark', baseNaam: 'Skatepark', layer: 'skatepark', playId: 'skatepark', icon: 'act-skatepark',
    naam: 'Skatepark: de langste keten', record: 'skatepark-combo', eis: 'skate_goud', lager: false, fmt: 'points',
    doel: 'Houd één keten vast: de beste keten van je ronde telt, niet de som van losse trucs.',
    medailles: [[1, '1.200 punten'], [2, '2.000 punten'], [3, '3.200 punten']], drempels: [1200, 2000, 3200],
  },
];
const BY_ID = new Map(VARIANTEN.map((v) => [v.id, v]));
export const variantVan = (id) => BY_ID.get(id) || null;
export const variantVanBase = (base) => VARIANTEN.find((v) => v.base === base) || null;

// De variant is open als de basis goud is of de variant al een record heeft. `unlocked(achievementId)`
// en `record(recordId)` komen van buiten (achievements.js), zodat dit bestand puur blijft.
export function variantOpen(v, { unlocked = () => false, record = () => null } = {}) {
  if (!v) return false;
  return !!(record(v.record) || unlocked(v.eis));
}

// De medaille van een variantronde: de drempels staan in de tabel hierboven, hoger is beter behalve
// bij tijd en slagen (lager is beter). Geeft 0 als er niets gehaald is.
export function variantMedal(v, waarde) {
  if (!v || !Number.isFinite(waarde)) return 0;
  const drempels = v.drempels || [];
  let medal = 0;
  for (let i = 0; i < drempels.length; i++) {
    const grens = Number(drempels[i]);
    if (!Number.isFinite(grens)) continue;
    const gehaald = v.lager ? waarde <= grens : waarde >= grens;
    if (gehaald) medal = Math.max(medal, i + 1);
  }
  return medal;
}

// Eén regel over de stand van een variant (voor "Te doen" en de uitslag).
export function variantTekst(v, record = null) {
  if (!v) return { open: false, tekst: '', recordTekst: '' };
  const rec = record || null;
  const recordTekst = rec && rec.best != null
    ? (v.fmt === 'time' ? `Record ${fmtTijd(rec.best)}` : v.fmt === 'rel' ? `Record ${relTekst(rec.best)} t.o.v. par` : `Record ${Math.round(rec.best).toLocaleString('nl-NL')} punten`)
    : 'Nog niet gespeeld';
  return { open: true, tekst: v.doel, recordTekst, medaille: rec && rec.medal ? rec.medal : 0 };
}
const fmtTijd = (s) => {
  const t = Math.max(0, Number(s) || 0);
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
};
const relTekst = (v) => (v === 0 ? 'E' : v > 0 ? `+${v}` : String(v));
