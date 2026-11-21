# Spec: UI, menu's en taal

> **Wijk of buurt (#716):** de 66 punten van de HUD/kaart heten **buurt**; de CBS-laag van Veroverd heet **gebied/wijk** en gebruikt de CBS-naam. Gebruik nooit "wijk" voor de 66 punten en nooit "buurt" voor de veroverlaag als geheel.
> Canonieke spec voor alles wat de speler ziet en leest. Vervangt de regels uit
> `DESIGN_SYSTEM.md`, `docs/DESIGN-BEDIENING.md`, `docs/DESIGN-COMPONENTEN.md`,
> `docs/INCLUSIEVE-TAAL.md`, `docs/WOORDENLIJST.md`, `docs/DIALECT-CONTROLE.md` en
> `docs/3d-model-prompts.md`; die blijven naslag. De code is de waarheid; `AGENTS.md`
> wint bij twijfel.

## Doel

Groen op donkergroen chroom, hoge smalle posterletter, korte Nederlandse tekst. Elk
scherm leest als hetzelfde spel; wijkt er één af, dan is dat een bug.

## Kleur

Tokens staan in `game/js/hud_panel.css` (`:root`), `game/js/menu.css` (`.gm`) en
`game/js/a11y.css`; er is geen `game/css/`.

| Token | Hex | Betekenis |
|---|---|---|
| `--gron-green` | `#1e9e56` | accent: knoppen, actieve stand, randen |
| `--gron-green-light` | `#3fc97a` | koppen, toetslabels, hover, gloed |
| `--gd` | `#0f5c30` | ingedrukte knop (`.gm`, `menu.css:12`) |
| achtergrond | `#17301f` → `#0c140e` | radiale gradient, nooit plat zwart |
| tekst | `#f0ede4`, `#f2f2f2` | body op donker chroom |
| gevaar | `#d93f3f`, tekst `#f08a8a` | het enige rood |
| wanted | `#e8c93a`, leeg `rgba(255,255,255,0.25)` | alleen de wanted-sterren |
| toetsplaatje | `#fbfaf5` op `#0c140e`, rand `#a9a69b` | elke hint (`a11y.css:6`) |

- Eén rood: `#d93f3f`; `#f08a8a` alleen als tekst, `#e55a5a` als hover
  (`menu.css:102`). Geel `#e8c93a` is gereserveerd voor wanted-sterren, de badge voor
  bijzondere dagen en de missiemarkering. Geen blauw accent, geen tweede merkkeur,
  geen plat zwart.
- Statuskleuren nooit als eigen hex: `markerColors()` (`a11y.js:21`) leest `PALETTES`
  (`:14-19`) en zet `--mk-*` op `<html>` (`:52`): ok `#3fc97a`, danger `#d93f3f`,
  mission `#e8c93a`, missionActive `#3fd0ff`, your goal `#c068ff`, job `#ff9a3c`,
  care `#ff5fb4`, police `#3f6fd9`. Drie kleurenblindmodi vervangen die met
  Okabe-Ito-waarden; canvas en 3D hertekenen op `onPaletteChange`.
- Contrast 4,5:1 voor tekst, 3:1 voor grote tekst en iconen (`a11ylogic.js:35-36`).
  Kleur is nooit de enige aanwijzing; vorm, patroon of woord gaat mee.
- Er is geen `--gron-green-dark`: de donkere groentint heet `--gd` (`menu.css:12`), en
  `DESIGN_SYSTEM.md:43` gebruikt die naam nu ook.

## Typografie en logo

- Stack `'Bebas Neue', 'Arial Narrow', Arial, sans-serif`, geladen in
  `game/index.html:14`. Lopende tekst in Arial Narrow; Bebas voor titels, tabs,
  knoppen, cijfers en eyebrows.
- Menu: titel 80 px, sectietitel 64, nummer 44, tab en primaire knop 26, ghost 24,
  body 20 op regelafstand 1,45, klein 18 (`menu.css:16,31-33,89,93`).
- Logo is HTML/CSS, nooit een beeld: `logoHtml()` (`logo.js`) en `.gde-logo`
  (`index.html:26`). GDE in Big Shoulders Display 900 van `#f0ede4` naar `#3fc97a`,
  de plaatsnaam op een plaat `#1e9e56`. Big Shoulders is alleen voor het logo.
- **Leesnorm: 13 px voor menu's en HUD, harde ondergrens 13 px** voor elke zin; alleen de
  binnenkant van een toetsplaatje mag kleiner. Relatieve groottes (`em`, `%`) die krimpen
  krijgen een vloer: `max(13px, .8em)`, nooit kaal `.8em`. `spec_check.mjs` vergelijkt deze
  twee getallen met `READABLE_MIN` (`hudlook.js`) en `TEXT_FLOOR_PX`
  (`scripts/release/design_rules.mjs`); die regelcontrole keurt nieuwe regels in de gate
  (`release_designrules_test.mjs`), en `hud_layout_test.mjs` en `steam_test.mjs` keuren de
  bestaande CSS. De HUD zet `--hud-min` op 13 px gedeeld door `--ui`
  (`hud_panel.css:13`); `READABLE_MIN` is 13 (`hudlook.js:109`).
- Geen conflict meer tussen 12 en 13 px: de docs (`DESIGN_SYSTEM.md`,
  `DESIGN-COMPONENTEN.md`) lezen als de Leesnorm hierboven (13 als doel, 12 als harde
  ondergrens waar de poort op blokkeert). De code doet 13 in de HUD en 20/18 in de menu's.
- De 11 px in de kaartbalk is weg sinds #602: `kaartactieui.js` gebruikt 26 px Bebas
  labels en 18 px uitleg, met de kleuren uit de tokens (`DESIGN-SCHULD.md` rij 1 is
  daarmee bijgewerkt; de balk is nog niet door een mens in het spel gezien).

## Bediening

De tabel in het pauzemenu (Instellingen > Besturing > Toetsenoverzicht,
`CONTROL_GROUPS` in `pausemenu.js:59`) is de bron van waarheid: W A S D en muis
lopen en kijken, `Shift` rent, `Space` springt of remt, `Ctrl` bukt, E of F gebruikt,
Esc gaat terug, M opent de kaart, Tab de spelerslijst, Q/E de tabbladen, U dempt, O
slaat de verhaalstap over, F8 opent de fotomodus, F11 volledig scherm en 7, 8, 9
roepen.

- Elke actie heeft een weg op elk apparaat dat de speler mag gebruiken, of het scherm
  zegt waarom niet. Een nieuwe actie krijgt meteen een slot in `PAD_MAPS`
  (`controls.js:204`); touchknoppen zijn diezelfde slots.
- Noem een toets nooit als tekst: gebruik `{E}` of `glyphHtml()`. De hint toont wat je
  nu kunt, hooguit twee regels.
- Touch: knoppen 64 px rond (`touch.js:22`), elk ander element minstens 44 px hoog
  (`:46`). Esc of B gaat altijd terug.
- Q/E en `[`/`]` doen hetzelfde: ze wisselen de zichtbare tabrij van het onderdeel, de
  binnenste eerst (Spel > Samen spelen heeft Samen spelen en Spelers), en op een scherm
  zonder tabbladen gaan ze naar het vorige of volgende onderdeel; de voetregel noemt de
  uitkomst ("tabblad", "spelers-tab", "onderdeel") en de Besturing-tabel zegt hetzelfde
  (#601; het oude conflict met de tabel is daarmee weg).

## Bediening en toetshints (opdracht 21-11, #1003)

Het hoofdstuk "Controls and key hints" in `DESIGN_SYSTEM.md` is de uitwerking; dit is de samenvatting als spelregel:

- Elke toets- of knopverwijzing in spelertekst is een `{TOKEN}` (`{E}`, `{SPACE}`, `{ESC}`, `{ENTER}`, `{SHIFT}`, `{CTRL}`, `{ALT}`, `{F8}`, `{WASD}`, `{ARROWS}`, `{LMB}`, `{RMB}`, `{MOUSE}`, `{WHEEL}`). Nooit een toetsnaam als woord ("Spatie", "Esc", "Enter", "pijltjes") en nooit een pijltje als tekst. Het token volgt herbinden en de controller.
- Eén weergavepad: `keyTextHtml`, `glyphHtml` of `keyLabelHtml` voor HTML; `plainKeyText` voor aria-label, title, canvas en logregels.
- Maat: het toetsicoon is minstens 26 px hoog in de HUD en 28 px in menu's, met leesbare tekst erin, zonder dat de layout breekt.
- Controller: in padmodus staat de knop van de actieve familie (Xbox, PlayStation, Steam Deck, Switch) en wisselt live met een ander apparaat. Een toets zonder glyph is een nette tekstkeycap in dezelfde stijl.
- Toegankelijkheid: elk icoon heeft een aria-label met de naam; de hint zegt wat de toets doet; nooit alleen kleur. Rustig drukwerk: een vlakke plaat zonder glans.
- Handhaving: `key_literals_test`, `key_tokens_test` en de releasegate (`checkKeyLine`): een nieuwe hint zonder token is een belangrijke bevinding. Uitgezonderd zijn alleen ingesproken regels en ondertitels (de tekst volgt de clip, ADR 0041), bestanden die de tokens zelf renderen en een regel met `keywords-ok`.

## Toets in de knop (21-11)

Een knop met een toets of controllerknop toont die als keycap-glyph IN de knop (na het label, of rechts in een rij), nooit als losse hint ernaast. Eén component: `dsButtonKey` en `knopToets` (`game/js/dsbutton.js`) om `glyphHtml`. De glyph volgt herbinden en het apparaat (toetsenbord, Xbox, PlayStation, Steam Deck, Switch), verdwijnt op aanraking of zonder padknop, erft de kleur van de knop en heeft geen eigen px-maat. Bevestigen is `ENTER` (A), terug is `ESC` (B), een rijkeuze het cijfer 1 tot 9. `controleerToetsInKnop` (`scripts/lib/ds3_regels.mjs`, in `ds3_dekking_test`) bewaakt: een knop met `data-key` heeft zijn glyph erin en er staat geen losse toetshint naast een knop. Zie `DESIGN_SYSTEM.md` "Key in the button".

## Navigatie met controller en toetsenbord (menu-patroon, 21-11)

Eén patroon voor elke popup en menulijst: bevestigen Enter of A, terug Esc of B (een laag per keer: venster, kaart, scherm), secundaire actie X of Delete (waar die bestaat), pijl omhoog en omlaag of D-pad en stick lopen door de knoppen, pijl links en rechts tussen de voetknoppen, Home en End naar de uiteinden, de cijfers 1 tot 9 kiezen een rij (in de rij getoond), Q en E of LB en RB wisselen de pagina's van het pauzemenu en doen niets in een modaal venster. Eerste focus op de primaire actie, bij sluiten terug naar wat het opende, een modaal venster houdt de focus binnen (Tab loopt rond, de D-pad blijft erin), een kaart op de kaart is niet modaal. Zichtbare focus is de DS3-ring (`:focus-visible`, bij pad altijd). Muis en aanraking blijven werken. Code: `listnav.js` (`navIndex`), `mapview.js kaartToets`, `padmapnav.js`. Zie `DESIGN_SYSTEM.md` "Navigation with controller and keyboard" en `docs/KAART-POPUPS-21-11.md`.

## Menu's

De structuur staat op één plek: `SECTIONS` (`pausemenu.js:235`), `RAIL_GROUPS`
(`:254`), `CHILD` (`:257`), `SUBTABS` (`:259`) en `HINTS` (`:275`). De rail heeft
drie groepen met een eigen kop en het aantal onderdelen erachter (#911): Spelen
(Spel, Verhaal, Loopbanen, Veroverd, Activiteiten) / Jij (Kaart, Spullen, Garage,
Prestaties, Foto's) / Systeem (Instellingen, Cheats). De kop van het blad noemt de
groep en de plek ("Spelen · 2 van 5"). De tabs uit `SUBTABS`:

| Sectie | Tabs |
|---|---|
| Spel | Overzicht, Samen spelen, Opslaan & stoppen |
| Samen spelen | Samen spelen, Spelers |
| Verhaal | Opdrachten, Personages, Aanwijzingen |
| Activiteiten | Alles, Dichtbij |
| Instellingen | Beeld, Geluid & ondertitels, Spel, Besturing, Camera, Interface, Hints & uitleg, Toegankelijkheid |
| Besturing | Toetsenbord en muis, Controller, Toetsenoverzicht, Aanraken, Hulp |

- De kaart is één scherm zonder rail; Visboek en Boerderij hangen onder Loopbanen,
  Besturing onder Instellingen en **Over** onder Instellingen > Interface. Spelers
  alleen in een sessie (`:358`); voor een spel begint alleen Spel, Instellingen en
  Besturing (`:258`). De rail heeft twaalf vaste rijen van 50 px in drie groepen met
  een kleine groepskop; de stage is altijd 1920x1080 ontwerp-px, dus de rail krimpt
  of scrollt niet op 1280x720 en 1920x1080 (#601, #911). Over is een naslagscherm met
  twee vouwen (Wat is er nieuw, Credits en licenties) en 18 px body.
- Spel > Overzicht is thuis: daar opent het menu, en Esc gaat van een kindscherm naar
  de ouder, dan naar Overzicht en sluit. Het Overzicht is een rustig beeld: waar je
  bent, hoe ver je bent (hetzelfde percentage als de HUD, #898), wat er in de buurt
  is en wat je bijna haalt. Instellingen (volume, beweging) staan onder Instellingen,
  niet op het Overzicht (#896); hoe het spel speelt en hoe moeilijk het is onder
  Instellingen > Spel (#891, #897). Eén primaire knop per scherm, de rest ghost
  of stille tekst; groen voor gekozen of primair, rood alleen wat iets verwoest.
- Eén eigenaar: de structuur staat alleen in `pausemenu.js`, de vorm alleen in
  `menu.css` (`.gm`, `.m-*`). Geen ander bestand definieert knoppen, rijen of tabs
  (`DESIGN_SYSTEM.md:217-219`); de Samen spelen-schermen breken dit nog
  (`DESIGN-SCHULD.md:16`).
- Hooguit 125 woorden op een keuzescherm en 270 op een naslagscherm, beeld boven
  tekst, twee tot vier hints, focus zichtbaar (2 px crème, `menu.css:26`, of 2 px
  groen `#3fc97a` met controller, `a11y.css:34`).
- Opgelost op 25-10: `DESIGN_SYSTEM.md:233` zei "drie groepen" en noemde er vier, en
  zette Spelers als tab van Spel. Het document volgt nu de code: drie groepen
  (`:254`), Spelers onder Samen spelen (`:265`), en Cheats als eigen rail-item
  (`streken`, sinds #435) naast de tab onder Instellingen.
- De hub van Samen spelen is een **wizard**, geen tabs: één zichtbare stap,
  `aria-current="step"` op de actieve stap en de teller als `role="status"`
  (`aria-live="polite"`) die de wissel aankondigt (#571). Een tablist zonder
  panelen is verboden; een icoon met betekenis in een kale `span` krijgt
  `role="img"` met een Nederlandse `aria-label`.

## Taal

- Nederlands in alles wat de speler ziet of hoort (constitutie 1); code,
  bestandsnamen en opslagsleutels blijven zoals ze zijn.
- Woordkeuze uit `docs/WOORDENLIJST.md`: opslaan, savegame, **Opgeslagen spellen**,
  **Doorgaan**, controlepunt of hervatpunt, uitzending, topscore, uitleg, einde spel.
  **Samen spelen**, nooit co-op, coöp of multiplayer; wachtkamer of kamer, nooit
  lobby. Geen rolnaam als gastheer of host: de naam van de speler of "de ander".
- `scripts/text_audit.mjs` faalt op de Engelse vorm (`ANGLICISMEN`, `:223`) en op "de
  Grunn" (`:254`). Het is "Grunn".
- Gronings en Fries alleen met zorg. Een dialectregel staat zoals hij is, met de
  Nederlandse vertaling eronder in cursief op 0,8 em (`.nl-sub`,
  `hud_panel.css:393`); de stem spreekt Gronings, de ondertitel blijft Nederlands. Een
  nieuw dialectwoord komt met betekenis, status en bewijs in
  `scripts/dialect_woorden.json`.
- Geen echt merk, bedrijf of persoon; parodie heeft verzonnen namen (`winkelNaam`).
  Echte plaatsen mogen. In credits staat alleen de eigenaar, de rest is NatusPella.
- Getallen in Nederlandse notatie: `840 m` onder een kilometer en `1,2 km` daarboven
  (`achievementsui.js:31`), geld als `€45` zonder spatie (`boerderijui.js:15`), tijd
  als `m:ss.cc` (`minigamekit.js:37`), wind als `Wind 3 Bft` of `Windstil` (`:54`).
- Woordbudget: een HUD-bericht is één zin van hooguit 14 woorden
  (`WORD_BUDGET.cardBody`, `hudtext.js:18`); het doel zelf 6, de regel eronder 3, een
  hint 3, een prompt 8, een ondertitel 18.
- Toon: kort en rustig; een weigering zegt waarom, een afkoeling hoe lang.

## Inclusieve taal

Geen man als standaard (agent, brandweerlieden, vuilnisophaler, zakenreiziger,
klusser, iemand aan het roer), geen groepsaanspreking (allemaal, iedereen, mensen,
beste aanwezigen), geen "hij" voor een onbekend persoon (die, diegene, de, je eigen),
en geen aandoening, afkomst, gender of ziekte als scheldwoord. Satire over gedrag en
een personage met een vast geslacht mogen blijven. `text_audit.mjs` (regel
`inclusief`, `:240`) houdt dit vast; uitzonderingen staan met reden in
`scripts/text_audit_allow.json`. Zie `docs/INCLUSIEVE-TAAL.md`.

## Beeldtaal 3D

- Low-poly, vlakke facetten, geen omlijning: gebouwen als blokken met puntdaken en
  trapgevels, bomen als gefacetteerde bollen, mensen en voertuigen kantig. De
  Martinitoren (`game/models/martinitoren.glb`) is het ijkpunt, 1 eenheid = 1 m, Y
  omhoog, PBR, geen Habbo- of cartoonstijl.
- Een echte plek is herkenbaar maar stijl-eigen: geen kopie van foto, bouwtekening of
  bestaand model, geen merk-, kenteken- of gemeentelogo. Aards palet (baksteen
  `#a8442c`, daken `#2b2a38`, water `#2c7790`), altijd zomer; beelden buiten het
  spel zijn renders van het spel (`game/img/laad/`, `loadscene.js`).
- Een echt merk als stijlbron mag niet. Dat was tot 25-10 fout in de stijlbrief (een
  "Ford Escort"-achtige auto en chibi-proporties); die noemt nu "een vierkante
  Nederlandse gezinsauto uit de jaren 90" en kiest kantig boven chibi, met de echte
  maten uit `models3d_people.js` (#479).

## Tokens en componenten in gebruik (#980)

Het papieren oppervlak met bordgroen voor koppen, kentekengeel als het ene accent voor "kan nu" en inkt voor tekst; glas blijft nog voor de pauze- en kaartlaag en de HUD tot die schermen zijn omgebouwd (zie het hoofdstuk hieronder en `docs/DESIGN-SCHULD.md`). De tokens (`game/js/ds-tokens.css`), de componenten (`game/js/ds-components.css`), de galerij (`game/ds-galerij.html`), de contrasttabel, de typografie- en ruimteschaal, de HUD-hoeken, de beweging en de regels staan in `DESIGN_SYSTEM.md`; de telling van de huidige CSS in `docs/DESIGN-AUDIT-CSS.md`.
- Kleur is een rol (primair, probleem, selectie, succes, waarschuwing), nooit alleen de kleur: er gaat een icoon, vorm of woord mee. Geen blauw accent en geen tweede rood buiten de papier-variant van het ene rood.
- Hulptekst minstens 13 px en 4,5:1; beweging hooguit 250 ms en uit bij "Beweging beperken"; elk scherm heeft een hero of een reden waarom niet, en elke lege toestand een haak en een handeling.
- Bewaakt door `checkDsLine` en `checkDsFiles` in `scripts/release/design_rules.mjs` en door `scripts/ds_tokens_test.mjs` (contrast per kleurpaar, componentenlijst, galerij).

## Designsysteem: zomerse zeefdruk (besloten 20-11, ADR 0040)

Het doel voor alle UI; het werk is de ombouw-epic van ADR 0040 (#991 tot en met #1002). De tokens en componenten staan er al; tot een scherm is omgebouwd, beschrijven "Kleur", "Typografie" en "Tokens en componenten in gebruik" wat de code doet. Over het doel wint dit hoofdstuk; de hexwaarden zijn voorlopig tot de eigenaar de HUD in het spel heeft gezien. Details en tabellen: hoofdstuk "The design system: summer screen print" in `DESIGN_SYSTEM.md`; waarom en wat is afgewezen: [ADR 0040](adr/0040-zomerse-zeefdruk-als-designsysteem.md).

- **Eén materiaal overal:** HUD, menu's, telefoon, kaart, laadschermen en grote momenten zijn zeefdruk op crème papier. Donker glas en de papieren bon verdwijnen als oppervlak; tokens, componenten en galerij blijven het mechanisme.
- **Palet:** papier `#f3ead3`, inkt `#1d1b17`, bordgroen `#0e6b3c`, zomergeel `#f9c80e`, roze `#e8505b`, plus het ene gevaarrood (ADR 0010) en de kleurenblinde `--mk-*`. Niets anders. Eén geel: `#e8c93a` gaat op in zomergeel; wanted wordt roze sterren met inktrand, een lege ster is raster.
- **Drukeffecten met een taak:** misdruk (roze, 2 tot 3 px) markeert verandering en identiteit, nooit een zin of toetsplaatje; harde schaduw is de hoogteschaal; raster betekent leeg, uit of op slot; kaarten hooguit 1,5 graden scheef, een kaart met focus staat recht.
- **Letters:** Barlow Condensed voor titels, cijfers, HUD, knoppen en stempels; Atkinson Hyperlegible voor elke zin. Beide OFL en zelf gehost in `game/fonts/`; de Google Fonts-links verdwijnen (constitution-regel 4). Big Shoulders blijft alleen voor het logo. Leesnorm blijft 13 px, harde ondergrens 13 px (alleen de binnenkant van een toetsplaatje: 12 px).
- **Rustig drukwerk** (instelling): geen misdruk, schuinte, raster of stempelbeweging, alle tekst minstens 7:1, verder dezelfde inkten en layout. Standaard aan op de Steam Deck.
- **HUD verschijnt bij behoefte:** minimap en doelregel blijven staan; geld, gezondheid, wapen en wanted komen bij een verandering, in gevaar of op een vastgehouden knop en gaan na 4 s weg (instelling "Altijd tonen"). HUD-waarden staan op een papieren plaatje met inktrand. Minimap: afgerond vierkant, route als dikke zomergele lijn, zoom per vervoermiddel, buurtnaam eronder.
- **Grote momenten:** missie geslaagd of mislukt (schermvullend, Groningse uitroep met Nederlands eronder, beloning en tijd), opgepakt of buiten westen (stempel op een bekeuring, zonder geweld), nieuw gebied of dorp (plaatsnaamstempel), wanted omhoog of omlaag (kort aan de rand, niet schermvullend).
- **Volle persoonlijkheid:** parodie-apps, stempels, Groningse uitroepen en droge lege toestanden. Knoplabels blijven gewone werkwoorden; elke Groningse regel heeft het Nederlands erbij; geen echt merk of echte persoon; woordbudget 14 blijft.
- **Controller eerst:** ontworpen op bank-afstand en de Deck, d-pad-focus, bumpers voor tabs, vasthouden om iets onomkeerbaars te bevestigen. Muis, toetsenbord en touch bedienen dezelfde plekken.
- **Microinteracties** (hoofdstuk "Microinteractions" in DESIGN_SYSTEM.md, `game/js/ds-motion.css`, `game/js/microinteractions.js`): een kleine bibliotheek binnen de schaal 120/200/250 ms. Inschuiven (opacity plus 8 px vanaf de rand waar de melding hoort, 200 ms), verblijven (de duur komt van de component: `cardtime.js`, `toastDuur()`, `m.ms`; geen animatie; een melding met klik of focus pauzeert bij hover en focus), uitfaden (200 ms, geen beweging), opschuiven (de volgende melding schuift soepel naar de vrije plek), teller oplopen (hooguit 250 ms, dan vast), voortgang vullen (eenmalig), aantikken (druk-state 120 ms) en einde-missie (één landing van 250 ms, een stempel 200 ms later, daarna stilstand). Nooit een lus, alleen opacity, `translate` (1 tot 8 px) en fills, geen flits boven drie per seconde, betekenis nooit alleen door beweging. Bij "Beweging beperken" en Rustig drukwerk staat alles op 0 ms: dezelfde woorden, dezelfde plek. Toegepast op HUD-kaarten, telefoonmelding, prestatietoast, de grote momenten en de geldteller; meldingen zijn lokaal per speler bij Samen spelen. Bewaakt door `scripts/microinteracties_test.mjs`.
- **Handhaving:** token- en componenttest, de galerij als enige bron (elk component in elke staat, ook Rustig drukwerk en Samen spelen), beeldregressie per scherm in drie resoluties en beide standen, en de ombouw als één epic: eerst de HUD-proef, dan pauze en kaart, telefoon, winkels, minigames, Samen spelen, laad- en bootscherm. Geen release met een half omgebouwd scherm.

## Microanimaties (DS3)

Wens van de eigenaar (21-11): prestaties mogen meer als een prestatie voelen en kaarten, HUD en menu's mogen meer microanimaties krijgen. Dit is de spec; de uitwerking met de volledige catalogus staat in `DESIGN_SYSTEM.md` ("Microanimaties (DS3)"), de css in `game/js/ds-micro.css` (`.ds-m-*` voor micro, `.ds-moment-*` voor hoogtepunten), de tokens in `game/js/ds-tokens.css`, de pure logica in `game/js/dsmicro.js` en `game/js/achievementunlock.js` en de regels als code in `scripts/lib/ds3_regels.mjs` (bewaakt door `scripts/ds3_dekking_test.mjs`). De oudere `.ds-mi-*`-microinteracties (hoofdstuk hierboven) blijven de basis.

- **Bewegingstaal.** Microtijden `--ds-m-kort` 80 ms (een tik), `--ds-m-midden` 150 ms (knop, chip, schakelaar, selectie) en `--ds-m-lang` 250 ms (kaart, paneel, balk; gelijk aan `--ds-m-max`); easing `--ds-m-uit` (ease-out), `--ds-m-inuit` (een wissel tussen twee standen) en `--ds-m-stempel` (lichte overshoot, een stempel die inslaat); staffel `--ds-m-staffel` 40 ms per lijstrij, hooguit 8 vertraagde rijen. De harde grens van 250 ms voor een microinteractie blijft. Alleen een **moment** (een prestatie, de eindkaart van een missie, een level-up) mag langer: gestaffeld tot hooguit 1,6 s, met een eigen klassefamilie (`.ds-moment-*`) en eigen tokens: `--ds-moment-stap` 120 ms, `--ds-moment-duur` 400 ms per onderdeel en `--ds-moment-max` 1600 ms voor het geheel (`--ds-moment-leven` 2 s is de ademhaling van de live-stip). Een `--ds-m-*`-token boven 250 ms keurt de releasegate af. Bij "Beweging beperken", Rustig drukwerk en prefers-reduced-motion staan alle tijdtokens op 0 ms.
- **Catalogus per componenttype** (vaste patronen, een klasse en geen nieuwe css): kaart of paneel binnen (`.ds-m-binnen`: opacity, 8 px omhoog, lichte overshoot), kaart verlaten (`.ds-m-weg`: alleen faden), knop (`.ds-m-knop`: hover tilt 1 px, de druk zakt 2 px in de schaduw en de schaduw-offset verspringt 2 px, focus doet wat hover doet), lijstrij gestaffeld (`.ds-m-rij`), teller of getal (`.ds-m-tik`: tabulair, een tik per stap), badge of chip (`.ds-m-pop`), voortgangsbalk die vult met glans (`.ds-m-vul`, `.ds-m-glans`), tab of segment met glijdende onderstreping (`.ds-m-tabs`), schakelaar, vinkje en schuifknop (`.ds-m-schakel`, `.ds-m-vink`, `.ds-m-greep`), toast (`.ds-m-toast`), tooltip (`.ds-m-tip`), scrollrand (`.ds-m-scrollfade`), selectiepuls (`.ds-m-puls`), nieuwe-melding-stip (`.ds-m-stip`, `.ds-m-nieuw`) en een beloning die naar de HUD-teller vliegt (`.ds-moment-vlieg`).
- **Regels.** Eén animatie per gebeurtenis. Alleen `transform`, `opacity` en de losse eigenschappen `translate`, `scale` en `rotate` (geen layout-animatie, geen `filter`; `box-shadow` alleen op de knop). Tijden alleen uit tokens. Nooit blokkerend voor invoer, en overslaan kan waar een moment de aandacht vasthoudt (toets of klik toont direct de eindstand). Geen lus buiten de live-stip en de bel. Elke klasse heeft een reduced-motion-tegenhanger in alle drie de takken (`html.reduce-motion`, `html.rustig-drukwerk`, `prefers-reduced-motion`): geen beweging, geen staffel, geen schok, dezelfde woorden op dezelfde plek; Rustig drukwerk kent alleen een fade of een directe eindstand. Betekenis nooit alleen door beweging.
- **Geluid.** Een moment mag klinken, een microanimatie niet (menugeluid blijft in `sfx/listnav.js`). Geluid loopt via de bestaande SFX-bus (de sting-bus, dus Effecten-volume en dempen werken): een UI-tik, een whoosh of een stempelslag. Nooit dubbel voor één gebeurtenis: de prestatie wacht tot de eindkaart weg is, dus hun slagen overlappen nooit, en de prestatie-sting (`achievementgeluid.js`) is het belletje terwijl `slag` de klap eronder is.
- **Prestatiebudget.** Hooguit 12 elementen met een eigen animatie tegelijk (de rest staat er gewoon), hooguit 8 vertraagde rijen, geen JS per frame (alleen timers op de stappen van een moment) en geen doorlopende lus behalve de live-stip.
- **De prestatie als moment.** De kaart slaat in met een zeefdruk-schaduw in de accentinkt (`.ds-moment-stempel`), het icoon ploft (`.ds-moment-ploft`), kicker, titel en beschrijving komen gestaffeld, het balkje "x/y prestaties" loopt op terwijl het getal tikt en een platte glans veegt over de kaart; het geheel duurt ongeveer 1 s. De accentinkt is de zeldzaamheid: goud geel (medaille of "alle goud", met het woord Goud), een geheime prestatie roze (met het woord Geheim), een gewone de inkt van zijn categorie. Meerdere tegelijk: de eerste van een reeks is een volle kaart, de volgende twee zijn kort (alleen titel, 60% van de tijd, een chip "nog N") en wat daarna nog wacht wordt één samenvatting ("Nog N prestaties"); de prestaties zelf staan in het menu. In het prestatiemenu (Pauze, Prestaties) komen de rijen gestaffeld binnen (niet bij een vouw of selectie), glanst een net-ontgrendelde rij één keer per sessie, tikt de categorie-teller op en vult een balk vanaf wat hij was.
- **Samen spelen.** Animaties zijn lokaal: elke speler speelt zijn eigen HUD, menu's en geluid, niets wordt gesynchroniseerd of over het net gestuurd. Een prestatie is per speler (#429), dus een gast ziet en hoort alleen zijn eigen prestaties.
- **Gecontroleerd.** `scripts/ds3_dekking_test.mjs` en `scripts/achievementunlock_test.mjs`; niets hiervan is in beeld of gehoor bekeken (zie het issue).

## Meldingen: duur en aflopend balkje

Wens van de eigenaar (21-11): sommige HUD-onderdelen hebben een balkje dat leegloopt, zodat je weet wanneer een melding weer weggaat; bijna alle meldingen mogen dat hebben en ongeveer even lang in beeld blijven. Dit is de spec; de uitwerking met de tabellen staat in `DESIGN_SYSTEM.md` ("Meldingen: duur en aflopend balkje"), de inventaris van alle meldingstypen in `docs/MELDINGEN-21-11.md`, de code in `game/js/noticetiming.js` (puur), `game/js/melding.js` (DOM) en `game/js/ds-melding.css`.

- **Eén bouwsteen.** Elke tijdelijke melding (HUD-kaart, prestatietoast, telefoonmelding, naamkaart, menumelding) gebruikt `.ds-melding` met `.ds-melding__tijd`; een nieuwe melding bouwt geen eigen balkje of eigen timer.
- **Vier duren.** Kort 4 s, normaal 6 s, lang 9 s, max 10 s (tokens `--ds-melding-*`). De duur komt uit de tekst: 2 s + tekens / 15, tussen 4 en 10 s, naar boven op een klas. Een tekst wordt nooit afgekapt voor hij te lezen is.
- **Het balkje** beweegt alleen met `transform: scaleX`, loopt lineair, is bordgroen (rood bij gevaar en politie, licht groen op een donkere kaart, nooit geel) en staat onderaan de melding.
- **Pauze en hover.** De timer en het balkje staan stil bij pauze, menu, film, verhaalgesprek en (waar de melding de muis mag krijgen) hover.
- **Kritiek.** Een kritieke melding (de foutkaart, een kaart die op een klik wacht) heeft geen balkje en sluit met een knop of toets.
- **Beweging beperken.** Het balkje blijft zichtbaar en loopt in tien stappen; de readingTime verandert niet (besluit, zie DESIGN_SYSTEM.md).
- **Wachtrij.** Hooguit een kaart tegelijk in de HUD; de rest wacht op precedence (kritiek, prio, oudste); bij twee of meer wachtenden is de duur kort.
- **Uitzonderingen** staan met een reden in `NOTICE_TYPES`: de foutkaart, de eindkaart en grote momenten, banners en de wijkkaart, ondertitels, het Opgeslagen-vinkje, het laadscherm en de stuntuitleg. `scripts/ds3_dekking_test.mjs` keurt een nieuw bestand dat een element op een timer laat verdwijnen zonder register.
- **Samen spelen.** Meldingen zijn lokaal per speler; niets wordt gesynchroniseerd.
- **Gecontroleerd.** `scripts/meldingtijd_test.mjs` en `scripts/ds3_dekking_test.mjs`; niets hiervan is in beeld bekeken (zie het issue).

## HUD-kaarten: typografische rollen

Elke HUD-kaart (tip, muziekkaart, telefoon- en nieuwskaart, prestatietoast, activiteit- en wachtkaart, doel, achtervolging en politie) haalt zijn lettergrootte uit vijf rollen en nooit uit een eigen px-waarde. Dezelfde rol is op elke kaartsoort dezelfde maat.

| Rol | Token | Maat | Gebruik |
|---|---|---|---|
| eyebrow | `--ds-t-kaart-eyebrow` | 13 px, Barlow 800, hoofdletters | soort of afzender boven de kop |
| titel | `--ds-t-kaart-titel` | 21 px, Barlow 800, regel 1,1 | de kop van de kaart |
| body | `--ds-t-kaart-body` | 16 px, Atkinson, regel 1,3 | de tekst |
| hulp | `--ds-t-kaart-hulp` | 13 px | tijd, bron, toetsregel, kleine uitleg |
| getal | `--ds-t-kaart-getal` | 28 px | een groot getal op een kaart |

- Een lange tekst (nieuws, telefoon) wordt niet groter gezet: hij gebruikt de body-rol en de kaart groeit mee (nieuwsbudget 30 woorden).
- De rollen staan op `:root` en op `#hud` (daar bestaat `--hud-min`); na het zoomen met `--ui` blijft de vloer 13 px, en Tekstgrootte (a11y) schaalt de kaarttekst mee.
- Grote momenten (`bigmoment.css`, naamkaart, aftellen) zijn geen kaarten en houden hun eigen maat.
- Bewaakt door `scripts/hud_typo_test.mjs`. Audit en maten voor en na: [docs/HUD-TYPO-21-11.md](../../docs/HUD-TYPO-21-11.md).

## Regels voor een nieuw scherm of nieuwe tekst

1. Alleen de tokens hierboven; een rolkleur via `markerColors()` of `--mk-*`. Geen
   nieuwe hex, geen tweede rood, geen blauw accent, geen plat zwart.
2. Nederlands, uit de woordenlijst, binnen het woordbudget, geen zin onder 13 px
   (menu's 13+), bekeken op 1280x720, 1280x800 en 4K.
3. Een menu gebruikt `.gm` en `.m-*`; een HUD-element heeft een zone, een prioriteit,
   een regel in `SURFACES` en een antwoord van `mayShow()`, en neemt geen klik.
4. Eén aanwijzing is nooit genoeg: vorm, patroon, merkteken of woord naast elke kleur,
   een caption naast elk geluid, de toets als token.
5. Toetsenbord, controller (`PAD_MAPS`) en touch (44 px) doen hetzelfde; Esc of B gaat
   terug, en Samen spelen krijgt de zes vragen beantwoord, zonder rolnaam.
6. Low-poly, geen echt merk, altijd zomer, een render van het spel.
7. Op 1080p en op de kleinste maat bekeken of "nog niet bekeken" in het issue; een
   nieuwe token of component in dezelfde commit in `DESIGN_SYSTEM.md`, een blijvende
   afwijking in `docs/DESIGN-SCHULD.md`, en `text_audit` plus `hud_text_audit` groen.

## Open punten (met issue)

- **#479:** kleuren buiten de tokens, onder meer `hudcards.css:39-44` (tweede rood
  `#ff5a4a`, blauw `#6c9bff`, paars `#d68cff`), `choicepanel.js:10-27` (`#d9a441`,
  `#5dff7a`, `#ff9a3c`) en `minigamekit.js:68-92` (`#6cc070`, `#ffd23f`). Besluit
  nodig: benoemen als statuskleur of vervangen.
- **#465 is op 25-10 gesloten en in beeld gezien:** de vier Engelse termen zijn nu
  Nederlands (Knielt, Afstand/Nadering/Putt, Grindtrucs, "Met liefde in Groningen");
  ook het startscherm (`game/index.html`), het About-venster (`desktop/main.js`) en de
  Windows-LEESMIJ zijn recht. `text_audit` kent ze en faalt erop (`ANGLICISMEN`).
- **#478 is half klaar:** "Start!" en "Mooi!" staan in de code en `text_audit` heeft er
  een `SHOUTS`-lijst voor, maar de kreet is nog niet op het scherm gezien (de eerste
  QA-poging trof de countdown en de puntflits niet). Het issue blijft open tot dat beeld
  er is.
- **#480 en #481 zijn op 25-10 gesloten:** de 3D-brief noemt geen merk meer en kiest
  kantig boven chibi; `DESIGN_SYSTEM.md` volgt de echte menustructuur van
  `pausemenu.js` (Cheats is sinds #435 een eigen rail-item, Spelers een tab onder
  Samen spelen). De Q/E-fout uit #480 is met #601 rechtgezet: de code, de voetregel en
  de Besturing-tabel zeggen nu alle drie hetzelfde.

## Kaart "Hoe pittig moet het zijn?" en Instellingen > Moeilijkheid (#1169)

**Regels.** Bij een nieuw spel en de allereerste start komt na de keuzekaart Alleen of Samen één DS3-kaart met drie niveaus (voorselectie Standaard, aanbevolen) en "Aanpassen"; de toets staat in de knop (1 tot 3, 4 voor Aanpassen), de focus volgt pijlen en WASD, Escape kiest Standaard, en een controller geeft dezelfde toetsen. De kaart heet nooit "Hoe wil je spelen?" (de keuzekaart). Later aanpasbaar onder Instellingen > Moeilijkheid met de uitleg dat sommige wijzigingen pas bij de volgende missie ingaan en wat Samen spelen doet. Testruns slaan de kaart over (Standaard). Naslag: [docs/MOEILIJKHEID-21-11.md](../../docs/MOEILIJKHEID-21-11.md).
