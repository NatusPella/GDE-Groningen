# Eigenaarsactielijst

> **Stand:** 13 november 2026, main `7878b4684`, laatste pre-release **v0.60.7**. De repo is
> **privé** en er is niets gepubliceerd, geüpload, aangemaakt of openbaar gezet (AGENTS.md,
> constitution 8). Deze lijst bundelt wat alleen de eigenaar kan doen; een agent doet of beslist
> niets in de kolommen hieronder. De bronnen staan in de repo klaar.

## Leeswijzer

Per issue staat:

- **Wat de eigenaar doet** — de handeling of het besluit dat niemand anders mag nemen.
- **Voorbereiding in de repo** — wat al klaarstaat, met paden en commando's.
- **Wat een agent niet mag of kan** — de grens die de agent niet overschrijdt.

De volgorde is die van [1.0-TRACK.md](1.0-TRACK.md): eerst de basis (repo, merken, checklist),
dan de kanalen (web, YouTube, Steam) en ten slotte 1.0 en de inhoudelijke testrondes. De
Actions-minuten staan apart onderaan.

## #37 — Repo publiek maken en daarna beveiligen

**Wat de eigenaar doet:** beslissen of de repo publiek wordt en de zichtbaarheid zelf omzetten.
Daarna meteen: private vulnerability reporting aan, secret scanning en push protection aan,
Dependabot-alerts en security-updates aan, branch protection op `main`, en in de
release-workflows het environment `release` met een verplichte beoordelaar (de eigenaar).
Playtesters een pull-rol geven en immutable releases overwegen.

**Voorbereiding in de repo:** [PUBLICEREN.md](PUBLICEREN.md) (stappen en geschiedenis),
[PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md) §3-4, de owner-guard in
[`.github/workflows/`](../.github/workflows/) (test: `scripts/publish_check.mjs`), en de
release-draaiboeken in [RELEASEN.md](RELEASEN.md). De automatische controles zijn
`node scripts/publish_check.mjs --history` en `node scripts/secrets_scan.mjs`.

**Wat een agent niet mag of kan:** de repo op publiek zetten, GitHub-instellingen wijzigen,
workflows aanzetten, rechten uitdelen of een release publiceren. Ook de keuze zelf en het
tijdstip zijn van de eigenaar (constitution 8).

## #57 — Webversie hosten (GitHub Pages of itch.io)

