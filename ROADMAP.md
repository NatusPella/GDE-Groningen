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
- [ ] Stadsboten kunnen de stad uit varen, het Ommeland in.
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

**Pakket A: verhaalverloop en opening** (`claude/feedback-verhaal`)
- [~] Te veel tegelijk: één wachtrij voor telefoontjes, radio, autogesprekken, meldingen en cutscenes.
- [~] Samen gaan wonen: in de opening huren Tammo en Anita samen een appartement in Paddepoel, weg uit de krappe studentenkamer. Daarna is Paddepoel thuis.
- [~] Onderduiken: een duidelijke bestemming, plus 2 à 3 keuzes voor iets leuks samen.
- [~] Geen "Kop/Romp/Staart" meer in beeld, maar gewone namen voor de delen.
- [~] Kusjes kunnen soms nog te vroeg, afhankelijk van of je Tammo of Anita speelt.
- [~] "Koop een huurboot" wordt "huur een boot". De "tredes" worden duidelijk uitgelegd.
- [~] Een eigen icoon per missie.

**Pakket B: missies** (`claude/feedback-missies`)
- [~] H3: duidelijk hoe je punten scoort, met een live score en een doel.
- [~] H6: allebei in zwarte kleding. Na de kraak wijst de waypoint naar een kade bij het Hoofdstation. In de trein weer gewone kleren.
- [~] H8: de tankwagen van Us Mem Vet staat op een logische plek, met tekst erop. Kapen is de bedoelde route.
- [~] H5: geen op elkaar af fietsen terwijl ze samen op één fiets zitten.
- [~] H11: per kroeg een korte cutscene met een drankje.
- [~] H13:
  - de echte uitslag in plaats van altijd 3e;
  - cutscenes bij de brug en bij de boosheid van de tegenstander;
  - Tammo gaat verder met zijn feitjes;
  - de kus krijgt opbouw;
  - de instapscène is beter in beeld.
- [~] H14: de boeven fietsen niet meer door een muur.

**Pakket C: wereld, geluid en HUD** (`claude/feedback-wereld`)
- [x] Voertuigbadge: naam en merk erbij, en conditie met een hartje in plaats van "schade".
- [x] "Prestaties wachten" staat alleen kort in beeld (net als "meldingen wachten").
- [x] Een prettiger brommergeluid.
- [x] Zwemmers in zwemkleding die niet zwaaien als drenkelingen. Meer leven op het water: bootjes, kano's, suppers en zwanen.
- [x] Betere waterlijn en golfslag voor alle boten. Remsporen liggen op de bovenste weglaag en blijven langer liggen.
- [x] Cutscenes laden details rond de camera, niet rond de speler. Een rijkere minimap in het Ommeland.
- [ ] Nog in het echt bekijken: de boten en zwemmers op het water en de ring (de screenshots van die plekken lukten niet).

**Pakket D: heli, carbid en padel** (start zodra er ruimte is)
- [ ] De heli-missie herbouwen: opstijgen bij Airport Eelde, onderweg een spoedgeval naar het UMCG, dan naar de ballon. Geen tweede heli en een logische landing. De ballonvlucht moet goed te doen zijn.
- [ ] Nieuwe heli-besturing: WASD voor sturen en vooruit/achteruit, Shift voor snelheid, Spatie voor omhoog en Ctrl voor omlaag.
- [ ] De kaart draait goed mee tijdens de heli-missie met de cirkels.
- [ ] Een betere missienaam dan "Spoedeisende duif".
- [ ] Een route naar carbid en padel in het verhaal. TTS tijdens padel, en geen waypoint naar de volgende missie tijdens het spel.
- [ ] Een reden waarom je padel speelt tegen Durk en Douwe.

**Ring:** nog steeds zwarte lagen hier en daar. Dat valt onder mesh ronde 4 en 5, die gepauzeerd zijn.

## 0.24: echte zwakke hardware en de webversie

