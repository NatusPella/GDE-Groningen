# Muziekronde Radio Noordkust en Nachtjazz Radio (22-11)

Stand: 22 november 2026, branch `muziek-noordkust-22-11`. Besluit eigenaar: Radio Noordkust (nu "Binnenkort") moet live kunnen, en Nachtjazz Radio krijgt eigen rustige nummers. Alle teksten zijn nieuw geschreven, verzonnen en origineel; plaatsen zijn echt, namen van bands en personen niet. Altijd zomer, geen leed, geen gaswinning.

## Stand

**Er zijn in deze ronde geen tracks gegenereerd.** De Claude-in-Chrome-extensie kon gemini.google.com niet bedienen: elke actie op de pagina (schermafdruk, pagina lezen) liep vast op "Script injection timed out" en "Page still loading (executeScript waited 45000ms for document_idle)", in drie verse tabs, ook na meer dan 20 seconden wachten. Dat is een technische blokkade, geen toestemmingsweigering; er is niets omzeild. De prompts staan hieronder met de exacte tekst klaar zodat de eigenaar ze in Gemini ("Muziek maken", Duur "Standaard") kan plakken.

Wat al kan, zonder nieuwe tracks:

| Zender | Pool nu | Status |
|---|---|---|
| Radio Noordkust | 3 nummers met stijl `kust` (Laagwater om middernacht, Zunneschien op t wad, Hooge Lucht) | blijft "Binnenkort": de regel is minstens 6 nummers in de pool (`MIN_POOL`) en deze ronde vraagt er minstens 12; `Binnenkort` blijft in `radiochannels.js` staan tot dat zo is |
| Nachtjazz Radio | 6 nummers met stijl `rustig` | haalt de poolgrens van 6 al; de zes jazzprompts hieronder maken er een echte jazzzender van |

## Koppelen zodra de tracks er zijn (per nummer)

1. Download de mp3, controleer duur (1,5 tot 4 min) en ruis of pops, en zet hem om naar 128 kbps in een eigen lege map, met hetzelfde niveau als de bestaande nummers (zelfde werkwijze als `muziek-gemini5-22-11`, tweede stap van de commit `309931c30`).
2. Zet hem als `game/audio/gmusic/<Titel_met_underscores>.mp3`.
3. Voeg een regel toe in `game/audio/gmusic/manifest.json`: `{ "file": "...", "stations": ["gmusic"], "time": "day", "nieuw": true }` (Noordkust: tijd `day` of `night` naar sfeer; voor een nacht- of jazznummer `"stations": ["gmusic", "nachtstreek"]` waar het past).
4. Voeg de bestandsnaam toe aan `STYLES` in `game/js/radiochannels.js` met `['kust']` (Noordkust) of `['rustig']` (Nachtjazz, later `jazz`), plus de artiest in `GMUSIC_ARTISTS` in `game/js/audio/radio.js`.
5. Werk de tellingen bij (`docs/LICENTIES.md`, `docs/LEGAL-AI-ASSETS.md`, `docs/MUZIEK.md`, `CHANGELOG.md`) en draai `node scripts/spec_check.mjs --write`.
6. Zodra Noordkust minstens 12 nummers heeft: haal "Binnenkort meer platen." weg uit `lines` van `noordkust` (de status volgt vanzelf uit de poolgrootte) en pas de test van `radiochannels` aan als die het getal noemt.
7. Geen dubbele nummers: vergelijk de nieuwe bestanden met de bestaande op duur en hash voordat je koppelt.

Samen spelen: muziek is lokaal per speler; er gaat niets over het netwerk. Wie Noordkust kiest hoort zijn eigen zender.

## Slotregel voor elke prompt

Plak onder de stijlprompt, voor de lyrics: `Sing in Dutch. An original composition, not imitating any existing song, artist or franchise. Clean mix, moderate loudness, no sudden loud peaks.` Houd de lyrics zonder namen van echte artiesten of merken. Weigert Gemini een prompt, haal dan één woord weg en voeg geen context toe.

## Radio Noordkust: twaalf nummers (kustpop, folk en shanty over de Waddenkust)

