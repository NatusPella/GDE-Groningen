// De slideshows op de marketingpagina (#37). Eén bron voor alle categorieën, zodat de
// pagina niet uit duizenden losse regels HTML bestaat. Build.mjs zet dit om naar HTML.
// Beelden: img/trailer-*.webp zijn stills uit de gameplaytrailer van 7 november 2026
// (eigen spel, eigen kanaal); de andere komen uit docs/screenshots en
// docs/steam/beelden/screenshots. Alle beelden zijn in het spel zelf gemaakt.
export const SLIDESHOWS = [
  {
    id: 'locaties',
    kicker: 'Locaties',
    title: 'Groningen van boven tot onder',
    lead: 'De Martinitoren, de binnenstad, het Ommeland en de Waddenzee: het echte Groningen in low poly.',
    slides: [
      { img: 'img/loc-martinitoren.webp', alt: 'De Martinitoren van dichtbij boven de daken van Groningen.', tag: 'Martinitoren', title: 'De toren van Grunn', text: 'Het herkenningspunt staat er gewoon, ook vanaf het dak.' },
      { img: 'img/02-vismarkt.jpg', alt: 'De Vismarkt in Groningen op een zomeravond, met de Martinitoren op de achtergrond.', tag: 'Vismarkt', title: 'Zomer op de Vismarkt', text: 'Terrasjes, mensen en de Martinitoren op de achtergrond.' },
      { img: 'img/stad-nacht.webp', alt: 'De binnenstad van Groningen bij nacht, met de verlichte Martinitoren tussen de daken.', tag: 'Binnenstad', title: 'Groningen bij nacht', text: 'De binnenstad blijft ook na zonsondergang vol leven.' },
      { img: 'img/loc-dorp.webp', alt: 'Een dorp in het Groninger landschap met akkers en kerktorens.', tag: 'Ommeland', title: 'Dorpen en akkers', text: 'Buiten de ring ligt het Groninger landschap klaar.' },
      { img: 'img/loc-haven.webp', alt: 'Havens en kanalen bij een dorp in Groningen, met water en groene oevers.', tag: 'Waddenzee', title: 'Aan het water', text: 'Havens, kanalen en de Waddenzee in het noorden.' },
      { img: 'img/loc-winkelstraat.webp', alt: 'Een kleurrijke winkelstraat in Groningen met etalages.', tag: 'Winkelstraat', title: 'Kleur in de straat', text: 'Elke straat heeft z\'n eigen gezicht, van gevel tot etalage.' },
      { img: 'img/loc-leek-haven.webp', alt: 'Een straathoek in een Gronings dorp met het bord Leek Haven.', tag: 'Leek', title: 'Even de provincie in', text: 'Ook buiten Groningen-stad valt er van alles te zien.' },
    ],
  },
  {
    id: 'vervoer',
    kicker: 'Vervoer',
    title: 'Van bus tot helikopter',
    lead: 'Stadsbus, auto, fiets, boot, skûtsje en heli: de belangrijkste manieren om door Grunn te komen.',
    slides: [
      { img: 'img/vervoer-bus.webp', alt: 'Een stadsbus en auto\'s in een Groningse straat met fietsen.', tag: 'Bus', title: 'De stadsbus', text: 'Instappen, instappen, achteruit instappen.' },
      { img: 'img/vervoer-auto.webp', alt: 'Een rode auto in een smalle Groningse straat.', tag: 'Auto', title: 'Gewoon een auto', text: 'Pak wat je pakken kunt; de verzekering regelt de rest.' },
      { img: 'img/loc-straat-fietsen.webp', alt: 'Een Groningse straat met bomen en fietsen.', tag: 'Fiets', title: 'De fiets staat voor', text: 'Nederland op z\'n best: overal fietsen, overal heen.' },
      { img: 'img/kust-sluis.webp', alt: 'Een skûtsje met oranje zeil bij een sluis aan de Waddenzee.', tag: 'Skûtsje', title: 'Het water op', text: 'Met een skûtsje door de sluis, de Waddenzee tegemoet.' },
      { img: 'img/08-rondvaart.jpg', alt: 'Een rondvaartboot in de grachten van Groningen, gezien vanaf het water.', tag: 'Rondvaart', title: 'Vanaf het water', text: 'Langzaam door de grachten, met een gids die te veel vertelt.' },
      { img: 'img/vervoer-heli.webp', alt: 'Een rode helikopter boven de daken van Groningen bij zonsondergang.', tag: 'Helikopter', title: 'Boven de stad', text: 'Even alles van boven bekijken, de ring en de bruggen.' },
      { img: 'img/garage.webp', alt: 'De garage met een overzicht van voertuigen, elk met een draaiend 3D-voorbeeld.', tag: 'Garage', title: 'De garage', text: 'Auto\'s, boten, scooters en een helikopter bij elkaar.' },
    ],
  },
  {
    id: 'missies',
    kicker: 'Missies',
    title: 'Opdrachten met een doel',
    lead: 'Van missie-HUD tot achtervolging; het verhaal in vijf aktes.',
    slides: [
      { img: 'img/01-missie-hud.jpg', alt: 'Een missie in het spel met de opdracht, de kaart en de HUD in beeld.', tag: 'Missies', title: 'Aan de slag', text: 'Een doel, een kaart en Groningse stemmen.' },
      { img: 'img/09-achtervolging.jpg', alt: 'Een achtervolging door een smalle Groningse straat met drie sterren in beeld.', tag: 'Achtervolging', title: 'Drie sterren', text: 'De politie zoekt je; jij zoekt een steegje.' },
      { img: 'img/cutscene-opening.webp', alt: 'Een scène uit de opening van het verhaal met een Nederlandse ondertitel.', tag: 'Verhaal', title: 'De opening', text: 'De stemmen praten Gronings, de ondertitel is Nederlands.' },
      { img: 'img/03-ringrace.jpg', alt: 'Een race op de ringweg van Groningen met snelheidsmeter en verkeer.', tag: 'Racen', title: 'Rondje ring', text: 'Gas erop, maar let op de flitspaal.' },
      { img: 'img/verhaal-menu.webp', alt: 'Het verhaalmenu met de personages van GDE Groningen.', tag: 'Verhaalmenu', title: 'Wie speelt welke rol?', text: 'Tammo, Tessa en de rest van Grunn in één overzicht.' },
    ],
  },
  {
    id: 'minigames',
    kicker: 'Minigames',
    title: 'Even iets anders doen',
    lead: 'Kermis, zwembad, discgolf, hengelen, klimmen en padel: de startkaart staat vol.',
    slides: [
      { img: 'img/05-kermis.jpg', alt: 'De kermis op de Grote Markt bij avond, met het reuzenrad en verlichting.', tag: 'Kermis', title: 'Kermis op de Grote Markt', text: 'Reuzenrad, suikerspin en een beetje kabaal.' },
      { img: 'img/mini-zwembad.webp', alt: 'Het zwembad met banen in het spel, met een speler op de kant.', tag: 'Zwembad', title: 'Eén baan, één tijd', text: 'Zo snel mogelijk heen en weer, zonder te verdrinken.' },
      { img: 'img/mini-discgolf.webp', alt: 'Discgolf in het park met de baan en de HUD in beeld.', tag: 'Discgolf', title: 'Discgolf', text: 'Het park in, op zoek naar de basket.' },
      { img: 'img/mini-hengelen.webp', alt: 'Hengelen aan het water met de hengel in de hand.', tag: 'Hengelen', title: 'Aan de waterkant', text: 'Even stilzitten en wachten tot er iets bijt.' },
      { img: 'img/mini-klimtoren.webp', alt: 'De klimtoren in het spel met de klimmer in beeld.', tag: 'Klimtoren', title: 'De klimtoren', text: 'Omhoog, omhoog, en niet naar beneden kijken.' },
      { img: 'img/mini-padel.webp', alt: 'De padelbaan in het spel met een speler in beeld.', tag: 'Padel', title: 'Padel', text: 'Twee tegen twee, met een vaste tweeling als tegenstander.' },
      { img: 'img/10-duif.jpg', alt: 'De duif-modus: over de stad vliegen en punten verzamelen.', tag: 'Duif-modus', title: 'Als duif over Grunn', text: 'Poep op alles, verzamel punten, niemand die het ziet.' },
    ],
  },
  {
    id: 'samen',
    kicker: 'Samen spelen',
    title: 'Samen door Grunn',
    lead: 'Nodig een vriend uit met een kamercode; geen account nodig.',
    slides: [
      { img: 'img/samen-spelen.webp', alt: 'De wachtkamer van Samen spelen met een kamercode en drie spelers.', tag: 'Wachtkamer', title: 'Kamercode', text: 'Vrienden uitnodigen en samen beginnen.' },
      { img: 'img/opgeslagen-spellen.webp', alt: 'Het scherm Opgeslagen spellen met meerdere spelstanden.', tag: 'Samen verder', title: 'Je eigen spel', text: 'Iedere speler houdt eigen voortgang en een eigen save.' },
      { img: 'img/samen-straat.webp', alt: 'Twee spelers lopen samen door een Groningse straat.', tag: 'In de stad', title: 'Samen op stap', text: 'Twee spelers, één scherm, en de hele stad voor je.' },
    ],
  },
  {
    id: 'menus',
    kicker: "Menu's",
    title: 'De wereld bij de hand',
    lead: 'De hele provincie op de kaart, je garage, de boerderij en je prestaties.',
    slides: [
      { img: 'img/kaart-provincie.webp', alt: 'De kaart van de hele provincie Groningen met dorpen, wegen, water en stations.', tag: 'Kaart', title: 'De hele provincie', text: 'Alle dorpen, wegen, water en stations op één kaart.' },
      { img: 'img/kaart-stad.webp', alt: 'De kaart van de stad Groningen met iconen voor winkels, garages en bijzondere plekken.', tag: 'Kaart', title: 'De stad op de kaart', text: 'Elke plek een eigen icoon, van winkel tot klus.' },
      { img: 'img/menu-garage.webp', alt: 'Het garage-menu met een overzicht van beschikbare voertuigen.', tag: 'Garage', title: 'Je wagenpark', text: 'Kies een auto, boot of heli en ga.' },
      { img: 'img/menu-boerderij.webp', alt: 'Het boerderij-menu met je percelen en machines.', tag: 'Boerderij', title: 'Je eigen akker', text: 'Zaaien, oogsten en je percelen uitbreiden.' },
      { img: 'img/menu-prestaties.webp', alt: 'Het prestatieoverzicht met behaalde en open prestaties.', tag: 'Prestaties', title: 'Alles wat je deed', text: 'Prestaties, records en wat er nog open staat.' },
      { img: 'img/menu-instellingen.webp', alt: 'Het instellingenscherm met spelopties.', tag: 'Instellingen', title: 'Naar jouw hand', text: 'Besturing, beeld en toegankelijkheid aanpassen.' },
    ],
  },
];