- [ ] Meten op een echte Intel-laptop (Iris Xe of UHD 620) en een Chromebook of vergelijkbaar toestel. Daarvoor is hardware van Alexander of een kennis nodig.
- [ ] De lat: Laag haalt 30 fps zonder haperingen op de drukste plekken, en de laadtijd blijft onder de 30 s.
- [~] Een webversie bouwen (`claude/webversie`): `npm run web` in `desktop/` maakt `web-dist/` uit de offline-staging, met relatieve paden, een laadscherm dat de MB's van de kaart telt, een service worker die alles cachet (per versie, ook offline), en audio die pas laadt als hij speelt. Getest in headless Chrome; nog niet in Safari, Firefox en op echte zwakke hardware.
- [x] Audio comprimeren (Opus) voor de webversie: 149 MB wordt 85 MB (muziek de helft, stemmen 28% kleiner, want die waren al 48 kbps). Safari vóór 18.4 krijgt de mp3's.
- [?] Waar de webversie komt: itch.io (een gratis account) of GitHub Pages zodra de repo openbaar is. Beide kunnen: de map past binnen de limieten van itch.io (521 van de 1000 bestanden, 258 van de 500 MB), en `npm run web:zip` maakt de zip.
- [ ] Het releasescript publiceert de webversie mee.
- [x] Three.js en de lettertypes in de webversie zelf hosten, zonder jsDelivr of Google Fonts, voor privacy en offline gebruik: `npm run web` vendort ze net als de desktopbuild (`claude/webversie`).

**Architectuur (op basis van metingen; eerst een profiel van de hoofdthread maken, op Laag en met een vertraagde CPU)**
- [ ] **Web Workers** voor het opbouwen van stukken stad en Ommeland: geometrie, rijen, wegen en water gaan als buffers naar de hoofdthread. Dat geeft de grootste winst tegen haperingen tijdens het rijden en vliegen.
- [ ] **Geometrie vooraf bakken** in het bouwscript (binair, of glTF met meshopt), in plaats van alles bij het opstarten uit OSM te genereren. Dat geeft een veel kortere laadtijd.
- [ ] `BatchedMesh` voor objecten met verschillende vormen maar hetzelfde materiaal.
- [ ] Daarna pas: de simulatie (verkeer en voetgangers) in een worker, en WASM voor gemeten hotspots als dat dan nog nodig is.
- [ ] Na 1.0: WebGPU (de WebGPURenderer van three.js) met WebGL als terugval. Dat vraagt een herschrijving van onze eigen shaders.

## 0.25: afwerking voor nieuwe spelers

- [x] **Leeftijdsclassificatie: mik op PEGI 16** (`claude/pegi16`). De verwachte antwoorden voor de vragenlijst staan in [docs/LEEFTIJD.md](docs/LEEFTIJD.md).
  - Bloed en ledematen (`gore3d.js`) zijn helemaal uit de game, net als de instelling.
  - Burgers raken knock-out, staan op en schelden, maar gaan niet dood. Wapens raken ze niet.
  - Agenten worden uitgeschakeld en staan later weer op. De alcohol blijft, met een inhoudslabel.
- [ ] De IARC-vragenlijst echt invullen.
- [x] **Geen gesimuleerd gokken meer** (`claude/geen-gokken`). De kraskaarten en loten bij Rook & Geluk (PEGI: 18) zijn weg. De winkel heet nu Krant & Kauwgom en heeft een spaarkaart: elke aankoop een stempel, 10 stempels geven vast €10. Zie docs/LEEFTIJD.md.
- [ ] Onboarding: de eerste 10 minuten zonder uitleg te snappen, getoetst met spelers die de game niet kennen.
- [~] Toegankelijkheid (`claude/toegankelijk`, in headless Chrome getest met een nagebootste controller; nog niet op echte hardware):
  - [x] toetsen en controllerknoppen opnieuw toewijzen, met ruilen bij een conflict en "Standaard herstellen";
  - [x] volledige controllersupport via de Gamepad API (Xbox, PlayStation, Steam Deck): spel, minigames en alle menu's, hints met de knoppen van je controller, trillen;
  - [x] een grootte voor de ondertitels, met een vlak erachter;
  - [x] markers die werken voor kleurenblinden: patronen en vormen, plus drie paletten;
  - [ ] testen met een echte Xbox-, PlayStation- en Steam Deck-controller (zie de lijst in de PR).
- [ ] Opt-in foutrapporten of een logbestand om mee te sturen.
- [ ] Een save-garantie: saves vanaf 1.0 blijven werken, met een migratietest op oude saves.
- [ ] Feature freeze.

