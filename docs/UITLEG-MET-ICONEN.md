# Uitleg met iconen en animaties (de regelwidget)

> Spec: [.specs-fire/standards/ui-taal.md](../.specs-fire/standards/ui-taal.md) (tekstvloer, taal) en
> [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) (HUD, Accessibility). Dit document is naslag bij issue "Uitleg met
> iconen en animaties i.p.v. tekst" en bij #987 (onthullingsdichtheid van de opening). Wijkt het af van de code, dan is het
> document de fout.

De vraag van de eigenaar: *kunnen we dingen uitleggen met iconen en animaties, zoals de missie met de eieren?*
Ja. Dit document beschrijft wat de eierrit goed doet, het patroon dat daaruit volgt (de **regelwidget**), de lijst van plekken
waar de speler nu iets moet raden, en wat er in deze ronde al is omgezet.

## Wat de eierrit goed doet

1. **De regel is zichtbaar.** De breekgrens is een echte snelheidslimiet (40 km/u op de tractor). Die staat als meter met een
   streep op de limiet, niet als zin in een kaart.
2. **De waarschuwing komt vóór het misgaat.** De zone begint 2 km/u onder de limiet (`eggSpeedWarning`): de speler kan nog
   remmen. De waarschuwing blijft staan tot de speler zakt.
