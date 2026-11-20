# Luisterlijst voor de nieuwe geluiden (SFX-GAPS)

Voor de eigenaar of een playtester. De nieuwe geluiden zijn **niet beluisterd**: de tests rekenen ze door (zaad, geen NaN, onder de piek, eindige duur,
aantal stemmen), maar of ze goed klinken weet nog niemand. Deze lijst zegt wat je kunt beluisteren, waar je het in het spel oproept en wat niet goed mag klinken.
Staat er iets niet goed op, meld het in het audio-issue met de naam van het geluid (de naam in de eerste kolom) en een woord als "te hard", "te schel" of "herhaalt".

**Snelste route.** Start het spel met `?sfxtest` achter het adres van de webversie en druk op F8: het paneel Geluidstest toont onder **Menu** alle
UI-geluiden, onder **Water**, **Winkel** en **Deuren** de wereldgeluiden, met een afstands- en richtingsschuif. Dat is dezelfde weg als in het spel (afstand, luchtfilter, dempen bij een stem).
De omgevingslagen staan niet in het paneel: die hoor je alleen op de plek zelf (onderaan).

**Algemeen, voor elk geluid:** niet pijnlijk bij een hoofdtelefoon op een gewoon volume; geen klik of knal aan het begin of eind; de Effecten-schuif in
Instellingen > Geluid maakt ze zachter en op nul zwijgen ze; de dempknop zet ze uit; een stem die praat dempt de wereldgeluiden (de UI-geluiden niet, die zijn kort).

## Menu en beloning (UI-bus)

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `ui_tab` | pauzemenu of telefoon: klik op een tab (Spel, Overzicht, Spullen) | twee zachte houten tikjes | een bevestigingstoon (dat is de klank van een knop); rommelig bij snel wisselen |
| `ui_weiger` | een winkel of activiteit met te weinig geld (bijvoorbeeld tennis of een hapje zonder geld) | twee lage dofe tonen omlaag: "nee" | schel, boos of lang |
| `ui_toast` | een tip of missiemelding bovenin | één glazen tikje, bijna niet te horen | opdringerig; meer dan eens per twee seconden |
| `ui_uitgave` | geld uitgeven: winkel, hapje, boete | twee muntjes die op elkaar vallen | verward met de kassa bij geld erbij (dat is een ander geluid) |
| `ui_kaart_open`, `ui_kaart_dicht` | de minikaart aanklikken of de kaart in het pauzemenu: open en weer dicht | papier dat opengevouwen en dichtgevouwen wordt | ruis die blijft hangen; samen met het inklappen van de telefoon een rommeltje |
| `ui_gevaar` | een politie- of gevaarmelding (bijvoorbeeld een brommerwaarschuwing) | twee zachte lage pulsen | een sirene; schrikken |
| `ui_speler_binnen`, `ui_speler_weg`, `ui_uitnodiging` | Samen spelen: een speler doet mee, vertrekt of valt weg; een uitnodiging voor een opdracht | twee klokjes omhoog, twee houten tonen omlaag, drie klokjes als een vraag | harder dan de missiesting; verward met `ui_toast` |
| `ui_ontdek` | een nieuwe streek verkennen of een nieuwe vissoort vangen | drie klokjes omhoog | te lang of te vrolijk voor een kleine vondst |
| `ui_uitkijk` | E bij een uitkijkpunt (te voet) | een wijd uitwaaierend akkoord met wat lucht | langer dan twee seconden; een metalen na-ring |
| `ui_verzameld` | een verzamelobject in Verzamelen | vier snelle pingeltjes omhoog | piepjes die op een alarm lijken |
| `ui_loopbaan` | een loopbaanniveau omhoog (een bijbaan doen tot de trap) | een trapje en een vol slotakkoord, het blijste geluid van de set | harder dan de prestatiesting; botst met de radio |

Letten op de rij: meldingen stapelen niet (een lichtere melding blijft weg als er net een zwaardere klonk); bij veel meldingen na elkaar hoor je dus minder dan je ziet.

## Missie-stings en ov (sting-bus en wereld)

