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
export const MELDING_WINKEL = (naam) => `${naam}: dat kan alleen in je eigen spel.`;

// De tabel van de regels (docs/COOP-GAST.md en de tests lezen hem). mag: ja | nee | deels
export const GAST_REGELS = [
  { actie: 'lopen', mag: 'ja', regel: 'Lopen en rennen zoals altijd.' },
  { actie: 'winkelen', mag: 'ja', regel: 'Winkels met spullen voor jezelf (kleding, kapper, tabak en loterij, avondwinkel, snackbar, woonwarenhuis) en automaten: op je eigen scherm, met je eigen geld; wat je koopt is van jou en gaat in je eigen opgeslagen spel.' },
  { actie: 'eten', mag: 'ja', regel: 'Eten en drinken bij een horecaplek en de muurkroket: met je eigen geld en je eigen gezondheid.' },
  { actie: 'voertuig-kopen', mag: 'nee', regel: 'Voertuigen, boten, helikopters, wapens, tuning en lak kopen kan alleen in je eigen spel: ze zouden in de wereld van de ander verschijnen.' },
  { actie: 'bijrijden', mag: 'ja', regel: 'De eerste gast (Tessa) rijdt mee als wie het spel opende in een voertuig zit en dicht bij is; met E stap je uit (als het voertuig bijna stilstaat) en weer in.' },
  { actie: 'sturen', mag: 'deels', regel: 'Met Y (controller: D-pad omhoog) geeft de bestuurder het stuur aan zijn bijrijder (en neemt het terug); de bijrijder kan met Y om het stuur vragen. De bestuurder blijft de bestuurder: schade en politie zijn van hem.' },
  { actie: 'eigen-voertuig', mag: 'nee', regel: 'Zelf een voertuig nemen en ermee rijden kan alleen in je eigen spel.' },
  { actie: 'gesprekken', mag: 'nee', regel: 'Praten met voorbijgangers en personages kan alleen in je eigen spel; wat de ander zegt zie je als ondertitel.' },
  { actie: 'bijbanen', mag: 'nee', regel: 'Een bijbaan of minigame start en speelt wie het spel opende; jij kijkt mee. Samen een opdracht doen kan alleen waar de opdracht dat zegt.' },
  { actie: 'missies', mag: 'deels', regel: 'Missies en het verhaal speelt wie het spel opende; jij loopt mee en krijgt je deel als beloning in je eigen geld.' },
];

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
