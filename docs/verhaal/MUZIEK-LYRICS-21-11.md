# Radionummers met lyrics over Groningen (21-11)

Twaalf nieuwe nummers voor G-Music, op verzoek van de eigenaar, om in Gemini ("Muziek maken", gemini.google.com, het account van de eigenaar) te laten maken. Alle namen zijn verzonnen; plaatsen zijn echt. Altijd zomer. Geen echte merken, bedrijven of personen, geen leed en geen gaswinningsgrappen (constitution 2, 3 en 6). "Grunn", nooit "de Grunn". De hints verwijzen naar plekken en missies uit het spel; wie ze niet herkent, hoort gewoon een grappig nummer. Zie ook [MUZIEKLIJST-21-11.md](MUZIEKLIJST-21-11.md) (cue C66, de dagpool).

## Stand (21-11)

| Nr | Titel | Status |
|---|---|---|
| 1 | Zunne op de Ring | gemaakt in Gemini (2:03), nog niet gedownload |
| 2 tot 12 | zie hieronder | nog niet gemaakt |

Waarom gestopt na nummer 1: het downloaden van een bestand vraagt uitdrukkelijk akkoord van de eigenaar zelf in het gesprek (niet via een bericht van een andere agent), en de mp3's moeten buiten de repo worden opgehaald (de downloadmap van de browser). Zonder dat akkoord zijn meer nummers maken zinloos; ze staan wel als prompt klaar. Het gesprek met nummer 1 staat in het Gemini-account van de eigenaar (gesprek "Zunne op de Ring", `gemini.google.com/app/87d639d5db14af82`). De Gemini-optie Duur "Standaard" gaf 2:03; "Kort" is korter.

Werkwijze per nummer: in Gemini het gereedschap "Muziek maken" kiezen, Duur "Standaard", de prompt hieronder plakken, de track downloaden, de beste kiezen op duur (1,5 tot 3 min) en op ruis en pops (`scripts/qa/audiotap.js` en de bestaande clip-detectoren), daarna naar `game/audio/gmusic/` met een manifestregel (`"nieuw": true`, de zender en `time`) en een regel in `docs/AUDIO-LICENTIES.md`.

## Prompts en lyrics

Bij elk nummer: de stijlprompt, en daaronder de lyrics die in dezelfde prompt komen. Zet de lyrics erin als `[Couplet]`, `[Refrein]`, `[Brug]`.

### 1. Zomerhit: Zunne op de Ring, door Zomerzoet Soezen (nachtpool nee, dag)

Stijlprompt: vrolijke Nederlandstalige zomerhit van ongeveer 2 minuten, 118 bpm, zonnige pop met gitaar, claps en toeters, vrouw en man zingen om beurten.

```
[Couplet] Het is zomer in Grunn, de Ring staat weer vol,
Tammo fietst te laat, Tessa rijdt in een brommobiel.
Bij de Martinitoren sta ik in de rij,
voor een eierbal met saus, en de zon is van mij.
[Refrein] Zunne op de Ring, zunne op de Ring,
alle stoplichten rood, maar we dansen toch.
Zunne op de Ring, zunne op de Ring,
geen haast in Grunn, het is zomer en dat is goed.
[Couplet 2] Bij de Reitdiephaven vaart een skutsje voorbij,
de brugwachter zwaait, maar de brug gaat niet open voor mij.
Tip van mij: draai links bij de Oosterpoort,
daar staat een kermisorgel dat nooit meer ophoudt.
[Refrein] Zunne op de Ring, zunne op de Ring ...
[Outro] Moi Grunn, moi Grunn, de zomer duurt hier lang.
```

Hints: de Ring, de Martinitoren, de eierbal, het skûtsje (M11), de brug, de kermis (M16).

### 2. Pop: Elfde Verdieping, door De Fietstunnels (het autoduet)

Stijlprompt: warme Nederlandstalige pop, 112 bpm, akoestische gitaar, bas, tweestemmig (vrouw zingt het refrein, man zingt "bom, bom" als bas), 2,5 minuut, hoopvol.

```
[Couplet] Ik woon op de derde, jij zegt: ga omhoog,
de lift is stuk maar de trap is niet te hoog.
Tien euro in de pot en een plan op een bon,
we sparen voor een stad, we beginnen bij de gron.
[Refrein] Elfde verdieping, de lift doet het weer,
jij drukt op de knop en ik trek het kleine deel.
Elfde verdieping, de stad ligt plat,
en wij zijn boven, met nul euro en een plan dat nog niet bestaat.
[Couplet 2] Beneden fietst de buurt door de tunnel naar huis,
Oma zwaait vanuit haar keuken, met een koekje en een kruis.
[Refrein] ...
```

