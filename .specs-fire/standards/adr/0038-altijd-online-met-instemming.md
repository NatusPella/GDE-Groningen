# 0038 - Altijd online met expliciete instemming

- **Status:** besloten (eigenaarsbeslissing 13/14-11-2026, voor release 0.61.0)
- **Datum:** 14-11-2026
- **Vervangt:** [0022](0022-altijd-online-met-toestemming.md)
- **Spec:** `.specs-fire/standards/mechanica.md` (Samen spelen), `publicatie.md`
- **Verwant:** #530, #528, ADR 0034

## Context

De eigenaar wil dat het spel altijd online speelt, ook met één speler. De oude eerste-startkaart
bood nog "Meedoen", "Alleen spelen" en "Later"; dat is strijdig met die wens en met de
privacyverwachting dat de speler weet dat er een netwerkverbinding wordt gemaakt.

## Besluit

1. De eerste start toont één kaart met een **verplichte naam** en een **verplichte, niet
   vooraf aangevinkte toestemming** voor de online verbinding (STUN/brokers; IP-adres).
2. Zonder naam of zonder toestemming gaat de knop niet verder; er is geen skip, Escape of
   time-out.
3. Na doorgaan start het spel automatisch een **eigen besloten sessie** (sessie van één).
   De openbare lijst wordt niet automatisch gebruikt; een speler kan later zelf een sessie
   delen of meespelen.
4. De privacyverklaring, websitehulp en Steam-tekst beschrijven deze route.

## Afgewezen alternatieven

- **Alleen "Doorgaan" zonder toestemming:** geen informed consent voor het delen van het IP-adres.
- **Weigeroptie/offline modus:** de eigenaar wil altijd online; een weigering zou de start blokkeren
  of een tweede stille modus introduceren.
- **Automatisch bij de drukste openbare sessie aansluiten:** de speler belandt dan ongevraagd bij
  een onbekende; daarom host het spel zelf.

## Gevolgen

De eerste start is één extra verplichte handeling; de rest van het spel verandert niet. De
openbare sessielijst blijft een bewuste keuze in Samen spelen.
