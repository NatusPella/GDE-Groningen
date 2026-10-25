# Spec: UI, menu's en taal

> Canonieke spec voor alles wat de speler ziet en leest. Vervangt de regelinhoud van
> `DESIGN_SYSTEM.md`, `docs/DESIGN-BEDIENING.md`, `docs/DESIGN-COMPONENTEN.md`,
> `docs/INCLUSIEVE-TAAL.md`, `docs/WOORDENLIJST.md`, `docs/DIALECT-CONTROLE.md` en
> `docs/3d-model-prompts.md`; die blijven naslag, net als `docs/DESIGN-SCHULD.md`.
> De code is de waarheid bij kleur, maat en toets; `AGENTS.md` wint bij twijfel.

## Doel

Groen op donkergroen misdaadposter-chroom, in een hoge smalle posterletter, met
korte Nederlandse tekst. Elk scherm leest als hetzelfde spel; wijkt er één af, dan
is dat een bug.

## Kleur

Tokens staan in `game/js/hud_panel.css` (`:root`), `game/js/menu.css` (`.gm`) en
`game/js/a11y.css`; er is geen `game/css/`.

| Token | Hex | Betekenis |
|---|---|---|
| `--gron-green` | `#1e9e56` | accent: knoppen, actieve stand, randen |
| `--gron-green-light` | `#3fc97a` | koppen, toetslabels, hover, gloed |
| `--gd` (menu) | `#0f5c30` | ingedrukte knop |
| achtergrond | `#17301f` → `#0c140e` | radiale gradient, nooit plat zwart |
| tekst | `#f0ede4`, `#f2f2f2` | body op donker chroom |
| gevaar | `#d93f3f`, tekst `#f08a8a` | het enige rood |
| wanted | `#e8c93a`, leeg `rgba(255,255,255,0.25)` | alleen de wanted-sterren |
| toetsplaatje | `#fbfaf5` op `#0c140e`, rand `#a9a69b` | elke hint (`a11y.css:6`) |
| hover primaire knop | `#62d792` | menu (`menu.css:90`) |

- Eén rood: `#d93f3f` als vulling, `#f08a8a` als tekst op donker, `#e55a5a` alleen
  als hover (`menu.css:102`). Geel is gereserveerd voor de wanted-sterren, de badge
  voor bijzondere dagen en de missiemarkering; geen blauw accent, geen tweede
  merkkeur, geen plat zwart.
- Statuskleuren komen nooit uit een eigen hex: `markerColors()` (`a11y.js:21`) leest
  `PALETTES` (`:14-19`) en zet `--mk-*` op `<html>` (`:52`): ok `#3fc97a`, danger
  `#d93f3f`, mission `#e8c93a`, missionActive `#3fd0ff`, your goal `#c068ff`, job
  `#ff9a3c`, care `#ff5fb4`, police `#3f6fd9`. Drie kleurenblindmodi vervangen die
  met Okabe-Ito-waarden; canvas en 3D hertekenen op `onPaletteChange`, CSS leest
  `var(--mk-*)`.
- Contrast 4,5:1 voor tekst en 3:1 voor grote tekst en iconen (`a11ylogic.js:35-36`).
  Kleur is nooit de enige aanwijzing; vorm, patroon of woord gaat mee.
- `--gron-green-dark` (`DESIGN_SYSTEM.md:43`) heet in de CSS `--gd`.

## Typografie en logo

- Stack `'Bebas Neue', 'Arial Narrow', Arial, sans-serif`, één keer geladen in
  `game/index.html:14`. Lopende tekst en tekstballonnen in Arial Narrow; Bebas voor
  titels, tabs, knoppen, cijfers en eyebrows.
- Menu, stage 1920x1080: titel 80 px, sectietitel 64, nummer 44, tab en primaire knop
  26, ghost 24, body 20 op regelafstand 1,45, klein 18 (`menu.css:16,31-33,89,93`).
- Logo is HTML/CSS, nooit een beeld: `logoHtml()` (`logo.js`) en `.gde-logo`
  (`index.html:26`). GDE in Big Shoulders Display 900 van `#f0ede4` naar `#3fc97a`,
  de plaatsnaam op een plaat `#1e9e56`, de ondertitel cursief Arial Narrow. Big
  Shoulders is alleen voor het logo.
