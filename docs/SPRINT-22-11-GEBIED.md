# Sprint 22-11: graphics, materialen en detail

Branch `sprint-graphics-materialen-22-11`. Alleen lokaal beeld; bij Samen spelen bouwt en ziet elke speler zijn eigen wereld uit dezelfde data, er gaat niets over het net.

## Gedaan

| Onderdeel | Voor | Na | Test |
| --- | --- | --- | --- |
| Brug- en viaductonderkant (#1192, #919) | onderkant en plaat onder een verhoogde weg in hetzelfde `concrete`-materiaal als de zijkanten, zonder zon: een egaal donker vlak | eigen materiaal `soffit` (lichter beton, eigenlicht) voor de onderkant van het dek en de plaat onder een verhoogde weg (`game/js/roadstructures3d.js`) | `scripts/brugonderkant_test.mjs` |
| Anisotropie (textuurresolutie) | canvastexturen zonder opgave hadden anisotropie 1 (65 aanroepen van `canvasTex`); wegatlas 4 | standaard 4 in `canvastex.js` (`DEFAULT_ANISOTROPY`), wegmarkering 8 | `scripts/canvastex_aniso_test.mjs` |

## Bekeken met tellingen, niet gewijzigd

- `gfx_budget_test`, `roadstructure_dispose_test`, `borden_test`, `tegellezers_test` blijven groen; geen nieuwe draw calls (de onderkant is een extra part per brugweg, dezelfde mesh-opbouw als `tunnel`).
- Z-fight-audit (`scripts/zfight_audit.mjs`) op de echte kaart is gestart; zie het issuecomment voor de uitkomst als die op tijd klaar was.

## Niet gedaan (te groot of niet te toetsen zonder Electron)

- Windzwaai van boomkruinen (gras heeft het al in `grass.js`; bomen niet): vraagt een shaderpatch op de instance-materialen in `countryside.js`.
- Gevelvariatie, schoorstenen, putdeksels, voetpadslijtage en props-dichtheid: geen meting zonder wereldbouw.

## Nog niet bekeken in beeld

- Onderkant van een viaduct (Rijksweg) en een brug over water: leest het als beton in de schaduw, niet te licht of te vlak? Kijk bij overdag en 's nachts (eigenlicht blijft dan staan; als het 's nachts te licht oogt, dempen met de zonnestand).
- Wegmarkering op schuine hoek ver weg (zebrapad, fietssymbool): scherper en zonder flikker?
- Mogelijk verschil in framekosten door anisotropie 4 op alle canvastexturen: meten met de perf-sonde.