3. **Het gevolg is direct zichtbaar.** Het zijn tien eieren die breken, geen percentage. Het echte aantal staat erbij ("23 / 60").
4. **Er is geen lap tekst voor nodig.** Eén icoon, één meter, één getal. De zin ("Vol gas tot de limiet; hard remmen of stoten
   breekt eieren") is voor wie hem wil lezen, niet voor wie hem nodig heeft.

Eerlijk over de stand vóór deze ronde: de eierrit toonde de meter alleen als tekst in de doelregel
("23 van 60 eieren heel · 38 km/u (max 40) — rem rustig") en als twee rijen in de toetsenlijst. De iconen en de meter zijn nieuw.

## Het patroon: de regelwidget

`game/js/regelwidget.js` (puur: staat naar vorm, plus een dunne DOM-laag) en `game/js/regelwidget.css`. Eén module,
zeven types:

| Type | Toont | Staat | Beweging |
|---|---|---|---|
| a. `limiet` | meter met limietstreep en gearceerde waarschuwingszone (snelheid, lading, geluid, heat) | ok, let-op, over | icoon knippert bij let-op, schudt bij over |
| b. `teller` | ring met tijd of kans | ok, laag, kritiek | ring knippert bij kritiek |
| c. `voorraad` | rij icoontjes (eieren, pakjes, levens) die breken of vol raken | ok, laag, kritiek, leeg | het icoon dat net stuk ging krijgt één schok en een barst |
| d. `wijzer` | pijl naar het doel met afstandsringen en een kant ("rechts voor") | ok, dichtbij | pijl draait mee, knippert dichtbij |
| e. `timing` | balk met raakzone (nooit smaller dan 20%, #957) en een naald | buiten, raak | de naald is de beweging; de zone is gearceerd |
| f. `toets` | toets-glyph met een lus van de handeling (houd, tik, draai) | | toets zakt, tikt of draait |
| g. `stappen` | "eerst dit, dan dat" met twee of drie iconen en een lijn; of een **legenda** (icoon plus waarde) | klaar, nu, straks | de huidige stap tikt |

**Gebruik.** `const w = maakWidget('limiet', ouder, { limiet: 40 })`; daarna `w.inv.waarde = kmh; w.ververs()`. De aanroeper
schrijft in het vaste `w.inv` (geen nieuw object per beeld) en roept `ververs()` alleen aan als zijn eigen getallen
veranderden (zie `updateRegelwidgets` in `hud_panel.js`, naast `gpsKey` en `gearKey`). `ververs()` vergelijkt de sleutel van de
vorm met de vorige en schrijft de DOM alleen bij een verschil. Beweging is CSS (transform en opacity), nooit per beeld in
JavaScript.

**Regels die voor elke widget gelden**

- *Kleur is nooit de enige betekenis:* een waarschuwingszone is gearceerd, een stand heeft een woord ("rustig aan", "te snel"),
  een gebroken ei is dof met een barst en een gestippelde rand, een actieve stap heeft een dikke rand.
- *Contrast:* tekst op eigen donker glas (crème 14:1, foutkleur 8:1), vulkleuren boven 3:1. De test rekent het na.
- *Tekstvloer:* 13 px, ook in `reduce motion`.
- *Beweging beperken:* `html.reduce-motion` en de OS-instelling zetten elke animatie uit. De widget blijft dezelfde vorm houden en
  het **tekstalternatief** (`.rw-alt`, bijvoorbeeld "Snelheid 39 van maximaal 40 km/u, rustig aan") komt in beeld.
- *Schermlezer:* elke widget heeft `role` (`meter`, `timer`, `status`, `img`), een kort Nederlands `aria-label` en een
  `aria-valuetext`. Wijzigt de stand naar een waarschuwing, dan kondigt de widget dat eenmaal aan via de schermnarratie van #802
  (`zetAankondiger(announce)` in `hud_panel.js`).
- *Lege of ongeldige invoer* (NaN, geen limiet, geen stappen) geeft een verborgen widget, nooit een kapotte.

**Progressive disclosure (#987).** Eerste-keer-uitleg volgt de regels van `hintkit.js`: één regel tegelijk, pas als de speler de
handeling nodig heeft, daarna stil. De widget gebruikt dezelfde gezien-lijst (`gde-hints-gezien`) als de kaarten. Een hint met
`kind: 'widget'` in `HINTS` wordt door `pickHint` overgeslagen; de minigame vraagt `widgetUitlegNodig(id)` en zet hem na de eerste
echte handeling in de lijst met `widgetUitlegKlaar(id)`. Voorbeeld: de klimtoren toont de eerste keer de toets-lus (A en D
vasthouden) in plaats van de zin; na vier seconden klimmen is de widget klaar en staat de bekende regel weer in beeld.
Een widget die de regel van de hele missie draagt (de eierrit) blijft zichtbaar zolang de regel geldt.

**Samen spelen.** Elke speler ziet zijn eigen widget, gevoed door zijn eigen staat. Voortgang en beloning zijn ongewijzigd en de
widget schrijft nooit naar de wereld. De bakronde is hierop de uitzondering: de widgets staan alleen in het paneel van de gastheer; een gast
krijgt nog het tekstpaneel uit de momentopname (`coopworld.js`, #525) en drukt zijn toets daar. Een gastpaneel met widgets is een
vervolg.

**Galerij voor een volgende Electron-run:** `node scripts/qa/regelwidget_beeld.mjs` toont elke widget in elke stand, met en
zonder beweging, en maakt screenshots. Dit is nog niet gedraaid.

## Het uitleg-component (.ds-uitleg, #989)

Naast de regelwidget (een regel die tijdens het spel meeloopt) is er het component voor **eerste-keer-uitleg**: `game/js/uitleg.js` (pure model en markup), `game/js/uitlegdata.js` (de stappen als data) en `.ds-uitleg` in `ds-components.css`. Twee tot vier stappen, elk een groot toetsplaatje of Phosphor-icoon, een lus van hooguit 1 s (druk, houd, beweeg, vul, klik, stick) en hooguit acht woorden tekst. De langere tekst staat onder Meer uitleg. Toegepast op de light sims (via `simhud.js`: elk UITLEG-lijstje wordt het model, de animatie volgt uit de tekst), de hint-kaarten van voertuigen en minigames (`HINT_UITLEG`), Hulp (Zo werkt het), de boerderijkaart en Zo werkt de kaart. Uit te zetten in Instellingen › Hints & uitleg; Niet meer tonen per uitleg in `gde-uitleg-niet-meer`. Test: `node scripts/uitleg_test.mjs`. Niet in beeld gezien (alleen pure tests).

## Wat de speler nu moet raden

Bron: een leesronde door `missions*.js`, `minigamekit.js`, `pg_*.js`, `hintkit.js`, `contexthints.js` en de eigenaarfeedback. Prioriteit
is impact op een speler die het voor het eerst ziet, gedeeld door de bouwkosten. "Gedaan" betekent: omgezet in deze ronde.

| Missie of mechaniek | Wat de speler nu moet raden | Widgettype | Iconen en animatie | Prioriteit |
|---|---|---|---|---|
| **Eierrit (M09)** | hoe hard mag ik, en wat breekt er | a + c | meter met limietstreep, tien eieren die breken | **gedaan** |
| **Stuntavond Grote Markt (M01)** | wat levert punten op (de eigenaar: te weinig punten, wagen sloopt snel) | g (legenda) | parasol +160, kliko +110, reclamebord +80 in het paneel | **gedaan** (legenda); schade nog open |
| **Klimtoren** | de prompts wisselen en de uitleg is een lap van 11 s | f | A en D met een vasthoud-lus, daarna stil | **gedaan** |
| **Bakronde (M25, M26)** | de toetsen staan als tekstlijst en het recept is onzichtbaar tot je fout zit | g (stappen en legenda) | recept als genummerde stappen die een icoon krijgen, de zes ingrediënten met hun toets | **gedaan** |
| Skûtsje-sprint (brug) | de brug gaat niet open, en waarom wachten | d + b | pijl en afstandsringen naar de brug, ring "brug open over N s"; de trimbalk (e) bestaat al | hoog |
| Timing-minigames (M18, M20, M21, M26) | wat doet de balk en welke toets, na een misser wordt de zone ruimer | e + f | toets Spatie met tik-lus naast de balk, zone zichtbaar ruimer na een misser | hoog |
| Politiezoekcirkel | hoe lang nog tot de ster weg is | b | bestaande zoekbalk als ring met afteltekst, cirkel op de kaart als wijzer | midden |
| Wanted-niveaus | waarom ben ik gezocht en wat is het niveau | c (sterren) + g | sterren die vol raken, het waarom als icoon (voetganger, getuige, schade) | midden |
| Fierljepbalk (`pg_fierljep`) | vaste zone 38 tot 62 procent met een tekstreeks 1 tot 3 | e + g | drie stappen (aanloop, springen, klimmen) met een toets-lus | midden |
| Hulpaanbod (`assist.js`) | een lap tekst: meer tijd, minder schade, ruimere poorten | g (legenda) | drie iconen (klok, auto, poort) met hun effect, geen zin | midden |
| M02 Even pinnen | "Schud de politie af: rij een garage in" | d + g | wijzer naar Spuit & Klaar, twee stappen (garage, afwachten) | midden |
| Duif-modus | zeven toetsregels per stand | f | alleen de toets die nu telt, met lus | midden |
| Stealth en zichtlijn (`heist.js`) | het gezien-percentage is alleen een zin of een kegel in de wereld | a | meter "gezien" met arcering, oog-icoon dat dichtgaat | midden |
| Vrachtmissies | koppelen, laden, rijden, lossen, in tekst | g + a | vier stappen met vrachtwagen, pakje, lading-meter | laag |
| Bietencampagne | snelheidsband 2 tot N m/s en kwaliteit van de lading in tekst | a + c | meter met onder- en bovengrens, bieten die van de kar rollen | laag |

**Gevonden tegenspraak (niet opgelost in deze ronde).** De opdracht van M01 in `missions_nieuw.js` zegt dat mensen en krassen
punten kosten, terwijl `stunthud.js` en `stuntavond.js` zeggen dat mensen opzij springen en niets kosten. De puntenwaarden in
`stuntavond.js` (`KINDS`) wijken af van `omverrules.js` (`STUNT_PUNTEN`). De legenda toont de waarden uit `KINDS`, dus wat het
spel echt telt. De opdrachttekst moet nog gelijkgetrokken worden.

**Bakronde.** De ingrediënten hebben de toetsen 1 tot 6 (niet 1 tot 5): zes ingrediënten, waarvan de bloem de fout is
("dat is Fries"). De oefenronde gebruikt vijf stappen, de wedstrijd vier. De stappen tonen alleen een nummer tot ze gedaan zijn,
zodat Oma's volgorde een geheugenspel blijft.

## Volgende stappen

1. Skûtsje-brug en timing-minigames (hoge prioriteit): dezelfde module, één aanroep per scherm.
2. De opdrachttekst van M01 gelijktrekken met de echte score.
3. Beeldcontrole met `scripts/qa/regelwidget_beeld.mjs` zodra de Electron-instantie vrij is, en op een telefoon (touch).
4. Het designsysteem (#980) kan de kleuren en de vorm van `.rw` overnemen zodra de componenten in het spel geladen zijn.
