# 0022 - TypeScript naast JavaScript, zonder bundler

- **Status:** voorgesteld
- **Datum:** 2026-10-29
- **Spec:** `.specs-fire/standards/tech-stack.md` (Taal, Engine, Ontwikkelgereedschap)

## Context

De gamecode is ~2.063 JS/ESM-bestanden en ~361.000 regels, zonder types en zonder
bundler (ADR 0006). `tech-stack.md` zegt nu expliciet "geen TypeScript, geen
build-stap voor de gamecode" (regel 14), "geen nieuwe npm-pakketten in het spel
zelf" (regel 21) en "geen root-`package.json`" (regel 46).

De POC (worktree `ts-poc`, `docs/TYPESCRIPT-POC.md`) laat zien dat de pijplijn klein
is: esbuild stript de types en laat de ESM-imports intact, dus de import map en de
relatieve paden blijven gewoon werken. De echte last is typen schrijven, niet bouwen:
onder `--strict` meldt elke ongetypeerde parameter zich, en `world` (611
`world.player`-verwijzingen) en three.js (172 CDN-URL-imports) zijn de grootste posten.

## Besluit

TypeScript mag, naast JavaScript, en alleen onder deze voorwaarden:

- **Geen bundler.** Types worden gestript (esbuild/`tsc`), niet gebundeld. ADR 0006
  blijft staan; alleen zijn "geen buildstap in dev"-zin krijgt een uitzondering voor
  type-strippen.
- **Incrementeel en side-by-side.** `.ts` naast `.js`; een module wordt pas `.ts` als
  hij toch open gaat. Geen big-bang. Eerst de kern met de meeste winst: wereld en
  multiplayer, save en opslag.
- **De uitvoer is gegenereerd en staat niet in git.** In-place `.js` met gerichte
  ignores, of een aparte uitvoermap; de bron van waarheid is de `.ts`.
- **De tooling is dev-only** (typescript, esbuild, `@types/three`), niet in het spel,
  en staat op één duidelijke plek (een eigen `tooling`-pakket of een root-`package.json`
  — dat laatste vervangt dan de "geen root-`package.json`"-regel).

## Afgewezen

- **Alles in één keer naar TS.** Maanden werk, elke diff onleesbaar, de release raakt
  geblokkeerd; de winst staat niet in verhouding.
- **JSDoc + `checkJs` in plaats van TS.** Minder ingreep in de build, maar zwakkere
  controle (geen `strict` op `.js`, lastiger refactoren) en alsnog duizenden annotaties.
- **Bundler toevoegen (Vite of webpack).** Precies wat ADR 0006 afwees; TS heeft dat
  niet nodig, alleen een strip-stap.
- **Helemaal niet typen.** De duurste typefouten (wereld/multiplayer) blijven dan
  onontdekt tot een test of een speler ze vangt.

## Gevolgen

- `tech-stack.md` regel 14, 21 en 46 moeten mee: TS en een strip-stap worden toegestaan,
  dev-only pakketten krijgen een plek, en een (dev-only) root-`package.json` is dan oké.
- Eén type-strip-stap in `desktop/build.mjs` en `web/build.mjs` (esbuild, geen bundel),
  plus een dev-manier om `.ts`-bronnen te draaien (een eenmalige of watch-strip).
- De 172 three-CDN-URL-imports worden eerst genormaliseerd naar de import-map-shorthand,
  anders lost TS de typen niet op.
- `@types/three` (0.160) is incompleet: verwacht `any`-terugval en eigen augmentaties.
- Elke nieuw geopende module kán naar `.ts`; dit is geen voorraad opdrachten.
