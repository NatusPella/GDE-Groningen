# 0015 - Eén ingang, geen hoofdmenu

- **Status:** besloten
- **Datum:** 2026-10-25
- **Spec:** `.specs-fire/standards/ui-taal.md` en `multiplayer.md`

## Context

Het startscherm splitst het spel in **Alleen spelen** en **Samen spelen**. Die twee
zijn in de code geen echte modi: solo start zonder sessie, Samen spelen is een laag
erop (#486). De keuze kost een klik, suggereert een onderscheid dat er niet is, en
maakt van "even verder spelen" een menu. De eigenaar wil het model van Watch Dogs 2:
je laadt in je laatste save, en via Escape regel je een andere save of Samen spelen.
Een gast neemt zijn eigen save en profiel mee; daarom is "eerst je eigen game laden,
dan joinen" de logische volgorde, geen omweg.

## Besluit

- **Geen hoofdmenu in het normale pad.** Bij het starten laadt de save die het laatst
  is **opgeslagen**; zonder save begint het verhaal meteen en wordt een save aangemaakt.
- **Eén ingang.** "Alleen spelen" en "Samen spelen" zijn geen knoppen naast elkaar
  meer. Samen spelen is een paneel in het pauzemenu; een gast laadt zijn eigen save en
  kiest daar "Doe mee".
- **Het pauzemenu is de hub:** Spel (opslaan, laden, nieuw spel, stoppen, afsluiten),
  Samen spelen, Instellingen; **Over** (nieuws, credits, versie, licenties) volgt in
  `wi-492-over`.
- **Laden is een wereldgebeurtenis.** Bij een andere save laden wordt de huidige
  voortgang eerst bewaard. In een sessie vraagt de initiator eerst om bevestiging; bij
  "ja" eindigt de sessie (de andere spelers gaan terug naar hun eigen spel) en daarna
  wordt het gekozen spel geladen. Een stemming onder de gasten in plaats van een
  loskoppeling volgt in `wi-492-samen`. Een gast laadt zijn eigen save alleen door de
  sessie te verlaten.
- **Een save blijft een gewone save.** Co-op krijgt geen vlag en geen aparte
  sessie-save; de wereld is van de host, de voortgang per speler.
- **De oude menu-achtergrond blijft voor QA, trailer en attract.** `?menu`,
  `--trailer`, `--preview`, `--attract`, `--benchmark`, `--storytest` en `--noattract`
  houden hun pad; `__menuStart` bestaat alleen in die menuflow. Het normale spelen
  slaat het menu over.

## Afgewezen

- **Het hoofdmenu met Alleen/Samen houden.** Houdt een onderscheid in de UI dat de
  code niet maakt, en kost bij elke start een klik.
- **Alleen automatisch laden, zonder savekiezer.** Dan is een andere save of een
  nieuw spel niet meer bereikbaar; de kiezer hoort in het pauzemenu.
- **Samen spelen als apart profiel of aparte modus.** Past niet bij de eigen save en
  de eigen voortgang per speler.
- **Een co-op-vlag op de save.** Dan wordt een save iets anders dan een save, en
  werkt hij niet meer gewoon solo door.
- **De host laten laden zonder de gasten te vragen.** De wereld is gedeeld; stil
  herladen trekt de gasten onder hun voeten weg.

## Gevolgen

- `startscreen.js` krijgt een bootpad zonder menu; de oude menuflow blijft voor de
  QA- en trailerpaden.
- Het pauzemenu wordt de enige plek voor savebeheer, Samen spelen, nieuws en credits.
- #486 (solo is geen sessie van één) en #434/#388 (gast-pauze en camera) blijven
  nodig voor de naadloze overgang; dit besluit lost ze niet op.
- Geen feature freeze zonder expliciete opdracht van de eigenaar; 1.0 blijft een
  eigenaarsbeslissing.
