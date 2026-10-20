# Dialectcontrole: Gronings en Fries in de speltekst (#13)

Stand: 20 oktober 2026. Besluit van de eigenaar: geen echte nalezer, maar zelf controleren; een speler die een fout
vindt, meldt die zelf. Dit document zegt **wat er is nagezocht, waarin, en wat er uitkwam**. De opzoekingen zijn echt
gedaan in openbare woordenboeken; het is geen oordeel van een moedertaalspreker.

## Wat er in het spel staat

- **Gronings, ingesproken:** `scripts/gronings_spoken.json` (2508 regels: getoonde Nederlandse tekst -> gesproken spelling; de ondertitel blijft Nederlands). Dit levert 585 verschillende Groningse woorden op.
- **Gronings, getoond:** 410 regels in speltekst (banter, voorbijgangers, Ommeland, missies) bevatten Groningse woorden of zinnen.
- **Fries, getoond:** vooral de regels van Jelle Terpstra en de skûtsje-uitdaging (`pg_lines.js`, `missions.js`, `casework.js`, `ommelandlines.js`, prestatienamen), met Nederlandse ondertitels in `subtitles.js`. 89 Friese woorden.

## Bronnen en werkwijze

| Bron | Wat | Gebruikt voor |
|---|---|---|
| [WoordWaark](https://woordwaark.nl) (Centrum Groninger Taal en Cultuur en de Rijksuniversiteit Groningen) | 10 woordenboeken: Molema, ter Laan, Reker, Ganderheyden, Steenhuis 1 en 2, Meijer, Boeles, Abels en Westerkwartier | alle Groningse woorden: Gronings -> Nederlands (exact), en voor 82 woorden die geen trefwoord zijn ook Nederlands -> Gronings |
| [en.wiktionary.org](https://en.wiktionary.org) en [fy.wiktionary.org](https://fy.wiktionary.org), via de MediaWiki-API | sectie West Frisian en het Friese Wiktionary | Friese woorden |
| [fy.wikipedia.org](https://fy.wikipedia.org), zoeken op de exacte vorm | aantal artikelen waarin het woord staat | Friese woorden (is het woord in gebruik?) |
| [nds-nl.wikipedia.org](https://nds-nl.wikipedia.org/wiki/Grunnegs) | artikel Grunnegs | klankverschuiving (oa, ai, ou), "nait", "rieden", "moeke", "hoes" |

Hoe de gegevens zijn verzameld: WoordWaark is een webapp, dus de woorden zijn een voor een ingevoerd in het zoekveld in de
browser (taal Gronings, alle tien de woordenboeken, exact zoeken) en de resultaten zijn uitgelezen; alleen losse woorden
zijn verstuurd, geen persoonsgegevens. De uitkomst staat in `scripts/dialect_bronnen.json`; `scripts/dialect_bronnen.mjs`
verwerkt die offline in het register `scripts/dialect_woorden.json`. Wiktionary en Wikipedia zijn via hun API benaderd.
Het Nederlandstalige Wiktionary heeft maar enkele Groningse woorden en is daarom niet bruikbaar voor de hele lijst.

## Register en test

| Bestand | Rol |
|---|---|
| `scripts/dialect_woorden.json` | register: elk Gronings (589) en Fries (89) woord met Nederlandse betekenis, status, opmerking en bewijs; plus `nl_ok` (gewone Nederlandse woorden in Groningse regels) |
| `scripts/dialect_bronnen.json` | het bewijs uit de woordenboeken, per woord |
| `scripts/dialect_check.mjs` | haalt de woorden uit de tabel; `--write` voegt nieuwe woorden toe, `--lijst` en `--markdown` tonen de twijfelgevallen |
| `scripts/dialect_bronnen.mjs` | verwerkt het bewijs in het register |
| `scripts/dialect_woorden_test.mjs` | faalt bij een niet-geregistreerd of onbeoordeeld woord, een woord zonder bewijs, een ontbrekende opmerking, 'de Grunn' in gesproken tekst, en bij een Fries woord (diakriet-letters of de lijst markerwoorden) of Gronings woord in getoonde tekst dat niet in het register staat |

Een nieuw dialectwoord toevoegen: `node scripts/dialect_check.mjs --write`, de betekenis nakijken, het woord opzoeken
(WoordWaark), de status zetten (`bron`, `afgeleid`, `kennis` of `twijfel` met opmerking) en de test draaien.

Statussen: **bron** = in een woordenboek gevonden (bij Gronings: als trefwoord, met of zonder bevestigde vertaling;
bij Fries: in Wiktionary); **afgeleid** = geen trefwoord (meestal een vervoegde of samengestelde vorm), maar een
regelmatige klankverschuiving van het Nederlandse woord en consistent gebruikt; **kennis** = Fries, niet gevonden in een
woordenboek, wel in gebruik volgens fy.wikipedia of eigen kennis; **twijfel** = zie opmerking.

## Resultaat

- **Gronings (589 woorden):** 144 `bron` (187 trefwoorden gevonden; bij 116 komt de vertaling overeen, bij 28 is er alleen een trefwoord zonder uitgelezen vertaling), 378 `afgeleid`, 67 `twijfel`. 400 woorden zijn geen trefwoord: dat zijn bijna altijd vervoegde vormen (kriegt, riedst, stuurst), samenstellingen (vismark, omlaiding) of eigennamen; daarvan is alleen gecontroleerd of de stam bestaat.
- **Fries (89 woorden):** 49 `bron`, 32 `kennis`, 8 `twijfel`.
- **Wat een afwijking betekent:** Gronings heeft geen enkele standaardspelling en de woordenboeken (Molema 1895, ter Laan, Reker) gebruiken verschillende schrijfwijzen en dialecten (Stad, Westerkwartier, Oldambt). "Staat niet in WoordWaark" bewijst dus niet dat een woord fout is; het zegt dat een spreker ernaar moet kijken.

### Gecorrigeerd

- `casework.js`: "Jim wiene" werd "Jimme wiene" (standaardvorm van jullie; regel is niet ingesproken).
- In de getoonde tekst is verder niets aangepast: de twijfelgevallen hieronder komen op één na alleen voor in de ingesproken versie (de Nederlandse tekst "ieder normaal mens" in `phone.js` is gewoon Nederlands). Wijzigen van ingesproken regels vraagt opnieuw inspreken en dus akkoord van de eigenaar.

### De belangrijkste twijfelgevallen in de ingesproken regels

Gesorteerd op hoe vaak het woord voorkomt. Het volledige overzicht staat onderaan.

| Gesproken | Keer | Wat WoordWaark zegt | Voorstel |
|---|---|---|---|
| `aleen` (alleen) | 48 | alleen "allain", "allaint", "allènt", "allinneg" | allain |
| `ieder` (iedereen) | 28 | "ieder" betekent daar *ijzer*; iedereen is "elkenain", "aal" | elkenain |
| `aarst` (eerst) | 26 | geen treffer; ter Laan geeft "aarst" = "arks" | navragen |
| `bieno` (bijna) | 21 | geen treffer; wel "hoast", "benoasten" | hoast |
| `betje` (beetje) | 19 | wel "bietje", "beetken" | bietje |
| `duven`/`duuve` (duiven) | 18+ | "doeve", "doef" ("doevemelker") | doeve |
| `hiele` (hele) | 15 | "hail", "hiel", "hijl" | navragen |
| `zied` (sinds) | 15 | "zied" is zijde/kant; sinds is "sunt" | sunt |
| `vaaren` (varen) | 12 | "voaren" (ook nds-nl Wikipedia) | voaren |
| `aindelk` (eindelijk) | 11 | "endelk", "ìndelk" | endelk |
| `vrogger` (vroeger) | 11 | "vrouger", "veurheer" | vrouger |
| `aaloverst` (overal) | 11 | "overaal", "alderwegens" | overaal |
| `zulfs` (zelfs) | 9 | "zölfs", "zuls" | zölfs |
| `aarste` (eerste) | 9 | zie `aarst` | navragen |
| `dartig` (dertig) | 8 | "daarteg", "dareg" | daarteg |
| `aovend` en samenstellingen | 13 | "oavend", "toavend" (geen "aovend") | oavend |
| `huzen`/`pakhuzen`/`herenhuzen` e.d. | 16 | "hoes", "huus", "pakhoes" | navragen |
| `aend` (eend) | 2 | "aind" is eend; maar wij gebruiken "aind" ook voor *einde* | aind en einde onderscheiden |

Kleinere punten (staan in de tabel): "klemrieden" moet een voltooid deelwoord zijn (vergelijk "inreden"),
"hoeren" naast "heuren", "zut/zist/ziest/ziet" voor één werkwoordsvorm, "nuim-" naast "nuum-" (WoordWaark kent alleen
"nuim-"/"neum-"), "still" en "woonen" met een dubbele letter, "lait" (laat; WoordWaark heeft "loat"), "opnij" en
"voortoan" (WoordWaark: "vannijs", "veurdan"), "dié" met een accent.

Woorden die wél kloppen: onder andere woater, eefkes, moeke, stroat, aaltied, dien, zai, kwiet, vief, vandoage, doarom,
woarom, noa, thoes, kaant, tiedens, pien, rieden, zeun, voader, hakken, wichtje, kepot en tuun staan in de woordenboeken
met de bedoelde betekenis.

### Fries

- **Bevestigd** (Wiktionary West-Fries, 49 woorden): o.a. moai, tige, sjoch/sjen, neat, hjir, drok, gjin, dyn, myn, foar, mem, hjoed, jûn, út, ús, hûs, tún, genôch, jild, sûkelade, wêr, ien, twa, trije, fuort, ek, oant, sizze, fertelle, jaan, pompeblêd, wâld, weach, gelok, hear, net, noch; "jimme", "wiene", "woe" en "Snits" in het Friese Wiktionary.
- **In gebruik volgens fy.wikipedia, niet in Wiktionary** (kennis): o.a. wykein (275 artikelen), fakmanskip (37), publyk (1576), betiid (273), efkes (248), bytsje (1090), werom (7897), mjitte (796), teminsten (1126), allinnich (4703), potsje (81), útslach (348), grinzers (27).
- **Twijfel** (8): "ferhip" (0 treffers), "hekweach" (0), "trapfyts" (0; "fyts" is wel Fries), "wrachtich" (6), "fan'e" (Fries schrijft "fan 'e"), "naar hûs" (Fries: "nei hûs"), "skûtsjezeiler" (Nederlandse ondertitel), "wâld" in "JelleWâld" (woordspeling).
- Zinsbouw en idioom van de Friese regels zijn niet beoordeeld; alleen woorden. De Jelle-regels mengen Fries en Nederlands bewust.

## Wat niet is gecontroleerd

- Geen enkele zin is door een spreker gelezen; ook een woord dat in een woordenboek staat kan op die plek onnatuurlijk zijn.
- De 400 Groningse woorden die geen trefwoord zijn, zijn alleen via de stam gecontroleerd (82 daarvan ook Nederlands -> Gronings); de status `afgeleid` is dus zwakker dan `bron`.
- Woordwaark-opzoekingen zijn exact op de gesproken spelling; bij de 40 woorden waarvan het trefwoord een andere betekenis heeft ("wait" = tarwe, "holt" = hout), is de bedoelde betekenis (weet, houdt) een werkwoordsvorm die niet als trefwoord staat.
- De Friese detectie in de test gaat op diakriet-letters en een lijst markerwoorden; een Fries woord zonder diakriet dat niet op die lijst staat, wordt niet automatisch gevonden.

## Twijfelgevallen die toch een spreker zouden willen zien

Dit is de volledige lijst (gegenereerd met `node scripts/dialect_check.mjs --markdown`). De Groningse zitten in al
ingesproken regels (nieuwe opname nodig na akkoord van de eigenaar).

### Gronings

| Woord | Keer | Betekenis bij ons | Wat Woordwaark of de controle zegt | Voorstel |
|---|---|---|---|---|
| aleen | 48 | alleen | Woordwaark (Nederlands -> Gronings, trefwoord "alleen"): allain, allaint, allinneg, allènt, bloots; "aleen" komt niet voor | allain |
| ieder | 28 | iedereen | Woordwaark kent "ieder" alleen als "ijzer" (Reker, ter Laan); voor "iedereen" staan daar "aal", "elkenain", "elkain" | elkenain |
| aarst | 26 | eerst | Woordwaark (Nederlands -> Gronings, trefwoord "eerste"): geen "aarst"; ter Laan en Steenhuis geven "aarst" = "arks"; de vorm voor eerst is niet bevestigd | navragen |
| bieno | 21 | bijna | Woordwaark (Nederlands -> Gronings, trefwoord "bijna"): host, hoast, benoasten, glad; "bieno" komt niet voor | hoast |
| betje | 19 | beetje | Woordwaark (Nederlands -> Gronings, trefwoord "beetje"): beetken, bietje, bedie; "betje" komt niet voor | bietje |
| duven | 18 | duiven | Woordwaark (Nederlands -> Gronings, trefwoord "duif"): doef, doeve; "duuv-/duven" komt niet voor, ook doevemelker voor duivenmelker | doeve/doef |
| hiele | 15 | hele | Woordwaark (Nederlands -> Gronings, trefwoord "heel"): hail, hiel, hijl, gehail; "hiele" komt niet voor | hiele navragen |
| zied | 15 | sinds | Woordwaark (Nederlands -> Gronings, trefwoord "sinds"): "sunt", "van dat"; "zied" betekent daar zijde/kant, niet sinds | sunt |
| vaaren | 12 | varen | Woordwaark (Nederlands -> Gronings, trefwoord "varen"): voaren, rieden; "vaaren" komt niet voor (ook nds-nl Wikipedia: voaren) | voaren |
| aindelk | 11 | eindelijk | Woordwaark (Nederlands -> Gronings, trefwoord "eindelijk"): endelk, ìndelk, eindeling; "aindelk" komt niet voor | endelk |
| vrogger | 11 | vroeger | Woordwaark (Nederlands -> Gronings, trefwoord "vroeger"): vrouger, veurheer, veurtied; "vrogger" komt niet voor | vrouger |
| aaloverst | 11 | overal | Woordwaark (Nederlands -> Gronings, trefwoord "overal"): overaal, alderwegens, overal; "aaloverst" komt niet voor | overaal |
| zulfs | 9 | zelfs | Woordwaark (Nederlands -> Gronings, trefwoord "zelfs"): zölfs, zuls, zöls, zulf; "zulfs" komt niet voor | zölfs |
| aarste | 9 | eerste | zie "aarst": "aarste" (eerste) is niet bevestigd | navragen |
| huzen | 9 | huizen | Woordwaark (Nederlands -> Gronings, trefwoord "huis"): hoes, huus (Stad), pakhoes; "-huzen" komt niet voor; nds-nl Wikipedia heeft "hoes" | hoezen/huzen navragen |
| nuimen | 8 | noemen | noemen: "nuim-" naast "nuum-"; twee vormen | een vorm kiezen |
| dartig | 8 | dertig | Woordwaark (Nederlands -> Gronings, trefwoord "dertig"): daarteg, dareg, datteg; "dartig" komt niet voor | daarteg |
| luusteren | 8 | luisteren | Woordwaark (Nederlands -> Gronings, trefwoord "luisteren"): luustern, lustern, heuren; "luusteren" komt niet voor | luustern |
| nuimd | 8 | vernoemd | genoemd: "nuim-" naast "nuum-"; twee vormen | een vorm kiezen |
| still | 8 | stil | Woordwaark (Nederlands -> Gronings, trefwoord "stil"): stil; de dubbele l is niet bevestigd | stil |
| woonen | 8 | wonen | Woordwaark (Nederlands -> Gronings, trefwoord "wonen"): wonen, wonên; de dubbele o is niet bevestigd | wonen |
| nuim | 7 | neem | noemen: "nuim-" naast "nuum-" (nuumt, nuumde, nuumst); twee vormen | een vorm kiezen |
| duvenkeuning | 7 | duivenkoning | Woordwaark (Nederlands -> Gronings, trefwoord "duif"): doef, doeve; "duuv-/duven" komt niet voor, ook doevemelker voor duivenmelker | doeve/doef |
| aind | 6 | einde | "aind" is bij Woordwaark "eend"; wij gebruiken het (ook) voor "einde" (aindelk, aindigen): dubbelzinnig | navragen |
| aovend | 5 | avond | Woordwaark (Nederlands -> Gronings, trefwoord "avond"): oavend, toavend, oavens; "aovend" komt niet voor | oavend |
| tegelieke | 5 | tegelijk | Woordwaark (Nederlands -> Gronings, trefwoord "tegelijk"): tougelieks, toegelieks; "tegelieke" komt niet voor | tougelieks |
| aarder | 4 | eerder | zie "aarst": "aarder" (eerder) is niet bevestigd; Woordwaark geeft "eder", "eer" | eder |
| zist | 4 | zie | ziet/zie: vorm wisselt (zist, ziest, zut, ziet) | ziest |
| opnij | 3 | opnieuw | Woordwaark (Nederlands -> Gronings, trefwoord "opnieuw"): vannijs, vannais, veur nijs; "opnij" komt niet voor | vannijs |
| voortoan | 3 | voortaan | Woordwaark (Nederlands -> Gronings, trefwoord "voortaan"): veurdan, vandan, vedan; "voortoan" komt niet voor | veurdan |
| duvenmelker | 3 | duivenmelker | Woordwaark (Nederlands -> Gronings, trefwoord "duif"): doef, doeve; "duuv-/duven" komt niet voor, ook doevemelker voor duivenmelker | doeve/doef |
| pakhuzen | 3 | pakhuizen | Woordwaark (Nederlands -> Gronings, trefwoord "huis"): hoes, huus (Stad), pakhoes; "-huzen" komt niet voor; nds-nl Wikipedia heeft "hoes" | hoezen/huzen navragen |
| lait | 3 | laat | Woordwaark (Nederlands -> Gronings, trefwoord "laten"): loaten, loat stoan; "lait" komt niet voor | loat |
| vreug | 3 | vroeg | Woordwaark (Nederlands -> Gronings, trefwoord "vroeg"): vroug, vro, bietieds; "vreug" komt niet voor | vroug |
| nuumt | 3 | noemt | Woordwaark (nuimen): neumen, nuimen, numen, nummen; geen "nuum-" | nuim- |
| zomeraovend | 3 | zomeravond | Woordwaark (Nederlands -> Gronings, trefwoord "avond"): oavend, toavend, oavens; "aovend" komt niet voor | oavend |
| roai | 2 | raad | Woordwaark (Nederlands -> Gronings, trefwoord "raad"): road; "roai" is bij Molema "raai" (gok) | road |
| nuumst | 2 | noemt | Woordwaark (nuimen): neumen, nuimen, numen, nummen; geen "nuum-" | nuim- |
| eigenlk | 2 | eigenlijk | eigenlijk: naast "aigenlk" (19x); twee vormen | aigenlk |
| aend | 2 | eend | Woordwaark (Nederlands -> Gronings, trefwoord "eend"): aind, ijn, ijnd; "aend" komt niet voor; let op: "aind" wordt bij ons ook voor "einde" gebruikt | aind |
| rijtjeshuzen | 2 | rijtjeshuizen | Woordwaark (Nederlands -> Gronings, trefwoord "huis"): hoes, huus (Stad), pakhoes; "-huzen" komt niet voor; nds-nl Wikipedia heeft "hoes" | hoezen/huzen navragen |
| rde | 2 | ? | geen woord: tokenisatie van "Dúúrde" (klemtoontekens); niet in de tekst corrigeren |  |
| duvenfluisteraar | 2 | duivenfluisteraar | Woordwaark (Nederlands -> Gronings, trefwoord "duif"): doef, doeve; "duuv-/duven" komt niet voor, ook doevemelker voor duivenmelker | doeve/doef |
| ziest | 2 | ? | ziet: vorm wisselt (zist, ziest, zut, ziet) | ziest |
| dié | 1 | ? | accentteken; elders heet "die" gewoon "dij" | dij |
| hoeren | 1 | horen | elders "heur-" (heurde, heurd, heurst) voor horen; variant | heuren |
| herenhuzen | 1 | herenhuizen | Woordwaark (Nederlands -> Gronings, trefwoord "huis"): hoes, huus (Stad), pakhoes; "-huzen" komt niet voor; nds-nl Wikipedia heeft "hoes" | hoezen/huzen navragen |
| loskoppen | 1 | losgepikt | NL "losgepikt"; betekenis wijkt af | loskoppen laten staan of "lospikt" |
| nuumde | 1 | noemde | Woordwaark (nuimen): neumen, nuimen, numen, nummen; geen "nuum-" | nuim- |
| groaf | 1 | graf | Woordwaark (Nederlands -> Gronings, trefwoord "graf"): graf; "groaf" komt niet voor (Molema: groaf = graaf) | graf |
| stuntaovend | 1 | stuntavond | Woordwaark (Nederlands -> Gronings, trefwoord "avond"): oavend, toavend, oavens; "aovend" komt niet voor | oavend |
| goedenaovend | 1 | goedenavond | Woordwaark (Nederlands -> Gronings, trefwoord "avond"): oavend, toavend, oavens; "aovend" komt niet voor | oavend |
| hold | 1 | houdt | houdt: naast "holt"; twee vormen | holt |
| aovends | 1 | avonds | Woordwaark (Nederlands -> Gronings, trefwoord "avond"): oavend, toavend, oavens; "aovend" komt niet voor | oavend |
| duuve | 1 | duif | Woordwaark (Nederlands -> Gronings, trefwoord "duif"): doef, doeve; "duuv-/duven" komt niet voor, ook doevemelker voor duivenmelker | doeve/doef |
| klemrieden | 1 | ? | voltooid deelwoord van "klemgereden": hoort een voltooide vorm te zijn, staat in de onbepaalde wijs | klemreden |
| koopaovend | 1 | koopavond | Woordwaark (Nederlands -> Gronings, trefwoord "avond"): oavend, toavend, oavens; "aovend" komt niet voor | oavend |
| laanhuzen | 1 | laanhuizen | Woordwaark (Nederlands -> Gronings, trefwoord "huis"): hoes, huus (Stad), pakhoes; "-huzen" komt niet voor; nds-nl Wikipedia heeft "hoes" | hoezen/huzen navragen |
| blieft | 1 | blijft | blijft: naast "bliedt"; twee vormen | bliedt |
| moaaaat | 1 | maaaaat | uitgerekt "maat" als uitroep; bewust |  |
| aovendlicht | 1 | avondlicht | Woordwaark (Nederlands -> Gronings, trefwoord "avond"): oavend, toavend, oavens; "aovend" komt niet voor | oavend |
| duventil | 1 | ? | Woordwaark (Nederlands -> Gronings, trefwoord "duif"): doef, doeve; "duuv-/duven" komt niet voor, ook doevemelker voor duivenmelker | doeve/doef |
| overaal | 1 | overal | naast "aaloverst" voor overal; twee vormen | aaloverst |
| zut | 1 | ziet | ziet: elders "ziet", ook "zist"/"ziest"; vorm wisselt | ziet |
| hanen | 1 | handen | handen: "hanen" betekent ook kippenmannetjes; Gronings voor handen nagaan ("haanden") | haanden |
| dar | 1 | ? | elders "doar" (daar); variant | doar |
| luuster'n |  | luisteren | afkorting met weglatingsteken; elders "luusteren" of "luustern" (twee vormen) |  |

### Fries

| Woord | Betekenis | Opmerking |
|---|---|---|
| wâld | bos | "JelleWâld" is een verzonnen kanaalnaam (woordspeling); "wâld" = bos/woud, niet in een bron bevestigd |
| trapfyts | trapfiets | 0 artikelen op fy.wikipedia en niet in Wiktionary; "fyts" = fiets is gewoon Fries, "trapfyts" is niet bevestigd (Jelle: "Is dat in trapfyts?") |
| hûs | huis | bekend Fries; niet in een online bron nagezocht; in "naar hûs" staat Nederlands "naar" bij Fries "hûs" (Fries: "nei hûs") |
| wrachtich | waarachtig | maar 6 artikelen op fy.wikipedia en niet in Wiktionary: waarschijnlijk "wrachtich" = waarachtig, maar zeldzaam; navragen |
| ferhip | uitroep (onbekend) | 0 artikelen op fy.wikipedia, niet in Wiktionary (en, fy): onbekend woord, betekenis onzeker; vervangen of laten nalezen |
| fan'e | van de (fan 'e) | Fries schrijft "fan 'e" met een spatie; de tekst heeft "fan'e" (missions.js, subtitles.js) |
| skûtsjezeiler | skûtsjezeiler (Nederlands "zeiler") | samenstelling met Nederlands "zeiler"; in de Friese tekst staat "skûtsjesiler" (dit is de Nederlandse ondertitel, subtitles.js) |
| hekweach | hekgolf (zog achter een boot) | 0 artikelen op fy.wikipedia; "weach" = golf is bevestigd (Wiktionary), maar "hekweach" (golf achter een boot) niet; het Nederlandse "hek" betekent ook in het Fries "hek" |
