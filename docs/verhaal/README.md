# Verhaal: begin hier

Dit is de ingang van `docs/verhaal/`. De **canonieke regels** voor verhaal, personages en stem
staan in [`.specs-fire/standards/verhaal.md`](../../.specs-fire/standards/verhaal.md); deze map is
naslag: de bron, de scripts, de opnames en de verslagen. Bij verschil wint de spec (en bij twijfel
`AGENTS.md`). Niets hier is een besluit dat nog genomen moet worden: besluiten staan op het bord.

## De weg van verhaal naar spel

| Stap | Document | Status |
|---|---|---|
| 1. Canon: wie, wat, waarom, per akte | [nieuw/00-OVERZICHT.md](nieuw/00-OVERZICHT.md), [KALENDER.md](KALENDER.md), [nieuw/01-akte1.md](nieuw/01-akte1.md) … [nieuw/05-akte5.md](nieuw/05-akte5.md) | leidend; de spec vat de regels samen |
| 2. Zijmissies, minigames en Deel 4 | [nieuw/06-zijmissies-en-minigames.md](nieuw/06-zijmissies-en-minigames.md), [nieuw/DEEL4.md](nieuw/DEEL4.md) | leidend |
| 3. Script per akte (regels, sprekers, opnames) | [nieuw/09-script-akte1.md](nieuw/09-script-akte1.md) … [nieuw/09-script-akte6.md](nieuw/09-script-akte6.md) | leidend |
| 4. Bouwen: TTS, opnames, dialect (runbook #735) | [nieuw/07-TTS-RAMING.md](nieuw/07-TTS-RAMING.md), [OPNAMERONDE-735.md](OPNAMERONDE-735.md) (definitieve lijst en runbook), [DIALECT-NALEZING.md](DIALECT-NALEZING.md), [DIALECT-CONCEPT.md](DIALECT-CONCEPT.md) (gegenereerd), [OPNAMELIJST.md](OPNAMELIJST.md) (lokaal, niet in git) | cijfers komen uit de generator, niet uit proza |
| 4b. Achterstand: spreekregels zonder stem buiten `script.json` (stand 21-11, batches en kosten) | [TTS-ACHTERSTAND-21-11.md](TTS-ACHTERSTAND-21-11.md) (gegenereerd door `node scripts/voice_backlog.mjs --write`) | naslag; cijfers uit de generator |
| 5. In het spel: scènes en acteurs | [nieuw/08-IMPLEMENTATIE.md](nieuw/08-IMPLEMENTATIE.md) (momentopname 17-10-2026; paden kunnen verouderd zijn), [STIJLGIDS.md](STIJLGIDS.md) | naslag; de code is de waarheid |
| 5b. De ruggengraat per akte (21-11, #1123) | [RUGGENGRAAT.md](RUGGENGRAAT.md) | naslag; de toets is `scripts/story_spine_test.mjs` |
| 5c. Schrijfregels voor de verhaalherschrijving (21-11, #1121): canon, introductie, dialoog, humor, werkwijze | [SCHRIJFREGELS-21-11.md](SCHRIJFREGELS-21-11.md) | naslag |
| 5d. De humorkeuze (veto-lijst, 21-11): per komische beat de gekozen variant, het paneeloordeel en de alternatieven | [HUMOR-KEUZELIJST.md](HUMOR-KEUZELIJST.md) | gegenereerd door `node scripts/humor_doc.mjs` |
| 5e. Het filmscript (21-11): logline, beat sheet per akte, sluglines per scène, muziekmomenten en scènebord | [FILMSCRIPT-21-11.md](FILMSCRIPT-21-11.md) | gegenereerd door `node scripts/filmscript_export.mjs` |
| 5f. De muzieklijst (verzonnen nummers, richting per akte en het autoduet) | [MUZIEKLIJST-21-11.md](MUZIEKLIJST-21-11.md) | voor een latere muziekronde |
| 6. Presentatie: trailer | [E-trailer.md](E-trailer.md) (leidend), [nieuw/TRAILER-SCRIPT.md](nieuw/TRAILER-SCRIPT.md) (concept voor #63) | concept, niet leidend |

## Personages en stem

- [STEMKEUZE-VOORSTEL.md](STEMKEUZE-VOORSTEL.md): welke stem bij welk personage (voorstel).
- [TESSA-NEDERLANDS.md](TESSA-NEDERLANDS.md): hoe Tessa praat (naslag).
- [DIALECT-NALEZING.md](DIALECT-NALEZING.md) en het gegenereerde
  [DIALECT-CONCEPT.md](DIALECT-CONCEPT.md): de Groningse regels; de aantallen komen uit de
  generator (`scripts/dialect_*`), niet uit de tekst van het document.
- Personages heten in de code en de canon M-nummers (M01-M30) en T1-T5; de oude H-nummers zijn
  historie (zie [nieuw/00-OVERZICHT.md](nieuw/00-OVERZICHT.md) §6 voor de mapping).
- Eén bron voor de namen: [../personages.md](../personages.md) en `game/js/characters.js`
  (Tammo, Tessa, Jelle, Oma Trijntje, Lammert, …). Verzonnen namen, geen echte personen
  (constitutie 2).

## Historie en verslagen

Deze documenten zijn verslagen van eerdere rondes, geen actuele canon. Ze hebben een datum in de
kop; vervangen door de spec of de actuele documenten:

- [OPENING-ONTHULLING.md](OPENING-ONTHULLING.md) (#987, actueel): meting en ontwerp van de geleidelijke onthulling in de opening en M01-M03; de test is `scripts/verhaal_onthulling_test.mjs`.
- [OPENING-BIJBEL.md](OPENING-BIJBEL.md), [OPENING-DIAGNOSE.md](OPENING-DIAGNOSE.md),
  [OPENING-LEESTEST.md](OPENING-LEESTEST.md) — de opening van het verhaal, oude ronde.
- [REVIEWS-RONDE3.md](REVIEWS-RONDE3.md) — verslag van de derde reviewronde.
- [BALANS-TEMPO.md](BALANS-TEMPO.md) — tempo-analyse; de bot speelt inmiddels anders.

Nieuwe verslagen horen in `../archief/<jaar-maand>/` met een kop "Gearchiveerd op …; vervangen
door …". Losse ideeën en voorstellen horen op het bord (#-issue), niet in deze map.
