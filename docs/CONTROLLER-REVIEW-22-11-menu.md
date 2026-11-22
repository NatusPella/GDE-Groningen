# Controller-review van het pauzemenu en alle pagina's, 22-11

Eigenaarsvraag: is alles logisch te bereiken en te klikken met een controller (en met alleen toetsenbord, muis of aanraking waar relevant)?
Scope van deze ronde: het pauzemenu en alle tabs en pagina's (14 schermen hieronder). Issues: #1011 (spelersmenu en Samen-flow) en #495 (controllerknoppen in het voertuig).
Niemand heeft deze ronde een scherm in beeld bekeken of met een echte controller bediend: er draaide geen Electron. Wat de audit niet kan zien staat onderaan als lijst voor de Electron-ronde.

## Hoe het gemeten is

- `node scripts/controller_audit_menu.mjs [--scherm=kaart] [--json]` leest per scherm de bronnen (sjablonen, JS en CSS) en vertaalt ze naar de vragen die `gamepad.js` en `pausemenu.js` zelf stellen. De controller ziet alleen `button`, `a[href]`, `input`, `select`, `textarea` en elementen met `tabindex >= 0` (`FOCUSABLE`); een klikdoel daarbuiten bestaat voor hem niet.
- Controles per scherm: onbereikbare klikdoelen (in sjablonen en in JS-gemaakte elementen), positieve `tabindex` (breekt de volgorde), modale vensters zonder Esc-pad (B) of focusteruggave, spelertekst die een klik of toets als woord noemt zonder `{TOKEN}`, dubbele sneltoetsen in een sjabloon, tekstveldtypen die het schermtoetsenbord niet opent, hold-teksten zonder tik-alternatief, een focusring die wegvalt (CSS), footerhints zonder controllerknop (`HINTS` tegen `PAD_KEYS`), en lijsten die opnieuw worden getekend na een klik zonder de focus te bewaren.
- De navigatie-simulatie draait `navIndex` (listnav) en `spatialNext` (padlogic) op lijsten van 1 tot 120 knoppen en op rasters (Spullen, Garage, Kleding): elke knop is vanaf de beginfocus met de D-pad te bereiken en Tab loopt rond (geen focusval).
- Een DOM met indeling bestaat in Node niet. De simulatie rekent dus met de ontwerpvorm (kolom, raster), niet met de echte posities op het scherm; die meet de bestaande sweep in Electron (`scripts/qa/controller_sweep.mjs`, zie `QA-CONTROLLER-20-11.md`).
- De test `scripts/controller_menu_test.mjs` (permanent, groen) eist dat er niets overblijft buiten de lijst met onderbouwde uitzonderingen, dat elke uitzondering nog bestaat, en test de nieuwe logica zonder DOM (`nextSelectIndex`, `isPadTextField`, `focusbehoud.js`).

## Uitkomst per scherm, voor en na

Voor = de audit en de handmatige leesronde op `origin/main` (16 bevindingen, waarvan 9 echte gebreken; de rest uitzonderingen met reden). Na = de audit op deze branch (11 bevindingen, alle als uitzondering onderbouwd).

