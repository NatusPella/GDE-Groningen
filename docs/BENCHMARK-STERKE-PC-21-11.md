# Benchmark op een sterke pc (21-11, issue over Nikky's RX 9070 XT)

Nikky speelt 0.64.0 op een AMD Radeon RX 9070 XT. Zijn benchmark geeft gemiddeld 24 fps op Ultra, het advies is "Hoog",
en ook op Laag hapert het. Hier staat wat uit de code bewezen is, wat een hypothese blijft, wat 0.64.1 verandert en wat
Nikky als eerste kan doen. Niets hieronder is op zijn pc gemeten: dat kan met de nieuwe knop "Kopieer technische info".

## Bewezen (code gelezen, met test)

| Bevinding | Bewijs | Gevolg |
|---|---|---|
| Op het resultaatscherm was de muisaanwijzer onzichtbaar: `body.trailer-on, body.trailer-on * { cursor: none !important }` bleef gelden tot de kaart gesloten was (`fadeOutTrailer` haalt de klasse pas weg na de kaart). Dat verklaart "hij kan niks klikken op dat scherm". | trailer.js; de pagina-test zette de klasse nooit. | Opgelost: klasse `tr-result-open` zet de aanwijzer terug; `scripts/gpudiag_test.mjs` en `benchmark_card.page.js` controleren het. |
| Het advies sprak van "Hoog" maar paste Ultra toe. `recommendProfile` kent laag/middel/hoog, `profileWord('hoog')` is "Hoog", maar het preset `hoog` heet sinds #893 Ultra; `applyPreset` zet dus Ultra aan. Een run zonder haperingen op Hoog kon zo naar Ultra sturen. | benchstats.js, gfxprofile.js (`LABELS`), trailer.js `advise`. | Opgelost: `recommendStand` over de vier standen, Ultra pas bij veel ruimte (90 fps, 1%-low 55). Test in `benchstats_test.mjs`. |
| Dynamische resolutie speelt in de benchmark geen rol: `noteFrame` wordt alleen vanuit de hoofdlus (main.js) aangeroepen, en de benchmark draait zijn eigen rAF-lus. Eén hapering telt in `noteFrame` ook niet (mediaan per seconde). | main.js:1008, trailer.js `loop`. | Uitgesloten als oorzaak van de lage score. |
| De frame-cap (Zuinige modus) speelt in de benchmark geen rol: `skipFrame` komt niet in trailer.js voor. | grep. | Uitgesloten, tenzij de verversing zelf laag is (zie rAF-frequentie in de diagnose). |
| De GPU-herkenning is niet de oorzaak: `classifyGpu` geeft de RX 9070 XT (`rx\s?\d`) klasse hoog; onbekende kaarten zijn hoog, behalve software. De klasse stuurt alleen het advies bij de eerste start. | `gpudiag_test.mjs` (RTX 4080/5090, RX 6600/7900/9070, Arc A en B, iGPU's, SwiftShader, onbekend merk). | Alleen Arc B-serie is verbeterd (was "iGPU-Arc"). |
| De benchmark mat de eerste seconden van de eerste shot mee (shader-compilatie, laatste streaming). | `MEASURE_AFTER_CUT_S` was 0,3 s voor elke shot. | Eerste shot slaat nu 1,5 s over; een lage uitkomst (< 45 fps) wordt één keer opnieuw gemeten, de beste telt. |
| De route telde de cutscene-shots (anita, vitrine: filmlicht) mee in het hoofdgetal. | trailer.js `computeStats`. | Nieuw: "fps in het spel" zonder cutscenes, het advies rekent met dat getal; het gemiddelde per categorie stond er al. |

## Hypothesen (niet bewezen, de diagnose moet het uitwijzen)

Laag hapert ook, dus de oorzaak zit in wat alle standen delen.

1. **Verkeerde GPU.** Ryzen-processors hebben een kleine ingebouwde videokaart. Zit de monitorkabel op het moederbord, of
   kiest Windows de ingebouwde, dan tekent het spel daarop. `force_high_performance_gpu` in desktop/main.js is een
   Chromium-vlag die op Windows niet bewezen de adapter kiest; de Windows-instelling per app wel. Diagnose: "WebGL-renderer"
   en "Soort" in het blok. Nu ook een waarschuwing in Instellingen › Beeld.
2. **Software of verkeerde ANGLE-backend.** RDNA 4 is van begin 2025; een oudere Chromium kan de driver niet kennen en op
   software of een trage backend uitkomen. Diagnose: "ANGLE-backend", "Soort" (WebGL zonder softwarevangnet geweigerd) en de
   functielijst van het hoofdproces (`webgl`, `gpu_compositing`, `gpu_rasterization` moeten `enabled` zijn).
3. **Shader-compilatie-hitches op AMD/D3D11.** De hapering-log (laatste 60 s) toont per beeld > 50 ms hoeveel nieuwe
   shaders er net bij kwamen, de langste taak en een heapdaling (opruimen). Veel regels met "nieuwe shaders" bevestigen dit.
4. **Hoofdthread (tegelstreaming, opruimen, HUD).** De log toont taken en heapdalingen; "De stad per beeld" toont drawcalls
   en driehoeken. Een hoge CPU-tijd met lage GPU-tijd wijst hierheen.
5. **DPI-schaling.** Op 4K met schaal 150% of 200% is het tekenvlak groot; "devicePixelRatio" en "Tekenvlak" staan in het blok.
   scene3d.js begrenst de pixelverhouding op 2.
6. **Achtergrondvenster of een tweede scherm.** `backgroundThrottling` staat aan (desktop/main.js:138): een verborgen of
   geminimaliseerd venster tekent trager. "Verversing (rAF)" en "zichtbaar, focus" staan in het blok.
7. **Ultra zelf.** Ultra is het zwaarst (lange zichtafstand, ca. 400 drawcalls meer in de stad volgens het preset-commentaar);
   dat verklaart 24 fps op Ultra niet voor Laag. Niet gemeten of 0.64.0 hier duurder is dan 0.63.0.

## Niet gedaan

- Geen meting van 0.63.0 tegen 0.64.0: deze worktree heeft geen gebouwde wereld en de machine is druk (andere agents).
- Geen Electron-vlaggen veranderd (`--use-angle`, `--ignore-gpu-blocklist`): zonder bewijs van de backend op Nikky's pc is dat
  gokken, en de blocklist negeren kan op een slechte driver crashes geven.
- Treinen die elkaar overlappen in de spoor-shot en de resultaatkaart in zeefdruk-stijl: niet in deze ronde.
- De Electron-kant van de knop (`desktop/gpuinfo.cjs`, kanaal `gde:gpu-info`) en de dialoog zijn niet in een draaiend
  venster bekeken; alleen de pure delen zijn getest (`scripts/gpudiag_test.mjs`). Alles hiervan staat als "nog niet bekeken".

## Checklist voor Nikky

1. Open Instellingen › Beeld › Diagnose › **Kopieer technische info** (of druk Ctrl+Shift+G; of start het spel met `?gpuinfo=1`).
   Wacht 3 seconden tot "Gekopieerd" staat en plak het in een bericht aan de eigenaar. Dit blok bevat alleen technische gegevens.
2. Staat er een waarschuwing onder Diagnose, of bij "Soort" `integrated` of `software`: kies in Windows Instellingen ›
   Systeem › Beeldscherm › Graphics de snelle videokaart voor GDE Groningen (Hoge prestaties) en sluit en start het spel opnieuw.
   Zit de kabel van je beeldscherm in het moederbord, steek hem dan in de videokaart.
3. Zet Beeld op **Hoog** in plaats van Ultra en draai de benchmark opnieuw; sluit eerst andere programma's. Een meting met
   een lange hapering vraagt zelf om een nieuwe keer.
4. Meld op welk scherm het spel staat (hoofdscherm of tweede) en de verversingssnelheid (Windows › Beeldscherm › Geavanceerd).
5. Eerste ingreep als het blok software of een rare backend toont: een nieuwere Electron (nieuwere Chromium, kent RDNA 4 beter)
   of, als hypothese om te proberen, de vlag `--use-angle=d3d11` of `--use-angle=vulkan`. Pas na het blok kiezen.
