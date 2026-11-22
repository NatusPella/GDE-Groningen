# Verfijnronde 22-11: cutscenes en regie

> Opdracht van de eigenaar: geen nieuwe functies, wel verfijnen wat er is (QoL, QA, UX, leesbaarheid) op de belangrijkste epics. Dit document is de stand voor **cutscenes en regie**: tempo, overslaan, ondertitels, camera, overgangen, herhaalbare scènes, lege staten en Samen spelen.
> Branch `verfijn-cutscenes-22-11`. Niets is in beeld bekeken (geen Electron; zie "Alleen in beeld of met een speler").

## Wat er al goed stond (gemeten, niet aangeraakt)

- `cutscene_lint --strict`: 0 blokkerend (267 scènes, score 98/100). De 56 "belangrijk" zijn regiesmaak (CS-C06 180-gradenregel, CS-T04 groepsscènes) en staan met reden in de uitzonderingen; ze zijn geen wrijving voor de speler.
- Tijdlijnen van alle 101 geregisseerde scènes (verkenning in node): geen regel eindigt na de scène, geen overlap, geen stilte langer dan 3,5 s tussen regels, geen scène zonder regels behalve de kaart en de dijkscène (beeld-only).
- Skip: vasthouden van Spatie of A (0,9 s), één hold slaat nooit twee scènes over (#734 F8), gast slaat alleen zijn eigen kopie over (#434), touch heeft één Overslaan-knop. Camera-pop-in en locatiewissels: `cutscenewarm.js` en `CUTSCENE-POPIN-22-11.md`.

## Wrijving, oplossing, bewijs

| # | Wrijving (wat de speler merkt) | Oplossing | Bewijs |
|---|---|---|---|
| 1 | Tussen twee ondertitelregels zit een kier van 0,12 s; het vak (papier met rand) knipperde leeg en vol bij elke beurt | `cinesub.js subtitleIndex`: de vorige regel blijft hoogstens 0,45 s staan tot de volgende begint | `cinesub_test` (3321 controles, fuzz), commit "Ondertitels: de regel blijft even staan" |
| 2 | Aan het eind van een regel werd de tekst direct gewist terwijl het vak nog 0,3 s vervaagde: een leeg randje bleef even hangen | Bij het wegvlakken blijft de tekst in het vak staan; pas de volgende regel of de volgende scène vervangt hem | `cinesub_test` (bedrading), `cinematics.js updateSubtitles` |
| 3 | Wie de spatie meteen vasthoudt zag de overslaan-ring niet: de hint komt pas na 0,8 s in beeld en het vasthouden duurt 0,9 s | `.cine-skip.holding` is direct zichtbaar (`hud_panel.css`) | `cine_verfijn_test` |
| 4 | Een kapotte shot (NaN in de camerapose) zette het beeld op zwart voor de rest van de scène | `cinelimit.js poseIsFinite`: de laatste goede stand blijft staan, de fout blijft gemeld | `cine_verfijn_test`, fuzz (`cinematics_fuzz_test`) |
| 5 | Mislukte setbouw (kamer, kantoor, keuken) gaf een lege scène van minuten: spelers verborgen, alleen ondertitels, wereld op pauze | `cutscenehost.js`: bij een bouwfout wordt de scène meteen overgeslagen en gaat de missie door | `cine_verfijn_test` (bron), nog niet in beeld |
| 6 | Een scène zonder geldige duur (`undefined` of NaN overschrijft de standaard) liep eindeloos met de wereld op pauze (alleen de veiligheidswacht ving het na minuten) | `begin()` valt terug op 3 s | `cinematics_fuzz_test` (faalt zonder de regel, gecontroleerd) |
| 7 | `timeScale` NaN (of 0, of boven 1) in een scènespec liet de spelklok vastlopen: `main.js` knipt alleen buiten 0..1, niet NaN | `begin()` knipt op 0,05 tot 1 en maakt van NaN 1 | `cinematics_fuzz_test` (8.273 fouten zonder de regel) |
| 8 | Een lege (null) regel in een scène liet `begin()` halverwege falen: een scène die half bestond | Lege regels worden uit de lijst gehaald | `cinematics_fuzz_test` |
| 9 | Een geen-getal als tempo of tijd uit een kapot gastbericht (Samen spelen) liet de kopie van de gast eeuwig staan | `setCinematicRate` en `setCinematicTime` negeren niet-eindige waarden en knippen het tempo op 0 tot 3 | `cinematics_fuzz_test` |
| 10 | "De opening kan nu niet: Samen spelen." en "...: duifstand." lezen als code | `openingstart.js OPENING_REDEN`: gewone zinnen (je speelt samen, je bent een duif, er loopt een missie) | `openingstart_test` (77 controles) |
| 11 | `cine_pause_test` faalde al op main (finish roept sinds #1016 eerst `endJumps` aan) | De test staat de aanroep toe en eist nog steeds `pauseOff` er direct achter | `cine_pause_test` 14/14 |
| 12 | Geen enkele test liep de cinematics-machine door met willekeurige reeksen (starten, wachtrij, vervangen, pauze, vasthouden, overslaan) | `cinematics_fuzz_test`: 60 seeds, 160 stappen, na elke stap: pauze, HUD en timeScale schoon, elke `onEnd` precies één keer, één hold slaat één scène over | `cinematics_fuzz_test` (ca. 84.000 controles) |

## Wat bewust niet (te groot of een nieuwe functie)

- **Scènes opnieuw bekijken** buiten de opening (een galerij van geziene scènes): nieuwe functie; de opening heeft de knop in Verhaal > Personages.
- **Lange scènes opknippen met hoofdstukken of een "sla dit deel over"** (M16.outro 130 s, M15.outro 118 s, de opening 111 s en 171 s): vraagt regie en een skipdoel per hoofdstuk. Nu is één scène één skip; de hold van 0,9 s houdt een toevallige skip tegen.
- **Esc als skip**: de code zegt Spatie of A; een tweede toets is een nieuwe afspraak met `spacegate.js` en de menu-Esc.
- **Regiesmaak (CS-C06, CS-T04)**: staat bij de verhaal-lead; 0 blokkerend.
- **Leessnelheid M25.intro en M06**: de ondertitel volgt de stem (`voicetiming.js` rekt de duur op); korter vraagt een nieuwe opname (kosten).

## Samen spelen

- Een gast ziet de scène lokaal, op de tijd van de gastheer (`coopcut.js cutGastTempo`). Wijziging 9 is alleen een vangnet tegen een kapot tijdbericht; het protocol blijft gelijk.
- Wijziging 5 (bouwfout) werkt ook bij een gastkopie (`replay`): die meldt dan klaar via zijn eigen `onEnd`, de scène van de gastheer loopt door.
- De opening-herbekijkknop blijft geblokkeerd in Samen spelen (zie wijziging 10 voor de tekst).

## Alleen in beeld of met een echte speler te beoordelen (nog niet bekeken)

- Ondertitelvak: of de houdtijd van 0,45 s prettig voelt, of de vervaging nu schoon oogt (ook met `sub-box`, groot en extragroot).
- Overslaan-ring direct zichtbaar: positie ten opzichte van de ondertitel en de letterbox.
- Setbouwfout: er is geen bekende scène die faalt; de tak is alleen via de bron getest.
- Camera-hold bij een kapotte pose: alleen in node gesimuleerd.
