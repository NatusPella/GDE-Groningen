# Open source: stand van zaken en open beslissingen

Stand van 15 oktober 2026, op de branch met de naamsopruiming (versie na
0.28.0). Er is **niets gepubliceerd**: de repo is privé, er is geen Pages,
niets gepusht naar een publieke plek.

Legenda: **[x]** gedaan, **[ ]** nog te doen, **[?]** besluit van de
eigenaar nodig. De procedures (filter-repo, GitHub-instellingen) staan in
[PUBLICEREN.md](PUBLICEREN.md), de juridische achtergrond in
[LICENTIES.md](LICENTIES.md). De uitgebreide historie-audit staat lokaal in
`.claude/review/history-audit.md` (niet in git).

## 1. Licenties

- [x] Code: **GPL-3.0-or-later**, volledige tekst in `LICENSE`;
      `desktop/package.json` heeft `"license": "GPL-3.0-or-later"`.
- [x] Eigen inhoud: **CC BY-NC-SA 4.0** in `LICENSE-CONTENT.md`, met de
      mappen die eronder vallen (audio, muziek, verhaal/dialogen, het
      Martinitoren-model, schermafbeeldingen).
- [x] Naam "GDE" / "GDE Groningen – Zomer vol misdaad" en het logo: alle
      rechten voorbehouden, met een korte naam-en-logo-paragraaf
      (`LICENSE-CONTENT.md#naam-en-logo`).
- [x] Werk van derden houdt zijn licentie: OSM-kaartdata ODbL, lettertypen
      OFL, three.js MIT, Electron MIT (`NOTICE.md`, `licenses/`).
- [x] README, NOTICE.md, `docs/LICENTIES.md` §7/§9 en het *Over*-scherm in
      het spel (`game/js/credits.js`) noemen de licenties.
- [?] **AI-muziek en -stemmen onder CC BY-NC-SA.** Wat de voorwaarden
      zeggen (LICENTIES.md §4): Google claimt geen eigendom van de output,
      verspreiden in een gratis spel mag, OpenRouter voegt niets toe, en je
      mag niet doen alsof het door mensen is gemaakt (dat vermelden we).
      **Onduidelijk:** (a) of derden de clips onder CC BY-NC-SA mogen
      doorgeven: de voorwaarden zeggen daar niets over, en puur door AI
      gemaakte audio is in de EU waarschijnlijk niet auteursrechtelijk
      beschermd, dus de CC-licentie is daar mogelijk niet af te dwingen;
      (b) met welk Gemini-product en abonnement de **muziek** gemaakt is
      (app of API, gratis of betaald): dat bepaalt welke voorwaarden
      gelden. `LICENSE-CONTENT.md` zegt nu "voor zover daar rechten op
      rusten". Vastleggen welk product, en eventueel de voorwaarden van dat
      product laten nalezen.
- [?] **Spelteksten in GPL-bestanden.** Dialogen en verhaal staan in
      JavaScript (`storyarc.js`, `*lines.js`, `missionstory.js` …). NOTICE en
      LICENSE-CONTENT zeggen: GPL voor de code, CC BY-NC-SA voor de teksten
      in die bestanden. Dat is juridisch niet waterdicht (een GPL-bestand
      mag commercieel verspreid worden). Opties: zo laten; de teksten naar
      aparte databestanden verhuizen (veel werk); of accepteren dat die
      teksten onder de GPL vallen.
- [?] **Bijdragen en een latere betaalde versie.** `CONTRIBUTING.md` zegt
      nu dat bijdragen onder GPL (code) en CC BY-NC-SA (inhoud) vallen. Dan
      mag de eigenaar ingestuurde *inhoud* zelf ook niet commercieel
      gebruiken (bijv. een betaalde Steam-versie). Wil je die ruimte
      houden: een korte bijdragersverklaring (CLA of extra licentie aan
      NatusPella) toevoegen vóór de eerste externe bijdrage.
- [ ] Handmatige merkcheck "GDE" en "Grootste Diefstal Ever" (EUIPO,
      BOIP), zie ROADMAP.

## 2. Oude namen en GTA-verwijzingen (huidige boom)

- [x] Alles wat een speler ziet heette al GDE (0.24). Nu ook de interne
      namen: opslagsleutels `gde-*` (met eenmalige migratie,
      `game/js/storagekeys.js`), userData-map `GDE Groningen` (eenmalige
      kopie uit `GTE VI`, `desktop/userdata.js`), appId en Windows
      AppUserModelId `nl.natuspella.gde-groningen`, npm-naam
      `gde-groningen`, IPC `gde:*`, `window.gdeDesktop`, webcaches `gde-*`,
      env-variabelen `GDE_*`, Windows-zipmap `GDE-Groningen`, User-Agent van
      de kaartscripts. Getest: `scripts/storage_migration_test.mjs` (70
      checks) en een Electron-check op een wegwerpprofiel (één run
      die oude sleutels zet, één die opstart: save geladen, geld 3100, "Doorgaan" in het menu, oude sleutels
      bewaard).
