# Publiceren: wat besloten en gedaan is

De repo is nog **privé**; er is niets gepubliceerd. Wat nog te doen staat,
staat als issue: [#83](https://github.com/NatusPella/GDE-Groningen/issues/83)
(checklist), met #37 (publiek maken), #62 (merken en secrets-scan), #72
(social preview, credits), #57 (webversie) en #64 (Steam). Juridische
achtergrond: [LICENTIES.md](LICENTIES.md). Zichtbaarheid wijzigen alleen
met akkoord van de eigenaar.

## Gedaan (stand 15-17 okt 2026, 0.34)

- **Licenties:** code GPL-3.0-or-later (`LICENSE`), eigen inhoud CC BY-NC-SA 4.0
  (`LICENSE-CONTENT.md`, ook voor spelteksten in `game/js/*lines.js` e.d.),
  naam en logo voorbehouden. Werk van derden in `NOTICE.md` en `licenses/`.
  AI-stemmen en -muziek worden aangeboden "voor zover er rechten op rusten";
  juridische nalezing is gedaan (#38).
- **Bijdragen:** `CONTRIBUTING.md` en het PR-sjabloon: bijdragers houden hun
  auteursrecht, geven GPL / CC BY-NC-SA en een brede licentie aan NatusPella
  (zodat een betaalde Steam-versie kan), met `Signed-off-by`.
- **Namen:** alles heet GDE; interne namen zijn in 0.29 omgezet (`gde-*`
  opslagsleutels met migratie in `game/js/storagekeys.js`, userData-map,
  appId, IPC, env). Bewust gehouden: de disclaimer, de migratiecode en
  haar test, oude CHANGELOG-regels.
- **Secrets:** geen sleutels in boom of historie (gecontroleerd op 3 en 15
  okt over alle commits en branches); `.env` nooit gecommit en genegeerd;
  de OpenRouter-sleutel is vervangen (#36); `.claude/` staat in `.gitignore`.
- **Historie herschreven** (15 okt, met akkoord) met `git filter-repo`:
  alle commits en tags staan op NatusPella met het noreply-adres; werknaam
  en werkadres, de Esri-luchtfoto (`data/satellite_reference.jpg`, mag niet
  herverspreid worden), oude Sikkom-audio, oud icoon en verwijzingen naar
  een echte persoon zijn eruit. Force-push van `main` en tags gedaan; een
  lokale back-up (mirror) staat buiten de repo. Oude kloons niet meer
  gebruiken. Releases zijn opnieuw gekoppeld; `git log --all --format='%ae'`
  geeft alleen het noreply-adres.
- **Persoonsgegevens:** geen persoonsnaam, werkadres of thuispad in
  getrackte bestanden; speeltester alleen bij bijnaam. OSM-exports in `data/`
  bevatten publieke zakelijke contactgegevens onder de ODbL: acceptabel.
- **Afhankelijkheden:** Dependabot-meldingen in `desktop/package-lock.json`
  (`http-cache-semantics`, `sprintf-js`, alleen ontwikkeltools) zijn opgelost
  met `overrides` in `desktop/package.json`; haal die weg zodra
  `electron-builder` zelf nieuwere versies gebruikt.
- **Grootte:** niets boven de 50 MB-waarschuwing van GitHub (grootste:
  `data/groningen_raw.json` 32,5 MB, `game/citymap.json` 11 MB, muziek 3-4 MB
  per nummer); opruimen van oude data in #76.
- **Releases:** pre-releases "GDE Groningen x.y.z" met een
  "niet ondertekend"-waarschuwing; Linux-build optioneel met `--linux`.
  De webzip wordt lokaal gemaakt en nergens heen geüpload (keuze: #57).

## Voorbereiding publiek maken (18 okt 2026, #62 en #83)

- **Secrets-scan** (lokaal, zonder gitleaks, die niet is geïnstalleerd): `git grep`
  op de boom en `git log --all -G<patroon>` over alle 1424 commits en
  branches, op patronen voor OpenRouter/OpenAI-, Google (`AIza`), GitHub-,
  AWS- en Slack-sleutels, privésleutelblokken en `sleutel/secret/token/
  wachtwoord = "waarde"`. **Geen treffers**; geen `.env`, `.pem`, `.p12`,
  `.keystore` of `id_rsa` ooit in de historie. Alleen de naam
  `OPENROUTER_API_KEY` komt voor (scripts lezen hem uit de omgeving, en
  deze docs). Dit vervangt gitleaks niet: draai `gitleaks detect` nog
  een keer vlak voor Public.
- **Auteursnamen:** alle commits hebben het noreply-adres; als weergavenaam
  staan "NatusPella" en "Alexander Buist" (de eigen echte naam van de
  eigenaar, nog in een deel van de historie). Beslissing voor de eigenaar of
  dat blijft (Constitution 4 noemt alleen credits) of met `--mailmap` wordt
  herschreven.
- **Dependabot:** `.github/dependabot.yml` (npm, `/desktop`, wekelijks)
  toegevoegd; alerts en security updates zet de eigenaar aan in de settings.
- **Merkenregister:** zie [MERKENCHECK.md](MERKENCHECK.md); de registers zijn
  niet bevraagbaar zonder browser en moeten met de hand (15 minuten).

## Tweede ronde voorbereiding (18 okt 2026, #37, #62, #83)

- **Merkenregister:** [MERKENREGISTER.md](MERKENREGISTER.md) (naam, verzonnen
  namen, bewust afwezige merken, audit). De audit `scripts/text_audit.mjs`
  geeft nu 0 bevindingen (13 detectielijsten en platformnamen op de allowlist,
  met reden).
- **Geluid en muziek:** herkomst vastgelegd in
  [LICENTIES.md](LICENTIES.md) (§2): effecten zelf gesynthetiseerd zonder
  samples; muziek en stemmen komen van Google Gemini. Het precieze muziekproduct
  is nog niet vastgelegd (eigenaar).
- **Secrets en historie:** opnieuw gescand over boom en alle commits (bestanden
  en regelnummers, geen waarden): geen treffers, geen `.env`, sleutel- of
  certificaatbestanden ooit gecommit.
- **Persoonsgegevens:** een echte voornaam in een kopregel van
  `FEEDBACK-SPEELTEST-1.md` is vervangen. De OSM-extracten in `data/` bevatten
  zakelijke e-mailadressen en telefoonnummers uit OSM-tags (ook enkele
  gmail.com/home.nl-adressen van kleine bedrijven); de eigenaar beslist of die
  tags eruit gaan voordat de repo publiek wordt (ze zitten ook in de historie).
- **Auteursnaam in de historie:** 558 commits hebben nog "Alexander Buist" als
  naam (zelfde noreply-adres); zie hierboven.
- **Licenties van derden:** three.js, Bebas Neue en Big Shoulders Display staan
  met tekst in `licenses/`; AHN/PDOK (CC0) is nu ook in NOTICE en de aftiteling
  vermeld; OSM, 3DBAG ongewijzigd.

## Procedures voor later

- **Historie opnieuw herschrijven** (alleen na akkoord, bijv. voor #76): in een
  verse `git clone --no-local`, `git filter-repo` met `--mailmap` of
  `--invert-paths`, controleren met `git log --all`, daarna `origin`
  opnieuw instellen en force-pushen; oude kloons en worktrees weggooien;
  tags en Releases opnieuw koppelen. Eén keer doen, vóór iemand anders kloont.
- **Pages** (als gekozen): bron "GitHub Actions" met een workflow die
  `game/` publiceert; three.js en het lettertype meevendoren (zoals
  `desktop/build.mjs`) zodat de pagina geen CDN's gebruikt; Pages-limiet
  1 GB, ~150 MB audio past; Pages serveert geen Git LFS.
- **Steam:** `steam/` heeft SteamPipe-sjablonen en een kopieerscript
  (`steam/README.md`); gebruik voor `steamcmd` een apart account met alleen
  buildrechten.

## Derde ronde (18 okt 2026, #37, #60, #62, #72, #83)

Alleen bestanden en checklists; niets openbaar gemaakt, geüpload of gepost.
- Automatische publicatiecheck: `scripts/publish_check.mjs` (+ test).
- Checklist met beslissingen voor de eigenaar: [PUBLICATIECHECKLIST.md](PUBLICATIECHECKLIST.md).
- Privacy en credits: [PRIVACY-EN-CREDITS.md](PRIVACY-EN-CREDITS.md); social preview en
  websitetekst: [SOCIAL-EN-WEBSITE.md](SOCIAL-EN-WEBSITE.md); IARC-aanvulling voor samen spelen in
  [IARC-ANTWOORDEN.md](IARC-ANTWOORDEN.md).
