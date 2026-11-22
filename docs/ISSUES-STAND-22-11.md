# Issues-stand 22-11

Werkdocument van de issuehygiëne van 22-11 (agent, `issue-hygiene-22-11`). Bron: `gh issue list` en project 5 (NatusPella) op 22-11, de commits op origin/main (`519ff048d`) en de issue-comments. Er is niets gesloten en geen epic gesloten. De agent heeft niets in beeld bekeken: alles hieronder is administratie op basis van code, commits en comments.

## Aantallen

| Wat | Aantal |
|---|---|
| Issues in totaal | 1.168 |
| Open | 196 |
| Gesloten | 972 |
| Open met `bug` | 62 |
| Open met `wens` | 134 |
| Open met precies één `bug` of `wens`, één `impact-*` en één `kosten-*` | 196 van 196 |

Impact van de open issues: zeer-hoog 10, hoog 100, midden 74, laag 12. Kosten: S 40, M 99, L 57.

Overige labels op open issues: `wacht-beeld` 62, `hertest` 72, `klaar-op-branch` 7, `eigenaar` 15.

## Bord (project 5)

| Kolom | Open issues |
|---|---|
| Bugs | 53 |
| Wensen | 118 |
| Bezig | 10 |
| Review | 15 |
| Klaar | 0 |
| Niet op het bord | 0 |

Aangepast op 22-11:

- 54 gesloten issues stonden nog in Review, Bugs of Wensen (onder meer #849 tot en met #881 en de afgeronde werkpakketten van Bezit, Voetbalcarrière en Verhaal): verplaatst naar Klaar. Alle gesloten issues die op het bord staan, staan nu in Klaar (928); 44 oudere gesloten issues staan niet op het bord en zijn zo gelaten.
- Zes open issues stonden niet op het bord en zijn toegevoegd: #1178, #1182, #1183 (Bugs) en #1179, #1180 (Wensen), plus epic #1181.
- De epics #985 en #1181 stonden in Wensen terwijl er code van op main staat: nu Bezig, net als de andere epics.
- Review bevat de issues die code op main hebben en wachten op beeld of hertest, plus de zeven met `klaar-op-branch`. #1059, #1060, #1075, #1078, #1016 en #1175 hebben hun commits inmiddels in origin/main; alleen #1174 (`spullen-wapens-21-11`) is volgens zijn comment nog niet gemerged. Het label `klaar-op-branch` is daarom voor zes van de zeven verouderd; de coördinator haalt het weg als hij ze definitief controleert (niet gedaan door de agent: het label is geen bewijs dat het issue af is).

## Milestones (de 12 epics van het bord)

| Milestone | Open | Gesloten | Stand |
|---|---|---|---|
| Tegelwereld werkt | 0 | 31 | af, milestone gesloten |
| Levende open wereld | 1 | 22 | milestone gesloten; restant #357 wacht op een kenner (eigenaar) |
| Verhaal Deel 4 en missies | 1 | 23 | milestone gesloten; restant #353 wacht op luistertest (eigenaar) |
| Provincie leeft | 0 | 19 | af, milestone gesloten |
| Publiceren en 1.0 | 10 | 10 | milestone gesloten, maar 10 open issues, vrijwel alle bij de eigenaar (zie onder) |
| Afwerking en menu's | 1 | 81 | milestone gesloten; restant #358 wacht op luistertest (eigenaar) |
| Samen spelen en mobiel | 0 | 7 | af, milestone gesloten |
| GDE Light Sims | 0 | 9 | af, milestone gesloten |
| Designsysteem v3: zomerse zeefdruk | 15 | 1 | open; vrijwel alles wacht op beeld of de keuring van de eigenaar |
| Bezit: percelen en bedrijven | 7 | 4 | open, epic #1095 |
| Voetbalcarrière | 10 | 3 | open, epic #1106 |
| Verhaal: rode draad, introducties en natuurlijke dialogen | 18 | 4 | open, epic #1121 |

Zonder milestone: 133 open en 758 gesloten.

## Epic-issues (open, bewust nooit gesloten)

| Epic | Open kinderen | Stand |
|---|---|---|
| #985 QoL-review 0.66.0 | #1043, #1005 | 47 van de 52 punten op main of gedaan; de rest staat in #1043 met reden |
| #1095 Bezit | #1098 tot en met #1103 | werkpakketten 1, 2, 9 en 10 dicht; 3 tot en met 8 op main, wachten op beeld of hertest |
| #1106 Voetbalcarrière | #1109 tot en met #1111, #1113 tot en met #1118 | 1, 2 en 6 dicht; de rest op main, wacht op beeld |
| #1121 Verhaal rode draad | 18 werkpakketten en cutscene-issues | WP0, WP12 tot en met WP14 dicht; de rest op main, wacht op beeld of hertest |
| #1150 Interieurs | #1161 tot en met #1164 | pakket 9 dicht; ronde 1 tot en met 4 op main; hertest nodig |
| #1151 Kleding | #1152 tot en met #1154, #1156 | code op main (r4, r5); hertest nodig |
| #1155 Autotuning | geen losse kinderen | rondes 1 tot en met 4 op main; beeld en geluid nog niet bekeken |
| #1170 Opening, trailer, benchmark | #1171, #1172, #1173 | filmdata en tests klaar; opnemen en beeldcontrole open |
| #1181 Wereld levend | geen | `worldlife.js` en `worldlife3d.js` op main; beeld nog niet bekeken |

## Wacht op de eigenaar (label `eigenaar`, 15)

| Issue | Wat er van de eigenaar nodig is |
|---|---|
| #57, #62, #63, #65, #72, #83 | publiceren: webplek kiezen en uploaden, merkenregister en geschiedenis, YouTube-kanaal en trailers, 1.0-moment, social-preview, releasedraaiboek |
| #60 | IARC-vragenlijst invullen met eigen account |
| #64 | Steam-klaar (regels, SteamPipe, Deck-test, prestaties) |
| #59 | testers met echte controllers en nieuwe spelers |
| #353, #358, #988 | luistertest door een mens (gemurmel en sirene, nieuwe effecten, nieuwe SFX-set en radiokeuze) |
| #357 | Gronings en Fries door een kenner laten nalopen (167 spreekteksten) |
| #1070 | pakketverkleining (muziek 128 kbps, barks naar ogg): code staat op main; wacht op controle en akkoord van de eigenaar |
| #1090 | Pages-workflow handmatig uitvoeren en controleren |

## Nog niet gedaan of niet bekeken

- Er is niets in beeld of gehoor gecontroleerd.
- De 44 oude gesloten issues zonder bordkaart zijn niet toegevoegd.
- Het label `klaar-op-branch` is niet verwijderd (zie boven).
