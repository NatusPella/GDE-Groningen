# Radiozenders: kiezen tussen zenders zonder herhaling (21-11)

> **Ontwerp en naslag.** Het besluit staat in [ADR 0046](../.specs-fire/standards/adr/0046-radiozenders-met-eigen-pool-en-anti-herhaling.md); de muziekregels in [`mechanica.md`](../.specs-fire/standards/mechanica.md) en [MUZIEK.md](MUZIEK.md); de Samen-regel in [COOP-GAST.md](COOP-GAST.md). Bij tegenspraak wint de spec.

Tot nu toe was er één zender, G-Music. De speler kan nu kiezen uit zenders met elk een eigen pool nummers, een eigen DJ en een eigen sfeer. De code staat in `game/js/radiochannels.js` (puur, getest; "channels" in de code, "station" is al de naam van een pool in `musicpick.js`), `game/js/radio.js` (de keuze en de praatjes), `game/js/audio/radio.js` (de nummers) en `game/js/radiokeuze.js` (het menu).

## De zenders

| Zender | DJ | Pool | Programma | Te kiezen |
|---|---|---|---|---|
| G-Music | Geesje | alle nummers | volgt de speltijd: ochtend, dag, avond, nacht (zoals voorheen) | altijd |
| Nachtstreek | Rikus | ballads (12): rustig, voor de avond | één programma, dag en nacht: Rikus en de oude-radiofilter | altijd |
| Nachtjazz Radio | Meneer Fluweel | rustig (6): de zachtste ballads zonder spookgeluid, uit dezelfde nummers als Nachtstreek | één programma: DJ, weer | altijd (tot er echte jazz of klassiek is: dan eigen stijl `jazz`) |
| Wierde Radio | Boer Harm | volks (11): de streek, het erf, de klompen | één programma: DJ, weer, koeien | altijd |
| Tokkie Beats | DJ Bonkie | hiphop en dance (11) | één programma: DJ, nieuwsfragment | altijd |
| Ruisradio 108,7 | Meneer Ruis | spook (6): de nachtelijke nummers | één programma: DJ-regels in de ruis | pas na het geheimpje `ufo` (de lichtjes boven Zernike) |
| Veenvuur FM | Zware Dieuwke | metal (0 van de 6 nodig) | één programma: DJ, fragment, DJ | "Binnenkort" tot er zes metalnummers zijn goedgekeurd; zichtbaar vanaf de start, zie [MUZIEK-METAL-22-11.md](MUZIEK-METAL-22-11.md) |
| Radio Noordkust | Wadwind Wil | kust (2 van de 6 nodig) | gepland | "Binnenkort" tot er zes kustnummers zijn (C68 in de muzieklijst) |

Alle namen zijn verzonnen. De DJ-regels (`lines` in `radiochannels.js`) zijn tekst met de zachte mompelstem en een ondertitel, zoals de reclames; er is geen nieuwe opname bij. De praatsoorten van G-Music (nieuws, verkeer, weer, koeien) blijven bij G-Music; een andere zender gebruikt alleen de soorten die in zijn programma staan.

## Pools uit het manifest

`manifest.json` blijft zoals hij is. Een nummer hoort bij een zender via `STYLES` (bestandsnaam zonder `.mp3` naar stijlen: hiphop, dance, pop, volks, ballad, spook, kust), afgeleid van de stijlprompts in `verhaal/MUZIEK-LYRICS-21-11.md` en de acts. Een nummer mag meer stijlen hebben ("Letste bus noar nargens" is ballad en volks). Een nieuw nummer zonder regel blijft op G-Music. De test eist dat elke regel een nummer uit het manifest noemt.

Een zender met minder dan `minPool` (6) nummers is er niet: "Binnenkort" in de lijst (niet te kiezen), en nooit aangevuld met nummers van een andere zender. Een geheime zender staat pas in de lijst als hij gevonden is. Een bewaarde keuze die niet (meer) open is, wordt G-Music.

## Anti-herhaling

1. **Eén geschiedenis** voor alle zenders (`gde-radio-history`, blijft bewaard): wisselen van zender geeft niet het nummer dat net speelde.
2. **Het geheugen van N nummers:** 60% van de pool, nooit de hele pool (`memorySize`, het venster van `pickTrack`). Bij 39 nummers 23, bij 6 nummers 3.
3. **De minutenregel** per zender (`minMinutes`, 12 tot 20 minuten bij ongeveer 3 minuten per nummer): wat in die tijd speelde, komt niet terug zolang er iets anders over is. Is er niets anders, dan telt alleen het geheugen; een kleine pool loopt nooit leeg.
4. **Rotatie:** een nummer dat langer niet speelde, weegt zwaarder; dezelfde act twee keer achter elkaar weegt lichter (ongewijzigd, `trackWeight`).

