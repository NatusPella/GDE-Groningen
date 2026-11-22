// De data van de uitleg met iconen en animatie (uitleg.js, #989). Eén object per uitleg: 2 tot 4 stappen met een groot beeld
// (`toets`: een toetsplaatje, of `icoon`: een betekenisnaam uit iconmap.js), een korte animatie en hooguit acht woorden tekst.
// `toets` is een token uit controls.js (WASD, SHIFT, SPACE, E, LMB ...); het toetsplaatje volgt de herbinding en toont op een
// controller de knop (glyphs.js). `meer` is de langere uitleg die in een 'Meer uitleg'-uitklap blijft staan: er gaat niets verloren.
// Animaties: druk (toets zakt), houd (toets zakt en een balk vult), beweeg (pijl schuift), vul (balk vult), klik (muisklik-rimpel),
// stick (joystick kantelt), geen. Alles is een CSS-lus van hooguit een seconde en staat stil bij Beweging beperken.
export const ANIMATIES = Object.freeze(['druk', 'houd', 'beweeg', 'vul', 'klik', 'stick', 'geen']);
export const MAX_WOORDEN = 8;

export const UITLEG_DATA = Object.freeze({
  // ---- de basis (Hulp in het pauzemenu en de eerste-keer-kaarten) ----
  'basis-lopen': {
    titel: 'Lopen en springen', controller: 'foot',
    stappen: [
      { toets: 'WASD', animatie: 'druk', tekst: 'Lopen en draaien' },
      { toets: 'SHIFT', animatie: 'houd', tekst: 'Vasthouden: rennen' },
      { toets: 'SPACE', animatie: 'druk', tekst: 'Springen en klimmen over hekjes' },
      { toets: 'CTRL', animatie: 'houd', tekst: 'Vasthouden: bukken' },
    ],
    meer: '{MOUSE} draait de camera. Springen helpt ook om uit het water te klimmen.',
  },
  'basis-pakken': {
    titel: 'Pakken en gebruiken', controller: 'foot',
    stappen: [
      { icoon: 'plek', animatie: 'beweeg', tekst: 'Loop naar de gele kolom' },
      { toets: 'E', animatie: 'druk', tekst: 'Instappen, praten, naar binnen' },
    ],
    meer: 'Bij een winkel, een auto of iemand om mee te praten staat de toets in beeld.',
  },
  'basis-rijden': {
    titel: 'Rijden', controller: 'drive',
    stappen: [
      { toets: 'WASD', animatie: 'druk', tekst: 'Gas, rem en sturen' },
      { toets: 'SPACE', animatie: 'houd', tekst: 'Handrem' },
      { toets: 'H', animatie: 'druk', tekst: 'Toeteren' },
      { toets: 'E', animatie: 'druk', tekst: 'Uitstappen' },
    ],
    meer: 'Achterom kijken kan met {Q}. Met {C} kijk je vanuit de cabine mee.',
  },
  'basis-vechten': {
    titel: 'Vechten', controller: 'foot',
    stappen: [
      { toets: 'RMB', animatie: 'houd', tekst: 'Richten' },
      { toets: 'LMB', animatie: 'klik', tekst: 'Aanvallen' },
      { toets: 'WHEEL', animatie: 'stick', tekst: 'Wapen wisselen' },
    ],
    meer: 'Slaan, pistool en hagelgeweer zitten ook op de cijfertoetsen 1, 2 en 3. Berovingen kosten alleen een deel van je geld.',
  },
  'basis-kaart': {
    titel: 'De kaart', controller: 'foot',
    stappen: [
      { toets: 'M', animatie: 'druk', tekst: 'Kaart open' },
      { toets: 'LMB', animatie: 'klik', tekst: 'Klik een plek aan' },
      { icoon: 'route', animatie: 'beweeg', tekst: 'Volg de gele route' },
    ],
    meer: 'Een tweede klik op hetzelfde punt haalt het doel weg. Met 5 zet je een eigen doel.',
  },
  'basis-telefoon': {
    titel: 'De telefoon', controller: 'foot',
    stappen: [
      { toets: 'T', animatie: 'druk', tekst: 'Telefoon open' },
      { icoon: 'telefoon', animatie: 'beweeg', tekst: 'Kies een app' },
      { toets: 'ESC', animatie: 'druk', tekst: 'Weer weg' },
    ],
    meer: 'In de telefoon staan berichten, de kaart en je klussen.',
  },
  // ---- boerderij ----
  'boerderij-zaaien': {
    titel: 'Zaaien en oogsten', controller: 'drive',
    stappen: [
      { icoon: 'tractor', animatie: 'beweeg', tekst: 'Ploeg rechte rijen' },
      { icoon: 'boerderij', animatie: 'vul', tekst: 'Zaai en laat het groeien' },
      { icoon: 'vinkje', animatie: 'druk', tekst: 'Oogst bij een groene vlag' },
    ],
    meer: 'Kies eerst je gewas bij Gewas. Het gewas groeit in speltijd, in de zomer. Daarna lever je de oogst af. Tessa komt van het platteland: zij werkt 15% sneller, oogst 5% meer en maakt minder fouten bij zaaien en oogsten. Tammo kan het ook, alleen minder vlot.',
  },
  // ---- de kaart-uitleg ----
  'kaart-actie': {
    titel: 'Zo werkt de kaart', controller: 'foot',
    // 21-11: vier rijen met één icoon en de toetsen als toetskap in de zin; `wijs` is het onderdeel van de kaart dat de stap aanwijst
    stappen: [
      { icoon: 'zoek', wijs: 'zoek', animatie: 'geen', tekst: 'Zoek een plek, missie of minigame' },
      { icoon: 'lagen', wijs: 'lagen', animatie: 'geen', tekst: 'Lagen zet kaartonderdelen aan of uit' },
      { icoon: 'plek', animatie: 'geen', tekst: '{LMB} Klik een plek: waypoint of reis erheen' },
      { icoon: 'kaart', animatie: 'geen', tekst: '{M} of {ESC} sluit de kaart' },
    ],
    meer: 'Een tweede klik op het routepunt haalt het weg. Er is er één tegelijk.',
  },
  // ---- de light sims krijgen hun stappen uit hun eigen status-bestand (hengelstatus.js enz.); de animatie volgt uit de tekst ----
});

