# Faallijst cutscenes (wat bestaande cutscenes nu laat falen)

Gemaakt door `node scripts/cutscene_lint.mjs --lijst`. De regels gelden voor alle cutscenes; de release (releasegate, static) wordt pas groen als deze lijst leeg is of elke vondst een gedocumenteerde uitzondering heeft in `scripts/release/cutscene-uitzonderingen.json`.

## Blokkerend (11)

### CS-R03 Spreker niet op het scherm (6)

- `story-opening-keuken` (akte 1) bij 20 s: shot 8 (begin, 20.0 s): Anita praat maar staat achter de camera
- `story-opening-keuken` (akte 1) bij 78.6 s: shot 28 (begin, 78.6 s): Tammo praat maar staat achter de camera
- `M04.outro` (akte 1) bij 48.6 s: shot 11 (midden, 48.6 s): Anita praat maar is niet in beeld (0% op het scherm)
- `M05.intro` (akte 1) bij 42 s: shot 11 (midden, 42.0 s): Tammo praat maar is niet in beeld (0% op het scherm)
- `M14.intro` (akte 3) bij 50.7 s: shot 11 (midden, 50.7 s): Tammo praat maar is niet in beeld (0% op het scherm)
- `M14.outro` (akte 3) bij 37.2 s: shot 10 (midden, 37.2 s): Jelle Terpstra praat maar is niet in beeld (0% op het scherm)

### CS-V01 Spreker ontbreekt in de scène (4)

- `M15.outro` (akte 3) bij 3.9 s, regel 1: Jelle Terpstra praat (regel 1) maar staat niet in de scène
- `M19.intro` (akte 4) bij 36.9 s, regel 9: Douwe praat (regel 9) maar staat niet in de scène
- `M23.intro` (akte 5) bij 24.6 s, regel 4: Tinus praat (regel 4) maar staat niet in de scène
- `M26.intro` (akte 5) bij 59 s, regel 12: Jelle Terpstra praat (regel 12) maar staat niet in de scène

### CS-C05 Spreker niet in beeld (1)

- `M06.0` (akte 1) bij 26.2 s, regel 8: Anita praat (regel 8) en is nergens in beeld

## Belangrijk (tellen mee in de score, blokkeren nog niet): 216 vondsten in 90 cutscenes

| cutscene | akte | score | belangrijk | nit |
|---|---|---|---|---|
| story-opening-keuken | 1 | 0 | 10 | 2 |
| M02.intro | 1 | 26 | 9 | 2 |
| M01.intro | 1 | 44 | 7 | 0 |
| M08.outro | 2 | 52 | 6 | 0 |
| M11.intro | 2 | 52 | 6 | 0 |
| M20.outro | 4 | 52 | 6 | 0 |
| M03.outro | 1 | 60 | 5 | 0 |
| M10.intro | 2 | 59 | 5 | 1 |
| M13.intro | 3 | 60 | 5 | 0 |
| M16.outro | 3 | 60 | 5 | 0 |
| M19.outro | 4 | 59 | 5 | 1 |
| M20.3 | 4 | 59 | 5 | 1 |
| M03.2 | 1 | 67 | 4 | 1 |
| M09.outro | 2 | 67 | 4 | 1 |
| M12.intro | 3 | 68 | 4 | 0 |
| M18.3 | 4 | 68 | 4 | 0 |
| M21.intro | 4 | 68 | 4 | 0 |
| M26.intro | 5 | 41 | 4 | 2 |
| M01.3 | 1 | 74 | 3 | 2 |
| M01.5 | 1 | 75 | 3 | 1 |
| M01.outro | 1 | 74 | 3 | 2 |
| M04.intro | 1 | 76 | 3 | 0 |
| M06.intro | 1 | 75 | 3 | 1 |
| M07.intro | 2 | 76 | 3 | 0 |
| M13.outro | 3 | 75 | 3 | 1 |
| M14.intro | 3 | 51 | 3 | 0 |
| M18.intro | 4 | 76 | 3 | 0 |
| M20.intro | 4 | 76 | 3 | 0 |
| M21.4 | 4 | 75 | 3 | 1 |
| M23.intro | 5 | 51 | 3 | 0 |
| M25.intro | 5 | 75 | 3 | 1 |
| M25.outro | 5 | 75 | 3 | 1 |
| M26.12 | 5 | 76 | 3 | 0 |
| M26.13 | 5 | 75 | 3 | 1 |
| M30.intro | 6 | 75 | 3 | 1 |
| story-opening-verhuisdag | 1 | 82 | 2 | 2 |
| M17.intro | 4 | 83 | 2 | 1 |
| M21.3 | 4 | 84 | 2 | 0 |
| M22.2 | 5 | 83 | 2 | 1 |
| M24.3 | 5 | 82 | 2 | 2 |
| ... | | | 50 cutscenes meer | |