Hints: het autoduet van het verhaal (R3.4 en B3.3), de fietstunnels, Oma's keuken.

### 3. Hiphop: Kapsalon Kees en de Vismarkt, door MC Zoutkorrel

Stijlprompt: Nederlandstalige hiphop, 92 bpm, zware bas, scratch, vrolijke trompetsample, mannenstem die snel rapt, humoristisch, geen grof taalgebruik.

```
[Couplet] Ik rap op de Vismarkt, de zon staat zo hoog,
mijn kapsalon smaakt beter dan de buurman z'n toog.
Eierbal in mijn zak en een fiets zonder slot,
de camera's kijken, maar ik ben een dot.
[Refrein] Vismarkt, Vismarkt, alles mag hier lekker,
Vismarkt, Vismarkt, behalve zonder dekker.
[Couplet 2] De traumaduif cirkelt boven ons hoofd,
de fatbike-bende rijdt, maar niemand is verdoofd.
Tip van de rapper: kijk goed naar de lucht,
daar vliegt een kip die alles weet, en niet vlucht.
```

Hints: de Vismarkt, eierbal, camera's (M18), traumaduif (M12), fatbikes (M08).

### 4. Volks: Klompendans bij de Sloot, door Jelle en de Natte Voeten

Stijlprompt: Nederlandstalig volkslied in mineur, 120 bpm, accordeon, viool, klompen als slagwerk, meezingbaar, komisch tragisch.

```
[Refrein] Klompen op, klompen af, hup de sloot in en weer terug,
nat tot aan de knie, maar de zomer is zo mooi.
Klompen op, klompen af, Jelle roept: ik kom zo,
de kikker kijkt me aan en zegt: dit is mijn sloot, dag-ho.
[Couplet] De boer zijn koe die loopt, de koe zijn boer die lacht,
de trekker staat nog stil, het is al weer middernacht.
```

Hints: de sloot, Jelle (carrièretour), de boerderij.

### 5. Rock: Rood Licht Is Een Mening, door De Ringweg Drillers

Stijlprompt: Nederlandstalige rock, 148 bpm, vervormde gitaar, drums, schreeuwerige maar vrolijke zang, 2,5 minuut, achtervolgingsgevoel.

```
[Couplet] De politie draait een rondje, de koffie nog warm,
ik rij mijn eigen weg langs de Diepenring in een boog.
Het rode licht is een mening, geen wet, geen gebod,
de agent zwaait vriendelijk en ik zwaai terug zonder stop.
[Refrein] Rood licht is een mening, groen licht is een wens,
wij rijden door de zomer en de Ring is ons domein.
```

Hints: de achtervolging, de Diepenring, de Ring.

### 6. Ballad: Net Te Dichtbij, door Tessa & Tammo

Stijlprompt: Nederlandstalige ballad, 62 bpm, piano en cello, zacht, een vrouw en man zingen intiem, 3 minuten, geen drama, wel warm.

```
[Couplet] Twee meter te ver, drie stappen te dichtbij,
de ijskast van de buurman en het gras tot aan mijn knie.
Je zegt niets, ik zeg niets, de zomer zegt het wel,
de zon gaat langzaam onder boven Warffum, het is goed zo.
[Refrein] Net te dichtbij om te vragen, te ver om te zwijgen,
wij staan hier met een koekje en we weten het allebei.
```

Hints: de knuffel (akte 5), Tessa en Tammo, de afstand van een meter.

### 7. Zomerhit: Kroket in de Zon, door DJ Frituurpan

Stijlprompt: Nederlandstalige dance-zomerhit, 124 bpm, synthbas, handclaps, vrolijke pitched stem, 2 minuten.

```
[Refrein] Kroket in de zon, kroket in de zon,
de vulling is een raadsel maar het smaakt als een vakantie.
Kroket in de zon, kroket in de zon,
vraag nooit wat erin zit, geniet van het moment.
[Couplet] Bij de snackwagen staat een rij tot aan de brug,
Jelle roept: nog een bestelling, en de saus is nooit te veel.
```

Hints: de snackwagen, Jelle, de brug.

### 8. Volks: De Bietenbende, door Wierde Wind en de Bietenbende

Stijlprompt: Nederlandstalig volkslied, 96 bpm, banjo, accordeon, stampende voeten, meezingrefrein, landelijk, 2 minuten.

```
[Refrein] Bieten, bieten, bieten, ja, de trekker is gestart,
wij oogsten bij de zon en we oogsten met een hart.
Bieten, bieten, bieten, ja, de koeien doen het mee,
de boer zegt: dit is Grunn, en Grunn is nooit klaar.
[Couplet] De maaidorser draait een rondje, de lader staat te wachten,
de dorpsbus rijdt de bocht om met een kar vol buurtbewoners.
```

