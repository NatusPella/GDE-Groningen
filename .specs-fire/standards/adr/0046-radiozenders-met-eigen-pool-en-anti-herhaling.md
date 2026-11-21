# 0046 - Radiozenders: een keuze uit zenders met eigen pool, zonder dat het gaat herhalen

- **Status:** voorgesteld (eigenaarsbesluit 21-11: een radiokeuze mag, alleen als herhaling niet storend wordt)
- **Datum:** 2026-11-21
- **Spec:** `docs/RADIOZENDERS-21-11.md`, `.specs-fire/standards/mechanica.md`
- **Verwant:** `docs/MUZIEK.md`, `docs/verhaal/MUZIEKLIJST-21-11.md` (C63 tot C68), `docs/COOP-GAST.md`, ADR 0040 (DS3)

## Context

Er was één zender, G-Music, met vier programma's naar de speltijd. De eigenaar wil een keuze uit logische zenders (hits, een rustige zender, een streekzender, een geheime zender). Het grote risico is herhaling: er zijn 38 tot 39 G-Music-nummers (ongeveer 1 uur 45), en elke zender die maar een deel daarvan draait, herhaalt sneller. Wie een uur rijdt, hoort een pool van zes nummers na twintig minuten opnieuw.

## Besluit

1. **Een zender is data** (`game/js/radiochannels.js`, puur): naam, DJ, ident (een korte tekstjingle met de zachte mompelstem en een ondertitel; geen nieuwe opname), pool, minimale poolgrootte, programma en eventueel een ontgrendeling.
2. **De pool komt uit het bestaande manifest** op stijl (`STYLES` per bestandsnaam: hiphop, pop, volks, ballad, spook, kust) of op wat het manifest zelf bij een zender zet (`stations`). Het manifest en de bestanden blijven zoals ze zijn.
3. **Te kleine pool: geen zender.** Onder `minPool` (6, gelijk aan `MIN_POOL`) staat een zender als "Binnenkort" in de lijst en is hij niet te kiezen; een geheime zender staat er niet tot hij gevonden is. Een eigen zender leent nooit nummers van een andere (anders is het de oude pool met een nieuwe naam).
4. **Anti-herhaling op drie lagen:** één geschiedenis voor alle zenders samen (`gde-radio-history`, blijft bewaard), zodat wisselen van zender niet het nummer geeft dat net speelde; een venster van 60% van de pool (nooit de hele pool, nooit het laatste nummer); en een minutenregel per zender (`minMinutes`) die alleen telt zolang er iets anders over is, zodat een kleine pool nooit leegloopt.
5. **G-Music blijft de standaard en volgt het dagprogramma** (ochtend, dag, avond, nacht). Een andere zender heeft één eigen programma, dag en nacht.
6. **De geheime zender (Ruisradio 108,7) hangt aan een bestaand geheimpje** (`ufo` in `geheimen.js`, in de save), geen nieuwe vlag en geen nieuw opslagveld. Een nieuw apparaat met een save die het al heeft, krijgt de melding één keer.
7. **De keuze is lokaal per speler** (`gde-radio-zender`, alleen dit apparaat). In een gedeeld voertuig kiest de bestuurder, een passagier volgt of kiest zelf en kan stemmen; de bestuurder beslist (zie het doc).
8. **Bediening:** Instellingen > Geluid (lijst, D-pad omhoog/omlaag door de rijen, links/rechts de vorige of volgende, A kiest) en Shift+N in het spel. Q en E blijven vrij: in een voertuig is Q achterom kijken en E in- en uitstappen, en in het menu wisselen ze tabbladen.

## Afgewezen

- **Alleen meer programma's op G-Music.** Dat verandert niets aan wat de speler kan kiezen en lost herhaling niet op.
- **Per zender eigen audiobestanden.** Mag niet (geen nieuwe audio maken of ophalen) en is niet nodig: stijl en tags op bestaande nummers volstaan.
- **Pools aanvullen met leningen van G-Music.** Dat verbergt een te kleine pool in plaats van hem te tonen, en geeft de herhaling die we willen voorkomen.
- **Een nieuwe ontgrendelvlag in de save voor de geheime zender.** De save groeit, het migratiepad is extra werk, en het geheimpje staat er al.
- **Een zender kiezen met Q en E, of met een eigen D-padknop in het voertuig.** Q en E zijn bezet (zie 8); de voertuigindelingen van het pad hebben geen vrije D-padknop meer (#495).
- **Een zender over het net synchroniseren voor alle spelers.** Muziek speelt op elk apparaat zelf af; er komt geen netwerkbericht voor muziek.

## Gevolgen

- Een nieuw nummer in het manifest zonder regel in `STYLES` blijft alleen op G-Music; een nieuwe stijlregel vergroot een pool en kan een zender van "Binnenkort" naar open brengen. De test `scripts/radiochannels_test.mjs` bewaakt dat elke stijlregel een nummer heeft en dat elke open pool groot genoeg is.
- Radio Noordkust (C68) staat als "Binnenkort" tot er zes kustnummers zijn; dat is een besluit van de eigenaar over nieuwe muziek, geen codewerk.
- De Samen-koppeling van de voertuigzender (wie hoort wat) is puur ontworpen en getest; het bericht dat de keuze van de bestuurder naar de passagiers brengt is nog niet gebouwd (zie het doc).
