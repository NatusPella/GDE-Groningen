# Muziekopdracht voor Gemini: de negen missiesferen

Stand: 20 november 2026 (#988). Voor de eigenaar. Het spel krijgt geen muziek die door Claude is gemaakt: de eigenaar levert de tracks uit Gemini. **De radio blijft de standaard** (besluit eigenaar 20-11): wie aan het werk is, bijbanen doet of een gewone missie speelt, hoort de radio of niets als hij die uitzette. Een sfeer is er alleen voor een kleine lijst verhaalmomenten (`MISSIE_EIGEN_MUZIEK` in `game/js/missiesfeer.js`, bijbaanwedstrijden in `BIJBAAN_EIGEN_MUZIEK`), niet voor elke missie of klus. Een verhaalmoment wint ook in een voertuig met de radio aan. Staat een bestand er niet, dan speelt dat moment de radio; er wordt niets opgehaald dat er niet is. De algemene spanningsloop (`missie_spanning_loop.mp3`) speelt alleen nog als een missie er expliciet om vraagt (`mission.spanning`), niet meer als terugval.

Volgorde van impact: **komisch, sluipen, feest**, daarna ontdekken, warm, werk, finale, nacht en water.

## Hoe je een bestand toevoegt

1. Zet de mp3 in `game/audio/scenario/` onder precies de naam `missie_<naam>.mp3` (bijvoorbeeld `missie_komisch.mp3`). Instrumentaal, 44,1 kHz, geen zang.
2. Zet de sleutel (bijvoorbeeld `missie_komisch`) in de lijst `BESCHIKBARE_SFEREN` in `game/js/missiesfeer.js`. Welke momenten die sfeer krijgen, staat in `MISSIE_EIGEN_MUZIEK` (een regel per missiecode, eventueel met een stap-bereik); pas die lijst aan als je een moment wilt toevoegen of schrappen. Houd hem klein.
3. Werk de aantallen bij in `docs/LICENTIES.md` en `docs/MUZIEK.md` (de scenario-loops) en noteer de bron (Gemini, aangeleverd door de eigenaar). Draai daarna `node scripts/muziek_telling_test.mjs` en `node scripts/missiesfeer_test.mjs`: de laatste meldt als de map en de lijst niet gelijk zijn.

**Een nieuwe goedgekeurde track koppelen is drie kleine stappen:**

1. Het bestand: `game/audio/scenario/missie_<naam>.mp3`.
2. Eén regel: zet `'missie_<naam>'` in `BESCHIKBARE_SFEREN` in `game/js/missiesfeer.js`.
3. Eén getal: het aantal scenario-loops in `docs/LICENTIES.md` (en `docs/MUZIEK.md`) met één erbij, plus de bron.

Welke momenten die sfeer krijgt, staat al in `MISSIE_EIGEN_MUZIEK`; een extra moment is één regel `{ code: 'M27', sfeer: 'missie_warm' }`. Geef een sfeer je nog niet aan een moment, dan speelt hij nergens. Draai `node scripts/missiesfeer_test.mjs` en `node scripts/muziek_telling_test.mjs`; verwacht nog: `missie_warm`, `missie_finale`, `missie_water`.

Het spel laadt een sfeer pas als hij nodig is, wisselt met een crossfade en herstart niet als de volgende missie dezelfde sfeer heeft. Muziek is lokaal per speler: bij Samen spelen hoort iedereen de sfeer van zijn eigen verhaalmoment (of zijn eigen radio); er gaat niets over het netwerk.

## Tips voor Gemini

- Vraag per prompt 2 tot 3 varianten en kies de beste.
- Weigert Gemini een prompt, haal dan één woord weg (bijvoorbeeld "mysterious" of "chaotic") en voeg geen context toe.
- Noem geen echte artiesten, nummers of games.
- Luister of het eind aansluit op het begin (laat hem een paar keer achter elkaar lopen).
- Houd het volume gematigd: de muziek ligt onder het geluid van het spel.

## De vaste slotregels (onderaan elke prompt)

> Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.

Hieronder staat per sfeer eerst de kern, daarna de prompt zoals je hem in Gemini plakt (met de slotregels erbij).

## 1. komisch: `missie_komisch.mp3`

Tempo en toonsoort: 110 BPM, majeur (bijvoorbeeld C majeur). Lichtvoetig en speels.
Gebruikt voor: alleen de kennismakingsmissies M01 tot en met M05 en korte komische intermezzo's, niet elke klus. Goedgekeurd door de eigenaar (bassig en jazzy); staat al in het spel.

```
A playful, light-footed instrumental for a summer comedy. Plucked pizzicato strings, a bouncy tuba and upright bass, a bright xylophone and a cheeky clarinet playing short, quirky phrases. 110 BPM, major key, curious and mischievous, sunny. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 2. sluipen: `missie_sluipen.mp3`

Tempo en toonsoort: 90 BPM, mineur (bijvoorbeeld D mineur). Gespannen en laag, met een knipoog.
Gebruikt voor: alleen de sluipmomenten M06 (het museum), M13, M14, M20 (Bourtange en de kruitkelder) en M21; niet als algemene missiemuziek. Goedgekeurd door de eigenaar (jazzy, warm en classy); staat al in het spel.

```
A quiet, tiptoeing instrumental with a wink of humour. A soft plucked pizzicato bass, muted marimba, light ticking percussion and very few notes, with lots of space between them. 90 BPM, minor key, careful and watchful, low and tense but never scary. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 3. feest: `missie_feest.mp3`

Tempo en toonsoort: 128 BPM, majeur, polka-achtig. Volksfeest.
Gebruikt voor: M16 (de kermis), het plein van M26 en de bruggenrace als wedstrijd. Goedgekeurd door de eigenaar; staat al in het spel.

```
A cheerful village-fair instrumental in a polka-like two-beat feel. Accordion, brass, clarinet and a rattling tambourine over a lively oom-pah bass. 128 BPM, major key, happy, crowded and festive, a summer street party. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 4. ontdekken: `missie_ontdekken.mp3`

Tempo en toonsoort: 80 BPM, majeur (bijvoorbeeld G majeur). Verwondering.
Gebruikt voor: nu nergens; alleen als een nieuwe-streekonthulling of een uitkijkpunt een scène wordt. Voeg dan een regel toe aan `MISSIE_EIGEN_MUZIEK`.

```
A gentle, wondering instrumental for a walk through summer countryside and an old town. Acoustic guitar, soft piano, an airy flute and warm strings. 80 BPM, major key, curious, open and spacious, a sense of discovery. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 5. warm: `missie_warm.mp3`

Tempo en toonsoort: 70 BPM, majeur met een vleugje weemoed (bijvoorbeeld F majeur). Oprecht.
Gebruikt voor: M27 tot en met M29 (de Oma- en Beppe-scènes) en de ontmoetingsscènes.

```
A sincere, tender instrumental about a grandmother's kitchen on a quiet afternoon. Piano, nylon-string guitar, a warm cello and a soft accordion. 70 BPM, major key with a touch of nostalgia, heartfelt and calm. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 6. werk: `missie_werk.mp3`

Tempo en toonsoort: 100 BPM, majeur (bijvoorbeeld A majeur). Ontspannen klusdag.
Gebruikt voor: nu nergens. Bijbanen en klussen houden de radio (besluit 20-11); dit bestand is alleen nodig als de eigenaar later toch een klusmoment een eigen sfeer wil geven.

```
A relaxed, easygoing instrumental for a day of odd jobs. Brushed drums, a warm electric bass guitar, acoustic guitar, a soft organ and a little harmonica. 100 BPM, major key, steady and friendly, a lazy summer groove. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 7. finale: `missie_finale.mp3`

Tempo en toonsoort: 100 BPM, majeur (bijvoorbeeld D majeur). Groots en hoopvol, een steady opbouw zonder eindslag.
Gebruikt voor: M30 (het proefbeleg) en het slot.

```
A grand, hopeful instrumental with a full orchestra: strings, brass, timpani and a wordless, singing choir-like pad. 100 BPM, major key, a steady build that can repeat without a closing hit, warm, proud and triumphant. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 8. nacht: `missie_nacht.mp3`

Tempo en toonsoort: 85 BPM, mineur (bijvoorbeeld A mineur). Rustig.
Gebruikt voor: nu nergens; alleen een expliciete nachtscène. Gewone nachtritten houden de radio.

```
A calm late-evening instrumental for a quiet drive through a sleeping town. Soft synth pads, a mellow electric piano and a gentle pulsing bass. 85 BPM, minor key, relaxed, dreamy and spacious. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 9. water: `missie_water.mp3`

Tempo en toonsoort: 95 BPM, majeur (bijvoorbeeld E majeur). Zeilboot op kanaal en meer.
Gebruikt voor: M11 (het skûtsje), de skûtsje-sprint en sloepmissies als wedstrijd of verhaalmoment; niet de gewone rondvaart, tjalke of veerdienst.

```
A bright, breezy instrumental for a sailing boat on a canal and a lake on a sunny day. Acoustic guitar, fiddle, accordion and light hand percussion. 95 BPM, major key, fresh, relaxed and a little adventurous. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```
