// Test van de pure releasegate-logica (#releasegate): welke fasen een diff vraagt, hoe
// uitslagen tot één verdict optellen en of een bewaard rapport bij de huidige commit hoort.
//   node scripts/release_gate_test.mjs
// Draait zonder Electron, wereld, netwerk of git; de CLI zelf is een dunne laag eromheen.
import {
  STAGES, STAGE_NAAM, classifyPath, planStages, requiredStages, mergeVerdict, verifyGate, beschrijfPlan,
} from './release/stages.mjs';
import { schrijfVerslag, uitslagenVoorVerdict } from './release_gate.mjs';

let fails = 0;
const ok = (c, naam, extra) => { if (!c) { fails++; console.log('FAIL', naam, extra !== undefined ? JSON.stringify(extra) : ''); } };

// ---------------------------------------------------------------- padclassificatie
const cls = (f) => classifyPath(f);
ok(cls('game/world/tegels/1.gdt').includes('world'), 'game/world vraagt de wereldfase');
ok(cls('game/js/worldbuilder.js').includes('world') && cls('game/js/worldbuilder.js').includes('perf'), 'worldbuilder vraagt wereld en perf');
ok(cls('game/js/scene3d.js').includes('perf') && cls('game/js/scene3d.js').includes('visual'), 'scene3d vraagt perf en beeld');
ok(cls('game/js/menu.js').includes('visual') && !cls('game/js/menu.js').includes('world'), 'menu vraagt alleen beeld');
ok(cls('scripts/perf/run.mjs').includes('perf'), 'scripts/perf vraagt perf');
ok(cls('scripts/coop/net_test.mjs').includes('multiplayer'), 'coop vraagt multiplayer');
ok(cls('docs/RELEASEN.md').length === 0, 'documentatie vraagt geen meetfase');
ok(cls('game\\js\\ui_scherm.js').includes('visual'), 'backslashes worden genormaliseerd');
ok(cls('').length === 0 && cls(null).length === 0, 'lege paden vragen niets');

// ---------------------------------------------------------------- plan
const docs = planStages(['docs/RELEASEN.md', 'README.md']);
ok(docs.stages.static.nodig && docs.stages.review.nodig, 'elke release vraagt static en review');
ok(!docs.stages.world.nodig && !docs.stages.perf.nodig && !docs.stages.visual.nodig, 'documentatie vraagt geen wereld/perf/beeld');
ok(requiredStages(docs).join() === 'static,review', 'verplichte fasen van een docwijziging');

const wereld = planStages(['game/js/worldbuilder.js', 'data/cache/x.json']);
ok(wereld.stages.world.nodig && wereld.stages.perf.nodig && wereld.stages.visual.nodig, 'wereldwijziging vraagt wereld, perf en beeld');
ok(requiredStages(wereld).length === STAGES.length, 'wereldwijziging vraagt alle fasen');

const ui = planStages(['game/js/hud_panel.css']);
ok(ui.stages.visual.nodig && !ui.stages.world.nodig && !ui.stages.perf.nodig, 'UI-wijziging vraagt alleen beeld extra');

const geskipt = planStages(['game/js/worldbuilder.js'], { skip: ['world'] });
ok(!geskipt.stages.world.nodig && geskipt.stages.world.redenen.some((r) => /overgeslagen/.test(r)), '--skip haalt de fase uit het plan');

const geforceerd = planStages(['docs/RELEASEN.md'], { force: ['perf'] });
ok(geforceerd.stages.perf.nodig && geforceerd.stages.perf.redenen.some((r) => /geforceerd/.test(r)), '--force zet een fase aan');

const alles = planStages([], { all: true });
ok(alles.geselecteerd.length === STAGES.length && alles.stages.review.nodig, '--all zet alle fasen aan');
ok(planStages([]).geselecteerd.join() === 'static,review', 'een lege diff vraagt alleen static en review');

// ---------------------------------------------------------------- verdict
const pass = Object.fromEntries(STAGES.map((f) => [f, { status: 'PASS', code: 0 }]));
const groen = mergeVerdict(pass);
ok(groen.status === 'groen' && groen.code === 0, 'alles PASS is groen');

const rood = mergeVerdict({ ...pass, perf: { status: 'FAIL', code: 1, detail: 'p95 te hoog' } });
ok(rood.status === 'rood' && rood.code === 1, 'één FAIL is rood');
ok(rood.redenen.some((r) => /perf/.test(r)), 'het verdict noemt de rode fase');

const onvolledig = mergeVerdict({ ...pass, visual: { status: 'SKIP', code: 3, detail: 'geen beelden' } });
ok(onvolledig.status === 'onvolledig' && onvolledig.code === 3, 'een overgeslagen fase is onvolledig, niet groen');
const gedoogd = mergeVerdict({ ...pass, visual: { status: 'SKIP', code: 3 } }, { allowSkip: true });
ok(gedoogd.code === 0 && gedoogd.status === 'groen', '--allow-skip maakt een deelrun exit 0');

const leeg = mergeVerdict({});
ok(leeg.status === 'onvolledig' && leeg.code === 3, 'niets gemeten is onvolledig');