De stings zijn één familie in dezelfde toonladder als de UI-geluiden (C-groot pentatonisch) met één motief, C-E-G-C. Snelste route: `?sfxtest`, F8, groep **Stings**, of
`node scripts/qa/bouwsteen_stings_beeld.mjs` (Electron, speelt ze achter elkaar af en meet het niveau). Let er vooral op of ze als één familie klinken, niet harder zijn dan een stem en
of een stem eroverheen verstaanbaar blijft (een sting wordt dan tot 60 procent gedempt).

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `missie_start` | een missie begint (de gele cirkel in, of een missie via de telefoon) | een lage grondtoon, het motief omhoog, een hangende klok: "daar gaan we" | te plechtig of te lang; harder dan de stem van het gesprek |
| `missie_stap` | een tussenstap van een missie voltooid (zodra de runner-haak er is) | twee zachte noten omhoog | opdringerig bij snelle stappen; botst met de stem |
| `missie_bijna` | bijna mislukt (zodra de runner-haak er is) | drie korte pulsen met een spanningsnoot | een sirene of alarm; schrikken |
| `missie_mislukt` | een missie mislukt (de melding "mislukt") | het motief omlaag in mineur, teleurgesteld | treurig of straffend; hetzelfde als het oude zaagtandje |
| `missie_geslaagd` | een missie gelukt (de melding "geklaard!") | een snelle trap en een slotakkoord | harder dan de prestatiesting (#840); verwant aan `ui_loopbaan` zonder erop te lijken |
| `missie_geslaagd_groot` | het slot van een akte (zodra de runner-haak er is) | breed akkoord met lage grondtoon en een sprankeling | langer dan twee en een halve seconde; metalen na-ring |
| `medaille_brons`, `medaille_zilver`, `medaille_goud` | een medaille bij een minigame of uitdaging (discgolf, skatepark, klimtoren, kart) | dezelfde klank in drie lengtes; goud het langste en het blijste | brons en zilver niet te onderscheiden; goud te schel |
| `scene_in`, `scene_uit` | begin en einde van een cutscene (zodra de cutscene-runner ze aanroept) | een zacht aanzwellend en een uitdovend akkoord | opvallender dan de scène zelf |
| `winkel_kassa` | iets kopen in een winkel (het geld daalt) | klik, lade en een bel: een vriendelijke kassa | te lang; samen met de muntjes van een boete te verwarren |
| `tram_bel`, `bus_bel` | een tram of bus rijdt na een halte met open deuren weg, dichtbij | twee heldere tikken (tram), een zacht ding-dong (bus) | bij elke bus in het verkeer; een fietsbel |

## Wereld (`fx`-gebeurtenissen op de plek)

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `hengel_uitwerp` | hengelen aan een gracht, vijver of haven: Spatie om uit te werpen | een zingende lijn en een plopje met kringen | de vroegere plons; te hard bij een rustige plek |
| `hengel_beet` | hetzelfde, als "BEET!" in beeld komt | twee korte tikken: het dobbertje gaat onder | niet te onderscheiden van het uitwerpen; geen haast uitstralen |
| `hengel_vangst` | een vis binnenhalen | natte klappen en spetters, een spartelende vis | te lang of te vet |
| `hengel_los` | te vroeg gehaald of de vis ontsnapt | een lijn die losschiet en een kleine plons | klinkt als een beet |
| `water_uit` | zwem naar een kade of oever en klim eruit | een natte zwaai, druppels, een klap op de kant | klinkt bij een teleport of respawn (dat mag niet); te lang |
| `horeca_hap` | E bij een horecapunt met geld op zak | een hap, een slik en een klein klinkje | vies of komisch; vet |

## Omgeving per streek (lagen: zoek de plek, wacht een paar seconden)

De lagen komen langzaam in (ongeveer twee seconden) en zijn er altijd zacht onder; het is geslaagd als je ze pas mist als je weggaat.

| Laag | Waar | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `bed_kust` | op de Waddenzee, de Eems of de Dollard, of op een dijk of strand aan de kust (Eemshaven, Lauwerskust, Hogeland aan de dijk) | brekende golven met sissende uitloop, wat wind | een ruisband die niet op golven lijkt; hoorbaar op een plek zonder zee binnen 150 meter |
| `bed_polder` | open land buiten de dorpen: Hogeland, Hunsingo, Oldambt, Veenkoloniën, Westerwolde, Westerkwartier | wind door gras, een verre veldvogel af en toe | een fluitende ruis; de vogel die elke tien seconden hetzelfde zegt (de lus is tien seconden) |
| `bed_riet` | langs een sloot of maar buiten de dorpen, vooral Lauwerskust | ruisend riet en zacht klotsen | scherp; te duidelijk aanwezig midden in een veld |
| `bed_industrie` | tussen loodsen en fabrieken: Eemshaven, Delfzijl, bedrijventerreinen | een lage brom, ver gekletter, af en toe stoom | een toon die doordringt; hoorbaar in een woonwijk |

In een afgesloten voertuig (auto, bus) zijn de lagen zachter; bij regen wijkt vooral de polder en de kust. Controleer ook of de lagen elkaar niet vechten op de overgang
(dijk naar polder, dorp naar industrie): er hoort een zachte overgang te zijn, geen sprong.

## Wat een mens verder kan vragen

- Klinken `ui_tab` en `ui_toast` samen met de bestaande knoppen en de tik bij het wisselen van de focus (de bestaande set) als één familie?
- Is de volgorde van prioriteit in [SFX-GAPS.md](SFX-GAPS.md) de goede, vooral de open rij "voertuig over zand, grind, gras en klinkers"?
- Past `ui_loopbaan` bij de prestatiesting (`#840`) of is hij te dichtbij zodat ze elkaar op dezelfde dag verstoren?

## Voertuigen met opnames (helikopter, vliegtuig, motorboot; zie [AUDIO-VOERTUIGEN.md](AUDIO-VOERTUIGEN.md))

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `heli_rotor_stat`, `heli_rotor_vlucht` | instappen in een helikopter (Rotor Roelf op Eelde) en opstijgen, vliegen, dalen, landen en uitstappen | de rotor loopt hoorbaar op en na de landing weer uit; hoger toerental is hoger; bij snelheid en dalen krijgt de wop-wop meer slag; binnen dof | een hoorbare herhaling elke 6 s; toonhoogte die schokt bij het opstarten; te hard bij het dorp eronder |
| `vliegtuig_start` | instappen in de Kist Kees op het grasveld | starter en aanslaan, dan valt de motor in; geen gat tussen start en stationair | de motor die al meeloopt tijdens de start; een klik bij het inzetten |
| `vliegtuig_stationair`, `vliegtuig_toeren` | gas geven op de baan en vliegen | zachtjes kruisen van lage naar hoge toeren, toonhoogte volgt het gas | een hoorbare sprong bij de kruising; de lus die hoorbaar herhaalt; te schel op hoge toeren |
| `vliegtuig_wind` | snelheid boven 40 km/u | stromende lucht die met de snelheid groeit | te luid boven de motor; ruis die pompt |
| `vliegtuig_rol_asfalt`, `vliegtuig_rol_gras` | optrekken en uitrollen op de baan | rollende wielen die luider en hoger worden met de snelheid, op een grasbaan ruiger | klinkt nog als de baan in de lucht; te hard bij stapvoets |
| `vliegtuig_overtrek` | te langzaam vliegen (de melding Overtrek) | een zoemer vlak voor en tijdens de overtrek | blijft hangen nadat je gas hebt gegeven; te schel |
| `vliegtuig_gestel` | G in de lucht | één mechanische klank per wissel | klinkt ook op de grond; dubbel |
| `boot_motor_stat`, `boot_motor_vol` | een motorboot in de haven of op het water | stationair gaat zacht over in vol gas op snelheid | de oude synth die er nog bij klinkt; te hard tegen het water |


## Voetstappen, weer, zomer en autolussen met opnames (zie [AUDIO-STAPPEN-WEER.md](AUDIO-STAPPEN-WEER.md))

Alles hieronder is gemeten (niveau, naad, clipping), niets is beluisterd: de bronnen en de knipvensters zijn gekozen op meting. Luisteren is aan de eigenaar.

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `stap_klinkers_*`, `stap_asfalt_*`, `stap_ren_*` | lopen en rennen op stoep, plein en weg | zes stappen op steen of asfalt, geen klik, rennen met korter ritme | een stap die halverwege wordt afgekapt; een andere schoen bij rennen dan bij lopen; te hard onder muziek of stemmen |
| `stap_gras_*`, `stap_grind_*`, `stap_zand_*` | park, weide, erf van een boer | zacht en dof op gras, knarsend op grind | `stap_zand_*` (een opname zonder ondergrond in de titel en een zandopname) kan ook op grind of aarde lijken; de staart van `stap_gras_5` is kort |
| `stap_wood_*` | houten bruggen | holle plank | de bron is een kettingbrug: rinkelt er ketting mee? |
| `stap_metaal_*` | autodak, trap, rooster | scherp metaal | te schel of dubbel |
| `stap_wet_*` | plassen en water | gespetter | te hard of te lang (0,35 tot 0,42 s) |
| `stap_binnen_*` | in de flat | dof, kamerachtig | klinkt als buiten |
| links en rechts, afstand | lopen in een menigte | voeten wisselen, een menigte klinkt niet gelijk en dof op afstand | een ritme dat in de maat loopt; een menigte die te hard of te druk klinkt |
| `regen_motregen`, `regen_bui`, `regen_plens` | tijdens het weer, kruisend op de intensiteit | zachte kruisfade, geen sprong in toon; de plensbui is de hardste | een hoorbare herhaling elke 12 tot 14 s; te scherp of schurend (`regen_plens` is begrensd op de piek); regen die luider is dan een gesprek |
| `regen_dak`, `regen_auto` | in de flat, in een gesloten auto | gedempt van binnen, geen pomp of sprong | `regen_auto` heeft de grootste naadstap (2,8 dB): hoor je de lus? |
| `wind_gras` | open land, polder, onweer | steady suizen door gras | pompen; klinkt als ruis in plaats van wind |
| `donder_dichtbij_*`, `donder_ver_*` | onweer, na de flits | klap met rommel dichtbij, gerommel ver weg, vertraagd met de afstand | te hard; dichtbij zonder flits; de duur (8 tot 12 s) botst met een volgende flits |
| `zomer_vogels`, `zomer_stadsvogels`, `zomer_insecten` | droge dagen in het groen, in de stad, op de weide | zacht op de achtergrond, geen herhaling die opvalt | de lus van 30 s of 18 s herhaalt hoorbaar; een vogel die niet in Nederland past; te luid bij een gesprek |
| `band_drift` | een lange slide (slip boven 0,62) | schurende band die met de slip stijgt en meezakt | een klik bij het in- en uitvaden; dubbel met de bandenpiep; stampend |
| `motor_auto_stationair` | personenauto op stationair en lage toeren | extra lichaam onder de synth, zakt weg bij opschroeven | klinkt als een tweede motor naast de synth (zet `ENGINE_LAYER_ON` uit in `audio.js`) |

## SFX ronde 3: opnames in de plaats van synth (#988)

Gekozen op titel, duur, niveau en spectrum (`scripts/audio/sfx_analyse.mjs`), **niet beluisterd**. Elke rij vervangt het synthgeluid zodra de opname geladen is
(`FX_VERVANG` in `sfx/samples.js`); klinkt het slechter dan de synth, haal de sleutel uit `FX_VERVANG` en de synth neemt het weer over.

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `kassa_koop` | iets kopen in een winkel | een heldere ka-ching van een kassa | te lang of te schel; klinkt als een spelletje |
| `winkelbel_deur` | een winkel binnengaan | deurbel boven de deur | te zacht; een tweede bel erachteraan |
| `deur_hout_open_op`, `deur_hout_dicht_op`, `deur_huis_dicht_op` | houten deuren en huisdeuren | piepend open, droog dicht | een deur die klinkt als een poort; dichtvallen zonder klap |
| `plons_groot` | in het water vallen of rijden | een grote plons met spatten | te lang (2,2 s) |
| `scheepshoorn_op` | een schip in de haven | een lage scheepshoorn van 4,6 s | te hard op afstand; een brul in plaats van een hoorn |
| `camera_sluiter` | foto maken | één droge klik (0,16 s) | te zacht om te horen |
| `alarm_loeit` | een alarm in de stad | een alarmbel van 4 s | te hard, te schel |
| `vuurwerk_knal_0`, `vuurwerk_knal_1` | een vuurwerkbom | knal met geknetter | `_1` (mortier) is zachter; knal zonder bas |
| `trein_remmen_piep` | een remmende trein (vracht, station) | piepende wielen | pijnlijk schel; 5 s is lang |
| `dier_koe`, `dier_schaap`, `dier_paard`, `dier_eend`, `dier_meeuw_0`, `dier_meeuw_1` | dieren in de wei, op de gracht en aan de kust; overdag, 's nachts zwijgen ze meestal | een herkenbare roep die op afstand dof wordt | `dier_meeuw_*` (bron met wind eronder, hoogdoorlaat 500 Hz): ruis; een paard dat nergens staat (het paard klinkt alleen met de opname) |
| `golfjes_oever` | langs een kade, gracht of oever (naast het synth-water) | zacht klotsen, geen branding | een lus die hoorbaar herhaalt (16 s) |
| `menigte_gemurmel` | plein, markt en drukke straat | gemurmel van een menigte, onverstaanbaar | verstaanbare woorden (Engels?) of een lach die steeds terugkomt |
| `kikkers_nacht` | nacht, bij water in het groen of op het platteland | kikkerkoor in de verte | klinkt tropisch; te hard bij een stadsgracht |
| `tram_bel_op_0`, `tram_bel_op_1`, `bus_halte_ding`, `bus_deur_sis` | een tram of bus rijdt na een halte weg; de busdeur gaat open | tramtikken (kort en lang), een ding van de halte, een deur die opengaat | `bus_halte_ding` komt uit een metro-opname (klinkt het niet Nederlands?); `bus_deur_sis` is stil en dof (bron is 3,6 s) |
| `ui_klik` | elke klik en elke menuwissel (select en tick van `sfx/ui.js`) | een zachte knopklik, 0,14 s | te zacht naast de rest; de bevestigingsklank van vroeger (twee tonen) is weg: mis je die, haal `klik(` uit `select()` |
| `motor_diesel_stationair` | de trekker en de bus (motorsoort 2), onder de motorsynth | dieselbrom op stationair, zakt weg als je opschroeft | een tweede motor naast de synth (zet `ENGINE_LAYER_KINDS` terug zonder 2); de naad bij 12 s |
| `kermis_lawaai` | op de Grote Markt en tot 200 m erbij, zolang de kermis open is | drukte, attracties en muziek op afstand | muziek met een herkenbaar liedje; te hard in de straten ernaast |
| `stad_nacht_nl` | 's nachts in de stad en langs drukke wegen (naast het synth-stadsbed, dat dan de helft zachter is) | verkeer op afstand in een Nederlandse stad, gelijkmatig | een hoorbare naad (30 s); te hard bij een rustige woonstraat; geen nacht (hij staat ook in een gesloten voertuig zachter) |
| `ruimte_binnen` | in de flat | een rustige kamer met een zachte brom | een koelkastbrom die opvalt; te hard tegenover de stappen |
| `trein_hoorn_kort`, `trein_hoorn_lang` | een trein die toetert (de eigen trein of die van het spoor) | twee korte stoten of een lange stoot van een elektrische trein | een tweetonige hoorn is Nederlands, dit is een opname van een buitenlands type: klinkt het te veel als een buitenlandse trein? |

## SFX ronde 4: missie-polish (#988)

Gekozen op titel, duur, niveau en spectrum (`scripts/audio/sfx_analyse.mjs`), **niet beluisterd**. Haal een sleutel uit `FX_VERVANG` of `FX_OPNAME_ALLEEN` (`sfx/samples.js`) als hij slechter klinkt; bij een vervanging neemt de synth het weer over, bij een opname-only haak wordt het stil.

| Geluid | Waar je het hoort | Wat het moet zijn | Wat niet goed mag klinken |
| --- | --- | --- | --- |
| `kaartje_schuif` | elk nieuw regelkaartje (doel, regel) | een zacht kaartje of papier, 0,19 s | te kort om te horen; een klik in plaats van papier (bron is een kaartspel-opname) |
| `omroep_ding` | wachtstap klaar; de stoomtrein M19 bij het perron | een ding-dong van een omroep, 1,4 s | de bron is een metro-chime uit het buitenland: te herkenbaar? |
| `toeter_start`, `fluitje` | race en skutsje-sprint bij het startsein; het brugsein | een toeter van 1,6 s; een fluittoon van 1,1 s | te hard naast de start-sting; `fluitje` is een fluittoon en geen scheidsrechtersfluit |
| `gejuich_0`, `gejuich_1`, `applaus_klein` | bij de finishboog van de race en bij een medaille | een publiek dat juicht en klapt, 3 s | verstaanbare woorden; een lach (`applaus_klein` komt uit een kort klapfragment); het klinkt te dichtbij |
| `klok_tik` | de laatste 10 s van een klok, onder de piepjes | een droge klokstik, 0,12 s | te zacht om te horen; botst met de tonen |
| `bel_uitslag` | pannenkoeken: een bord geserveerd | een balie-belletje van 1,5 s | te scherp; botst met de kassa |
| `ei_breuk_0`, `ei_breuk_1`, `kratten_klets` | eierkratten (M07, M09): een ei dat breekt; bij een stoot van drie of meer eieren de krat | knappend ei, kletterend hout | `ei_breuk_1` is zacht en heeft een scherpe piek (een gelimiteerde bron); `kratten_klets` is een brekend krat en kan hard klinken |
| `hydrauliek_sis`, `weegbrug_klik` | bietenhal: de oplegger kantelt, de weegbrug | een sis van 2,4 s; een korte relais-klik | de sis is lang en hoog (veel boven 2 kHz); te zacht op afstand |
| `worp_lucht`, `brievenbus_klep` | krantenwijk: de worp, een krant in de brievenbus | een zwiep, een klepje | de worp klinkt als een zwaardzwaai (bron is een staf); te zacht |
| `stoomfluit` | de stoomtrein M19 bij het perron | een stoomfluit van 3 s (komt in plaats van de elektrische treinhoorn) | klinkt als een fabrieksfluit; te hard |
| `haspel_draai`, `dobber_plons`, `kopje_klink_0/1` | hengelen: een vis binnenhalen; de horecahap | een draaiende haspel, een kleine plons; een kopje op een schotel | `haspel_draai` heeft hoge rammel; `kopje_klink` als vervanging van de hap klinkt als porselein in plaats van eten |
| `munten_0`, `munten_1`, `ui_fout` | geld uitgeven (bij 2 euro of meer); een geweigerde handeling | muntjes van 0,4 en 0,8 s; een zachte foutklank van 0,3 s | de munten klinken luider dan de kassa; `ui_fout` te scherp of te lang voor een melding die vaak komt |

## Glitches en ruis (21-11, melding Nikky; zie [AUDIO-GLITCHES-21-11.md](AUDIO-GLITCHES-21-11.md))

Gemeten zonder oor: geen klip, geen NaN, geen lusklik in de 154 opnames en de procedurele bronnen (`node scripts/audio/ruis_test.mjs`). Wat een mens moet beluisteren, op een pc met een hapering (lage fps) en bij voorkeur de pc van Nikky:

| Wat | Waar | Wat je hoort als het goed is | Wat een fout is |
|---|---|---|---|
| De limiter op de uitvoer | een luide scène: rijden met sirenes, schieten en muziek tegelijk; vergelijk met `?geenlimiter` | geen tik of krak; het geheel klinkt even hard | een pompend geluid (de muziek zakt weg bij elke knal), of juist nog steeds een krak |
| Ruisbedden zonder gelijkspanning | `bed_city`, `bed_lap`, `bed_rain`, `bed_crickets` (alleen als de opnames ontbreken) en de ambience van de stad, regen en krekels | gelijkmatig, geen bonk als de laag begint of stopt | een lage bonk bij het in- of uitfaden |
| De ruime geluidsbuffer | na een sessie met veel glitches: de volgende sessie draait op `playback` (zie het blok Geluid in de diagnose) | geen gaten of tikken meer; geluiden komen ca. 30 ms later (schot en knal) | het geluid loopt merkbaar achter op het beeld |
| Hapering en geluid | rijden door de dichtste stad terwijl de fps laag is | het geluid loopt door zonder gaten | tikken, krakjes of een kort ruisgeluid op het moment dat het beeld hapert |
| Het blok Geluid | Ctrl+Shift+G (zodra de diagnose gemerged is) | glitches per minuut 0, limiter 0 keer ingegrepen | glitches > 0 terwijl het beeld soepel is: dan ligt het aan het apparaat, niet aan het spel |

## Mix en nieuwe lagen (21-11, #988, #1021): wat nog beluisterd moet worden

Alles is gemeten met pure tests (`node scripts/audio_mix_test.mjs`: 289 controles; plus `audio_ruis_test`, `audio_peaks_test`, `sfx_test`), **niets is beluisterd** en er is geen Electron-run gedaan. Er zijn geen nieuwe opnames: de lagen gebruiken bestaande klanken (`boot_motor_stat`, `scheepshoorn_op`, `trein_hoorn_kort/lang`, `stad_nacht_nl`). Plekken zijn spelcoördinaten (x, y in meters); snelste route: reis met de trein naar het genoemde station (reizen via het station of de kaart) en loop dan naar het water of het spoor, of zet in een testbank `world.player.x/y`. Alles hieronder hoort zacht te zijn: je mist het pas als je weggaat.

| Laag of regel | Waar | Wat je hoort als het goed is | Wat een fout is |
| --- | --- | --- | --- |
| `haven`: verre scheepsbrom (`boot_motor_stat`, dof tot 650 Hz) | Delfzijl, aan de kade bij de loodsen: station Delfzijl (23687, -13163) en loop naar het water; ook Eemshaven (17218, -26931) | een lage, verre brom die in een paar seconden inkomt en uitfaadt als je wegloopt; geen sprong op de overgang kade, straat | hoorbaar in een woonwijk of bij een gracht zonder loodsen; klinkt als een draaiende boot vlakbij; een hoorbare lus van het bestand |
| `scheepshoorn_op` als zeldzame hoorn in de haven | zelfde plekken, wacht tot twee minuten (kan tot vijf) | een dof signaal van ver weg, hooguit eens per paar minuten | te hard of te dichtbij; vaker dan elke minuut; ook in een gewone stad |
| verre treinhoorn langs het spoor | naast het spoor, bijvoorbeeld station Appingedam (19593, -12190) of langs de lijn; wacht een paar minuten | een verre hoorn (kort of lang) uit de richting van het spoor, dof | bij onweer of regenbui (hoort er dan niet te zijn); elke halve minuut; schel |
| verkeer overdag (`stad_nacht_nl` zacht) | de Grote Markt en de straten ernaast met verkeer, overdag | een zacht, gelijkmatig verkeer op afstand onder de stadsbrom | hoorbaar op het platteland; te veel bovenop het gemurmel; een hoorbare naad (30 s) |
| occlusie binnen | de flat (binnen) en een gesloten auto of bus | buitengeluid (stad, wind, vogels) wordt dof en in de flat zachter; kamertoon en regen op het dak blijven helder | alles weg of juist ongedempt; een hoorbaar knipje bij het binnengaan |
| kleine variatie van de lagen | een minuut stilstaan in de polder (Hogeland) of aan de kust | de laag ademt een heel klein beetje; geen pompen | een duidelijk pompen of zwevende toon |
| muziek onder een gesprek | een missie met scenariomuziek (race, missie, thuis) en een gesprek of een ondertitelde scène | de muziek zakt tot de helft, zacht in en trager uit; de regel blijft verstaanbaar | de muziek zakt niet; zakt met een klap; komt na het gesprek te abrupt terug |
| declick en stemlimiet | een drukke straat met veel voetgangers, deuren en dieren tegelijk; een schot in de drukte | geen tikken aan begin of eind van losse klanken; het schot klinkt altijd | een korte tik vooraan een klank; een schot dat wegvalt (zou niet mogen: wapen heeft ruim 14 stemmen) |
| zacht opstarten na een tabwissel | wissel van tab en kom terug (zowel web als Electron) | de uitvoer komt in een kwart seconde omhoog; geen stoot of tik | een krak bij het terugkomen; het geluid blijft weg (dan: `resumeCtx`) |

Meten zonder oor: het blok Geluid (Ctrl+Shift+G, zodra de diagnose gemerged is) toont stemmen, limiter en glitches; `stemTeller.stats.geweigerd` laat zien welke categorie de cap raakte (nog niet in het blok opgenomen).
