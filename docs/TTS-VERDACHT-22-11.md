# TTS verdachte clips 22-11: korte luisterlijst

De eigenaar luistert niet naar alle 896 nieuwe stemclips van tts-ronde2 (zie [TTS-ACHTERSTAND-21-11.md](TTS-ACHTERSTAND-21-11.md)). `node scripts/tts_verdacht.mjs` meet elke clip, rangschikt op verdachtheid en maakt **één pagina** met 40 clips: de top 30 plus 10 willekeurige uit de rest (seed 2211). Pagina: [TTS-VERDACHT-22-11.html](TTS-VERDACHT-22-11.html) (relatieve paden). Per clip: audio-speler, de regel, de spreker, de maten, en de knoppen Goed en Slecht met onderaan een kopieerbare JSON-uitslag. Een variant met `file://`-paden komt buiten git in de tijdelijke map.

## Methode

De clips zijn de 896 bestanden die `ff984eb61` (merge van tts-ronde2) aan `game/audio/voicelines` toevoegt. Elke clip wordt met ffmpeg naar 22,05 kHz mono gedecodeerd en gemeten. Elke vlag geeft punten; de score is de som plus een fijnslijper (hoe ver buiten de drempel).

| Maat | Drempel | Punten |
|---|---|---|
| `eindBurst` (ruisachtig_scan): ruis-einde | burst = ja | 6 |
| `popBegin` (pop_begin): klik in de eerste 80 ms | pop = ja | 6 |
| Clipping | piek >= -0.1 dBFS met 3 of meer monsters op 0,999 | 4 |
| Duur t.o.v. tekstlengte | tekens per seconde onder het 1e of boven het 99e percentiel van de spreker (sprekers met minder dan 20 clips: gezamenlijke verdeling) | 3 |
| Stilte aan het begin | meer dan 0,35 s onder -45 dBFS | 2 |
| Stilte aan het eind | meer dan 0,50 s onder -45 dBFS | 2 |
| RMS t.o.v. dezelfde spreker | meer dan 2.5 standaarddeviaties van het gemiddelde (RMS over de actieve frames) | 2 |
| Ruisframes (ruisachtig_scan `scoreClip`) | aandeel >= 0.25 | 3 |
| Mogelijk herstelde clip (staart_trimmer) | stilte aan het begin van 0,10 tot 0,35 s (de TTS-keten laat 0,04 s; een pop-begin dat op nul is gezet laat meer) | 1.5 |
| Groningse spreektekst door Claude aangevuld | de 9 Tammo-regels in `scripts/gronings_spoken.json` (commit 0f53a597c) | 3 |

## Uitslag over alle 896 clips

- Clips zonder enige vlag: **837** van 896.
- Vlaggen: getrimd 22, rms 22, cps 9, gronings 9.
- Ruis-einde: 0, pop-begin: 0, clipping: 0.
- Mogelijk herstelde clips (heuristiek op de stilte aan het begin): 22. De 9 echt herstelde clips zijn niet te achterhalen: de reparatie draaide vóór de commit en het manifest-dur klopt (verschil ten hoogste 0,005 s), dus de dur-afwijking werkt niet als merkteken.
- Groningse regels (lang gro, spreektekst aangevuld): 9 (verwacht 9).

### Per spreker

Tekens per seconde (gemiddelde, standaarddeviatie, 1e tot 99e percentiel) en RMS in dBFS over de actieve frames.

| Spreker | Clips | Tekens/s gem. | sd | Grens 1e tot 99e | RMS gem. | sd |
|---|---|---|---|---|---|---|
| Anita | 388 | 13,2 | 3,7 | 5,2 tot 20,7 | -17,7 | 0,7 |
| Hilbrand | 143 | 17,0 | 2,9 | 11,0 tot 23,8 | -18,1 | 0,6 |
| Tammo | 138 | 16,0 | 3,2 | 5,9 tot 21,8 | -17,7 | 0,7 |
| Roelie | 134 | 17,0 | 2,5 | 11,6 tot 22,8 | -18,0 | 0,7 |
| Jelle Terpstra | 46 | 13,4 | 2,3 | 6,5 tot 18,8 | -17,7 | 0,5 |
| Mem Terpstra | 16 | 13,6 | 2,0 | 5,4 tot 22,7 (gezamenlijk) | -17,8 | 0,7 |
| Durk | 9 | 10,6 | 1,7 | 5,4 tot 22,7 (gezamenlijk) | -18,0 | 0,7 |
| Beppe | 8 | 11,7 | 1,3 | 5,4 tot 22,7 (gezamenlijk) | -17,5 | 0,4 |
| Douwe | 6 | 10,0 | 2,5 | 5,4 tot 22,7 (gezamenlijk) | -17,9 | 0,8 |
| Berend Bos | 2 | 15,1 | 0,6 | 5,4 tot 22,7 (gezamenlijk) | -17,6 | 0,0 |
| Loketbediende | 2 | 16,6 | 1,0 | 5,4 tot 22,7 (gezamenlijk) | -17,8 | 0,1 |
| Rikus | 2 | 14,0 | 1,8 | 5,4 tot 22,7 (gezamenlijk) | -18,5 | 0,3 |
| Oma Trijntje | 1 | 14,6 | 0,0 | 5,4 tot 22,7 (gezamenlijk) | -17,9 | 0,0 |
| Ubbo | 1 | 15,9 | 0,0 | 5,4 tot 22,7 (gezamenlijk) | -17,3 | 0,0 |

