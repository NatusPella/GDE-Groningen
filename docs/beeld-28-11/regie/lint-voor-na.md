# Lintvondsten eerste halfuur, voor en na (aaa30-regie-28-11)

Regels C05 (spreker niet in beeld), C13 (spreker van achteren), C15 (focus niet op de spreker), C16 (reactieshot tijdens een regel), C17 (camera door of vlak langs een object) en de bestaande regieregels. De regels C15 tot en met C17 bestonden voor deze ronde niet; de voor-kolom bevat ze dus niet.

| cutscene | score voor | score na | voor | na |
|---|---|---|---|---|
| story-opening-keuken | 95 | 95 | C06x2 C14x1 | C06x2 C14x1 |
| story-opening-verhuisdag | 66 | 65 | C06x2 C13x2 C12x2 | C06x2 C13x2 C12x2 |
| M01.intro | 0 | 100 | C12x13 V06x2 | - |
| M01.3 | 99 | 99 | C14x1 | C14x1 |
| M01.5 | 100 | 100 | - | - |
| M01.outro | 92 | 100 | C12x1 | - |
| M02.intro | 68 | 100 | C13x3 C12x1 | - |
| M02.outro | 92 | 100 | C13x1 | - |
| M03.intro | 84 | 100 | C12x2 | - |
| M03.2 | 67 | 99 | C06x1 C12x3 C13x1 | C06x1 |
| M03.outro | 68 | 98 | C13x4 | - |
| M04.intro | 76 | 100 | C13x1 C12x2 | - |
| M04.outro | 84 | 92 | C13x2 | - |
| M05.intro | 99 | 99 | C14x1 | C14x1 |
| M05.outro | 92 | 100 | C13x1 | - |
| totaal | | | 49 | 12 |

## Camera op de echte kaart (scripts/qa/cutscene_wereld_audit.mjs)

Per cutscene en 6 plekken in de stad, elke 0,1 s: de camera in een gebouw of boom ("in"), er tussen twee beelden doorheen ("door") of binnen 0,35 m van een muur ("wand", near-clip). Voor = de stateloze camera van cutscript.js; na = door de camerabescherming (game/js/camguard.js). Totaal voor: in 185, door 54, wand 6238; na: in 87, door 3, wand 262.

Open: M01.intro en M02.intro op de Grote Markt beginnen in een gebouw (de ankerstand heeft daar geen vrije plek; scene3d.js tilt de camera dan over het dak); 3 keer een "door" bij een glijbeweging na een correctie.

| cutscene | plek | voor in/door/wand | na bescherming in/door/wand |
|---|---|---|---|
| story-opening-keuken | herestraat | 0/0/23 | 0/0/0 |
| story-opening-keuken | grotemarkt | 0/0/35 | 0/0/0 |
| story-opening-keuken | broerstraat | 0/1/184 | 0/0/0 |
| story-opening-verhuisdag | grotemarkt | 1/2/222 | 0/0/0 |
| story-opening-verhuisdag | broerstraat | 0/1/104 | 0/0/69 |
| M01.intro | martinikerkhof | 0/0/6 | 0/0/0 |
| M01.intro | grotemarkt | 29/4/288 | 29/0/29 |
| M01.intro | broerstraat | 0/3/218 | 0/0/106 |
| M01.3 | grotemarkt | 0/2/94 | 0/0/0 |
| M01.3 | broerstraat | 22/1/126 | 0/1/0 |
| M01.5 | grotemarkt | 0/0/22 | 0/0/0 |
| M01.5 | broerstraat | 0/4/179 | 0/0/0 |
| M01.outro | grotemarkt | 11/0/175 | 0/1/0 |
| M01.outro | broerstraat | 0/2/116 | 0/0/0 |
| M02.intro | martinikerkhof | 0/0/23 | 0/0/0 |
| M02.intro | grotemarkt | 58/4/120 | 58/0/58 |
| M02.intro | broerstraat | 0/0/160 | 0/0/0 |
| M02.outro | grotemarkt | 0/0/400 | 0/0/0 |
| M02.outro | broerstraat | 43/2/558 | 0/0/0 |
| M03.intro | grotemarkt | 0/1/109 | 0/0/0 |
| M03.intro | broerstraat | 0/1/104 | 0/0/0 |
| M03.2 | herestraat | 0/1/0 | 0/0/0 |
| M03.2 | grotemarkt | 0/5/245 | 0/0/0 |
| M03.2 | broerstraat | 0/5/489 | 0/0/0 |
| M03.outro | herestraat | 0/0/315 | 0/0/0 |
| M03.outro | grotemarkt | 0/2/807 | 0/0/0 |
| M03.outro | broerstraat | 0/2/99 | 0/0/0 |
| M04.intro | grotemarkt | 0/2/120 | 0/0/0 |
| M04.intro | broerstraat | 0/2/39 | 0/0/0 |
| M04.outro | grotemarkt | 0/0/222 | 0/0/0 |
| M04.outro | broerstraat | 21/1/39 | 0/1/0 |
| M05.intro | grotemarkt | 0/4/93 | 0/0/0 |
| M05.intro | broerstraat | 0/2/210 | 0/0/0 |
| M05.outro | grotemarkt | 0/0/147 | 0/0/0 |
| M05.outro | broerstraat | 0/0/147 | 0/0/0 |