### N1. Zout op mijn lippen, door Wadwind en de Zoutkampers
Stijl: warme kustpop, 108 bpm, akoestische gitaar, accordeon en een zacht meeslepend refrein, man en vrouw om beurten, zonnig.

```
[Couplet] De dijk ligt in de zon, het water trekt zich terug,
in Zoutkamp ruikt het naar garnaal en de lucht is blauw en hoog.
Een skûtsje wacht op wind, de koffie staat te dampen,
de meeuwen doen de planning en wij doen niets dan wandelen.
[Refrein] Zout op mijn lippen, zand tussen mijn tenen,
de zomer is hier lang en de kust is van ons tweeën.
Zout op mijn lippen, de wind draait naar het noorden,
we zeggen niets, we zijn er, en het is meer dan genoeg.
[Couplet 2] De haven spiegelt glad, een visser knikt me toe,
hij weet wel wie ik ben, en ik weet wel hoe laat het is, de vloed.
[Refrein] Zout op mijn lippen, zand tussen mijn tenen ...
[Outro] Zoutkamp in de zomer, zo kan het ook.
```

### N2. Laag water, hoge hemel, door Wad en Wolk
Stijl: rustige folk, 92 bpm, gitaar, viool en lage trommel, mild weemoedig maar zonnig, tweestemmig.

```
[Couplet] Het water gaat weg tot ver achter de horizon,
een pad van modder en glans waar de dag op begon.
We lopen naar het eiland dat er straks niet meer is,
laarzen in de hand, de wereld is nat en gewis.
[Refrein] Laag water, hoge hemel, de wadloper wijst,
nog een uur en de zee komt weer terug, dus we zijn snel.
Laag water, hoge hemel, we tellen onze schreden,
de wind is aan onze kant, en het is zomer, goddank.
[Brug] Een gids die niets verhaast, een schelp in mijn zak.
[Refrein] Laag water, hoge hemel ...
```

### N3. De veerboot vaart niet, door De Lauwersgasten
Stijl: vrolijke shanty-pop, 124 bpm, accordeon, banjo, stampende voeten, meerstemmig meezingrefrein.

```
[Couplet] De veerboot vaart niet, de kapitein is koffie halen,
we zitten op de kade met een zak patat en bananen.
Een meeuw kijkt ons aan alsof hij de baas is van de pier,
wij delen onze frietjes, want hij onderhandelt als een heer.
[Refrein] Hee hoi, de boot is er nog niet, maar de zon is er al,
hee hoi, we zingen tot hij komt, tot hij komt en dan weer niet.
Hee hoi, Lauwersoog, wacht maar rustig af,
de zee loopt toch niet weg, ze komt gewoon weer terug.
[Couplet 2] De kapitein komt aan, hij zwaait en eet zijn broodje op,
hij zegt: over een uurtje, en we juichen nog een keer.
[Refrein] Hee hoi, de boot is er nog niet ...
```

### N4. Pieterburen zwaait, door Zeehond en Zon
Stijl: zachte zomerpop, 100 bpm, ukelele, fluitje, claps, vrolijk en een beetje grappig, vrouwenstem.

```
[Couplet] In Pieterburen kijkt de dag naar de zeehond op het zand,
hij ligt daar als een zak aardappels, met een zon in zijn hand.
Hij knippert met een oog en zegt niks, en dat is prima,
wij leren van zijn rust: gewoon blijven liggen, dat kan hier.
[Refrein] Pieterburen zwaait, de zomer zwaait terug,
de golven tikken zachtjes, en de tijd is even stuk.
Pieterburen zwaait, een hand van zand en zout,
de zeehond zegt het zo: wie haast heeft, is zijn plek kwijt.
[Outro] Zwaai maar, zwaai maar, het is zomer aan het wad.
```

### N5. Noordpolderzijl bij avond, door Wad en Wolk
Stijl: dromerige kustballade, 78 bpm, piano, zachte gitaar, lange galm, rustige zang, avondzon.

