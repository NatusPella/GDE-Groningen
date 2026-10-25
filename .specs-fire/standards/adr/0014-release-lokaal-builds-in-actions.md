# 0014 - Release lokaal, builds in Actions, agents nooit

- **Status:** besloten
- **Datum:** 2026-10-25 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/publicatie.md`

## Context

De Windows-exe bouwt uit de wereld op deze machine: de provinciekaart komt uit
`data/cache`, en die 40 km aan tegels staat niet in git. macOS, Linux en Android
kunnen dat niet op deze machine, en een runner heeft de cache niet.

## Besluit

De coördinator releaset lokaal: `cd desktop && npm run release -- minor|patch
--world`, daarna `node scripts/release_builds.mjs` voor de andere platformen via
`workflow_dispatch`, met de wereld mee als `gde-world.tgz`. Agents pushen, mergen,
taggen en releasen nooit; dat doet de coördinator na de tests. Elke `0.x` is een
pre-release.

## Afgewezen

- **Alles in CI.** Dan moet de kaartbouw op een runner, met de OSM-extracten en de
  caches erbij: 55-105 minuten per release en een build die niet reproduceerbaar is
  zonder die data.
- **Agents laten releasen.** Constitutie 8: niets naar buiten zonder akkoord van de
  eigenaar, en een tag of upload is naar buiten.
- **Ondertekende builds.** Certificaten kosten geld en beheer; de notities zeggen
  nu eerlijk dat de bestanden niet ondertekend zijn.

## Gevolgen

Een release begint met een schone werkboom en een `## [X.Y.Z]`-sectie in
`CHANGELOG.md`; zonder die twee weigert het script. De medewerkers krijgen een
melding via een comment op #116, niet in de releasenotes. Wat niet getest is op een
echt platform (AppImage, APK, ARM) staat als zodanig in de notities.