- Minimum 12 px voor elke zin, menu's 13 px en hoger; alleen de binnenkant van een
  toetsplaatje mag kleiner. De HUD zet `--hud-min` op 13 px gedeeld door `--ui`
  (`hud_panel.css:13`); `READABLE_MIN` is 13 (`hudlook.js:109`).
- Conflict 12 tegen 13 px: `DESIGN_SYSTEM.md:93` noemt 12 als vloer met menu's op
  13+, `:263` en `:326` zeggen "geen tekst onder 13 px", en
  `DESIGN-COMPONENTEN.md:41-43` noemt 12 als vloer met 13 in de HUD. De code doet 13
  in de HUD en 20/18 in de menu's; 12 is de harde ondergrens voor een zin op een
  Deck, niet het doel.
- De 11 px in de kaartbalk is schuld: `DESIGN-SCHULD.md:11` noemt
  `kaartactieui.js:44`, de 11 px staat op `kaartactieui.js:58`; HUD-chips staan op
  `max(11px, ...)` (`hud_panel.css:217`).

## Bediening

De tabel in het pauzemenu (Instellingen > Besturing > Toetsenoverzicht,
`CONTROL_GROUPS` in `pausemenu.js:59`) is de bron van waarheid.

| Toets | Doet |
|---|---|
| W A S D, muis | lopen, kijken; `Shift` rent, `Space` springt of remt, `Ctrl` bukt |
| E of F | gebruiken: instappen, winkel, praten, bijbaan |
| Esc, M | pauzemenu of terug; kaart openen en sluiten |
| Tab (vasthouden) | spelerslijst; tijdens richten het volgende doel |
| 1 tot 4, wiel | wapens |
| Q/E, `[`/`]` | tabbladen; zonder tabs de sectie |
| U, O, F8, F11 | geluid, verhaalstap, fotomodus, volledig scherm |
| 7, 8, 9 | roepen: Kom hier, Help!, Kijk daar |

- Elke actie heeft een weg op elk apparaat dat de speler mag gebruiken, of het scherm
  zegt waarom niet. Een nieuwe actie krijgt in dezelfde wijziging een slot in
  `PAD_MAPS` (`controls.js:204`); touchknoppen zijn diezelfde slots.
- Noem een toets nooit als tekst: gebruik `{E}` of `glyphHtml()`, zodat een eigen
  toets en het controllerteken vanzelf kloppen. De hint toont wat je nu kunt,
  hooguit twee regels; uitleg leer je één keer per apparaat.
- Touch: knoppen 64 px rond (`touch.js:22`), elk ander element minstens 44 px hoog
  (`:46`). Esc of B gaat altijd terug.
- Conflict: `pausemenu.js:121` zegt dat Q/E de sectie wisselen, maar de afhandeling
  (`:826`) wisselt eerst het tabblad, net als `DESIGN-BEDIENING.md:35`. De code
  wint; de menutekst is fout (#480).

## Menu's

De structuur staat op één plek: `SECTIONS` (`pausemenu.js:235`), `RAIL_GROUPS`
(`:254`), `CHILD` (`:257`), `SUBTABS` (`:259`) en `HINTS` (`:275`). De rail heeft
drie groepen: Spel, Verhaal, Loopbanen, Activiteiten / Kaart, Spullen, Garage,
Prestaties, Foto's / Instellingen, Cheats. Tabs: Spel (Overzicht, Samen spelen,
Opslaan & stoppen, Spelen, Camera & richten, Hints & uitleg), Samen spelen (Samen
spelen, Spelers), Verhaal (Opdrachten, Personages, Aanwijzingen, Veroverd),
Activiteiten (Alles, Dichtbij), Instellingen (Beeld, Geluid & ondertitels,
Besturing, Interface, Toegankelijkheid, Foutrapport, Cheats) en Besturing
(Toetsenbord en muis, Controller, Toetsenoverzicht, Hulp). De kaart is één scherm
zonder rail; Visboek en Boerderij hangen onder Loopbanen, Besturing onder
Instellingen. Spelers bestaat alleen in een sessie (`:358`); voor een spel begint,
bestaan alleen Spel, Instellingen en Besturing (`:258`).

