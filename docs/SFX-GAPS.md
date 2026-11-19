# SFX-gaten: wat de wereld nog niet laat horen

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); dit document is de inventaris en de bouwlijst. Bij verschil wint de spec (en bij twijfel `AGENTS.md`).

De vraag van de eigenaar was: "Kan je meer SFX toevoegen?" Dit document zet de spelgebeurtenissen af tegen wat het spel nu speelt
(`game/js/audio.js`, `game/js/sfx/`, de CC0-opnames van [GELUID.md](GELUID.md)) en zegt welke gaten zijn dichtgemaakt en welke nog open staan.

**Hoe dit is gemaakt, en wat niet.** De inventaris komt uit de code: de `case`-regels van `playAudioEvents`, `FX_INFO`, `LINK_RULES`, `SELF_PUSHED`,
de ambience-lagen, de foley en de mixplan-tabel, aangevuld met een zoekopdracht naar gebeurtenissen die geen `pushAudioEvent` hebben.
Niemand heeft het gehoord: alle geluiden zijn getest op rekenen (geen NaN, onder de piek, eindige duur, deterministisch, aantal stemmen),
niet op klinken. De [luisterlijst](SFX-LUISTERLIJST.md) zegt wat een mens moet beluisteren.

**Prioriteit** is hoe vaak een speler het hoort in een uur spelen: **hoog** is meerdere keren per minuut, **midden** een paar keer per uur,
**laag** af en toe of in één minigame.

## Gebouwd

Alles hieronder is procedureel (de bouwstenen van `sfx/dsp.js`), zonder opname en zonder dienst buiten het spel. De namen staan in de bank
(`sfx/uibank.js`, `sfx/worldbank.js`, geregistreerd in `sfx/fxbank.js`); een geluid met meer dan één klank heeft varianten `_0`, `_1`, enzovoort.

### a. UI-geluidstaal (rustig, C-groot pentatonisch rond C5, op de UI-bus)

| Gebeurtenis | Nu | Gat | Gebouwd | Prioriteit |
| --- | --- | --- | --- | --- |
| Tab van een menu wisselen | dezelfde bevestigingsklank als elke knop | een tabwissel was niet te onderscheiden van kiezen | `ui_tab` (vier varianten); `menunav.js` geeft de tab een eigen geluid | hoog |
| Weigeren ("Te weinig geld", "Kan niet") | stil | een geweigerde aankoop of handeling gaf geen terugkoppeling | `ui_weiger` (drie varianten), op de tekst van de melding | hoog |
| Melding (tip, missie, reis) | stil, op de geldmelding na | een melding verscheen zonder geluid | `ui_toast` (vier varianten), de zachtste van de set, een geluid per 1,2 s | hoog |
| Geld uitgeven | stil (alleen geld erbij had een kassa) | winkelen, eten en boetes klonken niet | `ui_uitgave` (vier varianten), bij een daling van 2 euro of meer, niet in pauze of respawn | hoog |
| Kaart open | het uitvouwen van de telefoon | de kaart zelf had geen geluid | `ui_kaart_open`, vlak na het openen | midden |
| Kaart dicht | het inklappen van de telefoon | idem | `ui_kaart_dicht` | midden |
| Waarschuwing (politie, gevaar) | de stings voor wanted en wegversperring | een gewone waarschuwingsmelding was stil | `ui_gevaar` (drie varianten) | midden |

### b. Beloning en voortgang

| Gebeurtenis | Nu | Gat | Gebouwd | Prioriteit |
| --- | --- | --- | --- | --- |
| Nieuwe streek verkend, nieuwe vissoort | alleen een kaartje | geen beloningsgeluid | `ui_ontdek` (drie klokjes omhoog) | midden |
| Uitkijkpunt gebruikt | alleen een kaartje | een mooi moment zonder geluid | `ui_uitkijk` (uitwaaierend akkoord met een zucht lucht) | laag |
| Verzamelen (dieren, kust, provincie) | alleen een kaartje | geen pingel bij een nieuw exemplaar | `ui_verzameld` (vier snelle pingels) | midden |
| Loopbaan: een niveau omhoog | alleen een kaartje | het langste beloningsmoment van het spel was stil | `ui_loopbaan` (trapje en slotakkoord) | midden |

