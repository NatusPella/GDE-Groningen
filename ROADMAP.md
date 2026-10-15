# Roadmap naar GDE Groningen 1.0.0

Bijgewerkt: 3 oktober 2026, na release 0.22.0.

**Spelregels**
- Geen kosten: geen betaalde certificaten, hosting of diensten. De downloads blijven ongetekend, en de release notes zeggen dat.
- Niets wordt openbaar zonder uitdrukkelijk akkoord van Alexander. Dat geldt voor de zichtbaarheid van de repo, Pages, itch.io, YouTube en posts.
- Er is één testronde per release: de verhaaltest in Electron, de node-tests, en een korte speeltest. Agents doen tussendoor alleen lichte checks.
- De legenda: `[x]` is klaar, `[~]` loopt (met de branch erachter), `[ ]` is open, en `[?]` wacht op een besluit.

## 0.23: uitgebracht op 3 okt 2026 (een paar punten schuiven door)

**Visueel en wereld**
- [~] Mesh ronde 3 (`claude/mesh-ronde3`): stoeptegels die flikkeren op kruispunten, water en markering die flikkeren, spoorbedden, de laatste kieren bij verhoogde en verdiepte wegen, 291 gaten, de Griffeweg, zwevende en zinkende gebouwen.
- [~] Gevels die flikkeren (`claude/gevel-zfight`): een detector en fixes voor materialen die op elkaar liggen.
- [x] Ommeland ronde 2: echte plattegronden voor L-vormige gebouwen, OSM-fietspaden, winkelpuien, kerkgevels, maren als echt water, gladdere oevers.
- [x] Stadsboten kunnen de stad uit varen, het Ommeland in (mesh ronde 4). Je eigen boot ook, uit alle zeven kanalen en terug: `scripts/boat_edge_sim.mjs` (`claude/open-bugs`).
- [x] Kusjes geven kan pas na de eerste kus (H13).
- [~] Stad visueel (`claude/stad-visueel`):
  - de garage en de aankleding bij de House of Groningen;
  - de blinde zijmuren aan de markten;
  - Vismarkt 34;
  - de Drie Gezusters, Mutua Fides en de Merckt;
  - glas in Paddepoel;
  - de flats bij de toren;
  - het Groninger Museum.
- [?] De hoektoren van het Waagstraatcomplex: houden of weghalen (de agent zoekt uit of hij echt bestaat).

**Voertuigen en cutscenes**
- [x] Bestuurders op de goede plek in alle voertuigtypes, met een controle in `scripts/seat_audit.mjs`.
- [x] Auto's op de ring in cutscenes rijden netjes (`cinedrive.js`), met een controle in `scripts/cine_ring_check.mjs`.

**Performance**
- [x] Perf ronde 3 (laadtijd tot het titelmenu van ongeveer 10 naar ongeveer 6 s, vangrails samengevoegd, horeca-bordjes in één draw call). Wat oorspronkelijk gepland stond:
  - vangrails samenvoegen;
  - horeca-bordjes;
  - gebouwen samenvoegen op hoge snelheid;
  - de onverklaarde haperingen;
  - de kosten van de nieuwe gebouwen en het water;
  - laadtijd.

**Trailer**
- [?] Feedback van Alexander op "Een zomer in Grunn".
- [ ] Bekende puntjes:
  - de vetdruppels zijn klein;
  - Durk is te donker;
  - de ondertitels en naamkaarten zijn klein in 1080p;
  - fades worden harde cuts in de video.
- [ ] Een nieuwe export naar Downloads.
- [?] Uploaden naar YouTube (@NatusPella, privé), alleen na akkoord.

**Speeltest**
- [ ] Spelen door een mens: H3 (stuntavond), H5 (oogcontact), H6 (3 minuten), H12 (de 600 m-route) en H18 (de achtervolging en de duiven).
- [ ] Nalopen: het Verhaal-menu, Ubbo, het plaatje van de plek in het Overzicht, en het prestatie-advies samen met "Wat is er nieuw" bij een update.
- [ ] De laadtijd van de kaart meten op een rustige machine: rijen groeperen, woonboten, daken.

## Speelfeedback 3 okt (gaat mee in 0.24)

**Pakket A: verhaalverloop en opening** (`claude/feedback-verhaal`, klaar voor review)
- [x] Te veel tegelijk: één wachtrij (`narrative.js`) voor telefoontjes, radio, autogesprekken, meldingen, prestaties, HUD-kaarten en cutscenes; kaarten gaan opzij voor ondertitels en de radio.
- [x] Samen gaan wonen: in de opening huren Tammo en Tessa samen een flat in Paddepoel, weg uit de krappe zolder. Daarna is Paddepoel thuis.
- [x] Onderduiken: een duidelijke bestemming, met drie keuzes (trein, ijsje in het Noorderplantsoen, zonsondergang aan de Hoge der A), elk met een scène.
- [x] Geen "Kop/Romp/Staart" meer in beeld: "Deel 1: KEI-week", "Deel 2: Noorderzon", "Deel 3: Kermis en Ontzet".
- [x] Kusjes te vroeg: H13 vooruit spelen zette ze aan. Nu pas als het verhaal bij H13 is.
- [x] "Huur een boot" in plaats van "koop een huurboot"; de treden van de complimentenladder worden uitgelegd.
- [x] Een eigen icoon per missie.
- [ ] Nalopen in een speeltest: de nieuwe intro-shots (camera bij de toren), de drie onderduik-scènes, en of de wachtrij niet te traag voelt.

