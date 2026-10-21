# Balans en tempo van akte 1 t/m 5

Meting met de spelbot voor #147 (verbeterronde van alle missies). **Geen mens heeft gespeeld.** De tabellen hieronder komen uit
`node scripts/bot/balans.mjs` (leest alleen `events.jsonl` van de spelbot); de runs staan in de notitiemap van de sessie
(`r41-balans-runs/<akte>/`) en zijn met hetzelfde commando opnieuw te verwerken.

## Wat de bot wel en niet laat zien

De bot speelt zonder gevoel, kan niet alles (een stunt zonder krassen, een race, een kraak, een colonne op afstand houden) en pakt na
drie mislukte pogingen een gelogde cheat. Daarom zeggen **speeltijd, 'Opnieuw' en 'Vast' vooral iets over de bot**. Wat de bot *niet*
vertekent, en waar dit document op leunt:

- de ontwerp-duur van de cutscenes per akte (uit de catalogus van de preview, zonder opnames);
- de **nominale route** van een missie: de som van de afstanden tot elk doel op het moment dat het doel verschijnt, van de langste poging
  (niet wat de bot liep) en de reistijd daarvoor (5,5 m/s te voet, 14 m/s in een voertuig);
- de tijdlimieten van de missies en hoeveel ervan de bot nodig had;
- het aantal doelwissels in de HUD en de soorten stap (alleen waar de run de wissels logde);
- de meldingen waarmee het spel een poging afbreekt.

Een stap met een cheat telt niet mee in een mediaan, een route-oordeel of een variatie-oordeel (de cheat knipt de stap af).

**Meetopzet.** Vijf runs achter elkaar (seed 1, snelheid 2, reizen aan, eigen slot, wegwerpprofiel, een machine die door meerdere sessies
tegelijk wordt gebruikt: 'Echt' is wandtijd en dus ruim): akte 1 vanaf een nieuw spel, akten 2 t/m 5 met `--from=M07`, `M12`, `M17`,
`M22` (een sprong, dus de aanloop naar de eerste missie van een akte en soms de aanloop na een cheat is geen echte reis). De meter zit in
`scripts/bot/bot.page.js` (per stap: echte tijd, meters, tijd in cutscenes en gesprekken, doelwissels, langste stilte, tijdlimiet).
Akte 3 haalde in 120 minuten wandtijd M15 niet uit en eindigde op een time-out.

## Bevindingen

1. **Cutscenes (ontwerp).** Akte 1 heeft de meeste scènetijd per missie: 14 scènes, 12:31 in totaal, mediaan 0:44, met de langste van het spel,
   `M01.intro` (1:40), voor de speler zijn eerste stuur in handen heeft. Akte 2 heeft 5:52 (9 scènes), akte 3 8:11, akte 4 9:08 en akte 5 de
   meeste en kortste scènes (24, mediaan 0:25, totaal 13:40). Alleen `M01.intro` en `M16.outro` (1:36) komen boven 90 s. Alle scènes zijn
   met SPATIE ingedrukt over te slaan. Spreiding: de mediaan per akte ligt tussen 0:25 en 0:46, de langste tussen 1:18 en 1:40.
2. **Lange stukken zonder doel of actie (> 90 s): geen.** De langste stilte in alle runs is 63 s (M12) en 37 s (M20, een
   verdedigingsstap); elke andere stap blijft op of onder 30 s. De bot staat dus nergens lang te wachten op iets dat het spel zelf moet doen.
3. **Tijdlimieten zijn ruim.** M03 (28 van 180 s) en M04 (41 van 230 s) gebruiken minder dan 20% van hun limiet, M17 (2:41 van 7:00)
   38%; geen enkele stap zonder mislukking kwam onder de 10% marge. Alleen M05 (58 s plus 33 s per checkpoint) en M01 (240 s) gebruikte de
   bot tot de rand. Een te krappe limiet is dus niet aangetoond; een te ruime wel op twee plaatsen (M03, M04), zonder dat dat hindert.