| Scherm | Voor | Na |
| --- | --- | --- |
| Pauzemenu: rail, tabbladen, Spel, Over, Besturing | De hints T (Loopbaan) en F8 (Foto's) hadden geen controllerknop: bij een controller stond er een toetsenbordplaatje. Zoekvelden werden met de D-pad overgeslagen. B in een tekstveld deed niets. | `PAD_KEYS` kent T en F8 (de hint verdwijnt bij een controller, de knoppen staan in het scherm). Zoekvelden zijn bereikbaar: A opent het schermtoetsenbord, B verlaat het veld, daarna gaat B een niveau terug. Uitzonderingen: koppelingstoets bij rijden (voertuig, #495) en de bewust ontbrekende ring op een niet gekozen tab. |
| Kaart (zoomniveaus, lagen, ping en pin, bezit te koop, Reis erheen) | Geen gebrek gevonden. De kaart heeft een eigen toetsenpatroon (`kaartToets`), L3 naar de kaartknoppen, A onder het kruis, X wist het waypoint, Shift+klik heeft een kaartmodus als alternatief. | Ongewijzigd. Uitzonderingen: het omhulsel van de plekkaart en de zoekresultaten (combobox met pijlen en Enter). |
| Loopbaan (Tour, Vakken) | De Tour/Vakken-knoppen zijn echte knoppen; de T-hint was het enige gebrek (zie Pauzemenu). | Geen bevindingen. |
| Bezit (Land en bedrijf) | Vier keuzelijsten (filter, sorteren, product, "Van jou" pand) waren met een controller niet te bedienen: een nagebootste toets opent een `<select>` niet en A klikte er niet op. Elke klik tekende alle panelen opnieuw: de focus viel op body en de D-pad begon weer bovenaan. | A stapt naar de volgende optie, X naar de vorige (`nextSelectIndex`, `gamepad.js`); de focus blijft op dezelfde knop of keuzelijst na het opnieuw tekenen (`keepFocus`). |
| Spullen (raster, wapens) | Geen gebrek gevonden. Raster en filterchips bereikbaar; zoekveld nu ook. | Geen bevindingen. |
| Kleding (kast, pashokje, kapper) | Geen gebrek gevonden (de lijsten zijn modellen die `shopui.js` als rijen met knoppen tekent). | Geen bevindingen. |
| Tuning (showroom en werkplaats) | Eigen toetsenpatroon (rijen, links/rechts, B sluit na een tweede druk als er iets niet is geïnstalleerd). Eigen kleur is een OS-kleurkiezer. Spatie houdt het vergelijken vast. | Ongewijzigd; drie uitzonderingen (kleurkiezer, geen menu eronder). Open: vergelijken vasthouden heeft geen tik-alternatief. |
| Prestaties | Geen gebrek gevonden (houdt zelf de focus vast na een klik, `keepFocus`). | Geen bevindingen. |
| Instellingen (toegankelijkheid, geluid, radio, moeilijkheid, herbinden) | Schuifregelaars en keuzerijen lopen met links en rechts, de zenderlijst met links en rechts, herbinden met B als annuleren. Geen gebrek gevonden. | Geen bevindingen. Het tik-alternatief voor rennen en richten is de instelling Tikken in plaats van ingedrukt houden (`tikStand`). |
| Spel en Samen spelen (sessielijst, lobby, spelerslijst) | Het wachtwoordveld van een sessie opende het schermtoetsenbord niet (`type=password` stond niet in de lijst): een controller kon het niet invullen. Escape in het zoekveld van de sessielijst wiste altijd en liet B nooit teruggaan. Dempen, blokkeren, kleur kiezen en de stappen van de hub tekenden de lijst opnieuw: de focus ging naar body. | Het schermtoetsenbord opent ook op een wachtwoord en toont puntjes. B wist het zoekveld alleen als er tekst staat, daarna gaat B terug. De spelerslijst en de hub houden de focus op dezelfde knop. Uitzondering: `samenpanel.js` tekent alleen de eenmalige profielkaart. |
| Uitleg, aanwijzingen en recap | De recapkaart sluit met Enter, Spatie, Escape en Backspace (A en B); geen focusbaar element nodig. | Geen bevindingen buiten die ene uitzondering. |
| Opgeslagen spellen en Nieuw spel | Opslaglijst en startscherm hebben een eigen volledig toetsenpatroon (pijlen, Enter, Esc, een tweede druk voor wissen). Geen gebrek gevonden. | Geen bevindingen. |
| Te doen | Geen gebrek gevonden (houdt de focus via `rerenderTodo`). | Geen bevindingen. |
| Veroverd, Visboek, Foto's | Veroverd: een maatregel kopen in de Beleidswinkel tekende het paneel opnieuw en liet de focus op body vallen. | Veroverd houdt de focus (`keepFocus`). Visboek en Foto's: uitzonderingen met reden (alleen het detailvlak wordt vervangen). |

## Wat is gerepareerd (code)

1. `game/js/gamepad.js`: A (en spatie) op een `<select>` stapt naar de volgende optie, X naar de vorige, en meldt `input` en `change`; B in een tekstveld verlaat het veld (eerst een niveau terug), zodat B er niet meer dood blijft. De pijlenstap staat nu in `stepFocus`.
2. `game/js/padlogic.js`: `nextSelectIndex`, `PAD_TEXT_TYPES` en `isPadTextField` (puur, getest). `game/js/padkeyboard.js` gebruikt ze en opent ook op `type=password` (met puntjes in de weergave).
3. `game/js/focusbehoud.js` (nieuw): `keepFocus(paneel)` geeft een herstelfunctie; na `innerHTML` zet die de focus terug op hetzelfde element (data-attributen) en steelt hem niet als hij al elders staat. In gebruik bij Bezit, de spelerslijst, de Samen-hub en Veroverd.
4. `game/js/pausemenu.js`: de hints T en F8 zonder controllerknop (`PAD_KEYS`), en zoekvelden zijn met de D-pad bereikbaar (het schermtoetsenbord en B-uit-het-veld maken dat bruikbaar).
5. `game/js/lobbyui.js`: Escape wist het sessiezoekveld alleen als er tekst staat.

Samen spelen: invoer is lokaal; er is niets aan het net of de snapshots veranderd. Elk onderdeel hierboven geldt voor wie het spel opende en voor een gast op zijn eigen scherm.

## De lijst bekende uitzonderingen

Staat in `scripts/controller_menu_test.mjs` (`UITZONDERINGEN`, elk met reden): koppelingstoets bij het rijden, de ring op niet gekozen tabs, het omhulsel van de plekkaart, de kaartzoekresultaten, de OS-kleurkiezer en de werkplaats zonder menu eronder (3x), `samenpanel.js` (eenmalige kaart), de recapkaart, Visboek en de Foto's-overlay.

## Open punten

- **Spatie vasthouden om te vergelijken in de tuning-werkplaats** (en daarmee Y op de controller) heeft geen tik-alternatief; `tikStand` dekt alleen rennen en richten. Voorstel: de tikstand uitbreiden naar vergelijken.
- **De spelerslijst in het spel** (Tab ingedrukt houden, op de controller R3) heeft geen tik-alternatief; het alternatief is het tabblad Spelers onder Spel > Samen spelen, waar dempen en blokkeren ook staan.
- **Een keuzelijst met veel opties** (Bezit: regio's, panden) loopt met A stap voor stap; een echte opener volgt als het ontwerp een eigen keuzemenu krijgt.
- Het sluiten van de OS-kleurkiezer in de werkplaats: met een controller niet mogelijk; het palet is er voor in de plaats.

## Alleen in beeld of met een echte controller te controleren (lijst voor de Electron-ronde)

1. Bezit: A op de keuzelijsten Filter, Sorteren, Product en "Van jou": de optie wisselt, het paneel tekent opnieuw en de focus staat nog op dezelfde lijst; X gaat een optie terug.
2. Samen spelen: een sessie met wachtwoord starten; A op het wachtwoordveld opent het schermtoetsenbord met puntjes, de tekens komen in het veld, klaar sluit het en Enter bevestigt.
3. Spelerslijst: dempen en blokkeren met A; de focus blijft op de knop (het label wisselt), B gaat terug.
4. Zoekvelden in Spullen en Besturing: D-pad omhoog vanaf de eerste rij komt in het veld, A opent het schermtoetsenbord, B verlaat het veld en een tweede B gaat een niveau terug.
5. Sessielijst zoeken: B wist de tekst, een tweede B gaat terug (geen focusval).
6. Veroverd > Beleidswinkel: een maatregel kopen; de focus blijft op de knop.
7. Footerhints bij Loopbaan en Foto's met een controller: geen toetsenbordplaatje T of F8 meer.
8. Het zichtbaar zijn van de DS3-focusring op 1280x720 en bij ui-schaal 1,5 voor alle schermen; of de ring niet door een omhullende kaart wordt afgesneden.
9. Of de focusvolgorde op het scherm het beeld volgt (boven naar beneden, links naar rechts) in de Garage en Spullen; deze ronde is alleen de DOM-volgorde en een ideaal raster gemeten.
10. Schermtoetsenbord bij de naam van de opslag-lijst (Hernoemen) en bij de sessienaam; de hold-acties in de werkplaats (zie Open punten).