// Een uitleg zoeken op id (null als hij niet bestaat).
export const uitlegDef = (id) => (UITLEG_DATA[id] ? { id, ...UITLEG_DATA[id] } : null);

// De uitleg bij een contexthint (hintkit.js, kaart bij het eerste voertuig of de eerste minigame): kort en met toetsen.
export const HINT_UITLEG = Object.freeze({
  'v-auto': 'basis-rijden',
  'v-trekker': 'boerderij-zaaien',
  'v-fiets': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Trappen en sturen' }, { toets: 'SHIFT', animatie: 'houd', tekst: 'Vasthouden: flink doortrappen' }, { toets: 'E', animatie: 'druk', tekst: 'Afstappen' }] },
  'v-scooter': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Gas en sturen' }, { toets: 'E', animatie: 'druk', tekst: 'Afstappen' }] },
  'v-motor': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Gas en sturen' }, { toets: 'SHIFT', animatie: 'houd', tekst: 'Wheelie of stoppie' }, { icoon: 'waarschuwing', animatie: 'beweeg', tekst: 'Niet doen in de stad' }] },
  'v-boot': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Gas en sturen' }, { icoon: 'boot', animatie: 'beweeg', tekst: 'Remt langzaam: begin op tijd' }, { toets: 'E', animatie: 'druk', tekst: 'Uitstappen bij de wal' }] },
  'v-bus': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Neem bochten ruim' }, { toets: 'O', animatie: 'druk', tekst: 'Deuren open bij de halte' }, { toets: 'K', animatie: 'druk', tekst: 'Bus laten zakken' }, { toets: 'H', animatie: 'druk', tekst: 'Toeteren' }] },
  'v-heli': { controller: 'drive', stappen: [{ toets: 'SPACE', animatie: 'houd', tekst: 'Omhoog' }, { toets: 'CTRL', animatie: 'houd', tekst: 'Omlaag' }, { icoon: 'pijl_omlaag', animatie: 'vul', tekst: 'Landen: laag en langzaam' }] },
  'v-vliegtuig': { controller: 'drive', stappen: [{ toets: 'W', animatie: 'houd', tekst: 'Gas' }, { toets: 'SPACE', animatie: 'druk', tekst: 'Optrekken bij 30 m/s' }, { icoon: 'pijl_omlaag', animatie: 'vul', tekst: 'Landen: laag en recht' }] },
  'v-quad': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Gas en sturen' }, { toets: 'SPACE', animatie: 'houd', tekst: 'Rem' }] },
  'v-foodtruck': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Gas en sturen' }, { toets: 'SPACE', animatie: 'houd', tekst: 'Handrem' }, { toets: 'C', animatie: 'druk', tekst: 'Meekijken vanuit de cabine' }] },
  'm-penalty': { stappen: [{ toets: ['A', 'D'], animatie: 'houd', tekst: 'Richt in het doel' }, { toets: 'SPACE', animatie: 'houd', tekst: 'Houd en laat los bij het streepje' }, { icoon: 'doel', animatie: 'vul', tekst: 'Naast of over telt niet' }] },
  'm-voetbal': { stappen: [{ toets: ['WASD', 'SHIFT'], animatie: 'druk', tekst: 'Loop en sprint' }, { toets: ['F', 'E'], animatie: 'druk', tekst: 'Korte en lange pass' }, { toets: 'SPACE', animatie: 'houd', tekst: 'Schot: houd vast voor kracht' }, { toets: ['CTRL', 'Q'], animatie: 'druk', tekst: 'Tackle en wissel van speler' }] },
  'm-skatepark': { stappen: [{ toets: 'W', animatie: 'druk', tekst: 'Duwen' }, { toets: 'SPACE', animatie: 'druk', tekst: 'Ollie' }, { icoon: 'ster', animatie: 'vul', tekst: 'Keten: pas landen telt' }] },
  'm-hengelen': { stappen: [{ toets: 'SPACE', animatie: 'druk', tekst: 'Gooi uit' }, { icoon: 'tijd', animatie: 'vul', tekst: 'Wacht op het dobbertje' }, { toets: 'SPACE', animatie: 'druk', tekst: 'Zakt hij? Meteen trekken' }] },
  'm-klimtoren': { stappen: [{ toets: ['A', 'D'], animatie: 'houd', tekst: 'Allebei vasthouden: klimmen' }, { toets: 'SPACE', animatie: 'druk', tekst: 'Magnesium' }] },
  'm-kermis': { controller: 'drive', stappen: [{ toets: 'WASD', animatie: 'druk', tekst: 'Gas en sturen' }, { icoon: 'auto', animatie: 'beweeg', tekst: 'Botsen mag' }] },
});
