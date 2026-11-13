## Wat verandert er

<!-- Kort: wat en waarom. Verwijs naar een issue als dat er is (bijv. "Lost #12 op"). -->

## Hoe getest

<!-- Wat heb je gedraaid of gespeeld? Bijv. node scripts/save_migration_test.mjs, een stuk van het verhaal via ?dev. -->

## Controle

- [ ] `node --check` op gewijzigd JavaScript, en de tests uit CONTRIBUTING.md draaien
- [ ] `node scripts/run_tests.mjs` is groen, inclusief de regels- en designcontrole op deze diff (CI doet die automatisch met `GDE_RULES_BASE`)
- [ ] Tekst die spelers zien is Nederlands; nieuwe gesproken regels staan hieronder vermeld (die hebben nog een opname nodig)
- [ ] Geen echte merken, bedrijven of personen toegevoegd
- [ ] Geen sleutels, `.env`, thuispaden of e-mailadressen in de commits (`node scripts/publish_check.mjs`)
- [ ] Materiaal van derden heeft een licentievermelding in `NOTICE.md`
- [ ] Verandert de save of een opslagsleutel? Dan is er een migratie (`savemigrate.js` / `storagekeys.js`) en een test
- [ ] Ik ga akkoord met de licentie van mijn bijdrage (CONTRIBUTING.md › *Licentie van je bijdrage*): GPL-3.0-or-later (code) en CC BY-NC-SA 4.0 (inhoud), plus een eeuwigdurende, onherroepelijke licentie aan NatusPella, ook voor commercieel gebruik; ik houd mijn auteursrecht
- [ ] Elke commit heeft een `Signed-off-by:`-regel (`git commit -s`)
