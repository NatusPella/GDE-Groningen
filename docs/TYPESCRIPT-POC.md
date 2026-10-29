# TypeScript-POC

Proefopzet om de pijplijn en de type-last van een TypeScript-migratie te zien,
zonder er al een productiebesluit van te maken. Alles staat in de worktree
`ts-poc`; niets hiervan is gemerged.

## Wat er ligt

- `tsconfig.json` — `strict`, `noImplicitAny`, `allowJs` (zodat een `.ts`-module
  een bestaande `.js`-module kan importeren en de types worden afgeleid),
  `moduleResolution: Bundler`, en een `paths`-kaart voor `three`/`three/addons`.
- `package.json` — **POC-only**, devDependencies `typescript` en `esbuild`.
- `scripts/build_ts.mjs` — transpileert `game/js/**/*.ts` naar `.js` (types
  eraf, verder ongewijzigd, geen bundel) via esbuild. Standaard in-place, want
  de importers zeggen al `./flitspaalrules.js`; die hoeven dan niet te veranderen.
- Drie modules omgezet als showcase:
  - `game/js/flitspaalrules.ts` — pure logica; gediscrimineerde union als return.
  - `game/js/wantedstate.ts` — typeert alleen het stukje `world` dat het nodig heeft.
  - `game/js/greenwater.ts` — `ArrayLike<number>` voor de positie/index-array's.

## Draaien

```
npm install
npm run typecheck   # tsc --noEmit: 0 fouten op de drie .ts-modules
npm run build:ts    # esbuild: game/js/*.ts -> game/js/*.js
node --check game/js/flitspaalrules.js   # uitvoer is geldige ESM
```

## Wat de proef laat zien

1. **De pijplijn werkt.** Typecheck is groen en esbuild zet `.ts` om naar
   geldige, verder identieke ESM; de importers (`./economy.js`) veranderen niet.

2. **De type-last is meteen voelbaar zodra je niet typeert.** Een naïeve
   conversie (alleen hernoemen, geen types) onder `--strict` geeft op een
   module van 15 regels:

   ```
   error TS2307: Cannot find module 'three' ...
   error TS7006: Parameter 'world' implicitly has an 'any' type.
   error TS7006: Parameter 'amount' implicitly has an 'any' type.
   ... (en per ongetypeerde parameter één)
   ```

   Dat zijn precies de twee kosten uit de schatting: (a) three.js en zijn
   import-kaart aansluiten, en (b) elke ongetypeerde parameter/veld expliciet
   maken (`world` in het bijzonder — de 611 `world.player`-verwijzingen).

## Bevindingen die een echte migratie eerst moet oplossen

- **De canonieke spec verbiedt dit nu.** `.specs-fire/standards/tech-stack.md`
  zegt "geen TypeScript, geen build-stap voor de gamecode" (regel 14), "geen
  nieuwe npm-pakketten in het spel zelf" (regel 21) en "geen root-`package.json`"
  (regel 46). TS overnemen is dus een keuze die duur is om terug te draaien:
  die hoort in een **ADR** met de afgewezen alternatieven (JSDoc/`checkJs`,
  mechanisch hernoemen zonder types, of helemaal niet), en tech-stack.md moet mee.
  Deze POC zet daarom de tooling bewust apart en claimt geen besluit.

- **Three.js-imports zijn niet uniform.** Van de modules die three importeren
  gebruikt het gros een volledige CDN-URL (172), slechts 2 de `three`-shorthand
  en 5 `three/addons/`. TypeScript kan een URL-string niet als moduletypen
  oplossen; voor die 172 moet je óf ambient-modules per exacte URL declareren,
  óf ze eerst normaliseren naar de import-kaart-shorthand. Dat is mechanisch
  maar raakt veel bestanden, en de import-kaart staat in `game/index.html`.

- **`@types/three` is incompleet** (zeker voor 0.160 en de addons). Verwacht
  `any`-terugval en eigen augmentaties op de addons die je het meest gebruikt.

- **Waar de uitvoer woont is nog open.** Deze POC schrijft de gegenereerde
  `.js` in-place en zet die drie namen in `.gitignore`. In een echte migratie
  is dat een bewuste keuze (in-place met gerichte ignores, of een aparte
  uitvoermap en een stap in `desktop/build.mjs`), want `game/js/` bevat ~900
  wel-gecommitte `.js`-bestanden en een generieke ignore kan dus niet.

## Aanbevolen vervolg

Incrementeel, naast de bestaande JS: eerst de ADR + tech-stack bijwerken, dan de
three-imports normaliseren, dan de kern die het meeste opbrengt (wereld/multiplayer,
save/opslag) `.ts` maken en de rest voorlopig `.js` laten.
