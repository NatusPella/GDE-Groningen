# Muziekgebruik op 20-11

Opdracht van de eigenaar (20-11): alle muziek uit Gemini die hij aanleverde, hoort in het spel te staan. De radio blijft de standaard; eigen muziek is alleen voor verhaalmomenten (`game/js/missiesfeer.js`). De bestanden zijn op inhoud (md5) vergeleken met de Downloads-map van de eigenaar.

## Aangeleverde bestanden (Downloads)

| Bestand van de eigenaar | In de repo als | Gebruikt voor | Nieuw gekoppeld |
|---|---|---|---|
| Loose_Change_and_Loafers | `scenario/missie_komisch.mp3` | M01 tot M05 | nee, stond er al |
| Midnight_in_the_Parlor | `scenario/missie_sluipen.mp3` | M06, M13, M14, M20, M21 | nee |
| Merrymaking_on_Main | `scenario/missie_feest.mp3` | M16, M26, bruggenrace | nee |
| Morning_Light_on_Pine | `scenario/missie_warm.mp3` | M27 tot M29 | nee |
| The_Orchard_Gathering | `scenario/missie_finale.mp3` | M30 | nee |
| Sunday_at_the_Quay | `scenario/missie_water.mp3` | M11, skûtsje-sprint | nee |
| Afternoon_Boulevard | `scenario/bus_loop.mp3` | buschauffeur en buslijn | nee |
| Caper_at_Three_O_Clock | `scenario/missie_caper.mp3` | M09 (eieren), M18 (camera's) | ja |
| The_Mayor_s_Morning_Walk | `scenario/missie_wandeling.mp3` | M10 (trekker-limo), M24 (de vlag) | ja |
| The_Pavement_Strut | `scenario/missie_flaneren.mp3` | M08 (fatbikes), M12 (traumaduif) | ja |

De drie nieuwe zijn de tracks die de eigenaar eerder te "happy clappy", te kinderlijk of te midi-achtig vond. Ze hangen daarom alleen aan komische en lichtvoetige verhaalmomenten; bijsturen is een regel in `MISSIE_EIGEN_MUZIEK`.

## Rest van de repo

| Map | Aantal | Gebruikt voor |
|---|---|---|
| `audio/gmusic/` | 34 mp3 | radio (G-Music), alle in `manifest.json` |
| `audio/gmusic/jingles/` | 4 | radiojingles |
| `audio/scenario/` (vast) | 15 | race, achtervolging, kart, padel, golf, klimtoren, trein, bus, boerderij, vlucht, spanning, fiets, thuis, menu, PvP-arena |
| `audio/theme/` | 1 | titelnummer, trailer |

Elk bestand in `audio/scenario/` wordt nu afgespeeld; `scripts/scenario_bestanden_test.mjs` bewaakt dat. Alleen gemeten, niet beluisterd.
