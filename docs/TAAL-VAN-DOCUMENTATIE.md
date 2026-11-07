# Taal van de documentatie: besluit voor de eigenaar (#692)

**Status: besloten op 7 november 2026 — optie 1.** De eigenaar koos Nederlands proza, behalve pure technische naslag; de uitzondering staat in ADR 0017 en elk uitgezonderd document heeft een Nederlandse leeswijzer bovenaan. [ADR 0017](../../.specs-fire/standards/adr/0017-code-in-het-engels.md)
en [AGENTS.md](../../AGENTS.md) schrijven Nederlands voor als proza-taal (docs, specs, ADR's,
changelog, issues, commits). Een groot deel van de documentatie is in de praktijk (bijna) Engels.
Dat is geen stille uitzondering: het is een besluit dat de eigenaar moet nemen, anders is de regel
niet handhaafbaar.

## Wat er nu staat (meting uit de documentatie-review van 6-11)

| Document | Aandeel Engels proza (stopwoordmeting) |
|---|---|
| `ARCHITECTURE.md` | ~96% (1.958 regels, 205 KB) |
| `docs/DESIGN-BEDIENING.md` | ~99% |
| `docs/DESIGN-COMPONENTEN.md` | ~98% |
| `docs/markt-gebouwen.md` | ~99% |
| `DESIGN_SYSTEM.md` | ~87%, wisselt per sectie van taal |
| `docs/DESIGN-SCHULD.md` | ~88% |
| `docs/DESIGN-SAMEN-SPELEN.md` | ~84% |
| `docs/ONTWIKKELEN.md` | gemengd (~56% Engels; Nederlandse secties vanaf `:580`) |
| `steam/README.md` | 100% |
| `README.md` | Nederlands, met een Engels blok "In English, briefly" (`:3-13`); dat blok staat niet als uitzondering in de ADR |

## Twee opties

### Optie 1 (voorkeur): Nederlands, behalve pure technische naslag

- Proza in het Nederlands voor docs, specs, ADR's, changelog, issues, commits en README.
- **Uitzondering per documenttype**: pure technische naslag mag Engels blijven —
  `ARCHITECTURE.md`, de `DESIGN_*`-familie (`DESIGN_SYSTEM.md`, `docs/DESIGN-BEDIENING.md`,
  `docs/DESIGN-COMPONENTEN.md`, `docs/DESIGN-SCHULD.md`, `docs/DESIGN-SAMEN-SPELEN.md`),
  `docs/ONTWIKKELEN.md` (de Engelstalige secties) en `steam/README.md`.
- Elk uitgezonderd document krijgt **bovenaan een Nederlandse leeswijzer** (doel, doelgroep,
  "de regels staan in de spec") — dan is de taalregel eerlijk en weet een lezer wat hij leest.
- `README.md`'s Engelse blok blijft, maar wordt in de ADR als uitzondering genoemd (korte
  Engelstalige intro voor buitenlandse lezers).
- **Kosten S.** De ADR wordt aangevuld met één alinea en een tabel; de leeswijzers zijn
  ±30 minuten werk voor een agent. Geen vertaalwerk.

### Optie 2: alles vertalen, in etappes

- `ARCHITECTURE.md` laatst (205 KB); eerst de kleine docs en de `DESIGN_*`-familie.
- **Kosten L** en het risico dat namen, paden en codefragmenten bij het vertalen verschuiven.
- Alleen kiezen als de eigenaar Nederlandstalige technische naslag expliciet belangrijk vindt.

## Wat een agent nu kan doen (zonder besluit)

- Niets aan de taal van bestaande documenten veranderen; wel de **meting herhaalbaar** maken en de
  openstaande keuze hier laten staan (dit document).
- Na het besluit:
  - **Optie 1:** de Nederlandse leeswijzers toevoegen aan de uitgezonderde documenten en de
    uitzonderingstabel in ADR 0017 zetten. Eén commit, met de documenten die de leeswijzer krijgen.
  - **Optie 2:** een vertaalvolgorde en eerste ronde voorstellen (klein → groot, `ARCHITECTURE.md`
    laatst), zonder in één keer alles om te zetten.

## Comment voor #692 (eigenaar beslist)

> De meting en de twee opties staan klaar in [docs/TAAL-VAN-DOCUMENTATIE.md](../../docs/TAAL-VAN-DOCUMENTATIE.md).
> Optie 1 (voorkeur): Nederlands, behalve pure technische naslag (`ARCHITECTURE.md`, de
> `DESIGN_*`-familie, de Engelstalige delen van `docs/ONTWIKKELEN.md` en `steam/README.md`), met per
> uitgezonderd document een Nederlandse leeswijzer bovenaan; ADR 0017 krijgt die uitzondering erbij.
> Optie 2: alles vertalen in etappes (kosten L, `ARCHITECTURE.md` laatst). Zeg welke optie het wordt,
> dan voer ik hem uit; tot dan is er niets aan de taal veranderd.
