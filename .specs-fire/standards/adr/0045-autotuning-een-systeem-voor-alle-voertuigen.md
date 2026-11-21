# 0045 - Autotuning: één uiterlijk-systeem voor alle voertuigen, als overlay op het bestaande model

- **Status:** aangenomen (eigenaarswens 21-11-2026, epic #1155)
- **Datum:** 2026-11-21
- **Spec:** `docs/TUNING-21-11.md`, `.specs-fire/standards/mechanica.md`
- **Verwant:** ADR 0040 (DS3), `docs/COOP-GAST.md`, `docs/PERF-RENDER-21-11.md`

## Context

De eigenaar wil in alle garages auto's kunnen pimpen en soms gepimpte auto's in de wereld zien, maar niet te veel. Er bestond al onderdelen-tuning met prestatie-effect (`tuningplan.js`, `gde-tuning-v1`), lak (Spuit & Klaar) en upgrades (`shops.js`). Voertuigmodellen zijn gedeelde, gecachte geometrieën; geparkeerde auto's worden per blok van 64 m samengevoegd; wielen worden geïnstantieerd.

## Besluit

1. **Eén uiterlijk-systeem voor alle voertuigtypen** (auto, snackwagen, tweewieler, bus van de speler, boot), met per soort een lijst toegestane velden (`vehiclelook.js` KIND_FIELDS). Een NPC-bus, politie, ambulance, wrak en trekker zijn niet te pimpen.
2. **Een overlay, geen nieuw model.** `vehiclelook3d.js` zet na `buildVehicleMesh` hoogstens één samengevoegde kindmesh (vertexkleuren en één gedeelde atlas) op de romp, plus een underglow-vlak (alleen 's nachts), bakkenlichten en een nummerbord; velgen en banden zijn een andere gedeelde wielgeometrie zonder extra drawcall. De lak en de afwerking raken alleen de materialen van dat ene voertuig.
3. **Aparte opslag `gde-tuninglook-v1`** (per speler, niet in de savegame) met een compacte code `L1...` per voertuig en tot drie builds. De onderdelen-opslag `gde-tuning-v1` blijft ongewijzigd; `ophanging` is een nieuw onderdeel met begrensd effect (`draai` 0,90 tot 1,08; `grip` hoogstens 1,25).
4. **Wereld:** een deterministische generator (`generateLook(zaad, stijl)`) met harde grenzen: hoogstens 5% van verkeer en vakken, nooit op het platteland, hoogstens 8 gepimpte rijdende auto's tegelijk en 6 zichtbare underglows. Geen echte lichten, geen extra simulatie.
5. **Samen spelen:** de look reist als optionele korte code (`tune`) in het uiterlijkrecord en `tuning` in het bezorgbericht; PROTO blijft 2; kopen blijft in je eigen spel.
6. **Politie:** een gepimpte auto is nooit een reden voor aandacht. De bestaande `opvallend`-waarde (uitlaat en geluid) blijft de enige koppeling met de politie.

## Afgewezen

- **Per tuningcombinatie een eigen gebouwd model:** onbeheersbaar veel geometrie en cache.
- **Dynamische lichten voor underglow:** raakt het lichtbudget; een emissief vlak is gratis genoeg.
- **De look in de savegame:** raakt slots en migraties; een losse sleutel kan niet stukgaan door de save.
- **Een groot aandeel in de wereld (10% of meer):** het is een garnering, geen thema van de stad.
- **Vrije tekst voor beletteringen en kentekens:** echte kentekens en merken zouden binnenkomen; het nummerbord is verzonnen tekst met filter, de snackwagen kiest uit verzonnen namen.