**Pakket B: missies** (`claude/feedback-missies`)
- [x] H3: een uitleg vooraf (wat punten oplevert en het doel), een live scorepaneel met voortgangsbalk en combo, een pop-up per actie en "nog X punten" tegen het eind. Het doel is altijd haalbaar.
- [x] H6: allebei in zwarte kleding. Na de kraak wijst de waypoint naar een kade bij het Hoofdstation, en daar eindigt de missie. In de trein weer gewone kleren.
- [x] H8: de tankwagen van Us Mem Vet staat bij de groothandel aan de Bornholmstraat, met "US MEM VET" op de tank. Erin springen is de bedoelde route, banden plat kan nog steeds.
- [x] H5: Tessa fietst op haar eigen fiets (zoals in D), dus het oogcontact op het kruispunt klopt.
- [x] H11: per kroeg een korte, overslaanbare proost (ander glas, ander shot, één zin of geen).
- [x] H13:
  - geen plaatsing, maar de medaille: goud was sneller dan de boot kan varen, dus het was bijna altijd brons. Goud en zilver zijn nu haalbaar;
  - cutscenes bij de brug en bij de boosheid van Wiebe;
  - Tammo gaat daarna verder als gids;
  - de kus krijgt opbouw in drie momenten;
  - een instapshot vanaf het water. Ook de scène aan boord van het skûtsje (H14) filmt nu langs het zeil.
- [x] H14: de boeven fietsen niet meer door een muur.
- [ ] Nog in het echt bekijken: H8's groothandel en de kaping, de kade bij het station, de proosts en de scènes op de rondvaartboot (de headless check deed alleen het scorepaneel en de tankwagen).

**Pakket C: wereld, geluid en HUD** (`claude/feedback-wereld`)
- [x] Voertuigbadge: naam en merk erbij, en conditie met een hartje in plaats van "schade".
- [x] "Prestaties wachten" staat alleen kort in beeld (net als "meldingen wachten").
- [x] Een prettiger brommergeluid.
- [x] Zwemmers in zwemkleding die niet zwaaien als drenkelingen. Meer leven op het water: bootjes, kano's, suppers en zwanen.
- [x] Betere waterlijn en golfslag voor alle boten. Remsporen liggen op de bovenste weglaag en blijven langer liggen.
- [x] Cutscenes laden details rond de camera, niet rond de speler. Een rijkere minimap in het Ommeland.
- [ ] Nog in het echt bekijken: de boten en zwemmers op het water en de ring (de screenshots van die plekken lukten niet).

**Pakket D: heli, carbid en padel** (`claude/feedback-heli`)
- [x] De heli-missie is één vlucht in Rotor Roelfs demoheli: opstijgen op Eelde, onderweg belt Dokter Dijkstra met een spoedje (de lunch van de nachtdienst), landen op de H van het UMCG, Dijkstra stapt in met zijn lier, door de ringen naar de ballon in het Oosterpark, en terug op de H. Geen tweede heli; de proefvlucht is nu kennismaken met Roelf op Eelde.
- [x] De ballonvlucht is te doen: grote ringen, een pijl met afstand en hoogte, een lichtzuil op de H, stuur- en hoogtehulp, meevliegen met de ballon en een ruimere vangzone. `scripts/heli_sim.mjs` vliegt beide heli-runs met het echte vliegmodel.
- [x] Nieuwe heli-besturing: W/S vooruit en remmen, A/D draaien, Shift sneller, Spatie omhoog, Ctrl omlaag. Ook in Besturing, de hints en op de controller (stick vliegt, A/RT omhoog, B/LT omlaag). Blijft aan te passen.
- [x] De kaart en minimap draaien mee met de heli; de ringen, de H en de ballon staan op hun echte plek.
- [x] Nieuwe missienaam: "Het staat niet in het rooster" (andere kandidaten: "Even langs het UMCG", "Vliegen is ook maar rijden").
- [x] Een route naar carbid, Eelde en terug naar een padelbaan: routes over de wegen van het Ommeland (`countryroute.js`).
- [x] Padel: de tegenstanders praten hoorbaar, en tijdens padel, carbid en de botsauto's staan er geen waypoints of missiebakens naar iets anders.
- [x] Durk en Douwe dagen Tammo uit voor padel: Jelle wil dat ze de twee een uur bezighouden (en dat verklapt Douwe).
- [ ] Nalopen in een speeltest: de hele H15-vlucht (de headless check kwam niet voorbij het openingsfilmpje), de koppeling naar de stad na de kruisvlucht, en het padelfilmpje bij de baan.
- [x] Ctrl+W sloot in de browser het tabblad: in de webversie zitten bukken en heli omlaag nu op C, de desktopversie houdt Ctrl (`claude/open-bugs`).

**Ring:** nog steeds zwarte lagen hier en daar. Dat valt onder mesh ronde 4 en 5, die gepauzeerd zijn.

## Content die je nooit ziet (feedback 4 okt)

