# Pages-workflow voor de webversie, 21-11 (#1090)

Vervolg op [PAGES-BUILD-21-11.md](PAGES-BUILD-21-11.md) (de lokale proefbouw). Dit document beschrijft de workflow
`.github/workflows/pages-deploy.yml`, de gemaakte keuzes (ADR [0048](../.specs-fire/standards/adr/0048-pages-webversie-wereld-uit-release-opus-only.md))
en wat er in de webversie niet werkt. **Er is niets gedeployd**: de coördinator start de workflow zelf na de merge
(constitutie 8).

## Wat de workflow doet

`Pages (spel en marketing)`, alleen `workflow_dispatch`, alleen voor de repo-eigenaar (`github.actor == github.repository_owner`
op beide jobs), environment `github-pages`, concurrency-groep `pages` (zonder annuleren; `pages.yml` deelt hem).

| Stap | Wat |
|---|---|
| checkout | `ref` (standaard `main`; gebruik bij voorkeur de tag van de release waar de wereld bij hoort) |
| wereld | `gh release download <tag> --pattern gde-world.tgz` (tag leeg = nieuwste release; 64 MB) en uitpakken naar `$RUNNER_TEMP/gde-world`, `GDE_PREBUILT_WORLD` |
| ffmpeg en cache | ffmpeg met libopus (zo nodig via apt); `web/.cache/opus` en `desktop/vendor-cache` in `actions/cache` (sleutel op `game/audio/**`) |
| bouwen | `node web/build.mjs` met `GDE_WEB_OPUS_ONLY=1` (input `opus_only`, standaard aan) |
| controleren | `scripts/pages_site_check.mjs web-dist --opus-only` en `scripts/web_shell_test.mjs` |
| marketing | `node website/build.mjs` (`website/_site`) |
| samenstellen | marketing in de root, het spel onder `play/`; upload met `actions/upload-pages-artifact@v3` |
| deploy | `actions/deploy-pages@v4` (wacht op het environment `github-pages`) |

Er is geen `npm ci`: de webbuild gebruikt geen `node_modules` (three.js en de lettertypen haalt `desktop/build.mjs` zelf op,
vastgezet in de vendor-lock). Geheimen zijn niet nodig; alleen `github.token`.

## Hoe de coördinator deployt

Eenmalig (eigenaar): Pages staat aan met bron "GitHub Actions" (`build_type: workflow`; staat al zo) en bij het environment
`github-pages` een verplichte beoordelaar.

```
gh workflow run pages-deploy.yml -f ref=main -f tag=v0.64.0   # nieuwe code, wereld uit de release (ref moet de Pages-bouw bevatten)
gh workflow run pages-deploy.yml -f opus_only=false          # ook de mp3/wav-terugval (ca. 600 MB)
gh workflow run pages-deploy.yml -f speel=false              # alleen de marketingpagina
gh run watch                                                   # en daarna de beoordelaar akkoord laten geven
```

Daarna: `https://natuspella.github.io/GDE-Groningen/play/` openen (liefst met een schone cache, op een echte GPU) en
`node scripts/web_pages_check.mjs --url=https://natuspella.github.io/GDE-Groningen/play/` lokaal tegen de live site.
Gebruik `pages.yml` niet meer zodra het spel live staat: die zet alleen de marketingpagina en haalt `/play/` weg.

## De keuzes, met afgewezen alternatieven

Volledig in ADR 0048. Kort:

