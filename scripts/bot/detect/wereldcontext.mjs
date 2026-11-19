// Detector (f): wereldcontext. Past de tekst van een cutscene of dialoogscene bij de plek in de wereld waar hij speelt?
// De page-kant (detect/page.js) logt per scène een 'plekprobe': { type: 'plekprobe', t, stap, bron, x, y, tekst, probe: {...} } met
//   binnen        de speler staat binnen een gebouwvoetafdruk of in een interieur (true/false)
//   gebouwNabijM  afstand tot het dichtstbijzijnde gebouw in meter (af te tasten tot 80, daarboven 80)
//   waterNabijM   afstand tot water in meter (tot 200, daarboven 200)
//   wegNabijM     afstand tot de dichtstbijzijnde weg in meter (tot 60), null als de kaart dit niet kan zeggen
// `soortPlek` maakt daar gebouw, water, weg, weiland of stad van; `contextBevindingen` zet de woorden van de tekst ertegenover.
// Precisie gaat voor: wat de kaart niet weet (null) leidt nooit tot een bevinding.

export const BINNEN_WOORDEN = ['kantoor', 'keuken', 'binnen', 'woonkamer', 'kamer', 'balie', 'receptie', 'vergaderzaal', 'zolder', 'kelder', 'plafond', 'bureau', 'gang', 'werkplaats', 'slaapkamer', 'badkamer', 'trap op', 'deur dicht'];
export const WATER_WOORDEN = ['strand', 'boot', 'sloep', 'steiger', 'haven', 'kade', 'zandbank', 'aan boord', 'dek'];
export const WEIDE_WOORDEN = ['weiland', 'weide', 'koe', 'koeien', 'schuur', 'trekker', 'akker'];

const heeftWoord = (tekst, lijst) => {
  const t = ' ' + String(tekst || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ') + ' ';
  return lijst.filter((w) => t.includes(' ' + w + ' ') || t.includes(' ' + w + 'en ') || t.includes(' ' + w + 's '));
};

export function soortPlek(p) {
  if (!p) return { soort: 'onbekend' };
  if (p.binnen === true) return { soort: 'gebouw' };
  if (p.waterNabijM != null && p.waterNabijM <= 1) return { soort: 'water' };
  if (p.gebouwNabijM != null && p.gebouwNabijM >= 60 && p.wegNabijM != null && p.wegNabijM >= 15) return { soort: 'weiland' };
  if (p.wegNabijM != null && p.wegNabijM <= 6) return { soort: 'weg' };
  if (p.gebouwNabijM != null && p.gebouwNabijM < 60) return { soort: 'stad' };
  return { soort: 'onbekend' };
}

// Mismatch tussen woorden en plek. Geeft [] als alles klopt of niet te beoordelen is.
export function contextOordeel(tekst, probe) {
  const plek = soortPlek(probe).soort, uit = [];
  const binnen = heeftWoord(tekst, BINNEN_WOORDEN), water = heeftWoord(tekst, WATER_WOORDEN), weide = heeftWoord(tekst, WEIDE_WOORDEN);
  if (binnen.length && ['weiland', 'weg', 'water'].includes(plek)) uit.push({ type: 'wereld-binnen-buiten', ernst: 'verwarrend', plek, woorden: binnen, uitleg: `de tekst praat over een binnenplek (${binnen.join(', ')}) maar de scène speelt op ${plek === 'weiland' ? 'een weiland' : plek === 'weg' ? 'de weg' : 'het water'}` });
  else if (binnen.length && plek === 'stad' && probe.gebouwNabijM > 25) uit.push({ type: 'wereld-binnen-buiten', ernst: 'cosmetisch', plek, woorden: binnen, uitleg: `binnenplek (${binnen.join(', ')}) in het open stadsbeeld, het dichtstbijzijnde gebouw staat op ${Math.round(probe.gebouwNabijM)} m` });
  if (water.length && ['gebouw', 'weiland'].includes(plek) && probe.waterNabijM != null && probe.waterNabijM > 150) uit.push({ type: 'wereld-water-ver', ernst: 'cosmetisch', plek, woorden: water, uitleg: `water-woorden (${water.join(', ')}) maar het water is ${Math.round(probe.waterNabijM)} m weg` });
  if (weide.length && plek === 'gebouw') uit.push({ type: 'wereld-weide-binnen', ernst: 'cosmetisch', plek, woorden: weide, uitleg: `buitenwoorden (${weide.join(', ')}) terwijl de speler in een gebouw staat` });
  return uit;
}

export function contextBevindingen(events) {
  const uit = [];
  for (const e of events.filter((q) => q.type === 'plekprobe' && q.tekst)) {
    for (const f of contextOordeel(e.tekst, e.probe)) {
      uit.push({ type: f.type, soort: 'wereld', ernst: f.ernst, stap: e.stap || '', plek: [Math.round(e.x ?? 0), Math.round(e.y ?? 0)], t: e.t, tekst: e.tekst, bewijs: { plekSoort: f.plek, woorden: f.woorden, uitleg: f.uitleg, probe: e.probe, bron: e.bron } });
    }
  }
  return uit;
}
