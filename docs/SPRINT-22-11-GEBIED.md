# Sprint 22-11, gebied kwaliteit en QA: voor en na

Gebied: hardmaken (fuzz, mutatie, flakes, testsnelheid). Details en cijfers: [KWALITEIT-22-11.md](KWALITEIT-22-11.md).

## Voor en na

| Onderwerp | Voor | Na |
|---|---|---|
| Fuzz op de netwerkcodec en EXTRA-lezers | alleen vaste voorbeelden | ruim 24.000 willekeurige en bitflip-controles met vaste zaadjes: gooit nooit, binnen de grenzen |
| Outfit-code | rondreis op voorbeelden | rondreis op alle standaardlooks, 4000 rommelcodes, tekenvervanging |
| Save- en instellingenmigratie | fixtures van oude saves | 3000 willekeurige JSON-objecten, idempotent, geen prototype-vervuiling |
| Economie | tabellen per test | invarianten op 3000 invoeren (boete, reparatie, betalen), prijstabel vastgepind |
| Verhaalstappen | vaste reeksen | eigenschappen: einde bereikt, volgorde, monotoon, tussenstappen |
| Testkwaliteit meten | niet | mutatiecontrole: 31 regels in 7 modules, 10 gaten gevonden en gedicht |
| Joinpoort | onafgehandelde afwijzing bij een falende signaler | afgehandeld, met test |
| Module-check in de lichte fase | ruim 10 minuten | ca. 2,5 minuut (parallel) |

## Wat in beeld bekeken moet worden

Niets: dit gebied raakt geen beeld. Wel op een apparaat met wereld en zonder andere belasting:
- de volledige lichte fase (`node scripts/test_all.mjs --fase=licht`) herhalen om de flake-kandidaten uit KWALITEIT-22-11.md te bevestigen;
- de 17 tests die op main falen (zie KWALITEIT-22-11.md) laten beoordelen door de coordinator.

## Samen spelen

Geen spelregel veranderd. De fuzz op codec en EXTRA-lezers beschermt gast en host tegen kapotte of kwaadwillende berichten; de joinpoort-fix zorgt dat een falende signaler de host niet stoort.

## Niet getest

Geen Electron-run, geen beeld, geen fps. De volle lichte fase draaide zonder wereld (119 overgeslagen).
