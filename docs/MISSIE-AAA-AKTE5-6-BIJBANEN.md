# AAA-auditkaarten: akte 5, akte 6, bijbanen en Na het verhaal (#955, #956, #963)

Aanvulling op [missies/AAA-UPGRADEPLAN.md](missies/AAA-UPGRADEPLAN.md) (rubriek en bouwstenen). Elke kaart zegt: **nu** (wat de code heeft), **mist**, **AAA-versie** en **kosten** (S dagdeel, M een dag of twee). De stand is van 21-11 en komt uit de code en de pure tests; **er is geen beeld bekeken** tenzij het erbij staat (zie "Wat is niet bekeken").

Volgorde van uitvoeren (impact per kosten): 1 wachtmomenten (#963), 2 aankleding, 3 camera-momenten, 4 tussen-beats, 5 slotbeats en nasleep, 6 toetsplaatjes.

## Akte 5

| Missie | Nu | Mist | AAA-versie | K | Stand |
|---|---|---|---|---|---|
| M22 Een luik erin | regelkaarten, Tinus als wachtfiguur bij het luik, schuur-aankleding, stings | de modder-stap is een korte timing zonder trekkeranimatie; geen cameramoment bij het vastzitten | een kraanshot als de Escapade vastzit, een kijkende figurant | S | niet gedaan (andere agent heeft akte 4 en M22 in de buurt; geen visuele controle mogelijk) |
| M23 De colonne | kaart per rit, stings | afstand tot de colonne is tekst, geen meter | meter in de HUD (zoals de limo-afstand van M10), cinedrive-intro | M | niet gedaan |
| M24 Fries aan d'Olle Grieze | referentiemissie, alleen stings | SFX voor touwen en valpartij | twee SFX-sleutels | S | niet gedaan (geluid) |
| M25 Het bod viel tegen | omakeuken-set, bakkaart | geen | geen groot gat | - | ok |
| **M26 Ontzet (finale 1)** | het plein (jurytafel, kramen, 36 toeschouwers) bij bakken, vuurwerk en de drie slotscènes; wachtfiguur bij het vuurwerk; muziek `missie_feest` | geen slotbeat: de uitslag eindigde in de gewone melding; geen slotakkoord | groot beeld na de uitslag, het grote slotakkoord (`geslaagd_groot`), een nasleep | S | **gedaan** (`big`, `slotSting`, `nasleep`); finishcamera en aparte `snackprijs` niet |

## Akte 6 (Nazomer, het einde)

| Missie | Nu | Mist | AAA-versie | K | Stand |
|---|---|---|---|---|---|
| M27 Inpakken | echte binnenset `woonkamer` met Willemien, drie wachtfiguren (kist, krant, plant), kaarten, `missie_warm` | niets groots; het is een rustige missie | geen | - | ok |
| M28 De wisselwoning | kaart bij de rit, de buren bij de wisselwoning | cameramoment bij aankomst | korte establisher bij de buren | S | niet gedaan |
| M29 Terug | erf met tafels, slingers, Willemien en 10 figuranten, wachtfiguur met koffie | een eigen rustige sting | bestaande `missie_warm` blijft | S | ok |
| **M30 Het proefbeleg (het slot)** | lichte aankleding bij elke vlag, wachtfiguren, `missie_finale`, outro-scène met `wide`-shot | het laatste stuk (de frituur op het plein) was leeg; de poort had geen groot moment; geen slotakkoord of nasleep | **slotfeest** op de wal (6 vrienden, banken, vaandels, spandoek), groot beeld "Gewonnen. Het voelt verkeerd.", slotakkoord, nasleep van twee regels ("Thuis is waar de kar staat.") | M | **gedaan** (`PLAN_SLOTFEEST`, `big`, `slotSting`, `nasleep`) |
| Epiloog (Einde van Deel 4) | eindkaart en credits bestonden al | geen | geen | - | ok |

## Wachtmomenten (#963): stand per cirkel

Elke `hold`-stap van akte 5 en 6 heeft een `wacht`-figuur met passende prop en een kring met voortgang: M22 (luik), M26 (vuurwerk), M27 (drie), M29 (tafels), M30 (drie vlaggen). Controle via de runner: geen `hold` zonder `wacht` in M22 tot M30. De kring is maximaal 7 m (anders onzichtbaar, zie de 20-11-fix).

## Bijbanen en loopbanen

Nieuw in deze ronde: het ritueel in [`sidejobbeats.js`](../game/js/sidejobbeats.js), aangeroepen door `sidejobs.js` bij de start, na elke betaalde klus en bij het einde. Het loon, het niveau en de voortgang veranderen niet.

| Lijn | Begin (nu) | Klant/passagier (nu) | Reeks | Eind (nu) | Mist nog |
|---|---|---|---|---|---|
| Taxi | meter op nul, `{E}` bij de klant (eerste twee diensten) | 6 praatjes | "reeks n (+x%)" en mijlpalen 3/5/8/10 | meter uit, kassa dicht | uitzet-animatie van de klant, wachtfiguur met koffer |
| Bus | deuren dicht, op de tijd | 6 praatjes | idem | terug in de remise | passagiers die in- en uitstappen met een gebaar |
| Lijn (streekbus/trein) | dienstregeling in de cabine | 5 praatjes | idem | laatste halte | idem |
| Bezorger | tas om, bonnetjes | 6 praatjes | idem | tas leeg | deurbel-animatie |
| Krantenwijk | mik met `{E}` | 5 praatjes | idem | wijk bediend | bewoner die op de stoep staat |
| Rondvaart en rondvaarttour | touwen los | 6 en 3 praatjes | idem | aangemeerd | gasten aan boord als figuren |
| Verhuizing, vracht, veerdienst | laadklep, oplegger, loopplank | 5, 4 en 4 praatjes | idem | slotregel | figuur bij het laden |
| Boa, rechtbank, cabaret, fietsdepot, snackoverlast, boerderij, bieten, tjalke | alleen de regelkaart van de vorige ronde | geen | alleen de oude "reeks n" | gewoon eindbord | per lijn een ritueel (S elk), `rechtszaal` als binnenset (M) |

### Na het verhaal

| Activiteit | Nu | Mist | K |
|---|---|---|---|
| Bruggenrace | publiek bij start en laatste brug, startsein, brugsting | brugwachter als figuur, publiek op de bruggen | M |
| Fjord Frituur-dienst | wachtrij van klanten met bestellingen | meer figuranten, sting bij een volle bak | S |
| Skûtsje-sprint, Fierljep, Koe | zie het upgradeplan | geen groot gat | - |

## Samen spelen (regel per onderdeel)

- **M26 en M30:** van wie het spel opende (SS-1). Een gast kiest bij Meedoen? J of N. Beloning en voortgang per speler (#429). Slotfeest, groot beeld, slotakkoord en nasleep zijn lokaal beeld en geluid bij elke speler; niets over het net. Valt iemand weg of sluit later aan: hij mist alleen beeld.
- **Bijbanen (SS-4):** via `BIJBAAN_REGELS` in `coopbijbaan.js`; een gast speelt zijn bijbaan lokaal met zijn eigen ritueel, praatjes en reeks. Loon en voortgang per speler.

## Wat is niet bekeken

Er is in deze ronde **geen Electron gedraaid** en geen beeld bekeken: het slotfeest (staat het op de wal of in de gracht?), de plaatsing van het grote beeld na de poort, de leesbaarheid van de berichten bij een vol HUD (maximaal vier tegelijk) en het slotakkoord op de muziek (`missie_finale` loopt dan al) zijn **nog niet bekeken**. Pure tests dekken: de defs, de stappenaantallen (saves), de teksten (geen merk, geen winter), de reeksformule en de koppeling in `sidejobs.js` (`scripts/akte6_aaa_test.mjs`, `scripts/akte45_aaa_test.mjs`, `scripts/sidejobbeats_test.mjs`).
