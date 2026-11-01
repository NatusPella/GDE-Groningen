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
export const GAST_ACTIVITEITEN = new Set(['hengelen', 'pannenkoek', 'carillon', 'boeren']);
export const activiteitMagLokaal = (id) => GAST_ACTIVITEITEN.has(id);
// Wat een gast aan de host meldt als hij zo'n activiteit speelt (alleen bij een wisseling; een oudere host negeert het bericht)
export const bezigEvent = (id) => ({ k: 'bezig', a: GAST_ACTIVITEITEN.has(id) ? id : null });
export const MELDING_ALLEEN_OPENER = 'Alleen bij wie het spel opende.';

// Een gast drukt mee op het paneel van de gastheer (#525): een keuze of een timing van een verhaalstap.
// Alleen de toetsen die de gastheer hem noemde komen door, zodat een gast geen willekeurige toets kan sturen.
export function paneelEvent(toets, paneel) {
  const mag = paneel && Array.isArray(paneel.toetsen) ? paneel.toetsen : null;
  const k = typeof toets === 'string' ? toets : '';
  if (!mag || !mag.includes(k)) return null;
  return { k: 'paneel', a: k };
}
// De eerste toets van het paneel die deze gast indrukte (dezelfde vorm als world.input, zonder DOM)
export function paneelToets(input, paneel) {
  if (!input || !paneel || !Array.isArray(paneel.toetsen) || !input.wasPressed) return null;
  for (const k of paneel.toetsen) if (input.wasPressed(k)) return k;
  return null;
}
// De gastheer leest de toets van een gast als zijn eigen antwoord. Dat gaat via een wachtrij en niet meteen in de
// invoer: de berichten van de gasten komen na de spellus van dit beeld binnen (main.js: tickCoopNet na
// updateGameplay, en daarna wist input.endFrame de toetsen), dus de stap leest hem aan het begin van het volgende
// beeld. Alleen de toetsen die het paneel van deze stap aanneemt komen door, en per gast hoogstens een keer per
// PANEEL_WACHT_S: een gast kan niet sneller drukken dan de gastheer zelf kan. `stap` is de lopende verhaalstap
// (missions.js activeStage), `sc` het sc├¿nebericht dat de gasten als laatste kregen (daar staat het paneel in).
export const PANEEL_WACHT_S = 0.2;
export function paneelIndrukken(world, van, toets, stap, sc = null) {
  if (!world || !stap || (stap.kind !== 'choice' && stap.kind !== 'timing')) return false;
  const paneel = sc && sc.paneel;
  if (!paneel || !Array.isArray(paneel.toetsen) || !paneel.toetsen.includes(toets)) return false;
  const inp = world.input;
  if (!inp || !inp._justPressed || world.paused || world.uiPaused) return false;
  const n = world.coopNet;
  if (!n || n.role !== 'host' || !(van >= 1)) return false;
  const nu = Number(world.time) || 0;
  const at = n.paneelAt || (n.paneelAt = {});
  if (nu - (at[van] ?? -Infinity) < PANEEL_WACHT_S) return false;
  at[van] = nu;
  (world.coopPaneel || (world.coopPaneel = [])).push({ van, toets, soort: stap.kind });
  return true;
}
// De drukken van gasten die bij deze stap horen, en ze uit de wachtrij halen. Een druk voor een keuze komt nooit
// bij een timing terecht en andersom.
export function neemPaneelDruk(world, soort) {
  const q = world && world.coopPaneel;
  if (!Array.isArray(q) || !q.length) return [];
  const uit = [], rest = [];
  for (const d of q) { if (d && d.soort === soort) uit.push(d.toets); else rest.push(d); }
  world.coopPaneel = rest;
  return uit;
}

export const MELDING_WINKEL = (naam) => `${naam}: dat kan alleen in je eigen spel.`;

// Een gast begint zijn eigen opdracht niet vanuit de telefoon of het menu: zijn scherm is een dunne client en de
// opdracht moet in de wereld van wie het spel opende lopen. Hij vraagt hem bij het startpunt met E (#452).
export const MISSIE_VIA_STARTPUNT = 'Samen spelen: ga naar het startpunt van je opdracht en druk daar op E om hem te vragen.';
export const missieMagVanuitMenu = (world) => !world || world.coopRole !== 'client';

