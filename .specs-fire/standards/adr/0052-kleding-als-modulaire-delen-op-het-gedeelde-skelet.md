# 0052 - Kleding als modulaire delen op het gedeelde skelet

- **Status:** voorgesteld (wens eigenaar 23-11-2026); fase 1 (voorbijgangers) gebouwd
- **Datum:** 23-11-2026
- **Spec:** `.specs-fire/standards/wereld.md` (mensen), `game/js/modularpeople.js`, `game/js/clothing.js`
- **Verwant:** ADR 0050 (modulaire mensen), ADR 0051 (state-machine)

## Context

Het kledingsysteem bouwde kleding als vormen op het eigen procedurele lijf (`models3d_people.js`, `clothing.js`, `models3d_clothing.js`, `clothinghair.js`). Met de Quaternius-mensen als nieuwe basis (ADR 0050) komt de kleding uit hun losse delen: hoofd (met haar), romp, benen en voeten, allemaal op hetzelfde skelet.

## Besluit

- **Zones:** hoofd/haar, hoofddeksel, bovenlijf, jas of laag, onderlijf, schoenen en accessoires. Elke zone is een deel op het gedeelde skelet, uit het pack of eigen gemaakt op hetzelfde niveau, geregistreerd in één register. Kapsel en hoofddeksel zijn los: onder een pet hoort een plat kapsel.
- **Eén draw call:** bij het aankleden gaan de delen samen in één SkinnedMesh met één materiaal. Kleur en patroon per stuk komen uit een paletindex per vertex (het pack noemt zijn materialen: Skin, Hair, Shirt-achtige namen), dus geen materiaal of draw call per kledingstuk.
- **Mix en match** voor alle geslachten en lichaamsbouwen binnen een rig (man en vrouw hebben elk een eigen skelet in rust; een deel moet bij de rig passen of omgezet worden).
- **Bestaande catalogus:** winkels, kledingkast, pashokje, kledingpreview, loopbaan- en rolkleding, uniformen, voetbalkleding en de vaste looks van Tammo, Tessa en Jelle worden gemapt op de nieuwe delen. Wat ontbreekt, wordt gemaakt en geregistreerd.
- **Saves:** een migratie vertaalt oude kledingkeuzes naar de nieuwe delen. Oude codes blijven leesbaar en een save breekt nooit (savemigrate-tests).
- **Samen spelen:** alleen de kledingcodes gaan over het netwerk, zoals nu.

## Afgewezen

- **Het oude procedurele kledingsysteem op het nieuwe skelet hangen:** de vormen zijn gemaakt voor 13 scharnierbotten en een ander silhouet; ze zouden door de nieuwe lijven heen steken.
- **Een materiaal per kledingstuk:** zes tot tien draw calls per mens, te duur voor een menigte.
- **Hele figuren uit het pack zonder mix en match:** 13 looks voor een hele stad is te weinig, en onze personages moeten herkenbaar blijven.

## Gevolgen

Fase 1 (gebouwd): voorbijgangers krijgen per zaad hoofd, romp, benen en voeten uit verschillende figuren van hun rig. Huid, haar, shirt en broek komen uit het palet. Het pashokje, de winkels, de catalogusmapping en de savemigratie volgen in de fasen cutscenes en speler, elk met een vergelijkingspagina en de clipping- en stoeltests op het nieuwe skelet.