4. **Ritten.** De nominale route per missie zonder cheat, alleen waar de run de doelwissels logde (de stunt van M01, de race van M05 en de
   fatbikebaan van M08 hebben er geen: 0 m in de tabel betekent 'niet gemeten'): M07 2,1 km (2:30 reizen), M09 2,6 km (3:09), M10 5,4 km
   (6:30) en M15 6,2 km (een vlucht, geen rit); alle andere missies met doelwissels blijven onder 1,3 km. M09 en M10 hebben een cheat bij de
   derde poging, maar hun route is die van de langste poging; M14 (7,2 km), M20 (6,1 km) en M23 (3,8 km) zijn door cheats vertekend en tellen
   niet mee. M10 (de wierdepaden naar de sloot bij Uithuizen) is de langste rit. Bij M09 en M10 mag je met de trekker en de
   quad niet hard rijden (eieren, quad); dat maakt van 2,6 en 5,4 km een lange rit. Of dat prettig is kan alleen een mens beoordelen.
5. **Aanloop.** Tussen M12 (Lauwersoog) en M13 (Eemshaven) staat geen reisstap (T3 komt pas na M14); de bot (na een sprong) legde daar 43 km
   af. Hoe ver een speler in een doorlopend spel van het einde van M12 naar het begin van M13 moet is niet met deze runs te meten (de sprong
   zet de bot elders neer); de doorlopende run van #312 heeft daar wel gegevens.