// De tabel van de regels (docs/COOP-GAST.md en de tests lezen hem). mag: ja | nee | deels
export const GAST_REGELS = [
  { actie: 'lopen', mag: 'ja', regel: 'Lopen en rennen zoals altijd.' },
  { actie: 'winkelen', mag: 'ja', regel: 'Winkels met spullen voor jezelf (kleding, kapper, tabak en loterij, avondwinkel, snackbar, woonwarenhuis) en automaten: op je eigen scherm, met je eigen geld; wat je koopt is van jou en gaat in je eigen opgeslagen spel.' },
  { actie: 'eten', mag: 'ja', regel: 'Eten en drinken bij een horecaplek en de muurkroket: met je eigen geld en je eigen gezondheid.' },
  { actie: 'voertuig-kopen', mag: 'nee', regel: 'Voertuigen, boten, helikopters, wapens, tuning en lak kopen kan alleen in je eigen spel: ze zouden in de wereld van de ander verschijnen.' },
  { actie: 'bijrijden', mag: 'ja', regel: 'De eerste gast (Tessa) stapt zelf in met E als wie het spel opende in een voertuig zit en dicht bij is (ze gaat niet vanzelf mee); met E stap je uit (als het voertuig bijna stilstaat). In een vliegtuig of helikopter rijd je als passagier mee, nooit als piloot; uitstappen kan daar alleen op de grond, bij bijna stilstand. Blijft ze te ver achter, dan rijdt ze na een paar seconden mee. De derde en vierde speler stappen ook met E in (auto: drie extra plekken, bus: zes) en zijn dan niet meer te zien; fietsen, scooters, vliegtuigen en helikopters hebben geen plek voor hen.' },
  { actie: 'sturen', mag: 'deels', regel: 'Met Y (controller: D-pad omhoog) geeft de bestuurder het stuur aan zijn bijrijder (en neemt het terug); de bijrijder kan met Y om het stuur vragen. De bestuurder blijft de bestuurder: schade en politie zijn van hem.' },
  { actie: 'eigen-voertuig', mag: 'deels', regel: 'Met E bij een vrij voertuig (geparkeerde auto, fiets, scooter, boot) stap je in als bestuurder en met E bij bijna stilstand weer uit; geen helikopter of vliegtuig. Schade, politie en diefstal zijn van jou.' },
  { actie: 'gesprekken', mag: 'nee', regel: 'Praten met voorbijgangers en personages kan alleen in je eigen spel; wat de ander zegt zie je als ondertitel.' },
  { actie: 'bijbanen', mag: 'deels', regel: 'Taxi, bezorgen, de krantenwijk en de vrachtrit doe je samen (coopbijbaan.js): druk E bij het startpunt en wie het spel opende start de baan voor je; de anderen, ook wie het spel opende, krijgen "Meedoen?" (J of N, zonder antwoord kijk je mee, geen late instap; wie het spel opende en N zegt krijgt geen loon). Je ziet doel en marker, helpt als passagier, tweede bezorger, krantengooier of bijrijder (E bij laden en lossen), en krijgt bij elke ronde de volledige beloning in je eigen geld en loopbaan. De andere bijbanen blijven bij wie het spel opende: je ziet "Alleen bij wie het spel opende".' },
  { actie: 'hengelen', mag: 'ja', regel: 'Hengelen aan elk water (I) en de wedstrijd in Meerstad (E): de minigame draait op je eigen scherm; wat je vangt komt in je eigen visboek, de loopbaan en je eigen geld. Er verdwijnt geen vis uit de wereld van wie het spel opende. Je blijft staan (of zit in de boot, als die stilligt); de anderen zien je met een hengel.' },
  { actie: 'wapens', mag: 'ja', regel: 'Een wapen dat je in je eigen spel hebt (1 tot 4 of het muiswiel, de muisknop om te slaan of te schieten): wie het spel opende rekent je slag of schot uit vanuit je lichaam, met de schade en de kogels van dat wapen en met jouw patronen. Schade en misdaad tellen bij jou; de anderen zien het wapen in je hand. Spuiten en gooien (waterpistool, carbidbus, vuurwerk) kan alleen in je eigen spel.' },
  { actie: 'boerderij', mag: 'ja', regel: 'Je eigen akker (pauzemenu, Boerderij): je gewas groeit ook terwijl je meespeelt, je kiest gewassen en koopt machines met je eigen geld. De klus op het land doe je op je eigen scherm: sta op je akker bij Hoogkerk en druk E (boerderijgast.js), houd de balk in het midden met Spatie. Het materiaal betaal je zelf, de oogst en de punten gaan naar je eigen boerderij; er komt geen trekker in de wereld van wie het spel opende.' },
  { actie: 'minigames', mag: 'deels', regel: 'Pannenkoeken bakken en de beiaard speel je zelf, op je eigen scherm. De kartbaan, discgolf, pitch en put, de klimtoren en padel start iedereen: druk E bij het startpunt, wie het spel opende voert het verzoek uit en alle anderen, ook hij, krijgen "Meedoen?" (J of N; geen antwoord is nee). Skatepark, zwemmen, vliegles en botsautootjes zetten je lichaam of een voertuig in de wereld en blijven bij wie het spel opende: je krijgt "Alleen bij wie het spel opende".' },
  { actie: 'missies', mag: 'deels', regel: 'Missies en het verhaal speelt wie het spel opende; jij loopt mee en krijgt je volledige beloning in je eigen geld. Je kunt zelf ook een opdracht starten: sta bij het startpunt en druk daar op E. Vanuit de telefoon of het menu begin je geen opdracht; daar staat dezelfde verwijzing naar het startpunt. Alleen wie het spel opende bepaalt of een filmpje of verhaalstap voor iedereen wordt overgeslagen; jij kunt je eigen weergave van een filmpje wel overslaan.' },
];

