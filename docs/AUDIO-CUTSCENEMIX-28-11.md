# Muziek onder spraak in cutscenes (aaa30, 28-11)

Eigenaar: "Denk ook na over muziek tijdens cutscenes, als er spraak is leidt dat soms enorm af." Code: `game/js/sfx/cutmix.js` (puur),
`sfx/cutmusic.js` (runtime), `sfx/cutmuziek.js` (tabel voor de regie). Test: `node scripts/cutmix_test.mjs`.
Meting in Electron: `scripts/qa/cutmix_live.mjs` en `scripts/qa/cutmix_rapport.mjs` (HTML voor en na).

## Wat er was (gemeten in de bron en op de scènedata)

De eerste 30 minuten bestaan uit 24 scènes met regels: de opening (trailer, keuken, verhuisdag), de flat (F1 tot F6), M01 tot M05 met
intro, outro en tussenscènes, en de overgangen O1 en O2. Ze zijn bijna overal dialoog: 67 tot 85 procent van de scène klinkt een stem, en de
pauzes tussen twee regels zijn 1,3 tot 2 s.

| bron | wat het deed onder een stem |
| --- | --- |
| radio (G-Music), ook in een auto die een scène start | de hele scène vast op 0,5 van 0,85 = -4,6 dB, melodie bleef dus gewoon hoorbaar |
| scenarioloop (missie_komisch voor M01 tot M05, thuis, fiets) | de hele scène vast op -6 dB (`MUSIC_DUCK_KEEP`), ook in de stiltes |
| thema in de openingsfilm | -8 dB (0,4) alleen als de ondertitel er stond, met een harde sprong in beide richtingen |
| clue-tik (`playClueSting`) bij een aanwijzingsregel | begon tegelijk met de regel: een toonreeks midden in de zin |
| stings (missie-stings, scene_in en scene_uit) | worden in een verhaalscène al onderdrukt (`playSting`) |
| dubbele muziek | niet gevonden: de scenarioloop pauzeert de radio (`gmusicHeld`) en het thema houdt de radio vast tot het afloopt |
| radio of telefoonmuziek die doorloopt | de radio liep door op -4,6 dB (hierboven); een telefoongesprek zet geen muziek |

Het oude niveau (-4,6 tot -8 dB) is nergens genoeg voor een gesprek: de toets uit `cutmix_test` (hoogstens -12 dB in een regel) laat de oude
stand in alle 24 scènes falen.

## De regel

1. **Ducking**: onder een stemregel gaat de muziek 16 dB omlaag (aanval 150 ms). Na de regel blijft hij laag tot 1,2 s stilte, en komt dan
   in 600 ms terug. Is de volgende regel al gepland binnen 2,4 s dan komt hij helemaal niet terug (geen pompen). Bij de eerste regel
   begint de muziek op het niveau waarop hij speelde en zakt met de aanzet: geen klik.
2. **Stand per scène**: `vol` (normaal in de stiltes), `laag` (-8 dB in de stiltes), `uit`. Zonder opgave: scène met meer dan 40 procent
   stem is `uit` (geen melodie onder een gesprek), anders `laag`, zonder regels `vol`. In `uit` komt de muziek pas terug na de scène.
   De regie zet het per scène met `music: 'laag'` in de scène-data (`def.music`, wordt door `cutscenehost.js` doorgegeven) of met een regel
   in `sfx/cutmuziek.js` (sleutel is de host-id, `story-M01.intro`). Een emotionele slag: `'story-<id>': 'vol'`, dan speelt de muziek in de
   stiltes op volle sterkte en duikt nog steeds 16 dB onder elke regel.
3. **Stings en wissels alleen in een stilte**: de clue-tik wacht tot de stem zwijgt (`whenSpeechQuiet`, hoogstens 6 s); de andere stings waren al uit.
   `stingOkAt` is de pure regel (niet in een regel en 0,2 s afstand ervan).
