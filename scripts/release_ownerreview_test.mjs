// Test van de eigenaar-review (laatste stap vóór release.sh): scripts/release/ownerreview.mjs en de koppeling in release_gate.mjs --verify.
//   node scripts/release_ownerreview_test.mjs
import fs from 'node:fs';
import { checkOwnerReview, OWNER_REVIEW_FILE, MIN_SCREENSHOTS } from './release/ownerreview.mjs';

let fails = 0;
const ok = (c, naam, extra) => { if (!c) { fails++; console.log('FAIL', naam, extra !== undefined ? JSON.stringify(extra) : ''); } };
const bestanden = Array.from({ length: 20 }, (_, i) => `beeld/${String(i + 1).padStart(2, '0')}.png`);
const goed = { datum: '2026-11-21', aantal: 20, status: 'akkoord', bestanden };
const vandaag = '2026-11-21';

ok(OWNER_REVIEW_FILE === 'release/owner-review.json' && MIN_SCREENSHOTS === 20, 'pad en minimum zoals in de documentatie');
ok(checkOwnerReview(goed, { vandaag }).ok, 'een volledig bewijs is groen');
ok(checkOwnerReview({ ...goed, status: 'feedback verwerkt' }, { vandaag }).ok, 'feedback verwerkt is ook groen');
ok(!checkOwnerReview(null, { vandaag }).ok, 'zonder bewijsbestand: niet groen');
ok(/ontbreekt/.test(checkOwnerReview(undefined, { vandaag }).samenvatting), 'de melding zegt dat het bewijs ontbreekt');
ok(!checkOwnerReview({ ...goed, status: 'open' }, { vandaag }).ok, 'een andere status dan akkoord of feedback verwerkt blokkeert');
ok(!checkOwnerReview({ ...goed, aantal: 19, bestanden: bestanden.slice(0, 19) }, { vandaag }).ok, 'minder dan 20 screenshots blokkeert');
ok(!checkOwnerReview({ ...goed, bestanden: bestanden.slice(0, 5) }, { vandaag }).ok, 'minder bestanden dan het genoemde aantal blokkeert');
ok(!checkOwnerReview({ ...goed, bestanden: [] }, { vandaag }).ok, 'zonder lijst bestanden blokkeert');
ok(!checkOwnerReview({ ...goed, datum: '21-11-2026' }, { vandaag }).ok, 'een datum in een ander formaat blokkeert');
ok(!checkOwnerReview({ ...goed, datum: '2027-01-01' }, { vandaag }).ok, 'een datum in de toekomst blokkeert');
const skip = checkOwnerReview(null, { skip: true, vandaag });
ok(skip.ok && skip.skipped && /OVERGESLAGEN/.test(skip.samenvatting), 'de nooduitgang is groen maar luid');

const gate = fs.readFileSync(new URL('./release_gate.mjs', import.meta.url), 'utf8');
ok(/checkOwnerReview\(/.test(gate) && /GDE_RELEASE_SKIP_OWNERREVIEW/.test(gate), 'release_gate.mjs --verify controleert het bewijs en kent de nooduitgang');
const doc = fs.readFileSync(new URL('../docs/RELEASEGATE.md', import.meta.url), 'utf8');
ok(/Eigenaar-review: 20 screenshots/.test(doc) && /owner-review\.json/.test(doc) && /GDE_RELEASE_SKIP_OWNERREVIEW/.test(doc), 'RELEASEGATE.md beschrijft de stap, het bewijsbestand en de nooduitgang');

console.log(fails ? `release_ownerreview_test: ${fails} mislukt` : 'release_ownerreview_test: ok');
process.exit(fails ? 1 : 0);
