// De quicktime-stand (#962): Instellingen › Quicktime-events › Normaal / Makkelijk / Overslaan, standaard Makkelijk, per speler (het is een
// instelling van dit apparaat, geen onderdeel van de savegame). Puur: geen DOM, geen klok. stagetiming.js (de verhaalstappen met een
// timingbalk) en heist.js (zekeringen, slot, kluis) lezen hier hoeveel ruimer het mag. Het verhaal strandt nooit op een QTE:
// een misser kost hooguit een tag (de kleine uitkomst), nooit de missie.
//   node scripts/qte_test.mjs
export const QTE_STANDEN = Object.freeze(['normaal', 'makkelijk', 'overslaan']);
export const QTE_STANDAARD = 'makkelijk';
export const schoneQte = (v) => (QTE_STANDEN.includes(v) ? v : QTE_STANDAARD);
// Zonder instellingen (een test, een oud pad) blijft het gedrag van vóór deze optie: Normaal.
export const qteStandVan = (settings) => (settings && typeof settings === 'object' ? schoneQte(settings.qteStand) : 'normaal');

export const QTE_REGELS = Object.freeze({
  // snelheid: factor op de naald; zone: factor op de raakzone; extra: missers extra voor een hulpaanbod; weg: een ronde minder bij drie of meer
  normaal: { snelheid: 1, zone: 1, extra: 0, weg: false, overslaan: false, auto: 5 },
  makkelijk: { snelheid: 0.75, zone: 1.25, extra: 1, weg: true, overslaan: false, auto: 5 },
  // overslaan: één ronde (de laatste, met de afsluitende regel) loopt vanzelf als gebaar, zonder balk en zonder missers
  overslaan: { snelheid: 0.75, zone: 1.25, extra: 99, weg: false, overslaan: true, auto: 0.7 },
});

// De timingstap (stagetiming.js) naar de gekozen stand: een kopie van de rondes met de nieuwe snelheid, het aantal rondes, de
// drempel voor de tag en de extra missers. De bron (st) blijft ongewijzigd, zodat een andere speler of een andere stand er niets van merkt.
export function qtePas(st, stand = 'normaal') {
  const r = QTE_REGELS[schoneQte(stand)];
  const bron = st && Array.isArray(st.rounds) ? st.rounds : [];
  let rondes = bron.map((x) => ({ ...x, speed: (x.speed || 0.7) * r.snelheid }));
  let weg = 0;
  if (r.overslaan && rondes.length > 1) { weg = rondes.length - 1; rondes = [rondes[rondes.length - 1]]; }
  else if (r.weg && rondes.length >= 3) { rondes.splice(Math.floor(rondes.length / 2), 1); weg = 1; }
  const goodAt = st && Number.isFinite(st.goodAt) ? Math.max(1, Math.min(st.goodAt - (r.overslaan ? weg : 0), rondes.length)) : undefined;
  return { rounds: rondes, goodAt, zoneFactor: r.zone, extraMissers: r.extra, overslaan: r.overslaan, auto: r.auto, stand: schoneQte(stand), weg };
}

// Het faalpad: mag een timingstap de missie nog laten mislukken? Alleen op Normaal en alleen met een failAt; op Makkelijk en Overslaan
// gaat het verhaal altijd door (met de lage tag). Geen enkele verhaalstap heeft nog een failAt (qte_story_test), dit is het vangnet.
export const qteKanFalen = (stand) => schoneQte(stand) === 'normaal';

// De heist (zekeringen, slot, kluis): na hoeveel missers biedt de metgezel hulp aan (de speler komt nooit vast te zitten).
export function heistHulp(stand, basis) {
  const s = schoneQte(stand);
  if (s === 'overslaan') return 0;           // de metgezel doet het meteen
  if (s === 'makkelijk') return Math.max(1, Math.ceil(basis * 0.6));
  return basis;
}
// De breedte van de raakzone van een heistbalk per stand.
export const heistBreedte = (stand, breedte) => breedte * QTE_REGELS[schoneQte(stand)].zone;
