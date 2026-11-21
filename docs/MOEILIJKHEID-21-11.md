# Moeilijkheid per save (#1169)

> Naslag. Regels: [AGENTS.md](../AGENTS.md) (constitution, Multiplayer bij ontwerp), [mechanica.md](../.specs-fire/standards/mechanica.md), [ui-taal.md](../.specs-fire/standards/ui-taal.md), [COOP-GAST.md](COOP-GAST.md), [BALANS-21-11.md](BALANS-21-11.md).
> Code: `game/js/difficulty.js` (de ene bron), `difficultycard.js` en `difficultyui.js` (de kaart bij een nieuw spel), `difficultypanel.js` (Instellingen > Moeilijkheid).
> Tests: `scripts/difficulty_profile_test.mjs`, `scripts/difficultycard_test.mjs`, `scripts/difficulty_test.mjs` en de oudere `difficulty_*_test.mjs`.

## Wat de eigenaar vroeg

"Ik wil een globale instelling (binnen een save) voor moeilijkheid, met daaronder opties om dingen te kiezen. Misschien moet de game dat ook vragen als je voor het eerst begint of als je een nieuwe save start."

## Ontwerp in één alinea

Elke save heeft een **niveau** (Ontspannen, Standaard of Uitdagend) en daaronder een lijst **opties**. Het niveau stelt elke optie in; een speler kan elke optie los daarvan afwijkend zetten (dan heet de save "Standaard · aangepast"). Het profiel `{ level, custom }` staat in de savegame (veld `moeilijkheid`), niet in de instellingen van het apparaat. `difficulty.js` is de enige bron: de gameplay leest `opt('sleutel')` of een van de kleine koppelfuncties, nooit een eigen getal. Op Standaard is elke optie neutraal, dus het spel speelt exact zoals vóór dit systeem (de regressietest vergelijkt de oude tabellen met de nieuwe waarden, ook de duur van een zoekactie van de politie).

## Besluiten, met reden

