# Spec: UI, menu's en taal

> Canonieke spec voor alles wat de speler ziet en leest. Vervangt de regels uit
> `DESIGN_SYSTEM.md`, `docs/DESIGN-BEDIENING.md`, `docs/DESIGN-COMPONENTEN.md`,
> `docs/INCLUSIEVE-TAAL.md`, `docs/WOORDENLIJST.md`, `docs/DIALECT-CONTROLE.md` en
> `docs/3d-model-prompts.md`; die blijven naslag. De code is de waarheid; `AGENTS.md`
> wint bij twijfel.

## Doel

Groen op donkergroen chroom, hoge smalle posterletter, korte Nederlandse tekst. Elk
scherm leest als hetzelfde spel; wijkt er één af, dan is dat een bug.

## Kleur

Tokens staan in `game/js/hud_panel.css` (`:root`), `game/js/menu.css` (`.gm`) en
`game/js/a11y.css`; er is geen `game/css/`.

| Token | Hex | Betekenis |
|---|---|---|
| `--gron-green` | `#1e9e56` | accent: knoppen, actieve stand, randen |
| `--gron-green-light` | `#3fc97a` | koppen, toetslabels, hover, gloed |
| `--gron-green-dark` / `--gd` | `#0f5c30` | ingedrukte knop |
| achtergrond | `#17301f` → `#0c140e` | radiale gradient, nooit plat zwart |
| tekst | `#f0ede4`, `#f2f2f2` | body op donker chroom |
| gevaar | `#d93f3f`, tekst `#f08a8a` | het enige rood |
| wanted | `#e8c93a`, leeg `rgba(255,255,255,0.25)` | alleen de wanted-sterren |
| toetsplaatje | `#fbfaf5` op `#0c140e`, rand `#a9a69b` | elke hint (`a11y.css:6`) |

- Eén rood: `#d93f3f`; `#f08a8a` alleen als tekst, `#e55a5a` als hover
  (`menu.css:102`). Geel `#e8c93a` is gereserveerd voor wanted-sterren, de badge voor
  bijzondere dagen en de missiemarkering. Geen blauw accent, geen tweede merkkeur,
  geen plat zwart.
- Statuskleuren nooit als eigen hex: `markerColors()` (`a11y.js:21`) leest `PALETTES`
  (`:14-19`) en zet `--mk-*` op `<html>` (`:52`): ok `#3fc97a`, danger `#d93f3f`,
  mission `#e8c93a`, missionActive `#3fd0ff`, your goal `#c068ff`, job `#ff9a3c`,
  care `#ff5fb4`, police `#3f6fd9`. Drie kleurenblindmodi vervangen die met
  Okabe-Ito-waarden; canvas en 3D hertekenen op `onPaletteChange`.
- Contrast 4,5:1 voor tekst, 3:1 voor grote tekst en iconen (`a11ylogic.js:35-36`).
  Kleur is nooit de enige aanwijzing; vorm, patroon of woord gaat mee.
- De tokennaam `--gron-green-dark` uit `DESIGN_SYSTEM.md:43` bestaat niet in de CSS;
  de waarde heet er `--gd`.

## Typografie en logo

- Stack `'Bebas Neue', 'Arial Narrow', Arial, sans-serif`, geladen in
  `game/index.html:14`. Lopende tekst in Arial Narrow; Bebas voor titels, tabs,
  knoppen, cijfers en eyebrows.
- Menu: titel 80 px, sectietitel 64, nummer 44, tab en primaire knop 26, ghost 24,
  body 20 op regelafstand 1,45, klein 18 (`menu.css:16,31-33,89,93`).
- Logo is HTML/CSS, nooit een beeld: `logoHtml()` (`logo.js`) en `.gde-logo`
  (`index.html:26`). GDE in Big Shoulders Display 900 van `#f0ede4` naar `#3fc97a`,
  de plaatsnaam op een plaat `#1e9e56`. Big Shoulders is alleen voor het logo.
