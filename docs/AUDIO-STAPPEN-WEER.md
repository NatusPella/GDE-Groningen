# Voetstappen, weer en autolussen met opnames

> **Naslag.** De regels staan in de canonieke spec [`.specs-fire/standards/mechanica.md`](../.specs-fire/standards/mechanica.md); dit document is de uitleg van de koppeling. Bij verschil wint de spec (en bij twijfel `AGENTS.md`).
> Beleid: [ADR 0039](../.specs-fire/standards/adr/0039-licentievrije-audio-met-credits.md). Alle bronnen, auteurs en licenties staan in [AUDIO-LICENTIES.md](AUDIO-LICENTIES.md) (gegenereerd uit `game/audio/sfx/manifest.json`).

Sinds #988 klinken voetstappen, regen, wind, onweer en zomerambiance met echte opnames (Freesound, CC0 en CC BY). De procedurele geluiden blijven als terugval:
ontbreekt een bestand of is het nog niet geladen, dan klinkt het oude synthgeluid en komt er niets in de console.

## Voetstappen (`sfx/steps.js`, `sfx/foley.js`)

- **Opnames:** `stap_<ondergrond>_<n>.ogg`, zes varianten voor elk van tien ondergronden: `klinkers` (stenen, tegels), `asfalt`, `gras`, `grind`, `zand`, `wood` (brug, steiger, dek), `metaal`, `wet` (water, plas), `binnen` en `ren`.
  `scripts/audio/master_sfx_stappen.mjs` knipt losse stappen uit langere opnames (aanzet zoeken, stilte weg, fade-in 2 ms en cosinus-fade-uit 50 ms, geen klik, RMS -23 dB over de eerste 150 ms, piek hooguit -1,5 dB, mono ogg). Samen zo'n 0,36 MB.
- **Ondergrond:** het spel kent klinkers, asfalt en fietspad (`vehicle.js surfaceUnder`), gras en groen, polderwegen, bruggen (hout), water en plassen. Nieuw: een boerenerf (erfverharding) klinkt als grind, in de flat klinkt een vloer (`binnen`, via `stepContext.indoors`, gezet door `worldevents.js`) en het dak van een auto klinkt als metaal. Zand, strand en een los zandpad kent de wereld niet als ondergrond; de opnames staan klaar (`zand`, `grind`, aliassen `strand`, `pad`) zodra de wereld ze meldt.
- **Variant:** een willekeurige variant, nooit dezelfde als de vorige op die ondergrond; ontbreekt die, dan de andere varianten, dan de procedurele set (`binnen` valt terug op hout, `ren` op asfalt).
- **Cadans:** de pasafstand volgt de snelheid (`strideFor`): lopen, rennen en sluipen hebben elk hun ritme; niets bij stilstand of in de lucht. Rennen (snelheid boven 4,5) klinkt op stoep, asfalt en binnen met de `ren`-set.
- **Links en rechts:** de voeten wisselen af; het geluid staat 16 cm links of rechts van de looprichting en de toonhoogte verschilt een haartje. Plus ±5% toonhoogte en ±1,5 dB volume per stap.
- **Nat en gesprek (22-11, `sfx/sfxfeel.js`):** de plons onder een stap volgt de regen en daarna de natheid van de grond (`weather.wet`): na een plensbui plonst een stap nog ongeveer 48 s zacht na en sterft dan uit. Gras, water en een vloer binnen plonsen nooit; grind en zand de helft. Onder een gesproken regel zakt je eigen stap 2,5 dB en die van een ander 6 dB (mixplan `voetstap`).
- **Anderen:** NPC's en de metgezel klinken veel zachter dan jij (`npcStep`: zachter met afstand, dof boven 6 m), elk op zijn eigen voet en eigen fase (de voeten van een menigte lopen niet gelijk).

## Weer en zomer (`sfx/weermap.js`, `sfx/ambience.js`)

