# Gebieden veroveren: wijken, plaatsen en streken helemaal doen (#414)

Voor wie aan `gebieden.js`, `gebiedenlive.js`, `gebiedenbronnen.js`, `gebiedenui.js`, `gebiedenkaart.js` werkt of een nieuwe plek met iets te doen toevoegt.
Tests: `scripts/gebieden_test.mjs`. Beeldcheck: `scripts/qa/gebieden_shots.mjs`.

## Wat de speler ziet

- **Pauzemenu › Loopbaan › Veroverd** (naast het tabblad Vakken): links alle te veroveren wijken, plaatsen en streken met een balk en "3 van 5";
  rechts wat er in het gekozen gebied te doen is, per soort (missies, bijbanen, minigames, vondsten, geheimen), met een vinkje voor wat je al deed.
- **Kaart › laag Veroverd** (legenda: Veroverd, standaard aan): elk gebied waar je aan begonnen bent kleurt mee (van oker naar groen,
  met "3/5" erbij); een gebied dat helemaal gedaan is krijgt de kleur van zijn vlag, een vlag op zijn midden en zijn titel bij het aanwijzen.
- **Bij de laatste taak**: een kaartje met de titel, een grapje en het geld, één keer per gebied. Onderweg meldt een klein kaartje
  "Oosterpoort: 3 van 5 gedaan".

Veroveren is satire: je neemt een buurt over met werk en service. Er is geen geweld en niemand verliest iets.

| Laag | Beloning | Titel | Vlag |
|---|---|---|---|
| Wijk | €150 | Wijkheld van *naam* | oker |
| Plaats | €400 | Burgemeester van *naam* | zeegroen |
| Streek | €1200 | Streekbaas van *naam* (de stad: Stadsbaas van Grunn) | rood |

Alle titels zijn verzonnen (constitution 2). Een gebied met minder dan twee dingen te doen (`MIN_TAKEN`) is niet te veroveren en staat niet in het overzicht.

## De indeling uit de wereldgegevens

| Laag | Bron | Regel |
|---|---|---|
| Wijk | de 66 `neighbourhoodPoints` van `stad.json` | dichtstbijzijnde punt, hooguit `WIJK_REACH` (1800 m): dezelfde regel als het HUD ("in welke wijk ben je") |
| Plaats | `worldplaces.js` (steden, dorpen en gehuchten van de provincie) | de plaats waar de plek het dichtst bij ligt ten opzichte van zijn bereik (dorp 800 m, stadje 1700 m, gehucht 350 m); de stad Groningen is geen plaats maar een streek met wijken |
| Streek | de acht `STREKEN` van `regioleven.js` plus de Stad Groningen | hoort een plek bij een wijk, dan bij de Stad Groningen; anders bij de streek met het dichtstbijzijnde hart binnen zijn bereik |

**Er zijn geen gemeentegrenzen in de gegevens.** De streken (Hogeland, Oldambt, Westerwolde, ...) en de Stad Groningen doen de dienst van een gemeente.
Echte gemeenten zouden een aparte laag met grenzen vragen (CBS-wijk- en buurtkaart of BAG-woonplaatsen); dat is een eigen taak.
Een plek hoort tegelijk bij een wijk of plaats én een streek: een missie in een wijk telt voor de wijk en voor de Stad Groningen.

## Wat er te doen is (de catalogus)

`gebiedenbronnen.js` verzamelt het uit het spel, bij elke indeling opnieuw (de plaatsen van de provincie komen soms later binnen):

| Soort | Bron | Plek | Gedaan als |
|---|---|---|---|
| Missie | `getMissionList()` (de gebouwde missies van het verhaal) | de start | de missie klaar is (`m:<id>`; elke 4 s gekeken, en bij een nieuwe sleutel) |
| Bijbaan | `getSideJobList()` | de plek van de baan | een ronde klaar is (`u:<baan>`, via `loopbaanTel`) |
| Minigame | `activitySpots()` (activities.js) en de padelbanen | de plek | de teller van de prestaties telt (`s:<teller>`, bv. `discgolfRounds`) of de loopbaanplek meldt (`u:kart`, `u:<padelbaan>`) |
| Vondst, geheim | `FINDS` van `regioleven.js` | de plek van de vondst | de vondst is gevonden (`v:<id>`, via `recordUnique`) |

