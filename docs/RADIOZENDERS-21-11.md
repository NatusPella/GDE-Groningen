# Radiozenders: kiezen tussen zenders zonder herhaling (21-11)

> **Ontwerp en naslag.** Het besluit staat in [ADR 0046](../.specs-fire/standards/adr/0046-radiozenders-met-eigen-pool-en-anti-herhaling.md); de muziekregels in [`mechanica.md`](../.specs-fire/standards/mechanica.md) en [MUZIEK.md](MUZIEK.md); de Samen-regel in [COOP-GAST.md](COOP-GAST.md). Bij tegenspraak wint de spec.

Tot nu toe was er één zender, G-Music. De speler kan nu kiezen uit zenders met elk een eigen pool nummers, een eigen DJ en een eigen sfeer. De code staat in `game/js/radiochannels.js` (puur, getest; "channels" in de code, "station" is al de naam van een pool in `musicpick.js`), `game/js/radio.js` (de keuze en de praatjes), `game/js/audio/radio.js` (de nummers) en `game/js/radiokeuze.js` (het menu).

## De zenders

| Zender | DJ | Pool | Programma | Te kiezen |
|---|---|---|---|---|
| G-Music | Geesje | alle nummers | volgt de speltijd: ochtend, dag, avond, nacht (zoals voorheen) | altijd |
| Nachtstreek | Rikus | ballads (12): rustig, voor de avond | één programma, dag en nacht: Rikus en de oude-radiofilter | altijd |
| Wierde Radio | Boer Harm | volks (11): de streek, het erf, de klompen | één programma: DJ, weer, koeien | altijd |
| Ruisradio 108,7 | Meneer Ruis | spook (6): de nachtelijke nummers | één programma: DJ-regels in de ruis | pas na het geheimpje `ufo` (de lichtjes boven Zernike) |
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
- **Dekking:** de pure regel (`channelForPlayer`, `tallyVotes`, `voteForChannel`, `dropVote`) staat in `scripts/radiochannels_test.mjs`. **Nog niet gebouwd:** het bericht dat de keuze van de bestuurder naar de passagiers brengt (een veld in het voertuigrecord of een EXTRA-bericht) en de stemknop voor passagiers; dat vraagt een protocolkeuze van de coördinator (PROTO blijft 2).

## Wat niet getest is

Niets van dit is in beeld of met geluid bekeken of beluisterd: de lijst in Instellingen > Geluid, de toets-in-de-knop-glyphs, de ident van de DJ, de overgang tussen twee zenders (het volgende nummer start direct) en de wachtrij na een wissel. Alleen de pure regels, de simulatie van de rotatie en de bronnen zijn in node gecontroleerd.
