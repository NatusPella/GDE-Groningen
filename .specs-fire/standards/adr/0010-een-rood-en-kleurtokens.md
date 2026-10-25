# 0010 - Eén rood en kleur alleen via tokens

- **Status:** besloten
- **Datum:** 2026-10-24 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/ui-taal.md`

## Context

Elk scherm had zijn eigen hexen: twee roden, een blauw accent, losse kleuren in
canvas en in 3D. Daardoor las het spel niet als één geheel, en een kleurenblinde
speler kon status niet onderscheiden — de kleuren werden per scherm bedacht in
plaats van per betekenis.

## Besluit

Kleur komt alleen uit tokens: `--gron-green` als accent, `#d93f3f` als **enige**
rood, geel gereserveerd voor wanted, de bijzondere dag en de missiemarkering.
Statuskleuren (ok, gevaar, missie, doel, klus, zorg, politie) komen uit `PALETTES`
via `markerColors()` en `--mk-*`, met drie kleurenblindmodi; canvas en 3D lezen die
functie, nooit een hex.

## Afgewezen

- **Een semantische kleurenset per scherm.** Dat is precies hoe de drift ontstond
  (#476): elke schermbedenker kiest net iets anders voor "gevaar".
- **Alleen CSS-variabelen.** Canvas en de 3D-wereld kunnen geen CSS lezen; zonder
  JS-brug krijgen die hun eigen kopie.
- **Kleur als enige signaal.** Onbruikbaar voor wie rood en groen niet scheidt.

## Gevolgen

Een nieuwe hex is een review-bevinding, en een nieuwe betekenis is een rij in
`PALETTES`, niet een kleur in een bestand. Contrast is 4,5:1 voor tekst en 3:1 voor
grote tekst en iconen, en vorm, patroon of woord gaat altijd mee met de kleur.
