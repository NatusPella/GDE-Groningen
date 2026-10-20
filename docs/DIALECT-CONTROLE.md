# Dialectcontrole: Gronings en Fries in de speltekst (#13)

Stand: 20 oktober 2026. Besluit van de eigenaar: geen echte spreker laten nalezen,
maar de dialectwoorden zelf systematisch controleren; een speler die een fout vindt,
meldt die zelf. Dit document zegt **wat gecontroleerd is, waarmee, en wat niet**.

## Wat er in het spel staat

- **Gronings, ingesproken:** `scripts/gronings_spoken.json` (2508 regels: getoonde Nederlandse tekst -> gesproken spelling). De ondertitel blijft Nederlands.
- **Gronings, getoond:** 410 regels in speltekst (banter, voorbijgangers, Ommeland, missies) bevatten Groningse woorden of zinnen (Moi, nait, mien jong, Doe bist ...).
- **Fries, getoond:** vooral de regels van Jelle Terpstra en de skûtsje-uitdaging (`pg_lines.js`, `missions.js`, `casework.js`, `ommelandlines.js`, prestatienamen), met Nederlandse ondertitels in `subtitles.js`.

## Register en test

| Bestand | Rol |
|---|---|
| `scripts/dialect_woorden.json` | register: elk Gronings woord (589) en Fries woord (89) met Nederlandse betekenis, status en opmerking; plus `nl_ok` (gewone Nederlandse woorden in Groningse regels) |
| `scripts/dialect_check.mjs` | haalt de Groningse woorden uit de tabel (uitlijning getoond -> gesproken); `--write` voegt nieuwe woorden toe met status `nieuw`, `--lijst` toont de twijfelgevallen |
| `scripts/dialect_woorden_test.mjs` | faalt bij een niet-geregistreerd of onbeoordeeld woord, bij een ontbrekende opmerking, bij 'de Grunn' in gesproken tekst, en bij een Fries woord (diakriet-letters of de lijst markerwoorden) of Gronings woord in getoonde tekst dat niet in het register staat |

Een nieuw dialectwoord toevoegen: `node scripts/dialect_check.mjs --write`, de betekenis nakijken, de status wijzigen
(`bron`, `afgeleid`, `kennis` of `twijfel` met opmerking), daarna de test draaien.

Statussen: **bron** = bevestigd in een genoemde bron; **afgeleid** = regelmatige klankverschuiving van het Nederlandse woord volgens
de uitlijning (nl. "woater" voor "water"), consistent gebruikt, niet in een woordenboek nagezocht; **kennis** = bekend Fries,
geen online bron geraadpleegd; **twijfel** = zie opmerking.

## Bronnen

