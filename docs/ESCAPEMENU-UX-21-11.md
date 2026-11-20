# Pauzemenu: UX-audit 21-11

Aanleiding: na de eerste speelsessie zei de eigenaar dat het escape-menu op sommige dingen echt beter kan. De zeefdruk-stijl (0.64.0) is af; de bediening is niet doorgedacht.
Dit is een audit per taak, met toetsenbord en controller als maatstaf, plus wat er in deze ronde is gebouwd.

**Hoe dit is bepaald.** Per taak is het pad door de code en de huidige beelden (`docs/beeld-20-11/menu/`) gevolgd: `pausemenu.js` (`onKey`, `moveFocus`, `goBack`, `runAction`), de footerhints en `controller_nav_test`. Niet elk pad is met een echte controller in het spel doorlopen; wat niet in beeld is gezien, staat onderaan.

## Taken

| Taak | Pad nu (toetsenbord) | Pad met controller | Wat er niet klopte |
| --- | --- | --- | --- |
| Missie voortzetten | Esc opent Spel > Overzicht, Doorgaan staat in de hero | Start/B opent, A op Doorgaan | In elk ander tabblad was er geen Doorgaan: Esc ging eerst terug naar Overzicht en pas de tweede Esc sloot. Wie in Spullen zat, zocht de weg terug. |
| Voertuig kopen en afleveren | Garage, filter met Q/E, Enter | idem | De actie ("Laten afleveren") staat onderin het detail, de hint zegt "afleveren of kopen". Te-koop-kaarten tonen weinig. |
| Besturing aanpassen | Instellingen > Besturing > "Toetsen aanpassen" > Besturing (kind-scherm) | idem; zoekveld wordt overgeslagen | Drie lagen diep; je weet niet dat Besturing onder Instellingen hangt. |
| Opslaan en stoppen | Spel > Opslaan & stoppen (tweede tab) | idem | Opslaan zat twee klikken diep. Afsluiten had al een bevestiging (#915). |
| Voortgang zien | Spel > Overzicht, Prestaties, Veroverd | idem | Verspreid over drie schermen; het overzicht noemt het wel. |
| Boerderij beheren | Loopbanen > Boerderij (kind-scherm) | idem | De rail markeert "Loopbanen", niet Boerderij; het scherm is druk. |
| Iets zoeken | Zoekvelden alleen in Besturing en Spullen | zoekvelden overgeslagen | Geen manier om "geluid" of "opslaan" te vinden zonder te weten waar het staat. |

## Per scherm

| Scherm | Verwarrend | Te veel | Ontbreekt |
| --- | --- | --- | --- |
| Rail | Doorgaan ontbrak in-game; Terug stond alleen bij het hoofdmenu | Vijf groepen met kop en teller kosten 13 px-regels | Zoeken |
| Spel > Overzicht | Opslaan niet bij de hand | Tegels, voortgang en vouwen onder elkaar | Opslaan in de hero |
| Spel > Opslaan & stoppen | Zes rijen die elk één knop hebben | | |
| Spullen | Groepskoppen afgekapt ("WERPSP"), telling over de kop; zoekveld raakt de titel | Balkje per groep naast de telling | |
| Garage | Te-koop-kaarten zijn silhouetten | | Prijs en snelste actie op de kaart |
| Boerderij | Dubbele tekst: "volgende klus" en "in de schuur" stonden in de kaart én in een alinea; legenda los onder de uitleg | Vijf onderdelen, sfeerband, dagregel | |
| Besturing | Drie lagen; zoekveld alleen met toetsenbord | | |
| Instellingen | Lange lijsten, acht tabs | | Zoeken (nu mogelijk) |
| Verhaal, Activiteiten, Loopbanen | Informatiedichtheid hoog | | Niet in deze ronde aangepakt |
| Afsluiten | Bevestiging met "Je voortgang wordt opgeslagen" bestond al (#915) | | Gecontroleerd in beeld |

## Rangorde (impact, kosten)

1. **Doorgaan altijd bovenaan** (hoge impact, S): knop boven de rail, in elk tabblad. Gedaan.
2. **Zoeken in het menu** (hoge impact, M): `/` of de knop naast Doorgaan; vindt schermen, onderdelen, instellingen en acties; springt erheen en laat de rij oplichten. Gedaan. Zonder woord staat er een beginlijst, zodat het met een controller ook werkt.
3. **Opslaan in het Overzicht** (middel, S): tertiaire knop naast Alle opdrachten, met een melding in beeld (de statusregel stond in een ander tabblad). Gedaan.
4. **Spullen-koppen en zoekveld** (middel, S): koppen mogen over twee regels, balkje per groep weg, ruimte boven het zoekveld. Gedaan.
5. **Boerderij rustiger** (middel, S): geen dubbele alinea's naast de kaart, uitleg en legenda in één opklapbare regel. Gedaan.
6. **Garage-thumbnails Te koop** (middel, M): niet gedaan; de laatste beelden tonen de modelplaatjes al.
7. **Besturing los in de rail of als eerste regel onder Instellingen** (middel, M): niet gedaan; het zoekvenster brengt je er nu in één stap heen.
8. **Dichtheid Verhaal, Activiteiten, Loopbanen** (middel, L): niet gedaan.

## Wat er nu staat

- Rail: `Doorgaan` (geel, met pictogram) en een zoekknop bovenaan, in-game. In het hoofdmenu blijft de knop Terug.
- Zoekvenster (`menuzoek.js`, puur, `scripts/menuzoek_test.mjs`): een modale laag zoals de afsluitvraag (rest inert, Tab en pijlen blijven erbinnen, Esc sluit eerst het venster). Pijl omlaag gaat van het veld naar de lijst, Enter kiest de beste treffer.
- Controller: de zoekknop zit in de rail en is met de D-pad te bereiken; het venster opent dan op de beginlijst met focus op de eerste regel. Het zoekveld zelf wordt door `visibleFocusables` overgeslagen, zoals de andere zoekvelden.
- Afsluiten: ongewijzigd, wel gecontroleerd.

## Samen spelen

Het zoekvenster en de knoppen zijn lokaal menu: elke speler bedient zijn eigen menu, geen snapshot of netwerkbericht. Opslaan bewaart voor een gast alleen zijn eigen voortgang (`GAST_BEWAARD_TEKST`, #606). Het tabblad Spelers en de lobby zijn niet aangeraakt.

## Niet gezien

Zie het eindrapport van de sessie voor wat in beeld is bewezen; een echte controller en 1024x600 zijn niet gedraaid.
