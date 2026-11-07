// #645: dynamische telefoonkaarten en ondertitels kunnen pas op het laatste
// moment te lang worden. fitCard/fitSubtitle korten ze in; auditRuntimeTexts
// maakt dat meetbaar naast de statische hud_text_audit.
//   node scripts/hud_text_runtime_test.mjs
import assert from 'node:assert/strict';
import { wordCount, WORD_BUDGET, fitCard, fitSubtitle } from '../game/js/hudtext.js';
import { auditHudText, auditRuntimeTexts, LIMITS } from './hud_text_audit.mjs';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('een dynamische kaart met lange namen wordt op het kaartbudget ingekort', () => {
  const ruw = 'Bezorg de pakketten naar het magazijn van Delfstof Noord aan de Oosterkade, en praat daarna met Tessa over de huur.';
  assert.ok(wordCount(ruw) > WORD_BUDGET.cardBody);
  const af = fitCard(ruw);
  assert.ok(wordCount(af) <= WORD_BUDGET.cardBody, `${wordCount(af)} woorden`);
});

t('een dynamische ondertitel wordt op 18 woorden ingekort', () => {
  const ruw = 'Ik wist niet waar de bal lag, maar ik wist wel dat Jelles moeder iets voor hem verborgen hield en dat we dat vandaag gingen uitzoeken.';
  assert.ok(wordCount(ruw) > WORD_BUDGET.subtitle);
  assert.ok(wordCount(fitSubtitle(ruw)) <= WORD_BUDGET.subtitle);
});

t('de audit telt telefoonkaarten en alle ondertiteltalen', () => {
  const rows = auditHudText();
  assert.ok(rows.some((r) => r.kind === 'phone'), 'telefoonkaarten');
  assert.ok(rows.some((r) => r.kind === 'subtitle' && r.where.includes('gesproken')), 'ondertitels');
  assert.equal(LIMITS.phone, 0);
  assert.ok(LIMITS.subtitle >= 0);
});

t('dynamische runtime-teksten zijn te meten en te korten', () => {
  const ruw = 'Dit is een veel te lange dynamische kaart met een naam van een speler en een bedrag van € 1.250.000 erin.';
  const rows = auditRuntimeTexts({ cards: [ruw], subtitles: ['Dit is ook een veel te lange ondertitel met heel veel woorden erin verstopt.'] });
  assert.equal(rows.length, 2);
  assert.ok(rows[0].words > rows[0].budget);
  assert.ok(wordCount(fitCard(ruw)) <= WORD_BUDGET.cardBody);
});

console.log(`hud_text_runtime_test: ${n}/${n} ok`);
