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

- [ ] **Leeftijdsclassificatie: mik op PEGI 16** (advies). Nu is het waarschijnlijk 18, door het doden van onschuldigen en het bloed.
  - Bloed en ledematen (`gore3d.js`) helemaal uit de game halen, niet alleen achter een instelling.
  - Voetgangers raken knock-out, staan op en schelden, maar sterven niet. Ook niet door aanrijdingen of schoten.
  - Het geweld met de politie, die terugvecht, kan blijven. De alcohol blijft, met een inhoudslabel.
  - De IARC-vragenlijst invullen met de antwoorden die daarbij horen.
- [ ] Onboarding: de eerste 10 minuten zonder uitleg te snappen, getoetst met spelers die de game niet kennen.
- [ ] Toegankelijkheid:
  - toetsen opnieuw toewijzen;
  - volledige controllersupport (ook nodig voor de Steam Deck);
  - een grootte voor de ondertitels;
  - markers die werken voor kleurenblinden.
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
  - Nog met de oude naam: twee ingesproken recaps van Rikus zeggen "Eerder in GTE VI" (deel 2 en 3, `storyarc.js`). De ondertitel blijft gelijk aan de opname tot die opnieuw ingesproken is; dat kan mee met de Sikkom- en radio-hernoeming.
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
- [ ] Leeftijdsclassificatie (IARC): geweld, schieten, politie en alcohol. Waarschijnlijk 16+ of 18+.
- [ ] Winkelpagina:
  - capsule-afbeeldingen in alle Steam-formaten;
  - screenshots;
  - de trailer;
  - een Nederlandse en een Engelse beschrijving.
- [ ] Een Steam-build: de Windows-, Mac- en Linux-builds via SteamPipe, met een uploadscript.
- [ ] De Steam-overlay met Electron en Chromium testen, en oplossen of accepteren.
- [ ] Steam Deck: volledige controllersupport (zie 0.25), een Linux-build, en de tekstgrootte op 800p.
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
