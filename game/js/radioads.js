// De radioreclames van G-Music (#409): korte, satirische reclames voor VERZONNEN bedrijven, af en toe
// tussen de nummers. Ze hebben geen opname en krijgen er ook geen (geen nieuwe TTS): radio.js toont ze als
// ondertitel, met een jingle uit de synthesizer en een zacht gemurmel als stationsstem. De tabel staat
// bewust niet in funlines.js: de opnamecontrole (voice_coverage) eist een stem voor elke gesproken regel
// van die tabellen, en deze regels zijn alleen tekst tot de eigenaar budget voor stemmen vrijgeeft.
//
// Het plannen is puur (geen audio, geen DOM) en getest in scripts/radioads_test.mjs.
//   planAdBlock(state, ctx, rng): of er nu een reclameblok komt, en welke
//   readSeconds(text): hoe lang een regel in beeld blijft

// Regels: Nederlands, geen echte merken, bedrijven of personen, satire zonder leed (AGENTS.md).
// firma: de verzonnen afzender; de ondertitel noemt hem vooraan, tenzij de tekst hem zelf al noemt; lines: een of twee korte zinnen.
export const RADIO_ADS = [
  { id: 'energielabel', firma: 'Labelwerk Noord', lines: ['Labelwerk Noord belt u. En uw buren. En u nog een keer. Uw huis krijgt een A-plus-plus, of u dat nu wilt of niet.'] },
  { id: 'energielabel2', firma: 'Labelwerk Noord', lines: ['Studentenhuis zonder label? Wij komen langs, zonder afspraak, mét bon. Ons label is mooier dan uw dak.'] },
  { id: 'kroketkoning', firma: 'Kroketkoning', lines: ['Kroketkoning: knapperig van buiten, een raadsel van binnen. Vraag nooit wat erin zit. Geniet van de vulling.'] },
  { id: 'makelaar', firma: 'Makelaardij Schuifdeur', lines: ['Zoekt u een gezellige kleine kamer? Wij hebben er twaalf, en geen enkele is groter dan de vorige. Bezichtiging staand.'] },
  { id: 'golf', firma: 'Golfcentrum De Pendule', lines: ['Golfcentrum De Pendule: achttien gaten tussen de koeien. De koeien spelen mee en winnen altijd.'] },
  { id: 'bieten', firma: 'De Bietenbond', lines: ['Eet bieten. Waarom? Daarom. Een boodschap van de bietenbond, voor uw bloed en uw trouwe schort.'] },
  { id: 'fietsverzekering', firma: 'Slotvast Verzekeringen', lines: ['Fiets gestolen? Slotvast vindt dat ook jammer. Uitkering volgt, in de volgende eeuw. Premie: vooraf.'] },
  { id: 'reclametaxi', firma: 'Reclametaxi Toeter', lines: ['Reclametaxi Toeter brengt u overal heen. Onderweg hoort u reclame voor onze taxi. Geen keuze, wel kilometers.'] },
  { id: 'sok', firma: 'Spaarbank De Sok', lines: ['Spaarbank De Sok: uw geld veilig in een oude sok. Rente: een warm gevoel in de tenen.'] },
  { id: 'zonnepaneel', firma: 'Zonnepanelen Meteen', lines: ['Zonnepanelen op uw tent, uw schuur of uw kat. Rendement niet gegarandeerd, enthousiasme wel.'] },
  { id: 'brugwachter', firma: 'Opleiding Brugwachter', lines: ['Word brugwachter: leer omhoog te kijken terwijl iedereen wacht. Inschrijven kan alleen als de brug dicht is.'] },
  { id: 'tandarts', firma: 'Praktijk Boorwerk', lines: ['Praktijk Boorwerk: pijnloos behandeld, pijnlijk gefactureerd. Ook voor kinderen die nog niet kunnen rekenen.'] },
  { id: 'kringloop', firma: 'Kringloop Tweede Kans', lines: ['Kringloop Tweede Kans: alles krijgt een tweede leven. Uw bank heeft er inmiddels zes gehad.'] },
  { id: 'banden', firma: 'Plak-Express', lines: ['Lekke band? Plak-Express plakt, u wacht, en de regen wacht met u mee. Gratis koffie, vaak nog warm.'] },
  { id: 'kroeg', firma: "Kroeg 't Scheve Toorntje", lines: ["Bij 't Scheve Toorntje staat alles scheef, behalve onze rekening. Die klopt altijd, in ons voordeel."] },
  { id: 'parkeren', firma: 'Parkeerservice De Boete', lines: ['Parkeerservice De Boete: parkeer vrij, betaal later. Veel later. Het bedrag verrast u, en wij ook.'] },
  { id: 'studentenkamer', firma: 'Kamerverhuur Dak-Boven', lines: ['Studentenkamer, zes vierkante meter, inclusief uitzicht op de volgende kamer. Borg: uw eerste jaar.'] },
  { id: 'regenjas', firma: 'Regenjas Gronings', lines: ['Regenjas Gronings: volledig waterdicht, behalve bij regen. Voor wie graag verrassingen heeft.'] },
  { id: 'wasserette', firma: 'Stoomwerk Stad', lines: ['Stoomwerk Stad wast alles. Ook uw gordijnen, uw dekbed en uw reputatie. Haal- en brengservice per fiets.'] },
  { id: 'eierbal', firma: 'Eierballenfabriek Rond', lines: ['Eierbal Rond: er zit een ei in, zegt men. Wij zeggen niets. Wel heet, wel Gronings, wel nu.'] },
];

