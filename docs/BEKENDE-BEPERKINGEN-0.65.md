# Bekende beperkingen in 0.65 (concept, integratie-21-11-c)

Voor wie de nieuwe versie speelt. Eerlijk wat niet getest of niet af is. Niets hieronder is een reden om niet te spelen; het is wat je kunt tegenkomen. De feiten komen uit de agent-rapporten in de issues #1008 tot #1041 en uit `docs/*-21-11.md`; alles wat een agent niet in beeld heeft gezien staat als "nog niet bekeken".

## Samen spelen
- **Een echte sessie met vier Electron-vensters is niet gedraaid.** Bezorgen met verdeelde adressen, de pannenkoekenwedstrijd en het proefbeleg bij Bourtange (M30) zijn bewezen met pure tests en met twee en vier spelers over echte TCP-verbindingen (`samenwedstrijd_tcp_test`, `samenmissies_tcp_test`), niet met echte vensters of over internet.
- Opnieuw verbinden na een hostwissel is alleen met de pure coöptests geprobeerd (`hostwissel_test`, `coop_scenarios_test`).
- Iedereen moet op dezelfde versie zitten; verbind één voor één.

## Nog niet in beeld bekeken
- **Menu-rondes:** Spullen als tegelraster, Loopbanen met kaarten, Boerderij onder Bezit, het zoekvenster (/) en de uitleg met iconen en animatie zijn alleen met pure tests en pagina-tests bewezen. De branch `escmenu-panelen-van-kaartlagen-agent` (Spullen-lijst en Loopbanen-kruimelpad uit een eerdere menu-ronde) is niet samengevoegd: ze botst met de nieuwere menu-ronde die wel is samengevoegd.
- **Kaart:** de nieuwe kaartlagen, markerkleuren en "Zo werkt de kaart" zijn in de code en met tests gecontroleerd, het ontdekken van buurten (#990) en de Kiekdoar-nieuwskaart (#1012) zijn niet in beeld gezien.
- **Wereldkleuren (standaard 0,3):** subtiel verschoven gevels, gras, water en wegen. Verder dan 0,5 is niet bekeken; `?dswereld=0` zet het oude palet terug. De kaart en minikaart gebruiken hun eigen kleuren uit de kaartlagen en volgen deze menging niet.
- **Taxi (#1019, #1020):** de kaartkeuze met uitgeschakelde taxi en het ritpad langs gebouwen zijn alleen met tabeltests en nagebouwde straten bewezen.
- **Trekkercamera, eerste-persoonshanden, heli- en luchtroute, vaarlijn, streekpark-wegcheck, speelgebiedgrens (#1034):** met pure tests en pagina-scripts; een mens heeft ze niet gespeeld.
- **AAA-missies akte 1 tot 6 en de bijbanen:** tussen-beats, nasleep en decor zijn met pure tests bewezen; ze zijn alleen tekst (geen opnames, zie `docs/verhaal/TTS-ACHTERSTAND-21-11.md` en `-alleen-tekst.md`).

## Bekende visuele puntjes
- De uitleg-animaties (toets indrukken, houden, klikken) duren 1 seconde per ronde; het designsysteem vraagt hooguit 250 ms voor beweging. De regelaudit meldt dat als blokkerend; het is een ontwerpkeuze die nog beslist moet worden.

## Prestaties
- **Geen fps-meting gedaan.** De GPU-ronde (#1039: minder drawcalls voor duiven en meeuwen, schermvullend filter bij lage gezondheid, videokaart-schakelaars) en de wegenindex (#1042) zijn alleen met pure tests en telmetingen bewezen; de GPU-frametijd en p95 zijn niet gemeten (`docs/PERF-GPU-21-11.md`, `docs/PERF-WEGINDEX-21-11.md`).
- Geheugen (#1040): geen 10-minuten-soak (`scripts/perf/leak_soak.mjs`); "geen groei over 10 minuten" is niet bewezen. De laadtijd voor en na is niet gemeten (`docs/PERF-HEAP-21-11.md`).
- Geluid: de limiter en de ruimere buffer zijn gemeten, niet beluisterd (`docs/AUDIO-GLITCHES-21-11.md`).
- Het beeldherstel na een verloren beeldcontext (donkere sluier in plaats van wit) is alleen met pure tests en een nagebootste context-verlies bewezen, niet op een echte stuurprogramma-reset.

## Releasegate
De licht-gate is gedraaid op een schone checkout van `integratie-21-11-c`. Tests die wereldgegevens nodig hebben (`data/cache/province`, `game/world`) slaan zichzelf over en zijn niet gedraaid. De fasen zwaar, Electron, perf en visual en de AI-review draait de coördinator.
