// Releasegate-stap 'beeldregressie bekeken' (kwaliteitsmachine, docs/KWALITEITSMACHINE.md en docs/RELEASEGATE.md).
// De coördinator draait vóór een release de beeldregressie op de camerapunten (scripts/kwaliteit/beeldregressie.mjs), bekijkt
// het rapport (of het eindrapport) en schrijft dan release/beeldregressie-bekeken.json:
//   { "datum": "2026-11-23", "status": "akkoord" | "afwijkingen verwerkt" | "referentie ververst", "afwijkend": 0, "rapport": "<pad>" }
// `release_gate.mjs --verify` toont deze stap. Hij BLOKKEERT NIET (de camerapunten zijn nieuw en hebben nog geen gekeurde
// referenties): ontbreekt het bewijs of is het ouder dan MAX_DAGEN, dan staat er een 'let op'-regel. Puur: de CLI geeft de JSON door.
export const BEELDREGRESSIE_FILE = 'release/beeldregressie-bekeken.json';
export const BEELDREGRESSIE_STATUS = ['akkoord', 'afwijkingen verwerkt', 'referentie ververst'];
export const MAX_DAGEN = 14;

const dagen = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// -> { ok, waarschuwingen, samenvatting }; ok is false als er iets te melden is (de aanroeper maakt er een waarschuwing van)
export function checkBeeldregressieBekeken(bewijs, { vandaag = new Date().toISOString().slice(0, 10) } = {}) {
  const w = [];
  if (!bewijs || typeof bewijs !== 'object') {
    return { ok: false, waarschuwingen: [`beeldregressie niet als bekeken gemeld: ${BEELDREGRESSIE_FILE} ontbreekt (node scripts/kwaliteit/beeldregressie.mjs --run --out=<map>, rapport bekijken, dan dit bestand)`], samenvatting: 'beeldregressie_bekeken: ontbreekt (let op, blokkeert niet)' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(bewijs.datum || ''))) w.push(`${BEELDREGRESSIE_FILE}: datum ontbreekt of is geen JJJJ-MM-DD`);
  else if (bewijs.datum > vandaag) w.push(`${BEELDREGRESSIE_FILE}: datum ligt in de toekomst`);
  else if (dagen(bewijs.datum, vandaag) > MAX_DAGEN) w.push(`${BEELDREGRESSIE_FILE}: bekeken op ${bewijs.datum}, ouder dan ${MAX_DAGEN} dagen: opnieuw draaien`);
  if (!BEELDREGRESSIE_STATUS.includes(bewijs.status)) w.push(`${BEELDREGRESSIE_FILE}: status "${bewijs.status}" moet ${BEELDREGRESSIE_STATUS.map((s) => `"${s}"`).join(', ')} zijn`);
  if (bewijs.status === 'akkoord' && Number(bewijs.afwijkend) > 0) w.push(`${BEELDREGRESSIE_FILE}: status akkoord maar ${bewijs.afwijkend} afwijkend punt(en): verwerk ze of ververs de referentie na keuring`);
  const ok = w.length === 0;
  return { ok, waarschuwingen: w, samenvatting: ok ? `beeldregressie_bekeken: ${bewijs.status}, ${bewijs.datum}` : 'beeldregressie_bekeken: let op (blokkeert niet)' };
}