- [x] "GTA-style" en dergelijke uit code-commentaar, `ARCHITECTURE.md` en
      `DESIGN_SYSTEM.md`; "GTE VI" uit de verhaaldocs en titels.
- [x] `GTE-VI-Windows.zip` stond niet (meer) in git; `.gitignore` sluit hem
      en de nieuwe namen uit. `.claude/` staat nu ook in `.gitignore`.
- [x] Bewust gehouden (met reden):
  - de **disclaimer** in het spel en in NOTICE noemt GTA, Rockstar Games
    en Take-Two ("niet gelieerd aan"): zo hoort een disclaimer, en
    LICENTIES.md §6.1 adviseert hem;
  - **juridische en storedocs** (`docs/LICENTIES.md`,
    `docs/steam/winkelpagina.md`, `docs/youtube/kanaal.md`, ROADMAP
    "Steam-klaar") noemen GTA juist om te zeggen wat níet mag;
  - **ontwerpdocs** in `docs/verhaal/` en `docs/SPEELTEST.md` beschrijven
    de trailerparodie en het genre ("GTA VI-trailerparodie",
    "GTA-achtige games"): beschrijvend, past bij de aangekondigde parodie;
  - **CHANGELOG.md**: oude versies heten GTE VI; de kop noemt "tot 0.24:
    GTE VI" één keer;
  - **migratiecode**: de oude namen `gte-*`, `gte6.placeshots`,
    `gte-minimap-layers`, `GTE VI`, `gte-vi-*`, `GTE_*` staan in
    `storagekeys.js`, `userdata.js`, `web/sw.js`, `desktop/main.js` en
    `desktop/build.mjs`, anders vindt de migratie de oude data niet;
  - `desktop/release.sh`: de releasenotes zeggen "Speelde je al toen de
    game nog GTE VI heette? Je saves blijven staan" (klopt, en helpt
    spelers met de oude Mac-app);
  - `game/ommeland.bin` begint nog met de bytes `GTEO` (het spel leest die
    niet; `scripts/add_ommeland.py` schrijft voortaan `GDEO`, dus dat
    verdwijnt bij de volgende kaartbouw);
  - de naam van de lokale checkoutmap (`grand-theft-eierbal-vi`); de
    GitHub-repo heet al `GDE-Groningen`.
- [ ] Over één of twee releases: de oude sleutels opruimen met
      `removeLegacyKeys()` (TODO in `storagekeys.js`) en spelers laten
      weten dat de map `GTE VI` weg mag (TODO in `userdata.js`).

## 3. Secrets

- [x] Geen API-sleutels of privésleutels in de boom of de historie
      (alle commits, alle branches, opnieuw gezocht op 15 okt:
      OpenRouter, Google, Anthropic, GitHub, Slack, AWS, private keys;
      ook de aparte historie-audit vond niets).
- [x] `.env` is nooit gecommit (`git log --all --diff-filter=A -- .env
      '*.env'` is leeg) en staat in `.gitignore` (`.env`, `.env.*`).
      Niet geopend.
- [ ] Vlak vóór publicatie: `gitleaks detect --source . --log-opts="--all"`
      (gitleaks is nog niet geïnstalleerd).
- [?] De OpenRouter-sleutel roteren (hij is lokaal en in sessies gebruikt).

## 4. Persoonsgegevens

- [x] Het werk-e-mailadres staat niet meer in de huidige bestanden (ook
      niet meer in `docs/PUBLICEREN.md`, met de verouderde aantallen).
- [?] **Werk-e-mailadres in de historie**: de oudere commits en 27
      tag-objecten (tot 3 okt) hebben het werkadres als auteur, committer
      en tagger; nieuwere het noreply-adres. Herschrijven met
      `git filter-repo --mailmap` en force-push (PUBLICEREN.md §2). Alleen
      na akkoord; daarna alle oude kloons en worktrees weggooien.
- [?] **Eigen naam** "NatusPella" in `desktop/package.json` (`author`,
      `copyright`), in het About-paneel van de desktopapp
      (`desktop/main.js`), in ROADMAP ("akkoord van Alexander") en in
      `docs/steam/winkelpagina.md`. Bewust zo houden, of overal
      "NatusPella" gebruiken (zoals README, NOTICE en LICENSE-CONTENT al
      doen)?
- [x] OSM-exports in `data/` bevatten zakelijke contactgegevens uit
      OpenStreetMap (ook enkele privé-ogende e-mailadressen): publiek onder
      de ODbL, acceptabel. Desgewenst `contact:*`/`email`/`phone` uit de
      raw-exports filteren in de scripts.