```
[Couplet] Het laatste licht ligt goud op het schor,
een schaap kijkt op en vergeet zijn eigen koor.
Het huisje bij de sluis houdt de wacht in de stilte,
en jij naast mij, de dag is rond en alles is stil.
[Refrein] Noordpolderzijl, het licht blijft nog even,
de zee en de zon geven elkaar een hand.
Noordpolderzijl, zeg niets, het is genoeg,
de avond komt langzaam, zo langzaam als het getij.
[Brug] Een eend vaart voorbij, de dag wordt zacht.
[Refrein] Noordpolderzijl ...
```

### N6. Schapen op de dijk, door De Wierdebeesten
Stijl: speelse folkpop, 116 bpm, fluit, banjo, handgeklap, een lach in de stem, een beetje grappig.

```
[Couplet] Er staat een schaap op de dijk en het kijkt me recht in mijn gezicht,
het eet het gras en blaat erbij: ik ben hier de gids.
Ik fiets er rustig langs op mijn fiets met drie versnellingen,
het schaap zegt: ik was hier eerst, jij mag door als je het vraagt.
[Refrein] Schapen op de dijk, de dijk is van de wol,
de wind blaast door ons haar en de zomer is nog vol.
Schapen op de dijk, ik zwaai en ik ga door,
en het schaap zwaait niet terug, maar het knikt wel, ik zweer het.
[Outro] Meh meh, meh meh, de dijk is van ons allemaal.
```

### N7. Wind mee naar Termunten, door Wadwind en de Zoutkampers
Stijl: stuwende kustpop met fietsritme, 120 bpm, gitaar, drums, hoge zang, een vrolijk meezingrefrein.

```
[Couplet] We fietsen langs de kust met de wind in de rug,
een kop thee bij het huisje, en de dijk ligt voor ons uitgestrekt.
Geen haast, geen telefoon, alleen het geluid van de banden,
en een zee die ons volgt met het zachtste applaus aan de randen.
[Refrein] Wind mee, wind mee naar Termunten,
de zon is gratis en het pad is lang.
Wind mee, wind mee, de vlag staat vooruit,
we zingen alsof de wereld alleen de kust is, en zo is het ook.
[Couplet 2] Bij Delfzijl een ijsje, bij de haven een lied,
we kopen een zakje drop en we geven het niet.
[Refrein] Wind mee, wind mee ...
```

### N8. Het huis op de wierde, door Zilte Marie
Stijl: tedere folk, 84 bpm, gitaar, cello en een zacht trommeltje, een vrouw die vertelt, oprecht en warm.

```
[Couplet] Mijn oma woonde hoog, op een wierde in de wei,
met een kachel en een kat en een raam naar het water in de zij.
Ze zei: de zee neemt niets, als je maar boven blijft,
en ze deelde peperkoek, zoals zij alleen dat kon.
[Refrein] Het huis op de wierde, het huis dat blijft staan,
met licht in elk raam en de zomer erbij.
Het huis op de wierde, ik kom er nog terug,
voor de koffie en het verhaal en de wind die vertelt.
[Outro] Boven blijven, zei ze, en zo doen we dat.
```

### N9. Garnalen bij zonsopgang, door De Lauwersgasten
Stijl: zwierige shanty, 132 bpm, accordeon, viool, stampen, ruw en vrolijk, mannenkoor.

```
[Couplet] De kotter vaart uit voor de zon nog is wakker,
de kapitein zingt vals en de motor tikt zijn takken.
Het net gaat de zee in, een meeuw wil mee,
we vangen wat we vangen, en de rest is voor de vrede.
[Refrein] Garnalen bij zonsopgang, de kust wordt wakker,
een kop koffie, een lied en een kapitein die lacht.
Garnalen bij zonsopgang, de zon komt uit het water,
en wij zijn thuis voor het ontbijt en vertellen iets groots.
[Brug] Wie ooit een vis zag ontsnappen, weet wat ik bedoel.
[Refrein] Garnalen bij zonsopgang ...
```

### N10. Zomeravond op het strand van Roodeschool, door Zeehond en Zon
Stijl: ontspannen strandpop, 96 bpm, gitaar, warme bas, zachte percussie, vrolijk en lui, man en vrouw.