6. **'Opnieuw'.** De bot mislukte M01, M09, M10, M11, M14 en M23 drie keer en M02, M17 en M26 twee keer. Wat het spel meldt:
   M01 de bakkie afgeschreven, achtergelaten of de tijd op; M02 klemgereden of de auto met de automaat afgeschreven; M09 'meer dan de
   helft van de eieren is stuk' (steeds bij 30 van 60, na ongeveer 7 minuten rijden; de bot reed met hoogstens 7 m/s); M10 de quad afgeschreven (drie keer); M11 het skûtsje
   weg; M14 drie keer OPGEPAKT (de bot rijdt voetgangers aan, het misdrijf telt dan op tot een ster); M17 de bruggen te laat; M23 OPGEPAKT, de
   limo van Jelle snijdt Geesje af en de colonne valt uiteen; M26 de notaris is dicht (de limojacht is te traag, zie #354). Alles hier is
   gedrag van de bot in verkeer en bij stunts; het is geen bewijs dat een mens ook mislukt.
   **De bot nam bij een mislukking niet het aanbod 'opnieuw beginnen? Druk op Enter' (#214)** en reed terug naar de start (bij M09 drie minuten
   per poging); dat doet hij nu wel (`botlogic.js`, test in `botlogic_test`), de runs hierboven zijn daar nog zonder gemaakt.
7. **Variatie.** Stappen zonder cheat met hoogstens twee soorten stap (alleen waar de run de doelwissels logde): M04 (één soort, de duif
   fotografeert alles) en M25 (bakken en een scène). Beide zijn ontwerp: de duif en het bakken zijn zelf een minigame. De meeste andere
   missies hebben een cheat nodig gehad (M02, M09 t/m M11, M14, M17, M20, M23) en zijn voor variatie niet te beoordelen; uit de
   definities (`missions_nieuw.js`, `missions_akte4.js`, `missions_akte5.js`) blijkt dat M18 en M22 vijf soorten stap hebben (M18: goto,
   keuze, scène, timing, hold; M22: hold, scène, board, goto, timing), M20 en M23 vier, M10 drie (board, goto, vault) en M09, M13 en M17
   twee (M09 en M17: board en goto; M13: goto en hold). Dat zijn de missies waar 'rijden naar een punt' het meeste is.
8. **Doelwissels in de HUD.** De mediaan per missie ligt tussen 2 en 4 per akte; stappen met 0 of 1 doelwissel zijn de stunt, de races en
   de vluchten (M01, M05, M08, M11, M15): daar staat één doel de hele missie.

## Doorgevoerd

- **De meting zelf (herhaalbaar):** de meter in de spelbot, `scripts/bot/balans.mjs` met `scripts/balans_test.mjs` (16 controles: stappen
  uit gebeurtenissen, de route als langste poging, de aanloop los van de missie, krappe en ruime limieten, variatie, de tabel).
- **De bot speelt de retry zoals een speler** (Enter bij 'opnieuw beginnen'), met een test; daardoor is de wandtijd van een volgende run per
  mislukte missie kleiner en zijn de stappen minder vertekend.
- **De bot loopt niet meer vast tussen de marktkramen en stapt in een achtervolging niet meer uit zijn auto** (eerder in deze ronde, #218).
- Geen spelgetal is veranderd: de bot-data bewijzen geen te hoge of te lage waarde (zie 3, 4 en 6), en een getal aanpassen zonder een mens
  die het speelt zou een gok zijn.

## Voor een mens om te kijken (concrete kandidaten, geen besluit)

- `M01.intro` (1:40) en `M16.outro` (1:36): inkorten of splitsen?
- M09 (eieren) en M10 (quad): is 'rustig rijden' over 2,6 en 5,4 km nog leuk? De bot faalde er drie keer; de eierverliesregel is
  `missions_akte2.js` (`rough` 8,5 m/s, 0,35 per seconde, `failAt` 50).
- M13: geen reisstap tussen M12 en M13 (Lauwersoog naar de Eemshaven); en M09, M13 en M17 hebben maar twee soorten stap.
- M14 (OPGEPAKT bij de achtervolging) en M23 (de colonne): is de straf voor een aangereden voetganger tijdens een missiejacht gewenst?
- M03 en M04: een limiet van 180 en 230 s voor een stuk van 40 en 34 m (de wachtrij en het fotograferen) is ruim; mag korter, zonder haast.

## Tabellen

## Akte 1

Run `r41-balans-runs/kop`: uitkomst KLAAR, speeltijd 64:06, echte tijd 39:30.

| Stap | Titel | Speeltijd | waarvan missie | Echt | Aanloop | Route | Reistijd | Afstand bot | Cutscene | Gesprek | Doelwissels | Soorten stap | Langste stilte | Tijdlimiet (gebruikt) | Opnieuw | Vast | Cheats |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M00 | Opening: verhuisdag | 0:00 | - | 0:06 | - | 0 m | 0:00 | 0 m | 0:00 | 0:00 | 0 | - | 0 s | - | 0 | 0 | - |
| M01 | Nul krassen, vijftienhonderd punte | 12:56 | 6:47 | 8:08 | 1830 m (6:10) | 0 m | 0:00 | 6641 m | 0:02 | 0:00 | 1 | - | 7 s | 5:13 van 4:00 | 3 | 1 | win |
| M02 | Even pinnen | 16:44 | 9:08 | 10:04 | 439 m (7:36) | 670 m | 1:21 | 4356 m | 0:04 | 0:52 | 7 | 2 | 30 s | - | 2 | 9 | win |
| M03 | Het Loket | 5:37 | 0:28 | 3:04 | 303 m (5:09) | 40 m | 0:05 | 959 m | 0:02 | 0:15 | 5 | 3 | 5 s | 0:28 van 3:00 | 0 | 4 | - |
| M04 | Kieken van boven | 7:58 | 0:41 | 5:09 | 806 m (7:17) | 34 m | 0:06 | 2139 m | 0:00 | 0:33 | 2 | 1 | 23 s | 0:41 van 3:50 | 0 | 3 | - |
| M05 | Wind tegen, beide kanten op | 11:26 | 3:50 | 6:54 | 741 m (7:36) | 0 m | 0:00 | 1410 m | 0:02 | 0:00 | 1 | - | 30 s | 1:01 van 0:58 | 1 | 12 | teleport, objective, skip |
| M06 | Het museum stond er al zo | 9:24 | 6:32 | 6:05 | 700 m (2:53) | 598 m | 1:45 | 2327 m | 0:02 | 0:00 | 9 | 4 | 30 s | - | 1 | 7 | teleport, objective, win |

Mediaan speeltijd van de stappen zonder cheat: 5:37.

Mislukt (de melding van het spel):

- M01, poging 1: Nul krassen, vijftienhonderd punten mislukt — Berends bakkie is afgeschreven. Hij telde nul krassen, nu telt hij niks meer
- M01, poging 2: Nul krassen, vijftienhonderd punten mislukt — je liet Berends bakkie staan. Hij telde nul krassen, geen parkeerbonnen
- M01, poging 3: Nul krassen, vijftienhonderd punten mislukt — tijd op. Jelmers chat is al naar een kattenfilmpje en Berend wacht nog
- M02, poging 1: Je bent klemgereden, wegwezen!
- M02, poging 2: Even pinnen mislukt — de auto met de automaat is afgeschreven. Sjabbe kan alleen openen wat heel is
- M05, poging 1: OPGEPAKT
- M06, poging 1: OPGEPAKT

Afwijkingen:

- M01: 3 keer opnieuw
- M02: 2 keer opnieuw
- M03: 28 s gebruikt van 180 s (minder dan 20%)
- M04: 41 s gebruikt van 230 s (minder dan 20%)
- M04: maar 1 soort stap (pigeon), minder dan drie

## Akte 2

Run `r41-balans-runs/romp`: uitkomst KLAAR, speeltijd 113:56, echte tijd 65:41.

| Stap | Titel | Speeltijd | waarvan missie | Echt | Aanloop | Route | Reistijd | Afstand bot | Cutscene | Gesprek | Doelwissels | Soorten stap | Langste stilte | Tijdlimiet (gebruikt) | Opnieuw | Vast | Cheats |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M07 | Al het vet van Grunn | 5:51 | 5:47 | 3:34 | 12 m (0:04) | 2085 m | 2:29 | 2837 m | 0:00 | 0:41 | 4 | 3 | 1 s | - | 0 | 0 | - |
| M08 | Fatbikes tellen niet als fiets | 10:21 | 2:08 | 6:19 | 841 m (8:13) | 0 m | 0:00 | 1251 m | 0:03 | 0:25 | 1 | - | 11 s | 2:07 van 2:40 | 0 | 8 | teleport |
| T1 | De trein naar Warffum | 0:07 | - | 0:06 | 18900 m | 0 m | 0:00 | 3 m | 0:00 | 0:02 | 1 | - | 3 s | - | 0 | 0 | - |
| M09 | Heel aankomen is ook een kunst | 53:28 | 26:24 | 29:00 | 468 m (27:04) | 2646 m | 3:09 | 14740 m | 0:03 | 2:02 | 8 | 2 | 3 s | - | 3 | 8 | win |
| M10 | Een trekker-limo op de wierde | 31:46 | 9:41 | 19:05 | 3482 m (22:05) | 5449 m | 6:30 | 13170 m | 0:04 | 1:10 | 8 | 2 | 5 s | - | 3 | 2 | win |
| T2 | De streekbus naar Zoutkamp | 0:08 | - | 0:05 | 21908 m | 0 m | 0:00 | 0 m | 0:00 | 0:00 | 1 | - | 0 s | - | 0 | 0 | - |
| M11 | Geleend van de Friezen | 12:13 | - | - | 98 m (0:43) | 364 m | 1:06 | - m | - | - | 0 | 2 | - | - | 3 | 8 | win |

Mediaan speeltijd van de stappen zonder cheat: 5:51.

Mislukt (de melding van het spel):

- M09, poging 1: Heel aankomen is ook een kunst mislukt — meer dan de helft van de eieren is stuk. Laad opnieuw
- M09, poging 2: Heel aankomen is ook een kunst mislukt — meer dan de helft van de eieren is stuk. Laad opnieuw
- M09, poging 3: Heel aankomen is ook een kunst mislukt — meer dan de helft van de eieren is stuk. Laad opnieuw
- M10, poging 1: Een trekker-limo op de wierde mislukt — de quad is afgeschreven. Geesjes neef wil hem niet zo terug
- M10, poging 2: Een trekker-limo op de wierde mislukt — de quad is afgeschreven. Geesjes neef wil hem niet zo terug
- M10, poging 3: Een trekker-limo op de wierde mislukt — de quad is afgeschreven. Geesjes neef wil hem niet zo terug
- M11, poging 1: Geleend van de Friezen mislukt — het skûtsje is weg, met zeil en al
- M11, poging 2: Geleend van de Friezen mislukt — het skûtsje is weg, met zeil en al
- M11, poging 3: Een kotter vaart uit. De meeuwen rekenen op een goed ontbijt.

Afwijkingen:

- M07: een route van 2085 m (ongeveer 2:29 reizen), meer dan 1800 m
- M09: 3 keer opnieuw
- M10: 3 keer opnieuw
- M11: 3 keer opnieuw

## Akte 3

Run `r41-balans-runs/staart`: uitkomst TIMEOUT, speeltijd 195:09, echte tijd 120:00.

| Stap | Titel | Speeltijd | waarvan missie | Echt | Aanloop | Route | Reistijd | Afstand bot | Cutscene | Gesprek | Doelwissels | Soorten stap | Langste stilte | Tijdlimiet (gebruikt) | Opnieuw | Vast | Cheats |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M12 | Het staat niet in het rooster | 1:55 | 1:52 | 1:31 | 12 m (0:03) | 0 m | 0:00 | 306 m | 0:00 | 0:00 | 2 | 1 | 63 s | - | 0 | 3 | teleport, objective |
| M13 | Het containerlabyrint | 108:39 | 3:51 | 62:19 | 43456 m (104:48) | 564 m | 1:43 | 33560 m | 0:03 | 0:26 | 6 | 2 | 12 s | 3:45 van 8:00 | 0 | 6 | teleport |
| M14 | De dijk | 63:30 | 7:47 | 42:05 | 6207 m (55:43) | 7234 m | 21:55 | 24054 m | 0:08 | 1:28 | 8 | 2 | 10 s | - | 3 | 8 | teleport, win |
| T3 | De trein naar Winschoten | 0:07 | - | 0:06 | 29383 m | 0 m | 0:00 | 1 m | 0:00 | 0:02 | 1 | - | 3 s | - | 0 | 0 | - |
| M15 | Laag over het graan | 20:57 | - | 13:44 | 6207 m | 6207 m | 18:49 | 6336 m | 0:05 | 0:15 | 0 | - | 10 s | - | 0 | 5 | - |

Mediaan speeltijd van de stappen zonder cheat: 20:57.

Mislukt (de melding van het spel):

- M14, poging 1: OPGEPAKT
- M14, poging 2: OPGEPAKT
- M14, poging 3: OPGEPAKT

Afwijkingen:

- M14: 3 keer opnieuw
- M15: een route van 6207 m (ongeveer 18:49 reizen), meer dan 1800 m

## Akte 4

Run `r41-balans-runs/zuid`: uitkomst KLAAR, speeltijd 38:26, echte tijd 22:26.

| Stap | Titel | Speeltijd | waarvan missie | Echt | Aanloop | Route | Reistijd | Afstand bot | Cutscene | Gesprek | Doelwissels | Soorten stap | Langste stilte | Tijdlimiet (gebruikt) | Opnieuw | Vast | Cheats |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M17 | Open, dicht | 10:25 | 10:22 | 6:20 | 12 m (0:03) | 824 m | 0:59 | 1312 m | 0:03 | 0:00 | 5 | 2 | 5 s | 2:41 van 7:00 | 2 | 9 | objective, skip |
| M18 | Wie draaide de camera's uit? | 7:34 | 1:56 | 4:09 | 1158 m (5:38) | 109 m | 0:20 | 754 m | 0:01 | 0:33 | 6 | 4 | 3 s | - | 0 | 8 | teleport, objective |
| M19 | Stoom | 7:12 | 0:09 | 4:08 | 400 m (7:03) | 0 m | 0:00 | 1428 m | 0:00 | 0:09 | 1 | 1 | 12 s | - | 0 | 6 | teleport |
| T4 | De bus naar Bourtange | 0:07 | - | 0:05 | 23292 m | 0 m | 0:00 | 4 m | 0:00 | 0:00 | 0 | - | 3 s | - | 0 | 0 | - |
| M20 | Het beleg van Bourtange | 11:30 | 10:36 | 6:19 | 81 m (0:54) | 6093 m | 18:28 | 426 m | 0:01 | 0:24 | 5 | 2 | 37 s | - | 1 | 12 | objective, win |
| M21 | Iedereen heeft een rode auto gezie | 1:36 | 1:05 | 1:11 | 58826 m (0:31) | 277 m | 0:20 | 551 m | 0:02 | 0:16 | 4 | 4 | 4 s | - | 0 | 0 | - |

Mediaan speeltijd van de stappen zonder cheat: 1:36.

Mislukt (de melding van het spel):

- M17, poging 1: Open, dicht mislukt — de bruggen draaiden te laat open. Het mosterdschip was eerder
- M17, poging 2: Open, dicht mislukt — de bruggen draaiden te laat open. Het mosterdschip was eerder
- M20, poging 1: Missie mislukt: knock-out

Afwijkingen:

- M17: 2 keer opnieuw

## Akte 5

Run `r41-balans-runs/ontzet`: uitkomst KLAAR, speeltijd 39:04, echte tijd 26:44.

| Stap | Titel | Speeltijd | waarvan missie | Echt | Aanloop | Route | Reistijd | Afstand bot | Cutscene | Gesprek | Doelwissels | Soorten stap | Langste stilte | Tijdlimiet (gebruikt) | Opnieuw | Vast | Cheats |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M22 | Een luik erin | 3:00 | 2:56 | 2:17 | 12 m (0:03) | 443 m | 0:43 | 923 m | 0:01 | 0:14 | 6 | 5 | 4 s | - | 0 | 0 | - |
| M23 | De colonne | 12:15 | 11:38 | 8:52 | 175 m (0:36) | 3831 m | 4:34 | 3056 m | 0:04 | 1:05 | 9 | 4 | 3 s | - | 3 | 7 | teleport, objective, win |
| M24 | Er hangt iets Fries aan d'Olle Gri | 6:53 | 0:33 | 4:27 | 11149 m (6:20) | 70 m | 0:11 | 758 m | 0:02 | 0:22 | 3 | 3 | 13 s | - | 0 | 7 | teleport, objective |
| M25 | Het bod viel tegen | 2:39 | 0:12 | 1:33 | 519 m (2:27) | 8 m | 0:01 | 826 m | 0:02 | 0:04 | 2 | 2 | 3 s | - | 0 | 0 | - |
| M26 | Ontzet, net als in 1672 | 14:17 | 10:18 | 9:26 | 541 m (3:59) | 1279 m | 2:10 | 2280 m | 0:08 | 0:49 | 9 | 6 | 15 s | - | 2 | 7 | objective, skip |

Mediaan speeltijd van de stappen zonder cheat: 2:49.

Mislukt (de melding van het spel):

- M23, poging 1: OPGEPAKT
- M23, poging 2: Jelles limo snijdt Geesje af.
- M23, poging 3: De colonne mislukt — de colonne is uiteengevallen
- M26, poging 1: Ontzet, net als in 1672 mislukt — Jelle is bij de notaris. Het is drie uur: plakje acht is van hem
- M26, poging 2: Ontzet, net als in 1672 mislukt — Jelle is bij de notaris. Het is drie uur: plakje acht is van hem

Afwijkingen:

- M23: 3 keer opnieuw
- M25: maar 2 soorten stap (bake, scene), minder dan drie
- M26: 2 keer opnieuw

## Akten onderling

| Akte | Stappen | Mediaan speeltijd | Mediaan missietijd | Langste stap | Mediaan route | Mediaan cutscene | Mediaan doelwissels | Opnieuw | Cheats |
|---|---|---|---|---|---|---|---|---|---|
| Akte 1 | 7 | 5:37 | 0:34 | M02 16:44 | 34 m | 0:00 | 2 | 7 | 8 |
| Akte 2 | 5 | 5:51 | 5:47 | M09 53:28 | 2085 m | 0:00 | 4 | 9 | 4 |
| Akte 3 | 4 | 20:57 | - | M13 108:39 | 6207 m | 0:05 | 0 | 3 | 5 |
| Akte 4 | 5 | 1:36 | 1:05 | M20 11:30 | 277 m | 0:02 | 4 | 3 | 7 |
| Akte 5 | 5 | 2:49 | 1:34 | M26 14:17 | 225.5 m | 0:02 | 4 | 5 | 7 |

## Cutscenes per akte (ontwerp)

Duur van de scènes zoals het spel ze timet zonder opnames (leestijd per regel); met opnames is een scène korter of even lang. Afgeleid uit `cutpreview.js`.

| Akte | Scènes | Mediaan | Langste | Totaal | Scènes boven 90 s |
|---|---|---|---|---|---|
| Akte 1 | 14 | 0:44 | M01.intro 1:40 | 12:31 | M01.intro |
| Akte 2 | 9 | 0:35 | M08.outro 1:24 | 5:52 | - |
| Akte 3 | 10 | 0:46 | M16.outro 1:36 | 8:11 | M16.outro |
| Akte 4 | 15 | 0:32 | M20.outro 1:20 | 9:08 | - |
| Akte 5 | 24 | 0:25 | M22.4 1:18 | 13:40 | - |
