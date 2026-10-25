# 0008 - Opdrachtstand per groep, niet per speler of sessie

- **Status:** besloten
- **Datum:** 2026-10-24 (vastgelegd 2026-10-25)
- **Spec:** `.specs-fire/standards/multiplayer.md`

## Context

In een sessie kunnen meerdere groepen spelers dezelfde opdracht doen, en een gast
kan een andere keuze maken dan de groep die naast hem staat. Met één globale stand
overschrijft de ene groep de voortgang van de andere, en met een stand per speler
kan een groep niet samen één opdracht afmaken.

## Besluit

Elke opdracht heeft een id (`<index>|<label>`). Stand en deelnemers staan per id in
`coopmissie.js`; de opener stuurt de id mee in het `missie`-bericht en elke speler
kent alleen zijn eigen id en keuze. "Meedoen?" is J of N met 10 seconden bedenktijd,
en **geen antwoord is nee**.

## Afgewezen

- **Stand per speler.** Dan kan niemand samen een opdracht doen: de een ziet
  stap 2, de ander stap 5, en de beloning valt dubbel of helemaal niet.
- **Stand per sessie.** Botst zodra twee groepen in dezelfde sessie iets anders
  doen; de tweede groep overschrijft de eerste.
- **Geen id, alleen de opdrachtnaam.** Namen veranderen bij een herschrijving en
  zijn niet uniek.

## Gevolgen

Beloningen gaan per gebeurtenis-id en nooit dubbel (`coopbeloning.js`). Late
instap is dicht bij een race, kluisklus of timer, want daar is meerijdend instappen
oneerlijk. De stand gaat mee bij overdracht; dat is nog een open punt (#452).