// Alleen de fasen die in het plan nodig zijn tellen mee voor het verdict.
const planUi = planStages(['game/js/menu.js']);
const uitslagen = { static: { status: 'PASS', code: 0 }, visual: { status: 'PASS', code: 0 }, world: { status: 'FAIL', code: 1 } };
const alleenNodig = uitslagenVoorVerdict(uitslagen, planUi);
ok(Object.keys(alleenNodig).join() === 'static,visual', 'niet-nodige fasen tellen niet mee');
ok(mergeVerdict(alleenNodig).status === 'groen', 'een UI-diff is groen zonder wereldfase');

// ---------------------------------------------------------------- verify
const bouwGate = (over = {}) => {
  const plan = planStages(['game/js/menu.js']);
  const stages = {};
  for (const f of requiredStages(plan)) stages[f] = { status: 'PASS', code: 0 };
  return {
    schema: 1,
    commit: 'abcdef1234567890',
    plan,
    stages,
    review: { status: 'groen', commit: 'abcdef1234567890' },
    verdict: { status: 'groen', code: 0 },
    ...over,
  };
};
const goedeGate = bouwGate();
const v = verifyGate(goedeGate, { commit: 'abcdef1234567890' });
ok(v.ok && v.code === 0, 'een groen rapport op dezelfde commit is bewezen groen', v.problemen);

const oud = verifyGate(goedeGate, { commit: '9999999999999999' });
ok(!oud.ok && oud.code === 1 && oud.problemen.some((p) => /HEAD/.test(p)), 'een rapport van een andere commit is rood');

const reviewRood = verifyGate(bouwGate({ review: { status: 'rood', commit: 'abcdef1234567890' } }), { commit: 'abcdef1234567890' });
ok(!reviewRood.ok && reviewRood.code === 3 && reviewRood.problemen.some((p) => /review/.test(p)), 'een rode review houdt de release tegen');

const zonderStatic = bouwGate();
delete zonderStatic.stages.static;
const mist = verifyGate(zonderStatic, { commit: 'abcdef1234567890' });
ok(!mist.ok && mist.code === 3 && mist.problemen.some((p) => /static/.test(p)), 'een ontbrekende verplichte fase is onvolledig');

const geenGate = verifyGate(null, { commit: 'abcdef1234567890' });
ok(!geenGate.ok && geenGate.code === 3, 'zonder rapport geen groen');

// De versiecommit van release.sh raakt alleen release-metadata; de gate mag daarom op de
// code-commit ervoor zijn gedaan. De review moet wel op die code-commit staan.
const versieGate = bouwGate({ commit: 'abcdef1234567890', review: { status: 'groen', commit: 'abcdef1234567890' } });
const versie = verifyGate(versieGate, { commit: 'fedcba0987654321', allowReleaseCommit: true, filesSinds: ['desktop/package.json', 'desktop/package-lock.json', 'android/package.json', 'android/package-lock.json', 'CHANGELOG.md'] });
ok(versie.ok && versie.code === 0, 'alleen release-metadata sinds de gate is toegestaan', versie.problemen);
ok(versie.waarschuwingen.some((w) => /release-metadata/.test(w)), 'de uitzondering wordt wel gemeld');
const codeGate = verifyGate(versieGate, { commit: 'fedcba0987654321', allowReleaseCommit: true, filesSinds: ['game/js/menu.js'] });
ok(!codeGate.ok && codeGate.code === 1, 'een codewijziging sinds de gate is niet toegestaan');
const leegSinds = verifyGate(versieGate, { commit: 'fedcba0987654321', allowReleaseCommit: true, filesSinds: [] });
ok(!leegSinds.ok, 'zonder gewijzigde bestanden is de uitzondering niet geldig');
const reviewOud = verifyGate(bouwGate({ commit: 'abcdef1234567890', review: { status: 'groen', commit: '1111111111111111' } }), { commit: 'fedcba0987654321', allowReleaseCommit: true, filesSinds: ['CHANGELOG.md'] });
ok(!reviewOud.ok, 'de review moet op de code-commit staan, niet op een andere commit');

// ---------------------------------------------------------------- verslag
const gate = bouwGate({ gestart: '2026-11-13T10:00:00Z', vanaf: 'v0.60.7', duurSecs: 42, out: 'C:/tmp/run', review: { status: 'groen', commit: 'abcdef1234567890' }, stageNamen: true });
const md = schrijfVerslag(gate);
for (const stuk of ['# Releasegate', 'Uitslag', 'Plan', 'Wat nu', 'Bewijs', STAGE_NAAM.static]) ok(md.includes(stuk), `verslag bevat ${stuk}`);
ok(beschrijfPlan(planUi).some((r) => /^static: nodig/.test(r)), 'planbeschrijving noemt static nodig');
ok(beschrijfPlan(null).length === STAGES.length, 'planbeschrijving werkt ook zonder plan');

console.log(fails ? `${fails} FAIL` : 'release_gate_test ok');
process.exit(fails ? 1 : 0);
