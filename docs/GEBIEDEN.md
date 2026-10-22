# Gebieden veroveren: de hele provincie, van buurt tot gemeente (#414)

Voor wie aan `gebieden.js`, `grenzen.js`, `gebiedenlive.js`, `gebiedenbronnen.js`, `gebiedenui.js`, `gebiedenkaart.js`, `safehuizen.js` of de grenzenscripts werkt,
of een nieuwe plek met iets te doen toevoegt.
Tests: `scripts/gebieden_test.mjs`, `scripts/grenzen_test.mjs`. Beeldcheck: `scripts/qa/gebieden_shots.mjs`.

## Wat de speler ziet

- **Pauzemenu › Loopbaan › Veroverd** (naast het tabblad Vakken): links alle te veroveren gebieden in vijf lagen (provincie, gemeenten, woonplaatsen, wijken, buurten) met
  een balk en "3 van 5"; rechts wat er in het gekozen gebied te doen is, per soort (missies, bijbanen, minigames, vondsten, geheimen), met een vinkje voor wat je al deed,
  en bovenaan waar het gebied in ligt (Groningen › Centrum › Binnenstad). Het safehouse van het gebied staat eronder.
- **Kaart › laag Veroverd** (legenda: Veroverd, standaard aan): de **echte grenzen**. Welke laag je ziet hangt van de zoom: de laag waarvan de gebieden ongeveer een handpalm
  groot in beeld staan, met de grenzen van de laag erboven dikker. Wat je aan het doen bent kleurt mee (van oker naar groen, met de naam en "3/5" erbij); een gebied dat
  helemaal gedaan is krijgt de kleur van zijn vlag, een vlag en zijn titel bij het aanwijzen.
- **Bij de laatste taak**: een kaartje met de titel, een grapje en het geld, één keer per gebied. Onderweg meldt een klein kaartje "3 van 5 gedaan" voor het kleinste gebied
  dat te veroveren is.
- **De hele provincie**: alles wat er in de provincie te doen is gedaan, is "de hele kaart veroverd": de titel **Provinciebaas van Grunn**.

Veroveren is satire: je neemt een buurt over met werk en service. Er is geen geweld en niemand verliest iets.

| Laag | Beloning | Titel | Vlag |
|---|---|---|---|
| Buurt | €80 | Buurtheld van *naam* | bruin |
| Wijk | €150 | Wijkheld van *naam* | oker |
| Woonplaats | €400 | Burgemeester van *naam* | zeegroen |
| Gemeente | €1500 | Gemeentebaas van *naam* | rood |
| Provincie | €10000 | Provinciebaas van Grunn | paars |

Alle titels zijn verzonnen (constitution 2). Een gebied met minder dan twee dingen te doen (`MIN_TAKEN`) is niet te veroveren en staat niet in het overzicht; de dingen erin tellen
wel mee voor de gebieden erboven. Een gebied telt alles wat erin ligt: een gemeente telt wat in haar woonplaatsen en wijken ligt, de provincie alles.

## De grenzen: bronnen, pijplijn en formaat

| Laag | Bron (allemaal open, via PDOK) | Licentie |
|---|---|---|
| Provincie en gemeenten | Kadaster, Bestuurlijke Gebieden (`provinciegebied`, `gemeentegebied`) | CC BY 4.0 |
| Woonplaatsen | Kadaster, BAG `woonplaats` | Public Domain Mark 1.0 |
| Wijken en buurten | CBS, Gebiedsindelingen (`wijk_gegeneraliseerd`, `buurt_gegeneraliseerd`, jaarcode 2025) | CC BY 4.0 |

Vermelding: aftiteling en Over (`game/js/credits.js`), `NOTICE.md`, `docs/LICENTIES.md`. Het spel zelf gebruikt **geen netwerk** voor de grenzen.

