# Fixes 22-11: performance en geheugen

Branch `fix-perf-22-11` (op `origin/main` 310892926), bij `docs/reviews/CODE-REVIEW-22-11-perf.md`. Elke fix heeft een test die zonder de fix faalt.

| Bevinding | Commit | Test |
|---|---|---|
| P1 voetbal lekt veld, bord, bal en spelers | 40e670ee7 | `scripts/voetbal_opruimen_test.mjs` (34 geometrieen van het oude veld vrij, persoonstellers terug, bordmateriaal gedeeld) |
| P2 interieur-NPC's verliezen hun pose | 4bec18b3b | `scripts/pose_prune_test.mjs` (persistent-vlag, vrijgeven bij `drop`) |
| P3 interieur bouwt alle mensen in een frame | 9e088ad21 | `scripts/interior_npcspreiding_test.mjs` (een figuur per frame; node, warm: zwaarste tik 64 ms naar 27 ms) |
| N1 modulepreload met onbereikbare modules | db8be0a97 | `scripts/preload_bereikbaar_test.mjs` (33 modules, 322 kB minder in de golf) |
| N2 `tickVehicleLooks` alloceert per beeld | 3e910fe63 | `scripts/perf_nits_test.mjs` (zelfde keuze als de oude sortering, 300 willekeurige rondes) |
| N4 `pump` zonder vangnet | 3e910fe63 | `scripts/perf_nits_test.mjs` (bronteksttest: het scenario zelf vraagt WebGL) |
| N5 `shots` zonder bovengrens | 3e910fe63 | `scripts/perf_nits_test.mjs` (bronteksttest, grens 200) |
| Open punt `tileCooler.forget` in `dropStreamTile` | 3e910fe63 | `scripts/perf_nits_test.mjs` (bronteksttest) |

Extra gevonden bij P3 (commit a5ec01021): `planOf` in `interiors.js` bewaarde het platte plan van `interiorrules.js`, terwijl `scan`, `build` en
`pinInterior` `rec.plan` lezen; `scan` gooide dus bij het eerste pand met een geldig plan. `planOf` bewaart nu `{ ok, why, plan, b, epoch }`.
Geen test dekte `updateInteriors`; `interior_npcspreiding_test.mjs` doet dat nu wel.

## Niet gedaan

- N3 (`P()` per hoekpunt in `interiorbuild3d.js`): het rapport zegt zelf alleen aan te pakken als de bouw in stukken gaat; de hal bouwt nog in een tik (1 tot 5 ms).
- N6 (data-modules lui laden): het rapport zegt eerst te meten met `loadMarks`; zonder Electron niet te meten.

## Niet getest

- Geen beeld bekeken: voetbalveld na een wedstrijd, de verschijning van mensen in een pand (een per frame) en de zittende klanten staan als "nog niet bekeken".
- N4 en N5 zijn alleen als brontekst gecontroleerd (de snapshotpomp vraagt een WebGL-context).
- `scripts/voetbal_rook_test.mjs` faalt al op `origin/main` (de uitkomst van `decodeKickoff` heeft een veld meer dan de test verwacht); die test is niet door deze wijzigingen veroorzaakt.
