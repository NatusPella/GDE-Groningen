# Architecture Decision Records

Elke beslissing die duur is om terug te draaien, of die iemand over drie maanden
opnieuw gaat voorstellen, staat hier met het waarom én met de alternatieven die we
afsloegen. De **specs** in de map erboven zeggen wat en hoe; een ADR zegt waarom en
waarom niet. Bij tegenspraak wint de spec, en is de ADR verouderd: werk hem bij.

## Wanneer je er een schrijft

Een ADR is nodig als minstens één van deze waar is:

- De keuze is duur om terug te draaien (projectie, dataformaat, opslag, protocol).
- Er is een alternatief dat een verstandig mens opnieuw zal voorstellen.
- De keuze verklaart een regel die er zonder context willekeurig uitziet.

Geen ADR voor: een functienaam, een kleur, een instelling, een bugfix. Dan is de
spec of de commit genoeg.

## Vorm

`NNNN-korte-titel.md`, vier cijfers, nooit hernummeren. Status is `besloten`,
`voorgesteld` of `vervangen door NNNN`. Kop:

```text
# NNNN - Titel

- **Status:** besloten | voorgesteld | vervangen door NNNN
- **Datum:** jjjj-mm-dd
- **Spec:** waar de regel nu staat

## Context
## Besluit
## Afgewezen
## Gevolgen
```

Een nieuwe ADR kost tien minuten en hooguit twintig regels. Een beslissing die een
bestaande ADR vervangt, krijgt een nieuwe ADR met "vervangen door" in de oude; je
schrijft de oude niet om.

**Nummers zijn een gedeelde voorraad.** Twee chats die tegelijk een ADR schrijven,
pakken anders hetzelfde nummer. Daarom reserveert de coördinator een nummer in
deze lijst voordat een andere sessie begint te schrijven:

| # | Gereserveerd voor | Door |
|---|---|---|
| 0016 | GDE Light Sims (#492) | intent `gde-light-sims` |

## Lijst

| # | Beslissing | Status |
|---|---|---|
| [0001](0001-rd-new-als-projectie.md) | RD New met verschoven oorsprong als enige projectie | besloten |
| [0002](0002-wereld-als-tegels.md) | De wereld is data: `.gdt`-tegels in plaats van `citymap.json` | besloten |
| [0003](0003-stad-gepind-provincie-gestreamd.md) | De stad staat gepind, de provincie streamt | besloten |
| [0004](0004-een-world-state.md) | Eén `World`-stateobject en één updatevolgorde | besloten |
| [0005](0005-pure-regelmodule-plus-glue.md) | Rekenregels in een pure module, de rest in de glue | besloten |
| [0006](0006-geen-bundler.md) | Geen bundler: import map en relatieve paden | besloten |
| [0007](0007-opener-is-geen-baas.md) | Wie het spel opent is geen baas | besloten |
| [0008](0008-opdrachtstand-per-groep.md) | Opdrachtstand per groep, niet per speler of sessie | besloten |
| [0009](0009-saves-lokaal-met-migraties.md) | Saves lokaal, met migraties en zonder account | besloten |
| [0010](0010-een-rood-en-kleurtokens.md) | Eén rood en kleur alleen via tokens | besloten |
| [0011](0011-tekst-is-data.md) | Tekst is data: canon, script, build, spel | besloten |
| [0012](0012-nederlands-verzonnen-altijd-zomer.md) | Nederlands, verzonnen namen, altijd zomer | besloten |
| [0013](0013-een-testrunner-met-fasen.md) | Eén testrunner met drie fasen | besloten |
| [0014](0014-release-lokaal-builds-in-actions.md) | Release lokaal, builds in Actions, agents nooit | besloten |
| [0015](0015-een-safehouse-systeem.md) | Eén safehouse-systeem, ook voor de verhaalplekken | besloten |
| [0017](0017-code-in-het-engels.md) | Code in het Engels, spelteksten en proza in het Nederlands | besloten |
