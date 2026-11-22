# Perfect-stand 22-11: akte 3 (Aan de Eems)

Werkpakket "alles perfect" (epic #1121), scope akte 3: Jelle in persoon, Dijkstra en Geert, de panden (Lammerts havenkantoor), K3, J1 tot en met J3, de M-missies M12 tot en met M16, de tussenstappen (A2, T3), de overgangsscènes (O6, O7), de radio, appjes en autogesprekken van de akte en de loopbaanmomenten (Lucht, Handhaving, Kermis). Bron van de eisen: [RUGGENGRAAT.md](RUGGENGRAAT.md) (blad akte 3), [VERHAALCANON-21-11.md](../VERHAALCANON-21-11.md), [WP-STAND-21-11.md](WP-STAND-21-11.md). Gedaan in de worktree `perfect-akte3-22-11`, geen push, geen build, geen Electron: alles hieronder is **nog niet bekeken** in beeld of gehoor (de Electron-sweep van de coördinator volgt).

Het humorpaneel (Gronings-droog, absurd, warm) is hier door één agent in drie rollen gedaan, want een subagent-paneel was niet beschikbaar; de uitkomst staat onder "Humor" en de eigenaar mag achteraf vetoën.

## Samenvatting

| | |
|---|---|
| Stappen en scènes onderzocht | 17 stappen en overgangen (M12 tot en met M16, J1 tot en met J3, K3, A2, T3, O6, O7) met al hun scènes, plus de pools van de akte (R3.x, A3.x, B3.x) en drie loopbaanmomenten |
| Gefixt | 12 punten (zie de tabel) |
| Nieuw gebouwd | 1 prop (`kantoorwagen`), 1 duif met vluchten, 5 geluidshaken, 2 tests (`akte3_beats_test` 146 controles, `akte3_plekken_test` 65 controles) |
| Open | 7 punten, allemaal beeld, gehoor, smaak of een nieuw systeem (zie "Open") |
| Stemmen | `voice_wacht` groeit met 1 sleutel (M14.2, Jelle); 1 regel van Dijkstra (M12.4) wacht op de Groningse spreektekst (`tts_waiting.json`); de TTS-ronde volgt |

## Per stap

| Stap | Bereikbaarheid | Tekst | Audio | Props en beeld | Stand |
|---|---|---|---|---|---|
| R3.0 radio, vrijdagochtend | n.v.t. | Jelle legt het koopboek zelf uit; kort | stem aanwezig | n.v.t. | gedaan |
| M12 Het staat niet in het rooster (5 scènes) | start Lauwersoog 9 m van een weg, heli-doel 5 m; geen gebouw of water | "Die Fries" (Dijkstra, M12.4) was een verwijzing zonder introductie: nu "Jelle is geland" | regel van Dijkstra wacht op opname | koeien op het helidek van de Eemshaven weggehaald (de koeien zitten alleen in het verhaal van Dijkstra); beat-sleutels kloppen | gefixt |
| J1 Post van de gemeente | thuisscène, geen doel | kasboekje en "partner, huisgenoot of overig" blijven; geen dubbele grap | stil/tekst | thuisscène | gedaan |
| M13 Het containerlabyrint (4) | kade en container op land, geen gebouw/water, binnen 56 m van een pad | beats van de outro stonden op regels van M16.6 ("Dat gezicht betekent", "Klopt"): nu op "Prima." en "Ik vroeg niks" | heist-sfeer (C11) bestaat | stapels containers bestaan | gefixt |
| K3 Het havenkantoor in de nacht | stond 1,5 km van Lammerts kade (waar M13 eindigt): nu op de kade, 40 m van een pad, r 400 | tekst ongewijzigd ("Twee bedden" en "Dat is mijn zin" blijven terugkomen) | tekst | scène is ondertitelpraat (zie open) | gefixt |
| A3.2 appjes Sjabbe | n.v.t. | de pand-lijn ("Jelle koopt panden, jullie kunnen er ook een beheren") past bij K3 | stil | n.v.t. | gedaan |
| O6 Een bod | n.v.t. | regie stond op "ochtend" terwijl K3 om drie uur 's nachts speelt: nu "nog in de nacht" (een overgangsscène hangt aan een missie, dus de volgorde M13, O6, K3 is vast) | stem aanwezig | n.v.t. | gefixt |
| M14 De dijk (4) | de start lag 93 m in een polderweiland (de rechte lijn naar de Eemshaven): nu op de Bredeweg bij Bierum, 8,09 km van de sluis; `akte3_test` (122) groen | twee beats stonden op regels die niet meer bestaan ("We rijden over de dijk", "Dat zegt iedereen"); "Mijn juristen vinden..." weg uit de race (de tic stond zeven keer in twee dagen) | geluid van de stempel bij de overdracht; M14 speelt de sluip-sfeer, past matig bij een race (zie open) | trekker-limo en klembord bestaan | gefixt |
| R3.1, R3.4 radio | n.v.t. | kort | stem aanwezig | n.v.t. | gedaan |
| J2 Een envelop in Appingedam | doel 10 m van een weg, geen gebouw/water | omkoping, Lammert ("Een vraag. Zonder envelop."), Durks oma met het zout: geen dubbele grap | stem aanwezig | ondertitelpraat (zie open) | gedaan |
| T3 De trein naar Winschoten | doel op het station (0 m van een weg), geen gebouw/water | Roelfien wordt hier voor het eerst genoemd, vóór M15 | reisscène | n.v.t. | gedaan |
| M15 Laag over het graan (6) | vliegtuigstart op een weiland (bewust, geen weg nodig) | Geert voor het eerst genoemd door Roelfien (M15.3), pas daarna M16.1; beats kloppen | geluid: de jury loopt weg (crowd_groan), flapperende duif, plons op Daans jasje | **kantoorwagen** (TERPSTRA MOBIEL KANTOOR) als nieuwe prop achter de limo (veertien dozen, vier wielen); duif vliegt naar Tammo's schouder en rondjes om Daan (zoals de regie zegt); de duif zat in de camera, dus de vlucht begint eerder | gefixt |
| M16 Nog eentje dan (7 + dijk) | kermisstart 0 m van een weg, de zes waypoints binnen 22 m, de dijk bij Blauwestad 5 m | de laatste beat stond op "Goed. Maandag dan" (nu "Heel goed. Maandag" en "Goed.") | exploitant (shout) en de bots (bonk) | botsauto's bestaan | gefixt |
| A3.3, A3.1, A3.4 appjes | n.v.t. | Mem-aftelling klopt (zeven dagen vrijdag, zes dagen zaterdag, vier dagen op zondag/maandag) | stil | n.v.t. | gedaan |
| R3.3 radio, B3 tot en met B3.3 autogesprekken | n.v.t. | de onvoltooide zin ("Tammo, eigenlijk...") blijft het bijna-moment | tekst | n.v.t. | gedaan |
| O7 Over zaterdag | n.v.t. | stilte-scène, blijft kort | tekst | n.v.t. | gedaan |
| A2 De kermisrit | vrije rit in Stad | n.v.t. | kermisgeluid bestaat | botsauto bestaat | gedaan |
| J3 Koffie bij Tessa's ouders | doel 41 m van een weg, geen gebouw/water | "Hij belde ook" wees naar niemand: nu "Jelle belde ook" | tekst | ondertitelpraat; **Anneke** stond in het karakterboek bij M25 (haar tweede optreden): nu bij J3, met een bio die bij het erf in Siddeburen past | gefixt |
| Loopbaanmomenten Lucht, Handhaving, Kermis | n.v.t. | twee regels per moment, korte beurten; geen voortgang of geld (`careerbeats_test`) | tekst | n.v.t. | gedaan |

## Persoonsbeelden

- **Dijkstra:** introductie via Oma (telefoon) en een naamkaart, daarna Rotor Roelf via Dijkstra; één regel was een verwijzing zonder naam (gefixt).
- **Geert:** eerst genoemd door Roelfien (M15.3), naamkaart in M16.1; staat in `characters.js`.
- **Lammert, Roelfien, Daan, Sjabbe, Anneke:** elk met een introductie vóór de eerste beurt; `introduction_test` 16 groen.

## Humor (één agent, drie rollen)

- Gronings-droog wint: de beste momenten van de akte zijn de droge ("Een vraag. Zonder envelop." en "Dat is geen vraag. Dat is een buurman.").
- Absurd: de kantoorwagen met drie mannen met mappen en de duif op Daans jasje werken nu ook in beeld.
- Warm: de onvoltooide zin (J3 en B3.1) en "Twee bedden" blijven.
- Geschrapt: "Mijn juristen vinden dat u te hard rijdt" in M14.2 (de tic bleef anders overal terugkomen).
- Niet beoordeeld door een tweede paneel: de twee Sjabbe-herhalingen ("Ik vroeg niks", "Dat is mijn zin") staan bewust als terugkerende grap; de eigenaar mag ze schrappen.

## Samen spelen

Geen nieuwe regel nodig. De missies M12 tot en met M15 zijn volgens `coopmissie_audit` volledig samen (M16 is "niet vast te stellen": de handler van de stapsoort ontbreekt in de bron). De stappen J1 tot en met J3, K3, T3 en A2 zijn van wie ze speelt (eigen voortgang en beloning, #429); een gast speelt ze lokaal; er gaat niets over het net dat er niet al was. `multiplayerstorysteps_test` en `coopverhaal_test` blijven groen. De dijkrace is een wedstrijd (docs/COOP-GAST.md).

## Oude saves

De migratie is niet aangeraakt: K3 en J1 tot en met J3 hebben `added: true` of de bestaande ADDED_STEPS-regels; `storymigratie_test` (28), `storymigratie_k_test` (28) en `storymigratie_jelle_test` (18) groen. De verplaatsing van K3 en de nieuwe start van M14 veranderen geen stap-id's of volgorde, dus een speler voorbij een gewijzigde stap blijft doorgaan.

## Open

1. **J2, J3 en K3 hebben geen eigen 3D-regie** (ondertitelpraat bij aankomst): Lammert, Durk, Douwe, Anneke en Sjabbe staan er alleen in de tekst. Een regie als bij M13 vraagt een mechanisme voor reisstappen met een cast; dat is groter werk (spec nodig) en vraagt beeld.
2. **M16.4 (de kus):** de muziek moet wegvallen (muziekcue C17 "stilte"). Er is geen mechanisme in de cutscenes voor een stilte-cue; de lijst blijft "te koppelen".
3. **Muziekcue C15 (het koopboek, bureaucratische marsmuziek)** ontbreekt als nummer; open punt, niets gekoppeld.
4. **M14 speelt `missie_sluipen` (kamerorgel)**: dat past matig bij een race. `missie_caper` zou beter passen; het staat zo in de muzieklijst (C11) en is een smaakbesluit voor de eigenaar.
5. **Camera:** 9 belangrijke bevindingen blijven (springende as in M12.intro, M15.outro en M16.outro; te veel sprekers in M12.3, M14.outro, M16.outro en J2). `cutscene_lint --strict` heeft 0 blokkerend; een oplossing vraagt de opt-in `direct`-regie of tekstwijziging en is zonder beeld niet verantwoord.
6. **Alles in beeld en gehoor:** de kantoorwagen (schaal, plek achter de limo), de duifvlucht, de nieuwe geluiden en de K3-aankomst op de kade zijn niet bekeken.
7. **Testsuite buiten mijn scope:** `coop_coverage_audit_test` faalt op de al bestaande module `game/js/airguidecard.js` (hoort bij geen systeem in `scripts/coop_coverage.json`). `humor_test` (1008) en `dialogue_rhythm_test` (546) zijn groen.

## Tests en controles

Nieuw: `scripts/akte3_beats_test.mjs` (elke regie-aanwijzing van de cutscenes van M12 tot en met M16 wijst naar een echte regel; zou de zes verweesde beats gevonden hebben) en `scripts/akte3_plekken_test.mjs` (reisdoelen en missiepunten tegen de OSM-tegels van de provincie: niet in gebouw, niet in water, weg binnen bereik; leest `scripts/akte3_doelen_snapshot.json`, te verversen met `scripts/akte3_doelen_dump.mjs`, dat zwaar is). Groen gedraaid: `akte3_test` (122), `akte3_aaa_test` (14), `cutscenes_akte3_test` (196), `akte34_beats_test` (118), `verhaal_wp345_test` (44), `story_spine_test` (150), `storyflow_nieuw_test` (1738), `storybridge_test` (151), `storymigratie_*` (74), `careerbeats_test`, `cutscenes_audit` (115 scènes, 0 bevindingen), `cutscene_lint --strict` (0 blokkerend), `voice_coverage` (3492/3492).
