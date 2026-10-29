# TypeScript

Sinds ADR [0022](../.specs-fire/standards/adr/0022-typescript-is-de-taal.md) is
TypeScript de taal: nieuwe gamecode is `.ts`, en elke `.js`-module die je voor een
echte wijziging opent, gaat in dezelfde commit naar `.ts`. Dit bestand bewaart hoe
de pijplijn werkt en wat de proef (voorheen "POC") heeft opgeleverd.

## Pijplijn

- `tsconfig.json` — `strict`, `noImplicitAny`, `allowJs` (zodat een `.ts`-module
  een bestaande `.js`-module kan importeren en de types worden afgeleid),
  `moduleResolution: Bundler`, en een `paths`-kaart voor `three`/`three/addons`.
- Root `package.json` — **dev-only** (`typescript`, `esbuild`, `@types/three`),
  scripts `typecheck` en `build:ts`. Geen runtime-afhankelijkheden.
- `scripts/build_ts.mjs` — transpileert `.ts` → `.js` (types eraf, geen bundel).
  `--out DIR` voor de build, `--drop-ts` om de bronnen uit de build te laten.
- `desktop/build.mjs` — stript `.ts` → `.js` na de kopie, vóór het vendoren van
  three, en laat de `.ts`-bronnen uit de build. `web/build.mjs` erft dit via zijn
  stage-aanroep.

## Draaien

```
npm install             # root, dev-only tooling
npm run typecheck       # tsc --noEmit
npm run build:ts        # game/js/*.ts -> game/js/*.js (in-place, voor dev)
```

Imports blijven `.js` zeggen (`./economy.js`): de strip-stap zet `foo.ts` om naar
`foo.js`, dus importers veranderen niet. De gegenereerde `.js` staat niet in git;
een omgezette module krijgt daarom een regel in `.gitignore`.

## Wat de proef liet zien

- **De pijplijn is klein.** Typecheck was groen en esbuild zette `.ts` om naar
  geldige, verder identieke ESM; de importers veranderden niet.
- **De type-last is meteen voelbaar zodra je niet typeert.** Een naïeve conversie
  (alleen hernoemen) onder `--strict` gaf op 15 regels:

  ```
  error TS2307: Cannot find module 'three' ...
  error TS7006: Parameter 'world' implicitly has an 'any' type.
  error TS7006: Parameter 'amount' implicitly has an 'any' type.
  ```

  Dat zijn de twee kosten: three.js aansluiten en elke ongetypeerde parameter
  expliciet maken (`world` voorop, de 611 `world.player`-verwijzingen).

## Blijvende aandachtspunten

- **Three-imports zijn niet uniform.** Het gros importeert three via een volledige
  CDN-URL (172), slechts 2 via de `three`-shorthand en 5 via `three/addons/`.
  TypeScript lost een URL-string niet op; zo'n module wordt bij het omzetten
  genormaliseerd naar de import-map-shorthand.
- **`@types/three` (0.160) is incompleet**, zeker voor de addons: verwacht
  `any`-terugval en eigen augmentaties.
- **Waar de uitvoer woont.** In-place `.js` naast de `.ts`, met een gerichte
  `.gitignore`-regel per omgezette module. Wordt die lijst ooit onwerkbaar, dan is
  het alternatief een aparte uitvoermap met een dev-server — een bewuste keuze die
  dan zijn eigen ADR-noot verdient.
