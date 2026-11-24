# Regieronde 24-11: 21 sleutelscènes buiten akte 1 (#1325)

Branch `regie-23-11` (vanaf `integratie-0.66`). Akte 1 is bewust overgeslagen: die zit op de branch `akte1-eindniveau-23-11`.
De voor/na-contactvellen staan in [beeld-24-11/regie/index.html](beeld-24-11/regie/index.html): per scène één keyframe per shot, met
spreker, ondertitel, camera, wie in beeld is, het licht van het shot en de lintvondsten. Twee runs naast elkaar: `voor` (de stand van
`integratie-0.66`, met echt Electron-beeld) en `na` (deze branch). Zelf opnieuw maken:

```
node scripts/cutscene_contactvel.mjs --set=regie --label=voor|na [--electron]     # uitvoer in .contactvel/ (niet in git)
node scripts/cutscene_contactvel.mjs --publiceer=docs/beeld-24-11/regie          # alle schetsen, per scène drie echte beelden
```

## Gereedschap (#1322, #1323, #1324)

- **Contactvellen** (`scripts/cutscene_contactvel.mjs`): altijd een schets door de echte camera (puur, ook in CI); met een vrij
  Electron-slot en een gestagede game (`GDE_GAME_DIR`) ook het echte beeld. Wegwerpprofiel, `--no-sandbox`, geen wachtrij.
- **Licht per shot** (`game/js/shotlight.js`): `light` (scène) en `lights: [{ on, light }]` (vanaf een regel) in een missiespec, of
  `light` op een shot; presets `gouden-uur`, `avond-binnen`, `avond-buiten`, `warm-intiem`, `spanning`, `ochtend`, `bewolkt-zacht`,
  `tl-binnen`, `nacht-straat`, `dag`, of eigen key/fill/rim met kleurtemperatuur, intensiteit en richting. Zonder licht: het wereldlicht.
- **Regieregels in de lint** (`scripts/lib/cutscene_lint.mjs`): afgekapt hoofd (C11), camera in of achter geometrie en objecten die het
  kader vullen (C12: vóór het onderwerp vanaf 30%, erachter vanaf 60%), spreker van achteren (C13), te snelle snedes (C14), ondertitel te
  kort in beeld (T11), lopen door een object (V06), plus de bestaande as-sprong (C06) en kijkrichting (V05). De telling staat in
  `scripts/release/cutscene-regie-baseline.json` en mag alleen dalen (de lint faalt erboven, ook in de releasegate).
- **Dekking** (`missionScene`, opt-in): `coverage: 'ots'` (wie praat van voren, over de schouder van wie hij aanspreekt, altijd aan één
  kant van de as) en `coverage: 'front'` (mensen naast elkaar, alle camera's aan hun voorkant).
- **Motorfout opgelost** (`cutscript.js`): een `close`- of `reaction`-shot stond achter het hoofd van zijn doel. Dat raakt alle scènes,
  ook akte 1: daar laten close-ups nu het gezicht zien in plaats van het achterhoofd.

## De scènes

Score en regievondsten met dezelfde (nieuwe) lint op de oude en de nieuwe stand. Over de hele lijst daalde de regiebaseline van 380 naar 226.

| scène | wat | score voor → na | regievondsten | licht |
|---|---|---|---|---|
| M07.intro | Jelle bij de tankwagen | 83 → 100 | 3 → 0 | wereldlicht |
| M10.intro | Jelle komt aan in de limo | 82 → 100 | 4 → 0 | spanning |
| M11.6 | de lange blik (romance) | 82 → 98 | 4 → 2 (nit) | avond-buiten, gouden uur, warm-intiem bij de sterren |
| M14.intro | Jelle aan de dijk | 67 → 74 | 5 → 4 | ochtend |
| M14.outro | na de finish ("met wind") | 92 → 92 | 0 → 0 | ochtend, gouden uur vanaf "Je ziet er goed uit met wind" |
| M16.outro | botsauto's, de kus, de dijk | 67 → 82 | 4 → 3 | avond-buiten (één licht: het netpakket zit tegen de grens) |
| M17.outro | brug elf, Stien | 91 → 100 | 1 → 0 | avond-buiten vanaf de frituur |
| M20.3 | de kruitkelder | 67 → 92 | 5 → 1 | avond-binnen |
| M20.outro | de ruzie, de klomp | 57 → 81 | 8 → 5 | gouden uur; Berend en Oma nu in beeld als ze praten |
| M22.4 | de schuur, de knuffel | 0 → 83 | 21 → 3 | avond-binnen, warm-intiem vanaf Tessa's bekentenis |
| M25.3 | het bod | 98 → 99 | 2 → 1 | spanning |
| M25.outro | het familiediner | 75 → 100 | 4 → 0 | avond-binnen bij het diner |
| M26.5 | Mem tegen Jelle | 34 → 89 | 9 → 3 | bewolkt-zacht; de limo staat opzij |
| M26.13 | de uitslag | 99 → 98 | 1 → 2 (nit) | wereldlicht |
| M26.outro | de vijf woorden, de kus | 36 → 82 | 8 → 4 | warm-intiem bij de kus, avond-buiten bij Jelle |
| F1 | de aanhanger (vondst coördinator) | 68 → 99 | 4 → 1 (nit) | wereldlicht; Tessa naast de aanhanger, geen muur meer |
| F5 | een avond voor twee | 28 → 100 | 9 → 0 | avond-buiten, warm-intiem vanaf "Zijn we nu een stel" |
| F6 | de kaart op het luik | 18 → 97 | 12 → 3 (nit) | avond-buiten |
| M30.intro | het krijgsberaad | 73 → 81 | 6 → 3 | ochtend |
| M30.5 | de poort | 99 → 98 | 1 → 2 (nit) | spanning |
| M30.outro | de kar | 18 → 90 | 11 → 2 (nit) | gouden uur; de kar opzij, Geesje van voren |

Wat overblijft is vooral nit: een korte snede en hier en daar een as-sprong rond een groepsshot. Bewust gelaten: M22.4 (de Escapade staat
als decor achter het paar; verplaatsen gaf een spreker met de rug naar de ander), M30.intro (het bord van het krijgsberaad staat tussen een
paar sprekers; verplaatsen maakte het erger), M14.intro (Tammo loopt weg terwijl hij "Ik rij" zegt).

## Samen spelen

Licht en dekking zijn data in de scènedefinitie: een gast speelt dezelfde def (`cutPakket`) en ziet hetzelfde licht en dezelfde camera.
Er komt geen netwerkbericht bij. M16.outro kreeg één licht in plaats van drie omdat het pakket anders boven de 32.000 tekens kwam
(`cutscenes_pakket_test`).

## Nog niet bekeken

- Beide runs hebben echt Electron-beeld (een vaste plek in de wereld, 14:00, geen weer; de plek is niet de echte locatie van de scène). Bekeken door de agent: F1, F5, M22.4 en M30.outro voor en na (het licht per shot is zichtbaar: avond en warm-intiem). De andere scènes alleen via de lint en de schetsen.
- In git staan alle schetsen en per scène drie echte beelden per run; de volledige set maakt het commando hierboven opnieuw.
- De Quaternius-personages (branch `personages-leven-23-11`): de lint rekent met een mens van 1,78 m, de beelden zijn nog de oude figuren.
- Akte 1-scènes: alleen het effect van de close-up-fix, geen regieronde (andere branch).
- Gebaren via een animatie-state-machine: er is er geen; de gebaren blijven de bestaande pose-clips en `anim`-cues.
- De eigenaar heeft de 20 scènes nog niet goedgekeurd.
