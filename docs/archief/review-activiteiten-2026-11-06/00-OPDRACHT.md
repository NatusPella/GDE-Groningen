# Opdracht: inhoudelijke review van alle activiteiten (deelreviews)

Datum: 6-11-2026. Repo: `<repo>`, branch `main`, HEAD `41340dd4`
("Docs: reviewarchieven van de andere sessies bewaard"). De werkboom is schoon. Let op: dit
commit bevat ook een kopie van deze opdracht onder `docs/archief/review-activiteiten-2026-11-06/`;
werk in `.review-activiteiten-2026-11-06/` in de werkmap, niet in `docs/archief/`.

## Wat we reviewen

GDE Groningen – Zomer vol misdaad: een Nederlandse open-wereldkomedie in low-poly Groningen
(three.js + Electron, webversie). Spelers zijn Tammo en Tessa; 18+. Doel van deze reviewronde is
**geen code review** maar een **spelontwerp-review**: hoe goed werken alle activiteiten voor de
speler, en hoe kunnen ze beter (samen spelen, plezier, uitdaging, UI/UX, gameplay, diepgang,
duidelijkheid)? Vorige reviewronde (`docs/archief/review-archief-2026-11-06/`) deed techniek/bugs;
die bevindingen niet herhalen, wel lezen zodat je ze niet dupliceert.

De Lead schrijft uit jouw rapport en de vijf andere een eindrapport. Jij levert één deelrapport.

## Spelregels voor deze opdracht

- **Geen code wijzigen, geen branch/commit/push, geen git-schrijfacties.** Je schrijft alleen je
  eigen rapportbestand (pad in je opdracht) en verder niets in de repo.
- **Niets runtime testen**: geen Electron, geen spel starten, geen netwerksessie, geen zware
  testsuite. Lezen, greppen en kleine `node --check`/testjes mogen wel, maar zijn niet nodig.
  Wees eerlijk over wat je alleen statisch hebt gezien.
- **Geen `.env`** lezen of printen; geen echte persoonsgegevens.
- **Nederlands** in je rapport (proza, koppen, suggesties). Speltermen die de speler ziet mogen
  Nederlands/Gronings blijven; code-identifiers citeer je letterlijk.
- **Citeer bewijs**: `game/js/bestand.js:regel` (of `scripts/...`, `docs/...`). Geen beweringen
  zonder bron. Getallen (lonen, tijden, drempels) uit de code, niet schatten als het niet nodig is.
- **Severity**: `Hoog` (speler merkt het echt, breekt plezier/begrip), `Midden` (duidelijk
  verbeterpunt), `Laag` (afwerking). Geef per suggestie een kostenindicatie `S`/`M`/`L`
  (S = uren, M = dagen, L = week of meer) en of het een bugfix, content, UI of systeemwijziging is.
- **Toets aan de constitutie** (AGENTS.md): alleen Nederlands spelerszichtbaar; geen echte merken,
  bedrijven of personen; altijd zomer; satirisch zonder leed en buiten PvP "zonder getoond geweld";
  geheimen blijven geheim; elke nieuwe activiteit krijgt een Samen-spelen-regel. Noem het als een
  suggestie daarmee botst.
- **Geen GitHub-issues aanmaken** en niet doen alsof; dit is input voor de eigenaar.

## Verplicht lezen (snel, gericht)

1. `AGENTS.md` (constitutie + werkwijze) en `README.md` (wat het spel is).
2. `.specs-fire/standards/mechanica.md` (canonieke regels per systeem) en, waar relevant,
   `multiplayer.md`, `ui-taal.md`, `wereld.md`, `verhaal.md`. `ARCHITECTURE.md` niet heel lezen:
   grep de sectie die je nodig hebt.
3. `docs/DESIGN-SCHULD.md` (bekende UX-schuld), `docs/PLAYTESTPLAN.md` en `docs/SPEELTEST.md`
   (wat de eigenaar zelf al als speeltestpunten noteert), `docs/MULTIPLAYER-VISIE.md`.
4. `CHANGELOG.md`: grep `## \[Unreleased\]` en de laatste twee releases; daar staat wat er recent
   veranderd is en wat "nog niet in beeld bekeken" is.
5. `docs/archief/review-archief-2026-11-06/RAPPORT.md` + het deelrapport dat bij jouw gebied past,
   om technische bevindingen niet te dupliceren.
6. Jouw eigen systeem: de modules in je opdracht, plus de bijbehorende `scripts/*_test.mjs`
   (tests vertellen vaak wat de bedoeling is en welke randen al gedekt zijn) en de docs die het
   systeem beschrijven.

## Rapportvorm (gebruik deze koppen, in het Nederlands)

```markdown
# Deelreview: <onderwerp>

Datum: 6-11-2026. Scope: <bestanden/systemen>. Status: statische leesreview, niets runtime getest.
Commit: 41340dd4.

## Samenvatting
- 6-10 bullets: wat werkt, wat het meest stoort, de grootste kansen.

## Inventaris
| Activiteit | Waar (bestand) | Wat je doet | Duur | Beloning | Herhaalbaar | Samen spelen |
(Tabel of lijst met alle activiteiten in jouw scope. Volledig, ook de kleine.)

## Wat goed werkt
Kort en concreet; noem echte sterke punten (verhaal, humor, sfeer, systemen).

## Bevindingen
### [Hoog|Midden|Laag] Korte titel
- **Waar:** `game/js/bestand.js:123`, `docs/...`
- **Wat:** ...
- **Waarom dit stoort (spelerervaring):** ...
- **Suggestie:** ... (kosten S/M/L, soort)
(Herhaal per bevinding. Orden op severity.)

## Samen spelen per activiteit
| Activiteit | Gast kan meedoen? | Wat ziet de gast? | Beloning/voortgang | Gedekt door test? |
(Alleen als jouw scope dit raakt; anders "n.v.t., zie rapport 05".)

## Top-5 verbeteringen
1. ... (impact, kosten, waarom nu)

## Dekking en wat ik niet heb bekeken
Eerlijk: welke bestanden diep gelezen, welke alleen gegrepd, wat niet.
```

## Kwaliteitseisen

- **Concreet en uitvoerbaar**: "maak de beloning duidelijker" is te vaag; zeg wáár, wát en hoe
  (bijv. "toon in het bord vóór de start het verwachte loon en de medaille-eis, zoals
  `minigamekit.js` al doet voor X").
- **Onderscheid mening en feit.** "Dit voelt traag" mag, maar onderbouw met een getal of een
  observatie uit de code/tekst.
- **Denk als speler, niet als programmeur**: eerste tien minuten, ontdekbaarheid, "wat moet ik nu
  doen", "wat levert het op", "waarom zou ik het nog eens doen", "wat doet mijn vriend".
- **Denk aan Samen spelen als ontwerpeis**, niet als bijzaak: wie opent, wie doet mee, wat ziet een
  gast, wie krijgt de beloning, wat als iemand wegvalt of later aansluit.
- **Lengte**: 10-18 KB markdown. Liever scherp en volledig dan lang en vaag.
- **Slotantwoord** (naar de Lead, niet in het bestand): maximaal 25 regels met de 5 belangrijkste
  bevindingen en of je iets niet hebt kunnen dekken.
