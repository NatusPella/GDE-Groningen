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
| — | (0017 vervangen door 0027; 0025 openingsmontage, 0026 bootorde, 0027 taal, 0028 dev-tooling) | — |

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
| [0015](0015-een-safehouse-systeem.md) | Eén safehouse-systeem, ook voor de verhaalplekken | vervangen door 0021 |
| [0016](0016-een-ingang-geen-hoofdmenu.md) | Eén ingang, geen hoofdmenu; laden is een wereldgebeurtenis | besloten |
| [0017](0017-code-in-het-engels.md) | Code in het Engels, spelteksten en proza in het Nederlands | besloten |
| [0018](0018-een-ingang-voor-de-speler.md) | Eén ingang voor de speler, met een poort op de singleton | besloten |
| [0019](0019-spraak-op-flash-lite.md) | Spraak op Gemini Flash-Lite TTS, en nooit meer Flash | besloten |
| [0020](0020-1plus1is3.md) | 1+1=3: meer spelers, meer loon per persoon (max 3×) | besloten |
| [0021](0021-twee-lagen-verhaal-en-mechanic.md) | Twee lagen, één afspraak: het verhaal noemt de plek, de mechanic rekent | besloten |
| [0022](0022-altijd-online-met-toestemming.md) | Altijd een online sessie, met toestemming bij de eerste start | besloten |
| [0023](0023-javascript-blijft-de-taal.md) | JavaScript blijft de taal; TypeScript afgewezen | voorgesteld |
| [0024](0024-eenspeler-is-een-sessie-van-een.md) | Eenspeler is een sessie van één | besloten |
| [0025](0025-openingsmontage-als-c00-1.md) | De openingsmontage is C00.1 (teruggezet als eerste bedrijf) | besloten |
| [0026](0026-bootorde.md) | Bootorde: de expliciete lijst eerst, de zoektocht als terugval | besloten |
| [0027](0027-code-taal-meetbaar.md) | Code in het Engels, meetbaar en met vaste uitzonderingen | besloten |
| [0028](0028-dev-tooling-zonder-buildstap.md) | Dev-tooling zonder buildstap | besloten |
| [0029](0029-hostsleutel-in-aankondiging.md) | Hostsleutel in de aankondiging bindt het join-antwoord aan de host | besloten |
| [0030](0030-terreingrond-als-buildcache.md) | De terreingrond is een build-cache, geen runtime-werk | voorgesteld |
| [0031](0031-laadscherm-warmt-startbuurt.md) | Het laadscherm bouwt de startbuurt en de shaders voor | besloten |
| [0032](0032-opening-terug-naar-gescripte-scene.md) | De standaardopening is weer de gescripte scène | besloten |
| [0033](0033-montage-terug-met-performance-vangnet.md) | De trailer-montage blijft C00.1 met performance-vangnet | 2026-11-11 |
| [0034](0034-ai-releasegate-met-bewijs.md) | Een releasegate met bewijs, AI-beeldreview en AI-code-review | besloten |
| [0035](0035-eerste-persoon-en-interieur-lods.md) | Eerste persoon is een speelcamera, interieurs krijgen drie LOD's | besloten |
| [0036](0036-alle-voertuigfamilies-interieur.md) | Alle voertuigfamilies krijgen een eigen interieur volgens het #833-patroon | besloten |
| [0037](0037-perf-norm-30fps.md) | Perf-norm v2: 30 fps-p95, werktijd en een 1 s-hitchbudget | besloten |
| [0038](0038-altijd-online-met-instemming.md) | Altijd online met een verplichte naam en expliciete instemming | besloten |
| [0039](0039-licentievrije-audio-met-credits.md) | Licentievrije audio (CC0/CC-BY) van Freesound met credits | besloten |
| [0040](0040-zomerse-zeefdruk-als-designsysteem.md) | Zomerse zeefdruk als enig designsysteem (v3) | besloten |
| [0041](0041-phosphor-als-iconenset.md) | Phosphor als enige iconenset | besloten |
| [0042](0042-voetbalcarriere-eigen-profiel-en-dagteller.md) | Voetbalcarrière: eigen profiel, eigen dagteller, geen twintigste vak | voorgesteld |
| [0043](0043-parodienamen-voor-voetbalclubs.md) | Parodienamen op echte clubs voor alle voetbalclubs | voorgesteld |
| [0044](0044-interieurs-in-het-pand-zelf.md) | Interieurs in het pand zelf, lui gebouwd (geen teleport) | besloten |
| [0045](0045-autotuning-een-systeem-voor-alle-voertuigen.md) | Autotuning: één uiterlijk-systeem voor alle voertuigen, als overlay | aangenomen |
| [0046](0046-radiozenders-met-eigen-pool-en-anti-herhaling.md) | Radiozenders: een keuze uit zenders met eigen pool, zonder dat het gaat herhalen | voorgesteld |
| [0047](0047-snelle-zinnen-zonder-vrije-tekst.md) | Snelle zinnen en emotes: vaste lijst, opt-in, geen vrije tekst | voorgesteld |
| [0048](0048-pages-webversie-wereld-uit-release-opus-only.md) | Pages-webversie: wereld uit de release, alleen Opus, onder /play/ | besloten |
| [0049](0049-interieurs-soort-uit-het-pand-en-bijgebouwen.md) | Interieurs: het soort volgt uit het pand zelf, kleine bijgebouwen zijn betreedbaar | voorgesteld |
| [0050](0050-gelicenseerde-modellen-en-animatiesets.md) | Gelicenseerde mensmodellen en animatiesets (CC0/CC-BY), geen Mixamo | besloten |
| [0051](0051-een-animatie-state-machine-voor-elke-mens.md) | Eén animatie-state-machine voor elke mens (lagen, IK per state, vier bytes over het netwerk) | besloten |
| [0052](0052-kleding-als-modulaire-delen-op-het-gedeelde-skelet.md) | Kleding als modulaire delen op het gedeelde skelet, één draw call per mens | besloten |
