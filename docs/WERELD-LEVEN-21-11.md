# Wereld levend: dagelijkse evenementen en dierenleven (21-11)

Epic [#1181](https://github.com/NatusPella/GDE-Groningen/issues/1181). Groningen krijgt per kalenderdag evenementen en dierenleven, volledig afgeleid van de kalenderdag en de klok, binnen een vast beeldbudget.

## Hoe het werkt

`game/js/worldlife.js` is puur (geen THREE, geen toevalsbron, geen netwerk): `lifeEvents(dag, uur)` zegt wat er loopt (goedkoop, voor tests en kaarten), `lifeRoster(dag, uur, near)` geeft de acteurs met hun vaste plek (zwaar, wordt per dag en tien minuten gecached), `lifePose(acteur, tSec)` geeft de houding van dit moment (goedkoop, elke frame) en `lifeSpeakers` kiest hoogstens twee bubbels vlak bij de speler. `worldlife3d.js` tekent het, `worldlifelines.js` bevat de regels als data. `weather.js` roept `updateWorldLife` aan in de bestaande renderlus.

| Evenement | Plek | Wanneer (dag en klok) |
|---|---|---|
| Markt (kooplui, voetgangers, toeristen) | Vismarkt | dinsdag, vrijdag, zaterdag (de kalender), 8 tot 17 uur |
| Straatartiest met publiek | Grote Markt | op ongeveer 60% van de dagen, drie uur op een vast uur tussen 11 en 17 |
| Fotograferende toeristen | Grote Markt | op ongeveer 85% van de dagen, 10 tot 18 uur |
| Studentenfeest | Noorderplantsoen | vooral do, vr, za, 20 uur tot 02 uur (loopt door na middernacht op het plan van de dag ervoor) |
| Kermis (zweefmolen en bezoekers) | Nieuwe Markt | blokken van drie dagen, 14 tot 23.30 uur |
| Wandelgroep | Noorderplantsoen | op ongeveer 55% van de dagen, 2,5 uur in de ochtend |
| Hardlopers | Noorderplantsoen | 6 tot 9 en 17.30 tot 20 uur |
| Eenden (soms met kleintjes), schapen | Noorderplantsoen | overdag, aantal per dag |
| Duiven, zwaluwen | Grote Markt en Vismarkt | overdag; zwaluwen alleen op mooie dagen |

Het aantal figuranten groeit en krimpt zacht aan de randen van het tijdvenster (een half uur) en volgt de zomerlaag van het weer (`summerday.js`): bij regen blijven artiest, wandelgroep en zwaluwen weg en is het elders rustiger; de kleding krijgt `hot` en `rain` mee.

**Hergebruik.** De rollen zijn de rolnamen van de NPC-kleding (`winkelier`, `voetganger`, `toerist`, `student`, `feestganger`, `wandelaar`, `sporter`); de kleur van een figurant komt uit `npcOutfit(zaad, rol, ctx)`, dus uit dezelfde rolpools en dezelfde stemmingen als elke voetganger, en is bij elke speler gelijk. Het weer komt van de zomerlaag. Geen eigen kledinglijst.

**Bubbels.** Korte regels per evenement (`worldlifelines.js`), hoogstens twee tegelijk, alleen binnen 16 m (dieren 6 m), als DOM-bel via `world.extraSpeakers` (0 draw calls, dezelfde bellen als boten en zwemmers). De regels zijn Nederlands, luchtig, Gronings in kleine doses ("moi", "kiek", "joh"), zonder echte merken of personen en zonder leed. De mensenregels staan in de stemlijst (`scripts/voicelines_collect.mjs`, gebied "Wereld levend", wachtend op opname in `scripts/voice_wacht.json`); de dierengeluiden zijn alleen tekst.

## Budget

`LIFE_LIMITS` in `worldlife.js`: drie InstancedMesh-objecten (lichamen, hoofden, dieren) dus drie extra draw calls, hoogstens 96 mensen en 64 dieren, twee bubbels. De buffers hebben die limiet als vaste grootte; verder dan 230 m wordt niets getekend en bij geen enkele acteur in de buurt staat de groep op onzichtbaar (0 draw calls). `scripts/worldlife_test.mjs` bewaakt het plafond over 90 dagen en elk half uur.

## Samen spelen

De regel (ook in `docs/COOP-GAST.md` en `scripts/coop_coverage.json`): de evenementen zijn een pure functie van dag en klok. De gast leeft op de dag en klok van de gastheer en rekent het zelf uit, dus geen bericht en geen netwerkverkeer; wie later aansluit of gastheer wordt ziet dezelfde plekken en aantallen. Het lopen en de bubbels gebruiken een lokale animatietijd en zijn decor per speler. Er is geen voortgang of beloning, en de figuranten zijn geen doelwit.

## Tests

`scripts/worldlife_test.mjs` (puur: determinisme per dag en klok, variatie per dag, marktdagen volgens de kalender, studentenfeest na middernacht, regen en zwaluwen, het plafond, houdingen binnen hun plek, rolpools, bubbels, regels zonder merken, winter of leed, geen toeval of netwerk in de bron) en `scripts/worldlife3d_test.mjs` (drie InstancedMesh-objecten, limieten en bubbels met de gebundelde three; slaat zichzelf over zonder `desktop/vendor-cache`).

## Nog niet bekeken

Niets is in beeld of in Electron bekeken: de poppetjes (cilinder met bol), de plekken (alleen de middelpunten van `cityprops.js` en `parkplekken.js`, niet gecontroleerd op gebouwen, water of gras in de echte kaart; de vijver, het grasveld en de zweefmolen zijn verschuivingen van die middelpunten), het uiterlijk van de dieren en de bubbels zijn alleen met tests en code gecontroleerd. Het zijn voorlopige vormen; echte modellen en plekken per evenement volgen in een vervolg (label hertest). Tegen dubbele figuranten: de markt van `cityprops.js` (kooplui met eigen regels) blijft naast deze laag bestaan; samenvoegen is een vervolg.