De meldingsgeluiden stapelen niet: een lichter geluid blijft weg als er een half seconde eerder een gelijk of zwaarder meldingsgeluid klonk
(`sfx/uitaal.js`). Een melding krijgt zijn geluid op de soort en de kop die `world.addMessage` meegeeft (`kind`, `kicker`); `world.js` bewaart die nu.

### c. Wereld-foley

| Gebeurtenis | Nu | Gat | Gebouwd | Prioriteit |
| --- | --- | --- | --- | --- |
| Hengel uitwerpen | de algemene `splash` | geen lijn door de lucht | `hengel_uitwerp` (drie varianten) | midden |
| Beet | stil | de belangrijkste seconde van het hengelen had geen geluid | `hengel_beet` (drie varianten), met ondertitel "er zit een vis aan" | midden |
| Vis binnenhalen | stil | geen spartelende vis | `hengel_vangst` (drie varianten) | midden |
| Vis ontsnapt of te vroeg gehaald | stil | geen terugkoppeling bij mislukken | `hengel_los` (twee varianten), met ondertitel "de lijn schiet los" | midden |
| Uit het water klimmen | plons bij het erin vallen, niets bij het eruit komen | de helft van de zwemhandeling | `water_uit` (drie varianten), alleen bij een echte klim (geen teleport, geen respawn) | midden |
| Een hapje of drankje bij de horeca | alleen een melding | eten klonk niet | `horeca_hap` (drie varianten) | laag |

### d. Omgeving per streek

Het spel had stad, wind, regen, dak, menigte, terras, krekels en water. Wat ontbrak is de streek: de polder klonk als de stad zonder verkeer.
`sfx/streekklank.js` (puur) kiest uit de plek (zee, kust binnen 150 m, de streek van `regioleven.js`, platteland, loodsen binnen 50 m) welke laag klinkt:

| Streek of plek | Nu | Gat | Gebouwd | Prioriteit |
| --- | --- | --- | --- | --- |
| Waddenzee, Noordzee, Eems, Dollard, kust en dijk | meeuwen, wind, water langs de rand | geen branding | `bed_kust` (golven met sissende uitloop) | midden |
| Open polder (Hogeland, Hunsingo, Oldambt, Veenkoloniën, Westerwolde, Westerkwartier) | wind en vogels, zonder eigen laag | de weidsheid | `bed_polder` (wind door gras, een verre veldvogel) | hoog |
| Riet en sloten (vooral Lauwerskust) | `bed_lap` bij open water | geen riet | `bed_riet` (ruisend riet, zacht klotsen) | laag |
| Industrie (Eemshaven, Delfzijl, bedrijventerreinen) | de stadslaag | geen fabrieksklank | `bed_industrie` (50 Hz-brom, ver gekletter, stoomstoot) | laag |

De lagen volgen de bestaande regels van `ambience.js`: kruisend in en uit, zachter in een afgesloten voertuig, in de pauze en bij regen.

## Nog niet gebouwd

Open gaten, op volgorde van hoe vaak de speler ze hoort. Het voorstel past in de bestaande bank; het wacht op een luisterronde, zodat niet nog meer
ongehoord geluid in het spel komt.

