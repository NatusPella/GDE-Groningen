# Oordeel over de screenshotjacht van 22-11

## Stand

De opdracht was om de 549 beelden van de eerste jacht (seed 1) te beoordelen. **Dat is niet gelukt: de beelden bestaan niet meer.** De worktree `screenshotjacht-22-11` die ze bevatte (`desktop/build/jacht/seed-1`, buiten git) is van schijf verdwenen (git meldt hem als prunable) en een zoektocht naar `galerij.html` in de andere worktrees leverde niets op. Wat er in git staat (`docs/SCREENSHOTJACHT-22-11.md`, de scripts) bevat geen beelden. Daarom is **geen enkel beeld bekeken**: de 17 verdachte niet, en ook de steekproef over verhaal, vrij verkennen, binnen en menu niet. Alles wat als beeldbevinding zou kunnen staan, is dus "nog niet bekeken". Er is niets uit de tripwiretekst als beeldoordeel verzonnen.

Vervolg: issue #1284 (jacht opnieuw draaien met een bijpassende wereld en de beelden direct laten beoordelen, de galerij buiten een worktree bewaren).

## Bevindingen (uit code en uit de gedocumenteerde run, niet uit beelden)

| # | Beeld | Ernst | Bevinding | Oorzaak, bestand | Stand |
|---|---|---|---|---|---|
| 1 | proefrun, Coendersborg | hoog | Rode kaart "Er ging iets mis", `TypeError: Cannot read properties of null (reading 'main')` in `buildBuildingMeshRaw` (via `stepPrewarm`) | `touchParts` in `game/js/models3d_buildings.js`: bij een cache vol gespaarde gebouwen (`partsInUse`) kwam de opruimlus bij het gebouw dat net gebouwd werd en zette zijn `_geo3dParts` op null. Gereproduceerd met exact die foutmelding in `scripts/buildingparts_lru_test.mjs` stap 4 | **Gerepareerd**, #1283 |
| 2 | 0449/0450 Bourtange, 0548-0550 Hoofdstation | midden | Tripwire `gelijk`: beelden pixelgelijk terwijl de schermtekst 01:00 en een fiets meldt en het beeld daglicht en lopende figuren toont | Niet vast te stellen zonder de beelden. Beeld en schermtekst spreken elkaar tegen; dat past bij een stilstaande render of een oud capturebeeld (`capturePage` in `desktop/devtools.js` geeft het laatst geschilderde frame) tijdens zwaar tegelladen, eerder dan bij een stilstaand spel: de schermtekst is wel bijgewerkt, dus de pagina draaide. Het jachtscript wacht na `setEnv` maar 1,4 s (lopen) en 1,8 s (rijden) en controleert niet of het frame vernieuwd is | Open, #1284 |
| 3 | 0307 Coendersborg | midden | Consolefout: tegel `v-1_0-...gdp` laden mislukt na 30 s timeout, `country placement TimeoutError`, `landmark kits not loaded` | Waarschijnlijk deels de afwijking tussen de wereld van 19-11 en de JS van 22-11 en de tweede Electron die meedraaide; niet bevestigd | Open, #1284 |
| 4 | 9 beelden | laag | `fps-laag` 0,9 tot 2,6, steeds direct na teleport of scènestart | Laden, geen meting (zoals de run zelf al aangaf) | Geen actie |

De tripwires vonden geen zwart, transparant of magenta beeld. Dat zegt niets over clipping, zwevende objecten, interieurmeubilair, popin, kleuren, DS3, afgekapte tekst, overlappende UI of een verkeerd tijdstip: dat kon alleen op beeld.

## Aanbevelingen voor de herhaling

- Bewaar de uitvoermap buiten een worktree die weggaat, of laat de beoordeling meteen op de run volgen.
- Laat de jacht na `setEnv` wachten tot er een nieuw frame geschilderd is (twee `requestAnimationFrame`s plus een verandering in de vingerafdruk) en leg het zonuur vast naast het klokuur.
- Stage de wereld en de JS uit dezelfde build.
