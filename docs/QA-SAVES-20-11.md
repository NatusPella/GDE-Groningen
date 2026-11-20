# QA opslaan en laden, 20-11 (#983, #429)

> **Status:** controle voor de release van 20-11. Zonder Electron: pure Node-tests met de echte `savegame.js`, `saveslots.js`,
> `savemigrate.js` en `settings.js` en een nepwereld. Naslag voor de opslagregels: [README.md](../README.md) ("Saves en privacy"),
> [TESTEN.md](TESTEN.md). Wat niet in beeld is gezien staat als zodanig aangemerkt.

## Wat is getest

De suite heet **compat** en bestaat uit twee scripts (ook in `node scripts/run_tests.mjs`):

- `node scripts/compat_saves_test.mjs`: 67 controles. Zonder de gevendorde three.js (`cd desktop && npm run stage`) slaat hij zichzelf over.
- `node scripts/compat_settings_test.mjs`: 98 controles, zonder three.js.

1. **Oudere saves.** Alle opslagfixtures in `scripts/fixtures/saves/` (v0.21 tot v0.37, ook oude-verhaal-saves) gaan door
   `readSaveInfo` en `applySave`: laden zonder fout, geld gelijk of hersteld uit `moneyBackup`, bekende verhaalstappen blijven
   gedaan. `SAVE_VERSION` is sinds 0.38 gelijk (10). De velden die erbij kwamen sinds v0.63 (`eten`, `plek`) zijn optioneel en een
   save zonder ze laadt. De huidige vorm doet de rondreis opslaan, laden, opslaan zonder verschil.
2. **Beschadigd en half.** Afgekapte JSON, onzin, `null`, een lijst, een versie als tekst, 0, negatief of met komma, een nieuwere
   versie: altijd `kapot`/`leeg`/`nieuwer` zonder uitzondering, `hasSave` nee en geen overschrijving. Met een goede herstelkopie komt
   de speler terug met de melding "beschadigd" en zonder voortgangsverlies. Veldfuzz: elk veld weg en elk veld (ook elk subveld) met
   `null`, tekst, 1e308, `[]`, `{}` en gemengde lijsten: 1027 gevallen laden en slaan opnieuw netjes op. Onbekende stap-, wapen- en
   voertuig-id's vallen weg. NaN/Infinity (programmatisch) in geld, gezondheid, pantser, plek, speeltijd en statistieken: zinnige staat.
3. **Per speler bij Samen spelen.** Een gast schrijft alleen zijn eigen plek (verdiensten, eigen geld en spullen); verhaal, missies,
   plek en personage van zijn eigen save blijven; de save van de host verandert niet. De gastvelden bevatten geen verhaal of missies.
   Tijdens een echte sessie weigert `applySave`; alleen spelen laadt wel. Een onleesbare gastplek wordt niet overschreven en het
   verdiende bedrag blijft in het geheugen. De bestaande scheiding is niet aangepast.
4. **Rit, film, opening.** `serialize` bevat geen rit-, film-, opening- of wachtprops-staat (missiestaat zit in runtime-`chainState`).
   De opening is een film en de autosave wacht erop; een save van vóór M00 laadt en laat de opening nog komen.
5. **Instellingen.** Alle oude bestanden (0.20 tot v9), lege/kapotte/halve bestanden, onbekende en ontbrekende sleutels, en elke
   schuif met waarden buiten het bereik.

## Bevindingen en fixes

| # | Ernst | Bevinding | Stand |
|---|-------|-----------|-------|
| 1 | Middel | Een save tijdens een lopende reisrit (venster sluiten, tab verbergen, F5) schreef de plek van de taxi of trein weg, met het kaartje nog onbetaald. Alleen de autosave wacht op een film. | Gefixt: `world.ritBezig` (reisrit3d.js), `saveGame` slaat dan over; de save van vóór de rit blijft. |
| 2 | Middel | Een save laden terwijl een 3D-rit loopt (Escape opent het menu): `applySave` beëindigt de film, de belofte van de rit loste daarna op en `landNaRit` zette de geladen wereld op de bestemming en liet haar betalen. | Gefixt: reisrit.js vergelijkt `loadCount` en landt dan niet. Niet in beeld gezien. |
| 3 | Laag | Geld van 1e308 laadde ongehinderd; één beloning erbij wordt Infinity. | Gefixt: begrensd op 1e12 bij het laden. |
| 4 | Laag | `cameraDistance` en `mouseSensitivity` hadden geen bereikcontrole bij het laden (0 of negatief: camera in het figuur of omgekeerde muis); `fov`, `uiScale` en `brightness` werden pas bij gebruik begrensd. | Gefixt: alle vijf vallen buiten hun pauzemenuschuif terug op de standaard. |

## Open

- Het pauzemenu opent nog tijdens een 3D-rit (Escape): dat laden is nu veilig, maar het menu hoort er waarschijnlijk niet te zijn. Een besluit voor de eigenaar; niet aangepast.
- `homeSaveContext` gooit als het huis nog niet gebouwd is (`home` is `null`); in het spel gebeurt opslaan pas na de bouw. Niet aangepast.
- Een fixture van een echte v0.63- of v0.64-save ontbreekt: de vorm is sinds 0.38 niet veranderd en de rondreis dekt de huidige vorm.
- Niet getest: een echte browser- of Electron-opslag (quota, meerdere tabs), en de beelden van het herstelbericht.