- [ ] Inventaris: van elk wapen, voertuig, winkelartikel, minigame en bijbaantje vastleggen waar het in de game voorkomt (`scripts/content_audit.mjs`), en wat nergens of alleen per toeval te vinden is.
- [ ] Alles wat bestaat een logische plek geven:
  - een verhaalstap of klus die het voorstelt;
  - een winkel of verkoper;
  - een tip van Ubbo;
  - een plek op de kaart.
- [ ] Verzamelprestaties (bijvoorbeeld "alle fietsen gereden") met een teller in Garage en Prestaties, zodat je ziet wat er nog is.
- [ ] Wat geen functie heeft, schrappen of samenvoegen.

## 0.24: echte zwakke hardware en de webversie

- [ ] Meten op een echte Intel-laptop (Iris Xe of UHD 620) en een Chromebook of vergelijkbaar toestel. Daarvoor is hardware van Alexander of een kennis nodig.
- [ ] De lat: Laag haalt 30 fps zonder haperingen op de drukste plekken, en de laadtijd blijft onder de 30 s.
- [~] Een webversie bouwen (`claude/webversie`): `npm run web` in `desktop/` maakt `web-dist/` uit de offline-staging, met relatieve paden, een laadscherm dat de MB's van de kaart telt, een service worker die alles cachet (per versie, ook offline), en audio die pas laadt als hij speelt. Getest in headless Chrome; nog niet in Safari, Firefox en op echte zwakke hardware.
- [x] Audio comprimeren (Opus) voor de webversie: 149 MB wordt 85 MB (muziek de helft, stemmen 28% kleiner, want die waren al 48 kbps). Safari vóór 18.4 krijgt de mp3's.
- [?] Waar de webversie komt: itch.io (een gratis account) of GitHub Pages zodra de repo openbaar is. Beide kunnen: de map past binnen de limieten van itch.io (521 van de 1000 bestanden, 258 van de 500 MB), en `npm run web:zip` maakt de zip.
- [~] Het releasescript maakt de webversie mee: `npm run release -- minor --web` legt `GDE-Groningen-<versie>-web.zip` lokaal klaar (`claude/builds`). Uploaden of publiceren doet het bewust niet, want de plek is nog niet gekozen (zie hierboven).
- [x] Three.js en de lettertypes in de webversie zelf hosten, zonder jsDelivr of Google Fonts, voor privacy en offline gebruik: `npm run web` vendort ze net als de desktopbuild (`claude/webversie`).

**Architectuur (op basis van metingen; eerst een profiel van de hoofdthread maken, op Laag en met een vertraagde CPU)**
- [ ] **Web Workers** voor het opbouwen van stukken stad en Ommeland: geometrie, rijen, wegen en water gaan als buffers naar de hoofdthread. Dat geeft de grootste winst tegen haperingen tijdens het rijden en vliegen.
- [ ] **Geometrie vooraf bakken** in het bouwscript (binair, of glTF met meshopt), in plaats van alles bij het opstarten uit OSM te genereren. Dat geeft een veel kortere laadtijd.
- [ ] `BatchedMesh` voor objecten met verschillende vormen maar hetzelfde materiaal.
- [x] Worker ronde 1 en 2: straatobjecten, Ommeland-water, stadswegen en terrein worden in een worker opgebouwd, byte voor byte gelijk aan de oude code (`scripts/perf/geocheck.sh`).
- [x] Worker ronde 3 (`claude/workers3`, zie docs/PERF-PROFIEL.md): de kaart van de worker is afgeslankt (64 → 33 MB heap); het samenvoegen van wegcellen is over frames verdeeld en de kunstwerken van de ring komen niet meer in één frame binnen (geen frames meer met `3d:roads` ≥ 10 ms op de ring); oevers en kades worden in de worker gebouwd (stadswater −71%); de minimap tekent minder vaak als de CPU het niet bijhoudt (HUD −40 tot −50% op heli en dorp).
- [x] De HUD-pieken op de ring na een sprong (`claude/opruimen`): de minimap bouwde een ontbrekende Ommeland-tegel midden in het frame (tot 8 ms, 15–27 ms bij 4× CPU-vertraging). Die tegels komen nu in de rusttijd tussen frames, en de HUD forceert geen layout meer om een animatie te herstarten (instappen kostte 11–15 ms bij 4× vertraging). `PERF_JUMP=<s>` in `scripts/perf/run.sh` springt op de ring.
- [x] De kunstwerken van de wegen naar de worker (`claude/perf-rest`): viaducten, taluds, keermuren, vangrails, tunneldaken en vloeren van de verdiepte stukken komen uit de worker, byte voor byte gelijk (`geocheck.sh`, 463 wegen). Op de ring met sprongen halveert `3d:roads` (1.0 → 0.5 ms per frame) en zijn er geen frames meer met `3d:roads` ≥ 8 ms (was 11 tot 15). De botsingsdata blijven op de hoofdthread (`ring_probe` 0).
- [x] De HUD-portretjes worden over sessies bewaard (localStorage, per versie): een start tekent ze niet opnieuw (10–15 ms per portret bij 4× CPU-vertraging, de eerste 47–54 ms met de opwarming van de renderer).
- [x] De snapshot van je voertuig bij de snelheidsmeter en de opwarming van de renderer (33–55 ms bij het eerste instappen) gaan in de rusttijd en vooraf (`claude/open-bugs`). Nog meten in Electron.
- [x] `BatchedMesh` is overgeslagen: in three r160 levert het geen winst op. Opnieuw bekijken na een upgrade van three.js.
- [ ] Daarna pas: de simulatie (verkeer en voetgangers) in een worker, en WASM voor gemeten hotspots als dat dan nog nodig is.
- [ ] Na 1.0: WebGPU (de WebGPURenderer van three.js) met WebGL als terugval. Dat vraagt een herschrijving van onze eigen shaders.