// De camera van een gast draait met de muis (#388). Een gast draait updateGameplay niet, dus de camerahoek op de grond die player.js
// bijhoudt (MOUSE_TURN_PER_PX) bleef staan: de camera kon niet draaien. Zelfde formule, hier puur en getest.
export const MUIS_DRAAI_PER_PX = 0.0025;
// Dezelfde grens als de camera van de gastheer (scene3d.js PITCH_LOOK_MIN/MAX_DEG), want de stand komt daar terecht.
export const KIJK_MIN_RAD = (-16 * Math.PI) / 180;
export const KIJK_MAX_RAD = (60 * Math.PI) / 180;
export const KIJK_STANDAARD = (0.2 * Math.PI) / 180;
// Een gast leest de muis in updateGameplay, maar de camera (update3D) draait pas na input.endFrame, dat mouse.dy op nul
// zet: de gast kon dus niet omhoog of omlaag kijken (#434). Hij telt de beweging van dit beeld zelf op en zet die op
// nul, zodat de camera hem ├®├®n keer leest. In een voertuig doet de camera het zelf, net als bij de gastheer.
export function gastKijkHoogte(world, dy, gevoeligheid = 1) {
  const d = Number.isFinite(dy) ? dy : 0;
  const m = world.input && world.input.mouse;
  if (m && d) m.dy = 0;
  if (!world || world.coopInVoertuig || !d) return;
  const g = Number.isFinite(gevoeligheid) ? gevoeligheid : 1;
  const nu = (Number.isFinite(world.coopKijkPitch) ? world.coopKijkPitch : KIJK_STANDAARD) + d * MUIS_DRAAI_PER_PX * g;
  world.coopKijkPitch = Math.max(KIJK_MIN_RAD, Math.min(KIJK_MAX_RAD, nu));
}
export function gastKijkHoek(camYaw, dx, gevoeligheid = 1) {
  const a = Number.isFinite(camYaw) ? camYaw : 0;
  const d = Number.isFinite(dx) ? dx : 0, g = Number.isFinite(gevoeligheid) ? gevoeligheid : 1;
  const r = a + d * MUIS_DRAAI_PER_PX * g;
  return Math.atan2(Math.sin(r), Math.cos(r));
}

// Een voertuig staat bijna stil: dan kan een bijrijder veilig uitstappen. Een vliegtuig of helikopter alleen op de grond:
// in de lucht blijft de gast aan boord, ook als het toestel even stilhangt (#492).
export const UITSTAP_MAX_SNELHEID = 2;
export const kanUitstappen = (v) => {
  if (!v || Math.abs(v.speed || 0) > UITSTAP_MAX_SNELHEID) return false;
  if (v.isHeli || v.isPlane) return v.onGround === true;
  return true;
};

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
