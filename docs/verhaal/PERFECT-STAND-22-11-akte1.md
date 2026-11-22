# Perfect-stand 22-11: akte 1 (opening, M01 tot en met M06, N1 tot en met N4, O1 tot en met O3, aanloop naar het Loket)

Doorloop van de akte-1-scènes in `game/storydata/script.json` (bron: `docs/verhaal/nieuw/09-script-akte1.md`) tegen de eisen van #987 en #1124 (eerste 20 minuten, geleidelijke onthulling) en de canon. Beslissingen van de coördinator: dubbele of zwakke regels mogen weg (de TTS-ronde volgt), oude saves blijven doorgaan, geen nieuwe audio.

## Gedaan en gefixt (3 regels in 3 scènes)

| Scène | Probleem | Fix |
|---|---|---|
| M01.2 de klus | Dubbele regel: Tessa herhaalde "eerst de stunts, dan naar Berends zus", al gezegd in M01.1 | regel geschrapt |
| M02.5 slot naar het Loket | Henk werd genoemd vóór zijn introductie ("Henk vroeg niks") en Jelle heette "een snackbaron" zonder dat iemand dat zei | "die nieuwe band van Henk van de garage. Hij vroeg niks."; "Waarom vraagt Jelle naar alarmen?"; de grap H06 (koekje) blijft |
| N2 een duif op de gang | Tammo zegt dat de buurman er "sinds de verhuisdag" woont, de buurman zegt "zes jaar": tegenspraak | "Hij woont hier met zijn duiven." |

De gewijzigde regels staan als wachtend in `scripts/tts_waiting.json`; `voice_coverage` is groen (3492 van 3492).

## Gecontroleerd en in orde (geen wijziging nodig)

| Onderdeel | Uitkomst |
|---|---|
| Opening C00.1 tot en met C00.3 | `openingfilm_test`, `openingstart_test`, `openingtempo_test` groen (171 s, 19 shots, keuken 22 shots); één haak per scène |
| Cutscenes akte 1 | `cutscenes_akte1_test` 238, `cutscenes_audit_test` 115 scènes zonder bevinding, `cutscene_sprekers_test` 1253, `cutscene_lint --strict` 0 blokkerend |
| Verhaalrug en keten | `story_spine_test` 150, `mission_chain_test` 96, `akte1_runner_test` 11, `akte1_aaa_test` 78 |
| Canon | Tammo en Tessa 24 en net af, vijf jaar vrienden; Jelle Terpstra pas als schim (radio, chat, kleding) vóór zijn eerste optreden; Beppe Fries; Berend en Hoving geïntroduceerd vóór verwijzing |
| Spreektijd | `cutscenes_voicedur_test` 78 scènes zonder mislukking |

## Open (niet gedaan of niet te controleren in deze worktree)

- Bereikbaarheid van de doelcoördinaten (`akte1_doelen_test`, `cutscene_tree_test` werelddeel): overgeslagen, er is geen wereld en geen `data/cache/province` in deze worktree; draait de coördinator bij de releasegate.
- Beeld en gehoor van de eerste 20 minuten: nog niet bekeken (geen Electron op verzoek). De hints, de leestijd en de aankomstradius van M01 tot en met M03 zijn alleen via tests gecontroleerd.
- Zwakke grappen: M01.4 ("Dat klinkt als een kras met een parasol") en M04.3 ("Pompeblêden") zijn bewust gehouden (Gronings-droog); het humorpaneel kreeg deze ronde geen nieuwe beoordeling, de eigenaar mag vetoën.
- Props en figuranten: geen ontbrekende gevonden door `cutscenes_audit` en `cutscene_sprekers`; de 3D-prop van het prikbord (WP1-wens) blijft open.
- Samen spelen: onveranderd. De opening is van wie het spel opende, een gast ziet haar niet opnieuw; stappen M01 tot en met M06 en N1 tot en met N4 zijn per speler (#429); geen nieuw bericht, dus geen nieuwe coöp-test.
- Oude saves: geen stap toegevoegd of hernoemd, alleen regels geschrapt of herschreven; de migratie is ongewijzigd.