### De top 30 (op de pagina)

| # | Spreker | Regel | Score | Vlaggen |
|---|---|---|---|---|
| 1 | Roelie | Daar zit kracht achter. | 5,9 | cps, rms |
| 2 | Tammo | Dan zal het wel kloppen. | 5,6 | cps, rms |
| 3 | Tammo | Wist je dat het ook met het OV kan? Klik op de kaart en kies Reis erhe | 4,7 | getrimd, gronings |
| 4 | Hilbrand | Straf! En nu is het stil. | 3,4 | cps |
| 5 | Roelie | Ik ga even in de statistieken kijken. Dan weet ik het zeker. | 3,4 | cps |
| 6 | Anita | Ik eet hem toch op. Voor de vriendschap. | 3,3 | cps |
| 7 | Anita | Ik heb een schoonmaakrooster gemaakt. | 3,3 | cps |
| 8 | Anita | Hoeveel woorden waren het ook alweer? | 3,3 | cps |
| 9 | Anita | Oma heeft alle vrienden met hun ingrediënten naar de schuur geroepen.  | 3,3 | cps |
| 10 | Hilbrand | Het spel verplaatst zich naar de andere kant. | 3,3 | cps |
| 11 | Tammo | Geen zin om zo ver te rijden? Pak de bus of de trein: de kaart laat zi | 3,2 | gronings |
| 12 | Tammo | Dat is een heel eind. Via de kaart neemt een taxi je zo mee. | 3,2 | gronings |
| 13 | Tammo | Ver weg hè? Er rijdt ook een bus, of kies op de kaart voor een taxi. | 3,1 | gronings |
| 14 | Tammo | "Iemand uit Friesland." Dat was zijn oma. | 3,1 | gronings |
| 15 | Tammo | Ver weg hè? Open de kaart, daar bel je een taxi. | 3,1 | gronings |
| 16 | Tammo | Dan rijdt hij nauwelijks voor jou. Een snackwagen die nauwelijks rijdt | 3,1 | gronings |
| 17 | Tammo | Instappen met {E} bij de kop. {W} is gas, {S} is rem, {H} is de fluit. | 3,1 | gronings |
| 18 | Tammo | Hij hangt een vlag aan onze toren voor zijn oma. | 3,1 | gronings |
| 19 | Anita | Mam. | 3,0 | rms |
| 20 | Anita | Wedstrijd? | 2,8 | rms |
| 21 | Anita | Hij zegt niks. | 2,8 | rms |
| 22 | Tammo | Twee. | 2,8 | rms |
| 23 | Tammo | Ik. Morgen. | 2,6 | rms |
| 24 | Anita | Wat is er met de rem? | 2,6 | rms |
| 25 | Anita | Je lacht naar de soep. | 2,5 | rms |
| 26 | Anita | Ik heb de auto. | 2,5 | rms |
| 27 | Jelle Terpstra | ...Ze houdt hem altijd warm. | 2,5 | rms |
| 28 | Mem Terpstra | Het waait. Jas. | 2,5 | rms |
| 29 | Hilbrand | Rustig opbouwen, kijk eens hoe ze het veld verdelen. | 2,5 | rms |
| 30 | Anita | Niks. | 2,4 | rms |

### De steekproef (10, seed 2211)

| Spreker | Regel | Score |
|---|---|---|
| Hilbrand | En hij zit! De bal ligt in het net. Prachtig! | 0,2 |
| Anita | Waar gaat Jelle maandag heen? | 0,3 |
| Tammo | Blijf bij de wagen: Henk bouwt het luik in. | 0,1 |
| Roelie | Dat doe je niet vaak. Maar vandaag deed je het wel. | 2,4 |
| Anita | Dan gaan wij daar ook heen. Roelfien wacht bij Midwolda. | 0,1 |
| Anita | Je bedankt altijd de chauffeur. | 0,1 |
| Tammo | Boeken in kleine dozen. Blijf bij de kast staan tot hij leeg is. | 0,0 |
| Anita | Ik ben de Koningin van de Friteuse. Rijd mij naar de zon. | 0,1 |
| Anita | Rikus zegt dat het zomer blijft. | 0,3 |
| Anita | Nog vijf kilometer. De hele colonne, de Grote Markt op. | 0,1 |

## Besluit voor de rest

De overige 856 clips gelden als **automatisch goedgekeurd**. Op alle 896 clips zijn ruis-einde (0), pop-begin (0) en clipping (0) schoon, en een ruisaandeel boven 0,25 komt niet voor (0). Wat buiten de lijst valt heeft hoogstens een lichte vlag (hoogste score in de rest: 2,4). Dat is een meting en geen oordeel over uitspraak, accent of betekenis: niemand heeft ze beluisterd. Slechte clips uit de lijst worden opnieuw opgenomen met `tts_lines.py`; vindt de eigenaar bij de steekproef zelf fouten, dan vervalt 'automatisch goedgekeurd' en volgt een bredere luisterronde.
