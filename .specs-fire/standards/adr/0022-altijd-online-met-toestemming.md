# 0022 - Altijd een online sessie, met toestemming bij de eerste start

- **Status:** besloten
- **Datum:** 2026-10-31
- **Spec:** `.specs-fire/standards/multiplayer.md`
- **Gebied:** Samen spelen, de ingang, instellingen
- **Gerelateerd:** #528 (epic), #526, #527, #438, #486, constitutie 4 en 10, ADR 0026 (de bootorde)

## Context

Samen spelen is nu iets wat je erbij doet: je start lokaal en opent daarna een sessie.
De eigenaar wil het omdraaien ("multiplayer first", een mix van GTA Online en Watch Dogs 2):
je start altijd een online sessie, host zelf als er nog niemand speelt, joint een sessie
met ruimte en dezelfde versie, en host een tweede als de eerste vol raakt. Via Escape
ontsnap je naar een besloten sessie (alleen of met vrienden via een kamercode), en via
de openbare lijst kun je joinen.

Dat botst met constitutie 4 en 10. Automatisch joinen bij een onbekende en automatisch
je eigen sessie openbaar hosten betekent dat je IP-adres naar een onbekende speler gaat
en dat je sessie in een openbare lijst staat. Vandaag is openbaar maken een expliciete
keuze van wie het spel opende (#438); de sessie is standaard privé. Zonder beslissing
hierover kan niemand aan het epic beginnen.

## Besluit

**Toestemming bij de eerste start, één keer, en daarna aanpasbaar in de instellingen.**

Bij de eerste start ziet de speler één scherm met twee dingen: zijn naam (één keer, en
het spel onthoudt hem) en de vraag of hij met andere spelers meedoet. Die twee staan bij
elkaar omdat ze hetzelfde verhaal vertellen: dit is wie je bent, en dit is wie je ziet.

- **Ja** — het spel opent de expliciete lijst met openbare sessies; de speler kiest daar
  zelf een sessie of host er een. Sluit hij dat scherm zonder sessie, dan zoekt de
  automatische terugval (`sessionboot.js`, ADR 0026) alsnog een passende sessie en host
  anders zelf een **besloten** sessie (geen aankondiging, geen plek in de lijst). De
  speler ziet vóór het akkoord wat er dan gebeurt: zijn IP-adres gaat naar zijn
  medespeler en naar de openbare brokers om elkaar te vinden, niet naar een server van
  ons.
- **Nee** — het spel start een besloten sessie van één. Er gaat niets naar buiten, er
  staat niets in een lijst, en niemand kan binnenkomen. De speler kan op elk moment
  alsnog meedoen (via Escape, of via dezelfde vraag in de instellingen).
- **De keuze wordt onthouden** in `gde-settings` (`onlineMeedoen`, per apparaat) en is
  later aan te passen bij Instellingen > Samen spelen, op dezelfde plek als naam en
  kleur. Aanzetten werkt meteen: het spel sluit aan of host zodra de speler weer in de
  open wereld staat. Uitzetten zet de sessie op besloten (bestaande gasten blijven;
  nieuwe komen er niet bij, en de sessie verdwijnt uit de lijst).
- **Dit is toestemming, geen stille standaard.** Er is geen versie waarin het spel zonder
  een expliciet "ja" contact met een onbekende zoekt. Een bestaande speler zonder deze
  instelling krijgt de vraag één keer bij de eerste start na de update; zijn antwoord
  wordt daarna net zo bewaard.

De openbare lijst blijft wat hij is (#438): naam van de sessie, aantal spelers en versie.
Nooit een IP-adres, nooit een wachtwoord.

## Afgewezen

- **Standaard besloten, publiek is opt-in.** Veiliger, maar dan is "altijd een sessie"
  in de praktijk "nooit een sessie": de speler moet eerst iets vinden en omzetten
  voordat hij iemand ziet, en dat is precies het gedrag dat de eigenaar weg wil hebben.
  Blijft wel de terugval voor wie "nee" zegt; dat is dezelfde code met een andere stand.
- **Standaard publiek met een wachttijd** (je sessie gaat pas na dertig seconden in de
  lijst). Een technische oplossing voor een sociale vraag. Een speler die niet weet dat
  hij wacht, wordt alsnog verrast, en de wachttijd zegt niets over wat hij wil.
- **Toestemming per sessie** (steeds opnieuw vragen). Dat is de huidige toestand in de
  lobby en precies wat spelers als hinderlijk ervaren; het is #526.
- **Toestemming in de algemene voorwaarden of bij de installatie.** Te ver weg van het
  moment waarop het gebeurt; de speler kan dan niet meer zien wat hij toestaat.

## Gevolgen

- Het bootpad krijgt één beslismoment voordat de wereld begint. Wie "ja" zegt, ziet eerst
  de expliciete lijst en daarna pas de automatische terugval; wie "nee" zegt, merkt geen
  verschil met alleen spelen. De volgorde staat in ADR 0026.
- `onlineMeedoen` is een instelling met een migratie: ontbreekt hij, dan is de waarde
  "onbekend" (en vraagt het spel het één keer), niet "aan" en niet "nee". Dat verschil
  moet in de code zichtbaar blijven, anders wordt een ontbrekende waarde stil een "ja".
- De bestaande remmen blijven: sessies zijn standaard privé tot de host ze openbaar
  maakt (#438), de host kan spelers verwijderen, en de sessienaam gaat door de
  verboden-woordenlijst. Dit besluit verruimt wanneer er een sessie is, niet wat er
  over een speler naar buiten gaat.
- Instellingen krijgen een eigen onderdeel "Samen spelen" (naam, kleur, meedoen), zodat
  er één plek is waar dit te zien en te wijzigen is. De gastheer-instellingen (wachtwoord,
  maximaal aantal spelers) blijven bij de sessie in het pauzemenu.
- Dit is de eerste keer dat het spel bij het starten contact met buiten zoekt. Elke
  nieuwe plek die dat doet, moet dezelfde vraag stellen en dezelfde instelling lezen.
