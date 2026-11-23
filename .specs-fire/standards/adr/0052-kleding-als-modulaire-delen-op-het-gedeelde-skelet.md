# 0052 - Kleding als modulaire delen op het gedeelde skelet

- **Status:** besloten (wens eigenaar 23-11-2026); gebouwd achter `?mensen=q|q2|q3`
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
- **Saves:** de vertaling naar delen gebeurt bij het bouwen (`modularlooks.js`, uit dezelfde appearance die `clothing.js outfitToLook` al maakte). Kledingkeuzes, presets, saves en kledingcodes blijven precies wat ze waren: geen migratie nodig, niets kan breken (`scripts/modularlooks_test.mjs`).
- **Samen spelen:** alleen de kledingcodes gaan over het netwerk, zoals nu.

## Afgewezen

- **Het oude procedurele kledingsysteem op het nieuwe skelet hangen:** de vormen zijn gemaakt voor 13 scharnierbotten en een ander silhouet; ze zouden door de nieuwe lijven heen steken.
- **Een materiaal per kledingstuk:** zes tot tien draw calls per mens, te duur voor een menigte.
- **Hele figuren uit het pack zonder mix en match:** 13 looks voor een hele stad is te weinig, en onze personages moeten herkenbaar blijven.

## Gevolgen

Gebouwd: voorbijgangers krijgen per zaad hoofd, romp, benen en voeten (gewogen naar een gewone straat). De vaste looks (Tammo, Tessa, Jelle, bijrollen) en de hele catalogus (348 stukken, alle kapsels en lichamen) gaan via `modularlooks.js` naar de delen. Een pet of muts is een eigen deel op het hoofdbot; het haar eronder gaat binnen de koepel. In de spelerfase bouwt `buildPersonMesh` Tammo en Tessa overal modulair (kast, pashokje, winkel, medespelers). Nog niet: eigen delen voor wat het pack mist (rok bij mannen, kaal hoofd, sjaal, tas, bril, sieraden, voetbalpatronen en rugnummer, feesthoeden); die vallen nu terug op het dichtstbijzijnde deel. `scripts/seat_audit.mjs --modulair` controleert de stoelen.

**Aanvulling 23-11 (kledingdelen die het pack niet heeft):** wat ontbreekt (politiepet, de details van een uniform) staat als kledingdeel in een register met een kwaliteitsnorm (`game/js/modularwear.js` WEAR_REGISTER, zoals `propregister.js` voor props: driehoeken, kleuren, maat en eisen), hangt aan één bot van het gedeelde skelet en ligt op het profiel van de stof van de look. Agenten zijn daarmee modulair: uniformjas (Suit_Body), pantalon en nette schoenen in het korpsblauw, plus politiepet en uniformdetails (reflectiebanden, koppel met holster, epauletten, embleem, naamplaatje). Getoetst door `scripts/modularwear_test.mjs`; beeld in `scripts/qa/mensen_uniform.html`.
