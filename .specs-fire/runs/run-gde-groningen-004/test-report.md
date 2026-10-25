# Testrapport — wi-434-rest

De drie punten die in #434 open bleven:

- **Springen op een autodak** — opgelost in de perch-wijziging: een sprong op een dak of dek is nu een afstapje (PERCH_HOP_SPEED 1,5 m/s) in plaats van een volle sprong. Bewijs: scripts/perch_test.mjs 26/26, vault_test groen.
- **Treinpaneel midden op het perron** — niet reproduceerbaar uit de code: het cabinebord is een HUD-element dat alleen in de cabine verschijnt; er is geen wereldpaneel op het perron. Geen wijziging.
- **Opening die onder belasting bevriest** — alleen met de Electron-verhaaltest te reproduceren; die draait de coördinator bij de release. Hier niet gedraaid.

Conclusie: één punt opgelost en gedekt, één punt weerlegd met brononderzoek, één punt wacht op de Electron-poort.