- Minimum 12 px voor elke zin, menu's 13 px en hoger; alleen de binnenkant van een
  toetsplaatje mag kleiner. De HUD zet `--hud-min` op 13 px gedeeld door `--ui`
  (`hud_panel.css:13`); `READABLE_MIN` is 13 (`hudlook.js:109`).
- Conflict 12 tegen 13 px: `DESIGN_SYSTEM.md:93` noemt 12 als vloer met menu's op
  13+, `:263` zegt "geen tekst onder 13 px" en `:326` ("no sentence under 12 px,
menus 13 px and up") noemt 12 als vloer voor een zin en 13 voor menu's, en
  `DESIGN-COMPONENTEN.md:41-43` noemt 12 als vloer met 13 in de HUD. De code doet 13
  in de HUD en 20/18 in de menu's; 12 is de ondergrens voor een zin, niet het doel.
- De 11 px in de kaartbalk is schuld: `DESIGN-SCHULD.md:11` noemt
  `kaartactieui.js:44`, hij staat op `:58`.

## Bediening

De tabel in het pauzemenu (Instellingen > Besturing > Toetsenoverzicht,
`CONTROL_GROUPS` in `pausemenu.js:59`) is de bron van waarheid: W A S D en muis
lopen en kijken, `Shift` rent, `Space` springt of remt, `Ctrl` bukt, E of F gebruikt,
Esc gaat terug, M opent de kaart, Tab de spelerslijst, Q/E de tabbladen, U dempt, O
slaat de verhaalstap over, F8 opent de fotomodus, F11 volledig scherm en 7, 8, 9
roepen.

- Elke actie heeft een weg op elk apparaat dat de speler mag gebruiken, of het scherm
  zegt waarom niet. Een nieuwe actie krijgt meteen een slot in `PAD_MAPS`
  (`controls.js:204`); touchknoppen zijn diezelfde slots.
- Noem een toets nooit als tekst: gebruik `{E}` of `glyphHtml()`. De hint toont wat je
  nu kunt, hooguit twee regels.
- Touch: knoppen 64 px rond (`touch.js:22`), elk ander element minstens 44 px hoog
  (`:46`). Esc of B gaat altijd terug.
- Conflict: `pausemenu.js:121` zegt dat Q/E de sectie wisselen, maar de afhandeling
  (`:826`) wisselt eerst het tabblad, net als `DESIGN-BEDIENING.md:35`. De code wint;
  de menutekst is fout (#480, nog open).

## Menu's

De structuur staat op één plek: `SECTIONS` (`pausemenu.js:235`), `RAIL_GROUPS`
(`:254`), `CHILD` (`:257`), `SUBTABS` (`:259`) en `HINTS` (`:275`). De rail heeft
drie groepen: Spel, Verhaal, Loopbanen, Activiteiten / Kaart, Spullen, Garage,
Prestaties, Foto's / Instellingen, Cheats. De tabs uit `SUBTABS`:

| Sectie | Tabs |
|---|---|
| Spel | Overzicht, Samen spelen, Opslaan & stoppen, Spelen, Camera & richten, Hints & uitleg |
| Samen spelen | Samen spelen, Spelers |
| Verhaal | Opdrachten, Personages, Aanwijzingen, Veroverd |
| Activiteiten | Alles, Dichtbij |
| Instellingen | Beeld, Geluid & ondertitels, Besturing, Interface, Toegankelijkheid, Foutrapport, Cheats |
| Besturing | Toetsenbord en muis, Controller, Toetsenoverzicht, Hulp |

- De kaart is één scherm zonder rail; Visboek en Boerderij hangen onder Loopbanen,
  Besturing onder Instellingen. Spelers alleen in een sessie (`:358`); voor een spel
  begint alleen Spel, Instellingen en Besturing (`:258`).
- Spel > Overzicht is thuis: daar opent het menu, en Esc gaat van een kindscherm naar
  de ouder, dan naar Overzicht en sluit. Eén primaire knop per scherm, de rest ghost
  of stille tekst; groen voor gekozen of primair, rood alleen wat iets verwoest.
- Eén eigenaar: de structuur staat alleen in `pausemenu.js`, de vorm alleen in
  `menu.css` (`.gm`, `.m-*`). Geen ander bestand definieert knoppen, rijen of tabs
  (`DESIGN_SYSTEM.md:217-219`); de Samen spelen-schermen breken dit nog
  (`DESIGN-SCHULD.md:16`).
- Hooguit 125 woorden op een keuzescherm en 270 op een naslagscherm, beeld boven
  tekst, twee tot vier hints, focus zichtbaar (2 px crème, `menu.css:26`, of 2 px
  groen `#3fc97a` met controller, `a11y.css:34`).
- Opgelost op 25-10: `DESIGN_SYSTEM.md:233` zei "drie groepen" en noemde er vier, en
  zette Spelers als tab van Spel. Het document volgt nu de code: drie groepen
  (`:254`), Spelers onder Samen spelen (`:265`), en Cheats als eigen rail-item
  (`streken`, sinds #435) naast de tab onder Instellingen.

## Taal

- Nederlands in alles wat de speler ziet of hoort (constitutie 1); code,
  bestandsnamen en opslagsleutels blijven zoals ze zijn.
- Woordkeuze uit `docs/WOORDENLIJST.md`: opslaan, savegame, **Opgeslagen spellen**,
  **Doorgaan**, controlepunt of hervatpunt, uitzending, topscore, uitleg, einde spel.
  **Samen spelen**, nooit co-op, coöp of multiplayer; wachtkamer of kamer, nooit
  lobby. Geen rolnaam als gastheer of host: de naam van de speler of "de ander".
- `scripts/text_audit.mjs` faalt op de Engelse vorm (`ANGLICISMEN`, `:223`) en op "de
  Grunn" (`:254`). Het is "Grunn".
- Gronings en Fries alleen met zorg. Een dialectregel staat zoals hij is, met de
  Nederlandse vertaling eronder in cursief op 0,8 em (`.nl-sub`,
  `hud_panel.css:393`); de stem spreekt Gronings, de ondertitel blijft Nederlands. Een
  nieuw dialectwoord komt met betekenis, status en bewijs in
  `scripts/dialect_woorden.json`.
- Geen echt merk, bedrijf of persoon; parodie heeft verzonnen namen (`winkelNaam`).
  Echte plaatsen mogen. In credits staat alleen de eigenaar, de rest is NatusPella.
- Getallen in Nederlandse notatie: `840 m` onder een kilometer en `1,2 km` daarboven
  (`achievementsui.js:31`), geld als `€45` zonder spatie (`boerderijui.js:15`), tijd
  als `m:ss.cc` (`minigamekit.js:37`), wind als `Wind 3 Bft` of `Windstil` (`:54`).
- Woordbudget: een HUD-bericht is één zin van hooguit 14 woorden
  (`WORD_BUDGET.cardBody`, `hudtext.js:18`); het doel zelf 6, de regel eronder 3, een
  hint 3, een prompt 8, een ondertitel 18.
- Toon: kort en rustig; een weigering zegt waarom, een afkoeling hoe lang.

## Inclusieve taal

Geen man als standaard (agent, brandweerlieden, vuilnisophaler, zakenreiziger,
klusser, iemand aan het roer), geen groepsaanspreking (allemaal, iedereen, mensen,
beste aanwezigen), geen "hij" voor een onbekend persoon (die, diegene, de, je eigen),
en geen aandoening, afkomst, gender of ziekte als scheldwoord. Satire over gedrag en
een personage met een vast geslacht mogen blijven. `text_audit.mjs` (regel
`inclusief`, `:240`) houdt dit vast; uitzonderingen staan met reden in
`scripts/text_audit_allow.json`. Zie `docs/INCLUSIEVE-TAAL.md`.

## Beeldtaal 3D

- Low-poly, vlakke facetten, geen omlijning: gebouwen als blokken met puntdaken en
  trapgevels, bomen als gefacetteerde bollen, mensen en voertuigen kantig. De
  Martinitoren (`game/models/martinitoren.glb`) is het ijkpunt, 1 eenheid = 1 m, Y
  omhoog, PBR, geen Habbo- of cartoonstijl.
- Een echte plek is herkenbaar maar stijl-eigen: geen kopie van foto, bouwtekening of
  bestaand model, geen merk-, kenteken- of gemeentelogo. Aards palet (baksteen
  `#a8442c`, daken `#2b2a38`, water `#2c7790`), altijd zomer; beelden buiten het
  spel zijn renders van het spel (`game/img/laad/`, `loadscene.js`).
- Een echt merk als stijlbron mag niet. Dat was tot 25-10 fout in de stijlbrief (een
  "Ford Escort"-achtige auto en chibi-proporties); die noemt nu "een vierkante
  Nederlandse gezinsauto uit de jaren 90" en kiest kantig boven chibi, met de echte
  maten uit `models3d_people.js` (#479).

## Regels voor een nieuw scherm of nieuwe tekst

1. Alleen de tokens hierboven; een rolkleur via `markerColors()` of `--mk-*`. Geen
   nieuwe hex, geen tweede rood, geen blauw accent, geen plat zwart.
2. Nederlands, uit de woordenlijst, binnen het woordbudget, geen zin onder 12 px
   (menu's 13+), bekeken op 1280x720, 1280x800 en 4K.
3. Een menu gebruikt `.gm` en `.m-*`; een HUD-element heeft een zone, een prioriteit,
   een regel in `SURFACES` en een antwoord van `mayShow()`, en neemt geen klik.
4. Eén aanwijzing is nooit genoeg: vorm, patroon, merkteken of woord naast elke kleur,
   een caption naast elk geluid, de toets als token.
5. Toetsenbord, controller (`PAD_MAPS`) en touch (44 px) doen hetzelfde; Esc of B gaat
   terug, en Samen spelen krijgt de zes vragen beantwoord, zonder rolnaam.
6. Low-poly, geen echt merk, altijd zomer, een render van het spel.
7. Op 1080p en op de kleinste maat bekeken of "nog niet bekeken" in het issue; een
   nieuwe token of component in dezelfde commit in `DESIGN_SYSTEM.md`, een blijvende
   afwijking in `docs/DESIGN-SCHULD.md`, en `text_audit` plus `hud_text_audit` groen.

## Open punten (met issue)

- **#479:** kleuren buiten de tokens, onder meer `hudcards.css:39-44` (tweede rood
  `#ff5a4a`, blauw `#6c9bff`, paars `#d68cff`), `choicepanel.js:10-27` (`#d9a441`,
  `#5dff7a`, `#ff9a3c`) en `minigamekit.js:68-92` (`#6cc070`, `#ffd23f`). Besluit
  nodig: benoemen als statuskleur of vervangen.
- **#465 is op 25-10 gesloten en in beeld gezien:** de vier Engelse termen zijn nu
  Nederlands (Knielt, Afstand/Nadering/Putt, Grindtrucs, "Met liefde in Groningen");
  ook het startscherm (`game/index.html`), het About-venster (`desktop/main.js`) en de
  Windows-LEESMIJ zijn recht. `text_audit` kent ze en faalt erop (`ANGLICISMEN`).
- **#478 is half klaar:** "Start!" en "Mooi!" staan in de code en `text_audit` heeft er
  een `SHOUTS`-lijst voor, maar de kreet is nog niet op het scherm gezien (de eerste
  QA-poging trof de countdown en de puntflits niet). Het issue blijft open tot dat beeld
  er is.
- **#480 en #481 zijn op 25-10 gesloten:** de 3D-brief noemt geen merk meer en kiest
  kantig boven chibi; `DESIGN_SYSTEM.md` volgt nu de echte menustructuur van
  `pausemenu.js` (Cheats is sinds #435 een eigen rail-item, Spelers een tab onder
  Samen spelen), met de Q/E-fout als bekend punt erbij.
