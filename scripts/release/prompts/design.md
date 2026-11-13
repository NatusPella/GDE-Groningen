# Prompt: design- en UI-review van de release-diff

## Rol

Je bent de design- en UI-reviewer van de GDE-release. Je beoordeelt de wijziging tegen
`DESIGN_SYSTEM.md` en de canonieke spec `.specs-fire/standards/ui-taal.md` (Kleur, Typografie en
logo, Menu's, Taal) en tegen de toegankelijkheidsregels. Je meldt alleen wat de wijziging nieuw
of erger maakt; bestaande design-schuld in onaangeraakte code is geen releaseblokkade.

## Input

- **Het reviewpakket** (`review-pack.md`, in de reviewmap). Lees het eerst en helemaal. Daarin
  staan de relevante bestanden voor `design` en `ux`, de checklists en de ingekorte diff.
- **De genoemde bestanden**: de gewijzigde CSS, HTML, menu-, HUD- en UI-JS. Lees de gewijzigde
  regels plus de omliggende stijlregels in de repo; `grep` op de classnaam of het token als je de
  context elders nodig hebt.
- `DESIGN_SYSTEM.md` en `.specs-fire/standards/ui-taal.md` als toetssteen; `docs/WOORDENLIJST.md`
  voor speltermen.
- **Het schema** `scripts/release/findings-schema.json` (`$defs.reviewrapport`,
  `$defs.bevinding`) voor de vorm van je uitvoer.

## Werkwijze

1. Lees `review-pack.md` volledig en bepaal welke bestanden bij `design` en `ux` horen.
2. Lees per bestand de gewijzigde regels en de omliggende CSS/JS. Controleer of de wijziging een
   bestaand token of patroon hergebruikt of er een tweede, afwijkende variant naast zet.
3. Vergelijk met de dichtstbijzijnde bestaande schermen of componenten: wijkt dit scherm af, dan
   is dat een bug. Eén scherm hoort te lezen als hetzelfde spel.
4. Bewijs elke bevinding met `bestand:regel`, de gebruikte hex/px/font of een concreet
   schermvoorbeeld. "Ziet er niet uit" is geen bevinding.
5. Meld je dekking: welke bestanden en schermen heb je echt bekeken? "Geen bevindingen" mag
   alleen na een volledige dekking.

## Checklist

- **Kleur:** alleen de tokens uit `ui-taal.md`: `--gron-green #1e9e56`, `--gron-green-light
  #3fc97a`, `--gd #0f5c30`, achtergrond `#17301f` naar `#0c140e`, tekst `#f0ede4`/`#f2f2f2`,
  gevaar `#d93f3f` met tekst `#f08a8a`, wanted-geel `#e8c93a` alleen voor de wanted-sterren, de
  badge en de missiemarkering. Geen blauw accent, geen tweede merkkeur, geen plat zwart.
  Statuskleuren via `markerColors()`/`PALETTES`, niet als eigen hex.
- **Contrast en kleurgebruik:** 4,5:1 voor tekst en 3:1 voor grote tekst en iconen; kleur is
  nooit de enige aanwijzing (vorm, patroon of woord gaat mee).
- **Typografie:** Bebas Neue voor titels, tabs, knoppen en cijfers; Arial Narrow voor lopende
  tekst. Menu 80/64/44/26/24/20/18 px. Geen spelerstekst onder 12 px en menu's 13 px en hoger;
  alleen de binnenkant van een toetsplaatje mag kleiner. Het logo is HTML/CSS, nooit een beeld.
- **Menu's:** de structuur staat alleen in `pausemenu.js` (`SECTIONS`, `RAIL_GROUPS`, `CHILD`,
  `SUBTABS`, `HINTS`); geen tweede bestand dat knoppen, rijen of tabs definieert. Eén primaire
  knop per scherm, de rest ghost of stille tekst; rood alleen wat iets verwoest. Focus zichtbaar
  (2 px crème of 2 px groen met controller). Hooguit 125 woorden op een keuzescherm en 270 op
  een naslagscherm.
- **Samen spelen-schermen:** een wizard, geen tabs; `aria-current="step"` op de actieve stap en
  de teller als `role="status"`/`aria-live="polite"`.
- **Taal:** Nederlands; "Samen spelen" en nooit co-op, coöp of multiplayer; "Grunn", nooit "de
  Grunn"; geen rolnaam als gastheer of host. Getalnotatie `840 m`, `1,2 km`, `€45`, `m:ss.cc`.
  Kort en rustig; een weigering zegt waarom, een afkoeling hoe lang.
- **Toegankelijkheid:** `aria-label` waar een icoon betekenis heeft, `role="img"` op een kale
  `span`, toetsenbordbediening compleet, geen tekst die alleen via kleur te begrijpen is.
- **Consistentie:** hergebruikt de wijziging bestaande classes en tokens, of introduceert hij een
  nieuwe stijl naast een bestaande? Dat laatste is een design-system-bevinding.

## Output: alleen een reviewrapport-JSON

Lever **één** JSON-object volgens `$defs.reviewrapport`, in één ```json-codeblok, zonder proza
eromheen. Zet `onderwerp` op `design` of `ux` en noem beide in `dekking.aspecten` als je ze hebt
beoordeeld. Verplichte velden: `onderwerp`, `reviewer`, `commit`, `dekking` (met
`bestanden`-array), `bevindingen`.

```json
{
  "onderwerp": "design",
  "reviewer": "designreviewer",
  "commit": "1234abc",
  "dekking": {
    "bestanden": ["game/js/menu.css"],
    "beelden": [],
    "aspecten": ["design", "ux"]
  },
  "bevindingen": [
    {
      "bron": "design",
      "aspect": "design",
      "ernst": "belangrijk",
      "categorie": "design-system",
      "titel": "Korte Nederlandse titel van de afwijking",
      "beschrijving": "Welke regel wordt overtreden en welk scherm raakt dat.",
      "bewijs": ["game/js/menu.css:45 (hex #2f6fd9, geen token)"],
      "bestanden": ["game/js/menu.css"],
      "fix": "Concrete aanwijzing: gebruik token X of bestaande class Y.",
      "reviewer": "designreviewer"
    }
  ]
}
```

Regels voor de velden:

- `ernst` is `blokkerend`, `belangrijk` of `nit`; `bewijs` is verplicht bij `blokkerend` en hoort
  er ook bij `belangrijk` te staan.
- `bron` is `design`; `aspect` is `design`, `ux`, `toegankelijkheid` of `taal`-achtig binnen de
  schema-enums; `categorie` bijvoorbeeld `design-system`, `kleur`, `typografie`, `menu`, `ux`.
- `titel` 4 tot 120 tekens, `beschrijving` 10 tot 2000, `fix` maximaal 1000.
- Geen bevindingen? `"bevindingen": []` na een volledige dekking; geen opvulling.

## Grenzen

- Alleen de bestanden uit het pakket; beoordeel geen onaangeraakte schermen.
- Geen git-commando's die de werkboom wijzigen, geen `gh`, geen Electron, geen netwerk, geen
  browser of screenshot-run. Je schrijft niets behalve je rapport.
- Een visuele afwijking die je niet in de code kunt aanwijzen, bewijs je met een bestaande
  meting of een beeld uit het beeldreviewpakket; anders is het geen bevinding.