## 0.25: afwerking voor nieuwe spelers

- [x] ~~**Leeftijdsclassificatie: mik op PEGI 16** (`claude/pegi16`).~~ Teruggedraaid: de game is 18+ (`claude/pegi18`, zie hieronder). De verwachte antwoorden voor de vragenlijst staan in [docs/LEEFTIJD.md](docs/LEEFTIJD.md).
  - Bloed en ledematen (`gore3d.js`) zijn helemaal uit de game, net als de instelling.
  - Burgers raken knock-out, staan op en schelden, maar gaan niet dood. Wapens raken ze niet.
  - Agenten worden uitgeschakeld en staan later weer op. De alcohol blijft, met een inhoudslabel.
  - Kiekdoar zegt geen "gewond" meer bij een knock-out (`claude/open-bugs`).
- [ ] De IARC-vragenlijst echt invullen.
- [x] **De game is 18+** (`claude/pegi18`): verwacht PEGI 18 / USK 18, zie [docs/LEEFTIJD.md](docs/LEEFTIJD.md). Alles van PEGI 16 is terug: bloed en ledematen (`gore3d.js`, met de instelling, standaard aan), burgers en agenten die doodgaan, wapens en richthulp voor iedereen, de tellers `kills`/`pedKills`/`copKills` (oude saves worden omgezet), de kraskaarten en loten bij Rook & Geluk (de spaarkaart blijft) en de oorspronkelijke Kiekdoar-berichten. De stuntavond van H3 blijft non-letaal (`knockfx3d.js`).
- [x] ~~**Geen gesimuleerd gokken meer** (`claude/geen-gokken`).~~ Teruggedraaid in `claude/pegi18`. De kraskaarten en loten bij Rook & Geluk (PEGI: 18) zijn weg. De winkel heet nu Krant & Kauwgom en heeft een spaarkaart: elke aankoop een stempel, 10 stempels geven vast €10. Zie docs/LEEFTIJD.md.
- [~] Onboarding: de eerste 10 minuten zonder uitleg te snappen (`claude/v025`). Audit en wijzigingen in [docs/ONBOARDING.md](docs/ONBOARDING.md).
  - [x] uitleg over doelen, niet over toetsen: op het moment zelf, één kaartje tegelijk via de narrative-planner en elk één keer: de eerste klus, geld en winkels, zelf kiezen op de kaart en Te doen (`onboarding.js`);
  - [x] geen toetshints meer voor lopen, kijken, rennen, springen en rijden; alleen E, T, M, Esc, kusjes, wapens, heli en trein;
  - [x] uit te zetten voor ervaren spelers (Instellingen › Weergave), en het eerste kaartje zegt dat;
  - [x] de toetsen op de uitlegkaartjes volgen je laatste invoer: de controllerknop of je eigen toetsindeling (`claude/opruimen`);
  - [ ] toetsen met spelers die de game niet kennen (de vragen staan in docs/ONBOARDING.md).
- [~] Toegankelijkheid (`claude/toegankelijk`, in headless Chrome getest met een nagebootste controller; nog niet op echte hardware):
  - [x] toetsen en controllerknoppen opnieuw toewijzen, met ruilen bij een conflict en "Standaard herstellen";
  - [x] volledige controllersupport via de Gamepad API (Xbox, PlayStation, Steam Deck): spel, minigames en alle menu's, hints met de knoppen van je controller, trillen;
  - [x] een grootte voor de ondertitels, met een vlak erachter;
  - [x] markers die werken voor kleurenblinden: patronen en vormen, plus drie paletten;
  - [ ] testen met een echte Xbox-, PlayStation- en Steam Deck-controller (zie de lijst in de PR).
- [x] **Foutrapport** (`claude/v025`): fouten en waarschuwingen in een lokaal logboek (`errorlog.js`) met versie, verhaalstap, instellingen en GPU-klasse, zonder persoonlijke gegevens. Onder Instellingen › Foutrapport: kopiëren of (desktop) opslaan als bestand. Er wordt niets verstuurd.
- [x] **Save-garantie** (`claude/v025`): saves en instellingen hebben een versie en worden stap voor stap gemigreerd (`savemigrate.js`); `node scripts/save_migration_test.mjs` laadt saves zoals 0.4, 0.21, 0.22, 0.23 en 0.24 ze schreven. Bij elke release die de save verandert: een migratiestap en een fixture erbij.
- [x] **Ongebruikte stemopnames weg** (`claude/opruimen`): `node scripts/audio_unused.mjs` vindt opnames en manifestregels die geen regel, lookup of codepad meer gebruikt; `--delete` haalt ze weg. 746 bestanden, 17,3 MB; de stemdekking blijft 1608/1608.
- [ ] Feature freeze.

## Speeltest Maus 4 okt (0.26.1)