## Juridisch en publiceren (vóór 1.0)

- [x] **Nieuwe naam, besloten op 3 okt.** De titel is **GDE Groningen – Zomer vol misdaad**, met *Grootste Diefstal Ever* als betekenis van GDE (`claude/gde-naam`).
  - De reeks heet GDE, plus een stad of provincie en een ondertitel per game, bijvoorbeeld GDE Drenthe of GDE Leeuwarden. `game/js/logo.js` houdt de naam op één plek; een vervolg wisselt alleen de plaats en de ondertitel.
  - Het cijfer "VI" en de woorden "Grand Theft" zijn weg uit alles wat een speler ziet: `<title>`, laad- en titelscherm, disclaimer, pauzemenu, trailer, intro, aftiteling, telefoonberichten (afzender "GDE"), *Over*, het venster en het Mac-menu, de Windows-zip en de README.
  - De releasebestanden heten `GDE-Groningen-<versie>-mac.dmg` en `GDE-Groningen-<versie>-windows-portable.exe`, de webzip `GDE-Groningen-<versie>-web.zip`.
  - Blijft bewust "GTE": de `gte-*`-sleutels in localStorage, de appId `nl.natuspella.gte-vi`, de userData-map `GTE VI` (expliciet vastgezet in `desktop/main.js`, anders verweesde saves), de cachenamen van de webversie, de `gte:`-IPC-kanalen, `GTE_*`-variabelen, bestands- en reponamen. Zie README, "The old name".
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

- [?] **Muziek:** met welk Gemini-product en welk abonnement is ze gemaakt? Dat moet in `docs/LICENTIES.md`.
- [?] BOIP-registratie (ongeveer €244 tot €271): advies is nu niet, want zonder kosten is de afspraak.
- [x] Het e-mailadres voor nieuwe commits is het GitHub-noreply-adres.
- [?] Het werkadres in de oude geschiedenis vervangen. Dat is een herschrijving plus force push, na de laatste merge en alleen na akkoord.
- [ ] Een secrets-scan vlak voor het openbaar maken (de laatste scan, op 3 okt, vond niets).
- [?] De repo openbaar maken, waarmee Pages, Actions en het bouwen in CI gratis worden.

## Steam-klaar (optioneel, na of rond 1.0)

Steam kost eenmalig $100 per game (Steam Direct). Dat bedrag komt terug na $1.000 omzet. Alexander beslist of hij dat ervoor overheeft; de game maken we in elk geval klaar.

- **Geen code signing nodig.** Steam start de game zelf, en macOS zet geen quarantainelabel op downloads via Steam. De ad-hoc-handtekening van electron-builder is genoeg voor Apple Silicon.
- **AI-melding** in de inhoudsvragenlijst van Valve, die op de winkelpagina komt. Vooraf gegenereerd: alle stemmen (Gemini TTS) en alle muziek (Gemini). Live gegenereerd: niets.
- [ ] De actuele regels van Steamworks online nalopen: het AI-beleid, de fee, de review en de wachttijden.
- [ ] **Branding verder van GTA af.** Dit is het grootste risico, want Valve reviewt op IP en Take-Two treedt actief op.
  - een eigen naam en logo, zonder "VI" in GTA-stijl en zonder het GTA-lettertype;
  - geen verwijzing naar GTA in de titel;
  - een duidelijke disclaimer.
- [ ] Leeftijdsclassificatie (IARC): de vragenlijst invullen volgens [docs/LEEFTIJD.md](docs/LEEFTIJD.md). Het doel is 16.
- [ ] Winkelpagina:
  - capsule-afbeeldingen in alle Steam-formaten;
  - screenshots;
  - de trailer;
  - een Nederlandse en een Engelse beschrijving.
- [ ] Een Steam-build: de Windows-, Mac- en Linux-builds via SteamPipe, met een uploadscript.
- [ ] De Steam-overlay met Electron en Chromium testen, en oplossen of accepteren.
- [ ] Steam Deck: een Linux-build en een test op het toestel. De controllersupport (0.25) is er, en de HUD en het menu zijn op 1280×800 nagekeken.
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
