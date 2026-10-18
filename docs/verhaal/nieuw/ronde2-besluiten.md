# Verhaal ronde 2: wat is verwerkt en wat niet

Bron: de zes reviews van ronde 1 (nieuwe speler, humor en toon, game design, geografie, logica, constitution en taal) en
de gap-analyse (verhaal en product). Ronde 1 (j1, j2, r4) staat in main. Deze lijst is de controle van ronde 2: per reviewpunt
nagegaan in `09-script-akte*.md`, `storyarc_nieuw.js` en `missions_akte*.js`. Niets hiervan is in beeld bekeken.

## Geografie: verwerkt in ronde 1

M11 (Lauwersmeer zonder getij: de wind duwt het water), M17/M18 (Oosterdiep, Veendam), M19 (Veendam naar Wildervank), M13 (geen containerterminal, windmolenbladen en kabelhaspels),
M15 (Midwolda), M09/M10/T1 (Warffum en Usquert), T2 (overstap in Winsum, uitstappen bij de haven), M21-M23 (één schuurpunt, Aduard), B4 (een negende), M16.6 (dijk van het Oldambtmeer), M14 (Bierum), M12 (terrein bij de visafslag).

## Geografie en humor: verwerkt in ronde 2

- B3: geen Loppersum-gasregel meer (constitution regel 6), wel Appingedam met de hangende keukens.
- B1: de Forum-bijnaam is *Kiekdeuse*, niet *Apenrots*; Tammo zegt de sneer over Tessa, niet zij zelf.
- B2: fietsknooppunten 89 en 90 bij Zoutkamp. M11.1: het Leugenbankje. M13.1: de Borkum-veerboot en het datacenter. M20.1: de fierljepvereniging van Grijpskerk (Berend). M23.7: de houtwallen van het Westerkwartier (Tinus).
- Replay-regels per persoon: Geesje, Accountmanager, Durk, Berend, Henk, Tessa (M23), Jelle (M14.4). Binnenkomsten van Geesje, Klaas, Wubbo en Lammert zonder *Ik ben X, beroep. Oma belde*.
- M07.1: de plakje-boekhouding eruit (*salamitactiek* blijft). M11.6: gaat verder dan M07.4. M20.2: Durk antwoordt Douwe, in plaats van dezelfde regel.
- E2: de Krolbrug staat open (de payoff van *Niemand merkt verschil*).

## Nog open (bewust niet gedaan)

| Punt | Waarom nog open |
|---|---|
| Regio's eerlijker verdelen (M09/M10 naar Kloosterburen, M16 naar Scheemda, M18 naar Hoogezand, M22 naar Leek) | Verplaatst missiecoördinaten en tegels. Nog niet bekeken wat daar staat. |
| M12.3 *Doe bist schier* | Opgenomen regel. Zie [DIALECT-NALEZING.md](../DIALECT-NALEZING.md). |
| M26.4 *gracht naast de Oude Boteringestraat* | De tekst zegt nu *water langs de weg*. Controleer in het spel of daar water ligt. |
| T3 treinlengte 35 km, werkelijk ±80 km | Staat in `reisbeats.js`, niet in het script. |
| *twintig jaar geloofd* (T1) naast *twaalf jaar niks gezegd* (M22.4) | Geen tegenspraak als de treinreis in hun jeugd was. Beide regels zijn opgenomen. |
| Alle puntjes uit het constitution-rapport buiten het verhaalscript (merken in het instellingenmenu, Duitse toeristen, echte festivals) | Niet het verhaal; zie issue met die lijst. |

## Gebouwd in ronde 2

- **M23 bondgenoot kiezen (#217):** wie rijdt naast de Fjord Frituur? Wubbo's bus, Tinus' trekker of Geesjes scooter. De keuze telt in M23 (hoe lang Jelles limo wegblijft), wordt bewaard (`keuze:bond-...`, in de save) en keert terug in M26 (breder groen bij zijn straat, meer tijd bij de limo, eigen scène).
- **M18 bluf-intake:** drie vragen, elk fout antwoord maakt de accountmanager argwanender (argwaan1 en argwaan2). Eén fout: hij loopt mee en de camerahal is sneller en smaller. Twee fouten: de beveiliging loopt mee en de beloning kost geld. Drie fouten: de missie mislukt.
- **M26 afwisselend:** voor de limojacht sluit de colonne van M23 de straten af (bus, trekker en scooter, als timing), met een scène per bondgenoot. Daarna pas de jacht, met de extra tijd van je bondgenoot.

Schrijfwijze en test: [STIJLGIDS.md](../STIJLGIDS.md), `scripts/story_similarity_test.mjs`.