**UI en geluid** (`claude/maus-ui`)
- [x] Hoofdmenu, Afsluiten en Opnieuw beginnen in het pauzemenu zijn echte knoppen van 44 px. Opnieuw beginnen staat apart en vraagt om bevestiging. Gecontroleerd op 1920×1080 en 1280×800.
- [x] Eén radio voor het hele spel, te voet en in elk voertuig. De keuze blijft in je save (`radio`).
- [x] Eén zender (G-Music) met programma's in plaats van vier zenders: Proat in de ochtend, De hits, Avondproat en vanaf 22:00 Nachtstreek (`PROGRAMMES` in `musicpick.js`). Om de 2 of 3 nummers een praatje van bestaande opnames (Geesje, Kiekdoar-nieuws en `audio/nieuws`, verkeer, weer, de koeien, Rikus). N zet hem aan of uit; `radio` in de save is `on`/`off` (save v3 zet oude zenders op `on`).
- [x] Muziekkeuze met een geschiedenis (`musicpick.js`): geen herhaling binnen ~60% van de pool, nummers die lang niet speelden wegen zwaarder, nachtnummers 's nachts, een eigen pool per zender en minder jingles. `node scripts/music_pick_test.mjs` test het.
- [ ] De indeling van Nachtstreek en dag/nacht in `audio/gmusic/manifest.json` naluisteren. Die is nu gekozen op de titels.
- [ ] Nieuwe muziek maken volgens [docs/MUZIEK.md](docs/MUZIEK.md). Het doel per programmablok: 40 nummers in de dagpool (waarvan 10 voor de ochtend en 8 voor de avond), 20 of meer voor Nachtstreek, en jingles per blok. Nu zijn het er 14 en 6.
- [x] De radio op de controller: er is niets meer om tussen te wisselen, alleen aan/uit. Dat doet LB in een voertuig; te voet zijn alle knoppen bezet, dus daar gaat het via Instellingen › Geluid. Geen eigen knop te voet nodig.

**Missies** (`claude/maus-missies`)
- [x] H6: zwart incognito meteen op allebei (kopen, start van de kraak, laden); de fietsrijder volgt de outfit ook.
- [x] H6: toetschip boven je hoofd per laserrij, mildere lasers, de drie minuten pauzeren bij terugsturen en krijgen één keer 90 s extra, een tweede poging slaat het plangesprek over, ontsnapping met twee sterren.
- [x] H6: camera's langs de route vanaf het startpunt, op droge grond binnen de bouwtekening. De verhaaltest checkt de bewakers en camera's, en dat geen filmcamera buiten de wereld staat (`cinematics.js` `cinematicPoseIssues`).
- [x] Je auto laten afleveren in het Ommeland (berm van een landweg); een eigen voertuig daar overleeft het laden. De verhaaltest checkt het in Loppersum.
- [x] Onderduiken met de trein: dorpen bovenaan, alleen een rit naar het Ommeland telt, een korte wandeling naar het eerste dorpsuitje, daar de scène.
- [x] "US MEM VET" hangt aan de geveerde body van de tankwagen.
- [x] H11: glas rechtop bij het klinken, aan de lippen bij het drinken (pose nagerekend op het skelet).
- [x] H16: instappen in de Escapade of hem klemzetten stopt hem.
- [x] H18: de limo blijft nooit wachten op een routepunt, duiven bij een derde van de meter, 25 s dichtbij of klemzetten; geen politie, meer tijd.
- [x] H13: scènes aan boord van de rondvaartboot op het open voordek en de vloer, niet onder (door) de glazen kap (`missionstory.js` `boatStage`).
- [x] Fierljeppen: het mik-camerashot (`pg-aim`) slikte Spatie in als "overslaan"; nu `passKeys`, en gefocuste UI-knoppen verliezen hun focus bij Spatie/Enter tijdens het spelen (`spacegate.js`, `node scripts/space_gate_test.mjs`).
- [ ] H6 en H18 met de hand naspelen op Windows met Ctrl als bukken; de verhaaltest speelt de stappen niet echt.

**Thuis in het verhaal** (`claude/thuis-verhaal`)
- [x] De garage toont elk eigen voertuig: 18 vakken, de rest in de parkeerlift. Het paneel bij de deur ("Kies welke auto's in de garage staan") haalt er een naar voren, en die keuze staat in de save (`thuis.front`). Het Garage-menu zegt waar elk voertuig thuis staat. "Te koop" en "Vrijgespeeld" zijn duidelijk iets anders dan "van jou".
- [x] De flat heeft twee kleine slaapkamers, een voor elk. Je slaapt in je eigen bed, en de Sloapstee is een setje van twee eenpersoonsbedden.
- [x] k-nacht wacht thuis in de flat in plaats van bij Henk. Henk belt tijdens het wachten (koekje en zender). Missies die het donker nodig hebben, sturen je ook naar huis.
- [x] Nieuwe stap r-avond, "Een avond thuis", tussen H12 en H13.
- [x] Nieuwe stap k-eikea, "De flat inrichten bij EIKEA", na H1: dozen op het dak, een klap kost een doos, thuis in elkaar zetten. Je krijgt de bedden, de Buukenkaas en Lichtje Tjoek. Een oude save die al verder is, slaat hem over. De Electron-storytest speelt hem echt.
- [ ] Naspelen: valt de dozenstapel op het dak van een busje goed uit? Hij is nu afgestemd op de Escapade.
- [ ] Naluisteren: Henks telefoontje klinkt nu als een gewone stem, zonder telefoonfilter.

