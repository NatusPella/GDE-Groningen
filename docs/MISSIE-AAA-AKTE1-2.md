# AAA voor akte 1 en 2: auditkaarten en stand (21-11)

Hoort bij #955 (aankleding), #956 (binnen spelen) en #963 (wachten in een cirkel). Bouwt voort op [missies/AAA-UPGRADEPLAN.md](missies/AAA-UPGRADEPLAN.md) (rubriek, bouwstenen) en [BINNENSETS-21-11.md](BINNENSETS-21-11.md) (pan-budget, binnenkamers). Akte 1 is M01 tot M06, akte 2 is M07 tot M11 plus de bietencampagne (A1) en de reisstukken (T1, T2).

**AAA** betekent hier: een sterke opening (locatie met aankleding, figuren die iets doen), een duidelijk doel, een tussen-beat, een slot met nasleep en leesbare feedback met toetsplaatjes. Kosten: S is een dagdeel, M een dag.

**Wat nu overal geldt.** Elke missie heeft een regelkaart, stings en (waar de plek het toelaat) aankleding uit de eerdere rondes. Nieuw in deze ronde: (1) een **tussen-beat** per missie (`missionbeats.js`: een zin van een bijfiguur halverwege, nooit in een cutscene, verandert niets aan doel, tijd of geld), (2) een **nasleep-rij** op de uitslagkaart (wie reageert), (3) **aankleding** bij de start of het doel van M02, M04, M07, M09, M10 en M11 (`missions_akte12.js`, plannen voor `missiedecor.js`), (4) bij #963 **twee nieuwe wachtclips** (telefoon, praten), een A-bord als wachtprop en een **tweede wachtende** die met de eerste kletst (`wacht.maat`, nu bij de laatste zoutkuip van M11). Toetsen in speltekst staan als `{TOKEN}` of `(Ctrl)`; `scripts/key_literals_test.mjs` bewaakt dat (geen ruwe toetsnamen buiten de ingesproken bestanden, waar de tekst de clip volgt).

## Kaarten