De simulatie in `scripts/radiochannels_test.mjs` draait 600 nummers per zender en eist: nooit binnen het geheugen, nooit binnen de minutenregel zolang de pool het toelaat, elk nummer van de pool komt aan de beurt, nooit twee keer hetzelfde achter elkaar, ook niet bij wisselen van zender.

## De radio in een voertuig (22-11, #988)

De radio bestaat ook buiten het voertuig (de wereldradio: de laatste keuze in de wereld, `gde-radio-zender`). Zodra je instapt, hoor je de zender die bij het voertuig past, en die kun je dan zelf wisselen (Shift+N, of het menu en de D-pad). Stap je uit, dan komt de wereldradio terug zoals hij was. De tabel staat in `game/js/radiovehicle.js` (puur, getest in `scripts/radiovehicle_test.mjs`); de koppeling in `game/js/radio.js` (`updateRadioVehicle`).

| Voertuigsoort | Voorkeur (in volgorde) | Terugval | Nu |
|---|---|---|---|
| Trekker, quad, maaidorser, laadmachine, trekker-limo (`boer`) | Wierde Radio, dan Ruisradio (alleen als gevonden) | G-Music | Wierde Radio |
| Sportwagen, suv, taxi (`luxe`) | Nachtjazz Radio, dan Nachtstreek | G-Music | Nachtjazz Radio |
| Fatbike, step, brommer, motor, opgevoerde auto, go-kart (`tokkie`) | Tokkie Beats | G-Music | Tokkie Beats |
| Bus, midibus, trein, tram (`ov`) | G-Music | G-Music | G-Music |
| Vrachtwagen, bestelbus, kluiswagen (`zwaar`) | Veenvuur FM | de wereldradio blijft (geen G-Music) | de wereldradio zolang Veenvuur FM Binnenkort is |
| Boot, zeilboot, rondvaartboot (`boot`) | Radio Noordkust, dan Nachtstreek | G-Music | Nachtstreek (Noordkust is Binnenkort: te weinig kustnummers) |
| Helikopter, vliegtuig (`lucht`) | G-Music | G-Music | G-Music |
| Politie, ambulance, politiepaard (`dienst`) | geen eigen zender: de wereldradio blijft | n.v.t. | de wereldradio, zoals voorheen |
| Gewone auto, bestelbus, vrachtwagen, snackwagen (`auto`) | geen eigen zender: de wereldradio blijft | n.v.t. | de wereldradio |
| Gewone fiets (`fiets`) | geen eigen zender: de wereldradio blijft | n.v.t. | de wereldradio |

Regels:

