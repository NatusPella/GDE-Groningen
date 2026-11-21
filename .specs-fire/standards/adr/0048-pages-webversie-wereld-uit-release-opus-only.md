# 0048 - Pages-webversie: wereld uit de release, alleen Opus, onder /play/

- **Status:** besloten (21-11-2026; issue #1090)
- **Datum:** 21-11-2026
- **Spec:** `.specs-fire/standards/publicatie.md`, `docs/PAGES-WORKFLOW-21-11.md`
- **Verwant:** `docs/PAGES-BUILD-21-11.md` (lokale proefbouw), ADR 0006

## Context

De game-webversie bouwt lokaal en draait op een subpad, maar er was geen workflow die hem op GitHub Pages zet. Een runner heeft de wereld niet: `game/world` staat niet in git en komt uit `data/cache/province` (een extract, niet in git). De site is 599 MB, waarvan 483 MB audio; Pages adviseert maximaal 1 GB. Er is één Pages-site per repo, en daar staat al de marketingpagina.

## Besluit

1. **De wereld komt uit het release-asset `gde-world.tgz`** (64 MB, `GDE_PREBUILT_WORLD`), net als de dmg-, Linux- en APK-workflows. Geen provinciebouw op de runner.
2. **Alleen Opus publiceren** (`GDE_WEB_OPUS_ONLY=1`, standaard aan in de workflow): de mp3/wav-terugval blijft weg, ca. 300 MB minder (site ca. 300 MB). Safari vóór 18.4 speelt in web dan zonder geluid; de rest van het spel werkt.
3. **Eén site, twee delen:** marketing in de root, het spel onder `/play/`, samengesteld en geüpload door één workflow (`pages-deploy.yml`). De service worker heeft scope `/play/` en botst dus niet met de root.
4. **Handmatig en owner-guard** (constitutie 8): `workflow_dispatch`, `github.actor == github.repository_owner` op beide jobs, environment `github-pages`.

## Afgewezen

- **De wereld op de runner bouwen:** de provincie-extract (OSM, honderden MB) en de tegelbouw kosten uren en meerdere GB schijf en geheugen, en zouden de 2000 gratis minuten per maand opeten (de macOS-, Linux- en APK-builds gebruiken er al 65 tot 115 per release). Het release-asset bestaat al en is door de eigenaar gebouwd en getest.
- **De wereld in git of met Git LFS:** staat haaks op "de wereld is data die bij het bouwen wordt gemaakt"; Pages serveert geen LFS.
- **Een lichte webwereld (alleen stad plus corridors):** een eigen variant om te onderhouden, en de webversie hoort dezelfde wereld te streamen als Electron (AGENTS.md: zelfde streaming-pad). Pas als 64 MB wereld een probleem wordt.
- **Beide audioformaten publiceren:** 599 MB tegen ca. 300 MB, voor een browser die een jaar geleden nog geen Opus-in-WebM kon (Safari < 18.4). Het kost bandbreedte van de Pages-limiet (100 GB/maand, zacht) en deploytijd. Wil de eigenaar de terugval terug, dan is het `-f opus_only=false`.
- **Een tweede workflow voor de marketingpagina naast de game-workflow:** twee deploys naar dezelfde site overschrijven elkaar. Vandaar dat `pages-deploy.yml` beide bouwt (en `pages.yml` dezelfde concurrency-groep heeft).
- **Een eigen repo of host voor het spel (itch.io, Cloudflare):** itch.io past niet (2000 bestanden, limiet 1000); een externe host is een nieuwe dienst (constitutie 4).
- **coi-serviceworker voor COOP/COEP:** niet nodig; het spel gebruikt geen `SharedArrayBuffer` en geen `crossOriginIsolated`.

## Gevolgen

- `web/build.mjs` kent `--opus-only` / `GDE_WEB_OPUS_ONLY=1`; `audio/index.json` krijgt dan `opusOnly: true` en `web/web.js` laat een clip stil als de browser geen Opus kent.
- `scripts/pages_site_check.mjs` keurt de webbuild vóór de upload (grootte, absolute paden, plaatshouders, wereld en audio-index); `scripts/pages_deploy_test.mjs` bewaakt de workflow.
- Een nieuwe release met een andere wereld vraagt dat de eigenaar de workflow opnieuw start; de wereld en de code horen bij dezelfde tag (`ref` en `tag`).
