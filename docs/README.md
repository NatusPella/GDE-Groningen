# Documentatie: begin hier

Welkom in de documentatie van GDE Groningen. Deze pagina is de ingang: per map één regel en
daaronder een alfabetische lijst van alle losse documenten. **De regels staan in de specs, niet
in de losse docs** (`.specs-fire/standards/`); een doc hier is uitleg, naslag of geschiedenis en
verwijst bovenaan naar zijn spec. Wijkt een doc af van de code, dan is de doc de fout.

## Begin hier

| Wil je... | Lees |
|---|---|
| weten hoe je het spel bouwt en draait | [ONTWIKKELEN.md](ONTWIKKELEN.md) |
| weten hoe je test | [TESTEN.md](TESTEN.md) en [AGENTS.md](../AGENTS.md#testen) |
| een release maken | [RELEASEN.md](RELEASEN.md), [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md) |
| de publicatie of 1.0 voorbereiden | [1.0-TRACK.md](1.0-TRACK.md) |
| de canonieke regels van een systeem | [.specs-fire/standards/](../.specs-fire/standards/) (wereld, mechanica, verhaal, multiplayer, ui-taal, publicatie) |
| het verhaal, de personages en de scripts | [verhaal/README.md](verhaal/README.md) |
| de architectuur in één kaart | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| iets uit het verleden terugzoeken | [archief/](archief/) (met archiefkop en "vervangen door") |

De werkafspraken en de constitutie staan in [../AGENTS.md](../AGENTS.md); die wint bij twijfel.

## Mappen

| Map | Wat erin staat |
|---|---|
| [verhaal/](verhaal/) | het verhaal, de scripts, de stijlgids, de TTS- en vertaaldocumenten (zie de eigen ingang) |
| [missies/](missies/) | het AAA-upgradeplan voor alle missies: rubriek, scores, bouwstenen en uitvoeringsplan ([AAA-UPGRADEPLAN.md](missies/AAA-UPGRADEPLAN.md)) en de bouwstenen voor de missie-agents ([BOUWSTENEN.md](missies/BOUWSTENEN.md)) |
| [steam/](steam/) | winkelpagina, trailer-cut en beelden voor Steam |
| [youtube/](youtube/) | kanaalteksten, trailerscripts, thumbnails en beelden |
| [showcase/](showcase/) | beelden en tekst voor presentatie en portfolio |
| [screenshots/](screenshots/) | schermafbeeldingen (geen documentatie) |
| [archief/](archief/) | oude plannen en reviewverslagen, met datum en "vervangen door …" |

## Alle losse documenten

| Document | Waar het over gaat |
|---|---|
| [1.0-TRACK.md](<1.0-TRACK.md>) | Deze pagina bundelt wat er voor de publicatie en 1.0 lokaal is gedaan en wat alleen de eigenaar |
| [3d-model-prompts.md](<3d-model-prompts.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [ANDROID.md](<ANDROID.md>) | Lokaal bouwbare debug-APK van het spel (Capacitor-WebView rond de webversie). Alleen voor testen: niets upl… |
| [ARCHITECTUUR-STAD-NAAR-TEGELS.md](<ARCHITECTUUR-STAD-NAAR-TEGELS.md>) | *Migratieplan voor issue #90, 17 oktober 2026 (stand 0.34 + Unreleased). Historisch: de migratie is |
| [BAG-LOD22.md](<BAG-LOD22.md>) | Besluit van de eigenaar: de 3D BAG-modellen (LoD 2.2: echte daken met dakkapellen, overstekken en schoorste… |
| [BOERDERIJ.md](<BOERDERIJ.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [BEZIT-21-11.md](<BEZIT-21-11.md>) | Werkdocument. Onderzoek, data-audit en ontwerp van de epic Bezit: koopbare percelen en panden in de hele provincie (13.883 percelen, 370.144 panden), prijsmodel, bezit-opslag, productieketen, AI-personeel, Samen spelen en het stappenplan met werkpakketten. Gemeten met `scripts/world/percelen_audit.mjs`. |
| [COOP-GAST.md](<COOP-GAST.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [COOP-OPSLAAN.md](<COOP-OPSLAAN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/multiplayer.md`](../.specs-fire/standa… |
| [COOP-OVERDRAGEN.md](<COOP-OVERDRAGEN.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [COOP-TESTBANK.md](<COOP-TESTBANK.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [CREDITS.md](<CREDITS.md>) | Iedereen die meehielp, op volgorde van bijdrage, met de meetmethode en wat de eigenaar nog moet goedkeuren. |
| [CUTSCENE-AUDIT-21-11.md](<CUTSCENE-AUDIT-21-11.md>) | Uitkomsten van de statische cutscene-linter (laag 2 van het cutscene-kwaliteitssysteem) op alle 204 cutscenes: aantallen per regel, de elf blokkerende vondsten, de 20 slechtste en wat de verhaal-lead (WP15 regie #1138, WP11 dialoogvorm #1134) moet fixen. |
| [CUTSCENE-FAALLIJST-21-11.md](<CUTSCENE-FAALLIJST-21-11.md>) | De faallijst van de cutscene-linter: wat bestaande cutscenes nu laat falen (blokkerend per regel en de belangrijke vondsten per cutscene); de release is pas groen als hij leeg of uitgezonderd is. Gemaakt met `node scripts/cutscene_lint.mjs --lijst`. |
| [CUTSCENE-ANIMATIE-20-11.md](<CUTSCENE-ANIMATIE-20-11.md>) | Werkdocument bij het idee van de eigenaar: audit van de animatie in cutscenes (bibliotheek, opbouw, tellingen per animatie, stilste scènes), het pose-clipsysteem met 47 gebaren en 11 kat-clips, de regiesjablonen, waar het is toegepast en wat niet is gezien (#955, #956). |
| [CUTSCENE-AUDIT-OPUS-21-11.md](<CUTSCENE-AUDIT-OPUS-21-11.md>) | Kwalitatieve audit van 28 cutscenes (zonder Electron): wat werkt, wat niet, top-10 verbeterpunten, humor-structuur (grappenbank), prioriteitenlijst voor verhaal-epic (#1138, #1134, #1125). Code-lezing door Opus 5.5. |
| [CUTSCENE-REGIE-21-11.md](<CUTSCENE-REGIE-21-11.md>) | Canon. De regie-bijbel van dit spel: shot-taal, toon, ondertitels, introducties, emotie-camera, continuïteit, open-wereld regels, anti-patronen, 30 toetsbare regels (R-xx), panel-werkwijze voor humor, rol van de eigenaar. Voor makers, reviewers en eigenaar. |
| [DESIGN-AUDIT-CSS.md](<DESIGN-AUDIT-CSS.md>) | Naslag (#980, fase 1). Telling van wat de acht UI-CSS-bestanden feitelijk gebruiken (kleuren, radii, lettergroottes, ruimte) tegen [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)… |
| [DESIGN-BEDIENING.md](<DESIGN-BEDIENING.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [DESIGN-COMPONENTEN.md](<DESIGN-COMPONENTEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [DESIGN-SAMEN-SPELEN.md](<DESIGN-SAMEN-SPELEN.md>) | How the UI of Samen spelen (multiplayer) looks and behaves, and what every new screen has to answer about i… |
| [DESIGN-SCHULD.md](<DESIGN-SCHULD.md>) | Where the code differs from [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) and its detail pages, found by reading… |
| [DESIGN-AUDIT-UI-21-11.md](<DESIGN-AUDIT-UI-21-11.md>) | Inventaris van alle UI die nog niet via het designsysteem loopt (issue #1064): aantallen voor en na, wat is omgezet, wat bewust blijft en wat een beeldverificatie vraagt. |
| [DESIGN-STAND-21-11.md](<DESIGN-STAND-21-11.md>) | Stand per issue van het designsysteem-epic (#991 tot #1006) op 21-11: gedaan met bewijs, open en volgende stap. |
| [HUD-TYPO-21-11.md](<HUD-TYPO-21-11.md>) | Typografische schaal van de HUD-kaarten: vijf rollen, audit van alle kaarten en wat de test bewaakt. |
| [DIALECT-CONTROLE.md](<DIALECT-CONTROLE.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [EIGENAAR-ACTIELIJST.md](<EIGENAAR-ACTIELIJST.md>) | Eén blok per eigenaar-issue: wat de eigenaar doet, wat er in de repo klaarstaat en wat een agent niet mag of kan. |
| [FARMING-AUDIT-20-11.md](<FARMING-AUDIT-20-11.md>) | Werkdocument bij de feedback van de eigenaar: audit van de boerderij (schermen, HUD, kaart, wereld), het ontwerp van de lus en de veldstanden, wat er is gebouwd en wat niet (#985, #980). |
| [FARMING-SPEELRONDE-20-11.md](<FARMING-SPEELRONDE-20-11.md>) | Verslag van een speelronde over de hele boerderijlus (beeldbank, 1280x720): wat is gefixt (water op de rijen, dubbele kaart, HUD-overlap, toestand per veld, pin ver uitgezoomd), wat niet en wat niet gezien is (#985, #980). |
| [KEYS-AUDIT-20-11.md](<KEYS-AUDIT-20-11.md>) | Naslag (#1003, #985). Telling van toets-iconen, tekstkeycaps en zinnen met toetsnamen per scène, met toetsenbord en controller, en wat is omgezet. |
| [KEYCAP-MAAT-21-11.md](<KEYCAP-MAAT-21-11.md>) | Naslag en ontwerpbesluit (#1075). Toetsplaatjes als inline zetwerk: maat als factor van de tekst, uitlijning uit de fontmetrics, nowrap-eenheden, voor/na per context en de beeldchecks die nog nodig zijn. |
| [LIGHT-SIMS-AUDIT-20-11.md](<LIGHT-SIMS-AUDIT-20-11.md>) | Werkdocument bij de feedback van de eigenaar over de light sims: inventaris en keuze van vijf (hengelen eerst), per sim de audit, wat er is gebouwd (gedeelde HUD-strook, wereldfeedback, uitleg) en wat niet (#985, #980). |
| [GEBIEDEN.md](<GEBIEDEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/wereld.md`](../.specs-fire/standards/w… |
| [GELUID.md](<GELUID.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [IARC-ANTWOORDEN.md](<IARC-ANTWOORDEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [INPUT-LATENTIE.md](<INPUT-LATENTIE.md>) | Meetmethode en budget voor input-latentie (toets tot eerste frame met positieverandering), met de gemeten p50/p95. |
| [INCLUSIEVE-TAAL.md](<INCLUSIEVE-TAAL.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [INVULBLAD-EIGENAAR.md](<INVULBLAD-EIGENAAR.md>) | Stand: 19 oktober 2026. Niets is verstuurd, geüpload of ingesteld. Dit blad |
| [INTOCHT.md](<INTOCHT.md>) | De intocht na een verovering: wachtrij, acht scènes, terugkijken en de host-only-regel (#704). |
| [KAART-GEBIEDEN-20-11.md](<KAART-GEBIEDEN-20-11.md>) | Kaart en minikaart: kleuren uit de ds-tokens (`kaartkleuren.js`) en de vier gebiedstoestanden (onzichtbaar, zichtbaar, bezig, veroverd). Naslag; de kaartregels staan in de specs wereld en ui-taal. |
| [KANALEN.md](<KANALEN.md>) | Input voor #92 (minder ruis, meer visuele communicatie), uit #104 (één planner). Dit bestand wordt gemaakt… |
| [LEEFTIJD.md](<LEEFTIJD.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [LEGAL-AI-ASSETS.md](<LEGAL-AI-ASSETS.md>) | Dit is geen juridisch advies. Het is een leesverslag door een AI-assistent |
| [LICENTIES.md](<LICENTIES.md>) | Stand van 3 oktober 2026. Dit is een inventaris en een advies, geen |
| [LOOPBAAN.md](<LOOPBAAN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [MERKENCHECK.md](<MERKENCHECK.md>) | Datum: 17 oktober 2026. Geen juridisch advies. |
| [MERKENREGISTER.md](<MERKENREGISTER.md>) | Stand: 18 oktober 2026. Dit register hoort bij de constitution in |
| [MOBIEL-RAPPORT.md](<MOBIEL-RAPPORT.md>) | Gemeten en bekeken in Electron met Chromium-apparaatemulatie (`--emulate-mobile`, touchbediening geforceerd… |
| [MISSIEBALANS.md](<MISSIEBALANS.md>) | Branch-aware missiecurve, uitschieters en de ontwerpregel voor lange/korte missies (#829). |
| [MULTIPLAYER-VISIE.md](<MULTIPLAYER-VISIE.md>) | De visie van de eigenaar (besluiten van 23-10, 24-10 en 6-11), op één plek. In gesprekken zeggen we multipl… |
| [MUZIEK.md](<MUZIEK.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [MUZIEK-GEBRUIK-20-11.md](<MUZIEK-GEBRUIK-20-11.md>) | Alle muziekbestanden van de eigenaar en waar ze in het spel spelen (20-11). |
| [MUZIEK-TE-VRAGEN.md](<MUZIEK-TE-VRAGEN.md>) | Wat aan muziek gekoppeld is (alles) en wat de eigenaar nog moet leveren; uitkomst van de audiograafcontrole (#986, #988). |
| [MUZIEK-OPDRACHT-GEMINI.md](<MUZIEK-OPDRACHT-GEMINI.md>) | Negen missiesferen met een kant-en-klare Gemini-prompt, de missies waarvoor ze zijn en hoe je een bestand toevoegt (#988). |
| [ONBOARDING.md](<ONBOARDING.md>) | Doel: zien of iemand die de game niet kent in de eerste dertig minuten begrijpt wie hij is, |
| [OPSCHONEN-20-11.md](<OPSCHONEN-20-11.md>) | Opschonen van scene3d.js, missions.js en main.js (#497): wat verplaatst is naar welke module, wat bewust is overgeslagen en waarom. |
| [ONTWIKKELEN.md](<ONTWIKKELEN.md>) | Developer notes (in English, like ARCHITECTURE.md): test switches, |
| [PERF-LAADHANG-0.56.1.md](<PERF-LAADHANG-0.56.1.md>) | Onderzoek naar de melding dat 0.56.1 op sommige machines in het laadscherm bleef |
| [LAAD-STREAMING-LOD.md](<LAAD-STREAMING-LOD.md>) | Wat er tijdens laadschermen en daarbuiten gebeurt: fasen, streaming, LOD-ringen, vergelijking met 0.54.0 en bevindingen. |
| [PERF-TREND-0.54-NAAR-NU.md](<PERF-TREND-0.54-NAAR-NU.md>) | Prestatietrend sinds 0.54.0: tijdlijn per tag, statische maten en vaste opwarmbudgetten. |
| [UI-INVENTARIS-OUD-20-11.md](<UI-INVENTARIS-OUD-20-11.md>) | Naslag (#985, 20-11). Welke schermen buiten het menu nog donker glas en oude lettertypen droegen, wat is omgezet naar de zeefdruk en wat bewust blijft. |
| [ZFIGHT-METING.md](<ZFIGHT-METING.md>) | Meting van z-fighting (#917, #919): dieptestap per afstand en near, positieve controle, wisselpixels per plek bij near 0,5, 1,5 en 2,5, en het besluit over het dynamische near. |
| [PERF-PLEISTERS.md](<PERF-PLEISTERS.md>) | Inventaris van prestatie-pleisters sinds 0.54.0 (schadelijk, maskerend, legitiem) met oorzaken en een schrapvolgorde. |
| [BENCHMARK-STERKE-PC-21-11.md](<BENCHMARK-STERKE-PC-21-11.md>) | Waarom de benchmark op een sterke pc (RX 9070 XT) laag uitkomt: hypotheses, wat bewezen is, wat niet, en een checklist voor de speler. |
| [PERF-METING-2026-10-19.md](<PERF-METING-2026-10-19.md>) | Dit is de actuele meetbron voor prestaties (zie `.specs-fire/standards/mechanica.md`, |
| [PERF-BESLUITEN.md](<PERF-BESLUITEN.md>) | Bewuste prestatiebesluiten en de onderbouwing per punt. |
| [PERF-STREAM-SOEPEL-21-11.md](<PERF-STREAM-SOEPEL-21-11.md>) | Soepeler streamen: één framebudget, bewegingsgericht vooruitladen en stabiele LOD-overgangen (#1016, #1052, #1008). |
| [HUD-LINKS-21-11.md](<HUD-LINKS-21-11.md>) | De locatiekaart en de politiechip links in de HUD (#1079): regel, meting en chip. |
| [WITTE-RUIS-21-11.md](<WITTE-RUIS-21-11.md>) | Witte ruis in het spel: bronnen, oorzaken en maatregelen (#1084). |
| [PERCEELRANDEN-21-11.md](<PERCEELRANDEN-21-11.md>) | Perceelranden: klassen en hoogten van randen rond percelen. |
| [TREINEN-LIVE-21-11.md](<TREINEN-LIVE-21-11.md>) | Live treinvertragingen op de vertrekborden (#1085). |
| [KEUZESCHERMEN-21-11.md](<KEUZESCHERMEN-21-11.md>) | Keuzeschermen die de speler onderbreken (#1091). |
| [SPULLEN-3D-21-11.md](<SPULLEN-3D-21-11.md>) | Spullen in 3D in het pauzemenu (#1086). |
| [KLEDING-21-11.md](<KLEDING-21-11.md>) | Kleding als eigen systeem: stukken, kast per personage, winkel, NPC-outfits, Samen spelen (epic Kleding). |
| [KLEDING-TEKSTEN-21-11.md](<KLEDING-TEKSTEN-21-11.md>) | Teksten die kleding noemen: wat is aangepast en wat blijft. |
| [KLEDING-VERIFICATIE-21-11.md](<KLEDING-VERIFICATIE-21-11.md>) | Wat van de kleding nog in beeld bekeken moet worden. |
| [MINIMAP-PIJLEN-21-11.md](<MINIMAP-PIJLEN-21-11.md>) | Pijlen op de minikaart naar het doel. |
| [KAART-HEADING-21-11.md](<KAART-HEADING-21-11.md>) | Wie ben jij op de kaart: plek en kijkrichting per besturingsmodus (#1141). |
| [VOETBAL-SIM-21-11.md](<VOETBAL-SIM-21-11.md>) | Voetbal Sim Light in de Euroborg (#981). |
| [VERHAAL-ANALYSE-21-11.md](<VERHAAL-ANALYSE-21-11.md>) | Verhaalanalyse: kan een speler met nul context het verhaal volgen? Top-20 problemen, ruggengraat per akte, introductie- en dialoogregels, tussenscènes, recap-kaart, ontgrendeling per akte en uitvoeringsplan.
| [VOETBAL-CARRIERE-21-11.md](<VOETBAL-CARRIERE-21-11.md>) | Ontwerp van de voetbalcarrière (epic #1106): boog, seizoenen, ontwikkeling, manager, economie, clubbezit, UI, Samen spelen en stappenplan. |
| [VOETBAL-CARRIERE-VERIFICATIE-21-11.md](<VOETBAL-CARRIERE-VERIFICATIE-21-11.md>) | Voetbalcarrière: wat gebouwd en getest is, de sim-testbank en de lijst wat nog in beeld te controleren valt.
| [BOOT-SPAWN-21-11.md](<BOOT-SPAWN-21-11.md>) | Boten alleen waar dat logisch is: regel, audit en meting (boot-spawn). |
| [PERF-METING-2026-11-05.md](<PERF-METING-2026-11-05.md>) | Dit is een nieuwe, gedateerde meetbron naast `docs/PERF-METING-2026-10-19.md`. |
| [PERF-METING-2026-11-09.md](<PERF-METING-2026-11-09.md>) | Prestatiemeting 9-11-2026: verificatie na de merge (#804/#806), top-5 hitchbronnen en de eerlijke norm-uitslag. |
| [PERF-RONDE-20-11.md](<PERF-RONDE-20-11.md>) | Prestatieronde 20-11 (#985, #937, #921): statische audit van de per-frame-paden, microbenchmarks, kleine fixes, Samen-spelen-kosten per speler en wat open staat. |
| [PERF-RONDE-21-11.md](<PERF-RONDE-21-11.md>) | Prestatieronde 21-11 (#804, #937, #921): lui decoderen van de SFX, rust tussen zware wegen, layoutlezing van kaartjes, simhud en boerderij; voor/na en wat niet gemeten kon worden. |
| [PERF-RENDER-21-11.md](<PERF-RENDER-21-11.md>) | Renderprestaties over de breedte 21-11: drawcalls en triangles per preset en scene, wat de belaste machine wel en niet liet meten, en het voorstel voor gepaarde metingen. |
| [PERF-GPU-21-11.md](<PERF-GPU-21-11.md>) | GPU- en renderprestaties 21-11 (#1039): drawcalls voor en na per plek, eigenaarsverdeling, budget per preset, AMD-tips en wat niet gemeten is. |
| [PERF-PROFIEL-21-11.md](<PERF-PROFIEL-21-11.md>) | CPU-profiel van de hoofdthread in vier scenes (21-11): hitch-bronnen, top-10 hotspots, heap levend tegenover gebruikt, drie fixes met tellers en wat open staat. |
| [PERF-HEAP-21-11.md](<PERF-HEAP-21-11.md>) | Heap en geheugen (21-11, #1040): wat de JS-heap vult, losgelaten klanken en tegels, geheugenblok in de technische info, voor/na-run en wat niet gemeten is. |
| [LEKKEN-21-11.md](<LEKKEN-21-11.md>) | Geheugenlekken en stabiliteit (21-11, #1065): wat is gevonden en gefixt (padel, Fierljep, minigolf, politiehelikopter, markers, gebouwdelen), wat geen lek bleek, de lekbewaking in de technische info, wat open staat en welke Electron-soak nog nodig is. |
| [PERF-WEGINDEX-21-11.md](<PERF-WEGINDEX-21-11.md>) | Gedeelde incrementele wegenindex (#1042): een hoekpuntindex per kaart in plaats van vijf herbouwen per tegelwissel, voor/na in node (tijd, geheugen, allocaties) en wat niet gemeten is. |
| [PERF-HITCHES-21-11.md](<PERF-HITCHES-21-11.md>) | De laatste haperingen (#1008, #1046, #1015): programma-sleutelinspectie (compile tegen draw), setlichten bij het voorcompileren, graafopbouw in porties, minikaart-POI-cache, budgettabel per preset (Laag) en de Electron-metingen die nog nodig zijn. |
| [POPIN-21-11.md](<POPIN-21-11.md>) | Pop-in (#1016): meting per categorie met `scripts/qa/popin.mjs`, oorzaken (tekenstraal tegen mist, de detailring die krimpt, harde randen), fixes voor bomen, voertuigen, grasvlakken en voorladen, voor/na en wat niet bewezen is. |
| [WEER-LICHT-AUDIT-20-11.md](<WEER-LICHT-AUDIT-20-11.md>) | Audit van weer, licht en dag-nacht (#985): wat er staat, wat springt of veel kost, welke zachte overgangen er zijn bijgekomen en wat nog niet in beeld is gezien. |
| [PERSKIT.md](<PERSKIT.md>) | Perskit voor de openbare playtest: pitch, quote-waardige regels, feiten, beeld en een concept-persbericht (nog niet verstuurd). |
| [PLAYTESTPLAN.md](<PLAYTESTPLAN.md>) | Doel: zien of een speler die de game niet kent het verhaal volgt, steeds weet wat het doel is en tot het ei… |
| [PROEFSPELER.md](<PROEFSPELER.md>) | De proefspeler: de Spelbot met een menselijk profiel (`--mens`) en een playtestbundel per missie (beelden, samenvatting, reviewbrief) voor een vision-reviewer. |
| [PROEFSPELER-DOORLOOP-20-11.md](<PROEFSPELER-DOORLOOP-20-11.md>) | Doorloop van het hele verhaal (M01 t/m M30) door de proefspeler op 20-11: per missie gehaald, geskipt of niet bereikt, de gefixte blokkades (M20, M18, M30, M13) en wat een mens handmatig moet controleren. |
| [PRIVACY-EN-CREDITS.md](<PRIVACY-EN-CREDITS.md>) | Stand: 18 oktober 2026; bijgewerkt op 7 november 2026 voor de altijd-online start (#554, #583, #395, #690).… |
| [PROVINCIE-PLAN.md](<PROVINCIE-PLAN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/wereld.md`](../.specs-fire/standards/w… |
| [PROVINCIE-VERHAAL.md](<PROVINCIE-VERHAAL.md>) | Ontwerpdocument, oktober 2026, bij [PROVINCIE-PLAN.md](PROVINCIE-PLAN.md). |
| [PUBLICATIECHECKLIST.md](<PUBLICATIECHECKLIST.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [PUBLICEREN.md](<PUBLICEREN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [QA-AUDIT-2026-11-16.md](<QA-AUDIT-2026-11-16.md>) | Onafhankelijke QA-audit van 0.65.0: scorekaart, de bevindingen en hun fixes, de open risico's (Samen spelen, M02, TTS) en wat niet is getest. De bewijsbeelden staan in een worktree en niet in git. |
| [QA-START-VAN-MENU-AF.md](<QA-START-VAN-MENU-AF.md>) | Het oude startscherm (`runMenuScreen`, `#start-screen`) is alleen nog de |
| [RELEASE-CHECKLIST-VANMIDDAG.md](<RELEASE-CHECKLIST-VANMIDDAG.md>) | Naslag. Releasechecklist van 20-11 voor de speeltest met vier: de commando's in volgorde (releasegate, release.sh, Actions-builds, installatie- en Samen-spelen-rooktest) met de valkuilen uit eerdere releases. |
| [RELEASEGATE.md](<RELEASEGATE.md>) | Het releasegate-rapport en draaiboek: elke release bewijsbaar zonder regressie (ADR 0034). |
| [QA-SAVES-20-11.md](<QA-SAVES-20-11.md>) | QA van opslaan en laden voor de release van 20-11 (#983, #429): oude en beschadigde saves, opslag per speler, ritten en instellingen; de compat-suite. |
| [REVIEW-20-11.md](<REVIEW-20-11.md>) | AI-codereview van de wijzigingen van 20-11 voor de releasegate (ADR 0034): bevindingen op ernst en testgaten. |
| [RELEASEN.md](<RELEASEN.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [QA-SWEEP-20-11.md](<QA-SWEEP-20-11.md>) | Meetronde van de schermen op vijf vensterformaten zonder menselijk oog (buiten beeld, afgekapte tekst, bedekte doelen, contrast, focus), met bevindingen en wat niet gemeten is. |
| [OVERLAP-AUDIT-20-11.md](<OVERLAP-AUDIT-20-11.md>) | Overlap-audit van de HUD in het draaiende spel (detector `scripts/qa/overlap.mjs`): per scène de overlap, oorzaak, fix en status, wat niet is opgelost en wat niet is gezien. |
| [MENSEN-ANIMATIE-AUDIT-20-11.md](<MENSEN-ANIMATIE-AUDIT-20-11.md>) | Doorlichting van hoe mensen bewegen (loop-, idle-, bochtgedrag, blik, publiek, stapgeluid, Samen spelen), de top-verbeteringen op impact en kosten, wat gebouwd is (voetcontact, bochthelling, blik, wachtclips, klappen) en wat niet gezien is. |
| [QA-CONTROLLER-20-11.md](<QA-CONTROLLER-20-11.md>) | Meetronde van het bedienen met een controller (nagebootste gamepad): bereik, A/B, bumpers, scroll, hints per scherm, de fix voor de kaartknoppen (L3), de focusvolgorde per vlak en wat nog niet gezien is. |
| [ESCAPEMENU-UX-21-11.md](<ESCAPEMENU-UX-21-11.md>) | UX-audit van het pauzemenu per taak en per scherm, de rangorde op impact en kosten, en wat er in de ronde van 21-11 is gebouwd (Doorgaan bovenaan, zoeken met /, Opslaan in het Overzicht, Spullen en Boerderij rustiger). |
| [OV-MISSIES-20-11.md](<OV-MISSIES-20-11.md>) | Een bus- of treindienst starten bij elke halte en elk station: wat er was, wat er nu is (haltepalen, kaartpictogram, menu, regelkaart), de Samen-spelen-regel en wat nog niet gezien is. |
| [REISRIT-POLISH-20-11.md](<REISRIT-POLISH-20-11.md>) | Audit van de taxi- en treinrit (#882, #926) per onderdeel: cabine-licht, kijkhoek, stuur en chauffeur, camera-sway, geluid, begin en einde, de trein; wat gedaan is en wat open staat (glas, regen, perronreizigers). |
| [EERSTE-30-MINUTEN-20-11.md](<EERSTE-30-MINUTEN-20-11.md>) | De eerste 30 minuten van een nieuw spel beoordeeld als nieuwe speler zonder voorkennis (progressive disclosure, doel, bediening, overslaan, Samen-spelen-kaarten): wat goed is, wat verwarrend is, verbeteringen op impact en kosten, en wat nog niet in beeld bekeken is. |
| [BINNENSETS-21-11.md](<BINNENSETS-21-11.md>) | Binnenmissies spelen echt binnen (#956): hoe een binnenset werd gebouwd en wat misging (wereld erdoorheen, camera buiten, soms geen kamer), het generieke mechanisme (clearzone, kamercamera, plek zoeken, binnenplek), de spawnregels, het pan-budget van cutscenes, Samen spelen (lokaal bij wie de stap draait) en wat niet bewezen is. |
| [BEPPE-HUIS-21-11.md](<BEPPE-HUIS-21-11.md>) | Beppes huis en de Beppe-verhaalboog (#1063): open na M01, de eerste ontmoeting met Tessa, bezoeken terwijl ze leeft, het overlijden na M06 (terugval M08), de herinnering, canon-afweging, afgeleid uit de verhaalstand (geen migratie), echt binnen (vaste kamercamera), Samen spelen (lokaal per speler) en wat niet in beeld bekeken is. |
| [MISSIE-AAA-AKTE1-2.md](<MISSIE-AAA-AKTE1-2.md>) | AAA voor akte 1 en 2 (#955, #963): auditkaart per missie (nu, mist, AAA-versie, kosten, stand), de tussen-beats en nasleep, de aankleding bij start en doel, wachten met een tweede wachtende, wat niet is gedaan of bekeken. |
| [MISSIE-AAA-AKTE3-4.md](<MISSIE-AAA-AKTE3-4.md>) | AAA-auditkaarten voor de missies van akte 3 en 4 (M12 tot M21): wat er was, wat er bij kwam (openingsbeeld, tussenbeats, nasleep, aankleding, wachtspullen), de zes grensgevallen van de missieprop-audit en wat nog niet in beeld is bekeken. |
| [MISSIE-AAA-AKTE5-6-BIJBANEN.md](<MISSIE-AAA-AKTE5-6-BIJBANEN.md>) | AAA-auditkaarten voor akte 5 en 6, de bijbanen en Na het verhaal (#955, #956, #963). |
| [QTE-AUDIT-21-11.md](<QTE-AUDIT-21-11.md>) | Audit van de quicktime-events (#962): wat bleef, wat vervalt en de instelling Makkelijk, Normaal of Overslaan. |
| [SAMEN-SPELEN-HANDLEIDING.md](<SAMEN-SPELEN-HANDLEIDING.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). Dit docu… |
| [SFX-GAPS.md](<SFX-GAPS.md>) | Inventaris van spelgebeurtenissen zonder eigen geluid of met een te algemeen geluid (UI, beloning, wereld-foley, omgeving per streek), met wat is gebouwd en wat nog open staat. |
| [SFX-LUISTERLIJST.md](<SFX-LUISTERLIJST.md>) | Wat een mens moet beluisteren van de nieuwe geluiden: waar je ze in het spel hoort, wat er niet goed mag klinken en hoe je het meldt. |
| [AUDIO-LICENTIES.md](<AUDIO-LICENTIES.md>) | Alle geluidsopnames met bron-URL, Freesound-id, titel, auteurshandle, licentie (CC0 of CC BY), bewerking, sha256 en datum; gegenereerd uit het manifest (ADR 0039). |
| [AUDIO-GLITCHES-21-11.md](<AUDIO-GLITCHES-21-11.md>) | Melding van Nikky over glitches en ruis: hypotheses, wat bewezen is, de limiter en de diagnose, en een checklist voor het apparaat. |
| [ICONEN-LICENTIE.md](<ICONEN-LICENTIE.md>) | De Phosphor-iconenset (MIT): licentietekst, naamsvermelding en hoe je een icoon toevoegt (ADR 0041). |
| [ICONEN-INVENTARIS-20-11.md](<ICONEN-INVENTARIS-20-11.md>) | Waar het spel iconen tekent (inline SVG, emoji, unicode) en wat al naar de Phosphor-iconenmodule is overgezet. |
| [AUDIO-STAPPEN-WEER.md](<AUDIO-STAPPEN-WEER.md>) | Voetstappen, regen, wind, onweer, zomerambiance en de auto-lussen (drift en motor) met opnames: de koppeling, de ondergronden, de afstandsregels, het meten en wat niet is gelukt. |
| [AUDIO-VOERTUIGEN.md](<AUDIO-VOERTUIGEN.md>) | Helikopter, vliegtuig en motorboot met CC0-opnames: de bronnenlijst (Freesound-id, auteur, licentie), de koppeling van toeren, gas en snelheid aan toonhoogte en niveau en wat niet is beluisterd. |
| [SERVER-HOSTING.md](<SERVER-HOSTING.md>) | Dedicated server (#450): beheerdersrunbook, CLI en de bewuste eigenaarsbeslissingen. |
| [TESTGATEN-799.md](<TESTGATEN-799.md>) | Welke boot-/streamingpaden nu gedragstests hebben en welke een browser of Electron vragen. |
| [SOCIAL-EN-WEBSITE.md](<SOCIAL-EN-WEBSITE.md>) | Stand: 20 oktober 2026. Het plaatje is gemaakt (`docs/social-preview.png`, hieronder) en de About-tekst en… |
| [SOLO-SESSIE-AUDIT.md](<SOLO-SESSIE-AUDIT.md>) | Stand: worktree `w77-coop-bake-vault`, commit `78db7781` (de werkboom bevatte bij deze audit |
| [SPECS-FIRE.md](<SPECS-FIRE.md>) | Twee systemen die elkaar aanvullen, zolang de rolverdeling vastligt. Dit bestand |
| [SPELERSMENU-UX-21-11.md](<SPELERSMENU-UX-21-11.md>) | Canonieke regels: [.specs-fire/standards/multiplayer.md](../.specs-fire/standards/multiplayer.md). UX-audit en ontwerp van het spelersmenu van Samen spelen (21-11). |
| [BEKENDE-BEPERKINGEN-0.64.0.md](<BEKENDE-BEPERKINGEN-0.64.0.md>) | Naslag. Wat in 0.64.0 niet getest of niet af is (Samen spelen, nog niet gespeelde onderdelen, visuele puntjes, verkorte releasegate). |
| [BEKENDE-BEPERKINGEN-0.65.md](<BEKENDE-BEPERKINGEN-0.65.md>) | Naslag (concept). Wat in 0.65 niet getest of niet af is: Samen spelen, niet in beeld bekeken, prestaties en de gate. |
| [BUSSEN-LIVE-21-11.md](<BUSSEN-LIVE-21-11.md>) | Naslag bij #395 en #922: live buslocaties als USP, de bron en de kaartlaag (stand 21-11). |
| [PERF-START-21-11.md](<PERF-START-21-11.md>) | Spel starten: stilstand in de opening (#1046), meting en aanpak. |
| [PERF-STIL-21-11.md](<PERF-STIL-21-11.md>) | Stille meting 0.44 tegen 0.64 tegen main op Laag, Hoog en Ultra, start van een nieuw spel en Electron 45.3.3 (#1008, #1015). |
| [PERF-BISECT-21-11.md](<PERF-BISECT-21-11.md>) | Naslag. Bisect van de opwarmregressie 0.44 naar 0.64: waar ze zit, de tegelpinning sinds #314 en de proeffixes zonder effect (#1052). |
| [INEFFICIENTIE-21-11.md](<INEFFICIENTIE-21-11.md>) | Audit van inefficiënties in data, pakket, opstart en hot paths (#1066): top-20 met winst, wat gefixt is en welke Electron-metingen nog nodig zijn. |
| [PERF-TEGELSTREAM-21-11.md](<PERF-TEGELSTREAM-21-11.md>) | Tegelstroom zonder uitbarstingen (#1052): de plaatsingsvensters waren de bron, achtergrondwerk en vasthouding, meting Hoog en Ultra. |
| [QOL-STAND-21-11.md](<QOL-STAND-21-11.md>) | QoL-stand van epic #985: de 52 bevindingen van 17-11 en wat ervan af is. |
| [BALANS-21-11.md](<BALANS-21-11.md>) | Naslag. Economiebalans met een sim van 10 uur: verdienste per uur, de Duizendpoot (#1050) en de voor/na-tabel. |
| [VERKEER-AUDIT-21-11.md](<VERKEER-AUDIT-21-11.md>) | Verkeers- en wereldleven-audit (#1047 tot #1049): AI-verkeer, parkeren, voetgangers, fietsers. |
| [WERELD-AUDIT-21-11.md](<WERELD-AUDIT-21-11.md>) | Wereldaudit: props en gebouwen op verkeerde plekken over de hele provincie (#1044, #1045). |
| [SAMEN-MISSIES-20-11.md](<SAMEN-MISSIES-20-11.md>) | Audit en voorstel. Wat een gast nu doet in elke missie, bijbaan en wedstrijd, welke onderdelen van nature gezamenlijk zijn en per onderdeel een rol per speler, beloning per speler, wegvallen en later aansluiten en schaal van 1 tot 4 spelers; plus wat in ronde #983 is gebouwd (M30 bolwerken, pannenkoekenwedstrijd, bezorgen met verdeelde adressen) en wat niet is gezien. Regels: [`.specs-fire/standards/multiplayer.md`](../.specs-fire/standards/multiplayer.md). |
| [SPEELGIDS-4-SPELERS.md](<SPEELGIDS-4-SPELERS.md>) | Naslag. Speelgids voor de eigenaar en drie vrienden (18+): installeren, Samen spelen, passive mode en PvP, opnieuw verbinden, overslaan, bugs melden en bekende beperkingen. Verwijst voor de verbinding naar SPEELGIDS-VIER-SPELERS.md. |
| [SPEELGIDS-VIER-SPELERS.md](<SPEELGIDS-VIER-SPELERS.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/multiplayer.md`](../.specs-fire/standards/multiplayer.md). Korte gids voor vier spelers over internet: hosten, meedoen, wat is getest (#983) en wat niet (NAT, STUN), met de eerste stappen als het niet lukt. |
| [SAMEN-SPELEN-RONDE-20-11.md](<SAMEN-SPELEN-RONDE-20-11.md>) | Naslag. Ronde van 20-11 voor Samen spelen met vier: de HUD-bewaking van gastbijbanen, de spookvelden, wat de echte Electron-runs bewezen en wat open staat. |
| [SPEELTEST.md](<SPEELTEST.md>) | Voor mensen die de game nog niet kennen. Speel ongeveer 45 tot 60 minuten; zonder save begint het verhaal m… |
| [STEAM-CHECKLIST.md](<STEAM-CHECKLIST.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [STEAM-KLAAR.md](<STEAM-KLAAR.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/publicatie.md`](../.specs-fire/standar… |
| [VERHAALCANON-21-11.md](<VERHAALCANON-21-11.md>) | Canonblad en audit: Tammo en Tessa zijn net afgestudeerd (24), kennen elkaar uit de studie; wat er in docs en speltekst veranderde en welke 4 gesproken regels opnieuw moeten. |
| [TESSA-CIJFERS.md](<TESSA-CIJFERS.md>) | Gecontroleerd op 17 oktober 2026 met publieke CBS-pagina's. Het feitenblok |
| [TAAL-VAN-DOCUMENTATIE.md](<TAAL-VAN-DOCUMENTATIE.md>) | Besluit voor de eigenaar: Nederlands of Engels in de docs, met de meting en twee opties. |
| [UITLEG-MET-ICONEN.md](<UITLEG-MET-ICONEN.md>) | De regelwidget: uitleg met iconen en animaties in plaats van tekst, naar het voorbeeld van de eierrit, en de lijst van plekken waar de speler nu iets moet raden. |
| [TESTEN.md](<TESTEN.md>) | `node scripts/test_all.mjs` draait de tests in fasen en schrijft een rapport met een korte Nederlandse same… |
| [TRAILER-CONTROLE.md](<TRAILER-CONTROLE.md>) | Drie trailers uit het echte spel (geen nagebouwde beelden): een gameplaytrailer (78,0 s), een verhaaltraile… |
| [VLIEGSCHOOL.md](<VLIEGSCHOOL.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standard… |
| [WOORDENLIJST.md](<WOORDENLIJST.md>) | Naslag. De regels staan in de canonieke spec [`.specs-fire/standards/ui-taal.md`](../.specs-fire/standards/… |
| [groningen-memes-onderzoek.md](<groningen-memes-onderzoek.md>) | Aanvulling op `docs/groningen-memes.md`. Webonderzoek van oktober 2026 (RTV Noord, |
| [groningen-memes.md](<groningen-memes.md>) | Gebaseerd op een onderzoek (via Copilot, september 2026), samengevat en gefilterd |
| [markt-gebouwen.md](<markt-gebouwen.md>) | Research notes behind `game/js/marktgebouwen.js` and the Stadhuis and |
| [personages.md](<personages.md>) | Deze personagebijbel houdt de personages consistent: in dialogen, telefoontjes, gesprekjes in de auto, TTS-… |

## Een document toevoegen

1. Hoort de regel in een spec? Zet hem daar (en houd de doc kort als uitleg).
2. Zet bovenaan de doc een "Naslag"-blok met de spec waarnaar hij verwijst.
3. Zet de doc in de tabel hierboven (alfabetisch) met één regel uitleg.
4. Is het een verslag of plan dat niet meer actueel is? Zet het in `archief/<jaar-maand>/`
   met een kop "Gearchiveerd op …; vervangen door …" en relatieve links die blijven werken.


| [ACTIVITEITEN-TWEEDE-LAAG.md](<ACTIVITEITEN-TWEEDE-LAAG.md>) | Per activiteit wat er na de medaille nog te halen is, met de bewuste uitzonderingen (#800, punt 14). |
| [HERKENNINGSPUNTEN.md](<HERKENNINGSPUNTEN.md>) | Album van de kerken, molens en borgen in de provincie: data, telling en de route naar het dichtstbijzijnde open punt (#820). |
| [BUGS-OPEN-20-11.md](<BUGS-OPEN-20-11.md>) | Stand van de open bugs en wensen op 20-11 voor 0.64.0 (Samen spelen, Bourtange, bruggen, missies): wat in code zit, wat niemand zag en wat te groot is, met schatting. |
| [HERTEST-TRIAGE.md](<HERTEST-TRIAGE.md>) | Triage van de 485 issues met label hertest: per categorie wat in code bewezen is, wat beeldbewijs nodig heeft en een werklijst van 30. |
| [ONDERZOEK-REFERENTIEGAMES.md](<ONDERZOEK-REFERENTIEGAMES.md>) | Onderzoek naar wat bekende open-wereldgames leuk maakt, en wat GDE daarvan heeft overgenomen (#811–#821). |
| [VERKENNING-PROVINCIE.md](<VERKENNING-PROVINCIE.md>) | Klein plan voor de verkenlaag buiten de stad (A15-A20) op bestaande infrastructuur. |
| [WERELDKLEUREN-21-11.md](<WERELDKLEUREN-21-11.md>) | Werkdocument bij de vraag van de eigenaar: inventaris van de kleurbronnen van de 3D-wereld, de subtiele stap naar het designsysteem (`worldpalette.js`, `WERELD_DS_MENG`, `?dswereld`), kleurplaat, voor-en-na en wat niet is gezien. |