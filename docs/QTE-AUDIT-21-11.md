# Quicktime-audit (#962, 21-11)

> Spec: [.specs-fire/standards/verhaal.md](../.specs-fire/standards/verhaal.md) en [mechanica.md](../.specs-fire/standards/mechanica.md).
> Dit document is naslag bij issue #962 ("te veel storytelling via te moeilijke quicktime-events"). Wijkt het af van de code, dan is het
> document de fout. Bron van de lijst: een leesronde door `missions*.js`, `stagetiming.js`, `heist.js`, `bakeround.js` en `choicepanel.js`
> (grep op QTE, timing, mash, "houd ingedrukt", reflex). Niet in beeld gezien in deze ronde: alleen pure tests.

## De regel

Het verhaal strandt nooit op een timing-, tik- of houd-gebeurtenis. Een misser kost hooguit de goede uitkomst (een tag in `chain.tags`, de
kleine komische uitkomst), nooit de missie. Wie het niet wil spelen, zet Instellingen › Hints & uitleg › **Quicktime-events** op Overslaan.

## De instelling (per speler, standaard Makkelijk)

| Stand | Naald | Zone | Rondes | Missers | Heist en bakronde |
|---|---|---|---|---|---|
| Normaal | oude snelheid | oude zone (met #957: ruimer per moeilijkheid en hulp) | alle | oude drempel | oude drempel |
| Makkelijk | 25% langzamer | 25% breder | bij drie of meer valt de middelste weg | een poging extra; nooit een afloop | metgezel helpt na 60% van de missers; bakronde: vijf missers en een ronde minder |
| Overslaan | geen balk | geen | één ronde, als gebaar dat vanzelf doorloopt (0,7 s) | geen | metgezel doet het meteen; bakronde: één ronde, nooit opnieuw beginnen |

Code: `game/js/qte.js` (puur), gelezen door `stagetiming.js`, `heist.js` en `missions.js` (bakronde). Opslag: `gde-settings` (`qteStand`), geen
nieuwe sleutel en niets in de savegame, dus er is niets te migreren; een bestand zonder de sleutel krijgt Makkelijk. Tests: `scripts/qte_test.mjs`
(standen, faalpad, bakronde, opslag) en `scripts/qte_story_test.mjs` (geen enkele verhaal-QTE heeft een `failAt`).

## De prompt

Eén prompt in het designsysteem: het toetsplaatje van Spatie (volgt de herbinding, op een controller de knop) zakt in een lus van 1 s
(`.ds-uitleg`, #989) en de voortgang staat als stippen: gedaan is vol, nu heeft een dikke rand, nog te gaan is leeg (`.cw-pips` in
`choicepanel.js`). De ronde staat ook in woorden ("1 VAN 3") en in `aria-label`. Met Beweging beperken staat het plaatje stil.
De balk zelf (naald en groene zone) is ongewijzigd, op de ruimere zone na.

## Inventaris

Moeilijkheid: laag = ruime zone en trage naald; middel = smalle zone; hoog = reflex. Faalgevolg is wat er gebeurt bij elke misser.

| Missie | Soort event | Moeilijkheid | Faalgevolg (nu) | Keuze in deze ronde |
|---|---|---|---|---|
| M18 Wie draaide de camera's uit? (twee varianten: met en zonder argwaan) | timing, 3 rondes sluipen langs een camera | middel (zone 0,36 tot 0,64 versmalt naar 0,44 tot 0,56, naald 0,7 tot 1,15) | lage tag, argwaan-lijn blijft; de missie gaat door (geen `failAt`) | blijft als korte actie; Makkelijk: 2 rondes, trager, ruimer; Overslaan: 1 gebaar |
| M20 Fierljep-duel in Bourtange | timing als gebaar (`gebaar: true`): een druk of na 5 s vanzelf, altijd raak; de echte sprong volgt | laag (geen proef) | tag duel-won of duel-lost; de sprong toont landing of plons; de missie gaat door | blijft gebaar; Overslaan loopt na 0,7 s |
| M21 Over de wagons | timing als gebaar, 3 rondes | laag | tag sprint-goed of sprint-slecht; door | blijft gebaar |
| M22 Los uit de modder | timing, 3 rondes wippen op het ritme | laag tot middel | tag modder-traag; Tinus trekt de wagen er altijd uit | Makkelijk 2 rondes; Overslaan 1 gebaar |
| M24 windvlaag boven de toren | was timing | n.v.t. | n.v.t. | al weg (#962 eerder): de duifstap geeft de uitkomst als tag |
| M26 duiven en straten | was timing | n.v.t. | n.v.t. | al weg: de achtervolging geeft de duiventag, de straten zijn één scène met drie varianten |
| M25 en M26 bakronde (Oma's recept) | geheugen en volgorde: ingrediënten 1 tot 6 in de juiste volgorde | middel (3 missers, drie rondes) | te veel missers: opnieuw beginnen, nooit de missie kwijt | Makkelijk: 5 missers en een ronde minder; Overslaan: 1 ronde, geen opnieuw beginnen. Het volgende ingrediënt staat al als icoon in beeld |
| Museumheist (heist.js): zekeringen, slot, kluis | timing van een balk (zekeringen en slot), draaien en vastzetten (kluis) | laag tot middel | vonken en een misser; na 5 (zekering) of 6 (slot) missers neemt de metgezel het over; een gezien-worden zet je terug naar het begin van de stap | Makkelijk: breder en hulp na 60%; Overslaan: de metgezel doet het meteen; elke stap blijft overslaanbaar met O |
| Museumheist: laserraster, pasje rollen | ontwijken en achter de bewaker blijven staan | laag tot middel | terug naar het begin van de stap; de metgezel helpt na een paar keer | niet aangepast (geen timingbalk); blijft vergevend |
| Eierrit (missions_akte2.js) | snelheidslimiet 40 km/u, geen QTE | n.v.t. | meer dan 60% eieren stuk: opnieuw laden | geen QTE; staat als regelwidget (#987). Buiten dit onderzoek |
| `choice`-stappen (M18 intake, M21 wagonkeuze) | gesprek, geen reflex | n.v.t. | geen klok en geen afloop meer (#962 eerder) | ongewijzigd |
| `hold`-stappen (logboek lezen, wachten bij de server) | blijf staan tot een teller vol is | laag | niets | geen QTE, ongewijzigd |

Bijbanen en minigames (padel, discgolf, kermisdraai en zo) zijn geen verhaalstappen en vallen buiten #962.

## Wat niet is gedaan

- **Geen QTE vervangen door een nieuwe scène** (NPC-actie of camerabeweging): daarvoor zijn nieuwe scripts en regels nodig, en geen audio genereren
  mag; de missiebestanden zijn ook van de AAA-agenten. De vier overgebleven timingstappen zijn korte acties (sluipen, springen, wippen) met een
  zachte uitkomst, en Overslaan maakt er een gebaar van. Een scène voor M18 (de manager kijkt om) is een goede vervolgstap.
- **Niet in beeld gezien:** de prompt met toetsplaatje en stippen en de instelling in het menu zijn alleen met pure tests en een
  syntaxcontrole bekeken. De beeldmeting (voor en na van vier plekken) hoort bij één Electron-run; zie het commentaar op #962 voor de stand.
- **Samen spelen:** een gast op Overslaan is niet met een echte gast getest. De stap draait bij de gastheer; zie docs/COOP-GAST.md.