| Missie | Nu | Mist | AAA-versie | K | Stand 21-11 |
| --- | --- | --- | --- | --- | --- |
| **M01** Nul krassen | stuntarena met hekken en publiek, regelkaart, M01.3 tot M01.5 in scène | tussen-beat tijdens de stunt; nasleep na de bezorging | Jelmers chat reageert op een duif op de spiegel; Berend telt thuis na | S | beat en nasleep gedaan; camera niet |
| **M02** Even pinnen | kaart op de garagestap, sting | de aankomst bij Pand & Poen was kaal; geen beat | `pandenpoen` (bord, kisten, Sjabbe wijst, twee klanten); de automaat praat; Sjabbe sluit af | S | gedaan; binnenset garage blijft M |
| **M03** Het Loket | binnenset `loket`, wachtrij van figuranten, nummerscherm | geen beat in de keuzestappen; nasleep | man in de rij zucht over formulier 7B; de beambte stempelt | S | beat en nasleep gedaan; wachtrij en kamer bestonden al; **vervolg 21-11:** `binnenmissies_test` bewijst dat kamer, speler, figuren en kamercamera kloppen (geen meubel, geen wand) |
| **M04** Kieken van boven | duifvlucht met camerakaart | de start op het plein was kaal | `duivenhok` bij het station (kooien, bank, Bert wijst naar het museum); meeuw-beat; Berts nasleep | S | gedaan; **vervolg 21-11:** opdracht, uitleg en hoogtekaart in één stapel (`hudstack.js`); fotokaart per doel niet |
| **M05** Kei-race | start- en finishboog, publiek, startlicht, finishcamera, podiumsting | beat onderweg; nasleep | eerstejaars tegen een paaltje; Sjoerd en de taart | S | beat en nasleep gedaan |
| **M06** Het museum | kraak met `kort`-handelingen, argwaan, camerakaart | beat tijdens het wachten; nasleep | telefoon rinkelt in het gebouw; Tammo hoort een sirene voor iets anders | S | beat en nasleep gedaan; QTE-beleid blijft (#962) |
| **M07** Het vet | kaart, plein bij de Oosterpoort met publiek | de groothandel bij de start was kaal; beat tijdens de jacht | `groothandel` (vaten, kratten, Durk en Douwe); Durk en Douwe ruziën; publiek-nasleep | S | gedaan; finishcam en lekkende banden niet |
| **M08** Fatbikes | regelkaart, Ebbingebrug-melding, Oma Trijntje op de kade | beat onderweg | fatbike met een meloen; Oma Trijntje sluit af; **vervolg 21-11:** golven (tegemoet, kruisend, rij, colonne van achteren), teller Ontweken, twee keer geraakt = het stuk opnieuw (zonder letsel, +15 s), tempoprikkel, koerier-beat halverwege, Ontweken op de uitslagkaart | S | beat, nasleep en de ontwijk-uitdaging gedaan (`fatbikedodge.js`, `fatbikedodge_test`); camera en beeld niet |
| **M09** Heel aankomen | eierkaart, zes kratten op de trekker | de tussenstop en de kelder waren kaal | `wierdemarkt` (kraam, balen, boer, kind) en `kerkkelder` (koster, banken); Geesje bij de tussenstop; de koster telt twee keer | S | gedaan; cinedrive-intro niet |
| **M10** Trekker-limo | kaart, afstandsmeter, waarschuwing | het erf bij de start en de sloot waren kaal | `quaderf` (trekker, balen, neef zwaait), `slootkant` (toeschouwers); limo toetert en zwaait; Jelle zwaait | S | gedaan; kerktuin-camera niet |
| **M11** Geleend van de Friezen | kaart op inhalen en kwelder, wachtfiguur bij drie kuipen | de steiger aan het eind; kletsende wachtenden | `klaassteiger`; een boer kletst met Klaas bij de derde kuip (#963); zeehond-beat; Klaas sluit af | S | gedaan |
| **A1** Bieten | kaart, publiek bij de hoop, weegbrug, kippende oplegger | niet aangeraakt (eigen module `bietenhal.js`) | de SFX van het kippen | S | niet gedaan |
| **T1, T2** Reisstukken | reizen met haltefiguren | doelkaart en beats | zie upgradeplan | S | niet gedaan |

## Vervolg 21-11 (branch aaa-vervolg-21-11)

- **M08 Fatbikes ontwijken** (`game/js/fatbikedodge.js`, ingehaakt in `missionlanes.js`): zes tot acht golven langs de baan (tegemoet, kruis, rij, kruis, achter, ...), elke golf een tikje sneller; de teller **Ontweken: n · Geraakt k/2** per speler; bij twee treffers valt de speler om (zonder letsel, geen dood) en begint het derde deel van de baan opnieuw (+15 s); wie blijft staan krijgt een colonne van achteren; halverwege roept de fatbike-koerier. Hint met toetsplaatjes (`{A}` en `{D}`). Samen spelen: tellers per speler, de groep loopt samen, wie als eerste te voet bij Oma Trijntje is laat de missie slagen; bij een herstart wordt alleen het lichaam van dit apparaat teruggezet. **Bewezen:** `fatbikedodge_test` (golven, teller, herstart, tempo, slagen, determinisme, baan van 600 m), `missionlanes_test`, `missionstats_test`. **Niet bekeken:** hoe het eruitziet en aanvoelt (kruisende fietsen langs gebouwen, de herstartplek) en de camera.
- **Binnenmissies (M03 en de andere kamerstappen):** `scripts/binnenmissies_test.mjs` (96 controles) loopt alle stappen met `set` na en de data van de acht kamers. Inpakken (M27) kreeg beats en een nasleep (de enige binnenmissie die er nog geen had). **Niet gedaan:** de garage-binnenset voor M02 (M) en beeld van de kamercamera.
- **Duivenspot en museum:** `hudstack.js` zet de spotopdracht, de uitleg en de hoogtekaart onder elkaar; `pigeonguide.js` gebruikt hem voor opdracht en uitleg. **Niet gedaan:** ondertitel en naamplaten zitten niet in de stapel (onderkant van het scherm en sprites in de wereld), en de hoogtekaart is als kaartsoort voorzien maar de duivenmodus tekent zijn hoogte nog in het eigen paneel; geen beeld.

## #963: wachten in een cirkel

Er is geen lege cirkel meer: een `hold`-stap heeft sinds eerdere rondes een ring die oplicht, spullen eromheen en op verzoek een wachtfiguur. Deze ronde erbij: de clips `telefoon` (hand tegen het oor, schuin hoofd) en `praten` (beide handen mee, knikken) in `idleclips.js`; de prop `bordje` (A-bord met kegel, zonder tekst); `wacht: { maat: true }` zet een tweede wachtende naast de eerste, ze praten en luisteren om de beurt met gelijke beurtlengtes. De eerste figuur (kleur, plek, rooster) blijft per seed gelijk met of zonder maat. In akte 1 en 2 zijn er verder geen kale `hold`-stappen: M03 wacht in de binnenset (geen ring, wel de wachtrij), M11 heeft zijn figuren. Zie [verhaal/TTS-ACHTERSTAND-21-11-alleen-tekst.md](verhaal/TTS-ACHTERSTAND-21-11-alleen-tekst.md) voor de nieuwe tekst.

## Samen spelen (per missie)

Alle nieuwe onderdelen zijn lokaal beeld bij de speler die de missie of stap draait; er gaat niets over het net en er wordt niets in de wereld, de beloning of de voortgang geschreven (per speler, #429). De opener van de missie speelt, een gast die Meedoen? kiest ziet de beats via zijn eigen start van dezelfde missie; wie wegvalt of later aansluit mist alleen een zin of een prop. Beloning staat per speler vast zoals voorheen (`coopmissie.js`); de nasleep-rij is alleen tekst op de eigen uitslagkaart.

## Niet gedaan

- **Camera-momenten** (punt 3): geen nieuwe openings- of slotpans; de pan-budgetregel is dus niet geraakt. De bestaande finishcamera van M05 blijft. Kandidaten: finishcam M07, Ebbingebrug M08, kerktuin M10 (hangen aan `cinematics.js`, niet aangeraakt in dit perf-venster).
- **Beeld**: geen Electron-run, dus alle nieuwe aankleding, beats en de tweede wachtende zijn **nog niet bekeken**. Of de plannen passen op de echte plek (tegen gebouwen, water en wegen) controleert alleen `missiedecor.js` zelf (`spot()`), niet een beeld.
- Fotokaart M04, lekkende banden M07, cinedrive M09, bieten-SFX (A1), reisstukken (T1, T2), garage-binnenset M02.
- De proefspeler en `missietempo_test` (die vraagt gevendorde three) zijn niet gedraaid.
