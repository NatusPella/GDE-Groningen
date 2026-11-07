# TypeScript-POC gearchiveerd (#637)

Op 29-10-2026 is op de branch `ts-poc` een TypeScript-POC gedaan en is daar een ADR "TypeScript is de taal" als 0022 gedraft. Die branch is nooit in main gekomen en main is JavaScript gebleven. Op 7-11 is het besluit in main genomen als **ADR [0023](../.specs-fire/standards/adr/0023-javascript-blijft-de-taal.md): JavaScript blijft de taal; TypeScript afgewezen** (status voorgesteld; de eigenaar beslist).

Wat er in de POC zat (alleen op `ts-poc`, niet in main):

- drie geconverteerde modules: `flitspaalrules`, `wantedstate`, `greenwater`;
- `tsconfig`, `scripts/build_ts.mjs`, een dev-only root-`package.json` met typescript/esbuild/@types/three, en een strip-stap in `desktop/build.mjs`;
- een voorwaarde-branch `three-imports` (174 modules van een CDN-URL naar bare `'three'`), nooit gemerged en inmiddels 74 bestanden achter;
- `docs/TYPESCRIPT.md` en de ADR-draft, die alleen daar bestaan.

Bewaar de branch als historie; merge hem niet. De afweging (kosten, dubbele bestanden, de 868 UI/THREE-modules die JavaScript blijven, en de 0 conversies sinds 29-10) staat in ADR 0023. Wie het besluit opnieuw wil openen, heeft een nieuwe concrete aanleiding en een nieuwe ADR nodig die 0023 vervangt.
