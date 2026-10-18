// node scripts/playtest_feedback_test.mjs: feedback naar issue-concepten (verstuurt niets).
import { splits, classificeer, anonimiseer, maakConcepten, titel } from './playtest_feedback.mjs';
let fout = 0;
const ok = (c, m) => { if (!c) { fout++; console.error('FOUT: ' + m); } };

const tekst = '# Feedback\n\n- Het spel crasht als ik de kaart open na M12.\n- Ik snapte niet waar ik heen moest bij de eerste missie.\n* Het zou leuk zijn als er meer variatie in auto\'s is.\n\nDe fiets zweeft boven de weg\nbij de brug.\r\n3. Typo in het menu';
const s = splits(tekst);
ok(s.length === 5, 'vijf opmerkingen, kreeg ' + s.length);
ok(s[3] === 'De fiets zweeft boven de weg bij de brug.', 'regels in een alinea worden samengevoegd: ' + s[3]);
ok(!s.some((x) => /^#? ?Feedback$/.test(x)), 'kopjes vallen weg');

ok(classificeer(s[0]).type === 'bug' && classificeer(s[0]).impact === 'zeer-hoog', 'crash is bug en zeer-hoog');
ok(classificeer(s[1]).impact === 'hoog', 'niet snappen is hoog');
const w = classificeer(s[2]);
ok(w.type === 'wens' && w.kosten === 'M', 'variatie is een wens van kosten M');
ok(classificeer(s[3]).type === 'bug', 'zweven is een bug');
ok(classificeer(s[4]).impact === 'laag', 'typo is laag');
ok(classificeer('Een nieuwe minigame voor alle streken').kosten === 'L', 'nieuwe minigame voor alle streken is L');
ok(classificeer('De fiets rijdt door de muur').type === 'bug', 'door de muur is een bug');

const a = anonimiseer('Mail me op iemand@example.com of 06 12345678, @jan zei het. Naam: Piet');
ok(!/example|12345678|@jan|Piet/.test(a), 'persoonsgegevens weg: ' + a);

const c = maakConcepten('Het spel crasht', { scenario: 'A', tester: 'T2' });
ok(c.length === 1 && c[0].labels.join() === 'bug,impact-zeer-hoog,kosten-S', 'labels: ' + (c[0] && c[0].labels));
ok(/tester T2, scenario A/.test(c[0].body) && /Nog niet onderzocht in beeld/.test(c[0].body), 'bron en "nog niet onderzocht"');
ok(titel('"Een heel lange opmerking die ver boven de tachtig tekens uitkomt en dus afgekapt moet worden zodat het past."').length <= 80, 'titel past');
ok(maakConcepten('  \n\n').length === 0, 'leeg geeft niets');

if (fout) process.exit(1);
console.log('playtest_feedback_test ok');
