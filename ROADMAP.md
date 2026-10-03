# Roadmap naar GTE VI 1.0.0

Bijgewerkt: 3 oktober 2026, na release 0.22.0.

**Spelregels**
- Geen kosten: geen betaalde certificaten, hosting of diensten. De downloads blijven ongetekend, en de release notes zeggen dat.
- Niets wordt openbaar zonder uitdrukkelijk akkoord van Alexander. Dat geldt voor de zichtbaarheid van de repo, Pages, itch.io, YouTube en posts.
- Er is één testronde per release: de verhaaltest in Electron, de node-tests, en een korte speeltest. Agents doen tussendoor alleen lichte checks.
- De legenda: `[x]` is klaar, `[~]` loopt (met de branch erachter), `[ ]` is open, en `[?]` wacht op een besluit.

## 0.23: alles wat nu loopt, plus een speeltest

**Visueel en wereld**
- [~] Mesh ronde 3 (`claude/mesh-ronde3`): stoeptegels die flikkeren op kruispunten, water en markering die flikkeren, spoorbedden, de laatste kieren bij verhoogde en verdiepte wegen, 291 gaten, de Griffeweg, zwevende en zinkende gebouwen.
- [~] Gevels die flikkeren (`claude/gevel-zfight`): een detector en fixes voor materialen die op elkaar liggen.
- [~] Ommeland ronde 2 (`claude/ommeland-ronde2`): echte plattegronden voor L-vormige gebouwen, OSM-fietspaden, winkelpuien, kerkgevels, maren als echt water, gladdere oevers, stadsboten het Ommeland in.
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
- [~] Bestuurders op de goede plek, onder andere in de vet-truck (`claude/voertuigen-cutscene`).
- [~] Auto's op de ring in cutscenes rijden netjes: hoogte, richting, rijstrook, wielen.

**Performance**
- [~] Perf ronde 3 (`claude/perf-ronde3`):
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
- [?] Waar de webversie komt: itch.io (een gratis account) of GitHub Pages zodra de repo openbaar is. Beide kunnen: de map past binnen de limieten van itch.io (516 van de 1000 bestanden, 257 van de 500 MB), en `npm run web:zip` maakt de zip.
- [ ] Het releasescript publiceert de webversie mee.

## 0.25: afwerking voor nieuwe spelers

- [ ] Onboarding: de eerste 10 minuten zonder uitleg te snappen, getoetst met spelers die de game niet kennen.
- [ ] Toegankelijkheid:
  - toetsen opnieuw toewijzen;
  - controllersupport;
  - een grootte voor de ondertitels;
  - markers die werken voor kleurenblinden.
- [ ] Opt-in foutrapporten of een logbestand om mee te sturen.
- [ ] Een save-garantie: saves vanaf 1.0 blijven werken, met een migratietest op oude saves.
- [ ] Feature freeze.

## Juridisch en publiceren (vóór 1.0)

- [~] Inventaris van bronnen en licenties (`claude/juridisch`): `docs/LICENTIES.md` en `docs/PUBLICEREN.md`.
- [ ] Credits in de game: OpenStreetMap (ODbL), lettertypes, three.js.
- [ ] Disclaimer: "Fanparodie, niet gelieerd aan Rockstar Games of Take-Two".
- [ ] Logo, lettertypes en merknamen nalopen op te veel gelijkenis met echte merken.
- [ ] Muziek en stemmen (alles van Gemini): de voorwaarden van Google en OpenRouter vastleggen.
- [?] De licentie voor code en content (voorstel: MIT en CC BY-NC 4.0).
- [x] Het e-mailadres voor nieuwe commits is het GitHub-noreply-adres.
- [?] Het werkadres in de oude geschiedenis vervangen. Dat is een herschrijving plus force push, na de laatste merge en alleen na akkoord.
- [ ] Een secrets-scan vlak voor het openbaar maken (de laatste scan, op 3 okt, vond niets).
- [?] De repo openbaar maken, waarmee Pages, Actions en het bouwen in CI gratis worden.

## 1.0-RC en 1.0.0

- [ ] Twee weken alleen bugfixes.
- [ ] De definitieve trailer op YouTube, na akkoord.
- [ ] 1.0.0: downloads plus de webversie.

## Klaar

- [x] 0.22.0 (3 okt 2026):
  - het definitieve verhaal en alle stemmen opnieuw ingesproken;
  - de trailer en de video-export;
  - de menu's, het doelsysteem en de HUD;
  - performance ronde 1 en 2;
  - de echte gebouwen: markten, thuis, Paddepoel;
  - het mooiere Ommeland en het water;
  - de mesh-fixes.
