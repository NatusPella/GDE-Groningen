# Multiplayer-visie ("Samen spelen")

De visie van de eigenaar (besluiten van 23-10 en 24-10), op één plek. In gesprekken zeggen we multiplayer; in het spel heet het "Samen spelen" en "wie het spel opende" (nooit "gastheer"). Details van de bouw staan in het hoofdstuk Multiplayer van [ARCHITECTURE.md](../ARCHITECTURE.md), [COOP-GAST.md](COOP-GAST.md), [COOP-OPSLAAN.md](COOP-OPSLAAN.md) en [COOP-OVERDRAGEN.md](COOP-OVERDRAGEN.md). De constitutie (punt 4, 6, 10) staat in [AGENTS.md](../AGENTS.md).

## Principes

1. **Alle spelers zijn gelijkwaardig.** De host is alleen wie de game host en dat kan wisselen (host-overdracht). Het enige wat de host meer mag is spelers uit de gezamenlijke game verwijderen (kicken). Tijd verspringen, slapen, reizen, laden, cheats en pauzeren zijn geen hostrechten maar gezamenlijke keuzes. Iedereen kan een opdracht, bijbaan of wedstrijd starten.
2. **Eenspeler is een sessie van één.** Dezelfde code met één speler en geen netwerk. Het menu pauzeert alleen als je alleen bent. Samen spelen aanzetten kan zonder opnieuw te beginnen.
3. **Alles persoonlijks is eigen.** Geld, verhaalvoortgang, voertuigen en panden blijven in de eigen save van elke speler. Eigen voertuigen en panden komen mee in de wereld van een ander (bezorgen en delen, #449).
4. **Niemand verliest iets.** Bij het einde van een sessie, wegvallen of een crash verliest niemand geld of voortgang: checkpoints per speler, beloning per gebeurtenis, nooit pas aan het einde (#448). Dezelfde beloning telt nooit dubbel.
5. **Meedoen is een keuze.** Een opdracht of activiteit is voor wie J zegt (J/N, geen antwoord is nee). Geen instanties: het gebeurt in de open wereld. Niet halverwege een race, golfronde of dienst aansluiten (uitnodiging vooraf; wie later komt kijkt mee).
6. **Volledige beloning.** Wie meedoet krijgt de volledige beloning (geld en loopbaanpunten) en zijn eigen verhaalstap. Wedstrijden belonen per plek.
7. **Dood en PvP.** Dood door de wereld kost zoals nu, dood door een medespeler niets. Passive mode: onzichtbaar voor PvP, geen schade van of aan spelers, met een afkoelperiode bij omschakelen. PvP kan alleen buiten passive mode, ook met de echte wapens; in PvP mogen bloed en gore getoond worden (constitutie 6). Het spel is 18+. De PvP-minigame staat in #454.
8. **Host-overdracht laat alles zoals het was** (tijd, weer, politie, verkeer, opdrachtstand), en niemand verliest iets.
9. **Privacy en veiligheid.** IP-adressen alleen voor medespelers en goedgekeurde diensten, sessies standaard privé, de host kan kicken, geen echte persoonsnamen in sessienamen en een lijst verboden woorden. Chat en voice komen later en opt-in (#451). Dedicated servers later (#450).
10. **Multiplayer bij ontwerp.** Elke nieuwe missie, bijbaan, minigame of functie krijgt een regel over Samen spelen voordat hij af is (zie AGENTS.md). Nieuwe code voegt geen enkelspeler-aanname toe: gebruik `world.players` en de helpers in `spelersregister.js` (#446).

## Waar het nu staat

Open werk staat op GitHub: #446 (speler-abstractie), #447 (passive mode en PvP), #448 (geen verlies), #449 (eigen voertuigen en panden), #450 (dedicated servers), #451 (chat en voice), #452 (audit van de spelinhoud), #454 (PvP-minigame).