- **Wereld uit het release-asset**, niet bouwen op de runner (de provincie-extract is niet in git; uren, GB's en gratis minuten)
  en geen lokale cache (die bestaat niet op een runner). Afgewezen: een ingekorte webwereld (eigen variant, ander pad dan Electron),
  wereld in git of LFS.
- **Alleen Opus**: 599 MB wordt ca. 300 MB. Prijs: Safari vóór 18.4 krijgt geen geluid (de rest werkt). Terug kan met `opus_only=false`.
- **Eén site**: marketing in de root, spel onder `/play/`; twee aparte deploys zouden elkaar overschrijven.
- Grenzen: site < 1 GB (controle: 950 MB), bestand < 100 MB (controle: 95 MB); bandbreedte 100 GB/maand zacht.

## Subpad, service worker, headers

- Alle paden in de build zijn relatief (`GDE_STAGE_RELATIVE=1`); `index.html` heeft geen absolute `src`/`href` (bewaakt door
  `pages_site_check`). Het spel draait dus onder `/GDE-Groningen/play/` (lokaal getest met `web/serve.mjs --prefix=/GDE-Groningen/play/`).
- De service worker (`web/sw.js`) heeft scope `play/` en een cache `gde-<versie>-<hash>`; elke nieuwe build vervangt de oude cache.
  Hij blijft buiten de marketingpagina in de root.
- **COOP/COEP:** Pages kan die headers niet zetten. Het spel heeft ze niet nodig: geen `SharedArrayBuffer`, geen `crossOriginIsolated`
  (gecontroleerd met grep door `game/js`, `desktop`, `web`). Dus geen coi-serviceworker.
- **404.html/SPA-fallback:** niet nodig; er zijn geen routes, alleen bestanden.

## Wat er in de webversie verandert of niet werkt

- **Livebussen en live treinen** (OVapi) sturen geen CORS-koppen; in de webbuild slaan ze de opvraag over (`kiesFetch` geeft
  `null` zodra `window.__gteWeb` bestaat): geen rode console-regel, bussen en bord rijden/tonen het eigen rooster. Alleen in Electron zijn ze live.
- **Melding "Webversie (preview)"**: een klein, wegklikbaar label rechtsonder, alleen op `*.github.io` (niet in de APK of lokaal);
  alleen tekst, geen verzoek naar buiten.
- Safari vóór 18.4 en andere browsers zonder Opus-in-WebM: geen geluid (bij `opus_only`).
- Geen *Afsluiten*, geen videoexport, geen directe-IP-route bij Samen spelen (alleen WebRTC met kamercode).
- Autoplay: de AudioContext start pas na de eerste toets of klik (browserregel).
- Nog niet gecontroleerd: de eerste start in een echt venster (de openingsfilm liet zich in de headless-proef niet overslaan, zie #1089),
  Firefox/Safari, mobiel, echte GPU, een echte Samen-spelen-sessie.

## Privacy en credits voor de webversie

De pagina serveert alleen statische, openbaar gehoste bestanden van GitHub Pages; er is geen telemetrie, geen analytics, geen cookies
van het spel (alleen `localStorage` en de Cache Storage van de service worker, op het apparaat van de speler). Samen spelen gebruikt, na
de toestemmingsvraag, alleen de goedgekeurde STUN-servers en brokers (constitutie 4). GitHub ziet als host van de bestanden het IP-adres
van de bezoeker, zoals bij elke website; dat staat in [PRIVACY-EN-CREDITS.md](PRIVACY-EN-CREDITS.md). De credits en licenties zitten in het
spel zelf (Over) en in `NOTICE.md`; de webbuild neemt dezelfde audio, fonts en three.js mee.

## Tests

- `node scripts/pages_deploy_test.mjs`: de workflow (alleen handmatig, owner-guard op beide jobs, rechten, environment, concurrency,
  wereld uit de release, geen geheimen, controlestappen) en `pages_site_check` op een nepmap. Geen actionlint op deze machine; de tekstcontrole
  vervangt hem. Een YAML-syntaxfout toont GitHub bij de eerste run.
- `node scripts/pages_site_check.mjs <map> [--opus-only]`: grootte, absolute paden, plaatshouders, wereld, audio-index.
- Lokaal gemeten (21-11, Opus-only): zie de stand-comment op #1090 en de tabel hieronder.

## Stand na de proefrun (21-11, run 44919864940)

- Run met `ref=v0.64.0` faalde in `build` na de audiobouw (ca. 1 uur) op `Cannot find module scripts/pages_site_check.mjs`:
  de tag v0.64.0 is ouder dan de Pages-scripts (`pages_site_check.mjs` bestaat pas op main). Wereld-asset, node (lts), ffmpeg/Opus,
  `web/build.mjs` (1937 bestanden, 594,7 MB, cache `gde-0.64.0-...`) en de repo-guard werkten; de deploy-job is daarom overgeslagen.
- Fix: een stap `Ref bevat de Pages-bouw` vlak na de checkout stopt meteen met een duidelijke melding als een van de vier scripts ontbreekt;
  de voorbeeldopdracht gebruikt nu `ref=main -f tag=v0.64.0`.
- Gemeld in de bouwuitvoer: `itch.io ... DOES NOT FIT` is alleen informatie van de webbuild (itch-limiet), niet van Pages.
- Lokaal gecontroleerd: `node scripts/pages_deploy_test.mjs` (ok). De volledige bouw is niet lokaal herhaald (uren audio); de controlestap zelf draait pas op de runner.
- Nog te doen: de coordinator pusht de branch, merget en start `gh workflow run pages-deploy.yml -f ref=main -f tag=v0.64.0`.
  Daarna kan `pages_site_check` nog een eigen bevinding geven (bijv. site > 950 MB: 594,7 MB past) en moet de beoordelaar van `github-pages` akkoord geven.
