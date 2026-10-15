# Open source: stand van zaken en open beslissingen

Stand van 15 oktober 2026, op `main` na 0.29.0. Er is **niets
gepubliceerd**: de repo is privé, er is geen Pages, niets gepusht naar een
publieke plek. De historie is herschreven en de licenties staan; wat nog
openstaat voor de eigenaar: de OpenRouter-sleutel roteren, private
vulnerability reporting aanzetten zodra de repo publiek is, en het besluit
om publiek te gaan.

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
- [x] **AI-muziek en -stemmen onder CC BY-NC-SA.** Wat de voorwaarden
      zeggen (LICENTIES.md §4): Google claimt geen eigendom van de output,
      verspreiden in een gratis spel mag, OpenRouter voegt niets toe, en je
      mag niet doen alsof het door mensen is gemaakt (dat vermelden we).
      **Onduidelijk:** (a) of derden de clips onder CC BY-NC-SA mogen
      doorgeven: de voorwaarden zeggen daar niets over, en puur door AI
      gemaakte audio is in de EU waarschijnlijk niet auteursrechtelijk
      beschermd, dus de CC-licentie is daar mogelijk niet af te dwingen;
      (b) met welk Gemini-product en abonnement de **muziek** gemaakt is
      (app of API, gratis of betaald): dat bepaalt welke voorwaarden
      gelden. Een juridische check blijft optioneel (geen blokkade).
  - [x] Formulering aangepast (15 okt): `LICENSE-CONTENT.md`
        (§ *Door AI gemaakte stemmen en muziek*), `NOTICE.md` en
        LICENTIES.md §4.8 bieden de audio aan onder CC BY-NC-SA "voor zover
        er rechten op rusten", noemen Google Gemini via OpenRouter, en
        zeggen dat gebruikers ook de voorwaarden van Google en OpenRouter
        volgen, voor zover die gelden.
- [x] **Spelteksten in GPL-bestanden.** Duidelijke regel toegevoegd (15
      okt) in `LICENSE-CONTENT.md` (§ *Teksten in codebestanden*) en
      `NOTICE.md`: CC BY-NC-SA voor de dialogen en verhaalteksten in
      `game/js/*lines.js`, `subtitles.js`, `storyarc.js`, `story.js`,
      `storycontact.js`, `storyeikea.js`, `storyfun.js`,
      `missionstory.js`, `missions.js`, `cinematics.js`, `characters.js`,
      `smsvoice.js`, `sidejobvoice.js`, en voor elke ingesproken regel (met
      een opname onder `game/audio/`); GPL voor de code en de
      interfaceteksten. Twijfel = inhoud. Een gemengd bestand blijft
      juridisch niet volledig waterdicht; de teksten naar aparte
      databestanden verhuizen kan later nog (veel werk). Nieuwe
      tekstbestanden in die lijst opnemen.
- [x] **Bijdragen en een latere betaalde versie.** `CONTRIBUTING.md`
      (§ *Licentie van je bijdrage*) en het PR-sjabloon (15 okt):
      bijdragers houden hun auteursrecht, geven hun werk vrij onder GPL /
      CC BY-NC-SA én geven NatusPella een eeuwigdurende, onherroepelijke,
      niet-exclusieve licentie om het te gebruiken, onder een andere
      licentie uit te brengen en te verkopen (ook commercieel, bijv. een
      betaalde Steam-versie), met een DCO-achtige `Signed-off-by`-regel per
      commit. Geen juridisch advies: bij een echte betaalde versie de
      tekst eventueel laten nalezen.
- [ ] Handmatige merkcheck "GDE" en "Grootste Diefstal Ever" (EUIPO,
      BOIP), zie ROADMAP.

## 2. Oude namen (huidige boom)

- [x] Alles wat een speler ziet heette al GDE (0.24). Sinds 0.29 ook de
      interne namen: opslagsleutels `gde-*` (met eenmalige migratie,
      `game/js/storagekeys.js`), userData-map `GDE Groningen` (eenmalige
      kopie uit de oude map, `desktop/userdata.js`), appId en Windows
      AppUserModelId `nl.natuspella.gde-groningen`, npm-naam
      `gde-groningen`, IPC `gde:*`, `window.gdeDesktop`, webcaches `gde-*`,
      env-variabelen `GDE_*`. Getest met
      `scripts/storage_migration_test.mjs` en een Electron-check op een
      wegwerpprofiel.
- [x] Laatste ronde (15 okt): de oude naam en verwijzingen naar andere
      games zijn uit docs, code-commentaar en `.gitignore`; story- en
      storedocs zijn neutraal geformuleerd. Bewust gehouden:
  - de **disclaimer** ("niet gelieerd aan"), één keer: `game/js/credits.js`
    (spel) en `NOTICE.md`;
  - de **migratiecode** en haar test (`storagekeys.js`, `userdata.js`,
    `web/sw.js`, `desktop/main.js`, `desktop/build.mjs`,
    `scripts/storage_migration_test.mjs`): die moeten de oude sleutels en
    mapnaam kennen;
  - **CHANGELOG.md**: de oude versies blijven zoals ze zijn uitgebracht;
  - `desktop/release.sh`: de releasenotes vertellen spelers met de oude
    app dat hun saves blijven staan;
  - `game/ommeland.bin` begint nog met de oude magic bytes (het spel leest
    die niet; `scripts/add_ommeland.py` schrijft voortaan `GDEO`);
  - de naam van de lokale checkoutmap; de GitHub-repo heet al
    `GDE-Groningen`.