Welke minigames meetellen en bij welke teller staat in `SPEL_SLEUTELS` (gebieden.js); `gebieden_test.mjs` controleert dat elke genoemde teller
en plek echt ergens in de code geteld of gemeld wordt. Een nieuwe plek met iets te doen: een regel in `verzamelTaken()` of in `SPEL_SLEUTELS`.

Niet opgenomen (bewust, een vervolg): de eierballen, de acht geheimen van `geheimen.js`, de uitdagingen na het verhaal (alleen zichtbaar
na het verhaal), de lucht (helikoptervluchten hebben geen vaste plek) en de Ommelanddorpsuitjes.

## Hoe het telt

Het spel meldt wat je deed met een **sleutel** (`m:`, `u:`, `s:`, `v:` plus id). De taak met die sleutel die het dichtst bij de speler ligt
is gedaan (`kiesTaak`): een teller als `kartRaces` telt zo de baan waar je op staat. Haken (allemaal klein, op de plek die al bestond):

- `loopbaanlive.loopbaanTel`: elke plek met een `uniek`-id (bijbanen, padelbanen, kart, regatta, botsauto, carbid).
- `loopbaanlive.loopbaanOpStat`: elke teller van de prestaties, ook die geen vak hebben (`recordStat`).
- `achievements.recordUnique` (`setUniekListener`): vondsten en geheimen.
- `achievementtracker.updateAchievementTracker`: de klaar-missies van deze save, om de 4 s.
- Cheats blokkeren het tellen net als bij de prestaties (`achievementsGated`).

Een taak zonder gebied (een plek in zee, of een provincie die nog niet geladen is) wordt toch onthouden en telt mee zodra er een gebied omheen komt.

## Opslag, migratie en samen spelen

Het profiel (`gedaan`: de id's van de taken, `beloond`: de gebieden met hun titel) staat per speler in de eigen sleutel `gde-gebieden-v1`
(`KEYS.gebieden`), nooit in een savegame: wie samen speelt neemt zijn gebieden mee naar elke wereld. Schrijven gebeurt vertraagd (1,5 s) en
voegt een tweede tabblad samen (`voegSamen`: wat in een van beide gedaan is, is gedaan). `normaliseer` maakt van kapotte, lege of oude
opslag een geldig profiel; een nieuwe versie van het formaat verhoogt `SLEUTEL_VERSIE`.

**Een nieuwe sleutel** (wie al lang speelt) wordt eenmalig gezaaid met wat het spel al wist: klaar-missies, de plekken uit de loopbaan, de tellers en de
gevonden dingen. Een teller zonder plek ("1x discgolf gespeeld") zaait alle plekken met die teller. Een gebied dat daardoor klaar is krijgt zijn
titel maar geen geld (anders krijgt een oude speler een stapel prijzen in één keer). Hetzelfde geldt voor een gebied dat pas klaar blijkt als de
indeling later groter wordt.

**Samen spelen:** elke speler telt op zijn eigen apparaat. Een gast draait `updateGameplay` niet, dus zijn missies en bijbanen komen alleen binnen
via wat hij zelf doet (een vondst, een plek). De beloning is voor de eigen portemonnee en wordt niet gedeeld (`coopDeel` doet hier niets).

## Bekende grenzen

- De catalogus is wat er nu in de code ligt. Komt er een nieuwe missie of baan bij, dan krijgt een gebied er een taak bij: een eerder veroverd gebied blijft veroverd (de titel blijft), maar de balk laat dan een nieuwe taak zien.
- De minimap kent de laag niet; alleen de grote kaart.
- Wijken zijn geen echte vlakken: de kaart tekent een schijf op het wijkpunt (de helft van de afstand tot de buur, 180 tot 700 m). Het zijn de gebieden van het HUD, niet de grenzen van het CBS.
- Er is geen aparte cutscène bij een veroverd gebied: een kaartje met titel, grapje en geld, en een vlag op de kaart.
- Niet door een mens in beeld bekeken; zie de beeldcheck in het issue.
