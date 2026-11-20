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
| Samen spelen: speler komt binnen, vertrekt, uitnodiging | alleen een melding (`ui_toast` voor tips, hier stil) | een nieuwe of vertrekkende speler en een uitnodiging klonken niet | `ui_speler_binnen` en `ui_speler_weg` (twee varianten, glas omhoog en hout omlaag) en `ui_uitnodiging` (drie klokjes), op de tekst van de melding van `coopnet.js` en `coopmeedoen.js`; lokaal, elke speler hoort ze van zijn eigen scherm | hoog |

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

### e. Missie-stings, kassa en ov-bel (bouwsteen G0c, zie [missies/BOUWSTENEN.md](missies/BOUWSTENEN.md))

Eén familie in dezelfde toonladder als de UI-taal (C-groot pentatonisch) en één motief, C-E-G-C: omhoog bij een begin of winst, omlaag in mineur bij mislukken.
Alles procedureel (`sfx/missiebank.js`), de regie en de API in `sfx/stingen.js` (`stingen.speel(naam)` en `stingen.push(world, naam)`), op de sting-bus onder de Effecten-schuif,
met de categorie `sting` van het mixplan (spraakdemping tot 60 procent), een afkoeltijd per naam en een rangorde; elke sting duurt hooguit 2,5 s.

| Gebeurtenis | Nu | Gat | Gebouwd | Prioriteit |
| --- | --- | --- | --- | --- |
| Missie gestart | een stem en een vierstemmig akkoord op de standaardbus | de opmaat naar een missie, de bank had geen sting | `missie_start` (twee varianten), automatisch bij de overgang naar active (audio.js) | midden |
| Stap voltooid | stil | een tussenstap gaf geen terugkoppeling | `missie_stap` (drie varianten), via `stingen.push(world, 'stap')` door de runner | midden |
| Bijna mislukt | de piep van de klok bij 30 en 10 s | geen sting bij argwaan of schade | `missie_bijna` (twee varianten), via de runner | laag |
| Missie mislukt | een zaagtand-trapje (`missionFail`) | past niet in de familie | `missie_mislukt`, op de melding met mislukt (ui.js); het oude geluid blijft als terugval | midden |
| Missie gelukt | `playMissionJingle` (vier tonen, hard, op de standaardbus) | overstemde en paste niet in de UI-taal | `missie_geslaagd` (twee varianten, automatisch) en `missie_geslaagd_groot` (het slot van een akte, via de runner) | midden |
| Medaille per soort | `prestatie` en `achievement` (zilver klonk als goud) | het verschil tussen brons en goud was klein | `medaille_brons`, `medaille_zilver`, `medaille_goud`: dezelfde klank in drie lengtes, voor elke minigame en uitdaging | laag |
| Cutscene begint en eindigt | stil | geen overgang | `scene_in` en `scene_uit` (licht), via de cutscene-runner | laag |
| Winkelen: iets kopen | de winkelbel bij binnengaan en `ui_uitgave` (muntjes) | geen "gekocht" bij een kassa | `winkel_kassa` (twee varianten): shops.js zet `world.kassaKlik` in `pay`, ui.js speelt hem in plaats van de muntjes | midden |
| Tram- en busbel | de busdeur sist (`bus_door_hiss`) | geen tramgeluid bij het vertrek | `tram_bel` (twee varianten) en `bus_bel`, bij het wegrijden na een halte met open deuren (linkup `ov-vertrek`); de tramrem en een bushalte-aankondiging blijven open | midden |

## Nog niet gebouwd

Open gaten (de missie-stings, de kassa en de tram- en busbel zijn gebouwd, zie e), op volgorde van hoe vaak de speler ze hoort. Het voorstel past in de bestaande bank; het wacht op een luisterronde, zodat niet nog meer
ongehoord geluid in het spel komt.

