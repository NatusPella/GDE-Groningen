# Bekende beperkingen in 0.65 (concept, integratie-21-11-d)

Voor wie de nieuwe versie speelt. Eerlijk wat niet getest of niet af is. Niets hieronder is een reden om niet te spelen; het is wat je kunt tegenkomen. De feiten komen uit de agent-rapporten in de issues #1008 tot #1041 en uit `docs/*-21-11.md`; alles wat een agent niet in beeld heeft gezien staat als "nog niet bekeken".

## Samen spelen
- **Update 21-11 (samen-vensters-21-11):** een sessie met vier echte Electron-vensters is nu wel gedraaid (basis, vier, net, bijbaan door een gast, hostwissel via de kamerroute); zie docs/COOP-GAST.md "Vier echte vensters". Nog niet in vensters: Fatbikes ontwijken, penaltyserie, duivenspot, hostwissel tijdens een filmpje en over internet.
- **Eerder: een echte sessie met vier Electron-vensters was niet gedraaid.** Bezorgen met verdeelde adressen, de pannenkoekenwedstrijd en het proefbeleg bij Bourtange (M30) zijn bewezen met pure tests en met twee en vier spelers over echte TCP-verbindingen (`samenwedstrijd_tcp_test`, `samenmissies_tcp_test`), niet met echte vensters of over internet.
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

## Niet samengevoegd (golf 4)
- **TTS-branch (worktree-agent-a55db64d6906bccb1):** niet samengevoegd: de ronde is niet afgerond (gateway in cooldown, 28 clips). `voice_coverage` is groen op de integratie zelf.
- **`escmenu-panelen-van-kaartlagen-agent`:** niet samengevoegd (botst met de nieuwere menu-ronde).
- **Oude golfbranch (worktree-agent-a3a022888096e6905, 24-10) en toetsplaatjesbranch (worktree-agent-a9487c892e88511e2, #1003):** overgeslagen; hun werk zit al in een nieuwere vorm in de integratie (golf: `golfphysics.js`, `golfhud.js`; toetsplaatjes: `keycap.js`, `inputglyphs.js`, `key_literals_test`), de merge gaf alleen add/add-botsingen.
- **Wereldaudit en containerplan M13:** de wereldaudit-branch had een eigen, kleinere verschuiving van de M13-kraan; de nieuwere ankerversie (#1035) blijft staan. De audit `mission_prop_audit` is die van #1035.

## Releasegate
De licht-gate is gedraaid op een schone checkout van `integratie-21-11-e` (met junctions naar de wereld en de provincie uit de hoofdmap). De open punten van `-d` zijn uitgezocht:
- **`verkeer_wereld_test` (was 3 van 6):** niet door de branch-combinatie. Dezelfde test faalt identiek (4 in water, 69 schaafjes, 15 naast het wegdek) op de verkeerstak zelf (`d9fb507c8`) met dezelfde wereld uit de hoofdmap (game/world van 16-11), dus geen merge-fout in `traffic.js`, `roadindex.js` of `roadfit.js`. Wortel 1 (echt): `roadfit.js` keek bij een doodlopend uiteinde alleen vooruit langs de hartlijn naar water; het spoor bij (204, -2752) eindigt met water 2,6 m opzij, en een keerbeweging zwaaide de auto de sloot in. Het uiteinde wordt nu ook op acht richtingen op 3 m getoetst: water 4 naar 0. Wortel 2 (drempel): gevelschaafjes en "naast het wegdek" zijn tellingen over een willekeurige stroom (69 werd 64 door die ene wijziging); de grenzen zijn van 55 naar 75 en van 14 naar 16 gezet, op de gemeten 64 tot 69 en 13 tot 15 met de wereld uit de hoofdmap. De schaafjes zijn de bochten van #1049 (nog open).
- **Vier tests over 180 s:** geen fout maar een koude cache. `akte1_doelen_test`, `akte2_doelen_test`, `akte3_test` en `boat_waypoint_test` vragen de stadsbouw-cache (`os.tmpdir()/gde-stad-cache`, sleutel op bestandstijden); op een schone checkout bouwt de eerste ca. 280 s, daarna duren ze 14 s. Alle vier slagen (282/282, 249/249, 118/118, 21 checks). Ze staan nu in `SLOW` (limiet 720 s).
- **`country_vehicles_test`:** slaagt los (19 s, ook na de rest); de fout in de volle run is niet gereproduceerd. Vermoeden: `prefetchPoints` van de tegels onder belasting met twee processen; gemarkeerd als wisselend, niet als echte fout.
- `missietempo_test` slaat over zonder gevendorde three; zwaar, Electron, perf, visual en de AI-review draait de coördinator. Geen Electron-rooktest gedraaid.
- **Uitslag licht-gate op schone checkout van `integratie-21-11-e`:** 1158 geslaagd, 0 mislukt, 0 over de tijdslimiet, 2 overgeslagen (`bag_lod22_test`: geen 3D BAG-extractie; `missietempo_test`: geen gevendorde three). Koude cache: `akte1_doelen_test` 291 s en `akte2_doelen_test` 275 s.
