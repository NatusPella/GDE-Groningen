# Intent: docs naar canonieke specs

## Doel
De 134 markdown-bestanden in docs/ (3,5 MB) en de root-docs opruimen tot een kleine set canonieke specs per systeem, plus de harde regels in .specs-fire/standards. Vervangen en dubbele documenten verdwijnen; wat volledig elders geborgd is mag weg (git bewaart de historie).

## Besluiten van de eigenaar (25-10)
- Scope: alles, inclusief root en docs/archief.
- Vorm: canonieke specs per systeem (1) én de standaarden in .specs-fire/standards (3).
- Opruimen: archiveren waar nuttig; bestanden waarvan de inhoud volledig op een nieuwe plek staat mogen weg.
- Gevonden afwijkingen worden GitHub-issues, inclusief B1-B7.

## Succescriteria
- Per systeem één spec met: doel, regels, bestanden, tests, open punten.
- Geen dubbele of tegenstrijdige regels tussen specs en standaarden.
- Elke verwijderd bestand is aantoonbaar geborgd; docs/archief houdt wat historie heeft.
- Geen broken links in README/AGENTS/docs naar verwijderde bestanden.
- Afwijkingen staan als issue op het bord.

## Buiten scope
- Spelcode wijzigen (behalve als een doc een aantoonbare fout beschrijft die een issue wordt).
- Eigenaar-publicaties (Steam, YouTube, IARC) uitvoeren.

## Uitkomst (25-10-2026)

Klaar. Zes specs geschreven in `.specs-fire/standards/` (`multiplayer`, `wereld`,
`mechanica`, `verhaal`, `ui-taal`, `publicatie`), elk met de bron, de regels, de
bestanden, de tests en de open punten.

- **Verplaatst naar `docs/archief/2026-10/` (23 documenten):** de drie
  `deel4-f4a/b/c`-drafts (1,1 MB), `D-definitief`, `00-analyse`, `FLOW-ANALYSE`,
  `verhaal-voorstel`, `ARCHITECTUUR-REVIEW`, `FEEDBACK-SPEELTEST-1`,
  `SPELBOT-RAPPORT`, `PERF-PROFIEL`, `WEER-NACHT-RAPPORT`, `GELUID-AUDIT`,
  `ONBOARDING`, `PRESTATIES-ZWAK`, `ISSUE-STAND`, `OVERDRACHT`,
  `NALEZEN-GRONINGS-FRIES`, `INVENTARIS`, `MUZIEK-OPRUIMING`, `PLAN-1.0`,
  `OMMELAND-PARITEIT`, `SAMEN-SPEELEN-SPEELPLAN`. Elk met een kop die zegt wat het
  vervangt en dat de relatieve links niet meer werken.
- **Verwijderd:** `docs/verhaal/nieuw/HET-VERHAAL.md`, `docs/verhaal/OPNAMELIJST.md`
  (beide gegenereerd) en `scripts/build_screenplay.mjs`. De generator van de
  opnamelijst (`scripts/opnamelijst.mjs`) blijft: die schrijft het bestand op
  verzoek en het staat niet meer in git.
- **Bewust niet gearchiveerd:** `docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md` (acht
  codecommentaren verwijzen ernaar voor de tegelindeling) en `ARCHITECTURE.md`
  (blijft de bestandskaart; `system-architecture.md` houdt de regels).
- **Issues:** #465-#490 (26 stuks), alle op het bord.
- **Gerepareerd onderweg:** `undef_check` stond op main stuk door #438 (twee
  ontbrekende imports in `heist.js`); de juridische feiten in `LICENTIES.md` en
  `PRIVACY-EN-CREDITS.md`; en alle kapotte relatieve links in `docs/`, README,
  AGENTS en ARCHITECTURE.
- **Open:** de docs die een eigen issue hebben (#468, #473, #474, #477, #480,
  #483, #484) zijn nog niet herschreven; dat is het werk van die issues.
