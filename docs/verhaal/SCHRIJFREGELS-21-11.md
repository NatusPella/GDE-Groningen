# Schrijfregels voor de verhaalherschrijving (21-11, epic #1121)

Werkafspraken voor wie scènes van een akte herschrijft (mens of agent). Spec: [.specs-fire/standards/verhaal.md](../../.specs-fire/standards/verhaal.md). Onderbouwing: [VERHAAL-ANALYSE-21-11.md](../VERHAAL-ANALYSE-21-11.md) en de ruggengraat per akte in [RUGGENGRAAT.md](RUGGENGRAAT.md).

## Canon

- Tammo en Tessa zijn 24, net afgestudeerd en werkloos, vijf jaar vrienden sinds de eerste studieweek; Tammo is vijf jaar stiekem verliefd. Rikus is Tammo's jeugdvriend. Oma Trijntje is Tammo's oma (92).
- Tammo heeft een onverklaarde band met duiven: ze volgen en gehoorzamen hem; anderen merken het op, er is nooit uitleg. Bestaande duivengrappen ("mijn vriend de duivenkoning") blijven.
- Kern: Tessa ontdekt dat ze een frietwagen wil (de snackwagen) en doet dat met Tammo (zijn autoliefde, haar snackliefde). De wagen is thuisbasis en bedrijf.
- Tegenstander en eindbaas: Jelle Terpstra (snackimperium: rijk, bureaucratisch, lang, arrogant, maar "Foar mem"); vroeg en vaak zichtbaar; hij saboteert, koopt panden op, stuurt handlangers; hij wordt verslagen met bureaucratie en vette snacks, nooit met geweld.
- Romance is een hoofdlijn, zoet en komisch. Toon: warm, grappig, soms ontroerend.
- "Grunn", nooit "de Grunn". Tessa spreekt standaard Nederlands. Altijd zomer. Satire, geen leed. Geen echte merken of personen.

## Wat een scène moet doen

1. Introductie (analyse hoofdstuk 8): aankondiging vooraf door een ander personage in één zin; de eerste scène toont één persoonlijkheidstrek; de relatie tot Tammo of Tessa staat in een bijzin; naamkaart bij de eerste verschijning; maximaal één nieuw personage per scène; radio en telefoon introduceren nooit.
2. Dialoog (analyse hoofdstuk 9): een beurt is 2 tot 12 woorden; een uitleg van meer dan 25 woorden wordt twee beurten met een reactie ertussen; hoogstens 3 beurten achter elkaar van één spreker; hoogstens 14 regels per scène; elke scène heeft een wens, een belemmering en een draai; subtekst en stilte mogen (een regie-regel als "(regie: ze kijkt weg)" telt als beurt); personages praten tegen elkaar, niet tegen de speler.
3. Rode draad: elke scène hoort bij de frietwagen-lijn, de romance of Jelle (RUGGENGRAAT.md). Past hij bij geen van de drie, dan schrappen, inkorten of koppelen.
4. Lengte: minimaal als nu; langer alleen met leuke nieuwe dingen.

## Humor

De eigenaar vindt humor moeilijk voor een taalmodel. Daarom:

- Bestaande grappen die werken niet herschrijven: herstructureer eromheen en laat de punchline staan.
- Zuinig met nieuwe grappen. Liever een warme, natuurlijke regel dan een geforceerde grap. Humor komt uit personages, understatement (Groningse droogheid), herhaling met een kicker en stilte, niet uit uitleg.
- Elke nieuwe of herschreven komische beat (de punchline-regel) krijgt drie varianten (andere timing of toon) en een veilige neutrale terugval, in `game/storydata/humor.<naam>.json` (schema: zie `humor.json`; id `H<akte>-<nn>`, `chosen` 0, label `humor-review`). In het 09-script staat variant 0 met tag `[NIEUW]`; de build zet de gekozen variant in de regel en geeft hem het label. Een paneel van drie onafhankelijke beoordelaars kiest de winnaar; de eigenaar krijgt alleen een veto-lijst (HUMOR-KEUZELIJST.md).

## Werkwijze

- Bron: `docs/verhaal/nieuw/09-script-akteN.md` (formaat: kop van 09-script-akte1.md). `game/storydata/script.json` wordt gebouwd met `node scripts/build_story_data.mjs` en wordt niet met de hand bewerkt.
- Een ingesproken regel heeft `[BEHOUDEN]` en een tekst die exact bij een opname hoort. Verander je zo'n tekst, zet dan `[NIEUW]`. Nieuwe tekst heeft geen opname; die komt uit een TTS-ronde (niet door de schrijver). Scène-ID's uit `storyarc_nieuw.js` (`scenes`), missie-ID's, flags en saves blijven gelijk.
- Een Friese regel, of een regel waarin Mem als woord staat, heeft een Nederlandse ondertitel in `game/js/subtitles.js` (FY); `storydata_test` controleert dat.
- Pas `lead` en `CLUES` van je stappen in `game/js/storyarc_nieuw.js` aan waar de feiten veranderen (lead: het doel in één zin, hoogstens 45 woorden).
- Windows-bash mangelt backslashes: schrijf bewerkingsscripts met de Write-tool (`.cjs` in `scripts/`, daarna weg) of gebruik de Edit-tool.

## Toetsen

`node scripts/build_story_data.mjs`, `storydata_test`, `story_spine_test`, `dialogue_rhythm_test` (een nieuwe overtreding faalt; `--write` trekt de lijst gelijk), `introduction_test` (idem), `humor_test`, `storybridge_test`, `storyclarity_test`, `recapcard_test`, de akte-testen van je akte, `voice_coverage --quiet`, `text_audit_test`, `dialect_woorden_test`, `gronings_spoken_test`.

## Dialoogvorm (overlap, onderbreking, stilte)

Achter de tekst van een regel mag, vóór `[NIEUW]`, één tag: `{ov=0.3}` (de volgende regel start 0,3 s eerder: een reactie of "Ja, maar..."), `{cut=1.4}` (de regel wordt na 1,4 s afgekapt en eindigt op drie puntjes; alleen op een regel zonder opname) of `{pause=0.8}` (zoveel stilte na de regel; een stilte telt als beurt). Zonder tag verandert niets. Zet geen tag op een regel van een humorbeat (de build matcht de varianten op de tekst). Code: `game/js/dialogueform.js`, test: `scripts/dialoogvorm_test.mjs`. Samen spelen: het is tekst en timing bij de scène; een gast ziet dezelfde timing mee.
