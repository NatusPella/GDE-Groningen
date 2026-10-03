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
- [ ] Een webversie bouwen: de offline-staging als website, met een laadscherm met voortgang en caching van de 173 MB.
- [ ] Audio comprimeren (Opus), wat ongeveer de helft van de download scheelt.
- [?] Waar de webversie komt: itch.io (een gratis account) of GitHub Pages zodra de repo openbaar is.
- [ ] Het releasescript publiceert de webversie mee.

## 0.25: afwerking voor nieuwe spelers

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

- [x] 0.22.0 (3 okt 2026):
  - het definitieve verhaal en alle stemmen opnieuw ingesproken;
  - de trailer en de video-export;
  - de menu's, het doelsysteem en de HUD;
  - performance ronde 1 en 2;
  - de echte gebouwen: markten, thuis, Paddepoel;
  - het mooiere Ommeland en het water;
  - de mesh-fixes.