**Aftiteling aan het eind** (`claude/aftiteling`)
- [x] De aftiteling, het logo en "Einde" spelen pas als alle 18 missies gehaald zijn en alle uitdagingen na het verhaal gedaan zijn (`ending.js`, eenmalig via de verhaalvlag `credits`). Overzicht en Te doen tellen af, daarna staat "Aftiteling bekijken" onder Overzicht. `node scripts/ending_test.mjs` test de check.

**Missies en voertuigen** (`claude/missie-voertuigen`)
- [x] H9 alleen in een snelle auto (sportwagen of 200 km/u, de Escapade na tuning); r-tuning wijst naar Knal & Kolder of een sportwagen; een zin van de ander bij het verkeerde voertuig.
- [x] H5 op een gewone fiets, H13 in de rondvaartboot. De duivenmissies en het skûtsje hadden hun voertuigcheck al.
- [x] Geleende voertuigen terug: Berend rijdt weg (H1), de decorauto (H7) en de tankwagen (H8) blijven staan, de rondvaartboot blijft aan de kade (H13). Daarna wijst de route eerst naar je eigen vervoer.
- [x] Vuurwerk, de jachtgeweer en vuisten weer hoorbaar; het jachtgeweer raakt onder het kruisje (`scripts/weapon_audio_test.mjs`).
- [ ] Nalopen in een speeltest: H9 met de opgevoerde Escapade winnen, Berend die wegrijdt, het geluid van vuurwerk in H18.

## Streken (cheats), `claude/cheats`

- [x] Pauzemenu › Streken: acties (teleport via de kaart, Voertuig hier met een keuzelijst, Geld uit de muur) en schakelaars in de stijl van Instellingen; ??? met een hint voor wat op slot zit; een kaartje bij een nieuwe streek.
- [x] 21 streken: 8 vanaf het begin, 8 uit het verhaal (k-fiets, H3 t/m H8, r-tuning), 3 uit prestaties, 2 na het verhaal (`cheatlist.js`).
- [x] Gameplay-streken wachten tijdens missies, filmpjes, uitdagingen, bijbaantjes en minigames; de uiterlijk-streken blijven aan.
- [x] Prestaties en totalen staan stil zolang een gameplay-streek aan staat, en na Geld uit de muur tot een save geladen wordt. Teleport en Voertuig hier tellen niet.
- [x] Per save (`streken`, save v4 geeft een oude save wat het verhaal al vrijspeelde) en voor altijd (lifetime set `streken`).
- [x] Kaart: zoomen zonder flikkeren (laatste complete beeld eronder, zichtbare tegels nooit weggegooid).
- [ ] Meer streken die een eigen 3D-aanpassing nodig hebben: Mini-me, Kleine mensjes, Reuzenduif, Disco-zwaailicht, Alles is een kliko, Alleen trekkers, Altijd groen, Spiegelstad, Jelle's trekker-limo spawnen.
- [ ] Fietsenstad en Zondagochtend laten het verkeer dat er al rijdt uitsterven in plaats van het meteen weg te halen. Naspelen of dat snel genoeg voelt.

## Juridisch en publiceren (vóór 1.0)

- [x] **Nieuwe naam, besloten op 3 okt.** De titel is **GDE Groningen – Zomer vol misdaad**, met *Grootste Diefstal Ever* als betekenis van GDE (`claude/gde-naam`).
  - De reeks heet GDE, plus een stad of provincie en een ondertitel per game, bijvoorbeeld GDE Drenthe of GDE Leeuwarden. `game/js/logo.js` houdt de naam op één plek; een vervolg wisselt alleen de plaats en de ondertitel.
  - Het cijfer "VI" en de woorden "Grand Theft" zijn weg uit alles wat een speler ziet: `<title>`, laad- en titelscherm, disclaimer, pauzemenu, trailer, intro, aftiteling, telefoonberichten (afzender "GDE"), *Over*, het venster en het Mac-menu, de Windows-zip en de README.
  - De releasebestanden heten `GDE-Groningen-<versie>-mac.dmg` en `GDE-Groningen-<versie>-windows-portable.exe`, de webzip `GDE-Groningen-<versie>-web.zip`.
  - [x] Ook de interne namen (voorbereiding open source): de `gte-*`-sleutels in localStorage heten nu `gde-*` (eenmalig gekopieerd bij het opstarten, `game/js/storagekeys.js`; de oude sleutels blijven nog even staan), appId `nl.natuspella.gde-groningen`, userData-map `GDE Groningen` (eenmalig gekopieerd uit `GTE VI`, `desktop/userdata.js`), cachenamen `gde-*`, IPC `gde:`, `GDE_*`-variabelen (`GTE_*` werkt nog), npm-naam `gde-groningen`. Alleen de reponaam en de map in de lokale checkout heten nog zo; zie `docs/OPEN_SOURCE_CHECKLIST.md`.
  - De conflictcheck via webzoekopdrachten vond niets (`docs/LICENTIES.md` §8.2). De handmatige registercheck staat hieronder nog open.
  - De recaps van Rikus zeggen nu "Eerder in GDE", opnieuw ingesproken.
