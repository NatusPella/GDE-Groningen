# Samen spelen: welk spel, wat wordt bewaard, de opening samen (#95)

Voor wie aan `lobby.js`, `samenpanel.js`, `startscreen.js`, `coopgate.js` of `coopcut.js` werkt.
Over de test: [COOP-TESTBANK.md](COOP-TESTBANK.md) (suite `opening`).

## De menustroom

Hoofdmenu → **Samen spelen** → een klein scherm (`samenkeuze.js`) met twee keuzes:

- **Een spel openen:** het scherm *Opgeslagen spellen* (`saveslotsui.js`, met eigen titel "Kies jullie spel"). Kies een opgeslagen
  spel en *Dit spel spelen*, of kies een lege plek voor een nieuw spel. Daarna opent het spel met de wachtkamer (de lobby, onderdeel
  *Samen spelen* van het pauzemenu) al op de keuze van de route (kamercode of IP-adres).
- **Meedoen:** het spel opent met de wachtkamer op "Aansluiten" (kamercode of IP-adres van wie het spel opende).
  Met een eigen opgeslagen spel gaat dat verder (het laatst gespeelde spel); zonder begint het een nieuw spel (zie de regel hieronder).

Het pauzemenu kent dezelfde wachtkamer nog steeds (onderdeel *Samen spelen*): midden in een spel iemand uitnodigen of aansluiten werkt zoals
voorheen.

## Welk spel wordt gespeeld

Het spel van **wie het opende** (intern de host). De wereld, het verhaal, de missies, de voertuigen en de klok zijn van hem; een gast speelt mee
in die wereld (`coopworld.js`, `coopnet.js`). Een gast speelt daarom nooit in zijn eigen verhaal tijdens het samen spelen.

## Wat bewaart de gast

De regel (één korte regel in de wachtkamer van de gast, `GAST_BEWAREN` in `lobby.js`):

> Tammo heeft het spel geopend. Je speelt mee in het spel van Tammo. Wat je verdient bewaren we in je eigen spel (<naam van je spel>); het verhaal en de wereld zijn van Tammo.

(In de tekst staat geen rolnaam: de speler die het spel opende heet bij zijn naam, de naam van zijn personage, en voor een onbekende "de ander"; `openerNaam` in `coopplayers.js`, `scripts/text_audit.mjs` regel `rolnaam`.)

Precies:

| Wat | Waar het blijft |
|---|---|
| Geld dat de host de gast geeft (beloningen na een missie) en wat de gast zelf verdient (`world.coopVerdiend`) | In het **actieve opgeslagen spel van de gast** (`saveGuestEarnings` in `savegame.js`, `applyGuestEarnings` in `coopsave.js`). Het geld is een geheel getal en nooit negatief. |
| Je loopbaan (niveaus en titels per vak, `docs/LOOPBAAN.md`) | **Van jou**, op je eigen apparaat (`gde-loopbaan-v1`), nooit in een opgeslagen spel. Wat je als gast verdient rekent met je eigen niveau; de punten gaan mee met de beloning. |
| Missies, verhaalstap, prestaties, voertuigen, winkelaankopen, de wereld, de klok | Van de **host**. Een gast bewaart niets daarvan (een gast slaat het spel van de host nooit over zijn eigen spel heen). |
| De rest van de eigen save van de gast (verhaal, woningen, prestaties) | Blijft precies zoals hij was; hij komt na het samen spelen terug waar hij was (`stopCoopNet` zet plek, personage en gezochtniveau terug). |

Heeft de gast nog **geen opgeslagen spel** (een nieuw profiel of een lege plek)? Dan bewaren we bij het aansluiten het begin van zijn eigen
spel (`samenpanel.js` `startClient`), zodat zijn beloningen een plek hebben. Het verhaal van de gast begint dus niet door mee te spelen; het
spel dat zo ontstaat is een gewone nieuwe save.

De host bewaart zoals altijd in zijn actieve opgeslagen spel; wat hij in het scherm *Opgeslagen spellen* koos is dat spel.

## De wachtkamer: het spel begint met minstens twee spelers

Kiest iemand in het hoofdmenu Samen spelen (een nieuw spel of een bestaand opgeslagen spel), dan begint het spel **niet**: de wachtkamer
staat open (`coopgate.js`; een gewone variabele, zodat een nieuw spel hem niet wist) en het verhaal wacht (`story.js` stap `opening`). De wereld is geladen,
maar niemand speelt: het pauzemenu met de wachtkamer blijft staan (sluit je het, dan komt het terug, `main.js`), er loopt geen tijd en geen verkeer.

- **Spel starten** is voor degene die het spel opende uitgeschakeld zolang je alleen bent, met de uitleg "Wacht op een medespeler: je kunt het spel starten zodra er minstens twee spelers zijn" (`MIN_SPELERS` in `lobby.js`; een speler met een weggevallen verbinding telt niet mee). Met twee of meer staat de knop aan.
- Een gast leest "Wacht tot Tammo het spel start." (de host stuurt het bericht `hek`, `coopnet.js`; een gast die later aansluit hoort het bij het aansluiten).
- Bij het starten (`openHek`) sluit het menu van iedereen tegelijk, het bericht `hek` (uit) gaat naar de gasten en de opening begint bij iedereen samen (zie hieronder).
- Wie stopt (Stoppen, Iedereen stoppen, Spel verlaten) of terugkeert naar het hoofdmenu, heeft geen wachtkamer meer en speelt weer zijn eigen spel.
- Valt iemand tijdens het spel weg, dan geldt de bestaande pauzeregel (het wachtscherm, `coophold.js`); wie later aansluit volgt de gewone aansluitregel: hij hoort dat het spel al begonnen is en speelt mee.

## De opening van een nieuw spel samen

Na **Spel starten** speelt de opening (alleen bij een nieuw spel), en iedereen kijkt mee:

- De host speelt een scène met `playScript` (`cutscenehost.js`). Elke scène die zo gespeeld wordt (de drie openingsscènes, de eindkaart
  van een deel, scènes in missies en bij Eikea) stuurt hij als data mee (`coopcut.js`: de beschrijving, de regels met stemmen, het anker en
  de titelkaart, in stukjes van 800 tekens omdat een bericht klein moet blijven).
- Elke gast speelt precies dezelfde scène in zijn eigen wereld, met zijn eigen camera, balken, ondertitels en stemmen. De laag
  "Tammo kijkt een filmpje. Je wacht even." (`coopscene.js`) staat dan uit.
- **Wachten op iedereen:** het spel begint pas op "Spel starten", dus alle aanwezige spelers zijn er al.
  Wie na het begin van een scène aansluit, ziet de scène niet meer (hij hoort wel dat de host een filmpje kijkt) en speelt vanaf de volgende mee.
- **Overslaan:** alleen de host (Spatie ingedrukt houden). De gast kan niet overslaan; als de host overslaat stopt de scène ook bij de gasten.
- Filmpjes zonder scènebeschrijving (een `playCinematic` met een eigen camerabaan: rondvluchten, de dood, mislukte missies) blijven de
  laag met balken en tekst bij de gast.

## Testen

`node scripts/coopcut_test.mjs` (de scène in stukjes door de echte codec, volgorde, slechte stukjes, wachtrij), `scripts/lobby_test.mjs`,
`scripts/textfield_test.mjs`. In Electron: `node scripts/coop/testbank.mjs --suite=opening` (host en gast in twee Electron-instanties,
zie COOP-TESTBANK.md).
