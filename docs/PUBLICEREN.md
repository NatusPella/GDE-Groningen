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
