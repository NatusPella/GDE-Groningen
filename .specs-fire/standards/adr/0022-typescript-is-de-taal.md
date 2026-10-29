# 0022 - TypeScript is de taal, per aangeraakt bestand

- **Status:** besloten
- **Datum:** 2026-10-29
- **Spec:** `.specs-fire/standards/tech-stack.md` (Taal, Engine, Ontwikkelgereedschap), `.specs-fire/standards/coding-standards.md` (Vormgeving), `AGENTS.md` (Code)

## Context

De gamecode is ~2.063 JS/ESM-bestanden en ~361.000 regels, zonder types en zonder
bundler (ADR 0006). `tech-stack.md` zei "geen TypeScript, geen build-stap voor de
gamecode" en `coding-standards.md` "geen transpilatie". De POC (worktree `ts-poc`,
`docs/TYPESCRIPT.md`) laat zien dat de pijplijn klein is: esbuild stript de
types en laat de ESM-imports intact, dus de import map en relatieve paden blijven
werken. De eigenaar wil vanaf nu alles in TypeScript.

## Besluit

**TypeScript is de taal.** Nieuwe gamecode is `.ts`. Elke echte wijziging aan een
bestaande `.js`-module zet die module in dezelfde commit om naar `.ts` (met imports,
tests en docs mee), zodat de codebase per aanraking vanzelf naar TS groeit. Er komt
geen big-bang.

Daarnaast, onveranderlijk:

- **Geen bundler.** Types worden gestript (esbuild), niet gebundeld. ADR 0006 blijft
  staan; alleen zijn "geen buildstap in dev"-zin krijgt een uitzondering voor
  type-strippen.
- **De `.ts` is de bron; de gegenereerde `.js` wordt gecommit.** De build stript de
  types (`foo.ts` → `foo.js`) en de `.js` gaat mee in de commit, zodat tests met
  gewone `node` (Node 18+) en `index.html` zonder build-stap blijven werken. Bewerk
  de `.ts`, draai `npm run build:ts`, en commit beide. Importers blijven `./foo.js`
  zeggen: de strip-stap zet `foo.ts` om naar `foo.js`.
- **De tooling is dev-only** (typescript, esbuild, `@types/three`), niet in het spel,
  en staat op één plek: een dev-only root-`package.json` voor typecheck/transpile en
  esbuild als build-devDependency van `desktop/` (CI doet alleen daar `npm ci`).

## Afgewezen

- **Alles in één keer naar TS.** Maanden werk, elke diff onleesbaar, de release raakt
  geblokkeerd; de winst staat niet in verhouding tot het risico.
- **Alleen nieuwe code in TS, bestaande JS laten staan.** Dan blijven er twee talen en
  twee manieren bestaan, en wordt de typeveiligheid nooit over de kern getrokken.
- **JSDoc + `checkJs` in plaats van TS.** Minder ingreep in de build, maar zwakkere
  controle (geen `strict` op `.js`, lastiger refactoren) en alsnog duizenden annotaties.
- **Bundler toevoegen (Vite of webpack).** Precies wat ADR 0006 afwees; TS heeft dat
  niet nodig, alleen een strip-stap.
- **Helemaal niet typen.** De duurste typefouten (wereld/multiplayer) blijven dan
  onontdekt tot een test of een speler ze vangt.

## Gevolgen

- `tech-stack.md` regel 14, 21 en 46, `coding-standards.md` regel 10 en 14 en de
  `Code`-sectie van `AGENTS.md` worden in deze commit bijgewerkt.
- Eén strip-stap in `desktop/build.mjs` (na de kopie, vóór het vendoren van three):
  `.ts` in `game/js` wordt `.js`, en de `.ts`-bronnen gaan niet mee in de build.
  `web/build.mjs` erft de stap via zijn stage-aanroep.
- De 172 three-CDN-URL-imports worden genormaliseerd naar de import-map-shorthand
  op het moment dat zo'n module naar TS gaat; anders lost TS de typen niet op.
- `@types/three` (0.160) is incompleet: verwacht `any`-terugval en eigen augmentaties.
- Elke nieuwe of aangeraakte module kán en moet naar `.ts`; dit is geen voorraad
  opdrachten, maar de regel vanaf nu.
