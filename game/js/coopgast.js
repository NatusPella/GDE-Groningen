// Samen spelen (#291): wat een gast mag doen, met een duidelijke regel per actie. Pure regels en
// teksten (geen three.js, geen DOM), zodat het testbaar is en docs/COOP-GAST.md er precies hetzelfde in zegt.
//
// Het uitgangspunt: de wereld, het verhaal, de missies en de voertuigen zijn van wie het spel opende (de host);
// een gast speelt mee. Wat een gast zelf doet, doet hij op zijn eigen scherm met zijn eigen geld en spullen
// (winkels, automaten), of het gebeurt bij de host op zijn lichaam (instappen als bijrijder, het stuur krijgen).
// Alles wat de wereld van de host zou veranderen buiten zijn lichaam (een voertuig kopen, een gesprek met een
// voorbijganger, een bijbaan of minigame starten) kan niet; de gast hoort dat in een korte melding.

// winkels waar een gast zelf iets koopt: alleen spullen voor hemzelf (geen voertuigen of wapens)
export const WINKELS_GAST = new Set(['kleding', 'kapper', 'tabak', 'super', 'snack', 'eikea']);
export const winkelMagVoorGast = (type) => WINKELS_GAST.has(type);

export const ALLEEN_EIGEN_SPEL = 'Dat kan alleen in je eigen spel.';
// Activiteiten die een gast zelf speelt, op zijn eigen scherm, met zijn eigen voortgang en geld (#429, #434): ze veranderen de wereld van wie
// het spel opende niet (geen voertuig, geen personage, geen verplaatsing van zijn lichaam). Hengelen is alleen de minigame en de vangst in
// het eigen visboek; pannenkoeken bakken en de beiaard zijn losse spelletjes bij een vaste plek. Al het andere (discgolf, pitch en put,
// skatepark, kartbaan, zwemmen, klimmen, vliegles, botsautootjes, padel enzovoort) zet zijn lichaam of een voertuig ergens neer en blijft bij wie het spel opende.
export const GAST_ACTIVITEITEN = new Set(['hengelen', 'pannenkoek', 'carillon']);
export const activiteitMagLokaal = (id) => GAST_ACTIVITEITEN.has(id);
// Wat een gast aan de host meldt als hij zo'n activiteit speelt (alleen bij een wisseling; een oudere host negeert het bericht)
export const bezigEvent = (id) => ({ k: 'bezig', a: GAST_ACTIVITEITEN.has(id) ? id : null });
export const MELDING_ALLEEN_OPENER = 'Alleen bij wie het spel opende.';

export const MELDING_WINKEL = (naam) => `${naam}: dat kan alleen in je eigen spel.`;

// De tabel van de regels (docs/COOP-GAST.md en de tests lezen hem). mag: ja | nee | deels
export const GAST_REGELS = [
  { actie: 'lopen', mag: 'ja', regel: 'Lopen en rennen zoals altijd.' },
  { actie: 'winkelen', mag: 'ja', regel: 'Winkels met spullen voor jezelf (kleding, kapper, tabak en loterij, avondwinkel, snackbar, woonwarenhuis) en automaten: op je eigen scherm, met je eigen geld; wat je koopt is van jou en gaat in je eigen opgeslagen spel.' },
  { actie: 'eten', mag: 'ja', regel: 'Eten en drinken bij een horecaplek en de muurkroket: met je eigen geld en je eigen gezondheid.' },
  { actie: 'voertuig-kopen', mag: 'nee', regel: 'Voertuigen, boten, helikopters, wapens, tuning en lak kopen kan alleen in je eigen spel: ze zouden in de wereld van de ander verschijnen.' },
  { actie: 'bijrijden', mag: 'ja', regel: 'De eerste gast (Tessa) stapt zelf in met E als wie het spel opende in een voertuig zit en dicht bij is (ze gaat niet vanzelf mee); met E stap je uit (als het voertuig bijna stilstaat). Blijft ze te ver achter, dan rijdt ze na een paar seconden mee. De derde en vierde speler stappen ook met E in (auto: drie extra plekken, bus: zes) en zijn dan niet meer te zien; fietsen, scooters en helikopters hebben geen plek.' },
  { actie: 'sturen', mag: 'deels', regel: 'Met Y (controller: D-pad omhoog) geeft de bestuurder het stuur aan zijn bijrijder (en neemt het terug); de bijrijder kan met Y om het stuur vragen. De bestuurder blijft de bestuurder: schade en politie zijn van hem.' },
  { actie: 'eigen-voertuig', mag: 'nee', regel: 'Zelf een voertuig nemen en ermee rijden kan alleen in je eigen spel.' },
  { actie: 'gesprekken', mag: 'nee', regel: 'Praten met voorbijgangers en personages kan alleen in je eigen spel; wat de ander zegt zie je als ondertitel.' },
  { actie: 'bijbanen', mag: 'nee', regel: 'Een bijbaan start en speelt wie het spel opende (een trekker, taxi of bezorgwagen zou in zijn wereld verschijnen); bij zo een plek zie je "Alleen bij wie het spel opende". Samen een opdracht doen kan alleen waar de opdracht dat zegt.' },
  { actie: 'hengelen', mag: 'ja', regel: 'Hengelen aan elk water (I) en de wedstrijd in Meerstad (E): de minigame draait op je eigen scherm; wat je vangt komt in je eigen visboek, de loopbaan en je eigen geld. Er verdwijnt geen vis uit de wereld van wie het spel opende. Je blijft staan; de anderen zien je zonder hengel.' },
  { actie: 'boerderij', mag: 'deels', regel: 'Je eigen akker (pauzemenu, Boerderij): je gewas groeit ook terwijl je meespeelt, je kiest gewassen en koopt machines met je eigen geld. De klussen op het land (trekker) doe je in je eigen spel: de trekker zou in de wereld van wie het spel opende staan.' },
  { actie: 'minigames', mag: 'deels', regel: 'Pannenkoeken bakken en de beiaard speel je zelf, op je eigen scherm. Discgolf, pitch en put, skatepark, kartbaan, zwemmen, klimmen, vliegles, botsautootjes en padel zetten je lichaam of een voertuig in de wereld en blijven bij wie het spel opende: je krijgt "Alleen bij wie het spel opende".' },
  { actie: 'missies', mag: 'deels', regel: 'Missies en het verhaal speelt wie het spel opende; jij loopt mee en krijgt je deel als beloning in je eigen geld.' },
];

