# Muziekopdracht voor Gemini: de negen missiesferen

Stand: 20 november 2026 (#988). Voor de eigenaar. Het spel krijgt geen muziek die door Claude is gemaakt: de eigenaar levert de tracks uit Gemini. De koppeling staat al klaar (`game/js/missiesfeer.js`): zodra een bestand er staat en op de lijst is gezet, speelt het spel het automatisch bij de bijbehorende missies. Zolang een bestand ontbreekt speelt een missie de gewone `missie`-loop (`missie_spanning_loop.mp3`) en houdt een bijbaan de radio. Er wordt niets opgehaald dat er niet is.

Volgorde van impact: **komisch, sluipen, feest**, daarna ontdekken, warm, werk, finale, nacht en water.

## Hoe je een bestand toevoegt

1. Zet de mp3 in `game/audio/scenario/` onder precies de naam `missie_<naam>.mp3` (bijvoorbeeld `missie_komisch.mp3`). Instrumentaal, 44,1 kHz, geen zang.
2. Zet de sleutel (bijvoorbeeld `missie_komisch`) in de lijst `BESCHIKBARE_SFEREN` in `game/js/missiesfeer.js`. Meer is niet nodig: de mapping van missie naar sfeer staat er al.
3. Werk de aantallen bij in `docs/LICENTIES.md` en `docs/MUZIEK.md` (de scenario-loops) en noteer de bron (Gemini, aangeleverd door de eigenaar). Draai daarna `node scripts/muziek_telling_test.mjs` en `node scripts/missiesfeer_test.mjs`: de laatste meldt als de map en de lijst niet gelijk zijn.

Het spel laadt een sfeer pas als hij nodig is, wisselt met een crossfade en herstart niet als de volgende missie dezelfde sfeer heeft. Muziek is lokaal per speler: bij Samen spelen hoort iedereen de sfeer van zijn eigen actieve missie of bijbaan.

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
Gebruikt voor: de klusjes van de eerste akten (M01, M02, M03, M05, M07 tot en met M10, M12, M25) en alles zonder eigen sfeer.

```
A playful, light-footed instrumental for a summer comedy. Plucked pizzicato strings, a bouncy tuba and upright bass, a bright xylophone and a cheeky clarinet playing short, quirky phrases. 110 BPM, major key, curious and mischievous, sunny. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 2. sluipen: `missie_sluipen.mp3`

Tempo en toonsoort: 90 BPM, mineur (bijvoorbeeld D mineur). Gespannen en laag, met een knipoog.
Gebruikt voor: M06 (het museum), M13, M14, M18, M20 (Bourtange en de kruitkelder), M21, M23.

```
A quiet, tiptoeing instrumental with a wink of humour. A soft plucked pizzicato bass, muted marimba, light ticking percussion and very few notes, with lots of space between them. 90 BPM, minor key, careful and watchful, low and tense but never scary. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 3. feest: `missie_feest.mp3`

Tempo en toonsoort: 128 BPM, majeur, polka-achtig. Volksfeest.
Gebruikt voor: M16 (de kroegentocht), M17 (de bruggen), M26 (het plein), de kermis, de bruggenrace en het cabaret.

```
A cheerful village-fair instrumental in a polka-like two-beat feel. Accordion, brass, clarinet and a rattling tambourine over a lively oom-pah bass. 128 BPM, major key, happy, crowded and festive, a summer street party. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 4. ontdekken: `missie_ontdekken.mp3`

Tempo en toonsoort: 80 BPM, majeur (bijvoorbeeld G majeur). Verwondering.
Gebruikt voor: M04 (de duiven van boven), M15, M19 (de stoomtrein), M24 (d'Olle Grieze) en wandelen en uitkijkpunten.

```
A gentle, wondering instrumental for a walk through summer countryside and an old town. Acoustic guitar, soft piano, an airy flute and warm strings. 80 BPM, major key, curious, open and spacious, a sense of discovery. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 5. warm: `missie_warm.mp3`

Tempo en toonsoort: 70 BPM, majeur met een vleugje weemoed (bijvoorbeeld F majeur). Oprecht.
Gebruikt voor: M27, M28, M29 (inpakken, de wisselwoning, terug) en de verhaalscènes met oma en Beppe.

```
A sincere, tender instrumental about a grandmother's kitchen on a quiet afternoon. Piano, nylon-string guitar, a warm cello and a soft accordion. 70 BPM, major key with a touch of nostalgia, heartfelt and calm. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 6. werk: `missie_werk.mp3`

Tempo en toonsoort: 100 BPM, majeur (bijvoorbeeld A majeur). Ontspannen klusdag.
Gebruikt voor: M22 en de bijbanen (bezorgen, krantenwijk, vracht, boerderij, boa, rechtbank en de rest) zodra het bestand er is.

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
Gebruikt voor: de nachtritten (taxi, bezorgen, vracht en lijndienst na zonsondergang, en de bijbaan Taxi nacht).

```
A calm late-evening instrumental for a quiet drive through a sleeping town. Soft synth pads, a mellow electric piano and a gentle pulsing bass. 85 BPM, minor key, relaxed, dreamy and spacious. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```

## 9. water: `missie_water.mp3`

Tempo en toonsoort: 95 BPM, majeur (bijvoorbeeld E majeur). Zeilboot op kanaal en meer.
Gebruikt voor: M11 (het skûtsje), de skûtsje-sprint, de tjalke, de rondvaart en de veerdienst.

```
A bright, breezy instrumental for a sailing boat on a canal and a lake on a sunny day. Acoustic guitar, fiddle, accordion and light hand percussion. 95 BPM, major key, fresh, relaxed and a little adventurous. Instrumental only, no vocals. An original composition, not imitating any existing song, artist or franchise. Length about 2 to 3 minutes. Make it loop seamlessly: the ending should flow back into the beginning with the same mood and tempo, no fade-out and no big final chord. Clean mix, moderate loudness, no sudden loud peaks.
```