Hints: de boerderij, de trekker (M10), de bus.

### 9. Pop: Brugwachter Wacht Niet, door Orgel Oosterhaven

Stijlprompt: Nederlandstalige feestpop met draaiorgel en trompet, 128 bpm, vrolijk, kermissfeer, 2,5 minuut.

```
[Refrein] Brug open, brug dicht, de brugwachter kijkt omhoog,
wij wachten op de oever met een ijsje in de hand.
Brug open, brug dicht, hij fluit een liedje voor ons,
het skutsje vaart voorbij en wij zwaaien terug.
[Couplet] Elf bruggen over het water, elf ritmes in de dag,
wie het eerst over de elfde komt, wint een eierbal van mij.
```

Hints: de bruggenrace, het skûtsje, de elf bruggen (akte 4).

### 10. Rock: Naar Boven, Nooit Naar Beneden, door De Martinitoren Ensemble

Stijlprompt: Nederlandstalige stadionrock, 104 bpm, strijkers, pauken, galmende gitaar, meezingrefrein, 2,5 minuut.

```
[Refrein] Naar boven, naar boven, nooit meer naar beneden,
de toren is zo hoog en de stad is zo klein.
Naar boven, naar boven, de wind is zo zacht,
we kijken over Grunn en het is allemaal van ons.
[Couplet] Honderd treden, tweehonderd treden, de benen worden zwaar,
maar boven zie je alles, tot aan de dijk van Warffum.
```

Hints: de Martinitoren, de klimtoren, de uitzichten.

### 11. Hiphop: Fatbike Floris, door Lil Polder

Stijlprompt: Nederlandstalige hiphop, 96 bpm, zware 808-bas, vrolijke fluit, jonge stem, zomers, 2 minuten.

```
[Couplet] Ik rij op mijn fatbike langs de gracht in de zon,
dikke banden, brede schouders, en mijn stuur is een bom.
De kapsalon van Kees is mijn tweede thuis,
en mijn derde thuis is de Vismarkt, waar ik fluit voor mijn buis.
[Refrein] Fatbike Floris, Fatbike Floris, wie rijdt er zo breed?
Fatbike Floris, Fatbike Floris, de stad is te klein.
```

Hints: de fatbikes (M08), de gracht, de kapsalon.

### 12. Ballad: Laagwater Om Middernacht, door Wad en Wolk

Stijlprompt: Nederlandstalige rustige ballad, 56 bpm, glasharmonica, zachte piano, vrouwenstem, 3 minuten, nachtelijk maar zomers.

```
[Couplet] Het water trekt zich terug en de zandplaat blijft stil,
de sterren zijn zo dichtbij dat ik ze bijna kan raken.
Wij lopen op blote voeten, de zomer is nog warm,
en niemand zegt iets, want het is al lang genoeg gezegd.
[Refrein] Laagwater om middernacht, de zee is even weg,
wij lopen door het wad en de wereld wacht op ons.
```

Hints: de zandplaat onder de sterren (akte 2), het wad.

## DJ-teksten (verzonnen namen)

Rikus draait (nachtpool) en Geesje kondigt aan (dagpool); de titelaankondiging gebruikt `GMUSIC_ARTISTS` in `game/js/audio/radio.js`. Bij het koppelen komen de artiesten hierboven in die tabel:

- "Zomerzoet Soezen met Zunne op de Ring, voor wie in de file staat en blij is."
- "MC Zoutkorrel, live van de Vismarkt, met een kapsalon in zijn zak."
- "Jelle en de Natte Voeten, met Klompendans bij de Sloot."
- "Rikus draait: Wad en Wolk, Laagwater om middernacht. Even stil."

Alles zonder echte namen; geen DJ-tekst noemt een echte zender, persoon of merk.

## Koppeling aan de radio (voor als de bestanden er zijn)

Per nummer een regel in `game/audio/gmusic/manifest.json`, zoals de bestaande nieuwe nummers:

```
{ "file": "Zunne_op_de_Ring.mp3", "stations": ["gmusic"], "time": "day", "nieuw": true }
```

Nachtnummers (12, 6, 4) krijgen `"stations": ["gmusic", "nachtstreek"]` en `"time": "night"`. De artiest in `GMUSIC_ARTISTS`. De credits ("gemaakt met Gemini van de eigenaar", plus de verzonnen artiestnamen) in `game/js/audiocredits.js` en `docs/AUDIO-LICENTIES.md`, geen echte namen.

Samen spelen: de radio speelt per speler lokaal af, dus er is geen netwerkbericht en niets te synchroniseren.
