# Trailers: wat is gecontroleerd (#63)

Drie trailers uit het echte spel (geen nagebouwde beelden): een **gameplaytrailer** (78,0 s), een **verhaaltrailer** (87,4 s) en een langere **showcase-trailer** (162,9 s, schaal en proces; staat alleen in het uploadpakket, niet in git), alle 1920x1080 op 60 beelden per seconde, H.264 + AAC. Reproduceren: [scripts/trailer/README.md](../scripts/trailer/README.md).
Het pakket staat buiten git in `C:UsersabuisGITGDE-uploadpakket2` (de oude map staat er niet meer naast: de eigenaar had hem al vervangen). Er is **niets** geüpload of gepubliceerd (constitution 8); in het pakket staat een uploadplan met alles op Privé.

## Eisen van de eigenaar en hoe ze zijn aangepakt

| Eis | Aanpak |
|---|---|
| A. Nieuwste main, preset Hoog, nieuwste UI | Build van main op het moment van opnemen (zie "Bron"), preset `quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false`. Alle schermen zijn die van het spel zelf (pauzemenu, kaart, garage met 3D-voorbeelden, Opgeslagen spellen, Samen spelen); de opnames na de laatste main-wijzigingen zijn opnieuw gedaan. |
| B. Geen inladende mapdelen | Opnemen met een vaste tijdstap (1/60 s, geen echte klok) en voor elk beeld wachten tot tegels, gebouwen, wegen en de geometrie-worker klaar zijn; zie "Controle van het beeld". |
| C. Audio zonder dips | Eén mix per trailer met ducking in plaats van losse stukken; alleen schone stukken van de Gemini-nummers uit `game/audio/gmusic`; eigen effecten uit ffmpeg-synthese; de stemmen zijn de bestaande opnames van het spel (geen nieuwe TTS). |
| D. Montage | Snijden op de maat (135,469 en 119,474 bpm, analyse in `scripts/trailer/audio/analyze_music.mjs`), hook binnen 3 s, opbouw, slotkaart met "GDE Groningen – Zomer vol misdaad" en de 18+-aanduiding, geen echte merken of personen, geen namen van testers (alleen "NatusPella"), geen HUD of debug in beeld. |
| E. Controle | Dit document, de rapporten per trailer in `controle/` van het pakket en de beeldbladen (één beeld per seconde). |

## Bron en instellingen

- Branch `claude/trailer-nieuw`; de opnames zijn gemaakt met de game uit de merge van `origin/main` (50b43834, 22 oktober 2026 rond 21:15) in
  die branch (commit a384324f), gestaged met `GDE_PREBUILT_WORLD` uit de release-build `s5-rel2` van 21 oktober (de wereld is data en verschilt niet per commit).
- Opnemen: `desktop --clip` (frameloos venster van precies 1920x1080), wegwerpprofiel, `--stil`, instellingen `cinematicMoments=false`,
  ondertitels `extragroot` met contrast `hoog` (alleen tijdens de opname, niet opgeslagen).
- Wat het spel zelf toont: de ondertitels en naamkaarten van de filmpjes, de menu's en de wereld. Er is geen aparte trailer-HUD. De HUD (minikaart, nieuwskaart, doel)
  staat uit; de doelmarkeringen van het spel (zuil, ring, pictogram) zijn verborgen omdat de camera er anders dwars doorheen vliegt.
- Alle gesproken regels zijn bestaande opnames uit `game/audio/voicelines`; regels zonder opname staan alleen als ondertitel. De muziek is
  `Zomerse_droom_in_de_Stad` (gameplay) en `Goudgeld_op_de_oprit` (verhaal), met eigen effecten (zoefjes, klappen, regen, motor, bellen, klok).

## Wat er sinds de eerste versie bij is gekomen

- **De hele provincie:** het kaartscherm van het spel uitgezoomd over heel Groningen met Friesland, Drenthe en Duitsland en daarna inzoomend op de stad (de mist van de stadskaart is vooraf op een speelbaar niveau gezet, nu 16% verkend; de basiskaarttegels zijn voor de opname doorlopen, dus ze laden niet in beeld), korte vluchten laag boven kust, dorpen, polder, vesting en haven, en een rit/vlucht door meerdere streken.
- **Minigames:** zeven opgenomen met hun eigen HUD (kermis, kartbaan, zwembad, discgolf, waterski, klimtoren, skatepark, pitch & putt); het aantal komt uit het cijferblad (17 activiteiten, zonder de minigames van de verhaalmissies).
- **Cijferoverlays:** alleen cijfers uit het cijferblad van de schaalmeting (commit 50b43834, 21 oktober); de montage leest ze per id en stopt als een id ontbreekt. Er staat geen getal hard in een plan. Bij "Samen spelen" staat "tot vier spelers" (het spel ondersteunt tot vier; in beeld zijn er twee).
- **Slotregel:** "Gebouwd met AI in 34 dagen. Gestuurd door mensen." (de 34 uit het cijferblad).
- **Showcase-trailer:** kaarten voor cijfers, commits per dag (uit het blad), AI-sessies (een ondergrens), projectbord als gemeten aantallen, de echte uitvoer van vier testscripts, het laatste testrapport (niet groener gemaakt) en een schatting in rood met bandbreedte. Alleen die ene video noemt het bedrijf en het event, op verzoek van de eigenaar.

