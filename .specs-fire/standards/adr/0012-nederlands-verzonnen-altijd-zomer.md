# 0012 - Nederlands, verzonnen namen, altijd zomer

- **Status:** besloten
- **Datum:** 2026-10-18 (vastgelegd 2026-10-25)
- **Spec:** `AGENTS.md` (constitutie 1-3) en `.specs-fire/standards/ui-taal.md`

## Context

Het spel speelt in een herkenbaar Groningen, met echte straten, kerken en de
Martinitoren. Dat is de kracht en tegelijk het risico: een echt merk, een echte
ondernemer of een echt slachtoffer maakt van een parodie een probleem. En een
zomerseizoen in een stad die ook winter kent, vraagt een keuze.

## Besluit

Alles wat de speler ziet of hoort is Nederlands. Echte plaatsen en openbare
gebouwen mogen, en moeten kloppen. Merken, bedrijven en personen zijn verzonnen of
een parodie met eigen naam en kleur (Kiekdoar, Radio Proat, Us Mem Snacks, Albert
Hijgt, Wiebelwerk). Het is altijd zomer: geen winter, sneeuw of natuurijs. "Grunn",
nooit "de Grunn".

## Afgewezen

- **Engelse termen als vakjargon.** Er stonden er vier in beeld (Kneel, Driver,
  Grinds, "Made with ♥", #465); de rest van de HUD is Nederlands en dan leest een
  losse Engelse term als een fout.
- **Echte evenementen en merken als decor.** Noorderzon en de KEI-week zijn echte
  namen; de canon gebruikt verzonnen namen (Kiezelweek) en de uitzonderingen liggen
  bij de eigenaar (#72, #489).
- **De vier seizoenen.** De kalender, de kleding, de bomen en het licht zijn op één
  seizoen gebouwd; een wintervlaag zou een tweede set nodig hebben.

## Gevolgen

`text_audit.mjs` faalt op anglicismen, op "de Grunn" en op de merkenlijst; een
bewuste uitzondering staat met reden in `scripts/text_audit_allow.json`. Een nieuwe
plek of productnaam is een verzonnen naam, en een nieuw personage een verzonnen
persoon.
