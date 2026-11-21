# Reparaties na de code-review 22-11: Samen spelen en netwerk

Bron: `docs/reviews/CODE-REVIEW-22-11-multiplayer.md` (branch `review-multiplayer-22-11`).
Branch: `fix-multiplayer-22-11`, gemaakt van `origin/main`. Test: `node scripts/multiplayerreview_22_11_test.mjs` (26 controles).
Niet bekeken: geen Electron, geen echte verbinding; alles is gemeten met pure modules en de in-memory hub. Nog niet in beeld bekeken.

| Bevinding | Reparatie | Commit |
| --- | --- | --- |
| B1 lijst en welkom boven MAX_JSON | `lijstEvent` houdt een budget aan (eerst de outfits eruit, dan de avatar), de outfits gaan in eigen `outfits`-berichten (`lijstBerichten`, `leesOutfitsEvent`, `voegOutfitsSamen`); `HostHub._announceList` stuurt hoogstens een keer per tick, met try/catch per bericht; het welkom gebruikt het kleinere `WELKOM_BUDGET` | `fb8ae2e12` |
| B2 tijd van de claim door de gast | de host stempelt de tijd zelf (`stamp`, eigen klok, nooit terug); `body.t` van gasten telt niet, ook niet bij `hello` | `2e40d3339` |
| B3 quotum en snelheidsgrens | 500 percelen en 16 plekken per andere speler (`PER_PLAYER_PARCELS`, `PER_PLAYER_SPOTS`), een `hello` per verbinding (opnieuw na een vertrek), token bucket per slot (`RATE_BURST` 40, `RATE_PER_S` 8), niet aangenomen claims gaan niet door naar de anderen | `2e40d3339` |
| B4 `stopBezitNet` nooit aangeroepen | `stopCoopNet` roept hem aan; `ensureBezitNet` stopt een oud net bij een nieuw transport (hostwissel) | `2e40d3339` |
| B5 eigen percelen niet in de map | `attachCoop` zet de eigen percelen en vergunde plekken met t = 0 in de map (snapshot en hello); de claimlaag wordt bij het begin van de sessie gemaakt (`openBezitNet`: host na `startHost`, gast zodra hij binnen is); een perceel dat je al had, kun je door een claim van een medespeler niet verliezen of terugbetaald krijgen (`preowned`); eigen plekken gaan als claim mee, en de plekken van anderen gaan naar een nieuwe gast | `2e40d3339` |
| N1 prototype-sleutel in de ping-tekst | `Object.hasOwn` in `coopnet.js` en `coopping.js` | `620f11922` |
| N2 relay van ping en outfit zonder limiet | `relayPing`: alleen de bekende velden en de ping-afkoeling per afzender; de lijst na een outfit hoogstens een keer per seconde (`OUTFIT_LIJST_S`), een open wijziging gaat alsnog mee | `fb8ae2e12` |
| N3 tuning-tekenset bij het lezen | zelfde controle als `writeLook` in `readLook` | `620f11922` |
| N4 `hw-aangesloten` van elke gast | niet gedaan: de nieuwe host kent het slot van de oude host pas na het aansluiten niet vooraf; de schade is beperkt (de terugval start niet). Blijft open, zie bevinding | |
| N5 dempen op naam | niet gedaan: er is in de spelerslijst geen stabiel id (de plekken worden na een hostwissel opnieuw verdeeld); de naam is uniek binnen een sessie (`maakUniek`) en de keuze staat in de commentaar van `multiplayerphrases.js`. Een stabiele id vraagt een protocolwijziging | |

## Aandachtspunten

- De claimtijd is nu de aankomsttijd bij de host. Bij een gast met veel vertraging wint de host dus vaker; dat past bij "de eerste koper wint" zoals de host het ziet.
- Een perceel dat twee spelers al in hun eigen save hadden, staat bij een van beiden als claim van de ander in de map; dat heeft geen gevolgen voor het bezit zelf (per speler, #429).
- Een oudere gast kent `outfits` niet en negeert het bericht (`handleEvent` geeft `false`); hij ziet bij veel spelers dan alleen de outfits niet die niet in het lijstbericht pasten.