- Wiktionary (Engels), West-Fries: [moai](https://en.wiktionary.org/wiki/moai), [tige](https://en.wiktionary.org/wiki/tige), [sjen](https://en.wiktionary.org/wiki/sjen), [neat](https://en.wiktionary.org/wiki/neat), [hjir](https://en.wiktionary.org/wiki/hjir), [drok](https://en.wiktionary.org/wiki/drok), [gjin](https://en.wiktionary.org/wiki/gjin), [dyn](https://en.wiktionary.org/wiki/dyn), [skûtsje](https://en.wiktionary.org/wiki/sk%C3%BBtsje), [weach](https://en.wiktionary.org/wiki/weach), [hjoed](https://en.wiktionary.org/wiki/hjoed). Bevestigd: betekenis en schrijfwijze.
- Nds-nl Wikipedia, [Grunnegs](https://nds-nl.wikipedia.org/wiki/Grunnegs): klankverschuiving oa/ai/ou, "nait", "rieden" voor rijden, "moeke", "hoes" voor huis.
- Woordwaark (woordenboek Gronings, [woordwaark.nl](https://www.woordwaark.nl)) en [Wikipedia Gronings](https://en.wikipedia.org/wiki/Gronings_dialect): genoemd als de standaardbronnen; de woordenboeksite is dynamisch en niet raadpleegbaar zonder browser, dus **geen woord is hier opgezocht**.
- Niet bruikbaar: groningsonline.nl gaf een serverfout, op Wiktionary ontbreken veel Friese woorden (fakmanskip, wykein, publyk, nedich, betiid, efkes, wrachtich, mjitte).

## Resultaat

Register: Gronings 589 woorden (2 `bron`, 564 `afgeleid`, 23 `twijfel`); Fries 89 woorden (11 `bron`, 73 `kennis`, 5 `twijfel`). `node scripts/dialect_check.mjs --lijst` toont de actuele twijfelgevallen.

### Gecorrigeerd

- `casework.js`: "Jim wiene" werd "Jimme wiene" (standaardvorm van jullie; regel is niet ingesproken).

### Twijfelgevallen in ingesproken Gronings (niet gewijzigd: opnieuw inspreken vraagt akkoord van de eigenaar)

| Gesproken | Probleem | Voorstel bij een nieuwe opname |
|---|---|---|
| "Klemrieden!" | voltooid deelwoord (klemgereden) staat in de onbepaalde wijs; vergelijk "inreden" | "Klemreden!" |
| "dié" ("Doar heb ik dié leerd fietsen") | accent, elders "dij" | "dij" |
| "Dar kriegst hier subsidie veur" | elders "doar" | "Doar" |
| "hoeren" | elders "heuren" (heurde, heurd, heurst) | "heuren" |
| "hanen" (in "wrieven in heur hanen") | betekent ook kippenmannetjes | "haanden" nagaan |
| "loskoppen" voor "losgepikt" | andere betekenis | nagaan |
| "zut" / "zist" / "ziest" / "ziet" | vier vormen voor "ziet" | één vorm |
| "overaal" naast "aaloverst" | twee woorden voor overal | één woord |
| "blieft" naast "bliedt" | twee vormen voor blijft | één vorm |
| "eigenlk" (2x) naast "aigenlk" (19x) | spellingvariant | "aigenlk" |
| "nuim-" naast "nuum-" | twee spellingen van noemen | één vorm |
| "hold" naast "holt" | twee vormen van houdt | één vorm |
| "duventil" | samenstelling met duif | "duuventil" nagaan |
| "luuster'n" (getoond) | afkorting naast "luusteren"/"luustern" | één vorm |

### Fries: twijfel

- "ferhip" (Jelle, `pg_lines.js`): niet bevestigd, betekenis onzeker.
- "fan'e jûn" (missions.js, subtitles.js): Fries schrijft "fan 'e jûn" met spatie.
- "naar hûs" (`ommelandlines.js`): Nederlands "naar" bij Fries "hûs" (Fries: "nei hûs"); of de menging bedoeld is, is niet nagegaan.
- "wâld" in "JelleWâld": verzonnen kanaalnaam, woordspeling.
- "skûtsjezeiler" (Nederlandse ondertitel): Nederlands "zeiler" in een Fries woord; de Friese regel zegt "skûtsjesiler".

Alles hierboven staat met opmerking in het register (status `twijfel`).

## Wat niet is gecontroleerd

- Geen woord Gronings is in een woordenboek opgezocht (Woordwaark en andere bronnen waren niet bereikbaar); de status `afgeleid` zegt alleen dat het woord regelmatig uit het Nederlands volgt en consistent wordt gebruikt.
- De Friese detectie in de test gaat op diakriet-letters en een lijst markerwoorden; een Fries woord zonder diakriet dat niet op die lijst staat, wordt niet automatisch gevonden.
- Zinsbouw en natuurlijkheid zijn niet beoordeeld, alleen woorden en spelling.
- De Friese regels van de Deel 4-scripts (`docs/verhaal/deel4-f4*.md`) en de bijbehorende kaartteksten zijn alleen voor zover ze in de speltekst staan meegenomen.