1. `node scripts/world/fetch_grenzen.mjs --haal-op` (op verzoek; zonder vlag toont het alleen wat het zou ophalen) haalt de ruwe grenzen in RD New (EPSG:28992, de
   OGC API's geven die rechtstreeks) naar `data/cache/grenzen/` (niet in git): 1 provincie, 10 gemeenten, 202 woonplaatsen, 123 wijken en 644 buurten van de provincie Groningen
   (peiljaar 2025), samen ongeveer 5 MB.
2. `node scripts/world/grenzen.mjs` maakt er `game/grenzen.json` van (353 KB, wel in git, zoals `facilities.json`): naar het spelframe (`rdnew.js rdToWorld`), vereenvoudigd
   (Douglas-Peucker, 10 tot 40 m per laag), kleine eilandjes en gaatjes weg, op hele meters afgerond, ringen als verschillen, plus een binnenpunt per gebied, de gemeentecode en
   bij een buurt de wijk. Deterministisch: `grenzen_test.mjs` maakt het bestand opnieuw uit de cache en vergelijkt de bytes.
3. `game/js/grenzen.js` (puur) pakt het bestand uit en doet punt-in-polygoon (even-odd, gaten, omhullende doos). `gebiedenbronnen.js` laadt `grenzen.json` naast `index.html` (zoals
   `borderplaces.json`); mislukt dat, dan zijn er geen gebieden en blijven de taken bewaard.

De vereenvoudiging is niet topologisch: aan een gedeelde grens kunnen twee gebieden een paar meter overlappen of een smalle kier laten. Bij overlap wint het gebied met het
dichtstbijzijnde binnenpunt, bij een kier hoort een plek bij geen gebied van die laag. Het zijn geen officiële grenzen meer en niet bruikbaar voor juridische doeleinden (staat in `NOTICE.md`).
Woonplaatsen en gemeenten lopen ook over het water (Waddenzee, Lauwersmeer) zoals bij het Kadaster.

Het wijkpunten-model van de eerste versie (de 66 punten van `stad.json`, plaatsen uit `worldplaces.js` en de acht streken van `regioleven.js`) is vervangen; de streken blijven
bestaan voor het leven in de regio (evenementen, vondsten), maar zijn geen veroverlaag meer.

## Wat er te doen is (de catalogus)

`gebiedenbronnen.js` verzamelt het uit het spel, bij elke indeling opnieuw:

| Soort | Bron | Plek | Gedaan als |
|---|---|---|---|
| Missie | `getMissionList()` (de gebouwde missies van het verhaal) | de start | de missie klaar is (`m:<id>`; elke 4 s gekeken, en bij een nieuwe sleutel) |
| Bijbaan | `getSideJobList()` | de plek van de baan | een ronde klaar is (`u:<baan>`, via `loopbaanTel`) |
| Minigame | `activitySpots()` (activities.js) en de padelbanen | de plek | de teller van de prestaties telt (`s:<teller>`, bv. `discgolfRounds`) of de loopbaanplek meldt (`u:kart`, `u:<padelbaan>`) |
| Vondst, geheim | `FINDS` van `regioleven.js` | de plek van de vondst | de vondst is gevonden (`v:<id>`, via `recordUnique`) |

In de echte wereld: 151 dingen (30 missies, 39 bijbanen, 50 minigame-plekken, 24 vondsten, 8 geheimen). Welke minigames meetellen en bij welke teller staat in `SPEL_SLEUTELS`
(gebieden.js); `gebieden_test.mjs` controleert dat elke genoemde teller en plek echt ergens in de code geteld of gemeld wordt. Een nieuwe plek met iets te doen: een regel in
`verzamelTaken()` of in `SPEL_SLEUTELS`.

Niet opgenomen (bewust, een vervolg): de eierballen, de acht geheimen van `geheimen.js`, de uitdagingen na het verhaal (alleen zichtbaar na het verhaal), de lucht
(helikoptervluchten hebben geen vaste plek) en de Ommelanddorpsuitjes.

## Hoe het telt

Het spel meldt wat je deed met een **sleutel** (`m:`, `u:`, `s:`, `v:` plus id). De taak met die sleutel die het dichtst bij de speler ligt is gedaan (`kiesTaak`): een teller als
`kartRaces` telt zo de baan waar je op staat. Een plek hoort per laag bij het gebied waar ze in ligt (`gebiedenVan`). Haken (allemaal klein, op de plek die al bestond):

- `loopbaanlive.loopbaanTel`: elke plek met een `uniek`-id (bijbanen, padelbanen, kart, regatta, botsauto, carbid).
- `loopbaanlive.loopbaanOpStat`: elke teller van de prestaties, ook die geen vak hebben (`recordStat`).
- `achievements.recordUnique` (`setUniekListener`): vondsten en geheimen.
- `achievementtracker.updateAchievementTracker`: de klaar-missies van deze save, om de 4 s.
- Cheats blokkeren het tellen net als bij de prestaties (`achievementsGated`).

Een taak zonder gebied (een plek in zee, of grenzen die nog niet geladen zijn) wordt toch onthouden en telt mee zodra er een gebied omheen komt.

## Opslag, migratie en samen spelen

Het profiel (`gedaan`: de id's van de taken, `beloond`: de gebieden met hun titel, `huizen`) staat per speler in de eigen sleutel `gde-gebieden-v1` (`KEYS.gebieden`), nooit in een
savegame: wie samen speelt neemt zijn gebieden mee naar elke wereld. Schrijven gebeurt vertraagd (1,5 s) en voegt een tweede tabblad samen (`voegSamen`). `normaliseer` maakt
van kapotte, lege of oude opslag een geldig profiel.

**Versie 2** (`SLEUTEL_VERSIE`) hoort bij de echte grenzen. Een profiel van de eerste versie (wijkpunten, plaatsen en streken, alleen bij testers) houdt wat je deed (`gedaan`: de
taken blijven gelijk) maar zijn gebieden, titels en huizen vervallen, want die bestaan niet meer; `zaad` gaat uit, dus de nieuwe indeling zaait opnieuw: wat al helemaal gedaan
is krijgt zijn titel en huis (zonder geld). Een gekocht huis uit de eerste versie wordt niet terugbetaald (het was nooit uitgebracht).

**Een nieuwe sleutel** (wie al lang speelt) wordt eenmalig gezaaid met wat het spel al wist: klaar-missies, de plekken uit de loopbaan, de tellers en de gevonden dingen. Een teller
zonder plek ("1x discgolf gespeeld") zaait alle plekken met die teller. Een gebied dat daardoor klaar is krijgt zijn titel maar geen geld (anders krijgt een oude speler een stapel
prijzen in één keer). Hetzelfde geldt voor een gebied dat pas klaar blijkt als de indeling later verandert.

**Samen spelen:** elke speler telt op zijn eigen apparaat. Een gast draait `updateGameplay` niet, dus zijn missies en bijbanen komen alleen binnen via wat hij zelf doet (een vondst,
een plek). De beloning is voor de eigen portemonnee en wordt niet gedeeld (`coopDeel` doet hier niets).

## Safehouses

In elke veroverbare **wijk en woonplaats** (buurten, gemeenten en de provincie niet) staat één verzonnen woning, bij het binnenpunt van het gebied (22 m ernaast, op open begaanbare
grond, met de voorkant naar de dichtstbijzijnde weg; de plek wordt vastgezet zodra je binnen 200 m komt, als de tegels er zijn). Adres en makelaar komen uit een lijst verzonnen straten en
kantoren in `gebieden.js` en blijven voor een gebied altijd dezelfde. `safehuizen.js` is de activiteit (`SAFEHUIS` in `activities.js`): prompt, E, kaart en minimap lopen via de bestaande
activiteitenlaag, met een eigen laag `safehuis` en een eigen legenda-regel.

- **Krijgen of kopen:** een gebied helemaal gedaan geeft de sleutel cadeau (bij de titel en het geld). Kopen kan altijd: wijk €1800, woonplaats €4200, tot de helft korting naarmate je meer
  in het gebied deed (`huisPrijs`). Eigendom staat in `huizen` van het profiel; een gekocht huis wordt bij veroveren niet nog eens gegeven.
- **Wat erin kan** (E bij de deur, een menu zoals de rest van de winkels en het bed): slapen tot ochtend, middag, avond of nacht en opslaan (zelfde regels als het bed thuis: volle
  gezondheid, `slept`-teller, `saveGame`); de kledingkast van thuis (`wardrobeMenu`); je voertuigen voor de deur laten zetten (`spawnOwnedEntry`, ook kwijtgeraakte); onderduiken als je
  gezocht wordt (gezocht-niveau op nul en de klok 3 tot 1 uur door: hoe beter ingericht, hoe korter); de deur is dicht als de politie je op dat moment ziet (zoals bij de winkels).
  Binnen kom je niet: het is een huisje met een deur en geen eigen verdieping.
- **Snelreisanker:** Pauzemenu › Loopbaan › Veroverd › het gebied › **Reis erheen**. Dat is `w.cheatActions.teleport` met alle bewakers van de kaartteleport: niet in een missie of filmpje,
  niet met de politie op je hielen, niet op het water; ligt de plek ver weg, dan laadt het spel eerst de tegels.
- **Inrichting** (vijf stappen, `inrichting()`): vanaf het begin, 25%, 50%, 75% en als het gebied helemaal gedaan is. Het huisje buiten groeit mee (een bankje, een plantenbak) en wie hem
  bezit krijgt een vlag in de kleur van de laag op het dak.
- **Samen spelen:** huisjes staan op dezelfde plek voor iedereen in dezelfde wereld; wat je bezit is van jou (eigen profiel). Een ander kan het huisje zien en er langs lopen, maar de deur
  gaat alleen open voor de eigenaar met zijn eigen menu (een koper-menu voor wie het niet heeft). Gasten en gastheer kopen dus elk hun eigen sleutel. **Bezoeken bij een ander** (binnen kijken in
  het huisje van een medespeler) is niet gedaan.

## Bekende grenzen

- De catalogus is wat er nu in de code ligt. Komt er een nieuwe missie of baan bij, dan krijgt een gebied er een taak bij: een eerder veroverd gebied blijft veroverd (de titel blijft), maar de balk laat dan een nieuwe taak zien.
- De minimap kent de laag niet; alleen de grote kaart.
- De meeste buurten en wijken buiten de stad hebben niets te doen: het overzicht toont alleen gebieden met minstens twee dingen. Het veroveren van de hele provincie loopt dus via de grote lagen.
- Er is geen aparte cutscène bij een veroverd gebied: een kaartje met titel, grapje en geld, en een vlag op de kaart.
- Een safehouse heeft geen binnenkant en geen bezoek van medespelers; de inrichting is buiten te zien en in het menu te lezen.
- Het binnenpunt van een woonplaats of wijk kan in het water vallen (Delfzijl ligt deels in de Eems): bij het plaatsen zoekt het spel in ringen tot 1,8 km naar droge, open grond. Vindt het die niet, dan is dat huisje onbruikbaar (geen deur, geen reizen). Het kaartpictogram staat tot de plek vastgezet is (binnen 200 m) nog op het binnenpunt.
- Peiljaar 2025: nieuwe gemeentelijke herindelingen komen pas mee na een nieuwe `fetch_grenzen.mjs --haal-op`, `grenzen.mjs` en een commit van `game/grenzen.json`.
