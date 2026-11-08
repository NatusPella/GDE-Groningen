# 0031 - Het laadscherm bouwt de startbuurt en de shaders voor

- **Status:** besloten
- **Datum:** 2026-11-08
- **Spec:** `.specs-fire/standards/wereld.md` (laadpad), `docs/PERF-BESLUITEN.md`
- **Gerelateerd:** #750, #749, #247, #380

## Context

Na het laden stond de speler meteen in de wereld, maar de eerste seconden waren
niet stil: de gebouwen en wegen rond het startpunt werden dan pas op de
hoofdthread gebouwd en geüpload, en de eerste keer dat een shaderprogramma in
beeld kwam linkte WebGL hem (het opstartprofiel van 19-10: 18 s van de eerste
44 s ging naar programmalinks). De eigenaar koos op 8-11 expliciet voor een
**langer laadscherm in ruil voor een gladde start**.

Dat is iets anders dan #750. #750 was een bugfix: de boot wachtte ná het
laadscherm op de Ommeland-plaatsing terwijl de spellus nog niet liep, waardoor
een nieuw spel een bevroren beeld zonder HUD zag en de laadbalk bij een save
stil bleef staan (de teller kon niet dalen zonder `update3D`). #750 haalde die
wacht vóór de spellus weg; het ging niet om "kort laden" als doel.

## Besluit

Zowel bij een **nieuw spel** als bij het **laden van een save** blijft het
bootscherm staan terwijl het startgebied voorwarmt, op de startplek (nieuw spel)
of op de opgeslagen plek (save). De boot prewarmt de gebouwen binnen 200 m rond die
plek (dezelfde machinerie als een cutscene-voorlading, met eigen radius), laat de
gewone framestappen de wegen en de straatversiering daar bouwen en uploaden tot
`streamPending()` en het prewarmwerk nul zijn **én de laatste twaalf frames elk
onder 50 ms blijven**, en compileert dan alle shaderprogramma's van de scène
(`precompilePrograms()`). Dat laatste is de kern: niet alleen de tellers, maar de
frames zelf moeten rustig zijn, zodat een late workeruitslag (stadsprops, oevers,
verre LOD) of een shader die pas bij eerste gebruik linkt in het laadscherm valt
en niet in het spel. Pas daarna gaat het scherm weg en krijgt de speler toetsen.
De wachttijd is begrensd (25 s); een langzame machine gaat met een half warm
gebied verder in plaats van te hangen.

Bij een save komt daarna nog het gewone laadscherm (dat op de gestreamde tegels
wacht); de warme buurt maakt dat alleen korter. Ook de twee stappen die sinds
#750 achter het spel aan liepen, de Ommeland-plaatsing (garage-, café- en
winkeldeuren) en de kaartbeelden van de Ommelanden, lopen nu naast de warm-lus
en de boot wacht er binnen dezelfde grens op (`ready` in `main.js`). Dat is geen
terugkeer van de #750-fout: de warm-lus houdt de frames draaiende, en wat niet
binnen de 25 s klaar is loopt daarna gewoon achter het spel door zoals voorheen.
Een test-, QA- of benchmarkrun slaat het voorladen over, zodat die runs hun eigen
timing houden. De statusregel van het laadscherm zegt wat er nog gebeurt.

## Afgewezen

- **Niets doen en de haperingen in de eerste minuten accepteren.** De eigenaar
  koos expliciet andersom.
- **Opnieuw op de Ommeland-plaatsing wachten met een kale await vóór de
  spellus (#750 terugdraaien).** Dat was precies de fout van #750: wachten
  zonder draaiende lus laat het beeld en de laadbalk bevriezen. Binnen de
  warm-lus, die de frames juist wél laat draaien en een tijdsgrens heeft, mag
  het wel; zo verdwijnt de paar-ms-per-frame-arbeid uit de eerste speelseconden.
- **Alles vooraf bakken in de build (mesh-cache/GLB).** De statische
  stadsgeometrie is groot en hangt aan kwaliteit en zichtafstand; voor de
  startbuurt is voorladen tijdens het laadscherm genoeg en veel eenvoudiger.
- **Ook de unieke assets van de opening voorcompileren.** Geprobeerd (keuken,
  beide acteurs, duivenvlucht, losse props in de warm-up-queue en
  `prewarmObjects`): in de browsertest liep het laadscherm daardoor tegen de
  25 s-grens (startWarm 25,7 s, gameStart 40,8 s tegen 19,9 s zonder) terwijl de
  frametijden na de start niet aantoonbaar beter werden. Teruggedraaid: een
  langer laadscherm zonder meetbare winst is geen verbetering. De vaste
  warm-up van `scene3d.js` (die alle latere acteurs en voertuigen al dekt)
  blijft staan.
- **Ook de buurten van de openingsshots vooraf prewarmen.** Geprobeerd: de
  focuspunten van de montage (Martinitoren, Vismarkt, museum, ring, Eemshaven,
  park) via `introWarmSpots()` in de warm-lus gezet (150 m radius). In de
  browsertest werden 10 punten gevonden, maar liep de warm-up tegen de 25 s-grens
  (gameStart 39,9 s tegen 19,9 s zonder) en verbeterden de frametijden tijdens de
  opening niet (9 frames in 5 s, gemiddeld 763 ms, tegen 9 frames en 578 ms
  zonder). Teruggedraaid: de shotwissels worden kennelijk niet door de
  gebouw-meshes maar door de rekwisieten/links van de montage zelf bepaald.- **De eerste tegelkring resident houden.** De stad is al gepind (ADR 0003); de
  provincie resident maken kost geheugen dat de start niet nodig heeft.

## Gevolgen

- Het bootscherm duurt op een langzame computer enkele seconden langer; daarna
  zijn de eerste frames in het startgebied vrij van meshbouw, late workeruitleg
  en programmalinks.
- `scene3d.js` heeft `prewarmStreamAt(x, y, secs, radius)`, `prewarmPending()` en
  `precompilePrograms()`; `main.js` doet de lus (met de frametijd als maat),
  `startscreen.js` wacht er in `startNew` én in beide `continueGame`-paden op
  (`warmBeforeFinish`, `opts.warm`). `scripts/startroute_test.mjs` bewaakt de
  bedrading en de #750-orde.
- `window.__loadMarks.startWarm`, `.warmFrames`, `.warmWorstFrame` en `.shaders`
  maken het effect in een perfrun meetbaar. Die meting (Electron, echte eerste
  minuut) is nog niet gedaan; de bedrading en de bestaande starttests zijn groen.
- Blijft de fps ook ná die eerste minuten laag, dan is dat geen laadlogica maar
  doorlopende belasting (kwaliteit/GPU/streamen); dat vraagt een perfmeting, geen
  langere warm-up.