**Wat de eigenaar doet:** een plek kiezen, die aanzetten en de webzip uploaden. GitHub Pages
vraagt een publieke repo (#37); itch.io past volgens de meting niet (1.488 bestanden en 503 MB
tegen limieten van 1.000 bestanden en 500 MB), tenzij het spel wordt opgesplitst of de limiet
wordt opgehoogd. Daarna de URL in het website-veld van de repo zetten (zie #72).

**Voorbereiding in de repo:** [1.0-TRACK.md](1.0-TRACK.md) §webversie met de bouw- en
serveermeting, [RELEASEN.md](RELEASEN.md) §Webversie publiceren, en de webzip-opdracht:
`cd desktop && GDE_PREBUILT_WORLD=<repo>/game/world npm run web:zip` (of
`node ../web/build.mjs --zip`). `web-dist/` staat in `.gitignore`; de lokale testserver is
`node web/serve.mjs 8790`. Er is niets geüpload.

**Wat een agent niet mag of kan:** een host aanmaken, Pages aanzetten, uploaden of publiceren.
Een agent mag de webversie lokaal bouwen en testen; de repo is privé en niets gaat naar buiten.

## #59 — Playtest met onbekende spelers en echte controllers

**Wat de eigenaar doet:** testers werven (zes tot acht per ronde, minstens vier die de game niet
kennen), sessies van 30-45 minuten begeleiden en de controllerronde doen met Xbox, PlayStation
en Steam Deck. Uitkomsten naar issues of #116.

**Voorbereiding in de repo:** [ONBOARDING.md](ONBOARDING.md) (draaiboek, scoreformulier en
checklist), [SPEELTEST.md](SPEELTEST.md) (vragenlijst), [PLAYTESTPLAN.md](PLAYTESTPLAN.md)
(planning), en `node scripts/playtest_feedback.mjs <bestand>` voor het omzetten van notities in
issue-concepten (verstuurt niets).

**Wat een agent niet mag of kan:** mensen benaderen, een test afnemen, een echt apparaat
gebruiken of namen van testers in de repo zetten. De eigenaar kiest en contacteert de testers;
in de repo staan alleen T1, T2, enzovoort.

## #60 — IARC-leeftijdsvragenlijst en Steam Content Survey

**Wat de eigenaar doet:** de IARC-vragenlijst en de Steam Content Survey zelf invullen, met de
AI-melding (muziek, stemmen, één model, code-hulp) en het doel PEGI 18 / USK 18. De antwoorden
gaan over bloed en ledematen, geweld, kraskaarten met spelgeld, alcohol en online spelen.

**Voorbereiding in de repo:** [IARC-ANTWOORDEN.md](IARC-ANTWOORDEN.md) (concept per vraag),
[LEEFTIJD.md](LEEFTIJD.md) (onderbouwing en bronnen), [STEAM-CHECKLIST.md](STEAM-CHECKLIST.md)
§1 (leeftijd en inhoud) en [docs/steam/winkelpagina.md](steam/winkelpagina.md) (sectie "Inhoud
en leeftijd").

**Wat een agent niet mag of kan:** een leeftijdsclassificatie aanvragen, een formulier indienen
of een rating toekennen. Een agent levert alleen de concepttekst en de feiten.

## #62 — Merkenregister, laatste secrets-scan en muziekproduct

**Wat de eigenaar doet:** met de hand (ca. 15 minuten) EUIPO (eSearch plus), TMview en BOIP
doorzoeken op "GDE", "Grootste Diefstal Ever" en "Zomer vol misdaad" en de uitkomst in
[MERKENCHECK.md](MERKENCHECK.md) zetten. Daarnaast het muziekproduct vastleggen (welk
Gemini-product en abonnement) in [LICENTIES.md](LICENTIES.md) §4.3, en vlak vóór Public
`gitleaks detect` plus de laatste secrets-scan draaien. De vier historie-e-mail-FAILs vragen een
besluit: laten staan of met een mailmap herschrijven (#62).

**Voorbereiding in de repo:** [MERKENCHECK.md](MERKENCHECK.md) (lege registers),
[MERKENREGISTER.md](MERKENREGISTER.md) (namen in het spel), [LICENTIES.md](LICENTIES.md) §4.3
(invultabel), [INVULBLAD-EIGENAAR.md](INVULBLAD-EIGENAAR.md) §3-4, `scripts/secrets_scan.mjs`
en `scripts/publish_check.mjs --history` (nu 4 FAIL: historie-e-mail).

**Wat een agent niet mag of kan:** registers of merken­databases doorzoeken met een account,
een juridisch oordeel geven, een echte naam of `.env` lezen/printen, of een keuze over de
historie maken. Scans draaien mag wel; de waarde en de beslissing blijven bij de eigenaar.

## #63 — YouTube-kanaal, branding en twee trailers

**Wat de eigenaar doet:** een merkaccount (Brand Account) aanmaken, banner/avatar en
kanaalbeschrijving uploaden, de gameplaytrailer met HUD en de verhaaltrailer met Tessa uploaden,
en besluiten over shot 11 (de lege vitrine). Niets daarvan is nu gedaan.

**Voorbereiding in de repo:** [docs/youtube/kanaal.md](youtube/kanaal.md) (naam, handle,
beschrijving, links, beelden, trailers en de checklist), [docs/steam/trailer.md](steam/trailer.md)
(Steam-cut), `docs/steam/beelden/` (capsules en screenshots) en `docs/youtube/` (banner,
avatar, veilige zones).

**Wat een agent niet mag of kan:** een kanaal of account aanmaken, video's uploaden of
openbaar zetten, of namens de eigenaar reageren. Een agent maakt alleen de bestanden en teksten.

## #64 — Steam-klaar: account, SteamPipe, winkelpagina, Deck en Mac

**Wat de eigenaar doet:** beslissen over de **$100 Steam Direct-bijdrage** en die betalen;
Steamworks-account en identiteit/bank/belasting regelen; app- en depot-id's aanmaken; de
winkelpagina invullen; de inhoudsvragenlijst en IARC doen; 217 prestaties aanmaken; een
proefupload naar Preview of een bètatak doen; op een echte Deck en Mac testen; daarna zelf op
live zetten. De platformbuilds voor de mac- en Linux-depots wachten bovendien op
Actions-minuten (zie onderaan).

**Voorbereiding in de repo:** [STEAM-CHECKLIST.md](STEAM-CHECKLIST.md) (status per punt),
[docs/steam/winkelpagina.md](steam/winkelpagina.md) (NL+EN klaar), [steam/](../steam/)
(vdf-sjablonen, `copy-builds.mjs`, `make-build-vdf.mjs`), [docs/steam/trailer.md](steam/trailer.md),
[docs/IARC-ANTWOORDEN.md](IARC-ANTWOORDEN.md), [docs/steam/beelden/](steam/beelden/), en de
workflows in [`.github/workflows/`](../.github/workflows/) (alleen `workflow_dispatch`,
owner-guard).

**Wat een agent niet mag of kan:** betalen, een Steamworks-account of app-id aanmaken,
`steamcmd`-upload doen, de winkelpagina publiceren of een Deck/Mac aanraken. Een agent
controleert alleen bestanden en scripts (`steam_test`, `release_builds_test`).

## #65 — 1.0: twee weken bugfixes, definitieve trailer, 1.0.0

**Wat de eigenaar doet:** het 1.0-eindspel starten: twee weken alleen bugfixes, de definitieve
trailer en de 1.0.0-release met downloads en webversie. Daarna de tag en de release zelf zetten.

**Voorbereiding in de repo:** [1.0-TRACK.md](1.0-TRACK.md) (actuele volgorde en per-issue
checklists), [RELEASEN.md](RELEASEN.md) §1.0.0-release (stappen en bijlagen),
[PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md) en de release-workflows.

**Wat een agent niet mag of kan:** een tag zetten, een release bouwen of publiceren, of
"definitief" verklaren. Een agent mag de checklist en de kandidaten voorbereiden; het
besluit en de release zijn van de eigenaar.

## #72 — Social preview, website-veld en credits/disclaimer

**Wat de eigenaar doet:** op GitHub de About-tekst, topics, het website-veld en de social
preview uploaden (1280×640, `docs/social-preview.png`), en beslissen over de credits: de
volledige disclaimer op één plek laten (Rockstar/Take-Two alleen als disclaimer) en de
releasetekst over de oude naam ("Grand Theft Eierbal") laten staan of weghalen.

**Voorbereiding in de repo:** [SOCIAL-EN-WEBSITE.md](SOCIAL-EN-WEBSITE.md) (About, topics,
beeld en veilige zones), [INVULBLAD-EIGENAAR.md](INVULBLAD-EIGENAAR.md) §1-2 (keuzes),
[docs/social-preview.png](social-preview.png), `game/js/credits.js`, `NOTICE.md` en
[PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md).

**Wat een agent niet mag of kan:** GitHub-profielvelden of de social preview uploaden, of een
publicatietekst plaatsen. Een agent maakt het plaatje en de voorstelteksten; de eigenaar kiest.

## #83 — Publicatiechecklist afronden

**Wat de eigenaar doet:** de openstaande punten uit de publicatiechecklist afronden en daarna
de publicatie in gang zetten: de keuzes uit §2 (historie, OSM-contactgegevens, merkenregisters,
Noorderzon, interne docs, CDN, website, IARC, invulblad, 1.0-route), de GitHub-instellingen uit
§3-4 en het uiteindelijke publicatiebesluit.

**Voorbereiding in de repo:** [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md) (alle punten met
status en bewijs), [PUBLICEREN.md](PUBLICEREN.md) (volgorde) en
[1.0-TRACK.md](1.0-TRACK.md) (per-issue commentteksten). Automatisch:
`node scripts/publish_check.mjs --history`, `node scripts/secrets_scan.mjs`,
`node scripts/merkenregister_check.mjs` en `node scripts/text_audit.mjs`.

**Wat een agent niet mag of kan:** de repo publiek maken, instellingen wijzigen, iets uploaden
of publiceren. Een agent draait de controles en houdt de checklist bij; de eigenaar beslist.

## #116 — Playtesthub: nieuwe versies proberen en feedback geven

**Wat de eigenaar doet:** de vaste playtesters op de hoogte houden en hun feedback laten
terugkomen: algemene indruk onder de releasecomment, bugs als eigen issue, foutrapport uit
Instellingen › Foutrapport. Nieuwe pre-releases verschijnen als comment op #116; de
release-workflow vermeldt de testers daar.

**Voorbereiding in de repo:** issue
[#116](https://github.com/NatusPella/GDE-Groningen/issues/116), [ONBOARDING.md](ONBOARDING.md),
[SPEELTEST.md](SPEELTEST.md) en de release-notities; `desktop/release.sh` plaatst de comment op
#116 (niet in de releasenotes).

**Wat een agent niet mag of kan:** testers benaderen, namen toevoegen of feedback namens hen
achterlaten. Een agent verwerkt alleen de feedback die al in een issue staat.

## #353 — Luistertest: gemurmel onder tekstregels en de sirene in M02.intro

**Wat de eigenaar doet:** een nieuw spel starten (M01-M03) met geluid en beoordelen of het
gemurmel onder regels zonder opname prettig klinkt en goed staat ten opzichte van de stemmen,
of de sirene in M02.intro (52 s) een achtervolging laat voelen, en of de stille stukken nog
"kapot" voelen. Daarna zeggen wat er anders moet.

**Voorbereiding in de repo:** de meting staat in issue
[#353](https://github.com/NatusPella/GDE-Groningen/issues/353); de knoppen zijn
`playTextMumble` in `game/js/audio.js` (gain 0,018) en `PROP_SOUND` in `game/js/cutaudio.js`,
met [GELUID.md](GELUID.md) als naslag. Een agent kan de niveaus meten, maar niet horen of het
prettig is.

**Wat een agent niet mag of kan:** een luisteroordeel geven of nieuwe opnames maken zonder
akkoord. De eigenaar luistert; aanpassen gebeurt daarna in de code.

## #357 — Gronings en Fries in de straatgesprekken laten nalopen

**Wat de eigenaar doet:** de Groningse en Friese woorden in de straatgesprekken (spaarzaam:
"Moi", "bakkie", "Grunn") en de toon per streek laten beoordelen door een kenner of zelf
goedkeuren, en per gesprek een verbetering doorgeven. De acceptatie is goedkeuring van de tekst
in `game/js/gebabbel.js`.

**Voorbereiding in de repo:** [DIALECT-CONTROLE.md](DIALECT-CONTROLE.md) (methode, bronnen en
twijfelgevallen), `node scripts/dialect_woorden_test.mjs` (controle), de gesprekken in
`game/js/gebabbel.js`/`straatpraat.js`, en eventueel `node scripts/nalezerlijst.mjs`.

**Wat een agent niet mag of kan:** een dialect- of fries oordeel geven, een kenner spelen of
tekst namens de eigenaar goedkeuren. Een agent levert de lijst en de controle; de eigenaar of
kenner keurt goed.

## #358 — Luistertest: nieuwe effecten en niveaus

**Wat de eigenaar doet:** het spel met geluid spelen, `?sfxtest` openen en de negen nieuwe
effecten (zwaaien, leeg klikje, huisdeuren, motor uit, alarm, camera) plus de eerdere effecten
beoordelen: klopt het, is het te zacht of te hard? Daarna `node scripts/qa/sfx_levels.mjs`
draaien en per effect "klopt / aanpassen" doorgeven.

**Voorbereiding in de repo:** [GELUID.md](GELUID.md) (naslag),
`scripts/qa/sfx_levels.mjs` (niveaumeting) en de effecten in `game/audio/sfx/`; het issue
[#358](https://github.com/NatusPella/GDE-Groningen/issues/358) noemt de lijst.

**Wat een agent niet mag of kan:** een luisteroordeel geven of effecten goedkeuren. Een agent
meet de niveaus en past aan na de lijst van de eigenaar.

## #735 — TTS-opnameronde: de laatste Groningse spreekteksten

**Wat de eigenaar doet:** de **20 verhaalregels** zonder Groningse spreektekst laten schrijven
of zelf goedkeuren. Het zijn allemaal regels van Geesje (18) en Rotor Roelf (2); hun stem staat
al vast, dus dit is een tekstknoop, geen stemknoop. Daarna de teksten samenvoegen, in de
wachtrij zetten en de opname starten (met de LiteLLM-sleutel in `.env`), gevolgd door
`build_story_data` en `voice_coverage`.

**Voorbereiding in de repo (stand 13 november 2026):** [GRONINGS-20-SPREEKTEKSTEN.md](verhaal/GRONINGS-20-SPREEKTEKSTEN.md)
is de open lijst met per regel wat een kenner moet beslissen;
[DIALECT-CONCEPT.md](verhaal/DIALECT-CONCEPT.md) heeft de eerdere concepten en
[STEMKEUZE-VOORSTEL.md](verhaal/STEMKEUZE-VOORSTEL.md) de stemmen. De laatste meting:
`node scripts/tts_lines_list.mjs` = **0 jobs, 20 regels wachten op een Groningse spreektekst**;
`node scripts/voice_coverage.mjs --quiet` = **2664/2664**; `node scripts/opnamelijst.mjs` =
**20 regels zonder stem, 0 in de opening/M01-M03**. Na het schrijven:
`node scripts/gronings_merge_draft.mjs --write`, opnieuw `tts_lines_list`, dan
`python scripts/tts_lines.py --budget 0.5`, `node scripts/build_story_data.mjs` en
`node scripts/voice_coverage.mjs --quiet`.

**Wat een agent niet mag of kan:** Groningse tekst verzinnen of goedkeuren, `.env` lezen, de
LiteLLM-sleutel gebruiken of opnemen zonder expliciete opdracht. Een agent mag tot de
wachtrij en de droogloop (`--dry-run`) komen; schrijven en opnemen zijn van de eigenaar of een
kenner.

## Actions-minuten en platformbijlagen

De repo is privé op het Free-plan: **2000 gratis Actions-minuten per maand** (Linux 1×,
Windows 2×, macOS 10×). Die zijn deze maand op. Daardoor hebben **v0.60.1 tot en met v0.60.7**
alleen de lokaal gebouwde Windows-exe, `gde-world.tgz` en `SHA256SUMS.txt`; de platformbijlagen
(macOS-dmg, Linux-AppImage/tar, Android-APK) staan nog op **v0.60.0**.

**Wat de eigenaar doet:** wachten op de maandelijkse reset, of extra minuten bijkopen. Daarna
`node scripts/release_builds.mjs` voor de nieuwste tag (bijvoorbeeld
`node scripts/release_builds.mjs v0.60.7`) om de platformbijlagen alsnog te maken, of een
release met `--only`-keuze. Windows bouwt lokaal altijd door met `desktop/release.sh`; een
Linux-build kan desnoods lokaal met `npm run release -- current --linux`.

**Voorbereiding in de repo:** [RELEASEN.md](RELEASEN.md) §Kosten (met de meting per workflow),
§Stappen (de waarschuwing over de minuten) en §Wat er in Actions gebouwd wordt;
`scripts/release_builds.mjs` vraagt de workflows aan en wacht op de uitslag.

**Wat een agent niet mag of kan:** de Actions-minuten of billing aanpassen, een workflow
starten die uploadt, of de platformbijlagen publiceren. Een agent kan de release lokaal
voorbereiden en de workflows controleren; het starten en betalen is van de eigenaar.

## Wat een agent sowieso niet doet

- De repo, GitHub Pages of een andere host openbaar maken; iets uploaden of posten.
- Een account, app-id, kanaal, winkelpagina of release aanmaken.
- `.env` of een sleutel lezen, printen of gebruiken; een echte naam in credits zetten
  (behalve NatusPella).
- Een eigenaarsbesluit nemen over geld, rechten, leeftijd, merken of publicatie
  (AGENTS.md, constitution 4, 5 en 8).
