# Live treinen: onderzoek en bouw (#1085, 21-11)

> Naslag bij issue #1085. Sjabloon was de bussenkant (#395, #922: `docs/BUSSEN-LIVE-21-11.md`). Wijkt dit af van de code, dan is dit document de fout. Constitutie 4 (AGENTS.md):
> het spel mag openbare gegevens alleen OPHALEN (een gewone leesopvraag zonder gegevens van de speler, zonder account of sleutel), met een uitzetter in Instellingen en een terugval
> (goedgekeurd 24-10 voor de live bussen; de eigenaar besloot op 21-11 hetzelfde voor de treinen).
> Alle feeds hieronder zijn op 21-11-2026 echt bekeken (alleen openbare GET's zonder account, geen inlogmuren); de aantallen komen uit die opvragen.

## Eigenaarsbesluiten (21-11, letterlijk samengevat)

1. De echte dienstregeling van de stations in en rond Groningen **bij het bouwen** in het spel zetten, met verzonnen lijnnamen en echte vertrektijden.
2. De vertragingen **live** ophalen via de open feed, met dezelfde uitzetter en terugval als bij de bussen (Instellingen, 1 opvraag per minuut).
3. Een **Live-badge** op de borden: "Vertrekt over 4 min · vertraagd", met de bron erbij.
4. Vraag: is de positie van de trein zelf ook zonder API-sleutel op te halen, en zit Arriva er ook in?

## Antwoord op de vragen van de eigenaar

**Is de positie van de trein zelf zonder sleutel op te halen? Nee, niet uit een echt open bron.**

- De open feed van OVapi heeft **geen treinposities**. `vehiclePositions.pb` is nagekeken: 2.138 voertuigen van Qbuzz, Connexxion, Keolis, EBS, GVB, RET, HTM en Arriva-bussen; geen
  enkele route daarin is een spoorroute (route_type 2 uit dezelfde GTFS: 0 treffers op 834 routes). De treinen staan apart in `trainUpdates.pb`, en dat bevat per rit het
  treinnummer, de haltes met geplande en verwachte tijd, de **vertraging in seconden**, het spoor en een melding dat de rit vervalt. Wel wat de trein *doet* (vertraging, spoor, vervalt),
  niet *waar hij is*.
- Treinposities bestaan wel, maar achter een toegang: de **NS API** (virtual-train-api) levert positie, snelheid en richting van ca. 190 treinen (NS plus enkele regionale), maar vraagt een
  gratis account en een abonnementssleutel (`Ocp-Apim-Subscription-Key`) en heeft een dagquotum. En **NDOV Loket** (InfoPlus, ook de POS-berichten met treinposities) vraagt aanmelding
  bij GOVI. Beide vallen buiten wat constitutie 4 toestaat (geen account, geen sleutel). Een sleutel in een spel dat aan spelers wordt uitgedeeld zou ook van ons zijn en niet van de speler.
- Scrapen van de reisplanner of de kaart van de vervoerders is **niet** toegestaan en niet gedaan. Onofficiële archieven (zoals trein.fwrite.org) zijn geen gelicentieerde bron; niet gebruikt.
- Aanbeveling: geen live treinposities bouwen. Het bord dat vertragingen toont is de eerlijke versie. Wil de eigenaar later toch posities, dan is dat een **eigenaarsbesluit over een
  sleutel** (de eigenaar maakt die zelf aan, het spel bewaart hem nooit in de repo) of een tussendienst die niet bij de speler hoort; dat past niet in "zonder account of sleutel van de speler".

**Zit Arriva er ook in? Ja.**

- In de statische GTFS (`gtfs-nl.zip`) staat Arriva als eigen vervoerder (`IFF:ARRIVA`, 16 spoorlijnen; bussen als `ARR`, `BRAVO:ARR`). Alle regionale treinen rond Groningen (RS1, RS4 tot RS7, RE1, RE6)
  zijn Arriva; NS rijdt de Intercity en de Sprinter naar Assen en Zwolle. In het gebouwde rooster zijn dat 4.800 Arriva-vertrekken tegen 740 NS-vertrekken (alle stations en dagen opgeteld).
- In `trainUpdates.pb` staan de Arriva-ritten ook (bijvoorbeeld treinnummer 37819, de lijn naar Delfzijl, met een vertraging per halte). Arriva-**bussen** staan in `vehiclePositions.pb` (434 stuks) en
  `tripUpdates.pb`; die gebruikt het spel al voor de bussen.
- De vervoerder komt niet in beeld: constitutie 2 (geen echte merken). Op het bord staan de verzonnen lijnnamen (Stoptrein Delfzijl, Intercity Zwolle ...), de vervoerder staat alleen in dit document.

## Feedmatrix

| Bron | Wat | Sleutel / account | Licentie | Grootte | Frequentie | Treinen | Arriva |
|---|---|---|---|---|---|---|---|
| `gtfs.ovapi.nl/nl/gtfs-nl.zip` (OVapi, openOV) | statische dienstregeling heel Nederland, 45 vervoerders, ca. 2.850 routes, ca. 1,13 mln ritten, ca. 21,5 mln stoptijden, geldig 20-11-2026 t/m 11-12-2027 | nee | CC0-1.0 (alleen `shapes` ODbL, ticketing CC-BY-NC-ND; die gebruiken we niet) | 278 MB zip, 1,7 GB uitgepakt | elke dag een nieuwe versie (nieuwe bedrijfsdag 03:00 UTC) | ja (NS, NS Intl, Eurobahn, DB, NMBS, ...) | ja (spoor en bus) |
| `.../nl/trainUpdates.pb` (GTFS-RT, OVapi-uitbreiding) | vertragingen en spoor per halte van alle treinen, ook rit-niveau "vervalt"; geen positie | nee | CC0 (zelfde bron) | 2,9 MB uitgepakt, ca. 1,0 MB gzip | ververst steeds (best effort, de precieze frequentie is niet nagemeten); wij vragen 1 per minuut | ja, ca. 2.250 ritten | ja |
| `.../nl/tripUpdates.pb` | vertragingen van bus, tram, metro (treinen alleen geplande tijden) | nee | CC0 | 4,1 MB | idem | nee | alleen bus |
| `.../nl/vehiclePositions.pb` | posities van bus, tram, metro, veer | nee | CC0 | 0,3 MB | idem | **nee, geen spoorroute erin** | alleen bus (434) |
| `.../nl/alerts.pb` | storingsberichten | nee | CC0 | 0,8 MB | idem | gedeeltelijk | gedeeltelijk |
| NDOV Loket (`data.ndovloket.nl`, InfoPlus DVS/RIT/POS, KV6/KV8) | vertrekstaten, ritten, (via NS) posities; ruwe landelijke bronfeeds | **aanmelding bij GOVI** voor realtime (gratis); statische dumps zijn openbaar | open data van de vervoerders, best effort | variabel | realtime via ZeroMQ | ja (POS) | ja (bussen KV6/KV8) |
| NS API (`apiportal.ns.nl`, Reisinformatie + virtual-train-api) | reisplanner, vertrekken, treinposities | **ja, abonnementssleutel** (gratis account) | NS-voorwaarden; quotum per dag | klein per opvraag | seconden | ja (NS + enkele regionale) | gedeeltelijk |

Voorwaarden van OVapi (README op `gtfs.ovapi.nl`): vrij te gebruiken, geen SLA (best effort), je mag niet doen alsof je een van de vervoerders bent, geef een herkenbare `User-Agent` (wij sturen
`OpenDataLezer/1`, zoals bij de bussen), ondersteun gzip en conditionele opvragen als je vaker dan eens per minuut vraagt. Wij vragen niet vaker dan eens per minuut. Bron (voor onderzoek
en credits): "Dutch integrated real-time transit data", Stichting OpenGeo / OVapi, `gtfs.openov.nl`. Het spel zelf noemt de bron als "open OV-gegevens".

Wat niet is nagegaan: de exacte verversfrequentie van de server (de `last-modified` van `trainUpdates.pb` liep gelijk met de andere feeds); de vermelde voorwaarden van NS en NDOV
komen uit de zoekresultaten en de openbare voorpagina's, niet uit de volledige voorwaardentekst (die staat achter hun portalen). Wie dit gaat gebruiken moet die zelf nalezen.

## Wat er gebouwd is

### Deel 1: de echte dienstregeling bij het bouwen

- **Bouwstap:** `node scripts/treinrooster_bouw.mjs --gtfs=<map met uitgepakte gtfs-nl.zip>` (puur: `scripts/treinrooster_lib.mjs`). De zip wordt alleen bij de ontwikkeling opgehaald
  (`curl -H "User-Agent: OpenDataLezer/1" -o gtfs-nl.zip https://gtfs.ovapi.nl/nl/gtfs-nl.zip`, uitpakken in een eigen lege map); **het spel haalt de grote GTFS nooit op**. Het
  script leest ca. 1,2 GB stop_times in een minuut en schrijft `game/treinrooster.json`: 217 KB, 26 stations, 3 dagsoorten.
- **Filter:** alleen spoorroutes (route_type 2), alleen de stations in en rond Groningen (Groningen, Europapark, Noord, Haren, Assen, Zuidhorn, Grijpskerk, Sauwerd, Winsum, Uithuizen, Roodeschool,
  Eemshaven, Bedum, Stedum, Loppersum, Appingedam, Delfzijl West, Delfzijl, Kropswolde, Martenshoek, Hoogezand-Sappemeer, Zuidbroek, Veendam, Scheemda, Winschoten, Bad Nieuweschans). Per vertrek:
  tijd, treinnummer, spoor, bestemming, spellijn, aankomst. Het eindstation van een rit levert geen vertrek.
- **Wat er niet in zit:** de vervoerder, een adres, een url, iets persoonlijks. Het bestand heeft alleen stations, tijden, treinnummers, sporen en bestemmingen (echte plaatsnamen mogen).
  `treinrooster_test` bewaakt dat er geen echte merk- of vervoerdersnaam in staat.
- **Verzonnen lijnnamen:** een vertrek krijgt de lijn van het spel (Stoptrein Roodeschool, Delfzijl, Leeuwarden, Winschoten, Veendam, Assen, Intercity Zwolle) op de kant waar de trein heen
  rijdt (rijdt hij naar Groningen, dan op de plek waar hij vandaan komt). De bestemming op het bord is de echte plaats, de lijn en de omroep ("Noorderspoor-trein naar ...") blijven verzonnen.
- **Tijd op de spelklok:** de spelklok loopt in uren van de lokale dag; het rooster is een zomerdag, dus **1 op 1**: 08:17 in het rooster is 08:17 op de spelklok. De spelkalender (augustus 2026,
  daarna "nazomer") blijft zoals hij is; alleen de weekdag telt: werkdag (maandag t/m vrijdag; basis woensdag 18-8-2027), zaterdag (21-8-2027), zondag (22-8-2027), uit `calendar.js weekdayOf`.
  Dag 1 (vrijdag 14 augustus) is dus een werkdag-rooster, dag 2 het zaterdagrooster. Er is niets omgerekend voor zomer- of wintertijd: de spelwereld heeft altijd zomer. Vertrekken na 24:00 vallen
  terug op de vroege uren van dezelfde dagsoort (kleine afwijking, alleen voor nachtritten); het bord loopt over middernacht heen naar de eerste treinen van de volgende dag.
- **Op het bord (`stationlife.js`):** heeft het station een echt rooster, dan volgt het bord dat en niet meer de treinen die toevallig rondrijden of het oude verzonnen rooster. Een station zonder
  rooster (en elk station als het bestand niet laadt) houdt de eigen dienst van het spel en zegt dat ("Rooster (eigen dienst)"). Het spoor volgt hetzelfde rooster (volgende sectie).
- Niet aangeraakt: het OV-scherm (`ovopties.js`) en de kaart tonen geen vertrektijden; er viel daar niets te vervangen.

### Deel 2: live vertragingen

- **Bron:** `https://gtfs.ovapi.nl/nl/trainUpdates.pb`, alleen GET, vaste url, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, geen cookies, geen id, geen querystring, alleen de kopregels
  `Accept` en `User-Agent`. 8 s time-out, maximaal 8 MB uitgepakt (de feed is nu 2,9 MB; de bussen mogen 3 MB, dat is hier te krap), hooguit 4.000 meldingen na het filteren op de stations.
- **Electron:** het main-proces doet de opvraag (`desktop/livetreinen.cjs`, IPC `gde:live-treinen`, zonder argumenten; in het pakket opgenomen); het web doet hem direct (en valt bij een CORS-weigering zacht
  terug op het rooster, zoals bij de bussen: de server stuurt geen CORS-koppen).
- **Ritme:** één opvraag per minuut met ±15% spreiding, bij fouten verdubbelend tot 10 minuten, een 429 of 503 geeft meteen de lange rust, een lege feed is geen fout. De laatste goede stand blijft
  180 s staan; daarna toont het bord het rooster.
- **Uitzetter:** een eigen schakelaar `liveTreinen` in Instellingen, Spel (standaard aan), naast `liveBussen`. **Gekozen voor een eigen schakelaar** omdat de opvraag zwaarder is (ca. 1 MB per minuut op de lijn,
  tegen 0,3 MB bij de bussen) en een speler het ene wel en het andere niet wil. Geen opvraag in `?dev`, de trailer en de testruns (zelfde grens als de bussen).
- **Koppelen:** een melding hoort bij een roosterrij op treinnummer + stationscode + geplande minuut (verwacht min vertraging, in Nederlandse tijd). Alleen meldingen van de datum van vandaag (NL)
  tellen. Vroeg telt als op tijd; onder een minuut telt als op tijd; een vervallen rit of overgeslagen halte staat als "vervalt".
- **Het bord:** een label **Live** of **Rooster** (het woord, nooit alleen een kleur), de regel "Vertrekt over 4 min · 3 min vertraagd" voor de eerstvolgende trein, een bronregel ("Bron: open OV-gegevens ·
  14 s geleden bijgewerkt", of "... rooster, zonder live vertraging"), `+3` bij een vertraagde trein en de omroep noemt de vertraging. De terugval is overal het rooster, nooit een foutcode.
  De label gebruikt het bestaande chip-element van het bord (`.mg-sfeer`), geen nieuw vormvlak.
- **Wat de speler er niet van merkt:** een rustige HUD-melding zoals bij de eerste live bus is er niet bij gekomen; het label op het bord zegt het al.

### Deel 3: spoor en bord zijn dezelfde trein (eigenaar 21-11: "het spoor en bord moeten overeenkomen")

Eén bron voor bord en spoor: `game/js/treindienst.js` (puur, deterministisch). De treinen in de wereld rijden niet meer als een pendeltrein per lijn, maar zijn de ritten van het bord.

- **Ritten:** de rijen van het rooster met hetzelfde treinnummer in tijdsvolgorde zijn één rit. Het rooster bevat nu ook het **eindstation** van elke rit (alleen aankomst, `soort` 1; het staat niet op het bord) en het
  beginstation (`soort` 2), zodat een trein in de wereld kan aankomen en klaarstaan. Een rit over het Hoofdstation valt in twee "legs", één per spoorlijn van het spel (de lijnen beginnen allemaal op het Hoofdstation); een
  leg heeft minstens twee haltes die op de lijn staan. Een rit met minder haltes in de wereld heeft geen trein en staat dus ook **niet** op het bord. De lijn bij een bordrij is de lijn van de trein (bij een doorgaande rit
  Delfzijl-Veendam is dat op elk station de lijn waar dat station aan ligt).
- **Plek uit de klok (`legStand`):** tijd van de dag is de spelklok; op elke halte staat de trein stil tussen aankomst en vertrek (minstens 20 s), ertussen rijdt hij met een zachte S-curve over de afstand tot de volgende halte
  (snelheid en richting daaruit, voor de overwegen). Een beginnende trein staat 2 minuten voor vertrek klaar op het perron; een trein die van buiten de kaart komt rijdt vanaf de oorspronkelijke kant binnen en rijdt na zijn
  laatste halte weg; op een eindstation blijft hij 60 s staan. Niets wordt gesimuleerd of bijgehouden: dezelfde klok geeft dezelfde plek, ook voor treinen ver weg (ze verschijnen op de juiste plek als je in de buurt komt).
- **In de wereld (`railway.js planTreinDienst`):** een lijn met ritten krijgt een pool van 8 treinen en verliest zijn pendeltrein; elke frame wordt elke actieve rit aan een poolspoor toegewezen en op zijn plek gezet
  (`t.rit`). Treinen zonder rit staan niet in `getTrains()`. Lijnen zonder ritten in de data houden hun eigen dienst. Meer dan 8 gelijktijdige ritten op een lijn: de rest rijdt niet (in de proef nooit meer dan 5).
- **Bord = trein:** een bordrij heeft `rit` (het rit-id, `<treinnummer>@<lijn>`) en dezelfde tijden als de trein (`legTijden` en `vertragingVan` zijn één functie voor beide), ook met live vertraging: de trein staat op
  de verwachte tijd van het bord op het perron en vertrekt daarna; een vervallen rit is een bordrij "vervalt" zonder trein. Een bordrij zonder trein bestaat niet (rijen zonder leg worden niet getoond) en een trein zonder
  bordrij ook niet (elke leg heeft op elke halte behalve het eindpunt zijn rij); dat controleert `scripts/treindienst_test.mjs`.
- **Instappen:** de trein van het bord staat op de vertrektijd (-120 s) op het perron en is te bestijgen zoals altijd (`stationtravel.js`, state `dwell`). De machinist rijdt dan de rit van die trein: haltes, tijden (met
  live vertraging), richting en eindpunt uit dezelfde leg (`dienstVanLeg`, `machinist.js`); de andere cabine rijdt de oude verzonnen dienst. Een overgenomen trein blijft van de speler (de rit wordt niet dubbel gereden); geeft
  hij hem terug, dan komt de trein weer op de klokplek van zijn rit (of verdwijnt als die rit voorbij is).
- **Perron en spoor:** de trein staat op de halte van de lijn (`stop.s`, het perron van het station op die lijn). De echte spoornummers (sp. 3 enz.) zijn tekst op het bord; de wereld heeft per lijn één spoor per
  richting en geen data die de nummers aan een perrongeometrie koppelt, dus "het juiste perron" is het perron van de lijn, niet het gemeten spoor.
- **Wat het kost:** de dienst wordt één keer per dagsoort gebouwd (ca. 620 ritten) en elke frame worden alleen de ritten in hun tijdvenster doorgerekend (ca. 20 tot 25 tegelijk).

**Samen spelen (zie ook docs/COOP-GAST.md):** de host bezit de verkeerspopulatie en de gasten zien dezelfde trein. Dat gaat **deterministisch uit de gezamenlijke spelklok**: de gast rekent `planTreinDienst` zelf uit
en krijgt dezelfde ritten op dezelfde plek (testbank `treindienst_test`: host en gast hebben dezelfde treinen op dezelfde plek). De bestaande snapshot (`hostTreinen`, entiteit SOORT_TREIN) blijft: voor een
rooster-trein is hij een controle (de gast bewaart het grootste verschil per lijn in `route.afwijking`), voor een door een speler **overgenomen** trein (bit 32 in het entiteit-id) volgt de gast de snapshot, zoals voor
de gewone bestuurde trein. In Samen spelen rekenen bord en treinen **zonder live vertraging** (alle spelers het rooster): de live vertraging komt uit de eigen opvraag van elke speler en zou de treinen uit elkaar halen;
het bord zegt dan "Rooster". Alleen voor wie solo speelt zijn de vertragingen op bord en trein live.

### Eerlijke beperking: de spelklok is niet de echte tijd

De vertragingen zijn die van **nu** in het echt, de spelklok loopt vrij. De live vertraging wordt aan een bordrij gehangen op treinnummer en geplande minuut. Staat de spelklok op 14:00 terwijl het
echt 09:00 is, dan staat de feed voor de trein van 14:00 meestal nog op "0 seconden" (hij is nog niet onderweg), en zie je dus vooral vertragingen als de spelklok ongeveer gelijk loopt met de echte
tijd. Dit is geen fout in de koppeling maar de aard van de data. Mogelijkheden voor later (besluit eigenaar): (a) de spelklok optioneel koppelen aan de echte tijd, (b) vertragingen "van nu" vertalen
naar de eerstvolgende treinen op het bord (dan klopt het treinnummer niet meer met de echte). Niet gebouwd.

Verder: het uitlezen van de feed kost op een gewone pc ca. 110 ms op de hoofddraad (gemeten, 3 MB, gefilterd op 26 stations), eens per minuut. Dat is een merkbaar haperingetje als het in het web
op een zwakke machine draait; in Electron is het ook de renderer. Een tweede stap zou het filteren naar het main-proces verhuizen (dan krijgt de renderer een klein JSON-bestand). Niet gebouwd.

## Wat gebouwd en getest is

| Onderdeel | Bestand | Test |
|---|---|---|
| bouwstap + filter, lijnkeuze, dagen, tijden | `scripts/treinrooster_bouw.mjs`, `scripts/treinrooster_lib.mjs` | `treinrooster_test` |
| het rooster in het spel, tijdafbeelding, vertraging per rit | `game/js/treinrooster.js` | `treinrooster_test` |
| bron in woorden (Live/Rooster), regel "Vertrekt over ..." | `game/js/treinbron.js` | `treinrooster_test` |
| feed lezen, opvraag zonder spelergegevens, zacht falen | `game/js/livetreinen.js` | `livetreinen_test` |
| ritme, backoff, spreiding, uitzetter, brug | `game/js/treinlive.js`, `desktop/livetreinen.cjs` | `livetreinen_test` |
| bord (rijen, +N, vervalt, label, bronregel) | `game/js/stationlife.js` | `treinrooster_test`, `stationlife_test` |
| treinen in de wereld uit het rooster, pool, gast, overgenomen trein, machinistdienst | `game/js/treindienst.js`, `game/js/railway.js`, `game/js/machinist.js`, `game/js/coopnet.js`, `game/js/coopworld.js` | `treindienst_test` (vraagt een gevendorde three, zoals `gasttrein_test`) |
| Instellingen (`liveTreinen`) | `game/js/settings.js`, `game/js/pausemenu.js` | `spelmenu_test` |

`livetreinen_test` draait ook tegen de echte feed als je `GDE_TRAIN_PB=<pad naar een afgehaalde trainUpdates.pb>` zet (21-11: 590 meldingen voor de drie stations die de test filtert, 16 met vertraging).
Vooraf al gecontroleerd op de echte feed: 2.288 meldingen op de 26 stations, 98 met een vertraging van een minuut of meer, 0 vroege, 0 vervallen op dat moment; van de 2.971 werkdagrijen
had 1.666 een melding voor vandaag (het was zaterdag).

## Samen spelen

Elke speler heeft zijn eigen opvraag en zijn eigen bord: het rooster is een bestand dat iedereen heeft en de live vertragingen zijn dezelfde openbare feed voor iedereen, dus er hoeft niets in de
snapshot of een EXTRA-bericht. De spelklok en de speldag (en dus de dagsoort) volgen de gezamenlijke wereld; de gast gebruikt zijn eigen `calendarToday` zoals het stationsleven dat al deed. Een gast
die de optie uit heeft of geen bron bereikt ziet het rooster zonder vertraging, de host kan een andere stand zien als zijn opvraag net een minuut eerder of later viel. Er is geen host-recht in: niemand
beslist voor een ander. Valt iemand weg of sluit hij later aan, dan verandert er niets voor de anderen. De zichtbare treinen (`railway.js`) blijven van de wereld van wie het spel opende; het bord
hangt daar niet meer van af. Test: pure tests; niet met twee instanties gezien.

## Niet gedaan en niet gezien

- Niets is in een draaiend spel bekeken (releasegate draait, geen Electron): de label op het bord, de regel "Vertrekt over ...", de kleur van `+N` en het gedrag in `?dev` zijn alleen met pure tests
  en `node --check` gecontroleerd. **Nog niet bekeken.**
- Bord en spoor zijn getest op een eigen proefspoor met de echte data (`treindienst_test`, ook met vertraging, een vervallen rit, een gast en een overgenomen trein); niet op de gebouwde wereld en niet in beeld. De echte lijnen
  en haltes (en afstanden) van de wereld kunnen ritten anders afbakenen dan de proef; ritten zonder twee haltes op een lijn hebben geen trein (en geen bordrij).
- **In beeld te controleren (nog niet bekeken):** (1) staat de trein op de bordtijd stil op het perron van het station en vertrekt hij de goede kant op; (2) rijden er geen treinen meer zonder bordrij en geen bordrij zonder trein
  (kijk naar het bord van Haren, Bedum, Sauwerd, Zuidhorn en Kropswolde); (3) komt een trein van buiten de kaart soepel binnen en rijdt hij aan het eind soepel weg, zonder te springen; (4) stap in een trein: melding "Dienst ..."
  met de haltes en tijden van het bord; (5) Samen spelen met twee vensters: dezelfde trein op dezelfde plek, en een trein die een speler overneemt; (6) de overwegen sluiten voor de rooster-trein (snelheid komt uit de klok);
  (7) het bord toont Live/Rooster en +N als er vertraging is; (8) na slapen of tijd versnellen springen treinen naar hun nieuwe klokplek (bedoeld).
- Geen HUD-melding bij de eerste live trein, geen kaartlaag (er zijn geen posities).
- `dienstregeling_test` kon niet draaien in deze werkmap (geen provinciedata); `dienstregeling.js` is niet aangepast (de verzonnen dienst blijft voor de andere cabine en voor lijnen zonder rooster); `stationlife_test`, `spelmenu_test`, `gasttrein_test`, `cooptrein_test` en `machinistdienst_test` wel gedraaid.
- Het rooster is een momentopname van de feed van 20-11-2026 voor de zomer van 2027; verandert de echte dienstregeling dan moet `treinrooster_bouw.mjs` opnieuw draaien (geen automatische vernieuwing).
- Twee spelers in Samen spelen: niet gezien.

## Bronnen

- OVapi, README en feeds: `https://gtfs.ovapi.nl/` (`README`, `nl/gtfs-nl.zip`, `nl/trainUpdates.pb`, `nl/vehiclePositions.pb`, `nl/tripUpdates.pb`, `nl/alerts.pb`), licentie CC0-1.0 volgens `licenses.txt` in de zip.
- NDOV Loket en GOVI: `https://data.ndovloket.nl/`, `https://govi.nu/` (aanmelding, documentatie op `documentatie.govi.nu`), InfoPlus-publicatiedocumenten op `data.ndovloket.nl/docs/infoplus/`.
- NS API-portal: `https://apiportal.ns.nl/` (abonnement met sleutel nodig); de details van de virtual-train-api komen uit openbare clientprojecten, niet uit de voorwaardentekst.