- [x] Speeltester alleen bij bijnaam ("Maus"); geen andere privénamen,
      adressen of paden (`/Users/…`) in de bestanden.

## 5. Echte personen en merken

- [x] Tammo en Tessa zijn eigen, verzonnen personages. De aftiteling
      (`game/js/story.js`); de ROADMAP-notitie over een echt persoon en de
      verwijzingen naar een TikTokker in de docs zijn weg of neutraal
      gemaakt.
- [?] **In de historie** staat de koppeling met een echt persoon nog:
      over een echte auto (`vehiclenames.js`, al eerder weggehaald, het
      commitbericht bevestigt de koppeling), en ROADMAP/docs-passages.
      Opties: zo laten, of meenemen in de filter-repo-run met
      `--replace-text` en `--replace-message` (plan in de historie-audit).
- [x] Echte merken in het spel zijn eerder vervangen (Kiekdoar, Radio
      Proat, Bakkie Prut, verzonnen cafés; LICENTIES.md §6.2). Parodienamen
      op winkelketens blijven (Albert Hijgt, DUMBO, EIKEA …), met eigen
      kleuren.
- [?] **Oude audio en iconen in de historie**: verwijderde voice-clips met
      echte merknamen (Sikkom, Radio Grunn, echte cafés; o.a.
      `game/audio/sikkom/`, ~9 MB) en het oude "GTE VI"-icoon in GTA
      VI-stijl. Acceptabel als parodie en al opgeschoond, of strippen met
      `--strip-blobs-with-ids`.
- [?] Commitberichten met "GTE VI", "Grand Theft Eierbal" en "GTA-style"
      (15 stuks, o.a. de eerste commit): zo laten of `--replace-message`.
- [ ] `docs/groningen-memes*.md` nog één keer nalezen op geciteerd
      materiaal van derden (lijstjes, uitspraken).

## 6. Bestanden en grootte

- [x] `data/satellite_reference.jpg` (Esri World Imagery, mag niet
      herverspreid worden) is uit de huidige boom en staat in
      `.gitignore`. `scripts/extract_palette.py` (alleen nodig om de
      paletkleuren opnieuw te bepalen) stopt nu met een duidelijke melding
      als het bestand lokaal ontbreekt. Niet nodig voor het spel of de
      builds.
- [?] Dezelfde foto **uit de historie** halen (`--invert-paths --path
      data/satellite_reference.jpg`). Zolang hij in de historie staat, mag
      de repo niet publiek.
- [x] Geen bestanden boven de 50 MB-waarschuwing van GitHub. Grootste:
      `data/groningen_raw.json` 32,5 MB, `game/citymap.json` 11,2 MB (11
      versies), de muziek 3-4 MB per nummer. Pack ~353 MB, waarvan ~169 MB
      alleen in de historie (vooral oude voice-clips).
- [?] Grootte zo laten, of oude audio uit de historie strippen (~150 MB
      minder, maar oude commits spelen dan niet meer volledig af), en/of
      `data/*_raw.json` niet meer committen (opnieuw te maken met de
      scripts; de ODbL vraagt dat de manier om de data te maken
      beschikbaar is).
- [x] Beelden in de repo (`docs/steam/beelden`, `docs/youtube/beelden`)
      zijn renders uit het spel; het Martinitoren-model is Claude
      Design-output (rechten bij de gebruiker). Geen andere afbeeldingen,
      lettertypen of code van derden in de boom.

## 7. Community en GitHub

- [x] `README.md` (Nederlands, met een korte Engelse samenvatting),
      `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, in
      het Nederlands), `SECURITY.md`, issue-sjablonen (bug, idee) en een
      PR-sjabloon in `.github/`. De ontwikkelaarsnotities die eerst in de
      README stonden, staan nu in `docs/ONTWIKKELEN.md`.
- [ ] In de repo-instellingen **Private vulnerability reporting** aanzetten
      (Settings › Code security); `SECURITY.md` en het issue-sjabloon
      verwijzen ernaar.
- [ ] Secret scanning, push protection en Dependabot aanzetten
      (PUBLICEREN.md §6).
- [?] De release-zips en -builds tot 0.23 dragen nog de oude naam; die
      staan in de privé-repo bij de Releases. Houden of verwijderen.

## 8. Volgorde tot publiek

1. [?] Besluiten hierboven, vooral: historie herschrijven (e-mail, Esri,
   personen) ja of nee.
2. [ ] Deze branch mergen; dan pas de filter-repo-run (PUBLICEREN.md §2),
   anders komt oud werk terug.
3. [ ] gitleaks, sleutel roteren, GitHub-instellingen.
4. [?] Zichtbaarheid naar publiek: alleen met uitdrukkelijk akkoord.
