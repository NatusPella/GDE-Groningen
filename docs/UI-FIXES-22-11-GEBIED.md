# UI-fixes 22-11: gameplay- en inhoudsbugs uit de beeldrondes

Branch `ui-fix-bugs-22-11`. Gebied: #1187 tot #1214 uit de hertest van 22-11 en de UI-kritiek. Beeldbewijs is niet gemaakt (geen Electron in deze run); het bewijs is een test per fix. Alles staat als "nog niet bekeken" in de issues.

| Issue | Oplossing | Bewijs |
|---|---|---|
| #1187 mislukte missie toont beloning | `momentVanBanner` geeft bij `kind: 'fail'` altijd beloning 0; de oude banner telt ook niets op | `scripts/bigmoment_test.mjs` (mislukt met reward 250 geeft geen beloningsregel) |
| #1188 HUD blijft achter eindkaart | `bigmoment.js` zet `body.bm-eindkaart` bij een schermvullende kaart; `bigmoment.css` verbergt `.hud-mission` | `scripts/bigmoment_test.mjs` (bronchecks) |
| #1189 duifprompt onder doelbalk | De sleutelhints (`prompts.js hiddenNow`) zwijgen achter de eindkaart; het prompt mijdt de doelbalk al via `OBSTACLE_SEL`; in een voertuig toont `findPrimary` het duifprompt niet | `scripts/bigmoment_test.mjs`. Deels: de grootte van de cirkel is niet aangepast |
| #1190 kaartonderrand | De schaalbalk begint rechts van de bronvermelding (`MAP_SCALE_X`) | `scripts/kaartkader_test.mjs` |
| #1198 spraakbubbels | `hudObstacles()` wordt ook ververst als de hints zwijgen, zodat de bubbels de HUD-kaarten blijven mijden (stond stil tijdens verborgen hints) | `scripts/overlap_fixes_test.mjs` |
| #1202 mist | `MIST_FAR` van 150 naar 220 m | `scripts/weatherlook_test.mjs` |
| #1196 lantaarnpaal voor bord | `registerSignKeepOut` (streetfurniture.js): cirkel van 4,5 m op 4 m voor de garagepoort; stadslantaarns en straatmeubilair mijden hem | `scripts/ui_fix_bugs_22_11_test.mjs` |
| #1194 blauwe schijf | Het duivenspot-vlak is een ring zonder doorzichtigheid | `scripts/ui_fix_bugs_22_11_test.mjs` |
| #1192 viaductonderkant | Beton en wand van civiele werken kregen een beetje `emissive`, zoals de tunnel al had | `scripts/ui_fix_bugs_22_11_test.mjs`. Tekstuur en wegmarkering op het dek zijn niet gedaan |
| #1214 reis-vraag | `reisview.js`: lege afstand geeft geen "NaN km", geen "gratis" of "€ 0", één getal per keuze, voetregel "De klok loopt altijd door" | `scripts/reisview_test.mjs`, `scripts/hud_test.mjs` |
| #1210 foutmelding | Al opgelost op main: korte Nederlandse zin, details onder een uitklapper met begrensde `pre`, eigen CSS | `scripts/foutbronnen_test.mjs` |

## Overgeslagen

- #1193 (Usquert kaal grondvlak), #1197 (zebrapaden), #1201 (cinematic auto en wielen), #1203 (kale gras- en pleinvlakken): vragen een beeldrender in Electron of WebGL (terrein-, textuur- en modelwerk); niet gedaan en niet gereproduceerd.