// De camera van een gast draait met de muis (#388). Een gast draait updateGameplay niet, dus de camerahoek op de grond die player.js
// bijhoudt (MOUSE_TURN_PER_PX) bleef staan: de camera kon niet draaien. Zelfde formule, hier puur en getest.
export const MUIS_DRAAI_PER_PX = 0.0025;
export function gastKijkHoek(camYaw, dx, gevoeligheid = 1) {
  const a = Number.isFinite(camYaw) ? camYaw : 0;
  const d = Number.isFinite(dx) ? dx : 0, g = Number.isFinite(gevoeligheid) ? gevoeligheid : 1;
  const r = a + d * MUIS_DRAAI_PER_PX * g;
  return Math.atan2(Math.sin(r), Math.cos(r));
}

// Een voertuig staat bijna stil: dan kan een bijrijder veilig uitstappen
export const UITSTAP_MAX_SNELHEID = 2;
export const kanUitstappen = (v) => !!v && !v.isHeli && !v.isPlane && Math.abs(v.speed || 0) <= UITSTAP_MAX_SNELHEID;

// Het stuur: hoe lang een verzoek van de bijrijder blijft staan voor de bestuurder (s)
export const WIEL_VERZOEK_S = 12;

// De invoer van de bijrijder (stick en knoppen van het net) als invoer voor het voertuig van de bestuurder:
// zelfde vorm als world.input (axis, isDown, wasPressed). bit 1 = rennen (hier: sprinten op een fiets), bit 2 = handrem.
export function wielInvoer(r) {
  const mx = r && Number.isFinite(r.mx) ? Math.max(-1, Math.min(1, r.mx)) : 0;
  const my = r && Number.isFinite(r.my) ? Math.max(-1, Math.min(1, r.my)) : 0;
  const b = (r && r.buttons) | 0;
  return {
    axis: () => [mx, my],
    isDown: (k) => (k === ' ' ? !!(b & 2) : k === 'shift' ? !!(b & 1) : false),
    wasPressed: () => false,
    consume: () => {},
  };
}

// De knoppen die een gast naar de host stuurt: bit 0 rennen, bit 1 handrem
export const knoppen = (rennen, handrem) => (rennen ? 1 : 0) | (handrem ? 2 : 0);

// Wat de bijrijder te lezen krijgt als de host het stuur geeft of terugneemt
// de toets voor het stuur-gebaar: Y op het toetsenbord, D-pad omhoog met een controller
const wielToets = () => (typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('pad-active') ? 'D-pad omhoog' : 'Y');
export const WIEL_TEKST = {
  gekregen: (naam) => `${naam} geeft je het stuur. ${wielToets()} om het terug te geven.`,
  terug: (naam) => `${naam} neemt het stuur terug.`,
  gevraagd: 'Je vraagt om het stuur.',
  geen: 'Alleen als bijrijder kun je om het stuur vragen.',
};
export const WIEL_HOST_TEKST = {
  gevraagd: (naam) => `${naam} vraagt om het stuur. ${wielToets()} om te geven.`,
  gegeven: (naam) => `Je geeft ${naam} het stuur. ${wielToets()} om het terug te nemen.`,
  terug: (naam) => `Je neemt het stuur terug van ${naam}.`,
};
