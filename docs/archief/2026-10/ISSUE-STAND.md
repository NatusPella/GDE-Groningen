> **Archief (oktober 2026).** Dit document is vervangen door `AGENTS.md` (Werkwijze) en het bord.
> Het staat hier alleen als historie: gebruik het niet als bron en werk het niet bij.
> Relatieve links in dit document verwijzen naar de oude plek in `docs/` en
> werken hier niet meer.

# Issue-stand

Stand van het bord op 2026-10-18 (#220, ronde 2): per open issue vergeleken met wat in main staat. Status: **gesloten** (aantoonbaar klaar, bewijs in de sluitcomment), **deels** (afvinklijst in het issue) of **open** (nog nauwelijks gebouwd). Blokkade: wat het volgende punt tegenhoudt: code, beeld (in beeld bevestigen of Electron), eigenaar (besluit of handmatig) of extern. `eigenaar`-issues zijn niet gesloten. Label `wacht-beeld`: gebouwd en getest, wacht op bevestiging in beeld. Werk dit bestand bij als een issue verandert; de afvinklijsten staan in de issues zelf.

Telling: 122 deels, 13 open, 3 gesloten.

| # | Titel | Status | Blokkade | Oppakker |
| --- | --- | --- | --- | --- |
| 1 | Water per tegel: varen, zwemmen, kades in de hele provincie | deels | code | build-coop-mini / w4-water-tegel |
| 4 | Prestatiemeting op een rustige machine met de provincie aan | open | beeld | onbekend |
| 5 | Zichtcontrole van de provincie (screenshots van dorpen, A7, kust, Eemshaven, Del | deels | beeld | qa-provincie (NatusPella-sessie, onbekende naam) |
| 6 | Duitse grensstrook en de zee/eilanden-randen als omkeerscènes | deels | beeld | w3-tegels-rest / i8-plekken-grens |
| 9 | Bruggen kapot bij aanvaringen met schepen: reproduceren | deels | beeld | w7-aanvaring / g5-borden-schepen |
| 13 | Groningse en Friese teksten laten nalezen door een echte spreker | open | extern | eigenaar |
| 18 | Verkeer en voetgangers per regio in lagen (dichtbij/middenafstand/ver) | deels | code | w4-verkeer-lagen / j5-sim-standaard / d1-sim-mobiel |
| 19 | Dag, nacht en weer over de provincie (altijd zomer) | deels | code | w3-weer / d2-weer-nacht |
| 20 | Cutscene-LOD: camera-gestuurd laden | deels | code | i6-cutscene-lod / epic-cutscene-lod |
| 21 | Landmarks: 500–600 kerken, molens, torens en borgen (de 30 bekendste met de hand | deels | beeld | w3-landmarks, h3-landmarks-2, q3-landmarks-3 |
| 22 | Interieurs: Forum, kerken, Korenbeurs | deels | beeld | w3-interieurs / h3-landmarks-2 |
| 23 | Iconische plekken per wijk: sluisbrug/kade, hoge torens, Gasunie-gebouw (verzonn | deels | code | w3-landmarks / j7-havens-sluizen / q3-landmarks-3 |
| 24 | Open-wereldleven batch 3: skateboarders, studenten-ontgroening (parodie), wijkpr | deels | beeld | epic-levend (daarna y10 controle) |
| 26 | Missies uit de speeltest: DUO, rechtbank, academiegebouw, busmuseum, Vindicat (p | deels | code | w4-missies / g1-missies-akten / j3-speeltest-missies |
| 28 | Coach op de fiets naast de roeiacht | deels | beeld | w3-bussen / y10 |
| 30 | Prestaties voor driften, meerijden in de trein en heli-landing | gesloten | - | j6-trein-truck |
| 33 | Versnelling/toerental, HUD op 720p en 4K, nieuwe motormodellen: handmatig contro | deels | beeld | r2-review-ui |
| 34 | Menu's: titelscherm met save, Aanwijzingen, Prestaties-detail, garage met meerde | deels | beeld | w4-menus |
| 37 | Repo publiek maken (beslissing) en dan private vulnerability reporting aanzetten | deels | eigenaar | j4-publiceren |
| 39 | Tessa-commentaar: cijfers verifiëren (CBS/Veiligheidsmonitor) voor het feitenblo | gesloten | - | onbekend |
| 43 | Mafia 1-achtig wanted-systeem: onderzoeken en een voorstel | deels | beeld | build-wanted, g2-wanted-npc, epic-npc, q1-wanted-npc |
| 44 | NPC's stappen soms uit hun auto om te vechten (sommigen met wapens) | deels | beeld | epic-npc / q1-wanted-npc |
| 49 | NPC's zitten in elke auto en worden eruit getrokken bij autodiefstal (ragdoll, w | deels | beeld | w4-npc-auto / epic-npc / q1-wanted-npc |
| 51 | Auto-interieurs (nu zit je 'in een vlak') | deels | beeld | w3-interieur-auto / y11-voertuigen-ui |
| 56 | Meten op echte zwakke hardware (Intel-laptop, Chromebook) | open | eigenaar | eigenaar |
| 57 | Webversie publiceren: plek kiezen (itch.io of GitHub Pages) en uploaden | open | eigenaar | j4-publiceren / eigenaar |
| 58 | Simulatie (verkeer, voetgangers) naar een worker; later WASM en WebGPU | deels | code | w4-worker / w3-machinist / j5-sim-standaard / d1-sim-mobiel |
| 59 | Spelers die de game niet kennen laten testen en echte controllers proberen | deels | eigenaar | eigenaar |
| 60 | IARC-leeftijdsvragenlijst invullen (doel PEGI 18 / USK 18) | deels | eigenaar | onbekend (agent-sessie, comment 18 okt) |
| 61 | Meer streken met eigen 3D-aanpassing en verkeer dat uitsterft | deels | beeld | w4-provincie, g4-provincieleven, y10 |
| 62 | Voor het publiek maken: merkenregister (GDE, Grootste Diefstal Ever), secrets-sc | deels | eigenaar | epic-publiceren, w13-publiceren, j4-publiceren |
| 63 | YouTube: kanaal, gameplaytrailer en verhaaltrailer met Tessa | deels | eigenaar | bug-wegen-visueel (voorbereiding), eigenaar |
| 64 | Steam-klaar: regels nalopen, SteamPipe-build, overlay- en Deck-test, achievement | open | eigenaar | eigenaar |
| 65 | 1.0: twee weken alleen bugfixes, definitieve trailer, 1.0.0 met downloads en web | open | eigenaar | onbekend |
| 67 | Steden in de provincie: Delfzijl, Appingedam, Veendam, Winschoten, Hoogezand-Sap | deels | code | w4-provincie / g4-provincieleven / i8-plekken-grens |
| 68 | Zomerevenementen op echte data, toevalsontmoetingen, verzamelen en geheimen per  | deels | beeld | w4-provincie / g4-provincieleven / i9-muziek-events |
| 72 | Social-preview-plaatje en website invullen op GitHub; credits (Rockstar/Take-Two | deels | eigenaar | j4-publiceren, eigenaar |
| 73 | Bewegwijzering en plaatsnamen op provincieschaal | deels | beeld | epic-borden, g5-borden-schepen |
| 74 | Handmatige speeltests (Maus): achteruitkijken en GPS in het Ommeland, stotteren  | open | eigenaar | eigenaar |
| 76 | Oude data en reservekaarten opruimen uit de repo (citymap.json 16 MB, groningen_ | deels | code | j3 / y3-stad-tegels |
| 78 | Echte straathoogtes (AHN): dijken, wierden, Hondsrug, onderdoorgangen en opritte | deels | code | w10-rand-ahn / i1-ahn-hoogtes |
| 80 | Bussen echte routes laten rijden | deels | beeld | w3-bussen / f6-trein-bus |
| 83 | Publiceren: checklist afronden | deels | eigenaar | epic-publiceren / w13-publiceren / j4-publiceren |
| 90 | Stad via het tegelpad: één wereld, geen aparte stadskaart (citymap.json) meer | deels | code | w4-stad-tegels, f2-stad-tegels, j3 / y3-stad-tegels |
| 92 | UI van menu's en HUD is nog te onrustig: te veel tekst, te weinig visuele commun | deels | beeld | UI-agent / w4-menus / w16-hud-tekst / r2-review-ui |
| 93 | Verhaal slaat soms nergens op: niet te volgen, geen logische flow, speelt vooral | deels | eigenaar | w3-verhaal / rev-verhaal / q2-verhaal-2 / z1-opening |
| 94 | Architectuurreview: onlogische dingen, legacy en dode code opsporen | deels | code | worktree-agent-ac9966c5810432a96 / y8-techniek |
| 95 | Coöp-multiplayer: het hele verhaal met twee spelers (Tammo en Tessa) | deels | beeld | w9-coop, build-coop-mini, d6-coop, j5-sim-standaard |
| 96 | Mobiele versie: telefoon en tablet (touch-besturing, kwaliteitsprofielen) | deels | eigenaar | w3-mobiel / w3-machinist / d1-sim-mobiel |
| 97 | Reizen tijdens missies door de provincie: reistijd, keuzes en UX ontwerpen | deels | code | build-reizen / w8-ov-reizen / i2-reizen-bruggen |
| 101 | Eén waterregel: waterAt overal (isInWater, waterWet en lokale waterchecks opruim | deels | code | epic-water / f4-opruimen |
| 102 | Wegen: één 'dichtstbijzijnde weg'-API; navgraph.js is niet aangesloten | deels | code | epic-wegen / f4-opruimen |
| 103 | Dode code opruimen: build-only modules uit game/js, ±380 ongebruikte exports, ve | deels | code | w6-dode-code, y8-techniek |
| 104 | Communicatiekanalen: één planner voor attention.js, narrative.js en hudrules.js | deels | beeld | f4-opruimen |
| 107 | Nacht en tijd van de dag: één definitie (3x nightFactor, 4x isNight) | deels | eigenaar | f4-opruimen |
| 108 | Circulaire imports: 150 modules in één cyclus; bewaken met een testscript | deels | code | epic-bewaking / y8-techniek |
| 109 | Trailer-, intro- en dev-modules (±6000 regels) lazy laden in plaats van altijd m | deels | beeld | epic-bewaking / d1-sim-mobiel |
| 112 | Kaartstijl: één kleurentabel en één laagregel voor minimap, grote kaart en provi | deels | beeld | w4-kaartstijl |
| 113 | URL-schakelaars en window.__ debughaken: één register in devflags.js | deels | code | epic-bewaking, y8-techniek |
| 115 | Missiemarkers in de wereld hebben rare vormen: duidelijker en mooier maken | deels | beeld | i4-pad-kaart-markers, y11-voertuigen-ui, bugs-kaart |
| 116 | Playtest: nieuwe versies proberen en feedback geven | open | eigenaar | eigenaar / releasescript |
| 117 | In Achtervolging Cutsence Geen geluid. | deels | eigenaar | bugs-klein / i5-geluid |
| 120 | Eerste missie nieuw verhaal: het doel waar je naartoe rijdt bestaat niet | open | extern | bugs-verhaal-d59e25 / i8-plekken-grens |
| 124 | Tegelwereld: boerderijen in het water, hekken over weg en water (grondige review | deels | code | w14-vaarroute / review-tegelwereld |
| 127 | Knipperlicht op fietsen ziet er gek uit | deels | beeld | bugs-klein |
| 129 | Fietsbel klinkt niet als een fietsbel | deels | beeld | i5-geluid |
| 130 | Wegen: visuele fouten bij samenkomende wegen en rijstroken die samenkomen of spl | deels | code | bug-wegen-visueel / provincie-QA |
| 131 | Vuurwerk heeft geen geluid | deels | beeld | i5-geluid, y9-geluid |
| 134 | Tessa spreekt Nederlands zonder Gronings accent | open | eigenaar | w3-verhaal |
| 136 | Cutscenes creatiever en levendiger: regie, props, bewegende personages (zoals de | deels | beeld | cut-anim / cut-regie / g1-missies-akten / y7-cutscenes |
| 141 | Desktop: debug-harnas achter !app.isPackaged en één argumentparser met test | deels | beeld | w5-desktop / y8-techniek |
| 143 | Distributie: één servepad en geen volledige git archive HEAD in de speler-zip | deels | eigenaar | i7-ci-desktop, y8-techniek |
| 145 | Meerijden in het reuzenrad | deels | beeld | w5-reuzenrad |
| 147 | Verbeterronde voor alle missies: cutscenes, scenes en regie (begin bij akte 1) | deels | beeld | m1-regie / j1-akte-2-3 / j2-akte-4-5 / q2-verhaal-2 |
| 150 | Volledige tekstaudit van alle speltekst: Nederlands, geen echte merken of person | deels | eigenaar | w6-tekstaudit / i3-teksten-winkels |
| 151 | Controllers: volledige gamepad-ondersteuning nalopen (alle menu's, voertuigen, m | deels | beeld | w6-controller, i4-pad-kaart-markers |
| 154 | Hint bij openende bruggen en een stoplicht voor boten (alleen beweegbare bruggen | deels | beeld | bugs-wereld |
| 156 | Winkels zien er allemaal uit als boekwinkels: meer variatie per winkeltype | deels | beeld | w3-landmarks |
| 157 | Cutscenes renderen soms nog lagere LOD's (camera-focus, hoge detailstand) | deels | beeld | w3-tegels-rest / i6-cutscene-lod / qa-provincie |
| 159 | Openingscutscene, trailer en benchmark flink aanpakken | deels | beeld | w8-opening / w8-benchmark / w8-trailer / y7-cutscenes |
| 160 | Bussen: lijnnummer en volgende bestemming tonen (bord en bus-HUD) | deels | beeld | w3-vracht, y9-geluid |
| 164 | Meer herkenbare gebouwen (landmarks en gevels die je meteen herkent) | deels | code | w3-landmarks / q3-landmarks-3 |
| 170 | Winkel-UI verbeteren: iconen per item, categorieën en een rustiger scherm (zoals | deels | beeld | w10-winkel-ui |
| 173 | Sound design: ontbrekende en matige effecten (o.a. carbidschieten is stil) | deels | beeld | w11-sound / i5-geluid / y9-geluid |
| 174 | Padelbanen en Pitch & Putt op de echte plekken (OSM-data) | deels | beeld | w12-echte-plekken / i8-plekken-grens |
| 180 | Kaart en minimap tijdens missies: nuttige missie-info (duif, kart, achtervolging | deels | beeld | w3-machinist / i4-pad-kaart-markers / r2-review-ui |
| 182 | Art-consistentie: nieuwe logo's en laadscherm-achtergronden passen niet bij de b | deels | beeld | w14-art |
| 184 | Varen van de stad tot aan de Waddenzee: doorgaande vaarroute met overal dezelfde | deels | beeld | w14-vaarroute |
| 186 | Spelbot: de hele game geautomatiseerd laten spelen en feedback verzamelen (epic, | deels | beeld | w15-spelbot |
| 187 | Het oude verhaal verwijderen: het nieuwe verhaal wordt het enige (saves migreren | deels | beeld | w15-oud-verwijderen |
| 190 | Straattaal en NPC-gebabbel uitbreiden (tekst-only, per streek en tijd van de dag | deels | code | g10-ideeen-1 |
| 191 | Prestaties (achievements) uitbreiden met pictogrammen en een overzicht | deels | beeld | g8-nacht-prestaties / y6 |
| 192 | Tien nieuwe bijbanen (sidejobs) met eigen mechaniek | deels | code | g10-ideeen-1 / h2-leven-aansluiten / y10-leven |
| 193 | Dieren in de wereld: koeien, schapen, vogels per streek, vissen en zeehonden | deels | code | g10-ideeen-1 / h2-leven-aansluiten / y10-leven |
| 194 | Weer visueel: regen, onweer, mist en zonsondergang met een duidelijk, mooi effec | deels | beeld | g10-ideeen-1, d2-weer-nacht |
| 195 | Dag-nachtcyclus visueel: straatverlichting, verlichte ramen, sterrenhemel en maa | deels | beeld | onbekend (comments), d2-weer-nacht |
| 196 | Voertuigen: tweewielers (fiets, brommer, scooter, motor) en een garage met tunin | deels | code | g10-ideeen-1, epic-tegels-klein, y4-features |
| 197 | Watersport en boten: roeien, zeilen, speedboot, zwemmen en een watersport-miniga | deels | code | g11-ideeen-2 / epic-tegels-klein / y4-features |
| 198 | Treinen en stations: perrons, dienstregeling en spoorbomen | deels | code | g11-ideeen-2 / j6-trein-truck / y4-features |
| 199 | Fotomodus: vrije camera, filters, schermafbeeldingen en een galerij | deels | beeld | g11-ideeen-2 / epic-tegels-klein / y4-features |
| 200 | Toegankelijkheid: ondertitels, kleurenblind, bewegingsreductie en toetsen herbin | deels | beeld | g9-toegankelijk / y6-toegankelijk |
| 201 | Tutorial en onboarding: de eerste tien minuten, hints en oefenmissie | deels | beeld | g9-toegankelijk-tutorial, j6-trein-truck, y6 |
| 202 | Radio-nieuws als tekst-ticker dat reageert op wat de speler doet | deels | beeld | g11-ideeen-2, y9-geluid |
| 203 | Evenementen en optochten: kermis, markt, optocht en vuurwerk met agenda | deels | code | g11-ideeen-2 / epic-tegels-klein / y4-features |
| 204 | Politie-AI verfijnen: wegblokkades, achtervolging in lagen en een politiehelikop | deels | beeld | epic-npc, q1-wanted-npc |
| 205 | Schademodel voor voertuigen: deuken, rook, brand en wrak | deels | code | h1-bezit-animatie / y5-bezit |
| 206 | Bezit en economie: een huis inrichten, garage en inkomstenoverzicht | deels | beeld | h1-bezit-animatie / y5-bezit |
| 207 | Nieuwe karakteranimaties: zwemmen, klimmen, springen over hekken en fietstrucs | deels | code | h1-bezit-animatie / y5-bezit |
| 208 | Savesysteem: meerdere slots, autosave, export en import en een herstelkopie | deels | beeld | bugs-verhaal |
| 209 | Cutscene-preview-tool: scènes bekijken, scrubben en valideren zonder de game te  | deels | beeld | g9-toegankelijk / y7-cutscenes |
| 211 | Transportbusje botst op bus en wordt drie busjes | open | extern | onbekend |
| 212 | Ommeland overlapt met Corpus den Hoorn (mogelijk oude save) | deels | beeld | qa-provincie / j3 |
| 213 | Checkpoint per stage in missies (opnieuw beginnen kost nu de hele missie) | deels | beeld | j3-speeltest-missies |
| 214 | Opnieuw-knop na mislukken en grace bij uitstappen uit het missievoertuig | deels | beeld | j3-speeltest-missies |
| 215 | Hulpopties en aanbod na twee mislukkingen (moeilijkheid als keuze) | deels | beeld | i4-pad-kaart-markers / y6 |
| 216 | Game feel: snelheids-FOV, hit-stop, sprongbuffer, rakelings-chip | deels | beeld | onbekend |
| 217 | Keuzes met gevolg: bak-score beinvloedt jury, M21 en M23 | deels | geen | j2-akte-4-5 / q2-verhaal-2 |
| 218 | Passieve pieken speelbaar maken: M20 fierljep-duel, M21 timing, M18 sluipstuk, M | deels | beeld | j2-akte-4-5 / q2-verhaal-2 |
| 219 | Reisbeats standaard aan en een beat bij elke regiosprong | deels | beeld | j2-akte-4-5 |
| 220 | Bord opschonen: gebouwde en obsolete issues sluiten of bijwerken | deels | code | onbekend (coördinator) |
| 221 | Playtestronde met onbekende spelers voorbereiden (eerste uur, doelhelderheid) | deels | eigenaar | i7-ci-desktop |
| 222 | Verhaaltest (Electron): M14 De dijk faalt direct, wereldeinden-crash, onbereikba | deels | code | k1-testronde, y1-testbugs |
| 223 | Wegen: 27 wegen in het noordwesten niet in de routegraaf (road_route_test) en bo | deels | code | y1-testbugs |
| 224 | Cutscene M02.intro: shot 6 duurt 11,8 s zonder camerabeweging (echte voice-duur) | deels (wacht-beeld) | beeld | y1-testbugs |
| 225 | Voertuigdeuren en in-/uitstapanimaties voor personages | deels | code | v1-deuren-instappen / y11-voertuigen-ui |
| 226 | Laadschermen tonen dubbele laadbalken | deels (wacht-beeld) | beeld | onbekend (QA, laadschermen) |
| 227 | Android-build (APK) met touch-besturing | deels | eigenaar | p1-android |
| 228 | Bord in Winsum toont gespiegelde tekst (Schouwerzijl, Groningen, Baflo) | deels (wacht-beeld) | beeld | qa-provincie |
| 229 | Spelbot: Pitch & putt-startpunt is NaN; audio gooit elke frame (AudioParam non-f | gesloten | - | y1-testbugs |
| 230 | Spelbot: dev-cheat 'stap voltooien' voltooit M09/M10 niet (lazyStart, fase coold | deels (wacht-beeld) | beeld | y1-testbugs |
| 231 | Water: oude waterlaag ligt over nieuw water buiten de stad (Stad naar Waddenzee) | deels (wacht-beeld) | beeld | w14-vaarroute |
| 232 | Waypoint op water geeft geen vaarroute | deels (wacht-beeld) | beeld | w14-vaarroute |
| 233 | Waddenzee: je vaart tegen een landmassa die er niet is (niet op de kaart, niet i | deels (wacht-beeld) | beeld | x1-wadland / w14-vaarroute |
| 234 | Binnenvaartschepen varen in de diepen en kleine sloten (daar horen ze niet) | deels | code | x2-binnenvaart |
| 235 | Bruggen zijn enorm glitchy (vooral beweegbare bruggen en brugdekken) | deels | code | x3-bruggen |
| 236 | Sluizen werken niet: je vaart er zo doorheen en bij Lauwersoog kon je er niet do | deels (wacht-beeld) | beeld | x4-sluizen |
| 237 | Kaart en minimap: grenzen met Friesland, Drenthe en Duitsland tekenen en buurdor | deels (wacht-beeld) | beeld | r2-review-ui |
| 238 | Muziek: lijst van gewenste tracks voor Gemini | open | eigenaar | eigenaar |
