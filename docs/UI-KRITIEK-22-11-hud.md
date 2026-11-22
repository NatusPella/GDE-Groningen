# UI-kritiek 22-11: HUD en in-wereld-UI

Beoordeling van de schermen uit het kritiekharnas (branch `ui-kritiek-harnas-22-11`, uitvoer
`C:\Users\abuis\gde-ui-critic-22-11\<scherm>_<720p|1080p|ui15>.jpg`, buiten de repo) op de patronen P1 tot en met P12 uit de
eigenaar-feedback. Beoordeeld op 1080p, met `index.json` als tripwire-bron. Niets in gamecode gewijzigd.

## Eerlijk over de dekking

Het harnas rendert statische DOM met de echte CSS, maar niet elk HUD-scherm is zo te beoordelen. Wat niet te beoordelen was, staat hier apart en is **niet** als speler-bug gemeld.

| Scherm | Wat het beeld toont | Gevolg |
| --- | --- | --- |
| `hud-hoofd` | alleen minikaart (leeg vlak, canvas wordt niet getekend), plaatskaart en gezondheid | doelbalk, wanted, snelheidsmeter, luchtroute, radiomelding, duivenmodus ontbreken in het harnas |
| `hud-prompts` | volledig leeg vlak | interactieprompts (toets-in-de-knop) niet beoordeeld |
| `hud-sim` | `undefined` in de stapchips | fixture geeft `s.label` niet mee; de echte aanroepers (`akte2_plan.js`) geven `label` wel, dus waarschijnlijk een fixturefout |
| `hud-golf` | tabel in standaardlettertype, zonder DS3 | `golfhud.js` zet zijn CSS pas via `ensureGolfCss` in de DOM; harnas laadt die niet |
| `kaart-pitch`, `kaart-tekoop` | kale tekst, geen kaart | kaart-CSS niet geladen |
| `kaart-kaartuitleg*`, `kaart-reispopup` | volle breedte, "Trein12" zonder spatie, `?`-iconen | CSS hangt aan `.mapview-overlay`/`.mapview-card`, die het harnas niet omheen zet |
| `kaart-naamkaart` | leeg vlak | niet beoordeeld |
| Minigame-HUD's (kart, padel, klimtoren, penalty's, training, voetbaluitzending) | niet gerenderd | niet beoordeeld (bewust weggelaten volgens het harnas-rapport) |

De tripwires `contrast` op `hud-sim`, `hud-golf`, `kaart-pitch` en `kaart-tekoop` meten tegen het grijze testvlak en zijn daarom niet gebruikt.

## Bevindingen

Ernst: hoog, middel, laag. "Issue" geeft aan of er een GitHub-issue voor is aangemaakt.

