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
| 5e. Sprint humor 22-11: de 25 zwakste beats van akte 1 tot en met 5, kandidaten, scores en veto-lijst | [SPRINT-HUMOR-22-11.md](SPRINT-HUMOR-22-11.md) |
| 5f. Dialoogkwaliteit (21-11): 29 herschreven beats in 15 scènes, per beat twee varianten, het paneeloordeel en de veto-lijst | [DIALOOG-PANEEL-21-11.md](DIALOOG-PANEEL-21-11.md) | verslag |
| 5e. Het filmscript (21-11): logline, beat sheet per akte, sluglines per scène, muziekmomenten en scènebord | [FILMSCRIPT-21-11.md](FILMSCRIPT-21-11.md) | gegenereerd door `node scripts/filmscript_export.mjs` |
| 5f. De muzieklijst (verzonnen nummers, richting per akte en het autoduet) | [MUZIEKLIJST-21-11.md](MUZIEKLIJST-21-11.md) | voor een latere muziekronde |
| 5g. Twaalf radionummers met lyrics over Groningen (prompts voor Gemini, stand) | [MUZIEK-LYRICS-21-11.md](MUZIEK-LYRICS-21-11.md) | eigenaar wil ze; wacht op akkoord voor downloaden |
| 5h. Stand van de werkpakketten WP3, WP4 en WP5 (21-11): per eis uit #1126, #1127 en #1128 gedaan of ontbrak, met de bijgebouwde stappen K1 tot en met K3 | [WP-STAND-21-11.md](WP-STAND-21-11.md) | verslag; de toets is `scripts/verhaal_wp345_test.mjs` |
| 5i. Stand van alle werkpakketten #1122 tot en met #1139 (22-11): matrix gedaan of ontbreekt per WP met bewijs, plus de stappen W1 en W2 | [WP-ALLE-STAND-22-11.md](WP-ALLE-STAND-22-11.md) | verslag; de toets is `scripts/storymigratie_w_test.mjs` |
| 5i. Perfect-stand akte 1 (22-11): wat in de opening, M01 tot en met M06 en N1 tot en met N4 is gefixt en wat open staat | [PERFECT-STAND-22-11-akte1.md](PERFECT-STAND-22-11-akte1.md) | verslag |
| 5i. Oude saves en het nieuwe verhaal (22-11): de kaart 'Nieuw verhaal', de tag 'Oude versie', wat telt als oud en wat nog open staat | [PERFECT-STAND-22-11-oude-saves.md](PERFECT-STAND-22-11-oude-saves.md) | verslag; de toets is `scripts/legacysave_test.mjs` |
| 5i. Perfect-stand props, sets en figuranten (22-11): wat de audit controleert, de aantallen en de open punten | [PERFECT-STAND-22-11-props.md](PERFECT-STAND-22-11-props.md) | verslag; de toets is `scripts/verhaal_props_test.mjs` |
| 5i. Perfect-stand akte 4 (22-11): per stap gedaan, gefixt en open voor Zuidwaarts (J4 tot en met J6, N9, M17 tot en met M21, voetbal), met de nieuwe plekken- en tijdlijntest | [PERFECT-STAND-22-11-akte4.md](PERFECT-STAND-22-11-akte4.md) | verslag; de toetsen zijn `scripts/akte4_plekken_test.mjs` en `scripts/akte4_tijdlijn_test.mjs` |
| 5i. Perfect-stand 22-11, spreektekst: Groningse spreekvormen voor 375 verhaalregels en de stemkeuze voor 26 regels | [PERFECT-STAND-22-11-spreektekst.md](PERFECT-STAND-22-11-spreektekst.md) | verslag; aantallen en open punten |
| 5i. Perfect-ronde 22-11, akte 2: per stap wat is gedaan, gefixt en open (reisdoelen op de tegels, regiebeats, kalender, dubbele grappen, Beppe-uitspraak, props) | [PERFECT-STAND-22-11-akte2.md](PERFECT-STAND-22-11-akte2.md) | verslag; de toetsen zijn `scripts/verhaal_akte2_perfect_test.mjs`, `akte2_beats_audit.mjs` en `akte2_bereik_audit.mjs` |
| 5i. Perfect-stand akte 3 (22-11): per stap en scène gedaan, gefixt of open (bereikbaarheid, tekst, audio, props, systemen), met de nieuwe tests `akte3_beats_test` en `akte3_plekken_test` | [PERFECT-STAND-22-11-akte3.md](PERFECT-STAND-22-11-akte3.md) | verslag |
| 5i. Perfect-ronde 22-11, scope akte 5 en de eindfase: stap voor stap gedaan en open, met aantallen, Samen spelen en wat nog niet in beeld is bekeken | [PERFECT-STAND-22-11-akte5.md](PERFECT-STAND-22-11-akte5.md) |
| 5i. Perfect-ronde 22-11, opening, titelkaart, eindkaarten, recapkaart, overgangen en aftitels: per onderdeel gedaan, gefixt of open, met aantallen | [PERFECT-STAND-22-11-opening-eindkaarten.md](PERFECT-STAND-22-11-opening-eindkaarten.md) | verslag; de toets is `scripts/eindkaarten_opening_test.mjs` |
| 6. Presentatie: trailer | [E-trailer.md](E-trailer.md) (leidend), [nieuw/TRAILER-SCRIPT.md](nieuw/TRAILER-SCRIPT.md) (concept voor #63) | concept, niet leidend |

## Personages en stem

- [STEMKEUZE-VOORSTEL.md](STEMKEUZE-VOORSTEL.md): welke stem bij welk personage (voorstel).
- [TTS-NIEUW-28-11.md](TTS-NIEUW-28-11.md): de nieuwe en herschreven regels van hoofdstuk 1 tot en met 3, stil tot de volgende stemronde (lijst voor de opnameronde).
- [STEMKAARTEN-28-11.md](STEMKAARTEN-28-11.md): stemkaarten en proefzinnen per personageblad van de verhaalbijbel (data, afleiding, test).
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
- [OPENING-FILMSCRIPT-21-11.md](OPENING-FILMSCRIPT-21-11.md) (filmscript van de opening, C00.1 tot C00.3) en [TRAILER-FILMSCRIPT-21-11.md](TRAILER-FILMSCRIPT-21-11.md) (verhaaltrailer ontdek, 75 s): sluglines, shotlijst, cues; zie ../OPENING-TRAILER-BENCHMARK-21-11.md.
- [REVIEWS-RONDE3.md](REVIEWS-RONDE3.md) — verslag van de derde reviewronde.
- [BALANS-TEMPO.md](BALANS-TEMPO.md) — tempo-analyse; de bot speelt inmiddels anders.

Nieuwe verslagen horen in `../archief/<jaar-maand>/` met een kop "Gearchiveerd op …; vervangen
door …". Losse ideeën en voorstellen horen op het bord (#-issue), niet in deze map.