- Spel > Overzicht is thuis: daar opent het menu, Esc uit een kindscherm gaat naar de
  ouder en daarna daarheen. Eén primaire knop per scherm, de rest ghost of stille
  tekst; groen voor gekozen of primair, rood alleen wat iets verwoest.
- Eén eigenaar: de structuur staat alleen in `pausemenu.js`, de vorm alleen in
  `menu.css` (`.gm`, `.m-*`). Geen ander bestand definieert knoppen, rijen of tabs
  (`DESIGN_SYSTEM.md:217-219`); de Samen spelen-schermen breken dit nog
  (`DESIGN-SCHULD.md:16`).
- Hooguit 125 woorden op een keuzescherm en 270 op een naslagscherm, beeld boven
  tekst, twee tot vier hints in de voettekst, focus zichtbaar (2 px crème, of 2 px
  groen `#3fc97a` met controller, `a11y.css:34`).
- Conflict: `DESIGN_SYSTEM.md:233` zegt "drie groepen" en noemt er vier, en zet
  Spelers als tab van Spel. De code heeft drie groepen (`:254`) en Spelers onder
  Samen spelen (`:265`) (#480).

## Taal

- Nederlands in alles wat de speler ziet of hoort (constitutie 1); code,
  bestandsnamen en opslagsleutels blijven zoals ze zijn.
- Woordkeuze uit `docs/WOORDENLIJST.md`: opslaan, savegame, **Opgeslagen spellen**,
  **Doorgaan**, **Naar het hoofdmenu**, controlepunt of hervatpunt, uitzending, reeks,
  topscore, uitleg, einde spel. **Samen spelen**, nooit co-op, coöp of multiplayer;
  wachtkamer of kamer, nooit lobby. Geen rolnaam als gastheer of host: de naam van de
  speler of "de ander"; de knoppen heten **Een spel openen** en **Meedoen**.
  Ingeburgerd: app, HUD, minimap, cheat, score, update, minigame.
- `scripts/text_audit.mjs` faalt op de Engelse vorm (`ANGLICISMEN`, `:223`) en op "de
  Grunn" (`:254`). Het is "Grunn".
- Gronings en Fries alleen met zorg. Een dialectregel staat zoals hij is, met de
  Nederlandse vertaling eronder in cursief op 0,8 em (`.nl-sub`,
  `hud_panel.css:393`); de stem spreekt Gronings, de ondertitel blijft Nederlands. Een
  nieuw dialectwoord komt met betekenis, status en bewijs in
  `scripts/dialect_woorden.json` (`docs/DIALECT-CONTROLE.md`).
- Geen echt merk, bedrijf of persoon; parodie heeft verzonnen namen (`winkelNaam`).
  Echte plaatsen mogen. In credits staat alleen de eigenaar, de rest is NatusPella;
  de lijst staat in `BRANDS` en `PEOPLE` (`text_audit.mjs:183-193`).
- Getallen in Nederlandse notatie: `840 m` onder een kilometer en `1,2 km` daarboven
  (`achievementsui.js:31`), geld als `€45` zonder spatie (`boerderijui.js:15`), tijd
  als `m:ss.cc` (`minigamekit.js:37`), wind als `Wind 3 Bft` of `Windstil` (`:54`).
- Woordbudget: een HUD-bericht is één zin van hooguit 14 woorden
  (`WORD_BUDGET.cardBody`, `hudtext.js:18`); het doel zelf 6, de regel eronder 3, een
  hint 3, een prompt 8, een ondertitel 18.
- Toon: kort, rustig, concreet. Een weigering zegt waarom, een afkoeling zegt hoe
  lang, een tweede bevestiging herhaalt de vraag op dezelfde knop.

## Inclusieve taal

Geen man als standaard (agent, brandweerlieden, vuilnisophaler, zakenreiziger,
klusser, iemand aan het roer, cameraploeg), geen groepsaanspreking (allemaal,
iedereen, mensen, beste aanwezigen, luisteraars), geen "hij" voor een onbekend
persoon (die, diegene, de, je eigen), en geen aandoening, afkomst, gender of ziekte
als scheldwoord. Satire over gedrag en een personage met een vast geslacht mogen
blijven. `text_audit.mjs` (regel `inclusief`, `INCLUSIEF` op `:240`) houdt dit vast;
uitzonderingen staan met reden in `scripts/text_audit_allow.json`. Zie
`docs/INCLUSIEVE-TAAL.md`.

## Beeldtaal 3D

- Low-poly, vlakke facetten, geen omlijning: gebouwen als blokken met puntdaken en
  trapgevels, bomen als gefacetteerde bollen, mensen en voertuigen kantig. De
  Martinitoren (`game/models/martinitoren.glb`) is het ijkpunt, 1 eenheid = 1 m, Y
  omhoog, PBR, geen Habbo- of cartoonstijl.
- Een echte plek is herkenbaar maar stijl-eigen: geen kopie van foto, bouwtekening of
  bestaand model, geen merk-, kenteken- of gemeentelogo, geen getraceerde foto als
  textuur. Aards palet: baksteen `#a8442c` tot `#c9876a`, daken `#2b2a38`, crème
  `#f0ede4`, groen `#3f8f3a`, water `#2c7790`. Altijd zomer; beelden buiten het spel
  zijn renders van het spel (`game/img/laad/`, `loadscene.js`).
- Een echt merk als stijlbron mag niet. De stijlbrief noemt een "Ford Escort"-achtige
  auto (`3d-model-prompts.md:301`) en chibi-proporties (`:346-352`); die spreken de
  regel hierboven tegen (#479).

## Regels voor een nieuw scherm of nieuwe tekst

1. Kleur: alleen de tokens hierboven; een rolkleur via `markerColors()` of `--mk-*`.
   Geen nieuwe hex, geen tweede rood, geen blauw accent, geen plat zwart.
2. Tekst: Nederlands, uit de woordenlijst, binnen het woordbudget, geen zin onder 12
   px (menu's 13+), bekeken op 1280x720, 1280x800 en 4K.
3. Vlak: een menu gebruikt `.gm` en `.m-*`; een HUD-element heeft een zone, een
   prioriteit, een regel in `SURFACES` en een antwoord van `mayShow()`, en neemt geen
   klik.
4. Eén aanwijzing is nooit genoeg: vorm, patroon, merkteken of woord naast elke kleur,
   een caption naast elk geluid, de toets als token.
5. Apparaten: toetsenbord, controller (`PAD_MAPS`) en touch (44 px) doen hetzelfde;
   Esc of B gaat terug.
6. Samen spelen: de zes vragen beantwoord, geen rolnaam, geen knop die alleen de
   opener heeft.
7. Beeld: low-poly, geen echt merk, altijd zomer, een render van het spel.
8. Gezien en vastgelegd: op 1080p en op de kleinste maat bekeken of "nog niet bekeken"
   in het issue; een nieuwe token of component in dezelfde commit in
   `DESIGN_SYSTEM.md`, een blijvende afwijking in `docs/DESIGN-SCHULD.md`, en
   `text_audit` plus `hud_text_audit` groen.

## Open punten (met issue)

- #465: vier Engelse termen in zichtbare tekst; de audit kent ze nog niet (0
  bevindingen op 25-10).
- #478: "GO!" (`kartbaan.js:451`, `:524`) en "Perfect!" (`padel.js:792`,
  `padelmatch.js:168`) staan in beeld.
- #476: kleuren buiten de tokens, onder meer `hudcards.css:39-44` (tweede rood
  `#ff5a4a`, blauw `#6c9bff`, paars `#d68cff`), `choicepanel.js:10-27` (`#d9a441`,
  `#5dff7a`, `#ff9a3c`) en `minigamekit.js:68-92` (`#6cc070`, `#ffd23f`). Besluit
  nodig: benoemen als statuskleur of vervangen.
- #479: de 3D-brief met "Ford Escort" en chibi tegen de stijlregel.
- #480: de menudocs kloppen niet meer (`DESIGN_SYSTEM.md:232-237` tegen
  `pausemenu.js:235-268`), inclusief de Q/E-tekst op `pausemenu.js:121`.