- [ ] Over één of twee releases: de oude sleutels opruimen met
      `removeLegacyKeys()` (TODO in `storagekeys.js`) en spelers laten
      weten dat de oude map weg mag (TODO in `userdata.js`).

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
- [ ] **Eigenaar:** de OpenRouter-sleutel roteren (hij is lokaal en in
      sessies gebruikt).

## 4. Persoonsgegevens

- [x] Het werk-e-mailadres staat niet meer in de huidige bestanden (ook
      niet meer in `docs/PUBLICEREN.md`, met de verouderde aantallen).
- [x] **Historie herschreven** (15 okt, met akkoord): alle commits en
      tags staan op NatusPella met het noreply-adres; naam, werkadres, de
      Esri-luchtfoto, de oude Sikkom-audio, het oude icoon, de
      verwijzingen naar een echte persoon en de oude naam in commitberichten
      zijn uit de hele historie. Force-push van `main` en de tags gedaan;
      een lokale back-up (mirror) bestaat buiten de repo. Oude kloons
      niet meer gebruiken.
- [x] **Eigen naam** (15 okt): overal "NatusPella" of "de eigenaar":
      `desktop/package.json` (`author`, `copyright`), het About-paneel
      (`desktop/main.js`), ROADMAP, `docs/ONBOARDING.md`,
      `docs/PUBLICEREN.md` (mailmap-voorbeeld) en
      `docs/steam/winkelpagina.md`. Geen persoonsnaam, werkadres of
      thuispad (`/Users/…`) meer in de getrackte bestanden (de
      OSM-kaartdata buiten beschouwing). Ook de historie is schoon (zie hierboven).
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
- [x] **De historie** is meegenomen in de herschrijving (15 okt): de
      koppeling met een echt persoon, verwijderde voice-clips met echte
      merknamen, het oude icoon en de oude naam in commitberichten zijn
      eruit.
- [ ] `docs/groningen-memes*.md` nog één keer nalezen op geciteerd
      materiaal van derden (lijstjes, uitspraken).

## 6. Bestanden en grootte

- [x] `data/satellite_reference.jpg` (Esri World Imagery, mag niet
      herverspreid worden) is uit de huidige boom en staat in
      `.gitignore`. `scripts/extract_palette.py` (alleen nodig om de
      paletkleuren opnieuw te bepalen) stopt nu met een duidelijke melding
      als het bestand lokaal ontbreekt. Niet nodig voor het spel of de
      builds.
- [x] Dezelfde foto is **uit de historie** gehaald (herschrijving van 15
      okt).
- [x] Geen bestanden boven de 50 MB-waarschuwing van GitHub. Grootste:
      `data/groningen_raw.json` 32,5 MB, `game/citymap.json` 11,2 MB (11
      versies), de muziek 3-4 MB per nummer.
- [ ] Later eventueel: `data/*_raw.json` niet meer committen (opnieuw te
      maken met de scripts; de ODbL vraagt dat de manier om de data te
      maken beschikbaar is).
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
- [ ] **Eigenaar, zodra de repo publiek is:** **Private vulnerability
      reporting** aanzetten (Settings › Code security; kan alleen op
      publieke repo's). `SECURITY.md` en het issue-sjabloon verwijzen
      ernaar.
- [ ] Secret scanning, push protection en Dependabot aanzetten
      (PUBLICEREN.md §6).
- [x] **Dependabot-meldingen** (15 okt) in `desktop/package-lock.json`:
      `http-cache-semantics` (hoog, GHSA-ch52-4w7c-c8xp) en `sprintf-js`
      (middel, GHSA-hp3w-g68c-fv3c). Beide alleen ontwikkeltools:
      `electron-builder` › `app-builder-lib` › `@electron/get@3` ›
      `got` › `cacheable-request` › `http-cache-semantics`, en
      `@electron/get@3` › `global-agent@3` › `roarr` › `sprintf-js`
      (alleen voor een proxy bij het downloaden van Electron). Ze zitten
      niet in de app (`build.files` neemt alleen `main.js`,
      `preload.js`, `trailervideo.js`, `userdata.js` en
      `package.json` mee). Opgelost met `overrides` in
      `desktop/package.json`: `http-cache-semantics` ^4.3.0 (gepatcht) en
      `global-agent` ^4.1.3 (zonder `roarr`/`sprintf-js`; zelfde
      `bootstrap()`). `npm audit`: 0 kwetsbaarheden; `npm run stage`
      werkt. Haal de overrides weg zodra `electron-builder` zelf nieuwere
      versies gebruikt.
- [x] De releases tot 0.23 heten nu "GDE Groningen x.y.z" met hernoemde
      downloadbestanden (15 okt). De app in die oude builds toont nog de
      oude naam; dat is acceptabel als historische versie.

## 8. Volgorde tot publiek

1. [x] Historie herschreven (15 okt).
2. [x] Branches gemerged en daarna de filter-repo-run gedaan.
3. [ ] gitleaks draaien; OpenRouter-sleutel roteren (eigenaar).
4. [?] Zichtbaarheid naar publiek: alleen met uitdrukkelijk akkoord.
5. [ ] Direct daarna private vulnerability reporting aanzetten (eigenaar).
