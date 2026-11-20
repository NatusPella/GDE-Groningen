# 0041 - Phosphor als enige iconenset

- **Status:** besloten (eigenaarsbeslissing 20-11-2026)
- **Datum:** 20-11-2026
- **Spec:** `.specs-fire/standards/ui-taal.md`, `DESIGN_SYSTEM.md`, `docs/ICONEN-LICENTIE.md`
- **Verwant:** ADR 0040 (zomerse zeefdruk), constitutie punt 4 in AGENTS.md, #985

## Context

De iconen in het spel kwamen uit vele hoeken: inline SVG's per scherm (pauzemenu, garage, winkel, HUD), `mapicons.js`, `achievementicons.js`, emoji en unicode-tekens. Ze hadden verschillende lijndiktes, maten en stijlen, en elk scherm bouwde zijn eigen `<svg>`. Het designsysteem (ADR 0040) vraagt één taal.

## Besluit

Alle iconen in het spel komen uit Phosphor (`@phosphor-icons/core` 2.1.1, MIT). Alleen de gebruikte SVG's worden meegebundeld, door `scripts/ui/phosphor_kies.mjs`, tot één module (`game/js/phosphordata.js`). Eén module, `game/js/icons.js`, geeft ze terug op betekenis (`icoon('geld')`); de naamkoppeling staat in `game/js/iconmap.js`. Kleur is `currentColor`; vaste maten 16, 20, 24 en 32 px; gewicht regular, bold onder 16 px. Een onbekende naam geeft een vraagteken, geen gat. De licentie staat in `licenses/MIT-phosphor-icons.txt` en `docs/ICONEN-LICENTIE.md`, en in de credits van het spel. Het spel haalt niets op; de set zit in de bundel.

## Waarom één set

Eén lijndikte en één vormtaal laten de HUD, menu's en kaart bij elkaar horen, en bij de Barlow-koppen en de papieren bon-kaarten. Schermen vragen om een betekenis, dus een icoon vervangen is één regel. Een set met zes gewichten en 1512 vormen dekt ook wat we later nodig hebben.

## Afgewezen

- **Lucide:** goede set, maar alleen één gewicht en iets minder dekking van voertuigen en boerderij.
- **Tabler:** veel iconen, maar een dunnere lijn die op kleine maten te ijl wordt naast de Barlow-koppen.
- **game-icons.net:** CC BY 3.0 per icoon met veel auteurs, en een stijl die botst met het designsysteem; credits per icoon.
- **Kenney-iconen:** passen bij een speelse UI, niet bij zeefdruk en bon-kaarten.
- **Eigen iconen:** het onderhoud van honderden iconen in één stijl is meer werk dan de eigenaar wil.
- **Meerdere sets naast elkaar:** dat is precies het probleem dat dit besluit oplost.

## Gevolgen

Nieuwe iconen gaan via `iconmap.js` en het kiesscript; handwerk in `phosphordata.js` is verboden. `scripts/icons_test.mjs` bewaakt dat elke naam bestaat, dat er geen dubbele koppelingen zijn en dat de bundel klein blijft. Bestaande inline-iconen worden per scherm vervangen; de inventaris staat in `docs/ICONEN-INVENTARIS-20-11.md`.