- **Regen:** `regen_motregen`, `regen_bui`, `regen_plens` (naadloze lussen, kruisfade van 400 ms in het bestand). De intensiteit van het weer (0 tot 1) kruist ze met gelijk vermogen (toppen bij 0,2, 0,5 en 0,85). In een gesloten voertuig klinkt `regen_auto`, in de flat `regen_dak`; de buitenlussen blijven op 10%.
- **Wind:** `wind_gras` (wind door gras en open land) vervangt de ruislaag van de wind; het weer stuurt het niveau zoals voorheen. Wind in bomen is niet gelukt (zie Wat niet is gelukt).
  Het niveau komt uit `breezeTargets` (`sfx/sfxfeel.js`): plek (open land, groen, kust, zee), het uur (zwakst om 3 uur, sterkst om 15 uur, factor 0,75 tot 1,15), de bries van de dag (`weather.windStrength`, in een straat in de luwte) en de regen; het filter wordt helderder met meer wind. Zonder bries blijft het niveau binnen 25 procent van de oude formule.
- **Demping onder een gesprek:** de spraakdemping van omgeving en motor houdt 0,6 s vast na het laatste woord (`speechDuckStep`). Gemeten: in een pauze van 0,3 s tussen twee regels kwam de omgeving 3,2 dB omhoog en zakte dan weer; nu 0 dB. Na de laatste regel is ze na ongeveer 1 s half terug.
- **Onweer:** `donder_dichtbij_0..2` (onder 900 m) en `donder_ver_0..1`; de vertraging is afstand gedeeld door 343 m/s (0,3 tot 7 s), verder weg dofer en zachter, binnen gedempt. Zonder de bestanden de synthdonder.
- **Zomer:** `zomer_vogels` (bos en groen), `zomer_stadsvogels` (stad) en `zomer_insecten` (weide en polder, warme uren); alleen overdag en droog. De losse vogelroepen en de nachtkrekels (synth) blijven.
- Altijd zomer: geen sneeuw of ijs. Een bron met bevroren gras is bewust niet gebruikt.

## Auto (`audio.js`, `sfx/samples.js`)

- **Drift:** `band_drift` is een naadloze lus onder de bandenpiep zodra de slip boven `DRIFT_SLIP` (0,62) komt; niveau en toonhoogte volgen slip en snelheid, en hij speelt zolang de slide duurt (uitfade 0,35 s).
- **Motor:** `motor_auto_stationair` ligt als laag onder de motorsynth van personenauto's: toonhoogte volgt het toerental, het niveau zakt naar 15% bij de halve toerenrange. De schakelaar `ENGINE_LAYER_ON` in `audio.js` zet hem uit als hij niet bevalt.
- Een start-lus-einde-motor (aparte opname voor opstarten en afslaan) is niet gedaan: de synth houdt start en einde.

## Samen spelen

Alles hier is lokaal: elke speler hoort de stappen, het weer en de omgeving van zijn eigen scherm, uit zijn eigen spel. Een gast heeft zijn eigen voeten; de stappen van andere spelers komen als voetgangers van de host (zachter, op afstand) door dezelfde NPC-regel. Voortgang en beloning raakt dit niet. Wie wegvalt of later aansluit hoort gewoon zijn eigen wereld. Gedekt door `stappen_test.mjs` en `weer_sfx_test.mjs` (pure tests, plus een nagemaakte kit voor de lagen van de omgeving).

## Meten en bijhouden

`scripts/audio/master_sfx_weer.mjs` maakt de lussen (zoekt het venster met de kleinste niveaustap en sprong over de naad, nuldoorgang, kruisfade, niveau). Het manifest bewaart per bestand naad en niveau; `scripts/weer_sfx_test.mjs` eist een stap onder 3 dB, een sprong onder 2 keer de gewone stap en een piek onder -1 dB. Na het omzetten naar ogg is opnieuw gemeten: geen enkel bestand clipt; `regen_auto` heeft de grootste stap (2,8 dB) en sprong (4,8 keer de gemiddelde stap, bij ruisregen).
Het is **alleen gemeten, niet beluisterd**: zie [SFX-LUISTERLIJST.md](SFX-LUISTERLIJST.md).

## Wat niet is gelukt

- **Wind in bomen en riet apart:** de zoekresultaten waren kikkers en vogels, geen wind; `wind_gras` dekt open land, riet en polder samen.
- **Regen op water, strand en zandpad als ondergrond:** de wereld meldt het niet; opnames voor `zand` staan klaar.
- **Cicaden en krekels voor de nacht:** de gevonden opnames klonken tropisch of Amerikaans; de synthkrekels blijven.
- **Echte motorlus bij hoge toeren:** alleen stationair; het opschroeven blijft synth.