- [x] Inventaris van bronnen en licenties: `docs/LICENTIES.md`, `docs/PUBLICEREN.md`, `NOTICE.md` en `licenses/`.
- [x] Credits in de game via het menu-item "Over", een vermelding van OpenStreetMap op de kaart, en de eindcredits.
- [x] Disclaimer op het laad- en startscherm en in de README. Bakkie Peut heet nu Bakkie Prut, en de Hema-uitverkoop is Wiebel.
- [x] De voorwaarden voor muziek en stemmen (Gemini via OpenRouter) zijn vastgelegd. Ze zijn vrij te verspreiden in een gratis game, met een AI-label, en mogen niet gebruikt worden om modellen te trainen.
- [ ] **Licentie (advies):** MIT voor de code, CC BY-NC 4.0 voor verhaal, stemmen en art, en ODbL voor de kaartdata. Daarna een `LICENSE`-bestand toevoegen.
- [x] **Sikkom** (een echt merk van het DvhN) heet nu **Kiekdoar**, en **Radio Grunn** (te dicht bij Grunn FM) heet **Radio Proat**. De regels met de oude namen zijn opnieuw ingesproken. Het scherm "Sikkom." bij een net mislukte missie blijft, want dat is het Groningse woord voor "bijna".
- [ ] **De Esri-satellietfoto** (`data/satellite_reference.jpg`) uit de repo en uit de geschiedenis halen. Dat gebeurt samen met het herschrijven van het e-mailadres, na akkoord.
- [x] De ongelogde, oudere stemclips (npc, politie, nieuws, jingles) zijn opnieuw ingesproken met 3.8 en gelogd, via `tts_barks_lines.mjs`.
- [x] De kleuren van de parodiewinkels zijn verschoven (Kruidvet, Albert Hijgt, DUMBO, Blokkie, Wiebel en Bakkie Prut). Cafés heten in berichten en in de kroegentocht naar verzonnen zaken; de kaart houdt de OSM-namen. Huisartsenposten bij respawn hebben een algemene naam.
- [x] Het logo met **Big Shoulders Display** (OFL), de plaatsnaam op een plaatsnaambord-vorm, en Gronings groen (`claude/gde-naam`). Het bord is groen met een witte rand in plaats van blauw: blauw zou de enige blauwe kleur in de game zijn en leest als een echt verkeersbord; de vorm zegt al "plaatsnaambord". Ook het app-icoon is nieuw. Lettertype en OFL staan in `licenses/`, `NOTICE.md` en `docs/LICENTIES.md`.
- [ ] Handmatig in het merkenregister zoeken naar "GDE" en "Grootste Diefstal Ever" (EUIPO en BOIP, ongeveer 15 minuten).

  1. **Schriftelijke toestemming** van de maker of makers. Dat is het veiligste, en kan meteen een mooie samenwerking of promotie opleveren. Doe dit vóór elke publieke release, en zeker vóór Steam.
  - [x] 3 okt: de eigenaar koos een andere naam voor haar. Anita heet nu Tessa, overal waar je het ziet of hoort (de interne sleutel `anita` blijft, voor de saves).

- [?] **Muziek:** met welk Gemini-product en welk abonnement is ze gemaakt? Dat moet in `docs/LICENTIES.md`.
- [?] BOIP-registratie (ongeveer €244 tot €271): advies is nu niet, want zonder kosten is de afspraak.
- [x] Het e-mailadres voor nieuwe commits is het GitHub-noreply-adres.
- [?] Het werkadres in de oude geschiedenis vervangen. Dat is een herschrijving plus force push, na de laatste merge en alleen na akkoord.
- [ ] Een secrets-scan vlak voor het openbaar maken (de laatste scan, op 3 okt, vond niets).
- [?] De repo openbaar maken, waarmee Pages, Actions en het bouwen in CI gratis worden.

## YouTube-kanaal

Alles staat in `docs/youtube/kanaal.md` (`claude/youtube-kit`). Er is niets geüpload en niets aangemaakt; kanaal en uploads doet Alexander.

- [x] Kanaalbeelden in `docs/youtube/beelden/`: profielfoto (800×800), banner (2560×1440, veilige zone 1546×423, plus een controleversie met hulplijnen), watermerk (150×150, transparant) en twee thumbnails (1280×720) voor de verhaal- en de gameplaytrailer. Opnieuw te maken met `nice -n 10 node scripts/youtube_images.mjs`, dat de helpers van `scripts/steam_images.mjs` hergebruikt.
- [x] De thumbnails tonen de Gouden Eierbal in zijn vitrine, nooit de lege vitrine of het kaartje "Tige tank!". De render komt uit de trailer met de bal teruggezet (`__trailer.prop()`).
- [x] Naam- en handlevoorstellen (advies `@GDEGroningen`), kanaalbeschrijving (NL met een Engelse regel), links, titels, beschrijvingen, tags en hoofdstukken voor beide trailers, de AI-melding (advies: "Nee", maar stemmen en muziek wel noemen), de disclaimer zonder merknamen, "niet voor kinderen", afspeellijsten en een uploadplan voor de eerste week.
- [ ] Kanaal aanmaken als merkaccount en de branding uploaden (Alexander).
- [ ] De gameplaytrailer maken (de Steam-cut met HUD, zie `docs/steam/trailer.md`) en de hoofdstuktijden invullen.
- [ ] De verhaaltrailer opnieuw exporteren met Tessa in plaats van Anita (naamkaart in shot 5).
- [?] Shot 11 (de lege vitrine met "Tige tank!") in de YouTube-versie houden of eruit knippen (Alexander).


