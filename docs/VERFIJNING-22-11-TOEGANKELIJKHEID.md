# Verfijnronde 22-11: toegankelijkheid en instellingen

Geen nieuwe features, wel verfijnen wat er is. Gedaan als code- en testronde zonder Electron: alles hieronder is in node nagelopen (pure regels, bronaudit, fuzz en een lange reeks wijzigingen). Wat een speler moet zien, staat onderaan onder "Alleen in beeld of met een echte speler".

Code: `game/js/settingsrules.js` (pure regels), `game/js/settings.js` (controle van waarden, herstellen per sleutelgroep), `game/js/pausemenu.js` en `pausemenu.css` (bedrading). Tests: `scripts/settingsrules_test.mjs`, `scripts/instellingen_audit_test.mjs`.

## Wat al goed stond (nagelopen, niet aangeraakt)

Zoeken in het menu (`/`), ondertitelvoorbeeld, hintvoorbeeld, de kleurenproef met markers en routes, Beweging beperken en Flitsen beperken, het algemene Standaard herstellen met Ongedaan maken, de migratie van een nieuwer instellingenbestand (#578, #781). De audit bevestigt dat er geen verborgen en geen dubbele opties zijn: elke instelling heeft precies een rij of een bewuste uitzondering, en elke keuzelijst bevat zijn standaard.

## Wrijving, oplossing, bewijs

| # | Wrijving | Oplossing | Bewijs |
|---|----------|-----------|--------|
| 1 | Alleen alles of niets terugzetten: wie het geluid verstelde moest ook zijn beeld en hulp kwijt | Standaard herstellen biedt "Alleen dit tabblad" naast "Alles herstellen", met hoeveel er afwijkt; toetsen, naam, toestemming en moeilijkheid blijven | `settingsrules_test` onderdeel 11 en 12, audit onderdeel 6 |
| 2 | Na herstellen stond er altijd "Alles staat weer op de standaard", ook als er niets veranderd was | De melding noemt het aantal teruggezette instellingen, of dat alles al standaard stond | `settingsrules_test` onderdeel 3 |
| 3 | Je zag niet welk tabblad je iets hebt veranderd | Klein getal op het tabblad bij afwijking van de standaard | `settingsrules_test` onderdeel 2, audit onderdeel 6 |
| 4 | "Dichtheid van het vlak" deed niets zonder donker vlak of bij Contrast Hoog, zonder uitleg | Gedimd met de reden eronder; blijft instelbaar | `settingsrules_test` onderdeel 4 |
| 5 | Schermschudden stond gewoon in beeld terwijl Beweging beperken het uitzet | Reden bij de rij | idem |
| 6 | Trilsterkte zonder trillen (of bij Beweging beperken) | Reden bij de rij | idem |
| 7 | Zoom en noordstand van het kaartje terwijl het kaartje uit staat | Reden bij de rijen | idem |
| 8 | Hintbron was gedimd zonder reden te noemen | Reden erbij ("Toetshints staan uit") | idem |
| 9 | Vormen bij kleur leek uit te kunnen terwijl een kleurenstand het al aanzet | Reden erbij | idem |
| 10 | Alle volumes op nul gezet en geen ondertitels: het spel lijkt stuk | Regel onder de volumes: je hoort niets, en of ondertitels meelezen | `settingsrules_test` onderdeel 5 |
| 11 | Schermschudden en Beweging beperken hadden geen voorbeeld | "Proef het schudden" schudt een proefvak zoals de stand nu is, of blijft stil en zegt dat | `settingsrules_test` onderdeel 8, audit onderdeel 6 |
| 12 | Kleurenstanden heten Deuteranopie, Protanopie, Tritanopie: vaktaal | "Groen zwak (deuteranopie)" enzovoort; de uitleg verwijst naar de proef ernaast | `settingsrules_test` onderdeel 8 |
| 13 | Zoeken vond "epilepsie", "lettergrootte", "misselijk" of "harder" niet | Zoeksynoniemen per instelling, in gewone woorden | `settingsrules_test` onderdeel 7, audit onderdeel 6 |
| 14 | Cheats stond altijd in het menu | Alleen in dev, na de keuze Spelregels > Cheats in het menu, of zolang een cheat aan staat; een oude verwijzing valt terug op Instellingen; ook uit het zoeken | `settingsrules_test` onderdeel 6 en 13, audit onderdeel 6 |
| 15 | Een met de hand bewerkt bestand kon bij dronken effecten ("zzz") of trilsterkte (1e9, negatief) een rare waarde laten staan | Dezelfde controle als de andere sleutels bij het laden | `settingsrules_test` onderdeel 9 (fuzz, 150 kapotte bestanden) |
| 16 | Een aanroep of voorinstelling kon een onbekende keuze of een waarde buiten bereik bewaren (alleen het laden controleerde) | `setSetting` weigert waarden buiten de keuzelijst of het bereik, ook voor de hulpopties; alle voorinstellingen en mobiele profielen blijken geldig | onderdeel 10 en 12 |
| 17 | Hulpopties die na een herstart terugvielen op de standaard terwijl ze in het geheugen vreemd stonden | Gevonden door de lange reeks (1500 willekeurige wijzigingen, herstellen, ongedaan maken, bewaren en terugladen) en gefixt met 16 | onderdeel 12 |
| 18 | Geen vangnet voor nieuwe instellingen zonder rij | Bronaudit: elke instelling heeft een rij of staat bewust als uitzondering; geen sleutel twee keer | `instellingen_audit_test` 1 tot 3 |
| 19 | Een keuzelijst zonder zijn standaard kan niet meer ongemerkt | Audit op alle keuzelijsten en schuiven: standaard en uiterste standen zijn toegestaan | `instellingen_audit_test` 4 en 5 |
| 20 | Oud bestand zonder de nieuwe sleutel, nieuwer bestand met onbekende sleutels | Migratie getest: terugval op standaard zonder versiesprong, nieuwere versie en onbekende sleutels blijven na een wijziging | `settingsrules_test` onderdeel 13 |

## Samen spelen

Alles hierboven is lokaal per speler en gaat niet over het net: voorkeuren zijn van de speler zelf, de nieuwe module heeft geen netwerkcode (audit). Cheats in het menu volgt de bestaande regel van Samen spelen (cheats uit in een groep, `coopgroep.js`); de nieuwe schakelaar beslist alleen of het onderdeel zichtbaar is. De keuze voor Samen spelen, je naam en kleur blijven bij elk herstel staan (#528).

## Bewust niet gedaan

- Aanraakbediening live wisselen zonder herstart: `touch.js` bouwt de knoppen bij het opstarten; een live wisseling raakt de invoerlaag en is meer dan een verfijning.
- Een eigen voorbeeld bij Flitsen beperken: een flits tonen aan iemand die flitsen wil vermijden is geen goede proef. De stand wordt wel uitgelegd.
- Instellingen per profiel of per save (alleen de moeilijkheid is per save, #1169).
- Een hernoeming van de opslagsleutels of een versiesprong: de sleutel `cheatsTonen` bestaat niet meer (de eigenaar besloot dat Cheats vrijspeelbaar is in het verhaal); een oud bestand met die sleutel wordt bij het laden opgeschoond en laat niets zien.
- Een apart tabblad voor Cheats-opties of een wachtwoord: de keuze blijft een gewone schakelaar.

## Alleen in beeld of met een echte speler

Niet bekeken in een draaiend spel (geen Electron in deze ronde):

- de plaats en de leesbaarheid van de reden onder een gedimde rij en van het getal op een tabblad (ook op 1280 bij 720 en met Tekstgrootte Extra groot);
- de proef van het schudden: tempo, grootte en of "klap" leesbaar is;
- de herstelvraag met drie knoppen met alleen toetsenbord en met een controller (focusvolgorde, Esc);
- de rail zonder Cheats: de groep Systeem met een onderdeel, en het terugkeren van de knop na het aanzetten;
- de kleurenstanden met de nieuwe namen in de keuzeknop (lengte van "Blauw en geel (tritanopie)" in de smalle kolom);
- de stiltewaarschuwing onder de schuiven.