| # | Scherm | Patroon | Wat er mis is | Ernst | Voorstel | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `kaart-bigmoment` | P2 | Het labeltje "Missie geslaagd" raakt de bovenkant van de titel (tripwire overlap `bm-klein`/`bm-kop` 48%, `bm-kop`/`bm-regel` 23%). | middel | Vaste ruimte tussen label, titel en regel; titel niet over het label laten klappen. | ja |
| 2 | `kaart-bigmoment` | P2/P12 | De titel staat in doffe olijf op geel en is half doorzichtig; "Opdracht mislukt" is wel zwart. Mogelijk een animatiebeeld halverwege, dan is het eindbeeld niet gecontroleerd. | middel | Eindstand controleren op 4,5:1; de animatie niet laten eindigen op een gedimde kleur. | ja |
| 3 | `kaart-bigmoment`, `-mislukt` | P8 | Chip "Missie geslaagd" en titel "Opdracht geslaagd" zeggen hetzelfde; bij mislukt idem. | middel | Een van de twee weglaten. | ja |
| 4 | `kaart-bigmoment` | P3/P12 | De titel is "Opdracht geslaagd"; de missie zelf wordt niet genoemd, terwijl de meldingskaart ("Verhuisdag") dat wel doet. | middel | Titel is de missienaam; "Geslaagd" is het label. | ja |
| 5 | `kaart-bigmoment-opgepakt` | P8/P1 | "BOETE" staat twee keer (chip en label bij het bedrag), plus een zin die het nog eens zegt; de stempel dekt de onderste rij af. | middel | Chip weglaten, zin eruit: bedrag groot met de stempel. | ja |
| 6 | `kaart-heist-notitie` | P8/P2/P6 | Kopje "Op het lege kussen" en tekst "Het kussen is leeg." herhalen elkaar; kopje en tekst overlappen (41%); het lettertype is een smalle schuine standaardletter, niet DS3. | middel | Alleen de tekst; DS3-lettertype; ruimte tussen kopje en tekst. | ja |
| 7 | `kaart-foutmelding` | P9/P1 | Speler krijgt een ontwikkelaarsmelding met "Details" en "Kopieer foutrapport"; de zin "Meld je het? Kopieer dan het foutrapport." is stroef; tripwire: de `pre` overlapt de knoppen (99%). | middel | Speler ziet een korte zin en een knop; details alleen met een ontwikkelaarsvlag. | ja |
| 8 | `kaart-meldingen` | P2 | Het gele vlagicoon staat op crème en is nauwelijks te zien; politie (blauw) en prestatie (paars) hebben wel contrast. | middel | Pictogram donker op een gekleurde tegel. | ja |
| 9 | `kaart-kaartuitleg` | P12/P10 | Toetsplaatje "LMB" is Engels en geen speltaal (constitutie 1); "waypoint" staat ook in de lopende tekst. | middel | "LMK" of een muisicoon; Nederlands woord voor waypoint. | ja |
| 10 | HUD-schermen | dekking | Zie "Eerlijk over de dekking": doelbalk, wanted, snelheid en alle minigame-HUD's zijn niet beoordeeld; `hud-prompts` is leeg. | middel | Harnas aanvullen met eigen CSS en echte fixtures per HUD, daarna opnieuw beoordelen. | ja |
| 11 | `kaart-meldingen-lang` | P1 | Titel van drie regels plus tekst van vijf regels in een kaart van 420 px. | laag | Titel maximaal twee regels, tekst maximaal drie, rest met ellips. | - |
| 12 | `kaart-meldingen*` | P6 | De balk onderaan is groen bij missie en prestatie en rood bij politie, zonder uitleg. | laag | Een kleur voor tijd, kleur alleen voor de soort. Zie ook #1149. | - |
| 13 | `hud-hoofd` | P12 | Plaatskaart toont "Ommeland" met "Grunn" eronder; onduidelijk of dat streek of stad is. | laag | Plek, daaronder het gebied. | - |
| 14 | `hud-hoofd` | P6 | Hartje grijs naast een groene balk; geen getal; kaarten liggen 3 px anders dan de minikaart. | laag | Hart in de balkkleur; onderlijnen. | - |
| 15 | `kaart-heist-plan` | P2 | Titel en rechterregel (ca. 13 px) staan tegen de rand van tape en kader. | laag | Meer binnenmarge, 14 px als minimum. | - |
| 16 | `kaart-foutmelding` | P6 | "Sluiten" en "Kopieer foutrapport" zijn even zwaar; geen primaire actie. | laag | Een primaire knop, toetsplaatjes erbij. | - |

## Top 10

1. Missie geslaagd en mislukt: titel zonder missienaam (4) en dubbele chip (3).
2. Missie geslaagd: titel in doffe olijf (2).
3. Missie geslaagd: label over de titel (1).
4. Foutmelding met dev-details voor de speler (7).
5. Opgepakt: "Boete" dubbel (5).
6. "LMB" en "waypoint" in de kaartuitleg (9).
7. Heist-notitie: dubbele tekst, overlap en ander lettertype (6).
8. Missie-meldingskaart: gele vlag op crème (8).
9. Harnasdekking van de HUD (10).
10. Meldingskaart met tekstmassa (11).

## Aantallen per patroon

Een bevinding kan onder meer dan een patroon vallen. P1: 3 (5, 7, 11). P2: 5 (1, 2, 6, 8, 15). P3: 1 (4). P4: 0. P5: 0. P6: 4 (6, 12, 14, 16). P7: 0. P8: 3 (3, 5, 6). P9: 1 (7). P10: 1 (9). P11: 0. P12: 4 (2, 4, 9, 13).