## Controle van het beeld

- **Vaste tijdstap en wachten op de wereld:** voor elk opgenomen beeld loopt het spel op 1/60 s en wacht de opname tot er niets meer te streamen valt
  (kleine tussenbeelden van 0,02 ms die niet meetellen in de beeldklok). Per clip staat in het zijbestand (`<clip>.json`) hoeveel tussenbeelden nodig waren
  (bijna altijd 0, hooguit 7) en elke verandering in de scène-handtekening (gebouwen, gevels, wegen, geometrieën).
- **Gevonden na de eerste controle (en opgelost):** een schermfade van het spel (`#train-fade`) die tijdens een vlucht of treinopname het beeld donker maakte (nu verborgen en een andere trein gekozen); doelmarkeringen; de provinciekaart toonde 0,1% verkend (mist nu vooraf gezet).
- **Samen spelen:** in coöp-modus laadt het spel de gebouwen pas na een paar seconden terwijl het streamen al "klaar" meldt; de coöp-opname wacht daarom 400 beelden
  extra en is daarna met het oog nagekeken (gebouwen aanwezig, beide spelers in beeld).
- **Per beeld nagekeken:** beide trailers zijn met beeldbladen (één beeld per seconde) en close-ups bekeken. Gevonden en opgelost: paarse kleurzweem door het samenvoegen van
  bijschriften in YUV (nu in RGB); bijschriften over de menu's (weggelaten daar); een zwevend doelpictogram dat de camera binnenvloog (verborgen en de rit verplaatst);
  de wereld met HUD in de eerste beeldjes van de menu-opnames (menu opent nu vóór de opname); een donker eindstuk van de marktclip (ingekort); een vastlopende rit
  door stilstaande geparkeerde auto's na een wijziging in main (blokkades vooruit worden weggehaald); een filmpje dat het spel pauzeerde na het hoofdmenu.
- **Automatische controle** (`check_video.mjs`): 0 dubbele beelden, zwart alleen in de fade van begin en einde. De "pop-in verdacht"-lijst (38 en 42 plekken) bestaat vooral uit
  snelle beweging langs gevels en uit bedoelde camerasneden binnen een clip; de vier grootste verschillen per trailer zijn bekeken (twee opeenvolgende beelden en hun verschil): geen tegel of gebouw dat ineens verschijnt. Dit
  is dus een controle met het oog op de verdachte plekken, geen bewijs per pixel.

## Controle van het geluid (`check_audio.mjs`, per 100 ms, vastgehouden omhullende van 300 ms)

| | Gameplaytrailer | Verhaaltrailer |
|---|---|---|
| Duur | 78,0 s | 87,4 s |
| Geïntegreerde luidheid | -14,1 LUFS (doel -14 ±1) | -14,2 LUFS |
| True peak | -1,7 dBTP (max -1) | -1,5 dBTP |
| Dalingen > 6 dB zonder reden | 0 | 0 van 83 mogelijke |
| Sprongen > 6 dB zonder reden | 0 (1 bedoelde: de klap op de drop) | 0 van 42 mogelijke |
| Stiltes > 0,3 s buiten bedoelde pauzes | 0 | 0 |
| Luidheidsbereik (LRA) | 2,2 LU | 3,1 LU |

De showcase-trailer (162,9 s): -14,1 LUFS, true peak -1,6 dBTP, LRA 4,9 LU (twee nummers met een overgang van 4 s), 0 onverklaarde dalingen, sprongen of stiltes. Hij heeft geen stemmen (tekstkaarten dragen hem); één stem uit de keukenscène.

"Een reden" staat in het allow-bestand dat de montage schrijft: begin en einde (fades), de muziek die binnenkomt, de ducking onder elke stem, bewuste klappen (impact). Elke
stem krijgt een eigen niveau (-15 LUFS) en de muziek zakt er 4 tot 5 dB onder. De grafieken staan in `controle/`.

## Niet gecontroleerd

- Niet beluisterd door een mens: de geluidscontrole is meetbaar (zie boven), het oordeel over smaak en afmeting van muziek en stemmen niet.
- De trailers zijn niet op een tv, telefoon of in YouTube zelf bekeken; de leesbaarheid van de ondertitels is op 1080p beoordeeld in de beeldbladen en close-ups.
- Show­case: de testuitvoer in beeld is van vier korte testscripts, niet van de hele suite; het cijfer 424 testscripts is het aantal bestanden, niet het aantal checks. De schatting "10 tot 40 persoonsjaar" is een schatting (docs/showcase/SCHATTING.md, branch r49-schaal).
- Niet op macOS gemaakt; alleen op Windows met één Electron-instantie.
- Verhaaltrailer: de spoilerkeuze (geen twist, geen finale) is op de regels van het script beoordeeld, niet door een speler die het verhaal niet kent.
- Waargenomen en niet onderzocht (mogelijk een spelfout, geen onderdeel van deze opdracht): na scriptmatig rijden toonde Prestaties een enorm negatief getal bij "Honderd op de teller"
  (de opnames van de menu's zijn daarom in een schone sessie gemaakt); in de garage zegt het spel "Je zit erin" voor een opgeslagen voertuig terwijl de speler te voet is.