| Gebeurtenis | Nu | Gat | Voorstel | Prioriteit |
| --- | --- | --- | --- | --- |
| Voertuig over zand, grind, gras en klinkers (rollend) | alleen een bonk bij een wissel van ondergrond en `remmen_grind` op gras | de rijsound verandert niet met de ondergrond | een korte rolruis per ondergrond uit `vehiclevoices.js` (de bestaande `buildRumbleVoice`) met het toerental als niveau | hoog |
| Regen op water, op blad en op een tent | `bed_rain` en `bed_roof` | alleen regen en dak | een laag `bed_regenwater` naast `bed_lap` en regen op blad onder bomen | midden |
| Wind door bomen | `bed_wind` | geen ritselend blad | een bladlaag met `place.trees` als niveau | midden |
| Tram- en busbel, tramrem, bushalte-aankondiging | de busdeur sist (`bus_door_hiss`), lucht remt | geen tramgeluid | een tramtik en een bel bij vertrek, aan `isTram` hangen | midden |
| Slagboom, garagedeur en rolluik | stil | parkeergarage en garagedeur openen zonder geluid | `slagboom_op` en `deur_rol` bij `parkeergarage.js` en `home.js` | laag |
| Kermis: draaimolen, reuzenrad draait, loterij | `kermis_ding` (kop van Jut), het reuzenrad in- en uitstappen | de attracties zelf draaien stil | een lus per attractie op afstand, met muziekdoos-getik | midden |
| Zwemmen, watertrappelen | de plons bij het erin vallen, natte stappen | geen slagen | `water_slag` per slag, gekoppeld aan `p.swimming` | midden |
| Klimmen op ladder of steiger | stil (klimtoren heeft eigen foley) | geen hand-voet-klank | `ladder_stap` per sport | laag |
| Missie gestart | een stem, geen eigen sting | de opmaat naar een missie | een korte `ui_missie_start` uit de stings | midden |
| Missie gelukt | `playMissionJingle` (vier tonen, hard, op de standaardbus) | past niet in de UI-taal en overstemt | de jingle in dezelfde toonladder op de sting-bus | midden |
| Medaille per soort (brons, zilver, goud) | `prestatie` en `achievement` | het verschil tussen brons en goud is klein | drie lengtes van dezelfde klank | laag |
| Winkelen: iets kopen of verkopen | de winkelbel bij binnengaan, nu ook `ui_uitgave` | geen "gekocht" bij een kassa | een kassa-klik per aankoop in `shops.js` | midden |
| Telefoon: bellen, ophangen, sms-toon per afzender | `buzz` en `ping` | alles klinkt gelijk | een rinkel en een ophang-tik | laag |
| Vliegtuig overhead, havenschepen, de verre trein | helikopter, scheepshoorn en `train_pass` | geen vliegtuig | een drone-passage met Doppler uit `sky.js` | laag |
| Dieren in groep: schapen, koeien, vee langs een weg | losse roepjes op een timer | geen kudde-geblaat bij een grote groep | roepfrequentie naar groepsgrootte | laag |
| Stad: scooter, brommer, fietsketting en bel per type | fietsbel, ketting, scooterlus | gelijk voor alle fietsen | per type een kleine afwijking | laag |

## Beperkingen van deze ronde

- **Niet gehoord.** Alles is gerekend en getest, niets is beluisterd. De volgorde van de gaten is een schatting op de code, geen gemeten luisterervaring.
- **Geen aparte "verminderd geluid"-stand.** De instellingen kennen alleen de vier schuiven (Hoofd, Muziek, Effecten, Stemmen) en de dempknop; de nieuwe
  geluiden vallen onder Effecten en de dempknop (UI op de UI-bus, wereld op de wereldbus). Een eigen "rustig"-stand bestaat niet.
- **Ondertitels.** Alleen geluiden met betekenis kregen een ondertitelsoort: een beet, een losgeschoten lijn en iemand die uit het water klimt.
  De UI-geluiden hebben er geen nodig: ze horen bij een tekst die al op het scherm staat.
- **Samen spelen.** UI-geluiden zijn lokaal (iedereen hoort die van zijn eigen scherm). Hengelen, uit het water klimmen en een hapje zijn
  `fx`-gebeurtenissen op de plek van de speler en gaan door dezelfde wereldrij (`world.audioEvents`) als de rest. Of een gast ze hoort hangt af van de bestaande doorgave van audiogebeurtenissen; dat is niet apart getest.
  De streeklagen horen bij de luisteraar, dus bij ieder zijn eigen plek.

## Tests

`node scripts/sfx_uitaal_test.mjs` rendert elk nieuw geluid twee keer en vergelijkt (zaad), controleert NaN en Infinity, de piek, de duur, de
varianten en de gelijkmatigheid van de lagen; draait `ui.js` met een nagemaakte kit (juiste melding, juist geluid, afkoeltijd, stil, pauze,
aantal gelijktijdige stemmen in een scenario van twee minuten); test de streekregels en eist dat elk nieuw geluid hier genoemd wordt.
`sfx_test.mjs`, `sfx_audit_test.mjs` en `sfx_linkups_test.mjs` nemen ze mee via `FX_INFO` en `SELF_PUSHED`.
