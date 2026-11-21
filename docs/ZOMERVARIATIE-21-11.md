# Zomervariatie per kalenderdag (21-11)

Besluit van de eigenaar (21-11): het blijft altijd zomer (constitution 3), maar met variatie. Geen sneeuw, ijs, vorst of winterlicht; wel hitte, bewolkte dagen, zomerbuien met donder, ochtendmist boven de weilanden, een regenboog na een bui, bries op de Waddenzeekust en warme avonden met vliegjes en gloed.

## Hoe het werkt

`game/js/summerday.js` is een pure functie van de kalenderdag en de klok (`summerLayer(day, hour)`): geen THREE, geen toevalsbron, geen netwerkverkeer. Zes soorten dag (helder, hitte, bewolkt, bui, bries, zacht) met per soort een temperatuur (nooit onder 14 graden), een buiuur, kans op onweer (regen hoogstens 0,85, geen storm), ochtendmist (alleen vóór de middag, op de zon), een regenboog (alleen kort na een bui, zon tussen 2 en 42 graden), wind (op de kust, regio noord, sterker) en een warme avond (gloed en vliegjes, alleen als het droog en niet bewolkt is).

De laag komt **bovenop** de weermachine (`weatherstate.js`, toevallig en door de gastheer gemeld): `combineSummer` neemt het grootste van machine en dag, en dempt de toevallige bui op een hitte-dag. `weather.js` (`followRegionWeather`) zet het resultaat in `world.weather` en de laag zelf in `world.weather.summer`.

| Effect | Waar |
|---|---|
| Regen, donder, mist, bewolking | via `world.weather` (`intensity`, `kind: 'onweer'`, `mist`, `overcast`); de bestaande geluiden (`sfx/weermap.js`: regenlussen en donder) volgen vanzelf, geen nieuwe sfx-sleutels |
| Regenboog | de bestaande uniform `uRainbow` van de lucht (`weather.js`), 0 extra draw calls |
| Hitte en warme avond in de wereldkleur | `worldgrade.js` (`GRADE_WEATHER.hitte` en `.gloed`): een warmer papierlicht via de inkten van het designsysteem; Wereldkleur Uit blijft neutraal, Subtiel en Drukwerk gebruiken hun eigen sterkte; Laag heeft geen grade-pass |
| Vliegjes | `summerflies3d.js`: één Points-object, hoogstens 120 punten, alleen in de avond |
| Wind op de kust | `world.weather.windStrength` laat het gras (`grass.js`) iets meer wuiven |
| Mensen | voetgangers die na het begin van een hete of heldere dag verschijnen dragen vaker een zonnebril (`setPeopleWeather` in `models3d_people.js`); paraplu en schuilen volgen de bestaande regenregels (paraplu's boven regen 0,35, minder voetgangers bij nat, `simlagen.js`); `npcSummerBehaviour` is de pure regel |

## Samen spelen

Het weer van de dag is een pure functie van kalenderdag en klok, dus voor iedereen gelijk zonder extra bericht: de gast leeft op de dag en klok van de gastheer (`net/speelklok.js`) en rekent de laag zelf uit. De toevallige weermachine blijft de gastheer melden (`coopweer.js`); de laag past er bij elke speler hetzelfde op toe. Wie later aansluit, krijgt de juiste lucht meteen. Test: `scripts/summerday_test.mjs` (determinisme per dag en klok).

## Budget en bewaking

`SUMMER_LIMITS` in `summerday.js`: hoogstens 2 extra draw calls (nu 1: de vliegjes), 120 vliegjes, nooit onder 14 graden, regen hoogstens 0,85. `scripts/summerday_test.mjs` bewaakt determinisme, variatie (elk soort komt voor, regenboog, mist, onweer, vliegjes), constitution 3 (geen winterwoorden in de bron, alle waarden binnen zomergrenzen, alleen bekende weersoorten, wereldkleur in alle drie de standen) en het beeldbudget.

Nog niet in beeld bekeken: de vliegjes, de gloed en de regenboog na een dagbui zijn alleen met tests en code gecontroleerd, niet in Electron.
