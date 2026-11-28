# Audio-opslag en laadbudget voor 40 tot 80 uur (#1390)

Stand 28-11-2026. Tooling: `node scripts/audio_budget.mjs` (meting, doorrekening, controle), budgetten en aannames in
`scripts/audio_budget.json`, test `scripts/audio_budget_test.mjs`. Bron van de aannames: bijbel
`docs/verhaal/bijbel-28-11/03-wereld-en-bouwplan.md` §4.2 en `docs/PAGES-BUILD-21-11.md`.

## Wat er nu is (gemeten)

| Onderdeel | Bestanden | Grootte |
|---|---|---|
| `game/audio` totaal | 4.935 clips en bestanden | 299 MB |
| stemclips (`voicelines`, mp3 en ogg) | 4.896 | 88 MB (gemiddeld 18,4 kB, grootste 77 kB, 0 dubbele) |
| muziek (`gmusic`, `scenario`, `theme`) | 84 | 185 MB |
| voetbal, sfx, nieuws, npc, politie | 448 | 22 MB |

Zwaarste scène aan stem: C00.2 met 22 gesproken regels (ca. 0,4 MB). Het web laadt audio pas bij gebruik (de service worker
precacht alleen de schil, #757), dus de laadlast zit per scène en per speeluur, niet bij het opstarten.

## Doorrekening

Aannames (schattingen, geen metingen): 125 tot 162,5 regels per speeluur (de bijbel: 5.000 tot 6.500 regels op 40 uur,
10.000 tot 13.000 op 80 uur), waarvan 1.390 gesproken verhaalregels er al zijn; elke nieuwe regel weegt gemiddeld zoveel als
nu (18,4 kB mp3); Opus is 0,56 maal mp3 (179 van 319 MB bij de proefbouw); web nu 598,6 MB met mp3-terugval (115,6 MB
niet-audio, 179 MB Opus); de portable-exe is nu ca. 450 MB.

| Doel | Nieuwe clips | Extra mp3 | Web met mp3-terugval | Web alleen Opus | Installatie (exe) | Stem per speeluur |
|---|---|---|---|---|---|---|
| 40 uur | 3.610 tot 5.110 | 65 tot 92 MB | 700 tot 742 MB | 331 tot 346 MB | 515 tot 542 MB | 2,3 tot 2,9 MB |
| 80 uur | 8.610 tot 11.610 | 155 tot 209 MB | 841 tot 925 MB | 381 tot 412 MB | 605 tot 659 MB | 2,3 tot 2,9 MB |

## Budgetten (plafonds)

| Maat | Budget | Waarom |
|---|---|---|
| Web (GitHub Pages) | 800 MB | de site is "aanbevolen" maximaal 1 GB; 20% ruimte voor wereld en code |
| Installatie (portable-exe) | 750 MB | ruim onder de 2 GB-grens van een releasebijlage; downloadbaar |
| `game/audio` totaal | 550 MB | de doorrekening naar 80 uur (hoog) geeft ca. 510 MB |
| Stemclips samen | 320 MB | idem (88 MB nu plus 209 MB) |
| Gemiddelde stemclip | 25 kB | nu 18,4 kB; barks en korte regels houden dat laag |
| Grootste stemclip | 150 kB | nu 77 kB; langere regels worden in tweeën gesplitst |
| Dubbele clips (zelfde inhoud) | 0 | het opruimen van dubbelen is stap 6 van bijbel 03 §4.4 |
| Stem per scène | 1,5 MB | ca. 80 regels; nu 0,4 MB |
| Stem per speeluur | 3,5 MB (mp3) | de doorrekening geeft 2,3 tot 2,9 MB |

## Uitkomst en besluit

- **40 uur past overal binnen**, ook met de mp3-terugval voor oude Safari.
- **De mp3-terugval op het web houdt het tot ca. 53 uur** (hoog scenario). Daarna is **alleen Opus publiceren** nodig
  (`GDE_WEB_OPUS_ONLY=1`, zie `web/build.mjs`): 80 uur komt dan op ca. 410 MB. De prijs: Safari vóór 18.4 valt weg.
  Dit is een keuze voor de eigenaar; de gewone controle dwingt hem niet af (zie `--streng`).
- **De installatie blijft onder de 750 MB** tot ca. 111 uur, de stemclips tot ca. 87 uur.
- De muziek (185 MB) is de grootste vaste post en verandert niet door het verhaal.

## Gebruik

- `node scripts/audio_budget.mjs`: exit 1 als de huidige stand boven een budget zit (te grote of te zware clip, dubbele
  clips, te veel stem per scène, te grote map).
- `node scripts/audio_budget.mjs --streng`: faalt ook als de doorrekening naar 80 uur (hoog) boven een budget gaat. Dat doet
  hij nu (de mp3-terugval op het web); gebruik het als signaal bij elke TTS-ronde.
- Na elke TTS-ronde: draai het script, ruim dubbelen op, kijk naar "past tot". Budgetten zijn plafonds in
  `scripts/audio_budget.json`; verhogen mag alleen met een reden in dit document.

## Niet gedaan

- De doorrekening gebruikt het gemiddelde clipgewicht van nu; nieuwe regels kunnen langer zijn. De duur is niet gemeten
  (5 seconden per clip is de aanname van de bijbel).
- De Opus-ratio komt uit de proefbouw van 21-11, niet uit een nieuwe bouw. De exe-grootte (450 MB) is een oud cijfer
  uit de docs, niet van deze bouw. Er is geen web-dist of exe gebouwd.
- Samen spelen: geen speleffect. Audio laadt per speler lokaal; een gast haalt dezelfde clips uit zijn eigen installatie.