1. **Eigen keuze wint.** Kies je in een voertuig zelf een zender, dan onthoudt het spel dat per voertuigsoort (`radioVehicle` in `gde-settings`, niet in de save; een oud bestand zonder het veld wordt leeg, elke soort valt dan terug op de tabel). Een onthouden zender die niet (meer) te kiezen is, telt niet.
2. **Alleen wat er is.** De tabel kiest alleen uit de open zenders (genoeg nummers, `minPool`); een geheime zender alleen na het geheimpje `ufo`; een Binnenkort-zender nooit. Alles wat de speler ziet is dus een zender die hij ook in de lijst heeft.
3. **Buiten blijft buiten.** Een zender die het voertuig koos wordt nooit als wereldkeuze bewaard; bij het uitstappen komt de laatste keuze in de wereld terug (is die niet meer open: G-Music). Stond de radio uit, dan blijft hij uit bij in- en uitstappen.
4. **Politie en ambulance:** de bestaande regels blijven; er is geen aparte stilte of zender bij gebouwd. Wil de eigenaar daar stilte, dan is dat een eigen besluit (een regel `silent` in de tabel).
5. **Nachtjazz Radio is een voorlopige zender.** Er zijn nog geen echte jazz- of klassieke nummers. De zender draait de zachtste ballads van Nachtstreek (stijltag `rustig`, 6 nummers: Suikerbuiken in de nacht, Oosterpark is m'n droom, Kleur in de Wind, Goud in de Nacht, Zilverglans op het Asfalt, Letste bus noar nargens). Zodra er jazz of klassiek is, krijgt de zender een eigen stijl en verdwijnt de tag.

**Melding.** Bij het instappen, uitstappen (als de zender wisselt) en bij elke wissel toont de radiokaart (zone E, het aflopende balkje) bovenaan "zendernaam · DJ-naam" en eronder de titel en artiest van het lopende nummer. Bij een wissel is er nog geen titel: dan staat de ondertitel van de zender er, en zodra het nieuwe nummer start, komt de titel eronder met dezelfde zenderregel. Elke regel is kort (34, 38 en 34 tekens, met een beletselteken). Bij de snelheidsmeter staat een klein icoon met de zendernaam; hij licht ca. 1,8 s op bij een wissel (overgang hooguit 250 ms).

**Controller.** In een voertuig is er nog altijd geen vrije knop (#495): daar blijft de zender kiezen via het menu (D-pad links en rechts in de lijst). Een korte-druk-oplossing is niet gebouwd, om de besturing niet te verstoren.

**Samen spelen.** De radio is lokaal per speler. In een gedeeld voertuig geldt de zender van de bestuurder voor het voertuig (zijn voertuigstart of eigen keuze); een passagier volgt hem (`channelForPlayer` met `start`). Niet gebouwd: het bericht van bestuurder naar passagiers, de stemknop en de koppeling voor een bijrijdersstoel.

## Bediening

- **Instellingen > Geluid:** onder de radioschakelaar staat de lijst met zenders (DS3: rijen in het designsysteem, de toets in de knop). Omhoog en omlaag (D-pad of pijlen) lopen door de rijen, links en rechts (D-pad of pijlen) gaan naar de vorige of volgende zender, Enter of A kiest. Een zender kiezen zet de radio aan.
- **In het spel (te voet en in elk voertuig):** N zet de radio aan of uit, Shift+N gaat naar de volgende zender en toont de DJ met zijn ident. Q en E blijven vrij: Q is achterom kijken en E in- en uitstappen, en in het menu wisselen ze tabbladen.
- **Controller in een voertuig:** de voertuigindelingen hebben geen vrije D-padknop (#495), dus daar kies je de zender in het menu. Dat is bewust niet opgelost met een nieuwe knop.

## De geheime zender

Ruisradio 108,7 komt vrij door het geheimpje `ufo` van `geheimen.js` (de schotel boven het Zernikecomplex, in de save). Er is geen nieuwe vlag. Zodra het geheimpje er is, komt eenmalig de melding "Nieuwe zender gevonden" (per apparaat bewaard in `gde-radio-zender`, naast de gekozen zender). Een bestaande save die het al heeft krijgt die melding één keer.

## Samen spelen

- **Eigenaar:** de zender is van de speler zelf (lokaal, `gde-radio-zender`, alleen dit apparaat); er gaat niets over het net, zoals bij alle muziek. Wie de radio uitzet houdt stilte.
- **Gedeeld voertuig:** de bestuurder kiest de zender van het voertuig. Een passagier volgt hem (standaard) of kiest voor zichzelf, en kan stemmen op een zender; de meeste stemmen geven een suggestie, een gelijk aantal geen. De bestuurder beslist: een stem is nooit een bevel. Wie uitstapt of wegvalt neemt zijn stem mee; het voertuig houdt zijn zender; wie later instapt volgt de zender van de bestuurder.
- **Beloning en voortgang:** geen. De geheime zender hoort bij het geheimpje van de speler zelf (per speler, #429); een gast zonder het geheimpje ziet de zender niet, ook niet als de bestuurder hem draait (hij volgt dan naar G-Music).
- **Dekking:** de pure regel (`channelForPlayer`, `tallyVotes`, `voteForChannel`, `dropVote`) staat in `scripts/radiochannels_test.mjs`. **Gebouwd op 22-11 (Samen-sweep):** het JSON-bericht `zender` (PROTO blijft 2, besluit conservatief: een klein bericht naast `doel` en `zin`, geen veld in het voertuigrecord) in `game/js/radiogroup.js` en `coopnet.js`, met de haak in `radio.js` (`setRadioGroup`, `groep: true`) en een eigen test `scripts/radiogroup_test.mjs`. Een passagier die zelf een zender kiest stemt daarmee op die zender; een aparte stemknop is er niet. Afspelen in een echt venster is nog niet bekeken (`allesstap radio` in de testbank, docs/SAMEN-SWEEP-22-11.md).

## Wat niet getest is

Niets van dit is in beeld of met geluid bekeken of beluisterd: de lijst in Instellingen > Geluid, de toets-in-de-knop-glyphs, de ident van de DJ, de overgang tussen twee zenders (het volgende nummer start direct) en de wachtrij na een wissel. Alleen de pure regels, de simulatie van de rotatie en de bronnen zijn in node gecontroleerd.

Voor de voertuigradio (#988) geldt hetzelfde: niets is in beeld of met geluid bekeken. Nog te bekijken: de radiokaart en het balkje bij het instappen, het icoon bij de snelheidsmeter, de overgang als je instapt (het nieuwe nummer start direct), en of Nachtjazz Radio en Tokkie Beats goed klinken met hun nummers. Nog te beluisteren en te kiezen door de eigenaar: een echte jazz- of klassieke pool, en of politie en ambulance stil moeten zijn.