| Besluit | Reden | Afgewezen |
|---|---|---|
| Drie niveaus, geen vier | De drie namen bestaan al (#800: ontspannen, standaard, uitdagend) en hun id's zitten in de records (`difficulty:uitdagend:<id>`), de medailletabellen, `medalrules`, `penaltyrules`, `voetbalrules` en het voetbal-bericht. Een vierde niveau had zes tabellen en alle bestaande records geraakt. De ruimte zit in de opties: wie het zwaarder wil, zet ze los hoger. | Vier niveaus (Rustig, Gewoon, Pittig, Zwaar): te veel migratie voor te weinig winst. |
| De namen blijven Ontspannen, Standaard, Uitdagend | Ze staan al in de spelersuitleg, de startkaart van activiteiten en de prestaties. | Hernoemen naar Rustig, Gewoon, Pittig: breekt teksten en tests zonder dat het iets uitlegt. |
| Alles per save, niet per apparaat | Wens van de eigenaar; twee saves op één apparaat kunnen verschillen. `settings.difficulty` blijft bestaan als **spiegel** van het actieve niveau, zodat de dertig bestaande lezers (activiteiten, missies, medailles) niet hoeven te veranderen. | De lezers omschrijven naar `getDifficulty()`: dertig bestanden, veel risico, geen verschil voor de speler. |
| Een ander niveau wist de eigen aanpassingen | Een niveau is een voorinstelling; zo staat er nooit een rare mix die de speler niet kan terugvinden. "Terug naar het niveau" doet hetzelfde met één knop. | De aanpassingen bewaren over niveaus heen. |
| Opties zijn vaste stappen, geen vrije getallen | Elke waarde ligt binnen een veilige grens (zie hieronder); een kapotte save of een handmatig bestand valt per optie terug op het niveau. | Vrije schuiven: een exploit en een bron van bugs. |
| Geen prijsoptie, alleen een beloningsfactor van 0,75 tot 1,25 | Inkomen en prijs samen buigen de balans (1,25 x 1,25 = 1,56). Alleen de beloning van missies, herhaalde klussen en medailles schaalt; winkels, garages en boetes blijven gelijk. Zie [BALANS-21-11.md](BALANS-21-11.md). | Een prijs- en een inkomensfactor. |
| Verhaalmodus is een optie, geen niveau | Hij is orthogonaal: je kunt hem op elk niveau aanzetten. Hij haalt de tijdslimiet van missies weg en zet quicktime-events op overslaan. Er verdwijnt niets uit het verhaal: elke stap blijft te halen (zie `qte.js`: het verhaal strandt nooit op een QTE). | Een vierde niveau "Verhaal". |
| `eigen` als waarde van rij-assist, quicktime-events, hints en wedstrijdduur | Die hebben al een eigen instelling per apparaat (Besturing, Quicktime-events, Hints). Het niveau overschrijft ze alleen als de speler dat kiest (Ontspannen zet rij-assist en hints aan, Uitdagend zet quicktime-events op normaal); anders blijft zijn eigen keuze. Dit is ook wat Standaard exact het oude gedrag geeft. | Het niveau altijd laten winnen: Standaard zou dan de bestaande instellingen van spelers overschrijven. |
| De kaart komt bij elk nieuw spel en bij de allereerste start, niet bij Doorgaan | Wens van de eigenaar. Een bestaande save vraagt nooit iets. | Bij elke start vragen. |

## De opties

Scope: **wereld** is van wie het spel opende (zie de Samen-regel), **lokaal** is van de speler. "Ingang" zegt wanneer een wijziging werkt. De kolom "Niveaus" is Ontspannen / Standaard / Uitdagend. Het getal bij een factor is een vermenigvuldiger; `eigen` betekent de instelling van het apparaat.

| Optie | Scope | Stappen (bereik) | Niveaus | Ingang |
|---|---|---|---|---|
| Politie kwijtraken (`policeEscape`) | wereld | 0,6x, 0,8x, 1x, 1,25x, 1,5x | 0,8x / 1x / 1,25x | meteen |
| Politiemacht (`policeUnits`) | wereld | 0,5x, 0,75x, 1x, 1,25x, 1,5x | 0,75x / 1x / 1,25x | meteen |
| Verkeersdrukte (`trafficDensity`) | wereld | 0,5x, 0,75x, 1x, 1,25x | 0,75x / 1x / 1,25x | meteen |
| Schade aan je voertuig (`vehicleDamage`) | lokaal | 0,5x, 0,75x, 1x, 1,25x | 0,75x / 1x / 1,25x | meteen |
| Schade aan jezelf (`damageTaken`) | lokaal | 0,5x, 0,75x, 1x, 1,25x | 0,75x / 1x / 1,25x | meteen |
| Rij-assist (`driveAssist`) | lokaal | eigen, aan, uit | aan / eigen / eigen | meteen |
| Tegenstanders in races (`raceAi`) | lokaal | 0,9x, 0,95x, 1x, 1,05x, 1,1x | 0,95x / 1x / 1,05x | volgende start |
| Quicktime-events (`qte`) | lokaal | eigen, makkelijk, normaal, overslaan | makkelijk / eigen / normaal | meteen |
| Tijd in missies en spelletjes (`timeFactor`) | lokaal | 0,85x, 1x, 1,2x, 1,35x, 1,7x | 1,35x / 1x / 0,85x | volgende start |
| Medailles (`targetFactor`) | lokaal | 0,8x, 1x, 1,25x | 1,25x / 1x / 0,8x | volgende start |
| Tegenstander in het voetbal (`footballAi`) | lokaal | volg, ontspannen, standaard, uitdagend | volg / volg / volg | volgende start |
| Duur van een wedstrijd (`footballDuration`) | lokaal | eigen, kort, normaal | eigen / eigen / eigen | volgende start |
| Beloning van missies (`income`) | lokaal | 0,75x, 0,9x, 1x, 1,15x, 1,25x | 1,15x / 1x / 0,9x | meteen |
| Hints en tips (`hints`) | lokaal | eigen, aan, uit | aan / eigen / eigen | meteen |
| Verhaalmodus (`storyMode`) | lokaal | uit, aan | uit / uit / uit | volgende start |

### Waar elke optie in de code wordt gelezen

| Optie | Plek |
|---|---|
| `policeEscape` | `wantedlevels.js` `loseAfterOf` en `cooldownOf` (zichttijd en afkoeltijd in `stepUnseen`), `police.js` (tip), `hud_panel.js` (zoekbalk en resttijd) |
| `policeUnits` | `wantedlevels.js` `policeDensity` en `policeTarget` via `scaleUnits` (nooit minder dan één eenheid zodra er een jacht is) |
| `trafficDensity` | `main.js` (de drie populatiebeheerders, ook rond een losse groep spelers) en `streetpopulation.js` `thinTraffic` |
| `vehicleDamage` | `vehicle.js` `applyImpactDamage`, naast de bestaande Hulp (#215); de twee stapelen |
| `damageTaken` | `combat.js` `damagePlayer`, naast Hulp |
| `driveAssist` | `player.js` (`driftAssist` en `bikeAssist` van het voertuig) |
| `raceAi` | `racers.js` (rijders van straatraces en de ringweg) en `kartbaan.js` (de drie karts) |
| `qte` en `storyMode` | `qte.js` `qteStandVan`, dat alle timingstappen, de heist en de bakronde lezen |
| `timeFactor` en `targetFactor` | `difficultyFactors(mode)` in `difficulty.js`: voor het actieve niveau gelden de aanpassingen; de dertig bestaande lezers (missietijden, medailles, minigames) veranderen niet |
| `footballAi` en `footballDuration` | `voetbal.js` `freshOptions` (de carrière blijft op 90 minuten) |
| `income` | `missions.js` (de beloning, de herhaalklus en het medaillebonus) via `scaleIncome` |
| `hints` | `settings.js` (de klasse `hide-hints`), `hud_panel.js` en `prompts.js` |
| `storyMode` | ook `missions.js` (geen tijdslimiet) |

### Niet gedaan, met reden

- **Prijzen** (winkel, garage, boete): zie de balans hierboven.
- **Honger en energie**: bestaan niet in het spel (eten geeft alleen gezondheid).
- **Vechten en zwaaien**: de tegenstander in een gevecht heeft geen eigen moeilijkheid; `damageTaken` dekt wat een klap kost.
- **Automatische route**: er is één doelmarkering (een gele lijn en baken) die nooit uit kan; dat is een hulpmiddel van het spel zelf, geen optie.
- **Sterren en zoekniveau-groei** van de politie: de regels (welke overtreding hoeveel sterren geeft) blijven één verhaal; alleen hoe snel je ze kwijtraakt en hoeveel eenheden meedoen schuift.

## Veilige grenzen

Elke stap ligt binnen een vaste band: tijd 0,7 tot 2, medailles 0,7 tot 1,4, politie kwijtraken 0,5 tot 1,6, politiemacht 0,5 tot 1,5, verkeer 0,4 tot 1,5, schade 0,25 tot 1,5, racetempo 0,85 tot 1,12, beloning 0,75 tot 1,25 (en `incomeFactor()` klemt er nog een keer op). De test `difficulty_profile_test.mjs` controleert dat per optie. Een onbekende of kapotte waarde in een save wordt per optie de waarde van het niveau; een onbekend niveau wordt Standaard. **Niets blokkeert de verhaalvoortgang**: geen optie maakt een missie onmogelijk (de minste tijd is 0,85x en de strengste medaille verandert alleen de medaille, niet de voortgang), en Verhaalmodus haalt de tijdsdruk weg.

## Opslag en migratie

- Het veld heet `moeilijkheid` en staat in de savegame (`savegame.js` `serialize`): `{ "level": "uitdagend", "custom": { "income": 1.25 } }`. Het is **optioneel**: `SAVE_VERSION` is niet opgehoogd en een save zonder veld laadt zoals altijd (`profileFromSave`).
- Een bestaande save zonder veld krijgt het niveau dat het apparaat had (`legacyDifficultyLevel` in `settings.js`, in de praktijk Standaard, dus exact het oude gedrag) en geen aanpassingen. Wie op dat apparaat Uitdagend had gekozen, houdt dat dus voor zijn bestaande saves, zonder verrassing. Zodra de save wordt bewaard staat het veld erin.
- De opslagsleutels `gde-save-v1` en `gde-settings` zijn niet veranderd. `settings.difficulty` is een spiegel van het actieve niveau, geen bron: "Standaard herstellen" onder Instellingen raakt hem niet (`KEEP_ON_RESET`).
- Records en medailles blijven per niveau gescheiden (de bestaande `difficultyRecordKey`); de aanpassingen splitsen ze niet verder, anders kon een speler per optie een eigen record kweken.

## De kaart bij een nieuw spel

"Hoe pittig moet het zijn?" (de naam "Hoe wil je spelen?" is van de keuzekaart Alleen of Samen, `launchchoice.js`, en blijft daar.)

- **Wanneer**: bij elke nieuwe save (Nieuw spel in het pauzemenu en Opgeslagen spellen) en bij de allereerste start zonder save, na de keuzekaart en vóór het spel begint (`startscreen.js`, `chooseDifficulty`). Doorgaan met een bestaande save vraagt niets.
- **Wat**: drie knoppen met een korte beschrijving, voorselectie Standaard (aanbevolen) en "Aanpassen" voor de opties eronder. Een klik, Enter of 1, 2, 3 kiest en start. 4 of "Aanpassen" opent de lijst; daar verandert links en rechts een waarde, Enter gaat naar de volgende waarde, Klaar start het spel en Escape gaat terug (Escape op de eerste weergave kiest Standaard).
- **DS3**: dezelfde overlay en knoppen als de keuzekaart (`.os-overlay`, `.sk-keuze`), de toets in de knop, een zichtbare focusring, geen beweging bij Beweging beperken.
- **Controller en toetsenbord**: pure toetsregels (`levelKeyAction`, `optionsKeyAction`); een controller levert dezelfde toetsen via `input.js`, net als bij de keuzekaart. Geen muis nodig.
- **Testruns** (`--stil`, `--story-test`, `--clip`, `--benchmark`, `--autoplay`, de trailer, de smoke test en de testbank) slaan de kaart over en spelen op Standaard. `devtools.js` zet `?moeilijkheid=standaard`; `GDE_MOEILIJKHEID=vraag` toont de kaart in een beeldrun; `?moeilijkheid=uitdagend` zet een niveau zonder kaart.
- **Later**: Instellingen > Moeilijkheid (dit is ook het pauzemenu): het niveau, de drie niveaus uitgelegd, elke optie als kiezer (‹ waarde ›), "Terug naar het niveau" en de uitleg dat sommige wijzigingen pas bij de volgende missie, race of wedstrijd ingaan. Instellingen > Spelregels heeft een rij die ernaartoe verwijst.

## Samen spelen (de eenmalige regel)

- **Van wie**: de wereld (politie en verkeer: `policeEscape`, `policeUnits`, `trafficDensity`) volgt het niveau en de opties van wie het spel opende. Dat is geen hostrecht in de zin van de visie: het is de wereld van die speler, net als verhaal en missies. Een gast draait `updateGameplay` niet; politie en verkeer lopen op de computer van wie het spel opende en lezen daar zijn eigen profiel.
- **Per speler, uit de eigen save**: schade aan jezelf en aan je voertuig, rij-assist, quicktime-events, hints, tijd en medailles, de beloning van missies, het niveau van racetegenstanders en de wedstrijd in het voetbal. Een gast kiest dus zelf hoe pittig zijn eigen deel is; de wereld van een ander verandert er niet van.
- **Wat een gast ziet**: de kaart verschijnt bij een eigen nieuw spel, ook als iemand daarna meedoet; Instellingen > Moeilijkheid zegt bij elke wereldoptie dat wie het spel opende dit voor de wereld bepaalt. Een regel in de lobby of het sessiepaneel met het niveau van de wereld is **nog niet gebouwd**: dat vraagt een extra veld in het bericht van de sessie (protocol, dus een eigen besluit). Zie het vervolgwerk hieronder.
- **Beloning en voortgang**: de beloning van een missie is per speler (#429) en schaalt met de eigen inkomensfactor; een gast met Ontspannen krijgt dus meer dan de gastheer met Uitdagend uit dezelfde missie. Dat is bewust: het is zijn eigen geld, en de factor blijft binnen een kwart.
- **Wegvallen en later aansluiten**: er is niets om bij te houden; het profiel staat in de eigen save en gaat niet over het netwerk. Wisselt de gastheer (#439), dan geldt het niveau van de nieuwe gastheer voor de wereld, op zijn computer.
- **Test**: `difficulty_profile_test.mjs` (alleen politie en verkeer zijn scope "wereld"), `coopgast_test.mjs` (de regel in `GAST_REGELS`, `coopgast.js`) en de regel in [COOP-GAST.md](COOP-GAST.md).

## Prestatie

"Geen genade" (`alle_uitdagend`): speel alle acht missies uit op het niveau Uitdagend. Telt een missie zodra hij op dat niveau is afgerond (`life.missionModes.uitdagend`, het record van die stand). Staat ook in `steam/achievements.json`; de tellers (237 prestaties) staan in de Steam-documenten.

## Wat niet is gedaan en wat nog moet

- Niet in beeld bekeken: de kaart en het tabblad (geen Electron in deze ronde; de DS3-controles en de nep-DOM-test dekken de structuur, de toetsen en de tekst, niet de uitstraling). Staat als "nog niet bekeken" in #1169.
- De sessielijst en de lobby tonen het niveau van de wereld nog niet (zie Samen spelen).
- De opslagkaart in Opgeslagen spellen noemt het niveau van een save nog niet.
- De geschaalde tijdlimiet van minigames gebruikt voor het actieve niveau de eigen aanpassing van "Tijd"; een lopende minigame leest hem één keer bij de start, vandaar "volgende start".