// Planning. Tijden in spelseconden (world.time).
export const AD_MIN_GAP_S = 480;     // tussen het einde van het ene blok en het begin van het volgende
export const AD_MIN_BREAKS = 2;      // praatpauzes zonder reclame tussen twee blokken
export const AD_HISTORY = 10;        // zoveel reclames voor een herhaling
export const AD_DOUBLE_CHANCE = 0.3; // kans op twee reclames in één blok
// geen reclame bij Nachtstreek: Rikus draait dan zijn eigen, rustige muziek
const AD_PROGRAMMES = new Set(['ochtend', 'dag', 'avond']);

export function createAdState() {
  return { lastAt: -Infinity, breaks: Infinity, history: [], blocks: 0 };
}

// elke praatpauze van de radio, voor het tellen van het aantal pauzes tussen twee blokken
export function noteBreak(state) {
  state.breaks = state.breaks === Infinity ? Infinity : state.breaks + 1;
}

// ctx: { now, progId }. rng() in [0, 1). Geeft null (geen blok) of { ads: [ad, ...] }.
export function planAdBlock(state, { now, progId }, rng = Math.random) {
  if (!AD_PROGRAMMES.has(progId)) return null;
  if (now - state.lastAt < AD_MIN_GAP_S) return null;
  if (state.breaks < AD_MIN_BREAKS) return null;
  const n = rng() < AD_DOUBLE_CHANCE ? 2 : 1;
  const ads = [];
  const used = new Set(state.history);
  for (let i = 0; i < n; i++) {
    let pool = RADIO_ADS.filter((a) => !used.has(a.id) && !ads.includes(a));
    if (!pool.length) { state.history.length = 0; used.clear(); pool = RADIO_ADS.filter((a) => !ads.includes(a)); }
    // twee reclames van dezelfde firma achter elkaar is geen grap meer
    const other = pool.filter((a) => !ads.some((b) => b.firma === a.firma));
    const from = other.length ? other : pool;
    ads.push(from[Math.floor(rng() * from.length) % from.length]);
  }
  return { ads };
}

// Het blok is gespeeld: de reclames in de geschiedenis, de teller weer op nul.
export function commitAdBlock(state, block, now) {
  for (const a of block.ads) state.history.push(a.id);
  while (state.history.length > AD_HISTORY) state.history.shift();
  state.lastAt = now;
  state.breaks = 0;
  state.blocks++;
}

// Hoe lang een regel in beeld blijft (s): leestempo van zo'n 14 tekens per seconde, ten minste 3,5 s.
export function readSeconds(text) {
  return Math.max(3.5, Math.min(9, String(text).length / 14 + 1));
}

// De wachtrij van het radiolijntje voor een blok: een openingsjingle, per reclame de ondertitel(s), een slotjingle.
// Een regel zonder opname heet hier textOnly; radio.js speelt hem als ondertitel met een zacht gemurmel.
export function blockLines(block) {
  const out = [{ speaker: 'Reclame', text: '', textOnly: true, jingle: 'start', dur: 1.5 }];
  block.ads.forEach((ad, i) => {
    ad.lines.forEach((t) => out.push({ speaker: t.toLowerCase().includes(ad.firma.toLowerCase()) ? 'Reclame' : ad.firma, text: t, textOnly: true, dur: readSeconds(t) }));
    if (i < block.ads.length - 1) out.push({ speaker: 'Reclame', text: '', textOnly: true, jingle: 'tussen', dur: 0.9 });
  });
  out.push({ speaker: 'Reclame', text: '', textOnly: true, jingle: 'end', dur: 1.2 });
  return out;
}
