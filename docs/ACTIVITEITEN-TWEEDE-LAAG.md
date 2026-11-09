# De tweede laag per activiteit (#800, punt 14)

De UX-audit noemde dat de lange termijn te veel op externe balken leunt en dat maar drie van de
zesentwintig activiteiten een tweede laag hadden. Dit document legt per activiteit vast **wat er na
de medaille nog te halen is** en welke activiteiten bewust geen extra laag hebben. De tabel staat in
`game/js/activiteitlaag.js` en de startkaart noemt de laag in één regel; er is geen nieuwe teller,
munteenheid of opslagsleutel bijgekomen.

## Wat telt als tweede laag

Een tweede laag is een intrinsieke reden om terug te komen: een variant met een eigen record, een
verzameling die je vult, een leerlijn met eigen lessen of een vaste tegenstander die meegroeit. Een
gewone medaille of een persoonlijk record alleen telt hier niet als tweede laag; dat is de eerste laag.

## De tabel

| Activiteit | Tweede laag | Status |
|---|---|---|
| discgolf | de volle achttien banen na je eerste goud | variant |
| kartbaan | de tijdattack: je snelste ronde telt apart | variant |
| skatepark | de langste keten: één reeks, niet de som | variant |
| hengelen | het visboek: elke soort een keer vangen | verzameling |
| carillon | drie liedjes, elk met een eigen record | eigen records per liedje |
| vliegschool | twintig lessen, per toestel je eigen leerlijn | leerlijn |
| wandeling | de stempels onderweg: elke etappe een eigen doel | verzameling |
| regatta | de vaste baan op de Hoornse Plas met een eigen record | eigen baan/record |
| padel | de vaste tweeling die je steeds sterker terugzet | vaste tegenstander (buiten de 26 startkaart-activiteiten) |
| carbid | — | bewuste uitzondering: vijf schoten, één score |
| kermis | — | bewuste uitzondering: één rit, één score |
| hoogvlieger | — | bewuste uitzondering: attractie zonder record |
| geheimen | — | bewuste uitzondering: verzameling zit al in de wereld |
| drift | — | bewuste uitzondering: zones hebben al eigen records |
| pitchputt | — | bewuste uitzondering: de golfbaan is de eerste laag |
| ringrace | — | bewuste uitzondering: één rondje, één uitslag |
| zwembad | — | bewuste uitzondering: één baan, één tijd |
| klimtoren | — | bewuste uitzondering: één klim, één tijd |
| waterski | — | bewuste uitzondering: één run, één score |
| pannenkoek | — | bewuste uitzondering: één ronde, één score |
| boeren | — | bewuste uitzondering: dagelijkse klussen zijn de laag |
| snackketen | — | bewuste uitzondering: verhaaldoel, geen tweede laag |
| evenementen | — | bewuste uitzondering: kalender/eenmalig |
| safehuis | — | bewuste uitzondering: verhaaldoel |
| pvparena | — | bewuste uitzondering: tegen elkaar, geen recordlaag |
| vluchtdienst | — | bewuste uitzondering: dienst, geen medaillelaag |
| vaardienst | — | bewuste uitzondering: dienst, geen medaillelaag |

**8 van de 26** hebben een tweede laag; de overige 18 zijn hierboven als bewuste uitzondering
gedocumenteerd. Padel heeft er ook een, maar valt buiten de 26 startkaart-activiteiten. De eis uit
#800 was minstens acht; dat is gehaald zonder een nieuwe teller.

## Samen spelen

De tweede lagen zijn per speler: varianten en records staan in de eigen prestatieset, het visboek en
de wandelstempels in de eigen opslag. Een gast ziet zijn eigen stand; de wereld en de activiteiten
blijven voor iedereen gelijk. Geen netwerkbericht nodig.

## Controle

`scripts/activiteitlaag_test.mjs` bewaakt dat er minstens acht echte activiteiten in de tabel staan,
dat elke regel op de startkaart komt en dat dit document alle activiteiten noemt. `docs_index_test`
bewaakt de docs-index.
