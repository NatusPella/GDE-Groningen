# 0028 - Dev-tooling zonder buildstap

- **Status:** besloten
- **Datum:** 2026-11-07
- **Spec:** `tech-stack.md`, `system-architecture.md`
- **Gerelateerd:** #641, ADR 0006 (geen bundler)

## Context

ADR 0006 zegt "geen bundler", maar beschreef de werkelijkheid onnauwkeurig:
Three.js komt in de meeste bestanden via de CDN-URL en de import map dient
vooral `three/addons/`; `desktop/build.mjs` staget en vendort ook; en er zijn
wel degelijk vijf eigen statische poorten (`import_check`, `undef_check`,
`spec_check`, `dead_code`, `player_singleton_audit`). Zonder apart besluit wordt
"geen bundler" ten onrechte gelezen als "geen enkele tooling".

## Besluit

- **Geen bundler en geen buildstap in dev.** `game/index.html` laadt de modules
  rechtstreeks; ontwikkelen gebeurt zonder server of build.
- **Dev-only tooling mag:** typecheck, strip-check, lint en eigen poorten mogen
  als **controle** draaien, nooit in de runtime of als verplichte dev-buildstap.
- **Eén dev-only root-pakket** bevat die tooling; gamecode houdt geen
  `package.json`-afhankelijkheid.
- **CI-poorten:** `import_check`, `undef_check`, `spec_check`, `dead_code`,
  `player_singleton_audit` en `import_cycles_test` draaien in de lichte fase;
  een nieuwe poort wordt daar aangemeld en gedocumenteerd.
- **Three.js:** de import map is de bron voor `three/addons/`; de CDN-URL blijft
  toegestaan voor de kern, en de build vendort één versie.

## Afgewezen

- **Vite/webpack als dev-server.** Dan zijn er twee laadpaden en is een devfout
  niet dezelfde fout als in de build.
- **Tooling in de runtime of in de game-`package.json`.** Dat maakt de
  browser/Electron-route afhankelijk van een buildstap.
- **"Geen linter" als absolute regel.** De eigen poorten bewijzen het tegendeel;
  ze zijn klein en blijven.

## Gevolgen

- ADR 0006 wordt op de feiten bijgewerkt (CDN/import map, `desktop/build.mjs`,
  de vijf poorten).
- Nieuwe tooling is dev-only en krijgt een regel in `docs/ONTWIKKELEN.md`.
- De game blijft zonder buildstap te openen; CI bewaakt de poorten.
