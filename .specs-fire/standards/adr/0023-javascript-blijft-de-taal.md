# 0023 - JavaScript blijft de taal; TypeScript afgewezen

- **Status:** voorgesteld (de eigenaar beslist; tot dan geldt: main is JavaScript)
- **Datum:** 2026-11-07
- **Spec:** `.specs-fire/standards/tech-stack.md` (§ Taal)
- **Gebied:** de hele codebase, tooling, CI
- **Gerelateerd:** #637, de branch `ts-poc` (waar dit besluit eerder als 0022 gedraft stond), #593

## Context

Op 29-10 is op de branch `ts-poc` een ADR "TypeScript is de taal" (als 0022) en een POC vastgelegd: drie modules geconverteerd (`flitspaalrules`, `wantedstate`, `greenwater`), een `tsconfig`, `scripts/build_ts.mjs`, een dev-only root-`package.json` en een strip-stap in `desktop/build.mjs`. Die branch is nooit in main gekomen, ligt 166+ commits achter, en main is nog 100% JavaScript (931 modules, 248.027 regels, 0 `.ts`). Inmiddels heeft main 0022 voor "altijd online met toestemming" gebruikt, dus twee "besloten" ADR's met hetzelfde nummer. Sinds 29-10 zijn er **0** conversies bijgekomen: elke sessie leest main en doet het tegenovergestelde van wat de eigenaar dacht te hebben besloten. Een half besluit in een worktree is de duurste optie.

De POC maakt ook zichtbaar wat "landen" zou kosten: `three-imports` (174 modules van CDN-URL naar bare `'three'`) moet eerst gerebased en gemerged worden (74 bestanden zijn sindsdien gewijzigd), er is een `tsc --noEmit`-poort en een driftpoort nodig (`.ts` en gecommitte `.js` lopen anders stil uiteen), en de conversie van de contract-eilanden (protocol/codec, saves, pure `*rules`, `gdt`, `World`-interface) is ~60 bestanden / 10.500 regels, 27-42 dagen. De ~868 UI/THREE-glue-modules blijven ook dan JavaScript (230-500 dev-dagen voor weinig winst); `@types/three` 0.160 is incompleet.

## Besluit

**JavaScript blijft de taal van deze repo.** Er komt geen TypeScript, geen `tsc`-poort, geen build- of strip-stap en geen tweede versie van een module. TypeScript is onderzocht (POC) en afgewezen. `docs/TYPESCRIPT.md` en de ADR-draft leven alleen op `ts-poc` en verhuizen niet naar main.

## Afgewezen

- **Alsnog landen** (POC + `three-imports` mergen, tooling en poort bouwen, contract-eilanden converteren): 27-42 dagen voor ~60 bestanden, terwijl 868 modules JavaScript blijven en er sinds 29-10 nul conversies zijn gedaan. De baten (typeveiligheid op de contracten) wegen niet op tegen de dubbele bestanden, de driftpoort en de toolinglast.
- **Hybride** ("alleen nieuwe bestanden in TS"): twee talen, twee buildpaden en een grens die niemand kan handhaven; zonder `tsc`-poort levert het geen typeveiligheid en met poort kost het dezelfde tooling als landen.
- **Het besluit laten staan zonder het in main te zetten**: dat is de huidige toestand en die kost elke sessie opnieuw tijd (dit issue).

## Gevolgen

- `tech-stack.md` § Taal is de regel: JavaScript (ES-modules), geen TypeScript en geen build-stap voor de gamecode; deze ADR noemt de reden en het afgewezen alternatief.
- `ts-poc` en `three-imports` worden als historie gearchiveerd (niet gemerged); de POC-bevindingen staan in `docs/archief/2026-11/typescript-poc.md`.
- Geen `tsc --noEmit`, geen `build:ts --check` en geen root-`package.json` in main. De bestaande poorten (syntaxcheck, `spec_check`, de testrunner) blijven de kwaliteitsgrens.
- Opnieuw openen kan alleen met een nieuwe, concrete aanleiding (bijvoorbeeld een nieuw contract dat zonder types aantoonbaar fouten geeft); dan met een nieuwe ADR die dit besluit vervangt.

