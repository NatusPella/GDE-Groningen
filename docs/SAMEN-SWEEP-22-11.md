# Samen-sweep 22-11: alles moet ook werken in Samen spelen

Werkdocument en draaiboek. Eigenaarseis (22-11): alles wat sinds v0.64.0 is bijgekomen of veranderd moet ook in Samen spelen werken. De bron is de sectie `sweep22` in `scripts/coop_coverage.json`; `node scripts/coop_sweep_audit.mjs` keurt haar (naast `scripts/coop_coverage_audit.mjs`, de matrix in [COOP-DEKKING-21-11.md](COOP-DEKKING-21-11.md)). Per systeem staan de Samen-vragen uit AGENTS.md in de matrix: van wie is het, doet een gast mee, wat ziet een gast, wie krijgt beloning en voortgang (per speler, #429), wat bij wegvallen of later aansluiten, en welke test dekt het.

Dit is gedaan zonder Electron: pure tests, tests met een geheugenverbinding en DOM-mocks. De agent heeft niets in beeld bekeken. Alles onder "Alleen met echte vensters" hieronder is nog niet bewezen.

## Wat de sweep vond en herstelde

- Voertuigradio: de pure regel bestond, maar het bericht ontbrak. Nu: bericht `zender` (`radiogroep.js`, `coopnet.js`, haak in `radio.js`), test `scripts/radiogroep_test.mjs`.
- Hostwissel midden in een wedstrijd: overdragen wachtte alleen op een filmpje. Nu wacht het ook op een lopende race, wedstrijd of score; de eigen bijbaan van de oude host stopt met een melding (`scripts/coop/hostwissel_test.mjs`).
- Kaartontdekking: de melding "nieuw gebied" kon samenvallen met het laadscherm. Nu wacht ze tot het scherm weg is (`laadwacht.js`, `scripts/laadwacht_test.mjs`).
- Matrix: vijf systemen stonden als gat met verouderde tekst (overgangsscenes, tuning, pings waren al gebouwd en getest). Nieuwe status `deels` voor wat alleen met vensters te bewijzen is (Bezit, voetbalcarriere).
- 19 nieuwe modules zonder systeem (onder meer `airguide`, `airprofile`, `sailline`, `districtat`) en `karakterbonus` staan nu in de matrix; `nietCoopRelevant` heeft een reden per bestand.

## Systemen en controles

Systemen (sleutels uit `sweep22.systemen`): `verhaalstappen`, `bezit`, `voetbal`, `kleding`, `tuning`, `interieurs`, `bijbanen`, `radio`, `luchtroute`, `kaartontdekking`, `weer`, `wereldleven`, `toegankelijkheid`, `loopbaan`, `prestaties`, `spullen`, `zinnen`, `oudesaves`, `moeilijkheid`, `cutscenewarm`, `berovingen`, `ov`.

Expliciete controles (`sweep22.controles`) en waar ze gekeurd worden:

| Controle | Bewijs zonder Electron |
|---|---|
| `gast-eigen-verhaal` | `coopverhaal_test` (eigen stand, spoilerbevestiging, sprong), `samen_sweep_test` (de host houdt zijn opdrachtstand en geld) |
| `hostwissel-bijbaan-wedstrijd-film` | `coop/hostwissel_test`: filmpje en wedstrijd weigeren de overdracht, bijbaan stopt met melding; overname bij wegvallen met bijbaan van de groep |
| `late-aansluiter` | `bezitnet_test` (aansluiten), `samen_sweep_test` (late gast leest de outfit van wie er al was); tuning van een bezorgd voertuig in `coopbezit_test` |
| `lokale-radio-luchtroute` | zender per apparaat (`gde-radio-zender`), luchtroute stuurt niets, alleen de keuze van de bestuurder gaat het net op |
| `zinnen-dempen-blokkeren` | `multiplayerphrases_test`, `samen_sweep_test` (geblokkeerd: zin, ping, doel en zender verdwijnen; gedempt hoort nog) |
| `geen-ip` | `samen_sweep_test`: spelerslijst, welkom, snapshot, spelersrijen en meldingen bevatten geen adres |
| `rate-limits` | `samen_sweep_test` (ping, zin, doel), `radiogroep_test` (zender), `bezitnet_test` (token bucket) |
| `groepsvoertuig` | `radiogroep_test` en `multiplayergoal_test`: de bestuurder kiest radio en doel, de navigator deelt met de bestuurder |

## Alleen met echte vensters (voor de 3-instantie-run van de coordinator)

Draai met `node scripts/coop/testbank.mjs --stage=<stage> --suite=alles --gasten=2` (host plus twee gasten, route direct). De volgorde en de verwachte uitkomst:

1. `alles/zinnen` (`allesstap zinnen`, opt-in): gast zegt "Dank je!". Verwacht: host en gast 2 zien de regel, de gast zelf niet.
2. `alles/tuning`: het tuning-veld van het bezorgbericht bestaat. Verwacht: `bezorgVeld` true, geen `skip`.
3. `alles/bezit`: host en gast kopen verschillend; de keuring staat in `bezitstap_check.mjs`. Verwacht: elkaars percelen als omtrek, geld per speler.
4. `alles/latejoin`: laat een derde gast pas na stap 3 aansluiten (de suite `net` laat een headless gast later binnenkomen, `mockLate` in de testbank; voor echte vensters moet de coordinator de derde instantie later starten). Verwacht: de late gast ziet de percelen en de outfitcodes in de spelerslijst. Een late echte gast met tuning in beeld is nog niet bewezen.
5. `alles/radio` (`allesstap radio`, laatste stap voor de opslagcheck): is niemand in een voertuig, dan logt elk venster `zit false` en slaagt hij leeg. Voor het echte bewijs: draai eerst `--suite=meerijden` (host rijdt, gast zit mee) en laat tijdens de rit de bestuurder een zender kiezen (menu of Shift+N). Verwacht: de bijrijder krijgt "zet Wierde Radio op" en speelt die zender; uitgestapt komt zijn eigen zender terug.
6. `filmpjewissel` (route kamer): hostwissel tijdens een filmpje. Verwacht: de overdracht wacht tot het filmpje voorbij is.
7. `overdracht` (route kamer): hostwissel tijdens een bijbaan van een gast. Verwacht: de baan stopt met "De bijbaan is gestopt, want het spel wisselt van speler", geld ongewijzigd.
8. `wedstrijd/voetbal-gast` (`--suite=wedstrijd`): een gast doet mee aan de voetbalwedstrijd. Verwacht: ratings van de gast geklemd, beloning per speler, geen competitiepunten.

Daarnaast nog niet in beeld bekeken: de melding van een nieuw gebied na het laadscherm, het meewerken van een gast op andermans perceel met een echte trekker, het afspelen van de radio in het voertuig, en de luchtroute-HUD naast een tweede speler.

## Besluiten van deze ronde (conservatief, geen vraag aan de eigenaar)

- Het zender-bericht is een klein JSON-bericht naast `doel` en `zin`; PROTO blijft 2. Kiezen als passagier is stemmen; een aparte stemknop bestaat niet.
- De host begrenst de zender per afzender (1,5 s) en de ontvanger telt een geblokkeerde speler niet mee; de zinnen blijven een opt-in.