```
[Couplet] Een kleed op het zand en een mand met brood,
de zon zakt als een bal en de zee is een rood.
We delen een appel, we luisteren naar de golf,
jij legt je hoofd op mijn schouder en het is gewoon heel goed.
[Refrein] Zomeravond aan het wad, geen wolk te zien,
de hemel wordt roze en wij blijven zitten tot elf.
Zomeravond aan het wad, de dag is bijna om,
maar de zomer is nog lang, dus we gaan nog niet naar huis.
[Outro] Nog een uurtje, nog een lied, het is toch zomer.
```

### N11. Fiets langs de dijk, door De Wierdebeesten
Stijl: opgewekte singalong-folk, 126 bpm, banjo, gitaar, handgeklap, een rijtje tegenwind en een vrolijke grap.

```
[Couplet] Ik fiets langs de dijk met mijn fiets zonder rem,
de wind is een tegenpartij en ik trap er maar op los.
Een koe kijkt me na en een boer zwaait van het erf,
een lange rechte weg, en de horizon is van mij.
[Refrein] Fiets langs de dijk, de dijk is lang en breed,
de tegenwind is gratis en de zomer is gezond.
Fiets langs de dijk, geen bocht te bekennen,
ik trap en ik zing, en de wind zingt altijd mee.
[Outro] Nog tien kilometer, en dan is het koffie.
```

### N12. Eb en vloed, door Wad en Wolk
Stijl: kalme, wijds klinkende kustfolk met een langzame climax, 88 bpm, piano, gitaar, strijkers, vol en warm, tweestemmig.

```
[Couplet] De zee gaat weg en de zee komt weer,
zo is het hier, en zo hoort het ook, hoe vaak.
Wij tellen de uren als schelpen in een rij,
en wat er ook verandert, de kust blijft bij ons.
[Refrein] Eb en vloed, eb en vloed,
de wereld ademt en wij ademen mee.
Eb en vloed, eb en vloed,
wat gaat, komt terug, en wat blijft, is dit.
[Brug] Een lichtje in de verte, een schip dat naar huis gaat.
[Refrein] Eb en vloed, eb en vloed ...
[Outro] Zo is het hier, en zo hoort het ook.
```

## Nachtjazz Radio: zes rustige nachtjazznummers (instrumentaal)

Stijlpromptsluiting voor alle zes: `Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Clean mix, moderate loudness, no sudden loud peaks.` Koppel ze met `STYLES` = `['rustig']` en `"stations": ["gmusic", "nachtstreek"]`, tijd `night`; het label `jazz` vervangt `rustig` zodra de zender alleen echte jazz heeft.

| Nr | Titel | Prompt (voor de slotregel) |
|---|---|---|
| J1 | Fluweel op de Ring | A slow, smoky late-night jazz piece, brushed drums, upright bass and a soft piano trio, a muted trumpet singing a gentle melody. 62 bpm, minor key, calm and spacious. |
| J2 | Lamplicht op de Gracht | A tender nocturne for solo piano and soft double bass, sparse notes, long silences, warm room reverb. 56 bpm, major key with a touch of nostalgia. |
| J3 | Laatste Tram naar Huis | A relaxed jazz ballad, tenor saxophone with a soft rhodes piano and brushed snare, a gentle walking bass. 68 bpm, dreamy and a little tired, never sad. |
| J4 | Koffie na Middernacht | A cosy late-night lounge groove, vibraphone, nylon guitar and a quiet upright bass, light brushes. 72 bpm, major key, friendly and relaxed. |
| J5 | Maan boven het Hoogeland | A wide, slow instrumental for a quiet summer night, soft strings, sustained piano chords, a distant flugelhorn. 54 bpm, spacious and peaceful. |
| J6 | Slaaplied voor de Stad | A lullaby-like jazz piece, solo guitar and light brushes, a soft clarinet answering. 60 bpm, warm, sleepy and safe. |

## Te luisteren door de eigenaar

Nog niets om te beluisteren: er zijn geen nieuwe bestanden. Zodra de tracks uit Gemini zijn, graag per nummer luisteren naar: Gronings of Nederlands uitgesproken zonder gekke klanken, het eind dat niet abrupt is, geen ruis of pops, en of de zang past bij kust (Noordkust) of nacht (Nachtjazz).