## Steam-klaar (optioneel, na of rond 1.0)

Steam kost eenmalig $100 per game (Steam Direct). Dat bedrag komt terug na $1.000 omzet. Alexander beslist of hij dat ervoor overheeft; de game maken we in elk geval klaar.

- **Geen code signing nodig.** Steam start de game zelf, en macOS zet geen quarantainelabel op downloads via Steam. De ad-hoc-handtekening van electron-builder is genoeg voor Apple Silicon.
- **AI-melding** in de inhoudsvragenlijst van Valve, die op de winkelpagina komt. Vooraf gegenereerd: alle stemmen (Gemini TTS) en alle muziek (Gemini). Live gegenereerd: niets. De tekst om in te vullen staat in `docs/steam/winkelpagina.md`.
- [ ] De actuele regels van Steamworks online nalopen: het AI-beleid, de fee, de review en de wachttijden.
- [ ] **Branding verder van GTA af.** Dit is het grootste risico, want Valve reviewt op IP en Take-Two treedt actief op.
  - een eigen naam en logo, zonder "VI" in GTA-stijl en zonder het GTA-lettertype;
  - geen verwijzing naar GTA in de titel;
  - een duidelijke disclaimer.
- [ ] Leeftijdsclassificatie (IARC): de vragenlijst invullen volgens [docs/LEEFTIJD.md](docs/LEEFTIJD.md). Het doel is 18 (PEGI 18 / USK 18).
- [~] Winkelpagina (`claude/steam-pagina`, alles in `docs/steam/`; er is niets naar Steam gestuurd):
  - [x] een Nederlandse en een Engelse beschrijving, korte beschrijving, kenmerken, 20 tags, talen, inhoudslabels, AI-melding, disclaimer en privacy: `docs/steam/winkelpagina.md`;
  - [x] capsule-afbeeldingen in alle Steam-formaten (header, small, main, vertical, page background, library capsule/header/hero/logo, community-icoon) in `docs/steam/beelden/`, opnieuw te maken met `nice -n 10 node scripts/steam_images.mjs` (één headless Chrome en één devserver);
  - [x] screenshots (1920×1080) in `docs/steam/beelden/screenshots/`;
  - [ ] systeemeisen bevestigen met een meting op een Intel-laptop (nu voorlopig, zie de winkelpagina);
  - [ ] de trailer: een Steam-cut met het logo in de eerste 3 s en HUD-gameplay, zie `docs/steam/trailer.md`;
  - [ ] besluit: de disclaimer op de winkelpagina met of zonder merknamen (nu zonder).
- [~] Een Steam-build: de Windows-, Mac- en Linux-builds via SteamPipe (`claude/builds`). De sjablonen staan in `steam/` (`app_build.vdf` en een depot per OS, met nep-id's), `steam/copy-builds.mjs` zet de uitgepakte builds in `steam/content/`, en `steam/README.md` beschrijft het uploaden met `steamcmd`. Nog te doen zodra er een app-id is: de id's invullen en de eerste upload.
- [ ] De Steam-overlay met Electron en Chromium testen, en oplossen of accepteren.
- [~] Steam Deck: een Linux-build en een test op het toestel. De controllersupport (0.25) is er, en de HUD en het menu zijn op 1280×800 nagekeken.
  - [x] De Linux-build: `npm run dist:linux` of `npm run release -- minor --linux` maakt `GDE-Groningen-<versie>-linux.AppImage` en `.tar.gz` (x64), ook op de Mac zonder Docker (`claude/builds`). Saves staan in `~/.config/GDE Groningen`.
  - [ ] Testen op een echte Steam Deck en op een Linux-pc: start hij, werkt de controller, en is `--no-sandbox` nodig binnen de Steam Linux Runtime.
- [ ] Optioneel: Steam-achievements en cloud-saves via steamworks.js, gekoppeld aan de bestaande prestaties.
- [ ] De planning: 30 dagen wachten na betaling, minimaal 2 weken "coming soon", en de review van de pagina en de build.
- [?] Het besluit: $100 betalen en naar Steam (Alexander).

## 1.0-RC en 1.0.0

- [ ] Twee weken alleen bugfixes.
- [ ] De definitieve trailer op YouTube, na akkoord.
- [ ] 1.0.0: downloads plus de webversie.

## Klaar

- [x] 0.23.0 (3 okt 2026): echte gebouwen ronde 2, Ommeland ronde 2, gevels en wegen die minder flikkeren, bestuurders op de goede plek, een soepele ring in cutscenes, laadtijd van 10 naar 6 s, kusjes na H13, juridische basis (Over, disclaimer, licenties) en de webversie (alleen lokaal).
- [x] 0.22.0 (3 okt 2026):
  - het definitieve verhaal en alle stemmen opnieuw ingesproken;
  - de trailer en de video-export;
  - de menu's, het doelsysteem en de HUD;
  - performance ronde 1 en 2;
  - de echte gebouwen: markten, thuis, Paddepoel;
  - het mooiere Ommeland en het water;
  - de mesh-fixes.