4. **Omgeving en effecten** blijven hoorbaar maar onder de stem: de bestaande `speechDuckFactor` per categorie (`mixplan.js`) en de
   omgevingsduik (`duckAmbience(0.5)`); samen ligt de omgeving onder een stem op -13 dB. Niet veranderd.
5. **Stemniveau**: de verhaalstem (`playExclusive`) gaat rechtstreeks naar de stembus op het niveau van de opname, net als de andere
   spelstemmen (reacties, bijbaanbazen, bellers, gain 1). Alleen NPC-geroezemoes onderweg is zachter (`stemNiveau`). De test bewaakt dat.
6. **Samen spelen**: elke speler rekent de mix lokaal uit dezelfde regels (cinematics begin, klok en eind); de gast speelt de scène van de
   gastheer als kopie met dezelfde regels en opnameduren (`vdur`), dus dezelfde mix. Er gaat niets over het net. Een gast die de scène
   mist hoort zijn eigen spelmuziek gewoon.

## Hoe het is aangesloten

- `cinematics.js`: `beginCutMusic` bij een scène met stemmen, `clockCutMusic(active.t)` elk beeld, `endCutMusic` aan het eind (de muziek komt in 2 s terug).
- `audio/radio.js` tikt `tickCutMusic(dt)` en vermenigvuldigt de muziekbus; `audio/scenario.js` vermenigvuldigt de scenarioloop; in een
  cutscene vervalt de oude gespreksdemping (`speech.musicDuck()`) voor deze twee.
- `theme.js`: het thema duikt nu 14 dB met 0,5 s vasthouden en glijdt (60 ms-tik), in plaats van de sprong naar 0,4.
- `missionstory.js` geeft de duur van de opname mee (`vdur`) zodat het stemvenster klopt; `cutscenehost.js` geeft `sceneId` en `music` door.
- Een speler die de scène overslaat ziet de muziek in 2 s terugkomen.

## Meting

Echte Electron-runs (`node scripts/qa/cutmix_live.mjs --scene=<id>`, `--audio-graph`, de scène twee keer in echte tijd door de host: eerst met de
oude regeling via `__audio.cutMixOff(true)`, dan met de mix). Gemeten is de gain van de muziekbus ten opzichte van het gewone niveau, elke 100 ms:

| scène | oude regeling in een regel (gem. / max) | nieuwe mix in een regel | nieuwe mix na de scène |
| --- | --- | --- | --- |
| M05.intro | -4,6 / -4,1 dB | -60 dB (stand uit) | terug op 0 dB binnen enkele seconden |
| F2 (flat) | -4,6 / -4,2 dB | -60 dB (stand uit) | terug op 0 dB |
| M02.intro | -4,6 / -3,9 dB | -60 dB (stand uit) | terug op 0 dB |

De HTML-pagina met de grafieken (voor en na, plus de berekening over de scènedata van M01.intro, M03.2 en F2) maakt
`node scripts/qa/cutmix_rapport.mjs --out=<map> --meting=<map1>,<map2>,<map3>` (gegenereerd, niet in git). In deze runs speelde geen scenarioloop
(`scenario: null`, de radio was de bron). Dit is de regeling (de gain waarmee de bus speelt), niet gehoord.

## Wat niet kon

- Er zijn geen luidsprekers: er is niets beluisterd. Of 16 dB genoeg is en of de terugkeer prettig valt weten we alleen uit de getallen;
  de eigenaar of een playtester moet de eerste scènes met geluid horen. Eén knop om te schuiven: `DUCK_DB`, `LAAG_DB`, `HOLD_S` in `cutmix.js`.
- De muziek zelf is niet vervangen door een rustig bed (drone of pad): er is er geen geleverd (zie `docs/MUZIEK-TE-VRAGEN.md`). Daarom is `uit`
  de standaard voor dialoogscènes en zijn de stiltes de enige plek voor melodie.
- De openingsfilm (`intromontage.js`) heeft zijn eigen montage met het thema op de beat; alleen de duik is gladder gemaakt, de regie van die
  film is niet aangeraakt.