| Gebeurtenis | Nu | Gat | Voorstel | Prioriteit |
| --- | --- | --- | --- | --- |
| Voertuig over zand, grind, gras en klinkers (rollend) | alleen een bonk bij een wissel van ondergrond en `remmen_grind` op gras | de rijsound verandert niet met de ondergrond | een korte rolruis per ondergrond uit `vehiclevoices.js` (de bestaande `buildRumbleVoice`) met het toerental als niveau | hoog |
| Regen op water, op blad en op een tent | `bed_rain` en `bed_roof` | alleen regen en dak | een laag `bed_regenwater` naast `bed_lap` en regen op blad onder bomen | midden |
| Wind door bomen | `bed_wind` | geen ritselend blad | een bladlaag met `place.trees` als niveau | midden |
| Slagboom, garagedeur en rolluik | stil | parkeergarage en garagedeur openen zonder geluid | `slagboom_op` en `deur_rol` bij `parkeergarage.js` en `home.js` | laag |
| Kermis: draaimolen, reuzenrad draait, loterij | `kermis_ding` (kop van Jut), het reuzenrad in- en uitstappen | de attracties zelf draaien stil | een lus per attractie op afstand, met muziekdoos-getik | midden |
| Zwemmen, watertrappelen | de plons bij het erin vallen, natte stappen | geen slagen | `water_slag` per slag, gekoppeld aan `p.swimming` | midden |
| Klimmen op ladder of steiger | stil (klimtoren heeft eigen foley) | geen hand-voet-klank | `ladder_stap` per sport | laag |
| Telefoon: bellen, ophangen, sms-toon per afzender | `buzz` en `ping` | alles klinkt gelijk | een rinkel en een ophang-tik | laag |
| Vliegtuig overhead, havenschepen, de verre trein | helikopter, scheepshoorn en `train_pass` | geen vliegtuig | een drone-passage met Doppler uit `sky.js` | laag |
| Dieren in groep: schapen, koeien, vee langs een weg | losse roepjes op een timer | geen kudde-geblaat bij een grote groep | roepfrequentie naar groepsgrootte | laag |
| Stad: scooter, brommer, fietsketting en bel per type | fietsbel, ketting, scooterlus | gelijk voor alle fietsen | per type een kleine afwijking | laag |

## Beperkingen van deze ronde

- **Rolgeluid per ondergrond niet gebouwd (G0c).** Het blijft de eerste open rij: het raakt de voertuigmixer (`vehiclevoices.js`, de motor- en rolstemmen) en is niet klein en veilig genoeg om zonder luisterronde bij te zetten.
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
`node scripts/sfx_stingen_test.mjs` doet hetzelfde voor de missie-stings, de kassa en de ov-bel (plus toonladder, rangorde, afkoeltijd, spraakdemping en stemmen).
`sfx_test.mjs`, `sfx_audit_test.mjs` en `sfx_linkups_test.mjs` nemen ze mee via `FX_INFO` en `SELF_PUSHED`.

## SFX ronde 3 (#988): opnames in de plaats van synth

Van Freesound (CC0 en CC-BY, ADR 0039; bronnen in [AUDIO-LICENTIES.md](AUDIO-LICENTIES.md)), bewerkt met `scripts/audio/master_sfx_ronde3.mjs`. De koppeling loopt via `FX_VERVANG` in `sfx/samples.js`:
`playFx` (audio.js) en `uiFx` (sfx/ui.js) nemen een geladen opname in plaats van het synthgeluid, zonder opname blijft de synth. Gekoppeld: winkelkassa, winkelbel, houten deuren en huisdeur dicht,
grote plons, scheepshoorn, fototoestel, alarm, vuurwerkbom, remmende trein, treinhoorn, tram- en busbel, busdeur; dieren (koe, schaap, paard, eend, meeuw; overdag, 's nachts zwijgen ze meestal);
lussen: golfjes langs de oever, menigtegemurmel, kikkers in de zomernacht, de kermis op de Grote Markt, de stad in de nacht en de kamertoon in de flat; een dieselmotor onder de synth van trekker en bus; de menuklik.

Nog open (geen geschikte opname gevonden of geen koppelpunt): treinritme over de rails en optrekken, omroepbel in het station, halteknop, richtingaanwijzer, zwemslagen, ploegen en zaaien en de maaidorser,
politiesirene met doppler (de procedurele blijft), kantoor en kroeg binnen (het spel kent alleen de flat als binnenruimte), applaus en gejuich van het publiek, draaiorgel, UI-fout en -hover.
Niets is beluisterd: zie [SFX-LUISTERLIJST.md](SFX-LUISTERLIJST.md).
